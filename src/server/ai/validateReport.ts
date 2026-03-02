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

    const allowedNumbers = new Set<number>();

    function extractNumbers(obj: any) {
        if (typeof obj === "number" && Number.isFinite(obj)) {
            allowedNumbers.add(obj);
            return;
        }

        if (Array.isArray(obj)) {
            for (const item of obj) extractNumbers(item);
            return;
        }

        if (typeof obj === "object" && obj !== null) {
            for (const value of Object.values(obj)) {
                extractNumbers(value);
            }
        }
    }

    extractNumbers(inputPayload);

    function checkNumber(value: number) {
        if (!allowedNumbers.has(value)) {
            throw new Error("AI hallucinated numeric value.");
        }
    }

    function scanStringForUnexpectedNumbers(text: string) {
        const matches = text.match(/-?\d+(?:\.\d+)?/g);
        if (!matches) return;

        for (const match of matches) {
            const parsed = Number(match);
            if (!Number.isFinite(parsed)) continue;
            checkNumber(parsed);
        }
    }

    function scanForUnexpectedNumbers(obj: any) {
        if (typeof obj === "number" && Number.isFinite(obj)) {
            checkNumber(obj);
            return;
        }

        if (typeof obj === "string") {
            scanStringForUnexpectedNumbers(obj);
            return;
        }

        if (Array.isArray(obj)) {
            for (const item of obj) scanForUnexpectedNumbers(item);
            return;
        }

        if (typeof obj === "object" && obj !== null) {
            for (const value of Object.values(obj)) {
                scanForUnexpectedNumbers(value);
            }
        }
    }

    scanForUnexpectedNumbers(aiOutput);
}
