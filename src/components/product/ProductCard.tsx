"use client";
import Link from "next/link";
import { BaseProduct } from "@/lib/products/types";
import { formatINR } from "@/lib/utils/formatCurrency";
import { Cpu, Monitor, MemoryStick, Zap } from "lucide-react";


const CATEGORY_ICON: Record<string, React.ElementType> = {
    cpu: Cpu,
    gpu: Monitor,
    ram: MemoryStick,
    psu: Zap,
    motherboard: Cpu,
};

export default function ProductCard({
    product,
    category,
    highlightValue = false,
}: {
    product: BaseProduct;
    category: string;
    highlightValue?: boolean;
}) {
    const Icon = CATEGORY_ICON[category] ?? Monitor;

    const minPrice = product.pricing?.priceRange?.min ?? 0;
    const gamingScore = product.gamingScore ?? 0;
    const productivityScore = product.productivityScore ?? 0;

    // Value score: gaming points per ₹1000
    const valueScore = minPrice > 0 ? (gamingScore / minPrice) * 1000 : 0;
    // Bar width: scale so 1.0 = 100% visually — clamp to [0,100]
    const barWidth = Math.min(valueScore * 5, 100);

    const displayPrice = minPrice > 0 ? formatINR(minPrice) : "—";

    // Availability badge colour
    const avail = product.pricing?.availability?.toLowerCase() ?? "";
    const availColor =
        avail === "in stock" ? "text-green-400" :
            avail === "limited stock" ? "text-yellow-400" :
                "text-neutral-500";

    return (
        <Link
            href={`/products/${category}/${product.id}`}
            className="group block h-full"
        >
            <div className="h-full flex flex-col border border-neutral-800 bg-neutral-900/50 rounded-xl overflow-hidden hover:border-neutral-600 hover:shadow-lg hover:shadow-amber-500/10 transition-all duration-300 hover:-translate-y-1">
                <div className="p-5 flex flex-col flex-1 relative">
                    {/* Header */}
                    <div className="flex justify-between items-start mb-4">
                        <div className="flex items-start gap-2 min-w-0">
                            <Icon className="w-4 h-4 text-amber-500 mt-1 shrink-0" />
                            <div className="min-w-0">
                                <span className="text-xs font-semibold tracking-wider text-neutral-500 uppercase block">
                                    {product.brand}
                                </span>
                                <h3 className="text-base font-bold text-neutral-100 group-hover:text-amber-400 transition-colors leading-tight truncate">
                                    {product.name}
                                </h3>
                                {product.launchYear && (
                                    <span className="text-xs text-neutral-600">{product.launchYear}</span>
                                )}
                            </div>
                        </div>
                        {product.pricing?.availability && (
                            <span
                                className={`text-[10px] font-medium px-2 py-0.5 rounded border shrink-0 mt-0.5 ${avail === "in stock"
                                    ? "text-green-400 bg-green-500/10 border-green-500/20"
                                    : avail === "limited stock"
                                        ? "text-yellow-400 bg-yellow-500/10 border-yellow-500/20"
                                        : "text-neutral-500 bg-neutral-800 border-neutral-700"
                                    }`}
                            >
                                {product.pricing.availability}
                            </span>
                        )}
                    </div>

                    {/* Specs / Score pills */}
                    <div className="flex flex-wrap gap-2 mb-4">
                        {category === "storage" ? (
                            <>
                                <span className="inline-flex items-center gap-1 bg-neutral-800 text-neutral-300 text-xs font-semibold px-2.5 py-1 rounded-lg">
                                    {(product as any).type}
                                </span>
                                <span className="inline-flex items-center gap-1 bg-neutral-800 text-neutral-300 text-xs font-semibold px-2.5 py-1 rounded-lg">
                                    {(product as any).capacityGB}GB
                                </span>
                                {((product as any).pcieGen) ? (
                                    <span className="inline-flex items-center gap-1 bg-neutral-800 text-neutral-300 text-xs font-semibold px-2.5 py-1 rounded-lg">
                                        Gen {(product as any).pcieGen}
                                    </span>
                                ) : null}
                            </>
                        ) : category === "ram" ? (
                            <>
                                <span className="inline-flex items-center gap-1 bg-neutral-800 text-neutral-300 text-xs font-semibold px-2.5 py-1 rounded-lg">
                                    {(product as any).type}
                                </span>
                                <span className="inline-flex items-center gap-1 bg-neutral-800 text-neutral-300 text-xs font-semibold px-2.5 py-1 rounded-lg">
                                    {(product as any).capacityGB}GB
                                </span>
                                <span className="inline-flex items-center gap-1 bg-neutral-800 text-neutral-300 text-xs font-semibold px-2.5 py-1 rounded-lg">
                                    {(product as any).modules}x{((product as any).capacityGB ?? 0) / ((product as any).modules ?? 1)}GB
                                </span>
                                <span className="inline-flex items-center gap-1 bg-neutral-800 text-neutral-300 text-xs font-semibold px-2.5 py-1 rounded-lg">
                                    {(product as any).speedMHz}MHz
                                </span>
                            </>
                        ) : category === "psu" ? (
                            <>
                                <span className="inline-flex items-center gap-1 bg-neutral-800 text-neutral-300 text-xs font-semibold px-2.5 py-1 rounded-lg">
                                    {(product as any).wattage}W
                                </span>
                                <span className="inline-flex items-center gap-1 bg-neutral-800 text-neutral-300 text-xs font-semibold px-2.5 py-1 rounded-lg">
                                    {(product as any).efficiency}
                                </span>
                                <span className="inline-flex items-center gap-1 bg-neutral-800 text-neutral-300 text-xs font-semibold px-2.5 py-1 rounded-lg">
                                    {(product as any).modular} Modular
                                </span>
                            </>
                        ) : (
                            <>
                                <span className="inline-flex items-center gap-1 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold px-2.5 py-1 rounded-lg">
                                    🎮 {gamingScore.toLocaleString()}
                                </span>
                                {productivityScore > 0 && (
                                    <span className="inline-flex items-center gap-1 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold px-2.5 py-1 rounded-lg">
                                        ⚡ {productivityScore.toLocaleString()}
                                    </span>
                                )}
                                {(product.tdpWatts ?? 0) > 0 && (
                                    <span className="text-xs bg-neutral-800 px-2 py-1 rounded-lg text-neutral-400">
                                        {product.tdpWatts}W
                                    </span>
                                )}
                            </>
                        )}
                    </div>

                    {/* Price + value score */}
                    <div className="mt-auto border-t border-neutral-800/80 pt-4">
                        <div className="flex justify-between items-baseline mb-2">
                            <div>
                                <span className="text-xs text-neutral-500 uppercase mb-0.5 block">Street Price</span>
                                <span className="font-bold text-neutral-100 tabular-nums">{displayPrice}</span>
                            </div>
                            {category === "storage" && typeof (product as any).pricePerGB === 'number' && (
                                <div className="text-right">
                                    <span className="text-[10px] uppercase mb-0.5 block font-bold text-neutral-500">
                                        Value
                                    </span>
                                    <span className="text-sm font-bold text-neutral-400">
                                        ₹{((product as any).pricePerGB!).toFixed(2)}<span className="text-[10px] text-neutral-500">/GB</span>
                                    </span>
                                </div>
                            )}
                            {category !== "motherboard" && category !== "ram" && category !== "storage" && category !== "psu" && (
                                <div className={`text-right transition-colors ${highlightValue ? "bg-amber-500/10 p-2 -m-2 rounded-lg border border-amber-500/30" : ""}`}>
                                    <span className={`text-[10px] uppercase mb-0.5 block font-bold ${highlightValue ? "text-amber-500" : "text-neutral-500"}`}>
                                        {highlightValue ? "✨ Best Value" : "Value"}
                                    </span>
                                    <span className={`text-sm font-bold ${highlightValue ? "text-amber-400 drop-shadow-[0_0_12px_rgba(251,191,36,0.6)]" : "text-amber-500"}`}>
                                        {valueScore.toFixed(2)} <span className={`text-[10px] ${highlightValue ? "text-amber-500/70" : "text-neutral-500"}`}>pts/₹k</span>
                                    </span>
                                </div>
                            )}
                        </div>
                        {/* Value bar */}
                        {category !== "motherboard" && category !== "ram" && category !== "storage" && category !== "psu" && (
                            <div className="w-full bg-neutral-800 h-1.5 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-amber-500 rounded-full transition-all"
                                    style={{ width: `${barWidth}%` }}
                                />
                            </div>
                        )}
                        {product.pricing?.availability && (
                            <span className={`text-[10px] mt-1 block ${availColor}`}>
                                {product.pricing.availability}
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </Link>
    );
}
