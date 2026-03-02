import { NextRequest, NextResponse } from "next/server";
import { analyzeBottleneck, BottleneckPayload } from "@/lib/ai/hardware-intelligence";
import { getCachedAI, setCachedAI } from "@/lib/ai/memo";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json().catch(() => ({}));

        const {
            cpuId, gpuId, cpuName, gpuName, resolution, targetFps,
            bottleneckPercent, bottleneckSide, cpuScore, gpuScore,
            cpuTier, gpuTier, gpuMinPrice
        } = body as BottleneckPayload;

        // Validate required fields
        if (!cpuId || !gpuId || !cpuName || !gpuName || !resolution || targetFps === undefined) {
            return NextResponse.json(
                { error: "BAD_REQUEST", message: "Missing required bottleneck payload fields." },
                { status: 400 }
            );
        }

        // Memoization key — includes bottleneckPercent so different results get separate cache entries
        const cacheKey = `bottleneck:${cpuId}|${gpuId}|${resolution}|${targetFps}|${Math.round(bottleneckPercent)}`;

        // Cache check
        const cached = getCachedAI(cacheKey);
        if (cached) {
            console.log("[CACHE HIT]", cacheKey);
            return NextResponse.json({ status: "success", analysis: cached, cached: true }, { status: 200 });
        }

        console.log("[CACHE MISS]", cacheKey);

        // Call AI intelligence wrapper
        const analysis = await analyzeBottleneck({
            cpuId,
            gpuId,
            cpuName,
            gpuName,
            resolution,
            targetFps,
            bottleneckPercent,
            bottleneckSide,
            cpuScore,
            gpuScore,
            cpuTier: String(cpuTier),  // Always string
            gpuTier: String(gpuTier),
            gpuMinPrice,
        });

        // Store only if valid object with severity
        if (analysis.severity) {
            setCachedAI(cacheKey, analysis);
        }

        return NextResponse.json({ status: "success", analysis, cached: false }, { status: 200 });

    } catch (error: any) {
        console.error("Bottleneck AI route error:", error);
        return NextResponse.json(
            { error: "INTERNAL_SERVER_ERROR", message: "Failed to analyze bottleneck." },
            { status: 500 }
        );
    }
}
