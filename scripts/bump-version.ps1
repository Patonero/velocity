# Velocity Launcher Version Bump Script
# Usage: .\scripts\bump-version.ps1 [patch|minor|major]

param(
    [Parameter(Mandatory = $false)]
    [ValidateSet("patch", "minor", "major")]
    [string]$BumpType = "patch"
)

# Get current version
$packageJson = Get-Content package.json | ConvertFrom-Json
$currentVersion = $packageJson.version
Write-Host "Current version: $currentVersion" -ForegroundColor Green

# Parse version
$versionParts = $currentVersion.Split('.')
$major = [int]$versionParts[0]
$minor = [int]$versionParts[1]
$patch = [int]$versionParts[2]

# Bump version based on type
switch ($BumpType) {
    "major" {
        $major++
        $minor = 0
        $patch = 0
    }
    "minor" {
        $minor++
        $patch = 0
    }
    "patch" {
        $patch++
    }
}

$newVersion = "$major.$minor.$patch"
Write-Host "New version: $newVersion" -ForegroundColor Yellow

# Confirm with user
$confirmation = Read-Host "Update version to $newVersion? (y/N)"
if ($confirmation -ne 'y' -and $confirmation -ne 'Y') {
    Write-Host "Version bump cancelled." -ForegroundColor Red
    exit 0
}

# Update package.json
$packageJson.version = $newVersion
$packageJson | ConvertTo-Json -Depth 100 | Set-Content package.json

Write-Host "Version updated to $newVersion!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Review the changes: git diff package.json"
Write-Host "2. Commit the changes: git add package.json && git commit -m 'chore: bump version to $newVersion'"
Write-Host "3. Push to trigger release: git push origin main"