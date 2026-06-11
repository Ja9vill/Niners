import { onCall, HttpsError, type CallableRequest } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { getAuth } from "firebase-admin/auth";
import { initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

// Initialize Firebase Admin SDK
initializeApp();

// Strongly typed input request format
interface AuthenticatePoppoRequest {
  poppoId: string;
  password: string;
}

// Strongly typed output response format
interface AuthenticatePoppoResponse {
  customToken: string;
}

/**
 * Mock database verification helper.
 * Replace this with a secure database lookup (e.g. Firestore query) 
 * and compare passwords using bcrypt or scrypt.
 */
async function verifyPoppoCredentials(poppoId: string, password: string): Promise<boolean> {
  // In production: fetch user from Firestore and verify hashed password
  if (poppoId === "test-host" && password === "secure-password") {
    return true;
  }
  return false;
}

/**
 * 2nd-Gen HTTPS Callable Cloud Function for custom Poppo ID authentication.
 */
export const authenticatePoppoUser = onCall(
  async (request: CallableRequest<AuthenticatePoppoRequest>): Promise<AuthenticatePoppoResponse> => {
    const { data } = request;

    // 1. Input validation & type checks
    if (!data || typeof data.poppoId !== "string" || typeof data.password !== "string") {
      throw new HttpsError(
        "invalid-argument",
        "The function must be called with valid 'poppoId' and 'password' strings."
      );
    }

    const poppoId = data.poppoId.trim();
    const password = data.password.trim();

    if (poppoId.length === 0 || password.length === 0) {
      throw new HttpsError(
        "invalid-argument",
        "Poppo ID and password cannot be empty values."
      );
    }

    // 2. Validate credentials against target authentication store
    let isCredentialValid = false;
    try {
      isCredentialValid = await verifyPoppoCredentials(poppoId, password);
    } catch (dbError: any) {
      console.error("Database lookup error during credential validation:", dbError.message || dbError);
      throw new HttpsError(
        "internal",
        "An internal database lookup error occurred. Please try again later."
      );
    }

    if (!isCredentialValid) {
      throw new HttpsError(
        "unauthenticated",
        "Authentication failed. Invalid Poppo ID or password."
      );
    }

    // 3. Mint custom Firebase Auth Token
    try {
      const auth = getAuth();
      const customToken = await auth.createCustomToken(poppoId);
      
      return { customToken };
    } catch (tokenError: any) {
      // Log full stack trace internally, hide internal SDK details from client
      console.error(`Failed to generate custom token for UID ${poppoId}:`, tokenError.message || tokenError);
      throw new HttpsError(
        "internal",
        "Failed to generate session token. Please contact site administrators."
      );
    }
  }
);

/**
 * Scheduled function to automatically delete system_logs older than 30 days.
 * Runs every day at midnight (UTC).
 */
export const cleanupOldSystemLogs = onSchedule("every day 00:00", async (event) => {
  const db = getFirestore();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const cutoffTimestamp = thirtyDaysAgo.toISOString();

  try {
    const logsRef = db.collection("system_logs");
    const oldLogsQuery = logsRef.where("timestamp", "<", cutoffTimestamp).limit(500);
    
    let deletedCount = 0;
    while (true) {
      const snapshot = await oldLogsQuery.get();
      if (snapshot.empty) break;

      const batch = db.batch();
      snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });
      await batch.commit();
      deletedCount += snapshot.size;
    }
    
    console.log(`Successfully deleted ${deletedCount} old system_logs.`);
  } catch (err) {
    console.error("Failed to clean up old system_logs:", err);
  }
});

/**
 * Parses date ("YYYY-MM-DD") and time ("HH:MM AM Manila Time") 
 * to a UTC millisecond timestamp. Manila is UTC+8.
 */
function parseManilaTimeToUTC(dateStr: string, timeStr: string): number {
  try {
    const timeMatch = timeStr.match(/(\d{1,2}):(\d{2})\s+(AM|PM)/i);
    if (!timeMatch) return 0;
    
    let hours = parseInt(timeMatch[1], 10);
    const minutes = parseInt(timeMatch[2], 10);
    const ampm = timeMatch[3].toUpperCase();
    
    if (ampm === "PM" && hours < 12) hours += 12;
    if (ampm === "AM" && hours === 12) hours = 0;
    
    // Parse the date as UTC and apply the Manila offset manually to get accurate UTC timestamp
    // e.g. "2024-06-10T09:00:00.000+08:00"
    const paddedHours = hours.toString().padStart(2, '0');
    const paddedMinutes = minutes.toString().padStart(2, '0');
    
    const isoString = `${dateStr}T${paddedHours}:${paddedMinutes}:00+08:00`;
    const eventDate = new Date(isoString);
    
    return eventDate.getTime();
  } catch (e) {
    return 0;
  }
}

/**
 * Scheduled function to check upcoming events and post announcements.
 * Runs every 5 minutes.
 */
export const checkUpcomingEvents = onSchedule("every 5 minutes", async (event) => {
  const db = getFirestore();
  const now = Date.now();
  
  try {
    const calendarRef = db.collection("calendar");
    // Get events from today and future (or roughly recent) to avoid pulling whole history.
    // We'll pull a reasonable chunk of events that don't have both notified flags set.
    const snapshot = await calendarRef
      .where("notifiedStart", "!=", true)
      .get();
      
    if (snapshot.empty) return;

    const batch = db.batch();
    const announcementsRef = db.collection("announcements");
    let batchCount = 0;

    snapshot.docs.forEach((doc) => {
      const data = doc.data();
      if (!data.date || !data.time) return;

      const eventTimeMs = parseManilaTimeToUTC(data.date, data.time);
      if (eventTimeMs === 0) return;

      const timeDiffMins = (eventTimeMs - now) / (1000 * 60);

      // 30-minute warning (between 25 and 35 mins before event)
      if (!data.notified30Min && timeDiffMins > 0 && timeDiffMins <= 35 && timeDiffMins >= 25) {
        const annRef = announcementsRef.doc();
        batch.set(annRef, {
          title: `Starting in 30 mins: ${data.title || "Upcoming Event"}`,
          content: `${data.title || "The event"} starts in 30 minutes! Show up and support your co-niners. Flag the comment section to help boost their livestream. Remember, all attendance is recorded and impacts your performance scores/ratio!`,
          type: "System",
          priority: "high",
          timestamp: new Date().toISOString(),
          createdAt: FieldValue.serverTimestamp()
        });
        
        batch.update(doc.ref, { notified30Min: true });
        batchCount += 2;
      }
      
      // Event Start warning (between -5 and +5 mins of start)
      if (!data.notifiedStart && timeDiffMins <= 5 && timeDiffMins >= -5) {
        const annRef = announcementsRef.doc();
        batch.set(annRef, {
          title: `Event Starting NOW: ${data.title || "Live Event"}`,
          content: `${data.title || "The event"} is starting right now! Join the stream, drop your comments, and support the agency!`,
          type: "System",
          priority: "urgent",
          timestamp: new Date().toISOString(),
          createdAt: FieldValue.serverTimestamp()
        });
        
        // Also implicitly set notified30Min to true if it somehow missed it
        batch.update(doc.ref, { notifiedStart: true, notified30Min: true });
        batchCount += 2;
      }
    });

    if (batchCount > 0) {
      await batch.commit();
      console.log(`Committed ${batchCount} operations for upcoming events.`);
    }

  } catch (err) {
    console.error("Failed to check upcoming events:", err);
  }
});

/**
 * Scheduled function to automatically sync Livehouse Spreadsheet data.
 * Runs every 15 minutes.
 */
export const autoSyncLivehouseData = onSchedule("every 15 minutes", async (event) => {
  const API_URL = "https://script.google.com/macros/s/AKfycbxM3XxkT30dpaNbVSsUFVlLhSCejbcZcIizqEE1StZpj4nKGGMmMSzN0xn0tmYHQuuwaQ/exec";
  const db = getFirestore();
  
  try {
    const response = await fetch(API_URL);
    const data = await response.json();

    if (!data || data.status === "error" || !Array.isArray(data)) {
      console.warn("Livehouse auto-sync aborted: Invalid or error data returned from Apps Script.", data);
      return;
    }

    const scheduleRows = data as any[];
    
    // Chunk batches because of Firestore's 500 operation limit per batch
    const maxBatchSize = 400;
    let batch = db.batch();
    let batchCount = 0;
    
    const commitBatchIfNeeded = async () => {
      if (batchCount >= maxBatchSize) {
        await batch.commit();
        batch = db.batch();
        batchCount = 0;
      }
    };
    
    // 1. Clear existing Livehouse schedule
    const path = "livehouse_schedule";
    const snap = await db.collection(path).get();
    for (const d of snap.docs) {
      batch.delete(d.ref);
      batchCount++;
      await commitBatchIfNeeded();
    }

    // 2. Set new Livehouse schedule & generate calendar events
    const validCalendarEventIds: string[] = [];

    for (const r of scheduleRows) {
      if (!r.date || !r.timeslot) continue;
      
      const docId = `${r.date}_${r.timeslot}`.replace(/[^a-zA-Z0-9_-]/g, "_");
      const docRef = db.collection(path).doc(docId);
      batch.set(docRef, r);
      batchCount++;
      await commitBatchIfNeeded();
      
      // Auto-generate calendar event for timeslots that have users booked
      const participants = [];
      if (r.slot_1 && r.slot_1.poppo_id) participants.push(String(r.slot_1.poppo_id));
      if (r.slot_2 && r.slot_2.poppo_id) participants.push(String(r.slot_2.poppo_id));
      
      if (participants.length > 0) {
        const calEventId = `auto_lh_${docId}`;
        validCalendarEventIds.push(calEventId);
        
        const calDocRef = db.collection("calendar").doc(calEventId);
        batch.set(calDocRef, {
          id: calEventId,
          event_id: calEventId,
          title: "Livehouse Event",
          type_of_event: "Livehouse",
          type: "Livehouse",
          event_date: r.date,
          date: r.date,
          time: r.timeslot,
          description: "Automated Livehouse Event. Edits to participants will be overwritten by spreadsheet syncs.",
          participants_id: participants,
          participants: participants,
          is_automated: true,
          created_by_id: "system",
          created_by_name: "Auto Sync",
          created_by_role: "system",
          timestamp: new Date().toISOString()
        }, { merge: true });
        batchCount++;
        await commitBatchIfNeeded();
      }
    }
    
    // 3. Clear stale automated calendar events
    const calSnap = await db.collection("calendar").where("is_automated", "==", true).get();
    for (const d of calSnap.docs) {
      if (!validCalendarEventIds.includes(d.id)) {
        batch.delete(d.ref);
        batchCount++;
        await commitBatchIfNeeded();
      }
    }

    if (batchCount > 0) {
      await batch.commit();
    }
    
    console.log(`Successfully completed automated Livehouse sync! Extracted ${scheduleRows.length} timeslots.`);
    
  } catch (err) {
    console.error("Failed to execute autoSyncLivehouseData:", err);
  }
});
