import { NextRequest } from "next/server";
import { POST as billingVerifyPost } from "@/app/api/billing/verify/route";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
    return billingVerifyPost(request);
}
