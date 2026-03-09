"use client";

import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Cpu,
    Monitor,
    CircuitBoard,
    MemoryStick,
    HardDrive,
    Zap,
    AlertCircle,
    TrendingUp,
    ChevronRight,
    Plus,
    X,
    CheckCircle2,
} from "lucide-react";

import { SectionContainer } from "@/components/ui/SectionContainer";
import { useBuildStore } from "@/store/useBuildStore";
import { ComponentCard } from "@/components/builder/ComponentCard";
import { ComponentSelectModal } from "@/components/builder/ComponentSelectModal";
import { AnalysisResultsPanel } from "@/components/builder/AnalysisResultsPanel";
import { runEngineV12 } from "@/lib/engine";
import { analyzeBuild, BuildAnalysis } from "@/lib/engine/analyzeBuild";
import { Badge } from "@/components/ui/badge";
import { useRouter, useSearchParams } from "next/navigation";
import { LiveIntelligencePanel } from "@/components/builder/LiveIntelligencePanel";
import { LiveEnginePanel } from "@/components/builder/LiveEnginePanel";
import { Card } from "@/components/ui/card";
import { getMinPrice } from "@/lib/utils/pricingV2";

const BUILDER_CATEGORIES = [
    { id: "cpu", title: "CPU", icon: Cpu, description: "Processors for gaming & work" },
    { id: "gpu", title: "GPU", icon: Monitor, description: "Graphics cards for gaming" },
    { id: "motherboard", title: "Motherboard", icon: CircuitBoard, description: "The backbone of your system" },
    { id: "ram", title: "RAM", icon: MemoryStick, description: "Memory for multitasking" },
    { id: "storage", title: "Storage", icon: HardDrive, description: "SSD & high-speed storage" },
    { id: "psu", title: "PSU", icon: Zap, description: "Power supply for stability" },
];

type SubscriptionState = {
    plan: string;
    subscriptionStatus: "active" | "inactive" | "cancelled" | "expired" | "past_due";
    aiUsage: number;
    aiLimit: number;
};

// ── Toast ─────────────────────────────────────────────────────────────────────
function Toast({ message, type, onClose }: { message: string; type: "success" | "error"; onClose: () => void }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-3 px-5 py-3 rounded-2xl shadow-2xl backdrop-blur-xl border ${type === "success"
                ? "bg-green-500/10 border-green-500/30 text-green-400"
                : "bg-red-500/10 border-red-500/30 text-red-400"
                }`}
        >
            {type === "success" ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            <span className="text-sm font-semibold">{message}</span>
            <button onClick={onClose} className="ml-2 hover:opacity-70"><X className="w-3.5 h-3.5" /></button>
        </motion.div>
    );
}

// ── Save Name Dialog ──────────────────────────────────────────────────────────
function SaveDialog({ onSave, onCancel, isSaving }: { onSave: (name: string) => void; onCancel: () => void; isSaving: boolean }) {
    const [name, setName] = useState("");
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={onCancel}
        >
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={e => e.stopPropagation()}
                className="bg-neutral-900 border border-neutral-700 rounded-3xl p-8 w-full max-w-md space-y-6"
            >
                <h3 className="text-lg font-bold">Save Build</h3>
                <input
                    type="text"
                    placeholder="My Gaming Rig"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    autoFocus
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-3 text-sm font-medium placeholder:text-neutral-600 focus:outline-none focus:border-primary/50"
                />
                <div className="flex gap-3 justify-end">
                    <button
                        onClick={onCancel}
                        className="px-4 py-2 text-sm font-bold text-neutral-400 hover:text-white transition"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => onSave(name || "Untitled Build")}
                        disabled={isSaving}
                        className="px-6 py-2 bg-primary text-black text-sm font-bold rounded-xl hover:brightness-110 disabled:opacity-50 transition flex items-center gap-2"
                    >
                        {isSaving && <div className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />}
                        {isSaving ? "Saving..." : "Save"}
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
}

// ── Main Builder Page ─────────────────────────────────────────────────────────
export default function BuilderPage() {
    const store = useBuildStore();
    const searchParams = useSearchParams();
    const router = useRouter();
    const [modalOpen, setModalOpen] = useState(false);
    const [activeCategory, setActiveCategory] = useState<string | null>(null);

    // Analysis state
    const [fullAnalysis, setFullAnalysis] = useState<BuildAnalysis | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisSnapshotHash, setAnalysisSnapshotHash] = useState<string | null>(null);

    // Save state
    const [showSaveDialog, setShowSaveDialog] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
    const [optimizedBanner, setOptimizedBanner] = useState<{
        gamingDelta: string;
        futureDelta: string;
        budgetDelta: string;
    } | null>(null);
    const [subscription, setSubscription] = useState<SubscriptionState | null>(null);
    const [isOptimizingBuild, setIsOptimizingBuild] = useState(false);

    const analysisRef = useRef<HTMLDivElement>(null);

    // Memoized build object for engine
    const currentBuild = useMemo(() => ({
        cpu: store.cpu,
        gpu: store.gpu,
        motherboard: store.motherboard,
        ram: store.ram,
        storage: store.storage,
        psu: store.psu,
    }), [store]);

    const analysis = useMemo(() => runEngineV12(currentBuild), [currentBuild]);

    const handleOpenModal = (category: string) => {
        setActiveCategory(category);
        setModalOpen(true);
    };

    const handleSelectComponent = (item: any) => {
        if (activeCategory) {
            store.setComponent(activeCategory, item);
            setModalOpen(false);
            // Reset full analysis when components change
            setFullAnalysis(null);
        }
    };

    // Readiness Indicator
    const isBuildComplete = !!(store.cpu && store.gpu && store.motherboard && store.psu && store.ram && store.storage?.length > 0);

    const totalPrice = useMemo(() => {
        return [
            store.cpu,
            store.gpu,
            store.motherboard,
            store.ram,
            store.storage?.[0],
            store.psu,
        ].reduce((sum, item) => sum + (getMinPrice(item) || 0), 0);
    }, [store]);

    // ── Analyze (Intentional Only) ───────────────────────────
    const runAnalysis = useCallback(() => {

        setIsAnalyzing(true);
        // Small delay to show loading state, then compute
        setTimeout(() => {
            const result = analyzeBuild(currentBuild);
            setFullAnalysis(result);
            setIsAnalyzing(false);

            // Compute hash for staleness detection
            const buildHash = JSON.stringify({
                cpuId: currentBuild.cpu?.id,
                gpuId: currentBuild.gpu?.id,
                moboId: currentBuild.motherboard?.id,
                ramId: currentBuild.ram?.id,
                psuId: currentBuild.psu?.id,
                storageId: currentBuild.storage?.[0]?.id
            });
            setAnalysisSnapshotHash(buildHash);

            // Scroll to results
            setTimeout(() => {
                analysisRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
            }, 100);
        }, 600);
    }, [currentBuild, isBuildComplete]);

    const isAnalysisStale = useMemo(() => {
        if (!analysisSnapshotHash || !fullAnalysis) return false;
        const currentHash = JSON.stringify({
            cpuId: currentBuild.cpu?.id,
            gpuId: currentBuild.gpu?.id,
            moboId: currentBuild.motherboard?.id,
            ramId: currentBuild.ram?.id,
            psuId: currentBuild.psu?.id,
            storageId: currentBuild.storage?.[0]?.id
        });
        return currentHash !== analysisSnapshotHash;
    }, [currentBuild, analysisSnapshotHash, fullAnalysis]);

    useEffect(() => {
        if (searchParams.get("optimized") !== "1") return;

        setOptimizedBanner({
            gamingDelta: searchParams.get("gamingDelta") || "0",
            futureDelta: searchParams.get("futureDelta") || "0",
            budgetDelta: searchParams.get("budgetDelta") || "0",
        });

        const timer = setTimeout(() => setOptimizedBanner(null), 5000);
        return () => clearTimeout(timer);
    }, [searchParams]);

    useEffect(() => {
        const fetchPlan = async () => {
            try {
                const res = await fetch("/api/auth/verify");
                if (!res.ok) return;
                const data = await res.json();
                if (!data.subscription) {
                    setToast({ message: "Subscription state unavailable.", type: "error" });
                    return;
                }
                setSubscription({
                    plan: data.subscription.plan || "free",
                    subscriptionStatus: (data.subscription.subscriptionStatus || data.subscription.status || "inactive"),
                    aiUsage: Number(data.subscription.aiUsage || 0),
                    aiLimit: Number(data.subscription.aiLimit || 0),
                });
            } catch {
                setSubscription(null);
            }
        };
        fetchPlan();
    }, []);


    // ── Save ────────────────────────────────────────────────────────────────
    const handleSave = useCallback(async (buildName: string) => {
        setIsSaving(true);
        try {
            const buildIds: Record<string, string | null> = {
                cpuId: store.cpu?.id || null,
                gpuId: store.gpu?.id || null,
                motherboardId: store.motherboard?.id || null,
                ramId: store.ram?.id || null,
                storageId: (store.storage as any)?.[0]?.id || null,
                psuId: store.psu?.id || null,
            };

            const res = await fetch("/api/build/create", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ build: buildIds, name: buildName }),
            });

            const data = await res.json();

            if (res.ok) {
                setToast({ message: "Build saved successfully!", type: "success" });
                setShowSaveDialog(false);
            } else {
                setToast({ message: data.message || "Failed to save build.", type: "error" });
            }
        } catch (err) {
            setToast({ message: "Network error. Please try again.", type: "error" });
        } finally {
            setIsSaving(false);
            setTimeout(() => setToast(null), 4000);
        }
    }, [store]);

    const handleGenerateOptimizedBuild = useCallback(async () => {
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

        const buildState = useBuildStore.getState();
        const currentBuildPayload = {
            cpu: buildState.cpu,
            gpu: buildState.gpu,
            motherboard: buildState.motherboard,
            ram: buildState.ram,
            storage: buildState.storage,
            psu: buildState.psu,
        };

        setIsOptimizingBuild(true);
        try {
            const res = await fetch("/api/ai/generate-optimized-live", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ build: currentBuildPayload }),
            });
            const data = await res.json();

            if (!res.ok) {
                if (res.status === 403) {
                    router.push("/upgrade");
                    return;
                }
                throw new Error(data.message || "Optimization failed");
            }

            const { resetBuild, setBuild } = useBuildStore.getState();
            resetBuild();
            setBuild(data.optimizedBuild);

            const originalScores = data.originalScores || {};
            const newScores = data.newScores || {};
            const gamingDelta = Math.round(
                Number(newScores?.scores?.gaming || 0) - Number(originalScores?.scores?.gaming || 0)
            );
            const futureDelta = Math.round(
                Number(newScores?.scores?.futureProof || 0) - Number(originalScores?.scores?.futureProof || 0)
            );

            setOptimizedBanner({
                gamingDelta: String(gamingDelta),
                futureDelta: String(futureDelta),
                budgetDelta: String(Math.round(Number(data.priceDelta || 0))),
            });
            setTimeout(() => setOptimizedBanner(null), 5000);
        } catch (error) {
            console.error("Live optimization failed:", error);
            setToast({ message: "Optimization failed", type: "error" });
            setTimeout(() => setToast(null), 4000);
        } finally {
            setIsOptimizingBuild(false);
        }
    }, [router, subscription]);

    const formattedPrice = new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
    }).format(totalPrice);

    return (
        <div className="min-h-screen bg-neutral-950 text-neutral-100 pb-24">
            {/* ── ZONE 1: HERO CONTROL BAR (Sticky Top) ── */}
            <header className="sticky top-0 z-40 bg-neutral-900/80 backdrop-blur-xl border-b border-white/5 py-4 shadow-2xl">
                <SectionContainer>
                    <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="flex flex-col">
                            <h1 className="text-2xl font-black uppercase tracking-tighter flex items-center gap-2">
                                PC Builder <span className="text-primary italic">v2.0</span>
                            </h1>
                            <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest leading-none mt-1">
                                Design your dream rig with real-time hardware intelligence.
                            </p>
                        </div>

                        <div className="flex items-center gap-6">
                            <div className="flex flex-col items-end">
                                <span className="text-[9px] font-bold text-neutral-500 uppercase tracking-widest leading-none mb-1">Total Build Estimate</span>
                                <span className="text-2xl font-black text-white leading-tight">{formattedPrice}</span>
                            </div>

                            <div className="h-10 w-px bg-white/5" />

                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => setShowSaveDialog(true)}
                                    className="px-4 py-2 text-xs font-black uppercase tracking-widest text-neutral-400 hover:text-white transition-colors"
                                >
                                    Save
                                </button>
                                <button
                                    onClick={runAnalysis}
                                    disabled={isAnalyzing}
                                    className="px-6 py-3 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest border border-white/5 transition-all flex items-center gap-2"
                                >
                                    {isAnalyzing && <div className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin" />}
                                    Analyze Build
                                </button>
                                <button
                                    onClick={handleGenerateOptimizedBuild}
                                    disabled={isOptimizingBuild}
                                    className="px-6 py-3 bg-primary text-black rounded-xl text-[10px] font-black uppercase tracking-widest hover:brightness-110 transition-all flex items-center gap-2 shadow-[0_0_30px_rgba(var(--primary-rgb),0.3)]"
                                >
                                    {isOptimizingBuild && <div className="w-3 h-3 border-2 border-black/20 border-t-black rounded-full animate-spin" />}
                                    Generate Optimized Build
                                </button>
                            </div>
                        </div>
                    </div>
                </SectionContainer>
            </header>

            <SectionContainer className="py-10 space-y-10">
                {optimizedBanner && (
                    <div className="rounded-2xl border border-primary/30 bg-primary/10 px-6 py-4">
                        <p className="text-sm font-semibold text-primary">
                            Optimized Build Applied
                            {" "}
                            +{optimizedBanner.gamingDelta} Gaming
                            {" | "}
                            +{optimizedBanner.futureDelta} Future Proof
                            {" | "}
                            ₹{optimizedBanner.budgetDelta} Budget
                        </p>
                    </div>
                )}

                {/* ── ZONE 2: BUILD WORKSPACE (Desktop Grid) ── */}
                <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-8 items-start">
                    {/* LEFT (2fr): Component Matrix */}
                    <div className="space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {BUILDER_CATEGORIES.map((cat) => {
                                const storageArray = store.storage || [];
                                if (cat.id === 'storage' && storageArray.length > 1) {
                                    return (
                                        <div key={cat.id} className="md:col-span-2 space-y-4">
                                            <div className="flex items-center gap-2">
                                                <HardDrive className="w-4 h-4 text-primary" />
                                                <h3 className="font-bold uppercase tracking-widest text-xs text-neutral-500">Selected Storage ({storageArray.length})</h3>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {storageArray.map((s) => (
                                                    <ComponentCard
                                                        key={s.id}
                                                        category="storage"
                                                        title="Storage"
                                                        icon={HardDrive}
                                                        description="SSD / HDD"
                                                        selectedItem={s}
                                                        onSelect={() => handleOpenModal('storage')}
                                                        onRemove={() => store.removeComponent('storage', s.id)}
                                                    />
                                                ))}
                                                <button
                                                    onClick={() => handleOpenModal('storage')}
                                                    className="border-2 border-dashed border-neutral-800 rounded-xl flex items-center justify-center py-8 text-neutral-600 hover:border-primary/50 hover:text-primary transition-all group"
                                                >
                                                    <div className="flex flex-col items-center gap-2">
                                                        <Plus className="w-5 h-5" />
                                                        <span className="text-[10px] font-bold uppercase tracking-widest">Add Storage</span>
                                                    </div>
                                                </button>
                                            </div>
                                        </div>
                                    );
                                }

                                return (
                                    <ComponentCard
                                        key={cat.id}
                                        category={cat.id}
                                        title={cat.title}
                                        icon={cat.icon}
                                        description={cat.description}
                                        selectedItem={cat.id === 'storage' ? (store.storage?.[0] || null) : (store as any)[cat.id]}
                                        onSelect={() => handleOpenModal(cat.id)}
                                        onRemove={() => store.removeComponent(cat.id)}
                                    />
                                );
                            })}
                        </div>

                        {/* Zone 2 Bottom: Live Balance + Build Integrity side-by-side */}
                        <LiveIntelligencePanel
                            analysis={analysis}
                            buildComplete={isBuildComplete}
                        />

                        {/* Stale Badge */}
                        <AnimatePresence>
                            {isAnalysisStale && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    className="p-6 rounded-3xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                                        <span className="text-xs font-bold text-amber-500 uppercase tracking-widest">Build modified — reanalyze required for current report</span>
                                    </div>
                                    <button
                                        onClick={runAnalysis}
                                        className="text-xs font-black uppercase text-amber-500 hover:text-amber-400 underline underline-offset-4"
                                    >
                                        Update Intelligence
                                    </button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* RIGHT (1fr, sticky): Live Engine Panel */}
                    <aside>
                        <LiveEnginePanel
                            analysis={analysis}
                            buildComplete={isBuildComplete}
                        />

                        {/* Compatibility Issues List */}
                        {(!analysis.compatibility.isValid || (store.cpu && !store.motherboard)) && (
                            <Card className="mt-8 p-6 rounded-3xl bg-red-500/5 border border-red-500/20 space-y-4">
                                <div className="flex items-center gap-2 text-red-500">
                                    <AlertCircle className="w-4 h-4" />
                                    <h3 className="font-bold uppercase tracking-widest text-[10px]">Architecture Guard</h3>
                                </div>
                                <div className="space-y-3">
                                    {analysis.compatibility.issues.map((issue, idx) => (
                                        <div key={idx} className="text-[11px] text-red-400 font-medium leading-relaxed flex gap-2">
                                            <span className="shrink-0">•</span>
                                            <span>{issue}</span>
                                        </div>
                                    ))}
                                    {store.cpu && !store.motherboard && (
                                        <div className="text-[11px] text-amber-500 font-medium leading-relaxed flex gap-2 italic">
                                            <span className="shrink-0">•</span>
                                            <span>System backbone (motherboard) is missing.</span>
                                        </div>
                                    )}
                                </div>
                            </Card>
                        )}
                    </aside>
                </div>

                {/* ── ZONE 3: INTELLIGENCE SECTION (After Analyze) ── */}
                <div ref={analysisRef}>
                    <AnimatePresence>
                        {(isAnalyzing || fullAnalysis) && (
                            <div className="pt-12 border-t border-white/5 space-y-10">
                                <div className="flex items-center gap-6">
                                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                                    <div className="flex flex-col items-center text-center px-4">
                                        <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-neutral-600 mb-1">Advanced Deep Learning Intelligence</h2>
                                        <p className="text-[9px] font-bold text-neutral-700 uppercase tracking-widest leading-none italic">Comprehensive Build Analysis & Strategy Report</p>
                                    </div>
                                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                                </div>
                                <AnalysisResultsPanel
                                    analysis={fullAnalysis!}
                                    isLoading={isAnalyzing}
                                    isStale={false} // Stale badge is now in Zone 2
                                />
                            </div>
                        )}
                    </AnimatePresence>
                </div>
            </SectionContainer>

            {/* Modal */}
            <ComponentSelectModal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                category={activeCategory || ""}
                onSelect={handleSelectComponent}
                currentBuild={currentBuild}
            />

            {/* Save Dialog */}
            <AnimatePresence>
                {showSaveDialog && (
                    <SaveDialog
                        onSave={handleSave}
                        onCancel={() => setShowSaveDialog(false)}
                        isSaving={isSaving}
                    />
                )}
            </AnimatePresence>

            {/* Toast */}
            <AnimatePresence>
                {toast && (
                    <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
                )}
            </AnimatePresence>
        </div>
    );
}
