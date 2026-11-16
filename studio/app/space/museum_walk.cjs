// Home's museum film as a VISITOR sees it: a slow walk at eye height through the real museum, past the houses, their texts and works.
// The camera follows a smooth path through the WAYPOINTS below ([eye, look] in the museum's own metres); every frame is drawn by the viewer
// itself (inspect.shot), then ffmpeg joins them. Slow on purpose: about 0.5 m/s, the head turning gently.
//   node studio/app/space/museum_walk.cjs [app url] [seconds] [fps]      -> studio/app/data/museum/preview.{mp4,webm,jpg}
const { chromium } = require('playwright');
const { execFileSync } = require('child_process');
const fs = require('fs'), path = require('path'), os = require('os');
const base = process.argv[2] || 'http://localhost:8199/studio/app/', SECS = Number(process.argv[3] || 44), FPS = Number(process.argv[4] || 15), HOUR = Number(process.env.WALK_HOUR || 14.2);
const out = path.join(__dirname, '..', 'data', 'museum'), tmp = process.env.WALK_TMP || fs.mkdtempSync(path.join(os.tmpdir(), 'mwalk-')), W = 1080, H = 900, FOV = 64, TESTN = Number(process.env.WALK_TEST || 0);
const WAY = JSON.parse(process.env.WALK_WAY || 'null') || [
  [[48, 1.6, 67], [48, 2.6, 36]],            // the way in: the square, the pool, the houses under one roof of soft light
  [[47, 1.6, 59], [42, 2.4, 30]],
  [[44, 1.6, 51], [34, 2.2, 28]],            // the pool on the right, the first houses ahead
  [[38, 1.6, 43], [31, 2.1, 24]],
  [[36, 1.6, 36], [41, 2.0, 22]],            // a house with its text beside the door
  [[39, 1.6, 30], [41, 2.0, 21]],
  [[50, 1.6, 41], [66, 2.1, 22]],            // across the square, turning to the houses on the other side
  [[58, 1.6, 44], [72, 2.0, 50]],
  [[66, 1.6, 52], [79, 2.0, 60]],            // the Ritual house, its arch seen from the square
  [[70, 1.6, 58], [80, 1.8, 60]],
];
const cr = (p0, p1, p2, p3, t) => p1.map((_, i) => 0.5 * ((2 * p1[i]) + (-p0[i] + p2[i]) * t + (2 * p0[i] - 5 * p1[i] + 4 * p2[i] - p3[i]) * t * t + (-p0[i] + 3 * p1[i] - 3 * p2[i] + p3[i]) * t * t * t));
const at = (arr, u) => { const n = arr.length - 1, s = u * n, i = Math.min(n - 1, Math.floor(s)), t = s - i; return cr(arr[Math.max(0, i - 1)], arr[i], arr[i + 1], arr[Math.min(n, i + 2)], t); };
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  await p.addInitScript(() => document.addEventListener('DOMContentLoaded', () => { const s = document.createElement('style'); s.textContent = 'html,body{max-width:none!important;margin:0!important;box-shadow:none!important}.sv{width:100%!important}'; document.head.appendChild(s); }));
  p.on('pageerror', e => console.error('page:', e.message));
  await p.goto(`${base}?guest&hour=${HOUR}#/museum`);
  await p.waitForFunction(() => window.__spaceView && window.__spaceView.inspect, null, { timeout: 240000 });
  await p.waitForTimeout(14000);
  const N = TESTN || Math.round(SECS * FPS), eyes = WAY.map(w => w[0]), looks = WAY.map(w => w[1]);
  const t0 = Date.now();
  for (let f = 0; f < N; f++) {
    const u = TESTN ? f / Math.max(1, N - 1) : f / (N - 1), e = u * u * (3 - 2 * u) * 0.0 + u;                     // (an even pace; the path's own corners are smooth)
    const png = await p.evaluate(([a, l, fov]) => window.__spaceView.inspect.shot(a, l, fov).png, [at(eyes, e), at(looks, e), FOV]);
    fs.writeFileSync(path.join(tmp, `f${String(f).padStart(5, '0')}.png`), Buffer.from(png.split(',')[1], 'base64'));
    if (f % 25 === 0) console.log('frame', f, '/', N, Math.round((Date.now() - t0) / 1000) + 's');
  }
  await b.close();
  if (TESTN) { console.log('tmp', tmp); return; }
  fs.mkdirSync(out, { recursive: true });
  const inp = ['-framerate', String(FPS), '-i', path.join(tmp, 'f%05d.png')], fade = `fade=t=in:st=0:d=1.2,fade=t=out:st=${SECS - 1.2}:d=1.2`;
  const vf = `scale=960:-2,minterpolate=fps=30:mi_mode=blend,${fade},format=yuv420p`;
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...inp, '-vf', vf, '-c:v', 'libx264', '-preset', 'slow', '-crf', '29', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-an', path.join(out, 'preview.mp4')], { stdio: 'inherit' });
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...inp, '-vf', vf, '-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', '47', '-cpu-used', '2', '-row-mt', '1', '-an', path.join(out, 'preview.webm')], { stdio: 'inherit' });
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', path.join(tmp, 'f00000.png'), '-vf', 'scale=960:-1', '-q:v', '4', path.join(out, 'preview.jpg')], { stdio: 'inherit' });
  for (const f of ['preview.mp4', 'preview.webm', 'preview.jpg']) console.log(f, Math.round(fs.statSync(path.join(out, f)).size / 1024), 'KB');
})().catch(e => { console.error(e); process.exit(1); });
