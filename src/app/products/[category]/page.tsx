import { Metadata } from "next";
import { notFound } from "next/navigation";
import { getProducts } from "@/server/products/getProducts";
import { GetProductsOptions, SORT_FIELD_MAP, SortBy, SortDir } from "@/lib/products/options";
import { searchProducts } from "@/lib/search/searchService";
import ProductPageLayout from "@/components/product/ProductPageLayout";
import { fetchMoreProductsAction } from "./actions";
import type { BaseProduct } from "@/lib/products/types";

export const runtime = "nodejs";
export const revalidate = 300;

const ALLOWED_CATEGORIES = ["gpu", "cpu", "ram", "psu", "motherboard", "vgpu", "storage"] as const;
type Category = typeof ALLOWED_CATEGORIES[number];

const METADATA: Record<Category, { title: string; description: string }> = {
    gpu: { title: "GPU Intelligence | EZ-Config", description: "Compare graphics cards by performance, price, and value score." },
    cpu: { title: "CPU Intelligence | EZ-Config", description: "Compare processors by gaming and productivity performance." },
    ram: { title: "RAM Intelligence | EZ-Config", description: "Compare memory kits by speed, capacity, and value." },
    psu: { title: "PSU Intelligence | EZ-Config", description: "Find the right power supply for your build." },
    motherboard: {
        title: "Motherboards - EZ-Config",
        description: "Compare and find the perfect Motherboard for your build.",
    },
    storage: {
        title: "Storage - EZ-Config",
        description: "Compare reliable NVMe and SATA SSD storage for your PC build.",
    },
    vgpu: { title: "Integrated GPU Intelligence | EZ-Config", description: "Compare integrated graphics by performance tier on the unified 1000-anchor scale." },
};

type PageProps = {
    params: Promise<{ category: string }>;
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { category } = await params;
    const meta = METADATA[category as Category];
    if (!meta) return { title: "Products | EZ-Config" };
    return { title: meta.title, description: meta.description };
}

export default async function CategoryProductsPage({ params, searchParams }: PageProps) {
    const { category } = await params;
    if (!ALLOWED_CATEGORIES.includes(category as Category)) notFound();

    const sp = await searchParams;
    const search = typeof sp.search === "string" ? sp.search.trim() : "";
    const brand = typeof sp.brand === "string" ? sp.brand : undefined;
    const defaultSortForCategory = (category === "motherboard" || category === "ram" || category === "storage" || category === "psu") ? "price" : "gamingScore";
    const sort = (typeof sp.sort === "string" ? sp.sort : defaultSortForCategory) as SortBy;
    const defaultDir = SORT_FIELD_MAP[sort]?.defaultDir ?? "desc";
    const dir = (sp.dir === "asc" || sp.dir === "desc") ? sp.dir : defaultDir;
    const inStock = sp.stock === "true";
    const apu = sp.apu === "true";

    const ramType = typeof sp.ramType === "string" ? sp.ramType : undefined;
    const ramCapacity = typeof sp.ramCapacity === "string" ? parseInt(sp.ramCapacity, 10) : undefined;
    const ramSpeed = typeof sp.ramSpeed === "string" ? parseInt(sp.ramSpeed, 10) : undefined;

    const storageType = typeof sp.storageType === "string" ? sp.storageType : undefined;
    const pcieGen = typeof sp.pcieGen === "string" ? parseInt(sp.pcieGen, 10) : undefined;

    let initialProducts: BaseProduct[] = [];
    let nextCursor: string | null = null;
    let searchTotal: number | null = null;

    if (search) {
        // ── Search path → Algolia ─────────────────────────────────────────────
        const result = await searchProducts({
            query: search,
            category,
            brand,
            hasIntegratedGraphics: apu || undefined,
            sortBy: sort as any,
            sortDir: dir as any,
            page: 0,
            limit: 20,
        });
        initialProducts = result.hits as unknown as BaseProduct[];
        searchTotal = result.nbHits;
    } else {
        // ── Browse path → Firestore cursor-based pagination ───────────────────
        const r = await getProducts({
            category,
            brand,
            hasIntegratedGraphics: apu || undefined,
            sortBy: sort,
            sortDir: dir,
            inStockOnly: inStock,
            limit: 20,
            ramType,
            ramCapacity,
            ramSpeed,
            storageType,
            pcieGen,
        });
        initialProducts = r.products;
        nextCursor = r.nextCursor;
    }

    const layoutOptions: GetProductsOptions = {
        category,
        brand,
        hasIntegratedGraphics: apu || undefined,
        sortBy: sort,
        sortDir: dir,
        inStockOnly: inStock,
        limit: 20,
        ramType,
        ramCapacity,
        ramSpeed,
        storageType,
        pcieGen,
    };

    return (
        <div className="w-full max-w-7xl mx-auto px-4 py-8 pt-20">
            <ProductPageLayout
                category={category}
                initialProducts={initialProducts}
                initialCursor={nextCursor}
                initialOptions={layoutOptions}
                initialSearch={search}
                searchTotal={searchTotal}
                fetchMoreAction={fetchMoreProductsAction}
            />
        </div>
    );
}
