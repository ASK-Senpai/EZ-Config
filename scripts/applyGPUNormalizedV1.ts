/**
 * applyGPUNormalizedV1.ts
 * Injects normalized gaming/productivity scores into Firestore GPU items.
 * Safe: only writes `normalized` and `scoreVersion`. Never touches pricing.
 */

import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import * as path from "path";
import * as fs from "fs";
import * as dotenv from "dotenv";

// Load env from project root (works regardless of where tsx is invoked from)
dotenv.config({ path: path.resolve(process.cwd(), ".env") });


if (!process.env.FIREBASE_PROJECT_ID) {
    console.error("\n❌ FIREBASE_PROJECT_ID is not set. Check your .env.local file.\n");
    process.exit(1);
}

// Init admin
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

// Load the normalization dataset
const dataPath = path.resolve(__dirname, "../data/gpu_ub.json");
const ubData: Record<string, { normalized: { gamingScore: number; productivityScore: number }; scoreVersion: number }> =
    JSON.parse(fs.readFileSync(dataPath, "utf-8"));

const BATCH_SIZE = 20;
const COLLECTION = db.collection("components").doc("gpu").collection("items");

async function run() {
    const ids = Object.keys(ubData);
    console.log(`\n📦 Starting GPU Normalization Injection — ${ids.length} GPUs\n`);

    let updatedCount = 0;
    let skippedCount = 0;
    let failedCount = 0;

    // Process in batches of BATCH_SIZE
    for (let i = 0; i < ids.length; i += BATCH_SIZE) {
        const batch = db.batch();
        const chunk = ids.slice(i, i + BATCH_SIZE);

        for (const gpuId of chunk) {
            const entry = ubData[gpuId];
            try {
                const docRef = COLLECTION.doc(gpuId);
                const existing = await docRef.get();

                if (existing.exists) {
                    const data = existing.data()!;
                    const existingVersion = data.scoreVersion;
                    const existingGaming = data.normalized?.gamingScore;
                    const existingProductivity = data.normalized?.productivityScore;

                    // Skip if already V1 and values match exactly
                    if (
                        existingVersion === 1 &&
                        existingGaming === entry.normalized.gamingScore &&
                        existingProductivity === entry.normalized.productivityScore
                    ) {
                        console.log(`  ⏭ SKIP ${gpuId} (already V1, values match)`);
                        skippedCount++;
                        continue;
                    }
                }

                batch.set(docRef, {
                    normalized: {
                        gamingScore: entry.normalized.gamingScore,
                        productivityScore: entry.normalized.productivityScore,
                    },
                    scoreVersion: 1,
                    updatedAt: FieldValue.serverTimestamp(),
                }, { merge: true });

                console.log(`  ✅ QUEUE ${gpuId}`);
                updatedCount++;
            } catch (err) {
                console.error(`  ❌ FAIL ${gpuId}:`, err);
                failedCount++;
            }
        }

        try {
            await batch.commit();
            console.log(`\n🔄 Batch committed (${Math.min(i + BATCH_SIZE, ids.length)}/${ids.length})\n`);
        } catch (err) {
            console.error("Batch commit failed:", err);
            failedCount += chunk.length - chunk.filter(id => {
                const entry = ubData[id];
                return entry !== undefined;
            }).length;
        }
    }

    console.log("\n══════════════════════════════");
    console.log(`✅ Updated:  ${updatedCount}`);
    console.log(`⏭ Skipped:  ${skippedCount}`);
    console.log(`❌ Failed:   ${failedCount}`);
    console.log("══════════════════════════════\n");
}

run().catch(console.error);
