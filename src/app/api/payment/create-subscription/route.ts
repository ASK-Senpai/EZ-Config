import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/server/auth/requireAuth";
import Razorpay from "razorpay";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
    try {
        await requireAuth();

        const key_id = process.env.RAZORPAY_KEY_ID;
        const key_secret = process.env.RAZORPAY_KEY_SECRET;
        const plan_id = process.env.RAZORPAY_PLAN_ID;

        if (!key_id || !key_secret || !plan_id) {
            console.error("Missing Razorpay environment variables");
            return NextResponse.json({ error: "INTERNAL_SERVER_ERROR", message: "Payment gateway configuration error." }, { status: 500 });
        }

        const instance = new Razorpay({
            key_id,
            key_secret,
        });

        // Create subscription
        const subscription = await instance.subscriptions.create({
            plan_id,
            total_count: 12, // Yearly billing cycle example
            customer_notify: 1,
        });

        return NextResponse.json({
            status: "success",
            subscriptionId: subscription.id,
            keyId: key_id
        }, { status: 200 });

    } catch (error: any) {
        if (error.message === "UNAUTHORIZED") {
            return NextResponse.json({ error: "UNAUTHORIZED", message: "Missing or invalid session" }, { status: 401 });
        }

        console.error("Failed to create subscription:", error);
        return NextResponse.json({ error: "INTERNAL_SERVER_ERROR", message: "Failed to create subscription." }, { status: 500 });
    }
}
