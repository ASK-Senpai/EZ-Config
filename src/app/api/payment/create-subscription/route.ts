import { NextRequest } from "next/server";
import { POST as billingCreateSubscriptionPost } from "@/app/api/billing/create-subscription/route";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
    return billingCreateSubscriptionPost(request);
}
