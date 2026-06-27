import dotenv from 'dotenv';
import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';

let envPath = '.env';
try {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const keys = ['FIREBASE_PROJECT_ID', 'FIREBASE_CLIENT_EMAIL', 'FIREBASE_PRIVATE_KEY'];
  const lines = envContent.split(/\r?\n/);
  lines.forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
      const key = parts[0].trim();
      let value = parts.slice(1).join('=').trim();
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1);
      } else if (value.startsWith("'") && value.endsWith("'")) {
        value = value.slice(1, -1);
      }
      process.env[key] = value;
    }
  });
} catch (err) {
  dotenv.config({ path: envPath });
}

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

console.log("Credentials configured:", { projectId, clientEmail: !!clientEmail, privateKey: !!privateKey });

const app = admin.initializeApp({
  credential: admin.credential.cert({
    projectId,
    clientEmail,
    privateKey,
  })
});

console.log("App initialized.");

const databaseId = "ai-studio-f578d03a-99b3-4c41-84dd-9901137e8386";

console.log("Attempting to initialize Firestore with getFirestore(app, databaseId)...");
try {
  const db1 = getFirestore(app, databaseId);
  console.log("Successfully initialized db1 with getFirestore");
} catch (e) {
  console.error("Failed db1 init:", e);
}

console.log("Attempting to initialize Firestore with getFirestore(undefined, databaseId)...");
try {
  const db2 = getFirestore(undefined, databaseId);
  console.log("Successfully initialized db2 with getFirestore(undefined, databaseId)");
} catch (e) {
  console.error("Failed db2 init:", e);
}
