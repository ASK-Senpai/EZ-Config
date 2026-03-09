"use client";

import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { ArrowRightLeft, CopyPlus, ShieldAlert, CheckCircle } from "lucide-react";
import { SectionContainer } from "@/components/ui/SectionContainer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { getComponentPrice } from "@/lib/utils/pricing";
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Legend } from "recharts";

// Types
interface BuildData {
    id: string;
    createdAt: string;
    components?: Record<string, any>;
    engineResult?: {
        metrics?: {
            performanceScore?: number;
            futureProofScore?: number;
        };
        bottleneck?: {
            severity?: string;
        };
        power?: {
            recommendedPSU?: number;
        };
    };
}

function Badge({ children, variant = "default", className = "" }: any) {
    let bg = "bg-primary/20 text-primary border-primary/20";
    if (variant === "secondary") bg = "bg-secondary text-secondary-foreground";
    if (variant === "outline") bg = "border border-white/5 text-muted-foreground";
    return (
        <span className={`inline-flex items-center justify-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors ${bg} ${className}`}>
            {children}
        </span>
    );
}

const bottleneckRank = (severity: string | undefined) => {
    switch (severity?.toLowerCase()) {
        case "low": return 1;
        case "moderate": return 2;
        case "high": return 3;
        default: return 4;
    }
};

function computePrice(build: BuildData | undefined) {
    if (!build) return 0;
    let sum = 0;
    if (build.components) {
        Object.values(build.components).forEach((val: any) => {
            if (val && typeof val === "object") {
                sum += getComponentPrice(val);
            }
        });
    }
    return sum;
}

// ── Radar Chart Component ──────────────────────────────────────────
function ComparisonChart({ buildA, buildB, priceA, priceB }: { buildA: BuildData; buildB: BuildData; priceA: number; priceB: number }) {
    const perfA = buildA.engineResult?.metrics?.performanceScore || 0;
    const perfB = buildB.engineResult?.metrics?.performanceScore || 0;
    const futA = buildA.engineResult?.metrics?.futureProofScore || 0;
    const futB = buildB.engineResult?.metrics?.futureProofScore || 0;
    // Invert bottleneck so lower is better → higher on chart
    const botA = 100 - (bottleneckRank(buildA.engineResult?.bottleneck?.severity) * 25);
    const botB = 100 - (bottleneckRank(buildB.engineResult?.bottleneck?.severity) * 25);
    // Normalize price: lower is better → invert scale (max price = worse)
    const maxP = Math.max(priceA, priceB, 1);
    const priceScoreA = Math.round((1 - priceA / maxP) * 100) || 50;
    const priceScoreB = Math.round((1 - priceB / maxP) * 100) || 50;

    const data = [
        { metric: "Performance", A: perfA, B: perfB },
        { metric: "Future-Proof", A: futA, B: futB },
        { metric: "Balance", A: botA, B: botB },
        { metric: "Value", A: priceScoreA, B: priceScoreB },
        { metric: "Efficiency", A: Math.min(100, perfA * 1.2), B: Math.min(100, perfB * 1.2) },
    ];

    return (
        <Card className="bg-card/60 border-white/10 overflow-hidden shadow-2xl p-6">
            <CardHeader className="p-0 pb-4">
                <CardTitle className="text-lg font-bold">Visual Comparison</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
                <ResponsiveContainer width="100%" height={350}>
                    <RadarChart data={data}>
                        <PolarGrid stroke="#333" />
                        <PolarAngleAxis dataKey="metric" tick={{ fill: "#999", fontSize: 12 }} />
                        <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: "#555", fontSize: 10 }} />
                        <Radar name="Build A" dataKey="A" stroke="#22c55e" fill="#22c55e" fillOpacity={0.15} strokeWidth={2} />
                        <Radar name="Build B" dataKey="B" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.15} strokeWidth={2} />
                        <Legend wrapperStyle={{ fontSize: 12, color: "#999" }} />
                    </RadarChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}

export default function ComparePage() {
    const router = useRouter();
    const [builds, setBuilds] = useState<BuildData[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [buildAId, setBuildAId] = useState<string>("");
    const [buildBId, setBuildBId] = useState<string>("");

    useEffect(() => {
        const fetchBuilds = async () => {
            try {
                const res = await fetch("/api/build/compare");
                if (!res.ok) {
                    if (res.status === 401) {
                        router.push("/login");
                        return;
                    }
                    if (res.status === 403) {
                        router.push("/upgrade");
                        return;
                    }
                    throw new Error("Failed to load builds");
                }
                const data = await res.json();
                setBuilds(data.builds || []);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchBuilds();
    }, [router]);

    const buildA = useMemo(() => builds.find(b => b.id === buildAId), [builds, buildAId]);
    const buildB = useMemo(() => builds.find(b => b.id === buildBId), [builds, buildBId]);

    const priceA = useMemo(() => computePrice(buildA), [buildA]);
    const priceB = useMemo(() => computePrice(buildB), [buildB]);

    const priceToValueA = useMemo(() =>
        priceA > 0 ? (buildA?.engineResult?.metrics?.performanceScore || 0) / priceA : 0,
        [buildA, priceA]
    );
    const priceToValueB = useMemo(() =>
        priceB > 0 ? (buildB?.engineResult?.metrics?.performanceScore || 0) / priceB : 0,
        [buildB, priceB]
    );

    const isSameBuild = buildAId !== "" && buildBId !== "" && buildAId === buildBId;

    const winners = useMemo(() => {
        if (!buildA || !buildB || isSameBuild) return null;

        const perfA = buildA.engineResult?.metrics?.performanceScore || 0;
        const perfB = buildB.engineResult?.metrics?.performanceScore || 0;

        const botA = bottleneckRank(buildA.engineResult?.bottleneck?.severity);
        const botB = bottleneckRank(buildB.engineResult?.bottleneck?.severity);

        const psuA = buildA.engineResult?.power?.recommendedPSU || 0;
        const psuB = buildB.engineResult?.power?.recommendedPSU || 0;

        const futA = buildA.engineResult?.metrics?.futureProofScore || 0;
        const futB = buildB.engineResult?.metrics?.futureProofScore || 0;

        return {
            performanceScore: perfA > perfB ? "A" : perfB > perfA ? "B" : null,
            totalPrice: priceA < priceB ? "A" : priceB < priceA ? "B" : null,
            priceToValue: priceToValueA > priceToValueB ? "A" : priceToValueB > priceToValueA ? "B" : null,
            bottleneck: botA < botB ? "A" : botB < botA ? "B" : null,
            recommendedPSU: psuA < psuB ? "A" : psuB < psuA ? "B" : null,
            futureProofScore: futA > futB ? "A" : futB > futA ? "B" : null,
        } as Record<string, "A" | "B" | null>;
    }, [buildA, buildB, isSameBuild, priceA, priceB, priceToValueA, priceToValueB]);

    if (loading) {
        return (
            <SectionContainer className="py-16 md:py-24">
                <div className="flex flex-col items-center justify-center space-y-4">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                    <p className="text-muted-foreground animate-pulse">Loading comparison engine...</p>
                </div>
            </SectionContainer>
        );
    }

    if (error) {
        return (
            <SectionContainer className="py-16 md:py-24 text-center">
                <div className="bg-red-500/10 border border-red-500/20 p-6 rounded-xl inline-block max-w-lg">
                    <ShieldAlert className="w-8 h-8 text-red-500 mx-auto mb-4" />
                    <h2 className="text-xl font-bold mb-2">Error Loading Builds</h2>
                    <p className="text-muted-foreground mb-6">{error}</p>
                    <Button onClick={() => window.location.reload()}>Try Again</Button>
                </div>
            </SectionContainer>
        );
    }

    if (builds.length === 0) {
        return (
            <SectionContainer className="py-16 md:py-24 text-center">
                <div className="bg-card/50 border border-white/10 p-12 rounded-2xl max-w-xl mx-auto shadow-xl">
                    <CopyPlus className="w-12 h-12 text-muted-foreground mx-auto mb-6" />
                    <h2 className="text-2xl font-bold mb-3">No Builds Available</h2>
                    <p className="text-muted-foreground mb-8">
                        You need at least two saved configurations to use the comparison engine. Head over to the builder to create a system block.
                    </p>
                    <Button variant="premium" className="h-12 px-8" onClick={() => router.push("/builder")}>
                        Launch Builder
                    </Button>
                </div>
            </SectionContainer>
        );
    }

    if (builds.length === 1) {
        return (
            <SectionContainer className="py-16 md:py-24 text-center">
                <div className="bg-card/50 border border-white/10 p-12 rounded-2xl max-w-xl mx-auto shadow-xl">
                    <CopyPlus className="w-12 h-12 text-muted-foreground mx-auto mb-6" />
                    <h2 className="text-2xl font-bold mb-3">Need Another Build</h2>
                    <p className="text-muted-foreground mb-8">
                        Create another build to compare.
                    </p>
                    <Button variant="premium" className="h-12 px-8" onClick={() => router.push("/builder")}>
                        Launch Builder
                    </Button>
                </div>
            </SectionContainer>
        );
    }

    const MetricComparisonRow = ({ label, valA, valB, format = (v: any) => v, winnerKey }: any) => {
        const winner = winners ? winners[winnerKey] : null;
        return (
            <tr className="border-b border-white/5 hover:bg-white/5 transition-colors">
                <td className="p-4 font-medium text-muted-foreground bg-black/20 w-1/3">{label}</td>
                <td className={`p-4 font-semibold text-center w-1/3 transition-colors ${winner === "A" ? 'text-green-500 font-bold bg-green-500/5 shadow-[inset_0_0_15px_rgba(34,197,94,0.1)]' : 'text-foreground'}`}>
                    {valA !== undefined ? format(valA) : '--'}
                    {winner === "A" && <CheckCircle className="inline-block w-4 h-4 ml-2 mb-0.5 opacity-80" />}
                </td>
                <td className={`p-4 font-semibold text-center w-1/3 transition-colors ${winner === "B" ? 'text-green-500 font-bold bg-green-500/5 shadow-[inset_0_0_15px_rgba(34,197,94,0.1)]' : 'text-foreground'}`}>
                    {valB !== undefined ? format(valB) : '--'}
                    {winner === "B" && <CheckCircle className="inline-block w-4 h-4 ml-2 mb-0.5 opacity-80" />}
                </td>
            </tr>
        );
    };

    return (
        <div className="min-h-screen bg-background text-foreground pb-24">
            <SectionContainer className="py-12 md:py-16 space-y-8">

                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-white/5 pb-8 mb-8">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <ArrowRightLeft className="w-8 h-8 text-primary" />
                            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Compare Builds</h1>
                        </div>
                        <p className="text-muted-foreground md:text-lg">View direct side-by-side metrics of your validated systems.</p>
                    </div>
                </div>

                {/* Selection Controls */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-card/40 border border-white/10 p-6 rounded-2xl shadow-lg">
                    <div className="space-y-3">
                        <label className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Select Build A</label>
                        <select
                            className="w-full h-12 px-4 rounded-lg bg-black/40 border border-white/10 text-foreground focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all outline-none disabled:opacity-50"
                            value={buildAId}
                            onChange={(e) => setBuildAId(e.target.value)}
                        >
                            <option value="">-- Select Build --</option>
                            {builds.map((b) => {
                                const d = new Date(b.createdAt);
                                const parsedDate = !isNaN(d.valueOf()) ? d.toLocaleDateString() : "Unknown";
                                return (
                                    <option key={b.id} value={b.id} disabled={b.id === buildBId}>
                                        {b.engineResult?.metrics?.performanceScore} Score ({parsedDate})
                                    </option>
                                );
                            })}
                        </select>
                    </div>

                    <div className="space-y-3">
                        <label className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Select Build B</label>
                        <select
                            className="w-full h-12 px-4 rounded-lg bg-black/40 border border-white/10 text-foreground focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all outline-none disabled:opacity-50"
                            value={buildBId}
                            onChange={(e) => setBuildBId(e.target.value)}
                        >
                            <option value="">-- Select Build --</option>
                            {builds.map((b) => {
                                const d = new Date(b.createdAt);
                                const parsedDate = !isNaN(d.valueOf()) ? d.toLocaleDateString() : "Unknown";
                                return (
                                    <option key={b.id} value={b.id} disabled={b.id === buildAId}>
                                        {b.engineResult?.metrics?.performanceScore} Score ({parsedDate})
                                    </option>
                                );
                            })}
                        </select>
                    </div>
                </div>

                {isSameBuild && (
                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-lg flex items-center gap-3">
                        <ShieldAlert className="w-5 h-5 shrink-0" />
                        <p className="font-medium">You cannot compare the exact same configuration. Please select two distinct builds.</p>
                    </motion.div>
                )}

                {/* Comparison UI */}
                {!isSameBuild && buildA && buildB && (
                    <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="space-y-8">

                        {/* Desktop Table */}
                        <Card className="hidden md:block bg-card/60 border-white/10 overflow-hidden shadow-2xl">
                            <table className="w-full text-left">
                                <thead className="bg-black/60 border-b border-white/10 text-sm uppercase tracking-wider text-muted-foreground">
                                    <tr>
                                        <th className="p-4 font-semibold w-1/3">Metric</th>
                                        <th className="p-4 font-semibold text-center w-1/3">Build A</th>
                                        <th className="p-4 font-semibold text-center w-1/3">Build B</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <MetricComparisonRow
                                        label="Performance Score"
                                        valA={buildA.engineResult?.metrics?.performanceScore}
                                        valB={buildB.engineResult?.metrics?.performanceScore}
                                        format={(v: number) => v.toLocaleString()}
                                        winnerKey="performanceScore"
                                    />
                                    <MetricComparisonRow
                                        label="Total Price"
                                        valA={priceA}
                                        valB={priceB}
                                        format={(v: number) => `$${v.toLocaleString()}`}
                                        winnerKey="totalPrice"
                                    />
                                    <MetricComparisonRow
                                        label="Price-to-Value"
                                        valA={priceToValueA}
                                        valB={priceToValueB}
                                        format={(v: number) => Math.round(v * 1000) / 1000}
                                        winnerKey="priceToValue"
                                    />
                                    <MetricComparisonRow
                                        label="Bottleneck Severity"
                                        valA={buildA.engineResult?.bottleneck?.severity}
                                        valB={buildB.engineResult?.bottleneck?.severity}
                                        format={(v: string) => v ? v.toUpperCase() : "UNKNOWN"}
                                        winnerKey="bottleneck"
                                    />
                                    <MetricComparisonRow
                                        label="Recommended PSU"
                                        valA={buildA.engineResult?.power?.recommendedPSU}
                                        valB={buildB.engineResult?.power?.recommendedPSU}
                                        format={(v: number) => `${v}W`}
                                        winnerKey="recommendedPSU"
                                    />
                                    <MetricComparisonRow
                                        label="Future Proof Score"
                                        valA={buildA.engineResult?.metrics?.futureProofScore}
                                        valB={buildB.engineResult?.metrics?.futureProofScore}
                                        format={(v: number) => `${v}/100`}
                                        winnerKey="futureProofScore"
                                    />
                                </tbody>
                            </table>
                        </Card>

                        {/* Mobile Stacked Cards */}
                        <div className="md:hidden space-y-6">
                            {[
                                { title: "Build A", build: buildA, price: priceA, ptv: priceToValueA, key: "A" },
                                { title: "Build B", build: buildB, price: priceB, ptv: priceToValueB, key: "B" }
                            ].map((col, idx) => (
                                <Card key={col.title} className="bg-card border-white/10 shadow-xl overflow-hidden">
                                    <CardHeader className="bg-black/40 border-b border-white/5 pb-4">
                                        <CardTitle className="text-xl flex items-center justify-between">
                                            {col.title}
                                            <Badge variant={idx === 0 ? "secondary" : "default"}>Loaded</Badge>
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-0">
                                        <div className="divide-y divide-white/5">
                                            {[
                                                { label: "Performance", val: col.build.engineResult?.metrics?.performanceScore?.toLocaleString() || "--", winKey: "performanceScore" },
                                                { label: "Total Price", val: `$${col.price.toLocaleString()}`, winKey: "totalPrice" },
                                                { label: "Price-to-Value", val: Math.round(col.ptv * 1000) / 1000, winKey: "priceToValue" },
                                                { label: "Bottleneck", val: col.build.engineResult?.bottleneck?.severity?.toUpperCase() || "--", winKey: "bottleneck" },
                                                { label: "Recommended PSU", val: `${col.build.engineResult?.power?.recommendedPSU || 0}W`, winKey: "recommendedPSU" },
                                                { label: "Future Proof", val: `${col.build.engineResult?.metrics?.futureProofScore || 0}/100`, winKey: "futureProofScore" }
                                            ].map((row, i) => {
                                                const isWinner = winners && winners[(row.winKey as keyof typeof winners)] === col.key;
                                                return (
                                                    <div key={i} className={`flex justify-between items-center p-4 transition-colors ${isWinner ? 'bg-green-500/5 shadow-[inset_0_0_10px_rgba(34,197,94,0.1)]' : ''}`}>
                                                        <span className="text-sm text-muted-foreground uppercase tracking-wider">{row.label}</span>
                                                        <span className={`font-medium ${isWinner ? 'text-green-500 font-bold' : ''}`}>
                                                            {row.val}
                                                            {isWinner && <CheckCircle className="inline-block w-4 h-4 ml-2 mb-0.5 opacity-80" />}
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>

                        {/* Recharts Radar Comparison */}
                        <ComparisonChart buildA={buildA} buildB={buildB} priceA={priceA} priceB={priceB} />
                    </motion.div>
                )}

            </SectionContainer>
        </div>
    );
}
