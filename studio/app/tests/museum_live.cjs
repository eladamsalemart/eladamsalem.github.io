// A publish on the Desk shows in the app on the next opening of Home or the museum, with no reload.
// The owner's content is never touched: the database's answer for museum_slots is played by this test (what the Desk would
// have written), and the app is watched as an iPhone. With `live` as the third argument it only READS the real site and the
// real database, and checks that Home there says what the database says now.
//   node studio/app/tests/museum_live.cjs [http://localhost:8198/studio/app/] [folder for shots] [live]
const { chromium } = require('playwright');
const base = (process.argv[2] || 'http://localhost:8198/studio/app/').replace(/\/?$/, '/');
const shots = process.argv[3], LIVE = process.argv[4] === 'live';
const DB = 'https://hlpzqeosdavfuzjgpwhy.supabase.co/rest/v1/', KEY = 'sb_publishable_VKboaeE8UE3iwVKhyr4FSA_faDO17fu';
const NUM = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight'];

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const p = await ctx.newPage(), bad = [], ok = [];
  const say = (cond, good, wrong) => (cond ? ok : bad).push(cond ? good : wrong);
  p.on('pageerror', e => bad.push(`a script error: ${e.message}`));
  const section = () => p.evaluate(() => { const s = document.getElementById('hsMuseum'); return !s || s.hidden ? null : { side: s.querySelector('.side').textContent, t: s.querySelector('.mu-t').textContent, doors: s.querySelectorAll('.mu-door img').length, href: s.querySelector('a.mu-in').getAttribute('href') }; });
  const waitSide = (txt, ms = 15000) => p.waitForFunction(t => { const s = document.getElementById('hsMuseum'); return t === null ? !!s && s.hidden : !!s && !s.hidden && s.querySelector('.side').textContent.includes(t); }, txt, { timeout: ms, polling: 150 }).then(() => true, () => false);
  const shot = async name => { if (shots) { await p.evaluate(() => document.getElementById('hsMuseum').scrollIntoView({ block: 'center' })); await p.waitForTimeout(700); await p.screenshot({ path: `${shots}/${name}.png` }); } };

  if (LIVE) {
    // read-only: the database's answer now, and the site's Home beside it
    const res = await fetch(DB + 'museum_slots?select=slot,app_slug,content&live=eq.true&order=slot', { headers: { apikey: KEY } });
    const slots = await res.json(), cc = res.headers.get('cache-control') || '';
    say(!/max-age=[1-9]|immutable/.test(cc), `the database's answer may not be kept by a browser (cache-control: "${cc || 'none'}")`, `the database's answer can be cached: ${cc}`);
    const asked = []; p.on('request', r => { if (r.url().includes('/museum_slots')) asked.push(r.serviceWorker() ? 'sw' : 'page'); });
    await p.goto(`${base}?guest#/`);
    const n = slots.length;
    if (n) { say(await waitSide(NUM[n] + ' exhibition'), `live Home says "${NUM[n]} exhibition(s) on now", as the database does (${n} live slots)`, `live Home does not say ${NUM[n]}: ${JSON.stringify(await section())}`); await shot('home-museum-live'); }
    else say(await waitSide(null), 'no slot is live and Home has no museum section', 'no slot is live but Home shows the museum');
    await p.waitForTimeout(3000);                                   // the service worker takes over; open Home again through it
    await p.reload(); if (n) await waitSide(NUM[n] + ' exhibition');
    say(asked.length >= 2, `Home asked the database on each opening (${asked.length} times in two openings)`, `Home asked the database ${asked.length} times in two openings`);
  } else {
    // the Desk's writes, played: A (two rooms), then a third is published, then one is edited, then all are taken down
    const work = (i, t) => ({ id: 'w' + i, title: t, artist: 'Test', image: `${base}data/demo/works/${i}.jpg`, thumb: `${base}icons/icon-192.png`, width: 80, height: 100, s: 2 + i, y: 1.5 });
    const own = (slot, title, k) => ({ slot, app_slug: null, colour: '#1c67e3', published_at: new Date().toISOString(), content: { title, curator: 'The Desk', text: '', works: [work(k, title + ' I'), work(k + 1, title + ' II'), work(k + 2, title + ' III')], plinths: [], objects: {} } });
    const A = [{ slot: 1, app_slug: 'celebration-virtual', colour: null, content: null }, own(2, 'Published From The Desk', 1)];
    let now = A, asks = 0, cacheModes = [];
    await p.route(u => u.href.includes('/rest/v1/museum_slots'), r => { asks++; r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(now) }); });
    await p.route(u => u.href.includes('/rest/v1/museum_colours'), r => r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: '[]' }));
    await p.addInitScript(() => { const f = window.fetch; window.__modes = []; window.fetch = function (u, o) { if (String(u).includes('museum_slots')) window.__modes.push((o && o.cache) || 'default'); return f.apply(this, arguments); }; });
    await p.goto(`${base}?guest#/`);
    say(await waitSide('two exhibitions'), 'Home shows the museum as published: two exhibitions', `Home after the first publish: ${JSON.stringify(await section())}`);
    const s1 = await section(); say(s1 && s1.href === '#/museum' && s1.doors === 2, 'one way in (#/museum), a picture for each exhibition', `the way in or the pictures are wrong: ${JSON.stringify(s1)}`);
    await shot('home-museum-two');
    // 1. a third room is published while the app is open; the visitor goes to Shows and comes back Home (no reload)
    now = [...A, own(3, 'A Third Room', 4)];
    await p.evaluate(() => { location.hash = '#/shows'; }); await p.waitForTimeout(400);
    await p.evaluate(() => { location.hash = '#/'; });
    say(await waitSide('three exhibitions'), 'a new publish shows on the next opening of Home, with no reload', `after a publish, Home says: ${JSON.stringify(await section())}`);
    // 2. the live exhibition is renamed and republished while the app sits in the background; the visitor comes back to it
    now = [own(2, 'Renamed On The Desk', 1)];
    await p.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
    const renamed = await p.waitForFunction(() => { const s = document.getElementById('hsMuseum'); return s && s.textContent.includes('Renamed On The Desk'); }, null, { timeout: 15000, polling: 150 }).then(() => true, () => false);
    say(renamed, 'an edit published on the Desk shows when the app is come back to', `after an edit, Home says: ${JSON.stringify(await section())}`);
    await shot('home-museum-one');
    // 3. the museum itself: opening it asks again, and builds the rooms of that answer
    now = [...A, own(3, 'A Third Room', 4)];
    const before = asks;
    await p.evaluate(() => { location.hash = '#/museum'; });
    const built = await p.waitForFunction(() => window.__spaceView && document.querySelector('canvas'), null, { timeout: 180000, polling: 150 }).then(() => true, () => false);
    say(asks > before, 'opening the museum asks the database again', 'opening the museum did not ask the database');
    say(built, 'the museum opens with the published rooms', 'the museum did not open');
    if (built && shots) { await p.waitForTimeout(2500); await p.screenshot({ path: `${shots}/museum-open.png` }); }
    // 4. everything is taken down: Home has no museum section
    now = [];
    await p.goto(`${base}?guest#/shows`); await p.evaluate(() => { location.hash = '#/'; });
    await p.waitForTimeout(300);
    say(await waitSide(null), 'with nothing live, Home has no museum section', `nothing is live but Home shows: ${JSON.stringify(await section())}`);
    // 5. no signal: the museum as last published is kept (here: the three rooms), not lost
    now = [...A, own(3, 'A Third Room', 4)];
    await p.evaluate(() => { location.hash = '#/shows'; }); await p.evaluate(() => { location.hash = '#/'; }); await waitSide('three exhibitions');
    await p.unroute(u => u.href.includes('/rest/v1/museum_slots')).catch(() => {});
    await p.route(u => u.href.includes('/rest/v1/museum_slots'), r => r.abort());
    await p.evaluate(() => { location.hash = '#/shows'; }); await p.evaluate(() => { location.hash = '#/'; });
    await p.waitForTimeout(1500);
    say(await waitSide('three exhibitions', 4000), 'without a connection Home keeps the museum as last published', `without a connection: ${JSON.stringify(await section())}`);
    const modes = await p.evaluate(() => window.__modes);
    say(modes.length && modes.every(m => m === 'no-store'), 'every question to the database goes past the browser\'s cache (no-store)', `cache modes: ${modes.join(',')}`);
    const wide = await p.evaluate(() => document.documentElement.scrollWidth);
    say(wide <= 390, 'Home is no wider than the phone', `Home is ${wide}px wide`);
  }
  await b.close();
  console.log(ok.map(x => '  ok  ' + x).join('\n'));
  if (bad.length) { console.log(bad.map(x => '  BAD ' + x).join('\n')); process.exit(1); }
  console.log(`museum_live: all ${ok.length} checks pass (${LIVE ? 'read-only, live site' : 'the Desk played'})`);
})();
