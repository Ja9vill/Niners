Write-Host "Authenticating gcloud..." -ForegroundColor Cyan
gcloud auth activate-service-account --key-file=gcp-key.json
gcloud config set project gen-lang-client-0222945352

$Bucket = "gs://run-sources-gen-lang-client-0222945352-us-central1"

Write-Host "Emptying corrupted bucket $Bucket..." -ForegroundColor Cyan
gcloud storage rm --recursive "$Bucket/**" --quiet

Write-Host "Deleting corrupted bucket $Bucket..." -ForegroundColor Cyan
gcloud storage buckets delete $Bucket --quiet

Write-Host "Deploying to Cloud Run..." -ForegroundColor Cyan
powershell -ExecutionPolicy Bypass -File .\fix-deploy.ps1
