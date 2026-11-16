// The film on Home's museum tile: a slow camera inside the real museum, seen from several places and at several hours of the day
// (the museum follows the visitor's clock, so the film shows a day going by). Each view is drawn once, wide and sharp, by the viewer
// itself (inspect.shot), then ffmpeg pushes in slowly on each and dissolves one into the next; the last dissolves back into the first
// so the loop has no seam.
//   node studio/app/space/museum_film.cjs [app url]      (the app served, e.g. http://localhost:8199/studio/app/)
// Writes studio/app/data/museum/preview.{mp4,webm,jpg}. Views: the VIEWS list below ([hour, eye, look]); the museum's own coordinates
// (the plaza's middle is 60, 60). Re-run after the museum changes (a new wing, new houses).
const { chromium } = require('playwright');
const { execFileSync } = require('child_process');
const fs = require('fs'), path = require('path'), os = require('os');
const base = process.argv[2] || 'http://localhost:8199/studio/app/', out = path.join(__dirname, '..', 'data', 'museum'), tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mfilm-'));
const C = 48, W = 1800, H = 1500, FOV = 62;
const VIEWS = JSON.parse(process.env.MUSEUM_VIEWS || 'null') || [
  [12.8, [48, 1.6, 66.5], [48, 3.2, 34]],                             // the way in at midday: the square, the pool, the houses under one roof of soft light, the garden through the glass
  [13.6, [30, 1.6, 52], [14, 2.6, 36]],                               // across the square to the Renaissance wing's door
  [14.6, [14, 1.6, 35], [17, 2.3, 22]],                               // inside the wing: David at the end of the walk
  [16.8, [66, 1.6, 52], [46, 3.4, 28]],                               // the late sun on the floor, the pools of light long and warm
  [19.6, [48, 1.6, 66.5], [48, 3.0, 34]],                             // the same way in after dark: the lit houses, the garden gone dark behind the glass
];
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const files = [];
  for (const [k, [hour, eye, look]] of VIEWS.entries()) {
    const p = await b.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
    await p.addInitScript(() => document.addEventListener('DOMContentLoaded', () => { const s = document.createElement('style'); s.textContent = 'html,body{max-width:none!important;margin:0!important;box-shadow:none!important}.sv{width:100%!important}'; document.head.append(s); }));
    p.on('pageerror', e => console.error('page:', e.message));
    await p.goto(`${base}?guest&hour=${hour}#/museum`);
    await p.waitForFunction(() => window.__spaceView && window.__spaceView.inspect, null, { timeout: 240000 });
    await p.waitForTimeout(14000);                                  // the works' full images, the sky and the tree line in place
    const png = await p.evaluate(([at, to, fov]) => window.__spaceView.inspect.shot(at, to, fov).png, [eye, look, FOV]);
    const f = path.join(tmp, `v${k}.png`); fs.writeFileSync(f, Buffer.from(png.split(',')[1], 'base64')); files.push(f);
    await p.close();
  }
  await b.close();
  fs.mkdirSync(out, { recursive: true });
  // each view: 6.5 s, pushed in 10% while drifting a little (alternately left and right); 1.3 s dissolves; the last view is the first again, for a loop
  const D = 6.5, X = 1.3, FPS = 30, OW = 1080, OH = 900, n = files.length, all = [...files, files[0]];
  const inputs = all.flatMap((f, i) => ['-loop', '1', '-t', String(i === n ? X + 0.1 : D + X), '-i', f]);
  const chains = all.map((_, i) => `[${i}:v]scale=${Math.round(OW * 1.5)}:-1,zoompan=z='1+0.1*on/${Math.round((D + X) * FPS)}':x='(iw-iw/zoom)*${i % 2 ? '0.6-0.25*on/' + Math.round((D + X) * FPS) : '0.4+0.25*on/' + Math.round((D + X) * FPS)}':y='(ih-ih/zoom)*0.5':d=${Math.round((D + X) * FPS)}:s=${OW}x${OH}:fps=${FPS},format=yuv420p[z${i}]`);
  let last = 'z0', fx = '';
  for (let i = 1; i < all.length; i++) { const off = (D) * i - 0.0; fx += `[${last}][z${i}]xfade=transition=fade:duration=${X}:offset=${(D * i).toFixed(2)}[x${i}];`; last = `x${i}`; void off; }
  const total = D * n + X + 0.1;
  const graph = chains.join(';') + ';' + fx.slice(0, -1);
  const run = (args) => execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...inputs, '-filter_complex', graph, '-map', `[${last}]`, '-t', total.toFixed(2), ...args], { stdio: 'inherit' });
  run(['-c:v', 'libx264', '-preset', 'slow', '-crf', '25', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-an', path.join(out, 'preview.mp4')]);
  run(['-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', '36', '-row-mt', '1', '-an', path.join(out, 'preview.webm')]);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', files[0], '-vf', `scale=${OW}:-1`, '-q:v', '4', path.join(out, 'preview.jpg')], { stdio: 'inherit' });
  for (const f of ['preview.mp4', 'preview.webm', 'preview.jpg']) console.log(f, Math.round(fs.statSync(path.join(out, f)).size / 1024), 'KB');
  fs.rmSync(tmp, { recursive: true, force: true });
})().catch(e => { console.error(e); process.exit(1); });
