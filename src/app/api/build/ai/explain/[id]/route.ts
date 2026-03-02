import { NextRequest, NextResponse } from "next/server";
import { getFirestore } from "firebase-admin/firestore";
import { requireAuth } from "@/server/auth/requireAuth";
import { analyzeBuild } from "@/lib/engine/analyzeBuild";
import { explainBuild } from "@/lib/ai/hardware-intelligence";
import type { BuildInput } from "@/lib/engine/compatibility";
import { isFeatureEnabled } from "@/lib/featureFlags";

export const runtime = "nodejs";

type ComponentMapEntry = {
    idKey: string;
    componentType: keyof BuildInput;
};

const COMPONENT_MAP: ComponentMapEntry[] = [
    { idKey: "cpuId", componentType: "cpu" },
    { idKey: "gpuId", componentType: "gpu" },
    { idKey: "motherboardId", componentType: "motherboard" },
    { idKey: "ramId", componentType: "ram" },
    { idKey: "storageId", componentType: "storage" },
    { idKey: "psuId", componentType: "psu" },
];

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const decodedUser = await requireAuth();
        const userId = decodedUser.uid;

        const { id: buildId } = await params;
        if (!buildId) {
            return NextResponse.json({ success: false, message: "Build ID is required" }, { status: 400 });
        }

        const db = getFirestore();
        const buildRef = db.collection("builds").doc(buildId);
        const buildDoc = await buildRef.get();

        if (!buildDoc.exists) {
            return NextResponse.json({ success: false, message: "Build not found" }, { status: 404 });
        }

        const buildData = buildDoc.data()!;
        if (buildData.userId !== userId) {
            return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
        }

        const userDoc = await db.collection("users").doc(userId).get();
        const userData = userDoc.exists ? userDoc.data() || {} : {};
        const rawPlan = String(userData?.plan || "").toLowerCase();
        const rawStatus = String(userData?.subscriptionStatus || "").toLowerCase();
        const isPremiumActive =
            (rawPlan === "premium" && rawStatus === "active") ||
            (rawPlan === "premium" && userData?.isPremium === true);
        const effectivePlan = isPremiumActive ? "premium" : "free";

        if (!isFeatureEnabled("AI_FULL_OVERVIEW", effectivePlan)) {
            return NextResponse.json({ success: false, message: "Upgrade required" }, { status: 403 });
        }

        // 1/2/3/4: hydrate BuildInput from stored component IDs before calling analyzeBuild
        const componentIds = buildData.components || {};
        const buildInput: BuildInput = {};

        for (const { idKey, componentType } of COMPONENT_MAP) {
            const componentId = componentIds[idKey];
            if (!componentId) {
                return NextResponse.json({ success: false, message: "Missing component data" }, { status: 400 });
            }

            const componentDoc = await db
                .collection("components")
                .doc(componentType)
                .collection("items")
                .doc(componentId)
                .get();

            if (!componentDoc.exists) {
                return NextResponse.json({ success: false, message: "Missing component data" }, { status: 400 });
            }

            (buildInput as any)[componentType] = { id: componentDoc.id, ...componentDoc.data()! };
        }

        const analysis = analyzeBuild(buildInput, effectivePlan);
        const explanationObject = await explainBuild({
            cpuName: buildInput.cpu?.name || "Unknown CPU",
            gpuName: (buildInput.activeGpu ?? buildInput.gpu)?.name || "Unknown GPU",
            performanceScore: analysis.scores.gaming,
            tier: String(analysis.scores.tier),
            bottleneck: analysis.bottleneck,
            compatibility: analysis.compatibility,
            recommendedPSU: analysis.power.recommendedPSU,
            suggestions: analysis.optimizationHints?.suggestions?.map((s: any) => s.action) || [],
        });

        const explanation = JSON.stringify(explanationObject);
        await buildRef.set(
            {
                ai: {
                    explanation,
                    createdAt: new Date(),
                },
            },
            { merge: true }
        );

        return NextResponse.json({ success: true, explanation }, { status: 200 });
    } catch (error: any) {
        if (error.message === "UNAUTHORIZED") {
            return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
        }

        console.error("Explain API failed:", error);
        return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
    }
}
