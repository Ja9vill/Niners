$errors = $null
$ast = [System.Management.Automation.Language.Parser]::ParseFile('deploy-all.ps1', [ref]$null, [ref]$errors)
if ($errors.Count -gt 0) {
    foreach ($e in $errors) { Write-Host "ERROR at line $($e.Extent.StartLineNumber): $($e.Message)" }
    exit 1
} else {
    Write-Host "Syntax OK"
    exit 0
}
