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

const NEW_DB = 'nine-talent-management';
const db = getFirestore(app, NEW_DB);

async function main() {
  console.log(`Connecting to database: ${NEW_DB}\n`);

  // List all collections
  const collections = await db.listCollections();
  console.log(`Found ${collections.length} collections: ${collections.map(c => c.id).join(', ')}\n`);

  // Check users collection
  const usersSnap = await db.collection('users').get();
  console.log(`Found ${usersSnap.size} users.\n`);

  const matches = [];
  let shown = 0;

  usersSnap.forEach(d => {
    const data = d.data();
    // Check all possible team_anchor field names
    const teamAnchor = String(
      data.teamAnchor || data.team_anchor || data.team || ''
    ).trim().toLowerCase();

    if (shown < 3) {
      console.log(`── User: ${d.id} | ${data.nickname || data.name || 'N/A'} | role: ${data.role}`);
      console.log(`   Fields: ${Object.keys(data).sort().join(', ')}`);
      if (data.teamAnchor) console.log(`   teamAnchor: "${data.teamAnchor}"`);
      if (data.team_anchor) console.log(`   team_anchor: "${data.team_anchor}"`);
      if (data.team) console.log(`   team: "${data.team}"`);
      console.log();
      shown++;
    }

    if (teamAnchor === 'nine agency') {
      matches.push({
        docId: d.id,
        nickname: data.nickname || data.name || 'N/A',
        role: data.role,
        teamAnchor: data.teamAnchor || data.team_anchor || data.team,
        currentAgentId: data.agent_id ?? 'UNDEFINED',
      });
    }
  });

  console.log(`\nMatched ${matches.length} users with team_anchor = "NINE Agency":`);
  matches.forEach(m => {
    console.log(`  ${m.docId} | ${m.nickname} (${m.role}) | team_anchor="${m.teamAnchor}" | agent_id=${m.currentAgentId}`);
  });

  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
