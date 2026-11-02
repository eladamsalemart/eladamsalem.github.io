// The app's health, as a phone sees it: every kind of page opened as an iPhone would, and looked at.
//   node studio/app/health/health.cjs <app url> <out dir>        e.g. https://eladamsalem.com/open-studio/ /tmp/health
// Writes <out>/report.json, <out>/report.md and a screenshot of each page; exits 1 when something is broken.
// HEALTH_FAKE=503:<regex> (or 404:...) answers the first matching request falsely, to prove a check catches it.
// A FAIL is a bug a visitor meets (a script error, a request that fails, a broken image, a page wider than the phone,
// an empty or "doesn't exist" page, the 3D room not opening, Home too slow to move). A NOTE is worth improving.
// Runs after every publish and every few days ("App health" workflow); the scheduled Claude session reads it.
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');

const base = (process.argv[2] || 'https://eladamsalem.com/open-studio/').replace(/\/?$/, '/'), out = process.argv[3] || 'health-out';
fs.mkdirSync(out, { recursive: true });
const LOCAL = /^http:\/\/(localhost|127\.)/.test(base);
const PAGES = [
  ['Home', '#/'], ['Artists', '#/artists'], ['Shows', '#/shows'], ['Map', '#/map'], ['Search', '#/search'],
  ['Artist (demo)', '#/artist/lia-moren'], ['Artist (Elad)', '#/artist/elad-amsalem'], ['Show on now', '#/exhibition/low-tide-haifa'],
  ['Show with a 3D room', '#/exhibition/ritual'], ['Work', '#/work/together-2026'], ['Works', '#/works'],
  ['A place on the map', '#/map/place/tel-aviv-museum-of-art'], ['About', '#/about'],
];
const report = { url: base, at: new Date().toISOString(), pages: [], fails: [], notes: [] };
const fail = (page, what) => report.fails.push({ page, what });
const note = (page, what) => report.notes.push({ page, what });
// requests that are not bugs: a video asked for in pieces and dropped, and map tiles the map stops asking for when its
// view moves (both ERR_ABORTED); tiles beyond the map's area answer 404 by design (OpenFreeMap)
const benign = (url, err) => /ERR_ABORTED/.test(err || '') && (/\.(mp4|webm)(\?|$)/.test(url) || /tiles\.openfreemap\.org/.test(url));

(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const phone = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
    geolocation: { latitude: 32.0590, longitude: 34.7700 }, permissions: ['geolocation'], locale: 'en-GB',
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1' };

  for (const [name, hash] of PAGES) {
    const ctx = await b.newContext(phone), p = await ctx.newPage(), errs = [], bad = [];
    // (the "Get Open Studio" install card is closed, as a visitor does once: it would sit over the page's lower controls)
    await ctx.addInitScript(() => { try { localStorage.setItem('os-install-dismissed', '1'); } catch {} });
    // to prove the check: HEALTH_FAKE=<status>:<regex> answers the first matching request with that status (the
    // browser's only; the retry asks the real site)
    if (process.env.HEALTH_FAKE) { const [st, re] = process.env.HEALTH_FAKE.split(/:(.*)/s); let once = false;
      await ctx.route(new RegExp(re), r => { if (once) return r.continue(); once = true; r.fulfill({ status: +st, body: 'fake' }); }); }
    p.on('pageerror', e => errs.push(e.message));
    p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push(m.text().slice(0, 300)); });
    p.on('requestfailed', r => { const f = r.failure() && r.failure().errorText; if (!benign(r.url(), f)) bad.push([f, r.url()]); });
    // (data/thumbs.json is written when the app is published: a run on the code itself, before publishing, has none)
    // a server error (5xx) is asked again a few seconds later: one that answers then is the host's hiccup (a note), one
    // that doesn't is broken. Anything else that fails (404 and the like) is broken at once.
    const retry = [];
    p.on('response', r => { if (r.status() >= 400 && !/tiles\.openfreemap\.org/.test(r.url()) && !(LOCAL && /data\/thumbs\.json$/.test(r.url()))) (r.status() >= 500 ? retry : bad).push([r.status(), r.url()]); });
    const t0 = Date.now();
    await p.goto(`${base}?guest${hash}`, { waitUntil: 'load', timeout: 60000 }).catch(e => errs.push('did not load: ' + e.message));
    await p.waitForFunction(() => { const a = document.getElementById('app'); return a && a.innerText.trim().length > 30 && !/^Loading/.test(a.innerText.trim()); }, null, { timeout: 30000 }).catch(() => {});
    const ready = Date.now() - t0;
    await p.waitForTimeout(name === 'Map' || name.startsWith('A place') ? 9000 : 3000);
    // scroll through it, as a visitor would, so lazy images load (and can be found broken)
    await p.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 600) { scrollTo(0, y); await new Promise(r => setTimeout(r, 120)); } scrollTo(0, 0); });
    await p.waitForTimeout(1500);
    const look = await p.evaluate(() => {
      const app = document.getElementById('app'), text = app ? app.innerText.trim() : '';
      const broken = [...document.images].filter(i => i.complete && i.currentSrc && i.naturalWidth === 0).map(i => i.currentSrc.slice(-80));
      const small = 0;
      const noAlt = [...document.images].filter(i => !i.hasAttribute('alt')).length;
      return { text: text.length, notFound: /doesn't exist|couldn't be loaded/i.test(text), wide: document.documentElement.scrollWidth, broken, small, noAlt,
        title: document.title, h: !!document.querySelector('h1,h2') };
    });
    // tap targets, felt as a finger feels them: a touch anywhere in the 44x44 square round a control's centre (Apple's
    // size; WCAG's floor is 24) must land on that control. Measured where it is, so invisible margins count and a
    // neighbour on top doesn't. A link inside a sentence is exempt (WCAG 2.5.8's inline exception). Shows' details
    // are opened first, so what is inside them is measured as a visitor meets it.
    const tiny = await p.evaluate(async () => {
      document.querySelectorAll('details').forEach(d => { d.open = true; });
      await new Promise(r => setTimeout(r, 300));
      const R = 21, out = [];
      const inline = e => getComputedStyle(e).display === 'inline' && e.parentElement && (e.parentElement.innerText || '').length > (e.innerText || '').length + 12;
      for (const e of document.querySelectorAll('a[href],button,summary,[role=button]')) {
        if (!e.checkVisibility || !e.checkVisibility({ visibilityProperty: true, opacityProperty: true })) continue;
        if (e.closest('.sky-stars,.sv,.maplibregl-canvas-container,[aria-hidden=true]') || inline(e)) continue;
        let r = e.getBoundingClientRect(); if (!r.width || !r.height) continue;
        e.scrollIntoView({ block: 'center', inline: 'center', behavior: 'instant' }); r = e.getBoundingClientRect();
        if (r.left < 0 || r.right > innerWidth) continue;             // (wider than the screen in a sideways row: reached by scrolling)
        const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
        const miss = [[cx - R, cy], [cx + R, cy], [cx, cy - R], [cx, cy + R]].filter(([x, y]) => { const h = document.elementFromPoint(x, y); return !h || (h !== e && !e.contains(h)); });
        if (miss.length) out.push(`"${(e.innerText || e.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ').slice(0, 30)}" ${Math.round(r.width)}x${Math.round(r.height)} <${e.tagName.toLowerCase()}${e.className && typeof e.className === 'string' ? '.' + e.className.trim().split(/\s+/).join('.') : ''} in .${(e.parentElement.className || e.parentElement.tagName).toString().split(' ')[0]}>`);
      }
      scrollTo(0, 0);
      return [...new Set(out)];
    });
    await p.screenshot({ path: path.join(out, `${name.replace(/\W+/g, '-').toLowerCase()}.png`) });
    for (const [st, url] of retry) {
      await new Promise(r => setTimeout(r, 4000));
      const again = await fetch(url, { headers: { Range: 'bytes=0-1023' } }).then(r => r.status).catch(() => 0);
      if (again >= 200 && again < 400) note(name, `the host answered ${st} once for ${url.slice(-60)}, then ${again}`);
      else bad.push([`${st}, again ${again || 'no answer'}`, url]);
    }
    const row = { name, hash, ready_ms: ready, errors: errs, requests: bad, tiny, ...look };
    report.pages.push(row);
    if (errs.length) fail(name, `script errors: ${errs.slice(0, 3).join(' | ')}`);
    if (bad.length) fail(name, `${bad.length} failed requests: ${bad.slice(0, 3).map(([w, u]) => `${w} ${u.slice(0, 160)}`).join(' | ')}`);
    if (look.broken.length) fail(name, `${look.broken.length} broken images: ${look.broken.slice(0, 3).join(', ')}`);
    if (look.wide > 391) fail(name, `the page is ${look.wide}px wide on a 390px phone`);
    if (look.text < 30 || look.notFound) fail(name, look.notFound ? 'the page says it does not exist or could not load' : 'the page is empty');
    if (!look.h) note(name, 'no heading (h1/h2) for screen readers');
    if (ready > 5000) note(name, `took ${(ready / 1000).toFixed(1)} s to show its content`);
    if (tiny.length) fail(name, `${tiny.length} controls a finger can miss (under 44x44 to touch): ${tiny.slice(0, 6).join(', ')}`);
    if (look.noAlt) note(name, `${look.noAlt} images without alt text`);
    await ctx.close();
  }

  // Home moving, at a phone's speed (a 4x slower processor): the sky at rest, dragged, and at the room's film
  {
    const ctx = await b.newContext(phone), p = await ctx.newPage(), cdp = await ctx.newCDPSession(p);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    await p.goto(`${base}?guest#/`); await p.waitForFunction(() => document.querySelector('.hs .star'), null, { timeout: 60000 }).catch(() => {});
    await p.waitForTimeout(6000);
    const frames = () => p.evaluate(() => new Promise(res => { const ts = []; let n = 0; const f = t => { ts.push(t); if (++n < 90) requestAnimationFrame(f); else res(ts); }; requestAnimationFrame(f); }));
    const med = f => { const d = f.slice(1).map((t, i) => t - f[i]).sort((a, c) => a - c); return Math.round(d[d.length >> 1]); };
    const rest = med(await frames());
    const dragging = frames();
    await p.evaluate(async () => { const el = document.querySelector('#hsSky'); if (!el) return; const ev = (type, x) => el.dispatchEvent(new PointerEvent(type, { pointerId: 1, clientX: x, clientY: 400, bubbles: true, pointerType: 'touch' }));
      ev('pointerdown', 300); for (let x = 300; x > 80; x -= 6) { ev('pointermove', x); await new Promise(r => setTimeout(r, 16)); } ev('pointerup', 80); });
    const drag = med(await dragging);
    report.home_frame_ms = { rest, drag };
    if (rest > 34 || drag > 34) fail('Home', `slow on a phone: a frame every ${rest} ms at rest, ${drag} ms while dragging (smooth is 17)`);
    await ctx.close();
  }

  // the 3D room opens, draws, and its works are there
  {
    const ctx = await b.newContext(phone), p = await ctx.newPage(), errs = [];
    p.on('pageerror', e => errs.push(e.message));
    await p.goto(`${base}?guest#/exhibition/ritual/space`);
    const ok = await p.waitForFunction(() => window.__spaceView && window.__spaceView.inspect, null, { timeout: 90000 }).then(() => true).catch(() => false);
    if (!ok) fail('3D room', 'the room did not open in 90 s');
    else {
      await p.waitForTimeout(6000);
      const w = await p.evaluate(() => window.__spaceView.inspect.works());
      const shown = w.filter(x => x.visible && x.inScene && x.image[0] > 0).length;
      report.room = { works: w.length, shown };
      if (shown < w.length) fail('3D room', `${w.length - shown} of ${w.length} works not shown`);
      await p.screenshot({ path: path.join(out, '3d-room.png') });
    }
    if (errs.length) fail('3D room', `script errors: ${errs.slice(0, 3).join(' | ')}`);
    await ctx.close();
  }

  // the way in: a new visitor (no account) lands on the welcome, with a way to sign in
  {
    const ctx = await b.newContext(phone), p = await ctx.newPage(), errs = [];
    p.on('pageerror', e => errs.push(e.message));
    await p.goto(base); await p.waitForTimeout(4000);
    const w = await p.evaluate(() => ({ hash: location.hash, email: !!document.querySelector('.wl-email'), google: !!document.querySelector('.wl-google') }));
    report.welcome = w;
    if (!/welcome/.test(w.hash) || !w.email) fail('Welcome', `a new visitor does not land on the way in (${w.hash}, email button ${w.email})`);
    if (!w.google) note('Welcome', 'no "Continue with Google" button');
    if (errs.length) fail('Welcome', `script errors: ${errs.slice(0, 3).join(' | ')}`);
    await p.screenshot({ path: path.join(out, 'welcome.png') });
    await ctx.close();
  }
  await b.close();

  const md = [`# App health — ${report.at.slice(0, 16).replace('T', ' ')} UTC`, `${base}`, '',
    report.fails.length ? `## ${report.fails.length} broken` : '## Nothing broken', ...report.fails.map(f => `- **${f.page}**: ${f.what}`), '',
    `## ${report.notes.length} to improve`, ...report.notes.map(f => `- ${f.page}: ${f.what}`), '',
    `Home on a phone: a frame every ${report.home_frame_ms ? report.home_frame_ms.rest : '?'} ms at rest, ${report.home_frame_ms ? report.home_frame_ms.drag : '?'} ms dragging.`,
    `Pages: ${report.pages.map(p => `${p.name} ${(p.ready_ms / 1000).toFixed(1)}s`).join(', ')}`].join('\n');
  fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 1));
  fs.writeFileSync(path.join(out, 'report.md'), md + '\n');
  console.log(md);
  process.exit(report.fails.length ? 1 : 0);
})().catch(e => { console.error('FAIL the health check itself:', e.message); process.exit(2); });
