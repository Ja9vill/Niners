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

  // Show unique field patterns per role
  const roleFieldMap = new Map();
  const roleCount = new Map();

  // Show first 5 full documents for context
  let shown = 0;
  snap.forEach(d => {
    const data = d.data();
    const role = String(data.role || 'unknown').toLowerCase().trim();
    if (!roleCount.has(role)) roleCount.set(role, 0);
    roleCount.set(role, roleCount.get(role) + 1);

    if (!roleFieldMap.has(role)) {
      roleFieldMap.set(role, Object.keys(data).sort());
    }

    if (shown < 5) {
      console.log(`── User: ${d.id} (${data.nickname || data.name || 'N/A'}) [role: ${role}]`);
      console.log(`   Fields: ${Object.keys(data).sort().join(', ')}`);
      // Show any nested objects
      for (const [key, val] of Object.entries(data)) {
        if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
          console.log(`   ${key}: ${JSON.stringify(val)}`);
        }
      }
      console.log();
      shown++;
    }
  });

  console.log('\n--- Roles and counts ---');
  for (const [role, count] of roleCount) {
    console.log(`  ${role}: ${count}`);
  }

  console.log('\n--- Unique field sets per role ---');
  for (const [role, fields] of roleFieldMap) {
    console.log(`  ${role}: ${fields.join(', ')}`);
  }

  // Search for any field containing "nine" (case-insensitive)
  console.log('\n--- Fields containing "nine" (case-insensitive) ---');
  snap.forEach(d => {
    const data = d.data();
    const json = JSON.stringify(data).toLowerCase();
    if (json.includes('nine')) {
      // Find which fields contain "nine"
      for (const [key, val] of Object.entries(data)) {
        if (typeof val === 'string' && val.toLowerCase().includes('nine')) {
          console.log(`  ${d.id} | ${data.nickname || data.name || 'N/A'} | ${key} = "${val}"`);
        } else if (typeof val === 'object' && val !== null) {
          const subJson = JSON.stringify(val).toLowerCase();
          if (subJson.includes('nine')) {
            console.log(`  ${d.id} | ${data.nickname || data.name || 'N/A'} | ${key} = ${JSON.stringify(val)}`);
          }
        }
      }
    }
  });

  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
