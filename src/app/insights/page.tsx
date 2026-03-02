import Link from "next/link";
import { BarChart3, Cpu, MonitorPlay } from "lucide-react";
import { SectionContainer } from "@/components/ui/SectionContainer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Metadata } from "next";

export const runtime = "nodejs";
export const revalidate = 300;

export const metadata: Metadata = {
    title: "Market Insights | EZ-Config",
    description: "Real-time performance per dollar analytics across hardware categories.",
};

export default function InsightsHubPage() {
    return (
        <div className="min-h-screen bg-background text-foreground pt-20 pb-24 selection:bg-primary/30 overflow-x-hidden">
            <SectionContainer className="py-16 md:py-24 space-y-12">
                <div className="text-center space-y-4 mb-12">
                    <div className="inline-flex items-center justify-center p-3 mb-4 bg-primary/10 rounded-2xl ring-1 ring-primary/20 shadow-[0_0_40px_-10px_rgba(168,85,247,0.4)]">
                        <BarChart3 className="w-8 h-8 text-primary" />
                    </div>
                    <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">Market Insights</h1>
                    <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                        Real-time performance per dollar analytics across hardware categories.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card className="bg-card/50 border-white/10 hover:border-primary/40 transition-colors">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-xl font-bold flex items-center gap-2">
                                <MonitorPlay className="w-5 h-5 text-primary" />
                                GPU Market Insights
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-5">
                            <p className="text-muted-foreground">
                                Performance per rupee breakdown across graphics cards.
                            </p>
                            <Link
                                href="/insights/gpu-market"
                                className={cn(buttonVariants({ variant: "premium" }), "w-full md:w-auto")}
                            >
                                Explore GPU Insights
                            </Link>
                        </CardContent>
                    </Card>

                    <Card className="bg-card/50 border-white/10 hover:border-primary/40 transition-colors">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-xl font-bold flex items-center gap-2">
                                <Cpu className="w-5 h-5 text-primary" />
                                CPU Market Insights
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-5">
                            <p className="text-muted-foreground">
                                Core performance and value analysis across processors.
                            </p>
                            <Link
                                href="/insights/cpu-market"
                                className={cn(buttonVariants({ variant: "premium" }), "w-full md:w-auto")}
                            >
                                Explore CPU Insights
                            </Link>
                        </CardContent>
                    </Card>
                </div>
            </SectionContainer>
        </div>
    );
}
