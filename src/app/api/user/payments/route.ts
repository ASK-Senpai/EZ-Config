import { NextResponse } from "next/server";
import { getFirestore } from "firebase-admin/firestore";
import { requireAuth } from "@/server/auth/requireAuth";
import { billingService } from "@/lib/services/billingService";

export async function GET() {
    try {
        const decodedToken = await requireAuth();
        const userId = decodedToken.uid;

        const payments = await billingService.getPaymentHistory(userId);

        return NextResponse.json({ payments }, { status: 200 });
    } catch (error: any) {
        console.error("Failed to fetch payment history:", error);
        return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }
}
