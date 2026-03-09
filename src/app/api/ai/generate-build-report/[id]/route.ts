import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/server/auth/requireAuth";
import { buildService } from "@/lib/services/buildService";
import { aiService } from "@/lib/services/aiService";
import { billingService } from "@/lib/services/billingService";
import { analyzeBuild } from "@/lib/engine/analyzeBuild";
import { createHash } from "crypto";

export const runtime = "nodejs";

function computeEngineSnapshotHash(buildInput: any, analysis: any): string {
    const hashPayload = JSON.stringify({
        cpuId: buildInput.cpu?.id || null,
        gpuId: (buildInput.activeGpu ?? buildInput.gpu)?.id || null,
        ramId: buildInput.ram?.id || null,
        storageId: Array.isArray(buildInput.storage) ? buildInput.storage[0]?.id || null : (buildInput.storage as any)?.id || null,
        psuId: buildInput.psu?.id || null,
        engineScores: analysis.scores || {},
    });
    return createHash("sha256").update(hashPayload).digest("hex");
}

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const decodedUser = await requireAuth();
        const userId = decodedUser.uid;
        const { id: buildId } = await params;

        const build = await buildService.getBuildById(userId, buildId);
        if (!build) {
            return NextResponse.json({ error: "NOT_FOUND", message: "Build not found." }, { status: 404 });
        }

        const buildInput = await buildService.hydrateBuild(build.components || {});

        const analysis = analyzeBuild(buildInput, "free");
        const engineSnapshotHash = computeEngineSnapshotHash(buildInput, analysis);

        const cached = await aiService.getCachedReport(engineSnapshotHash);
        return NextResponse.json({ exists: !!cached, reportId: cached ? cached.id : null }, { status: 200 });
    } catch (error: any) {
        if (error.message === "UNAUTHORIZED") {
            return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
        }
        if (error.message === "Database index not ready") {
            return NextResponse.json(
                { error: "DATABASE_ERROR", message: "Database index not ready" },
                { status: 503 }
            );
        }
        console.error(error);
        return NextResponse.json({ error: "INTERNAL_SERVER_ERROR" }, { status: 500 });
    }
}

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const decodedUser = await requireAuth();
        const userId = decodedUser.uid;
        const { id: buildId } = await params;

        const [build, subscription] = await Promise.all([
            buildService.getBuildById(userId, buildId),
            billingService.getSubscriptionStatus(userId)
        ]);

        if (!build) {
            return NextResponse.json({ error: "NOT_FOUND", message: "Build not found." }, { status: 404 });
        }

        const plan = (subscription?.plan === "premium" && subscription?.status === "active") ? "premium" : "free";

        // 1. Check Usage Limit (Simple check here, more robust logic in service)
        const usage = await aiService.getUsageStats(userId);
        if (usage && usage.remaining < 1) {
            return NextResponse.json(
                { error: "AI_USAGE_EXHAUSTED", message: "No AI usage remaining for this month." },
                { status: 403 }
            );
        }

        const buildInput = await buildService.hydrateBuild(build.components || {});
        if (!buildInput.cpu || !buildInput.gpu) {
            return NextResponse.json({ error: "BAD_REQUEST", message: "Saved build is incomplete." }, { status: 400 });
        }

        const analysis = analyzeBuild(buildInput, plan);
        const buildName = (build as any).name || "Untitled Build";

        // 2. Delegate to Service (which handles hashing, caching, and usage tracking)
        const result = await aiService.generateAndTrack(userId, buildId, buildInput, analysis, buildName);

        return NextResponse.json({
            reportId: result.reportId,
            cached: result.cached,
            reportJson: result.report
        }, { status: 200 });

    } catch (error: any) {
        if (error.message === "UNAUTHORIZED") {
            return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
        }
        if (error.message === "Database index not ready") {
            return NextResponse.json(
                { error: "DATABASE_ERROR", message: "Database index not ready" },
                { status: 503 }
            );
        }
        console.error("AI Report Gen Error:", error);
        return NextResponse.json({ error: "INTERNAL_SERVER_ERROR" }, { status: 500 });
    }
}

