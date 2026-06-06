import dotenv from 'dotenv';
import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';

let envPath = '.env';
try {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const regex = /\\n(FIREBASE_PRIVATE_KEY|GOOGLE_SERVICE_ACCOUNT_EMAIL|DATA_MASTERSHEET_ID|FIREBASE_PROJECT_ID|GOOGLE_SERVICE_ACCOUNT_KEY|FINANCIAL_DATA_SHEET_ID|ROSTER_REPORTING_SHEET_ID|FIREBASE_CLIENT_EMAIL|GOOGLE_API_KEY|GEMINI_API_KEY|VITE_FIREBASE_API_KEY|VITE_FIREBASE_AUTH_DOMAIN|VITE_FIREBASE_PROJECT_ID|VITE_FIREBASE_STORAGE_BUCKET|VITE_FIREBASE_MESSAGING_SENDER_ID|VITE_FIREBASE_APP_ID)=/g;
  const cleanContent = envContent.replace(regex, '\n$1=');
  
  const lines = cleanContent.split(/\r?\n/);
  lines.forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
      const key = parts[0].trim();
      let value = parts.slice(1).join('=').trim();
      if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
      else if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
      process.env[key] = value;
    }
  });
} catch (err) {
  dotenv.config({ path: envPath });
}

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL || process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const privateKey = (process.env.FIREBASE_PRIVATE_KEY || process.env.GOOGLE_SERVICE_ACCOUNT_KEY)?.replace(/\\n/g, '\n');

if (!projectId || !clientEmail || !privateKey) {
  console.error("❌ ERROR: Missing Firebase environment variables");
  process.exit(1);
}

const app = admin.initializeApp({
  credential: admin.credential.cert({
    projectId,
    clientEmail,
    privateKey,
  })
});

const customDbId = "ai-studio-f578d03a-99b3-4c41-84dd-9901137e8386";

async function checkDatabase(dbId) {
  const label = dbId ? `custom DB '${dbId}'` : "default DB";
  try {
    const db = dbId ? getFirestore(app, dbId) : getFirestore(app);
    const collections = await db.listCollections();
    console.log(`\nCollections on ${label}:`);
    if (collections.length === 0) {
      console.log("  (None)");
      return;
    }
    for (const col of collections) {
      const snapshot = await col.limit(5).get();
      console.log(`  - ${col.id} (${snapshot.size} docs checked, may have more)`);
    }
  } catch (error) {
    console.log(`❌ Error checking ${label}:`, error.message);
  }
}

async function run() {
  await checkDatabase(null);
  await checkDatabase(customDbId);
  process.exit(0);
}

run();
