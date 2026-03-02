import "server-only";
import { Timestamp } from "firebase-admin/firestore";

/**
 * Recursively sanitizes Firestore document data, stripping complex objects 
 * like Timestamps and DocumentReferences into plain serializable values 
 * so they can safely pass the Next.js Server-to-Client boundary.
 */
export function sanitize<T = any>(obj: any): T {
    if (obj === null || obj === undefined) return obj;

    // Handle Firestore Timestamps explicitly
    if (obj instanceof Timestamp) {
        return obj.toDate().toISOString() as any;
    }

    // Handle generic Dates if accidentally pushed
    if (obj instanceof Date) {
        return obj.toISOString() as any;
    }

    // Handle Arrays explicitly
    if (Array.isArray(obj)) {
        return obj.map(item => sanitize(item)) as any;
    }

    // Handle plain Objects recursively
    // We strictly check for plain objects to avoid mutating functions, DOM nodes, or unknown class derivatives
    if (typeof obj === "object" && obj.constructor === Object) {
        const sanitizedData: any = {};
        for (const [key, value] of Object.entries(obj)) {
            sanitizedData[key] = sanitize(value);
        }
        return sanitizedData;
    }

    // Primitives (string, number, boolean) return as-is
    return obj;
}
