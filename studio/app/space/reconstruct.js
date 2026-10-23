// Walkable 3D reconstruction of a real exhibition, built from a space file (data/spaces/*.json).
// The file holds the room's measurements, where each work hangs, and the camera positions of the
// installation photos it was reconstructed from, so every view can be checked against its photo.
// Coordinates: x across the room, y up, z from wall A (z = 0) to wall B (z = length), in metres.

const EYE = 1.6, DEPTH = 0.035;

export async function openSpace({ spec, works, src, onClose, onOpenWork }) {
  const THREE = await import('three');
  const { RoomEnvironment } = await import('three/addons/environments/RoomEnvironment.js');
  const R = spec.room, W = R.width, L = R.length, H = R.height;

  // --- overlay -------------------------------------------------------------
  const root = document.createElement('div');
  root.className = 'sv'; root.setAttribute('role', 'dialog'); root.setAttribute('aria-label', `${spec.title}, 3D space`);
  root.innerHTML = `
    <div class="sv-top"><button type="button" class="sv-x">← Exit</button>
      <div class="sv-t"><b>${spec.title}</b><span>${spec.source}</span></div></div>
    <div class="sv-modes seg" role="group" aria-label="Move by"><button type="button" data-mode="works" aria-pressed="true">Works</button><button type="button" data-mode="photos" aria-pressed="false">Photos</button></div>
    <figure class="sv-photo" hidden><img alt=""><figcaption>Original photo · Elad Sarig</figcaption></figure>
    <div class="sv-card"><div class="sv-info"></div>
      <div class="sv-nav"><button type="button" class="sv-prev" aria-label="Previous">←</button><span class="sv-count"></span><button type="button" class="sv-next" aria-label="Next">→</button></div></div>
    <div class="sv-loading">Building the room…</div>`;
  document.body.append(root);
  const $ = s => root.querySelector(s);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  root.prepend(renderer.domElement);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#d9d8d4');
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 1.05;
  scene.add(new THREE.HemisphereLight(0xffffff, 0xb59a80, 0.32));
  const camera = new THREE.PerspectiveCamera(55, 1, 0.05, 80);
  const aniso = renderer.capabilities.getMaxAnisotropy();
  const loader = new THREE.TextureLoader();
  const loadTex = url => new Promise(res => loader.load(url, t => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = aniso; res(t); }, undefined, () => res(null)));

  // --- the room ------------------------------------------------------------
  const wallMat = new THREE.MeshStandardMaterial({ color: R.wall || '#EDEDEA', roughness: 0.95, side: THREE.DoubleSide });
  const dark = new THREE.MeshStandardMaterial({ color: '#2b2b2b', roughness: 0.6 });
  const rail = new THREE.MeshStandardMaterial({ color: '#e6e6e3', roughness: 0.7 });
  const [floorTex, baseTex] = await Promise.all([loadTex(src(R.floor)), loadTex(src(R.baseboard))]);

  if (floorTex) { floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping; floorTex.repeat.set(W / R.floorTile, L / R.floorTile); }
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, L), new THREE.MeshStandardMaterial({ map: floorTex, color: floorTex ? '#ffffff' : '#93806c', roughness: 0.45, envMapIntensity: 0.45 }));
  floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0, L / 2); scene.add(floor);
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(W, L), wallMat); ceil.rotation.x = Math.PI / 2; ceil.position.set(0, H, L / 2); scene.add(ceil);
  if (R.soffit) {
    const s = R.soffit;
    const box = new THREE.Mesh(new THREE.BoxGeometry(s.width, H - s.height, L), wallMat);
    box.position.set(0, (H + s.height) / 2, L / 2); scene.add(box);
    for (const sx of [-1, 1]) {
      const track = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.03, L - 0.4), rail);
      track.position.set(sx * (s.width / 2 - 0.1), s.height - 0.015, L / 2); scene.add(track);
      const slot = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.002, L - 0.4), dark);
      slot.position.set(sx * (s.width / 2 - 0.1), s.height - 0.031, L / 2); scene.add(slot);
    }
  }
  const trackY = R.soffit ? R.soffit.height - 0.05 : H - 0.1, trackX = R.soffit ? R.soffit.width / 2 - 0.1 : W / 2 - 1;

  // long walls (L, R) carry openings; u runs along the wall from wall A
  const openingsOn = side => (R.openings || []).filter(o => o.wall === side);
  function longWall(side) {
    const shape = new THREE.Shape();
    shape.moveTo(0, 0); shape.lineTo(L, 0); shape.lineTo(L, H); shape.lineTo(0, H); shape.lineTo(0, 0);
    for (const o of openingsOn(side)) {
      const r = o.arch ? (o.to - o.from) / 2 : 0, hole = new THREE.Path();
      hole.moveTo(o.from, 0); hole.lineTo(o.to, 0); hole.lineTo(o.to, o.height - r);
      if (o.arch) hole.absarc((o.from + o.to) / 2, o.height - r, r, 0, Math.PI, false); else hole.lineTo(o.from, o.height);
      hole.lineTo(o.from, 0); shape.holes.push(hole);
    }
    const m = new THREE.Mesh(new THREE.ShapeGeometry(shape, 24), wallMat);
    m.rotation.y = -Math.PI / 2; m.position.set(side === 'L' ? -W / 2 : W / 2, 0, 0); scene.add(m);
    // the space seen through an opening: a plain white room behind it
    for (const o of openingsOn(side)) {
      const depth = 3.2, roomBox = new THREE.Mesh(new THREE.BoxGeometry(depth, o.height + 0.3, o.to - o.from + 2.4), new THREE.MeshStandardMaterial({ color: '#F1F1EE', roughness: 1, side: THREE.BackSide }));
      roomBox.position.set((side === 'L' ? -1 : 1) * (W / 2 + depth / 2), (o.height + 0.3) / 2, (o.from + o.to) / 2); scene.add(roomBox);
    }
  }
  longWall('L'); longWall('R');
  for (const [z, ry] of [[0, 0], [L, Math.PI]]) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(W, H), wallMat); m.position.set(0, H / 2, z); m.rotation.y = ry; scene.add(m);
  }

  // baseboards, broken at openings
  const bbH = R.baseboardHeight || 0.1;
  function baseboard(len, place) {
    const t = baseTex ? baseTex.clone() : null;
    if (t) { t.wrapS = THREE.RepeatWrapping; t.repeat.set(len / 4.3, 1); t.needsUpdate = true; }
    const m = new THREE.Mesh(new THREE.PlaneGeometry(len, bbH), new THREE.MeshStandardMaterial({ map: t, color: t ? '#ffffff' : '#7a6656', roughness: 0.45 }));
    place(m); scene.add(m);
  }
  for (const side of ['L', 'R']) {
    const cuts = [0, ...openingsOn(side).flatMap(o => [o.from, o.to]), L];
    for (let i = 0; i < cuts.length; i += 2) {
      const a = cuts[i], b = cuts[i + 1]; if (b - a < 0.05) continue;
      baseboard(b - a, m => { m.rotation.y = side === 'L' ? Math.PI / 2 : -Math.PI / 2; m.position.set((side === 'L' ? -1 : 1) * (W / 2 - 0.012), bbH / 2, (a + b) / 2); });
    }
  }
  baseboard(W, m => m.position.set(0, bbH / 2, 0.012));
  baseboard(W, m => { m.rotation.y = Math.PI; m.position.set(0, bbH / 2, L - 0.012); });

  // --- the works -----------------------------------------------------------
  const WALL = {
    A: { n: new THREE.Vector3(0, 0, 1), at: (u, y) => new THREE.Vector3(u, y, 0) },
    B: { n: new THREE.Vector3(0, 0, -1), at: (u, y) => new THREE.Vector3(-u, y, L) },
    L: { n: new THREE.Vector3(1, 0, 0), at: (u, y) => new THREE.Vector3(-W / 2, y, u) },
    R: { n: new THREE.Vector3(-1, 0, 0), at: (u, y) => new THREE.Vector3(W / 2, y, u) },
  };
  const shadowTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d');
    x.filter = 'blur(18px)'; x.fillStyle = '#000'; x.fillRect(48, 48, 160, 160); return new THREE.CanvasTexture(c);
  })();
  const sideMat = new THREE.MeshStandardMaterial({ color: '#d9d2c4', roughness: 0.85 });

  // orient the recorded size to the photo, since records mix height × width and width × height
  function sizeOf(w, aspect) {
    let best = null;
    for (const [a, b] of w.pairs || []) for (const [h, wd] of [[a, b], [b, a]]) {
      const err = Math.abs((wd / h) / aspect - 1);
      if (!best || err < best.err) best = { h, w: wd, err };
    }
    return best || { h: 100, w: 100 * aspect, err: 1 };
  }

  const pieces = [];
  await Promise.all(spec.hang.map(async h => {
    const w = works.find(x => x.title.toLowerCase() === h.work.toLowerCase());
    const wall = WALL[h.wall];
    if (!w || !wall) return;
    const tex = await loadTex(src(w.image)); if (!tex) return;
    const size = sizeOf(w, tex.image.width / tex.image.height), hM = size.h / 100, wM = size.w / 100;
    const centre = wall.at(h.at, h.center);
    const g = new THREE.Group(); g.position.copy(centre).addScaledVector(wall.n, DEPTH / 2 + 0.004); g.lookAt(g.position.clone().add(wall.n));
    const box = new THREE.Mesh(new THREE.BoxGeometry(wM, hM, DEPTH), [sideMat, sideMat, sideMat, sideMat, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6 }), sideMat]);
    const sh = new THREE.Mesh(new THREE.PlaneGeometry(wM + 0.12, hM + 0.14), new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, opacity: 0.24, depthWrite: false }));
    sh.position.set(0.02, -0.05, -DEPTH / 2 - 0.002); g.add(box, sh); scene.add(g);
    // a spot from the nearer ceiling track, aimed at the centre of the work
    const tx = h.wall === 'L' ? -trackX : h.wall === 'R' ? trackX : (h.at >= 0 ? trackX : -trackX) * (h.wall === 'B' ? -1 : 1);
    const tz = h.wall === 'A' ? 1.6 : h.wall === 'B' ? L - 1.6 : h.at;
    const pos = new THREE.Vector3(tx, trackY, tz), dist = pos.distanceTo(centre);
    const spot = new THREE.SpotLight(0xfff1e2, 6 * dist * dist / 4, 0, Math.atan((Math.max(wM, hM) / 2 + 0.4) / dist), 0.85, 2);
    spot.position.copy(pos); spot.target.position.copy(centre); scene.add(spot, spot.target);
    const head = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.12, 14), rail);
    head.position.copy(pos); head.lookAt(centre); head.rotateX(Math.PI / 2); scene.add(head);
    const maxD = h.wall === 'A' || h.wall === 'B' ? L - 1 : W - 0.35;
    const stand = centre.clone().addScaledVector(wall.n, Math.min(Math.max(1.5 * Math.max(wM, hM), 1.6), maxD)).setY(EYE);
    pieces.push({ w, size, mesh: box, centre, stand, order: spec.hang.indexOf(h) });
  }));
  pieces.sort((a, b) => a.order - b.order);

  // --- camera and stops ----------------------------------------------------
  let mode = 'works', idx = 0, yaw = 0, pitch = 0, drag = null, moved = 0;
  const pos = new THREE.Vector3(...(spec.views[0]?.pos || [0, EYE, L - 2])), look = new THREE.Vector3(...(spec.views[0]?.look || [0, EYE, 0]));
  const tPos = pos.clone(), tLook = look.clone();
  let tFov = 55, free = false;
  const fmtSize = p => `${p.size.h} × ${p.size.w} cm`;

  function show() {
    const list = mode === 'works' ? pieces : spec.views;
    idx = (idx + list.length) % list.length; free = false;
    $('.sv-count').textContent = `${idx + 1} / ${list.length}`;
    const photo = $('.sv-photo');
    if (mode === 'works') {
      const p = pieces[idx]; tPos.copy(p.stand); tLook.copy(p.centre); tFov = 55; photo.hidden = true;
      $('.sv-info').innerHTML = `<b>${p.w.title}${p.w.sold ? ' <span class="dot" aria-label="Sold"></span>' : ''}</b><span>${p.w.artist.name}, ${p.w.year} · ${p.w.medium}</span><span class="sv-s">${fmtSize(p)}${p.size.err > 0.06 ? ' · size to confirm' : ''}</span><button type="button" class="sv-open">Open work</button>`;
      $('.sv-open').onclick = () => onOpenWork(p.w);
    } else {
      const v = spec.views[idx]; tPos.set(...v.pos); tLook.set(...v.look); tFov = v.fov || 50;
      photo.hidden = false; photo.querySelector('img').src = src(v.photo);
      $('.sv-info').innerHTML = `<b>${v.name}</b><span>Same viewpoint as the photo, to compare the reconstruction with the real room.</span>`;
    }
  }
  root.querySelectorAll('[data-mode]').forEach(b => b.onclick = () => {
    mode = b.dataset.mode; idx = 0;
    root.querySelectorAll('[data-mode]').forEach(x => x.setAttribute('aria-pressed', x === b)); show();
  });
  $('.sv-next').onclick = () => { idx++; show(); };
  $('.sv-prev').onclick = () => { idx--; show(); };
  $('.sv-photo').onclick = () => $('.sv-photo').classList.toggle('big');

  const canvas = renderer.domElement;
  canvas.addEventListener('pointerdown', e => { drag = { x: e.clientX, y: e.clientY }; moved = 0; canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener('pointermove', e => {
    if (!drag) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y; moved += Math.abs(dx) + Math.abs(dy); drag = { x: e.clientX, y: e.clientY };
    if (moved > 6 && !free) { free = true; const d = new THREE.Vector3().subVectors(look, pos); yaw = Math.atan2(-d.x, -d.z); pitch = Math.atan2(d.y, Math.hypot(d.x, d.z)); tPos.copy(pos); }
    if (free) { yaw += dx * 0.005; pitch = Math.max(-0.5, Math.min(0.5, pitch + dy * 0.003)); }
  });
  const ray = new THREE.Raycaster();
  canvas.addEventListener('pointerup', e => {
    if (!drag) return; drag = null; if (moved > 6) return;
    const r = canvas.getBoundingClientRect();
    ray.setFromCamera({ x: (e.clientX - r.left) / r.width * 2 - 1, y: -(e.clientY - r.top) / r.height * 2 + 1 }, camera);
    const hit = ray.intersectObjects(pieces.map(p => p.mesh))[0];
    if (hit) { mode = 'works'; root.querySelectorAll('[data-mode]').forEach(x => x.setAttribute('aria-pressed', x.dataset.mode === 'works')); idx = pieces.findIndex(p => p.mesh === hit.object); show(); }
  });
  const onKey = e => { if (e.key === 'Escape') close(); if (e.key === 'ArrowRight') { idx++; show(); } if (e.key === 'ArrowLeft') { idx--; show(); } };
  document.addEventListener('keydown', onKey);

  function resize() {
    const r = root.getBoundingClientRect(); renderer.setSize(r.width, r.height, false);
    camera.aspect = r.width / r.height; camera.updateProjectionMatrix();
  }
  const ro = new ResizeObserver(resize); ro.observe(root); resize();

  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let last = performance.now(), running = true;
  (function frame(now) {
    if (!running) return;
    requestAnimationFrame(frame);
    const dt = Math.min((now - last) / 1000, 0.05); last = now;
    if (free) tLook.set(pos.x - Math.sin(yaw) * Math.cos(pitch), pos.y + Math.sin(pitch), pos.z - Math.cos(yaw) * Math.cos(pitch));
    const k = reduce ? 1 : 1 - Math.pow(0.02, dt);
    pos.lerp(tPos, k); look.lerp(tLook, k);
    // the photos were taken with a wider lens on a phone held upright, so fov eases with the stop
    camera.fov += (tFov * (camera.aspect < 1 ? 1.45 : 1) - camera.fov) * k; camera.updateProjectionMatrix();
    camera.position.copy(pos); camera.lookAt(look);
    renderer.render(scene, camera);
  })(last);

  function close() {
    running = false; ro.disconnect(); document.removeEventListener('keydown', onKey);
    renderer.dispose(); root.remove(); onClose();
  }
  $('.sv-x').onclick = close;
  $('.sv-loading').hidden = true;
  show();
  return { close: () => { running = false; ro.disconnect(); document.removeEventListener('keydown', onKey); renderer.dispose(); root.remove(); } };
}
