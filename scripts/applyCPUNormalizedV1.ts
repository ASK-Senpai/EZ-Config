/**
 * applyCPUNormalizedV1.ts
 * Injects AMD CPU data (normalized scores + pricing + legacy) into Firestore.
 * Reads data/cpu/amd.json — the single source of truth for CPU V1 data.
 *
 * Run: npx tsx scripts/applyCPUNormalizedV1.ts
 */

import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import * as path from "path";
import * as fs from "fs";
import * as dotenv from "dotenv";

// Load env from project root
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

if (!process.env.FIREBASE_PROJECT_ID) {
    console.error("\n❌ FIREBASE_PROJECT_ID is not set. Check your .env file.\n");
    process.exit(1);
}

// Init Firebase Admin
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

// Load CPU dataset
const dataPath = path.resolve(process.cwd(), "data/cpu/amd.json");
const cpus: Array<{
    id: string;
    name: string;
    brand: string;
    generation: string;
    launchYear: number;
    legacy: boolean;
    socket: string;
    cores: number;
    threads: number;
    baseClockGHz: number;
    boostClockGHz: number;
    tdpWatts: number;
    msrpUSD: number;
    normalized: { gamingScore: number; productivityScore: number; scoreVersion: number };
    pricing: {
        currency: string;
        priceRange: { min: number; max: number };
        availability: string;
        source: string;
        lastUpdated: string;
    };
}> = JSON.parse(fs.readFileSync(dataPath, "utf-8"));

const BATCH_SIZE = 20;
const COLLECTION = db.collection("components").doc("cpu").collection("items");

async function run() {
    console.log(`\n📦 CPU Normalization Injection (V1) — ${cpus.length} CPUs\n`);

    let updated = 0;
    let skipped = 0;
    let failed = 0;

    for (let i = 0; i < cpus.length; i += BATCH_SIZE) {
        const batch = db.batch();
        const chunk = cpus.slice(i, i + BATCH_SIZE);

        for (const cpu of chunk) {
            try {
                const docRef = COLLECTION.doc(cpu.id);
                const existing = await docRef.get();

                if (existing.exists) {
                    const d = existing.data()!;
                    // Skip if already V1 with matching scores
                    if (
                        d.scoreVersion === 1 &&
                        d.normalized?.gamingScore === cpu.normalized.gamingScore &&
                        d.normalized?.productivityScore === cpu.normalized.productivityScore
                    ) {
                        console.log(`  ⏭ SKIP ${cpu.id} (already V1, values match)`);
                        skipped++;
                        continue;
                    }
                }

                // Write full CPU document (merge: true preserves fields we don't touch)
                batch.set(docRef, {
                    id: cpu.id,
                    name: cpu.name,
                    brand: cpu.brand,
                    generation: cpu.generation,
                    launchYear: cpu.launchYear,
                    legacy: cpu.legacy,
                    socket: cpu.socket,
                    cores: cpu.cores,
                    threads: cpu.threads,
                    baseClockGHz: cpu.baseClockGHz,
                    boostClockGHz: cpu.boostClockGHz,
                    tdpWatts: cpu.tdpWatts,
                    msrpUSD: cpu.msrpUSD,
                    normalized: {
                        gamingScore: cpu.normalized.gamingScore,
                        productivityScore: cpu.normalized.productivityScore,
                    },
                    scoreVersion: 1,
                    pricing: cpu.pricing,
                    updatedAt: FieldValue.serverTimestamp(),
                }, { merge: true });

                console.log(`  ✅ QUEUE ${cpu.id}`);
                updated++;
            } catch (err) {
                console.error(`  ❌ FAIL ${cpu.id}:`, err);
                failed++;
            }
        }

        try {
            await batch.commit();
            console.log(`\n🔄 Batch committed (${Math.min(i + BATCH_SIZE, cpus.length)}/${cpus.length})\n`);
        } catch (err) {
            console.error("Batch commit failed:", err);
            failed += chunk.length;
        }
    }

    console.log("\n══════════════════════════════");
    console.log(`✅ Updated:  ${updated}`);
    console.log(`⏭ Skipped:  ${skipped}`);
    console.log(`❌ Failed:   ${failed}`);
    console.log("══════════════════════════════\n");
}

run().catch(console.error);
