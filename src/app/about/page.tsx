"use client";

import { motion } from "framer-motion";
import {
    XCircle,
    Zap,
    BarChart3,
    BrainCircuit,
    Layers,
    Database,
    Code2,
    Server,
    Palette,
    Lightbulb,
    ShieldCheck,
    ArrowUpRight
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SectionContainer } from "@/components/ui/SectionContainer";

const container = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1
        }
    }
};

const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
};

export default function About() {
    return (
        <div className="min-h-screen bg-background text-foreground">

            {/* SECTION 1: HERO */}
            <section className="relative overflow-hidden bg-black/40 border-b border-white/5">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />

                <SectionContainer padded className="relative z-10 text-center space-y-6">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                        className="space-y-4"
                    >
                        <h1 className="text-4xl md:text-5xl lg:text-7xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-white to-white/60">
                            About EZConfig
                        </h1>
                        <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto font-light">
                            We are redefining how PC hardware is selected, validated, and optimized.
                        </p>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.4, duration: 0.8 }}
                        className="max-w-3xl mx-auto pt-4"
                    >
                        <p className="text-base lg:text-lg text-muted-foreground leading-relaxed">
                            EZConfig is a rule-based PC configuration and optimization platform designed to eliminate compatibility mistakes, performance imbalance, and power miscalculations. It combines structured hardware data, benchmark analysis, and intelligent validation to help users build smarter systems.
                        </p>
                    </motion.div>
                </SectionContainer>
            </section>

            {/* SECTION 2: THE PROBLEM */}
            <section className="border-b border-white/5 bg-background">
                <SectionContainer padded>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            className="space-y-8 order-1 md:order-1"
                        >
                            <div className="space-y-4">
                                <h2 className="text-3xl md:text-4xl font-bold tracking-tight">The Problem with PC Building</h2>
                                <p className="text-base lg:text-lg text-muted-foreground">
                                    Building a custom PC is powerful — but complicated.
                                    Most existing tools only check basic compatibility. They do not explain performance balance or provide optimization insights.
                                </p>
                            </div>

                            <div className="space-y-4">
                                {[
                                    "CPU and motherboard socket mismatches",
                                    "RAM type incompatibility",
                                    "Bottlenecked CPU–GPU combinations",
                                    "Underpowered power supplies",
                                    "Confusing benchmark comparisons",
                                    "Lack of clear guidance"
                                ].map((problem, i) => (
                                    <div key={i} className="flex items-center space-x-3 text-muted-foreground">
                                        <XCircle className="h-5 w-5 text-red-500/50 shrink-0" />
                                        <span className="text-sm md:text-base">{problem}</span>
                                    </div>
                                ))}
                            </div>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            viewport={{ once: true }}
                            className="order-2 md:order-2 relative h-[300px] md:h-[400px] rounded-2xl bg-gradient-to-br from-white/5 to-transparent border border-white/10 overflow-hidden flex items-center justify-center group w-full"
                        >
                            <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:30px_30px]" />
                            <div className="relative z-10 p-8 text-center space-y-4">
                                <div className="mx-auto inline-flex h-20 w-20 items-center justify-center rounded-full bg-red-500/10 mb-4 group-hover:bg-red-500/20 transition-colors">
                                    <span className="text-4xl">?</span>
                                </div>
                                <h3 className="text-xl font-medium text-white/80">Confusion & Uncertainty</h3>
                                <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                                    Thousands of components, endless compatibility rules, and zero clear answers.
                                </p>
                            </div>
                        </motion.div>
                    </div>
                </SectionContainer>
            </section>

            {/* SECTION 3: OUR APPROACH */}
            <section className="relative border-b border-white/5 bg-black/20">
                <SectionContainer padded className="space-y-16">
                    <div className="text-center space-y-4 max-w-3xl mx-auto">
                        <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Our Approach</h2>
                        <p className="text-base lg:text-lg text-muted-foreground">
                            EZConfig is built around a modular rule-based engine. Instead of guessing compatibility, we validate it. Instead of showing raw numbers, we explain them.
                        </p>
                    </div>

                    <motion.div
                        variants={container}
                        initial="hidden"
                        whileInView="show"
                        viewport={{ once: true }}
                        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
                    >
                        {[
                            {
                                title: "Compatibility Engine",
                                desc: "Validates CPU socket, RAM type, physical dimensions, and PSU capacity using structured rules.",
                                icon: Layers,
                                color: "text-blue-400 bg-blue-400/10"
                            },
                            {
                                title: "Bottleneck Analysis",
                                desc: "Compares CPU and GPU benchmark scores to detect performance imbalances.",
                                icon: BarChart3,
                                color: "text-red-400 bg-red-400/10"
                            },
                            {
                                title: "Power Estimation",
                                desc: "Calculates total system wattage and applies safety buffers for PSU recommendations.",
                                icon: Zap,
                                color: "text-yellow-400 bg-yellow-400/10"
                            },
                            {
                                title: "AI Build Explanation",
                                desc: "Generates human-readable insights to explain why a build works or fails.",
                                icon: BrainCircuit,
                                color: "text-purple-400 bg-purple-400/10"
                            }
                        ].map((feature, i) => (
                            <motion.div key={i} variants={item} className="h-full">
                                <Card className="h-full flex flex-col bg-card/40 hover:bg-card/60 transition-colors border-white/5 hover:border-white/10">
                                    <CardHeader>
                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${feature.color}`}>
                                            <feature.icon className="h-6 w-6" />
                                        </div>
                                        <CardTitle className="text-lg md:text-xl">{feature.title}</CardTitle>
                                    </CardHeader>
                                    <CardContent className="flex-grow">
                                        <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
                                            {feature.desc}
                                        </p>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        ))}
                    </motion.div>
                </SectionContainer>
            </section>

            {/* SECTION 4: DESIGN PHILOSOPHY */}
            <section className="bg-background border-b border-white/5">
                <SectionContainer padded>
                    <div className="text-center space-y-4 max-w-3xl mx-auto mb-16">
                        <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Design Philosophy</h2>
                        <p className="text-base lg:text-lg text-muted-foreground">
                            Principles that guide how we build our engine and user interface.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {[
                            {
                                title: "Clarity over Complexity",
                                desc: "We strip away the noise. Users shouldn't need a degree in computer engineering to build a PC.",
                                icon: Lightbulb
                            },
                            {
                                title: "Validation over Assumption",
                                desc: "Every component choice is checked against strict rules. We don't guess — we verify.",
                                icon: ShieldCheck
                            },
                            {
                                title: "Guidance over Raw Data",
                                desc: "Specifications are useful, but explanations are better. We translate specs into insights.",
                                icon: ArrowUpRight
                            }
                        ].map((principle, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.2 }}
                                className="flex flex-col text-center space-y-4 p-8 rounded-2xl bg-white/5 border border-white/5 h-full"
                            >
                                <div className="mx-auto w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center mb-4">
                                    <principle.icon className="h-6 w-6 text-white/80" />
                                </div>
                                <h3 className="text-lg md:text-xl font-semibold">{principle.title}</h3>
                                <p className="text-sm md:text-base text-muted-foreground leading-relaxed flex-grow">
                                    {principle.desc}
                                </p>
                            </motion.div>
                        ))}
                    </div>
                </SectionContainer>
            </section>

            {/* SECTION 5: TECH STACK */}
            <section className="relative overflow-hidden bg-black/20 border-b border-white/5">
                <SectionContainer padded className="space-y-12">
                    <div className="text-center">
                        <h2 className="text-3xl font-bold mb-4">Built with Modern Technology</h2>
                        <p className="text-base lg:text-lg text-muted-foreground max-w-2xl mx-auto">
                            Leveraging the latest standards in web development for speed, scalability, and developer experience.
                        </p>
                    </div>

                    <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
                        {[
                            { name: "Next.js", desc: "App Router", icon: Code2 },
                            { name: "React", desc: "Server Components", icon: Server },
                            { name: "Tailwind", desc: "Styling", icon: Palette },
                            { name: "Framer Motion", desc: "Animations", icon: Layers },
                            { name: "Firebase", desc: "Data Storage", icon: Database },
                            { name: "Groq", desc: "AI Inference", icon: BrainCircuit },
                        ].map((tech, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 10 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.1 }}
                                className="p-6 rounded-xl bg-white/5 border border-white/5 text-center space-y-3 hover:bg-white/10 transition-colors"
                            >
                                <div className="mx-auto w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                                    <tech.icon className="h-5 w-5" />
                                </div>
                                <div>
                                    <div className="font-semibold text-sm md:text-base">{tech.name}</div>
                                    <div className="text-xs md:text-sm text-muted-foreground">{tech.desc}</div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </SectionContainer>
            </section>
        </div>
    );
}
