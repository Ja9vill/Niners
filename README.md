<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/f578d03a-99b3-4c41-84dd-9901137e8386

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Director / Admin provisioning

`director_notes` and `director_dashboard` writes are gated by the
`isDirector()` helper in [`firestore.rules`](./firestore.rules), which
accepts any of:

- a Firebase Auth custom claim `role == 'director'`
- email `jwavpr@gmail.com` (hard-coded fallback for bootstrapping)
- a document at `admins/{uid}`

To grant director access without manual gcloud/firestore work, run the
**Provision Director** GitHub Actions workflow
(`.github/workflows/provision-director.yml`). It calls
[`scripts/provision-director.mjs`](./scripts/provision-director.mjs),
which sets the custom claim **and** upserts the `admins/{uid}` document
so either gate in the rules grants access.

Trigger from the repo's _Actions → Provision Director → Run workflow_
button. Defaults to provisioning `jwavpr@gmail.com`; override `email`
or `uid` to target someone else, or set `dry_run=true` to preview.

After provisioning, the target user must sign out and back in for the
new custom claim to land in their ID token.

### Required secrets

The workflow reuses the same secrets as the existing deploy workflows:

| Secret           | Used for                                                     |
| ---------------- | ------------------------------------------------------------ |
| `GCP_SA_KEY`     | JSON service-account key (passed to Admin SDK as credential) |
| `GCP_PROJECT_ID` | Firebase / GCP project id                                    |

### Required IAM roles on the service account

| Role                          | Why                                            |
| ----------------------------- | ---------------------------------------------- |
| `roles/firebaseauth.admin`    | Look up users by email, set custom claims      |
| `roles/datastore.user`        | Write the `admins/{uid}` document in Firestore |

These are independent of the roles required by `deploy-firestore.yml`
(`firebaserules.admin`, `datastore.indexAdmin`,
`iam.serviceAccountUser`). Grant them in the GCP IAM console; missing
roles surface as PERMISSION_DENIED at runtime.

### Local run

```bash
GOOGLE_APPLICATION_CREDENTIALS=/path/to/key.json \
FIREBASE_PROJECT_ID=gen-lang-client-0222945352 \
FIREBASE_DATABASE_ID=ai-studio-f578d03a-99b3-4c41-84dd-9901137e8386 \
npx --package=firebase-admin@^12 -- node scripts/provision-director.mjs \
  --email jwavpr@gmail.com
```

## Troubleshooting Google sign-in (401 / 404 from Firebase Auth)

If the deployed app surfaces `Google sign-in could not complete` and the
browser DevTools network tab shows either of:

- `HTTP 401` from
  `https://www.googleapis.com/identitytoolkit/v3/relyingparty/createAuthUri?key=...`
- `HTTP 404` from
  `https://<project>.firebaseapp.com/__/firebase/init.json`

…the root cause is almost always the deployed Firebase web app config in
[`firebase-applet-config.json`](./firebase-applet-config.json) — either
the API key has been rotated, restricted, or the file points at the
wrong project.

Run the **Verify Firebase Web Config** workflow
(`.github/workflows/verify-firebase-config.yml`) to diagnose. It:

1. Probes Identity Toolkit with the committed API key (this is the
   exact call the browser makes). A 401/403 here is the failure.
2. Fetches the canonical web app config via the Firebase Management API
   and diffs it against the committed file.
3. With `write=true`, opens a PR that replaces
   `firebase-applet-config.json` with the canonical config (preserving
   `firestoreDatabaseId`).

### Required IAM for verification

| Role                    | Why                                                        |
| ----------------------- | ---------------------------------------------------------- |
| `roles/firebase.viewer` | `firebase.apps.list / get / getConfig` (Management API)    |

### Manual console steps if the workflow flags the key as rejected

If the workflow reports `Identity Toolkit REJECTED the committed API
key`, a director must check, in order:

1. **Firebase Console → Project Settings → Your apps → Web app**: copy
   the current SDK config and compare against
   `firebase-applet-config.json`. If they differ, run the workflow with
   `write=true` to open a refresh PR.
2. **Google Cloud Console → APIs & Services → Library**: confirm the
   **Identity Toolkit API** and **Token Service API** are *Enabled* on
   project `gen-lang-client-0222945352`.
3. **Google Cloud Console → APIs & Services → Credentials → the
   browser API key**:
   - Under **Application restrictions** ensure either *None* or that
     the Cloud Run domain
     (`niners-580294245942.us-central1.run.app`) and any custom domain
     are listed as allowed HTTP referrers.
   - Under **API restrictions** either choose *Don't restrict key* or
     include **Identity Toolkit API**, **Token Service API**, and
     **Firebase Installations API**.
4. **Firebase Console → Authentication → Sign-in method**: confirm
   **Google** is enabled.
5. **Firebase Console → Authentication → Settings → Authorized
   domains**: confirm the live Cloud Run domain is listed (use the
   **Manage Firebase Auth Authorized Domains** workflow to add it).

The web app config (apiKey, authDomain, projectId, appId,
messagingSenderId, storageBucket) is **not** a secret — it is shipped
in every web client and safe to commit and log.
