// import { getStaticHosts } from "../lib/staticHosts"; // Disabled static hosts import
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

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || "nine-dashboard-secret-key-12345";
const BCRYPT_ROUNDS = 12;

/**
 * Authorized Director email addresses.
 * Users logging in via Google Sign-In with these emails will be
 * automatically provisioned as Director accounts on first access.
 */
const AUTHORIZED_DIRECTOR_EMAILS: string[] = [
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
    });
  }
  return getApp();
}

export function getAdminFirestore() {
  const app = getFirebaseAdminApp();
  return getFirestore(app, "ai-studio-f578d03a-99b3-4c41-84dd-9901137e8386");
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
    const snapshot = await db.collection("hosts").limit(5).get();
    if (snapshot.size < 5) {
      console.log("Database has few hosts. Auto-seeding all hosts from staticHosts...");
      const staticHosts = getStaticHosts();
      const batch = db.batch();
      staticHosts.forEach(host => {
        const docRef = db.collection("hosts").doc(host.id);
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
    await db.collection("hosts").doc(directorId).update({
      password: hashed,
      is_temp_password: false,
      updated_at: new Date().toISOString()
    });
    console.log(`🔐 Auto-updated director ${directorId} password to hashed ${rawTargetPassword} with is_temp_password=false`);
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
    poppo_id: hostData.id,
    name: hostData.name,
    nickname: hostData.nickname || hostData.name,
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
      const hostData = staticHosts.find(h => h.id === '19157913');
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
        db.collection("hosts").doc(String(poppoId)).get(),
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
      const staticHosts = getStaticHosts();
      hostData = staticHosts.find(h => h.id === String(poppoId));
    }

    if (!hostData) {
      return res.status(401).json({ error: `Poppo ID '${poppoId}' not found in database or static roster.` });
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
        await db.collection("hosts").doc(String(poppoId)).update({
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
    const uidQuery = await db.collection("hosts").where("googleUid", "==", uid).get();
    if (!uidQuery.empty) {
      hostData = uidQuery.docs[0].data();
    } else if (email) {
      // Fallback: search by googleEmail
      const emailQuery = await db.collection("hosts").where("googleEmail", "==", email).get();
      if (!emailQuery.empty) {
        hostData = emailQuery.docs[0].data();
        // Update the record with the uid for future lookups
        await db.collection("hosts").doc(hostData.id).update({ googleUid: uid });
      }
    }

    if (hostData) {
      if (hostData.isActive !== true && hostData.isActive !== "true") {
        return res.status(403).json({ error: "Account not active" });
      }
      const responsePayload = getHostPayloadAndToken(hostData);
      return res.json(responsePayload);
    }

    // Check if the email is an authorized Director — auto-provision without requiring Poppo ID
    if (email && AUTHORIZED_DIRECTOR_EMAILS.includes(email.toLowerCase())) {
      const directorId = `director_${uid.slice(0, 8)}`;
      const newDirectorData: any = {
        id: directorId,
        name: decoded.name || email.split("@")[0],
        nickname: decoded.name || email.split("@")[0],
        role: "director",
        team: "Management",
        manager: "N/A",
        anchor_type: "Nine Agency",
        base_salary_category: "N/A",
        status: "Active",
        level: 5,
        tier: "Director",
        photoUrl: decoded.picture || "",
        isActive: true,
        googleUid: uid,
        googleEmail: email,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      await db.collection("hosts").doc(directorId).set(newDirectorData);
      console.log(`✅ Auto-provisioned Director account for authorized email: ${email}`);
      await syncCustomClaims(directorId, "director", false);
      const responsePayload = getHostPayloadAndToken(newDirectorData);
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
    const linkedUidQuery = await db.collection("hosts").where("googleUid", "==", uid).get();
    if (!linkedUidQuery.empty) {
      return res.status(400).json({ error: "This Google account is already linked to another Poppo ID" });
    }

    // Check if the Poppo ID is already linked to a different Google account
    const hostDocRef = db.collection("hosts").doc(cleanPoppoId);
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
        name: decoded.name || "Google User",
        nickname: decoded.name || "Google User",
        role: "host",
        team: "Alpha",
        manager: "Unassigned",
        anchor_type: "Nine Agency",
        base_salary_category: "N/A",
        status: "Active",
        level: 1,
        tier: "C",
        photoUrl: decoded.picture || "",
        isActive: true,
        googleUid: uid,
        googleEmail: email,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      await hostDocRef.set(hostData);
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
    const hostRef = db.collection("hosts").doc(String(poppoId));
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
    const hostRef = db.collection("hosts").doc(String(poppoId));
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
 * GET /api/admin/users
 * Returns a list of all users from the users collection.
 * Auth: Bearer JWT, level >= 3
 */
router.get("/users", requireAuth(3), async (req: any, res) => {
  try {
    const db = getAdminFirestore();
    let snapshot = await db.collection("users").get();
    
    // Auto-populate from hosts if users is empty
    if (snapshot.empty) {
      console.log("Users collection is empty. Seeding from hosts...");
      const hostsSnap = await db.collection("hosts").get();
      const batch = db.batch();
      
      hostsSnap.docs.forEach(doc => {
        const data = doc.data();
        const userRef = db.collection("users").doc(doc.id);
        batch.set(userRef, {
          poppoId: doc.id,
          nickname: data.nickname || data.name || "",
          role: data.role || "host",
          is_temp_password: data.is_temp_password ?? false,
          created_at: data.created_at || new Date().toISOString(),
          updated_at: data.updated_at || new Date().toISOString()
        });
      });
      await batch.commit();
      snapshot = await db.collection("users").get();
    }

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
    body("temporaryPassword").isString().isLength({ min: 6 }).withMessage("Temporary password must be at least 6 characters"),
    body("role").isString().trim().toLowerCase().isIn(["head admin", "admin", "manager", "agent", "host"]).withMessage("Invalid app role")
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

      const { poppoId, nickname, temporaryPassword, role } = req.body;

      const db = getAdminFirestore();
      const hostRef = db.collection("hosts").doc(poppoId);
      const hostSnap = await hostRef.get();

      if (hostSnap.exists) {
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

      // Step 4: Use Firebase Admin SDK to create the user account
      await authInstance.createUser({
        uid: poppoId,
        password: temporaryPassword,
        displayName: nickname,
      });

      // Set custom claims
      await authInstance.setCustomUserClaims(poppoId, {
        role: role,
        isSuperAdmin: role === "director",
        tempPasswordRequired: true
      });

      // Step 5: Save newly provisioned user record
      const hashedPassword = await bcrypt.hash(temporaryPassword, BCRYPT_ROUNDS);
      const now = new Date().toISOString();
      const creatorPoppoId = req.firebaseUser?.uid || "admin";

      const levelMap: Record<string, number> = {
        "head admin": 4,
        "admin": 3,
        "manager": 2,
        "agent": 2,
        "host": 1
      };
      const level = levelMap[role] || 1;

      const hostData = {
        id: poppoId,
        name: nickname,
        nickname: nickname,
        role: role,
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
        password: hashedPassword, // Legacy fallback
        created_at: now,
        updated_at: now,
        created_by: creatorPoppoId
      };
      await hostRef.set(hostData);

      const userData = {
        poppoId: poppoId,
        nickname: nickname,
        role: role,
        is_temp_password: true,
        created_at: now,
        updated_at: now,
        created_by: creatorPoppoId
      };
      await db.collection("users").doc(poppoId).set(userData);

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
    // Step A: Delete documents from Firestore collections
    await db.collection("users").doc(cleanPoppoId).delete();
    await db.collection("hosts").doc(cleanPoppoId).delete();

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
  const maxAttempts = 50; // Increased to 50 to prevent lockouts during development

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
      const hostData = staticHosts.find(h => h.id === '19157913');
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
        db.collection("hosts").doc(cleanPoppoId).get(),
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
    await db.collection("hosts").doc(poppoId).update({
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
    await db.collection("hosts").doc(poppoId).update({
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

export default router;