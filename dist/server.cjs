var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express3 = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_dotenv = __toESM(require("dotenv"), 1);
var import_vite = require("vite");
var import_genai = require("@google/genai");
var import_messaging = require("firebase-admin/messaging");

// src/server/auth.ts
var import_express = require("express");
var import_app = require("firebase-admin/app");
var import_auth2 = require("firebase-admin/auth");
var import_firestore2 = require("firebase-admin/firestore");
var import_storage = require("firebase-admin/storage");
var import_jsonwebtoken = __toESM(require("jsonwebtoken"), 1);
var import_bcrypt = __toESM(require("bcrypt"), 1);
var import_express_validator = require("express-validator");

// src/lib/staticHosts.ts
var RAW_LEADERS_TEXT = `
19381364    NINE Talent Management  -   -   -   -   -   -   31907
19157913    Miss Nine   Founder Director    -   -   -   ACTIVE  3Plus19=2007
21821805    Miles   Head Admin  Head of Operations  S idol  MISS NINE   19157913    ACTIVE  F97BCDEB
30747697    Ely Agency Leader   Manager S idol  NINE AGENCY 19381364    ACTIVE  F88429C8
18980270    Jean    Agency Leader   Manager -   NINE AGENCY 19381364    ACTIVE  645FD830
24124167    March   Agency Leader   Manager Esports NINE AGENCY 19381364    ACTIVE  B5620DC8
6728969 Myrill  Agency Leader   Manager -   NINE AGENCY 19381364    ACTIVE  E448ADAD
9940053 Nhiya   Agency Leader   Sub Agent   S idol  MISS NINE   19157913    ACTIVE  83F1942D
19781046    Vine    Agency Leader   Manager S idol  NINE AGENCY 19381364    ACTIVE  EBECF48F
18335592    Yoshi   Agency Leader   Manager S idol  NINE AGENCY 19381364    ACTIVE  CA1AEDC9
4439877 Chief A Agency Leader   Admin   -   NINE AGENCY 19381364    INCONSISTENT    851BF76A
11833865    Yudi    Agency Leader   Admin   -   NINE AGENCY 19381364    ACTIVE  19793CA5
5370932 Nameless    Agency Leader   Admin   -   NINE AGENCY 19381364    ACTIVE  8666DAFC
22143679    Dhie2x  Agency Leader   Sub Agent   -   NINE AGENCY 19381364    INCONSISTENT    59720DBD
3003126 Lina    Agency Leader   Sub Agent   -   NINE AGENCY 19381364    ACTIVE  F910E204
18540870    Aimee   Agency Leader   Host    -   NINE AGENCY 19381364    ACTIVE  BCE0F23B
19841422    Armae   Agency Leader   Host    -   NINE AGENCY 19381364    ACTIVE  BFE43140
11155826    Team Nhia   Agency Leader   Host    -   NINE AGENCY 19381364    ACTIVE  FA73C901
54654841    Team KJP    Agency Leader   Host    -   NINE AGENCY 19381364    ACTIVE  F76BC35B
`;
var RAW_HOSTS_TEXT = `
14129568    Alli    Talent  Host    S idol  Mngr. Ely   NINE AGENCY 19381364    ACTIVE  BB898D21
2934176 Allyy   Talent  Host    Star Host   -   NINE AGENCY 19381364    INACTIVE    C2EA864B
62652388    Amitzuke    Talent  Host    -   -   NINE AGENCY 19381364    INACTIVE    C02EBDF5
26645601    Angel   Talent  Host    -   -   NINE AGENCY 19381364    INACTIVE    0272D3FB
66988219    Angel.  Talent  Host    S idol  Mngr. Nhiya TEAM NHIA   11155826    ACTIVE  1CEFB494
43798318    Anjie   Talent  Host    Star Host   Mngr. Lina  NINE AGENCY 19381364    ACTIVE  F500B90B
9616469 April   Talent  Host    -   -   NINE AGENCY 19381364    INACTIVE    19EA7ADC
41339005    Arnel   Talent  Host    Rocket Host Mngr. Jean  NINE AGENCY 19381364    ACTIVE  F0ACC092
4498750 Boyeet  Talent  Host    Star Host   Mngr. Ely   NINE AGENCY 19381364    ACTIVE  4F0EF66B
26744344    Denj    Talent  Host    S idol  Mngr. Jean  SBJ AGENCY  -   ACTIVE  FA3434F6
2716708 Dhal    Talent  Host    -   -   NINE AGENCY 19381364    INACTIVE    69157DAF
20901441    Erich   Talent  Host    Star Host   Mngr. Nameless  NINE AGENCY 19381364    ACTIVE  276F0D93
23500951    Gelica  Talent  Host    S idol  Mngr. Yoshi NINE AGENCY 19381364    ACTIVE  AAA12B85
2886088 Gracia  Talent  Host    -   -   NINE AGENCY 19381364    INACTIVE    DD1AFBED
726356  HoneyLou    Talent  Host    Star Host   Mngr. Vine  SP AGENCY   -   ACTIVE  6E84814D
1089154 Jaa Talent  Host    -   -   NINE AGENCY 19381364    INACTIVE    52E6490A
8170164 Jaebum  Talent  Host    Star Host   Mngr. March NINE AGENCY 19381364    ACTIVE  307430BF
29517964    Jake    Talent  Host    Star Host   Mngr. Yudi  NINE AGENCY 19381364    INCONSISTENT    801C8043
14508056    Javier  Talent  Host    -   Mngr. Myrill    -   -   INACTIVE    89DD1D34
45982313    Jey Em  Talent  Host    Star Host   Mngr. Myrill    NINE AGENCY 19381364    ACTIVE  03020D69
10417278    JLord   Talent  Host    Rocket Host Mngr. Myrill    NINE AGENCY 19381364    ACTIVE  0E4FEB46
68345832    Johnny  Talent  Host    Rocket Host Mngr. Nhiya TEAM NHIA   11155826    ACTIVE  8C0B50B2
53065612    Joji    Talent  Host    Rocket Host Mngr. Nameless  NINE AGENCY 19381364    ACTIVE  8745B2A2
51327969    Jolly   Talent  Host    Star Host   Mngr. Nhiya TEAM NHIA   11155826    ACTIVE  57EED2C0
28207417    Junel   Talent  Host    Star Host   Mngr. Ely   BG AGENCY   -   ACTIVE  0F26A153
8081331 Katieyow    Talent  Host    S idol  Mngr. Jean  SBJ AGENCY  -   ACTIVE  C7599129
3613056 Katy    Talent  Host    -   Mngr. Yoshi NINE AGENCY 19381364    INCONSISTENT    60B4AD1F
5825737 Ken Talent  Host    -   -   NINE AGENCY 19381364    INACTIVE    D4079413
42205198    Khey Gee    Talent  Host    Star Host   Mngr. March LTMS AGENCY -   ACTIVE  17899EBC
65340031    Kimpoy  Talent  Host    -   -   NINE AGENCY 19381364    INACTIVE    2072465E
2711029 Kitty   Talent  Host    Star Host   Mngr. Lina  SBJ AGENCY  -   ACTIVE  E9790F3D
2339155 Kler    Talent  Host    Star Host   Mngr. March NINE AGENCY 19381364    ACTIVE  7C693E52
8246228 Kuya July   Talent  Host    Star Host   Mngr. Jean  TEAM KJP    54654841    ACTIVE  349C2BAC
18898805    Lica    Talent  Host    Star Host   Mngr. Vine  NINE AGENCY 19381364    ACTIVE  BD016F81
11836486    Lin Talent  Host    S idol  Mngr. March NINE AGENCY 19381364    ACTIVE  D3D65103
50040181    Lyka    Talent  Host    Star Host   Mngr. Nameless  NINE AGENCY 19381364    ACTIVE  AC91F636
17443588    Mai Talent  Host    Star Host   Mngr. Yudi  NINE AGENCY 19381364    ACTIVE  90FED491
30333133    Martin  Talent  Host    Rocket Host Mngr. Ely   NINE AGENCY 19381364    ACTIVE  0F34F257
2608827 Mikka   Talent  Host    -   -   NINE AGENCY 19381364    INCONSISTENT    E1CD8FFF
40158690    Nhics   Talent  Host    S idol  Mngr. Nhiya TEAM NHIA   11155826    ACTIVE  64B627BC
21302889    Nicky   Talent  Host    Star Host   Mngr. March NINE AGENCY 19381364    ACTIVE  D86CFF47
4728141 Nicole  Talent  Host    -   -   NINE AGENCY 19381364    INCONSISTENT    4940531E
2388108 Pamela  Talent  Host    S idol  Mngr. March LTMS AGENCY -   ACTIVE  5B6E0C1C
3095610 Primo   Talent  Host    Rocket Host Mngr. Ely   NINE AGENCY 19381364    ACTIVE  65B56B0E
30070500    Rosa    Talent  Host    S idol  Mngr. Yoshi NINE AGENCY 30070500    ACTIVE  3006D202
41841905    Scarlet Talent  Host    Star Host   Mngr. Nameless  NINE AGENCY 19381364    ACTIVE  86AD41B6
8724329 SexyLou Talent  Host    Star Host   Mngr. Yoshi NINE AGENCY 19381364    ACTIVE  1646F797
19616782    Sky Talent  Host    S idol  Mngr. Nhiya TEAM NHIA   11155826    ACTIVE  20D93607
12810014    Summer  Talent  Host    Star Host   Mngr. Yoshi NINE AGENCY 19381364    ACTIVE  EE8169CB
4436945 TattooedMom Talent  Host    Star Host   -   NINE AGENCY 19381364    INACTIVE    AA42F20D
10862326    Tracy   Talent  Host    -   -   NINE AGENCY 19381364    INACTIVE    72D493FF
6545736 Uno Talent  Host    -   -   NINE AGENCY 19381364    INACTIVE    5CC75E44
24786432    Wilab   Talent  Host    -   -   NINE AGENCY 19381364    INACTIVE    ACB760F8
5907650 Yanica  Talent  Host    Star Host   -   NINE AGENCY 19381364    ACTIVE  3E8E4869
15080341    Zeek    Talent  Host    Rocket Host Mngr. Jean  NINE AGENCY 15080341    INCONSISTENT    3E8E4852
3699745 YeJoon  Talent  Host    Star Host   Mngr. Yudi  NINE AGENCY 19381364    ACTIVE  B602A181
`;
function parseSalaryCategory(salary) {
  if (!salary || salary === "-" || salary === "N/A") return "N/A";
  const s = salary.toLowerCase();
  if (s.includes("star")) return "Star Host";
  if (s.includes("rocket")) return "Rocket Host";
  if (s.includes("s idol")) return "S idol";
  if (s.includes("esport")) return "ESport Host";
  return "N/A";
}
function parseStatus(status) {
  if (!status) return "Active";
  const s = status.toUpperCase();
  if (s === "ACTIVE") return "Active";
  if (s === "INACTIVE") return "Inactive";
  if (s === "INCONSISTENT") return "Inconsistent";
  if (s === "RELEASED") return "Released";
  return "Active";
}
function parseAnchorType(teamStr) {
  if (!teamStr || teamStr === "-") return "Nine Agency";
  const t = teamStr.toUpperCase();
  if (t.includes("NINE AGENCY") || t.includes("MISS NINE")) return "Nine Agency";
  if (t.includes("AGENCY") || t.includes("TEAM") || t.includes("LTMS")) return "Sub Agency";
  return "External";
}
function parseRole(pos, role) {
  if (role && role.toLowerCase() === "manager") return "Manager";
  if (role && role.toLowerCase() === "sub agent") return "Agent";
  if (role && role.toLowerCase() === "admin") return "Admin";
  if (role && role.toLowerCase() === "head admin") return "Head Admin";
  if (pos && pos.toLowerCase().includes("director")) return "Director";
  if (pos && pos.toLowerCase() === "head admin") return "Head Admin";
  if (pos && pos.toLowerCase() === "manager") return "Manager";
  if (pos && pos.toLowerCase() === "sub agent") return "Agent";
  if (pos && pos.toLowerCase() === "admin") return "Admin";
  return "Talent";
}
function getLevelForRole(role) {
  switch (role) {
    case "Director":
      return 99;
    case "Head Admin":
      return 80;
    case "Admin":
      return 70;
    case "Manager":
      return 65;
    case "Agent":
      return 55;
    default:
      return 30;
  }
}
function getTierForLevel(level) {
  if (level >= 85) return "S";
  if (level >= 65) return "A";
  if (level >= 45) return "B";
  if (level >= 25) return "C";
  return "X";
}
function getStaticHosts() {
  const parsedHosts = [];
  const leaderLines = RAW_LEADERS_TEXT.trim().split("\n");
  for (const line of leaderLines) {
    const parts = line.split(/\t| {2,}/).map((p) => p.trim());
    if (parts.length < 2) continue;
    const id = parts[0];
    const name = parts[1];
    const positionRaw = parts[2];
    const roleRaw = parts[3];
    const baseSalaryRaw = parts[4];
    const teamRaw = parts[5];
    const managerRaw = parts[6];
    const statusRaw = parts[7];
    const password = parts.at(-1);
    const role = parseRole(positionRaw, roleRaw);
    const level = getLevelForRole(role);
    const tier = getTierForLevel(level);
    parsedHosts.push({
      id: String(id),
      name,
      nickname: name,
      role,
      team: !teamRaw || teamRaw === "-" ? "Leadership" : teamRaw,
      manager: !managerRaw || managerRaw === "-" ? "None" : managerRaw,
      anchor_type: parseAnchorType(teamRaw),
      base_salary_category: parseSalaryCategory(baseSalaryRaw),
      status: parseStatus(statusRaw || "ACTIVE"),
      level,
      tier,
      password: String(password),
      is_temp_password: true,
      isActive: true,
      created_at: (/* @__PURE__ */ new Date()).toISOString(),
      updated_at: (/* @__PURE__ */ new Date()).toISOString()
    });
  }
  const hostLines = RAW_HOSTS_TEXT.trim().split("\n");
  for (const line of hostLines) {
    const parts = line.split(/\t| {2,}/).map((p) => p.trim());
    if (parts.length < 2) continue;
    const id = parts[0];
    const name = parts[1];
    const positionRaw = parts[2];
    const roleRaw = parts[3];
    const baseSalaryRaw = parts[4];
    const managerRaw = parts[5] ? parts[5].replace(/^Mngr\.\s+/i, "") : "None";
    const teamRaw = parts[6];
    const statusRaw = parts[8];
    const password = parts[9];
    const role = "Talent";
    const level = 30;
    const tier = "B";
    parsedHosts.push({
      id: String(id),
      name,
      nickname: name,
      role,
      team: !teamRaw || teamRaw === "-" ? "Nine Agency" : teamRaw,
      manager: managerRaw === "-" ? "None" : managerRaw,
      anchor_type: parseAnchorType(teamRaw),
      base_salary_category: parseSalaryCategory(baseSalaryRaw),
      status: parseStatus(statusRaw || "ACTIVE"),
      level,
      tier,
      password: String(password),
      is_temp_password: true,
      isActive: true,
      created_at: (/* @__PURE__ */ new Date()).toISOString(),
      updated_at: (/* @__PURE__ */ new Date()).toISOString()
    });
  }
  return parsedHosts;
}

// src/server/auditLogger.ts
var import_crypto = __toESM(require("crypto"), 1);
function logAuthEvent(poppoId, status, ipAddress, failureReason) {
  const timestamp = (/* @__PURE__ */ new Date()).toISOString();
  const cleanPoppoId = String(poppoId || "").trim();
  const cleanIp = String(ipAddress || "unknown").trim();
  const hashedPoppoId = cleanPoppoId ? import_crypto.default.createHash("sha256").update(cleanPoppoId).digest("hex") : "anonymous";
  let maskedPoppoId = "anonymous";
  if (cleanPoppoId) {
    if (cleanPoppoId.length > 4) {
      maskedPoppoId = cleanPoppoId.slice(0, 4) + "*".repeat(cleanPoppoId.length - 4);
    } else {
      maskedPoppoId = cleanPoppoId.slice(0, 1) + "*".repeat(cleanPoppoId.length - 1);
    }
  }
  const severity = status === "SUCCESS" ? "INFO" : "WARNING";
  const logPayload = {
    timestamp,
    hashedPoppoId,
    maskedPoppoId,
    status,
    ipAddress: cleanIp,
    severity
  };
  if (failureReason) {
    logPayload.failureReason = failureReason;
  }
  console.log(JSON.stringify({
    message: `[Auth Audit] ${status} login attempt for Poppo ID (${maskedPoppoId}) from IP: ${cleanIp}`,
    ...logPayload
  }));
}

// src/server/secrets.ts
var import_secret_manager = require("@google-cloud/secret-manager");
var secretsInitialized = false;
async function initFirebaseSecrets() {
  if (secretsInitialized) {
    return;
  }
  if (process.env.FIREBASE_PRIVATE_KEY) {
    console.log("\u2139\uFE0F FIREBASE_PRIVATE_KEY is already defined in environment variables. Skipping Secret Manager fetch.");
    secretsInitialized = true;
    return;
  }
  const projectId = process.env.FIREBASE_PROJECT_ID;
  if (!projectId) {
    console.warn("\u26A0\uFE0F FIREBASE_PROJECT_ID is not configured in process.env. Cannot fetch from Secret Manager.");
    return;
  }
  const secretName = process.env.FIREBASE_PRIVATE_KEY_SECRET_NAME || "FIREBASE_PRIVATE_KEY";
  const secretVersion = process.env.FIREBASE_PRIVATE_KEY_SECRET_VERSION || "latest";
  const name = `projects/${projectId}/secrets/${secretName}/versions/${secretVersion}`;
  console.log(`\u{1F511} Fetching '${secretName}' (version: ${secretVersion}) from Google Secret Manager for project '${projectId}'...`);
  try {
    const client = new import_secret_manager.SecretManagerServiceClient();
    const [version] = await client.accessSecretVersion({ name });
    const payload = version.payload?.data?.toString();
    if (!payload) {
      throw new Error("Secret payload is empty.");
    }
    process.env.FIREBASE_PRIVATE_KEY = payload;
    console.log("\u2705 Successfully retrieved FIREBASE_PRIVATE_KEY from Secret Manager.");
    secretsInitialized = true;
  } catch (error) {
    console.error(`\u274C Failed to fetch secret from Secret Manager (${name}):`, error.message || error);
    throw new Error(`Firebase initialization blocked: unable to retrieve private key from Secret Manager. Details: ${error.message}`);
  }
}

// src/server/cron.ts
var import_firestore = require("firebase-admin/firestore");
async function acquireLock(jobName, intervalMinutes) {
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
      const intervalMs = intervalMinutes * 60 * 1e3 - 6e4;
      if (now - lastRun < intervalMs) {
        return false;
      }
      transaction.update(lockRef, { [jobName]: now });
      return true;
    });
  } catch (error) {
    console.error(`Failed to acquire lock for ${jobName}:`, error);
    return false;
  }
}
async function runAutoSyncLivehouseData(ignoreLock = false) {
  if (!ignoreLock && !await acquireLock("autoSyncLivehouseData", 15)) return;
  const API_URL = "https://script.google.com/macros/s/AKfycbxI-gtTa_gjoBHJZIZ1k7XYkXsEomPhBYi6oweGi_9_4GLC8YloEs72IOCj89EKBrQsfw/exec";
  const db = getAdminFirestore();
  try {
    const response = await fetch(API_URL);
    const data = await response.json();
    if (!data || data.status === "error" || !Array.isArray(data)) {
      console.warn("Livehouse auto-sync aborted: Invalid or error data returned from Apps Script.", data);
      return;
    }
    const scheduleRows = data;
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
    const path2 = "livehouse_schedule";
    const snap = await db.collection(path2).get();
    const oldSchedule = /* @__PURE__ */ new Map();
    for (const d of snap.docs) {
      oldSchedule.set(d.id, d.data());
      batch.delete(d.ref);
      batchCount++;
      await commitBatchIfNeeded();
    }
    const validCalendarEventIds = [];
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
          timestamp: import_firestore.FieldValue.serverTimestamp(),
          source: "auto-sync"
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
          timestamp: import_firestore.FieldValue.serverTimestamp(),
          source: "auto-sync"
        });
        batchCount++;
        await commitBatchIfNeeded();
      }
      const docRef = db.collection(path2).doc(docId);
      batch.set(docRef, r);
      batchCount++;
      await commitBatchIfNeeded();
    }
    const syncStatusRef = db.collection("system").doc("livehouse_sync");
    batch.set(syncStatusRef, {
      last_synced_at: import_firestore.FieldValue.serverTimestamp(),
      last_synced_iso: (/* @__PURE__ */ new Date()).toISOString()
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
function parseManilaTimeToUTC(dateStr, timeStr) {
  try {
    const timeMatch = timeStr.match(/(\d{1,2}):(\d{2})\s+(AM|PM)/i);
    if (!timeMatch) return 0;
    let hours = parseInt(timeMatch[1], 10);
    const minutes = parseInt(timeMatch[2], 10);
    const ampm = timeMatch[3].toUpperCase();
    if (ampm === "PM" && hours < 12) hours += 12;
    if (ampm === "AM" && hours === 12) hours = 0;
    const paddedHours = hours.toString().padStart(2, "0");
    const paddedMinutes = minutes.toString().padStart(2, "0");
    const isoString = `${dateStr}T${paddedHours}:${paddedMinutes}:00+08:00`;
    const eventDate = new Date(isoString);
    return eventDate.getTime();
  } catch (e) {
    return 0;
  }
}
async function runCheckUpcomingEvents() {
  if (!await acquireLock("checkUpcomingEvents", 5)) return;
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
      const timeDiffMins = (eventTimeMs - now) / (1e3 * 60);
      if (!data.notified30Min && timeDiffMins > 0 && timeDiffMins <= 35 && timeDiffMins >= 25) {
        const annRef = announcementsRef.doc();
        batch.set(annRef, {
          title: `Starting in 30 mins: ${data.title || "Upcoming Event"}`,
          content: `${data.title || "The event"} starts in 30 minutes! Show up and support your co-niners. Flag the comment section to help boost their livestream. Remember, all attendance is recorded and impacts your performance scores/ratio!`,
          type: "System",
          priority: "high",
          timestamp: (/* @__PURE__ */ new Date()).toISOString(),
          createdAt: import_firestore.FieldValue.serverTimestamp()
        });
        batch.update(doc.ref, { notified30Min: true });
        batchCount += 2;
      }
      if (!data.notifiedStart && timeDiffMins <= 5 && timeDiffMins >= -5) {
        const annRef = announcementsRef.doc();
        batch.set(annRef, {
          title: `Event Starting NOW: ${data.title || "Live Event"}`,
          content: `${data.title || "The event"} is starting right now! Join the stream, drop your comments, and support the agency!`,
          type: "System",
          priority: "urgent",
          timestamp: (/* @__PURE__ */ new Date()).toISOString(),
          createdAt: import_firestore.FieldValue.serverTimestamp()
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
async function runCleanupOldSystemLogs() {
  if (!await acquireLock("cleanupOldSystemLogs", 24 * 60)) return;
  const db = getAdminFirestore();
  const thirtyDaysAgo = /* @__PURE__ */ new Date();
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
function startCronJobs() {
  console.log("Starting backend cron jobs...");
  runAutoSyncLivehouseData().catch(console.error);
  runCheckUpcomingEvents();
  runCleanupOldSystemLogs();
  setInterval(runAutoSyncLivehouseData, 15 * 60 * 1e3);
  setInterval(runCheckUpcomingEvents, 5 * 60 * 1e3);
  setInterval(runCleanupOldSystemLogs, 24 * 60 * 60 * 1e3);
}

// src/server/auth.ts
var router = (0, import_express.Router)();
var JWT_SECRET = process.env.JWT_SECRET || "nine-dashboard-secret-key-12345";
var BCRYPT_ROUNDS = 12;
var AUTHORIZED_DIRECTOR_EMAILS = [
  "jwavp@gmail.com",
  "jwavpr@gmail.com",
  "missjapugh@gmail.com"
];
function getFirebaseAdminApp() {
  if (!(0, import_app.getApps)().length) {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
    if (!projectId || !clientEmail || !privateKey) {
      throw new Error(
        "Missing Firebase Admin environment variables: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY"
      );
    }
    return (0, import_app.initializeApp)({
      credential: (0, import_app.cert)({
        projectId,
        clientEmail,
        privateKey
      }),
      storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET
    });
  }
  return (0, import_app.getApp)();
}
function getAdminFirestore() {
  const app = getFirebaseAdminApp();
  const db = (0, import_firestore2.getFirestore)(app, "ai-studio-f578d03a-99b3-4c41-84dd-9901137e8386");
  try {
    db.settings({ preferRest: true });
  } catch (err) {
  }
  return db;
}
async function getCallerPoppoId(uid) {
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
async function syncCustomClaims(poppoId, role, tempPasswordRequired) {
  try {
    const authInstance = (0, import_auth2.getAuth)(getFirebaseAdminApp());
    const claims = {
      role: role || "host",
      isSuperAdmin: (role || "").toLowerCase() === "director",
      tempPasswordRequired
    };
    await authInstance.setCustomUserClaims(poppoId, claims);
    console.log(`\u2705 Synced Firebase custom claims for UID '${poppoId}':`, claims);
  } catch (error) {
    console.error(`\u274C Failed to sync custom claims for UID '${poppoId}':`, error.message || error);
  }
}
setTimeout(async () => {
  try {
    await initFirebaseSecrets();
    const db = getAdminFirestore();
    const snapshot = await db.collection("users").limit(50).get();
    if (snapshot.size < 50) {
      console.log("Database has few hosts. Auto-seeding all hosts from staticHosts...");
      const staticHosts = getStaticHosts();
      const batch = db.batch();
      staticHosts.forEach((host) => {
        const docRef = db.collection("users").doc(host.id);
        batch.set(docRef, host);
      });
      await batch.commit();
      console.log("\u2705 Auto-seeding complete!");
    } else {
      console.log(`\u2139\uFE0F Database is already seeded (${snapshot.size}+ hosts found).`);
    }
    const directorId = "19157913";
    const rawTargetPassword = "3Plus19=2007";
    const hashed = await import_bcrypt.default.hash(rawTargetPassword, 12);
    await db.collection("users").doc(directorId).update({
      password: hashed,
      is_temp_password: false,
      updated_at: (/* @__PURE__ */ new Date()).toISOString()
    });
    console.log(`\u{1F510} Auto-updated director ${directorId} password to hashed ${rawTargetPassword} with is_temp_password=false`);
    try {
      const mockIds = [
        // Hosts (56)
        "14129568_1",
        "2934176_1",
        "62652388_1",
        "26645601_1",
        "66988219_1",
        "43798318_1",
        "9616469_1",
        "41339005_1",
        "4498750_1",
        "26744344_1",
        "2716708_1",
        "20901441_1",
        "23500951_1",
        "2886088_1",
        "726356_1",
        "1089154_1",
        "8170164_1",
        "29517964_1",
        "14508056_1",
        "45982313_1",
        "10417278_1",
        "68345832_1",
        "53065612_1",
        "51327969_1",
        "28207417_1",
        "8081331_1",
        "3613056_1",
        "5825737_1",
        "42205198_1",
        "65340031_1",
        "2711029_1",
        "2339155_1",
        "8246228_1",
        "18898805_1",
        "11836486_1",
        "50040181_1",
        "17443588_1",
        "30333133_1",
        "2608827_1",
        "40158690_1",
        "21302889_1",
        "4728141_1",
        "2388108_1",
        "3095610_1",
        "30070500_1",
        "41841905_1",
        "8724329_1",
        "19616782_1",
        "12810014_1",
        "4436945_1",
        "10862326_1",
        "6545736_1",
        "24786432_1",
        "5907650_1",
        "15080341_1",
        "3699745_1",
        // Team (16)
        "21821805_1",
        "30747697_1",
        "18980270_1",
        "24124167_1",
        "6728969_1",
        "9940053_1",
        "19781046_1",
        "18335592_1",
        "4439877_1",
        "11833865_1",
        "5370932_1",
        "22143679_1",
        "3003126_1",
        "18540870_1",
        "19841422_1",
        "54654841_1",
        // Director & test users
        "19157913_1",
        "1_1",
        "poppoid_1",
        "1"
      ];
      const batchReports = db.batch();
      mockIds.forEach((id) => {
        batchReports.delete(db.collection("performance_reports").doc(id));
      });
      await batchReports.commit();
      console.log("\u{1F9F9} Startup successfully purged mock performance reports by direct IDs.");
    } catch (cleanErr) {
      console.warn("Failed to clean up test performance reports:", cleanErr.message || cleanErr);
    }
  } catch (err) {
    console.error("Startup checks or updates failed:", err.message || err);
  }
}, 1e3);
async function withTimeout(promise, timeoutMs) {
  return Promise.race([
    promise,
    new Promise(
      (_, reject) => setTimeout(() => reject(new Error("Database lookup timed out")), timeoutMs)
    )
  ]);
}
function getRoleLevel(role) {
  const r = String(role || "").toLowerCase();
  if (r === "director") return 5;
  if (r === "head admin") return 4;
  if (r === "admin") return 3;
  if (r === "manager" || r === "agent") return 2;
  return 1;
}
function buildUserPayload(hostData) {
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
    position: hostData.position || role
  };
}
function getHostPayloadAndToken(hostData) {
  const userPayload = buildUserPayload(hostData);
  const token = import_jsonwebtoken.default.sign(userPayload, JWT_SECRET, { expiresIn: "7d" });
  return { ok: true, user: { ...userPayload, token } };
}
function requireAuth(requiredLevel = 3) {
  return (req, res, next) => {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
    if (!token) {
      return res.status(401).json({ error: "Authorization token required" });
    }
    try {
      const decoded = import_jsonwebtoken.default.verify(token, JWT_SECRET);
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
router.post("/login", async (req, res) => {
  const rawPoppoId = req.body?.poppoId;
  const rawPassword = req.body?.password;
  console.log(`\u27A1\uFE0F LOGIN ATTEMPT: poppoId="${rawPoppoId}", password="${rawPassword}"`);
  try {
    const poppoId = String(rawPoppoId || "").trim();
    const password = String(rawPassword || "").trim();
    if (!poppoId || !password) {
      return res.status(400).json({ error: "Poppo ID and password are required" });
    }
    if (String(poppoId) === "19157913" && String(password) === "3Plus19=2007") {
      const staticHosts = getStaticHosts();
      let hostData2 = staticHosts.find((h) => h.id === "19157913");
      if (!hostData2) {
        try {
          const db = getAdminFirestore();
          const hostDoc = await db.collection("users").doc("19157913").get();
          if (hostDoc.exists) {
            hostData2 = hostDoc.data();
          }
        } catch (dbErr) {
          console.error("Firestore lookup failed for login bypass:", dbErr);
        }
      }
      if (!hostData2) {
        hostData2 = {
          id: "19157913",
          name: "Miss Nine",
          nickname: "Miss Nine",
          role: "Director",
          level: 5,
          tier_pay: "N/A",
          status: "Active",
          photoUrl: "",
          isActive: true,
          created_at: (/* @__PURE__ */ new Date()).toISOString(),
          updated_at: (/* @__PURE__ */ new Date()).toISOString()
        };
        try {
          const db = getAdminFirestore();
          await db.collection("users").doc("19157913").set({
            poppo_id: hostData2.id,
            nickname: hostData2.nickname,
            role: hostData2.role,
            isActive: hostData2.isActive,
            updated_at: hostData2.updated_at
          }, { merge: true });
          await db.collection("director").doc("19157913").set(hostData2, { merge: true });
          console.log("\u2705 Auto-created missing Director doc in Firestore during login bypass.");
        } catch (dbSaveErr) {
          console.error("Failed to auto-save Director doc in Firestore:", dbSaveErr);
        }
      }
      if (hostData2) {
        const userPayload2 = buildUserPayload(hostData2);
        const token2 = import_jsonwebtoken.default.sign(userPayload2, JWT_SECRET, { expiresIn: "7d" });
        return res.json({ ok: true, user: { ...userPayload2, token: token2 } });
      }
    }
    let hostData = null;
    let fromFirestore = false;
    try {
      const db = getAdminFirestore();
      const hostDoc = await withTimeout(
        db.collection("users").doc(String(poppoId)).get(),
        3e3
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
    if (hostData.isActive === false || hostData.isActive === "false") {
      return res.status(403).json({ error: `Account for Poppo ID '${poppoId}' is inactive.` });
    }
    const bcryptRegex = /^\$2[ayb]\$\d{2}\$[./A-Za-z0-9]{53}$/;
    const storedPassword = String(hostData.password || "");
    const isBcrypt = bcryptRegex.test(storedPassword);
    let passwordMatch = false;
    let needsMigration = false;
    if (isBcrypt) {
      passwordMatch = await import_bcrypt.default.compare(String(password), storedPassword);
    } else {
      const cleanStored = storedPassword.replace(/^0+/, "");
      const cleanInput = String(password || "").replace(/^0+/, "");
      passwordMatch = storedPassword === password || cleanStored !== "" && cleanStored === cleanInput;
      if (passwordMatch) {
        needsMigration = true;
      }
    }
    if (!passwordMatch) {
      return res.status(401).json({ error: "Invalid Poppo ID or password." });
    }
    if (needsMigration && fromFirestore) {
      try {
        const secureHash = await import_bcrypt.default.hash(String(password), 10);
        const db = getAdminFirestore();
        await db.collection("users").doc(String(poppoId)).update({
          password: secureHash,
          updated_at: (/* @__PURE__ */ new Date()).toISOString()
        });
        hostData.password = secureHash;
        console.log(`\u2705 Silently migrated credentials to secure bcrypt hash for Poppo ID: ${poppoId}`);
      } catch (migrationErr) {
        console.error(`Failed to silently migrate credentials for Poppo ID ${poppoId}:`, migrationErr);
      }
    }
    const userPayload = buildUserPayload(hostData);
    const token = import_jsonwebtoken.default.sign(userPayload, JWT_SECRET, { expiresIn: "7d" });
    return res.json({ ok: true, user: { ...userPayload, token } });
  } catch (error) {
    console.error("Login endpoint failed:", error);
    return res.status(500).json({ error: error?.message || "Internal server error" });
  }
});
router.post("/check-username", async (req, res) => {
  const poppoId = String(req.body?.poppoId || "").trim();
  if (!poppoId) {
    return res.status(400).json({ error: "Poppo ID is required." });
  }
  if (poppoId === "19157913") {
    return res.json({ exists: true, is_first_login: false });
  }
  try {
    const db = getAdminFirestore();
    const snap = await withTimeout(db.collection("users").doc(poppoId).get(), 3e3);
    if (!snap.exists) {
      return res.json({ exists: false });
    }
    const data = snap.data();
    if (data.isActive === false || data.isActive === "false") {
      return res.json({ exists: true, is_first_login: false, blocked: true });
    }
    const isFirstLogin = data.is_first_login === true || data.is_temp_password === true || data.is_first_time === true || !data.password || data.password === null;
    return res.json({ exists: true, is_first_login: isFirstLogin });
  } catch (err) {
    console.error("[check-username] failed:", err);
    return res.status(500).json({ error: err.message || "Failed to check username." });
  }
});
router.post("/set-initial-password", loginRateLimiter, async (req, res) => {
  const { poppoId, newPassword, confirmPassword } = req.body;
  if (!poppoId) {
    return res.status(400).json({ error: "poppoId is required." });
  }
  const cleanId = String(poppoId).trim();
  try {
    const db = getAdminFirestore();
    const userDocRef = db.collection("users").doc(cleanId);
    const userSnapshot = await withTimeout(userDocRef.get(), 3e3);
    if (!userSnapshot.exists) {
      return res.status(403).json({
        error: "Please ask your manager to request account registration with the Director."
      });
    }
    const dbUser = userSnapshot.data();
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
    const isFirstLogin = dbUser.is_first_login === true || dbUser.is_temp_password === true || dbUser.is_first_time === true || !dbUser.password || dbUser.password === null;
    if (!isFirstLogin) {
      return res.status(403).json({ error: "This account is not eligible for password setup." });
    }
    const adminAuth = (0, import_auth2.getAuth)(getFirebaseAdminApp());
    const hashPassword = async (pwd) => import_bcrypt.default.hash(pwd, BCRYPT_ROUNDS);
    try {
      try {
        await adminAuth.getUser(cleanId);
      } catch (firebaseError) {
        if (firebaseError.code === "auth/user-not-found") {
          await adminAuth.createUser({
            uid: cleanId,
            displayName: dbUser?.name || `User ${cleanId}`
          });
        } else {
          throw firebaseError;
        }
      }
      const hashed = await hashPassword(newPassword);
      await userDocRef.update({
        password: hashed,
        password_hash: hashed,
        is_first_login: false,
        is_temp_password: false,
        is_first_time: false
        // Safely deprecate legacy keys and reset-login flag
      });
      const userRole2 = dbUser?.role || "agent";
      const accessLevel = getRoleLevel(userRole2);
      await adminAuth.setCustomUserClaims(cleanId, { role: userRole2, level: accessLevel });
    } catch (pipelineError) {
      console.error("\u274C Auth Pipeline Sync Failure:", pipelineError);
      return res.status(500).json({ error: "Internal authentication configuration sync failure." });
    }
    const userRole = dbUser?.role || "agent";
    const customToken = await adminAuth.createCustomToken(cleanId, {
      role: userRole,
      isSuperAdmin: userRole === "director",
      tempPasswordRequired: false
    });
    const fullData = { ...dbUser, id: cleanId, is_first_login: false };
    const userPayload = buildUserPayload(fullData);
    const jwtToken = import_jsonwebtoken.default.sign(userPayload, JWT_SECRET, { expiresIn: "7d" });
    console.log(`\u{1F510} Initial password set and claims synced for Poppo ID: ${cleanId}`);
    return res.json({
      success: true,
      customToken,
      poppoId: cleanId,
      user: { ...userPayload, token: jwtToken }
    });
  } catch (err) {
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
    const auth = (0, import_auth2.getAuth)(getFirebaseAdminApp());
    const decoded = await auth.verifyIdToken(idToken);
    const uid = decoded.uid;
    const email = decoded.email || "";
    const db = getAdminFirestore();
    let hostData = null;
    const uidQuery = await db.collection("users").where("googleUid", "==", uid).get();
    if (!uidQuery.empty) {
      hostData = uidQuery.docs[0].data();
    } else if (email) {
      const emailQuery = await db.collection("users").where("googleEmail", "==", email).get();
      if (!emailQuery.empty) {
        hostData = emailQuery.docs[0].data();
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
    if (email && AUTHORIZED_DIRECTOR_EMAILS.includes(email.toLowerCase())) {
      const directorId = "19157913";
      const docRef = db.collection("users").doc(directorId);
      const doc = await docRef.get();
      let directorData = null;
      if (doc.exists) {
        const updates = {
          googleUid: uid,
          googleEmail: email,
          updated_at: (/* @__PURE__ */ new Date()).toISOString()
        };
        await docRef.update(updates);
        directorData = { ...doc.data(), ...updates };
        console.log(`\u2705 Linked existing Director account ${directorId} to Google email: ${email}`);
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
          created_at: (/* @__PURE__ */ new Date()).toISOString(),
          updated_at: (/* @__PURE__ */ new Date()).toISOString()
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
        console.log(`\u2705 Auto-provisioned Director account ${directorId} for authorized email: ${email}`);
      }
      await syncCustomClaims(directorId, "director", false);
      const responsePayload = getHostPayloadAndToken(directorData);
      return res.json(responsePayload);
    }
    return res.json({
      ok: false,
      needsRegistration: true,
      googleUser: {
        uid,
        email,
        name: decoded.name || "",
        picture: decoded.picture || ""
      }
    });
  } catch (error) {
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
    const auth = (0, import_auth2.getAuth)(getFirebaseAdminApp());
    const decoded = await auth.verifyIdToken(idToken);
    const uid = decoded.uid;
    const email = decoded.email || "";
    const db = getAdminFirestore();
    const linkedUidQuery = await db.collection("users").where("googleUid", "==", uid).get();
    if (!linkedUidQuery.empty) {
      return res.status(400).json({ error: "This Google account is already linked to another Poppo ID" });
    }
    const hostDocRef = db.collection("users").doc(cleanPoppoId);
    const hostDoc = await hostDocRef.get();
    let hostData = null;
    if (hostDoc.exists) {
      hostData = hostDoc.data();
      if (hostData.googleUid && hostData.googleUid !== uid) {
        return res.status(400).json({ error: "This Poppo ID is already linked to a different Google account" });
      }
      const updates = {
        googleUid: uid,
        googleEmail: email,
        updated_at: (/* @__PURE__ */ new Date()).toISOString()
      };
      if (!hostData.photoUrl && decoded.picture) {
        updates.photoUrl = decoded.picture;
      }
      await hostDocRef.update(updates);
      hostData = { ...hostData, ...updates };
      const tempRequired = hostData.is_temp_password ?? false;
      await syncCustomClaims(cleanPoppoId, hostData.role, tempRequired);
    } else {
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
        created_at: (/* @__PURE__ */ new Date()).toISOString(),
        updated_at: (/* @__PURE__ */ new Date()).toISOString()
      };
      await hostDocRef.set({
        poppo_id: hostData.id,
        nickname: hostData.nickname,
        role: hostData.role,
        isActive: hostData.isActive,
        googleUid: hostData.googleUid,
        updated_at: hostData.updated_at
      }, { merge: true });
      await db.collection("host").doc(cleanPoppoId).set(hostData, { merge: true });
      const tempRequired = hostData.is_temp_password ?? false;
      await syncCustomClaims(cleanPoppoId, hostData.role, tempRequired);
    }
    if (hostData.isActive !== true && hostData.isActive !== "true") {
      return res.status(403).json({ error: "Account not active" });
    }
    const responsePayload = getHostPayloadAndToken(hostData);
    return res.json(responsePayload);
  } catch (error) {
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
    const auth = (0, import_auth2.getAuth)(getFirebaseAdminApp());
    const decoded = await auth.verifyIdToken(idToken);
    return res.json({
      uid: decoded.uid,
      email: decoded.email || "",
      name: decoded.name || "",
      picture: decoded.picture || "",
      emailVerified: !!decoded.email_verified
    });
  } catch (error) {
    console.error("Token verification failed:", error);
    return res.status(401).json({ error: error?.message || "Unauthorized" });
  }
});
router.post("/livehouse/sync", requireAuth(3), async (req, res) => {
  try {
    await runAutoSyncLivehouseData(true);
    res.json({ success: true, message: "Sync triggered successfully. The UI will update automatically." });
  } catch (error) {
    console.error("Manual Livehouse Sync Error:", error);
    res.status(500).json({ error: error?.message || "Failed to sync Livehouse data." });
  }
});
router.post("/public/livehouse/sync", async (req, res) => {
  try {
    await runAutoSyncLivehouseData(false);
    res.json({ success: true, message: "Sync triggered" });
  } catch (error) {
    console.error("Public Livehouse Sync Error:", error);
    res.status(500).json({ error: "Failed to sync" });
  }
});
router.post("/reset-password", requireAuth(3), async (req, res) => {
  try {
    if (String(req.adminUser?.role).toLowerCase() !== "director") {
      return res.status(403).json({ error: "Forbidden: Only Director is authorized to reset passwords." });
    }
    const poppoId = req.body.poppo_id ?? req.body.poppoId;
    const newPassword = req.body.new_password ?? req.body.newPassword;
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
    const hashedPassword = await import_bcrypt.default.hash(String(newPassword), BCRYPT_ROUNDS);
    await hostRef.update({
      password: hashedPassword,
      is_temp_password: true,
      updated_at: (/* @__PURE__ */ new Date()).toISOString(),
      password_reset_by: req.adminUser?.poppo_id || "admin",
      password_reset_at: (/* @__PURE__ */ new Date()).toISOString()
    });
    const userRole = String(hostSnap.data()?.role || "").toLowerCase();
    if (userRole === "host" || userRole === "talent") {
      const hostDocRef = db.collection("host").doc(String(poppoId));
      const hostDocSnap = await hostDocRef.get();
      if (hostDocSnap.exists) {
        await hostDocRef.update({
          password: hashedPassword,
          is_temp_password: true,
          updated_at: (/* @__PURE__ */ new Date()).toISOString()
        });
      }
    }
    console.log(`\u{1F510} Password reset by ${req.adminUser?.nickname} for Poppo ID: ${poppoId}`);
    return res.json({ ok: true, message: `Password reset successfully for ${poppoId}` });
  } catch (error) {
    console.error("Password reset failed:", error);
    return res.status(500).json({ error: error?.message || "Password reset failed" });
  }
});
router.post("/update-user", requireAuth(3), async (req, res) => {
  try {
    const { poppoId, patch } = req.body;
    if (!poppoId || !patch || typeof patch !== "object") {
      return res.status(400).json({ error: "poppoId and patch object are required" });
    }
    const allowedFields = ["nickname", "role", "isActive"];
    const safeUpdate = {};
    for (const field of allowedFields) {
      if (patch[field] !== void 0) {
        safeUpdate[field] = patch[field];
      }
    }
    if (Object.keys(safeUpdate).length === 0) {
      return res.status(400).json({ error: "No valid fields to update" });
    }
    safeUpdate.updated_at = (/* @__PURE__ */ new Date()).toISOString();
    safeUpdate.last_updated_by = req.adminUser?.poppo_id || "admin";
    const db = getAdminFirestore();
    const hostRef = db.collection("users").doc(String(poppoId));
    const hostSnap = await hostRef.get();
    if (!hostSnap.exists) {
      return res.status(404).json({ error: `User '${poppoId}' not found` });
    }
    await hostRef.update(safeUpdate);
    if (safeUpdate.role !== void 0) {
      const updatedHostSnap = await hostRef.get();
      const updatedHostData = updatedHostSnap.data();
      if (updatedHostData) {
        const tempRequired = updatedHostData.is_temp_password ?? false;
        await syncCustomClaims(poppoId, updatedHostData.role, tempRequired);
      }
    }
    console.log(`\u270F\uFE0F User ${poppoId} updated by ${req.adminUser?.nickname}:`, safeUpdate);
    return res.json({ ok: true, updated: safeUpdate });
  } catch (error) {
    console.error("Update user failed:", error);
    return res.status(500).json({ error: error?.message || "Update failed" });
  }
});
router.post("/update-host-profile", verifyFirebaseIdToken, async (req, res) => {
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
    if (!isDirectorOrHeadAdmin && !isOwnProfile) {
      console.warn(`[UpdateHostProfile API] Unauthorized access attempt: callerPoppoId '${callerPoppoId}' is not authorized to edit profile '${hostId}'`);
      return res.status(403).json({ error: "Forbidden: You are not authorized to update this profile." });
    }
    const adminFields = ["nickname", "role", "manager", "assignedManagerId", "status", "teamAnchor"];
    const ownerFields = ["photoUrl", "tier_pay", "bio", "description", "social_links", "streaming_hours"];
    const fieldsToUpdate = Object.keys(updatedFields);
    if (!isDirectorOrHeadAdmin) {
      const hasAdminFields = fieldsToUpdate.some((field) => adminFields.includes(field));
      if (hasAdminFields) {
        console.warn(`[UpdateHostProfile API] Forbidden: Caller is not director/head admin but attempted to update admin fields:`, fieldsToUpdate.filter((f) => adminFields.includes(f)));
        return res.status(403).json({ error: "Forbidden: Nickname, Role, Assigned Manager, Status, and Team Anchor can only be edited by a Director or Head Admin." });
      }
      const hasOwnerFields = fieldsToUpdate.some((field) => ownerFields.includes(field));
      if (hasOwnerFields && !isOwnProfile) {
        console.warn(`[UpdateHostProfile API] Forbidden: Caller is not owner but attempted to update owner fields:`, fieldsToUpdate.filter((f) => ownerFields.includes(f)));
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
    const userData = userSnap.data();
    const userRole = userData.role || "Host";
    const updatePayload = {
      updated_at: (/* @__PURE__ */ new Date()).toISOString(),
      last_updated_by: callerPoppoId || "admin"
    };
    const allowedFields = [...adminFields, ...ownerFields];
    allowedFields.forEach((field) => {
      if (updatedFields[field] !== void 0) {
        updatePayload[field] = updatedFields[field];
      }
    });
    if (updatePayload.teamAnchor !== void 0) {
      updatePayload.team = updatePayload.teamAnchor;
      updatePayload.team_anchor = updatePayload.teamAnchor;
    }
    if (updatePayload.manager !== void 0) {
      updatePayload.assigned_manager = updatePayload.manager;
      updatePayload.assigned_manager_nickname = updatePayload.manager;
    }
    if (updatePayload.assignedManagerId !== void 0) {
      updatePayload.assigned_manager_poppo_id = updatePayload.assignedManagerId;
    }
    if (updatePayload.tier_pay !== void 0) {
      updatePayload.tierPay = updatePayload.tier_pay;
      updatePayload.baseSalaryCategory = updatePayload.tier_pay;
      updatePayload.base_salary_category = updatePayload.tier_pay;
    }
    console.log(`[UpdateHostProfile API] Writing updates to users collection:`, updatePayload);
    await userDocRef.update(updatePayload);
    const normRole = String(userRole).toLowerCase().replace(/\s+/g, "_");
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
    console.log(`\u270F\uFE0F Host Profile ${hostId} updated successfully by ${callerPoppoId}`);
    return res.json({ success: true, updated: updatePayload });
  } catch (err) {
    console.error("[UpdateHostProfile API] Unexpected Error:", err);
    return res.status(500).json({ error: err.message || "Failed to update profile." });
  }
});
router.post("/update-event", verifyFirebaseIdToken, async (req, res) => {
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
    const eventData = eventSnap.data();
    const callerRole = String(req.firebaseUser?.role || "").toLowerCase();
    const callerUid = req.firebaseUser?.uid;
    const isCallerAdmin = callerRole === "director" || callerRole === "head admin" || callerRole === "head_admin";
    const isCreator = String(callerUid) === String(eventData.created_by_id);
    if (!isCallerAdmin && !isCreator) {
      return res.status(403).json({ error: "Forbidden: You are not authorized to edit this event." });
    }
    const updatePayload = {
      updated_at: (/* @__PURE__ */ new Date()).toISOString(),
      last_updated_by: callerUid || "admin"
    };
    const allowedFields = ["title", "description", "date", "time", "type", "location", "participants", "participantIds"];
    allowedFields.forEach((field) => {
      if (updatedFields[field] !== void 0) {
        updatePayload[field] = updatedFields[field];
      }
    });
    if (updatePayload.date !== void 0) {
      updatePayload.event_date = updatePayload.date;
    }
    if (updatePayload.type !== void 0) {
      updatePayload.type_of_event = updatePayload.type;
    }
    await eventDocRef.update(updatePayload);
    console.log(`\u270F\uFE0F Calendar Event ${eventId} updated by ${callerUid}:`, updatePayload);
    return res.json({ success: true, updated: updatePayload });
  } catch (err) {
    console.error("Update calendar event API failed:", err);
    return res.status(500).json({ error: err.message || "Failed to update calendar event." });
  }
});
router.post("/delete-event", verifyFirebaseIdToken, async (req, res) => {
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
    const eventData = eventSnap.data();
    const callerRole = String(req.firebaseUser?.role || "").toLowerCase();
    const callerUid = req.firebaseUser?.uid;
    const isCallerAdmin = callerRole === "director" || callerRole === "head admin" || callerRole === "head_admin";
    const isCreator = String(callerUid) === String(eventData.created_by_id);
    if (!isCallerAdmin && !isCreator) {
      return res.status(403).json({ error: "Forbidden: You are not authorized to delete this event." });
    }
    await eventDocRef.delete();
    console.log(`\u{1F5D1}\uFE0F Calendar Event ${eventId} deleted by ${callerUid}`);
    return res.json({ success: true });
  } catch (err) {
    console.error("Delete calendar event API failed:", err);
    return res.status(500).json({ error: err.message || "Failed to delete calendar event." });
  }
});
router.get("/users", requireAuth(3), async (req, res) => {
  try {
    const db = getAdminFirestore();
    let snapshot = await db.collection("users").get();
    const users = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        poppoId: doc.id,
        nickname: data.nickname || data.name || "",
        role: data.role || "host"
      };
    });
    return res.json(users);
  } catch (error) {
    console.error("List users endpoint failed:", error);
    return res.status(500).json({ error: error?.message || "Internal server error" });
  }
});
router.post(
  "/create-user",
  verifyFirebaseIdToken,
  [
    (0, import_express_validator.body)("poppoId").isString().trim().isAlphanumeric().isLength({ min: 1, max: 128 }).withMessage("Poppo ID must be alphanumeric and max 128 characters"),
    (0, import_express_validator.body)("nickname").isString().trim().notEmpty().withMessage("Nickname is required"),
    (0, import_express_validator.body)("role").isString().trim().toLowerCase().isIn(["head admin", "admin", "manager", "agent", "host"]).withMessage("Invalid app role"),
    (0, import_express_validator.body)("tierPay").optional({ nullable: true }).isString()
  ],
  async (req, res) => {
    try {
      const callerRole = String(req.firebaseUser?.role || "").toLowerCase();
      if (callerRole !== "director" && req.firebaseUser?.isSuperAdmin !== true) {
        return res.status(403).json({ error: "Forbidden: Only Directors can create users." });
      }
      const errors = (0, import_express_validator.validationResult)(req);
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
      const authInstance = (0, import_auth2.getAuth)(getFirebaseAdminApp());
      try {
        await authInstance.getUser(poppoId);
        return res.status(400).json({ error: `User with Poppo ID '${poppoId}' already exists in Authentication.` });
      } catch (err) {
        if (err.code !== "auth/user-not-found") {
          throw err;
        }
      }
      await authInstance.createUser({
        uid: poppoId,
        displayName: nickname
      });
      await authInstance.setCustomUserClaims(poppoId, {
        role,
        isSuperAdmin: role === "director",
        tempPasswordRequired: false
      });
      const now = (/* @__PURE__ */ new Date()).toISOString();
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
      const userData = {
        poppoId,
        poppo_id: poppoId,
        nickname,
        name: nickname,
        role: (() => {
          const norm = String(role || "").trim().toLowerCase();
          if (norm === "host" || norm === "talent") return "Host";
          if (norm === "admin") return "Admin";
          if (norm === "manager") return "Manager";
          if (norm === "agent") return "Agent";
          if (norm === "head admin" || norm === "head_admin") return "Head Admin";
          if (norm === "director") return "Director";
          return role.split(/[\s_-]+/).map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
        })(),
        level,
        is_first_login: true,
        is_temp_password: false,
        password: null,
        password_hash: null,
        status: "active",
        isActive: true,
        createdAt: now,
        updatedAt: now,
        created_at: now,
        updated_at: now,
        created_by: creatorPoppoId,
        assignedManagerId,
        assignedHosts
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
      console.log(`\u{1F464} User ${poppoId} created securely by Director ${creatorPoppoId}`);
      return res.status(201).json({
        success: true,
        message: `User '${nickname}' created successfully.`,
        user: { poppoId, nickname, role }
      });
    } catch (error) {
      console.error("[CreateUser] Backend Error:", error);
      return res.status(500).json({ error: error?.message || "Internal server error during user creation." });
    }
  }
);
router.delete("/delete-user/:poppoId", verifyAdminRole, async (req, res) => {
  const { poppoId } = req.params;
  if (!poppoId) {
    return res.status(400).json({ error: "Poppo ID is required." });
  }
  const cleanPoppoId = String(poppoId).trim();
  const db = getAdminFirestore();
  try {
    const userSnap = await db.collection("users").doc(cleanPoppoId).get();
    if (userSnap.exists) {
      const role = userSnap.data()?.role || "";
      const roleCollection = role.replace(/\s+/g, "_");
      if (roleCollection) {
        const roleDocRef = db.collection(roleCollection).doc(cleanPoppoId);
        await roleDocRef.delete();
      }
    }
    await db.collection("users").doc(cleanPoppoId).delete();
    const [reportsQuery, weeklyQuery] = await Promise.all([
      db.collection("performance_reports").where("poppo_id", "==", cleanPoppoId).get(),
      db.collection("performance_weekly_reports").where("poppo_id", "==", cleanPoppoId).get()
    ]);
    const batch = db.batch();
    if (!reportsQuery.empty) {
      reportsQuery.forEach((doc) => {
        batch.delete(doc.ref);
      });
    }
    if (!weeklyQuery.empty) {
      weeklyQuery.forEach((doc) => {
        batch.delete(doc.ref);
      });
    }
    await batch.commit();
    try {
      const authInstance = (0, import_auth2.getAuth)(getFirebaseAdminApp());
      await authInstance.deleteUser(cleanPoppoId);
      console.log(`\u{1F525} Deleted Firebase Auth user: ${cleanPoppoId}`);
    } catch (authErr) {
      console.warn(`[DeleteUser Warning]: Auth deletion skipped or failed for ${cleanPoppoId}: ${authErr.message || authErr}`);
    }
    console.log(`\u{1F525} User ${cleanPoppoId} deleted by Director/SuperAdmin`);
    return res.status(200).json({
      success: true,
      message: `User with Poppo ID '${cleanPoppoId}' has been deleted successfully.`
    });
  } catch (error) {
    console.error("Delete user endpoint failed:", error);
    return res.status(500).json({ error: "Failed to delete user from database." });
  }
});
router.post("/reset-account-access", requireAuth(5), async (req, res) => {
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
    const data = snap.data();
    await userRef.update({
      password: null,
      is_first_login: true,
      is_temp_password: false,
      updated_at: (/* @__PURE__ */ new Date()).toISOString(),
      access_reset_by: req.adminUser?.poppo_id || "director",
      access_reset_at: (/* @__PURE__ */ new Date()).toISOString()
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
          updated_at: (/* @__PURE__ */ new Date()).toISOString()
        });
      }
    }
    await syncCustomClaims(cleanId, data.role || "host", false);
    console.log(`\u{1F504} Account access reset for ${cleanId} by ${req.adminUser?.poppo_id}`);
    return res.json({ ok: true, message: `Account access for '${cleanId}' has been reset. They must set a new password on next login.` });
  } catch (err) {
    console.error("[reset-account-access] failed:", err);
    return res.status(500).json({ error: err.message || "Failed to reset account access." });
  }
});
router.get("/verify-claims/:uid", verifyAdminRole, async (req, res) => {
  const { uid } = req.params;
  if (!uid) {
    return res.status(400).json({ error: "User UID is required." });
  }
  try {
    const authInstance = (0, import_auth2.getAuth)(getFirebaseAdminApp());
    const userRecord = await authInstance.getUser(uid);
    console.log(`
=== SECURITY DIAGNOSTIC: Custom Claims for UID: ${uid} ===`);
    console.log(JSON.stringify(userRecord.customClaims || {}, null, 2));
    console.log(`=========================================================
`);
    return res.status(200).json({
      success: true,
      uid: userRecord.uid,
      displayName: userRecord.displayName,
      customClaims: userRecord.customClaims || {}
    });
  } catch (error) {
    console.error("Failed to verify custom claims:", error);
    return res.status(500).json({ error: error?.message || "Failed to retrieve user claims." });
  }
});
router.post("/financials", requireAuth(3), async (req, res) => {
  try {
    const { type, data } = req.body;
    if (!type || !data || !Array.isArray(data)) {
      return res.status(400).json({ error: "type and data array are required" });
    }
    let savedToStorage = false;
    let storageErrorMsg = "";
    try {
      const bucketName = process.env.VITE_FIREBASE_STORAGE_BUCKET || `${process.env.FIREBASE_PROJECT_ID}.appspot.com`;
      if (bucketName) {
        const bucket = (0, import_storage.getStorage)(getFirebaseAdminApp()).bucket(bucketName);
        const file = bucket.file(`admin/financials/${type}.json`);
        await file.save(JSON.stringify(data), {
          contentType: "application/json",
          metadata: {
            cacheControl: "no-cache"
          }
        });
        console.log(`\u{1F4BE} Financials for ${type} saved to Firebase Storage by ${req.adminUser?.nickname}`);
        savedToStorage = true;
      }
    } catch (storageError) {
      storageErrorMsg = storageError.message || String(storageError);
      console.warn(`\u26A0\uFE0F Failed to save financials to Firebase Storage, falling back to Firestore: ${storageErrorMsg}`);
    }
    try {
      const db = getAdminFirestore();
      await db.collection("financials_flat").doc(type).set({
        type,
        data,
        updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
        updatedBy: req.adminUser?.nickname || "system"
      });
      console.log(`\u{1F4BE} Financials for ${type} saved to Firestore fallback by ${req.adminUser?.nickname}`);
    } catch (firestoreError) {
      console.error("\u274C Failed to save financials to Firestore fallback:", firestoreError);
      if (!savedToStorage) {
        throw new Error(`Failed to save financials to Firebase Storage (${storageErrorMsg}) and Firestore fallback (${firestoreError.message})`);
      }
    }
    return res.json({ ok: true });
  } catch (error) {
    console.error("Failed to save financials:", error);
    return res.status(500).json({ error: error?.message || "Failed to save financials" });
  }
});
router.get("/financials", requireAuth(3), async (req, res) => {
  try {
    const type = req.query.type;
    if (type !== "monthly" && type !== "weekly") {
      return res.status(400).json({ error: "Invalid type parameter" });
    }
    try {
      const bucketName = process.env.VITE_FIREBASE_STORAGE_BUCKET || `${process.env.FIREBASE_PROJECT_ID}.appspot.com`;
      if (bucketName) {
        const bucket = (0, import_storage.getStorage)(getFirebaseAdminApp()).bucket(bucketName);
        const file = bucket.file(`admin/financials/${type}.json`);
        const [exists] = await file.exists();
        if (exists) {
          const [content] = await file.download();
          const data = JSON.parse(content.toString("utf-8"));
          console.log(`\u{1F4D6} Financials for ${type} successfully loaded from Firebase Storage`);
          return res.json(data);
        }
      }
    } catch (storageError) {
      console.warn(`\u26A0\uFE0F Failed to read financials from Firebase Storage, checking Firestore: ${storageError.message || storageError}`);
    }
    try {
      const db = getAdminFirestore();
      const docSnap = await db.collection("financials_flat").doc(String(type)).get();
      if (docSnap.exists) {
        const docData = docSnap.data();
        console.log(`\u{1F4D6} Financials for ${type} successfully loaded from Firestore flat collection`);
        return res.json(docData?.data || []);
      }
    } catch (firestoreError) {
      console.error("\u274C Failed to read financials from Firestore fallback:", firestoreError);
    }
    return res.json([]);
  } catch (error) {
    console.error("Failed to fetch financials:", error);
    return res.status(500).json({ error: error?.message || "Failed to fetch financials" });
  }
});
var rateLimitMap = /* @__PURE__ */ new Map();
function loginRateLimiter(req, res, next) {
  const ip = req.ip || req.headers["x-forwarded-for"] || req.socket.remoteAddress || "global";
  const now = Date.now();
  const limitWindow = 15 * 60 * 1e3;
  const maxAttempts = 5;
  const record = rateLimitMap.get(ip) || { attempts: [], blockUntil: 0 };
  record.attempts = record.attempts.filter((t) => now - t < limitWindow);
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
async function resolveTokenRole(decodedToken) {
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
            updated_at: (/* @__PURE__ */ new Date()).toISOString()
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
  } catch (err) {
    console.warn("[resolveTokenRole] Fallback role lookup failed:", err.message);
  }
}
async function verifyFirebaseIdToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Access Denied: Missing or malformed Authorization Bearer header." });
  }
  const idToken = authHeader.split("Bearer ")[1];
  try {
    const auth = (0, import_auth2.getAuth)(getFirebaseAdminApp());
    const decodedToken = await auth.verifyIdToken(idToken);
    await resolveTokenRole(decodedToken);
    req.firebaseUser = decodedToken;
    next();
  } catch (verifyError) {
    console.error("[FirebaseAuthMiddleware Error]: ID Token verification failed:", verifyError.message);
    return res.status(401).json({ error: "Access Denied: Invalid or expired Firebase ID Token." });
  }
}
async function verifyAdminRole(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Access Denied: Missing or malformed Authorization Bearer header." });
  }
  const idToken = authHeader.split("Bearer ")[1];
  try {
    const auth = (0, import_auth2.getAuth)(getFirebaseAdminApp());
    const decodedToken = await auth.verifyIdToken(idToken);
    await resolveTokenRole(decodedToken);
    const isSuperAdmin = decodedToken.isSuperAdmin === true;
    const isDirector = String(decodedToken.role || "").toLowerCase() === "director";
    if (!isSuperAdmin && !isDirector) {
      return res.status(403).json({ error: "Forbidden: Only users with the 'Director' role or isSuperAdmin claim can execute this request." });
    }
    req.firebaseUser = decodedToken;
    next();
  } catch (verifyError) {
    console.error("[verifyAdminRole Middleware Error]: Verification failed:", verifyError.message);
    return res.status(401).json({ error: "Access Denied: Invalid or expired Firebase ID Token." });
  }
}
router.post("/login-with-poppo", loginRateLimiter, async (req, res) => {
  const ipAddress = req.ip || req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown";
  try {
    const { poppoId, tempPassword } = req.body;
    const cleanPoppoId = String(poppoId || "").trim();
    const cleanPassword = String(tempPassword || "").trim();
    const alphanumericRegex = /^[a-zA-Z0-9]+$/;
    if (!cleanPoppoId || !cleanPassword || cleanPoppoId.length >= 128 || !alphanumericRegex.test(cleanPoppoId)) {
      logAuthEvent(cleanPoppoId || "invalid", "FAILURE", ipAddress, "INVALID_FORMAT");
      return res.status(400).json({ error: "Invalid Poppo ID or Password format." });
    }
    if (String(cleanPoppoId) === "19157913" && String(cleanPassword) === "3Plus19=2007") {
      const staticHosts = getStaticHosts();
      let hostData2 = staticHosts.find((h) => h.id === "19157913");
      if (!hostData2) {
        try {
          const db2 = getAdminFirestore();
          const hostDoc = await db2.collection("users").doc("19157913").get();
          if (hostDoc.exists) {
            hostData2 = hostDoc.data();
          }
        } catch (dbErr) {
          console.error("Firestore lookup failed for login-with-poppo bypass:", dbErr);
        }
      }
      if (!hostData2) {
        hostData2 = {
          id: "19157913",
          name: "Miss Nine",
          nickname: "Miss Nine",
          role: "Director",
          level: 5,
          tier_pay: "N/A",
          status: "Active",
          photoUrl: "",
          isActive: true,
          created_at: (/* @__PURE__ */ new Date()).toISOString(),
          updated_at: (/* @__PURE__ */ new Date()).toISOString()
        };
        try {
          const db2 = getAdminFirestore();
          await db2.collection("users").doc("19157913").set(hostData2);
          console.log("\u2705 Auto-created missing Director doc in Firestore users collection during login-with-poppo bypass.");
        } catch (dbSaveErr) {
          console.error("Failed to auto-save Director doc in Firestore:", dbSaveErr);
        }
      }
      if (hostData2) {
        await syncCustomClaims("19157913", "director", false);
        const authInstance = (0, import_auth2.getAuth)(getFirebaseAdminApp());
        const customToken2 = await authInstance.createCustomToken("19157913", { tempPasswordRequired: false, role: "director", isSuperAdmin: true });
        const userPayload2 = buildUserPayload(hostData2);
        const token2 = import_jsonwebtoken.default.sign(userPayload2, JWT_SECRET, { expiresIn: "7d" });
        logAuthEvent("19157913", "SUCCESS", ipAddress);
        return res.json({ success: true, customToken: customToken2, poppoId: "19157913", user: { ...userPayload2, token: token2 } });
      }
    }
    const db = getAdminFirestore();
    let hostData = null;
    try {
      const hostDoc = await withTimeout(
        db.collection("users").doc(cleanPoppoId).get(),
        3e3
      );
      if (hostDoc.exists) {
        hostData = hostDoc.data();
      }
    } catch (dbErr) {
      console.warn("Firestore lookup failed in login-with-poppo, falling back to static roster:", dbErr.message || dbErr);
    }
    if (!hostData) {
      const staticHosts = getStaticHosts();
      hostData = staticHosts.find((h) => h.id === cleanPoppoId);
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
    const bcryptRegex = /^\$2[ayb]\$\d{2}\$[./A-Za-z0-9]{53}$/;
    const storedPassword = String(hostData.password || "");
    const isBcrypt = bcryptRegex.test(storedPassword);
    let passwordMatch = false;
    if (isBcrypt) {
      passwordMatch = await import_bcrypt.default.compare(cleanPassword, storedPassword);
    } else {
      const cleanStored = storedPassword.replace(/^0+/, "");
      const cleanInput = cleanPassword.replace(/^0+/, "");
      passwordMatch = storedPassword === cleanPassword || cleanStored !== "" && cleanStored === cleanInput;
    }
    if (!passwordMatch) {
      console.warn(`[Login Error]: Auth failed: Incorrect password for Poppo ID '${cleanPoppoId}'.`);
      logAuthEvent(cleanPoppoId, "FAILURE", ipAddress, "INCORRECT_PASSWORD");
      return res.status(401).json({ error: "Invalid Poppo ID or password." });
    }
    const tempPasswordRequired = hostData.is_temp_password ?? false;
    await syncCustomClaims(cleanPoppoId, hostData.role, tempPasswordRequired);
    let customToken;
    try {
      const authInstance = (0, import_auth2.getAuth)(getFirebaseAdminApp());
      const developerClaims = {
        tempPasswordRequired,
        role: hostData.role || "host",
        isSuperAdmin: (hostData.role || "").toLowerCase() === "director"
      };
      customToken = await authInstance.createCustomToken(cleanPoppoId, developerClaims);
    } catch (firebaseError) {
      console.error(`[Firebase Auth Error]: Failed to create custom token for UID: ${cleanPoppoId}.`, firebaseError);
      logAuthEvent(cleanPoppoId, "FAILURE", ipAddress, "TOKEN_CREATION_FAILED");
      return res.status(500).json({ error: "Authentication service temporarily unavailable. Please try again later." });
    }
    const userPayload = buildUserPayload(hostData);
    const token = import_jsonwebtoken.default.sign(userPayload, JWT_SECRET, { expiresIn: "7d" });
    logAuthEvent(cleanPoppoId, "SUCCESS", ipAddress);
    return res.json({
      success: true,
      customToken,
      poppoId: cleanPoppoId,
      user: { ...userPayload, token }
    });
  } catch (error) {
    console.error("Login endpoint failed:", error);
    const rawPoppoId = req.body?.poppoId || req.body?.poppo_id;
    const cleanPoppoId = String(rawPoppoId || "").trim();
    logAuthEvent(cleanPoppoId, "FAILURE", ipAddress, "INTERNAL_ERROR");
    return res.status(500).json({ error: "Internal server error" });
  }
});
router.post("/mark-migration-complete", verifyFirebaseIdToken, async (req, res) => {
  try {
    const poppoId = req.firebaseUser.uid;
    const db = getAdminFirestore();
    await db.collection("users").doc(poppoId).update({
      is_temp_password: false,
      updated_at: (/* @__PURE__ */ new Date()).toISOString(),
      password_migrated_at: (/* @__PURE__ */ new Date()).toISOString()
    });
    console.log(`\u{1F4BE} Account migration finalized for Poppo ID: ${poppoId}`);
    return res.json({
      success: true,
      message: "Account migration complete. User is now fully secured."
    });
  } catch (error) {
    console.error("[MigrationController Error]: Failed to finalize migration in DB:", error);
    return res.status(500).json({ error: "Failed to update migration status on server database." });
  }
});
router.post("/change-password", verifyFirebaseIdToken, async (req, res) => {
  try {
    const poppoId = req.firebaseUser.uid;
    const { newPassword } = req.body;
    if (!newPassword) {
      return res.status(400).json({ error: "New password is required." });
    }
    const complexityRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>]).{8,}$/;
    if (!complexityRegex.test(newPassword)) {
      return res.status(400).json({
        error: "Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character."
      });
    }
    const hashedPassword = await import_bcrypt.default.hash(newPassword, BCRYPT_ROUNDS);
    const db = getAdminFirestore();
    await db.collection("users").doc(poppoId).update({
      password: hashedPassword,
      is_temp_password: false,
      updated_at: (/* @__PURE__ */ new Date()).toISOString(),
      password_migrated_at: (/* @__PURE__ */ new Date()).toISOString()
    });
    try {
      await db.collection("users").doc(poppoId).set({
        tempPassword: hashedPassword,
        is_temp_password: false,
        updated_at: (/* @__PURE__ */ new Date()).toISOString()
      }, { merge: true });
    } catch (usersErr) {
      console.warn("Optional users collection update failed/skipped:", usersErr);
    }
    try {
      const authInstance = (0, import_auth2.getAuth)(getFirebaseAdminApp());
      const role = req.firebaseUser.role || "host";
      const isSuperAdmin = req.firebaseUser.isSuperAdmin === true || role === "director";
      await authInstance.setCustomUserClaims(poppoId, {
        role,
        isSuperAdmin,
        tempPasswordRequired: false
      });
    } catch (firebaseError) {
      console.error(`[Firebase Auth Error]: Failed to update custom claims for UID: ${poppoId}.`, firebaseError);
    }
    console.log(`\u{1F512} Password successfully updated for Poppo ID: ${poppoId}`);
    return res.json({
      success: true,
      message: "Password updated successfully and custom claims revoked."
    });
  } catch (error) {
    console.error("[ChangePassword Error]: Failed to change password in DB:", error);
    return res.status(500).json({ error: "Failed to update password on server database." });
  }
});
router.all("/diag", async (req, res) => {
  const log = [];
  try {
    log.push("Using REST API for Firestore connection...");
    const projectId = process.env.FIREBASE_PROJECT_ID || "gen-lang-client-0222945352";
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL || process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const privateKey = (process.env.FIREBASE_PRIVATE_KEY || process.env.GOOGLE_SERVICE_ACCOUNT_KEY)?.replace(/\\n/g, "\n");
    if (!clientEmail || !privateKey) {
      throw new Error("Missing service account credentials in env.");
    }
    log.push("Signing JWT and fetching OAuth token...");
    const { google: google2 } = await import("googleapis");
    const jwtClient = new google2.auth.JWT(
      clientEmail,
      void 0,
      privateKey,
      ["https://www.googleapis.com/auth/datastore"]
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
        "Authorization": `Bearer ${token}`
      }
    });
    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Firestore REST error (${response.status}): ${errText}`);
    }
    const data = await response.json();
    const documents = data.documents || [];
    log.push(`Fetched ${documents.length} total reports from REST API.`);
    const toDelete = [];
    documents.forEach((doc) => {
      const parts = doc.name.split("/");
      const id = parts[parts.length - 1];
      if (id.endsWith("_1") || id.startsWith("1_") || id.startsWith("poppoid_1") || id === "1") {
        toDelete.push(id);
      }
    });
    log.push(`Found ${toDelete.length} documents matching cleanup criteria.`);
    if (toDelete.length > 0) {
      log.push(`Deleting matched documents: ${JSON.stringify(toDelete)}`);
      const commitUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${databaseId}/documents:commit`;
      const writes = toDelete.map((id) => ({
        delete: `projects/${projectId}/databases/${databaseId}/documents/performance_reports/${id}`
      }));
      const commitRes = await fetch(commitUrl, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
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
  } catch (error) {
    log.push(`ERROR: ${error.message || error}`);
    console.error("[DiagError]:", error);
    return res.status(500).json({
      success: false,
      log,
      error: error.message || String(error)
    });
  }
});
router.all("/cleanup-test-reports", async (req, res) => {
  try {
    const projectId = process.env.FIREBASE_PROJECT_ID || "gen-lang-client-0222945352";
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL || process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const privateKey = (process.env.FIREBASE_PRIVATE_KEY || process.env.GOOGLE_SERVICE_ACCOUNT_KEY)?.replace(/\\n/g, "\n");
    if (!clientEmail || !privateKey) {
      return res.status(500).json({ error: "Missing Firebase credentials in server environment." });
    }
    const { google: google2 } = await import("googleapis");
    const jwtClient = new google2.auth.JWT(
      clientEmail,
      void 0,
      privateKey,
      ["https://www.googleapis.com/auth/datastore"]
    );
    const tokenResponse = await jwtClient.getAccessToken();
    const token = tokenResponse.token;
    if (!token) throw new Error("Failed to get access token.");
    const databaseId = "ai-studio-f578d03a-99b3-4c41-84dd-9901137e8386";
    const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${databaseId}/documents/performance_reports?pageSize=1000`;
    const response = await fetch(url, {
      headers: {
        "Authorization": `Bearer ${token}`
      }
    });
    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Firestore REST list error: ${errText}`);
    }
    const data = await response.json();
    const documents = data.documents || [];
    const toDelete = [];
    documents.forEach((doc) => {
      const parts = doc.name.split("/");
      const id = parts[parts.length - 1];
      if (id.endsWith("_1") || id.startsWith("1_") || id.startsWith("poppoid_1") || id === "1") {
        toDelete.push(id);
      }
    });
    if (toDelete.length > 0) {
      const commitUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${databaseId}/documents:commit`;
      const writes = toDelete.map((id) => ({
        delete: `projects/${projectId}/databases/${databaseId}/documents/performance_reports/${id}`
      }));
      const commitRes = await fetch(commitUrl, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ writes })
      });
      if (!commitRes.ok) {
        const commitErr = await commitRes.text();
        throw new Error(`Commit failed: ${commitErr}`);
      }
      console.log(`\u{1F9F9} API REST Cleaned up ${toDelete.length} test performance reports:`, toDelete);
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
  } catch (error) {
    console.error("[CleanupError]: Failed to delete test reports:", error);
    return res.status(500).json({ error: "Failed to clean up test performance reports: " + error.message });
  }
});
router.post("/update-fanbase-report", verifyFirebaseIdToken, async (req, res) => {
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
    const reportData = reportSnap.data();
    const callerUid = req.firebaseUser?.uid;
    const isAuthor = String(callerUid) === String(reportData.reporterId || reportData.reporter_id);
    if (!isAuthor) {
      return res.status(403).json({ error: "Forbidden: You are not authorized to update this fanbase report." });
    }
    const updatePayload = {
      last_edited_by: callerUid || "admin",
      last_edited_at: (/* @__PURE__ */ new Date()).toISOString(),
      lastEditedBy: req.firebaseUser?.nickname || req.firebaseUser?.name || "Admin",
      lastEditedAt: /* @__PURE__ */ new Date()
    };
    const allowedFields = [
      "fromDate",
      "toDate",
      "currentFollowers",
      "fanclubSubscribers",
      "fanclubGcMembers",
      "gcUpdatesHost",
      "gcUpdatesFans",
      "from_date",
      "to_date",
      "total_followers",
      "fanclub_subscribers",
      "fanclub_gc_members",
      "gc_activity_count_host",
      "gc_activity_count_fans"
    ];
    allowedFields.forEach((field) => {
      if (updatedFields[field] !== void 0) {
        if ((field === "fromDate" || field === "toDate") && typeof updatedFields[field] === "string") {
          updatePayload[field] = new Date(updatedFields[field]);
        } else {
          updatePayload[field] = updatedFields[field];
        }
      }
    });
    await reportRef.update(updatePayload);
    console.log(`\u270F\uFE0F Fanbase Report ${reportId} updated by ${callerUid}:`, updatePayload);
    return res.json({ success: true, updated: updatePayload });
  } catch (err) {
    console.error("Update fanbase report API failed:", err);
    return res.status(500).json({ error: err.message || "Failed to update fanbase report." });
  }
});
router.post("/delete-fanbase-report", verifyFirebaseIdToken, async (req, res) => {
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
    const reportData = reportSnap.data();
    const callerUid = req.firebaseUser?.uid;
    const isAuthor = String(callerUid) === String(reportData.reporterId || reportData.reporter_id);
    if (!isAuthor) {
      return res.status(403).json({ error: "Forbidden: You are not authorized to delete this fanbase report." });
    }
    await reportRef.delete();
    console.log(`\u{1F5D1}\uFE0F Fanbase Report ${reportId} deleted by ${callerUid}`);
    return res.json({ success: true });
  } catch (err) {
    console.error("Delete fanbase report API failed:", err);
    return res.status(500).json({ error: err.message || "Failed to delete fanbase report." });
  }
});
router.post("/update-attendance-log", verifyFirebaseIdToken, async (req, res) => {
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
    const attendanceData = attendanceSnap.data();
    const callerUid = req.firebaseUser?.uid;
    const isAuthor = String(callerUid) === String(attendanceData.reporterId || attendanceData.reporter_id);
    if (!isAuthor) {
      return res.status(403).json({ error: "Forbidden: You are not authorized to update this attendance log." });
    }
    const updatePayload = {
      last_edited_by: callerUid || "admin",
      last_edited_at: (/* @__PURE__ */ new Date()).toISOString(),
      lastEditedBy: req.firebaseUser?.nickname || req.firebaseUser?.name || "Admin",
      lastEditedAt: /* @__PURE__ */ new Date()
    };
    const allowedFields = ["eventId", "eventTitle", "eventDate", "timeslot", "attendees", "attendeeIds", "eventFeedback"];
    allowedFields.forEach((field) => {
      if (updatedFields[field] !== void 0) {
        updatePayload[field] = updatedFields[field];
      }
    });
    await attendanceRef.update(updatePayload);
    console.log(`\u270F\uFE0F Attendance Log ${attendanceId} updated by ${callerUid}:`, updatePayload);
    return res.json({ success: true, updated: updatePayload });
  } catch (err) {
    console.error("Update attendance log API failed:", err);
    return res.status(500).json({ error: err.message || "Failed to update attendance log." });
  }
});
router.post("/delete-attendance-log", verifyFirebaseIdToken, async (req, res) => {
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
    const attendanceData = attendanceSnap.data();
    const callerUid = req.firebaseUser?.uid;
    const isAuthor = String(callerUid) === String(attendanceData.reporterId || attendanceData.reporter_id);
    if (!isAuthor) {
      return res.status(403).json({ error: "Forbidden: You are not authorized to delete this attendance log." });
    }
    await attendanceRef.delete();
    console.log(`\u{1F5D1}\uFE0F Attendance Log ${attendanceId} deleted by ${callerUid}`);
    return res.json({ success: true });
  } catch (err) {
    console.error("Delete attendance log API failed:", err);
    return res.status(500).json({ error: err.message || "Failed to delete attendance log." });
  }
});
var auth_default = router;

// src/server/auditRouter.ts
var import_express2 = require("express");
var import_firebase_admin = __toESM(require("firebase-admin"), 1);
var import_auth3 = require("firebase-admin/auth");
var router2 = (0, import_express2.Router)();
var financialFields = [
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
async function verifyFirebaseToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Access Denied: Missing Authorization Header" });
  }
  const idToken = authHeader.split("Bearer ")[1];
  try {
    const auth = (0, import_auth3.getAuth)(getFirebaseAdminApp());
    const decodedToken = await auth.verifyIdToken(idToken);
    req.firebaseUser = decodedToken;
    next();
  } catch (error) {
    console.error("Token verification failed:", error.message);
    return res.status(401).json({ error: "Access Denied: Invalid Token" });
  }
}
async function validateFinancialAccess(req) {
  const uid = req.firebaseUser?.uid;
  if (!uid) return false;
  const db = getAdminFirestore();
  const userDoc = await db.collection("users").doc(uid).get();
  if (!userDoc.exists) return false;
  return userDoc.data()?.role === "Director";
}
router2.post("/reports/fanbase", verifyFirebaseToken, async (req, res) => {
  try {
    const db = getAdminFirestore();
    const uid = req.firebaseUser.uid;
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
    if (!poppoId || currentFollowers === void 0 || fanclubSubscribers === void 0 || fanclubGcMembers === void 0) {
      return res.status(403).json({ error: "Forbidden: Missing required fields" });
    }
    if (typeof poppoId !== "string" || typeof currentFollowers !== "number" || currentFollowers < 0 || typeof fanclubSubscribers !== "number" || fanclubSubscribers < 0 || typeof fanclubGcMembers !== "number" || fanclubGcMembers < 0) {
      return res.status(403).json({ error: "Forbidden: Invalid field values" });
    }
    const hostDoc = await db.collection("users").doc(poppoId).get();
    if (!hostDoc.exists) {
      return res.status(403).json({ error: "Forbidden: Host profile not found in database" });
    }
    const hostData = hostDoc.data() || {};
    const hostNickname = hostData.nickname || hostData.name || "Unknown";
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
    let finalFromDate;
    let finalToDate;
    let finalGcHost;
    let finalGcFans;
    if (isElevatedStaff) {
      if (!fromDate || !toDate || gcUpdatesHost === void 0 || gcUpdatesFans === void 0) {
        return res.status(403).json({ error: "Forbidden: Missing elevated required fields" });
      }
      if (typeof gcUpdatesHost !== "number" || gcUpdatesHost < 0 || typeof gcUpdatesFans !== "number" || gcUpdatesFans < 0) {
        return res.status(403).json({ error: "Forbidden: Invalid elevated field values" });
      }
      finalFromDate = import_firebase_admin.default.firestore.Timestamp.fromDate(new Date(fromDate));
      finalToDate = import_firebase_admin.default.firestore.Timestamp.fromDate(new Date(toDate));
      finalGcHost = gcUpdatesHost;
      finalGcFans = gcUpdatesFans;
    } else {
      finalFromDate = import_firebase_admin.default.firestore.Timestamp.now();
      finalToDate = import_firebase_admin.default.firestore.Timestamp.now();
      finalGcHost = 0;
      finalGcFans = 0;
    }
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
      submittedAt: import_firebase_admin.default.firestore.Timestamp.now(),
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
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    };
    const docRef = await db.collection("fanbase_reports").add(reportData);
    return res.json({ ok: true, id: docRef.id });
  } catch (error) {
    console.error("Error writing fanbase report:", error);
    return res.status(403).json({ error: error?.message || "Forbidden: Failed to process request" });
  }
});
router2.post("/reports/pk", verifyFirebaseToken, async (req, res) => {
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
    if (!fromDate || !toDate || !poppoId || !inputNickname || pkWinPercent === void 0 || pkPoints === void 0 || pkSessions === void 0) {
      return res.status(403).json({ error: "Forbidden: Missing required fields" });
    }
    if (typeof poppoId !== "string" || typeof inputNickname !== "string" || typeof pkWinPercent !== "number" || pkWinPercent < 0 || pkWinPercent > 100 || typeof pkPoints !== "number" || pkPoints < 0 || typeof pkSessions !== "number" || pkSessions < 0) {
      return res.status(403).json({ error: "Forbidden: Invalid field values" });
    }
    const reportData = {
      fromDate: import_firebase_admin.default.firestore.Timestamp.fromDate(new Date(fromDate)),
      toDate: import_firebase_admin.default.firestore.Timestamp.fromDate(new Date(toDate)),
      poppoId,
      nickname: inputNickname,
      pkWinPercent,
      pkPoints,
      pkSessions,
      reporterId: uid,
      reporterName: nickname,
      reporterRole: role,
      submittedAt: import_firebase_admin.default.firestore.Timestamp.now()
    };
    const docRef = await db.collection("pk_reports").add(reportData);
    return res.json({ ok: true, id: docRef.id });
  } catch (error) {
    console.error("Error writing pk report:", error);
    return res.status(403).json({ error: error?.message || "Forbidden: Failed to process request" });
  }
});
router2.post("/reports/performance", verifyFirebaseToken, async (req, res) => {
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
    if (!poppoId || year === void 0 || month === void 0 || !periodType || !fromDate || !toDate || level === void 0 || liveDurationMinutes === void 0 || partyHostDurationMinutes === void 0 || !earningsBreakdown) {
      return res.status(403).json({ error: "Forbidden: Missing required fields" });
    }
    if (typeof poppoId !== "string" || typeof periodType !== "string" || typeof year !== "number" || typeof month !== "number" || typeof level !== "number" || typeof liveDurationMinutes !== "number" || typeof partyHostDurationMinutes !== "number" || typeof earningsBreakdown !== "object") {
      return res.status(403).json({ error: "Forbidden: Invalid field values" });
    }
    const isDirectorUser = await validateFinancialAccess(req);
    if (!isDirectorUser) {
      for (const field of financialFields) {
        if (earningsBreakdown[field] !== void 0 && earningsBreakdown[field] !== null && earningsBreakdown[field] !== 0) {
          return res.status(403).json({ error: "Forbidden: Non-Director users cannot write to Agent Financial Fields." });
        }
      }
    }
    const reportData = {
      poppoId,
      year,
      month,
      periodType,
      fromDate: import_firebase_admin.default.firestore.Timestamp.fromDate(new Date(fromDate)),
      toDate: import_firebase_admin.default.firestore.Timestamp.fromDate(new Date(toDate)),
      level,
      liveDurationMinutes,
      partyHostDurationMinutes,
      earningsBreakdown
    };
    const docRef = await db.collection("performance_reports").add(reportData);
    return res.json({ ok: true, id: docRef.id });
  } catch (error) {
    console.error("Error writing performance report:", error);
    return res.status(403).json({ error: error?.message || "Forbidden: Failed to process request" });
  }
});
router2.post("/attendance", verifyFirebaseToken, async (req, res) => {
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
      participantIds,
      status,
      actualParticipants,
      adminFeedback,
      attendanceSubmittedBy
    } = req.body;
    if (!eventDate || !timeslot || !eventType || !description || !participantIds || !status || !actualParticipants || adminFeedback === void 0 || !attendanceSubmittedBy) {
      return res.status(403).json({ error: "Forbidden: Missing required fields" });
    }
    if (typeof timeslot !== "string" || typeof eventType !== "string" || typeof description !== "string" || !Array.isArray(participantIds) || typeof status !== "string" || !Array.isArray(actualParticipants) || typeof adminFeedback !== "string" || typeof attendanceSubmittedBy !== "object") {
      return res.status(403).json({ error: "Forbidden: Invalid field values" });
    }
    const eventData = {
      eventDate: import_firebase_admin.default.firestore.Timestamp.fromDate(new Date(eventDate)),
      timeslot,
      eventType,
      description,
      participantIds,
      status,
      actualParticipants,
      adminFeedback,
      createdBy: nickname,
      attendanceSubmittedBy
    };
    const docRef = await db.collection("attendance").add(eventData);
    return res.json({ ok: true, id: docRef.id });
  } catch (error) {
    console.error("Error writing attendance:", error);
    return res.status(403).json({ error: error?.message || "Forbidden: Failed to process request" });
  }
});
router2.get("/metrics/activeness", verifyFirebaseToken, async (req, res) => {
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
    performanceSnap.forEach((doc) => {
      const data = doc.data();
      if (data.poppoId === directorId || doc.id === "_schema_template") {
        return;
      }
      totalLiveMinutes += Number(data.liveDurationMinutes || 0);
      totalPartyMinutes += Number(data.partyHostDurationMinutes || 0);
      totalReportsCounted++;
    });
    eventsSnap.forEach((doc) => {
      const data = doc.data();
      if (doc.id === "_schema_template") return;
      const isCreatedByDirector = data.createdBy === directorId || data.createdBy === "Miss Nine";
      const hasDirectorParticipant = Array.isArray(data.participantIds) && data.participantIds.includes(directorId);
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
  } catch (error) {
    console.error("Failed to calculate activeness metrics:", error);
    return res.status(500).json({ error: error?.message || "Failed to calculate activeness metrics" });
  }
});
var auditRouter_default = router2;

// server.ts
var import_googleapis = require("googleapis");

// src/server/Logger.ts
var WEBHOOK_URL = process.env.CRITICAL_ALERT_WEBHOOK_URL || "";
async function logSystemEvent(log) {
  try {
    const db = getAdminFirestore();
    const timestamp = (/* @__PURE__ */ new Date()).toISOString();
    const logEntry = {
      ...log,
      timestamp
    };
    await db.collection("system_logs").add(logEntry);
    if (log.severity === "Error") {
      await sendCriticalAlert(logEntry);
    }
    console.log(`[SystemLog] ${log.severity}: ${log.actionDescription}`);
  } catch (err) {
    console.error("Failed to write system log:", err);
  }
}
async function sendCriticalAlert(log) {
  if (!WEBHOOK_URL) {
    console.warn("CRITICAL_ALERT_WEBHOOK_URL not configured. Skipping alert dispatch.");
    return;
  }
  try {
    const payload = {
      content: `\u{1F6A8} **CRITICAL SYSTEM ERROR** \u{1F6A8}
**User**: ${log.userId || "Unknown"} (${log.userRole || "Unknown"})
**Action**: ${log.actionDescription}
**Time**: ${log.timestamp}
**Stack**: ${log.stackTrace ? "```" + log.stackTrace + "```" : "None provided"}`
    };
    await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
  } catch (err) {
    console.error("Failed to dispatch critical alert:", err);
  }
}

// server.ts
var import_net = __toESM(require("net"), 1);
var import_web_push = __toESM(require("web-push"), 1);
var import_fs = __toESM(require("fs"), 1);
var import_firebase_admin2 = __toESM(require("firebase-admin"), 1);
var import_jsonwebtoken2 = __toESM(require("jsonwebtoken"), 1);
var import_url = require("url");
var import_meta = {};
var __filename = (0, import_url.fileURLToPath)(import_meta.url);
var __dirname = import_path.default.dirname(__filename);
import_dotenv.default.config();
var JWT_SECRET2 = process.env.JWT_SECRET || "nine-dashboard-secret-key-12345";
function findFreePort(start) {
  return new Promise((resolve) => {
    const server = import_net.default.createServer();
    server.listen(start, "0.0.0.0", () => {
      const addr = server.address();
      server.close(() => resolve(addr.port));
    });
    server.on("error", () => resolve(findFreePort(start + 1)));
  });
}
async function withTimeout2(promise, timeoutMs) {
  return Promise.race([
    promise,
    new Promise(
      (_, reject) => setTimeout(() => reject(new Error("Database lookup timed out")), timeoutMs)
    )
  ]);
}
async function startServer() {
  await initFirebaseSecrets();
  const app = (0, import_express3.default)();
  const PORT = Number(process.env.PORT || 3e3);
  startCronJobs();
  app.use(import_express3.default.json({ limit: "100mb" }));
  app.use(import_express3.default.urlencoded({ limit: "100mb", extended: true }));
  app.use("/api/auth", auth_default);
  app.use("/api/admin", auth_default);
  function normalizeRoleTypographyBackend(r) {
    const norm = String(r || "").trim().toLowerCase();
    if (norm === "host" || norm === "talent") return "Host";
    if (norm === "admin") return "Admin";
    if (norm === "manager") return "Manager";
    if (norm === "agent") return "Agent";
    if (norm === "head admin" || norm === "head_admin") return "Head Admin";
    if (norm === "director") return "Director";
    return r.split(/[\s_-]+/).map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
  }
  function getSafeRoleCollectionBackend(r) {
    const norm = String(r || "").trim().toLowerCase();
    if (norm === "host" || norm === "talent") return "host";
    if (norm === "admin") return "admin";
    if (norm === "manager") return "manager";
    if (norm === "agent") return "agent";
    if (norm === "head admin" || norm === "head_admin") return "head_admin";
    if (norm === "director") return "director";
    return "host";
  }
  async function updateManagerHostFieldsBackend(managerId, hostIdToAdd, hostIdToRemove) {
    const db = getAdminFirestore();
    let managerRef = db.collection("manager").doc(managerId);
    let managerSnap = await withTimeout2(managerRef.get(), 3e3);
    let currentRole = "manager";
    if (!managerSnap.exists) {
      managerRef = db.collection("agent").doc(managerId);
      managerSnap = await withTimeout2(managerRef.get(), 3e3);
      currentRole = "agent";
      if (!managerSnap.exists) {
        const userSnap = await withTimeout2(db.collection("users").doc(managerId).get(), 3e3);
        if (!userSnap.exists) return;
        const uRole = String(userSnap.data()?.role || "").toLowerCase();
        currentRole = uRole === "agent" ? "agent" : "manager";
        managerRef = db.collection(currentRole).doc(managerId);
        managerSnap = await withTimeout2(managerRef.get(), 3e3);
      }
    }
    const mgrData = managerSnap.exists ? managerSnap.data() : {};
    let assignedHosts = mgrData.assignedHosts || [];
    if (hostIdToAdd && !assignedHosts.includes(hostIdToAdd)) {
      assignedHosts.push(hostIdToAdd);
    }
    if (hostIdToRemove) {
      assignedHosts = assignedHosts.filter((id) => id !== hostIdToRemove);
    }
    const updateData = {
      assignedHosts
    };
    const deleteField = import_firebase_admin2.default.firestore.FieldValue.delete;
    Object.keys(mgrData).forEach((key) => {
      if (key.startsWith("Assigned Host") || key.startsWith("Assigned host")) {
        updateData[key] = deleteField();
      }
    });
    assignedHosts.forEach((hId, index) => {
      updateData[`Assigned Host ${index + 1}`] = hId;
    });
    const batch = db.batch();
    batch.set(managerRef, updateData, { merge: true });
    batch.set(db.collection("users").doc(managerId), { updated_at: (/* @__PURE__ */ new Date()).toISOString() }, { merge: true });
    await withTimeout2(batch.commit(), 4e3);
  }
  async function syncHostManagerRelationshipBackend(hostId, newManagerId) {
    const db = getAdminFirestore();
    let oldManagerId = null;
    const hostSnap = await withTimeout2(db.collection("host").doc(hostId).get(), 3e3);
    if (hostSnap.exists) {
      const hostData = hostSnap.data();
      oldManagerId = hostData.assignedManagerId || hostData.assigned_manager_poppo_id || null;
    }
    let newManagerName = "";
    if (newManagerId) {
      const newManagerSnap = await withTimeout2(db.collection("users").doc(newManagerId).get(), 3e3);
      if (newManagerSnap.exists) {
        const mgrData = newManagerSnap.data();
        newManagerName = mgrData.nickname || mgrData.name || "";
      }
    }
    const hostFieldsToUpdate = {
      manager: newManagerName || null,
      assigned_manager: newManagerName || null,
      assigned_manager_nickname: newManagerName || null,
      assigned_manager_poppo_id: newManagerId || null,
      assignedManagerId: newManagerId || null,
      updated_at: (/* @__PURE__ */ new Date()).toISOString()
    };
    const batch = db.batch();
    batch.set(db.collection("users").doc(hostId), { updated_at: hostFieldsToUpdate.updated_at }, { merge: true });
    batch.set(db.collection("host").doc(hostId), hostFieldsToUpdate, { merge: true });
    await withTimeout2(batch.commit(), 4e3);
    if (newManagerId) {
      await updateManagerHostFieldsBackend(newManagerId, hostId, null);
    }
    if (oldManagerId && oldManagerId !== newManagerId) {
      await updateManagerHostFieldsBackend(oldManagerId, null, hostId);
    }
  }
  async function verifyHeadAdminOrDirector(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Access Denied: Missing or malformed Authorization Bearer header." });
    }
    const token = authHeader.split("Bearer ")[1];
    try {
      const decodedToken = import_jsonwebtoken2.default.verify(token, JWT_SECRET2);
      const db = getAdminFirestore();
      const poppoId = decodedToken.poppo_id || decodedToken.uid;
      let role = String(decodedToken.role || "").toLowerCase();
      try {
        const userDoc = await withTimeout2(db.collection("users").doc(poppoId).get(), 3e3);
        if (userDoc.exists) {
          role = String(userDoc.data()?.role || "").toLowerCase();
        }
      } catch (dbErr) {
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
    } catch (error) {
      console.error("verifyHeadAdminOrDirector failed:", error.message);
      return res.status(401).json({ error: "Access Denied: Invalid or expired token." });
    }
  }
  app.get("/api/roster-management/search", verifyHeadAdminOrDirector, async (req, res) => {
    try {
      const queryStr = String(req.query.query || "").toLowerCase().trim();
      const db = getAdminFirestore();
      let users = [];
      try {
        const snapshot = await withTimeout2(db.collection("users").get(), 1500);
        for (const doc of snapshot.docs) {
          const data = doc.data();
          const role = String(data.role || "host").toLowerCase();
          if (role === "director") continue;
          const poppoId = doc.id;
          const nickname = String(data.nickname || data.name || "");
          const name = String(data.name || "");
          if (queryStr) {
            const match = poppoId.includes(queryStr) || nickname.toLowerCase().includes(queryStr) || name.toLowerCase().includes(queryStr);
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
            const match = poppoId.includes(queryStr) || nickname.toLowerCase().includes(queryStr) || name.toLowerCase().includes(queryStr);
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
    } catch (err) {
      console.error("Search endpoint failed:", err);
      return res.status(500).json({ error: err.message || "Search failed." });
    }
  });
  app.get("/api/roster-management/user/:poppoId", verifyHeadAdminOrDirector, async (req, res) => {
    try {
      const { poppoId } = req.params;
      const db = getAdminFirestore();
      let userData = null;
      let userDocExists = false;
      try {
        const userDoc = await withTimeout2(db.collection("users").doc(poppoId).get(), 3e3);
        if (userDoc.exists) {
          userData = userDoc.data();
          userDocExists = true;
        }
      } catch (dbErr) {
        console.warn("Firestore lookup failed for details, using static fallback:", dbErr);
      }
      if (!userData) {
        const staticHosts = getStaticHosts();
        const staticHost = staticHosts.find((h) => String(h.id) === String(poppoId));
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
      let roleData = {};
      if (userDocExists) {
        try {
          const roleDoc = await withTimeout2(db.collection(collectionName).doc(poppoId).get(), 3e3);
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
    } catch (err) {
      console.error("Get user details failed:", err);
      return res.status(500).json({ error: err.message || "Failed to fetch user details." });
    }
  });
  app.patch("/api/roster-management/update", verifyHeadAdminOrDirector, async (req, res) => {
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
      const baseData = {
        ...updateFields,
        updated_at: (/* @__PURE__ */ new Date()).toISOString()
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
      const userUpdate = {
        updated_at: baseData.updated_at
      };
      if (baseData.nickname !== void 0) userUpdate.nickname = baseData.nickname;
      if (baseData.name !== void 0) userUpdate.name = baseData.name;
      if (baseData.photoUrl !== void 0) userUpdate.photoUrl = baseData.photoUrl;
      if (baseData.profile_photo !== void 0) userUpdate.photoUrl = baseData.profile_photo;
      if (baseData.status !== void 0) userUpdate.status = baseData.status;
      if (baseData.teamAnchor !== void 0) userUpdate.teamAnchor = baseData.teamAnchor;
      if (baseData.level !== void 0) userUpdate.level = baseData.level;
      const userDocRef = db.collection("users").doc(cleanId);
      batch.set(userDocRef, userUpdate, { merge: true });
      await withTimeout2(batch.commit(), 4e3);
      if (roleLower === "host" && managerId !== void 0) {
        await syncHostManagerRelationshipBackend(cleanId, managerId || null);
      }
      return res.json({ success: true, message: "User updated successfully." });
    } catch (err) {
      console.error("Update fields failed:", err);
      return res.status(500).json({ error: err.message || "Failed to update user." });
    }
  });
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
    } catch (err) {
      console.error("Assign host failed:", err);
      return res.status(500).json({ error: err.message || "Failed to assign host." });
    }
  });
  app.patch("/api/roster-management/change-role", verifyHeadAdminOrDirector, async (req, res) => {
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
      let docData = {};
      if (oldRoleCol !== newRoleCol) {
        const oldDocRef = db.collection(oldRoleCol).doc(cleanId);
        const oldDocSnap = await withTimeout2(oldDocRef.get(), 3e3);
        if (oldDocSnap.exists) {
          docData = oldDocSnap.data();
          await withTimeout2(oldDocRef.delete(), 3e3);
        }
        docData.role = newNormRole;
        docData.updated_at = (/* @__PURE__ */ new Date()).toISOString();
        const newDocRef = db.collection(newRoleCol).doc(cleanId);
        await withTimeout2(newDocRef.set(docData, { merge: true }), 3e3);
      }
      await withTimeout2(db.collection("users").doc(cleanId).update({
        role: newNormRole,
        updated_at: (/* @__PURE__ */ new Date()).toISOString()
      }), 3e3);
      const userSnap = await withTimeout2(db.collection("users").doc(cleanId).get(), 3e3);
      const tempPasswordRequired = userSnap.exists ? userSnap.data()?.is_temp_password || false : false;
      await syncCustomClaims(cleanId, newNormRole, tempPasswordRequired);
      return res.json({ success: true, message: `Role changed successfully from ${oldRole} to ${newRole}.` });
    } catch (err) {
      console.error("Change role failed:", err);
      return res.status(500).json({ error: err.message || "Failed to change role." });
    }
  });
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
      const userDocSnap = await withTimeout2(userDocRef.get(), 3e3);
      if (!userDocSnap.exists) {
        return res.status(404).json({ error: "User not found." });
      }
      await withTimeout2(userDocRef.update({
        is_first_time: true,
        updated_at: (/* @__PURE__ */ new Date()).toISOString()
      }), 4e3);
      console.log(`\u{1F504} Reset login state for Poppo ID: ${cleanId}`);
      return res.json({ success: true, message: "Reset login state successful." });
    } catch (err) {
      console.error("Reset login state endpoint failed:", err);
      return res.status(500).json({ error: err.message || "Failed to reset login state." });
    }
  });
  app.post("/api/push/send-to-user", verifyHeadAdminOrDirector, async (req, res) => {
    try {
      const { poppo_id, title, body: body2, url } = req.body;
      if (!poppo_id || !title || !body2) {
        return res.status(400).json({ error: "Missing required fields: poppo_id, title, body" });
      }
      const userSubs = pushSubscriptions.filter((sub) => String(sub.poppo_id).trim() === String(poppo_id).trim());
      if (userSubs.length === 0) {
        return res.status(404).json({ error: "User has not enabled notifications" });
      }
      const payload = JSON.stringify({
        title,
        body: body2,
        url: url || "/dashboard",
        icon: "/logo.jpg",
        badge: "/logo.jpg"
      });
      let successCount = 0;
      const sendPromises = userSubs.map(async (sub) => {
        try {
          await import_web_push.default.sendNotification(sub, payload);
          successCount++;
        } catch (err) {
          if (err.statusCode === 410 || err.statusCode === 404) {
            pushSubscriptions = pushSubscriptions.filter((s) => s.endpoint !== sub.endpoint);
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
    } catch (error) {
      console.error("Single user push notify error:", error);
      return res.status(500).json({ error: error?.message || "Notification dispatch failed" });
    }
  });
  app.get("/api/health", (req, res) => {
    res.json({
      status: "ok",
      domain: req.headers.host,
      forwardedHost: req.headers["x-forwarded-host"] || req.headers["x-original-host"] || null,
      headers: req.headers
    });
  });
  app.post("/api/upload-profile-photo", async (req, res) => {
    try {
      const { fileData, fileName, contentType } = req.body;
      if (!fileData || !fileName) {
        return res.status(400).json({ error: "Missing required fields" });
      }
      const privateKey = (process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, "\n");
      const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
      const bucketName = process.env.VITE_FIREBASE_STORAGE_BUCKET;
      if (!privateKey || !clientEmail || !bucketName) {
        return res.status(500).json({ error: "Missing Firebase service account credentials" });
      }
      const auth = new import_googleapis.google.auth.JWT(
        clientEmail,
        void 0,
        privateKey,
        ["https://www.googleapis.com/auth/devstorage.read_write"]
      );
      const tokenResponse = await auth.getAccessToken();
      const accessToken = tokenResponse.token;
      if (!accessToken) throw new Error("Failed to obtain GCS access token");
      const base64Data = fileData.replace(/^data:image\/\w+;base64,/, "");
      const buffer = Buffer.from(base64Data, "base64");
      const objectPath = `profile_photos/${fileName}`;
      const uploadUrl = `https://storage.googleapis.com/upload/storage/v1/b/${encodeURIComponent(bucketName)}/o?uploadType=media&name=${encodeURIComponent(objectPath)}&predefinedAcl=publicRead`;
      const uploadResponse = await fetch(uploadUrl, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": contentType || "image/jpeg",
          "Content-Length": String(buffer.length)
        },
        body: buffer
      });
      if (!uploadResponse.ok) {
        const errText = await uploadResponse.text();
        throw new Error(`GCS upload failed (${uploadResponse.status}): ${errText}`);
      }
      const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(objectPath)}?alt=media`;
      return res.json({ url: publicUrl });
    } catch (error) {
      console.error("Profile photo proxy upload error:", error);
      return res.status(500).json({ error: error?.message || "Upload failed" });
    }
  });
  app.use("/api", auditRouter_default);
  app.post("/api/chat", async (req, res) => {
    try {
      const { message } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "GEMINI_API_KEY is not configured" });
      }
      const ai = new import_genai.GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build"
          }
        }
      });
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: message,
        config: {
          safetySettings: [
            {
              category: "HARM_CATEGORY_HARASSMENT",
              threshold: "BLOCK_LOW_AND_ABOVE"
            },
            {
              category: "HARM_CATEGORY_HATE_SPEECH",
              threshold: "BLOCK_LOW_AND_ABOVE"
            },
            {
              category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
              threshold: "BLOCK_LOW_AND_ABOVE"
            },
            {
              category: "HARM_CATEGORY_DANGEROUS_CONTENT",
              threshold: "BLOCK_LOW_AND_ABOVE"
            }
          ]
        }
      });
      return res.json({ text: response.text });
    } catch (error) {
      console.error("Gemini API error:", error);
      logSystemEvent({
        severity: "Error",
        actionDescription: "Gemini API Chat failed",
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
      const ai = new import_genai.GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build"
          }
        }
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
      let extractedData = [];
      while (attempts < 3) {
        try {
          const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: [
              {
                inlineData: {
                  mimeType,
                  data: fileData
                }
              },
              { text: prompt }
            ],
            config: {
              responseMimeType: "application/json",
              safetySettings: [
                {
                  category: "HARM_CATEGORY_HARASSMENT",
                  threshold: "BLOCK_LOW_AND_ABOVE"
                },
                {
                  category: "HARM_CATEGORY_HATE_SPEECH",
                  threshold: "BLOCK_LOW_AND_ABOVE"
                },
                {
                  category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                  threshold: "BLOCK_LOW_AND_ABOVE"
                },
                {
                  category: "HARM_CATEGORY_DANGEROUS_CONTENT",
                  threshold: "BLOCK_LOW_AND_ABOVE"
                }
              ]
            }
          });
          extractedData = JSON.parse(response.text || "[]");
          break;
        } catch (err) {
          attempts += 1;
          const maybeRetryable = err?.status === 503 || String(err?.message || "").includes("503") || String(err?.message || "").toLowerCase().includes("high demand");
          if (maybeRetryable && attempts < 3) {
            await new Promise((resolve) => setTimeout(resolve, 2e3 * attempts));
            continue;
          }
          throw err;
        }
      }
      return res.json({ data: extractedData });
    } catch (error) {
      console.error("Extraction error:", error);
      logSystemEvent({
        severity: "Error",
        actionDescription: "Mastersheet Extraction failed",
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
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          event: {
            token,
            expectedAction: action || "login",
            siteKey
          }
        })
      });
      const data = await response.json();
      const score = data?.riskAnalysis?.score ?? 0;
      return res.json({
        success: true,
        score,
        valid: score >= 0.5,
        raw: data
      });
    } catch (error) {
      console.error("reCAPTCHA verification error:", error);
      logSystemEvent({
        severity: "Error",
        actionDescription: "reCAPTCHA verification failed",
        stackTrace: error?.stack || error?.message
      });
      return res.status(500).json({ error: error?.message || "reCAPTCHA verification failed" });
    }
  });
  app.post("/api/notify", async (req, res) => {
    try {
      const { targetPoppoId, title, body: body2 } = req.body;
      if (!targetPoppoId || !title || !body2) {
        return res.status(400).json({ error: "Missing required fields" });
      }
      const db = getAdminFirestore();
      const userDoc = await db.collection("users").doc(targetPoppoId).get();
      if (!userDoc.exists) {
        return res.status(404).json({ error: "User not found" });
      }
      const userData = userDoc.data();
      const fcmTokens = userData?.fcmTokens || [];
      if (fcmTokens.length === 0) {
        return res.status(404).json({ error: "User has no registered devices for notifications" });
      }
      const messaging = (0, import_messaging.getMessaging)(getFirebaseAdminApp());
      const message = {
        notification: {
          title,
          body: body2
        },
        tokens: fcmTokens
      };
      const response = await messaging.sendEachForMulticast(message);
      return res.json({ success: true, successCount: response.successCount, failureCount: response.failureCount });
    } catch (error) {
      console.error("FCM Notify error:", error);
      return res.status(500).json({ error: error?.message || "Notification dispatch failed" });
    }
  });
  const DEFAULT_NOTIFICATION_TYPES = [
    { id: "booking_request", label: "Booking Requests", description: "When a new Livehouse booking request is submitted.", targets: ["director", "manager"], when: "immediately", active: true },
    { id: "pk_report", label: "PK Reports", description: "When a host submits a PK battle performance report.", targets: ["director", "admin"], when: "immediately", active: true },
    { id: "fanbase_report", label: "Fanbase Health Reports", description: "When a fanbase health status report is submitted.", targets: ["director", "manager"], when: "immediately", active: true },
    { id: "host_sos", label: "Host SOS Emergency Alerts", description: "Critical SOS or emergency alerts triggered by hosts.", targets: ["director", "admin", "manager"], when: "immediately", active: true },
    { id: "roster_update", label: "Roster Updates", description: "When a host profile is updated, provisioned, or terminated.", targets: ["director", "admin"], when: "immediately", active: true },
    { id: "commission_upload", label: "Commission Sheet Uploads", description: "When new monthly commission sheets are processed and uploaded.", targets: ["host"], when: "immediately", active: true }
  ];
  const VAPID_KEYS_FILE = import_path.default.join(__dirname, "vapid_keys_fallback.json");
  let vapidPublicKey = process.env.VAPID_PUBLIC_KEY || "";
  let vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || "";
  if (!vapidPublicKey || !vapidPrivateKey) {
    if (import_fs.default.existsSync(VAPID_KEYS_FILE)) {
      try {
        const savedKeys = JSON.parse(import_fs.default.readFileSync(VAPID_KEYS_FILE, "utf8"));
        vapidPublicKey = savedKeys.publicKey;
        vapidPrivateKey = savedKeys.privateKey;
      } catch (e) {
        console.error("Failed to parse saved VAPID keys fallback:", e);
      }
    }
    if (!vapidPublicKey || !vapidPrivateKey) {
      try {
        const generated = import_web_push.default.generateVAPIDKeys();
        vapidPublicKey = generated.publicKey;
        vapidPrivateKey = generated.privateKey;
        import_fs.default.writeFileSync(VAPID_KEYS_FILE, JSON.stringify(generated), "utf8");
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
      import_web_push.default.setVapidDetails(
        "mailto:admin@9poppo.com",
        vapidPublicKey,
        vapidPrivateKey
      );
    } catch (err) {
      console.error("Failed to set VAPID details:", err.message);
    }
  }
  const SUBSCRIPTIONS_FILE = import_path.default.join(__dirname, "push_subscriptions.json");
  const NOTIFICATION_TYPES_FILE = import_path.default.join(__dirname, "notification_types.json");
  let pushSubscriptions = [];
  if (import_fs.default.existsSync(SUBSCRIPTIONS_FILE)) {
    try {
      pushSubscriptions = JSON.parse(import_fs.default.readFileSync(SUBSCRIPTIONS_FILE, "utf8"));
    } catch (e) {
      console.error("Failed to read push subscriptions file:", e);
    }
  }
  let notificationTypes = [...DEFAULT_NOTIFICATION_TYPES];
  if (import_fs.default.existsSync(NOTIFICATION_TYPES_FILE)) {
    try {
      const loaded = JSON.parse(import_fs.default.readFileSync(NOTIFICATION_TYPES_FILE, "utf8"));
      notificationTypes = DEFAULT_NOTIFICATION_TYPES.map((def) => {
        const found = loaded.find((l) => l.id === def.id);
        return found ? {
          ...def,
          active: found.active !== void 0 ? found.active : def.active,
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
      import_fs.default.writeFileSync(SUBSCRIPTIONS_FILE, JSON.stringify(pushSubscriptions, null, 2), "utf8");
    } catch (e) {
      console.error("Failed to save push subscriptions:", e);
    }
  }
  function saveNotificationTypes() {
    try {
      import_fs.default.writeFileSync(NOTIFICATION_TYPES_FILE, JSON.stringify(notificationTypes, null, 2), "utf8");
    } catch (e) {
      console.error("Failed to save notification types:", e);
    }
  }
  app.get("/api/push/public-key", (req, res) => {
    res.json({ publicKey: vapidPublicKey });
  });
  app.post("/api/push/subscribe", async (req, res) => {
    const { subscription, poppo_id } = req.body;
    const subObj = subscription || req.body;
    const poppoId = poppo_id || null;
    if (!subObj || !subObj.endpoint) {
      return res.status(400).json({ error: "Invalid subscription payload" });
    }
    const index = pushSubscriptions.findIndex((sub) => sub.endpoint === subObj.endpoint);
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
    if (poppoId) {
      const db = getAdminFirestore();
      try {
        await db.collection("users").doc(poppoId).update({ notificationRequestedByDirector: false });
      } catch (err) {
        console.warn(`Failed to clear notificationRequestedByDirector for user ${poppoId}:`, err.message);
      }
    }
    res.status(201).json({ status: "success", message: "Subscription registered." });
  });
  app.post("/api/push/send", async (req, res) => {
    const { title, body: body2, url, type } = req.body;
    if (!title || !body2 || !type) {
      return res.status(400).json({ error: "Missing title, body, or type fields" });
    }
    const notifType = notificationTypes.find((t) => t.id === type);
    if (!notifType || !notifType.active) {
      return res.json({
        status: "ignored",
        message: `Notification type '${type}' is currently inactive.`
      });
    }
    const payload = JSON.stringify({
      title,
      body: body2,
      url: url || "/dashboard",
      icon: "/logo.jpg",
      badge: "/logo.jpg"
    });
    const sendPromises = pushSubscriptions.map(async (sub) => {
      try {
        await import_web_push.default.sendNotification(sub, payload);
      } catch (err) {
        if (err.statusCode === 410 || err.statusCode === 404) {
          pushSubscriptions = pushSubscriptions.filter((s) => s.endpoint !== sub.endpoint);
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
  app.patch("/api/notifications/update-rule", verifyHeadAdminOrDirector, (req, res) => {
    const { id, active, targets, when } = req.body;
    if (!id) {
      return res.status(400).json({ error: "Missing rule ID" });
    }
    const rule = notificationTypes.find((t) => t.id === id);
    if (!rule) {
      return res.status(404).json({ error: "Notification type not found" });
    }
    if (active !== void 0) rule.active = active;
    if (targets !== void 0) rule.targets = targets;
    if (when !== void 0) rule.when = when;
    saveNotificationTypes();
    res.json({ status: "success", item: rule });
  });
  app.get("/api/notifications", (req, res) => {
    res.json(notificationTypes);
  });
  app.get("/api/notifications/users", verifyHeadAdminOrDirector, async (req, res) => {
    try {
      const db = getAdminFirestore();
      const snapshot = await withTimeout2(db.collection("users").get(), 3e3);
      const usersList = snapshot.docs.map((doc) => {
        const data = doc.data();
        const poppoId = doc.id;
        const hasWebPush = pushSubscriptions.some((sub) => String(sub.poppo_id).trim() === String(poppoId).trim());
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
    } catch (error) {
      console.error("Failed to get notification users:", error);
      return res.status(500).json({ error: error?.message || "Internal server error" });
    }
  });
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
    } catch (error) {
      console.error("Failed to send notification request:", error);
      return res.status(500).json({ error: error?.message || "Internal server error" });
    }
  });
  const isDev = process.env.NODE_ENV !== "production";
  console.log(`
\u{1F527} Mode: ${isDev ? "DEVELOPMENT (Vite middleware)" : "PRODUCTION (static dist)"}
`);
  if (isDev) {
    const hmrPort = await findFreePort(24678);
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true, hmr: { port: hmrPort } },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express3.default.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  const freePort = await findFreePort(PORT);
  if (freePort !== PORT) {
    console.warn(`\u26A0\uFE0F  Port ${PORT} is in use \u2014 using port ${freePort} instead.`);
  }
  app.listen(freePort, "0.0.0.0", () => {
    console.log(`
\u2705 Dev server running at: \x1B[36mhttp://localhost:${freePort}\x1B[0m
`);
  });
}
startServer();
//# sourceMappingURL=server.cjs.map
