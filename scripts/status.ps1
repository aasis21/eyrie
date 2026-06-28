$ErrorActionPreference = 'Continue'

$Root = Split-Path -Parent $PSScriptRoot
$RegistryPath = Join-Path $Root 'projects\registry.json'

if (-not (Test-Path -LiteralPath $RegistryPath)) {
    Write-Warning "Registry not found: $RegistryPath"
    exit 0
}

try {
    $Registry = Get-Content -LiteralPath $RegistryPath -Raw | ConvertFrom-Json
} catch {
    Write-Warning "Could not read registry: $($_.Exception.Message)"
    exit 0
}

function Invoke-GitSafe {
    param([string]$RepoPath, [string[]]$GitArgs)
    $output = & git -C $RepoPath @GitArgs 2>$null
    if ($LASTEXITCODE -ne 0) { return $null }
    return $output
}

foreach ($entry in $Registry.projects.PSObject.Properties) {
    $alias = $entry.Name
    $project = $entry.Value
    if ($project.status -ne 'active' -or -not $project.path -or -not (Test-Path -LiteralPath $project.path -PathType Container)) {
        continue
    }

    $branch = Invoke-GitSafe $project.path @('rev-parse', '--abbrev-ref', 'HEAD')
    if (-not $branch) {
        Write-Output "$alias`t(not a git repo)"
        continue
    }

    Write-Output "$alias`t$branch"
    $status = Invoke-GitSafe $project.path @('status', '-s')
    if ($status) {
        $status | ForEach-Object { Write-Output "  $_" }
    } else {
        Write-Output '  clean'
    }
}
