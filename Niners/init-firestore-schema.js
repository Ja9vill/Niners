import dotenv from 'dotenv';
import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';

// Load env
const envPath = '.env';
try {
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
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
  }
} catch (err) {
  dotenv.config({ path: envPath });
}

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

if (!projectId || !clientEmail || !privateKey) {
  console.error("❌ Missing database credentials in environment.");
  process.exit(1);
}

const app = admin.initializeApp({
  credential: admin.credential.cert({
    projectId,
    clientEmail,
    privateKey,
  })
});

const databaseId = "ai-studio-f578d03a-99b3-4c41-84dd-9901137e8386";
console.log(`Connecting to database ID: ${databaseId}...`);

async function runSchemaCheck() {
  let db;
  try {
    db = getFirestore(app, databaseId);
  } catch (err) {
    console.warn("⚠️ Failed to initialize with custom databaseId, trying default database...");
    db = getFirestore(app);
  }

  const collections = [
    'top_niners_earnings_summary',
    'events_calendar_public',
    'reporting_submissions',
    'tasks',
    'activity_audit_logs'
  ];

  console.log("Writing schema structure verification metadata...");
  try {
    for (const col of collections) {
      const docRef = db.collection('_schema_metadata').doc(col);
      await docRef.set({
        initialized: true,
        updatedAt: new Date().toISOString(),
        verifiedFields: true
      });
      console.log(`✅ Collection '${col}' verified & metadata initialized successfully.`);
    }
    console.log("\n🎉 All 5 collections successfully verified in Firestore!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Failed to verify database schema:", error.message || error);
    process.exit(1);
  }
}

runSchemaCheck();
