"use client";

/**
 * MarketIntelligencePanel.tsx
 * Renders only when categoryConfig.hasPricing === true.
 * Pricing source: selectedSkuPricing ?? product.pricing (canonical fallback).
 * vGPU renders nothing — controlled by parent via hasPricing flag.
 */

import { TrendingUp, Info, AlertTriangle, CheckCircle } from "lucide-react";
import { getMarketAnalytics } from "@/lib/analytics/market";
import { getDisplayPrice } from "@/lib/utils/pricingV2";
import MarketBadge from "@/components/products/MarketBadge";
import type { PricingV2 } from "@/lib/products/types";

interface MarketIntelligencePanelProps {
    product: any;
    /** Overrides product-level pricing with SKU-level pricing when selected */
    skuPricing?: PricingV2 | null;
}

function getRecommendation(markupPercent: number, status: string) {
    if (status === "unknown") {
        return { Icon: Info, color: "text-neutral-500", title: "No Pricing Data", msg: "No pricing data is available for this product." };
    }
    if (markupPercent > 35) {
        return { Icon: AlertTriangle, color: "text-red-400", title: "Extremely Overpriced — Avoid", msg: "Severely marked up above baseline MSRP. Avoid unless strictly necessary." };
    }
    if (markupPercent > 15) {
        return { Icon: Info, color: "text-amber-500", title: "Buy if Urgent", msg: "Mildly overpriced. Safe to buy urgently, but waiting for sales is recommended." };
    }
    if (markupPercent >= 0) {
        return { Icon: CheckCircle, color: "text-blue-400", title: "Good Buy", msg: "Circulating at expected market value. Safe purchase." };
    }
    return { Icon: CheckCircle, color: "text-emerald-400", title: "Excellent Deal", msg: "Currently under expected launch value. Highly recommended." };
}

export default function MarketIntelligencePanel({ product, skuPricing }: MarketIntelligencePanelProps) {
    // Use SKU-level pricing if provided, else fall back to product-level pricing
    const effectiveProduct = skuPricing
        ? { ...product, pricing: skuPricing }
        : product;

    const analytics = getMarketAnalytics(effectiveProduct);
    const displayPrice = getDisplayPrice(effectiveProduct);
    const { Icon, color, title, msg } = getRecommendation(analytics.markupPercent, analytics.status);

    return (
        <div className="p-6 bg-gradient-to-b from-neutral-900 to-black border border-neutral-800/80 rounded-2xl shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                <TrendingUp className="w-24 h-24" />
            </div>

            <h2 className="text-lg font-bold mb-6 text-neutral-100 relative z-10">Market Intelligence</h2>

            <div className="space-y-4 relative z-10">
                <div className="flex justify-between items-center border-b border-neutral-800 pb-3">
                    <span className="text-neutral-400">Current Street Price</span>
                    <span className="font-bold text-lg text-white">{displayPrice}</span>
                </div>

                <div className="flex justify-between items-center border-b border-neutral-800 pb-3">
                    <span className="text-neutral-400">Status Array</span>
                    <MarketBadge status={analytics.status} />
                </div>

                {analytics.convertedMsrpINR > 0 && (
                    <>
                        <div className="flex justify-between items-center border-b border-neutral-800 pb-3">
                            <span className="text-neutral-400 text-sm">Converted MSRP (USD × 83)</span>
                            <span className="font-medium text-sm text-neutral-300">
                                ₹{analytics.convertedMsrpINR.toLocaleString("en-IN")}
                            </span>
                        </div>
                        <div className="flex justify-between items-center pb-2">
                            <span className="text-neutral-400 text-sm">Markup Over Logic</span>
                            <span className={`font-bold text-sm ${analytics.markupPercent > 15 ? "text-red-400" : "text-emerald-400"}`}>
                                {analytics.markupPercent > 0 ? "+" : ""}{analytics.markupPercent.toFixed(1)}%
                            </span>
                        </div>
                    </>
                )}
            </div>

            {/* Buy Recommendation */}
            <div className="mt-6 relative z-10">
                <div className="p-4 rounded-lg bg-neutral-950 border border-neutral-800 flex items-start gap-4">
                    <div className={`mt-0.5 ${color}`}><Icon className="w-5 h-5" /></div>
                    <div>
                        <h4 className={`font-bold ${color} mb-1`}>{title}</h4>
                        <p className="text-sm text-neutral-400 leading-relaxed">{msg}</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
