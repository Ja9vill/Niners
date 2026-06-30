function Test-Func { Write-Host "called later" }
Test-Call
function Test-Call { Write-Host "called early" }
