// Walkable 3D reconstruction of a real exhibition, built from a space file (data/spaces/*.json).
// The file holds the room's measurements, where each work hangs, and the camera positions of the
// installation photos it was reconstructed from, so every view can be checked against its photo.
// Coordinates: x across the room, y up, z from wall A (z = 0) to wall B (z = length), in metres.

const EYE = 1.6, DEPTH = 0.035, WALK = 1.3, MARGIN = 0.35;

export async function openSpace({ spec, works, src, onClose, onOpenWork }) {
  const THREE = await import('three');
  const { RoomEnvironment } = await import('three/addons/environments/RoomEnvironment.js');
  const { Reflector } = await import('three/addons/objects/Reflector.js');
  const R = spec.room, W = R.width, L = R.length, H = R.height;

  // --- overlay -------------------------------------------------------------
  const root = document.createElement('div');
  root.className = 'sv'; root.setAttribute('role', 'dialog'); root.setAttribute('aria-label', `${spec.title}, 3D space`);
  root.innerHTML = `
    <div class="sv-top"><button type="button" class="sv-x">← Exit</button>
      <div class="sv-t"><b>${spec.title}</b><span>${spec.source}</span></div></div>
    <div class="sv-modes seg" role="group" aria-label="Move by"><button type="button" data-mode="walk" aria-pressed="true">Walk</button><button type="button" data-mode="works" aria-pressed="false">Works</button><button type="button" data-mode="photos" aria-pressed="false">Photos</button></div>
    <figure class="sv-photo" hidden><img alt=""><figcaption>Original photo · Elad Sarig</figcaption></figure>
    <span class="sv-dot" aria-hidden="true"></span>
    <div class="sv-joy" role="application" aria-label="Walk: drag the knob to move"><i></i></div>
    <div class="sv-hint">Drag to look around<br>Joystick to walk · Tap the floor to go there</div>
    <div class="sv-card"><div class="sv-info"></div>
      <div class="sv-nav"><button type="button" class="sv-prev" aria-label="Previous">←</button><span class="sv-count"></span><button type="button" class="sv-next" aria-label="Next">→</button></div></div>
    <div class="sv-loading">Building the room…</div>`;
  document.body.append(root);
  const $ = s => root.querySelector(s);
  if (matchMedia('(pointer: fine)').matches) $('.sv-hint').innerHTML = 'Drag to look around<br>W A S D or arrows to walk · Click the floor to go there';

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  root.prepend(renderer.domElement);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#d9d8d4');
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.55;
  scene.add(new THREE.HemisphereLight(0xffffff, 0xd2c8bf, 1.05));
  const camera = new THREE.PerspectiveCamera(55, 1, 0.05, 80);
  const aniso = renderer.capabilities.getMaxAnisotropy();
  const loader = new THREE.TextureLoader();
  const loadTex = url => new Promise(res => loader.load(url, t => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = aniso; res(t); }, undefined, () => res(null)));

  // --- the room ------------------------------------------------------------
  const wallMat = new THREE.MeshStandardMaterial({ color: R.wall || '#EDEDEA', roughness: 0.95, side: THREE.DoubleSide });
  const dark = new THREE.MeshStandardMaterial({ color: '#2b2b2b', roughness: 0.6 });
  const rail = new THREE.MeshStandardMaterial({ color: '#e6e6e3', roughness: 0.7 });
  const [floorTex, baseTex] = await Promise.all([loadTex(src(R.floor)), loadTex(src(R.baseboard))]);
  const floorMat = (w, l) => {
    const t = floorTex ? floorTex.clone() : null;
    if (t) { t.wrapS = t.wrapT = THREE.MirroredRepeatWrapping; t.repeat.set(w / R.floorTile, l / R.floorTile); t.needsUpdate = true; }   // mirrored: no seams between tiles
    // the mirror below carries the reflections, so the stone's own highlights stay faint
    return new THREE.MeshPhysicalMaterial({ map: t, color: t ? (R.floorTint || '#ffffff') : '#93806c', roughness: 0.4, specularIntensity: 0.15, envMapIntensity: 0.08 });
  };

  // polished terrazzo: a mirror under a see-through floor, so the works and walls reflect softly as in the photos.
  // Like real stone, it reflects little straight down and more at a low angle (Fresnel)
  const [rNear, rLow] = R.floorReflect || [0, 0];   // share of mirror looking straight down, and at a low angle
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, L), floorMat(W, L));
  floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0, L / 2); scene.add(floor);
  if (rLow) {
    floor.material.transparent = true; floor.material.envMapIntensity = 0;
    floor.material.onBeforeCompile = sh => {
      sh.fragmentShader = sh.fragmentShader.replace('#include <dithering_fragment>',
        `float facing = clamp(dot(normalize(vViewPosition), normal), 0.0, 1.0);
        gl_FragColor.a = 1.0 - mix(${rNear.toFixed(3)}, ${rLow.toFixed(3)}, pow(1.0 - facing, 3.0));
        #include <dithering_fragment>`);
    };
    const mirror = new Reflector(new THREE.PlaneGeometry(W, L), { textureWidth: 320, textureHeight: 640, color: 0xffffff, clipBias: 0.003 });
    mirror.material.fragmentShader = mirror.material.fragmentShader.replace('blendOverlay( base.rgb, color )', 'base.rgb * color');   // a plain mirror, dimmed by the floor above it
    mirror.rotation.x = -Math.PI / 2; mirror.position.set(0, -0.002, L / 2); scene.add(mirror);
    const draw = mirror.onBeforeRender;
    mirror.onBeforeRender = (...a) => { floor.visible = false; draw.apply(mirror, a); floor.visible = true; };
  }
  // the ceiling beside the soffit gets no direct light, so it reads grey in the photos
  const ceilMat = new THREE.MeshStandardMaterial({ color: R.ceiling || '#d0cdc8', roughness: 0.95, side: THREE.DoubleSide });
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(W, L), ceilMat); ceil.rotation.x = Math.PI / 2; ceil.position.set(0, H, L / 2); scene.add(ceil);
  if (R.soffit) {
    const s = R.soffit;
    const box = new THREE.Mesh(new THREE.BoxGeometry(s.width, H - s.height, L), [ceilMat, ceilMat, ceilMat, wallMat, ceilMat, ceilMat]);
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
  const outline = (o, path) => {
    const r = o.arch ? (o.to - o.from) / 2 : 0;
    path.moveTo(o.from, 0); path.lineTo(o.to, 0); path.lineTo(o.to, o.height - r);
    if (o.arch) path.absarc((o.from + o.to) / 2, o.height - r, r, 0, Math.PI, false); else path.lineTo(o.from, o.height);
    path.lineTo(o.from, 0); return path;
  };
  const hidden = new THREE.MeshBasicMaterial({ visible: false });
  const revealMat = new THREE.MeshStandardMaterial({ color: R.wall || '#EDEDEA', roughness: 0.95, side: THREE.BackSide });
  function longWall(side) {
    const shape = new THREE.Shape(), out = side === 'L' ? -1 : 1;
    shape.moveTo(0, 0); shape.lineTo(L, 0); shape.lineTo(L, H); shape.lineTo(0, H); shape.lineTo(0, 0);
    for (const o of openingsOn(side)) shape.holes.push(outline(o, new THREE.Path()));
    const m = new THREE.Mesh(new THREE.ShapeGeometry(shape, 24), wallMat);
    m.rotation.y = -Math.PI / 2; m.position.set(out * W / 2, 0, 0); scene.add(m);
    for (const o of openingsOn(side)) {
      const d = o.depth || 0.3;
      // the thickness of the wall inside the opening (its reveal), then the next room seen through it
      const geo = new THREE.ExtrudeGeometry(outline(o, new THREE.Shape()), { depth: d, bevelEnabled: false, curveSegments: 24 });
      if (side === 'R') geo.translate(0, 0, -d);
      const rev = new THREE.Mesh(geo, [hidden, revealMat]); rev.rotation.y = -Math.PI / 2; rev.position.set(out * W / 2, 0, 0); scene.add(rev);
      const sill = new THREE.Mesh(new THREE.PlaneGeometry(d, o.to - o.from), floorMat(d, o.to - o.from));
      sill.rotation.x = -Math.PI / 2; sill.position.set(out * (W / 2 + d / 2), 0.001, (o.from + o.to) / 2); scene.add(sill);
      const depth = 3.2, len = o.to - o.from + 2.4, cx = out * (W / 2 + d + depth / 2), cz = (o.from + o.to) / 2;
      const room = new THREE.Mesh(new THREE.BoxGeometry(depth, H, len), new THREE.MeshStandardMaterial({ color: R.wall || '#F1F1EE', roughness: 1, side: THREE.BackSide }));
      room.position.set(cx, H / 2, cz); scene.add(room);
      const f = new THREE.Mesh(new THREE.PlaneGeometry(depth, len), floorMat(depth, len));
      f.rotation.x = -Math.PI / 2; f.position.set(cx, 0.002, cz); scene.add(f);
      const lamp = new THREE.PointLight(0xfff4ea, 2.2, 0, 2); lamp.position.set(cx, H - 0.4, cz); scene.add(lamp);
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
    // same light on every wall: a spot meeting a wall head-on (the end walls) is dimmed to match the long walls' raking light
    const facing = wall.n.dot(pos.clone().sub(centre).normalize());
    const spot = new THREE.SpotLight(0xfff7ef, 4.5 * dist * dist / 4 * Math.min(1, 0.6 / facing), 0, Math.atan((Math.max(wM, hM) / 2 + 0.7) / dist), 1, 2);
    spot.position.copy(pos); spot.target.position.copy(centre); scene.add(spot, spot.target);
    const head = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.12, 14), rail);
    head.position.copy(pos); head.lookAt(centre); head.rotateX(Math.PI / 2); scene.add(head);
    const maxD = h.wall === 'A' || h.wall === 'B' ? L - 1 : W - MARGIN;
    const stand = centre.clone().addScaledVector(wall.n, Math.min(Math.max(1.5 * Math.max(wM, hM), 1.6), maxD)).setY(EYE);
    pieces.push({ w, size, mesh: box, centre, stand, order: spec.hang.indexOf(h) });
  }));
  pieces.sort((a, b) => a.order - b.order);

  // --- moving: walk freely, or step between the works or the photos' viewpoints ---------
  let mode = 'walk', idx = 0, yaw = 0, pitch = 0, drag = null, moved = 0, walkTo = null;
  const v0 = spec.views[0];
  const pos = new THREE.Vector3(...(v0?.pos || [0, EYE, L - 2])).setY(EYE), look = new THREE.Vector3(...(v0?.look || [0, EYE, 0])).setY(EYE);
  const tPos = pos.clone(), tLook = look.clone();
  let tFov = 50, free = true;
  const fmtSize = p => `${p.size.h} × ${p.size.w} cm`;
  const workInfo = p => `<b>${p.w.title}${p.w.sold ? ' <span class="dot" aria-label="Sold"></span>' : ''}</b><span>${p.w.artist.name}, ${p.w.year} · ${p.w.medium}</span><span class="sv-s">${fmtSize(p)}${p.size.err > 0.06 ? ' · size to confirm' : ''}</span><button type="button" class="sv-open">Open work</button>`;

  function aimFrom(from, to) { const d = new THREE.Vector3().subVectors(to, from); yaw = Math.atan2(-d.x, -d.z); pitch = Math.atan2(d.y, Math.hypot(d.x, d.z)); }
  aimFrom(pos, look);
  function goFree() { if (!free) { aimFrom(pos, look); tPos.copy(pos); free = true; } }
  function setMode(m) {
    mode = m; root.classList.toggle('walk', m === 'walk');
    root.querySelectorAll('[data-mode]').forEach(x => x.setAttribute('aria-pressed', x.dataset.mode === m));
  }

  let focused = null;
  function show() {
    if (mode === 'walk') {
      goFree(); tFov = 50; $('.sv-photo').hidden = true; tPos.y = EYE; focused = undefined; return;
    }
    const list = mode === 'works' ? pieces : spec.views;
    idx = (idx + list.length) % list.length; free = false; walkTo = null; $('.sv-card').hidden = false;
    $('.sv-count').textContent = `${idx + 1} / ${list.length}`;
    const photo = $('.sv-photo');
    if (mode === 'works') {
      const p = pieces[idx]; tPos.copy(p.stand); tLook.copy(p.centre); tFov = 55; photo.hidden = true;
      $('.sv-info').innerHTML = workInfo(p);
      $('.sv-open').onclick = () => onOpenWork(p.w);
    } else {
      const v = spec.views[idx]; tPos.set(...v.pos); tLook.set(...v.look); tFov = v.fov || 50;
      photo.hidden = false; photo.querySelector('img').src = src(v.photo);
      $('.sv-info').innerHTML = `<b>${v.name}</b><span>The photo's own camera, measured from it, to compare the reconstruction with the real room.</span>`;
    }
  }
  // while walking, the card names the work in front of you
  const ray = new THREE.Raycaster(), centreRay = new THREE.Vector2(0, 0);
  function focus() {
    ray.setFromCamera(centreRay, camera);
    const hit = ray.intersectObjects(pieces.map(p => p.mesh))[0];
    const p = hit && hit.distance < 5 ? pieces.find(x => x.mesh === hit.object) : null;
    if (p === focused) return;
    focused = p;
    $('.sv-card').hidden = !p;
    $('.sv-info').innerHTML = p ? workInfo(p) : '';
    if (p) $('.sv-open').onclick = () => onOpenWork(p.w);
  }
  root.querySelectorAll('[data-mode]').forEach(b => b.onclick = () => { setMode(b.dataset.mode); idx = 0; show(); });
  $('.sv-next').onclick = () => { idx++; show(); };
  $('.sv-prev').onclick = () => { idx--; show(); };
  $('.sv-photo').onclick = () => $('.sv-photo').classList.toggle('big');

  // where you may stand: inside the room, and into the depth of an opening to look through it
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  function clampStand(p, from) {
    const ops = R.openings || [];
    // already inside an opening: its sides hold you until you step back into the room
    const within = ops.find(o => (o.wall === 'L' ? from.x < -W / 2 + MARGIN : from.x > W / 2 - MARGIN) && from.z > o.from && from.z < o.to);
    p.z = within ? clamp(p.z, within.from + 0.3, within.to - 0.3) : clamp(p.z, MARGIN, L - MARGIN);
    let minX = -W / 2 + MARGIN, maxX = W / 2 - MARGIN;
    for (const o of ops) if (p.z >= o.from + 0.3 && p.z <= o.to - 0.3) {
      if (o.wall === 'L') minX = -W / 2 - (o.depth || 0) + 0.15; else maxX = W / 2 + (o.depth || 0) - 0.15;
    }
    p.x = clamp(p.x, minX, maxX);
    return p;
  }

  const hint = $('.sv-hint'); let hintGone = false;
  const dropHint = () => { if (!hintGone) { hintGone = true; hint.classList.add('gone'); } };
  setTimeout(dropHint, 6000);

  const canvas = renderer.domElement;
  canvas.addEventListener('pointerdown', e => { drag = { x: e.clientX, y: e.clientY }; moved = 0; canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener('pointermove', e => {
    if (!drag) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y; moved += Math.abs(dx) + Math.abs(dy); drag = { x: e.clientX, y: e.clientY };
    if (moved > 6) { goFree(); dropHint(); yaw += dx * 0.005; pitch = Math.max(-0.6, Math.min(0.6, pitch + dy * 0.003)); }
  });
  canvas.addEventListener('pointerup', e => {
    if (!drag) return; drag = null; if (moved > 6) return;
    const r = canvas.getBoundingClientRect();
    ray.setFromCamera({ x: (e.clientX - r.left) / r.width * 2 - 1, y: -(e.clientY - r.top) / r.height * 2 + 1 }, camera);
    const hit = ray.intersectObjects([...pieces.map(p => p.mesh), floor])[0];
    if (!hit) return;
    dropHint();
    if (hit.object === floor) { setMode('walk'); show(); walkTo = clampStand(hit.point.clone().setY(EYE), hit.point); return; }
    setMode('works'); idx = pieces.findIndex(p => p.mesh === hit.object); show();
  });

  // joystick: up/down walks forward/back, left/right steps sideways
  const joy = { x: 0, y: 0 }, pad = $('.sv-joy'), knob = pad.querySelector('i');
  let joyId = null;
  const joyMove = e => {
    const r = pad.getBoundingClientRect(), rad = r.width / 2;
    let x = (e.clientX - r.left - rad) / rad, y = (e.clientY - r.top - rad) / rad;
    const m = Math.hypot(x, y); if (m > 1) { x /= m; y /= m; }
    joy.x = x; joy.y = y; knob.style.transform = `translate(${x * rad * 0.6}px, ${y * rad * 0.6}px)`;
  };
  pad.addEventListener('pointerdown', e => { joyId = e.pointerId; pad.setPointerCapture(e.pointerId); goFree(); walkTo = null; dropHint(); joyMove(e); });
  pad.addEventListener('pointermove', e => { if (e.pointerId === joyId) joyMove(e); });
  const joyEnd = e => { if (e.pointerId !== joyId) return; joyId = null; joy.x = joy.y = 0; knob.style.transform = ''; };
  pad.addEventListener('pointerup', joyEnd); pad.addEventListener('pointercancel', joyEnd);

  const keys = new Set();
  const MOVE_KEYS = ['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'q', 'e'];
  const onKey = e => {
    const k = e.key.toLowerCase();
    if (k === 'escape') return close();
    if (mode !== 'walk' && (k === 'arrowright' || k === 'arrowleft')) { idx += k === 'arrowright' ? 1 : -1; show(); return; }
    if (MOVE_KEYS.includes(k) || k === 'arrowleft' || k === 'arrowright') {
      e.preventDefault(); keys.add(k); walkTo = null; dropHint();
      if (mode !== 'walk') { setMode('walk'); show(); }
    }
  };
  const onKeyUp = e => keys.delete(e.key.toLowerCase());
  document.addEventListener('keydown', onKey); document.addEventListener('keyup', onKeyUp);

  function resize() {
    const r = root.getBoundingClientRect(); renderer.setSize(r.width, r.height, false);
    camera.aspect = r.width / r.height; camera.updateProjectionMatrix();
  }
  const ro = new ResizeObserver(resize); ro.observe(root); resize();

  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fwd = new THREE.Vector3(), side = new THREE.Vector3();
  let last = performance.now(), running = true, nextFocus = 0;
  (function frame(now) {
    if (!running) return;
    requestAnimationFrame(frame);
    const dt = Math.min((now - last) / 1000, 0.05); last = now;
    if (free) {
      const turn = (keys.has('arrowleft') || keys.has('q') ? 1 : 0) - (keys.has('arrowright') || keys.has('e') ? 1 : 0);
      yaw += turn * 1.6 * dt;
      fwd.set(-Math.sin(yaw), 0, -Math.cos(yaw)); side.set(Math.cos(yaw), 0, -Math.sin(yaw));
      const f = -joy.y + (keys.has('w') || keys.has('arrowup') ? 1 : 0) - (keys.has('s') || keys.has('arrowdown') ? 1 : 0);
      const s = joy.x + (keys.has('d') ? 1 : 0) - (keys.has('a') ? 1 : 0);
      if (f || s) {
        if (mode !== 'walk') { setMode('walk'); show(); }
        const was = tPos.clone();
        tPos.addScaledVector(fwd, f * WALK * dt).addScaledVector(side, s * WALK * dt); tPos.y = EYE; clampStand(tPos, was);
      } else if (walkTo) {
        const d = new THREE.Vector3().subVectors(walkTo, tPos), n = d.length();
        if (n < 0.02) walkTo = null; else tPos.addScaledVector(d, Math.min(1, WALK * 1.6 * dt / n));
      }
      tLook.set(tPos.x - Math.sin(yaw) * Math.cos(pitch), tPos.y + Math.sin(pitch), tPos.z - Math.cos(yaw) * Math.cos(pitch));
    }
    const k = reduce ? 1 : 1 - Math.pow(free ? 0.0005 : 0.02, dt);
    pos.lerp(tPos, k); look.lerp(tLook, k);
    // the photos were taken with a wider lens on a phone held upright, so fov eases with the stop
    camera.fov += (tFov * (camera.aspect < 1 ? 1.45 : 1) - camera.fov) * k; camera.updateProjectionMatrix();
    camera.position.copy(pos); camera.lookAt(look);
    if (mode === 'walk' && now > nextFocus) { focus(); nextFocus = now + 200; }
    renderer.render(scene, camera);
  })(last);

  function stop() {
    running = false; ro.disconnect();
    document.removeEventListener('keydown', onKey); document.removeEventListener('keyup', onKeyUp);
    renderer.dispose(); root.remove();
  }
  function close() { stop(); onClose(); }
  $('.sv-x').onclick = close;
  $('.sv-loading').hidden = true;
  setMode('walk'); show();
  return { close: stop };
}
