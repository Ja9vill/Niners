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
  // Check users collection fields
  const snap = await db.collection('users').limit(5).get();
  console.log('=== USERS COLLECTION ===');
  snap.docs.forEach(d => {
    const data = d.data();
    console.log(`\nDoc ID: ${d.id}`);
    console.log(`Fields: ${Object.keys(data).join(', ')}`);
    console.log(`agent_id: ${data.agent_id}`);
  });

  // Check host_profile for NINE Agency
  console.log('\n\n=== host_profile with team_anchor=NINE Agency ===');
  const hpSnap = await db.collection('host_profile').where('team_anchor', '==', 'NINE Agency').limit(5).get();
  console.log(`Count: ${hpSnap.size}`);
  hpSnap.docs.forEach(d => {
    const data = d.data();
    console.log(`  ${d.id} | nickname: ${data.nickname} | agent_id: ${data.agent_id} | team_anchor: ${data.team_anchor}`);
  });

  // Check all profile collections for agent_id field presence
  console.log('\n\n=== PROFILE COLLECTIONS: agent_id field check ===');
  for (const col of ['host_profile', 'manager_profile', 'admin_profile', 'head_admin_profile', 'agent_profile', 'director_profile']) {
    const colSnap = await db.collection(col).limit(1).get();
    if (colSnap.empty) {
      console.log(`${col}: EMPTY`);
      continue;
    }
    const firstDoc = colSnap.docs[0].data();
    const hasAgentId = 'agent_id' in firstDoc;
    console.log(`${col}: has agent_id field = ${hasAgentId} | sample fields: ${Object.keys(firstDoc).join(', ')}`);
  }

  // Check manager_profile specifically
  console.log('\n\n=== MANAGER PROFILE (NINE Agency managers) ===');
  const mgrSnap = await db.collection('manager_profile').where('team_anchor', '==', 'NINE Agency').get();
  console.log(`Count: ${mgrSnap.size}`);
  mgrSnap.docs.forEach(d => {
    const data = d.data();
    console.log(`  ${d.id} | nickname: ${data.nickname} | agent_id: ${data.agent_id}`);
  });
}

main().catch(console.error);
