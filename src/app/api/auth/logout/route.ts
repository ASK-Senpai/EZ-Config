import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/session";
import { cookies } from "next/headers";

export async function POST(request: NextRequest) {
    const CookieStore = await cookies();
    CookieStore.delete(SESSION_COOKIE_NAME);

    return NextResponse.json({ status: "success" }, { status: 200 });
}
