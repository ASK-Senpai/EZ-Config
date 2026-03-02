import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { sanitize } from "./sanitize";

export async function createBuild(userId: string, buildData: any) {
    const db = getFirestore();
    const ref = db.collection("builds").doc();

    const payload = {
        ...buildData,
        userId,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
    };

    await ref.set(payload);
    return { id: ref.id, ...payload };
}

export async function getBuildById(id: string) {
    const db = getFirestore();
    const doc = await db.collection("builds").doc(id).get();

    if (!doc.exists) {
        return null;
    }

    return {
        id: doc.id,
        ...(sanitize(doc.data()) as any)
    };
}

export async function getUserBuilds(userId: string) {
    const db = getFirestore();
    const snapshot = await db.collection("builds")
        .where("userId", "==", userId)
        .orderBy("createdAt", "desc")
        .get();

    if (snapshot.empty) {
        return [];
    }

    return snapshot.docs.map(doc => ({
        id: doc.id,
        ...(sanitize(doc.data()) as any)
    }));
}
