// src/lib/engine/compatibility.ts
import { estimateSystemPower } from "./powerEstimator";

export interface BuildInput {
    cpu?: any;
    gpu?: any;                              // Discrete GPU (may be null for integrated builds)
    activeGpu?: any;                        // Resolved GPU: discrete OR vGPU (set by resolveActiveGpu)
    gpuSource?: "discrete" | "integrated" | "none"; // Resolution result
    motherboard?: any;
    ram?: any;
    storage?: any;
    psu?: any;
}

export function validateCompatibility(buildInput: BuildInput, recommendedWattage?: number) {
    const issues: string[] = [];
    const warnings: string[] = [];

    // 0. No active GPU available (F-variant CPU without discrete GPU)
    if (buildInput.gpuSource === "none") {
        issues.push("No GPU available: the selected CPU variant has no integrated graphics. Add a discrete GPU to your build.");
    }

    // 1. CPU and Motherboard socket match
    if (buildInput.cpu && buildInput.motherboard) {
        if (buildInput.cpu.socket && buildInput.motherboard.socket) {
            if (buildInput.cpu.socket !== buildInput.motherboard.socket) {
                issues.push(`CPU socket (${buildInput.cpu.socket}) does not match Motherboard socket (${buildInput.motherboard.socket}).`);
            }
        }
    }

    // 2. RAM and Motherboard compatibility
    if (buildInput.ram && buildInput.motherboard) {
        const moboRamType = buildInput.motherboard.memoryType || buildInput.motherboard.ramType || buildInput.motherboard.supportedRamType;

        // Rule 1: Type match
        if (buildInput.ram.type && moboRamType) {
            if (buildInput.ram.type !== moboRamType) {
                issues.push(`RAM type (${buildInput.ram.type}) is not supported by Motherboard (${moboRamType}).`);
            }
        }

        // Rule 2: Module count match
        const ramModules = buildInput.ram.modules || 1;
        const moboSlots = buildInput.motherboard.ramSlots || 2;
        if (ramModules > moboSlots) {
            issues.push(`RAM kit has ${ramModules} modules, but the Motherboard only supports ${moboSlots} slots.`);
        }
    }

    // RAM Capacity Warning
    if (buildInput.ram) {
        const capacity = buildInput.ram.capacityGB || 0;
        if (capacity > 0 && capacity < 16) {
            warnings.push(`16GB of RAM or more is recommended for modern gaming and productivity. You selected ${capacity}GB.`);
        }
    }

    // 3. Storage limitations
    if (buildInput.storage && buildInput.motherboard) {
        // TODO: Validate NVMe count vs motherboard M.2 slots
    }

    // 4. PSU Wattage validation
    if (buildInput.psu) {
        const { recommendedMinimum } = estimateSystemPower(buildInput);
        const psuWattage = buildInput.psu.wattage || 0;

        if (psuWattage < recommendedMinimum) {
            issues.push(`Selected PSU may be insufficient. Recommended minimum: ${recommendedMinimum}W`);
        } else if (psuWattage < recommendedMinimum + 50) {
            warnings.push(`PSU capacity is minimal. Consider higher wattage for upgrade headroom.`);
        }
    } else if (recommendedWattage && buildInput.psu) { // Legacy fallback
        if (buildInput.psu.wattage < recommendedWattage) {
            issues.push(`PSU wattage (${buildInput.psu.wattage}W) is lower than the recommended system wattage (${recommendedWattage}W).`);
        }
    }

    return {
        isValid: issues.length === 0,
        issues,
        warnings
    };
}
