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

async function deleteCollection(collectionPath, batchSize = 100) {
  const collectionRef = db.collection(collectionPath);
  const query = collectionRef.orderBy('__name__').limit(batchSize);

  return new Promise((resolve, reject) => {
    deleteQueryBatch(db, query, resolve).catch(reject);
  });
}

async function deleteQueryBatch(db, query, resolve) {
  const snapshot = await query.get();
  
  const batchSize = snapshot.size;
  if (batchSize === 0) {
    resolve();
    return;
  }

  const batch = db.batch();
  snapshot.docs.forEach((doc) => {
    // Explicit safety check: ensure the document path matches /hosts/
    if (doc.ref.parent.id === 'hosts') {
      batch.delete(doc.ref);
    } else {
      console.warn(`⚠️ Warning: Bypassing deletion of document ${doc.ref.path} because it's not in the 'hosts' collection.`);
    }
  });

  await batch.commit();
  console.log(`Deleted a batch of ${batchSize} documents from collection 'hosts'.`);

  process.nextTick(() => {
    deleteQueryBatch(db, query, resolve);
  });
}

async function run() {
  const TARGET_COL = 'hosts';
  console.log(`Starting deletion of collection '${TARGET_COL}'...`);
  
  // Double check that 'hosts' collection is targeted
  if (TARGET_COL !== 'hosts') {
    throw new Error("Target collection is not 'hosts'. Aborting.");
  }
  
  await deleteCollection(TARGET_COL);
  console.log(`✅ Collection '${TARGET_COL}' deleted successfully.`);
}

run().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
