/**
 * src/config/categoryConfig.ts
 * Central rendering configuration for every product category.
 * Components MUST read from here — no inline `if (category === "cpu")` allowed.
 */

export interface SpecField {
    key: string;           // Firestore field path (dot-notation for nested)
    label: string;
    format?: (val: any) => string;
}

export interface CategoryConfig {
    label: string;         // Display label, e.g. "GPU Intelligence"
    accentColor: string;   // Tailwind text color for the brand/header accent
    hasSku: boolean;       // Show SKU selector (CPU has variants: F, K, KF…)
    hasPricing: boolean;   // Show Market Intelligence panel
    hasTdp: boolean;       // Show TDP field
    showIgpuLink: boolean; // Show integrated graphics status (CPU only)
    specFields: SpecField[]; // Ordered spec grid for the detail page
}

const fmt = {
    clock: (v: any) => v != null ? `${v} GHz` : "—",
    watts: (v: any) => v != null ? `${v}W` : "—",
    gb: (v: any) => v != null ? `${v} GB` : "—",
    bool: (yes: string, no: string) => (v: any) => v ? yes : no,
    str: (v: any) => v ?? "—",
};

const CATEGORY_CONFIG: Record<string, CategoryConfig> = {
    gpu: {
        label: "GPU Intelligence",
        accentColor: "text-amber-500",
        hasSku: false,
        hasPricing: true,
        hasTdp: true,
        showIgpuLink: false,
        specFields: [
            { key: "architecture", label: "Architecture", format: fmt.str },
            { key: "vramGB", label: "Memory Buffer", format: (v) => v ? `${v}GB` : "—" },
            { key: "memoryType", label: "Memory Type", format: fmt.str },
            { key: "tdpWatts", label: "Power Draw (TDP)", format: fmt.watts },
            { key: "rayTracing", label: "Ray Tracing", format: fmt.bool("Supported", "Not Supported") },
            { key: "upscaling", label: "Upscaling", format: fmt.str },
        ],
    },

    cpu: {
        label: "CPU Intelligence",
        accentColor: "text-blue-400",
        hasSku: true,
        hasPricing: true,
        hasTdp: true,
        showIgpuLink: true,
        specFields: [
            { key: "generation", label: "Generation", format: fmt.str },
            { key: "socket", label: "Socket", format: fmt.str },
            { key: "cores", label: "Cores", format: fmt.str },
            { key: "threads", label: "Threads", format: fmt.str },
            { key: "baseClockGHz", label: "Base Clock", format: fmt.clock },
            { key: "boostClockGHz", label: "Boost Clock", format: fmt.clock },
            { key: "tdpWatts", label: "Power Draw (TDP)", format: fmt.watts },
        ],
    },

    vgpu: {
        label: "Integrated GPU",
        accentColor: "text-teal-400",
        hasSku: false,
        hasPricing: false,   // vGPU has no pricing
        hasTdp: false,        // vGPU has no TDP
        showIgpuLink: false,
        specFields: [
            { key: "architecture", label: "Architecture", format: fmt.str },
            { key: "performanceTier", label: "Performance Tier", format: fmt.str },
            { key: "anchorScale", label: "Anchor Scale", format: (v) => v ? `${v} (V1)` : "—" },
        ],
    },

    ram: {
        label: "RAM Intelligence",
        accentColor: "text-green-400",
        hasSku: false,
        hasPricing: true,
        hasTdp: false,
        showIgpuLink: false,
        specFields: [
            { key: "type", label: "Memory Type", format: fmt.str },
            { key: "capacityGB", label: "Capacity", format: fmt.gb },
            { key: "speedMT", label: "Speed", format: (v) => v ? `${v} MT/s` : "—" },
        ],
    },

    psu: {
        label: "PSU Intelligence",
        accentColor: "text-yellow-400",
        hasSku: false,
        hasPricing: true,
        hasTdp: false,
        showIgpuLink: false,
        specFields: [
            { key: "wattage", label: "Wattage", format: fmt.watts },
            { key: "efficiency", label: "Efficiency", format: fmt.str },
            { key: "modular", label: "Modular", format: fmt.bool("Yes", "No") },
        ],
    },

    motherboard: {
        label: "Motherboard Intelligence",
        accentColor: "text-rose-400",
        hasSku: false,
        hasPricing: true,
        hasTdp: false,
        showIgpuLink: false,
        specFields: [
            { key: "socket", label: "CPU Socket", format: fmt.str },
            { key: "chipset", label: "Chipset", format: fmt.str },
            { key: "formFactor", label: "Form Factor", format: fmt.str },
            { key: "ramType", label: "RAM Type", format: fmt.str },
        ],
    },
};

export default CATEGORY_CONFIG;

/** Type-safe getter with fallback to a generic config for unknown categories */
export function getCategoryConfig(category: string): CategoryConfig {
    return CATEGORY_CONFIG[category] ?? {
        label: `${category.toUpperCase()} Intelligence`,
        accentColor: "text-neutral-400",
        hasSku: false,
        hasPricing: true,
        hasTdp: false,
        showIgpuLink: false,
        specFields: [],
    };
}
