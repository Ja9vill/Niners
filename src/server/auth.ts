import { Router } from "express";
import { initializeApp, cert, getApps, getApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import firebaseConfigJson from "../../firebase-applet-config.json" assert { type: "json" };

const router = Router();

function getFirebaseAdminApp() {
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

function getFirebaseAdminAuth() {
  getFirebaseAdminApp();
  return getAuth();
}

function getFirebaseAdminDb() {
  const app = getFirebaseAdminApp();
  const databaseId = (firebaseConfigJson as any).firestoreDatabaseId;
  return getFirestore(app, databaseId);
}

// Fallback users list
const FALLBACK_USERS = [
  {
    poppo_id: "9999",
    password: "031907",
    nickname: "Director Miss Nine",
    role: "Director",
    position: "Director",
    level: 99,
    status: "Active",
    manager_assigned: "None",
    anchor_team: "Leadership",
    profile_photo: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100",
  },
  {
    poppo_id: "8888",
    password: "19381364",
    nickname: "Head Admin",
    role: "Head Admin",
    position: "Head Admin",
    level: 80,
    status: "Active",
    manager_assigned: "None",
    anchor_team: "Leadership",
    profile_photo: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100",
  },
  {
    poppo_id: "1001",
    password: "1234",
    nickname: "Efficiency King",
    role: "Talent",
    position: "Talent",
    level: 50,
    status: "Active",
    manager_assigned: "Ely",
    anchor_team: "Alpha",
    profile_photo: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100",
  },
  {
    poppo_id: "1002",
    password: "1234",
    nickname: "LYKA",
    role: "Talent",
    position: "Talent",
    level: 45,
    status: "Active",
    manager_assigned: "Jean",
    anchor_team: "Beta",
    profile_photo: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100",
  }
];

router.post("/login", async (req, res) => {
  try {
    const { poppoId, password } = req.body;

    if (!poppoId || !password) {
      return res.status(400).json({ error: "Poppo ID and password are required" });
    }

    let foundUser: any = null;

    // 1. Try to find in Firestore if initialized
    try {
      const dbInstance = getFirebaseAdminDb();
      const hostDoc = await dbInstance.collection("hosts").doc(String(poppoId)).get();
      if (hostDoc.exists) {
        const hostData = hostDoc.data();
        if (hostData && String(hostData.password || "") === String(password)) {
          foundUser = {
            poppo_id: String(hostData.id),
            nickname: hostData.name || hostData.nickname || "Member",
            role: hostData.position || hostData.role || "Talent",
            position: hostData.position || "Talent",
            level: hostData.level || 1,
            status: hostData.status || "Active",
            manager_assigned: hostData.manager || "None",
            anchor_team: hostData.team || "None",
            profile_photo: hostData.profile_photo || `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100`,
          };
        } else if (hostData) {
          return res.status(401).json({ error: "Incorrect password for this Poppo ID" });
        }
      }
    } catch (dbError) {
      console.warn("Firestore admin lookup skipped/failed, using fallback pool:", dbError);
    }

    // 2. If not found in Firestore, search from fallback users
    if (!foundUser) {
      const fallbackMatch = FALLBACK_USERS.find(
        (u) => u.poppo_id === String(poppoId) && u.password === String(password)
      );

      if (fallbackMatch) {
        foundUser = { ...fallbackMatch };
      }
    }

    if (!foundUser) {
      return res.status(401).json({ error: "Invalid Poppo ID or password. Check credentials." });
    }

    const token = `auth_token_${foundUser.poppo_id}_${Math.random().toString(36).substring(2)}`;

    return res.json({
      ok: true,
      user: {
        ...foundUser,
        token,
      },
    });
  } catch (err: any) {
    console.error("Login endpoint failure:", err);
    return res.status(500).json({ error: err?.message || "Internal server error" });
  }
});

router.post("/logout", (req, res) => {
  return res.json({ ok: true });
});

router.post("/verify", async (req, res) => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      return res.status(400).json({ error: "idToken is required" });
    }

    const auth = getFirebaseAdminAuth();
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

export default router;