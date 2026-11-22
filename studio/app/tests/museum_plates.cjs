// Every exhibition text plate in the museum (houses, original-space pavilions, wing door, wing bays) opens the reader when tapped on a phone.
//   node studio/app/tests/museum_plates.cjs [http://localhost:8199/studio/app/] [folder for shots]  (exit 1 if one does not)
const { chromium } = require('playwright');
(async () => {
  const base = (process.argv[2] || 'http://localhost:8199/studio/app/').replace(/\/?$/, '/'), out = process.argv[3];
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const c = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(base + '?guest#/museum');
  await p.waitForFunction(() => window.__spaceView && document.querySelector('canvas'), null, { timeout: 240000, polling: 200 });
  await p.waitForTimeout(8000);
  const hot = await p.evaluate(() => window.__spaceView.inspect.hot());
  const res = [];
  for (const [k, h] of hot.entries()) {
    const [id, title, kind, n, o, u, v, sz, nr] = h;
    const c0 = [0, 1, 2].map(j => o[j] + u[j] * sz[0] / 2 + v[j] * sz[1] / 2), eye = [c0[0] + nr[0] * 2.2, 1.6, c0[2] + nr[2] * 2.2];
    await p.evaluate(([e, t]) => window.__spaceView.inspect.shot(e, t, 60), [eye, c0]); await p.waitForTimeout(2500);
    if (out && k < 2) await p.screenshot({ path: `${out}/plate${k}.png` });
    const cv = await p.$('canvas'), bx = await cv.boundingBox();
    await p.mouse.click(bx.x + bx.width / 2, bx.y + bx.height / 2); await p.waitForTimeout(900);
    const r = await p.evaluate(() => { const el = document.querySelector('.sv-read'); return el && getComputedStyle(el).display !== 'none' && !el.hidden ? (el.querySelector('b') || {}).textContent || '?' : null; });
    if (out && k === 0) await p.screenshot({ path: `${out}/reader0.png` });
    res.push(`${id}: ${r ? 'reader opens "' + r.slice(0, 30) + '"' : 'NO READER'}`);
    await p.evaluate(() => { const x = document.querySelector('.sv-read-x'); if (x) x.click(); }); await p.waitForTimeout(400);
  }
  const bad = res.filter(x => /NO READER/.test(x)).length + errs.length + (hot.length ? 0 : 1);
  console.log(res.join('\n')); console.log('errors', errs.slice(0, 5)); console.log(bad ? 'FAIL' : `all ${hot.length} plates open`);
  await b.close(); process.exit(bad ? 1 : 0);
})();
