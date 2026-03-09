import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/server/auth/requireAuth";
import { buildService } from "@/lib/services/buildService";
import { billingService } from "@/lib/services/billingService";
import { aiService } from "@/lib/services/aiService";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
    try {
        const decoded = await requireAuth();
        const userId = decoded.uid;

        const [builds, subscription, usage] = await Promise.all([
            buildService.getBuilds(userId),
            billingService.getSubscriptionStatus(userId),
            aiService.getUsageStats(userId)
        ]);

        return NextResponse.json({
            success: true,
            builds: builds.map(b => ({
                ...b,
                createdAt: (b as any).createdAt?.toDate?.()?.toISOString() || null,
                updatedAt: (b as any).updatedAt?.toDate?.()?.toISOString() || null,
            })),
            subscription: {
                plan: subscription?.plan || "free",
                subscriptionStatus: subscription?.status || "inactive",
                aiUsage: usage?.used || 0,
                aiLimit: usage?.limit || 5,
            },
        });
    } catch (error: any) {
        if (error.message === "UNAUTHORIZED") {
            return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
        }
        console.error(error);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}

