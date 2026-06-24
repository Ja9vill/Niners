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
  const profileCols = ['host_profile', 'manager_profile', 'admin_profile', 'head_admin_profile', 'agent_profile', 'director_profile'];

  // Build a map of poppo_id -> agent_id from profile collections
  const agentIdMap = new Map();
  for (const col of profileCols) {
    const snap = await db.collection(col).where('agent_id', '!=', null).get();
    snap.docs.forEach(d => {
      const data = d.data();
      if (data.agent_id) {
        agentIdMap.set(data.poppo_id || d.id, data.agent_id);
      }
    });
  }
  console.log(`Found ${agentIdMap.size} users with agent_id from profile collections`);

  // Update users collection
  const usersSnap = await db.collection('users').get();
  let updated = 0;
  let skipped = 0;

  for (const d of usersSnap.docs) {
    const poppoId = d.id;
    const agentId = agentIdMap.get(poppoId);
    if (agentId) {
      await db.collection('users').doc(poppoId).update({ agent_id: agentId });
      console.log(`  Updated ${poppoId} with agent_id: ${agentId}`);
      updated++;
    } else {
      skipped++;
    }
  }

  console.log(`\nDone. Updated: ${updated}, Skipped (no agent_id): ${skipped}`);
}

main().catch(console.error);
