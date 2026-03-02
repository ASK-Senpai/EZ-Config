import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/server/auth/requireAuth";
import { getFirestore } from "firebase-admin/firestore";

export async function GET(request: NextRequest) {
    try {
        const decodedClaims = await requireAuth();
        const db = getFirestore();
        const userDoc = await db.collection("users").doc(decodedClaims.uid).get();
        const userData = userDoc.exists ? userDoc.data() || {} : {};
        const rawPlan = String(userData?.plan || "").toLowerCase();
        const rawStatus = String(userData?.subscriptionStatus || "").toLowerCase();

        let normalizedStatus: "active" | "inactive" = "inactive";
        if (rawStatus === "active") {
            normalizedStatus = "active";
        } else if (rawPlan === "premium" && userData?.isPremium === true) {
            normalizedStatus = "active";
        }

        const normalizedPlan: "free" | "premium" = rawPlan === "premium" ? "premium" : "free";
        const aiUsage = Number(
            userData?.aiUsage ??
            userData?.monthlyReportUsage ??
            userData?.monthlyCount ??
            0
        );
        const aiLimit = Number(
            userData?.aiLimit ??
            (normalizedPlan === "premium" ? 50 : 5)
        );

        return NextResponse.json(
            {
                status: "success",
                uid: decodedClaims.uid,
                subscription: {
                    plan: normalizedPlan,
                    status: normalizedStatus,
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
