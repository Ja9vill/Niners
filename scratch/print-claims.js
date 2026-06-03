import admin from 'firebase-admin';
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
}, 'claims-app');

async function run() {
  try {
    const auth = admin.auth(app);
    const userRecord = await auth.getUser('19157913');
    console.log('User 19157913 found:');
    console.log('Display Name:', userRecord.displayName);
    console.log('Custom Claims:', JSON.stringify(userRecord.customClaims || {}, null, 2));
  } catch (err) {
    console.error('Failed to get user 19157913:', err.message);
  }
  process.exit(0);
}

run();
