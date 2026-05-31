import dotenv from 'dotenv';
import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';
import bcrypt from 'bcrypt';

// Load environmental variables
const envPath = '.env';
try {
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const lines = envContent.split(/\r?\n/);
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
  }
} catch (err) {
  dotenv.config({ path: envPath });
}

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

if (!projectId || !clientEmail || !privateKey) {
  console.error("❌ Missing database credentials in environment.");
  process.exit(1);
}

const app = admin.initializeApp({
  credential: admin.credential.cert({
    projectId,
    clientEmail,
    privateKey,
  })
});

const databaseId = "ai-studio-f578d03a-99b3-4c41-84dd-9901137e8386";
console.log(`Connecting to database ID: ${databaseId}...`);

async function runInitialization() {
  const db = getFirestore(app, databaseId);

  // 1. Initial Users Seeding Data
  const seedUsers = [
    { poppoId: "19157913", nickname: "Miss Nine", role: "Director", password: "3Plus19=2007" },
    { poppoId: "21821805", nickname: "Miles", role: "Head Admin", password: "123456789M" },
    { poppoId: "18335592", nickname: "Yoshi", role: "Manager", password: "123456789Y" },
    { poppoId: "18540870", nickname: "Aimee", role: "Admin", password: "123456789hAi" },
    { poppoId: "19841422", nickname: "Armae", role: "Admin", password: "123456789Ar" },
    { poppoId: "11155826", nickname: "Nhia", role: "Agent", password: "123456789N" },
    { poppoId: "29517964", nickname: "Jake", role: "Host", password: "123456789J" }
  ];

  console.log("Seeding users collection...");
  for (const user of seedUsers) {
    const passwordHash = await bcrypt.hash(user.password, 10);
    const userDocData = {
      poppoId: user.poppoId,
      nickname: user.nickname,
      role: user.role,
      is_temp_password: true,
      createdAt: admin.firestore.Timestamp.now(),
      assignedManagerId: null,
      password: passwordHash
    };

    await db.collection("users").doc(user.poppoId).set(userDocData);
    console.log(`✅ Seeded user ${user.nickname} (${user.poppoId})`);
  }

  // 2. Set up template documents for other collections to initialize them with exact schemas
  console.log("\nInitializing template documents for other collections...");

  // performance_reports template
  const performanceTemplate = {
    poppoId: "_template",
    year: 0,
    month: 0,
    periodType: "",
    fromDate: admin.firestore.Timestamp.now(),
    toDate: admin.firestore.Timestamp.now(),
    level: 0,
    liveDurationMinutes: 0,
    partyHostDurationMinutes: 0,
    earningsBreakdown: {
      totalEarningsOfPoints: 0,
      agentCommission: 0,
      liveEarnings: 0,
      partyEarnings: 0,
      privateChatEarnings: 0,
      tips: 0,
      platformReward: 0,
      otherEarnings: 0,
      platformHourlySalary: 0,
      superSalary: 0,
      superRank: 0,
      totalDuration: 0,
      totalEarnings: 0,
      averageAcu: 0,
      newFans: 0,
      newFanClubMembers: 0,
      giftingThisWeek: 0,
      unfollowers: 0,
      totalEarningsPast3Months: 0
    }
  };
  await db.collection("performance_reports").doc("_schema_template").set(performanceTemplate);
  console.log("✅ Initialized 'performance_reports' collection template.");

  // fanbase_reports template
  const fanbaseTemplate = {
    fromDate: admin.firestore.Timestamp.now(),
    toDate: admin.firestore.Timestamp.now(),
    poppoId: "_template",
    nickname: "",
    currentFollowers: 0,
    fanclubSubscribers: 0,
    fanclubGcMembers: 0,
    gcUpdatesHost: 0,
    gcUpdatesFans: 0,
    reporterId: "",
    reporterName: "",
    reporterRole: "",
    submittedAt: admin.firestore.Timestamp.now()
  };
  await db.collection("fanbase_reports").doc("_schema_template").set(fanbaseTemplate);
  console.log("✅ Initialized 'fanbase_reports' collection template.");

  // pk_reports template
  const pkTemplate = {
    fromDate: admin.firestore.Timestamp.now(),
    toDate: admin.firestore.Timestamp.now(),
    poppoId: "_template",
    nickname: "",
    pkWinPercent: 0,
    pkPoints: 0,
    pkSessions: 0,
    reporterId: "",
    reporterName: "",
    reporterRole: "",
    submittedAt: admin.firestore.Timestamp.now()
  };
  await db.collection("pk_reports").doc("_schema_template").set(pkTemplate);
  console.log("✅ Initialized 'pk_reports' collection template.");

  // events template
  const eventsTemplate = {
    eventDate: admin.firestore.Timestamp.now(),
    timeslot: "",
    eventType: "",
    description: "",
    participantIds: [],
    status: "",
    actualParticipants: [],
    adminFeedback: "",
    createdBy: "",
    attendanceSubmittedBy: {}
  };
  await db.collection("events").doc("_schema_template").set(eventsTemplate);
  console.log("✅ Initialized 'events' collection template.");

  // tasks template
  const tasksTemplate = {
    taskId: "_template",
    assignerId: "",
    assigneeId: "",
    title: "",
    content: "",
    taskType: "",
    status: "",
    dueDate: admin.firestore.Timestamp.now(),
    createdAt: admin.firestore.Timestamp.now()
  };
  await db.collection("tasks").doc("_schema_template").set(tasksTemplate);
  console.log("✅ Initialized 'tasks' collection template.");

  console.log("\n🎉 Database Infrastructure initialization completed successfully!");
  process.exit(0);
}

runInitialization().catch(err => {
  console.error("❌ Error initializing collections:", err);
  process.exit(1);
});
