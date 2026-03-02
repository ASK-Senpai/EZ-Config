import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/server/auth/requireAuth";
import { getFirestore } from "firebase-admin/firestore";
import { isFeatureEnabled } from "@/lib/featureFlags";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
    try {
        const decodedUser = await requireAuth();
        const userId = decodedUser.uid;

        const db = getFirestore();
        const userDoc = await db.collection("users").doc(userId).get();
        const plan = userDoc.exists ? userDoc.data()?.plan || "free" : "free";

        if (!isFeatureEnabled("COMPARE_BUILDS", plan)) {
            return NextResponse.json(
                { error: "PREMIUM_REQUIRED", message: "Upgrade required" },
                { status: 403 }
            );
        }

        const snapshot = await db.collection("builds").where("userId", "==", userId).get();

        const builds = snapshot.docs
            .map((doc) => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data,
                    createdAt: data.createdAt ? data.createdAt.toDate().toISOString() : null,
                    updatedAt: data.updatedAt ? data.updatedAt.toDate().toISOString() : null,
                };
            })
            .sort((a, b) => {
                const dateA = a.createdAt ? new Date(a.createdAt as string).getTime() : 0;
                const dateB = b.createdAt ? new Date(b.createdAt as string).getTime() : 0;
                return dateB - dateA;
            });

        return NextResponse.json({ status: "success", plan, builds }, { status: 200 });
    } catch (error: any) {
        if (error.message === "UNAUTHORIZED") {
            return NextResponse.json(
                { error: "UNAUTHORIZED", message: "Missing or invalid session" },
                { status: 401 }
            );
        }

        console.error("Failed to load compare builds:", error);
        return NextResponse.json(
            { error: "INTERNAL_SERVER_ERROR", message: "An unexpected error occurred." },
            { status: 500 }
        );
    }
}