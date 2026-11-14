// Graba el recorrido real de la app de prueba (ninguna llamada llega a la base real).
const fs = require('fs'); const open = require('./vexplore.js');
const DIR = __dirname + '/video/cap/'; fs.rmSync(DIR, { recursive: true, force: true }); fs.mkdirSync(DIR, { recursive: true });
(async () => {
  const { browser, ctx, page, errs } = await open();
  await ctx.setGeolocation({ latitude: -21.5381, longitude: -64.7318 });
  const { clip, hold, scroll, jump, live, tap, wait, save } = require('./vdsl.js')(page, errs, DIR);
  const go = async (path) => { await page.goto('http://localhost:8099' + path, { waitUntil: 'networkidle', timeout: 180000 }).catch((e) => errs.push('goto ' + e.message.slice(0, 80))); await wait(3500); };
  await go('/');
  await clip('inicio', async () => { await hold(1.6); await scroll(300, 1.8); await hold(1.0); });
  await tap('Actividad'); await wait(2200);
  await clip('actividad', async () => { await hold(1.0); await scroll(330, 1.8); await hold(1.0); });
  await tap('Canjes'); await wait(2600); await jump(168);
  await clip('canjes', async () => { await hold(0.9); await scroll(560, 2.0); await hold(0.7); });
  await clip('ficha', async () => { await live(1.5, async () => { await wait(250); await tap("Fripap's"); await wait(1100); }); await scroll(255, 1.3, [196, 600]); await hold(1.2); });
  await clip('canje', async () => {
    await live(1.4, async () => { await wait(250); await tap('Canjear'); await wait(1000); });
    await live(2.3, async () => { await wait(300); await page.keyboard.type('4821', { delay: 420 }); await wait(400); });
    await live(4.2, async () => { await wait(250); await tap('Canjear'); await wait(3700); });
    await hold(1.5);
  });
  await clip('resena', async () => { await live(1.6, async () => { await wait(250); await tap('No, solo esto'); await wait(1200); }); await hold(1.6); });
  await clip('historia', async () => { await live(1.6, async () => { await wait(250); await tap('Ahora no'); await wait(1200); }); await hold(1.8); });
  await go('/grupos');
  await clip('grupos', async () => { await hold(1.0); await scroll(220, 1.3); await hold(0.8); });
  await go('/ranking');
  await clip('ranking', async () => { await hold(1.0); await scroll(200, 1.4); await hold(0.9); });
  save('clips-app.json'); console.log('errores:', errs.slice(0, 8)); await browser.close();
})();
