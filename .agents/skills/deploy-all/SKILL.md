---
name: deploy-all
description: One-click deploy that typechecks, builds, commits, pushes, and deploys everything (Firebase Hosting + Cloud Run). Use this when the user says "deploy", "release", "ship", "publish", or wants to save all work and deploy the live site.
---

# deploy-all

Triggers on mentions of: **deploy**, **release**, **ship**, **publish**, **push live**, **one-click deploy**, **save and deploy**, **deploy everything**

## Workflow

This skill automates the full deployment pipeline for the Nine Dashboard project:

1. **_Pre-flight checks_** — verifies CLIs (node, npm, git, firebase, gcloud), branch, and git state
2. **_TypeScript type-check_** — `tsc --noEmit`
3. **_Build_** — `npm run build` (Vite frontend + esbuild backend)
4. **_Git save_** — `git add -A` → `git commit` (auto timestamp) → `git pull --rebase` → `git push`
5. **_Deploy Firebase Hosting_** — `firebase deploy --only hosting`
6. **_Deploy Cloud Run_** — `gcloud run deploy nine-dashboard ...`

## CRITICAL: Build-before-deploy rule

**Always run `npm run build` before any deploy.** Firebase Hosting uploads whatever is in `dist/`. If you make code changes but forget to build, the *old* `dist/` gets deployed, overwriting the previous live version.

Likewise, Cloud Run needs a fresh build because `gcloud run deploy --source .` uses the local source. If you changed server-side code (`server.ts`, `IngestionService.ts`, etc.) and only deployed hosting, the API server still runs the old Cloud Run revision.

**Always deploy both:**
```powershell
firebase deploy --only hosting
gcloud run deploy nine-dashboard --source . --port 8080 --region us-central1
```

## Firebase Functions are REMOVED

Cloud Functions were removed from `firebase.json` because they were redundant — all scheduled jobs and auth logic already run inside the Cloud Run Express server (`cron.ts`, `server.ts`). Do NOT attempt to deploy functions.

## Authentication

Firebase CLI authentication requires a service account key:

```powershell
$env:GOOGLE_APPLICATION_CREDENTIALS = "$env:USERPROFILE\firebase-adminsdk-key.json"
```

The `deploy-all.ps1` script now auto-detects this.

## LF / CRLF Warning (harmless)

```
warning: in the working copy of '...', LF will be replaced by CRLF the next time Git touches it
```

This is a **line-ending normalization warning** caused by `core.autocrlf` in git. It is completely harmless — no data is lost, no files are modified. Windows uses `\r\n` (CRLF) while Linux/Mac uses `\n` (LF). Git converts automatically. **This does NOT cause builds to be overwritten.**

## What happens on failure

| Failure point | Behavior |
|---|---|
| TypeScript error | Script stops — fix errors and re-run |
| Build error | Script stops — fix errors and re-run |
| Git conflict during pull | Script stops — resolve conflicts manually, then re-run |
| Firebase Hosting deploy fails | Script logs the error but continues to next deploy step |
| Cloud Run deploy fails | Script logs the error |

## Requirements

- Node.js 20+, npm
- Firebase CLI (`firebase-tools`) — authenticated and pointed at `gen-lang-client-0222945352`
- Google Cloud SDK (`gcloud`) — authenticated
- Git — configured with remote `origin`
- Service account key at `$env:USERPROFILE\firebase-adminsdk-key.json`
