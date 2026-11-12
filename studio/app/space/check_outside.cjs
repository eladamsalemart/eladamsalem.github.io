// The view through a glass wall must have depth: not a flat picture on the wall (the owner asked several times).
// Opens the Glass pavilion as an iPhone, stands at two places 1.6 m apart looking the same way through the glass, and measures
// how far the outside moved in the picture: high up (far trees, sky's edge) and low down (the terrace, the planting's foot).
//   - a flat picture on the glass moves everything by the same large amount (fails: far/near ratio near 1);
//   - a real outside: near things move a lot, far things little (passes: far moves under 0.6 of near), and something does move;
//   - the outside is sharp enough to read (edge energy), and is not one flat colour.
// node studio/app/space/check_outside.cjs [base url] [out dir]     OUTSIDE_FLAT=1 puts the flat picture back, to prove the check.
const { chromium, devices } = require('playwright');
const fs = require('fs'), zlib = require('zlib');
const base = process.argv[2] || 'http://localhost:8765/studio/app/', out = process.argv[3] || '/tmp/outside';
fs.mkdirSync(out, { recursive: true });
function png(buf) {      // a PNG screenshot (8-bit RGB/RGBA, no interlace) to { w, h, lum[] }
  let p = 8, w, h, ct, idat = [];
  while (p < buf.length) { const n = buf.readUInt32BE(p), t = buf.toString('ascii', p + 4, p + 8), d = buf.subarray(p + 8, p + 8 + n); if (t === 'IHDR') { w = d.readUInt32BE(0); h = d.readUInt32BE(4); ct = d[9]; } else if (t === 'IDAT') idat.push(d); p += 12 + n; }
  const bpp = ct === 6 ? 4 : 3, raw = zlib.inflateSync(Buffer.concat(idat)), st = w * bpp, lum = new Float32Array(w * h), prev = Buffer.alloc(st), cur = Buffer.alloc(st);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (st + 1)]; raw.copy(cur, 0, y * (st + 1) + 1, (y + 1) * (st + 1));
    for (let i = 0; i < st; i++) { const a = i >= bpp ? cur[i - bpp] : 0, b = prev[i], c = i >= bpp ? prev[i - bpp] : 0; let v = cur[i];
      if (f === 1) v += a; else if (f === 2) v += b; else if (f === 3) v += (a + b) >> 1; else if (f === 4) { const q = a + b - c, pa = Math.abs(q - a), pb = Math.abs(q - b), pc = Math.abs(q - c); v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c; } cur[i] = v & 255; }
    for (let x = 0; x < w; x++) lum[y * w + x] = 0.299 * cur[x * bpp] + 0.587 * cur[x * bpp + 1] + 0.114 * cur[x * bpp + 2];
    cur.copy(prev);
  }
  return { w, h, lum };
}
// how far a band of rows moved sideways between two pictures (pixels), by matching the columns' brightness profile
function shift(A, B, y0, y1, max) {
  const prof = I => { const p = new Float32Array(I.w); for (let x = 0; x < I.w; x++) { let s = 0; for (let y = y0; y < y1; y++) s += I.lum[y * I.w + x]; p[x] = s / (y1 - y0); } let m = 0; for (const v of p) m += v; m /= p.length; return p.map(v => v - m); };
  const a = prof(A), b = prof(B); let best = 0, bs = -Infinity;
  for (let d = -max; d <= max; d++) { let s = 0, n = 0, sa = 0, sb = 0; for (let x = Math.max(0, d) + 20; x < A.w - 20 + Math.min(0, d); x++) { s += a[x] * b[x - d]; sa += a[x] * a[x]; sb += b[x - d] * b[x - d]; n++; } const c = s / Math.sqrt(sa * sb + 1e-6); if (c > bs) { bs = c; best = d; } }
  return { d: best, corr: +bs.toFixed(2) };
}
const edges = (I, y0, y1) => { let s = 0, n = 0; for (let y = y0; y < y1; y++) for (let x = 1; x < I.w; x++) { s += Math.abs(I.lum[y * I.w + x] - I.lum[y * I.w + x - 1]); n++; } return s / n; };
const spread = (I, y0, y1) => { let s = 0, s2 = 0, n = 0; for (let y = y0; y < y1; y++) for (let x = 0; x < I.w; x += 3) { const v = I.lum[y * I.w + x]; s += v; s2 += v * v; n++; } return Math.sqrt(s2 / n - (s / n) ** 2); };
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await (await b.newContext({ ...devices['iPhone 13'] })).newPage();
  const errs = []; p.on('pageerror', e => errs.push(String(e).slice(0, 200)));
  if (process.env.OUTSIDE_FLAT) await p.route('**/space/space.js', async r => { const res = await r.fetch(); r.fulfill({ response: res, body: (await res.text()).replace('const glassWalls = new Set(', 'const glassWalls = new Set(); const glassWallsOff = new Set(') }); });
  await p.goto(base + '?guest#/studio'); await p.waitForTimeout(2000);
  await p.getByText('Open the demo studio').first().click(); await p.waitForTimeout(1500);
  await p.evaluate(() => { location.hash = '#/studio/onview'; }); await p.waitForTimeout(2000);
  await p.getByText('Glass pavilion', { exact: true }).first().click(); await p.waitForTimeout(1200);
  await p.getByText('Walk in and hang the works').first().click();
  await p.waitForFunction(() => window.__he && window.__he.api, null, { timeout: 60000 }); await p.waitForTimeout(6000);
  const room = await p.evaluate(() => { document.querySelectorAll('.he,.sv-map,.sv-top,.sv-hint,.sv-stick,.sv-aim').forEach(e => e.style.visibility = 'hidden'); return window.__he.api.R; });
  // look straight out through the glass (wall-z0, at z = 0) from two places 1.6 m apart, clear of the standing walls
  const z = Math.min(room.z1 - 1, 2.6), x0 = room.x1 - 2.6, shots = [];
  for (const [i, x] of [[0, x0], [1, x0 - 1.6]]) {
    await p.evaluate(([x, z]) => window.__he.api.setPose([x, 1.6, z], [x, 1.6, -30]), [x, z]); await p.waitForTimeout(5000);
    const f = `${out}/outside-${i}.png`; await p.screenshot({ path: f }); shots.push(png(fs.readFileSync(f)));
  }
  await b.close();
  const [A, B] = shots, H = A.h, far = shift(A, B, Math.round(H * 0.30), Math.round(H * 0.44), Math.round(A.w * 0.45)), near = shift(A, B, Math.round(H * 0.52), Math.round(H * 0.62), Math.round(A.w * 0.45));
  const sharp = edges(A, Math.round(H * 0.30), Math.round(H * 0.5)), sd = spread(A, Math.round(H * 0.25), Math.round(H * 0.5));
  const fails = [];
  if (Math.abs(near.d) < 12) fails.push(`nothing near the window moves as the visitor walks (${near.d} px)`);
  if (Math.abs(far.d) > 0.6 * Math.abs(near.d)) fails.push(`the far view moves as much as the near (${far.d} px against ${near.d} px): a flat picture on the wall`);
  if (sharp < 2.2) fails.push(`the outside is blurred (edge ${sharp.toFixed(2)}, wants 2.2)`);
  if (sd < 18) fails.push(`the outside is nearly one colour (spread ${sd.toFixed(1)}, wants 18)`);
  if (errs.length) fails.push('script error: ' + errs[0]);
  fs.writeFileSync(`${out}/outside.json`, JSON.stringify({ far, near, sharp, sd, fails }, null, 1));
  console.log(`${fails.length ? 'FAIL' : 'ok  '} outside: far ${far.d} px, near ${near.d} px, edge ${sharp.toFixed(2)}, spread ${sd.toFixed(1)}${fails.length ? ' — ' + fails.join('; ') : ''}`);
  process.exit(fails.length ? 1 : 0);
})().catch(e => { console.log('FAIL outside: ' + String(e).slice(0, 300)); process.exit(1); });
