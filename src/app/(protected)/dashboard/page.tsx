"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trash2, AlertCircle, CheckCircle, XCircle, Sparkles, Lock, Zap, Share2, Link2Off, Copy } from "lucide-react";
import { SectionContainer } from "@/components/ui/SectionContainer";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useBuildStore } from "@/store/useBuildStore";
import { isFeatureEnabled } from "@/lib/featureFlags";
import { useAuth } from "@/components/features/auth/AuthProvider";

function Badge({ children, variant = "default", className = "" }: any) {
    let bg = "bg-primary/20 text-primary border-primary/20";
    if (variant === "secondary") bg = "bg-secondary text-secondary-foreground";
    if (variant === "outline") bg = "border border-white/5 text-muted-foreground";
    if (variant === "destructive") bg = "bg-red-500/20 text-red-500 border-red-500/20";
    if (variant === "success") bg = "bg-green-500/20 text-green-500 border-green-500/20";
    return (
        <span className={`inline-flex items-center justify-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors ${bg} ${className}`}>
            {children}
        </span>
    );
}

interface AIExplanation {
    summary: string;
    strengths: string[];
    weaknesses: string[];
    verdict: string;
}

export default function DashboardPage() {
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();
    const [builds, setBuilds] = useState<any[]>([]);
    const [plan, setPlan] = useState<string>("free");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [aiUsage, setAiUsage] = useState<{ count: number, limit: number } | null>(null);

    // AI Modal State
    const [explainingId, setExplainingId] = useState<string | null>(null);
    const [explanation, setExplanation] = useState<AIExplanation | null>(null);

    const [optimizingId, setOptimizingId] = useState<string | null>(null);
    const [reportingId, setReportingId] = useState<string | null>(null);

    // Sharing State
    const [sharingId, setSharingId] = useState<string | null>(null);
    const [disablingShareId, setDisablingShareId] = useState<string | null>(null);

    const handleLoad = async (buildId: string) => {
        try {
            const res = await fetch(`/api/build/get/${buildId}`);
            const data = await res.json();

            if (!res.ok) {
                alert("Failed to load build");
                return;
            }

            const build = data.build;

            const {
                resetBuild,
                setCpu,
                setGpu,
                setMotherboard,
                setRam,
                setStorage,
                setPsu,
            } = useBuildStore.getState();

            resetBuild();
            setCpu(build.cpu ?? null);
            setGpu(build.gpu ?? null);
            setMotherboard(build.motherboard ?? null);
            setRam(build.ram ?? null);
            setStorage(build.storage ?? null);
            setPsu(build.psu ?? null);

            router.push("/builder");
        } catch (err) {
            console.error("Load build failed:", err);
            alert("Failed to load build");
        }
    };

    // Fetch initial list
    useEffect(() => {
        const fetchBuilds = async () => {
            try {
                if (authLoading) return;
                if (!user) {
                    router.push("/login");
                    return;
                }

                const token = await user.getIdToken();
                const res = await fetch("/api/build/list", {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });
                if (!res.ok) {
                    if (res.status === 401) {
                        router.push("/login"); // Token likely expired
                        return;
                    }
                    throw new Error("Failed to load builds");
                }
                const data = await res.json();
                setBuilds(data.builds);
                setPlan(data.plan || "free");
                if (data.aiUsage) setAiUsage(data.aiUsage);
            } catch (err: any) {
                setError(err.message);
                console.error("Dashboard error:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchBuilds();
    }, [authLoading, router, user]);

    // Handle delete action
    const handleDelete = async (id: string) => {
        // Optimistic UI Removal
        const previousBuilds = [...builds];
        setBuilds(prev => prev.filter(b => b.id !== id));

        try {
            const res = await fetch(`/api/build/delete/${id}`, { method: "DELETE" });
            if (!res.ok) {
                throw new Error("Failed to delete build");
            }
        } catch (err) {
            console.error("Delete failed:", err);
            setBuilds(previousBuilds); // Revert on failure
            alert("Sorry, we couldn't delete that build. Please try again.");
        }
    };

    // Handle AI Explanation
    const handleExplain = async (buildId: string, existingExplanation?: string) => {
        if (existingExplanation) {
            let parsedExplanation: AIExplanation;
            try {
                parsedExplanation =
                    typeof existingExplanation === "string"
                        ? JSON.parse(existingExplanation)
                        : (existingExplanation as unknown as AIExplanation);
            } catch {
                parsedExplanation = {
                    summary: existingExplanation || "AI explanation unavailable.",
                    strengths: [],
                    weaknesses: [],
                    verdict: ""
                };
            }
            setExplanation(parsedExplanation);
            return;
        }

        setExplainingId(buildId);
        try {
            const res = await fetch(`/api/ai/explain/${buildId}`, { method: "POST" });
            const data = await res.json();

            let parsedExplanation: AIExplanation;

            try {
                parsedExplanation =
                    typeof data.explanation === "string"
                        ? JSON.parse(data.explanation)
                        : data.explanation;
            } catch {
                parsedExplanation = {
                    summary: data.explanation || "AI explanation unavailable.",
                    strengths: [],
                    weaknesses: [],
                    verdict: ""
                };
            }

            if (!res.ok) {
                if (res.status === 403 && data.error === "AI_LIMIT_REACHED") {
                    alert("Warning: " + data.message);
                } else {
                    throw new Error(data.message || "Failed to generate explanation");
                }
                return;
            }

            // Update local state to reflect the new explanation so it doesn't re-fetch immediately on click
            setBuilds(prev => prev.map((b) => {
                if (b.id !== buildId) return b;

                const freshRecommendedPSU = data.analysis?.power?.recommendedPSU;
                return {
                    ...b,
                    ai: { explanation: data.explanation },
                    latestAnalysis: data.analysis,
                    engineResult: {
                        ...b.engineResult,
                        power: {
                            ...b.engineResult?.power,
                            recommendedPSU: freshRecommendedPSU ?? b.engineResult?.power?.recommendedPSU,
                        },
                    },
                };
            }));
            setExplanation(parsedExplanation);
        } catch (err: any) {
            console.error("Explanation failed:", err);
            alert("Error: " + err.message);
        } finally {
            setExplainingId(null);
        }
    };

    const handleGenerateReport = async (buildId: string, hasExistingReport: boolean) => {
        if (hasExistingReport) {
            router.push(`/build-report/${buildId}`);
            return;
        }
        setReportingId(buildId);
        try {
            const res = await fetch(`/api/ai/generate-build-report/${buildId}`, { method: "POST" });
            const data = await res.json();

            if (!res.ok) {
                if (res.status === 403) {
                    alert(data.message || "Report limit reached");
                } else {
                    throw new Error(data.message || "Failed to generate report");
                }
                return;
            }

            setBuilds((prev) => prev.map((b) => b.id === buildId ? { ...b, technicalReportHash: data.engineSnapshotHash || "present" } : b));
            router.push(`/build-report/${data.reportId}`);
        } catch (err: any) {
            console.error("Report generation failed:", err);
            alert("Failed to generate report");
        } finally {
            setReportingId(null);
        }
    };

    // Handle Optimized Build Generation (Premium)
    const handleGenerateOptimized = async (buildId: string) => {
        if (!isFeatureEnabled("OPTIMIZE_BUILD", plan)) {
            router.push("/upgrade");
            return;
        }

        setOptimizingId(buildId);
        try {
            const res = await fetch(`/api/ai/generate-optimized-build/${buildId}`, { method: "POST" });
            const data = await res.json();

            if (!res.ok) {
                if (res.status === 403 && data.error === "PREMIUM_REQUIRED") {
                    router.push("/upgrade");
                } else {
                    throw new Error(data.message || "Optimization failed");
                }
                return;
            }

            const { resetBuild, setBuild } = useBuildStore.getState();
            resetBuild();
            setBuild(data.optimizedBuild);

            const originalScores = data.originalScores || {};
            const newScores = data.newScores || {};
            const priceDelta = Number(data.priceDelta || 0);
            const gamingDelta = Number(newScores?.scores?.gaming || 0) - Number(originalScores?.scores?.gaming || 0);
            const futureDelta = Number(newScores?.scores?.futureProof || 0) - Number(originalScores?.scores?.futureProof || 0);
            const params = new URLSearchParams({
                optimized: "1",
                gamingDelta: String(Math.round(gamingDelta)),
                futureDelta: String(Math.round(futureDelta)),
                budgetDelta: String(Math.round(priceDelta)),
            });

            router.push(`/builder?${params.toString()}`);
            setAiUsage(prev => prev ? { ...prev, count: prev.count + 1 } : prev);
        } catch (err: any) {
            console.error("Optimization failed:", err);
            alert("Optimization failed");
        } finally {
            setOptimizingId(null);
        }
    };

    // Handle Share Generation
    const handleShare = async (buildId: string) => {
        setSharingId(buildId);
        try {
            const res = await fetch(`/api/build/share/${buildId}`, { method: "POST" });
            const data = await res.json();

            if (!res.ok) throw new Error(data.message || "Failed to make public.");

            setBuilds(prev => prev.map(b => b.id === buildId ? { ...b, isPublic: true, publicId: data.publicId } : b));
        } catch (err: any) {
            console.error("Share failed:", err);
            alert("Error: " + err.message);
        } finally {
            setSharingId(null);
        }
    };

    // Handle Copy to Clipboard
    const handleCopyLink = (publicId: string) => {
        const url = `${window.location.origin}/build/share/${publicId}`;
        navigator.clipboard.writeText(url);
        alert("Public link copied to clipboard!");
    };

    // Handle Disable Sharing
    const handleDisableShare = async (buildId: string) => {
        setDisablingShareId(buildId);
        try {
            const res = await fetch(`/api/build/share/${buildId}`, { method: "DELETE" });
            const data = await res.json();

            if (!res.ok) throw new Error(data.message || "Failed to disable sharing.");

            setBuilds(prev => prev.map(b => b.id === buildId ? { ...b, isPublic: false, publicId: null } : b));
        } catch (err: any) {
            console.error("Disable share failed:", err);
            alert("Error: " + err.message);
        } finally {
            setDisablingShareId(null);
        }
    };

    if (loading) {
        return (
            <SectionContainer className="py-16 md:py-24">
                <div className="flex flex-col items-center justify-center space-y-4">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                    <p className="text-muted-foreground animate-pulse">Loading dashboard...</p>
                </div>
            </SectionContainer>
        );
    }

    if (error) {
        return (
            <SectionContainer className="py-16 md:py-24 text-center">
                <div className="bg-red-500/10 border border-red-500/20 p-6 rounded-xl inline-block max-w-lg">
                    <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-4" />
                    <h2 className="text-xl font-bold mb-2">Error Loading Dashboard</h2>
                    <p className="text-muted-foreground mb-6">{error}</p>
                    <Button onClick={() => window.location.reload()}>Try Again</Button>
                </div>
            </SectionContainer>
        );
    }

    const isLimitReached = plan === "free" && builds.length >= 3;
    const hasAiOverview = isFeatureEnabled("AI_FULL_OVERVIEW", plan);
    const hasOptimize = isFeatureEnabled("OPTIMIZE_BUILD", plan);
    const isAiLimitReached = hasAiOverview && aiUsage ? aiUsage.count >= aiUsage.limit : false;

    return (
        <div className="min-h-screen bg-background text-foreground pb-24">
            <SectionContainer className="py-12 md:py-16 space-y-8">

                {/* Header Sequence */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-white/5 pb-8 mb-8">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Your Builds</h1>
                            {plan === "free" ? (
                                <Badge variant="secondary" className="uppercase tracking-widest text-[10px]">Free Plan</Badge>
                            ) : (
                                <Badge variant="success" className="uppercase tracking-widest text-[10px] bg-primary/20 text-primary border-primary/20">Premium Plan</Badge>
                            )}

                            {hasAiOverview && aiUsage && (
                                <Badge variant={isAiLimitReached ? "destructive" : "outline"} className="uppercase tracking-widest text-[10px]">
                                    AI Usage: {aiUsage.count} / {aiUsage.limit}
                                </Badge>
                            )}
                        </div>
                        <p className="text-muted-foreground md:text-lg">View, analyze, and manage your saved PC configurations.</p>
                    </div>
                    <Button
                        variant="premium"
                        onClick={() => router.push("/builder")}
                        disabled={isLimitReached}
                        className="w-full md:w-auto"
                    >
                        Create New Build
                    </Button>
                </div>

                {/* Free Plan Warning Message */}
                {isLimitReached && (
                    <div className="bg-primary/10 border border-primary/20 text-primary-foreground p-4 rounded-lg flex items-start gap-4 mb-8">
                        <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-primary" />
                        <div>
                            <h4 className="font-semibold text-primary">Free plan limit reached.</h4>
                            <p className="text-sm opacity-90 mt-1">You can save up to 3 builds on the entry tier. Upgrade to unlock unlimited saves, advanced analysis, and priority engine updates.</p>
                            <Button
                                variant="outline"
                                size="sm"
                                className="mt-4 border-primary/50 text-white hover:bg-primary/20 hover:text-white"
                                onClick={() => router.push("/upgrade")}
                            >
                                Compare Plans
                            </Button>
                        </div>
                    </div>
                )}

                {/* Empty State */}
                {builds.length === 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center py-24 bg-card/50 border border-dashed border-white/10 rounded-2xl"
                    >
                        <h3 className="text-2xl font-bold mb-2 text-foreground">Your builds will appear here</h3>
                        <p className="text-muted-foreground mb-8">Start creating your first configuration to instantly detect bottlenecks and ensure hardware compatibility.</p>
                        <Button variant="outline" className="h-12 px-8" onClick={() => router.push("/builder")}>
                            Launch Builder UI
                        </Button>
                    </motion.div>
                )}

                {/* Build Grid Matrix */}
                {builds.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {builds.map((build, index) => {
                            const { engineResult, createdAt, id } = build;
                            const d = new Date(createdAt);
                            const parsedDate = !isNaN(d.valueOf()) ? d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Recently";

                            return (
                                <motion.div
                                    key={id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.05 }}
                                    className="group h-full flex flex-col"
                                >
                                    <Card className="h-full flex flex-col bg-card hover:bg-card/80 transition-all border-white/10 hover:border-primary/50 relative overflow-hidden group-hover:shadow-[0_0_30px_-10px_rgba(168,85,247,0.2)]">
                                        <CardHeader className="pb-4 relative z-10 border-b border-white/5 bg-black/20">
                                            <div className="flex justify-between items-start mb-2">
                                                <Badge variant="outline" className="text-xs bg-black">{parsedDate}</Badge>
                                                <Badge variant={engineResult?.compatibility?.isValid ? "success" : "destructive"}>
                                                    {engineResult?.compatibility?.isValid ? (
                                                        <span className="flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Valid</span>
                                                    ) : (
                                                        <span className="flex items-center gap-1"><XCircle className="w-3 h-3" /> Invalid</span>
                                                    )}
                                                </Badge>
                                            </div>
                                            <CardTitle className="text-2xl font-bold flex items-baseline gap-2">
                                                {engineResult?.metrics?.performanceScore || "0"}
                                                <span className="text-sm font-medium text-muted-foreground uppercase tracking-widest">
                                                    Score
                                                </span>
                                            </CardTitle>
                                        </CardHeader>

                                        <CardContent className="pt-6 relative z-10 flex-1 space-y-4">

                                            {/* Data Listing */}
                                            <div className="flex justify-between items-center text-sm">
                                                <span className="text-muted-foreground">Performance Tier</span>
                                                <span className="font-medium text-foreground capitalize px-2 py-0.5 bg-white/5 rounded">
                                                    {engineResult?.metrics?.tier || "Unknown"}
                                                </span>
                                            </div>

                                            <div className="flex justify-between items-center text-sm">
                                                <span className="text-muted-foreground">Bottleneck Severity</span>
                                                <span className={`font-medium capitalize px-2 py-0.5 rounded ${engineResult?.bottleneck?.severity === "high" ? "bg-red-500/20 text-red-500" :
                                                    engineResult?.bottleneck?.severity === "moderate" ? "bg-amber-500/20 text-amber-500" :
                                                        "bg-green-500/20 text-green-500"
                                                    }`}>
                                                    {engineResult?.bottleneck?.severity || "Low"} ({engineResult?.bottleneck?.percentage}%)
                                                </span>
                                            </div>

                                            <div className="flex justify-between items-center text-sm">
                                                <span className="text-muted-foreground">Suggested PSU</span>
                                                <span className="font-medium text-foreground">
                                                    {(build.latestAnalysis?.power?.recommendedPSU ?? engineResult?.power?.recommendedPSU ?? 0)}W
                                                </span>
                                            </div>

                                        </CardContent>

                                        <CardFooter className="pt-4 border-t border-white/5 flex gap-2 relative z-10 bg-black/20 flex-wrap">
                                            <div className="flex w-full gap-2">
                                                <Button
                                                    variant="outline"
                                                    className="flex-1 bg-transparent hover:bg-white/5 hover:text-white px-2"
                                                    onClick={() => handleLoad(id)}
                                                >
                                                    Load Data
                                                </Button>
                                                <Button
                                                    variant="destructive"
                                                    size="icon"
                                                    className="shrink-0 bg-red-500/10 text-red-500 hover:bg-red-500/20 hover:text-red-400 border border-red-500/20 px-2"
                                                    onClick={() => handleDelete(id)}
                                                    aria-label="Delete build"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                            <Button
                                                variant="premium"
                                                className="w-full"
                                                onClick={() => handleExplain(id, build.ai?.explanation)}
                                                disabled={explainingId === id}
                                            >
                                                {explainingId === id ? (
                                                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/80 border-t-transparent mr-2" />
                                                ) : (
                                                    <Sparkles className="w-4 h-4 mr-2" />
                                                )}
                                                {explainingId === id ? "Analyzing..." : (build.ai?.explanation ? "View Explanation" : "Explain Build")}
                                            </Button>

                                            <Button
                                                variant={hasOptimize ? "outline" : "secondary"}
                                                className={`w-full ${!hasOptimize ? "opacity-90 hover:opacity-100 border-dashed border-primary/20 bg-primary/5 text-primary" : "border-white/10 hover:bg-white/5 hover:text-white"}`}
                                                onClick={() => handleGenerateOptimized(id)}
                                                disabled={optimizingId === id || (hasOptimize && isAiLimitReached)}
                                            >
                                                {optimizingId === id ? (
                                                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/80 border-t-transparent mr-2" />
                                                ) : !hasOptimize ? (
                                                    <Lock className="w-4 h-4 mr-2" />
                                                ) : (
                                                    <Zap className="w-4 h-4 mr-2 text-yellow-500" />
                                                )}
                                                {optimizingId === id
                                                    ? "Generating..."
                                                    : !hasOptimize
                                                        ? "⚡ Generate Optimized Build"
                                                        : "⚡ Generate Optimized Build"
                                                }
                                            </Button>

                                            <Button
                                                variant="outline"
                                                className="w-full border-white/10 hover:bg-white/5 hover:text-white"
                                                onClick={() => handleGenerateReport(id, Boolean(build.technicalReportHash))}
                                                disabled={reportingId === id}
                                            >
                                                {reportingId === id ? (
                                                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/80 border-t-transparent mr-2" />
                                                ) : (
                                                    <span className="mr-2">📘</span>
                                                )}
                                                {reportingId === id ? "Generating..." : (build.technicalReportHash ? "View Technical Report" : "Generate Technical Report")}
                                            </Button>

                                            {/* Sharing Layer */}
                                            {build.isPublic ? (
                                                <div className="flex w-full gap-2">
                                                    <Button
                                                        variant="outline"
                                                        className="flex-1 bg-green-500/10 hover:bg-green-500/20 text-green-500 border-green-500/20"
                                                        onClick={() => handleCopyLink(build.publicId)}
                                                    >
                                                        <Copy className="w-4 h-4 mr-2" />
                                                        Copy Link
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        className="flex-1 bg-red-500/10 hover:bg-red-500/20 text-red-500 border-red-500/20"
                                                        onClick={() => handleDisableShare(id)}
                                                        disabled={disablingShareId === id}
                                                    >
                                                        {disablingShareId === id ? (
                                                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-red-500/80 border-t-transparent mr-2" />
                                                        ) : (
                                                            <Link2Off className="w-4 h-4 mr-2" />
                                                        )}
                                                        Unpublish
                                                    </Button>
                                                </div>
                                            ) : (
                                                <Button
                                                    variant="outline"
                                                    className="w-full border-white/10 hover:bg-white/5 hover:text-white"
                                                    onClick={() => handleShare(id)}
                                                    disabled={sharingId === id}
                                                >
                                                    {sharingId === id ? (
                                                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/80 border-t-transparent mr-2" />
                                                    ) : (
                                                        <Share2 className="w-4 h-4 mr-2" />
                                                    )}
                                                    Make Public
                                                </Button>
                                            )}
                                        </CardFooter>
                                    </Card>
                                </motion.div>
                            );
                        })}
                    </div>
                )}
            </SectionContainer>

            {/* AI Explanation Modal */}
            <AnimatePresence>
                {explanation && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            className="w-full max-w-3xl bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl flex flex-col max-h-[90vh]"
                        >
                            <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
                                <h2 className="text-xl font-semibold text-white">
                                    ✨ AI Build Analysis
                                </h2>
                                <button
                                    onClick={() => setExplanation(null)}
                                    className="text-zinc-400 hover:text-white transition-colors"
                                >
                                    ✕
                                </button>
                            </div>
                            <div className="px-6 py-6 overflow-y-auto flex-1">
                                <div className="space-y-8 text-sm">
                                    <div className="p-6 rounded-xl bg-zinc-900 border border-zinc-800">
                                        <h3 className="text-lg font-semibold mb-3 text-white">
                                            🧠 Summary
                                        </h3>
                                        <p className="text-gray-300 leading-relaxed">
                                            {explanation.summary}
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="p-6 rounded-xl bg-green-950/30 border border-green-700/40">
                                            <h3 className="text-lg font-semibold mb-3 text-green-400">
                                                ✅ Strengths
                                            </h3>
                                            <ul className="space-y-2 text-gray-300">
                                                {explanation.strengths?.map((s, i) => (
                                                    <li key={i} className="flex gap-2">
                                                        <span className="text-green-400">•</span>
                                                        <span>{s}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>

                                        <div className="p-6 rounded-xl bg-yellow-950/30 border border-yellow-700/40">
                                            <h3 className="text-lg font-semibold mb-3 text-yellow-400">
                                                ⚠ Weaknesses
                                            </h3>
                                            <ul className="space-y-2 text-gray-300">
                                                {explanation.weaknesses?.map((w, i) => (
                                                    <li key={i} className="flex gap-2">
                                                        <span className="text-yellow-400">•</span>
                                                        <span>{w}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>

                                    <div className="p-6 rounded-xl bg-purple-950/30 border border-purple-700/40">
                                        <h3 className="text-lg font-semibold mb-3 text-purple-400">
                                            📌 Final Verdict
                                        </h3>
                                        <p className="text-gray-300 leading-relaxed">
                                            {explanation.verdict}
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <div className="px-6 py-4 border-t border-zinc-800 flex justify-end">
                                <button
                                    onClick={() => setExplanation(null)}
                                    className="px-4 py-2 rounded-lg border border-zinc-700 hover:bg-zinc-800 text-white"
                                >
                                    Close
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

        </div>
    );
}
