import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/server/auth/requireAuth";
import { userService } from "@/lib/services/userService";

export const runtime = "nodejs";

export async function PATCH(request: NextRequest) {
    try {
        const decodedUser = await requireAuth();
        const userId = decodedUser.uid;

        const body = await request.json();
        const { displayName } = body;

        await userService.updateUser(userId, { displayName });

        return NextResponse.json({ status: "success" }, { status: 200 });

    } catch (error: any) {
        if (error.message === "UNAUTHORIZED") {
            return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
        }
        console.error("Profile update error:", error);
        return NextResponse.json({ error: "INTERNAL_SERVER_ERROR" }, { status: 500 });
    }
}
