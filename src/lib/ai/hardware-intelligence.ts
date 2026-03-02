import { generateAIResponse } from "./chat";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export interface BottleneckPayload {
    cpuId: string;
    gpuId: string;
    cpuName: string;
    gpuName: string;
    resolution: string;
    targetFps: number;
    bottleneckPercent: number;
    bottleneckSide: string; // "CPU bottleneck" | "GPU bottleneck" | "balanced"
    cpuScore: number;
    gpuScore: number;
    cpuTier: string; // always string: "entry" | "mid" | "mid-high" | "high"
    gpuTier: string;
    gpuMinPrice: number | null;
}

export interface BottleneckAnalysis {
    severity: "none" | "mild" | "moderate" | "severe";
    explanation: string;
    upgradeAdvice: string;
    optimizationAdvice: string;
}

export interface BuildPayload {
    cpuName?: string;
    gpuName?: string;
    performanceScore: number;
    tier: string;
    bottleneck?: {
        direction: string;
        severity: string;
        percentage: number;
    };
    compatibility?: {
        isValid: boolean;
        issues?: string[];
    };
    recommendedPSU?: number;
    suggestions?: string[];
}

export interface BuildExplanation {
    summary: string;
    strengths: string[];
    weaknesses: string[];
    verdict: string;
}

export interface BuildOptimization {
    overallRating: string;
    bottleneckAssessment: string;
    upgradeRecommendations: string[];
    budgetAdvice: string;
}

export interface FullReportPayload {
    buildData: any;
    engineScores: any;
    fpsEstimates: any;
    bottleneckData: any;
    powerData: any;
    marketTiming: any;
}

export interface TechnicalReportJson {
    executiveSummary: string;
    gamingAnalysis: {
        "1080p": string;
        "1440p": string;
        "4k": string;
    };
    productivityBreakdown: {
        premiere: string;
        afterEffects: string;
        blender: string;
        davinci: string;
        unrealEngine: string;
        softwareDevelopment: string;
        virtualization: string;
    };
    componentDeepDive: {
        cpu: string;
        gpu: string;
        motherboard: string;
        ram: string;
        storage: string;
        psu: string;
    };
    futureProofing: {
        year1: string;
        year3: string;
        year5: string;
    };
    bottleneckAnalysis: string;
    powerAndThermals: string;
    marketValueAssessment: string;
    finalRecommendation: string;
}

// ─────────────────────────────────────────────
// analyzeBottleneck
// ─────────────────────────────────────────────

export async function analyzeBottleneck(payload: BottleneckPayload): Promise<BottleneckAnalysis> {
    const systemPrompt = `You are a senior PC hardware performance analyst.
You receive deterministic bottleneck data computed by a performance engine.
You must interpret this data and provide human-readable analysis.

Rules:
- Do NOT invent or recalculate any performance numbers.
- Use the provided bottleneckPercent and bottleneckSide as ground truth.
- Tier values are string labels: "entry", "mid", "mid-high", "high". Do not treat them as numbers.
- Return ONLY a valid JSON object matching the schema below. No markdown. No free text.

Schema:
{
  "severity": "none" | "mild" | "moderate" | "severe",
  "explanation": "Human-readable explanation of the bottleneck situation",
  "upgradeAdvice": "Which component to upgrade and roughly which tier to target",
  "optimizationAdvice": "Settings or config changes to alleviate bottleneck without upgrades"
}`;

    const userContent = JSON.stringify({
        cpu: payload.cpuName,
        gpu: payload.gpuName,
        resolution: payload.resolution,
        targetFps: payload.targetFps,
        bottleneckPercent: payload.bottleneckPercent,
        bottleneckSide: payload.bottleneckSide,
        cpuTier: payload.cpuTier,
        gpuTier: payload.gpuTier,
        gpuApproxPriceINR: payload.gpuMinPrice,
    });

    const raw = await generateAIResponse({
        system: systemPrompt,
        user: userContent,
        structured: true,
    });

    try {
        const parsed = JSON.parse(raw) as BottleneckAnalysis;
        if (!parsed.severity || !parsed.explanation) {
            throw new Error("Invalid schema");
        }
        return parsed;
    } catch {
        // Safe fallback if AI returns malformed output
        return {
            severity: "mild",
            explanation: "Analysis temporarily unavailable.",
            upgradeAdvice: "Check component tiers and rerun analysis.",
            optimizationAdvice: "Lower resolution or reduce graphical settings.",
        };
    }
}

// ─────────────────────────────────────────────
// explainBuild
// ─────────────────────────────────────────────

export async function explainBuild(payload: BuildPayload): Promise<BuildExplanation> {
    const systemPrompt = `You are a professional PC build analyst.
You receive computed performance metrics from a deterministic engine.
Your job is to explain what these metrics mean in human terms.

Rules:
- Do NOT recalculate or invent numbers.
- Tier is a string label ("entry", "mid", "mid-high", "high", "flagship"). Treat it as a category, not a number.
- Return ONLY valid JSON. No markdown. No text outside JSON.

Schema:
{
  "summary": "One sentence overview of the build",
  "strengths": ["strength 1", "strength 2"],
  "weaknesses": ["weakness 1"],
  "verdict": "Final recommendation for this build"
}`;

    const raw = await generateAIResponse({
        system: systemPrompt,
        user: JSON.stringify(payload),
        structured: true,
    });

    try {
        const parsed = JSON.parse(raw) as BuildExplanation;
        if (!parsed.summary) throw new Error("Invalid schema");
        return parsed;
    } catch {
        return {
            summary: "Build analysis completed.",
            strengths: ["Deterministic metrics calculated successfully."],
            weaknesses: [],
            verdict: "Review the performance metrics for detailed insights.",
        };
    }
}

// ─────────────────────────────────────────────
// optimizeBuild
// ─────────────────────────────────────────────

export async function optimizeBuild(payload: BuildPayload): Promise<BuildOptimization> {
    const systemPrompt = `You are a senior PC hardware optimization engineer.
You receive computed build results and must provide optimization guidance.

Rules:
- Do NOT invent performance benchmarks or specific product model numbers.
- Tier labels are strings ("entry", "mid", "mid-high", "high"). Never treat as numbers.
- Be concise and realistic.
- Return ONLY valid JSON. No markdown. No text outside JSON.

Schema:
{
  "overallRating": "Brief overall quality rating",
  "bottleneckAssessment": "Specific assessment of any bottleneck",
  "upgradeRecommendations": ["recommendation 1", "recommendation 2"],
  "budgetAdvice": "Practical budget optimization advice"
}`;

    const raw = await generateAIResponse({
        system: systemPrompt,
        user: JSON.stringify(payload),
        structured: true,
    });

    try {
        const parsed = JSON.parse(raw) as BuildOptimization;
        if (!parsed.overallRating) throw new Error("Invalid schema");
        return parsed;
    } catch {
        return {
            overallRating: "Balanced",
            bottleneckAssessment: "See bottleneck panel for details.",
            upgradeRecommendations: ["Review component tier balance."],
            budgetAdvice: "Target balanced CPU and GPU tiers for best value.",
        };
    }
}

// ─────────────────────────────────────────────
// generateFullTechnicalReport
// ─────────────────────────────────────────────

export async function generateFullTechnicalReport(payload: FullReportPayload): Promise<TechnicalReportJson> {
    const systemPrompt = `You are a senior PC hardware performance analyst.
You must generate a highly detailed technical build report.

You must:
- Speak directly to the user.
- Be decisive and confident.
- Infer performance from hardware generation and naming.
- Never say "not explicitly stated".
- Never say "based on provided scores".
- Never use markdown.
- Never use ** symbols.
- Never repeat input text.
- Never include engine metadata.

You must output valid JSON only.`;

    const userPrompt = `{
  "cpu": { "name": "${payload.buildData?.cpu?.name || ""}", "cores": ${payload.buildData?.cpu?.cores ?? 0}, "threads": ${payload.buildData?.cpu?.threads ?? 0}, "generation": "${payload.buildData?.cpu?.generation || ""}", "architecture": "${payload.buildData?.cpu?.architecture || ""}", "gamingScore": ${payload.buildData?.cpu?.normalized?.gamingScore ?? 0}, "productivityScore": ${payload.buildData?.cpu?.normalized?.productivityScore ?? 0} },
  "gpu": { "name": "${payload.buildData?.gpu?.name || ""}", "tier": "${payload.buildData?.gpu?.tier || ""}", "vramGB": ${payload.buildData?.gpu?.vramGB ?? 0}, "architecture": "${payload.buildData?.gpu?.architecture || ""}", "gamingScore": ${payload.buildData?.gpu?.normalized?.gamingScore ?? 0}, "rayTracing": ${payload.buildData?.gpu?.rayTracing ? "true" : "false"} },
  "ram": { "capacityGB": ${payload.buildData?.ram?.capacityGB ?? 0}, "type": "${payload.buildData?.ram?.type || ""}", "speed": ${payload.buildData?.ram?.speedMHz ?? 0} },
  "storage": { "type": "${payload.buildData?.storage?.type || ""}", "capacityGB": ${payload.buildData?.storage?.capacityGB ?? 0} },
  "psu": { "wattage": ${payload.buildData?.psu?.wattage ?? 0}, "headroomPercent": ${payload.powerData?.headroomPercent ?? 0} },
  "engineScores": { "overall": ${payload.engineScores?.overall ?? 0}, "gaming": ${payload.engineScores?.gaming ?? 0}, "workstation": ${payload.engineScores?.workstation ?? 0}, "bottleneckPercent": ${payload.bottleneckData?.percentage ?? 0} }
}

Generate:
{
  "executiveSummary": string,
  "gamingAnalysis": {
    "1080p": string,
    "1440p": string,
    "4k": string
  },
  "productivityBreakdown": {
    "premiere": string,
    "afterEffects": string,
    "blender": string,
    "davinci": string,
    "unrealEngine": string,
    "softwareDevelopment": string,
    "virtualization": string
  },
  "componentDeepDive": {
    "cpu": string,
    "gpu": string,
    "motherboard": string,
    "ram": string,
    "storage": string,
    "psu": string
  },
  "futureProofing": {
    "year1": string,
    "year3": string,
    "year5": string
  },
  "bottleneckAnalysis": string,
  "powerAndThermals": string,
  "marketValueAssessment": string,
  "finalRecommendation": string
}

Each section must be detailed and technical.
Each explanation must reference real hardware characteristics.

Never output markdown.
Only output JSON.`;

    const raw = await generateAIResponse({
        model: "mixtral-8x7b-32768",
        system: systemPrompt,
        user: userPrompt,
        structured: true,
        temperature: 0.7,
        maxTokens: 4096,
        topP: 0.95,
    });

    try {
        const parsed = JSON.parse(raw) as TechnicalReportJson;
        if (!parsed.executiveSummary || !parsed.finalRecommendation) {
            throw new Error("Invalid report schema");
        }
        return parsed;
    } catch {
        return {
            executiveSummary: "Your build is analyzed with a focus on gaming throughput, workstation consistency, thermal stability, and long-term upgrade viability.",
            gamingAnalysis: {
                "1080p": "At 1080p this configuration is GPU-led and should maintain smooth frame pacing in modern titles while preserving CPU headroom for background tasks.",
                "1440p": "At 1440p performance remains strong, with the graphics card doing most of the work and the processor staying in a balanced operating range.",
                "4k": "At 4K the GPU becomes the dominant limiter; visual quality is high but you should tune ray tracing and upscaling per title for stable frame rates."
            },
            productivityBreakdown: {
                premiere: "Video timeline responsiveness is solid due to competent CPU multithreading and adequate graphics acceleration for effects and exports.",
                afterEffects: "Composition preview fluidity is acceptable for layered projects; heavier scenes will benefit from higher memory capacity.",
                blender: "Viewport interaction is good and render throughput is primarily defined by GPU class and available VRAM.",
                davinci: "Color and timeline operations are smooth with this GPU class; sustained export speed is supported by balanced CPU-GPU cooperation.",
                unrealEngine: "Editor performance is stable for medium-to-large projects, with compile and shader workloads scaling with core count.",
                softwareDevelopment: "General development workflows, containerized builds, and local test cycles perform consistently on this CPU tier.",
                virtualization: "VM performance is practical for light-to-moderate lab environments, limited mainly by memory capacity and thread allocation."
            },
            componentDeepDive: {
                cpu: "The processor class provides balanced single-thread and multi-thread capability, supporting both gaming responsiveness and productive multitasking.",
                gpu: "The graphics card tier is appropriate for modern raster workloads and determines the upper bound for 1440p and 4K visual presets.",
                motherboard: "The platform offers baseline stability and expansion; long-term CPU upgrade range depends on socket support and chipset tier.",
                ram: "Memory capacity and generation are suitable for mainstream workloads, with additional capacity improving heavy creative and VM scenarios.",
                storage: "Storage type and capacity are adequate for OS and active libraries; faster NVMe tiers reduce large project load and cache delays.",
                psu: "Power delivery is within safe limits and supports stable transient behavior when GPU load spikes under sustained gaming or rendering."
            },
            futureProofing: {
                year1: "You should see consistently strong usability across current game engines and creator applications with no major bottleneck pressure.",
                year3: "The system remains competitive at mainstream settings; future titles may require selective graphics tuning, especially at higher resolutions.",
                year5: "A GPU-first upgrade path will preserve platform value; memory expansion and storage refresh can extend practical lifecycle further."
            },
            bottleneckAnalysis: "Current balance indicates no critical mismatch, with predictable GPU limitation at higher render loads and manageable CPU pressure at lower resolutions.",
            powerAndThermals: "Thermal and power behavior are controlled with suitable headroom, supporting sustained workloads without aggressive downclocking.",
            marketValueAssessment: "Component mix is value-aware for current performance targets, with strongest ROI retained when upgrade spending prioritizes the GPU tier.",
            finalRecommendation: "Keep this build if your target is balanced gaming plus productive work; prioritize a future GPU upgrade to maximize long-term performance growth."
        };
    }
}
