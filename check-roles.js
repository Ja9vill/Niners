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
  const snap = await db.collection('users').get();
  const roles = {};
  snap.docs.forEach(d => {
    const role = d.data().role || 'none';
    if (!roles[role]) roles[role] = [];
    roles[role].push({ id: d.id, nickname: d.data().nickname, agent_id: d.data().agent_id });
  });
  
  for (const [role, users] of Object.entries(roles)) {
    console.log(`\n"${role}": ${users.length} users`);
    users.slice(0, 3).forEach(u => console.log(`  ${u.id} | ${u.nickname} | agent_id: ${u.agent_id || 'MISSING'}`));
    if (users.length > 3) console.log(`  ... and ${users.length - 3} more`);
  }
}

main().catch(console.error);
