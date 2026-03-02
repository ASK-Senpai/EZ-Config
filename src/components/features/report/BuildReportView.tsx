"use client";

import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

type BuildReportViewProps = {
    reportJson: any;
    engineSnapshot: any;
    generatedDate: string;
    components: {
        cpu?: any;
        gpu?: any;
        motherboard?: any;
        ram?: any;
        storage?: any;
        psu?: any;
    };
};

const NAV_ITEMS = [
    { id: "executive-summary", label: "Executive Summary" },
    { id: "gaming-performance", label: "Gaming Performance" },
    { id: "productivity", label: "Productivity" },
    { id: "components", label: "Components" },
    { id: "future-proofing", label: "Future Proofing" },
    { id: "bottleneck", label: "Bottleneck" },
    { id: "power-thermal", label: "Power & Thermal" },
    { id: "market-timing", label: "Market Timing" },
    { id: "final-recommendation", label: "Final Recommendation" },
];

function fpsColor(fps: number) {
    if (fps > 100) return "text-green-400";
    if (fps >= 60) return "text-yellow-400";
    return "text-red-400";
}

function SectionCard({ id, title, content, delay = 0 }: { id: string; title: string; content: React.ReactNode; delay?: number }) {
    return (
        <motion.div id={id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}>
            <Card className="rounded-2xl border border-muted bg-muted/10 shadow-md p-6 space-y-4">
                <h2 className="text-2xl font-semibold">{title}</h2>
                {content}
            </Card>
        </motion.div>
    );
}

export function BuildReportView({ reportJson, engineSnapshot, generatedDate, components }: BuildReportViewProps) {
    const overallScore = engineSnapshot?.scores?.overall ?? 0;
    const performanceTier = engineSnapshot?.scores?.tier ?? "N/A";
    const fps = engineSnapshot?.fps || {};

    const report = reportJson || {};

    return (
        <div className="space-y-8 scroll-smooth">
            <Card className="rounded-2xl border border-muted bg-gradient-to-br from-background to-muted/20 shadow-lg">
                <CardContent className="p-6 md:p-8 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Build Technical Report</h1>
                        <p className="text-muted-foreground mt-2">Comprehensive AI-generated performance and longevity assessment</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Badge variant="outline">Overall Score: {overallScore}</Badge>
                        <Badge variant="outline">Performance Tier: {performanceTier}</Badge>
                        <Badge variant="outline">Generated: {generatedDate}</Badge>
                    </div>
                </CardContent>
            </Card>

            <div className="grid grid-cols-12 gap-8">
                <aside className="hidden lg:block lg:col-span-3">
                    <Card className="rounded-2xl border border-muted bg-muted/10 shadow-md sticky top-[100px]">
                        <CardContent className="p-4 space-y-2">
                            {NAV_ITEMS.map((item) => (
                                <a key={item.id} href={`#${item.id}`} className="block text-sm text-muted-foreground hover:text-foreground transition-colors">
                                    {item.label}
                                </a>
                            ))}
                        </CardContent>
                    </Card>
                </aside>

                <main className="col-span-12 lg:col-span-9 space-y-6">
                    <SectionCard
                        id="executive-summary"
                        title="Executive Summary"
                        content={<p className="text-sm text-muted-foreground leading-relaxed">{report.executiveSummary || "Report unavailable."}</p>}
                    />

                    <SectionCard
                        id="gaming-performance"
                        title="Gaming Performance Analysis"
                        delay={0.04}
                        content={
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    {["720p", "1080p", "1440p", "4K"].map((res) => (
                                        <Card key={res} className="rounded-xl border border-muted bg-background/60">
                                            <CardContent className="p-4 space-y-2">
                                                <p className="font-semibold">{res}</p>
                                                <p className={`text-sm ${fpsColor(Number(fps?.[res]?.low || 0))}`}>Low: {fps?.[res]?.low ?? "N/A"} FPS</p>
                                                <p className={`text-sm ${fpsColor(Number(fps?.[res]?.medium || 0))}`}>Medium: {fps?.[res]?.medium ?? "N/A"} FPS</p>
                                                <p className={`text-sm ${fpsColor(Number(fps?.[res]?.high || 0))}`}>High: {fps?.[res]?.high ?? "N/A"} FPS</p>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                                <div className="space-y-2">
                                    <p className="text-sm text-muted-foreground leading-relaxed">{report.gamingAnalysis?.["1080p"] || ""}</p>
                                    <p className="text-sm text-muted-foreground leading-relaxed">{report.gamingAnalysis?.["1440p"] || ""}</p>
                                    <p className="text-sm text-muted-foreground leading-relaxed">{report.gamingAnalysis?.["4k"] || ""}</p>
                                </div>
                            </div>
                        }
                    />

                    <SectionCard
                        id="productivity"
                        title="Productivity Performance"
                        delay={0.08}
                        content={
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {[
                                    ["Premiere Pro", report.productivityBreakdown?.premiere],
                                    ["After Effects", report.productivityBreakdown?.afterEffects],
                                    ["Blender", report.productivityBreakdown?.blender],
                                    ["DaVinci Resolve", report.productivityBreakdown?.davinci],
                                    ["Unreal Engine", report.productivityBreakdown?.unrealEngine],
                                    ["Software Dev", report.productivityBreakdown?.softwareDevelopment],
                                    ["Virtualization", report.productivityBreakdown?.virtualization],
                                ].map(([title, text]) => (
                                    <Card key={title} className="rounded-xl border border-muted bg-background/60">
                                        <CardContent className="p-4 space-y-3">
                                            <div className="flex items-center justify-between">
                                                <p className="font-semibold">{title}</p>
                                                <Badge variant="secondary" className="text-[10px]">Detailed</Badge>
                                            </div>
                                            <p className="text-xs text-muted-foreground leading-relaxed">{text || "No data available."}</p>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        }
                    />

                    <SectionCard
                        id="components"
                        title="Component Deep Dive"
                        delay={0.12}
                        content={
                            <Accordion type="single" collapsible className="w-full">
                                {[
                                    { key: "cpu", title: "CPU", data: components.cpu, text: report.componentDeepDive?.cpu, specs: [components.cpu?.socket, components.cpu?.architecture || components.cpu?.generation] },
                                    { key: "gpu", title: "GPU", data: components.gpu, text: report.componentDeepDive?.gpu, specs: [components.gpu?.architecture, `${components.gpu?.vramGB ?? "?"}GB VRAM`] },
                                    { key: "motherboard", title: "Motherboard", data: components.motherboard, text: report.componentDeepDive?.motherboard, specs: [components.motherboard?.socket, components.motherboard?.memoryType] },
                                    { key: "ram", title: "RAM", data: components.ram, text: report.componentDeepDive?.ram, specs: [components.ram?.type, `${components.ram?.capacityGB ?? "?"}GB`] },
                                    { key: "storage", title: "Storage", data: components.storage, text: report.componentDeepDive?.storage, specs: [components.storage?.type, `${components.storage?.capacityGB ?? "?"}GB`] },
                                    { key: "psu", title: "PSU", data: components.psu, text: report.componentDeepDive?.psu, specs: [`${components.psu?.wattage ?? "?"}W`, components.psu?.efficiency] },
                                ].map((item) => (
                                    <AccordionItem key={item.key} value={item.key} className="border-muted">
                                        <AccordionTrigger className="text-left">{item.title}</AccordionTrigger>
                                        <AccordionContent>
                                            <div className="space-y-3">
                                                <p className="font-medium">{item.data?.name || "Not available"}</p>
                                                <div className="flex flex-wrap gap-2">
                                                    {item.specs.filter(Boolean).map((spec: any, idx: number) => (
                                                        <Badge key={idx} variant="outline">{spec}</Badge>
                                                    ))}
                                                    <Badge variant="outline">Upgrade Path: Active</Badge>
                                                </div>
                                                <p className="text-sm text-muted-foreground leading-relaxed">{item.text || "No deep-dive available."}</p>
                                            </div>
                                        </AccordionContent>
                                    </AccordionItem>
                                ))}
                            </Accordion>
                        }
                    />

                    <SectionCard
                        id="future-proofing"
                        title="Future Proofing"
                        delay={0.16}
                        content={
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {[
                                    { year: "Year 1", text: report.futureProofing?.year1, risk: "Low" },
                                    { year: "Year 3", text: report.futureProofing?.year3, risk: "Moderate" },
                                    { year: "Year 5", text: report.futureProofing?.year5, risk: "High" },
                                ].map((item) => (
                                    <Card key={item.year} className="rounded-xl border border-muted bg-background/60">
                                        <CardContent className="p-4 space-y-2">
                                            <p className="font-semibold">{item.year}</p>
                                            <Badge variant={item.risk === "Low" ? "secondary" : "outline"}>{item.risk} Risk</Badge>
                                            <p className="text-xs text-muted-foreground leading-relaxed">{item.text || "No forecast available."}</p>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        }
                    />

                    <SectionCard id="bottleneck" title="Bottleneck Technical Breakdown" delay={0.2} content={<p className="text-sm text-muted-foreground leading-relaxed">{report.bottleneckAnalysis || "No bottleneck analysis available."}</p>} />
                    <SectionCard id="power-thermal" title="Power & Thermal Stability" delay={0.24} content={<p className="text-sm text-muted-foreground leading-relaxed">{report.powerAndThermals || "No thermal analysis available."}</p>} />
                    <SectionCard id="market-timing" title="Market Timing & Value Assessment" delay={0.28} content={<p className="text-sm text-muted-foreground leading-relaxed">{report.marketValueAssessment || "No market value assessment available."}</p>} />

                    <motion.div id="final-recommendation" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.32 }}>
                        <Card className="rounded-2xl bg-gradient-to-r from-purple-600/20 to-indigo-600/20 border border-purple-500/30 p-6">
                            <CardHeader className="p-0 pb-4">
                                <CardTitle className="text-2xl">Final Recommendation</CardTitle>
                            </CardHeader>
                            <CardContent className="p-0 space-y-4">
                                <div className="flex flex-wrap gap-2">
                                    <Badge variant="outline">Buy Score: {overallScore}/100</Badge>
                                    <Badge variant="outline">Tier: {performanceTier}</Badge>
                                </div>
                                <p className="text-sm text-muted-foreground leading-relaxed">{report.finalRecommendation || "No recommendation available."}</p>
                            </CardContent>
                        </Card>
                    </motion.div>
                </main>
            </div>
        </div>
    );
}
