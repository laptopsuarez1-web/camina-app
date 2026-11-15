// Saca cada lámina de la publicación como PNG de 1080 x 1350.
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await (await b.newContext({ viewport: { width: 1080, height: 1350 } })).newPage();
  await p.goto('file://' + __dirname + '/post.html', { waitUntil: 'networkidle' });
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(600);
  const s = await p.$$('section.s');
  for (let i = 0; i < s.length; i++) await s[i].screenshot({ path: `${__dirname}/Camina-post-lanzamiento-${i + 1}.png` });
  await b.close();
})();
