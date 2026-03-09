"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/components/features/auth/AuthProvider";
import { motion } from "framer-motion";
import {
    Activity, ArrowLeft, Cpu, Gamepad2, Monitor,
    Briefcase, ShieldCheck, Zap, TrendingUp,
    AlertTriangle, CheckCircle2, Clock
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AnalysisResultsPanel } from "@/components/builder/AnalysisResultsPanel";
import { LiveIntelligencePanel } from "@/components/builder/LiveIntelligencePanel";
import { Lightbulb } from "lucide-react";

export default function ReportDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();
    const [report, setReport] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchReport = async () => {
            if (authLoading || !user) return;
            try {
                const token = await user.getIdToken();
                // useParams returns a string or string array, ensure it's a string
                const reportId = Array.isArray(params.id) ? params.id[0] : params.id;
                const res = await fetch(`/api/reports/${reportId}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const data = await res.json();
                if (res.ok && data.report) {
                    setReport(data.report);
                } else {
                    router.push("/reports");
                }
            } catch (err) {
                console.error("Failed to fetch report detail", err);
                router.push("/reports");
            } finally {
                setLoading(false);
            }
        };
        fetchReport();
    }, [user, authLoading, params.id, router]);

    if (loading || !report) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                <p className="text-muted-foreground animate-pulse">Decrypting intelligence report...</p>
            </div>
        );
    }

    const engineSnapshot = report.engineSnapshot;
    const content = report.reportJson || report.content || {};
    const aiContent = content;

    // Helper for staggered animation
    const stagger = (i: number) => ({
        initial: { opacity: 0, y: 20 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.4, delay: 0.1 * i, ease: "easeOut" as const }
    });

    return (
        <div className="space-y-8 max-w-5xl mx-auto w-full pb-12 pt-4">
            <Button variant="ghost" className="mb-4 pl-0" onClick={() => router.push("/reports")}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Reports
            </Button>

            <div className="border-b border-border/50 pb-8 mb-8">
                <div className="flex items-center gap-2 text-primary mb-3">
                    <Activity className="w-5 h-5" />
                    <span className="font-bold tracking-widest uppercase text-xs">Deep Intelligence Analysis</span>
                </div>
                <h1 className="text-4xl font-extrabold tracking-tight mb-4">
                    {report.buildName || "Untitled Build"}
                </h1>
                <p className="text-xl text-muted-foreground">
                    {report.summary || aiContent.executiveSummary}
                </p>
                <div className="flex items-center gap-4 mt-6 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1.5 bg-neutral-900/50 px-3 py-1.5 rounded-md border border-white/5">
                        <Clock className="w-4 h-4" />
                        {new Date(report.createdAt?._seconds ? report.createdAt._seconds * 1000 : report.createdAt).toLocaleDateString("en-US", { year: 'numeric', month: 'long', day: 'numeric' })}
                    </div>
                    {aiContent.isFallback && (
                        <div className="flex items-center gap-1.5 bg-amber-500/10 text-amber-500 px-3 py-1.5 rounded-md border border-amber-500/20">
                            <AlertTriangle className="w-4 h-4" />
                            Fallback Report Mode
                        </div>
                    )}
                </div>
            </div>

            {/* ── ENGINE SNAPSHOT METRICS ── */}
            {engineSnapshot && (
                <div className="space-y-6 mb-16 relative">
                    <div className="absolute -inset-4 bg-primary/5 rounded-[2.5rem] -z-10 blur-xl opacity-50"></div>

                    <LiveIntelligencePanel analysis={engineSnapshot} buildComplete={true} />

                    <AnalysisResultsPanel analysis={engineSnapshot} isLoading={false} />

                    {engineSnapshot.optimizationHints && engineSnapshot.optimizationHints.length > 0 && (
                        <motion.div {...stagger(2)} className="p-6 rounded-3xl bg-neutral-900 border border-neutral-800">
                            <div className="flex items-center gap-2 mb-4">
                                <Lightbulb className="w-4 h-4 text-primary" />
                                <h3 className="font-bold uppercase tracking-widest text-xs">Optimization Hints</h3>
                            </div>
                            <div className="space-y-2">
                                {engineSnapshot.optimizationHints.map((hint: string, idx: number) => (
                                    <div key={idx} className="flex gap-3 text-sm text-neutral-300 bg-neutral-800/30 p-3 rounded-xl border border-white/5">
                                        <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                                        <span>{hint}</span>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    )}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* ── LEFT COLUMN ── */}
                <div className="space-y-8">

                    {/* Component Deep Dive */}
                    {content.componentDeepDive && (
                        <motion.section {...stagger(1)} className="space-y-4">
                            <h2 className="text-lg font-bold uppercase tracking-widest flex items-center gap-2 border-b border-white/10 pb-2">
                                <Cpu className="w-5 h-5 text-primary" />
                                Component Deep Dive
                            </h2>
                            <div className="space-y-5">
                                {Object.entries(content.componentDeepDive).map(([key, desc]) => (
                                    <div key={key}>
                                        <h3 className="text-xs font-black uppercase text-neutral-500 mb-1">{key}</h3>
                                        <p className="text-sm text-neutral-200 leading-relaxed font-medium">
                                            {desc as React.ReactNode}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </motion.section>
                    )}

                    {/* Productivity Breakdown */}
                    {content.productivityBreakdown && (
                        <motion.section {...stagger(2)} className="space-y-4">
                            <h2 className="text-lg font-bold uppercase tracking-widest flex items-center gap-2 border-b border-white/10 pb-2">
                                <Briefcase className="w-5 h-5 text-primary" />
                                Workstation & Productivity
                            </h2>
                            <div className="space-y-4">
                                {Object.entries(content.productivityBreakdown).map(([key, desc]) => (
                                    <div key={key} className="bg-neutral-900/50 p-4 rounded-xl border border-white/5">
                                        <h3 className="text-xs font-black uppercase text-primary mb-1">{key.replace(/([A-Z])/g, ' $1').trim()}</h3>
                                        <p className="text-sm text-neutral-300">
                                            {desc as React.ReactNode}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </motion.section>
                    )}
                </div>

                {/* ── RIGHT COLUMN ── */}
                <div className="space-y-8">

                    {/* Gaming Analysis */}
                    {content.gamingAnalysis && (
                        <motion.section {...stagger(3)} className="space-y-4">
                            <h2 className="text-lg font-bold uppercase tracking-widest flex items-center gap-2 border-b border-white/10 pb-2">
                                <Gamepad2 className="w-5 h-5 text-primary" />
                                Gaming Performance
                            </h2>
                            <div className="grid grid-cols-1 gap-3">
                                {Object.entries(content.gamingAnalysis).map(([res, desc]) => (
                                    <div key={res} className="bg-neutral-900/50 p-4 rounded-xl border border-white/5">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Monitor className="w-4 h-4 text-neutral-500" />
                                            <span className="font-bold text-sm uppercase">{res}</span>
                                        </div>
                                        <p className="text-sm text-neutral-300">
                                            {desc as React.ReactNode}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </motion.section>
                    )}

                    {/* Future Proofing */}
                    {content.futureProofing && (
                        <motion.section {...stagger(4)} className="space-y-4">
                            <h2 className="text-lg font-bold uppercase tracking-widest flex items-center gap-2 border-b border-white/10 pb-2">
                                <TrendingUp className="w-5 h-5 text-primary" />
                                Future Proofing
                            </h2>
                            <div className="space-y-4 pl-2 border-l-2 border-primary/20">
                                {Object.entries(content.futureProofing).map(([timeline, desc]) => (
                                    <div key={timeline} className="relative pl-4">
                                        <div className="absolute -left-[27px] top-1 w-3 h-3 bg-neutral-950 border-2 border-primary rounded-full"></div>
                                        <h3 className="text-xs font-black uppercase text-neutral-400 mb-1">{timeline.replace('year', 'Year ')}</h3>
                                        <p className="text-sm text-neutral-300">
                                            {desc as React.ReactNode}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </motion.section>
                    )}

                    {/* Power, Bottlenecks & Market */}
                    <motion.section {...stagger(5)} className="space-y-4">
                        <h2 className="text-lg font-bold uppercase tracking-widest flex items-center gap-2 border-b border-white/10 pb-2">
                            <ShieldCheck className="w-5 h-5 text-primary" />
                            System Integrity
                        </h2>
                        <div className="space-y-4">
                            {content.bottleneckAnalysis && (
                                <div className="bg-neutral-900/50 p-4 rounded-xl border border-white/5">
                                    <h3 className="text-xs font-black uppercase text-neutral-500 mb-1">Bottleneck Analysis</h3>
                                    <p className="text-sm text-neutral-300">{content.bottleneckAnalysis}</p>
                                </div>
                            )}
                            {content.powerAndThermals && (
                                <div className="bg-neutral-900/50 p-4 rounded-xl border border-white/5">
                                    <h3 className="text-xs font-black uppercase text-neutral-500 mb-1">Power & Thermals</h3>
                                    <p className="text-sm text-neutral-300">{content.powerAndThermals}</p>
                                </div>
                            )}
                            {content.marketValueAssessment && (
                                <div className="bg-neutral-900/50 p-4 rounded-xl border border-white/5">
                                    <h3 className="text-xs font-black uppercase text-neutral-500 mb-1">Market Value</h3>
                                    <p className="text-sm text-neutral-300">{content.marketValueAssessment}</p>
                                </div>
                            )}
                        </div>
                    </motion.section>
                </div>
            </div>

            {/* Final Recommendation */}
            {content.finalRecommendation && (
                <motion.div {...stagger(6)} className="mt-12 p-8 rounded-3xl bg-primary/10 border border-primary/20 text-center max-w-3xl mx-auto">
                    <CheckCircle2 className="w-12 h-12 text-primary mx-auto mb-4" />
                    <h3 className="text-xl font-bold mb-3">Final Recommendation</h3>
                    <p className="text-lg text-primary-200">
                        {content.finalRecommendation}
                    </p>
                </motion.div>
            )}
        </div>
    );
}
