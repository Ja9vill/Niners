import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

const key = "AIzaSyC-9BnTqHCsqnKSvlsu8DqS56BAX6mesGM";

async function testClientConfig(projId) {
  console.log(`\nSimulating client initialization for project: ${projId}`);
  const config = {
    apiKey: key,
    authDomain: `${projId}.firebaseapp.com`,
    projectId: projId,
    storageBucket: `${projId}.firebasestorage.app`,
    messagingSenderId: "580294245942",
    appId: "1:580294245942:web:fb5bb024e50843bca6e297"
  };

  try {
    const app = initializeApp(config, `client-app-${projId}`);
    const db = getFirestore(app, "ai-studio-f578d03a-99b3-4c41-84dd-9901137e8386");
    
    console.log(`- Connection initialized. Attempting getDocs on 'users' collection...`);
    const snapshot = await getDocs(collection(db, 'users'));
    console.log(`✅ Success! Found ${snapshot.size} documents in 'users'.`);
    snapshot.forEach(doc => {
      console.log(`  * ${doc.id} -> ${doc.data().nickname || doc.data().name}`);
    });
  } catch (err) {
    console.error(`❌ Client query failed:`, err.message || err);
  }
}

async function run() {
  await testClientConfig('gen-lang-client-0222945352');
  await testClientConfig('nine-dashboard-733997');
  process.exit(0);
}

run();
