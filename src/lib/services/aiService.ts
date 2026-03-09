import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { createHash } from "crypto";
import { generateTechnicalReport } from "@/server/ai/generateTechnicalReport";

// Helper function to get the current month key (YYYY-MM)
function currentMonthKey(): string {
    const date = new Date();
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    return `${year}-${month}`;
}

// Define BuildInput interface for better type safety
interface BuildInput {
    cpu?: { ids?: string[]; id?: string; name: string };
    gpu?: { ids?: string[]; id?: string; name: string };
    activeGpu?: { ids?: string[]; id?: string; name: string };
    motherboard?: { id?: string; name: string };
    ram?: { id?: string; capacityGB: number };
    psu?: { id?: string; wattage: number };
    storage?: Array<{ id?: string; type: string }> | { id?: string; type: string };
}


export const aiService = {
    async getCachedReport(buildHash: string) {
        const db = getFirestore();
        const snapshot = await db.collection("build_reports")
            .where("engineSnapshotHash", "==", buildHash)
            .orderBy("createdAt", "desc")
            .limit(1)
            .get();

        if (snapshot.empty) return null;
        return snapshot.docs[0].data();
    },

    computeHash(buildInput: BuildInput, analysis: any): string {
        const hashPayload = JSON.stringify({
            cpuId: buildInput.cpu?.id || null,
            gpuId: (buildInput.activeGpu ?? buildInput.gpu)?.id || null,
            ramId: buildInput.ram?.id || null,
            psuId: buildInput.psu?.id || null,
            motherboardId: buildInput.motherboard?.id || null,
            storageId: (Array.isArray(buildInput.storage) ? buildInput.storage[0]?.id : (buildInput.storage as any)?.id) || null,
            engineScores: analysis?.scores || {},
        });
        return createHash("sha256").update(hashPayload).digest("hex");
    },

    async trackUsage(userId: string, buildId: string, source: "TECHNICAL_REPORT" | "INTERNAL_AUDIT") {
        if (source !== "TECHNICAL_REPORT") {
            console.warn(`[AI SERVICE] Blocked unauthorized usage increment attempt from source: ${source}`);
            return;
        }

        const db = getFirestore();
        const userRef = db.collection("users").doc(userId);
        const monthKey = currentMonthKey();

        const batch = db.batch();
        batch.set(userRef, {
            aiUsageRemaining: FieldValue.increment(-1),
            aiUsage: FieldValue.increment(1), // Total usage
            lastAiUsage: FieldValue.serverTimestamp(),
            reportUsageMonth: monthKey,
            updatedAt: FieldValue.serverTimestamp(),
        }, { merge: true });

        // Activity Log
        const logRef = db.collection("usage_logs").doc();
        batch.set(logRef, {
            userId,
            buildId,
            type: "technical_report",
            timestamp: FieldValue.serverTimestamp(),
            status: "success"
        });

        await batch.commit();
    },

    async generateAndTrack(userId: string, buildId: string, buildInput: BuildInput, analysis: any) {
        const engineSnapshotHash = this.computeHash(buildInput, analysis);
        const cached = await this.getCachedReport(engineSnapshotHash);

        if (cached) {
            return { report: cached.reportJson, cached: true };
        }

        const gpu = buildInput.activeGpu ?? buildInput.gpu;
        const payload = JSON.stringify({
            cpu: buildInput.cpu?.name,
            gpu: gpu?.name,
            ram: buildInput.ram?.capacityGB,
            storage: (Array.isArray(buildInput.storage) ? buildInput.storage[0] : buildInput.storage)?.type,
            psu: buildInput.psu?.wattage,
            scores: analysis.scores
        });

        const report = await generateTechnicalReport(payload);

        const db = getFirestore();
        await db.collection("build_reports").doc(buildId).set({
            userId,
            buildId,
            engineSnapshotHash,
            reportJson: report,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
        });

        if (!report.isFallback) {
            await this.trackUsage(userId, buildId, "TECHNICAL_REPORT");
        }

        return { report, cached: false };
    },

    async getUsageStats(userId: string) {
        const db = getFirestore();
        const userDoc = await db.collection("users").doc(userId).get();
        if (!userDoc.exists) return null;

        const data = userDoc.data()!;
        const limit = data.aiLimit || 5;
        const remaining = data.aiUsageRemaining || limit;

        return {
            used: limit - remaining,
            limit: limit,
            remaining: remaining
        };
    }
};
