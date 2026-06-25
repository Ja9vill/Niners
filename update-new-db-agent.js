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

const AGENT_ID = '19381364';
const PROFILE_COLLECTIONS = [
  'host_profile', 'manager_profile', 'agent_profile',
  'director_profile', 'head_admin_profile', 'admin_profile'
];

async function main() {
  const allUpdates = [];

  for (const colName of PROFILE_COLLECTIONS) {
    const snap = await db.collection(colName).get();
    if (snap.size === 0) continue;

    snap.forEach(d => {
      const data = d.data();
      const teamAnchor = String(
        data.teamAnchor || data.team_anchor || data.team || ''
      ).trim().toLowerCase();

      if (teamAnchor === 'nine agency') {
        allUpdates.push({
          collection: colName,
          docId: d.id,
          nickname: data.nickname || data.name || 'N/A',
          role: data.role || colName.replace('_profile', ''),
        });
      }
    });
  }

  if (allUpdates.length === 0) {
    console.log('No matches found. Nothing to update.');
    process.exit(0);
  }

  console.log(`Updating ${allUpdates.length} profile docs with agent_id = "${AGENT_ID}"...\n`);

  const batch = db.batch();
  for (const u of allUpdates) {
    const ref = db.collection(u.collection).doc(u.docId);
    batch.update(ref, { agent_id: AGENT_ID });
    console.log(`  [BATCH] ${u.collection}/${u.docId} | ${u.nickname} (${u.role})`);
  }

  await batch.commit();
  console.log(`\n✅ Successfully updated ${allUpdates.length} profile docs with agent_id = "${AGENT_ID}"`);

  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
