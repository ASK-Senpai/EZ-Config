import { getFirestore, collection, doc, getDocs, getDoc } from "firebase/firestore";
import { app } from "@/lib/firebase/client";

// The path structure is: components/{type}/items/{id}

export async function getComponentsByType(type: string) {
    if (!app) return [];
    const db = getFirestore(app);
    const snapshot = await getDocs(collection(db, "components", type, "items"));

    if (snapshot.empty) {
        return [];
    }

    return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    }));
}

export async function getComponentById(type: string, id: string) {
    if (!app) return null;
    const db = getFirestore(app);
    const docRef = doc(db, "components", type, "items", id);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
        return null;
    }

    return {
        id: docSnap.id,
        ...docSnap.data()
    };
}
