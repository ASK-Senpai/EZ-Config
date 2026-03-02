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
        const planName = (process.env.RAZORPAY_PLAN_NAME || "premium_monthly").toLowerCase();

        const allowedStatuses = new Set(["inactive", "active", "cancelled", "expired", "past_due"]);
        const normalizedStatus =
            allowedStatuses.has(rawStatus) ? rawStatus : "inactive";

        const normalizedPlan = rawPlan === planName ? planName : "free";
        const aiUsage = Number(
            userData?.aiUsage ??
            userData?.monthlyReportUsage ??
            userData?.monthlyCount ??
            0
        );
        const aiLimit = Number(
            userData?.aiLimit ??
            (normalizedPlan === planName ? 50 : 5)
        );

        return NextResponse.json(
            {
                status: "success",
                uid: decodedClaims.uid,
                subscription: {
                    plan: normalizedPlan,
                    subscriptionStatus: normalizedStatus,
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
