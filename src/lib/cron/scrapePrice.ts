import * as cheerio from "cheerio";

const STORE_URL = "https://mdcomputers.in/search?search=";

export interface ScrapeResult {
    price: number | null;
    matched: boolean;
}

/**
 * Fetch a product search page from mdcomputers.in and extract the first listed price.
 * Returns null if no price found or if the request fails.
 */
export async function scrapePrice(query: string): Promise<ScrapeResult> {
    try {
        const url = `${STORE_URL}${encodeURIComponent(query)}`;
        const res = await fetch(url, {
            headers: {
                "User-Agent": "Mozilla/5.0 (compatible; EZConfig-PriceBot/1.0)",
                "Accept": "text/html,application/xhtml+xml",
            },
            signal: AbortSignal.timeout(8000),
        });

        if (!res.ok) return { price: null, matched: false };

        const html = await res.text();
        const $ = cheerio.load(html);

        // mdcomputers.in shows product price in .price class elements
        const priceText = $(".price").first().text().trim()
            || $("[class*='price']").first().text().trim();

        if (!priceText) return { price: null, matched: false };

        // Strip currency symbols, commas, whitespace and parse
        const cleaned = priceText.replace(/[^\d.]/g, "");
        const price = parseFloat(cleaned);

        if (isNaN(price) || price <= 0) return { price: null, matched: false };

        return { price, matched: true };
    } catch {
        return { price: null, matched: false };
    }
}
