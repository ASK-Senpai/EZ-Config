import { getMinPrice, isLegacy } from "../utils/pricingV2";

export interface MarketAnalytics {
    markupPercent: number;
    ratio: number;
    convertedMsrpINR: number;
    status: "under_msrp" | "fair" | "overpriced" | "extreme" | "unknown";
}

const USD_TO_INR = 83; // Single conversion constant — never convert elsewhere

/**
 * Formats a number as Indian Rupees using Intl.NumberFormat.
 * Always use this — never hardcode ₹ or $ symbols.
 */
export function formatINR(value: number): string {
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
    }).format(value);
}



/**
 * Calculates the markup percentage of a component natively by comparing its
 * street price (pricing.priceRange.min) against its static launch MSRP in USD.
 */
export function calculateMarkup(component: any): { markupPercent: number, ratio: number, convertedMsrpINR: number } {
    const msrpUSD = Number(component?.msrpUSD || 0);
    const convertedMsrpINR = msrpUSD * USD_TO_INR;

    // If there's no MSRP recorded natively or the component is a legacy drop, return neutral flags
    if (convertedMsrpINR === 0 || isLegacy(component)) {
        return { markupPercent: 0, ratio: 0, convertedMsrpINR };
    }

    const currentPrice = getMinPrice(component);
    if (currentPrice === 0) {
        return { markupPercent: 0, ratio: 0, convertedMsrpINR };
    }

    const markupPercent = ((currentPrice - convertedMsrpINR) / convertedMsrpINR) * 100;
    const ratio = currentPrice / convertedMsrpINR;

    return { markupPercent, ratio, convertedMsrpINR };
}

/**
 * Classifies the mathematical markup percent into distinct market health statuses.
 * @param markupPercent The float percentage output of calculateMarkup()
 */
export function classifyMarketStatus(markupPercent: number): MarketAnalytics["status"] {
    if (markupPercent < 0) return "under_msrp";
    if (markupPercent >= 0 && markupPercent <= 15) return "fair";
    if (markupPercent > 15 && markupPercent <= 35) return "overpriced";
    if (markupPercent > 35) return "extreme";

    return "unknown"; // Fallback for 0-edges on legacy cards
}

/**
 * High-level orchestration wrapper that builds the final unified Analytics JSON
 * consumed purely by the Frontend (Compare, Insights, Dashboard).
 */
export function getMarketAnalytics(component: any): MarketAnalytics {
    const { markupPercent, ratio, convertedMsrpINR } = calculateMarkup(component);

    // If conversion is missing or it's a legacy component without a price, status is unknown.
    if (convertedMsrpINR === 0 || isLegacy(component)) {
        return {
            markupPercent: 0,
            ratio: 0,
            convertedMsrpINR,
            status: "unknown"
        };
    }

    const status = classifyMarketStatus(markupPercent);

    return {
        markupPercent,
        ratio,
        convertedMsrpINR,
        status
    };
}
