// src/lib/engine/optimizer.ts
// Heuristic-based build optimization engine
// NO brute-force. Rule-based suggestions within ±10% budget.

import { BuildInput } from "./compatibility";
import { getGamingScoreSafe, getProductivityScoreSafe } from "./scoring";
import { runEngineV12 } from "./index";
import { getMinPrice } from "@/lib/utils/pricingV2";

export interface OptimizationResult {
    suggestions: OptimizationSuggestion[];
    potentialScoreDelta: number;
    explanation: string;
}

export interface OptimizationSuggestion {
    component: "cpu" | "gpu" | "ram" | "psu" | "storage";
    reason: string;
    priority: "high" | "medium" | "low";
    action: string;
}

export interface OptimizationConstraints {
    minBudget: number;
    maxBudget: number;
    catalog?: Partial<Record<"cpu" | "gpu" | "motherboard" | "ram" | "storage" | "psu", any[]>>;
}

export interface ScoreSnapshot {
    gaming: number;
    futureProof: number;
    workstation: number;
    overall: number;
}

export interface GeneratedOptimizationResult {
    optimizedBuild: BuildInput;
    originalScores: ScoreSnapshot;
    newScores: ScoreSnapshot;
    scoreDelta: ScoreSnapshot;
    priceDelta: number;
}

type BuildCategory = "cpu" | "gpu" | "motherboard" | "ram" | "storage" | "psu";

export function optimizeBuild(buildInput: BuildInput, budget?: number): OptimizationResult;
export function optimizeBuild(buildInput: BuildInput, constraints: OptimizationConstraints): GeneratedOptimizationResult;

/**
 * Heuristic optimization engine.
 * Analyzes the current build and produces actionable upgrade suggestions.
 */
export function optimizeBuild(
    buildInput: BuildInput,
    budgetOrConstraints?: number | OptimizationConstraints
): OptimizationResult | GeneratedOptimizationResult {
    if (
        typeof budgetOrConstraints === "object" &&
        budgetOrConstraints !== null &&
        typeof budgetOrConstraints.minBudget === "number" &&
        typeof budgetOrConstraints.maxBudget === "number"
    ) {
        return generateOptimizedBuild(buildInput, budgetOrConstraints);
    }

    return generateOptimizationHints(buildInput);
}

function generateOptimizationHints(buildInput: BuildInput): OptimizationResult {
    const suggestions: OptimizationSuggestion[] = [];
    let potentialScoreDelta = 0;

    const gpuScore = getGamingScoreSafe(buildInput?.activeGpu ?? buildInput?.gpu);
    const cpuScore = getGamingScoreSafe(buildInput?.cpu);

    // ── Rule 1: GPU Bottleneck (CPU >> GPU) ───────────────────────────────
    if (cpuScore > 0 && gpuScore > 0) {
        const ratio = gpuScore / cpuScore;

        if (ratio < 0.7) {
            // GPU is significantly weaker
            suggestions.push({
                component: "gpu",
                reason: `GPU gaming score (${gpuScore}) is ${Math.round((1 - ratio) * 100)}% lower than CPU (${cpuScore}). GPU is the bottleneck.`,
                priority: "high",
                action: "Upgrade to a GPU with a gaming score closer to your CPU level within ±10% of its current price.",
            });
            potentialScoreDelta += Math.round((cpuScore - gpuScore) * 0.3);
        }

        if (ratio > 1.5) {
            // CPU is significantly weaker
            suggestions.push({
                component: "cpu",
                reason: `CPU gaming score (${cpuScore}) is significantly lower than GPU (${gpuScore}). CPU is the bottleneck.`,
                priority: "high",
                action: "Upgrade to a higher-tier CPU on the same socket to balance the build.",
            });
            potentialScoreDelta += Math.round((gpuScore - cpuScore) * 0.2);
        }
    }

    // ── Rule 2: PSU Headroom ──────────────────────────────────────────────
    const cpuTdp = buildInput?.cpu?.tdpWatts || buildInput?.cpu?.tdp || 0;
    const gpuTdp = buildInput?.gpu?.tdpWatts || buildInput?.gpu?.tdp || 0;
    const estimatedDraw = cpuTdp + gpuTdp + 75; // mobo+ram+storage baseline
    const psuWattage = buildInput?.psu?.wattage || 0;

    if (psuWattage > 0) {
        const headroom = ((psuWattage - estimatedDraw) / psuWattage) * 100;

        if (headroom < 10) {
            suggestions.push({
                component: "psu",
                reason: `PSU headroom is only ${Math.round(headroom)}%. System may be unstable under peak load.`,
                priority: "high",
                action: `Upgrade to a ${Math.ceil((estimatedDraw * 1.25) / 50) * 50}W PSU for safe headroom.`,
            });
        } else if (headroom < 20) {
            suggestions.push({
                component: "psu",
                reason: `PSU headroom is ${Math.round(headroom)}%. Minimal room for future upgrades.`,
                priority: "medium",
                action: `Consider a ${Math.ceil((estimatedDraw * 1.30) / 50) * 50}W PSU for better longevity.`,
            });
        }
    }

    // ── Rule 3: RAM Upgrade ───────────────────────────────────────────────
    const ramCapacity = buildInput?.ram?.capacityGB || 0;
    const ramType = buildInput?.ram?.type || "";

    if (ramCapacity > 0 && ramCapacity < 16) {
        suggestions.push({
            component: "ram",
            reason: `${ramCapacity}GB RAM is below the modern 16GB minimum for gaming and multitasking.`,
            priority: "high",
            action: "Upgrade to 16GB or 32GB of the same type.",
        });
        potentialScoreDelta += 3;
    }

    if (ramType === "DDR4" && buildInput?.motherboard?.memoryType === "DDR5") {
        suggestions.push({
            component: "ram",
            reason: "Your motherboard supports DDR5 but you have DDR4 RAM — this is incompatible or suboptimal.",
            priority: "high",
            action: "Switch to DDR5 RAM to match your motherboard.",
        });
    } else if (ramType === "DDR4") {
        suggestions.push({
            component: "ram",
            reason: "DDR4 is previous-gen memory. DDR5 offers higher bandwidth for future-proofing.",
            priority: "low",
            action: "Consider a DDR5 platform on your next upgrade cycle.",
        });
    }

    // ── Rule 4: Storage ───────────────────────────────────────────────────
    const storage = buildInput?.storage;
    if (storage) {
        const storageItem = Array.isArray(storage) ? storage[0] : storage;
        if (storageItem?.type === "SATA") {
            suggestions.push({
                component: "storage",
                reason: "SATA storage is significantly slower than NVMe for boot and load times.",
                priority: "medium",
                action: "Replace with an NVMe SSD for 3-5x faster read/write speeds.",
            });
            potentialScoreDelta += 2;
        }
        if (storageItem?.capacityGB && storageItem.capacityGB < 500) {
            suggestions.push({
                component: "storage",
                reason: `${storageItem.capacityGB}GB storage is very limited for modern games (50-100GB each).`,
                priority: "medium",
                action: "Upgrade to at least 1TB for comfortable game library storage.",
            });
        }
    }

    // ── Build explanation ─────────────────────────────────────────────────
    let explanation: string;
    if (suggestions.length === 0) {
        explanation = "Your build is well-balanced. No immediate optimizations needed.";
    } else {
        const highCount = suggestions.filter(s => s.priority === "high").length;
        if (highCount >= 2) {
            explanation = `Found ${suggestions.length} optimization opportunities, ${highCount} of which are high priority. Addressing these could improve your gaming score by ~${potentialScoreDelta} points.`;
        } else {
            explanation = `Found ${suggestions.length} potential improvements. These are mostly fine-tuning optimizations that could marginally improve performance and longevity.`;
        }
    }

    return { suggestions, potentialScoreDelta, explanation };
}

function generateOptimizedBuild(
    originalBuild: BuildInput,
    constraints: OptimizationConstraints
): GeneratedOptimizationResult {
    const categories: BuildCategory[] = ["cpu", "gpu", "motherboard", "ram", "storage", "psu"];
    const maxIterations = 3;

    const baseEval = evaluateBuild(originalBuild);
    let bestBuild = cloneBuild(originalBuild);
    let bestEval = baseEval;

    for (let iteration = 0; iteration < maxIterations; iteration++) {
        let iterationBestBuild = bestBuild;
        let iterationBestEval = bestEval;

        for (const category of categories) {
            const candidates = getCandidatesForCategory(category, bestBuild, constraints.catalog);

            for (const candidate of candidates) {
                const nextBuild = applyCandidate(bestBuild, category, candidate);
                const evaluated = evaluateBuild(nextBuild);

                if (!passesConstraints(evaluated, constraints)) continue;
                if (evaluated.scores.overall <= iterationBestEval.scores.overall + 0.01) continue;

                iterationBestBuild = nextBuild;
                iterationBestEval = evaluated;
            }
        }

        if (iterationBestEval.scores.overall <= bestEval.scores.overall + 0.01) {
            break;
        }

        bestBuild = iterationBestBuild;
        bestEval = iterationBestEval;
    }

    return {
        optimizedBuild: bestBuild,
        originalScores: baseEval.scores,
        newScores: bestEval.scores,
        scoreDelta: {
            gaming: round2(bestEval.scores.gaming - baseEval.scores.gaming),
            futureProof: round2(bestEval.scores.futureProof - baseEval.scores.futureProof),
            workstation: round2(bestEval.scores.workstation - baseEval.scores.workstation),
            overall: round2(bestEval.scores.overall - baseEval.scores.overall),
        },
        priceDelta: round2(bestEval.totalPrice - baseEval.totalPrice),
    };
}

function evaluateBuild(buildInput: BuildInput) {
    const engine = runEngineV12(buildInput, "premium");
    const cpuProdScore = getProductivityScoreSafe(buildInput?.cpu);
    const gpuProdScore = getProductivityScoreSafe(buildInput?.activeGpu ?? buildInput?.gpu);

    const workstation = Math.round(
        Math.max(0, Math.min((0.5 * (cpuProdScore / 10)) + (0.5 * (gpuProdScore / 10)), 100))
    );

    const scores: ScoreSnapshot = {
        gaming: round2(engine.metrics.performanceScore),
        futureProof: round2(engine.metrics.futureProofScore),
        workstation: round2(workstation),
        overall: round2((engine.metrics.performanceScore * 0.5) + (engine.metrics.futureProofScore * 0.3) + (workstation * 0.2)),
    };

    const totalPrice = getTotalPrice(buildInput);
    const providedWattage = engine.power.providedWattage || 0;
    const headroomPercent = providedWattage > 0
        ? ((providedWattage - engine.power.totalTDP) / providedWattage) * 100
        : 0;

    return {
        scores,
        totalPrice,
        headroomPercent,
        bottleneck: engine.bottleneck.percentage || 0,
        isCompatible: engine.compatibility.isValid,
    };
}

function passesConstraints(
    evaluated: ReturnType<typeof evaluateBuild>,
    constraints: OptimizationConstraints
) {
    return (
        evaluated.totalPrice >= constraints.minBudget &&
        evaluated.totalPrice <= constraints.maxBudget &&
        evaluated.isCompatible &&
        evaluated.headroomPercent > 20 &&
        evaluated.bottleneck < 15
    );
}

function getCandidatesForCategory(
    category: BuildCategory,
    build: BuildInput,
    catalog?: OptimizationConstraints["catalog"]
) {
    const current = getCategoryComponent(build, category);
    const pool = catalog?.[category] || [];
    const combined = current ? [current, ...pool] : [...pool];

    const seen = new Set<string>();
    const unique = combined.filter((item) => {
        const id = item?.id ? String(item.id) : "";
        if (!id || seen.has(id)) return false;
        seen.add(id);
        return true;
    });

    // Keep search bounded for deterministic and fast route execution.
    return unique
        .sort((a, b) => componentRank(b, category) - componentRank(a, category))
        .slice(0, 24);
}

function applyCandidate(build: BuildInput, category: BuildCategory, candidate: any): BuildInput {
    const next = cloneBuild(build);

    if (category === "storage") {
        next.storage = candidate;
        return next;
    }

    (next as any)[category] = candidate;
    if (category === "gpu") {
        next.activeGpu = candidate;
    }
    return next;
}

function getCategoryComponent(build: BuildInput, category: BuildCategory) {
    if (category === "storage") {
        return Array.isArray(build.storage) ? build.storage[0] : build.storage;
    }
    return (build as any)[category] ?? null;
}

function getTotalPrice(buildInput: BuildInput) {
    const storage = Array.isArray(buildInput.storage) ? buildInput.storage[0] : buildInput.storage;
    return round2(
        getMinPrice(buildInput.cpu) +
        getMinPrice(buildInput.gpu) +
        getMinPrice(buildInput.motherboard) +
        getMinPrice(buildInput.ram) +
        getMinPrice(storage) +
        getMinPrice(buildInput.psu)
    );
}

function componentRank(component: any, category: BuildCategory) {
    const gaming = getGamingScoreSafe(component);
    const productivity = getProductivityScoreSafe(component);
    const price = getMinPrice(component) || 1;

    if (category === "psu") {
        const wattage = Number(component?.wattage || 0);
        return (wattage * 0.7) - (price * 0.001);
    }

    if (category === "motherboard") {
        const ramSlots = Number(component?.ramSlots || 0);
        const ddr5Bonus = String(component?.memoryType || "").toUpperCase() === "DDR5" ? 20 : 0;
        return (ramSlots * 5) + ddr5Bonus - (price * 0.001);
    }

    if (category === "storage") {
        const capacity = Number(component?.capacityGB || 0);
        const nvmeBonus = String(component?.type || "").toUpperCase() === "NVME" ? 50 : 0;
        return ((capacity / price) * 100) + nvmeBonus;
    }

    return (gaming * 0.7) + (productivity * 0.3) - (price * 0.001);
}

function cloneBuild(buildInput: BuildInput): BuildInput {
    return {
        cpu: buildInput.cpu ?? null,
        gpu: buildInput.gpu ?? null,
        activeGpu: buildInput.activeGpu ?? buildInput.gpu ?? null,
        motherboard: buildInput.motherboard ?? null,
        ram: buildInput.ram ?? null,
        storage: Array.isArray(buildInput.storage) ? [...buildInput.storage] : (buildInput.storage ?? null),
        psu: buildInput.psu ?? null,
    };
}

function round2(value: number) {
    return Math.round(value * 100) / 100;
}
