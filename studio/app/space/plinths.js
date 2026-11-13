// Plinths on the floor of a virtual room, with an object (a sculpture, a vessel) standing on each at its real size.
// The object's photo stands upright as a cut-out that always faces the visitor (its transparent edge, when the photo
// has one; otherwise its rectangle). Used by the viewer for every visitor, and by the hang editor to move them.
// the colours a plinth can be painted: name, its sides, its top
export const PLINTH_COLOURS = { grey: ['Grey', 0x9b9b98, 0xa9a9a6], black: ['Black', 0x232325, 0x303033], wood: ['Wood', 0xb08a5e, 0xbd9a70] };
export function addPlinths(THREE, scene, list, loadTex, room = {}) {
  const handles = [];
  // a dark room (the Black box): charcoal plinths, each in a spotlight from the grid above; a light room: white plinths
  const mat = new THREE.MeshLambertMaterial({ color: room.dark ? 0x2c2c2f : 0xe9e6df });
  const top = new THREE.MeshLambertMaterial({ color: room.dark ? 0x3a3a3d : 0xf4f2ec });
  for (const p of list || []) {
    const [w, d, h] = p.size.map(v => v / 100);
    const g = new THREE.Group(); g.position.set(p.x, 0, p.z);
    // the artist's own colour for it (white is the room's)
    const own = PLINTH_COLOURS[p.colour], m1 = own ? new THREE.MeshLambertMaterial({ color: own[1] }) : mat, m2 = own ? new THREE.MeshLambertMaterial({ color: own[2] }) : top;
    const box = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), [m1, m1, m2, m1, m1, m1]);
    box.position.y = h / 2; box.userData.kind = 'plinth'; box.userData.plinth = p.id;
    // a soft shadow on the floor round the foot
    const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
    const gr = x.createRadialGradient(32, 32, 8, 32, 32, 32); gr.addColorStop(0, 'rgba(0,0,0,.45)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = gr; x.fillRect(0, 0, 64, 64);
    const sh = new THREE.Mesh(new THREE.PlaneGeometry(w + 0.5, d + 0.5), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false, toneMapped: false }));
    sh.rotation.x = -Math.PI / 2; sh.position.y = 0.004; sh.userData.kind = 'shadow';
    g.add(sh, box);
    if (room.dark) {      // the spotlight: a narrow cone from the ceiling onto the plinth's top and the floor round it, and its pool on the floor
      const sp = new THREE.SpotLight(0xfff0d8, 14, 0, 0.3, 0.55, 1.6);
      sp.position.set(0, Math.max(2.6, (room.h || 3.5) - 0.3), 0.25); sp.target.position.set(0, h, 0); g.add(sp, sp.target);
      const pc = document.createElement('canvas'); pc.width = pc.height = 128; const px = pc.getContext('2d');
      const pg = px.createRadialGradient(64, 64, 4, 64, 64, 64); pg.addColorStop(0, 'rgba(255,236,205,.55)'); pg.addColorStop(0.6, 'rgba(255,230,190,.14)'); pg.addColorStop(1, 'rgba(255,230,190,0)'); px.fillStyle = pg; px.fillRect(0, 0, 128, 128);
      const pool = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 2.4), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(pc), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
      pool.rotation.x = -Math.PI / 2; pool.position.y = 0.006; pool.userData.kind = 'pool'; g.add(pool);
    }
    const hd = { id: p.id, group: g, box, spec: p, face: null };
    if (p.obj) {
      const ow = Math.max(0.02, p.obj.w / 100), oh = Math.max(0.02, p.obj.h / 100);
      const face = new THREE.Group(); face.position.y = h + oh / 2; face.userData.billboard = true;
      const m = new THREE.MeshBasicMaterial({ color: 0xd8d2c6, transparent: true, alphaTest: 0.4, side: THREE.DoubleSide, toneMapped: false });
      const q = new THREE.Mesh(new THREE.PlaneGeometry(ow, oh), m); q.userData.kind = 'object'; q.userData.plinth = p.id;
      face.add(q); g.add(face); hd.face = face;
      loadTex(p.obj.image).then(t => { if (!t) return; m.map = t; m.color.set(0xffffff); m.needsUpdate = true; });
    }
    scene.add(g); handles.push(hd);
  }
  return handles;
}

// The body of each freestanding wall (its two faces are wall surfaces, drawn with the room's walls): the ends and the top, and a
// soft shadow along its foot.
export function addStands(THREE, scene, list, room = {}) {
  const out = [];
  const mat = new THREE.MeshLambertMaterial({ color: room.dark ? 0x2c2c2f : 0xeceae4 });
  for (const s of list || []) {
    const g = new THREE.Group(); g.position.set(s.x, 0, s.z); g.rotation.y = -s.rot * Math.PI / 180;
    const body = new THREE.Mesh(new THREE.BoxGeometry(s.len, s.h, s.t - 0.006), mat);
    body.position.y = s.h / 2; body.userData.kind = 'stand'; body.userData.stand = s.id;
    const c = document.createElement('canvas'); c.width = 64; c.height = 64; const x = c.getContext('2d');
    const gr = x.createLinearGradient(0, 0, 0, 64); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(0.5, 'rgba(0,0,0,.32)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = gr; x.fillRect(0, 0, 64, 64);
    const sh = new THREE.Mesh(new THREE.PlaneGeometry(s.len + 0.1, s.t + 0.7), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false, toneMapped: false }));
    sh.rotation.x = -Math.PI / 2; sh.position.y = 0.004; sh.userData.kind = 'shadow';
    g.add(sh, body); scene.add(g); out.push({ id: s.id, group: g, body, spec: s });
  }
  return out;
}

// The Living room's furniture, drawn live (the baked walls and floor are of the empty room): a sofa against the west wall, a rug, a
// low table, a floor lamp, at the places the room was designed round (space/rooms/build_rooms.py, apartment()). Plain, matte shapes,
// each with a soft shadow on the floor; `solid` are the circles a visitor does not walk through.
export function addFurniture(THREE, scene, spec) {
  const W = spec.w, D = spec.d, out = { solid: [] };
  const lam = c => new THREE.MeshLambertMaterial({ color: c });
  const g = new THREE.Group();
  const add = (w, h, d, x, y, z, mat) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y + h / 2, z); g.add(m); return m; };
  const shadow = (x, z, w, d, k = 0.5) => {
    const c = document.createElement('canvas'); c.width = c.height = 64; const t = c.getContext('2d');
    const gr = t.createRadialGradient(32, 32, 10, 32, 32, 32); gr.addColorStop(0, `rgba(0,0,0,${k})`); gr.addColorStop(1, 'rgba(0,0,0,0)'); t.fillStyle = gr; t.fillRect(0, 0, 64, 64);
    const s = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false, toneMapped: false }));
    s.rotation.x = -Math.PI / 2; s.position.set(x, 0.014, z); g.add(s);
  };
  const linen = lam(0x8f8470), linenTop = lam(0x9d927d), wood = lam(0x6a4a33), brass = lam(0xa88b4a), rugM = lam(0xb5a893);
  // the rug first (under everything)
  const rx0 = 1.2, rx1 = W * 0.7, rz0 = D * 0.2, rz1 = D * 0.8;
  add(rx1 - rx0, 0.012, rz1 - rz0, (rx0 + rx1) / 2, 0, (rz0 + rz1) / 2, rugM);
  // the sofa: seat, back, arms, two cushions
  const sx = 0.15, sz = D * 0.25;
  add(0.95, 0.33, 2.2, sx + 0.475, 0.12, sz + 1.1, linen);
  add(0.25, 0.4, 2.2, sx + 0.125, 0.45, sz + 1.1, linen);
  for (const k of [0, 1]) add(0.62, 0.15, 1.0, sx + 0.58, 0.45, sz + 0.55 + k * 1.1, linenTop);
  for (const e of [0.05, 2.15]) add(0.95, 0.2, 0.1, sx + 0.475, 0.45, sz + e, linen);
  for (const [lx, lz] of [[0.1, 0.1], [0.1, 2.1], [0.85, 0.1], [0.85, 2.1]]) add(0.05, 0.12, 0.05, sx + lx, 0, sz + lz, wood);
  shadow(sx + 0.55, sz + 1.1, 1.8, 2.9, 0.42);
  // the low table
  const tx = (1.6 + 2.5) / 2, tz = D * 0.5, td = D * 0.16 / 2 - 0.04;
  add(0.9, 0.04, D * 0.16, tx, 0.36, tz, wood);
  for (const [lx, lz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) add(0.04, 0.36, 0.04, tx + lx * 0.4, 0, tz + lz * td, wood);
  shadow(tx, tz, 1.5, 1.2, 0.4);
  // the floor lamp, lit
  const lx = 0.5, lz = D * 0.12;
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1.55, 10), brass); pole.position.set(lx, 0.775, lz); g.add(pole);
  const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 0.025, 20), brass); foot.position.set(lx, 0.013, lz); g.add(foot);
  const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.22, 0.3, 24, 1, true), new THREE.MeshBasicMaterial({ color: 0xffe2b0, side: THREE.DoubleSide, toneMapped: false }));
  shade.position.set(lx, 1.55, lz); g.add(shade);
  const cap = new THREE.Mesh(new THREE.CircleGeometry(0.2, 24), new THREE.MeshBasicMaterial({ color: 0xffeccc, toneMapped: false })); cap.rotation.x = -Math.PI / 2; cap.position.set(lx, 1.69, lz); g.add(cap);
  const warm = new THREE.PointLight(0xffd9a0, 1.1, 4.5, 1.6); warm.position.set(lx + 0.15, 1.45, lz + 0.15); g.add(warm);
  shadow(lx, lz, 0.7, 0.7, 0.35);
  scene.add(g); out.group = g;
  out.solid = [{ x: sx + 0.5, z: sz + 0.45, r: 0.75 }, { x: sx + 0.5, z: sz + 1.75, r: 0.75 }, { x: tx, z: tz, r: 0.7 }, { x: lx, z: lz, r: 0.5 }];
  return out;
}
