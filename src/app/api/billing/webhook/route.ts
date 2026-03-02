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
    console.log("RESOLVING USER FOR SUB:", subscriptionId);

    const subDoc = await adminDb.collection("subscriptions").doc(subscriptionId).get();
    console.log("SUB DOC EXISTS:", subDoc.exists);

    const subData = subDoc.exists ? (subDoc.data() as Record<string, any>) : null;
    if (subData) {
        console.log("SUB DATA FOUND, UID:", subData.uid);
    } else {
        console.log("NO SUB DATA FOUND VIA DOC ID");
    }

    const uid = String(subData?.uid || "");
    if (uid) {
        console.log("RESOLVED USER VIA SUB DOC:", uid);
        return adminDb.collection("users").doc(uid);
    }

    console.log("FALLING BACK TO QUERY SEARCH...");
    const userSnapshot = await adminDb
        .collection("users")
        .where("razorpaySubscriptionId", "==", subscriptionId)
        .limit(1)
        .get();

    console.log("FALLBACK QUERY SIZE:", userSnapshot.size);

    if (userSnapshot.empty) {
        console.error("COULD NOT RESOLVE USER FOR SUB:", subscriptionId);
        return null;
    }

    const resolvedRef = userSnapshot.docs[0].ref;
    console.log("RESOLVED USER VIA FALLBACK:", resolvedRef.id);
    return resolvedRef;
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
    if (!subscriptionId) {
        console.error("NO SUBSCRIPTION ID IN PAYLOAD");
        return;
    }

    const planName = process.env.RAZORPAY_PLAN_NAME || "premium_monthly";

    console.log("==== STARTING UPGRADE LOGIC ====");
    console.log("Subscription ID:", subscriptionId);

    const userRef = await resolveUserRefBySubscription(subscriptionId);
    if (!userRef) {
        console.error("SKIPPING UPGRADE: NO USER RESOLVED FOR SUB:", subscriptionId);
        return;
    }

    console.log("UPGRADING USER DOCUMENT:", userRef.id);
    const userSnap = await userRef.get();
    const userData = userSnap.exists ? (userSnap.data() as Record<string, any>) : {};

    await userRef.set({
        plan: planName,
        subscriptionStatus: "active",
        razorpaySubscriptionId: subscriptionId,
        premiumSince: userData?.premiumSince ?? new Date().toISOString(),
        aiLimit: 50,
        updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });

    console.log("USER DOCUMENT UPDATED SUCCESSFULLY");

    await upsertSubscription(subscriptionId, {
        uid: userRef.id,
        status: "active",
        plan: planName,
    });
    console.log("SUBSCRIPTION DOC UPDATED TO ACTIVE");
    console.log("==== UPGRADE LOGIC COMPLETE ====");
}

async function handleSubscriptionCharged(payload: any) {
    const entity = payload?.payload?.subscription?.entity || {};
    const subscriptionId = String(entity?.id || "");
    if (!subscriptionId) return;

    console.log("PAYMENT CHARGED FOR SUB:", subscriptionId);

    const currentStart = toDateOrNull(entity?.current_start);
    const currentEnd = toDateOrNull(entity?.current_end);

    await upsertSubscription(subscriptionId, {
        status: "active",
        currentPeriodStart: currentStart,
        currentPeriodEnd: currentEnd,
    });

    // CRITICAL: Upgrade user on charge since 'activated' might not fire
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
            console.log("BODY READ SUCCESS");
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
        let eventId = "unknown";
        let event = "unknown";
        try {
            const tempPayload = JSON.parse(rawBody);
            event = String(tempPayload?.event || "unknown");

            // Build a reliable idempotency ID
            // 1. Try Payment ID (finest grain)
            // 2. Try Event ID (standard)
            // 3. Try Subscription ID + Event (fallback)
            const paymentId = tempPayload?.payload?.payment?.entity?.id;
            const razorpayEventId = tempPayload?.id;
            const subscriptionId = tempPayload?.payload?.subscription?.entity?.id;

            eventId = razorpayEventId || paymentId || (subscriptionId ? `${event}_${subscriptionId}` : "");

            if (!eventId) {
                eventId = `fallback_${event}_${Date.now()}`;
                console.warn("MISSING RELIABLE ID, USING FALLBACK:", eventId);
            }
        } catch (e) {
            console.error("FAILED TO PARSE PAYLOAD FOR LOGGING", e);
        }

        const signature = request.headers.get("x-razorpay-signature");

        if (!signature) {
            console.error("NO SIGNATURE HEADER RECEIVED");
            return NextResponse.json({ error: "NO_SIGNATURE" }, { status: 400 });
        }

        const expected = crypto
            .createHmac("sha256", webhookSecret.trim())
            .update(rawBodyBuffer)
            .digest("hex");

        const expectedBuffer = Buffer.from(expected, "hex");
        const signatureBuffer = Buffer.from(signature, "hex");

        const isValid = crypto.timingSafeEqual(expectedBuffer, signatureBuffer);

        console.log("SIGNATURE VALID:", isValid);
        console.log("---- WEBHOOK DEBUG END ----");

        if (!isValid) {
            return NextResponse.json({ error: "INVALID_SIGNATURE" }, { status: 400 });
        }

        const payload = JSON.parse(rawBody);

        console.log("==== WEBHOOK EVENT RECEIVED ====");
        console.log("EVENT TYPE:", event);
        console.log("EVENT ID (PAYLOAD):", payload?.id);
        console.log("FULL PAYLOAD KEYS:", Object.keys(payload));
        // Be careful with full payload logging in production due to PII/Secrets, 
        // but for this debug cycle it's essential.
        console.log("FULL PAYLOAD:", JSON.stringify(payload, null, 1));

        const shouldProcess = await markWebhookEventProcessed(eventId);
        if (!shouldProcess) {
            console.log("EVENT ALREADY PROCESSED (DUPLICATE)");
            return NextResponse.json({ success: true, duplicate: true }, { status: 200 });
        }

        console.log(`DISPATCHING EVENT: ${event}`);

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

        console.log("WEBHOOK PROCESSED SUCCESSFULLY");
        return NextResponse.json({ success: true }, { status: 200 });
    } catch (error) {
        console.error("Billing webhook failed:", error);
        return NextResponse.json({ error: "INTERNAL_SERVER_ERROR" }, { status: 500 });
    }
}
