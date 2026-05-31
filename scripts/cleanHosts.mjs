// scripts/cleanHosts.mjs
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Load env vars (ensure they are set in your terminal)
const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

if (!projectId || !clientEmail || !privateKey) {
  console.error('Missing Firebase Admin env vars');
  process.exit(1);
}

if (!getApps().length) {
  initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
  });
}

const db = getFirestore(undefined, 'ai-studio-f578d03a-99b3-4c41-84dd-9901137e8386');

(async () => {
  const col = db.collection('hosts');
  const snapshot = await col.get();

  const batch = db.batch();
  snapshot.forEach(doc => {
    if (doc.id !== '19157913') {
      batch.delete(doc.ref);
    }
  });

  await batch.commit();
  console.log(`✅ Deleted ${snapshot.size - 1} host documents (kept director).`);
  process.exit(0);
})();
