"use client";

/**
 * ProductDetailClient.tsx
 * Client-side state manager for the universal product detail page.
 * Owns selectedSku state and passes it down to all panels.
 */

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, Cpu } from "lucide-react";
import type { BaseProduct, CpuSku } from "@/lib/products/types";
import { getCategoryConfig } from "@/config/categoryConfig";
import { getRelativeScore, getValueScore } from "@/lib/engine/scoring";

import PerformanceCard from "@/components/product/PerformanceCard";
import ProductSkuSelector from "@/components/product/ProductSkuSelector";
import MarketIntelligencePanel from "@/components/product/MarketIntelligencePanel";
import IgpuInfoPanel from "@/components/product/IgpuInfoPanel";

import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

interface ProductDetailClientProps {
    product: BaseProduct;
    category: string;
    relatedCpus?: BaseProduct[];
    // config is NOT passed as prop — format functions cannot cross server→client boundary
}

/** Resolve a dot-path field from an object (e.g. "normalized.gamingScore") */
function resolveField(obj: any, key: string): any {
    return key.split(".").reduce((acc, k) => acc?.[k], obj);
}

export default function ProductDetailClient({ product, category, relatedCpus }: ProductDetailClientProps) {
    // Resolve config client-side — getCategoryConfig returns format functions
    // which cannot be serialized across the server→client boundary
    const config = getCategoryConfig(category);
    const availableSkus: CpuSku[] = (product as any).availableSkus ?? [];
    const [selectedSku, setSelectedSku] = useState<CpuSku | null>(
        availableSkus.length > 0 ? availableSkus[0] : null
    );

    const showSkuSelector = config.hasSku && availableSkus.length > 1;
    const skuPricing = selectedSku?.pricing ?? null;

    const relativeVs4090 = getRelativeScore(product);
    const valueScore = getValueScore(product);

    return (
        <div className="w-full max-w-7xl mx-auto px-4 py-8">

            {/* Breadcrumb */}
            <Breadcrumb className="mb-8">
                <BreadcrumbList>
                    <BreadcrumbItem>
                        <BreadcrumbLink href="/">Home</BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                        <BreadcrumbLink href="/products">Products</BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                        <BreadcrumbLink href={`/products/${category}`}>
                            {config.label}
                        </BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                        <BreadcrumbPage className={`${config.accentColor} font-medium`}>
                            {product.name}
                        </BreadcrumbPage>
                    </BreadcrumbItem>
                </BreadcrumbList>
            </Breadcrumb>

            {/* Header */}
            <div className="flex justify-between items-start mb-8 border-b border-neutral-800 pb-6">
                <div>
                    <span className={`${config.accentColor} font-bold tracking-widest uppercase text-sm mb-2 block`}>
                        {product.brand}
                    </span>
                    <h1 className="text-4xl lg:text-5xl font-extrabold tracking-tight text-white mb-4">
                        {product.name}
                    </h1>
                    <div className="flex flex-wrap gap-2 text-sm">
                        {product.launchYear && (
                            <span className="px-3 py-1 bg-neutral-900 border border-neutral-700 rounded-md text-neutral-300">
                                {product.launchYear}
                            </span>
                        )}
                        {product.legacy && (
                            <span className="px-3 py-1 bg-neutral-900 border border-amber-900/50 rounded-md text-amber-600/70 text-xs">
                                Legacy
                            </span>
                        )}
                        {(product as any).socket && (
                            <span className={`px-3 py-1 bg-neutral-900 border border-neutral-700 rounded-md ${config.accentColor}/80`}>
                                Socket {(product as any).socket}
                            </span>
                        )}
                        {(product as any).vramGB && (
                            <span className="px-3 py-1 bg-neutral-900 border border-neutral-700 rounded-md text-amber-500/80">
                                {(product as any).vramGB}GB {(product as any).memoryType}
                            </span>
                        )}
                    </div>
                </div>

                <Link
                    href={`/products/${category}`}
                    className="hidden md:flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-300 transition-colors"
                >
                    <ChevronLeft className="w-4 h-4" /> Back to {config.label}
                </Link>
            </div>

            {/* Main grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-16">

                {/* LEFT: Spec grid + Performance */}
                <div className="lg:col-span-2 space-y-6">

                    {/* SKU Selector */}
                    {showSkuSelector && selectedSku && (
                        <ProductSkuSelector
                            skus={availableSkus}
                            selectedSku={selectedSku}
                            onSelect={setSelectedSku}
                        />
                    )}

                    {/* Spec fields from categoryConfig */}
                    {config.specFields.length > 0 && (
                        <section>
                            <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-neutral-200">
                                Specifications
                            </h2>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                {config.specFields.map((field) => {
                                    const rawVal = resolveField(product, field.key);
                                    const display = field.format ? field.format(rawVal) : (rawVal ?? "—");
                                    return (
                                        <div key={field.key} className="p-4 bg-neutral-900 rounded-lg border border-neutral-800">
                                            <span className="block text-xs text-neutral-500 uppercase mb-1 tracking-wide">
                                                {field.label}
                                            </span>
                                            <span className="block font-medium text-neutral-200">{String(display)}</span>
                                        </div>
                                    );
                                })}

                                {/* Value score (only when pricing exists) */}
                                {valueScore > 0 && (
                                    <div className="p-4 bg-neutral-900 rounded-lg border border-neutral-800">
                                        <span className="block text-xs text-neutral-500 uppercase mb-1 tracking-wide">
                                            Value Score
                                        </span>
                                        <span className="block font-medium text-emerald-400">
                                            {valueScore.toFixed(4)}
                                        </span>
                                        <span className="block text-[10px] text-neutral-600 mt-0.5">pts per ₹</span>
                                    </div>
                                )}
                            </div>
                        </section>
                    )}

                    {/* iGPU panel (CPU-only) */}
                    {config.showIgpuLink && selectedSku && (
                        <IgpuInfoPanel selectedSku={selectedSku} />
                    )}

                    {/* vGPU CPU List (vGPU-only) */}
                    {category === "vgpu" && relatedCpus && (
                        <section className="mt-8">
                            <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-neutral-200">
                                <Cpu className="w-5 h-5 text-cyan-500" /> Used In These CPUs
                            </h2>
                            {relatedCpus.length === 0 ? (
                                <p className="text-sm text-neutral-500 italic p-4 bg-neutral-900 rounded-lg border border-neutral-800">
                                    No active CPUs use this integrated GPU.
                                </p>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {relatedCpus.map(cpu => (
                                        <Link
                                            key={cpu.id}
                                            href={`/products/cpu/${cpu.id}`}
                                            className="block p-4 bg-neutral-900/50 hover:bg-neutral-800 rounded-lg border border-neutral-800 hover:border-cyan-500/50 transition-colors group"
                                        >
                                            <div className="flex justify-between items-start mb-2">
                                                <div>
                                                    <span className="text-[10px] uppercase tracking-widest text-neutral-500 group-hover:text-cyan-500/70 transition-colors block mb-0.5">
                                                        {cpu.brand} • {cpu.generation} Gen
                                                    </span>
                                                    <span className="font-bold text-neutral-200 group-hover:text-cyan-400 transition-colors">
                                                        {cpu.name}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex gap-3 text-xs">
                                                <span className="text-neutral-400">
                                                    {(cpu as any).cores}C / {(cpu as any).threads}T
                                                </span>
                                                <span className="text-amber-500 font-medium border-l border-neutral-800 pl-3">
                                                    🎮 {(cpu.normalized?.gamingScore ?? cpu.gamingScore ?? 0).toLocaleString()} pts
                                                </span>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </section>
                    )}
                </div>

                {/* RIGHT: Performance + Market Intelligence */}
                <div className="space-y-6">
                    {/* Performance card — universal */}
                    <PerformanceCard
                        normalized={product.normalized}
                        scoreVersion={product.scoreVersion}
                    />

                    {/* Relative vs RTX 4090 (GPU only for now) */}
                    {relativeVs4090 > 0 && (
                        <p className="text-xs text-neutral-600 text-center">
                            {relativeVs4090.toFixed(1)}% vs RTX 4090 (V1 anchor)
                        </p>
                    )}

                    {/* Market Intelligence */}
                    {config.hasPricing && (
                        <MarketIntelligencePanel
                            product={product}
                            skuPricing={skuPricing}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}
