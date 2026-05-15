#!/usr/bin/env node
/**
 * provision-director.mjs
 *
 * Idempotently grants director access to a user identified by email or uid.
 * Performs BOTH supported mechanisms so either path in firestore.rules works:
 *
 *   1. Sets the custom claim `role: 'director'` on the Firebase Auth user.
 *      Picked up by `request.auth.token.role == 'director'` in firestore.rules.
 *
 *   2. Writes/merges an `admins/{uid}` document.
 *      Picked up by `exists(/databases/$(database)/documents/admins/$(uid))`.
 *
 * Authentication:
 *   - Reads service-account credentials from GOOGLE_APPLICATION_CREDENTIALS
 *     (path) or FIREBASE_SERVICE_ACCOUNT_JSON (raw JSON string).
 *   - Falls back to Application Default Credentials.
 *
 * Required IAM roles on the service account used:
 *   - roles/firebaseauth.admin    (set custom claims, look up users)
 *   - roles/datastore.user        (write admins/{uid} document)
 *   - roles/iam.serviceAccountTokenCreator  (when running outside GCP)
 *
 * Usage:
 *   node scripts/provision-director.mjs --email user@example.com
 *   node scripts/provision-director.mjs --uid <firebase-uid>
 *   PROVISION_EMAIL=user@example.com node scripts/provision-director.mjs
 *
 * Environment:
 *   FIREBASE_PROJECT_ID            target project (else read from creds)
 *   FIREBASE_DATABASE_ID           target Firestore database (else "(default)")
 *   FIREBASE_SERVICE_ACCOUNT_JSON  raw JSON service-account key (optional)
 *   GOOGLE_APPLICATION_CREDENTIALS path to service-account JSON (optional)
 *   PROVISION_EMAIL / PROVISION_UID  alternative to --email / --uid
 *   DRY_RUN=1                      print actions without writing
 */

import { initializeApp, applicationDefault, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

function parseArgs(argv) {
  const out = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--email') out.email = argv[++i];
    else if (a === '--uid') out.uid = argv[++i];
    else if (a === '--dry-run') out.dryRun = true;
    else if (a === '--help' || a === '-h') out.help = true;
  }
  return out;
}

function usageAndExit(code = 0) {
  process.stdout.write(
    'Usage: provision-director.mjs --email <addr> | --uid <uid> [--dry-run]\n',
  );
  process.exit(code);
}

function buildAppOptions() {
  const projectId =
    process.env.FIREBASE_PROJECT_ID ||
    process.env.GCP_PROJECT_ID ||
    process.env.GCLOUD_PROJECT;

  const rawJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (rawJson && rawJson.trim().startsWith('{')) {
    const parsed = JSON.parse(rawJson);
    return {
      credential: cert(parsed),
      projectId: projectId || parsed.project_id,
    };
  }
  return {
    credential: applicationDefault(),
    projectId,
  };
}

async function resolveUser(auth, { email, uid }) {
  if (uid) return auth.getUser(uid);
  if (email) return auth.getUserByEmail(email);
  throw new Error('must supply --email or --uid');
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help) usageAndExit(0);

  const email = args.email || process.env.PROVISION_EMAIL;
  const uid = args.uid || process.env.PROVISION_UID;
  if (!email && !uid) {
    process.stderr.write(
      'error: provide --email or --uid (or PROVISION_EMAIL / PROVISION_UID)\n',
    );
    usageAndExit(2);
  }

  const dryRun = args.dryRun || process.env.DRY_RUN === '1';

  const opts = buildAppOptions();
  if (!opts.projectId) {
    process.stderr.write(
      'error: project id unresolved; set FIREBASE_PROJECT_ID or GCP_PROJECT_ID\n',
    );
    process.exit(2);
  }

  const app = initializeApp(opts);
  const auth = getAuth(app);
  const databaseId = process.env.FIREBASE_DATABASE_ID || '(default)';
  const db =
    databaseId && databaseId !== '(default)'
      ? getFirestore(app, databaseId)
      : getFirestore(app);

  const user = await resolveUser(auth, { email, uid });
  const target = { uid: user.uid, email: user.email || null };

  process.stdout.write(
    `resolved target user: ${JSON.stringify(target)} (project=${opts.projectId}, db=${databaseId})\n`,
  );

  const existingClaims = user.customClaims || {};
  const needsClaim = existingClaims.role !== 'director';

  if (dryRun) {
    process.stdout.write(
      `dry-run: would set custom claim role=director (current=${existingClaims.role ?? 'none'})\n`,
    );
    process.stdout.write(`dry-run: would upsert admins/${user.uid}\n`);
    process.exit(0);
  }

  if (needsClaim) {
    await auth.setCustomUserClaims(user.uid, {
      ...existingClaims,
      role: 'director',
    });
    process.stdout.write('set custom claim role=director\n');
  } else {
    process.stdout.write('custom claim role=director already present\n');
  }

  const adminRef = db.collection('admins').doc(user.uid);
  await adminRef.set(
    {
      email: user.email || null,
      role: 'director',
      provisionedAt: new Date().toISOString(),
      provisionedBy: process.env.GITHUB_ACTOR || 'cli',
    },
    { merge: true },
  );
  process.stdout.write(`upserted admins/${user.uid}\n`);

  process.stdout.write(
    'done. user must sign out and back in for the custom claim to refresh in their ID token.\n',
  );
}

main().catch((err) => {
  process.stderr.write(`provision failed: ${err && err.stack ? err.stack : err}\n`);
  process.exit(1);
});
