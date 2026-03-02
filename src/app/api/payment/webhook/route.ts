import { NextRequest } from "next/server";
import { POST as billingWebhookPost } from "@/app/api/billing/webhook/route";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
    return billingWebhookPost(request);
}
