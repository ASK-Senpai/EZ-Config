"use client";

import { useEffect, useState, useTransition, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { BaseProduct } from "@/lib/products/types";
import { GetProductsOptions, SORT_FIELD_MAP, SortBy } from "@/lib/products/options";
import ProductCard from "./ProductCard";
import VgpuCard from "./VgpuCard";
import MotherboardCard from "./MotherboardCard";
import { getCategoryConfig } from "@/config/categoryConfig";
import { Filter, SlidersHorizontal, Search, Loader2, X } from "lucide-react";

// Brand options per category. "All" is always first.
const BRAND_OPTIONS: Record<string, string[]> = {
    gpu: ["NVIDIA", "AMD", "Intel"],
    cpu: ["AMD", "Intel"],
    ram: ["Corsair", "G.Skill", "Kingston", "Crucial"],
    psu: ["Corsair", "Seasonic", "EVGA", "be quiet!"],
    motherboard: ["ASUS", "MSI", "Gigabyte", "ASRock"],
};

const CATEGORY_LABELS: Record<string, string> = {
    gpu: "GPU Intelligence",
    cpu: "CPU Intelligence",
    ram: "RAM Intelligence",
    psu: "Power Supply Intelligence",
    motherboard: "Motherboard Intelligence",
};

interface ProductPageLayoutProps {
    category: string;
    initialProducts: BaseProduct[];
    initialCursor: string | null;
    initialOptions: GetProductsOptions;
    initialSearch?: string;           // populated when page was SSR'd with Algolia search
    searchTotal?: number | null;      // total hits from Algolia, for display
    fetchMoreAction: (opts: GetProductsOptions) => Promise<{ products: BaseProduct[]; nextCursor: string | null }>;
}

export default function ProductPageLayout({
    category,
    initialProducts,
    initialCursor,
    initialOptions,
    initialSearch = "",
    searchTotal,
    fetchMoreAction,
}: ProductPageLayoutProps) {

    const router = useRouter();
    const searchParams = useSearchParams();
    const [isPending, startTransition] = useTransition();

    const config = getCategoryConfig(category);

    // ── Filter State ──────────────────────────────────────────────────────────
    const [search, setSearch] = useState(initialSearch);

    const [brand, setBrand] = useState(initialOptions.brand ?? "");
    const [hasIntegratedGraphics, setHasIntegratedGraphics] = useState(initialOptions.hasIntegratedGraphics ?? false);
    const defaultSort = (category === "motherboard" || category === "ram" || category === "storage" || category === "psu") ? "price" : "gamingScore";
    const [sort, setSort] = useState<string>(initialOptions.sortBy ?? defaultSort);
    const [dir, setDir] = useState<string>(initialOptions.sortDir ?? (SORT_FIELD_MAP[defaultSort as SortBy]?.defaultDir ?? "desc"));
    const [inStock, setInStock] = useState(initialOptions.inStockOnly ?? false);

    // RAM-specific filters
    const [ramType, setRamType] = useState<string>(initialOptions.ramType ?? "");
    const [ramCapacity, setRamCapacity] = useState<string>(initialOptions.ramCapacity?.toString() ?? "");
    const [ramSpeed, setRamSpeed] = useState<string>(initialOptions.ramSpeed?.toString() ?? "");

    // Storage-specific filters
    const [storageType, setStorageType] = useState<string>(initialOptions.storageType ?? "");
    const [pcieGen, setPcieGen] = useState<string>(initialOptions.pcieGen?.toString() ?? "");

    // PSU-specific filters
    const [wattage, setWattage] = useState<string>(initialOptions.wattage?.toString() ?? "");
    const [efficiency, setEfficiency] = useState<string>(initialOptions.efficiency ?? "");
    const [modular, setModular] = useState<string>(initialOptions.modular ?? "");

    // ── Products State ────────────────────────────────────────────────────────
    const [products, setProducts] = useState<BaseProduct[]>(initialProducts);
    const [nextCursor, setNextCursor] = useState<string | null>(initialCursor);
    const [isLoadingMore, setIsLoadingMore] = useState(false);

    // Sync on SSR prop changes (URL-driven navigation)
    useEffect(() => {
        setProducts(initialProducts);
        setNextCursor(initialCursor);
    }, [initialProducts, initialCursor]);

    // ── URL Sync (debounced 500ms) ─────────────────────────────────────────────
    const pushUrl = useCallback((overrides: Record<string, string | undefined>) => {
        const params = new URLSearchParams(searchParams.toString());
        const merged = {
            search,
            brand,
            apu: hasIntegratedGraphics ? "true" : undefined,
            sort: sort === defaultSort ? undefined : sort,
            dir: dir === (SORT_FIELD_MAP[sort as SortBy]?.defaultDir ?? "desc") ? undefined : dir,
            stock: inStock ? "true" : undefined,
            ramType: ramType || undefined,
            ramCapacity: ramCapacity || undefined,
            ramSpeed: ramSpeed || undefined,
            storageType: storageType || undefined,
            pcieGen: pcieGen || undefined,
            wattage: wattage || undefined,
            efficiency: efficiency || undefined,
            modular: modular || undefined,
            ...overrides,
        };
        Object.entries(merged).forEach(([k, v]) => {
            if (v) params.set(k, v);
            else params.delete(k);
        });
        startTransition(() => {
            router.push(`/products/${category}?${params.toString()}`);
        });
    }, [search, brand, sort, dir, inStock, hasIntegratedGraphics, ramType, ramCapacity, ramSpeed, storageType, pcieGen, wattage, efficiency, modular, category, router, searchParams]);

    useEffect(() => {
        // Prevent sync on first render if state perfectly matches URL
        const currentParams = new URLSearchParams(searchParams.toString());
        const hasChanges =
            (search || undefined) !== (currentParams.get("search") || undefined) ||
            (brand || undefined) !== (currentParams.get("brand") || undefined) ||
            (hasIntegratedGraphics ? "true" : undefined) !== (currentParams.get("apu") || undefined) ||
            (sort === defaultSort ? undefined : sort) !== (currentParams.get("sort") || undefined) ||
            (dir === (SORT_FIELD_MAP[sort as SortBy]?.defaultDir ?? "desc") ? undefined : dir) !== (currentParams.get("dir") || undefined) ||
            (inStock ? "true" : undefined) !== (currentParams.get("stock") || undefined) ||
            (ramType || undefined) !== (currentParams.get("ramType") || undefined) ||
            (ramCapacity || undefined) !== (currentParams.get("ramCapacity") || undefined) ||
            (ramSpeed || undefined) !== (currentParams.get("ramSpeed") || undefined) ||
            (storageType || undefined) !== (currentParams.get("storageType") || undefined) ||
            (pcieGen || undefined) !== (currentParams.get("pcieGen") || undefined) ||
            (wattage || undefined) !== (currentParams.get("wattage") || undefined) ||
            (efficiency || undefined) !== (currentParams.get("efficiency") || undefined) ||
            (modular || undefined) !== (currentParams.get("modular") || undefined);

        if (!hasChanges) return;

        const t = setTimeout(() => {
            pushUrl({
                search: search || undefined,
                brand: brand || undefined,
                apu: hasIntegratedGraphics ? "true" : undefined,
                sort: sort === defaultSort ? undefined : sort,
                dir: dir === (SORT_FIELD_MAP[sort as SortBy]?.defaultDir ?? "desc") ? undefined : dir,
                stock: inStock ? "true" : undefined,
                ramType: ramType || undefined,
                ramCapacity: ramCapacity || undefined,
                ramSpeed: ramSpeed || undefined,
                storageType: storageType || undefined,
                pcieGen: pcieGen || undefined,
                wattage: wattage || undefined,
                efficiency: efficiency || undefined,
                modular: modular || undefined,
            });
        }, 500);
        return () => clearTimeout(t);
    }, [search, brand, hasIntegratedGraphics, sort, dir, inStock, ramType, ramCapacity, ramSpeed, storageType, pcieGen, wattage, efficiency, modular]); // Deliberately omitting searchParams/pushUrl to break infinite loops

    // ── Load More ─────────────────────────────────────────────────────────────
    const handleLoadMore = async () => {
        if (!nextCursor || isLoadingMore) return;
        setIsLoadingMore(true);
        try {
            const opts: GetProductsOptions = {
                ...initialOptions,
                cursor: nextCursor,
            };
            const { products: more, nextCursor: newCursor } = await fetchMoreAction(opts);
            setProducts((prev) => [...prev, ...more]);
            setNextCursor(newCursor);
        } catch (err) {
            console.error("Load more failed", err);
        } finally {
            setIsLoadingMore(false);
        }
    };

    const clearAll = () => {
        setSearch("");
        setBrand("");
        setHasIntegratedGraphics(false);
        setSort(defaultSort);
        setDir(SORT_FIELD_MAP[defaultSort as SortBy]?.defaultDir ?? "desc");
        setInStock(false);
        setRamType("");
        setRamCapacity("");
        setRamSpeed("");
        setStorageType("");
        setPcieGen("");
        setWattage("");
        setEfficiency("");
        setModular("");
    };

    const activeCount = [search, brand, hasIntegratedGraphics, inStock, ramType, ramCapacity, ramSpeed, storageType, pcieGen, wattage, efficiency, modular].filter(Boolean).length;
    const brands = BRAND_OPTIONS[category] ?? [];

    // Dynamically derive generic options for RAM from the currently loaded products chunk
    const uniqueRamTypes = category === "ram" ? Array.from(new Set(products.map(p => (p as any).type).filter(Boolean))) as string[] : [];
    const uniqueRamCapacities = category === "ram" ? Array.from(new Set(products.map(p => (p as any).capacityGB).filter(Boolean))).sort((a, b) => (a as number) - (b as number)) as number[] : [];
    const uniqueRamSpeeds = category === "ram" ? Array.from(new Set(products.map(p => (p as any).speedMHz).filter(Boolean))).sort((a, b) => (a as number) - (b as number)) as number[] : [];

    // Storage Generic filters dynamically derived
    const uniqueStorageTypes = category === "storage" ? Array.from(new Set(products.map(p => (p as any).type).filter(Boolean))) as string[] : [];
    const uniqueStorageGens = category === "storage" ? Array.from(new Set(products.map(p => (p as any).pcieGen).filter(Boolean))).sort((a, b) => (a as number) - (b as number)) as number[] : [];
    const uniqueStorageCapacities = category === "storage" ? Array.from(new Set(products.map(p => (p as any).capacityGB).filter(Boolean))).sort((a, b) => (a as number) - (b as number)) as number[] : [];

    // PSU Generic filters dynamically derived
    const uniquePsuWattages = category === "psu" ? Array.from(new Set(products.map(p => (p as any).wattage).filter(Boolean))).sort((a, b) => (a as number) - (b as number)) as number[] : [];
    const uniquePsuEfficiencies = category === "psu" ? Array.from(new Set(products.map(p => (p as any).efficiency).filter(Boolean))) as string[] : [];
    const uniquePsuModulars = category === "psu" ? Array.from(new Set(products.map(p => (p as any).modular).filter(Boolean))) as string[] : [];

    return (
        <div className="flex flex-col lg:flex-row gap-8">
            {/* ── Sidebar Filters ─────────────────────────────────────────────── */}
            <aside className="w-full lg:w-64 flex-shrink-0 space-y-6">
                <div>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-bold flex items-center gap-2">
                            <Filter className="w-4 h-4" /> Filters
                        </h2>
                        {activeCount > 0 && (
                            <button
                                onClick={clearAll}
                                className="text-xs text-amber-500 hover:text-amber-400 flex items-center gap-1"
                            >
                                <X className="w-3 h-3" /> Clear ({activeCount})
                            </button>
                        )}
                    </div>

                    {/* Search */}
                    <div className="mb-5">
                        <label className="text-xs text-neutral-400 block mb-1.5 font-medium uppercase tracking-wider">
                            Search
                        </label>
                        <div className="relative">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
                            <input
                                id={`search-${category}`}
                                type="text"
                                placeholder={`Search ${category.toUpperCase()}s…`}
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full bg-neutral-900 border border-neutral-800 rounded-lg py-2.5 pl-9 pr-3 text-sm focus:ring-1 focus:ring-amber-500 outline-none text-neutral-200 placeholder:text-neutral-600"
                            />
                            {search && (
                                <button
                                    onClick={() => setSearch("")}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>
                        <p className="text-[10px] text-neutral-600 mt-1">
                            Prefix search — "ryzen 9" → all Ryzen 9s
                        </p>
                    </div>

                    {/* Brand */}
                    {brands.length > 0 && (
                        <div className="mb-5">
                            <label className="text-xs text-neutral-400 block mb-1.5 font-medium uppercase tracking-wider">
                                Brand
                            </label>
                            <select
                                id={`brand-${category}`}
                                value={brand}
                                onChange={(e) => setBrand(e.target.value)}
                                className="w-full bg-neutral-900 border border-neutral-800 rounded-lg p-2.5 text-sm focus:ring-1 focus:ring-amber-500 outline-none text-neutral-200"
                            >
                                <option value="">All Brands</option>
                                {brands.map((b) => (
                                    <option key={b} value={b}>{b}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* RAM Specific Filters */}
                    {category === "ram" && (
                        <>
                            {uniqueRamTypes.length > 0 && (
                                <div className="mb-5">
                                    <label className="text-xs text-neutral-400 block mb-1.5 font-medium uppercase tracking-wider">
                                        Type
                                    </label>
                                    <select
                                        value={ramType}
                                        onChange={(e) => setRamType(e.target.value)}
                                        className="w-full bg-neutral-900 border border-neutral-800 rounded-lg p-2.5 text-sm focus:ring-1 focus:ring-amber-500 outline-none text-neutral-200"
                                    >
                                        <option value="">All Types</option>
                                        {uniqueRamTypes.map((t) => (
                                            <option key={t} value={t}>{t}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                            {uniqueRamCapacities.length > 0 && (
                                <div className="mb-5">
                                    <label className="text-xs text-neutral-400 block mb-1.5 font-medium uppercase tracking-wider">
                                        Capacity
                                    </label>
                                    <select
                                        value={ramCapacity}
                                        onChange={(e) => setRamCapacity(e.target.value)}
                                        className="w-full bg-neutral-900 border border-neutral-800 rounded-lg p-2.5 text-sm focus:ring-1 focus:ring-amber-500 outline-none text-neutral-200"
                                    >
                                        <option value="">All Capacities</option>
                                        {uniqueRamCapacities.map((c) => (
                                            <option key={c} value={c}>{c}GB</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                            {uniqueRamSpeeds.length > 0 && (
                                <div className="mb-5">
                                    <label className="text-xs text-neutral-400 block mb-1.5 font-medium uppercase tracking-wider">
                                        Speed
                                    </label>
                                    <select
                                        value={ramSpeed}
                                        onChange={(e) => setRamSpeed(e.target.value)}
                                        className="w-full bg-neutral-900 border border-neutral-800 rounded-lg p-2.5 text-sm focus:ring-1 focus:ring-amber-500 outline-none text-neutral-200"
                                    >
                                        <option value="">All Speeds</option>
                                        {uniqueRamSpeeds.map((s) => (
                                            <option key={s} value={s}>{s} MHz</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                        </>
                    )}

                    {/* Storage Specific Filters */}
                    {category === "storage" && (
                        <>
                            {uniqueStorageTypes.length > 0 && (
                                <div className="mb-5">
                                    <label className="text-xs text-neutral-400 block mb-1.5 font-medium uppercase tracking-wider">
                                        Type
                                    </label>
                                    <select
                                        value={storageType}
                                        onChange={(e) => setStorageType(e.target.value)}
                                        className="w-full bg-neutral-900 border border-neutral-800 rounded-lg p-2.5 text-sm focus:ring-1 focus:ring-amber-500 outline-none text-neutral-200"
                                    >
                                        <option value="">All Types</option>
                                        {uniqueStorageTypes.map((t) => (
                                            <option key={t} value={t}>{t}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                            {uniqueStorageCapacities.length > 0 && (
                                <div className="mb-5">
                                    <label className="text-xs text-neutral-400 block mb-1.5 font-medium uppercase tracking-wider">
                                        Capacity
                                    </label>
                                    <select
                                        value={ramCapacity} // Reuse param capacity
                                        onChange={(e) => setRamCapacity(e.target.value)}
                                        className="w-full bg-neutral-900 border border-neutral-800 rounded-lg p-2.5 text-sm focus:ring-1 focus:ring-amber-500 outline-none text-neutral-200"
                                    >
                                        <option value="">All Capacities</option>
                                        {uniqueStorageCapacities.map((c) => (
                                            <option key={c} value={c}>{c >= 1000 ? `${c / 1000}TB` : `${c}GB`}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                            {uniqueStorageGens.length > 0 && (
                                <div className="mb-5">
                                    <label className="text-xs text-neutral-400 block mb-1.5 font-medium uppercase tracking-wider">
                                        PCIe Gen
                                    </label>
                                    <select
                                        value={pcieGen}
                                        onChange={(e) => setPcieGen(e.target.value)}
                                        className="w-full bg-neutral-900 border border-neutral-800 rounded-lg p-2.5 text-sm focus:ring-1 focus:ring-amber-500 outline-none text-neutral-200"
                                    >
                                        <option value="">All Gens</option>
                                        {uniqueStorageGens.map((g) => (
                                            <option key={g} value={g}>Gen {g}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                        </>
                    )}

                    {/* PSU Specific Filters */}
                    {category === "psu" && (
                        <>
                            {uniquePsuWattages.length > 0 && (
                                <div className="mb-5">
                                    <label className="text-xs text-neutral-400 block mb-1.5 font-medium uppercase tracking-wider">
                                        Wattage
                                    </label>
                                    <select
                                        value={wattage}
                                        onChange={(e) => setWattage(e.target.value)}
                                        className="w-full bg-neutral-900 border border-neutral-800 rounded-lg p-2.5 text-sm focus:ring-1 focus:ring-amber-500 outline-none text-neutral-200"
                                    >
                                        <option value="">All Wattages</option>
                                        {uniquePsuWattages.map((w) => (
                                            <option key={w} value={w}>{w}W</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                            {uniquePsuEfficiencies.length > 0 && (
                                <div className="mb-5">
                                    <label className="text-xs text-neutral-400 block mb-1.5 font-medium uppercase tracking-wider">
                                        Efficiency
                                    </label>
                                    <select
                                        value={efficiency}
                                        onChange={(e) => setEfficiency(e.target.value)}
                                        className="w-full bg-neutral-900 border border-neutral-800 rounded-lg p-2.5 text-sm focus:ring-1 focus:ring-amber-500 outline-none text-neutral-200"
                                    >
                                        <option value="">All Efficiencies</option>
                                        {uniquePsuEfficiencies.map((eff) => (
                                            <option key={eff} value={eff}>{eff}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                            {uniquePsuModulars.length > 0 && (
                                <div className="mb-5">
                                    <label className="text-xs text-neutral-400 block mb-1.5 font-medium uppercase tracking-wider">
                                        Modular
                                    </label>
                                    <select
                                        value={modular}
                                        onChange={(e) => setModular(e.target.value)}
                                        className="w-full bg-neutral-900 border border-neutral-800 rounded-lg p-2.5 text-sm focus:ring-1 focus:ring-amber-500 outline-none text-neutral-200"
                                    >
                                        <option value="">All Types</option>
                                        {uniquePsuModulars.map((mod) => (
                                            <option key={mod} value={mod}>{mod}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                        </>
                    )}

                    {/* Sort */}
                    <div className="mb-5">
                        <label className="text-xs text-neutral-400 block mb-1.5 font-medium uppercase tracking-wider">
                            Sort By
                        </label>
                        <div className="flex gap-2">
                            <select
                                id={`sort-${category}`}
                                value={sort}
                                onChange={(e) => {
                                    const val = e.target.value as SortBy;
                                    setSort(val);
                                    setDir(SORT_FIELD_MAP[val]?.defaultDir ?? "desc");
                                }}
                                className="w-full bg-neutral-900 border border-neutral-800 rounded-lg p-2.5 text-sm focus:ring-1 focus:ring-amber-500 outline-none text-neutral-200"
                            >
                                {category !== "motherboard" && category !== "ram" && category !== "storage" && category !== "psu" && <option value="gamingScore">Gaming Score</option>}
                                {category !== "motherboard" && category !== "ram" && category !== "storage" && category !== "psu" && <option value="productivityScore">Productivity Score</option>}
                                {(category !== "vgpu" && category !== "motherboard" && category !== "ram" && category !== "storage" && category !== "psu") && <option value="valueScore">Value (Price-to-Performance)</option>}
                                <option value="price">Price</option>
                                {category === "ram" && <option value="capacity">Capacity</option>}
                                {category === "ram" && <option value="speed">Speed</option>}
                                {category === "storage" && <option value="capacity">Capacity</option>}
                                {category === "storage" && <option value="pcieGen">PCIe Gen</option>}
                                {category === "storage" && <option value="pricePerGB">Value (Price/GB)</option>}
                                {category === "psu" && <option value="wattage">Wattage</option>}
                                {(category !== "ram" && category !== "storage" && category !== "psu") && <option value="launchYear">Launch Year</option>}
                            </select>
                            <button
                                id={`dir-toggle-${category}`}
                                onClick={() => setDir((d) => (d === "asc" ? "desc" : "asc"))}
                                title={dir === "desc" ? "Descending" : "Ascending"}
                                className="px-3 bg-neutral-800 hover:bg-neutral-700 rounded-lg border border-neutral-700 flex items-center"
                            >
                                <SlidersHorizontal
                                    className={`w-4 h-4 transition-transform ${dir === "asc" ? "rotate-180" : ""}`}
                                />
                            </button>
                        </div>
                        {search && (
                            <p className="text-[10px] text-amber-600/70 mt-1">
                                Sort ignored during search (sorted by name)
                            </p>
                        )}
                    </div>

                    {/* In stock toggle */}
                    {config.hasPricing && (
                        <div className="mb-5">
                            <label className="flex items-center gap-3 cursor-pointer group">
                                <div className="relative">
                                    <input
                                        type="checkbox"
                                        checked={inStock}
                                        onChange={(e) => setInStock(e.target.checked)}
                                        className="peer sr-only"
                                    />
                                    <div className="w-10 h-6 bg-neutral-800 rounded-full peer peer-checked:bg-amber-500 transition-colors" />
                                    <div className="absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-all peer-checked:translate-x-4" />
                                </div>
                                <span className="text-sm font-medium text-neutral-300 group-hover:text-amber-500 transition-colors">
                                    In Stock Only
                                </span>
                            </label>
                        </div>
                    )}

                    {/* Integrated Graphics APU Toggle */}
                    {category === "cpu" && (
                        <label className="flex items-center gap-3 cursor-pointer group">
                            <div className="relative">
                                <input
                                    type="checkbox"
                                    checked={hasIntegratedGraphics}
                                    onChange={(e) => setHasIntegratedGraphics(e.target.checked)}
                                    className="peer sr-only"
                                />
                                <div className="w-10 h-6 bg-neutral-800 rounded-full peer peer-checked:bg-amber-500 transition-colors" />
                                <div className="absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-all peer-checked:translate-x-4" />
                            </div>
                            <span className="text-sm font-medium text-neutral-300 group-hover:text-amber-500 transition-colors">
                                Has Integrated Graphics (APU)
                            </span>
                        </label>
                    )}
                </div>
            </aside>

            {/* ── Main Grid ────────────────────────────────────────────────────── */}
            <div className="flex-1 min-w-0">
                <div className="mb-6 flex justify-between items-end border-b border-neutral-800 pb-4">
                    <h1 className="text-3xl font-extrabold tracking-tight">
                        {CATEGORY_LABELS[category] ?? `${category.toUpperCase()} Products`}
                    </h1>
                    <span className="text-sm text-neutral-500">
                        {products.length}{nextCursor ? "+" : ""} Results
                    </span>
                </div>

                {products.length === 0 ? (
                    <div className="text-center py-20 bg-neutral-900/40 rounded-xl border border-neutral-800/50">
                        <p className="text-neutral-300 text-lg mb-2">
                            No {category.toUpperCase()}s match your filters.
                        </p>
                        <p className="text-neutral-500 mb-6 text-sm">
                            {activeCount > 0
                                ? `${activeCount} active filter${activeCount !== 1 ? "s" : ""}. Try relaxing your search or brand.`
                                : "No products found in this category yet."}
                        </p>
                        {activeCount > 0 && (
                            <button
                                onClick={clearAll}
                                className="px-6 py-2 bg-neutral-800 hover:bg-neutral-700 text-amber-500 rounded-lg text-sm font-medium transition-colors border border-neutral-700 hover:border-amber-500/50"
                            >
                                Clear All Filters
                            </button>
                        )}
                    </div>
                ) : (
                    <>
                        <div
                            className={`grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 transition-opacity ${isPending ? "opacity-50 pointer-events-none" : "opacity-100"
                                }`}
                        >
                            {products.map((p) => {
                                if (category === "vgpu") {
                                    return <VgpuCard key={p.id} product={p as any} />;
                                }
                                if (category === "motherboard") {
                                    return <MotherboardCard key={p.id} product={p as any} />;
                                }
                                return <ProductCard key={p.id} product={p} category={category} highlightValue={sort === "valueScore"} />;
                            })}
                        </div>

                        {nextCursor && (
                            <div className="mt-12 flex justify-center">
                                <button
                                    onClick={handleLoadMore}
                                    disabled={isLoadingMore}
                                    className="px-6 py-3 bg-neutral-900 border border-neutral-800 hover:border-amber-500 hover:text-amber-500 rounded-xl font-medium transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isLoadingMore ? (
                                        <><Loader2 className="w-4 h-4 animate-spin" /> Loading…</>
                                    ) : (
                                        `Load More ${category.toUpperCase()}s`
                                    )}
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
