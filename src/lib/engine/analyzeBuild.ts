// src/lib/engine/analyzeBuild.ts
// Master analysis wrapper — combines engine V12 + enhanced FPS + AI overview + market timing
// + intelligence metadata + optimizer. Pure deterministic — no Firestore, no AI calls.

import { runEngineV12 } from "./index";
import { BuildInput } from "./compatibility";
import { estimateDetailedFPS, DetailedFPS } from "./fpsEngine";
import { generateMiniOverview } from "./aiOverview";
import { calculateMarketTiming, MarketTimingResult } from "./marketTiming";
import { getGamingScoreSafe, getProductivityScoreSafe } from "./scoring";
import { optimizeBuild, OptimizationResult } from "./optimizer";
import { ENGINE_VERSION } from "./constants";

// ── Intelligence Metadata (Section 12) ─────────────────────────────────────
export interface IntelligenceMeta {
    buildTier: "Entry" | "Mid" | "High" | "Enthusiast" | "Extreme";
    confidenceScore: number;     // 0–100 — how confident are we in this analysis
    estimatedLongevityYears: {
        gaming: number;
        productivity: number;
    };
    thermalRiskLevel: "Low" | "Moderate" | "High";
    upgradeDifficulty: "Easy" | "Moderate" | "Complex";
    componentBalanceScore: number; // 0–100
}

export interface BuildAnalysis {
    version: string;
    scores: {
        gaming: number;
        workstation: number;
        futureProof: number;
        overall: number;
        tier: string;
    };
    fps: DetailedFPS;
    bottleneck: {
        percentage: number;
        severity: string;
        direction: string;
        affectedComponent: string | null;
    };
    power: {
        totalTDP: number;
        recommendedPSU: number;
        providedWattage: number;
        headroomPercent: number;
    };
    compatibility: {
        isValid: boolean;
        issues: string[];
        warnings: string[];
    };
    optimizationHints: OptimizationResult;
    riskFlags: string[];
    upgradeHeadroom: {
        cpuUpgradePotential: "low" | "medium" | "high";
        gpuUpgradePotential: "low" | "medium" | "high";
        ramUpgradePossible: boolean;
        storageExpandable: boolean;
    };
    intelligenceMeta: IntelligenceMeta;
    aiOverviewMini: string;
    marketTiming: MarketTimingResult;
    totalPrice: number;
}

export function analyzeBuild(buildInput: BuildInput, plan: string = "free"): BuildAnalysis {
    // 1) Run base engine
    const engine = runEngineV12(buildInput, plan);

    // 2) Raw scores for FPS
    const gpuScore = getGamingScoreSafe(buildInput?.activeGpu ?? buildInput?.gpu);
    const cpuScore = getGamingScoreSafe(buildInput?.cpu);
    const cpuProdScore = getProductivityScoreSafe(buildInput?.cpu);
    const gpuProdScore = getProductivityScoreSafe(buildInput?.activeGpu ?? buildInput?.gpu);

    // 3) Enhanced FPS
    const fps = estimateDetailedFPS(gpuScore, cpuScore);

    // 4) Workstation score (productivity-weighted)
    const workstationScore = Math.round(
        Math.max(0, Math.min((0.5 * (cpuProdScore / 10)) + (0.5 * (gpuProdScore / 10)), 100))
    );

    // 5) Power headroom
    const headroomPercent = engine.power.providedWattage > 0
        ? Math.round(((engine.power.providedWattage - engine.power.totalTDP) / engine.power.providedWattage) * 100)
        : 0;

    // 6) Risk flags
    const riskFlags: string[] = [];
    if (headroomPercent < 10 && engine.power.providedWattage > 0)
        riskFlags.push("PSU headroom is critically low — risk of system instability under load.");
    if (engine.bottleneck.severity === "high")
        riskFlags.push(`Severe ${engine.bottleneck.direction} detected — ${engine.bottleneck.percentage}% imbalance.`);
    if (!engine.compatibility.isValid)
        riskFlags.push("Compatibility issues detected — check component requirements.");

    // 7) Upgrade headroom
    const upgradeHeadroom = {
        cpuUpgradePotential: engine.metrics.normalizedCPU < 40 ? "high" as const : engine.metrics.normalizedCPU < 70 ? "medium" as const : "low" as const,
        gpuUpgradePotential: engine.metrics.normalizedGPU < 40 ? "high" as const : engine.metrics.normalizedGPU < 70 ? "medium" as const : "low" as const,
        ramUpgradePossible: (buildInput?.ram?.capacityGB || 0) < 32,
        storageExpandable: true, // Always expandable with more drives
    };

    // 8) Total price
    const totalPrice = [
        buildInput?.cpu?.pricing?.priceRange?.min,
        buildInput?.gpu?.pricing?.priceRange?.min,
        buildInput?.motherboard?.pricing?.priceRange?.min,
        buildInput?.ram?.pricing?.priceRange?.min,
        buildInput?.storage?.pricing?.priceRange?.min,
        buildInput?.psu?.pricing?.priceRange?.min,
    ].reduce((sum: number, p) => sum + (p || 0), 0);

    // 9) Market timing
    const marketTiming = calculateMarketTiming(buildInput);

    // 10) Optimizer (heuristic-based)
    const optimizationHints = optimizeBuild(buildInput);

    // 11) Intelligence Metadata (Section 12)
    const componentBalanceScore = Math.max(0, 100 - engine.bottleneck.percentage * 2);
    const estimatedTDP = engine.power.totalTDP;

    const intelligenceMeta: IntelligenceMeta = {
        buildTier: mapExtendedTier(engine.metrics.performanceScore),
        confidenceScore: computeConfidence(buildInput),
        estimatedLongevityYears: {
            gaming: estimateLongevity(engine.metrics.performanceScore, "gaming"),
            productivity: estimateLongevity(engine.metrics.performanceScore, "productivity"),
        },
        thermalRiskLevel: estimatedTDP > 500 ? "High" : estimatedTDP > 300 ? "Moderate" : "Low",
        upgradeDifficulty: determineUpgradeDifficulty(buildInput),
        componentBalanceScore,
    };

    // 12) AI mini overview
    const analysisForOverview = {
        tier: engine.metrics.tier,
        performanceScore: engine.metrics.performanceScore,
        bottleneck: engine.bottleneck,
        headroomPercent,
        totalPrice,
        fps,
        riskFlags,
        suggestions: engine.suggestions,
    };
    const aiOverviewMini = generateMiniOverview(analysisForOverview);

    return {
        version: ENGINE_VERSION,
        scores: {
            gaming: engine.metrics.performanceScore,
            workstation: workstationScore,
            futureProof: engine.metrics.futureProofScore,
            overall: Math.round((engine.metrics.performanceScore * 0.5 + workstationScore * 0.2 + engine.metrics.futureProofScore * 0.3)),
            tier: engine.metrics.tier,
        },
        fps,
        bottleneck: engine.bottleneck,
        power: {
            ...engine.power,
            headroomPercent,
        },
        compatibility: engine.compatibility,
        optimizationHints,
        riskFlags,
        upgradeHeadroom,
        intelligenceMeta,
        aiOverviewMini,
        marketTiming,
        totalPrice,
    };
}

// ── Helper Functions ─────────────────────────────────────────────────────────

function mapExtendedTier(score: number): IntelligenceMeta["buildTier"] {
    if (score < 25) return "Entry";
    if (score < 50) return "Mid";
    if (score < 72) return "High";
    if (score < 90) return "Enthusiast";
    return "Extreme";
}

function computeConfidence(buildInput: BuildInput): number {
    // Confidence is higher when all components are present with V1 normalized scores
    let score = 50;
    if (buildInput?.cpu?.normalized?.gamingScore !== undefined) score += 10;
    if (buildInput?.gpu?.normalized?.gamingScore !== undefined) score += 15;
    if ((buildInput?.activeGpu ?? buildInput?.gpu)) score += 5;
    if (buildInput?.motherboard) score += 5;
    if (buildInput?.ram) score += 5;
    if (buildInput?.psu) score += 5;
    if (buildInput?.storage) score += 5;
    return Math.min(100, score);
}

function estimateLongevity(performanceScore: number, useCase: "gaming" | "productivity"): number {
    // Gaming degrades faster than productivity
    const base = performanceScore / 100;
    if (useCase === "gaming") {
        if (base >= 0.85) return 5;
        if (base >= 0.65) return 4;
        if (base >= 0.45) return 3;
        if (base >= 0.25) return 2;
        return 1;
    }
    // Productivity lasts longer
    if (base >= 0.7) return 6;
    if (base >= 0.5) return 5;
    if (base >= 0.3) return 4;
    return 3;
}

function determineUpgradeDifficulty(buildInput: BuildInput): IntelligenceMeta["upgradeDifficulty"] {
    // Complex if using old socket / DDR4 platform (limits future CPU upgrades)
    const socket = buildInput?.motherboard?.socket || "";
    const ramType = buildInput?.ram?.type || "";
    const oldSockets = ["LGA1200", "LGA1151", "AM4"];

    if (oldSockets.includes(socket) && ramType === "DDR4") return "Complex";
    if (oldSockets.includes(socket) || ramType === "DDR4") return "Moderate";
    return "Easy";
}
