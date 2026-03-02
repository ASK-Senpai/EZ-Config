import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface FilterSidebarProps {
    category: string;
    filters: any;
    setFilters: (filters: any) => void;
    uniqueValues: any;
}

export function FilterSidebar({ category, filters, setFilters, uniqueValues }: FilterSidebarProps) {
    const updateFilter = (key: string, value: any) => {
        setFilters({ ...filters, [key]: value });
    };

    return (
        <div className="w-64 shrink-0 space-y-8 pr-6 border-r border-white/5 h-full overflow-y-auto">
            {/* Brand Filter */}
            <div className="space-y-4">
                <h4 className="text-xs font-black uppercase tracking-widest text-neutral-500">Brand</h4>
                <Select
                    value={filters.brand || "all"}
                    onValueChange={(val) => updateFilter("brand", val === "all" ? "" : val)}
                >
                    <SelectTrigger className="bg-neutral-900 border-neutral-800 text-xs">
                        <SelectValue placeholder="All Brands" />
                    </SelectTrigger>
                    <SelectContent className="bg-neutral-900 border-neutral-800">
                        <SelectItem value="all">All Brands</SelectItem>
                        {uniqueValues.brands?.map((b: string) => (
                            <SelectItem key={b} value={b}>{b}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Category Specific Filters */}
            {category === 'cpu' && (
                <>
                    <div className="space-y-4">
                        <h4 className="text-xs font-black uppercase tracking-widest text-neutral-500">Socket</h4>
                        <div className="flex flex-wrap gap-2">
                            {uniqueValues.sockets?.map((s: string) => (
                                <button
                                    key={s}
                                    onClick={() => updateFilter("socket", filters.socket === s ? "" : s)}
                                    className={`px-2 py-1 rounded text-[10px] font-bold border transition-all ${filters.socket === s
                                            ? "bg-primary/20 border-primary/50 text-primary"
                                            : "bg-neutral-900 border-neutral-800 text-neutral-500 hover:border-neutral-700"
                                        }`}
                                >
                                    {s}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="flex items-center space-x-2">
                        <Checkbox
                            id="apu"
                            checked={filters.apu}
                            onCheckedChange={(checked) => updateFilter("apu", checked)}
                        />
                        <Label htmlFor="apu" className="text-xs font-bold text-neutral-400 cursor-pointer">Has Integrated Graphics</Label>
                    </div>
                </>
            )}

            {category === 'ram' && (
                <>
                    <div className="space-y-4">
                        <h4 className="text-xs font-black uppercase tracking-widest text-neutral-500">Type</h4>
                        <div className="flex gap-2">
                            {["DDR4", "DDR5"].map((t) => (
                                <button
                                    key={t}
                                    onClick={() => updateFilter("ramType", filters.ramType === t ? "" : t)}
                                    className={`flex-1 py-1 rounded text-[10px] font-bold border transition-all ${filters.ramType === t
                                            ? "bg-primary/20 border-primary/50 text-primary"
                                            : "bg-neutral-900 border-neutral-800 text-neutral-500 hover:border-neutral-700"
                                        }`}
                                >
                                    {t}
                                </button>
                            ))}
                        </div>
                    </div>
                </>
            )}

            {category === 'storage' && (
                <div className="space-y-4">
                    <h4 className="text-xs font-black uppercase tracking-widest text-neutral-500">Storage Type</h4>
                    <div className="flex flex-col gap-2">
                        {["NVMe", "SATA"].map((t) => (
                            <div key={t} className="flex items-center space-x-2">
                                <Checkbox
                                    id={t}
                                    checked={filters.storageType === t}
                                    onCheckedChange={() => updateFilter("storageType", filters.storageType === t ? "" : t)}
                                />
                                <Label htmlFor={t} className="text-xs font-bold text-neutral-400 cursor-pointer">{t}</Label>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {category === 'motherboard' && (
                <div className="space-y-4">
                    <h4 className="text-xs font-black uppercase tracking-widest text-neutral-500">Chipset</h4>
                    <Select
                        value={filters.chipset || "all"}
                        onValueChange={(val) => updateFilter("chipset", val === "all" ? "" : val)}
                    >
                        <SelectTrigger className="bg-neutral-900 border-neutral-800 text-xs text-neutral-300">
                            <SelectValue placeholder="All Chipsets" />
                        </SelectTrigger>
                        <SelectContent className="bg-neutral-900 border-neutral-800">
                            <SelectItem value="all">All Chipsets</SelectItem>
                            {uniqueValues.chipsets?.map((c: string) => (
                                <SelectItem key={c} value={c}>{c}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            )}

            {category === 'psu' && (
                <div className="space-y-6">
                    <div className="space-y-4">
                        <h4 className="text-xs font-black uppercase tracking-widest text-neutral-500">Min Wattage</h4>
                        <Select
                            value={filters.minWattage?.toString() || "0"}
                            onValueChange={(val) => updateFilter("minWattage", parseInt(val))}
                        >
                            <SelectTrigger className="bg-neutral-900 border-neutral-800 text-xs">
                                <SelectValue placeholder="Any" />
                            </SelectTrigger>
                            <SelectContent className="bg-neutral-900 border-neutral-800">
                                {[0, 450, 550, 650, 750, 850, 1000].map((w) => (
                                    <SelectItem key={w} value={w.toString()}>{w === 0 ? "Any" : `${w}W+`}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-4">
                        <h4 className="text-xs font-black uppercase tracking-widest text-neutral-500">Efficiency</h4>
                        <div className="flex flex-col gap-2">
                            {["80+ Bronze", "80+ Gold", "80+ Platinum"].map((e) => (
                                <div key={e} className="flex items-center space-x-2">
                                    <Checkbox
                                        id={e}
                                        checked={filters.efficiency === e}
                                        onCheckedChange={() => updateFilter("efficiency", filters.efficiency === e ? "" : e)}
                                    />
                                    <Label htmlFor={e} className="text-xs font-bold text-neutral-400 cursor-pointer">{e}</Label>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Sort Filter */}
            <div className="space-y-4 pt-8 border-t border-white/5">
                <h4 className="text-xs font-black uppercase tracking-widest text-neutral-500">Sort By</h4>
                <Select
                    value={filters.sortBy || "price"}
                    onValueChange={(val) => updateFilter("sortBy", val)}
                >
                    <SelectTrigger className="bg-neutral-900 border-neutral-800 text-xs">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-neutral-900 border-neutral-800">
                        <SelectItem value="price">Price</SelectItem>
                        <SelectItem value="gamingScore">Gaming Score</SelectItem>
                        {category === 'ram' && <SelectItem value="speed">Speed</SelectItem>}
                        {category === 'psu' && <SelectItem value="wattage">Wattage</SelectItem>}
                        {category === 'storage' && <SelectItem value="capacity">Capacity</SelectItem>}
                    </SelectContent>
                </Select>
            </div>
        </div>
    );
}
