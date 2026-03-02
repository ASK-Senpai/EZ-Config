// src/lib/engine/bottleneck.ts

export function calculateBottleneck(normalizedCPU: number, normalizedGPU: number) {
    const delta = normalizedCPU - normalizedGPU;
    const percentage = Math.abs(delta);

    let severity = "low";
    if (percentage >= 25) {
        severity = "high";
    } else if (percentage >= 10) {
        severity = "moderate";
    }

    let direction = "balanced";
    if (delta > 10) {
        direction = "GPU bottleneck";
    } else if (delta < -10) {
        direction = "CPU bottleneck";
    }

    return {
        percentage: Math.round(percentage * 100) / 100,
        severity,
        direction,
        affectedComponent: direction === "GPU bottleneck" ? "GPU" : (direction === "CPU bottleneck" ? "CPU" : null)
    };
}
