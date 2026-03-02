// src/lib/engine/marketTiming.ts
// Static heuristic model for "Best Time to Build" recommendations.
// Future hook: replace with real API data (historical prices, release calendars).

import { BuildInput } from "./compatibility";

export interface MarketTimingResult {
    buyNowScore: number;         // 0–100 (higher = buy now)
    recommendation: "Buy Now" | "Wait 1–2 Months" | "Wait 2–3 Months";
    reasons: string[];
}

/**
 * Heuristic market timing engine.
 * Analyzes GPU pricing vs MSRP, CPU generation proximity, and seasonal patterns.
 */
export function calculateMarketTiming(buildInput: BuildInput): MarketTimingResult {
    let score = 70; // Default: moderately good time
    const reasons: string[] = [];

    // --- GPU Price vs MSRP Analysis ---
    const gpu = buildInput?.gpu;
    if (gpu?.pricing?.priceRange?.min && gpu?.msrpUSD) {
        // Rough INR-to-USD conversion for comparison (1 USD ≈ 85 INR)
        const currentPriceUSD = gpu.pricing.priceRange.min / 85;
        const msrp = gpu.msrpUSD;
        const ratio = currentPriceUSD / msrp;

        if (ratio <= 1.0) {
            score += 15;
            reasons.push("GPU is priced at or below MSRP — excellent value.");
        } else if (ratio <= 1.15) {
            score += 5;
            reasons.push("GPU pricing is within 15% of MSRP — reasonable.");
        } else if (ratio <= 1.3) {
            score -= 5;
            reasons.push("GPU is priced 15–30% above MSRP — consider waiting for price drops.");
        } else {
            score -= 15;
            reasons.push("GPU is significantly overpriced vs MSRP — prices may normalize soon.");
        }
    }

    // --- CPU Generation Analysis ---
    const cpu = buildInput?.cpu;
    if (cpu?.launchYear) {
        const currentYear = new Date().getFullYear();
        const age = currentYear - cpu.launchYear;

        if (age <= 1) {
            score += 10;
            reasons.push("CPU is current generation — no immediate successor expected.");
        } else if (age === 2) {
            score += 0;
            reasons.push("CPU is last-gen — next generation may offer better value soon.");
        } else {
            score -= 10;
            reasons.push("CPU is 2+ generations old — newer options may provide significantly better performance per dollar.");
        }
    }

    // --- Seasonal Heuristic ---
    const month = new Date().getMonth(); // 0-indexed
    if (month >= 10 || month === 0) {
        // Nov–Jan: Holiday sales
        score += 10;
        reasons.push("Holiday sale season — historically the best time for deals.");
    } else if (month >= 5 && month <= 7) {
        // Jun–Aug: Mid-year lull / pre-launch waiting
        score -= 5;
        reasons.push("Mid-year period — new product announcements often happen in Q3.");
    }

    // Clamp
    score = Math.max(0, Math.min(100, score));

    // Determine recommendation
    let recommendation: MarketTimingResult["recommendation"];
    if (score >= 70) recommendation = "Buy Now";
    else if (score >= 45) recommendation = "Wait 1–2 Months";
    else recommendation = "Wait 2–3 Months";

    return { buyNowScore: score, recommendation, reasons };
}
