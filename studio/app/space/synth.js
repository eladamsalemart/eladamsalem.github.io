// Virtual rooms: spaces that exist only in Open Studio, for exhibitions an artist (or a curator) designs here.
//
// A design is small: a room, a wall colour, the works in walking order and the height they hang at.
// buildRoom() turns it into the same room description the photo-built tours use (data/spaces/<slug>.json, v2),
// with every surface drawn here, in the browser: the paint, the light the room's own fixtures throw (a pool over
// each work, the corners and the foot of each wall a little darker), the floor's material and the ceiling's
// lights. The viewer (space.js) shows it as it shows a real room, so a designed show walks like a real one.
// Coordinates are metres, y up, floor at 0; the door is in the wall at x = w, and the walk starts there.

export const ROOMS = {
  'white-cube': {
    name: 'White Cube', size: '11 × 7 m', blurb: 'A clean gallery: polished concrete, white walls, a spot over every work.',
    w: 11, d: 7, h: 3.6, paint: 'white', floor: 'concrete', ceiling: 'track', light: 'spots', door: 1.7,
  },
  'long-hall': {
    name: 'Long Hall', size: '18 × 6.5 m', blurb: 'A tall hall under skylights, an oak floor, soft daylight all along.',
    w: 18, d: 6.5, h: 5.2, paint: 'bone', floor: 'oak', ceiling: 'skylight', light: 'daylight', door: 2.2,
  },
  'vault': {
    name: 'The Vault', size: '9 × 9 m', blurb: 'A dark, quiet room of dark stone; each work in its own light.',
    w: 9, d: 9, h: 4.4, paint: 'charcoal', floor: 'stone', ceiling: 'dark', light: 'narrow', door: 1.5,
  },
};
// The ten kinds of room built and lit in Blender (space/rooms/build_rooms.py, the "Studio rooms" workflow), each in its
// sizes: every surface of the empty room photographed square on, with its own light and, through its windows, a real
// view (data/rooms/<slug>/). The works are hung here, at their real size, with the light of the room's fixtures.
export const KINDS = {
  'white-cube': ['White cube', 'White walls, polished concrete, a track spot over every work.'],
  'loft': ['Industrial loft', 'Painted brick, a worn concrete floor, daylight from a sawtooth roof.'],
  'skylit-hall': ['Skylit museum hall', 'Lime plaster and oak under a vault of daylight.'],
  'salon': ['Salon', 'Deep coloured walls, parquet, works in two rows under a lantern.'],
  'concrete': ['Raw concrete', 'Cast concrete with the marks of its formwork, light from above.'],
  'studio': ['Artist studio', 'Limewashed brick, old boards, a tall north window onto the street.'],
  'apartment': ["Collector's home", 'A living room: parquet, a sofa, a window onto a quiet street.'],
  'black-box': ['Black box', 'A dark room; each work in its own light.'],
  'glass-pavilion': ['Glass pavilion', 'Terrazzo and white walls, a wall of glass onto a park.'],
  'japanese': ['Japanese room', 'Earth plaster, tatami, shoji slid open onto a garden.'],
};
// THE ARCHIVE SWITCH (owner, 10.11): only these kinds are offered to artists, in this order. Every other kind keeps all its
// data and files in data/rooms and stays loadable (shows already in one still open); it is just not offered. To bring a
// kind back, add its key here. The 2/3-rooms variants follow their kind.
export const ACTIVE_KINDS = ['apartment', 'black-box'];
export const isActiveKind = k => ACTIVE_KINDS.includes(k);
const SIZE = { small: 'Small', large: 'Large', medium: 'Medium' };
const BAKED = new URL('../data/rooms/', import.meta.url).href;
try {
  const idx = await (await fetch(BAKED + 'index.json', { cache: 'no-cache' })).json();
  for (const [slug, m] of Object.entries(idx)) {
    if (ROOMS[slug]) continue;           // (the three drawn rooms keep their names)
    const variant = slug === m.type ? 'medium' : slug.slice(m.type.length + 1);
    ROOMS[slug] = {
      name: (KINDS[m.type] || [m.type])[0], size: m.label, blurb: (KINDS[m.type] || ['', ''])[1], kind: m.type, variant, sizeName: SIZE[variant] || variant,
      w: m.w, d: m.d, h: m.h, door: m.door ? m.door.to - m.door.from : 0, doorSpan: m.door ? [m.door.from, m.door.to] : null,
      doorHeight: m.door ? m.door.height : 0, blocks: m.blocks || {}, plates: m.plates || [], light: m.light, floorReflect: m.floorReflect,
      baked: BAKED + slug + '/', cover: BAKED + slug + '/view.jpg', paint: 'white', archived: !isActiveKind(m.type),
    };
  }
  // several rooms: the same room, 2 or 3 times in a row, joined by a doorway in a partition wall (see wallsOf)
  for (const [slug, r] of Object.entries(ROOMS)) {
    if (!r.baked || r.cells) continue;
    const bl = r.blocks || {};
    if (Object.keys(bl).length > 3 || ((bl['wall-x0'] || []).length && (bl['wall-z1'] || []).length)) continue;      // (glass on every side: no wall to partition with)
    for (const n of [2, 3]) ROOMS[`${slug}-${n}r`] = { ...r, cells: n, cell: r.w, w: r.w * n, rooms: n, size: `${n} rooms in a row · ${r.size}`, sizeName: `${r.sizeName}, ${n} rooms` };
  }
} catch { /* no rooms published yet: the three drawn ones */ }
const loadImg = u => new Promise((res, rej) => { const i = new Image(); i.crossOrigin = 'anonymous'; i.onload = () => res(i); i.onerror = rej; i.src = u; });

export const PAINTS = {
  white: ['White', '#f2f0eb'], bone: ['Bone', '#ebe4d6'], sage: ['Sage', '#c7cdbd'], clay: ['Clay', '#c99a80'],
  oxblood: ['Oxblood', '#6a2b2b'], ink: ['Ink', '#28324b'], charcoal: ['Charcoal', '#3d3c3f'],
};

const MARGIN = 0.7, GAP = 0.9, MIN_GAP = 0.5, DEPTH = 0.035;
// plinths an artist can place on the floor: width, depth, height in cm
export const PLINTHS = { s: [30, 30, 100], m: [40, 40, 90], l: [60, 60, 70] };
const clampN = (v, a, b) => Math.max(a, Math.min(b, v));

// --- helpers ---------------------------------------------------------------------------------------------
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const hash = s => [...String(s)].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0, 2166136261);
const rgb = hex => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
const lum = hex => { const [r, g, b] = rgb(hex); return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255; };
function canvas(w, h) { const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); return c; }
const url = c => new Promise(res => c.toBlob(b => res(URL.createObjectURL(b)), 'image/jpeg', 0.9));
const urlPng = c => new Promise(res => c.toBlob(b => res(URL.createObjectURL(b)), 'image/png'));

// tileable value noise, a few octaves, as grey levels around 128 (n × n pixels, repeating seamlessly)
function noiseCanvas(n, cells, seed, octaves = 3, amp = 1) {
  const r = rng(seed), c = canvas(n, n), ctx = c.getContext('2d'), img = ctx.createImageData(n, n);
  const acc = new Float32Array(n * n);
  let total = 0;
  for (let o = 0, k = cells, a = 1; o < octaves; o++, k *= 2, a *= 0.5) {
    const g = Float32Array.from({ length: k * k }, r);
    for (let y = 0; y < n; y++) {
      const fy = y / n * k, y0 = Math.floor(fy), ty = fy - y0, sy = ty * ty * (3 - 2 * ty), y1 = (y0 + 1) % k;
      for (let x = 0; x < n; x++) {
        const fx = x / n * k, x0 = Math.floor(fx), tx = fx - x0, sx = tx * tx * (3 - 2 * tx), x1 = (x0 + 1) % k;
        const v = (g[y0 * k + x0] * (1 - sx) + g[y0 * k + x1] * sx) * (1 - sy) + (g[y1 * k + x0] * (1 - sx) + g[y1 * k + x1] * sx) * sy;
        acc[y * n + x] += v * a;
      }
    }
    total += a;
  }
  for (let i = 0; i < n * n; i++) { const v = 128 + (acc[i] / total - 0.5) * 255 * amp; img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v; img.data[i * 4 + 3] = 255; }
  ctx.putImageData(img, 0, 0);
  return c;
}
// fine grain: per-pixel noise, tiled
let grainC = null;
function grain() {
  if (grainC) return grainC;
  const n = 256, c = canvas(n, n), ctx = c.getContext('2d'), img = ctx.createImageData(n, n), r = rng(7);
  for (let i = 0; i < n * n; i++) { const v = 128 + (r() - 0.5) * 70; img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v; img.data[i * 4 + 3] = 255; }
  ctx.putImageData(img, 0, 0);
  return (grainC = c);
}
function texture(ctx, w, h, seed, mottle, grainAmt) {
  ctx.save();
  ctx.globalCompositeOperation = 'overlay';
  const nz = noiseCanvas(256, 6, seed, 4);
  ctx.globalAlpha = mottle; ctx.imageSmoothingQuality = 'high';
  for (let x = 0; x < w; x += h * 1.5) ctx.drawImage(nz, x, 0, h * 1.5, h * 1.5);
  ctx.globalAlpha = grainAmt; ctx.fillStyle = ctx.createPattern(grain(), 'repeat'); ctx.fillRect(0, 0, w, h);
  ctx.restore();
}
function pool(ctx, x, y, rx, ry, alpha, tint = '255,247,232') {
  ctx.save(); ctx.translate(x, y); ctx.scale(rx, ry);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
  g.addColorStop(0, `rgba(${tint},${alpha})`); g.addColorStop(0.5, `rgba(${tint},${alpha * 0.8})`); g.addColorStop(0.8, `rgba(${tint},${alpha * 0.3})`); g.addColorStop(1, `rgba(${tint},0)`);
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 1, 0, Math.PI * 2); ctx.fill(); ctx.restore();
}
function edgeShade(ctx, x0, y0, x1, y1, w, h, alpha) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  g.addColorStop(0, `rgba(0,0,0,${alpha})`); g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g; ctx.fillRect(Math.min(x0, x1), Math.min(y0, y1), w, h);
}

// --- the size of a work, the right way up --------------------------------------------------------------
// Records mix height × width and width × height: the pair is turned to match the image.
const aspectOf = u => new Promise(res => { const i = new Image(); i.crossOrigin = 'anonymous'; i.onload = () => res(i.naturalWidth / i.naturalHeight || 1); i.onerror = () => res(null); i.src = u; });
export async function sizeOf(work, src) {
  const a = await aspectOf(src(work.image));
  const pairs = (work.pairs && work.pairs.length ? work.pairs : work.width && work.height ? [[+work.height, +work.width]] : []).filter(p => p[0] > 0 && p[1] > 0);
  if (!pairs.length) { const r = a || 1, long = 90; return { w: r >= 1 ? long : long * r, h: r >= 1 ? long / r : long, aspect: r, guessed: true }; }
  let best = null;
  for (const [p, q] of pairs.slice(0, 1)) for (const [h, w] of [[p, q], [q, p]]) {
    const err = a ? Math.abs((w / h) / a - 1) : (w >= h ? 0 : 1);
    if (!best || err < best.err) best = { w, h, err };
  }
  return { w: best.w, h: best.h, aspect: a || best.w / best.h };
}

// --- the walls, in walking order from the door --------------------------------------------------------
const PART = 0.3;                                   // a partition wall's thickness
function wallsOf(R) {
  const { w: W, d: D, h: H } = R, door = R.door;
  if (R.baked && R.cells > 1) {
    // several rooms in a row (x): the long walls in one piece per room, partitions between, the door at the far end
    const N = R.cells, C = R.cell, bl = R.blocks || {}, span = R.doorSpan || [D / 2 - 0.7, D / 2 + 0.7];
    const src = (bl['wall-x0'] || []).length ? 'wall-z1' : 'wall-x0';        // a wall without windows, for the partitions
    const out = [], seg = (name, file, o) => ({ name, file, blocks: bl[file] || [], ...o });
    for (let k = N - 1; k >= 0; k--) out.push(seg(`wall-z0-c${k}`, 'wall-z0', { origin: [k * C, H, 0], u: [1, 0, 0], normal: [0, 0, 1], len: C }));
    out.push(seg('wall-x0', 'wall-x0', { origin: [0, H, D], u: [0, 0, -1], normal: [1, 0, 0], len: D }));
    for (let k = 0; k < N; k++) out.push(seg(`wall-z1-c${k}`, 'wall-z1', { origin: [(k + 1) * C, H, D], u: [-1, 0, 0], normal: [0, 0, -1], len: C }));
    out.push(seg('wall-x1', 'wall-x1', { origin: [W, H, 0], u: [0, 0, 1], normal: [-1, 0, 0], len: D, ...(R.doorSpan ? { door: R.doorSpan } : {}) }));
    for (let p = 1; p < N; p++) {
      const x = p * C;
      out.push({ name: `part-${p}a`, file: src, flip: true, blocks: [], origin: [x - PART / 2, H, 0], u: [0, 0, 1], normal: [-1, 0, 0], len: D, door: span, partition: p });
      out.push({ name: `part-${p}b`, file: src, blocks: [], origin: [x + PART / 2, H, D], u: [0, 0, -1], normal: [1, 0, 0], len: D, door: [D - span[1], D - span[0]], partition: p, bare: true });
    }
    return out;
  }
  if (R.baked) return [
    { name: 'wall-z0', origin: [0, H, 0], u: [1, 0, 0], normal: [0, 0, 1], len: W },
    { name: 'wall-x0', origin: [0, H, D], u: [0, 0, -1], normal: [1, 0, 0], len: D },
    { name: 'wall-z1', origin: [W, H, D], u: [-1, 0, 0], normal: [0, 0, -1], len: W },
    { name: 'wall-x1', origin: [W, H, 0], u: [0, 0, 1], normal: [-1, 0, 0], len: D, ...(R.doorSpan ? { door: R.doorSpan } : {}) },
  ];
  return [
    { name: 'wall-z0', origin: [0, H, 0], u: [1, 0, 0], normal: [0, 0, 1], len: W },
    { name: 'wall-x0', origin: [0, H, D], u: [0, 0, -1], normal: [1, 0, 0], len: D },
    { name: 'wall-z1', origin: [W, H, D], u: [-1, 0, 0], normal: [0, 0, -1], len: W },
    { name: 'wall-x1', origin: [W, H, 0], u: [0, 0, 1], normal: [-1, 0, 0], len: D, door: [D / 2 - door / 2, D / 2 + door / 2] },
  ];
}
// the stretches of wall a work may hang on, in walking order (a = metres along the wall's u; the walk runs
// from high a to low a on every wall)
function stretches(walls, R = {}) {
  const out = [];
  if (R.baked) {
    // the free stretches of each wall, between its windows, glass and door, each walked from high a to low a
    for (const wl of walls) {
      const cut = [...(wl.blocks || R.blocks[wl.name] || []), ...(wl.door ? [wl.door] : [])].map(([a, b]) => [a - 0.4, b + 0.4]).sort((p, q) => q[0] - p[0]);
      let hi = wl.len - MARGIN;
      for (const [a, b] of cut) { if (hi - Math.max(b, MARGIN) >= 0.6) out.push({ wall: wl, from: hi, to: Math.max(b, MARGIN), ...(wl.door ? { last: true } : {}) }); hi = Math.min(hi, a); }
      if (hi - MARGIN >= 0.6) out.push({ wall: wl, from: hi, to: MARGIN, ...(wl.door ? { last: true } : {}) });
    }
    return out;
  }
  for (const wl of walls) {
    if (wl.door) {
      out.push({ wall: wl, from: wl.door[0] - 0.5, to: MARGIN, last: true });
    } else out.push({ wall: wl, from: wl.len - MARGIN, to: MARGIN });
  }
  return out;
}

// hang the works: in order, filling each stretch while the works and their gaps fit, then spacing each
// stretch's works evenly. Returns placements and the works that didn't fit.
export function hang(design, sized) {
  const R = { ...ROOMS[design.room] }, walls = wallsOf(R), H = R.h;
  const centre = Math.min(Math.max(+(design.centre || 150) / 100, 1.3), 1.7);
  const order = sized.map((s, i) => ({ ...s, i }));
  // works on the door wall only if the other walls are full
  const runs = stretches(walls, R).map(s => ({ ...s, items: [] }));
  let r = 0;
  const gap = design._tight ? MIN_GAP : GAP;
  const fits = (run, extra) => run.items.reduce((t, x) => t + x.w / 100, 0) + extra + gap * Math.max(0, run.items.length) <= (run.from - run.to);
  // a work the artist has placed (design.placements) stays exactly where it was put; the rest are hung round it
  const manual = order.filter(x => x.at && walls.some(w => w.name === x.at.wall));
  const rest = order.filter(x => !manual.includes(x));
  const pinned = rest.filter(x => x.wall), free = rest.filter(x => !x.wall);
  for (const p of pinned) { const run = runs.find(s => s.wall.name === p.wall); if (run) run.items.push(p); else free.push(p); }
  const left = [];
  for (const it of free) {
    while (r < runs.length && !fits(runs[r], it.w / 100)) r++;
    if (r >= runs.length) { left.push(it); continue; }
    runs[r].items.push(it);
  }
  // too many: try again with tighter gaps before giving up on any
  if (left.length && !design._tight) return hang({ ...design, _tight: true }, sized);
  const placed = [];
  for (const run of runs) {
    if (!run.items.length) continue;
    run.items.sort((a, b) => a.i - b.i);
    const total = run.items.reduce((t, x) => t + x.w / 100, 0), span = run.from - run.to;
    const g = (span - total) / (run.items.length + 1);
    let a = run.from - g;
    for (const it of run.items) {
      const wm = it.w / 100, hm = it.h / 100;
      const y = Math.min(Math.max(centre, hm / 2 + 0.35), H - hm / 2 - 0.35);
      placed.push({ ...it, wall: run.wall, a: a - wm / 2, y });
      a -= wm + g;
    }
  }
  for (const it of manual) {
    const wl = walls.find(w => w.name === it.at.wall), wm = it.w / 100, hm = it.h / 100;
    placed.push({ ...it, wall: wl, a: clampN(it.at.a, Math.min(wm / 2, wl.len / 2), Math.max(wl.len - wm / 2, wl.len / 2)), y: clampN(it.at.y, hm / 2 + 0.1, Math.max(hm / 2 + 0.1, H - hm / 2 - 0.1)) });
  }
  placed.sort((p, q) => p.i - q.i);
  return { R, walls, placed, left };
}

// where no work may hang on each wall (windows, glass, the door), with a margin, as [from, to] along the wall
export function blocksOf(roomSlug) {
  const R = ROOMS[roomSlug], out = {};
  if (!R || !R.baked) return out;
  for (const wl of wallsOf(R)) out[wl.name] = [...(wl.blocks || R.blocks[wl.name] || []), ...(wl.door ? [wl.door] : [])].map(([a, b]) => [a - 0.3, b + 0.3]);
  return out;
}

// --- drawing the room -----------------------------------------------------------------------------------
function drawBakedWall(R, wl, works, img, editing) {
  const cap = wl.partition ? Math.min(1, 2304 / img.naturalWidth) : 1;           // (partitions at a little less: there are up to four)
  const c = canvas(img.naturalWidth * cap, img.naturalHeight * cap), ctx = c.getContext('2d'), k = c.width / wl.len;
  if (wl.flip) { ctx.translate(c.width, 0); ctx.scale(-1, 1); }
  ctx.drawImage(img, 0, 0, c.width, c.height);
  if (wl.flip) ctx.setTransform(1, 0, 0, 1, 0, 0);
  if (R.light === 'daylight' || editing) return c;   // daylight is already on the wall: nothing aims at a work (and while hanging, the pools wait)
  ctx.globalCompositeOperation = 'lighter';
  for (const p of works) {
    const wm = p.w / 100, hm = p.h / 100, x = p.a * k, y = (R.h - p.y) * k;
    if (R.light === 'narrow') pool(ctx, x, y - 0.05 * k, (wm / 2 + 0.35) * k, (hm / 2 + 0.35) * k, 0.2, '255,236,205');
    else { pool(ctx, x, y - 0.1 * k, (wm / 2 + 0.6) * k, (hm / 2 + 0.62) * k, 0.1); pool(ctx, x, y - (hm / 2 + 0.55) * k, (wm / 2 + 0.2) * k, 0.9 * k, 0.03); }
  }
  ctx.globalCompositeOperation = 'source-over';
  return c;
}

function drawWall(R, wl, works, paint, seed) {
  const H = R.h, ppm = Math.min(220, 4096 / wl.len), cw = wl.len * ppm, ch = H * ppm;
  const c = canvas(cw, ch), ctx = c.getContext('2d');
  ctx.fillStyle = paint; ctx.fillRect(0, 0, c.width, c.height);
  texture(ctx, c.width, c.height, seed, lum(paint) > 0.5 ? 0.05 : 0.09, 0.035);
  // the light: ambient, then the fixtures' pools, then the corners and the wall's foot in shade
  const L = canvas(c.width / 2, c.height / 2), l = L.getContext('2d'), k = ppm / 2;
  const dark = lum(paint) < 0.3;
  const amb = R.light === 'narrow' ? 0.62 : R.light === 'daylight' ? 0.86 : 0.83;
  l.fillStyle = `rgb(${amb * 255},${amb * 254},${amb * 250})`; l.fillRect(0, 0, L.width, L.height);
  if (R.light === 'daylight') {
    // light from the skylights: the top of the wall a little brighter, softly falling to the floor
    const g = l.createLinearGradient(0, 0, 0, L.height); g.addColorStop(0, 'rgba(255,253,248,.55)'); g.addColorStop(0.5, 'rgba(255,253,248,.12)'); g.addColorStop(1, 'rgba(255,253,248,0)');
    l.fillStyle = g; l.fillRect(0, 0, L.width, L.height);
  }
  l.globalCompositeOperation = 'lighter';
  for (const p of works) {
    const wm = p.w / 100, hm = p.h / 100, x = p.a * k, y = (H - p.y) * k;
    if (R.light === 'spots') {
      // a spot from the track: a pool a little wider than the work, brightest just above its middle,
      // and the beam's faint upper edge rising on the wall
      pool(l, x, y - 0.1 * k, (wm / 2 + 0.6) * k, (hm / 2 + 0.62) * k, 0.17);
      pool(l, x, y - (hm / 2 + 0.55) * k, (wm / 2 + 0.2) * k, 0.9 * k, 0.05);
    } else if (R.light === 'narrow') {
      pool(l, x, y - 0.05 * k, (wm / 2 + 0.3) * k, (hm / 2 + 0.3) * k, dark ? 0.5 : 0.34, '255,240,215');
    } else {
      pool(l, x, y, (wm / 2 + 1.1) * k, (hm / 2 + 1.0) * k, 0.1);
    }
  }
  l.globalCompositeOperation = 'source-over';
  const s = k;
  edgeShade(l, 0, 0, 0.45 * s, 0, 0.45 * s, L.height, 0.2);
  edgeShade(l, L.width, 0, L.width - 0.45 * s, 0, 0.45 * s, L.height, 0.2);
  edgeShade(l, 0, 0, 0, 0.3 * s, L.width, 0.3 * s, R.light === 'daylight' ? 0.05 : 0.14);
  edgeShade(l, 0, L.height, 0, L.height - 0.18 * s, L.width, 0.18 * s, 0.24);
  ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.imageSmoothingQuality = 'high'; ctx.drawImage(L, 0, 0, c.width, c.height); ctx.restore();
  // a shadow gap where the wall meets the floor
  ctx.fillStyle = 'rgba(20,18,16,.55)'; ctx.fillRect(0, c.height - 0.012 * ppm, c.width, 0.012 * ppm);
  return c;
}

function drawFloorTile(kind, seed) {
  const n = 1024, c = canvas(n, n), ctx = c.getContext('2d'), r = rng(seed);
  if (kind === 'oak') {
    // planks 18 cm wide running down the room's length, 1.8 or 2.4 m long, ends staggered; the tile is 2.16 m
    const pw = n / 12, ppm = n / 2.16;
    for (let i = 0; i < 12; i++) {
      // a row of planks exactly one tile long, starting anywhere and wrapping round (the tile repeats)
      const lens = []; let t = 0;
      while (t < n) { const L = (r() < 0.5 ? 1.8 : 2.4) * ppm; lens.push(L); t += L; }
      lens[lens.length - 1] -= t - n;
      if (lens.length > 1 && lens[lens.length - 1] < 0.6 * ppm) lens[lens.length - 2] += lens.pop();
      let x0 = r() * n;
      for (const len of lens) {
        const tone = 0.86 + r() * 0.2, base = [176 * tone, 134 * tone, 92 * tone], streaks = Array.from({ length: 26 }, () => [r(), 0.04 + r() * 0.08, r() < 0.5, 0.6 + r() * 1.6, 60 + r() * 40]);
        for (const dx of [0, -n]) {
          const x = x0 + dx;
          if (x >= n || x + len <= 0) continue;
          ctx.fillStyle = `rgb(${base.join(',')})`; ctx.fillRect(x, i * pw, len, pw);
          for (const [fy, a, darkS, lw, per] of streaks) {
            const y = i * pw + fy * pw;
            ctx.strokeStyle = darkS ? `rgba(90,58,30,${a})` : `rgba(230,200,160,${a})`; ctx.lineWidth = lw;
            ctx.beginPath(); ctx.moveTo(x, y);
            for (let q = 0; q <= len; q += 40) ctx.lineTo(x + q, y + Math.sin((x0 + q) / per) * 1.6);
            ctx.stroke();
          }
          ctx.fillStyle = 'rgba(40,26,14,.55)'; ctx.fillRect(x, i * pw, 1.5, pw);
        }
        x0 = (x0 + len) % n;
      }
      ctx.fillStyle = 'rgba(40,26,14,.5)'; ctx.fillRect(0, i * pw, n, 1.5);
    }
    texture(ctx, n, n, seed + 1, 0.06, 0.04);
    return { c, tile: 2.16 };
  }
  if (kind === 'stone') {
    ctx.fillStyle = '#3a3836'; ctx.fillRect(0, 0, n, n);
    ctx.save(); ctx.globalCompositeOperation = 'overlay'; ctx.globalAlpha = 0.35; ctx.drawImage(noiseCanvas(n, 5, seed, 5), 0, 0); ctx.restore();
    for (let i = 0; i < 2600; i++) { ctx.fillStyle = r() < 0.5 ? 'rgba(200,196,190,.18)' : 'rgba(10,10,10,.25)'; const s = 0.6 + r() * 1.8; ctx.fillRect(r() * n, r() * n, s, s); }
    // slabs of 1.2 m: the tile is 2.4 m, two slabs each way
    ctx.fillStyle = 'rgba(0,0,0,.45)'; for (const p of [0, n / 2]) { ctx.fillRect(p, 0, 2, n); ctx.fillRect(0, p, n, 2); }
    return { c, tile: 2.4 };
  }
  // polished concrete
  ctx.fillStyle = '#b7b3ac'; ctx.fillRect(0, 0, n, n);
  // a calm, even slab: broad soft clouding, a finer mottle, and the sand in it
  ctx.save(); ctx.globalCompositeOperation = 'overlay'; ctx.globalAlpha = 0.16; ctx.drawImage(noiseCanvas(n, 3, seed, 3), 0, 0);
  ctx.globalAlpha = 0.1; ctx.drawImage(noiseCanvas(n, 32, seed + 3, 2), 0, 0); ctx.restore();
  for (let i = 0; i < 1400; i++) { ctx.fillStyle = r() < 0.6 ? 'rgba(90,86,80,.18)' : 'rgba(240,238,232,.16)'; const s = 0.5 + r() * 1.4; ctx.beginPath(); ctx.arc(r() * n, r() * n, s, 0, 7); ctx.fill(); }
  // a saw-cut joint every 3.2 m (the tile's edge)
  ctx.fillStyle = 'rgba(70,66,60,.35)'; ctx.fillRect(0, 0, n, 1.5); ctx.fillRect(0, 0, 1.5, n);
  return { c, tile: 3.2 };
}

function drawFloorLight(R, placed) {
  const ppm = 48, c = canvas(R.w * ppm, R.d * ppm), l = c.getContext('2d');
  const amb = R.light === 'narrow' ? 0.5 : R.light === 'daylight' ? 0.74 : 0.66;
  l.fillStyle = `rgb(${amb * 255},${amb * 255},${amb * 255})`; l.fillRect(0, 0, c.width, c.height);
  l.globalCompositeOperation = 'lighter';
  if (R.light === 'daylight') for (let x = 1.5; x < R.w - 1; x += 3) pool(l, x * ppm, R.d / 2 * ppm, 1.6 * ppm, (R.d / 2) * ppm, 0.16, '255,255,255');
  // the light from each work's fixture lands on the floor in front of it
  for (const p of placed) {
    const [ox, , oz] = p.wall.origin, [ux, , uz] = p.wall.u, [nx, , nz] = p.wall.normal;
    const x = ox + ux * p.a + nx * 0.5, z = oz + uz * p.a + nz * 0.5;
    const r = R.light === 'narrow' ? 0.6 : 1.0;
    pool(l, x * ppm, z * ppm, (p.w / 200 + r) * ppm * (Math.abs(ux) || 0.6), (p.w / 200 + r) * ppm * (Math.abs(uz) || 0.6), R.light === 'narrow' ? 0.22 : 0.1, '255,250,240');
  }
  l.globalCompositeOperation = 'source-over';
  // darker along the walls
  const s = ppm;
  edgeShade(l, 0, 0, 0.5 * s, 0, 0.5 * s, c.height, 0.22); edgeShade(l, c.width, 0, c.width - 0.5 * s, 0, 0.5 * s, c.height, 0.22);
  edgeShade(l, 0, 0, 0, 0.5 * s, c.width, 0.5 * s, 0.22); edgeShade(l, 0, c.height, 0, c.height - 0.5 * s, c.width, 0.5 * s, 0.22);
  return c;
}

function drawCeiling(R, placed, paint) {
  const ppm = 90, c = canvas(R.w * ppm, R.d * ppm), ctx = c.getContext('2d');
  // the ceiling is lit only by what the room throws back: darker than the walls
  const base = R.ceiling === 'dark' ? '#262527' : R.ceiling === 'skylight' ? '#d6d2ca' : '#cfccc6';
  ctx.fillStyle = base; ctx.fillRect(0, 0, c.width, c.height);
  texture(ctx, c.width, c.height, 11, 0.05, 0.03);
  // (the image's top is the ceiling's z = d edge; x runs left to right)
  const X = x => x * ppm, Z = z => (R.d - z) * ppm;
  if (R.ceiling === 'skylight') {
    for (let x = 1.5; x < R.w - 1; x += 3) {
      const x0 = X(x - 1.1), w = 2.2 * ppm, z0 = Z(R.d / 2 + 1.4), h = 2.8 * ppm;
      ctx.fillStyle = '#9d988f'; ctx.fillRect(x0 - 8, z0 - 8, w + 16, h + 16);
      const g = ctx.createLinearGradient(0, z0, 0, z0 + h); g.addColorStop(0, '#f6f7f6'); g.addColorStop(0.5, '#fdfdfb'); g.addColorStop(1, '#f2f3f2');
      ctx.fillStyle = g; ctx.fillRect(x0, z0, w, h);
      ctx.fillStyle = 'rgba(120,116,108,.6)'; for (let i = 1; i < 4; i++) ctx.fillRect(x0, z0 + h * i / 4 - 1.5, w, 3); ctx.fillRect(x0 + w / 2 - 1.5, z0, 3, h);
    }
    return c;
  }
  // track lights: a rail 1.2 m in from the walls all round, a can on it aimed at each work
  const inset = Math.min(1.2, R.d / 4);
  if (R.ceiling === 'track') {
    ctx.strokeStyle = '#2a2826'; ctx.lineWidth = 0.035 * ppm;
    ctx.strokeRect(X(inset), Z(R.d - inset), X(R.w - 2 * inset), (R.d - 2 * inset) * ppm);
  }
  for (const p of placed) {
    const [ox, , oz] = p.wall.origin, [ux, , uz] = p.wall.u, [nx, , nz] = p.wall.normal;
    const x = ox + ux * p.a + nx * inset, z = oz + uz * p.a + nz * inset;
    ctx.fillStyle = R.ceiling === 'dark' ? '#111' : '#2a2826';
    ctx.beginPath(); ctx.ellipse(X(x), Z(z), 0.07 * ppm, 0.07 * ppm, 0, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(255,250,235,.85)'; ctx.beginPath(); ctx.arc(X(x) + nx * 0.03 * ppm, Z(z) - nz * 0.03 * ppm, 0.03 * ppm, 0, 7); ctx.fill();
  }
  return c;
}

function drawWorkLight(R) {
  const n = 64, c = canvas(n, n), l = c.getContext('2d');
  // the fixture's pool across the canvas: brightest a little above its middle
  const top = R.light === 'narrow' ? 1.0 : R.light === 'daylight' ? 0.97 : 1.0, edge = R.light === 'narrow' ? 0.74 : R.light === 'daylight' ? 0.92 : 0.86;
  const g = l.createRadialGradient(n / 2, n * 0.35, 0, n / 2, n * 0.35, n * 0.95);
  g.addColorStop(0, `rgb(${top * 255},${top * 252},${top * 246})`); g.addColorStop(1, `rgb(${edge * 255},${edge * 251},${edge * 244})`);
  l.fillStyle = g; l.fillRect(0, 0, n, n);
  return c;
}

// --- the room, ready for the viewer ----------------------------------------------------------------------
// design: { title, room, paint, centre (cm), works: [{ title, image, pairs | width/height, wall? }] }
// Returns { spec, left (works that didn't fit), revoke() }.
// a sculpture or vessel stands on a plinth, whatever the artist filed it as (kind object, category Sculpture, a deep piece, or a
// medium that is clay, bronze, stone...); a painting, drawing or print never does
const FLAT = /oil|acrylic|canvas|paint|gouache|tempera|watercolou?r|pastel|print|drawing|ink|photograph|collage|etching|lithograph/i;
export const isObject = w => w.kind === 'object' || /sculpt|object|ceramic|installation/i.test(w.category || '') || (+w.depth > 0 && !FLAT.test(w.medium || ''))
  || (!w.category && !FLAT.test(w.medium || '') && /ceramic|clay|porcelain|bronze|sculpt|marble|plaster|terracotta|stoneware/i.test(w.medium || ''));
export async function buildRoom(design, src) {
  const pl = design.placements || {};
  const wallWorks = design.works.filter(w => !isObject(w)), objects = design.works.filter(isObject);
  const sized = await Promise.all(wallWorks.map(async w => ({ work: w, ...(await sizeOf(w, src)), wall: w.wall, at: w.id ? pl[w.id] : null })));
  const { R, walls, placed, left } = hang(design, sized);
  // plinths: those the artist set, and one in the middle of the room for each object not yet on one
  const plinths = (design.plinths || []).filter(p => PLINTHS[p.size]).map(p => ({ ...p }));
  const free = objects.filter(o => !plinths.some(p => p.work === o.id));
  free.forEach((o, i) => plinths.push({ id: 'p-' + (o.id || i), x: R.w * (i + 1) / (free.length + 1), z: R.d / 2, size: 'm', work: o.id }));
  for (const p of plinths) { const [pw, pd] = PLINTHS[p.size]; p.x = clampN(p.x, pw / 200 + 0.4, Math.max(pw / 200 + 0.4, R.w - pw / 200 - 0.4)); p.z = clampN(p.z, pd / 200 + 0.4, Math.max(pd / 200 + 0.4, R.d - pd / 200 - 0.4)); }
  const objSized = await Promise.all(objects.map(async o => ({ o, ...(await sizeOf(o, src)) })));
  const paint = (PAINTS[design.paint] || PAINTS[ROOMS[design.room].paint])[1];
  const seed = hash(design.title + design.room);
  const urls = [];
  const keep = async (c, png) => { const u = await (png ? urlPng(c) : url(c)); urls.push(u); return u; };
  const surfaces = [];
  for (const wl of walls) {
    const on = placed.filter(p => p.wall === wl);
    const file = R.baked + (wl.file || wl.name) + '.jpg';
    const plain = R.baked && !wl.flip && !wl.partition && (!on.length || R.light === 'daylight' || design.editing);   // (nothing to add to the photograph)
    const img = R.baked && !plain ? await loadImg(file).catch(() => null) : null;
    surfaces.push({
      name: wl.name, kind: 'wall', texture: plain ? file : await keep(img ? drawBakedWall(R, wl, on, img, design.editing) : drawWall(R, wl, on, paint, seed + surfaces.length)),
      origin: wl.origin, u: wl.u, v: [0, -1, 0], size: [wl.len, R.h], normal: wl.normal,
      openings: wl.door ? [{ from: wl.door[0], to: wl.door[1], height: R.doorHeight || Math.min(2.7, R.h - 0.6), arch: false, depth: PART, ...(wl.partition ? { through: true, bare: !!wl.bare } : {}) }] : [],
    });
  }
  if (R.baked) {
    // the floor and the ceiling as photographed (the floor whole, not a repeating tile)
    surfaces.push({ name: 'floor', kind: 'floor', texture: R.baked + 'floor.jpg', tileXY: [R.w, R.d], origin: [0, 0, 0], u: [1, 0, 0], v: [0, 0, 1], size: [R.w, R.d], normal: [0, 1, 0], openings: [], ...(R.cells > 1 ? { repeat: [R.cells, 1] } : {}) });
    surfaces.push({ name: 'ceiling', kind: 'ceiling', texture: R.baked + 'ceiling.jpg', origin: [0, R.h, R.d], u: [1, 0, 0], v: [0, 0, -1], size: [R.w, R.d], normal: [0, -1, 0], openings: [], ...(R.cells > 1 ? { repeat: [R.cells, 1] } : {}) });
  } else {
    const tile = drawFloorTile(R.floor, seed);
    surfaces.push({
      name: 'floor', kind: 'floor', texture: await keep(tile.c), tile: tile.tile, light: await keep(drawFloorLight(R, placed), true),
      lightScale: R.light === 'narrow' ? 1.25 : 1.3, origin: [0, 0, 0], u: [1, 0, 0], v: [0, 0, 1], size: [R.w, R.d], normal: [0, 1, 0], openings: [],
    });
    surfaces.push({ name: 'ceiling', kind: 'ceiling', texture: await keep(drawCeiling(R, placed, paint)), origin: [0, R.h, R.d], u: [1, 0, 0], v: [0, 0, -1], size: [R.w, R.d], normal: [0, -1, 0], openings: [] });
  }
  const plaster = canvas(512, 512), pc = plaster.getContext('2d');
  pc.fillStyle = paint; pc.fillRect(0, 0, 512, 512); texture(pc, 512, 512, seed + 9, 0.05, 0.03);
  pc.fillStyle = 'rgba(0,0,0,.12)'; pc.fillRect(0, 0, 512, 512);
  const workLight = await keep(drawWorkLight(R), true);
  const works = placed.map(p => {
    const [ox, , oz] = p.wall.origin, [ux, , uz] = p.wall.u, N = p.wall.normal, off = DEPTH + 0.004;
    return {
      id: p.work.id, work: p.work.title, image: p.work.image, imageSmall: p.work.imageSmall, size: [p.w, p.h], measured: [p.w, p.h],
      centre: [ox + ux * p.a + N[0] * off, p.y, oz + uz * p.a + N[2] * off], axes: [p.wall.u, [0, 1, 0], N], depth: DEPTH,
      light: workLight, lightScale: 1, ...(p.guessed ? { guessed: true } : {}),
    };
  });
  const floorReflect = R.floorReflect || (R.floor === 'oak' ? [0.03, 0.12] : R.floor === 'stone' ? [0.08, 0.34] : [0.06, 0.26]);
  const spec = {
    version: 2, title: design.title, source: `${ROOMS[design.room].name}, a virtual room`, virtual: true, ordered: true, ...(R.baked ? { baked: { kind: R.kind, plates: (R.plates || []).flatMap(p => R.cells > 1 && p.wall !== 'wall-x0' && p.wall !== 'wall-x1' ? Array.from({ length: R.cells }, (_, k) => ({ ...p, wall: `${p.wall}-c${k}`, texture: R.baked + p.file })) : [{ ...p, texture: R.baked + p.file }]) },
      ...(R.cells > 1 ? { partitions: Array.from({ length: R.cells - 1 }, (_, i) => ({ x: (i + 1) * R.cell, t: PART, door: (R.doorSpan || [R.d / 2 - 0.7, R.d / 2 + 0.7]) })) } : {}) } : {}),
    room: { x0: 0, x1: R.w, z0: 0, z1: R.d, height: R.h }, surfaces, works, views: [], floorReflect, plaster: await keep(plaster),
    plinths: plinths.map(p => { const x = objSized.find(q => q.o.id === p.work); return { id: p.id, x: p.x, z: p.z, size: PLINTHS[p.size], key: p.size, work: p.work || null,
      obj: x ? { id: x.o.id, title: x.o.title, image: x.o.image, w: x.w, h: x.h } : null }; }),
    blocks: blocksOf(design.room),
  };
  const placements = {};
  for (const p of placed) if (p.work.id) placements[p.work.id] = { wall: p.wall.name, a: +p.a.toFixed(3), y: +p.y.toFixed(3) };
  return { spec, placements, plinths: plinths.map(({ id, x, z, size, work }) => ({ id, x: +x.toFixed(3), z: +z.toFixed(3), size, work: work || null })), left: left.map(x => x.work), revoke: () => urls.forEach(u => URL.revokeObjectURL(u)) };
}


// =====================================================================================================================
// The museum street (night 10.11): one long straight axis on one level, fully indoors, the exhibitions' rooms open off it.
// Each room has a short colour threshold (a vestibule painted in one saturated colour that announces the show), the
// street has a luminous ceiling whose hue shifts along the walk, and the walls stay light so the art reads. Everything is
// flat, baked colour (unlit materials, no live lights), so it is cheap on a phone. Drawn into the same room description
// the viewer reads (space.js: spec.solids are its walls, spec.start where the walk begins, spec.noSpots no live lights).
// =====================================================================================================================

const hex2 = n => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
export function hslHex(h, s, l) {
  const a = s * Math.min(l, 1 - l), f = n => { const k = (n + h / 30) % 12; return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)); };
  return '#' + [f(0), f(8), f(4)].map(v => hex2(v * 255)).join('');
}
export function hexHsl(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255, g = parseInt(hex.slice(3, 5), 16) / 255, b = parseInt(hex.slice(5, 7), 16) / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  let h = d === 0 ? 0 : mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [(h * 60 + 360) % 360, s, l];
}
// the colour an exhibition's works suggest: the most common saturated hue among small samples of a few of them
export async function suggestColour(urls, src, fallbackHue = 30) {
  const bins = new Float64Array(24);
  await Promise.all(urls.slice(0, 5).map(u => new Promise(res => {
    const i = new Image(); i.crossOrigin = 'anonymous';
    i.onload = () => {
      try {
        const c = canvas(24, 24), x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(i, 0, 0, 24, 24);
        const d = x.getImageData(0, 0, 24, 24).data;
        for (let k = 0; k < d.length; k += 4) {
          const [h, s, l] = hexHsl('#' + hex2(d[k]) + hex2(d[k + 1]) + hex2(d[k + 2]));
          if (s < 0.28 || l < 0.15 || l > 0.9) continue;
          bins[Math.floor(h / 15) % 24] += s * s * (1 - Math.abs(l - 0.5));
        }
      } catch {}
      res();
    };
    i.onerror = () => res(); i.src = src(u);
  })));
  const sc = b => bins[b] + 0.5 * (bins[(b + 23) % 24] + bins[(b + 1) % 24]);
  let best = 0; for (let b = 1; b < 24; b++) if (sc(b) > sc(best)) best = b;
  if (bins[best] < 0.02) return hslHex(fallbackHue, 0.62, 0.47);
  return hslHex(best * 15 + 7.5, 0.62, 0.47);
}

// a hue of its own for a show with no suggestion, from its name (the app and the control room agree)
export const slugHue = slug => { let h = 7; for (const c of String(slug)) h = (h * 31 + c.charCodeAt(0)) % 360; return h; };

// the exhibitions that hang in the street: the virtual rooms and the online shows that have works
export const streetShows = M => M.exhibitions.filter(e => (e.virtual || e.kind === 'online') && (e.works || []).length >= 3).slice(0, 8);

// proportions after the approved spec (street_spec.py, concept 6): a street 7 m wide and 5 m high, rooms 3.8 m high, doors 3.2 x 3.3 m, thresholds 1.8 m deep
const SH = { H: 5.0, RH: 3.8, W: 7, RD: 6, RW: 8, VD: 1.8, PITCH: 10, MOUTH: 3.2, DOOR_H: 3.3, RIM: 0.22 };
const shade = (hex, k) => '#' + [1, 3, 5].map(i => hex2(parseInt(hex.slice(i, i + 2), 16) * k)).join('');
const rgba = (hex, a) => `rgba(${parseInt(hex.slice(1, 3), 16)},${parseInt(hex.slice(3, 5), 16)},${parseInt(hex.slice(5, 7), 16)},${a})`;
const jpg = (c, q = 0.92) => c.toDataURL('image/jpeg', q);

// rooms: [{ slug, title, colour: '#rrggbb', works: [work as the app has it: title, image, pairs] }]
export async function buildStreet(rooms, src, thumbOf = w => w.image) {
  const { H, RH, W, RD, RW, VD, PITCH, MOUTH, DOOR_H, RIM } = SH;
  const Z0 = VD + RD + 0.2, Z1 = Z0 + W, ZS = Z1 + VD + RD, ZC = (Z0 + Z1) / 2;
  const n = rooms.length, S = Math.ceil(n / 2), L = 7 + PITCH * S;
  const surfaces = [], solids = [], works = [], flat = new Map();
  const plain = c => { if (!flat.has(c)) { const cv = canvas(4, 4), x = cv.getContext('2d'); x.fillStyle = c; x.fillRect(0, 0, 4, 4); flat.set(c, cv.toDataURL('image/png')); } return flat.get(c); };
  const slot = i => 6 + PITCH * Math.floor(i / 2), mouthOf = i => [slot(i) + RW / 2 + 1 - MOUTH / 2, slot(i) + RW / 2 + 1 + MOUTH / 2];
  const idx = rooms.map((r, i) => i), north = idx.filter(i => i % 2 === 0), south = idx.filter(i => i % 2 === 1);

  // the hue along the street: the rooms' own hues, blended slowly, so the ceiling is one continuous glow and not bands
  const pts = [];
  for (let s = 0; s < S; s++) {
    const hs = [rooms[2 * s], rooms[2 * s + 1]].filter(Boolean).map(r => hexHsl(r.colour)[0] * Math.PI / 180);
    pts.push([(slot(2 * s) + RW / 2 + 1) / L, (Math.atan2(hs.reduce((a, h) => a + Math.sin(h), 0), hs.reduce((a, h) => a + Math.cos(h), 0)) * 180 / Math.PI + 360) % 360]);
  }
  const hueAt = t => {
    if (t <= pts[0][0]) return pts[0][1]; if (t >= pts[pts.length - 1][0]) return pts[pts.length - 1][1];
    let k = 1; while (pts[k][0] < t) k++;
    const [t0, h0] = pts[k - 1], [t1, h1] = pts[k]; let dh = h1 - h0; if (dh > 180) dh -= 360; if (dh < -180) dh += 360;
    const u = (t - t0) / (t1 - t0), e = u * u * (3 - 2 * u); return (h0 + dh * e + 360) % 360;
  };
  const glowAt = x => hslHex(hueAt(x / L), 0.5, 0.72);                 // the ceiling's light as it falls on the walls and floor at x

  // a wall from (x, z) running along u = (nz, -nx) for len, facing (nx, nz); holes [a, b] along it are open doorways
  const wall = (name, x, z, nx, nz, len, o = {}) => {
    const ux = nz, uz = -nx, holes = o.holes || [], h = o.h || H;
    surfaces.push({ name, kind: 'wall', texture: o.tex, origin: [x, h, z], u: [ux, 0, uz], v: [0, -1, 0], size: [len, h], normal: [nx, 0, nz],
      openings: holes.map(([a, b]) => ({ from: a, to: b, height: DOOR_H, arch: false, depth: 0.1, through: true, bare: true })) });
    let a = 0; for (const [f, t] of [...holes, [len, len]].sort((p, q) => p[0] - q[0])) { if (f > a + 0.01) solids.push([x + ux * a, z + uz * a, x + ux * f, z + uz * f]); a = Math.max(a, t); }
  };
  // a flat plane at height y: facing up (texture top = smaller z) or down (texture bottom = smaller z)
  const plane = (name, kind, x, z, w, d, y, up, tex) => surfaces.push({ name, kind, texture: tex, origin: [x, y, up ? z : z + d], u: [1, 0, 0], v: up ? [0, 0, 1] : [0, 0, -1], size: [w, d], normal: [0, up ? 1 : -1, 0], openings: [] });
  const noise = (x, w, h, count, a) => { for (let i = 0; i < count; i++) { const v = Math.random() < 0.5 ? 255 : 0; x.fillStyle = `rgba(${v},${v},${v},${Math.random() * a})`; x.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 1.5, 1 + Math.random() * 1.5); } };

  // --- a street wall, painted once: plaster, the ceiling's glow falling down from the top, a soft foot, a skirting line, the
  //     colour of each threshold spilling onto the wall beside it, and the exhibition's name, small and quiet
  const PPM = 72;
  const streetWall = isN => {
    const w = Math.round(L * PPM), h = Math.round(H * PPM), c = canvas(w, h), x = c.getContext('2d'), X = v => (isN ? v : L - v) * PPM;
    x.fillStyle = '#f2efe9'; x.fillRect(0, 0, w, h);
    for (let px = 0; px < w; px += 6) {
      const wx = (isN ? px : w - px) / PPM, g = x.createLinearGradient(0, 0, 0, 2.4 * PPM);
      g.addColorStop(0, rgba(glowAt(wx), 0.4)); g.addColorStop(0.45, rgba(glowAt(wx), 0.13)); g.addColorStop(1, rgba(glowAt(wx), 0));
      x.fillStyle = g; x.fillRect(px, 0, 6, 2.4 * PPM);
    }
    for (const i of (isN ? north : south)) {
      const [a, b] = mouthOf(i), m = (a + b) / 2, col = rooms[i].colour;
      x.save(); x.translate(X(m), (H - 1.5) * PPM); x.scale(3.3 * PPM, 2.6 * PPM);
      const g = x.createRadialGradient(0, 0, 0, 0, 0, 1); g.addColorStop(0, rgba(col, 0.3)); g.addColorStop(0.5, rgba(col, 0.11)); g.addColorStop(1, rgba(col, 0));
      x.fillStyle = g; x.fillRect(-1, -1, 2, 2); x.restore();
    }
    const ao = x.createLinearGradient(0, h - 0.7 * PPM, 0, h); ao.addColorStop(0, 'rgba(70,58,44,0)'); ao.addColorStop(1, 'rgba(70,58,44,0.2)'); x.fillStyle = ao; x.fillRect(0, h - 0.7 * PPM, w, 0.7 * PPM);
    x.fillStyle = 'rgba(255,255,255,0.35)'; x.fillRect(0, h - 0.12 * PPM, w, 0.12 * PPM); x.fillStyle = 'rgba(60,50,40,0.3)'; x.fillRect(0, h - 0.125 * PPM, w, 1.5);
    noise(x, w, h, 14000, 0.05);
    x.textAlign = 'center'; x.textBaseline = 'middle';
    for (const i of (isN ? north : south)) {
      const [a, b] = mouthOf(i), cx = X((a + b) / 2), cy = (H - (DOOR_H + (H - DOOR_H) / 2)) * PPM, t = rooms[i].title;
      let fs = 0.3 * PPM; x.font = `500 ${fs}px Georgia, serif`; while (x.measureText(t).width > 3.0 * PPM && fs > 10) { fs -= 1; x.font = `500 ${fs}px Georgia, serif`; }
      x.fillStyle = 'rgba(40,36,30,0.82)'; x.fillText(t, cx, cy - 0.05 * PPM);
      x.fillStyle = rooms[i].colour; x.fillRect(cx - 0.35 * PPM, cy + 0.2 * PPM, 0.7 * PPM, 3);
      x.fillStyle = 'rgba(40,36,30,0.5)'; x.font = `${0.14 * PPM}px Georgia, serif`; x.fillText(`${rooms[i].works.length} works`, cx, cy + 0.38 * PPM);
    }
    return jpg(c);
  };
  wall('street-n', 0, Z0, 0, 1, L, { holes: north.map(mouthOf), tex: streetWall(true) });
  wall('street-s', L, Z1, 0, -1, L, { holes: south.map(i => { const [a, b] = mouthOf(i); return [L - b, L - a]; }), tex: streetWall(false) });

  // the ends: the entrance (the street's name) and, at the far end, the last hue's glow
  const endWall = title => {
    const w = W * 80, h = H * 80, c = canvas(w, h), x = c.getContext('2d'), hue = title ? pts[0][1] : pts[pts.length - 1][1];
    x.fillStyle = '#f2efe9'; x.fillRect(0, 0, w, h);
    const g = x.createLinearGradient(0, 0, 0, 2.6 * 80); g.addColorStop(0, rgba(hslHex(hue, 0.5, 0.72), 0.55)); g.addColorStop(1, rgba(hslHex(hue, 0.5, 0.72), 0)); x.fillStyle = g; x.fillRect(0, 0, w, 2.6 * 80);
    const ao = x.createLinearGradient(0, h - 56, 0, h); ao.addColorStop(0, 'rgba(70,58,44,0)'); ao.addColorStop(1, 'rgba(70,58,44,0.2)'); x.fillStyle = ao; x.fillRect(0, h - 56, w, 56);
    x.fillStyle = 'rgba(60,50,40,0.3)'; x.fillRect(0, h - 11, w, 1.5);
    if (title) { x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = 'rgba(40,36,30,0.85)'; x.font = '500 46px Georgia, serif'; x.fillText('The Street', w / 2, h * 0.5);
      x.fillStyle = 'rgba(40,36,30,0.5)'; x.font = '17px Georgia, serif'; x.fillText('the exhibitions open off this walk', w / 2, h * 0.5 + 40); }
    noise(x, w, h, 3000, 0.05);
    return jpg(c);
  };
  wall('end-w', 0, Z1, 1, 0, W, { tex: endWall(true) }); wall('end-e', L, Z0, -1, 0, W, { tex: endWall(false) });

  // --- the street's floor: pale polished terrazzo, a faint reflection of the ceiling's glow down the middle, the foot of each wall
  //     a little darker, and each threshold's colour spilled onto it
  const FP = 64, fw = Math.round(L * FP), fh = Math.round(W * FP), fc = canvas(fw, fh), fx = fc.getContext('2d');
  fx.fillStyle = '#d8d3ca'; fx.fillRect(0, 0, fw, fh);
  for (let px = 0; px < fw; px += 8) {
    const g = fx.createLinearGradient(0, 0, 0, fh), gl = glowAt(px / FP);
    g.addColorStop(0, 'rgba(90,76,60,0.2)'); g.addColorStop(0.18, rgba(gl, 0)); g.addColorStop(0.5, rgba(gl, 0.16)); g.addColorStop(0.82, rgba(gl, 0)); g.addColorStop(1, 'rgba(90,76,60,0.2)');
    fx.fillStyle = g; fx.fillRect(px, 0, 8, fh);
  }
  for (let i = 0; i < 9000; i++) { const t = Math.random(); fx.fillStyle = t < 0.4 ? 'rgba(255,255,255,0.35)' : t < 0.8 ? 'rgba(80,70,60,0.18)' : 'rgba(190,160,130,0.25)'; fx.fillRect(Math.random() * fw, Math.random() * fh, 1 + Math.random() * 2, 1 + Math.random() * 2); }
  for (const i of idx) {
    const [a, b] = mouthOf(i), isN = i % 2 === 0, col = rooms[i].colour, m = (a + b) / 2 * FP;
    fx.save(); fx.translate(m, isN ? 0 : fh); fx.scale(MOUTH * 1.15 * FP, 2.7 * FP);
    const g = fx.createRadialGradient(0, 0, 0, 0, 0, 1); g.addColorStop(0, rgba(col, 0.5)); g.addColorStop(0.5, rgba(col, 0.18)); g.addColorStop(1, rgba(col, 0));
    fx.fillStyle = g; fx.fillRect(-1, isN ? 0 : -1, 2, 1); fx.restore();
  }
  plane('street-floor', 'wall', 0, Z0, L, W, 0.003, true, jpg(fc, 0.9));

  // the base floor (taps), under everything
  surfaces.push({ name: 'floor', kind: 'floor', texture: plain('#cfc9be'), tileXY: [2, 2], origin: [0, 0, 0], u: [1, 0, 0], v: [0, 0, 1], size: [L, ZS], normal: [0, 1, 0], openings: [] });

  // the luminous ceiling: one continuous glow, brightest down the middle, deeper toward the walls like light from a cove
  const cw = 1024, ch = 64, cc = canvas(cw, ch), cx = cc.getContext('2d');
  for (let px = 0; px < cw; px++) {
    const hh = hueAt(px / cw * (L - 0) / L), col = cx.createLinearGradient(px, 0, px, ch);
    col.addColorStop(0, hslHex(hh, 0.42, 0.76)); col.addColorStop(0.5, hslHex(hh, 0.26, 0.95)); col.addColorStop(1, hslHex(hh, 0.42, 0.76));
    cx.fillStyle = col; cx.fillRect(px, 0, 1, ch);
  }
  surfaces.push({ name: 'street-ceiling', kind: 'ceiling', texture: jpg(cc, 0.95), origin: [0, H, Z1], u: [1, 0, 0], v: [0, 0, -1], size: [L, W], normal: [0, -1, 0], openings: [] });

  // room walls: light plaster with a soft foot and cornice and a skirting line
  const roomWall = (() => { const c = canvas(64, 256), x = c.getContext('2d'); x.fillStyle = '#f4f1ec'; x.fillRect(0, 0, 64, 256);
    const t = x.createLinearGradient(0, 0, 0, 40); t.addColorStop(0, 'rgba(120,108,92,0.16)'); t.addColorStop(1, 'rgba(120,108,92,0)'); x.fillStyle = t; x.fillRect(0, 0, 64, 40);
    const b = x.createLinearGradient(0, 190, 0, 256); b.addColorStop(0, 'rgba(70,58,44,0)'); b.addColorStop(1, 'rgba(70,58,44,0.2)'); x.fillStyle = b; x.fillRect(0, 190, 64, 66);
    x.fillStyle = 'rgba(255,255,255,0.35)'; x.fillRect(0, 243, 64, 13); x.fillStyle = 'rgba(60,50,40,0.3)'; x.fillRect(0, 242, 64, 1.5); return jpg(c); })();
  // a threshold's inside: the show's colour, a little brighter at the street and deeper toward the room
  const inside = (col, k, mode) => { const c = canvas(32, 64), x = c.getContext('2d'), g = mode === 'side' ? x.createLinearGradient(0, 0, 32, 0) : x.createLinearGradient(0, 0, 0, 64), bright = mode !== 'bottom';
    g.addColorStop(0, shade(col, k * (bright ? 1.06 : 0.84))); g.addColorStop(1, shade(col, k * (bright ? 0.84 : 1.06))); x.fillStyle = g; x.fillRect(0, 0, 32, 64); return c.toDataURL('image/png'); };

  // the rooms
  for (let i = 0; i < n; i++) {
    const r = rooms[i], isN = i % 2 === 0, x0 = slot(i), rx0 = x0 + 1, rx1 = x0 + 1 + RW, [ma, mb] = mouthOf(i), c = r.colour;
    const zf = isN ? Z0 - VD : Z1 + VD, zb = isN ? Z0 - VD - RD : ZS, dir = isN ? -1 : 1, zs = isN ? Z0 : Z1, vz = isN ? zf : Z1, zmin = Math.min(zf, zb), dpt = RD;
    // the threshold, a real volume: its two sides, ceiling and floor all in the show's colour
    for (const [xx, k, sn] of [[ma, 0.8, 1], [mb, 0.92, -1]]) {
      surfaces.push({ name: `th${i}${sn}`, kind: 'wall', texture: inside(c, k, 'side'), origin: [xx, DOOR_H, zs], u: [0, 0, dir], v: [0, -1, 0], size: [VD, DOOR_H], normal: [sn, 0, 0], openings: [] });
      solids.push([xx, zs, xx, zs + dir * VD]);
    }
    // (a ceiling's texture bottom is its smaller z, a floor's top: the street end is brighter)
    plane(`th${i}-ceil`, 'ceiling', ma, vz, MOUTH, VD, DOOR_H, false, inside(c, 1.0, isN ? 'top' : 'bottom'));
    plane(`th${i}-floor`, 'wall', ma, vz, MOUTH, VD, 0.006, true, inside(c, 0.88, isN ? 'bottom' : 'top'));
    // a darker rim round the doorway on the street wall
    const rimTex = plain(shade(c, 0.7)), zz = isN ? Z0 + 0.012 : Z1 - 0.012, ux = isN ? 1 : -1;
    const rim = (nm, xa, xb, ya, yb) => surfaces.push({ name: `rim${i}${nm}`, kind: 'wall', texture: rimTex, origin: [isN ? xa : xb, yb, zz], u: [ux, 0, 0], v: [0, -1, 0], size: [xb - xa, yb - ya], normal: [0, 0, isN ? 1 : -1], openings: [] });
    rim('l', ma - RIM, ma, 0, DOOR_H + RIM); rim('r', mb, mb + RIM, 0, DOOR_H + RIM); rim('t', ma - RIM, mb + RIM, DOOR_H, DOOR_H + RIM);
    // the room: its floor (pale oak, soft at the walls, the threshold's colour spilling in at the door), front wall, three more walls, ceiling
    {
      const P = 80, w = RW * P, h = RD * P, c2 = canvas(w, h), x = c2.getContext('2d');
      x.fillStyle = '#d3bd9a'; x.fillRect(0, 0, w, h);
      for (let k = 0; k < h; k += 0.18 * P) { x.fillStyle = `rgba(${Math.random() < 0.5 ? '255,255,255' : '90,66,40'},${0.03 + Math.random() * 0.05})`; x.fillRect(0, k, w, 0.18 * P); x.fillStyle = 'rgba(80,60,40,0.14)'; x.fillRect(0, k, w, 1); }
      const e = 0.5 * P, edge = (ax, ay, bx, by, rx, ry, rw, rh) => { const g = x.createLinearGradient(ax, ay, bx, by); g.addColorStop(0, 'rgba(60,44,28,0.2)'); g.addColorStop(1, 'rgba(60,44,28,0)'); x.fillStyle = g; x.fillRect(rx, ry, rw, rh); };
      edge(0, 0, 0, e, 0, 0, w, e); edge(0, h, 0, h - e, 0, h - e, w, e); edge(0, 0, e, 0, 0, 0, e, h); edge(w, 0, w - e, 0, w - e, 0, e, h);
      x.save(); x.translate(((ma + mb) / 2 - rx0) * P, isN ? h : 0); x.scale(MOUTH * 1.1 * P, 2.4 * P);
      const g = x.createRadialGradient(0, 0, 0, 0, 0, 1); g.addColorStop(0, rgba(c, 0.42)); g.addColorStop(0.55, rgba(c, 0.14)); g.addColorStop(1, rgba(c, 0)); x.fillStyle = g; x.fillRect(-1, isN ? -1 : 0, 2, 1); x.restore();
      plane(`r${i}-floor`, 'wall', rx0, zmin, RW, RD, 0.004, true, jpg(c2, 0.9));
    }
    if (isN) {
      wall(`r${i}-front`, rx1, zf, 0, -1, RW, { holes: [[rx1 - mb, rx1 - ma]], h: RH, tex: roomWall });
      wall(`r${i}-left`, rx0, zf, 1, 0, dpt, { h: RH, tex: roomWall }); wall(`r${i}-back`, rx0, zb, 0, 1, RW, { h: RH, tex: roomWall }); wall(`r${i}-right`, rx1, zb, -1, 0, dpt, { h: RH, tex: roomWall });
    } else {
      wall(`r${i}-front`, rx0, zf, 0, 1, RW, { holes: [[ma - rx0, mb - rx0]], h: RH, tex: roomWall });
      wall(`r${i}-left`, rx0, zb, 1, 0, dpt, { h: RH, tex: roomWall }); wall(`r${i}-back`, rx1, zb, 0, -1, RW, { h: RH, tex: roomWall }); wall(`r${i}-right`, rx1, zf, -1, 0, dpt, { h: RH, tex: roomWall });
    }
    plane(`r${i}-ceil`, 'ceiling', rx0, zmin, RW, RD, RH, false, plain('#f7f4ee'));
    // hang the works along the left wall, the back wall and the right wall, in walking order
    const runs = isN
      ? [{ n: [1, 0], len: dpt, at: a => [rx0, zf - a] }, { n: [0, 1], len: RW, at: a => [rx0 + a, zb] }, { n: [-1, 0], len: dpt, at: a => [rx1, zb + a] }]
      : [{ n: [1, 0], len: dpt, at: a => [rx0, zf + a] }, { n: [0, -1], len: RW, at: a => [rx0 + a, zb] }, { n: [-1, 0], len: dpt, at: a => [rx1, zb - a] }];
    const sized = await Promise.all(r.works.slice(0, 8).map(async work => {
      const s = await sizeOf({ ...work, image: thumbOf(work) }, src), k = Math.min(1, 140 / Math.max(s.w, s.h));
      return { work, w: s.w * k, h: s.h * k };
    }));
    const GAP = 0.5, MG = 0.7, bucket = runs.map(() => []);
    let ri = 0;
    for (const s of sized) {
      while (ri < runs.length && bucket[ri].reduce((t, q) => t + q.w / 100 + GAP, 0) + s.w / 100 > runs[ri].len - 2 * MG) ri++;
      if (ri >= runs.length) break;
      bucket[ri].push(s);
    }
    bucket.forEach((items, k) => {
      if (!items.length) return;
      const run = runs[k], total = items.reduce((t, q) => t + q.w / 100, 0), g = (run.len - total) / (items.length + 1);
      let a = g;
      for (const s of items) {
        const wm = s.w / 100, hm = s.h / 100, y = Math.min(Math.max(1.5, hm / 2 + 0.4), RH - hm / 2 - 0.5);
        const [px, pz] = run.at(a + wm / 2), N = [run.n[0], 0, run.n[1]], off = 0.039;
        works.push({ id: s.work.slug, work: s.work.title, image: s.work.image, imageSmall: thumbOf(s.work), size: [s.w, s.h], measured: [s.w, s.h],
          centre: [px + N[0] * off, y, pz + N[2] * off], axes: [[N[2], 0, -N[0]], [0, 1, 0], N], depth: 0.035, lightScale: 1 });
        a += wm + g;
      }
    });
  }
  const spec = {
    version: 2, title: 'The Street', source: 'Open Studio museum', virtual: true, ordered: true, far: 90, noSpots: true,
    baked: { kind: 'white-cube', plates: [] },                  // (the viewer's fine plaster grain over the walls, as in the baked rooms)
    room: { x0: 0, x1: L, z0: 0, z1: ZS, height: H }, surfaces, works, views: [], floorReflect: [0, 0], solids,
    start: { pos: [2.8, ZC], look: [L, ZC] },
  };
  return { spec, length: L };
}
