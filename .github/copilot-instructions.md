# HQ instructions

Bootstrapped orchestration HQ. Always-on rules:

- `registry.json` is the project catalog; `cd` into a project before working
  on it. Projects are siblings under `~`.
- Self-contained: never write to `~/.copilot`. MCP loads from `mcp/mcp-config.json`.
- Never commit secrets; use `${ENV_VAR}`.
- Capture loose ideas in `scratch.md`. Grow the folder as you like.
