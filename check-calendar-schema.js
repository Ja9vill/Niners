import dotenv from 'dotenv';
import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';

const possibleEnvPaths = ['.env', '../.env', '../../.env'];
let envPath = possibleEnvPaths.find(p => fs.existsSync(p));

const envContent = fs.readFileSync(envPath, 'utf8');
envContent.split(/\r?\n/).forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    const key = parts[0].trim();
    let value = parts.slice(1).join('=').trim();
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    process.env[key] = value;
  }
});

const app = admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL || process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    privateKey: (process.env.FIREBASE_PRIVATE_KEY || process.env.GOOGLE_SERVICE_ACCOUNT_KEY)?.replace(/\\n/g, '\n'),
  })
});

const db = getFirestore(app, 'ai-studio-f578d03a-99b3-4c41-84dd-9901137e8386');

async function main() {
  const snap = await db.collection('calendar').limit(5).get();
  snap.forEach(d => {
    const data = d.data();
    console.log('Doc ID:', d.id);
    console.log('  event_id:', data.event_id ?? 'UNDEFINED');
    console.log('  eventId:', data.eventId ?? 'UNDEFINED');
    console.log('  Fields:', Object.keys(data).join(', '));
    console.log();
  });
  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
