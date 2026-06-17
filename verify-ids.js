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

const app = admin.initializeApp({
  credential: admin.credential.cert({ projectId, clientEmail, privateKey })
});

const customDbId = "ai-studio-f578d03a-99b3-4c41-84dd-9901137e8386";
const db = getFirestore(app, customDbId);

async function inspect() {
  // Inspect 'hosts'
  const hostsSnap = await db.collection('hosts').get();
  console.log(`\n--- COLLECTION 'hosts' (Plural, to be deleted) ---`);
  console.log(`Total documents: ${hostsSnap.size}`);
  hostsSnap.forEach(doc => {
    console.log(`- ID: ${doc.id}, Data snippet:`, JSON.stringify(doc.data()).slice(0, 100));
  });

  // Inspect 'host'
  const hostSnap = await db.collection('host').get();
  console.log(`\n--- COLLECTION 'host' (Singular, must be KEPT) ---`);
  console.log(`Total documents: ${hostSnap.size}`);
  hostSnap.forEach(doc => {
    console.log(`- ID: ${doc.id}, Data snippet:`, JSON.stringify(doc.data()).slice(0, 100));
  });
}

inspect().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
