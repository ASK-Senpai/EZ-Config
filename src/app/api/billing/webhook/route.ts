import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";

function toDateOrNull(unixSeconds: unknown): Date | null {
    const n = Number(unixSeconds);
    if (!Number.isFinite(n) || n <= 0) return null;
    return new Date(n * 1000);
}

async function markWebhookEventProcessed(eventId: string) {
    const eventRef = adminDb.collection("webhookEvents").doc(eventId);
    return adminDb.runTransaction(async (tx) => {
        const existing = await tx.get(eventRef);
        if (existing.exists) {
            return false;
        }
        tx.set(eventRef, {
            processed: true,
            createdAt: FieldValue.serverTimestamp(),
        });
        return true;
    });
}

async function resolveUserRefBySubscription(subscriptionId: string) {
    const subDoc = await adminDb.collection("subscriptions").doc(subscriptionId).get();
    const subData = subDoc.exists ? (subDoc.data() as Record<string, any>) : null;
    const uid = String(subData?.uid || "");
    if (uid) {
        return adminDb.collection("users").doc(uid);
    }

    const userSnapshot = await adminDb
        .collection("users")
        .where("razorpaySubscriptionId", "==", subscriptionId)
        .limit(1)
        .get();

    if (userSnapshot.empty) return null;
    return userSnapshot.docs[0].ref;
}

async function upsertSubscription(subscriptionId: string, data: Record<string, unknown>) {
    await adminDb.collection("subscriptions").doc(subscriptionId).set({
        razorpaySubscriptionId: subscriptionId,
        updatedAt: FieldValue.serverTimestamp(),
        ...data,
    }, { merge: true });
}

async function handleSubscriptionActivated(payload: any) {
    const entity = payload?.payload?.subscription?.entity || {};
    const subscriptionId = String(entity?.id || "");
    if (!subscriptionId) return;

    const planName = process.env.RAZORPAY_PLAN_NAME || "premium_monthly";

    const userRef = await resolveUserRefBySubscription(subscriptionId);
    if (!userRef) return;

    const userSnap = await userRef.get();
    const userData = userSnap.exists ? (userSnap.data() as Record<string, any>) : {};

    await userRef.set({
        plan: planName,
        subscriptionStatus: "active",
        razorpaySubscriptionId: subscriptionId,
        premiumSince: userData?.premiumSince ?? FieldValue.serverTimestamp(),
        aiLimit: 50,
        updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });

    await upsertSubscription(subscriptionId, {
        uid: userRef.id,
        status: "active",
        plan: planName,
    });
}

async function handleSubscriptionCharged(payload: any) {
    const entity = payload?.payload?.subscription?.entity || {};
    const subscriptionId = String(entity?.id || "");
    if (!subscriptionId) return;

    const currentStart = toDateOrNull(entity?.current_start);
    const currentEnd = toDateOrNull(entity?.current_end);

    await upsertSubscription(subscriptionId, {
        status: "active",
        currentPeriodStart: currentStart,
        currentPeriodEnd: currentEnd,
    });
}

async function handleSubscriptionCancelled(payload: any) {
    const entity = payload?.payload?.subscription?.entity || {};
    const subscriptionId = String(entity?.id || "");
    if (!subscriptionId) return;

    const userRef = await resolveUserRefBySubscription(subscriptionId);
    if (userRef) {
        await userRef.set({
            subscriptionStatus: "cancelled",
            plan: "free",
            aiLimit: 5,
            updatedAt: FieldValue.serverTimestamp(),
        }, { merge: true });
    }

    await upsertSubscription(subscriptionId, {
        status: "cancelled",
    });
}

async function handleSubscriptionCompleted(payload: any) {
    const entity = payload?.payload?.subscription?.entity || {};
    const subscriptionId = String(entity?.id || "");
    if (!subscriptionId) return;

    const userRef = await resolveUserRefBySubscription(subscriptionId);
    if (userRef) {
        await userRef.set({
            subscriptionStatus: "expired",
            plan: "free",
            aiLimit: 5,
            updatedAt: FieldValue.serverTimestamp(),
        }, { merge: true });
    }

    await upsertSubscription(subscriptionId, {
        status: "completed",
    });
}

async function handlePaymentFailed(payload: any) {
    const paymentEntity = payload?.payload?.payment?.entity || {};
    const subscriptionId = String(paymentEntity?.subscription_id || "");
    if (!subscriptionId) return;

    const userRef = await resolveUserRefBySubscription(subscriptionId);
    if (userRef) {
        await userRef.set({
            subscriptionStatus: "past_due",
            updatedAt: FieldValue.serverTimestamp(),
        }, { merge: true });
    }

    await upsertSubscription(subscriptionId, {
        status: "past_due",
    });
}

export async function POST(request: NextRequest) {
    try {
        const rawBodyBuffer = Buffer.from(await request.arrayBuffer());
        const rawBody = rawBodyBuffer.toString("utf8");

        const signature = request.headers.get("x-razorpay-signature");
        const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

        console.log("WEBHOOK RECEIVED");
        console.log("ENV SECRET PRESENT:", !!process.env.RAZORPAY_WEBHOOK_SECRET);
        console.log("ENV SECRET VALUE:", process.env.RAZORPAY_WEBHOOK_SECRET || "undefined");

        const headersObject = Object.fromEntries(request.headers.entries());
        console.log("ALL HEADERS:", headersObject);

        console.log("Webhook secret present:", !!webhookSecret);
        console.log("Signature present:", !!signature);
        console.log("Raw body length:", rawBodyBuffer.length);

        if (!signature || !webhookSecret) {
            console.error("Missing signature or webhook secret");
            return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });
        }

        const expected = crypto
            .createHmac("sha256", webhookSecret)
            .update(rawBodyBuffer)
            .digest("hex");

        const expectedBuffer = Buffer.from(expected, "utf8");
        const signatureBuffer = Buffer.from(signature, "utf8");

        console.log("Expected signature length:", expectedBuffer.length);
        console.log("Received signature length:", signatureBuffer.length);

        if (expectedBuffer.length !== signatureBuffer.length) {
            console.error("SIGNATURE LENGTH MISMATCH");
            console.error("Expected:", expected);
            console.error("Received:", signature);
            return NextResponse.json({ error: "INVALID_SIGNATURE" }, { status: 400 });
        }

        const isValid = crypto.timingSafeEqual(expectedBuffer, signatureBuffer);

        if (!isValid) {
            console.error("INVALID SIGNATURE");
            console.error("Expected:", expected);
            console.error("Received:", signature);
            return NextResponse.json({ error: "INVALID_SIGNATURE" }, { status: 400 });
        }

        const payload = JSON.parse(rawBody);
        const eventId = String(payload?.id || "");
        const event = String(payload?.event || "");

        if (!eventId || !event) {
            return NextResponse.json({ error: "BAD_REQUEST", message: "Invalid webhook payload." }, { status: 400 });
        }

        const shouldProcess = await markWebhookEventProcessed(eventId);
        if (!shouldProcess) {
            return NextResponse.json({ success: true, duplicate: true }, { status: 200 });
        }

        if (event === "subscription.activated" || event === "payment.captured") {
            await handleSubscriptionActivated(payload);
        } else if (event === "subscription.charged") {
            await handleSubscriptionCharged(payload);
        } else if (event === "subscription.cancelled") {
            await handleSubscriptionCancelled(payload);
        } else if (event === "subscription.completed") {
            await handleSubscriptionCompleted(payload);
        } else if (event === "payment.failed") {
            await handlePaymentFailed(payload);
        }

        return NextResponse.json({ success: true }, { status: 200 });
    } catch (error) {
        console.error("Billing webhook failed:", error);
        return NextResponse.json({ error: "INTERNAL_SERVER_ERROR" }, { status: 500 });
    }
}
