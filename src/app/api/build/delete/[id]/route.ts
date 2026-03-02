import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/server/auth/requireAuth";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

export const runtime = "nodejs";

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> } // In Next.js App Router, params is officially a Promise you await
) {
    try {
        const decodedUser = await requireAuth();
        const userId = decodedUser.uid;

        // Wait for dynamic segment parameter resolution correctly
        const resolvedParams = await params;
        const buildId = resolvedParams.id;

        if (!buildId) {
            return NextResponse.json({ error: "BAD_REQUEST", message: "Build ID is required." }, { status: 400 });
        }

        const db = getFirestore();
        const buildRef = db.collection("builds").doc(buildId);
        const buildDoc = await buildRef.get();

        if (!buildDoc.exists) {
            return NextResponse.json({ error: "NOT_FOUND", message: "Build not found." }, { status: 404 });
        }

        const buildData = buildDoc.data()!;

        // Security check: ensure the build belongs to the requesting user
        if (buildData.userId !== userId) {
            return NextResponse.json({ error: "FORBIDDEN", message: "You do not have permission to delete this build." }, { status: 403 });
        }

        // Delete build
        await buildRef.delete();

        // Optional: Decrement user buildCount
        await db.collection("users").doc(userId).update({
            buildCount: FieldValue.increment(-1),
            updatedAt: FieldValue.serverTimestamp()
        });

        return NextResponse.json({ status: "success", message: "Build deleted successfully" }, { status: 200 });

    } catch (error: any) {
        if (error.message === "UNAUTHORIZED") {
            return NextResponse.json({ error: "UNAUTHORIZED", message: "Missing or invalid session" }, { status: 401 });
        }

        console.error("Failed to delete build:", error);
        return NextResponse.json({ error: "INTERNAL_SERVER_ERROR", message: "An unexpected error occurred." }, { status: 500 });
    }
}
