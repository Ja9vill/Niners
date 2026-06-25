import admin from 'firebase-admin';
import fs from 'fs';

const possibleEnvPaths = ['.env', '../.env', '../../.env'];
let envPath = possibleEnvPaths.find(p => fs.existsSync(p));
const envContent = fs.readFileSync(envPath, 'utf8');
envContent.split(/\r?\n/).forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    const key = parts[0].trim();
    let value = parts.slice(1).join('=').trim();
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    process.env[key] = value;
  }
});

async function main() {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL || process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = (process.env.FIREBASE_PRIVATE_KEY || process.env.GOOGLE_SERVICE_ACCOUNT_KEY)?.replace(/\\n/g, '\n');

  // Authenticate with service account
  const { GoogleAuth } = await import('google-auth-library');
  const auth = new GoogleAuth({
    credentials: { client_email: clientEmail, private_key: privateKey, project_id: projectId },
    scopes: ['https://www.googleapis.com/auth/firebase', 'https://www.googleapis.com/auth/cloud-platform'],
  });
  const client = await auth.getClient();
  const token = await client.getAccessToken();

  const rulesContent = fs.readFileSync('firestore.rules', 'utf8');
  const databaseId = 'nine-talent-management';

  // Try multiple endpoints
  const endpoints = [
    `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${databaseId}:setRules`,
    `https://firestore.googleapis.com/v1beta1/projects/${projectId}/databases/${databaseId}:setRules`,
    `https://firestore.admin.googleapis.com/v1/projects/${projectId}/databases/${databaseId}:setRules`,
  ];

  for (const url of endpoints) {
    console.log(`\nTrying: ${url}`);
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rules: {
            source: {
              files: [{
                name: 'firestore.rules',
                content: rulesContent,
              }]
            }
          }
        }),
      });

      const text = await response.text();
      console.log(`  Status: ${response.status}`);
      
      if (response.ok) {
        console.log('  ✅ SUCCESS!');
        try {
          console.log(JSON.stringify(JSON.parse(text), null, 2));
        } catch {
          console.log(text);
        }
        process.exit(0);
      } else {
        console.log(`  Response: ${text.substring(0, 200)}`);
      }
    } catch (err) {
      console.log(`  Error: ${err.message}`);
    }
  }

  // If all endpoints failed, try the Google IAM approach
  console.log('\n--- Trying IAM-based approach ---');
  try {
    const iamUrl = `https://iam.googleapis.com/v1/projects/${projectId}/serviceAccounts/${clientEmail}:generateAccessToken`;
    const iamResponse = await fetch(iamUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        scope: ['https://www.googleapis.com/auth/cloud-platform'],
        lifetime: '3600s',
      }),
    });
    console.log(`IAM Status: ${iamResponse.status}`);
    if (iamResponse.ok) {
      const iamData = await iamResponse.json();
      console.log('Got IAM token, retrying rules deploy...');
      
      const rulesUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${databaseId}:setRules`;
      const rulesResponse = await fetch(rulesUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${iamData.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rules: {
            source: {
              files: [{
                name: 'firestore.rules',
                content: rulesContent,
              }]
            }
          }
        }),
      });
      const rulesText = await rulesResponse.text();
      console.log(`Rules Status: ${rulesResponse.status}`);
      console.log(rulesText.substring(0, 500));
    }
  } catch (err) {
    console.log(`IAM Error: ${err.message}`);
  }

  console.log('\n❌ Could not deploy rules programmatically.');
  console.log('Please deploy manually via Firebase Console:');
  console.log('  1. Go to https://console.firebase.google.com/project/gen-lang-client-0222945352/firestore/rules');
  console.log('  2. Select database "nine-talent-management"');
  console.log('  3. Paste the contents of firestore.rules');
  console.log('  4. Click "Publish"');

  process.exit(1);
}

main().catch(err => { console.error(err); process.exit(1); });
