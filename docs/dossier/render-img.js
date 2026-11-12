// Cada página como imagen fija: así se ve igual en cualquier visor (iPhone, WhatsApp, Android, computadora).
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await (await b.newContext({ viewport: { width: 1123, height: 794 }, deviceScaleFactor: 2.5 })).newPage();
  await p.goto('file://' + __dirname + '/' + process.argv[2], { waitUntil: 'networkidle' });
  await p.waitForTimeout(1500);
  const pages = await p.$$('section.pg');
  for (let i = 0; i < pages.length; i++) {
    await pages[i].screenshot({ path: `${process.argv[3]}-${String(i + 1).padStart(2, '0')}.jpg`, type: 'jpeg', quality: 88 });
  }
  console.log(pages.length);
  await b.close();
})();
