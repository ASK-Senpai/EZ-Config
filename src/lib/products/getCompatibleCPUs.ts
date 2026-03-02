import "server-only";
import { CPUProduct, GPUProduct } from "./types";
import { getAllCPUsCached } from "../data/loaders";

export async function getCompatibleCPUs(gpu: GPUProduct): Promise<CPUProduct[]> {
    const tierOrder = ["entry", "mid", "mid-high", "high"];
    const tierIndex = tierOrder.indexOf(gpu.tier as any);

    let allowedTiers: string[] = [];
    if (tierIndex === -1) {
        allowedTiers = [gpu.tier as string || "mid"];
    } else {
        if (tierIndex > 0) allowedTiers.push(tierOrder[tierIndex - 1]);
        allowedTiers.push(tierOrder[tierIndex]);
        if (tierIndex < tierOrder.length - 1) allowedTiers.push(tierOrder[tierIndex + 1]);
    }

    const allCpus = await getAllCPUsCached();
    const cpus = allCpus
        .filter(cpu => allowedTiers.includes(cpu.tier as string))
        .sort((a, b) => {
            const tierAIndex = tierOrder.indexOf(a.tier as string);
            const tierBIndex = tierOrder.indexOf(b.tier as string);
            if (tierAIndex !== tierBIndex) return tierAIndex - tierBIndex;
            return (b.gamingScore ?? 0) - (a.gamingScore ?? 0);
        });

    return cpus.slice(0, 3);
}
