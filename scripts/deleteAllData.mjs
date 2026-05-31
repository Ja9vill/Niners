import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import dotenv from 'dotenv';
dotenv.config();

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

async function deleteCollection(collectionPath, batchSize = 500) {
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
    batch.delete(doc.ref);
  });

  await batch.commit();

  process.nextTick(() => {
    deleteQueryBatch(db, query, resolve);
  });
}

(async () => {
  const collectionsToDelete = [
    'users',
    'hosts',
    'commissions',
    'pk_records',
    'exposures',
    'weekly_live_data',
    'monthly_live_data',
    'fanbase_health',
    'tasks',
    'goals',
    'calendar',
    'livehouse_requests',
    'reset_requests',
    'notes',
    'top_niners_earnings_summary',
    'events_calendar_public',
    'reporting_submissions',
    'activity_audit_logs'
  ];

  for (const collection of collectionsToDelete) {
    console.log(`Deleting collection: ${collection}...`);
    try {
      await deleteCollection(collection);
      console.log(`✅ Successfully deleted collection: ${collection}`);
    } catch (error) {
      console.error(`❌ Failed to delete collection ${collection}:`, error);
    }
  }

  console.log('Finished deleting all specified collections.');
  process.exit(0);
})();
