// A small architect's sketch-model engine (three.js): walls with real window holes, slabs with skylight holes, barrel vaults with a light slit,
// glass walls, domes, ramps, plinths, pictures, people, trees. One description of a building gives the plan, the section, the bird's-eye view and
// the views at eye level (render.cjs photographs them). Not the app's viewer: a quick model to choose a direction from.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

export const ART = '../../app/data/demo/works/', REN = '../../app/data/museum/renaissance/works/';
export function createEngine({ view, W, H }) {
  const scene = new THREE.Scene(), mgr = new THREE.LoadingManager(), TL = new THREE.TextureLoader(mgr);
  const roofs = [], ghosts = [], glass = [], edgeList = [];
  const E = { THREE, scene, mgr, roofs, ghosts, glass, view, W, H, lines: view === 'plan' || view === 'section' || view === 'air' };
  const rep = (t, s) => { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.repeat.set(1 / s, 1 / s); return t; };
  const canvasTex = (w, h, draw, rp = 4) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };
  const conc = TL.load('../../app/data/rooms/detail/concrete.jpg'); conc.wrapS = conc.wrapT = THREE.RepeatWrapping; conc.colorSpace = THREE.SRGBColorSpace;
  const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.9, metalness: 0, ...o });
  const brickTex = canvasTex(256, 256, (x, w, h) => { x.fillStyle = '#9c5b45'; x.fillRect(0, 0, w, h); for (let r = 0; r < 16; r++) for (let c = 0; c < 8; c++) { const o = r % 2 ? 16 : 0; x.fillStyle = `rgb(${150 + Math.random() * 40},${82 + Math.random() * 20},${64 + Math.random() * 14})`; x.fillRect(c * 32 + o + 1, r * 16 + 1, 30, 14); } });
  const terrazzoTex = canvasTex(256, 256, (x, w, h) => { x.fillStyle = '#dcd8ce'; x.fillRect(0, 0, w, h); for (let i = 0; i < 700; i++) { x.fillStyle = ['rgba(255,255,255,.5)', 'rgba(90,80,70,.25)', 'rgba(190,160,130,.35)'][i % 3]; x.fillRect(Math.random() * w, Math.random() * h, 2 + Math.random() * 3, 2 + Math.random() * 3); } });
  const oakTex = canvasTex(256, 256, (x, w, h) => { x.fillStyle = '#c9a676'; x.fillRect(0, 0, w, h); for (let k = 0; k < h; k += 16) { x.fillStyle = `rgba(${Math.random() < 0.5 ? '255,255,255' : '90,66,40'},${0.04 + Math.random() * 0.08})`; x.fillRect(0, k, w, 16); x.fillStyle = 'rgba(70,50,30,.2)'; x.fillRect(0, k, w, 1); } });
  const slateTex = canvasTex(256, 256, (x, w, h) => { x.fillStyle = '#58595a'; x.fillRect(0, 0, w, h); for (let i = 0; i < 1500; i++) { x.fillStyle = `rgba(${Math.random() < 0.5 ? '255,255,255' : '0,0,0'},.07)`; x.fillRect(Math.random() * w, Math.random() * h, 3, 3); } x.strokeStyle = 'rgba(0,0,0,.35)'; for (let k = 0; k <= w; k += 85) { x.beginPath(); x.moveTo(k, 0); x.lineTo(k, h); x.moveTo(0, k); x.lineTo(w, k); x.stroke(); } });
  const M = E.M = {
    white: std(0xf4f2ec), warm: std(0xe9e3d6), sand: std(0xdcd0bb), concrete: std(0xb9b7b1, { map: conc }), darkc: std(0x6f6e69, { map: conc }),
    floor: std(0xcfccc4, { roughness: 0.55 }), oak: std(0xffffff, { map: oakTex, roughness: 0.65 }), terrazzo: std(0xffffff, { map: terrazzoTex, roughness: 0.5 }), slate: std(0xffffff, { map: slateTex, roughness: 0.6 }),
    brick: std(0xffffff, { map: brickTex }), black: std(0x1c1d1f), ink: std(0x24282b), steel: std(0x3a3d40, { roughness: 0.5, metalness: 0.3 }), green: std(0x2f4a3c), terra: std(0xb5694a), sage: std(0xcfd8c8), ochre: std(0xe0cf9f),
    grass: std(0x9fb383), gravel: std(0xd9d2c0), water: std(0x8fa7ad, { roughness: 0.2 }), stone: std(0xe6e1d6, { roughness: 0.6 }), bronze: std(0x6a543a, { roughness: 0.45, metalness: 0.5 }),
    marble: std(0xf0ece2, { roughness: 0.35 }), leaf: std(0x7d9a68), trunk: std(0x6b5a48), timber: std(0x8a6a48),
    glass: new THREE.MeshStandardMaterial({ color: 0xcfe3e6, transparent: true, opacity: 0.18, roughness: 0.05, metalness: 0.2, side: THREE.DoubleSide, depthWrite: false }),
    milk: new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, side: THREE.DoubleSide }),
  };
  const mat = m => typeof m === 'string' ? M[m] : m;
  const edgeMat = new THREE.LineBasicMaterial({ color: 0x2b2a27, transparent: true, opacity: 0.38 });
  function reg(mesh, o = {}) {
    mesh.castShadow = !o.noCast; mesh.receiveShadow = true; scene.add(mesh);
    if (o.roof) roofs.push(mesh);
    if (E.lines && !o.noEdge && mesh.geometry && !o.glass) { const l = new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry, 25), edgeMat); l.position.copy(mesh.position); l.rotation.copy(mesh.rotation); scene.add(l); if (o.roof) roofs.push(l); }
    return mesh;
  }
  const uvScale = (g, sx, sy, k = 2.5) => { const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * sx / k, uv.getY(i) * sy / k); };
  E.hour = (() => { try { const v = new URLSearchParams(location.search).get('hr'); return v == null ? null : +v; } catch (e) { return null; } })();
  E.sunFor = (h = 12, R = 70) => { const a = Math.PI * (h - 6.5) / 11, el = Math.max(10, 56 * Math.sin(Math.PI * (h - 6.5) / 11)) * Math.PI / 180; return [R * Math.cos(el) * Math.cos(a), R * Math.sin(el), R * Math.cos(el) * Math.sin(a)]; };
  E.lamp = (x, y, z, color = 0xffe2b0, intensity = 40, dist = 14) => { const l = new THREE.PointLight(color, intensity, dist, 1.6); l.position.set(x, y, z); scene.add(l); const g = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 8), new THREE.MeshBasicMaterial({ color })); g.position.copy(l.position); scene.add(g); return l; };
  E.groups = {}; E.group = (name, fn) => { const n0 = scene.children.length; fn(); (E.groups[name] ||= []).push(...scene.children.slice(n0)); };
  const E_ = E;
  E.box = (cx, cy, cz, sx, sy, sz, m, ry = 0, o = {}) => {
    const g = new THREE.BoxGeometry(sx, sy, sz); if (mat(m).map) { const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) { const f = Math.floor(i / 4), su = f < 2 ? sz : sx, sv = (f === 2 || f === 3) ? sz : sy; uv.setXY(i, uv.getX(i) * su / 2.5, uv.getY(i) * sv / 2.5); } }
    const b = new THREE.Mesh(g, mat(m)); b.position.set(cx, cy, cz); b.rotation.y = ry; return reg(b, o);
  };
  const len = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]);
  const lerp2 = (a, b, s) => { const L = len(a, b); return [a[0] + (b[0] - a[0]) * s / L, a[1] + (b[1] - a[1]) * s / L]; };
  E.len = len; E.along = lerp2;
  E.seg = (a, b, y0, h, t, m, o) => { const L = len(a, b); if (L < 0.02 || h < 0.02) return; return E.box((a[0] + b[0]) / 2, y0 + h / 2, (a[1] + b[1]) / 2, L, h, t, m, -Math.atan2(b[1] - a[1], b[0] - a[0]), o); };
  // a wall a -> b (plan coordinates [x, z]); gaps: [from, to, top = door height, sill = 0] along it. mat 'glass' makes a curtain wall with mullions
  E.wall = (a, b, o = {}) => {
    const h = o.h ?? 4, y0 = o.y0 ?? 0, t = o.t ?? 0.3, m = o.mat || 'white', L = len(a, b), isGlass = m === 'glass';
    const put = (p, q, yy, hh) => { if (hh < 0.02) return; if (isGlass) E.glassSeg(p, q, yy, hh); else E.seg(p, q, yy, hh, t, m, o.opts); };
    let s = 0;
    for (const [g0, g1, top = 2.7, sill = 0] of [...(o.gaps || [])].sort((x, y) => x[0] - y[0])) {
      put(lerp2(a, b, s), lerp2(a, b, g0), y0, h);
      if (sill > 0) put(lerp2(a, b, g0), lerp2(a, b, g1), y0, sill);
      if (top < h) put(lerp2(a, b, g0), lerp2(a, b, g1), y0 + top, h - top);
      if (o.windowGlass && sill > 0 || o.windowGlass) E.glassSeg(lerp2(a, b, g0), lerp2(a, b, g1), y0 + sill, Math.min(top, h) - sill, true);
      s = g1;
    }
    put(lerp2(a, b, s), b, y0, h);
    return { a, b, t, y0, h, L };
  };
  E.glassSeg = (a, b, y0, h, thin) => {
    const L = len(a, b); if (L < 0.05) return;
    const p = E.seg(a, b, y0, h, 0.03, 'glass', { noCast: true, glass: true, noEdge: true }); glass.push(p); p.receiveShadow = false;
    const n = Math.max(1, Math.round(L / (thin ? 2 : 2.4))), ang = -Math.atan2(b[1] - a[1], b[0] - a[0]);
    for (let i = 0; i <= n; i++) { const c = lerp2(a, b, L * i / n); E.box(c[0], y0 + h / 2, c[1], 0.05, h, 0.09, 'steel', ang, { noEdge: true }); }
    E.seg(a, b, y0 + h - 0.06, 0.06, 0.09, 'steel', { noEdge: true }); E.seg(a, b, y0, 0.05, 0.09, 'steel', { noEdge: true });
  };
  E.glassWall = (a, b, o = {}) => E.wall(a, b, { ...o, mat: 'glass' });
  // polygons: points [[x, z]...]; slab at top height yTop of thickness t; holes: arrays of points
  const shapeOf = pts => { const s = new THREE.Shape(); pts.forEach((p, i) => i ? s.lineTo(p[0], -p[1]) : s.moveTo(p[0], -p[1])); s.closePath(); return s; };
  E.slab = (pts, yTop, t, m, o = {}) => {
    const s = shapeOf(pts); for (const hl of o.holes || []) s.holes.push(new THREE.Path(hl.map(p => new THREE.Vector2(p[0], -p[1]))));
    const g = new THREE.ExtrudeGeometry(s, { depth: t, bevelEnabled: false }); g.rotateX(-Math.PI / 2);
    if (mat(m).map) { const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / 2.5, uv.getY(i) / 2.5); }
    const me = new THREE.Mesh(g, mat(m)); me.position.y = yTop - t;
    if (mat(m) === M.glass || mat(m) === M.milk) { glass.push(me); me.receiveShadow = false; o = { ...o, noCast: true, glass: true }; }
    return reg(me, o);
  };
  E.rectPts = (x0, z0, x1, z1) => [[x0, z0], [x1, z0], [x1, z1], [x0, z1]];
  E.circle = (cx, cz, r, n = 36) => Array.from({ length: n }, (_, i) => [cx + r * Math.cos(i / n * 2 * Math.PI), cz + r * Math.sin(i / n * 2 * Math.PI)]);
  E.centre = pts => [pts.reduce((s, p) => s + p[0], 0) / pts.length, pts.reduce((s, p) => s + p[1], 0) / pts.length];
  E.floor = (pts, y, m, o = {}) => E.slab(pts, y + 0.04, 0.04, m, { noCast: true, noEdge: true, ...o });
  // a roof/ceiling plate over a rectangle with skylight openings (rects [x0,z0,x1,z1]); the openings are glazed unless open: true
  E.roof = (x0, z0, x1, z1, yTop, o = {}) => {
    const holes = (o.lights || []).map(l => E.rectPts(...l));
    E.slab(E.rectPts(x0, z0, x1, z1), yTop, o.t ?? 0.4, o.mat || 'white', { holes, roof: true });
    if (!o.open) for (const l of o.lights || []) E.slab(E.rectPts(...l), yTop - 0.1, 0.03, 'glass', { roof: true });
  };
  E.floorRect = (x0, z0, x1, z1, y, m) => E.floor(E.rectPts(x0, z0, x1, z1), y, m);
  // a barrel vault: half-cylinder shell of the given inner radius along an axis ('z' or 'x'), springing at height y, with a light slit at the crown
  E.vault = (cx, cz, length, R, y, o = {}) => {
    const t = o.t ?? 0.25, slit = (o.slit ?? 0.5) / R, mk = (a0, a1) => { const s = new THREE.Shape(); s.moveTo(R * Math.cos(a0), R * Math.sin(a0)); s.absarc(0, 0, R, a0, a1, a1 < a0); s.lineTo((R + t) * Math.cos(a1), (R + t) * Math.sin(a1)); s.absarc(0, 0, R + t, a1, a0, a1 > a0); s.closePath(); return s; };
    const grp = new THREE.Group();
    for (const [a0, a1] of [[0, Math.PI / 2 - slit], [Math.PI, Math.PI / 2 + slit]]) { const g = new THREE.ExtrudeGeometry(mk(a0, a1), { depth: length, bevelEnabled: false, curveSegments: 20 }); const me = new THREE.Mesh(g, mat(o.mat || 'white')); me.castShadow = true; me.receiveShadow = true; grp.add(me);
      if (E.lines) { const l = new THREE.LineSegments(new THREE.EdgesGeometry(g, 30), edgeMat); grp.add(l); } }
    grp.position.set(cx, y, cz - length / 2); if (o.axis === 'x') { grp.rotation.y = -Math.PI / 2; grp.position.set(cx - length / 2, y, cz); }
    scene.add(grp); roofs.push(grp);
    if (!o.open) { const s = new THREE.Mesh(new THREE.PlaneGeometry(2 * slit * R + 0.2, length), M.glass); s.rotation.x = -Math.PI / 2; s.position.set(cx, y + R + 0.05, cz); if (o.axis === 'x') s.rotation.z = Math.PI / 2; roofs.push(s); scene.add(s); }
    return grp;
  };
  E.dome = (cx, cy, cz, r, o = {}) => {
    const g = new THREE.SphereGeometry(r, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2), m = new THREE.Mesh(g, o.mat ? mat(o.mat) : M.glass); m.position.set(cx, cy, cz); if (m.material === M.glass) { glass.push(m); m.receiveShadow = false; m.castShadow = false; } else { m.castShadow = true; m.receiveShadow = true; m.material = m.material.clone(); m.material.side = THREE.DoubleSide; }
    scene.add(m); roofs.push(m);
    if (!o.mat) for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2, pts = []; for (let k = 0; k <= 12; k++) { const t = k / 12 * Math.PI / 2; pts.push(new THREE.Vector3(cx + Math.cos(a) * Math.cos(t) * r, cy + Math.sin(t) * r, cz + Math.sin(a) * Math.cos(t) * r)); } const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0x3a3d40 })); scene.add(l); roofs.push(l); }
    return m;
  };
  // a ramp / sloping slab between two points (plan) rising from y0 to y1, width w
  E.ramp = (a, b, y0, y1, w, m, o = {}) => {
    const L = len(a, b), ang = -Math.atan2(b[1] - a[1], b[0] - a[0]), slope = Math.atan2(y1 - y0, L), th = o.t ?? 0.3;
    const g = new THREE.BoxGeometry(L / Math.cos(slope) + 0.04, th, w); const me = new THREE.Mesh(g, mat(m)); const c = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    const nrm = [(b[1] - a[1]) / L, -(b[0] - a[0]) / L], off = o.off || 0;
    me.position.set(c[0] + nrm[0] * off, (y0 + y1) / 2 - th / 2, c[1] + nrm[1] * off); me.rotation.set(0, ang, 0); me.rotateZ(slope); if (mat(m).map) uvScale(g, L, w); return reg(me, o);
  };
  // a wall that follows a slope: from a (floor height y0) to b (y1), height h, optional windows [from, to, sill, top] measured along the wall and above the local floor
  E.slopedWall = (a, b, y0, y1, h, t, m, o = {}) => {
    const L = len(a, b), yAt = u => y0 + (y1 - y0) * u / L, s = new THREE.Shape(); s.moveTo(0, y0); s.lineTo(L, y1); s.lineTo(L, y1 + h); s.lineTo(0, y0 + h); s.closePath();
    for (const [u0, u1, sill, top] of o.gaps || []) { const hp = new THREE.Path(); hp.moveTo(u0, yAt(u0) + sill); hp.lineTo(u1, yAt(u1) + sill); hp.lineTo(u1, yAt(u1) + top); hp.lineTo(u0, yAt(u0) + top); hp.closePath(); s.holes.push(hp); }
    const g = new THREE.ExtrudeGeometry(s, { depth: t, bevelEnabled: false }); g.translate(0, 0, -t / 2);
    if (mat(m).map) { const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / 2.5, uv.getY(i) / 2.5); }
    const me = new THREE.Mesh(g, mat(m)); me.position.set(a[0], 0, a[1]); me.rotation.y = -Math.atan2(b[1] - a[1], b[0] - a[0]); return reg(me, o);
  };
  // additive light: a beam (cone / cylinder) between two points, and an ellipse of light on the floor
  E.beam = (p0, p1, r0, r1, color = 0xfff2cf, opacity = 0.16) => {
    const v0 = new THREE.Vector3(...p0), v1 = new THREE.Vector3(...p1), d = v1.clone().sub(v0), L = d.length();
    const g = new THREE.CylinderGeometry(r1, r0, L, 32, 1, true), me = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    me.position.copy(v0.clone().add(v1).multiplyScalar(0.5)); me.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); scene.add(me); roofs.push(me); return me;
  };
  E.disc = (x, y, z, rx, rz, rot = 0, color = 0xfff2cf, opacity = 0.5) => {
    const c = document.createElement('canvas'); c.width = c.height = 128; const x2 = c.getContext('2d'), g = x2.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.7, 'rgba(255,255,255,0.85)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x2.fillStyle = g; x2.fillRect(0, 0, 128, 128);
    const me = new THREE.Mesh(new THREE.PlaneGeometry(2 * rx, 2 * rz), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false })); me.rotation.set(-Math.PI / 2, 0, rot); me.position.set(x, y, z); scene.add(me); return me;
  };
  // a coffered dome seen from inside (a sphere cap with an oculus), Boullee / Pantheon style
  E.coffDome = (cx, cy, cz, R, oc, o = {}) => {
    const a0 = Math.asin(oc / R), cv = document.createElement('canvas'); cv.width = 2048; cv.height = 1024; const x = cv.getContext('2d'); x.fillStyle = o.color || '#e8e2d4'; x.fillRect(0, 0, 2048, 1024);
    x.strokeStyle = 'rgba(70,60,48,0.5)'; x.lineWidth = 3; const rings = o.rings || 5, meri = o.meri || 28; for (let i = 0; i <= rings; i++) { const y = i / rings * 1024; x.beginPath(); x.moveTo(0, y); x.lineTo(2048, y); x.stroke(); } for (let i = 0; i <= meri; i++) { const xx = i / meri * 2048; x.beginPath(); x.moveTo(xx, 0); x.lineTo(xx, 1024); x.stroke(); }
    for (let i = 0; i < rings; i++) for (let j = 0; j < meri; j++) { x.fillStyle = 'rgba(0,0,0,0.07)'; x.fillRect(j * 2048 / meri + 7, i * 1024 / rings + 7, 2048 / meri - 14, 1024 / rings - 14); }
    if (o.stars) { x.fillStyle = 'rgba(255,255,235,1)'; for (let i = 0; i < 700; i++) { x.beginPath(); x.arc(Math.random() * 2048, Math.random() * 1024, 1.2 + Math.random() * 2.6, 0, 7); x.fill(); } }
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
    const m = new THREE.Mesh(new THREE.SphereGeometry(R, 96, 32, 0, Math.PI * 2, a0, Math.PI / 2 - a0), new THREE.MeshBasicMaterial({ map: tex, side: THREE.BackSide })); m.position.set(cx, cy, cz); scene.add(m); roofs.push(m);
    const outer = new THREE.Mesh(new THREE.SphereGeometry(R + 0.6, 96, 32, 0, Math.PI * 2, a0, Math.PI / 2 - a0), E.M.concrete); outer.position.set(cx, cy, cz); outer.castShadow = true; scene.add(outer); roofs.push(outer); return m;
  };
  // pictures: on a wall (descriptor from E.wall) s metres along, on the side +1 (left of a -> b, seen from a) or -1
  const normalOf = (a, b, side) => { const L = len(a, b); return [(b[1] - a[1]) / L * side, -(b[0] - a[0]) / L * side]; };
  E.normal = normalOf;
  E.art = (wl, s, side, w, h, img, yc = 1.55, dir = ART) => {
    const { a, b, t, y0 } = wl, n = normalOf(a, b, side), c = lerp2(a, b, s), y = y0 + yc;
    const tex = TL.load(dir + img + '.jpg'); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
    const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8 }));
    p.position.set(c[0] + n[0] * (t / 2 + 0.04), y, c[1] + n[1] * (t / 2 + 0.04)); p.rotation.y = Math.atan2(n[0], n[1]); reg(p, { noCast: true, noEdge: true });
    const f = new THREE.Mesh(new THREE.BoxGeometry(w + 0.06, h + 0.06, 0.04), M.ink); f.position.set(c[0] + n[0] * (t / 2 + 0.02), y, c[1] + n[1] * (t / 2 + 0.02)); f.rotation.y = p.rotation.y; reg(f, { noEdge: true });
  };
  // a picture hung on a free-standing wall made by E.wall: both faces by side = 1 / -1
  E.text = (wl, s, side, str, size, yc, color = '#1d1d1b') => {
    const { a, b, t, y0 } = wl, n = normalOf(a, b, side), c = lerp2(a, b, s);
    const cv = document.createElement('canvas'), x = cv.getContext('2d'); x.font = '500 150px "Helvetica Neue", Arial, sans-serif';
    const tw = [...str].reduce((sum, ch) => sum + x.measureText(ch).width + 22, 0); cv.width = Math.ceil(tw + 40); cv.height = 210;
    x.font = '500 150px "Helvetica Neue", Arial, sans-serif'; x.fillStyle = color; x.textBaseline = 'middle'; let px = 20; for (const ch of str) { x.fillText(ch, px, 108); px += x.measureText(ch).width + 22; }
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8; const hh = size * 1.4;
    const p = new THREE.Mesh(new THREE.PlaneGeometry(hh * cv.width / cv.height, hh), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }));
    p.position.set(c[0] + n[0] * (t / 2 + 0.02), y0 + yc, c[1] + n[1] * (t / 2 + 0.02)); p.rotation.y = Math.atan2(n[0], n[1]); scene.add(p);
  };
  E.plinth = (x, z, o = {}) => {
    const w = o.w ?? 0.5, h = o.h ?? 1.0, y0 = o.y0 ?? 0; E.box(x, y0 + h / 2, z, w, h, o.d ?? w, o.mat || 'stone', o.r || 0, { noEdge: true });
    const k = o.obj ?? 0, m = o.om || 'bronze'; let g;
    if (k === 0) g = new THREE.IcosahedronGeometry(0.2, 0); else if (k === 1) g = new THREE.CapsuleGeometry(0.1, 0.46, 4, 10); else if (k === 2) g = new THREE.TorusGeometry(0.17, 0.06, 10, 24); else if (k === 4) g = new THREE.SphereGeometry(0.25, 20, 14); else g = new THREE.ConeGeometry(0.16, 0.5, 5);
    const ob = new THREE.Mesh(g, mat(m)); const sc = o.s ?? 1; ob.scale.setScalar(sc); ob.position.set(x, y0 + h + (k === 1 ? 0.33 : k === 3 ? 0.25 : 0.22) * sc, z); ob.rotation.y = x; reg(ob, { noEdge: true });
  };
  E.statue = (x, z, o = {}) => {                      // a standing figure, abstract, on a plinth (David's proportions, simplified)
    const y0 = o.y0 ?? 0, h = o.h ?? 1.0, s = o.s ?? 1.8; E.box(x, y0 + h / 2, z, 0.9, h, 0.9, 'stone', 0, { noEdge: true });
    const m = M.marble, body = new THREE.Mesh(new THREE.CapsuleGeometry(0.2 * s / 2, 0.9 * s / 2, 6, 14), m); body.position.set(x, y0 + h + 0.55 * s, z); reg(body, { noEdge: true });
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.11 * s / 1.8 * 1.1, 14, 10), m); head.position.set(x, y0 + h + 1.12 * s, z); reg(head, { noEdge: true });
  };
  E.person = (x, z, y0 = 0, s = 1) => {
    const m = std(0x7d8084); const b = new THREE.Mesh(new THREE.CapsuleGeometry(0.15 * s, 1.0 * s, 4, 10), m); b.position.set(x, y0 + 0.78 * s, z); reg(b, { noEdge: true });
    const hd = new THREE.Mesh(new THREE.SphereGeometry(0.105 * s, 14, 10), m); hd.position.set(x, y0 + 1.58 * s, z); reg(hd, { noEdge: true });
  };
  E.tree = (x, z, s = 1, y0 = 0) => {
    const t = new THREE.Mesh(new THREE.CylinderGeometry(0.09 * s, 0.13 * s, 2.6 * s, 7), M.trunk); t.position.set(x, y0 + 1.3 * s, z); reg(t, { noEdge: true });
    for (const [dx, dy, dz, r] of [[0, 3.6, 0, 1.7], [0.9, 3.1, 0.4, 1.2], [-0.8, 3.3, -0.5, 1.3], [0.1, 4.4, -0.3, 1.1]]) { const c = new THREE.Mesh(new THREE.IcosahedronGeometry(r * s, 1), M.leaf); c.position.set(x + dx * s, y0 + dy * s, z + dz * s); reg(c, { noEdge: true }); }
  };
  E.bench = (x, z, ry = 0) => { E.box(x, 0.22, z, 1.6, 0.06, 0.45, 'timber', ry, { noEdge: true }); E.box(x, 0.1, z, 1.4, 0.2, 0.3, 'darkc', ry, { noEdge: true }); };
  E.ghost = (pts) => { const g = new THREE.BufferGeometry().setFromPoints([...pts, pts[0]].map(p => new THREE.Vector3(p[0], 0.15, p[1]))); const l = new THREE.Line(g, new THREE.LineDashedMaterial({ color: 0x8a5a2b, dashSize: 0.8, gapSize: 0.5 })); l.computeLineDistances(); scene.add(l); ghosts.push(l); };
  E.ground = (x0, z0, x1, z1, m = 'grass') => E.slab(E.rectPts(x0, z0, x1, z1), 0, 0.06, m, { noCast: true, noEdge: true });
  E.pool = (pts) => E.slab(pts, 0.06, 0.04, 'water', { noCast: true, noEdge: true });
  // finish: lights, sky, renderer, camera
  E.finish = cfg => {
    const sky = document.createElement('canvas'); sky.width = 4; sky.height = 256; { const x = sky.getContext('2d'), g = x.createLinearGradient(0, 0, 0, 256); g.addColorStop(0, '#8fb4d6'); g.addColorStop(0.6, '#d7e5ee'); g.addColorStop(1, '#f1efe8'); x.fillStyle = g; x.fillRect(0, 0, 4, 256); }
    if (cfg.sky) { const x = sky.getContext('2d'), g = x.createLinearGradient(0, 0, 0, 256); g.addColorStop(0, cfg.sky[0]); g.addColorStop(0.6, cfg.sky[1]); g.addColorStop(1, cfg.sky[2]); x.fillStyle = g; x.fillRect(0, 0, 4, 256); }
    const skyTex = new THREE.CanvasTexture(sky); skyTex.colorSpace = THREE.SRGBColorSpace;
    scene.background = view === 'plan' || view === 'plan2' || view === 'section' ? new THREE.Color(0xf3f1ea) : skyTex;
    scene.add(new THREE.HemisphereLight(0xffffff, 0xe4dccb, cfg.ambient ?? 2.3));
    
    if (cfg.fog) scene.fog = new THREE.Fog(cfg.fog[0], cfg.fog[1], cfg.fog[2]);
    const sun = new THREE.DirectionalLight(cfg.sunColor ?? 0xfff1dc, cfg.sunPower ?? 2.8), bc = cfg.centre || [(cfg.bounds[0] + cfg.bounds[2]) / 2, (cfg.bounds[1] + cfg.bounds[3]) / 2];
    sun.position.set(bc[0] + (cfg.sun?.[0] ?? -16), cfg.sun?.[1] ?? 50, bc[1] + (cfg.sun?.[2] ?? 22)); sun.target.position.set(bc[0], 0, bc[1]); scene.add(sun.target);
    const span = cfg.shadowSpan ?? 60; sun.castShadow = true; sun.shadow.mapSize.set(4096, 4096); Object.assign(sun.shadow.camera, { left: -span, right: span, top: span, bottom: -span, near: 1, far: 200 }); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.04; scene.add(sun);
    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true }); renderer.setPixelRatio(devicePixelRatio); renderer.setSize(W, H); renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.NeutralToneMapping; renderer.toneMappingExposure = cfg.exposure ?? 1.0; document.body.append(renderer.domElement);
    if (cfg.env !== false) { const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = cfg.envI ?? 0.35; }
    let cam; const roofsOff = view === 'plan' || view === 'plan2' || view === 'cut';
    if (view === 'plan' || view === 'plan2') {
      const [x0, z0, x1, z1] = cfg.bounds, bw = x1 - x0, bh = z1 - z0, k = Math.max(bw / W, bh / H), hw = W * k / 2, hh = H * k / 2;
      cam = new THREE.OrthographicCamera(-hw, hw, hh, -hh, 0.1, 400); cam.position.set(bc[0], 120, bc[1]); cam.up.set(0, 0, -1); cam.lookAt(bc[0], 0, bc[1]);
      for (const [x, z, t, f] of (view === 'plan2' ? cfg.labels2 : cfg.labels) || []) { const d = document.createElement('div'); d.className = 'lb' + (f ? ' f' : ''); d.textContent = t; d.style.left = (W / 2 + (x - bc[0]) / k) + 'px'; d.style.top = (H / 2 + (z - bc[1]) / k) + 'px'; document.body.append(d); }
      const sb = document.createElement('div'); sb.className = 'scale'; sb.style.width = (10 / k) + 'px'; sb.innerHTML = '<span>10 מ׳</span>'; document.body.append(sb);
    } else if (view === 'section') {
      const s = cfg.section; const [x0, y0, x1, y1] = s.frame, bw = x1 - x0, bh = y1 - y0, k = Math.max(bw / W, bh / H), hw = W * k / 2, hh = H * k / 2, cxs = (x0 + x1) / 2, cys = (y0 + y1) / 2;
      const ax = s.axis === 'x';
      cam = new THREE.OrthographicCamera(-hw, hw, hh, -hh, 0.1, 400);
      if (ax) { cam.position.set(s.at + 150, cys, cxs); cam.lookAt(s.at, cys, cxs); } else { cam.position.set(cxs, cys, s.at + 150); cam.lookAt(cxs, cys, s.at); }
      renderer.localClippingEnabled = true; const pl = new THREE.Plane(ax ? new THREE.Vector3(-1, 0, 0) : new THREE.Vector3(0, 0, -1), s.at); renderer.clippingPlanes = [pl];
      for (const [x, y, t] of s.labels || []) { const d = document.createElement('div'); d.className = 'lb'; d.textContent = t; d.style.left = (W / 2 + (ax ? -(x - cxs) : (x - cxs)) / k) + 'px'; d.style.top = (H / 2 - (y - cys) / k) + 'px'; document.body.append(d); }
      const sb = document.createElement('div'); sb.className = 'scale'; sb.style.width = (10 / k) + 'px'; sb.innerHTML = '<span>10 מ׳</span>'; document.body.append(sb);
      scene.background = new THREE.Color(0xf6f4ee);
    } else { const v = cfg.views[view]; if (!v) throw new Error('no view ' + view); cam = new THREE.PerspectiveCamera(v.fov, W / H, 0.1, 500); cam.position.set(...v.eye); cam.lookAt(...v.look); }
    if (roofsOff) roofs.forEach(r => { r.visible = false; });
    if (view === 'plan2') (E.groups.upper || []).forEach(r => { r.visible = false; });
    if (view !== 'plan' && view !== 'plan2' && view !== 'air' && view !== 'cut') ghosts.forEach(g => { g.visible = false; });
    if (view === 'section' || view === 'air') { /* keep ghosts in air; hide in section */ if (view === 'section') ghosts.forEach(g => { g.visible = false; }); }
    mgr.onLoad = () => { let n = 0; const tick = () => { renderer.render(scene, cam); if (++n < 4) requestAnimationFrame(tick); else window.__ready = true; }; tick(); };
    mgr.onError = u => console.error('missing', u);
    if (!mgr.itemStart) return;
    // nothing to load: still render
    setTimeout(() => { if (!window.__ready) { renderer.render(scene, cam); renderer.render(scene, cam); window.__ready = true; } }, 3500);
  };
  return E;
}
