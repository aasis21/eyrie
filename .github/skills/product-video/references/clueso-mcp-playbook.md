# Clueso MCP playbook

Verified patterns and gotchas from building a narrated product video through
the Clueso MCP. Always discover a tool's schema before first use; never guess
arguments. Confirm the workspace with the user before creating projects.

## Core tools

| Need | Tool | Notes |
|---|---|---|
| Find workspace, projects, voices, music, backgrounds, clueprints | `find` | `type='voices'` with `tags`; `type='music'` with `provider='clueso'`, `vocals:false` |
| New project | `create_project` | Starts with one blank clip; returns `projectUrl` |
| Upload media | `upload_file` | `file_names` mode returns one curl per file; run them yourself (direct PUT, 200 = done) |
| Add footage | `add_clips(kind='video', mcp_upload_id)` | Background processing; poll `get_project` |
| Add slides | `add_clips(kind='blank', clips:[{title,duration}])` | For title/problem/cast/end scenes |
| Order, title, background, framing | `update_clips` | `position` moves first; `background:{src: mup_…}`; `video_styling` |
| Narration | `voiceover_batch` | `set_and_generate`, `wait:true` |
| Voice | `set_voice` | Applies to next generation only |
| Elements | `add_elements` / `update_elements` / `remove_elements` | Batch per clip; `remove_elements` takes `removals:[{clip_index, element_id}]` |
| Music | `add_audio` / `update_audio` | Re-fit `guide_end_time` after length changes |
| Bulk logic | `run_script` | Synchronous JS calling tools; set `idempotency_key` on builds |
| Check frames | `get_clip(render)`, `get_project(render:{clips:{at:'middle'}})` | Use mid-clip timestamps |
| Export | `export_project` → `get_export` | ~2–5 min; `download_url` valid 1 hour |

## Footage

- Prefer uploading locally cut scenes (one file per scene) over splitting one
  recording in Clueso; `split_clip` + `remove_clip` works but is slow and
  coarse.
- `add_clips(kind='video')` with several uploads may land **out of order and
  titled "Video"**. Identify each with `get_project(render:{clips:{at:'end'}})`
  and reorder by `clip_id` (move one at a time, re-reading indices).
- Auto-sync runs on upload and inserts `<SYNC_MARKER N>` into the clip's
  transcript. Any new voiceover text must contain every marker exactly once,
  in order, placed where that on-screen action is narrated. Read the existing
  text first (`get_clip select:['busy']` returns `voiceover_text`).
- A clip is locked while `busy` contains `magic_sync`; structural edits fail
  until it clears.
- Frame recordings with `video_styling: {position:[0.5,0.52], size:[0.744,0.84],
  border:{type:'solid', color, borderWidth:2}}`; `crop` (fractions) trims
  meeting chrome if not cut locally.

## Narration

- Set voice with `set_voice`, then generate. Good neutral narrator: an
  ElevenLabs "narrative, calm" voice (e.g. Tyler).
- `voiceover_batch` + `wait:true` returns `ready` durations, but **verify**:
  read `voiceover_words` for each changed clip. On video clips
  `set_and_generate` sometimes saves text without regenerating (empty
  words, unchanged duration). Re-run `generate_speech` for those clips.
- Video clips retime to the narration between sync markers; short narration
  speeds footage up (fine to ~1.5–2×). Slide clips take the narration length.
- `<pause:0.5s>` adds exact silence (use at the end of slide scenes);
  avoid long pauses on video scenes.
- Generating speech **rescales every element's timing** proportionally.
  After narration changes, re-time key animations to words:
  read `voiceover_words`, find each cue word's `start`, set the element's
  `start_time` 0.15–0.25 s before it.

## Elements

- Text: always send `y_anchor` with `y`; give a `width`; check
  `layout.fits` in replies. Pill labels: `backgroundSetting` with radius and
  padding.
- Cards: rectangles with `backgroundColor`, `strokeColor`, `borderRadius`,
  `shadowSetting`, `entryTransitionType:'fade'`.
- Images (logos): `element_type:'image'` with `type_data.mcp_upload_id`;
  SVG and PNG both work. Pop-in via keyframes on `opacity`, `scaleX/Y`.
- Zooms: `element_type:'zoom'` with `centerX/centerY`, `zoomFactor` 1.6–1.9,
  entry/exit 0.6–0.7 s, `layerScope:'BELOW_ONLY'` so labels stay put.
- Blurs: `element_type:'blur'`, `blurIntensity` ~22, `insert_at:'back'` so
  labels sit above; position in canvas coordinates (not zoomed coordinates).
- Elements whose start time is near clip end may look missing in an
  end-frame render; that is the exit animation, not a bug.

## Verification

- Image budget: the MCP host caps images per session (about 50). Spend
  renders on changed scenes; use grids (`timestamps:[…]`) and local contact
  sheets of exports for whole-film checks.
- After each pass: `get_project` totals, per-clip `voiceover_words` tail,
  then a mid-clip grid of changed scenes.

## What the MCP cannot do (as verified)

- Voice **Pace** (0.8×–1.2×): editor only — script panel → voice name →
  Browse voices → filter icon → Advanced Settings → Pace → Apply to all
  clips → Confirm → Generate Speech. Video retimes; music stays normal.
- Global playback speed, watermark removal: not available.

## Pitfalls checklist

- [ ] Every changed clip has non-empty `voiceover_words` ending on the last word
- [ ] Sync markers preserved, in order
- [ ] Animations re-timed after narration changes
- [ ] Narration matches footage in every scene
- [ ] Every video clip plays at 0.85–1.15× (no slow motion)
- [ ] Delivery audit run on the export: cue sheet, rewind, freeze, silence scans
- [ ] Typos and personal data blurred (check inside zooms too)
- [ ] Labels and pills don't overlap; text fits its box
- [ ] Music `guide_end_time` equals final length, with fade-out
- [ ] Old/draft projects identified (don't confuse v1 and v2)
- [ ] Every clip has its intended voice after swaps
- [ ] Living script file updated

## Speed and voice (proven)

- **Change speed through the voice, not the file.** Audition 3–4 voices on
  one scene with `set_voice(clip_ids:[…])` + `voiceover_batch` and compare
  spoken length. Observed on the same 40-word line: Tyler 17.1 s, Jeff 16.1 s,
  Juniper 15.5 s, Casual Mark 15.2 s. Juniper (grounded professional) was the
  best faster voice. Then `set_voice` for the whole project and regenerate.
- **Don't ask the user to change Pace in the editor** if they want hands-off;
  use the voice audition.
- **Footage feels rushed** when narration over a recording is short: video
  clips retime to the narration. Add one meaningful clause and a
  `<pause:1–2s>` hold at the end of key result scenes (approval saved, agent
  added, answer returned) rather than slowing the voice.
- `run_script`: `get_clip` with `select:[]` and no render is rejected; use
  `select:['busy']` to read just clip metadata.
- Element `start_time` must be ≥ 0; guard computed times with `Math.max(0, …)`
  and check the cue word exists (a word at 0.00 s minus a lead gives negative).

## Sync markers and retiming (proven)

- Each `<SYNC_MARKER N>` locks narration to a frame chosen by auto-sync.
  Footage after the last marker plays only during the narration after it.
  If the key visual (e.g. the agent's answer) sits after the last marker,
  put the sentence about it **after** that marker, or it flashes by.
- Every gap between markers needs a few words; markers can't be adjacent.
- `voiceover_batch` refuses text that drops or reorders markers; read the
  clip's current marker count first and keep all of them in order.
- Narration much longer than its footage plays the footage in slow motion;
  much shorter speeds it up. Aim for roughly footage length ±30%.
- Replacing footage: add the new clip next to the old (`after_clip_id`),
  remove the old by index (highest first), then set background and
  `video_styling` on the new clip (new clips get the default background).
- Check cuts with `get_project({render:{seams:true}})`; add `dissolve`
  0.4–0.6 s transitions (set on the outgoing clip) where a cut lands on an
  empty background.
- Swap music with `remove_from_project(target:'audio', music_id)` then
  `add_audio`.

## Clip swaps and sync points (proven)

- `add_clips(kind='video')` processing can outlast one script call; poll
  `get_project` until the clip count rises and the new clip's `busy` is empty.
  New clips are titled "Video" until you rename them.
- Remove old clips by **clip id**, looking the index up again before each
  `remove_clip`; indices shift after every removal.
- New clips lose labels, zooms, chips, background, transition,
  `video_styling` and voice. Capture them first and re-apply them; call
  `set_voice(clip_ids)` per clip to keep a per-scene voice pattern.
- `add_sync_point(word, timestamp_seconds)` adds a beat auto-sync missed.
  Match the word as spoken, keeping its apostrophe (`who's`). Afterwards
  re-send the whole text with every marker; `set_text` without them is
  refused.
- `voiceover_batch` text can only move markers between words; it can't
  change which on-screen action a marker is pinned to. To change the action,
  re-cut the footage.
- Zoom elements aren't clamped to the footage box, and `update_elements` on
  a zoom can leave `start_time > end_time`. Validate every element after bulk
  edits.
- `get_clip select` must be an array (`['busy']`), even inside scripts.

## More proven patterns (2026-11-17)

- **Reuse a finished design:** `duplicate_project` keeps background, title,
  problem and end slides, voice and music; then swap footage and narration.
- **`add_clips(kind='video')` returns no clip id.** Add clips one at a time in
  a `run_script` job: snapshot clip ids, add with `after_clip_id`, poll
  `get_project` until a new id appears, use it for the next insert (about 30 s
  per clip). Then remove old clips by id and re-apply background,
  `video_styling`, transition and voice.
- **`set_voice` needs the voice name.** Passing the id from
  `voiceover_voice` silently applied the workspace default. Resolve it with
  `find(type='voices', id=...)` first.
- **Concurrent saves:** a `set_voice` right after `update_clips` on the same
  clip can be rejected ("changed since this edit was based on"). Sleep 2 s or
  retry the single call.
- **Text animation** is an object: `animation_setting:{entry:{preset:'fade',
  applyToUnit:'box', durationPerUnitMs:400, direction:'none'}}` (a string is
  rejected).
- **Pill badges** stretch to the element width; give number badges a narrow
  width (about 64 px).
- **Highlight a keyword** with a text element whose `backgroundSetting` is
  yellow (`#F5C76B`) and text dark (`#0B1430`); one or two per slide.
- **Export cost:** the first `export_project` call returns cost and a token;
  ask before confirming. A re-export after small edits can cost 0 and starts
  at once. Export takes about 2-3 min for 3 min of video.
- **The MCP can drop mid-session** (its tools vanish). Do local work (cuts,
  docs edits) meanwhile; the user re-authenticates with `/mcp`.

## Fonts, audio and music choice (2026-11-17)

- **Fonts:** Segoe UI is not a Clueso font; it silently falls back and layout
  measures wrong. Use a Google font (Open Sans is the closest to Segoe) or a
  workspace font from `find(type='fonts')`. Read `font_warnings` in every
  `add_elements` reply.
- **add_audio** needs `type`: `'music'` (src, name, source_duration, guide
  range, `music_start_time` to skip a slow intro, volume, fades) or `'sfx'`
  (src, name, source_duration, guide_start_time, volume). A Freesound `src`
  (`catalog-audio:freesound:<id>`) is an opaque handle; pass it as is.
- **SFX that worked:** Clueso "Swoosh" at about 22% just before each scene
  change, "Click" at 30-35% on UI clicks, Freesound "Whoosh Crystal Reverse"
  into the end card. Clueso's own library has no riser; search Freesound with
  mood words ("rising shimmer swell").
- **Let the user pick the music.** Taste varies; the first pick is often
  rejected (one "glitchy" track was). `find(type='music', detail:'full')` gives `sections` and `drops_ms`. Cut
  15 s previews of 2-3 candidates from their `src` with ffmpeg (start at the
  first drop), save them locally, and offer them in one `ask_user` with a
  one-line feel for each. Start the chosen track past a slow intro with
  `music_start_time`.
- **Review gate:** before `export_project`, ask the user to review in the
  editor (`https://web.clueso.io/guide/<project-id>`) and wait, unless they
  said to skip. Re-exports after small edits are usually free.
- **Duplicate to branch a version** (`duplicate_project`) so the previous cut
  stays intact; a duplicate's first export costs its full length.

## Session and project hygiene (from shipped videos)

- **Re-authenticate before resuming.** OAuth tokens expire between sessions;
  a resumed project often starts with a 401. Run `find(type='workspaces')`
  first and re-authenticate with `/mcp` if it fails.
- **Name drafts clearly** and record the final project's name and link in
  the living script. Old drafts linger in the workspace and are easy to
  confuse with the final; ask before deleting them.
- **Find a project by name** with `find(type='projects', query=...)` rather
  than storing IDs in notes.
- **Uploaded source media expires** from Clueso's cache (about a day). Keep
  the source recording locally and re-upload cut scenes when needed.
- **Never save a `download_url`.** It is signed and expires in an hour;
  download immediately and keep only the file.
- **Every new or swapped clip arrives in the default voice.** After any swap,
  run `set_voice(clip_ids)` with the voice each clip had.
