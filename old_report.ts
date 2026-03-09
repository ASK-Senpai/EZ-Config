import Groq from "groq-sdk";
import { validateReportOutput } from "@/server/ai/validateReport";

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY!,
});

const SYSTEM_PROMPT_STRING = `You are a senior PC hardware analyst.

Rules:
1. You must NEVER invent numeric specifications not provided in input.
2. You must NEVER fabricate benchmark results.
3. You must NEVER cite external sources or databases.
4. You must NEVER state exact FPS unless provided.
5. You may infer generation and tier from model naming.
6. If a numeric value is not provided, describe capability qualitatively.
7. Do not repeat input text.
8. Do not use markdown.
9. Output strict valid JSON only.`;

export async function generateTechnicalReport(structuredBuildPayloadString: string) {
    let structuredInputPayload: any;
    try {
        structuredInputPayload = JSON.parse(structuredBuildPayloadString);
    } catch {
        throw new Error("Invalid structured build payload.");
    }

    const completion = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        temperature: 0.65,
        max_tokens: 4096,
        response_format: { type: "json_object" },
        messages: [
            {
                role: "system",
                content: SYSTEM_PROMPT_STRING,
            },
            {
                role: "user",
                content: structuredBuildPayloadString,
            },
        ],
    });

    const content = completion.choices[0]?.message?.content || "";

    let parsed;
    try {
        parsed = JSON.parse(content);
    } catch {
        throw new Error("AI did not return valid JSON.");
    }

    try {
        validateReportOutput(parsed, structuredInputPayload);
        return parsed;
    } catch {
        console.warn("Validation failed. Retrying strict mode.");

        const retry = await groq.chat.completions.create({
            model: "llama-3.3-70b-versatile",
            temperature: 0.3,
            max_tokens: 4096,
            response_format: { type: "json_object" },
            messages: [
                {
                    role: "system",
                    content: `${SYSTEM_PROMPT_STRING} You introduced invalid numeric values. Remove any numeric values not present in input.`,
                },
                {
                    role: "user",
                    content: structuredBuildPayloadString,
                },
            ],
        });

        const retryContent = retry.choices[0]?.message?.content || "";

        let retryParsed: any;
        try {
            retryParsed = JSON.parse(retryContent);
        } catch {
            throw new Error("AI did not return valid JSON.");
        }

        validateReportOutput(retryParsed, structuredInputPayload);
        return retryParsed;
    }
}
