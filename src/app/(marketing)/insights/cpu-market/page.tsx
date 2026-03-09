import { Cpu, TrendingUp, AlertTriangle, Clock, Award, BarChart3 } from "lucide-react";
import Link from "next/link";
import { SectionContainer } from "@/components/ui/SectionContainer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Metadata } from "next";
import { formatINR } from "@/lib/analytics/market";
import { computeBarFillWidth, computeValuePerPrice } from "@/lib/insights/valueUtils";
import {
    getCpuMarketInsights as getCpuMarketInsightsServer,
    type CpuMarketInsightItem,
} from "@/server/insights/getCpuMarketInsights";

export const runtime = "nodejs";
export const revalidate = 300;

export const metadata: Metadata = {
    title: "CPU Market Insights | Gaming & Productivity Value Rankings",
    description: "Compare CPUs by gaming/productivity value, platform longevity, and market pricing intelligence.",
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

function CPUInsightCard({ cpu, maxValueScore }: { cpu: CpuMarketInsightItem; maxValueScore: number }) {
    const fillWidth = computeBarFillWidth(cpu.valueScore, maxValueScore);
    const barColor =
        cpu.verdict === "Best Value" ? "bg-green-500" :
            cpu.verdict === "Overpriced" ? "bg-red-500" :
                cpu.verdict === "Fair Deal" ? "bg-emerald-400" : "bg-primary";

    return (
        <div className="rounded-xl border border-white/10 bg-card p-4 space-y-3">
            <div className="flex justify-between items-start gap-2">
                <div className="min-w-0">
                    <h3 className="font-semibold text-sm leading-tight truncate">{cpu.name}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{cpu.platformTier} Platform</p>
                </div>
                <VerdictBadge verdict={cpu.verdict} />
            </div>

            <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="bg-black/20 rounded-lg p-2.5">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Gaming</p>
                    <p className="font-semibold tabular-nums">{cpu.gamingScore.toLocaleString()}</p>
                </div>
                <div className="bg-black/20 rounded-lg p-2.5">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Productivity</p>
                    <p className="font-semibold tabular-nums">{cpu.productivityScore.toLocaleString()}</p>
                </div>
            </div>

            <div className="space-y-1">
                <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>Value Score</span>
                    <span className="tabular-nums">{cpu.valueScore.toFixed(3)}</span>
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

async function getCpuMarketInsights(): Promise<CpuMarketInsightItem[]> {
    return getCpuMarketInsightsServer();
}

export default async function CpuMarketInsightsPage() {
    const cpus = await getCpuMarketInsights();

    const bestGamingValueCpu = cpus.length > 0
        ? cpus.reduce((best, cpu) => (computeValuePerPrice(cpu.gamingScore, cpu.price) > computeValuePerPrice(best.gamingScore, best.price) ? cpu : best), cpus[0])
        : null;
    const bestProductivityValueCpu = cpus.length > 0
        ? cpus.reduce((best, cpu) => (computeValuePerPrice(cpu.productivityScore, cpu.price) > computeValuePerPrice(best.productivityScore, best.price) ? cpu : best), cpus[0])
        : null;
    const highestMarkupCpu = cpus.length > 0
        ? cpus.reduce((worst, cpu) => (cpu.markup > worst.markup ? cpu : worst), cpus[0])
        : null;

    const totalValue = cpus.reduce((sum, cpu) => sum + cpu.valueScore, 0);
    const averageValueScore = cpus.length > 0 ? totalValue / cpus.length : 0;
    const maxValueScore = cpus.length > 0 ? cpus[0].valueScore : 1;

    return (
        <div className="min-h-screen bg-background text-foreground pt-20 pb-24 selection:bg-primary/30 overflow-x-hidden">
            <SectionContainer className="py-16 md:py-24 space-y-12">
                <div className="text-center space-y-4 mb-16">
                    <div className="inline-flex items-center justify-center p-3 mb-4 bg-primary/10 rounded-2xl ring-1 ring-primary/20 shadow-[0_0_40px_-10px_rgba(168,85,247,0.4)]">
                        <Cpu className="w-8 h-8 text-primary" />
                    </div>
                    <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">CPU Market Insights</h1>
                    <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                        Analyze gaming and productivity value across CPU platforms before you build.
                    </p>
                </div>

                <div className="flex items-center justify-center">
                    <div className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-black/20 p-1.5">
                        <Link
                            href="/insights/gpu-market"
                            className="rounded-lg px-4 py-2 text-sm font-semibold text-muted-foreground hover:text-white hover:bg-white/10 transition-colors"
                        >
                            GPU Insights
                        </Link>
                        <Link
                            href="/insights/cpu-market"
                            className="rounded-lg px-4 py-2 text-sm font-semibold text-white bg-primary/30 border border-primary/40 shadow-[0_0_18px_-6px_rgba(168,85,247,0.9)]"
                        >
                            CPU Insights
                        </Link>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <Card className="bg-card/50 border-white/10 hover:border-green-500/50 transition-colors">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                                <Award className="w-4 h-4 text-green-500" />
                                Best Gaming Value CPU
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold truncate">{bestGamingValueCpu?.name || "N/A"}</div>
                            <p className="text-sm text-green-500/80 mt-1">
                                {bestGamingValueCpu ? computeValuePerPrice(bestGamingValueCpu.gamingScore, bestGamingValueCpu.price).toFixed(2) : "0.00"} pts/₹1000
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="bg-card/50 border-white/10 hover:border-purple-500/50 transition-colors">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                                <TrendingUp className="w-4 h-4 text-purple-500" />
                                Best Productivity Value CPU
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold truncate">{bestProductivityValueCpu?.name || "N/A"}</div>
                            <p className="text-sm text-purple-500/80 mt-1">
                                {bestProductivityValueCpu ? computeValuePerPrice(bestProductivityValueCpu.productivityScore, bestProductivityValueCpu.price).toFixed(2) : "0.00"} pts/₹1000
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="bg-card/50 border-white/10 hover:border-red-500/50 transition-colors">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4 text-red-500" />
                                Highest Markup CPU
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold truncate">{highestMarkupCpu?.name || "N/A"}</div>
                            <p className="text-sm text-red-500/80 mt-1">
                                {highestMarkupCpu ? `${highestMarkupCpu.markup.toFixed(0)}% over MSRP` : "N/A"}
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="bg-card/50 border-white/10 hover:border-blue-500/50 transition-colors">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                                <BarChart3 className="w-4 h-4 text-blue-500" />
                                Market Average Value
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{averageValueScore.toFixed(2)}</div>
                            <p className="text-sm text-blue-500/80 mt-1">Points per ₹1000</p>
                        </CardContent>
                    </Card>
                </div>

                <div className="md:hidden grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {cpus.length === 0 && (
                        <p className="text-center text-muted-foreground col-span-2 py-12">
                            No CPU market data available.
                        </p>
                    )}
                    {cpus.map((cpu) => (
                        <CPUInsightCard key={cpu.id} cpu={cpu} maxValueScore={maxValueScore} />
                    ))}
                </div>

                <div className="hidden md:block">
                    <Card className="bg-card border-white/10 overflow-hidden">
                        <div className="w-full overflow-x-auto">
                            <table className="w-full table-fixed text-sm text-left">
                                <colgroup>
                                    <col className="w-[24%]" />
                                    <col className="w-[10%]" />
                                    <col className="w-[12%]" />
                                    <col className="w-[14%]" />
                                    <col className="w-[12%]" />
                                    <col className="w-[14%]" />
                                    <col className="w-[14%]" />
                                </colgroup>
                                <thead className="text-xs text-muted-foreground uppercase bg-black/40 border-b border-white/10">
                                    <tr>
                                        <th className="px-4 py-4 font-medium">Model</th>
                                        <th className="px-4 py-4 font-medium text-right">Gaming</th>
                                        <th className="px-4 py-4 font-medium text-right">Productivity</th>
                                        <th className="px-4 py-4 font-medium text-right">Price</th>
                                        <th className="px-4 py-4 font-medium text-center">Platform</th>
                                        <th className="px-4 py-4 font-medium text-center">Verdict</th>
                                        <th className="px-4 py-4 font-medium">Value</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {cpus.map((cpu) => (
                                        <tr key={cpu.id} className="hover:bg-white/5 transition-colors">
                                            <td className="px-4 py-3.5 font-medium text-foreground">
                                                <span className="block truncate">{cpu.name}</span>
                                                <span className="text-xs text-muted-foreground truncate">{cpu.socket || "Unknown Socket"}</span>
                                            </td>
                                            <td className="px-4 py-3.5 text-right text-muted-foreground tabular-nums">
                                                {cpu.gamingScore.toLocaleString()}
                                            </td>
                                            <td className="px-4 py-3.5 text-right text-muted-foreground tabular-nums">
                                                {cpu.productivityScore.toLocaleString()}
                                            </td>
                                            <td className="px-4 py-3.5 text-right">
                                                <span className="font-bold tabular-nums">
                                                    {cpu.price > 0 ? formatINR(cpu.price) : "—"}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3.5 text-center">
                                                <span className={`inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold ${cpu.platformTier === "High"
                                                        ? "bg-green-500/20 text-green-500 border-green-500/20"
                                                        : cpu.platformTier === "Medium"
                                                            ? "bg-yellow-500/20 text-yellow-500 border-yellow-500/20"
                                                            : "bg-red-500/20 text-red-500 border-red-500/20"
                                                    }`}>
                                                    {cpu.platformTier}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3.5 text-center">
                                                <VerdictBadge verdict={cpu.verdict} />
                                            </td>
                                            <td className="px-4 py-3.5">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-mono text-xs w-10 text-right shrink-0 text-muted-foreground">
                                                        {cpu.valueScore.toFixed(2)}
                                                    </span>
                                                    <div className="h-2 flex-1 bg-black/40 rounded-full overflow-hidden min-w-0">
                                                        <div
                                                            className={`h-full rounded-full transition-all ${cpu.verdict === "Best Value" ? "bg-green-500" :
                                                                    cpu.verdict === "Overpriced" ? "bg-red-500" :
                                                                        cpu.verdict === "Fair Deal" ? "bg-emerald-400" : "bg-primary"
                                                                }`}
                                                            style={{ width: `${computeBarFillWidth(cpu.valueScore, maxValueScore)}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {cpus.length === 0 && (
                                        <tr>
                                            <td colSpan={7} className="px-6 py-12 text-center text-muted-foreground">
                                                No CPU market data available.
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
