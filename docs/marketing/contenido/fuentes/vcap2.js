// Graba las pantallas nuevas: Ruta del mes, insignias y perfil (app de prueba), y la Ruta en el panel.
const fs = require('fs'); const open = require('./vexplore.js'); const vm = require('vm');
const DIR = __dirname + '/video/cap/';
(async () => {
  const { browser, page, errs } = await open();
  const d = require('./vdsl.js')(page, errs, DIR); const { clip, hold, scroll, live, tap, wait, save } = d;
  // Avisos del modo de prueba (no son de la app): se ocultan.
  const limpia = () => page.evaluate(() => { const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); let n; while ((n = w.nextNode())) { if (/Invalid DOM|cannot contain|Cannot read prop|Sin conexión\. Te mostramos/.test(n.textContent || '')) { let e = n.parentElement; for (let i = 0; i < 9 && e && e.parentElement; i++) { const r = e.getBoundingClientRect(); if (r.width > 250 && r.height < 120) { e.style.display = 'none'; break; } e = e.parentElement; } } } });
  const go = async (p) => { await page.goto('http://localhost:8099' + p, { waitUntil: 'networkidle', timeout: 180000 }).catch(() => {}); await wait(3800); await limpia(); await wait(200); await limpia(); };
  await go('/eventos');
  await clip('rutacard', async () => { await hold(1.8); await live(1.8, async () => { await wait(250); await tap('Ver mi ruta'); await wait(1300); await limpia(); }); await limpia(); await hold(0.2); });
  await go('/ruta');
  await clip('ruta', async () => { await hold(3.2); });
  await go('/insignias');
  await clip('insignias', async () => { await hold(1.0); await scroll(300, 1.5); await hold(1.3); });
  await go('/');
  await clip('perfil', async () => { await live(1.6, async () => { await wait(250); const b = await page.getByRole('button', { name: 'Tu perfil' }).first().boundingBox(); await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2); await wait(1100); await limpia(); }); await limpia(); await hold(1.2); await scroll(180, 1.2); await hold(0.9); });
  save('clips-app2.json'); console.log('errores:', errs); await browser.close();
})();
