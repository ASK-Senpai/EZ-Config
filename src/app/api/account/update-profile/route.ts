import { NextResponse } from "next/server";
import admin, { adminDb } from "@/lib/firebaseAdmin";
import { requireAuth } from "@/server/auth/requireAuth";

export async function POST(req: Request) {
  try {
    const decoded = await requireAuth();
    const { uid, displayName } = await req.json();

    if (!uid || !displayName) {
      return NextResponse.json({ error: "Missing data" }, { status: 400 });
    }

    if (decoded.uid !== uid) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const trimmedName = String(displayName).trim();
    if (!trimmedName) {
      return NextResponse.json({ error: "Missing data" }, { status: 400 });
    }

    await admin.auth().updateUser(uid, {
      displayName: trimmedName,
    });

    await adminDb.collection("users").doc(uid).set(
      {
        displayName: trimmedName,
        updatedAt: new Date(),
      },
      { merge: true }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Profile update error:", error);

    if ((error as Error)?.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 }
    );
  }
}
