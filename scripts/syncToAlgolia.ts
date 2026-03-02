/**
 * syncToAlgolia.ts
 * Pushes all non-legacy Firestore product documents to Algolia.
 * Run after any bulk data injection or price update.
 *
 * Run: npx tsx scripts/syncToAlgolia.ts
 */

import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { algoliasearch } from "algoliasearch";
import * as path from "path";
import * as dotenv from "dotenv";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

// ── Validate env ──────────────────────────────────────────────────────────────
const required = ["FIREBASE_PROJECT_ID", "ALGOLIA_ADMIN_KEY", "NEXT_PUBLIC_ALGOLIA_APP_ID"];
for (const key of required) {
    if (!process.env[key]) {
        console.error(`\n❌ Missing env var: ${key}\n`);
        process.exit(1);
    }
}

// ── Firebase Admin ────────────────────────────────────────────────────────────
if (!getApps().length) {
    initializeApp({
        credential: cert({
            projectId: process.env.FIREBASE_PROJECT_ID!,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
            privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
        }),
    });
}
const db = getFirestore();

// ── Algolia Admin Client ──────────────────────────────────────────────────────
const algolia = algoliasearch(
    process.env.NEXT_PUBLIC_ALGOLIA_APP_ID!,
    process.env.ALGOLIA_ADMIN_KEY!
);
const INDEX = "products_index";

// ── Categories to sync ────────────────────────────────────────────────────────
const CATEGORIES = ["gpu", "cpu", "vgpu", "motherboard", "ram", "storage", "psu"];


interface AlgoliaObject extends Record<string, unknown> {
    objectID: string;
    id: string;
    category: string;
    name: string;
    nameLowercase: string;
    brand: string;
    legacy: boolean;
    launchYear?: number;
    normalized?: { gamingScore: number; productivityScore: number };
    scoreVersion?: number;
    hasIntegratedGraphics?: boolean;
    metrics?: {
        valueScore?: number;
    };
    pricing?: {
        currency: string;
        priceRange: { min: number | null; max: number | null };
        availability: string;
        source?: string | null;
    };
    tdpWatts?: number;
    msrpUSD?: number;
    tier?: string | number;
    updatedAt?: string;
    socket?: string;
    chipset?: any;
    formFactor?: string;
    memoryType?: string;
    ramSlots?: number;
    wifi?: boolean;
    type?: string;
    // Storage
    capacityGB?: number;
    pcieGen?: number;
    modules?: number;
    speedMHz?: number;
    // PSU
    wattage?: number;
    efficiency?: string;
    modular?: string;
}

async function syncCategory(category: string): Promise<{ synced: number; deleted: number }> {
    const col = db.collection("components").doc(category).collection("items");
    const snapshot = await col.get();

    console.log(`\n📦 ${category.toUpperCase()} — ${snapshot.size} documents`);

    const toIndex: AlgoliaObject[] = [];
    const toDelete: string[] = [];

    for (const doc of snapshot.docs) {
        const d = doc.data();

        if (d.legacy === true) {
            // Remove from Algolia if legacy
            toDelete.push(`${category}_${doc.id}`);
            continue;
        }

        const algoliaObj: AlgoliaObject = {
            objectID: `${category}_${doc.id}`,
            id: doc.id,
            category,
            name: d.name ?? "",
            nameLowercase: (d.name ?? "").toLowerCase(),
            brand: d.brand ?? "",
            legacy: false,
            launchYear: d.launchYear,
            normalized: d.normalized,
            scoreVersion: d.scoreVersion,
            hasIntegratedGraphics: d.hasIntegratedGraphics,
            metrics: d.metrics,
            pricing: d.pricing
                ? {
                    currency: d.pricing.currency ?? "INR",
                    priceRange: d.pricing.priceRange ?? { min: null, max: null },
                    availability: d.pricing.availability ?? "",
                    source: d.pricing.source ?? null,
                }
                : undefined,
            tdpWatts: d.tdpWatts,
            msrpUSD: d.msrpUSD,
            tier: d.tier,
            socket: d.socket,
            chipset: d.chipset,
            formFactor: d.formFactor,
            memoryType: d.memoryType,
            ramSlots: d.ramSlots,
            wifi: d.wifi,
            type: d.type,
            capacityGB: d.capacityGB,
            modules: d.modules,
            speedMHz: d.speedMHz,
        };

        // Storage fields
        if (category === "storage") {
            algoliaObj.type = d.type;
            algoliaObj.capacityGB = d.capacityGB;
            algoliaObj.pcieGen = d.pcieGen;
        }

        // PSU fields
        if (category === "psu") {
            algoliaObj.wattage = d.wattage;
            algoliaObj.efficiency = d.efficiency;
            algoliaObj.modular = d.modular;
            algoliaObj.formFactor = d.formFactor;
        }

        toIndex.push(algoliaObj);
    }

    let synced = 0;
    let deleted = 0;

    // Batch save (Algolia handles chunking internally)
    if (toIndex.length > 0) {
        await algolia.saveObjects({ indexName: INDEX, objects: toIndex });
        toIndex.forEach((o) => console.log(`  ✅ ${o.objectID}`));
        synced = toIndex.length;
    }

    // Delete legacy documents from index
    if (toDelete.length > 0) {
        await algolia.deleteObjects({ indexName: INDEX, objectIDs: toDelete });
        toDelete.forEach((id) => console.log(`  🗑  DELETED ${id}`));
        deleted = toDelete.length;
    }

    return { synced, deleted };
}

async function run() {
    console.log(`\n🚀 Algolia Sync → index: "${INDEX}"\n`);

    // Clear index first to prevent ghost entries from documents deleted in Firestore
    console.log(`🧹 Clearing index: "${INDEX}"...`);
    await algolia.clearObjects({ indexName: INDEX });
    console.log("✅ Index cleared.\n");

    let totalSynced = 0;
    let totalDeleted = 0;

    for (const category of CATEGORIES) {
        const { synced, deleted } = await syncCategory(category);
        totalSynced += synced;
        totalDeleted += deleted;
    }

    console.log("\n══════════════════════════════");
    console.log(`✅ Synced:   ${totalSynced}`);
    console.log(`🗑  Deleted:  ${totalDeleted}`);
    console.log("══════════════════════════════\n");
    console.log("🔗 View index: https://dashboard.algolia.com\n");
}

run().catch(console.error);
