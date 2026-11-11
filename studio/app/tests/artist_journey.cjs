// The artist's journey on an iPhone, as a brand new artist (the app's own preview: nothing is saved anywhere):
// make a page, add several photos at once, fix one work, delete one and take it back, choose a space of every kind
// and size, give the exhibition a title, and reach the hang. Fails on any script error, on a tap target under 44 px,
// and on a step that takes longer than its budget.
//   node studio/app/tests/artist_journey.cjs http://localhost:8095/studio/app/ [folder for screenshots]
// JOURNEY_KINDS="white-cube,concrete" tries the picker with these kinds before they are switched on;
// JOURNEY_NO_3D=1 stops before the room is built; JOURNEY_SLOW=4 slows the processor four times.
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const base = (process.argv[2] || 'http://localhost:8095/studio/app/').replace(/\/?$/, '/');
const shots = process.argv[3];
const KINDS = process.env.JOURNEY_KINDS, SLOW = +process.env.JOURNEY_SLOW || 0;

(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1' });
  await ctx.addInitScript(() => {
    if (!sessionStorage.getItem('os-preview')) sessionStorage.setItem('os-preview', JSON.stringify({ user: { id: 'journey-test', role: 'artist', name: 'Maya Cohen', email: 'maya@example.com' } }));
  });
  const p = await ctx.newPage(), bad = [], times = {};
  if (SLOW) { const cdp = await ctx.newCDPSession(p); await cdp.send('Emulation.setCPUThrottlingRate', { rate: SLOW }); }
  if (KINDS) await p.route(/space\/synth\.js/, async r => { const res = await r.fetch(); let t = await res.text();
    t = t.replace(/export const ACTIVE_KINDS = \[[^\]]*\]/, `export const ACTIVE_KINDS = ${JSON.stringify(KINDS.split(','))}`); r.fulfill({ response: res, body: t }); });
  p.on('pageerror', e => bad.push(`script error: ${e.message}`));
  p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|supabase|net::ERR/i.test(m.text())) bad.push(`console error: ${m.text().slice(0, 200)}`); });
  let n = 0;
  const shot = async name => { if (!shots) return; fs.mkdirSync(shots, { recursive: true }); await p.screenshot({ path: path.join(shots, `${String(++n).padStart(2, '0')}-${name}.jpg`), type: 'jpeg', quality: 70, scale: 'css' }); };
  const step = async (name, budget, fn) => { const t = Date.now(); try { await fn(); } catch (e) { bad.push(`${name}: ${e.message.split('\n')[0]}`); } times[name] = Date.now() - t; if (times[name] > budget * (SLOW || 1)) bad.push(`${name}: took ${times[name]} ms (budget ${budget})`); await shot(name); };
  // every visible control on the screen is at least 44 px to the finger (its own box or its ::after area)
  const targets = async where => {
    const small = await p.evaluate(() => [...document.querySelectorAll('.sh button, .sh input:not([type=hidden]):not([type=radio]), .sh label.kd-c, .st button, .st a.btn, .st label.btn, .st input:not([type=hidden]):not([type=radio]):not([type=file]), .st-nav a, .ed-fab, .wk, .wk-grip')]
      .filter(e => e.offsetParent && !e.disabled).map(e => { const r = e.getBoundingClientRect(), a = getComputedStyle(e, '::after'), on = a.content !== 'none', aw = on ? parseFloat(a.width) || 0 : 0, ah = on ? parseFloat(a.height) || 0 : 0;
        return { t: (e.getAttribute('aria-label') || e.textContent || e.name || e.className).trim().slice(0, 30), w: Math.max(r.width, aw), h: Math.max(r.height, ah) }; })
      .filter(x => x.w < 43.5 || x.h < 43.5).map(x => `${x.t} ${Math.round(x.w)}x${Math.round(x.h)}`));
    if (small.length) bad.push(`${where}: small targets: ${[...new Set(small)].slice(0, 6).join(' | ')}`);
  };
  // three photos made here: two paintings and a tall one
  const photo = async (w, h, hue) => Buffer.from((await p.evaluate(([w, h, hue]) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d');
    const g = x.createLinearGradient(0, 0, w, h); g.addColorStop(0, `hsl(${hue} 60% 62%)`); g.addColorStop(1, `hsl(${hue + 70} 55% 30%)`); x.fillStyle = g; x.fillRect(0, 0, w, h);
    for (let i = 0; i < 60; i++) { x.fillStyle = `hsl(${hue + i * 5} 70% ${30 + i % 50}%)`; x.fillRect((i * 97) % w, (i * 61) % h, w / 9, h / 14); } return c.toDataURL('image/jpeg', 0.9).split(',')[1]; }, [w, h, hue])), 'base64');

  await step('open', 6000, async () => { await p.goto(`${base}?guest#/studio`, { waitUntil: 'load' }); await p.waitForSelector('#setup', { timeout: 15000 }); });
  await step('make-page', 4000, async () => { await p.fill('#setup [name=name]', 'Maya Cohen'); await p.fill('#setup [name=discipline]', 'Painter'); await p.fill('#setup [name=city]', 'Haifa'); await p.tap('#setup button[type=submit]'); await p.waitForSelector('#imFiles', { state: 'attached', timeout: 8000 }); });
  await targets('bring work in');
  const files = [{ name: 'Blue field.jpg', mimeType: 'image/jpeg', buffer: await photo(3000, 2200, 210) }, { name: 'IMG_4821.jpg', mimeType: 'image/jpeg', buffer: await photo(2400, 3200, 20) }, { name: 'red-room.jpg', mimeType: 'image/jpeg', buffer: await photo(2800, 2800, 350) }];
  await step('choose-3-photos', 5000, async () => { await p.setInputFiles('#imFiles', files); await p.waitForSelector('#adForm', { timeout: 8000 }); });
  await step('photos-ready', 12000, async () => { await p.waitForFunction(() => [...document.querySelectorAll('#adForm .ad-card img')].every(i => !i.hidden && i.naturalWidth), null, { timeout: 12000 * (SLOW || 1) }); });
  await targets('add works sheet');
  await step('add-to-page', 4000, async () => { await p.tap('#adGo'); await p.waitForFunction(() => document.querySelectorAll('#works .wk').length === 3 && !document.querySelector('.sh'), null, { timeout: 8000 }); });
  await targets('my page');
  await step('open-edit', 1500, async () => { await p.tap('#works .wk .wk-t'); await p.waitForSelector('#wkForm', { timeout: 4000 }); });
  await targets('edit sheet');
  await step('save-edit', 2000, async () => { await p.fill('#wkForm [name=title]', 'Morning, Haifa'); await p.fill('#wkForm [name=width]', '80'); await p.fill('#wkForm [name=height]', '60'); await p.tap('.sh [data-save]');
    await p.waitForFunction(() => !document.querySelector('.sh') && /Morning, Haifa/.test(document.querySelector('#works').textContent) && /60 × 80/.test(document.querySelector('#works').textContent), null, { timeout: 4000 }); });
  await step('delete-undo', 4000, async () => { await p.tap('#works .wk:nth-of-type(2) .wk-t'); await p.waitForSelector('#wkForm'); await p.tap('.sh [data-del]');
    await p.waitForFunction(() => document.querySelectorAll('#works .wk').length === 2); await p.tap('.ed-toast button'); await p.waitForFunction(() => document.querySelectorAll('#works .wk').length === 3); });

  // On View: every kind offered, every size of it, then a title, and the hang wakes
  await step('onview-open', 5000, async () => { await p.evaluate(() => { location.hash = '#/studio/onview'; }); await p.waitForSelector('#vxForm .ov-kind', { timeout: 10000 }); });
  await targets('on view');
  const kinds = await p.$$eval('#vxForm input[name=kind]', l => l.map(i => i.value));
  if (KINDS && kinds.join() !== KINDS) bad.push(`the picker offers ${kinds.join()} and not ${KINDS}`);
  if (kinds.length < 2) bad.push(`the picker offers ${kinds.length} kinds`);
  for (const k of kinds) await step(`choose-${k}`, 2500, async () => {
    await p.tap(`#vxForm .ov-kind:has(input[value="${k}"])`);
    await p.waitForFunction(k => { const f = document.querySelector('#vxForm'), r = f && f.elements.room.value; return r && r.startsWith(k) && f.querySelectorAll('[data-size]').length >= 1; }, k, { timeout: 4000 });
    for (const s of await p.$$eval('#vxForm [data-size]', l => l.map(x => x.dataset.size))) { await p.tap(`#vxForm [data-size="${s}"]`); await p.waitForFunction(s => document.querySelector('#vxForm').elements.room.value === s, s, { timeout: 2000 }); }
  });
  await targets('on view, a space chosen');
  await step('title', 2000, async () => { await p.fill('#vxForm [name=title]', 'First light'); await p.waitForFunction(() => { const h = document.querySelector('#vxHang'); return h && !h.disabled; }, null, { timeout: 3000 }); });
  if (!process.env.JOURNEY_NO_3D) await step('hang-opens', 45000, async () => { await p.tap('#vxHang'); await p.waitForFunction(() => /Building/.test(document.querySelector('#vxHang').textContent) || document.querySelector('canvas'), null, { timeout: 2000 }); await p.waitForSelector('canvas', { timeout: 45000 }); await p.waitForTimeout(1500); });

  await b.close();
  console.log(JSON.stringify({ ok: !bad.length, kinds, times }));
  if (bad.length) { console.error(bad.map(x => ' - ' + x).join('\n')); process.exit(1); }
})().catch(e => { console.error(e); process.exit(1); });
