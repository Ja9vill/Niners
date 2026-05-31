# Google Cloud Run Environment Configuration Script
# Run this script with: .\update-secrets.ps1

Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "   UPDATING CLOUD RUN ENV VARIABLES" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""

if (-not (Test-Path ".env")) {
    Write-Error ".env file not found. Please make sure you have your .env file in the root directory."
    Exit
}

Write-Host "Reading local .env configuration..." -ForegroundColor Yellow
$EnvContent = Get-Content -Path ".env"
$YamlLines = @()

foreach ($Line in $EnvContent) {
    if ([string]::IsNullOrWhiteSpace($Line) -or $Line.Trim().StartsWith("#")) {
        continue
    }
    
    $Index = $Line.IndexOf('=')
    if ($Index -le 0) {
        continue
    }
    
    $Key = $Line.Substring(0, $Index).Trim()
    $Value = $Line.Substring($Index + 1).Trim()
    
    # Strip wrapping quotes if they exist in .env
    if (($Value.StartsWith('"') -and $Value.EndsWith('"')) -or ($Value.StartsWith("'") -and $Value.EndsWith("'"))) {
        $Value = $Value.Substring(1, $Value.Length - 2)
    }
    
    if ($Key -eq "FIREBASE_PROJECT_ID") {
        $DetectedProjectID = $Value
    }
    
    # Escape double quotes for YAML string block
    $EscapedValue = $Value.Replace('"', '\"')
    $YamlLines += "$($Key): `"$EscapedValue`""
}

# Fallback project ID if not parsed
if ([string]::IsNullOrWhiteSpace($DetectedProjectID)) {
    $DetectedProjectID = "gen-lang-client-0222945352"
}

# Write env.yaml securely
$YamlLines | Out-File -FilePath "env.yaml" -Encoding utf8

Write-Host "Uploading variables to Cloud Run service 'nine-dashboard' in project '$DetectedProjectID'..." -ForegroundColor Yellow
gcloud run services update nine-dashboard --env-vars-file env.yaml --region us-central1 --project $DetectedProjectID

# Secure Cleanup
if (Test-Path "env.yaml") {
    Remove-Item -Path "env.yaml" -Force
    Write-Host "Removed temporary config file 'env.yaml'." -ForegroundColor Gray
}

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n=============================================" -ForegroundColor Green
    Write-Host "   CONFIGURATION SUCCESSFULLY UPLOADED!" -ForegroundColor Green
    Write-Host "=============================================" -ForegroundColor Green
} else {
    Write-Host "`nFailed to update configurations. Check the logs above." -ForegroundColor Red
}
