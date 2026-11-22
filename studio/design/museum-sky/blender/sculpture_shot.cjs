const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const p = await ctx.newPage(); p.on('pageerror', e => console.log('ERR', e.message)); p.on('console', m => { if (/model/i.test(m.text())) console.log('C', m.text().slice(0, 200)); });
  await p.goto('http://localhost:8211/studio/app/?guest&hour=14#/museum');
  await p.waitForFunction(() => window.__spaceView && document.querySelector('canvas'), null, { timeout: 180000 });
  await p.waitForTimeout(5000);
  await p.tap('.sv-map', { timeout: 120000 }); await p.waitForSelector('.sv-dir:not([hidden])', { timeout: 120000 });
  const names = await p.evaluate(() => [...document.querySelectorAll('.sv-dir-l button')].map(x => x.textContent.trim()));
  console.log(names.join(' | '));
  const i = names.findIndex(n => /Rome and Venice/i.test(n)); console.log('idx', i);
  if (i >= 0) { await p.evaluate(i => document.querySelectorAll('.sv-dir-l button')[i].click(), i); await p.waitForTimeout(9000);
    for (const t of [0, 1]) { await p.screenshot({ path: process.argv[2] + `-${t}.png` }); await p.evaluate(() => window.__spaceView.inspect.where()); await p.keyboard.down('ArrowUp'); await p.waitForTimeout(1500); await p.keyboard.up('ArrowUp'); await p.waitForTimeout(2500); } }
  console.log(JSON.stringify(await p.evaluate(() => ({ where: window.__spaceView.inspect.where(), s: window.__spaceView.inspect.stats(), m: window.__spaceView.inspect.memory() }))));
  await b.close();
})();
