"use client";

import { motion } from "framer-motion";
import {
    BarChart3,
    Zap,
    ShieldCheck,
    Cpu,
    AlertCircle,
    CheckCircle2,
    Lightbulb
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface LiveEnginePanelProps {
    analysis: any;
    buildComplete: boolean;
}

export function LiveEnginePanel({ analysis, buildComplete }: LiveEnginePanelProps) {
    const { metrics, power, bottleneck, compatibility, suggestions } = analysis;
    const { percentage, direction, severity } = bottleneck;

    const colorMap = { low: "bg-green-500", moderate: "bg-yellow-500", high: "bg-red-500" };
    const barColor = colorMap[severity as keyof typeof colorMap] || "bg-neutral-500";

    return (
        <div className="space-y-6 sticky top-24">
            {/* Performance Profile */}
            <Card className="bg-neutral-900 border-neutral-800 rounded-3xl overflow-hidden">
                <CardHeader className="pb-3 border-b border-white/5 bg-white/[0.02]">
                    <CardTitle className="text-xs font-bold flex items-center gap-2 uppercase tracking-widest">
                        <BarChart3 className="w-4 h-4 text-primary" /> Performance Profile
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                    <div className="space-y-2">
                        <div className="flex justify-between items-end">
                            <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Gaming Performance</span>
                            <span className="text-lg font-black text-neutral-100">{metrics.normalizedGPU}<span className="text-[10px] text-neutral-500 font-normal ml-0.5">/100</span></span>
                        </div>
                        <div className="h-1.5 w-full bg-neutral-800 rounded-full overflow-hidden">
                            <motion.div
                                className="h-full bg-amber-500 rounded-full"
                                initial={{ width: 0 }}
                                animate={{ width: `${metrics.normalizedGPU}%` }}
                                transition={{ duration: 0.8, ease: "easeOut" }}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <div className="flex justify-between items-end">
                            <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Workstation Power</span>
                            <span className="text-lg font-black text-neutral-100">{metrics.normalizedCPU}<span className="text-[10px] text-neutral-500 font-normal ml-0.5">/100</span></span>
                        </div>
                        <div className="h-1.5 w-full bg-neutral-800 rounded-full overflow-hidden">
                            <motion.div
                                className="h-full bg-blue-500 rounded-full"
                                initial={{ width: 0 }}
                                animate={{ width: `${metrics.normalizedCPU}%` }}
                                transition={{ duration: 0.8, ease: "easeOut" }}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/5">
                        <div className="space-y-1">
                            <span className="text-[9px] font-bold text-neutral-600 uppercase tracking-widest leading-none">Overall Score</span>
                            <div className="text-xl font-black text-primary leading-none">{metrics.performanceScore}</div>
                        </div>
                        <div className="space-y-1 text-right">
                            <span className="text-[9px] font-bold text-neutral-600 uppercase tracking-widest leading-none">Future Proof</span>
                            <div className="text-xl font-black text-neutral-100 leading-none">{metrics.futureProofScore}</div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Power Estimation */}
            <Card className="bg-neutral-900 border-neutral-800 rounded-3xl overflow-hidden">
                <CardHeader className="pb-3 border-b border-white/5 bg-white/[0.02] flex flex-row items-center justify-between">
                    <CardTitle className="text-xs font-bold flex items-center gap-2 uppercase tracking-widest">
                        <Zap className="w-4 h-4 text-primary" /> Power Estimation
                    </CardTitle>
                    {power.totalTDP > 0 && (
                        <div className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${power.providedWattage >= power.recommendedPSU ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"} border border-white/5`}>
                            {power.providedWattage >= power.recommendedPSU ? "Safe" : "Low PSU"}
                        </div>
                    )}
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                    <div className="flex justify-between items-center">
                        <span className="text-[10px] font-bold text-neutral-500 uppercase">System Draw</span>
                        <span className="text-sm font-black text-neutral-200">{power.totalTDP}W</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-[10px] font-bold text-neutral-500 uppercase">Recommended</span>
                        <span className="text-sm font-black text-neutral-200">{power.recommendedPSU}W</span>
                    </div>
                    <div className="pt-3 border-t border-white/5 flex justify-between items-center text-sm font-bold">
                        <span className="text-[10px] font-bold text-neutral-500 uppercase">Selected</span>
                        <span className={`text-sm font-black ${power.providedWattage > 0 ? "text-primary" : "text-neutral-600"}`}>
                            {power.providedWattage ? `${power.providedWattage}W` : "MISSING"}
                        </span>
                    </div>
                </CardContent>
            </Card>

            {/* Live Balance (Merged) */}
            <Card className="bg-neutral-900 border-neutral-800 rounded-3xl overflow-hidden">
                <CardHeader className="pb-3 border-b border-white/5 bg-white/[0.02]">
                    <CardTitle className="text-xs font-bold flex items-center gap-2 uppercase tracking-widest">
                        <Cpu className="w-4 h-4 text-primary" /> Live Balance
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-3">
                    <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-neutral-500">
                        <span>CPU Heavy</span>
                        <span className={severity === "high" ? "text-red-400" : severity === "moderate" ? "text-yellow-400" : "text-green-400"}>
                            {direction} ({percentage}%)
                        </span>
                        <span>GPU Heavy</span>
                    </div>
                    <div className="w-full h-1.5 bg-neutral-800 rounded-full overflow-hidden border border-white/5">
                        <motion.div
                            className={`h-full ${barColor}`}
                            initial={false}
                            animate={{
                                width: `${Math.min(100, 50 + (direction.includes("CPU") ? percentage / 2 : -(percentage / 2)))}%`,
                            }}
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Build Integrity (Merged) */}
            <Card className="bg-neutral-900 border-neutral-800 rounded-3xl overflow-hidden">
                <CardHeader className="pb-3 border-b border-white/5 bg-white/[0.02]">
                    <CardTitle className="text-xs font-bold flex items-center gap-2 uppercase tracking-widest">
                        <ShieldCheck className="w-4 h-4 text-primary" /> Build Integrity
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            {buildComplete ? (
                                <CheckCircle2 className="w-4 h-4 text-green-500" />
                            ) : (
                                <AlertCircle className="w-4 h-4 text-amber-500" />
                            )}
                            <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-200">
                                {buildComplete ? "System Ready" : "Incomplete Build"}
                            </span>
                        </div>
                        <span className={`text-[10px] font-bold uppercase ${compatibility.isValid ? "text-green-500/60" : "text-red-500/60"}`}>
                            {compatibility.isValid ? "Validated" : "Issues Found"}
                        </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                        <div className="px-3 py-2 rounded-xl bg-neutral-800/50 border border-white/5 flex flex-col items-center">
                            <span className="text-[9px] font-bold text-neutral-500 uppercase">Power Sync</span>
                            <div className={`text-[10px] font-black ${power.providedWattage >= power.recommendedPSU ? "text-green-400" : "text-red-400"}`}>
                                {power.providedWattage >= power.recommendedPSU ? "STABLE" : "CRITICAL"}
                            </div>
                        </div>
                        <div className="px-3 py-2 rounded-xl bg-neutral-800/50 border border-white/5 flex flex-col items-center">
                            <span className="text-[9px] font-bold text-neutral-500 uppercase">Thermal Load</span>
                            <div className="text-[10px] font-black text-neutral-300">
                                {power.totalTDP > 400 ? "HIGH" : "LOW"}
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
