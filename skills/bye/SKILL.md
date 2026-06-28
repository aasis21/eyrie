---
name: bye
description: session handover
---

# Bye

Use before ending a `~\cortex` session.

1. Stay in `~\cortex`; never write to `~\.copilot`.
2. Identify the active project from board, recent events, or context.
3. Write `work\HANDOVER.md`:

```markdown
# Handover

- Project: <alias or none>
- Done: <short bullets>
- Next: <one clear action>
- Blockers: <none or bullets>
```

4. Append to `work\events.jsonl`:

```json
{"type":"session.close","ts":"<ISO-8601>","project":"<alias or none>"}
```

5. Review `git status --short` in `~\cortex`.
6. Run `git add work\HANDOVER.md work\events.jsonl` plus intentional cortex files.
7. Commit with a concise message, then report commit hash, next action, and blockers.
