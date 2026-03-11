"use client";

import React, { useState, useEffect } from "react";
import { CreditCard, CheckCircle2, ChevronRight, Crown, AlertCircle, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const ENABLE_PAYMENT_HISTORY = false;

export default function BillingPage() {
    const [subscription, setSubscription] = useState<any>(null);

    const [payments, setPayments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchBillingData = async () => {
            try {
                const subRes = await fetch("/api/user/subscription");
                if (subRes.ok) {
                    const subData = await subRes.json();
                    setSubscription(subData);
                }

                // Fetch payment history
                const payRes = await fetch("/api/user/payments");
                if (payRes.ok) {
                    const payData = await payRes.json();
                    setPayments(payData.payments || []);
                }
            } catch (err) {
                console.error("Failed to fetch billing data", err);
            } finally {
                setLoading(false);
            }
        };
        fetchBillingData();
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
                                <p className="text-xl font-bold">{subscription?.remaining || 0} / {subscription?.aiLimit || 5} remaining</p>
                            </div>
                            <div className="p-4 bg-background rounded-lg border border-border/50">
                                <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider font-semibold">Next Billing Date</p>
                                <p className="text-xl font-bold">
                                    {subscription?.nextBillingDate ? new Date(subscription.nextBillingDate).toLocaleDateString(undefined, {
                                        year: 'numeric', month: 'long', day: 'numeric'
                                    }) : "N/A"}
                                </p>
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
                    {ENABLE_PAYMENT_HISTORY && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">Payment History</CardTitle>
                                <CardDescription>View your previous subscription transactions.</CardDescription>
                            </CardHeader>
                            <CardContent className="p-0">
                                {payments.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-8 text-center bg-muted/20 rounded-b-lg">
                                        <CreditCard className="h-8 w-8 text-muted-foreground mb-3" />
                                        <p className="text-sm text-muted-foreground">No recent transactions found.</p>
                                    </div>
                                ) : (
                                    <div className="divide-y divide-border/50">
                                        {payments.slice(0, 5).map((payment) => (
                                            <div key={payment.id} className="flex justify-between items-center p-4 text-sm hover:bg-muted/10 transition-colors">
                                                <div>
                                                    <p className="font-medium text-foreground">
                                                        {new Date(payment.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground tracking-tight">{payment.id}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="font-bold">₹{payment.amount}</p>
                                                    <Badge variant={payment.status === "captured" ? "outline" : "destructive"} className="text-[10px] mt-1 uppercase">
                                                        {payment.status === "captured" ? "Paid" : payment.status}
                                                    </Badge>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
}
