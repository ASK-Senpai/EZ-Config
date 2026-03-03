type ReportContext = {
    cpu?: { name?: string };
    gpu?: { name?: string };
    motherboard?: { name?: string };
    ram?: { name?: string };
    storage?: { name?: string };
    psu?: { name?: string };
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
        // Common Mobo/PSU/RAM patterns to broaden detection
        /\b(rog|strix|tuf|aorus|mag|mpg|meg|taichi|phantom|velocita|proart)\b/gi,
        /\b(corsair|g\.?skill|kingston|crucial|teamgroup|trident|vengeance|dominator)\b/gi,
        /\b(evga|seasonic|be\s?quiet|thermaltake|cooler\s?master|deepcool|nzxt)\b/gi,
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
    const allowedNames = [
        normalizeText(context?.cpu?.name || ""),
        normalizeText(context?.gpu?.name || ""),
        normalizeText(context?.motherboard?.name || ""),
        normalizeText(context?.ram?.name || ""),
        normalizeText(context?.storage?.name || ""),
        normalizeText(context?.psu?.name || ""),
    ].filter(Boolean);

    const modelMentions = extractModelMentions(outputText);
    for (const mention of modelMentions) {
        const isAllowed = allowedNames.some(name => name.includes(mention));
        if (!isAllowed) {
            throw new Error(`AI referenced foreign hardware model or brand: ${mention}`);
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

