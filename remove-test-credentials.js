/**
 * remove-test-credentials.js
 * Run: node remove-test-credentials.js
 * Deletes all test accounts from Firestore.
 */

const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

function getAdminApp() {
  if (getApps().length) return getApps()[0];
  const privateKey = (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n');
  return initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey,
    }),
  });
}

function getDB() {
  getAdminApp();
  return getFirestore('ai-studio-f578d03a-99b3-4c41-84dd-9901137e8386');
}

const TEST_IDS = [
  'test_host',
  'test_agent',
  'test_manager',
  'test_admin',
  'test_headadmin',
  'test_director',
];

async function remove() {
  console.log('\n🗑️  Removing all test credentials from Firestore...\n');
  const db = getDB();

  for (const id of TEST_IDS) {
    try {
      const ref = db.collection('users').doc(id);
      const snap = await ref.get();
      if (snap.exists) {
        await ref.delete();
        console.log(`  ✅ Deleted: ${id}`);
      } else {
        console.log(`  ⚠️  Not found (skipped): ${id}`);
      }
    } catch (err) {
      console.error(`  ❌ Failed to delete ${id}:`, err.message);
    }
  }

  console.log('\n✅ Done. All test accounts removed.\n');
  process.exit(0);
}

remove().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
