import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import admin, { adminDb } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";

export const runtime = "nodejs";

function getBearerToken(request: NextRequest): string | null {
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return null;
    }
    return authHeader.slice("Bearer ".length).trim();
}

export async function POST(request: NextRequest) {
    try {
        const token = getBearerToken(request);
        if (!token) {
            return NextResponse.json({ error: "UNAUTHORIZED", message: "Missing bearer token." }, { status: 401 });
        }

        const decoded = await admin.auth().verifyIdToken(token);
        const uid = decoded.uid;

        const body = await request.json().catch(() => ({}));
        const razorpaySubscriptionId = String(body?.razorpay_subscription_id || "");
        const razorpayPaymentId = String(body?.razorpay_payment_id || "");
        const razorpaySignature = String(body?.razorpay_signature || "");

        if (!razorpaySubscriptionId || !razorpayPaymentId || !razorpaySignature) {
            return NextResponse.json({ error: "BAD_REQUEST", message: "Missing payment verification fields." }, { status: 400 });
        }

        const keySecret = process.env.RAZORPAY_KEY_SECRET;
        const planAmountInr = Number(process.env.RAZORPAY_PLAN_AMOUNT_INR || 0);
        if (!keySecret) {
            return NextResponse.json({ error: "CONFIG_ERROR", message: "Razorpay secret missing." }, { status: 500 });
        }

        const expectedSignature = crypto
            .createHmac("sha256", keySecret)
            .update(`${razorpayPaymentId}|${razorpaySubscriptionId}`)
            .digest("hex");

        if (expectedSignature !== razorpaySignature) {
            return NextResponse.json({ error: "BAD_REQUEST", message: "Invalid payment signature." }, { status: 400 });
        }

        const subscriptionDoc = await adminDb.collection("subscriptions").doc(razorpaySubscriptionId).get();
        if (!subscriptionDoc.exists) {
            return NextResponse.json({ error: "NOT_FOUND", message: "Subscription not found." }, { status: 404 });
        }
        const subscriptionData = subscriptionDoc.data() as Record<string, any>;
        if (subscriptionData.uid !== uid) {
            return NextResponse.json({ error: "FORBIDDEN", message: "Subscription does not belong to this user." }, { status: 403 });
        }

        const paymentRef = adminDb.collection("payments").doc(razorpayPaymentId);
        await paymentRef.set({
            uid,
            razorpaySubscriptionId,
            verified: true,
            amountInr: Number.isFinite(planAmountInr) ? planAmountInr : 0,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
        }, { merge: true });

        return NextResponse.json({ success: true }, { status: 200 });
    } catch (error) {
        console.error("Billing verify failed:", error);
        return NextResponse.json({ error: "INTERNAL_SERVER_ERROR", message: "Failed to verify payment." }, { status: 500 });
    }
}
