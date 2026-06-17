import { db } from './src/lib/firebase.js';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';

async function main() {
  const eventId = '2026-06-10_0700_PM_MANILA_TIME_SOLO_LIVEHOUSE_1780402549163_20:15:49';
  console.log('Checking doc ID...');
  const d = await getDoc(doc(db, 'attendance', eventId));
  if (d.exists()) {
    console.log('Found by doc ID:', JSON.stringify(d.data(), null, 2));
  } else {
    console.log('Not found by doc ID.');
  }

  console.log('Checking by eventId field...');
  const q = query(collection(db, 'attendance'), where('eventId', '==', eventId));
  const qs = await getDocs(q);
  if (!qs.empty) {
    console.log('Found by field:', JSON.stringify(qs.docs[0].data(), null, 2));
  } else {
    console.log('Not found by field.');
  }
  process.exit(0);
}
main();
