"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Cpu, ChevronDown, Menu } from "lucide-react";
import GlobalSearch from "@/components/search/GlobalSearch";
import { LogoutButton } from "@/components/layout/LogoutButton";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SidebarContent } from "@/components/layout/Sidebar";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

export function AppHeader() {
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
            <div className="flex items-center gap-4 lg:gap-8">
                <Sheet>
                    <SheetTrigger className="md:hidden inline-flex items-center justify-center rounded-md p-2 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                        <Menu className="h-6 w-6" />
                        <span className="sr-only">Open sidebar</span>
                    </SheetTrigger>
                    <SheetContent side="left" className="w-64 p-0">
                        <SheetHeader className="px-4 pt-4 pb-2 border-b border-border">
                            <SheetTitle>Navigation</SheetTitle>
                        </SheetHeader>
                        <div className="h-16 flex items-center px-4 border-b border-border">
                            <Link href="/" className="flex items-center space-x-2 shrink-0">
                                <Cpu className="h-5 w-5 text-primary" />
                                <span className="text-lg font-bold tracking-tight bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
                                    EZConfig
                                </span>
                            </Link>
                        </div>
                        <SidebarContent />
                    </SheetContent>
                </Sheet>
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
                        <DropdownMenuContent align="start" className="w-48 bg-background/95 backdrop-blur-xl border-white/10 p-1 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2">
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

            {/* Right: Logout */}
            <div className="flex items-center gap-4 shrink-0">
                <LogoutButton />
            </div>
        </header>
    );
}
