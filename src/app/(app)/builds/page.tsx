"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trash2, AlertCircle, CheckCircle, XCircle, Sparkles, Lock, Zap, Share2, Link2Off, Copy, Cpu, HardDrive, MemoryStick, FileText, MonitorSmartphone } from "lucide-react";
import { SectionContainer } from "@/components/ui/SectionContainer";
import { Card } from "@/components/ui/card";
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

interface SubscriptionState {
    plan: string;
    subscriptionStatus: "active" | "inactive" | "cancelled" | "expired" | "past_due";
    aiUsage: number;
    aiLimit: number;
}

export default function DashboardPage() {
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();
    const [builds, setBuilds] = useState<any[]>([]);
    const [subscription, setSubscription] = useState<SubscriptionState | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    // buildId → reportId map — populated from /api/reports on load
    const [buildIdToReportId, setBuildIdToReportId] = useState<Record<string, string>>({});

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

    // Fetch builds + reports together so we can derive buildId → reportId map
    useEffect(() => {
        const fetchData = async () => {
            try {
                if (authLoading) return;
                if (!user) {
                    router.push("/login");
                    return;
                }

                const token = await user.getIdToken();
                const [buildsRes, reportsRes] = await Promise.all([
                    fetch("/api/build/list", { headers: { Authorization: `Bearer ${token}` } }),
                    fetch("/api/reports", { headers: { Authorization: `Bearer ${token}` } }),
                ]);

                if (!buildsRes.ok) {
                    if (buildsRes.status === 401) { router.push("/login"); return; }
                    throw new Error("Failed to load builds");
                }

                const buildsData = await buildsRes.json();
                if (!buildsData.subscription) {
                    setError("Subscription state unavailable.");
                    return;
                }

                setBuilds(Array.isArray(buildsData.builds) ? buildsData.builds : []);
                setSubscription({
                    plan: buildsData.subscription.plan || "free",
                    subscriptionStatus: (buildsData.subscription.subscriptionStatus || buildsData.subscription.status || "inactive"),
                    aiUsage: Number(buildsData.subscription.aiUsage || 0),
                    aiLimit: Number(buildsData.subscription.aiLimit || 0),
                });

                // Build the mapping even if reports responds with an error (just silently skip)
                if (reportsRes.ok) {
                    const reportsData = await reportsRes.json();
                    const map: Record<string, string> = {};
                    for (const report of (reportsData.reports || [])) {
                        if (report.buildId && report.id) {
                            // Keep the most recent report if multiple exist for same build
                            if (!map[report.buildId]) {
                                map[report.buildId] = report.id;
                            }
                        }
                    }
                    setBuildIdToReportId(map);
                }
            } catch (err: any) {
                setError(err.message);
                console.error("Dashboard error:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
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

    const handleGenerateReport = async (buildId: string, _ignored?: boolean) => {
        setReportingId(buildId);
        try {
            const token = await user!.getIdToken();
            const res = await fetch(`/api/ai/generate-build-report/${buildId}`, {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();

            if (!res.ok) {
                if (res.status === 403) {
                    alert(data.message || "Report limit reached");
                } else if (data.error === "DATABASE_ERROR") {
                    throw new Error("Report generation temporarily unavailable.");
                } else {
                    throw new Error(data.message || "Failed to generate report");
                }
                return;
            }

            // Update the local map so the button immediately shows "View Report"
            setBuildIdToReportId(prev => ({ ...prev, [buildId]: data.reportId }));
            router.push(`/reports/${data.reportId}`);
        } catch (err: any) {
            console.error("Report generation failed:", err);
            alert(err.message || "Failed to generate report");
        } finally {
            setReportingId(null);
        }
    };


    // Handle Optimized Build Generation (Premium)
    const handleGenerateOptimized = async (buildId: string) => {
        if (!subscription) {
            router.push("/login");
            return;
        }
        const planName = process.env.NEXT_PUBLIC_RAZORPAY_PLAN_NAME || "premium_monthly";
        const isPremium = subscription?.plan === planName && subscription?.subscriptionStatus === "active";
        if (!isPremium) {
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
            setSubscription((prev) =>
                prev ? { ...prev, aiUsage: prev.aiUsage + 1 } : prev
            );
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

    const planName = process.env.NEXT_PUBLIC_RAZORPAY_PLAN_NAME || "premium_monthly";
    const isPremium = subscription?.plan === planName && subscription?.subscriptionStatus === "active";
    const effectivePlan = isPremium ? "premium" : "free";
    const isLimitReached = effectivePlan === "free" && builds.length >= 3;
    const hasAiOverview = isFeatureEnabled("AI_FULL_OVERVIEW", effectivePlan);
    const hasOptimize = isFeatureEnabled("OPTIMIZE_BUILD", effectivePlan);
    const isAiLimitReached = hasAiOverview && subscription ? subscription.aiUsage >= subscription.aiLimit : false;

    return (
        <div className="min-h-screen bg-background text-foreground pb-24">
            <SectionContainer className="py-12 md:py-16 space-y-8">

                {/* Header Sequence */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-white/5 pb-8 mb-8">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Your Builds</h1>
                            {effectivePlan === "free" ? (
                                <Badge variant="secondary" className="uppercase tracking-widest text-[10px]">Free Plan</Badge>
                            ) : (
                                <Badge variant="success" className="uppercase tracking-widest text-[10px] bg-primary/20 text-primary border-primary/20">Premium Plan</Badge>
                            )}

                            {hasAiOverview && subscription && (
                                <Badge variant={isAiLimitReached ? "destructive" : "outline"} className="uppercase tracking-widest text-[10px]">
                                    AI Usage: {subscription.aiUsage} / {subscription.aiLimit}
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

                {/* Build Grid Matrix — Redesigned */}
                {builds.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
                        {builds.map((build, index) => {
                            const { engineResult, createdAt, id } = build;
                            const d = new Date(createdAt);
                            const parsedDate = !isNaN(d.valueOf())
                                ? d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                                : "Recently";

                            // ── Prefer flat top-level denormalized fields; fallback to engineResult ──
                            const score = build.score ?? engineResult?.metrics?.performanceScore ?? engineResult?.scores?.overall ?? "—";
                            const tier = build.tier ?? engineResult?.metrics?.tier ?? "Unknown";
                            const bottleneckPct = build.bottleneck ?? engineResult?.bottleneck?.percentage ?? 0;
                            const bottleneckSev = build.bottleneckSeverity ?? engineResult?.bottleneck?.severity ?? "low";
                            const psu = build.psuRecommendation ?? engineResult?.power?.recommendedPSU ?? 0;

                            // ── Price: flat field → legacy component sum → null ──
                            const legacyComponentPrices = [
                                build.cpu, build.gpu, build.motherboard, build.ram, build.psu,
                                ...(Array.isArray(build.storage) ? build.storage : build.storage ? [build.storage] : []),
                            ].reduce((sum: number, c: any) => {
                                if (!c) return sum;
                                const p = Number(c.price ?? 0);
                                return sum + (isNaN(p) ? 0 : p);
                            }, 0);
                            const price = build.totalPrice || (legacyComponentPrices > 0 ? legacyComponentPrices : null);

                            const isValid = engineResult?.compatibility?.isValid;

                            const bottleneckColor =
                                bottleneckSev === "high" ? "text-red-400" :
                                    bottleneckSev === "moderate" ? "text-amber-400" : "text-emerald-400";

                            const validationBadge = isValid === true
                                ? { label: "Valid", cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" }
                                : isValid === false
                                    ? { label: "Invalid", cls: "bg-red-500/15 text-red-400 border-red-500/30" }
                                    : { label: "Unchecked", cls: "bg-zinc-700/60 text-zinc-400 border-zinc-600/40" };

                            const hasCpu = !!(build.components?.cpuId || build.cpu);
                            const hasGpu = !!(build.components?.gpuId || build.gpu);
                            const hasRam = !!(build.components?.ramId || build.ram);


                            return (
                                <motion.div
                                    key={id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.25, delay: index * 0.04 }}
                                >
                                    <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5 space-y-4 transition-all duration-200 hover:border-zinc-700 hover:scale-[1.02] hover:shadow-[0_0_25px_rgba(120,119,198,0.15)] h-full flex flex-col">

                                        {/* ── HEADER ── */}
                                        <div className="flex items-start justify-between gap-3">
                                            {/* Left: Name + Date */}
                                            <div className="min-w-0">
                                                <h3 className="text-xl font-semibold text-zinc-100 truncate leading-tight">
                                                    {build.name || "Untitled Build"}
                                                </h3>
                                                <p className="text-sm text-zinc-400 mt-0.5">{parsedDate}</p>
                                            </div>
                                            {/* Right: Price + Validation */}
                                            <div className="text-right shrink-0">
                                                {price ? (
                                                    <p className="text-lg font-semibold text-emerald-400 leading-tight">
                                                        ₹{Number(price).toLocaleString("en-IN")}
                                                    </p>
                                                ) : (
                                                    <p className="text-sm text-zinc-500">Price N/A</p>
                                                )}
                                                <span className={`mt-1 inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full border ${validationBadge.cls}`}>
                                                    {isValid === true && <CheckCircle className="w-2.5 h-2.5" />}
                                                    {isValid === false && <XCircle className="w-2.5 h-2.5" />}
                                                    {validationBadge.label}
                                                </span>
                                            </div>
                                        </div>

                                        {/* ── COMPONENT ICONS ── */}
                                        {(hasCpu || hasGpu || hasRam) && (
                                            <div className="flex items-center gap-2">
                                                {hasCpu && (
                                                    <span className="flex items-center gap-1 text-[11px] text-zinc-500 bg-zinc-800/70 px-2 py-1 rounded-md border border-zinc-700/50">
                                                        <Cpu className="w-3 h-3" /> CPU
                                                    </span>
                                                )}
                                                {hasGpu && (
                                                    <span className="flex items-center gap-1 text-[11px] text-zinc-500 bg-zinc-800/70 px-2 py-1 rounded-md border border-zinc-700/50">
                                                        <MonitorSmartphone className="w-3 h-3" /> GPU
                                                    </span>
                                                )}
                                                {hasRam && (
                                                    <span className="flex items-center gap-1 text-[11px] text-zinc-500 bg-zinc-800/70 px-2 py-1 rounded-md border border-zinc-700/50">
                                                        <MemoryStick className="w-3 h-3" /> RAM
                                                    </span>
                                                )}
                                            </div>
                                        )}

                                        {/* ── METRICS ── */}
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="bg-zinc-800/40 rounded-lg px-3 py-2.5 border border-zinc-700/40">
                                                <p className="text-[10px] uppercase tracking-wide text-zinc-500 mb-1">Score</p>
                                                <p className="text-lg font-semibold text-zinc-100 leading-none">{score}</p>
                                            </div>
                                            <div className="bg-zinc-800/40 rounded-lg px-3 py-2.5 border border-zinc-700/40">
                                                <p className="text-[10px] uppercase tracking-wide text-zinc-500 mb-1">Tier</p>
                                                <p className="text-lg font-semibold text-zinc-100 capitalize leading-none truncate">{tier}</p>
                                            </div>
                                            <div className="bg-zinc-800/40 rounded-lg px-3 py-2.5 border border-zinc-700/40">
                                                <p className="text-[10px] uppercase tracking-wide text-zinc-500 mb-1">Bottleneck</p>
                                                <p className={`text-lg font-semibold leading-none ${bottleneckColor}`}>{bottleneckPct}%</p>
                                            </div>
                                            <div className="bg-zinc-800/40 rounded-lg px-3 py-2.5 border border-zinc-700/40">
                                                <p className="text-[10px] uppercase tracking-wide text-zinc-500 mb-1">PSU</p>
                                                <p className="text-lg font-semibold text-zinc-100 leading-none">{psu ? `${psu}W` : "—"}</p>
                                            </div>
                                        </div>

                                        <div className="h-px bg-zinc-800" />

                                        {/* ── ACTIONS ── */}
                                        <div className="space-y-2 mt-auto">
                                            {/* Row 1: Primary */}
                                            <div className="grid grid-cols-2 gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="bg-transparent border-zinc-700 hover:bg-zinc-800 hover:text-white text-zinc-300 text-[13px] w-full"
                                                    onClick={() => handleLoad(id)}
                                                >
                                                    Load Build
                                                </Button>
                                                {(() => {
                                                    const existingReportId = buildIdToReportId[id];
                                                    return (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className={`bg-transparent text-[13px] w-full ${existingReportId
                                                                ? "border-primary/40 text-primary hover:bg-primary/10"
                                                                : "border-zinc-700 hover:bg-zinc-800 hover:text-white text-zinc-300"
                                                                }`}
                                                            disabled={reportingId === id}
                                                            onClick={() => {
                                                                if (existingReportId) {
                                                                    router.push(`/reports/${existingReportId}`);
                                                                } else {
                                                                    handleGenerateReport(id, false);
                                                                }
                                                            }}
                                                        >
                                                            {reportingId === id ? (
                                                                <div className="h-3 w-3 animate-spin rounded-full border-2 border-white/60 border-t-transparent mr-1.5" />
                                                            ) : (
                                                                <FileText className="w-3.5 h-3.5 mr-1.5" />
                                                            )}
                                                            {reportingId === id
                                                                ? "Generating..."
                                                                : existingReportId
                                                                    ? "View Report"
                                                                    : "AI Report"}
                                                        </Button>
                                                    );
                                                })()}
                                            </div>

                                            {/* Row 2: Secondary + Delete */}
                                            <div className="grid grid-cols-2 gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className={`text-[13px] w-full ${!hasOptimize
                                                        ? "text-primary/80 hover:bg-primary/10 hover:text-primary border border-dashed border-primary/20"
                                                        : "text-zinc-400 hover:bg-zinc-800 hover:text-white"
                                                        }`}
                                                    onClick={() => handleGenerateOptimized(id)}
                                                    disabled={optimizingId === id || (hasOptimize && isAiLimitReached)}
                                                >
                                                    {optimizingId === id ? (
                                                        <div className="h-3 w-3 animate-spin rounded-full border-2 border-primary/60 border-t-transparent mr-1.5" />
                                                    ) : !hasOptimize ? (
                                                        <Lock className="w-3 h-3 mr-1.5" />
                                                    ) : (
                                                        <Zap className="w-3 h-3 mr-1.5 text-yellow-500" />
                                                    )}
                                                    {optimizingId === id ? "Optimizing..." : "Optimize"}
                                                </Button>

                                                <div className="flex gap-1.5">
                                                    {/* Share / Copy / Unpublish */}
                                                    {build.isPublic ? (
                                                        <>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="flex-1 text-[13px] text-emerald-500 hover:bg-emerald-500/10"
                                                                onClick={() => handleCopyLink(build.publicId)}
                                                            >
                                                                <Copy className="w-3 h-3 mr-1" /> Copy
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 text-zinc-500 hover:text-red-400 hover:bg-red-500/10"
                                                                onClick={() => handleDisableShare(id)}
                                                                disabled={disablingShareId === id}
                                                            >
                                                                {disablingShareId === id ? (
                                                                    <div className="h-3 w-3 animate-spin rounded-full border-2 border-red-400/60 border-t-transparent" />
                                                                ) : (
                                                                    <Link2Off className="w-3.5 h-3.5" />
                                                                )}
                                                            </Button>
                                                        </>
                                                    ) : (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="flex-1 text-[13px] text-zinc-400 hover:bg-zinc-800 hover:text-white"
                                                            onClick={() => handleShare(id)}
                                                            disabled={sharingId === id}
                                                        >
                                                            {sharingId === id ? (
                                                                <div className="h-3 w-3 animate-spin rounded-full border-2 border-white/60 border-t-transparent mr-1" />
                                                            ) : (
                                                                <Share2 className="w-3 h-3 mr-1" />
                                                            )}
                                                            {sharingId === id ? "Sharing..." : "Make Public"}
                                                        </Button>
                                                    )}
                                                    {/* Delete */}
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 shrink-0 text-zinc-600 hover:text-red-400 hover:bg-red-500/10"
                                                        onClick={() => handleDelete(id)}
                                                        aria-label="Delete build"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
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
