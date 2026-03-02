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

async function cleanupSchema() {
    console.log("Starting GPU Pricing Schema Cleanup (Phase 37)...\n");

    const collectionRef = db.collection("components").doc("gpu").collection("items");
    const snapshot = await collectionRef.get();

    if (snapshot.empty) {
        console.log("No GPUs found in Firestore.");
        process.exit(0);
    }

    const docs = snapshot.docs;
    const CHUNK_SIZE = 20;

    let cleanedCount = 0;
    let failedCount = 0;

    for (let i = 0; i < docs.length; i += CHUNK_SIZE) {
        const chunk = docs.slice(i, i + CHUNK_SIZE);
        const batch = db.batch();

        chunk.forEach(docSnap => {
            const ref = docSnap.ref;
            const data = docSnap.data();

            // Only act if the target fields actually exist in the nested object to minimize writes
            if (data.pricing && ('currentPrice' in data.pricing || 'msrpUSD' in data.pricing)) {
                batch.set(ref, {
                    pricing: {
                        currentPrice: FieldValue.delete(),
                        msrpUSD: FieldValue.delete()
                    }
                }, { merge: true });
                cleanedCount++;
            }
        });

        try {
            await batch.commit();
            console.log(`[BATCH COMMITTED] Evaluated up to ${i + chunk.length} GPUs.`);
        } catch (e: any) {
            console.error(`[BATCH ERROR]: ${e.message}`);
            failedCount += chunk.length;
        }
    }

    console.log("\n========================================================");
    console.log("CLEANUP COMPLETE");
    console.log("========================================================");
    console.log(`Total Documents Cleaned : ${cleanedCount}`);
    if (failedCount > 0) {
        console.log(`Failed / Errored        : ${failedCount}`);
    } else {
        console.log(`Failed / Errored        : 0`);
    }
    process.exit(0);
}

cleanupSchema().catch(e => {
    console.error("Critical Failure:", e.message);
    process.exit(1);
});
