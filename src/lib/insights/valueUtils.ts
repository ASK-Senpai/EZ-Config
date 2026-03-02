export function computeValuePerPrice(score: number, price: number): number {
    if (!Number.isFinite(score) || !Number.isFinite(price) || price <= 0) return 0;
    return score / price;
}

export function computeMarkupPercent(currentPrice: number, referencePrice: number): number {
    if (!Number.isFinite(currentPrice) || !Number.isFinite(referencePrice) || referencePrice <= 0) return 0;
    return ((currentPrice - referencePrice) / referencePrice) * 100;
}

export function computeBarFillWidth(value: number, maxValue: number): number {
    if (!Number.isFinite(value) || !Number.isFinite(maxValue) || maxValue <= 0) return 2;
    const safeRatio = Math.min(1, Math.max(0, value / maxValue));
    return Math.max(2, safeRatio * 100);
}

export function computeTopPercentIndex(totalItems: number, topPercent: number = 0.2): number {
    if (!Number.isFinite(totalItems) || totalItems <= 0) return 0;
    return Math.floor(totalItems * topPercent);
}
