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

async function run() {
  console.log('--- Fetching recent system logs ---');
  const logsSnap = await db.collection('system_logs').orderBy('timestamp', 'desc').limit(15).get();
  logsSnap.forEach(doc => {
    const data = doc.data();
    console.log(`[${data.timestamp}] [${data.userRole} ${data.userId}]: ${data.actionDescription}`);
  });

  console.log('\n--- Fetching hosts with tier_pay = Regular Host ---');
  const hostSnap = await db.collection('host').get();
  let hostCount = 0;
  hostSnap.forEach(doc => {
    const data = doc.data();
    const tierPay = data.tier_pay || data.tierPay || data.base_salary_category || data.baseSalaryCategory;
    if (tierPay && tierPay.toLowerCase().includes('regular')) {
      console.log(`Found host in host collection: ID: ${doc.id}, Name: ${data.nickname || data.name}, tier_pay: ${tierPay}`);
      hostCount++;
    }
  });
  console.log(`Total host: ${hostCount}`);

  console.log('\n--- Fetching users with tier_pay = Regular Host ---');
  const userSnap = await db.collection('users').get();
  let userCount = 0;
  userSnap.forEach(doc => {
    const data = doc.data();
    const tierPay = data.tier_pay || data.tierPay || data.base_salary_category || data.baseSalaryCategory;
    if (tierPay && tierPay.toLowerCase().includes('regular')) {
      console.log(`Found user in users collection: ID: ${doc.id}, Name: ${data.nickname || data.name}, tier_pay: ${tierPay}`);
      userCount++;
    }
  });
  console.log(`Total user: ${userCount}`);
}

run().catch(console.error);
