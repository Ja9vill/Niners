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

(async () => {
  try {
    const poppoId = '19157913';
    
    // Add to users collection
    const userRef = db.collection('users').doc(poppoId);
    await userRef.set({
      poppo_id: poppoId,
      nickname: 'Miss Nine',
      role: 'director',
      is_temp_password: false,
      password: '3Plus19=2007'
    });

    // Add to director collection
    const roleRef = db.collection('director').doc(poppoId);
    await roleRef.set({
      poppo_id: poppoId,
      nickname: 'Miss Nine',
      role: 'director',
      tier_pay: "",
      team_anchor: "",
      status: ""
    });




    console.log(`✅ Successfully seeded Director Miss Nine (ID: ${poppoId}) to users collection.`);
    process.exit(0);
  } catch (err) {
    console.error('❌ Failed to seed Director:', err);
    process.exit(1);
  }
})();
