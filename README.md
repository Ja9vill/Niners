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
