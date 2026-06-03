import admin from 'firebase-admin';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithCustomToken } from 'firebase/auth';
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
    console.log('Generating custom token...');
    const developerClaims = {
      tempPasswordRequired: false,
      role: 'Director',
      isSuperAdmin: true
    };
    const customToken = await admin.auth(adminApp).createCustomToken(poppoId, developerClaims);

    // Initialize Client App
    const clientConfig = {
      apiKey: keys.VITE_FIREBASE_API_KEY,
      authDomain: keys.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: keys.VITE_FIREBASE_PROJECT_ID,
      storageBucket: keys.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: keys.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: keys.VITE_FIREBASE_APP_ID
    };

    const clientApp = initializeApp(clientConfig);
    const auth = getAuth(clientApp);

    console.log('Signing in with custom token...');
    const userCredential = await signInWithCustomToken(auth, customToken);
    console.log('Signed in successfully.');

    console.log('Retrieving fresh ID Token...');
    const idToken = await userCredential.user.getIdToken(true);
    
    console.log('Verifying ID Token using Admin SDK to check decoded claims...');
    const decodedToken = await admin.auth(adminApp).verifyIdToken(idToken);
    console.log('Decoded Claims on Client Token:', JSON.stringify(decodedToken, null, 2));

  } catch (err) {
    console.error('Failed:', err.message || err);
  }
  process.exit(0);
}

run();
