import { NextRequest, NextResponse } from "next/server";
import { searchProducts } from "@/lib/search/searchService";

/**
 * GET /api/search?q=ryzen&category=cpu&brand=AMD&sortBy=gamingScore&sortDir=desc&limit=12
 *
 * Server-side search route — keeps ALGOLIA_ADMIN_KEY off the client.
 * The searchService uses the public SEARCH_KEY which is also safe,
 * but routing through an API route lets us add rate-limiting later.
 */
export async function GET(req: NextRequest) {
    const sp = req.nextUrl.searchParams;

    const query = sp.get("q") ?? "";
    const category = sp.get("category") ?? undefined;
    const brand = sp.get("brand") ?? undefined;
    const sortBy = (sp.get("sortBy") as any) ?? "gamingScore";
    const sortDir = (sp.get("sortDir") as "asc" | "desc") ?? "desc";
    const page = parseInt(sp.get("page") ?? "0", 10);
    const limit = Math.min(parseInt(sp.get("limit") ?? "20", 10), 50); // cap at 50

    try {
        const result = await searchProducts({
            query,
            category,
            brand,
            sortBy,
            sortDir,
            page,
            limit,
        });
        return NextResponse.json(result, {
            headers: {
                "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
            },
        });
    } catch (err) {
        console.error("[/api/search] error:", err);
        return NextResponse.json(
            { error: "Search failed", hits: [], nbHits: 0, page: 0, nbPages: 0 },
            { status: 500 }
        );
    }
}
