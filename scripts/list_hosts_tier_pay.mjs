import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import dotenv from 'dotenv';
dotenv.config();

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

if (!getApps().length) {
  initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
  });
}

const db = getFirestore(undefined, 'ai-studio-f578d03a-99b3-4c41-84dd-9901137e8386');

async function run() {
  console.log('--- Listing all hosts from host collection ---');
  const snap = await db.collection('host').get();
  snap.forEach(doc => {
    const data = doc.data();
    console.log(`Host ID: ${doc.id}, Nickname: ${data.nickname || data.name}, tier_pay: "${data.tier_pay}"`);
  });
}

run().catch(console.error);
