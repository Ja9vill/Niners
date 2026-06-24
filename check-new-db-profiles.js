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

const PROFILE_COLLECTIONS = [
  'host_profile', 'manager_profile', 'agent_profile',
  'director_profile', 'head_admin_profile', 'admin_profile'
];

async function main() {
  const allMatches = [];

  for (const colName of PROFILE_COLLECTIONS) {
    const snap = await db.collection(colName).get();
    if (snap.size === 0) continue;

    console.log(`\n── ${colName}: ${snap.size} docs`);

    // Show first doc structure
    const first = snap.docs[0];
    if (first) {
      const data = first.data();
      console.log(`   Sample fields: ${Object.keys(data).sort().join(', ')}`);
      if (data.team_anchor !== undefined) console.log(`   team_anchor: "${data.team_anchor}"`);
      if (data.teamAnchor !== undefined) console.log(`   teamAnchor: "${data.teamAnchor}"`);
    }

    snap.forEach(d => {
      const data = d.data();
      const teamAnchor = String(
        data.teamAnchor || data.team_anchor || data.team || ''
      ).trim().toLowerCase();

      if (teamAnchor === 'nine agency') {
        allMatches.push({
          collection: colName,
          docId: d.id,
          poppo_id: data.poppo_id || data.poppoId || d.id,
          nickname: data.nickname || data.name || 'N/A',
          role: data.role || colName.replace('_profile', ''),
          teamAnchor: data.teamAnchor || data.team_anchor || data.team,
          currentAgentId: data.agent_id ?? 'UNDEFINED',
        });
      }
    });
  }

  console.log(`\n\n═══════════════════════════════════════════════════`);
  console.log(`Matched ${allMatches.length} profile docs with team_anchor = "NINE Agency":`);
  console.log(`═══════════════════════════════════════════════════`);
  allMatches.forEach(m => {
    console.log(`  ${m.collection}/${m.docId} | ${m.nickname} (${m.role}) | team_anchor="${m.teamAnchor}" | agent_id=${m.currentAgentId}`);
  });

  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
