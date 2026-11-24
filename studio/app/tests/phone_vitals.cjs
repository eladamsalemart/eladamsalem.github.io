// Real-phone data, end to end (24.11): as an iPhone (390x844, isMobile, touch), open a tour and the museum with
// ?vitals=test, leave each, and check that a row for each visit reaches public.phone_vitals (marked test). Then: the
// graphics context lost in a tour, and a page that dies inside the museum (its row comes on the next opening, as
// crashed). Usage: node studio/app/tests/phone_vitals.cjs [base] (default http://localhost:8765/studio/app/).
// The rows are read back through the service key if SUPABASE_SECRET_KEY is set; otherwise the script only prints the
// visit ids it sent (read them with the database connector), and they are deleted with: delete from phone_vitals where test.
const { chromium, devices } = require('playwright');
const base = process.argv[2] || 'http://localhost:8765/studio/app/';
const TOUR = process.env.TOUR || 'ritual';
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ ...devices['iPhone 13'], viewport: { width: 390, height: 844 } });
  const sent = [];
  ctx.on('request', r => { if (r.url().includes('rpc/log_phone_vitals')) { try { sent.push(JSON.parse(r.postData())); } catch { sent.push({ raw: r.postData() }); } } });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(String(e)));
  const wait = ms => p.waitForTimeout(ms);
  const step = s => console.error(new Date().toISOString().slice(11, 19), s);
  // the visit's own first frame (osVitals keeps the open visit in os-vit-live): not the loading text, which Home's rooms also have
  const firstFrame = () => p.waitForFunction(() => { try { return JSON.parse(localStorage.getItem('os-vit-live')).ff != null; } catch { return false; } }, null, { timeout: 120000, polling: 250 });
  step('tour');
  // 1. a tour, 22 s inside (past the 20 s window), then back out
  await p.goto(base + '?guest&vitals=test#/exhibition/' + TOUR + '/space', { waitUntil: 'domcontentloaded' });
  await firstFrame(); await wait(22000);
  await p.evaluate(() => { location.hash = '#/'; }); await wait(1500);
  step('museum');
  // 2. the museum, 22 s, then out
  await p.evaluate(() => { location.hash = '#/museum'; });
  await firstFrame(); await wait(22000);
  await p.evaluate(() => { location.hash = '#/'; }); await wait(1500);
  step('lost');
  // 3. a tour whose graphics context is lost
  await p.evaluate(t => { location.hash = '#/exhibition/' + t + '/space'; }, TOUR);
  await firstFrame(); await wait(3000);
  await p.evaluate(() => { const c = [...document.querySelectorAll('.sv[role=dialog] > canvas')].pop(); const g = c.getContext('webgl2') || c.getContext('webgl'); g.getExtension('WEBGL_lose_context').loseContext(); });
  await wait(1000); await p.evaluate(() => { location.hash = '#/'; }); await wait(1500);
  step('crash');
  // 4. the museum, and the page dies inside it (no pagehide): the next opening sends it, crashed
  await p.evaluate(() => { location.hash = '#/museum'; });
  await firstFrame(); await wait(4000);
  const cdp = await ctx.newCDPSession(p); cdp.send('Page.crash').catch(() => {});
  await new Promise(r => setTimeout(r, 1000));
  const p2 = await ctx.newPage(); await p2.goto(base + '?guest&vitals=test#/', { waitUntil: 'domcontentloaded' }); await p2.waitForTimeout(3000);
  await Promise.race([b.close(), new Promise(r => setTimeout(r, 5000))]);
  const sizes = sent.map(s => JSON.stringify(s).length);
  console.log(JSON.stringify({ sent: sent.length, maxBytes: Math.max(...sizes), errors: errs.slice(0, 3), rows: sent.map(s => ({ id: s.id, space: s.space, dev: s.dev, model: s.model, ff: s.ff, med: s.med, worst: s.worst, n: s.n, tex: s.tex, lost: s.lost, crash: !!s.crash, test: s.test })) }, null, 1));
  process.exit(0);
})();
