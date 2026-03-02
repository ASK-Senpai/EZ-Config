"use client";
import Link from "next/link";
import { MotherboardProduct } from "@/lib/products/types";
import { formatINR } from "@/lib/analytics/market";
import { Cpu, Wifi, MemoryStick, Layers } from "lucide-react";

export default function MotherboardCard({
    product,
}: {
    product: MotherboardProduct;
}) {
    const minPrice = product.pricing?.priceRange?.min ?? 0;
    const displayPrice = minPrice > 0 ? formatINR(minPrice) : "—";

    const avail = product.pricing?.availability?.toLowerCase() ?? "";
    const availColor =
        avail === "in stock" ? "text-green-400" :
            avail === "limited stock" ? "text-yellow-400" :
                "text-neutral-500";

    const chipsetTierColors: Record<string, string> = {
        entry: "text-neutral-400 bg-neutral-800 border-neutral-700",
        mid: "text-blue-400 bg-blue-500/10 border-blue-500/20",
        high: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    };

    const tierBadge = chipsetTierColors[product.chipset?.tier ?? "entry"] || chipsetTierColors.entry;

    return (
        <Link
            href={`/products/motherboard/${product.id}`}
            className="group block h-full"
        >
            <div className="h-full flex flex-col border border-neutral-800 bg-neutral-900/50 rounded-xl overflow-hidden hover:border-neutral-600 hover:shadow-lg hover:shadow-cyan-500/10 transition-all duration-300 hover:-translate-y-1">
                <div className="p-5 flex flex-col flex-1 relative">
                    {/* Header */}
                    <div className="flex justify-between items-start mb-4">
                        <div className="flex items-start gap-2 min-w-0">
                            <Layers className="w-4 h-4 text-cyan-500 mt-1 shrink-0" />
                            <div className="min-w-0">
                                <span className="text-xs font-semibold tracking-wider text-neutral-500 uppercase block">
                                    {product.brand}
                                </span>
                                <h3 className="text-base font-bold text-neutral-100 group-hover:text-cyan-400 transition-colors leading-tight truncate">
                                    {product.name}
                                </h3>
                                {product.formFactor && (
                                    <span className="text-xs text-neutral-600">{product.formFactor}</span>
                                )}
                            </div>
                        </div>
                        {product.legacy && (
                            <span className="text-[10px] font-medium px-2 py-0.5 rounded border shrink-0 mt-0.5 text-neutral-500 bg-neutral-800 border-neutral-700">
                                Legacy
                            </span>
                        )}
                    </div>

                    {/* Specifications */}
                    <div className="flex flex-wrap gap-2 mb-4">
                        <span className="inline-flex items-center gap-1 bg-neutral-800 border border-neutral-700 text-neutral-300 text-xs font-semibold px-2.5 py-1 rounded-lg">
                            <Cpu className="w-3 h-3" /> {product.socket}
                        </span>
                        {product.chipset && (
                            <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg border ${tierBadge}`}>
                                {product.chipset.name}
                            </span>
                        )}
                        <span className="inline-flex items-center gap-1 bg-neutral-800 border border-neutral-700 text-neutral-300 text-xs font-semibold px-2.5 py-1 rounded-lg">
                            <MemoryStick className="w-3 h-3" /> {product.memoryType}
                        </span>
                        {product.wifi && (
                            <span className="inline-flex items-center gap-1 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold px-2.5 py-1 rounded-lg">
                                <Wifi className="w-3 h-3" /> Wi-Fi
                            </span>
                        )}
                    </div>

                    {/* Price */}
                    <div className="mt-auto pt-4 border-t border-neutral-800 flex justify-between items-center">
                        <div className="flex flex-col">
                            <span className="text-xs text-neutral-500 font-medium">Street Price</span>
                            <span className="text-xl font-bold tracking-tight text-white group-hover:text-cyan-400 transition-colors">
                                {displayPrice}
                            </span>
                        </div>
                        {product.pricing?.availability && (
                            <span className={`text-[10px] font-medium px-2.5 py-1 rounded-full border ${avail === 'in stock' ? 'text-green-400 bg-green-500/10 border-green-500/20' : 'text-neutral-400 bg-neutral-800 border-neutral-700'}`}>
                                {product.pricing.availability}
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </Link>
    );
}
