"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { FileText, ArrowRight, Calendar, ChevronRight, Activity } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/features/auth/AuthProvider";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function ReportsPage() {
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();
    const [reports, setReports] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchReports = async () => {
            if (authLoading || !user) return;
            try {
                const token = await user.getIdToken();
                const res = await fetch("/api/reports", {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const data = await res.json();
                if (res.ok) {
                    setReports(data.reports || []);
                }
            } catch (err) {
                console.error("Failed to fetch reports", err);
            } finally {
                setLoading(false);
            }
        };
        fetchReports();
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
                <p className="text-muted-foreground animate-pulse">Loading intelligence reports...</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 max-w-7xl mx-auto w-full">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div>
                    <h1 className="text-4xl font-extrabold tracking-tight mb-2 flex items-center gap-3">
                        <Activity className="w-8 h-8 text-primary" />
                        Intelligence Reports
                    </h1>
                    <p className="text-muted-foreground text-lg max-w-2xl">
                        Review your generated AI build analyses and performance estimations.
                    </p>
                </div>
                <Button onClick={() => router.push("/builder")} className="bg-primary text-primary-foreground hover:bg-primary/90">
                    Optimize New Build
                    <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
            </div>

            {reports.length === 0 ? (
                <Card className="border-dashed border-2 bg-transparent text-center py-16">
                    <CardContent className="flex flex-col items-center justify-center space-y-4 pt-6">
                        <FileText className="w-12 h-12 text-muted-foreground/50" />
                        <div className="space-y-1">
                            <h3 className="text-xl font-bold">No reports generated yet</h3>
                            <p className="text-muted-foreground max-w-sm mx-auto">
                                Head over to the PC Builder to create a hardware configuration and generate deep intelligence insights.
                            </p>
                        </div>
                        <Button variant="outline" onClick={() => router.push("/builder")} className="mt-4">
                            Go to App Builder
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <motion.div
                    variants={container}
                    initial="hidden"
                    animate="show"
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                >
                    {reports.map((report) => (
                        <motion.div key={report.id} variants={item}>
                            <Card className="bg-card hover:border-primary/50 transition-colors flex flex-col h-full">
                                <CardHeader>
                                    <div className="flex items-start justify-between">
                                        <CardTitle className="text-xl line-clamp-1">{report.buildName || "Untitled Build"}</CardTitle>
                                    </div>
                                    <div className="flex items-center text-xs text-muted-foreground mt-2">
                                        <Calendar className="w-3 h-3 mr-1" />
                                        {new Date(report.createdAt?._seconds ? report.createdAt._seconds * 1000 : report.createdAt).toLocaleDateString("en-US", { year: 'numeric', month: 'long', day: 'numeric' })}
                                    </div>
                                </CardHeader>
                                <CardContent className="flex-1">
                                    <p className="text-sm text-muted-foreground line-clamp-3">
                                        {report.summary}
                                    </p>
                                </CardContent>
                                <CardFooter className="pt-4 border-t border-border/50">
                                    <Button
                                        variant="ghost"
                                        className="w-full justify-between"
                                        onClick={() => router.push(`/reports/${report.id}`)}
                                    >
                                        View Full Report
                                        <ChevronRight className="w-4 h-4 ml-2" />
                                    </Button>
                                </CardFooter>
                            </Card>
                        </motion.div>
                    ))}
                </motion.div>
            )}
        </div>
    );
}
