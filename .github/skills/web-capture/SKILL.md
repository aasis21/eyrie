---
name: web-capture
description: "Agent-driven capture of web UIs with the Playwright MCP: sanitized screenshots and raw scene recordings (scripted cursor and typing, ~15 fps frames assembled to MP4), with no human recording. Covers browser session rules, a live public sanitizer (replace names, IDs, hosts and titles in the DOM), a scene recorder, frame assembly and a leak audit. Use for docs screenshots, PR media, bug repros and footage for product-video. It does NOT make finished videos; that is product-video. Triggers: capture screenshots, sanitize screenshots, record the UI yourself, Playwright recording."
argument-hint: "<screenshots|video> <app URL> <what to show>"
---

# Web capture

Capture what a web UI shows, sanitized for the audience, with no human at the
keyboard. This skill owns **how** to capture. Callers own **what** and **where**:

| Caller | Uses this for | Owns |
|---|---|---|
| `product-video` | Raw video scenes | Story, Clueso build, narration, export |
| Docs work in a project | Docs screenshots, a docs video file | Page structure, embed, builds, PR |
| PR media, bug repros | Before/after shots, a short repro clip | The PR or issue |

## Output folder

All capture work (sanitizer configs, scene files, raw frames, shots, scenes)
goes in one per-task folder in the HQ's generated-output location from
`AGENTS.md`: outside any repository, for example a temp or local app-data
folder. This skill calls it `<out>`. Never write captures into a repository
until they are audited and the caller asks for them.

## Workflow

1. **Set up the session**: [session-setup](references/session-setup.md). One
   1920x1080 viewport, a fresh context, tours dismissed.
2. **Sanitize** (anything leaving your machine or team): [sanitize-for-public](references/sanitize-for-public.md).
   Build with `scripts/build_capture.py sanitizer` and install it before the
   first navigation.
3. **Explore off camera.** Walk every form and page once, stopping before Save.
   Record labels, option lists, button names and which text is a link. Never
   script a scene you haven't explored.
4. **Capture**:
   - Screenshots: [screenshots](references/screenshots.md).
   - Video: [video-scenes](references/video-scenes.md) with
     `scripts/scene-template.js` and `scripts/assemble_frames.py`.
5. **Audit before anything leaves the machine**: [capture-audit](references/capture-audit.md).

## Scripts

| Script | Purpose |
|---|---|
| `scripts/build_capture.py` | Fills the templates: `sanitizer <config.json> <flag> <out.js>`; `scene <actions.js> <frames_dir> <out.js> [frame_regex]` |
| `scripts/sanitize.tpl.js` | Live DOM sanitizer template (text, titles, inputs, options, banners, cursor) |
| `scripts/sanitize.config.example.json` | Config shape; keep real configs in `<out>`, never in a repo |
| `scripts/scene-template.js` | Scene recorder: `f` (lazy app frame), `glide`, `click`, `type`, `hold`, `tours`, `settle`, `mark` |
| `scripts/assemble_frames.py` | `f<idx>_<ms>.jpg` frames to a 30 fps H.264 MP4 (`imageio-ffmpeg`) |

Needs Python 3.8+ with `imageio-ffmpeg` (`python -m pip install imageio-ffmpeg`)
and the Playwright MCP. Validated 2026-11-17: the built sanitizer replaced
static, streamed and input text and drew the cursor, and a test scene captured
78 frames that assembled into an MP4.

## Rules

- **Replace, don't blur.** Sanitize in the DOM so frames are clean at the
  source; blur only leftovers you can't reach (images, canvas).
- **Never store real names in the skill or a repo.** Sanitizer configs and raw
  frames stay in `<out>`. Per-app selectors and cast names you want to reuse
  can go in a Lore topic (for example `lore/<area>/web-capture.md`).
- **Don't change live systems to make a shot.** Prefer read-only capture. When a
  scene must create something (add a record, send a chat), use test
  resources, record what changed and how to restore it.
- **One concern per file.** Write scene bodies to files and run them with
  `browser_run_code_unsafe(filename)`; inline code gets truncated and can't be
  re-run.
