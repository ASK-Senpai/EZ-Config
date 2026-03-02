"use client";

import { motion } from "framer-motion";
import { AlertCircle, Cpu, Zap } from "lucide-react";
import { SectionContainer } from "@/components/ui/SectionContainer";

export default function ProblemSection() {
    return (
        <section className="bg-background overflow-hidden relative border-t border-white/5">
            <SectionContainer padded>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-center">
                    {/* Text Content */}
                    <div className="space-y-6 order-1 md:order-1">
                        <h2 className="text-xl lg:text-3xl font-bold tracking-tight">
                            Building a PC Shouldn't Be Hard
                        </h2>
                        <p className="text-sm lg:text-base text-muted-foreground leading-relaxed">
                            Most builders spend hours cross-referencing spec sheets, only to find out their RAM clearance is off by 2mm, or their CPU severely bottlenecks their new GPU. It’s risky and time-consuming.
                        </p>
                        <p className="text-sm lg:text-base text-muted-foreground leading-relaxed">
                            We solve this by replacing spreadsheet checking with intelligent algorithms. Guarantee compatibility and optimize for maximum frames per dollar before you even buy a single part.
                        </p>
                    </div>

                    {/* Visual Card Block */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5 }}
                        className="order-2 md:order-2 relative rounded-2xl border border-white/10 bg-white/5 p-6 sm:p-8 shadow-2xl w-full h-full min-h-[300px] flex flex-col justify-center gap-4"
                    >
                        <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 via-transparent to-transparent opacity-50 pointer-events-none rounded-2xl" />

                        {/* Mock Warning UI */}
                        <div className="p-4 rounded-xl border border-red-500/20 bg-red-500/10 flex items-start space-x-4">
                            <AlertCircle className="w-6 h-6 text-red-400 mt-1 shrink-0" />
                            <div>
                                <h4 className="text-sm lg:text-base font-semibold text-red-200">Incompatible Socket</h4>
                                <p className="text-xs lg:text-sm text-red-300/70 mt-1">
                                    The selected CPU (AM5) is not compatible with the selected Motherboard (LGA1700).
                                </p>
                            </div>
                        </div>

                        {/* Mock Bottleneck UI */}
                        <div className="p-4 rounded-xl border border-yellow-500/20 bg-yellow-500/10 flex items-start space-x-4">
                            <Cpu className="w-6 h-6 text-yellow-400 mt-1 shrink-0" />
                            <div>
                                <h4 className="text-sm lg:text-base font-semibold text-yellow-200">Severe Bottleneck Detected</h4>
                                <p className="text-xs lg:text-sm text-yellow-300/70 mt-1">
                                    Your GPU will be heavily underutilized due to CPU limitations. Consider upgrading your CPU.
                                </p>
                            </div>
                        </div>

                    </motion.div>
                </div>
            </SectionContainer>
        </section>
    );
}
