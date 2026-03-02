import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/server/auth/requireAuth";
import { getFirestore } from "firebase-admin/firestore";

export async function GET(request: NextRequest) {
    try {
        const decodedClaims = await requireAuth();
        const db = getFirestore();
        const userDoc = await db.collection("users").doc(decodedClaims.uid).get();
        const userData = userDoc.exists ? userDoc.data() || {} : {};
        const plan = userData?.plan || "free";
        const status = userData?.subscriptionStatus || "inactive";
        const aiUsage = Number(
            userData?.aiUsage ??
            userData?.monthlyReportUsage ??
            userData?.monthlyCount ??
            0
        );
        const aiLimit = Number(
            userData?.aiLimit ??
            (plan === "premium" ? 50 : 5)
        );

        return NextResponse.json(
            {
                status: "success",
                uid: decodedClaims.uid,
                subscription: {
                    plan,
                    status,
                    aiUsage,
                    aiLimit,
                },
            },
            { status: 200 }
        );
    } catch (error: any) {
        return NextResponse.json({ error: "UNAUTHORIZED", message: error.message || "Invalid or expired session" }, { status: 401 });
    }
}
