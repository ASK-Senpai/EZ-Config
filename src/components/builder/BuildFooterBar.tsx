import { Button } from "@/components/ui/button";
import { CompatibilityBadge } from "./CompatibilityBadge";
import { runEngineV12 } from "@/lib/engine";
import { Save, Trash2, Cpu, Zap } from "lucide-react";
import { formatINR } from "@/lib/utils/formatCurrency";

interface BuildFooterBarProps {
    build: any;
    onClear: () => void;
    onAnalyze: () => void;
    onSave: () => void;
    onGenerateOptimized: () => void;
    onGenerateReport: () => void;
    isOptimizing?: boolean;
    isGeneratingReport?: boolean;
    reportActionLabel?: string;
}

export function BuildFooterBar({
    build,
    onClear,
    onAnalyze,
    onSave,
    onGenerateOptimized,
    onGenerateReport,
    isOptimizing = false,
    isGeneratingReport = false,
    reportActionLabel = "Generate Technical Report",
}: BuildFooterBarProps) {
    const analysis = runEngineV12(build);
    const totalPrice = Object.values(build).reduce((acc: number, item: any) => {
        if (Array.isArray(item)) {
            return acc + item.reduce((s: number, i: any) => s + (i.pricing?.priceRange?.min || 0), 0);
        }
        return acc + (item?.pricing?.priceRange?.min || 0);
    }, 0);

    const hasComponents = Object.values(build).some(v => v && (!Array.isArray(v) || v.length > 0));

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-xl border-t border-white/10 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                {/* Left: Stats */}
                <div className="flex items-center gap-6">
                    <div className="flex flex-col">
                        <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider mb-0.5">Total Estimated Price</span>
                        <span className="text-xl font-black text-neutral-100 tabular-nums">
                            {formatINR(totalPrice)}
                        </span>
                    </div>
                    <div className="h-8 w-px bg-white/5 hidden sm:block" />
                    <div className="flex flex-col">
                        <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider mb-1">Build Integrity</span>
                        <CompatibilityBadge
                            status={analysis.compatibility.isValid ? "valid" : (analysis.compatibility.issues.some(i => i.toLowerCase().includes('error')) ? "error" : "warning")}
                            text={analysis.compatibility.isValid ? "Ready to Build" : `${analysis.compatibility.issues.length} Issues`}
                        />
                    </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="text-neutral-500 hover:text-red-500 hover:bg-red-500/10"
                        onClick={onClear}
                        disabled={!hasComponents}
                        title="Clear Build"
                    >
                        <Trash2 className="w-4 h-4" />
                    </Button>
                    <Button
                        variant="outline"
                        className="flex-1 sm:flex-none font-bold gap-2 border-white/10 text-neutral-300 hover:text-white"
                        onClick={onSave}
                        disabled={!hasComponents}
                    >
                        <Save className="w-4 h-4" /> Save
                    </Button>
                    <Button
                        variant="premium"
                        className="flex-1 sm:flex-none font-bold gap-2 shadow-lg shadow-primary/20"
                        onClick={onAnalyze}
                        disabled={!hasComponents}
                    >
                        <Cpu className="w-4 h-4" /> Analyze Build
                    </Button>
                    <Button
                        variant="outline"
                        className="flex-1 sm:flex-none font-bold gap-2 border-white/10 text-neutral-300 hover:text-white"
                        onClick={onGenerateReport}
                        disabled={!hasComponents || isGeneratingReport}
                    >
                        <span className="w-4 h-4 inline-flex items-center justify-center">📘</span>
                        {isGeneratingReport ? "Generating..." : reportActionLabel}
                    </Button>
                    <Button
                        variant="premium"
                        className="flex-1 sm:flex-none font-bold gap-2 shadow-lg shadow-primary/20"
                        onClick={onGenerateOptimized}
                        disabled={!hasComponents || isOptimizing}
                    >
                        <Zap className="w-4 h-4" />
                        {isOptimizing ? "Generating..." : "⚡ Generate Optimized Build"}
                    </Button>
                </div>
            </div>
        </div>
    );
}
