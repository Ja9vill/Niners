import fs from 'fs';
import crypto from 'crypto';

try {
  const fileContent = fs.readFileSync('gcp-key.json', 'utf8');
  const json = JSON.parse(fileContent);
  const privateKey = json.private_key;
  
  console.log("Length of private key in JSON:", privateKey.length);
  console.log("Starts with standard header?", privateKey.startsWith("-----BEGIN PRIVATE KEY-----"));
  console.log("Ends with standard footer?", privateKey.endsWith("-----END PRIVATE KEY-----\n") || privateKey.endsWith("-----END PRIVATE KEY-----"));
  
  // Count newlines in the parsed key string
  const newlineCount = (privateKey.match(/\n/g) || []).length;
  console.log("Number of real newline characters in parsed string:", newlineCount);
  
  // Count literal '\n' text characters in the parsed key string
  const literalSlashNCount = (privateKey.match(/\\n/g) || []).length;
  console.log("Number of literal '\\n' text occurrences in parsed string:", literalSlashNCount);
  
  console.log("Attempting to load private key into Node crypto...");
  const sign = crypto.createSign('SHA256');
  sign.update('ping');
  const signature = sign.sign(privateKey);
  console.log("✅ Success! Key is completely valid for Node crypto. Signature length:", signature.length);
} catch (err) {
  console.error("❌ Key loading failed in Node crypto:", err.message);
  if (err.stack) console.log(err.stack);
}
