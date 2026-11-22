# Session setup (Playwright MCP)

Verified on a single-page web app with a cross-origin iframe, 2026-11-17.

## The browser

- The Playwright MCP usually opens a **persistent** context on the user's
  browser profile, so existing sign-ins work. Don't sign in or out.
- The window may be minimized or off screen, so **OS screen capture doesn't
  work**. Capture with `page.screenshot()` only.
- Set the viewport after every new page or context:
  `browser_resize(1920, 1080)`.
- `file:` URLs are blocked. Serve local HTML over http, or use a `data:` URL
  for small test pages.

## Files

- `browser_run_code_unsafe(filename)` and screenshot paths must be under a
  folder the Playwright MCP may read and write (its output directory or
  allowed roots). Use `<out>`, the task's folder in the HQ's generated-output
  location, and confirm with one test screenshot.
- Snippets run without Node modules (`require` is unavailable). Write files
  from the shell, not from the snippet.
- A file written from the shell can race the MCP reading it; on ENOENT,
  re-run once.

## Init scripts and fresh contexts

- `page.context().addInitScript()` scripts **accumulate** and survive
  `browser_close`. To change a sanitizer, close the whole context:

  ```js
  async (page) => { setTimeout(() => page.context().close(), 50); return 'closing'; }
  ```

  Then `browser_navigate('about:blank')`, re-install, `browser_resize`.
- Give each sanitizer build a new flag; an old flag on the window makes the
  install a no-op.
- `page.setContent()` reuses the window (the flag persists). Test with a real
  navigation.

## Cross-origin app iframes

Some apps render inside a cross-origin iframe (for example `app.example.com`
inside a shell page) that is **recreated on reload and navigation**. Resolve
the frame on every call (the `f` proxy in `scene-template.js`); a stored frame
handle goes stale and fails with a timeout.

## Long scripts

The MCP client times out after about 5 minutes, but the script keeps running
in the browser. For long scenes, poll the frame count in the frames folder
(or the page state) instead of re-running the scene.

## Product tours

Product tours appear as dialogs on first visit. Dismiss them (Skip / Got it)
before every scene; `tours()` in the recorder does this.

## App-specific selectors

Explore once, then note what you found (in the task's script, or a Lore topic
if you'll capture the app again). Patterns that recur:

- **Rich-text chat inputs** (Lexical, ProseMirror, contenteditable): find them
  by `aria-label`, click, then type; `fill()` often doesn't work.
- **Filters** that look like text (`Status : All`) rather than buttons, and
  need an **Apply** click.
- **Links vs rows:** in some lists only the title is a link; clicking the row
  does nothing.
- **Comboboxes inside dialogs:** index-based `getByRole('combobox').nth(n)`
  after exploring the order; options are `role=option`.
- **Open shadow roots** (web-component comment threads, embedded widgets):
  the sanitizer walks and observes them, but page `innerText` does not
  include them. Read them by walking `shadowRoot`s.
- **Summary banners** at the top of a page (AI summaries, outage banners) can
  quote real data. Start cuts below them, or crop them in the edit.
