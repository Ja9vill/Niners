import dotenv from 'dotenv';
import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';

// Let's locate the .env file
let envPath = '.env';
if (!fs.existsSync(envPath) && fs.existsSync('../.env')) {
  envPath = '../.env';
}

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

const db = getFirestore(app, 'ai-studio-f578d03a-99b3-4c41-84dd-9901137e8386');

async function listAllData() {
  const collections = [
    'hosts', 'commissions', 'pk_records', 'exposures', 'live_data_weekly', 
    'live_data_monthly', 'fanbase_health', 'tasks', 'goals', 'calendar_events', 
    'livehouse_requests', 'reset_requests', 'notes', 'top_niners_summary', 
    'public_calendar_events', 'reporting_submissions', 'activity_logs'
  ];

  const dbSummary = {};

  for (const collectionName of collections) {
    const snapshot = await db.collection(collectionName).get();
    dbSummary[collectionName] = [];
    snapshot.forEach(doc => {
      dbSummary[collectionName].push({ id: doc.id, ...doc.data() });
    });
  }

  fs.writeFileSync('db-dump.json', JSON.stringify(dbSummary, null, 2));
  console.log("✅ Dumped database to db-dump.json");
  process.exit(0);
}

listAllData();
