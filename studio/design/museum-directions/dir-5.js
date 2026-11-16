// 5. The Plug-in Frame (המסגרת שמחברים אליה): a single huge light shed of steel (one building: translucent walls and roof, exposed trusses, gantry cranes) on a 12 m grid, and exhibitions as
// white boxes that dock into the grid and leave it: an exhibition ends, a crane lifts its box out, another comes in (Cedric Price's Fun Palace, 1961; Archigram's Plug-in City, 1964; the Pompidou).
// The empty cells are the open walking space between exhibitions. In the app a publish on the Desk is literally a crane carrying a box in, overnight, and you can watch it.
export function build(E) {
  const { THREE } = E, X1 = 72, Z1 = 48, FH = 16;
  E.M.skin = new THREE.MeshStandardMaterial({ color: 0xf2f5f5, transparent: true, opacity: 0.42, roughness: 0.4, side: THREE.DoubleSide, depthWrite: false });
  E.M.red = new THREE.MeshStandardMaterial({ color: 0xd8442b, roughness: 0.55 }); E.M.yellow = new THREE.MeshStandardMaterial({ color: 0xe8b620, roughness: 0.55 });
  E.ground(-30, -30, X1 + 30, Z1 + 30, 'grass'); E.floorRect(0, 0, X1, Z1, 0, 'floor');
  for (let i = 0; i <= X1 / 12; i++) E.box(i * 12, 0.07, Z1 / 2, 0.1, 0.02, Z1, 'ink', 0, { noEdge: true, noCast: true });
  for (let j = 0; j <= Z1 / 12; j++) E.box(X1 / 2, 0.07, j * 12, X1, 0.02, 0.1, 'ink', 0, { noEdge: true, noCast: true });
  // the frame: columns and trusses every 12 m, a translucent skin, a clerestory strip, two gantry rails
  for (let i = 0; i <= X1 / 12; i++) for (const z of [0, Z1]) E.box(i * 12, FH / 2, z, 0.5, FH, 0.5, 'steel');
  for (let i = 0; i <= X1 / 12; i++) { E.box(i * 12, FH - 0.4, Z1 / 2, 0.45, 0.9, Z1, 'steel', 0, { roof: true }); E.box(i * 12, FH - 1.9, Z1 / 2, 0.2, 0.2, Z1, 'steel', 0, { roof: true }); }
  for (let k = 0; k <= 4; k++) E.box(X1 / 2, FH, k * 12, X1, 0.3, 0.3, 'steel', 0, { roof: true });
  E.slab(E.rectPts(-0.5, -0.5, X1 + 0.5, Z1 + 0.5), FH + 0.25, 0.1, 'skin', { roof: true, noCast: false });
  E.wall([0, 0], [X1, 0], { h: FH, t: 0.1, mat: 'skin' }); E.wall([0, Z1], [X1, Z1], { h: FH, t: 0.1, mat: 'skin', gaps: [[32, 40, 4.5]] }); E.wall([0, 0], [0, Z1], { h: FH, t: 0.1, mat: 'skin' }); E.wall([X1, 0], [X1, Z1], { h: FH, t: 0.1, mat: 'skin' });
  for (const z of [10, 38]) E.box(X1 / 2, 11.5, z, X1, 0.4, 0.5, 'red', 0, { roof: true });
  // the gantry cranes (two bridges on the rails), one carrying a box that is moving into a cell
  const bridge = (x, hung) => { E.box(x, 12, Z1 / 2, 0.8, 0.8, Z1 - 20, 'red', 0, { roof: true }); E.box(x, 11.6, 10, 1.6, 0.6, 1.2, 'steel', 0, { roof: true }); E.box(x, 11.6, 38, 1.6, 0.6, 1.2, 'steel', 0, { roof: true }); if (hung) { for (const dz of [-3, 3]) for (const dx of [-3, 3]) E.box(x + dx, 9.3, 24 + dz, 0.06, 5, 0.06, 'ink', 0, { roof: true }); } };
  bridge(30, false); bridge(54, true);
  // the exhibitions: boxes on the grid; the picture on their walls; a doorway and a yellow frame on the side that faces the open cells
  const picture = ['impression-sunrise', 'composition-vii', 'woman-with-a-parasol-madame-monet-and-her-son', 'olympia', 'la-grenouillere', 'cafe-terrace-at-night', 'luncheon-on-the-grass', 'irises', 'blue-nude', 'dance', 'regatta-at-sainte-adresse', 'barge-haulers-on-the-volga'];
  let pi = 0;
  const box = (x0, z0, x1, z1, h, doorSide, o = {}) => {
    const w = x1 - x0, d = z1 - z0, dc = (doorSide === 's' || doorSide === 'n') ? w / 2 : d / 2, gap = [[dc - 1.8, dc + 1.8, 3.8]], y0 = o.y0 || 0;
    E.floorRect(x0, z0, x1, z1, y0, o.floor || 'oak');
    const W = (a, b, on) => E.wall(a, b, { h, y0, t: 0.3, mat: o.mat || 'white', gaps: on ? gap : [] });
    const n = W([x0, z0], [x1, z0], doorSide === 'n'), s = W([x0, z1], [x1, z1], doorSide === 's'), we = W([x0, z0], [x0, z1], doorSide === 'w'), e = W([x1, z0], [x1, z1], doorSide === 'e');
    E.roof(x0 - 0.2, z0 - 0.2, x1 + 0.2, z1 + 0.2, y0 + h + 0.3, { t: 0.3, lights: o.sky === false ? [] : [[x0 + w * 0.22, z0 + d * 0.3, x1 - w * 0.22, z1 - d * 0.3]] });
    const dd = doorSide === 'n' ? [[x0 + dc - 2, z0], [x0 + dc + 2, z0]] : doorSide === 's' ? [[x0 + dc - 2, z1], [x0 + dc + 2, z1]] : doorSide === 'w' ? [[x0, z0 + dc - 2], [x0, z0 + dc + 2]] : [[x1, z0 + dc - 2], [x1, z0 + dc + 2]];
    E.seg(dd[0], [dd[0][0], dd[0][1]], 0, 0.01, 0.01, 'yellow'); E.box((dd[0][0] + dd[1][0]) / 2, 4.1 + y0, (dd[0][1] + dd[1][1]) / 2, doorSide === 'n' || doorSide === 's' ? 4.4 : 0.5, 0.4, doorSide === 'n' || doorSide === 's' ? 0.5 : 4.4, 'yellow', 0, { noEdge: true });
    if (o.art !== false) { const walls = [[n, -1], [s, 1], [we, 1], [e, -1]].filter((_, i) => ['n', 's', 'w', 'e'][i] !== doorSide); for (const [wl, side] of walls) { const L = wl.L, k = Math.max(1, Math.floor((L - 3) / 4.2)); for (let q = 0; q < k; q++) E.art(wl, 2.2 + (L - 4.4) * (q + 0.5) / k, side, 1.6 + (pi % 3) * 0.3, 1.3 + (pi % 2) * 0.4, picture[pi++ % picture.length], y0 + 1.6 - y0 + 0); } }
  };
  // the history train (north, widening: 12 x 12, 12 x 12 taller, 24 x 12, 24 x 12 tallest), a solo box, the sculpture hall, the maquette box
  box(2, 2, 12, 12, 5.0, 's'); box(14, 2, 26, 12, 5.8, 's'); box(28, 2, 48, 12, 6.6, 's'); box(50, 2, 70, 12, 7.4, 's');
  box(2, 26, 12, 46, 6.0, 'e', { floor: 'slate', mat: 'concrete' });                      // (a long box: a solo show)
  box(58, 26, 70, 46, 7.0, 'w');                                                          // (maquettes and sculpture)
  // the empty cells: the open walking space between the exhibitions, with the coulisses, plinths and benches
  const c1 = E.wall([20, 24], [26, 26.4], { h: 3.8, t: 0.24 }), c2 = E.wall([34, 32], [40, 30], { h: 3.8, t: 0.24 }), c3 = E.wall([44, 38], [50, 40], { h: 3.8, t: 0.24 });
  E.art(c1, 2.8, 1, 2.4, 1.7, 'the-starry-night-m'); E.art(c1, 2.8, -1, 1.5, 1.9, 'girl-with-a-pearl-earring', 1.6); E.art(c2, 3, 1, 2.2, 1.6, 'luncheon-on-the-grass'); E.art(c3, 3, 1, 1.6, 1.2, 'irises');
  E.statue(36, 22, { h: 1.1, s: 2.3 }); E.plinth(24, 36, { obj: 1 }); E.plinth(52, 24, { h: 0.9, obj: 2 }); E.bench(30, 17, 0); E.bench(44, 17, 0); E.bench(18, 40, 1.57); E.plinth(16, 22, { h: 1.2, obj: 3 });
  // the hung box: an exhibition being carried to its cell (the empty cell it is going into is marked on the floor)
  E.box(54, 7.4, 24, 10, 5, 10, 'white', 0, { roof: false }); E.box(54, 4.95, 24, 10.2, 0.2, 10.2, 'steel');
  for (let i = 0; i < 4; i++) E.box(54, 0.07, 24, 11.6, 0.03, 0.14, 'yellow', 0, { noEdge: true, noCast: true });
  E.slab(E.rectPts(48, 19, 60, 31), 0.1, 0.02, 'gravel', { noCast: true, noEdge: true });
  for (const [x, z] of [[36, 28], [24, 20], [48, 33], [20, 42], [60, 15], [64, 38], [8, 16]]) E.person(x, z);
  for (const [x, z, s] of [[-10, 10, 1.3], [-12, 38, 1.2], [X1 + 10, 14, 1.2], [X1 + 12, 40, 1.3], [30, Z1 + 12, 1.3], [60, Z1 + 12, 1.1], [30, -12, 1.2]]) E.tree(x, z, s);
  E.ghost(E.rectPts(X1 + 0.5, 0, X1 + 24, Z1));
  return { bounds: [-12, -10, X1 + 28, Z1 + 12], centre: [36, 24], sun: [-14, 58, 20], shadowSpan: 70, ambient: 2.2,
    labels: [[7, 7, 'תערוכה 1'], [20, 7, 'תערוכה 2'], [38, 7, 'תערוכה 3'], [60, 7, 'תערוכה 4'], [7, 36, 'יחיד'], [64, 36, 'פיסול ומודלים'], [36, 28, 'תאים ריקים = הליכה פתוחה'], [54, 24, 'תערוכה נכנסת בעגורן'], [36, Z1 - 3, 'כניסה'], [X1 + 12, 24, 'תאים עתידיים', 1]],
    section: { at: 24, frame: [-3, -1, X1 + 3, 19.5], labels: [[36, 17.6, 'מסבכי פלדה וקליפה שקופה'], [36, 11, 'עגורן גשר'], [54, 7.5, 'תערוכה נישאת'], [7, 3, 'קופסה'], [64, 3, 'קופסה']] },
    views: {
      air: { eye: [-28, 56, Z1 + 52], look: [36, 2, 24], fov: 38 },
      e1: { eye: [36, 1.6, Z1 - 2.4], look: [40, 5.6, 14], fov: 70 },
      e2: { eye: [30, 1.6, 17], look: [50, 4.2, 22], fov: 66 },
      e3: { eye: [38, 1.6, 11.4], look: [38, 2.2, 3.4], fov: 68 } } };
}
