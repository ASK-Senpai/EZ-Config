type ReportContext = {
    cpu?: { tdp?: number; cores?: number; threads?: number; name?: string };
    gpu?: { tdp?: number; vramGB?: number; name?: string };
    ram?: { capacityGB?: number };
    storage?: { capacityGB?: number };
    psu?: { wattage?: number };
    engineScores?: { performanceScore?: number; bottleneckPercent?: number; totalTDP?: number; recommendedPSU?: number };
};

const numericDomains = [
    { name: "percentage", min: 0, max: 100 },
    { name: "fps", min: 0, max: 400 },
    { name: "wattage", min: 0, max: 2000 },
    { name: "years", min: 2000, max: 2035 },
    { name: "ramCapacity", min: 1, max: 256 },
    { name: "storageCapacity", min: 1, max: 20000 },
    { name: "performanceScore", min: 0, max: 100 },
];

function isWithinAnyDomain(value: number) {
    return numericDomains.some((domain) => value >= domain.min && value <= domain.max);
}

function collectAnchors(context: ReportContext): number[] {
    const anchors: Array<number> = [];
    const pushIfNumber = (value?: number) => {
        if (typeof value === "number" && Number.isFinite(value)) anchors.push(value);
    };

    pushIfNumber(context?.cpu?.tdp);
    pushIfNumber(context?.gpu?.tdp);
    pushIfNumber(context?.cpu?.cores);
    pushIfNumber(context?.cpu?.threads);
    pushIfNumber(context?.ram?.capacityGB);
    pushIfNumber(context?.gpu?.vramGB);
    pushIfNumber(context?.psu?.wattage);

    pushIfNumber(context?.engineScores?.performanceScore);
    pushIfNumber(context?.engineScores?.bottleneckPercent);
    pushIfNumber(context?.engineScores?.totalTDP);
    pushIfNumber(context?.engineScores?.recommendedPSU);

    return anchors;
}

function isAllowedByAnchors(value: number, anchors: number[]) {
    for (const allowed of anchors) {
        const tolerance = Math.max(Math.abs(allowed) * 0.1, 5);
        if (Math.abs(value - allowed) <= tolerance) {
            return true;
        }
    }
    return false;
}

export function validateNumbers(aiOutput: any, context: ReportContext) {
    const anchors = collectAnchors(context);
    const text = JSON.stringify(aiOutput);
    const matches = text.match(/-?\d+(?:\.\d+)?/g);
    if (!matches) return;

    for (const match of matches) {
        const value = Number(match);
        if (!Number.isFinite(value)) continue;
        if (isAllowedByAnchors(value, anchors)) continue;
        if (isWithinAnyDomain(value)) continue;
        throw new Error("AI hallucinated numeric value.");
    }
}
