import "server-only";
import { initializeApp, getApps, cert, getApp, App } from "firebase-admin/app";
import { getAuth, Auth } from "firebase-admin/auth";

const serviceAccount = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/^"|"$/g, '').replace(/\\n/g, "\n"),
};

let app: App;
let adminAuth: Auth;

console.log('--- ADMIN SDK DEBUG ---');
console.log('Has literal \\n?', process.env.FIREBASE_PRIVATE_KEY?.includes('\\n'));
console.log('Has real newline?', process.env.FIREBASE_PRIVATE_KEY?.includes('\n'));
console.log('Starts with quote?', process.env.FIREBASE_PRIVATE_KEY?.startsWith('"'));
console.log('Ends with quote?', process.env.FIREBASE_PRIVATE_KEY?.endsWith('"'));
console.log('Cleaned length:', serviceAccount.privateKey?.length);

if (!serviceAccount.projectId || !serviceAccount.clientEmail || !serviceAccount.privateKey) {
    console.warn("Firebase Admin SDK missing configuration. Auth functions will fail.");
    adminAuth = {
        verifyIdToken: async () => { throw new Error("Firebase Admin not configured"); },
        createSessionCookie: async () => { throw new Error("Firebase Admin not configured"); },
        verifySessionCookie: async () => { throw new Error("Firebase Admin not configured"); },
    } as unknown as Auth;
} else {
    if (!getApps().length) {
        app = initializeApp({
            credential: cert(serviceAccount),
        });
    } else {
        app = getApp();
    }
    adminAuth = getAuth(app);
}

export { adminAuth };
