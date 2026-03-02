import { NextRequest, NextResponse } from "next/server";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { createHash } from "crypto";
import { requireAuth } from "@/server/auth/requireAuth";
import { analyzeBuild } from "@/lib/engine/analyzeBuild";
import type { BuildInput } from "@/lib/engine/compatibility";
import { generateTechnicalReport } from "@/server/ai/generateTechnicalReport";

export const runtime = "nodejs";

const FREE_MONTHLY_REPORT_LIMIT = 5;

function currentMonthKey(date = new Date()) {
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

async function hydrateBuildFromSavedIds(db: FirebaseFirestore.Firestore, componentIds: any): Promise<BuildInput> {
    const typeMap: Record<string, keyof BuildInput> = {
        cpuId: "cpu",
        gpuId: "gpu",
        motherboardId: "motherboard",
        ramId: "ram",
        storageId: "storage",
        psuId: "psu",
    };

    const buildInput: BuildInput = {};
    for (const [idKey, componentType] of Object.entries(typeMap)) {
        const componentId = componentIds?.[idKey];
        if (!componentId) continue;

        const componentDoc = await db
            .collection("components")
            .doc(componentType)
            .collection("items")
            .doc(componentId)
            .get();

        if (componentDoc.exists) {
            (buildInput as any)[componentType] = { id: componentDoc.id, ...componentDoc.data()! };
        }
    }

    if (buildInput.gpu && !buildInput.activeGpu) {
        buildInput.activeGpu = buildInput.gpu;
    }

    return buildInput;
}

function computeEngineSnapshotHash(buildInput: BuildInput, analysis: any): string {
    const hashPayload = JSON.stringify({
        cpuId: buildInput.cpu?.id || null,
        gpuId: (buildInput.activeGpu ?? buildInput.gpu)?.id || null,
        ramId: buildInput.ram?.id || null,
        storageId: Array.isArray(buildInput.storage) ? buildInput.storage[0]?.id || null : (buildInput.storage as any)?.id || null,
        psuId: buildInput.psu?.id || null,
        engineScores: analysis.scores || {},
    });
    return createHash("sha256").update(hashPayload).digest("hex");
}

async function getOwnedBuildOrNull(db: FirebaseFirestore.Firestore, buildId: string, userId: string) {
    const buildDoc = await db.collection("builds").doc(buildId).get();
    if (!buildDoc.exists) return null;
    const data = buildDoc.data()!;
    if (data.userId !== userId) return null;
    return { ref: buildDoc.ref, data };
}

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const decodedUser = await requireAuth();
        const userId = decodedUser.uid;
        const { id: buildId } = await params;

        if (!buildId) {
            return NextResponse.json({ error: "BAD_REQUEST", message: "Build ID is required." }, { status: 400 });
        }

        const db = getFirestore();
        const ownedBuild = await getOwnedBuildOrNull(db, buildId, userId);
        if (!ownedBuild) {
            return NextResponse.json({ error: "NOT_FOUND", message: "Build not found." }, { status: 404 });
        }

        const buildInput = await hydrateBuildFromSavedIds(db, ownedBuild.data.components || {});
        if (!buildInput.cpu || !buildInput.gpu || !buildInput.ram || !buildInput.storage || !buildInput.psu) {
            return NextResponse.json({ exists: false }, { status: 200 });
        }

        const analysis = analyzeBuild(buildInput, "free");
        const engineSnapshotHash = computeEngineSnapshotHash(buildInput, analysis);
        const reportRef = db.collection("build_reports").doc(buildId);
        const reportDoc = await reportRef.get();

        const exists = reportDoc.exists && reportDoc.data()?.engineSnapshotHash === engineSnapshotHash;
        return NextResponse.json({ exists, reportId: buildId }, { status: 200 });
    } catch (error: any) {
        if (error.message === "UNAUTHORIZED") {
            return NextResponse.json({ error: "UNAUTHORIZED", message: "Missing or invalid session" }, { status: 401 });
        }
        console.error("Failed to fetch report status:", error);
        return NextResponse.json({ error: "INTERNAL_SERVER_ERROR", message: "Failed to fetch report status." }, { status: 500 });
    }
}

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const decodedUser = await requireAuth();
        const userId = decodedUser.uid;
        const { id: buildId } = await params;

        if (!buildId) {
            return NextResponse.json({ error: "BAD_REQUEST", message: "Build ID is required." }, { status: 400 });
        }

        const db = getFirestore();
        const userRef = db.collection("users").doc(userId);
        const userDoc = await userRef.get();
        if (!userDoc.exists) {
            return NextResponse.json({ error: "NOT_FOUND", message: "User not found." }, { status: 404 });
        }

        const userData = userDoc.data()!;
        const rawPlan = String(userData?.plan || "").toLowerCase();
        const rawStatus = String(userData?.subscriptionStatus || "").toLowerCase();
        const planName = (process.env.RAZORPAY_PLAN_NAME || "premium_monthly").toLowerCase();
        const isPremiumActive =
            rawPlan === planName && rawStatus === "active";
        const plan = isPremiumActive ? "premium" : "free";
        const monthKey = currentMonthKey();

        const ownedBuild = await getOwnedBuildOrNull(db, buildId, userId);
        if (!ownedBuild) {
            return NextResponse.json({ error: "NOT_FOUND", message: "Build not found." }, { status: 404 });
        }

        const buildInput = await hydrateBuildFromSavedIds(db, ownedBuild.data.components || {});
        if (!buildInput.cpu || !buildInput.gpu || !buildInput.motherboard || !buildInput.ram || !buildInput.storage || !buildInput.psu) {
            return NextResponse.json({ error: "BAD_REQUEST", message: "Saved build is incomplete." }, { status: 400 });
        }

        const analysis = analyzeBuild(buildInput, plan);
        const engineSnapshotHash = computeEngineSnapshotHash(buildInput, analysis);

        const reportId = buildId;
        const reportRef = db.collection("build_reports").doc(reportId);
        const existingReport = await reportRef.get();

        if (existingReport.exists && existingReport.data()?.engineSnapshotHash === engineSnapshotHash) {
            return NextResponse.json({ reportId, cached: true, engineSnapshotHash, reportJson: existingReport.data()?.reportJson || null }, { status: 200 });
        }

        if (plan === "free") {
            const usageMonth = userData.reportUsageMonth || "";
            const usageCount = usageMonth === monthKey ? Number(userData.monthlyReportUsage || 0) : 0;
            if (usageCount >= FREE_MONTHLY_REPORT_LIMIT) {
                return NextResponse.json(
                    { error: "REPORT_LIMIT_REACHED", message: "Free plan allows 5 reports per month." },
                    { status: 403 }
                );
            }
        } else {
            let aiUsageRemaining = Number(userData.aiUsageRemaining);
            if (!Number.isFinite(aiUsageRemaining)) {
                const usageDoc = await db.collection("aiUsage").doc(userId).get();
                if (usageDoc.exists) {
                    const usage = usageDoc.data()!;
                    const lastReset = usage.lastReset?.toDate?.();
                    const sameMonth = lastReset
                        ? `${lastReset.getUTCFullYear()}-${String(lastReset.getUTCMonth() + 1).padStart(2, "0")}` === monthKey
                        : false;
                    const used = sameMonth ? Number(usage.monthlyCount || 0) : 0;
                    aiUsageRemaining = Math.max(0, 50 - used);
                } else {
                    aiUsageRemaining = 50;
                }
            }
            if (aiUsageRemaining < 1) {
                return NextResponse.json(
                    { error: "AI_USAGE_EXHAUSTED", message: "No AI usage remaining for this month." },
                    { status: 403 }
                );
            }
        }

        const gpu = buildInput.activeGpu ?? buildInput.gpu;
        const structuredBuildPayloadString = JSON.stringify({
            cpu: {
                name: buildInput.cpu?.name || "",
                cores: buildInput.cpu?.cores ?? 0,
                threads: buildInput.cpu?.threads ?? 0,
                generation: buildInput.cpu?.generation || "",
                architecture: buildInput.cpu?.architecture || "",
                gamingScore: buildInput.cpu?.normalized?.gamingScore ?? 0,
                productivityScore: buildInput.cpu?.normalized?.productivityScore ?? 0,
            },
            gpu: {
                name: gpu?.name || "",
                tier: gpu?.tier || "",
                vramGB: gpu?.vramGB ?? 0,
                architecture: gpu?.architecture || "",
                gamingScore: gpu?.normalized?.gamingScore ?? 0,
                rayTracing: Boolean(gpu?.rayTracing),
            },
            ram: {
                capacityGB: buildInput.ram?.capacityGB ?? 0,
                type: buildInput.ram?.type || "",
                speed: buildInput.ram?.speedMHz ?? 0,
            },
            storage: {
                type: (Array.isArray(buildInput.storage) ? buildInput.storage[0] : buildInput.storage)?.type || "",
                capacityGB: (Array.isArray(buildInput.storage) ? buildInput.storage[0] : buildInput.storage)?.capacityGB ?? 0,
            },
            psu: {
                wattage: buildInput.psu?.wattage ?? 0,
                headroomPercent: analysis.power?.headroomPercent ?? 0,
            },
            engineScores: {
                overall: analysis.scores?.overall ?? 0,
                gaming: analysis.scores?.gaming ?? 0,
                workstation: analysis.scores?.workstation ?? 0,
                bottleneckPercent: analysis.bottleneck?.percentage ?? 0,
            },
            requiredOutputSchema: {
                executiveSummary: "string",
                gamingAnalysis: { "1080p": "string", "1440p": "string", "4k": "string" },
                productivityBreakdown: {
                    premiere: "string",
                    afterEffects: "string",
                    blender: "string",
                    davinci: "string",
                    unrealEngine: "string",
                    softwareDevelopment: "string",
                    virtualization: "string",
                },
                componentDeepDive: {
                    cpu: "string",
                    gpu: "string",
                    motherboard: "string",
                    ram: "string",
                    storage: "string",
                    psu: "string",
                },
                futureProofing: { year1: "string", year3: "string", year5: "string" },
                bottleneckAnalysis: "string",
                powerAndThermals: "string",
                marketValueAssessment: "string",
                finalRecommendation: "string",
            },
            rules: [
                "Return strict JSON only.",
                "Do not use markdown.",
                "Do not use ** symbols.",
                "Do not use filler phrases.",
                "Do not include text outside JSON.",
            ],
        });

        const reportJson = await generateTechnicalReport(structuredBuildPayloadString);

        const batch = db.batch();
        batch.set(reportRef, {
            userId,
            buildId,
            engineSnapshotHash,
            reportJson,
            createdAt: existingReport.exists ? existingReport.data()?.createdAt || FieldValue.serverTimestamp() : FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
            engineSnapshot: analysis,
        }, { merge: true });

        batch.set(ownedBuild.ref, {
            technicalReportHash: engineSnapshotHash,
            technicalReportUpdatedAt: FieldValue.serverTimestamp(),
        }, { merge: true });

        if (plan === "free") {
            const usageMonth = userData.reportUsageMonth || "";
            const usageCount = usageMonth === monthKey ? Number(userData.monthlyReportUsage || 0) : 0;
            batch.set(userRef, {
                monthlyReportUsage: usageCount + 1,
                reportUsageMonth: monthKey,
                updatedAt: FieldValue.serverTimestamp(),
            }, { merge: true });
        } else {
            batch.set(userRef, {
                aiUsageRemaining: FieldValue.increment(-1),
                updatedAt: FieldValue.serverTimestamp(),
            }, { merge: true });
        }

        await batch.commit();

        return NextResponse.json({ reportId, cached: false, engineSnapshotHash, reportJson }, { status: 200 });
    } catch (error: any) {
        if (error.message === "UNAUTHORIZED") {
            return NextResponse.json({ error: "UNAUTHORIZED", message: "Missing or invalid session" }, { status: 401 });
        }
        console.error("Failed to generate build report:", error);
        return NextResponse.json({ error: "INTERNAL_SERVER_ERROR", message: "Failed to generate report." }, { status: 500 });
    }
}
