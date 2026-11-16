// E. The Ramp (Time Spiral): one round building round a glazed void; a single ramp (3 turns, 12 m up, 1:19) is the whole walk, and height is time: the ground is the oldest
// section, the top the newest (Guggenheim, Maxxi). Exhibitions are lengths of the ramp's outer wall; plinths stand along the inner parapet; the void is the central hall.
export function build(E) {
  const C = [40, 40], RI = 9, RO = 19, TURNS = 3, RISE = 12, TH0 = Math.PI / 2, NSEG = 72, WH = 16.6, DOME = 9.4;
  const pt = (r, th) => [C[0] + r * Math.cos(th), C[1] + r * Math.sin(th)];
  const th = t => TH0 + t * 2 * Math.PI * TURNS;
  E.ground(-30, -30, 110, 110, 'grass'); E.slab(E.rectPts(34, 58, 46, 74), 0.02, 0.04, 'gravel', { noCast: true, noEdge: true });
  // ground: the central court (terrazzo) and the first turn's floor
  E.floor(E.circle(C[0], C[1], RI + 0.1, 48), 0, 'terrazzo'); E.slab(E.circle(C[0], C[1], RO, 72), 0.04, 0.04, 'oak', { holes: [E.circle(C[0], C[1], RI, 48)], noCast: true, noEdge: true });
  // the ramp: 72 slabs a turn, rising evenly, with an inner parapet
  const N = NSEG * TURNS, w = RO - RI, rc = (RO + RI) / 2;
  for (let i = 0; i < N; i++) {
    const t0 = i / N, t1 = (i + 1) / N, a = pt(rc, th(t0)), b = pt(rc, th(t1)), y0 = RISE * t0, y1 = RISE * t1;
    E.ramp(a, b, y0, y1, w, 'oak', { t: 0.4, noEdge: true });
    const pa = pt(RI + 0.15, th(t0)), pb = pt(RI + 0.15, th(t1)); E.seg(pa, pb, (y0 + y1) / 2, 1.1, 0.2, 'white', { noEdge: true });
  }
  // the outer wall (a polygon of 72 sides) with the way in at the start of the ramp; windows in the top turn
  const wallPts = Array.from({ length: NSEG + 1 }, (_, i) => pt(RO + 0.2, TH0 + i / NSEG * 2 * Math.PI));
  for (let i = 0; i < NSEG; i++) { if (i === 0) continue; E.seg(wallPts[i], wallPts[i + 1], 0, WH, 0.4, 'white', { noEdge: true }); }
  E.seg(wallPts[0], wallPts[1], 3.4, WH - 3.4, 0.4, 'white', { noEdge: true });
  // the roof ring, with a ring of skylights, and the glass dome over the void
  { const lights = []; for (let k = 0; k < 8; k++) { const th0 = k * Math.PI / 4 + 0.15, c = pt(14.2, th0 + 0.3), c2 = pt(14.2, th0 + 0.3 + 0.0); void c2; lights.push(E.circle(c[0], c[1], 2.3, 18)); }
    E.slab(E.circle(C[0], C[1], RO + 0.7, 72), WH + 0.5, 0.5, 'white', { holes: [E.circle(C[0], C[1], DOME, 48), ...lights], roof: true }); for (const l of lights) E.slab(l, WH + 0.35, 0.03, 'glass', { roof: true }); }
  E.dome(C[0], WH + 0.3, C[1], DOME);
  // pictures on the outer wall, at the height the ramp has there: every 12 degrees on each turn
  const art = ['impression-sunrise', 'the-starry-night-m', 'woman-with-a-parasol-madame-monet-and-her-son', 'luncheon-on-the-grass', 'composition-vii', 'olympia', 'cafe-terrace-at-night', 'irises', 'blue-nude', 'la-grenouillere', 'dance', 'regatta-at-sainte-adresse', 'girl-with-a-pearl-earring', 'garden-at-sainte-adresse'];
  const size = { 'the-starry-night-m': [1.6, 1.3], 'woman-with-a-parasol-madame-monet-and-her-son': [1.3, 1.65], 'girl-with-a-pearl-earring': [1.2, 1.5], 'blue-nude': [1.4, 1.8], 'olympia': [1.9, 1.3], 'dance': [2.3, 1.55], 'irises': [1.9, 1.5], 'impression-sunrise': [2.1, 1.25] };
  let k = 0;
  for (let turn = 0; turn < TURNS; turn++) for (let j = 0; j < 9; j++) {
    const tt = (turn + (0.07 + j / 9)) / TURNS; if (tt > 0.985) continue; const ang = th(tt), y = RISE * tt, a = pt(RO, ang - 0.06), b = pt(RO, ang + 0.06), nm = art[k++ % art.length], [pw, ph] = size[nm] || [1.9, 1.4];
    const mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], n1 = E.normal(a, b, 1), side = (C[0] - mid[0]) * n1[0] + (C[1] - mid[1]) * n1[1] > 0 ? 1 : -1;
    E.art({ a, b, t: 0.4, y0: y, h: 4 }, E.len(a, b) / 2, side, pw, ph, nm, 1.6);
  }
  // sculpture along the inner parapet and in the court, people for scale
  for (const [tt, o] of [[0.1, 1], [0.24, 2], [0.4, 0], [0.55, 4], [0.72, 1], [0.86, 3]]) { const p = pt(RI + 1.7, th(tt)); E.plinth(p[0], p[1], { y0: RISE * tt, obj: o, h: 1.0 }); }
  E.statue(C[0], C[1], { h: 1.2, s: 2.4 }); E.statue(C[0] + 4, C[1] + 3.5, { h: 1.0, s: 1.9 }); E.bench(C[0] - 4, C[1] + 5);
  for (const [tt, r] of [[0.05, 14], [0.2, 15], [0.31, 13], [0.52, 14], [0.66, 15], [0.8, 13], [0.93, 14]]) { const p = pt(r, th(tt)); E.person(p[0], p[1], RISE * tt); }
  E.person(C[0] + 6, C[1] - 2); E.person(C[0] - 6, C[1] - 4);
  for (const [x, z, s] of [[8, 14, 1.2], [8, 66, 1], [72, 16, 1.2], [74, 64, 1], [40, 8, 1.1], [40, 78, 1.2], [20, 80, 1]]) E.tree(x, z, s);
  E.ghost(E.rectPts(62, 28, 84, 52));
  const hp = t => { const p = pt(14, th(t)); return [p[0], RISE * t + 1.6, p[1]]; };
  const e2 = hp(0.35), e2t = pt(14, th(0.35) + 0.45), e3 = hp(0.92);
  return { bounds: [8, 8, 100, 80], centre: [40, 40], sun: [-14, 56, 22], shadowSpan: 56, ambient: 2.3,
    labels: [[40, 40, 'חלל מרכזי (כיפה)'], [40, 66, 'כניסה'], [40, 12, 'הרמפה עולה 3 סיבובים'], [22, 40, 'עתיק'], [58, 40, 'חדש'], [75, 40, 'מבנה עתידי', 1]],
    section: { at: 40, frame: [16, -1, 64, 24], labels: [[40, 22, 'כיפת זכוכית'], [22, 1.6, 'סיבוב 1'], [22, 5.4, 'סיבוב 2'], [22, 9.4, 'סיבוב 3'], [40, 3, 'חלל מרכזי']] },
    views: {
      air: { eye: [-14, 46, 98], look: [40, 6, 40], fov: 38 },
      e1: { eye: [40, 1.6, 44], look: [38, 15, 34], fov: 72 },
      e2: { eye: e2, look: [e2t[0], e2[1] - 0.1, e2t[1]], fov: 66 },
      e3: { eye: e3, look: [40, 3.5, 44], fov: 74 } } };
}
