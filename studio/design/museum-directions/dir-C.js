// C. The Grid of Vaults: a structural grid of barrel-vaulted bays (9 x 18 m), each with a light slit at the crown (Kimbell, Menil). Exhibitions are clusters of bays;
// partitions between bays are walls with portals, the central column is an open nave. Growth: add a bay at any edge.
export function build(E) {
  const { THREE } = E, BW = 9, BL = 18, NX = 5, NZ = 3, X1 = BW * NX, Z1 = BL * NZ, SP = 4.2, R = 4.5;
  E.ground(-40, -40, X1 + 40, Z1 + 40, 'grass'); E.slab(E.rectPts(-6, Z1 - 0.2, X1 + 6, Z1 + 12), 0.02, 0.04, 'gravel', { noCast: true, noEdge: true });
  // floors: oak in the side bays, terrazzo in the nave
  E.floorRect(0, 0, 2 * BW, Z1, 0.0, 'oak'); E.floorRect(3 * BW, 0, X1, Z1, 0.0, 'oak'); E.floorRect(2 * BW, 0, 3 * BW, Z1, 0.0, 'terrazzo');
  // vault bays
  for (let i = 0; i < NX; i++) for (let j = 0; j < NZ; j++) E.vault(BW * i + BW / 2, BL * j + BL / 2, BL, R, SP, { slit: 0.7, mat: 'white' });
  // outer walls: windows in east/west (one per bay row), the entrance in the south, the arched ends closed
  const gapsEW = [0, 1, 2].map(j => [BL * j + BL / 2 - 1.8, BL * j + BL / 2 + 1.8, 3.6, 0.9]);
  E.wall([0, 0], [0, Z1], { h: SP, t: 0.35, mat: 'white', gaps: gapsEW, windowGlass: true }); E.wall([X1, 0], [X1, Z1], { h: SP, t: 0.35, mat: 'white', gaps: gapsEW, windowGlass: true });
  const tymp = (cx, cz) => { const s = new THREE.Shape(); s.absarc(0, 0, R + 0.25, 0, Math.PI, false); s.closePath(); const g = new THREE.ExtrudeGeometry(s, { depth: 0.3, bevelEnabled: false, curveSegments: 24 }); const m = new THREE.Mesh(g, E.M.white); m.position.set(cx, SP, cz); m.castShadow = true; m.receiveShadow = true; E.scene.add(m); E.roofs.push(m); };
  const ent = [BW * 2, BW * 3];
  for (let i = 0; i < NX; i++) { tymp(BW * i + BW / 2, -0.15); if (i !== 2) tymp(BW * i + BW / 2, Z1 - 0.15); }
  E.wall([0, 0], [X1, 0], { h: SP, t: 0.35, mat: 'white' });
  E.wall([0, Z1], [X1, Z1], { h: SP, t: 0.35, mat: 'white', gaps: [[ent[0] + 2.2, ent[0] + 6.8, 3.4]] });
  E.wall([ent[0], Z1], [ent[1], Z1], { h: SP + R, t: 0.3, mat: 'glass', gaps: [] });   // (the nave's end: glass under the arch)
  // interior walls under the springing: x lines with portals, z lines in the side columns
  const xl = [BW, 2 * BW, 3 * BW, 4 * BW];
  for (const x of xl) E.wall([x, 0], [x, Z1], { h: SP, t: 0.3, mat: 'white', gaps: [0, 1, 2].map(j => [BL * j + BL / 2 - 2.6, BL * j + BL / 2 + 2.6, 3.7]) });
  for (const [x0, x1] of [[0, 2 * BW], [3 * BW, X1]]) for (const z of [BL, 2 * BL]) E.wall([x0, z], [x1, z], { h: SP, t: 0.3, mat: 'white', gaps: [[BW - 2, BW + 2, 3.7]] });
  // freestanding walls (coulisses) in the nave and an open bay
  const c1 = E.wall([2 * BW + 1.5, 14], [2 * BW + 6.5, 12.2], { h: 3.2, t: 0.22 }), c2 = E.wall([2 * BW + 3, 30], [2 * BW + 7.6, 31.4], { h: 3.2, t: 0.22 }), c3 = E.wall([3 * BW + 2.5, 8], [3 * BW + 6.5, 8], { h: 3.2, t: 0.22 });
  E.art(c1, 2.4, 1, 2.3, 1.7, 'the-starry-night-m'); E.art(c1, 2.4, -1, 1.5, 1.9, 'girl-with-a-pearl-earring', 1.6); E.art(c2, 2.4, 1, 2.0, 1.4, 'luncheon-on-the-grass'); E.art(c3, 2, 1, 1.6, 1.2, 'irises');
  E.statue(2 * BW + 4.6, 22, { h: 1.0, s: 2.0 }); E.plinth(2 * BW + 6.6, 40, { obj: 1 }); E.plinth(2 * BW + 2.4, 46, { h: 0.8, obj: 0 }); E.plinth(2 * BW + 6, 6, { h: 1.1, obj: 2 });
  // pictures on the bay walls
  const wl = [[[BW, 0], [BW, BL]], [[2 * BW, 0], [2 * BW, BL]]];
  const L1 = { a: [BW, 2], b: [BW, 16], t: 0.3, y0: 0, h: SP, L: 14 }; E.art(L1, 3, -1, 2.4, 1.7, 'impression-sunrise'); E.art(L1, 7, -1, 1.5, 1.9, 'woman-with-a-parasol-madame-monet-and-her-son'); E.art(L1, 11, -1, 2.1, 1.5, 'garden-at-sainte-adresse');
  const L2 = { a: [3 * BW, 20], b: [3 * BW, 34], t: 0.3, y0: 0, h: SP, L: 14 }; E.art(L2, 3, 1, 2.2, 1.6, 'composition-vii'); E.art(L2, 7, 1, 1.3, 1.7, 'blue-nude'); E.art(L2, 11, 1, 2.0, 1.4, 'cafe-terrace-at-night');
  const L3 = { a: [0, 20], b: [0, 34], t: 0.35, y0: 0, h: SP, L: 14 }; E.art(L3, 4, -1, 2.2, 1.6, 'la-grenouillere'); E.art(L3, 10, -1, 1.6, 1.2, 'regatta-at-sainte-adresse');
  const L4 = { a: [X1, 2], b: [X1, 16], t: 0.35, y0: 0, h: SP, L: 14 }; E.art(L4, 4, 1, 2.4, 1.7, 'barge-haulers-on-the-volga'); E.art(L4, 10, 1, 1.5, 1.9, 'olympia');
  for (const [x, z] of [[22, 48], [24, 49], [13, 28], [31, 26], [31, 9], [6, 9], [40, 38]]) E.person(x, z);
  for (const [x, z, s] of [[-10, 6, 1.2], [-12, 30, 1], [-8, 52, 1.2], [X1 + 10, 8, 1.1], [X1 + 12, 34, 1.2], [X1 + 9, 52, 1], [22, -10, 1.1], [30, Z1 + 20, 1.2], [8, Z1 + 20, 1]]) E.tree(x, z, s);
  E.ghost(E.rectPts(X1 + 0.5, 0, X1 + BW, BL)); E.ghost(E.rectPts(X1 + 0.5, BL, X1 + BW, 2 * BL));
  return { bounds: [-12, -10, X1 + 24, Z1 + 14], sun: [-16, 52, 24], shadowSpan: 70, ambient: 2.3,
    labels: [[22.5, 27, 'ספינה פתוחה'], [4.5, 9, 'קמרון = חלל'], [13.5, 9, 'חלל'], [36, 27, 'חדר תערוכה'], [22.5, 50, 'כניסה'], [X1 + 5, 9, 'קמרון עתידי', 1], [X1 + 5, 27, 'קמרון עתידי', 1]],
    section: { at: 27, frame: [-8, -1, X1 + 8, 11.5], labels: [[22.5, 10.4, 'סדק אור בראש כל קמרון'], [4.5, 2.2, 'קמרון 9 מ׳'], [22.5, 2.2, 'ספינה מרכזית']] },
    views: {
      air: { eye: [-24, 38, Z1 + 38], look: [24, 0, 24], fov: 38 },
      e1: { eye: [22.5, 1.6, Z1 - 1.8], look: [22.5, 4.3, 8], fov: 66 },
      e2: { eye: [3.2, 1.6, 27], look: [34, 1.9, 27], fov: 62 },
      e3: { eye: [19.5, 1.6, 36], look: [25.5, 1.7, 24], fov: 64 } } };
}
