# Google Cloud Run Deployment Automation Script for Nine Dashboard
# Run this script with: .\deploy.ps1

Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "   NINE DASHBOARD DEPLOYMENT AUTOMATION" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""

# Check if gcloud is installed
if (-not (Get-Command gcloud -ErrorAction SilentlyContinue)) {
    Write-Error "Google Cloud SDK (gcloud) is not installed or not in your PATH. Please install it first: https://cloud.google.com/sdk/docs/install"
    Exit
}

# Menu Selection
Write-Host "Select an option:" -ForegroundColor Yellow
Write-Host "1) Create a new Google Cloud Project automatically (Recommended)"
Write-Host "2) Use an existing Google Cloud Project ID"
$Option = Read-Host "Option (1 or 2)"

$ProjectID = ""

if ($Option -eq "2") {
    $ProjectID = Read-Host "Enter your custom Google Cloud Project ID"
    if ([string]::IsNullOrWhiteSpace($ProjectID)) {
        Write-Host "Project ID cannot be empty. Deployment aborted." -ForegroundColor Red
        Exit
    }
} else {
    # Generate a unique project ID
    $RandomSuffix = Get-Random -Minimum 100000 -Maximum 999999
    $ProjectID = "nine-dashboard-$RandomSuffix"
    
    Write-Host "`nCreating new Google Cloud Project '$ProjectID'..." -ForegroundColor Yellow
    gcloud projects create $ProjectID --name="Nine Dashboard"
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Project creation failed. Please make sure you are logged in and have project creation quotas." -ForegroundColor Red
        Exit
    }

    # Automatically find and link billing account
    Write-Host "`nSearching for active Billing Accounts..." -ForegroundColor Yellow
    $BillingAccounts = gcloud billing accounts list --format="value(name)"
    if ($BillingAccounts) {
        $FirstAccount = $BillingAccounts[0]
        Write-Host "Linking billing account '$FirstAccount' to project '$ProjectID'..." -ForegroundColor Yellow
        gcloud billing projects link $ProjectID --billing-account $FirstAccount
    } else {
        Write-Host "`n[WARNING] No active Google Cloud Billing Account found." -ForegroundColor Red
        Write-Host "Cloud Build/Run deployment will fail without billing enabled." -ForegroundColor Red
        Write-Host "Please enable billing on project '$ProjectID' in the Google Cloud Console:" -ForegroundColor Yellow
        Write-Host "https://console.cloud.google.com/billing/projects?project=$ProjectID" -ForegroundColor Yellow
        $Confirm = Read-Host "Press Enter once billing is enabled to continue, or Ctrl+C to abort"
    }
}

Write-Host "`nSetting gcloud project to: $ProjectID..." -ForegroundColor Yellow
gcloud config set project $ProjectID

# Attempt to load service account email from .env (checking current directory first, then parent directory)
$EnvFile = ".env"
if (-not (Test-Path $EnvFile) -and (Test-Path "..\.env")) {
    $EnvFile = "..\.env"
}

$ServiceAccount = ""
if (Test-Path $EnvFile) {
    Get-Content $EnvFile | ForEach-Object {
        $line = $_.Trim()
        if ($line -and -not $line.StartsWith("#")) {
            $parts = $line.Split("=", 2)
            if ($parts.Length -eq 2) {
                $key = $parts[0].Trim()
                $value = $parts[1].Trim()
                if ($value.StartsWith('"') -and $value.EndsWith('"')) { $value = $value.Substring(1, $value.Length - 2) }
                if ($value.StartsWith("'") -and $value.EndsWith("'")) { $value = $value.Substring(1, $value.Length - 2) }
                if ($key -eq "GOOGLE_SERVICE_ACCOUNT_EMAIL") {
                    $ServiceAccount = $value
                }
            }
        }
    }
}

Write-Host "`nEnabling necessary GCP Services (Cloud Run and Cloud Build)..." -ForegroundColor Yellow
gcloud services enable run.googleapis.com cloudbuild.googleapis.com

Write-Host "`nBuilding and Deploying to Google Cloud Run..." -ForegroundColor Yellow
gcloud run deploy nine-dashboard `
    --source . `
    --port 8080 `
    --region us-central1 `
    --allow-unauthenticated

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n=============================================" -ForegroundColor Green
    Write-Host "   DEPLOYMENT COMPLETED SUCCESSFULLY!" -ForegroundColor Green
    Write-Host "=============================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next Step: Remember to configure your environment variables" -ForegroundColor Yellow
    Write-Host "in the Cloud Run console under the 'Variables & Secrets' tab." -ForegroundColor Yellow
} else {
    Write-Host "`nDeployment failed. Please check the error log above." -ForegroundColor Red
}
