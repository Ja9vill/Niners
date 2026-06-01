import { initializeApp, cert } from "firebase-admin/app";
import { getStorage } from "firebase-admin/storage";
import dotenv from "dotenv";

dotenv.config();

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

if (!projectId || !clientEmail || !privateKey) {
  console.error("Missing Firebase Admin environment variables.");
  process.exit(1);
}

initializeApp({
  credential: cert({
    projectId,
    clientEmail,
    privateKey,
  }),
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET
});

async function fixCors() {
  try {
    const bucket = getStorage().bucket();
    console.log("Setting CORS on bucket:", bucket.name);
    await bucket.setCorsConfiguration([
      {
        origin: ["*"],
        method: ["GET", "PUT", "POST", "DELETE", "OPTIONS"],
        maxAgeSeconds: 3600,
        responseHeader: ["Content-Type", "Authorization", "Content-Length", "User-Agent", "x-goog-meta-*", "Cache-Control"]
      }
    ]);
    console.log("CORS configuration successfully updated!");
  } catch (error) {
    console.error("Failed to set CORS:", error);
  }
}

fixCors();
