import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/server/auth/requireAuth";
import { aiService } from "@/lib/services/aiService";
import { getFirestore } from "firebase-admin/firestore";

export const runtime = "nodejs";

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const decodedUser = await requireAuth();
        const userId = decodedUser.uid;
        const { id: reportId } = await params;

        const report = await aiService.getReportById(userId, reportId);

        if (!report) {
            return NextResponse.json({ error: "NOT_FOUND", message: "Report not found." }, { status: 404 });
        }

        return NextResponse.json({ report }, { status: 200 });
    } catch (error: any) {
        if (error.message === "UNAUTHORIZED") {
            return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 403 });
        }
        console.error("Fetch Report By Id Error:", error);
        return NextResponse.json({ error: "INTERNAL_SERVER_ERROR" }, { status: 500 });
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const decodedUser = await requireAuth();
        const userId = decodedUser.uid;
        const { id: reportId } = await params;

        const db = getFirestore();
        const reportRef = db.collection("reports").doc(reportId);
        const reportDoc = await reportRef.get();

        if (!reportDoc.exists) {
            return NextResponse.json({ error: "NOT_FOUND", message: "Report not found." }, { status: 404 });
        }

        // Ownership check
        if (reportDoc.data()?.userId !== userId) {
            return NextResponse.json({ error: "FORBIDDEN", message: "You do not have permission to delete this report." }, { status: 403 });
        }

        // Delete only the user pointer — report_cache is shared and must remain intact
        await reportRef.delete();

        return NextResponse.json({ success: true }, { status: 200 });
    } catch (error: any) {
        if (error.message === "UNAUTHORIZED") {
            return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
        }
        console.error("Delete report error:", error);
        return NextResponse.json({ error: "INTERNAL_SERVER_ERROR" }, { status: 500 });
    }
}
