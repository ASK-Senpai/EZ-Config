import { notFound } from "next/navigation";
import { Metadata } from "next";
import { getCategoryConfig } from "@/config/categoryConfig";
import { getProductById } from "@/server/products/getProductById";
import { getCpusByVgpu } from "@/server/products/getCpusByVgpu";
import ProductDetailClient from "./ProductDetailClient";

export const runtime = "nodejs";
export const revalidate = 300; // Cache v1 — 5 min ISR

const ALLOWED_CATEGORIES = ["gpu", "cpu", "vgpu", "ram", "psu", "motherboard", "storage"] as const;

type Params = { category: string; id: string };

export async function generateMetadata(
    { params }: { params: Promise<Params> }
): Promise<Metadata> {
    const { category, id } = await params;
    const config = getCategoryConfig(category);
    const product = await getProductById(category, id);

    if (!product) {
        return { title: `${config.label} | EZ-Config` };
    }

    return {
        title: `${product.name} — ${config.label} | EZ-Config`,
        description: `Performance analysis, market intelligence, and build compatibility for the ${product.brand} ${product.name}.`,
    };
}

export default async function ProductDetailPage(
    { params }: { params: Promise<Params> }
) {
    const { category, id } = await params;

    // Guard — only allow known categories
    if (!(ALLOWED_CATEGORIES as readonly string[]).includes(category)) {
        notFound();
    }

    const product = await getProductById(category, id);
    if (!product) notFound();

    const config = getCategoryConfig(category);

    const relatedCpus = category === "vgpu" ? await getCpusByVgpu(id) : undefined;

    return (
        <ProductDetailClient
            product={product}
            category={category}
            relatedCpus={relatedCpus}
        />
    );
}
