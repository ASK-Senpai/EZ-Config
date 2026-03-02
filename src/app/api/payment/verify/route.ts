import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/server/auth/requireAuth";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import crypto from "crypto";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
    try {
        const decodedUser = await requireAuth();
        const userId = decodedUser.uid;

        const body = await request.json();
        const { razorpay_payment_id, razorpay_subscription_id, razorpay_signature } = body;

        if (!razorpay_payment_id || !razorpay_subscription_id || !razorpay_signature) {
            return NextResponse.json({ error: "BAD_REQUEST", message: "Missing required payment fields." }, { status: 400 });
        }

        const key_secret = process.env.RAZORPAY_KEY_SECRET;

        if (!key_secret) {
            console.error("Missing Razorpay secret");
            return NextResponse.json({ error: "INTERNAL_SERVER_ERROR", message: "Configuration error." }, { status: 500 });
        }

        // Generate HMAC SHA256
        const text = razorpay_payment_id + "|" + razorpay_subscription_id;
        const generated_signature = crypto
            .createHmac("sha256", key_secret)
            .update(text)
            .digest("hex");

        if (generated_signature !== razorpay_signature) {
            console.error("Signature mismatch", { generated_signature, razorpay_signature });
            return NextResponse.json({ error: "BAD_REQUEST", message: "Invalid payment signature." }, { status: 400 });
        }

        // Signature is valid. Upgrade user in Firestore
        const db = getFirestore();

        const batch = db.batch();
        const userRef = db.collection("users").doc(userId);

        batch.update(userRef, {
            plan: "premium",
            subscriptionId: razorpay_subscription_id,
            subscriptionStatus: "active",
            upgradedAt: FieldValue.serverTimestamp()
        });

        // Analytics: track premium upgrade
        const globalRef = db.collection("analytics").doc("global");
        batch.set(globalRef, { totalPremiumUsers: FieldValue.increment(1) }, { merge: true });

        const userAnalyticsRef = db.collection("analytics_users").doc(userId);
        batch.set(userAnalyticsRef, { subscriptionStatus: "active" }, { merge: true });

        await batch.commit();

        return NextResponse.json({ status: "success", message: "Account upgraded successfully." }, { status: 200 });

    } catch (error: any) {
        if (error.message === "UNAUTHORIZED") {
            return NextResponse.json({ error: "UNAUTHORIZED", message: "Missing or invalid session" }, { status: 401 });
        }

        console.error("Failed to verify payment:", error);
        return NextResponse.json({ error: "INTERNAL_SERVER_ERROR", message: "Failed to verify payment." }, { status: 500 });
    }
}
