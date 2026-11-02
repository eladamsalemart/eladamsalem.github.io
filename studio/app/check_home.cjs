// Home opens on a phone: the sky has its stars, nothing on the page throws, and every part under the sky is there.
// Run before the app is published ("Open Studio app" workflow), on the copy that is about to go out:
//   node studio/app/check_home.cjs http://localhost:8000/open-studio/
// (A script error in Home once took the room's film and "near you" with it, silently: this is the check for that.)
const { chromium } = require('playwright');
const base = (process.argv[2] || 'http://localhost:8765/studio/app/').replace(/\/?$/, '/');

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  // someone who has been round the app: two artists, a show, a room in 3D
  await ctx.addInitScript(() => {
    if (sessionStorage.getItem('seeded')) return; sessionStorage.setItem('seeded', '1');
    const now = Date.now(), m = 60000;
    localStorage.setItem('os-recent', JSON.stringify([{ k: 'exhibition', id: 'signal-noise', t: now - 2 * m },
      { k: 'artist', id: 'lia-moren', t: now - 60 * m }, { k: 'space', id: 'ritual', t: now - 1500 * m }, { k: 'artist', id: 'elad-amsalem', t: now - 3000 * m }]));
  });
  const p = await ctx.newPage(), bad = [];
  p.on('pageerror', e => bad.push(`a script error: ${e.message}`));
  p.on('console', m => { if (m.type() === 'error' && /^home:/.test(m.text())) bad.push(`Home failed: ${m.text().slice(0, 200)}`); });
  await p.goto(`${base}?guest#/`);
  try { await p.waitForFunction(() => document.querySelectorAll('.hs .star').length >= 8, null, { timeout: 30000 }); }
  catch { bad.push('the sky has fewer than 8 stars after 30 s'); }
  try { await p.waitForFunction(() => { const n = document.getElementById('hsNear'); return n && !n.hidden; }, null, { timeout: 20000 }); }
  catch { bad.push('"On now, near you" never appeared (the art map\'s data, or Home stopped before it)'); }
  // the room's film, as the browser receives it: playing, and as sharp as a phone shows it
  await p.evaluate(() => document.querySelector('.hs .tour') && document.querySelector('.hs .tour').scrollIntoView({ block: 'center', behavior: 'instant' }));
  try { await p.waitForFunction(() => { const v = document.querySelector('.hs .tour video'); return v && !v.paused && v.readyState >= 3 && v.videoWidth; }, null, { timeout: 30000 }); }
  catch { bad.push("the room's film never played on Home"); }
  const film = await p.evaluate(() => { const v = document.querySelector('.hs .tour video'); return v ? { w: v.videoWidth, h: v.videoHeight, src: v.currentSrc.split('/').pop() } : null; });
  if (film && film.w && film.w < 1000) bad.push(`the room's film is ${film.w}px wide (${film.src}): soft on a phone`);
  const got = await p.evaluate(() => ({
    stars: document.querySelectorAll('.hs .star').length, sky: !!document.querySelector('.hs canvas.sky-g'),
    near: document.querySelectorAll('.hs .star.r0').length, room: !!document.querySelector('.hs .tour .step'),
    artists: document.querySelectorAll('.hs .ppl li').length, wide: document.documentElement.scrollWidth,
  }));
  if (!got.sky) bad.push('the sky has no canvas for its ties');
  if (got.near < 3) bad.push(`only ${got.near} near stars for someone with four recent visits`);
  if (!got.room) bad.push('no room to walk into on Home');
  if (!got.artists) bad.push('no "Your artists"');
  if (got.wide > 391) bad.push(`the page is ${got.wide}px wide on a 390px phone`);
  await b.close();
  console.log(bad.length ? bad.map(x => 'FAIL ' + x).join('\n') : `ok   Home: ${got.stars} stars (${got.near} near), the room (${film && film.w}x${film && film.h} ${film && film.src}), ${got.artists} artists, near you`);
  process.exit(bad.length ? 1 : 0);
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
