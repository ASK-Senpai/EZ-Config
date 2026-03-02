"use client";

import { motion } from "framer-motion";
import { SectionContainer } from "@/components/ui/SectionContainer";

const steps = [
    { num: "01", title: "Select Core", text: "Start with a CPU or GPU to set your baseline." },
    { num: "02", title: "Auto-Match", text: "We filter compatible parts instantly." },
    { num: "03", title: "Analyze", text: "Review bottlenecks and power requirements." },
    { num: "04", title: "Finalize", text: "Export, save, or buy your optimal build." },
];

export default function HowItWorksSection() {
    return (
        <section className="bg-black/20 border-t border-white/5">
            <SectionContainer padded>
                <div className="text-center mb-12 sm:mb-16">
                    <h2 className="text-xl lg:text-3xl font-bold tracking-tight">
                        How It Works
                    </h2>
                </div>

                {/* Desktop: Horizontal layout, Mobile: Vertical timeline */}
                <div className="flex flex-col md:flex-row gap-8 md:gap-4 relative">

                    {/* Connecting Line (Desktop) */}
                    <div className="hidden md:block absolute top-[40px] left-[10%] right-[10%] h-px bg-white/10 z-0" />

                    {/* Connecting Line (Mobile) */}
                    <div className="md:hidden absolute top-[10%] bottom-[10%] left-[40px] w-px bg-white/10 z-0" />

                    {steps.map((step, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 10 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.4, delay: index * 0.1 }}
                            className="flex-1 flex md:flex-col items-center md:text-center relative z-10 gap-6 md:gap-4"
                        >
                            {/* Step Number Circle */}
                            <div className="w-20 h-20 shrink-0 md:w-20 md:h-20 rounded-full border-2 border-primary/30 bg-background flex flex-col items-center justify-center text-primary font-bold shadow-[0_0_15px_rgba(var(--primary),0.2)]">
                                <span className="text-sm opacity-60 font-normal leading-none mb-1">Step</span>
                                <span className="text-xl leading-none">{step.num}</span>
                            </div>

                            {/* Step Content */}
                            <div className="flex flex-col md:items-center text-left md:text-center pt-2 md:pt-0">
                                <h3 className="text-lg lg:text-xl font-semibold mb-2">{step.title}</h3>
                                <p className="text-sm lg:text-base text-muted-foreground w-full md:max-w-[200px]">
                                    {step.text}
                                </p>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </SectionContainer>
        </section>
    );
}
