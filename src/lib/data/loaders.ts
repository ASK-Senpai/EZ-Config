import "server-only";
import { cache } from "react";
import { adminDb } from "@/server/firebase/adminDb";
import { GPUProduct, CPUProduct } from "../products/types";
import { sanitize } from "@/server/firestore/sanitize";

export function generateSearchTokens(item: any): string[] {
    const tokens = new Set<string>();

    const addToken = (str?: string) => {
        if (!str) return;
        const lower = str.toLowerCase();
        tokens.add(lower);

        const words = lower.split(/[^a-z0-9]+/);
        words.forEach(w => { if (w.length > 1) tokens.add(w) });

        const concat = words.join("");
        if (concat.length > 2) tokens.add(concat);
    };

    addToken(item.name);
    addToken(item.brand);
    if (item.architecture) addToken(item.architecture);

    const matches = item.name?.match(/\d+/g);
    if (matches) {
        matches.forEach((m: string) => tokens.add(m));
    }

    return Array.from(tokens);
}

export const getAllGPUsCached = cache(async (): Promise<GPUProduct[]> => {
    console.log("Fetching GPUs from Firestore...");
    const snapshot = await adminDb.collection("components").doc("gpu").collection("items")
        .where("legacy", "==", false)
        .get();

    const gpus: GPUProduct[] = [];
    snapshot.forEach((doc) => {
        const data = sanitize(doc.data()) as any;
        if (!data.searchTokens) {
            data.searchTokens = generateSearchTokens(data);
        } else {
            data.searchTokens = data.searchTokens.map((t: string) => t.toLowerCase());
        }
        gpus.push({ id: doc.id, ...data } as GPUProduct);
    });

    return gpus;
});

export const getAllCPUsCached = cache(async (): Promise<CPUProduct[]> => {
    console.log("Fetching CPUs from Firestore...");
    const snapshot = await adminDb.collection("components").doc("cpu").collection("items")
        .where("legacy", "==", false)
        .get();

    const cpus: CPUProduct[] = [];
    snapshot.forEach((doc) => {
        const data = sanitize(doc.data()) as any;
        if (!data.searchTokens) {
            data.searchTokens = generateSearchTokens(data);
        } else {
            data.searchTokens = data.searchTokens.map((t: string) => t.toLowerCase());
        }
        cpus.push({ id: doc.id, ...data } as CPUProduct);
    });

    return cpus;
});
