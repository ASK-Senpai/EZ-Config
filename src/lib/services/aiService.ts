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

        await db.runTransaction(async (tx) => {
            const userDoc = await tx.get(userRef);
            if (!userDoc.exists) throw new Error("User not found");
            const data = userDoc.data()!;

            let aiLimit = data.aiLimit ?? 5;
            let aiUsage = data.aiUsage ?? 0;
            const now = new Date();
            const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
            let reportUsageMonth = data.reportUsageMonth || currentMonthKey;

            // 1. Check for Reset Cycle (Month Rollover)
            // If the user's stored usage month doesn't match the current calendar month,
            // we confidently reset their usage.
            if (reportUsageMonth !== currentMonthKey) {
                aiUsage = 0;
                reportUsageMonth = currentMonthKey;
                console.info(`[AI SERVICE] Automatically reset usage for user ${userId} for new month ${currentMonthKey}`);
            }

            // 2. Exact Validation (Dynamically Compute Remaining)
            const remaining = aiLimit - aiUsage;
            if (remaining <= 0 || aiUsage >= aiLimit) {
                throw new Error("INSUFFICIENT_CREDITS");
            }

            // 3. Increment Usage explicitly
            aiUsage += 1;

            tx.set(userRef, {
                aiUsage,
                reportUsageMonth,
                updatedAt: FieldValue.serverTimestamp(),
                // Cleanup old nested fields if they exist
                subscription: FieldValue.delete(),
                credits: FieldValue.delete(),
                aiUsageRemaining: FieldValue.delete()
            }, { merge: true });

            // Enforce Exact Request 9 Layout for Logs
            const logRef = db.collection("usageLogs").doc();
            tx.set(logRef, {
                userId,
                action: "ai_report",
                timestamp: FieldValue.serverTimestamp(),
                buildId
            });
        });
    },

    async getUserReportForBuild(userId: string, buildId: string): Promise<{ id: string; engineSnapshotHash: string } | null> {
        const db = getFirestore();
        const snapshot = await db.collection("reports")
            .where("userId", "==", userId)
            .where("buildId", "==", buildId)
            .limit(1)
            .get();
        if (snapshot.empty) return null;
        const data = snapshot.docs[0].data();
        return { id: snapshot.docs[0].id, engineSnapshotHash: data.engineSnapshotHash };
    },

    async generateAndTrack(userId: string, buildId: string, buildInput: BuildInput, analysis: any, buildName?: string) {
        // Pre-flight check: Does the user have credits available?
        // (We do this outside the transaction first to fail fast before doing Groq calls)
        const db = getFirestore();
        const userDocRef = await db.collection("users").doc(userId).get();
        if (userDocRef.exists) {
            const data = userDocRef.data()!;
            const aiLimit = data.aiLimit ?? 5;
            const aiUsage = data.aiUsage ?? 0;
            const reportUsageMonth = data.reportUsageMonth;

            const now = new Date();
            const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

            // If the month rolled over, they technically have full credits returning.
            // Let the transaction process the reset.
            const needsReset = (reportUsageMonth !== currentMonthKey);
            const remaining = aiLimit - aiUsage;

            if (!needsReset && remaining <= 0) {
                throw new Error("INSUFFICIENT_CREDITS");
            }
        }

        const engineSnapshotHash = this.computeHash(buildInput, analysis);

        // ── Dedup Check 1: Same user already has a report for this exact build ──
        const existingUserReport = await this.getUserReportForBuild(userId, buildId);
        if (existingUserReport) {
            console.log(`[REPORT] Dedup: user ${userId} already has report ${existingUserReport.id} for build ${buildId}`);
            const cacheData = await this.getCachedReport(existingUserReport.engineSnapshotHash);
            return {
                reportId: existingUserReport.id,
                report: cacheData?.reportJson ?? null,
                cached: true,
            };
        }

        // ── Dedup Check 2: Global report_cache hit (same config, different user) ──
        const cached = await this.getCachedReport(engineSnapshotHash);


        const reportRef = db.collection("reports").doc();
        const reportId = reportRef.id;

        if (cached) {
            console.log(`[REPORT] Cache HIT for hash: ${engineSnapshotHash} — skipping Groq AI call`);
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

        // ── Cache MISS: call Groq AI ──
        console.log(`[REPORT] Cache MISS for hash: ${engineSnapshotHash} — calling Groq AI`);
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

        // Save to Global Cache
        const cacheRef = db.collection("report_cache").doc(engineSnapshotHash);
        await cacheRef.set({
            engineSnapshotHash,
            summary,
            engineSnapshot: analysis,
            reportJson: report,
            createdAt: FieldValue.serverTimestamp()
        });

        // Save User Reference Pointer
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
        const aiLimit = data.aiLimit ?? 5;
        const aiUsage = data.aiUsage ?? 0;
        const remaining = aiLimit - aiUsage;

        return {
            used: aiUsage,
            limit: aiLimit,
            remaining: remaining
        };
    }
};
