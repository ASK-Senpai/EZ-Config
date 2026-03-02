import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const serviceAccount = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
};

if (!getApps().length) {
    initializeApp({
        credential: cert(serviceAccount),
    });
}

const db = getFirestore();

const mockData = {
    cpu: [
        { id: "ryzen-5-5600x", name: "Ryzen 5 5600X", benchmarkScore: 22000, tdp: 65, price: 150, tier: "mid", socket: "AM4" },
        { id: "i5-12400f", name: "Intel Core i5-12400F", benchmarkScore: 19500, tdp: 65, price: 140, tier: "mid", socket: "LGA1700" },
        { id: "ryzen-7-5800x", name: "Ryzen 7 5800X", benchmarkScore: 28000, tdp: 105, price: 220, tier: "high", socket: "AM4" }
    ],
    gpu: [
        { id: "rtx-3060", name: "NVIDIA RTX 3060", benchmarkScore: 17000, tdp: 170, price: 280, tier: "mid" },
        { id: "rtx-3070", name: "NVIDIA RTX 3070", benchmarkScore: 22000, tdp: 220, price: 400, tier: "high" },
        { id: "rx-6600", name: "AMD Radeon RX 6600", benchmarkScore: 15000, tdp: 132, price: 200, tier: "entry" }
    ],
    motherboard: [
        { id: "b550-am4", name: "B550 ATX Motherboard", socket: "AM4", price: 130, tier: "mid" },
        { id: "b660-lga1700", name: "B660 ATX Motherboard", socket: "LGA1700", price: 140, tier: "mid" },
        { id: "x570-am4", name: "X570 ATX Motherboard", socket: "AM4", price: 200, tier: "high" }
    ],
    ram: [
        { id: "16gb-ddr4-3200", name: "16GB DDR4 3200MHz", type: "DDR4", capacity: 16, price: 45, tier: "entry" },
        { id: "32gb-ddr4-3600", name: "32GB DDR4 3600MHz", type: "DDR4", capacity: 32, price: 80, tier: "mid" },
        { id: "16gb-ddr5-5200", name: "16GB DDR5 5200MHz", type: "DDR5", capacity: 16, price: 70, tier: "mid" }
    ],
    psu: [
        { id: "550w-bronze", name: "550W 80+ Bronze", wattage: 550, rating: "Bronze", price: 60, tier: "entry" },
        { id: "650w-gold", name: "650W 80+ Gold", wattage: 650, rating: "Gold", price: 90, tier: "mid" },
        { id: "750w-gold", name: "750W 80+ Gold", wattage: 750, rating: "Gold", price: 110, tier: "high" }
    ]
};

async function seed() {
    console.log("Starting database seed...");
    const batch = db.batch();

    for (const [type, items] of Object.entries(mockData)) {
        console.log(`Seeding ${type}...`);
        for (const item of items) {
            const { id, ...data } = item;
            const ref = db.collection("components").doc(type).collection("items").doc(id);
            batch.set(ref, {
                ...data,
                createdAt: FieldValue.serverTimestamp()
            });
        }
    }

    try {
        await batch.commit();
        console.log("Database seeded successfully!");
        process.exit(0);
    } catch (error) {
        console.error("Error seeding database:", error);
        process.exit(1);
    }
}

seed();
