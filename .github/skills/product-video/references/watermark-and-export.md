# Pace, watermark, and export

## Pace

1. Tighten narration first (fewer words, fewer pauses) — no artifacts.
2. Audition faster voices ([clueso-mcp-playbook](clueso-mcp-playbook.md#speed-and-voice-proven)).
3. Voice Pace in the Clueso editor (0.8×–1.2×, Apply to all clips): video
   retimes, music stays at normal speed. Not available through the MCP; ask
   the user to set it only if they don't mind, then re-time animations and
   re-verify.
4. Avoid speeding up the exported file: music sounds rushed even with
   pitch-preserving `atempo`.

## Watermark-safe layout

On watermarked plans, Clueso places "Made with Clueso" bottom-right. Measured
on a 1080p export: box at **x 1290–1908, y 948–1067**.

**Check first** that the user's plan and Clueso's terms allow removing the
watermark, especially for a public release. If not, keep it, or export on a
plan without it.

- Keep all meaningful content inside a 16:9 safe area of **1672×940** at
  top-center (x 124–1796, y 0–940): move the recording frame and slide content
  up/in before building.
- After export, crop and scale (`setsar=1` keeps square pixels):

```powershell
& $ff -v error -y -i in.mp4 -vf "crop=1672:940:124:0,scale=1920:1080:flags=lanczos,setsar=1" -c:v libx264 -preset slow -crf 18 -pix_fmt yuv420p -c:a copy -movflags +faststart out.mp4
```

- Export at 2k when the plan allows and crop/scale from that for sharpness;
  re-measure the box at that resolution first.
- Re-measure on each new export (extract a frame and crop the corner).

## Export and download

1. `export_project` (default 1080p/30fps; `captions:true` to burn subtitles).
2. `get_export(export_id, wait_seconds:55)` until `completed`; the
   `download_url` is signed and expires in one hour, so never save it.
3. `curl -sL -o "<out>.mp4" "<download_url>"` into the delivery folder (for
   example `~/Videos/<project>/`). In Windows PowerShell 5.1, use `curl.exe`;
   `curl` is an alias there.
4. Verify: duration and streams with ffmpeg, a 4×3 frame grid, watermark
   position, then open the file for the user.
5. Report the path, length, size, and any remaining issues.

## Proven recipe: scale an existing project into the safe area

Rather than redesigning, scale every element into the safe area with one
`run_script` pass, so the post-export crop restores the original framing:

- Factors: `SX = 1672/1920`, `SY = 940/1080`, offset `OX = 124`, `OY = 0`.
- Each element: `x' = OX + x*SX`, `y' = y*SY`, `width' = width*SX`,
  `height' = height*SY` (skip height on text), text `fontSize' = fontSize*SX`,
  keyframe positions/sizes scaled the same way.
- Zooms: scale `centerX/centerY` the same way.
- Video clips: `video_styling.position = [(OX + 960*SX)/1920, (0.52*1080*SY)/1080]`,
  `size = [0.744*SX, 0.84*SY]`.
- Then crop `1672:940:124:0` and scale to 1920×1080 after export.

## Plan caps

The workspace plan silently caps export resolution (2k requested, 1080p
rendered — the reply says `downgraded`). The crop then upscales ~1.15× and
looks slightly soft; keep the raw export next to the cropped one. Options if
UI text is too soft: larger footage inside the safe area, more zooms on fine
text, or a plan without the watermark.

## Checking audio after local processing

If a user says audio sounds fast, compare the cropped file's duration and
audio stream against the raw export (`-c:a copy` keeps them identical). A
faster narrator voice, or a player's remembered playback speed, are the usual
causes.
