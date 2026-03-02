export interface PricingV2 {
    currency: string;
    priceRange: {
        min: number | null;
        max: number | null;
    };
    availability: string;
    source: string | null;
    lastUpdated?: string;
    msrpUSD?: number | null;
}

// ── CPU SKU (e.g. i5-12400 vs i5-12400F) ─────────────────────────────────────
export interface CpuSku {
    sku: string;                           // e.g. "i5-12400f"
    suffix: string;                        // e.g. "F", "K", "KF", "standard"
    hasIntegratedGraphics: boolean;        // SKU-level — never at CPU root
    integratedGraphicsId: string | null;   // vgpu doc ID, e.g. "intel-uhd-730"
    pricing?: PricingV2;
}

// ── Base product (all categories share this) ──────────────────────────────────
export interface BaseProduct {
    id: string;
    name: string;
    nameLowercase?: string;
    brand: string;
    category?: string;
    launchYear: number;
    gamingScore?: number;        // resolved from normalized.gamingScore
    productivityScore?: number;  // resolved from normalized.productivityScore
    normalized?: {
        gamingScore: number;
        productivityScore: number;
    };
    scoreVersion?: number;
    tier: string | number;
    tdpWatts?: number;
    legacy: boolean;
    createdAt?: string;
    updatedAt?: string;
    pricing?: PricingV2;
    searchTokens?: string[];
    msrpUSD?: number;
    [key: string]: any;
}

// ── GPU ───────────────────────────────────────────────────────────────────────
export interface GPUProduct extends BaseProduct {
    vramGB?: number;
    memoryType?: string;
    architecture?: string;
    rayTracing?: boolean;
    upscaling?: string;
}

// ── CPU (compute metadata + CPU-only scores, NO iGPU scores at root) ──────────
export interface CPUProduct extends BaseProduct {
    generation?: string;
    socket?: string;
    hasIntegratedGraphics?: boolean;
    integratedGraphicsIds?: string[];
    metrics?: {
        valueScore?: number;
    };
    cores?: number;
    threads?: number;
    baseClockGHz?: number;
    boostClockGHz?: number;
    // iGPU info lives ONLY inside availableSkus[].integratedGraphicsId
    availableSkus?: CpuSku[];
}

// ── vGPU (integrated graphics — pure performance abstraction, no pricing) ─────
export interface VgpuProduct extends BaseProduct {
    architecture?: string;
    performanceTier?: string;  // entry | low-mid | mid | high | enthusiast
    anchorScale?: number;      // always 1000
    // No pricing, no TDP, no VRAM
}

// Re-export GetProductsOptions type alias used by the universal system
export type { GetProductsOptions } from "@/lib/products/options";

// ── Motherboard (compatibility layer, no performance metrics) ─────────────────
export interface MotherboardProduct extends BaseProduct {
    socket: string;
    chipset: {
        name: string;
        tier: "entry" | "mid" | "high";
    };
    platformGeneration: number;
    formFactor: string;
    memoryType: string;
    ramSlots: number;
    maxRamGB: number;
    wifi: boolean;
}

// ── RAM (memory tier and sizing layout, no performance metrics) ───────────────
export interface RamProduct extends BaseProduct {
    type: "DDR4" | "DDR5";
    capacityGB: number;
    modules: number;
    speedMHz: number;
}

// ── Storage (ROM layer, no performance metrics) ────────────────────────────────
export interface StorageProduct extends BaseProduct {
    type: "NVMe" | "SATA";
    capacityGB: number;
    formFactor: string;
    pcieGen?: number | null;
    pricePerGB?: number;
}

// ── Power Supply Unit (PSU) (structural compatibility, no performance metrics) ─
export interface PSUProduct extends BaseProduct {
    wattage: number;
    efficiency: "80+ Bronze" | "80+ Silver" | "80+ Gold" | "80+ Platinum" | "80+ Titanium";
    modular: "Non" | "Semi" | "Full";
    formFactor: "ATX";
}
