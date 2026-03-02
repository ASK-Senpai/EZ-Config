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
        const userDoc = await userRef.get();

        if (!userDoc.exists) {
            await userRef.set({
                email: decodedToken.email || "",
                name: decodedToken.name || null,
                plan: "free",
                subscriptionStatus: "inactive",
                subscriptionId: null,
                razorpayCustomerId: null,
                aiUsage: 0,
                aiLimit: 5,
                premiumSince: null,
                buildCount: 0,
                createdAt: FieldValue.serverTimestamp(),
                updatedAt: FieldValue.serverTimestamp()
            });

            // Analytics: increment global totalUsers
            const globalRef = db.collection("analytics").doc("global");
            await globalRef.set({ totalUsers: FieldValue.increment(1) }, { merge: true });
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
