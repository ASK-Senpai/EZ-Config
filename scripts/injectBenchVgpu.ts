import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
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

async function injectBenchVgpu() {
    const vgpuCol = db.collection("components").doc("vgpu").collection("items");
    let updated = 0;

    const files = ["amd_vgpu_v2.json", "intel_vgpu_v2.json"];

    for (const file of files) {
        const filePath = path.join(process.cwd(), `data/bench/${file}`);
        if (!fs.existsSync(filePath)) {
            console.log(`⚠️ Skiping ${file} - not found`);
            continue;
        }

        console.log(`🚀 Processing benchmark file: ${file}...`);
        const data = JSON.parse(fs.readFileSync(filePath, "utf8"));

        for (const vgpu of data) {
            process.stdout.write(`  ⏳ Injecting ${vgpu.id}... `);
            try {
                const docRef = vgpuCol.doc(vgpu.id);
                // We only want to merge the updated normalized scores to be completely non-destructive
                await docRef.set({
                    normalized: vgpu.normalized
                }, { merge: true });

                updated++;
                console.log("🔄 UPDATED (merged V2 metric)");
            } catch (error: any) {
                console.log(`❌ ERROR: ${error.message}`);
            }
        }
    }

    console.log("\n==================================");
    console.log("🎉 Bench vGPU Injection Complete!");
    console.log(`🔄 Total Extrapolated vGPUs synced: ${updated}`);
    console.log("==================================");
}

injectBenchVgpu().catch(console.error);
