import firebaseConfigJson from "./firebase-applet-config.json";

console.log("firebase-applet-config.json Project ID:", firebaseConfigJson.projectId);
console.log("firebase-applet-config.json Database ID:", (firebaseConfigJson as any).firestoreDatabaseId);
console.log("process.env.FIREBASE_PROJECT_ID:", process.env.FIREBASE_PROJECT_ID);
console.log("process.env.GD_PROJECT_ID:", process.env.GD_PROJECT_ID);
console.log("process.env.GCP_PROJECT:", process.env.GCP_PROJECT);
console.log("process.env.GOOGLE_CLOUD_PROJECT:", process.env.GOOGLE_CLOUD_PROJECT);
console.log("process.env.FIREBASE_CLIENT_EMAIL:", process.env.FIREBASE_CLIENT_EMAIL);
process.exit(0);
