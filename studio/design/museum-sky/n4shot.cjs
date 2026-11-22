const { chromium } = require('playwright');
(async () => {
  const [,, base, out, dpr, ...views] = process.argv;
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const c = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: +dpr || 1, isMobile: true, hasTouch: true });
  const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => /DBG/.test(m.text()) && console.log(m.text().slice(0,300))); p.on('console', m => m.type() === 'error' && errs.push(m.text().slice(0, 200))); p.on('response', r => r.status() >= 400 && errs.push(r.status() + ' ' + r.url().slice(-80)));
  await p.route(/museum_plan/, async r => { let pl = null; try { const j = await (await r.fetch()).json(); pl = j[0] && j[0].plan; } catch {} if (!pl) pl = { spaces: [{ id: 'h1', type: 'house', slot: 1, door: [41, 21], dir: 270 }, { id: 'renaissance', type: 'section', section: 'renaissance', door: [14, 47], dir: [0, -1] }] };
    const sp = (pl.spaces || []).filter(x => !['ritual', 'v1', 'v2'].includes(x.id)); sp.push({ id: 'ritual', type: 'house', slot: 57, tour: 'ritual', door: [79, 60], dir: 0 }, { id: 'v1', type: 'house', slot: 58, tour: 'show-805a6c3b', door: [86, 10], dir: 180 });
    r.fulfill({ json: [{ plan: { ...pl, spaces: sp } }] }); });
  await p.goto(base + '?guest#/museum');
  await p.waitForFunction(() => window.__spaceView && document.querySelector('canvas'), null, { timeout: 240000, polling: 200 });
  await p.waitForTimeout(8000);
  console.log('stats', JSON.stringify(await p.evaluate(() => ({ s: window.__spaceView.inspect.stats(), m: window.__spaceView.inspect.memory(), d: window.__spaceView.inspect.directory && 0 }))));
  console.log('heavy', JSON.stringify(await p.evaluate(() => window.__spaceView.inspect.heavy())).slice(0, 1500));
  console.log('near', JSON.stringify(await p.evaluate(() => window.__spaceView.inspect.pieces.filter(x => x.centre[0] > 70 && x.centre[2] < 25).map(x => [x.title, x.centre.map(v => +v.toFixed(1))]))));
  console.log('stand', JSON.stringify(await p.evaluate(() => { const i = window.__spaceView.inspect; return [[81, 60], [79.5, 60], [78.5, 60], [81, 55], [7, 10], [4, 10]].map(q => i.stand([q[0], 1.6, q[1]]).map(v => +v.toFixed(1))); })));
  for (const [i, v] of views.entries()) { const a = v.split(',').map(Number); await p.evaluate(a => window.__spaceView.inspect.shot([a[0], 1.6, a[1]], [a[2], 1.5, a[3]], 70), a); await p.waitForTimeout(2500); await p.screenshot({ path: `${out}${i}.png` }); }
  console.log('errors', errs.slice(0, 5)); await b.close();
})();
