"use client";

/**
 * ProductSkuSelector.tsx
 * Renders only when categoryConfig.hasSku AND availableSkus.length > 1.
 * Controls which SKU variant is active (i5-12400 vs i5-12400F).
 */

import type { CpuSku } from "@/lib/products/types";

interface ProductSkuSelectorProps {
    skus: CpuSku[];
    selectedSku: CpuSku;
    onSelect: (sku: CpuSku) => void;
}

const SUFFIX_LABELS: Record<string, string> = {
    standard: "Base",
    K: "K (Unlocked)",
    KF: "KF (Unlocked, No iGPU)",
    F: "F (No iGPU)",
    KS: "KS (Special Edition)",
};

export default function ProductSkuSelector({ skus, selectedSku, onSelect }: ProductSkuSelectorProps) {
    return (
        <div className="p-5 bg-neutral-900 border border-neutral-800 rounded-xl space-y-3">
            <h3 className="text-sm font-semibold text-neutral-300 uppercase tracking-wider">
                Variant
            </h3>
            <div className="flex flex-wrap gap-2">
                {skus.map((sku) => {
                    const isActive = sku.sku === selectedSku.sku;
                    const noIgpu = !sku.hasIntegratedGraphics;
                    return (
                        <button
                            key={sku.sku}
                            onClick={() => onSelect(sku)}
                            className={`px-3 py-2 rounded-lg text-sm font-medium border transition-all ${isActive
                                ? "bg-amber-500/10 border-amber-500 text-amber-400"
                                : "bg-neutral-800 border-neutral-700 text-neutral-300 hover:border-neutral-500"
                                }`}
                        >
                            <span className="block font-bold">{sku.suffix === "standard" ? "Base" : sku.suffix}</span>
                            <span className="block text-[10px] opacity-60 mt-0.5">
                                {noIgpu ? "No iGPU" : "iGPU"}
                            </span>
                        </button>
                    );
                })}
            </div>

            {/* Selected SKU display label */}
            <p className="text-xs text-neutral-500">
                Selected: <span className="text-neutral-300 font-medium">{selectedSku.sku}</span>
                {" — "}{SUFFIX_LABELS[selectedSku.suffix] ?? selectedSku.suffix}
            </p>

            {/* Pricing for selected SKU */}
            {selectedSku.pricing?.priceRange?.min != null && (
                <div className="pt-3 border-t border-neutral-800 flex justify-between items-center">
                    <span className="text-xs text-neutral-500">Street Price</span>
                    <span className="text-base font-bold text-white">
                        ₹{selectedSku.pricing.priceRange.min.toLocaleString("en-IN")}
                        {selectedSku.pricing.priceRange.max !== selectedSku.pricing.priceRange.min &&
                            selectedSku.pricing.priceRange.max != null &&
                            <span className="text-xs text-neutral-500 font-normal ml-1">
                                – ₹{selectedSku.pricing.priceRange.max.toLocaleString("en-IN")}
                            </span>
                        }
                    </span>
                </div>
            )}
            {selectedSku.pricing?.availability && (
                <p className="text-[10px] text-neutral-600">
                    {selectedSku.pricing.availability} · {selectedSku.pricing.source ?? ""}
                </p>
            )}
        </div>
    );
}
