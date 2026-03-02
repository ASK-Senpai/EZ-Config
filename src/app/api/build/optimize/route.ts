// /api/build/optimize/route.ts
// Premium-gated optimization endpoint

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/server/auth/requireAuth";
import { getFirestore } from "firebase-admin/firestore";
import { optimizeBuild } from "@/lib/engine/optimizer";
import { isFeatureEnabled } from "@/lib/featureFlags";
import { BuildInput } from "@/lib/engine/compatibility";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
    try {
        const decodedUser = await requireAuth();
        const userId = decodedUser.uid;

        // Check user plan
        const db = getFirestore();
        const userDoc = await db.collection("users").doc(userId).get();
        if (!userDoc.exists) {
            return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
        }
        const plan = userDoc.data()?.plan || "free";

        if (!isFeatureEnabled("OPTIMIZE_BUILD", plan)) {
            return NextResponse.json(
                { error: "PREMIUM_REQUIRED", message: "Build optimization requires a premium plan." },
                { status: 403 }
            );
        }

        const body = await request.json();
        const buildIds = body.build;
        const budget = body.budget;

        if (!buildIds) {
            return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });
        }

        // Fetch components server-side
        const typeMap: Record<string, string> = {
            cpuId: "cpu", gpuId: "gpu", motherboardId: "motherboard",
            ramId: "ram", storageId: "storage", psuId: "psu",
        };

        const buildObject: BuildInput = {};
        for (const [key, type] of Object.entries(typeMap)) {
            const id = buildIds[key];
            if (id) {
                const docSnap = await db.collection("components").doc(type).collection("items").doc(id).get();
                if (docSnap.exists) {
                    (buildObject as any)[type] = { id: docSnap.id, ...docSnap.data()! };
                }
            }
        }

        const result = optimizeBuild(buildObject, budget);

        return NextResponse.json({ status: "success", optimization: result }, { status: 200 });
    } catch (error: any) {
        if (error.message === "UNAUTHORIZED") {
            return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
        }
        console.error("Optimization error:", error);
        return NextResponse.json({ error: "INTERNAL_SERVER_ERROR" }, { status: 500 });
    }
}
