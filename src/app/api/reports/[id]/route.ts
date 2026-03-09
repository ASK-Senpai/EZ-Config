import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/server/auth/requireAuth";
import { aiService } from "@/lib/services/aiService";

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
