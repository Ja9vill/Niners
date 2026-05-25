import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import firebaseConfigJson from "./firebase-applet-config.json";

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

if (!projectId || !clientEmail || !privateKey) {
  console.error("Missing Admin SDK credentials in environment!");
  process.exit(1);
}

const app = initializeApp({
  credential: cert({
    projectId,
    clientEmail,
    privateKey,
  }),
});

async function testDb(dbId: string | undefined) {
  console.log(`\n--- Test Admin Query with Database ID: "${dbId || '(default)'}" ---`);
  try {
    const db = getFirestore(app, dbId);
    const collectionsRef = await db.listCollections();
    console.log("Collections:", collectionsRef.map(c => c.id));
    
    const hostsRef = db.collection("hosts");
    const snapshot = await hostsRef.limit(5).get();
    console.log(`Hosts fetched: ${snapshot.size}`);
    snapshot.docs.forEach(doc => console.log(doc.id, "=>", doc.data()));
  } catch (err: any) {
    console.error("FAILED query:", err.message);
  }
}

async function run() {
  await testDb(firebaseConfigJson.firestoreDatabaseId);
  await testDb(undefined);
}

run();
