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

const NEW_DB = 'nine-talent-management';
const db = getFirestore(app, NEW_DB);

async function main() {
  // Get all calendar event_ids
  const calSnap = await db.collection('calendar').get();
  const calEventIds = new Set();
  calSnap.forEach(d => {
    const data = d.data();
    if (data.event_id) calEventIds.add(data.event_id);
    calEventIds.add(d.id);
  });

  // Get all attendance docs
  const attSnap = await db.collection('attendance').get();
  
  console.log(`Calendar: ${calSnap.size} docs, Attendance: ${attSnap.size} docs\n`);

  const matched = [];
  const unmatched = [];

  attSnap.forEach(d => {
    const data = d.data();
    const attEventId = data.event_id || '';
    const attDocId = d.id;
    
    // Check all possible event ID matches
    const checkIds = [attEventId, attDocId].filter(Boolean);
    let foundMatch = false;
    let matchedId = '';
    
    for (const id of checkIds) {
      if (calEventIds.has(id)) {
        foundMatch = true;
        matchedId = id;
        break;
      }
    }

    const attendees = (data.attendees || []).map(a => {
      if (typeof a === 'string') return a;
      return `${a.nickname || a.poppo_id || 'unknown'} (${a.role || '?'})`;
    });

    const record = {
      attDocId,
      attEventId,
      eventTitle: data.event_tittle || data.eventTitle || 'N/A',
      eventDate: data.event_date || data.eventDate || 'N/A',
      attendees,
      matchedId,
    };

    if (foundMatch) {
      matched.push(record);
    } else {
      unmatched.push(record);
    }
  });

  console.log(`✅ MATCHED: ${matched.length}`);
  matched.forEach(r => {
    console.log(`  Doc: ${r.attDocId}`);
    console.log(`  Att event_id: ${r.attEventId}`);
    console.log(`  Matched via: ${r.matchedId}`);
    console.log(`  Title: ${r.eventTitle} (${r.eventDate})`);
    console.log(`  Attendees: ${r.attendees.join(', ')}`);
    console.log();
  });

  console.log(`❌ UNMATCHED: ${unmatched.length}`);
  unmatched.forEach(r => {
    console.log(`  Doc: ${r.attDocId}`);
    console.log(`  Att event_id: ${r.attEventId}`);
    console.log(`  Title: ${r.eventTitle} (${r.eventDate})`);
    console.log(`  Attendees: ${r.attendees.join(', ')}`);
    console.log();
  });

  // Also show sample calendar event_ids
  console.log('\nSample calendar event_ids (first 5):');
  let i = 0;
  calSnap.forEach(d => {
    if (i >= 5) return;
    const data = d.data();
    console.log(`  doc_id=${d.id} | event_id=${data.event_id || 'UNDEFINED'}`);
    i++;
  });

  // Show sample attendance event_ids
  console.log('\nSample attendance event_ids (first 5):');
  i = 0;
  attSnap.forEach(d => {
    if (i >= 5) return;
    const data = d.data();
    console.log(`  doc_id=${d.id} | event_id=${data.event_id || 'UNDEFINED'}`);
    i++;
  });

  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
