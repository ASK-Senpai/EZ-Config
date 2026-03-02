import Groq from "groq-sdk";

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY!,
});

export async function listGroqModels() {
    const models = await groq.models.list();

    console.log("Available Groq Models:");
    models.data.forEach((model) => {
        console.log({
            id: model.id,
            owned_by: model.owned_by,
            context_length: (model as any).context_length,
        });
    });

    return models.data;
}
