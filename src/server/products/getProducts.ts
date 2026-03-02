import "server-only";
import { getFirestore } from "firebase-admin/firestore";
import "@/server/firebase/admin";
import { BaseProduct } from "@/lib/products/types";
import { sanitize } from "@/server/firestore/sanitize";
import { GetProductsOptions, SORT_FIELD_MAP } from "@/lib/products/options";

const PAGE_SIZE = 20;

export async function getProducts(
    options: GetProductsOptions
): Promise<{ products: BaseProduct[]; nextCursor: string | null }> {
    const db = getFirestore();
    const { category, brand, hasIntegratedGraphics, inStockOnly, sortBy = "gamingScore", sortDir, limit = PAGE_SIZE, cursor, ramType, ramCapacity, ramSpeed, storageType, pcieGen, wattage, efficiency, modular, minPrice, maxPrice } = options;

    const col = db.collection("components").doc(category).collection("items");

    // ── Step 1: Base filter ──────────────────────────────────────────────────
    let query: FirebaseFirestore.Query = col.where("legacy", "==", false);

    // ── Step 2: Brand / APU filter (Firestore-level) ─────────────────────────
    if (brand) {
        query = query.where("brand", "==", brand);
    }
    if (hasIntegratedGraphics !== undefined) {
        query = query.where("hasIntegratedGraphics", "==", hasIntegratedGraphics);
    }
    if (ramType) {
        query = query.where("type", "==", ramType);
    }
    if (ramCapacity) {
        query = query.where("capacityGB", "==", ramCapacity);
    }
    if (ramSpeed) {
        query = query.where("speedMHz", "==", ramSpeed);
    }
    if (storageType) {
        query = query.where("type", "==", storageType);
    }
    if (pcieGen) {
        query = query.where("pcieGen", "==", pcieGen);
    }
    if (wattage) {
        query = query.where("wattage", "==", wattage);
    }
    if (efficiency) {
        query = query.where("efficiency", "==", efficiency);
    }
    if (modular) {
        query = query.where("modular", "==", modular);
    }
    if (minPrice !== undefined) {
        query = query.where("pricing.priceRange.min", ">=", minPrice);
    }
    if (maxPrice !== undefined) {
        query = query.where("pricing.priceRange.min", "<=", maxPrice);
    }

    // ── Step 3: Sort (always Firestore-level) ────────────────────────────────
    let sortConfig = SORT_FIELD_MAP[sortBy];
    let finalSortDir = sortDir || sortConfig.defaultDir;

    // RULE: If range filter is used, first orderBy must be that field
    if (minPrice !== undefined || maxPrice !== undefined) {
        if (sortConfig.field !== "pricing.priceRange.min") {
            // Force price sort first if range filtering by price
            query = query.orderBy("pricing.priceRange.min", "asc");
        }
    }

    query = query.orderBy(sortConfig.field, finalSortDir);

    // ── Step 5: Pagination ───────────────────────────────────────────────────
    query = query.limit(limit);
    if (cursor) {
        const cursorDoc = await col.doc(cursor).get();
        if (cursorDoc.exists) {
            query = query.startAfter(cursorDoc);
        }
    }

    // ── Step 6: Execute ──────────────────────────────────────────────────────
    const snapshot = await query.get();

    let results: BaseProduct[] = snapshot.docs.map((doc) => {
        const raw = doc.data();
        const s = sanitize(raw) as Record<string, any>;
        // Resolve gamingScore from V1 normalized field (source of truth)
        const gamingScore = s.normalized?.gamingScore ?? s.gamingScore ?? 0;
        const productivityScore = s.normalized?.productivityScore ?? s.productivityScore ?? 0;
        return {
            id: doc.id,
            ...s,
            gamingScore,
            productivityScore,
        } as BaseProduct;
    });

    // ── Step 7: In-stock filter (safe — only post-Firestore, small result set) 
    if (inStockOnly) {
        results = results.filter(
            (p) => p.pricing?.availability?.toLowerCase() === "in stock"
        );
    }

    const nextCursor =
        snapshot.docs.length === limit
            ? snapshot.docs[snapshot.docs.length - 1].id
            : null;

    return { products: results, nextCursor };
}

