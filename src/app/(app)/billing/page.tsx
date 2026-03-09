"use client";

import React, { useState, useEffect } from "react";
import { CreditCard, CheckCircle2, ChevronRight, Crown, AlertCircle, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function BillingPage() {
    const [subscription, setSubscription] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchBilling = async () => {
            try {
                const res = await fetch("/api/build/list"); // Reuse build list to get sub status
                const data = await res.json();
                if (res.ok) setSubscription(data.subscription);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchBilling();
    }, []);

    const isPremium = subscription?.plan !== "free" && subscription?.subscriptionStatus === "active";

    if (loading) return <div>Loading...</div>;

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Billing & Subscription</h1>
                <p className="text-muted-foreground">Manage your subscription plan and payment methods.</p>
            </div>

            <div className="grid gap-6">
                <Card className={isPremium ? "border-primary/50 bg-primary/5" : ""}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0">
                        <div className="space-y-1">
                            <CardTitle>Current Plan</CardTitle>
                            <CardDescription>You are currently on the <span className="font-bold text-foreground capitalize">{subscription?.plan || "free"}</span> plan.</CardDescription>
                        </div>
                        {isPremium ? (
                            <Badge className="bg-primary text-primary-foreground text-xs uppercase tracking-widest px-3 py-1">Active</Badge>
                        ) : (
                            <Badge variant="outline">Free Tier</Badge>
                        )}
                    </CardHeader>
                    <CardContent className="space-y-4 pt-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="p-4 bg-background rounded-lg border border-border/50">
                                <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider font-semibold">AI Credits</p>
                                <p className="text-xl font-bold">{subscription?.aiLimit - subscription?.aiUsage} / {subscription?.aiLimit} remaining</p>
                            </div>
                            <div className="p-4 bg-background rounded-lg border border-border/50">
                                <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider font-semibold">Next Billing Date</p>
                                <p className="text-xl font-bold">N/A</p>
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter className="border-t px-6 py-4 flex flex-col sm:flex-row gap-3 justify-between items-center">
                        <p className="text-xs text-muted-foreground">Managed via Razorpay. To update payment methods, please use the portal.</p>
                        <div className="flex gap-3 w-full sm:w-auto">
                            {isPremium ? (
                                <Button variant="outline" className="w-full sm:w-auto">Manage Subscription</Button>
                            ) : (
                                <Button className="w-full sm:w-auto bg-primary">Upgrade to Premium</Button>
                            )}
                        </div>
                    </CardFooter>
                </Card>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Premium Features</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ul className="space-y-2 text-sm">
                                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-green-500" /> 50 AI Technical Reports / mo</li>
                                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-green-500" /> Advanced Bottleneck Analysis</li>
                                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-green-500" /> Optimal Hardware Suggestions</li>
                                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-green-500" /> Priority Build Validation</li>
                            </ul>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Payment History</CardTitle>
                        </CardHeader>
                        <CardContent className="flex flex-col items-center justify-center py-8 text-center bg-muted/20 rounded-lg">
                            <CreditCard className="h-8 w-8 text-muted-foreground mb-3" />
                            <p className="text-sm text-muted-foreground">No recent transactions found.</p>
                            <Button variant="link" size="sm" className="mt-2">View full history <ExternalLink className="ml-1 h-3 w-3" /></Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
