# cortex

A minimal **bootstrapper** for a personal or work HQ: one folder you open Copilot CLI
from to manage a bunch of projects from a single entry point. cortex gives you a
skeleton — a project registry, an orchestrator that routes requests, and a specialist
template. You enrich the folder over time. Self-contained: never touches `~/.copilot`.

## Install

```powershell
irm https://raw.githubusercontent.com/aasis21/cortex-hq/main/install.ps1 | iex
```

Scaffolds an HQ under `~` and registers a launch command. Defaults to **cortex**, or
pick another (neuron, nexus, axon, hub, helm, atlas) or a custom name — so multiple
focused HQs coexist. Cross-platform: `python install.py`.

## What you get
- `AGENTS.md` — orchestrator that triages + routes (auto-loaded).
- `registry.json` — your project catalog (empty to start).
- `.github/agents/` — orchestrator + `project-specialist` template.
- `.github/prompts/`, `.github/skills/` — example prompt + skill to copy.
- `mcp/mcp-config.json` — local MCP servers (github). Secrets via `${ENV_VAR}`.
- `scripts/launch.ps1` — opens the CLI with the local MCP config.
- `scratch.md` — quick capture / backlog.

Add projects, prompts, skills, and scripts as you grow. It's your folder.
