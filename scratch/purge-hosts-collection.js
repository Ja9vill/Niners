import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';

const envPath = '.env';
const envContent = fs.readFileSync(envPath, 'utf8');
const keys = {
  FIREBASE_PRIVATE_KEY: '',
  GOOGLE_SERVICE_ACCOUNT_EMAIL: '',
  FIREBASE_PROJECT_ID: ''
};

const lines = envContent.split(/\r?\n/);
lines.forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    const key = parts[0].trim();
    let value = parts.slice(1).join('=').trim();
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    else if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
    if (key in keys || key === 'GOOGLE_SERVICE_ACCOUNT_KEY') {
      if (key === 'GOOGLE_SERVICE_ACCOUNT_KEY') keys.FIREBASE_PRIVATE_KEY = value;
      else keys[key] = value;
    }
  }
});

const privateKey = keys.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');
const clientEmail = keys.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const projectId = keys.FIREBASE_PROJECT_ID;

const app = admin.initializeApp({
  credential: admin.credential.cert({
    projectId,
    clientEmail,
    privateKey
  })
}, 'purge-hosts-app');

const db = getFirestore(app, 'ai-studio-f578d03a-99b3-4c41-84dd-9901137e8386');

async function run() {
  try {
    const hostsSnap = await db.collection('hosts').get();
    console.log(`Found ${hostsSnap.size} documents in 'hosts' collection.`);
    
    const batchSize = 20;
    let count = 0;
    while (true) {
      const snap = await db.collection('hosts').limit(batchSize).get();
      if (snap.size === 0) {
        break;
      }
      const batch = db.batch();
      snap.docs.forEach(doc => {
        batch.delete(doc.ref);
        count++;
      });
      await batch.commit();
      console.log(`Deleted ${count} documents...`);
    }
    console.log(`✅ Permanently deleted all documents in the 'hosts' collection!`);
  } catch (err) {
    console.error('Purging failed:', err.message || err);
  }
  process.exit(0);
}

run();
