"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
    LayoutDashboard,
    Layers,
    Hammer,
    FileText,
    TrendingUp,
    User,
    CreditCard,
    Activity,
    ChevronLeft,
    Menu,
    LogOut,
    Crown
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface SidebarProps {
    isPremium?: boolean;
    usage?: { used: number; limit: number };
    userName?: string;
    role?: string;
}

const navItems = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "My Builds", href: "/builds", icon: Layers },
    { name: "Builder", href: "/builder", icon: Hammer },
    { name: "AI Reports", href: "/reports", icon: FileText },
];

const settingItems = [
    { name: "Billing", href: "/billing", icon: CreditCard },
    { name: "Usage", href: "/usage", icon: Activity },
    { name: "Account", href: "/account", icon: User },
];

export function Sidebar({ isPremium, usage, userName, role }: SidebarProps) {
    const pathname = usePathname();
    const [isCollapsed, setIsCollapsed] = useState(false);

    useEffect(() => {
        const stored = localStorage.getItem("sidebar-collapsed");
        if (stored !== null) setIsCollapsed(stored === "true");
    }, []);

    const toggleCollapse = () => {
        const newState = !isCollapsed;
        setIsCollapsed(newState);
        localStorage.setItem("sidebar-collapsed", String(newState));
    };

    return (
        <aside className={cn(
            "hidden md:flex md:flex-col bg-card border-r border-border h-screen sticky top-0 transition-all duration-300 z-40",
            isCollapsed ? "md:w-16" : "md:w-64"
        )}>
            {/* Header / Logo */}
            <div className="p-4 flex items-center justify-between border-b border-border h-16">
                {!isCollapsed && (
                    <Link href="/" className="font-bold text-xl tracking-tight text-primary">
                        EZ<span className="text-foreground">Config</span>
                    </Link>
                )}
                <Button variant="ghost" size="icon" onClick={toggleCollapse} className="ml-auto">
                    {isCollapsed ? <Menu className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
                </Button>
            </div>

            <SidebarContent
                isCollapsed={isCollapsed}
                role={role}
            />
        </aside>
    );
}

export function SidebarContent({
    isCollapsed = false,
    role,
}: {
    isCollapsed?: boolean;
    role?: string;
}) {
    const pathname = usePathname();

    return (
        <nav className="flex-1 py-4 overflow-y-auto overflow-x-hidden space-y-6 px-3">
            <div className="space-y-1">
                {!isCollapsed && <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] px-3 mb-3">Main</p>}
                {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={cn(
                                "flex items-center gap-3 px-3 py-2 rounded-md transition-all duration-200 relative group",
                                isActive ? "bg-primary/10 text-primary font-semibold" : "text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground"
                            )}
                        >
                            <Icon className={cn("h-5 w-5 shrink-0 transition-colors", isActive ? "text-primary" : "text-muted-foreground group-hover:text-accent-foreground")} />
                            {!isCollapsed && <span>{item.name}</span>}
                            {isActive && !isCollapsed && (
                                <motion.div
                                    layoutId="active-sidebar"
                                    className="absolute left-0 w-1 h-5 bg-primary rounded-r-full"
                                />
                            )}
                        </Link>
                    );
                })}
            </div>

            <div className="space-y-1">
                {!isCollapsed && <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] px-3 mb-3">Account</p>}
                {settingItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={cn(
                                "flex items-center gap-3 px-3 py-2 rounded-md transition-all duration-200 relative group",
                                isActive ? "bg-primary/10 text-primary font-semibold" : "text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground"
                            )}
                        >
                            <Icon className={cn("h-5 w-5 shrink-0 transition-colors", isActive ? "text-primary" : "text-muted-foreground group-hover:text-accent-foreground")} />
                            {!isCollapsed && <span>{item.name}</span>}
                        </Link>
                    );
                })}
            </div>

            {role === "admin" && (
                <div className="pt-6 border-t border-border space-y-1">
                    {!isCollapsed && <p className="text-[10px] font-bold text-red-500/80 uppercase tracking-[0.2em] px-3 mb-3">System</p>}
                    <Link
                        href="/admin"
                        className={cn(
                            "flex items-center gap-3 px-3 py-2 rounded-md transition-all duration-200 relative group",
                            pathname.startsWith("/admin") ? "bg-red-500/10 text-red-500 font-semibold" : "text-muted-foreground hover:bg-red-500/5 hover:text-red-500"
                        )}
                    >
                        <LayoutDashboard className="h-5 w-5 shrink-0" />
                        {!isCollapsed && <span>Admin Panel</span>}
                    </Link>
                </div>
            )}
        </nav>
    );
}

