import dotenv from "dotenv";
dotenv.config();
import { initFirebaseSecrets } from "./secrets";
import { getAdminFirestore } from "./auth";

async function run() {
  try {
    await initFirebaseSecrets();
    const db = getAdminFirestore();
    const doc = await db.collection('host').doc('19157913').get();
    console.log("Doc Exists:", doc.exists);
    if (doc.exists) {
      console.log("Data:", JSON.stringify(doc.data(), null, 2));
    }
  } catch (err: any) {
    console.error("Error:", err.message || err);
  }
}
run();
