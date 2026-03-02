"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Cpu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionContainer } from "@/components/ui/SectionContainer";

export default function DashboardEmptyState() {
    return (
        <SectionContainer className="flex items-center justify-center min-h-[80vh]">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-lg p-8 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md shadow-2xl text-center space-y-6 relative overflow-hidden group"
            >
                {/* Glow Effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-50 pointer-events-none" />

                {/* Icon */}
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4 group-hover:bg-primary/20 transition-colors">
                    <Cpu className="h-8 w-8 text-primary" />
                </div>

                {/* Content */}
                <div className="space-y-2 relative z-10">
                    <h2 className="text-2xl font-bold tracking-tight">
                        No Build Activity Yet
                    </h2>
                    <p className="text-muted-foreground">
                        You haven’t created any PC configurations yet. Start building to analyze compatibility, detect bottlenecks, and generate performance insights.
                    </p>
                </div>

                {/* Action */}
                <div className="pt-4 relative z-10">
                    <Button variant="premium" size="lg" className="w-full sm:w-auto" asChild>
                        <Link href="/builder">
                            Start Your First Build
                        </Link>
                    </Button>
                </div>
            </motion.div>
        </SectionContainer>
    );
}
