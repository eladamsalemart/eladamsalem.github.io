// Photograph the sketch models of the four proposals (model.html): the plan, the view from the air, the views at eye height.
//   node studio/design/museum-open/render.cjs http://localhost:8199/studio/design/museum-open/ <out dir> [concept[,concept]] [view[,view]]
const { chromium } = require('playwright');
const base = process.argv[2], out = process.argv[3], only = (process.argv[4] || '').split(',').filter(Boolean), onlyV = (process.argv[5] || '').split(',').filter(Boolean);
const SHOTS = { field: ['plan', 'air', 'a', 'b', 'c'], descent: ['plan', 'air', 'a', 'b', 'c', 'd'], path: ['plan', 'air', 'a', 'b', 'c', 'd'], cluster: ['plan', 'air', 'a', 'b', 'c'] };
const SIZE = v => v === 'plan' ? [1200, 900] : v === 'air' ? [1200, 800] : [720, 960];
(async () => {
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  for (const [c, views] of Object.entries(SHOTS)) {
    if (only.length && !only.includes(c)) continue;
    for (const v of views) {
      if (onlyV.length && !onlyV.includes(v)) continue;
      const [w, h] = SIZE(v), ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2 }), p = await ctx.newPage();
      p.on('pageerror', e => console.log('ERR', c, v, e.message)); p.on('console', m => { if (m.type() === 'error') console.log('C', c, v, m.text().slice(0, 200)); });
      await p.goto(`${base}model.html?c=${c}&v=${v}${process.env.EXTRA||''}`);
      await p.waitForFunction(() => window.__ready, null, { timeout: 180000, polling: 200 });
      await p.screenshot({ path: `${out}/${c}-${v}.jpg`, type: 'jpeg', quality: 86 });
      await ctx.close();
    }
    console.log('done', c);
  }
  await b.close();
})();
