"use server";

import { getFirestore } from "firebase-admin/firestore";
import "@/server/firebase/admin";
import {
    computeMarkupPercent,
    computeTopPercentIndex,
    computeValuePerPrice,
} from "@/lib/insights/valueUtils";

export interface GpuMarketItem {
    id: string;
    name: string;
    performanceScore: number;
    msrp: number;
    currentPrice: number;
    launchYear: number;
    valueScore: number;
    markup: number;
    verdict: string;
}

export async function getGpuMarketData(): Promise<GpuMarketItem[]> {
    const db = getFirestore();
    const snapshot = await db
        .collection("components")
        .doc("gpu")
        .collection("items")
        .where("legacy", "==", false)
        .get();

    if (snapshot.empty) return [];

    const gpus = snapshot.docs.map((doc) => {
        const data = doc.data();

        const name = data.name || "Unknown GPU";
        const launchYear = data.launchYear || 2022;
        const performanceScore = data.normalized?.gamingScore ?? data.gamingScore ?? 0;
        const minPrice = data.pricing?.priceRange?.min ?? 0;
        const msrpUSD = data.msrpUSD ?? 0;
        const convertedMsrp = msrpUSD * 83;
        const valueScore = computeValuePerPrice(performanceScore, minPrice);
        const markupPercent = computeMarkupPercent(minPrice, convertedMsrp);

        return {
            id: doc.id,
            name,
            performanceScore,
            msrp: convertedMsrp,
            currentPrice: minPrice,
            launchYear,
            valueScore,
            markup: markupPercent,
        };
    });

    gpus.sort((a, b) => b.valueScore - a.valueScore);

    const total = gpus.length;
    const top20Index = computeTopPercentIndex(total, 0.2);

    return gpus.map((gpu, index) => {
        let verdict = "Balanced";

        if (index < top20Index && gpu.currentPrice > 0) {
            verdict = "Best Value";
        } else if (gpu.markup > 35) {
            verdict = "Overpriced";
        } else if (gpu.markup < -10) {
            verdict = "Fair Deal";
        } else if (gpu.launchYear <= 2021) {
            verdict = "Aging";
        }

        return { ...gpu, verdict };
    });
}
