$ErrorActionPreference = 'Continue'

$Root = Split-Path -Parent $PSScriptRoot
$RegistryPath = Join-Path $Root 'projects\registry.json'
$InboxPath = Join-Path $Root 'inbox.md'

function Invoke-GitSafe {
    param([string]$RepoPath, [string[]]$GitArgs)
    $output = & git -C $RepoPath @GitArgs 2>$null
    if ($LASTEXITCODE -ne 0) { return $null }
    return $output
}

Write-Output 'Commits in the last 24h:'
if (Test-Path -LiteralPath $RegistryPath) {
    try {
        $Registry = Get-Content -LiteralPath $RegistryPath -Raw | ConvertFrom-Json
        foreach ($entry in $Registry.projects.PSObject.Properties) {
            $alias = $entry.Name
            $project = $entry.Value
            if ($project.status -ne 'active' -or -not $project.path -or -not (Test-Path -LiteralPath $project.path -PathType Container)) {
                continue
            }

            Write-Output ""
            Write-Output "${alias}:"
            $commits = Invoke-GitSafe $project.path @('log', '--since=24h', '--oneline')
            if ($commits) {
                $commits | ForEach-Object { Write-Output "  $_" }
            } else {
                $inside = Invoke-GitSafe $project.path @('rev-parse', '--is-inside-work-tree')
                if ($inside) { Write-Output '  (none)' } else { Write-Output '  (not a git repo)' }
            }
        }
    } catch {
        Write-Warning "Could not read registry: $($_.Exception.Message)"
    }
} else {
    Write-Warning "Registry not found: $RegistryPath"
}

Write-Output ""
Write-Output 'Open inbox items:'
if (Test-Path -LiteralPath $InboxPath) {
    $items = Get-Content -LiteralPath $InboxPath | Where-Object { $_ -match '^\s*- \[ \]' }
    if ($items) { $items } else { Write-Output '  (none)' }
} else {
    Write-Output '  (none)'
}
