param(
    [switch]$Force
)

$ErrorActionPreference = "Stop"
$startTime = Get-Date

# Set the service account key for Firebase CLI authentication
$adcKey = "$env:USERPROFILE\firebase-adminsdk-key.json"
if (Test-Path $adcKey) {
    $env:GOOGLE_APPLICATION_CREDENTIALS = $adcKey
    Write-Host "  ... GOOGLE_APPLICATION_CREDENTIALS set to $adcKey" -ForegroundColor Gray
}

$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm"
$separator = "=" * 55

function Write-Step {
    param([string]$Message)
    Write-Host "`n$separator" -ForegroundColor Cyan
    Write-Host "  $Message" -ForegroundColor Cyan
    Write-Host "$separator" -ForegroundColor Cyan
}

function Write-Success {
    param([string]$Message)
    Write-Host "  [OK] $Message" -ForegroundColor Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "  [!] $Message" -ForegroundColor Yellow
}

function Write-ErrorMsg {
    param([string]$Message)
    Write-Host "  [FAIL] $Message" -ForegroundColor Red
}

function Write-Info {
    param([string]$Message)
    Write-Host "  ... $Message" -ForegroundColor Gray
}

# ============================================================
# PHASE 0: PRECHECKS
# ============================================================
Write-Step "PHASE 0: Pre-flight checks"

# 0a. Verify script is running from the project root
if (-not (Test-Path "package.json")) {
    Write-ErrorMsg "package.json not found. Run this script from the project root."
    exit 1
}

# 0b. Check required CLIs
$requiredCLIs = @(
    @{ Name = "node"; Test = { Get-Command node -ErrorAction SilentlyContinue } },
    @{ Name = "npm"; Test = { Get-Command npm -ErrorAction SilentlyContinue } },
    @{ Name = "git"; Test = { Get-Command git -ErrorAction SilentlyContinue } },
    @{ Name = "firebase"; Test = { Get-Command firebase -ErrorAction SilentlyContinue } },
    @{ Name = "gcloud"; Test = { Get-Command gcloud -ErrorAction SilentlyContinue } }
)

$allCLIsFound = $true
foreach ($cli in $requiredCLIs) {
    if (& $cli.Test) {
        Write-Success "$($cli.Name) is available"
    } else {
        Write-ErrorMsg "$($cli.Name) is not installed or not in PATH"
        $allCLIsFound = $false
    }
}
if (-not $allCLIsFound) {
    exit 1
}

# 0c. Check we're on main branch
$branch = git rev-parse --abbrev-ref HEAD
if ($branch -ne "main") {
    Write-Warning "Currently on branch '$branch', not 'main'."
    if (-not $Force) {
        $confirm = Read-Host ('  Deploy from ' + $branch + ' instead? (y/N)')
        if ($confirm -ne "y") {
            Write-ErrorMsg "Aborted by user. Switch to main first: git checkout main"
            exit 1
        }
    }
}

# 0d. Check for unfinished merge/rebase
$mergeHead = git rev-parse -q --verify MERGE_HEAD 2>$null
$rebaseMerge = git rev-parse -q --verify REBASE_HEAD 2>$null
if ($mergeHead -or $rebaseMerge) {
    Write-ErrorMsg "Merge or rebase in progress. Finish or abort it first."
    exit 1
}

# 0e. Check git status for uncommitted changes (optional but informative)
$gitStatus = git status --porcelain
if ([string]::IsNullOrEmpty($gitStatus)) {
    Write-Warning "No uncommitted changes detected."
    if (-not $Force) {
        $confirm = Read-Host ('  Nothing to commit. Continue with pull + deploy anyway? (y/N)')
        if ($confirm -ne "y") {
            Write-Host "Aborted." -ForegroundColor Yellow
            exit 0
        }
    }
} else {
    $changedCount = ($gitStatus -split "`n" | Measure-Object).Count
    Write-Success "Found $changedCount changed files"
}

# 0f. Use Firebase project
$firebaseProject = "gen-lang-client-0222945352"
Write-Info "Firebase project: $firebaseProject"
Write-Info "Cloud Run service: nine-dashboard (us-central1)"
Write-Info "Git remote: origin/main"

if (-not $Force) {
    Write-Host "`n$separator" -ForegroundColor Yellow
    Write-Host "  Ready to deploy everything. Continue?" -ForegroundColor Yellow
    Write-Host "$separator" -ForegroundColor Yellow
    try {
        $confirm = Read-Host "  Press Enter to continue, or type 'n' to abort"
        if ($confirm -eq "n") {
            Write-Host "Deployment aborted by user." -ForegroundColor Yellow
            exit 0
        }
    } catch {
        Write-Host "  Non-interactive mode G�� proceeding automatically." -ForegroundColor Green
    }
}

# ============================================================
# PHASE 1: TYPECHECK
# ============================================================
Write-Step "PHASE 1: TypeScript type-check"

Write-Info "Running: tsc --noEmit"
$tscOutput = & npx tsc --noEmit 2>&1
if ($LASTEXITCODE -ne 0) {
    $tscLines = $tscOutput -split "`n" | Where-Object { $_ -match '\.ts(x)?\(' }
    $userErrors = $tscLines | Where-Object { $_ -notmatch 'node_modules[\\/]' }
    $vendorErrors = $tscLines | Where-Object { $_ -match 'node_modules[\\/]' }

    if ($userErrors.Count -gt 0) {
        $ec = $userErrors.Count
        Write-Host "  [FAIL] TypeScript errors found in source code (" $ec " errors):" -ForegroundColor Red
        $userErrors | ForEach-Object { Write-Host "    $_" -ForegroundColor Red }
        if ($vendorErrors.Count -gt 0) {
            $vc = $vendorErrors.Count
            Write-Host "  [!] Also " $vc " errors in node_modules (third-party, not your code)" -ForegroundColor Yellow
        }
        exit 1
    }

    $vc = $vendorErrors.Count
    Write-Host "  [!] " $vc " TypeScript errors in node_modules only (third-party packages, not your code)" -ForegroundColor Yellow
    Write-Warning "These can safely be ignored. Suggestion: run 'npm update' to try fixing them."
} else {
    Write-Success "No type errors"
}

# ============================================================
# PHASE 2: BUILD
# ============================================================
Write-Step "PHASE 2: Build application"

Write-Info "Running: npm run build"
$buildOutput = & npm run build 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-ErrorMsg "Build failed:"
    Write-Host $buildOutput -ForegroundColor Red
    exit 1
}
Write-Success "Build completed"

# ============================================================
# PHASE 3: GIT G�� STAGE, COMMIT, PULL, PUSH
# ============================================================
Write-Step "PHASE 3: Git operations"

# 3a. Stage all changes
Write-Info "Staging all changes (git add -A)"
& git add -A 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-ErrorMsg "Failed to stage changes"
    exit 1
}
Write-Success "All changes staged"

# 3b. Commit with timestamp
Write-Info "Committing with message: deploy: $timestamp"
$commitOutput = & git commit -m "deploy: $timestamp" 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Success "Committed successfully"
} elseif ($LASTEXITCODE -eq 1 -and $commitOutput -match "nothing to commit") {
    Write-Warning "Nothing to commit G�� working tree clean"
} else {
    Write-ErrorMsg "Commit failed:"
    Write-Host $commitOutput -ForegroundColor Red
    exit 1
}

# Capture the current HEAD for rollback reference
$currentHead = git rev-parse HEAD
Write-Info "Current HEAD: $currentHead"

# 3c. Pull with rebase
Write-Info "Pulling latest from origin/main (with rebase)"
$pullOutput = & git pull origin main --rebase 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-ErrorMsg "Pull/rebase failed G�� possible conflicts:"
    Write-Host $pullOutput -ForegroundColor Red
    Write-Host "`n  Resolve conflicts manually, then run the remaining deploy steps." -ForegroundColor Yellow
    exit 1
}
Write-Success "Pull + rebase completed"

# 3d. Push
Write-Info "Pushing to origin/main"
$pushOutput = & git push origin main 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-ErrorMsg "Push failed:"
    Write-Host $pushOutput -ForegroundColor Red
    exit 1
}
Write-Success "Pushed to origin/main"

# 3e. Create a deploy tag for build preservation
$tagName = "deploy/$(Get-Date -Format 'yyyy-MM-dd-HHmm')"
Write-Info "Creating deploy tag: $tagName"
$tagOutput = & git tag -a $tagName -m "Deploy $timestamp (HEAD: $currentHead)" 2>&1
if ($LASTEXITCODE -eq 0) {
    & git push origin $tagName 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Tag created and pushed: $tagName"
        Write-Info "To rollback to this build later: git checkout $tagName"
    } else {
        Write-Warning "Tag created locally but push failed G�� push manually: git push origin $tagName"
    }
} else {
    Write-Warning "Failed to create deploy tag G�� continuing anyway"
}

# ============================================================
# PHASE 4: FIREBASE DEPLOY G�� HOSTING
# ============================================================
Write-Step "PHASE 4: Deploy Firebase Hosting"

Write-Info "Running: firebase deploy --only hosting"
$hostOutput = & firebase deploy --only hosting 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-ErrorMsg "Firebase Hosting deploy had issues (see above)"
    Write-Host $hostOutput -ForegroundColor Red
} else {
    Write-Success "Firebase Hosting deployed"
}

# ============================================================
# PHASE 5: CLOUD RUN DEPLOY
# ============================================================
Write-Step "PHASE 5: Deploy Cloud Run"

Write-Info "Running: gcloud run deploy nine-dashboard ..."
$crOutput = & gcloud run deploy nine-dashboard `
    --source . `
    --port 8080 `
    --region us-central1 `
    --allow-unauthenticated 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-ErrorMsg "Cloud Run deploy had issues (see above)"
    Write-Host $crOutput -ForegroundColor Red
} else {
    Write-Success "Cloud Run deployed"
}

# ============================================================
# SUMMARY
# ============================================================
$endTime = Get-Date
$elapsed = ($endTime - $startTime).TotalSeconds
$elapsedStr = "{0:N1}" -f $elapsed

Write-Host "`n===========================" -ForegroundColor Green
Write-Host "  DEPLOYMENT COMPLETE" -ForegroundColor Green
Write-Host ("=" * 55) -ForegroundColor Green
Write-Host "  Elapsed time: $elapsedStr seconds" -ForegroundColor Cyan
Write-Host "  Timestamp:    $timestamp" -ForegroundColor Cyan
Write-Host "  HEAD commit:  $currentHead" -ForegroundColor Gray
Write-Host "  Branch:       $branch" -ForegroundColor Gray
Write-Host "  Deploy tag:   $tagName" -ForegroundColor Gray
Write-Host ("=" * 55) -ForegroundColor Green
Write-Host "`n  To rollback to this exact build:" -ForegroundColor Yellow
Write-Host "    git checkout $tagName" -ForegroundColor Yellow
Write-Host "    npm run build" -ForegroundColor Yellow
Write-Host "    firebase deploy --only hosting" -ForegroundColor Yellow
Write-Host "    gcloud run deploy nine-dashboard --source . --port 8080 --region us-central1" -ForegroundColor Yellow
Write-Host "`n  To revert the last commit without rolling back:" -ForegroundColor Yellow
Write-Host "    git revert HEAD" -ForegroundColor Yellow
Write-Host "`n"
