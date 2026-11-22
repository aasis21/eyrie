# Video scenes

Record UI scenes as frames with `scripts/scene-template.js`, then assemble them
with `scripts/assemble_frames.py`. Verified: about 15.6 fps at 1920x1080.

## Write a scene

Write only the actions to a file, then build (`<out>` is the task's output
folder; use absolute paths):

```powershell
python scripts/build_capture.py scene actions.js "<out>/rec/R4_tour" "<out>/tools/R4.js" "app\.example\.com"
```

Example actions:

```js
await tours(); await hold(1500);
mark('tab'); await click(f.getByRole('tab', { name: 'Settings' })); await hold(2400);
mark('type'); await click(f.locator('[aria-label="Chat input"]').first());
await type('Checkout latency on acme-web jumped at 08:07 UTC...', 14);
mark('send'); await page.keyboard.press('Enter');
await settle(420000, 'ask');          // waits for a streamed reply to stop changing
await hold(3000); mark('end');
```

Run it with `browser_run_code_unsafe(filename=R4.js)`. It returns frame count,
seconds, marks (name, ms) and any error. Use the marks to cut scenes later.

## Helpers

| Helper | Does |
|---|---|
| `f` | Lazy proxy for the app frame (re-resolved on every call) |
| `glide(loc)` | Eased mouse move to the element centre (visible cursor needs the sanitizer) |
| `click(loc)` | Glide, then press and release with natural pauses |
| `type(text, delay)` | Per-character typing with jitter; speed it up in the edit, not here |
| `hold(ms)` | Wait while recording |
| `tours()` | Dismiss product-tour dialogs |
| `settle(maxMs, label)` | Wait until streamed content stops changing and no Stop button shows; scrolls to the newest content |
| `mark(name)` | Timestamp for cutting |

## Assemble

```powershell
python scripts/assemble_frames.py "<out>/rec/R4_tour" "<out>/scenes/R4_tour.mp4"
```

Uses each frame's timestamp for its duration (concat demuxer), 30 fps, CRF 16.

## Habits that saved takes

- **Explore, then record.** Run the actions once without recording to catch
  wrong selectors; a failed step ends the take (the error comes back in `err`).
- **Record once, cut many.** One 67 s tour (list, open an item, filter, each
  tab) supplied three scenes.
- **Read the take at full resolution** before using it. Extract 3-4 frames at
  key marks and read every word: one bad reply ruins a public take.
- **Start a cut after the page has loaded.** A new page can show the previous
  one for 1-3 s.
- **AI replies differ per take.** For scenes with an assistant or agent,
  prepare it first (instructions, demo data) and expect to re-record; a clean
  take after preparing was also faster (136 s vs 227 s).
- **Use past timestamps in prompts.**
- **Make names on screen match the prompt** ("ask the payments bot" needs
  something the app will recognise by that name).
