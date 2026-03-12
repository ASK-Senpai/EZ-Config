import { NextResponse } from "next/server";
import admin, { adminDb } from "@/lib/firebaseAdmin";
import { requireAuth } from "@/server/auth/requireAuth";
import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME } from "@/lib/session";

async function deleteByQuery(query: FirebaseFirestore.Query, batchSize = 450) {
  while (true) {
    const snapshot = await query.limit(batchSize).get();
    if (snapshot.empty) break;

    const batch = adminDb.batch();
    snapshot.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();

    if (snapshot.size < batchSize) break;
  }
}

export async function POST(req: Request) {
  try {
    const decoded = await requireAuth();
    const { uid } = await req.json();

    if (!uid) {
      return NextResponse.json({ error: "Missing uid" }, { status: 400 });
    }

    if (decoded.uid !== uid) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const userRef = adminDb.collection("users").doc(uid);
    await userRef.delete();

    await deleteByQuery(
      adminDb.collection("builds").where("userId", "==", uid)
    );

    await deleteByQuery(
      adminDb.collection("reports").where("userId", "==", uid)
    );

    await deleteByQuery(
      adminDb.collection("subscriptions").where("uid", "==", uid)
    );

    await deleteByQuery(
      adminDb.collection("payments").where("userId", "==", uid)
    );

    await deleteByQuery(
      adminDb.collection("payments").where("uid", "==", uid)
    );

    await adminDb.collection("analytics_users").doc(uid).delete();

    await deleteByQuery(
      adminDb.collection("usageLogs").where("userId", "==", uid)
    );

    await admin.auth().deleteUser(uid);

    const cookieStore = await cookies();
    cookieStore.delete(SESSION_COOKIE_NAME);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete account error:", error);

    if ((error as Error)?.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    return NextResponse.json(
      { error: "Failed to delete account" },
      { status: 500 }
    );
  }
}
