"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
    Zap,
    Sparkles,
    Layers,
    History,
    Plus,
    ArrowRight,
    Search,
    ShieldCheck,
    Cpu,
    Activity
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/features/auth/AuthProvider";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function DashboardPage() {
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();
    const [stats, setStats] = useState({
        totalBuilds: 0,
        aiReports: 0,
        usage: 0,
        limit: 5,
        plan: "free"
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            if (authLoading || !user) return;
            try {
                const token = await user.getIdToken();
                const [buildsRes, reportsRes] = await Promise.all([
                    fetch("/api/build/list", { headers: { Authorization: `Bearer ${token}` } }),
                    fetch("/api/reports", { headers: { Authorization: `Bearer ${token}` } })
                ]);

                const buildsData = await buildsRes.json();
                const reportsData = await reportsRes.json();

                if (buildsRes.ok && reportsRes.ok) {
                    const builds = buildsData.builds || [];
                    const reports = reportsData.reports || [];
                    setStats({
                        totalBuilds: builds.length,
                        aiReports: reports.length,
                        usage: buildsData.subscription?.aiUsage || 0,
                        limit: buildsData.subscription?.aiLimit || 5,
                        plan: buildsData.subscription?.plan || "free"
                    });
                }
            } catch (err) {
                console.error("Failed to fetch dashboard stats", err);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, [user, authLoading]);

    const container = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: { staggerChildren: 0.1 }
        }
    };

    const item = {
        hidden: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0 }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                <p className="text-muted-foreground animate-pulse">Initializing Dashboard...</p>
            </div>
        );
    }

    return (
        <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="space-y-8"
        >
            {/* Hero / Welcome */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div>
                    <h1 className="text-4xl font-extrabold tracking-tight mb-2 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
                        Welcome back, {user?.displayName?.split(' ')[0] || "Command Center"}
                    </h1>
                    <p className="text-muted-foreground text-lg max-w-2xl">
                        Monitor your builds, analyze configurations with AI, and optimize for peak performance.
                    </p>
                </div>
                <div className="flex gap-3">
                    <Button variant="outline" onClick={() => router.push("/builds")}>
                        View All Builds
                    </Button>
                    <Button onClick={() => router.push("/builder")} className="bg-primary text-primary-foreground hover:bg-primary/90">
                        <Plus className="h-4 w-4 mr-2" />
                        New Configuration
                    </Button>
                </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <motion.div variants={item}>
                    <Card className="bg-card hover:bg-card/80 transition-all border-border/40">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Saved Builds</CardTitle>
                            <Layers className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.totalBuilds}</div>
                            <p className="text-xs text-muted-foreground mt-1">Total archived builds</p>
                        </CardContent>
                    </Card>
                </motion.div>
                <motion.div variants={item}>
                    <Card className="bg-card hover:bg-card/80 transition-all border-border/40">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">AI Reports</CardTitle>
                            <Sparkles className="h-4 w-4 text-purple-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.aiReports}</div>
                            <p className="text-xs text-muted-foreground mt-1">Generated technical reports</p>
                        </CardContent>
                    </Card>
                </motion.div>
                <motion.div variants={item}>
                    <Card className="bg-card hover:bg-card/80 transition-all border-border/40">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">AI Usage</CardTitle>
                            <Zap className="h-4 w-4 text-yellow-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.usage} / {stats.limit}</div>
                            <p className="text-xs text-muted-foreground mt-1">Monthly report queries</p>
                        </CardContent>
                    </Card>
                </motion.div>
                <motion.div variants={item}>
                    <Card className="bg-card hover:bg-card/80 transition-all border-border/40">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">System Role</CardTitle>
                            <ShieldCheck className="h-4 w-4 text-primary" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold capitalize">{stats.plan}</div>
                            <p className="text-xs text-muted-foreground mt-1">Active subscription tier</p>
                        </CardContent>
                    </Card>
                </motion.div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Action Area */}
                <div className="lg:col-span-2 space-y-6">
                    <motion.div variants={item}>
                        <Card className="bg-gradient-to-br from-primary/10 via-background to-background border-primary/20 overflow-hidden relative group">
                            <div className="absolute top-0 right-0 p-8 transform translate-x-4 -translate-y-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                <Cpu className="w-32 h-32 text-primary" />
                            </div>
                            <CardHeader>
                                <CardTitle className="text-2xl">Start a new build</CardTitle>
                                <CardDescription className="text-base max-w-md">
                                    Our intelligent engine checks for over 50+ compatibility factors including VRM thermal headroom and PCIe lane saturation.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Button size="lg" onClick={() => router.push("/builder")} className="group">
                                    Launch Intelligent Builder
                                    <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                                </Button>
                            </CardContent>
                        </Card>
                    </motion.div>

                    <motion.div variants={item}>
                        <div className="flex items-center gap-3 mb-4">
                            <History className="h-5 w-5 text-muted-foreground" />
                            <h2 className="text-xl font-bold">Suggested Actions</h2>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Card className="bg-card hover:border-primary/50 transition-colors cursor-pointer" onClick={() => router.push("/reports")}>
                                <CardHeader className="p-4">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-blue-500/10 rounded-lg">
                                            <Search className="h-5 w-5 text-blue-500" />
                                        </div>
                                        <div>
                                            <CardTitle className="text-base">Review Reports</CardTitle>
                                            <CardDescription className="text-xs">Analyze your generated AI feedback</CardDescription>
                                        </div>
                                    </div>
                                </CardHeader>
                            </Card>
                            <Card className="bg-card hover:border-primary/50 transition-colors cursor-pointer" onClick={() => router.push("/usage")}>
                                <CardHeader className="p-4">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-orange-500/10 rounded-lg">
                                            <Activity className="h-5 w-5 text-orange-500" />
                                        </div>
                                        <div>
                                            <CardTitle className="text-base">Check Usage</CardTitle>
                                            <CardDescription className="text-xs">Track your credits and API calls</CardDescription>
                                        </div>
                                    </div>
                                </CardHeader>
                            </Card>
                        </div>
                    </motion.div>
                </div>

                {/* Sidebar area */}
                <div className="space-y-6">
                    <motion.div variants={item}>
                        <Card className="border-border/40">
                            <CardHeader>
                                <CardTitle className="text-lg">Recent Insights</CardTitle>
                                <CardDescription>Latest hardware market trends</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-3">
                                    <div className="flex flex-col gap-1">
                                        <span className="text-xs text-muted-foreground">Market Price Update</span>
                                        <p className="text-sm font-medium">NVIDIA RTX 50-series availability tracking started.</p>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <span className="text-xs text-muted-foreground">Value Alert</span>
                                        <p className="text-sm font-medium">AMD Ryzen 7800X3D maintains peak value-for-gaming.</p>
                                    </div>
                                </div>
                                <Button variant="ghost" className="w-full justify-between text-primary hover:text-primary hover:bg-primary/5 p-0" onClick={() => router.push("/insights")}>
                                    View Full Market Insights
                                    <ArrowRight className="h-4 w-4" />
                                </Button>
                            </CardContent>
                        </Card>
                    </motion.div>

                    <motion.div variants={item}>
                        <Card className="bg-zinc-950 border-zinc-800">
                            <CardHeader className="pb-2">
                                <Badge variant="outline" className="w-fit mb-2 text-yellow-500 border-yellow-500/20 bg-yellow-500/10">PRO TIP</Badge>
                                <CardTitle className="text-base text-zinc-100">Optimized Builds</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <p className="text-sm text-zinc-400">
                                    Premium users can use AI to automatically reconfigure a build for better performance or lower cost while keeping same performance.
                                </p>
                                {stats.plan === "free" && (
                                    <Button variant="premium" className="w-full" onClick={() => router.push("/upgrade")}>
                                        Upgrade Now
                                    </Button>
                                )}
                            </CardContent>
                        </Card>
                    </motion.div>
                </div>
            </div>
        </motion.div>
    );
}
