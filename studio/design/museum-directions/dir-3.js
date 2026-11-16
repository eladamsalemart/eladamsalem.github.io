// 3. The Light Clock (שעון האור): a round hall, a coffered dome with one round opening (the Pantheon's oculus; Boullee's cenotaph for Newton) and seven galleries radiating from it
// like the spokes of a wheel (Ledoux's Saline Royale). The sun is the architecture: a disc of light moves round the hall's floor and walls as the visitor's own hour goes by, and
// wakes the exhibition it touches; at night the dome becomes a sky of pin-holes (Boullee) and the plinths are lit by small lamps. Everything is baked once for each hour.
export function build(E) {
  const { THREE } = E, C = [50, 50], HR = 17, HH = 13, OC = 3.6, NW = 7, WW = 8.5, WL = 24, hour = E.hour ?? 11, night = hour >= 19.5 || hour < 5.5;
  E.ground(-20, -20, 120, 120, 'grass'); E.slab(E.circle(C[0], C[1], 24, 7), 0.02, 0.04, 'gravel', { noCast: true, noEdge: true });
  const pt = (r, a) => [C[0] + r * Math.cos(a), C[1] + r * Math.sin(a)];
  // the hall: floor of marble, a ring of walls of 28 facets with seven openings to the galleries and one entrance, a coffered dome
  E.slab(E.circle(C[0], C[1], HR, 56), 0.05, 0.05, 'marble', { noCast: true, noEdge: true });
  const N = 56, door = k => { const a = (k * 2 * Math.PI / NW) - Math.PI / 2; return a; };
  const openFacet = i => { const a = (i + 0.5) / N * 2 * Math.PI; for (let k = 0; k <= NW; k++) { let d = Math.abs(((a - (k * 2 * Math.PI / NW - Math.PI / 2)) + Math.PI * 3) % (2 * Math.PI) - Math.PI); if (d < 0.2) return true; } return false; };
  for (let i = 0; i < N; i++) { const a0 = i / N * 2 * Math.PI, a1 = (i + 1) / N * 2 * Math.PI; if (openFacet(i)) { E.seg(pt(HR, a0), pt(HR, a1), 4.6, HH - 4.6, 0.5, 'white', { noEdge: true }); continue; } E.seg(pt(HR, a0), pt(HR, a1), 0, HH, 0.5, 'white', { noEdge: true }); }
  E.coffDome(C[0], HH, C[1], HR, OC, { rings: 5, meri: 28, stars: hour >= 20 || hour < 5 });
  // the radiating galleries (seven): a corridor each with its own skylight, and an entrance (the eighth direction) as a porch
  const gal = []; for (let k = 0; k < NW; k++) { const a = door(k) + Math.PI / NW; gal.push(a); }
  const ents = [Math.PI / 2];
  const wing = (a, len, w, h, mat = 'white', lights = true) => {
    const u = [Math.cos(a), Math.sin(a)], n = [-u[1], u[0]], s0 = HR - 0.2, s1 = HR + len, P = (s, l) => [C[0] + u[0] * s + n[0] * l, C[1] + u[1] * s + n[1] * l];
    E.slab([P(s0, -w / 2), P(s1, -w / 2), P(s1, w / 2), P(s0, w / 2)], 0.05, 0.05, 'oak', { noCast: true, noEdge: true });
    E.seg(P(s0, -w / 2), P(s1, -w / 2), 0, h, 0.4, mat, { noEdge: true }); E.seg(P(s0, w / 2), P(s1, w / 2), 0, h, 0.4, mat, { noEdge: true }); E.seg(P(s1, -w / 2), P(s1, w / 2), 0, h, 0.4, mat, { noEdge: true });
    const lt = []; if (lights) for (let i = 0; i < 3; i++) lt.push([P(s0 + 3 + i * 7, -2), P(s0 + 3 + i * 7, 2), P(s0 + 3 + i * 7 + 4.5, 2), P(s0 + 3 + i * 7 + 4.5, -2)]);
    E.slab([P(s0, -w / 2 - 0.3), P(s1 + 0.3, -w / 2 - 0.3), P(s1 + 0.3, w / 2 + 0.3), P(s0, w / 2 + 0.3)], h + 0.4, 0.4, 'white', { roof: true, holes: lt });
    for (const l of lt) E.slab(l, h + 0.3, 0.03, 'glass', { roof: true });
    return { P, u, n, s0, s1 };
  };
  const W7 = gal.map((a, k) => wing(a, WL, WW, 5.2 + (k % 3) * 0.6)); const WE = wing(Math.PI / 2, 12, 7, 4.4);
  // pictures in the galleries
  const picture = ['impression-sunrise', 'composition-vii', 'woman-with-a-parasol-madame-monet-and-her-son', 'olympia', 'la-grenouillere', 'cafe-terrace-at-night', 'luncheon-on-the-grass', 'irises', 'blue-nude', 'dance', 'regatta-at-sainte-adresse', 'barge-haulers-on-the-volga'];
  let pi = 0; for (const w of W7) for (const side of [-1, 1]) for (const s of [6, 12, 18]) {
    const a = w.P(w.s0 + s - 1.1, side * (WW / 2 - 0.2)), b = w.P(w.s0 + s + 1.1, side * (WW / 2 - 0.2)); const nm = picture[pi++ % picture.length];
    const nrm = E.normal(a, b, 1), inward = ((C[0] + w.u[0] * (w.s0 + s)) - a[0]) * nrm[0] + ((C[1] + w.u[1] * (w.s0 + s)) - a[1]) * nrm[1];
    E.art({ a, b, t: 0.4, y0: 0, h: 5 }, 1.1, (w.P(w.s0 + s, 0)[0] - a[0]) * nrm[0] + (w.P(w.s0 + s, 0)[1] - a[1]) * nrm[1] > 0 ? 1 : -1, 2.0, 1.4, nm, 1.55); void inward;
  }
  // the hall's content: a ring of plinths, the statue at the centre, radial blades (coulisses)
  E.statue(C[0], C[1], { h: 1.2, s: 2.4 });
  for (let i = 0; i < 12; i++) { const a = i / 12 * 2 * Math.PI + 0.13, p = pt(10.2, a); if (i % 3 === 1) continue; E.plinth(p[0], p[1], { obj: i % 5, h: 0.9 + (i % 2) * 0.25 }); }
  for (const a of [0.45, 2.2, 3.6, 5.1]) { const u = [Math.cos(a), Math.sin(a)], p0 = pt(6.2, a), p1 = [p0[0] + u[0] * 4.8, p0[1] + u[1] * 4.8]; const w = E.wall(p0, p1, { h: 3.8, t: 0.24 }); E.art(w, 2.4, 1, 2.0, 1.4, picture[(Math.round(a * 3)) % picture.length]); E.art(w, 2.4, -1, 1.3, 1.7, 'blue-nude'); }
  for (const [x, z] of [[58, 52], [44, 58], [40, 44], [55, 40]]) E.person(x, z); E.bench(60, 58, 0.6);
  // the sun: the disc of light the oculus throws, by the hour (elevation and direction from the clock; the beam and its patch on the floor)
  const el = Math.max(8, 56 * Math.sin(Math.PI * (hour - 6.5) / 11)) * Math.PI / 180, az = Math.PI * (hour - 6.5) / 11, day = hour > 6.5 && hour < 17.5;
  if (day) { const dir = [-Math.cos(el) * Math.sin(az) * -1, Math.sin(el), Math.cos(el) * Math.cos(az)]; const dx = -Math.cos(az) * 1, dz = -Math.sin(az); const top = [C[0], HH + HR - 1.2, C[1]];
    const L = (HH + HR - 1.2) / Math.tan(el), hit = [C[0] + Math.cos(az) * L * -1, 0.05, C[1] + Math.sin(az) * L * -1]; void dir; void dx; void dz;
    E.beam(top, [hit[0], 0.3, hit[2]], OC * 0.9, OC * 0.9 * 1.05, 0xfff0c8, 0.2); E.disc(hit[0], 0.07, hit[2], OC * 1.2, OC * 1.2 / Math.sin(el) * 0.9, -Math.atan2(hit[2] - C[1], hit[0] - C[0]), 0xfff0c8, 0.85); }
  const wingMid = k => W7[k].P(W7[k].s0 + 12, 0);
  if (night) { for (let i = 0; i < 12; i++) { const a2 = i / 12 * 2 * Math.PI + 0.13, p2 = pt(10.2, a2); if (i % 3 !== 1) E.lamp(p2[0], 2.4, p2[1], 0xffd9a0, 18, 11); } E.lamp(C[0], 3.2, C[1], 0xffe6b8, 26, 14); E.beam([C[0], HH + HR - 1.2, C[1]], [C[0], 0.3, C[1]], OC * 0.9, OC * 1.4, 0xb9c8ff, 0.07); E.disc(C[0], 0.07, C[1], OC * 1.5, OC * 1.5, 0, 0xb9c8ff, 0.5); }
  return { bounds: [14, 14, 88, 88], centre: [50, 50], sun: night ? [0, 60, 0] : E.sunFor(hour, 70), sunPower: night ? 0 : 2.8, ambient: night ? 0.35 : 2.0, envI: night ? 0.05 : 0.35, sky: night ? ['#06091a', '#101c3a', '#27375a'] : undefined, shadowSpan: 64, fog: null,
    labels: [[50, 50, 'האולם העגול (הכיפה למעלה)'], [50, 76, 'כניסה'], ...W7.map((w, k) => [...w.P(w.s0 + 12, 0), 'גלריה ' + (k + 1)]), [76, 22, 'גלריה 8 בעתיד', 1]],
    section: { at: 50, frame: [12, -1, 88, 31], labels: [[50, 28.5, 'פתח העין: שמש נעה'], [50, 10, 'האולם: 13 מ׳ עד הכיפה'], [22, 4, 'גלריה'], [78, 4, 'גלריה']] },
    views: {
      air: { eye: [-6, 46, 104], look: [52, 6, 46], fov: 38 },
      e1: { eye: [50, 1.6, 64.5], look: [50, 9, 44], fov: 72 },
      e2: { eye: [45, 1.6, 53], look: [56, 2.6, 36], fov: 68 },
      e3: { eye: [W7[2].P(W7[2].s0 + 3, 0)[0], 1.6, W7[2].P(W7[2].s0 + 3, 0)[1]], look: [W7[2].P(W7[2].s0 + 22, 0)[0], 2.4, W7[2].P(W7[2].s0 + 22, 0)[1]], fov: 64 } } };
}
