"use client";

/**
 * PerformanceCard.tsx
 * Unified performance display — works for gpu / cpu / vgpu.
 * No category-specific logic. Reads only from product.normalized.
 */

import { getPerformanceTier, TIER_DISPLAY } from "@/lib/utils/performanceTier";

interface PerformanceCardProps {
    normalized: { gamingScore: number; productivityScore: number } | undefined;
    scoreVersion?: number;
    /** anchor = max reference score (RTX 4090 = 1000 in V1) */
    anchor?: number;
}

export default function PerformanceCard({ normalized, scoreVersion, anchor = 1000 }: PerformanceCardProps) {
    const gaming = normalized?.gamingScore ?? 0;
    const productivity = normalized?.productivityScore ?? 0;
    const isV1 = (scoreVersion ?? 0) >= 1;

    const gamingTier = getPerformanceTier(gaming);
    const { label: tierLabel, color: tierColor } = TIER_DISPLAY[gamingTier];

    const gamingPct = Math.min((gaming / anchor) * 100, 100);
    const productivityPct = Math.min((productivity / anchor) * 100, 100);

    return (
        <div className="p-5 bg-neutral-900 border border-neutral-800 rounded-xl space-y-5">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-neutral-300 uppercase tracking-wider">
                    Performance
                </h3>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${tierColor}`}>
                    {tierLabel}
                </span>
            </div>

            {/* Gaming Score */}
            <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                    <span className="text-xs text-neutral-500 uppercase tracking-wide">Gaming</span>
                    <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-amber-400">{gaming.toLocaleString()}</span>
                        {isV1 && <span className="text-[10px] text-amber-500/50 font-medium">V1</span>}
                    </div>
                </div>
                <div className="h-2 w-full bg-neutral-800 rounded-full overflow-hidden">
                    <div
                        className="h-full rounded-full bg-gradient-to-r from-amber-600 to-amber-400 transition-all duration-500"
                        style={{ width: `${gamingPct}%` }}
                    />
                </div>
                <p className="text-[11px] text-neutral-600">{gamingPct.toFixed(1)}% of anchor ({anchor})</p>
            </div>

            {/* Productivity Score */}
            <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                    <span className="text-xs text-neutral-500 uppercase tracking-wide">Productivity</span>
                    <span className="text-base font-semibold text-blue-400">{productivity.toLocaleString()}</span>
                </div>
                <div className="h-1.5 w-full bg-neutral-800 rounded-full overflow-hidden">
                    <div
                        className="h-full rounded-full bg-gradient-to-r from-blue-700 to-blue-400 transition-all duration-500"
                        style={{ width: `${productivityPct}%` }}
                    />
                </div>
            </div>
        </div>
    );
}
