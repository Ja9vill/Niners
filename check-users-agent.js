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

async function main() {
  const snap = await db.collection('users').get();
  console.log(`Found ${snap.size} users.\n`);

  const matches = [];

  snap.forEach(d => {
    const data = d.data();
    const role = String(data.role || '').toLowerCase().trim();
    const profileKey = `${role}_profile`;
    const profile = data[profileKey];

    if (profile && typeof profile === 'object') {
      const teamAnchor = profile.team_anchor;
      if (teamAnchor && typeof teamAnchor === 'string') {
        const lower = teamAnchor.toLowerCase().trim();
        if (lower === 'nine agency') {
          matches.push({
            docId: d.id,
            poppo_id: data.poppo_id || data.poppoId || d.id,
            nickname: data.nickname || data.name || 'N/A',
            role: data.role,
            profileKey,
            team_anchor: teamAnchor,
            current_agent_id: data.agent_id ?? 'UNDEFINED',
          });
        }
      }
    }
  });

  console.log(`Matched ${matches.length} users with team_anchor = "NINE AGENCY":\n`);
  matches.forEach(m => {
    console.log(`  ${m.docId} | ${m.nickname} (${m.role}) | ${m.profileKey}.team_anchor = "${m.team_anchor}" | current agent_id = ${m.current_agent_id}`);
  });

  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
