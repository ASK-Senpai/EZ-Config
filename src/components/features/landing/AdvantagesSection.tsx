"use client";

import { motion } from "framer-motion";
import { Cpu, Gauge, Zap } from "lucide-react";
import { SectionContainer } from "@/components/ui/SectionContainer";

const advantages = [
    {
        icon: Cpu,
        title: "Smart Compatibility Engine",
        description: "Evaluates physical dimensions, socket types, and power delivery to guarantee a flawless build every time.",
    },
    {
        icon: Gauge,
        title: "Performance Balance Detection",
        description: "Ensures you aren't overspending on a GPU that your CPU can't keep up with, optimizing your overall budget.",
    },
    {
        icon: Zap,
        title: "Intelligent Power Optimization",
        description: "Calculates total system draw under full load and recommends a safe, efficient power supply rating.",
    },
];

export default function AdvantagesSection() {
    return (
        <section className="bg-background relative border-t border-white/5">
            <SectionContainer padded>
                <div className="text-center mb-12 sm:mb-16 space-y-4">
                    <h2 className="text-xl lg:text-3xl font-bold tracking-tight">
                        Smarter Engineering, Not Just Compatibility
                    </h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 sm:gap-8">
                    {advantages.map((adv, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5, delay: index * 0.1 }}
                            whileHover={{ y: -5 }}
                            className="flex flex-col h-full p-6 lg:p-8 rounded-2xl border border-white/5 bg-white/5 backdrop-blur-sm transition-all group"
                        >
                            <div className="p-3 rounded-xl bg-white/10 w-fit mb-6 text-primary group-hover:bg-primary/20 transition-colors">
                                <adv.icon className="h-6 w-6" />
                            </div>
                            <h3 className="text-lg lg:text-xl font-semibold mb-3">{adv.title}</h3>
                            <p className="text-sm lg:text-base text-muted-foreground leading-relaxed flex-grow">
                                {adv.description}
                            </p>
                        </motion.div>
                    ))}
                </div>
            </SectionContainer>
        </section>
    );
}
