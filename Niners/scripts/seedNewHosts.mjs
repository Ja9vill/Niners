import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

if (!projectId || !clientEmail || !privateKey) {
  console.error('Missing Firebase Admin env vars');
  process.exit(1);
}

if (!getApps().length) {
  initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
  });
}

const db = getFirestore(undefined, 'ai-studio-f578d03a-99b3-4c41-84dd-9901137e8386');

const hostsData = [
  { id: "14129568", name: "Alli", role: "Host" },
  { id: "2934176", name: "Allyy", role: "Host" },
  { id: "62652388", name: "Amitzuke", role: "Host" },
  { id: "26645601", name: "Angel", role: "Host" },
  { id: "66988219", name: "Angel.", role: "Host" },
  { id: "43798318", name: "Anjie", role: "Host" },
  { id: "9616469", name: "April", role: "Host" },
  { id: "41339005", name: "Arnel", role: "Host" },
  { id: "4498750", name: "Boyeet", role: "Host" },
  { id: "26744344", name: "Denj", role: "Host" },
  { id: "2716708", name: "Dhal", role: "Host" },
  { id: "20901441", name: "Erich", role: "Host" },
  { id: "23500951", name: "Gelica", role: "Host" },
  { id: "2886088", name: "Gracia", role: "Host" },
  { id: "726356", name: "HoneyLou", role: "Host" },
  { id: "1089154", name: "Jaa", role: "Host" },
  { id: "8170164", name: "Jaebum", role: "Host" },
  { id: "29517964", name: "Jake", role: "Host" },
  { id: "14508056", name: "Javier", role: "Host" },
  { id: "45982313", name: "Jey Em", role: "Host" },
  { id: "10417278", name: "JLord", role: "Host" },
  { id: "68345832", name: "Johnny", role: "Host" },
  { id: "53065612", name: "Joji", role: "Host" },
  { id: "51327969", name: "Jolly", role: "Host" },
  { id: "28207417", name: "Junel", role: "Host" },
  { id: "8081331", name: "Katieyow", role: "Host" },
  { id: "3613056", name: "Katy", role: "Host" },
  { id: "5825737", name: "Ken", role: "Host" },
  { id: "42205198", name: "Khey Gee", role: "Host" },
  { id: "65340031", name: "Kimpoy", role: "Host" },
  { id: "2711029", name: "Kitty", role: "Host" },
  { id: "2339155", name: "Kler", role: "Host" },
  { id: "8246228", name: "Kuya July", role: "Host" },
  { id: "18898805", name: "Lica", role: "Host" },
  { id: "11836486", name: "Lin", role: "Host" },
  { id: "50040181", name: "Lyka", role: "Host" },
  { id: "17443588", name: "Mai", role: "Host" },
  { id: "30333133", name: "Martin", role: "Host" },
  { id: "2608827", name: "Mikka", role: "Host" },
  { id: "40158690", name: "Nhics", role: "Host" },
  { id: "21302889", name: "Nicky", role: "Host" },
  { id: "4728141", name: "Nicole", role: "Host" }
];

(async () => {
  try {
    const batch = db.batch();
    
    for (const host of hostsData) {
      const { id, name } = host;
      
      // 1. users collection (auth)
      const userRef = db.collection('users').doc(id);
      batch.set(userRef, {
        poppo_id: id,
        nickname: name,
        role: 'host',
        is_temp_password: true,
        password: `${name}1234`
      });

      // 2. host collection (metadata)
      const hostRef = db.collection('host').doc(id);
      batch.set(hostRef, {
        poppo_id: id,
        nickname: name,
        role: 'host',
        tier_pay: "",
        assigned_manager_poppo_id: "",
        status: "Active"
      });
    }

    await batch.commit();
    console.log(`✅ Successfully seeded ${hostsData.length} hosts into users and host collections.`);
    process.exit(0);
  } catch (err) {
    console.error('❌ Failed to seed hosts:', err);
    process.exit(1);
  }
})();
