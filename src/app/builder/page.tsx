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
    ShieldCheck,
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
import { PowerSummary } from "@/components/builder/PowerSummary";
import { PerformanceSummary } from "@/components/builder/PerformanceSummary";
import { BuildFooterBar } from "@/components/builder/BuildFooterBar";
import { AnalysisResultsPanel } from "@/components/builder/AnalysisResultsPanel";
import { runEngineV12 } from "@/lib/engine";
import { analyzeBuild, BuildAnalysis } from "@/lib/engine/analyzeBuild";
import { Badge } from "@/components/ui/badge";
import { useRouter, useSearchParams } from "next/navigation";

const BUILDER_CATEGORIES = [
    { id: "cpu", title: "CPU", icon: Cpu, description: "Processors for gaming & work" },
    { id: "gpu", title: "GPU", icon: Monitor, description: "Graphics cards for gaming" },
    { id: "motherboard", title: "Motherboard", icon: CircuitBoard, description: "The backbone of your system" },
    { id: "ram", title: "RAM", icon: MemoryStick, description: "Memory for multitasking" },
    { id: "storage", title: "Storage", icon: HardDrive, description: "SSD & high-speed storage" },
    { id: "psu", title: "PSU", icon: Zap, description: "Power supply for stability" },
];

type SubscriptionState = {
    plan: "free" | "premium";
    status: "active" | "inactive";
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
    const [isGeneratingReport, setIsGeneratingReport] = useState(false);
    const [hasTechnicalReport, setHasTechnicalReport] = useState(false);

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

    // ── Analyze ──────────────────────────────────────────────────────────────
    const runAnalysis = useCallback(() => {
        setIsAnalyzing(true);
        // Small delay to show loading state, then compute
        setTimeout(() => {
            const result = analyzeBuild(currentBuild);
            setFullAnalysis(result);
            setIsAnalyzing(false);
            // Scroll to results
            setTimeout(() => {
                analysisRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
            }, 100);
        }, 600);
    }, [currentBuild]);

    useEffect(() => {
        if (store.cpu && store.gpu) {
            runAnalysis();
        }
    }, [store.cpu, store.gpu, runAnalysis]);

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
                    plan: data.subscription.plan === "premium" ? "premium" : "free",
                    status: data.subscription.status === "active" ? "active" : "inactive",
                    aiUsage: Number(data.subscription.aiUsage || 0),
                    aiLimit: Number(data.subscription.aiLimit || 0),
                });
            } catch {
                setSubscription(null);
            }
        };
        fetchPlan();
    }, []);

    useEffect(() => {
        const buildId = searchParams.get("load");
        if (!buildId) {
            setHasTechnicalReport(false);
            return;
        }

        const fetchStatus = async () => {
            try {
                const res = await fetch(`/api/ai/generate-build-report/${buildId}`);
                if (!res.ok) {
                    setHasTechnicalReport(false);
                    return;
                }
                const data = await res.json();
                setHasTechnicalReport(Boolean(data.exists));
            } catch {
                setHasTechnicalReport(false);
            }
        };

        fetchStatus();
    }, [searchParams]);

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
        const isPremium = subscription?.plan === "premium" && subscription?.status === "active";
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

    const handleGenerateReport = useCallback(async () => {
        const buildId = searchParams.get("load");
        if (!buildId) {
            setToast({ message: "Load a saved build to generate a report.", type: "error" });
            setTimeout(() => setToast(null), 4000);
            return;
        }

        if (hasTechnicalReport) {
            router.push(`/build-report/${buildId}`);
            return;
        }

        setIsGeneratingReport(true);
        try {
            const res = await fetch(`/api/ai/generate-build-report/${buildId}`, { method: "POST" });
            const data = await res.json();

            if (!res.ok) {
                if (res.status === 403) {
                    setToast({ message: data.message || "Report access denied.", type: "error" });
                } else {
                    setToast({ message: "Failed to generate report.", type: "error" });
                }
                setTimeout(() => setToast(null), 4000);
                return;
            }

            setHasTechnicalReport(true);
            router.push(`/build-report/${data.reportId}`);
        } catch (error) {
            console.error("Report generation failed:", error);
            setToast({ message: "Failed to generate report.", type: "error" });
            setTimeout(() => setToast(null), 4000);
        } finally {
            setIsGeneratingReport(false);
        }
    }, [hasTechnicalReport, router, searchParams]);

    return (
        <div className="min-h-screen bg-neutral-950 text-neutral-100 pb-32">
            <SectionContainer className="py-12">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-12">
                    <div className="space-y-2">
                        <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tighter">
                            PC Builder <span className="text-primary italic">v2.0</span>
                        </h1>
                        <p className="text-neutral-500 font-medium max-w-xl leading-relaxed">
                            Design your dream rig with real-time hardware intelligence.
                            Our engine validates every component for optimal performance and stability.
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex flex-col items-end">
                            <span className="text-[10px] font-bold text-neutral-600 uppercase tracking-widest">Engine Status</span>
                            <div className="flex items-center gap-2 text-green-500 text-xs font-bold uppercase tracking-wider">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                                Live Feedback Active
                            </div>
                        </div>
                    </div>
                </div>

                {optimizedBanner && (
                    <div className="mb-8 rounded-2xl border border-primary/30 bg-primary/10 px-5 py-4">
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

                <div className="flex flex-col lg:flex-row gap-8">
                    {/* Main Component Grid (70%) */}
                    <div className="flex-1 space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {BUILDER_CATEGORIES.map((cat) => {
                                const selectedItem = (store as any)[cat.id];

                                // Storage multi-select handling
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
                                                        <div className="w-8 h-8 rounded-full bg-neutral-900 flex items-center justify-center group-hover:bg-primary/20">
                                                            <Plus className="w-4 h-4" />
                                                        </div>
                                                        <span className="text-xs font-bold uppercase tracking-widest">Add Storage</span>
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

                        {/* ── Full Analysis Results (appears after Analyze click) ── */}
                        <div ref={analysisRef}>
                            <AnimatePresence>
                                {(isAnalyzing || fullAnalysis) && (
                                    <AnalysisResultsPanel
                                        analysis={fullAnalysis!}
                                        isLoading={isAnalyzing}
                                    />
                                )}
                            </AnimatePresence>
                        </div>
                    </div>

                    {/* Right Summary Sidebar (30%) */}
                    <div className="w-full lg:w-96 space-y-6">
                        <div className="sticky top-24 space-y-6">
                            {/* Performance Section */}
                            <PerformanceSummary build={currentBuild} />

                            {/* Power Section */}
                            <PowerSummary power={analysis.power} />

                            {/* Compatibility Alerts (Phase 97 Sidebar) */}
                            {(!analysis.compatibility.isValid || (store.cpu && !store.motherboard) || (analysis.power.recommendedPSU > 1600)) && (
                                <div className="p-6 rounded-3xl bg-red-500/5 border border-red-500/20 space-y-3">
                                    <div className="flex items-center gap-2 text-red-500">
                                        <AlertCircle className="w-4 h-4" />
                                        <h3 className="font-bold uppercase tracking-widest text-[10px]">Compatibility Alerts</h3>
                                    </div>
                                    <div className="space-y-2">
                                        {analysis.compatibility.issues.map((issue, idx) => (
                                            <div key={idx} className="text-[11px] text-red-400 font-medium leading-tight flex gap-2">
                                                <span className="shrink-0">•</span>
                                                <span>{issue}</span>
                                            </div>
                                        ))}
                                        {store.cpu && !store.motherboard && (
                                            <div className="text-[11px] text-amber-500 font-medium leading-tight flex gap-2 italic">
                                                <span className="shrink-0">•</span>
                                                <span>No compatible motherboard available.</span>
                                            </div>
                                        )}
                                        {analysis.power.recommendedPSU > 1600 && !store.psu && (
                                            <div className="text-[11px] text-red-500 font-bold leading-tight flex gap-2">
                                                <span className="shrink-0 text-red-600">!</span>
                                                <span>No PSU available for current configuration.</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Suggestions Panel */}
                            {analysis.suggestions.length > 0 && (
                                <div className="p-6 rounded-3xl bg-neutral-900 border border-neutral-800 space-y-4">
                                    <div className="flex items-center gap-3">
                                        <TrendingUp className="w-4 h-4 text-primary" />
                                        <h3 className="font-bold uppercase tracking-widest text-xs">Optimization Tips</h3>
                                    </div>
                                    <div className="space-y-3">
                                        {analysis.suggestions.slice(0, 3).map((tip, idx) => (
                                            <div key={idx} className="flex items-start gap-2 group cursor-default">
                                                <ChevronRight className="w-3 h-3 mt-0.5 text-neutral-700 group-hover:text-primary transition-colors" />
                                                <p className="text-[11px] text-neutral-400 font-medium leading-normal">{tip}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </SectionContainer>

            {/* Footer sticky bar */}
            <BuildFooterBar
                build={currentBuild}
                onClear={() => { store.clearBuild(); setFullAnalysis(null); }}
                onAnalyze={runAnalysis}
                onSave={() => setShowSaveDialog(true)}
                onGenerateOptimized={handleGenerateOptimizedBuild}
                isOptimizing={isOptimizingBuild}
                onGenerateReport={handleGenerateReport}
                isGeneratingReport={isGeneratingReport}
                reportActionLabel={hasTechnicalReport ? "View Technical Report" : "Generate Technical Report"}
            />

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
