const fs = require('fs');
const file = 'e:/Projects/New-Project/EZ-Config/firestore.indexes.json';
const data = JSON.parse(fs.readFileSync(file, 'utf8'));

const sortFields = [
    "normalized.gamingScore",
    "normalized.productivityScore",
    "metrics.valueScore",
    "pricing.priceRange.min",
    "launchYear"
];

const dirs = ["ASCENDING", "DESCENDING"];
const newIndexes = [];

sortFields.forEach(field => {
    dirs.forEach(dir => {
        // 1. Base sort (legacy only)
        newIndexes.push({
            collectionGroup: "items",
            queryScope: "COLLECTION",
            fields: [
                { fieldPath: "legacy", order: "ASCENDING" },
                { fieldPath: field, order: dir }
            ]
        });

        // 2. Brand sort
        newIndexes.push({
            collectionGroup: "items",
            queryScope: "COLLECTION",
            fields: [
                { fieldPath: "brand", order: "ASCENDING" },
                { fieldPath: "legacy", order: "ASCENDING" },
                { fieldPath: field, order: dir }
            ]
        });

        // 3. APU sort
        newIndexes.push({
            collectionGroup: "items",
            queryScope: "COLLECTION",
            fields: [
                { fieldPath: "hasIntegratedGraphics", order: "ASCENDING" },
                { fieldPath: "legacy", order: "ASCENDING" },
                { fieldPath: field, order: dir }
            ]
        });

        // 4. APU + Brand sort
        newIndexes.push({
            collectionGroup: "items",
            queryScope: "COLLECTION",
            fields: [
                { fieldPath: "brand", order: "ASCENDING" },
                { fieldPath: "hasIntegratedGraphics", order: "ASCENDING" },
                { fieldPath: "legacy", order: "ASCENDING" },
                { fieldPath: field, order: dir }
            ]
        });
    });
});

const isEqual = (a, b) => JSON.stringify(a) === JSON.stringify(b);

let added = 0;
newIndexes.forEach(ni => {
    const exists = data.indexes.some(idx =>
        idx.collectionGroup === ni.collectionGroup &&
        idx.queryScope === ni.queryScope &&
        isEqual(idx.fields, ni.fields)
    );
    if (!exists) {
        data.indexes.push(ni);
        added++;
    }
});

fs.writeFileSync(file, JSON.stringify(data, null, 2));
console.log(`Added ${added} new missing combinations to firestore.indexes.json.`);
