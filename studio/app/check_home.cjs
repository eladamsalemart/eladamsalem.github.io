// Home opens on a phone: the sky has its stars, nothing on the page throws, and every part under the sky is there.
// Run before the app is published ("Open Studio app" workflow), on the copy that is about to go out:
//   node studio/app/check_home.cjs http://localhost:8000/open-studio/
// (A script error in Home once took the room's film and "near you" with it, silently: this is the check for that.)
const { chromium } = require('playwright');
const base = (process.argv[2] || 'http://localhost:8765/studio/app/').replace(/\/?$/, '/');
const shots = process.argv[3]; // a folder for a screenshot when something fails (the App health run keeps it)

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  // someone who has been round the app: two artists, a show, a room in 3D
  await ctx.addInitScript(() => {
    if (sessionStorage.getItem('seeded')) return; sessionStorage.setItem('seeded', '1');
    const now = Date.now(), m = 60000;
    localStorage.setItem('os-recent', JSON.stringify([{ k: 'exhibition', id: 'signal-noise', t: now - 2 * m },
      { k: 'artist', id: 'vincent-van-gogh', t: now - 60 * m }, { k: 'space', id: 'ritual', t: now - 1500 * m }, { k: 'artist', id: 'elad-amsalem', t: now - 3000 * m }]));
  });
  const p = await ctx.newPage(), bad = [];
  // what the browser got for the room's film (to say why, when it doesn't play)
  const filmNet = [];
  p.on('response', r => { if (/data\/spaces\/[^/]+\/preview\./.test(r.url())) filmNet.push([r.status(), r.url()]); });
  p.on('requestfailed', r => { if (/data\/spaces\/[^/]+\/preview\./.test(r.url())) filmNet.push([r.failure() ? r.failure().errorText : 'failed', r.url()]); });
  // to prove the check: HOME_FAKE=<status>[@n|@*]:<regex> answers the n-th matching request (the first by default), or
  // every one (@*), with that status
  if (process.env.HOME_FAKE) { const [spec, re] = process.env.HOME_FAKE.split(/:(.*)/s), [st, nth = '1'] = spec.split('@');
    let seen = 0; await p.route(u => new RegExp(re).test(u.href), r => (++seen === +nth || nth === '*') ? r.fulfill({ status: +st, body: 'fake' }) : r.continue()); }
  p.on('pageerror', e => bad.push(`a script error: ${e.message}`));
  p.on('console', m => { if (m.type() === 'error' && /^home:/.test(m.text())) bad.push(`Home failed: ${m.text().slice(0, 200)}`); });
  await p.goto(`${base}?guest#/`);
  try { await p.waitForFunction(() => document.querySelectorAll('.hs .star').length >= 8, null, { timeout: 30000 }); }
  catch { bad.push('the sky has fewer than 8 stars after 30 s'); }
  try { await p.waitForFunction(() => { const n = document.getElementById('hsNear'); return n && !n.hidden; }, null, { timeout: 20000 }); }
  catch { bad.push('"On now, near you" never appeared (the art map\'s data, or Home stopped before it)'); }
  // the room's film, as the browser receives it: playing, and as sharp as a phone shows it
  await p.evaluate(() => document.querySelector('.hs .tour') && document.querySelector('.hs .tour').scrollIntoView({ block: 'center', behavior: 'instant' }));
  const plays = () => p.waitForFunction(() => { const v = document.querySelector('.hs .tour video'); return v && !v.paused && v.readyState >= 3 && v.videoWidth; }, null, { timeout: 30000 }).then(() => true, () => false);
  const why = () => p.evaluate(() => { const v = document.querySelector('.hs .tour video'); if (!v) return 'no video: Home took it away, every source failed';
    const r = v.getBoundingClientRect(); return `paused ${v.paused}, readyState ${v.readyState}, networkState ${v.networkState}, error ${v.error ? v.error.code : 'none'}, src ${v.currentSrc.split('/').slice(-2).join('/') || 'none'}, at y ${Math.round(r.top)} of ${innerHeight}`; });
  const answers = () => filmNet.map(([st, u]) => `${st} ${u.split('/').slice(-2).join('/')}`).join(', ') || 'no request';
  if (!await plays()) {
    // say why, so the next one can be fixed: the video's own state, what the host answered for it, and how it looked
    bad.push(`the room's film never played on Home (${await why()}; answers: ${answers()})`);
    if (shots) await p.screenshot({ path: require('path').join(shots, 'home-film.png') }).catch(() => {});
  }
  const film = await p.evaluate(() => { const v = document.querySelector('.hs .tour video'); return v ? { w: v.videoWidth, h: v.videoHeight, src: v.currentSrc.split('/').pop() } : null; });
  // the film is the picture from the first moment (its poster is its first frame): faded in over another picture, it
  // showed a ghost of the one in the other
  const fade = await p.evaluate(() => { const v = document.querySelector('.hs .tour video'); if (!v) return null; const cs = getComputedStyle(v); return cs.transitionDuration !== '0s' && cs.transitionProperty.includes('opacity') ? cs.transitionDuration : (v.poster ? null : 'no poster'); });
  if (fade) bad.push(`the room's film fades in over the photo (${fade}): a ghost of one picture in the other`);
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
