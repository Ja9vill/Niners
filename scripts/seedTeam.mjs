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

const usersToCreate = [
  { poppoId: '21821805', name: 'Miles', role: 'Head Admin' },
  { poppoId: '30747697', name: 'Ely', role: 'Manager' },
  { poppoId: '18980270', name: 'Jean', role: 'Manager' },
  { poppoId: '24124167', name: 'March', role: 'Manager' },
  { poppoId: '6728969', name: 'Myrill', role: 'Manager' },
  { poppoId: '9940053', name: 'Nhiya', role: 'Agent' },
  { poppoId: '19781046', name: 'Vine', role: 'Manager' },
  { poppoId: '18335592', name: 'Yoshi', role: 'Manager' },
  { poppoId: '4439877', name: 'Chief A', role: 'Admin' },
  { poppoId: '11833865', name: 'Yudi', role: 'Manager' },
  { poppoId: '5370932', name: 'Nameless', role: 'Manager' },
  { poppoId: '22143679', name: 'Dhie2x', role: 'Admin' },
  { poppoId: '3003126', name: 'Lina', role: 'Manager' },
  { poppoId: '18540870', name: 'Aimee', role: 'Admin' },
  { poppoId: '19841422', name: 'Armae', role: 'Admin' },
  { poppoId: '54654841', name: 'Team Anne KJP', role: 'Agent' },
];

(async () => {
  try {
    for (const u of usersToCreate) {
      // Create password according to rule: Name + 1234
      const rawPassword = u.name + '1234';
      const hashedPassword = await bcrypt.hash(rawPassword, 10);
      const roleLower = u.role.toLowerCase();

      // Auth write
      const userRef = db.collection('users').doc(u.poppoId);
      await userRef.set({
        poppo_id: u.poppoId,
        nickname: u.name,
        role: roleLower,
        is_temp_password: true,
        password: hashedPassword
      });

      // Role collection determination
      let collectionName = roleLower.replace(/\s+/g, '_');
      if (roleLower === 'agent') {
        collectionName = 'manager';
      }

      // Metadata write
      const roleRef = db.collection(collectionName).doc(u.poppoId);
      const roleData = {
        poppo_id: u.poppoId,
        nickname: u.name,
        role: roleLower,
        tier_pay: "",
        team_anchor: "",
        status: ""
      };
      
      await roleRef.set(roleData);

      // Create performance_report top-level document
      const performanceRef = db.collection('performance_reports').doc(`${u.poppoId}_1`);
      await performanceRef.set({
        poppo_id: u.poppoId,
        nickname: u.name,
        from_date: "",
        to_date: "",
        live_duration: "",
        party_host_duration: "",
        total_earnings_of_points: "",
        agent_commission: "",
        live_earnings: "",
        party_earnings: "",
        private_chat: "",
        tips: "",
        platform_reward: "",
        other_earnings: "",
        platform_hourly_salary: "",
        super_salary: "",
        super_rank: "",
        level: ""
      });

      console.log(`✅ Seeded user: ${u.name} (Role: ${u.role}, Collection: ${collectionName})`);
    }

    console.log('🎉 Finished seeding all requested users.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Failed to seed users:', err);
    process.exit(1);
  }
})();
