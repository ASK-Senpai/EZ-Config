"use server";

import { getProducts } from "@/server/products/getProducts";
import { GetProductsOptions } from "@/lib/products/options";

export async function fetchMoreProductsAction(options: GetProductsOptions) {
    return await getProducts(options);
}
