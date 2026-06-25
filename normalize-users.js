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
  const requiredFields = {
    created_at: null,
    googleEmail: null,
    googleUid: null,
    isActive: true,
    is_first_login: true,
    is_temp_password: false,
    last_login: null,
    level: 0,
    name: '',
    nickname: '',
    password: '',
    password_reset_by: '',
    photoUrl: null,
    poppo_id: '',
    role: '',
    updated_at: null,
    agent_id: null,
  };

  const usersSnap = await db.collection('users').get();
  console.log(`Total users: ${usersSnap.size}`);

  let updated = 0;
  let alreadyOk = 0;

  for (const d of usersSnap.docs) {
    const data = d.data();
    const updates = {};

    // Add missing fields with defaults
    for (const [field, defaultValue] of Object.entries(requiredFields)) {
      if (!(field in data)) {
        updates[field] = defaultValue;
      }
    }

    // Fix is_first_login: if missing, set to true
    if (!('is_first_login' in data)) {
      updates.is_first_login = true;
    }

    // Fix level for hosts: if role is 'host' and level is missing/0, set to 1
    const role = (data.role || '').toLowerCase();
    if (role === 'host' || role === 'talent') {
      if (!data.level || data.level === 0) {
        updates.level = 1;
      }
    }

    if (Object.keys(updates).length > 0) {
      await db.collection('users').doc(d.id).update(updates);
      console.log(`  Updated ${d.id} (${data.nickname || data.name || 'unknown'}): +${Object.keys(updates).join(', ')}`);
      updated++;
    } else {
      alreadyOk++;
    }
  }

  console.log(`\nDone. Updated: ${updated}, Already complete: ${alreadyOk}`);
}

main().catch(console.error);
