// The exhibition importer: one real exhibition's 3D tour -> a DRAFT pavilion of the museum, with its quality gate.
// Spec: studio/design/museum-sky/IMPORTER.md. No AI calls: everything is measured from the tour and the museum's geometry.
// It never writes to the database or to SKY_PLAN: the draft waits in data/museum/drafts/ for the owner's approval on the Desk.
//   node studio/app/space/importer/import.cjs <slug>      ROOT=<folder served as the site root, default the repo>  PORT=<default: any free port>
//   (playwright: NODE_PATH=$(npm root -g) when it is installed globally)
const fs = require('fs'), path = require('path'), http = require('http');
const { chromium } = require('playwright');
const REPO = path.resolve(__dirname, '../../../..'), ROOT = path.resolve(process.env.ROOT || REPO), PORT = +(process.env.PORT || 0);
const APP = path.join(ROOT, 'studio/app'); let BASE = '';
const OUT_ROOT = path.join(REPO, 'studio/app/data/museum/drafts');
const DB = 'https://hlpzqeosdavfuzjgpwhy.supabase.co/rest/v1/', KEY = 'sb_publishable_VKboaeE8UE3iwVKhyr4FSA_faDO17fu';      // (the app's public key: reads only)
const BUDGET = 460;                                   // MB of pictures a phone holds in the museum (NIGHT.md)
const slug = process.argv[2];
if (!slug) { console.error('usage: import.cjs <slug>'); process.exit(2); }

// ---- a picture's pixel size from its file (jpeg, png, webp), for px/m ----
function imgSize(file) {
  const b = fs.readFileSync(file);
  if (b[0] === 0x89 && b[1] === 0x50) return [b.readUInt32BE(16), b.readUInt32BE(20)];
  if (b.slice(0, 4).toString() === 'RIFF') { const t = b.slice(12, 16).toString(); if (t === 'VP8X') return [1 + b.readUIntLE(24, 3), 1 + b.readUIntLE(27, 3)];
    if (t === 'VP8 ') return [b.readUInt16LE(26) & 0x3fff, b.readUInt16LE(28) & 0x3fff]; if (t === 'VP8L') { const n = b.readUInt32LE(21); return [1 + (n & 0x3fff), 1 + ((n >> 14) & 0x3fff)]; } }
  let i = 2; while (i < b.length) { if (b[i] !== 0xff) { i++; continue; } const m = b[i + 1], L = b.readUInt16BE(i + 2); if (m >= 0xc0 && m <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(m)) return [b.readUInt16BE(i + 7), b.readUInt16BE(i + 5)]; i += 2 + L; }
  return null;
}
const local = u => typeof u === 'string' && !/^(data:|https?:)/.test(u) ? path.join(APP, u) : null;
const sizeOfUrl = u => { const f = local(u); try { return f && fs.existsSync(f) ? imgSize(f) : null; } catch { return null; } };

// ---- a static server for the folder ----
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.css': 'text/css', '.mp4': 'video/mp4', '.webm': 'video/webm', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json' };
const server = http.createServer((q, r) => { let p = decodeURIComponent(q.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html'; const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream', 'cache-control': 'no-store' }); fs.createReadStream(f).pipe(r); });

(async () => {
  const F = await import(path.join(__dirname, 'frame.mjs').replace(/\\/g, '/').replace(/^([A-Z]):/i, 'file:///$1:'));
  const out = path.join(OUT_ROOT, slug); fs.mkdirSync(out, { recursive: true });
  const gate = [], say = (id, pass, why, data) => { gate.push({ id, pass: !!pass, why, ...(data ? { data } : {}) }); console.log(`${pass ? 'PASS' : 'FAIL'} ${id}: ${why}`); };
  const errors = [];

  // ================= 1. the tour, read =================
  const tourFile = path.join(APP, 'data/spaces', slug + '.json');
  if (!fs.existsSync(tourFile)) { console.error(`no tour: data/spaces/${slug}.json`); process.exit(2); }
  const tour = JSON.parse(fs.readFileSync(tourFile, 'utf8'));
  const status = fs.existsSync(path.join(APP, 'data/spaces', slug + '.status.json')) ? JSON.parse(fs.readFileSync(path.join(APP, 'data/spaces', slug + '.status.json'), 'utf8')) : { state: 'unknown', items: [] };
  const exhibitions = JSON.parse(fs.readFileSync(path.join(ROOT, 'content/exhibitions.json'), 'utf8'));
  const slugify = s => String(s).toLowerCase().normalize('NFKD').replace(/[^\w\s-]/g, '').trim().replace(/[\s_]+/g, '-').replace(/-+/g, '-');
  const ex = (Array.isArray(exhibitions) ? exhibitions : exhibitions.exhibitions || []).find(e => slugify(e.title) === slug) || null;
  const ops = F.openingsOf(tour), door = F.doorOf(tour);
  const tourWalls = tour.surfaces.filter(s => s.kind === 'wall' && s.texture).map(s => { const z = sizeOfUrl(s.texture); return { name: s.name, len: s.size[0], px: z ? z[0] : null, pxm: z ? z[0] / s.size[0] : null, light: !!s.light }; });
  const tfl = tour.surfaces.find(s => s.kind === 'floor'), tflSize = tfl && sizeOfUrl(tfl.texture), tflTile = tfl ? (tfl.tileXY || [tfl.tile || tfl.size[0], tfl.tile || tfl.size[1]]) : null;
  const tourFloorPxm = tflSize && tflTile ? tflSize[0] / Math.min(tflTile[0], tfl.size[0]) : null;
  const measures = { room: tour.room, openings: ops.map(o => ({ wall: o.wall, shape: o.arch ? 'arch' : 'doorway', w: +o.w.toFixed(2), h: o.height, sill: o.sill, walkable: o.walkable })),
    walls: tourWalls, floor: tfl ? { texture: tfl.texture, px: tflSize, tile: tflTile, pxm: tourFloorPxm && Math.round(tourFloorPxm), light: !!tfl.light } : null,
    works: (tour.works || []).map(w => ({ title: w.title, size: w.size || w.measured || null })), floorReflect: tour.floorReflect || null };
  console.log(`tour ${slug}: ${tour.room.x1 - tour.room.x0 | 0} x ${tour.room.z1 - tour.room.z0 | 0} m, ${ops.length} openings (${ops.filter(o => o.walkable).length} walkable), ${(tour.works || []).length} works, status ${status.state}`);

  say('tour_live', status.state === 'live', status.state === 'live' ? 'the tour passed its own build and inspection' : `the tour has not passed its own checks (state "${status.state}"): ` + (status.items || []).filter(i => i[0] === 'no').map(i => i[1].split('.')[0]).join('; '));
  const otherWalk = ops.filter(o => o.walkable && o.wall !== door.wall);
  say('real_openings', door.real && !otherWalk.length, door.real ? (otherWalk.length ? `walkable openings on ${[...new Set(otherWalk.map(o => o.wall))].join(', ')} would not lead into the museum (only the door wall's do)` : `${door.ways.length} real opening(s) on ${door.wall}: ${door.ways.map(w => (w.arch ? 'arch ' : 'doorway ') + w.w.toFixed(2) + ' x ' + w.height.toFixed(2) + ' m').join(', ')}`)
    : 'the tour has no measured walkable opening (arch or doorway); the importer will not invent one (the pavilion code would cut a 1.9 m door into wall-z0)');

  // ================= 2. the museum as it is (read only) =================
  let livePlan = null;
  for (let k = 0; k < 4; k++) { try { const r = await fetch(DB + 'museum_plan?select=plan&key=eq.main', { headers: { apikey: KEY } }); const j = await r.json(); livePlan = (j[0] && j[0].plan) || null; break; }
    catch (e) { if (k === 3) errors.push('could not read museum_plan: ' + e.message); else await new Promise(res => setTimeout(res, 2000 * (k + 1))); } }
  await new Promise(res => server.listen(PORT, res)); BASE = `http://localhost:${server.address().port}/studio/app/`;
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  const stage = await ctx.newPage(); stage.on('pageerror', e => errors.push('stage: ' + e.message));
  await stage.goto(BASE + 'space/importer/stage.html');
  const geo = await stage.evaluate(async ({ slug, livePlan }) => {
    const S = await import('./space/synth.js');
    const plan = S.planOf(livePlan), spaces = plan.spaces.filter(s => s.tour !== slug);
    const sj = await (await fetch('data/museum/sections.json')).json();
    const sections = await Promise.all((sj.sections || []).filter(s => !s.hidden).map(async s => { const list = await (await fetch(s.folder + '/credits.json')).json(), credits = {};
      for (const c of list) credits[c.slug] = { ...c, image: `${s.folder}/works/${c.slug}.jpg`, thumb: `${s.folder}/works/${c.slug}-s.jpg` }; return { ...s, credits }; }));
    // every house of the plan counts as built (an empty slot may be filled any day); a house with a tour is built with its own room
    const rooms = [];
    for (const sp of spaces.filter(s => s.type === 'house')) {
      const t = sp.tour ? await (await fetch(`data/spaces/${sp.tour}.json`)).json().catch(() => null) : null;
      rooms.push({ slug: sp.id, slot: sp.slot, title: sp.id, works: [], text: [], colour: '#8a8a8a', ...(t ? { original: { spec: t } } : {}) });
    }
    const made = await S.buildSky(rooms, u => u, w => w.image, { plan: { ...plan, spaces }, sections });
    const sp = made.spec, flat = sp.surfaces.filter(s => Math.abs(s.normal[1]) > 0.9 && s.name !== 'hall-floor' && !/^(roof|sky|hall-ceil|ceil)/.test(s.name) && s.origin[1] < 1 && s.size[0] * s.size[1] < plan.hall.w * plan.hall.d * 0.5)
      .map(s => [[0, 0], [1, 0], [1, 1], [0, 1]].map(([a, b]) => [s.origin[0] + s.u[0] * s.size[0] * a + s.v[0] * s.size[1] * b, s.origin[2] + s.u[2] * s.size[0] * a + s.v[2] * s.size[1] * b]));
    const fronts = spaces.map(s => s.type === 'house' ? (() => { const a = s.dir * Math.PI / 180; return [s.door[0] - Math.cos(a) * 2.5, s.door[1] - Math.sin(a) * 2.5]; })() : [s.door[0] - s.dir[0] * 2.5, s.door[1] - s.dir[1] * 2.5]);
    const flatNames = sp.surfaces.filter(s => Math.abs(s.normal[1]) > 0.9 && s.name !== 'hall-floor' && !/^(roof|sky|hall-ceil|ceil)/.test(s.name) && s.origin[1] < 1 && s.size[0] * s.size[1] < plan.hall.w * plan.hall.d * 0.5).map(s => s.name + ' ' + s.size.map(v => v.toFixed(1)).join('x'));
    return { flatNames, plan: { ...plan, spaces }, hall: plan.hall, entrance: plan.entrance, start: plan.start, solids: sp.solids, flat, plinths: (sp.plinths || []).map(p => [p.x, p.z]), stands: (sp.stands || []).map(s => [s.x, s.z, s.len, s.rot]),
      fronts, used: plan.spaces.filter(s => s.type === 'house').map(s => s.slot) };
  }, { slug, livePlan });

  if (process.env.DEBUG) fs.writeFileSync(path.join(out, 'geo.json'), JSON.stringify(geo));
  // ---- the floor as a grid: what is taken, and where a visitor can walk ----
  const G = 0.5, NX = Math.ceil(geo.hall.w / G), NZ = Math.ceil(geo.hall.d / G), idx = (i, j) => j * NX + i, cell = (x, z) => [Math.floor(x / G), Math.floor(z / G)];
  const taken = new Uint8Array(NX * NZ);
  const mark = (test, pad = 0) => { for (let j = 0; j < NZ; j++) for (let i = 0; i < NX; i++) { const x = (i + 0.5) * G, z = (j + 0.5) * G; if (test(x, z, pad)) taken[idx(i, j)] = 1; } };
  const dSeg = (x, z, [ax, az, bx, bz]) => { const dx = bx - ax, dz = bz - az, L = dx * dx + dz * dz || 1e-9, t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / L)); return Math.hypot(x - ax - t * dx, z - az - t * dz); };
  const M = 1.5;                                        // from the glass
  mark((x, z) => x < M || z < M || x > geo.hall.w - M || z > geo.hall.d - M);
  mark((x, z) => geo.solids.some(s => dSeg(x, z, s) < 0.45));
  mark((x, z) => geo.flat.some(p => F.inPoly([x, z], p)));
  if (geo.plan.pool) { const [a, b, c, d] = geo.plan.pool; mark((x, z) => x > a - 0.6 && x < c + 0.6 && z > b - 0.6 && z < d + 0.6); }
  mark((x, z) => geo.plinths.some(p => Math.hypot(x - p[0], z - p[1]) < 1.0) || (geo.plan.objects || []).some(p => Math.hypot(x - p[0], z - p[1]) < 1.0));
  mark((x, z) => geo.stands.some(([sx, sz, len, rot]) => { const a = rot * Math.PI / 180, ux = Math.cos(a), uz = Math.sin(a); return dSeg(x, z, [sx - ux * len / 2, sz - uz * len / 2, sx + ux * len / 2, sz + uz * len / 2]) < 0.6; }));
  const walk = Uint8Array.from(taken);                  // walkable = not taken (margins added for placing only)
  const keep = new Uint8Array(NX * NZ);                 // kept clear for placing: the way in, the start, every space's approach
  const [e0, e1] = geo.entrance.at, st = geo.start.pos;
  for (let j = 0; j < NZ; j++) for (let i = 0; i < NX; i++) { const x = (i + 0.5) * G, z = (j + 0.5) * G;
    const lk = geo.start.look, sl = Math.hypot(lk[0] - st[0], lk[1] - st[1]) || 1, along = ((x - st[0]) * (lk[0] - st[0]) + (z - st[1]) * (lk[1] - st[1])) / sl, side = Math.abs(((x - st[0]) * (lk[1] - st[1]) - (z - st[1]) * (lk[0] - st[0])) / sl);
    if (along > 0 && along < sl && side < 6) keep[idx(i, j)] = 1;                          // (the first view, from the start across the Square, stays open)
    if (Math.hypot(x - st[0], z - st[1]) < 6 || (x > e0 - 2 && x < e1 + 2 && z > st[1] - 2) || geo.fronts.some(f => Math.hypot(x - f[0], z - f[1]) < 3.2)) keep[idx(i, j)] = 1; }
  const bfs = (block, from) => { const d = new Float32Array(NX * NZ).fill(Infinity), q = []; const [i0, j0] = cell(...from); if (block[idx(i0, j0)]) return d; d[idx(i0, j0)] = 0; q.push([i0, j0]);
    for (let h = 0; h < q.length; h++) { const [i, j] = q[h]; for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const a = i + di, b = j + dj; if (a < 0 || b < 0 || a >= NX || b >= NZ) continue; const k = idx(a, b); if (block[k] || d[k] <= d[idx(i, j)] + G) continue; d[k] = d[idx(i, j)] + G; q.push([a, b]); } } return d; };
  const at = (d, p) => { const [i, j] = cell(...p); return i < 0 || j < 0 || i >= NX || j >= NZ ? Infinity : d[idx(i, j)]; };
  const base = bfs(walk, st), reachBefore = geo.fronts.map(f => isFinite(at(base, f)));

  // ---- every door position and direction: free, linked, and leaving every other space reachable ----
  let best = null, tried = 0;
  for (const dir of [0, 90, 180, 270]) for (let x = 2; x < geo.hall.w - 2; x += 0.5) for (let z = 2; z < geo.hall.d - 2; z += 0.5) {
    const space = { door: [x, z], dir }, fr = F.frameOf(tour, space), outer = fr.footAt(1.2), bb = outer.reduce((b, [px, pz]) => [Math.min(b[0], px), Math.min(b[1], pz), Math.max(b[2], px), Math.max(b[3], pz)], [1e9, 1e9, -1e9, -1e9]);
    if (bb[0] < 0 || bb[1] < 0 || bb[2] > geo.hall.w || bb[3] > geo.hall.d) continue;
    tried++;
    let ok = true; const body = [];
    for (let j = Math.floor(bb[1] / G); j <= Math.floor(bb[3] / G) && ok; j++) for (let i = Math.floor(bb[0] / G); i <= Math.floor(bb[2] / G); i++) { const p = [(i + 0.5) * G, (j + 0.5) * G];
      if (!F.inPoly(p, outer)) continue; const k = idx(i, j); if (taken[k] || keep[k]) { ok = false; break; } if (F.inPoly(p, fr.foot)) body.push(k); }
    if (!ok) continue;
    // each way in opens onto walkable floor, 1.5 m and 3 m out, and the start reaches it
    const blk = Uint8Array.from(walk); for (const k of body) blk[k] = 1;
    const ways = fr.ways.map(w => { const L = Math.hypot(w.outside[0] - w.at[0], w.outside[1] - w.at[1]) || 1; return [w.outside, [w.outside[0] + (w.outside[0] - w.at[0]) / L * 1.5, w.outside[1] + (w.outside[1] - w.at[1]) / L * 1.5]]; });
    if (ways.some(([a, b]) => [a, b].some(p => { const [i, j] = cell(...p); return i < 0 || j < 0 || i >= NX || j >= NZ || blk[idx(i, j)]; }))) continue;
    const d = bfs(blk, st), len = ways.map(([a]) => at(d, a));
    if (len.some(v => !isFinite(v))) continue;
    if (geo.fronts.some((f, k) => reachBefore[k] && !isFinite(at(d, f)))) continue;      // (never cut another space off)
    const C = [geo.hall.w / 2, geo.hall.d / 2], face = -(fr.o[0] * (C[0] - x) + fr.o[1] * (C[1] - z)) / (Math.hypot(C[0] - x, C[1] - z) || 1);
    if (face < 0.2) continue;                                                              // (its openings look into the hall, never at the glass)
    const edge = Math.min(...fr.foot.map(([px, pz]) => Math.min(px, pz, geo.hall.w - px, geo.hall.d - pz)));
    const score = edge + len.reduce((t, v) => t + v, 0) / len.length / 6;                  // (a pavilion stands along the hall's edge, like Ritual by hand; then the shorter walk)
    if (!best || score < best.score) best = { space, score, len, fr };
  }
  if (!best) { say('free_place', false, `no free place in the museum fits the room (${tried} positions tried)`); }
  else say('free_place', true, `door at [${best.space.door}] facing ${best.space.dir}°, every opening linked (walk from the start ${best.len.map(v => v.toFixed(0) + ' m').join(', ')}), no space cut off`);
  const slot = [57, 58, 59, 60, 61, 62, 63, 64].find(n => !geo.used.includes(n) || (livePlan && (livePlan.spaces || []).some(s => s.tour === slug && s.slot === n)));
  const draftSpace = best ? { id: slug, type: 'house', slot, tour: slug, door: best.space.door, dir: best.space.dir } : null;

  let museumShots = [], tourShots = [], views = [];
  if (draftSpace) {
    const fr = best.fr, plan = { ...geo.plan, spaces: [...geo.plan.spaces, draftSpace] };
    const k = plan.spaces.filter(s => s.type === 'house').findIndex(s => s.id === slug), pre = `o${k}-`;
    // ================= 3. the pavilion's structure (built alone, measured) =================
    const text = ex ? String(ex.description || '').split(/\n+/).map(s => s.trim()).filter(Boolean) : [];
    const S1 = await stage.evaluate(async ({ tour, draftSpace, title, text, sub }) => {
      const S = await import('./space/synth.js');
      const made = await S.buildSky([{ slug: draftSpace.id, slot: draftSpace.slot, title, works: [], text, sub, colour: '#8a7f72', original: { spec: tour } }], u => u, w => w.image, { plan: { spaces: [draftSpace], piers: [], stands: [], objects: [], pool: null }, sections: [] });
      const sp = made.spec, keep = s => ({ name: s.name, kind: s.kind, origin: s.origin, u: s.u, v: s.v, size: s.size, normal: s.normal, openings: s.openings, repeat: s.repeat, texture: typeof s.texture === 'string' && !s.texture.startsWith('data:') ? s.texture : null, light: !!s.light });
      const dims = async u => typeof u !== 'string' ? null : new Promise(res => { const im = new Image(); im.onload = () => res([im.naturalWidth, im.naturalHeight]); im.onerror = () => res(null); im.src = u; });
      const surf = sp.surfaces.filter(s => s.name.startsWith('o0-'));
      const px = {}, fp = {}; for (const s of surf) if (typeof s.texture === 'string') { px[s.name] = await dims(s.texture); fp[s.name] = s.texture.startsWith('data:') ? s.texture.length + ':' + s.texture.slice(-64) : new URL(s.texture, document.baseURI).href; }
      return { surfaces: surf.map(keep), px, fp, solids: sp.solids, hot: sp.hotspots.filter(h => h.kind === 'text'), works: sp.works.map(w => ({ title: w.title, centre: w.centre, size: w.size || w.measured })), pads: sp.floorPads };
    }, { tour, draftSpace: { ...draftSpace, slot: 1 }, title: ex ? ex.title : slug, text, sub: ex ? [ex.venue, ex.year].filter(Boolean).join(' · ') : '' });
    const bySuf = n => S1.surfaces.find(s => s.name === 'o0-' + n);
    // the frame agrees with synth.js (a floor point, mapped both ways)
    const fl = bySuf('floor'), tf = tour.surfaces.find(s => s.name === 'floor'), want = fr.W(tf.origin[0], tf.origin[2]);
    const drift = fl ? Math.hypot(fl.origin[0] - want[0], fl.origin[2] - want[1]) : Infinity;
    if (!(drift < 0.01)) errors.push(`the importer's frame no longer agrees with synth.js buildOriginal (floor ${drift.toFixed(3)} m off)`);
    // jambs: the skin on the door side has one opening per way, same place, width and shape, through the full thickness
    const skins = S1.surfaces.filter(s => /-skin\d$/.test(s.name)), dskin = skins.find(s => (s.openings || []).length);
    const jamb = [];
    if (!dskin) jamb.push('the door side of the skin has no opening');
    else {
      if (dskin.openings.length !== fr.ways.length) jamb.push(`the skin has ${dskin.openings.length} openings, the room's door wall ${fr.ways.length}`);
      for (const w of fr.ways) {
        const m = dskin.openings.map(q => { const s = (q.from + q.to) / 2, p = [dskin.origin[0] + dskin.u[0] * s, dskin.origin[2] + dskin.u[2] * s]; return { q, off: Math.abs((p[0] - w.at[0]) * dskin.u[0] + (p[1] - w.at[1]) * dskin.u[2]) }; }).sort((a, b) => a.off - b.off)[0];
        if (!m || m.off > 0.02) { jamb.push(`no skin opening lines up with the ${w.arch ? 'arch' : 'doorway'} (${m ? m.off.toFixed(2) + ' m off' : 'none'})`); continue; }
        const q = m.q; if (Math.abs(q.to - q.from - w.w) > 0.02) jamb.push(`the skin opening is ${(q.to - q.from).toFixed(2)} m wide, the room's ${w.w.toFixed(2)}`);
        if (!!q.arch !== !!w.arch) jamb.push(`a${w.arch ? 'n arch' : ' doorway'} became a${q.arch ? 'n arch' : ' doorway'} in the skin`);
        if (!(q.depth >= F.T)) jamb.push(`the jambs are ${(q.depth || 0).toFixed(2)} m deep, the wall ${F.T} m`);
        if (Math.abs(q.height - w.height) > 0.02) jamb.push(`the skin opening is ${q.height.toFixed(2)} m high, the room's ${w.height.toFixed(2)}`);
      }
    }
    // no blocked opening: nothing solid across the line a visitor walks through each way
    for (const w of fr.ways) { const hit = S1.solids.find(s => F.cross(w.inside, w.outside, [s[0], s[1]], [s[2], s[3]])); if (hit) jamb.push(`a wall crosses the way through the ${w.arch ? 'arch' : 'doorway'} at [${w.at.map(v => v.toFixed(1))}]`); }
    say('jambs', !jamb.length && door.real, door.real ? (jamb.length ? jamb.join('; ') : `${fr.ways.length} opening(s): full ${F.T} m jambs and head, same shape, nothing across the way`) : 'the only way in is invented (no real opening): ' + (jamb.join('; ') || 'built, but not real'));
    // wall text: flush on the skin of the door side, inside a solid run, clear of every opening
    const tx = bySuf('text'), tproblems = [];
    if (!tx || !dskin) tproblems.push('no text plate on the door wall');
    else {
      const nrm = dskin.normal, d = (tx.origin[0] - dskin.origin[0]) * nrm[0] + (tx.origin[2] - dskin.origin[2]) * nrm[2];
      if (Math.abs(d) > 0.01) tproblems.push(`it stands ${(d * 100).toFixed(1)} cm off the wall`);
      if (Math.hypot(tx.normal[0] - nrm[0], tx.normal[2] - nrm[2]) > 0.01) tproblems.push('it does not face the way the wall faces');
      const s0 = (tx.origin[0] - dskin.origin[0]) * dskin.u[0] + (tx.origin[2] - dskin.origin[2]) * dskin.u[2], dirU = tx.u[0] * dskin.u[0] + tx.u[2] * dskin.u[2], a = Math.min(s0, s0 + dirU * tx.size[0]), b = Math.max(s0, s0 + dirU * tx.size[0]);
      if (a < 0.25 || b > dskin.size[0] - 0.25) tproblems.push(`it runs past the wall's end (${a.toFixed(2)}..${b.toFixed(2)} of ${dskin.size[0].toFixed(2)} m)`);
      for (const q of dskin.openings || []) if (b > q.from - 0.25 && a < q.to + 0.25) tproblems.push(`it overlaps an opening (${q.from.toFixed(2)}..${q.to.toFixed(2)} m)`);
      if (tx.origin[1] - tx.size[1] < 0.3 || tx.origin[1] > 3.4) tproblems.push(`its height is odd (${(tx.origin[1] - tx.size[1]).toFixed(2)}..${tx.origin[1].toFixed(2)} m)`);
    }
    say('text_flush', !tproblems.length, tproblems.length ? 'the wall text: ' + tproblems.join('; ') : 'the wall text is flush on the door wall, in a solid run, clear of the openings');
    // works carried over at their measured size
    const lost = (tour.works || []).filter(w => !S1.works.some(q => q.title === w.title && JSON.stringify(q.size) === JSON.stringify(w.size || w.measured)));
    say('works', !lost.length, lost.length ? `not carried over at their size: ${lost.map(w => w.title).join(', ')}` : `${(tour.works || []).length} works at their measured size and place`);
    // px/m of what the museum hands a phone, against the tour (static: the pictures as built)
    const pxm = [];
    for (const w of tourWalls) { const s = bySuf(w.name), p = S1.px['o0-' + w.name]; if (!s || !p || !w.pxm) continue; pxm.push({ name: w.name, tour: Math.round(w.pxm), museum: Math.round(p[0] / s.size[0]) }); }
    const mfl = bySuf('floor'), mflPx = S1.px['o0-floor'];
    if (mfl && mflPx && tourFloorPxm) { const rep = mfl.repeat ? mfl.size[0] / mfl.repeat[0] : mfl.size[0]; pxm.push({ name: 'floor tile', tour: Math.round(tourFloorPxm), museum: Math.round(mflPx[0] / rep) }); }
    const lightsLost = tour.surfaces.filter(s => s.light).filter(s => !(bySuf(s.name) || {}).light).map(s => s.name);
    let gpuPx = null;

    // ================= 4. the museum as a visitor's phone opens it =================
    const room = tour.room, mid = [(room.x0 + room.x1) / 2, (room.z0 + room.z1) / 2], n = fr.door.n, dc = fr.door.dc, deep = Math.abs((room.x1 - room.x0) * n[0]) + Math.abs((room.z1 - room.z0) * n[1]);
    // the three views, in the room's own coordinates: from the way in, from the middle at the longest wall, from the far end back to the openings
    const walls = tour.surfaces.filter(s => s.kind === 'wall' && s.name !== door.wall).sort((a, b) => b.size[0] - a.size[0]), lw = walls[0];
    const lwc = [lw.origin[0] + lw.u[0] * lw.size[0] / 2, lw.origin[2] + lw.u[2] * lw.size[0] / 2], lwn = [lw.normal[0], lw.normal[2]];
    // the long axis of the room, and its far end from the way in
    const lx = room.x1 - room.x0, lz = room.z1 - room.z0, ax = lx >= lz ? [1, 0] : [0, 1], far1 = lx >= lz ? [((dc[0] - room.x0) < (room.x1 - dc[0]) ? room.x1 : room.x0), mid[1]] : [mid[0], ((dc[1] - room.z0) < (room.z1 - dc[1]) ? room.z1 : room.z0)];
    const near1 = [2 * mid[0] - far1[0], 2 * mid[1] - far1[1]], toFar = [far1[0] - near1[0], far1[1] - near1[1]], Lf = Math.hypot(...toFar) || 1;
    views = [
      { id: 'from-the-way-in', at: [dc[0] + n[0] * 0.5, 1.6, dc[1] + n[1] * 0.5], to: [far1[0] + n[0] * deep * 0.5, 1.5, far1[1] + n[1] * deep * 0.5], fov: 75 },
      { id: 'middle-to-the-longest-wall', at: [lwc[0] + lwn[0] * deep * 0.85, 1.6, lwc[1] + lwn[1] * deep * 0.85], to: [lwc[0], 1.6, lwc[1]], fov: 75 },
      { id: 'back-to-the-openings', at: [far1[0] - toFar[0] / Lf * 0.6 + n[0] * deep * 0.75, 1.6, far1[1] - toFar[1] / Lf * 0.6 + n[1] * deep * 0.75], to: [dc[0], 1.5, dc[1]], fov: 75 },
    ];
    // clamp the middle view inside the room
    for (const v of views) { v.at[0] = Math.min(Math.max(v.at[0], room.x0 + 0.4), room.x1 - 0.4); v.at[2] = Math.min(Math.max(v.at[2], room.z0 + 0.4), room.z1 - 0.4); }
    let memBase = null;
    { const b0 = await ctx.newPage();
      await b0.route(/rest\/v1\/museum_plan/, r => r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify([{ plan: geo.plan }]) }));
      await b0.goto(`${BASE}?guest#/museum`);
      if (await b0.waitForFunction(() => window.__spaceView && document.querySelector('canvas'), null, { timeout: 300000, polling: 500 }).then(() => true, () => false)) { await b0.waitForTimeout(8000); memBase = await b0.evaluate(() => window.__spaceView.inspect.memory()); }
      await b0.close(); }
    const p = await ctx.newPage(); p.on('pageerror', e => errors.push('museum: ' + e.message));
    // what reaches the GPU, by picture: every texture upload's source and width (the phone's truth for px/m, whatever the viewer loads near or far)
    await p.addInitScript(() => { window.__up = {}; const key = s => s.startsWith('data:') ? s.length + ':' + s.slice(-64) : s;
      for (const C of [window.WebGLRenderingContext, window.WebGL2RenderingContext].filter(Boolean)) for (const fn of ['texImage2D', 'texSubImage2D']) { const f = C.prototype[fn];
        C.prototype[fn] = function (...a) { const src = a[a.length - 1], u = src && (src.currentSrc || src.src); if (typeof u === 'string' && u) { const k = key(u), w = src.naturalWidth || src.width || 0; window.__up[k] = Math.max(window.__up[k] || 0, w); } return f.apply(this, a); }; } });
    await p.route(/rest\/v1\/museum_plan/, r => r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify([{ plan }]) }));
    await p.goto(`${BASE}?guest&inspect=${slug}&phone=1#/museum`);
    const opened = await p.waitForFunction(() => window.__spaceView && document.querySelector('canvas'), null, { timeout: 300000, polling: 500 }).then(() => true, () => false);
    if (!opened) errors.push('the museum did not open');
    else {
      await p.waitForTimeout(8000);
      const memStart = await p.evaluate(() => window.__spaceView.inspect.memory());
      const inside = fr.P3([mid[0], 1.6, mid[1]]), far = fr.P3([dc[0] + n[0] * deep, 1.6, dc[1] + n[1] * deep]);
      const outside = fr.P3([dc[0] - n[0] * 4, 1.6, dc[1] - n[1] * 4]);
      for (const [a, l] of [[outside, fr.P3([dc[0], 1.6, dc[1]])], [fr.P3([dc[0] + n[0] * 1.2, 1.6, dc[1] + n[1] * 1.2]), far], [inside, far]]) { await p.evaluate(([a, l]) => window.__spaceView.inspect.place(a, l), [a, l]); await p.waitForTimeout(2500); }
      await p.waitForTimeout(6000);
      const memIn = await p.evaluate(() => window.__spaceView.inspect.memory());
      say('phone_memory', memStart <= BUDGET && memIn <= BUDGET, `${memStart} MB at the start view, ${memIn} MB inside the pavilion (budget ${BUDGET}); the museum without this draft: ${memBase} MB, so the pavilion adds ${memBase != null ? memStart - memBase : '?'} MB at the start`, { start: memStart, inside: memIn, without: memBase });
      // the floor's reflection, proved by its mechanism (as tests/pad_mirror.cjs): the mirror tinted red must turn the floor's pixels red
      const pad = await p.evaluate(pre => { const I = window.__spaceView.inspect, q = (I.pads ? I.pads() : []).find(x => x.on && x.name.startsWith(pre)); return q ? { name: q.name, fade: q.fade() } : null; }, pre);
      if (!pad) say('floor_mirror', false, `no floor mirror is on inside the pavilion (${pre}floor)`);
      else {
        await p.evaluate(([a, l]) => window.__spaceView.inspect.place(a, l), [fr.P3([mid[0], 1.6, mid[1]]), fr.P3([mid[0] + n[0] * 2, 0.4, mid[1] + n[1] * 2])]); await p.waitForTimeout(2500);
        const floor = async name => { const png = await p.screenshot({ path: path.join(out, name + '.jpg'), type: 'jpeg', quality: 85 });
          return p.evaluate(async b64 => { const im = new Image(); im.src = 'data:image/jpeg;base64,' + b64; await im.decode(); const c = document.createElement('canvas'); c.width = im.width; c.height = im.height;
            const x = c.getContext('2d'); x.drawImage(im, 0, 0); const d = x.getImageData(150, 560, 230, 130).data; let r = 0, g = 0, n = 0; for (let i = 0; i < d.length; i += 4) { r += d[i]; g += d[i + 1]; n++; } return { r: r / n, g: g / n }; }, png.toString('base64')); };
        const before = await floor('mirror-plain');
        await p.evaluate(pre => { const I = window.__spaceView.inspect; I.pads().find(x => x.on && x.name.startsWith(pre)).tint([8, 0, 0]); const w = I.where(); I.place([w.pos[0] + 0.01, w.pos[1], w.pos[2]], w.look); }, pre);
        await p.waitForTimeout(2500);
        const after = await floor('mirror-red'), gain = (after.r - after.g) - (before.r - before.g);
        await p.evaluate(pre => { const I = window.__spaceView.inspect; I.pads().find(x => x.on && x.name.startsWith(pre)).tint([1, 1, 1]); }, pre);
        // as in the tour: a glossy floor (reflect >= 0.1, Ritual 0.29) must show the tint strongly; a matte one only faintly, never more than the tour's own gloss allows
        const refl = Math.max(...(tour.floorReflect || [0, 0])), glossy = refl >= 0.1, ok = glossy ? gain > 8 : gain > 0.5 && gain < 8;
        say('floor_mirror', ok, (glossy ? `the tour's floor is glossy (reflect ${refl}): ` : `the tour's floor is nearly matte (reflect ${refl}): `) + (ok ? `the museum floor takes the mirror's tint as it should (gain ${gain.toFixed(1)}, mirror ${pad.name})` : `the mirror's tint gain is ${gain.toFixed(1)}, ${glossy ? 'too weak: the reflection does not reach the floor' : gain >= 8 ? 'shinier than the tour' : 'nothing reaches the floor'}`), { gain: +gain.toFixed(1), reflect: refl });
      }
      // GPU truth for px/m: the widest picture uploaded for each of the pavilion's walls and its floor (its built picture, or the tour's own file if the viewer loads it near)
      const up = await p.evaluate(() => window.__up);
      gpuPx = {}; for (const [name, k] of Object.entries(S1.fp)) { const orig = (tour.surfaces.find(q => 'o0-' + q.name === name) || {}).texture, ko = orig ? new URL(orig, BASE).href : null;
        const w = Math.max(up[k] || 0, ko ? up[ko] || 0 : 0); if (w) gpuPx[name] = w; }
      fs.writeFileSync(path.join(out, 'gpu-uploads.json'), JSON.stringify({ matched: gpuPx, uploads: Object.keys(up).length }));
      // the three views in the museum
      for (const v of views) {
        const r = await p.evaluate(([a, l, fov]) => { const I = window.__spaceView.inspect, s = I.shot(a, l, fov); return { png: s.png, on: s.corners.map((c, i) => [I.pieces[i].title, c.every(q => q[0] > 0 && q[0] < 1 && q[1] > 0 && q[1] < 1 && q[2] < 1)]) }; }, [fr.P3(v.at), fr.P3(v.to), v.fov || 60]);
        museumShots.push(r);
      }
    }
    await p.close();
    // px/m: what the phone holds (GPU uploads) when measured, else the built pictures
    if (gpuPx) for (const r of pxm) { const nm = r.name === 'floor tile' ? 'o0-floor' : 'o0-' + r.name, w = gpuPx[nm]; if (!w) continue; const s0 = bySuf(nm.slice(3));
      const span = r.name === 'floor tile' ? (s0.repeat ? s0.size[0] / s0.repeat[0] : s0.size[0]) : s0.size[0]; r.built = r.museum; r.museum = Math.round(w / span); r.gpu = true; }
    const low = pxm.filter(r => r.museum < r.tour * 0.99);
    say('px_per_m', !low.length && !lightsLost.length && pxm.length, (low.length ? 'below the tour: ' + low.map(r => `${r.name} ${r.museum} < ${r.tour} px/m`).join(', ') : `at or above the tour: ${pxm.map(r => `${r.name} ${r.museum}/${r.tour}`).join(', ')} px/m`) + ` (${pxm.filter(r => r.gpu).length}/${pxm.length} measured on the GPU, the rest from the built pictures)` + (lightsLost.length ? `; light maps lost on ${lightsLost.join(', ')}` : ', light maps carried'), pxm);
    // ================= 5. the tour, from the same three places =================
    const t = await ctx.newPage(); t.on('pageerror', e => errors.push('tour: ' + e.message));
    await t.goto(`${BASE}?guest&inspect=${slug}&phone=1#/exhibition/${slug}/space`);
    const topen = await t.waitForFunction(() => window.__spaceView && document.querySelector('canvas'), null, { timeout: 300000, polling: 500 }).then(() => true, () => false);
    if (topen) {
      await t.waitForTimeout(8000);
      for (const v of views) { await t.evaluate(([a, l]) => window.__spaceView.inspect.place(a, l), [v.at, v.to]); await t.waitForTimeout(2500); }
      for (const v of views) {
        const r = await t.evaluate(([a, l, fov]) => { const I = window.__spaceView.inspect, s = I.shot(a, l, fov); return { png: s.png, on: s.corners.map((c, i) => [I.pieces[i].title, c.every(q => q[0] > 0 && q[0] < 1 && q[1] > 0 && q[1] < 1 && q[2] < 1)]) }; }, [v.at, v.to, v.fov || 60]);
        tourShots.push(r);
      }
    } else errors.push('the tour did not open');
    await t.close();
    // ================= 6. side by side =================
    const sbs = [];
    if (museumShots.length === 3 && tourShots.length === 3) {
      for (let i = 0; i < 3; i++) {
        const r = await stage.evaluate(async ([a, b, label]) => {
          const load = s => new Promise(res => { const im = new Image(); im.onload = () => res(im); im.src = s; });
          const [A, B] = await Promise.all([load(a), load(b)]), W = A.width, H = A.height, c = document.createElement('canvas'); c.width = W * 2 + 12; c.height = H + 40;
          const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(A, 0, 40); x.drawImage(B, W + 12, 40);
          x.fillStyle = '#222'; x.font = '600 16px system-ui'; x.fillText('Tour: ' + label, 8, 26); x.fillText('Museum pavilion (draft)', W + 20, 26);
          // holes: magenta in the museum picture
          const y = document.createElement('canvas'); y.width = B.width; y.height = B.height; const g = y.getContext('2d'); g.drawImage(B, 0, 0); const d = g.getImageData(0, 0, B.width, B.height).data; let m = 0;
          for (let k = 0; k < d.length; k += 4) if (d[k] > 230 && d[k + 1] < 30 && d[k + 2] > 230) m++;
          return { png: c.toDataURL('image/jpeg', 0.86), holes: m / (d.length / 4) };
        }, [tourShots[i].png, museumShots[i].png, views[i].id]);
        const file = `side-by-side-${i + 1}-${views[i].id}.jpg`; fs.writeFileSync(path.join(out, file), Buffer.from(r.png.split(',')[1], 'base64'));
        const seen = tourShots[i].on.filter(q => q[1]).map(q => q[0]), inM = new Set(museumShots[i].on.filter(q => q[1]).map(q => q[0])), miss = seen.filter(s => !inM.has(s));
        sbs.push({ file, view: views[i].id, holes: +(r.holes * 100).toFixed(2), worksInTour: seen.length, missing: miss });
      }
      const bad = sbs.filter(s => s.holes > 0.2 || s.missing.length);
      say('side_by_side', !bad.length, bad.length ? bad.map(s => `${s.view}: ${s.holes ? s.holes + '% holes' : ''}${s.missing.length ? ' missing ' + s.missing.join(', ') : ''}`).join('; ') : `3 views saved; every work seen in the tour is seen in the museum, no holes`, sbs);
    } else say('side_by_side', false, 'the three views could not be made (' + errors.slice(-2).join('; ') + ')');
  }
  await browser.close(); server.close();
  if (errors.length) say('no_errors', false, errors.slice(0, 4).join('; '));
  const pass = gate.every(g => g.pass);
  // ---- what is missing, as one list for the owner (Hebrew), from the tour's own report and status and the gate ----
  const needs = [];
  if (status.state !== 'live') {
    const rep = fs.existsSync(path.join(APP, 'data/spaces', slug + '.report.md')) ? fs.readFileSync(path.join(APP, 'data/spaces', slug + '.report.md'), 'utf8') : '';
    const sec = h => { const i = rep.indexOf('## ' + h); if (i < 0) return []; const rest = rep.slice(i + h.length + 3), j = rest.indexOf('\n## '); return (j < 0 ? rest : rest.slice(0, j)).split('\n').map(s => s.trim()).filter(s => s.startsWith('- ')).map(s => s.slice(2)); };
    const lost = sec('לא מוקמו').map(s => s.split(':')[0].trim()), check = sec('נתונים לבדיקה');
    const guessed = [...rep.matchAll(/^\| (x0|x1|z0|z1) \| משוער/gm)].map(m => m[1]);
    const sizeLine = (status.items || []).find(i => /^Size missing/.test(i[1])), sizes = sizeLine ? sizeLine[1].split(':')[1].replace(/\. Please.*$/, '').split(',').map(s => s.trim()).filter(Boolean) : [];
    const diffLine = (status.items || []).find(i => /^The photos show a different size/.test(i[1])), diff = diffLine ? diffLine[1].split(':')[1].replace(/\. Please.*$/, '').split(',').map(s => s.trim()).filter(Boolean) : [];
    // each work by title: what is recorded (the size field, or only the description), how far its image's proportion is off, and a triptych's "each one"
    let siteWorks = []; try { const j = JSON.parse(fs.readFileSync(path.join(ROOT, 'content/works.json'), 'utf8')); siteWorks = Array.isArray(j) ? j : j.works || []; } catch {}
    const perWork = sizes.map(t => { const w = siteWorks.find(x => String(x.title || '').trim() === t) || {}, d = String(w.description || ''), m = d.match(/(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)\s*cm/i), each = /each/i.test(d);
      const off = (check.find(s => s.startsWith(t + ':')) || '').match(/\((\d+)%\)/);
      return `${t}: ${w.size ? `רשום ${w.size}` : m ? `שדה המידה ריק, בתיאור כתוב ${m[1]}×${m[2]} ס"מ` : 'אין מידה בכלל'}${each ? ' לכל קנבס (יצירה מכמה קנבסים): צריך את המידה הכוללת כפי שנתלתה, כולל הרווחים, או תמונה של קנבס אחד' : ''}${off ? `; הפרופורציה של התמונה רחוקה ב-${off[1]}% מהמידה, אולי התמונה חתוכה או שהרוחב והגובה התהפכו` : ''}`; });
    if (sizes.length) needs.push({ kind: 'sizes', he: `מידות של ${sizes.length} עבודות (רוחב × גובה בס"מ, בשדה המידה של כל עבודה):\n` + perWork.map(s => '  - ' + s).join('\n'), works: sizes });
    if (diff.length) needs.push({ kind: 'size-vs-photo', he: `בצילומים נמדדה מידה אחרת מהרשומה: ${diff.join(', ')}. לבדוק את המידה או את התמונה.`, works: diff });
    if (lost.length) needs.push({ kind: 'works-not-in-photos', he: `${lost.length} עבודות לא נראות באף צילום הצבה: ${lost.join(', ')}. צריך צילומים רחבים שבכל אחד 2–3 עבודות ופינת חדר.`, works: lost });
    const NAMES = { x0: 'הקיר הקצר השמאלי (x0)', x1: 'הקיר הקצר הימני (x1)', z0: 'הקיר הארוך הקדמי (z0)', z1: 'הקיר הארוך האחורי (z1)' };
    if (guessed.length) needs.push({ kind: 'walls', he: `${guessed.length} קירות לא נמדדו, רק נוחשו: ${guessed.map(w => NAMES[w]).join(', ')}. צריך שני צילומים לפחות של כל אחד מהם, מזוויות שונות, כל אחד עם עבודה או פינה בתוכו.`, walls: guessed });
  }
  if (!door.real) needs.push({ kind: 'openings', he: 'לא נמדד שום פתח אמיתי (קשת או דלת) שדרכו נכנסים לחדר. צריך צילומים של הכניסה עצמה: מבפנים, מול הפתח ובאלכסון, כשרואים את שני צדי המשקוף ואת הרצפה מתחתיו, ועוד צילום מבחוץ. כך הביתן במוזיאון ייכנס דרך הפתח האמיתי שלו.' });
  if (status.state !== 'live') needs.push({ kind: 'video', he: 'הדרך הבטוחה ביותר במקום כל אלה: סרטון הליכה של דקה–שתיים. טלפון לרוחב, לאט באמצע החדר הלוך וחזור, כל הקירות בתמונה, סיבוב איטי בקצוות עם קצת רצפה ותקרה, ולעבור גם דרך הכניסה.' });
  const draft = { slug, title: ex ? ex.title : slug, made: new Date().toISOString(), status: pass ? 'ready' : 'failed', approved: false, space: draftSpace,
    gate: { pass, checks: gate }, needs, measures, views, note: 'A draft: nothing of it is live. The Desk adds `space` to museum_plan only when the owner approves.' };
  fs.writeFileSync(path.join(OUT_ROOT, slug + '.json'), JSON.stringify(draft, null, 1));
  const ixf = path.join(OUT_ROOT, 'index.json'), ix = fs.existsSync(ixf) ? JSON.parse(fs.readFileSync(ixf, 'utf8')) : {};
  ix[slug] = { title: draft.title, status: draft.status, made: draft.made, fails: gate.filter(g => !g.pass).map(g => g.id) }; fs.writeFileSync(ixf, JSON.stringify(ix, null, 1));
  const md = [`# Draft pavilion: ${draft.title}`, '', `Made ${draft.made.slice(0, 16)} by \`space/importer/import.cjs\`. **${pass ? 'Passed the gate: waiting for the owner on the Desk.' : 'Failed the gate: not offered.'}**`, '',
    draftSpace ? `Plan entry: \`${JSON.stringify(draftSpace)}\`` : 'No place found.', '', '| | check | result |', '|---|---|---|', ...gate.map(g => `| ${g.pass ? '✓' : '✗'} | ${g.id} | ${g.why.replace(/\|/g, '/')} |`), '',
    ...(needs.length ? ['## מה חסר כדי שהביתן יעבור (לבעלים)', '', ...needs.map(n => '- ' + n.he), ''] : []),
    ...(views.length ? ['## Side by side (tour left, museum right)', '', ...[1, 2, 3].map(i => `![${views[i - 1].id}](side-by-side-${i}-${views[i - 1].id}.jpg)`)] : [])].join('\n');
  fs.writeFileSync(path.join(out, 'report.md'), md);
  console.log(`${pass ? 'READY' : 'FAILED'} draft ${slug}: ${gate.filter(g => g.pass).length}/${gate.length} checks -> studio/app/data/museum/drafts/${slug}.json`);
  process.exitCode = pass ? 0 : 1;
})().catch(e => { console.error(e); server.close(); process.exit(3); });
