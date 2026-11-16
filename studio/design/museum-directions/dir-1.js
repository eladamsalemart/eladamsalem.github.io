// 1. The Growing Spiral (ספירלת הזמן): one gallery, a square spiral that rises 3.5% (about 2 degrees: nobody feels it) round a top-lit central hall. The chronology IS the walk; a new
// exhibition is added at the open end of the spiral, so the museum grows like a shell (Le Corbusier's Museum of Unlimited Growth, 1931; the Seattle Central Library's book spiral).
// Arms are barrel-less galleries with a light slit at the crown (Kimbell); the court side of each arm has windows onto the hall.
export function build(E) {
  const W = 6.5, SLOPE = 0.035, H = 4.6, CX = 40, CZ = 40;
  const dirs = [[1, 0], [0, -1], [-1, 0], [0, 1]];
  let p = [28.75, 51.25], y = 0; const arms = [], lens = [22.5, 22.5, 29.5, 29.5, 36.5, 36.5, 43.5, 43.5];
  lens.forEach((L, i) => { const d = dirs[i % 4], q = [p[0] + d[0] * L, p[1] + d[1] * L], y1 = y + SLOPE * L; arms.push({ i, a: p, b: q, y0: y, y1, d, L }); p = q; y = y1; });
  E.ground(-30, -30, 110, 110, 'grass'); E.slab(E.rectPts(18, 62, 40, 80), 0.02, 0.04, 'gravel', { noCast: true, noEdge: true });
  // the central hall: a square court, floor at 0, with its own roof light and the content of a hall
  E.floorRect(29, 29, 51, 51, 0, 'terrazzo');
  const side = (a, n) => [-a.d[1] * n, a.d[0] * n];                     // the normal to the left (n = 1) or the right (n = -1) of an arm's direction
  for (const A of arms) {
    const nL = side(A, 1), h2 = W / 2, ext = h2;                         // (arms overlap by half a width at each corner, so the corners are filled)
    const a = [A.a[0] - A.d[0] * ext, A.a[1] - A.d[1] * ext], b = [A.b[0] + A.d[0] * ext, A.b[1] + A.d[1] * ext], ya = A.y0 - SLOPE * ext, yb = A.y1 + SLOPE * ext;
    E.ramp(a, b, ya, yb, W, 'oak', { t: 0.35, noEdge: true });
    // roof: two sloped panels with a 1 m slit between them (and glass in the slit), at the wall height
    for (const o of [W / 4 + 0.25, -(W / 4 + 0.25)]) E.ramp(a, b, ya + H, yb + H, W / 2 - 0.5, 'white', { t: 0.3, off: o, roof: true });
    E.ramp(a, b, ya + H + 0.1, yb + H + 0.1, 1.0, 'glass', { t: 0.03, noCast: true, noEdge: true, roof: true });
    // walls: inner (toward the court / the previous turn) and outer
    const innerSide = A.i % 4 === 0 || A.i % 4 === 1 ? -1 : -1;           // (the spiral turns left, so the hall is on the left of each arm)
    for (const sgn of [1, -1]) {
      const n = side(A, sgn), pa = [a[0] + n[0] * h2, a[1] + n[1] * h2], pb = [b[0] + n[0] * h2, b[1] + n[1] * h2];
      const winGaps = sgn === 1 && A.i < 4 ? [[5, A.L / 2 - 3, 1.0, 3.6], [A.L / 2 + 3, A.L + W - 5, 1.0, 3.6]] : [];
      E.slopedWall(pa, pb, ya, yb, H, 0.3, 'white', { gaps: winGaps });
    }
    void innerSide; void nL;
  }
  // the first arms' court-side windows already look into the hall; the last arm's end is open: the museum is still growing
  const last = arms[arms.length - 1], endY = last.y1;
  { const e = last.b, d = last.d; const g1 = [e[0] + d[0] * 7, e[1] + d[1] * 7]; E.ghost([[e[0] - W / 2, e[1] - 0.5], [e[0] + W / 2, e[1] - 0.5], [g1[0] + W / 2, g1[1]], [g1[0] - W / 2, g1[1]]]);
    // a half-built bay: floor and a steel frame, and a crane
    E.ramp([e[0], e[1]], [e[0] + 0.0, e[1] + 6], endY, endY + SLOPE * 6, W, 'concrete', { t: 0.35, noEdge: true });
    for (const dx of [-W / 2 + 0.1, W / 2 - 0.1]) for (const dz of [0.5, 3.0, 5.5]) E.box(e[0] + dx, endY + 2.2, e[1] + dz, 0.16, 4.4, 0.16, 'steel');
    E.box(e[0], endY + 4.5, e[1] + 3, W, 0.16, 0.16, 'steel'); E.box(e[0] + 14, endY + 7, e[1] + 1, 0.5, 14, 0.5, 'steel'); E.box(e[0] + 7, endY + 14, e[1] + 1, 16, 0.4, 0.4, 'steel'); E.box(e[0] + 2, endY + 12, e[1] + 1, 0.4, 2, 0.4, 'ink'); }
  // the hall: roof light over a roof, a high wall with the clerestory, coulisses, plinths, a statue
  E.roof(28.6, 28.6, 51.4, 51.4, 8.8, { t: 0.4, lights: [[32, 32, 48, 48]] });
  E.wall([29, 29], [51, 29], { h: 8.8, t: 0.3, gaps: [[5, 17, 4.6]] }); E.wall([29, 51], [51, 51], { h: 8.8, t: 0.3, gaps: [[2, 8, 3.4]] }); E.wall([29, 29], [29, 51], { h: 8.8, t: 0.3, gaps: [[6, 16, 4.0]] }); E.wall([51, 29], [51, 51], { h: 8.8, t: 0.3, gaps: [[4, 10, 4.0]] });
  const c1 = E.wall([33, 34], [38.4, 36.4], { h: 3.6, t: 0.24 }), c2 = E.wall([42, 44.6], [47, 42], { h: 3.6, t: 0.24 });
  E.art(c1, 2.6, 1, 2.4, 1.7, 'the-starry-night-m'); E.art(c1, 2.6, -1, 1.5, 1.9, 'girl-with-a-pearl-earring', 1.6); E.art(c2, 2.6, 1, 2.2, 1.6, 'luncheon-on-the-grass');
  E.statue(40, 40, { h: 1.1, s: 2.3 }); E.plinth(34, 46, { obj: 1 }); E.plinth(46, 35, { h: 0.9, obj: 2 }); E.bench(43, 48, 0.0); E.person(36, 42); E.person(45, 38);
  // pictures on the arms' outer walls (at the height the slope gives there) and people in the arms
  const picture = ['impression-sunrise', 'woman-with-a-parasol-madame-monet-and-her-son', 'composition-vii', 'olympia', 'la-grenouillere', 'cafe-terrace-at-night', 'dance', 'regatta-at-sainte-adresse', 'blue-nude', 'irises'];
  let k = 0; for (const A of arms) for (const s of [0.28, 0.5, 0.72]) {
    const n = side(A, -1), at = [A.a[0] + A.d[0] * A.L * s + n[0] * W / 2, A.a[1] + A.d[1] * A.L * s + n[1] * W / 2], yy = A.y0 + (A.y1 - A.y0) * s, nm = picture[k++ % picture.length];
    const a1 = [at[0] - A.d[0] * 1.2, at[1] - A.d[1] * 1.2], b1 = [at[0] + A.d[0] * 1.2, at[1] + A.d[1] * 1.2];
    E.art({ a: a1, b: b1, t: 0.3, y0: yy, h: 4 }, 1.2, E.normal(a1, b1, 1)[0] * (-n[0]) + E.normal(a1, b1, 1)[1] * (-n[1]) > 0 ? 1 : -1, 2.0, 1.4, nm, 1.55);
  }
  for (const [i, s] of [[0, 0.3], [1, 0.6], [2, 0.5], [3, 0.4], [4, 0.7], [5, 0.3], [6, 0.5]]) { const A = arms[i], q = [A.a[0] + A.d[0] * A.L * s, A.a[1] + A.d[1] * A.L * s]; E.person(q[0], q[1], A.y0 + (A.y1 - A.y0) * s); }
  for (const [i, s] of [[0, 0.15], [2, 0.7], [4, 0.45], [6, 0.8]]) { const A = arms[i], n = side(A, 1), q = [A.a[0] + A.d[0] * A.L * s + n[0] * 1.5, A.a[1] + A.d[1] * A.L * s + n[1] * 1.5]; E.plinth(q[0], q[1], { y0: A.y0 + (A.y1 - A.y0) * s, obj: i % 4, h: 1.0 }); }
  for (const [x, z, s] of [[8, 14, 1.2], [8, 66, 1], [72, 16, 1.2], [74, 64, 1], [40, 8, 1.1], [20, 80, 1.2]]) E.tree(x, z, s);
  const top = arms.map(a => Math.max(a.y0, a.y1)), maxY = Math.max(...top);
  const eyeAt = (i, s, up = 1.6) => { const A = arms[i]; return [A.a[0] + A.d[0] * A.L * s, A.y0 + (A.y1 - A.y0) * s + up, A.a[1] + A.d[1] * A.L * s]; };
  const e1 = eyeAt(4, 0.15), e1t = eyeAt(4, 0.9), e2 = eyeAt(1, 0.55), e3 = eyeAt(7, 0.6);
  return { bounds: [0, 4, 84, 84], centre: [40, 44], sun: [-14, 56, 22], shadowSpan: 70, ambient: 2.3,
    labels: [[40, 40, 'האולם המרכזי'], [40, 56, 'כניסה: תחילת הספירלה'], [40, 70, 'ספירלה קדימה בזמן'], [70, 66, 'צומח כאן', 1], [16, 12, 'הקצה הפתוח', 1]],
    section: { at: 40, frame: [4, -1, 78, 17], labels: [[40, 11.5, 'האולם המרכזי'], [10, 8.6, 'סיבוב 2'], [30, 3.6, 'סיבוב 1'], [66, 8, 'סיבוב 2']] },
    views: {
      air: { eye: [-20, 44, 100], look: [38, 4, 40], fov: 38 },
      e1: { eye: e1, look: [e1t[0], e1t[1] + 0.4, e1t[2]], fov: 66 },
      e2: { eye: [35, 1.6, 47], look: [45, 3.0, 33], fov: 70 },
      e3: { eye: e3, look: [e3[0], e3[1] + 0.2, e3[2] + 30], fov: 64 } } };
}
