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

const db = getFirestore(app, 'nine-talent-management');

async function main() {
  console.log('Checking calendar collection in nine-talent-management...\n');
  
  // Get all calendar events and check for the typo field
  const snap = await db.collection('calendar').get();
  let typoCount = 0;
  let correctCount = 0;
  
  snap.docs.forEach(doc => {
    const data = doc.data();
    if ('panticipantids' in data) {
      typoCount++;
    }
    if ('participantids' in data) {
      correctCount++;
    }
  });
  
  console.log(`Total calendar documents: ${snap.size}`);
  console.log(`Documents with 'panticipantids' (typo): ${typoCount}`);
  console.log(`Documents with 'participantids': ${correctCount}`);
  
  if (typoCount > 0) {
    console.log('\nRenaming panticipantids -> participantids for all documents...');
    const batch = db.batch();
    
    snap.docs.forEach(doc => {
      const data = doc.data();
      if ('panticipantids' in data) {
        const newData = { ...data };
        delete newData.panticipantids;
        newData.participantids = data.panticipantids;
        batch.update(doc.ref, newData);
      }
    });
    
    await batch.commit();
    console.log(`Renamed ${typoCount} documents.`);
  } else {
    console.log('\nNo documents with typo field found.');
  }
}

main().catch(e => { console.error(e); process.exit(1); });