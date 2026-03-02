"use client";

import { motion } from "framer-motion";
import { ChevronRight, Zap } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

import { SectionContainer } from "@/components/ui/SectionContainer";

export default function Hero() {
    return (
        <section className="relative flex flex-col items-center justify-center overflow-hidden bg-background pt-12 pb-16 sm:pt-20 sm:pb-24 lg:pt-32 lg:pb-32">
            {/* Background Glows */}
            <div className="absolute top-1/4 -left-20 w-72 h-72 bg-purple-500/20 rounded-full blur-[128px] animate-pulse" />
            <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-indigo-500/20 rounded-full blur-[128px] animate-pulse delay-1000" />

            <SectionContainer className="relative z-10 flex flex-col items-center text-center space-y-8">
                {/* Badge */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="inline-flex items-center rounded-full border border-purple-500/30 bg-purple-500/10 px-3 py-1 text-xs sm:text-sm text-purple-300"
                >
                    <Zap className="mr-2 h-3.5 w-3.5" />
                    <span>v1.0 Now Available</span>
                    <ChevronRight className="ml-1 h-3.5 w-3.5" />
                </motion.div>

                {/* Headline */}
                <motion.h1
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                    className="text-3xl sm:text-4xl lg:text-6xl font-bold tracking-tight bg-gradient-to-br from-white via-gray-200 to-gray-500 bg-clip-text text-transparent max-w-4xl"
                >
                    Build Balanced PCs with <br />
                    <span className="text-primary">Real Compatibility Validation</span>
                </motion.h1>

                {/* Subheadline */}
                <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    className="text-sm lg:text-base text-muted-foreground max-w-2xl"
                >
                    An intelligent platform that checks compatibility, detects bottlenecks, and optimizes power efficiency in real time.
                </motion.p>

                {/* Buttons */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.3 }}
                    className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto"
                >
                    <Button size="lg" variant="premium" className="w-full sm:w-auto h-12 px-8 text-base sm:text-lg group" asChild>
                        <Link href="/builder">
                            Start Building
                        </Link>
                    </Button>
                    <Button size="lg" variant="outline" className="w-full sm:w-auto h-12 px-8 text-base sm:text-lg" asChild>
                        <Link href="/features">Explore Features</Link>
                    </Button>
                    <Button size="lg" variant="outline" className="w-full sm:w-auto h-12 px-8 text-base sm:text-lg border-primary/20 hover:bg-primary/10" asChild>
                        <Link href="/insights/gpu-market">Explore Market Insights</Link>
                    </Button>
                </motion.div>
            </SectionContainer>
        </section>
    );
}
