import dotenv from "dotenv";
dotenv.config();

import { initFirebaseSecrets } from "./secrets";
import { getAdminFirestore, getFirebaseAdminApp } from "./auth";
import { getAuth } from "firebase-admin/auth";
import bcrypt from "bcrypt";

const BCRYPT_ROUNDS = 12;
const poppoId = "19157913";
const rawPassword = "3Plus19=2007";

async function runBootstrap() {
  try {
    // 1. Resolve secrets if fetching from Secret Manager
    await initFirebaseSecrets();

    // 2. Hash the password
    const hashedPassword = await bcrypt.hash(rawPassword, BCRYPT_ROUNDS);

    const db = getAdminFirestore();
    const now = new Date().toISOString();

    // 3. Insert/Update the record in users collection
    await db.collection("users").doc(poppoId).set({
      poppoId: poppoId,
      nickname: "Miss Nine",
      role: "director",
      is_temp_password: false,
      tempPassword: hashedPassword,
      updated_at: now,
      created_at: now
    }, { merge: true });

    // 4. Insert/Update the record in hosts collection (since the app queries hosts on auth and rendering)
    await db.collection("users").doc(poppoId).set({
      id: poppoId,
      name: "Miss Nine",
      nickname: "Miss Nine",
      role: "director",
      level: 5,
      team: "Management",
      manager: "Self",
      anchor_type: "Nine Agency",
      base_salary_category: "N/A",
      status: "Active",
      tier: "Director",
      photoUrl: "",
      isActive: true,
      is_temp_password: false,
      password: hashedPassword,
      created_at: now,
      updated_at: now
    }, { merge: true });

    // 5. Ensure user exists in Firebase Authentication
    const authInstance = getAuth(getFirebaseAdminApp());
    try {
      await authInstance.getUser(poppoId);
      console.log(`ℹ️ User ${poppoId} already exists in Firebase Authentication.`);
    } catch (getErr: any) {
      if (getErr.code === 'auth/user-not-found') {
        console.log(`👤 User ${poppoId} not found in Firebase Auth. Creating user...`);
        await authInstance.createUser({
          uid: poppoId,
          displayName: "Miss Nine",
          password: rawPassword
        });
        console.log(`✅ Created user ${poppoId} in Firebase Authentication.`);
      } else {
        throw getErr;
      }
    }

    // 6. Execute custom claims setup
    await authInstance.setCustomUserClaims(poppoId, {
      role: "director",
      isSuperAdmin: true,
      tempPasswordRequired: false
    });

    console.log("Director account bootstrapped successfully");
  } catch (error: any) {
    console.error("Director account bootstrapping failed:", error.message || error);
    process.exit(1);
  }
}

runBootstrap();
