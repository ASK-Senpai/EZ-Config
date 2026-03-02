import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/server/auth/requireAuth";
import { getFirestore } from "firebase-admin/firestore";

export async function GET(request: NextRequest) {
    try {
        const decodedClaims = await requireAuth();
        const db = getFirestore();
        const userDoc = await db.collection("users").doc(decodedClaims.uid).get();
        const plan = userDoc.exists ? userDoc.data()?.plan || "free" : "free";
        return NextResponse.json({ status: "success", uid: decodedClaims.uid, plan }, { status: 200 });
    } catch (error: any) {
        return NextResponse.json({ error: "UNAUTHORIZED", message: error.message || "Invalid or expired session" }, { status: 401 });
    }
}
