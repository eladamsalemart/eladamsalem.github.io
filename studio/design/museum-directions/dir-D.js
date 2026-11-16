// D. The Plate and the Boxes: above, one great glass hall under a flat roof plate (free plan: coulisses, plinths, sculpture, views out), on a raised podium; below, in
// the podium, dark galleries (black box / slate) round a walled garden, reached by a stair from the hall (Neue Nationalgalerie, Kolumba). Light above, no light below.
export function build(E) {
  const { THREE } = E, PX = 56, PZ = 56, HF = 3.6, GH = 8.0, LH = 3.2, G0 = 3, G1 = 53;
  E.ground(-30, -30, PX + 50, PZ + 40, 'grass');
  E.group('upper', () => {
    // the podium slab with the stair opening, the glass hall, the roof plate on steel columns
    E.slab(E.rectPts(0, 0, PX, PZ), HF, 0.4, 'terrazzo', { holes: [E.rectPts(36, 25, 42.4, 31.4)], roof: false });
    E.floorRect(G0, G0, G1, G1, HF, 'terrazzo');
    for (const [a, b] of [[[G0, G0], [G1, G0]], [[G1, G0], [G1, G1]], [[G0, G0], [G0, G1]]]) E.wall(a, b, { h: GH, y0: HF, t: 0.3, mat: 'glass' });
    E.wall([G0, G1], [G1, G1], { h: GH, y0: HF, t: 0.3, mat: 'glass' });
    for (const [x, z] of [[G0, G0], [28, G0], [G1, G0], [G0, 28], [G1, 28], [G0, G1], [28, G1], [G1, G1]]) E.box(x, HF + (GH + 1) / 2, z, 0.5, GH + 1, 0.5, 'steel');
    E.slab(E.rectPts(-3, -3, PX + 3, PZ + 3), HF + GH + 1.0, 1.0, 'white', { roof: true });
    // the stair down (twelve steps in six metres)
    for (let i = 0; i < 12; i++) { const top = HF - 0.3 * (i + 1); E.box(36 + 0.5 * i + 0.25, top / 2, 28.2, 0.5, top, 3.0, 'concrete', 0, { noEdge: true }); }
    // outside: the steps up to the podium and the way in
    for (let i = 0; i < 12; i++) E.box(28, (0.3 * (i + 1)) / 2, PZ + 4.2 - i * 0.35 + 0.0, 8, 0.3 * (i + 1), 0.35, 'concrete', 0, { noEdge: true });
    E.floorRect(24, G1, 32, PZ, HF, 'terrazzo');
    E.wall([24, G1], [24, G1 + 0.1], { h: 0.1 });
    // the hall's content: tall white coulisses (4 m), statues, plinths, benches
    const c1 = E.wall([8, 14], [16, 16.4], { y0: HF, h: 4.0, t: 0.24 }), c2 = E.wall([20, 30], [30, 28], { y0: HF, h: 4.0, t: 0.24 }), c3 = E.wall([44, 14], [50, 18], { y0: HF, h: 4.0, t: 0.24 }), c4 = E.wall([10, 38], [18, 38], { y0: HF, h: 4.0, t: 0.24 });
    E.art(c1, 3.6, 1, 2.6, 1.9, 'the-starry-night-m', 1.7); E.art(c1, 3.6, -1, 1.5, 1.9, 'girl-with-a-pearl-earring', 1.7); E.art(c2, 4.5, 1, 2.2, 1.6, 'luncheon-on-the-grass', 1.7); E.art(c3, 3.5, 1, 2.0, 1.45, 'olympia', 1.7); E.art(c4, 3, -1, 2.0, 1.5, 'irises', 1.7);
    E.statue(28, 42, { y0: HF, h: 1.1, s: 2.3 }); E.statue(46, 38, { y0: HF, h: 1.1, s: 2.0 }); E.plinth(14, 24, { y0: HF, obj: 1 }); E.plinth(40, 14, { y0: HF, h: 0.9, obj: 2 }); E.plinth(22, 46, { y0: HF, h: 1.0, obj: 0 }); E.bench(33, 34.5); E.bench(19, 21, 0.5);
    for (const [x, z] of [[20, 40], [36, 44], [38, 36], [12, 28], [42, 22]]) E.person(x, z, HF);
  });
  // the lower level: dark galleries, a long central foyer, a walled garden on the east side seen through glass
  E.floorRect(0, 0, 24, PZ, 0, 'slate'); E.floorRect(24, 0, 46, PZ, 0, 'terrazzo'); E.floorRect(46, 0, PX, PZ, 0, 'slate');
  E.wall([0, 0], [PX, 0], { h: LH, t: 0.4, mat: 'concrete' }); E.wall([0, 0], [0, PZ], { h: LH, t: 0.4, mat: 'concrete' }); E.wall([0, PZ], [PX, PZ], { h: LH, t: 0.4, mat: 'concrete', gaps: [[24.6, 31.4, 2.9]] });
  E.wall([PX, 0], [PX, PZ], { h: LH, t: 0.3, mat: 'glass', gaps: [] }); E.wall([PX, 0], [PX, 14], { h: LH, t: 0.4, mat: 'concrete' }); E.wall([PX, 42], [PX, PZ], { h: LH, t: 0.4, mat: 'concrete' });
  const slate = 'concrete'; E.wall([24, 0], [24, PZ], { h: LH, t: 0.3, mat: slate, gaps: [[8, 12, 2.7], [26, 30, 2.7], [44, 48, 2.7]] }); E.wall([46, 0], [46, PZ], { h: LH, t: 0.3, mat: slate, gaps: [[8, 12, 2.7], [18, 36, 2.7], [44, 48, 2.7]] });
  for (const z of [19, 38]) E.wall([0, z], [24, z], { h: LH, t: 0.3, mat: slate, gaps: [[9, 13, 2.7]] });
  E.wall([46, 19], [PX, 19], { h: LH, t: 0.3, mat: slate, gaps: [[3, 6, 2.7]] }); E.wall([46, 38], [PX, 38], { h: LH, t: 0.3, mat: slate, gaps: [[3, 6, 2.7]] });
  // the garden: concrete walls, a tree, a pool, seen through the glass wall
  E.floorRect(PX, 12, PX + 20, 44, 0, 'gravel'); E.wall([PX, 12], [PX + 20, 12], { h: 6, t: 0.4, mat: 'concrete' }); E.wall([PX, 44], [PX + 20, 44], { h: 6, t: 0.4, mat: 'concrete' }); E.wall([PX + 20, 12], [PX + 20, 44], { h: 6, t: 0.4, mat: 'concrete' });
  E.tree(PX + 10, 28, 1.4); E.pool(E.rectPts(PX + 3, 18, PX + 12, 22)); E.plinth(PX + 6, 36, { obj: 1, om: 'bronze' });
  // pictures in the dark galleries
  const q = (a, b) => ({ a, b, t: 0.3, y0: 0, h: LH, L: Math.hypot(b[0] - a[0], b[1] - a[1]) });
  const l1 = q([0.3, 3], [0.3, 17]); E.art(l1, 2, -1, 1.5, 1.9, 'woman-with-a-parasol-madame-monet-and-her-son', 1.55); E.art(l1, 6.5, -1, 2.2, 1.6, 'impression-sunrise', 1.55); E.art(l1, 11, -1, 1.4, 1.1, 'garden-at-sainte-adresse', 1.55);
  const l2 = q([24, 4], [24, 17]); void l2; const l3 = q([5, 38], [19, 38]); E.art(l3, 3, -1, 2.1, 1.5, 'composition-vii', 1.55); E.art(l3, 8, -1, 1.2, 1.6, 'dance', 1.55); E.art(l3, 12, -1, 1.5, 1.1, 'regatta-at-sainte-adresse', 1.55);
  const l4 = q([5, 19], [19, 19]); E.art(l4, 3, 1, 2.2, 1.6, 'cafe-terrace-at-night', 1.55); E.art(l4, 8, 1, 1.5, 1.9, 'olympia', 1.55); E.art(l4, 12, 1, 1.5, 1.2, 'la-grenouillere', 1.55);
  E.plinth(35, 12, { obj: 1 }); E.plinth(35, 40, { h: 0.9, obj: 0 }); E.person(30, 20); E.person(38, 46); E.person(10, 28);
  for (const [x, z, s] of [[-10, 10, 1.2], [-12, 44, 1], [PX + 28, 8, 1.1], [PX + 30, 40, 1.2], [14, PZ + 18, 1.2], [44, PZ + 20, 1], [30, -10, 1.1]]) E.tree(x, z, s);
  E.ghost(E.rectPts(PX + 21, 12, PX + 40, 44));
  return { bounds: [-10, -8, PX + 46, PZ + 22], sun: [-16, 56, 28], shadowSpan: 76, ambient: 2.3, exposure: 1.0,
    labels: [[28, 33, 'אולם הזכוכית (קומה עליונה)'], [28, 53, 'כניסה (מדרגות)'], [39, 28.6, 'מדרגות למטה'], [12, 10, 'קופסה'], [PX + 10, 38, 'גן', 1]],
    labels2: [[12, 10, 'גלריה שחורה'], [12, 28, 'קופסה'], [12, 47, 'גלריה'], [35, 28, 'פואייה ארוך'], [51, 9, 'חדר'], [51, 28, 'גלריית הגן'], [51, 47, 'חדר'], [PX + 10, 38, 'גן קירות', 1], [PX + 30, 28, 'הרחבה', 1]],
    section: { at: 28.2, frame: [-5, -1, PX + 24, 14.5], labels: [[28, 14, 'לוח גג, אולם זכוכית'], [10, 1.6, 'גלריות למטה (3.2 מ׳)'], [PX + 10, 7.5, 'גן הקירות'], [39, 3.4, 'מדרגות']] },
    views: {
      air: { eye: [-26, 48, PZ + 46], look: [30, 4, 26], fov: 38 },
      e1: { eye: [27, HF + 1.6, 51], look: [30, HF + 2.2, 22], fov: 66 },
      e2: { eye: [12, 1.6, 6], look: [12, 1.7, 36], fov: 66 },
      e3: { eye: [PX + 14, 1.6, 20], look: [PX - 1, 2.2, 31], fov: 70 } } };
}
