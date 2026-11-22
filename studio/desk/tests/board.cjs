// The hall's furniture on the Desk's plan (guest demo, nothing is written): add / drag / turn / edit by number / duplicate / remove a coulisse and a pedestal,
// the big board, and undo.   usage: node studio/desk/tests/board.cjs   BASE=<the Desk's url>   SHOTS=<dir> keeps pictures
const { chromium } = require('./pw.cjs');
const BASE = (process.env.BASE || 'http://localhost:8093/studio/desk/') + '?guest', SHOTS = process.env.SHOTS || '';
(async () => {
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } }), bad = [], steps = [];
  p.on('pageerror', e => bad.push('script error: ' + e.message));
  p.on('console', m => m.type() === 'error' && !/ERR_CONNECTION|Failed to load resource/.test(m.text()) && bad.push('console: ' + m.text().slice(0, 200)));
  const ok = (c, what) => { steps.push(what); if (!c) throw new Error('FAILED: ' + what); };
  const n = s => p.locator(s).count();
  const shot = async name => { if (SHOTS) await p.screenshot({ path: `${SHOTS}/${name}.png` }); };
  try {
    await p.goto(BASE + '#/museum'); await p.waitForSelector('.mx-canvas .b-g'); await p.waitForTimeout(600);
    const st0 = await n('.b-st'), pd0 = await n('.b-pd');
    ok(st0 >= 3 && pd0 >= 3, 'the base plan shows its coulisses and pedestals');
    await p.locator('#it-addst').click(); await p.waitForTimeout(400);
    ok(await n('.b-st') === st0 + 1 && await n('.b-st.on') === 1 && await n('#it-len') === 1, 'a new coulisse is added, selected, with its fields');
    await p.fill('#it-len', '5'); await p.locator('#it-len').dispatchEvent('change'); await p.waitForTimeout(400);
    ok(+(await p.inputValue('#it-len')) === 5, 'the length is edited by number');
    await p.fill('#it-rot', '10'); await p.locator('#it-rot').dispatchEvent('change'); await p.waitForTimeout(400);
    ok(/rotate\(10\)/.test(await p.locator('.b-st.on').getAttribute('transform')), 'the angle is edited by number');
    // drag it
    const box = await p.locator('.b-st.on .b-stb').boundingBox(), t0 = await p.locator('.b-st.on').getAttribute('transform');
    await p.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await p.mouse.down(); await p.mouse.move(box.x + box.width / 2 + 60, box.y + box.height / 2 + 30, { steps: 6 }); await p.mouse.up(); await p.waitForTimeout(500);
    const t1 = await p.locator('.b-st.on').getAttribute('transform');
    ok(t0 !== t1 || /אי אפשר/.test(await p.locator('body').innerText()), 'dragging moves it (or says why not)');
    await p.locator('#it-r90').click(); await p.waitForTimeout(400); ok(await n('.b-st.on') === 1, 'a quarter turn keeps it selected');
    await p.locator('#ip #it-dup').click(); await p.waitForTimeout(500); ok(await n('.b-st') === st0 + 2, 'a coulisse is duplicated');
    await p.locator('#ip #it-del').click(); await p.waitForTimeout(500); ok(await n('.b-st') === st0 + 1, 'and removed');
    await p.locator('#it-addpd').click(); await p.waitForTimeout(400);
    ok(await n('.b-pd') === pd0 + 1 && await n('#it-size') === 1 && await n('#it-show') === 1, 'a pedestal is added with size and content');
    await p.selectOption('#it-size', 'l'); await p.waitForTimeout(400); ok(await n('.b-pd.on') === 1, 'its size changes');
    await shot('board-normal');
    await p.locator('#mp-full').click(); await p.waitForTimeout(500);
    const r = await p.locator('.mx-studio.full .mx-canvas').boundingBox();
    ok(r && r.width > 900 && r.height > 600, 'the big board fills the screen');
    await shot('board-big');
    await p.keyboard.press('Escape'); await p.waitForTimeout(300); ok(await n('.b-it.on') === 0, 'Escape drops the selection');
    await p.keyboard.press('Escape'); await p.waitForTimeout(300); ok(await n('.mx-studio.full') === 0, 'and the next Escape closes the big board');
    await p.locator('.b-pd').last().click(); await p.waitForTimeout(300); await p.locator('#ip #it-del').click(); await p.waitForTimeout(400);
    ok(await n('.b-pd') === pd0, 'the pedestal is removed');
    await p.locator('#mp-undo').click(); await p.waitForTimeout(500); ok(await n('.b-pd') === pd0 + 1, 'undo brings it back');
    console.log('ok', steps.length, 'checks'); steps.forEach(s => console.log(' ✓', s));
    if (bad.length) { console.log('PROBLEMS', bad.slice(0, 6)); process.exitCode = 1; }
  } catch (e) { console.log('FAIL', e.message, '\nafter:', steps.slice(-2), bad.slice(0, 4)); process.exitCode = 1; await shot('board-fail'); }
  await b.close();
})();
