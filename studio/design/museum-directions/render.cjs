// Photograph the sketch models of the museum directions (model.html): plan, section, bird's-eye, three views at eye level.
//   node studio/design/museum-directions/render.cjs http://localhost:8199/studio/design/museum-directions/ <out dir> [A,B] [plan,air]
const { chromium } = require('playwright');
const base = process.argv[2], out = process.argv[3], only = (process.argv[4] || '').split(',').filter(Boolean), onlyV = (process.argv[5] || '').split(',').filter(Boolean);
const DIRS = (process.env.DIRS || '12345').split(''), VIEWS = (process.env.VIEWS || 'plan,plan2,section,air,e1,e2,e3').split(',');
const SIZE = v => v === 'plan' || v === 'plan2' ? [1300, 1000] : v === 'section' ? [1300, 640] : v === 'air' ? [1300, 860] : [1000, 760];
(async () => {
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  for (const d of DIRS) {
    if (only.length && !only.includes(d)) continue;
    for (const v of VIEWS) {
      if (onlyV.length && !onlyV.includes(v)) continue;
      if (v === 'plan2' && !process.env.PLAN2) continue;
      const [w, h] = SIZE(v), ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2 }), p = await ctx.newPage();
      p.on('pageerror', e => console.log('ERR', d, v, e.message)); p.on('console', m => { if (m.type() === 'error') console.log('C', d, v, m.text().slice(0, 200)); });
      try {
        await p.goto(`${base}model.html?d=${d}&v=${v}${process.env.EXTRA || ''}`);
        await p.waitForFunction(() => window.__ready, null, { timeout: 120000, polling: 200 });
        await p.screenshot({ path: `${out}/${d}-${v}${process.env.SUFFIX || ''}.jpg`, type: 'jpeg', quality: 86 });
      } catch (e) { console.log('FAIL', d, v, String(e).slice(0, 120)); }
      await ctx.close();
    }
    console.log('done', d);
  }
  await b.close();
})();
