// A. The Palazzo: rooms in a loop (an enfilade: doors on one axis) round a glazed courtyard hall (Alte Pinakothek, Kunsthistorisches, Kunstmuseum Basel).
// The courtyard is the central hall (coulisses, plinths); the ring is the walk through time. Rooms are lit from above; arcades look from the rooms into the hall.
export function build(E) {
  const X1 = 64, Z1 = 46, AX0 = 16, AX1 = 48, AZ0 = 14, AZ1 = 32, RH = 6.2, AH = 9.6, W = 12.8;
  E.ground(-30, -30, X1 + 30, Z1 + 30, 'grass'); E.slab(E.rectPts(AX0 + 4, Z1 - 0.1, AX1 - 4, Z1 + 14), 0.02, 0.04, 'gravel', { noCast: true, noEdge: true });
  // floors
  E.floorRect(0, 0, X1, Z1, 0, 'oak'); E.floorRect(AX0, AZ0, AX1, AZ1, 0, 'terrazzo'); E.floorRect(2 * W, Z1 - 14, 3 * W, Z1, 0, 'terrazzo'); E.floorRect(3 * W, 0, 4 * W, 14, 0, 'slate');
  // outer walls: tall windows in alternate rooms, the entrance in the south
  const win = (a, b, c) => [[a, b, 4.2, 0.9], [c - 0, c, 0, 0]].slice(0, 1);
  const nGaps = [0, 2, 4].map(i => [i * W + W / 2 - 1.6, i * W + W / 2 + 1.6, 4.3, 1.0]);
  E.wall([0, 0], [X1, 0], { h: RH, t: 0.4, gaps: nGaps, windowGlass: true });
  E.wall([0, Z1], [2 * W, Z1], { h: RH, t: 0.4, gaps: [[W / 2 - 1.6, W / 2 + 1.6, 4.3, 1.0]], windowGlass: true });
  E.wall([2 * W, Z1], [3 * W, Z1], { h: RH, t: 0.4, gaps: [[W / 2 - 2.4, W / 2 + 2.4, 3.8]] });
  E.wall([3 * W, Z1], [X1, Z1], { h: RH, t: 0.4, gaps: [[W / 2 - 1.6, W / 2 + 1.6, 4.3, 1.0]], windowGlass: true });
  E.wall([0, 0], [0, Z1], { h: RH, t: 0.4, gaps: [[AZ0 + 4.5 - 1.6, AZ0 + 4.5 + 1.6, 4.3, 1.0], [AZ0 + 13.5 - 1.6, AZ0 + 13.5 + 1.6, 4.3, 1.0]], windowGlass: true });
  E.wall([X1, 0], [X1, Z1], { h: RH, t: 0.4, gaps: [[AZ0 + 4.5 - 1.6, AZ0 + 4.5 + 1.6, 4.3, 1.0], [AZ0 + 13.5 - 1.6, AZ0 + 13.5 + 1.6, 4.3, 1.0]], windowGlass: true });
  // the courtyard hall: walls with arcade openings into the rooms around, a clerestory above, a high roof with long skylights
  const arc = [[6, 10], [14, 18], [22, 26]].map(([a, b]) => [a + 0, b + 0, 4.6]);
  E.wall([AX0, AZ0], [AX1, AZ0], { h: RH, t: 0.4, gaps: arc.map(([a, b, t]) => [a + 2, b + 2, t]).concat([[27.5, 31.5, 4.6]]).map(g => g).slice(0, 4), });
  E.wall([AX0, AZ1], [AX1, AZ1], { h: RH, t: 0.4, gaps: [[2, 6, 4.6], [10, 14, 4.6], [14.6, 17.4, 0], [18, 22, 4.6], [26, 30, 4.6]].filter(g => g[2] > 0) });
  E.wall([AX0, AZ0], [AX0, AZ1], { h: RH, t: 0.4, gaps: [[7, 11, 4.2]] }); E.wall([AX1, AZ0], [AX1, AZ1], { h: RH, t: 0.4, gaps: [[7, 11, 4.2]] });
  for (const [a, b] of [[[AX0, AZ0], [AX1, AZ0]], [[AX0, AZ1], [AX1, AZ1]], [[AX0, AZ0], [AX0, AZ1]], [[AX1, AZ0], [AX1, AZ1]]]) E.wall(a, b, { h: AH - RH, y0: RH, t: 0.3, mat: 'glass' });
  E.roof(AX0 - 0.4, AZ0 - 0.4, AX1 + 0.4, AZ1 + 0.4, AH, { t: 0.4, lights: [[AX0 + 3, AZ0 + 2.5, AX0 + 10, AZ1 - 2.5], [AX0 + 12, AZ0 + 2.5, AX0 + 20, AZ1 - 2.5], [AX0 + 22, AZ0 + 2.5, AX1 - 3, AZ1 - 2.5]] });
  // the ring: roof with a skylight over each room (the courtyard is cut out)
  const lights = []; for (let i = 0; i < 5; i++) { lights.push([i * W + 3.5, 3.5, i * W + W - 3.5, 10.5]); lights.push([i * W + 3.5, Z1 - 10.5, i * W + W - 3.5, Z1 - 3.5]); }
  lights.push([3.5, AZ0 + 2, 12.5, AZ0 + 7], [3.5, AZ0 + 11, 12.5, AZ0 + 16], [X1 - 12.5, AZ0 + 2, X1 - 3.5, AZ0 + 7], [X1 - 12.5, AZ0 + 11, X1 - 3.5, AZ0 + 16]);
  { const hole = E.rectPts(AX0, AZ0, AX1, AZ1), ring = [[0, 0], [X1, 0], [X1, Z1], [0, Z1]]; E.slab(ring, RH + 0.4, 0.4, 'white', { holes: [hole, ...lights.map(l => E.rectPts(...l))], roof: true }); for (const l of lights) E.slab(E.rectPts(...l), RH + 0.3, 0.03, 'glass', { roof: true }); }
  // partitions: the enfilade axis (z = 7 in the north row, z = 39 in the south row, x = 56 / x = 8 in the side columns)
  const doorN = [[W - 1.7, W + 1.7, 3.5]]; for (let i = 1; i <= 4; i++) E.wall([i * W, 0], [i * W, 14], { h: RH, t: 0.3, gaps: [[7 - 1.7, 7 + 1.7, 3.5]] });
  for (let i = 1; i <= 4; i++) if (i !== 2 && i !== 3) E.wall([i * W, Z1 - 14], [i * W, Z1], { h: RH, t: 0.3, gaps: [[7 - 1.7, 7 + 1.7, 3.5]] });
  E.wall([2 * W, Z1 - 14], [2 * W, Z1], { h: RH, t: 0.3, gaps: [[2, 5, 3.6], [9, 12, 3.6]] }); E.wall([3 * W, Z1 - 14], [3 * W, Z1], { h: RH, t: 0.3, gaps: [[2, 5, 3.6], [9, 12, 3.6]] });
  E.wall([2 * W, Z1 - 14], [3 * W, Z1 - 14], { h: RH, t: 0.3, gaps: [[W / 2 - 2.5, W / 2 + 2.5, 4.4]] });
  for (const x0 of [0, X1 - 16]) { E.wall([x0, 23], [x0 + 16, 23], { h: RH, t: 0.3, gaps: [[8 - 1.7, 8 + 1.7, 3.5]] }); }
  E.wall([0, 14], [16, 14], { h: RH, t: 0.3, gaps: [[8 - 1.7, 8 + 1.7, 3.5]] }); E.wall([X1 - 16, 14], [X1, 14], { h: RH, t: 0.3, gaps: [[8 - 1.7, 8 + 1.7, 3.5]] });
  E.wall([0, Z1 - 14], [16, Z1 - 14], { h: RH, t: 0.3, gaps: [[8 - 1.7, 8 + 1.7, 3.5]] }); E.wall([X1 - 16, Z1 - 14], [X1, Z1 - 14], { h: RH, t: 0.3, gaps: [[8 - 1.7, 8 + 1.7, 3.5]] });
  void doorN; void win;
  // in the courtyard: coulisses at angles with single works, plinths, a bench
  const c1 = E.wall([22, 18], [28.5, 20.2], { h: 3.4, t: 0.24 }), c2 = E.wall([34, 22.6], [39.6, 20.2], { h: 3.4, t: 0.24 }), c3 = E.wall([27, 27.5], [33.4, 27.5], { h: 3.4, t: 0.24 });
  E.art(c1, 2.6, 1, 2.4, 1.7, 'the-starry-night-m'); E.art(c1, 2.6, -1, 1.5, 1.9, 'girl-with-a-pearl-earring', 1.6); E.art(c2, 2.8, 1, 2.0, 1.45, 'luncheon-on-the-grass'); E.art(c3, 3.2, -1, 1.5, 1.2, 'irises');
  E.statue(32, 24, { h: 1.1, s: 2.2 }); E.plinth(24, 28, { obj: 1 }); E.plinth(41, 28.4, { h: 0.9, obj: 2 }); E.plinth(41, 17.6, { h: 1.1, obj: 0 }); E.bench(21, 24.5, Math.PI / 2);
  // pictures in the rooms
  const P = (a, b, y0 = 0, t = 0.3) => ({ a, b, t, y0, h: RH, L: Math.hypot(b[0] - a[0], b[1] - a[1]) });
  const n1 = P([W, 1], [W, 13]); E.art(n1, 3, -1, 2.2, 1.6, 'la-grenouillere'); E.art(n1, 8, -1, 1.5, 1.9, 'woman-with-a-parasol-madame-monet-and-her-son');
  const n2 = P([2 * W, 1], [2 * W, 13]); E.art(n2, 3, -1, 2.6, 1.8, 'impression-sunrise'); E.art(n2, 9, -1, 1.7, 1.3, 'regatta-at-sainte-adresse');
  const n3 = P([4 * W, 1], [4 * W, 13]); E.art(n3, 3, -1, 2.2, 1.6, 'composition-vii'); E.art(n3, 9, -1, 1.3, 1.7, 'blue-nude');
  const s1 = P([W, Z1 - 13], [W, Z1 - 1]); E.art(s1, 4, 1, 2.4, 1.7, 'cafe-terrace-at-night'); E.art(s1, 9, 1, 1.5, 1.9, 'olympia');
  const e1 = P([X1, AZ0 + 1], [X1, AZ0 + 8]); void e1;
  const w1 = P([16, 16.5], [16, 20.5]); void w1;
  for (const [x, z] of [[24, 26], [38, 25], [37.6, 22.2], [9, 7], [22, 7.6], [44, 7], [56, 18], [8, 40]]) E.person(x, z);
  for (const [x, z, s] of [[-9, 6, 1.1], [-10, 30, 1], [X1 + 9, 10, 1.2], [X1 + 10, 36, 1], [22, Z1 + 18, 1.2], [42, Z1 + 20, 1], [30, -10, 1.1]]) E.tree(x, z, s);
  E.ghost(E.rectPts(X1 + 0.5, 0, X1 + 22, 20));
  return { bounds: [-10, -8, X1 + 26, Z1 + 20], sun: [-14, 52, 24], shadowSpan: 62, ambient: 2.3,
    labels: [[32, 23, 'חצר-אולם מרכזית'], [6.4, 7, 'חדר 1'], [19.2, 7, 'חדר 2'], [32, 7, 'חדר 3'], [44.8, 7, 'חדר 4'], [57.6, 7, 'חדר 5'], [32, 39.5, 'כניסה'], [8, 23, 'אגף מערב'], [56, 23, 'אגף מזרח'], [X1 + 11, 10, 'אגף עתידי', 1]],
    section: { at: 23, frame: [-6, -1, X1 + 6, 12], labels: [[32, 11, 'חצר מוארת מלמעלה'], [8, 2.2, 'חדרי הטבעת, אור מלמעלה'], [56, 2.2, 'חדרי הטבעת']] },
    views: {
      air: { eye: [-26, 40, Z1 + 40], look: [30, 0, 22], fov: 38 },
      e1: { eye: [32, 1.6, 43.5], look: [32, 3.6, 22], fov: 64 },
      e2: { eye: [2.6, 1.6, 7], look: [60, 2.2, 7], fov: 62 },
      e3: { eye: [43.5, 1.6, 28.5], look: [27, 2.4, 15.5], fov: 66 } } };
}
