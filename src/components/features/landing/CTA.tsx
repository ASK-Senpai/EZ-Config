"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Button } from "@/components/ui/button";

import { SectionContainer } from "@/components/ui/SectionContainer";

export default function CTA() {
    return (
        <section className="relative overflow-hidden border-t border-white/5 bg-background">
            <div className="absolute inset-0 bg-primary/5 pointer-events-none" />

            <SectionContainer padded className="relative z-10">
                <div className="max-w-4xl mx-auto text-center space-y-6 sm:space-y-8 p-8 sm:p-12 rounded-3xl border border-white/10 bg-black/40 backdrop-blur-md shadow-2xl">
                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-2xl sm:text-4xl lg:text-5xl font-bold tracking-tight"
                    >
                        Ready to build your dream PC?
                    </motion.h2>
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.1 }}
                        className="text-sm sm:text-lg lg:text-xl text-muted-foreground max-w-2xl mx-auto"
                    >
                        Start component selection now and get instant compatibility feedback. No account required to start.
                    </motion.p>
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.2 }}
                    >
                        <Button size="lg" variant="premium" className="w-full sm:w-auto h-12 sm:h-14 px-8 sm:px-10 text-base sm:text-xl rounded-full" asChild>
                            <Link href="/builder">
                                Start Configuration
                            </Link>
                        </Button>
                    </motion.div>
                </div>
            </SectionContainer>
        </section>
    );
}
