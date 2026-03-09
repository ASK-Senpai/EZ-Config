"use client";

import React, { useState, useEffect } from "react";
import { Activity, History, Zap, Sparkles, Filter } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const Progress = ({ value, className }: { value: number, className?: string }) => (
    <div className={`w-full bg-border rounded-full h-2 overflow-hidden ${className}`}>
        <div className="bg-primary h-full transition-all duration-500" style={{ width: `${value}%` }} />
    </div>
);

export default function UsagePage() {

    const [usage, setUsage] = useState({ used: 0, limit: 5, logs: [] });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchUsage = async () => {
            try {
                const res = await fetch("/api/build/list"); // Initial placeholder, will create dedicated usage API if needed
                const data = await res.json();
                if (res.ok) {
                    setUsage({
                        used: data.subscription?.aiUsage || 0,
                        limit: data.subscription?.aiLimit || 5,
                        logs: []
                    });
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchUsage();
    }, []);

    const percent = Math.min(100, (usage.used / usage.limit) * 100);

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Resource Usage</h1>
                <p className="text-muted-foreground">Track your AI technical report credits and system activity.</p>
            </div>

            <div className="grid gap-6">
                <Card>
                    <CardHeader>
                        <div className="flex justify-between items-start">
                            <div>
                                <CardTitle>AI Technical Reports</CardTitle>
                                <CardDescription>Credits used this billing cycle</CardDescription>
                            </div>
                            <Badge variant={percent > 90 ? "destructive" : "secondary"}>
                                {usage.used} / {usage.limit} Units
                            </Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Monthly Progress</span>
                                <span className="font-medium">{Math.round(percent)}%</span>
                            </div>
                            <Progress value={percent} className="h-2" />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="p-4 rounded-lg bg-muted/30 border border-border/50">
                                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">Estimated Reset</p>
                                <p className="text-lg font-bold">1st of next month</p>
                            </div>
                            <div className="p-4 rounded-lg bg-primary/5 border border-primary/10">
                                <p className="text-xs text-primary uppercase tracking-wider font-semibold mb-1">Plan Limit</p>
                                <p className="text-lg font-bold text-primary">{usage.limit} Units</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div className="space-y-1">
                            <CardTitle>Activity Log</CardTitle>
                            <CardDescription>Recent AI generation events and system actions.</CardDescription>
                        </div>
                        <Button variant="outline" size="sm">
                            <Filter className="h-4 w-4 mr-2" />
                            Filter
                        </Button>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground bg-muted/10 rounded-xl border border-dashed border-border">
                            <History className="h-10 w-10 mb-4 opacity-20" />
                            <p className="text-sm">No activity records found for this period.</p>
                            <p className="text-xs mt-1">Activities will appear here as you generate reports.</p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
