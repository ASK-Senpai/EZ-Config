import { getFirestore } from "firebase-admin/firestore";
import { notFound, redirect } from "next/navigation";
import { requireAuth } from "@/server/auth/requireAuth";
import { SectionContainer } from "@/components/ui/SectionContainer";
import { BuildReportView } from "@/components/features/report/BuildReportView";
import { serializeFirestoreData } from "@/server/utils/serializeFirestore";

async function hydrateBuildComponents(db: FirebaseFirestore.Firestore, buildId: string) {
    const buildDoc = await db.collection("builds").doc(buildId).get();
    if (!buildDoc.exists) return {};
    const buildData = buildDoc.data() as any;
    const componentIds = buildData?.components || {};

    const typeMap: Record<string, string> = {
        cpu: componentIds.cpuId,
        gpu: componentIds.gpuId,
        motherboard: componentIds.motherboardId,
        ram: componentIds.ramId,
        storage: componentIds.storageId,
        psu: componentIds.psuId,
    };

    const result: Record<string, any> = {};
    for (const [type, id] of Object.entries(typeMap)) {
        if (!id) continue;
        const snap = await db.collection("components").doc(type).collection("items").doc(id).get();
        if (snap.exists) {
            result[type] = { id: snap.id, ...snap.data() };
        }
    }
    return result;
}

export default async function BuildReportPage({
    params,
}: {
    params: Promise<{ reportId: string }>;
}) {
    const decoded = await requireAuth();
    const userId = decoded.uid;
    const { reportId } = await params;

    if (!reportId) notFound();

    const db = getFirestore();
    const reportDoc = await db.collection("build_reports").doc(reportId).get();
    if (!reportDoc.exists) notFound();

    const report = reportDoc.data() as any;
    if (report.userId !== userId) {
        redirect("/dashboard");
    }

    const cleanReport = serializeFirestoreData(report);
    const cleanComponents = serializeFirestoreData(await hydrateBuildComponents(db, report.buildId));
    const createdAt = cleanReport.createdAt ? new Date(cleanReport.createdAt) : new Date();
    const generatedDate = createdAt.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
    });

    return (
        <div className="min-h-screen bg-background text-foreground pb-24">
            <SectionContainer className="py-12 md:py-16">
                <BuildReportView
                    reportJson={cleanReport.reportJson || {}}
                    engineSnapshot={cleanReport.engineSnapshot || {}}
                    generatedDate={generatedDate}
                    components={cleanComponents}
                />
            </SectionContainer>
        </div>
    );
}
