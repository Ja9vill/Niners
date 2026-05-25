import { initializeApp } from "firebase/app";
import { initializeFirestore, getDocs, collection } from "firebase/firestore";
import firebaseConfigJson from "./firebase-applet-config.json";

const firebaseConfig = {
  apiKey: firebaseConfigJson.apiKey,
  authDomain: firebaseConfigJson.authDomain,
  projectId: firebaseConfigJson.projectId,
  storageBucket: firebaseConfigJson.storageBucket,
  messagingSenderId: firebaseConfigJson.messagingSenderId,
  appId: firebaseConfigJson.appId,
};

const app = initializeApp(firebaseConfig);

async function testFetch(dbId: string | undefined) {
  console.log(`\n--- Testing with Database ID: "${dbId || '(default)'}" ---`);
  const db = initializeFirestore(app, {
    experimentalForceLongPolling: true,
  }, dbId);
  try {
    const snapshot = await getDocs(collection(db, "hosts"));
    console.log(`SUCCESS! Fetched hosts count: ${snapshot.size}`);
  } catch (error: any) {
    console.error(`FAILED to fetch hosts: ${error.message}`);
  }
}

async function run() {
  await testFetch(firebaseConfigJson.firestoreDatabaseId);
  await testFetch(undefined); // (default) database
  console.log("\nDone testing. Exiting...");
  process.exit(0);
}

run();
