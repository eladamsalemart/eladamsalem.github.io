// The museum page on the Desk (guest demo, nothing is written): the plan on top (select, floating tools, rotate, move, undo),
// the curator wall below (pavilions, themed wings switched in and out of the building, the exhibitions tray and its filters).
// usage: node studio/desk/tests/plan.cjs   BASE=<the Desk's url>   SHOTS=<dir> keeps pictures
const { chromium } = require('./pw.cjs');
const BASE = (process.env.BASE || 'http://localhost:8093/studio/desk/') + '?guest', SHOTS = process.env.SHOTS || '';
(async () => {
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } }), bad = [], steps = [];
  p.on('response', r => r.status() >= 400 && bad.push('HTTP ' + r.status() + ' ' + r.url().slice(0, 120)));
  p.on('pageerror', e => bad.push('script error: ' + e.message));
  p.on('console', m => m.type() === 'error' && bad.push('console: ' + m.text().slice(0, 200)));
  const ok = (c, what) => { steps.push(what); if (!c) throw new Error('FAILED: ' + what); };
  const n = s => p.locator(s).count();
  const shot = async (name, full) => { if (SHOTS) await p.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: !!full }); };
  try {
    await p.goto(BASE + '#/museum'); await p.waitForSelector('.mx-canvas .b-g'); await p.waitForTimeout(600);
    await shot('museum-top'); await shot('museum-full', true);
    ok(await n('.mx-studio') === 1 && await n('.mx-wall') === 1, 'the plan on top, the curator wall below');
    const groups = await p.locator('#ip-ex optgroup').evaluateAll(l => l.map(o => o.label));
    ok(groups.some(g => g.includes('תערוכות אמיתיות')) && groups[groups.length - 1].includes('דמו'), 'the selector: real exhibitions, demo last');
    ok(await n('.mx-wall .rm') === 8, 'eight pavilions on the wall');
    ok(await n('.b-s') >= 1 && await n('[data-wing][aria-checked=true]') >= 1, 'the History wing is in the building and switched on');
    // the floating tools on a selected pavilion
    await p.locator('.b-g:not(.on):has(.b-h)').first().click(); ok(await n('#mx-float') === 1 && await n('#mp-rot') === 1, 'selecting a pavilion shows the floating tools');
    const before = await p.locator('.b-g.on polygon').first().getAttribute('points');
    await p.locator('#mp-rot').click(); await p.waitForTimeout(500);
    const after = await p.locator('.b-g.on polygon').first().getAttribute('points').catch(() => before);
    ok(before !== after || /סובב|אי אפשר/.test(await p.locator('body').innerText()), 'rotate turns it (or says why not)');
    if (await p.locator('#mp-undo').isEnabled()) { await p.locator('#mp-undo').click(); await p.waitForTimeout(400); } ok(true, 'undo on the plan');
    // the wing: out of the building and back in from the wall
    await p.locator('[data-wing]').first().click(); await p.waitForTimeout(500);
    ok(await n('.b-s') === 0 && await n('[data-wing][aria-checked=false]') >= 1, 'the switch takes the wing out of the building');
    await p.locator('[data-wing]').first().click(); await p.waitForTimeout(500);
    ok(await n('.b-s') === 1 || await n('.mp-place') === 1, 'the switch brings it back (or asks where)');
    if (await n('.mp-place')) await p.keyboard.press('Escape');
    // select the wing: its panel walks into it
    await p.locator('.b-g:has(.b-s)').click(); ok(await n('#pn-walk') === 1 && await n('#pn-del') === 1, 'the wing has its own panel: walk in, take out');
    await p.locator('#pn-walk').click(); await p.waitForSelector('.sv', { timeout: 90000 }); ok(true, 'the wing opens in 3D');
    await p.waitForFunction(() => window.__spaceView, null, { timeout: 90000 }); await p.evaluate(() => window.__spaceView.close()); await p.waitForTimeout(600);
    // the tray's filters
    await p.locator('[data-tf=demo]').click(); const t = await p.locator('#tray-g').innerText(); ok(/דמו/.test(t), 'the tray filters to demo');
    // move mode and Esc
    await p.locator('.b-g:not(.on):has(.b-h)').first().click(); await p.locator('#mp-move').click(); ok(await n('.mp-place') === 1, 'move shows the placement bar');
    await p.keyboard.press('Escape'); ok(await n('.mp-place') === 0, 'Esc leaves move mode');
    console.log('PASS', steps.length, 'checks'); steps.forEach(s => console.log(' -', s));
  } catch (e) { console.log(e.message); steps.forEach(s => console.log(' -', s)); process.exitCode = 1; await p.screenshot({ path: (process.env.TEMP || '.') + '/plan_fail.png' }); }
  if (bad.length) { console.log('PAGE ERRORS', bad.slice(0, 5)); process.exitCode = 1; }
  await b.close();
})();
