# Uses a local MCP config so cortex avoids global ~/.copilot state.
Set-Location -LiteralPath 'C:\Users\akash\cortex'
& copilot --mcp-config 'mcp\mcp-config.json'
