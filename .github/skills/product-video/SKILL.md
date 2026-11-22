---
name: product-video
description: "Plan, record and produce narrated product, feature and launch videos with Clueso, including fully agent-recorded videos via web-capture: Clueso MCP connect and auth, story and script, run sheet, local scene cutting (ffmpeg, Python), building in Clueso (background, framing, voiceover sync, zooms, labels, logos, music), pacing, watermark-safe export and verification. Use to make, edit, shorten, speed up or export a demo or launch video, turn a recording into a narrated video, or connect Clueso."
argument-hint: "<video goal or recording>"
---

# Product video

Pick the module for the task and read only the references it names.

| Task | Module |
|---|---|
| Connect or authenticate Clueso, first video, short video from assets | [Clueso setup](modules/clueso-setup.md) |
| Produce or edit a polished product video (about 2 minutes) end to end | [Production](modules/production.md) |
| No human recording: the agent records sanitized UI scenes itself (public videos, repeatable takes) | [Agent-recorded](modules/agent-recorded.md), with Production and the `web-capture` skill |

Load Clueso setup first when the Clueso MCP is not connected. Clueso is
opt-in: the account, workspace and plan are the user's own.

**Make it yours.** Before planning, read the user's brand kit and video taste
from Lore (`lore/me.md`, or a topic such as `lore/<area>/brand-kit.md`); if
there is none, offer to create one with [brand-assets](references/brand-assets.md)
and [product-framing](references/product-framing.md).

**Style:** pick a taste per video and say which, from
[taste-examples](references/taste-examples.md) or the user's own taste notes in
Lore. Study any new reference video with
[reference-videos](references/reference-videos.md) and save what you learn to
the user's taste notes.

**Where files live:** durable notes (script, learnings) in one folder per
video wherever the user keeps project docs; heavy media (raw frames, cuts,
exports) in a per-task folder in the HQ's generated-output location from
`AGENTS.md` (outside any repository), called `<out>` in this skill; the
delivered file in the user's videos folder (for example `~/Videos/<project>/`).

Shared material lives in this skill: `references/` (story, run sheet, local
cutting, Clueso playbook, sync audit, visual design, watermark/export,
scenarios, framing, brand assets, taste) and `scripts/` (`cut_scenes.py`,
`contact_sheet.ps1`, `gradient_bg.py`, `audit.ps1` for crop and delivery
audit, `analyze_reference.py` for studying a reference video). The `.ps1`
scripts run in Windows PowerShell or in PowerShell 7 (`pwsh`) on Windows,
macOS and Linux. Recording without a human uses the `web-capture` skill
(sanitizer, scene recorder, frame assembly).
