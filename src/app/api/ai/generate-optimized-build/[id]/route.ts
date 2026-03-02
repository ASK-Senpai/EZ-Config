import { NextRequest, NextResponse } from "next/server";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { requireAuth } from "@/server/auth/requireAuth";
import { isFeatureEnabled } from "@/lib/featureFlags";
import { optimizeBuild, type Dataset } from "@/lib/engine/optimizeBuild";
import type { BuildInput } from "@/lib/engine/compatibility";
import { getMinPrice } from "@/lib/utils/pricingV2";

export const runtime = "nodejs";

const COMPONENT_KEYS: Array<{ idKey: string; type: keyof BuildInput }> = [
    { idKey: "cpuId", type: "cpu" },
    { idKey: "gpuId", type: "gpu" },
    { idKey: "motherboardId", type: "motherboard" },
    { idKey: "ramId", type: "ram" },
    { idKey: "storageId", type: "storage" },
    { idKey: "psuId", type: "psu" },
];

async function hydrateBuildFromSavedIds(db: FirebaseFirestore.Firestore, componentIds: any): Promise<BuildInput> {
    const buildInput: BuildInput = {};

    for (const key of COMPONENT_KEYS) {
        const componentId = componentIds?.[key.idKey];
        if (!componentId) continue;

        const doc = await db
            .collection("components")
            .doc(key.type)
            .collection("items")
            .doc(componentId)
            .get();

        if (doc.exists) {
            (buildInput as any)[key.type] = { id: doc.id, ...doc.data() };
        }
    }

    if (buildInput.gpu && !buildInput.activeGpu) {
        buildInput.activeGpu = buildInput.gpu;
    }

    return buildInput;
}

async function getCatalog(db: FirebaseFirestore.Firestore) {
    const categories: Array<"cpu" | "gpu" | "motherboard" | "ram" | "storage" | "psu"> = [
        "cpu",
        "gpu",
        "motherboard",
        "ram",
        "storage",
        "psu",
    ];

    const entries = await Promise.all(
        categories.map(async (category) => {
            const snapshot = await db.collection("components").doc(category).collection("items").get();
            const items = snapshot.docs
                .map((doc) => ({ id: doc.id, ...doc.data() }))
                .filter((item: any) => Number(getMinPrice(item)) > 0);
            return [category, items] as const;
        })
    );

    const mapped = Object.fromEntries(entries);
    const dataset: Dataset = {
        cpus: mapped.cpu || [],
        gpus: mapped.gpu || [],
        motherboards: mapped.motherboard || [],
        rams: mapped.ram || [],
        storages: mapped.storage || [],
        psus: mapped.psu || [],
    };
    return dataset;
}

function totalPrice(buildInput: BuildInput) {
    const storage = Array.isArray(buildInput.storage) ? buildInput.storage[0] : buildInput.storage;
    return (
        getMinPrice(buildInput.cpu) +
        getMinPrice(buildInput.gpu) +
        getMinPrice(buildInput.motherboard) +
        getMinPrice(buildInput.ram) +
        getMinPrice(storage) +
        getMinPrice(buildInput.psu)
    );
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

        const userDoc = await db.collection("users").doc(userId).get();
        const userData = userDoc.exists ? userDoc.data() || {} : {};
        const userPlan = userData?.plan || "free";
        const isPremiumActive = userPlan === "premium" && userData?.subscriptionStatus === "active";
        if (!isFeatureEnabled("OPTIMIZE_BUILD", isPremiumActive ? "premium" : "free")) {
            return NextResponse.json({ error: "PREMIUM_REQUIRED", message: "Upgrade required" }, { status: 403 });
        }

        const buildRef = db.collection("builds").doc(buildId);
        const buildDoc = await buildRef.get();
        if (!buildDoc.exists) {
            return NextResponse.json({ error: "NOT_FOUND", message: "Build not found." }, { status: 404 });
        }

        const saved = buildDoc.data()!;
        if (saved.userId !== userId) {
            return NextResponse.json({ error: "FORBIDDEN", message: "You do not have permission to access this build." }, { status: 403 });
        }

        const buildInput = await hydrateBuildFromSavedIds(db, saved.components);
        if (!buildInput.cpu || !buildInput.gpu || !buildInput.motherboard || !buildInput.ram || !buildInput.storage || !buildInput.psu) {
            return NextResponse.json({ error: "BAD_REQUEST", message: "Saved build is incomplete." }, { status: 400 });
        }

        const currentTotal = totalPrice(buildInput);
        const minBudget = currentTotal * 0.9;
        const maxBudget = currentTotal * 1.1;

        const catalog = await getCatalog(db);
        const result = await optimizeBuild(buildInput, {
            cpus: catalog.cpus,
            gpus: catalog.gpus,
            motherboards: catalog.motherboards,
            rams: catalog.rams,
            storages: catalog.storages,
            psus: catalog.psus,
        }, {
            minBudget,
            maxBudget,
        });

        const batch = db.batch();
        batch.update(buildRef, {
            optimizedBuild: result.optimizedBuild,
            optimizationSummary: {
                originalScores: result.originalScores,
                newScores: result.newScores,
                scoreDelta: result.scoreDelta,
                priceDelta: result.priceDelta,
                minBudget,
                maxBudget,
                updatedAt: FieldValue.serverTimestamp(),
            },
            updatedAt: FieldValue.serverTimestamp(),
        });

        const globalRef = db.collection("analytics").doc("global");
        batch.set(globalRef, { totalAiCalls: FieldValue.increment(1) }, { merge: true });

        const userAnalyticsRef = db.collection("analytics_users").doc(userId);
        batch.set(userAnalyticsRef, { aiCalls: FieldValue.increment(1) }, { merge: true });

        await batch.commit();

        return NextResponse.json(
            {
                success: true,
                optimizedBuild: result.optimizedBuild,
                originalScores: result.originalScores,
                newScores: result.newScores,
                scoreDelta: result.scoreDelta,
                priceDelta: result.priceDelta,
                budget: {
                    minBudget,
                    maxBudget,
                    originalTotal: currentTotal,
                },
            },
            { status: 200 }
        );
    } catch (error: any) {
        if (error.message === "UNAUTHORIZED") {
            return NextResponse.json({ error: "UNAUTHORIZED", message: "Missing or invalid session" }, { status: 401 });
        }

        console.error("Failed to generate optimized build:", error);
        return NextResponse.json(
            { error: "INTERNAL_SERVER_ERROR", message: "Failed to generate optimized build." },
            { status: 500 }
        );
    }
}
