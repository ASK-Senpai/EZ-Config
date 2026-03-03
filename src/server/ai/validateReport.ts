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
            throw new Error(`AI output contains forbidden filler phrase: "${phrase}"`);
        }
    }

    validateStructure(aiOutput, {
        cpu: inputPayload.cpu,
        gpu: inputPayload.gpu,
        motherboard: inputPayload.motherboard,
        ram: inputPayload.ram,
        storage: inputPayload.storage,
        psu: inputPayload.psu,
    });

    validateNumbers(aiOutput, inputPayload);
}

