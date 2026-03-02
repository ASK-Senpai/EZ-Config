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

async function resolveUserRefBySubscription(subscriptionId: string, email?: string) {
    // 1. Try Document ID lookup in 'subscriptions' collection
    const subDoc = await adminDb.collection("subscriptions").doc(subscriptionId).get();
    const subData = subDoc.exists ? (subDoc.data() as Record<string, any>) : null;
    const uid = String(subData?.uid || "");
    if (uid) {
        return adminDb.collection("users").doc(uid);
    }

    // 2. Try Query lookup in 'users' collection by subscriptionId
    const idSnapshot = await adminDb
        .collection("users")
        .where("razorpaySubscriptionId", "==", subscriptionId)
        .limit(1)
        .get();

    if (!idSnapshot.empty) {
        return idSnapshot.docs[0].ref;
    }

    // 3. Try Query lookup in 'users' collection by email (FINAL FALLBACK)
    if (email) {
        const emailSnapshot = await adminDb
            .collection("users")
            .where("email", "==", email.toLowerCase().trim())
            .limit(1)
            .get();

        if (!emailSnapshot.empty) {
            return emailSnapshot.docs[0].ref;
        }
    }

    return null;
}

async function upsertSubscription(subscriptionId: string, data: Record<string, unknown>) {
    await adminDb.collection("subscriptions").doc(subscriptionId).set({
        razorpaySubscriptionId: subscriptionId,
        updatedAt: FieldValue.serverTimestamp(),
        ...data,
    }, { merge: true });
}

async function handleSubscriptionActivated(payload: any) {
    const subEntity = payload?.payload?.subscription?.entity || {};
    const subscriptionId = String(subEntity?.id || "");
    const email = String(subEntity?.customer_email || "").toLowerCase().trim();

    if (!subscriptionId) {
        console.error("[WEBHOOK] NO SUBSCRIPTION ID IN PAYLOAD");
        return;
    }

    const planName = process.env.RAZORPAY_PLAN_NAME || "premium_monthly";

    const userRef = await resolveUserRefBySubscription(subscriptionId, email);
    if (!userRef) {
        console.warn("[WEBHOOK] Webhook ignored - missing subscription");
        return;
    }

    const userSnap = await userRef.get();
    if (userSnap.exists) {
        const userData = userSnap.data() as Record<string, any>;
        // SAFETY GUARD: If already premium and active, skip redundant writes
        if (userData.plan === planName && userData.subscriptionStatus === "active") {
            return;
        }
    }

    const userData = userSnap.exists ? (userSnap.data() as Record<string, any>) : {};

    await userRef.set({
        plan: planName,
        subscriptionStatus: "active",
        razorpaySubscriptionId: subscriptionId,
        premiumSince: userData?.premiumSince ?? new Date().toISOString(),
        aiLimit: 50,
        updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });

    console.info("[WEBHOOK] Subscription activated for user:", userRef.id);

    await upsertSubscription(subscriptionId, {
        uid: userRef.id,
        status: "active",
        plan: planName,
    });
}

async function handleSubscriptionCharged(payload: any) {
    const subEntity = payload?.payload?.subscription?.entity || {};
    const subscriptionId = String(subEntity?.id || "");

    if (!subscriptionId) {
        console.error("[WEBHOOK] NO SUBSCRIPTION ID IN CHARGED PAYLOAD");
        return;
    }

    const currentStart = toDateOrNull(subEntity?.current_start);
    const currentEnd = toDateOrNull(subEntity?.current_end);

    await upsertSubscription(subscriptionId, {
        status: "active",
        currentPeriodStart: currentStart,
        currentPeriodEnd: currentEnd,
    });

    // CRITICAL: Upgrade user on charge
    await handleSubscriptionActivated(payload);
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
        let rawBodyBuffer: Buffer;

        try {
            const ab = await request.arrayBuffer();
            rawBodyBuffer = Buffer.from(ab);
        } catch (err) {
            console.error("BODY READ FAILED:", err);
            return NextResponse.json(
                { error: "BODY_READ_FAILED" },
                { status: 400 }
            );
        }

        const rawBody = rawBodyBuffer.toString("utf8");

        const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

        if (!webhookSecret) {
            throw new Error("RAZORPAY_WEBHOOK_SECRET NOT SET");
        }

        // --- PRE-SIGNATURE LOGGING & IDEMPOTENCY ID ---
        const tempPayload = JSON.parse(rawBody);
        const event = String(tempPayload?.event || "unknown");
        const bodyId = String(tempPayload?.id || "unknown");

        // 1. Return 200 immediately for non-subscription events to avoid processing noise
        if (!event.startsWith("subscription.")) {
            console.log(`[WEBHOOK] IGNORING NON-SUBSCRIPTION EVENT: ${event}`);
            return NextResponse.json({ success: true, ignored: true }, { status: 200 });
        }

        const subscriptionId = tempPayload?.payload?.subscription?.entity?.id;
        if (!subscriptionId) {
            console.warn("[WEBHOOK] IGNORED: MISSING SUBSCRIPTION ID IN " + event);
            return NextResponse.json({ success: true, warning: "missing_sub_id" }, { status: 200 });
        }

        // v4: Use event + subscriptionId for deterministic idempotency
        const eventId = `v4_${event}_${subscriptionId}`;

        const signature = request.headers.get("x-razorpay-signature");

        if (!signature) {
            console.error("[WEBHOOK] NO SIGNATURE HEADER RECEIVED");
            return NextResponse.json({ error: "NO_SIGNATURE" }, { status: 400 });
        }

        const expected = crypto
            .createHmac("sha256", webhookSecret.trim())
            .update(rawBodyBuffer)
            .digest("hex");

        const expectedBuffer = Buffer.from(expected, "hex");
        const signatureBuffer = Buffer.from(signature, "hex");

        const isValid = crypto.timingSafeEqual(expectedBuffer, signatureBuffer);

        if (!isValid) {
            console.error("[WEBHOOK] INVALID SIGNATURE");
            return NextResponse.json({ error: "INVALID_SIGNATURE" }, { status: 400 });
        }

        const payload = tempPayload; // Use consistent name

        const shouldProcess = await markWebhookEventProcessed(eventId);
        if (!shouldProcess) {
            return NextResponse.json({ success: true, duplicate: true }, { status: 200 });
        }

        console.info("[WEBHOOK] Webhook received:", event);
        if (event === "subscription.activated") {
            await handleSubscriptionActivated(payload);
        } else if (event === "subscription.charged") {
            await handleSubscriptionCharged(payload);
        } else if (event === "subscription.cancelled") {
            await handleSubscriptionCancelled(payload);
        } else if (event === "subscription.completed") {
            await handleSubscriptionCompleted(payload);
        }

        return NextResponse.json({ success: true }, { status: 200 });
    } catch (error) {
        console.error("[WEBHOOK] Webhook processing failed");
        return NextResponse.json({ error: "INTERNAL_SERVER_ERROR" }, { status: 500 });
    }
}
