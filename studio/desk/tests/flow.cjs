// The owner's walk through the museum on the Desk, on a desktop screen, with the demo's data (?guest: nothing is written anywhere).
// Makes an exhibition, hangs works (double click and a real drag), moves them (keys, mouse), undoes, zooms, waits for "saved",
// publishes into a room, colours the threshold, swaps two rooms, and opens the 3D preview of the room and of the whole street.
// Fails on any step that does not hold, on a script error, a console error, or a file that does not arrive (HTTP 400 and up).
// usage: node studio/desk/tests/flow.cjs [1440x900] [1920x1080]     BASE=<the Desk's url, default http://localhost:8093/studio/desk/>   SHOTS=<dir> keeps pictures
const { chromium } = require('./pw.cjs');
const BASE = (process.env.BASE || 'http://localhost:8093/studio/desk/') + '?guest', SHOTS = process.env.SHOTS || '';
const sizes = (process.argv.slice(2).length ? process.argv.slice(2) : ['1440x900', '1920x1080']).map(s => s.split('x').map(Number));

async function run(w, h) {
  const tag = `${w}x${h}`, bad = [], steps = [];
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: SHOTS ? 0.39 : 1 });
  p.on('pageerror', e => bad.push('script error: ' + e.message));
  p.on('console', m => m.type() === 'error' && bad.push('console: ' + m.text().slice(0, 200)));
  p.on('requestfailed', r => bad.push('failed: ' + r.url().slice(0, 140)));
  p.on('response', r => r.status() >= 400 && bad.push(`HTTP ${r.status()} ${r.url()}`));
  const ok = (c, what) => { steps.push(what); if (!c) throw new Error(what); };
  const shot = async n => { if (SHOTS) await p.screenshot({ path: `${SHOTS}/${n}-${w}.jpg`, type: 'jpeg', quality: 78 }); };
  const txt = s => p.locator(s).first().innerText();
  const n = s => p.locator(s).count();
  const saved = () => p.waitForSelector('#saved[data-s=ok]', { timeout: 6000 });
  try {
    // --- the museum: eight rooms, the tray in view, the keyboard's dialog
    await p.goto(BASE + '#/museum'); await p.waitForSelector('.rm');
    ok(await n('.rm') === 8, 'the plan shows eight rooms');
    const tray = await p.locator('.tray-h').boundingBox(); ok(tray && tray.y + tray.height < h, 'the tray of exhibitions is in view without scrolling');
    ok(await n('.keys') === 0, 'no row of shortcuts under the page');
    await p.keyboard.press('?'); ok(await p.locator('#helpd').evaluate(d => d.open), '? opens the shortcuts'); await p.keyboard.press('Escape');
    ok(!(await p.locator('#helpd').evaluate(d => d.open)), 'Esc closes the shortcuts'); await shot('1-museum');

    // --- a new exhibition: an honest empty state
    await p.keyboard.press('n'); await p.waitForSelector('#f-title');
    ok(/טיוטה/.test(await txt('#chips')) && !/מוצגת/.test(await txt('#chips')), 'a new exhibition is a draft, in no room');
    ok(await p.locator('.el-empty').isVisible(), 'empty walls say what to do'); await shot('2-new');
    await p.fill('#f-title', 'Flow Test'); await saved();
    ok(/#\/museum\/ex\/.+/.test(await p.evaluate(() => location.hash)) && !/ex\/new/.test(await p.evaluate(() => location.hash)), 'the first change saves the draft and gives it an address');
    ok(/נשמר/.test(await txt('#saved')), 'the saved state is written out');

    // --- hanging: double click, then a real drag from the list onto the wall
    await p.locator('#f-title').blur(); ok(await p.locator('.lib-s details').first().evaluate(d => d.open), 'the first artist is unfolded');
    const free = '.lib-s details:first-of-type .lw:not(.in)';
    await p.locator(free).first().dblclick(); await p.waitForSelector('.ew'); ok(await n('.ew') === 1, 'double click hangs a work');
    ok(await n('.el-empty') === 0, 'the empty state leaves once a work hangs');
    await p.locator(free).first().dragTo(p.locator('#ew'), { targetPosition: { x: (await p.locator('#ew').boundingBox()).width * 0.5, y: (await p.locator('#ew').boundingBox()).height * 0.5 } });
    await p.waitForFunction(() => document.querySelectorAll('.ew').length === 2, null, { timeout: 4000 }).catch(() => {});
    ok(await n('.ew') === 2, 'dragging a work from the list onto the wall hangs it there');
    ok(await p.locator('.lib-s details').first().evaluate(d => d.open), 'the list stays unfolded while working');
    ok(await n('.ew.bad') === 0, 'no two works overlap');

    // --- the keyboard: nudge, undo, redo, delete, Esc
    await p.locator('.ew').first().click(); ok(await n('.ew.on') === 1, 'a click selects one work');
    const s0 = +(await p.inputValue('#n-s'));
    await p.keyboard.press('ArrowRight'); ok(+(await p.inputValue('#n-s')) === s0 + 1, 'an arrow moves one centimetre');
    await p.keyboard.press('Shift+ArrowRight'); ok(+(await p.inputValue('#n-s')) === s0 + 11, 'Shift + arrow moves ten');
    await p.keyboard.press('Control+z'); ok(+(await p.inputValue('#n-s')) === s0, 'Ctrl+Z undoes the nudges');
    await p.keyboard.press('Control+Shift+z'); ok(+(await p.inputValue('#n-s')) === s0 + 11, 'Ctrl+Shift+Z brings them back');
    await p.keyboard.press('Delete'); ok(await n('.ew') === 1, 'Del removes the selected work');
    await p.keyboard.press('Control+z'); ok(await n('.ew') === 2, 'Ctrl+Z brings it back');
    await p.keyboard.press('Control+a'); ok(await n('.ew.on') === 2, 'Ctrl+A selects all');
    await p.keyboard.press('Escape'); ok(await n('.ew.on') === 0, 'Esc clears the selection');

    // --- the mouse: drag a work along the wall (guides while it moves), then the views and the zoom
    const e0 = await p.locator('.ew').first().boundingBox();
    await p.mouse.move(e0.x + e0.width / 2, e0.y + e0.height / 2); await p.mouse.down(); await p.mouse.move(e0.x + e0.width / 2 + 40, e0.y + e0.height / 2 + 6, { steps: 6 });
    await p.mouse.up(); const e1 = await p.locator('.ew.on').first().boundingBox();
    ok(e1 && Math.abs(e1.x - e0.x) > 15, 'dragging moves a work'); ok(await n('.ew.bad') === 0, 'a dragged work never lands on another');
    await p.keyboard.press('Control+z'); const e2 = await p.locator('.ew').first().boundingBox(); ok(Math.abs(e2.x - e0.x) < 2, 'Ctrl+Z undoes the drag');
    await p.keyboard.press('2'); ok(await p.locator('[data-v="1"]').getAttribute('aria-pressed') === 'true', '2 shows the back wall');
    await p.keyboard.press('0'); ok(await p.locator('[data-v="all"]').getAttribute('aria-pressed') === 'true', '0 shows all the walls');
    await p.keyboard.press('+'); ok(await txt('#zl') === '125%', '+ zooms in'); await p.keyboard.press('0'); ok(await txt('#zl') === '100%', '0 fits the window again');
    const el = await p.locator('#el').boundingBox(); await p.mouse.move(el.x + el.width / 2, el.y + el.height / 2); await p.keyboard.down('Control'); await p.mouse.wheel(0, -300); await p.keyboard.up('Control');
    ok(parseInt(await txt('#zl')) > 100, 'Ctrl + wheel zooms'); await p.keyboard.press('0');
    await saved(); await shot('3-editor');

    // --- the room in 3D, at the Desk's full size
    await p.keyboard.press('w'); await p.waitForFunction(() => window.__spaceView, null, { timeout: 60000 });
    ok(await n('canvas') >= 1, 'W opens the room in 3D'); await p.waitForTimeout(1500); await shot('4-room3d');
    await p.evaluate(() => { window.__spaceView.close(); window.__spaceView = null; }); await p.waitForTimeout(300);
    ok(await p.locator('#b-pub').isVisible(), 'closing the room gives the editor back');

    // --- publish into an empty room
    await p.click('#b-pub'); await p.waitForSelector('#pubd[open]');
    const room = await p.locator('.pick-r [aria-pressed=true] b').innerText(); await shot('5-publish');
    await p.click('#d-go'); await p.waitForFunction(() => /מוצגת/.test(document.querySelector('#chips').innerText));
    ok(new RegExp('חדר ' + room).test(await txt('#chips')), 'the exhibition is published into room ' + room);

    // --- back in the museum: the room shows it; colour the threshold; undo; swap two rooms
    await p.click('.ws-top a[href="#/museum"]'); await p.waitForSelector(`.rm[data-k="${room}"]`);
    ok(/Flow Test/.test(await txt(`.rm[data-k="${room}"]`)), 'the plan shows the exhibition in its room');
    ok(/מוצג/.test(await txt(`.rm[data-k="${room}"] .rm-st`)), 'and that visitors see it');
    await p.click(`.rm[data-k="${room}"]`); await p.click('.sw-row .stl-b[data-c="#1c67e3"]');
    await p.waitForFunction(k => getComputedStyle(document.querySelector(`.rm[data-k="${k}"]`)).getPropertyValue('--door').trim() === '#1c67e3', room);
    steps.push('the threshold takes the chosen colour');
    await p.keyboard.press('Control+z'); await p.waitForFunction(k => getComputedStyle(document.querySelector(`.rm[data-k="${k}"]`)).getPropertyValue('--door').trim() !== '#1c67e3', room);
    steps.push('Ctrl+Z gives the colour back');
    const t1 = await txt('.rm[data-k="1"] .rm-tx b');
    await p.locator('.rm[data-k="1"]').dragTo(p.locator(`.rm[data-k="${room}"]`));
    await p.waitForFunction(([k, t]) => { const e = document.querySelector(`.rm[data-k="${k}"] .rm-tx b`); return e && e.innerText === t; }, [room, t1], { timeout: 4000 }).catch(() => {});
    ok(await txt(`.rm[data-k="${room}"] .rm-tx b`) === t1 && /Flow Test/.test(await txt('.rm[data-k="1"]')), 'dragging one room onto another swaps them');
    await shot('6-museum-after');

    // --- the whole street, as it is set here
    await p.click('#walk-all'); await p.waitForFunction(() => window.__spaceView, null, { timeout: 90000 });
    await p.waitForTimeout(2500); ok(await n('canvas') >= 1, 'the whole street opens in 3D'); await shot('7-street3d');
    await p.evaluate(() => window.__spaceView.close());
    ok(!bad.length, 'no script errors, console errors or missing files');
    console.log(`PASS ${tag}: ${steps.length} checks`);
    await b.close(); return true;
  } catch (e) {
    if (SHOTS) await p.screenshot({ path: `${SHOTS}/FAIL-${w}.jpg`, type: 'jpeg', quality: 70 }).catch(() => {});
    console.log(`FAIL ${tag}: ${e.message.split('\n')[0]}  (after: ${steps[steps.length - 2] || 'start'})`); bad.forEach(x => console.log('  ' + x));
    await b.close(); return false;
  }
}
(async () => { let all = true; for (const [w, h] of sizes) all = (await run(w, h)) && all; process.exit(all ? 0 : 1); })();
