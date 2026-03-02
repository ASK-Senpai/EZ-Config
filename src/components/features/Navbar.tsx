"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Cpu, Menu, X, LogOut, LayoutDashboard, ChevronDown } from "lucide-react";
import GlobalSearch from "@/components/search/GlobalSearch";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";

import { SectionContainer } from "@/components/ui/SectionContainer";

interface NavbarProps {
    isLoggedIn: boolean;
}

const Navbar = ({ isLoggedIn }: NavbarProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const pathname = usePathname();
    const router = useRouter();

    const handleLogout = async () => {
        await fetch("/api/auth/logout", {
            method: "POST",
        });
        router.refresh();
    };

    const navLinks = [
        { name: "Home", href: "/" },
        { name: "Features", href: "/features" },
        { name: "Insights", href: "/insights" },
        { name: "About", href: "/about" },
        { name: "Contact", href: "/contact" },
    ];

    return (
        <header className="sticky top-0 z-50 w-full border-b border-white/5 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/80">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex h-16 items-center justify-between">
                    <div className="flex items-center">
                        <Link href="/" className="flex items-center space-x-2">
                            <Cpu className="h-6 w-6 text-primary" />
                            <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
                                EZConfig
                            </span>
                        </Link>

                        {/* Desktop Nav Links */}
                        <nav className="hidden md:flex ml-10 space-x-8 items-center">
                            {/* Static Link: Home */}
                            <Link href="/" className={cn("text-sm font-medium transition-colors hover:text-primary relative group", pathname === "/" ? "text-primary" : "text-muted-foreground")}>
                                Home
                                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary transition-all group-hover:w-full" />
                            </Link>

                            {/* Dropdown: Products */}
                            <DropdownMenu>
                                <DropdownMenuTrigger className="flex items-center gap-1 text-sm font-medium transition-colors hover:text-primary text-muted-foreground outline-none data-[state=open]:text-primary group">
                                    Products <ChevronDown className="w-3 h-3 opacity-70 group-data-[state=open]:rotate-180 transition-transform" />
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start" className="w-48 bg-background/95 backdrop-blur-xl border-white/10" asChild>
                                    <motion.div
                                        initial={{ opacity: 0, y: -5 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.2 }}
                                    >
                                        <DropdownMenuItem asChild>
                                            <Link href="/products/gpu" className="cursor-pointer">Graphics Cards (GPU)</Link>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem asChild>
                                            <Link href="/products/cpu" className="cursor-pointer">Processors (CPU)</Link>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem asChild>
                                            <Link href="/products/vgpu" className="cursor-pointer">Integrated GPU (iGPU)</Link>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem asChild>
                                            <Link href="/products/ram" className="cursor-pointer">Memory (RAM)</Link>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem asChild>
                                            <Link href="/products/motherboard" className="cursor-pointer">Motherboards</Link>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem asChild>
                                            <Link href="/products/storage" className="cursor-pointer">Storage (SSD/HDD)</Link>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem asChild>
                                            <Link href="/products/psu" className="cursor-pointer">Power Supplies</Link>
                                        </DropdownMenuItem>
                                    </motion.div>
                                </DropdownMenuContent>
                            </DropdownMenu>

                            {/* Remaining Static Links */}
                            {navLinks.slice(1).map((link) => (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    className={cn(
                                        "text-sm font-medium transition-colors hover:text-primary relative group",
                                        pathname === link.href ? "text-primary" : "text-muted-foreground"
                                    )}
                                >
                                    {link.name}
                                    <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary transition-all group-hover:w-full" />
                                </Link>
                            ))}
                        </nav>
                    </div>

                    {/* Global Search — Desktop */}
                    <div className="hidden md:flex items-center">
                        <GlobalSearch />
                    </div>

                    {/* Desktop Auth */}
                    <div className="hidden md:flex items-center space-x-4">
                        {isLoggedIn ? (
                            <>
                                <Button variant="ghost" size="sm" asChild>
                                    <Link href="/dashboard">
                                        <LayoutDashboard className="mr-2 h-4 w-4" />
                                        Dashboard
                                    </Link>
                                </Button>
                                <Button variant="outline" size="sm" onClick={handleLogout}>
                                    <LogOut className="mr-2 h-4 w-4" />
                                    Logout
                                </Button>
                            </>
                        ) : (
                            <>
                                <Button variant="ghost" size="sm" asChild>
                                    <Link href="/login">Log In</Link>
                                </Button>
                                <Button variant="premium" size="sm" asChild>
                                    <Link href="/register">Sign Up</Link>
                                </Button>
                            </>
                        )}
                    </div>

                    {/* Mobile Menu Toggle */}
                    <div className="flex md:hidden items-center gap-2">
                        <GlobalSearch />

                        <button
                            type="button"
                            className="p-2 text-muted-foreground hover:text-white focus:outline-none"
                            onClick={() => setIsOpen(!isOpen)}
                            aria-expanded={isOpen}
                        >
                            <span className="sr-only">Open main menu</span>
                            {isOpen ? (
                                <X className="block h-6 w-6" aria-hidden="true" />
                            ) : (
                                <Menu className="block h-6 w-6" aria-hidden="true" />
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Nav */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="md:hidden border-b border-white/5 bg-background/95 backdrop-blur-xl overflow-hidden"
                    >
                        <div className="px-4 pt-2 pb-6 space-y-6">
                            <div className="flex flex-col space-y-4">
                                <Link
                                    href="/"
                                    onClick={() => setIsOpen(false)}
                                    className={cn("block text-base font-medium transition-colors hover:text-primary", pathname === "/" ? "text-primary" : "text-muted-foreground")}
                                >
                                    Home
                                </Link>

                                <Accordion type="single" collapsible className="w-full">
                                    <AccordionItem value="products" className="border-b-0">
                                        <AccordionTrigger className="py-0 text-base font-medium text-muted-foreground hover:text-primary hover:no-underline">
                                            Products
                                        </AccordionTrigger>
                                        <AccordionContent className="pb-0 pt-4">
                                            <div className="flex flex-col space-y-4 pl-4 border-l border-white/10 ml-2">
                                                <Link href="/products/gpu" onClick={() => setIsOpen(false)} className="text-sm text-muted-foreground hover:text-primary">Graphics Cards</Link>
                                                <Link href="/products/cpu" onClick={() => setIsOpen(false)} className="text-sm text-muted-foreground hover:text-primary">Processors</Link>
                                                <Link href="/products/vgpu" onClick={() => setIsOpen(false)} className="text-sm text-teal-500/70 hover:text-teal-400">Integrated GPU (iGPU)</Link>
                                                <Link href="/products/ram" onClick={() => setIsOpen(false)} className="text-sm text-muted-foreground hover:text-primary">Memory</Link>
                                                <Link href="/products/motherboard" onClick={() => setIsOpen(false)} className="text-sm text-muted-foreground hover:text-primary">Motherboards</Link>
                                                <Link href="/products/storage" onClick={() => setIsOpen(false)} className="text-sm text-muted-foreground hover:text-primary">Storage (SSD/HDD)</Link>
                                                <Link href="/products/psu" onClick={() => setIsOpen(false)} className="text-sm text-muted-foreground hover:text-primary">Power Supplies</Link>
                                            </div>
                                        </AccordionContent>
                                    </AccordionItem>
                                </Accordion>

                                {navLinks.slice(1).map((link) => (
                                    <Link
                                        key={link.href}
                                        href={link.href}
                                        onClick={() => setIsOpen(false)}
                                        className={cn(
                                            "block text-base font-medium transition-colors hover:text-primary",
                                            pathname === link.href ? "text-primary" : "text-muted-foreground"
                                        )}
                                    >
                                        {link.name}
                                    </Link>
                                ))}
                            </div>

                            <div className="pt-6 border-t border-white/10 flex flex-col gap-3">
                                {isLoggedIn ? (
                                    <>
                                        <Button variant="outline" className="w-full justify-center" asChild>
                                            <Link href="/dashboard" onClick={() => setIsOpen(false)}>
                                                <LayoutDashboard className="mr-2 h-4 w-4" />
                                                Dashboard
                                            </Link>
                                        </Button>
                                        <Button variant="ghost" className="w-full justify-center" onClick={() => { handleLogout(); setIsOpen(false); }}>
                                            <LogOut className="mr-2 h-4 w-4" />
                                            Logout
                                        </Button>
                                    </>
                                ) : (
                                    <>
                                        <Button variant="outline" className="w-full" asChild>
                                            <Link href="/login" onClick={() => setIsOpen(false)}>Log In</Link>
                                        </Button>
                                        <Button variant="premium" className="w-full" asChild>
                                            <Link href="/register" onClick={() => setIsOpen(false)}>Sign Up</Link>
                                        </Button>
                                    </>
                                )}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </header>
    );
};

export default Navbar;
