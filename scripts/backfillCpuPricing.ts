import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

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

async function runBackfill() {
    console.log("🚀 Starting Unified CPU Pricing & Intelligence Backfill...");
    const cpuCol = db.collection("components").doc("cpu").collection("items");
    const snapshot = await cpuCol.get();

    let updated = 0;
    let skipped = 0;
    let errors = 0;

    const batch = db.batch();
    let batchCount = 0;

    for (const doc of snapshot.docs) {
        const cpu = doc.data();
        let needsUpdate = false;
        const payload: Record<string, any> = {};

        // 1. Unify Integrated Graphics Bool
        const hasIgpu = Array.isArray(cpu.integratedGraphicsIds) && cpu.integratedGraphicsIds.length > 0;
        if (cpu.hasIntegratedGraphics !== hasIgpu) {
            payload.hasIntegratedGraphics = hasIgpu;
            needsUpdate = true;
        }

        // 2. Derive basePricing from active SKUs
        let canonicalPricing = cpu.pricing;
        if (!canonicalPricing || !canonicalPricing.priceRange?.min) {
            // Find lowest priced active SKU
            const activeSkus = (cpu.availableSkus || []).filter((s: any) =>
                s.pricing?.priceRange?.min &&
                s.pricing?.availability?.toLowerCase() !== "legacy" &&
                s.pricing?.availability?.toLowerCase() !== "out of stock"
            );

            // Sort by min price
            activeSkus.sort((a: any, b: any) =>
                (a.pricing.priceRange.min || Infinity) - (b.pricing.priceRange.min || Infinity)
            );

            const bestSku = activeSkus[0] || (cpu.availableSkus || [])[0];

            if (bestSku?.pricing) {
                canonicalPricing = bestSku.pricing;
                payload.pricing = canonicalPricing;
                needsUpdate = true;
            }
        }

        // 3. Compute Value Score
        const minPrice = canonicalPricing?.priceRange?.min;
        const gamingScore = cpu.normalized?.gamingScore;

        if (minPrice > 0 && gamingScore > 0) {
            const rawScore = (gamingScore / minPrice) * 100;
            const newScore = Math.round(rawScore) / 100;

            if (cpu.metrics?.valueScore !== newScore) {
                payload.metrics = {
                    ...(cpu.metrics || {}),
                    valueScore: newScore,
                };
                needsUpdate = true;
            }
        } else if (cpu.metrics?.valueScore !== undefined && cpu.metrics?.valueScore !== null && !minPrice) {
            payload.metrics = {
                ...(cpu.metrics || {}),
                valueScore: null
            }
            needsUpdate = true;
        }

        if (needsUpdate) {
            console.log(`🔄 Queuing ${cpu.id} for update`, payload);
            batch.set(doc.ref, payload, { merge: true });
            updated++;
            batchCount++;

            if (batchCount === 400) {
                await batch.commit();
                batchCount = 0;
            }
        } else {
            skipped++;
        }
    }

    if (batchCount > 0) {
        await batch.commit();
    }

    console.log("\n======================================");
    console.log("✅ Backfill Complete!");
    console.log(`🔄 Updated: ${updated}`);
    console.log(`⏭️ Skipped (already accurate): ${skipped}`);
    console.log(`❌ Errors: ${errors}`);
    console.log("======================================");
}

runBackfill().catch(console.error);
