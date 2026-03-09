"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Cpu, ChevronDown } from "lucide-react";
import GlobalSearch from "@/components/search/GlobalSearch";
import { LogoutButton } from "@/components/layout/LogoutButton";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface AppHeaderProps {
    isPremium: boolean;
    usage?: { used: number; limit: number };
}

export function AppHeader({ isPremium, usage }: AppHeaderProps) {
    const pathname = usePathname();

    const navLinks = [
        { name: "Home", href: "/" },
        { name: "Features", href: "/features" },
        { name: "Insights", href: "/insights" },
        { name: "About", href: "/about" },
        { name: "Contact", href: "/contact" },
    ];

    return (
        <header className="h-16 border-b border-border flex items-center px-6 bg-card/30 backdrop-blur-sm sticky top-0 z-30 justify-between gap-4">
            {/* Left: Logo & Nav */}
            <div className="flex items-center gap-8">
                <Link href="/" className="flex items-center space-x-2 shrink-0">
                    <Cpu className="h-5 w-5 text-primary" />
                    <span className="text-lg font-bold tracking-tight bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
                        EZConfig
                    </span>
                </Link>

                <nav className="hidden lg:flex items-center space-x-5">
                    {/* Home */}
                    <Link
                        href="/"
                        className={cn(
                            "text-xs font-medium transition-colors hover:text-primary relative group",
                            pathname === "/" ? "text-primary" : "text-muted-foreground"
                        )}
                    >
                        Home
                        <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary transition-all group-hover:w-full" />
                    </Link>

                    {/* Products Dropdown */}
                    <DropdownMenu>
                        <DropdownMenuTrigger className="flex items-center gap-1 text-xs font-medium transition-colors hover:text-primary text-muted-foreground outline-none data-[state=open]:text-primary group">
                            Products <ChevronDown className="w-3 h-3 opacity-70 group-data-[state=open]:rotate-180 transition-transform" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-48 bg-background/95 backdrop-blur-xl border-white/10" asChild>
                            <motion.div
                                initial={{ opacity: 0, y: -5 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.2 }}
                            >
                                <DropdownMenuItem asChild>
                                    <Link href="/products/gpu" className="cursor-pointer text-xs">Graphics Cards (GPU)</Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                    <Link href="/products/cpu" className="cursor-pointer text-xs">Processors (CPU)</Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                    <Link href="/products/vgpu" className="cursor-pointer text-xs text-teal-400/80">Integrated GPU (iGPU)</Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                    <Link href="/products/ram" className="cursor-pointer text-xs">Memory (RAM)</Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                    <Link href="/products/motherboard" className="cursor-pointer text-xs">Motherboards</Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                    <Link href="/products/storage" className="cursor-pointer text-xs">Storage (SSD/HDD)</Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                    <Link href="/products/psu" className="cursor-pointer text-xs">Power Supplies</Link>
                                </DropdownMenuItem>
                            </motion.div>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    {navLinks.slice(1).map((link) => (
                        <Link
                            key={link.href}
                            href={link.href}
                            className={cn(
                                "text-xs font-medium transition-colors hover:text-primary relative group",
                                pathname === link.href ? "text-primary" : "text-muted-foreground"
                            )}
                        >
                            {link.name}
                            <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary transition-all group-hover:w-full" />
                        </Link>
                    ))}
                </nav>
            </div>

            {/* Center/Right: Search */}
            <div className="flex-1 max-w-sm hidden md:block">
                <GlobalSearch />
            </div>

            {/* Right: Premium & Logout */}
            <div className="flex items-center gap-4 shrink-0">
                <div className="flex items-center gap-3">
                    {isPremium ? (
                        <div className="flex items-center gap-2 px-3 py-1 bg-yellow-500/10 border border-yellow-500/20 rounded-full">
                            <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse" />
                            <span className="text-[10px] font-extrabold text-yellow-500 uppercase tracking-[0.1em] whitespace-nowrap">
                                PREMIUM • {usage?.used || 0}/{usage?.limit || 0}
                            </span>
                        </div>
                    ) : (
                        <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-3 py-1 bg-muted/50 rounded-full inline-block">
                            Free Plan
                        </div>
                    )}
                </div>
                <div className="h-4 w-px bg-border hidden sm:block" />
                <LogoutButton />
            </div>
        </header>
    );
}
