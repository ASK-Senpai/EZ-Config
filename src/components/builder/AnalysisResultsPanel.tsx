"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";
import {
    Gamepad2,
    Monitor,
    Cpu,
    Zap,
    ShieldCheck,
    TrendingUp,
    AlertTriangle,
    Clock,
    ChevronRight,
    Sparkles,
    ArrowUpRight,
    BarChart3,
    Brain,
    Thermometer,
    Wrench,
    Scale,
} from "lucide-react";
import type { BuildAnalysis } from "@/lib/engine/analyzeBuild";

// Staggered reveal helper
const stagger = (i: number) => ({
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.4, delay: 0.1 * i, ease: "easeOut" as const },
});

interface AnalysisResultsPanelProps {
    analysis: BuildAnalysis;
    isLoading?: boolean;
}

// ── Score Ring ────────────────────────────────────────────────────────────────
function ScoreRing({ value, label, color }: { value: number; label: string; color: string }) {
    const radius = 36;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (value / 100) * circumference;

    return (
        <div className="flex flex-col items-center gap-2">
            <div className="relative w-24 h-24">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 80 80">
                    <circle cx="40" cy="40" r={radius} fill="none" stroke="currentColor"
                        className="text-neutral-800" strokeWidth="5" />
                    <motion.circle
                        cx="40" cy="40" r={radius} fill="none"
                        stroke={color} strokeWidth="5" strokeLinecap="round"
                        strokeDasharray={circumference}
                        initial={{ strokeDashoffset: circumference }}
                        animate={{ strokeDashoffset: offset }}
                        transition={{ duration: 1.2, ease: "easeOut" }}
                    />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xl font-black">{value}</span>
                </div>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">{label}</span>
        </div>
    );
}

// ── FPS Card ─────────────────────────────────────────────────────────────────
function FPSCard({ resolution, fps }: { resolution: string; fps: { low: number; medium: number; high: number } }) {
    const getColor = (val: number) => {
        if (val >= 120) return "text-green-400";
        if (val >= 60) return "text-yellow-400";
        if (val >= 30) return "text-orange-400";
        return "text-red-400";
    };

    return (
        <div className="bg-neutral-900/50 border border-neutral-800 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
                <span className="font-bold text-sm">{resolution}</span>
                <Monitor className="w-3.5 h-3.5 text-neutral-600" />
            </div>
            <div className="space-y-1.5">
                {(["high", "medium", "low"] as const).map(q => (
                    <div key={q} className="flex items-center justify-between text-xs">
                        <span className="text-neutral-500 capitalize">{q}</span>
                        <span className={`font-bold tabular-nums ${getColor(fps[q])}`}>
                            {fps[q]} FPS
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ── Bottleneck Bar ────────────────────────────────────────────────────────────
function BottleneckBar({ analysis }: { analysis: BuildAnalysis }) {
    const { percentage, direction, severity } = analysis.bottleneck;
    const colorMap = { low: "bg-green-500", moderate: "bg-yellow-500", high: "bg-red-500" };
    const barColor = colorMap[severity as keyof typeof colorMap] || "bg-neutral-500";

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
                <span className="text-neutral-500">CPU</span>
                <span className={`font-bold ${severity === "high" ? "text-red-400" : severity === "moderate" ? "text-yellow-400" : "text-green-400"}`}>
                    {direction} ({percentage}%)
                </span>
                <span className="text-neutral-500">GPU</span>
            </div>
            <div className="w-full h-2 bg-neutral-800 rounded-full overflow-hidden">
                <motion.div
                    className={`h-full rounded-full ${barColor}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, 50 + (direction.includes("CPU") ? percentage / 2 : -(percentage / 2)))}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                />
            </div>
        </div>
    );
}

function MetaCell({
    icon,
    label,
    value,
    color,
    accent,
}: {
    icon: ReactNode;
    label: string;
    value: string | number;
    color?: string;
    accent?: boolean;
}) {
    return (
        <div className={`rounded-xl border px-3 py-2.5 ${accent ? "bg-primary/5 border-primary/20" : "bg-neutral-900/60 border-neutral-800"}`}>
            <div className="mb-1 flex items-center gap-1.5 text-neutral-500">
                {icon}
                <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
            </div>
            <div className={`text-sm font-bold ${color ?? "text-neutral-200"}`}>{value}</div>
        </div>
    );
}

// ── Main Panel ────────────────────────────────────────────────────────────────
export function AnalysisResultsPanel({ analysis, isLoading }: AnalysisResultsPanelProps) {
    if (isLoading) {
        return (
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="p-8 rounded-3xl bg-neutral-900 border border-neutral-800 flex items-center justify-center gap-3"
            >
                <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <span className="text-sm text-neutral-400 font-medium">Analyzing your build...</span>
            </motion.div>
        );
    }

    return (
        <motion.div
            id="analysis-results"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
        >
            {/* ── Scores ─────────────────────────────────────── */}
            <motion.div {...stagger(0)} className="p-6 rounded-3xl bg-neutral-900 border border-neutral-800">
                <div className="flex items-center gap-2 mb-6">
                    <BarChart3 className="w-4 h-4 text-primary" />
                    <h3 className="font-bold uppercase tracking-widest text-xs">Performance Scores</h3>
                    <span className="ml-auto text-[10px] text-neutral-600 font-bold uppercase">{analysis.scores.tier}</span>
                </div>
                <div className="flex justify-around">
                    <ScoreRing value={analysis.scores.gaming} label="Gaming" color="#22c55e" />
                    <ScoreRing value={analysis.scores.workstation} label="Workstation" color="#3b82f6" />
                    <ScoreRing value={analysis.scores.futureProof} label="Future-Proof" color="#a855f7" />
                    <ScoreRing value={analysis.scores.overall} label="Overall" color="#f59e0b" />
                </div>
            </motion.div>

            {/* ── FPS Estimation ──────────────────────────────── */}
            <motion.div {...stagger(1)} className="p-6 rounded-3xl bg-neutral-900 border border-neutral-800">
                <div className="flex items-center gap-2 mb-4">
                    <Gamepad2 className="w-4 h-4 text-primary" />
                    <h3 className="font-bold uppercase tracking-widest text-xs">FPS Estimation</h3>
                    <span className="ml-auto text-[10px] text-neutral-600 font-bold">AAA TITLES</span>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    {(["720p", "1080p", "1440p", "4K"] as const).map(res => (
                        <FPSCard key={res} resolution={res} fps={analysis.fps[res]} />
                    ))}
                </div>
            </motion.div>

            {/* ── Bottleneck ──────────────────────────────────── */}
            <motion.div {...stagger(2)} className="p-6 rounded-3xl bg-neutral-900 border border-neutral-800">
                <div className="flex items-center gap-2 mb-4">
                    <Cpu className="w-4 h-4 text-primary" />
                    <h3 className="font-bold uppercase tracking-widest text-xs">CPU / GPU Balance</h3>
                </div>
                <BottleneckBar analysis={analysis} />
            </motion.div>

            {/* ── Power ───────────────────────────────────────── */}
            <motion.div {...stagger(3)} className="p-6 rounded-3xl bg-neutral-900 border border-neutral-800">
                <div className="flex items-center gap-2 mb-4">
                    <Zap className="w-4 h-4 text-primary" />
                    <h3 className="font-bold uppercase tracking-widest text-xs">Power Analysis</h3>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-center">
                    <div>
                        <div className="text-2xl font-black">{analysis.power.totalTDP}W</div>
                        <div className="text-[10px] text-neutral-500 font-bold uppercase">Est. Draw</div>
                    </div>
                    <div>
                        <div className="text-2xl font-black">{analysis.power.recommendedPSU}W</div>
                        <div className="text-[10px] text-neutral-500 font-bold uppercase">Recommended</div>
                    </div>
                    <div>
                        <div className="text-2xl font-black">{analysis.power.providedWattage}W</div>
                        <div className="text-[10px] text-neutral-500 font-bold uppercase">Provided PSU</div>
                    </div>
                    <div>
                        <div className={`text-2xl font-black ${analysis.power.headroomPercent < 15 ? "text-red-400" : analysis.power.headroomPercent < 25 ? "text-yellow-400" : "text-green-400"}`}>
                            {analysis.power.headroomPercent}%
                        </div>
                        <div className="text-[10px] text-neutral-500 font-bold uppercase">Headroom</div>
                    </div>
                </div>
            </motion.div>

            {/* ── Intelligence Metadata (Section 12) ─────────── */}
            <motion.div {...stagger(4)} className="p-6 rounded-3xl bg-gradient-to-br from-neutral-900 to-neutral-950 border border-neutral-800">
                <div className="flex items-center gap-2 mb-5">
                    <Brain className="w-4 h-4 text-primary" />
                    <h3 className="font-bold uppercase tracking-widest text-xs">Intelligence Metadata</h3>
                    <span className="ml-auto text-[10px] text-neutral-600 font-bold">Confidence: {analysis.intelligenceMeta.confidenceScore}%</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <MetaCell icon={<BarChart3 className="w-3.5 h-3.5" />} label="Build Tier" value={analysis.intelligenceMeta.buildTier} accent />
                    <MetaCell icon={<Clock className="w-3.5 h-3.5" />} label="Gaming Longevity" value={`${analysis.intelligenceMeta.estimatedLongevityYears.gaming} yrs`} />
                    <MetaCell icon={<Clock className="w-3.5 h-3.5" />} label="Productivity Lifespan" value={`${analysis.intelligenceMeta.estimatedLongevityYears.productivity} yrs`} />
                    <MetaCell icon={<Thermometer className="w-3.5 h-3.5" />} label="Thermal Risk" value={analysis.intelligenceMeta.thermalRiskLevel}
                        color={analysis.intelligenceMeta.thermalRiskLevel === "High" ? "text-red-400" : analysis.intelligenceMeta.thermalRiskLevel === "Moderate" ? "text-yellow-400" : "text-green-400"} />
                    <MetaCell icon={<Wrench className="w-3.5 h-3.5" />} label="Upgrade Difficulty" value={analysis.intelligenceMeta.upgradeDifficulty}
                        color={analysis.intelligenceMeta.upgradeDifficulty === "Complex" ? "text-red-400" : analysis.intelligenceMeta.upgradeDifficulty === "Moderate" ? "text-yellow-400" : "text-green-400"} />
                    <MetaCell icon={<Scale className="w-3.5 h-3.5" />} label="Component Balance" value={`${analysis.intelligenceMeta.componentBalanceScore}/100`}
                        color={analysis.intelligenceMeta.componentBalanceScore >= 70 ? "text-green-400" : analysis.intelligenceMeta.componentBalanceScore >= 40 ? "text-yellow-400" : "text-red-400"} />
                </div>
            </motion.div>

            {/* ── AI Overview ─────────────────────────────────── */}
            <motion.div {...stagger(5)} className="p-6 rounded-3xl bg-gradient-to-br from-neutral-900 to-neutral-900/80 border border-primary/20">
                <div className="flex items-center gap-2 mb-4">
                    <Sparkles className="w-4 h-4 text-primary" />
                    <h3 className="font-bold uppercase tracking-widest text-xs">AI Build Overview</h3>
                </div>
                <p className="text-sm text-neutral-300 leading-relaxed">{analysis.aiOverviewMini}</p>
            </motion.div>

            {/* ── Market Timing ────────────────────────────────── */}
            <motion.div {...stagger(6)} className="p-6 rounded-3xl bg-neutral-900 border border-neutral-800">
                <div className="flex items-center gap-2 mb-4">
                    <Clock className="w-4 h-4 text-primary" />
                    <h3 className="font-bold uppercase tracking-widest text-xs">Market Timing</h3>
                </div>
                <div className="flex items-center justify-between">
                    <div>
                        <div className={`text-lg font-black ${analysis.marketTiming.buyNowScore >= 70 ? "text-green-400" : analysis.marketTiming.buyNowScore >= 45 ? "text-yellow-400" : "text-red-400"}`}>
                            {analysis.marketTiming.recommendation}
                        </div>
                        <div className="text-[10px] text-neutral-500 font-bold">Score: {analysis.marketTiming.buyNowScore}/100</div>
                    </div>
                </div>
                {analysis.marketTiming.reasons.length > 0 && (
                    <div className="mt-3 space-y-1.5">
                        {analysis.marketTiming.reasons.map((reason: string, idx: number) => (
                            <div key={idx} className="flex items-start gap-2 text-[11px] text-neutral-400">
                                <ChevronRight className="w-3 h-3 mt-0.5 text-neutral-700 shrink-0" />
                                <span>{reason}</span>
                            </div>
                        ))}
                    </div>
                )}
            </motion.div>

            {/* ── Risk Flags ──────────────────────────────────── */}
            {analysis.riskFlags.length > 0 && (
                <div className="p-6 rounded-3xl bg-red-500/5 border border-red-500/20">
                    <div className="flex items-center gap-2 mb-3">
                        <AlertTriangle className="w-4 h-4 text-red-500" />
                        <h3 className="font-bold uppercase tracking-widest text-xs text-red-500">Risk Flags</h3>
                    </div>
                    <div className="space-y-2">
                        {analysis.riskFlags.map((flag, idx) => (
                            <div key={idx} className="text-[11px] text-red-400 font-medium flex gap-2">
                                <span className="shrink-0">•</span>
                                <span>{flag}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ── Optimization Hints (Structured) ─────────────── */}
            {analysis.optimizationHints?.suggestions?.length > 0 && (
                <motion.div {...stagger(8)} className="p-6 rounded-3xl bg-neutral-900 border border-neutral-800">
                    <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className="w-4 h-4 text-primary" />
                        <h3 className="font-bold uppercase tracking-widest text-xs">Optimization Hints</h3>
                        {analysis.optimizationHints.potentialScoreDelta > 0 && (
                            <span className="ml-auto text-[10px] text-green-400 font-bold">+{analysis.optimizationHints.potentialScoreDelta} potential pts</span>
                        )}
                    </div>
                    <p className="text-[11px] text-neutral-500 mb-4">{analysis.optimizationHints.explanation}</p>
                    <div className="space-y-3">
                        {analysis.optimizationHints.suggestions.map((s, idx) => (
                            <div key={idx} className="bg-neutral-800/50 rounded-xl p-3 space-y-1">
                                <div className="flex items-center gap-2">
                                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${s.priority === "high" ? "bg-red-400" : s.priority === "medium" ? "bg-yellow-400" : "bg-neutral-500"}`} />
                                    <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-300">{s.component}</span>
                                    <span className={`ml-auto text-[9px] font-bold uppercase tracking-widest ${s.priority === "high" ? "text-red-400" : s.priority === "medium" ? "text-yellow-400" : "text-neutral-600"}`}>{s.priority}</span>
                                </div>
                                <p className="text-[11px] text-neutral-400">{s.reason}</p>
                                <p className="text-[11px] text-primary/80 font-medium">{s.action}</p>
                            </div>
                        ))}
                    </div>
                </motion.div>
            )}

            {/* ── Upgrade Headroom ────────────────────────────── */}
            <motion.div {...stagger(9)} className="p-6 rounded-3xl bg-neutral-900 border border-neutral-800">
                <div className="flex items-center gap-2 mb-4">
                    <ShieldCheck className="w-4 h-4 text-primary" />
                    <h3 className="font-bold uppercase tracking-widest text-xs">Upgrade Headroom</h3>
                </div>
                <div className="grid grid-cols-2 gap-3">
                    {[
                        { label: "CPU Upgrade", value: analysis.upgradeHeadroom.cpuUpgradePotential },
                        { label: "GPU Upgrade", value: analysis.upgradeHeadroom.gpuUpgradePotential },
                        { label: "RAM Expandable", value: analysis.upgradeHeadroom.ramUpgradePossible ? "Yes" : "Maxed" },
                        { label: "Storage", value: analysis.upgradeHeadroom.storageExpandable ? "Expandable" : "Limited" },
                    ].map((item) => (
                        <div key={item.label} className="flex items-center justify-between bg-neutral-800/50 rounded-xl px-4 py-2.5">
                            <span className="text-[11px] text-neutral-500 font-bold uppercase tracking-wider">{item.label}</span>
                            <span className={`text-xs font-bold capitalize ${item.value === "high" || item.value === "Yes" || item.value === "Expandable" ? "text-green-400" : item.value === "medium" ? "text-yellow-400" : "text-neutral-400"}`}>
                                {item.value}
                            </span>
                        </div>
                    ))}
                </div>
            </motion.div>
        </motion.div>
    );
}
