/**
 * Safely extracts the minimum price from a v2 component document
 * Uses pricing.priceRange.min natively, falling back gracefully to legacy fields to prevent breaking UI before total migration.
 */
export function getMinPrice(component: any): number {
    if (!component) return 0;

    // v2 structured price node
    if (component.pricing?.priceRange?.min != null) {
        return Number(component.pricing.priceRange.min);
    }

    // v1 structured fallback
    if (component.pricing?.currentPrice != null) {
        return Number(component.pricing.currentPrice);
    }

    // Flat legacy fallbacks
    if (component.currentPrice != null) return Number(component.currentPrice);
    if (component.price != null) return Number(component.price);
    if (component.msrp != null) return Number(component.msrp);

    return 0; // Treated as 0 / legacy flag trigger
}

/**
 * Safely extracts the maximum price from a v2 component document.
 * Returns the min constraint if 'max' is unbounded or equal.
 */
export function getMaxPrice(component: any): number {
    if (!component) return 0;

    if (component.pricing?.priceRange?.max != null) {
        return Number(component.pricing.priceRange.max);
    }

    // If we only have a flat price, min == max
    return getMinPrice(component);
}

/**
 * Determines if a component is marked as "legacy" preventing it from value calculations.
 * Components lacking any valid minimum price (0) are assumed legacy.
 */
export function isLegacy(component: any): boolean {
    if (!component) return true;
    if (component.legacy === true) return true;

    const min = getMinPrice(component);
    if (min === 0) return true;

    return false;
}

/**
 * Determines if a component is physically available for purchase.
 * Explicitly ignores "discontinued" markers.
 */
export function isAvailable(component: any): boolean {
    if (!component) return false;
    const avail = component.pricing?.availability?.toLowerCase() || "";
    // If it's explicitly marked discontinued
    if (avail.includes("discontinued")) {
        return false;
    }
    // Also consider it unavailable if there's no price and it's legacy
    if (isLegacy(component) && getMinPrice(component) === 0) {
        return false;
    }
    return true;
}

/**
 * Constructs the UI-ready formatted string (e.g., "₹45,000 – ₹50,000" or just "₹45,000").
 */
export function getDisplayPrice(component: any): string {
    const min = getMinPrice(component);
    const max = getMaxPrice(component);

    const formatPrice = (val: number) => {
        return new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: "INR",
            maximumFractionDigits: 0
        }).format(val);
    };

    // Edge Case: No pricing data
    if (min === 0 && max === 0) {
        return "N/A / Legacy";
    }

    // Edge Case: Exact identical pricing (or flat fallback)
    if (min === max || max === 0) {
        return formatPrice(min);
    }

    // Standard v2 range output format
    return `${formatPrice(min)} – ${formatPrice(max)}`;
}
