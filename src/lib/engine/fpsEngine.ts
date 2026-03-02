// src/lib/engine/fpsEngine.ts
// Enhanced FPS Estimation Engine — 4 resolutions × 3 quality tiers
// Uses GPU gaming score as base, scales by resolution & CPU bottleneck factor

export interface FPSEstimate {
    low: number;
    medium: number;
    high: number;
}

export interface DetailedFPS {
    "720p": FPSEstimate;
    "1080p": FPSEstimate;
    "1440p": FPSEstimate;
    "4K": FPSEstimate;
}

// Resolution multipliers relative to 1080p High baseline
const RESOLUTION_SCALE: Record<string, number> = {
    "720p": 1.35,
    "1080p": 1.00,
    "1440p": 0.75,
    "4K": 0.45,
};

// Quality multipliers relative to High
const QUALITY_SCALE: Record<string, number> = {
    low: 1.50,
    medium: 1.20,
    high: 1.00,
};

/**
 * Convert a V1 gaming score (0–1000 scale, RTX 4090 = 1000) to a 1080p High FPS baseline.
 * RTX 4090 ≈ 160 FPS @ 1080p High in AAA titles. Linear scale.
 */
function scoreToBaseFPS(gpuGamingScore: number): number {
    const RTX_4090_SCORE = 1000;
    const RTX_4090_1080P_HIGH = 160;
    return (gpuGamingScore / RTX_4090_SCORE) * RTX_4090_1080P_HIGH;
}

/**
 * CPU bottleneck scaling — if CPU is significantly weaker than GPU,
 * it limits the achievable FPS. This is most noticeable at lower resolutions.
 */
function cpuScalingFactor(cpuScore: number, gpuScore: number, resolution: string): number {
    if (cpuScore <= 0 || gpuScore <= 0) return 1;

    const ratio = cpuScore / gpuScore;

    // At 4K, CPU matters less. At 720p, CPU matters most.
    const cpuWeight: Record<string, number> = {
        "720p": 0.40,
        "1080p": 0.30,
        "1440p": 0.20,
        "4K": 0.10,
    };

    const weight = cpuWeight[resolution] ?? 0.25;

    if (ratio >= 1.0) return 1; // CPU is not the bottleneck
    // Scale down proportionally to how weak the CPU is
    return 1 - (weight * (1 - ratio));
}

/**
 * Main FPS estimation function.
 * @param gpuGamingScore - V1 normalized gaming score (0–1000)
 * @param cpuGamingScore - V1 normalized gaming score (0–1000)
 * @returns DetailedFPS with all resolutions and quality tiers
 */
export function estimateDetailedFPS(gpuGamingScore: number, cpuGamingScore: number): DetailedFPS {
    const baseFPS = scoreToBaseFPS(gpuGamingScore);

    const result: any = {};

    for (const [resolution, resScale] of Object.entries(RESOLUTION_SCALE)) {
        const cpuFactor = cpuScalingFactor(cpuGamingScore, gpuGamingScore, resolution);

        const estimate: FPSEstimate = {
            low: Math.round(baseFPS * resScale * QUALITY_SCALE.low * cpuFactor),
            medium: Math.round(baseFPS * resScale * QUALITY_SCALE.medium * cpuFactor),
            high: Math.round(baseFPS * resScale * QUALITY_SCALE.high * cpuFactor),
        };

        result[resolution] = estimate;
    }

    return result as DetailedFPS;
}

/**
 * Format FPS for display: "120+ FPS" or "45–55 FPS" with ±10% range.
 */
export function formatFPSRange(fps: number): string {
    if (fps <= 0) return "N/A";
    const lower = Math.round(fps * 0.90);
    const upper = Math.round(fps * 1.10);
    return `${lower}–${upper}`;
}
