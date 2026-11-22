// Shots of the museum from the start and from points near the glass, as a phone sees it.
//   NODE_PATH=$(npm root -g) node outside_shot.cjs <base url> <out dir> <hour> <scale> [name]
const { chromium } = require('playwright');
const [base, out, hour = '14', scale = '2', tag = 'x'] = process.argv.slice(2);
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: +scale, isMobile: true, hasTouch: true });
  const p = await ctx.newPage(); p.on('pageerror', e => console.log('ERR', e.message));
  await p.goto(`${base.replace(/\/?$/, '/')}?guest&hour=${hour}#/museum`);
  await p.waitForFunction(() => window.__spaceView && document.querySelector('canvas'), null, { timeout: 180000, polling: 200 });
  await p.waitForTimeout(9000);
  const views = { start: null, west: [[3, 1.7, 60], [-30, 3, 56]], south: [[20, 1.7, 69], [28, 4, 110]], north: [[60, 1.7, 3], [66, 5, -40]], ne: [[88, 1.7, 8], [130, 5, -30]] };
  for (const [k, v] of Object.entries(views)) {
    if (v) await p.evaluate(([a, t]) => window.__spaceView.inspect.place(a, t), v);
    await p.waitForTimeout(2500);
    await p.screenshot({ path: `${out}/${tag}-${hour}-${k}.png` });
  }
  console.log(JSON.stringify(await p.evaluate(() => ({ s: window.__spaceView.inspect.stats(), m: window.__spaceView.inspect.memory() }))));
  await b.close();
})();
