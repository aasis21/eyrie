<#
.SYNOPSIS
  One-line bootstrap installer for cortex (a generic work HQ).

.DESCRIPTION
  Clones (or updates) the cortex repo into a checkout dir, then runs install.py
  which scaffolds your HQ into ~/<name> and registers a launch command.

  Run with:
    irm https://raw.githubusercontent.com/aasis21/cortex-hq/main/install.ps1 | iex

  With a chosen name (no prompt):
    & ([scriptblock]::Create((irm https://raw.githubusercontent.com/aasis21/cortex-hq/main/install.ps1))) -Name neuron

.PARAMETER Name
  HQ name (folder + command). Default: cortex. Suggestions: neuron nexus axon hub helm atlas.

.PARAMETER CheckoutDir
  Where to clone/update the repo. Default: %LOCALAPPDATA%\cortex-hq-src.

.PARAMETER Branch
  Git branch. Default: main.
#>
[CmdletBinding()]
param(
    [string]$Name,
    [string]$CheckoutDir = (Join-Path $env:LOCALAPPDATA 'cortex-hq-src'),
    [string]$Branch = 'main'
)

$ErrorActionPreference = 'Stop'
$repo = 'https://github.com/aasis21/cortex-hq.git'
function Step($m) { Write-Host "`n=== $m ===" -ForegroundColor Cyan }
function Ok($m)   { Write-Host "  OK  $m" -ForegroundColor Green }

Step 'Checking prerequisites'
foreach ($cmd in @('git', 'python')) {
    if (-not (Get-Command $cmd -ErrorAction SilentlyContinue)) {
        if ($cmd -eq 'python' -and (Get-Command py.exe -ErrorAction SilentlyContinue)) { Ok 'python (py launcher)'; continue }
        throw "$cmd not found on PATH. Install it first."
    }
    Ok "$cmd available"
}

if (Test-Path (Join-Path $CheckoutDir '.git')) {
    Step "Updating checkout at $CheckoutDir"
    Push-Location $CheckoutDir
    try { git fetch --quiet origin; git checkout --quiet $Branch; git pull --ff-only --quiet origin $Branch; Ok "synced origin/$Branch" }
    finally { Pop-Location }
} else {
    Step "Cloning $repo into $CheckoutDir"
    git clone --quiet --branch $Branch $repo $CheckoutDir
    Ok 'cloned'
}

Step 'Running install.py'
Push-Location $CheckoutDir
try {
    $py = (Get-Command python -ErrorAction SilentlyContinue) ? 'python' : 'py'
    $args = @('install.py')
    if ($Name) { $args += @('--name', $Name) }
    & $py @args
} finally { Pop-Location }
