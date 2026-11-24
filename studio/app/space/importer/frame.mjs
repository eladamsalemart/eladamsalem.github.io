// The exhibition importer's geometry: where a photographed room's way in is, and how its own coordinates sit in the museum.
// The same rules as buildOriginal() in synth.js (the gate checks that they still agree, by comparing a built surface).
// Pure: runs in node and in the browser.

export const T = 0.22;              // the pavilion's plaster skin: the outer wall's thickness
export const walkable = op => !(op.sill > 0.05) && op.height >= 2.1 && op.to - op.from >= 0.9;

// every real opening of the room: { wall, k, from, to, height, arch, rise, walkable, c: local centre [x, z], n: inward normal [x, z] }
export function openingsOf(sp) {
  const out = [];
  for (const s of sp.surfaces || []) if (s.kind === 'wall') (s.openings || []).forEach((op, k) => {
    const m = (op.from + op.to) / 2;
    out.push({ wall: s.name, k, from: op.from, to: op.to, w: op.to - op.from, height: op.height, sill: op.sill || 0, arch: !!op.arch, rise: op.rise,
      walkable: walkable(op), c: [s.origin[0] + s.u[0] * m, s.origin[2] + s.u[2] * m], n: [s.normal[0], s.normal[2]] });
  });
  return out;
}

// the door wall and its ways, chosen as buildOriginal chooses them: arches first, then the widest walkable opening
export function doorOf(sp) {
  const rm = sp.room, ops = openingsOf(sp).filter(o => o.walkable).sort((a, b) => (b.arch ? 1 : 0) - (a.arch ? 1 : 0) || b.w - a.w);
  if (ops.length) { const d = ops[0]; return { real: true, wall: d.wall, n: d.n, dc: d.c, ways: openingsOf(sp).filter(o => o.walkable && o.wall === d.wall) }; }
  // no real way in: buildOriginal would cut a 1.9 m doorway in the middle of the z0 wall. The gate fails this (an invented opening).
  return { real: false, wall: 'wall-z0', n: [0, 1], dc: [(rm.x0 + rm.x1) / 2, rm.z0], ways: [{ c: [(rm.x0 + rm.x1) / 2, rm.z0], w: 1.9, height: 2.7, arch: false, invented: true }] };
}

// a house of the plan ({ door: [x, z], dir }) holding this room: local (x, z) -> museum (X, Z), and local vectors -> museum vectors
export function frameOf(sp, space) {
  const a = space.dir * Math.PI / 180, o = [Math.cos(a), Math.sin(a)], R = [-o[1], o[0]], c = space.door, D = doorOf(sp), n = D.n, dc = D.dc, tt = [-n[1], n[0]];
  const Dp = [c[0] + o[0] * 0.25, c[1] + o[1] * 0.25];
  const W = (x, z) => { const px = x - dc[0], pz = z - dc[1], aa = px * n[0] + pz * n[1], b = px * tt[0] + pz * tt[1]; return [Dp[0] + o[0] * aa + R[0] * b, Dp[1] + o[1] * aa + R[1] * b]; };
  const V = v => { const aa = v[0] * n[0] + v[2] * n[1], b = v[0] * tt[0] + v[2] * tt[1]; return [o[0] * aa + R[0] * b, v[1], o[1] * aa + R[1] * b]; };
  const P3 = p => { const q = W(p[0], p[2]); return [q[0], p[1], q[1]]; };
  const rm = sp.room, e = T;
  // the footprint: the room's rectangle with its skin, as four museum corners
  const footAt = (m = 0) => [[rm.x0 - e - m, rm.z0 - e - m], [rm.x1 + e + m, rm.z0 - e - m], [rm.x1 + e + m, rm.z1 + e + m], [rm.x0 - e - m, rm.z1 + e + m]].map(([x, z]) => W(x, z)), foot = footAt(0);
  // each way's two points: 1 m inside the room and 1.5 m outside the skin (the line a visitor walks through it)
  const ways = D.ways.map(g => ({ ...g, inside: W(g.c[0] + n[0] * 1.0, g.c[1] + n[1] * 1.0), outside: W(g.c[0] - n[0] * (T + 1.5), g.c[1] - n[1] * (T + 1.5)), at: W(g.c[0], g.c[1]) }));
  return { o, R, W, V, P3, foot, footAt, ways, door: D };
}

export const inPoly = (p, poly) => { let ins = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, zi] = poly[i], [xj, zj] = poly[j];
  if ((zi > p[1]) !== (zj > p[1]) && p[0] < (xj - xi) * (p[1] - zi) / (zj - zi) + xi) ins = !ins; } return ins; };
// does segment ab cross segment cd
export const cross = (a, b, c, d) => { const s = (p, q, r) => (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]);
  const d1 = s(c, d, a), d2 = s(c, d, b), d3 = s(a, b, c), d4 = s(a, b, d); return ((d1 > 0) !== (d2 > 0)) && ((d3 > 0) !== (d4 > 0)); };
