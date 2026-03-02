import { groq } from "./groq";

export const DEFAULT_MODEL = "llama-3.3-70b-versatile";

export async function generateAIResponse({
    model = DEFAULT_MODEL,
    system,
    user,
    structured = false,
    maxTokens = 1200,
    temperature = 0.3,
    topP = 0.9,
}: {
    model?: string;
    system: string;
    user: string;
    structured?: boolean;
    maxTokens?: number;
    temperature?: number;
    topP?: number;
}) {
    const finalSystemPrompt = structured
        ? `${system}\n\nRespond strictly in JSON. No commentary.`
        : system;

    const response = await groq.chat.completions.create({
        model,
        messages: [
            { role: "system", content: finalSystemPrompt },
            { role: "user", content: user },
        ],
        temperature,
        top_p: topP,
        max_tokens: maxTokens,
        response_format: structured ? { type: "json_object" } : { type: "text" },
    });

    return response.choices[0]?.message?.content ?? "";
}
