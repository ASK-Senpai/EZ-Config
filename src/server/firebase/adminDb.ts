import "server-only";
import { getApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import "./admin"; // Ensure app is initialized

export const adminDb = getFirestore(getApp());
