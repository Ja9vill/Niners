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

async function testProject(projId) {
  console.log(`\nTesting project: ${projId}`);
  const app = admin.initializeApp({
    credential: admin.credential.cert({
      projectId: projId,
      clientEmail,
      privateKey
    })
  }, `app-${projId}`);

  const db = getFirestore(app, 'ai-studio-f578d03a-99b3-4c41-84dd-9901137e8386');
  try {
    const snap = await db.collection('users').get();
    console.log(`- Connection successful. Found ${snap.size} documents in 'users'.`);
    snap.forEach(doc => {
      console.log(`  * Doc: ${doc.id} -> ${doc.data().nickname || doc.data().name}`);
    });
  } catch (err) {
    console.log(`- Connection failed:`, err.message);
  }
}

async function run() {
  await testProject('gen-lang-client-0222945352');
  await testProject('nine-dashboard-733997');
  process.exit(0);
}

run();
