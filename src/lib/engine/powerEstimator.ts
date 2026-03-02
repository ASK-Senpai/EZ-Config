/**
 * powerEstimator.ts
 * Computes builder power wattage constraints.
 */
import type { BuildInput } from "./compatibility";

export function estimateSystemPower(input: BuildInput): {
    estimatedDraw: number;
    recommendedMinimum: number;
} {
    let baseDraw = 50; // Motherboard + fans buffer

    // Add CPU thermal design power (TDP)
    if (input.cpu && typeof input.cpu.tdp === "number") {
        baseDraw += input.cpu.tdp;
    } else if (input.cpu) {
        // Fallback default CPU TDP if missing
        baseDraw += 105;
    }

    // Add GPU power draw
    if (input.gpu && typeof input.gpu.tdp === "number") {
        baseDraw += input.gpu.tdp;
    } else if (input.gpu) {
        // Fallback for powerful GPUs if missing
        baseDraw += 300;
    }
    // Note: if activeGpu is purely integrated (vGPU), we don't add extra baseline power
    // since the CPU's TDP covers the iGPU.

    // Storage requirements
    if (input.storage) {
        // Simplified: assuming 1 drive selected
        baseDraw += 20;
    }

    // Memory requirements
    if (input.ram) {
        const modules = input.ram.modules || 2;
        baseDraw += (10 * modules);
    }

    // Add 30% Headroom
    const recommendedMinimum = Math.ceil(baseDraw * 1.3);

    return {
        estimatedDraw: baseDraw,
        recommendedMinimum
    };
}
