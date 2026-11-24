// The visitor robot: every night it walks the app as a phone does (390 x 844, isMobile, touch, DPR 1 as the museum's own budget is measured, opened as a visitor
// opens it: no ?inspect), through every published tour and the museum (each pavilion, Ritual first), and measures what the
// owner would otherwise find himself. No AI inside: only measurements.
//   node studio/robot/robot.cjs [app url] [out dir]
//     app url  default https://eladamsalem.com/open-studio/ (the live site)
//     out dir  default studio/health/robot (latest.json, report.html, trend.json, summary.he.md, shots/, history/<date>.json)
//   ROBOT_ONLY=museum|<tour slug>   walk one space (for working on the robot)
//   ROBOT_PROVE=0                  skip the planted-bug pass (on by default: every check proves each night that it still bites)
//   ROBOT_HOUR=14                  the museum's hour (fixed, so that nights compare)
// What it measures at each fixed viewpoint (viewpoints.json, next to this file; a space not in it is seeded once, then kept):
//   memory (inspect.memory, MB, against NIGHT.md's 460) and draw calls (260), frame time while turning, load time to the
//   first frame and to the room being ready, sharpness of the works in front (texture px against the source px and the
//   px the screen needs), console errors and failed requests. Per space: things floating above the floor, wall text not
//   flush on its wall, walkable openings that are blocked, textures missing or black. For a pavilion built from a real
//   tour: the same view in the tour, side by side, with colour, brightness and gloss compared.
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const { writeReport } = require('./report.cjs');
const BASE = (process.argv[2] || 'https://eladamsalem.com/open-studio/').replace(/\/?$/, '/');
const OUT = path.resolve(process.argv[3] || path.join(__dirname, '..', 'health', 'robot')), SHOTS = path.join(OUT, 'shots'), HIST = path.join(OUT, 'history');
const VP_FILE = path.join(__dirname, 'viewpoints.json');
const ONLY = (process.env.ROBOT_ONLY || '').split(',').filter(Boolean), PROVE = process.env.ROBOT_PROVE !== '0', HOUR = +(process.env.ROBOT_HOUR || 14);
const BUDGET = { memory: 460, calls: 260 };            // studio/design/museum-sky/NIGHT.md ("calls <= 260 at the start view, memory estimate <= 460")
const LIMIT = { float: 0.03, flush: 0.015, soft: 0.85, near: 4, bright: 0.12, colour: 10, gloss: [0.6, 1.6] };
fs.mkdirSync(SHOTS, { recursive: true }); fs.mkdirSync(HIST, { recursive: true });
const VP = fs.existsSync(VP_FILE) ? JSON.parse(fs.readFileSync(VP_FILE, 'utf8')) : { tours: {}, museum: [], pavilions: {} };
let seeded = false;
const r2 = v => Math.round(v * 100) / 100, r1 = v => Math.round(v * 10) / 10;
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);

// --- in the page, before the app: hold on to the room's description and its scene, and time the first frame -----------
function hooks(base) {
  window.__robot = { errors: [], first: 0 };
  window.__openSpace = async a => {
    const T = await import('three');
    if (!T.Scene.prototype.__robot) {
      T.Scene.prototype.__robot = 1;
      const u = T.Object3D.prototype.updateMatrixWorld;
      T.Scene.prototype.updateMatrixWorld = function (f) { const R = window.__robot; if (!R.first) R.first = performance.now(); R.scene = this; return u.call(this, f); };
      // (the camera the visitor sees through is the one whose lens is updated every frame)
      const pm = T.PerspectiveCamera.prototype.updateProjectionMatrix;
      T.PerspectiveCamera.prototype.updateProjectionMatrix = function () { const R = window.__robot; this.__n = (this.__n || 0) + 1; if (!R.cam || this.__n > R.cam.__n) R.cam = this; return pm.call(this); };
    }
    if (window.__robotPlantSpec) window.__robotPlantSpec(a.spec);
    window.__robot.spec = a.spec; window.__robot.T = T;
    return (await import(base + 'space/space.js')).openSpace(a);
  };
}

// --- in the page: the measurements -------------------------------------------------------------------------------------
// (one function, so that it can be sent once and called by name)
function lib() {
  const R = window.__robot, I = () => window.__spaceView.inspect;
  const V = (T, a) => new T.Vector3(...a);
  R.frameTime = async (eye, look, ms = 2000) => {          // turn the head slowly, as a visitor looking round, and time the frames
    const I0 = I(), d = [look[0] - eye[0], look[2] - eye[2]], t0 = performance.now(), dts = [];
    let last = t0;
    await new Promise(res => { const step = now => { dts.push(now - last); last = now; const a = Math.sin((now - t0) / ms * Math.PI * 2) * 0.12, c = Math.cos(a), s = Math.sin(a);
      I0.place(eye, [eye[0] + d[0] * c - d[1] * s, look[1], eye[2] + d[0] * s + d[1] * c]); if ((now - t0 < ms || dts.length < 8) && now - t0 < 14000) requestAnimationFrame(step); else res(); }; requestAnimationFrame(step); });
    I0.place(eye, look);
    const x = dts.slice(1).sort((a, b) => a - b); if (!x.length) return { median: 0, p95: 0, n: 0 };
    return { median: Math.round(x[x.length >> 1]), p95: Math.round(x[Math.min(x.length - 1, Math.floor(x.length * 0.95))]), n: x.length };
  };
  const natural = new Map();
  const srcPx = url => { if (!url) return Promise.resolve(0); if (natural.has(url)) return natural.get(url);
    const p = new Promise(res => { const im = new Image(); im.onload = () => res(Math.max(im.naturalWidth, im.naturalHeight)); im.onerror = () => res(0); im.src = url; setTimeout(() => res(0), 15000); });
    natural.set(url, p); return p; };
  // the works in front of the visitor: in the field of view, facing them, near enough to be looked at
  R.sharp = async (eye, look, near) => {
    const I0 = I(), T = R.T, E = V(T, eye), dir = V(T, look).sub(E).normalize(), canvas = [...document.querySelectorAll('canvas')].sort((a, c) => c.width * c.height - a.width * a.height)[0];
    const fov = I0.where().fov, asp = canvas.width / canvas.height, tanV = Math.tan(fov * Math.PI / 360), tanH = tanV * asp, pxW = canvas.width;
    const tiers = new Map(I0.tiers().map(t => [t.title, t])), drawn = new Map(I0.works().map(w => [w.title, w])), out = [];
    for (const p of I0.pieces) {
      const c = V(T, p.centre), v = c.clone().sub(E), d = v.length(); if (d > near) continue;
      const f = v.clone().normalize(); if (f.dot(dir) < Math.cos(Math.atan(Math.hypot(tanH, tanV)))) continue;
      if (p.facing && V(T, p.facing).dot(f) > 0.05) continue;          // its back is to us
      const span = Math.max(p.size.w, p.size.h) / 100, need = span * pxW / (2 * Math.max(0.5, d) * tanH) * 1.15;
      const t = tiers.get(p.title) || {}, w = drawn.get(p.title) || { image: [0, 0] };
      const cur = Math.max(w.image[0], w.image[1]), src = await srcPx(t.full || p.image);
      const goal = Math.min(src || 1e9, [640, 1024, 1536, 2048].find(x => x >= need) || 2048);
      out.push({ title: p.title, full: t.full || p.image, d: Math.round(d * 10) / 10, cur, src, need: Math.round(need), want: t.want || 0, pxm: Math.round(cur / span), ratio: Math.round(cur / goal * 100) / 100 });
    }
    return out;
  };
  // the scene, for the physics: every mesh with its kind, made world-ready
  const meshes = () => { const o = []; R.scene.updateMatrixWorld(true); R.scene.traverse(m => { if ((m.isMesh || m.isInstancedMesh) && m.visible) { let vis = true; for (let q = m; q; q = q.parent) vis = vis && q.visible; if (vis) o.push(m); } }); return o; };
  const blockers = ms => ms.filter(m => !['shadow', 'mirror', 'proxy'].includes(m.userData.kind) && !(m.material && m.material.transparent && m.material.opacity < 0.2) && m.userData.kind !== 'outside');
  R.physics = (LIMIT) => {
    const T = R.T, s = R.spec, all = meshes(), solid = blockers(all), ray = new T.Raycaster(), flags = [], counts = {};
    const drawn = h => { const m = Array.isArray(h.object.material) ? h.object.material[h.face ? h.face.materialIndex : 0] : h.object.material; return !!m && m.visible !== false; };
    const cast = (o, d, far, list = solid) => { ray.set(o, d); ray.near = 0; ray.far = far; return ray.intersectObjects(list, false).filter(drawn); };
    // (what something can stand on: everything drawn but shadows; the museum's floor that the visitor sees is its mirror)
    const ground = all.filter(m => m.userData.kind !== 'shadow');
    // 1. floating: plinths, stands and objects (and the garden's plants) stand on something: the floor, the ground, a plinth
    const box = new T.Box3(), standers = all.filter(m => ['plinth', 'stand', 'object', 'pool'].includes(m.userData.kind) || (m.userData.kind === 'outside' && m.isInstancedMesh));
    counts.objects = 0; const garden = { n: 0, bad: 0, worst: 0, at: null };
    for (const m of standers) {
      const items = [];
      if (m.isInstancedMesh) { if (!m.geometry.boundingBox) m.geometry.computeBoundingBox(); const M = new T.Matrix4(), step = Math.max(1, Math.floor(m.count / 40));
        for (let i = 0; i < m.count; i += step) { m.getMatrixAt(i, M); items.push(m.geometry.boundingBox.clone().applyMatrix4(M.premultiply(m.matrixWorld))); } }
      else items.push(box.setFromObject(m).clone());
      for (const b of items) {
        if (b.isEmpty()) continue; counts.objects++;
        const c = b.getCenter(new T.Vector3()), hits = cast(new T.Vector3(c.x, b.min.y + 0.03, c.z), new T.Vector3(0, -1, 0), 50, ground).filter(h => h.object !== m);
        const gap = hits.length ? b.min.y - hits[0].point.y : Infinity;
        if (m.userData.kind === 'outside') {          // (no ground under it: beyond the modelled ground, nothing to judge)
          if (b.min.y > 1.2 || !hits.length) continue; garden.n++;
          if (gap > 0.08) { garden.bad++; if (gap > garden.worst) { garden.worst = gap; garden.at = [c.x, b.min.y, c.z]; } }
          continue;
        }
        if (gap > LIMIT.float) flags.push({ check: 'floating', what: `${m.userData.kind} at (${c.x.toFixed(1)}, ${c.z.toFixed(1)})`, value: gap === Infinity ? 'nothing under it' : `${Math.round(gap * 100)} cm above what is under it`, at: [c.x, b.min.y, c.z] });
      }
    }
    if (garden.bad) flags.push({ check: 'floating', what: `${garden.bad} of ${garden.n} garden plants near the ground`, value: `up to ${Math.round(garden.worst * 100)} cm above the ground, e.g. at (${garden.at[0].toFixed(1)}, ${garden.at[2].toFixed(1)})`, at: garden.at });
    counts.plants = garden.n;
    // 2. wall text flush on its wall, inside its bounds: from a little in front of each corner, the plate, then the wall right behind it
    counts.texts = 0;
    for (const h of (s.hotspots || []).filter(h => h.kind === 'text' && h.origin && h.size)) {
      counts.texts++;
      const O = V(T, h.origin), U = V(T, h.u), Vv = V(T, h.v), N = V(T, h.normal).normalize(), bad = [];
      for (const [a, b] of [[0.5, 0.5], [0.04, 0.04], [0.96, 0.04], [0.04, 0.96], [0.96, 0.96]]) {
        const P = O.clone().addScaledVector(U, a * h.size[0]).addScaledVector(Vv, b * h.size[1]);
        const hits = cast(P.clone().addScaledVector(N, 0.05), N.clone().negate(), 0.6).map(x => x.distance - 0.05);
        const plate = hits.findIndex(x => Math.abs(x) < 0.006), wall = hits.find((x, k) => k !== plate && x > -0.006);
        if (plate < 0) bad.push('the plate is not where its text is');
        else if (wall === undefined) bad.push(`no wall behind ${a === 0.5 ? 'its middle' : 'a corner'}`);
        else if (wall > LIMIT.flush) bad.push(`${Math.round(wall * 1000)} mm off the wall`);
      }
      if (bad.length) flags.push({ check: 'text not flush', what: `"${h.title || h.id}"`, value: [...new Set(bad)].join('; '), at: h.origin });
    }
    // 3. openings: every walkable opening (a door or an arch, from the floor, at least 2 m high and 0.8 m wide) is clear to see through and to walk through
    counts.openings = 0;
    for (const q of s.surfaces || []) for (const op of q.openings || []) {
      if ((op.sill || 0) > 0.05 || !(op.height >= 2) || !(op.to - op.from >= 0.8) || !op.through) continue;
      counts.openings++;
      const U = V(T, q.u), N = V(T, q.normal).normalize(), bottom = q.origin[1] - (q.size ? q.size[1] : 0) * Math.abs(q.v ? q.v[1] : 1), m = (op.from + op.to) / 2;
      const P = V(T, q.origin).addScaledVector(U, m); P.y = Math.max(0, bottom) + Math.min(1.2, op.height / 2);
      const seen = cast(P.clone().addScaledVector(N, -0.7), N, 1.4).filter(x => x.object.userData.kind !== 'glass' || !op.glass);
      // (a side that is out of the building, the garden seen through the glass, is not for walking: the museum's design)
      const rm = s.room || {}, inside = q => !(rm.x1 > rm.x0) || (q.x > rm.x0 + 0.05 && q.x < rm.x1 - 0.05 && q.z > rm.z0 + 0.05 && q.z < rm.z1 - 0.05);
      const walk = [-0.9, 0.9].map(k => { const at = P.clone().addScaledVector(N, k); at.y = 1.6; if (!inside(at)) return 0; const st = window.__spaceView.inspect.stand(at.toArray()); return Math.hypot(st[0] - at.x, st[2] - at.z); });
      const why = [];
      if (seen.length) why.push(`something stands in it (${seen[0].object.userData.kind || 'a surface'}, ${Math.round((seen[0].distance - 0.7) * 100)} cm from the wall's line)`);
      if (walk.some(x => x > 0.35)) why.push(`a visitor cannot stand ${walk[0] > 0.35 ? 'in front of' : 'beyond'} it`);
      if (why.length) flags.push({ check: 'opening blocked', what: `${q.name} ${op.arch ? 'arch' : 'doorway'} ${(op.to - op.from).toFixed(1)} m`, value: why.join('; '), at: P.toArray() });
    }
    // 4. textures: every picture on a visible surface arrived and is not black
    counts.textures = 0;
    const seenT = new Set(), cv = document.createElement('canvas'); cv.width = cv.height = 16; const cx = cv.getContext('2d', { willReadFrequently: true });
    const texOf = mat => { const o = ['map', 'emissiveMap'].map(k => [k, mat[k]]); if (mat.uniforms) for (const [k, u] of Object.entries(mat.uniforms)) [].concat(u && u.value).forEach(v => v && v.isTexture && !v.isRenderTargetTexture && !v.isDepthTexture && o.push([k, v])); return o; };
    for (const m of all) for (const mat of [].concat(m.material || [])) for (const [k, t] of texOf(mat)) {
      if (!t || seenT.has(t) || ['shadow', 'mirror'].includes(m.userData.kind) || /light|^ao|shadow|env|mask|noise|depth/i.test(k)) continue; seenT.add(t); counts.textures++;
      const im = t.image, w = im && (im.width || im.videoWidth), name = (t.userData && t.userData.src) || (im && im.currentSrc) || (im && im.src) || '';
      if (/^https?:/.test(name)) (counts.used = counts.used || []).push(name);
      if (!im || !w) { flags.push({ check: 'texture missing', what: `${m.userData.kind || 'a surface'} ${k}`, value: 'no picture', src: name }); continue; }
      try { cx.clearRect(0, 0, 16, 16); cx.drawImage(im, 0, 0, 16, 16); const d = cx.getImageData(0, 0, 16, 16).data; let mx = 0, a = 0; for (let i = 0; i < d.length; i += 4) { mx = Math.max(mx, d[i], d[i + 1], d[i + 2]); a += d[i + 3]; }
        if (mx < 10 && a / 256 > 200) flags.push({ check: 'texture black', what: `${m.userData.kind || 'a surface'} ${k}`, value: `brightest of 16x16: ${mx}/255`, src: String(name).slice(-80) }); } catch {}
    }
    for (const w of window.__spaceView.inspect.works()) if (!w.image[0] && w.visible) flags.push({ check: 'texture missing', what: `the work "${w.title}"`, value: 'its image never arrived' });
    return { flags, counts };
  };
  // the room's works by title, with their centres and facing (to find a pavilion's frame from its tour's)
  R.workList = () => (R.spec.works || []).map(w => ({ t: w.work || w.title, c: w.centre, n: w.axes && w.axes[2] }));
}

// --- image work (decode, compare, side by side), in a blank page with a canvas -----------------------------------------
async function imgPage(b) {
  const p = await b.newPage();
  await p.setContent('<canvas></canvas>');
  await p.evaluate(() => {
    const load = async b64 => { const im = new Image(); im.src = 'data:image/jpeg;base64,' + b64; await im.decode(); return im; };
    const data = im => { const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const x = c.getContext('2d'); x.drawImage(im, 0, 0); return x.getImageData(0, 0, c.width, c.height); };
    // the middle of the screen (the viewer's controls are above and below it): mean colour, brightness, and gloss = the
    //   detail in the floor's band (a reflecting floor carries the room's edges; a matte one is smooth)
    window.stats = async b64 => { const d = data(await load(b64)), W = d.width, H = d.height, px = d.data;
      let r = 0, g = 0, bl = 0, n = 0; for (let y = Math.round(H * 0.16); y < H * 0.78; y += 2) for (let x = 0; x < W; x += 2) { const i = (y * W + x) * 4; r += px[i]; g += px[i + 1]; bl += px[i + 2]; n++; }
      let e = 0, m = 0; const L = (x, y) => { const i = (y * W + x) * 4; return 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2]; };
      for (let y = Math.round(H * 0.58); y < H * 0.78; y += 2) for (let x = 1; x < W - 1; x += 2) { e += Math.abs(L(x + 1, y) - L(x - 1, y)) + Math.abs(L(x, y + 1) - L(x, y - 1)); m++; }
      r /= n; g /= n; bl /= n; return { r, g, b: bl, luma: 0.299 * r + 0.587 * g + 0.114 * bl, gloss: e / m }; };
    window.diff = async (a, b) => { const A = data(await load(a)), B = data(await load(b)); if (A.width !== B.width || A.height !== B.height) return 1; let s = 0; for (let i = 0; i < A.data.length; i += 16) s += Math.abs(A.data[i] - B.data[i]) + Math.abs(A.data[i + 1] - B.data[i + 1]) + Math.abs(A.data[i + 2] - B.data[i + 2]); return s / (A.data.length / 16) / 765; };
    window.pair = async (a, b, la, lb) => { const A = await load(a), B = await load(b), c = document.createElement('canvas'); c.width = A.width + B.width + 8; c.height = Math.max(A.height, B.height) + 34; const x = c.getContext('2d');
      x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(A, 0, 34); x.drawImage(B, A.width + 8, 34); x.fillStyle = '#111'; x.font = '600 15px system-ui'; x.fillText(la, 8, 22); x.fillText(lb, A.width + 16, 22);
      return c.toDataURL('image/jpeg', 0.7).split(',')[1]; };
  });
  return p;
}

// --- one space: open it as a visitor, walk its viewpoints ----------------------------------------------------------------
async function visit(b, { key, hash, views, plant, extra }) {
  // (the proof blocks the app's service worker: a request it answers never reaches the robot's planted answers)
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true, serviceWorkers: plant ? 'block' : 'allow' });
  const p = await ctx.newPage(), errors = [], failed = [], images = [];
  p.on('pageerror', e => errors.push('script error: ' + String(e.message).slice(0, 200)));
  p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push('console: ' + m.text().slice(0, 200)); });
  p.on('response', r => { if (r.status() >= 400) failed.push(`${r.status()} ${r.url().replace(BASE, '').slice(0, 120)}`); else if (/^image\//.test(r.headers()['content-type'] || '')) images.push(r.url()); });
  p.on('requestfailed', r => { const f = r.failure(); if (!/ERR_ABORTED/.test(f && f.errorText || '') || plant) failed.push(`failed ${r.url().replace(BASE, '').slice(0, 120)}`); });
  await p.addInitScript(hooks, BASE);
  // (ROBOT_MEDIA=<site>: a local copy of the app takes the works' pictures, /media/, from that site: for calibrating against a branch)
  if (process.env.ROBOT_MEDIA) await p.route(/\/media\//, async r => { try { r.fulfill({ response: await r.fetch({ url: process.env.ROBOT_MEDIA.replace(/\/$/, '') + new URL(r.request().url()).pathname }) }); } catch { r.abort().catch(() => {}); } });
  if (plant) await plant.before(p);
  const t0 = Date.now();
  const out = { key, hash, views: [], errors, failed, load: {}, notes: [] };
  try {
    await p.goto(BASE + `?guest&hour=${HOUR}` + hash, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await p.waitForFunction(() => window.__spaceView && window.__spaceView.inspect && window.__robot.scene, null, { timeout: 420000, polling: 250 });
    const firstMs = await p.evaluate(() => Math.round(window.__robot.first));
    await p.waitForFunction(() => { const l = document.querySelector('.sv .sv-loading'); return !l || l.hidden; }, null, { timeout: 300000, polling: 250 });
    out.load = { first: firstMs, ready: Date.now() - t0 };
    const atOpen = images.length;                                  // (the pictures the room asked for as it opened)
    if (plant && plant.ready) await plant.ready(p);
    // the camera as the room opens: a lens or a look that is not a number a person could see through is a broken first view
    //   (24.11: the live Ritual tour opened now and then with fov -53848 and its look 500 km away, settling after ~6 s)
    const cam = await p.evaluate(async () => { const I = window.__spaceView.inspect, bad = []; let first = null, ok = 0; const t0 = performance.now();
      while (performance.now() - t0 < 20000) { const w = I.where(), d = Math.hypot(w.look[0] - w.pos[0], w.look[1] - w.pos[1], w.look[2] - w.pos[2]);
        const sane = w.fov > 10 && w.fov < 130 && d < 1000 && w.look.every(Number.isFinite);
        if (!sane) { bad.push(Math.round(w.fov)); first = first || Math.round(performance.now() - t0); ok = 0; } else if (++ok >= 4 && performance.now() - t0 > 3000) break;
        await new Promise(r => setTimeout(r, 250)); }
      return { bad: bad.length, worstFov: bad.length ? bad.sort((a, b) => Math.abs(b) - Math.abs(a))[0] : null, settled: Math.round(performance.now() - t0) }; });
    out.camera = cam;
    await p.evaluate(lib);
    await p.waitForTimeout(5000);
    if (plant) await plant.after(p);
    const info = await p.evaluate(() => ({ start: window.__spaceView.inspect.start, works: window.__robot.workList(), dir: (window.__robot.spec.directory || []).map(d => ({ title: d.title, kind: d.kind, at: d.at, look: d.look })), pieces: window.__spaceView.inspect.pieces.map(q => ({ title: q.title, centre: q.centre, stand: q.stand, facing: q.facing, span: Math.max(q.size.w, q.size.h) / 100 })), full: Object.fromEntries(window.__spaceView.inspect.tiers().filter(t => t.full).map(t => [t.title, t.full])), fov: window.__spaceView.inspect.where().fov }));
    out.info = info;
    out.info.images = [...new Set(images.slice(0, atOpen))];
    out.info.tex = await p.evaluate(() => [...new Set((window.__robot.spec.surfaces || []).map(q => q.texture).filter(t => typeof t === 'string' && /\.(jpe?g|webp|png)$/.test(t) && !/^data:|^blob:/.test(t)))].slice(0, 6));
    if (!views) { views = extra && extra.seed ? extra.seed(info) : seedTour(info); out.seeded = true; }
    for (const v of [...views, ...((extra && extra.more) ? extra.more(info) : [])]) out.views.push(await look(p, key, v, errors, failed));
    out.physics = await p.evaluate(l => window.__robot.physics(l), LIMIT);
    out.stats = await p.evaluate(() => window.__spaceView.inspect.stats());
  } catch (e) { out.fatal = String(e.message || e).split('\n')[0].slice(0, 300); log('  !', key, out.fatal); }
  await ctx.close();
  return out;
}
async function look(p, key, v, errors, failed) {
  const e0 = errors.length, f0 = failed.length;
  await p.evaluate(([a, l]) => window.__spaceView.inspect.place(a, l), [v.eye, v.look]);
  await p.waitForTimeout(6000);                                     // (the sharper pictures come in one by one, as on a phone)
  const ft = await p.evaluate(([a, l]) => window.__robot.frameTime(a, l), [v.eye, v.look]);
  await p.waitForTimeout(2500);
  const m = await p.evaluate(([a, l, near]) => window.__robot.sharp(a, l, near).then(s => ({ sharp: s, memory: window.__spaceView.inspect.memory(), stats: window.__spaceView.inspect.stats() })), [v.eye, v.look, LIMIT.near]);
  const jpg = await p.screenshot({ type: 'jpeg', quality: 62, scale: 'css' });
  const id = `${key}--${v.id}`.replace(/[^a-z0-9-]+/gi, '-');
  return { id, name: v.name || v.id, eye: v.eye, look: v.look, frame: ft, memory: m.memory, calls: m.stats.calls, triangles: m.stats.triangles, sharp: m.sharp, errors: errors.slice(e0), failed: failed.slice(f0), jpg: jpg.toString('base64'), local: v.local };
}

// --- viewpoints: fixed in viewpoints.json; a space seen for the first time is seeded, then kept ------------------------
function seedTour(info) {
  const v = [{ id: 'start', name: 'the way in', eye: info.start.pos, look: info.start.look }], P = info.pieces;
  const pick = P.length <= 3 ? P : [P[Math.floor(P.length * 0.15)], P[Math.floor(P.length * 0.5)], P[Math.floor(P.length * 0.85)]];
  pick.forEach((q, k) => { const back = [q.stand[0] + (q.stand[0] - q.centre[0]) * 0.6, 1.6, q.stand[2] + (q.stand[2] - q.centre[2]) * 0.6];
    v.push({ id: 'work-' + (k + 1), name: q.title, eye: back.map(r2), look: [r2(q.centre[0]), r2(q.centre[1]), r2(q.centre[2])] }); });
  return v;
}
function seedMuseum(info) {
  return info.dir.filter(d => d.at && d.look).map((d, k) => ({ id: (d.kind + '-' + d.title).toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40), name: d.title,
    eye: [r2(d.at[0]), 1.6, r2(d.at[1])], look: [r2(d.look[0]), 1.7, r2(d.look[1])] }));
}
// a pavilion's frame: the 2D rigid motion (with a possible mirror) that takes the tour's works to the museum's
function fitFrame(src, dst) {
  const pairs = []; for (const a of src) { const b = dst.find(x => x.t === a.t && !x.used); if (b) { b.used = true; pairs.push([a, b]); } } dst.forEach(x => delete x.used);
  if (pairs.length < 2) return null;
  const best = [1, -1].map(mir => {
    const A = pairs.map(([a]) => [a.c[0] * mir, a.c[2]]), B = pairs.map(([, b]) => [b.c[0], b.c[2]]), n = A.length;
    const ca = A.reduce((s, q) => [s[0] + q[0] / n, s[1] + q[1] / n], [0, 0]), cb = B.reduce((s, q) => [s[0] + q[0] / n, s[1] + q[1] / n], [0, 0]);
    let sc = 0, ss = 0; A.forEach((q, i) => { const x = q[0] - ca[0], z = q[1] - ca[1], X = B[i][0] - cb[0], Z = B[i][1] - cb[1]; sc += x * X + z * Z; ss += x * Z - z * X; });
    const th = Math.atan2(ss, sc), c = Math.cos(th), s = Math.sin(th);
    const map = ([x, y, z]) => { const u = x * mir - ca[0], w = z - ca[1]; return [cb[0] + u * c - w * s, y, cb[1] + u * s + w * c]; };
    let err = 0; pairs.forEach(([a, b]) => { const q = map(a.c); err += Math.hypot(q[0] - b.c[0], q[2] - b.c[2]); });
    // (works on one wall are in a line: the mirror is then told by which way the works face)
    let face = 0; pairs.forEach(([a, b]) => { if (a.n && b.n) { const o = map([a.c[0] + a.n[0], 0, a.c[2] + a.n[2]]), z = map([a.c[0], 0, a.c[2]]); face += (o[0] - z[0]) * b.n[0] + (o[2] - z[2]) * b.n[2]; } });
    return { mir, th, map, err: err / pairs.length, face, n: pairs.length };
  }).sort((p, q) => (p.err - q.err) || (q.face - p.face));
  const f = Math.abs(best[0].err - best[1].err) < 0.05 ? (best[0].face >= best[1].face ? best[0] : best[1]) : best[0];
  return f.err < 0.25 ? f : null;
}

(async () => {
  const T0 = Date.now(), date = new Date().toISOString().slice(0, 10);
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const img = await imgPage(b);
  const get = u => fetch(BASE + u).then(r => r.ok ? r.json() : null).catch(() => null);
  // every published tour: the photographed ones (data/spaces/index.json) and the app's virtual ones (data/virtual.json)
  const index = (await get('data/spaces/index.json')) || {}, virtual = (await get('data/virtual.json')) || {};
  const tours = [...Object.keys(index), ...((virtual.shows || []).map(s => s.slug).filter(Boolean))];
  tours.sort((a, c) => (a === 'ritual' ? -1 : c === 'ritual' ? 1 : 0));
  const res = { date, base: BASE, hour: HOUR, budget: BUDGET, limit: LIMIT, spaces: [], pavilions: [], proof: null };
  const tourWorks = {};
  for (const slug of tours) {
    if (ONLY.length && !ONLY.includes(slug)) continue;
    log('tour', slug);
    const r = await visit(b, { key: slug, hash: `#/exhibition/${slug}/space`, views: VP.tours[slug] });
    if (r.seeded && !r.fatal) { VP.tours[slug] = r.views.map(v => ({ id: v.id.replace(slug + '--', ''), name: v.name, eye: v.eye, look: v.look })); seeded = true; }
    if (r.info) tourWorks[slug] = r.info.works;
    res.spaces.push({ ...r, kind: 'tour' });
  }
  if (!ONLY.length || ONLY.includes('museum')) {
    log('museum');
    // the pavilions: a room of the museum whose works are a tour's works, in the tour's own arrangement (Ritual first)
    const pav = [];
    const more = info => {
      const out = [];
      for (const [slug, works] of Object.entries(tourWorks)) {
        const f = fitFrame(works, info.works.map(w => ({ ...w }))); if (!f) continue;
        if (!VP.pavilions[slug]) { VP.pavilions[slug] = { note: 'in the tour own coordinates; the robot finds the pavilion by its works', views: (VP.tours[slug] || []).map(v => ({ id: v.id, name: v.name, eye: v.eye, look: v.look })) }; seeded = true; }
        pav.push({ slug, frame: { mirror: f.mir, turn: Math.round(f.th * 180 / Math.PI), error: r2(f.err), works: f.n } });
        for (const v of VP.pavilions[slug].views) out.push({ slug, id: 'pavilion-' + slug + '-' + v.id, name: `${slug} in the museum: ${v.name}`, eye: f.map(v.eye).map(r2), look: f.map(v.look).map(r2), local: { slug, id: v.id } });
      }
      pav.sort((a, c) => (a.slug === 'ritual' ? -1 : c.slug === 'ritual' ? 1 : 0));
      return out.sort((a, c) => (a.slug === 'ritual' ? -1 : c.slug === 'ritual' ? 1 : 0));
    };
    const m = await visit(b, { key: 'museum', hash: '#/museum', views: VP.museum && VP.museum.length ? VP.museum : null, extra: { seed: seedMuseum, more } });
    if (m.seeded && !m.fatal) { VP.museum = m.views.filter(v => !v.local).map(v => ({ id: v.id.replace('museum--', ''), name: v.name, eye: v.eye, look: v.look })); seeded = true; }
    res.spaces.push({ ...m, kind: 'museum' });
    // side by side: each pavilion view beside the same view in its own tour
    for (const q of pav) {
      const tour = res.spaces.find(s => s.key === q.slug), rows = [];
      for (const mv of m.views.filter(v => v.local && v.local.slug === q.slug)) {
        const tv = tour && tour.views.find(v => v.id === `${q.slug}--${mv.local.id}`); if (!tv) continue;
        const [A, B] = [await img.evaluate(x => window.stats(x), tv.jpg), await img.evaluate(x => window.stats(x), mv.jpg)];
        const bright = (B.luma - A.luma) / Math.max(1, A.luma), colour = Math.hypot((B.r - B.g) - (A.r - A.g), (B.b - B.g) - (A.b - A.g)), gloss = B.gloss / Math.max(0.01, A.gloss);
        const flags = [];
        if (Math.abs(bright) > LIMIT.bright) flags.push(`brightness ${bright > 0 ? '+' : ''}${Math.round(bright * 100)}%`);
        if (colour > LIMIT.colour) flags.push(`colour shifted by ${Math.round(colour)} levels`);
        if (gloss < LIMIT.gloss[0] || gloss > LIMIT.gloss[1]) flags.push(`surface detail x${gloss.toFixed(2)} (floor gloss or wall grain)`);
        const pair = await img.evaluate(([a, c, la, lb]) => window.pair(a, c, la, lb), [tv.jpg, mv.jpg, 'the tour', 'in the museum']);
        rows.push({ id: `pair-${q.slug}-${mv.local.id}`, name: mv.name, tour: A, museum: B, bright: r2(bright), colour: r1(colour), gloss: r2(gloss), flags, jpg: pair });
      }
      res.pavilions.push({ ...q, rows });
    }
    // the proof: the same museum again, with a known bug of each kind put in; every check must catch its own
    if (PROVE) res.proof = await prove(b, img, m, res);
  }
  await b.close();
  res.seconds = Math.round((Date.now() - T0) / 1000);
  if (seeded) { fs.writeFileSync(VP_FILE, JSON.stringify(VP, null, 1)); }
  const prevFile = fs.readdirSync(HIST).filter(f => f.endsWith('.json') && f.slice(0, 10) < date).sort().pop();
  const prev = prevFile ? JSON.parse(fs.readFileSync(path.join(HIST, prevFile), 'utf8')) : null;
  const sum = await writeReport(res, prev, { OUT, SHOTS, HIST, img });
  console.log(sum.line);
})().catch(e => { console.log('FAIL robot: ' + String(e.stack || e).slice(0, 600)); process.exit(1); });

// --- the planted bugs --------------------------------------------------------------------------------------------------
const BLACK = Buffer.from('/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCABAAEADASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD5UooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooA//2Q==', 'base64');      // (a real 64 px black JPEG)
async function prove(b, img, clean, res) {
  log('proof: the museum with a bug of each kind put in');
  const spec0 = clean.info || {}, walls = ((clean.info && clean.info.images) || []).map(u => decodeURI(u).replace(/^https?:\/\/[^/]+/, '')).filter(u => /\/data\/(spaces|rooms|museum)\//.test(u) && !/\/works\/|thumb|icon/.test(u) && /wall|plaster|concrete|painted|clay|stone|floor/i.test(u));
  const used = new Set(((clean.physics && clean.physics.counts.used) || []).map(u => decodeURI(u).replace(/^https?:\/\/[^/]+/, '').split('?')[0]));
  const drawnWalls = walls.filter(u => used.has(u.split('?')[0]));
  const pick = drawnWalls.length >= 2 ? drawnWalls : walls;
  const plan = { tex: pick.length >= 2 ? [pick[0], pick[1]] : ((clean.info && clean.info.tex) || []) };
  const plant = {
    before: async p => {
      // (a) a wall text 15 cm off its wall; (b) a wall built across the first walkable opening; (c) one wall picture gone, one black
      await p.addInitScript(tex => {
        window.__robotPlantSpec = s => {
          const P = window.__robotPlanted = { missing: tex[0], black: tex[1] };
          const h = (s.hotspots || []).find(x => x.kind === 'text' && x.origin);
          if (h) { const sf = s.surfaces.find(q => q.origin && q.origin.every((v, i) => Math.abs(v - h.origin[i]) < 1e-6) && q.size && q.size[0] === h.size[0]);
            const mv = o => o.map((v, i) => v + h.normal[i] * 0.15); h.origin = mv(h.origin); if (sf) sf.origin = mv(sf.origin); P.text = h.title || h.id; }
          for (const q of s.surfaces) { const op = (q.openings || []).find(o => o.through && !(o.sill > 0.05) && o.height >= 2 && o.to - o.from >= 0.8); if (!op) continue;
            const m = (op.from + op.to) / 2, w = op.to - op.from + 0.3, o = q.origin.map((v, i) => v + q.u[i] * (m - w / 2) + q.normal[i] * 0.05);
            s.surfaces.push({ name: 'robot-block', kind: 'wall', texture: q.texture, origin: [o[0], q.origin[1], o[2]], u: q.u, v: q.v, size: [w, q.size[1]], normal: q.normal, openings: [] });
            P.opening = `${q.name} ${op.arch ? 'arch' : 'doorway'} ${(op.to - op.from).toFixed(1)} m`; break; }
        };
      }, plan.tex);
      await p.route(/./, async r => {
        const u = r.request().url();
        const d = decodeURI(u).split('?')[0], hit = x => x && d.endsWith(x.replace(/^\.?\//, ''));
        if (hit(plan.tex[0])) return r.fulfill({ status: 404, body: '' });
        if (hit(plan.tex[1])) return r.fulfill({ status: 200, contentType: 'image/jpeg', body: BLACK });
        // (e) the sharp picture of the nearest work of the first view never arrives
        if (plan.full && decodeURI(u).includes(plan.full)) return r.abort();
        return r.continue();
      });
    },
    // (j) the camera's lens thrown out as the room opens, as seen on the live tour on 24.11 (the viewer's own smoothing brings it back)
    ready: async p => { await p.evaluate(() => { const c = window.__robot.cam; if (c) { c.fov = -50000; c.updateProjectionMatrix(); } }); },
    after: async p => {
      // (f) a plinth lifted 30 cm off the floor; (g) a script error; (h) three big pictures put into memory; (i) the canvas brightened (the side by side)
      plan.after = await p.evaluate(() => {
        const R = window.__robot, T = R.T; let lifted = null;
        R.scene.traverse(m => { if (!lifted && m.isMesh && m.userData.kind === 'plinth') { m.position.y += 0.3; m.updateMatrixWorld(true); lifted = m.getWorldPosition(new T.Vector3()).toArray().map(v => Math.round(v * 10) / 10); } });
        setTimeout(() => { throw new Error('robot planted error'); }, 10);
        let wall = null; R.scene.traverse(m => { if (!wall && m.isMesh && m.userData.kind === 'wall' && m.material && !Array.isArray(m.material)) wall = m; });
        const ts = [0, 1, 2].map(() => { const c = document.createElement('canvas'); c.width = c.height = 4096; const t = new T.CanvasTexture(c); return t; });
        if (wall) { wall.material = wall.material.clone(); wall.material.map = ts[0]; wall.material.emissiveMap = ts[1]; wall.material.normalMap = ts[2]; }
        const st = document.createElement('style'); st.textContent = '.sv canvas{filter:brightness(1.6)}'; document.head.appendChild(st);
        return { lifted, planted: window.__robotPlanted };
      });
    },
  };
  // the views: the first pavilion view (or the first view), and 0.6 m from the largest work, whose sharp picture is blocked
  const v0 = clean.views.find(v => v.local) || clean.views[0];
  const strip = u => decodeURI(String(u || '')).replace(/^https?:\/\/[^/]+/, '').replace(/^\.?\//, '') || null;
  const big = (spec0.pieces || []).filter(q => q.facing && spec0.full && spec0.full[q.title]).sort((a, c) => c.span - a.span)[0];
  if (big) { plan.title = big.title; plan.full = strip(spec0.full[big.title]); }
  const views = v0 ? [{ id: v0.id.replace('museum--', ''), name: v0.name, eye: v0.eye, look: v0.look, local: v0.local }] : [];
  const pc = (spec0.pieces || []).find(q => q.title === plan.title);
  if (pc && pc.facing) views.push({ id: 'close', name: `0.6 m from "${pc.title}"`, eye: [pc.centre[0] + pc.facing[0] * 0.6, 1.6, pc.centre[2] + pc.facing[2] * 0.6], look: pc.centre });
  const r = await visit(b, { key: 'proof', hash: '#/museum', views, plant });
  const flags = (r.physics && r.physics.flags) || [], vv = r.views[0] || {}, P = (plan.after && plan.after.planted) || {};
  let brightSeen = null;
  if (vv.jpg && v0 && v0.jpg) { const A = await img.evaluate(x => window.stats(x), v0.jpg), B = await img.evaluate(x => window.stats(x), vv.jpg); brightSeen = r2((B.luma - A.luma) / Math.max(1, A.luma)); }
  const near2 = ((r.views[1] || {}).sharp || []).find(s => s.title === plan.title);
  log('proof saw: planted textures', plan.tex.join(' , '), '| failed', r.failed.slice(0, 4).join(' ; '), '| texture flags', flags.filter(f => /texture/.test(f.check)).length, '| sharp', plan.title, plan.full, JSON.stringify(near2 || null));
  const rows = [
    { check: 'floating', planted: `a plinth lifted 30 cm${plan.after && plan.after.lifted ? ' at (' + plan.after.lifted[0] + ', ' + plan.after.lifted[2] + ')' : ''}`, caught: flags.some(f => f.check === 'floating' && /cm above|nothing/.test(f.value) && plan.after && plan.after.lifted && Math.hypot(f.at[0] - plan.after.lifted[0], f.at[2] - plan.after.lifted[2]) < 1.5) },
    { check: 'text not flush', planted: `"${P.text}" moved 15 cm off its wall`, caught: !!P.text && flags.some(f => f.check === 'text not flush' && f.what.includes(P.text)) },
    { check: 'opening blocked', planted: `a wall across ${P.opening}`, caught: !!P.opening && flags.some(f => f.check === 'opening blocked' && f.what === P.opening) },
    { check: 'texture missing', planted: `${plan.tex[0]} answers 404`, caught: !!plan.tex[0] && (flags.some(f => f.check === 'texture missing') || r.failed.some(x => plan.tex[0].endsWith(x.replace(/^\d+ /, '').replace(/^\.?\//, '')))) },
    { check: 'texture black', planted: `${plan.tex[1]} answers a black picture`, caught: !!plan.tex[1] && flags.some(f => f.check === 'texture black') },
    { check: 'console errors', planted: 'a script error thrown', caught: r.errors.some(e => e.includes('robot planted error')) },
    { check: 'memory', planted: 'three 4096 px pictures put on a wall (+268 MB)', caught: (vv.memory || 0) > BUDGET.memory, value: vv.memory },
    { check: 'sharpness', planted: `the sharp picture of "${plan.title || '?'}" never arrives`, caught: !!near2 && near2.ratio < LIMIT.soft, value: near2 ? `${near2.cur} px of ${near2.src}` : 'not in view' },
    { check: 'camera at open', planted: 'the lens thrown to -50000 deg as the room opens', caught: !!(r.camera && r.camera.bad), value: r.camera ? r.camera.worstFov : null },
    { check: 'side by side (brightness)', planted: 'the canvas brightened 1.6x', caught: brightSeen !== null && brightSeen > LIMIT.bright, value: brightSeen },
  ];
  if (r.fatal) rows.forEach(x => { x.caught = false; x.value = r.fatal; });
  log('proof:', rows.map(x => `${x.check} ${x.caught ? 'caught' : 'MISSED'}`).join(', '));
  return { rows, jpg: vv.jpg, flags: flags.length };
}
