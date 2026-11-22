# Narration-to-footage sync and audit

Lessons from fixing "the video lags" on a narrated screen-recording demo.
Read this before re-cutting scenes or after any narration change, and run
the audit before every delivery export.

## What "lag" usually is

The audio and video streams of a Clueso export are aligned. When a viewer
says the video lags or "shows things before they're said", it is one of:

| Symptom | Cause | Detect |
|---|---|---|
| Sluggish cursor, slow typing | Footage stretched to fit longer narration (< 0.85×) | Per-clip speed = source length ÷ clip length |
| Screen gets ahead of words | Sync marker sits after the visual it should precede | Frame at each cue word |
| Screen jumps back to an earlier view | Recording scrolled up then down inside one cut | Rewind scan (below) |
| Long frozen frame mid-sentence | A short source moment held to fill narration | `freezedetect` ≥ 4 s |
| Wrong agent or app on screen | Segment taken from the wrong part of the recording | Read the page title in the frame |

## Rules

- **Keep every video clip at 0.85–1.15×.** Fix a slow clip by cutting
  *more* real footage at 1× (or less speed-up on typing), not by shortening
  approved narration. Report speeds per clip in every audit.
- **One beat, one visual.** For each narration clause, name the frame that
  proves it. If the recording lacks it, change the cut or say so; never let
  a clause play over an unrelated screen.
- **Only move forward.** Cut out scroll-up-then-down, tab flicks, and
  "back to the previous page" detours. Start a cut after the detour ends.
- **Don't leak the next scene.** A side effect shown early (for example, a
  memory edit) steals the later line that announces it. Cut it from the
  earlier scene.
- **Short source moments need motion when held.** Hold a 1 s frame for
  3–5 s with a slow push-in (`zoompan` ~12%), never a frozen 10 s still.
  Capture the still window ≥ 0.3 s wide or `trim` returns nothing.
- **Placing markers.** Auto-sync names each marker after an on-screen action.
  Read those names, then place each `<SYNC_MARKER N>` just before the clause
  that narrates that action. Text between two markers plays exactly the
  footage between them. A visual missing from the render usually means two
  markers bracket it with too few words; move one so it has a full clause.
- **When auto-sync misses a beat,** add it with
  `add_sync_point(word, timestamp_seconds)`. The word must exist with its
  apostrophe (`who's`, not `whos`). After adding points, re-send the full
  text with all markers, because `set_text` refuses edits that drop them.
- **Preserve on swap.** Before replacing a clip, capture its labels, chips,
  zooms, background, transition, `video_styling` and voice. Re-apply all of
  them, then `set_voice` per clip so alternating narrators stay alternating.
- **Validate elements.** After bulk edits, check every element has
  `0 ≤ start < end ≤ duration`. Zoom updates can leave start > end.
- **Zooms aren't clamped** to the footage; a far-off centre shows the
  background. Keep zoom centres inside the footage box or use ≤ 1.4× centred.
- **Refit music after every length change.** If the track is shorter than the
  video, build an extended track locally (song intro + 2 s crossfade + full
  song) so the song's real ending lands on the end card; avoid audible loops.

## Swap workflow (per scene)

1. Find source times with fine contact sheets (`fps=2`, crop to the area
   that changes, timestamp overlay) or `select='gt(scene,0.15)',showinfo`.
2. Cut locally with `cut_scenes.py`; add `tpad=stop_mode=clone` holds only
   on result screens.
3. Upload, `add_clips(after_clip_id=old)`, wait until `busy` is empty, then
   read the new clip's auto-sync text.
4. Remove the old clip by **clip id** (re-read indices after each removal),
   restore styling, labels, zooms and voice.
5. `voiceover_batch set_and_generate` with the approved wording and the new
   markers; read `voiceover_words`.
6. Render 6–10 timestamps at the key words; adjust markers or the cut until
   every clause shows its proof frame.

## Delivery audit (run on the exported, cropped file)

1. **Speed table** per video clip (0.85–1.15×).
2. **Cue sheet**: one frame per narration clause, tiled with timestamps;
   compare each frame with its words.
3. **Rewind scan**: flag frames that differ from the previous frame but
   match a frame 2–6 s earlier.

   ```python
   # fr: grayscale frames at 4 fps, 96x54, footage area only
   for i in range(1, len(fr)):
       d = abs(fr[i] - fr[i-1]).mean()
       if d < 6: continue
       lo, hi = max(0, i - 24), i - 8
       ds = [abs(fr[i] - fr[j]).mean() for j in range(lo, hi)]
       if ds and min(ds) < 2.5 and min(ds) < d / 3:
           print("rewind", i / 4)
   ```

   Expected false positives: similar slides, and consecutive scenes on the
   same page (for example two scenes in the same chat).
4. **Freeze scan**: `freezedetect=n=0.002:d=4` on the footage area; every
   hit must be an intentional result-screen hold.
5. **Silence scan**: `silencedetect=n=-38dB:d=1.2` returns nothing.
6. **Streams**: equal audio/video duration, start 0, SAR 1:1 (add
   `setsar=1` after crop and scale; without it one crop came out with a
   non-square SAR and played stretched).

Report findings as a severity-ordered table (time, what's said, what's
shown, fix). Fix all of them in one approved pass, and keep the scenes the
user said were good unchanged.

## Cue-sheet check in Clueso (clause by clause)

Do this after every narration change, before export. It caught a cut that
opened on the previous chat and a clause spoken over an empty input.

1. In `run_script`, read `voiceover_words` per clip and find the start of each
   key word (the noun or verb a viewer should see):

   ```js
   const ws = get_clip({project_id:P, clip_index:i, select:['voiceover_words']}).voiceover_words;
   const at = w => { const x = ws.find(y => (y.word||'').toLowerCase().replace(/[^a-z0-9-]/g,'') === w); return x ? +(x.start + 0.5).toFixed(1) : null; };
   return ['incoming','outgoing','save'].map(w => [w, at(w)]);
   ```

2. Render those moments in one grid: `get_clip({clip_index:i, select:[],
   render:{timestamps:[...]}})`.
3. Read each frame against its clause. If the visual comes **late**, move the
   descriptive words **before** the marker for that action, so the action lands
   on the verb. If it comes **early**, add words or a short `<pause>` before
   the clause. If the frame is wrong, re-cut.
4. Recheck per-clip speed (source seconds ÷ clip seconds) after every change.

## Motion on long holds

A static opening (an empty page under 6-9 s of narration) reads as a freeze.
Add a zoom with a long entry (5 s) at about 1.15x and `insert_at:'back'` so
labels stay on top. At 1.35x on the default layer it covered the scene label.

## Expected freeze hits

`freezedetect` (d=4) flags slide holds, the Idea slide between card
animations, result screens and a slow push-in. Each hit must be one of those;
anything else under narration is a sync problem.

`scripts/audit.ps1 -Raw <export> -Out <final> -Crop` does crop, streams,
silence, freeze and the contact sheet in one step. For a sharper freeze scan,
also run `freezedetect` on just the footage box (for example
`crop=1100:780:410:130,freezedetect=n=0.002:d=4`) so static backgrounds and
labels don't mask a frozen recording.

## Sync problems seen in shipped videos (use as a checklist)

| Problem found | Fix |
|---|---|
| "Lag" that was really slow-motion clips (0.59-0.82x) | Re-cut with more real footage at 1x until every clip was 0.87-1.13x |
| Scene scrolled up and back down ("video 2 s ahead") | Forward-only cut starting after the scroll |
| A clip scrolled back to the request after showing the reply | End the cut on the reply and hold there |
| A clause ("sends one focused question") played over a side effect and a "not contacted yet" message | Cut the side effect out of that scene |
| A 1 s source moment held for 10 s | 4-5 s still with a slow push-in |
| A tab flick at the end of a sentence | Remove the flick from the cut |
| A field was named before it appeared; a confirmation card arrived 2 s early | Pin sync points on the cue words ("managed identity", "Once saved") |
| A scene opened on an empty page | Trim the first second |
| A field was narrated by a name the form doesn't use | Use the UI's label |
| A scene showed the wrong side of a conversation | Re-cut from the right part of the recording |
| A sentence split across a marker; an empty slide; title text under the logo | Whole sentences between markers; interim visuals; check the longest headline |
| Music stopped before the end | Extend the track (below) |

## Extend music to the video's length

When a track is shorter than the video, put the extra time at the **start** so
the song's real ending lands on the end card. Build it locally and upload it
as a new track:

```powershell
# intro = video_length - track_length + crossfade (2 s); here 27.51 s
& $ff -y -i song.mp3 -i song.mp3 -filter_complex "[0:a]atrim=0:27.51,asetpts=PTS-STARTPTS[a];[1:a]asetpts=PTS-STARTPTS[b];[a][b]acrossfade=d=2:c1=tri:c2=tri[o]" -map "[o]" -c:a libmp3lame -b:a 192k song_extended.mp3
```

Set `guide_end_time` to the video length, fade-in 1.5 s, fade-out 3 s, loop
off. Recompute the intro after every length change.
