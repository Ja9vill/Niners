import dotenv from 'dotenv';
import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';

const possiblePaths = ['.env', '../.env', '../../.env'];
let envPath = possiblePaths.find(p => fs.existsSync(p));

if (!envPath) {
  console.error("❌ ERROR: No .env file found. Searched:", possiblePaths.join(', '));
  process.exit(1);
}
console.log(`📂 Using .env from: ${envPath}`);

try {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const lines = envContent.split(/\r?\n/);
  lines.forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
      const key = parts[0].trim();
      let value = parts.slice(1).join('=').trim();
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1);
      }
      process.env[key] = value;
    }
  });
} catch (err) {
  dotenv.config({ path: envPath });
}

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL || process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const privateKey = (process.env.FIREBASE_PRIVATE_KEY || process.env.GOOGLE_SERVICE_ACCOUNT_KEY)?.replace(/\\n/g, '\n');

const app = admin.initializeApp({
  credential: admin.credential.cert({
    projectId,
    clientEmail,
    privateKey,
  })
});

const db = getFirestore(app, 'ai-studio-f578d03a-99b3-4c41-84dd-9901137e8386');

async function main() {
  // 1. Fetch all calendar event_ids
  console.log("📅 Fetching 'calendar' collection...");
  const calendarSnap = await db.collection('calendar').get();
  console.log(`   Found ${calendarSnap.size} documents.`);

  const calendarEventIds = new Set();
  calendarSnap.forEach(d => {
    const data = d.data();
    // Try multiple possible field names for event_id
    const eid = data.event_id || data.eventId || data.id || d.id;
    if (eid) calendarEventIds.add(String(eid));
    // Also check if document ID itself is the event_id
    calendarEventIds.add(d.id);
  });

  console.log(`   Unique calendar event_ids: ${calendarEventIds.size}\n`);

  // 2. Fetch all attendance records
  console.log("📋 Fetching 'attendance' collection...");
  const attendanceSnap = await db.collection('attendance').get();
  console.log(`   Found ${attendanceSnap.size} documents.\n`);

  const matched = [];
  const unmatched = [];

  attendanceSnap.forEach(d => {
    const data = d.data();
    // Try multiple field names for the event reference
    const possibleIds = [
      data.event_id,
      data.eventId,
      data.event_ID,
      d.id, // document ID might be the event_id
    ].filter(Boolean).map(String);

    const uniquePossible = [...new Set(possibleIds)];
    let foundMatch = false;

    for (const pid of uniquePossible) {
      if (calendarEventIds.has(pid)) {
        foundMatch = true;
        break;
      }
    }

    const record = {
      attendanceDocId: d.id,
      possibleEventIds: uniquePossible,
      eventTitle: data.eventTitle || data.event_title || data.title || 'N/A',
      eventDate: data.eventDate || data.event_date || 'N/A',
      attendees: (data.attendees || []).map(a => a.nickname || a.poppoId || a.poppo_id || 'unknown'),
      attendeeCount: (data.attendees || []).length || (data.attendeeIds || []).length || 0,
    };

    if (foundMatch) {
      matched.push(record);
    } else {
      unmatched.push(record);
    }
  });

  // 3. Output results
  console.log("═══════════════════════════════════════════════════════════");
  console.log(`✅ MATCHED: ${matched.length} attendance records have matching calendar event_ids`);
  console.log("═══════════════════════════════════════════════════════════");
  matched.forEach(r => {
    console.log(`  📄 Doc: ${r.attendanceDocId}`);
    console.log(`     Event: ${r.eventTitle} (${r.eventDate})`);
    console.log(`     Event IDs checked: ${r.possibleEventIds.join(', ')}`);
    console.log(`     Attendees (${r.attendeeCount}): ${r.attendees.join(', ') || 'none'}`);
    console.log();
  });

  console.log("═══════════════════════════════════════════════════════════");
  console.log(`❌ UNMATCHED: ${unmatched.length} attendance records have NO matching calendar event_id`);
  console.log("═══════════════════════════════════════════════════════════");
  unmatched.forEach(r => {
    console.log(`  📄 Doc: ${r.attendanceDocId}`);
    console.log(`     Event: ${r.eventTitle} (${r.eventDate})`);
    console.log(`     Event IDs checked: ${r.possibleEventIds.join(', ')}`);
    console.log(`     Attendees (${r.attendeeCount}): ${r.attendees.join(', ') || 'none'}`);
    console.log();
  });

  console.log("═══════════════════════════════════════════════════════════");
  console.log(`📊 SUMMARY`);
  console.log(`   Calendar documents: ${calendarSnap.size}`);
  console.log(`   Attendance documents: ${attendanceSnap.size}`);
  console.log(`   Matched: ${matched.length}`);
  console.log(`   Unmatched: ${unmatched.length}`);
  console.log("═══════════════════════════════════════════════════════════");

  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
