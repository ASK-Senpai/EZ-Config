/**
 * applyIntelCPUV1.ts
 * Injects Intel CPU data (V2 schema — availableSkus) into Firestore.
 * Path: components/cpu/items
 *
 * Schema: availableSkus[], CpuSku with integratedGraphicsId (doc ID reference)
 *
 * Run AFTER injectVgpu.ts (vGPU docs must exist before CPU injection references them).
 *
 *
 * Usage:
 *   npx tsx scripts/applyIntelCPUV1.ts
 *   npx tsx scripts/applyIntelCPUV1.ts --dry-run
 */

import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import * as path from "path";
import * as fs from "fs";
import * as dotenv from "dotenv";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

if (!process.env.FIREBASE_PROJECT_ID) {
    console.error("\n❌ FIREBASE_PROJECT_ID not set.\n");
    process.exit(1);
}

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
const DRY_RUN = false;    // Set to false to actually write to DBs("--dry-run");
const COLLECTION = db.collection("components").doc("cpu").collection("items");
const BATCH_SIZE = 20;

// ── V2 Schema types ───────────────────────────────────────────────────────────
interface CpuSkuEntry {
    sku: string;
    suffix: string;
    hasIntegratedGraphics: boolean;
    integratedGraphicsId: string | null;   // stable vGPU doc ID
    pricing?: {
        currency: string;
        priceRange: { min: number | null; max: number | null };
        availability: string;
        source: string;
        lastUpdated?: string;
    };
}

interface IntelCpuEntry {
    id: string;
    category: string;
    brand: string;
    name: string;
    generation: string;
    launchYear: number;
    socket: string;
    cores: number;
    threads: number;
    baseClockGHz: number;
    boostClockGHz: number;
    tdpWatts: number;
    msrpUSD?: number;
    normalized: { gamingScore: number; productivityScore: number; scoreVersion: number };
    availableSkus: CpuSkuEntry[];
    integratedGraphicsIds?: string[]; // added for reverse vGPU lookup
    legacy: boolean;
    updatedAt?: string;
}

const dataPath = path.resolve(process.cwd(), "data/cpu/intel.json");
const cpus: IntelCpuEntry[] = JSON.parse(fs.readFileSync(dataPath, "utf-8"));

async function run() {
    console.log(`\n🚀 Intel CPU Injection V2 — ${cpus.length} CPUs`);
    if (DRY_RUN) console.log("  🔍 DRY RUN — no writes\n");

    let updated = 0, skipped = 0, failed = 0;

    for (let i = 0; i < cpus.length; i += BATCH_SIZE) {
        const chunk = cpus.slice(i, i + BATCH_SIZE);
        const batch = db.batch();

        for (const cpu of chunk) {
            try {
                const docRef = COLLECTION.doc(cpu.id);

                // Canonical pricing = first in-stock SKU with a price, or first SKU
                const canonicalSku = cpu.availableSkus?.find(
                    (s) => s.pricing?.priceRange?.min != null
                ) ?? cpu.availableSkus?.[0];

                // Extract unique, non-null integratedGraphicsIds from SKUs
                const igpuIdsSet = new Set<string>();
                if (cpu.availableSkus) {
                    for (const sku of cpu.availableSkus) {
                        if (sku.integratedGraphicsId) {
                            igpuIdsSet.add(sku.integratedGraphicsId);
                        }
                    }
                }
                const integratedGraphicsIds = Array.from(igpuIdsSet);

                const payload: Record<string, unknown> = {
                    id: cpu.id,
                    category: "cpu",
                    brand: cpu.brand,
                    name: cpu.name,
                    nameLowercase: cpu.name.toLowerCase(),
                    generation: cpu.generation,
                    launchYear: cpu.launchYear,
                    socket: cpu.socket,
                    cores: cpu.cores,
                    threads: cpu.threads,
                    baseClockGHz: cpu.baseClockGHz,
                    boostClockGHz: cpu.boostClockGHz,
                    tdpWatts: cpu.tdpWatts,
                    msrpUSD: cpu.msrpUSD ?? null,
                    normalized: {
                        gamingScore: cpu.normalized.gamingScore,
                        productivityScore: cpu.normalized.productivityScore,
                    },
                    scoreVersion: cpu.normalized.scoreVersion,
                    // SKU list — contains integratedGraphicsId (never duplicated at root)
                    availableSkus: cpu.availableSkus ?? [],
                    // Flat array of iGPU doc IDs used by this CPU (for fast reverse lookups)
                    integratedGraphicsIds,
                    hasIntegratedGraphics: integratedGraphicsIds.length > 0,
                    // Price surface: cheapest available SKU for product listing / Algolia
                    pricing: canonicalSku?.pricing ?? null,
                    legacy: cpu.legacy,
                    updatedAt: cpu.updatedAt ?? new Date().toISOString(),
                };

                const minPrice = canonicalSku?.pricing?.priceRange?.min;
                if (minPrice && cpu.normalized?.gamingScore) {
                    payload.metrics = {
                        valueScore: Math.round((cpu.normalized.gamingScore / minPrice) * 100) / 100
                    };
                }

                if (!DRY_RUN) {
                    batch.set(docRef, payload, { merge: true });
                }
                console.log(`  ${DRY_RUN ? "🔍 DRY" : "✅ QUEUE"} ${cpu.id}`);
                updated++;
            } catch (err) {
                console.error(`  ❌ FAIL ${cpu.id}:`, err);
                failed++;
            }
        }

        if (!DRY_RUN) {
            await batch.commit();
            console.log(`  🔄 Batch committed (${Math.min(i + BATCH_SIZE, cpus.length)}/${cpus.length})\n`);
        }
    }

    console.log("══════════════════════════════");
    console.log(`✅ Updated:  ${updated}`);
    console.log(`⏭ Skipped:  ${skipped}`);
    console.log(`❌ Failed:   ${failed}`);
    console.log("══════════════════════════════\n");
}

run().catch(console.error);
