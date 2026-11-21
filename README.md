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

The [full setup prompt](docs/setup-prompt.md) is also ready to paste. The
assistant helps you choose a name, location, first projects, and working
preferences. No shell profile changes, global settings, or permissions changes
are needed: open the new folder and start your usual assistant.

## Review updates for my HQ

Open your HQ in your assistant and paste:

> Review my local HQ for useful updates from https://github.com/aasis21/cortex-hq.
> Read `docs/update-prompt.md` in that repo and follow it. Recommend what to
> adopt, adapt, or skip, and don't edit anything until I approve the changes.

The [full update prompt](docs/update-prompt.md) also works for HQs created with
the old installer. It compares upstream changes with your local setup. For
example, you might add a new skill as-is, merge one useful routing rule into
your own instructions, and skip an installer change you don't need.

## What goes in an HQ

- `AGENTS.md` describes how to route requests and how you want the assistant to
  work. Claude Code setups use a `CLAUDE.md` that imports it.
- `registry.json` maps project aliases to existing checkouts and helps route
  work to the right repo. That repo's instructions govern the work.
- The [workflow-discovery skill](.github/skills/workflow-discovery/SKILL.md) helps
  find the right skill or prompt by its name and description before loading it.
- `scratch.md`, example prompts, and specialist agents are optional starting
  points. Add them when you need them.

## Optional helper for assistants

[`scripts/check_registry.py`](scripts/check_registry.py) checks registry
structure and reports which project folders are available. An assistant can
run `python <path-to-helper> <path-to-registry.json>` if Python is already
available. It writes nothing and makes no network requests. Neither prompt
requires this helper or installs anything globally.
