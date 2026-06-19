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
  console.log(`Updating fields to Regular Host for host ID: ${hostId}...`);

  const updateData = {
    tier_pay: 'Regular Host',
    tierPay: 'Regular Host',
    baseSalaryCategory: 'Regular Host',
    base_salary_category: 'Regular Host',
    updated_at: new Date().toISOString()
  };

  await db.collection('users').doc(hostId).update(updateData);
  await db.collection('host').doc(hostId).update(updateData);

  console.log('✅ Successfully updated Addy in both users and host collections!');
}

run().catch(console.error);
