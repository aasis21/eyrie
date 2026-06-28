# cortex instructions

This folder is a personal orchestration HQ. Always-on rules:

- Treat `projects/registry.json` as the catalog of projects; `cd` into a project's
  path before working on it. Projects are siblings under `~`.
- Keep everything local to cortex. Do not write to `~/.copilot`. MCP servers load
  from `mcp/mcp-config.json` via `--mcp-config`.
- Never commit secrets; use `${ENV_VAR}` placeholders.
- Capture loose ideas/tasks in `inbox.md`; log session events in `work/events.jsonl`.
- Specialist agents are in `.github/agents/`; reusable prompts in `prompts/`.
