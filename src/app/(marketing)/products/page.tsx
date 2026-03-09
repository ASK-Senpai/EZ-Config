"use client";

import Link from "next/link";
import { Cpu, MonitorDot, HardDrive, Zap, CircuitBoard, ArrowRight, Database } from "lucide-react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";

const CATEGORIES = [
    { name: "Graphics Cards (GPU)", icon: MonitorDot, href: "/products/gpu", gradient: "from-green-500/20 to-emerald-500/5", desc: "Compare market pricing and gaming metrics across all models." },
    { name: "Processors (CPU)", icon: Cpu, href: "/products/cpu", gradient: "from-blue-500/20 to-indigo-500/5", desc: "Discover bottlenecks, architecture scaling, and pricing." },
    { name: "Memory (RAM)", icon: HardDrive, href: "/products/ram", gradient: "from-rose-500/20 to-pink-500/5", desc: "Speed timings, DDR4/DDR5 scaling formats." },
    { name: "Motherboards", icon: CircuitBoard, href: "/products/motherboard", gradient: "from-purple-500/20 to-fuchsia-500/5", desc: "Informational socket bindings and legacy chipsets." },
    { name: "Storage (ROM)", icon: Database, href: "/products/storage", gradient: "from-cyan-500/20 to-sky-500/5", desc: "Compare NVMe and SATA drives by speed and capacity value." },
    { name: "Power Supplies (PSU)", icon: Zap, href: "/products/psu", gradient: "from-amber-500/20 to-yellow-500/5", desc: "Wattage, efficiency tiering, and reliability limits." },
];

export default function ProductsIndex() {
    return (
        <div className="w-full max-w-7xl mx-auto px-4 py-16">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="mb-12"
            >
                <h1 className="text-4xl font-extrabold tracking-tight mb-4">Hardware Intelligence</h1>
                <p className="text-lg text-neutral-400 max-w-2xl">
                    Discover performance metrics, detect overpricing cascades, and extrapolate physical bottlenecks via pure algorithmic analytics before making any purchases.
                </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {CATEGORIES.map((cat, index) => {
                    const Icon = cat.icon;
                    return (
                        <motion.div
                            key={cat.href}
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4, delay: index * 0.1 }}
                            className="h-full"
                        >
                            <Link href={cat.href} className="block group h-full">
                                <Card className={`h-full border-neutral-800 bg-gradient-to-br ${cat.gradient} hover:border-neutral-500 transition-all duration-300 overflow-hidden relative`}>
                                    <div className="absolute inset-0 bg-black/40 group-hover:bg-transparent transition-colors duration-300" />
                                    <CardContent className="p-6 relative z-10 flex flex-col h-full border-0">
                                        <div className="flex justify-between items-start mb-4">
                                            <Icon className="w-8 h-8 text-neutral-200" />
                                            <ArrowRight className="w-5 h-5 text-neutral-500 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                                        </div>
                                        <h2 className="text-xl font-bold mb-2 text-neutral-100">{cat.name}</h2>
                                        <p className="text-sm text-neutral-400 flex-grow">{cat.desc}</p>
                                    </CardContent>
                                </Card>
                            </Link>
                        </motion.div>
                    )
                })}
            </div>
        </div>
    );
}
