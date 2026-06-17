/**
 * Run with: node scripts/createTestHost.mjs
 * Creates a test host account in Firestore with known credentials.
 * Test Host — Poppo ID: 99999999 / Password: Test1234
 */
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';

dotenv.config();

// Must match the hardcoded DB ID in src/server/auth.ts → getAdminFirestore()
const FIRESTORE_DB_ID = process.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID || 'ai-studio-f578d03a-99b3-4c41-84dd-9901137e8386';

function getApp() {
  if (getApps().length) return getApps()[0];
  return initializeApp({
    credential: cert({
      projectId:   process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey:  (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    }),
  });
}

async function main() {
  const app  = getApp();
  const db   = getFirestore(app, FIRESTORE_DB_ID);

  const TEST_POPPO_ID = '99999999';
  const TEST_PASSWORD = 'Test1234';
  const hashed        = await bcrypt.hash(TEST_PASSWORD, 12);

  const hostData = {
    id:                   TEST_POPPO_ID,
    poppo_id:             TEST_POPPO_ID,
    name:                 'Test Host',
    nickname:             'TestHost9',
    role:                 'host',          // stored lowercase — RoleGuard normalises to 'host' ✓
    team:                 'Alpha',
    manager:              'Unassigned',
    anchor_type:          'Nine Agency',
    base_salary_category: 'Regular Host',
    tier_pay:             'Regular Host',
    status:               'Active',
    level:                10,
    tier:                 'C',
    isActive:             true,
    password:             hashed,
    is_temp_password:     false,
    followers_count:      5000,
    bio:                  'This is a test host account for development.',
    social_links: {
      fb:       'https://facebook.com/testhost',
      ig:       '@testhost9',
      tiktok:   '@testhost9',
      whatsapp: '',
    },
    streaming_hours: [
      { from: '8:00 PM', to: '10:00 PM' },
    ],
    created_at:  new Date().toISOString(),
    updated_at:  new Date().toISOString(),
  };

  await db.collection('users').doc(TEST_POPPO_ID).set(hostData, { merge: true });
  console.log('');
  console.log('✅ Test host account created/updated successfully!');
  console.log('');
  console.log('  Poppo ID : 99999999');
  console.log('  Password : Test1234');
  console.log('  Role     : host  →  sees /app/my-profile (Profile tab)');
  console.log(`  DB       : ${FIRESTORE_DB_ID}`);
  console.log('');
  process.exit(0);
}

main().catch(err => {
  console.error('❌ Failed:', err.message || err);
  process.exit(1);
});
