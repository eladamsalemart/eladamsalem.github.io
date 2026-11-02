// A short film of a 3D room turning slowly, for Home's "Walk in now" (a phone plays a video without effort, where a
// live room on Home cost it its smoothness; Step inside opens the real room).
//   node studio/app/space/preview.cjs <slug> [app url]     (the app served, e.g. http://localhost:8765/studio/app/)
// Writes studio/app/data/spaces/<slug>/preview.{mp4,hevc.mp4,webm,jpg,json}.
//
// The camera only turns where it stands, so the room is drawn ONCE, wide and sharp, and every frame of the film is
// that one picture seen turned (space/preview_film.py: exact for a camera turning in place). Nothing can flicker
// from frame to frame, and nothing depends on how fast the browser making it is. (The first film was recorded from
// the live viewer: it lowered its own resolution when frames were slow, and raised it again, so the film was blurry
// and flickered on a phone; it also turned too fast.)
const { chromium } = require('playwright');
const { execFileSync } = require('child_process');
const fs = require('fs'), path = require('path'), os = require('os');

const slug = process.argv[2], base = process.argv[3] || 'http://localhost:8765/studio/app/';
if (!slug) { console.error('usage: preview.cjs <slug> [app url]'); process.exit(2); }
const out = path.join(__dirname, '..', 'data', 'spaces', slug), tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'preview-'));
// the wide picture: 76° up and down, 1.25 times as wide: room enough for the turns of the film, its edges included,
// at 1.5 times the film's own sharpness (the film's 60° in 2160 pixels before it is brought down to 1440)
const VFOV = 76, F = 1870, H = Math.round(2 * F * Math.tan(VFOV / 2 * Math.PI / 180)), W = Math.round(H * 1.25);

(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  // the viewer full width (the app keeps a phone-width column on a wide screen), at one pixel ratio (nothing to adapt)
  await p.addInitScript(() => document.addEventListener('DOMContentLoaded', () => {
    const s = document.createElement('style'); s.textContent = 'html,body{max-width:none!important;margin:0!important;box-shadow:none!important}.sv{width:100%!important}'; document.head.append(s); }));
  p.on('pageerror', e => console.error('page:', e.message));
  await p.goto(`${base}?guest#/exhibition/${slug}/space`);
  await p.waitForFunction(() => window.__spaceView && window.__spaceView.inspect, null, { timeout: 180000 });
  await p.waitForTimeout(12000);                                 // every photo and the works' full images in place
  const where = await p.evaluate(() => window.__spaceView.inspect.where());
  const look = [where.look[0], where.pos[1], where.look[2]];     // level: the film turns about the upright
  const shot = await p.evaluate(([at, to, fov]) => window.__spaceView.inspect.shot(at, to, fov).png, [where.pos, look, VFOV]);
  await b.close();
  const wide = path.join(tmp, 'wide.png');
  fs.writeFileSync(wide, Buffer.from(shot.split(',')[1], 'base64'));
  fs.mkdirSync(out, { recursive: true });
  execFileSync('python3', [path.join(__dirname, 'preview_film.py'), wide, String(VFOV), out], { stdio: 'inherit' });
  fs.rmSync(tmp, { recursive: true, force: true });
})().catch(e => { console.error(e); process.exit(1); });
