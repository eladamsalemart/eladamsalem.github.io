import { envFor, tintHex } from './outdoors.js';
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
export const ACTIVE_KINDS = ['white-cube', 'concrete', 'glass-pavilion'];
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
// a plinth's width, depth and height in cm: one of the three made sizes, or the artist's own (p.dims)
export const PLINTH_LIMITS = { w: [20, 200], d: [20, 200], h: [20, 150] };
export const plinthDims = p => {
  const d = Array.isArray(p.dims) && p.dims.length === 3 && p.dims.every(v => v > 0) ? p.dims : PLINTHS[p.size] || PLINTHS.m;
  return [clampN(+d[0], ...PLINTH_LIMITS.w), clampN(+d[1], ...PLINTH_LIMITS.d), clampN(+d[2], ...PLINTH_LIMITS.h)];
};
// A freestanding wall (a coulisse) the artist stands in the room, to hang paintings on both its faces: in the list of plinths as
// { id, kind: 'stand', x, z, len (m), rot (degrees, 0 = along the room's width) }. Its height suits paintings and is the room's to set.
export const STAND = { t: 0.24, len: [1.5, 6], step: 0.25, turn: 15 };
export const isStand = p => !!p && p.kind === 'stand';
export const standHeight = R => +Math.min(2.8, Math.max(2.2, (R.h || 3) - 0.5)).toFixed(2);
// the stands a room comes with (the Glass pavilion's picture shows two): only while the artist has set none and has not taken them all away
function defaultStands(R) {
  if (R.kind !== 'glass-pavilion' || R.cells > 1) return [];
  // as in the room's picture: wings across the room on the side away from the glass, the middle left open, so the way in looks
  // down the hall with a wall and its work at each step and the garden beside
  const len = R.w < 12 ? 2.5 : R.w > 20 ? 4 : 3, at = R.w < 12 ? [0.45] : R.w > 20 ? [0.6, 0.4, 0.2] : [0.55, 0.28];
  return at.map((kx, i) => ({ id: 'stand-' + (i + 1), kind: 'stand', x: +(R.w * kx).toFixed(2), z: +(R.d * 0.7).toFixed(2), len, rot: 90 }));
}
export function standsOf(design, R) {
  const list = design.plinths || [];
  const own = list.filter(isStand);
  const src = own.length || list.some(p => p && p.kind === 'no-stands') ? own : defaultStands(R);
  return src.map(p => {
    const len = clampN(+p.len || 3, ...STAND.len), rot = ((+p.rot || 0) % 180 + 180) % 180, r = rot * Math.PI / 180;
    const ex = Math.abs(Math.cos(r)) * len / 2 + 0.6, ez = Math.abs(Math.sin(r)) * len / 2 + 0.6;       // (both ends stay inside the room, with room to walk round)
    return { id: p.id, kind: 'stand', x: +clampN(+p.x || R.w / 2, Math.min(ex, R.w / 2), Math.max(R.w - ex, R.w / 2)).toFixed(3), z: +clampN(+p.z || R.d / 2, Math.min(ez, R.d / 2), Math.max(R.d - ez, R.d / 2)).toFixed(3), len: +len.toFixed(2), rot, h: standHeight(R) };
  });
}
// each face of a stand as a wall a work hangs on (the same shape as the room's walls: origin at the top, u along it, normal out of it)
function standWalls(stands) {
  const out = [];
  for (const s of stands) {
    const r = s.rot * Math.PI / 180, n = [-Math.sin(r), Math.cos(r)];
    for (const [k, sg] of [['a', 1], ['b', -1]]) {
      const N = [n[0] * sg, n[1] * sg], U = [N[1], -N[0]];
      out.push({ name: `${s.id}-${k}`, stand: s.id, h: s.h, len: s.len, blocks: [], normal: [N[0], 0, N[1]], u: [U[0], 0, U[1]],
        origin: [s.x + N[0] * STAND.t / 2 - U[0] * s.len / 2, s.h, s.z + N[1] * STAND.t / 2 - U[1] * s.len / 2] });
    }
  }
  return out;
}

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
      if (wl.stand) { if (wl.len - 0.7 >= 0.6) out.push({ wall: wl, from: wl.len - 0.35, to: 0.35 }); continue; }
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
    } else if (wl.stand) { if (wl.len - 0.7 >= 0.6) out.push({ wall: wl, from: wl.len - 0.35, to: 0.35 }); }
    else out.push({ wall: wl, from: wl.len - MARGIN, to: MARGIN });
  }
  return out;
}

// hang the works: in order, filling each stretch while the works and their gaps fit, then spacing each
// stretch's works evenly. Returns placements and the works that didn't fit.
export function hang(design, sized) {
  const R = { ...ROOMS[design.room] }, stands = standsOf(design, R), walls = [...wallsOf(R), ...standWalls(stands)], H = R.h;
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
      const WH = run.wall.h || H, y = Math.min(Math.max(Math.min(centre, WH / 2 + 0.2), hm / 2 + 0.35), Math.max(WH - hm / 2 - 0.2, WH / 2));
      placed.push({ ...it, wall: run.wall, a: a - wm / 2, y });
      a -= wm + g;
    }
  }
  for (const it of manual) {
    const wl = walls.find(w => w.name === it.at.wall), wm = it.w / 100, hm = it.h / 100;
    placed.push({ ...it, wall: wl, a: clampN(it.at.a, Math.min(wm / 2, wl.len / 2), Math.max(wl.len - wm / 2, wl.len / 2)), y: clampN(it.at.y, hm / 2 + 0.1, Math.max(hm / 2 + 0.1, (wl.h || H) - hm / 2 - 0.1)) });
  }
  placed.sort((p, q) => p.i - q.i);
  return { R, walls, placed, left, stands };
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

// a freestanding wall's face: smooth white paint (charcoal in a dark room), a little brighter towards the top, in shade at its foot,
// and a soft pool of light on each work
function drawStandFace(R, wl, works, editing) {
  const ppm = 96, c = canvas(wl.len * ppm, wl.h * ppm), ctx = c.getContext('2d'), dark = R.light === 'narrow' || R.kind === 'black-box';
  ctx.fillStyle = dark ? '#2e2e31' : '#efede8'; ctx.fillRect(0, 0, c.width, c.height);
  const g = ctx.createLinearGradient(0, 0, 0, c.height);
  g.addColorStop(0, dark ? 'rgba(255,255,255,.03)' : 'rgba(255,255,255,.35)'); g.addColorStop(0.55, 'rgba(255,255,255,0)'); g.addColorStop(0.9, 'rgba(0,0,0,.03)'); g.addColorStop(1, 'rgba(0,0,0,.12)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, c.width, c.height);
  if (!editing) {
    ctx.globalCompositeOperation = 'lighter';
    for (const p of works) { const wm = p.w / 100, hm = p.h / 100; pool(ctx, p.a * ppm, (wl.h - p.y) * ppm - 0.1 * ppm, (wm / 2 + 0.6) * ppm, (hm / 2 + 0.62) * ppm, dark ? 0.2 : 0.07, dark ? '255,236,205' : undefined); }
    ctx.globalCompositeOperation = 'source-over';
  }
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
  const { R, walls, placed, left, stands } = hang(design, sized);
  // plinths: those the artist set, and one in the middle of the room for each object not yet on one
  const plinths = (design.plinths || []).filter(p => !p.kind && (PLINTHS[p.size] || p.dims)).map(p => ({ ...p }));
  const free = objects.filter(o => !plinths.some(p => p.work === o.id));
  free.forEach((o, i) => plinths.push({ id: 'p-' + (o.id || i), x: R.w * (i + 1) / (free.length + 1), z: R.d / 2, size: 'm', work: o.id }));
  for (const p of plinths) { const [pw, pd] = plinthDims(p); p.x = clampN(p.x, pw / 200 + 0.4, Math.max(pw / 200 + 0.4, R.w - pw / 200 - 0.4)); p.z = clampN(p.z, pd / 200 + 0.4, Math.max(pd / 200 + 0.4, R.d - pd / 200 - 0.4)); }
  const objSized = await Promise.all(objects.map(async o => ({ o, ...(await sizeOf(o, src)) })));
  const paint = (PAINTS[design.paint] || PAINTS[ROOMS[design.room].paint])[1];
  const seed = hash(design.title + design.room);
  const urls = [];
  const keep = async (c, png) => { const u = await (png ? urlPng(c) : url(c)); urls.push(u); return u; };
  const surfaces = [];
  for (const wl of walls) {
    const on = placed.filter(p => p.wall === wl);
    if (wl.stand) {     // a freestanding wall's face: white paint, lit like the room, drawn here
      surfaces.push({ name: wl.name, kind: 'wall', stand: wl.stand, texture: await keep(drawStandFace(R, wl, on, !!design.editing)),
        origin: wl.origin, u: wl.u, v: [0, -1, 0], size: [wl.len, wl.h], normal: wl.normal, openings: [] });
      continue;
    }
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
    ...(R.kind === 'apartment' ? { furniture: { kind: 'apartment', w: R.cell || R.w, d: R.d } } : {}),
    plinthRoom: { h: R.h, dark: R.kind === 'black-box' || R.light === 'narrow' },
    version: 2, title: design.title, source: `${ROOMS[design.room].name}, a virtual room`, virtual: true, ordered: true, ...(R.baked ? { baked: { kind: R.kind, plates: (R.plates || []).flatMap(p => R.cells > 1 && p.wall !== 'wall-x0' && p.wall !== 'wall-x1' ? Array.from({ length: R.cells }, (_, k) => ({ ...p, wall: `${p.wall}-c${k}`, texture: R.baked + p.file })) : [{ ...p, texture: R.baked + p.file }]) },
      ...(R.cells > 1 ? { partitions: Array.from({ length: R.cells - 1 }, (_, i) => ({ x: (i + 1) * R.cell, t: PART, door: (R.doorSpan || [R.d / 2 - 0.7, R.d / 2 + 0.7]) })) } : {}) } : {}),
    room: { x0: 0, x1: R.w, z0: 0, z1: R.d, height: R.h }, surfaces, works, views: [], floorReflect, plaster: await keep(plaster),
    stands: stands.map(s => ({ ...s, t: STAND.t })),
    solids: stands.map(s => { const r = s.rot * Math.PI / 180, dx = Math.cos(r) * s.len / 2, dz = Math.sin(r) * s.len / 2; return [s.x - dx, s.z - dz, s.x + dx, s.z + dz]; }),
    plinths: plinths.map(p => { const x = objSized.find(q => q.o.id === p.work); return { id: p.id, x: p.x, z: p.z, size: plinthDims(p), key: p.size, colour: p.colour || '', work: p.work || null,
      obj: x ? { id: x.o.id, title: x.o.title, image: x.o.image, w: x.w, h: x.h } : null }; }),
    blocks: blocksOf(design.room),
    // the pavilion is first seen as in its picture: from the corner by the way in, across the wings to the glass and the garden
    ...(R.kind === 'glass-pavilion' && !(R.cells > 1) ? { start: { pos: [R.w - 1.2, R.d - 0.9], look: [R.w * 0.3, 0.5] } } : {}),
  };
  const placements = {};
  for (const p of placed) if (p.work.id) placements[p.work.id] = { wall: p.wall.name, a: +p.a.toFixed(3), y: +p.y.toFixed(3) };
  return { spec, placements, plinths: [...plinths.map(({ id, x, z, size, dims, work, colour }) => ({ id, x: +x.toFixed(3), z: +z.toFixed(3), size, ...(dims ? { dims: plinthDims({ dims }) } : {}), ...(colour ? { colour } : {}), work: work || null })),
      ...stands.map(({ id, x, z, len, rot }) => ({ id, kind: 'stand', x, z, len, rot })), ...((design.plinths || []).some(p => p && p.kind === 'no-stands') ? [{ id: 'no-stands', kind: 'no-stands' }] : [])], left: left.map(x => x.work), revoke: () => urls.forEach(u => URL.revokeObjectURL(u)) };
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
// a work hung by hand keeps its real size up to 2.6 m on its longest side (the automatic hang caps at 1.4 m)
export const streetFit = (w, h) => { const k = Math.min(1, 260 / Math.max(w, h)); return [w * k, h * k]; };
const SH = { H: 5.0, RH: 3.8, W: 7, RD: 6, RW: 8, VD: 1.8, PITCH: 10, MOUTH: 3.2, DOOR_H: 3.3, RIM: 0.22 };
const shade = (hex, k) => '#' + [1, 3, 5].map(i => hex2(parseInt(hex.slice(i, i + 2), 16) * k)).join('');
const rgba = (hex, a) => `rgba(${parseInt(hex.slice(1, 3), 16)},${parseInt(hex.slice(3, 5), 16)},${parseInt(hex.slice(5, 7), 16)},${a})`;
const jpg = (c, q = 0.92) => c.toDataURL('image/jpeg', q);

// rooms: [{ slug, title, colour: '#rrggbb', works: [work as the app has it: title, image, pairs] }]
export async function buildStreet(rooms, src, thumbOf = w => w.image, opts = {}) {
  const { H, RH, W, RD, RW, VD, PITCH, MOUTH, DOOR_H, RIM } = SH;
  const Z0 = VD + RD + 0.2, Z1 = Z0 + W, ZS = Z1 + VD + RD, ZC = (Z0 + Z1) / 2;
  const n = rooms.length, S = Math.ceil(n / 2), L = 7 + PITCH * S;
  const surfaces = [], solids = [], works = [], plinthsOut = [], flat = new Map();
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
    // a plate with a work's words, beside it on the wall
    const plate = (name, lines, cx, cy, cz, N, w, h) => {
      const c = canvas(w * 400, h * 400), x = c.getContext('2d'); x.fillStyle = 'rgba(250,248,244,0.96)'; x.fillRect(0, 0, c.width, c.height);
      x.fillStyle = 'rgba(40,36,30,0.88)'; x.textBaseline = 'top';
      let yy = 8; lines.forEach((ln, k) => { x.font = `${k === 0 ? 'italic 600 17px' : '400 14px'} Georgia, serif`; let s = String(ln); while (x.measureText(s).width > c.width - 16 && s.length > 4) s = s.slice(0, -2); x.fillText(s, 8, yy); yy += k === 0 ? 22 : 18; });
      const ux = N[2], uz = -N[0];
      surfaces.push({ name, kind: 'wall', texture: jpg(c, 0.9), origin: [cx - ux * w / 2, cy + h / 2, cz - uz * w / 2], u: [ux, 0, uz], v: [0, -1, 0], size: [w, h], normal: [N[0], 0, N[2]], openings: [] });
    };
    const put = (work, wm, hm, run, ac, y) => {
      const [px, pz] = run.at(ac), N = [run.n[0], 0, run.n[1]], off = 0.039, ux = N[2], uz = -N[0];
      works.push({ id: work.slug || work.id, work: work.title, image: work.image, imageSmall: thumbOf(work), size: [wm * 100, hm * 100], measured: [wm * 100, hm * 100],
        centre: [px + N[0] * off, y, pz + N[2] * off], axes: [[N[2], 0, -N[0]], [0, 1, 0], N], depth: 0.035, lightScale: 1 });
      if (r.labels) {
        const sg = ac + wm / 2 + 0.55 > run.len ? -1 : 1, d = sg * (wm / 2 + 0.3);
        plate(`r${i}-lab${works.length}`, [work.title, [work.artist && (work.artist.name || work.artist), work.year].filter(Boolean).join(', '), work.medium || '', work.note || ''].filter(Boolean),
          px + ux * d + N[0] * 0.012, Math.max(0.6, y - hm / 2 + 0.2), pz + uz * d + N[2] * 0.012, N, 0.4, 0.28);
      }
    };
    // manual hang (the Desk: s = metres along the three walls in walking order, y = height of the work's middle), else the automatic one
    const manual = r.works.filter(w => w.s != null), autoW = r.works.filter(w => w.s == null).slice(0, 8);
    for (const work of manual) {
      const sz = await sizeOf({ ...work, image: thumbOf(work) }, src), [wm, hm] = streetFit(sz.w, sz.h).map(v => v / 100);
      // (s is as a visitor at the door sees the room: left wall, back wall, right wall; a room on the south side is built the other way round)
      const sv = isN ? work.s : 2 * dpt + RW - work.s;
      const k = sv < dpt ? 0 : sv < dpt + RW ? 1 : 2, a0 = k === 0 ? 0 : k === 1 ? dpt : dpt + RW;
      put(work, wm, hm, runs[k], Math.min(Math.max(sv - a0, wm / 2 + 0.1), runs[k].len - wm / 2 - 0.1), work.y != null ? work.y : 1.5);
    }
    // sculptures stand on plinths: the room's own coordinates (x across 0..8, z from the front wall 0..6) become the street's
    for (const p of r.plinths || []) {
      const key = PLINTHS[p.size] ? p.size : 'm', ob = (r.objects || {})[p.work], px = Math.min(Math.max(p.x, 0.5), RW - 0.5), pz = Math.min(Math.max(p.z, 0.5), RD - 0.5);
      plinthsOut.push({ id: `${i}-${p.id}`, x: isN ? rx0 + px : rx1 - px, z: isN ? zf - pz : zf + pz, size: PLINTHS[key], key, work: p.work || null,
        obj: ob ? { id: ob.id, title: ob.title, image: ob.image, w: ob.w, h: ob.h } : null });
    }
    // the exhibition's own words, on the front wall beside the door
    if (r.text) {
      const lines = String(r.text).split(/\n+/).join(' ').match(/.{1,46}(\s|$)/g) || [];
      const c = canvas(640, 520), x = c.getContext('2d'); x.fillStyle = 'rgba(250,248,244,0.97)'; x.fillRect(0, 0, 640, 520); x.fillStyle = 'rgba(40,36,30,0.9)'; x.textBaseline = 'top';
      x.font = 'italic 600 34px Georgia, serif'; x.fillText(String(r.title).slice(0, 30), 30, 28); x.font = '400 20px Georgia, serif';
      if (r.curator) { x.fillStyle = 'rgba(40,36,30,0.55)'; x.fillText('Curated by ' + r.curator, 30, 78); x.fillStyle = 'rgba(40,36,30,0.9)'; }
      lines.slice(0, 11).forEach((ln, k) => x.fillText(ln.trim(), 30, 122 + k * 32));
      const nz = isN ? -1 : 1, cx = isN ? mb + 1.3 : ma - 1.3;
      surfaces.push({ name: `r${i}-intro`, kind: 'wall', texture: jpg(c, 0.92), origin: [cx - nz * 0.8, 2.6, zf + nz * 0.012], u: [nz, 0, 0], v: [0, -1, 0], size: [1.6, 1.3], normal: [0, 0, nz], openings: [] });
    }
    const sized = await Promise.all(autoW.map(async work => {
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
        put(s.work, wm, hm, run, a + wm / 2, y);
        a += wm + g;
      }
    });
  }
  const spec = {
    version: 2, title: 'The Street', source: 'Open Studio museum', virtual: true, ordered: true, far: 90, noSpots: true,
    baked: { kind: 'white-cube', plates: [] },                  // (the viewer's fine plaster grain over the walls, as in the baked rooms)
    room: { x0: 0, x1: L, z0: 0, z1: ZS, height: H }, surfaces, works, views: [], floorReflect: [0, 0], solids,
    start: { pos: [2.8, ZC], look: [L, ZC] },
    ...(plinthsOut.length ? { plinths: plinthsOut } : {}),
  };
  if (opts.focus != null && rooms[opts.focus]) {                  // the Desk's preview: stand in the street facing that room's door
    const [fa, fb] = mouthOf(opts.focus), cxm = (fa + fb) / 2, nth = opts.focus % 2 === 0;
    spec.start = { pos: [Math.max(2.8, cxm - 2.2), ZC], look: [cxm, nth ? Z0 - 3 : Z1 + 3] };
  }
  return { spec, length: L };
}

// =====================================================================================================================
// The Court (13.11): a trial of a museum that is not a street, behind a switch (open the app with ?hall; the street stays
// the default until the owner chooses). One top-lit hall, 20 x 16.6 m and 6 m high; the eight rooms open off its four sides,
// two a side, each through its colour threshold; you come in at the middle of the south side and face a single work on the
// north wall between two doors. In the hall stand two freestanding walls (coulisses) and, when an exhibition has objects,
// plinths: each carries ONE work, the first of an exhibition, with the exhibition's name beside it. The rooms are the
// street's rooms (the Desk's walls, plinths, labels and words are read the same way), so nothing changes on the Desk.
// Design and the two other plans: studio/design/museum-hall/.
// =====================================================================================================================
const CT = { W: 20, D: 16.6, H: 6, O: 8.2 };
// where the rooms open, in the order the slots fill them: the two ahead of you, then the sides from far to near, then beside the way in
// (side, the door's middle along that side, and how far the room's middle lies from the door's: the two ahead have their doors toward the
// middle of the wall, so that a phone, which sees a narrow slice, has both in view from the way in with the single work between them)
const CT_PLACES = [['n', 6.3, -2.2], ['n', 13.7, 2.2], ['w', 4.15, 0], ['e', 4.15, 0], ['w', 12.45, 0], ['e', 12.45, 0], ['s', 4.1, 0], ['s', 15.9, 0]];
export async function buildHall(rooms, src, thumbOf = w => w.image, opts = {}) {
  const { RH, RD, RW, VD, MOUTH, DOOR_H, RIM } = SH, { W, D, H, O } = CT;
  const X0 = O, X1 = O + W, Z0 = O, Z1 = O + D, TX = W + 2 * O, TZ = D + 2 * O, CX = X0 + W / 2, CZ = Z0 + D / 2;
  rooms = rooms.slice(0, 8);
  const surfaces = [], solids = [], works = [], plinthsOut = [], flat = new Map();
  const plain = c => { if (!flat.has(c)) { const cv = canvas(4, 4), x = cv.getContext('2d'); x.fillStyle = c; x.fillRect(0, 0, 4, 4); flat.set(c, cv.toDataURL('image/png')); } return flat.get(c); };
  const noise = (x, w, h, count, a) => { for (let i = 0; i < count; i++) { const v = Math.random() < 0.5 ? 255 : 0; x.fillStyle = `rgba(${v},${v},${v},${Math.random() * a})`; x.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 1.5, 1 + Math.random() * 1.5); } };
  // a wall by its middle (cx, cz), facing (nx, nz); it runs along u = (nz, -nx), the right hand of someone looking at it
  const wall = (name, cx, cz, nx, nz, len, o = {}) => {
    const ux = nz, uz = -nx, x = cx - ux * len / 2, z = cz - uz * len / 2, holes = o.holes || [], h = o.h || H;
    surfaces.push({ name, kind: 'wall', texture: o.tex, origin: [x, h, z], u: [ux, 0, uz], v: [0, -1, 0], size: [len, h], normal: [nx, 0, nz],
      openings: holes.map(([a, b]) => ({ from: a, to: b, height: DOOR_H, arch: false, depth: 0.1, through: true, bare: true })) });
    let a = 0; for (const [f, t] of [...holes, [len, len]].sort((p, q) => p[0] - q[0])) { if (f > a + 0.01) solids.push([x + ux * a, z + uz * a, x + ux * f, z + uz * f]); a = Math.max(a, t); }
    return { n: [nx, nz], len, at: s => [x + ux * s, z + uz * s] };
  };
  // a flat rectangle between two corners at height y, facing up or down
  const rect = (name, kind, a, b, y, up, tex) => { const x = Math.min(a[0], b[0]), z = Math.min(a[1], b[1]), w = Math.abs(b[0] - a[0]), d = Math.abs(b[1] - a[1]);
    surfaces.push({ name, kind, texture: tex, origin: [x, y, up ? z : z + d], u: [1, 0, 0], v: up ? [0, 0, 1] : [0, 0, -1], size: [w, d], normal: [0, up ? 1 : -1, 0], openings: [] }); };
  const plate = (name, lines, cx, cy, cz, N, w, h) => {
    const c = canvas(w * 400, h * 400), x = c.getContext('2d'); x.fillStyle = 'rgba(250,248,244,0.96)'; x.fillRect(0, 0, c.width, c.height);
    x.fillStyle = 'rgba(40,36,30,0.88)'; x.textBaseline = 'top';
    let yy = 8; lines.forEach((ln, k) => { x.font = `${k === 0 ? 'italic 600 17px' : '400 14px'} Georgia, serif`; let s = String(ln); while (x.measureText(s).width > c.width - 16 && s.length > 4) s = s.slice(0, -2); x.fillText(s, 8, yy); yy += k === 0 ? 22 : 18; });
    const ux = N[2], uz = -N[0];
    surfaces.push({ name, kind: 'wall', texture: jpg(c, 0.9), origin: [cx - ux * w / 2, cy + h / 2, cz - uz * w / 2], u: [ux, 0, uz], v: [0, -1, 0], size: [w, h], normal: [N[0], 0, N[2]], openings: [] });
  };
  // a work on a wall: p = its middle on the wall's face, n = the wall's normal
  const hangAt = (work, wm, hm, p, n, y, label) => {
    const N = [n[0], 0, n[1]], off = 0.039, ux = N[2], uz = -N[0];
    works.push({ id: work.slug || work.id, work: work.title, image: work.image, imageSmall: thumbOf(work), size: [wm * 100, hm * 100], measured: [wm * 100, hm * 100],
      centre: [p[0] + N[0] * off, y, p[1] + N[2] * off], axes: [[N[2], 0, -N[0]], [0, 1, 0], N], depth: 0.035, lightScale: 1 });
    if (label) { const d = (label.side || 1) * (wm / 2 + 0.3);
      plate(`lab${works.length}`, label.lines, p[0] + ux * d + N[0] * 0.012, Math.max(0.6, y - hm / 2 + 0.2), p[1] + uz * d + N[2] * 0.012, N, 0.4, 0.28); }
  };

  // the four sides of the hall: o points out of the hall (into the rooms), r is the right hand of someone walking out through a door
  const SIDE = { n: { o: [0, -1], mid: [CX, Z0], len: W, at: t => [X0 + t, Z0] }, s: { o: [0, 1], mid: [CX, Z1], len: W, at: t => [X0 + t, Z1] },
    w: { o: [-1, 0], mid: [X0, CZ], len: D, at: t => [X0, Z0 + t] }, e: { o: [1, 0], mid: [X1, CZ], len: D, at: t => [X1, Z0 + t] } };
  const doors = rooms.map((room, i) => { const [k, t, sh0] = CT_PLACES[i], S = SIDE[k], o = S.o, r = [-o[1], o[0]], c = S.at(t), sh = sh0 * (k === 'n' ? 1 : 1);
    const start = [S.mid[0] - r[0] * S.len / 2, S.mid[1] - r[1] * S.len / 2], m = (c[0] - start[0]) * r[0] + (c[1] - start[1]) * r[1];
    return { i, room, side: k, o, r, c, m, sh, P: (a, b) => [c[0] + r[0] * a + o[0] * b, c[1] + r[1] * a + o[1] * b] }; });

  // --- the hall's walls: light plaster under daylight from above, each threshold's colour on the wall beside it, the exhibition's name over its door
  const PPM = 64;
  const hallWall = (k, extra) => {
    const S = SIDE[k], w = Math.round(S.len * PPM), h = Math.round(H * PPM), c = canvas(w, h), x = c.getContext('2d');
    x.fillStyle = '#f3f1ec'; x.fillRect(0, 0, w, h);
    const top = x.createLinearGradient(0, 0, 0, 2.6 * PPM); top.addColorStop(0, 'rgba(255,255,255,0.75)'); top.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = top; x.fillRect(0, 0, w, 2.6 * PPM);
    for (const d of doors.filter(q => q.side === k)) {
      x.save(); x.translate(d.m * PPM, (H - 1.5) * PPM); x.scale(3.3 * PPM, 2.6 * PPM);
      const g = x.createRadialGradient(0, 0, 0, 0, 0, 1); g.addColorStop(0, rgba(d.room.colour, 0.3)); g.addColorStop(0.5, rgba(d.room.colour, 0.11)); g.addColorStop(1, rgba(d.room.colour, 0));
      x.fillStyle = g; x.fillRect(-1, -1, 2, 2); x.restore();
    }
    const ao = x.createLinearGradient(0, h - 0.7 * PPM, 0, h); ao.addColorStop(0, 'rgba(70,58,44,0)'); ao.addColorStop(1, 'rgba(70,58,44,0.2)'); x.fillStyle = ao; x.fillRect(0, h - 0.7 * PPM, w, 0.7 * PPM);
    x.fillStyle = 'rgba(255,255,255,0.35)'; x.fillRect(0, h - 0.12 * PPM, w, 0.12 * PPM); x.fillStyle = 'rgba(60,50,40,0.3)'; x.fillRect(0, h - 0.125 * PPM, w, 1.5);
    noise(x, w, h, 9000, 0.05);
    x.textAlign = 'center'; x.textBaseline = 'middle';
    for (const d of doors.filter(q => q.side === k)) {
      const cx = d.m * PPM, cy = (H - (DOOR_H + 0.75)) * PPM, t = d.room.title;
      let fs = 0.34 * PPM; x.font = `500 ${fs}px Georgia, serif`; while (x.measureText(t).width > 3.4 * PPM && fs > 10) { fs -= 1; x.font = `500 ${fs}px Georgia, serif`; }
      x.fillStyle = 'rgba(40,36,30,0.85)'; x.fillText(t, cx, cy - 0.05 * PPM);
      x.fillStyle = d.room.colour; x.fillRect(cx - 0.4 * PPM, cy + 0.22 * PPM, 0.8 * PPM, 3);
      x.fillStyle = 'rgba(40,36,30,0.5)'; x.font = `${0.15 * PPM}px Georgia, serif`; x.fillText(`${d.room.works.length} works`, cx, cy + 0.42 * PPM);
    }
    if (extra) extra(x, w, h);
    return jpg(c);
  };
  for (const k of ['n', 's', 'w', 'e']) {
    const S = SIDE[k];
    wall('hall-' + k, S.mid[0], S.mid[1], -S.o[0], -S.o[1], S.len, { holes: doors.filter(d => d.side === k).map(d => [d.m - MOUTH / 2, d.m + MOUTH / 2]),
      tex: hallWall(k, k === 's' ? (x, w, h) => {            // the way in: the museum's name, behind you as you come in
        x.fillStyle = 'rgba(40,36,30,0.85)'; x.font = `500 ${0.5 * PPM}px Georgia, serif`; x.fillText('The Museum', w / 2, h - 2.5 * PPM);
        x.fillStyle = 'rgba(40,36,30,0.5)'; x.font = `${0.17 * PPM}px Georgia, serif`; x.fillText(`${rooms.length} exhibitions open off this hall`, w / 2, h - 2.0 * PPM); } : null) });
  }

  // --- the hall's floor (pale terrazzo, daylight pooled in the middle, each threshold's colour spilled at its door) and its ceiling (one skylight in a grid of beams)
  {
    const FP = 48, fw = Math.round(W * FP), fh = Math.round(D * FP), c = canvas(fw, fh), x = c.getContext('2d');
    x.fillStyle = '#d9d5cc'; x.fillRect(0, 0, fw, fh);
    const day = x.createRadialGradient(fw / 2, fh / 2, 0, fw / 2, fh / 2, fw * 0.6); day.addColorStop(0, 'rgba(255,255,255,0.3)'); day.addColorStop(1, 'rgba(90,76,60,0.16)'); x.fillStyle = day; x.fillRect(0, 0, fw, fh);
    for (let i = 0; i < 9000; i++) { const t = Math.random(); x.fillStyle = t < 0.4 ? 'rgba(255,255,255,0.35)' : t < 0.8 ? 'rgba(80,70,60,0.18)' : 'rgba(190,160,130,0.25)'; x.fillRect(Math.random() * fw, Math.random() * fh, 1 + Math.random() * 2, 1 + Math.random() * 2); }
    for (const d of doors) {
      x.save(); x.translate((d.c[0] - X0) * FP, (d.c[1] - Z0) * FP); x.scale(MOUTH * 1.15 * FP, MOUTH * 1.15 * FP);
      const g = x.createRadialGradient(0, 0, 0, 0, 0, 1); g.addColorStop(0, rgba(d.room.colour, 0.5)); g.addColorStop(0.5, rgba(d.room.colour, 0.18)); g.addColorStop(1, rgba(d.room.colour, 0));
      x.fillStyle = g; x.fillRect(-1, -1, 2, 2); x.restore();
    }
    rect('hall-floor', 'wall', [X0, Z0], [X1, Z1], 0.003, true, jpg(c, 0.9));
    const cw = 800, ch = Math.round(800 * D / W), cc = canvas(cw, ch), y = cc.getContext('2d');
    y.fillStyle = '#e9e6df'; y.fillRect(0, 0, cw, ch);
    const nx = 5, nz = 4, bw = 14, m = 46;
    for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
      const px = m + i * (cw - 2 * m) / nx + bw / 2, pz = m + j * (ch - 2 * m) / nz + bw / 2, pw = (cw - 2 * m) / nx - bw, ph = (ch - 2 * m) / nz - bw;
      const g = y.createRadialGradient(px + pw / 2, pz + ph / 2, 0, px + pw / 2, pz + ph / 2, pw * 0.8); g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#eef3f6'); y.fillStyle = g; y.fillRect(px, pz, pw, ph);
    }
    surfaces.push({ name: 'hall-ceiling', kind: 'ceiling', texture: jpg(cc, 0.95), origin: [X0, H, Z1], u: [1, 0, 0], v: [0, 0, -1], size: [W, D], normal: [0, -1, 0], openings: [] });
  }
  surfaces.push({ name: 'floor', kind: 'floor', texture: plain('#cfc9be'), tileXY: [2, 2], origin: [0, 0, 0], u: [1, 0, 0], v: [0, 0, 1], size: [TX, TZ], normal: [0, 1, 0], openings: [] });

  const roomWall = (() => { const c = canvas(64, 256), x = c.getContext('2d'); x.fillStyle = '#f4f1ec'; x.fillRect(0, 0, 64, 256);
    const t = x.createLinearGradient(0, 0, 0, 40); t.addColorStop(0, 'rgba(120,108,92,0.16)'); t.addColorStop(1, 'rgba(120,108,92,0)'); x.fillStyle = t; x.fillRect(0, 0, 64, 40);
    const b = x.createLinearGradient(0, 190, 0, 256); b.addColorStop(0, 'rgba(70,58,44,0)'); b.addColorStop(1, 'rgba(70,58,44,0.2)'); x.fillStyle = b; x.fillRect(0, 190, 64, 66);
    x.fillStyle = 'rgba(255,255,255,0.35)'; x.fillRect(0, 243, 64, 13); x.fillStyle = 'rgba(60,50,40,0.3)'; x.fillRect(0, 242, 64, 1.5); return jpg(c); })();
  const oak = (() => { const P = 64, w = RW * P, h = RD * P, c = canvas(w, h), x = c.getContext('2d'); x.fillStyle = '#d3bd9a'; x.fillRect(0, 0, w, h);
    for (let k = 0; k < h; k += 0.18 * P) { x.fillStyle = `rgba(${Math.random() < 0.5 ? '255,255,255' : '90,66,40'},${0.03 + Math.random() * 0.05})`; x.fillRect(0, k, w, 0.18 * P); x.fillStyle = 'rgba(80,60,40,0.14)'; x.fillRect(0, k, w, 1); }
    const e = 0.5 * P, edge = (ax, ay, bx, by, rx, ry, rw, rh) => { const g = x.createLinearGradient(ax, ay, bx, by); g.addColorStop(0, 'rgba(60,44,28,0.2)'); g.addColorStop(1, 'rgba(60,44,28,0)'); x.fillStyle = g; x.fillRect(rx, ry, rw, rh); };
    edge(0, 0, 0, e, 0, 0, w, e); edge(0, h, 0, h - e, 0, h - e, w, e); edge(0, 0, e, 0, 0, 0, e, h); edge(w, 0, w - e, 0, w - e, 0, e, h); return jpg(c, 0.9); })();

  // --- the rooms: each as the street builds it (threshold in the show's colour, three walls to hang on), turned to its side of the hall
  for (const d of doors) {
    const { i, room: r, o, P } = d, c = r.colour, R = d.r, M2 = MOUTH / 2, A0 = d.sh - RW / 2, A1 = d.sh + RW / 2;     // (the room runs from A0 to A1 across, the door's middle at 0)
    wall(`th${i}l`, ...P(-M2, VD / 2), R[0], R[1], VD, { h: DOOR_H, tex: plain(shade(c, 0.8)) });
    wall(`th${i}r`, ...P(M2, VD / 2), -R[0], -R[1], VD, { h: DOOR_H, tex: plain(shade(c, 0.92)) });
    rect(`th${i}-ceil`, 'ceiling', P(-M2, 0), P(M2, VD), DOOR_H, false, plain(shade(c, 0.96)));
    rect(`th${i}-floor`, 'wall', P(-M2, 0), P(M2, VD), 0.006, true, plain(shade(c, 0.88)));
    const rimTex = plain(shade(c, 0.7));
    const rim = (nm, a0, a1, y0, y1) => { const q = P(a0, -0.012); surfaces.push({ name: `rim${i}${nm}`, kind: 'wall', texture: rimTex, origin: [q[0], y1, q[1]], u: [R[0], 0, R[1]], v: [0, -1, 0], size: [a1 - a0, y1 - y0], normal: [-o[0], 0, -o[1]], openings: [] }); };
    rim('l', -M2 - RIM, -M2, 0, DOOR_H + RIM); rim('r', M2, M2 + RIM, 0, DOOR_H + RIM); rim('t', -M2 - RIM, M2 + RIM, DOOR_H, DOOR_H + RIM);
    rect(`r${i}-floor`, 'wall', P(A0, VD), P(A1, VD + RD), 0.004, true, oak);
    rect(`r${i}-ceil`, 'ceiling', P(A0, VD), P(A1, VD + RD), RH, false, plain('#f7f4ee'));
    wall(`r${i}-front`, ...P(d.sh, VD), o[0], o[1], RW, { holes: [[A1 - M2, A1 + M2]], h: RH, tex: roomWall });
    const runs = [wall(`r${i}-left`, ...P(A0, VD + RD / 2), R[0], R[1], RD, { h: RH, tex: roomWall }), wall(`r${i}-back`, ...P(d.sh, VD + RD), -o[0], -o[1], RW, { h: RH, tex: roomWall }), wall(`r${i}-right`, ...P(A1, VD + RD / 2), -R[0], -R[1], RD, { h: RH, tex: roomWall })];
    const put = (work, wm, hm, run, ac, y) => hangAt(work, wm, hm, run.at(ac), run.n, y, r.labels ? { side: ac + wm / 2 + 0.55 > run.len ? -1 : 1,
      lines: [work.title, [work.artist && (work.artist.name || work.artist), work.year].filter(Boolean).join(', '), work.medium || '', work.note || ''].filter(Boolean) } : null);
    // the Desk's hang (s = metres along the left, back and right walls as seen from the door; y = the height of the work's middle), else the automatic one
    const manual = r.works.filter(w => w.s != null), autoW = r.works.filter(w => w.s == null).slice(0, 8);
    for (const work of manual) {
      const sz = await sizeOf({ ...work, image: thumbOf(work) }, src), [wm, hm] = streetFit(sz.w, sz.h).map(v => v / 100);
      const k = work.s < RD ? 0 : work.s < RD + RW ? 1 : 2, a0 = k === 0 ? 0 : k === 1 ? RD : RD + RW;
      put(work, wm, hm, runs[k], Math.min(Math.max(work.s - a0, wm / 2 + 0.1), runs[k].len - wm / 2 - 0.1), work.y != null ? work.y : 1.5);
    }
    for (const p of r.plinths || []) {
      const key = PLINTHS[p.size] ? p.size : 'm', ob = (r.objects || {})[p.work], q = P(Math.min(Math.max(p.x, 0.5), RW - 0.5) + A0, VD + Math.min(Math.max(p.z, 0.5), RD - 0.5));
      plinthsOut.push({ id: `${i}-${p.id}`, x: q[0], z: q[1], size: PLINTHS[key], key, work: p.work || null, obj: ob ? { id: ob.id, title: ob.title, image: ob.image, w: ob.w, h: ob.h } : null });
    }
    if (r.text) {
      const lines = String(r.text).split(/\n+/).join(' ').match(/.{1,46}(\s|$)/g) || [];
      const cv = canvas(640, 520), x = cv.getContext('2d'); x.fillStyle = 'rgba(250,248,244,0.97)'; x.fillRect(0, 0, 640, 520); x.fillStyle = 'rgba(40,36,30,0.9)'; x.textBaseline = 'top';
      x.font = 'italic 600 34px Georgia, serif'; x.fillText(String(r.title).slice(0, 30), 30, 28); x.font = '400 20px Georgia, serif';
      if (r.curator) { x.fillStyle = 'rgba(40,36,30,0.55)'; x.fillText('Curated by ' + r.curator, 30, 78); x.fillStyle = 'rgba(40,36,30,0.9)'; }
      lines.slice(0, 11).forEach((ln, k) => x.fillText(ln.trim(), 30, 122 + k * 32));
      const q = P(M2 + 2.3 < A1 ? M2 + 2.1 : -M2 - 0.5, VD + 0.012);      // (beside the door, on the side that has the wall for it)
      surfaces.push({ name: `r${i}-intro`, kind: 'wall', texture: jpg(cv, 0.92), origin: [q[0], 2.6, q[1]], u: [-R[0], 0, -R[1]], v: [0, -1, 0], size: [1.6, 1.3], normal: [o[0], 0, o[1]], openings: [] });
    }
    const sized = await Promise.all(autoW.map(async work => { const s = await sizeOf({ ...work, image: thumbOf(work) }, src), k = Math.min(1, 140 / Math.max(s.w, s.h)); return { work, w: s.w * k, h: s.h * k }; }));
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
      for (const s of items) { const wm = s.w / 100, hm = s.h / 100; put(s.work, wm, hm, run, a + wm / 2, Math.min(Math.max(1.5, hm / 2 + 0.4), RH - hm / 2 - 0.5)); a += wm + g; }
    });
  }

  // --- in the hall: single works. One from each exhibition (its first), on the north wall between the two doors ahead and on the
  //     two faces of each coulisse, the exhibition's name beside it; and the exhibitions' objects (up to three) on plinths
  const stands = [{ id: 'hall-a', x: X0 + 5.6, z: Z0 + 10.6, len: 3.6, rot: 0, h: 2.8 }, { id: 'hall-b', x: X0 + 14.4, z: Z0 + 6.6, len: 3.6, rot: 0, h: 2.8 }];
  const faces = standWalls(stands), face = (() => { const c = canvas(256, 256), x = c.getContext('2d'); x.fillStyle = '#f6f4ef'; x.fillRect(0, 0, 256, 256);
    const b = x.createLinearGradient(0, 200, 0, 256); b.addColorStop(0, 'rgba(70,58,44,0)'); b.addColorStop(1, 'rgba(70,58,44,0.16)'); x.fillStyle = b; x.fillRect(0, 200, 256, 56); return jpg(c); })();
  for (const f of faces) surfaces.push({ name: f.name, kind: 'wall', stand: f.stand, texture: face, origin: f.origin, u: f.u, v: [0, -1, 0], size: [f.len, f.h], normal: f.normal, openings: [] });
  for (const s of stands) solids.push([s.x - s.len / 2, s.z, s.x + s.len / 2, s.z]);
  const mid = f => [f.origin[0] + f.u[0] * f.len / 2, f.origin[2] + f.u[2] * f.len / 2];
  const spots = [{ p: [CX, Z0], n: [0, 1], max: 250, y: 1.85 }, ...[0, 2, 1, 3].map(k => ({ p: mid(faces[k]), n: [faces[k].normal[0], faces[k].normal[2]], max: 150, y: 1.5 }))];
  const heralds = rooms.map(r => ({ r, w: r.works.find(w => w.image) })).filter(q => q.w).slice(0, spots.length);
  for (const [k, q] of heralds.entries()) {
    const sp = spots[k], s = await sizeOf({ ...q.w, image: thumbOf(q.w) }, src), f = Math.min(sp.max / Math.max(s.w, s.h), k === 0 ? 3 : 1.6);
    hangAt(q.w, s.w * f / 100, s.h * f / 100, sp.p, sp.n, sp.y, { lines: [q.w.title, [q.w.artist && (q.w.artist.name || q.w.artist), q.w.year].filter(Boolean).join(', '), 'In: ' + q.r.title].filter(Boolean) });
  }
  const objs = rooms.flatMap(r => Object.values(r.objects || {}).slice(0, 1)).slice(0, 3), at = [[CX, CZ + 0.4], [X0 + 15.2, Z0 + 12.2], [X0 + 4.8, Z0 + 4.6]];
  objs.forEach((ob, k) => plinthsOut.push({ id: 'hall-p' + k, x: at[k][0], z: at[k][1], size: PLINTHS.m, key: 'm', work: ob.id, obj: { id: ob.id, title: ob.title, image: ob.image, w: ob.w, h: ob.h } }));

  const spec = {
    version: 2, title: 'The Museum', source: 'Open Studio museum', virtual: true, ordered: true, far: 60, noSpots: true,
    baked: { kind: 'white-cube', plates: [] }, plinthRoom: { h: H },
    room: { x0: 0, x1: TX, z0: 0, z1: TZ, height: H }, surfaces, works, views: [], floorReflect: [0, 0], solids,
    stands: stands.map(s => ({ ...s, kind: 'stand', t: STAND.t })),
    start: { pos: [CX, Z1 - 1.1], look: [CX, Z0] },
    ...(plinthsOut.length ? { plinths: plinthsOut } : {}),
  };
  if (opts.focus != null && doors[opts.focus]) { const d = doors[opts.focus]; spec.start = { pos: d.P(0, -3.2), look: d.P(0, 3) }; }
  return { spec, size: [W, D] };
}

// =====================================================================================================================
// The Cluster (16.11): the owner chose it from studio/design/museum-open/ ("an open museum, not a street, not a hall with doors").
// A trial behind a switch (open the app with ?cluster; the street stays the default until the owner says). There is no building
// round the visitor: they land on a plaza of pale terrazzo in a garden, with freestanding walls and (when an exhibition has
// objects) plinths each carrying ONE work, the first of an exhibition; and the exhibitions are houses, each of its own height
// and finish, each turned a little differently, on two rings of different radius so no two stand in line. Each house is the
// street's room (same walls, same hang, same plinths and words), so nothing changes on the Desk; a house's way in has its
// colour as a threshold and its title above it.
// =====================================================================================================================
const CL = { C: [60, 60], PLAZA: 12, RAD: [12.5, 16.2], JIT: [6, -7, 5, -6, 7, -5, 6, -6], RH: [4.4, 4.0, 4.6, 5.4, 4.2, 4.8, 4.0, 6.0] };
// where the eight houses stand: round the plaza, leaving the south open (the way in), the slots filling from the two ahead of the way in outward
export function clusterLayout() {
  const A = Array.from({ length: 8 }, (_, k) => k === 7 ? 405 : 135 + k * 270 / 7), order = [3, 4, 2, 5, 1, 6, 0, 7];
  return order.map((j, slot) => {
    const base = A[j] * Math.PI / 180, phi = (A[j] + CL.JIT[j]) * Math.PI / 180, rho = CL.RAD[j % 2];
    const o = [Math.cos(phi), Math.sin(phi)];
    return { slot, j, c: [CL.C[0] + rho * Math.cos(base), CL.C[1] + rho * Math.sin(base)], o, r: [-o[1], o[0]] };
  });
}
export async function buildCluster(rooms, src, thumbOf = w => w.image, opts = {}) {
  const { RD, RW, VD, MOUTH, DOOR_H, RIM } = SH, [CX, CZ] = CL.C, TOT = 170, env = envFor(opts.hour);
  rooms = rooms.slice(0, 8);
  const surfaces = [], solids = [], works = [], plinthsOut = [], flat = new Map();
  const plain = c => { if (!flat.has(c)) { const cv = canvas(4, 4), x = cv.getContext('2d'); x.fillStyle = c; x.fillRect(0, 0, 4, 4); flat.set(c, cv.toDataURL('image/png')); } return flat.get(c); };
  const noise = (x, w, h, count, a) => { for (let i = 0; i < count; i++) { const v = Math.random() < 0.5 ? 255 : 0; x.fillStyle = `rgba(${v},${v},${v},${Math.random() * a})`; x.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 1.5, 1 + Math.random() * 1.5); } };
  const wall = (name, cx, cz, nx, nz, len, o = {}) => {
    const ux = nz, uz = -nx, x = cx - ux * len / 2, z = cz - uz * len / 2, holes = o.holes || [], h = o.h || 3.8;
    surfaces.push({ name, kind: 'wall', texture: o.tex, origin: [x, h, z], u: [ux, 0, uz], v: [0, -1, 0], size: [len, h], normal: [nx, 0, nz],
      openings: holes.map(([a, b, sill, top]) => ({ from: a, to: b, height: top || DOOR_H, sill: sill || 0, arch: false, depth: 0.1, through: true, bare: true })) });
    if (o.noSolid) return { n: [nx, nz], len, at: s => [x + ux * s, z + uz * s] };
    let a = 0; for (const [f, t] of [...holes.filter(q => !q[2]), [len, len]].sort((p, q) => p[0] - q[0])) { if (f > a + 0.01) solids.push([x + ux * a, z + uz * a, x + ux * f, z + uz * f]); a = Math.max(a, t); }
    for (const q of holes.filter(q => q[2])) solids.push([x + ux * q[0], z + uz * q[0], x + ux * q[1], z + uz * q[1]]);       // (a window is not a way through)
    return { n: [nx, nz], len, at: s => [x + ux * s, z + uz * s] };
  };
  // a flat rectangle on the ground or ceiling, on a house's own axes: from P(a0, b0), a along r, b along o
  const orect = (name, kind, P, R, o, a0, a1, b0, b1, y, up, tex) => { const q = P(a0, b0);
    surfaces.push({ name, kind, texture: tex, origin: [q[0], y, q[1]], u: [R[0], 0, R[1]], v: [o[0], 0, o[1]], size: [a1 - a0, b1 - b0], normal: [0, up ? 1 : -1, 0], openings: [] }); };
  const rect = (name, kind, a, b, y, up, tex) => { const x = Math.min(a[0], b[0]), z = Math.min(a[1], b[1]), w = Math.abs(b[0] - a[0]), d = Math.abs(b[1] - a[1]);
    surfaces.push({ name, kind, texture: tex, origin: [x, y, up ? z : z + d], u: [1, 0, 0], v: up ? [0, 0, 1] : [0, 0, -1], size: [w, d], normal: [0, up ? 1 : -1, 0], openings: [] }); };
  const plate = (name, lines, cx, cy, cz, N, w, h) => {
    const c = canvas(w * 400, h * 400), x = c.getContext('2d'); x.fillStyle = 'rgba(250,248,244,0.96)'; x.fillRect(0, 0, c.width, c.height);
    x.fillStyle = 'rgba(40,36,30,0.88)'; x.textBaseline = 'top';
    let yy = 8; lines.forEach((ln, k) => { x.font = `${k === 0 ? 'italic 600 17px' : '400 14px'} Georgia, serif`; let s = String(ln); while (x.measureText(s).width > c.width - 16 && s.length > 4) s = s.slice(0, -2); x.fillText(s, 8, yy); yy += k === 0 ? 22 : 18; });
    const ux = N[2], uz = -N[0];
    surfaces.push({ name, kind: 'wall', texture: jpg(c, 0.9), origin: [cx - ux * w / 2, cy + h / 2, cz - uz * w / 2], u: [ux, 0, uz], v: [0, -1, 0], size: [w, h], normal: [N[0], 0, N[2]], openings: [] });
  };
  const hangAt = (work, wm, hm, p, n, y, label) => {
    const N = [n[0], 0, n[1]], off = 0.039, ux = N[2], uz = -N[0];
    works.push({ id: work.slug || work.id, work: work.title, image: work.image, imageSmall: thumbOf(work), size: [wm * 100, hm * 100], measured: [wm * 100, hm * 100],
      centre: [p[0] + N[0] * off, y, p[1] + N[2] * off], axes: [[N[2], 0, -N[0]], [0, 1, 0], N], depth: 0.035, lightScale: 1 });
    if (label) { const d = (label.side || 1) * (wm / 2 + 0.3);
      plate(`lab${works.length}`, label.lines, p[0] + ux * d + N[0] * 0.012, Math.max(0.6, y - hm / 2 + 0.2), p[1] + uz * d + N[2] * 0.012, N, 0.4, 0.28); }
  };

  // --- the garden (the 'floor': the grass, drawn once, wide) and the plaza (pale terrazzo, a darker border, daylight pooled in the middle)
  {
    const g = canvas(256, 256), x = g.getContext('2d'); x.fillStyle = '#9fb27f'; x.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 5200; i++) { const t = Math.random(); x.fillStyle = t < 0.5 ? 'rgba(255,255,230,0.12)' : t < 0.85 ? 'rgba(60,90,40,0.14)' : 'rgba(140,120,70,0.14)'; x.fillRect(Math.random() * 256, Math.random() * 256, 1 + Math.random() * 3, 1 + Math.random() * 2); }
    const lite = (x, w, h) => { x.save(); x.globalCompositeOperation = 'multiply'; x.fillStyle = `rgb(${env.tint.map(v => Math.round(255 * v))})`; x.fillRect(0, 0, w, h); x.restore(); };
    lite(x, 256, 256);
    surfaces.push({ name: 'floor', kind: 'floor', texture: jpg(g, 0.9), tileXY: [4, 4], origin: [CX - TOT / 2, -0.05, CZ - TOT / 2], u: [1, 0, 0], v: [0, 0, 1], size: [TOT, TOT], normal: [0, 1, 0], openings: [] });
    const PZ = CL.PLAZA, FP = 36, fw = Math.round(2 * PZ * FP), c = canvas(fw, fw), y = c.getContext('2d');
    y.fillStyle = '#d9d5cc'; y.fillRect(0, 0, fw, fw);
    const day = y.createRadialGradient(fw / 2, fw / 2, 0, fw / 2, fw / 2, fw * 0.62); day.addColorStop(0, 'rgba(255,255,255,0.32)'); day.addColorStop(1, 'rgba(90,76,60,0.14)'); y.fillStyle = day; y.fillRect(0, 0, fw, fw);
    for (let i = 0; i < 16000; i++) { const t = Math.random(); y.fillStyle = t < 0.4 ? 'rgba(255,255,255,0.35)' : t < 0.8 ? 'rgba(80,70,60,0.18)' : 'rgba(190,160,130,0.25)'; y.fillRect(Math.random() * fw, Math.random() * fw, 1 + Math.random() * 2, 1 + Math.random() * 2); }
    y.strokeStyle = 'rgba(80,70,60,0.22)'; y.lineWidth = 2; for (let k = 0; k <= 8; k++) { const p = k * fw / 8; y.beginPath(); y.moveTo(p, 0); y.lineTo(p, fw); y.moveTo(0, p); y.lineTo(fw, p); y.stroke(); }
    y.strokeStyle = 'rgba(70,60,50,0.4)'; y.lineWidth = 8; y.strokeRect(4, 4, fw - 8, fw - 8);
    lite(y, fw, fw);
    rect('plaza', 'wall', [CX - PZ, CZ - PZ], [CX + PZ, CZ + PZ], 0.003, true, jpg(c, 0.9));
  }
  const tints = ['#f4f1ec', '#cfcdc8', '#e8dccb', '#f1efe9', '#c9a690', '#e4e8e2', '#d8d3c8', '#f4f1ec'];     // the houses' walls: white, concrete, sand, ... (their own finish, not one tone)
  const wallTex = (hex, dark) => { const c = canvas(64, 256), x = c.getContext('2d'); x.fillStyle = hex; x.fillRect(0, 0, 64, 256);
    const t = x.createLinearGradient(0, 0, 0, 40); t.addColorStop(0, 'rgba(120,108,92,0.16)'); t.addColorStop(1, 'rgba(120,108,92,0)'); x.fillStyle = t; x.fillRect(0, 0, 64, 40);
    const b = x.createLinearGradient(0, 190, 0, 256); b.addColorStop(0, 'rgba(70,58,44,0)'); b.addColorStop(1, 'rgba(70,58,44,0.2)'); x.fillStyle = b; x.fillRect(0, 190, 64, 66);
    x.fillStyle = 'rgba(255,255,255,0.3)'; x.fillRect(0, 243, 64, 13); x.fillStyle = 'rgba(60,50,40,0.3)'; x.fillRect(0, 242, 64, 1.5); if (dark) noise(x, 64, 256, 500, 0.08); return jpg(c); };
  const floorTex = k => { const P = 64, w = RW * P, h = RD * P, c = canvas(w, h), x = c.getContext('2d');
    if (k === 0) { x.fillStyle = '#d3bd9a'; x.fillRect(0, 0, w, h); for (let q = 0; q < h; q += 0.18 * P) { x.fillStyle = `rgba(${Math.random() < 0.5 ? '255,255,255' : '90,66,40'},${0.03 + Math.random() * 0.05})`; x.fillRect(0, q, w, 0.18 * P); x.fillStyle = 'rgba(80,60,40,0.14)'; x.fillRect(0, q, w, 1); } }
    else if (k === 1) { x.fillStyle = '#a8a6a0'; x.fillRect(0, 0, w, h); noise(x, w, h, 6000, 0.12); x.strokeStyle = 'rgba(60,58,54,0.18)'; for (let q = 0; q <= w; q += 2 * P) { x.beginPath(); x.moveTo(q, 0); x.lineTo(q, h); x.stroke(); } }
    else { x.fillStyle = '#e1d6c2'; x.fillRect(0, 0, w, h); for (let q = 0; q < h; q += 0.3 * P) { x.fillStyle = `rgba(255,255,255,${0.04 + Math.random() * 0.06})`; x.fillRect(0, q, w, 0.3 * P); } }
    const e = 0.5 * P, edge = (ax, ay, bx, by, rx, ry, rw, rh) => { const g = x.createLinearGradient(ax, ay, bx, by); g.addColorStop(0, 'rgba(60,44,28,0.2)'); g.addColorStop(1, 'rgba(60,44,28,0)'); x.fillStyle = g; x.fillRect(rx, ry, rw, rh); };
    edge(0, 0, 0, e, 0, 0, w, e); edge(0, h, 0, h - e, 0, h - e, w, e); edge(0, 0, e, 0, 0, 0, e, h); edge(w, 0, w - e, 0, w - e, 0, e, h); return jpg(c, 0.9); };
  const sky = (() => { const c = canvas(256, 192), x = c.getContext('2d'); x.fillStyle = '#e9e7e1'; x.fillRect(0, 0, 256, 192); x.fillStyle = '#ffffff'; x.fillRect(40, 34, 176, 124);
    const g = x.createRadialGradient(128, 96, 0, 128, 96, 120); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(220,226,230,0.5)'); x.fillStyle = g; x.fillRect(40, 34, 176, 124); return jpg(c); })();

  // --- the houses: each as the street builds its room (a porch in the show's colour, three walls to hang on), turned to its own place
  const places = clusterLayout();
  for (const [i, r] of rooms.entries()) {
    const d = places[i], { o, c } = d, R = d.r, P = (a, b) => [c[0] + R[0] * a + o[0] * b, c[1] + R[1] * a + o[1] * b];
    const col = r.colour, M2 = MOUTH / 2, A0 = -RW / 2, A1 = RW / 2, rh = CL.RH[i], dark = i === 1 || i === 4, fl = i % 3, ft = tints[d.j];
    const roomWall = wallTex(dark ? '#8d8b85' : ft, dark), ceil = i % 2 === 0 ? sky : plain('#f7f4ee');
    wall(`th${i}l`, ...P(-M2, VD / 2), R[0], R[1], VD, { h: DOOR_H, tex: plain(tintHex(shade(col, 0.8), env)) });
    wall(`th${i}r`, ...P(M2, VD / 2), -R[0], -R[1], VD, { h: DOOR_H, tex: plain(tintHex(shade(col, 0.92), env)) });
    orect(`th${i}-ceil`, 'ceiling', P, R, o, -M2, M2, 0, VD, DOOR_H, false, plain(shade(col, 0.96)));
    orect(`th${i}-floor`, 'wall', P, R, o, -M2, M2, 0, VD, 0.006, true, plain(shade(col, 0.88)));
    const rimTex = plain(tintHex(shade(col, 0.7), env));
    const rim = (nm, a0, a1, y0, y1) => { const q = P(a0, -0.012); surfaces.push({ name: `rim${i}${nm}`, kind: 'wall', texture: rimTex, origin: [q[0], y1, q[1]], u: [R[0], 0, R[1]], v: [0, -1, 0], size: [a1 - a0, y1 - y0], normal: [-o[0], 0, -o[1]], openings: [] }); };
    rim('l', -M2 - RIM, -M2, 0, DOOR_H + RIM); rim('r', M2, M2 + RIM, 0, DOOR_H + RIM); rim('t', -M2 - RIM, M2 + RIM, DOOR_H, DOOR_H + RIM);
    orect(`r${i}-floor`, 'wall', P, R, o, A0, A1, VD, VD + RD, 0.004, true, floorTex(fl));
    orect(`r${i}-ceil`, 'ceiling', P, R, o, A0, A1, VD, VD + RD, rh, false, ceil);
    const WIN = [[0.55, 2.05, 0.9, 3.0], [5.95, 7.45, 0.9, 3.0]];                       // (two windows, either side of the way in: the visitor looks out at the plaza)
    wall(`r${i}-front`, ...P(0, VD), o[0], o[1], RW, { holes: [[A1 - M2, A1 + M2], ...WIN], h: rh, tex: roomWall });
    const runs = [wall(`r${i}-left`, ...P(A0, VD + RD / 2), R[0], R[1], RD, { h: rh, tex: roomWall }), wall(`r${i}-back`, ...P(0, VD + RD), -o[0], -o[1], RW, { h: rh, tex: roomWall }), wall(`r${i}-right`, ...P(A1, VD + RD / 2), -R[0], -R[1], RD, { h: rh, tex: roomWall })];
    { const sk = plain(tintHex(dark ? '#7d7b76' : ft, env)), W0 = [[0, VD, o[0], o[1], RW, [[A1 - M2, A1 + M2], ...WIN], 0], [0, VD + RD, -o[0], -o[1], RW, [], 0], [A0, VD + RD / 2, R[0], R[1], RD, [], 0], [A1, VD + RD / 2, -R[0], -R[1], RD, [], 0]];
      for (const [k, [a, b, nx, nz, len, holes]] of W0.entries()) { const q = P(a, b); wall(`r${i}-skin${k}`, q[0] - nx * 0.03, q[1] - nz * 0.03, -nx, -nz, len, { h: rh, tex: sk, noSolid: true, holes: holes.map(([f, t, sl, tp]) => [f, t, sl, tp]) }); } }
    // its title, above the way in, on the face that looks at the plaza
    { const cv = canvas(1024, 256), x = cv.getContext('2d'); x.fillStyle = dark ? '#8d8b85' : ft; x.fillRect(0, 0, 1024, 256);
      x.fillStyle = dark ? 'rgba(250,248,244,0.95)' : 'rgba(40,36,30,0.88)'; x.textAlign = 'center'; x.textBaseline = 'middle'; let fs = 120, t = r.title; x.font = `500 ${fs}px Georgia, serif`; while (x.measureText(t).width > 940 && fs > 24) { fs -= 4; x.font = `500 ${fs}px Georgia, serif`; }
      x.fillText(t, 512, 108); x.fillStyle = col; x.fillRect(512 - 90, 190, 180, 8); const q = P(0, VD - 0.05), th = Math.min(0.8, rh - DOOR_H - 0.2), y1 = DOOR_H + 0.1 + th;
      surfaces.push({ name: `r${i}-title`, kind: 'wall', texture: jpg(cv, 0.92), origin: [q[0] - R[0] * 1.8, y1, q[1] - R[1] * 1.8], u: [R[0], 0, R[1]], v: [0, -1, 0], size: [3.6, th], normal: [-o[0], 0, -o[1]], openings: [] }); }
    const put = (work, wm, hm, run, ac, y) => hangAt(work, wm, hm, run.at(ac), run.n, y, r.labels ? { side: ac + wm / 2 + 0.55 > run.len ? -1 : 1,
      lines: [work.title, [work.artist && (work.artist.name || work.artist), work.year].filter(Boolean).join(', '), work.medium || '', work.note || ''].filter(Boolean) } : null);
    const manual = r.works.filter(w => w.s != null), autoW = r.works.filter(w => w.s == null).slice(0, 8);
    for (const work of manual) {
      const sz = await sizeOf({ ...work, image: thumbOf(work) }, src), [wm, hm] = streetFit(sz.w, sz.h).map(v => v / 100);
      const k = work.s < RD ? 0 : work.s < RD + RW ? 1 : 2, a0 = k === 0 ? 0 : k === 1 ? RD : RD + RW;
      put(work, wm, hm, runs[k], Math.min(Math.max(work.s - a0, wm / 2 + 0.1), runs[k].len - wm / 2 - 0.1), work.y != null ? work.y : 1.5);
    }
    for (const p of r.plinths || []) {
      const key = PLINTHS[p.size] ? p.size : 'm', ob = (r.objects || {})[p.work], q = P(Math.min(Math.max(p.x, 0.5), RW - 0.5) + A0, VD + Math.min(Math.max(p.z, 0.5), RD - 0.5));
      plinthsOut.push({ id: `${i}-${p.id}`, x: q[0], z: q[1], size: PLINTHS[key], key, work: p.work || null, obj: ob ? { id: ob.id, title: ob.title, image: ob.image, w: ob.w, h: ob.h } : null });
    }
    if (r.text) {
      const lines = String(r.text).split(/\n+/).join(' ').match(/.{1,46}(\s|$)/g) || [];
      const cv = canvas(640, 520), x = cv.getContext('2d'); x.fillStyle = 'rgba(250,248,244,0.97)'; x.fillRect(0, 0, 640, 520); x.fillStyle = 'rgba(40,36,30,0.9)'; x.textBaseline = 'top';
      x.font = 'italic 600 34px Georgia, serif'; x.fillText(String(r.title).slice(0, 30), 30, 28); x.font = '400 20px Georgia, serif';
      if (r.curator) { x.fillStyle = 'rgba(40,36,30,0.55)'; x.fillText('Curated by ' + r.curator, 30, 78); x.fillStyle = 'rgba(40,36,30,0.9)'; }
      lines.slice(0, 11).forEach((ln, k) => x.fillText(ln.trim(), 30, 122 + k * 32));
      const q = P(M2 + 2.3 < A1 ? M2 + 2.1 : -M2 - 0.5, VD + 0.012);
      surfaces.push({ name: `r${i}-intro`, kind: 'wall', texture: jpg(cv, 0.92), origin: [q[0], 2.6, q[1]], u: [-R[0], 0, -R[1]], v: [0, -1, 0], size: [1.6, 1.3], normal: [o[0], 0, o[1]], openings: [] });
    }
    const sized = await Promise.all(autoW.map(async work => { const s = await sizeOf({ ...work, image: thumbOf(work) }, src), k = Math.min(1, 140 / Math.max(s.w, s.h)); return { work, w: s.w * k, h: s.h * k }; }));
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
      for (const s of items) { const wm = s.w / 100, hm = s.h / 100; put(s.work, wm, hm, run, a + wm / 2, Math.min(Math.max(1.5, hm / 2 + 0.4), rh - hm / 2 - 0.5)); a += wm + g; }
    });
  }

  // --- on the plaza: three freestanding walls at their own angles, the first work of each exhibition on their faces (the name beside it);
  //     and the exhibitions' objects (up to three) on plinths
  const stands = [{ id: 'pl-a', x: CX - 4.2, z: CZ + 2.4, len: 4, rot: 14, h: 2.8 }, { id: 'pl-b', x: CX + 3.6, z: CZ - 0.6, len: 4, rot: -22, h: 2.8 }, { id: 'pl-c', x: CX - 0.5, z: CZ - 6.2, len: 3.6, rot: 8, h: 2.8 }];
  const faces = standWalls(stands), face = (() => { const c = canvas(256, 256), x = c.getContext('2d'); x.fillStyle = tintHex('#f6f4ef', { tint: env.tint.map(v => Math.pow(v, 0.55)) }); x.fillRect(0, 0, 256, 256);
    const b = x.createLinearGradient(0, 200, 0, 256); b.addColorStop(0, 'rgba(70,58,44,0)'); b.addColorStop(1, 'rgba(70,58,44,0.16)'); x.fillStyle = b; x.fillRect(0, 200, 256, 56); return jpg(c); })();
  for (const f of faces) surfaces.push({ name: f.name, kind: 'wall', stand: f.stand, texture: face, origin: f.origin, u: f.u, v: [0, -1, 0], size: [f.len, f.h], normal: f.normal, openings: [] });
  for (const s of stands) { const a = s.rot * Math.PI / 180; solids.push([s.x - Math.cos(a) * s.len / 2, s.z - Math.sin(a) * s.len / 2, s.x + Math.cos(a) * s.len / 2, s.z + Math.sin(a) * s.len / 2]); }
  const mid = f => [f.origin[0] + f.u[0] * f.len / 2, f.origin[2] + f.u[2] * f.len / 2];
  const spots = [4, 0, 2, 5, 1, 3].map(k => ({ p: mid(faces[k]), n: [faces[k].normal[0], faces[k].normal[2]], max: 150, y: 1.5 }));
  const heralds = rooms.map(r => ({ r, w: r.works.find(w => w.image) })).filter(q => q.w).slice(0, spots.length);
  for (const [k, q] of heralds.entries()) {
    const sp = spots[k], s = await sizeOf({ ...q.w, image: thumbOf(q.w) }, src), f = Math.min(sp.max / Math.max(s.w, s.h), 1.6);
    hangAt(q.w, s.w * f / 100, s.h * f / 100, sp.p, sp.n, sp.y, { lines: [q.w.title, [q.w.artist && (q.w.artist.name || q.w.artist), q.w.year].filter(Boolean).join(', '), 'In: ' + q.r.title].filter(Boolean) });
  }
  const objs = rooms.flatMap(r => Object.values(r.objects || {}).slice(0, 1)).slice(0, 3), at = [[CX + 0.8, CZ + 3.8], [CX + 6.4, CZ + 5.4], [CX - 7.2, CZ - 1.6]];
  objs.forEach((ob, k) => plinthsOut.push({ id: 'pl-p' + k, x: at[k][0], z: at[k][1], size: PLINTHS.m, key: 'm', work: ob.id, obj: { id: ob.id, title: ob.title, image: ob.image, w: ob.w, h: ob.h } }));

  // --- history sections (wings): data, not the Desk. A section is a chain of bays that widen and rise as you walk, each open to the next
  //     through a wide opening; paintings hang at their real size (the long side as the credits say, the shape from the picture), sculpture and
  //     maquettes stand on plinths (props.js). Its door is in the plaza's south edge, facing south. Data: data/museum/sections.json
  const props = [];
  let endZ = 0;
  for (const sec of opts.sections || []) {
    const dx = CX + (sec.door.lateral || 0), dz = CZ + (sec.door.radius || 13.5), o = [0, 1], R = [-1, 0], P = (a, b) => [dx + R[0] * a + o[0] * b, dz + R[1] * a + o[1] * b];
    const cr = sec.credits || {}, bays = sec.bays, stoneTex = plain(tintHex('#c9bba3', env));
    // what the walker's frame means for a wall facing +o (u runs to -a) or -o (u runs to +a): the position along the wall of the point a
    const along = (plus, aC, len, a) => plus ? (aC + len / 2) - a : a - (aC - len / 2);
    const finish = {
      stone: () => { const c = canvas(512, 512), x = c.getContext('2d'); x.fillStyle = '#cfc4ae'; x.fillRect(0, 0, 512, 512); noise(x, 512, 512, 5000, 0.1); x.strokeStyle = 'rgba(70,60,48,0.22)'; for (let k = 0; k <= 512; k += 128) { x.beginPath(); x.moveTo(k, 0); x.lineTo(k, 512); x.moveTo(0, k); x.lineTo(512, k); x.stroke(); } return jpg(c, 0.88); },
      oak: () => floorTex(0), marble: () => { const c = canvas(512, 512), x = c.getContext('2d'); for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { x.fillStyle = (i + j) % 2 ? '#e6e1d6' : '#c8c3b8'; x.fillRect(i * 128, j * 128, 128, 128); } noise(x, 512, 512, 4000, 0.06); return jpg(c, 0.88); },
      slate: () => { const c = canvas(512, 512), x = c.getContext('2d'); x.fillStyle = '#5a5a58'; x.fillRect(0, 0, 512, 512); noise(x, 512, 512, 7000, 0.12); x.strokeStyle = 'rgba(20,20,20,0.3)'; for (let k = 0; k <= 512; k += 170) { x.beginPath(); x.moveTo(k, 0); x.lineTo(k, 512); x.stroke(); } return jpg(c, 0.88); },
    };
    let b0 = 0, prev = null; const sects = [];
    for (const [i, bay] of bays.entries()) {
      const aL = bay.aL, aR = bay.aR, len = bay.len, h = bay.h, wtex = wallTex(bay.wall || '#efe9de', false), fTex = (finish[bay.floor] || finish.oak)(), b1 = b0 + len;
      orect(`${sec.id}${i}-floor`, 'wall', P, R, o, aL, aR, b0, b1, 0.004, true, fTex);
      orect(`${sec.id}${i}-ceil`, 'ceiling', P, R, o, aL, aR, b0, b1, h, false, bay.sky ? sky : plain('#f5f2ec'));
      const left = wall(`${sec.id}${i}-l`, ...P(aL, b0 + len / 2), R[0], R[1], len, { h, tex: wtex });
      const right = wall(`${sec.id}${i}-r`, ...P(aR, b0 + len / 2), -R[0], -R[1], len, { h, tex: wtex });
      for (const [nm, a, nx, nz] of [['l', aL - 0.03, -R[0], -R[1]], ['r', aR + 0.03, R[0], R[1]]]) wall(`${sec.id}${i}-sk${nm}`, ...P(a, b0 + len / 2), nx, nz, len, { h, tex: stoneTex, noSolid: true });
      // the dividing wall at the end of this bay (or the facade, for the first): spans both bays, one opening
      const next = bays[i + 1];
      if (i === 0) {                                                       // the facade, with the way in and the title over it
        const A0 = aL, A1 = aR, aC = (A0 + A1) / 2, w = A1 - A0, dw = bay.door || 3.4, oc = (aL + aR) / 2, s0 = along(true, aC, w, oc + dw / 2), s1 = along(true, aC, w, oc - dw / 2);
        wall(`${sec.id}-facade`, ...P(aC, 0), o[0], o[1], w, { h, tex: wtex, holes: [[s0, s1]] });
        wall(`${sec.id}-facade-sk`, ...P(aC, -0.03), -o[0], -o[1], w, { h, tex: stoneTex, noSolid: true, holes: [[along(false, aC, w, oc - dw / 2), along(false, aC, w, oc + dw / 2)]] });
        const cv = canvas(1024, 256), x = cv.getContext('2d'); x.fillStyle = tintHex('#c9bba3', { tint: [1, 1, 1] }); x.fillRect(0, 0, 1024, 256); x.fillStyle = 'rgba(40,36,30,0.9)'; x.textAlign = 'center'; x.textBaseline = 'middle';
        let fs = 120, t = sec.title; x.font = `500 ${fs}px Georgia, serif`; while (x.measureText(t).width > 940 && fs > 24) { fs -= 4; x.font = `500 ${fs}px Georgia, serif`; } x.fillText(t, 512, 100);
        x.font = '400 46px Georgia, serif'; x.fillStyle = 'rgba(40,36,30,0.62)'; x.fillText(sec.years || '', 512, 200);
        const q = P(oc, -0.06), th = Math.min(0.9, h - DOOR_H - 0.2), y1 = DOOR_H + 0.1 + th;
        surfaces.push({ name: `${sec.id}-title`, kind: 'wall', texture: jpg(cv, 0.92), origin: [q[0] - R[0] * 1.8, y1, q[1] - R[1] * 1.8], u: [R[0], 0, R[1]], v: [0, -1, 0], size: [3.6, th], normal: [-o[0], 0, -o[1]], openings: [] });
      }
      if (next) {
        const A0 = Math.min(aL, next.aL), A1 = Math.max(aR, next.aR), aC = (A0 + A1) / 2, w = A1 - A0, lo = Math.max(aL, next.aL), hi = Math.min(aR, next.aR), oc = (lo + hi) / 2, dw = Math.min(bay.open || 5, hi - lo - 1.6);
        const H = Math.max(h, next.h), wide = next.aR - next.aL > aR - aL ? next : bay;
        wall(`${sec.id}${i}-div`, ...P(aC, len + b0), o[0], o[1], w, { h: H, tex: wallTex(next.wall || '#efe9de', false), holes: [[along(true, aC, w, oc + dw / 2), along(true, aC, w, oc - dw / 2)]] });
        // outside faces of the step (where one bay is wider than the other) in the plain outdoor colour, looking back at the narrower bay
        for (const [x0, x1] of [[A0, lo], [hi, A1]]) if (x1 - x0 > 0.2) { const m = (x0 + x1) / 2; wall(`${sec.id}${i}-stp${x0 > A0 ? 'r' : 'l'}`, ...P(m, b0 + len - 0.03), -o[0], -o[1], x1 - x0, { h: H, tex: stoneTex, noSolid: true }); }
        void wide;
      } else {                                                             // the last bay: a closed far wall with what comes next
        const aC = (aL + aR) / 2, w = aR - aL;
        const fw = wall(`${sec.id}-far`, ...P(aC, b1), -o[0], -o[1], w, { h, tex: wtex });
        wall(`${sec.id}-far-sk`, ...P(aC, b1 + 0.03), o[0], o[1], w, { h, tex: stoneTex, noSolid: true });
        if (sec.after) { const cv = canvas(640, 260), x = cv.getContext('2d'); x.fillStyle = 'rgba(250,248,244,0.97)'; x.fillRect(0, 0, 640, 260); x.fillStyle = 'rgba(40,36,30,0.9)'; x.textBaseline = 'top'; x.font = 'italic 600 40px Georgia, serif'; x.fillText('Next: ' + sec.after, 30, 40);
          x.font = '400 24px Georgia, serif'; x.fillStyle = 'rgba(40,36,30,0.6)'; x.fillText('A new wing opens here.', 30, 110);
          const c = fw.at(w / 2), u = [fw.n[1], 0, -fw.n[0]]; surfaces.push({ name: `${sec.id}-next`, kind: 'wall', texture: jpg(cv, 0.92), origin: [c[0] + fw.n[0] * 0.012 - u[0] * 1.6, 2.7, c[1] + fw.n[1] * 0.012 - u[2] * 1.6], u, v: [0, -1, 0], size: [3.2, 1.3], normal: [fw.n[0], 0, fw.n[1]], openings: [] }); }
      }
      // the bay's wall text, beside the way in, on the left wall
      { const cv = canvas(640, 520), x = cv.getContext('2d'); x.fillStyle = 'rgba(250,248,244,0.97)'; x.fillRect(0, 0, 640, 520); x.fillStyle = 'rgba(40,36,30,0.92)'; x.textBaseline = 'top'; x.font = 'italic 600 34px Georgia, serif'; x.fillText(String(bay.title).slice(0, 32), 30, 28);
        x.font = '400 20px Georgia, serif'; x.fillStyle = 'rgba(40,36,30,0.55)'; x.fillText(bay.years || '', 30, 78); x.fillStyle = 'rgba(40,36,30,0.9)';
        (String(bay.text || '').match(/.{1,46}(\s|$)/g) || []).slice(0, 10).forEach((ln, k) => x.fillText(ln.trim(), 30, 122 + k * 32));
        const c = left.at(Math.min(1.9, len / 2)), n = left.n, u = [n[1], 0, -n[0]];
        surfaces.push({ name: `${sec.id}${i}-text`, kind: 'wall', texture: jpg(cv, 0.92), origin: [c[0] + n[0] * 0.012 - u[0] * 0.8, 2.5, c[1] + n[1] * 0.012 - u[2] * 0.8], u, v: [0, -1, 0], size: [1.6, 1.3], normal: [n[0], 0, n[1]], openings: [] }); }
      // paintings: along the left wall (from the way in) and the right wall, at their real size
      const runs = [{ w: left, from: 3.6 }, { w: right, from: 0.6 }], ws = (bay.works || []).map(s => cr[s]).filter(Boolean);
      const sized = [];
      for (const c of ws) {
        const a = (await sizeOf({ image: c.thumb }, src)).aspect || 1, long = Math.min(280, Math.max(...(c.size_cm || [70, 90]).map(Number).filter(v => v > 0)) || 90);
        sized.push({ c, w: (a >= 1 ? long : long * a) / 100, h: (a >= 1 ? long / a : long) / 100 });
      }
      const GAP = 0.55; let ri = 0; const bucket = runs.map(() => []);
      for (const s of sized) { while (ri < runs.length && bucket[ri].reduce((t, q) => t + q.w + GAP, 0) + s.w > runs[ri].w.len - runs[ri].from - 0.5) ri++; if (ri >= runs.length) break; bucket[ri].push(s); }
      bucket.forEach((items, k) => { let at = runs[k].from + 0.3; for (const s of items) {
        const wm = s.w, hm = s.h, c = s.c, y = Math.min(Math.max(1.55, hm / 2 + 0.55), h - hm / 2 - 0.45), run = runs[k].w, ac = at + wm / 2;
        hangAt({ slug: c.slug, id: c.slug, title: c.title, image: c.image, thumb: c.thumb }, wm, hm, run.at(ac), run.n, y, { side: 1, lines: [c.title, [c.artist, c.year].filter(Boolean).join(', '), c.medium || '', String(c.licence || '').split(' (')[0]].filter(Boolean) });
        at += wm + GAP; } });
      // sculpture and maquettes
      for (const p of bay.props || []) { const q = P(p.a, b0 + p.b), pl = p.plinth || { w: 0.7, d: 0.7, h: 1.0 };
        props.push({ ...p, x: q[0], z: q[1], rot: p.rot || 0, plinth: pl }); const m = Math.max(pl.w, pl.d) / 2 + 0.35; solids.push([q[0] - m, q[1] - m, q[0] + m, q[1] - m], [q[0] + m, q[1] - m, q[0] + m, q[1] + m], [q[0] + m, q[1] + m, q[0] - m, q[1] + m], [q[0] - m, q[1] + m, q[0] - m, q[1] - m]); }
      sects.push({ i, b0, b1 }); prev = bay; b0 = b1;
    }
    endZ = Math.max(endZ, dz + b0 + 4); void prev; void sects;
  }
  const lamps = [70, 110, ...Array.from({ length: 7 }, (_, k) => 135 + 19.3 + k * 38.6)].map(a => [CX + 9.5 * Math.cos(a * Math.PI / 180), CZ + 9.5 * Math.sin(a * Math.PI / 180)]);
  const spec = {
    version: 2, title: 'The Museum', source: 'Open Studio museum', virtual: true, ordered: true, far: 150, noSpots: true, sky: ['#9fbfd9', '#e9eef0'],
    outdoors: { hour: env.hour, centre: [CX, CZ], lamps, treeline: 'data/rooms/outside/treeline.webp', treeRadius: 70, treeHeight: 30 },
    baked: { kind: 'white-cube', plates: [] }, plinthRoom: { h: 4 },
    room: { x0: 22, x1: TOT - 22, z0: 22, z1: Math.max(TOT - 22, endZ), height: 6 }, surfaces, works, views: [], floorReflect: [0, 0], solids,
    stands: stands.map(s => ({ ...s, kind: 'stand', t: STAND.t })), ...(props.length ? { props } : {}),
    start: { pos: [CX + 1.2, CZ + 10.5], look: [CX - 0.5, CZ - 5] },
    ...(plinthsOut.length ? { plinths: plinthsOut } : {}),
  };
  if (opts.focus != null && places[opts.focus]) { const d = places[opts.focus]; spec.start = { pos: [d.c[0] - d.o[0] * 3.2, d.c[1] - d.o[1] * 3.2], look: [d.c[0] + d.o[0] * 3, d.c[1] + d.o[1] * 3] }; }
  return { spec, size: [TOT, TOT] };
}
// =====================================================================================================================
// Under One Sky (16.11, chosen by the owner from studio/design/museum-directions/): ONE building, 96 x 72 m, one roof 14 m high with a field of round openings whose light
// is painted soft on the floor (it slides with the visitor's hour), glass all round (the garden, the sky and the trees are seen only through it), six piers, and under the roof
// a small town: the eight Desk houses (the same rooms as ever: 8 x 6 m, the Desk's hang, plinths and words), the Renaissance wing (a history section: a chain of bays), a square with a
// pool, three freestanding walls and plinths. The plan in the viewer is tappable and lists everything (spec.directory).
// =====================================================================================================================
// THE MUSEUM IS A DESCRIPTION. The building is generated from a plan (a list of spaces and the base), not from a fixed street. This is the base plan; the Desk may store its
// own in the table museum_plan (key 'main'), and any valid description builds. Format (v1), documented in studio/design/museum-sky/README.md:
//   hall: { w, d, h }            the base: one building under one roof (metres; the glass walls and the roof follow it)
//   entrance: { at: [from, to] }  the way in: a gap in the south glass wall, metres along it
//   start: { pos: [x, z], look: [x, z] }
//   pool: [x0, z0, x1, z1] | null   the pool in the Square; piers: [[x, z], ...]; stands: [{ id, x, z, len, rot, h }]  (freestanding walls); objects: [[x, z], ...] (plinths with an exhibition's object)
//   spaces: [ { id, type: 'house', slot, door: [x, z], dir }                the room of Desk slot `slot` (8 x 6 m), its door at `door`, running `dir` degrees from it (0 east, 90 south, 270 north)
//             { id, type: 'section', section, door: [x, z], dir: [ox, oz] } a history section (data/museum/sections.json, by id), attached at `door`, running `dir` (a unit vector)
//             { id, type: ..., enabled: false }                            any space can be switched off (stage 2: add / remove a space on the Desk; the app already builds any valid plan) ]
export const SKY_PLAN = {
  version: 1,
  hall: { w: 96, d: 72, h: 14 }, entrance: { at: [43, 53] }, start: { pos: [48, 66.5], look: [48, 34] },
  pool: [40, 30, 60, 38], piers: [[29, 26], [70, 24], [29, 48], [70, 48], [48, 26], [48, 48]],
  stands: [{ id: 'pl-a', x: 38, z: 26.5, len: 4, rot: 12, h: 3.2 }, { id: 'pl-b', x: 62, z: 43, len: 4, rot: -20, h: 3.2 }, { id: 'pl-c', x: 44, z: 45.5, len: 3.6, rot: 6, h: 3.2 }],
  objects: [[56, 46], [37, 43], [67, 33]],
  spaces: [
    { id: 'house-1', type: 'house', slot: 1, door: [41, 21], dir: 270 }, { id: 'house-2', type: 'house', slot: 2, door: [52, 18.5], dir: 273 }, { id: 'house-3', type: 'house', slot: 3, door: [31, 19.5], dir: 268 },
    { id: 'house-4', type: 'house', slot: 4, door: [63, 20.5], dir: 272 }, { id: 'house-5', type: 'house', slot: 5, door: [78, 26], dir: 2 }, { id: 'house-6', type: 'house', slot: 6, door: [77.5, 44], dir: -3 },
    { id: 'house-7', type: 'house', slot: 7, door: [32, 53], dir: 92 }, { id: 'house-8', type: 'house', slot: 8, door: [64, 54.5], dir: 88 },
    { id: 'ritual', type: 'house', slot: 57, tour: 'ritual', door: [79, 60], dir: 0 },
    { id: 'renaissance', type: 'section', section: 'renaissance', door: [14, 47], dir: [0, -1] },
  ],
};
// a description from the Desk (or anywhere) is trusted only as far as it is valid: whatever is wrong falls back to the base plan, so the museum always opens
export function planOf(p) {
  const num = (v, a, b, d) => (typeof v === 'number' && isFinite(v) && v >= a && v <= b ? v : d), pt = (q, d) => Array.isArray(q) && q.length === 2 && q.every(v => typeof v === 'number' && isFinite(v)) ? q : d;
  if (!p || typeof p !== 'object') return SKY_PLAN;
  const D = SKY_PLAN, h = p.hall || {}, hall = { w: num(h.w, 30, 220, D.hall.w), d: num(h.d, 30, 220, D.hall.d), h: num(h.h, 6, 30, D.hall.h) };
  const spaces = (Array.isArray(p.spaces) ? p.spaces : D.spaces).filter(sp => sp && sp.enabled !== false && (sp.type === 'house' ? Number.isInteger(sp.slot) && sp.slot >= 1 && sp.slot <= 64 && pt(sp.door) && typeof sp.dir === 'number'
    : sp.type === 'section' ? typeof sp.section === 'string' && pt(sp.door) && pt(sp.dir) : false));
  return { version: 1, hall, entrance: { at: Array.isArray(p.entrance && p.entrance.at) && p.entrance.at.length === 2 ? p.entrance.at : D.entrance.at },
    start: { pos: pt(p.start && p.start.pos, [hall.w / 2, hall.d - 5.5]), look: pt(p.start && p.start.look, [hall.w / 2, hall.d / 2]) },
    pool: p.pool === null ? null : (Array.isArray(p.pool) && p.pool.length === 4 && p.pool.every(v => typeof v === 'number') ? p.pool : D.pool),
    piers: (Array.isArray(p.piers) ? p.piers : D.piers).filter(q => pt(q)), stands: (Array.isArray(p.stands) ? p.stands : D.stands).filter(q => q && [q.x, q.z, q.len, q.rot, q.h].every(v => typeof v === 'number')).slice(0, 12),
    objects: (Array.isArray(p.objects) ? p.objects : D.objects).filter(q => pt(q)).slice(0, 12), spaces };
}
export function skyLayout(plan = SKY_PLAN) {
  return planOf(plan).spaces.filter(sp => sp.type === 'house').map((sp, slot) => { const a = sp.dir * Math.PI / 180, o = [Math.cos(a), Math.sin(a)]; return { slot, j: slot % 8, c: sp.door, o, r: [-o[1], o[0]], id: sp.id, no: sp.slot }; });
}
export async function buildSky(rooms, src, thumbOf = w => w.image, opts = {}) {
  const PLAN = planOf(opts.plan), { RD, RW, VD, MOUTH, DOOR_H, RIM } = SH, HX = PLAN.hall.w, HZ = PLAN.hall.d, HH = PLAN.hall.h, [CX, CZ] = [HX / 2, HZ / 2], TOT = Math.max(260, HX * 2.6), env = envFor(opts.hour), LIT = [0.97, 0.86, 0.7], tIn = env.tint.map((v, i) => v + (LIT[i] - v) * env.night * 0.8), envIn = { ...env, tint: tIn };      // (tIn: inside the hall by night the warm lamps, not the blue of the dark outside)
  rooms = rooms.slice(0, 64);
  const surfaces = [], solids = [], works = [], plinthsOut = [], flat = new Map();
  const plain = c => { if (!flat.has(c)) { const cv = canvas(4, 4), x = cv.getContext('2d'); x.fillStyle = c; x.fillRect(0, 0, 4, 4); flat.set(c, cv.toDataURL('image/png')); } return flat.get(c); };
  const noise = (x, w, h, count, a) => { for (let i = 0; i < count; i++) { const v = Math.random() < 0.5 ? 255 : 0; x.fillStyle = `rgba(${v},${v},${v},${Math.random() * a})`; x.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 1.5, 1 + Math.random() * 1.5); } };
  const wall = (name, cx, cz, nx, nz, len, o = {}) => {
    const ux = nz, uz = -nx, x = cx - ux * len / 2, z = cz - uz * len / 2, holes = o.holes || [], h = o.h || 3.8;
    surfaces.push({ name, kind: 'wall', texture: o.tex, origin: [x, h, z], u: [ux, 0, uz], v: [0, -1, 0], size: [len, h], normal: [nx, 0, nz],
      openings: holes.map(([a, b, sill, top]) => ({ from: a, to: b, height: top || DOOR_H, sill: sill || 0, arch: false, depth: 0.1, through: true, bare: true })) });
    if (o.noSolid) return { n: [nx, nz], len, at: s => [x + ux * s, z + uz * s] };
    let a = 0; for (const [f, t] of [...holes.filter(q => !q[2]), [len, len]].sort((p, q) => p[0] - q[0])) { if (f > a + 0.01) solids.push([x + ux * a, z + uz * a, x + ux * f, z + uz * f]); a = Math.max(a, t); }
    for (const q of holes.filter(q => q[2])) solids.push([x + ux * q[0], z + uz * q[0], x + ux * q[1], z + uz * q[1]]);       // (a window is not a way through)
    return { n: [nx, nz], len, at: s => [x + ux * s, z + uz * s] };
  };
  // a flat rectangle on the ground or ceiling, on a house's own axes: from P(a0, b0), a along r, b along o
  const orect = (name, kind, P, R, o, a0, a1, b0, b1, y, up, tex) => { const q = P(a0, b0);
    surfaces.push({ name, kind, texture: tex, origin: [q[0], y, q[1]], u: [R[0], 0, R[1]], v: [o[0], 0, o[1]], size: [a1 - a0, b1 - b0], normal: [0, up ? 1 : -1, 0], openings: [] }); };
  const rect = (name, kind, a, b, y, up, tex) => { const x = Math.min(a[0], b[0]), z = Math.min(a[1], b[1]), w = Math.abs(b[0] - a[0]), d = Math.abs(b[1] - a[1]);
    surfaces.push({ name, kind, texture: tex, origin: [x, y, up ? z : z + d], u: [1, 0, 0], v: up ? [0, 0, 1] : [0, 0, -1], size: [w, d], normal: [0, up ? 1 : -1, 0], openings: [] }); };
  const plate = (name, lines, cx, cy, cz, N, w, h) => {
    const c = canvas(w * 400, h * 400), x = c.getContext('2d'); x.fillStyle = 'rgba(250,248,244,0.96)'; x.fillRect(0, 0, c.width, c.height);
    x.fillStyle = 'rgba(40,36,30,0.88)'; x.textBaseline = 'top';
    let yy = 8; lines.forEach((ln, k) => { x.font = `${k === 0 ? 'italic 600 17px' : '400 14px'} Georgia, serif`; let s = String(ln); while (x.measureText(s).width > c.width - 16 && s.length > 4) s = s.slice(0, -2); x.fillText(s, 8, yy); yy += k === 0 ? 22 : 18; });
    const ux = N[2], uz = -N[0];
    surfaces.push({ name, kind: 'wall', texture: jpg(c, 0.9), origin: [cx - ux * w / 2, cy + h / 2, cz - uz * w / 2], u: [ux, 0, uz], v: [0, -1, 0], size: [w, h], normal: [N[0], 0, N[2]], openings: [] });
  };
  const hangAt = (work, wm, hm, p, n, y, label) => {
    const N = [n[0], 0, n[1]], off = 0.039, ux = N[2], uz = -N[0];
    works.push({ id: work.slug || work.id, work: work.title, image: work.image, imageSmall: thumbOf(work), size: [wm * 100, hm * 100], measured: [wm * 100, hm * 100],
      centre: [p[0] + N[0] * off, y, p[1] + N[2] * off], axes: [[N[2], 0, -N[0]], [0, 1, 0], N], depth: 0.035, lightScale: 1 });
    if (label) { const d = (label.side || 1) * (wm / 2 + 0.3);
      plate(`lab${works.length}`, label.lines, p[0] + ux * d + N[0] * 0.012, Math.max(0.6, y - hm / 2 + 0.2), p[1] + uz * d + N[2] * 0.012, N, 0.4, 0.28); }
  };

  const places = skyLayout(PLAN), bySlot = new Map(rooms.map((r, i) => [r.slot ?? i + 1, r])), houseList = places.map((d, k) => ({ d, r: bySlot.get(d.no), k })).filter(q => q.r);      // (a house stands only where its slot holds an exhibition)
  // --- ONE building: a floor of pale terrazzo under one roof of soft light (96 x 72 m, 14 m high), glass all round; outside, a garden seen only through the glass.
  //     The roof's round openings are painted as soft, wide pools of light on the floor (gentle falloff, no hard edges) and slide with the visitor's hour.
  const lite = (x, w, h, k = 1) => { x.save(); x.globalCompositeOperation = 'multiply'; x.fillStyle = `rgb(${tIn.map(v => Math.round(255 * Math.min(1, Math.pow(v, k))))})`; x.fillRect(0, 0, w, h); x.restore(); };
  const sunA = Math.PI * (env.hour - 6.5) / 11, sunEl = Math.max(30, Math.min(70, 56 * Math.sin(Math.max(0, sunA)))) * Math.PI / 180;      // (a low sun is held at 30 degrees: the pools would leave the floor)
  {
    const g = canvas(256, 256), x = g.getContext('2d'); x.fillStyle = '#9fb27f'; x.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 5200; i++) { const t = Math.random(); x.fillStyle = t < 0.5 ? 'rgba(255,255,230,0.12)' : t < 0.85 ? 'rgba(60,90,40,0.14)' : 'rgba(140,120,70,0.14)'; x.fillRect(Math.random() * 256, Math.random() * 256, 1 + Math.random() * 3, 1 + Math.random() * 2); }
    lite(x, 256, 256);
    surfaces.push({ name: 'floor', kind: 'floor', texture: jpg(g, 0.9), tileXY: [4, 4], origin: [CX - TOT / 2, -0.05, CZ - TOT / 2], u: [1, 0, 0], v: [0, 0, 1], size: [TOT, TOT], normal: [0, 1, 0], openings: [] });
  }
  {
    const FP = 16, fw = HX * FP, fh = HZ * FP, c = canvas(fw, fh), y = c.getContext('2d');
    y.fillStyle = '#d8d4ca'; y.fillRect(0, 0, fw, fh);
    for (let i = 0; i < 42000; i++) { const t = Math.random(); y.fillStyle = t < 0.4 ? 'rgba(255,255,255,0.32)' : t < 0.8 ? 'rgba(80,70,60,0.16)' : 'rgba(190,160,130,0.22)'; y.fillRect(Math.random() * fw, Math.random() * fh, 1 + Math.random() * 2, 1 + Math.random() * 2); }
    y.strokeStyle = 'rgba(80,70,60,0.15)'; y.lineWidth = 2; for (let k = 0; k <= HX; k += 4) { y.beginPath(); y.moveTo(k * FP, 0); y.lineTo(k * FP, fh); y.stroke(); } for (let k = 0; k <= HZ; k += 4) { y.beginPath(); y.moveTo(0, k * FP); y.lineTo(fw, k * FP); y.stroke(); }
    if (PLAN.pool) { const [px0, pz0, px1, pz1] = PLAN.pool, pool = y.createLinearGradient(0, pz0 * FP, 0, pz1 * FP); pool.addColorStop(0, '#9db4bb'); pool.addColorStop(1, '#b9cdd1'); y.fillStyle = pool; y.fillRect(px0 * FP, pz0 * FP, (px1 - px0) * FP, (pz1 - pz0) * FP); y.strokeStyle = 'rgba(70,64,56,0.55)'; y.lineWidth = 6; y.strokeRect(px0 * FP, pz0 * FP, (px1 - px0) * FP, (pz1 - pz0) * FP); }
    // contact shadows, painted into the floor: the soft dark that gathers where a wall, a pier or a stand meets the floor (ambient occlusion, baked: it costs nothing while walking)
    { const soft = (pts, reach, a) => { const mx = pts.reduce((t, q) => t + q[0], 0) / pts.length, mz = pts.reduce((t, q) => t + q[1], 0) / pts.length;
        for (let s = 14; s >= 1; s--) { const t = reach * s / 14, k = t * 2 / 8, grow = q => { const dx = q[0] - mx, dz = q[1] - mz, L = Math.hypot(dx, dz) || 1; return [q[0] + dx / L * t, q[1] + dz / L * t]; };
          y.fillStyle = `rgba(52,42,32,${(a / 14 * (0.35 + 0.65 * (1 - s / 15))).toFixed(4)})`; y.beginPath(); pts.map(grow).forEach((q, j) => j ? y.lineTo(q[0] * FP, q[1] * FP) : y.moveTo(q[0] * FP, q[1] * FP)); y.closePath(); y.fill(); void k; } };
      for (const { d } of houseList) { const [c, o, R] = [d.c, d.o, d.r], q = (a, b) => [c[0] + R[0] * a + o[0] * b, c[1] + R[1] * a + o[1] * b]; soft([q(-4.1, -0.3), q(4.1, -0.3), q(4.1, 7.9), q(-4.1, 7.9)], 1.1, 1.15); }
      for (const [px, pz] of PLAN.piers) soft([[px - 0.7, pz - 0.7], [px + 0.7, pz - 0.7], [px + 0.7, pz + 0.7], [px - 0.7, pz + 0.7]], 0.9, 1.1);
      for (const s of PLAN.stands) { const a = s.rot * Math.PI / 180, c = [Math.cos(a), Math.sin(a)], n = [-c[1], c[0]], h = s.len / 2, w = 0.12; soft([[s.x - c[0] * h - n[0] * w, s.z - c[1] * h - n[1] * w], [s.x + c[0] * h - n[0] * w, s.z + c[1] * h - n[1] * w], [s.x + c[0] * h + n[0] * w, s.z + c[1] * h + n[1] * w], [s.x - c[0] * h + n[0] * w, s.z - c[1] * h + n[1] * w]], 0.9, 1.1); }
      for (const [ox, oz] of PLAN.objects) soft([[ox - 0.5, oz - 0.5], [ox + 0.5, oz - 0.5], [ox + 0.5, oz + 0.5], [ox - 0.5, oz + 0.5]], 0.7, 0.9);
      const edge = (x0, z0, x1, z1, w, h) => { const g = y.createLinearGradient(x0 * FP, z0 * FP, x1 * FP, z1 * FP); g.addColorStop(0, 'rgba(52,42,32,0.34)'); g.addColorStop(1, 'rgba(52,42,32,0)'); y.fillStyle = g; y.fillRect(Math.min(x0, x1) * FP, Math.min(z0, z1) * FP, w * FP, h * FP); };       // the glass walls' foot
      edge(0, 0, 0, 0.9, HX, 0.9); edge(0, HZ, 0, HZ - 0.9, HX, 0.9); edge(0, 0, 0.9, 0, 0.9, HZ); edge(HX, 0, HX - 0.9, 0, 0.9, HZ); }
    for (const { d, r } of houseList) { const px = (d.c[0] - d.o[0] * 2) * FP, pz = (d.c[1] - d.o[1] * 2) * FP, rad = 4.6 * FP, gr = y.createRadialGradient(px, pz, 0, px, pz, rad);      // each house's colour spills on the floor before its door
      gr.addColorStop(0, rgba(r.colour, 0.34)); gr.addColorStop(1, rgba(r.colour, 0)); y.fillStyle = gr; y.fillRect(px - rad, pz - rad, 2 * rad, 2 * rad); }
    if (env.day > 0.12) {
      const sx = -Math.cos(sunA), sz = -Math.sin(sunA), shift = HH / Math.tan(sunEl), ang = Math.atan2(sz, sx), a = 0.27 * env.day;
      const pl = canvas(fw, fh), py = pl.getContext('2d'); py.globalCompositeOperation = 'lighter';
      for (let i = 0; i < HX / 4; i++) for (let j = 0; j < HZ / 4; j++) {
        const big = (i + j) % 2 === 0, r = (big ? 1.05 : 0.6) * 2.1, cx = (2 + i * 4 + sx * shift) * FP, cz = (2 + j * 4 + sz * shift) * FP;
        if (cx < -r * FP * 2 || cz < -r * FP * 2 || cx > fw + r * FP * 2 || cz > fh + r * FP * 2) continue;
        py.save(); py.translate(cx, cz); py.rotate(ang); py.scale(1 / Math.sqrt(Math.sin(sunEl)), 1);
        const gr = py.createRadialGradient(0, 0, 0, 0, 0, r * FP); gr.addColorStop(0, `rgba(255,246,226,${a})`); gr.addColorStop(0.45, `rgba(255,244,222,${a * 0.55})`); gr.addColorStop(1, 'rgba(255,240,215,0)');
        py.fillStyle = gr; py.fillRect(-r * FP, -r * FP, 2 * r * FP, 2 * r * FP); py.restore();
      }
      // what stands in the sun's way keeps the light off the floor behind it: each house, pier and stand throws a soft shadow along the slant, cut out of the pools (the roof only lets the sun in through its openings, so the shadow shows only where there is light)
      { py.globalCompositeOperation = 'destination-out';
        const hull = pts => { pts = pts.slice().sort((p1, p2) => p1[0] - p2[0] || p1[1] - p2[1]); const cr = (o, p1, p2) => (p1[0] - o[0]) * (p2[1] - o[1]) - (p1[1] - o[1]) * (p2[0] - o[0]), lo = [], up = [];
          for (const q of pts) { while (lo.length > 1 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); } for (const q of pts.slice().reverse()) { while (up.length > 1 && cr(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); } return lo.slice(0, -1).concat(up.slice(0, -1)); };
        const cast = (pts, h) => { const d = h / Math.tan(sunEl), all = [...pts, ...pts.map(q => [q[0] + sx * d, q[1] + sz * d])], H = hull(all), mx = H.reduce((t, q) => t + q[0], 0) / H.length, mz = H.reduce((t, q) => t + q[1], 0) / H.length;
          for (let k = 6; k >= 0; k--) { const g = k * 0.16; py.fillStyle = `rgba(0,0,0,${k === 0 ? 0.55 : 0.12})`; py.beginPath(); H.forEach((q, n) => { const dx = q[0] - mx, dz = q[1] - mz, Ld = Math.hypot(dx, dz) || 1, X = (q[0] + dx / Ld * g) * FP, Z = (q[1] + dz / Ld * g) * FP; n ? py.lineTo(X, Z) : py.moveTo(X, Z); }); py.closePath(); py.fill(); } };
        for (const { d, k } of houseList) { const [c, o, Rr] = [d.c, d.o, d.r], q = (a, b) => [c[0] + Rr[0] * a + o[0] * b, c[1] + Rr[1] * a + o[1] * b]; cast([q(-4, 0), q(4, 0), q(4, 7.8), q(-4, 7.8)], CL.RH[k % 8]); }
        for (const [px, pz] of PLAN.piers) cast([[px - 0.7, pz - 0.7], [px + 0.7, pz - 0.7], [px + 0.7, pz + 0.7], [px - 0.7, pz + 0.7]], HH);
        for (const st of PLAN.stands) { const a2 = st.rot * Math.PI / 180, c2 = [Math.cos(a2), Math.sin(a2)], n2 = [-c2[1], c2[0]], hh = st.len / 2; cast([[st.x - c2[0] * hh - n2[0] * 0.1, st.z - c2[1] * hh - n2[1] * 0.1], [st.x + c2[0] * hh - n2[0] * 0.1, st.z + c2[1] * hh - n2[1] * 0.1], [st.x + c2[0] * hh + n2[0] * 0.1, st.z + c2[1] * hh + n2[1] * 0.1], [st.x - c2[0] * hh + n2[0] * 0.1, st.z - c2[1] * hh + n2[1] * 0.1]], st.h); } }
      y.save(); y.globalCompositeOperation = 'lighter'; y.drawImage(pl, 0, 0); y.restore();
    }
    if (env.day <= 0.3) {                                           // by night the museum's own lamps: warm round pools on the floor under the roof's openings
      const k = 1 - env.day / 0.3; y.save(); y.globalCompositeOperation = 'lighter';
      for (let i = 0; i < HX / 4; i++) for (let j = 0; j < HZ / 4; j++) { const big = (i + j) % 2 === 0, r = (big ? 1.05 : 0.6) * 2.2 * FP, cx = (2 + i * 4) * FP, cz = (2 + j * 4) * FP, g = y.createRadialGradient(cx, cz, 0, cx, cz, r);
        g.addColorStop(0, `rgba(255,214,160,${(0.2 * k).toFixed(3)})`); g.addColorStop(1, 'rgba(255,214,160,0)'); y.fillStyle = g; y.fillRect(cx - r, cz - r, 2 * r, 2 * r); }
      y.restore(); }
    lite(y, fw, fh, 0.5);
    rect('hall-floor', 'wall', [0, 0], [HX, HZ], 0.02, true, jpg(c, 0.88));
  }
  {
    const FP = 12, fw = HX * FP, fh = HZ * FP, c = canvas(fw, fh), y = c.getContext('2d'), night = env.day < 0.3;
    y.fillStyle = night ? '#4a4846' : '#e2ded4'; y.fillRect(0, 0, fw, fh); noise(y, fw, fh, 9000, 0.07);
    for (let i = 0; i < HX / 4; i++) for (let j = 0; j < HZ / 4; j++) {
      const r = ((i + j) % 2 === 0 ? 1.05 : 0.6) * 1.35 * FP, cx = (2 + i * 4) * FP, cz = (2 + j * 4) * FP, gr = y.createRadialGradient(cx, cz, 0, cx, cz, r);
      gr.addColorStop(0, night ? 'rgba(74,90,126,1)' : 'rgba(238,246,255,1)'); gr.addColorStop(0.5, night ? 'rgba(70,84,118,0.9)' : 'rgba(236,244,252,0.92)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); y.fillStyle = gr; y.fillRect(cx - r, cz - r, 2 * r, 2 * r);
    }
    rect('hall-roof', 'ceiling', [0, 0], [HX, HZ], HH, false, jpg(c, 0.9));
    // light shafts: a few of the roof's round openings let down a faint beam of dusty light along the sun's slant (two crossed soft planes each, one shared small texture); only by day
    if (env.day > 0.12) {
      const sx = -Math.cos(sunA), sz = -Math.sin(sunA), shift = HH / Math.tan(sunEl), L = Math.hypot(shift, HH), vv = [sx * shift / L, -HH / L, sz * shift / L], px = -sz, pz = sx;
      const tc = canvas(64, 256), tx = tc.getContext('2d'), a0 = (0.15 + 0.2 * (1 - Math.sin(sunEl))) * Math.min(1, env.day * 1.4);
      const gx = tx.createLinearGradient(0, 0, 64, 0); gx.addColorStop(0, 'rgba(255,246,226,0)'); gx.addColorStop(0.5, `rgba(255,246,226,${a0.toFixed(3)})`); gx.addColorStop(1, 'rgba(255,246,226,0)'); tx.fillStyle = gx; tx.fillRect(0, 0, 64, 256);
      tx.globalCompositeOperation = 'destination-in'; const gy = tx.createLinearGradient(0, 0, 0, 256); gy.addColorStop(0, 'rgba(0,0,0,1)'); gy.addColorStop(0.55, 'rgba(0,0,0,0.55)'); gy.addColorStop(1, 'rgba(0,0,0,0)'); tx.fillStyle = gy; tx.fillRect(0, 0, 64, 256);
      const beam = tc.toDataURL('image/png');
      let n = 0;
      for (let i = 0; i < HX / 4; i++) for (let j = 0; j < HZ / 4; j++) {
        if ((i + j) % 2 !== 0 || (i * 7 + j * 3) % 11 !== 0) continue;
        const r = 1.05 * 1.5, cx = 2 + i * 4, cz = 2 + j * 4, top = [cx, HH - 0.03, cz];
        surfaces.push({ name: `beam${n}a`, kind: 'wall', glass: true, batch: 'beam', texture: beam, origin: [top[0] - px * r, top[1], top[2] - pz * r], u: [px, 0, pz], v: vv, size: [2 * r, L], normal: [sx, 0, sz], openings: [] });
        surfaces.push({ name: `beam${n}b`, kind: 'wall', glass: true, batch: 'beam', texture: beam, origin: [top[0] - sx * r, top[1], top[2] - sz * r], u: [sx, 0, sz], v: vv, size: [2 * r, L], normal: [px, 0, pz], openings: [] });
        n++;
      }
    }
  }
  const glassWall = (name, x0, z0, x1, z1, nx, nz, door) => {
    const L = Math.hypot(x1 - x0, z1 - z0), ux = (x1 - x0) / L, uz = (z1 - z0) / L, S = 20, cw = Math.round(L * S), ch = Math.round(HH * S), c = canvas(cw, ch), y = c.getContext('2d');
    // glass that reads as glass (baked, costs nothing while walking): a wash, the sky's and the floor's sheen at the top and the foot, soft diagonal reflections of the room, a green cast at each pane's edge,
    // mullions with a lit edge and a soft shadow, transoms, a little dirt at the foot
    let seed = 7; for (const ch2 of name) seed = (seed * 31 + ch2.charCodeAt(0)) % 9973; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    y.fillStyle = 'rgba(228,240,244,0.06)'; y.fillRect(0, 0, cw, ch);
    let g = y.createLinearGradient(0, 0, 0, ch * 0.4); g.addColorStop(0, 'rgba(238,246,252,0.2)'); g.addColorStop(1, 'rgba(238,246,252,0)'); y.fillStyle = g; y.fillRect(0, 0, cw, ch * 0.4);
    g = y.createLinearGradient(0, ch * 0.78, 0, ch); g.addColorStop(0, 'rgba(214,208,192,0)'); g.addColorStop(1, 'rgba(214,208,192,0.16)'); y.fillStyle = g; y.fillRect(0, ch * 0.78, cw, ch * 0.22);
    for (let b = 0; b < Math.max(2, Math.round(L / 22)); b++) { const bx = rnd() * cw, bw = (1.4 + rnd() * 2.6) * S, lean = ch * 0.22; g = y.createLinearGradient(bx, 0, bx + bw, 0);
      g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, `rgba(255,255,255,${0.06 + rnd() * 0.05})`); g.addColorStop(1, 'rgba(255,255,255,0)'); y.fillStyle = g;
      y.beginPath(); y.moveTo(bx, 0); y.lineTo(bx + bw, 0); y.lineTo(bx + bw - lean, ch); y.lineTo(bx - lean, ch); y.closePath(); y.fill(); }
    const PANE = 1.9, mull = [], trans = [0.3 * HH, 0.62 * HH]; for (let k = 0; k <= L; k += PANE) mull.push(Math.min(cw - 3, k * S));
    for (const m of mull) { for (const sgn of [1, -1]) { g = y.createLinearGradient(m, 0, m + sgn * 0.14 * S, 0); g.addColorStop(0, 'rgba(110,165,150,0.2)'); g.addColorStop(1, 'rgba(110,165,150,0)'); y.fillStyle = g; y.fillRect(sgn > 0 ? m : m - 0.14 * S, 0, 0.14 * S, ch); } }
    for (const m of mull) { g = y.createLinearGradient(m + 3, 0, m + 3 + 0.22 * S, 0); g.addColorStop(0, 'rgba(20,24,28,0.22)'); g.addColorStop(1, 'rgba(20,24,28,0)'); y.fillStyle = g; y.fillRect(m + 3, 0, 0.22 * S, ch);
      y.fillStyle = 'rgba(40,44,48,0.9)'; y.fillRect(m, 0, 3, ch); y.fillStyle = 'rgba(255,255,255,0.32)'; y.fillRect(m - 1, 0, 1, ch); }
    for (const hh of trans) { const ty = hh * S; g = y.createLinearGradient(0, ty + 3, 0, ty + 3 + 0.2 * S); g.addColorStop(0, 'rgba(20,24,28,0.22)'); g.addColorStop(1, 'rgba(20,24,28,0)'); y.fillStyle = g; y.fillRect(0, ty + 3, cw, 0.2 * S); y.fillStyle = 'rgba(40,44,48,0.9)'; y.fillRect(0, ty, cw, 3); y.fillStyle = 'rgba(255,255,255,0.3)'; y.fillRect(0, ty - 1, cw, 1); }
    y.fillStyle = 'rgba(40,44,48,0.9)'; y.fillRect(0, 0, cw, 5); y.fillRect(0, ch - 5, cw, 5);
    for (let d = 0; d < L * 38; d++) { const dy = ch - Math.pow(rnd(), 2.2) * 1.8 * S; y.fillStyle = `rgba(96,86,70,${(0.03 + rnd() * 0.05).toFixed(3)})`; y.fillRect(rnd() * cw, dy, 1 + rnd() * 3, 1 + rnd() * 2); }
    surfaces.push({ name, kind: 'wall', glass: true, texture: c.toDataURL('image/png'), origin: [x0, HH, z0], u: [ux, 0, uz], v: [0, -1, 0], size: [L, HH], normal: [nx, 0, nz], openings: door ? [{ from: door[0], to: door[1], height: 3.8, arch: false, depth: 0.1, through: true, bare: true }] : [] });
    let a = 0; for (const [f, t] of [...(door ? [door] : []), [L, L]].sort((p, q) => p[0] - q[0])) { if (f > a + 0.01) solids.push([x0 + ux * a, z0 + uz * a, x0 + ux * f, z0 + uz * f]); a = Math.max(a, t); }
  };
  glassWall('glass-n', 0, 0, HX, 0, 0, 1); glassWall('glass-e', HX, 0, HX, HZ, -1, 0); glassWall('glass-w', 0, 0, 0, HZ, 1, 0); glassWall('glass-s', 0, HZ, HX, HZ, 0, -1, PLAN.entrance.at);
  if (PLAN.pool) { const [a0, b0, a1, b1] = PLAN.pool; solids.push([a0, b0, a1, b0], [a1, b0, a1, b1], [a1, b1, a0, b1], [a0, b1, a0, b0]); }                 // (the pool)
  const tints = ['#f4f1ec', '#cfcdc8', '#e8dccb', '#f1efe9', '#c9a690', '#e4e8e2', '#d8d3c8', '#f4f1ec'];     // the houses' walls: white, concrete, sand, ... (their own finish, not one tone)
  // board-formed concrete for the piers: mottled, vertical board grain, pour joints every 2.4 m, tie holes on a 1.2 m grid, the foot a little dirty (baked once; the six piers share it)
  const concreteTex = hex => { const cw = 128, ch = 1280, c = canvas(cw, ch), x = c.getContext('2d'); let sd = 11; const r = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
    x.fillStyle = hex; x.fillRect(0, 0, cw, ch);
    for (let k = 0; k < 26; k++) { const cx = r() * cw, cy = r() * ch, rr = 18 + r() * 50, g = x.createRadialGradient(cx, cy, 0, cx, cy, rr), dk = r() < 0.5; g.addColorStop(0, dk ? 'rgba(70,66,60,0.10)' : 'rgba(255,255,255,0.10)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(cx - rr, cy - rr, rr * 2, rr * 2); }
    for (let k = 0; k < 40; k++) { const bx = Math.round(k * cw / 40); x.fillStyle = `rgba(${r() < 0.5 ? '255,255,255' : '60,56,50'},${(0.025 + r() * 0.04).toFixed(3)})`; x.fillRect(bx, 0, 1 + Math.round(r() * 2), ch); }
    for (let k = 0; k < 5200; k++) { x.fillStyle = `rgba(${r() < 0.5 ? '255,255,255' : '70,64,58'},${(r() * 0.2).toFixed(3)})`; x.fillRect(r() * cw, r() * ch, 1 + r() * 2, 1 + r() * 2); }
    for (let k = 1; k < 6; k++) { const jy = Math.round(k * 2.4 * ch / 14); x.fillStyle = 'rgba(48,44,40,0.35)'; x.fillRect(0, jy, cw, 2); x.fillStyle = 'rgba(255,255,255,0.22)'; x.fillRect(0, jy + 2, cw, 1); }
    for (let k = 0; k < 12; k++) for (const hx of [cw * 0.2, cw * 0.8]) { const hy = (0.6 + k * 1.2) * ch / 14; x.fillStyle = 'rgba(40,36,32,0.5)'; x.beginPath(); x.arc(hx, hy, 3, 0, 7); x.fill(); x.strokeStyle = 'rgba(255,255,255,0.28)'; x.lineWidth = 1; x.beginPath(); x.arc(hx, hy + 0.6, 3.6, 0.2, 2.9); x.stroke(); }
    const g = x.createLinearGradient(0, ch * 0.88, 0, ch); g.addColorStop(0, 'rgba(70,60,48,0)'); g.addColorStop(1, 'rgba(70,60,48,0.28)'); x.fillStyle = g; x.fillRect(0, ch * 0.88, cw, ch * 0.12);
    const t = x.createLinearGradient(0, 0, 0, ch * 0.08); t.addColorStop(0, 'rgba(70,64,58,0.2)'); t.addColorStop(1, 'rgba(70,64,58,0)'); x.fillStyle = t; x.fillRect(0, 0, cw, ch * 0.08);
    return jpg(c, 0.9); };
  const wallTex = (hex, dark) => { const c = canvas(64, 256), x = c.getContext('2d'); x.fillStyle = hex; x.fillRect(0, 0, 64, 256);
    const t = x.createLinearGradient(0, 0, 0, 40); t.addColorStop(0, 'rgba(120,108,92,0.16)'); t.addColorStop(1, 'rgba(120,108,92,0)'); x.fillStyle = t; x.fillRect(0, 0, 64, 40);
    const b = x.createLinearGradient(0, 190, 0, 256); b.addColorStop(0, 'rgba(70,58,44,0)'); b.addColorStop(1, 'rgba(70,58,44,0.2)'); x.fillStyle = b; x.fillRect(0, 190, 64, 66);
    x.fillStyle = 'rgba(255,255,255,0.3)'; x.fillRect(0, 243, 64, 13); x.fillStyle = 'rgba(60,50,40,0.3)'; x.fillRect(0, 242, 64, 1.5); if (dark) noise(x, 64, 256, 500, 0.08); return jpg(c); };
  const floorTex = k => { const P = 64, w = RW * P, h = RD * P, c = canvas(w, h), x = c.getContext('2d');
    if (k === 0) {                                                  // oak boards: each its own tone, long grain, a few knots, bevelled edges, end joints staggered row by row
      x.fillStyle = '#cdb68f'; x.fillRect(0, 0, w, h); const pw = 0.16 * P; let row = 0;
      for (let q = 0; q < h; q += pw, row++) { let px = -((row * 0.37) % 1) * 1.8 * P;
        while (px < w) { const len = (1.1 + Math.random() * 1.3) * P, tone = Math.random(), r0 = 200 + tone * 26 - 10, g0 = 172 + tone * 24 - 10, b0 = 128 + tone * 20 - 10;
          x.fillStyle = `rgb(${r0 | 0},${g0 | 0},${b0 | 0})`; x.fillRect(px, q, len, pw);
          for (let g = 0; g < 7; g++) { x.fillStyle = `rgba(${Math.random() < 0.5 ? '120,86,50' : '255,244,220'},${(0.04 + Math.random() * 0.07).toFixed(3)})`; x.fillRect(px, q + Math.random() * pw, len, 0.6 + Math.random()); }
          if (Math.random() < 0.12) { const kx = px + Math.random() * len, ky = q + pw * 0.5, kg = x.createRadialGradient(kx, ky, 0, kx, ky, 3.2); kg.addColorStop(0, 'rgba(96,64,34,0.55)'); kg.addColorStop(1, 'rgba(96,64,34,0)'); x.fillStyle = kg; x.fillRect(kx - 4, ky - 4, 8, 8); }
          x.fillStyle = 'rgba(70,50,30,0.5)'; x.fillRect(px, q, 1, pw); px += len; }
        x.fillStyle = 'rgba(255,248,230,0.3)'; x.fillRect(0, q, w, 1); x.fillStyle = 'rgba(70,50,30,0.38)'; x.fillRect(0, q + pw - 1.2, w, 1.2); }
      const sh = x.createLinearGradient(0, 0, w, h); sh.addColorStop(0, 'rgba(255,255,255,0.05)'); sh.addColorStop(1, 'rgba(70,50,30,0.06)'); x.fillStyle = sh; x.fillRect(0, 0, w, h); }
    else if (k === 1) { x.fillStyle = '#a8a6a0'; x.fillRect(0, 0, w, h); noise(x, w, h, 6000, 0.12); x.strokeStyle = 'rgba(60,58,54,0.18)'; for (let q = 0; q <= w; q += 2 * P) { x.beginPath(); x.moveTo(q, 0); x.lineTo(q, h); x.stroke(); } }
    else { x.fillStyle = '#e1d6c2'; x.fillRect(0, 0, w, h); for (let q = 0; q < h; q += 0.3 * P) { x.fillStyle = `rgba(255,255,255,${0.04 + Math.random() * 0.06})`; x.fillRect(0, q, w, 0.3 * P); } }
    const e = 0.5 * P, edge = (ax, ay, bx, by, rx, ry, rw, rh) => { const g = x.createLinearGradient(ax, ay, bx, by); g.addColorStop(0, 'rgba(60,44,28,0.2)'); g.addColorStop(1, 'rgba(60,44,28,0)'); x.fillStyle = g; x.fillRect(rx, ry, rw, rh); };
    edge(0, 0, 0, e, 0, 0, w, e); edge(0, h, 0, h - e, 0, h - e, w, e); edge(0, 0, e, 0, 0, 0, e, h); edge(w, 0, w - e, 0, w - e, 0, e, h); return jpg(c, 0.9); };
  const sky = (() => { const c = canvas(256, 192), x = c.getContext('2d'); x.fillStyle = '#e9e7e1'; x.fillRect(0, 0, 256, 192); x.fillStyle = '#ffffff'; x.fillRect(40, 34, 176, 124);
    const g = x.createRadialGradient(128, 96, 0, 128, 96, 120); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(220,226,230,0.5)'); x.fillStyle = g; x.fillRect(40, 34, 176, 124); return jpg(c); })();

  const pierTex = concreteTex(tintHex('#bfbcb5', { tint: tIn.map(v => Math.pow(v, 0.5)) }));
  for (const [x, z] of PLAN.piers) { const t = pierTex; for (const [nx, nz] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) wall(`pier${x}-${z}-${nx}${nz}`, x + nx * 0.7, z + nz * 0.7, nx, nz, 1.4, { h: HH, tex: t }); }       // (eight piers carry the roof)
  const directory = [];
  const hotspots = [];
  // --- the houses: each as the street builds its room (a porch in the show's colour, three walls to hang on), turned to its own place
  for (const { d, r, k: i } of houseList) {
    const { o, c } = d, R = d.r, P = (a, b) => [c[0] + R[0] * a + o[0] * b, c[1] + R[1] * a + o[1] * b];
    const col = r.colour, M2 = MOUTH / 2, A0 = -RW / 2, A1 = RW / 2, rh = CL.RH[i % 8], dark = i % 8 === 1 || i % 8 === 4, fl = i % 3, ft = tints[d.j];
    const roomWall = wallTex(dark ? '#8d8b85' : ft, dark), ceil = i % 2 === 0 ? sky : plain('#f7f4ee');
    wall(`th${i}l`, ...P(-M2, VD / 2), R[0], R[1], VD, { h: DOOR_H, tex: plain(tintHex(shade(col, 0.8), envIn)) });
    wall(`th${i}r`, ...P(M2, VD / 2), -R[0], -R[1], VD, { h: DOOR_H, tex: plain(tintHex(shade(col, 0.92), envIn)) });
    orect(`th${i}-ceil`, 'ceiling', P, R, o, -M2, M2, 0, VD, DOOR_H, false, plain(shade(col, 0.96)));
    orect(`th${i}-floor`, 'wall', P, R, o, -M2, M2, 0, VD, 0.032, true, plain(shade(col, 0.88)));
    const rimTex = plain(tintHex(shade(col, 0.7), envIn));
    const rim = (nm, a0, a1, y0, y1) => { const q = P(a0, -0.012); surfaces.push({ name: `rim${i}${nm}`, kind: 'wall', texture: rimTex, origin: [q[0], y1, q[1]], u: [R[0], 0, R[1]], v: [0, -1, 0], size: [a1 - a0, y1 - y0], normal: [-o[0], 0, -o[1]], openings: [] }); };
    rim('l', -M2 - RIM, -M2, 0, DOOR_H + RIM); rim('r', M2, M2 + RIM, 0, DOOR_H + RIM); rim('t', -M2 - RIM, M2 + RIM, DOOR_H, DOOR_H + RIM);
    orect(`r${i}-floor`, 'wall', P, R, o, A0, A1, VD, VD + RD, 0.03, true, floorTex(fl));
    orect(`r${i}-ceil`, 'ceiling', P, R, o, A0, A1, VD, VD + RD, rh, false, ceil);
    wall(`r${i}-front`, ...P(0, VD), o[0], o[1], RW, { holes: [[A1 - M2, A1 + M2]], h: rh, tex: roomWall });
    const runs = [wall(`r${i}-left`, ...P(A0, VD + RD / 2), R[0], R[1], RD, { h: rh, tex: roomWall }), wall(`r${i}-back`, ...P(0, VD + RD), -o[0], -o[1], RW, { h: rh, tex: roomWall }), wall(`r${i}-right`, ...P(A1, VD + RD / 2), -R[0], -R[1], RD, { h: rh, tex: roomWall })];
    // its title, above the way in, on the face that looks at the plaza
    { const cv = canvas(1024, 256), x = cv.getContext('2d'); x.fillStyle = dark ? '#8d8b85' : ft; x.fillRect(0, 0, 1024, 256);
      x.fillStyle = dark ? 'rgba(250,248,244,0.95)' : 'rgba(40,36,30,0.88)'; x.textAlign = 'center'; x.textBaseline = 'middle'; let fs = 120, t = r.title; x.font = `500 ${fs}px Georgia, serif`; while (x.measureText(t).width > 940 && fs > 24) { fs -= 4; x.font = `500 ${fs}px Georgia, serif`; }
      x.fillText(t, 512, 108); x.fillStyle = col; x.fillRect(512 - 90, 190, 180, 8); const q = P(0, VD - 0.05), th = Math.min(0.8, rh - DOOR_H - 0.2), y1 = DOOR_H + 0.1 + th;
      surfaces.push({ name: `r${i}-title`, kind: 'wall', texture: jpg(cv, 0.92), origin: [q[0] - R[0] * 1.8, y1, q[1] - R[1] * 1.8], u: [R[0], 0, R[1]], v: [0, -1, 0], size: [3.6, th], normal: [-o[0], 0, -o[1]], openings: [] }); }
    directory.push({ title: r.title, kind: 'room', note: `${r.works.length} works`, at: P(0, -5.4), look: P(0, VD + 3.5) });
    const put = (work, wm, hm, run, ac, y) => hangAt(work, wm, hm, run.at(ac), run.n, y, r.labels ? { side: ac + wm / 2 + 0.55 > run.len ? -1 : 1,
      lines: [work.title, [work.artist && (work.artist.name || work.artist), work.year].filter(Boolean).join(', '), work.medium || '', work.note || ''].filter(Boolean) } : null);
    const manual = r.works.filter(w => w.s != null), autoW = r.works.filter(w => w.s == null).slice(0, 8);
    for (const work of manual) {
      const sz = await sizeOf({ ...work, image: thumbOf(work) }, src), [wm, hm] = streetFit(sz.w, sz.h).map(v => v / 100);
      const k = work.s < RD ? 0 : work.s < RD + RW ? 1 : 2, a0 = k === 0 ? 0 : k === 1 ? RD : RD + RW;
      put(work, wm, hm, runs[k], Math.min(Math.max(work.s - a0, wm / 2 + 0.1), runs[k].len - wm / 2 - 0.1), work.y != null ? work.y : 1.5);
    }
    for (const p of r.plinths || []) {
      const key = PLINTHS[p.size] ? p.size : 'm', ob = (r.objects || {})[p.work], q = P(Math.min(Math.max(p.x, 0.5), RW - 0.5) + A0, VD + Math.min(Math.max(p.z, 0.5), RD - 0.5));
      plinthsOut.push({ id: `${i}-${p.id}`, x: q[0], z: q[1], size: PLINTHS[key], key, work: p.work || null, obj: ob ? { id: ob.id, title: ob.title, image: ob.image, w: ob.w, h: ob.h } : null });
    }
    // its text: a plate on the OUTSIDE wall, beside the way in; tapped like a work, it opens to be read (spec.hotspots), in the language it was written in
    { const paras = (Array.isArray(r.text) ? r.text : String(r.text || '').split(/\n+/)).map(t => String(t).trim()).filter(Boolean);
      if (paras.length) {
        const he = /[֐-׿]/.test(paras.join('')), cv = canvas(560, 760), x = cv.getContext('2d');
        x.fillStyle = 'rgba(250,248,244,1)'; x.fillRect(0, 0, 560, 760); x.strokeStyle = col; x.lineWidth = 6; x.strokeRect(3, 3, 554, 754);
        x.fillStyle = 'rgba(40,36,30,0.92)'; x.textBaseline = 'top'; x.direction = he ? 'rtl' : 'ltr'; x.textAlign = he ? 'right' : 'left'; const X0 = he ? 520 : 40;
        let fs = 54; const ty = String(r.title); x.font = `italic 600 ${fs}px Georgia, serif`; while (x.measureText(ty).width > 480 && fs > 26) { fs -= 2; x.font = `italic 600 ${fs}px Georgia, serif`; }
        x.fillText(ty, X0, 36); let yy = 36 + fs + 18;
        if (r.curator || r.sub) { x.font = '400 22px Georgia, serif'; x.fillStyle = 'rgba(40,36,30,0.55)'; x.fillText(String(r.curator ? 'Curated by ' + r.curator : r.sub).slice(0, 40), X0, yy); yy += 40; }
        x.fillStyle = 'rgba(40,36,30,0.88)'; x.font = '400 29px Georgia, serif';
        const words = paras.join(' ').split(/\s+/), lines = []; let ln = '';
        for (const w of words) { const t = ln ? ln + ' ' + w : w; if (x.measureText(t).width > 485) { lines.push(ln); ln = w; } else ln = t; }
        if (ln) lines.push(ln); const room = Math.floor((680 - yy) / 38);
        lines.slice(0, room).forEach((l, k) => x.fillText(k === room - 1 && lines.length > room ? l + ' …' : l, X0, yy + k * 38));
        x.font = '600 22px system-ui, sans-serif'; x.fillStyle = col; x.textAlign = 'center'; x.direction = 'ltr'; x.fillText(he ? 'Tap to read · לחצו לקריאה' : 'Tap to read', 280, 702);
        const q = P(2.45, VD - 0.04), pw = 1.4, ph = pw * 760 / 560, o0 = [q[0], 0.95 + ph, q[1]], u = [R[0], 0, R[1]], nrm = [-o[0], 0, -o[1]];
        surfaces.push({ name: `r${i}-text`, kind: 'wall', texture: jpg(cv, 0.92), origin: o0, u, v: [0, -1, 0], size: [pw, ph], normal: nrm, openings: [] });
        hotspots.push({ id: r.slug, title: r.title, sub: r.curator ? 'Curated by ' + r.curator : (r.sub || ''), text: paras, lang: he ? 'he' : 'en', kind: 'text', origin: o0, u, v: [0, -1, 0], size: [pw, ph], normal: nrm, enter: r.enter || null });
      } }
    // a house that holds a copy of an artist's own exhibition (r.enter): an arched picture of its original space on the back wall, and a tap walks into that space
    if (r.enter && r.enter.image) {
      const img = await new Promise(res => { const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = src(r.enter.image); });
      const PW = 2.2, PH = 3.0, cw = 720, ch = Math.round(cw * PH / PW), cv = canvas(cw, ch), x = cv.getContext('2d'), pad = 26;
      x.fillStyle = dark ? '#8d8b85' : ft; x.fillRect(0, 0, cw, ch);
      const arch = (g, inset) => { const w = cw - 2 * inset, rr = w / 2; g.beginPath(); g.moveTo(inset, ch - inset); g.lineTo(inset, inset + rr); g.arc(cw / 2, inset + rr, rr, Math.PI, 0); g.lineTo(cw - inset, ch - inset); g.closePath(); };
      arch(x, pad - 10); x.fillStyle = col; x.fill();
      x.save(); arch(x, pad); x.clip();
      if (img) { const s = Math.max((cw - 2 * pad) / img.width, (ch - 2 * pad) / img.height); x.drawImage(img, cw / 2 - img.width * s / 2, ch / 2 - img.height * s / 2, img.width * s, img.height * s); } else { x.fillStyle = '#2b2824'; x.fillRect(0, 0, cw, ch); }
      const g = x.createLinearGradient(0, ch - 260, 0, ch); g.addColorStop(0, 'rgba(20,16,12,0)'); g.addColorStop(1, 'rgba(20,16,12,0.55)'); x.fillStyle = g; x.fillRect(0, ch - 260, cw, 260);
      x.restore();
      x.fillStyle = 'rgba(250,248,244,0.96)'; x.textAlign = 'center'; x.textBaseline = 'alphabetic'; x.font = '600 34px system-ui, sans-serif'; x.fillText(r.enter.label || 'Walk into the original space', cw / 2, ch - 70);
      const q = P(-PW / 2, VD + RD - 0.03), o0 = [q[0], 0.15 + PH, q[1]], u = [R[0], 0, R[1]], nrm = [-o[0], 0, -o[1]];
      surfaces.push({ name: `r${i}-portal`, kind: 'wall', texture: jpg(cv, 0.93), origin: o0, u, v: [0, -1, 0], size: [PW, PH], normal: nrm, openings: [] });
      hotspots.push({ id: r.slug + '-portal', title: r.title, kind: 'portal', direct: true, origin: o0, u, v: [0, -1, 0], size: [PW, PH], normal: nrm, enter: r.enter });
      runs.splice(1, 1);                                                                       // (the back wall is the portal's: works hang on the other two)
    }
    // the house's outer skin, in small details that read from the plaza: a recessed dark plinth (a shadow gap) at the foot of every outer face and a thin dark line under the top edge
    { const gap = (() => { const c2 = canvas(4, 16), g2 = c2.getContext('2d'), gr = g2.createLinearGradient(0, 0, 0, 16); gr.addColorStop(0, 'rgba(30,26,22,0.78)'); gr.addColorStop(1, 'rgba(30,26,22,0.55)'); g2.fillStyle = gr; g2.fillRect(0, 0, 4, 16); return c2.toDataURL('image/png'); })();
      const edge = (nm, p0, p1, nrm, y1, hgt) => { const L2 = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]), ux = (p1[0] - p0[0]) / L2, uz = (p1[1] - p0[1]) / L2;
        surfaces.push({ name: `r${i}-${nm}`, kind: 'wall', glass: true, batch: 'trim', texture: gap, origin: [p0[0] + nrm[0] * 0.012, y1, p0[1] + nrm[1] * 0.012], u: [ux, 0, uz], v: [0, -1, 0], size: [L2, hgt], normal: [nrm[0], 0, nrm[1]], openings: [] }); };
      const nL = [-R[0], -R[1]], nR = [R[0], R[1]], nB = [o[0], o[1]], nF = [-o[0], -o[1]];
      for (const [nm, y1, hgt] of [['gap', 0.16, 0.16], ['top', rh, 0.035]]) {
        edge(nm + 'L', P(A0, VD), P(A0, VD + RD), nL, y1, hgt); edge(nm + 'R', P(A1, VD), P(A1, VD + RD), nR, y1, hgt); edge(nm + 'B', P(A0, VD + RD), P(A1, VD + RD), nB, y1, hgt);
        edge(nm + 'F1', P(A0, VD), P(-M2, VD), nF, y1, hgt); edge(nm + 'F2', P(M2, VD), P(A1, VD), nF, y1, hgt); } }
    const sized = await Promise.all(autoW.map(async work => { const s = await sizeOf({ ...work, image: thumbOf(work) }, src), k = Math.min(1, 140 / Math.max(s.w, s.h)); return { work, w: s.w * k, h: s.h * k }; }));
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
      for (const s of items) { const wm = s.w / 100, hm = s.h / 100; put(s.work, wm, hm, run, a + wm / 2, Math.min(Math.max(1.5, hm / 2 + 0.4), rh - hm / 2 - 0.5)); a += wm + g; }
    });
  }

  // --- on the plaza: three freestanding walls at their own angles, the first work of each exhibition on their faces (the name beside it);
  //     and the exhibitions' objects (up to three) on plinths
  const stands = PLAN.stands.map(q => ({ ...q }));
  const faces = standWalls(stands), face = (() => { const c = canvas(256, 256), x = c.getContext('2d'); x.fillStyle = tintHex('#f6f4ef', { tint: tIn.map(v => Math.pow(v, 0.55)) }); x.fillRect(0, 0, 256, 256);
    const b = x.createLinearGradient(0, 200, 0, 256); b.addColorStop(0, 'rgba(70,58,44,0)'); b.addColorStop(1, 'rgba(70,58,44,0.16)'); x.fillStyle = b; x.fillRect(0, 200, 256, 56); return jpg(c); })();
  for (const f of faces) surfaces.push({ name: f.name, kind: 'wall', stand: f.stand, texture: face, origin: f.origin, u: f.u, v: [0, -1, 0], size: [f.len, f.h], normal: f.normal, openings: [] });
  for (const s of stands) { const a = s.rot * Math.PI / 180; solids.push([s.x - Math.cos(a) * s.len / 2, s.z - Math.sin(a) * s.len / 2, s.x + Math.cos(a) * s.len / 2, s.z + Math.sin(a) * s.len / 2]); }
  const mid = f => [f.origin[0] + f.u[0] * f.len / 2, f.origin[2] + f.u[2] * f.len / 2];
  const spots = [4, 0, 2, 5, 1, 3, 6, 7, 8, 9, 10, 11].filter(k => k < faces.length).map(k => ({ p: mid(faces[k]), n: [faces[k].normal[0], faces[k].normal[2]], max: 150, y: 1.5 }));
  const heralds = rooms.map(r => ({ r, w: r.works.find(w => w.image) })).filter(q => q.w).slice(0, spots.length);
  for (const [k, q] of heralds.entries()) {
    const sp = spots[k], s = await sizeOf({ ...q.w, image: thumbOf(q.w) }, src), f = Math.min(sp.max / Math.max(s.w, s.h), 1.6);
    hangAt(q.w, s.w * f / 100, s.h * f / 100, sp.p, sp.n, sp.y, { lines: [q.w.title, [q.w.artist && (q.w.artist.name || q.w.artist), q.w.year].filter(Boolean).join(', '), 'In: ' + q.r.title].filter(Boolean) });
  }
  const objs = rooms.flatMap(r => Object.values(r.objects || {}).slice(0, 1)).slice(0, PLAN.objects.length), at = PLAN.objects;
  objs.forEach((ob, k) => plinthsOut.push({ id: 'pl-p' + k, x: at[k][0], z: at[k][1], size: PLINTHS.m, key: 'm', work: ob.id, obj: { id: ob.id, title: ob.title, image: ob.image, w: ob.w, h: ob.h } }));

  // --- history sections (wings): data, not the Desk. A section is a chain of bays that widen and rise as you walk, each open to the next
  //     through a wide opening; paintings hang at their real size (the long side as the credits say, the shape from the picture), sculpture and
  //     maquettes stand on plinths (props.js). Its door is in the plaza's south edge, facing south. Data: data/museum/sections.json
  const props = [];
  // benches around the pool (the Square is a place to sit and look): oak on concrete, props.js; each is a wall to walk round
  if (PLAN.pool) { const [bx0, bz0, bx1, bz1] = PLAN.pool, mx = (bx0 + bx1) / 2, mz = (bz0 + bz1) / 2;
    for (const [x, z, rot] of [[mx, bz1 + 2.2, 0], [mx, bz0 - 2.2, 0], [bx0 - 2.2, mz, Math.PI / 2], [bx1 + 2.2, mz, Math.PI / 2]]) {
      props.push({ kind: 'bench', x, z, rot, h: 0.45, plinth: { w: 0.001, d: 0.001, h: 0 } });
      const lx = rot ? 0.3 : 1.15, lz = rot ? 1.15 : 0.3; solids.push([x - lx, z - lz, x + lx, z - lz], [x + lx, z - lz, x + lx, z + lz], [x + lx, z + lz, x - lx, z + lz], [x - lx, z + lz, x - lx, z - lz]); } }
  let endZ = 0;
  const placed = (opts.sections || []).map(sec => { const sp = PLAN.spaces.find(q => q.type === 'section' && q.section === sec.id); return sp ? { ...sec, door: { x: sp.door[0], z: sp.door[1], o: sp.dir } } : null; }).filter(Boolean);
  for (const sec of placed) {
    const dx = sec.door.x ?? CX, dz = sec.door.z ?? CZ + 12, o = sec.door.o || [0, 1], R = [-o[1], o[0]], P = (a, b) => [dx + R[0] * a + o[0] * b, dz + R[1] * a + o[1] * b];
    const cr = sec.credits || {}, bays = sec.bays, stoneTex = plain(tintHex('#c9bba3', envIn));
    directory.push({ title: sec.title, kind: 'history', note: 'the wing: ' + (sec.years || ''), at: P(0, -5.0), look: P(0, 8) });
    // what the walker's frame means for a wall facing +o (u runs to -a) or -o (u runs to +a): the position along the wall of the point a
    const along = (plus, aC, len, a) => plus ? (aC + len / 2) - a : a - (aC - len / 2);
    const finish = {
      stone: () => { const c = canvas(512, 512), x = c.getContext('2d'); x.fillStyle = '#cfc4ae'; x.fillRect(0, 0, 512, 512); noise(x, 512, 512, 5000, 0.1); x.strokeStyle = 'rgba(70,60,48,0.22)'; for (let k = 0; k <= 512; k += 128) { x.beginPath(); x.moveTo(k, 0); x.lineTo(k, 512); x.moveTo(0, k); x.lineTo(512, k); x.stroke(); } return jpg(c, 0.88); },
      oak: () => floorTex(0), marble: () => { const c = canvas(512, 512), x = c.getContext('2d'); for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { x.fillStyle = (i + j) % 2 ? '#e6e1d6' : '#c8c3b8'; x.fillRect(i * 128, j * 128, 128, 128); } noise(x, 512, 512, 4000, 0.06); return jpg(c, 0.88); },
      slate: () => { const c = canvas(512, 512), x = c.getContext('2d'); x.fillStyle = '#5a5a58'; x.fillRect(0, 0, 512, 512); noise(x, 512, 512, 7000, 0.12); x.strokeStyle = 'rgba(20,20,20,0.3)'; for (let k = 0; k <= 512; k += 170) { x.beginPath(); x.moveTo(k, 0); x.lineTo(k, 512); x.stroke(); } return jpg(c, 0.88); },
    };
    let b0 = 0, prev = null; const sects = [];
    for (const [i, bay] of bays.entries()) {
      const aL = bay.aL, aR = bay.aR, len = bay.len, h = bay.h, wtex = wallTex(bay.wall || '#efe9de', false), fTex = (finish[bay.floor] || finish.oak)(), b1 = b0 + len;
      orect(`${sec.id}${i}-floor`, 'wall', P, R, o, aL, aR, b0, b1, 0.004, true, fTex);
      orect(`${sec.id}${i}-ceil`, 'ceiling', P, R, o, aL, aR, b0, b1, h, false, bay.sky ? sky : plain('#f5f2ec'));
      const left = wall(`${sec.id}${i}-l`, ...P(aL, b0 + len / 2), R[0], R[1], len, { h, tex: wtex });
      const right = wall(`${sec.id}${i}-r`, ...P(aR, b0 + len / 2), -R[0], -R[1], len, { h, tex: wtex });
      for (const [nm, a, nx, nz] of [['l', aL - 0.03, -R[0], -R[1]], ['r', aR + 0.03, R[0], R[1]]]) wall(`${sec.id}${i}-sk${nm}`, ...P(a, b0 + len / 2), nx, nz, len, { h, tex: stoneTex, noSolid: true });
      // the dividing wall at the end of this bay (or the facade, for the first): spans both bays, one opening
      const next = bays[i + 1];
      if (i === 0) {                                                       // the facade, with the way in and the title over it
        const A0 = aL, A1 = aR, aC = (A0 + A1) / 2, w = A1 - A0, dw = bay.door || 3.4, oc = (aL + aR) / 2, s0 = along(true, aC, w, oc + dw / 2), s1 = along(true, aC, w, oc - dw / 2);
        wall(`${sec.id}-facade`, ...P(aC, 0), o[0], o[1], w, { h, tex: wtex, holes: [[s0, s1]] });
        wall(`${sec.id}-facade-sk`, ...P(aC, -0.03), -o[0], -o[1], w, { h, tex: stoneTex, noSolid: true, holes: [[along(false, aC, w, oc - dw / 2), along(false, aC, w, oc + dw / 2)]] });
        const cv = canvas(1024, 256), x = cv.getContext('2d'); x.fillStyle = tintHex('#c9bba3', { tint: [1, 1, 1] }); x.fillRect(0, 0, 1024, 256); x.fillStyle = 'rgba(40,36,30,0.9)'; x.textAlign = 'center'; x.textBaseline = 'middle';
        let fs = 120, t = sec.title; x.font = `500 ${fs}px Georgia, serif`; while (x.measureText(t).width > 940 && fs > 24) { fs -= 4; x.font = `500 ${fs}px Georgia, serif`; } x.fillText(t, 512, 100);
        x.font = '400 46px Georgia, serif'; x.fillStyle = 'rgba(40,36,30,0.62)'; x.fillText(sec.years || '', 512, 200);
        const q = P(oc, -0.06), th = Math.min(0.9, h - DOOR_H - 0.2), y1 = DOOR_H + 0.1 + th;
        surfaces.push({ name: `${sec.id}-title`, kind: 'wall', texture: jpg(cv, 0.92), origin: [q[0] - R[0] * 1.8, y1, q[1] - R[1] * 1.8], u: [R[0], 0, R[1]], v: [0, -1, 0], size: [3.6, th], normal: [-o[0], 0, -o[1]], openings: [] });
      }
      if (next) {
        const A0 = Math.min(aL, next.aL), A1 = Math.max(aR, next.aR), aC = (A0 + A1) / 2, w = A1 - A0, lo = Math.max(aL, next.aL), hi = Math.min(aR, next.aR), oc = (lo + hi) / 2, dw = Math.min(bay.open || 5, hi - lo - 1.6);
        const H = Math.max(h, next.h), wide = next.aR - next.aL > aR - aL ? next : bay;
        wall(`${sec.id}${i}-div`, ...P(aC, len + b0), o[0], o[1], w, { h: H, tex: wallTex(next.wall || '#efe9de', false), holes: [[along(true, aC, w, oc + dw / 2), along(true, aC, w, oc - dw / 2)]] });
        // outside faces of the step (where one bay is wider than the other) in the plain outdoor colour, looking back at the narrower bay
        for (const [x0, x1] of [[A0, lo], [hi, A1]]) if (x1 - x0 > 0.2) { const m = (x0 + x1) / 2; wall(`${sec.id}${i}-stp${x0 > A0 ? 'r' : 'l'}`, ...P(m, b0 + len - 0.03), -o[0], -o[1], x1 - x0, { h: H, tex: stoneTex, noSolid: true }); }
        void wide;
      } else {                                                             // the last bay: a closed far wall with what comes next
        const aC = (aL + aR) / 2, w = aR - aL;
        const fw = wall(`${sec.id}-far`, ...P(aC, b1), -o[0], -o[1], w, { h, tex: wtex });
        wall(`${sec.id}-far-sk`, ...P(aC, b1 + 0.03), o[0], o[1], w, { h, tex: stoneTex, noSolid: true });
        if (sec.after) { const cv = canvas(640, 260), x = cv.getContext('2d'); x.fillStyle = 'rgba(250,248,244,0.97)'; x.fillRect(0, 0, 640, 260); x.fillStyle = 'rgba(40,36,30,0.9)'; x.textBaseline = 'top'; x.font = 'italic 600 40px Georgia, serif'; x.fillText('Next: ' + sec.after, 30, 40);
          x.font = '400 24px Georgia, serif'; x.fillStyle = 'rgba(40,36,30,0.6)'; x.fillText('A new wing opens here.', 30, 110);
          const c = fw.at(w / 2), u = [fw.n[1], 0, -fw.n[0]]; surfaces.push({ name: `${sec.id}-next`, kind: 'wall', texture: jpg(cv, 0.92), origin: [c[0] + fw.n[0] * 0.012 - u[0] * 1.6, 2.7, c[1] + fw.n[1] * 0.012 - u[2] * 1.6], u, v: [0, -1, 0], size: [3.2, 1.3], normal: [fw.n[0], 0, fw.n[1]], openings: [] }); }
      }
      // the bay's wall text, beside the way in, on the left wall
      { const cv = canvas(640, 520), x = cv.getContext('2d'); x.fillStyle = 'rgba(250,248,244,0.97)'; x.fillRect(0, 0, 640, 520); x.fillStyle = 'rgba(40,36,30,0.92)'; x.textBaseline = 'top'; x.font = 'italic 600 34px Georgia, serif'; x.fillText(String(bay.title).slice(0, 32), 30, 28);
        x.font = '400 20px Georgia, serif'; x.fillStyle = 'rgba(40,36,30,0.55)'; x.fillText(bay.years || '', 30, 78); x.fillStyle = 'rgba(40,36,30,0.9)';
        (String(bay.text || '').match(/.{1,46}(\s|$)/g) || []).slice(0, 10).forEach((ln, k) => x.fillText(ln.trim(), 30, 122 + k * 32));
        const c = left.at(Math.min(1.9, len / 2)), n = left.n, u = [n[1], 0, -n[0]];
        surfaces.push({ name: `${sec.id}${i}-text`, kind: 'wall', texture: jpg(cv, 0.92), origin: [c[0] + n[0] * 0.012 - u[0] * 0.8, 2.5, c[1] + n[1] * 0.012 - u[2] * 0.8], u, v: [0, -1, 0], size: [1.6, 1.3], normal: [n[0], 0, n[1]], openings: [] }); }
      // paintings: along the left wall (from the way in) and the right wall, at their real size
      const runs = [{ w: left, from: 3.6 }, { w: right, from: 0.6 }], ws = (bay.works || []).map(s => cr[s]).filter(Boolean);
      const sized = [];
      for (const c of ws) {
        const a = (await sizeOf({ image: c.thumb }, src)).aspect || 1, long = Math.min(280, Math.max(...(c.size_cm || [70, 90]).map(Number).filter(v => v > 0)) || 90);
        sized.push({ c, w: (a >= 1 ? long : long * a) / 100, h: (a >= 1 ? long / a : long) / 100 });
      }
      const GAP = 0.55; let ri = 0; const bucket = runs.map(() => []);
      for (const s of sized) { while (ri < runs.length && bucket[ri].reduce((t, q) => t + q.w + GAP, 0) + s.w > runs[ri].w.len - runs[ri].from - 0.5) ri++; if (ri >= runs.length) break; bucket[ri].push(s); }
      bucket.forEach((items, k) => { let at = runs[k].from + 0.3; for (const s of items) {
        const wm = s.w, hm = s.h, c = s.c, y = Math.min(Math.max(1.55, hm / 2 + 0.55), h - hm / 2 - 0.45), run = runs[k].w, ac = at + wm / 2;
        hangAt({ slug: c.slug, id: c.slug, title: c.title, image: c.image, thumb: c.thumb }, wm, hm, run.at(ac), run.n, y, { side: 1, lines: [c.title, [c.artist, c.year].filter(Boolean).join(', '), c.medium || '', String(c.licence || '').split(' (')[0]].filter(Boolean) });
        at += wm + GAP; } });
      // sculpture and maquettes
      for (const p of bay.props || []) { const q = P(p.a, b0 + p.b), pl = p.plinth || { w: 0.7, d: 0.7, h: 1.0 };
        props.push({ ...p, x: q[0], z: q[1], rot: p.rot || 0, plinth: pl }); const m = Math.max(pl.w, pl.d) / 2 + 0.35; solids.push([q[0] - m, q[1] - m, q[0] + m, q[1] - m], [q[0] + m, q[1] - m, q[0] + m, q[1] + m], [q[0] + m, q[1] + m, q[0] - m, q[1] + m], [q[0] - m, q[1] + m, q[0] - m, q[1] - m]); }
      directory.push({ title: bay.title, kind: 'history', note: bay.years, at: P((bay.aL + bay.aR) / 2, b0 + 2.4), look: P((bay.aL + bay.aR) / 2, b1) });
      sects.push({ i, b0, b1 }); prev = bay; b0 = b1;
    }
    endZ = Math.max(endZ, dz + b0 + 4); void prev; void sects;
  }
  directory.unshift({ title: 'The Square', kind: 'place', note: 'the heart of the museum', at: PLAN.start.pos, look: PLAN.start.look });
  const spec = {
    version: 2, title: 'The Museum', source: 'Open Studio museum', virtual: true, ordered: true, far: 190, noSpots: true,
    outdoors: { hour: env.hour, centre: [CX, CZ], lamps: [], treeline: 'data/rooms/outside/treeline.webp', treeRadius: 120, treeHeight: 46 },
    baked: { kind: 'white-cube', plates: [] }, plinthRoom: { h: 4 },
    room: { x0: 0, x1: HX, z0: 0, z1: HZ, height: HH }, surfaces, works, views: [], floorReflect: [0, 0], mirrorSurface: { name: 'hall-floor', reflect: [0.16, 0.55], y: 0.01 }, solids, directory, hotspots,
    stands: stands.map(s => ({ ...s, kind: 'stand', t: STAND.t })), ...(props.length ? { props } : {}),
    start: { pos: PLAN.start.pos, look: PLAN.start.look },
    ...(plinthsOut.length ? { plinths: plinthsOut } : {}),
  };
  if (opts.focus != null && places[opts.focus]) { const d = places[opts.focus]; spec.start = { pos: [d.c[0] - d.o[0] * 3.2, d.c[1] - d.o[1] * 3.2], look: [d.c[0] + d.o[0] * 3, d.c[1] + d.o[1] * 3] }; }
  return { spec, size: [HX, HZ] };
}
