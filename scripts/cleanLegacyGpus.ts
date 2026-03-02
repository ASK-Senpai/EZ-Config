import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import * as dotenv from "dotenv";
import * as path from "path";

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

async function cleanLegacyGpus() {
    console.log("Starting GPU cleanup...");
    const gpuCollection = db.collection("components").doc("gpu").collection("items");
    const snapshot = await gpuCollection.get();

    let deletedCount = 0;
    const deletedIds: string[] = [];

    for (const doc of snapshot.docs) {
        const data = doc.data();
        const pricing = data.pricing;

        const isMissingPricing = !pricing;
        const isMissingMinPrice = !pricing?.priceRange?.min;
        const isZeroPrice = pricing?.priceRange?.min === 0;
        const isNullPrice = pricing?.priceRange?.min === null;

        if (isMissingPricing || isMissingMinPrice || isZeroPrice || isNullPrice) {
            console.log(`Deleting legacy GPU: ${doc.id} (Reason: Invalid Pricing)`);
            await doc.ref.delete();
            deletedCount++;
            deletedIds.push(doc.id);
        }
    }

    console.log("-----------------------------------------");
    console.log(`Cleanup complete.`);
    console.log(`Total Deleted: ${deletedCount}`);
    if (deletedIds.length > 0) {
        console.log(`Deleted IDs: ${deletedIds.join(", ")}`);
    } else {
        console.log("No legacy GPUs found for deletion.");
    }
}

cleanLegacyGpus().catch(console.error);
