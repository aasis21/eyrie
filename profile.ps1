# Eyrie launcher for PowerShell. Dot-source from your profile (scripts/install-shell.mjs
# adds the block). Defines a function named $env:EYRIE_COMMAND (default: eyrie):
#   <cmd> [copilot args...]   start Copilot CLI in the HQ
#   <cmd> enable <alias>      load Eyrie in that project's repository sessions
#   <cmd> disable <alias>     stop loading Eyrie there

if (-not $env:EYRIE_HOME) { $env:EYRIE_HOME = $PSScriptRoot }
$eyrieCommand = if ($env:EYRIE_COMMAND) { $env:EYRIE_COMMAND } else { 'eyrie' }
if ($eyrieCommand -notmatch '^[A-Za-z_][A-Za-z0-9_-]*$') {
    Write-Warning "EYRIE_COMMAND '$eyrieCommand' is not a valid function name; using 'eyrie'."
    $eyrieCommand = 'eyrie'
}

Set-Item -Path "Function:global:$eyrieCommand" -Value {
    $home_ = $env:EYRIE_HOME
    if ($args.Count -ge 1 -and ($args[0] -eq 'enable' -or $args[0] -eq 'disable')) {
        if ($args.Count -ne 2) { Write-Error "Usage: $($MyInvocation.MyCommand.Name) $($args[0]) <alias>"; return }
        & node (Join-Path $home_ 'scripts/repo-mode.mjs') $args[0] $args[1] --home $home_
        return
    }
    $copilotArgs = @()
    $mcpConfig = Join-Path $home_ 'mcp-config.json'
    if (Test-Path -LiteralPath $mcpConfig -PathType Leaf) {
        $copilotArgs += @('--additional-mcp-config', "@$mcpConfig")
    }
    Set-Location -LiteralPath $home_
    & copilot @copilotArgs @args
}
Remove-Variable eyrieCommand
