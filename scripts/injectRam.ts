import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

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

async function injectRam() {
    console.log(`🚀 Starting RAM Injection...`);

    const ramPath = path.join(process.cwd(), "data/ram/ram.json");
    if (!fs.existsSync(ramPath)) {
        console.error("❌ RAM data not found.");
        process.exit(1);
    }

    const ramData = JSON.parse(fs.readFileSync(ramPath, "utf8"));
    console.log(`Loaded ${ramData.length} RAM modules to process.`);

    const ramCol = db.collection("components").doc("ram").collection("items");
    let inserted = 0;
    let updated = 0;
    let skipped = 0;

    for (const item of ramData) {
        process.stdout.write(`  ⏳ Processing ${item.id}... `);

        // Sanity check: Ensure NO performance fields exist
        if (item.normalized || item.gamingScore || item.productivityScore) {
            console.log(`❌ ERROR: Invalid performance fields detected. Skipping.`);
            continue;
        }

        try {
            const docRef = ramCol.doc(item.id);
            const existingSnap = await docRef.get();

            const payload = {
                ...item,
                nameLowercase: item.name.toLowerCase()
            };

            if (existingSnap.exists) {
                const existingParams = existingSnap.data() as any;

                const existingPrice = existingParams?.pricing?.priceRange?.min;
                const newPrice = payload.pricing?.priceRange?.min;
                const existingSpeed = existingParams?.speedMHz;
                const newSpeed = payload.speedMHz;

                if (existingPrice === newPrice && existingSpeed === newSpeed) {
                    skipped++;
                    console.log("⏭️ SKIPPED (No changes to price or speed)");
                    continue;
                }

                await docRef.set({ ...payload, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
                updated++;
                console.log("🔄 UPDATED (merged)");
            } else {
                await docRef.set({ ...payload, updatedAt: FieldValue.serverTimestamp() });
                inserted++;
                console.log("✅ INSERTED");
            }
        } catch (error: any) {
            console.log(`❌ ERROR: ${error.message}`);
        }
    }

    console.log("\n==================================");
    console.log("🎉 RAM Injection Complete!");
    console.log("==================================");
    console.log(`✅ Inserted:  ${inserted}`);
    console.log(`🔄 Updated:   ${updated}`);
    console.log(`⏭️ Skipped:   ${skipped}`);
    console.log(`📊 Total:     ${ramData.length}`);
}

injectRam().catch(console.error);
