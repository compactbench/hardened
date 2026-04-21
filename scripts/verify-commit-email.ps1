# Verify the local git commit email matches the expected noreply address.

$ErrorActionPreference = 'Stop'

$allowedEmailPattern = '^\d+\+UsernameLoad@users\.noreply\.github\.com$'

try {
    $repoRoot = git rev-parse --show-toplevel 2>$null
} catch {
    Write-Host 'ERROR: not inside a git repo'
    exit 1
}

if (-not $repoRoot) {
    Write-Host 'ERROR: not inside a git repo'
    exit 1
}

Set-Location $repoRoot

$localName = git config --local user.name 2>$null
$localEmail = git config --local user.email 2>$null

function Fail($msg) {
    Write-Host ''
    Write-Host '  ========================================'
    Write-Host '  COMMIT EMAIL CHECK FAILED'
    Write-Host '  ========================================'
    Write-Host "  $msg"
    Write-Host ''
    Write-Host '  Fix it:'
    Write-Host '    git config --local user.name  "<your display name>"'
    Write-Host '    git config --local user.email "216450868+UsernameLoad@users.noreply.github.com"'
    Write-Host ''
    exit 1
}

if (-not $localName) {
    Fail 'Local user.name is not set.'
}
if (-not $localEmail) {
    Fail 'Local user.email is not set.'
}
if ($localEmail -notmatch $allowedEmailPattern) {
    Fail "Local user.email '$localEmail' does not match the expected noreply address."
}

Write-Host 'OK: commit email verified.'
Write-Host "  user.name  = $localName"
Write-Host "  user.email = $localEmail"
