// Inspection, part 1: open a built space in the app's own viewer (a phone-sized screen) and photograph it
// the way a visitor sees it: from every photo's camera, from where the walk starts, from a grid of places
// across the room looking every way, and every work up close and at an angle. Each shot is taken three times:
// as seen, and with every surface in a flat colour that says what it is (so the analysis can tell walls,
// floor and works apart), and once more with every surface shaded by its height (to tell a skirting board
// or a ceiling's edge, which are meant to be there, from a blotch or a streak).
// Last, the room seen from each photo's own camera with that photo left out (see space.js, ibrLeaveOut).
// Writes PNGs and shots.json (with page errors) into the output folder.
//   node render.cjs <app url> <slug> <outdir>
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');

(async () => {
  const [base, slug, out] = process.argv.slice(2);
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1.5 });
  const errors = [];
  page.on('pageerror', e => errors.push('page: ' + e.message));
  // network failures are caught below, with their address
  page.on('console', m => { if (m.type() === 'error' && !/^Failed to load resource/.test(m.text())) errors.push('console: ' + m.text()); });
  page.on('requestfailed', r => { if (!/fonts\.(googleapis|gstatic)/.test(r.url())) errors.push('failed: ' + r.url()); });
  // (data/thumbs.json is written only when the app is published: its absence is not a fault of the space)
  page.on('response', r => { if (r.status() >= 400 && !r.url().endsWith('/data/thumbs.json')) errors.push(`http ${r.status()}: ${r.url()}`); });
  // offline runs (no CDN): serve three.js from a local copy
  if (process.env.THREE_DIR) await page.route('https://cdn.jsdelivr.net/npm/three@*/**', r => {
    const rel = new URL(r.request().url()).pathname.replace(/^\/npm\/three@[^/]+\//, '');
    r.fulfill({ path: path.join(process.env.THREE_DIR, rel), contentType: 'application/javascript' });
  });
  if (process.env.NO_FONTS) await page.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  await page.goto(`${base}?inspect=${slug}#/exhibition/${slug}/space`);
  await page.waitForFunction(() => window.__spaceView && window.__spaceView.inspect, null, { timeout: 120000 });
  await page.waitForTimeout(2500);                                  // textures settle
  const info = await page.evaluate(() => { const i = window.__spaceView.inspect; return { pieces: i.pieces, views: i.views, room: i.room, eye: i.eye, start: i.start }; });
  const stand = p => page.evaluate(q => window.__spaceView.inspect.stand(q), p);

  const shots = [];
  const plan = (name, kind, at, to, fov = 60, up = [0, 1, 0], extra = {}) => shots.push({ name, kind, at, to, fov, up, ...extra });
  const R = info.room, E = info.eye;
  info.views.forEach((v, i) => plan(`view-${i}`, 'view', v.pos, v.look, Math.min(75, v.fov * 1.25), v.up));
  // the first thing a visitor sees, and around them from there
  const dirs = n => Array.from({ length: n }, (_, k) => 2 * Math.PI * k / n);
  const aroundFrom = async (tag, p, n, pitch) => {
    const at = await stand([p[0], E, p[2]]);
    for (const [k, a] of dirs(n).entries()) plan(`${tag}-${k}`, 'walk', at, [at[0] - Math.sin(a), E + Math.tan(pitch), at[2] - Math.cos(a)], 68);
  };
  plan('start', 'walk', info.start.pos, info.start.look, 62);
  await aroundFrom('start', info.start.pos, 8, -0.12);
  // a grid across the room, about every 2 m
  const nx = Math.max(2, Math.round((R.x1 - R.x0) / 2)), nz = Math.max(2, Math.round((R.z1 - R.z0) / 2));
  for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
    const p = [R.x0 + (i + 0.5) * (R.x1 - R.x0) / nx, E, R.z0 + (j + 0.5) * (R.z1 - R.z0) / nz];
    await aroundFrom(`grid-${i}-${j}`, p, 6, (i + j) % 2 ? -0.25 : 0.12);   // looking a little down, or up
  }
  // every work: square on (filling the screen), close, and from each side
  info.pieces.forEach((w, i) => {
    const c = w.centre, f = w.facing, side = [f[2], 0, -f[0]];
    const vf = 60 * Math.PI / 360, hf = Math.atan(Math.tan(vf) * 390 / 844);
    const d = Math.max(w.size.h / 200 / Math.tan(vf), w.size.w / 200 / Math.tan(hf)) / 0.85;
    plan(`work-${i}-front`, 'work', [c[0] + f[0] * d, c[1], c[2] + f[2] * d], c, 60, [0, 1, 0], { work: i });
    const near = Math.max(0.6, d * 0.45);
    plan(`work-${i}-near`, 'near', [c[0] + f[0] * near, c[1], c[2] + f[2] * near], c, 60, [0, 1, 0], { work: i });
    for (const s of [-1, 1]) {
      const dd = Math.max(1.2, d * 0.9);
      plan(`work-${i}-side${s > 0 ? 'r' : 'l'}`, 'oblique', [c[0] + (f[0] * 0.8 + side[0] * s * 0.6) * dd, E, c[2] + (f[2] * 0.8 + side[2] * s * 0.6) * dd], c, 60, [0, 1, 0], { work: i });
    }
  });

  for (const s of shots) {
    for (const ids of [false, true, 'height']) {
      const r = await page.evaluate(([a, t, f, u, ids]) => window.__spaceView.inspect.shot(a, t, f, u, ids), [s.at, s.to, s.fov, s.up, ids]);
      fs.writeFileSync(path.join(out, `${s.name}${ids === 'height' ? '.height' : ids ? '.ids' : ''}.png`), Buffer.from(r.png.split(',')[1], 'base64'));
      if (!ids) s.corners = r.corners;
    }
  }
  // the room against each photo, that photo left out: from its own camera, at its own shape, the other
  // photos alone (and, as white, where they saw), and what each pixel is
  const photos = [];
  const withLens = info.views.filter(v => v.project);
  if (withLens.length > 1) {
    const a = withLens[0].aspect || 1.5;
    await page.setViewportSize({ width: 900, height: Math.round(900 / a) });
    await page.addStyleTag({ content: '.sv{max-width:none !important;width:100vw !important;height:100vh !important;left:0 !important;right:0 !important;margin:0 !important;inset:0 !important;transform:none !important}' });
    await page.evaluate(() => window.dispatchEvent(new Event('resize'))); await page.waitForTimeout(800);
    for (const [i, v] of withLens.entries()) {
      const one = async (ids, leave) => (await page.evaluate(([v, ids, leave]) => window.__spaceView.inspect.shot(v.pos, v.look, v.fov, v.up, ids, v.project, leave), [v, ids, leave])).png;
      const save = (tag, png) => fs.writeFileSync(path.join(out, `photo-${i}${tag}.png`), Buffer.from(png.split(',')[1], 'base64'));
      save('', await one(false, { photo: v.photo }));
      save('.cover', await one(false, { photo: v.photo, cover: true }));
      save('.ids', await one(true, null));
      photos.push({ name: `photo-${i}`, photo: v.photo });
    }
  }
  fs.writeFileSync(path.join(out, 'shots.json'), JSON.stringify({ info, shots, photos, errors }, null, 1));
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
