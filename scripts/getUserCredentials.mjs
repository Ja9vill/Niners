import { getUserCredentials } from '../src/lib/firebaseService.js';

async function main() {
  try {
    const creds = await getUserCredentials();
    console.log(JSON.stringify(creds, null, 2));
  } catch (err) {
    console.error('Error fetching credentials:', err);
    process.exit(1);
  }
}

main();
