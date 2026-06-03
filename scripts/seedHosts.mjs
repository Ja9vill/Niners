import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
dotenv.config();

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

const hostsToCreate = [
  { poppoId: '14129568', name: 'Alli', role: 'Host' },
  { poppoId: '2934176', name: 'Allyy', role: 'Host' },
  { poppoId: '62652388', name: 'Amitzuke', role: 'Host' },
  { poppoId: '26645601', name: 'Angel', role: 'Host' },
  { poppoId: '66988219', name: 'Angel.', role: 'Host' },
  { poppoId: '43798318', name: 'Anjie', role: 'Host' },
  { poppoId: '9616469', name: 'April', role: 'Host' },
  { poppoId: '41339005', name: 'Arnel', role: 'Host' },
  { poppoId: '4498750', name: 'Boyeet', role: 'Host' },
  { poppoId: '26744344', name: 'Denj', role: 'Host' },
  { poppoId: '2716708', name: 'Dhal', role: 'Host' },
  { poppoId: '20901441', name: 'Erich', role: 'Host' },
  { poppoId: '23500951', name: 'Gelica', role: 'Host' },
  { poppoId: '2886088', name: 'Gracia', role: 'Host' },
  { poppoId: '726356', name: 'HoneyLou', role: 'Host' },
  { poppoId: '1089154', name: 'Jaa', role: 'Host' },
  { poppoId: '8170164', name: 'Jaebum', role: 'Host' },
  { poppoId: '29517964', name: 'Jake', role: 'Host' },
  { poppoId: '14508056', name: 'Javier', role: 'Host' },
  { poppoId: '45982313', name: 'Jey Em', role: 'Host' },
  { poppoId: '10417278', name: 'JLord', role: 'Host' },
  { poppoId: '68345832', name: 'Johnny', role: 'Host' },
  { poppoId: '53065612', name: 'Joji', role: 'Host' },
  { poppoId: '51327969', name: 'Jolly', role: 'Host' },
  { poppoId: '28207417', name: 'Junel', role: 'Host' },
  { poppoId: '8081331', name: 'Katieyow', role: 'Host' },
  { poppoId: '3613056', name: 'Katy', role: 'Host' },
  { poppoId: '5825737', name: 'Ken', role: 'Host' },
  { poppoId: '42205198', name: 'Khey Gee', role: 'Host' },
  { poppoId: '65340031', name: 'Kimpoy', role: 'Host' },
  { poppoId: '2711029', name: 'Kitty', role: 'Host' },
  { poppoId: '2339155', name: 'Kler', role: 'Host' },
  { poppoId: '8246228', name: 'Kuya July', role: 'Host' },
  { poppoId: '18898805', name: 'Lica', role: 'Host' },
  { poppoId: '11836486', name: 'Lin', role: 'Host' },
  { poppoId: '50040181', name: 'Lyka', role: 'Host' },
  { poppoId: '17443588', name: 'Mai', role: 'Host' },
  { poppoId: '30333133', name: 'Martin', role: 'Host' },
  { poppoId: '2608827', name: 'Mikka', role: 'Host' },
  { poppoId: '40158690', name: 'Nhics', role: 'Host' },
  { poppoId: '21302889', name: 'Nicky', role: 'Host' },
  { poppoId: '4728141', name: 'Nicole', role: 'Host' },
  { poppoId: '2388108', name: 'Pamela', role: 'Host' },
  { poppoId: '3095610', name: 'Primo', role: 'Host' },
  { poppoId: '30070500', name: 'Rosa', role: 'Host' },
  { poppoId: '41841905', name: 'Scarlet', role: 'Host' },
  { poppoId: '8724329', name: 'SexyLou', role: 'Host' },
  { poppoId: '19616782', name: 'Sky', role: 'Host' },
  { poppoId: '12810014', name: 'Summer', role: 'Host' },
  { poppoId: '4436945', name: 'TattooedMom', role: 'Host' },
  { poppoId: '10862326', name: 'Tracy', role: 'Host' },
  { poppoId: '6545736', name: 'Uno', role: 'Host' },
  { poppoId: '24786432', name: 'Wilab', role: 'Host' },
  { poppoId: '5907650', name: 'Yanica', role: 'Host' },
  { poppoId: '15080341', name: 'Zeek', role: 'Host' },
  { poppoId: '3699745', name: 'YeJoon', role: 'Host' },
];

(async () => {
  try {
    for (const u of hostsToCreate) {
      // Create password according to rule: Name + 1234
      const rawPassword = u.name.trim() + '1234';
      const hashedPassword = await bcrypt.hash(rawPassword, 10);
      const roleLower = u.role.toLowerCase();

      // Auth write
      const userRef = db.collection('users').doc(u.poppoId);
      const nowStr = new Date().toISOString();
      await userRef.set({
        poppoId: u.poppoId,
        poppo_id: u.poppoId,
        nickname: u.name.trim(),
        role: roleLower,
        level: 1,
        status: "active",
        is_first_login: false,
        is_temp_password: true,
        createdAt: nowStr,
        updatedAt: nowStr,
        assignedManagerId: null,
        assignedHosts: null,
        password: hashedPassword,
        password_hash: hashedPassword
      });

      // Role collection determination
      const collectionName = 'host';

      // Metadata write
      const roleRef = db.collection(collectionName).doc(u.poppoId);
      const roleData = {
        poppo_id: u.poppoId,
        nickname: u.name.trim(),
        role: roleLower,
        assigned_manager: "",
        tier_pay: "",
        team_anchor: "",
        status: ""
      };
      
      await roleRef.set(roleData);



      console.log(`✅ Seeded Host: ${u.name.trim()}`);
    }

    console.log('🎉 Finished seeding all 56 hosts.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Failed to seed hosts:', err);
    process.exit(1);
  }
})();
