/**
 * injectPsu.ts
 * Reads data/psu/psu.json and injects it into Firestore.
 * 
 * Run: npx tsx scripts/injectPsu.ts
 */

import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import * as path from "path";
import * as fs from "fs";
import * as dotenv from "dotenv";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const requiredEnvVars = ["FIREBASE_PROJECT_ID", "FIREBASE_CLIENT_EMAIL", "FIREBASE_PRIVATE_KEY"];
for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
        console.error(`❌ Missing required env var: ${envVar}`);
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

async function injectPsu() {
    const dataPath = path.join(process.cwd(), "data", "psu", "psu.json");
    if (!fs.existsSync(dataPath)) {
        console.error("❌ data/psu/psu.json not found!");
        process.exit(1);
    }

    const rawData = fs.readFileSync(dataPath, "utf-8");
    const products = JSON.parse(rawData);

    const batchSize = 100;
    let batch = db.batch();
    let count = 0;
    let skipped = 0;
    let injected = 0;

    console.log(`🚀 Starting PSU injection. Total items found: ${products.length}`);

    for (const product of products) {
        if (!product.id || !product.name || !product.brand || !product.wattage || !product.efficiency || !product.modular || !product.formFactor) {
            console.warn(`⚠️  Skipping invalid product (missing fields): ${product.name || product.id}`);
            continue;
        }

        const docRef = db.collection("components").doc("psu").collection("items").doc(product.id);
        const existingDoc = await docRef.get();

        const newDoc: any = {
            ...product,
            nameLowercase: product.name.toLowerCase(),
            legacy: product.legacy ?? false,
        };

        let hasChanges = true;
        if (existingDoc.exists) {
            const data = existingDoc.data()!;
            // Fast check if prices and core specs are identical
            if (
                data.pricing?.priceRange?.min === product.pricing?.priceRange?.min &&
                data.wattage === product.wattage &&
                data.efficiency === product.efficiency &&
                data.modular === product.modular
            ) {
                hasChanges = false;
            }
        }

        if (hasChanges) {
            newDoc.updatedAt = new Date().toISOString();
            batch.set(docRef, newDoc, { merge: true });
            injected++;
            count++;
        } else {
            skipped++;
        }

        if (count === batchSize) {
            await batch.commit();
            console.log(`✅ Committed batch of ${count} PSU updates...`);
            batch = db.batch();
            count = 0;
        }
    }

    if (count > 0) {
        await batch.commit();
        console.log(`✅ Committed final batch of ${count} PSU updates...`);
    }

    console.log(`\n🎉 Injection complete! Injected/Updated: ${injected}, Skipped: ${skipped}\n`);
}

injectPsu().catch(console.error);
