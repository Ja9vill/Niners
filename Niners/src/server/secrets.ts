import { SecretManagerServiceClient } from "@google-cloud/secret-manager";

let secretsInitialized = false;

/**
 * Retrieves the Firebase Service Account Private Key from Google Secret Manager
 * at runtime if it is not already present in process.env.
 * 
 * Secure design: fall back to process.env.FIREBASE_PRIVATE_KEY if already defined,
 * enabling seamless local development.
 */
export async function initFirebaseSecrets(): Promise<void> {
  if (secretsInitialized) {
    return;
  }

  // Local development fallback
  if (process.env.FIREBASE_PRIVATE_KEY) {
    console.log("ℹ️ FIREBASE_PRIVATE_KEY is already defined in environment variables. Skipping Secret Manager fetch.");
    secretsInitialized = true;
    return;
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  if (!projectId) {
    console.warn("⚠️ FIREBASE_PROJECT_ID is not configured in process.env. Cannot fetch from Secret Manager.");
    return;
  }

  const secretName = process.env.FIREBASE_PRIVATE_KEY_SECRET_NAME || "FIREBASE_PRIVATE_KEY";
  const secretVersion = process.env.FIREBASE_PRIVATE_KEY_SECRET_VERSION || "latest";
  const name = `projects/${projectId}/secrets/${secretName}/versions/${secretVersion}`;

  console.log(`🔑 Fetching '${secretName}' (version: ${secretVersion}) from Google Secret Manager for project '${projectId}'...`);
  
  try {
    const client = new SecretManagerServiceClient();
    const [version] = await client.accessSecretVersion({ name });
    const payload = version.payload?.data?.toString();

    if (!payload) {
      throw new Error("Secret payload is empty.");
    }

    // Set the retrieved private key in the environment
    process.env.FIREBASE_PRIVATE_KEY = payload;
    console.log("✅ Successfully retrieved FIREBASE_PRIVATE_KEY from Secret Manager.");
    secretsInitialized = true;
  } catch (error: any) {
    console.error(`❌ Failed to fetch secret from Secret Manager (${name}):`, error.message || error);
    throw new Error(`Firebase initialization blocked: unable to retrieve private key from Secret Manager. Details: ${error.message}`);
  }
}
