"use server";

import { getFirestore } from "firebase-admin/firestore";
import "@/server/firebase/admin";
import {
    computeMarkupPercent,
    computeTopPercentIndex,
    computeValuePerPrice,
} from "@/lib/insights/valueUtils";

export interface CpuMarketInsightItem {
    id: string;
    name: string;
    gamingScore: number;
    productivityScore: number;
    price: number;
    platformTier: "High" | "Medium" | "Low";
    valueScore: number;
    verdict: string;
    msrp: number;
    markup: number;
    socket: string;
    ramType: string;
}

function computePlatformTier(socket: string): "High" | "Medium" | "Low" {
    if (socket === "AM5") return "High";
    if (socket === "LGA1700") return "Medium";
    return "Low";
}

function computeLongevityModifier(platformTier: "High" | "Medium" | "Low", ramType: string): number {
    const base = platformTier === "High" ? 1 : platformTier === "Medium" ? 0.7 : 0.4;
    const ddr5Bonus = ramType.toUpperCase() === "DDR5" ? 0.2 : 0;
    return Math.min(1.2, base + ddr5Bonus);
}

export async function getCpuMarketInsights(): Promise<CpuMarketInsightItem[]> {
    const db = getFirestore();
    const snapshot = await db
        .collection("components")
        .doc("cpu")
        .collection("items")
        .where("legacy", "==", false)
        .get();

    if (snapshot.empty) return [];

    const cpus = snapshot.docs
        .map((doc) => {
            const data = doc.data();
            const price = data.pricing?.priceRange?.min ?? 0;
            if (!Number.isFinite(price) || price <= 0) return null;

            const gamingScore = data.normalized?.gamingScore ?? data.gamingScore ?? 0;
            const productivityScore = data.normalized?.productivityScore ?? data.productivityScore ?? 0;
            const socket = data.socket || "";
            const ramType = data.memoryType || data.ramType || data.supportedRamType || "";
            const platformTier = computePlatformTier(socket);
            const longevityModifier = computeLongevityModifier(platformTier, String(ramType));
            const gamingValue = computeValuePerPrice(gamingScore, price);
            const productivityValue = computeValuePerPrice(productivityScore, price);
            const overallValueScore = (0.5 * gamingValue) + (0.3 * productivityValue) + (0.2 * longevityModifier);
            const msrpUSD = data.msrpUSD ?? 0;
            const convertedMsrp = msrpUSD * 83;
            const markup = computeMarkupPercent(price, convertedMsrp);

            return {
                id: doc.id,
                name: data.name || "Unknown CPU",
                gamingScore,
                productivityScore,
                price,
                platformTier,
                valueScore: overallValueScore,
                verdict: "Balanced",
                msrp: convertedMsrp,
                markup,
                socket,
                ramType: String(ramType || "Unknown"),
            } as CpuMarketInsightItem;
        })
        .filter((cpu): cpu is CpuMarketInsightItem => cpu !== null);

    cpus.sort((a, b) => b.valueScore - a.valueScore);

    const top20Index = computeTopPercentIndex(cpus.length, 0.2);
    return cpus.map((cpu, index) => {
        let verdict = "Balanced";
        if (index < top20Index && cpu.price > 0) {
            verdict = "Best Value";
        } else if (cpu.markup > 35) {
            verdict = "Overpriced";
        } else if (cpu.markup < -10) {
            verdict = "Fair Deal";
        } else if (cpu.platformTier === "Low") {
            verdict = "Aging";
        }
        return { ...cpu, verdict };
    });
}
