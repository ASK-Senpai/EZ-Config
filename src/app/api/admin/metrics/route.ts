import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/server/auth/requireAuth";
import { getFirestore } from "firebase-admin/firestore";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
    try {
        const decodedUser = await requireAuth();
        const userId = decodedUser.uid;

        const db = getFirestore();

        // Check if user is admin
        const userDoc = await db.collection("users").doc(userId).get();
        if (!userDoc.exists) {
            return NextResponse.json({ error: "NOT_FOUND", message: "User not found." }, { status: 404 });
        }

        const userData = userDoc.data()!;
        if (userData.role !== "admin") {
            return NextResponse.json({ error: "FORBIDDEN", message: "Admin access strictly required." }, { status: 403 });
        }

        const globalRef = db.collection("analytics").doc("global");
        const globalDoc = await globalRef.get();

        const metrics = globalDoc.exists ? globalDoc.data() : {
            totalUsers: 0,
            totalPremiumUsers: 0,
            totalAiCalls: 0,
            totalBuilds: 0,
            totalCancellations: 0
        };

        return NextResponse.json({ status: "success", metrics }, { status: 200 });

    } catch (error: any) {
        if (error.message === "UNAUTHORIZED") {
            return NextResponse.json({ error: "UNAUTHORIZED", message: "Missing or invalid session" }, { status: 401 });
        }

        console.error("Failed to fetch admin metrics:", error);
        return NextResponse.json({ error: "INTERNAL_SERVER_ERROR", message: "An unexpected error occurred." }, { status: 500 });
    }
}
