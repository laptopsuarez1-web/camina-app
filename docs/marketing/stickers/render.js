const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 1600, height: 1200 }, deviceScaleFactor: 2 })).newPage();
  await p.goto('file://' + __dirname + '/stickers.html', { waitUntil: 'networkidle' }); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(500);
  const names = { s1: 'camina-morado', s2: 'camina-menta', s3: 'camina-blanco', s4: 'camina-baifo', s5: 'camina-logo', s6: 'camina-x-local' };
  for (const [id, n] of Object.entries(names)) await (await p.$('#' + id)).screenshot({ path: `${__dirname}/sticker-${n}.png`, omitBackground: true });
  await b.close();
})();
