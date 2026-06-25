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

  // Build poppo_id -> agent_id map from users collection
  const usersSnap = await db.collection('users').get();
  const agentMap = new Map();
  usersSnap.docs.forEach(d => {
    const data = d.data();
    if (data.agent_id) agentMap.set(d.id, data.agent_id);
  });
  console.log(`Users with agent_id: ${agentMap.size}`);

  let agentIdUpdated = 0;
  let teamAnchorUpdated = 0;

  for (const col of profileCols) {
    const snap = await db.collection(col).get();
    console.log(`\n${col}: ${snap.size} docs`);

    for (const d of snap.docs) {
      const data = d.data();
      const poppoId = data.poppo_id || d.id;
      const updates = {};

      // Add agent_id if missing
      if (!data.agent_id && agentMap.has(poppoId)) {
        updates.agent_id = agentMap.get(poppoId);
      }

      // Rename team_anchor
      if (data.team_anchor === 'NINE Agency' || data.team_anchor === 'NINE AGENCY') {
        updates.team_anchor = 'NINE TALENT MANAGEMENT';
      }

      if (Object.keys(updates).length > 0) {
        await db.collection(col).doc(d.id).update(updates);
        if (updates.agent_id) agentIdUpdated++;
        if (updates.team_anchor) teamAnchorUpdated++;
        console.log(`  ${d.id} (${data.nickname}): ${Object.keys(updates).join(', ')}`);
      }
    }
  }

  console.log(`\nDone. agent_id added: ${agentIdUpdated}, team_anchor renamed: ${teamAnchorUpdated}`);
}

main().catch(console.error);
