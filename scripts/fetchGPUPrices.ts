import fs from "fs";
import path from "path";
import * as cheerio from "cheerio";

// Utility to sleep between requests
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

interface ScrapeResult {
    price: number | null;
    source: string | null;
}

/**
 * Clean scraped price text into a pure number securely
 * Reject outrageous strings (like phone numbers)
 */
function parsePrice(text: string): number | null {
    if (!text) return null;
    const cleaned = text.replace(/[^\d.]/g, "");
    const val = parseFloat(cleaned);
    // GPUs are generally between ₹4,000 and ₹4,00,000. 
    // This rejects garbage phone numbers like 1900014420.
    if (!isNaN(val) && val >= 2000 && val <= 500000) {
        return val;
    }
    return null;
}

/**
 * Scrape MDComputers (OpenCart)
 */
async function scrapeMD(query: string): Promise<number | null> {
    try {
        const url = `https://mdcomputers.in/search?search=${encodeURIComponent(query)}`;
        const res = await fetch(url, {
            headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0" },
            signal: AbortSignal.timeout(8000),
        });
        if (!res.ok) return null;

        const html = await res.text();
        const $ = cheerio.load(html);
        // Target the specific product card price to avoid site-wide header elements
        const priceText = $(".product-item .price-new").first().text().trim() ||
            $(".product-item .price").first().text().trim();
        return parsePrice(priceText);
    } catch {
        return null;
    }
}

/**
 * Scrape Vedant Computers (OpenCart)
 */
async function scrapeVedant(query: string): Promise<number | null> {
    try {
        const url = `https://www.vedantcomputers.com/index.php?route=product/search&search=${encodeURIComponent(query)}`;
        const res = await fetch(url, {
            headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0" },
            signal: AbortSignal.timeout(8000),
        });
        if (!res.ok) return null;

        const html = await res.text();
        const $ = cheerio.load(html);
        const priceText = $(".product-thumb .price-new").first().text().trim() ||
            $(".product-thumb .price").first().text().trim();
        return parsePrice(priceText);
    } catch {
        return null;
    }
}

/**
 * Scrape PrimeABGB (WooCommerce / Custom)
 */
async function scrapePrimeABGB(query: string): Promise<number | null> {
    try {
        const url = `https://www.primeabgb.com/?post_type=product&s=${encodeURIComponent(query)}`;
        const res = await fetch(url, {
            headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0" },
            signal: AbortSignal.timeout(8000),
        });
        if (!res.ok) return null;

        const html = await res.text();
        const $ = cheerio.load(html);
        const priceText = $(".product .price .amount").first().text().trim() ||
            $(".product .price").first().text().trim();
        return parsePrice(priceText);
    } catch {
        return null;
    }
}

/**
 * Scrape Amazon India
 */
async function scrapeAmazon(query: string): Promise<number | null> {
    try {
        const url = `https://www.amazon.in/s?k=${encodeURIComponent(query)}`;
        const res = await fetch(url, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0",
                "Accept-Language": "en-IN,en;q=0.9",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8"
            },
            signal: AbortSignal.timeout(8000),
        });
        if (!res.ok) return null;

        const html = await res.text();
        const $ = cheerio.load(html);
        const priceText = $(".a-price-whole").first().text().trim();
        return parsePrice(priceText);
    } catch {
        return null;
    }
}

/**
 * Cascading price resolution
 */
async function getBestPrice(query: string): Promise<ScrapeResult> {
    const md = await scrapeMD(query);
    if (md) return { price: md, source: "mdcomputers.in" };

    const vedant = await scrapeVedant(query);
    if (vedant) return { price: vedant, source: "vedantcomputers.com" };

    const prime = await scrapePrimeABGB(query);
    if (prime) return { price: prime, source: "primeabgb.com" };

    const amz = await scrapeAmazon(query);
    if (amz) return { price: amz, source: "amazon.in" };

    return { price: null, source: null };
}

async function fetchPrices() {
    console.log("Starting GPU Price Fetcher (JSON -> JSON)...\n");

    const gpuDir = path.join(process.cwd(), "data", "gpu");
    const outputFile = path.join(process.cwd(), "data", "gpu_pricing.json");

    let files: string[] = [];
    try {
        files = fs.readdirSync(gpuDir).filter(f => f.endsWith(".json"));
    } catch (e: any) {
        console.error("Could not read /data/gpu directory:", e.message);
        process.exit(1);
    }

    const compiledPricing: Record<string, { name: string, price: number, source: string, msrpUSD: number }> = {};

    // Resume capability: load existing output if we crashed
    if (fs.existsSync(outputFile)) {
        console.log("Found existing gpu_pricing.json. Resuming...\n");
        const existing = JSON.parse(fs.readFileSync(outputFile, "utf-8"));
        Object.assign(compiledPricing, existing);
    }

    let totalProcessed = 0;

    for (const file of files) {
        const filePath = path.join(gpuDir, file);
        let data: any;

        try {
            data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
        } catch {
            continue;
        }

        const models = data.models || [];
        for (const model of models) {
            totalProcessed++;

            if (compiledPricing[model.id]) {
                // Skip if we already successfully priced this in a previous crashed run
                continue;
            }

            const queryName = model.name;
            await delay(2000); // 2 second limit

            try {
                const result = await getBestPrice(queryName);
                if (result.price && result.source) {
                    compiledPricing[model.id] = {
                        name: queryName,
                        price: result.price,
                        source: result.source,
                        msrpUSD: model.msrpUSD || 0
                    };
                    console.log(`[SUCCESS] ₹${result.price.toLocaleString("en-IN")} mapped to ${model.id}`);

                    // Continually save progress safely
                    fs.writeFileSync(outputFile, JSON.stringify(compiledPricing, null, 2));
                } else {
                    console.log(`[MISS] No price found for: ${queryName}`);
                }
            } catch (e) {
                console.log(`[ERROR] Crawl crashed for ${model.id} - Skipping...`);
            }
        }
    }

    console.log("\n========================================================");
    console.log(`DONE. Priced ${Object.keys(compiledPricing).length} out of ${totalProcessed} GPUs.`);
    console.log(`Results saved to data/gpu_pricing.json`);
    console.log("========================================================");
}

fetchPrices().catch(e => {
    console.error("Critical Failure:", e.message);
    process.exit(1);
});
