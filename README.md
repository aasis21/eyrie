# cortex

Personal work **control center** — the single folder I open Copilot CLI from to
orchestrate all my hobby projects. Pairs with [`engram`](../engram) (memory) as
the orchestrating brain.

## Layout
- `AGENTS.md` — orchestrator router (auto-loaded by Copilot CLI).
- `.github/agents/` — specialist agents (anya, engram, kirana360).
- `projects/registry.json` — single source of truth: paths, repos, build/test/run.
- `prompts/` — reusable prompt templates.
- `skills/` — local skills: project-router, hello, bye.
- `work/` — board, append-only events.jsonl, latest HANDOVER.
- `mcp/mcp-config.json` — local MCP servers.
- `scripts/` — status, capture, daily, launch.
- `inbox.md` — quick capture.

## Use
- Launch: `scripts/launch.ps1` (starts CLI with `--mcp-config mcp/mcp-config.json`).
- Status: `pwsh scripts/status.ps1`  •  Capture: `pwsh scripts/capture.ps1 "idea"`.
- Self-contained: never writes to `~/.copilot`. Secrets via `${ENV_VAR}`.

## Projects
Siblings under `~`: anya, engram, kirana360 (stub until cloned).
