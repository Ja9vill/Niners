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

const OLD_DB = 'ai-studio-f578d03a-99b3-4c41-84dd-9901137e8386';
const NEW_DB = 'nine-talent-management';

async function main() {
  // Check attendance in old DB
  const oldDb = getFirestore(app, OLD_DB);
  const oldSnap = await oldDb.collection('attendance').get();
  console.log(`OLD DB (${OLD_DB}): ${oldSnap.size} attendance docs`);

  // Check attendance in new DB
  const newDb = getFirestore(app, NEW_DB);
  const newSnap = await newDb.collection('attendance').get();
  console.log(`NEW DB (${NEW_DB}): ${newSnap.size} attendance docs`);

  // Check calendar in old DB
  const oldCalSnap = await oldDb.collection('calendar').get();
  console.log(`OLD DB calendar: ${oldCalSnap.size} docs`);

  // Check calendar in new DB
  const newCalSnap = await newDb.collection('calendar').get();
  console.log(`NEW DB calendar: ${newCalSnap.size} docs`);

  // Check if any attendance event_ids match calendar event_ids in new DB
  if (newSnap.size > 0) {
    const calEventIds = new Set();
    newCalSnap.forEach(d => {
      const data = d.data();
      if (data.event_id) calEventIds.add(data.event_id);
      calEventIds.add(d.id);
    });

    let matched = 0, unmatched = 0;
    newSnap.forEach(d => {
      const data = d.data();
      const eid = data.event_id || d.id;
      if (calEventIds.has(eid)) matched++;
      else unmatched++;
    });
    console.log(`\nNEW DB attendance vs calendar: ${matched} matched, ${unmatched} unmatched`);
  }

  // Show one sample attendance doc from new DB
  if (newSnap.size > 0) {
    const sample = newSnap.docs[0];
    const data = sample.data();
    console.log(`\nSample NEW DB attendance doc (${sample.id}):`);
    console.log(`  Fields: ${Object.keys(data).join(', ')}`);
    console.log(`  event_id: ${data.event_id}`);
    console.log(`  attendees type: ${Array.isArray(data.attendees) ? 'array[' + data.attendees.length + ']' : typeof data.attendees}`);
    if (Array.isArray(data.attendees) && data.attendees.length > 0) {
      console.log(`  attendees[0]: ${JSON.stringify(data.attendees[0])}`);
    }
  }

  // Check if the frontend db.ts points to old or new
  console.log(`\nFrontend firebase.ts uses: getFirestore(app, "${OLD_DB}")`);
  console.log(`User's new database: "${NEW_DB}"`);

  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
