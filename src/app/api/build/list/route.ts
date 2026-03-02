import { NextRequest, NextResponse } from "next/server";
import admin, { adminDb } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
    try {
        console.log("BUILD LIST API HIT");

        const authHeader = req.headers.get("authorization");
        if (!authHeader) {
            return NextResponse.json({ error: "No token" }, { status: 401 });
        }

        const token = authHeader.replace("Bearer ", "");
        const decoded = await admin.auth().verifyIdToken(token);

        const userDoc = await adminDb
            .collection("users")
            .doc(decoded.uid)
            .get();
        const userData = userDoc.exists ? (userDoc.data() as Record<string, any>) : {};

        const plan = userData?.plan || "free";
        const status = userData?.subscriptionStatus || "inactive";
        const aiUsage = Number(
            userData?.aiUsage ??
            userData?.monthlyReportUsage ??
            userData?.monthlyCount ??
            0
        );
        const aiLimit = Number(
            userData?.aiLimit ??
            (plan === "premium" ? 50 : 5)
        );

        const snapshot = await adminDb
            .collection("builds")
            .where("userId", "==", decoded.uid)
            .get();

        const builds = snapshot.docs.map((doc) => {
            const data = doc.data() as Record<string, any>;
            const createdAt = data.createdAt?.toDate?.() || null;
            const updatedAt = data.updatedAt?.toDate?.() || null;
            return {
                id: doc.id,
                ...data,
                createdAt: createdAt ? createdAt.toISOString() : null,
                updatedAt: updatedAt ? updatedAt.toISOString() : null,
            };
        });

        return NextResponse.json({
            success: true,
            builds,
            subscription: {
                plan,
                status,
                aiUsage,
                aiLimit,
            },
        });
    } catch (error) {
        console.error(error);
        return NextResponse.json(
            { error: "Server error" },
            { status: 500 }
        );
    }
}
