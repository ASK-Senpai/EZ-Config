"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { runEngineV12 } from "@/lib/engine";
import type { BottleneckAnalysis } from "@/lib/ai/hardware-intelligence";

interface ComponentData {
    id: string;
    name: string;
    tier?: string;
    benchmarkScore?: number;
    gamingScore?: number;
    pricing?: { priceRange?: { min?: number | null } };
    [key: string]: any;
}

interface BottleneckPanelProps {
    cpu: ComponentData;
    gpu: ComponentData;
    resolution: string;
    targetFps: number;
}

function SeverityBadge({ severity }: { severity: string }) {
    const map: Record<string, { label: string; cls: string }> = {
        none: { label: "No Bottleneck", cls: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
        mild: { label: "Mild", cls: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
        moderate: { label: "Moderate", cls: "bg-orange-500/20 text-orange-400 border-orange-500/30" },
        severe: { label: "Severe", cls: "bg-red-500/20 text-red-400 border-red-500/30" },
    };

    const { label, cls } = map[severity] || map["mild"];
    return (
        <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${cls}`}>
            {label}
        </span>
    );
}

function ProgressBar({ value, color = "bg-primary" }: { value: number; color?: string }) {
    return (
        <div className="relative w-full h-2 bg-white/10 rounded-full overflow-hidden">
            <motion.div
                className={`absolute left-0 top-0 h-full rounded-full ${color}`}
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(value, 100)}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
            />
        </div>
    );
}

function SkeletonLine({ wide }: { wide?: boolean }) {
    return (
        <div className={`h-4 rounded bg-white/10 animate-pulse ${wide ? "w-full" : "w-3/4"}`} />
    );
}

export default function BottleneckPanel({ cpu, gpu, resolution, targetFps }: BottleneckPanelProps) {
    // Deterministic result (instant)
    const engineResult = runEngineV12({ cpu, gpu }, "free");
    const { bottleneck, metrics } = engineResult;

    // AI state
    const [aiAnalysis, setAiAnalysis] = useState<BottleneckAnalysis | null>(null);
    const [aiLoading, setAiLoading] = useState(false);
    const [aiError, setAiError] = useState(false);
    const [expanded, setExpanded] = useState(false);

    // Client session cache via useRef
    const lastKeyRef = useRef<string | null>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const fetchAI = useCallback(async () => {
        const sessionKey = `${cpu.id}|${gpu.id}|${resolution}|${targetFps}`;

        if (sessionKey === lastKeyRef.current) {
            // Session cache hit — skip
            return;
        }

        lastKeyRef.current = sessionKey;
        setAiLoading(true);
        setAiError(false);
        setAiAnalysis(null);

        try {
            const res = await fetch("/api/ai/bottleneck", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    cpuId: cpu.id,
                    gpuId: gpu.id,
                    cpuName: cpu.name,
                    gpuName: gpu.name,
                    resolution,
                    targetFps,
                    bottleneckPercent: bottleneck.percentage,
                    bottleneckSide: bottleneck.direction,
                    cpuScore: metrics.normalizedCPU,
                    gpuScore: metrics.normalizedGPU,
                    cpuTier: String(cpu.tier || "mid"),
                    gpuTier: String(gpu.tier || "mid"),
                    gpuMinPrice: gpu.pricing?.priceRange?.min ?? null,
                }),
            });

            if (!res.ok) throw new Error("AI fetch failed");
            const data = await res.json();
            if (data.analysis) setAiAnalysis(data.analysis);
        } catch {
            setAiError(true);
        } finally {
            setAiLoading(false);
        }
    }, [cpu, gpu, resolution, targetFps, bottleneck, metrics]);

    // Debounced trigger on prop changes
    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            fetchAI();
        }, 500);

        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, [fetchAI]);

    const bottleneckColor =
        bottleneck.percentage >= 25 ? "bg-red-500" :
            bottleneck.percentage >= 10 ? "bg-orange-500" : "bg-emerald-500";

    return (
        <Card className="bg-card border-white/10 overflow-hidden">
            <CardHeader className="pb-3 border-b border-white/5">
                <CardTitle className="text-base flex flex-wrap items-center gap-2">
                    <span>Bottleneck Intelligence</span>
                    {aiAnalysis && <SeverityBadge severity={aiAnalysis.severity} />}
                    {aiLoading && (
                        <span className="text-xs text-muted-foreground animate-pulse">AI analyzing…</span>
                    )}
                </CardTitle>
            </CardHeader>

            <CardContent className="pt-4 space-y-4">
                {/* Deterministic Results — always visible instantly */}
                <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground capitalize">{bottleneck.direction}</span>
                        <span className="font-bold">{bottleneck.percentage.toFixed(1)}%</span>
                    </div>
                    <ProgressBar value={bottleneck.percentage} color={bottleneckColor} />
                    <div className="text-xs text-muted-foreground flex gap-4">
                        <span>CPU: <span className="text-foreground font-medium">{metrics.normalizedCPU.toFixed(0)}</span></span>
                        <span>GPU: <span className="text-foreground font-medium">{metrics.normalizedGPU.toFixed(0)}</span></span>
                        <span>Score: <span className="text-primary font-medium">{metrics.performanceScore}</span></span>
                    </div>
                </div>

                {/* AI Intelligence Layer */}
                <div className="mt-2">
                    {aiLoading && (
                        <div className="space-y-2 pt-2">
                            <SkeletonLine wide />
                            <SkeletonLine />
                            <SkeletonLine wide />
                        </div>
                    )}

                    <AnimatePresence>
                        {aiAnalysis && !aiLoading && (
                            <motion.div
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -4 }}
                                transition={{ duration: 0.35 }}
                                className="space-y-3"
                            >
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                    {aiAnalysis.explanation}
                                </p>

                                {/* Collapsible extra details */}
                                <button
                                    onClick={() => setExpanded(v => !v)}
                                    className="text-xs text-primary hover:underline transition-colors"
                                >
                                    {expanded ? "Hide advice ↑" : "Show upgrade & optimization advice ↓"}
                                </button>

                                <AnimatePresence>
                                    {expanded && (
                                        <motion.div
                                            key="advice"
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: "auto", opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{ duration: 0.25 }}
                                            className="overflow-hidden"
                                        >
                                            <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                <div className="p-3 rounded-lg bg-black/30 border border-white/5 space-y-1">
                                                    <p className="text-xs text-primary font-semibold uppercase tracking-wider">Upgrade Advice</p>
                                                    <p className="text-xs text-muted-foreground leading-relaxed">{aiAnalysis.upgradeAdvice}</p>
                                                </div>
                                                <div className="p-3 rounded-lg bg-black/30 border border-white/5 space-y-1">
                                                    <p className="text-xs text-emerald-400 font-semibold uppercase tracking-wider">Optimization Advice</p>
                                                    <p className="text-xs text-muted-foreground leading-relaxed">{aiAnalysis.optimizationAdvice}</p>
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {aiError && !aiLoading && (
                        <p className="text-xs text-red-400 mt-2">AI analysis unavailable. Deterministic results still accurate.</p>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
