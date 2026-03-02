export function serializeFirestoreData(data: any): any {
    if (!data) return data;

    if (Array.isArray(data)) {
        return data.map(serializeFirestoreData);
    }

    if (
        typeof data === "object" &&
        data !== null &&
        "_seconds" in data &&
        "_nanoseconds" in data
    ) {
        return new Date(data._seconds * 1000).toISOString();
    }

    if (data instanceof Date) {
        return data.toISOString();
    }

    if (typeof data === "object" && data !== null) {
        const serialized: any = {};
        for (const key in data) {
            serialized[key] = serializeFirestoreData(data[key]);
        }
        return serialized;
    }

    return data;
}
