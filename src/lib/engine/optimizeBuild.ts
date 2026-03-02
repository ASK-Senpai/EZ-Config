import { analyzeBuild, type BuildAnalysis } from "./analyzeBuild";
import type { BuildInput } from "./compatibility";
import { getGamingScoreSafe } from "./scoring";
import { getMinPrice } from "@/lib/utils/pricingV2";

export type Dataset = {
    cpus: any[];
    gpus: any[];
    motherboards: any[];
    rams: any[];
    storages: any[];
    psus: any[];
};

export type EngineAnalysis = BuildAnalysis;

export type OptimizationResult = {
    optimizedBuild: BuildInput;
    originalScores: EngineAnalysis;
    newScores: EngineAnalysis;
    scoreDelta: number;
    priceDelta: number;
};

type Candidate = {
    build: BuildInput;
    analysis: EngineAnalysis;
    weightedScore: number;
    totalPrice: number;
};

const MAX_CANDIDATES = 5000;

export async function optimizeBuild(
    originalBuild: BuildInput,
    dataset: Dataset,
    constraints: {
        minBudget: number;
        maxBudget: number;
    }
): Promise<OptimizationResult> {
    const normalizedOriginal = normalizeBuild(originalBuild);
    const originalAnalysis = analyzeBuild(normalizedOriginal, "premium");
    const originalWeighted = computeWeightedScore(originalAnalysis);
    const originalPrice = getBuildPrice(normalizedOriginal);

    const gpuCandidates = filterGpus(dataset.gpus, constraints);
    const cpuCandidates = filterCpus(dataset.cpus, constraints);
    const candidates: Candidate[] = [];

    outerGpu:
    for (const gpu of gpuCandidates) {
        for (const cpu of cpuCandidates) {
            if (isExtremeImbalance(cpu, gpu)) continue;

            const motherboards = getCompatibleMotherboards(dataset.motherboards, cpu);
            for (const motherboard of motherboards) {
                const ramOptions = getTopRamOptions(dataset.rams, motherboard, 2);
                const storageOptions = getTopStorageOptions(dataset.storages, 2);
                const psuOptions = getPsuOptions(dataset.psus, cpu, gpu, constraints.maxBudget);

                for (const ram of ramOptions) {
                    for (const storage of storageOptions) {
                        for (const psu of psuOptions) {
                            const build: BuildInput = normalizeBuild({
                                cpu,
                                gpu,
                                activeGpu: gpu,
                                motherboard,
                                ram,
                                storage,
                                psu,
                            });

                            const analysis = analyzeBuild(build, "premium");
                            if (!passesHardConstraints(build, analysis, constraints)) continue;

                            const weightedScore = computeWeightedScore(analysis);
                            const totalPrice = getBuildPrice(build);

                            candidates.push({ build, analysis, weightedScore, totalPrice });
                            if (candidates.length >= MAX_CANDIDATES) {
                                break outerGpu;
                            }
                        }
                    }
                }
            }
        }
    }

    const pruned = pruneDominated(candidates);
    const sorted = pruned.sort((a, b) =>
        b.weightedScore - a.weightedScore || a.totalPrice - b.totalPrice
    );

    const best = sorted.find((candidate) => candidate.weightedScore > originalWeighted) || sorted[0];

    if (!best) {
        return {
            optimizedBuild: normalizedOriginal,
            originalScores: originalAnalysis,
            newScores: originalAnalysis,
            scoreDelta: 0,
            priceDelta: 0,
        };
    }

    return {
        optimizedBuild: best.build,
        originalScores: originalAnalysis,
        newScores: best.analysis,
        scoreDelta: round2(best.weightedScore - originalWeighted),
        priceDelta: round2(best.totalPrice - originalPrice),
    };
}

export function computeWeightedScore(analysis: EngineAnalysis): number {
    const gamingScore = Number(analysis.scores?.gaming || 0);
    const futureProofScore = Number(analysis.scores?.futureProof || 0);
    const workstationScore = Number(analysis.scores?.workstation || 0);
    const bottleneckPercentage = Number(analysis.bottleneck?.percentage || 0);

    const score =
        (0.5 * gamingScore) +
        (0.3 * futureProofScore) +
        (0.2 * workstationScore) -
        (0.1 * (bottleneckPercentage / 100));

    return round2(score);
}

export function passesHardConstraints(
    build: BuildInput,
    analysis: EngineAnalysis,
    constraints: { minBudget: number; maxBudget: number }
): boolean {
    const totalPrice = getBuildPrice(build);
    const isValid = (analysis as any).validation?.valid ?? analysis.compatibility?.isValid ?? false;
    const headroom = (analysis as any).power?.headroom ?? analysis.power?.headroomPercent ?? 0;
    const bottleneck = Number(analysis.bottleneck?.percentage || 0);

    return (
        totalPrice >= constraints.minBudget &&
        totalPrice <= constraints.maxBudget &&
        isValid === true &&
        headroom >= 25 &&
        bottleneck < 15
    );
}

function filterGpus(gpus: any[], constraints: { minBudget: number; maxBudget: number }) {
    const min = constraints.minBudget * 0.25;
    const max = constraints.maxBudget * 0.6;
    return [...gpus]
        .filter((gpu) => inRange(getMinPrice(gpu), min, max))
        .sort((a, b) =>
            getGamingScoreSafe(b) - getGamingScoreSafe(a) ||
            getMinPrice(a) - getMinPrice(b)
        );
}

function filterCpus(cpus: any[], constraints: { minBudget: number; maxBudget: number }) {
    const min = constraints.minBudget * 0.15;
    const max = constraints.maxBudget * 0.4;
    return [...cpus]
        .filter((cpu) => inRange(getMinPrice(cpu), min, max))
        .sort((a, b) =>
            getGamingScoreSafe(b) - getGamingScoreSafe(a) ||
            getMinPrice(a) - getMinPrice(b)
        );
}

function isExtremeImbalance(cpu: any, gpu: any) {
    const cpuScore = getGamingScoreSafe(cpu);
    const gpuScore = getGamingScoreSafe(gpu);
    if (!cpuScore || !gpuScore) return true;
    const ratio = gpuScore / cpuScore;
    return ratio < 0.55 || ratio > 1.85;
}

function getCompatibleMotherboards(motherboards: any[], cpu: any) {
    const socket = cpu?.socket;
    const filtered = socket
        ? motherboards.filter((mobo) => !mobo?.socket || mobo.socket === socket)
        : motherboards;

    return [...filtered].sort((a, b) => getMinPrice(a) - getMinPrice(b)).slice(0, 16);
}

function getTopRamOptions(rams: any[], motherboard: any, maxCount: number) {
    const moboRamType = motherboard?.memoryType || motherboard?.ramType || motherboard?.supportedRamType;
    const compatible = rams.filter((ram) => !moboRamType || !ram?.type || ram.type === moboRamType);

    return [...compatible]
        .sort((a, b) => ramValueScore(b) - ramValueScore(a))
        .slice(0, maxCount);
}

function getTopStorageOptions(storages: any[], maxCount: number) {
    return [...storages]
        .sort((a, b) => storageValueScore(b) - storageValueScore(a))
        .slice(0, maxCount);
}

function getPsuOptions(psus: any[], cpu: any, gpu: any, maxBudget: number) {
    const cpuTdp = Number(cpu?.tdpWatts ?? cpu?.tdp ?? 0);
    const gpuTdp = Number(gpu?.tdpWatts ?? gpu?.tdp ?? 0);
    const requiredWattage = cpuTdp + gpuTdp + 100;
    const recommendedWattage = requiredWattage * 1.25;

    return [...psus]
        .filter((psu) => {
            const wattage = Number(psu?.wattage || 0);
            const price = getMinPrice(psu);
            return wattage >= recommendedWattage && price > 0 && price <= maxBudget;
        })
        .sort((a, b) => Number(a?.wattage || 0) - Number(b?.wattage || 0) || getMinPrice(a) - getMinPrice(b))
        .slice(0, 6);
}

function pruneDominated(candidates: Candidate[]) {
    const sorted = [...candidates].sort((a, b) => a.totalPrice - b.totalPrice || b.weightedScore - a.weightedScore);
    const kept: Candidate[] = [];
    let bestScoreSeen = -Infinity;

    for (const candidate of sorted) {
        if (candidate.weightedScore <= bestScoreSeen) {
            continue;
        }
        kept.push(candidate);
        bestScoreSeen = candidate.weightedScore;
    }
    return kept;
}

function ramValueScore(ram: any) {
    const capacity = Number(ram?.capacityGB || 0);
    const speed = Number(ram?.speedMHz || 0);
    const price = getMinPrice(ram) || 1;
    return ((capacity * 0.7) + (speed / 100)) / price;
}

function storageValueScore(storage: any) {
    const capacity = Number(storage?.capacityGB || 0);
    const nvmeBonus = String(storage?.type || "").toUpperCase() === "NVME" ? 100 : 0;
    const price = getMinPrice(storage) || 1;
    return (capacity + nvmeBonus) / price;
}

function getBuildPrice(build: BuildInput) {
    const storage = Array.isArray(build.storage) ? build.storage[0] : build.storage;
    return round2(
        getMinPrice(build.cpu) +
        getMinPrice(build.gpu) +
        getMinPrice(build.motherboard) +
        getMinPrice(build.ram) +
        getMinPrice(storage) +
        getMinPrice(build.psu)
    );
}

function normalizeBuild(build: BuildInput): BuildInput {
    const storage = Array.isArray(build.storage) ? build.storage[0] : build.storage;
    return {
        cpu: build.cpu ?? null,
        gpu: build.gpu ?? null,
        activeGpu: build.activeGpu ?? build.gpu ?? null,
        motherboard: build.motherboard ?? null,
        ram: build.ram ?? null,
        storage: storage ?? null,
        psu: build.psu ?? null,
    };
}

function inRange(value: number, min: number, max: number) {
    return value >= min && value <= max;
}

function round2(value: number) {
    return Math.round(value * 100) / 100;
}
