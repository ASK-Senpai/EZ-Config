import admin from "firebase-admin";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config();

function getServiceAccountFromEnv() {
    const raw = process.env.FIREBASE_ADMIN_KEY;
    if (raw) return JSON.parse(raw);

    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

    if (!projectId || !clientEmail || !privateKey) {
        throw new Error("Missing Firebase Admin credentials. Set FIREBASE_ADMIN_KEY or FIREBASE_PROJECT_ID/FIREBASE_CLIENT_EMAIL/FIREBASE_PRIVATE_KEY.");
    }

    return {
        project_id: projectId,
        client_email: clientEmail,
        private_key: privateKey,
    };
}

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(getServiceAccountFromEnv()),
    });
}

const db = admin.firestore();

type UserDoc = {
    plan?: string;
    subscriptionStatus?: string;
    subscriptionId?: string | null;
    razorpayCustomerId?: string | null;
    aiUsage?: number;
    aiLimit?: number;
    premiumSince?: any;
    isPremium?: boolean;
};

async function migrate() {
    const snapshot = await db.collection("users").get();
    console.log(`Found ${snapshot.size} users`);

    let updatedCount = 0;
    let unchangedCount = 0;

    for (const doc of snapshot.docs) {
        const data = (doc.data() || {}) as UserDoc;
        const updates: Record<string, any> = {};

        const rawPlan = String(data.plan || "").toLowerCase();
        const rawStatus = String(data.subscriptionStatus || "").toLowerCase();
        const hasLegacyPremium = data.isPremium === true && !data.subscriptionStatus;

        let nextPlan: "free" | "premium" = rawPlan === "premium" ? "premium" : "free";
        let nextStatus: "inactive" | "active" | "cancelled" | "expired" = "inactive";

        if (rawStatus === "active" || rawStatus === "inactive" || rawStatus === "cancelled" || rawStatus === "expired") {
            nextStatus = rawStatus;
        } else if (hasLegacyPremium || rawPlan === "premium") {
            nextStatus = "active";
            nextPlan = "premium";
        } else {
            nextStatus = "inactive";
            nextPlan = "free";
        }

        const targetAiLimit = nextPlan === "premium" ? 50 : 5;

        if (data.plan !== nextPlan) updates.plan = nextPlan;
        if (data.subscriptionStatus !== nextStatus) updates.subscriptionStatus = nextStatus;
        if (data.aiLimit !== targetAiLimit) updates.aiLimit = targetAiLimit;
        if (typeof data.aiUsage !== "number") updates.aiUsage = 0;
        if (data.subscriptionId === undefined) updates.subscriptionId = null;
        if (data.razorpayCustomerId === undefined) updates.razorpayCustomerId = null;

        if (nextPlan === "premium" && !data.premiumSince) {
            updates.premiumSince = admin.firestore.FieldValue.serverTimestamp();
        }

        if (data.isPremium !== undefined) {
            updates.isPremium = admin.firestore.FieldValue.delete();
        }

        if (Object.keys(updates).length > 0) {
            updates.updatedAt = admin.firestore.FieldValue.serverTimestamp();
            await doc.ref.update(updates);
            updatedCount++;
            console.log(`Updated user ${doc.id}`, updates);
        } else {
            unchangedCount++;
        }
    }

    console.log(`Migration complete. Updated: ${updatedCount}, Unchanged: ${unchangedCount}`);
}

migrate()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error("Migration failed:", err);
        process.exit(1);
    });
