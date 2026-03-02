/**
 * injectStorage.ts
 * Injects storage (ROM) data from data/rom/rom.json into Firestore
 * No normalized scores are added, and pricePerGB is computed.
 *
 * Run: npx tsx scripts/injectStorage.ts
 */

import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import * as path from "path";
import * as fs from "fs";
import * as dotenv from "dotenv";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

// ── Validate env ──────────────────────────────────────────────────────────────
const required = ["FIREBASE_PROJECT_ID", "FIREBASE_CLIENT_EMAIL", "FIREBASE_PRIVATE_KEY"];
for (const key of required) {
    if (!process.env[key]) {
        if (key === "FIREBASE_PRIVATE_KEY" && process.env.FIREBASE_PROJECT_ID) {
            // locally it might be in .env.json
        } else {
            console.error(`❌ Missing env var: ${key}`);
            process.exit(1);
        }
    }
}

// ── Parse local .env.json if exists ───────────────────────────────────────────
let creds = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
};

try {
    const envJsonPath = path.resolve(process.cwd(), ".env.json");
    if (fs.existsSync(envJsonPath)) {
        const envJson = JSON.parse(fs.readFileSync(envJsonPath, "utf-8"));
        creds = {
            projectId: envJson.FIREBASE_PROJECT_ID || creds.projectId,
            clientEmail: envJson.FIREBASE_CLIENT_EMAIL || creds.clientEmail,
            privateKey: (envJson.FIREBASE_PRIVATE_KEY || creds.privateKey)?.replace(/\\n/g, "\n"),
        };
    }
} catch (e) {
    // Ignore
}

// ── Firebase Admin ────────────────────────────────────────────────────────────
if (!getApps().length) {
    initializeApp({ credential: cert(creds) });
}
const db = getFirestore();

async function run() {
    const dataPath = path.resolve(process.cwd(), "data/rom/rom.json");
    if (!fs.existsSync(dataPath)) {
        console.error(`❌ File not found: ${dataPath}`);
        process.exit(1);
    }

    const rawData = JSON.parse(fs.readFileSync(dataPath, "utf-8"));
    const collectionRef = db.collection("components").doc("storage").collection("items");

    console.log(`\n📦 Injecting ${rawData.length} Storage profiles...`);

    let injected = 0;
    let skipped = 0;

    for (const item of rawData) {
        const docRef = collectionRef.doc(item.id);
        const existing = await docRef.get();

        const itemMinPrice = item.pricing?.priceRange?.min;
        const pricePerGB = itemMinPrice && item.capacityGB ? Math.round((itemMinPrice / item.capacityGB) * 100) / 100 : null;

        if (existing.exists) {
            const extData = existing.data();
            const extMinPrice = extData?.pricing?.priceRange?.min;

            if (extMinPrice === itemMinPrice) {
                skipped++;
                console.log(`  ⏭️  Skipped ${item.id} (No changes)`);
                continue;
            }
        }

        const payload = {
            ...item,
            nameLowercase: item.name.toLowerCase(),
            legacy: item.legacy ?? false,
            updatedAt: FieldValue.serverTimestamp(),
            pricePerGB: pricePerGB,
        };

        // Ensure we DONT add normalized scores
        delete payload.normalized;
        delete payload.gamingScore;
        delete payload.productivityScore;

        await docRef.set(payload, { merge: true });
        injected++;
        console.log(`  ✅ Injected ${item.id} ${pricePerGB ? `(₹${pricePerGB}/GB)` : ""}`);
    }

    console.log(`\n🎉 Done! Injected: ${injected} | Skipped: ${skipped}\n`);
}

run().catch(console.error);
