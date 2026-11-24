// The pictures' memory on a phone, and their sharpness up close, with the server's compressed copies (texopt) and without
// (?notexopt: the room exactly as it loaded before). As an iPhone (390x844), with the live site's work thumbnails.
//   1. memory at the museum's start view, and inside Ritual (its pavilion, as tests/pad_mirror.cjs walks in)
//   2. 1 m in front of a painting in Ritual: the picture's pixels as held, and a shot of it (SHOTS=<dir>)
//   3. the colour of that painting on screen, compressed against not: mean dE and the largest shift of a channel
// usage: BASE=<the app's url> [SHOTS=<dir>] [WORK=<title>] node studio/app/tests/tex_memory.cjs
// PASS: at least 40% less memory at both places, the same or more pixels held 1 m from the painting, and no colour shift
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const BASE = (process.env.BASE || 'http://localhost:8088/studio/app/').replace(/\/?$/, '/'), SHOTS = process.env.SHOTS || '';
const R = path.resolve(__dirname, '../../../open-studio');      // the published copy: the live site's thumbnails (a local run has none)
const W = ([x, y, z]) => [79.25 + (3.9665 - z), y, 60 + (x - 2.81)];      // Ritual's own (x, y, z) -> the museum (as pad_mirror.cjs)

async function visit(b, off) {
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true })).newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  p.on('console', m => { if (/GL_INVALID|KTX2Loader/.test(m.text())) errs.push(m.text().slice(0, 160)); });      // (a compressed picture the GPU refused draws black: 24.11, sizes not a multiple of 4)
  await p.route(/data\/thumbs\.json/, r => r.fulfill({ path: path.join(R, 'data/thumbs.json'), contentType: 'application/json' }));
  await p.route(/\/thumbs\/[^/]+\.webp/, r => { const f = path.join(R, 'thumbs', path.basename(new URL(r.request().url()).pathname)); fs.existsSync(f) ? r.fulfill({ path: f, contentType: 'image/webp' }) : r.continue(); });
  if (process.env.TEXKINDS) await p.route(/data\/tex\.json/, async r => { const j = await (await r.fetch()).json(), k = process.env.TEXKINDS.split(','); for (const [n, e] of Object.entries(j.tex)) { if (!k.includes(e.kind)) delete j.tex[n]; else if (process.env.NORELIEF) delete e.r; } r.fulfill({ json: j }); });      // (TEXKINDS=work,wall: only those kinds compressed, to find what moved)
  await p.route(/museum_plan/, async r => { let pl = null; try { const j = await (await r.fetch()).json(); pl = j[0] && j[0].plan; } catch {} if (!pl) pl = { spaces: [] };
    const sp = (pl.spaces || []).filter(x => x.id !== 'ritual'); sp.push({ id: 'ritual', type: 'house', slot: 57, tour: 'ritual', door: [79, 60], dir: 0 }); r.fulfill({ json: [{ plan: { ...pl, spaces: sp } }] }); });
  const got = new Map(); let bytes = 0; p.on('requestfinished', async q => { const u = q.url(); if (/\.(ktx2|jpe?g|png|webp)(\?|$)/i.test(u) && !got.has(u)) { got.set(u, 0); try { const n = (await q.sizes()).responseBodySize; got.set(u, n); bytes += n; } catch {} } });      // (each picture once: a picture asked for again comes from the cache)
  await p.clock.setFixedTime(new Date('2026-11-23T14:00:00'));      // (the museum's light follows the visitor's hour: both runs at the same one, or the colour comparison measures the clock)
  await p.goto(BASE + (off ? '?guest&notexopt' : '?guest') + '#/museum');
  await p.waitForFunction(() => window.__spaceView && document.querySelector('canvas'), null, { timeout: 300000, polling: 300 });
  await p.waitForTimeout(12000);
  const settle = async () => { let last = -1, same = 0; for (let i = 0; i < 45 && same < 3; i++) { await p.waitForTimeout(2000); const n = await p.evaluate(() => { const t = window.__spaceView.inspect.textures(1000); return t.length * 1e4 + t.reduce((s, r) => s + r[2], 0) % 1e4; }); same = n === last ? same + 1 : 0; last = n; } };      // (measured once every picture has arrived: the same pictures for 6 s)
  await settle();
  const I = () => p.evaluate(() => { const i = window.__spaceView.inspect; const t = i.textures(400); return { mb: i.memory(), ktx: t.filter(r => r[5] === 'ktx2').length, all: t.length, wide: t.filter(r => r[2] >= 2800).map(r => r[2] + 'x' + r[3]) }; });      // (wide: Ritual's 14 m walls at the tour's 2803 px = 200 px/m)
  const start = await I(), startDl = bytes;
  for (const [a, l] of [[[2.81, 1.6, 4.4], [2.81, 1.6, 2.0]], [[2.0, 1.6, 2.0], [-8, 1.6, 2.0]], [[-6, 1.6, 2.0], [3, 1.7, 1.6]]]) {
    await p.evaluate(([a, l]) => window.__spaceView.inspect.place(a, l), [W(a), W(l)]); await p.waitForTimeout(4000);
  }
  await settle();
  const ritual = await I();
  // 1 m in front of a painting in Ritual, at its centre's height, looking straight at it; the sharp copy is given time to arrive
  const work = await p.evaluate(want => {
    const ws = window.__spaceView.inspect.works().filter(w => w.at[0] > 79.3 && w.inScene && w.image[0] > 1);
    return (want && ws.find(w => w.title.toLowerCase().includes(want.toLowerCase()))) || ws.sort((a, z) => z.cm[0] * z.cm[1] - a.cm[0] * a.cm[1])[0];
  }, process.env.WORK || '');
  const n = [work.stand[0] - work.at[0], 0, work.stand[2] - work.at[2]], k = 1 / Math.hypot(n[0], n[2]);
  const eye = [work.at[0] + n[0] * k, work.at[1], work.at[2] + n[2] * k];
  await p.evaluate(([e, a]) => window.__spaceView.inspect.place(e, a), [eye, work.at]);
  for (let i = 0; i < 12; i++) { await p.waitForTimeout(1500); await p.evaluate(([e, a, j]) => window.__spaceView.inspect.place([e[0] + 1e-4 * (j % 2), e[1], e[2]], a), [eye, work.at, i]); }
  if (process.env.DEBUG) console.log(off ? 'before' : 'after', JSON.stringify(await p.evaluate(t => [window.__spaceView.inspect.where(), window.__spaceView.inspect.tiers().filter(x => x[0] === t)], work.title)));
  const held = await p.evaluate(at => window.__spaceView.inspect.works().find(w => w.at.every((v, i) => Math.abs(v - at[i]) < 1e-3)).image, work.at);      // (by place: several works may share a title)
  const shot = await p.screenshot({ clip: { x: 0, y: 160, width: 390, height: 520 } });
  // 5 m back, where the work shows its 768 px copy: the copy is the right way up and the same colour (a flipped or tinted copy shows here)
  await p.evaluate(([e, a, n]) => window.__spaceView.inspect.place([a[0] + n[0] * 5, e[1], a[2] + n[2] * 5], a), [eye, work.at, [n[0] * k, 0, n[2] * k]]);
  await p.waitForTimeout(6000);
  const far = await p.screenshot({ clip: { x: 0, y: 160, width: 390, height: 520 } });
  if (SHOTS) fs.writeFileSync(path.join(SHOTS, `at-5m-${off ? 'before' : 'after'}.png`), far);
  if (SHOTS) fs.writeFileSync(path.join(SHOTS, `at-1m-${off ? 'before' : 'after'}.png`), shot);
  const px = await p.evaluate(async b64 => {       // the shot's pixels, for the colour comparison
    const im = new Image(); im.src = 'data:image/png;base64,' + b64; await im.decode();
    const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const x = c.getContext('2d'); x.drawImage(im, 0, 0);
    return Array.from(x.getImageData(0, 0, c.width, c.height).data);
  }, shot.toString('base64'));
  if (process.env.DEBUG) { const by = {}; for (const [u, n] of got) { const k = u.split('?')[0].split('.').pop() + (u.includes('/opt/') ? (/relief/.test(u) ? ' relief' : /\.768\.ktx2/.test(u) ? ' work 768' : ' surface') : ''); by[k] = (by[k] || 0) + n; } if (process.env.DEBUG === '2') console.log([...got].filter(([u]) => /jpe?g/.test(u)).sort((a, z) => z[1] - a[1]).slice(0, 12).map(([u, n]) => (n / 1024 | 0) + 'K ' + u.replace(/.*\/studio\/app\//, '')).join('\n')); console.log('download by kind', off ? 'before' : 'after', JSON.stringify(Object.fromEntries(Object.entries(by).map(([k, v]) => [k, +(v / 1048576).toFixed(1)])))); }
  await p.context().close();
  return { start, ritual, startDl, dl: bytes, work: work.title, cm: work.cm, held, px, errs };
}

const lab = (r, g, b) => {
  const f = v => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
  const [R, G, B] = [f(r), f(g), f(b)], X = (0.4124 * R + 0.3576 * G + 0.1805 * B) / 0.95047, Y = 0.2126 * R + 0.7152 * G + 0.0722 * B, Z = (0.0193 * R + 0.1192 * G + 0.9505 * B) / 1.08883;
  const h = t => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  return [116 * h(Y) - 16, 500 * (h(X) - h(Y)), 200 * (h(Y) - h(Z))];
};

(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const before = await visit(b, true), after = await visit(b, false);
  await b.close();
  let de = 0, sh = [0, 0, 0], n = 0;
  for (let i = 0; i < before.px.length; i += 4) {
    const A = lab(before.px[i], before.px[i + 1], before.px[i + 2]), B = lab(after.px[i], after.px[i + 1], after.px[i + 2]);
    de += Math.hypot(A[0] - B[0], A[1] - B[1], A[2] - B[2]); for (let c = 0; c < 3; c++) sh[c] += after.px[i + c] - before.px[i + c]; n++;
  }
  de /= n; sh = sh.map(v => v / n);
  const drop = (a, z) => Math.round(100 * (1 - z / a));
  const res = {
    start: { before: before.start, after: after.start, less: drop(before.start.mb, after.start.mb) + '%' },
    ritual: { before: before.ritual, after: after.ritual, less: drop(before.ritual.mb, after.ritual.mb) + '%' },
    download_mb: { before: +(before.dl / 1048576).toFixed(1), after: +(after.dl / 1048576).toFixed(1), start_before: +(before.startDl / 1048576).toFixed(1), start_after: +(after.startDl / 1048576).toFixed(1) },
    at1m: { work: after.work, cm: after.cm, px_before: before.held, px_after: after.held, px_per_m_before: Math.round(before.held[0] / (before.cm[0] / 100)), px_per_m_after: Math.round(after.held[0] / (after.cm[0] / 100)) },
    colour: { mean_dE: +de.toFixed(2), shift_rgb: sh.map(v => +v.toFixed(2)) },
    errors: [...before.errs, ...after.errs].slice(0, 3),
  };
  console.log(JSON.stringify(res, null, 1));
  const bad = [];
  if (drop(before.start.mb, after.start.mb) < 40) bad.push(`start view only ${res.start.less} less`);
  if (drop(before.ritual.mb, after.ritual.mb) < 40) bad.push(`inside Ritual only ${res.ritual.less} less`);
  if (after.held[0] < before.held[0]) bad.push(`1 m from ${after.work}: ${after.held[0]} px held, was ${before.held[0]}`);
  if (Math.max(...sh.map(Math.abs)) > 1.5 || de > 2.5) bad.push(`colour moved: dE ${de.toFixed(2)}, shift ${sh.map(v => v.toFixed(2))}`);
  if (res.errors.length) bad.push('page error: ' + res.errors[0]);
  console.log(bad.length ? 'FAIL ' + bad.join('; ') : 'PASS phone memory down, sharpness and colour kept');
  process.exitCode = bad.length ? 1 : 0;
})();
