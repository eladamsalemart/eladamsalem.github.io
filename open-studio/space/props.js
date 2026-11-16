// Things that stand in a museum space and are not a picture on a wall: a sculpture (a 3D model, a glb) and a maquette of a building
// (small, modelled here from cylinders and boxes: simplified, and labelled as such), each on its own plinth with its label.
//   spec.props = [{ kind: 'glb' | 'tempietto' | 'dome' | 'rotonda', x, z, rot, h, plinth: { w, d, h }, label: [title, line, line], url?, y? }]
// Loaded by space.js only when a spec has props. Lit by a soft light of their own (the room's surfaces are unlit pictures and ignore it).
// Walking limits for each plinth are in the spec's `solids` (the builder adds them), so a visitor does not walk through one.

export async function addProps({ THREE, scene, spec, mark, renderer }) {
  const list = spec.props || []; if (!list.length) return;
  scene.add(new THREE.HemisphereLight(0xfff6ea, 0x8a8478, 1.5));
  const sun = new THREE.DirectionalLight(0xffffff, 1.9); sun.position.set(6, 12, 5); scene.add(sun);
  const stone = new THREE.MeshLambertMaterial({ color: 0xe8e2d4 }), warm = new THREE.MeshLambertMaterial({ color: 0xc9744c }), plinthMat = new THREE.MeshLambertMaterial({ color: 0xf1eee6 });
  const marble = new THREE.MeshLambertMaterial({ color: 0xece7dc });
  const cyl = (rt, rb, h, n = 24, m = stone) => new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, n), m);
  const box = (w, h, d, m = stone) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  const add = (g, o, x = 0, y = 0, z = 0) => { o.position.set(x, y, z); g.add(o); return o; };
  // a ring of columns
  const ring = (g, n, r, h, cr, y0) => { for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; add(g, cyl(cr, cr * 1.1, h, 10), Math.cos(a) * r, y0 + h / 2, Math.sin(a) * r); } };
  // a dome: a lathe of a half-ellipse (pointed when `point` is set, as Brunelleschi's is), with ribs
  const dome = (g, r, h, y0, mat, ribs = 0, point = 0) => {
    const pts = []; for (let i = 0; i <= 24; i++) { const t = i / 24 * Math.PI / 2; pts.push(new THREE.Vector2(Math.cos(t) * r * (1 - point * Math.sin(t) ** 3), Math.sin(t) * h)); }
    const d = new THREE.Mesh(new THREE.LatheGeometry(pts, ribs ? ribs * 4 : 36), mat); d.position.y = y0; g.add(d);
    for (let i = 0; i < ribs; i++) { const a = i / ribs * Math.PI * 2; const rb = box(r * 0.04, h * 1.02, r * 0.04, stone); const q = new THREE.Group(); q.rotation.y = -a;
      const arc = []; for (let k = 0; k <= 16; k++) { const t = k / 16 * Math.PI / 2; arc.push(new THREE.Vector3(Math.cos(t) * r * (1 - point * Math.sin(t) ** 3) * 1.01, Math.sin(t) * h * 1.005, 0)); }
      const tube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(arc), 18, r * 0.018, 5), stone); q.add(tube); q.position.y = y0; g.add(q); rb.geometry.dispose(); }
    return d;
  };
  const MODELS = {
    // Bramante's Tempietto (Rome, 1502): a drum ringed by 16 columns on three steps, a dome and a lantern
    tempietto(g) { for (let i = 0; i < 3; i++) add(g, cyl(0.62 - i * 0.07, 0.66 - i * 0.07, 0.035, 36, stone), 0, 0.0175 + i * 0.035);
      add(g, cyl(0.36, 0.36, 0.34, 32), 0, 0.105 + 0.17); ring(g, 16, 0.5, 0.34, 0.022, 0.105); add(g, cyl(0.54, 0.54, 0.03, 36), 0, 0.46); add(g, cyl(0.38, 0.38, 0.12, 32), 0, 0.535);
      dome(g, 0.38, 0.3, 0.595, warm); add(g, cyl(0.045, 0.06, 0.1, 12), 0, 0.93); add(g, new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), stone), 0, 1.01); },
    // Brunelleschi's dome of Florence cathedral (1436): an octagonal drum, a pointed ribbed dome, a lantern, on the cruciform church
    dome(g) { add(g, box(1.1, 0.16, 0.42), 0, 0.08, 0); add(g, box(0.42, 0.16, 1.1), 0, 0.08, 0); add(g, box(0.5, 0.2, 0.5), 0, 0.1, 0);
      const drum = cyl(0.3, 0.3, 0.3, 8, stone); drum.rotation.y = Math.PI / 8; add(g, drum, 0, 0.35); const base = cyl(0.33, 0.33, 0.04, 8, stone); base.rotation.y = Math.PI / 8; add(g, base, 0, 0.52);
      dome(g, 0.3, 0.46, 0.5, warm, 8, 0.28); const lan = cyl(0.06, 0.07, 0.2, 8, stone); add(g, lan, 0, 1.06); add(g, cyl(0.0, 0.05, 0.12, 8, stone), 0, 1.22); },
    // Palladio's Villa Rotonda (Vicenza, 1566): a square plan, a portico on each of the four sides, a drum and a shallow dome in the middle
    rotonda(g) { add(g, box(1.0, 0.1, 1.0), 0, 0.05, 0); add(g, box(0.62, 0.42, 0.62), 0, 0.31, 0);
      for (let s = 0; s < 4; s++) { const p = new THREE.Group(); p.rotation.y = s * Math.PI / 2; g.add(p); add(p, box(0.44, 0.04, 0.2), 0, 0.12, 0.62); for (let k = 0; k < 6; k++) add(p, cyl(0.014, 0.016, 0.3, 8), -0.18 + k * 0.072, 0.29, 0.69);
        add(p, box(0.5, 0.04, 0.24), 0, 0.46, 0.64); const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.0, 0.2, 0.5, 3), stone); ped.rotation.set(Math.PI / 2, 0, Math.PI / 2); ped.scale.set(1, 1, 0.45); add(p, ped, 0, 0.5, 0.64); ped.visible = false;
        const tri = new THREE.Mesh(new THREE.ConeGeometry(0.26, 0.14, 3), stone); tri.rotation.set(0, Math.PI, 0); tri.scale.set(1, 1, 0.12); add(p, tri, 0, 0.55, 0.64); }
      add(g, cyl(0.26, 0.26, 0.2, 28), 0, 0.62); dome(g, 0.26, 0.2, 0.72, warm); add(g, cyl(0.03, 0.04, 0.06, 10), 0, 0.94); },
  };
  const loader = list.some(p => p.kind === 'glb') ? new (await import('three/addons/loaders/GLTFLoader.js')).GLTFLoader() : null;
  const plateTex = lines => { const c = document.createElement('canvas'); c.width = 512; c.height = 180; const x = c.getContext('2d'); x.fillStyle = '#faf8f3'; x.fillRect(0, 0, 512, 180); x.fillStyle = '#26221d'; x.textBaseline = 'top';
    lines.forEach((l, k) => { x.font = `${k === 0 ? 'italic 600 30px' : '400 22px'} Georgia, serif`; let s = String(l); while (x.measureText(s).width > 488 && s.length > 4) s = s.slice(0, -2); x.fillText(s, 12, 12 + (k === 0 ? 0 : 36 + (k - 1) * 28)); });
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; };
  for (const p of list) {
    const pl = p.plinth || { w: 0.6, d: 0.6, h: 1.0 }, root = new THREE.Group(); root.position.set(p.x, p.y || 0, p.z); root.rotation.y = p.rot || 0; scene.add(root);
    const body = new THREE.Mesh(new THREE.BoxGeometry(pl.w, pl.h, pl.d), plinthMat); body.position.y = pl.h / 2; root.add(body);
    if (p.label) { const pt = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.12), new THREE.MeshBasicMaterial({ map: plateTex(p.label), toneMapped: false })); pt.position.set(pl.w / 2 - 0.2, pl.h * 0.78, pl.d / 2 + 0.004); root.add(pt); }
    const holder = new THREE.Group(); holder.position.y = pl.h; root.add(holder);
    if (MODELS[p.kind]) { const m = new THREE.Group(); MODELS[p.kind](m); const bb = new THREE.Box3().setFromObject(m), s = (p.h || 0.5) / Math.max(bb.max.y - bb.min.y, 0.01); m.scale.setScalar(s); holder.add(m); }
    else if (p.kind === 'glb' && p.url && loader) {
      loader.loadAsync(p.url).then(gltf => {
        const m = gltf.scene; m.traverse(o => { if (o.isMesh) { o.geometry.computeVertexNormals(); o.material = marble; o.castShadow = false; } });
        const bb = new THREE.Box3().setFromObject(m), s = (p.h || 1.6) / Math.max(bb.max.y - bb.min.y, 0.01), c = bb.getCenter(new THREE.Vector3());
        m.scale.setScalar(s); m.position.set(-c.x * s, -bb.min.y * s, -c.z * s); holder.add(m); mark();
      }).catch(e => console.warn('model', p.url, e));
    }
  }
  mark();
}
