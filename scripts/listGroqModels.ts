import { groq } from "@/lib/ai/groq";

async function listModels() {
    try {
        const models = await groq.models.list();

        console.log("Available Groq Models:\n");

        models.data.forEach((model: any, index: number) => {
            console.log(`${index + 1}. ${model.id}`);
        });

    } catch (error: any) {
        console.error("Failed to fetch models:", error.message);
    }
}

listModels();
