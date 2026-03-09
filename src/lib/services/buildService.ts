import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { runEngineV12 } from "@/lib/engine";
import { BuildInput } from "@/lib/engine/compatibility";

export interface BuildSaveData {
    cpuId: string;
    gpuId: string;
    motherboardId?: string;
    ramId?: string;
    storageId?: string;
    psuId?: string;
}

export interface Build {
    id: string;
    userId: string;
    components: BuildSaveData;
    engineResult: any;
    createdAt: any;
    updatedAt: any;
    isPublic: boolean;
    publicId: string | null;
}

export const buildService = {
    async createBuild(userId: string, buildIds: BuildSaveData, plan: string = "free"): Promise<{ buildId: string; engineResult: any }> {
        const db = getFirestore();
        const userRef = db.collection("users").doc(userId);

        // 1. Plan Limit Enforcement
        if (plan === "free") {
            const buildsSnapshot = await db.collection("builds").where("userId", "==", userId).get();
            if (buildsSnapshot.size >= 3) {
                throw new Error("PLAN_LIMIT_REACHED");
            }
        }

        // 2. Fetch Components Server-Side
        const typeMap: Record<string, string> = {
            cpuId: "cpu",
            gpuId: "gpu",
            motherboardId: "motherboard",
            ramId: "ram",
            storageId: "storage",
            psuId: "psu"
        };

        const buildObject: BuildInput = {};
        for (const [key, type] of Object.entries(typeMap)) {
            const id = (buildIds as any)[key];
            if (id) {
                const docSnap = await db.collection("components").doc(type).collection("items").doc(id).get();
                if (!docSnap.exists) {
                    throw new Error(`COMPONENT_NOT_FOUND:${type}:${id}`);
                }
                const data = docSnap.data()!;
                (buildObject as any)[type] = { id: docSnap.id, ...data };
            }
        }

        if (!buildObject.cpu || !buildObject.gpu) {
            throw new Error("CORE_COMPONENTS_MISSING");
        }

        // 3. Server Engine Run
        const engineResult = runEngineV12(buildObject, plan);

        // 4. Save Build
        const buildsRef = db.collection("builds").doc();
        const payload = {
            userId,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
            components: buildIds,
            engineResult,
            isPublic: false,
            publicId: null
        };

        const batch = db.batch();
        batch.set(buildsRef, payload);

        // Increment user buildCount
        batch.update(userRef, {
            buildCount: FieldValue.increment(1),
            updatedAt: FieldValue.serverTimestamp()
        });

        // Analytics tracking
        const globalRef = db.collection("analytics").doc("global");
        batch.set(globalRef, { totalBuilds: FieldValue.increment(1) }, { merge: true });

        const userAnalyticsRef = db.collection("analytics").doc(userId);
        batch.set(userAnalyticsRef, { buildsCreated: FieldValue.increment(1) }, { merge: true });

        await batch.commit();

        return { buildId: buildsRef.id, engineResult };
    },

    async getBuildById(userId: string, buildId: string): Promise<Build | null> {
        const db = getFirestore();
        const buildRef = db.collection("builds").doc(buildId);
        const doc = await buildRef.get();

        if (!doc.exists) return null;
        const data = doc.data()!;
        if (data.userId !== userId) throw new Error("UNAUTHORIZED");

        return { id: doc.id, ...data } as Build;
    },

    async getBuilds(userId: string): Promise<Build[]> {
        const db = getFirestore();
        const snapshot = await db.collection("builds")
            .where("userId", "==", userId)
            .orderBy("createdAt", "desc")
            .get();

        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Build));
    },

    async hydrateBuild(componentIdMap: any): Promise<BuildInput> {
        const db = getFirestore();
        const typeMap: Record<string, keyof BuildInput> = {
            cpuId: "cpu",
            gpuId: "gpu",
            motherboardId: "motherboard",
            ramId: "ram",
            storageId: "storage",
            psuId: "psu",
        };

        const buildInput: BuildInput = {};
        for (const [idKey, componentType] of Object.entries(typeMap)) {
            const componentId = componentIdMap?.[idKey];
            if (!componentId) continue;

            const componentDoc = await db
                .collection("components")
                .doc(componentType)
                .collection("items")
                .doc(componentId)
                .get();

            if (componentDoc.exists) {
                (buildInput as any)[componentType] = { id: componentDoc.id, ...componentDoc.data()! };
            }
        }

        if (buildInput.gpu && !buildInput.activeGpu) {
            buildInput.activeGpu = buildInput.gpu;
        }

        return buildInput;
    },

    async deleteBuild(userId: string, buildId: string) {
        const db = getFirestore();
        const buildRef = db.collection("builds").doc(buildId);
        const doc = await buildRef.get();

        if (!doc.exists) throw new Error("NOT_FOUND");
        if (doc.data()?.userId !== userId) throw new Error("UNAUTHORIZED");

        await buildRef.delete();
        return { success: true };
    }
};
