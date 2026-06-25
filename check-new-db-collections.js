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

async function main() {
  // Check what collections getAllRoleMetadata reads from
  const roleCols = ['users', 'host', 'manager', 'admin', 'head_admin', 'agent', 'director'];
  
  for (const col of roleCols) {
    const snap = await db.collection(col).get();
    console.log(`${col}: ${snap.size} docs`);
    if (snap.size > 0) {
      const first = snap.docs[0];
      const data = first.data();
      console.log(`  Sample fields: ${Object.keys(data).sort().join(', ')}`);
      console.log(`  poppo_id: ${data.poppo_id || data.poppoId || 'NONE'}`);
      console.log(`  nickname: ${data.nickname || 'NONE'}`);
      console.log(`  photoUrl: ${data.photoUrl || 'NONE'}`);
    }
  }

  // Also check: does the new DB have the profile collections that DO have team_anchor?
  console.log('\n--- Profile collections ---');
  const profileCols = ['host_profile', 'manager_profile', 'agent_profile', 'director_profile', 'head_admin_profile', 'admin_profile'];
  for (const col of profileCols) {
    const snap = await db.collection(col).get();
    if (snap.size > 0) {
      const first = snap.docs[0];
      const data = first.data();
      console.log(`${col}: ${snap.size} docs`);
      console.log(`  Fields: ${Object.keys(data).sort().join(', ')}`);
      console.log(`  poppo_id: ${data.poppo_id || data.poppoId || 'NONE'}`);
      console.log(`  nickname: ${data.nickname || 'NONE'}`);
      console.log(`  photoUrl: ${data.photoUrl || 'NONE'}`);
      console.log(`  team_anchor: ${data.team_anchor || 'NONE'}`);
    }
  }

  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
