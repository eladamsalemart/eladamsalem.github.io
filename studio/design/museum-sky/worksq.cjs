// How sharp are the paintings? For every work in the museum: its real size (cm), the picture the viewer holds now, and how many picture pixels fall on each screen pixel
// at 1.5 / 3 / 5 m, as a phone (390x844 @3x) and as a laptop (1440x900 @1). >= 1 is sharp; 0.5 is soft; < 0.5 is blurry.
//   usage: THUMBS=1 NODE_PATH=$(npm root -g) node studio/design/museum-sky/worksq.cjs <app url> [wait ms]
const { chromium } = require('playwright'); const fs = require('fs'), path = require('path');
(async () => {
  const base = process.argv[2] || 'http://localhost:8199/studio/app/', wait = +process.argv[3] || 14000;
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  for (const dev of [{ n: 'phone', w: 390, h: 844, dpr: 3, mobile: true }, { n: 'laptop', w: 1440, h: 900, dpr: 1, mobile: false }]) {
    const c = await b.newContext({ viewport: { width: dev.w, height: dev.h }, deviceScaleFactor: dev.dpr, isMobile: dev.mobile, hasTouch: dev.mobile });
    const p = await c.newPage();
    if (process.env.THUMBS) { const R = path.resolve(__dirname, '../../../open-studio');
      await p.route(/data\/thumbs\.json/, r => r.fulfill({ path: path.join(R, 'data/thumbs.json'), contentType: 'application/json' }));
      await p.route(/\/thumbs\/[^/]+\.webp/, r => { const f = path.join(R, 'thumbs', path.basename(new URL(r.request().url()).pathname)); fs.existsSync(f) ? r.fulfill({ path: f, contentType: 'image/webp' }) : r.continue(); }); }
    await p.goto(base + '?guest#/museum'); await p.waitForFunction(() => window.__spaceView && document.querySelector('canvas'), null, { timeout: 240000, polling: 200 }); await p.waitForTimeout(wait);
    const ws = await p.evaluate(() => window.__spaceView.inspect.works());
    const hfov = 2 * Math.atan(Math.tan(30 * Math.PI / 180) * dev.w / dev.h), px = dev.w * dev.dpr;
    const row = (cm, im, d) => { const vis = 2 * d * Math.tan(hfov / 2), devPx = cm[0] / 100 / vis * px; return im[0] / devPx; };
    console.log(`\n== ${dev.n}: ${ws.length} works, horizontal field of view ${(hfov * 180 / Math.PI).toFixed(0)} deg`);
    console.log('title'.padEnd(34), 'cm'.padEnd(10), 'held px'.padEnd(11), 'sharp@1.5m  @3m  @5m');
    for (const w of ws.sort((a, z) => row(a.cm, a.image, 3) - row(z.cm, z.image, 3))) console.log(String(w.title).slice(0, 33).padEnd(34), (w.cm.map(v => Math.round(v)).join('x')).padEnd(10), (w.image.join('x')).padEnd(11), [1.5, 3, 5].map(d => row(w.cm, w.image, d).toFixed(2).padStart(6)).join(' '));
    await c.close();
  }
  await b.close();
})();
