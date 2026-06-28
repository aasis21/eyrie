param([string]$Text)

$Root = Split-Path -Parent $PSScriptRoot
$InboxPath = Join-Path $Root 'inbox.md'
$timestamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss zzz'
$body = if ($null -eq $Text) { '' } else { ($Text -replace '\r?\n', ' ').Trim() }

if (-not (Test-Path -LiteralPath $InboxPath)) {
    New-Item -ItemType File -Path $InboxPath -Force | Out-Null
}

Add-Content -LiteralPath $InboxPath -Value "- [ ] $timestamp $body"
