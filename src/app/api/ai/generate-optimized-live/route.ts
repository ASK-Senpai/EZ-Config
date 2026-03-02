import { NextRequest, NextResponse } from "next/server";
import { getFirestore } from "firebase-admin/firestore";
import { requireAuth } from "@/server/auth/requireAuth";
import { optimizeBuild, type Dataset } from "@/lib/engine/optimizeBuild";
import type { BuildInput } from "@/lib/engine/compatibility";
import { getMinPrice } from "@/lib/utils/pricingV2";

export const runtime = "nodejs";

function extractId(component: any): string | null {
    if (!component) return null;
    if (typeof component === "string") return component;
    if (typeof component === "object" && typeof component.id === "string") return component.id;
    return null;
}

async function hydrateFromIds(
    db: FirebaseFirestore.Firestore,
    ids: Record<"cpu" | "gpu" | "motherboard" | "ram" | "storage" | "psu", string>
): Promise<BuildInput> {
    const build: BuildInput = {};
    const categories = Object.keys(ids) as Array<keyof typeof ids>;

    for (const category of categories) {
        const doc = await db
            .collection("components")
            .doc(category)
            .collection("items")
            .doc(ids[category])
            .get();

        if (!doc.exists) {
            throw new Error(`MISSING_${category.toUpperCase()}`);
        }
        (build as any)[category] = { id: doc.id, ...doc.data() };
    }

    build.activeGpu = build.gpu;
    return build;
}

async function loadDataset(db: FirebaseFirestore.Firestore): Promise<Dataset> {
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
            const docs = snapshot.docs
                .map((doc) => ({ id: doc.id, ...doc.data() }))
                .filter((item: any) => Number(getMinPrice(item)) > 0);
            return [category, docs] as const;
        })
    );

    const mapped = Object.fromEntries(entries);
    return {
        cpus: mapped.cpu || [],
        gpus: mapped.gpu || [],
        motherboards: mapped.motherboard || [],
        rams: mapped.ram || [],
        storages: mapped.storage || [],
        psus: mapped.psu || [],
    };
}

function getTotalPrice(build: BuildInput): number {
    const storage = Array.isArray(build.storage) ? build.storage[0] : build.storage;
    return (
        getMinPrice(build.cpu) +
        getMinPrice(build.gpu) +
        getMinPrice(build.motherboard) +
        getMinPrice(build.ram) +
        getMinPrice(storage) +
        getMinPrice(build.psu)
    );
}

export async function POST(request: NextRequest) {
    try {
        const decodedUser = await requireAuth();
        const userId = decodedUser.uid;
        const db = getFirestore();

        const userDoc = await db.collection("users").doc(userId).get();
        const user = userDoc.exists ? userDoc.data() : null;
        if (!user || user.plan !== "premium") {
            return NextResponse.json(
                { error: "Premium required" },
                { status: 403 }
            );
        }

        const body = await request.json().catch(() => ({}));
        const incoming = body?.build;
        if (!incoming) {
            return NextResponse.json({ error: "BAD_REQUEST", message: "Build payload is required." }, { status: 400 });
        }

        const storageNode = Array.isArray(incoming.storage) ? incoming.storage[0] : incoming.storage;
        const ids = {
            cpu: extractId(incoming.cpu),
            gpu: extractId(incoming.gpu),
            motherboard: extractId(incoming.motherboard),
            ram: extractId(incoming.ram),
            storage: extractId(storageNode),
            psu: extractId(incoming.psu),
        } as const;

        if (!ids.cpu || !ids.gpu || !ids.motherboard || !ids.ram || !ids.storage || !ids.psu) {
            return NextResponse.json({ error: "BAD_REQUEST", message: "Builder is missing required components." }, { status: 400 });
        }

        const buildInput = await hydrateFromIds(db, {
            cpu: ids.cpu,
            gpu: ids.gpu,
            motherboard: ids.motherboard,
            ram: ids.ram,
            storage: ids.storage,
            psu: ids.psu,
        });

        const totalPrice = getTotalPrice(buildInput);
        if (totalPrice <= 0) {
            return NextResponse.json({ error: "BAD_REQUEST", message: "Invalid build price." }, { status: 400 });
        }

        const minBudget = totalPrice * 0.9;
        const maxBudget = totalPrice * 1.1;
        const dataset = await loadDataset(db);

        const result = await optimizeBuild(buildInput, dataset, { minBudget, maxBudget });

        return NextResponse.json(
            {
                success: true,
                optimizedBuild: result.optimizedBuild,
                originalScores: result.originalScores,
                newScores: result.newScores,
                scoreDelta: result.scoreDelta,
                priceDelta: result.priceDelta,
            },
            { status: 200 }
        );
    } catch (error: any) {
        if (error.message === "UNAUTHORIZED") {
            return NextResponse.json({ error: "UNAUTHORIZED", message: "Missing or invalid session" }, { status: 401 });
        }
        console.error("Live optimized build failed:", error);
        return NextResponse.json({ error: "INTERNAL_SERVER_ERROR", message: "Optimization failed." }, { status: 500 });
    }
}
