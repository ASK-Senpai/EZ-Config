// src/lib/engine/power.ts

export function calculateTotalTDP(buildInput: any): number {
    const gpu = buildInput?.activeGpu ?? buildInput?.gpu;
    const cpuTdp = resolveTdp(buildInput?.cpu);
    const gpuTdp = resolveTdp(gpu);

    // System baseline includes board/chipset, RAM, storage, cooling and transient headroom.
    // This keeps estimates aligned with real-world full-system draw.
    const systemBaseline = 220;

    return cpuTdp + gpuTdp + systemBaseline;
}

function resolveTdp(component: any): number {
    if (!component) return 0;

    const direct = component.tdp;
    if (typeof direct === "number" && Number.isFinite(direct)) return direct;

    const watts = component.tdpWatts;
    if (typeof watts === "number" && Number.isFinite(watts)) return watts;

    const nested = component.power?.tdp;
    if (typeof nested === "number" && Number.isFinite(nested)) return nested;

    return 0;
}

export function calculateRecommendedPSU(totalTDP: number, performanceTier: string): number {
    let buffer = 0.25; // 25% default buffer

    if (performanceTier === "High" || performanceTier === "Enthusiast") {
        buffer = 0.30; // 30% buffer for high-end systems
    }

    const recommended = totalTDP * (1 + buffer);

    // Round up to nearest 50W
    return Math.ceil(recommended / 50) * 50;
}
