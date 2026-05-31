import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';

// Load service account key
const serviceAccount = JSON.parse(fs.readFileSync('./gcp-key.json', 'utf8'));

// Initialize Firebase Admin
initializeApp({
  credential: cert(serviceAccount),
  projectId: serviceAccount.project_id
});

// Initialize Firestore specifying the named database
const db = getFirestore(undefined, 'ai-studio-f578d03a-99b3-4c41-84dd-9901137e8386');

async function clearCommissions() {
  console.log('Fetching commissions to delete...');
  const commissionsRef = db.collection('commissions');
  const snapshot = await commissionsRef.get();

  if (snapshot.empty) {
    console.log('No commissions found. Database is clean.');
    return;
  }

  const batch = db.batch();
  snapshot.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });

  await batch.commit();
  console.log(`Successfully deleted ${snapshot.size} commission records.`);
}

clearCommissions()
  .then(() => process.exit(0))
  .catch(console.error);
