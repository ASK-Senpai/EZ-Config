import { NextRequest, NextResponse } from "next/server";
import admin, { adminDb } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";

function getBearerToken(request: NextRequest): string | null {
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return null;
    }
    return authHeader.slice("Bearer ".length).trim();
}

export async function GET(request: NextRequest) {
    try {
        const token = getBearerToken(request);
        if (!token) {
            return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
        }

        const decoded = await admin.auth().verifyIdToken(token);
        const uid = decoded.uid;

        const userDoc = await adminDb.collection("users").doc(uid).get();
        const userData = userDoc.exists ? (userDoc.data() as Record<string, any>) : {};

        const plan = String(userData?.plan || "free");
        const subscriptionStatus = String(userData?.subscriptionStatus || "inactive");
        const planName = process.env.RAZORPAY_PLAN_NAME || "premium_monthly";
        const isPremiumActive = plan === planName && subscriptionStatus === "active";

        return NextResponse.json(
            {
                plan,
                subscriptionStatus,
                isPremiumActive,
            },
            { status: 200 }
        );
    } catch (error) {
        console.error("Subscription status fetch failed:", error);
        return NextResponse.json({ error: "INTERNAL_SERVER_ERROR" }, { status: 500 });
    }
}
