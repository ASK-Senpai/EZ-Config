import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let app: FirebaseApp | undefined;
let auth: Auth;

if (typeof window !== "undefined" && !firebaseConfig.apiKey) {
    console.warn("Firebase Client SDK missing configuration. Auth will not work.");
    // Mock Auth for development without keys (prevents crash)
    auth = {
        currentUser: null,
        onAuthStateChanged: (observer: any) => {
            if (typeof observer === 'function') observer(null);
            return () => { }; // Unsubscribe function
        },
        signInWithPopup: async () => { throw new Error("Firebase not configured"); },
        signInWithEmailAndPassword: async () => { throw new Error("Firebase not configured"); },
        signOut: async () => { },
    } as unknown as Auth;
} else {
    app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    auth = getAuth(app);
}

export { app, auth };
