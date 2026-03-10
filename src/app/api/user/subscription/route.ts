import { NextResponse } from "next/server";
import { getFirestore } from "firebase-admin/firestore";
import { requireAuth } from "@/server/auth/requireAuth";

export async function GET() {
    try {
        const decodedToken = await requireAuth();
        const userId = decodedToken.uid;
        const db = getFirestore();
        const userDoc = await db.collection("users").doc(userId).get();

        if (!userDoc.exists) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const data = userDoc.data()!;

        const remaining = (data.aiLimit || 5) - (data.aiUsage || 0);

        return NextResponse.json({
            plan: data.plan || "free",
            subscriptionStatus: data.subscriptionStatus || "active",
            nextBillingDate: data.nextBillingDate || null,
            razorpaySubscriptionId: data.razorpaySubscriptionId || null,
            aiLimit: data.aiLimit || 5,
            aiUsage: data.aiUsage || 0,
            remaining: remaining,
            reportUsageMonth: data.reportUsageMonth || null,
            role: data.role || "user"
        }, { status: 200 });

    } catch (error: any) {
        console.error("Failed to fetch user subscription:", error);
        return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }
}
