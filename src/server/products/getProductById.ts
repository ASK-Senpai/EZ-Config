/**
 * getProductById.ts
 * Universal single-document fetcher for any product category.
 * Replaces: getGPUById, getCPUById — no category branching.
 *
 * Path: components/{category}/items/{id}
 */

import "server-only";
import "@/server/firebase/admin";
import { getFirestore } from "firebase-admin/firestore";
import { sanitize } from "@/server/firestore/sanitize";
import type { BaseProduct } from "@/lib/products/types";

export async function getProductById(
    category: string,
    id: string
): Promise<BaseProduct | null> {
    const db = getFirestore();
    const doc = await db
        .collection("components")
        .doc(category)
        .collection("items")
        .doc(id)
        .get();

    if (!doc.exists) return null;

    const raw = sanitize(doc.data()!) as Record<string, any>;

    // Surface normalized gaming/productivity scores to top-level
    // so engine scoring accessors and product cards work uniformly
    return {
        ...raw,
        id: doc.id,
        gamingScore: raw.normalized?.gamingScore ?? raw.gamingScore ?? 0,
        productivityScore: raw.normalized?.productivityScore ?? raw.productivityScore ?? 0,
        tier: raw.tier ?? raw.performanceTier ?? "—",
        legacy: raw.legacy ?? false,
    } as BaseProduct;
}

