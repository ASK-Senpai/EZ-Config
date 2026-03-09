import { getFirestore, FieldValue } from "firebase-admin/firestore";

export interface UserProfile {
    id: string;
    displayName?: string;
    email?: string;
    plan: string;
    subscriptionStatus: string;
    aiUsage: number;
    aiLimit: number;
    role?: string;
    createdAt?: any;
    updatedAt?: any;
}

export const userService = {
    async getUser(userId: string): Promise<UserProfile | null> {
        const db = getFirestore();
        const doc = await db.collection("users").doc(userId).get();
        if (!doc.exists) return null;
        const data = doc.data()!;
        return {
            id: doc.id,
            displayName: data.displayName,
            email: data.email,
            plan: data.plan || "free",
            subscriptionStatus: data.subscriptionStatus || "inactive",
            aiUsage: data.aiUsage || 0,
            aiLimit: data.aiLimit || 5,
            role: data.role || "user",
            createdAt: data.createdAt,
            updatedAt: data.updatedAt
        } as UserProfile;
    },

    async updateUser(userId: string, data: { displayName?: string; role?: string }) {
        const db = getFirestore();
        await db.collection("users").doc(userId).update({
            ...data,
            updatedAt: FieldValue.serverTimestamp()
        });
        return { success: true };
    },

    async deleteUser(userId: string) {
        const db = getFirestore();
        // 1. Delete user builds
        const builds = await db.collection("builds").where("userId", "==", userId).get();
        const batch = db.batch();
        builds.forEach(doc => batch.delete(doc.ref));

        // 2. Delete user document
        batch.delete(db.collection("users").doc(userId));

        await batch.commit();
        return { success: true };
    },

    async setAdmin(userId: string) {
        const db = getFirestore();
        await db.collection("users").doc(userId).update({
            role: "admin",
            updatedAt: FieldValue.serverTimestamp()
        });
    }
};
