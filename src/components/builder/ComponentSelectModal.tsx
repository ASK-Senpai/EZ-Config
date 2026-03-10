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

// ── Static per-category filter data ────────────────────────────────────────────
// Using static lists instead of deriving from results so all options are always
// available regardless of what's in the current result page.
const FILTER_DATA: Record<string, {
    brands: string[];
    sockets?: string[];
    chipsets?: string[];
}> = {
    cpu: { brands: ["AMD", "Intel"], sockets: ["AM4", "AM5", "LGA1700", "LGA1851", "LGA1200"] },
    gpu: { brands: ["NVIDIA", "AMD", "Intel"] },
    ram: { brands: ["Corsair", "G.Skill", "Kingston", "Crucial", "TeamGroup", "Adata"] },
    storage: { brands: ["Samsung", "WD", "Seagate", "Crucial", "Kingston", "Sabrent"] },
    motherboard: {
        brands: ["ASUS", "MSI", "Gigabyte", "ASRock"],
        sockets: ["AM4", "AM5", "LGA1700", "LGA1851"],
        chipsets: ["X870E", "X870", "B850", "B650E", "B650", "X670E", "X670",
            "Z890", "Z790", "B760", "H770", "H610"],
    },
    psu: { brands: ["Corsair", "Seasonic", "EVGA", "be quiet!", "Cooler Master", "Thermaltake"] },
};

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

    // Fetch data — all user-preference filters sent to Algolia, no client-side filtering
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
                    socket: filters.socket || undefined,
                    ramType: filters.ramType || undefined,
                    storageType: filters.storageType || undefined,
                    chipset: filters.chipset || undefined,
                    efficiency: filters.efficiency || undefined,
                    apu: filters.apu || undefined,
                    // PSU: merge user preference with build-required minimum
                    minWattageGte: category === "psu"
                        ? Math.max(
                            estimateSystemPower(currentBuild).recommendedMinimum,
                            filters.minWattage || 0
                        ) || undefined
                        : undefined,
                    sortBy: filters.sortBy as any,
                    sortDir: (filters.sortDir || "asc") as any,
                    limit: 100,
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
    }, [isOpen, query, category, filters.brand, filters.socket, filters.ramType,
        filters.storageType, filters.chipset, filters.efficiency, filters.apu,
        filters.minWattage, filters.sortBy, filters.sortDir]);

    // Hard-compatibility post-filter (depends on build state, NOT user preference — stays client-side)
    const processedResults = useMemo(() => {
        let items = [...results];

        // CPU ↔ Motherboard socket lock (cross-constraint from current build)
        if (category === "motherboard" && currentBuild.cpu?.socket) {
            items = items.filter(m => m.socket === currentBuild.cpu.socket);
        }
        if (category === "cpu" && currentBuild.motherboard?.socket) {
            items = items.filter(c => c.socket === currentBuild.motherboard.socket);
        }

        return items;
    }, [results, currentBuild, category]);

    // Static filter options — always show the full list regardless of current results
    const uniqueValues = useMemo(() => {
        const data = FILTER_DATA[category] ?? { brands: [] };
        return {
            brands: data.brands ?? [],
            sockets: data.sockets ?? [],
            chipsets: data.chipsets ?? [],
        };
    }, [category]);

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
            <div className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
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
