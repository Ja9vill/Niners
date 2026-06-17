import admin from 'firebase-admin';
import * as path from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

// Initialize the app with a service account
const serviceAccountPath = path.resolve('./serviceAccountKey.json');
try {
  const serviceAccount = require(serviceAccountPath);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
} catch (err) {
  console.log("No serviceAccountKey.json found. Trying default credentials...");
  admin.initializeApp();
}

const db = admin.firestore();

async function run() {
  console.log("Fetching automated calendar events...");
  const snap1 = await db.collection("calendar").where("is_automated", "==", true).get();
  const snap2 = await db.collection("calendar").where("isAutomated", "==", true).get();
  
  const allDocs = [...snap1.docs, ...snap2.docs];
  const uniqueDocs = Array.from(new Map(allDocs.map(doc => [doc.id, doc])).values());
  
  if (uniqueDocs.length === 0) {
    console.log("No automated calendar events found.");
  } else {
    console.log(`Found ${uniqueDocs.length} calendar events. Deleting...`);
    const batch = db.batch();
    let count = 0;
    for (const doc of uniqueDocs) {
      batch.delete(doc.ref);
      count++;
      if (count % 400 === 0) {
        await batch.commit();
        console.log(`Committed ${count} calendar deletions...`);
      }
    }
    if (count % 400 !== 0) {
      await batch.commit();
    }
    console.log(`Successfully deleted ${count} calendar events!`);
  }

  // Also clean up auto-sync livehouse data
  console.log("Fetching automated livehouse_data...");
  const lhSnap = await db.collection("livehouse_data").where("source", "==", "auto-sync").get();
  if (!lhSnap.empty) {
    console.log(`Found ${lhSnap.size} livehouse_data records. Deleting...`);
    const batch = db.batch();
    let count = 0;
    for (const doc of lhSnap.docs) {
      batch.delete(doc.ref);
      count++;
      if (count % 400 === 0) {
        await batch.commit();
        console.log(`Committed ${count} livehouse_data deletions...`);
      }
    }
    if (count % 400 !== 0) {
      await batch.commit();
    }
    console.log(`Successfully deleted ${count} livehouse_data records!`);
  } else {
    console.log("No automated livehouse_data found.");
  }

  // Also clean up auto-sync livehouse logs
  console.log("Fetching automated livehouse_logs...");
  const logSnap = await db.collection("livehouse_logs").where("source", "==", "auto-sync").get();
  if (!logSnap.empty) {
    console.log(`Found ${logSnap.size} livehouse_logs records. Deleting...`);
    const batch = db.batch();
    let count = 0;
    for (const doc of logSnap.docs) {
      batch.delete(doc.ref);
      count++;
      if (count % 400 === 0) {
        await batch.commit();
        console.log(`Committed ${count} livehouse_logs deletions...`);
      }
    }
    if (count % 400 !== 0) {
      await batch.commit();
    }
    console.log(`Successfully deleted ${count} livehouse_logs records!`);
  } else {
    console.log("No automated livehouse_logs found.");
  }
}

run().catch(console.error);
