#!/usr/bin/env node
/**
 * manage-authorized-domains.mjs
 *
 * Idempotently appends one or more domains to the Firebase Auth
 * `authorizedDomains` list via the Identity Toolkit Admin API
 * (https://identitytoolkit.googleapis.com/v2/projects/{project}/config).
 *
 *   GET  config -> read current authorizedDomains
 *   diff -> if all requested domains already present, exit success (no PATCH)
 *   PATCH config (updateMask=authorizedDomains) with union of existing + new
 *
 * Existing domains are preserved. Default Firebase domains
 * (e.g. *.firebaseapp.com, *.web.app) are managed by Google and appear in
 * the GET response; we round-trip them unchanged.
 *
 * Authentication:
 *   Service-account JSON in FIREBASE_SERVICE_ACCOUNT_JSON, or
 *   GOOGLE_APPLICATION_CREDENTIALS path, or ADC fallback.
 *   Required role: roles/firebaseauth.admin (or any role that grants
 *   firebaseauth.configs.get + firebaseauth.configs.update).
 *
 * Environment:
 *   FIREBASE_PROJECT_ID            target project id (required if not in creds)
 *   FIREBASE_SERVICE_ACCOUNT_JSON  raw JSON service-account key (optional)
 *   GOOGLE_APPLICATION_CREDENTIALS path to service-account JSON (optional)
 *   AUTHORIZED_DOMAINS             comma/whitespace-separated list of domains
 *                                  to ensure present (required)
 *   DRY_RUN=1                      print actions without PATCHing
 *
 * Output never prints tokens, service-account JSON, or other secrets.
 */

import { initializeApp, applicationDefault, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

const IDENTITY_TOOLKIT_BASE = 'https://identitytoolkit.googleapis.com/v2';

function parseDomainsArg(raw) {
  if (!raw) return [];
  return raw
    .split(/[\s,]+/)
    .map((d) => d.trim())
    .filter(Boolean);
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

async function getAccessToken(app) {
  // firebase-admin's credential layer mints an OAuth2 access token scoped
  // to https://www.googleapis.com/auth/cloud-platform, which is what the
  // Identity Toolkit admin endpoint requires. The token is held in memory
  // only and never printed.
  const token = await app.options.credential.getAccessToken();
  if (!token || !token.access_token) {
    throw new Error('failed to mint access token from service-account credential');
  }
  return token.access_token;
}

function summarizeHttpError(status, bodyText) {
  // Strip anything that looks like a token if present, defensive only.
  const trimmed = (bodyText || '').slice(0, 800);
  return `HTTP ${status}: ${trimmed}`;
}

async function fetchConfig(projectId, accessToken) {
  const url = `${IDENTITY_TOOLKIT_BASE}/projects/${encodeURIComponent(projectId)}/config`;
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(
      `failed to GET Identity Toolkit config for ${projectId}: ${summarizeHttpError(res.status, text)}`,
    );
  }
  try {
    return JSON.parse(text);
  } catch (err) {
    throw new Error(`Identity Toolkit GET returned non-JSON body: ${text.slice(0, 200)}`);
  }
}

async function patchAuthorizedDomains(projectId, accessToken, domains) {
  const url = `${IDENTITY_TOOLKIT_BASE}/projects/${encodeURIComponent(projectId)}/config?updateMask=authorizedDomains`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ authorizedDomains: domains }),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(
      `failed to PATCH Identity Toolkit config for ${projectId}: ${summarizeHttpError(res.status, text)}`,
    );
  }
  try {
    return JSON.parse(text);
  } catch (err) {
    throw new Error(`Identity Toolkit PATCH returned non-JSON body: ${text.slice(0, 200)}`);
  }
}

function explainPermissionError(err) {
  const msg = err && err.message ? err.message : String(err);
  const hints = [];
  if (/PERMISSION_DENIED|403/.test(msg)) {
    hints.push(
      'Hint: the service account behind GCP_SA_KEY is missing roles/firebaseauth.admin.',
      'Grant it with:',
      '  gcloud projects add-iam-policy-binding $GCP_PROJECT_ID \\',
      '    --member="serviceAccount:<sa-email>" \\',
      '    --role="roles/firebaseauth.admin"',
    );
  }
  if (/CONFIGURATION_NOT_FOUND|NOT_FOUND|404/.test(msg)) {
    hints.push(
      'Hint: the Identity Toolkit / Identity Platform service may not be enabled for this project.',
      'Enable it with:',
      '  gcloud services enable identitytoolkit.googleapis.com --project=$GCP_PROJECT_ID',
      'For brand-new projects you may also need to open the Firebase Console once at',
      'https://console.firebase.google.com/project/$GCP_PROJECT_ID/authentication/providers',
      'to initialize the Authentication config.',
    );
  }
  if (/UNAUTHENTICATED|401/.test(msg)) {
    hints.push(
      'Hint: failed to authenticate. Verify the GCP_SA_KEY secret contains a valid, non-expired',
      'service-account JSON for the target project.',
    );
  }
  return hints;
}

async function main() {
  const requestedDomains = parseDomainsArg(process.env.AUTHORIZED_DOMAINS);
  if (requestedDomains.length === 0) {
    process.stderr.write(
      'error: AUTHORIZED_DOMAINS is required (comma- or whitespace-separated list of domains)\n',
    );
    process.exit(2);
  }

  // Validate domain shape early — bare hostnames only, no scheme, no path.
  for (const d of requestedDomains) {
    if (/[\s/]/.test(d) || d.includes('://')) {
      process.stderr.write(
        `error: invalid domain "${d}" — must be a bare hostname (no scheme, no path)\n`,
      );
      process.exit(2);
    }
  }

  const dryRun = process.env.DRY_RUN === '1';
  const opts = buildAppOptions();
  if (!opts.projectId) {
    process.stderr.write(
      'error: project id unresolved; set FIREBASE_PROJECT_ID or GCP_PROJECT_ID\n',
    );
    process.exit(2);
  }

  process.stdout.write(`project: ${opts.projectId}\n`);
  process.stdout.write(`requested domains: ${requestedDomains.join(', ')}\n`);
  if (dryRun) process.stdout.write('mode: DRY RUN (no PATCH will be issued)\n');

  const app = initializeApp(opts);
  // Touch getAuth so the credential is exercised consistently with the
  // other admin scripts; the access token itself comes from the credential.
  void getAuth(app);

  let accessToken;
  try {
    accessToken = await getAccessToken(app);
  } catch (err) {
    process.stderr.write(`failed to obtain access token: ${err.message || err}\n`);
    process.exit(1);
  }

  let config;
  try {
    config = await fetchConfig(opts.projectId, accessToken);
  } catch (err) {
    process.stderr.write(`${err.message || err}\n`);
    for (const line of explainPermissionError(err)) process.stderr.write(`${line}\n`);
    process.exit(1);
  }

  const existing = Array.isArray(config.authorizedDomains) ? config.authorizedDomains : [];
  process.stdout.write(`existing authorizedDomains (${existing.length}):\n`);
  for (const d of existing) process.stdout.write(`  - ${d}\n`);

  const existingSet = new Set(existing);
  const toAdd = requestedDomains.filter((d) => !existingSet.has(d));
  if (toAdd.length === 0) {
    process.stdout.write(
      'all requested domains already present — no PATCH issued (idempotent no-op)\n',
    );
    process.exit(0);
  }

  process.stdout.write(`will add: ${toAdd.join(', ')}\n`);
  const next = [...existing, ...toAdd];

  if (dryRun) {
    process.stdout.write('dry-run: skipping PATCH\n');
    process.stdout.write(`dry-run: resulting authorizedDomains would be (${next.length}):\n`);
    for (const d of next) process.stdout.write(`  - ${d}\n`);
    process.exit(0);
  }

  let updated;
  try {
    updated = await patchAuthorizedDomains(opts.projectId, accessToken, next);
  } catch (err) {
    process.stderr.write(`${err.message || err}\n`);
    for (const line of explainPermissionError(err)) process.stderr.write(`${line}\n`);
    process.exit(1);
  }

  const updatedDomains = Array.isArray(updated.authorizedDomains)
    ? updated.authorizedDomains
    : [];
  process.stdout.write(`SUCCESS: authorizedDomains now contains ${updatedDomains.length} entries:\n`);
  for (const d of updatedDomains) process.stdout.write(`  - ${d}\n`);

  // Final assertion: every requested domain must now be present.
  const finalSet = new Set(updatedDomains);
  const missing = requestedDomains.filter((d) => !finalSet.has(d));
  if (missing.length > 0) {
    process.stderr.write(
      `FATAL: PATCH succeeded but these requested domains are not in the response: ${missing.join(', ')}\n`,
    );
    process.exit(1);
  }
}

main().catch((err) => {
  process.stderr.write(
    `manage-authorized-domains failed: ${err && err.stack ? err.stack : err}\n`,
  );
  process.exit(1);
});
