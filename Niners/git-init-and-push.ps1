#!/usr/bin/env pwsh
# ============================================================
#  git-init-and-push.ps1
#  Initializes the git repo, creates Branch 2, commits all
#  changes, and pushes to the GitHub remote.
#
#  Prerequisites:
#    - GitHub repo exists at: https://github.com/jwavpr/nine-dashboard
#    - You are authenticated with GitHub (SSH key or PAT set up)
# ============================================================

$GITHUB_URL  = "https://github.com/jwavpr/nine-dashboard.git"
$BRANCH_NAME = "Branch 2"

Write-Host "`n[1/6] Initializing git repository..." -ForegroundColor Cyan
git init
git branch -M main

Write-Host "`n[2/6] Adding GitHub remote (origin)..." -ForegroundColor Cyan
# Remove existing remote if present, then re-add
git remote remove origin 2>$null
git remote add origin $GITHUB_URL
Write-Host "Remote set to: $GITHUB_URL"

Write-Host "`n[3/6] Creating .gitignore to protect secrets..." -ForegroundColor Cyan
# Already exists, just confirm
if (Test-Path ".gitignore") {
    Write-Host ".gitignore already present"
} else {
    @"
node_modules/
dist/
.env
gcp-key.json
*.log
"@ | Out-File -FilePath ".gitignore" -Encoding utf8
    Write-Host ".gitignore created"
}

Write-Host "`n[4/6] Creating branch '$BRANCH_NAME'..." -ForegroundColor Cyan
git checkout -b "$BRANCH_NAME"

Write-Host "`n[5/6] Staging and committing changes..." -ForegroundColor Cyan
git add firestore.rules
git add src/server/auth.ts
git add .github/workflows/deploy.yml
git add README.md
git add firebase.json
git add .firebaserc
git add firebase-blueprint.json
git add firestore.indexes.json
git add package.json
git add tsconfig.json
git add vite.config.ts
git add Dockerfile
git add index.html
git add src/
git add functions/

git commit -m "feat: grant app access to missjapugh@gmail.com

- Added missjapugh@gmail.com to isDirector() in firestore.rules
- Added AUTHORIZED_DIRECTOR_EMAILS server-side allowlist in auth.ts
- Auto-provisions Director account on first Google Sign-In for authorized emails
- Added GitHub Actions CI/CD workflow for Firebase Hosting deployment"

Write-Host "`n[6/6] Pushing '$BRANCH_NAME' to GitHub..." -ForegroundColor Cyan
git push -u origin "$BRANCH_NAME"

$exitCode = $LASTEXITCODE
if ($exitCode -eq 0) {
    Write-Host "`n✅ Success! Branch '$BRANCH_NAME' pushed to GitHub." -ForegroundColor Green
    Write-Host "Branch URL: https://github.com/jwavpr/nine-dashboard/tree/Branch%202" -ForegroundColor Green
} else {
    Write-Host "`n❌ Push failed (exit code $exitCode)." -ForegroundColor Red
    Write-Host "If you get an auth error, run: gh auth login  (or set up a Personal Access Token)" -ForegroundColor Yellow
}
