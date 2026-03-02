/**
 * Safely extracts the current price from a component document, preferring the nested
 * pricing.currentPrice field over legacy flat fields.
 *
 * @param component The component data object from Firestore
 * @returns The resolved price as a number (defaults to 0 if none found)
 */
export function getComponentPrice(component: any): number {
    if (!component) return 0;

    if (component.pricing?.currentPrice !== undefined && component.pricing?.currentPrice !== null) {
        return Number(component.pricing.currentPrice);
    }

    if (component.currentPrice !== undefined && component.currentPrice !== null) {
        return Number(component.currentPrice);
    }

    if (component.price !== undefined && component.price !== null) {
        return Number(component.price);
    }

    if (component.msrp !== undefined && component.msrp !== null) {
        return Number(component.msrp);
    }

    return 0;
}

/**
 * Gets the resolved component price and formats it as INR (₹).
 *
 * @param component The component data object from Firestore
 * @returns A formatted currency string (e.g., "₹45,000")
 */
export function getFormattedPrice(component: any): string {
    const price = getComponentPrice(component);
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0
    }).format(price);
}
