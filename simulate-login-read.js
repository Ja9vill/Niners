import admin from 'firebase-admin';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithCustomToken } from 'firebase/auth';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import fs from 'fs';

const envPath = '.env';
const envContent = fs.readFileSync(envPath, 'utf8');
const keys = {
  FIREBASE_PRIVATE_KEY: '',
  GOOGLE_SERVICE_ACCOUNT_EMAIL: '',
  FIREBASE_PROJECT_ID: '',
  VITE_FIREBASE_API_KEY: '',
  VITE_FIREBASE_AUTH_DOMAIN: '',
  VITE_FIREBASE_PROJECT_ID: '',
  VITE_FIREBASE_STORAGE_BUCKET: '',
  VITE_FIREBASE_MESSAGING_SENDER_ID: '',
  VITE_FIREBASE_APP_ID: ''
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

// 1. Initialize Admin App to generate custom token
const adminApp = admin.initializeApp({
  credential: admin.credential.cert({
    projectId,
    clientEmail,
    privateKey
  })
}, 'admin-token-gen');

async function run() {
  try {
    const poppoId = '19157913';
    console.log('Generating custom token using Admin SDK...');
    const developerClaims = {
      tempPasswordRequired: false,
      role: 'Director', // match capitalized 'Director' claim as set in DB
      isSuperAdmin: true
    };
    const customToken = await admin.auth(adminApp).createCustomToken(poppoId, developerClaims);
    console.log('Custom token generated.');

    // 2. Initialize Client App
    const clientConfig = {
      apiKey: keys.VITE_FIREBASE_API_KEY,
      authDomain: keys.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: keys.VITE_FIREBASE_PROJECT_ID,
      storageBucket: keys.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: keys.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: keys.VITE_FIREBASE_APP_ID
    };

    console.log('Initializing client app with config:', clientConfig.projectId);
    const clientApp = initializeApp(clientConfig);
    const auth = getAuth(clientApp);
    const db = getFirestore(clientApp, 'ai-studio-f578d03a-99b3-4c41-84dd-9901137e8386');

    // 3. Sign in to Firebase Auth with Custom Token
    console.log('Signing in with custom token...');
    const userCredential = await signInWithCustomToken(auth, customToken);
    console.log('Signed in successfully as:', userCredential.user.uid);

    // 4. Query collections
    const collections = ['users', 'tasks', 'activity_audit_logs', 'top_niners_earnings_summary'];
    for (const coll of collections) {
      try {
        console.log(`Attempting getDocs on '${coll}'...`);
        const snap = await getDocs(collection(db, coll));
        console.log(`✅ Success! Found ${snap.size} documents in '${coll}'.`);
      } catch (err) {
        console.error(`❌ Failed to read '${coll}':`, err.message);
      }
    }

  } catch (err) {
    console.error('Simulation failed:', err.message || err);
  }
  process.exit(0);
}

run();
