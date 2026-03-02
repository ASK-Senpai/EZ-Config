import "server-only";
import { GPUProduct } from "./types";
import { getAllGPUsCached } from "../data/loaders";

export async function getAlternativeGPUs(baseGPU: GPUProduct): Promise<GPUProduct[]> {
    const allGpus = await getAllGPUsCached();
    const currentPrice = baseGPU.pricing?.priceRange?.min || 0;

    let results = allGpus.filter(gpu => gpu.id !== baseGPU.id);

    if (currentPrice > 0) {
        const minP = currentPrice * 0.90;
        const maxP = currentPrice * 1.10;
        results = results.filter(gpu => {
            const p = gpu.pricing?.priceRange?.min || 0;
            return p >= minP && p <= maxP;
        });
    } else {
        results = results.filter(gpu => gpu.tier === baseGPU.tier);
    }

    results.sort((a, b) => (b.gamingScore ?? 0) - (a.gamingScore ?? 0));

    return results.slice(0, 3);
}
