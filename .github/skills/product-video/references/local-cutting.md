# Local cutting

Cut precisely on the machine, then upload clean scene files. This is faster
and more reliable than splitting one long recording inside Clueso, and it lets
you crop, blur, and speed up waits before Clueso ever sees the footage.

## Setup

```powershell
python -m pip install imageio-ffmpeg pillow numpy
$ff = python -c "import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())"
& $ff -hide_banner -i "<recording.mp4>" 2>&1 | Select-String 'Duration|Stream'
```

The bundled ffmpeg lacks fontconfig; `drawtext` still works but prints
fontconfig warnings.

## 1. See the whole recording

Run [`scripts/contact_sheet.ps1`](../scripts/contact_sheet.ps1) to produce
timestamped grids (one frame every 2 s, 90 s per sheet). View the PNGs and
pick segment start/end times visually. Pair with the presenter's transcript
cues.

## 2. Measure crop and blur boxes

Extract one full-resolution frame and crop candidate boxes until the app
window fills the box exactly and camera tiles/personal details are covered:

```powershell
& $ff -hide_banner -loglevel error -y -ss 120 -i $src -frames:v 1 -vf "crop=1424:904:218:112" check.png
```

Video-call recordings of a shared screen typically show the shared window
inset with a camera tile on the right; crop to the window, then box-blur the
tile. A held still needs a slow push-in, not a freeze:
`zoompan=z='1+0.12*on/N'`.

## 3. Build scenes from a config

[`scripts/cut_scenes.py`](../scripts/cut_scenes.py) takes a JSON config of
scenes → segments `[start, end, speed]`, plus crop and blur boxes, and writes
one MP4 per scene (video only, 30 fps, CRF 18). Typical speeds:

| Segment | Speed |
|---|---|
| Talking-over-UI, result screens | 1× |
| Scrolling, navigation | 1.5–2× |
| Typing in forms | 2–3× |
| Loading/thinking spinners | 3×, or cut |

Audio is dropped; Clueso narration replaces it.

Size each scene so that, once narrated, it plays at 0.85–1.15×. If the
narration runs longer than the footage, add more real footage at 1× (less
speed-up on typing) instead of letting Clueso slow the clip down. Start cuts
after any scroll-up, tab flick or page detour so the scene only moves
forward. For a short moment that must be held, use a still of ≥ 0.3 s with a
slow `zoompan` push-in, not a frozen frame. See
[sync-and-audit](sync-and-audit.md).

## 4. Verify before upload

Make a contact sheet per output scene (`contact_sheet.ps1 -Video <scene>`)
and stack them; check crop, blur coverage, and that each scene ends on a
meaningful frame. Fix the config and rebuild rather than patching in Clueso.

## 5. Optional local post-processing

- Remove a watermark band by cropping a safe area and scaling to 1080p (see
  [watermark-and-export](watermark-and-export.md)).
- Don't time-stretch the final export to speed it up: `atempo` keeps
  pitch but music sounds rushed and warbly. Tighten narration or choose a
  faster voice instead.

## Re-cutting for shorter narration

- Shortening narration without re-cutting speeds clips past 1.15x. Re-cut
  first, to about the new narration length: typing and waiting at 4-10x,
  result screens at 1-1.5x, and stop on the summary instead of scrolling long
  replies.
- Start a cut after the page has loaded; a new page can show the previous one
  for 1-3 s (this leaked demo-setup notes once).
- From PowerShell, write `cut_scenes.py` configs as literal JSON (or from
  Python). `ConvertTo-Json` unrolls single-segment arrays and the script fails
  with "cannot unpack non-iterable int".
