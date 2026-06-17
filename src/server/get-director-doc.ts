import dotenv from "dotenv";
dotenv.config();
import { initFirebaseSecrets } from "./secrets";
import { getAdminFirestore } from "./auth";

async function run() {
  try {
    await initFirebaseSecrets();
    const db = getAdminFirestore();
<<<<<<< HEAD
    const doc = await db.collection('host').doc('19157913').get();
=======
    const doc = await db.collection('users').doc('19157913').get();
>>>>>>> 1caeedfed0e8d150b835bb818f205219a88c9b93
    console.log("Doc Exists:", doc.exists);
    if (doc.exists) {
      console.log("Data:", JSON.stringify(doc.data(), null, 2));
    }
  } catch (err: any) {
    console.error("Error:", err.message || err);
  }
}
run();
