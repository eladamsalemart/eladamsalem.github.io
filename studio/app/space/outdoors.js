// The outside of an open-air museum (the Cluster): a sky that follows the visitor's own clock, a tree line made of real foliage
// (the garden panorama's trees, its sky cut away), and street lamps that come on when it is dark. Nothing here needs a network
// beyond one picture; the interiors are lit by their own lights and do not change with the hour.
//   envFor(hour) is pure (the museum's builder uses it to tint the ground and the houses' outer skin before the viewer is up);
//   addOutdoors(...) puts the sky, the trees and the lamps in the viewer's scene.
// The hour is the phone's local time; ?hour=22 (or 22.5) in the address overrides it, for looking at another time of day.

const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), smooth = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
export function localHour() {
  try { const q = new URLSearchParams(location.search).get('hour'); if (q != null && q !== '' && !isNaN(+q)) return ((+q % 24) + 24) % 24; } catch (e) { /* no address */ }
  const d = new Date(); return d.getHours() + d.getMinutes() / 60;
}
// the sun by the clock: up from 6:30 to 17:30 (a November day here), east at sunrise, south at noon, west at sunset
export function envFor(hour = localHour()) {
  const h = hour, up = h >= 6.5 && h <= 17.5, elev = up ? 52 * Math.sin(Math.PI * (h - 6.5) / 11) : -16 - 10 * Math.cos(Math.PI * (((h - 17.5 + 24) % 24) / 13 * 2 - 1));
  const day = smooth(-5, 9, elev), warm = Math.exp(-(((elev - 3) / 9) ** 2)) * (up ? 1 : 0.7);
  const az = up ? Math.PI / 2 + Math.PI * (h - 6.5) / 11 : Math.PI * 1.5;                 // (from north, clockwise)
  // what the ground and the walls outside are multiplied by: full daylight, a warm late sun, or the blue of night
  let tint = mix([0.2, 0.25, 0.4], [1, 1, 1], day); tint = mix(tint, [1, 0.86, 0.74], clamp(warm * 0.8, 0, 0.8) * day);
  return { hour: h, elev, az, day, night: 1 - day, warm, tint, lamps: smooth(0.55, 0.15, day) };
}
export const tintHex = (hex, env) => { const c = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16)); return '#' + c.map((v, i) => Math.round(clamp(v * env.tint[i], 0, 255)).toString(16).padStart(2, '0')).join(''); };

export async function addOutdoors({ THREE, scene, spec, loadTex, mark, renderer }) {
  const o = spec.outdoors; if (!o) return;
  const env = envFor(o.hour), [CX, CZ] = o.centre, aniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  // --- the sky: one equirectangular picture, drawn for this hour (gradient, sun's glow, clouds by day; moon and stars by night)
  {
    const W = 2048, H = 1024, c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d');
    const zen = mix([6, 9, 24], [64, 116, 184], env.day), hor = mix([22, 30, 54], [206, 222, 224], env.day);
    const dusk = mix(zen, [48, 62, 112], env.warm * 0.6), dawn = mix(hor, [250, 160, 104], env.warm * 0.85);
    const g = x.createLinearGradient(0, 0, 0, H / 2); g.addColorStop(0, `rgb(${zen.map(Math.round)})`); g.addColorStop(0.55, `rgb(${dusk.map(Math.round)})`); g.addColorStop(1, `rgb(${dawn.map(Math.round)})`);
    x.fillStyle = g; x.fillRect(0, 0, W, H / 2); x.fillStyle = `rgb(${dawn.map(v => Math.round(v * 0.92))})`; x.fillRect(0, H / 2, W, H / 2);
    // direction -> picture: three's equirect mapping: u = atan2(z, x) / 2pi + 0.5, v = asin(y) / pi + 0.5 (north is -z)
    const at = (az, el) => { const lat = el * Math.PI / 180, lon = Math.atan2(-Math.cos(az), Math.sin(az)); return [(lon / (2 * Math.PI) + 0.5) * W, (0.5 - lat / Math.PI) * H]; };
    const rnd = (() => { let s = 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
    if (env.day > 0.05) {                                                   // clouds: soft, wide, thin near the horizon
      x.save(); for (let i = 0; i < 46; i++) {
        const px = rnd() * W, el = 6 + rnd() * 46, py = (0.5 - el / 180) * H, w = 90 + rnd() * 240, h = 14 + rnd() * 26, a = (0.10 + rnd() * 0.18) * env.day;
        const cl = x.createRadialGradient(px, py, 0, px, py, w); cl.addColorStop(0, `rgba(255,${Math.round(250 - env.warm * 40)},${Math.round(246 - env.warm * 90)},${a})`); cl.addColorStop(1, 'rgba(255,255,255,0)');
        x.save(); x.translate(px, py); x.scale(1, h / w); x.translate(-px, -py); x.fillStyle = cl; x.fillRect(px - w, py - w, 2 * w, 2 * w); x.restore();
      } x.restore();
    }
    if (env.elev > -8) { const [sx, sy] = at(env.az, Math.max(env.elev, -2)); for (const [r, a, col] of [[330, 0.38, '255,225,170'], [120, 0.55, '255,236,200'], [26, 1, '255,250,235']]) {
      const gl = x.createRadialGradient(sx, sy, 0, sx, sy, r); gl.addColorStop(0, `rgba(${col},${a * clamp(env.day + 0.3, 0, 1)})`); gl.addColorStop(1, `rgba(${col},0)`); x.fillStyle = gl; x.fillRect(sx - r, sy - r, 2 * r, 2 * r); } }
    if (env.night > 0.2) {
      x.save(); x.globalAlpha = clamp((env.night - 0.2) / 0.5, 0, 1);
      for (let i = 0; i < 900; i++) { const px = rnd() * W, el = Math.asin(rnd() * 0.97) * 180 / Math.PI, py = (0.5 - el / 180) * H, s = rnd(); x.fillStyle = `rgba(255,255,${230 + Math.round(rnd() * 25)},${0.3 + 0.6 * s * s})`; x.beginPath(); x.arc(px, py, 0.35 + 0.8 * s * s * s, 0, 7); x.fill(); }
      const [mx, my] = at(Math.PI * 0.62, 34), mg = x.createRadialGradient(mx, my, 0, mx, my, 150); mg.addColorStop(0, 'rgba(210,225,255,0.5)'); mg.addColorStop(1, 'rgba(210,225,255,0)'); x.fillStyle = mg; x.fillRect(mx - 150, my - 150, 300, 300);
      x.fillStyle = '#f4f1e6'; x.beginPath(); x.arc(mx, my, 17, 0, 7); x.fill(); x.fillStyle = 'rgba(190,190,180,0.5)'; for (const [dx, dy, r] of [[-5, -4, 4.5], [5, 5, 3.5], [3, -7, 2.5]]) { x.beginPath(); x.arc(mx + dx, my + dy, r, 0, 7); x.fill(); }
      x.restore();
    }
    const t = new THREE.CanvasTexture(c); t.mapping = THREE.EquirectangularReflectionMapping; t.colorSpace = THREE.SRGBColorSpace; scene.background = t;
  }
  // --- the tropical garden (ROADMAP 19): terrace, lawn, beds, instanced palms/bananas/ferns/vines; haze in the sky's own horizon colour
  if (o.tropics) {
    const hor = mix([22, 30, 54], [206, 222, 224], env.day), hz = mix(hor, [250, 160, 104], env.warm * 0.85);
    import('./tropics.js').then(m => m.addTropics({ THREE, scene, o, env, hazeRGB: hz.map(v => v * 0.97), loadTex, mark, phone: matchMedia('(pointer: coarse)').matches })).catch(e => console.warn('tropics', e));
  }
  // --- the tree line: a great ring of the panorama's real foliage (the sky cut out of it), darker and bluer at night, warm at sunset
  if (o.treeline && !o.tropics) loadTex(o.treeline).then(tx => {
    if (!tx) return;
    tx.wrapS = THREE.RepeatWrapping; tx.repeat.x = -1; tx.offset.x = 0.12; tx.anisotropy = aniso; tx.needsUpdate = true;
    const Rr = o.treeRadius || 70, Hh = o.treeHeight || 30;
    const m = new THREE.MeshBasicMaterial({ map: tx, transparent: true, depthWrite: false, toneMapped: false, side: THREE.BackSide, color: new THREE.Color(...env.tint.map(v => Math.pow(v, 1.05))) });
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(Rr, Rr, Hh, 160, 1, true), m); ring.position.set(CX, Hh / 2 - 1.2, CZ); ring.renderOrder = -5; ring.frustumCulled = false; ring.userData.kind = 'outside'; scene.add(ring); mark();
  });
  // --- street lamps: a slim post, a head that glows after dusk, its halo and the pool of light on the ground
  const glowTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'), g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, 'rgba(255,236,190,1)'); g.addColorStop(0.25, 'rgba(255,214,150,0.55)'); g.addColorStop(1, 'rgba(255,200,120,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c); })();
  const post = new THREE.MeshBasicMaterial({ color: 0x2b2d2f, toneMapped: false }), lit = new THREE.Color(0xfff0c4), off = new THREE.Color(0xb9b8b0);
  for (const [lx, lz] of o.lamps || []) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.07, 4.4, 10), post); pole.position.set(lx, 2.2, lz); scene.add(pole);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.06, 0.06), post); arm.position.set(lx + 0.3, 4.38, lz); scene.add(arm);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 14, 10), new THREE.MeshBasicMaterial({ color: env.lamps > 0.2 ? lit : off, toneMapped: false })); head.position.set(lx + 0.6, 4.3, lz); scene.add(head);
    if (env.lamps > 0.02) {
      const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, transparent: true, opacity: env.lamps * 0.95, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false })); halo.scale.set(3.6, 3.6, 1); halo.position.copy(head.position); scene.add(halo);
      const pool = new THREE.Mesh(new THREE.CircleGeometry(5.6, 40), new THREE.MeshBasicMaterial({ map: glowTex, transparent: true, opacity: env.lamps * 0.5, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
      pool.rotation.x = -Math.PI / 2; pool.position.set(lx + 0.6, 0.016, lz); scene.add(pool);
    }
  }
  mark();
}
