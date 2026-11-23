// The floor of an exhibition's original room inside the museum (Ritual) reflects as in its own tour. Proved by its mechanism,
// not by one picture: inside Ritual the room's mirror is tinted red, and the floor's pixels must turn red. A mirror that draws
// nothing, sits in the wrong place or is hidden fails here (24.11: a reflection that drew nothing passed on a screenshot).
// usage: node studio/app/tests/pad_mirror.cjs   BASE=<the app's url>   SHOTS=<dir> keeps the two pictures
const { chromium } = require('playwright');
const BASE = process.env.BASE || 'http://localhost:8199/studio/app/', SHOTS = process.env.SHOTS || '';
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true })).newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  // the museum's plan with Ritual in a pavilion at a known place (door at 79,60, facing +x)
  await p.route(/museum_plan/, async r => { let pl = null; try { const j = await (await r.fetch()).json(); pl = j[0] && j[0].plan; } catch {} if (!pl) pl = { spaces: [] };
    const sp = (pl.spaces || []).filter(x => x.id !== 'ritual'); sp.push({ id: 'ritual', type: 'house', slot: 57, tour: 'ritual', door: [79, 60], dir: 0 }); r.fulfill({ json: [{ plan: { ...pl, spaces: sp } }] }); });
  let fail = '';
  try {
    await p.goto(BASE + '?guest#/museum');
    await p.waitForFunction(() => window.__spaceView && document.querySelector('canvas'), null, { timeout: 300000, polling: 300 });
    await p.waitForTimeout(6000);
    // Ritual's local (x, y, z) -> the museum (its door wall at x = 79.25, its arch's middle at z = 60)
    const W = ([x, y, z]) => [79.25 + (3.9665 - z), y, 60 + (x - 2.81)];
    for (const [a, l] of [[[2.81, 1.6, 4.4], [2.81, 1.6, 2.0]], [[2.0, 1.6, 2.0], [-8, 1.6, 2.0]], [[-6, 1.6, 2.0], [3, 1.7, 1.6]]]) {
      await p.evaluate(([a, l]) => window.__spaceView.inspect.place(a, l), [W(a), W(l)]); await p.waitForTimeout(2500);
    }
    const pad = await p.evaluate(() => { const I = window.__spaceView.inspect, q = (I.pads ? I.pads() : []).find(x => x.on); return q ? { name: q.name, fade: q.fade() } : null; });
    if (!pad) throw new Error('no floor mirror is on inside Ritual');
    // the floor in front of the visitor, above the walk control: its mean colour, from the picture the visitor sees
    const floor = async name => { const png = await p.screenshot({ path: SHOTS ? `${SHOTS}/${name}.png` : undefined });
      return p.evaluate(async b64 => { const im = new Image(); im.src = 'data:image/png;base64,' + b64; await im.decode(); const c = document.createElement('canvas'); c.width = im.width; c.height = im.height;
        const x = c.getContext('2d'); x.drawImage(im, 0, 0); const d = x.getImageData(150, 560, 230, 130).data; let r = 0, g = 0, n = 0; for (let i = 0; i < d.length; i += 4) { r += d[i]; g += d[i + 1]; n++; } return { r: r / n, g: g / n }; }, png.toString('base64')); };
    const before = await floor('mirror-plain');
    await p.evaluate(() => { const I = window.__spaceView.inspect; I.pads().find(x => x.on).tint([8, 0, 0]); const w = I.where(); I.place([w.pos[0] + 0.01, w.pos[1], w.pos[2]], w.look); });
    await p.waitForTimeout(2500);
    const after = await floor('mirror-red');
    const gain = (after.r - after.g) - (before.r - before.g);
    console.log('floor mirror', pad.name, 'fade', pad.fade, 'red-green before', (before.r - before.g).toFixed(1), 'after', (after.r - after.g).toFixed(1), 'gain', gain.toFixed(1));
    if (!(gain > 8)) fail = `the floor did not take the mirror's tint (gain ${gain.toFixed(1)}): the reflection does not reach the floor`;
  } catch (e) { fail = e.message; }
  if (errs.length) fail = fail || 'page error: ' + errs[0];
  console.log(fail ? 'FAIL ' + fail : 'PASS the floor of Ritual shows its reflection');
  process.exitCode = fail ? 1 : 0; await b.close();
})();
