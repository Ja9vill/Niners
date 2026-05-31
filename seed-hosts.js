import dotenv from 'dotenv';
import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';
import path from 'path';

// Let's locate the .env file
let envPath = '';
if (fs.existsSync('.env')) {
  envPath = '.env';
} else if (fs.existsSync('../.env')) {
  envPath = '../.env';
}

if (!envPath) {
  console.error("❌ ERROR: No .env file found in current or parent directory.");
  process.exit(1);
}

// Custom parser to handle single-line literal \n formatting in the .env file
try {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const keys = [
    'FIREBASE_PRIVATE_KEY',
    'GOOGLE_SERVICE_ACCOUNT_EMAIL',
    'DATA_MASTERSHEET_ID',
    'FIREBASE_PROJECT_ID',
    'GOOGLE_SERVICE_ACCOUNT_KEY',
    'FINANCIAL_DATA_SHEET_ID',
    'ROSTER_REPORTING_SHEET_ID',
    'FIREBASE_CLIENT_EMAIL',
    'GOOGLE_API_KEY',
    'GEMINI_API_KEY',
    'VITE_FIREBASE_API_KEY',
    'VITE_FIREBASE_AUTH_DOMAIN',
    'VITE_FIREBASE_PROJECT_ID',
    'VITE_FIREBASE_STORAGE_BUCKET',
    'VITE_FIREBASE_MESSAGING_SENDER_ID',
    'VITE_FIREBASE_APP_ID'
  ];
  
  const regex = /\\n(FIREBASE_PRIVATE_KEY|GOOGLE_SERVICE_ACCOUNT_EMAIL|DATA_MASTERSHEET_ID|FIREBASE_PROJECT_ID|GOOGLE_SERVICE_ACCOUNT_KEY|FINANCIAL_DATA_SHEET_ID|ROSTER_REPORTING_SHEET_ID|FIREBASE_CLIENT_EMAIL|GOOGLE_API_KEY|GEMINI_API_KEY|VITE_FIREBASE_API_KEY|VITE_FIREBASE_AUTH_DOMAIN|VITE_FIREBASE_PROJECT_ID|VITE_FIREBASE_STORAGE_BUCKET|VITE_FIREBASE_MESSAGING_SENDER_ID|VITE_FIREBASE_APP_ID)=/g;
  const cleanContent = envContent.replace(regex, '\n$1=');
  
  const lines = cleanContent.split(/\r?\n/);
  lines.forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
      const key = parts[0].trim();
      let value = parts.slice(1).join('=').trim();
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1);
      } else if (value.startsWith("'") && value.endsWith("'")) {
        value = value.slice(1, -1);
      }
      process.env[key] = value;
    }
  });
  
  console.log("ℹ️ Custom parser loaded environment variables successfully.");
} catch (err) {
  console.warn("⚠️ Custom parser warning, attempting fallback: ", err.message);
  dotenv.config({ path: envPath });
}

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL || process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const privateKey = (process.env.FIREBASE_PRIVATE_KEY || process.env.GOOGLE_SERVICE_ACCOUNT_KEY)?.replace(/\\n/g, '\n');

if (!projectId || !clientEmail || !privateKey) {
  console.error("❌ ERROR: Missing Firebase environment variables (FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL/GOOGLE_SERVICE_ACCOUNT_EMAIL, FIREBASE_PRIVATE_KEY/GOOGLE_SERVICE_ACCOUNT_KEY)");
  process.exit(1);
}

// Initialize Firebase Admin
const app = admin.initializeApp({
  credential: admin.credential.cert({
    projectId,
    clientEmail,
    privateKey,
  })
});

const db = getFirestore(app, 'ai-studio-f578d03a-99b3-4c41-84dd-9901137e8386');

// ----------------------------------------------------
// Raw Roster Strings Provided by User
// ----------------------------------------------------
const rawLeadersText = `
19157913    Miss Nine   Founder Director    -   -   -   ACTIVE  031907
`;

const rawHostsText = `
`;

// Helper: Parse salary categories to valid BaseSalaryTier
function parseSalaryCategory(salary) {
  if (!salary || salary === '-' || salary === 'N/A') return 'N/A';
  if (salary.toLowerCase().includes('star')) return 'Star Host';
  if (salary.toLowerCase().includes('rocket')) return 'Rocket Host';
  if (salary.toLowerCase().includes('s idol')) return 'S idol';
  if (salary.toLowerCase().includes('esport')) return 'ESport Host';
  return 'N/A';
}

// Helper: Parse status to valid HostStatus
function parseStatus(status) {
  if (!status) return 'Active';
  const s = status.toUpperCase();
  if (s === 'ACTIVE') return 'Active';
  if (s === 'INACTIVE') return 'Inactive';
  if (s === 'INCONSISTENT') return 'Inconsistent';
  if (s === 'RELEASED') return 'Released';
  return 'Active';
}

// Helper: Parse anchor/team to valid AnchorType
function parseAnchorType(teamStr) {
  if (!teamStr || teamStr === '-') return 'Nine Agency';
  const t = teamStr.toUpperCase();
  if (t.includes('NINE AGENCY') || t.includes('MISS NINE')) return 'Nine Agency';
  if (t.includes('AGENCY') || t.includes('TEAM') || t.includes('LTMS')) return 'Sub Agency';
  return 'External';
}

// Helper: Map positions to valid Position enum
function parsePosition(pos, role) {
  if (role && role.toLowerCase() === 'manager') return 'Manager';
  if (role && role.toLowerCase() === 'sub agent') return 'Sub Agent';
  if (role && role.toLowerCase() === 'admin') return 'Admin';
  if (role && role.toLowerCase() === 'head admin') return 'Head Admin';
  if (pos && pos.toLowerCase().includes('director')) return 'Director';
  
  if (pos && pos.toLowerCase() === 'head admin') return 'Head Admin';
  if (pos && pos.toLowerCase() === 'manager') return 'Manager';
  if (pos && pos.toLowerCase() === 'sub agent') return 'Sub Agent';
  if (pos && pos.toLowerCase() === 'admin') return 'Admin';
  
  return 'Talent';
}

// Helper: Determine level based on role
function getLevelForRole(role) {
  switch (role) {
    case 'Director': return 99;
    case 'Head Admin': return 80;
    case 'Admin': return 70;
    case 'Manager': return 65;
    case 'Sub Agent': return 55;
    default: return 30;
  }
}

// Helper: Determine tier based on level
function getTierForLevel(level) {
  if (level >= 85) return 'S';
  if (level >= 65) return 'A';
  if (level >= 45) return 'B';
  if (level >= 25) return 'C';
  return 'X';
}

// ----------------------------------------------------
// Parse Roster Data
// ----------------------------------------------------
const parsedHosts = [];

// Parse Leader List
const leaderLines = rawLeadersText.trim().split('\n');
for (const line of leaderLines) {
  const parts = line.split(/\t| {2,}/).map(p => p.trim());
  if (parts.length < 2) continue;
  
  const id = parts[0];
  const name = parts[1];
  const positionRaw = parts[2];
  const roleRaw = parts[3];
  const baseSalaryRaw = parts[4];
  const teamRaw = parts[5];
  const managerRaw = parts[6];
  const statusRaw = parts[7];
  const password = parts.at(-1);
  
  const role = parsePosition(positionRaw, roleRaw);
  const level = getLevelForRole(role);
  const tier = getTierForLevel(level);

  parsedHosts.push({
    id: String(id),
    name: name,
    nickname: name,
    position: role,
    role: role,
    team: (!teamRaw || teamRaw === '-') ? 'Leadership' : teamRaw,
    manager: (!managerRaw || managerRaw === '-') ? 'None' : managerRaw,
    anchor_type: parseAnchorType(teamRaw),
    base_salary_category: parseSalaryCategory(baseSalaryRaw),
    status: parseStatus(statusRaw || 'ACTIVE'),
    level: level,
    tier: tier,
    password: String(password),
    is_temp_password: true,
    isActive: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  });
}

console.log(`📋 Parse completed: parsed ${parsedHosts.length} roster entries.`);

// ----------------------------------------------------
// Write to Firestore Database
// ----------------------------------------------------
async function clearDatabase() {
  console.log("🧹 Clearing Firestore hosts collection...");
  const hostsRef = db.collection('hosts');
  const snapshot = await hostsRef.get();
  const batch = db.batch();
  snapshot.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });
  await batch.commit();
  console.log("✅ Hosts collection cleared.");
}

async function seedDatabase() {
  await clearDatabase();
  console.log("🚀 Seeding Firestore hosts collection...");
  let successCount = 0;
  let failureCount = 0;

  const batchSize = 400;
  for (let i = 0; i < parsedHosts.length; i += batchSize) {
    const chunk = parsedHosts.slice(i, i + batchSize);
    const batch = db.batch();

    chunk.forEach(host => {
      const docRef = db.collection('hosts').doc(host.id);
      batch.set(docRef, host);
    });

    try {
      await batch.commit();
      successCount += chunk.length;
      console.log(`✅ Uploaded batch: ${successCount} / ${parsedHosts.length} records written.`);
    } catch (err) {
      console.error(`❌ Batch write failed:`, err);
      failureCount += chunk.length;
    }
  }

  console.log(`\n🎉 SEED COMPLETE:`);
  console.log(`- Successful uploads: ${successCount}`);
  console.log(`- Failed uploads: ${failureCount}`);
  process.exit(0);
}

seedDatabase();

