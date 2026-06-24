# Firebase & GCP Project Link Setup Automation Script for Nine Dashboard
# Run this script with: .\setup-firebase.ps1

Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "   NINE DASHBOARD FIREBASE AUTO-SETUP" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""

# Check if gcloud is installed
if (-not (Get-Command gcloud -ErrorAction SilentlyContinue)) {
    Write-Error "Google Cloud SDK (gcloud) is not installed or not in your PATH. Please install it first: https://cloud.google.com/sdk/docs/install"
    Exit
}

# 1. Project ID Selection
$ProjectID = "gen-lang-client-0222945352"
Write-Host "Using default detected project ID: '$ProjectID'" -ForegroundColor Yellow
$InputProject = Read-Host "Press Enter to use '$ProjectID', or type a custom GCP Project ID"
if (-not [string]::IsNullOrWhiteSpace($InputProject)) {
    $ProjectID = $InputProject.Trim()
}

Write-Host "`nSetting gcloud active project to: $ProjectID..." -ForegroundColor Yellow
gcloud config set project $ProjectID
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to set active project. Please make sure you have authenticated by running: gcloud auth login" -ForegroundColor Red
    Exit
}

# 2. Enable Required APIs
Write-Host "`nEnabling required GCP and Firebase APIs..." -ForegroundColor Yellow
gcloud services enable `
    run.googleapis.com `
    cloudbuild.googleapis.com `
    identitytoolkit.googleapis.com `
    firestore.googleapis.com `
    iam.googleapis.com `
    --project=$ProjectID

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to enable APIs." -ForegroundColor Red
    Exit
}

# 3. Create Custom Firestore Database (if not already existing)
$DatabaseID = "nine-talent-management"
Write-Host "`nEnsuring Firestore Database '$DatabaseID' exists..." -ForegroundColor Yellow

$CreateDbResult = gcloud firestore databases create `
    --database=$DatabaseID `
    --location=nam5 `
    --type=firestore-native `
    --project=$ProjectID 2>&1

if ($LASTEXITCODE -eq 0 -or $CreateDbResult -match "already exists" -or $CreateDbResult -match "conflict") {
    Write-Host "✅ Firestore Database '$DatabaseID' is ready." -ForegroundColor Green
} else {
    Write-Host "⚠️ Firestore Database creation output: $CreateDbResult" -ForegroundColor Yellow
}

# 4. Setup Service Account & Key for Backend Credentials
$SaName = "nine-dashboard-sa"
$SaEmail = "$SaName@$ProjectID.iam.gserviceaccount.com"
Write-Host "`nConfiguring Backend Service Account..." -ForegroundColor Yellow

# Create Service Account
gcloud iam service-accounts create $SaName --display-name="Nine Dashboard Service Account" --project=$ProjectID 2>$null

# Grant Owner role
gcloud projects add-iam-policy-binding $ProjectID `
    --member="serviceAccount:$SaEmail" `
    --role="roles/owner" `
    --project=$ProjectID >$null

# Generate Key file
Write-Host "Generating a new private key file 'gcp-key.json'..." -ForegroundColor Yellow
if (Test-Path "gcp-key.json") {
    Remove-Item -Path "gcp-key.json" -Force
}
gcloud iam service-accounts keys create gcp-key.json `
    --iam-account=$SaEmail `
    --project=$ProjectID

if (-not (Test-Path "gcp-key.json")) {
    Write-Host "❌ Failed to generate service account key." -ForegroundColor Red
    Exit
}

# Read Key and parse values
$KeyData = Get-Content -Raw -Path gcp-key.json | ConvertFrom-Json
$PrivateKey = $KeyData.private_key
$ClientEmail = $KeyData.client_email
Write-Host "✅ Backend Service Account configuration created successfully!" -ForegroundColor Green

# 5. Retrieve Client SDK Config from User
Write-Host "`n=============================================" -ForegroundColor Yellow
Write-Host "   PASTE FIREBASE WEB APP SDK CONFIG" -ForegroundColor Yellow
Write-Host "=============================================" -ForegroundColor Yellow
Write-Host "To link your client-side dashboard with Firebase, we need your Web App SDK config keys."
Write-Host "If you don't have a Web App registered yet:"
Write-Host "  1. Open the Firebase Console for your project 'niners'."
Write-Host "  2. Go to Project Settings (gear icon in the sidebar) -> General."
Write-Host "  3. Scroll to the bottom to 'Your apps' and click the Web App icon '</>'."
Write-Host "  4. Register it as 'Nine Dashboard'."
Write-Host "  5. Under 'SDK setup and configuration', copy the keys below:`n"

$ApiKey = Read-Host "Enter VITE_FIREBASE_API_KEY (apiKey)"
$AuthDomain = Read-Host "Enter VITE_FIREBASE_AUTH_DOMAIN (authDomain)"
$StorageBucket = Read-Host "Enter VITE_FIREBASE_STORAGE_BUCKET (storageBucket)"
$MsgSenderId = Read-Host "Enter VITE_FIREBASE_MESSAGING_SENDER_ID (messagingSenderId)"
$AppId = Read-Host "Enter VITE_FIREBASE_APP_ID (appId)"

if ([string]::IsNullOrWhiteSpace($ApiKey) -or [string]::IsNullOrWhiteSpace($AppId)) {
    Write-Host "❌ API Key and App ID cannot be empty. Setup aborted." -ForegroundColor Red
    Exit
}

# 6. Write and update local .env file
Write-Host "`nUpdating local .env file with new credentials..." -ForegroundColor Yellow

$EnvContent = @"
# Firebase Backend Service Account Configuration
FIREBASE_PROJECT_ID="$ProjectID"
FIREBASE_CLIENT_EMAIL="$ClientEmail"
FIREBASE_PRIVATE_KEY="$($PrivateKey.Replace("`n", "\n"))"

# Duplicated fields for client-service account integration
GOOGLE_SERVICE_ACCOUNT_EMAIL="$ClientEmail"
GOOGLE_SERVICE_ACCOUNT_KEY="$($PrivateKey.Replace("`n", "\n"))"

# Firestore database ID (matching the custom database)
VITE_FIREBASE_FIRESTORE_DATABASE_ID="$DatabaseID"

# Firebase Client SDK Configuration
VITE_FIREBASE_API_KEY="$($ApiKey.Trim())"
VITE_FIREBASE_AUTH_DOMAIN="$($AuthDomain.Trim())"
VITE_FIREBASE_PROJECT_ID="$ProjectID"
VITE_FIREBASE_STORAGE_BUCKET="$($StorageBucket.Trim())"
VITE_FIREBASE_MESSAGING_SENDER_ID="$($MsgSenderId.Trim())"
VITE_FIREBASE_APP_ID="$($AppId.Trim())"

# Google Sheets IDs
DATA_MASTERSHEET_ID="1wED5frEjh_Ue85as1J-BMz9VUF6N8ZQpmQGJJZIl0Ag"
FINANCIAL_DATA_SHEET_ID="12hpu7H9UG1RRteudSVKNI4DsrYcspOjKF6CnB5MlXVc"
ROSTER_REPORTING_SHEET_ID="1aXT1BPkzugtoS9G5yU0Y7bdkMHvEs1OKeEqRvMvxLl8"

# API Keys
GOOGLE_API_KEY="AIzaSyChUovV-bXUlujY8RZzYdLJrzUYv5pquMQ"
GEMINI_API_KEY="AIzaSyChUovV-bXUlujY8RZzYdLJrzUYv5pquMQ"
JWT_SECRET="nine-dashboard-secret-key-12345"
"@

$EnvContent | Out-File -FilePath ".env" -Encoding utf8
Write-Host "✅ Local .env file successfully configured!" -ForegroundColor Green

# 7. Seed the brand new database
Write-Host "`nSeeding database with default hosts and financial entries..." -ForegroundColor Yellow
if (Get-Command node -ErrorAction SilentlyContinue) {
    node seed-hosts.js
    node seed-financials.js
    Write-Host "✅ Seeding complete!" -ForegroundColor Green
} else {
    Write-Host "⚠️ Warning: Node.js is not found in your path. Please run 'node seed-hosts.js' and 'node seed-financials.js' manually to populate database." -ForegroundColor Yellow
}

Write-Host "`n=============================================" -ForegroundColor Green
Write-Host "   AUTO-SETUP SUCCESSFULLY COMPLETED!" -ForegroundColor Green
Write-Host "=============================================" -ForegroundColor Green
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "1. Enable Google Sign-In in your Firebase Console under Authentication."
Write-Host "2. Deploy and update Cloud Run service environments by running:"
Write-Host "   .\deploy.ps1"
Write-Host "   .\update-secrets.ps1"
Write-Host "=============================================" -ForegroundColor Green
