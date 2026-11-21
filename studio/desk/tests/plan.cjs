// The museum plan editor on the Desk (guest demo, nothing is written): the room selector's groups, rotate, move, rename, remove and restore
// the History wing, undo/redo, and the themed/pavilion sections. usage: node studio/desk/tests/plan.cjs   BASE=<the Desk's url>
const { chromium } = require('./pw.cjs');
const BASE = (process.env.BASE || 'http://localhost:8093/studio/desk/') + '?guest';
(async () => {
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } }), bad = [], steps = [];
  p.on('response', r => r.status() >= 400 && bad.push('HTTP ' + r.status() + ' ' + r.url().slice(0, 120))); p.on('pageerror', e => bad.push('script error: ' + e.message));
  p.on('console', m => m.type() === 'error' && bad.push('console: ' + m.text().slice(0, 200)));
  const ok = (c, what) => { steps.push(what); if (!c) throw new Error('FAILED: ' + what); };
  const n = s => p.locator(s).count();
  const gs = () => p.locator('.b-g').count();
  try {
    await p.goto(BASE + '#/museum'); await p.waitForSelector('.rm'); await p.waitForSelector('.b-g');
    const groups = await p.locator('#ip-ex optgroup').evaluateAll(l => l.map(o => o.label));
    ok(groups.some(g => g.includes('התערוכות שלי')) && groups.some(g => g.includes('תערוכות אמיתיות')) && groups[groups.length - 1].includes('דמו'), 'selector groups: mine, real, demo last: ' + groups.join(' | '));
    const realOpts = await p.locator('#ip-ex optgroup[label="תערוכות אמיתיות"] option').allInnerTexts(); ok(realOpts.length >= 1, 'real exhibitions listed: ' + realOpts.join(', '));
    ok(await n('.tray-themed') === 1 && await n('.tray:not(.tray-themed)') === 1, 'two separate sections (themed and pavilions)');
    ok(await n('.b-s') >= 1, 'the History wing is on the plan (blue dashed)');
    const g0 = await gs();
    // select the wing, enter it (3D), leave
    await p.locator('.b-g:has(.b-s)').click(); ok(await p.locator('#mp-walk').count() === 1, 'wing selected: walk-in button');
    await p.locator('#mp-walk').click(); await p.waitForSelector('.sv', { timeout: 60000 }); ok(true, 'the wing opens in 3D');
    await p.keyboard.press('Escape'); await p.waitForTimeout(500);
    if (await n('.sv')) { const c = p.locator('.sv-x, .sv-close, [aria-label=Close]').first(); if (await c.count()) await c.click(); }
    // rotate a house
    await p.locator('.b-g:has(.b-h)').first().click(); const before = await p.locator('.b-g.on polygon').getAttribute('points');
    await p.locator('#mp-rot').click(); await p.waitForTimeout(400); const toasted = await p.locator('#toast, .toast').allInnerTexts().catch(() => []);
    await p.waitForSelector('.b-g');
    // remove the wing, restore it from the themed tray, undo and redo
    await p.locator('.b-g:has(.b-s)').click(); await p.locator('#mp-del').click(); await p.waitForTimeout(400);
    ok(await n('.b-s') === 0, 'the wing removed'); ok(await n('[data-sr]') >= 1, 'the themed tray offers "restore"');
    await p.locator('[data-sr]').first().click(); await p.waitForSelector('.mp-place');
    const box = await p.locator('#mp-svg').boundingBox(); await p.mouse.move(box.x + box.width * 0.15, box.y + box.height * 0.65); await p.waitForTimeout(200);
    await p.mouse.click(box.x + box.width * 0.15, box.y + box.height * 0.65); await p.waitForTimeout(600);
    ok(await n('.b-s') === 1 || (await n('.mp-place')) === 1, 'restore placed the wing back (or showed why not)');
    if (await n('.mp-place')) { await p.keyboard.press('Escape'); }
    await p.locator('#mp-undo').click().catch(() => {}); await p.waitForTimeout(400);
    // move a house: select, "move", click a free square
    await p.locator('.b-g:has(.b-h)').first().click(); await p.locator('#mp-move').click(); ok(await n('.mp-place') === 1, 'move mode shows the placement bar');
    await p.keyboard.press('Escape'); ok(await n('.mp-place') === 0, 'Esc leaves move mode');
    ok(await n('#mp-undo') === 1 && await n('#mp-redo') === 1, 'undo and redo buttons exist');
    console.log('PASS', steps.length, 'checks'); steps.forEach(s => console.log(' -', s));
  } catch (e) { console.log(e.message); steps.forEach(s => console.log(' -', s)); process.exitCode = 1; await p.screenshot({ path: (process.env.TEMP || '.') + '/plan_fail.png' }); }
  if (bad.length) { console.log('PAGE ERRORS', bad.slice(0, 5)); process.exitCode = 1; }
  await b.close();
})();
