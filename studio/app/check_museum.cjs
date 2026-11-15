// The museum the owner publishes on the Desk must be the museum the app shows.
// Reads the live slots straight from the database (as any visitor's phone does), opens Home as an iPhone and checks that the
// museum there counts the same exhibitions, then walks into #/museum and checks the street is built, without a script error.
//   node studio/app/check_museum.cjs [base url] [out dir]
//   MUSEUM_FAKE=1 answers the app with a slot the app cannot show (an unknown show): the check must fail (proof it sees a break).
const { chromium, devices } = require('playwright');
const fs = require('fs'), path = require('path');
const base = process.argv[2] || 'http://localhost:8765/studio/app/', out = process.argv[3] || '/tmp/museum';
fs.mkdirSync(out, { recursive: true });
const app = fs.readFileSync(path.join(__dirname, 'app.js'), 'utf8');
const DB = (app.match(/const DB = '([^']+)'/) || [])[1], KEY = (app.match(/const DB_KEY = '([^']+)'/) || app.match(/(sb_publishable_[A-Za-z0-9_-]+)/) || [])[1];
(async () => {
  const fails = [], notes = [];
  if (!DB || !KEY) { console.log('FAIL museum: the database address or key was not found in app.js'); process.exit(1); }
  let slots = [];
  try { const r = await fetch(DB + 'museum_slots?select=slot,app_slug,content,live&live=eq.true&order=slot', { headers: { apikey: KEY } }); if (!r.ok) throw new Error(r.status); slots = await r.json(); }
  catch (e) { fails.push('the database did not answer for the museum (' + e.message + ')'); }
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await (await b.newContext({ ...devices['iPhone 13'] })).newPage();
  const errs = []; p.on('pageerror', e => errs.push(String(e).slice(0, 200)));
  if (process.env.MUSEUM_FAKE) {
    slots = [...slots, { slot: 8, app_slug: 'a-show-that-is-not-there', content: null, live: true }];
    await p.route('**/museum_slots?**', r => r.fulfill({ contentType: 'application/json', body: JSON.stringify(slots.map(s => ({ ...s, colour: null, published_at: null }))) }));
  }
  await p.goto(base + '?guest#/'); 
  const box = p.locator('.hs-mu');
  let onHome = 0;
  try {
    if (slots.length) {
      await p.waitForFunction(() => { const m = document.querySelector('.hs-mu'); return m && !m.hidden && m.querySelector('.mu-in'); }, null, { timeout: 30000 });
      await p.waitForTimeout(2500);                          // (the fresh answer replaces what the phone kept)
      const label = await p.locator('.hs-mu .mu-in').getAttribute('aria-label');
      onHome = +((label || '').match(/(\d+) exhibition/) || [])[1] || 0;
      if (onHome !== slots.length) fails.push(`the Desk has ${slots.length} exhibitions live (${slots.map(s => s.app_slug || 'slot-' + s.slot).join(', ')}) but Home's museum shows ${onHome}: a published one does not reach the app`);
      const doors = await p.locator('.hs-mu .mu-door img').evaluateAll(a => a.map(i => i.complete && i.naturalWidth > 0));
      if (!doors.length) fails.push('Home\'s museum has no picture at its doors'); else if (doors.includes(false)) fails.push('a picture at the museum\'s doors on Home did not load');
      await box.screenshot({ path: out + '/museum-home.png' }).catch(() => {});
    } else {
      await p.waitForTimeout(6000);
      if (await p.evaluate(() => { const m = document.querySelector('.hs-mu'); return m && !m.hidden; })) fails.push('nothing is live on the Desk, yet Home shows a museum');
      notes.push('nothing is live on the Desk: the street falls back to the app\'s own shows');
    }
  } catch (e) { fails.push('Home\'s museum did not appear (' + String(e).slice(0, 120) + ')'); }
  // walk in
  try {
    await p.evaluate(() => { location.hash = '#/museum'; });
    await p.waitForFunction(() => { const l = document.querySelector('.sv .sv-loading'); return l && l.hidden; }, null, { timeout: 120000 });
    await p.waitForTimeout(3000);
    const made = await p.evaluate(() => ({ title: (document.querySelector('.sv .sv-t b') || {}).textContent, works: document.querySelectorAll('.sv-map .work').length }));
    if (!made.works) fails.push('the museum opened with no work on its walls');
    await p.screenshot({ path: out + '/museum-street.png' });
    notes.push(`street: "${made.title}", ${made.works} works on the plan`);
  } catch (e) { fails.push('the museum did not open (' + String(e).slice(0, 120) + ')'); }
  if (errs.length) fails.push('script error: ' + errs[0]);
  await b.close();
  fs.writeFileSync(out + '/museum.json', JSON.stringify({ slots: slots.map(s => s.app_slug || 'slot-' + s.slot), onHome, fails, notes }, null, 1));
  console.log(`${fails.length ? 'FAIL' : 'ok  '} museum: ${slots.length} live on the Desk, ${onHome} on Home; ${notes.join('; ')}${fails.length ? ' — ' + fails.join('; ') : ''}`);
  process.exit(fails.length ? 1 : 0);
})().catch(e => { console.log('FAIL museum: ' + String(e).slice(0, 300)); process.exit(1); });
