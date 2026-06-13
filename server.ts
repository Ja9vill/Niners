import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import { getMessaging } from "firebase-admin/messaging";
import authRouter, { getAdminFirestore, getFirebaseAdminApp, syncCustomClaims } from "./src/server/auth";
import auditRouter from "./src/server/auditRouter";
import { google } from "googleapis";
import { getStaticHosts } from "./src/lib/staticHosts";
import { initFirebaseSecrets } from "./src/server/secrets";
import { logSystemEvent } from "./src/server/Logger";
import net from "net";
import { startCronJobs } from "./src/server/cron";
import webpush from "web-push";
import fs from "fs";
import { getAuth } from "firebase-admin/auth";
import admin from "firebase-admin";
import jwt from "jsonwebtoken";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || "nine-dashboard-secret-key-12345";

/** Returns the first available TCP port starting from `start`. */
function findFreePort(start: number): Promise<number> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(start, "0.0.0.0", () => {
      const addr = server.address() as net.AddressInfo;
      server.close(() => resolve(addr.port));
    });
    server.on("error", () => resolve(findFreePort(start + 1)));
  });
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Database lookup timed out")), timeoutMs)
    )
  ]);
}

async function startServer() {
  await initFirebaseSecrets();
  const app = express();
  const PORT = Number(process.env.PORT || 3000);
  
  // Start background tasks
  startCronJobs();

  app.use(express.json({ limit: "100mb" }));
  app.use(express.urlencoded({ limit: "100mb", extended: true }));

  app.use("/api/auth", authRouter);
  app.use("/api/admin", authRouter);

  // --- ROSTER MANAGEMENT PANEL ENDPOINTS ---
  
  // Helper for role normalization
  function normalizeRoleTypographyBackend(r: string): string {
    const norm = String(r || '').trim().toLowerCase();
    if (norm === 'host' || norm === 'talent') return 'Host';
    if (norm === 'admin') return 'Admin';
    if (norm === 'manager') return 'Manager';
    if (norm === 'agent') return 'Agent';
    if (norm === 'head admin' || norm === 'head_admin') return 'Head Admin';
    if (norm === 'director') return 'Director';
    return r.split(/[\s_-]+/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
  }

  function getSafeRoleCollectionBackend(r: string): string {
    const norm = String(r || '').trim().toLowerCase();
    if (norm === 'host' || norm === 'talent') return 'host';
    if (norm === 'admin') return 'admin';
    if (norm === 'manager') return 'manager';
    if (norm === 'agent') return 'agent';
    if (norm === 'head admin' || norm === 'head_admin') return 'head_admin';
    if (norm === 'director') return 'director';
    return 'host';
  }

  async function updateManagerHostFieldsBackend(managerId: string, hostIdToAdd: string | null, hostIdToRemove: string | null) {
    const db = getAdminFirestore();
    let managerRef = db.collection('manager').doc(managerId);
    let managerSnap = await withTimeout(managerRef.get(), 3000);
    let currentRole = 'manager';
    
    if (!managerSnap.exists) {
      managerRef = db.collection('agent').doc(managerId);
      managerSnap = await withTimeout(managerRef.get(), 3000);
      currentRole = 'agent';
      if (!managerSnap.exists) {
        const userSnap = await withTimeout(db.collection('users').doc(managerId).get(), 3000);
        if (!userSnap.exists) return;
        const uRole = String(userSnap.data()?.role || '').toLowerCase();
        currentRole = uRole === 'agent' ? 'agent' : 'manager';
        managerRef = db.collection(currentRole).doc(managerId);
        managerSnap = await withTimeout(managerRef.get(), 3000);
      }
    }
    
    const mgrData = managerSnap.exists ? managerSnap.data()! : {};
    let assignedHosts: string[] = mgrData.assignedHosts || [];
    
    if (hostIdToAdd && !assignedHosts.includes(hostIdToAdd)) {
      assignedHosts.push(hostIdToAdd);
    }
    if (hostIdToRemove) {
      assignedHosts = assignedHosts.filter(id => id !== hostIdToRemove);
    }
    
    const updateData: Record<string, any> = {
      assignedHosts: assignedHosts
    };
    
    const deleteField = admin.firestore.FieldValue.delete;
    
    Object.keys(mgrData).forEach(key => {
      if (key.startsWith('Assigned Host') || key.startsWith('Assigned host')) {
        updateData[key] = deleteField();
      }
    });
    
    assignedHosts.forEach((hId, index) => {
      updateData[`Assigned Host ${index + 1}`] = hId;
    });
    
    const batch = db.batch();
    batch.set(managerRef, updateData, { merge: true });
    batch.set(db.collection('users').doc(managerId), { updated_at: new Date().toISOString() }, { merge: true });
    await withTimeout(batch.commit(), 4000);
  }

  async function syncHostManagerRelationshipBackend(hostId: string, newManagerId: string | null) {
    const db = getAdminFirestore();
    
    let oldManagerId: string | null = null;
    const hostSnap = await withTimeout(db.collection('host').doc(hostId).get(), 3000);
    if (hostSnap.exists) {
      const hostData = hostSnap.data()!;
      oldManagerId = hostData.assignedManagerId || hostData.assigned_manager_poppo_id || null;
    }
    
    let newManagerName = '';
    if (newManagerId) {
      const newManagerSnap = await withTimeout(db.collection('users').doc(newManagerId).get(), 3000);
      if (newManagerSnap.exists) {
        const mgrData = newManagerSnap.data()!;
        newManagerName = mgrData.nickname || mgrData.name || '';
      }
    }
    
    const hostFieldsToUpdate = {
      manager: newManagerName || null,
      assigned_manager: newManagerName || null,
      assigned_manager_nickname: newManagerName || null,
      assigned_manager_poppo_id: newManagerId || null,
      assignedManagerId: newManagerId || null,
      updated_at: new Date().toISOString()
    };
    
    const batch = db.batch();
    batch.set(db.collection('users').doc(hostId), { updated_at: hostFieldsToUpdate.updated_at }, { merge: true });
    batch.set(db.collection('host').doc(hostId), hostFieldsToUpdate, { merge: true });
    await withTimeout(batch.commit(), 4000);
    
    if (newManagerId) {
      await updateManagerHostFieldsBackend(newManagerId, hostId, null);
    }
    if (oldManagerId && oldManagerId !== newManagerId) {
      await updateManagerHostFieldsBackend(oldManagerId, null, hostId);
    }
  }

  // Middleware to restrict roster panel access
  async function verifyHeadAdminOrDirector(req: any, res: any, next: any) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Access Denied: Missing or malformed Authorization Bearer header." });
    }
    const token = authHeader.split("Bearer ")[1];
    try {
      const decodedToken = jwt.verify(token, JWT_SECRET) as any;
      
      const db = getAdminFirestore();
      const poppoId = decodedToken.poppo_id || decodedToken.uid;
      let role = String(decodedToken.role || "").toLowerCase();
      
      try {
        const userDoc = await withTimeout(db.collection("users").doc(poppoId).get(), 3000);
        if (userDoc.exists) {
          role = String(userDoc.data()?.role || "").toLowerCase();
        }
      } catch (dbErr: any) {
        console.warn("verifyHeadAdminOrDirector Firestore lookup failed, falling back to token claims:", dbErr.message || dbErr);
      }
      
      const isDirector = role === "director" || decodedToken.isSuperAdmin === true;
      const isHeadAdmin = role === "head admin" || role === "head_admin";
      
      if (!isDirector && !isHeadAdmin) {
        return res.status(403).json({ error: "Forbidden: Only Head Admins or Directors can perform this action." });
      }
      
      req.user = decodedToken;
      req.userRole = role;
      next();
    } catch (error: any) {
      console.error("verifyHeadAdminOrDirector failed:", error.message);
      return res.status(401).json({ error: "Access Denied: Invalid or expired token." });
    }
  }

  // 1. GET user by search
  app.get("/api/roster-management/search", verifyHeadAdminOrDirector, async (req, res) => {
    try {
      const queryStr = String(req.query.query || "").toLowerCase().trim();
      const db = getAdminFirestore();
      
      let users: any[] = [];
      try {
        const snapshot = await withTimeout(db.collection("users").get(), 1500);
        for (const doc of snapshot.docs) {
          const data = doc.data();
          const role = String(data.role || "host").toLowerCase();
          
          // Exclude Director role
          if (role === "director") continue;
          
          const poppoId = doc.id;
          const nickname = String(data.nickname || data.name || "");
          const name = String(data.name || "");
          
          if (queryStr) {
            const match = poppoId.includes(queryStr) || 
                          nickname.toLowerCase().includes(queryStr) || 
                          name.toLowerCase().includes(queryStr);
            if (!match) continue;
          }
          
          users.push({
            poppo_id: poppoId,
            nickname: nickname || name || "Unknown",
            name: name || nickname || "Unknown",
            role: data.role || "host",
            photoUrl: data.photoUrl || data.profile_photo || ""
          });
        }
      } catch (dbErr) {
        console.warn("Firestore collection query failed, using static fallback:", dbErr);
      }
      
      if (users.length === 0) {
        const staticHosts = getStaticHosts();
        for (const host of staticHosts) {
          const role = String(host.role || "host").toLowerCase();
          if (role === "director") continue;
          
          const poppoId = host.id;
          const nickname = String(host.nickname || host.name || "");
          const name = String(host.name || "");
          
          if (queryStr) {
            const match = poppoId.includes(queryStr) || 
                          nickname.toLowerCase().includes(queryStr) || 
                          name.toLowerCase().includes(queryStr);
            if (!match) continue;
          }
          
          users.push({
            poppo_id: poppoId,
            nickname: nickname || name || "Unknown",
            name: name || nickname || "Unknown",
            role: host.role || "host",
            photoUrl: host.photoUrl || ""
          });
        }
      }
      
      return res.json(users);
    } catch (err: any) {
      console.error("Search endpoint failed:", err);
      return res.status(500).json({ error: err.message || "Search failed." });
    }
  });

  // 1b. GET detailed user details
  app.get("/api/roster-management/user/:poppoId", verifyHeadAdminOrDirector, async (req: any, res) => {
    try {
      const { poppoId } = req.params;
      const db = getAdminFirestore();
      
      let userData: any = null;
      let userDocExists = false;
      try {
        const userDoc = await withTimeout(db.collection("users").doc(poppoId).get(), 3000);
        if (userDoc.exists) {
          userData = userDoc.data()!;
          userDocExists = true;
        }
      } catch (dbErr) {
        console.warn("Firestore lookup failed for details, using static fallback:", dbErr);
      }
      
      if (!userData) {
        const staticHosts = getStaticHosts();
        const staticHost = staticHosts.find(h => String(h.id) === String(poppoId));
        if (!staticHost) {
          return res.status(404).json({ error: "User not found" });
        }
        userData = {
          role: staticHost.role,
          name: staticHost.name,
          nickname: staticHost.nickname,
          poppo_id: staticHost.id,
          level: staticHost.level,
          status: staticHost.status,
          manager: staticHost.manager,
          team: staticHost.team
        };
      }
      
      const role = String(userData.role || "host").toLowerCase();
      
      if (role === "director" && req.userRole !== "director") {
        return res.status(403).json({ error: "Access to Director data is restricted." });
      }
      
      let collectionName = "host";
      if (role === "admin") collectionName = "admin";
      else if (role === "manager") collectionName = "manager";
      else if (role === "agent") collectionName = "agent";
      else if (role === "head admin" || role === "head_admin") collectionName = "head_admin";
      
      let roleData: any = {};
      if (userDocExists) {
        try {
          const roleDoc = await withTimeout(db.collection(collectionName).doc(poppoId).get(), 3000);
          roleData = roleDoc.exists ? roleDoc.data() : {};
        } catch (roleErr) {
          console.warn("Firestore lookup failed for role document:", roleErr);
        }
      }
      
      const mergedData = {
        ...roleData,
        ...userData,
        poppo_id: poppoId,
        role: userData.role || "Host"
      };
      
      return res.json(mergedData);
    } catch (err: any) {
      console.error("Get user details failed:", err);
      return res.status(500).json({ error: err.message || "Failed to fetch user details." });
    }
  });

  // 2. PATCH update user fields
  app.patch("/api/roster-management/update", verifyHeadAdminOrDirector, async (req: any, res) => {
    try {
      const { poppo_id, role, ...updateFields } = req.body;
      if (!poppo_id || !role) {
        return res.status(400).json({ error: "poppo_id and role are required." });
      }
      
      const db = getAdminFirestore();
      const cleanId = String(poppo_id).trim();
      const userRole = String(role).trim();
      
      if (userRole.toLowerCase() === "director" && req.userRole !== "director") {
        return res.status(403).json({ error: "Only Directors can edit Director accounts." });
      }

      let collectionName = "host";
      const roleLower = userRole.toLowerCase();
      if (roleLower === "admin") collectionName = "admin";
      else if (roleLower === "manager") collectionName = "manager";
      else if (roleLower === "agent") collectionName = "agent";
      else if (roleLower === "head admin" || roleLower === "head_admin") collectionName = "head_admin";
      else if (roleLower === "director") collectionName = "director";
      
      const baseData: any = {
        ...updateFields,
        updated_at: new Date().toISOString()
      };
      
      const teamAnchor = baseData.teamAnchor || baseData.team || baseData.team_anchor || "";
      if (teamAnchor) {
        baseData.teamAnchor = teamAnchor;
        baseData.team = teamAnchor;
        baseData.team_anchor = teamAnchor;
      }
      
      const managerName = baseData.manager || baseData.assigned_manager || baseData.assigned_manager_nickname || "";
      const managerId = baseData.assignedManagerId || baseData.assigned_manager_poppo_id || "";
      if (managerName) {
        baseData.manager = managerName;
        baseData.assigned_manager = managerName;
        baseData.assigned_manager_nickname = managerName;
      }
      if (managerId) {
        baseData.assignedManagerId = managerId;
        baseData.assigned_manager_poppo_id = managerId;
      }
      
      const tierPay = baseData.tier_pay || baseData.tierPay || baseData.base_salary_category || "";
      if (tierPay) {
        baseData.tier_pay = tierPay;
      }

      const batch = db.batch();
      
      const roleDocRef = db.collection(collectionName).doc(cleanId);
      batch.set(roleDocRef, baseData, { merge: true });
      
      const userUpdate: any = {
        updated_at: baseData.updated_at
      };
      if (baseData.nickname !== undefined) userUpdate.nickname = baseData.nickname;
      if (baseData.name !== undefined) userUpdate.name = baseData.name;
      if (baseData.photoUrl !== undefined) userUpdate.photoUrl = baseData.photoUrl;
      if (baseData.profile_photo !== undefined) userUpdate.photoUrl = baseData.profile_photo;
      if (baseData.status !== undefined) userUpdate.status = baseData.status;
      if (baseData.teamAnchor !== undefined) userUpdate.teamAnchor = baseData.teamAnchor;
      if (baseData.level !== undefined) userUpdate.level = baseData.level;
      
      const userDocRef = db.collection("users").doc(cleanId);
      batch.set(userDocRef, userUpdate, { merge: true });
      
      await withTimeout(batch.commit(), 4000);
      
      if (roleLower === "host" && managerId !== undefined) {
        await syncHostManagerRelationshipBackend(cleanId, managerId || null);
      }
      
      return res.json({ success: true, message: "User updated successfully." });
    } catch (err: any) {
      console.error("Update fields failed:", err);
      return res.status(500).json({ error: err.message || "Failed to update user." });
    }
  });

  // 3. PATCH assign host
  app.patch("/api/roster-management/assign-host", verifyHeadAdminOrDirector, async (req, res) => {
    try {
      const { manager_id, host_id, action } = req.body;
      if (!manager_id || !host_id || !action) {
        return res.status(400).json({ error: "manager_id, host_id, and action are required." });
      }
      
      if (action === "assign") {
        await syncHostManagerRelationshipBackend(host_id, manager_id);
      } else if (action === "unassign") {
        await syncHostManagerRelationshipBackend(host_id, null);
      } else {
        return res.status(400).json({ error: "Invalid action. Must be 'assign' or 'unassign'." });
      }
      
      return res.json({ success: true, message: `Host successfully ${action}ed.` });
    } catch (err: any) {
      console.error("Assign host failed:", err);
      return res.status(500).json({ error: err.message || "Failed to assign host." });
    }
  });

  // 4. PATCH change role
  app.patch("/api/roster-management/change-role", verifyHeadAdminOrDirector, async (req: any, res) => {
    try {
      const { poppo_id, old_role, new_role } = req.body;
      if (!poppo_id || !old_role || !new_role) {
        return res.status(400).json({ error: "poppo_id, old_role, and new_role are required." });
      }

      const cleanId = String(poppo_id).trim();
      const oldRole = String(old_role).trim();
      const newRole = String(new_role).trim();

      if ((oldRole.toLowerCase() === "director" || newRole.toLowerCase() === "director") && req.userRole !== "director") {
        return res.status(403).json({ error: "Forbidden: Only Directors can change Director roles." });
      }

      const db = getAdminFirestore();

      const oldNormRole = normalizeRoleTypographyBackend(oldRole);
      const newNormRole = normalizeRoleTypographyBackend(newRole);
      
      const oldRoleCol = getSafeRoleCollectionBackend(oldNormRole);
      const newRoleCol = getSafeRoleCollectionBackend(newNormRole);

      let docData: any = {};
      if (oldRoleCol !== newRoleCol) {
        const oldDocRef = db.collection(oldRoleCol).doc(cleanId);
        const oldDocSnap = await withTimeout(oldDocRef.get(), 3000);
        if (oldDocSnap.exists) {
          docData = oldDocSnap.data()!;
          await withTimeout(oldDocRef.delete(), 3000);
        }
        
        docData.role = newNormRole;
        docData.updated_at = new Date().toISOString();

        const newDocRef = db.collection(newRoleCol).doc(cleanId);
        await withTimeout(newDocRef.set(docData, { merge: true }), 3000);
      }

      await withTimeout(db.collection("users").doc(cleanId).update({
        role: newNormRole,
        updated_at: new Date().toISOString()
      }), 3000);

      const userSnap = await withTimeout(db.collection("users").doc(cleanId).get(), 3000);
      const tempPasswordRequired = userSnap.exists ? (userSnap.data()?.is_temp_password || false) : false;
      await syncCustomClaims(cleanId, newNormRole, tempPasswordRequired);

      return res.json({ success: true, message: `Role changed successfully from ${oldRole} to ${newRole}.` });
    } catch (err: any) {
      console.error("Change role failed:", err);
      return res.status(500).json({ error: err.message || "Failed to change role." });
    }
  });

  // 5. PATCH reset login state
  app.patch("/api/users/reset-login", verifyHeadAdminOrDirector, async (req, res) => {
    try {
      const { poppo_id, is_first_time } = req.body;
      if (!poppo_id) {
        return res.status(400).json({ error: "poppo_id is required." });
      }
      if (is_first_time !== true) {
        return res.status(400).json({ error: "is_first_time must be true." });
      }
      
      const db = getAdminFirestore();
      const cleanId = String(poppo_id).trim();
      
      const userDocRef = db.collection("users").doc(cleanId);
      const userDocSnap = await withTimeout(userDocRef.get(), 3000);
      if (!userDocSnap.exists) {
        return res.status(404).json({ error: "User not found." });
      }

      await withTimeout(userDocRef.update({
        is_first_time: true,
        updated_at: new Date().toISOString()
      }), 4000);

      console.log(`🔄 Reset login state for Poppo ID: ${cleanId}`);
      return res.json({ success: true, message: "Reset login state successful." });
    } catch (err: any) {
      console.error("Reset login state endpoint failed:", err);
      return res.status(500).json({ error: err.message || "Failed to reset login state." });
    }
  });

  // 6. POST send push notification to user
  app.post("/api/push/send-to-user", verifyHeadAdminOrDirector, async (req, res) => {
    try {
      const { poppo_id, title, body, url } = req.body;
      if (!poppo_id || !title || !body) {
        return res.status(400).json({ error: "Missing required fields: poppo_id, title, body" });
      }

      const userSubs = pushSubscriptions.filter(sub => String(sub.poppo_id).trim() === String(poppo_id).trim());
      if (userSubs.length === 0) {
        return res.status(404).json({ error: "User has not enabled notifications" });
      }

      const payload = JSON.stringify({
        title,
        body,
        url: url || "/dashboard",
        icon: "/logo.jpg",
        badge: "/logo.jpg"
      });

      let successCount = 0;
      const sendPromises = userSubs.map(async (sub) => {
        try {
          await webpush.sendNotification(sub, payload);
          successCount++;
        } catch (err: any) {
          if (err.statusCode === 410 || err.statusCode === 404) {
            pushSubscriptions = pushSubscriptions.filter(s => s.endpoint !== sub.endpoint);
            saveSubscriptions();
          } else {
            console.error(`Error sending push to ${sub.endpoint}:`, err.message);
          }
        }
      });

      await Promise.all(sendPromises);

      if (successCount === 0) {
        return res.status(404).json({ error: "User has not enabled notifications" });
      }

      res.json({ success: true, message: "Notification sent" });
    } catch (error: any) {
      console.error("Single user push notify error:", error);
      return res.status(500).json({ error: error?.message || "Notification dispatch failed" });
    }
  });

  app.get("/api/health", (req, res) => {
    res.json({
      status: "ok",
      domain: req.headers.host,
      forwardedHost: req.headers['x-forwarded-host'] || req.headers['x-original-host'] || null,
      headers: req.headers
    });
  });

  // Proxy image upload to Google Cloud Storage using service account credentials
  // This completely bypasses Firebase CORS & Storage Rules limitations
  app.post("/api/upload-profile-photo", async (req, res) => {
    try {
      const { fileData, fileName, contentType } = req.body;
      if (!fileData || !fileName) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const privateKey = (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n');
      const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
      const bucketName = process.env.VITE_FIREBASE_STORAGE_BUCKET;

      if (!privateKey || !clientEmail || !bucketName) {
        return res.status(500).json({ error: "Missing Firebase service account credentials" });
      }

      // Authenticate with Google APIs using service account
      const auth = new google.auth.JWT(
        clientEmail,
        undefined,
        privateKey,
        ['https://www.googleapis.com/auth/devstorage.read_write']
      );
      const tokenResponse = await auth.getAccessToken();
      const accessToken = tokenResponse.token;

      if (!accessToken) throw new Error("Failed to obtain GCS access token");

      // Strip base64 data URI prefix and convert to buffer
      const base64Data = fileData.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');
      const objectPath = `profile_photos/${fileName}`;

      // Upload to Google Cloud Storage via REST API
      const uploadUrl = `https://storage.googleapis.com/upload/storage/v1/b/${encodeURIComponent(bucketName)}/o?uploadType=media&name=${encodeURIComponent(objectPath)}&predefinedAcl=publicRead`;

      const uploadResponse = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': contentType || 'image/jpeg',
          'Content-Length': String(buffer.length),
        },
        body: buffer
      });

      if (!uploadResponse.ok) {
        const errText = await uploadResponse.text();
        throw new Error(`GCS upload failed (${uploadResponse.status}): ${errText}`);
      }

      // Construct public URL
      const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(objectPath)}?alt=media`;

      return res.json({ url: publicUrl });
    } catch (error: any) {
      console.error("Profile photo proxy upload error:", error);
      return res.status(500).json({ error: error?.message || "Upload failed" });
    }
  });

  // Register audit router AFTER specific routes so it doesn't intercept them
  app.use("/api", auditRouter);

  app.post("/api/chat", async (req, res) => {
    try {
      const { message } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;

      if (!apiKey) {
        return res.status(500).json({ error: "GEMINI_API_KEY is not configured" });
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: message,
        config: {
          safetySettings: [
            {
              category: "HARM_CATEGORY_HARASSMENT" as any,
              threshold: "BLOCK_LOW_AND_ABOVE" as any,
            },
            {
              category: "HARM_CATEGORY_HATE_SPEECH" as any,
              threshold: "BLOCK_LOW_AND_ABOVE" as any,
            },
            {
              category: "HARM_CATEGORY_SEXUALLY_EXPLICIT" as any,
              threshold: "BLOCK_LOW_AND_ABOVE" as any,
            },
            {
              category: "HARM_CATEGORY_DANGEROUS_CONTENT" as any,
              threshold: "BLOCK_LOW_AND_ABOVE" as any,
            },
          ],
        },
      });

      return res.json({ text: response.text });
    } catch (error: any) {
      console.error("Gemini API error:", error);
      logSystemEvent({
        severity: 'Error',
        actionDescription: 'Gemini API Chat failed',
        stackTrace: error?.stack || error?.message
      });
      return res.status(500).json({ error: error?.message || "Chat failed" });
    }
  });

  app.post("/api/extract-mastersheet", async (req, res) => {
    try {
      const { fileData, mimeType } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;

      if (!apiKey) {
        return res.status(500).json({ error: "GEMINI_API_KEY is not configured" });
      }

      if (!fileData || !mimeType) {
        return res.status(400).json({ error: "fileData and mimeType are required" });
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });

      const prompt = `
Extract data from this Poppo Live Mastersheet report image or PDF.
Identify the table and extract all rows into a JSON array.

The columns to look for are:
- ID
- Nickname
- Live duration
- Party host duration or Video Duration
- Total earnings of points
- Agent commission or agentweb_commission_earning
- Live earnings
- Party Earnings
- Private chat
- Tips
- Platform reward
- Other Earn
- Platform holding
- Super Salary
- Super Rank
- Level

Map them to:
- poppo_id
- poppo_name
- live_duration
- video_duration
- total_points
- agentweb_commission_earning
- live_earnings
- video_earnings
- private_chat
- tips
- platform_reward
- other_earn
- platform_holding
- super_salary
- super_rank
- level

Rules:
- Numeric values must be numbers, not strings.
- Missing numeric values should be 0.
- Missing text values should be "".
- Return ONLY the raw JSON array.
      `;

      let attempts = 0;
      let extractedData: any[] = [];

      while (attempts < 3) {
        try {
          const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: [
              {
                inlineData: {
                  mimeType,
                  data: fileData,
                },
              },
              { text: prompt },
            ],
            config: {
              responseMimeType: "application/json",
              safetySettings: [
                {
                  category: "HARM_CATEGORY_HARASSMENT" as any,
                  threshold: "BLOCK_LOW_AND_ABOVE" as any,
                },
                {
                  category: "HARM_CATEGORY_HATE_SPEECH" as any,
                  threshold: "BLOCK_LOW_AND_ABOVE" as any,
                },
                {
                  category: "HARM_CATEGORY_SEXUALLY_EXPLICIT" as any,
                  threshold: "BLOCK_LOW_AND_ABOVE" as any,
                },
                {
                  category: "HARM_CATEGORY_DANGEROUS_CONTENT" as any,
                  threshold: "BLOCK_LOW_AND_ABOVE" as any,
                },
              ],
            },
          });

          extractedData = JSON.parse(response.text || "[]");
          break;
        } catch (err: any) {
          attempts += 1;

          const maybeRetryable =
            err?.status === 503 ||
            String(err?.message || "").includes("503") ||
            String(err?.message || "").toLowerCase().includes("high demand");

          if (maybeRetryable && attempts < 3) {
            await new Promise((resolve) => setTimeout(resolve, 2000 * attempts));
            continue;
          }

          throw err;
        }
      }

      return res.json({ data: extractedData });
    } catch (error: any) {
      console.error("Extraction error:", error);
      logSystemEvent({
        severity: 'Error',
        actionDescription: 'Mastersheet Extraction failed',
        stackTrace: error?.stack || error?.message
      });
      return res.status(500).json({ error: error?.message || "Extraction failed" });
    }
  });

  app.post("/api/verify-recaptcha", async (req, res) => {
    try {
      const { token, action } = req.body;

      if (!token) {
        return res.status(400).json({ error: "No reCAPTCHA token provided" });
      }

      const projectId = process.env.FIREBASE_PROJECT_ID || "nine-dashboard-733997";
      const siteKey = "6LfqX-wsAAAAAGeVHsRVuRvGgnT5e_ubHVNZQbvj";
      const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || "";

      if (!apiKey) {
        return res.status(500).json({ error: "GOOGLE_API_KEY is not configured" });
      }

      const verifyUrl = `https://recaptchaenterprise.googleapis.com/v1/projects/${projectId}/assessments?key=${apiKey}`;

      const response = await fetch(verifyUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          event: {
            token,
            expectedAction: action || "login",
            siteKey,
          },
        }),
      });

      const data = await response.json();
      const score = data?.riskAnalysis?.score ?? 0;

      return res.json({
        success: true,
        score,
        valid: score >= 0.5,
        raw: data,
      });
    } catch (error: any) {
      console.error("reCAPTCHA verification error:", error);
      logSystemEvent({
        severity: 'Error',
        actionDescription: 'reCAPTCHA verification failed',
        stackTrace: error?.stack || error?.message
      });
      return res.status(500).json({ error: error?.message || "reCAPTCHA verification failed" });
    }
  });

  app.post("/api/notify", async (req, res) => {
    try {
      const { targetPoppoId, title, body } = req.body;
      if (!targetPoppoId || !title || !body) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const db = getAdminFirestore();
      const userDoc = await db.collection('users').doc(targetPoppoId).get();
      
      if (!userDoc.exists) {
        return res.status(404).json({ error: "User not found" });
      }

      const userData = userDoc.data();
      const fcmTokens = userData?.fcmTokens || [];

      if (fcmTokens.length === 0) {
        return res.status(404).json({ error: "User has no registered devices for notifications" });
      }

      const messaging = getMessaging(getFirebaseAdminApp());
      
      const message = {
        notification: {
          title,
          body
        },
        tokens: fcmTokens
      };

      const response = await messaging.sendEachForMulticast(message);
      
      // Optional: Cleanup invalid tokens based on response.responses
      
      return res.json({ success: true, successCount: response.successCount, failureCount: response.failureCount });
    } catch (error: any) {
      console.error("FCM Notify error:", error);
      return res.status(500).json({ error: error?.message || "Notification dispatch failed" });
    }
  });

  // --- WEB PUSH NOTIFICATION SYSTEM CONFIGURATION & ENDPOINTS ---
  
  const DEFAULT_NOTIFICATION_TYPES = [
    { id: 'booking_request', label: 'Booking Requests', description: 'When a new Livehouse booking request is submitted.', targets: ['director', 'manager'], when: 'immediately', active: true },
    { id: 'pk_report', label: 'PK Reports', description: 'When a host submits a PK battle performance report.', targets: ['director', 'admin'], when: 'immediately', active: true },
    { id: 'fanbase_report', label: 'Fanbase Health Reports', description: 'When a fanbase health status report is submitted.', targets: ['director', 'manager'], when: 'immediately', active: true },
    { id: 'host_sos', label: 'Host SOS Emergency Alerts', description: 'Critical SOS or emergency alerts triggered by hosts.', targets: ['director', 'admin', 'manager'], when: 'immediately', active: true },
    { id: 'roster_update', label: 'Roster Updates', description: 'When a host profile is updated, provisioned, or terminated.', targets: ['director', 'admin'], when: 'immediately', active: true },
    { id: 'commission_upload', label: 'Commission Sheet Uploads', description: 'When new monthly commission sheets are processed and uploaded.', targets: ['host'], when: 'immediately', active: true }
  ];

  const VAPID_KEYS_FILE = path.join(__dirname, "vapid_keys_fallback.json");
  let vapidPublicKey = process.env.VAPID_PUBLIC_KEY || "";
  let vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || "";

  if (!vapidPublicKey || !vapidPrivateKey) {
    if (fs.existsSync(VAPID_KEYS_FILE)) {
      try {
        const savedKeys = JSON.parse(fs.readFileSync(VAPID_KEYS_FILE, "utf8"));
        vapidPublicKey = savedKeys.publicKey;
        vapidPrivateKey = savedKeys.privateKey;
      } catch (e) {
        console.error("Failed to parse saved VAPID keys fallback:", e);
      }
    }

    if (!vapidPublicKey || !vapidPrivateKey) {
      try {
        const generated = webpush.generateVAPIDKeys();
        vapidPublicKey = generated.publicKey;
        vapidPrivateKey = generated.privateKey;
        fs.writeFileSync(VAPID_KEYS_FILE, JSON.stringify(generated), "utf8");
        console.log("=== DYNAMIC FALLBACK VAPID KEYS GENERATED & PERSISTED ===");
        console.log("Public Key:", vapidPublicKey);
        console.log("=========================================================");
      } catch (err) {
        console.error("Failed to dynamically generate VAPID keys. Ensure web-push is installed.");
      }
    }
  }

  if (vapidPublicKey && vapidPrivateKey) {
    try {
      webpush.setVapidDetails(
        "mailto:admin@9poppo.com",
        vapidPublicKey,
        vapidPrivateKey
      );
    } catch (err: any) {
      console.error("Failed to set VAPID details:", err.message);
    }
  }

  const SUBSCRIPTIONS_FILE = path.join(__dirname, "push_subscriptions.json");
  const NOTIFICATION_TYPES_FILE = path.join(__dirname, "notification_types.json");

  // Load Push Subscriptions
  let pushSubscriptions: any[] = [];
  if (fs.existsSync(SUBSCRIPTIONS_FILE)) {
    try {
      pushSubscriptions = JSON.parse(fs.readFileSync(SUBSCRIPTIONS_FILE, "utf8"));
    } catch (e) {
      console.error("Failed to read push subscriptions file:", e);
    }
  }

  // Load or Initialize Notification Types
  let notificationTypes = [...DEFAULT_NOTIFICATION_TYPES];
  if (fs.existsSync(NOTIFICATION_TYPES_FILE)) {
    try {
      const loaded = JSON.parse(fs.readFileSync(NOTIFICATION_TYPES_FILE, "utf8"));
      notificationTypes = DEFAULT_NOTIFICATION_TYPES.map(def => {
        const found = loaded.find((l: any) => l.id === def.id);
        return found ? {
          ...def,
          active: found.active !== undefined ? found.active : def.active,
          targets: found.targets || def.targets,
          when: found.when || def.when
        } : def;
      });
    } catch (e) {
      console.error("Failed to read notification types file:", e);
    }
  }

  function saveSubscriptions() {
    try {
      fs.writeFileSync(SUBSCRIPTIONS_FILE, JSON.stringify(pushSubscriptions, null, 2), "utf8");
    } catch (e) {
      console.error("Failed to save push subscriptions:", e);
    }
  }

  function saveNotificationTypes() {
    try {
      fs.writeFileSync(NOTIFICATION_TYPES_FILE, JSON.stringify(notificationTypes, null, 2), "utf8");
    } catch (e) {
      console.error("Failed to save notification types:", e);
    }
  }

  // 1) GET VAPID Public Key
  app.get("/api/push/public-key", (req, res) => {
    res.json({ publicKey: vapidPublicKey });
  });

  // 2) POST /api/push/subscribe
  app.post("/api/push/subscribe", async (req, res) => {
    const { subscription, poppo_id } = req.body;
    const subObj = subscription || req.body;
    const poppoId = poppo_id || null;
    
    if (!subObj || !subObj.endpoint) {
      return res.status(400).json({ error: "Invalid subscription payload" });
    }
    
    const index = pushSubscriptions.findIndex(sub => sub.endpoint === subObj.endpoint);
    if (index > -1) {
      if (poppoId) {
        pushSubscriptions[index].poppo_id = poppoId;
        saveSubscriptions();
      }
    } else {
      pushSubscriptions.push({
        ...subObj,
        poppo_id: poppoId
      });
      saveSubscriptions();
    }
    
    // Clear director request if registered
    if (poppoId) {
      const db = getAdminFirestore();
      try {
        await db.collection("users").doc(poppoId).update({ notificationRequestedByDirector: false });
      } catch (err: any) {
        console.warn(`Failed to clear notificationRequestedByDirector for user ${poppoId}:`, err.message);
      }
    }
    
    res.status(201).json({ status: "success", message: "Subscription registered." });
  });

  // 3) POST /api/push/send
  app.post("/api/push/send", async (req, res) => {
    const { title, body, url, type } = req.body;
    
    if (!title || !body || !type) {
      return res.status(400).json({ error: "Missing title, body, or type fields" });
    }

    const notifType = notificationTypes.find(t => t.id === type);
    if (!notifType || !notifType.active) {
      return res.json({ 
        status: "ignored", 
        message: `Notification type '${type}' is currently inactive.` 
      });
    }

    const payload = JSON.stringify({
      title,
      body,
      url: url || "/dashboard",
      icon: "/logo.jpg",
      badge: "/logo.jpg"
    });

    const sendPromises = pushSubscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(sub, payload);
      } catch (err: any) {
        if (err.statusCode === 410 || err.statusCode === 404) {
          pushSubscriptions = pushSubscriptions.filter(s => s.endpoint !== sub.endpoint);
          saveSubscriptions();
        } else {
          console.error(`Error sending push to ${sub.endpoint}:`, err.message);
        }
      }
    });

    await Promise.all(sendPromises);
    res.json({ 
      status: "success", 
      message: `Notification sent to active subscribers. Total active subscriptions: ${pushSubscriptions.length}` 
    });
  });

  // 4) PATCH /api/notifications/update-rule
  app.patch("/api/notifications/update-rule", verifyHeadAdminOrDirector, (req, res) => {
    const { id, active, targets, when } = req.body;
    if (!id) {
      return res.status(400).json({ error: "Missing rule ID" });
    }
    
    const rule = notificationTypes.find(t => t.id === id);
    if (!rule) {
      return res.status(404).json({ error: "Notification type not found" });
    }
    
    if (active !== undefined) rule.active = active;
    if (targets !== undefined) rule.targets = targets;
    if (when !== undefined) rule.when = when;
    
    saveNotificationTypes();
    res.json({ status: "success", item: rule });
  });

  // 5) GET /api/notifications
  app.get("/api/notifications", (req, res) => {
    res.json(notificationTypes);
  });

  // 6) GET /api/notifications/users
  app.get("/api/notifications/users", verifyHeadAdminOrDirector, async (req, res) => {
    try {
      const db = getAdminFirestore();
      const snapshot = await withTimeout(db.collection("users").get(), 3000);
      
      const usersList = snapshot.docs.map(doc => {
        const data = doc.data();
        const poppoId = doc.id;
        
        // Check VAPID subscription status
        const hasWebPush = pushSubscriptions.some(sub => String(sub.poppo_id).trim() === String(poppoId).trim());
        
        // Check FCM token status
        const fcmTokens = data.fcmTokens || [];
        const hasFcm = Array.isArray(fcmTokens) && fcmTokens.length > 0;
        
        return {
          poppoId,
          nickname: data.nickname || data.name || "",
          role: data.role || "host",
          hasWebPush,
          hasFcm,
          hasAllowed: hasWebPush || hasFcm,
          notificationRequestedByDirector: data.notificationRequestedByDirector === true
        };
      });
      
      return res.json(usersList);
    } catch (error: any) {
      console.error("Failed to get notification users:", error);
      return res.status(500).json({ error: error?.message || "Internal server error" });
    }
  });

  // 7) POST /api/notifications/request-device
  app.post("/api/notifications/request-device", verifyHeadAdminOrDirector, async (req, res) => {
    try {
      const { targetPoppoId } = req.body;
      if (!targetPoppoId) {
        return res.status(400).json({ error: "Missing targetPoppoId" });
      }
      
      const db = getAdminFirestore();
      const userRef = db.collection("users").doc(targetPoppoId);
      const userSnap = await userRef.get();
      if (!userSnap.exists) {
        return res.status(404).json({ error: "User not found" });
      }
      
      await userRef.update({ notificationRequestedByDirector: true });
      return res.json({ status: "success", message: `Device notification request sent to user ${targetPoppoId}` });
    } catch (error: any) {
      console.error("Failed to send notification request:", error);
      return res.status(500).json({ error: error?.message || "Internal server error" });
    }
  });

  const isDev = process.env.NODE_ENV !== 'production';
  console.log(`\n🔧 Mode: ${isDev ? 'DEVELOPMENT (Vite middleware)' : 'PRODUCTION (static dist)'}\n`);

  if (isDev) {
    // Auto-find a free HMR port so Vite never crashes on 24678 being in use
    const hmrPort = await findFreePort(24678);
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: { port: hmrPort } },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Auto-find a free main port — never crash on EADDRINUSE
  const freePort = await findFreePort(PORT);
  if (freePort !== PORT) {
    console.warn(`⚠️  Port ${PORT} is in use — using port ${freePort} instead.`);
  }
  app.listen(freePort, "0.0.0.0", () => {
    console.log(`\n✅ Dev server running at: \x1b[36mhttp://localhost:${freePort}\x1b[0m\n`);
  });
}

startServer();
// Trigger VAPID regeneration check