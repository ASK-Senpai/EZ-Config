import { NextRequest, NextResponse } from "next/server";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { scrapePrice } from "@/lib/cron/scrapePrice";

export const runtime = "nodejs";
export const maxDuration = 10;

const MAX_ITEMS = 20;

export async function GET(req: NextRequest) {
    const secret = req.headers.get("x-cron-secret");
    if (!secret || secret !== process.env.CRON_SECRET) {
        return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    const db = getFirestore();
    const snapshot = await db
        .collection("components")
        .doc("gpu")
        .collection("items")
        .limit(MAX_ITEMS)
        .get();

    const results: { id: string; name: string; status: string; price?: number }[] = [];

    for (const doc of snapshot.docs) {
        const data = doc.data();
        const name: string = data.name || doc.id;

        const { price, matched } = await scrapePrice(name);

        if (!matched || price === null) {
            results.push({ id: doc.id, name, status: "skipped" });
            continue;
        }

        await db
            .collection("components")
            .doc("gpu")
            .collection("items")
            .doc(doc.id)
            .update({
                pricing: {
                    currency: "INR",
                    currentPrice: price,
                    store: "mdcomputers",
                    lastUpdated: FieldValue.serverTimestamp(),
                },
            });

        results.push({ id: doc.id, name, status: "updated", price });
    }

    return NextResponse.json({
        type: "gpu",
        processed: results.length,
        updated: results.filter(r => r.status === "updated").length,
        skipped: results.filter(r => r.status === "skipped").length,
        results,
    });
}
