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

const COLLECTIONS = ['users', 'host', 'manager', 'admin', 'head_admin', 'agent', 'director'];

async function run() {
  console.log('--- Starting Firestore Database Tier Pay Cleanup ---');
  let totalUpdated = 0;

  for (const col of COLLECTIONS) {
    console.log(`\nScanning collection: ${col}...`);
    const snap = await db.collection(col).get();
    
    let colUpdated = 0;
    const batch = db.batch();
    let batchSize = 0;

    snap.forEach(docSnap => {
      const data = docSnap.data();
      const docRef = db.collection(col).doc(docSnap.id);

      // Check all possible legacy/current tier pay fields
      const fieldsToCheck = ['tier_pay', 'tierPay', 'baseSalaryCategory', 'base_salary_category'];
      let needsUpdate = false;
      const updatePayload = {};

      fieldsToCheck.forEach(field => {
        const val = data[field];
        // If the field exists in the document and is "N/A" or empty, we update it to "Regular Host"
        if (val !== undefined && (val === 'N/A' || val === '')) {
          updatePayload[field] = 'Regular Host';
          needsUpdate = true;
        }
      });

      if (needsUpdate) {
        updatePayload.updated_at = new Date().toISOString();
        batch.update(docRef, updatePayload);
        batchSize++;
        colUpdated++;
        totalUpdated++;

        console.log(`  [UPDATE] Doc ID: ${docSnap.id} (Name/Nick: ${data.nickname || data.name || 'Unnamed'}) fields:`, updatePayload);

        // Commit batch if it reaches maximum size (500)
        if (batchSize === 500) {
          batch.commit();
          batchSize = 0;
        }
      }
    });

    if (batchSize > 0) {
      await batch.commit();
    }
    console.log(`Finished collection ${col}. Updated ${colUpdated} documents.`);
  }

  console.log(`\n🎉 Cleanup complete! Total updated documents across all collections: ${totalUpdated}`);
}

run().catch(console.error);
