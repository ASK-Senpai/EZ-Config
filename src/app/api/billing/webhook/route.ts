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
    console.log("RESOLVING USER FOR SUB:", subscriptionId, "EMAIL:", email || "not provided");

    // 1. Try Document ID lookup in 'subscriptions' collection
    const subDoc = await adminDb.collection("subscriptions").doc(subscriptionId).get();
    console.log("SUB DOC EXISTS:", subDoc.exists);

    const subData = subDoc.exists ? (subDoc.data() as Record<string, any>) : null;
    const uid = String(subData?.uid || "");
    if (uid) {
        console.log("RESOLVED USER VIA SUB DOC:", uid);
        return adminDb.collection("users").doc(uid);
    }

    // 2. Try Query lookup in 'users' collection by subscriptionId
    console.log("FALLING BACK TO ID QUERY SEARCH...");
    const idSnapshot = await adminDb
        .collection("users")
        .where("razorpaySubscriptionId", "==", subscriptionId)
        .limit(1)
        .get();

    console.log("ID QUERY SNAPSHOT SIZE:", idSnapshot.size);

    if (!idSnapshot.empty) {
        const resolvedRef = idSnapshot.docs[0].ref;
        console.log("RESOLVED USER VIA ID QUERY:", resolvedRef.id);
        return resolvedRef;
    }

    // 3. Try Query lookup in 'users' collection by email (FINAL FALLBACK)
    if (email) {
        console.log("FALLING BACK TO EMAIL QUERY SEARCH:", email);
        const emailSnapshot = await adminDb
            .collection("users")
            .where("email", "==", email.toLowerCase().trim())
            .limit(1)
            .get();

        console.log("EMAIL QUERY SNAPSHOT SIZE:", emailSnapshot.size);

        if (!emailSnapshot.empty) {
            const resolvedRef = emailSnapshot.docs[0].ref;
            console.log("RESOLVED USER VIA EMAIL QUERY:", resolvedRef.id);
            return resolvedRef;
        }
    }

    console.error("COULD NOT RESOLVE USER VIA ANY METHOD");
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
    const paymentEntity = payload?.payload?.payment?.entity || {};

    // Extracting Sub ID from multiple possible locations
    const subIdTop = subEntity?.id;
    const subIdPayment = paymentEntity?.subscription_id;
    const subscriptionId = String(subIdTop || subIdPayment || "");

    // Extracting Email for fallback resolution
    const emailSub = subEntity?.customer_email;
    const emailPayment = paymentEntity?.email;
    const email = String(emailSub || emailPayment || "");

    if (!subscriptionId) {
        console.error("NO SUBSCRIPTION ID IN PAYLOAD");
        return;
    }

    const planName = process.env.RAZORPAY_PLAN_NAME || "premium_monthly";

    console.log("==== STARTING UPGRADE LOGIC ====");
    console.log("Subscription ID:", subscriptionId);
    console.log("Email Found:", email || "NONE");

    const userRef = await resolveUserRefBySubscription(subscriptionId, email);
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
    // Razorpay puts subscription info under payment entity sometimes
    const subIdTop = payload?.payload?.subscription?.entity?.id;
    const subIdPayment = payload?.payload?.payment?.entity?.subscription_id;
    const subscriptionId = String(subIdTop || subIdPayment || "");

    if (!subscriptionId) {
        console.error("COULD NOT FIND SUBSCRIPTION ID IN CHARGED PAYLOAD");
        return;
    }

    console.log("PAYMENT CHARGED FOR SUB:", subscriptionId);

    const entity = payload?.payload?.subscription?.entity || {};
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

            const baseId = razorpayEventId || paymentId || (subscriptionId ? `${event}_${subscriptionId}` : "");
            eventId = `v2_${baseId}`;

            if (!baseId) {
                eventId = `v2_fallback_${event}_${Date.now()}`;
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
        console.log("EVENT ID (INTERNAL):", eventId);
        console.log("EVENT ID (PAYLOAD):", payload?.id);

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
