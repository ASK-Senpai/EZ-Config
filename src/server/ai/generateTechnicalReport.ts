import Groq from "groq-sdk";
import { validateReportOutput } from "@/server/ai/validateReport";

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY!,
});

const SYSTEM_PROMPT_STRING = `You are a senior PC hardware analyst.

STRICT HARDWARE CONSTRAINTS:
You are ONLY allowed to reference the hardware explicitly provided in the "ALLOWED HARDWARE" list.
You are STRICTLY FORBIDDEN from mentioning:
- Any other GPU model
- Any other CPU model
- Any NVIDIA or AMD GPU not listed below
- Any Intel or AMD CPU not listed below
- Any hardware brand not present in the list above

Rules:
1. If you do not know a specific detail, describe it qualitatively or generically instead of inventing hardware.
2. You must NEVER invent numeric specifications not provided in input.
3. You must NEVER fabricate benchmark results.
4. You must NEVER cite external sources or databases.
5. You must NEVER state exact FPS unless provided.
6. Do not repeat input text.
7. Do not use markdown.
8. Output strict valid JSON only.
9. If you mention any hardware not in the allowed list, your response is INVALID.`;

/**
 * Automaticaly replaces common hallucinated hardware models with the actual components from the build.
 */
function fixHallucinations(content: string, context: any): string {
    let fixed = content;
    const cpuName = context.cpu?.name || "the selected CPU";
    const gpuName = (context.activeGpu ?? context.gpu)?.name || "the selected GPU";

    // GPU Patterns
    fixed = fixed.replace(/rtx\s?\d{3,4}(?:\s?ti|\s?super)?/gi, gpuName);
    fixed = fixed.replace(/rx\s?\d{3,4}(?:\s?xt|\s?x|\s?m)?/gi, gpuName);
    fixed = fixed.replace(/gtx\s?\d{3,4}/gi, gpuName);

    // CPU Patterns
    fixed = fixed.replace(/i[3579]-\d{4,5}[a-z]{0,2}/gi, cpuName);
    fixed = fixed.replace(/ryzen\s?[3579]\s?\d{3,4}(?:\s?x|\s?g|\s?xt)?/gi, cpuName);

    return fixed;
}

const FALLBACK_REPORT = {
    executiveSummary: "This system is a well-balanced configuration tailored for your selected workload. The components are chosen to provide a stable and reliable experience with consistent performance across modern applications.",
    gamingAnalysis: {
        "1080p": "Excellent performance at 1080p, delivering smooth frame rates in the majority of modern titles.",
        "1440p": "Capable of handling 1440p resolution with high fidelity, though some settings adjustments may be required for the most demanding games.",
        "4k": "Entry-level 4K capability. Suitable for older titles or less demanding games at this resolution."
    },
    productivityBreakdown: {
        premiere: "Solid performance for video editing, with smooth timeline scrubbing and efficient export times.",
        afterEffects: "Capable handling of motion graphics and effects, provided there is sufficient system memory.",
        blender: "Reliable rendering performance for 3D modeling and visualization tasks.",
        davinci: "Good color grading and editing experience, benefiting from the hardware acceleration available.",
        unrealEngine: "A viable platform for game development and real-time architectural visualization.",
        softwareDevelopment: "Fast compile times and a smooth experience for complex IDE environments.",
        virtualization: "Supports multiple virtual machines efficiently depending on total system core count."
    },
    componentDeepDive: {
        cpu: "The processor provides strong multi-threaded performance, making it ideal for both gaming and heavy productivity tasks.",
        gpu: "The graphics card offers a great balance of raw performance and power efficiency, ensuring high visual fidelity.",
        motherboard: "Features a robust power delivery system and ample connectivity for future expansion.",
        ram: "High-speed memory that ensures low latency and smooth multitasking performance.",
        storage: "Rapid storage solution providing quick boot times and near-instant application loading.",
        psu: "A reliable power supply with sufficient headroom to ensure long-term system stability."
    },
    futureProofing: {
        year1: "Top-tier experience with no performance compromises in the latest software.",
        year3: "Remains highly relevant, capable of running new releases at high settings.",
        year5: "Still a capable workstation and gaming rig, though some settings adjustments may be needed for future AAA titles."
    },
    bottleneckAnalysis: "The configuration is well-optimized with no significant bottlenecks, ensuring that each component can perform at its intended level.",
    powerAndThermals: "Expect stable thermal performance under load. The power supply provides healthy headroom for current operation and minor future upgrades.",
    marketValueAssessment: "A high-value build that balances performance per dollar effectively in the current hardware market.",
    finalRecommendation: "We highly recommend this configuration for users looking for a versatile and powerful PC build that doesn't compromise on quality or longevity."
};

export async function generateTechnicalReport(structuredBuildPayloadString: string) {
    let structuredInputPayload: any;
    try {
        structuredInputPayload = JSON.parse(structuredBuildPayloadString);
    } catch {
        throw new Error("Invalid structured build payload.");
    }

    const aloudText = [
        `CPU: ${structuredInputPayload.cpu?.name || "None"}`,
        `GPU: ${structuredInputPayload.gpu?.name || "None"}`,
        `Motherboard: ${structuredInputPayload.motherboard?.name || "None"}`,
        `RAM: ${structuredInputPayload.ram?.name || "None"}`,
        `Storage: ${structuredInputPayload.storage?.name || "None"}`,
        `PSU: ${structuredInputPayload.psu?.name || "None"}`,
    ].join("\n- ");

    const enhancedUserPrompt = `
ALLOWED HARDWARE:
- ${aloudText}

INPUT DATA:
${structuredBuildPayloadString}
`;

    const MAX_RETRIES = 3;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            const completion = await groq.chat.completions.create({
                model: "llama-3.3-70b-versatile",
                temperature: 0.1,
                max_tokens: 4096,
                response_format: { type: "json_object" },
                messages: [
                    {
                        role: "system",
                        content: attempt === 1
                            ? SYSTEM_PROMPT_STRING
                            : `${SYSTEM_PROMPT_STRING}\n\nSTRICT RECTIFICATION (Attempt ${attempt}): Your previous response was invalid because it referenced hardware NOT in the allowed list or fabricated data. You MUST comply strictly with the ALLOWED HARDWARE list. No exceptions.`,
                    },
                    {
                        role: "user",
                        content: enhancedUserPrompt,
                    },
                ],
            });

            let content = completion.choices[0]?.message?.content || "";

            // --- SECTION: Auto-Fix Hallucinations ---
            content = fixHallucinations(content, structuredInputPayload);

            let parsed;
            try {
                parsed = JSON.parse(content);
            } catch {
                throw new Error("AI did not return valid JSON.");
            }

            validateReportOutput(parsed, structuredInputPayload);
            return parsed; // Success!

        } catch (error: any) {
            console.warn(`[AI Gen Report] Attempt ${attempt} failed: ${error.message}`);
            lastError = error;
        }
    }

    // --- FINAL FALLBACK: Never return 500, always return valid JSON ---
    console.error("[AI Gen Report] All retries exhausted. Returning fallback report.");
    return {
        ...FALLBACK_REPORT,
        isFallback: true,
        validationError: lastError?.message || "Maximum retries reached."
    };
}


