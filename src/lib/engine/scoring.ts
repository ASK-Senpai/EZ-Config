/**
 * src/lib/engine/scoring.ts
 * Central scoring accessors for the V1 universe.
 * RTX 4090 anchor = 1000. All scores are relative.
 *
 * STRICT MODE: No legacy fallbacks. Missing normalized data is an error.
 */

const RTX_4090_GAMING_SCORE = 1000;

/** Get the gaming score. Throws if component is not V1 normalized. */
export function getGamingScore(component: any): number {
    if (!component?.normalized || component?.scoreVersion !== 1) {
        throw new Error(
            `Component "${component?.id ?? "unknown"}" is not V1 normalized. Inject normalized scores before use.`
        );
    }
    return component.normalized.gamingScore;
}

/** Get the productivity score. Throws if component is not V1 normalized. */
export function getProductivityScore(component: any): number {
    if (!component?.normalized || component?.scoreVersion !== 1) {
        throw new Error(
            `Component "${component?.id ?? "unknown"}" is not V1 normalized. Inject normalized scores before use.`
        );
    }
    return component.normalized.productivityScore;
}

/** 
 * Safe version of getGamingScore for UI components where we don't want to crash.
 * Returns 0 if not V1 normalized.
 */
export function getGamingScoreSafe(component: any): number {
    if (!component?.normalized || component?.scoreVersion !== 1) return 0;
    return component.normalized.gamingScore;
}

/** Safe version of getProductivityScore. Returns 0 if not V1 normalized. */
export function getProductivityScoreSafe(component: any): number {
    if (!component?.normalized || component?.scoreVersion !== 1) return 0;
    return component.normalized.productivityScore;
}

/**
 * GPU relative performance vs RTX 4090 (0–100+%)
 * Uses safe accessor — returns 0 if not V1 normalized.
 */
export function getRelativeScore(component: any): number {
    const score = getGamingScoreSafe(component);
    return Math.round((score / RTX_4090_GAMING_SCORE) * 1000) / 10;
}

/**
 * Value score: gaming performance per unit of price.
 * Higher is better.
 * ONLY uses pricing.priceRange.min — never msrpUSD or currentPrice.
 */
export function getValueScore(component: any): number {
    const score = getGamingScoreSafe(component);
    const price = component?.pricing?.priceRange?.min;
    if (!price || price <= 0) return 0;
    return score / price;
}


/**
 * Bottleneck ratio between GPU and CPU.
 * Ratio rules:
 *   0.9 – 1.1  → balanced
 *   > 1.1      → CPU bottleneck (CPU is limiting GPU)
 *   < 0.9      → GPU bottleneck (GPU is the weaker link)
 */
export interface BottleneckResult {
    ratio: number;
    direction: "balanced" | "CPU bottleneck" | "GPU bottleneck";
    severity: "low" | "moderate" | "high";
    percentage: number;
}

export function calculateBottleneckFromScores(cpuScore: number, gpuScore: number): BottleneckResult {
    if (cpuScore <= 0) {
        return { ratio: 0, direction: "GPU bottleneck", severity: "high", percentage: 100 };
    }

    const ratio = gpuScore / cpuScore;
    const deviation = Math.abs(ratio - 1) * 100;
    const percentage = Math.min(Math.round(deviation * 10) / 10, 100);

    let direction: BottleneckResult["direction"] = "balanced";
    if (ratio > 1.1) direction = "CPU bottleneck";
    else if (ratio < 0.9) direction = "GPU bottleneck";

    let severity: BottleneckResult["severity"] = "low";
    if (deviation >= 25) severity = "high";
    else if (deviation >= 10) severity = "moderate";

    return { ratio, direction, severity, percentage };
}
