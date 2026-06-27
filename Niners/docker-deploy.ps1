Write-Host "Authenticating gcloud..." -ForegroundColor Cyan
gcloud auth activate-service-account --key-file=gcp-key.json
gcloud config set project gen-lang-client-0222945352

Write-Host "Configuring Docker authentication..." -ForegroundColor Cyan
gcloud auth configure-docker --quiet

Write-Host "Building Docker image locally..." -ForegroundColor Cyan
docker build -t gcr.io/gen-lang-client-0222945352/nine-dashboard:latest .

Write-Host "Pushing image to Container Registry..." -ForegroundColor Cyan
docker push gcr.io/gen-lang-client-0222945352/nine-dashboard:latest

Write-Host "Deploying to Cloud Run..." -ForegroundColor Cyan
gcloud run deploy nine-dashboard `
  --image gcr.io/gen-lang-client-0222945352/nine-dashboard:latest `
  --port 8080 `
  --region us-central1 `
  --allow-unauthenticated `
  --project gen-lang-client-0222945352 `
  --service-account nine-dashboard-sa@gen-lang-client-0222945352.iam.gserviceaccount.com

Write-Host "Deployment completed!" -ForegroundColor Green
