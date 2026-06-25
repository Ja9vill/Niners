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
  // 1. Find June 12 events
  console.log('=== CALENDAR: June 12, 2026 events ===\n');
  const calSnap = await db.collection('calendar').get();
  const june12Events = [];
  calSnap.forEach(d => {
    const data = d.data();
    const date = data.date || data.event_date || '';
    if (date === '2026-06-12') {
      june12Events.push({ id: d.id, data });
    }
  });

  for (const ev of june12Events) {
    console.log(`Event ID: ${ev.id}`);
    console.log(`  event_id field: ${ev.data.event_id}`);
    console.log(`  title: ${ev.data.title}`);
    console.log(`  date: ${ev.data.date}`);
    console.log(`  time: ${ev.data.time}`);
    console.log(`  type: ${ev.data.type}`);
    console.log(`  poppo_id: ${ev.data.poppo_id}`);
    console.log(`  participants: ${JSON.stringify(ev.data.participants)}`);
    console.log(`  Fields: ${Object.keys(ev.data).join(', ')}`);
    console.log();
  }

  // 2. Find all attendance records with event_date = 2026-06-12
  console.log('\n=== ATTENDANCE: June 12 records ===\n');
  const attSnap = await db.collection('attendance').get();
  const june12Att = [];
  attSnap.forEach(d => {
    const data = d.data();
    const date = data.event_date || data.eventDate || '';
    if (date === '2026-06-12') {
      june12Att.push({ id: d.id, data });
    }
  });

  if (june12Att.length === 0) {
    console.log('No attendance records found for June 12!');
  }

  for (const att of june12Att) {
    console.log(`Attendance Doc: ${att.id}`);
    console.log(`  event_id: ${att.data.event_id}`);
    console.log(`  event_tittle: ${att.data.event_tittle}`);
    console.log(`  event_date: ${att.data.event_date}`);
    console.log(`  attendees: ${JSON.stringify(att.data.attendees)}`);
    console.log();
  }

  // 3. For each June 12 calendar event, try to find matching attendance
  console.log('\n=== MATCHING ===\n');
  for (const ev of june12Events) {
    const eid = ev.data.event_id || ev.id;
    const match = june12Att.find(a => a.data.event_id === eid);
    if (match) {
      console.log(`✅ Calendar "${ev.data.title}" (${ev.id}) matches attendance doc ${match.id}`);
      console.log(`   event_id used for match: ${eid}`);
    } else {
      console.log(`❌ Calendar "${ev.data.title}" (${ev.id}) has NO matching attendance`);
      console.log(`   event_id: ${eid}`);
      // Try matching by doc ID
      const matchByDoc = june12Att.find(a => a.id === eid);
      if (matchByDoc) {
        console.log(`   BUT found match by doc ID!`);
      }
    }
  }

  // 4. Also check: what does the frontend CalendarEvent look like for these events?
  // The CalendarEvent type has event_id as optional, but the data has event_id set
  console.log('\n=== CalendarEvent object shape for June 12 events ===\n');
  for (const ev of june12Events) {
    const data = ev.data;
    console.log(`event_id: ${data.event_id}`);
    console.log(`id: ${data.id}`);
    console.log(`date: ${data.date}`);
    console.log(`title: ${data.title}`);
    console.log(`poppo_id: ${data.poppo_id}`);
    console.log(`participants: ${JSON.stringify(data.participants)}`);
    console.log();
  }

  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
