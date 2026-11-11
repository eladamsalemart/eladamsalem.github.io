// One screenshot of the Desk (or the app) at a desktop size, for looking at a change.
// usage: node studio/desk/tests/look.cjs <w> <h> <route, e.g. museum> <out.jpg> [js to run before the shot] [wait ms]
//   BASE=<url up to the hash> (default: the Desk with demo data on localhost:8093), DSF=<device scale> (default 0.39: a small picture)
const { chromium } = require('./pw.cjs');
(async () => {
  const [w, h, hash, out, js, wait] = process.argv.slice(2);
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: +(process.env.DSF || 0.39) });
  p.on('pageerror', e => console.log('PAGEERROR', e.message)); p.on('console', m => /error|warn/.test(m.type()) && console.log('CONSOLE', m.text().slice(0, 200)));
  p.on('response', r => r.status() >= 400 && console.log('HTTP', r.status(), r.url()));
  await p.goto((process.env.BASE || 'http://localhost:8093/studio/desk/?guest') + '#/' + hash); await p.waitForTimeout(2500);
  if (js) { const r = await p.evaluate(js); if (r !== undefined) console.log(JSON.stringify(r)); await p.waitForTimeout(+(wait || 800)); }
  await p.screenshot({ path: out, type: 'jpeg', quality: 80 }); await b.close();
})();
