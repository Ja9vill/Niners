Write-Host "Authenticating gcloud..." -ForegroundColor Cyan
gcloud auth activate-service-account --key-file=gcp-key.json
gcloud config set project gen-lang-client-0222945352

$StagingBucket = "gs://staging-nine-dashboard-0222945352"
$ProjectID = "gen-lang-client-0222945352"
$SA_EMAIL = "nine-dashboard-sa@$ProjectID.iam.gserviceaccount.com"
$ImageTag = "us-central1-docker.pkg.dev/$ProjectID/nine-repository/nine-dashboard:latest"

# Build image using Cloud Build with custom staging dir
Write-Host "Submitting build to Cloud Build..." -ForegroundColor Cyan
gcloud builds submit --gcs-source-staging-dir="$StagingBucket/stage" --project=$ProjectID .

# Deploy image to Cloud Run
Write-Host "Deploying image to Cloud Run..." -ForegroundColor Cyan
gcloud run deploy nine-dashboard `
  --image=$ImageTag `
  --port 8080 `
  --region us-central1 `
  --allow-unauthenticated `
  --project $ProjectID `
  --service-account $SA_EMAIL
