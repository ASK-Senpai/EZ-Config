import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/server/auth/requireAuth";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { nanoid } from "nanoid";

export const runtime = "nodejs";

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const decodedUser = await requireAuth();
        const userId = decodedUser.uid;

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

        if (buildData.userId !== userId) {
            return NextResponse.json({ error: "FORBIDDEN", message: "You do not have permission to access this build." }, { status: 403 });
        }

        // If already public
        if (buildData.isPublic && buildData.publicId) {
            return NextResponse.json({ status: "success", publicId: buildData.publicId }, { status: 200 });
        }

        // Generate sharing ID and update
        const publicId = nanoid(12);

        await buildRef.update({
            isPublic: true,
            publicId: publicId,
            sharedAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp()
        });

        return NextResponse.json({ status: "success", publicId }, { status: 200 });

    } catch (error: any) {
        if (error.message === "UNAUTHORIZED") {
            return NextResponse.json({ error: "UNAUTHORIZED", message: "Missing or invalid session" }, { status: 401 });
        }

        console.error("Failed to share build:", error);
        return NextResponse.json({ error: "INTERNAL_SERVER_ERROR", message: "An unexpected error occurred." }, { status: 500 });
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const decodedUser = await requireAuth();
        const userId = decodedUser.uid;

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

        if (buildData.userId !== userId) {
            return NextResponse.json({ error: "FORBIDDEN", message: "You do not have permission to access this build." }, { status: 403 });
        }

        await buildRef.update({
            isPublic: false,
            publicId: null,
            updatedAt: FieldValue.serverTimestamp()
        });

        return NextResponse.json({ status: "success", message: "Build is no longer public." }, { status: 200 });

    } catch (error: any) {
        if (error.message === "UNAUTHORIZED") {
            return NextResponse.json({ error: "UNAUTHORIZED", message: "Missing or invalid session" }, { status: 401 });
        }

        console.error("Failed to disable sharing:", error);
        return NextResponse.json({ error: "INTERNAL_SERVER_ERROR", message: "An unexpected error occurred." }, { status: 500 });
    }
}
