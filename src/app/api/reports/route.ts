import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/server/auth/requireAuth";
import { aiService } from "@/lib/services/aiService";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
    try {
        const decodedUser = await requireAuth();
        const userId = decodedUser.uid;

        const reports = await aiService.getReports(userId);

        return NextResponse.json({ reports }, { status: 200 });
    } catch (error: any) {
        if (error.message === "UNAUTHORIZED") {
            return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
        }
        if (error.message === "Database index not ready") {
            return NextResponse.json(
                { error: "DATABASE_ERROR", message: "Database index not ready" },
                { status: 503 }
            );
        }
        console.error("Fetch Reports Error:", error);
        return NextResponse.json({ error: "INTERNAL_SERVER_ERROR" }, { status: 500 });

    }
}
