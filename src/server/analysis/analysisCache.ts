"use server";

import { getFirestore } from "firebase-admin/firestore";
import "@/server/firebase/admin";
import { ENGINE_VERSION } from "@/lib/engine/constants";
import type { BuildAnalysis } from "@/lib/engine/analyzeBuild";

export const FPS_MODEL_VERSION = "1.0.0";

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Generate a deterministic, version-aware hash from component IDs + engine version.
 * If ENGINE_VERSION changes, all caches auto-invalidate.
 */
export function generateBuildHash(components: Record<string, string | null>): string {
    const parts = [
        components.cpuId || "_",
        components.gpuId || "_",
        components.motherboardId || "_",
        components.ramId || "_",
        components.storageId || "_",
        components.psuId || "_",
        ENGINE_VERSION,
        FPS_MODEL_VERSION,
    ];
    const raw = parts.join("|");
    return Buffer.from(raw).toString("base64url");
}

/**
 * Check if a cached analysis exists, is still valid, and matches current engine version.
 */
export async function getCachedAnalysis(hash: string): Promise<BuildAnalysis | null> {
    try {
        const db = getFirestore();
        const doc = await db.collection("analysisCache").doc(hash).get();

        if (!doc.exists) return null;

        const data = doc.data()!;

        // Version check — invalidate if engine changed
        if (data.engineVersion !== ENGINE_VERSION) return null;

        // TTL check
        const cachedAt = data.cachedAt?.toDate?.()?.getTime() || 0;
        if (Date.now() - cachedAt > CACHE_TTL_MS) return null;

        return data.analysisData as BuildAnalysis;
    } catch {
        return null; // Fail silently — just recompute
    }
}

/**
 * Store analysis result in cache with version metadata.
 */
export async function setCachedAnalysis(hash: string, analysis: BuildAnalysis): Promise<void> {
    try {
        const db = getFirestore();
        await db.collection("analysisCache").doc(hash).set({
            hash,
            engineVersion: ENGINE_VERSION,
            fpsModelVersion: FPS_MODEL_VERSION,
            cachedAt: new Date(),
            analysisData: analysis,
        });
    } catch (err) {
        console.error("Failed to cache analysis:", err);
    }
}

/**
 * Cache for AI-generated overviews (separate from deterministic analysis).
 */
export async function getCachedAIOverview(hash: string): Promise<string | null> {
    try {
        const db = getFirestore();
        const doc = await db.collection("aiAnalysisCache").doc(hash).get();
        if (!doc.exists) return null;

        const data = doc.data()!;
        const cachedAt = data.cachedAt?.toDate?.()?.getTime() || 0;
        if (Date.now() - cachedAt > CACHE_TTL_MS) return null;

        return data.overview as string;
    } catch {
        return null;
    }
}

export async function setCachedAIOverview(hash: string, overview: string): Promise<void> {
    try {
        const db = getFirestore();
        await db.collection("aiAnalysisCache").doc(hash).set({
            hash,
            cachedAt: new Date(),
            overview,
        });
    } catch (err) {
        console.error("Failed to cache AI overview:", err);
    }
}
