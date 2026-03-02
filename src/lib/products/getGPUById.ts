import "server-only";
import { GPUProduct } from "./types";
import { getAllGPUsCached } from "../data/loaders";

export async function getGPUById(id: string): Promise<GPUProduct | null> {
    const all = await getAllGPUsCached();
    return all.find(g => g.id === id) || null;
}
