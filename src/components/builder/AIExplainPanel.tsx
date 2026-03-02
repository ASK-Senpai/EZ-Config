"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { BuildExplanation, BuildOptimization } from "@/lib/ai/hardware-intelligence";

interface AIExplainPanelProps {
    explanation: BuildExplanation | BuildOptimization | null;
    loading: boolean;
    type?: "explain" | "optimize";
}

function SkeletonBlock() {
    return (
        <div className="space-y-2">
            <div className="h-4 w-full bg-white/10 rounded animate-pulse" />
            <div className="h-4 w-5/6 bg-white/10 rounded animate-pulse" />
            <div className="h-4 w-4/5 bg-white/10 rounded animate-pulse" />
        </div>
    );
}

function isExplanation(obj: any): obj is BuildExplanation {
    return "summary" in obj;
}

export default function AIExplainPanel({ explanation, loading, type = "explain" }: AIExplainPanelProps) {
    const title = type === "explain" ? "AI Build Analysis" : "AI Optimization Report";

    return (
        <Card className="bg-card border-white/10 overflow-hidden">
            <CardHeader className="pb-3 border-b border-white/5">
                <CardTitle className="text-base flex items-center gap-2">
                    <span>{title}</span>
                    {loading && <span className="text-xs text-muted-foreground animate-pulse">Generating…</span>}
                </CardTitle>
            </CardHeader>

            <CardContent className="pt-4">
                {loading && <SkeletonBlock />}

                <AnimatePresence mode="wait">
                    {!loading && explanation && (
                        <motion.div
                            key={type}
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.3 }}
                            className="space-y-4"
                        >
                            {isExplanation(explanation) ? (
                                <>
                                    <p className="text-sm text-muted-foreground leading-relaxed">
                                        {explanation.summary}
                                    </p>

                                    {explanation.strengths?.length > 0 && (
                                        <div>
                                            <p className="text-xs text-emerald-400 font-semibold uppercase tracking-wider mb-2">Strengths</p>
                                            <ul className="space-y-1">
                                                {explanation.strengths.map((s, i) => (
                                                    <li key={i} className="text-xs text-muted-foreground flex gap-2">
                                                        <span className="text-emerald-500 mt-0.5">✓</span>
                                                        <span>{s}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    {explanation.weaknesses?.length > 0 && (
                                        <div>
                                            <p className="text-xs text-amber-400 font-semibold uppercase tracking-wider mb-2">Weaknesses</p>
                                            <ul className="space-y-1">
                                                {explanation.weaknesses.map((w, i) => (
                                                    <li key={i} className="text-xs text-muted-foreground flex gap-2">
                                                        <span className="text-amber-500 mt-0.5">!</span>
                                                        <span>{w}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                                        <p className="text-xs text-primary font-semibold uppercase tracking-wider mb-1">Verdict</p>
                                        <p className="text-sm text-muted-foreground">{explanation.verdict}</p>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="flex items-center justify-between">
                                        <p className="text-sm font-medium">{explanation.overallRating}</p>
                                    </div>
                                    <p className="text-sm text-muted-foreground">{explanation.bottleneckAssessment}</p>

                                    {explanation.upgradeRecommendations?.length > 0 && (
                                        <div>
                                            <p className="text-xs text-primary font-semibold uppercase tracking-wider mb-2">Recommendations</p>
                                            <ul className="space-y-1">
                                                {explanation.upgradeRecommendations.map((r, i) => (
                                                    <li key={i} className="text-xs text-muted-foreground leading-relaxed flex gap-2">
                                                        <span className="text-primary mt-0.5">→</span>
                                                        <span>{r}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
                                        <p className="text-xs text-emerald-400 font-semibold uppercase tracking-wider mb-1">Budget Advice</p>
                                        <p className="text-sm text-muted-foreground">{explanation.budgetAdvice}</p>
                                    </div>
                                </>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>

                {!loading && !explanation && (
                    <p className="text-xs text-muted-foreground">Select your build components to generate AI insights.</p>
                )}
            </CardContent>
        </Card>
    );
}
