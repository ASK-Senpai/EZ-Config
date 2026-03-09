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
    isStale?: boolean;
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
        <div className="w-full flex-1 min-w-0 bg-neutral-900/50 border border-neutral-800 rounded-xl p-6 min-h-[160px] flex flex-col justify-between">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-800/50">
                <span className="font-bold text-xl text-neutral-100">{resolution}</span>
                <Monitor className="w-4 h-4 text-neutral-600" />
            </div>
            <div className="space-y-4">
                <div className="space-y-2">
                    {(["high", "medium", "low"] as const).map(q => (
                        <div key={q} className="flex items-center justify-between text-sm">
                            <span className="text-neutral-500 capitalize">{q}</span>
                            <span className={`font-semibold tabular-nums whitespace-nowrap ${getColor(fps[q])}`}>
                                {fps[q]} FPS
                            </span>
                        </div>
                    ))}
                </div>
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
export function AnalysisResultsPanel({ analysis, isLoading, isStale }: AnalysisResultsPanelProps) {
    if (isLoading) {
        return (
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="p-8 rounded-3xl bg-neutral-900 border border-neutral-800 flex items-center justify-center gap-3"
            >
                <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <span className="text-sm text-neutral-400 font-medium">Analyzing build intelligence...</span>
            </motion.div>
        );
    }

    if (!analysis) return null;

    return (
        <motion.div
            id="analysis-results"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="space-y-6 relative"
        >
            {isStale && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-amber-500/10 border border-amber-500/20 rounded-2xl px-4 py-3 flex items-center justify-between gap-4"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                        <span className="text-xs font-bold text-amber-500 uppercase tracking-wider">
                            Build modified — reanalyze required for accurate intelligence
                        </span>
                    </div>
                </motion.div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                {/* ── LEFT COLUMN ── */}
                <div className="space-y-6">
                    {/* Performance Scores */}
                    <motion.div {...stagger(0)} className="p-6 rounded-3xl bg-neutral-900 border border-neutral-800">
                        <div className="flex items-center gap-2 mb-6">
                            <BarChart3 className="w-4 h-4 text-primary" />
                            <h3 className="font-bold uppercase tracking-widest text-xs">Performance Scores</h3>
                            <span className="ml-auto text-[10px] text-neutral-600 font-bold uppercase tracking-wider">{analysis.scores.tier} Tier</span>
                        </div>
                        <div className="flex justify-around bg-neutral-950/40 p-4 rounded-2xl border border-white/5">
                            <ScoreRing value={analysis.scores.gaming} label="Gaming" color="#22c55e" />
                            <ScoreRing value={analysis.scores.workstation} label="Workstation" color="#3b82f6" />
                            <ScoreRing value={analysis.scores.futureProof} label="Future-Proof" color="#a855f7" />
                            <ScoreRing value={analysis.scores.overall} label="Overall" color="#f59e0b" />
                        </div>
                    </motion.div>

                    {/* FPS Estimation */}
                    <motion.div {...stagger(1)} className="p-6 rounded-3xl bg-neutral-900 border border-neutral-800">
                        <div className="flex items-center gap-2 mb-6">
                            <Gamepad2 className="w-4 h-4 text-primary" />
                            <h3 className="font-bold uppercase tracking-widest text-xs">FPS Estimation</h3>
                            <span className="ml-auto text-[10px] text-neutral-600 font-bold uppercase tracking-widest">AAA TITLES • Optimized High</span>
                        </div>
                        <div className="grid grid-cols-2 gap-6 items-stretch">
                            {(["720p", "1080p", "1440p", "4K"] as const).map(res => (
                                <FPSCard key={res} resolution={res} fps={analysis.fps[res]} />
                            ))}
                        </div>
                    </motion.div>

                    {/* AI Build Overview */}
                    <motion.div {...stagger(2)} className="p-6 rounded-3xl bg-gradient-to-br from-neutral-900 to-neutral-900/80 border border-primary/20">
                        <div className="flex items-center gap-2 mb-4">
                            <Sparkles className="w-4 h-4 text-primary" />
                            <h3 className="font-bold uppercase tracking-widest text-xs">AI Build Overview</h3>
                        </div>
                        <p className="text-sm text-neutral-300 leading-relaxed font-medium italic">
                            "{analysis.aiOverviewMini}"
                        </p>
                    </motion.div>

                    {/* Risk Flags (if any) */}
                    {analysis.riskFlags.length > 0 && (
                        <motion.div {...stagger(3)} className="p-6 rounded-3xl bg-red-500/5 border border-red-500/20">
                            <div className="flex items-center gap-2 mb-3">
                                <AlertTriangle className="w-4 h-4 text-red-500" />
                                <h3 className="font-bold uppercase tracking-widest text-xs text-red-500">Intelligence Risk Flags</h3>
                            </div>
                            <div className="space-y-2">
                                {analysis.riskFlags.map((flag, idx) => (
                                    <div key={idx} className="text-[11px] text-red-400 font-medium flex gap-2">
                                        <span className="shrink-0 text-red-600 font-bold tracking-tighter">!</span>
                                        <span>{flag}</span>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    )}
                </div>

                {/* ── RIGHT COLUMN ── */}
                <div className="space-y-6">
                    {/* Power Analysis */}
                    <motion.div {...stagger(4)} className="p-6 rounded-3xl bg-neutral-900 border border-neutral-800">
                        <div className="flex items-center gap-2 mb-4">
                            <Zap className="w-4 h-4 text-primary" />
                            <h3 className="font-bold uppercase tracking-widest text-xs">Power Analysis</h3>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 rounded-xl bg-neutral-950/40 border border-white/5 text-center">
                                <div className="text-2xl font-black text-neutral-200">{analysis.power.totalTDP}W</div>
                                <div className="text-[10px] text-neutral-500 font-bold uppercase mt-1">Total TDP</div>
                            </div>
                            <div className="p-4 rounded-xl bg-neutral-950/40 border border-white/5 text-center">
                                <div className="text-2xl font-black text-neutral-200">{analysis.power.recommendedPSU}W</div>
                                <div className="text-[10px] text-neutral-500 font-bold uppercase mt-1">Recommended</div>
                            </div>
                        </div>
                        <div className="mt-4 p-4 rounded-xl bg-neutral-950/40 border border-white/5 flex items-center justify-between">
                            <div>
                                <div className="text-[10px] text-neutral-500 font-bold uppercase">PSU Headroom</div>
                                <div className={`text-xl font-bold ${analysis.power.headroomPercent < 15 ? "text-red-400" : analysis.power.headroomPercent < 25 ? "text-yellow-400" : "text-green-400"}`}>
                                    {analysis.power.headroomPercent}%
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-[10px] text-neutral-500 font-bold uppercase">Provided</div>
                                <div className="text-sm font-bold text-neutral-400">{analysis.power.providedWattage}W</div>
                            </div>
                        </div>
                    </motion.div>

                    {/* Intelligence Metadata */}
                    <motion.div {...stagger(5)} className="p-6 rounded-3xl bg-neutral-900 border border-neutral-800">
                        <div className="flex items-center gap-2 mb-5">
                            <Brain className="w-4 h-4 text-primary" />
                            <h3 className="font-bold uppercase tracking-widest text-xs">Intelligence Metadata</h3>
                            <span className="ml-auto text-[10px] text-neutral-600 font-bold uppercase">Conf: {analysis.intelligenceMeta.confidenceScore}%</span>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <MetaCell icon={<Thermometer className="w-3.5 h-3.5" />} label="Thermal Risk" value={analysis.intelligenceMeta.thermalRiskLevel}
                                color={analysis.intelligenceMeta.thermalRiskLevel === "High" ? "text-red-400" : analysis.intelligenceMeta.thermalRiskLevel === "Moderate" ? "text-yellow-400" : "text-green-400"} />
                            <MetaCell icon={<Scale className="w-3.5 h-3.5" />} label="Hardware Balance" value={`${analysis.intelligenceMeta.componentBalanceScore}/100`}
                                color={analysis.intelligenceMeta.componentBalanceScore >= 70 ? "text-green-400" : analysis.intelligenceMeta.componentBalanceScore >= 40 ? "text-yellow-400" : "text-red-400"} />
                            <MetaCell icon={<Clock className="w-3.5 h-3.5" />} label="Gaming Life" value={`${analysis.intelligenceMeta.estimatedLongevityYears.gaming} yrs`} />
                            <MetaCell icon={<Wrench className="w-3.5 h-3.5" />} label="Upgrade Path" value={analysis.intelligenceMeta.upgradeDifficulty} />
                        </div>
                    </motion.div>

                    {/* Market Timing */}
                    <motion.div {...stagger(6)} className="p-6 rounded-3xl bg-neutral-900 border border-neutral-800">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4 text-primary" />
                                <h3 className="font-bold uppercase tracking-widest text-xs">Market Timing</h3>
                            </div>
                            <div className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${analysis.marketTiming.buyNowScore >= 70 ? "bg-green-500/10 text-green-400 border border-green-500/20" : "bg-amber-500/10 text-amber-400 border border-amber-500/20"}`}>
                                Score: {analysis.marketTiming.buyNowScore}
                            </div>
                        </div>
                        <div className="text-lg font-black text-neutral-200 mb-3">{analysis.marketTiming.recommendation}</div>
                        <div className="space-y-1.5 border-t border-white/5 pt-3">
                            {analysis.marketTiming.reasons.slice(0, 3).map((reason: string, idx: number) => (
                                <div key={idx} className="flex items-start gap-2 text-[10px] text-neutral-500 leading-tight">
                                    <ChevronRight className="w-2.5 h-2.5 mt-0.5 text-neutral-700 shrink-0" />
                                    <span>{reason}</span>
                                </div>
                            ))}
                        </div>
                    </motion.div>

                    {/* Upgrade Headroom */}
                    <motion.div {...stagger(7)} className="p-6 rounded-3xl bg-neutral-900 border border-neutral-800">
                        <div className="flex items-center gap-2 mb-4">
                            <TrendingUp className="w-4 h-4 text-primary" />
                            <h3 className="font-bold uppercase tracking-widest text-xs">Upgrade Headroom</h3>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            {[
                                { label: "CPU Headroom", value: analysis.upgradeHeadroom.cpuUpgradePotential },
                                { label: "GPU Headroom", value: analysis.upgradeHeadroom.gpuUpgradePotential },
                                { label: "RAM Expandable", value: analysis.upgradeHeadroom.ramUpgradePossible ? "Yes" : "Max" },
                                { label: "Storage Path", value: analysis.upgradeHeadroom.storageExpandable ? "Yes" : "No" },
                            ].map((item) => (
                                <div key={item.label} className="bg-neutral-800/30 rounded-xl px-3 py-2 flex items-center justify-between border border-white/5">
                                    <span className="text-[9px] text-neutral-500 font-bold uppercase">{item.label}</span>
                                    <span className={`text-[10px] font-bold uppercase ${item.value === "high" || item.value === "Yes" ? "text-green-400" : "text-neutral-400"}`}>
                                        {item.value}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                </div>
            </div>
        </motion.div>
    );
}
