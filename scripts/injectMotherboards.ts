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

async function injectMotherboards() {
    console.log(`🚀 Starting Motherboard Injection...`);

    const intelPath = path.join(process.cwd(), "data/motherboard/intel.json");
    const amdPath = path.join(process.cwd(), "data/motherboard/amd.json");

    let intelData: any[] = [];
    let amdData: any[] = [];

    if (fs.existsSync(intelPath)) {
        intelData = JSON.parse(fs.readFileSync(intelPath, "utf8"));
    } else {
        console.warn("⚠️ Intel motherboard data not found.");
    }

    if (fs.existsSync(amdPath)) {
        amdData = JSON.parse(fs.readFileSync(amdPath, "utf8"));
    } else {
        console.warn("⚠️ AMD motherboard data not found.");
    }

    const allData = [...intelData, ...amdData];
    console.log(`Loaded ${allData.length} motherboards to process.`);

    const moboCol = db.collection("components").doc("motherboard").collection("items");
    let inserted = 0;
    let updated = 0;
    let skipped = 0;

    for (const item of allData) {
        process.stdout.write(`  ⏳ Processing ${item.id}... `);

        // Sanity check: Ensure NO performance/normalized fields exist
        if (item.normalized || item.gamingScore || item.performanceTier) {
            console.log(`❌ ERROR: Invalid fields detected. Skipping.`);
            continue;
        }

        try {
            const docRef = moboCol.doc(item.id);
            const existingSnap = await docRef.get();

            if (existingSnap.exists) {
                // To avoid unnecessary writes, we could check a hash or deep equals.
                // For now, doing a basic field check on pricing and legacy to determine skip
                const existingParams = existingSnap.data();

                // Assuming basic structure match is enough for skip logic in this context
                // if we don't have updatedAt to compare
                const existingJsonStr = JSON.stringify(existingParams);
                const newJsonStr = JSON.stringify({ ...existingParams, ...item });

                if (existingJsonStr === newJsonStr) {
                    skipped++;
                    console.log("⏭️ SKIPPED (No changes)");
                    continue;
                }

                await docRef.set({ ...item, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
                updated++;
                console.log("🔄 UPDATED (merged)");
            } else {
                await docRef.set({ ...item, updatedAt: FieldValue.serverTimestamp() });
                inserted++;
                console.log("✅ INSERTED");
            }
        } catch (error: any) {
            console.log(`❌ ERROR: ${error.message}`);
        }
    }

    console.log("\n==================================");
    console.log("🎉 Motherboard Injection Complete!");
    console.log("==================================");
    console.log(`✅ Inserted:  ${inserted}`);
    console.log(`🔄 Updated:   ${updated}`);
    console.log(`⏭️ Skipped:   ${skipped}`);
    console.log(`📊 Total Processed (JSON): ${allData.length}`);
}

injectMotherboards().catch(console.error);
