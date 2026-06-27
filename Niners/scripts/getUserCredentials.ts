import { FirebaseService } from '../src/lib/firebaseService';

(async () => {
  try {
    const creds = await FirebaseService.getUserCredentials();
    console.log('User credentials:');
    console.table(creds);
  } catch (err) {
    console.error('Error retrieving credentials:', err);
    process.exit(1);
  }
})();
