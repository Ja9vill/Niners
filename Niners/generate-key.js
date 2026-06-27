import fs from 'fs';
import dotenv from 'dotenv';

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
} catch (err) {
  dotenv.config({ path: envPath });
}

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY?.replace(/\\n/g, '\n');

if (!projectId || !clientEmail || !privateKey) {
  console.error("❌ ERROR: Missing required environment variables in .env.");
  process.exit(1);
}

const serviceAccountJson = {
  type: "service_account",
  project_id: projectId,
  private_key: privateKey,
  client_email: clientEmail,
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${encodeURIComponent(clientEmail)}`
};

fs.writeFileSync('gcp-key.json', JSON.stringify(serviceAccountJson, null, 2), 'utf8');
console.log("=========================================");
console.log("✅ service-account JSON key file created successfully!");
console.log("Filename: gcp-key.json");
console.log("=========================================");
console.log("\nTo deploy using this authorized service account, run these commands:");
console.log("1. Authenticate gcloud with the service account key:");
console.log(`   gcloud auth activate-service-account ${clientEmail} --key-file=gcp-key.json`);
console.log("\n2. Run the deployment script again:");
console.log("   .\\deploy.ps1");
console.log("=========================================");
