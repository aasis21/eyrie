# Study a reference video (YouTube)

Use when the user points at a video for style. Learn **pacing, visuals and
audio**, not content. Keep downloads in `<out>/ref-videos` (the HQ's
generated-output location) and never commit or share them.

## 1. No sign-in (always works)

| Need | How |
|---|---|
| Title, channel, thumbnail | `curl "https://www.youtube.com/oembed?url=<watch-url>&format=json"` |
| 4 frames (cover, ~25/50/75%) | `https://i.ytimg.com/vi/<id>/{maxresdefault,1,2,3}.jpg` |
| Description, length, context | `web_search` for the exact title (search results include the description) |

YouTube's bot check often blocks the watch page, the embed (Error 153 without
a referrer; "Sign in to confirm you're not a bot" from a local page) and
yt-dlp without a signed-in session.

## 2. Full study (user signed in to YouTube in the Playwright browser)

1. **Session to cookies, then delete them.** Cookies are secrets: write them
   to a temp file, use once, delete in the same command.

   ```js
   async (page) => { await page.context().storageState({ path: '<dir>/state.tmp.json' }); return 'saved'; }
   ```

   ```python
   import json; s = json.load(open('state.tmp.json'))
   with open('cookies.tmp.txt', 'w') as f:
       f.write('# Netscape HTTP Cookie File\n')
       for c in s['cookies']:
           if 'youtube' in c['domain'] or 'google' in c['domain']:
               f.write('\t'.join([c['domain'], 'TRUE' if c['domain'].startswith('.') else 'FALSE', c['path'],
                                  'TRUE' if c['secure'] else 'FALSE', str(int(c['expires']) if c['expires'] > 0 else 0),
                                  c['name'], c['value']]) + '\n')
   ```

2. **Download** (needs `pip install -U "yt-dlp[default]"`, which includes the
   EJS challenge solver, and Node as the JS runtime):

   ```powershell
   python -m yt_dlp --js-runtimes node --cookies cookies.tmp.txt -f "bv*[height<=1080]+ba/b" `
     --write-auto-subs --write-subs --sub-langs "en.*" --sub-format vtt -o "<id>.%(ext)s" <url>
   Remove-Item state.tmp.json, cookies.tmp.txt
   ```

   Without `yt-dlp[default]` you get "n challenge solving failed" and only
   images. `--cookies-from-browser <browser>` fails while that browser is
   running (locked database). Video and audio may arrive as separate files
   (`.f399.mp4`, `.f251.webm`); merge with ffmpeg if needed.

3. **Analyse in one command:**

   ```powershell
   python scripts/analyze_reference.py <id>.f399.mp4 --audio <id>.f251.webm --subs <id>.en.vtt --out <dir>/analysis
   ```

   It writes `<id>_sheet.png` (a frame every 2 s with timestamps) and
   `<id>_report.md`:
   - **Voiceover yes/no** from the captions (`[ Music ]` only means none) and
     the transcript.
   - **Loudness per 4 s** (RMS dB) and the mid-video lift: how the music builds.
   - **Tempo** (spectral-flux autocorrelation) and **brightness** (spectral
     centroid per 8 s): what kind of track to pick.
   - **Accent hits**: strong onsets about every beat bar; candidate cut points.
   - A ready Clueso `find(type='music', ...)` filter from the tempo.

   Scene detection (`select='gt(scene,...)'`) finds nothing in videos built
   from smooth push-ins and fades, which is why the sheet is the visual source.

4. **Read the contact sheet** (one image view): list each text card with its
   words and time, when UI first appears, how scenes change (cut, push-in,
   pan), colours, type weight and any recurring motif (cursors, avatars). Note
   which visual changes coincide with accent hits.
5. **Write findings** as concrete, reusable rules, with the source video
   named, into the user's taste notes in Lore (for example
   `lore/<area>/video-taste.md`). Use [taste-examples](taste-examples.md) for
   the shape.
