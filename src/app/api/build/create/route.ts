import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/server/auth/requireAuth";
import { buildService } from "@/lib/services/buildService";
import { getFirestore } from "firebase-admin/firestore";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
    try {
        const decodedUser = await requireAuth();
        const userId = decodedUser.uid;

        const body = await request.json();
        const buildData = body.build;

        if (!buildData || !buildData.cpuId || !buildData.gpuId) {
            return NextResponse.json(
                { error: "BAD_REQUEST", message: "CPU or GPU missing from build." },
                { status: 400 }
            );
        }

        const db = getFirestore();
        const userDoc = await db.collection("users").doc(userId).get();
        if (!userDoc.exists) {
            return NextResponse.json({ error: "NOT_FOUND", message: "User not found" }, { status: 404 });
        }
        const plan = userDoc.data()?.plan || "free";

        const result = await buildService.createBuild(userId, buildData, plan);

        return NextResponse.json(
            {
                status: "success",
                ...result
            },
            { status: 200 }
        );

    } catch (error: any) {
        if (error.message === "UNAUTHORIZED") {
            return NextResponse.json({ error: "UNAUTHORIZED", message: "Missing or invalid session" }, { status: 401 });
        }

        if (error.message === "PLAN_LIMIT_REACHED") {
            return NextResponse.json(
                { error: "PLAN_LIMIT_REACHED", message: "You have reached the maximum number of saved builds on your plan." },
                { status: 403 }
            );
        }

        if (error.message.startsWith("COMPONENT_NOT_FOUND")) {
            return NextResponse.json(
                { error: "BAD_REQUEST", message: error.message },
                { status: 400 }
            );
        }

        console.error("Failed to save build:", error);
        return NextResponse.json({ error: "INTERNAL_SERVER_ERROR", message: error.message || "An unexpected error occurred." }, { status: 500 });
    }
}
