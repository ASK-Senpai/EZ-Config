import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/server/auth/requireAuth";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { explainBuild } from "@/lib/ai/hardware-intelligence";
import { getCachedAI, setCachedAI } from "@/lib/ai/memo";
import { analyzeBuild } from "@/lib/engine/analyzeBuild";
import type { BuildInput } from "@/lib/engine/compatibility";

export const runtime = "nodejs";

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const decodedUser = await requireAuth();
        const userId = decodedUser.uid;

        const resolvedParams = await params;
        const buildId = resolvedParams.id;

        if (!buildId) {
            return NextResponse.json({ error: "BAD_REQUEST", message: "Build ID is required." }, { status: 400 });
        }

        const db = getFirestore();
        const buildRef = db.collection("builds").doc(buildId);
        const buildDoc = await buildRef.get();
        if (!buildDoc.exists) {
            return NextResponse.json({ error: "NOT_FOUND", message: "Build not found." }, { status: 404 });
        }
        const buildData = buildDoc.data()!;
        if (buildData.userId !== userId) {
            return NextResponse.json({ error: "FORBIDDEN", message: "You do not have permission to access this build." }, { status: 403 });
        }

        // Reconstruct full BuildInput by loading component docs from saved IDs
        const componentIds = buildData.components || {};
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
            const componentId = componentIds[idKey];
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

        const analysis = analyzeBuild(buildInput);

        // Memoize by fresh analysis
        const cacheKey = `explain:${buildId}:${analysis.scores.gaming}:${analysis.scores.tier}`;
        const cached = getCachedAI(cacheKey);

        let explanation: string;
        if (cached) {
            console.log("[CACHE HIT]", cacheKey);
            explanation = typeof cached === "string" ? cached : JSON.stringify(cached);
        } else {
            console.log("[CACHE MISS]", cacheKey);
            // Call structured intelligence wrapper
            const result = await explainBuild({
                cpuName: buildInput.cpu?.name || "Unknown CPU",
                gpuName: (buildInput.activeGpu ?? buildInput.gpu)?.name || "Unknown GPU",
                performanceScore: analysis.scores.gaming,
                tier: String(analysis.scores.tier),
                bottleneck: analysis.bottleneck,
                compatibility: analysis.compatibility,
                recommendedPSU: analysis.power.recommendedPSU,
                suggestions: analysis.optimizationHints?.suggestions?.map((s: any) => s.action) || [],
            });
            explanation = JSON.stringify(result);
            if (result.summary) setCachedAI(cacheKey, explanation);
        }

        // Store result in Firestore
        const batch = db.batch();

        batch.update(buildRef, {
            "ai.explanation": explanation,
            "ai.createdAt": FieldValue.serverTimestamp(),
            "engineResult.power.recommendedPSU": analysis.power.recommendedPSU,
            updatedAt: FieldValue.serverTimestamp(),
        });

        // Analytics tracking
        const globalRef = db.collection("analytics").doc("global");
        batch.set(globalRef, { totalAiCalls: FieldValue.increment(1) }, { merge: true });

        const userAnalyticsRef = db.collection("analytics_users").doc(userId);
        batch.set(userAnalyticsRef, { aiCalls: FieldValue.increment(1) }, { merge: true });

        await batch.commit();

        // Response
        return NextResponse.json({ status: "success", explanation, analysis }, { status: 200 });

    } catch (error: any) {
        if (error.message === "UNAUTHORIZED") {
            return NextResponse.json({ error: "UNAUTHORIZED", message: "Missing or invalid session" }, { status: 401 });
        }

        console.error("Failed to generate AI explanation:", error);
        return NextResponse.json({ error: "INTERNAL_SERVER_ERROR", message: "Failed to generate AI explanation." }, { status: 500 });
    }
}
