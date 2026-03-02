// src/lib/engine/performance.ts

export const MAX_CPU_SCORE = 40000;
export const MAX_GPU_SCORE = 35000;

export function normalizeCPU(score: number): number {
    const normalized = (score / MAX_CPU_SCORE) * 100;
    return Math.round(Math.min(normalized, 100) * 100) / 100;
}

export function normalizeGPU(score: number): number {
    const normalized = (score / MAX_GPU_SCORE) * 100;
    return Math.round(Math.min(normalized, 100) * 100) / 100;
}

export function calculatePerformanceScore(normalizedCPU: number, normalizedGPU: number): number {
    const score = (0.7 * normalizedGPU) + (0.3 * normalizedCPU);
    return Math.round(Math.max(0, Math.min(score, 100)) * 100) / 100;
}

export function mapTier(score: number): string {
    if (score < 30) return "Entry";
    if (score < 60) return "Mid";
    if (score < 80) return "High";
    return "Enthusiast";
}

export function estimateFPS(score: number) {
    const fps1080 = score * 1.5;
    const fps1440 = score * 1.0;
    const fps4k = score * 0.65;

    const formatRange = (val: number) => {
        const lower = Math.round(val * 0.9);
        const upper = Math.round(val * 1.1);
        return `${lower}-${upper} FPS`;
    };

    return {
        "1080p": formatRange(fps1080),
        "1440p": formatRange(fps1440),
        "4K": formatRange(fps4k)
    };
}

export function calculateFutureProofScore(buildInput: any, performanceScore: number): number {
    // A simplified future-proof score based on VRAM, Tier, and base performance score logic
    let score = performanceScore;

    // Add bonuses based on GPU VRAM if available
    const vram = buildInput?.gpu?.vram || 8;
    if (vram >= 16) score += 10;
    else if (vram >= 12) score += 5;

    // Add bonus if tier is High or Enthusiast
    const tier = mapTier(performanceScore);
    if (tier === "Enthusiast") score += 10;
    else if (tier === "High") score += 5;

    // Penalty for Entry tier
    if (tier === "Entry") score -= 10;

    return Math.round(Math.max(0, Math.min(score, 100)));
}
