import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/server/auth/requireAuth";
import { userService } from "@/lib/services/userService";

export const runtime = "nodejs";

export async function DELETE(request: NextRequest) {
    try {
        const decodedUser = await requireAuth();
        const userId = decodedUser.uid;

        // In a real app, you'd also cancel active subscriptions in Stripe/Razorpay here
        await userService.deleteUser(userId);

        return NextResponse.json({ status: "success", message: "Account deleted." }, { status: 200 });
    } catch (error: any) {
        if (error.message === "UNAUTHORIZED") {
            return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
        }
        console.error("User deletion error:", error);
        return NextResponse.json({ error: "INTERNAL_SERVER_ERROR" }, { status: 500 });
    }
}
