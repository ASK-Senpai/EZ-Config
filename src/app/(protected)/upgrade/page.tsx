"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Check, X, Shield, Zap, TrendingUp, Loader2 } from "lucide-react";

import { SectionContainer } from "@/components/ui/SectionContainer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import Link from "next/link";
import Script from "next/script";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/features/auth/AuthProvider";

// Declare Razorpay on window
declare global {
    interface Window {
        Razorpay: any;
    }
}

export default function UpgradePage() {
    const router = useRouter();
    const { user } = useAuth();
    const [isUpgrading, setIsUpgrading] = useState(false);
    const displayPriceInr = process.env.NEXT_PUBLIC_PREMIUM_PRICE_INR || "1";
    const [isPremiumActive, setIsPremiumActive] = useState(false);
    const [subscriptionStatus, setSubscriptionStatus] = useState<"active" | "inactive" | "cancelled" | "expired" | "past_due">("inactive");

    const handleUpgrade = async () => {
        if (isPremiumActive) {
            return;
        }
        if (!window.Razorpay) {
            alert("Razorpay SDK not loaded. Please check your connection.");
            return;
        }

        setIsUpgrading(true);

        try {
            if (!user) {
                router.push("/login");
                return;
            }

            const token = await user.getIdToken();

            const subscriptionRes = await fetch("/api/billing/create-subscription", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
            });
            const subscriptionData = await subscriptionRes.json();

            if (!subscriptionRes.ok) {
                throw new Error(subscriptionData.message || "Failed to create subscription.");
            }

            const options = {
                key: subscriptionData.key,
                subscription_id: subscriptionData.subscriptionId,
                name: "EZConfig Premium",
                description: "Premium SaaS Build Intelligence",
                theme: {
                    color: "#a855f7" // primary purple
                },
                handler: async function (response: any) {
                    try {
                        const verifyRes = await fetch("/api/billing/verify", {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json",
                                Authorization: `Bearer ${token}`,
                            },
                            body: JSON.stringify({
                                razorpay_subscription_id: response.razorpay_subscription_id,
                                razorpay_payment_id: response.razorpay_payment_id,
                                razorpay_signature: response.razorpay_signature
                            })
                        });

                        const verifyData = await verifyRes.json();

                        if (verifyRes.ok) {
                            alert("Welcome to Premium Intelligence!");
                            router.push("/dashboard");
                        } else {
                            throw new Error(verifyData.message || "Payment verification failed.");
                        }
                    } catch (error: any) {
                        console.error("Verification error:", error);
                        alert(error.message);
                    }
                },
                modal: {
                    ondismiss: function () {
                        setIsUpgrading(false);
                    }
                }
            };

            const rzp = new window.Razorpay(options);

            rzp.on("payment.failed", function (response: any) {
                console.error("Payment failed", response.error);
                alert("Payment failed: " + response.error.description);
                setIsUpgrading(false);
            });

            rzp.open();
            // Don't set isUpgrading(false) here, let the modal dismiss or handler do it.
        } catch (error: any) {
            console.error("Upgrade error:", error);
            alert(error.message);
            setIsUpgrading(false);
        }
    };

    useEffect(() => {
        const loadSubscriptionStatus = async () => {
            if (!user) return;
            try {
                const token = await user.getIdToken();
                const res = await fetch("/api/subscription/status", {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (!res.ok) return;
                const data = await res.json();
                setSubscriptionStatus(data.subscriptionStatus || "inactive");
                setIsPremiumActive(Boolean(data.isPremiumActive));
            } catch {
                setSubscriptionStatus("inactive");
                setIsPremiumActive(false);
            }
        };

        loadSubscriptionStatus();
    }, [user]);

    return (
        <div className="bg-background min-h-screen text-foreground pb-24">
            <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />


            {/* SECTION 1: HERO */}
            <section className="relative overflow-hidden bg-black/40 border-b border-white/5 pt-32 pb-24">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-primary/20 rounded-full blur-[120px] pointer-events-none" />

                <SectionContainer className="relative z-10 text-center space-y-8">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                        className="space-y-4 max-w-3xl mx-auto"
                    >
                        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-white to-white/60">
                            Upgrade to Premium Intelligence
                        </h1>
                        <p className="text-lg md:text-xl text-muted-foreground font-light leading-relaxed">
                            Unlock deeper AI insights, advanced performance analysis, and future-ready build optimization.
                        </p>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2, duration: 0.6 }}
                        className="flex flex-col sm:flex-row justify-center items-center gap-4"
                    >
                        <Button
                            variant="premium"
                            size="lg"
                            className="w-full sm:w-auto"
                            onClick={handleUpgrade}
                            disabled={isUpgrading || isPremiumActive}
                        >
                            {isPremiumActive ? "Premium Active" : "Upgrade Now"}
                        </Button>
                        <Button variant="outline" size="lg" className="w-full sm:w-auto" asChild>
                            <Link href="/dashboard">Back to Dashboard</Link>
                        </Button>
                    </motion.div>
                </SectionContainer>
            </section>

            {/* SECTION 2: COMPARISON TABLE */}
            <section className="py-24 border-b border-white/5">
                <SectionContainer>
                    <div className="text-center mb-16">
                        <h2 className="text-3xl font-bold tracking-tight">Free vs Premium</h2>
                        <p className="text-muted-foreground mt-2">See what you get when you upgrade.</p>
                    </div>

                    <div className="max-w-4xl mx-auto">
                        <Card className="bg-card/40 border-white/10 overflow-hidden">
                            <div className="grid grid-cols-3 border-b border-white/10 bg-black/40 p-4 sm:p-6 text-sm sm:text-base font-semibold">
                                <div>Features</div>
                                <div className="text-center">Free</div>
                                <div className="text-center text-primary">Premium</div>
                            </div>

                            {[
                                { name: "Compatibility Validation", free: true, premium: true },
                                { name: "Bottleneck Analysis", free: true, premium: true },
                                { name: "Power Estimation", free: true, premium: true },
                                { name: "Performance Tier", free: true, premium: true },
                                { name: "Basic AI Summary", free: true, premium: true },
                                { name: "Advanced AI Breakdown", free: false, premium: true },
                                { name: "Future-Proof Score", free: false, premium: true },
                                { name: "Upgrade Path Suggestions", free: false, premium: true },
                                { name: "Priority AI Depth", free: false, premium: true },
                            ].map((feature, i) => (
                                <div key={i} className="grid grid-cols-3 border-b border-white/5 p-4 sm:p-6 text-sm items-center hover:bg-white/[0.02] transition-colors">
                                    <div className="text-muted-foreground">{feature.name}</div>
                                    <div className="flex justify-center">
                                        {feature.free ? <Check className="h-5 w-5 text-green-500/80" /> : <X className="h-5 w-5 text-red-500/50" />}
                                    </div>
                                    <div className="flex justify-center">
                                        {feature.premium ? <Check className="h-5 w-5 text-primary" /> : <X className="h-5 w-5 text-muted-foreground" />}
                                    </div>
                                </div>
                            ))}
                        </Card>
                    </div>
                </SectionContainer>
            </section>

            {/* SECTION 3: PREMIUM BENEFITS */}
            <section className="py-24 bg-black/20 border-b border-white/5">
                <SectionContainer>
                    <div className="text-center mb-16">
                        <h2 className="text-3xl font-bold tracking-tight">Premium Benefits</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {[
                            {
                                title: "Advanced AI Build Analysis",
                                desc: "Get a deep dive into exactly how your components will interact under heavy load and specific use cases.",
                                icon: Zap,
                            },
                            {
                                title: "Future-Proof Scoring",
                                desc: "We calculate how long your build will remain relevant based on hardware trends and upcoming software demands.",
                                icon: Shield,
                            },
                            {
                                title: "Intelligent Upgrade Paths",
                                desc: "Actionable recommendations on which component to upgrade next for the maximum performance return on investment.",
                                icon: TrendingUp,
                            }
                        ].map((benefit, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.1 }}
                            >
                                <Card className="h-full bg-card/40 hover:bg-card/60 transition-colors border-white/5 hover:border-white/10 group cursor-pointer">
                                    <CardHeader>
                                        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 text-primary group-hover:scale-110 transition-transform">
                                            <benefit.icon className="h-6 w-6" />
                                        </div>
                                        <CardTitle className="text-lg">{benefit.title}</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-muted-foreground text-sm leading-relaxed">
                                            {benefit.desc}
                                        </p>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        ))}
                    </div>
                </SectionContainer>
            </section>

            {/* SECTION 4: PRICING CARD */}
            <section className="py-24 border-b border-white/5">
                <SectionContainer>
                    <div className="max-w-md mx-auto">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            viewport={{ once: true }}
                        >
                            <Card className="relative overflow-hidden border-white/10 bg-card p-8 shadow-2xl">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full blur-[50px] pointer-events-none translate-x-1/2 -translate-y-1/2" />

                                <div className="text-center space-y-6 relative z-10">
                                    {isPremiumActive ? (
                                        <>
                                            <h3 className="text-2xl font-bold tracking-tight">You are Premium</h3>
                                            <p className="text-sm text-muted-foreground">
                                                Your premium subscription is active.
                                            </p>
                                            <Badge variant="success" className="uppercase tracking-widest text-[10px]">Active</Badge>
                                            <Button
                                                variant="outline"
                                                size="lg"
                                                className="w-full"
                                                onClick={() => router.push("/dashboard")}
                                            >
                                                Manage Subscription
                                            </Button>
                                        </>
                                    ) : (
                                        <>
                                            <h3 className="text-2xl font-bold tracking-tight">Premium Plan</h3>
                                            <div className="flex items-end justify-center gap-1">
                                                <span className="text-4xl font-bold">₹{displayPriceInr}</span>
                                                <span className="text-muted-foreground mb-1">/month</span>
                                            </div>
                                            <p className="text-sm text-muted-foreground">
                                                Full access to all advanced insights, scoring, and priority AI processing.
                                            </p>

                                            <Button
                                                variant="premium"
                                                size="lg"
                                                className="w-full"
                                                onClick={handleUpgrade}
                                                disabled={isUpgrading}
                                            >
                                                {isUpgrading ? (
                                                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing...</>
                                                ) : "Upgrade via Razorpay"}
                                            </Button>

                                            <p className="text-xs text-muted-foreground/60 flex items-center justify-center gap-2">
                                                <Shield className="h-3 w-3" />
                                                Secure payment powered by Razorpay
                                            </p>
                                        </>
                                    )}
                                </div>
                            </Card>
                        </motion.div>
                    </div>
                </SectionContainer>
            </section>

            {/* SECTION 5: FAQ */}
            <section className="py-24 bg-black/20">
                <SectionContainer>
                    <div className="max-w-3xl mx-auto space-y-12">
                        <div className="text-center">
                            <h2 className="text-3xl font-bold tracking-tight">Frequently Asked Questions</h2>
                        </div>

                        <Accordion type="single" collapsible className="w-full">
                            <AccordionItem value="item-1" className="border-white/10">
                                <AccordionTrigger className="hover:no-underline hover:text-primary transition-colors text-left">
                                    What exactly does "Future-Proof Scoring" mean?
                                </AccordionTrigger>
                                <AccordionContent className="text-muted-foreground">
                                    Our engine evaluates your selected components against historical hardware lifecycle trends, upcoming platform shifts (like new socket releases), and modern software requirements. It then provides an estimate of how many years your PC will remain highly capable before needing major upgrades.
                                </AccordionContent>
                            </AccordionItem>

                            <AccordionItem value="item-2" className="border-white/10">
                                <AccordionTrigger className="hover:no-underline hover:text-primary transition-colors text-left">
                                    How do Upgrade Path Suggestions work?
                                </AccordionTrigger>
                                <AccordionContent className="text-muted-foreground">
                                    Instead of just telling you a bottleneck exists, Premium actively calculates the most cost-effective component swap to alleviate it. We recommend specific tiers of CPUs or GPUs that provide the maximum performance uplift based on your current setup.
                                </AccordionContent>
                            </AccordionItem>

                            <AccordionItem value="item-3" className="border-white/10">
                                <AccordionTrigger className="hover:no-underline hover:text-primary transition-colors text-left">
                                    Can I cancel my premium subscription anytime?
                                </AccordionTrigger>
                                <AccordionContent className="text-muted-foreground">
                                    Yes. You can cancel your subscription at any time from your account settings. You will retain access to your premium features until the end of your billing cycle.
                                </AccordionContent>
                            </AccordionItem>

                            <AccordionItem value="item-4" className="border-white/10">
                                <AccordionTrigger className="hover:no-underline hover:text-primary transition-colors text-left">
                                    Is my payment information secure?
                                </AccordionTrigger>
                                <AccordionContent className="text-muted-foreground">
                                    Absolutely. We use Razorpay to process all transactions. We do not store or process your credit card or sensitive financial information directly on our servers.
                                </AccordionContent>
                            </AccordionItem>
                        </Accordion>
                    </div>
                </SectionContainer>
            </section>

        </div>
    );
}
