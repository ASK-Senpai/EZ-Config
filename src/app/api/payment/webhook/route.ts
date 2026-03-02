import { NextRequest, NextResponse } from "next/server";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import crypto from "crypto";
import "@/server/firebase/admin"; // Ensures Firebase Admin is initialized

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
    try {
        const rawBody = await request.text();
        const signature = request.headers.get("x-razorpay-signature");
        const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

        // Verify request structure and environment variables
        if (!signature || !webhookSecret) {
            return NextResponse.json({ error: "Configuration or Authorization missing." }, { status: 400 });
        }

        // Validate webhook signature
        const expectedSignature = crypto
            .createHmac("sha256", webhookSecret)
            .update(rawBody)
            .digest("hex");

        if (expectedSignature !== signature) {
            return NextResponse.json({ error: "Invalid webhook signature." }, { status: 400 });
        }

        // Parse verified payload
        const parsedBody = JSON.parse(rawBody);
        const event = parsedBody.event;
        const subscriptionId = parsedBody.payload?.subscription?.entity?.id;

        if (!event || !subscriptionId) {
            return NextResponse.json({ status: "ignored", message: "Missing event or subscription ID." }, { status: 200 });
        }

        const db = getFirestore();

        // Find user by subscriptionId
        const usersSnapshot = await db.collection("users")
            .where("subscriptionId", "==", subscriptionId)
            .limit(1)
            .get();

        if (usersSnapshot.empty) {
            return NextResponse.json({ status: "ignored", message: "No user found for this subscription." }, { status: 200 });
        }

        const userDoc = usersSnapshot.docs[0];
        const userRef = userDoc.ref;

        let updates: any = {};
        let analyticsUpdates: any = null;

        switch (event) {
            case "subscription.activated":
                updates = {
                    plan: "premium",
                    subscriptionStatus: "active",
                    premiumSince: FieldValue.serverTimestamp(),
                    aiLimit: 50,
                    updatedAt: FieldValue.serverTimestamp()
                };
                break;
            case "subscription.charged":
                updates = {
                    plan: "premium",
                    subscriptionStatus: "active",
                    aiLimit: 50,
                    updatedAt: FieldValue.serverTimestamp()
                };
                break;
            case "subscription.halted":
            case "subscription.cancelled":
                updates = {
                    subscriptionStatus: "cancelled",
                    updatedAt: FieldValue.serverTimestamp()
                };
                analyticsUpdates = { subscriptionStatus: "cancelled" };
                break;
            case "subscription.completed":
                updates = {
                    plan: "free",
                    subscriptionStatus: "expired",
                    subscriptionId: null, // Clear the subscription link if completed/cancelled
                    aiLimit: 5,
                    updatedAt: FieldValue.serverTimestamp()
                };
                analyticsUpdates = { subscriptionStatus: "expired", isCancellation: true };
                break;
            default:
                // Unhandled events return 200 to prevent Razorpay from retrying
                return NextResponse.json({ status: "ignored", event }, { status: 200 });
        }

        if (Object.keys(updates).length > 0) {
            const batch = db.batch();
            batch.update(userRef, updates);

            if (analyticsUpdates) {
                const userAnalyticsRef = db.collection("analytics_users").doc(userDoc.id);
                batch.set(userAnalyticsRef, { subscriptionStatus: analyticsUpdates.subscriptionStatus }, { merge: true });

                if (analyticsUpdates.isCancellation) {
                    const globalRef = db.collection("analytics").doc("global");
                    batch.set(globalRef, {
                        totalCancellations: FieldValue.increment(1),
                        totalPremiumUsers: FieldValue.increment(-1)
                    }, { merge: true });
                }
            }

            await batch.commit();
        }

        return NextResponse.json({ status: "success", event }, { status: 200 });

    } catch (error) {
        // We do not throw or expose server errors unhandled to webhooks, but log them for system trace
        console.error("Webhook processing failed:", error);
        return NextResponse.json({ status: "ignored", message: "Processing error encountered." }, { status: 200 });
    }
}
