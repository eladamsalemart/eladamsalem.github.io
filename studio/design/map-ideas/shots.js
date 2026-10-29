// Renders the map-ideas PDF's pictures: the app as a phone shows it, and the design studies (mock.html).
// node studio/design/map-ideas/shots.js   (with the repo served at http://localhost:8765)
const { chromium } = require('playwright');
const path = require('path');
const OUT = path.join(__dirname, 'shots'), BASE = 'http://localhost:8765/studio/';
const GL = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];
const K = '32.0521,34.7724', TAMA = '32.0776,34.7865', HERZ = '32.1620,34.8436';
const mocks = [
  ['idea-atlas', `v=atlas&at=${K}&z=15.9&p=60&b=-30&t=Tel Aviv–Yafo`],
  ['idea-night', `v=night&at=${K}&z=15.9&p=60&b=-30&t=Tonight&k=Openings`],
  ['idea-wash', `v=wash&at=32.0640,34.7760&z=13.6&p=0&b=0&t=Art this week`],
  ['idea-model', `v=model&at=${K}&z=16.1&p=55&b=35`],
  ['idea-cards', `v=atlas&at=${K}&z=15.6&p=50&b=-20&ov=cards`],
  ['b-kind', `v=atlas&at=${TAMA}&z=17&p=62&b=20`],
  ['b-floors', `v=atlas&at=${K}&z=17.6&p=64&b=-40`],
  ['b-activity', `v=activity&at=32.0700,34.7800&z=14.6&p=60&b=-20`],
  ['b-lantern', `v=lantern&at=${K}&z=16.6&p=62&b=-30`],
  ['b-ghost', `v=ghost&at=${HERZ}&z=17.2&p=60&b=10`],
  ['b-artwork', `v=artwork&at=${TAMA}&z=17.2&p=60&b=20&id=tel-aviv-museum-of-art&img=../../app/data/spaces/ritual/works/flowers-3-small.webp`],
];
(async () => {
  const b = await chromium.launch({ args: GL });
  for (const [name, q] of mocks) {
    const p = await (await b.newContext({ viewport: { width: 390, height: 560 }, deviceScaleFactor: 2 })).newPage();
    p.on('pageerror', e => console.log(name, e.message));
    await p.goto(BASE + 'design/map-ideas/mock.html?' + q);
    try { await p.waitForSelector('body[data-ready]', { timeout: 40000 }); } catch { console.log(name, 'not ready'); }
    await p.waitForTimeout(1500);
    await p.screenshot({ path: `${OUT}/${name}.png` });
    await p.close();
  }
  // the app itself, as a phone opens it
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const p = await ctx.newPage();
  await p.goto(BASE + 'app/#/map'); await p.waitForTimeout(11000);
  await p.screenshot({ path: `${OUT}/app-map.png` });
  await p.evaluate(() => window.scrollTo(0, 430)); await p.waitForTimeout(600);
  await p.screenshot({ path: `${OUT}/app-list.png` });
  await p.goto(BASE + 'app/#/map/place/haifa-museum-of-art'); await p.reload(); await p.waitForTimeout(12000);
  await p.evaluate(() => window.scrollTo(0, 330)); await p.waitForTimeout(600);
  await p.screenshot({ path: `${OUT}/app-card.png` });
  await b.close();
})();
