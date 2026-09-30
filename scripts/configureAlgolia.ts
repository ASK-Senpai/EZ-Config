/**
 * configureAlgolia.ts
 * Configures the base index ("products_index") settings, facet filters,
 * replicas, and custom sorting rankings in Algolia.
 *
 * Run: npx tsx scripts/configureAlgolia.ts
 */

import { algoliasearch } from "algoliasearch";
import * as path from "path";
import * as dotenv from "dotenv";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const required = ["NEXT_PUBLIC_ALGOLIA_APP_ID", "ALGOLIA_ADMIN_KEY"];
for (const key of required) {
    if (!process.env[key]) {
        console.error(`\n❌ Missing env var: ${key}\n`);
        process.exit(1);
    }
}

const client = algoliasearch(
    process.env.NEXT_PUBLIC_ALGOLIA_APP_ID!,
    process.env.ALGOLIA_ADMIN_KEY!
);

const BASE_INDEX = "products_index";

const REPLICAS = [
    "products_index_gaming_desc",
    "products_index_gaming_asc",
    "products_index_productivity_desc",
    "products_index_productivity_asc",
    "products_index_price_asc",
    "products_index_price_desc",
    "products_index_value_desc",
    "products_index_year_desc",
];

const REPLICA_RANKINGS: Record<string, string[]> = {
    "products_index_gaming_desc": ["desc(normalized.gamingScore)"],
    "products_index_gaming_asc": ["asc(normalized.gamingScore)"],
    "products_index_productivity_desc": ["desc(normalized.productivityScore)"],
    "products_index_productivity_asc": ["asc(normalized.productivityScore)"],
    "products_index_price_asc": ["asc(pricing.priceRange.min)"],
    "products_index_price_desc": ["desc(pricing.priceRange.min)"],
    "products_index_value_desc": ["desc(metrics.valueScore)"],
    "products_index_year_desc": ["desc(launchYear)"],
};

async function main() {
    console.log(`\n⚙️  Configuring Algolia Primary Index: "${BASE_INDEX}"...\n`);

    // 1. Configure base index settings & attach replicas
    const baseSettingsTask = await client.setSettings({
        indexName: BASE_INDEX,
        indexSettings: {
            searchableAttributes: [
                "name",
                "nameLowercase",
                "brand",
                "category",
                "socket",
                "chipset",
                "type"
            ],
            attributesForFaceting: [
                "filterOnly(legacy)",
                "filterOnly(category)",
                "filterOnly(brand)",
                "filterOnly(socket)",
                "filterOnly(type)",
                "filterOnly(chipset)",
                "filterOnly(efficiency)",
                "filterOnly(hasIntegratedGraphics)",
                "filterOnly(wattage)"
            ],
            customRanking: [
                "desc(normalized.gamingScore)",
                "desc(normalized.productivityScore)"
            ],
            replicas: REPLICAS,
        },
    });

    console.log(`⏳ Waiting for base index settings task (${baseSettingsTask.taskID})...`);
    await client.waitForTask({ indexName: BASE_INDEX, taskID: baseSettingsTask.taskID });
    console.log(`✅ Base index "${BASE_INDEX}" configured with facets and replicas.\n`);

    // 2. Configure customRanking on each replica index
    console.log("⚙️  Configuring sorting rankings on replica indices...");
    for (const [replicaName, customRanking] of Object.entries(REPLICA_RANKINGS)) {
        const replicaTask = await client.setSettings({
            indexName: replicaName,
            indexSettings: {
                customRanking,
            },
        });
        console.log(`  ✅ Configured ${replicaName} -> customRanking: ${JSON.stringify(customRanking)}`);
    }

    console.log("\n🎉 Algolia configuration complete! Now you can run:");
    console.log("   npx tsx scripts/syncToAlgolia.ts\n");
}

main().catch((err) => {
    console.error("Configuration error:", err);
    process.exit(1);
});
