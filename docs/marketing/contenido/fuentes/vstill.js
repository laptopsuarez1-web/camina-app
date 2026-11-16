// Capturas fijas con el alto útil de un iPhone (393 x 798: debajo de la barra de estado), para montarlas en la maqueta.
const fs = require('fs'); const open = require('./vexplore.js');
const OUT = __dirname + '/carrusel/ip/'; fs.mkdirSync(OUT, { recursive: true });
(async () => {
  const { browser, ctx, page, errs } = await open(); await ctx.setGeolocation({ latitude: -21.5381, longitude: -64.7318 });
  const wait = (ms) => page.waitForTimeout(ms);
  const limpia = () => page.evaluate(() => { const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); let n; while ((n = w.nextNode())) { if (/Sin conexión\. Te mostramos/.test(n.textContent || '')) { let e = n.parentElement; for (let i = 0; i < 9 && e && e.parentElement; i++) { const r = e.getBoundingClientRect(); if (r.width > 250 && r.height < 120) { e.style.display = 'none'; break; } e = e.parentElement; } } } });
  const s = async (n) => { await limpia(); await page.screenshot({ path: OUT + n + '.png' }); };
  const go = async (p) => { await page.goto('http://localhost:8099' + p, { waitUntil: 'networkidle', timeout: 180000 }).catch(() => {}); await wait(3800); };
  const sc = async (y, pt = [196, 500]) => { await page.evaluate(([x, yy, to]) => { let e = document.elementFromPoint(x, yy); while (e) { const st = getComputedStyle(e); if ((st.overflowY === 'auto' || st.overflowY === 'scroll') && e.scrollHeight > e.clientHeight + 20) break; e = e.parentElement; } (e || document.scrollingElement).scrollTop = to; }, [pt[0], pt[1], y]); await wait(500); };
  const at = (text) => page.evaluate((text) => { const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); let n; while ((n = w.nextNode())) { if ((n.textContent || '').trim() !== text) continue; const e = n.parentElement; const r = e.getBoundingClientRect(); const cx = r.left + r.width / 2, cy = r.top + r.height / 2; if (cx < 0 || cy < 0 || cx > innerWidth || cy > innerHeight) continue; const top = document.elementFromPoint(cx, cy); if (top && (top === e || e.contains(top) || top.contains(e))) return [cx, cy]; } return null; }, text);
  const tap = async (t) => { const p = await at(t); if (!p) { errs.push('no veo ' + t); return; } await page.mouse.click(p[0], p[1]); };
  await go('/'); await s('inicio');
  await go('/actividad'); await s('actividad');
  await go('/grupos'); await s('grupos');
  await go('/ranking'); await s('ranking');
  await go('/insignias'); await sc(170); await s('insignias');
  await go('/ruta'); await s('ruta');
  await go('/eventos'); await s('eventos');
  await go('/'); const b = await page.getByRole('button', { name: 'Tu perfil' }).first().boundingBox(); await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2); await wait(2500); await s('perfil');
  await go('/canjes'); await sc(168); await s('canjes'); await sc(480);
  await tap("Fripap's"); await wait(2500); await s('ficha'); await sc(250, [196, 600]); await s('premios');
  await tap('Canjear'); await wait(2000); await page.keyboard.type('4821', { delay: 150 }); await wait(600); await s('codigo');
  await tap('Canjear'); await wait(4500); await s('confirmado');
  await tap('No, solo esto'); await wait(2200); await s('resena');
  await tap('Ahora no'); await wait(2200); await s('historia');
  console.log('errores:', errs); await browser.close();
})();
