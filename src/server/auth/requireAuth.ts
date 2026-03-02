import "server-only";
import { adminAuth } from "@/server/firebase/admin";
import { SESSION_COOKIE_NAME } from "@/lib/session";
import { cookies } from "next/headers";
import type { DecodedIdToken } from "firebase-admin/auth";

export async function requireAuth(): Promise<DecodedIdToken> {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    if (!sessionCookie) {
        throw new Error("UNAUTHORIZED");
    }

    try {
        const decodedClaims = await adminAuth.verifySessionCookie(sessionCookie, true);
        return decodedClaims;
    } catch (error) {
        throw new Error("UNAUTHORIZED");
    }
}
