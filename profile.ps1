# cortex shell profile (PowerShell)
# Defines the `cortex` command: cd into the control center and launch Copilot CLI.
# Source from $PROFILE:  . "$HOME\cortex\profile.ps1"
function cortex {
    Set-Location "$HOME\cortex"
    copilot --allow-all --additional-mcp-config "@mcp\mcp-config.json" @args
}
