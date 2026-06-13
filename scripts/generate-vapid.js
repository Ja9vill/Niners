const fs = require('fs');
const path = require('path');

try {
  const webpush = require('web-push');
  const keys = webpush.generateVAPIDKeys();

  const envPath = path.join(__dirname, '../.env');
  let envContent = '';
  
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8');
  }

  const lines = envContent.split(/\r?\n/);
  let hasPub = false;
  let hasPriv = false;
  
  const updatedLines = lines.map(line => {
    if (line.trim().startsWith('VAPID_PUBLIC_KEY=')) {
      hasPub = true;
      return `VAPID_PUBLIC_KEY="${keys.publicKey}"`;
    }
    if (line.trim().startsWith('VAPID_PRIVATE_KEY=')) {
      hasPriv = true;
      return `VAPID_PRIVATE_KEY="${keys.privateKey}"`;
    }
    return line;
  });

  if (!hasPub) {
    updatedLines.push(`VAPID_PUBLIC_KEY="${keys.publicKey}"`);
  }
  if (!hasPriv) {
    updatedLines.push(`VAPID_PRIVATE_KEY="${keys.privateKey}"`);
  }

  fs.writeFileSync(envPath, updatedLines.join('\n'), 'utf8');
  
  console.log('\x1b[32m%s\x1b[0m', 'VAPID keys generated and stored successfully in .env file!');
  console.log('VAPID_PUBLIC_KEY:  ' + keys.publicKey);
  console.log('VAPID_PRIVATE_KEY: ' + keys.privateKey);
} catch (err) {
  console.error('\x1b[31m%s\x1b[0m', 'Error generating VAPID keys. Did you run "npm install" first?');
  console.error(err.message);
}
