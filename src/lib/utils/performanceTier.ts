/**
 * performanceTier.ts
 * Shared utility — maps a 0–1000 normalized score to a human-readable tier.
 * Anchored to the V1 calibration scale (RTX 4090 = 1000).
 *
 * Reusable across:
 *  - CPU page
 *  - GPU page
 *  - vGPU page
 *  - Builder summary
 *  - Insights page
 */

export type PerformanceTier =
    | "entry"
    | "low-mid"
    | "mid"
    | "high"
    | "enthusiast";

/**
 * Map a raw normalized score (0–1000 anchor) to a performance tier string.
 * Boundaries are inclusive at the lower end.
 */
export function getPerformanceTier(score: number): PerformanceTier {
    if (score < 150) return "entry";
    if (score < 350) return "low-mid";
    if (score < 600) return "mid";
    if (score < 850) return "high";
    return "enthusiast";
}

/**
 * Display labels and colors for each tier.
 * Use in UI components for consistent badge rendering.
 */
export const TIER_DISPLAY: Record<PerformanceTier, { label: string; color: string }> = {
    entry: { label: "Entry", color: "text-slate-400 bg-slate-500/10 border-slate-500/20" },
    "low-mid": { label: "Low-Mid", color: "text-blue-400 bg-blue-500/10 border-blue-500/20" },
    mid: { label: "Mid", color: "text-green-400 bg-green-500/10 border-green-500/20" },
    high: { label: "High", color: "text-amber-400 bg-amber-500/10 border-amber-500/20" },
    enthusiast: { label: "Enthusiast", color: "text-purple-400 bg-purple-500/10 border-purple-500/20" },
};
