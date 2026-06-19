param(
    [Parameter(Mandatory=$true)]
    [string]$name
)

# Load your functions
. "$PSScriptRoot\..\design-system\New-DesignBlock.ps1"
. "$PSScriptRoot\..\design-system\New-Blueprint.ps1"

Write-Host "✨ Generating UI block: $name"

New-DesignBlock $name
New-Blueprint $name

Write-Host "🎉 Done! Created:"
Write-Host " - designs/blocks/$name.design.md"
Write-Host " - blueprints/$name.component.md"
