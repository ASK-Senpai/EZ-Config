/**
 * backfillNameLowercase.ts
 * Adds `nameLowercase = name.toLowerCase()` to every existing CPU and GPU
 * document in Firestore. Required for the prefix search feature.
 *
 * Run: npx tsx scripts/backfillNameLowercase.ts
 */

import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import * as path from "path";
import * as dotenv from "dotenv";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

if (!process.env.FIREBASE_PROJECT_ID) {
    console.error("\n❌ FIREBASE_PROJECT_ID not set.\n");
    process.exit(1);
}

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
const CATEGORIES = ["gpu", "cpu"];
const BATCH_SIZE = 20;

async function backfillCategory(category: string) {
    const col = db.collection("components").doc(category).collection("items");
    const snapshot = await col.get();

    console.log(`\n📦 ${category.toUpperCase()} — ${snapshot.size} documents\n`);

    let updated = 0;
    let skipped = 0;

    for (let i = 0; i < snapshot.docs.length; i += BATCH_SIZE) {
        const batch = db.batch();
        const chunk = snapshot.docs.slice(i, i + BATCH_SIZE);

        for (const doc of chunk) {
            const data = doc.data();
            const name: string = data.name ?? "";
            const nameLowercase = name.toLowerCase();

            if (data.nameLowercase === nameLowercase) {
                console.log(`  ⏭ SKIP ${doc.id}`);
                skipped++;
                continue;
            }

            batch.update(doc.ref, { nameLowercase });
            console.log(`  ✅ SET  ${doc.id} → "${nameLowercase}"`);
            updated++;
        }

        await batch.commit();
        console.log(`\n  🔄 Committed (${Math.min(i + BATCH_SIZE, snapshot.docs.length)}/${snapshot.docs.length})\n`);
    }

    return { updated, skipped };
}

async function run() {
    console.log("\n🚀 Backfilling nameLowercase for prefix search\n");

    let totalUpdated = 0;
    let totalSkipped = 0;

    for (const cat of CATEGORIES) {
        const { updated, skipped } = await backfillCategory(cat);
        totalUpdated += updated;
        totalSkipped += skipped;
    }

    console.log("\n══════════════════════════════");
    console.log(`✅ Updated:  ${totalUpdated}`);
    console.log(`⏭ Skipped:  ${totalSkipped}`);
    console.log("══════════════════════════════\n");
}

run().catch(console.error);
