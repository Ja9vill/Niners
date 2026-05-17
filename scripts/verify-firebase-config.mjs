#!/usr/bin/env node
/**
 * verify-firebase-config.mjs
 *
 * Fetches the canonical Firebase web app config from the Firebase
 * Management API and compares it against the repo's
 * firebase-applet-config.json. Independently probes Identity Toolkit
 * with the committed API key so the workflow can fail loudly when the
 * deployed key is invalid, restricted, or for the wrong project — the
 * exact failure mode that surfaces as a 401 on
 * https://identitytoolkit.googleapis.com/v1/accounts:createAuthUri in
 * the browser.
 *
 * The Firebase web app config (apiKey, authDomain, projectId,
 * messagingSenderId, appId, storageBucket, measurementId) is NOT a
 * secret — it is shipped in every web client. Printing it to the
 * workflow log is intentional. Service account credentials and access
 * tokens are never printed.
 *
 * Authentication (any one):
 *   - FIREBASE_SERVICE_ACCOUNT_JSON: raw service-account JSON
 *   - GOOGLE_APPLICATION_CREDENTIALS: path to service-account JSON
 *   - Application Default Credentials (gcloud / workload identity)
 *
 * Required IAM on the service account:
 *   - roles/firebase.viewer        (firebase.apps.list / get / getConfig)
 *
 * Required APIs enabled on the project:
 *   - firebase.googleapis.com           (Firebase Management API)
 *   - identitytoolkit.googleapis.com    (Firebase Auth)
 *
 * Environment:
 *   FIREBASE_PROJECT_ID   target project id (defaults to .firebaserc)
 *   APP_ID                optional explicit appId; otherwise the first
 *                         WEB app on the project is used
 *   STRICT=1              exit non-zero if the committed config differs
 *                         from the fetched canonical config
 *   WRITE=1               overwrite firebase-applet-config.json with
 *                         the fetched config (preserves
 *                         firestoreDatabaseId)
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { GoogleAuth } from 'google-auth-library';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..');
const CONFIG_PATH = resolve(REPO_ROOT, 'firebase-applet-config.json');
const FIREBASERC_PATH = resolve(REPO_ROOT, '.firebaserc');

const STRICT = process.env.STRICT === '1' || process.env.STRICT === 'true';
const WRITE = process.env.WRITE === '1' || process.env.WRITE === 'true';

function readJsonOrNull(path) {
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return null;
  }
}

function resolveProjectId() {
  if (process.env.FIREBASE_PROJECT_ID) return process.env.FIREBASE_PROJECT_ID;
  const rc = readJsonOrNull(FIREBASERC_PATH);
  return rc?.projects?.default || null;
}

function configureAuthFromEnv() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) return new GoogleAuth({ scopes: ['https://www.googleapis.com/auth/cloud-platform'] });
  let creds;
  try {
    creds = JSON.parse(raw);
  } catch (err) {
    throw new Error(`FIREBASE_SERVICE_ACCOUNT_JSON is not valid JSON: ${err.message}`);
  }
  return new GoogleAuth({
    credentials: creds,
    scopes: ['https://www.googleapis.com/auth/cloud-platform'],
  });
}

async function fetchJson(client, url, init = {}) {
  const res = await client.request({ url, ...init });
  return res.data;
}

async function listWebApps(client, projectId) {
  const url = `https://firebase.googleapis.com/v1beta1/projects/${encodeURIComponent(projectId)}/webApps`;
  const data = await fetchJson(client, url);
  return data.apps || [];
}

async function fetchWebAppConfig(client, projectId, appId) {
  const url = `https://firebase.googleapis.com/v1beta1/projects/${encodeURIComponent(projectId)}/webApps/${encodeURIComponent(appId)}/config`;
  return await fetchJson(client, url);
}

async function probeIdentityToolkit(apiKey) {
  if (!apiKey) return { ok: false, status: 0, message: 'no apiKey to probe' };
  const url = `https://identitytoolkit.googleapis.com/v1/accounts:createAuthUri?key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      identifier: 'preflight-check@example.invalid',
      continueUri: 'https://invalid.local',
    }),
  });
  let detail = '';
  try {
    const body = await res.json();
    detail = body?.error?.message || JSON.stringify(body);
  } catch {
    /* ignore */
  }
  // 200 = success, 400 with INVALID_IDENTIFIER = key is good (server rejected
  // our synthetic identifier). 401 with `Firebase App Check token is invalid`
  // is App Check ENFORCEMENT — the API key is fine; the request was rejected
  // because this bare fetch carries no App Check token. The real browser SDK
  // attaches one. We surface this as a distinct, non-blocking signal.
  // Anything else (other 401, 403) means the key itself is rejected.
  const looksAccepted =
    res.status === 200 ||
    (res.status === 400 && /INVALID_IDENTIFIER|INVALID_EMAIL|MISSING_CONTINUE_URI/i.test(detail));
  const looksLikeAppCheckEnforcement = /app[- ]?check/i.test(detail);
  return {
    ok: looksAccepted,
    appCheck: looksLikeAppCheckEnforcement,
    status: res.status,
    message: detail,
  };
}

function normalizeFromManagementApi(cfg) {
  // Management API returns: projectId, appId, apiKey, authDomain,
  // storageBucket, messagingSenderId, measurementId. Mirror the field
  // names the repo's firebase-applet-config.json uses.
  return {
    projectId: cfg.projectId,
    appId: cfg.appId,
    apiKey: cfg.apiKey,
    authDomain: cfg.authDomain,
    storageBucket: cfg.storageBucket || '',
    messagingSenderId: cfg.messagingSenderId || '',
    measurementId: cfg.measurementId || '',
  };
}

function diffConfigs(committed, fetched) {
  const fields = [
    'projectId',
    'appId',
    'apiKey',
    'authDomain',
    'storageBucket',
    'messagingSenderId',
    'measurementId',
  ];
  const drift = [];
  for (const f of fields) {
    const a = committed?.[f] ?? '';
    const b = fetched?.[f] ?? '';
    if (a !== b) drift.push({ field: f, committed: a, fetched: b });
  }
  return drift;
}

async function main() {
  const projectId = resolveProjectId();
  if (!projectId) {
    console.error('FIREBASE_PROJECT_ID env var or .firebaserc default project required.');
    process.exit(2);
  }

  const committed = readJsonOrNull(CONFIG_PATH);
  if (!committed) {
    console.error(`Missing or invalid ${CONFIG_PATH}`);
    process.exit(2);
  }

  console.log(`Project: ${projectId}`);
  console.log(`Committed config: apiKey=${committed.apiKey?.slice(0, 12)}... appId=${committed.appId} authDomain=${committed.authDomain}`);

  // Probe Identity Toolkit with the committed key. This is the *exact*
  // request the browser makes on Google sign-in. A non-2xx/non-400
  // response here is the root cause of the live 401 we observed.
  const probe = await probeIdentityToolkit(committed.apiKey);
  if (probe.ok) {
    console.log(`✓ Identity Toolkit accepts the committed API key (HTTP ${probe.status}).`);
  } else if (probe.appCheck) {
    // App Check enforcement is on. A bare fetch from CI cannot carry an
    // App Check token (no reCAPTCHA / no browser). The committed API key is
    // NOT the problem here — this rejection is expected from outside the
    // browser. The real failure mode in the browser is a missing or failed
    // App Check initialization, which is a client-side issue.
    console.warn(`⚠ Identity Toolkit returned HTTP ${probe.status} with App Check enforcement: ${probe.message}`);
    console.warn('  This means App Check enforcement is enabled on Firebase Auth for this project.');
    console.warn('  The committed API key is fine — a bare HTTP probe from CI has no App Check token, so this rejection is EXPECTED here.');
    console.warn('  In the browser, signInWithGoogle must run AFTER initializeAppCheck() with a valid reCAPTCHA Enterprise provider.');
    console.warn('  If users see a 401 in the deployed app, verify:');
    console.warn('   1. The web client calls initializeAppCheck() with the correct reCAPTCHA Enterprise site key BEFORE any auth call.');
    console.warn('   2. The reCAPTCHA Enterprise site key is registered with App Check in Firebase Console → App Check.');
    console.warn('   3. The deployed origin is on the reCAPTCHA Enterprise key allow-list.');
  } else {
    console.error(`✗ Identity Toolkit REJECTED the committed API key (HTTP ${probe.status}). Detail: ${probe.message}`);
    console.error('  This is the root cause of the in-browser 401 on /identitytoolkit/v3/relyingparty/createAuthUri.');
    console.error('  Possible fixes:');
    console.error('   1. The web app config was rotated — fetch and commit the current one (WRITE=1).');
    console.error('   2. The Identity Toolkit API is disabled — gcloud services enable identitytoolkit.googleapis.com.');
    console.error('   3. The API key has HTTP-referrer restrictions excluding the Cloud Run domain — relax them in GCP Console → APIs & Services → Credentials.');
    console.error('   4. The key has API restrictions excluding Identity Toolkit — add it in GCP Console → Credentials.');
  }

  // Fetch the canonical web app config via Firebase Management API.
  let fetched = null;
  try {
    const auth = configureAuthFromEnv();
    const client = await auth.getClient();
    let appId = process.env.APP_ID || committed.appId;
    if (!appId) {
      const apps = await listWebApps(client, projectId);
      if (apps.length === 0) {
        console.error('No WEB apps found on the project. Create one in Firebase Console → Project Settings → Your apps.');
        process.exit(probe.ok ? 0 : 1);
      }
      appId = apps[0].appId;
      console.log(`Using first WEB app: ${appId}`);
    }
    const cfg = await fetchWebAppConfig(client, projectId, appId);
    fetched = normalizeFromManagementApi(cfg);
    console.log(`Canonical config: apiKey=${fetched.apiKey?.slice(0, 12)}... appId=${fetched.appId} authDomain=${fetched.authDomain}`);
  } catch (err) {
    const status = err?.response?.status;
    const detail = err?.response?.data?.error?.message || err?.message || String(err);
    console.error(`Could not fetch canonical web config from Firebase Management API${status ? ` (HTTP ${status})` : ''}: ${detail}`);
    console.error('Ensure the service account has roles/firebase.viewer and the Firebase Management API is enabled.');
    // App Check enforcement is not a failure of the committed config — exit 0
  // so the workflow doesn't block on a diagnostic that's *expected* outside
  // the browser. Real bad-API-key rejections still fail the workflow.
  if (!probe.ok && !probe.appCheck) process.exit(1);
    return;
  }

  const drift = diffConfigs(committed, fetched);
  if (drift.length === 0) {
    console.log('✓ Committed firebase-applet-config.json matches the canonical web app config.');
  } else {
    console.warn('⚠ Committed firebase-applet-config.json differs from the canonical web app config:');
    for (const d of drift) {
      console.warn(`   ${d.field}: committed=${JSON.stringify(d.committed)} canonical=${JSON.stringify(d.fetched)}`);
    }
    if (WRITE) {
      const next = {
        ...committed,
        ...fetched,
        firestoreDatabaseId: committed.firestoreDatabaseId,
      };
      writeFileSync(CONFIG_PATH, JSON.stringify(next, null, 2) + '\n');
      console.log(`Wrote canonical config to ${CONFIG_PATH} (firestoreDatabaseId preserved).`);
    } else if (STRICT) {
      process.exit(1);
    }
  }

  // App Check enforcement is not a failure of the committed config — exit 0
  // so the workflow doesn't block on a diagnostic that's *expected* outside
  // the browser. Real bad-API-key rejections still fail the workflow.
  if (!probe.ok && !probe.appCheck) process.exit(1);
}

main().catch((err) => {
  console.error('verify-firebase-config.mjs failed:', err?.stack || err?.message || err);
  process.exit(1);
});
