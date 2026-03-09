"use client";

import { motion } from "framer-motion";
import { Cpu, Zap, ShieldCheck, AlertCircle, CheckCircle2 } from "lucide-react";
import { BuildAnalysis } from "@/lib/engine/analyzeBuild";

interface LiveIntelligencePanelProps {
    analysis: any; // Using base engine output for live reactivity
    buildComplete: boolean;
}

export function LiveIntelligencePanel({ analysis, buildComplete }: LiveIntelligencePanelProps) {
    const { bottleneck, power, compatibility } = analysis;
    const { percentage, direction, severity } = bottleneck;

    const colorMap = { low: "bg-green-500", moderate: "bg-yellow-500", high: "bg-red-500" };
    const barColor = colorMap[severity as keyof typeof colorMap] || "bg-neutral-500";

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* CPU / GPU Balance (Live) */}
            <div className="p-6 rounded-3xl bg-neutral-900 border border-neutral-800 space-y-4">
                <div className="flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-primary" />
                    <h3 className="font-bold uppercase tracking-widest text-xs">Live Balance Bar</h3>
                </div>

                <div className="space-y-3">
                    <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-neutral-500">
                        <span>CPU Heavy</span>
                        <span className={severity === "high" ? "text-red-400" : severity === "moderate" ? "text-yellow-400" : "text-green-400"}>
                            {direction} ({percentage}%)
                        </span>
                        <span>GPU Heavy</span>
                    </div>
                    <div className="w-full h-2.5 bg-neutral-800 rounded-full overflow-hidden p-0.5 border border-white/5">
                        <motion.div
                            className={`h-full rounded-full ${barColor} shadow-[0_0_10px_rgba(0,0,0,0.5)]`}
                            initial={false}
                            animate={{
                                width: `${Math.min(100, 50 + (direction.includes("CPU") ? percentage / 2 : -(percentage / 2)))}%`,
                                x: direction.includes("CPU") ? 0 : 0 // Just to trigger animation
                            }}
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        />
                    </div>
                    <p className="text-[10px] text-neutral-600 font-medium italic">
                        Real-time deterministic bottleneck calculation.
                    </p>
                </div>
            </div>

            {/* Build Integrity & Readiness */}
            <div className="p-6 rounded-3xl bg-neutral-900 border border-neutral-800 space-y-4">
                <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-primary" />
                    <h3 className="font-bold uppercase tracking-widest text-xs">Build Integrity</h3>
                </div>

                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            {buildComplete ? (
                                <CheckCircle2 className="w-4 h-4 text-green-500" />
                            ) : (
                                <AlertCircle className="w-4 h-4 text-amber-500" />
                            )}
                            <span className="text-xs font-bold uppercase tracking-wider">
                                {buildComplete ? "System Ready" : "Incomplete Build"}
                            </span>
                        </div>
                        <span className="text-[10px] font-bold text-neutral-600 uppercase">
                            {compatibility.isValid ? "Validated" : "Issues Found"}
                        </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                        <div className="px-3 py-2 rounded-xl bg-neutral-800/50 border border-white/5 space-y-1">
                            <span className="text-[9px] font-bold text-neutral-500 uppercase">Power Sync</span>
                            <div className="text-xs font-black text-neutral-300">
                                {power.providedWattage > power.recommendedPSU ? "Stable" : "Critical"}
                            </div>
                        </div>
                        <div className="px-3 py-2 rounded-xl bg-neutral-800/50 border border-white/5 space-y-1">
                            <span className="text-[9px] font-bold text-neutral-500 uppercase">Thermal Load</span>
                            <div className="text-xs font-black text-neutral-300">
                                {power.totalTDP > 400 ? "High" : "Low"}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
