import { getFirestore, FieldValue } from "firebase-admin/firestore";

export const billingService = {
    async getSubscriptionStatus(userId: string) {
        const db = getFirestore();
        const userDoc = await db.collection("users").doc(userId).get();
        if (!userDoc.exists) return null;

        const data = userDoc.data()!;

        return {
            plan: data.plan || "free",
            status: data.subscriptionStatus || "inactive",
            nextBillingDate: data.nextBillingDate || null,
            razorpaySubscriptionId: data.razorpaySubscriptionId || null
        };
    },

    async cancelSubscription(userId: string) {
        const db = getFirestore();
        // In a real app, this would also call Razorpay API
        await db.collection("users").doc(userId).update({
            subscriptionStatus: "cancelled_pending",
            updatedAt: FieldValue.serverTimestamp()
        });
        return { success: true };
    },

    async resumeSubscription(userId: string) {
        const db = getFirestore();
        // In a real app, this would also call Razorpay API
        await db.collection("users").doc(userId).update({
            subscriptionStatus: "active",
            updatedAt: FieldValue.serverTimestamp()
        });
        return { success: true };
    },

    async getPaymentHistory(userId: string) {
        const db = getFirestore();
        const paymentsSnapshot = await db.collection("payments")
            .where("userId", "==", userId)
            .orderBy("createdAt", "desc")
            .get();

        if (paymentsSnapshot.empty) return [];

        return paymentsSnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: data.razorpayPaymentId || doc.id,
                amount: data.amount,
                currency: data.currency,
                status: data.status,
                createdAt: data.createdAt?.toDate()?.toISOString() || null
            };
        });
    }
};
