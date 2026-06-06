import dotenv from 'dotenv';
import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';

let envPath = '.env';

if (!fs.existsSync(envPath)) {
  console.error("❌ ERROR: No .env file found.");
  process.exit(1);
}

try {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const lines = envContent.split(/\r?\n/);
  lines.forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
      const key = parts[0].trim();
      let value = parts.slice(1).join('=').trim();
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1);
      }
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
  credential: admin.credential.cert({
    projectId,
    clientEmail,
    privateKey,
  })
});

const db = getFirestore(app, 'ai-studio-f578d03a-99b3-4c41-84dd-9901137e8386');

async function main() {
  console.log("🔍 Listing documents in 'calendar' collection...");
  const snap = await db.collection('calendar').get();
  console.log(`📊 Found ${snap.size} documents.`);
  
  snap.forEach(d => {
    const data = d.data();
    console.log(`- ID: ${d.id}`);
    console.log(`  event_date:`, data.event_date || data.eventDate || data.date || 'N/A');
    console.log(`  description:`, data.description || 'N/A');
    console.log(`  type_of_event:`, data.type_of_event || data.type || 'N/A');
    console.log(`  raw keys:`, Object.keys(data));
    console.log(`---`);
  });

  process.exit(0);
}

main().catch(err => {
  console.error("❌ Execution failed:", err);
  process.exit(1);
});
