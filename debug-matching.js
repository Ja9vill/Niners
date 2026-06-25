import admin from 'firebase-admin';
import fs from 'fs';

const possibleEnvPaths = ['.env', '../.env', '../../.env'];
let envPath;
for (const p of possibleEnvPaths) { if (fs.existsSync(p)) { envPath = p; break; } }
const env = fs.readFileSync(envPath, 'utf8');
env.split(/\r?\n/).forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    const key = parts[0].trim();
    let value = parts.slice(1).join('=').trim();
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    process.env[key] = value;
  }
});

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL || process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      privateKey: (process.env.FIREBASE_PRIVATE_KEY || process.env.GOOGLE_SERVICE_ACCOUNT_KEY)?.replace(/\\n/g, '\n'),
    }),
  });
}

const db = admin.firestore();
db.settings({ databaseId: 'nine-talent-management' });

async function main() {
  // Get ALL attendance event_ids
  const attSnap = await db.collection('attendance').get();
  const attEventIds = new Set();
  const attByEventId = {};
  attSnap.docs.forEach(d => {
    const data = d.data();
    if (data.event_id) {
      attEventIds.add(data.event_id);
      attByEventId[data.event_id] = { docId: d.id, attendees: data.attendees?.length || 0, title: data.event_tittle };
    }
  });
  console.log(`Total attendance records: ${attSnap.size}`);
  console.log(`Unique event_ids in attendance: ${attEventIds.size}`);

  // Get ALL calendar event_ids
  const calSnap = await db.collection('calendar').get();
  const calEventIds = new Set();
  calSnap.docs.forEach(d => {
    const data = d.data();
    if (data.event_id) calEventIds.add(data.event_id);
  });
  console.log(`Total calendar events: ${calSnap.size}`);
  console.log(`Unique event_ids in calendar: ${calEventIds.size}`);

  // Check overlap
  let matches = 0;
  let unmatchedAtt = [];
  for (const attEventId of attEventIds) {
    if (calEventIds.has(attEventId)) {
      matches++;
    } else {
      unmatchedAtt.push(attByEventId[attEventId]);
    }
  }
  console.log(`\nMatching event_ids: ${matches}`);
  console.log(`Unmatched attendance records (no calendar event): ${unmatchedAtt.length}`);
  unmatchedAtt.forEach(a => console.log(`  - Doc ${a.docId}: "${a.title}" (${a.attendees} attendees)`));

  // Also check: does the attendance doc ID ever match an event_id?
  let docIdMatches = 0;
  attSnap.docs.forEach(d => {
    if (calEventIds.has(d.id)) docIdMatches++;
  });
  console.log(`\nAttendance doc IDs that match calendar event_ids: ${docIdMatches}`);

  // Check June 12 events specifically
  console.log('\n=== JUNE 12 EVENTS ===');
  const jun12Cal = calSnap.docs.filter(d => d.data().event_date === '2026-06-12');
  console.log(`Calendar events on 2026-06-12: ${jun12Cal.length}`);
  for (const d of jun12Cal) {
    const data = d.data();
    const hasAtt = attEventIds.has(data.event_id);
    const attInfo = attByEventId[data.event_id];
    console.log(`  ${data.event_tittle} (event_id: ${data.event_id}) → attendance: ${hasAtt ? `${attInfo.attendees} attendees` : 'NONE'}`);
  }

  const jun12Att = attSnap.docs.filter(d => d.data().event_date === '2026-06-12');
  console.log(`\nAttendance records on 2026-06-12: ${jun12Att.length}`);
  for (const d of jun12Att) {
    const data = d.data();
    console.log(`  "${data.event_tittle}" (event_id: ${data.event_id}) → calendar match: ${calEventIds.has(data.event_id)}`);
  }

  // Check June 13 events
  console.log('\n=== JUNE 13 EVENTS ===');
  const jun13Cal = calSnap.docs.filter(d => d.data().event_date === '2026-06-13');
  console.log(`Calendar events on 2026-06-13: ${jun13Cal.length}`);
  for (const d of jun13Cal) {
    const data = d.data();
    const hasAtt = attEventIds.has(data.event_id);
    const attInfo = attByEventId[data.event_id];
    console.log(`  ${data.event_tittle} (event_id: ${data.event_id}) → attendance: ${hasAtt ? `${attInfo.attendees} attendees` : 'NONE'}`);
  }
}

main().catch(console.error);
