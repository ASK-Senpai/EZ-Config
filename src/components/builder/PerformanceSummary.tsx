import { runEngineV12 } from "@/lib/engine";
import { BarChart3, Lightbulb } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function PerformanceSummary({ build }: { build: any }) {
    const analysis = runEngineV12(build);
    const { metrics } = analysis;

    const tierColors: Record<string, string> = {
        "Entry": "bg-blue-500/10 text-blue-500 border-blue-500/20",
        "Mid": "bg-green-500/10 text-green-500 border-green-500/20",
        "High": "bg-purple-500/10 text-purple-500 border-purple-500/20",
        "Enthusiast": "bg-amber-500/10 text-amber-500 border-amber-500/20",
    };

    return (
        <Card className="bg-neutral-900/50 border-neutral-800">
            <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-blue-500" /> Performance Profile
                </CardTitle>
                <div className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${tierColors[metrics.tier] || "bg-neutral-800 text-neutral-400 border-white/5"}`}>
                    {metrics.tier} Tier
                </div>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Gaming Score */}
                <div className="space-y-2">
                    <div className="flex justify-between items-end">
                        <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Gaming Performance</span>
                        <span className="text-lg font-black text-neutral-100">{metrics.normalizedGPU}<span className="text-[10px] text-neutral-500 font-normal ml-0.5">/100</span></span>
                    </div>
                    <div className="h-1.5 w-full bg-neutral-800 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-amber-500 rounded-full transition-all duration-500"
                            style={{ width: `${metrics.normalizedGPU}%` }}
                        />
                    </div>
                </div>

                {/* Productivity Score */}
                <div className="space-y-2">
                    <div className="flex justify-between items-end">
                        <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Workstation Power</span>
                        <span className="text-lg font-black text-neutral-100">{metrics.normalizedCPU}<span className="text-[10px] text-neutral-500 font-normal ml-0.5">/100</span></span>
                    </div>
                    <div className="h-1.5 w-full bg-neutral-800 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-blue-500 rounded-full transition-all duration-500"
                            style={{ width: `${metrics.normalizedCPU}%` }}
                        />
                    </div>
                </div>
                <div className="pt-4 border-t border-white/5 flex flex-col gap-2">
                    <div className="flex justify-between items-center text-xs">
                        <span className="text-neutral-500 font-medium">Future Proofing</span>
                        <span className="text-neutral-300 font-bold">{metrics.futureProofScore}/100</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                        <span className="text-neutral-500 font-medium">Overall Score</span>
                        <span className="text-primary font-bold">{metrics.performanceScore}</span>
                    </div>
                </div>
            </CardContent>

            {/* Optimization Tips - Conditional */}
            {build.cpu && analysis.suggestions.length > 0 && (
                <div className="px-6 pb-6 pt-0">
                    <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4 space-y-3">
                        <div className="flex items-center gap-2 text-amber-500">
                            <Lightbulb className="w-4 h-4" />
                            <span className="text-[10px] font-bold uppercase tracking-wider">Optimization Tips</span>
                        </div>
                        <ul className="space-y-2">
                            {analysis.suggestions.map((tip: string, idx: number) => (
                                <li key={idx} className="text-[11px] leading-relaxed text-neutral-400 flex gap-2">
                                    <span className="text-amber-500/50 mt-1 shrink-0">•</span>
                                    {tip}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            )}
        </Card>
    );
}
