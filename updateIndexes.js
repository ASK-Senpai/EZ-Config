const fs = require('fs');
const file = 'e:/Projects/New-Project/EZ-Config/firestore.indexes.json';
const data = JSON.parse(fs.readFileSync(file, 'utf8'));

const newIndexes = [
    {
        collectionGroup: "items",
        queryScope: "COLLECTION",
        fields: [{ fieldPath: "legacy", order: "ASCENDING" }, { fieldPath: "gamingScore", order: "DESCENDING" }]
    },
    {
        collectionGroup: "items",
        queryScope: "COLLECTION",
        fields: [{ fieldPath: "legacy", order: "ASCENDING" }, { fieldPath: "productivityScore", order: "DESCENDING" }]
    },
    {
        collectionGroup: "items",
        queryScope: "COLLECTION",
        fields: [{ fieldPath: "legacy", order: "ASCENDING" }, { fieldPath: "pricing.priceRange.min", order: "ASCENDING" }]
    },
    {
        collectionGroup: "items",
        queryScope: "COLLECTION",
        fields: [{ fieldPath: "legacy", order: "ASCENDING" }, { fieldPath: "pricing.priceRange.min", order: "DESCENDING" }]
    },
    {
        collectionGroup: "items",
        queryScope: "COLLECTION",
        fields: [{ fieldPath: "tier", order: "ASCENDING" }, { fieldPath: "legacy", order: "ASCENDING" }, { fieldPath: "gamingScore", order: "DESCENDING" }]
    },
    {
        collectionGroup: "items",
        queryScope: "COLLECTION",
        fields: [{ fieldPath: "brand", order: "ASCENDING" }, { fieldPath: "legacy", order: "ASCENDING" }, { fieldPath: "pricing.priceRange.min", order: "ASCENDING" }]
    }
];

const isEqual = (a, b) => JSON.stringify(a) === JSON.stringify(b);

newIndexes.forEach(ni => {
    const exists = data.indexes.some(idx =>
        idx.collectionGroup === ni.collectionGroup &&
        idx.queryScope === ni.queryScope &&
        isEqual(idx.fields, ni.fields)
    );
    if (!exists) {
        data.indexes.push(ni);
    }
});

fs.writeFileSync(file, JSON.stringify(data, null, 2));
console.log("Indexes inserted.");
