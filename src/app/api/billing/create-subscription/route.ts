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
            return NextResponse.json({ error: "UNAUTHORIZED", message: "Missing bearer token." }, { status: 401 });
        }

        const decoded = await admin.auth().verifyIdToken(token);
        const uid = decoded.uid;

        const keyId = process.env.RAZORPAY_KEY_ID;
        const keySecret = process.env.RAZORPAY_KEY_SECRET;
        const planId = process.env.RAZORPAY_PLAN_ID;
        const planName = process.env.RAZORPAY_PLAN_NAME || "premium_monthly";
        const planAmountInr = Number(process.env.RAZORPAY_PLAN_AMOUNT_INR || 0);
        const publicKeyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || keyId;

        if (!keyId || !keySecret || !planId || !publicKeyId) {
            return NextResponse.json({ error: "CONFIG_ERROR", message: "Razorpay subscription config missing." }, { status: 500 });
        }

        const razorpay = new Razorpay({
            key_id: keyId,
            key_secret: keySecret,
        });

        try {
            const subscription = await razorpay.subscriptions.create({
                plan_id: planId,
                customer_notify: 1,
                total_count: Number(process.env.RAZORPAY_BILLING_CYCLES || 1200),
            });

            await adminDb.collection("subscriptions").doc(subscription.id).set({
                uid,
                razorpaySubscriptionId: subscription.id,
                status: "created",
                plan: planName,
                amountInr: Number.isFinite(planAmountInr) ? planAmountInr : 0,
                currentPeriodStart: null,
                currentPeriodEnd: null,
                createdAt: FieldValue.serverTimestamp(),
                updatedAt: FieldValue.serverTimestamp(),
            }, { merge: true });

            return NextResponse.json(
                {
                    subscriptionId: subscription.id,
                    key: publicKeyId,
                },
                { status: 200 }
            );
        } catch (err: any) {
            console.error("========== RAZORPAY CREATE SUBSCRIPTION ERROR ==========");
            console.error("FULL ERROR OBJECT:", err);
            console.error("ERROR JSON:", JSON.stringify(err, null, 2));
            console.error("PLAN ID USED:", process.env.RAZORPAY_PLAN_ID);
            console.error("BILLING CYCLES USED:", process.env.RAZORPAY_BILLING_CYCLES);
            console.error("==========================================================");

            return NextResponse.json(
                { error: "Subscription creation failed" },
                { status: 500 }
            );
        }
    } catch (error) {
        console.error("Create subscription failed:", error);
        return NextResponse.json({ error: "INTERNAL_SERVER_ERROR", message: "Failed to create subscription." }, { status: 500 });
    }
}
