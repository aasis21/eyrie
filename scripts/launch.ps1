# Uses a local MCP config so the HQ avoids global ~/.copilot state.
$Root = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $Root
& copilot --mcp-config (Join-Path $Root 'mcp\mcp-config.json')
