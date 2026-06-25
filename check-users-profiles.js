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

  const anchorValues = new Map();
  const allProfiles = new Map();

  snap.forEach(d => {
    const data = d.data();
    const role = String(data.role || '').toLowerCase().trim();
    const profileKey = `${role}_profile`;

    // Check all top-level keys for *_profile
    for (const [key, val] of Object.entries(data)) {
      if (key.endsWith('_profile') && typeof val === 'object' && val !== null) {
        if (!allProfiles.has(key)) allProfiles.set(key, []);
        allProfiles.get(key).push({ docId: d.id, nickname: data.nickname || data.name || 'N/A', ...val });

        if (val.team_anchor) {
          const anchor = String(val.team_anchor);
          if (!anchorValues.has(anchor)) anchorValues.set(anchor, []);
          anchorValues.get(anchor).push({ docId: d.id, nickname: data.nickname || data.name || 'N/A', role: data.role });
        }
      }
    }
  });

  console.log('Profile keys found:', [...allProfiles.keys()].join(', '));
  console.log('\nAll team_anchor values:');
  for (const [val, users] of anchorValues) {
    console.log(`  "${val}" (${users.length} users):`);
    users.forEach(u => console.log(`    - ${u.docId} | ${u.nickname} (${u.role})`));
  }

  // Also check for any "nine" related values (case-insensitive)
  console.log('\n--- Case-insensitive search for "nine" in team_anchor ---');
  for (const [val, users] of anchorValues) {
    if (val.toLowerCase().includes('nine')) {
      console.log(`  "${val}" (${users.length} users):`);
      users.forEach(u => console.log(`    - ${u.docId} | ${u.nickname} (${u.role})`));
    }
  }

  // Show one full example of a *_profile object
  console.log('\n--- Example *_profile objects ---');
  let count = 0;
  for (const [key, profiles] of allProfiles) {
    if (count >= 3) break;
    if (profiles.length > 0) {
      console.log(`${key}:`, JSON.stringify(profiles[0], null, 2));
      count++;
    }
  }

  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
