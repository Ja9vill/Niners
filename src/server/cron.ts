import { getAdminFirestore } from "./auth";
import { FieldValue } from "firebase-admin/firestore";
import { logSystemEvent } from "./Logger";
import { google } from "googleapis";

// Lock acquisition to prevent multiple Cloud Run instances from running the same job
async function acquireLock(jobName: string, intervalMinutes: number): Promise<boolean> {
  const db = getAdminFirestore();
  const lockRef = db.collection("system").doc("cron_state");
  
  try {
    return await db.runTransaction(async (transaction) => {
      const doc = await transaction.get(lockRef);
      const now = Date.now();
      
      if (!doc.exists) {
        transaction.set(lockRef, { [jobName]: now });
        return true;
      }
      
      const data = doc.data() || {};
      const lastRun = data[jobName] || 0;
      
      // Allow execution if it has been at least (interval - 1 minute)
      const intervalMs = (intervalMinutes * 60 * 1000) - 60000; 
      
      if (now - lastRun < intervalMs) {
        return false; // Already executed recently by another instance
      }
      
      transaction.update(lockRef, { [jobName]: now });
      return true;
    });
  } catch (error) {
    console.error(`Failed to acquire lock for ${jobName}:`, error);
    return false;
  }
}

// 1. Auto Sync Livehouse Data
export async function runAutoSyncLivehouseData(ignoreLock = false) {
  if (!ignoreLock && !(await acquireLock('autoSyncLivehouseData', 15))) return;

  const API_URL = "https://script.google.com/macros/s/AKfycbxI-gtTa_gjoBHJZIZ1k7XYkXsEomPhBYi6oweGi_9_4GLC8YloEs72IOCj89EKBrQsfw/exec";
  const db = getAdminFirestore();
  
  try {
    const response = await fetch(API_URL);
    const data = await response.json();

    if (!data || data.status === "error" || !Array.isArray(data)) {
      console.warn("Livehouse auto-sync aborted: Invalid or error data returned from Apps Script.", data);
      return;
    }

    const scheduleRows = data as any[];
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
    
    const path = "livehouse_schedule";
    const snap = await db.collection(path).get();
    
    const oldSchedule = new Map<string, any>();
    for (const d of snap.docs) {
      oldSchedule.set(d.id, d.data());
      batch.delete(d.ref);
      batchCount++;
      await commitBatchIfNeeded();
    }

    const validCalendarEventIds: string[] = [];
    const logsRef = db.collection("livehouse_logs");

    for (const r of scheduleRows) {
      if (!r.date || !r.timeslot) continue;
      
      const docId = `${r.date}_${r.timeslot}`.replace(/[^a-zA-Z0-9_-]/g, "_");
      
      const oldRow = oldSchedule.get(docId);
      
      const newSlot1 = String(r.slot_1?.poppo_id || "").trim();
      const oldSlot1 = String(oldRow?.slot_1?.poppo_id || "").trim();
      
      if (newSlot1 && newSlot1 !== oldSlot1) {
        const logDocRef = logsRef.doc();
        batch.set(logDocRef, {
          poppo_id: newSlot1,
          date: r.date,
          timeslot: r.timeslot,
          timestamp: FieldValue.serverTimestamp(),
          source: 'auto-sync'
        });
        batchCount++;
        await commitBatchIfNeeded();
      }
      
      const newSlot2 = String(r.slot_2?.poppo_id || "").trim();
      const oldSlot2 = String(oldRow?.slot_2?.poppo_id || "").trim();
      
      if (newSlot2 && newSlot2 !== oldSlot2) {
        const logDocRef = logsRef.doc();
        batch.set(logDocRef, {
          poppo_id: newSlot2,
          date: r.date,
          timeslot: r.timeslot,
          timestamp: FieldValue.serverTimestamp(),
          source: 'auto-sync'
        });
        batchCount++;
        await commitBatchIfNeeded();
      }

      const docRef = db.collection(path).doc(docId);
      batch.set(docRef, r);
      batchCount++;
      await commitBatchIfNeeded();
    }
    
    // Save the global last synced timestamp
    const syncStatusRef = db.collection("system").doc("livehouse_sync");
    batch.set(syncStatusRef, {
      last_synced_at: FieldValue.serverTimestamp(),
      last_synced_iso: new Date().toISOString()
    }, { merge: true });
    batchCount++;
    await commitBatchIfNeeded();

    if (batchCount > 0) {
      await batch.commit();
    }
    
    console.log(`Successfully completed automated Livehouse sync! Extracted ${scheduleRows.length} timeslots.`);
  } catch (err) {
    console.error("Failed to execute autoSyncLivehouseData:", err);
  }
}

// Helper to parse Manila time to UTC
function parseManilaTimeToUTC(dateStr: string, timeStr: string): number {
  try {
    const timeMatch = timeStr.match(/(\d{1,2}):(\d{2})\s+(AM|PM)/i);
    if (!timeMatch) return 0;
    
    let hours = parseInt(timeMatch[1], 10);
    const minutes = parseInt(timeMatch[2], 10);
    const ampm = timeMatch[3].toUpperCase();
    
    if (ampm === "PM" && hours < 12) hours += 12;
    if (ampm === "AM" && hours === 12) hours = 0;
    
    const paddedHours = hours.toString().padStart(2, '0');
    const paddedMinutes = minutes.toString().padStart(2, '0');
    
    const isoString = `${dateStr}T${paddedHours}:${paddedMinutes}:00+08:00`;
    const eventDate = new Date(isoString);
    
    return eventDate.getTime();
  } catch (e) {
    return 0;
  }
}

// 2. Check Upcoming Events (Every 5 minutes)
async function runCheckUpcomingEvents() {
  if (!(await acquireLock('checkUpcomingEvents', 5))) return;

  const db = getAdminFirestore();
  const now = Date.now();
  
  try {
    const calendarRef = db.collection("calendar");
    const snapshot = await calendarRef.where("notifiedStart", "!=", true).get();
      
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

      // 30-minute warning
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
      
      // Event Start warning
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
}

// 3. Cleanup Old System Logs (Every 24 hours)
async function runCleanupOldSystemLogs() {
  if (!(await acquireLock('cleanupOldSystemLogs', 24 * 60))) return;

  const db = getAdminFirestore();
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
    
    if (deletedCount > 0) {
      console.log(`Successfully deleted ${deletedCount} old system_logs.`);
    }
  } catch (err) {
    console.error("Failed to clean up old system_logs:", err);
  }
}

// Bootstrapper to start all cron jobs in the background
export function startCronJobs() {
  console.log("Starting backend cron jobs...");
  
  // Run once immediately on startup
  runAutoSyncLivehouseData().catch(console.error);
  runCheckUpcomingEvents();
  runCleanupOldSystemLogs();
  
  // Schedule intervals
  setInterval(runAutoSyncLivehouseData, 15 * 60 * 1000); // 15 mins
  setInterval(runCheckUpcomingEvents, 5 * 60 * 1000); // 5 mins
  setInterval(runCleanupOldSystemLogs, 24 * 60 * 60 * 1000); // 24 hours
}
