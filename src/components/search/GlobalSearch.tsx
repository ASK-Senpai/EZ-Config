"use client";

import { useEffect, useState, useCallback, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search, Loader2, Cpu, Monitor, MemoryStick, Zap, ArrowRight } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { formatINR } from "@/lib/analytics/market";
import type { SearchHit } from "@/lib/search/searchService";

// ── Category display config ────────────────────────────────────────────────────
const CATEGORY_CONFIG: Record<string, { label: string; Icon: React.ElementType; color: string }> = {
    gpu: { label: "GPU", Icon: Monitor, color: "text-purple-400 bg-purple-500/10 border-purple-500/20" },
    cpu: { label: "CPU", Icon: Cpu, color: "text-blue-400 bg-blue-500/10 border-blue-500/20" },
    ram: { label: "RAM", Icon: MemoryStick, color: "text-green-400 bg-green-500/10 border-green-500/20" },
    psu: { label: "PSU", Icon: Zap, color: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20" },
    vgpu: { label: "iGPU", Icon: Cpu, color: "text-teal-400 bg-teal-500/10 border-teal-500/20" },
};


// ── Trigger Button (used in Navbar) ───────────────────────────────────────────
export function SearchTrigger({ onClick }: { onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            className="flex items-center gap-2 px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 hover:border-neutral-600 rounded-lg text-sm text-neutral-400 hover:text-neutral-200 transition-all group"
            aria-label="Open search"
        >
            <Search className="w-4 h-4" />
            <span className="hidden sm:block">Search products…</span>
            <kbd className="hidden sm:flex items-center gap-1 text-[10px] font-mono bg-neutral-800 group-hover:bg-neutral-700 px-1.5 py-0.5 rounded border border-neutral-700 text-neutral-500">
                <span>⌘</span>K
            </kbd>
        </button>
    );
}

// ── Result Row ─────────────────────────────────────────────────────────────────
function HitRow({ hit, onSelect }: { hit: SearchHit; onSelect: (hit: SearchHit) => void }) {
    const cfg = CATEGORY_CONFIG[hit.category] ?? CATEGORY_CONFIG.gpu;
    const { Icon } = cfg;
    const minPrice = (hit as any).pricing?.priceRange?.min;
    const gamingScore = (hit as any).gamingScore ?? (hit as any).normalized?.gamingScore ?? 0;

    return (
        <CommandItem
            key={hit.objectID}
            value={`${hit.name} ${hit.brand} ${hit.category}`}
            onSelect={() => onSelect(hit)}
            className="flex items-center gap-3 px-3 py-3 cursor-pointer rounded-lg data-[selected=true]:bg-neutral-800"
        >
            <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-neutral-800 shrink-0">
                <Icon className="w-4 h-4 text-amber-500" />
            </div>

            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <span className="font-medium text-sm text-neutral-100 truncate">{hit.name}</span>
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border shrink-0 ${cfg.color}`}>
                        {cfg.label}
                    </span>
                </div>
                <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-xs text-neutral-500">{hit.brand}</span>
                    {gamingScore > 0 && (
                        <span className="text-xs text-amber-500">🎮 {gamingScore.toLocaleString()}</span>
                    )}
                    {minPrice > 0 && (
                        <span className="text-xs text-neutral-400">{formatINR(minPrice)}</span>
                    )}
                </div>
            </div>

            <ArrowRight className="w-3.5 h-3.5 text-neutral-600 shrink-0" />
        </CommandItem>
    );
}

// ── Group hits by category ────────────────────────────────────────────────────
function groupByCategory(hits: SearchHit[]): Record<string, SearchHit[]> {
    return hits.reduce<Record<string, SearchHit[]>>((acc, hit) => {
        const cat = hit.category ?? "unknown";
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(hit);
        return acc;
    }, {});
}

// ── Main GlobalSearch Component ───────────────────────────────────────────────
export default function GlobalSearch() {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [hits, setHits] = useState<SearchHit[]>([]);
    const [nbHits, setNbHits] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [, startTransition] = useTransition();

    // ⌘K / Ctrl+K keyboard shortcut
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "k") {
                e.preventDefault();
                setOpen((v) => !v);
            }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, []);

    // Debounced search (300ms)
    const doSearch = useCallback(async (q: string) => {
        if (!q.trim()) {
            setHits([]);
            setNbHits(0);
            return;
        }
        setIsLoading(true);
        try {
            const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&limit=12`);
            const data = await res.json();
            setHits(data.hits ?? []);
            setNbHits(data.nbHits ?? 0);
        } catch {
            setHits([]);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        const t = setTimeout(() => doSearch(query), 300);
        return () => clearTimeout(t);
    }, [query, doSearch]);

    const handleSelect = (hit: SearchHit) => {
        setOpen(false);
        setQuery("");
        startTransition(() => {
            router.push(`/products/${hit.category}/${hit.id}`);
        });
    };

    const grouped = groupByCategory(hits);
    const categoryOrder = ["gpu", "cpu", "ram", "psu"];
    const orderedCategories = [
        ...categoryOrder.filter((c) => grouped[c]),
        ...Object.keys(grouped).filter((c) => !categoryOrder.includes(c)),
    ];

    return (
        <>
            {/* Trigger */}
            <SearchTrigger onClick={() => setOpen(true)} />

            {/* Modal */}
            <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setQuery(""); setHits([]); } }}>
                <DialogContent className="p-0 gap-0 max-w-2xl bg-neutral-950 border border-neutral-800 shadow-2xl overflow-hidden">
                    <DialogTitle className="sr-only">Search Products</DialogTitle>
                    <Command shouldFilter={false} className="bg-transparent">
                        <div className="flex items-center border-b border-neutral-800 px-3">
                            {isLoading
                                ? <Loader2 className="w-4 h-4 text-neutral-500 shrink-0 animate-spin" />
                                : <Search className="w-4 h-4 text-neutral-500 shrink-0" />
                            }
                            <CommandInput
                                value={query}
                                onValueChange={setQuery}
                                placeholder="Search GPUs, CPUs, and more…"
                                className="flex-1 bg-transparent border-0 outline-none text-neutral-100 placeholder:text-neutral-600 py-4 px-3 text-sm focus:ring-0"
                            />
                            {query && (
                                <button
                                    onClick={() => { setQuery(""); setHits([]); }}
                                    className="text-xs text-neutral-500 hover:text-neutral-300 px-2 py-1 rounded"
                                >
                                    Clear
                                </button>
                            )}
                            <kbd className="hidden sm:flex text-[10px] font-mono bg-neutral-900 px-1.5 py-0.5 rounded border border-neutral-800 text-neutral-600 ml-2">
                                ESC
                            </kbd>
                        </div>

                        <CommandList className="max-h-[60vh] overflow-y-auto p-2">
                            {!query && (
                                <div className="text-center py-10 text-neutral-600 text-sm">
                                    Start typing to search across all hardware categories
                                </div>
                            )}

                            {query && !isLoading && hits.length === 0 && (
                                <CommandEmpty className="py-10 text-center text-neutral-500 text-sm">
                                    No results for "{query}"
                                </CommandEmpty>
                            )}

                            {orderedCategories.map((cat) => {
                                const cfg = CATEGORY_CONFIG[cat];
                                const label = cfg?.label ?? cat.toUpperCase();
                                return (
                                    <CommandGroup
                                        key={cat}
                                        heading={
                                            <span className="text-xs uppercase tracking-widest text-neutral-600 px-1">{label}</span>
                                        }
                                    >
                                        {grouped[cat].map((hit) => (
                                            <HitRow key={hit.objectID} hit={hit} onSelect={handleSelect} />
                                        ))}
                                    </CommandGroup>
                                );
                            })}

                            {nbHits > hits.length && (
                                <div className="px-3 pb-2 pt-1 text-center">
                                    <span className="text-xs text-neutral-600">
                                        Showing {hits.length} of {nbHits} results
                                    </span>
                                </div>
                            )}
                        </CommandList>
                    </Command>
                </DialogContent>
            </Dialog>
        </>
    );
}
