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

const db = getFirestore(app, 'ai-studio-f578d03a-99b3-4c41-84dd-9901137e8386');

const AGENT_ID = '19381364';

async function main() {
  const snap = await db.collection('users').get();
  console.log(`Scanning ${snap.size} users...\n`);

  const updates = [];

  snap.forEach(d => {
    const data = d.data();
    // Check all possible team_anchor field names directly on the document
    const teamAnchor = String(
      data.teamAnchor || data.team_anchor || data.team || ''
    ).trim().toLowerCase();

    if (teamAnchor === 'nine agency') {
      updates.push({
        docId: d.id,
        nickname: data.nickname || data.name || 'N/A',
        role: data.role,
        teamAnchor: data.teamAnchor || data.team_anchor || data.team,
        currentAgentId: data.agent_id ?? 'UNDEFINED',
      });
    }
  });

  if (updates.length === 0) {
    console.log('No users found with team_anchor = "NINE Agency". Nothing to update.');
    process.exit(0);
  }

  console.log(`Found ${updates.length} users to update:\n`);
  updates.forEach(u => {
    console.log(`  ${u.docId} | ${u.nickname} (${u.role}) | team_anchor="${u.teamAnchor}" | current agent_id=${u.currentAgentId}`);
  });

  console.log(`\nUpdating agent_id = "${AGENT_ID}" on ${updates.length} documents...\n`);

  const batch = db.batch();
  for (const u of updates) {
    const ref = db.collection('users').doc(u.docId);
    batch.update(ref, { agent_id: AGENT_ID });
    console.log(`  [BATCH] ${u.docId} -> agent_id = "${AGENT_ID}"`);
  }

  await batch.commit();
  console.log(`\n✅ Successfully updated ${updates.length} users with agent_id = "${AGENT_ID}"`);

  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
