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

async function auditGpuPricing() {
    console.log("Auditing GPU Pricing (Non-Legacy)...");
    const gpuCollection = db.collection("components").doc("gpu").collection("items");
    const snapshot = await gpuCollection.get();

    const issues: any[] = [];

    for (const doc of snapshot.docs) {
        const data = doc.data();
        const pricing = data.pricing;

        // Skip if explicitly marked as legacy in data (if such flag exists)
        if (data.isLegacy === true || data.isDigitalLegacy === true) continue;

        const minPrice = pricing?.priceRange?.min;
        const maxPrice = pricing?.priceRange?.max;

        let issueReason = "";

        if (!pricing) {
            issueReason = "Missing pricing object";
        } else if (minPrice === undefined || minPrice === null || minPrice === 0) {
            issueReason = `Invalid min price: ${minPrice}`;
        } else if (maxPrice && maxPrice < minPrice) {
            issueReason = `Max price (${maxPrice}) lower than min price (${minPrice})`;
        } else if (!pricing.currency || pricing.currency !== "INR") {
            // Check if currency is missing or not INR (since we standardized to INR)
            issueReason = `Currency mismatch or missing: ${pricing.currency}`;
        } else if (!pricing.source) {
            issueReason = "Missing price source/vendor";
        }

        if (issueReason) {
            issues.push({
                id: doc.id,
                name: data.name,
                brand: data.brand,
                launchYear: data.launchYear,
                minPrice,
                maxPrice,
                currency: pricing?.currency,
                reason: issueReason
            });
        }
    }

    if (issues.length > 0) {
        console.log(`Found ${issues.length} GPUs with pricing issues:`);
        console.table(issues);
    } else {
        console.log("No GPUs with pricing issues found among non-legacy items.");
    }
}

auditGpuPricing().catch(console.error);
