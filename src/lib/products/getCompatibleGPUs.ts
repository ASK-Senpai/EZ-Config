import "server-only";
import { CPUProduct, GPUProduct } from "./types";
import { getAllGPUsCached, getAllCPUsCached } from "../data/loaders";

export async function getCompatibleGPUs(cpu: CPUProduct): Promise<GPUProduct[]> {
    const tierOrder = ["entry", "mid", "mid-high", "high"];
    const tierIndex = tierOrder.indexOf(cpu.tier as any);

    let allowedTiers: string[] = [];
    if (tierIndex === -1) {
        allowedTiers = [cpu.tier as string || "mid"];
    } else {
        if (tierIndex > 0) allowedTiers.push(tierOrder[tierIndex - 1]);
        allowedTiers.push(tierOrder[tierIndex]);
        if (tierIndex < tierOrder.length - 1) allowedTiers.push(tierOrder[tierIndex + 1]);
    }

    const allGpus = await getAllGPUsCached();
    const gpus = allGpus
        .filter(gpu => allowedTiers.includes(gpu.tier as string))
        .sort((a, b) => {
            const tierAIndex = tierOrder.indexOf(a.tier as string);
            const tierBIndex = tierOrder.indexOf(b.tier as string);
            if (tierAIndex !== tierBIndex) return tierAIndex - tierBIndex;
            return (b.gamingScore ?? 0) - (a.gamingScore ?? 0);
        });

    return gpus.slice(0, 3);
}

export async function getCPUById(id: string): Promise<CPUProduct | null> {
    const allCpus = await getAllCPUsCached();
    return allCpus.find(c => c.id === id) || null;
}
