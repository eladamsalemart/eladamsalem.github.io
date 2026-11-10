// Plinths on the floor of a virtual room, with an object (a sculpture, a vessel) standing on each at its real size.
// The object's photo stands upright as a cut-out that always faces the visitor (its transparent edge, when the photo
// has one; otherwise its rectangle). Used by the viewer for every visitor, and by the hang editor to move them.
export function addPlinths(THREE, scene, list, loadTex, room = {}) {
  const handles = [];
  // a dark room (the Black box): charcoal plinths, each in a spotlight from the grid above; a light room: white plinths
  const mat = new THREE.MeshLambertMaterial({ color: room.dark ? 0x2c2c2f : 0xe9e6df });
  const top = new THREE.MeshLambertMaterial({ color: room.dark ? 0x3a3a3d : 0xf4f2ec });
  for (const p of list || []) {
    const [w, d, h] = p.size.map(v => v / 100);
    const g = new THREE.Group(); g.position.set(p.x, 0, p.z);
    const box = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), [mat, mat, top, mat, mat, mat]);
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
