const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await (await b.newContext()).newPage();
  await p.goto('file://' + __dirname + '/' + process.argv[2], { waitUntil: 'networkidle' }); await p.waitForTimeout(1500);
  await p.pdf({ path: process.argv[3], width: '297mm', height: '210mm', printBackground: true, preferCSSPageSize: true });
  await b.close();
})();
