import "server-only";
import { getFirestore } from "firebase-admin/firestore";
import "@/server/firebase/admin";
import { BaseProduct } from "@/lib/products/types";
import { sanitize } from "@/server/firestore/sanitize";
import { QueryDocumentSnapshot } from "firebase-admin/firestore";

export async function getCpusByVgpu(vgpuId: string): Promise<BaseProduct[]> {
    const db = getFirestore();
    const snapshot = await db.collection("components")
        .doc("cpu")
        .collection("items")
        .where("integratedGraphicsIds", "array-contains", vgpuId)
        .orderBy("normalized.gamingScore", "desc")
        .get();

    if (snapshot.empty) return [];

    return sanitize<BaseProduct[]>(
        snapshot.docs.map((doc: QueryDocumentSnapshot) => ({
            id: doc.id,
            ...doc.data()
        }))
    );
}

