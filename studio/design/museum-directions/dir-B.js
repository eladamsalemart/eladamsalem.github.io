// B. The Nave and its Chapels: one tall, long, top- and side-lit nave (the central hall) with chapel-galleries opening off both sides, and a transept at the end where the
// history wing widens (the basilica as a museum: Kunsthaus Zurich's hall, Kunstmuseum Basel). Hierarchy: nave > chapels > transept.
export function build(E) {
  const NX1 = 60, NZ0 = 18, NZ1 = 32, NH = 10.4, CH = 6.0, CD = 10, CW = 12, TX1 = 78;
  E.ground(-30, -30, TX1 + 30, 76, 'grass'); E.slab(E.rectPts(-14, 22, 0, 28), 0.02, 0.04, 'gravel', { noCast: true, noEdge: true });
  E.floorRect(0, NZ0, NX1, NZ1, 0, 'terrazzo'); E.floorRect(0, NZ0 - CD, NX1, NZ0, 0, 'oak'); E.floorRect(0, NZ1, NX1, NZ1 + CD, 0, 'oak'); E.floorRect(NX1, 4, TX1, 46, 0, 'oak'); E.floorRect(NX1, NZ0, TX1, NZ1, 0, 'terrazzo');
  // the nave: tall walls with arcade openings into the chapels, a clerestory band above the chapel roofs, a roof with long skylights
  const gaps = []; for (let i = 0; i < 5; i++) gaps.push([i * CW + CW / 2 - 2.2, i * CW + CW / 2 + 2.2, 4.8]);
  E.wall([0, NZ0], [NX1, NZ0], { h: CH, t: 0.4, gaps }); E.wall([0, NZ1], [NX1, NZ1], { h: CH, t: 0.4, gaps });
  for (const z of [NZ0, NZ1]) E.wall([0, z], [NX1, z], { h: NH - CH, y0: CH, t: 0.3, mat: 'glass', opts: {} });
  E.wall([0, NZ0], [0, NZ1], { h: NH, t: 0.4, gaps: [[4.5, 9.5, 4.4]] }); E.wall([0, NZ0 - 0.2], [0, NZ0 + 0.2], { h: 0.1 });
  E.roof(-0.4, NZ0 - 0.4, NX1 + 0.4, NZ1 + 0.4, NH, { t: 0.5, lights: [[4, NZ0 + 2.5, 18, NZ1 - 2.5], [22, NZ0 + 2.5, 38, NZ1 - 2.5], [42, NZ0 + 2.5, 57, NZ1 - 2.5]] });
  // the chapels: five a side, each 12 x 10 m, a lantern in the roof, a window in the outer wall
  for (const [z0, z1, zo] of [[NZ0 - CD, NZ0, NZ0 - CD], [NZ1, NZ1 + CD, NZ1 + CD]]) {
    E.wall([0, zo], [NX1, zo], { h: CH, t: 0.4, gaps: [0, 1, 2, 3, 4].map(i => [i * CW + CW / 2 - 1.5, i * CW + CW / 2 + 1.5, 4.4, 1.2]), windowGlass: true });
    for (let i = 0; i <= 5; i++) E.wall([i * CW, z0], [i * CW, z1], { h: CH, t: 0.3 });
    const lights = [0, 1, 2, 3, 4].map(i => [i * CW + 3.2, z0 + 2.2, i * CW + CW - 3.2, z1 - 2.2]);
    E.roof(-0.2, z0 - 0.2, NX1 + 0.2, z1 + 0.2, CH + 0.3, { t: 0.35, lights });
  }
  // the transept at the end: crossing with the nave and two arms, each arm three bays that step wider and higher
  E.wall([NX1, 4], [NX1, NZ0], { h: 7.4, t: 0.4 }); E.wall([NX1, NZ1], [NX1, 46], { h: 7.4, t: 0.4 });
  E.wall([NX1, 4], [TX1, 4], { h: 7.4, t: 0.4, gaps: [[4, 12, 3.6, 0.9]], windowGlass: true }); E.wall([NX1, 46], [TX1, 46], { h: 7.4, t: 0.4, gaps: [[4, 12, 3.6, 0.9]], windowGlass: true });
  E.wall([TX1, 4], [TX1, 46], { h: 7.4, t: 0.4, gaps: [[10, 16, 5.2, 1.0], [34, 40, 5.2, 1.0], [20, 30, 6.4, 1.4]], windowGlass: true });
  E.wall([NX1, 11], [TX1, 11], { h: 7.4, t: 0.3, gaps: [[5, 11, 4.4]] }); E.wall([NX1, 39], [TX1, 39], { h: 7.4, t: 0.3, gaps: [[5, 11, 4.4]] });
  E.roof(NX1 - 0.4, 3.6, TX1 + 0.4, 46.4, 7.8, { t: 0.4, lights: [[NX1 + 2, 6, TX1 - 2, 9.5], [NX1 + 2, 13.5, TX1 - 2, NZ0 - 1], [NX1 + 2, 33, TX1 - 2, 36.5], [NX1 + 2, 41.5, TX1 - 2, 44], [NX1 + 2, NZ0 + 2, TX1 - 2, NZ1 - 2]] });
  // the nave's content: coulisses in pairs, statues along the axis, benches
  const c1 = E.wall([8, 21.4], [14, 21.4], { h: 3.6, t: 0.24 }), c2 = E.wall([24, 28.6], [30.4, 28.6], { h: 3.6, t: 0.24 }), c3 = E.wall([42, 21.4], [48, 21.4], { h: 3.6, t: 0.24 });
  E.art(c1, 3, 1, 2.6, 1.9, 'the-starry-night-m'); E.art(c1, 3, -1, 1.5, 1.9, 'girl-with-a-pearl-earring', 1.6); E.art(c2, 3, 1, 2.2, 1.6, 'luncheon-on-the-grass'); E.art(c2, 3, -1, 1.6, 1.2, 'irises'); E.art(c3, 3, 1, 2.0, 1.45, 'olympia');
  E.statue(18, 25, { h: 1.1, s: 2.2 }); E.statue(36, 25, { h: 1.1, s: 2.0 }); E.plinth(52, 25, { obj: 1 }); E.plinth(11, 25.6, { h: 0.9, obj: 2 }); E.bench(30, 25.2); E.bench(47, 28.6);
  // pictures in the chapels and the transept
  const P = (a, b, t = 0.3) => ({ a, b, t, y0: 0, h: CH, L: Math.hypot(b[0] - a[0], b[1] - a[1]) });
  const k1 = P([CW, NZ0 - 1], [CW, NZ0 - CD + 1]); E.art(k1, 2, 1, 2.2, 1.6, 'impression-sunrise'); E.art(k1, 6, 1, 1.5, 1.9, 'woman-with-a-parasol-madame-monet-and-her-son');
  const k2 = P([3 * CW, NZ1 + 1], [3 * CW, NZ1 + CD - 1]); E.art(k2, 2, -1, 2.0, 1.5, 'la-grenouillere'); E.art(k2, 6, -1, 1.5, 1.9, 'blue-nude');
  const k3 = P([2 * CW, NZ0 - 1], [2 * CW, NZ0 - CD + 1]); E.art(k3, 3, 1, 2.6, 1.8, 'composition-vii'); E.art(k3, 7, 1, 1.4, 1.8, 'dance');
  const t1 = P([NX1 + 6, 11], [NX1 + 14, 11], 0.3); E.art(t1, 2, 1, 2.0, 1.5, 'regatta-at-sainte-adresse'); E.art(t1, 5.5, 1, 1.5, 1.9, 'self-portrait-in-a-straw-hat');
  E.statue(TX1 - 5, 25, { h: 1.2, s: 2.3 }); E.plinth(NX1 + 6, 8, { obj: 3 }); E.plinth(NX1 + 9, 42, { h: 1.0, obj: 4 });
  for (const [x, z] of [[14, 24], [33, 26], [50, 27.5], [65, 8], [70, 42], [30, 12], [18, 38]]) E.person(x, z);
  for (const [x, z, s] of [[-10, 8, 1.2], [-12, 44, 1], [20, -9, 1.1], [50, -10, 1.2], [20, 62, 1.2], [58, 62, 1], [TX1 + 10, 10, 1.1], [TX1 + 11, 38, 1.2]]) E.tree(x, z, s);
  E.ghost(E.rectPts(NX1, NZ1 + 14, TX1, NZ1 + 28));
  return { bounds: [-16, -8, TX1 + 14, 56], sun: [-14, 54, 26], shadowSpan: 70, ambient: 2.3,
    labels: [[30, 25, 'ספינה מרכזית (10 מ׳ גובה)'], [6, 13, 'קפלה'], [18, 13, 'קפלה'], [30, 13, 'קפלה'], [42, 13, 'קפלה'], [54, 13, 'קפלה'], [6, 37, 'קפלה'], [30, 37, 'קפלה'], [69, 25, 'חלל-עיצור'], [69, 8, 'זרוע צפון (תולדות)'], [69, 42, 'זרוע דרום'], [-7, 25, 'כניסה'], [TX1 - 8, 54, 'אגף עתידי', 1]],
    section: { at: 24, axis: 'x', frame: [-4, -1, 56, 12.5], labels: [[25, 9.4, 'חלונות עליונים (קלריסטורי)'], [40, 3.2, 'ספינה'], [5, 2.8, 'קפלה'], [47, 2.8, 'קפלה']] },
    views: {
      air: { eye: [-26, 44, 68], look: [34, 0, 22], fov: 38 },
      e1: { eye: [1.6, 1.6, 25], look: [46, 3.2, 25], fov: 66 },
      e2: { eye: [28, 1.6, 22.6], look: [30, 2.2, 10], fov: 66 },
      e3: { eye: [64, 1.6, 9], look: [74, 2.4, 26], fov: 70 } } };
}
