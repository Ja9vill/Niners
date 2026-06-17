# Cleanup script for old unused components
Write-Host "Cleaning up old deprecated React components..."

# List of files we are removing based on our review
$filesToDelete = @(
    "src\components\DirectorTab.tsx",
    "src\components\HomeTab.tsx",
    "src\components\FinancialUpload.tsx",
    "src\components\RosterManagementTab.tsx",
    "src\components\TeamLeaderboard.tsx"
)

foreach ($file in $filesToDelete) {
    if (Test-Path $file) {
        Remove-Item $file -Force
        Write-Host "Deleted: $file" -ForegroundColor Green
    } else {
        Write-Host "Already removed or not found: $file" -ForegroundColor Yellow
    }
}

Write-Host "Cleanup complete! You can delete this script if you no longer need it." -ForegroundColor Cyan
