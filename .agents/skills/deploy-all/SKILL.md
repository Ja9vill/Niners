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
5. **_Auto-tag_** — creates an annotated git tag (`deploy/YYYY-MM-DD-HHmm`) to permanently snapshot the exact deployed commit
6. **_Deploy Firebase Hosting_** — `firebase deploy --only hosting`
7. **_Deploy Cloud Run_** — `gcloud run deploy nine-dashboard ...`

## Build Preservation — Auto-Tagging

Every deploy automatically creates a **permanent, immutable git tag** at the deployed commit. This is your safety net.

**Tag format:** `deploy/YYYY-MM-DD-HHmm`

```powershell
# Example tag created during deploy
deploy/2026-06-30-1422

# List all deployments ever made
git tag -l "deploy/*"

# See exactly what was in a specific deploy
git log deploy/2026-06-30-1422 --oneline

# Compare two deploys
git diff deploy/2026-06-30-1422 deploy/2026-06-29-1000 --stat
```

## Rollback — How to Restore a Previous Build

If a deployment breaks the live site, rollback is a 3-step process:

```powershell
# 1. Check out the last known-good tag
git checkout deploy/2026-06-29-1000

# 2. Rebuild and redeploy from that exact state
npm run build
firebase deploy --only hosting
gcloud run deploy nine-dashboard --source . --port 8080 --region us-central1

# 3. (Optional) Create a hotfix branch from the tag
git checkout -b fix/rollback-restore
```

**Cloud Run also keeps the last 100 revisions.** You can rollback via the GCP Console without touching git:

```
Cloud Run → nine-dashboard → Revisions → select previous → "Deploy"
```

## Complete Development Lifecycle

### BEFORE coding
```powershell
git checkout main
git pull origin main
git fetch --all --prune
git checkout -b feat/what-youre-building
```

### DURING coding
```powershell
npm run dev                          # live preview
npm run lint                         # tsc --noEmit (type-check often)
git add -A && git commit -m "type: message"   # commit frequently
git fetch origin && git rebase origin/main    # stay up to date
```

### AFTER coding (before deploy)
```powershell
npm run lint                         # must pass
npm run test                         # must pass
npm run build                        # must succeed
git checkout main
git pull origin main
git merge feat/what-youre-building
git push origin main
git branch -d feat/what-youre-building
git push origin --delete feat/what-youre-building
```
Then run `deploy-all.ps1` from main.

---

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
