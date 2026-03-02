import { MonitorPlay, TrendingUp, AlertTriangle, Clock, Award, BarChart3 } from "lucide-react";
import Link from "next/link";
import { SectionContainer } from "@/components/ui/SectionContainer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Metadata } from "next";
import { formatINR } from "@/lib/analytics/market";
import { computeBarFillWidth } from "@/lib/insights/valueUtils";
import {
    getGpuMarketData as getGpuMarketDataServer,
    type GpuMarketItem,
} from "@/server/insights/getGpuMarketData";

export const runtime = "nodejs";
export const revalidate = 300; // 5-minute ISR


export const metadata: Metadata = {
    title: "GPU Market Insights | Performance Per Dollar Rankings",
    description: "Compare GPUs by value score, pricing trends, and performance per dollar analysis."
};

function VerdictBadge({ verdict }: { verdict: string }) {
    let bg = "bg-primary/20 text-primary border-primary/20";
    let Icon = BarChart3;

    switch (verdict) {
        case "Best Value":
            bg = "bg-green-500/20 text-green-500 border-green-500/20";
            Icon = Award;
            break;
        case "Overpriced":
            bg = "bg-red-500/20 text-red-500 border-red-500/20";
            Icon = AlertTriangle;
            break;
        case "Fair Deal":
            bg = "bg-emerald-500/20 text-emerald-400 border-emerald-500/20";
            Icon = Award;
            break;
        case "Aging":
            bg = "bg-yellow-500/20 text-yellow-500 border-yellow-500/20";
            Icon = Clock;
            break;
        case "Balanced":
        default:
            bg = "bg-blue-500/20 text-blue-500 border-blue-500/20";
            Icon = TrendingUp;
            break;
    }

    return (
        <span className={`inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold ${bg}`}>
            <Icon className="w-3 h-3 mr-1 shrink-0" />
            {verdict}
        </span>
    );
}

// Mobile card — shown only below md breakpoint
function GPUInsightCard({
    gpu,
    maxValueScore,
}: {
    gpu: GpuMarketItem;
    maxValueScore: number;
}) {
    const fillWidth = computeBarFillWidth(gpu.valueScore, maxValueScore);
    const barColor =
        gpu.verdict === "Best Value" ? "bg-green-500" :
            gpu.verdict === "Overpriced" ? "bg-red-500" :
                gpu.verdict === "Fair Deal" ? "bg-emerald-400" : "bg-primary";

    return (
        <div className="rounded-xl border border-white/10 bg-card p-4 space-y-3">
            {/* Header row */}
            <div className="flex justify-between items-start gap-2">
                <div className="min-w-0">
                    <h3 className="font-semibold text-sm leading-tight truncate">{gpu.name}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{gpu.launchYear}</p>
                </div>
                <VerdictBadge verdict={gpu.verdict} />
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="bg-black/20 rounded-lg p-2.5">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Performance</p>
                    <p className="font-semibold tabular-nums">{gpu.performanceScore.toLocaleString()}</p>
                </div>
                <div className="bg-black/20 rounded-lg p-2.5">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Street Price</p>
                    <p className="font-semibold tabular-nums">
                        {gpu.currentPrice > 0 ? formatINR(gpu.currentPrice) : "—"}
                    </p>
                </div>
            </div>

            {/* Value bar */}
            <div className="space-y-1">
                <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>Value Score</span>
                    <span className="tabular-nums">{gpu.valueScore.toFixed(3)}</span>
                </div>
                <div className="h-2 w-full bg-black/40 rounded-full overflow-hidden">
                    <div
                        className={`h-full rounded-full transition-all ${barColor}`}
                        style={{ width: `${fillWidth}%` }}
                    />
                </div>
            </div>
        </div>
    );
}


// 1. Fetch and compute data helper
async function getGpuMarketData(): Promise<GpuMarketItem[]> {
    return getGpuMarketDataServer();
}


export default async function GpuMarketInsightsPage() {
    const gpus = await getGpuMarketData();

    // Snapshot stats
    const bestValueGpu = gpus.length > 0 ? gpus[0] : null;
    let mostPowerfulGpu: GpuMarketItem | null = null;
    let mostOverpricedGpu: GpuMarketItem | null = null;
    let totalValueScore = 0;

    let maxPerf = -1;
    let maxMarkup = -1;

    for (const gpu of gpus) {
        totalValueScore += gpu.valueScore;

        if (gpu.performanceScore > maxPerf) {
            maxPerf = gpu.performanceScore;
            mostPowerfulGpu = gpu;
        }

        const markup = gpu.currentPrice / gpu.msrp;
        if (markup > maxMarkup) {
            maxMarkup = markup;
            mostOverpricedGpu = gpu;
        }
    }

    const averageValueScore = gpus.length > 0 ? (totalValueScore / gpus.length) : 0;
    const maxValueScore = gpus.length > 0 ? gpus[0].valueScore : 1; // used for bar scaling

    return (
        <div className="min-h-screen bg-background text-foreground pt-20 pb-24 selection:bg-primary/30 overflow-x-hidden">
            <SectionContainer className="py-16 md:py-24 space-y-12">

                {/* Header */}
                <div className="text-center space-y-4 mb-16">
                    <div className="inline-flex items-center justify-center p-3 mb-4 bg-primary/10 rounded-2xl ring-1 ring-primary/20 shadow-[0_0_40px_-10px_rgba(168,85,247,0.4)]">
                        <MonitorPlay className="w-8 h-8 text-primary" />
                    </div>
                    <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">GPU Market Insights</h1>
                    <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                        Real-time performance per dollar analysis. Determine true value before you build.
                    </p>
                </div>

                <div className="flex items-center justify-center">
                    <div className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-black/20 p-1.5">
                        <Link
                            href="/insights/gpu-market"
                            className="rounded-lg px-4 py-2 text-sm font-semibold text-white bg-primary/30 border border-primary/40 shadow-[0_0_18px_-6px_rgba(168,85,247,0.9)]"
                        >
                            GPU Insights
                        </Link>
                        <Link
                            href="/insights/cpu-market"
                            className="rounded-lg px-4 py-2 text-sm font-semibold text-muted-foreground hover:text-white hover:bg-white/10 transition-colors"
                        >
                            CPU Insights
                        </Link>
                    </div>
                </div>

                {/* Market Snapshot */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <Card className="bg-card/50 border-white/10 hover:border-green-500/50 transition-colors">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                                <Award className="w-4 h-4 text-green-500" />
                                Best Value King
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold truncate">{bestValueGpu?.name || "N/A"}</div>
                            <p className="text-sm text-green-500/80 mt-1">{bestValueGpu?.valueScore.toFixed(2)} pts/₹1000</p>
                        </CardContent>
                    </Card>

                    <Card className="bg-card/50 border-white/10 hover:border-purple-500/50 transition-colors">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                                <TrendingUp className="w-4 h-4 text-purple-500" />
                                Performance Leader
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold truncate">{mostPowerfulGpu?.name || "N/A"}</div>
                            <p className="text-sm text-purple-500/80 mt-1">{mostPowerfulGpu?.performanceScore.toLocaleString()} Score</p>
                        </CardContent>
                    </Card>

                    <Card className="bg-card/50 border-white/10 hover:border-red-500/50 transition-colors">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4 text-red-500" />
                                Highest Markup
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold truncate">{mostOverpricedGpu?.name || "N/A"}</div>
                            <p className="text-sm text-red-500/80 mt-1">
                                {(((mostOverpricedGpu?.currentPrice || 0) / (mostOverpricedGpu?.msrp || 1) - 1) * 100).toFixed(0)}% over MSRP
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="bg-card/50 border-white/10 hover:border-blue-500/50 transition-colors">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                                <BarChart3 className="w-4 h-4 text-blue-500" />
                                Market Average
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{averageValueScore.toFixed(2)}</div>
                            <p className="text-sm text-blue-500/80 mt-1">Points per ₹1000</p>
                        </CardContent>
                    </Card>
                </div>

                {/* ── MOBILE: stacked cards (hidden on md+) ── */}
                <div className="md:hidden grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {gpus.length === 0 && (
                        <p className="text-center text-muted-foreground col-span-2 py-12">
                            No GPU market data available.
                        </p>
                    )}
                    {gpus.map((gpu) => (
                        <GPUInsightCard key={gpu.id} gpu={gpu} maxValueScore={maxValueScore} />
                    ))}
                </div>

                {/* ── DESKTOP: table (hidden below md) ── */}
                <div className="hidden md:block">
                    <Card className="bg-card border-white/10 overflow-hidden">
                        <div className="w-full overflow-x-hidden">
                            <table className="w-full table-fixed text-sm text-left">
                                <colgroup>
                                    <col className="w-[32%]" />
                                    <col className="w-[10%]" />
                                    <col className="w-[20%]" />
                                    <col className="w-[13%]" />
                                    <col className="w-[25%]" />
                                </colgroup>
                                <thead className="text-xs text-muted-foreground uppercase bg-black/40 border-b border-white/10">
                                    <tr>
                                        <th className="px-4 py-4 font-medium">Model</th>
                                        <th className="px-4 py-4 font-medium text-right">Perf</th>
                                        <th className="px-4 py-4 font-medium text-right">Price</th>
                                        <th className="px-4 py-4 font-medium text-center">Verdict</th>
                                        <th className="px-4 py-4 font-medium">Value</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {gpus.map((gpu) => {
                                        const fillWidth = computeBarFillWidth(gpu.valueScore, maxValueScore);
                                        return (
                                            <tr key={gpu.id} className="hover:bg-white/5 transition-colors">
                                                <td className="px-4 py-3.5 font-medium text-foreground">
                                                    <span className="block truncate">{gpu.name}</span>
                                                    <span className="text-xs text-muted-foreground">{gpu.launchYear}</span>
                                                </td>
                                                <td className="px-4 py-3.5 text-right text-muted-foreground tabular-nums">
                                                    {gpu.performanceScore.toLocaleString()}
                                                </td>
                                                <td className="px-4 py-3.5 text-right">
                                                    <div className="flex flex-col items-end">
                                                        <span className="font-bold tabular-nums">
                                                            {gpu.currentPrice > 0 ? formatINR(gpu.currentPrice) : "—"}
                                                        </span>
                                                        {gpu.msrp > 0 && gpu.currentPrice !== gpu.msrp && (
                                                            <span className="text-[10px] text-muted-foreground">
                                                                MSRP {formatINR(gpu.msrp)}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3.5 text-center">
                                                    <VerdictBadge verdict={gpu.verdict} />
                                                </td>
                                                <td className="px-4 py-3.5">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-mono text-xs w-10 text-right shrink-0 text-muted-foreground">
                                                            {gpu.valueScore.toFixed(2)}
                                                        </span>
                                                        <div className="h-2 flex-1 bg-black/40 rounded-full overflow-hidden min-w-0">
                                                            <div
                                                                className={`h-full rounded-full transition-all ${gpu.verdict === "Best Value" ? "bg-green-500" :
                                                                        gpu.verdict === "Overpriced" ? "bg-red-500" :
                                                                            gpu.verdict === "Fair Deal" ? "bg-emerald-400" : "bg-primary"
                                                                    }`}
                                                                style={{ width: `${fillWidth}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {gpus.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                                                No GPU market data available.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </div>


            </SectionContainer>
        </div>
    );
}
