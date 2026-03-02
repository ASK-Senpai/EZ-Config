// src/lib/engine/suggestion.ts

export interface SuggestionContext {
    bottleneck: { severity: string; direction: string };
    psuHeadroomPercentage: number;
    recommendedMinPSU: number;
    providedPSUWattage: number;
    performanceTier: string;
    gpuVram: number;
    ramCapacityGB: number;
    hasGpu: boolean;
    cpuHasIGPU: boolean;
}

export function generateSuggestions(context: SuggestionContext): string[] {
    const suggestions: string[] = [];

    // Bottleneck Rule
    if (context.bottleneck.severity === "high" || context.bottleneck.severity === "moderate") {
        if (context.bottleneck.direction === "GPU bottleneck") {
            suggestions.push("Your GPU gaming performance is significantly lower than your CPU's potential. Consider a faster GPU to balance the build.");
        }
    }

    // PSU Rule
    if (context.providedPSUWattage > 0 && context.providedPSUWattage < context.recommendedMinPSU + 50) {
        suggestions.push("Your PSU headroom is minimal. Consider a higher wattage unit for peak efficiency and future upgrades.");
    }

    // Integrated Graphics Warning
    if (!context.hasGpu && !context.cpuHasIGPU) {
        suggestions.push("Display Warning: The selected CPU does not have integrated graphics, and no discrete GPU is added. This system will not have a display output.");
    }

    // RAM Capacity Rule
    if (context.ramCapacityGB > 0 && context.ramCapacityGB < 16) {
        suggestions.push("Your current RAM capacity is below the 16GB recommendation for modern gaming and multitasking.");
    }

    return suggestions;
}
