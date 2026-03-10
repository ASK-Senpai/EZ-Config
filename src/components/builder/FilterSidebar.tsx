"use client";

// FilterSidebar — shadcn/ui components with z-[300] on SelectContent portals
// This properly fixes the z-index conflict: modal is z-[100], portals need z-index above that.

import { motion } from "framer-motion";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface FilterSidebarProps {
    category: string;
    filters: any;
    setFilters: (filters: any) => void;
    uniqueValues: {
        brands: string[];
        sockets: string[];
        chipsets: string[];
    };
}

export function FilterSidebar({ category, filters, setFilters, uniqueValues }: FilterSidebarProps) {
    const update = (key: string, value: any) =>
        setFilters((prev: any) => ({ ...prev, [key]: value }));

    const chipBase = "px-2.5 py-1 rounded-lg text-[11px] font-bold border cursor-pointer transition-all duration-150 select-none";
    const chipActive = "bg-primary/20 border-primary/50 text-primary shadow-sm shadow-primary/10";
    const chipInactive = "bg-neutral-900 border-neutral-800 text-neutral-500 hover:border-neutral-600 hover:text-neutral-200";

    return (
        <div className="w-56 shrink-0 flex flex-col gap-5 pr-5 border-r border-white/5 h-full overflow-y-auto pb-4">

            {/* ── Brand ── */}
            <section className="space-y-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500">Brand</p>
                <Select
                    value={filters.brand || "all"}
                    onValueChange={(v) => update("brand", v === "all" ? "" : v)}
                >
                    <SelectTrigger className="bg-neutral-900 border-neutral-800 text-xs h-9 rounded-xl focus:ring-primary/40">
                        <SelectValue placeholder="All Brands" />
                    </SelectTrigger>
                    {/* z-[300] ensures the portal renders above the modal (z-[100]) */}
                    <SelectContent className="bg-neutral-900 border-neutral-800 z-[300]">
                        <SelectItem value="all">All Brands</SelectItem>
                        {uniqueValues.brands.map((b) => (
                            <SelectItem key={b} value={b}>{b}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </section>

            {/* ── Socket (CPU / Motherboard) ── */}
            {(category === "cpu" || category === "motherboard") && uniqueValues.sockets.length > 0 && (
                <section className="space-y-2">
                    <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500">Socket</p>
                    <div className="flex flex-wrap gap-1.5">
                        {uniqueValues.sockets.map((s) => (
                            <motion.button
                                key={s}
                                type="button"
                                whileTap={{ scale: 0.93 }}
                                onClick={() => update("socket", filters.socket === s ? "" : s)}
                                className={`${chipBase} ${filters.socket === s ? chipActive : chipInactive}`}
                            >
                                {s}
                            </motion.button>
                        ))}
                    </div>
                </section>
            )}

            {/* ── Chipset (Motherboard) ── */}
            {category === "motherboard" && uniqueValues.chipsets.length > 0 && (
                <section className="space-y-2">
                    <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500">Chipset</p>
                    <Select
                        value={filters.chipset || "all"}
                        onValueChange={(v) => update("chipset", v === "all" ? "" : v)}
                    >
                        <SelectTrigger className="bg-neutral-900 border-neutral-800 text-xs h-9 rounded-xl focus:ring-primary/40">
                            <SelectValue placeholder="All Chipsets" />
                        </SelectTrigger>
                        <SelectContent className="bg-neutral-900 border-neutral-800 z-[300]">
                            <SelectItem value="all">All Chipsets</SelectItem>
                            {uniqueValues.chipsets.map((c) => (
                                <SelectItem key={c} value={c}>{c}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </section>
            )}

            {/* ── RAM Type ── */}
            {category === "ram" && (
                <section className="space-y-2">
                    <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500">Type</p>
                    <div className="flex gap-2">
                        {["DDR4", "DDR5"].map((t) => (
                            <motion.button
                                key={t}
                                type="button"
                                whileTap={{ scale: 0.93 }}
                                onClick={() => update("ramType", filters.ramType === t ? "" : t)}
                                className={`${chipBase} flex-1 text-center ${filters.ramType === t ? chipActive : chipInactive}`}
                            >
                                {t}
                            </motion.button>
                        ))}
                    </div>
                </section>
            )}

            {/* ── Storage Type ── */}
            {category === "storage" && (
                <section className="space-y-2">
                    <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500">Storage Type</p>
                    <div className="flex flex-col gap-2">
                        {["NVMe", "SATA"].map((t) => (
                            <div key={t} className="flex items-center gap-2">
                                <Checkbox
                                    id={`storage-${t}`}
                                    checked={filters.storageType === t}
                                    onCheckedChange={() => update("storageType", filters.storageType === t ? "" : t)}
                                    className="border-neutral-700 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                                />
                                <Label htmlFor={`storage-${t}`} className="text-xs font-bold text-neutral-400 cursor-pointer hover:text-neutral-200 transition-colors">{t}</Label>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* ── PSU Wattage ── */}
            {category === "psu" && (
                <section className="space-y-2">
                    <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500">Min Wattage</p>
                    <Select
                        value={filters.minWattage?.toString() || "0"}
                        onValueChange={(v) => update("minWattage", parseInt(v))}
                    >
                        <SelectTrigger className="bg-neutral-900 border-neutral-800 text-xs h-9 rounded-xl focus:ring-primary/40">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-neutral-900 border-neutral-800 z-[300]">
                            {[0, 450, 550, 650, 750, 850, 1000].map((w) => (
                                <SelectItem key={w} value={w.toString()}>{w === 0 ? "Any" : `${w}W+`}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </section>
            )}

            {/* ── PSU Efficiency ── */}
            {category === "psu" && (
                <section className="space-y-2">
                    <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500">Efficiency</p>
                    <div className="flex flex-col gap-2">
                        {["80+ Bronze", "80+ Gold", "80+ Platinum"].map((e) => (
                            <div key={e} className="flex items-center gap-2">
                                <Checkbox
                                    id={`eff-${e}`}
                                    checked={filters.efficiency === e}
                                    onCheckedChange={() => update("efficiency", filters.efficiency === e ? "" : e)}
                                    className="border-neutral-700 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                                />
                                <Label htmlFor={`eff-${e}`} className="text-xs font-bold text-neutral-400 cursor-pointer hover:text-neutral-200 transition-colors">{e}</Label>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* ── Integrated Graphics (CPU) ── */}
            {category === "cpu" && (
                <div className="flex items-center gap-2">
                    <Checkbox
                        id="apu-filter"
                        checked={!!filters.apu}
                        onCheckedChange={(checked) => update("apu", checked ? true : undefined)}
                        className="border-neutral-700 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                    />
                    <Label htmlFor="apu-filter" className="text-xs font-bold text-neutral-400 cursor-pointer hover:text-neutral-200 transition-colors">
                        Has Integrated Graphics
                    </Label>
                </div>
            )}

            <div className="h-px bg-white/5 my-1" />

            {/* ── Sort ── */}
            <section className="space-y-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500">Sort By</p>
                <Select
                    value={filters.sortBy || "price"}
                    onValueChange={(v) => update("sortBy", v)}
                >
                    <SelectTrigger className="bg-neutral-900 border-neutral-800 text-xs h-9 rounded-xl focus:ring-primary/40">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-neutral-900 border-neutral-800 z-[300]">
                        <SelectItem value="price">Price</SelectItem>
                        <SelectItem value="gamingScore">Gaming Score</SelectItem>
                        {(category === "cpu" || category === "gpu") && (
                            <SelectItem value="valueScore">Value Score</SelectItem>
                        )}
                        {category === "ram" && <SelectItem value="speed">Speed</SelectItem>}
                        {category === "psu" && <SelectItem value="wattage">Wattage</SelectItem>}
                        {category === "storage" && <SelectItem value="capacity">Capacity</SelectItem>}
                    </SelectContent>
                </Select>

                {/* Sort direction chips */}
                <div className="flex gap-2 mt-1">
                    {(["asc", "desc"] as const).map((d) => (
                        <motion.button
                            key={d}
                            type="button"
                            whileTap={{ scale: 0.93 }}
                            onClick={() => update("sortDir", d)}
                            className={`${chipBase} flex-1 text-center ${(filters.sortDir || "asc") === d ? chipActive : chipInactive
                                }`}
                        >
                            {d === "asc" ? "↑ Low" : "↓ High"}
                        </motion.button>
                    ))}
                </div>
            </section>
        </div>
    );
}
