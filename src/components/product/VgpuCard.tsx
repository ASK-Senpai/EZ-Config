"use client";
import Link from "next/link";
import { BaseProduct } from "@/lib/products/types";
import { Cpu, Monitor, MemoryStick, Zap } from "lucide-react";
import { getPerformanceTier } from "@/lib/utils/performanceTier";

export default function VgpuCard({
    product,
}: {
    product: BaseProduct;
}) {
    const gamingScore = product.normalized?.gamingScore ?? product.gamingScore ?? 0;
    const productivityScore = product.normalized?.productivityScore ?? product.productivityScore ?? 0;

    // Get tier assignment dynamically, strictly for VGPU to align with standard tiers
    const tier = getPerformanceTier(gamingScore);

    return (
        <Link
            href={`/products/vgpu/${product.id}`}
            className="group block h-full"
        >
            <div className="h-full flex flex-col border border-neutral-800 bg-neutral-900/50 rounded-xl overflow-hidden hover:border-neutral-600 hover:shadow-lg hover:shadow-cyan-500/10 transition-all duration-300 hover:-translate-y-1">
                <div className="p-5 flex flex-col flex-1 relative">
                    {/* Header */}
                    <div className="flex justify-between items-start mb-4">
                        <div className="flex items-start gap-2 min-w-0">
                            <Monitor className="w-4 h-4 text-cyan-500 mt-1 shrink-0" />
                            <div className="min-w-0">
                                <span className="text-xs font-semibold tracking-wider text-neutral-500 uppercase block">
                                    {product.brand}
                                </span>
                                <h3 className="text-base font-bold text-neutral-100 group-hover:text-cyan-400 transition-colors leading-tight truncate">
                                    {product.name}
                                </h3>
                                {product.launchYear && (
                                    <span className="text-xs text-neutral-600">{product.launchYear} Architecture</span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Score pills */}
                    <div className="flex flex-wrap gap-2 mb-4">
                        <span className="inline-flex items-center gap-1 bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-semibold px-2.5 py-1 rounded-lg">
                            🎮 {gamingScore.toLocaleString()}
                        </span>
                        {productivityScore > 0 && (
                            <span className="inline-flex items-center gap-1 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold px-2.5 py-1 rounded-lg">
                                ⚡ {productivityScore.toLocaleString()}
                            </span>
                        )}
                        {/* No TDP for integrated graphics as it shares package power */}
                    </div>

                    {/* Architecture / Abstract representation instead of price */}
                    <div className="mt-auto border-t border-neutral-800/80 pt-4">
                        <div className="flex justify-between items-baseline mb-2">
                            <div>
                                <span className="text-xs text-neutral-500 uppercase mb-0.5 block">Performance Class</span>
                                <span className="font-bold text-neutral-100 capitalize">{tier}</span>
                            </div>
                            <div className="text-right">
                                <span className="text-xs text-neutral-500 uppercase mb-0.5 block">Entity Type</span>
                                <span className="text-sm font-medium text-cyan-500">
                                    Integrated GPU
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </Link>
    );
}
