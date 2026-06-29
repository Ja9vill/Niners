---
name: deploy-all
description: One-click deploy that typechecks, builds, commits, pushes, and deploys everything (Firebase Functions + Hosting + Cloud Run). Use this when the user says "deploy", "release", "ship", "publish", or wants to save all work and deploy the live site.
---

# deploy-all

Triggers on mentions of: **deploy**, **release**, **ship**, **publish**, **push live**, **one-click deploy**, **save and deploy**, **deploy everything**

## Workflow

This skill automates the full deployment pipeline for the Nine Dashboard project:

1. **_Pre-flight checks_** — verifies CLIs (node, npm, git, firebase, gcloud), branch, and git state
2. **_TypeScript type-check_** — `tsc --noEmit`
3. **_Build_** — `npm run build` (Vite frontend + esbuild backend)
4. **_Git save_** — `git add -A` → `git commit` (auto timestamp) → `git pull --rebase` → `git push`
5. **_Deploy Firebase Functions_** — `firebase deploy --only functions`
6. **_Deploy Firebase Hosting_** — `firebase deploy --only hosting`
7. **_Deploy Cloud Run_** — `gcloud run deploy nine-dashboard ...`

## How to use

### Via AI (recommended)

Simply say:

> "Deploy everything" / "Ship it" / "Release to live" / "Save and deploy"

The AI will:

1. Show you the current git status and ask for confirmation
2. Execute `.\deploy-all.ps1 -Force` (skips confirmation prompts in the script)
3. Report the result

### Via terminal (manual)

Run directly from the project root:

```powershell
.\deploy-all.ps1
```

Or skip interactive prompts:

```powershell
.\deploy-all.ps1 -Force
```

## What happens on failure

| Failure point | Behavior |
|---|---|
| TypeScript error | Script stops — fix errors and re-run |
| Build error | Script stops — fix errors and re-run |
| Git conflict during pull | Script stops — resolve conflicts manually, then re-run |
| Firebase deploy fails | Script logs the error but continues to next deploy step |
| Cloud Run deploy fails | Script logs the error |

## Requirements

- Node.js 20+, npm
- Firebase CLI (`firebase-tools`) — authenticated and pointed at `gen-lang-client-0222945352`
- Google Cloud SDK (`gcloud`) — authenticated
- Git — configured with remote `origin`
