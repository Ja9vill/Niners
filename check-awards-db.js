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

async function checkAwards() {
  console.log("🔍 Checking host documents for inline 'awards' fields...");
  const hostsSnap = await db.collection('host').get();
  console.log(`📊 Found ${hostsSnap.size} host documents.`);
  hostsSnap.forEach(d => {
    const data = d.data();
    if (data.awards) {
      console.log(`  👉 Host ID: ${d.id} has inline awards:`, data.awards);
    }
  });

  console.log("\n🔍 Checking users collection for inline 'awards' fields...");
  const usersSnap = await db.collection('users').get();
  console.log(`📊 Found ${usersSnap.size} user documents.`);
  usersSnap.forEach(d => {
    const data = d.data();
    if (data.awards) {
      console.log(`  👉 User ID: ${d.id} has inline awards:`, data.awards);
    }
  });

  process.exit(0);
}

checkAwards();
