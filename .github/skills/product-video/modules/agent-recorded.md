---
name: agent-recorded
description: "Make a narrated product video with no human recording: the agent prepares demo state, records sanitized UI scenes with Playwright (web-capture), cuts them locally, builds and syncs in Clueso, audits and publishes. Use when the user doesn't want to record, for public or customer-facing videos, or when takes must be repeatable."
---

# Agent-recorded video

The whole video is produced by the agent. Built and verified on a public
2:52 feature video (2026-11-17) that shipped in product docs. Use with
[production](production.md) for story, Clueso and export rules.

## Pipeline

| Step | Do | Owner |
|---|---|---|
| 1 Brief and script | Audience, cast, simulated scenario, scene list; current vs proposed narration as text | [story-and-script](../references/story-and-script.md) |
| 2 Workspace | One notes folder for script and learnings; working files in `<out>` | This module |
| 3 Prepare demo state | Demo data, test accounts; if the app has AI assistants or agents, clean old instructions or memory and dry-run each prompt | The product's own tooling |
| 4 Sanitize | Cast mapping, title pool, input and option masking | `web-capture` sanitize-for-public |
| 5 Explore | Walk every form and page off camera; note selectors | `web-capture` session-setup |
| 6 Record | One scene file per take; marks at each action; record once, cut many | `web-capture` video-scenes |
| 7 Review takes | Contact sheet + full-resolution frames at the marks; read every reply | `web-capture` capture-audit |
| 8 Cut | Speed up typing and waiting; result screens at 1-1.5x; start after page load | [local-cutting](../references/local-cutting.md) |
| 9 Build | Duplicate a finished project for its design; swap footage; narration with markers; labels, zooms, end card | [clueso-mcp-playbook](../references/clueso-mcp-playbook.md) |
| 10 Sync check | One frame per narration clause (cue sheet); every clip 0.85-1.15x | [sync-and-audit](../references/sync-and-audit.md) |
| 11 Export | Ask cost first; crop watermark only if allowed; `scripts/audit.ps1` | [watermark-and-export](../references/watermark-and-export.md) |
| 12 Publish | Docs embed, PR or share | Caller |

## Workspace layout

```
<notes>/videos/<video>/            durable; Markdown and CSV only
  script.md       cast, scenario, scenes, narration (current), prompts, run sheet
  learnings.md    verified learnings, appended as you work
<out>/                             the HQ's generated-output location, outside any repo
  tools/          sanitizer config and builds, scene files, seed scripts
  rec/<scene>/    raw frames
  scenes/ cuts/   assembled scenes and local cuts
~/Videos/<project>/                the delivered file
```

Keep raw frames out of synced folders and repositories (thousands of files).

## Rules that came from mistakes

- **Fix the source, not the footage.** A refusal ("I'm the billing team's
  bot, no access") or an access lecture in a reply can't be sanitized away.
  Clean old instructions or memory on every assistant in the scene, then
  re-take.
- **Prompts use past timestamps.** A future time made an assistant refuse.
- **Names on screen must match the prompt.** "Ask the payments bot" failed
  until the integration was named `payments-bot` with a matching
  description.
- **Explore before recording.** Forms, filters (Apply buttons), links vs rows
  and dialogs differ from what you expect.
- **Read the take before cutting.** Extract frames at each mark and read every
  word.
- **Simulated scenarios say so** on screen ("Simulated scenario" tag, "Acme
  · simulated example").
- **Narrate the gist, not the screen.** Viewers can read IDs and numbers; the
  voice says what they mean.
- **Keep the user's approved scenes unchanged** when iterating.
- **Exports cost minutes.** State the cost and ask before each export;
  re-exports after small edits are often free.
- **Never push or publish without explicit permission.**

## Prep checklist (before any assistant or agent scene)

- [ ] Each assistant has one clear role and no conflicting old persona or memory
- [ ] Its instructions keep replies short and avoid internal names, access
      talk and IDs
- [ ] Each on-camera prompt was rehearsed off camera and the answer read in full
- [ ] Integration names and descriptions match the prompt wording
- [ ] Rehearsal chats deleted, or their titles covered by the sanitizer
