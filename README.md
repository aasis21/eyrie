# Cortex HQ

One folder to open in Copilot CLI or Claude Code when you work across projects.
Pick your own name, start with the projects you care about, and teach your HQ how
you like to work. Cortex supplies the starting patterns; the result is yours.

## Set up my HQ

Paste this into Copilot CLI or Claude Code from a directory where the assistant
can create the new HQ:

> Help me set up my own HQ from https://github.com/aasis21/cortex-hq. Read
> `docs/setup-prompt.md` in that repo and follow it. Ask me one question at a
> time and show me the plan before creating files.

If your assistant can't open GitHub links, copy the [full setup prompt](docs/setup-prompt.md)
and point it to a local Cortex checkout or supply the named reference files
from one commit. No shell profile or global configuration changes are needed.
After setup, open the HQ folder in your usual assistant and try:
“Which projects are registered, and what workflows are available for one of them?”

## Review updates for my HQ

Open your HQ in your assistant and paste:

> Review my local HQ for useful updates from https://github.com/aasis21/cortex-hq.
> Read `docs/update-prompt.md` in that repo and follow it. Recommend what to
> adopt, adapt, or skip, and don't edit anything until I approve the changes.

The [full update prompt](docs/update-prompt.md) works even if your HQ predates
revision tracking. You might add a new skill as-is, blend a routing rule into
your own instructions, or skip a workflow you don't use. Your existing HQ
isn't replaced. If you only approve some changes, the next review resumes
against the same upstream revision so nothing pending is lost.

## What goes in an HQ

- `AGENTS.md` describes how to route requests and how you want the assistant to
  work. Claude Code setups use a `CLAUDE.md` that imports it.
- `registry.json` maps project aliases to existing checkouts and helps route
  work to the right repo. Use an absolute path, a path starting with `~/`, or
  a path relative to the HQ. The target repo's instructions govern the work.
- The [workflow-discovery skill](.github/skills/workflow-discovery/SKILL.md) helps
  find the right skill or prompt by its name and description before loading it.
- `scratch.md`, example prompts, and specialist agents are optional starting
  points. Add them when you need them.
- `.cortex-source.json` records upstream review revisions and your decisions.
  It does not contain project paths, preferences, or credentials.

To add a project or change how the HQ works, ask the assistant from your HQ.
For example: “Register `~/projects/website` as `website`, and ask me before
committing changes.” Registering an existing checkout doesn't clone or modify it.

## Optional helper for assistants

[`scripts/check_registry.py`](scripts/check_registry.py) checks registry
structure and reports which project folders are available. An assistant can
run `python <path-to-helper> <path-to-registry.json>` if Python is already
available. It writes nothing and makes no network requests. Neither prompt
requires this helper or installs anything globally.
