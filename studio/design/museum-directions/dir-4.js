// 4. Under One Sky (תחת שמיים אחד): one enormous roof, perforated, held on eight piers inside a glass skin, and under it a small town of galleries: houses of different size and height, streets
// between them, a square with a pool, a hall for sculpture. The roof throws a moving pattern of light on everything (Louvre Abu Dhabi's dome of 7,850 stars filtering sun over 55 buildings),
// so the open walking space is the most beautiful room in the museum. A new exhibition is a new house; the history sections are streets of houses that widen.
export function build(E) {
  const { THREE } = E, X1 = 96, Z1 = 72, RH = 14;
  E.ground(-30, -30, X1 + 30, Z1 + 30, 'grass');
  E.floorRect(0, 0, X1, Z1, 0, 'terrazzo');
  E.pool(E.rectPts(38, 28, 58, 36));
  // the roof plate with a field of star-shaped openings (octagons on a 4 m grid, every other one smaller), on eight piers; a glass skin round it
  const holes = []; for (let i = 0; i < X1 / 4; i++) for (let j = 0; j < Z1 / 4; j++) { const cx = 2 + i * 4, cz = 2 + j * 4, r = (i + j) % 2 ? 1.05 : 0.6, rot = ((i + j) % 2) * Math.PI / 8; holes.push(Array.from({ length: 8 }, (_, k) => [cx + r * Math.cos(rot + k * Math.PI / 4), cz + r * Math.sin(rot + k * Math.PI / 4)])); }
  E.slab(E.rectPts(-2, -2, X1 + 2, Z1 + 2), RH, 1.0, 'white', { holes, roof: true });
  for (const [x, z] of [[16, 18], [48, 18], [80, 18], [16, 54], [48, 54], [80, 54], [32, 36], [64, 36]]) E.box(x, RH / 2, z, 1.6, RH, 1.6, 'concrete', 0, { noEdge: true });
  for (const [a, b] of [[[0, 0], [X1, 0]], [[X1, 0], [X1, Z1]], [[0, 0], [0, Z1]]]) E.wall(a, b, { h: RH, t: 0.3, mat: 'glass' });
  E.wall([0, Z1], [X1, Z1], { h: RH, t: 0.3, mat: 'glass' });
  // the houses: each a box with its own walls, door and roof; paintings on the walls inside
  const picture = ['impression-sunrise', 'composition-vii', 'woman-with-a-parasol-madame-monet-and-her-son', 'olympia', 'la-grenouillere', 'cafe-terrace-at-night', 'luncheon-on-the-grass', 'irises', 'blue-nude', 'dance', 'regatta-at-sainte-adresse', 'barge-haulers-on-the-volga'];
  let pi = 0;
  const house = (x0, z0, x1, z1, h, doorSide, fl = 'oak', mat = 'white', art = true) => {
    const w = x1 - x0, d = z1 - z0, dc = (doorSide === 's' || doorSide === 'n') ? w / 2 : d / 2, gap = [[dc - 1.9, dc + 1.9, 3.8]];
    E.floorRect(x0, z0, x1, z1, 0, fl);
    const W = (a, b, on) => E.wall(a, b, { h, t: 0.3, mat, gaps: on ? gap : [] });
    const n = W([x0, z0], [x1, z0], doorSide === 'n'), s = W([x0, z1], [x1, z1], doorSide === 's'), we = W([x0, z0], [x0, z1], doorSide === 'w'), e = W([x1, z0], [x1, z1], doorSide === 'e');
    E.roof(x0 - 0.2, z0 - 0.2, x1 + 0.2, z1 + 0.2, h + 0.3, { t: 0.3, lights: [[x0 + w * 0.25, z0 + d * 0.3, x1 - w * 0.25, z1 - d * 0.3]] });
    if (art) { const walls = [[n, -1], [s, 1], [we, 1], [e, -1]].filter(([, ], i) => ['n', 's', 'w', 'e'][i] !== doorSide); for (const [wl, side] of walls) { const L = wl.L, k = Math.max(1, Math.floor((L - 3) / 4.2)); for (let q = 0; q < k; q++) E.art(wl, 2.2 + (L - 4.4) * (q + 0.5) / k, side, 1.6 + (pi % 3) * 0.3, 1.3 + (pi % 2) * 0.4, picture[pi++ % picture.length], 1.6); } }
    return { x0, z0, x1, z1, h };
  };
  // the Renaissance street: four houses along the north side, each wider and taller than the one before
  const R1 = house(4, 4, 16, 18, 6.0, 's', 'oak', 'sage'), R2 = house(19, 4, 33, 18, 7.0, 's', 'oak', 'white'), R3 = house(36, 4, 54, 18, 8.4, 's', 'marble' in {} ? 'oak' : 'oak', 'white'), R4 = house(57, 4, 79, 18, 9.2, 's', 'oak', 'white');
  const S1 = house(4, 54, 14, 68, 5.0, 'n', 'oak', 'warm'), S2 = house(17, 56, 28, 68, 5.4, 'n', 'oak', 'sand'), S3 = house(64, 52, 88, 68, 7.4, 'n', 'oak', 'white');
  const Wn = house(4, 26, 16, 46, 6.0, 'e', 'slate', 'concrete'), Es = house(82, 22, 92, 46, 8.0, 'w', 'oak', 'white');
  // the square: coulisses at angles with single works, the statue by the pool, benches
  const c1 = E.wall([24, 26], [30, 24], { h: 3.8, t: 0.24 }), c2 = E.wall([62, 40], [68, 42], { h: 3.8, t: 0.24 }), c3 = E.wall([40, 44], [46, 44.6], { h: 3.8, t: 0.24 });
  E.art(c1, 2.8, 1, 2.4, 1.7, 'the-starry-night-m'); E.art(c1, 2.8, -1, 1.5, 1.9, 'girl-with-a-pearl-earring', 1.6); E.art(c2, 3, 1, 2.2, 1.6, 'luncheon-on-the-grass'); E.art(c3, 3, 1, 1.6, 1.2, 'irises');
  E.statue(48, 41, { h: 1.1, s: 2.3 }); E.plinth(34, 40, { obj: 1 }); E.plinth(62, 30, { h: 0.9, obj: 2 }); E.bench(44, 26.2, 0); E.bench(52, 26.2, 0); E.bench(30, 33, Math.PI / 2);
  for (const [x, z] of [[40, 40], [52, 46], [26, 22], [60, 24], [72, 36], [30, 60], [48, 64]]) E.person(x, z);
  for (const [x, z, s] of [[-12, 8, 1.3], [-14, 40, 1.2], [-12, 66, 1.3], [X1 + 12, 12, 1.2], [X1 + 14, 46, 1.4], [30, Z1 + 14, 1.3], [66, Z1 + 16, 1.2], [40, -14, 1.2]]) E.tree(x, z, s);
  E.ghost(E.rectPts(X1 - 16, 52, X1 - 2, 70)); E.ghost(E.rectPts(80, 4, X1 - 2, 18));
  return { bounds: [-14, -10, X1 + 16, Z1 + 12], centre: [48, 36], sun: E.sunFor(E.hour ?? 12, 80), shadowSpan: 84, ambient: 1.15, sunPower: 3.6, exposure: 0.95,
    labels: [[48, 36, 'הכיכר (בריכה, קולִיסות)'], [10, 11, 'רנסנס 1'], [26, 11, 'רנסנס 2'], [45, 11, 'רנסנס 3'], [68, 11, 'רנסנס 4'], [9, 61, 'יחיד'], [22, 62, 'יחיד'], [76, 60, 'אימפרסיוניזם'], [10, 36, 'ארון'], [87, 34, 'פיסול ומודלים'], [48, 68, 'כניסה'], [X1 - 9, 61, 'בית עתידי', 1]],
    section: { at: 36, frame: [-3, -1, X1 + 3, 16], labels: [[48, 14.8, 'גג מחורר: אור כוכבים'], [10, 3.5, 'בית'], [48, 3.4, 'כיכר'], [87, 3.5, 'בית']] },
    views: {
      air: { eye: [-28, 56, Z1 + 56], look: [48, 2, 34], fov: 38 },
      e1: { eye: [46, 1.6, Z1 - 3], look: [48, 3.2, 18], fov: 68 },
      e2: { eye: [18.5, 1.6, 24], look: [58, 2.4, 22], fov: 66 },
      e3: { eye: [45, 1.6, 17.2], look: [45, 3.0, 5], fov: 66 } } };
}
