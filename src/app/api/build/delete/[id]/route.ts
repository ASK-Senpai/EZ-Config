import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/server/auth/requireAuth";
import { buildService } from "@/lib/services/buildService";

export const runtime = "nodejs";

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const decodedUser = await requireAuth();
        const userId = decodedUser.uid;

        const { id: buildId } = await params;

        if (!buildId) {
            return NextResponse.json({ error: "BAD_REQUEST", message: "Build ID is required." }, { status: 400 });
        }

        await buildService.deleteBuild(userId, buildId);

        return NextResponse.json({ status: "success", message: "Build deleted successfully" }, { status: 200 });

    } catch (error: any) {
        if (error.message === "UNAUTHORIZED") {
            return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
        }
        if (error.message === "NOT_FOUND") {
            return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
        }

        console.error("Failed to delete build:", error);
        return NextResponse.json({ error: "INTERNAL_SERVER_ERROR" }, { status: 500 });
    }
}

