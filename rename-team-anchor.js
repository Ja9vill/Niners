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
  let totalUpdated = 0;

  for (const col of profileCols) {
    const snap = await db.collection(col).where('team_anchor', 'in', ['NINE Agency', 'NINE AGENCY']).get();
    console.log(`${col}: ${snap.size} docs to update`);

    for (const d of snap.docs) {
      await db.collection(col).doc(d.id).update({ team_anchor: 'NINE TALENT MANAGEMENT' });
      totalUpdated++;
    }
  }

  // Also update the users collection
  const usersSnap1 = await db.collection('users').where('team_anchor', 'in', ['NINE Agency', 'NINE AGENCY']).get();
  console.log(`users: ${usersSnap1.size} docs to update`);
  for (const d of usersSnap1.docs) {
    await db.collection('users').doc(d.id).update({ team_anchor: 'NINE TALENT MANAGEMENT' });
    totalUpdated++;
  }

  console.log(`\nDone. Total updated: ${totalUpdated}`);
}

main().catch(console.error);
