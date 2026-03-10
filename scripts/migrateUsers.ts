import * as admin from 'firebase-admin';
import * as dotenv from 'dotenv';
import Razorpay from 'razorpay';

// Load environment variables
dotenv.config();

// Initialize Firebase Admin securely handling the newline escape issue
let pk = process.env.FIREBASE_PRIVATE_KEY || "";
pk = pk.replace(/^"|"$/g, '').replace(/\\n/g, '\n');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: pk,
        })
    });
}

const db = admin.firestore();

// Initialize Razorpay
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID || "",
    key_secret: process.env.RAZORPAY_TEST_SECRET || process.env.RAZORPAY_SECRET || ""
});

async function migrateUsers() {
    console.log("Starting User Schema Migration...");

    const usersSnapshot = await db.collection('users').get();
    console.log(`Found ${usersSnapshot.size} total users.`);

    let migratedCount = 0;
    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    for (const doc of usersSnapshot.docs) {
        try {
            const data = doc.data();
            const uid = doc.id;
            const updates: Record<string, any> = {};

            console.log(`\nAnalyzing user: ${uid} (${data.email})`);

            // --- 1. REMOVE DEPRECATED FIELDS ---
            if (data.aiUsageRemaining !== undefined) {
                updates.aiUsageRemaining = admin.firestore.FieldValue.delete();
            }
            if (data.subscriptionId !== undefined) {
                updates.subscriptionId = admin.firestore.FieldValue.delete();
            }
            if (data.subscription !== undefined) {
                updates.subscription = admin.firestore.FieldValue.delete();
            }
            if (data.credits !== undefined) {
                updates.credits = admin.firestore.FieldValue.delete();
            }

            // --- 2. FIX CREDIT VALUES ---
            const isPremium = data.plan === "premium_monthly" || data.plan === "premium" || data.subscriptionStatus === "active";
            let currentAiLimit = typeof data.aiLimit === 'number' ? data.aiLimit : (isPremium ? 50 : 5);

            // Enforce limit cap
            if (isPremium && currentAiLimit < 50) currentAiLimit = 50;
            if (data.aiLimit !== currentAiLimit) updates.aiLimit = currentAiLimit;

            let currentAiUsage = typeof data.aiUsage === 'number' ? data.aiUsage : 0;

            // Enforce lower bounds
            if (currentAiUsage < 0) currentAiUsage = 0;

            // Enforce upper bounds
            if (currentAiUsage > currentAiLimit) currentAiUsage = currentAiLimit;

            if (data.aiUsage !== currentAiUsage) updates.aiUsage = currentAiUsage;

            // --- 3. FIX NEXT BILLING DATE ---
            if (!data.nextBillingDate && data.razorpaySubscriptionId) {
                try {
                    const rzpSub = await razorpay.subscriptions.fetch(data.razorpaySubscriptionId);
                    if (rzpSub && rzpSub.current_end) {
                        const nextDate = new Date(rzpSub.current_end * 1000).toISOString();
                        updates.nextBillingDate = nextDate;
                        console.log(`  -> Fetched nextBillingDate from Razorpay: ${nextDate}`);
                    }
                } catch (rzpErr: any) {
                    console.error(`  -> Failed to fetch Razorpay sub ${data.razorpaySubscriptionId}:`, rzpErr.message);
                }
            }

            // --- 4. FIX RAZORPAY CUSTOMER FIELD ---
            if (data.razorpayCustomerId === undefined) {
                updates.razorpayCustomerId = null;
                // (If needed, you can query Razorpay API by email here, but defaulting to null is safer)
            }

            // --- 5. ENSURE reportUsageMonth EXISTS ---
            if (!data.reportUsageMonth) {
                updates.reportUsageMonth = currentMonthKey;
            }

            // Only push the update if there are keys modifying the document
            if (Object.keys(updates).length > 0) {
                console.log(`  -> Modifications planned:`, Object.keys(updates));

                await db.collection("users").doc(uid).update(updates);

                migratedCount++;
                console.log(`  -> [UPDATED] user ${uid}`);
            } else {
                console.log(`  -> User exactly matches Target Schema already. Skipping.`);
            }

        } catch (err: any) {
            console.error(`ERROR migrating user ${doc.id}:`, err);
        }
    }

    console.log(`\nMigration complete. Analyzed ${usersSnapshot.size} total users.`);
    console.log(`Dry-run matched ${migratedCount} users requiring changes.`);
}

migrateUsers()
    .then(() => process.exit(0))
    .catch(console.error);
