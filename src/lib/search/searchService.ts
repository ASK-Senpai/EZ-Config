/**
 * searchService.ts
 * The ONLY place in the application that calls Algolia.
 * All other code must use this service — never import algoliasearch directly elsewhere.
 *
 * Architecture:
 *   Cache v1 (in-memory Map, TTL 300s)
 *     ↓
 *   Algolia (liteClient for search, replica indices for sort)
 *     ↓
 *   Structured SearchResult[]
 */

import { liteClient } from "algoliasearch/lite";
import type { BaseProduct } from "@/lib/products/types";

// ── Algolia client (search-only key — safe to use client-side) ────────────────
const APP_ID = process.env.NEXT_PUBLIC_ALGOLIA_APP_ID!;
const SEARCH_KEY = process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_KEY!;

const client = liteClient(APP_ID, SEARCH_KEY);

// ── Index names ────────────────────────────────────────────────────────────────
const BASE_INDEX = "products_index";

const REPLICA_MAP: Record<string, string> = {
    "gamingScore_desc": "products_index_gaming_desc",
    "gamingScore_asc": "products_index_gaming_asc",
    "productivityScore_desc": "products_index_productivity_desc",
    "productivityScore_asc": "products_index_productivity_asc",
    "price_asc": "products_index_price_asc",
    "price_desc": "products_index_price_desc",
    "valueScore_desc": "products_index_value_desc",
    "launchYear_desc": "products_index_year_desc",
};

// ── Types ─────────────────────────────────────────────────────────────────────
export interface SearchOptions {
    query: string;
    category?: string;       // "gpu" | "cpu" | "ram" | "psu" — filters Algolia facet
    brand?: string;
    hasIntegratedGraphics?: boolean;
    sortBy?: "gamingScore" | "productivityScore" | "price" | "valueScore" | "launchYear";
    sortDir?: "asc" | "desc";
    page?: number;
    limit?: number;
}

export interface SearchHit extends Partial<BaseProduct> {
    objectID: string;        // "${category}_${id}"
    id: string;
    category: string;
    name: string;
    brand: string;
}

export interface SearchResult {
    hits: SearchHit[];
    nbHits: number;
    page: number;
    nbPages: number;
    query: string;
}

// ── Cache v1 ──────────────────────────────────────────────────────────────────
const TTL_MS = 300_000; // 5 minutes

interface CacheEntry {
    data: SearchResult;
    expiresAt: number;
}

const cache = new Map<string, CacheEntry>();

function getCacheKey(opts: SearchOptions): string {
    return JSON.stringify(opts);
}

function getCached(key: string): SearchResult | null {
    const entry = cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
        cache.delete(key);
        return null;
    }
    return entry.data;
}

function setCache(key: string, data: SearchResult): void {
    cache.set(key, { data, expiresAt: Date.now() + TTL_MS });
}

// ── Main search function ───────────────────────────────────────────────────────
export async function searchProducts(options: SearchOptions): Promise<SearchResult> {
    const {
        query,
        category,
        brand,
        hasIntegratedGraphics,
        sortBy = "gamingScore",
        sortDir = "desc",
        page = 0,
        limit = 20,
    } = options;

    const trimmed = query.trim();

    // Cache check
    const cacheKey = getCacheKey({ ...options, query: trimmed });
    const cached = getCached(cacheKey);
    if (cached) return cached;

    // Build Algolia filter string
    const filters: string[] = ["legacy:false"];
    if (category) filters.push(`category:${category}`);
    if (brand) filters.push(`brand:"${brand}"`);
    if (hasIntegratedGraphics !== undefined) filters.push(`hasIntegratedGraphics:${hasIntegratedGraphics}`);
    const filterStr = filters.join(" AND ");

    // Select replica index for sort (fall back to base index when query is non-empty)
    // When query is non-empty, Algolia's relevance ranking is preferred over sort replicas.
    // Only use replica when query is empty (browse/list mode).
    const replicaKey = `${sortBy}_${sortDir}`;
    const indexName = trimmed
        ? BASE_INDEX
        : (REPLICA_MAP[replicaKey] ?? BASE_INDEX);

    // Execute search via liteClient multi-index API
    const response = await client.search({
        requests: [
            {
                indexName,
                query: trimmed,
                filters: filterStr,
                page,
                hitsPerPage: limit,
                attributesToRetrieve: [
                    "objectID", "id", "category", "name", "brand", "nameLowercase",
                    "normalized", "pricing", "legacy", "launchYear", "tier",
                    "tdpWatts", "msrpUSD", "scoreVersion", "socket", "wattage",
                    "memoryType", "type", "capacityGB", "pcieGen", "efficiency", "modular"
                ],
                attributesToHighlight: [],
            },
        ],
    });

    // response.results is an array — we sent exactly 1 request, so take results[0]
    const r = response.results[0] as any;

    const result: SearchResult = {
        hits: ((r.hits ?? []) as SearchHit[]).map((h) => ({
            ...h,
            // Resolve id from objectID if not set (objectID = "category_id")
            id: h.id ?? h.objectID.split("_").slice(1).join("_"),
            gamingScore: (h as any).normalized?.gamingScore ?? (h as any).gamingScore ?? 0,
            productivityScore: (h as any).normalized?.productivityScore ?? (h as any).productivityScore ?? 0,
        })),
        nbHits: r.nbHits ?? 0,
        page: r.page ?? 0,
        nbPages: r.nbPages ?? 0,
        query: trimmed,
    };

    setCache(cacheKey, result);
    return result;
}

// ── Cache invalidation (call after product updates) ───────────────────────────
export function invalidateSearchCache(): void {
    cache.clear();
}
