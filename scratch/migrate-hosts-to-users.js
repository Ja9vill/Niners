import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';

const envPath = '.env';
const envContent = fs.readFileSync(envPath, 'utf8');
const keys = {
  FIREBASE_PRIVATE_KEY: '',
  GOOGLE_SERVICE_ACCOUNT_EMAIL: '',
  FIREBASE_PROJECT_ID: ''
};

const lines = envContent.split(/\r?\n/);
lines.forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    const key = parts[0].trim();
    let value = parts.slice(1).join('=').trim();
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    else if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
    if (key in keys || key === 'GOOGLE_SERVICE_ACCOUNT_KEY') {
      if (key === 'GOOGLE_SERVICE_ACCOUNT_KEY') keys.FIREBASE_PRIVATE_KEY = value;
      else keys[key] = value;
    }
  }
});

const privateKey = keys.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');
const clientEmail = keys.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const projectId = keys.FIREBASE_PROJECT_ID;

const app = admin.initializeApp({
  credential: admin.credential.cert({
    projectId,
    clientEmail,
    privateKey
  })
}, 'migration-app');

const db = getFirestore(app, 'ai-studio-f578d03a-99b3-4c41-84dd-9901137e8386');

async function run() {
  try {
    const usersSnap = await db.collection('users').get();
    console.log(`Found ${usersSnap.size} users in 'users' collection.`);
    
    for (const userDoc of usersSnap.docs) {
      const userId = userDoc.id;
      const userData = userDoc.data();
      
      // Look up this user in the hosts collection
      const hostDoc = await db.collection('hosts').doc(userId).get();
      if (hostDoc.exists) {
        const hostData = hostDoc.data();
        console.log(`\nFound host document for ${userId} (${userData.nickname || hostData.nickname}).`);
        
        // Build merge data
        const mergeData = {};
        
        // Fields to copy from hostDoc if missing in userDoc
        const fieldsToMigrate = [
          'password',
          'isActive',
          'team',
          'manager',
          'anchor_type',
          'base_salary_category',
          'status',
          'level',
          'tier',
          'photoUrl',
          'googleUid',
          'googleEmail',
          'is_temp_password'
        ];
        
        fieldsToMigrate.forEach(field => {
          if (hostData[field] !== undefined) {
            // If the field doesn't exist in users, or is different, set it
            if (userData[field] === undefined || userData[field] === null) {
              mergeData[field] = hostData[field];
              console.log(`  -> Copying ${field}: ${JSON.stringify(hostData[field])}`);
            }
          }
        });
        
        if (Object.keys(mergeData).length > 0) {
          await db.collection('users').doc(userId).set(mergeData, { merge: true });
          console.log(`  ✅ Successfully updated user document ${userId}`);
        } else {
          console.log(`  ℹ️ User document ${userId} is already fully synchronized.`);
        }
      } else {
        console.log(`\n⚠️ No host document found for user ${userId} (${userData.nickname})`);
      }
    }
  } catch (err) {
    console.error('Migration failed:', err.message || err);
  }
  process.exit(0);
}

run();
