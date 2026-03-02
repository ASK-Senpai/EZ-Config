import fs from "fs";
import path from "path";
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import * as dotenv from "dotenv";

dotenv.config();

const serviceAccount = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
};

if (!getApps().length) {
    initializeApp({
        credential: cert(serviceAccount),
    });
}

const db = getFirestore();

async function applyPricing() {
    console.log("Starting GPU Pricing Injection to Firestore...\n");

    const inputFile = path.join(process.cwd(), "data", "gpu_pricing.json");

    if (!fs.existsSync(inputFile)) {
        console.error("Missing data/gpu_pricing.json. Run fetchGPUPrices.ts first.");
        process.exit(1);
    }

    const pricingData: Record<string, { name: string, price: number, source: string, msrpUSD: number }> = JSON.parse(fs.readFileSync(inputFile, "utf-8"));
    const keys = Object.keys(pricingData);

    if (keys.length === 0) {
        console.log("No prices mapped. Aborting.");
        process.exit(0);
    }

    const collectionRef = db.collection("components").doc("gpu").collection("items");
    const CHUNK_SIZE = 450;

    let injected = 0;
    let failed = 0;

    for (let i = 0; i < keys.length; i += CHUNK_SIZE) {
        const chunk = keys.slice(i, i + CHUNK_SIZE);
        const batch = db.batch();

        chunk.forEach((id) => {
            const data = pricingData[id];
            const ref = collectionRef.doc(id);

            batch.set(ref, {
                pricing: {
                    currency: "INR",
                    currentPrice: data.price,
                    lastUpdated: FieldValue.serverTimestamp(),
                    source: data.source,
                    msrpUSD: data.msrpUSD || null
                }
            }, { merge: true });
        });

        try {
            await batch.commit();
            injected += chunk.length;
            console.log(`[BATCH COMMITTED] Up to ${i + chunk.length} GPUs pushed.`);
        } catch (e: any) {
            console.error(`[BATCH ERROR]: ${e.message}`);
            failed += chunk.length;
        }
    }

    console.log("\n========================================================");
    console.log("INJECTION COMPLETE");
    console.log("========================================================");
    console.log(`Successfully mapped  : ${injected} documents in Firestore.`);
    console.log(`Failed batches     : ${failed}`);
    process.exit(0);
}

applyPricing().catch(e => {
    console.error("Critical Failure:", e.message);
    process.exit(1);
});
