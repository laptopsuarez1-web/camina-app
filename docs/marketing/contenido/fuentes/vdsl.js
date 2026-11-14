// Herramientas para grabar un recorrido cuadro por cuadro: pausas, desplazamientos suaves (30 por segundo) y toques en vivo.
const fs = require('fs');
module.exports = (page, errs, DIR) => {
  const clips = {}; let cur = null; let liveStart = null;
  const now = () => cur.t + (liveStart ? (Date.now() - liveStart) / 1000 : 0);
  const snap = async (t) => { const f = `${cur.name}-${String(cur.frames.length).padStart(4, '0')}.jpg`; await page.screenshot({ path: DIR + f, type: 'jpeg', quality: 88 }); cur.frames.push({ f, t: +t.toFixed(3) }); };
  const clip = async (name, fn) => { cur = { name, frames: [], taps: [], t: 0 }; await fn(); clips[name] = { frames: cur.frames, taps: cur.taps, dur: +cur.t.toFixed(3) }; console.log(name, cur.frames.length, 'cuadros', cur.t.toFixed(1), 's', JSON.stringify(cur.taps)); cur = null; };
  const hold = async (s) => { await snap(cur.t); cur.t += s; };
  const raf = () => page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  const eio = (x) => (x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const scroller = (x, y) => page.evaluate(([x, y]) => { let e = document.elementFromPoint(x, y); while (e) { const s = getComputedStyle(e); if ((s.overflowY === 'auto' || s.overflowY === 'scroll') && e.scrollHeight > e.clientHeight + 20) break; e = e.parentElement; } e = e || document.scrollingElement; window.__sc = e; return [e.scrollTop, e.scrollHeight - e.clientHeight]; }, [x, y]);
  const scroll = async (to, sec, pt = [196, 520]) => { const s = await scroller(pt[0], pt[1]); const from = s[0]; to = Math.min(to, s[1]); const n = Math.ceil(sec * 30); for (let i = 1; i <= n; i++) { await page.evaluate((y) => { window.__sc.scrollTop = y; }, from + (to - from) * eio(i / n)); await raf(); await snap(cur.t); cur.t += 1 / 30; } };
  const jump = async (to, pt = [196, 520]) => { await scroller(pt[0], pt[1]); await page.evaluate((y) => { window.__sc.scrollTop = y; }, to); await page.waitForTimeout(400); };
  const live = async (sec, action) => { liveStart = Date.now(); let done = false; const p = action().then(() => { done = true; }); while ((Date.now() - liveStart) / 1000 < sec || !done) { await snap(now()); } await p; cur.t += (Date.now() - liveStart) / 1000; liveStart = null; };
  const at = (text, nth = 0) => page.evaluate(([text, nth]) => { const out = []; const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); let n; while ((n = w.nextNode())) { if ((n.textContent || '').trim() !== text) continue; const e = n.parentElement; const r = e.getBoundingClientRect(); const cx = r.left + r.width / 2, cy = r.top + r.height / 2; if (cx < 0 || cy < 0 || cx > innerWidth || cy > innerHeight) continue; const top = document.elementFromPoint(cx, cy); if (top && (top === e || e.contains(top) || top.contains(e))) out.push([cx, cy]); } return out[nth] || null; }, [text, nth]);
  const tap = async (text, nth) => { const p = await at(text, nth); if (!p) { errs.push(`no veo «${text}» en ${cur ? cur.name : ''}`); return; } if (cur) cur.taps.push({ t: +now().toFixed(3), x: Math.round(p[0]), y: Math.round(p[1]) }); await page.mouse.click(p[0], p[1]); };
  const wait = (ms) => page.waitForTimeout(ms);
  const save = (name) => fs.writeFileSync(DIR + name, JSON.stringify(clips));
  return { clip, hold, scroll, jump, live, tap, wait, save };
};
