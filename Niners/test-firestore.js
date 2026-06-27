import dotenv from 'dotenv';
import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';

const envPath = '.env';
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
  
  const keysPattern = keys.join('|');
  const regex = new RegExp(`\\\\n(${keysPattern})=`, 'g');
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
  console.log("ℹ️ Env loaded.");
} catch (err) {
  dotenv.config({ path: envPath });
}

const customDbId = "ai-studio-f578d03a-99b3-4c41-84dd-9901137e8386";

async function testConfig(name, email, key, dbId) {
  console.log(`\n=============================================`);
  console.log(`Testing: ${name}`);
  console.log(`Email: ${email}`);
  console.log(`Database: ${dbId || '(default)'}`);
  console.log(`=============================================`);
  
  if (!email || !key) {
    console.log(`❌ Skipped: Missing credentials for ${name}`);
    return false;
  }
  
  const formattedKey = key.replace(/\\n/g, '\n');
  const appName = `app-${name.replace(/\s+/g, '-').toLowerCase()}-${dbId || 'default'}`;
  
  let app;
  try {
    app = admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: email,
        privateKey: formattedKey,
      })
    }, appName);
  } catch (err) {
    console.error(`❌ App initialization failed:`, err.message);
    return false;
  }
  
  try {
    const db = dbId ? getFirestore(app, dbId) : getFirestore(app);
    console.log(`⏳ Attempting to write dummy document...`);
    
    // Write test document
    const docRef = db.collection('test_connection').doc('ping');
    await docRef.set({
      timestamp: new Date().toISOString(),
      testedBy: email,
      db: dbId || '(default)'
    });
    
    console.log(`✅ Success! Write completed successfully.`);
    
    // Read test document back
    const snap = await docRef.get();
    console.log(`✅ Success! Read completed. Data:`, snap.data());
    
    // Clean up
    await docRef.delete();
    console.log(`✅ Success! Deleted test document.`);
    
    return true;
  } catch (err) {
    console.error(`❌ Firestore operation failed:`, err.message || err);
    if (err.stack) {
      console.log(err.stack.split('\n').slice(0, 3).join('\n'));
    }
    return false;
  }
}

async function runAll() {
  const firebaseEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const firebaseKey = process.env.FIREBASE_PRIVATE_KEY;
  
  const googleEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const googleKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  
  console.log("Starting diagnostics...");
  
  // Test 1: Firebase Service Account on Custom Database
  const r1 = await testConfig("Firebase Client SA on Custom DB", firebaseEmail, firebaseKey, customDbId);
  
  // Test 2: Google Service Account on Custom Database
  const r2 = await testConfig("Google Service SA on Custom DB", googleEmail, googleKey, customDbId);
  
  // Test 3: Firebase Service Account on Default Database
  const r3 = await testConfig("Firebase Client SA on Default DB", firebaseEmail, firebaseKey, null);
  
  // Test 4: Google Service Account on Default Database
  const r4 = await testConfig("Google Service SA on Default DB", googleEmail, googleKey, null);
  
  console.log(`\n=============================`);
  console.log(`SUMMARY:`);
  console.log(`Firebase SA + Custom DB: ${r1 ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Google SA + Custom DB:   ${r2 ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Firebase SA + Default DB: ${r3 ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Google SA + Default DB:   ${r4 ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`=============================`);
  process.exit(0);
}

runAll();
