---
name: project-router
description: resolve a task to the correct project and cd into it
---

# Project Router

Use when a request needs a target project.

1. Start from `~\cortex`; never write to `~\.copilot`.
2. Read `projects\registry.json` relative to `~\cortex`.
3. Match the request against project `alias`, `name`, `repo`, `tags`, and description.
4. Prefer exact alias matches, then tag and keyword overlap.
5. If one project clearly wins, choose it.
6. Print alias, absolute Windows path, and registry build/test/run commands.
7. `cd` into the chosen project path before project work.
8. Mention any specialist agent or handoff noted in the registry.
9. Do not mutate the registry unless explicitly updating routing data.

Output:

```text
Project: <alias>
Path: C:\Users\akash\<project>
Build: <command or none>
Test: <command or none>
Run: <command or none>
Next: cd <path> ; <first useful command>
```

If no confident match exists, append a timestamped unresolved-request line to `inbox.md`, ask which alias should own it, and do not edit any project.
