import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";

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

const TO_DELETE = [
    "r9-380", "r9-380x", "r9-390", "r9-390x", "r9-fury", "r9-fury-x", "r9-nano",
    "rx-460", "rx-470", "rx-480", "rx-590", "rx-vega-56", "rx-vega-64", "rx-5700"
];

const PRICING_UPDATES: Record<string, any> = {
    "rx-5500-xt": {
        min: 28600,
        max: 28643,
        source: "Amazon.in",
        display: "₹28,600 – ₹28,643"
    },
    "rx-5600-xt": {
        min: 42499,
        max: 62327,
        source: "Amazon.in",
        display: "₹42,499 – ₹62,327"
    },
    "rx-5700-xt": {
        min: 19658,
        max: 66816,
        source: "Amazon.in",
        display: "₹19,658 – ₹66,816"
    }
};

async function run() {
    console.log("Starting GPU Price & Inventory Update...");

    const gpuCollection = db.collection("components").doc("gpu").collection("items");

    // 1. Delete Unavailable
    for (const id of TO_DELETE) {
        console.log(`Checking/Deleting: ${id}`);
        await gpuCollection.doc(id).delete();
    }

    // 2. Update Pricing for Available
    // Note: If they were deleted by the previous cleanup, we might need to check if they exist.
    // However, the user said "update price for what I gave you". If they are gone, we should ideally re-inject or just skip if we don't have full metadata.
    // Let's check if we have them first.

    for (const [id, price] of Object.entries(PRICING_UPDATES)) {
        const doc = await gpuCollection.doc(id).get();
        if (doc.exists) {
            console.log(`Updating pricing for ${id}...`);
            await gpuCollection.doc(id).update({
                pricing: {
                    currency: "INR",
                    source: price.source,
                    lastUpdated: Timestamp.now(),
                    priceRange: {
                        min: price.min,
                        max: price.max
                    }
                },
                updatedAt: Timestamp.now()
            });
        } else {
            console.log(`Warning: ${id} does not exist in Firestore. If it was deleted, use a seed script to restore it first.`);
        }
    }

    // 3. Update data/gpu_pricing.json
    console.log("Updating local data/gpu_pricing.json...");
    const jsonPath = path.resolve(process.cwd(), "data/gpu_pricing.json");
    if (fs.existsSync(jsonPath)) {
        const jsonData = JSON.parse(fs.readFileSync(jsonPath, "utf8"));

        // Update prices in JSON
        for (const [id, price] of Object.entries(PRICING_UPDATES)) {
            if (jsonData[id]) {
                jsonData[id].priceRange = price.display;
                jsonData[id].source = price.source;
                jsonData[id].availability = "in stock";
            }
        }

        // Update availability for deleted ones
        for (const id of TO_DELETE) {
            if (jsonData[id]) {
                jsonData[id].priceRange = null;
                jsonData[id].availability = "unavailable / discontinued";
                jsonData[id].source = null;
            }
        }

        fs.writeFileSync(jsonPath, JSON.stringify(jsonData, null, 2));
        console.log("JSON sync complete.");
    }

    console.log("Update process finished.");
}

run().catch(console.error);
