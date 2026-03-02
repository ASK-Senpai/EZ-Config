import { useState, useEffect, useMemo } from "react";
import { formatINR } from "@/lib/utils/formatCurrency";
import { motion, AnimatePresence } from "framer-motion";
import { X, Search, Filter, Loader2, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { searchProducts } from "@/lib/search/searchService";
import { FilterSidebar } from "./FilterSidebar";
import { CompatibilityBadge } from "./CompatibilityBadge";
import { validateCompatibility } from "@/lib/engine/compatibility";
import { estimateSystemPower } from "@/lib/engine/powerEstimator";
import { BaseProduct } from "@/lib/products/types";

interface ComponentSelectModalProps {
    isOpen: boolean;
    onClose: () => void;
    category: string;
    onSelect: (item: BaseProduct) => void;
    currentBuild: any;
}

export function ComponentSelectModal({
    isOpen,
    onClose,
    category,
    onSelect,
    currentBuild
}: ComponentSelectModalProps) {
    const [query, setQuery] = useState("");
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState<any[]>([]);
    const [filters, setFilters] = useState<any>({
        brand: "",
        socket: "",
        ramType: "",
        storageType: "",
        minWattage: 0,
        sortBy: "price",
        sortDir: "asc"
    });

    // Reset state when category changes or modal closes
    useEffect(() => {
        if (!isOpen) {
            setResults([]);
            setQuery("");
            setLoading(false);
            return;
        }
        // When category changes while open, also reset search
        setResults([]);
        setQuery("");
    }, [category, isOpen]);

    // Fetch data
    useEffect(() => {
        if (!isOpen) return;

        const controller = new AbortController();
        const fetchResults = async () => {
            setLoading(true);
            try {
                const res = await searchProducts({
                    query,
                    category,
                    brand: filters.brand || undefined,
                    sortBy: filters.sortBy,
                    sortDir: filters.sortDir,
                    limit: 100
                });
                setResults(res.hits);
            } catch (err) {
                console.error("Search error:", err);
            } finally {
                setLoading(false);
            }
        };

        const timeoutId = setTimeout(fetchResults, 300);
        return () => {
            clearTimeout(timeoutId);
            controller.abort();
        };
    }, [isOpen, query, category, filters.brand, filters.sortBy]);

    // Client-side hard filtering (Phase 97)
    const processedResults = useMemo(() => {
        let items = [...results];

        // 1. CPU <-> Motherboard Socket Hard Filter
        if (category === "motherboard" && currentBuild.cpu?.socket) {
            items = items.filter(m => m.socket === currentBuild.cpu.socket);
        }
        if (category === "cpu" && currentBuild.motherboard?.socket) {
            items = items.filter(c => c.socket === currentBuild.motherboard.socket);
        }

        // 2. PSU Wattage Hard Filter
        if (category === "psu") {
            const { recommendedMinimum } = estimateSystemPower(currentBuild);
            items = items.filter(p => (p.wattage || 0) >= recommendedMinimum);
        }

        // 3. Manual user filters (Sidebar)
        return items.filter(item => {
            if (category === 'motherboard' && filters.socket && item.socket !== filters.socket) return false;
            if (category === 'cpu' && filters.socket && item.socket !== filters.socket) return false;
            if (category === 'ram' && filters.ramType && item.type !== filters.ramType) return false;
            if (category === 'storage' && filters.storageType && item.type !== filters.storageType) return false;
            if (category === 'psu' && filters.minWattage && (item.wattage || 0) < filters.minWattage) return false;
            return true;
        });
    }, [results, currentBuild, category, filters]);

    // Derived unique values for Filters
    const uniqueValues = useMemo(() => {
        const brands = Array.from(new Set(results.map(r => r.brand))).sort();
        const sockets = category === 'cpu' || category === 'motherboard'
            ? Array.from(new Set(results.map(r => r.socket))).filter(Boolean).sort()
            : [];
        return { brands, sockets };
    }, [results, category]);

    const emptyMessage = useMemo(() => {
        if (category === "motherboard" && currentBuild.cpu) {
            return `No ${currentBuild.cpu.socket} motherboards found matching your search.`;
        }
        if (category === "psu") {
            const { recommendedMinimum } = estimateSystemPower(currentBuild);
            return `No PSUs found with at least ${recommendedMinimum}W matching your search.`;
        }
        return `No matching ${category} found.`;
    }, [category, currentBuild, query, results.length]);

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="relative bg-neutral-950 border border-white/10 w-full max-w-6xl h-[85vh] rounded-3xl overflow-hidden shadow-2xl flex flex-col"
                >
                    {/* Header */}
                    <div className="p-6 border-b border-white/5 flex items-center justify-between bg-neutral-900/50">
                        <div className="flex items-center gap-4">
                            <h2 className="text-2xl font-black uppercase tracking-tight text-white">Select {category}</h2>
                            <div className="px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-bold uppercase tracking-widest">
                                {processedResults.length} Results
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-full hover:bg-white/5 transition-colors text-neutral-500 hover:text-white"
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    <div className="flex-1 flex overflow-hidden">
                        {/* Sidebar */}
                        <div className="p-6 bg-neutral-950/50">
                            <FilterSidebar
                                category={category}
                                filters={filters}
                                setFilters={setFilters}
                                uniqueValues={uniqueValues}
                            />
                        </div>

                        {/* Main Area */}
                        <div className="flex-1 flex flex-col min-w-0 bg-neutral-900/20">
                            {/* Search Bar */}
                            <div className="p-6 pb-2">
                                <div className="relative">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                                    <Input
                                        placeholder={`Search ${category} by name, brand, or specs...`}
                                        className="pl-12 h-14 bg-neutral-900 border-neutral-800 rounded-2xl focus:ring-primary/50 text-lg"
                                        value={query}
                                        onChange={(e) => setQuery(e.target.value)}
                                        autoFocus
                                    />
                                </div>
                            </div>

                            {/* Grid */}
                            <div className="flex-1 overflow-y-auto p-6 pt-2">
                                {loading ? (
                                    <div className="h-full flex flex-col items-center justify-center text-neutral-500 gap-3">
                                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                                        <span className="font-bold tracking-tight">Accessing Algolia...</span>
                                    </div>
                                ) : processedResults.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-neutral-500 gap-3 opacity-50">
                                        <XCircle className="w-12 h-12" />
                                        <span className="text-xl font-bold tracking-tight text-center max-w-xs">{emptyMessage}</span>
                                        <Button variant="link" onClick={() => { setFilters({}); setQuery(""); }}>Clear all filters</Button>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-20">
                                        {processedResults.map((item) => {
                                            return (
                                                <div
                                                    key={item.id}
                                                    className="group relative p-4 rounded-2xl border bg-neutral-900/50 border-neutral-800 hover:border-primary/50 hover:bg-neutral-800/50 transition-all duration-300"
                                                >
                                                    <div className="flex flex-col h-full">
                                                        <div className="flex justify-between items-start mb-2">
                                                            <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">{item.brand}</span>
                                                        </div>
                                                        <h4 className="font-bold text-sm text-neutral-100 mb-4 line-clamp-2 leading-tight flex-1">
                                                            {item.name}
                                                        </h4>

                                                        <div className="flex items-center justify-between pt-4 border-t border-white/5">
                                                            <div className="flex flex-col">
                                                                <span className="text-xs font-black text-white tabular-nums">
                                                                    {item.pricing?.priceRange?.min ? formatINR(item.pricing.priceRange.min) : "₹--"}
                                                                </span>
                                                            </div>
                                                            <Button
                                                                size="sm"
                                                                className="bg-primary text-black font-bold h-8 px-4 rounded-xl shadow-lg hover:scale-105 active:scale-95 transition-all"
                                                                onClick={() => onSelect(item)}
                                                            >
                                                                Select
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
