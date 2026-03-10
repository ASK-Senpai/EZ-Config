import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/server/firebase/admin";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { SESSION_COOKIE_NAME, SESSION_COOKIE_EXPIRES_IN } from "@/lib/session";
import { cookies } from "next/headers";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const idToken = body.idToken;

        if (!idToken) {
            return NextResponse.json({ error: "UNAUTHORIZED", message: "ID token missing" }, { status: 400 });
        }

        const decodedToken = await adminAuth.verifyIdToken(idToken);

        if (!decodedToken) {
            return NextResponse.json({ error: "UNAUTHORIZED", message: "Invalid ID token" }, { status: 401 });
        }

        const uid = decodedToken.uid;
        const db = getFirestore();
        const userRef = db.collection("users").doc(uid);
        let userDoc;
        try {
            userDoc = await userRef.get();
        } catch (error: any) {
            console.error("Session creation failed during Firestore access:", error);
            return NextResponse.json(
                { error: "AUTH_SESSION_ERROR", message: "Failed to access user data: " + error.message },
                { status: 401 }
            );
        }

        if (!userDoc.exists) {
            try {
                // Calculate reset date (1st of next month)
                const now = new Date();
                const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

                await userRef.set({
                    email: decodedToken.email || "",
                    name: decodedToken.name || null,
                    plan: "free",
                    subscriptionStatus: "active",
                    razorpaySubscriptionId: null,
                    razorpayCustomerId: null,
                    aiLimit: 5,
                    aiUsage: 0,
                    reportUsageMonth: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
                    nextBillingDate: null,
                    role: "user",
                    buildCount: 0,
                    createdAt: FieldValue.serverTimestamp(),
                    updatedAt: FieldValue.serverTimestamp()
                });

                // Analytics: increment global totalUsers
                const globalRef = db.collection("analytics").doc("global");
                await globalRef.set({ totalUsers: FieldValue.increment(1) }, { merge: true });
            } catch (error: any) {
                console.error("Session creation failed during Firestore user creation:", error);
                return NextResponse.json(
                    { error: "AUTH_SESSION_ERROR", message: "Failed to create user data: " + error.message },
                    { status: 401 }
                );
            }
        }

        // Generate session cookie
        const expiresIn = SESSION_COOKIE_EXPIRES_IN;
        const sessionCookie = await adminAuth.createSessionCookie(idToken, { expiresIn });

        const cookieStore = await cookies();

        cookieStore.set(SESSION_COOKIE_NAME, sessionCookie, {
            maxAge: expiresIn,
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            path: "/",
            sameSite: "lax",
        });

        return NextResponse.json({ status: "success" }, { status: 200 });
    } catch (error: any) {
        console.error("Session creation failed:", error);
        return NextResponse.json({ error: "UNAUTHORIZED", message: error.message || "Session verification failed" }, { status: 500 });
    }
}
