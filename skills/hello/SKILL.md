---
name: hello
description: session boot
---

# Hello

Use at the start of a `~\cortex` session.

1. Stay inside `~\cortex`; never write to `~\.copilot`.
2. Read `work\board.md` for focus, active project, and next tasks.
3. Read `projects\registry.json` for aliases and Windows paths.
4. Run `scripts\status.ps1` to sweep git status of registered projects.
5. Review `inbox.md` for unresolved routing or follow-up items.
6. Append to `work\events.jsonl`:

```json
{"type":"session.start","ts":"<ISO-8601>","cwd":"C:\\Users\\akash\\cortex"}
```

Report:

```text
Active project: <alias or none>
Status: <clean/dirty/blocked summary>
Inbox: <count or notable item>
Next action: <single recommended action>
```

If `work\board.md` is missing, do not create it; fall back to registry and inbox.
