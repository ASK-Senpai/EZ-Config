"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ShieldAlert, Users, Crown, Zap, PenTool, XOctagon } from "lucide-react";
import { SectionContainer } from "@/components/ui/SectionContainer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export default function AdminDashboardPage() {
    const router = useRouter();
    const [metrics, setMetrics] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchMetrics = async () => {
            try {
                const res = await fetch("/api/admin/metrics");
                const data = await res.json();

                if (!res.ok) {
                    if (res.status === 403) {
                        router.replace("/dashboard");
                        return;
                    }
                    if (res.status === 401) {
                        router.replace("/login");
                        return;
                    }
                    throw new Error(data.message || "Failed to load metrics");
                }

                setMetrics(data.metrics);
            } catch (err: any) {
                setError(err.message);
                console.error("Admin error:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchMetrics();
    }, [router]);

    if (loading) {
        return (
            <SectionContainer className="py-16 md:py-24">
                <div className="flex flex-col items-center justify-center space-y-4">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-red-500 border-t-transparent" />
                    <p className="text-muted-foreground animate-pulse">Verifying Admin Access...</p>
                </div>
            </SectionContainer>
        );
    }

    if (error) {
        return (
            <SectionContainer className="py-16 md:py-24 text-center">
                <div className="bg-red-500/10 border border-red-500/20 p-6 rounded-xl inline-block max-w-lg">
                    <ShieldAlert className="w-8 h-8 text-red-500 mx-auto mb-4" />
                    <h2 className="text-xl font-bold mb-2">Access Denied</h2>
                    <p className="text-muted-foreground mb-6">{error}</p>
                    <Button onClick={() => router.push("/dashboard")}>Return to Dashboard</Button>
                </div>
            </SectionContainer>
        );
    }

    const statCards = [
        {
            title: "Total Users",
            value: metrics?.totalUsers || 0,
            icon: <Users className="w-5 h-5 text-blue-500" />,
            border: "hover:border-blue-500/50"
        },
        {
            title: "Premium Users",
            value: metrics?.totalPremiumUsers || 0,
            icon: <Crown className="w-5 h-5 text-yellow-500" />,
            border: "hover:border-yellow-500/50"
        },
        {
            title: "Total AI Calls",
            value: metrics?.totalAiCalls || 0,
            icon: <Zap className="w-5 h-5 text-purple-500" />,
            border: "hover:border-purple-500/50"
        },
        {
            title: "Total Builds Created",
            value: metrics?.totalBuilds || 0,
            icon: <PenTool className="w-5 h-5 text-green-500" />,
            border: "hover:border-green-500/50"
        },
        {
            title: "Total Cancellations",
            value: metrics?.totalCancellations || 0,
            icon: <XOctagon className="w-5 h-5 text-red-500" />,
            border: "hover:border-red-500/50"
        }
    ];

    return (
        <div className="min-h-screen bg-background text-foreground pb-24">
            <SectionContainer className="py-12 md:py-16 space-y-8">

                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-white/5 pb-8 mb-8">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <ShieldAlert className="w-8 h-8 text-red-500" />
                            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">System Admin</h1>
                        </div>
                        <p className="text-muted-foreground md:text-lg">Internal platform analytics and metrics overview.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {statCards.map((stat, i) => (
                        <motion.div
                            key={stat.title}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.1 }}
                        >
                            <Card className={`bg-card/50 border-white/10 ${stat.border} transition-colors overflow-hidden group relative h-full flex flex-col justify-center py-6`}>
                                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                <CardHeader className="flex flex-row items-center justify-between pb-2">
                                    <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                                        {stat.title}
                                    </CardTitle>
                                    <div className="p-2 bg-black/40 rounded-lg">
                                        {stat.icon}
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-4xl font-bold tracking-tighter">
                                        {new Intl.NumberFormat().format(stat.value)}
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    ))}
                </div>

            </SectionContainer>
        </div>
    );
}
