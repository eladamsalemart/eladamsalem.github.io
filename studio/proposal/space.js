// Builds the to-scale white-cube gallery hung with Elad's works. Shared by the proposal page and the teaser;
// build.py inlines it where a page has /*SPACE*/. fmt() comes from the page's classic script.
function buildSpace(THREE, RoomEnvironment, WORKS, onLoaded) {
  const W = 16, D = 10, H = 4.5, EYE = 1.6, CENTER = 1.45, DEPTH = 0.035;

  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#d9d8d4');
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.62;
  scene.add(new THREE.HemisphereLight(0xffffff, 0xb8b5ae, 0.12));
  const camera = new THREE.PerspectiveCamera(50, 1, 0.05, 60);
  const maxAniso = renderer.capabilities.getMaxAnisotropy();

  // --- procedural surfaces -------------------------------------------------
  function noiseCanvas(size, base, spread, joints) {
    const c = document.createElement('canvas'); c.width = c.height = size;
    const x = c.getContext('2d'); x.fillStyle = base; x.fillRect(0, 0, size, size);
    for (let i = 0; i < 2600; i++) {
      const r = Math.random() * size * 0.06, a = Math.random() * spread;
      x.fillStyle = Math.random() < 0.5 ? `rgba(255,255,255,${a})` : `rgba(0,0,0,${a})`;
      x.beginPath(); x.arc(Math.random() * size, Math.random() * size, r, 0, 7); x.fill();
    }
    if (joints) { x.strokeStyle = 'rgba(60,58,54,.35)'; x.lineWidth = 2; x.strokeRect(1, 1, size - 2, size - 2); }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = maxAniso;
    return t;
  }
  const floorTex = noiseCanvas(1024, '#aaa7a0', 0.022, true); floorTex.repeat.set(W / 4, D / 4);
  const floorMat = new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.42, metalness: 0 });
  const wallMat = new THREE.MeshStandardMaterial({ color: '#eceae5', roughness: 0.95 });
  const ceilMat = new THREE.MeshStandardMaterial({ color: '#f1f0ec', roughness: 1 });
  const darkMat = new THREE.MeshStandardMaterial({ color: '#2a2a2a', roughness: 0.6 });

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, D), floorMat); floor.rotation.x = -Math.PI / 2; scene.add(floor);
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(W, D), ceilMat); ceil.rotation.x = Math.PI / 2; ceil.position.y = H; scene.add(ceil);

  // walls: centre, inward normal, "right" when facing the wall
  const WALLS = {
    N: { c: new THREE.Vector3(0, 0, -D / 2), n: new THREE.Vector3(0, 0, 1), r: new THREE.Vector3(1, 0, 0), len: W },
    E: { c: new THREE.Vector3(W / 2, 0, 0), n: new THREE.Vector3(-1, 0, 0), r: new THREE.Vector3(0, 0, 1), len: D },
    S: { c: new THREE.Vector3(0, 0, D / 2), n: new THREE.Vector3(0, 0, -1), r: new THREE.Vector3(-1, 0, 0), len: W },
    Wst: { c: new THREE.Vector3(-W / 2, 0, 0), n: new THREE.Vector3(1, 0, 0), r: new THREE.Vector3(0, 0, -1), len: D },
  };
  const DOOR = { wall: 'S', u0: -6.6, u1: -4.6, h: 2.8 };
  function wallPanel(wall, u0, u1, y0, y1) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(u1 - u0, y1 - y0), wallMat);
    m.position.copy(wall.c).addScaledVector(wall.r, (u0 + u1) / 2).setY((y0 + y1) / 2);
    m.lookAt(m.position.clone().add(wall.n)); scene.add(m);
  }
  for (const [k, wall] of Object.entries(WALLS)) {
    if (k === DOOR.wall) {
      wallPanel(wall, -wall.len / 2, DOOR.u0, 0, H); wallPanel(wall, DOOR.u1, wall.len / 2, 0, H); wallPanel(wall, DOOR.u0, DOOR.u1, DOOR.h, H);
    } else wallPanel(wall, -wall.len / 2, wall.len / 2, 0, H);
    // shadow gap at the base of the wall
    const gap = new THREE.Mesh(new THREE.PlaneGeometry(wall.len, 0.012), new THREE.MeshBasicMaterial({ color: '#3a3936' }));
    gap.position.copy(wall.c).addScaledVector(wall.n, 0.002).setY(0.006); gap.lookAt(gap.position.clone().add(wall.n)); scene.add(gap);
  }
  // bright corridor beyond the doorway
  {
    const wall = WALLS.S, mid = (DOOR.u0 + DOOR.u1) / 2;
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(DOOR.u1 - DOOR.u0, DOOR.h), new THREE.MeshBasicMaterial({ color: '#fbfaf6' }));
    glow.position.copy(wall.c).addScaledVector(wall.r, mid).addScaledVector(wall.n, -1.2).setY(DOOR.h / 2); glow.lookAt(glow.position.clone().add(wall.n)); scene.add(glow);
    for (const s of [-1, 1]) {
      const side = new THREE.Mesh(new THREE.PlaneGeometry(1.2, DOOR.h), wallMat);
      side.position.copy(wall.c).addScaledVector(wall.r, mid + s * (DOOR.u1 - DOOR.u0) / 2).addScaledVector(wall.n, -0.6).setY(DOOR.h / 2);
      side.lookAt(side.position.clone().addScaledVector(wall.r, -s)); scene.add(side);
    }
  }
  // bench
  {
    const oak = noiseCanvas(256, '#a98a63', 0.05, false);
    const top = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.06, 0.45), new THREE.MeshStandardMaterial({ map: oak, roughness: 0.55 }));
    top.position.set(0, 0.45, 0.6); scene.add(top);
    for (const x of [-0.75, 0.75]) { const leg = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.42, 0.4), darkMat); leg.position.set(x, 0.21, 0.6); scene.add(leg); }
  }

  // soft wall shadow behind each work (a spot at 30° drops the shadow below and slightly around the canvas)
  const shadowTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d');
    x.filter = 'blur(18px)'; x.fillStyle = 'rgba(0,0,0,1)'; x.fillRect(48, 48, 160, 160);
    const t = new THREE.CanvasTexture(c); return t;
  })();

  function labelTexture(w) {
    const c = document.createElement('canvas'); c.width = 600; c.height = 400; const x = c.getContext('2d');
    x.fillStyle = '#fbfbf9'; x.fillRect(0, 0, 600, 400);
    x.fillStyle = '#141516'; x.font = '600 44px "Schibsted Grotesk", Arial'; x.fillText(w.t, 36, 84);
    x.font = '36px "Schibsted Grotesk", Arial'; x.fillStyle = '#3a3c3e';
    x.fillText('Elad Amsalem, ' + w.y, 36, 150); x.fillText(w.m, 36, 200);
    x.font = '32px "IBM Plex Mono", monospace'; x.fillText(fmt(w), 36, 262);
    if (!w.ok) { x.fillStyle = '#9A5B00'; x.font = '28px "IBM Plex Mono", monospace'; x.fillText('size unverified', 36, 330); }
    if (w.sold) { x.fillStyle = '#D0261D'; x.beginPath(); x.arc(548, 70, 16, 0, 7); x.fill(); }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = maxAniso; return t;
  }

  // --- the hang ---------------------------------------------------------------
  const HANG = [
    ['N', 'Celebration', -3.4], ['N', 'Gathering', 0], ['N', 'Ritual', 3.4],
    ['E', 'Woman', -2.0], ['E', 'Together', 1.9],
    ['S', 'Sunflower', -2.4], ['S', 'Adam, Adam and a Lamp', 0.9], ['S', 'Human nature', 4.6],
    ['Wst', 'Woman and a gun', -2.9], ['Wst', 'Flowers 1', -0.5], ['Wst', 'Flowers 2', 0], ['Wst', 'Flowers 3', 0.5], ['Wst', 'Nature', 2.9],
  ];
  const loader = new THREE.TextureLoader();
  const pieces = [];
  const sideMats = {};
  const lineMat = new THREE.LineBasicMaterial({ color: '#3a3c3e' });
  const dimGroups = [];
  let pending = 0;

  function textPlane(txt, wM) {
    const c = document.createElement('canvas'); c.width = 256; c.height = 64; const x = c.getContext('2d');
    x.fillStyle = '#3a3c3e'; x.font = '500 30px "IBM Plex Mono", monospace'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(txt, 128, 34);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    return new THREE.Mesh(new THREE.PlaneGeometry(wM, wM / 4), new THREE.MeshBasicMaterial({ map: t, transparent: true, toneMapped: false }));
  }

  HANG.forEach(([wk, title, u]) => {
    const w = WORKS.find(o => o.t === title); if (!w || !w.h) return;
    const wall = WALLS[wk], hM = w.h / 100, wM = w.w / 100;
    const cy = hM > 2 ? 0.3 + hM / 2 : CENTER;
    const centre = wall.c.clone().addScaledVector(wall.r, u).setY(cy);
    const g = new THREE.Group(); g.position.copy(centre).addScaledVector(wall.n, DEPTH / 2 + 0.004); g.lookAt(g.position.clone().add(wall.n));
    pending++;
    const tex = loader.load(w.src, () => { if (--pending === 0) onLoaded(); });
    tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = maxAniso;
    const side = sideMats[w.edge] || (sideMats[w.edge] = new THREE.MeshStandardMaterial({ color: w.edge, roughness: 0.8 }));
    const front = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.62 });
    const box = new THREE.Mesh(new THREE.BoxGeometry(wM, hM, DEPTH), [side, side, side, side, front, side]);
    g.add(box);
    const sh = new THREE.Mesh(new THREE.PlaneGeometry(wM + 0.14, hM + 0.16), new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, opacity: 0.26, depthWrite: false }));
    sh.position.set(0, -0.045, -DEPTH / 2 - 0.002); g.add(sh);
    // wall label: right of the work at the centre line
    const lab = new THREE.Mesh(new THREE.PlaneGeometry(0.15, 0.1), new THREE.MeshStandardMaterial({ map: labelTexture(w), roughness: 0.9 }));
    lab.position.set(wM / 2 + 0.28, CENTER - cy, -DEPTH / 2 + 0.002); g.add(lab);
    // dimension lines (toggle)
    const dg = new THREE.Group(); const off = 0.09;
    const L = (a, b) => dg.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(...a), new THREE.Vector3(...b)]), lineMat));
    L([-wM / 2, -hM / 2 - off, 0], [wM / 2, -hM / 2 - off, 0]); L([-wM / 2, -hM / 2 - off - 0.02, 0], [-wM / 2, -hM / 2 - off + 0.02, 0]); L([wM / 2, -hM / 2 - off - 0.02, 0], [wM / 2, -hM / 2 - off + 0.02, 0]);
    L([-wM / 2 - off, -hM / 2, 0], [-wM / 2 - off, hM / 2, 0]); L([-wM / 2 - off - 0.02, -hM / 2, 0], [-wM / 2 - off + 0.02, -hM / 2, 0]); L([-wM / 2 - off - 0.02, hM / 2, 0], [-wM / 2 - off + 0.02, hM / 2, 0]);
    const tw = textPlane(Math.round(w.w) + ' cm', 0.34); tw.position.set(0, -hM / 2 - off - 0.06, 0); dg.add(tw);
    const th = textPlane(Math.round(w.h) + ' cm', 0.34); th.position.set(-wM / 2 - off - 0.06, 0, 0); th.rotation.z = Math.PI / 2; dg.add(th);
    dg.position.z = -DEPTH / 2 + 0.003; g.add(dg); dimGroups.push(dg);
    scene.add(g);
    // track spot: 30° from vertical, aimed at the centre of the work
    const throwH = H - 0.12 - cy, out = throwH * Math.tan(Math.PI / 6);
    const pos = centre.clone().addScaledVector(wall.n, out).setY(H - 0.12);
    const dist = pos.distanceTo(centre);
    const spot = new THREE.SpotLight(0xfff0e0, 10 * dist * dist / 4, 0, Math.atan((Math.max(wM, hM) / 2 + 0.35) / dist), 0.85, 2);
    spot.position.copy(pos); spot.target.position.copy(centre); scene.add(spot, spot.target);
    const head = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 0.14, 16), darkMat);
    head.position.copy(pos); head.lookAt(centre); head.rotateX(Math.PI / 2); scene.add(head);
    const viewDist = Math.min(Math.max(1.5 * Math.max(wM, hM), 1.6), 4.2);
    pieces.push({ w, mesh: box, centre, n: wall.n.clone(), stand: centre.clone().addScaledVector(wall.n, viewDist).setY(EYE) });
  });
  // ceiling track rails, one per wall, at the spot offset
  for (const wall of Object.values(WALLS)) {
    const out = (H - 0.12 - CENTER) * Math.tan(Math.PI / 6);
    const rail = new THREE.Mesh(new THREE.BoxGeometry(wall.len - 0.6, 0.025, 0.04), darkMat);
    rail.position.copy(wall.c).addScaledVector(wall.n, out).setY(H - 0.03); rail.lookAt(rail.position.clone().add(wall.n)); scene.add(rail);
  }
  // scale figure, 175 cm, beside Gathering (toggle)
  const fig = new THREE.Group();
  {
    const m = new THREE.MeshStandardMaterial({ color: '#55585b', roughness: 0.9 });
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.17, 1.16, 6, 16), m); body.position.y = 0.17 + 0.58 + 0.02; fig.add(body);
    const headM = new THREE.Mesh(new THREE.SphereGeometry(0.11, 20, 16), m); headM.position.y = 1.75 - 0.11; fig.add(headM);
    fig.position.set(1.9, 0, -D / 2 + 0.3); fig.visible = false; scene.add(fig);
  }
  return { renderer, scene, camera, pieces, fig, dimGroups, EYE, D };
}
