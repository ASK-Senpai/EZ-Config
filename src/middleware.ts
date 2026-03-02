import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE_NAME } from "./lib/session";

const protectedRoutes = ["/dashboard", "/builder", "/compare", "/upgrade"];
const publicRoutes = ["/login", "/register", "/", "/about", "/contact", "/privacy", "/terms"];

export default function middleware(request: NextRequest) {
    if (request.nextUrl.pathname.startsWith("/api")) {
        return NextResponse.next();
    }

    const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    const isProtectedRoute = protectedRoutes.some((route) => request.nextUrl.pathname.startsWith(route));
    const isPublicRoute = publicRoutes.includes(request.nextUrl.pathname);

    // If trying to access a protected UI route without a cookie -> login
    if (!sessionCookie && isProtectedRoute) {
        const loginUrl = new URL("/login", request.url);
        loginUrl.searchParams.set("from", request.nextUrl.pathname);
        return NextResponse.redirect(loginUrl);
    }

    // If logged in and hitting login/register -> dashboard
    if (sessionCookie && (request.nextUrl.pathname === "/login" || request.nextUrl.pathname === "/register")) {
        return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        "/((?!api|_next/static|_next/image|favicon.ico).*)",
    ],
};
