export type SortBy = "price" | "gamingScore" | "productivityScore" | "valueScore" | "launchYear" | "capacity" | "speed" | "pcieGen" | "pricePerGB" | "wattage";
export type SortDir = "asc" | "desc";

export interface GetProductsOptions {
    category: string;         // "gpu" | "cpu" | "ram" | "psu" | "motherboard"
    brand?: string;           // Firestore-level: where("brand", "==", brand)
    hasIntegratedGraphics?: boolean; // APU Filter
    inStockOnly?: boolean;    // In-memory (safe: operates on filtered+paginated set)
    sortBy?: SortBy;
    sortDir?: SortDir;
    limit?: number;
    cursor?: string;          // Last document ID for startAfter pagination
    ramType?: string;
    ramCapacity?: number;
    ramSpeed?: number;
    storageType?: string;
    pcieGen?: number;
    wattage?: number;
    efficiency?: string;
    modular?: string;
    minPrice?: number;
    maxPrice?: number;
}

export const SORT_FIELD_MAP: Record<SortBy, { field: string; defaultDir: SortDir }> = {
    price: { field: "pricing.priceRange.min", defaultDir: "asc" }, // Legacy compat
    gamingScore: { field: "normalized.gamingScore", defaultDir: "desc" },
    productivityScore: { field: "normalized.productivityScore", defaultDir: "desc" },
    valueScore: { field: "metrics.valueScore", defaultDir: "desc" },
    launchYear: { field: "launchYear", defaultDir: "desc" },
    capacity: { field: "capacityGB", defaultDir: "desc" },
    speed: { field: "speedMHz", defaultDir: "desc" },
    pcieGen: { field: "pcieGen", defaultDir: "desc" },
    pricePerGB: { field: "pricePerGB", defaultDir: "asc" },
    wattage: { field: "wattage", defaultDir: "desc" },
};
