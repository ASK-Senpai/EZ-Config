import { NextRequest, NextResponse } from "next/server";
import Razorpay from "razorpay";
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
            return NextResponse.json(
                { error: "UNAUTHORIZED", message: "Missing bearer token." },
                { status: 401 }
            );
        }

        const decoded = await admin.auth().verifyIdToken(token);
        const uid = decoded.uid;

        const userDoc = await adminDb.collection("users").doc(uid).get();
        const userData = userDoc.exists ? (userDoc.data() as Record<string, any>) : {};

        const keyId = process.env.RAZORPAY_KEY_ID;
        const keySecret = process.env.RAZORPAY_KEY_SECRET;
        const planId = process.env.RAZORPAY_PLAN_ID;
        const planName = (process.env.RAZORPAY_PLAN_NAME ?? "premium_monthly").toLowerCase();
        const planAmountInr = Number(process.env.RAZORPAY_PLAN_AMOUNT_INR ?? 0);

        if (!keyId || !keySecret || !planId) {
            throw new Error("Missing Razorpay environment variables");
        }

        const rawPlan = String(userData?.plan ?? "").toLowerCase();
        const rawStatus = String(userData?.subscriptionStatus ?? "").toLowerCase();

        // ✅ Duplicate subscription protection
        if (rawStatus === "active" && (rawPlan === planName || rawPlan === "premium")) {
            return NextResponse.json(
                { error: "Subscription already active" },
                { status: 409 }
            );
        }

        const razorpay = new Razorpay({
            key_id: keyId,
            key_secret: keySecret,
        });

        try {
            const subscription = await razorpay.subscriptions.create({
                plan_id: planId,
                customer_notify: 1,
                total_count: Number(process.env.RAZORPAY_BILLING_CYCLES ?? 1200),
            });

            await adminDb.collection("subscriptions").doc(subscription.id).set(
                {
                    uid,
                    razorpaySubscriptionId: subscription.id,
                    status: "created",
                    plan: planName,
                    amountInr: Number.isFinite(planAmountInr) ? planAmountInr : 0,
                    currentPeriodStart: null,
                    currentPeriodEnd: null,
                    createdAt: FieldValue.serverTimestamp(),
                    updatedAt: FieldValue.serverTimestamp(),
                },
                { merge: true }
            );

            return NextResponse.json(
                {
                    subscriptionId: subscription.id,
                    key: keyId,
                },
                { status: 200 }
            );
        } catch (err: any) {
            console.error("[BILLING] Subscription creation failed");

            return NextResponse.json(
                { error: "Subscription creation failed" },
                { status: 500 }
            );
        }
    } catch (error) {
        console.error("Create subscription failed:", error);
        return NextResponse.json(
            { error: "INTERNAL_SERVER_ERROR", message: "Failed to create subscription." },
            { status: 500 }
        );
    }
}