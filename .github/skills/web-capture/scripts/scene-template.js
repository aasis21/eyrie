// Scene recorder for the Playwright MCP (`browser_run_code_unsafe` with `filename`).
// Build a scene file with build_capture.py, which fills these placeholders:
//   DIR          absolute frames folder (forward slashes), created beforehand
//   FRAME_RE     regex source for the app iframe URL ('' = main frame), e.g. app\\.example\\.com
//   ACTIONS      scene body using f, glide, click, type, hold, tours, settle, mark
// Captures JPEG frames named f<index>_<ms>.jpg (about 15 fps at 1920x1080) while the
// actions run. Turn them into an MP4 with assemble_frames.py.
async (page) => {
  const DIR = '__DIR__';
  const FRAME_RE = '__FRAME_RE__';
  const fr = () => (FRAME_RE && page.frames().find(x => new RegExp(FRAME_RE).test(x.url()))) || page.mainFrame();
  // Lazy frame proxy: the app iframe is recreated on navigation, so resolve it on every call.
  const f = new Proxy({}, { get: (_, k) => { const x = fr(); const v = x[k]; return typeof v === 'function' ? v.bind(x) : v; } });
  let mx = 960, my = 540;
  const glide = async (loc, opt = {}) => {
    await loc.scrollIntoViewIfNeeded().catch(() => {});
    const b = await loc.boundingBox();
    if (!b) return;
    const x = b.x + (opt.dx ?? b.width / 2), y = b.y + (opt.dy ?? b.height / 2);
    const steps = Math.max(12, Math.round(Math.hypot(x - mx, y - my) / 18));
    for (let i = 1; i <= steps; i++) { const t = i / steps, e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; await page.mouse.move(mx + (x - mx) * e, my + (y - my) * e); await page.waitForTimeout(12); }
    mx = x; my = y;
  };
  const click = async (loc, opt) => { await glide(loc, opt); await page.waitForTimeout(250); await page.mouse.down(); await page.waitForTimeout(60); await page.mouse.up(); await page.waitForTimeout(400); };
  const type = async (text, delay = 38) => { for (const ch of text) { await page.keyboard.type(ch); await page.waitForTimeout(delay + Math.random() * 25); } };
  const hold = (ms) => page.waitForTimeout(ms);
  const tours = async () => { for (let k = 0; k < 4; k++) { const d = fr().getByRole('dialog'); if (await d.count()) { const b = d.getByRole('button', { name: /^(skip|got it)$/i }).first(); if (await b.count()) { await b.click(); await hold(500); continue; } } break; } };
  // Wait until streamed content (e.g. an agent reply) stops changing; keeps the newest content in view.
  const settle = async (maxMs, label, busyRe = /Thinking|Working on it|Running|Waiting for reply|Calling|Sending/i) => {
    let last = '', stable = 0; const s0 = Date.now();
    while (Date.now() - s0 < maxMs) {
      await hold(3000);
      const tx = await fr().locator('body').innerText().catch(() => '');
      const busy = busyRe.test(tx.slice(-1500)) || await fr().getByRole('button', { name: /^Stop/i }).count().then(n => n > 0).catch(() => false);
      if (tx === last && !busy) { if (++stable >= 4) break; } else { stable = 0; last = tx; }
      await fr().evaluate(() => { for (const el of document.querySelectorAll('*')) { if (el.scrollHeight > el.clientHeight + 50 && el.clientHeight > 400 && getComputedStyle(el).overflowY !== 'visible') el.scrollTop = el.scrollHeight; } }).catch(() => {});
    }
    mark(label + '_settled');
  };
  const marks = [];
  const mark = (name) => marks.push([name, Date.now() - t0]);
  let i = 0, run = true; const t0 = Date.now();
  const loop = (async () => { while (run) { const t = Date.now() - t0; await page.screenshot({ path: `${DIR}/f${String(i).padStart(5, '0')}_${t}.jpg`, type: 'jpeg', quality: 92 }).catch(() => {}); i++; } })();
  let err = null;
  try {
    // BEGIN ACTIONS
    __ACTIONS__
    // END ACTIONS
  } catch (e) { err = e.message.slice(0, 300); }
  run = false; await loop;
  return JSON.stringify({ frames: i, secs: (Date.now() - t0) / 1000, marks, err });
}
