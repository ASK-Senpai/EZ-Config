import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/server/auth/requireAuth";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { runEngineV12 } from "@/lib/engine";
import { BuildInput } from "@/lib/engine/compatibility";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
    try {
        // 1. Authenticate user
        const decodedUser = await requireAuth();
        const userId = decodedUser.uid;

        // 2. Parse req body
        const body = await request.json();
        const buildIds = body.build;

        if (!buildIds || !buildIds.cpuId || !buildIds.gpuId) {
            return NextResponse.json(
                { error: "BAD_REQUEST", message: "CPU or GPU missing from build." },
                { status: 400 }
            );
        }

        const db = getFirestore();

        // 3. Plan Limit Enforcement
        const userRef = db.collection("users").doc(userId);
        const userDoc = await userRef.get();
        if (!userDoc.exists) {
            return NextResponse.json({ error: "NOT_FOUND", message: "User not found" }, { status: 404 });
        }
        const userData = userDoc.data()!;
        const plan = userData.plan || "free";

        if (plan === "free") {
            const buildsSnapshot = await db.collection("builds").where("userId", "==", userId).get();
            if (buildsSnapshot.size >= 3) {
                return NextResponse.json(
                    { error: "PLAN_LIMIT_REACHED", message: "You have reached the maximum number of saved builds (3) on the free plan." },
                    { status: 403 }
                );
            }
        }

        // 4. Fetch Components Server-Side (Don't trust client objects, only IDs)
        // Ensure atomic reads if needed, but sequential is fine for this context or Promise.all.
        const typeMap: Record<string, string> = {
            cpuId: "cpu",
            gpuId: "gpu",
            motherboardId: "motherboard",
            ramId: "ram",
            storageId: "storage",
            psuId: "psu"
        };

        const buildObject: BuildInput = {};
        for (const [key, type] of Object.entries(typeMap)) {
            const id = buildIds[key];
            if (id) {
                const docSnap = await db.collection("components").doc(type).collection("items").doc(id).get();
                if (!docSnap.exists) {
                    return NextResponse.json(
                        { error: "BAD_REQUEST", message: `Component of type ${type} with id ${id} does not exist.` },
                        { status: 400 }
                    );
                }
                const data = docSnap.data()!;
                (buildObject as any)[type] = { id: docSnap.id, ...data };
            }
        }

        if (!buildObject.cpu || !buildObject.gpu) {
            return NextResponse.json(
                { error: "BAD_REQUEST", message: "CPU or GPU object could not be built." },
                { status: 400 }
            );
        }

        // 5. Server Engine Run
        // If plan is 'free', Engine v1.2 natively scrubs or simplifies suggestions depending on config.
        const engineResult = runEngineV12(buildObject, plan);

        // 6. Save Build
        const buildsRef = db.collection("builds").doc();
        const payload = {
            userId,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
            components: {
                cpuId: buildIds.cpuId || null,
                gpuId: buildIds.gpuId || null,
                motherboardId: buildIds.motherboardId || null,
                ramId: buildIds.ramId || null,
                storageId: buildIds.storageId || null,
                psuId: buildIds.psuId || null,
            },
            engineResult,
            isPublic: false,
            publicId: null
        };

        const batch = db.batch();
        batch.set(buildsRef, payload);

        // Increment user buildCount
        batch.update(userRef, {
            buildCount: FieldValue.increment(1),
            updatedAt: FieldValue.serverTimestamp()
        });

        // Analytics tracking
        const globalRef = db.collection("analytics").doc("global");
        batch.set(globalRef, { totalBuilds: FieldValue.increment(1) }, { merge: true });

        const userAnalyticsRef = db.collection("analytics").doc(userId);
        batch.set(userAnalyticsRef, { buildsCreated: FieldValue.increment(1) }, { merge: true });

        await batch.commit();

        // 7. Response
        return NextResponse.json(
            {
                status: "success",
                buildId: buildsRef.id,
                engineResult
            },
            { status: 200 }
        );

    } catch (error: any) {
        if (error.message === "UNAUTHORIZED") {
            return NextResponse.json({ error: "UNAUTHORIZED", message: "Missing or invalid session" }, { status: 401 });
        }

        console.error("Failed to save build:", error);
        return NextResponse.json({ error: "INTERNAL_SERVER_ERROR", message: "An unexpected error occurred." }, { status: 500 });
    }
}
