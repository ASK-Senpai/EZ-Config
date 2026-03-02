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

interface GPUModel {
    id: string;
    name: string;
    pcieGen: number;
    memoryType: string;
    vramGB: number;
    tdpWatts: number;
    msrpUSD: number;
    gamingScore: number;
    productivityScore: number;
    tier: string;
    rayTracing: boolean;
    upscaling: string;
}

interface RawGPUFile {
    brand: string;
    year: number;
    architecture: string;
    models: GPUModel[];
}

async function seed() {
    console.log("Starting Production-Grade Master GPU Seeder...\n");

    const gpuDir = path.join(process.cwd(), "data", "gpu");
    let files: string[] = [];

    try {
        files = fs.readdirSync(gpuDir).filter(f => f.endsWith(".json"));
    } catch (e: any) {
        console.error("Could not read /data/gpu directory:", e.message);
        process.exit(1);
    }

    let globalWritten = 0;
    let globalUpdated = 0;
    let globalSkipped = 0;
    const failedDocs: string[] = [];

    const collectionRef = db.collection("components").doc("gpu").collection("items");

    for (const file of files) {
        let writtenCount = 0;
        let updatedCount = 0;
        let skippedCount = 0;

        const filePath = path.join(gpuDir, file);
        let data: RawGPUFile;

        try {
            const rawContent = fs.readFileSync(filePath, "utf-8");
            data = JSON.parse(rawContent) as RawGPUFile;
        } catch (e: any) {
            console.error(`Failed to parse ${file}:`, e.message);
            continue;
        }

        const models = data.models;
        if (!models || models.length === 0) {
            console.log(`Seeding ${data.brand} ${data.year} — 0 GPUs...`);
            continue;
        }

        console.log(`Seeding ${data.brand} ${data.year} — ${models.length} GPUs...`);

        // We batch per file. If a file has > 500, we need to chunk it.
        // For GPU datasets, models per year typically < 100, but we will chunk to 500 for safety.
        const CHUNK_SIZE = 450;
        for (let i = 0; i < models.length; i += CHUNK_SIZE) {
            const chunk = models.slice(i, i + CHUNK_SIZE);
            const batch = db.batch();

            // First fetch to check existence
            const docRefs = chunk.map(m => collectionRef.doc(m.id));

            let snapshots;
            try {
                snapshots = await db.getAll(...docRefs);
            } catch (e: any) {
                console.error(`Error fetching existing docs for chunk in ${file}:`, e.message);
                chunk.forEach(m => failedDocs.push(m.id));
                continue;
            }

            chunk.forEach((model, idx) => {
                const snap = snapshots[idx];
                const ref = docRefs[idx];

                const payload = {
                    id: model.id,
                    name: model.name,
                    brand: data.brand,
                    launchYear: data.year,
                    architecture: data.architecture,
                    pcieGen: model.pcieGen,
                    memoryType: model.memoryType,
                    vramGB: model.vramGB,
                    tdpWatts: model.tdpWatts,
                    msrpUSD: model.msrpUSD,
                    gamingScore: model.gamingScore,
                    productivityScore: model.productivityScore,
                    tier: model.tier,
                    rayTracing: model.rayTracing,
                    upscaling: model.upscaling,
                    pricing: {
                        currency: "INR",
                        currentPrice: null,
                        lastUpdated: null,
                        source: null,
                        msrpUSD: model.msrpUSD
                    },
                    updatedAt: FieldValue.serverTimestamp()
                };

                try {
                    batch.set(ref, {
                        ...payload,
                        createdAt: snap.exists
                            ? snap.data()?.createdAt ?? FieldValue.serverTimestamp()
                            : FieldValue.serverTimestamp()
                    }, { merge: true });

                    if (snap.exists) {
                        updatedCount++;
                    } else {
                        writtenCount++;
                    }
                } catch (e: any) {
                    console.error(`Failed to stage ${model.id}:`, e.message);
                    failedDocs.push(model.id);
                }
            });

            try {
                await batch.commit();
            } catch (e: any) {
                console.error(`Failed to commit batch in ${file}:`, e.message);
                chunk.forEach(m => failedDocs.push(m.id));
                // We won't strictly decrement written/updated count for logging simplicity, 
                // but in a fully transactional context we would. We'll rely on global catch.
            }
        }

        console.log(`  -> Written: ${writtenCount} | Updated: ${updatedCount} | Skipped: ${skippedCount}`);
        globalWritten += writtenCount;
        globalUpdated += updatedCount;
        globalSkipped += skippedCount;
    }

    console.log("\n========================================================");
    console.log("SEEDING COMPLETE");
    console.log("========================================================");
    console.log(`Total New GPUs Written : ${globalWritten}`);
    console.log(`Total GPUs Updated     : ${globalUpdated}`);
    console.log(`Total GPUs Skipped     : ${globalSkipped}`);

    if (failedDocs.length > 0) {
        console.error("\nFAILED TO SEED THE FOLLOWING IDs:");
        console.error(failedDocs.join(", "));
        process.exit(1);
    } else {
        process.exit(0);
    }
}

seed().catch(e => {
    console.error("Critical Failure:", e.message);
    process.exit(1);
});
