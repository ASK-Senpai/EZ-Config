export interface AICacheEntry {
    data: any;
    timestamp: number;
}

const aiCache = new Map<string, AICacheEntry>();
const TTL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

export function getCachedAI(key: string): any | null {
    const entry = aiCache.get(key);
    if (!entry) return null;

    if (Date.now() - entry.timestamp > TTL) {
        aiCache.delete(key);
        return null;
    }

    return entry.data;
}

export function setCachedAI(key: string, data: any): void {
    if (!data) return; // Don't cache empty or null

    // Only cache if it exists and looks somewhat valid if object
    if (typeof data === 'object' && Object.keys(data).length === 0) return;

    aiCache.set(key, {
        data,
        timestamp: Date.now()
    });
}

export function generateBottleneckKey(cpuId: string, gpuId: string, resolution: string, targetFps: number): string {
    return `bottleneck:${cpuId}|${gpuId}|${resolution}|${targetFps}`;
}

export function generateCompatKey(cpuId: string, gpuId: string, psuWatts: number, moboId?: string): string {
    return `compat:${cpuId}|${gpuId}|${psuWatts}|${moboId || 'none'}`;
}

export function generateMarketKey(gpuId: string, priceMin: number, priceMax: number): string {
    return `market:${gpuId}|${priceMin}|${priceMax}`;
}
