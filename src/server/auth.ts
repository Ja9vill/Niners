import { Router } from "express";
import { initializeApp, cert, getApps, getApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { body, validationResult } from "express-validator";
import { getStaticHosts } from "../lib/staticHosts";
import { logAuthEvent } from "./auditLogger";
import { initFirebaseSecrets } from "./secrets";
import { runAutoSyncLivehouseData } from "./cron";

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || "nine-dashboard-secret-key-12345";
const BCRYPT_ROUNDS = 12;

/**
 * Authorized Director email addresses.
 * Users logging in via Google Sign-In with these emails will be
 * automatically provisioned as Director accounts on first access.
 */
const AUTHORIZED_DIRECTOR_EMAILS: string[] = [
  "jwavp@gmail.com",
  "jwavpr@gmail.com",
  "missjapugh@gmail.com",
];

export function getFirebaseAdminApp() {
  if (!getApps().length) {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

    if (!projectId || !clientEmail || !privateKey) {
      throw new Error(
        "Missing Firebase Admin environment variables: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY"
      );
    }

    return initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey,
      }),
      storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET
    });
  }
  return getApp();
}

export function getAdminStorage() {
  getFirebaseAdminApp();
  return getStorage();
}

export function getAdminFirestore() {
  const app = getFirebaseAdminApp();
  const db = getFirestore(app, "ai-studio-f578d03a-99b3-4c41-84dd-9901137e8386");
  try {
    db.settings({ preferRest: true });
  } catch (err) {
    // Ignore settings initialized warnings
  }
  return db;
}

export async function getCallerPoppoId(uid: string): Promise<string> {
  if (!uid) return "";
  const db = getAdminFirestore();
  try {
    const directDoc = await db.collection("users").doc(uid).get();
    if (directDoc.exists) {
      return uid;
    }
    const querySnap = await db.collection("users").where("googleUid", "==", uid).get();
    if (!querySnap.empty) {
      return querySnap.docs[0].id;
    }
  } catch (err) {
    console.error("[getCallerPoppoId Error]:", err);
  }
  return uid;
}

export async function syncCustomClaims(poppoId: string, role: string, tempPasswordRequired: boolean): Promise<void> {
  try {
    const authInstance = getAuth(getFirebaseAdminApp());
    const claims = {
      role: role || 'host',
      isSuperAdmin: (role || '').toLowerCase() === 'director',
      tempPasswordRequired
    };
    await authInstance.setCustomUserClaims(poppoId, claims);
    console.log(`✅ Synced Firebase custom claims for UID '${poppoId}':`, claims);
  } catch (error: any) {
    console.error(`❌ Failed to sync custom claims for UID '${poppoId}':`, error.message || error);
  }
}

// Auto-seed database with full host roster on startup if unpopulated
setTimeout(async () => {
  try {
    await initFirebaseSecrets();
    const db = getAdminFirestore();
    const snapshot = await db.collection("users").limit(50).get();
    if (snapshot.size < 50) {
      console.log("Database has few hosts. Auto-seeding all hosts from staticHosts...");
      const staticHosts = getStaticHosts();
      const batch = db.batch();
      staticHosts.forEach(host => {
        const docRef = db.collection("users").doc(host.id);
        batch.set(docRef, host);
      });
      await batch.commit();
      console.log("✅ Auto-seeding complete!");
    } else {
      console.log(`ℹ️ Database is already seeded (${snapshot.size}+ hosts found).`);
    }

    // Explicitly update Director password on startup to allow login
    const directorId = '19157913';
    const rawTargetPassword = '3Plus19=2007';
    const hashed = await bcrypt.hash(rawTargetPassword, 12);
    await db.collection("users").doc(directorId).update({
      password: hashed,
      is_temp_password: false,
      updated_at: new Date().toISOString()
    });
    console.log(`🔐 Auto-updated director ${directorId} password to hashed ${rawTargetPassword} with is_temp_password=false`);

    // Clean up performance reports starting with poppoId "1", "1_" or ending with "_1"
    try {
      const mockIds = [
        // Hosts (56)
        '14129568_1', '2934176_1', '62652388_1', '26645601_1', '66988219_1', '43798318_1', '9616469_1', '41339005_1', 
        '4498750_1', '26744344_1', '2716708_1', '20901441_1', '23500951_1', '2886088_1', '726356_1', '1089154_1', 
        '8170164_1', '29517964_1', '14508056_1', '45982313_1', '10417278_1', '68345832_1', '53065612_1', '51327969_1', 
        '28207417_1', '8081331_1', '3613056_1', '5825737_1', '42205198_1', '65340031_1', '2711029_1', '2339155_1', 
        '8246228_1', '18898805_1', '11836486_1', '50040181_1', '17443588_1', '30333133_1', '2608827_1', '40158690_1', 
        '21302889_1', '4728141_1', '2388108_1', '3095610_1', '30070500_1', '41841905_1', '8724329_1', '19616782_1', 
        '12810014_1', '4436945_1', '10862326_1', '6545736_1', '24786432_1', '5907650_1', '15080341_1', '3699745_1',
        // Team (16)
        '21821805_1', '30747697_1', '18980270_1', '24124167_1', '6728969_1', '9940053_1', '19781046_1', '18335592_1', 
        '4439877_1', '11833865_1', '5370932_1', '22143679_1', '3003126_1', '18540870_1', '19841422_1', '54654841_1',
        // Director & test users
        '19157913_1', '1_1', 'poppoid_1', '1'
      ];
      const batchReports = db.batch();
      mockIds.forEach(id => {
        batchReports.delete(db.collection("performance_reports").doc(id));
      });
      await batchReports.commit();
      console.log("🧹 Startup successfully purged mock performance reports by direct IDs.");
    } catch (cleanErr: any) {
      console.warn("Failed to clean up test performance reports:", cleanErr.message || cleanErr);
    }
  } catch (err: any) {
    console.error("Startup checks or updates failed:", err.message || err);
  }
}, 1000);

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Database lookup timed out")), timeoutMs)
    )
  ]);
}

/**
 * Securely compares a plaintext input password against a stored password.
 * Supports both bcrypt hashes (new, secure) and legacy plaintext passwords
 * (backward compat — will be replaced when user resets their password).
 */
async function verifyPassword(inputPassword: string, storedPassword: string): Promise<boolean> {
  // Detect bcrypt hash by its prefix ($2b$ or $2a$)
  if (storedPassword.startsWith("$2b$") || storedPassword.startsWith("$2a$")) {
    return bcrypt.compare(inputPassword, storedPassword);
  }
  // Legacy plaintext comparison (strip leading zeros for compat)
  const cleanStored = String(storedPassword || "").replace(/^0+/, "");
  const cleanInput = String(inputPassword || "").replace(/^0+/, "");
  return storedPassword === inputPassword || (cleanStored !== "" && cleanStored === cleanInput);
}

function getRoleLevel(role: string): number {
  const r = String(role || "").toLowerCase();
  if (r === "director") return 5;
  if (r === "head admin") return 4;
  if (r === "admin") return 3;
  if (r === "manager" || r === "agent") return 2;
  return 1;
}

function buildUserPayload(hostData: any) {
  const role = String(hostData.role || "host").toLowerCase();
  const level = getRoleLevel(role);
  return {
    poppo_id: hostData.id || hostData.poppo_id || hostData.poppoId,
    name: hostData.name || hostData.nickname || "",
    nickname: hostData.nickname || hostData.name || "",
    role,
    level,
    status: hostData.status || "Active",
    manager_assigned: hostData.manager || "Unassigned",
    anchor_team: hostData.team || "Alpha",
    profile_photo: hostData.photoUrl || "",
    position: hostData.position || role,
  };
}

function getHostPayloadAndToken(hostData: any) {
  const userPayload = buildUserPayload(hostData);
  const token = jwt.sign(userPayload, JWT_SECRET, { expiresIn: "7d" });
  return { ok: true, user: { ...userPayload, token } };
}

/**
 * JWT middleware for admin-only routes.
 * Validates Bearer token and attaches decoded payload to req.adminUser.
 * Rejects if level < requiredLevel.
 */
function requireAuth(requiredLevel: number = 3) {
  return (req: any, res: any, next: any) => {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
    if (!token) {
      return res.status(401).json({ error: "Authorization token required" });
    }
    try {
      const decoded: any = jwt.verify(token, JWT_SECRET);
      if ((decoded.level || 0) < requiredLevel) {
        return res.status(403).json({ error: "Insufficient permissions" });
      }
      req.adminUser = decoded;
      next();
    } catch {
      return res.status(401).json({ error: "Invalid or expired token" });
    }
  };
}

// ─────────────────────────────────────────────
// AUTH ROUTES
// ─────────────────────────────────────────────

router.post("/login", async (req, res) => {
  const rawPoppoId = req.body?.poppoId;
  const rawPassword = req.body?.password;
  console.log(`➡️ LOGIN ATTEMPT: poppoId="${rawPoppoId}", password="${rawPassword}"`);
  try {
    const poppoId = String(rawPoppoId || "").trim();
    const password = String(rawPassword || "").trim();
    if (!poppoId || !password) {
      return res.status(400).json({ error: "Poppo ID and password are required" });
    }

    // Direct bypass/override for the director account to handle offline DNS resolution and login issues
    if (String(poppoId) === '19157913' && String(password) === '3Plus19=2007') {
      const staticHosts = getStaticHosts();
      let hostData = staticHosts.find(h => h.id === '19157913');
      if (!hostData) {
        try {
          const db = getAdminFirestore();
          const hostDoc = await db.collection("users").doc('19157913').get();
          if (hostDoc.exists) {
            hostData = hostDoc.data();
          }
        } catch (dbErr) {
          console.error("Firestore lookup failed for login bypass:", dbErr);
        }
      }
      if (!hostData) {
        hostData = {
          id: '19157913',
          name: "Miss Nine",
          nickname: "Miss Nine",
<<<<<<< HEAD
          role: "director",
          level: 5,
          team: "Management",
          manager: "Self",
          anchor_type: "Nine Agency",
          base_salary_category: "N/A",
          status: "Active",
          tier: "Director",
=======
          role: "Director",
          level: 5,
          tier_pay: "N/A",
          status: "Active",

>>>>>>> 1caeedfed0e8d150b835bb818f205219a88c9b93
          photoUrl: "",
          isActive: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        try {
          const db = getAdminFirestore();
<<<<<<< HEAD
          await db.collection("users").doc('19157913').set(hostData);
          console.log("✅ Auto-created missing Director doc in Firestore users collection during login bypass.");
=======
          // Write auth info to users
          await db.collection("users").doc('19157913').set({
            poppo_id: hostData.id,
            nickname: hostData.nickname,
            role: hostData.role,
            isActive: hostData.isActive,
            updated_at: hostData.updated_at
          }, { merge: true });
          
          // Write full profile to director collection
          await db.collection("director").doc('19157913').set(hostData, { merge: true });
          console.log("✅ Auto-created missing Director doc in Firestore during login bypass.");
>>>>>>> 1caeedfed0e8d150b835bb818f205219a88c9b93
        } catch (dbSaveErr) {
          console.error("Failed to auto-save Director doc in Firestore:", dbSaveErr);
        }
      }
      if (hostData) {
        const userPayload = buildUserPayload(hostData);
        const token = jwt.sign(userPayload, JWT_SECRET, { expiresIn: "7d" });
        return res.json({ ok: true, user: { ...userPayload, token } });
      }
    }

    let hostData: any = null;
    let fromFirestore = false;
    try {
      const db = getAdminFirestore();
      const hostDoc = await withTimeout(
        db.collection("users").doc(String(poppoId)).get(),
        3000
      );
      if (hostDoc.exists) {
        hostData = hostDoc.data();
        fromFirestore = true;
      }
    } catch (dbErr) {
      console.warn("Firestore lookup failed, falling back to static roster:", dbErr);
    }

    if (!hostData) {
      return res.status(401).json({ error: `Poppo ID '${poppoId}' not found in database.` });
    }

    // Account Suspension Check: If isActive === false, halt execution and block application access immediately with 403.
    if (hostData.isActive === false || hostData.isActive === "false") {
      return res.status(403).json({ error: `Account for Poppo ID '${poppoId}' is inactive.` });
    }

    // Evaluating the database password field using a regular expression pattern to detect a secure bcrypt hash string.
    const bcryptRegex = /^\$2[ayb]\$\d{2}\$[./A-Za-z0-9]{53}$/;
    const storedPassword = String(hostData.password || "");
    const isBcrypt = bcryptRegex.test(storedPassword);

    let passwordMatch = false;
    let needsMigration = false;

    if (isBcrypt) {
      passwordMatch = await bcrypt.compare(String(password), storedPassword);
    } else {
      // The Legacy Fallback: unencrypted plaintext string native matching process.
      const cleanStored = storedPassword.replace(/^0+/, "");
      const cleanInput = String(password || "").replace(/^0+/, "");
      passwordMatch = storedPassword === password || (cleanStored !== "" && cleanStored === cleanInput);
      if (passwordMatch) {
        needsMigration = true;
      }
    }

    if (!passwordMatch) {
      return res.status(401).json({ error: "Invalid Poppo ID or password." });
    }

    // Auto-Migration Execution: silently encrypt password using bcrypt.hash (Salt Rounds: 10) and rewrite back to Firestore.
    if (needsMigration && fromFirestore) {
      try {
        const secureHash = await bcrypt.hash(String(password), 10);
        const db = getAdminFirestore();
        await db.collection("users").doc(String(poppoId)).update({
          password: secureHash,
          updated_at: new Date().toISOString()
        });
        hostData.password = secureHash; // Update local state for session
        console.log(`✅ Silently migrated credentials to secure bcrypt hash for Poppo ID: ${poppoId}`);
      } catch (migrationErr) {
        console.error(`Failed to silently migrate credentials for Poppo ID ${poppoId}:`, migrationErr);
      }
    }

    const userPayload = buildUserPayload(hostData);
    const token = jwt.sign(userPayload, JWT_SECRET, { expiresIn: "7d" });

    return res.json({ ok: true, user: { ...userPayload, token } });
  } catch (error: any) {
    console.error("Login endpoint failed:", error);
    return res.status(500).json({ error: error?.message || "Internal server error" });
  }
});



/**
 * POST /api/auth/check-username
 * Phase 1 of the two-step login flow.
 * Checks if a Poppo ID exists and whether it requires first-time password setup.
 * Returns { exists, is_first_login } — no auth token required.
 */
router.post("/check-username", async (req: any, res: any) => {
  const poppoId = String(req.body?.poppoId || "").trim();
  if (!poppoId) {
    return res.status(400).json({ error: "Poppo ID is required." });
  }

  // Director 19157913 always routes to standard password login
  if (poppoId === "19157913") {
    return res.json({ exists: true, is_first_login: false });
  }

  try {
    const db = getAdminFirestore();
    const snap = await withTimeout(db.collection("users").doc(poppoId).get(), 3000);

    if (!snap.exists) {
      return res.json({ exists: false });
    }

    const data = snap.data()!;

    if (data.isActive === false || data.isActive === "false") {
      return res.json({ exists: true, is_first_login: false, blocked: true });
    }

    const isFirstLogin =
      data.is_first_login === true ||
      data.is_temp_password === true ||
      data.is_first_time === true ||
      !data.password ||
      data.password === null;

    return res.json({ exists: true, is_first_login: isFirstLogin });
  } catch (err: any) {
    console.error("[check-username] failed:", err);
    return res.status(500).json({ error: err.message || "Failed to check username." });
  }
});

/**
 * POST /api/auth/set-initial-password
 * Phase 2a of the two-step login flow — first-time users only.
 * Validates and hashes the chosen password, flips is_first_login to false,
 * mints a Firebase custom token, and returns a full session (auto-login).
 * Body: { poppoId, newPassword, confirmPassword }
 */
router.post("/set-initial-password", loginRateLimiter, async (req: any, res: any) => {
  const { poppoId, newPassword, confirmPassword } = req.body;

  if (!poppoId) {
    return res.status(400).json({ error: "poppoId is required." });
  }

  const cleanId = String(poppoId).trim();

  try {
    const db = getAdminFirestore();
    const userDocRef = db.collection('users').doc(cleanId);
    const userSnapshot = await withTimeout(userDocRef.get(), 3000);

    // THE CRITICAL GATE: Drop request if document is absent from Firestore
    if (!userSnapshot.exists) {
      return res.status(403).json({ 
        error: "Please ask your manager to request account registration with the Director." 
      });
    }

    const dbUser = userSnapshot.data()!;

    if (!newPassword || !confirmPassword) {
      return res.status(400).json({ error: "poppoId, newPassword, and confirmPassword are required." });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ error: "Passwords do not match." });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters long." });
    }
    if (!/[A-Z]/.test(newPassword)) {
      return res.status(400).json({ error: "Password must contain at least one uppercase letter." });
    }
    if (!/[0-9]/.test(newPassword)) {
      return res.status(400).json({ error: "Password must contain at least one number." });
    }

    const isFirstLogin =
      dbUser.is_first_login === true ||
      dbUser.is_temp_password === true ||
      dbUser.is_first_time === true ||
      !dbUser.password ||
      dbUser.password === null;

    if (!isFirstLogin) {
      // Return 403 and do NOT reveal that the account has an existing password
      return res.status(403).json({ error: "This account is not eligible for password setup." });
    }

    const adminAuth = getAuth(getFirebaseAdminApp());
    const hashPassword = async (pwd: string) => bcrypt.hash(pwd, BCRYPT_ROUNDS);

    try {
      // 1. Verify existence or create the core identity inside Firebase Authentication first
      try {
        await adminAuth.getUser(cleanId);
      } catch (firebaseError: any) {
        if (firebaseError.code === 'auth/user-not-found') {
          // Provision the missing core authentication node using Poppo ID as the root UID
          await adminAuth.createUser({
            uid: cleanId,
            displayName: dbUser?.name || `User ${cleanId}`
          });
        } else {
          throw firebaseError;
        }
      }

      // 2. Hash the new password and update the target Firestore document fields
      const hashed = await hashPassword(newPassword);
      await userDocRef.update({
        password: hashed,
        password_hash: hashed,
        is_first_login: false,
        is_temp_password: false,
        is_first_time: false // Safely deprecate legacy keys and reset-login flag
      });

      // 3. Assign structural application roles now that the Auth target record exists
      const userRole = dbUser?.role || 'agent';
      const accessLevel = getRoleLevel(userRole); // Reference internal role mapping matrix
      await adminAuth.setCustomUserClaims(cleanId, { role: userRole, level: accessLevel });

    } catch (pipelineError: any) {
      console.error("❌ Auth Pipeline Sync Failure:", pipelineError);
      return res.status(500).json({ error: "Internal authentication configuration sync failure." });
    }

    const userRole = dbUser?.role || 'agent';
    const customToken = await adminAuth.createCustomToken(cleanId, {
      role: userRole,
      isSuperAdmin: userRole === "director",
      tempPasswordRequired: false,
    });

    const fullData = { ...dbUser, id: cleanId, is_first_login: false };
    const userPayload = buildUserPayload(fullData);
    const jwtToken = jwt.sign(userPayload, JWT_SECRET, { expiresIn: "7d" });

    console.log(`🔐 Initial password set and claims synced for Poppo ID: ${cleanId}`);
    return res.json({
      success: true,
      customToken,
      poppoId: cleanId,
      user: { ...userPayload, token: jwtToken },
    });
  } catch (err: any) {
    console.error("[set-initial-password] failed:", err);
    return res.status(500).json({ error: err.message || "Failed to set password." });
  }
});


router.post("/google-login", async (req, res) => {
  try {
    const { idToken } = req.body;
    if (!idToken) {
      return res.status(400).json({ error: "idToken is required" });
    }

    const auth = getAuth(getFirebaseAdminApp());
    const decoded = await auth.verifyIdToken(idToken);
    const uid = decoded.uid;
    const email = decoded.email || "";

    const db = getAdminFirestore();
    let hostData: any = null;

    // First search by googleUid
    const uidQuery = await db.collection("users").where("googleUid", "==", uid).get();
    if (!uidQuery.empty) {
      hostData = uidQuery.docs[0].data();
    } else if (email) {
      // Fallback: search by googleEmail
      const emailQuery = await db.collection("users").where("googleEmail", "==", email).get();
      if (!emailQuery.empty) {
        hostData = emailQuery.docs[0].data();
        // Update the record with the uid for future lookups
        await db.collection("users").doc(hostData.id).update({ googleUid: uid });
      }
    }

    if (hostData) {
      if (hostData.isActive !== true && hostData.isActive !== "true") {
        return res.status(403).json({ error: "Account not active" });
      }
      const responsePayload = getHostPayloadAndToken(hostData);
      return res.json(responsePayload);
    }

    // Check if the email is an authorized Director — link/auto-provision to the master Director account 19157913
    if (email && AUTHORIZED_DIRECTOR_EMAILS.includes(email.toLowerCase())) {
      const directorId = "19157913";
      const docRef = db.collection("users").doc(directorId);
      const doc = await docRef.get();
      let directorData: any = null;
      if (doc.exists) {
        const updates = {
          googleUid: uid,
          googleEmail: email,
          updated_at: new Date().toISOString()
        };
        await docRef.update(updates);
        directorData = { ...doc.data(), ...updates };
        console.log(`✅ Linked existing Director account ${directorId} to Google email: ${email}`);
      } else {
        directorData = {
          id: directorId,
          poppo_id: directorId,
          name: decoded.name || email.split("@")[0],
          nickname: decoded.name || email.split("@")[0],
          role: "Director",
          tier_pay: "N/A",
          status: "Active",
          level: 5,
          photoUrl: decoded.picture || "",
          isActive: true,
          googleUid: uid,
          googleEmail: email,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        await docRef.set({
          poppo_id: directorData.id,
          nickname: directorData.nickname,
          role: directorData.role,
          isActive: directorData.isActive,
          googleUid: directorData.googleUid,
          googleEmail: directorData.googleEmail,
          updated_at: directorData.updated_at
        }, { merge: true });
        await db.collection("director").doc(directorId).set(directorData, { merge: true });
        console.log(`✅ Auto-provisioned Director account ${directorId} for authorized email: ${email}`);
      }
      
      await syncCustomClaims(directorId, "director", false);
      const responsePayload = getHostPayloadAndToken(directorData);
      return res.json(responsePayload);
    }

    // No linked host found, needs registration/linking
    return res.json({
      ok: false,
      needsRegistration: true,
      googleUser: {
        uid,
        email,
        name: decoded.name || "",
        picture: decoded.picture || "",
      },
    });
  } catch (error: any) {
    console.error("Google login error:", error);
    return res.status(500).json({ error: error?.message || "Google authentication failed" });
  }
});

router.post("/google-register", async (req, res) => {
  try {
    const { idToken, poppoId } = req.body;
    if (!idToken || !poppoId) {
      return res.status(400).json({ error: "idToken and poppoId are required" });
    }

    const cleanPoppoId = String(poppoId).trim();
    if (!/^\d+$/.test(cleanPoppoId)) {
      return res.status(400).json({ error: "Poppo ID must be a numeric value" });
    }

    const auth = getAuth(getFirebaseAdminApp());
    const decoded = await auth.verifyIdToken(idToken);
    const uid = decoded.uid;
    const email = decoded.email || "";

    const db = getAdminFirestore();

    // Check if this Google account is already linked to ANOTHER host
    const linkedUidQuery = await db.collection("users").where("googleUid", "==", uid).get();
    if (!linkedUidQuery.empty) {
      return res.status(400).json({ error: "This Google account is already linked to another Poppo ID" });
    }

    // Check if the Poppo ID is already linked to a different Google account
    const hostDocRef = db.collection("users").doc(cleanPoppoId);
    const hostDoc = await hostDocRef.get();

    let hostData: any = null;
    if (hostDoc.exists) {
      hostData = hostDoc.data();
      if (hostData.googleUid && hostData.googleUid !== uid) {
        return res.status(400).json({ error: "This Poppo ID is already linked to a different Google account" });
      }

      // Update existing host to link it to Google
      const updates: any = {
        googleUid: uid,
        googleEmail: email,
        updated_at: new Date().toISOString(),
      };
      if (!hostData.photoUrl && decoded.picture) {
        updates.photoUrl = decoded.picture;
      }
      await hostDocRef.update(updates);
      hostData = { ...hostData, ...updates };
      const tempRequired = hostData.is_temp_password ?? false;
      await syncCustomClaims(cleanPoppoId, hostData.role, tempRequired);
    } else {
      // Create new host document
      hostData = {
        id: cleanPoppoId,
        poppo_id: cleanPoppoId,
        name: decoded.name || "Google User",
        nickname: decoded.name || "Google User",
        role: "Host",
        team: "Alpha",
        team_anchor: "Alpha",
        manager: "Unassigned",
        assigned_manager_poppo_id: null,
        assignedManagerId: null,
        anchor_type: "Nine Agency",
        tier_pay: "N/A",
        status: "Active",
        level: 1,

        photoUrl: decoded.picture || "",
        isActive: true,
        googleUid: uid,
        googleEmail: email,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      
      // Write auth info to users
      await hostDocRef.set({
        poppo_id: hostData.id,
        nickname: hostData.nickname,
        role: hostData.role,
        isActive: hostData.isActive,
        googleUid: hostData.googleUid,
        updated_at: hostData.updated_at
      }, { merge: true });
      
      // Write full profile to host collection
      await db.collection("host").doc(cleanPoppoId).set(hostData, { merge: true });
      const tempRequired = hostData.is_temp_password ?? false;
      await syncCustomClaims(cleanPoppoId, hostData.role, tempRequired);
    }

    if (hostData.isActive !== true && hostData.isActive !== "true") {
      return res.status(403).json({ error: "Account not active" });
    }

    const responsePayload = getHostPayloadAndToken(hostData);
    return res.json(responsePayload);
  } catch (error: any) {
    console.error("Google registration error:", error);
    return res.status(500).json({ error: error?.message || "Registration failed" });
  }
});

router.post("/logout", (_req, res) => {
  return res.json({ ok: true });
});

router.post("/verify", async (req, res) => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      return res.status(400).json({ error: "idToken is required" });
    }

    const auth = getAuth(getFirebaseAdminApp());
    const decoded = await auth.verifyIdToken(idToken);

    return res.json({
      uid: decoded.uid,
      email: decoded.email || "",
      name: decoded.name || "",
      picture: decoded.picture || "",
      emailVerified: !!decoded.email_verified,
    });
  } catch (error: any) {
    console.error("Token verification failed:", error);
    return res.status(401).json({ error: error?.message || "Unauthorized" });
  }
});

// ─────────────────────────────────────────────
// ADMIN ROUTES (require JWT with level >= 3)
// ─────────────────────────────────────────────

/**
 * POST /api/admin/livehouse/sync
 * Manually trigger the Livehouse sync from Google Sheets
 */
router.post("/livehouse/sync", requireAuth(3), async (req: any, res) => {
  try {
    await runAutoSyncLivehouseData(true); // ignoreLock = true
    res.json({ success: true, message: "Sync triggered successfully. The UI will update automatically." });
  } catch (error: any) {
    console.error("Manual Livehouse Sync Error:", error);
    res.status(500).json({ error: error?.message || "Failed to sync Livehouse data." });
  }
});

/**
 * POST /api/public/livehouse/sync
 * Public trigger to sync Livehouse data (used when anyone opens the calendar tab)
 */
router.post("/public/livehouse/sync", async (req, res) => {
  try {
    // We don't ignore lock here, so if it's already running within the interval, it skips safely
    await runAutoSyncLivehouseData(false);
    res.json({ success: true, message: "Sync triggered" });
  } catch (error) {
    console.error("Public Livehouse Sync Error:", error);
    res.status(500).json({ error: "Failed to sync" });
  }
});

/**
 * POST /api/admin/reset-password
 * Resets a user's login password using bcrypt hashing.
 * Body: { poppo_id, new_password } OR { poppoId, newPassword }
 * Auth: Bearer JWT, level >= 3 (Admin / Head Admin / Director)
 */
router.post("/reset-password", requireAuth(3), async (req: any, res) => {
  try {
    // Verifies that the requesting identity is explicitly role === 'director'
    if (String(req.adminUser?.role).toLowerCase() !== 'director') {
      return res.status(403).json({ error: "Forbidden: Only Director is authorized to reset passwords." });
    }

    // Accept both snake_case (spec) and camelCase (legacy) field names
    const poppoId: string = req.body.poppo_id ?? req.body.poppoId;
    const newPassword: string = req.body.new_password ?? req.body.newPassword;

    if (!poppoId || !newPassword) {
      return res.status(400).json({ error: "poppo_id and new_password are required" });
    }

    if (String(newPassword).length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }

    const db = getAdminFirestore();
    const hostRef = db.collection("users").doc(String(poppoId));
    const hostSnap = await hostRef.get();

    if (!hostSnap.exists) {
      return res.status(404).json({ error: `User '${poppoId}' not found` });
    }

    // Hash the new password with bcrypt (12 rounds)
    const hashedPassword = await bcrypt.hash(String(newPassword), BCRYPT_ROUNDS);

    await hostRef.update({
      password: hashedPassword,
      is_temp_password: true,
      updated_at: new Date().toISOString(),
      password_reset_by: req.adminUser?.poppo_id || "admin",
      password_reset_at: new Date().toISOString(),
    });

    const userRole = String(hostSnap.data()?.role || "").toLowerCase();
    if (userRole === "host" || userRole === "talent") {
      const hostDocRef = db.collection("host").doc(String(poppoId));
      const hostDocSnap = await hostDocRef.get();
      if (hostDocSnap.exists) {
        await hostDocRef.update({
          password: hashedPassword,
          is_temp_password: true,
          updated_at: new Date().toISOString(),
        });
      }
    }

    console.log(`🔐 Password reset by ${req.adminUser?.nickname} for Poppo ID: ${poppoId}`);
    return res.json({ ok: true, message: `Password reset successfully for ${poppoId}` });
  } catch (error: any) {
    console.error("Password reset failed:", error);
    return res.status(500).json({ error: error?.message || "Password reset failed" });
  }
});

/**
 * POST /api/admin/update-user
 * Updates editable fields on a host document (nickname, role, isActive).
 * Body: { poppoId: string, patch: { nickname?: string, role?: string, isActive?: boolean } }
 * Auth: Bearer JWT, level >= 3
 */
router.post("/update-user", requireAuth(3), async (req: any, res) => {
  try {
    const { poppoId, patch } = req.body;

    if (!poppoId || !patch || typeof patch !== "object") {
      return res.status(400).json({ error: "poppoId and patch object are required" });
    }

    // Whitelist allowed fields to prevent arbitrary overwrites
    const allowedFields = ["nickname", "role", "isActive"];
    const safeUpdate: Record<string, any> = {};
    for (const field of allowedFields) {
      if (patch[field] !== undefined) {
        safeUpdate[field] = patch[field];
      }
    }

    if (Object.keys(safeUpdate).length === 0) {
      return res.status(400).json({ error: "No valid fields to update" });
    }

    safeUpdate.updated_at = new Date().toISOString();
    safeUpdate.last_updated_by = req.adminUser?.poppo_id || "admin";

    const db = getAdminFirestore();
    const hostRef = db.collection("users").doc(String(poppoId));
    const hostSnap = await hostRef.get();

    if (!hostSnap.exists) {
      return res.status(404).json({ error: `User '${poppoId}' not found` });
    }

    await hostRef.update(safeUpdate);

    // Sync claims to Firebase Auth if user's role is updated
    if (safeUpdate.role !== undefined) {
      const updatedHostSnap = await hostRef.get();
      const updatedHostData = updatedHostSnap.data();
      if (updatedHostData) {
        const tempRequired = updatedHostData.is_temp_password ?? false;
        await syncCustomClaims(poppoId, updatedHostData.role, tempRequired);
      }
    }

    console.log(`✏️ User ${poppoId} updated by ${req.adminUser?.nickname}:`, safeUpdate);
    return res.json({ ok: true, updated: safeUpdate });
  } catch (error: any) {
    console.error("Update user failed:", error);
    return res.status(500).json({ error: error?.message || "Update failed" });
  }
});

/**
 * POST /api/admin/update-host-profile
 * Securely updates a host profile's metadata and fields.
 * Only 'director' or 'head admin' (case-insensitive) are allowed.
 * Body: { hostId: string, updatedFields: Record<string, any> }
 * Auth: Bearer Firebase ID Token (requires verifyFirebaseIdToken)
 */
router.post("/update-host-profile", verifyFirebaseIdToken, async (req: any, res: any) => {
  try {
    const { hostId, updatedFields } = req.body;
    console.log(`[UpdateHostProfile API] Request received for hostId: ${hostId}, updatedFields:`, updatedFields);

    if (!hostId || !updatedFields || typeof updatedFields !== "object") {
      console.error("[UpdateHostProfile API] Bad Request: Missing hostId or invalid updatedFields");
      return res.status(400).json({ error: "hostId and updatedFields are required." });
    }

    const callerRole = String(req.firebaseUser?.role || "").toLowerCase().trim();
    const callerUid = req.firebaseUser?.uid;
    const callerPoppoId = await getCallerPoppoId(callerUid);
    const isDirectorOrHeadAdmin = callerRole === "director" || callerRole === "head admin" || callerRole === "head_admin";
    const isOwnProfile = String(callerPoppoId) === String(hostId);

    console.log(`[UpdateHostProfile API] Auth details: callerRole='${callerRole}', callerUid='${callerUid}', callerPoppoId='${callerPoppoId}', isDirectorOrHeadAdmin=${isDirectorOrHeadAdmin}, isOwnProfile=${isOwnProfile}`);

    // Master override permission check: Director or Head Admin can edit any fields on any profile.
    if (!isDirectorOrHeadAdmin && !isOwnProfile) {
      console.warn(`[UpdateHostProfile API] Unauthorized access attempt: callerPoppoId '${callerPoppoId}' is not authorized to edit profile '${hostId}'`);
      return res.status(403).json({ error: "Forbidden: You are not authorized to update this profile." });
    }

    // List of fields that require Director/Head Admin role
    const adminFields = ["nickname", "role", "manager", "assignedManagerId", "status", "teamAnchor"];

    // List of fields that require Owner status (unless caller is director/head admin)
    const ownerFields = ["photoUrl", "tier_pay", "bio", "description", "social_links", "streaming_hours"];

    // Perform validation checks
    const fieldsToUpdate = Object.keys(updatedFields);
    
    // Enforce role-based restrictions if caller is not a Director/Head Admin
    if (!isDirectorOrHeadAdmin) {
      // 1. Enforce that only admin roles can modify administrative fields
      const hasAdminFields = fieldsToUpdate.some(field => adminFields.includes(field));
      if (hasAdminFields) {
        console.warn(`[UpdateHostProfile API] Forbidden: Caller is not director/head admin but attempted to update admin fields:`, fieldsToUpdate.filter(f => adminFields.includes(f)));
        return res.status(403).json({ error: "Forbidden: Nickname, Role, Assigned Manager, Status, and Team Anchor can only be edited by a Director or Head Admin." });
      }

      // 2. Enforce that only the profile owner can modify the remaining fields
      const hasOwnerFields = fieldsToUpdate.some(field => ownerFields.includes(field));
      if (hasOwnerFields && !isOwnProfile) {
        console.warn(`[UpdateHostProfile API] Forbidden: Caller is not owner but attempted to update owner fields:`, fieldsToUpdate.filter(f => ownerFields.includes(f)));
        return res.status(403).json({ error: "Forbidden: Photo Upload, Tier Pay, Host Public Message, Social Media, and Streaming Schedule can only be edited by the profile owner." });
      }
    }

    const db = getAdminFirestore();
    const userDocRef = db.collection("users").doc(hostId);
    const userSnap = await userDocRef.get();
    if (!userSnap.exists) {
      console.error(`[UpdateHostProfile API] User document not found in Firestore: ${hostId}`);
      return res.status(404).json({ error: `User '${hostId}' not found.` });
    }
    const userData = userSnap.data()!;
    const userRole = userData.role || "Host";

    const updatePayload: Record<string, any> = {
      updated_at: new Date().toISOString(),
      last_updated_by: callerPoppoId || "admin",
    };

    const allowedFields = [...adminFields, ...ownerFields];
    
    allowedFields.forEach(field => {
      if (updatedFields[field] !== undefined) {
        updatePayload[field] = updatedFields[field];
      }
    });

    if (updatePayload.teamAnchor !== undefined) {
      updatePayload.team = updatePayload.teamAnchor;
      updatePayload.team_anchor = updatePayload.teamAnchor;
    }
    if (updatePayload.manager !== undefined) {
      updatePayload.assigned_manager = updatePayload.manager;
      updatePayload.assigned_manager_nickname = updatePayload.manager;
    }
    if (updatePayload.assignedManagerId !== undefined) {
      updatePayload.assigned_manager_poppo_id = updatePayload.assignedManagerId;
    }
    if (updatePayload.tier_pay !== undefined) {
      updatePayload.tierPay = updatePayload.tier_pay;
      updatePayload.baseSalaryCategory = updatePayload.tier_pay;
      updatePayload.base_salary_category = updatePayload.tier_pay;
    }

    console.log(`[UpdateHostProfile API] Writing updates to users collection:`, updatePayload);
    // Update users collection
    await userDocRef.update(updatePayload);

    // Update role-specific collection (e.g. host)
    const normRole = String(userRole).toLowerCase().replace(/\s+/g, '_');
    const roleColName = normRole === "talent" ? "host" : normRole;
    
    const roleDocRef = db.collection(roleColName).doc(hostId);
    console.log(`[UpdateHostProfile API] Checking role collection: ${roleColName} for hostId: ${hostId}`);
    const roleSnap = await roleDocRef.get();
    if (roleSnap.exists) {
      console.log(`[UpdateHostProfile API] Role collection document exists. Writing role updates:`, updatePayload);
      await roleDocRef.update(updatePayload);
    } else {
      console.log(`[UpdateHostProfile API] Role collection document not found. Skipping role-specific updates.`);
    }

    console.log(`✏️ Host Profile ${hostId} updated successfully by ${callerPoppoId}`);
    return res.json({ success: true, updated: updatePayload });
  } catch (err: any) {
    console.error("[UpdateHostProfile API] Unexpected Error:", err);
    return res.status(500).json({ error: err.message || "Failed to update profile." });
  }
});

/**
 * POST /api/admin/update-event
 * Securely updates a calendar event's metadata.
 * Requires director, head admin, or event creator.
 */
router.post("/update-event", verifyFirebaseIdToken, async (req: any, res: any) => {
  try {
    const { eventId, updatedFields } = req.body;
    if (!eventId || !updatedFields || typeof updatedFields !== "object") {
      return res.status(400).json({ error: "eventId and updatedFields are required." });
    }

    const db = getAdminFirestore();
    const eventDocRef = db.collection("calendar").doc(eventId);
    const eventSnap = await eventDocRef.get();
    if (!eventSnap.exists) {
      return res.status(404).json({ error: `Event '${eventId}' not found.` });
    }

    const eventData = eventSnap.data()!;
    const callerRole = String(req.firebaseUser?.role || "").toLowerCase();
    const callerUid = req.firebaseUser?.uid; // caller Poppo ID
    const isCallerAdmin = callerRole === "director" || callerRole === "head admin" || callerRole === "head_admin";
    const isCreator = String(callerUid) === String(eventData.created_by_id);

    if (!isCallerAdmin && !isCreator) {
      return res.status(403).json({ error: "Forbidden: You are not authorized to edit this event." });
    }

    const updatePayload: Record<string, any> = {
      updated_at: new Date().toISOString(),
      last_updated_by: callerUid || "admin",
    };

    // Allowed fields for event update
    const allowedFields = ["title", "description", "date", "time", "type", "location", "participants", "participantIds"];
    allowedFields.forEach(field => {
      if (updatedFields[field] !== undefined) {
        updatePayload[field] = updatedFields[field];
      }
    });

    // Handle legacy alias mappings if present
    if (updatePayload.date !== undefined) {
      updatePayload.event_date = updatePayload.date;
    }
    if (updatePayload.type !== undefined) {
      updatePayload.type_of_event = updatePayload.type;
    }

    await eventDocRef.update(updatePayload);
    console.log(`✏️ Calendar Event ${eventId} updated by ${callerUid}:`, updatePayload);
    return res.json({ success: true, updated: updatePayload });
  } catch (err: any) {
    console.error("Update calendar event API failed:", err);
    return res.status(500).json({ error: err.message || "Failed to update calendar event." });
  }
});

/**
 * POST /api/admin/delete-event
 * Securely deletes a calendar event.
 * Requires director, head admin, or event creator.
 */
router.post("/delete-event", verifyFirebaseIdToken, async (req: any, res: any) => {
  try {
    const { eventId } = req.body;
    if (!eventId) {
      return res.status(400).json({ error: "eventId is required." });
    }

    const db = getAdminFirestore();
    const eventDocRef = db.collection("calendar").doc(eventId);
    const eventSnap = await eventDocRef.get();
    if (!eventSnap.exists) {
      return res.status(404).json({ error: `Event '${eventId}' not found.` });
    }

    const eventData = eventSnap.data()!;
    const callerRole = String(req.firebaseUser?.role || "").toLowerCase();
    const callerUid = req.firebaseUser?.uid; // caller Poppo ID
    const isCallerAdmin = callerRole === "director" || callerRole === "head admin" || callerRole === "head_admin";
    const isCreator = String(callerUid) === String(eventData.created_by_id);

    if (!isCallerAdmin && !isCreator) {
      return res.status(403).json({ error: "Forbidden: You are not authorized to delete this event." });
    }

    await eventDocRef.delete();
    console.log(`🗑️ Calendar Event ${eventId} deleted by ${callerUid}`);
    return res.json({ success: true });
  } catch (err: any) {
    console.error("Delete calendar event API failed:", err);
    return res.status(500).json({ error: err.message || "Failed to delete calendar event." });
  }
});

/**
 * GET /api/admin/users
 * Returns a list of all users from the users collection.
 * Auth: Bearer JWT, level >= 3
 */
router.get("/users", requireAuth(3), async (req: any, res) => {
  try {
    const db = getAdminFirestore();
    let snapshot = await db.collection("users").get();
    


    const users = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        poppoId: doc.id,
        nickname: data.nickname || data.name || "",
        role: data.role || "host"
      };
    });

    return res.json(users);
  } catch (error: any) {
    console.error("List users endpoint failed:", error);
    return res.status(500).json({ error: error?.message || "Internal server error" });
  }
});

/**
 * POST /api/admin/create-user
 * Securely provisions a new user in Firebase Auth and local Firestore.
 * Auth: Bearer Firebase ID Token, must have 'director' role.
 */
router.post(
  "/create-user",
  verifyFirebaseIdToken,
  [
    body("poppoId").isString().trim().isAlphanumeric().isLength({ min: 1, max: 128 }).withMessage("Poppo ID must be alphanumeric and max 128 characters"),
    body("nickname").isString().trim().notEmpty().withMessage("Nickname is required"),
    body("role").isString().trim().toLowerCase().isIn(["head admin", "admin", "manager", "agent", "host"]).withMessage("Invalid app role"),
    body("tierPay").optional({ nullable: true }).isString()
  ],
  async (req: any, res: any) => {
    try {
      // Step 2: Validate Caller claims
      const callerRole = String(req.firebaseUser?.role || "").toLowerCase();
      if (callerRole !== "director" && req.firebaseUser?.isSuperAdmin !== true) {
        return res.status(403).json({ error: "Forbidden: Only Directors can create users." });
      }

      // Step 3: Validate and sanitize request body
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: "Validation failed", details: errors.array() });
      }

      const { poppoId, nickname, role } = req.body;

      const db = getAdminFirestore();
      const userRef = db.collection("users").doc(poppoId);
      const userSnap = await userRef.get();

      if (userSnap.exists) {
        return res.status(400).json({ error: `User with Poppo ID '${poppoId}' already exists.` });
      }

      const authInstance = getAuth(getFirebaseAdminApp());

      // Check if user exists in Firebase Auth
      try {
        await authInstance.getUser(poppoId);
        return res.status(400).json({ error: `User with Poppo ID '${poppoId}' already exists in Authentication.` });
      } catch (err: any) {
        if (err.code !== "auth/user-not-found") {
          throw err;
        }
      }

      // Step 4: Create Firebase Auth user — no password (first-login flow)
      await authInstance.createUser({
        uid: poppoId,
        displayName: nickname,
      });

      // Set custom claims — user will set their own password
      await authInstance.setCustomUserClaims(poppoId, {
        role: role,
        isSuperAdmin: role === "director",
        tempPasswordRequired: false,
      });

      // Step 5: Save provisioned user with is_first_login=true, password=null
      const now = new Date().toISOString();
      const creatorPoppoId = req.firebaseUser?.uid || "admin";
      
      const cleanRole = String(role).trim().toLowerCase();
      const level = getRoleLevel(cleanRole);

      let assignedHosts = null;
      let assignedManagerId = null;

      if (level === 1) {
        assignedManagerId = null;
        assignedHosts = null;
      } else if (level === 2) {
        assignedManagerId = null;
        assignedHosts = [];
      } else {
        assignedManagerId = null;
        assignedHosts = null;
      }

      const userData: any = {
        poppoId: poppoId,
        poppo_id: poppoId,
        nickname: nickname,
        name: nickname,
        role: (() => {
          const norm = String(role || '').trim().toLowerCase();
          if (norm === 'host' || norm === 'talent') return 'Host';
          if (norm === 'admin') return 'Admin';
          if (norm === 'manager') return 'Manager';
          if (norm === 'agent') return 'Agent';
          if (norm === 'head admin' || norm === 'head_admin') return 'Head Admin';
          if (norm === 'director') return 'Director';
          return role.split(/[\s_-]+/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
        })(),
        level: level,
        is_first_login: true,
        is_temp_password: false,
        password: null,
        password_hash: null,
        status: 'active',
        isActive: true,
        createdAt: now,
        updatedAt: now,
        created_at: now,
        updated_at: now,
        created_by: creatorPoppoId,
        assignedManagerId: assignedManagerId,
        assignedHosts: assignedHosts
      };
      await db.collection("users").doc(poppoId).set(userData);

      if (cleanRole === "host" || cleanRole === "talent") {
        const hostData = {
          ...userData,
          id: poppoId,
          manager: "Nine Management",
          assigned_manager: "Nine Management",
          assigned_manager_nickname: "Nine Management",
          assigned_manager_poppo_id: null,
          assignedManagerId: null,
          team: "Unassigned",
          team_anchor: "Unassigned",
          tier_pay: "N/A"
        };
        await db.collection("host").doc(poppoId).set(hostData);
      }

      console.log(`👤 User ${poppoId} created securely by Director ${creatorPoppoId}`);
      return res.status(201).json({
        success: true,
        message: `User '${nickname}' created successfully.`,
        user: { poppoId, nickname, role }
      });
    } catch (error: any) {
      console.error("[CreateUser] Backend Error:", error);
      return res.status(500).json({ error: error?.message || "Internal server error during user creation." });
    }
<<<<<<< HEAD

    const cleanPoppoId = String(poppoId).trim();
    const cleanNickname = String(nickname).trim();
    const cleanRole = String(role).trim().toLowerCase();

    if (!/^[a-zA-Z0-9]+$/.test(cleanPoppoId)) {
      return res.status(400).json({ error: "Poppo ID must be alphanumeric." });
    }

    const allowedRoles = ["director", "admin", "manager", "agent", "host"];
    if (!allowedRoles.includes(cleanRole)) {
      return res.status(400).json({ error: `Invalid role. Allowed roles are: ${allowedRoles.join(", ")}` });
    }

    // Role-to-level mapping
    const levelMap: Record<string, number> = {
      director: 5,
      admin: 4,
      manager: 3,
      agent: 2,
      host: 1
    };
    const level = levelMap[cleanRole] || 1;

    const db = getAdminFirestore();
    const hostRef = db.collection("hosts").doc(cleanPoppoId);
    const hostSnap = await hostRef.get();

    if (hostSnap.exists) {
      return res.status(400).json({ error: `User with Poppo ID '${cleanPoppoId}' already exists.` });
    }

    // Default temporary password
    const defaultPassword = "Welcome123!";
    const hashedPassword = await bcrypt.hash(defaultPassword, BCRYPT_ROUNDS);

    const now = new Date().toISOString();
    const creatorPoppoId = req.adminUser?.poppo_id || "admin";

    // 1. Create in hosts collection
    const hostData = {
      id: cleanPoppoId,
      name: cleanNickname,
      nickname: cleanNickname,
      role: cleanRole,
      level,
      team: "Alpha",
      manager: "Unassigned",
      anchor_type: "Nine Agency",
      base_salary_category: "N/A",
      status: "Active",
      tier: "C",
      photoUrl: "",
      isActive: true,
      is_temp_password: true,
      password: hashedPassword,
      created_at: now,
      updated_at: now,
      created_by: creatorPoppoId
    };
    await hostRef.set(hostData);

    let assignedHosts = null;
    let assignedManagerId = null;

    if (level === 1) {
      assignedManagerId = null;
      assignedHosts = null;
    } else if (level === 2) {
      assignedManagerId = null;
      assignedHosts = [];
    } else {
      assignedManagerId = null;
      assignedHosts = null;
    }

    // 2. Create in users collection
    const userData = {
      poppoId: cleanPoppoId,
      poppo_id: cleanPoppoId,
      nickname: cleanNickname,
      role: cleanRole,
      level,
      status: "active",
      is_first_login: false,
      is_temp_password: true,
      password: hashedPassword,
      password_hash: hashedPassword,
      tempPassword: hashedPassword,
      createdAt: now,
      updatedAt: now,
      created_at: now,
      updated_at: now,
      created_by: creatorPoppoId,
      assignedManagerId: assignedManagerId,
      assignedHosts: assignedHosts
    };
    await db.collection("users").doc(cleanPoppoId).set(userData);

    // 3. Sync custom claims
    await syncCustomClaims(cleanPoppoId, cleanRole, true);

    console.log(`👤 User ${cleanPoppoId} created by ${req.adminUser?.nickname || "admin"}`);
    return res.status(201).json({
      success: true,
      message: `User '${cleanNickname}' created successfully with temporary password: '${defaultPassword}'.`,
      user: { poppoId: cleanPoppoId, nickname: cleanNickname, role: cleanRole }
    });
  } catch (error: any) {
    console.error("Create user endpoint failed:", error);
    return res.status(500).json({ error: error?.message || "Internal server error" });
=======
>>>>>>> 1caeedfed0e8d150b835bb818f205219a88c9b93
  }
);

/**
 * DELETE /api/admin/delete-user/:poppoId
 * Deletes a user from hosts and users collections, and clears Firebase Auth.
 * Auth: Bearer JWT, Director role or isSuperAdmin claim only.
 */
router.delete("/delete-user/:poppoId", verifyAdminRole, async (req: any, res: any) => {
  const { poppoId } = req.params;
  if (!poppoId) {
    return res.status(400).json({ error: "Poppo ID is required." });
  }

  const cleanPoppoId = String(poppoId).trim();
  const db = getAdminFirestore();

  try {
    // Step A: Read user to get role, then delete from collections
    const userSnap = await db.collection("users").doc(cleanPoppoId).get();
    if (userSnap.exists) {
      const role = userSnap.data()?.role || "";
      const roleCollection = role.replace(/\s+/g, '_');
      if (roleCollection) {
        const roleDocRef = db.collection(roleCollection).doc(cleanPoppoId);
        await roleDocRef.delete();
      }
    }
    await db.collection("users").doc(cleanPoppoId).delete();

    // Delete all performance reports (monthly and weekly) for this user
    const [reportsQuery, weeklyQuery] = await Promise.all([
      db.collection("performance_reports").where("poppo_id", "==", cleanPoppoId).get(),
      db.collection("performance_weekly_reports").where("poppo_id", "==", cleanPoppoId).get()
    ]);
    
    const batch = db.batch();
    if (!reportsQuery.empty) {
      reportsQuery.forEach(doc => {
        batch.delete(doc.ref);
      });
    }
    if (!weeklyQuery.empty) {
      weeklyQuery.forEach(doc => {
        batch.delete(doc.ref);
      });
    }
    await batch.commit();

    // Step B: Delete from Firebase Auth, catching errors if user doesn't exist
    try {
      const authInstance = getAuth(getFirebaseAdminApp());
      await authInstance.deleteUser(cleanPoppoId);
      console.log(`🔥 Deleted Firebase Auth user: ${cleanPoppoId}`);
    } catch (authErr: any) {
      console.warn(`[DeleteUser Warning]: Auth deletion skipped or failed for ${cleanPoppoId}: ${authErr.message || authErr}`);
    }

    console.log(`🔥 User ${cleanPoppoId} deleted by Director/SuperAdmin`);
    return res.status(200).json({
      success: true,
      message: `User with Poppo ID '${cleanPoppoId}' has been deleted successfully.`
    });
  } catch (error: any) {
    console.error("Delete user endpoint failed:", error);
    return res.status(500).json({ error: "Failed to delete user from database." });
  }
});

/**
 * POST /api/admin/reset-account-access
 * Director-only: clears a user's password and sets is_first_login=true,
 * forcing them to create a new password on next login.
 * Body: { poppoId }
 * Auth: Bearer JWT, level >= 5 (Director only)
 */
router.post("/reset-account-access", requireAuth(5), async (req: any, res: any) => {
  const { poppoId } = req.body;
  if (!poppoId) {
    return res.status(400).json({ error: "poppoId is required." });
  }

  const cleanId = String(poppoId).trim();

  try {
    const db = getAdminFirestore();
    const userRef = db.collection("users").doc(cleanId);
    const snap = await userRef.get();

    if (!snap.exists) {
      return res.status(404).json({ error: `User '${cleanId}' not found.` });
    }

    const data = snap.data()!;

    await userRef.update({
      password: null,
      is_first_login: true,
      is_temp_password: false,
      updated_at: new Date().toISOString(),
      access_reset_by: req.adminUser?.poppo_id || "director",
      access_reset_at: new Date().toISOString(),
    });

    const userRole = String(data.role || "").toLowerCase();
    if (userRole === "host" || userRole === "talent") {
      const hostDocRef = db.collection("host").doc(cleanId);
      const hostDocSnap = await hostDocRef.get();
      if (hostDocSnap.exists) {
        await hostDocRef.update({
          password: null,
          is_first_login: true,
          is_temp_password: false,
          updated_at: new Date().toISOString()
        });
      }
    }

    await syncCustomClaims(cleanId, data.role || "host", false);

    console.log(`🔄 Account access reset for ${cleanId} by ${req.adminUser?.poppo_id}`);
    return res.json({ ok: true, message: `Account access for '${cleanId}' has been reset. They must set a new password on next login.` });
  } catch (err: any) {
    console.error("[reset-account-access] failed:", err);
    return res.status(500).json({ error: err.message || "Failed to reset account access." });
  }
});


/**
 * GET /api/admin/verify-claims/:uid
 * Diagnostic route to verify custom claims on a Firebase Auth user.
 * Auth: Bearer Firebase ID Token, must have 'director' role or isSuperAdmin claim.
 */
router.get("/verify-claims/:uid", verifyAdminRole, async (req: any, res: any) => {
  const { uid } = req.params;
  if (!uid) {
    return res.status(400).json({ error: "User UID is required." });
  }

  try {
    const authInstance = getAuth(getFirebaseAdminApp());
    const userRecord = await authInstance.getUser(uid);
    
    console.log(`\n=== SECURITY DIAGNOSTIC: Custom Claims for UID: ${uid} ===`);
    console.log(JSON.stringify(userRecord.customClaims || {}, null, 2));
    console.log(`=========================================================\n`);

    return res.status(200).json({
      success: true,
      uid: userRecord.uid,
      displayName: userRecord.displayName,
      customClaims: userRecord.customClaims || {}
    });
  } catch (error: any) {
    console.error("Failed to verify custom claims:", error);
    return res.status(500).json({ error: error?.message || "Failed to retrieve user claims." });
  }
});

/**

 * POST /api/admin/financials
 * Saves financials (monthly or weekly) directly to Firebase Storage using Admin SDK,
 * with a fallback to Firestore flat collection if Storage is unavailable/unconfigured.
 * Body: { type: 'monthly' | 'weekly', data: any[] }
 * Auth: Bearer JWT, level >= 3
 */
router.post("/financials", requireAuth(3), async (req: any, res) => {
  try {
    const { type, data } = req.body;
    if (!type || !data || !Array.isArray(data)) {
      return res.status(400).json({ error: "type and data array are required" });
    }

    let savedToStorage = false;
    let storageErrorMsg = "";

    // 1. Try Firebase Storage
    try {
      const bucketName = process.env.VITE_FIREBASE_STORAGE_BUCKET || `${process.env.FIREBASE_PROJECT_ID}.appspot.com`;
      if (bucketName) {
        const bucket = getStorage(getFirebaseAdminApp()).bucket(bucketName);
        const file = bucket.file(`admin/financials/${type}.json`);
        
        await file.save(JSON.stringify(data), {
          contentType: "application/json",
          metadata: {
            cacheControl: "no-cache",
          }
        });
        console.log(`💾 Financials for ${type} saved to Firebase Storage by ${req.adminUser?.nickname}`);
        savedToStorage = true;
      }
    } catch (storageError: any) {
      storageErrorMsg = storageError.message || String(storageError);
      console.warn(`⚠️ Failed to save financials to Firebase Storage, falling back to Firestore: ${storageErrorMsg}`);
    }

    // 2. Always save to Firestore as fallback/backup
    try {
      const db = getAdminFirestore();
      await db.collection("financials_flat").doc(type).set({
        type,
        data,
        updatedAt: new Date().toISOString(),
        updatedBy: req.adminUser?.nickname || "system"
      });
      console.log(`💾 Financials for ${type} saved to Firestore fallback by ${req.adminUser?.nickname}`);
    } catch (firestoreError: any) {
      console.error("❌ Failed to save financials to Firestore fallback:", firestoreError);
      if (!savedToStorage) {
        // Both failed, throw error
        throw new Error(`Failed to save financials to Firebase Storage (${storageErrorMsg}) and Firestore fallback (${firestoreError.message})`);
      }
    }

    return res.json({ ok: true });
  } catch (error: any) {
    console.error("Failed to save financials:", error);
    return res.status(500).json({ error: error?.message || "Failed to save financials" });
  }
});

/**
 * GET /api/admin/financials
 * Fetches financials (monthly or weekly) from Firebase Storage, with fallback to Firestore.
 * Query: ?type=monthly or ?type=weekly
 * Auth: Bearer JWT, level >= 3
 */
router.get("/financials", requireAuth(3), async (req: any, res) => {
  try {
    const type = req.query.type;
    if (type !== 'monthly' && type !== 'weekly') {
      return res.status(400).json({ error: "Invalid type parameter" });
    }

    // 1. Try reading from Firebase Storage
    try {
      const bucketName = process.env.VITE_FIREBASE_STORAGE_BUCKET || `${process.env.FIREBASE_PROJECT_ID}.appspot.com`;
      if (bucketName) {
        const bucket = getStorage(getFirebaseAdminApp()).bucket(bucketName);
        const file = bucket.file(`admin/financials/${type}.json`);

        const [exists] = await file.exists();
        if (exists) {
          const [content] = await file.download();
          const data = JSON.parse(content.toString('utf-8'));
          console.log(`📖 Financials for ${type} successfully loaded from Firebase Storage`);
          return res.json(data);
        }
      }
    } catch (storageError: any) {
      console.warn(`⚠️ Failed to read financials from Firebase Storage, checking Firestore: ${storageError.message || storageError}`);
    }

    // 2. Try Firestore fallback
    try {
      const db = getAdminFirestore();
      const docSnap = await db.collection("financials_flat").doc(String(type)).get();
      if (docSnap.exists) {
        const docData = docSnap.data();
        console.log(`📖 Financials for ${type} successfully loaded from Firestore flat collection`);
        return res.json(docData?.data || []);
      }
    } catch (firestoreError: any) {
      console.error("❌ Failed to read financials from Firestore fallback:", firestoreError);
    }

    return res.json([]);
  } catch (error: any) {
    console.error("Failed to fetch financials:", error);
    return res.status(500).json({ error: error?.message || "Failed to fetch financials" });
  }
});

// =========================================================================
// CUSTOM AUTH & PASSWORD MIGRATION HARDENING ENDPOINTS
// =========================================================================

// Thread-safe in-memory rate limiting map
const rateLimitMap = new Map<string, { attempts: number[]; blockUntil: number }>();

/**
 * Custom rate limiter middleware applied to login-with-poppo.
 * Restricts login attempts to 5 requests per 15 minutes per IP address.
 */
function loginRateLimiter(req: any, res: any, next: any) {
  const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || "global";
  const now = Date.now();
  const limitWindow = 15 * 60 * 1000; // 15 minutes
  const maxAttempts = 5;

  const record = rateLimitMap.get(ip) || { attempts: [], blockUntil: 0 };
  record.attempts = record.attempts.filter(t => now - t < limitWindow);

  const rawPoppoId = req.body?.poppoId || req.body?.poppo_id;
  const cleanPoppoId = String(rawPoppoId || "").trim();

  if (record.blockUntil > now) {
    logAuthEvent(cleanPoppoId, "FAILURE", ip, "RATE_LIMIT_BLOCKED");
    return res.status(429).json({ error: "Too many login attempts. Please try again in 15 minutes." });
  }

  if (record.attempts.length >= maxAttempts) {
    record.blockUntil = now + limitWindow;
    rateLimitMap.set(ip, record);
    logAuthEvent(cleanPoppoId, "FAILURE", ip, "RATE_LIMIT_TRIGGERED");
    return res.status(429).json({ error: "Too many login attempts. Please try again in 15 minutes." });
  }

  record.attempts.push(now);
  rateLimitMap.set(ip, record);
  next();
}

/**
 * Helper to resolve the user's role.
 * Queries the Firestore users collection as the source of truth to override outdated custom claims.
 */
async function resolveTokenRole(decodedToken: any): Promise<void> {
  try {
    const db = getAdminFirestore();
    const email = decodedToken.email || "";
    if (email && AUTHORIZED_DIRECTOR_EMAILS.includes(email.toLowerCase())) {
      const directorId = "19157913";
      const docRef = db.collection("users").doc(directorId);
      const doc = await docRef.get();
      if (doc.exists) {
        const data = doc.data() || {};
        if (data.googleUid !== decodedToken.uid || data.googleEmail !== email) {
          await docRef.update({
            googleUid: decodedToken.uid,
            googleEmail: email,
            updated_at: new Date().toISOString()
          });
          console.log(`[resolveTokenRole] Automatically linked Director Google UID ${decodedToken.uid} and email ${email} to Poppo ID ${directorId}`);
        }
      }
    }

    const poppoId = await getCallerPoppoId(decodedToken.uid);
    if (poppoId) {
      const userDoc = await db.collection("users").doc(poppoId).get();
      if (userDoc.exists) {
        decodedToken.role = userDoc.data()?.role || "";
        console.log(`[resolveTokenRole] Resolved role '${decodedToken.role}' from Firestore for Poppo ID '${poppoId}'`);
      }
    }
  } catch (err: any) {
    console.warn("[resolveTokenRole] Fallback role lookup failed:", err.message);
  }
}

/**
 * Middleware that extracts and verifies the Firebase ID Token in the Authorization header.
 * Attaches decoded token data to req.firebaseUser on success.
 */
async function verifyFirebaseIdToken(req: any, res: any, next: any) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Access Denied: Missing or malformed Authorization Bearer header." });
  }
  const idToken = authHeader.split("Bearer ")[1];
  try {
    const auth = getAuth(getFirebaseAdminApp());
    const decodedToken = await auth.verifyIdToken(idToken);
    await resolveTokenRole(decodedToken);
    req.firebaseUser = decodedToken;
    next();
  } catch (verifyError: any) {
    console.error("[FirebaseAuthMiddleware Error]: ID Token verification failed:", verifyError.message);
    return res.status(401).json({ error: "Access Denied: Invalid or expired Firebase ID Token." });
  }
}

/**
 * Middleware to verify that the requesting user has the 'Director' role or the isSuperAdmin claim.
 * Prevents lower-level Admins or unauthorized users from executing highly restricted admin actions.
 */
async function verifyAdminRole(req: any, res: any, next: any) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Access Denied: Missing or malformed Authorization Bearer header." });
  }
  const idToken = authHeader.split("Bearer ")[1];
  try {
    const auth = getAuth(getFirebaseAdminApp());
    const decodedToken = await auth.verifyIdToken(idToken);
    await resolveTokenRole(decodedToken);
    
    // Explicitly check for isSuperAdmin claim or role === 'Director'
    const isSuperAdmin = decodedToken.isSuperAdmin === true;
    const isDirector = String(decodedToken.role || "").toLowerCase() === "director";

    if (!isSuperAdmin && !isDirector) {
      return res.status(403).json({ error: "Forbidden: Only users with the 'Director' role or isSuperAdmin claim can execute this request." });
    }

    req.firebaseUser = decodedToken;
    next();
  } catch (verifyError: any) {
    console.error("[verifyAdminRole Middleware Error]: Verification failed:", verifyError.message);
    return res.status(401).json({ error: "Access Denied: Invalid or expired Firebase ID Token." });
  }
}


/**
 * POST /api/auth/login-with-poppo
 * Custom login authentication verifying user against Firestore hosts collection
 * and generating a Firebase Custom Token with tempPasswordRequired custom claim.
 */
router.post("/login-with-poppo", loginRateLimiter, async (req: any, res: any) => {
  const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || "unknown";
  try {
    const { poppoId, tempPassword } = req.body;
    
    // 1. Input Sanitization & Validation
    const cleanPoppoId = String(poppoId || "").trim();
    const cleanPassword = String(tempPassword || "").trim();
    const alphanumericRegex = /^[a-zA-Z0-9]+$/;
    
    if (!cleanPoppoId || !cleanPassword || cleanPoppoId.length >= 128 || !alphanumericRegex.test(cleanPoppoId)) {
      logAuthEvent(cleanPoppoId || "invalid", "FAILURE", ipAddress, "INVALID_FORMAT");
      return res.status(400).json({ error: "Invalid Poppo ID or Password format." });
    }

    // Direct bypass/override for the director account
    if (String(cleanPoppoId) === '19157913' && String(cleanPassword) === '3Plus19=2007') {
      const staticHosts = getStaticHosts();
      let hostData = staticHosts.find(h => h.id === '19157913');
      if (!hostData) {
        try {
          const db = getAdminFirestore();
          const hostDoc = await db.collection("users").doc('19157913').get();
          if (hostDoc.exists) {
            hostData = hostDoc.data();
          }
        } catch (dbErr) {
          console.error("Firestore lookup failed for login-with-poppo bypass:", dbErr);
        }
      }
      if (!hostData) {
        hostData = {
          id: '19157913',
          name: "Miss Nine",
          nickname: "Miss Nine",
<<<<<<< HEAD
          role: "director",
          level: 5,
          team: "Management",
          manager: "Self",
          anchor_type: "Nine Agency",
          base_salary_category: "N/A",
          status: "Active",
          tier: "Director",
=======
          role: "Director",
          level: 5,
          tier_pay: "N/A",
          status: "Active",

>>>>>>> 1caeedfed0e8d150b835bb818f205219a88c9b93
          photoUrl: "",
          isActive: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        try {
          const db = getAdminFirestore();
          await db.collection("users").doc('19157913').set(hostData);
          console.log("✅ Auto-created missing Director doc in Firestore users collection during login-with-poppo bypass.");
        } catch (dbSaveErr) {
          console.error("Failed to auto-save Director doc in Firestore:", dbSaveErr);
        }
      }
      if (hostData) {
        await syncCustomClaims('19157913', 'director', false);
        const authInstance = getAuth(getFirebaseAdminApp());
        const customToken = await authInstance.createCustomToken('19157913', { tempPasswordRequired: false, role: 'director', isSuperAdmin: true });
        const userPayload = buildUserPayload(hostData);
        const token = jwt.sign(userPayload, JWT_SECRET, { expiresIn: "7d" });
        logAuthEvent('19157913', "SUCCESS", ipAddress);
        return res.json({ success: true, customToken, poppoId: '19157913', user: { ...userPayload, token } });
      }
    }
    
    // 2. Credential Verification (with timeout and static fallback)
    const db = getAdminFirestore();
    let hostData: any = null;
    try {
      const hostDoc = await withTimeout(
        db.collection("users").doc(cleanPoppoId).get(),
        3000
      );
      if (hostDoc.exists) {
        hostData = hostDoc.data();
      }
    } catch (dbErr: any) {
      console.warn("Firestore lookup failed in login-with-poppo, falling back to static roster:", dbErr.message || dbErr);
    }

    if (!hostData) {
      const staticHosts = getStaticHosts();
      hostData = staticHosts.find(h => h.id === cleanPoppoId);
    }

    if (!hostData) {
      console.warn(`[Login Error]: Auth failed: Poppo ID '${cleanPoppoId}' not found in database or static roster.`);
      logAuthEvent(cleanPoppoId, "FAILURE", ipAddress, "USER_NOT_FOUND");
      return res.status(401).json({ error: "Invalid Poppo ID or password." });
    }
    if (hostData.isActive === false || hostData.isActive === "false") {
      logAuthEvent(cleanPoppoId, "FAILURE", ipAddress, "INACTIVE_ACCOUNT");
      return res.status(403).json({ error: "Account is inactive." });
    }
    if (hostData.is_first_time === true) {
      logAuthEvent(cleanPoppoId, "FAILURE", ipAddress, "RESET_PASSWORD_REQUIRED");
      return res.status(403).json({ error: "Password reset required. Please enter your Poppo ID on the login page to set a new password." });
    }
    
    // Check password
    const bcryptRegex = /^\$2[ayb]\$\d{2}\$[./A-Za-z0-9]{53}$/;
    const storedPassword = String(hostData.password || "");
    const isBcrypt = bcryptRegex.test(storedPassword);
    let passwordMatch = false;
    
    if (isBcrypt) {
      passwordMatch = await bcrypt.compare(cleanPassword, storedPassword);
    } else {
      const cleanStored = storedPassword.replace(/^0+/, "");
      const cleanInput = cleanPassword.replace(/^0+/, "");
      passwordMatch = storedPassword === cleanPassword || (cleanStored !== "" && cleanStored === cleanInput);
    }
    
    if (!passwordMatch) {
      console.warn(`[Login Error]: Auth failed: Incorrect password for Poppo ID '${cleanPoppoId}'.`);
      logAuthEvent(cleanPoppoId, "FAILURE", ipAddress, "INCORRECT_PASSWORD");
      return res.status(401).json({ error: "Invalid Poppo ID or password." });
    }
    
    // Determine if legacy temporary password status needs migration
    const tempPasswordRequired = hostData.is_temp_password ?? false;
    
    // Sync custom user claims to Firebase Auth profile for security rule checking
    await syncCustomClaims(cleanPoppoId, hostData.role, tempPasswordRequired);

    // 3. Mint custom Firebase Auth Token with developer claims
    let customToken: string;
    try {
      const authInstance = getAuth(getFirebaseAdminApp());
      const developerClaims = {
        tempPasswordRequired,
        role: hostData.role || 'host',
        isSuperAdmin: (hostData.role || '').toLowerCase() === 'director'
      };
      customToken = await authInstance.createCustomToken(cleanPoppoId, developerClaims);
    } catch (firebaseError: any) {
      console.error(`[Firebase Auth Error]: Failed to create custom token for UID: ${cleanPoppoId}.`, firebaseError);
      logAuthEvent(cleanPoppoId, "FAILURE", ipAddress, "TOKEN_CREATION_FAILED");
      return res.status(500).json({ error: "Authentication service temporarily unavailable. Please try again later." });
    }
    
    const userPayload = buildUserPayload(hostData);
    const token = jwt.sign(userPayload, JWT_SECRET, { expiresIn: "7d" });
    logAuthEvent(cleanPoppoId, "SUCCESS", ipAddress);
    return res.json({
      success: true,
      customToken,
      poppoId: cleanPoppoId,
      user: { ...userPayload, token }
    });
  } catch (error: any) {
    console.error("Login endpoint failed:", error);
    const rawPoppoId = req.body?.poppoId || req.body?.poppo_id;
    const cleanPoppoId = String(rawPoppoId || "").trim();
    logAuthEvent(cleanPoppoId, "FAILURE", ipAddress, "INTERNAL_ERROR");
    return res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * POST /api/auth/mark-migration-complete
 * Secured route utilizing Client Firebase ID Token to flip is_temp_password flag
 * inside Firestore once the user successfully resets their permanent password.
 */
router.post("/mark-migration-complete", verifyFirebaseIdToken, async (req: any, res: any) => {
  try {
    const poppoId = req.firebaseUser.uid;
    const db = getAdminFirestore();
    await db.collection("users").doc(poppoId).update({
      is_temp_password: false,
      updated_at: new Date().toISOString(),
      password_migrated_at: new Date().toISOString()
    });
    console.log(`💾 Account migration finalized for Poppo ID: ${poppoId}`);
    return res.json({
      success: true,
      message: "Account migration complete. User is now fully secured."
    });
  } catch (error: any) {
    console.error("[MigrationController Error]: Failed to finalize migration in DB:", error);
    return res.status(500).json({ error: "Failed to update migration status on server database." });
  }
});

/**
 * POST /api/auth/change-password
 * Secured route utilizing Client Firebase ID Token to perform a password update.
 * Validates complexity, hashes via bcrypt, updates Firestore, and revokes tempPasswordRequired claim.
 */
router.post("/change-password", verifyFirebaseIdToken, async (req: any, res: any) => {
  try {
    const poppoId = req.firebaseUser.uid;
    const { newPassword } = req.body;

    if (!newPassword) {
      return res.status(400).json({ error: "New password is required." });
    }

    // Complexity validation: min 8 characters, at least 1 uppercase, 1 lowercase, 1 digit, 1 special character
    const complexityRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>]).{8,}$/;
    if (!complexityRegex.test(newPassword)) {
      return res.status(400).json({
        error: "Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character."
      });
    }

    // Hash the password with bcrypt (12 rounds)
    const hashedPassword = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

    const db = getAdminFirestore();

    // 1. Update the main hosts collection
    await db.collection("users").doc(poppoId).update({
      password: hashedPassword,
      is_temp_password: false,
      updated_at: new Date().toISOString(),
      password_migrated_at: new Date().toISOString()
    });

    // 2. Also update/create in the users collection to strictly conform to schema description
    try {
      await db.collection("users").doc(poppoId).set({
        tempPassword: hashedPassword,
        is_temp_password: false,
        updated_at: new Date().toISOString()
      }, { merge: true });
    } catch (usersErr) {
      console.warn("Optional users collection update failed/skipped:", usersErr);
    }

    // 3. Update Custom Claims to revoke tempPasswordRequired
    try {
      const authInstance = getAuth(getFirebaseAdminApp());
      const role = req.firebaseUser.role || 'host';
      const isSuperAdmin = req.firebaseUser.isSuperAdmin === true || role === 'director';
      await authInstance.setCustomUserClaims(poppoId, {
        role,
        isSuperAdmin,
        tempPasswordRequired: false
      });
    } catch (firebaseError: any) {
      console.error(`[Firebase Auth Error]: Failed to update custom claims for UID: ${poppoId}.`, firebaseError);
    }

    console.log(`🔒 Password successfully updated for Poppo ID: ${poppoId}`);
    return res.json({
      success: true,
      message: "Password updated successfully and custom claims revoked."
    });
  } catch (error: any) {
    console.error("[ChangePassword Error]: Failed to change password in DB:", error);
    return res.status(500).json({ error: "Failed to update password on server database." });
  }
});

router.all("/diag", async (req: any, res: any) => {
  const log: string[] = [];
  try {
    log.push("Using REST API for Firestore connection...");
    const projectId = process.env.FIREBASE_PROJECT_ID || "gen-lang-client-0222945352";
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL || process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const privateKey = (process.env.FIREBASE_PRIVATE_KEY || process.env.GOOGLE_SERVICE_ACCOUNT_KEY)?.replace(/\\n/g, '\n');

    if (!clientEmail || !privateKey) {
      throw new Error("Missing service account credentials in env.");
    }

    log.push("Signing JWT and fetching OAuth token...");
    const { google } = await import("googleapis");
    const jwtClient = new google.auth.JWT(
      clientEmail,
      undefined,
      privateKey,
      ['https://www.googleapis.com/auth/datastore']
    );
    const tokenResponse = await jwtClient.getAccessToken();
    const token = tokenResponse.token;
    if (!token) throw new Error("Failed to get access token.");
    log.push("OAuth token acquired.");

    log.push("Querying Firestore REST API...");
    const databaseId = "ai-studio-f578d03a-99b3-4c41-84dd-9901137e8386";
    const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${databaseId}/documents/performance_reports?pageSize=1000`;
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Firestore REST error (${response.status}): ${errText}`);
    }

    const data = await response.json();
    const documents = data.documents || [];
    log.push(`Fetched ${documents.length} total reports from REST API.`);

    const toDelete: string[] = [];
    documents.forEach((doc: any) => {
      const parts = doc.name.split('/');
      const id = parts[parts.length - 1];
      if (
        id.endsWith("_1") ||
        id.startsWith("1_") || 
        id.startsWith("poppoid_1") || 
        id === "1"
      ) {
        toDelete.push(id);
      }
    });

    log.push(`Found ${toDelete.length} documents matching cleanup criteria.`);

    if (toDelete.length > 0) {
      log.push(`Deleting matched documents: ${JSON.stringify(toDelete)}`);
      const commitUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${databaseId}/documents:commit`;
      const writes = toDelete.map(id => ({
        delete: `projects/${projectId}/databases/${databaseId}/documents/performance_reports/${id}`
      }));

      const commitRes = await fetch(commitUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ writes })
      });

      if (!commitRes.ok) {
        const commitErr = await commitRes.text();
        throw new Error(`Commit failed: ${commitErr}`);
      }
      log.push("Deletion batch committed successfully via REST!");
    } else {
      log.push("No documents matched cleanup criteria.");
    }

    return res.json({
      success: true,
      log,
      totalReports: documents.length,
      deletedCount: toDelete.length,
      deletedIds: toDelete
    });
  } catch (error: any) {
    log.push(`ERROR: ${error.message || error}`);
    console.error("[DiagError]:", error);
    return res.status(500).json({
      success: false,
      log,
      error: error.message || String(error)
    });
  }
});

/**
 * GET/POST /api/auth/cleanup-test-reports
 * Publicly accessible route to clean up test performance reports from Firestore database.
 */
router.all("/cleanup-test-reports", async (req: any, res: any) => {
  try {
    const projectId = process.env.FIREBASE_PROJECT_ID || "gen-lang-client-0222945352";
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL || process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const privateKey = (process.env.FIREBASE_PRIVATE_KEY || process.env.GOOGLE_SERVICE_ACCOUNT_KEY)?.replace(/\\n/g, '\n');

    if (!clientEmail || !privateKey) {
      return res.status(500).json({ error: "Missing Firebase credentials in server environment." });
    }

    const { google } = await import("googleapis");
    const jwtClient = new google.auth.JWT(
      clientEmail,
      undefined,
      privateKey,
      ['https://www.googleapis.com/auth/datastore']
    );
    const tokenResponse = await jwtClient.getAccessToken();
    const token = tokenResponse.token;
    if (!token) throw new Error("Failed to get access token.");

    const databaseId = "ai-studio-f578d03a-99b3-4c41-84dd-9901137e8386";
    const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${databaseId}/documents/performance_reports?pageSize=1000`;
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Firestore REST list error: ${errText}`);
    }

    const data = await response.json();
    const documents = data.documents || [];
    const toDelete: string[] = [];

    documents.forEach((doc: any) => {
      const parts = doc.name.split('/');
      const id = parts[parts.length - 1];
      if (
        id.endsWith("_1") ||
        id.startsWith("1_") || 
        id.startsWith("poppoid_1") || 
        id === "1"
      ) {
        toDelete.push(id);
      }
    });

    if (toDelete.length > 0) {
      const commitUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${databaseId}/documents:commit`;
      const writes = toDelete.map(id => ({
        delete: `projects/${projectId}/databases/${databaseId}/documents/performance_reports/${id}`
      }));

      const commitRes = await fetch(commitUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ writes })
      });

      if (!commitRes.ok) {
        const commitErr = await commitRes.text();
        throw new Error(`Commit failed: ${commitErr}`);
      }

      console.log(`🧹 API REST Cleaned up ${toDelete.length} test performance reports:`, toDelete);
      return res.json({
        success: true,
        message: `Cleaned up ${toDelete.length} test performance reports.`,
        deletedIds: toDelete
      });
    }

    return res.json({
      success: true,
      message: "No test performance reports found to delete.",
      deletedIds: []
    });
  } catch (error: any) {
    console.error("[CleanupError]: Failed to delete test reports:", error);
    return res.status(500).json({ error: "Failed to clean up test performance reports: " + error.message });
  }
});

<<<<<<< HEAD
=======
/**
 * POST /api/admin/update-fanbase-report
 * Securely updates a fanbase report.
 * Requires caller to be the original author.
 */
router.post("/update-fanbase-report", verifyFirebaseIdToken, async (req: any, res: any) => {
  try {
    const { reportId, updatedFields } = req.body;
    if (!reportId || !updatedFields || typeof updatedFields !== "object") {
      return res.status(400).json({ error: "reportId and updatedFields are required." });
    }

    const db = getAdminFirestore();
    const reportRef = db.collection("fanbase_reports").doc(reportId);
    const reportSnap = await reportRef.get();
    if (!reportSnap.exists) {
      return res.status(404).json({ error: `Fanbase report '${reportId}' not found.` });
    }

    const reportData = reportSnap.data()!;
    const callerUid = req.firebaseUser?.uid; // caller Poppo ID

    const isAuthor = String(callerUid) === String(reportData.reporterId || reportData.reporter_id);
    if (!isAuthor) {
      return res.status(403).json({ error: "Forbidden: You are not authorized to update this fanbase report." });
    }

    const updatePayload: Record<string, any> = {
      last_edited_by: callerUid || "admin",
      last_edited_at: new Date().toISOString(),
      lastEditedBy: req.firebaseUser?.nickname || req.firebaseUser?.name || "Admin",
      lastEditedAt: new Date(),
    };

    const allowedFields = [
      "fromDate", "toDate", "currentFollowers", "fanclubSubscribers", "fanclubGcMembers", "gcUpdatesHost", "gcUpdatesFans",
      "from_date", "to_date", "total_followers", "fanclub_subscribers", "fanclub_gc_members", "gc_activity_count_host", "gc_activity_count_fans"
    ];

    allowedFields.forEach(field => {
      if (updatedFields[field] !== undefined) {
        if ((field === "fromDate" || field === "toDate") && typeof updatedFields[field] === "string") {
          updatePayload[field] = new Date(updatedFields[field]);
        } else {
          updatePayload[field] = updatedFields[field];
        }
      }
    });

    await reportRef.update(updatePayload);
    console.log(`✏️ Fanbase Report ${reportId} updated by ${callerUid}:`, updatePayload);
    return res.json({ success: true, updated: updatePayload });
  } catch (err: any) {
    console.error("Update fanbase report API failed:", err);
    return res.status(500).json({ error: err.message || "Failed to update fanbase report." });
  }
});

/**
 * POST /api/admin/delete-fanbase-report
 * Securely deletes a fanbase report.
 * Requires caller to be the original author.
 */
router.post("/delete-fanbase-report", verifyFirebaseIdToken, async (req: any, res: any) => {
  try {
    const { reportId } = req.body;
    if (!reportId) {
      return res.status(400).json({ error: "reportId is required." });
    }

    const db = getAdminFirestore();
    const reportRef = db.collection("fanbase_reports").doc(reportId);
    const reportSnap = await reportRef.get();
    if (!reportSnap.exists) {
      return res.status(404).json({ error: `Fanbase report '${reportId}' not found.` });
    }

    const reportData = reportSnap.data()!;
    const callerUid = req.firebaseUser?.uid; // caller Poppo ID

    const isAuthor = String(callerUid) === String(reportData.reporterId || reportData.reporter_id);
    if (!isAuthor) {
      return res.status(403).json({ error: "Forbidden: You are not authorized to delete this fanbase report." });
    }

    await reportRef.delete();
    console.log(`🗑️ Fanbase Report ${reportId} deleted by ${callerUid}`);
    return res.json({ success: true });
  } catch (err: any) {
    console.error("Delete fanbase report API failed:", err);
    return res.status(500).json({ error: err.message || "Failed to delete fanbase report." });
  }
});

/**
 * POST /api/admin/update-attendance-log
 * Securely updates an attendance log.
 * Requires caller to be the original author.
 */
router.post("/update-attendance-log", verifyFirebaseIdToken, async (req: any, res: any) => {
  try {
    const { attendanceId, updatedFields } = req.body;
    if (!attendanceId || !updatedFields || typeof updatedFields !== "object") {
      return res.status(400).json({ error: "attendanceId and updatedFields are required." });
    }

    const db = getAdminFirestore();
    const attendanceRef = db.collection("attendance").doc(attendanceId);
    const attendanceSnap = await attendanceRef.get();
    if (!attendanceSnap.exists) {
      return res.status(404).json({ error: `Attendance log '${attendanceId}' not found.` });
    }

    const attendanceData = attendanceSnap.data()!;
    const callerUid = req.firebaseUser?.uid; // caller Poppo ID

    const isAuthor = String(callerUid) === String(attendanceData.reporterId || attendanceData.reporter_id);
    if (!isAuthor) {
      return res.status(403).json({ error: "Forbidden: You are not authorized to update this attendance log." });
    }

    const updatePayload: Record<string, any> = {
      last_edited_by: callerUid || "admin",
      last_edited_at: new Date().toISOString(),
      lastEditedBy: req.firebaseUser?.nickname || req.firebaseUser?.name || "Admin",
      lastEditedAt: new Date(),
    };

    const allowedFields = ["eventId", "eventTitle", "eventDate", "timeslot", "attendees", "attendeeIds", "eventFeedback"];
    allowedFields.forEach(field => {
      if (updatedFields[field] !== undefined) {
        updatePayload[field] = updatedFields[field];
      }
    });

    await attendanceRef.update(updatePayload);
    console.log(`✏️ Attendance Log ${attendanceId} updated by ${callerUid}:`, updatePayload);
    return res.json({ success: true, updated: updatePayload });
  } catch (err: any) {
    console.error("Update attendance log API failed:", err);
    return res.status(500).json({ error: err.message || "Failed to update attendance log." });
  }
});

/**
 * POST /api/admin/delete-attendance-log
 * Securely deletes an attendance log.
 * Requires caller to be the original author.
 */
router.post("/delete-attendance-log", verifyFirebaseIdToken, async (req: any, res: any) => {
  try {
    const { attendanceId } = req.body;
    if (!attendanceId) {
      return res.status(400).json({ error: "attendanceId is required." });
    }

    const db = getAdminFirestore();
    const attendanceRef = db.collection("attendance").doc(attendanceId);
    const attendanceSnap = await attendanceRef.get();
    if (!attendanceSnap.exists) {
      return res.status(404).json({ error: `Attendance log '${attendanceId}' not found.` });
    }

    const attendanceData = attendanceSnap.data()!;
    const callerUid = req.firebaseUser?.uid; // caller Poppo ID

    const isAuthor = String(callerUid) === String(attendanceData.reporterId || attendanceData.reporter_id);
    if (!isAuthor) {
      return res.status(403).json({ error: "Forbidden: You are not authorized to delete this attendance log." });
    }

    await attendanceRef.delete();
    console.log(`🗑️ Attendance Log ${attendanceId} deleted by ${callerUid}`);
    return res.json({ success: true });
  } catch (err: any) {
    console.error("Delete attendance log API failed:", err);
    return res.status(500).json({ error: err.message || "Failed to delete attendance log." });
  }
});

>>>>>>> 1caeedfed0e8d150b835bb818f205219a88c9b93
export default router;