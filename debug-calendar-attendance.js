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

const app = admin.apps[0];
const db = app.firestore();
db.settings({ databaseId: 'nine-talent-management' });

async function main() {
  console.log('=== CALENDAR EVENT (sample) ===');
  const calSnap = await db.collection('calendar').limit(3).get();
  calSnap.docs.forEach(d => {
    const data = d.data();
    console.log(`\nDoc ID: ${d.id}`);
    console.log(`Fields: ${Object.keys(data).join(', ')}`);
    console.log(`event_id: ${data.event_id}`);
    console.log(`event_tittle: ${data.event_tittle}`);
    console.log(`event_date: ${data.event_date}`);
    console.log(`event_host_id: ${data.event_host_id}`);
    console.log(`from_time: ${data.from_time}`);
    console.log(`Full data: ${JSON.stringify(data, null, 2)}`);
  });

  console.log('\n\n=== ATTENDANCE RECORD (sample) ===');
  const attSnap = await db.collection('attendance').limit(3).get();
  attSnap.docs.forEach(d => {
    const data = d.data();
    console.log(`\nDoc ID: ${d.id}`);
    console.log(`Fields: ${Object.keys(data).join(', ')}`);
    console.log(`event_id: ${data.event_id}`);
    console.log(`attendees: ${JSON.stringify(data.attendees, null, 2)}`);
    console.log(`Full data: ${JSON.stringify(data, null, 2)}`);
  });

  console.log('\n\n=== MATCHING TEST ===');
  for (const calDoc of calSnap.docs) {
    const calData = calDoc.data();
    const eventId = calData.event_id;
    console.log(`\nCalendar event_id: ${eventId}`);
    
    // Direct doc lookup
    const directDoc = await db.collection('attendance').doc(eventId).get();
    console.log(`  Direct doc lookup: ${directDoc.exists ? 'FOUND' : 'NOT FOUND'}`);
    
    // Query by event_id field
    const querySnap = await db.collection('attendance').where('event_id', '==', eventId).get();
    console.log(`  Query by event_id field: ${querySnap.size} results`);
    if (!querySnap.empty) {
      const attData = querySnap.docs[0].data();
      console.log(`  Attendance attendees: ${JSON.stringify(attData.attendees)}`);
    }
  }

  console.log('\n\n=== HOST PROFILE (sample) ===');
  const hostSnap = await db.collection('host_profile').limit(3).get();
  hostSnap.docs.forEach(d => {
    const data = d.data();
    console.log(`\nDoc ID: ${d.id}`);
    console.log(`Fields: ${Object.keys(data).join(', ')}`);
    console.log(`poppo_id: ${data.poppo_id}`);
    console.log(`nickname: ${data.nickname}`);
    console.log(`photoUrl: ${data.photoUrl}`);
  });

  console.log('\n\n=== ALL USERS (sample from users collection) ===');
  const usersSnap = await db.collection('users').limit(3).get();
  usersSnap.docs.forEach(d => {
    const data = d.data();
    console.log(`\nDoc ID: ${d.id}`);
    console.log(`Fields: ${Object.keys(data).join(', ')}`);
    console.log(`role: ${data.role}`);
    console.log(`nickname: ${data.nickname}`);
    console.log(`photoUrl: ${data.photoUrl}`);
    console.log(`Full data: ${JSON.stringify(data, null, 2)}`);
  });
}

main().catch(console.error);
