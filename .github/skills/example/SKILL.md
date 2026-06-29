---
name: example-skill
description: Example skill showing the pattern. Rename and edit to make your own. A skill is a reusable, named procedure the orchestrator can run.
---

# Example skill

This is a template. Skills live in `.github/skills/<name>/SKILL.md` and give the orchestrator
a repeatable procedure. Copy this folder, rename it, and replace the steps.

Steps:
1. State the goal and which project (resolve via `registry.json`).
2. `cd` into the project, do the work, run its build/test from the registry.
3. Report what changed and the next action.
