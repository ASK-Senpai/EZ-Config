import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
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

const CATEGORIES = ["gpu", "cpu", "vgpu", "motherboard", "ram", "storage", "psu"];

async function migrate() {
    console.log("🚀 Starting migration: adding 'category' field to all items...");

    for (const category of CATEGORIES) {
        const col = db.collection("components").doc(category).collection("items");
        const snapshot = await col.get();
        console.log(`📦 ${category.toUpperCase()}: found ${snapshot.size} items.`);

        const batch = db.batch();
        let count = 0;

        for (const doc of snapshot.docs) {
            const data = doc.data();
            if (data.category !== category) {
                batch.update(doc.ref, { category });
                count++;
            }

            // Commit in chunks of 500
            if (count > 0 && count % 500 === 0) {
                await batch.commit();
                console.log(`  ✅ Committed 500 items for ${category}`);
            }
        }

        if (count % 500 !== 0) {
            await batch.commit();
        }
        console.log(`  ✅ Finished ${category}: updated ${count} items.`);
    }

    console.log("\n✨ Migration complete.");
}

migrate().catch(console.error);
