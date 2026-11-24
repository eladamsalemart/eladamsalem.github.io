// How soon a phone on 4G sees the museum, with the pictures' compressed copies (texopt) and without (?notexopt): a cold cache, ~9 Mbps
// down, 150 ms round trip. Measured: the first frame drawn, and the moment every work in view holds the sharpness it wants.
// usage: BASE=<the app's url> [RUNS=2] node studio/app/tests/tex_speed.cjs
// PASS: the copies are not slower to the first frame (within 10%), nor to sharp works in view
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const BASE = (process.env.BASE || 'http://localhost:8088/studio/app/').replace(/\/?$/, '/'), RUNS = +process.env.RUNS || 2;
const R = path.resolve(__dirname, '../../../open-studio');

async function once(b, off) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  const p = await ctx.newPage();
  const cdp = await ctx.newCDPSession(p);
  await cdp.send('Network.enable');
  await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
  await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: 9e6 / 8, uploadThroughput: 3e6 / 8 });
  await p.route(/data\/thumbs\.json/, r => r.fulfill({ path: path.join(R, 'data/thumbs.json'), contentType: 'application/json' }));
  await p.route(/\/thumbs\/[^/]+\.webp/, r => { const f = path.join(R, 'thumbs', path.basename(new URL(r.request().url()).pathname)); fs.existsSync(f) ? r.fulfill({ path: f, contentType: 'image/webp' }) : r.continue(); });
  await p.clock.setFixedTime(new Date('2026-11-23T14:00:00'));
  const t0 = Date.now();
  await p.goto(BASE + (off ? '?guest&notexopt' : '?guest') + '#/museum');
  await p.waitForFunction(() => window.__spaceView && document.querySelector('canvas'), null, { timeout: 600000, polling: 100 });
  const first = (Date.now() - t0) / 1000;
  let sharp = null;
  for (let i = 0; i < 1200 && sharp === null; i++) {
    const ok = await p.evaluate(() => { const t = window.__spaceView.inspect.tiers(); const w = t.filter(x => x[2] > 0); return w.length > 0 && w.every(x => x[1] >= x[2] / 1.05 || x[6] || x[5]); });
    if (ok) sharp = (Date.now() - t0) / 1000; else await p.waitForTimeout(250);
  }
  await ctx.close();
  return { first, sharp };
}

(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const res = { before: [], after: [] };
  for (let i = 0; i < RUNS; i++) { res.before.push(await once(b, true)); res.after.push(await once(b, false)); }
  await b.close();
  const med = (a, k) => { const v = a.map(x => x[k] ?? 999).sort((x, y) => x - y); return +v[Math.floor(v.length / 2)].toFixed(1); };
  const out = { first_frame_s: { before: med(res.before, 'first'), after: med(res.after, 'first') }, works_in_view_sharp_s: { before: med(res.before, 'sharp'), after: med(res.after, 'sharp') }, runs: res };
  console.log(JSON.stringify(out));
  const bad = [];
  if (out.first_frame_s.after > out.first_frame_s.before * 1.1) bad.push(`first frame ${out.first_frame_s.after} s, was ${out.first_frame_s.before} s`);
  if (out.works_in_view_sharp_s.after > out.works_in_view_sharp_s.before * 1.1) bad.push(`works in view sharp at ${out.works_in_view_sharp_s.after} s, was ${out.works_in_view_sharp_s.before} s`);
  console.log(bad.length ? 'FAIL ' + bad.join('; ') : 'PASS on 4G the copies are not slower');
  process.exitCode = bad.length ? 1 : 0;
})();
