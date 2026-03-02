"use client";

import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { SectionContainer } from "@/components/ui/SectionContainer";

export default function AIInsightSection() {
    return (
        <section className="bg-background border-t border-white/5 relative overflow-hidden">
            {/* Background Glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-[100px] pointer-events-none" />

            <SectionContainer padded className="relative z-10 max-w-3xl text-center">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="space-y-6"
                >
                    <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-white/5 border border-white/10 mb-4 shadow-xl">
                        <Sparkles className="w-8 h-8 text-primary" />
                    </div>

                    <h2 className="text-xl lg:text-3xl font-bold tracking-tight">
                        Powered by AI Insights
                    </h2>

                    <p className="text-sm lg:text-base text-muted-foreground leading-relaxed">
                        Beyond simple red/green compatibility checks, EZConfig uses fine-tuned AI to read your build context. It will explain in plain English why a certain pairing is suboptimal for gaming versus productivity, and recommend precise component swaps to resolve it.
                    </p>
                </motion.div>
            </SectionContainer>
        </section>
    );
}
