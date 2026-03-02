import { validateStructure } from "@/server/ai/validateStructure";
import { validateNumbers } from "@/server/ai/validateNumbers";

export function validateReportOutput(aiOutput: any, inputPayload: any) {
    const forbiddenPhrases = [
        "not explicitly stated",
        "based on provided",
        "assumed",
        "likely around",
        "approximately",
    ];

    const stringified = JSON.stringify(aiOutput).toLowerCase();

    for (const phrase of forbiddenPhrases) {
        if (stringified.includes(phrase)) {
            throw new Error("AI output contains forbidden filler phrase.");
        }
    }

    validateStructure(aiOutput, inputPayload);
    validateNumbers(aiOutput, inputPayload);
}
