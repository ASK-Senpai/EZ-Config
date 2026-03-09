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

export interface AIReport {
    id: string;
    userId: string;
    buildId: string;
    buildName?: string;
    summary: string;
    engineSnapshot?: any;
    reportJson?: any;
    engineSnapshotHash: string;
    createdAt: any;
}


export const aiService = {
    async getCachedReport(buildHash: string) {
        try {
            const db = getFirestore();
            const snapshot = await db.collection("report_cache")
                .doc(buildHash)
                .get();

            if (!snapshot.exists) return null;
            return snapshot.data();
        } catch (error: any) {
            throw error;
        }
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

    async generateAndTrack(userId: string, buildId: string, buildInput: BuildInput, analysis: any, buildName?: string) {
        const engineSnapshotHash = this.computeHash(buildInput, analysis);
        const cached = await this.getCachedReport(engineSnapshotHash);

        const db = getFirestore();
        const reportRef = db.collection("reports").doc();
        const reportId = reportRef.id;

        // 1. If Cache exists, just create User Reference Pointer
        if (cached) {
            const reportDoc: Partial<AIReport> = {
                id: reportId,
                userId,
                buildId,
                buildName: buildName || "Untitled Build",
                summary: cached.summary || "AI Analysis Report",
                engineSnapshotHash,
                createdAt: FieldValue.serverTimestamp(),
            };
            await reportRef.set(reportDoc);
            return { reportId, report: cached.reportJson, cached: true };
        }

        // 2. Generate New Report
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
        const summary = report.executiveSummary || report.short_summary || "AI Analysis Report";

        // 3. Save to Global Cache
        const cacheRef = db.collection("report_cache").doc(engineSnapshotHash);
        await cacheRef.set({
            engineSnapshotHash,
            summary,
            engineSnapshot: analysis,
            reportJson: report,
            createdAt: FieldValue.serverTimestamp()
        });

        // 4. Save User Reference Pointer
        const reportDoc: Partial<AIReport> = {
            id: reportId,
            userId,
            buildId,
            buildName: buildName || "Untitled Build",
            summary,
            engineSnapshotHash,
            createdAt: FieldValue.serverTimestamp(),
        };

        await reportRef.set(reportDoc);

        if (!report.isFallback) {
            await this.trackUsage(userId, buildId, "TECHNICAL_REPORT");
        }

        return { reportId, report, cached: false };
    },

    async getReports(userId: string) {
        try {
            const db = getFirestore();

            const reportsSnapshot = await db.collection("reports")
                .where("userId", "==", userId)
                .orderBy("createdAt", "desc")
                .get();

            return reportsSnapshot.docs.map(doc => doc.data() as AIReport);
        } catch (error: any) {
            if (error.code === 9) {
                console.error("Firestore index missing", error);
                throw new Error("Database index not ready");
            }
            throw error;
        }
    },

    async getReportById(userId: string, reportId: string) {
        const db = getFirestore();

        const docRef = db.collection("reports").doc(reportId);
        const doc = await docRef.get();

        if (!doc.exists) return null;

        const rawData = doc.data()!;
        if (rawData.userId !== userId) throw new Error("UNAUTHORIZED");

        const data = rawData as AIReport;

        // NEW CACHE ARCHITECTURE: Fetch heavy objects securely from Global Cache
        if (!data.engineSnapshot && !data.reportJson && !(data as any).content && data.engineSnapshotHash) {
            const cacheHit = await this.getCachedReport(data.engineSnapshotHash);
            if (cacheHit) {
                data.engineSnapshot = cacheHit.engineSnapshot;
                data.reportJson = cacheHit.reportJson;
            }
        }

        // Handle reports created during the bugged window
        if (!data.engineSnapshot && (data as any).content) {
            if ((data as any).content.analysis) {
                data.reportJson = (data as any).content.analysis;
            } else {
                data.reportJson = (data as any).content;
            }
            data.engineSnapshot = null; // UI handles missing elegantly
        } else if (data.reportJson?.analysis) {
            // Hotfix for newly generated reports saved under the nested tree during buggy window
            data.reportJson = data.reportJson.analysis;
        }

        return data;
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
