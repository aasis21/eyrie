// Live public sanitizer for the Playwright MCP. Do not run this template directly:
// build_capture.py fills the flag and config from a JSON config and writes a runnable file.
// Install it once per fresh browser context; it rewrites text as the page renders.
//  - Text: regex replacements on every text node, title/aria-label/placeholder and the page title,
//    re-applied by a MutationObserver to streamed content.
//  - Titles: exact old titles (lower-case) map to a stable item of `pool` (hash), for lists of chats.
//  - Inputs: React-controlled input values are masked on screen every 250 ms (display only).
//  - Options: [role=option] rows that look like "name (group)" are hidden unless they contain a cast name.
//  - Chrome: banners matching cfg.banners are hidden by climbing to their short bar; nav items in
//    cfg.hideNav are hidden; header/avatar images are hidden; an org-name button becomes cfg.org.
//  - Shadow DOM: open shadow roots are walked and observed too (e.g. web-component comment threads).
//  - Cursor: draws a fixed-position SVG cursor (screenshots don't include the OS cursor).
// Init scripts persist on the context; to change config, bump the flag AND use a fresh context.
async (page) => {
  const install = (cfg) => {
    if (window[cfg.flag]) return; window[cfg.flag] = true; window.__sanitizeCfg = cfg;
    const R = cfg.reps.map(([s, f, r]) => [new RegExp(s, f), r]);
    const ot = new Set((cfg.oldTitles || []).map(x => x.toLowerCase())); const pl = cfg.pool || [];
    const fix = (t) => {
      const tk = t.trim().toLowerCase();
      if (pl.length && tk && ot.has(tk)) { let h = 0; for (const ch of tk) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return t.replace(t.trim(), pl[h % pl.length]); }
      let o = t; for (const [re, r] of R) o = o.replace(re, r); return o;
    };
    const BAN = cfg.banners && cfg.banners.length ? new RegExp(cfg.banners.join('|'), 'i') : null;
    const CAST = (cfg.cast || []).map(x => x.toLowerCase());
    const hide = (el) => { if (el && el !== document.body && el !== document.documentElement) el.setAttribute('data-sanitize-hide', '1'); };
    const tag = (n) => {
      const e = n.parentElement; if (!e) return; const t = n.nodeValue.trim();
      if (BAN && BAN.test(t)) { let p = e; for (let i = 0; i < 12 && p.parentElement && p.parentElement !== document.body && p.parentElement !== document.documentElement; i++) { const pr = p.parentElement.getBoundingClientRect(); if (pr.height > 0 && pr.height < 70) p = p.parentElement; else break; } hide(p); }
      else if ((cfg.hideNav || []).includes(t)) { let p = e; for (let i = 0; i < 4 && p.parentElement && p.parentElement.getBoundingClientRect().height < 44; i++) p = p.parentElement; const pb = p.getBoundingClientRect(); if (pb.left < 280 && pb.width < 300) hide(p); }
      else if (cfg.org && cfg.orgFrom && t === cfg.orgFrom && e.closest('button')) n.nodeValue = cfg.org;
      else if (cfg.initials && /^[A-Z]{2}$/.test(t) && t !== cfg.initials && e.closest('button') && e.getBoundingClientRect().top < 50) n.nodeValue = cfg.initials;
    };
    const fixNode = (n) => { const v = n.nodeValue; if (!v || !v.trim()) return; const nv = fix(v); if (nv !== v) n.nodeValue = nv; tag(n); };
    const shadows = new WeakSet();
    const walk = (root) => { const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT); let n; while ((n = w.nextNode())) fixNode(n); if (root.querySelectorAll) { for (const el of root.querySelectorAll('[title],[aria-label],[placeholder]')) for (const a of ['title', 'aria-label', 'placeholder']) { const v = el.getAttribute(a); if (v) { const nv = fix(v); if (nv !== v) el.setAttribute(a, nv); } } for (const el of [root, ...root.querySelectorAll('*')]) if (el.shadowRoot && !shadows.has(el.shadowRoot)) { shadows.add(el.shadowRoot); walk(el.shadowRoot); observe(el.shadowRoot); } } };
    window.__sanitizeScan = () => { walk(document.body); for (const o of document.querySelectorAll('[role=option]')) { const t = (o.textContent || '').trim(); if (/\([^)]+\)$/.test(t) && !CAST.some(c => t.toLowerCase().includes(c))) hide(o); } };
    const css = () => { const s = document.createElement('style'); s.textContent = '[data-sanitize-hide]{display:none!important} header img, [role=banner] img, button img[alt]{visibility:hidden!important} #__sanitizeCursor{position:fixed;width:22px;height:22px;z-index:2147483647;pointer-events:none}'; document.documentElement.appendChild(s); };
    const cursor = () => {
      if (cfg.cursor === false) return;
      const d = document.createElement('div'); d.id = '__sanitizeCursor'; d.style.left = '-50px'; d.style.top = '-50px';
      d.innerHTML = '<svg width="22" height="22" viewBox="0 0 22 22"><path d="M3 2 L3 18 L7.5 13.8 L10.5 20 L13 18.8 L10 12.8 L16 12.8 Z" fill="#111" stroke="#fff" stroke-width="1.4" stroke-linejoin="round"/></svg>';
      document.documentElement.appendChild(d);
      const mv = (e) => { d.style.left = e.clientX + 'px'; d.style.top = e.clientY + 'px'; };
      window.addEventListener('mousemove', mv, true); window.addEventListener('pointermove', mv, true);
    };
    const start = () => {
      css(); cursor(); walk(document.body); if (document.title) document.title = fix(document.title);
      observe(document.documentElement);
    };
    function observe(target) {
      new MutationObserver((ms) => {
        for (const m of ms) {
          if (m.type === 'characterData') fixNode(m.target);
          else for (const x of m.addedNodes) {
            if (x.nodeType === 3) fixNode(x);
            else if (x.nodeType === 1 && x.id !== '__sanitizeCursor') { walk(x); if ((x.getAttribute && x.getAttribute('role') === 'option') || (x.querySelector && x.querySelector('[role=option]'))) window.__sanitizeScan(); }
          }
        }
      }).observe(target, { childList: true, subtree: true, characterData: true });
    }
    const startTimers = () => {
      setInterval(() => { for (const el of document.querySelectorAll('input')) { if (document.activeElement === el || !el.value || el.type === 'radio' || el.type === 'checkbox') continue; const nv = fix(el.value); if (nv !== el.value) el.value = nv; } }, 250);
    };
    const boot = () => { start(); startTimers(); };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
  };
  const cfg = __CFG__;
  cfg.flag = '__FLAG__';
  await page.context().addInitScript(install, cfg);
  const out = [];
  for (const fr of page.frames()) { try { await fr.evaluate(install, cfg); out.push('ok'); } catch (e) { out.push('skip ' + e.message.slice(0, 60)); } }
  return out.join(',');
}
