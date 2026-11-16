// Saca los cuadros del video (30 por segundo) moviendo el tiempo a mano, para que salga siempre igual.
const { chromium } = require('playwright'); const fs = require('fs');
(async () => {
  const v = process.argv[2]; const only = process.argv[3]; const dir = `${__dirname}/frames5-${v}`; fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
  const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 })).newPage();
  await p.goto(`file://${__dirname}/reel5.html?v=${v}`, { waitUntil: 'networkidle' }); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(800); await p.evaluate(() => window.fit());
  const dur = await p.evaluate(() => window.DUR); fs.writeFileSync(`${__dirname}/ev-${v}.json`, JSON.stringify(await p.evaluate(() => window.EV)));
  if (only) { for (const t of only.split(',')) { await p.evaluate((x) => window.seek(x), +t); await p.screenshot({ path: `${dir}/t-${t}.jpg`, type: 'jpeg', quality: 80 }); } console.log(v, dur); await b.close(); return; }
  const n = Math.round(dur * 30);
  for (let i = 0; i < n; i++) { await p.evaluate((x) => window.seek(x), i / 30); await p.screenshot({ path: `${dir}/f-${String(i).padStart(4, '0')}.jpg`, type: 'jpeg', quality: 93 }); }
  console.log(v, dur, n); await b.close();
})();
