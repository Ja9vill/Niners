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
  const hostId = '26721132'; // Addy
  console.log(`--- Fetching data for host ${hostId} ---`);
  
  const userDoc = await db.collection('users').doc(hostId).get();
  console.log('users collection fields:', userDoc.data());

  const hostDoc = await db.collection('host').doc(hostId).get();
  console.log('host collection fields:', hostDoc.data());
}

run().catch(console.error);
