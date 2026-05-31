const { initializeApp, cert, getApps, getApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore } = require('firebase-admin/firestore');

function getFirebaseAdminApp() {
  if (!getApps().length) {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
    if (!projectId || !clientEmail || !privateKey) {
      throw new Error('Missing Firebase Admin env vars');
    }
    return initializeApp({
      credential: cert({ projectId, clientEmail, privateKey })
    });
  }
  return getApp();
}

function getAdminFirestore() {
  const app = getFirebaseAdminApp();
  // Use the same database ID as in the server code
  return getFirestore(app, "ai-studio-f578d03a-99b3-4c41-84dd-9901137e8386");
}

async function main() {
  const db = getAdminFirestore();
  const snapshot = await db.collection('hosts').get();
  const credentials = snapshot.docs.map(doc => ({ poppo_id: doc.id, password: doc.data().password || null }));
  console.log(JSON.stringify(credentials, null, 2));
}

main().catch(err => {
  console.error('Error fetching credentials:', err);
  process.exit(1);
});
