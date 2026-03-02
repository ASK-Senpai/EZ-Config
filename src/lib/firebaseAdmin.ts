import admin from "firebase-admin";

function getServiceAccountFromEnv() {
    const raw = process.env.FIREBASE_ADMIN_KEY;
    if (raw) {
        return JSON.parse(raw);
    }

    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

    if (!projectId || !clientEmail || !privateKey) {
        throw new Error("Firebase Admin credentials are not configured.");
    }

    return {
        project_id: projectId,
        client_email: clientEmail,
        private_key: privateKey,
    };
}

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(getServiceAccountFromEnv()),
    });
}

export const adminDb = admin.firestore();
export default admin;
