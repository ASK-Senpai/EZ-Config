type ReportContext = {
    cpu?: { name?: string };
    gpu?: { name?: string };
    ram?: { capacityGB?: number };
    storage?: { capacityGB?: number };
    psu?: { wattage?: number };
};

function normalizeText(value: string) {
    return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function extractModelMentions(text: string) {
    const patterns = [
        /\brtx\s?\d{3,4}\s?(ti|super)?\b/gi,
        /\bgtx\s?\d{3,4}\b/gi,
        /\brx\s?\d{3,4}\s?(xt|x|m)?\b/gi,
        /\barc\s?a?\d{3,4}\b/gi,
        /\bquadro\s?\w+\b/gi,
        /\btesla\s?\w+\b/gi,
        /\bthreadripper\s?\d{4,5}\b/gi,
        /\bryzen\s?\d{3,4}\s?(x|g|xt)?\b/gi,
        /\bcore\s?i[3579]-\d{4,5}[a-z]{0,2}\b/gi,
        /\bxeon\s?\w+\b/gi,
    ];

    const matches = new Set<string>();
    for (const pattern of patterns) {
        const found = text.match(pattern);
        if (found) {
            for (const item of found) {
                matches.add(item.toLowerCase());
            }
        }
    }
    return Array.from(matches);
}

export function validateStructure(aiOutput: any, context: ReportContext) {
    const outputText = normalizeText(JSON.stringify(aiOutput));
    const cpuName = normalizeText(context?.cpu?.name || "");
    const gpuName = normalizeText(context?.gpu?.name || "");

    const modelMentions = extractModelMentions(outputText);
    for (const mention of modelMentions) {
        const cpuAllowed = cpuName && cpuName.includes(mention);
        const gpuAllowed = gpuName && gpuName.includes(mention);
        if (!cpuAllowed && !gpuAllowed) {
            throw new Error(`AI referenced foreign hardware model: ${mention}`);
        }
    }

    const forbiddenSources = [
        "userbenchmark",
        "passmark",
        "3dmark",
        "techpowerup",
        "tomshardware",
        "anandtech",
        "gamersnexus",
    ];
    for (const source of forbiddenSources) {
        if (outputText.includes(source)) {
            throw new Error("AI referenced external benchmark sources.");
        }
    }
}
