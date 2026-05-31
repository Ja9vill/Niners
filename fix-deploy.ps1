#!/usr/bin/env pwsh
# ============================================================
#  fix-deploy.ps1
#  Fixes the Cloud Run "Account deleted" error and deploys
#  the nine-dashboard service.
#
#  Root cause: The Cloud Build service agent
#  (service-580294245942@gcp-sa-cloudbuild.iam.gserviceaccount.com)
#  lost access to the Cloud Run Sources GCS bucket because
#  a referenced billing/service account (281486506382082) was deleted.
#  The --source flag on gcloud run deploy uses Cloud Build internally,
#  and that build agent needs storage.objectAdmin on the staging bucket.
# ============================================================

$PROJECT_ID  = "gen-lang-client-0222945352"
$PROJECT_NUM = "580294245942"
$REGION      = "us-central1"
$SERVICE     = "nine-dashboard"
$SA_EMAIL    = "nine-dashboard-sa@$PROJECT_ID.iam.gserviceaccount.com"

Write-Host "`n[1/5] Authenticating with owner service account..." -ForegroundColor Cyan
gcloud auth activate-service-account --key-file=gcp-key.json
gcloud config set project $PROJECT_ID

Write-Host "`n[2/5] Granting iam.serviceAccountUser on the Compute default SA..." -ForegroundColor Cyan
# The deploying SA must be able to 'act as' the Compute Engine default SA
gcloud iam service-accounts add-iam-policy-binding `
  "$PROJECT_NUM-compute@developer.gserviceaccount.com" `
  --member="serviceAccount:$SA_EMAIL" `
  --role="roles/iam.serviceAccountUser" `
  --project=$PROJECT_ID

Write-Host "`n[3/5] Granting Cloud Build service agent storage access..." -ForegroundColor Cyan
# The Cloud Build service agent needs objectAdmin on Cloud Run's source staging bucket
$BUILD_AGENT = "service-$PROJECT_NUM@gcp-sa-cloudbuild.iam.gserviceaccount.com"

# Grant Cloud Build service agent the objectAdmin role on the staging bucket
gcloud storage buckets add-iam-policy-binding `
  "gs://run-sources-$PROJECT_ID-$REGION" `
  --member="serviceAccount:$BUILD_AGENT" `
  --role="roles/storage.objectAdmin" `
  --project=$PROJECT_ID

# Also grant Cloud Build SA the Cloud Run Developer role so it can create revisions
gcloud projects add-iam-policy-binding $PROJECT_ID `
  --member="serviceAccount:$BUILD_AGENT" `
  --role="roles/run.developer"

Write-Host "`n[4/5] Ensuring the deploying SA has Cloud Run Admin role..." -ForegroundColor Cyan
gcloud projects add-iam-policy-binding $PROJECT_ID `
  --member="serviceAccount:$SA_EMAIL" `
  --role="roles/run.admin"

gcloud projects add-iam-policy-binding $PROJECT_ID `
  --member="serviceAccount:$SA_EMAIL" `
  --role="roles/storage.admin"

Write-Host "`n[5/5] Deploying to Cloud Run..." -ForegroundColor Cyan
gcloud run deploy $SERVICE `
  --source . `
  --port 8080 `
  --region $REGION `
  --allow-unauthenticated `
  --project $PROJECT_ID `
  --service-account $SA_EMAIL

Write-Host "`nDone! Check the output above for the deployed URL." -ForegroundColor Green
