---
name: production
description: "Produce a polished product or feature video (about 2 minutes) from screen recordings, using the Clueso MCP plus local tools (ffmpeg, Python). Covers story and script, recording run sheets, local scene cutting, Clueso build (background, framing, voiceover sync, zooms, labels, logos, music), pacing, watermark-safe export and verification. Use when asked to make, edit, shorten, speed up, or export a product or launch video, or to turn a raw recording into a narrated product video. For first-time Clueso connection use the Clueso setup module."
---

# Product video production

Turn a raw screen recording into a short, narrated product video that argues
one point: **problem → mechanism → proof → value → close**. Clueso does the
narration, sync, layout, and export; local tools do the precise cutting and
verification Clueso's API cannot.

## Operating rules

1. **Plan, get sign-off, then build.** Show the current state and the exact
   proposed change (old → new wording, seconds saved, what is lost) before
   editing. Batch approved changes into one pass; re-verify after every pass.
2. **Keep a living script.** One Markdown file holds the cast, beats, final
   narration, prompts, and readiness. Update it whenever narration changes.
3. **Write narration, don't transcribe.** The presenter's spoken cues are
   timing markers, not script. Reword for clarity and confidence; never copy
   "this is for demo purposes" asides.
4. **Show, then prove.** Compress setup screens; keep the moment the product
   produces a real, specific result. A finding on screen beats any claim.
5. **Verify with frames, not assumptions.** Check mid-clip frames after every
   change. A tool's "succeeded" does not prove the audio or layout landed.
6. **Never publish private assets** to third-party hosts; blur names, IDs,
   account data, personal camera tiles, and typos.

## Workflow

| Step | Do | Reference |
|---|---|---|
| 1 Brief | Audience, single message, target length (default 2:00), tone, cast, what must be proven | [story-and-script](../references/story-and-script.md), [product-framing](../references/product-framing.md) |
| 2 Prep | Rehearse every prompt off camera; prepare data, accounts, integrations; reset state | [recording-runsheet](../references/recording-runsheet.md), [demo-scenarios](../references/demo-scenarios.md) |
| 3 Record | One take per beat with spoken cues and holds; or one long take with cues | [recording-runsheet](../references/recording-runsheet.md) |
| 4 Cut locally | Contact sheets → choose segments → crop, blur, speed-up waits | [local-cutting](../references/local-cutting.md), `scripts/` |
| 5 Build in Clueso | Upload scenes, order, background, framing, voiceover, sync, zooms, labels, logos, music | [clueso-mcp-playbook](../references/clueso-mcp-playbook.md), [visual-design](../references/visual-design.md), [brand-assets](../references/brand-assets.md) |
| 6 Review | Script read-through, frame checks, timing re-sync, length budget | [story-and-script](../references/story-and-script.md), [sync-and-audit](../references/sync-and-audit.md) |
| 7 Pace | Tighten narration; choose a faster voice if needed | [watermark-and-export](../references/watermark-and-export.md) |
| 8 Export | Export, download, crop watermark if allowed, verify, deliver path | [watermark-and-export](../references/watermark-and-export.md) |

## Length budget (2:00 product video)

| Beat | Seconds | Purpose |
|---|---|---|
| Title | 4–6 | Name + logo |
| Problem | 12–17 | Why this matters; animated, no UI |
| Setup context | 8–10 | What we are looking at ("simulated incident on sample X") |
| Cast / concept | 6–9 | Diagram of the parts |
| Configuration | 15–25 total | Only the screens that show control/safety |
| Proof | 25–35 | The product doing the work and the real result |
| Extension | 10–15 | One "and it also…" beat |
| Close | 10–14 | One-place/value line + end card with call to action |

Land the first real payoff by about 60 seconds. If over budget, cut setup and
configuration first, never the proof. A video can run 2:30 or longer when
every scene earns its time; don't rush result screens to hit a number.

## Tooling

- Clueso MCP tools (discover schemas with the tool search; never guess
  arguments). Read [Clueso setup](clueso-setup.md) first if Clueso is not connected.
- Local: Python with `imageio-ffmpeg` (bundled ffmpeg), `pillow`, `numpy`.
  Install with `python -m pip install imageio-ffmpeg pillow numpy`. No system
  ffmpeg is needed: `python -c "import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())"`.
- Scripts in `scripts/`: `cut_scenes.py`, `contact_sheet.ps1`,
  `gradient_bg.py`, `audit.ps1`. Keep working media in `<out>` (the HQ's
  generated-output location), not in a repository or a synced folder.

## Hard-won pitfalls

See the checklist at the end of
[clueso-mcp-playbook](../references/clueso-mcp-playbook.md#pitfalls-checklist).
The most expensive ones:

- `voiceover_batch` can report success on video clips without regenerating
  speech. Confirm `voiceover_words` is non-empty and ends on your last word.
- Generating speech rescales every element on the clip; re-time key
  animations to the new word timings afterwards.
- Rendering a clip at its end time shows elements mid-exit; check mid-clip.
- Clueso's MCP has no voice-pace or playback-speed control; speeding up an
  export with ffmpeg makes music sound wrong.
- Exports carry a "Made with Clueso" watermark on some plans; design a
  crop-safe layout before building (or scale an existing project into the
  safe area), crop after export only if the plan allows, and keep the raw
  export.
- Plan caps can silently downgrade export resolution.
- For a faster pace, audition faster voices; never time-stretch the export.
- Never leave a slide scene empty while narration plays; add holds on result
  screens when footage feels rushed.
- "Lag" is almost never A/V drift. It's slow-motion footage (< 0.85×), a
  visual that arrives before its words, or a scroll-back inside a cut. Keep
  every video clip at 0.85–1.15×, map one proof frame to each clause, and run
  the delivery audit (speed table, cue sheet, rewind/freeze/silence scans)
  on the exported file before handing it over. See
  [sync-and-audit](../references/sync-and-audit.md).

## Lessons from shipped videos

- **Start from the user's story idea**, then iterate. When internal systems
  can't be shown, swap them for a public sample with the same shape; don't
  drop the story.
- **Order the cast by dependency:** the viewer's own service first, then what
  it depends on, then the external party last. A peer chain reads better than
  one parent orchestrating children.
- **Give each supporting character a role the story needs** (for example "drafts
  the customer update"), not a generic helper role.
- **The receiving side is the best proof.** Showing the other end of a call or
  handoff (its own log, inbox or conversation) proves it was real.
- **No marketing lines.** Each line follows from the one before and leads into
  the next. Ground claims in the product's code and in what is on screen.
- **Use the UI's own field names** in narration ("Description", not
  "purpose").
- **Separate "extends one thing" from "connects things".** Name the
  categories viewers already know, and avoid two terms that sound alike in
  the same line.
- **Prefer holds of ≥ 1 s on result screens** over tighter cuts. After a
  faster voice made a video feel rushed, one meaningful clause plus a 1–2 s
  hold per result scene added about 17 s and fixed it.
- **Fix with what you have.** Cuts, holds, stills with a push-in and
  narration changes usually beat re-recording.
- **Keep the source recording** locally in a stable place; Clueso's cached
  upload of it can expire, so always cut locally and re-upload.
- **Meeting recordings** (a shared screen in a video call) show the window
  inset with a camera tile; crop to the window and blur the tile.
- **Alternating narrators** work for long videos (one voice for "your side",
  another for the rest), but every new or swapped clip arrives in the default
  voice; re-apply voices per clip.
- **Deliver one final file** without a version suffix; delete intermediates
  only when the user asks.

## Conventions

- Plan first when the user asks; record decisions in a plan file; build only
  on explicit go-ahead; one batched pass per approval. "Note it down" means
  record, not change.
- Ask only questions that change the outcome; explain unfamiliar options in
  the question (e.g. "burned-in captions = subtitles drawn into the video").
  Offer options as short lettered choices with a recommendation.
- Deliver a local file (for example `~/Videos/<project>/`), open its folder,
  and report length, size, and anything not done.
- Writes to live systems used in the demo (accounts, integrations, assistant
  instructions, permissions) need the user's approval and a precise report.

## Working habits

- **One folder per video** for durable notes: script, learnings, ideation,
  prompts, seed data, music choice and cut configs. Raw frames and heavy
  working files stay in `<out>`.
- **Keep `learnings.md` current** next to the script and append verified
  lessons as you go; at the end, promote lessons that apply to every video
  into this skill or the user's Lore.
- **Show current vs proposed script as text** before each rebuild; record
  confirmed decisions in the plan file.
- **Validate sync clause by clause** before every export
  ([sync-and-audit](../references/sync-and-audit.md)), then run
  `scripts/audit.ps1` on the cropped file.
- **Review gate before export:** after building, ask the user to review the
  project in the Clueso editor (give the project name and link) and wait for
  their go. Skip only if they explicitly say no review is needed.
- **Ask before every export** (cost in minutes) and never push or publish
  without explicit permission.
- No human recording? Use [agent-recorded](agent-recorded.md).
