/**
 * seed-test-credentials.js
 * Run: node seed-test-credentials.js
 * Creates one test login account per role in Firestore.
 */

const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const bcrypt = require('bcrypt');
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

const TEST_ACCOUNTS = [
  {
    id: 'test_host',
    nickname: 'Test Host',
    name: 'Test Host',
    role: 'host',
    password: 'host1234',
    tier: 'B',
    level: 1,
    team: 'Alpha',
    manager: 'Nine Management',
    anchor_type: 'Nine Agency',
    base_salary_category: 'Regular Host',
    status: 'Active',
    isActive: true,
  },
  {
    id: 'test_agent',
    nickname: 'Test Agent',
    name: 'Test Agent',
    role: 'agent',
    password: 'agent1234',
    tier: 'B',
    level: 2,
    team: 'Alpha',
    manager: 'Nine Management',
    anchor_type: 'Nine Agency',
    base_salary_category: 'N/A',
    status: 'Active',
    isActive: true,
  },
  {
    id: 'test_manager',
    nickname: 'Test Manager',
    name: 'Test Manager',
    role: 'manager',
    password: 'manager1234',
    tier: 'A',
    level: 3,
    team: 'Alpha',
    manager: 'Nine Management',
    anchor_type: 'Nine Agency',
    base_salary_category: 'N/A',
    status: 'Active',
    isActive: true,
  },
  {
    id: 'test_admin',
    nickname: 'Test Admin',
    name: 'Test Admin',
    role: 'admin',
    password: 'admin1234',
    tier: 'S',
    level: 4,
    team: 'Management',
    manager: 'N/A',
    anchor_type: 'Nine Agency',
    base_salary_category: 'N/A',
    status: 'Active',
    isActive: true,
  },
  {
    id: 'test_headadmin',
    nickname: 'Test Head Admin',
    name: 'Test Head Admin',
    role: 'head admin',
    password: 'headadmin1234',
    tier: 'S',
    level: 4,
    team: 'Management',
    manager: 'N/A',
    anchor_type: 'Nine Agency',
    base_salary_category: 'N/A',
    status: 'Active',
    isActive: true,
  },
];

async function seed() {
  console.log('\n🔐 Seeding test credentials for all roles...\n');
  const db = getDB();
  const SALT_ROUNDS = 10;

  for (const account of TEST_ACCOUNTS) {
    try {
      const hashedPassword = await bcrypt.hash(account.password, SALT_ROUNDS);
      const doc = {
        ...account,
        password: hashedPassword,
        is_temp_password: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      // Remove plain password from stored doc
      delete doc.password;
      doc.password = hashedPassword;

      await db.collection('users').doc(account.id).set(doc, { merge: true });
      console.log(`  ✅ [${account.role.toUpperCase().padEnd(11)}]  ID: ${account.id.padEnd(16)}  Password: ${account.password}`);
    } catch (err) {
      console.error(`  ❌ Failed to seed ${account.id}:`, err.message);
    }
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  LOGIN CREDENTIALS (use as Poppo ID + Password)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  for (const a of TEST_ACCOUNTS) {
    console.log(`  ${a.role.toUpperCase().padEnd(12)} →  username: ${a.id.padEnd(18)} password: ${a.password}`);
  }
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('✅ Done! All accounts are ready.\n');
  process.exit(0);
}

seed().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
