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

interface RawGPU {
    name: string;
    priceRange: string | null;
    availability: string;
    source: string | null;
    msrpUSD: number;
}

function extractNumericRange(rangeStr: string | null): { min: number | null, max: number | null } {
    if (!rangeStr) return { min: null, max: null };

    // E.g. "₹62,000 – ₹75,000"
    const parts = rangeStr.split("–");
    if (parts.length === 2) {
        const minStr = parts[0].replace(/[^\d.]/g, "");
        const maxStr = parts[1].replace(/[^\d.]/g, "");

        return {
            min: parseFloat(minStr) || null,
            max: parseFloat(maxStr) || null
        };
    }

    // fallback if it's just a single price string without a dash
    const singleStr = rangeStr.replace(/[^\d.]/g, "");
    const singleVal = parseFloat(singleStr) || null;
    return { min: singleVal, max: singleVal };
}

async function injectV2() {
    console.log("Starting GPU Price Injection (v2 Schema)...\n");

    const jsonPath = path.join(process.cwd(), "data", "gpu_pricing.json");
    if (!fs.existsSync(jsonPath)) {
        console.error("Missing data/gpu_pricing.json.");
        process.exit(1);
    }

    const data: Record<string, RawGPU> = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
    const keys = Object.keys(data);

    if (keys.length === 0) {
        console.log("No data found to process.");
        process.exit(0);
    }

    const collectionRef = db.collection("components").doc("gpu").collection("items");
    const CHUNK_SIZE = 20; // 20 docs per batch as requested

    let updatedCount = 0;
    let legacyCount = 0;
    let createdCount = 0;
    let skippedCount = 0;
    let failedCount = 0;

    const strictMode = true;

    for (let i = 0; i < keys.length; i += CHUNK_SIZE) {
        const chunk = keys.slice(i, i + CHUNK_SIZE);
        const batch = db.batch();

        const docRefs = chunk.map(id => collectionRef.doc(id));
        let snapshots: any[];

        try {
            snapshots = await db.getAll(...docRefs);
        } catch (e: any) {
            console.error(`Error fetching chunk in apply:`, e.message);
            failedCount += chunk.length;
            continue;
        }

        chunk.forEach((gpuId, idx) => {
            const raw = data[gpuId];
            const ref = docRefs[idx];
            const snap = snapshots[idx];

            const { min, max } = extractNumericRange(raw.priceRange);
            const isLegacy = raw.priceRange === null;

            if (!snap.exists) {
                if (strictMode) {
                    console.warn(`[STRICT MODE] GPU ID not found in Firestore: ${gpuId}`);
                    skippedCount++;
                    return; // Skip staging write entirely
                } else {
                    createdCount++;
                }
            } else {
                // If the document existed, assess what we are actually doing to it
                const previous = snap.data();
                const prevMin = previous?.pricing?.priceRange?.min ?? null;
                const prevMax = previous?.pricing?.priceRange?.max ?? null;
                const prevAvailability = previous?.pricing?.availability ?? null;
                const prevLegacy = previous?.legacy ?? false;

                const changed =
                    prevMin !== min ||
                    prevMax !== max ||
                    prevAvailability !== raw.availability ||
                    prevLegacy !== isLegacy;

                if (!changed) {
                    skippedCount++;
                    return; // Staging skip
                }

                if (isLegacy) {
                    legacyCount++;
                } else {
                    updatedCount++;
                }
            }

            batch.set(ref, {
                legacy: isLegacy,
                pricing: {
                    currency: "INR",
                    priceRange: {
                        min: min,
                        max: max
                    },
                    availability: raw.availability,
                    source: raw.source,
                    lastUpdated: FieldValue.serverTimestamp(),
                    msrpUSD: raw.msrpUSD || null
                }
            }, { merge: true });
        });

        try {
            await batch.commit();
            console.log(`[BATCH COMMITTED] Up to ${i + chunk.length} GPUs pushed.`);
        } catch (e: any) {
            console.error(`[BATCH ERROR]: ${e.message}`);
            failedCount += chunk.length;
        }
    }

    console.log("\n========================================================");
    console.log("INJECTION COMPLETE");
    console.log("========================================================");
    console.log("========================================================");
    console.log(`Docs Actually Updated                : ${updatedCount}`);
    console.log(`Docs Flagged Legacy                  : ${legacyCount}`);
    if (!strictMode) {
        console.log(`Docs Created                     : ${createdCount}`);
    }
    console.log(`Docs Skipped (Unchanged or Strict)   : ${skippedCount}`);
    if (failedCount > 0) {
        console.log(`Failed / Errored         : ${failedCount}`);
    }
    process.exit(0);
}

injectV2().catch(e => {
    console.error("Critical Failure:", e.message);
    process.exit(1);
});
