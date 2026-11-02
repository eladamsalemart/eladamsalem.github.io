// A short film of a 3D room turning slowly, for Home's "Walk in now": a phone plays a video without effort, where
// the live room in a frame cost Home its smoothness. Step inside still opens the real room.
//   node studio/app/space/preview.cjs <slug> [app url]     (the app served, e.g. http://localhost:8765/studio/app/)
// Writes studio/app/data/spaces/<slug>/preview.mp4 (and .webm) and preview.jpg (its first frame): 8 s, looping seamlessly.
const { chromium } = require('playwright');
const { execFileSync } = require('child_process');
const fs = require('fs'), path = require('path'), os = require('os');

const slug = process.argv[2], base = process.argv[3] || 'http://localhost:8765/studio/app/';
if (!slug) { console.error('usage: preview.cjs <slug> [app url]'); process.exit(2); }
const out = path.join(__dirname, '..', 'data', 'spaces', slug), tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'preview-'));
const FPS = 24, SECONDS = 8, SWING = 0.55;                      // the same slow look round as Home showed live

(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 360, height: 480 }, deviceScaleFactor: 2 });
  p.on('pageerror', e => console.error('page:', e.message));
  await p.goto(`${base}?guest#/exhibition/${slug}/space`);
  await p.waitForFunction(() => window.__spaceView && window.__spaceView.inspect, null, { timeout: 120000 });
  await p.addStyleTag({ content: '.sv-top,.sv-modes,.sv-map,.sv-joy,.sv-hint,.sv-card,.sv-dot,.sv-loading,.install{display:none!important}' });
  await p.waitForTimeout(6000);                                  // every photo in place
  const start = await p.evaluate(() => window.__spaceView.inspect.where());
  const n = FPS * SECONDS;
  for (let i = 0; i < n; i++) {
    const a = Math.sin(i / n * Math.PI * 2) * SWING;           // a full swing and back: the last frame meets the first
    await p.evaluate(([s, a]) => {
      const [lx, ly, lz] = s.look, [px, , pz] = s.pos, dx = lx - px, dz = lz - pz, c = Math.cos(a), sn = Math.sin(a);
      window.__spaceView.inspect.place(s.pos, [px + dx * c - dz * sn, ly, pz + dx * sn + dz * c]);
    }, [start, a]);
    await p.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
    await p.screenshot({ path: path.join(tmp, `f${String(i).padStart(4, '0')}.png`) });
  }
  await b.close();
  fs.mkdirSync(out, { recursive: true });
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', path.join(tmp, 'f%04d.png'),
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '27', '-preset', 'slow', '-movflags', '+faststart', '-an', path.join(out, 'preview.mp4')]);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', path.join(tmp, 'f%04d.png'),        // (for the browsers without H.264)
    '-c:v', 'libvpx-vp9', '-pix_fmt', 'yuv420p', '-crf', '38', '-b:v', '0', '-row-mt', '1', '-an', path.join(out, 'preview.webm')]);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', path.join(tmp, 'f0000.png'), '-q:v', '4', path.join(out, 'preview.jpg')]);
  fs.rmSync(tmp, { recursive: true, force: true });
  console.log(`${slug}: preview.mp4 ${(fs.statSync(path.join(out, 'preview.mp4')).size / 1024).toFixed(0)} KB, ${n} frames`);
})().catch(e => { console.error(e); process.exit(1); });
