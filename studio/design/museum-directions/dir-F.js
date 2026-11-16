// F. The Chambers: a monolith of brick with rooms of very different height, proportion and light, entered in a sequence with turns (Kolumba, Chipperfield's Kunsthaus Zurich,
// Louisiana's rhythm of rooms): a low entrance, a tall central hall lit from above, a black cabinet, a narrow tall room with a high slit, a long gallery with north light, a winter garden.
// Doors never line up: the route is chosen by the visitor, every room is a surprise.
export function build(E) {
  const T = 0.3;
  // rooms: [name, x0, z0, x1, z1, height, floor, wall material, roof: 'lantern' | 'slit' | 'north' | 'glass' | 'plain' | 'lanternSmall']
  const R = [
    ['entrance', 22, 33, 36, 42, 3.2, 'concrete', 'concrete', 'plain'],
    ['hall', 18, 18, 36, 33, 8.0, 'terrazzo', 'white', 'lantern'],
    ['west', 2, 18, 18, 34, 4.2, 'oak', 'white', 'lanternSmall'],
    ['cabinet', 2, 8, 10, 18, 3.4, 'slate', 'black', 'plain'],
    ['niche1', 2, 2, 10, 8, 6.0, 'terrazzo', 'white', 'slit'],
    ['tall', 10, 2, 22, 18, 10.0, 'oak', 'white', 'slit'],
    ['long', 22, 2, 54, 10, 4.6, 'oak', 'white', 'north'],
    ['passage', 22, 10, 36, 18, 3.8, 'concrete', 'white', 'plain'],
    ['square', 36, 10, 54, 26, 6.4, 'oak', 'brick', 'lanternSmall'],
    ['garden', 36, 26, 54, 42, 5.2, 'terrazzo', 'white', 'glass'],
    ['niche2', 2, 34, 10, 42, 6.0, 'terrazzo', 'white', 'slit'],
    ['cloak', 10, 34, 22, 42, 3.4, 'concrete', 'white', 'plain'],
  ];
  // doors: [axis ('x' = a wall at x = at, running along z), at, from, to, height]
  const D = [['z', 42, 27, 31, 3.0], ['z', 33, 27, 31, 3.0], ['x', 18, 24, 28, 3.6], ['z', 18, 4, 7, 2.8], ['z', 8, 4, 7, 2.8], ['z', 34, 4, 7, 2.8], ['x', 10, 37, 40, 2.8], ['x', 22, 37, 40, 2.8], ['z', 34, 12, 15, 2.8],
    ['z', 18, 19, 21.5, 3.4], ['x', 22, 4, 7, 3.4], ['z', 18, 27, 30, 3.0], ['z', 10, 27, 30, 3.0], ['z', 10, 44, 47, 3.4], ['x', 36, 20, 23, 3.4], ['x', 36, 28, 31, 3.4], ['x', 36, 12, 15, 3.0]];
  // slit windows in the outer walls: [axis, at, from, to, sill, top]
  const WIN = [['x', 2, 22, 22.7, 0.8, 3.6], ['x', 2, 26, 26.7, 0.8, 3.6], ['x', 2, 30, 30.7, 0.8, 3.6], ['z', 42, 38, 38.7, 0.8, 4], ['z', 42, 44, 44.7, 0.8, 4], ['x', 54, 28, 40, 0.0, 4.8], ['x', 54, 4, 4.7, 1.0, 3.8], ['x', 54, 7, 7.7, 1.0, 3.8], ['z', 2, 24, 24.7, 1.0, 3.8], ['z', 2, 30, 30.7, 1.0, 3.8], ['z', 2, 36, 36.7, 1.0, 3.8], ['z', 2, 42, 42.7, 1.0, 3.8], ['z', 2, 48, 48.7, 1.0, 3.8], ['z', 42, 46, 52, 0.0, 4.6], ['x', 54, 14, 14.7, 1.0, 4.4], ['x', 54, 20, 20.7, 1.0, 4.4]];
  E.ground(-24, -24, 80, 66, 'grass'); E.slab(E.rectPts(24, 42, 34, 56), 0.02, 0.04, 'gravel', { noCast: true, noEdge: true });
  const gapsFor = (axis, at, lo, hi) => [...D.filter(d => d[0] === axis && Math.abs(d[1] - at) < 0.01 && d[2] >= lo - 0.01 && d[3] <= hi + 0.01).map(d => [d[2] - lo, d[3] - lo, d[4], 0]),
    ...WIN.filter(d => d[0] === axis && Math.abs(d[1] - at) < 0.01 && d[2] >= lo - 0.01 && d[3] <= hi + 0.01).map(d => [d[2] - lo, d[3] - lo, d[5], d[4]])];
  const outer = (axis, at) => (axis === 'x' && (at === 2 || at === 54)) || (axis === 'z' && (at === 2 || at === 42));
  const done = new Set();
  const FL = { oak: 'oak', terrazzo: 'terrazzo', slate: 'slate', concrete: 'concrete' };
  for (const [name, x0, z0, x1, z1, h, fl, wm, roof] of R) {
    E.floorRect(x0, z0, x1, z1, 0, FL[fl]);
    for (const [axis, at, lo, hi, a, b] of [['z', z0, x0, x1, [x0, z0], [x1, z0]], ['z', z1, x0, x1, [x0, z1], [x1, z1]], ['x', x0, z0, z1, [x0, z0], [x0, z1]], ['x', x1, z0, z1, [x1, z0], [x1, z1]]]) {
      const key = `${axis}${at}:${lo}-${hi}:${name}`, mat = outer(axis, at) ? 'brick' : wm; if (done.has(key)) continue; done.add(key);
      E.wall(a, b, { h, t: T, mat, gaps: gapsFor(axis, at, lo, hi), windowGlass: true });
    }
    // the roof by kind
    const w = x1 - x0, d = z1 - z0, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    const lights = roof === 'lantern' ? [[cx - 5, cz - 4, cx + 5, cz + 4]] : roof === 'lanternSmall' ? [[cx - w / 4, cz - d / 4, cx + w / 4, cz + d / 4]] : roof === 'slit' ? [[x0 + 1.2, z0 + 1.2, x1 - 1.2, z0 + 2.2], [x0 + 1.2, z1 - 2.2, x1 - 1.2, z1 - 1.2]] : roof === 'north' ? [[x0 + 2, z0 + 0.6, x1 - 2, z0 + 2.4]] : roof === 'glass' ? [[x0 + 1, z0 + 1, x1 - 1, z1 - 1]] : [];
    E.roof(x0 - 0.2, z0 - 0.2, x1 + 0.2, z1 + 0.2, h + 0.35, { t: 0.35, lights });
  }
  // the tall room: a high clerestory, seen as a glass band at the top of the north wall; the long gallery's north light band above its roof
  E.wall([10, 2], [22, 2], { h: 1.6, y0: 10.35, t: 0.3, mat: 'glass' });
  // content: the hall (coulisses at angles, statues, plinths), pictures on the walls
  const c1 = E.wall([21, 22], [27.5, 24.4], { h: 3.6, t: 0.24 }), c2 = E.wall([29, 28.6], [34, 26], { h: 3.6, t: 0.24 });
  E.art(c1, 3, 1, 2.6, 1.9, 'the-starry-night-m'); E.art(c1, 3, -1, 1.5, 1.9, 'girl-with-a-pearl-earring', 1.6); E.art(c2, 2.6, 1, 2.2, 1.6, 'luncheon-on-the-grass');
  E.statue(27, 29.5, { h: 1.1, s: 2.2 }); E.plinth(21.5, 30.5, { obj: 1 }); E.plinth(33, 21, { h: 0.9, obj: 2 });
  const P = (a, b, y0 = 0) => ({ a, b, t: T, y0, h: 4, L: Math.hypot(b[0] - a[0], b[1] - a[1]) });
  const w1 = P([3, 18.1], [17, 18.1]); E.art(w1, 3, 1, 2.2, 1.6, 'impression-sunrise'); E.art(w1, 8, 1, 1.5, 1.9, 'woman-with-a-parasol-madame-monet-and-her-son'); E.art(w1, 12, 1, 1.4, 1.1, 'garden-at-sainte-adresse');
  const w2 = P([3, 33.9], [17, 33.9]); E.art(w2, 3, -1, 2.0, 1.5, 'la-grenouillere'); E.art(w2, 8, -1, 1.2, 1.6, 'dance'); E.art(w2, 12, -1, 1.5, 1.2, 'regatta-at-sainte-adresse');
  const c3 = P([3, 12], [3, 17]); void c3; const t1 = P([10.2, 5], [10.2, 16]); E.art(t1, 3, 1, 1.3, 1.7, 'blue-nude', 1.6); E.art(t1, 8, 1, 1.5, 1.9, 'olympia', 1.6);
  const t2 = P([21.8, 8], [21.8, 17]); E.art(t2, 3, -1, 1.7, 1.2, 'irises', 3.4); E.art(t2, 6, -1, 2.2, 1.5, 'composition-vii', 4.4);
  const l1 = P([24, 9.85], [52, 9.85]); E.art(l1, 4, 1, 2.4, 1.7, 'cafe-terrace-at-night'); E.art(l1, 10, 1, 1.5, 1.9, 'barge-haulers-on-the-volga'); E.art(l1, 17, 1, 2.2, 1.5, 'luncheon-on-the-grass'); E.art(l1, 23, 1, 1.5, 1.1, 'irises');
  E.plinth(30, 6, { obj: 0 }); E.plinth(42, 6, { h: 0.9, obj: 1 }); E.statue(45, 18, { h: 1.0, s: 2.0 }); E.tree(45, 34, 1.0); E.bench(42, 30, 0.2); E.plinth(6, 5, { h: 1.1, obj: 2 }); E.plinth(6, 38, { obj: 3 });
  const cab = P([2.2, 9], [2.2, 17]); E.art(cab, 3, 1, 1.4, 1.1, 'self-portrait-in-a-straw-hat', 1.5); E.art(cab, 6, 1, 1.0, 1.4, 'olympia', 1.5);
  for (const [x, z] of [[33, 38.5], [24, 36], [25, 24], [32, 30], [30, 6], [14, 26], [18, 8], [48, 18]]) E.person(x, z);
  for (const [x, z, s] of [[-8, 6, 1.2], [-10, 30, 1], [62, 8, 1.1], [64, 34, 1.2], [20, 56, 1.2], [44, 58, 1], [30, -10, 1.1]]) E.tree(x, z, s);
  E.ghost(E.rectPts(54.5, 2, 70, 20)); E.ghost(E.rectPts(54.5, 22, 70, 42));
  return { bounds: [-8, -6, 76, 62], centre: [28, 26], sun: [-16, 56, 26], shadowSpan: 66, ambient: 2.3,
    labels: [[29, 37.5, 'כניסה נמוכה'], [27, 26, 'אולם מרכזי (8 מ׳)'], [10, 26, 'גלריה'], [6, 13, 'ארון שחור'], [16, 10, 'חדר גבוה (10 מ׳)'], [38, 6, 'גלריה ארוכה, אור צפוני'], [45, 18, 'חדר לבנים'], [45, 34, 'גן חורף'], [29, 14, 'מעבר'], [16, 38, 'מלתחה'], [6, 5, 'גומחה'], [6, 38, 'גומחה'], [62, 12, 'אגף עתידי', 1], [62, 32, 'חצר עתידית', 1]],
    section: { at: 28, frame: [-2, -1, 60, 12], labels: [[10, 5.2, 'גלריה 4.2'], [27, 9.2, 'אולם 8 מ׳ + פנס אור'], [45, 6.2, 'גן חורף']] },
    views: {
      air: { eye: [-22, 40, 66], look: [28, 0, 22], fov: 40 },
      e1: { eye: [29, 1.6, 41], look: [29, 3.6, 24], fov: 66 },
      e2: { eye: [14, 1.6, 15], look: [16, 6.5, 4], fov: 70 },
      e3: { eye: [23.5, 1.6, 6], look: [52, 2.0, 5.5], fov: 62 } } };
}
