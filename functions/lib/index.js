"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkUpcomingEvents = exports.cleanupOldSystemLogs = exports.authenticatePoppoUser = void 0;
const https_1 = require("firebase-functions/v2/https");
const scheduler_1 = require("firebase-functions/v2/scheduler");
const auth_1 = require("firebase-admin/auth");
const app_1 = require("firebase-admin/app");
const firestore_1 = require("firebase-admin/firestore");
// Initialize Firebase Admin SDK
(0, app_1.initializeApp)();
/**
 * Mock database verification helper.
 * Replace this with a secure database lookup (e.g. Firestore query)
 * and compare passwords using bcrypt or scrypt.
 */
async function verifyPoppoCredentials(poppoId, password) {
    // In production: fetch user from Firestore and verify hashed password
    if (poppoId === "test-host" && password === "secure-password") {
        return true;
    }
    return false;
}
/**
 * 2nd-Gen HTTPS Callable Cloud Function for custom Poppo ID authentication.
 */
exports.authenticatePoppoUser = (0, https_1.onCall)(async (request) => {
    const { data } = request;
    // 1. Input validation & type checks
    if (!data || typeof data.poppoId !== "string" || typeof data.password !== "string") {
        throw new https_1.HttpsError("invalid-argument", "The function must be called with valid 'poppoId' and 'password' strings.");
    }
    const poppoId = data.poppoId.trim();
    const password = data.password.trim();
    if (poppoId.length === 0 || password.length === 0) {
        throw new https_1.HttpsError("invalid-argument", "Poppo ID and password cannot be empty values.");
    }
    // 2. Validate credentials against target authentication store
    let isCredentialValid = false;
    try {
        isCredentialValid = await verifyPoppoCredentials(poppoId, password);
    }
    catch (dbError) {
        console.error("Database lookup error during credential validation:", dbError.message || dbError);
        throw new https_1.HttpsError("internal", "An internal database lookup error occurred. Please try again later.");
    }
    if (!isCredentialValid) {
        throw new https_1.HttpsError("unauthenticated", "Authentication failed. Invalid Poppo ID or password.");
    }
    // 3. Mint custom Firebase Auth Token
    try {
        const auth = (0, auth_1.getAuth)();
        const customToken = await auth.createCustomToken(poppoId);
        return { customToken };
    }
    catch (tokenError) {
        // Log full stack trace internally, hide internal SDK details from client
        console.error(`Failed to generate custom token for UID ${poppoId}:`, tokenError.message || tokenError);
        throw new https_1.HttpsError("internal", "Failed to generate session token. Please contact site administrators.");
    }
});
/**
 * Scheduled function to automatically delete system_logs older than 30 days.
 * Runs every day at midnight (UTC).
 */
exports.cleanupOldSystemLogs = (0, scheduler_1.onSchedule)("every day 00:00", async (event) => {
    const db = (0, firestore_1.getFirestore)();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const cutoffTimestamp = thirtyDaysAgo.toISOString();
    try {
        const logsRef = db.collection("system_logs");
        const oldLogsQuery = logsRef.where("timestamp", "<", cutoffTimestamp).limit(500);
        let deletedCount = 0;
        while (true) {
            const snapshot = await oldLogsQuery.get();
            if (snapshot.empty)
                break;
            const batch = db.batch();
            snapshot.docs.forEach((doc) => {
                batch.delete(doc.ref);
            });
            await batch.commit();
            deletedCount += snapshot.size;
        }
        console.log(`Successfully deleted ${deletedCount} old system_logs.`);
    }
    catch (err) {
        console.error("Failed to clean up old system_logs:", err);
    }
});
/**
 * Parses date ("YYYY-MM-DD") and time ("HH:MM AM Manila Time")
 * to a UTC millisecond timestamp. Manila is UTC+8.
 */
function parseManilaTimeToUTC(dateStr, timeStr) {
    try {
        const timeMatch = timeStr.match(/(\d{1,2}):(\d{2})\s+(AM|PM)/i);
        if (!timeMatch)
            return 0;
        let hours = parseInt(timeMatch[1], 10);
        const minutes = parseInt(timeMatch[2], 10);
        const ampm = timeMatch[3].toUpperCase();
        if (ampm === "PM" && hours < 12)
            hours += 12;
        if (ampm === "AM" && hours === 12)
            hours = 0;
        // Parse the date as UTC and apply the Manila offset manually to get accurate UTC timestamp
        // e.g. "2024-06-10T09:00:00.000+08:00"
        const paddedHours = hours.toString().padStart(2, '0');
        const paddedMinutes = minutes.toString().padStart(2, '0');
        const isoString = `${dateStr}T${paddedHours}:${paddedMinutes}:00+08:00`;
        const eventDate = new Date(isoString);
        return eventDate.getTime();
    }
    catch (e) {
        return 0;
    }
}
/**
 * Scheduled function to check upcoming events and post announcements.
 * Runs every 5 minutes.
 */
exports.checkUpcomingEvents = (0, scheduler_1.onSchedule)("every 5 minutes", async (event) => {
    const db = (0, firestore_1.getFirestore)();
    const now = Date.now();
    try {
        const calendarRef = db.collection("calendar");
        // Get events from today and future (or roughly recent) to avoid pulling whole history.
        // We'll pull a reasonable chunk of events that don't have both notified flags set.
        const snapshot = await calendarRef
            .where("notifiedStart", "!=", true)
            .get();
        if (snapshot.empty)
            return;
        const batch = db.batch();
        const announcementsRef = db.collection("announcements");
        let batchCount = 0;
        snapshot.docs.forEach((doc) => {
            const data = doc.data();
            if (!data.date || !data.time)
                return;
            const eventTimeMs = parseManilaTimeToUTC(data.date, data.time);
            if (eventTimeMs === 0)
                return;
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
                    createdAt: firestore_1.FieldValue.serverTimestamp()
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
                    createdAt: firestore_1.FieldValue.serverTimestamp()
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
    }
    catch (err) {
        console.error("Failed to check upcoming events:", err);
    }
});
//# sourceMappingURL=index.js.map