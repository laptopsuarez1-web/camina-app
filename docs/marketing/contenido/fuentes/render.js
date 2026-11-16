const { chromium } = require('playwright');
(async () => {
  const name = process.argv[2];
  const b = await chromium.launch();
  const p = await (await b.newContext({ viewport: { width: 1080, height: 1350 }, deviceScaleFactor: 1 })).newPage();
  await p.goto('file://' + __dirname + '/' + name + '.html', { waitUntil: 'networkidle' }); await p.waitForTimeout(1200);
  const s = await p.$$('section.s');
  for (let i = 0; i < s.length; i++) await s[i].screenshot({ path: `${__dirname}/out/${name}-${i + 1}.png` });
  await p.pdf({ path: `${__dirname}/out/${name}.pdf`, width: '1080px', height: '1350px', printBackground: true, preferCSSPageSize: true });
  console.log(name, s.length); await b.close();
})();
