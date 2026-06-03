import dotenv from "dotenv";
dotenv.config();

import { initFirebaseSecrets } from "./secrets";
import { getAdminFirestore, getFirebaseAdminApp } from "./auth";
import { getAuth } from "firebase-admin/auth";

const poppoId = "19157913";

async function verifyDirector() {
  try {
    console.log("🔍 Emergency Director Verification Script started.");
    
    // 1. Resolve secrets if fetching from Secret Manager
    await initFirebaseSecrets();

    // 2. Fetch the user from Firebase Auth
    const authInstance = getAuth(getFirebaseAdminApp());
    let userRecord;
    try {
      userRecord = await authInstance.getUser(poppoId);
      console.log(`✅ User ${poppoId} found in Firebase Authentication.`);
      console.log(`   UID: ${userRecord.uid}`);
      console.log(`   Display Name: ${userRecord.displayName || "None"}`);
      console.log(`   Email: ${userRecord.email || "None (Custom Token Auth)"}`);
      console.log(`   Custom Claims:`, JSON.stringify(userRecord.customClaims || {}, null, 2));
    } catch (getErr: any) {
      if (getErr.code === 'auth/user-not-found') {
        console.log(`❌ User ${poppoId} NOT found in Firebase Authentication. Needs bootstrapping.`);
        userRecord = null;
      } else {
        throw getErr;
      }
    }

    // 3. Inspect and correct Custom Claims if missing or wrong
    const claims = userRecord?.customClaims || {};
    const hasDirectorRole = claims.role === "director";
    const hasSuperAdmin = claims.isSuperAdmin === true;
    const hasTempPasswordRequiredFalse = claims.tempPasswordRequired === false;

    if (!userRecord || !hasDirectorRole || !hasSuperAdmin || !hasTempPasswordRequiredFalse) {
      console.log("⚠️ Claims are missing, incomplete, or incorrect. Re-applying claims...");
      
      // If user doesn't exist, create it
      if (!userRecord) {
        console.log("👤 Creating missing Director account in Firebase Auth...");
        await authInstance.createUser({
          uid: poppoId,
          displayName: "Miss Nine",
          password: "3Plus19=2007"
        });
        console.log("✅ Created Director account.");
      }

      await authInstance.setCustomUserClaims(poppoId, {
        role: "director",
        isSuperAdmin: true,
        tempPasswordRequired: false
      });
      
      const updatedUser = await authInstance.getUser(poppoId);
      console.log("✅ Claims re-applied. New claims:", JSON.stringify(updatedUser.customClaims, null, 2));
    } else {
      console.log("✅ Custom claims are perfectly configured in Firebase Authentication.");
    }

    // 4. Check Firestore database entries
    const db = getAdminFirestore();
    
    const userDoc = await db.collection("users").doc(poppoId).get();
    if (userDoc.exists) {
      const userData = userDoc.data();
      console.log(`✅ User doc found in 'users' collection. role=${userData?.role}, is_temp_password=${userData?.is_temp_password}`);
      if (userData?.is_temp_password !== false) {
        console.log("🔧 Fixing 'users' doc is_temp_password -> false...");
        await db.collection("users").doc(poppoId).update({ is_temp_password: false });
      }
    } else {
      console.log("⚠️ User doc NOT found in 'users' collection! Bootstrapping...");
    }

    const hostDoc = await db.collection("host").doc(poppoId).get();
    if (hostDoc.exists) {
      const hostData = hostDoc.data();
      console.log(`✅ Host doc found in 'host' collection. role=${hostData?.role}, is_temp_password=${hostData?.is_temp_password}, isActive=${hostData?.isActive}`);
      if (hostData?.is_temp_password !== false || hostData?.isActive !== true) {
        console.log("🔧 Fixing 'hosts' doc settings...");
        await db.collection("host").doc(poppoId).update({ 
          is_temp_password: false,
          isActive: true
        });
      }
    } else {
      console.log("⚠️ Host doc NOT found in 'host' collection!");
    }

    console.log("🎉 Emergency verification and recovery completed successfully.");
  } catch (error: any) {
    console.error("❌ Emergency verification failed:", error.message || error);
    process.exit(1);
  }
}

verifyDirector();
