import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL || process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const privateKey = (process.env.FIREBASE_PRIVATE_KEY || process.env.GOOGLE_SERVICE_ACCOUNT_KEY)?.replace(/\\n/g, '\n');

if (!projectId || !clientEmail || !privateKey) {
  console.error("❌ ERROR: Missing Firebase environment variables");
  process.exit(1);
}

const app = admin.initializeApp({
  credential: admin.credential.cert({
    projectId,
    clientEmail,
    privateKey,
  })
});

const db = getFirestore(app, 'ai-studio-f578d03a-99b3-4c41-84dd-9901137e8386');

async function cleanReports() {
  console.log("Fetching all documents from 'performance_reports'...");
  const snapshot = await db.collection("performance_reports").get();
  
  console.log(`Found ${snapshot.size} documents in 'performance_reports'.`);
  
  const toDelete = [];
  snapshot.forEach(doc => {
    const id = doc.id;
    const data = doc.data();
    const poppoId = data.poppoId || data.poppo_id || '';
    
    // Check if it matches test user 1
    if (
      id.startsWith("1_") || 
      id.startsWith("poppoid_1") || 
      String(poppoId) === "1" ||
      id === "1"
    ) {
      toDelete.push({ id, poppoId });
    }
  });
  
  console.log(`Found ${toDelete.length} documents matching the deletion criteria.`);
  
  if (toDelete.length > 0) {
    console.log("Documents to delete:", toDelete);
    const batch = db.batch();
    toDelete.forEach(item => {
      const docRef = db.collection("performance_reports").doc(item.id);
      batch.delete(docRef);
    });
    
    await batch.commit();
    console.log("✅ Successfully deleted matching test performance reports.");
  } else {
    console.log("ℹ️ No test performance reports match the criteria.");
  }
  
  process.exit(0);
}

cleanReports().catch(err => {
  console.error("❌ Error cleaning reports:", err);
  process.exit(1);
});
