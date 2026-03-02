// src/lib/engine/index.ts

import { mapTier, estimateFPS, calculateFutureProofScore } from "./performance";
import { calculateTotalTDP, calculateRecommendedPSU } from "./power";
import { validateCompatibility, BuildInput } from "./compatibility";
import { generateSuggestions } from "./suggestion";
import { getGamingScoreSafe, getProductivityScoreSafe, calculateBottleneckFromScores } from "./scoring";

// Max reference scores for 0-100 normalization inside the engine.
// RTX 4090 = 1000 in V1 dataset → maps to ~100 in 0-100 scale.
const ENGINE_GPU_MAX = 1000;
const ENGINE_CPU_MAX = 100; // CPUs still use benchmarkScore / 40000 * 100 path

function normalizeTo100(rawScore: number, max: number): number {
    return Math.round(Math.min((rawScore / max) * 100, 100) * 100) / 100;
}

export function runEngineV12(buildInput: BuildInput, plan: string = "free") {
    // Resolve active GPU: prefer activeGpu (set by resolver), fallback to gpu
    const gpu = buildInput?.activeGpu ?? buildInput?.gpu;

    // 1. Raw scores via scoring.ts accessors (safe versions to avoid throw on partial builds)
    const rawGPU = getGamingScoreSafe(gpu);
    const rawCPU = getGamingScoreSafe(buildInput?.cpu) || (buildInput?.cpu?.benchmarkScore ?? 0);

    // 2. Normalize to 0–100 for performance scoring
    const normGPU = normalizeTo100(rawGPU, ENGINE_GPU_MAX);
    // CPU normalization: if CPU has V1 normalized score use it, else use benchmarkScore path
    const normCPU = buildInput?.cpu?.normalized?.gamingScore !== undefined
        ? normalizeTo100(rawCPU, ENGINE_GPU_MAX)
        : Math.round(Math.min((rawCPU / 40000) * 100, 100) * 100) / 100;

    // 3. Performance Score (0–100, GPU-weighted)
    const performanceScore = Math.round(Math.max(0, Math.min((0.7 * normGPU) + (0.3 * normCPU), 100)) * 100) / 100;

    // 4. Map Tier
    const tier = mapTier(performanceScore);

    // 5. Power
    console.log("CPU TDP:", buildInput.cpu?.tdp ?? buildInput.cpu?.tdpWatts);
    console.log("GPU TDP:", gpu?.tdp ?? gpu?.tdpWatts);
    const totalTDP = calculateTotalTDP({ ...buildInput, gpu });
    const recommendedPSU = calculateRecommendedPSU(totalTDP, tier);
    const providedPSUWattage = buildInput?.psu?.wattage || 0;
    const psuHeadroomPercentage = providedPSUWattage > 0
        ? ((providedPSUWattage - totalTDP) / providedPSUWattage) * 100
        : 0;

    // 6. Compatibility
    const compatibility = validateCompatibility(buildInput, recommendedPSU);

    // 7. Bottleneck — ratio-based using raw V1 scores
    const bottleneckRaw = calculateBottleneckFromScores(rawCPU, rawGPU);
    const bottleneck = {
        percentage: bottleneckRaw.percentage,
        severity: bottleneckRaw.severity,
        direction: bottleneckRaw.direction,
        affectedComponent:
            bottleneckRaw.direction === "GPU bottleneck" ? "GPU" :
                bottleneckRaw.direction === "CPU bottleneck" ? "CPU" : null,
    };

    // 8. Suggestions
    const gpuVram = buildInput?.gpu?.vram || 0;
    const ramCapacityGB = buildInput?.ram?.capacityGB || 0;
    const hasGpu = !!buildInput?.gpu;
    // Simple iGPU check: common for F-variant Intel or non-G AMD (simplified for this UI fix)
    const cpuHasIGPU = buildInput?.cpu ? !(buildInput.cpu.name?.toLowerCase().includes(' f ') || buildInput.cpu.name?.toLowerCase().endsWith('f')) : true;

    const suggestions = generateSuggestions({
        bottleneck,
        psuHeadroomPercentage,
        recommendedMinPSU: recommendedPSU,
        providedPSUWattage,
        performanceTier: tier,
        gpuVram,
        ramCapacityGB,
        hasGpu,
        cpuHasIGPU
    });

    // 9. Future Proof
    const futureProofScore = calculateFutureProofScore(buildInput, performanceScore);

    // 10. FPS
    const fps = estimateFPS(performanceScore);

    return {
        version: "1.3",
        plan,
        compatibility,
        metrics: {
            normalizedCPU: normCPU,
            normalizedGPU: normGPU,
            performanceScore,
            tier,
            futureProofScore
        },
        bottleneck,
        power: { totalTDP, recommendedPSU, providedWattage: providedPSUWattage },
        gaming: { fps },
        suggestions,
    };
}
