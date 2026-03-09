"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Instagram } from "lucide-react";

import { SectionContainer } from "@/components/ui/SectionContainer";

export default function Contact() {
    return (
        <section className="bg-background min-h-screen">
            <SectionContainer padded>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-start">

                    {/* Contact Form - Mobile First */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 }}
                        className="order-1 md:order-2 rounded-2xl border border-white/10 bg-card p-6 sm:p-8 shadow-2xl w-full"
                    >
                        <form className="space-y-6">
                            <div className="space-y-2">
                                <Label htmlFor="name">Name</Label>
                                <Input id="name" placeholder="John Doe" className="w-full" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <Input id="email" type="email" placeholder="john@example.com" className="w-full" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="message">Message</Label>
                                <Textarea id="message" placeholder="How can we help you?" className="min-h-[150px] w-full" />
                            </div>
                            <Button variant="premium" className="w-full" size="lg">
                                Send Message
                            </Button>
                        </form>
                    </motion.div>

                    {/* Contact Info - Below Form on Mobile */}
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="order-2 md:order-1 space-y-6 md:pr-8"
                    >
                        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Get in touch</h1>
                        <p className="text-muted-foreground text-base sm:text-lg leading-relaxed">
                            Have questions about the platform or found a bug?
                            Reach out to our engineering team.
                        </p>

                        <div className="space-y-4 pt-4 sm:pt-8 w-full">
                            <div className="p-6 rounded-xl bg-card border border-white/5 hover:border-white/10 transition-colors group">
                                <h3 className="font-semibold mb-2">General Inquiries</h3>
                                <a
                                    href="mailto:asksenpai.dev@gmail.com"
                                    className="text-sm md:text-base text-muted-foreground group-hover:text-primary transition-colors break-all"
                                >
                                    asksenpai.dev@gmail.com
                                </a>
                            </div>

                            <a
                                href="https://www.instagram.com/asksenpai.dev/"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block p-6 rounded-xl bg-card border border-white/5 hover:border-white/10 transition-colors group w-full"
                            >
                                <h3 className="font-semibold mb-2">Social</h3>
                                <div className="flex items-center gap-3 text-sm md:text-base text-muted-foreground group-hover:text-primary transition-colors">
                                    <Instagram className="h-5 w-5" />
                                    <span>@asksenpai.dev</span>
                                </div>
                            </a>
                        </div>
                    </motion.div>

                </div>
            </SectionContainer>
        </section>
    );
}
