import { Router } from "express";
import admin from "firebase-admin";
import { getAuth } from "firebase-admin/auth";
import { getFirebaseAdminApp, getAdminFirestore } from "./auth";

const router = Router();

// Agent Financial Fields to protect from non-Director modifications
const financialFields = [
  "agentCommission",
  "liveEarnings",
  "partyEarnings",
  "privateChatEarnings",
  "tips",
  "platformReward",
  "otherEarnings",
  "platformHourlySalary",
  "superSalary",
  "superRank",
  "totalEarnings",
  "totalEarningsOfPoints",
  "totalEarningsPast3Months"
];

/**
 * Middleware that extracts and verifies the Firebase ID Token.
 * Attaches decoded token data to req.firebaseUser on success.
 */
async function verifyFirebaseToken(req: any, res: any, next: any) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Access Denied: Missing Authorization Header" });
  }
  const idToken = authHeader.split("Bearer ")[1];
  try {
    const auth = getAuth(getFirebaseAdminApp());
    const decodedToken = await auth.verifyIdToken(idToken);
    req.firebaseUser = decodedToken;
    next();
  } catch (error: any) {
    console.error("Token verification failed:", error.message);
    return res.status(401).json({ error: "Access Denied: Invalid Token" });
  }
}

/**
 * Checks if the role associated with req.firebaseUser.uid is strictly 'Director'.
 */
async function validateFinancialAccess(req: any): Promise<boolean> {
  const uid = req.firebaseUser?.uid;
  if (!uid) return false;
  const db = getAdminFirestore();
  const userDoc = await db.collection("users").doc(uid).get();
  if (!userDoc.exists) return false;
  return userDoc.data()?.role === "Director";
}

// POST: fanbase_reports
router.post("/reports/fanbase", verifyFirebaseToken, async (req: any, res: any) => {
  try {
    const db = getAdminFirestore();
    const uid = req.firebaseUser.uid;
    
    // Look up user details from the database
    const userDoc = await db.collection("users").doc(uid).get();
    if (!userDoc.exists) {
      return res.status(403).json({ error: "Forbidden: User profile not found in users collection" });
    }
    const userData = userDoc.data() || {};
    const nickname = userData.nickname || userData.name || "Unknown";
    const role = userData.role || "Host";
    const roleLower = String(role).toLowerCase();

    const isElevatedStaff = ["admin", "head admin", "head_admin", "director"].includes(roleLower);
    const isManagerAgent = ["manager", "agent"].includes(roleLower);
    const isHostUser = ["host", "talent"].includes(roleLower);

    const {
      fromDate,
      toDate,
      poppoId,
      currentFollowers,
      fanclubSubscribers,
      fanclubGcMembers,
      gcUpdatesHost,
      gcUpdatesFans
    } = req.body;

    // Validation checks for fields in rows 1-3
    if (
      !poppoId ||
      currentFollowers === undefined ||
      fanclubSubscribers === undefined ||
      fanclubGcMembers === undefined
    ) {
      return res.status(403).json({ error: "Forbidden: Missing required fields" });
    }

    if (
      typeof poppoId !== "string" ||
      typeof currentFollowers !== "number" || currentFollowers < 0 ||
      typeof fanclubSubscribers !== "number" || fanclubSubscribers < 0 ||
      typeof fanclubGcMembers !== "number" || fanclubGcMembers < 0
    ) {
      return res.status(403).json({ error: "Forbidden: Invalid field values" });
    }

    // Verify existence of host in database
    const hostDoc = await db.collection("users").doc(poppoId).get();
    if (!hostDoc.exists) {
      return res.status(403).json({ error: "Forbidden: Host profile not found in database" });
    }
    const hostData = hostDoc.data() || {};
    const hostNickname = hostData.nickname || hostData.name || "Unknown";

    // Enforce submission authorization
    if (isHostUser) {
      if (poppoId !== uid) {
        return res.status(403).json({ error: "Forbidden: Hosts can only submit reports for themselves." });
      }
    } else if (isManagerAgent) {
      const hostManagerId = hostData.assignedManagerId || hostData.assigned_manager_poppo_id || null;
      if (String(hostManagerId) !== String(uid)) {
        return res.status(403).json({ error: "Forbidden: You are not the assigned manager for this host." });
      }
    } else if (!isElevatedStaff) {
      return res.status(403).json({ error: "Forbidden: Unauthorized role." });
    }

    let finalFromDate: admin.firestore.Timestamp;
    let finalToDate: admin.firestore.Timestamp;
    let finalGcHost: number;
    let finalGcFans: number;

    if (isElevatedStaff) {
      // Validate that elevated fields are present
      if (!fromDate || !toDate || gcUpdatesHost === undefined || gcUpdatesFans === undefined) {
        return res.status(403).json({ error: "Forbidden: Missing elevated required fields" });
      }
      if (
        typeof gcUpdatesHost !== "number" || gcUpdatesHost < 0 ||
        typeof gcUpdatesFans !== "number" || gcUpdatesFans < 0
      ) {
        return res.status(403).json({ error: "Forbidden: Invalid elevated field values" });
      }
      finalFromDate = admin.firestore.Timestamp.fromDate(new Date(fromDate));
      finalToDate = admin.firestore.Timestamp.fromDate(new Date(toDate));
      finalGcHost = gcUpdatesHost;
      finalGcFans = gcUpdatesFans;
    } else {
      // Overwrite/ignore client input for non-elevated submitters
      finalFromDate = admin.firestore.Timestamp.now();
      finalToDate = admin.firestore.Timestamp.now();
      finalGcHost = 0;
      finalGcFans = 0;
    }

    // Auto-populate all fields and store both camelCase and snake_case schemas for consistency
    const reportData = {
      // camelCase schema
      fromDate: finalFromDate,
      toDate: finalToDate,
      poppoId,
      nickname: hostNickname,
      currentFollowers,
      fanclubSubscribers,
      fanclubGcMembers,
      gcUpdatesHost: finalGcHost,
      gcUpdatesFans: finalGcFans,
      reporterId: uid,
      reporterName: nickname,
      reporterRole: role,
      submittedAt: admin.firestore.Timestamp.now(),

      // snake_case schema (compatible with subcollection / fallback queries)
      from_date: finalFromDate.toDate().toISOString(),
      to_date: finalToDate.toDate().toISOString(),
      poppo_id: poppoId,
      total_followers: currentFollowers,
      fanclub_subscribers: fanclubSubscribers,
      fanclub_gc_members: fanclubGcMembers,
      gc_activity_count_host: finalGcHost,
      gc_activity_count_fans: finalGcFans,
      reporter_id: uid,
      reporter_name: nickname,
      reporter_role: role,
      timestamp: new Date().toISOString()
    };

    const docRef = await db.collection("fanbase_reports").add(reportData);
    return res.json({ ok: true, id: docRef.id });
  } catch (error: any) {
    console.error("Error writing fanbase report:", error);
    return res.status(403).json({ error: error?.message || "Forbidden: Failed to process request" });
  }
});

// POST: pk_reports
router.post("/reports/pk", verifyFirebaseToken, async (req: any, res: any) => {
  try {
    const db = getAdminFirestore();
    const uid = req.firebaseUser.uid;

    const userDoc = await db.collection("users").doc(uid).get();
    if (!userDoc.exists) {
      return res.status(403).json({ error: "Forbidden: User profile not found" });
    }
    const userData = userDoc.data() || {};
    const nickname = userData.nickname || "Unknown";
    const role = userData.role || "Host";

    const {
      fromDate,
      toDate,
      poppoId,
      nickname: inputNickname,
      pkWinPercent,
      pkPoints,
      pkSessions
    } = req.body;

    if (
      !fromDate || !toDate || !poppoId || !inputNickname ||
      pkWinPercent === undefined || pkPoints === undefined || pkSessions === undefined
    ) {
      return res.status(403).json({ error: "Forbidden: Missing required fields" });
    }

    if (
      typeof poppoId !== "string" || typeof inputNickname !== "string" ||
      typeof pkWinPercent !== "number" || pkWinPercent < 0 || pkWinPercent > 100 ||
      typeof pkPoints !== "number" || pkPoints < 0 ||
      typeof pkSessions !== "number" || pkSessions < 0
    ) {
      return res.status(403).json({ error: "Forbidden: Invalid field values" });
    }

    // Auto-populate: ignore any client-sent reporter information
    const reportData = {
      fromDate: admin.firestore.Timestamp.fromDate(new Date(fromDate)),
      toDate: admin.firestore.Timestamp.fromDate(new Date(toDate)),
      poppoId,
      nickname: inputNickname,
      pkWinPercent,
      pkPoints,
      pkSessions,
      reporterId: uid,
      reporterName: nickname,
      reporterRole: role,
      submittedAt: admin.firestore.Timestamp.now()
    };

    const docRef = await db.collection("pk_reports").add(reportData);
    return res.json({ ok: true, id: docRef.id });
  } catch (error: any) {
    console.error("Error writing pk report:", error);
    return res.status(403).json({ error: error?.message || "Forbidden: Failed to process request" });
  }
});

// POST: performance_reports
router.post("/reports/performance", verifyFirebaseToken, async (req: any, res: any) => {
  try {
    const db = getAdminFirestore();
    const uid = req.firebaseUser.uid;

    const userDoc = await db.collection("users").doc(uid).get();
    if (!userDoc.exists) {
      return res.status(403).json({ error: "Forbidden: User profile not found" });
    }

    const {
      poppoId,
      year,
      month,
      periodType,
      fromDate,
      toDate,
      level,
      liveDurationMinutes,
      partyHostDurationMinutes,
      earningsBreakdown
    } = req.body;

    if (
      !poppoId || year === undefined || month === undefined || !periodType ||
      !fromDate || !toDate || level === undefined ||
      liveDurationMinutes === undefined || partyHostDurationMinutes === undefined ||
      !earningsBreakdown
    ) {
      return res.status(403).json({ error: "Forbidden: Missing required fields" });
    }

    if (
      typeof poppoId !== "string" || typeof periodType !== "string" ||
      typeof year !== "number" || typeof month !== "number" || typeof level !== "number" ||
      typeof liveDurationMinutes !== "number" || typeof partyHostDurationMinutes !== "number" ||
      typeof earningsBreakdown !== "object"
    ) {
      return res.status(403).json({ error: "Forbidden: Invalid field values" });
    }

    // Task 2: Validate Financial Access - verify strictly Director if modifying any financial fields
    const isDirectorUser = await validateFinancialAccess(req);
    if (!isDirectorUser) {
      for (const field of financialFields) {
        if (
          earningsBreakdown[field] !== undefined &&
          earningsBreakdown[field] !== null &&
          earningsBreakdown[field] !== 0
        ) {
          return res.status(403).json({ error: "Forbidden: Non-Director users cannot write to Agent Financial Fields." });
        }
      }
    }

    const reportData = {
      poppoId,
      year,
      month,
      periodType,
      fromDate: admin.firestore.Timestamp.fromDate(new Date(fromDate)),
      toDate: admin.firestore.Timestamp.fromDate(new Date(toDate)),
      level,
      liveDurationMinutes,
      partyHostDurationMinutes,
      earningsBreakdown
    };

    const docRef = await db.collection("performance_reports").add(reportData);
    return res.json({ ok: true, id: docRef.id });
  } catch (error: any) {
    console.error("Error writing performance report:", error);
    return res.status(403).json({ error: error?.message || "Forbidden: Failed to process request" });
  }
});

// GET: attendance records (all or filtered by event_id)
router.get("/attendance", verifyFirebaseToken, async (req: any, res: any) => {
  try {
    const db = getAdminFirestore();
    const { event_id } = req.query;

    if (event_id) {
      const docSnap = await db.collection("attendance").doc(String(event_id)).get();
      if (docSnap.exists) {
        return res.json([{ id: docSnap.id, ...docSnap.data() }]);
      }
      const snap = await db.collection("attendance").where("event_id", "==", String(event_id)).get();
      if (!snap.empty) {
        return res.json(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      }
      const snap2 = await db.collection("attendance").where("eventId", "==", String(event_id)).get();
      return res.json(snap2.docs.map(d => ({ id: d.id, ...d.data() })));
    }

    const snap = await db.collection("attendance").get();
    return res.json(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  } catch (error: any) {
    console.error("Error in GET /attendance:", error);
    return res.status(500).json({ error: error?.message || "Internal server error" });
  }
});

// POST: attendance
router.post("/attendance", verifyFirebaseToken, async (req: any, res: any) => {
  try {
    const db = getAdminFirestore();
    const uid = req.firebaseUser.uid;

    const userDoc = await db.collection("users").doc(uid).get();
    if (!userDoc.exists) {
      return res.status(403).json({ error: "Forbidden: User profile not found" });
    }
    const nickname = userDoc.data()?.nickname || "Unknown";

    const {
      eventDate,
      timeslot,
      eventType,
      description,
      participant_ids,
      status,
      actualParticipants,
      adminFeedback,
      attendanceSubmittedBy
    } = req.body;

    if (
      !eventDate || !timeslot || !eventType || !description ||
      !participant_ids || !status || !actualParticipants ||
      adminFeedback === undefined || !attendanceSubmittedBy
    ) {
      return res.status(403).json({ error: "Forbidden: Missing required fields" });
    }

    if (
      typeof timeslot !== "string" || typeof eventType !== "string" ||
      typeof description !== "string" || !Array.isArray(participant_ids) ||
      typeof status !== "string" || !Array.isArray(actualParticipants) ||
      typeof adminFeedback !== "string" || typeof attendanceSubmittedBy !== "object"
    ) {
      return res.status(403).json({ error: "Forbidden: Invalid field values" });
    }

    // Auto-populate: ignore any client-sent createdBy
    const eventData = {
      eventDate: admin.firestore.Timestamp.fromDate(new Date(eventDate)),
      timeslot,
      eventType,
      description,
      participant_ids,
      eventId: req.body.eventId || req.body.event_id || '',
      event_id: req.body.eventId || req.body.event_id || '',
      status,
      actualParticipants,
      adminFeedback,
      createdBy: nickname,
      attendanceSubmittedBy
    };

    const docRef = await db.collection("attendance").add(eventData);
    return res.json({ ok: true, id: docRef.id });
  } catch (error: any) {
    console.error("Error writing attendance:", error);
    return res.status(403).json({ error: error?.message || "Forbidden: Failed to process request" });
  }
});

// GET: Activeness Metrics calculation endpoint applying Exclusion Logic (Task 3)
router.get("/metrics/activeness", verifyFirebaseToken, async (req: any, res: any) => {
  try {
    const db = getAdminFirestore();
    const performanceSnap = await db.collection("performance_reports").get();
    const eventsSnap = await db.collection("attendance").get();
    
    const directorId = "19157913";
    let totalLiveMinutes = 0;
    let totalPartyMinutes = 0;
    let totalReportsCounted = 0;
    let totalEventsCounted = 0;
    let participantCounts = 0;

    // Process performance reports
    performanceSnap.forEach(doc => {
      const data = doc.data();
      // Apply Exclusion logic: If the report contains the Director ID, do not count in Activeness metrics
      if (data.poppoId === directorId || doc.id === "_schema_template") {
        return;
      }
      
      totalLiveMinutes += Number(data.liveDurationMinutes || 0);
      totalPartyMinutes += Number(data.partyHostDurationMinutes || 0);
      totalReportsCounted++;
    });

    // Process events
    eventsSnap.forEach(doc => {
      const data = doc.data();
      if (doc.id === "_schema_template") return;

      // Exclusion logic for events: If event contains Director ID in createdBy or participant_ids, exclude
      const isCreatedByDirector = data.createdBy === directorId || data.createdBy === "Miss Nine";
      const hasDirectorParticipant = Array.isArray(data.participant_ids) && data.participant_ids.includes(directorId);
      
      if (isCreatedByDirector || hasDirectorParticipant) {
        return;
      }

      totalEventsCounted++;
      if (Array.isArray(data.actualParticipants)) {
        participantCounts += data.actualParticipants.length;
      }
    });

    return res.json({
      ok: true,
      metrics: {
        totalLiveMinutes,
        totalPartyMinutes,
        totalReportsCounted,
        totalEventsCounted,
        participantCounts
      }
    });
  } catch (error: any) {
    console.error("Failed to calculate activeness metrics:", error);
    return res.status(500).json({ error: error?.message || "Failed to calculate activeness metrics" });
  }
});

export default router;
