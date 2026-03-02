"use client";

/**
 * IgpuInfoPanel.tsx
 * Renders only when categoryConfig.showIgpuLink === true (CPU category).
 * Shows integrated graphics status for the SELECTED SKU.
 * Uses integratedGraphicsId (stable doc ID) — never name matching.
 */

import Link from "next/link";
import { Cpu, ExternalLink, XCircle } from "lucide-react";
import type { CpuSku } from "@/lib/products/types";

interface IgpuInfoPanelProps {
    selectedSku: CpuSku;
}

export default function IgpuInfoPanel({ selectedSku }: IgpuInfoPanelProps) {
    const hasIgpu = selectedSku.hasIntegratedGraphics && selectedSku.integratedGraphicsId;

    if (hasIgpu) {
        return (
            <div className="p-5 bg-teal-950/30 border border-teal-800/40 rounded-xl space-y-3">
                <div className="flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-teal-400" />
                    <h3 className="text-sm font-semibold text-teal-300 uppercase tracking-wider">
                        Integrated Graphics
                    </h3>
                </div>

                <p className="text-sm text-neutral-400">
                    This CPU variant includes an integrated GPU.
                    CPU-only builds are viable without a discrete graphics card.
                </p>

                <Link
                    href={`/products/vgpu/${selectedSku.integratedGraphicsId}`}
                    className="inline-flex items-center gap-2 text-sm font-medium text-teal-400 hover:text-teal-300 transition-colors group"
                >
                    View iGPU Performance
                    <ExternalLink className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </Link>
            </div>
        );
    }

    // F-variant or no iGPU SKU
    return (
        <div className="p-5 bg-neutral-900/60 border border-neutral-800 rounded-xl space-y-2">
            <div className="flex items-center gap-2">
                <XCircle className="w-4 h-4 text-neutral-600" />
                <h3 className="text-sm font-semibold text-neutral-500 uppercase tracking-wider">
                    No Integrated Graphics
                </h3>
            </div>
            <p className="text-sm text-neutral-600">
                This CPU variant ({selectedSku.suffix} suffix) has no integrated GPU.
                A discrete GPU is required to display output.
            </p>
        </div>
    );
}
