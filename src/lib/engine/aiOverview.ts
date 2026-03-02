// src/lib/engine/aiOverview.ts
// Rule-based mini overview (free tier) + Groq/OpenAI full overview (premium tier)

import type { DetailedFPS } from "./fpsEngine";

interface MiniOverviewInput {
    tier: string;
    performanceScore: number;
    bottleneck: { severity: string; direction: string; percentage: number };
    headroomPercent: number;
    totalPrice: number;
    fps: DetailedFPS;
    riskFlags: string[];
    suggestions: string[];
}

/**
 * Rule-based AI overview for free tier.
 * Generates a 3-4 sentence summary based on build analysis.
 */
export function generateMiniOverview(input: MiniOverviewInput): string {
    const lines: string[] = [];

    // Performance tier sentence
    const tierDescriptions: Record<string, string> = {
        "Entry": "an entry-level system suitable for esports titles and light productivity",
        "Mid": "a mid-range build capable of smooth 1080p gaming and everyday tasks",
        "High": "a high-performance rig that handles 1440p gaming and content creation with ease",
        "Enthusiast": "an enthusiast-grade powerhouse ready for 4K gaming and heavy workloads",
    };
    const tierDesc = tierDescriptions[input.tier] || "a capable system";
    lines.push(`This is ${tierDesc}, scoring ${input.performanceScore}/100 in our gaming performance benchmark.`);

    // FPS headline
    const fps1080 = input.fps["1080p"]?.high || 0;
    if (fps1080 > 0) {
        const fps4k = input.fps["4K"]?.high || 0;
        lines.push(`Expect around ${fps1080} FPS at 1080p High and ${fps4k} FPS at 4K High in modern AAA titles.`);
    }

    // Bottleneck sentence
    if (input.bottleneck.severity === "high") {
        lines.push(
            `⚠️ There is a significant ${input.bottleneck.direction.toLowerCase()} (${input.bottleneck.percentage}% imbalance) — consider upgrading the weaker component for better balance.`
        );
    } else if (input.bottleneck.severity === "moderate") {
        lines.push(
            `There is a mild ${input.bottleneck.direction.toLowerCase()}, but it shouldn't noticeably impact most workloads.`
        );
    } else {
        lines.push("The CPU and GPU are well-balanced for this configuration.");
    }

    // PSU/Risk
    if (input.headroomPercent < 15 && input.headroomPercent > 0) {
        lines.push(`Power supply headroom is tight at ${input.headroomPercent}% — a higher wattage PSU would improve long-term stability.`);
    }

    // Upgrade tip
    if (input.suggestions.length > 0) {
        lines.push(input.suggestions[0]);
    }

    return lines.join(" ");
}

/**
 * Full AI overview prompt for premium tier (Groq/OpenAI).
 * Returns a structured prompt string — caller handles API call.
 */
export function buildFullOverviewPrompt(components: Record<string, any>, analysisData: any): string {
    return `You are a PC hardware expert writing a detailed, friendly build analysis.

Components:
- CPU: ${components.cpu?.name || "Not selected"}
- GPU: ${components.gpu?.name || "Not selected"}
- Motherboard: ${components.motherboard?.name || "Not selected"}
- RAM: ${components.ram?.name || "Not selected"} (${components.ram?.capacityGB || "?"}GB ${components.ram?.type || ""})
- Storage: ${components.storage?.name || "Not selected"}
- PSU: ${components.psu?.name || "Not selected"} (${components.psu?.wattage || "?"}W)

Analysis Data:
- Gaming Score: ${analysisData.scores?.gaming}/100
- Workstation Score: ${analysisData.scores?.workstation}/100
- Future-Proof Score: ${analysisData.scores?.futureProof}/100
- Tier: ${analysisData.scores?.tier}
- Bottleneck: ${analysisData.bottleneck?.direction} (${analysisData.bottleneck?.percentage}%)
- 1080p High FPS: ~${analysisData.fps?.["1080p"]?.high || "N/A"}
- 4K High FPS: ~${analysisData.fps?.["4K"]?.high || "N/A"}
- PSU Headroom: ${analysisData.power?.headroomPercent}%
- Total Price: ₹${analysisData.totalPrice?.toLocaleString("en-IN") || "N/A"}

Write a 3-5 paragraph analysis covering:
1. Overall gaming suitability and expected experience
2. Content creation / productivity viability
3. Longevity estimate (how many years this build stays relevant)
4. Upgrade path recommendations with timeline
5. Value-for-money assessment and efficiency summary

Keep the tone professional but approachable. Use specific numbers from the data.
Do NOT use markdown headers. Write flowing paragraphs.`;
}
