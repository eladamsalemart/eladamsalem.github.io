// The 3D space of an exhibition, as built from its photos by space/pipeline (data/spaces/<slug>.json, v2).
//
// What makes it read as a real room and not a model:
// - walls, ceiling and the light on the floor are the photos themselves, projected onto measured surfaces,
//   so the spot pools, shadows, plaster and corners are the room's own;
// - each work is drawn from its full-quality image, at its measured size and place, as an object with
//   thickness and sides, lit by the light measured on it in the photos, with a varnish sheen that moves
//   as you do;
// - a polished floor reflects the room live, more at a low angle than straight down, as stone does.
// Coordinates are metres, y up, floor at 0.

const EYE = 1.6, WALK = 1.3, MARGIN = 0.3;

export async function openSpace({ spec, works, src, onClose, onOpenWork }) {
  const THREE = await import('three');
  const { Reflector } = await import('three/addons/objects/Reflector.js');
  const R = spec.room;

  // --- overlay -------------------------------------------------------------
  const root = document.createElement('div');
  root.className = 'sv walk'; root.setAttribute('role', 'dialog'); root.setAttribute('aria-label', `${spec.title}, 3D space`);
  root.innerHTML = `
    <div class="sv-top"><button type="button" class="sv-x">← Exit</button>
      <div class="sv-t"><b>${spec.title}</b><span>${spec.source}</span></div>
      <button type="button" class="sv-person" aria-pressed="false" title="A person, for scale" aria-label="Show a person for scale"><svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><circle cx="12" cy="4.2" r="2.4"/><path d="M8.6 8.2h6.8l1.3 6.6-1.9.4-.9-4.2V22h-2.2v-7.6h-.4V22H9.1V11l-.9 4.2-1.9-.4z"/></svg></button>
      <button type="button" class="sv-gyro" hidden aria-pressed="false" title="Look around by moving the phone">◎</button>
      <button type="button" class="sv-vr" hidden>VR</button></div>
    <div class="sv-modes seg" role="group" aria-label="Move by"><button type="button" data-mode="walk" aria-pressed="true">Walk</button><button type="button" data-mode="works" aria-pressed="false">Works</button><button type="button" data-mode="photos" aria-pressed="false">Photos</button></div>
    <svg class="sv-map" role="img" aria-label="Floor plan: the room, its works and where you stand. Tap a work to go to it."></svg>
    <figure class="sv-photo" hidden><img alt=""><figcaption>Original photo</figcaption></figure>
    <span class="sv-dot" aria-hidden="true"></span>
    <div class="sv-joy" role="application" aria-label="Walk: drag the knob to move"><i></i></div>
    <div class="sv-hint">Drag to look around<br>Joystick to walk · Tap the floor to go there</div>
    <div class="sv-card" hidden><div class="sv-info"></div>
      <div class="sv-nav"><button type="button" class="sv-prev" aria-label="Previous">←</button><span class="sv-count"></span><button type="button" class="sv-play" aria-pressed="false" aria-label="Play: go from work to work">▶</button><button type="button" class="sv-next" aria-label="Next">→</button></div></div>
    <div class="sv-loading">Building the room…</div>`;
  document.body.append(root);
  const $ = s => root.querySelector(s);
  if (matchMedia('(pointer: fine)').matches) $('.sv-hint').innerHTML = 'Drag to look around<br>W A S D or arrows to walk · Click the floor to go there';

  let dirty = true;                                               // something changed: draw the next frame
  let ibrChoose = null, ibrNear = null, ibrLeaveOut = null;                           // with many photos (a video's frames): pick the nearest
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  root.prepend(renderer.domElement);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#d8d7d3');
  // a tight depth range (far / near of a few hundred) keeps surfaces from flickering against each other
  const camera = new THREE.PerspectiveCamera(60, 1, 0.08, 45);
  const rig = new THREE.Group(); rig.add(camera); scene.add(rig);
  const aniso = renderer.capabilities.getMaxAnisotropy();
  const loader = new THREE.TextureLoader();
  const loadTex = (url, color = true) => new Promise(res => {
    if (!url) return res(null);
    loader.load(src(url), t => { t.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace; t.anisotropy = aniso; res(t); }, undefined, () => res(null));
  });
  const V = a => new THREE.Vector3(...a);
  // soft light for the few modelled surfaces (inside openings); everything else carries the photos' light
  scene.add(new THREE.HemisphereLight(0xffffff, 0xb8aa9a, 1.7));

  // --- surfaces: the photos' own light on measured planes ---------------------
  const surfaces = spec.surfaces || [];
  const texs = await Promise.all(surfaces.map(s => loadTex(s.texture)));
  const lights = await Promise.all(surfaces.map(s => loadTex(s.light, false)));
  let floorMesh = null;
  const wallColor = new THREE.Color('#f2f2ef');

  // a flat surface with holes, as triangles in its own (along, up-from-bottom) coordinates
  // pad: how far the surface runs on past its sides and top (and 1 cm under the floor), hidden behind its
  // neighbours: two planes that just meet leave a hairline between them, at a room's corner, a wall's foot or top
  function planeMesh(s, material, holes = [], pad = 0) {
    const [su, sv] = s.size;
    const lo = -Math.min(pad, 0.01);                              // under the floor just enough to close the seam
    const shape = new THREE.Shape([new THREE.Vector2(-pad, lo), new THREE.Vector2(su + pad, lo), new THREE.Vector2(su + pad, sv + pad), new THREE.Vector2(-pad, sv + pad)]);
    for (const o of holes) shape.holes.push(openingPath(o, new THREE.Path()));
    const g = new THREE.ShapeGeometry(shape, 24);
    const pos = g.attributes.position, uv = g.attributes.uv;
    const O = V(s.origin), U = V(s.u), Vd = V(s.v);
    for (let i = 0; i < pos.count; i++) {
      const a = pos.getX(i), b = pos.getY(i);                  // b: up from the texture's bottom edge
      uv.setXY(i, Math.min(1, Math.max(0, a / su)), Math.min(1, Math.max(0, b / sv)));
      const p = O.clone().addScaledVector(U, a).addScaledVector(Vd, sv - b);
      pos.setXYZ(i, p.x, p.y, p.z);
    }
    g.setAttribute('uv1', uv.clone());
    g.computeVertexNormals();
    return new THREE.Mesh(g, material);
  }
  function openingPath(o, path) {
    // an arch: half an ellipse as wide as the opening, rising as measured (a semicircle when not measured)
    const hw = (o.to - o.from) / 2, r = o.arch ? Math.min(o.rise || hw, o.height - 0.5) : 0;
    path.moveTo(o.from, 0); path.lineTo(o.to, 0); path.lineTo(o.to, o.height - r);
    if (o.arch) path.absellipse(o.from + hw, o.height - r, hw, r, 0, Math.PI, false); else path.lineTo(o.from, o.height);
    path.lineTo(o.from, 0); return path;
  }

  const floorS = surfaces.find(s => s.kind === 'floor');
  const plasterTex = await loadTex(spec.plaster);
  // the room's surfaces show the photos themselves, projected back from where each was taken (see below)
  const shots = (spec.views || []).filter(v => v.project), roomMats = [];
  const room = m => { if (shots.length) roomMats.push(m); return m; };
  surfaces.forEach((s, i) => {
    if (s.kind === 'reveal') { const r = planeMesh(s, room(new THREE.MeshBasicMaterial({ map: texs[i], toneMapped: false, side: THREE.DoubleSide }))); r.userData.kind = 'reveal'; scene.add(r); return; }
    if (s.kind === 'wall' || s.kind === 'ceiling') {
      const m = planeMesh(s, room(new THREE.MeshBasicMaterial({ map: texs[i], color: texs[i] ? 0xffffff : wallColor, toneMapped: false, side: THREE.DoubleSide })), s.openings || [], s.kind === 'wall' ? 0.03 : 0);
      m.userData.kind = s.kind; scene.add(m);
      for (const o of s.openings || []) addOpening(s, o);
    }
  });

  // through an opening: the wall's thickness, and a plain room beyond with the same floor
  function addOpening(s, o) {
    const depth = o.depth || 0.3;
    const U = V(s.u), N = V(s.normal), O = V(s.origin);
    const bottom = O.clone().addScaledVector(V(s.v), s.size[1]);  // the wall's foot at u = 0
    if (o.arch || !surfaces.some(x => x.kind === 'reveal')) {
      // an arch's curved inside (or, in older spaces, any opening's sides): modelled, in the room's plaster
      const geo = new THREE.ExtrudeGeometry(openingPath(o, new THREE.Shape()), { depth, bevelEnabled: false, curveSegments: 48 });
      const basis = new THREE.Matrix4().makeBasis(U, new THREE.Vector3(0, 1, 0), N.clone().negate());
      let side;
      if (plasterTex) {
        const t = plasterTex.clone(); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1, 1); t.needsUpdate = true;
        side = room(new THREE.MeshBasicMaterial({ map: t, color: 0xe4e2de, toneMapped: false, side: THREE.DoubleSide }));
      } else side = room(new THREE.MeshBasicMaterial({ color: '#d9d7d2', toneMapped: false, side: THREE.DoubleSide }));
      const rev = new THREE.Mesh(geo, [new THREE.MeshBasicMaterial({ visible: false }), side]);
      rev.applyMatrix4(basis); rev.position.copy(bottom); rev.userData.kind = 'reveal'; scene.add(rev);
    }
    if (o.view && !shots.length) {          // (with the photos projected, the room beyond shows as they saw it)
      // what the photos show through the opening, just behind it: the room beyond as it really is
      loadTex(o.view).then(t => {
        if (!t) return;
        const w0 = o.to - o.from, g = new THREE.PlaneGeometry(w0, o.height);
        const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ map: t, toneMapped: false, side: THREE.DoubleSide }));
        const c = bottom.clone().addScaledVector(U, (o.from + o.to) / 2).addScaledVector(N, -(depth + 0.02)).setY(o.height / 2);
        m.matrixAutoUpdate = false; m.matrix.makeBasis(U, new THREE.Vector3(0, 1, 0), N).setPosition(c);
        m.userData.kind = 'beyond'; scene.add(m); dirty = true;
      });
    }
    // the room beyond, as wide as the opening and 1.2 m more each side (but no further than the room
    // itself runs: a side room seldom reaches past the end walls), 3.2 m deep
    const u0 = Math.max(0, o.from - 1.2), u1 = Math.min(s.size[0], o.to + 1.2), w = u1 - u0, d = 3.2;
    const mid = bottom.clone().addScaledVector(U, (u0 + u1) / 2).addScaledVector(N, -(depth + d / 2));
    // its walls in the gallery's own plaster, the light falling off a little with depth (a room next door is
    // a little dimmer than the one you stand in, and darker the further in), its ceiling plain
    const bx = Math.abs(U.x) * w + Math.abs(N.x) * d, bz = Math.abs(U.z) * w + Math.abs(N.z) * d;
    const wallsOf = len => {
      if (!plasterTex) return room(new THREE.MeshBasicMaterial({ color: '#ebe9e4', vertexColors: true, toneMapped: false, side: THREE.BackSide }));
      const t = plasterTex.clone(); t.wrapS = THREE.RepeatWrapping; t.repeat.set(len / 2, 1); t.needsUpdate = true;
      return room(new THREE.MeshBasicMaterial({ map: t, vertexColors: true, toneMapped: false, side: THREE.BackSide }));
    };
    const plain = room(new THREE.MeshBasicMaterial({ color: '#e6e4df', vertexColors: true, toneMapped: false, side: THREE.BackSide }));
    const geo = new THREE.BoxGeometry(bx, R.height, bz, Math.max(2, Math.round(bx * 2)), 6, Math.max(2, Math.round(bz * 2)));
    const gp = geo.attributes.position, shade = [];
    for (let i = 0; i < gp.count; i++) {
      const p = new THREE.Vector3(gp.getX(i), gp.getY(i), gp.getZ(i)).add(mid.clone().setY(R.height / 2));
      const deep = Math.max(0, Math.min(1, (-p.clone().sub(bottom).dot(N) - depth) / d));
      const k = (1 - 0.22 * deep) * (1 - 0.06 * (p.y / R.height));
      shade.push(k, k, k);
    }
    geo.setAttribute('color', new THREE.Float32BufferAttribute(shade, 3));
    // (no bottom: the floor runs on into it, below)
    const box = new THREE.Mesh(geo, [wallsOf(bz), wallsOf(bz), plain, floorS ? new THREE.MeshBasicMaterial({ visible: false }) : plain, wallsOf(bx), wallsOf(bx)]);
    box.position.copy(mid).setY(R.height / 2); box.userData.kind = 'beyond'; scene.add(box);
    if (floorS) {
      // the floor runs on from the wall's face, through the opening, into the room beyond; it starts a little
      // inside the room, just under the room's floor, so the two never leave a hairline gap between them
      const lap = 0.03, run = depth + d + lap + 0.05;            // (on under the room beyond's far wall too)
      const fm = bottom.clone().addScaledVector(U, (u0 + u1) / 2).addScaledVector(N, lap - run / 2);
      const fw0 = w + 0.1;                                          // and under its side walls
      const fw = Math.abs(U.x) * fw0 + Math.abs(N.x) * run, fl = Math.abs(U.z) * fw0 + Math.abs(N.z) * run;
      const f = new THREE.Mesh(new THREE.PlaneGeometry(fw, fl), floorMaterial(fw, fl, false));
      f.rotation.x = -Math.PI / 2; f.position.copy(fm).setY(-0.001); f.userData.kind = 'floor'; scene.add(f);
    }
  }

  // the floor: its own texture at full detail, the light measured on it, and live reflections
  function floorMaterial(w, l, withLight = true) {
    const i = surfaces.indexOf(floorS);
    const tile = texs[i] ? texs[i].clone() : null;
    if (tile) { tile.wrapS = tile.wrapT = THREE.RepeatWrapping; tile.repeat.set(w / (floorS.tile || 1), l / (floorS.tile || 1)); tile.needsUpdate = true; }
    const c = floorS.color || [140, 120, 100];
    const m = room(new THREE.MeshBasicMaterial({ map: tile, color: tile ? 0xffffff : new THREE.Color(`rgb(${c.join(',')})`), toneMapped: false }));
    m.userData.photosAlways = withLight;                // the room's floor: always the photos' (its grain, its reflections)
    if (withLight && lights[i]) { m.lightMap = lights[i]; m.lightMapIntensity = Math.PI * (floorS.lightScale || 1); }
    return m;
  }
  if (floorS) {
    const [rNear, rLow] = spec.floorReflect || [0, 0];
    floorMesh = planeMesh(floorS, floorMaterial(floorS.size[0], floorS.size[1]));
    floorMesh.userData.kind = 'floor'; scene.add(floorMesh);
    if (rLow > 0.03) {
      floorMesh.material.transparent = true;
      floorMesh.material.onBeforeCompile = sh => {
        sh.vertexShader = sh.vertexShader.replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWorldP = (modelMatrix * vec4(transformed, 1.0)).xyz;').replace('void main() {', 'varying vec3 vWorldP;\nvoid main() {');
        sh.fragmentShader = sh.fragmentShader.replace('void main() {', 'varying vec3 vWorldP;\nvoid main() {').replace('#include <dithering_fragment>',
          `float facing = clamp(normalize(cameraPosition - vWorldP).y, 0.0, 1.0);
          gl_FragColor.a = 1.0 - mix(${rNear.toFixed(3)}, ${rLow.toFixed(3)}, pow(1.0 - facing, 3.0));
          #ifdef IBR
          gl_FragColor.a = mix(gl_FragColor.a, 1.0, ibrCover);        // where a photo shows the floor, its reflections are the real ones
          #endif
          #include <dithering_fragment>`);
      };
      // sharp enough on a phone's screen: a soft reflection reads as smeared colour on the floor
      const mirrorRes = Math.min(2048, Math.round(Math.max(innerWidth, innerHeight) * Math.min(devicePixelRatio, 2) * 0.6));
      const mirror = new Reflector(new THREE.PlaneGeometry(R.x1 - R.x0, R.z1 - R.z0), { textureWidth: mirrorRes, textureHeight: mirrorRes, color: 0xffffff, clipBias: 0.003 });
      mirror.material.fragmentShader = mirror.material.fragmentShader.replace('blendOverlay( base.rgb, color )', 'base.rgb * color');
      mirror.userData.kind = 'mirror'; mirror.rotation.x = -Math.PI / 2; mirror.position.set((R.x0 + R.x1) / 2, -0.002, (R.z0 + R.z1) / 2); scene.add(mirror);
      const draw = mirror.onBeforeRender;
      mirror.onBeforeRender = (...a) => { floorMesh.visible = false; draw.apply(mirror, a); floorMesh.visible = true; };
    }
  }

  // --- where you may stand: inside the room, and into an opening to look through ---------
  const keepOut = (spec.works || []).map(h => {
    const n = V(h.axes[2]).setY(0).normalize(), x = new THREE.Vector3(-n.z, 0, n.x);
    return { c: V(h.centre).setY(EYE), n, x, hw: h.measured[0] / 200, stop: 0.6 };
  });
  const ops = surfaces.filter(s => s.kind === 'wall').flatMap(s => (s.openings || []).map(o => ({ s, o })));
  function clampStand(p, from) {
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    const inRoom = q => q.x > R.x0 + MARGIN - 1e-6 && q.x < R.x1 - MARGIN + 1e-6 && q.z > R.z0 + MARGIN - 1e-6 && q.z < R.z1 - MARGIN + 1e-6;
    // inside an opening's depth: held between its sides until back in the room
    for (const { s, o } of ops) {
      const U = V(s.u), N = V(s.normal), base = V(s.origin);
      const rel = p.clone().sub(base), along = rel.dot(U), out = -rel.dot(N);
      const fromRel = (from || p).clone().sub(base), fromOut = -fromRel.dot(N), fromAlong = fromRel.dot(U);
      if (fromAlong > o.from + 0.25 && fromAlong < o.to - 0.25 && (out > -MARGIN || fromOut > -MARGIN)) {
        const a = clamp(along, o.from + 0.25, o.to - 0.25), d = clamp(out, -1e9, (o.depth || 0.3) - 0.1);
        if (out > -MARGIN) return base.clone().addScaledVector(U, a).addScaledVector(N, -d).setY(p.y);
      }
    }
    if (!inRoom(p)) { p.x = clamp(p.x, R.x0 + MARGIN, R.x1 - MARGIN); p.z = clamp(p.z, R.z0 + MARGIN, R.z1 - MARGIN); }
    // and not into a work: stop where its image is still sharp (about 60 cm), as a visitor would
    for (const k of keepOut) {
      const rel = p.clone().sub(k.c), a = rel.dot(k.x), d = rel.dot(k.n);
      if (Math.abs(a) < k.hw + 0.25 && d < k.stop && d > -0.3) p.addScaledVector(k.n, k.stop - d);
    }
    return p;
  }

  // --- the works ------------------------------------------------------------
  const sideMat = c => new THREE.MeshBasicMaterial({ color: c, toneMapped: false });
  const shadowTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d');
    x.filter = 'blur(10px)'; x.fillStyle = '#000'; x.fillRect(24, 24, 80, 80); return new THREE.CanvasTexture(c);
  })();
  // relief from the image itself: brightness changes become tiny slopes that catch the light at an angle
  function reliefFrom(img) {
    const w = Math.min(1024, img.width), h = Math.round(w * img.height / img.width);
    const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d');
    x.drawImage(img, 0, 0, w, h);
    const d = x.getImageData(0, 0, w, h), p = d.data, L = new Float32Array(w * h);
    for (let i = 0; i < w * h; i++) L[i] = (p[4 * i] * 0.3 + p[4 * i + 1] * 0.59 + p[4 * i + 2] * 0.11) / 255;
    const out = x.createImageData(w, h), o = out.data, k = 2.2;
    for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) {
      const i = yy * w + xx;
      const dx = (L[yy * w + Math.min(w - 1, xx + 1)] - L[yy * w + Math.max(0, xx - 1)]) * k;
      const dy = (L[Math.min(h - 1, yy + 1) * w + xx] - L[Math.max(0, yy - 1) * w + xx]) * k;
      const n = Math.hypot(dx, dy, 1);
      o[4 * i] = (-dx / n * 0.5 + 0.5) * 255; o[4 * i + 1] = (dy / n * 0.5 + 0.5) * 255; o[4 * i + 2] = (1 / n * 0.5 + 0.5) * 255; o[4 * i + 3] = 255;
    }
    x.putImageData(out, 0, 0);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.NoColorSpace; return t;
  }

  // a canvas's edge: the fabric round its stretcher (raw linen, primed white, or the painting carried round,
  // as the photos showed it), its threads where one comes close enough to see them, a few millimetres of
  // paint wrapping unevenly over the front edge, and the back edge falling into the shadow against the wall
  const EDGE_LIGHT = { right: 0.86, left: 0.86, top: 1.08, bottom: 0.6 };   // the spots are above and in front
  function canvasEdges(w, h, d, sides, img) {
    const seen = Object.entries(sides || {});
    const col = c => new THREE.Color(`rgb(${c.join(',')})`);
    let fabric = new THREE.Color('#ddd2bd');                    // raw linen, when no photo saw a side
    if (seen.length) {
      fabric = new THREE.Color(0, 0, 0);
      for (const [k, c] of seen) fabric.add(col(c).multiplyScalar(1 / EDGE_LIGHT[k] / seen.length));
    }
    return [['right', 1, 0], ['left', -1, 0], ['top', 0, 1], ['bottom', 0, -1]].map(([k, nx, ny]) => {
      const across = ny !== 0, len = across ? w : h, pos = [], eu = [], dt = [], al = [];
      for (const [a, t] of [[0, 0], [1, 0], [1, 1], [0, 1]]) {       // a: along the side, t: front (0) to back (1)
        const along = (a - 0.5) * len;
        pos.push(across ? along : nx * w / 2, across ? ny * h / 2 : along, d / 2 - t * d);
        eu.push(across ? a : (nx > 0 ? 0.999 : 0.001), across ? (ny > 0 ? 0.999 : 0.001) : a); dt.push(t); al.push(a * len);
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('eu', new THREE.Float32BufferAttribute(eu, 2));
      g.setAttribute('dt', new THREE.Float32BufferAttribute(dt, 1)); g.setAttribute('al', new THREE.Float32BufferAttribute(al, 1));
      g.setIndex([0, 1, 2, 0, 2, 3]);
      const m = new THREE.ShaderMaterial({
        side: THREE.DoubleSide,
        uniforms: { img: { value: img }, base: { value: sides && sides[k] ? col(sides[k]) : fabric.clone().multiplyScalar(EDGE_LIGHT[k]) },
          lit: { value: EDGE_LIGHT[k] }, hasImg: { value: img ? 1 : 0 }, depth: { value: d } },
        vertexShader: `attribute vec2 eu; attribute float dt, al; varying vec2 vEu; varying float vDt, vAl;
          void main() { vEu = eu; vDt = dt; vAl = al; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
        fragmentShader: `uniform sampler2D img; uniform vec3 base; uniform float lit, hasImg, depth; varying vec2 vEu; varying float vDt, vAl;
          void main() {
            float mm = vDt * depth * 1000.0;                                  // millimetres back from the front edge
            vec3 c = base;
            vec2 p = vec2(vAl * 1000.0, mm) / 0.62;                           // threads, about 16 to the centimetre
            float fw = max(fwidth(p.x), fwidth(p.y));
            float thr = (0.5 + 0.5 * sin(p.x * 6.2832)) * (0.5 + 0.5 * sin(p.y * 6.2832));
            c *= 1.0 + (thr - 0.25) * 0.14 * (1.0 - smoothstep(0.25, 0.7, fw)); // (only where they'd show, not shimmer)
            if (hasImg > 0.5) {
              float reach = 1.5 + 3.0 * fract(sin(floor(vAl * 150.0) * 12.9898) * 43758.5453);
              float k = 1.0 - smoothstep(reach * 0.5, reach, mm);
              c = mix(c, texture2D(img, vEu).rgb * lit * 0.92, k * 0.9);
            }
            c *= 1.0 - 0.4 * smoothstep(0.7, 1.0, vDt);                      // against the wall, in shadow
            gl_FragColor = vec4(c, 1.0);
            #include <colorspace_fragment>
          }`,
      });
      const e = new THREE.Mesh(g, m); e.userData.kind = 'workbody'; return e;
    });
  }

  const pieces = [], pendingFull = [];
  const inspecting = new URLSearchParams(location.search).has('inspect');
  let upgrading = false, opened = performance.now();
  await Promise.all((spec.works || []).map(async (h, order) => {
    const w = works.find(x => x.title.toLowerCase() === h.work.toLowerCase()) || { title: h.work, image: h.image, artist: { name: '' }, year: '', medium: '' };
    // a light image first, so the room opens quickly on a phone (the inspection sees the full one at once)
    const first = !inspecting && h.imageSmall ? h.imageSmall : h.image;
    const [tex, light] = await Promise.all([loadTex(first), loadTex(h.light, false)]);
    if (!tex) return;
    tex.generateMipmaps = true; tex.minFilter = THREE.LinearMipmapLinearFilter;
    const wM = h.measured[0] / 100, hM = h.measured[1] / 100, dM = h.depth || 0.035;
    const X = V(h.axes[0]), Y = V(h.axes[1]), Z = V(h.axes[2]);
    const g = new THREE.Group();
    g.matrixAutoUpdate = false;
    // the image's plane is the canvas's front; the body sits behind it, toward the wall
    const c = V(h.centre).addScaledVector(Z, -dM / 2);
    g.matrix.makeBasis(X, Y, Z).setPosition(c);
    // front: no diffuse light of its own (that is the measured light), only a faint varnish sheen from the spots
    const front = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xffffff, emissiveMap: tex, roughness: 0.42, metalness: 0, toneMapped: false });
    front.normalMap = reliefFrom(tex.image); front.normalScale.set(0.2, 0.2);
    // up close (more than one screen pixel to each pixel of the image) the image's own detail is brought out
    // a little, as the eye sees paint up close: a gentle sharpening of what is there, nothing added. And the
    // measured light, when there is one.
    const k = light ? (h.lightScale || 1).toFixed(3) : '1.0';
    front.onBeforeCompile = sh => {
      sh.uniforms.lightTex = { value: light };
      sh.fragmentShader = (light ? 'uniform sampler2D lightTex;\n' : '') + sh.fragmentShader.replace('#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
        {
          vec2 ts = 1.0 / vec2(textureSize(emissiveMap, 0));
          vec2 per = fwidth(vEmissiveMapUv) / ts;                      // image pixels per screen pixel
          float zoom = 1.0 / max(max(per.x, per.y), 1e-4);
          float amt = clamp((zoom - 1.0) * 0.3, 0.0, 0.45);
          if (amt > 0.0) {
            vec3 c = texture2D(emissiveMap, vEmissiveMapUv).rgb;
            vec3 n = 0.25 * (texture2D(emissiveMap, vEmissiveMapUv + vec2(ts.x, 0.0)).rgb + texture2D(emissiveMap, vEmissiveMapUv - vec2(ts.x, 0.0)).rgb
                           + texture2D(emissiveMap, vEmissiveMapUv + vec2(0.0, ts.y)).rgb + texture2D(emissiveMap, vEmissiveMapUv - vec2(0.0, ts.y)).rgb);
            totalEmissiveRadiance = max(totalEmissiveRadiance + (c - n) * amt * 1.5, 0.0);
          }
        }
        ${light ? `totalEmissiveRadiance *= texture2D(lightTex, vEmissiveMapUv).rgb * ${k};` : ''}`);
    };
    // a larger image of the work, when there is one, is loaded once a visitor comes close enough to see it
    // then the full image, once a visitor nears the work (or the room has been open a few seconds), and the
    // artist's full-resolution upload, when there is one, only up close
    const urls = [...(first !== h.image ? [[h.image, Math.max(5, 3 * Math.max(wM, hM))]] : []), ...(h.imageFull ? [[h.imageFull, Math.max(1.6, 1.2 * Math.max(wM, hM))]] : [])];
    const back = sideMat('#4a4640'), none = new THREE.MeshBasicMaterial({ visible: false });
    // a work cut out of its backdrop: its body is the solid rectangle (core), and the front shows only the
    // work itself (parts standing out of the body, a shaped edge), the wall showing through around it
    const cr = h.core || [0, 0, 1, 1];
    const bw = wM * (cr[2] - cr[0]), bh = hM * (cr[3] - cr[1]);
    const bx = wM * ((cr[0] + cr[2]) / 2 - 0.5), by = hM * (0.5 - (cr[1] + cr[3]) / 2);
    let box;
    if (h.core) {
      front.map = tex; front.alphaTest = 0.5;                 // black diffuse: the map only carries the outline
      const face = new THREE.Mesh(new THREE.PlaneGeometry(wM, hM), front);
      face.position.z = dM / 2 + 0.0008;
      const body = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, dM), [none, none, none, none, sideMat('#ece9e2'), back]);
      body.position.set(bx, by, 0);
      face.userData.kind = 'work'; body.userData.kind = 'workbody';
      const edges = canvasEdges(bw, bh, dM, h.sides, null);
      edges.forEach(e => e.position.set(bx, by, 0));
      g.add(face, body, ...edges); box = face;
      if (urls.length) pendingFull.push({ front, centre: V(h.centre), urls, edges: [] });
    } else {
      box = new THREE.Mesh(new THREE.BoxGeometry(wM, hM, dM), [none, none, none, none, front, back]);
      box.userData.kind = 'work';
      const edges = canvasEdges(wM, hM, dM, h.sides, tex);
      g.add(box, ...edges);
      if (urls.length) pendingFull.push({ front, centre: V(h.centre), urls, edges });
    }
    const sh = new THREE.Mesh(new THREE.PlaneGeometry(bw + Math.min(0.08, 0.15 * Math.min(bw, bh)), bh + Math.min(0.1, 0.18 * Math.min(bw, bh))), new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, opacity: 0.07, depthWrite: false, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }));
    sh.position.set(bx + Math.min(0.012, 0.03 * bw), by - Math.min(0.03, 0.06 * bh), -dM / 2 - 0.002);   // just off the wall, never in it
    sh.userData.kind = 'shadow'; g.add(sh); scene.add(g); g.updateMatrixWorld(true);
    // a spot above and in front of the work: it only makes the sheen (the light itself is measured)
    const centre = V(h.centre);
    const spot = new THREE.SpotLight(0xffffff, 3.2, 0, 0.6, 1, 2);
    spot.position.copy(centre).addScaledVector(Z, 1.6).setY(Math.min(R.height - 0.15, centre.y + 2));
    spot.target.position.copy(centre); scene.add(spot, spot.target);
    const facing = new THREE.Vector3(Z.x, 0, Z.z).normalize();
    const dist = Math.min(Math.max(1.5 * Math.max(wM, hM), 1.4), 5);
    const stand = clampStand(centre.clone().addScaledVector(facing, dist).setY(EYE), centre.clone().addScaledVector(facing, 0.5));
    pieces.push({ w, h, mesh: box, centre, stand, facing, order, size: { w: h.measured[0], h: h.measured[1] } });
  }));
  pieces.sort((a, b) => (a.centre.x - b.centre.x) || (a.centre.z - b.centre.z));

  // --- the photos, projected back onto the room -------------------------------------------------------
  // Every surface of the room (walls, floor, ceiling, an arch's inside, the room beyond an opening) shows the
  // photos themselves: each spot takes its colour from the photos that saw it, most from the one taken from
  // closest to the visitor's line of sight. Standing where a photo was taken, the room is that photo, with its
  // light, its floor's grain and reflections, its fittings; between photos, it passes from one to the next.
  // A spot a photo couldn't see (behind a work, a pier, out of its frame) takes nothing from it: what each
  // photo saw is known by rendering the room from it once, as depth. Where no photo saw, the baked surface shows.
  const SLOTS = Math.min(6, shots.length), FAR = 50;
  if (SLOTS) {
    const slotW = 1024, slotH = Math.round(slotW / Math.max(...shots.map(v => v.aspect || 1.5))) , cols = Math.min(3, SLOTS), rows = Math.ceil(SLOTS / cols);
    const atlas = new THREE.WebGLRenderTarget(slotW * cols, slotH * rows, { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, generateMipmaps: false });
    const U = {
      ibrPhoto: { value: [] }, ibrDepth: { value: atlas.texture }, ibrEye: { value: [] }, ibrRot: { value: [] },
      ibrLens: { value: [] }, ibrGain: { value: [] }, ibrSlot: { value: [] }, ibrOn: { value: [] }, ibrNear: { value: [] },
      ibrForce: { value: 0 }, ibrShowCover: { value: 0 },          // (for the inspection: below)
    };
    for (let i = 0; i < SLOTS; i++) {
      U.ibrPhoto.value.push(null); U.ibrEye.value.push(new THREE.Vector3()); U.ibrRot.value.push(new THREE.Matrix3());
      U.ibrLens.value.push(new THREE.Vector4()); U.ibrGain.value.push(new THREE.Vector3(1, 1, 1)); U.ibrOn.value.push(0); U.ibrNear.value.push(0);
      U.ibrSlot.value.push(new THREE.Vector4((i % cols) / cols, Math.floor(i / cols) / rows, slotW / atlas.width, slotH / atlas.height));
    }
    // what stands in the way, as each photo saw it: the works' bodies (the photos' own outlines of them do
    // the rest, above)
    const proxies = (spec.works || []).map(h => {
      const g = 0.01, d = (h.depth || 0.035) + 0.01, Z = V(h.axes[2]);
      const m = new THREE.Mesh(new THREE.BoxGeometry(h.measured[0] / 100 + 2 * g, h.measured[1] / 100 + 2 * g, d));
      m.matrixAutoUpdate = false;
      m.matrix.makeBasis(V(h.axes[0]), V(h.axes[1]), Z).setPosition(V(h.centre).addScaledVector(Z, d / 2 - (h.depth || 0.035)));
      m.visible = false; m.userData.kind = 'proxy'; scene.add(m); return m;
    });
    const depthMat = new THREE.ShaderMaterial({
      uniforms: { eye: { value: new THREE.Vector3() }, fwd: { value: new THREE.Vector3() } }, side: THREE.DoubleSide,
      vertexShader: 'varying vec3 vw; void main() { vec4 p = modelMatrix * vec4(position, 1.0); vw = p.xyz; gl_Position = projectionMatrix * viewMatrix * p; }',
      fragmentShader: `#include <packing>
        uniform vec3 eye, fwd; varying vec3 vw;
        void main() { gl_FragColor = packDepthToRGBA(clamp(dot(vw - eye, fwd) / ${FAR.toFixed(1)}, 0.0, 0.9999)); }`,
    });
    const shotCam = new THREE.PerspectiveCamera();
    // the photo, with where it shows a work cut out (as transparency): those pixels are the work's, not the wall's
    const img = url => new Promise(res => { const i = new Image(); i.crossOrigin = 'anonymous'; i.onload = () => res(i); i.onerror = () => res(null); i.src = src(url); });
    async function photoWithWorks(p) {
      const [ph, mk] = await Promise.all([img(p.image), p.works ? img(p.works) : null]);
      if (!ph) return null;
      const c = document.createElement('canvas'); c.width = ph.naturalWidth; c.height = ph.naturalHeight;
      const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(ph, 0, 0);
      if (mk) {
        const d = x.getImageData(0, 0, c.width, c.height);
        x.drawImage(mk, 0, 0, c.width, c.height);
        const m = x.getImageData(0, 0, c.width, c.height).data;
        for (let i = 3; i < d.data.length; i += 4) d.data[i] = 255 - m[i - 3];
        x.putImageData(d, 0, 0);
      }
      const t = new THREE.CanvasTexture(c);
      t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = aniso; t.premultiplyAlpha = false;
      t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; return t;
    }
    const photoTex = new Map();
    function place(slot, v) {
      const p = v.project, [r, dn, f] = p.axes.map(V), aspect = v.aspect || 1.5;
      U.ibrEye.value[slot].set(...p.eye);
      U.ibrRot.value[slot].set(...p.axes[0], ...p.axes[1], ...p.axes[2]);
      U.ibrLens.value[slot].set(p.f / aspect, p.f, p.centre[0], p.centre[1]);
      U.ibrGain.value[slot].set(...p.gain.map(g => Math.pow(g, 2.2)));
      // the depth the photo saw, rendered from its exact lens into this slot of the atlas
      // (as position and turn: the renderer rebuilds a camera's matrices from them before it draws)
      shotCam.position.set(...p.eye); shotCam.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(r, dn.clone().negate(), f.clone().negate()));
      shotCam.updateMatrixWorld(true);
      const n = 0.05, P = shotCam.projectionMatrix;
      P.set(2 * p.f / aspect, 0, 1 - 2 * p.centre[0], 0, 0, 2 * p.f, 2 * p.centre[1] - 1, 0, 0, 0, -(FAR + n) / (FAR - n), -2 * FAR * n / (FAR - n), 0, 0, -1, 0);
      shotCam.projectionMatrixInverse.copy(P).invert();
      depthMat.uniforms.eye.value.set(...p.eye); depthMat.uniforms.fwd.value.copy(f);
      const keep = [];
      scene.traverse(o => {
        if (!o.isMesh) return;
        keep.push([o, o.visible]);
        o.visible = ['wall', 'ceiling', 'floor', 'reveal', 'beyond', 'proxy'].includes(o.userData.kind);
      });
      const bg = scene.background; scene.background = null; scene.overrideMaterial = depthMat;
      const x = (slot % cols) * slotW, y = Math.floor(slot / cols) * slotH;
      atlas.viewport.set(x, y, slotW, slotH); atlas.scissor.set(x, y, slotW, slotH); atlas.scissorTest = true;
      renderer.setRenderTarget(atlas); renderer.setClearColor(0xffffff, 1); renderer.clear(); renderer.render(scene, shotCam);
      renderer.setRenderTarget(null); renderer.setClearColor(0x000000, 1);
      scene.overrideMaterial = null; scene.background = bg;
      for (const [o, vis] of keep) o.visible = vis;
      // and the photo itself (until it arrives, the slot stays off)
      U.ibrOn.value[slot] = 0;
      const url = p.image;
      (photoTex.has(url) ? Promise.resolve(photoTex.get(url)) : photoWithWorks(p).then(t => { if (t) photoTex.set(url, t); return t; }))
        .then(t => { if (t && slots[slot] === v) { U.ibrPhoto.value[slot] = t; U.ibrOn.value[slot] = 1; dirty = true; } });
    }
    // the photos nearest the visitor fill the slots (all of them, for a show of a few photos)
    const slots = new Array(SLOTS).fill(null);
    function choose(at, dir) {
      const score = v => V(v.project.eye).distanceTo(at) + 2 * (1 - V(v.project.axes[2]).dot(dir));
      const want = [...shots].sort((a, b) => score(a) - score(b)).slice(0, SLOTS);
      const free = slots.map((v, i) => want.includes(v) ? -1 : i).filter(i => i >= 0);
      for (const v of want) if (!slots.includes(v)) { const i = free.shift(); slots[i] = v; place(i, v); }
    }
    choose(new THREE.Vector3(0, EYE, 0), new THREE.Vector3(0, 0, -1));
    ibrChoose = shots.length > SLOTS ? choose : null;
    // the inspection checks the room against each photo with that photo left out: every surface then shows
    // the other photos only, wherever they saw it (cover: what they saw, in white), so where the room's shape
    // is wrong they disagree with the one left out
    ibrLeaveOut = (photo, force, cover) => {
      slots.forEach((v, i) => { U.ibrOn.value[i] = v && v.photo === photo ? 0 : (v && photoTex.has(v.project.image) ? 1 : 0); });
      U.ibrForce.value = force ? 1 : 0; U.ibrShowCover.value = cover ? 1 : 0;
    };
    // walls, ceiling, openings: the photos themselves only near where one was taken (standing there, the room
    // is that photo; a step or two away it gives way to the surfaces baked from all of them, which hold
    // still as one walks). The floor always shows them.
    ibrNear = (at, dir) => {
      let changed = false;
      slots.forEach((v, i) => {
        if (!v) return;
        const d = V(v.project.eye).setY(at.y).distanceTo(at), a = V(v.project.axes[2]).dot(dir);
        const k = Math.max(0, Math.min(1, (1.6 - d) / 1.0)) * Math.max(0, Math.min(1, (a - 0.75) / 0.2));
        if (Math.abs(k - U.ibrNear.value[i]) > 1e-3) { U.ibrNear.value[i] = k; changed = true; }
      });
      return changed;
    };
    const block = i => `
      {
        vec3 c = ibrRot[${i}] * (P - ibrEye[${i}]);
        if (c.z > 0.05 && ibrOn[${i}] > 0.5) {
          vec2 uv = ibrLens[${i}].zw + ibrLens[${i}].xy * c.xy / c.z;              // 0..1 across the frame, y down
          float edge = smoothstep(0.0, 0.08, min(min(uv.x, 1.0 - uv.x), min(uv.y, 1.0 - uv.y)));
          if (edge > 0.0 && NEAR(${i}) > 0.0) {
            vec4 e = texture2D(ibrDepth, ibrSlot[${i}].xy + vec2(uv.x, 1.0 - uv.y) * ibrSlot[${i}].zw);
            float seenAt = unpackRGBAToDepth(e) * ${FAR.toFixed(1)};
            float vis = edge * step(c.z, seenAt + 0.02 + 0.006 * c.z) * NEAR(${i});
            float ang = acos(clamp(dot(toV, normalize(ibrEye[${i}] - P)), -1.0, 1.0));
            vec4 ph = texture2D(ibrPhoto[${i}], vec2(uv.x, 1.0 - uv.y));
            vis *= smoothstep(0.6, 0.97, ph.a);                                // where it shows a work: not the wall's
            // most from the photo taken closest to the visitor's line of sight; less from one that saw the
            // surface at a glancing angle (stretched, and where a small error moves things far)
            float facing = abs(dot(nrm, normalize(ibrEye[${i}] - P)));
            float w = vis * max(facing, 0.05) / pow(ang + 0.05, 4.0);
            acc += w * ph.rgb * ibrGain[${i}];
            wsum += w; ibrCover = max(ibrCover, vis);
          }
        }
      }`;
    const head = `#define IBR
      #include <packing>
      uniform sampler2D ibrPhoto[${SLOTS}]; uniform sampler2D ibrDepth; uniform vec3 ibrEye[${SLOTS}]; uniform mat3 ibrRot[${SLOTS}];
      uniform vec4 ibrLens[${SLOTS}]; uniform vec3 ibrGain[${SLOTS}]; uniform vec4 ibrSlot[${SLOTS}]; uniform float ibrOn[${SLOTS}]; uniform float ibrNear[${SLOTS}]; uniform float ibrForce, ibrShowCover;
      varying vec3 vIbrW;\n`;
    for (const m of roomMats) {
      const prev = m.onBeforeCompile;
      m.onBeforeCompile = (sh, r) => {
        if (prev) prev(sh, r);
        Object.assign(sh.uniforms, U);
        sh.vertexShader = 'varying vec3 vIbrW;\n' + sh.vertexShader.replace('#include <project_vertex>', '#include <project_vertex>\nvIbrW = (modelMatrix * vec4(transformed, 1.0)).xyz;');
        sh.fragmentShader = head + (m.userData.photosAlways ? '#define NEAR(i) 1.0\n' : '#define NEAR(i) max(ibrNear[i], ibrForce)\n') + sh.fragmentShader.replace('void main() {', 'void main() {\nfloat ibrCover = 0.0;').replace('#include <opaque_fragment>', `
          {
            vec3 P = vIbrW, toV = normalize(cameraPosition - P), acc = vec3(0.0); float wsum = 0.0;
            vec3 nrm = normalize(cross(dFdx(P), dFdy(P)));
            ${Array.from({ length: SLOTS }, (_, i) => block(i)).join('')}
            if (wsum > 0.0) outgoingLight = mix(outgoingLight, acc / wsum, ibrCover);
            if (ibrShowCover > 0.5) outgoingLight = vec3(ibrCover);
          }
          #include <opaque_fragment>`);
      };
      m.customProgramCacheKey = () => 'ibr' + SLOTS + (m.userData.photosAlways ? 'a' : 'n') + (prev ? prev.toString().length : 0);
      m.needsUpdate = true;
    }
  }

  // --- moving -----------------------------------------------------------------
  let mode = 'walk', idx = 0, yaw = 0, pitch = 0, drag = null, moved = 0, walkTo = null;
  const views = spec.views || [];
  // start as a visitor would: near the end of the room most photos were taken from, looking down its length
  const longX = R.x1 - R.x0 >= R.z1 - R.z0, cx = (R.x0 + R.x1) / 2, cz = (R.z0 + R.z1) / 2;
  const end = views.filter(v => (longX ? v.pos[0] - cx : v.pos[2] - cz) > 0).length >= views.length / 2 ? 1 : -1;
  const len = longX ? R.x1 - R.x0 : R.z1 - R.z0, off = len / 2 - Math.min(1.4, len * 0.15);
  const pos = longX ? new THREE.Vector3(cx + end * off, EYE, cz) : new THREE.Vector3(cx, EYE, cz + end * off);
  clampStand(pos);
  const look = longX ? new THREE.Vector3(cx - end * len, EYE - 0.1, cz) : new THREE.Vector3(cx, EYE - 0.1, cz - end * len);
  const tPos = pos.clone(), tLook = look.clone(), up = new THREE.Vector3(0, 1, 0), tUp = up.clone();
  let tFov = 62, free = true;
  const fmtSize = p => `${Math.round(p.h.size[1])} × ${Math.round(p.h.size[0])} cm`;   // as recorded
  const workInfo = p => `<b>${p.w.title}</b><span>${[p.w.artist && p.w.artist.name, p.w.year].filter(Boolean).join(', ')}${p.w.medium ? ' · ' + p.w.medium : ''}</span><span class="sv-s">${fmtSize(p)}</span>${p.w.slug ? '<button type="button" class="sv-open">Open work</button>' : ''}`;
  function aimFrom(from, to) { const d = new THREE.Vector3().subVectors(to, from); yaw = Math.atan2(-d.x, -d.z); pitch = Math.atan2(d.y, Math.hypot(d.x, d.z)); }
  aimFrom(pos, look);
  function goFree() { if (!free) { aimFrom(pos, look); tPos.copy(pos); free = true; tUp.set(0, 1, 0); } }
  function setMode(m) {
    mode = m; root.classList.toggle('walk', m === 'walk'); root.dataset.mode = m;
    root.querySelectorAll('[data-mode]').forEach(x => x.setAttribute('aria-pressed', x.dataset.mode === m));
  }
  let focused = null;
  function show() {
    if (mode === 'walk') { goFree(); tFov = 62; $('.sv-photo').hidden = true; tPos.y = EYE; focused = undefined; return; }
    const list = mode === 'works' ? pieces : views;
    if (!list.length) return;
    idx = (idx + list.length) % list.length; free = false; walkTo = null; $('.sv-card').hidden = false;
    $('.sv-count').textContent = `${idx + 1} / ${list.length}`;
    const photo = $('.sv-photo');
    if (mode === 'works') {
      const p = pieces[idx]; tUp.set(0, 1, 0); tFov = 55; photo.hidden = true;
      // stand back far enough for the whole work to fit the screen, whatever its shape
      const vf = tFov * Math.PI / 360, hf = Math.atan(Math.tan(vf) * camera.aspect);
      const d = Math.min(Math.max(p.size.h / 200 / Math.tan(vf), p.size.w / 200 / Math.tan(hf)) * 1.3 + 0.1, 8);
      tPos.copy(clampStand(p.centre.clone().addScaledVector(p.facing, d).setY(Math.max(EYE - 0.15, p.centre.y)), p.centre.clone().addScaledVector(p.facing, 0.5)));
      tLook.copy(p.centre);
      $('.sv-info').innerHTML = workInfo(p);
      const b = $('.sv-open'); if (b) b.onclick = () => onOpenWork(p.w);
    } else {
      const v = views[idx]; tPos.set(...v.pos); tLook.set(...v.look); tUp.set(...(v.up || [0, 1, 0]));
      // show as much of the photo's frame as the screen allows
      const a = camera.aspect, hf = 2 * Math.atan(Math.tan(v.fov * Math.PI / 360) * (v.aspect || 1.5));
      tFov = a >= (v.aspect || 1.5) ? v.fov : Math.min(100, 2 * Math.atan(Math.tan(hf / 2) / a) * 180 / Math.PI * 0.72);
      photo.hidden = false; photo.querySelector('img').src = src(v.photo);
      $('.sv-info').innerHTML = `<b>Photo ${idx + 1}</b><span>From the photo's own camera, as measured: compare the space with the real room.</span>`;
    }
  }
  // --- a person, for scale: 175 cm, standing in front of the work in view (or ahead), looking at it -------
  // A modelled figure in everyday clothes; a photograph of a real person, cut out (data/figure.png, 175 cm
  // tall, feet at the bottom edge), takes its place when there is one.
  function modelledFigure() {
    // a standing figure's outline, 175 cm, drawn smooth: an architect's scale figure, quiet and exact
    const half = [[0, 0], [6, 1], [9.6, 5], [10.4, 11], [9.2, 17.5], [6.2, 22.5], [5.6, 25], [6.5, 28.5], [13, 31], [18.6, 33.4], [21, 37.5], [21.8, 46],
      [22.2, 55], [21.6, 63], [20.8, 72], [20.2, 81], [19.8, 86], [20.6, 92], [19.6, 98.5], [17.4, 99.5], [16.3, 95], [16.4, 88], [16.6, 80], [16.3, 70],
      [15.8, 58], [15.2, 47], [14.8, 52], [13.8, 62], [13.6, 70], [15.6, 82], [16.6, 90], [16.2, 102], [14.6, 114], [12.6, 126], [12.2, 134], [11.6, 146],
      [9.6, 158], [8.4, 166], [9.8, 171], [9.4, 175], [3.2, 175], [2.8, 170], [3.4, 162], [4.2, 150], [4.6, 138], [4.2, 127], [3.6, 114], [2.4, 101], [0, 94]];
    const pts = [...half, ...half.slice(1, -1).reverse().map(([x, y]) => [-x, y])];
    const k = 6, c = document.createElement('canvas'); c.width = 56 * k; c.height = 178 * k;
    const x = c.getContext('2d'), P = ([px, py]) => [(px + 28) * k, (py + 1.5) * k];
    x.beginPath();
    for (let i = 0; i < pts.length; i++) {                      // through every point, smoothly (Catmull-Rom)
      const p0 = P(pts[(i - 1 + pts.length) % pts.length]), p1 = P(pts[i]), p2 = P(pts[(i + 1) % pts.length]), p3 = P(pts[(i + 2) % pts.length]);
      if (i === 0) x.moveTo(...p1);
      x.bezierCurveTo(p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6, p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6, ...p2);
    }
    x.closePath();
    const gr = x.createLinearGradient(0, 0, 0, c.height); gr.addColorStop(0, '#5d5f63'); gr.addColorStop(1, '#45474b');
    x.fillStyle = gr; x.fill();
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = aniso;
    const g = photoFigure(t, 178 / 175);
    g.children[0].material.transparent = true; g.children[0].material.opacity = 0.94; g.children[0].material.alphaTest = 0.02;
    return Promise.resolve(g);
  }
  function photoFigure(tex, extra = 1) {
    const a = tex.image.width / tex.image.height, h = 1.75 * extra;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(h * a, h), new THREE.MeshBasicMaterial({ map: tex, alphaTest: 0.5, toneMapped: false, side: THREE.DoubleSide }));
    m.position.y = h / 2; m.userData.billboard = true;
    const g = new THREE.Group(); g.add(m); return g;
  }
  let person = null;
  async function showPerson(on) {
    if (person) { scene.remove(person); person = null; }
    if (on) {
      const tex = await loadTex(spec.figure || 'data/figure.png');
      person = tex ? photoFigure(tex) : await modelledFigure();
      const sh = new THREE.Mesh(new THREE.CircleGeometry(0.32, 32), new THREE.MeshBasicMaterial({ map: blobTex, transparent: true, depthWrite: false, toneMapped: false }));
      sh.rotation.x = -Math.PI / 2; sh.position.y = 0.004; person.add(sh);
      let at, faceTo;
      if (focused) {                                            // beside the work in view, looking at it
        const side = new THREE.Vector3(focused.facing.z, 0, -focused.facing.x);
        const toCam = pos.clone().sub(focused.centre).dot(side) > 0 ? -1 : 1;   // on the side away from the visitor
        const hw = focused.size.w / 200;
        // beside the work if the screen has room for both, else in front of its lower corner, as people stand
        camera.updateMatrixWorld();
        const inView = p => { const a = p.clone().setY(0.1).project(camera), b = p.clone().setY(1.7).project(camera); return Math.abs(a.x) < 0.8 && Math.abs(b.x) < 0.8 && a.z < 1 && b.z < 1; };
        for (const off of [hw + 0.45, hw + 0.15, hw * 0.55, hw * 0.25, 0]) {
          at = focused.centre.clone().addScaledVector(focused.facing, 0.4).addScaledVector(side, toCam * off).setY(0);
          if (inView(at)) break;
        }
        faceTo = focused.centre.clone().setY(0);
      } else {                                                  // ahead, turned three-quarters to the visitor
        const f = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
        at = pos.clone().addScaledVector(f, 2.6).setY(EYE); clampStand(at); at.setY(0);
        faceTo = pos.clone().setY(0).addScaledVector(new THREE.Vector3(f.z, 0, -f.x), 1.5);
      }
      person.position.copy(at);
      person.lookAt(faceTo);
      scene.add(person);
    }
    $('.sv-person').setAttribute('aria-pressed', String(on)); dirty = true;
  }
  const blobTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
    const gr = x.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(0,0,0,0.35)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = gr; x.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c);
  })();
  $('.sv-person').onclick = () => showPerson(!person);

  // --- a floor plan, like the one by a gallery's door: the room, its works, and where you stand ---------
  // Tap a work to go to it; tap anywhere else in the room to walk there.
  const map = $('.sv-map');
  const rw = R.x1 - R.x0, rd = R.z1 - R.z0, ms = 120 / Math.max(rw, rd);
  const mx = x => 6 + (x - R.x0) * ms, mz = z => 6 + (z - R.z0) * ms;
  map.setAttribute('viewBox', `0 0 ${rw * ms + 12} ${rd * ms + 12}`); map.style.width = `${rw * ms + 12}px`;
  map.innerHTML = `<rect class="room" x="6" y="6" width="${rw * ms}" height="${rd * ms}" rx="1.5"/>` + pieces.map((p, i) => {
    const a = new THREE.Vector3(p.facing.z, 0, -p.facing.x).multiplyScalar(p.size.w / 200), c = p.centre;
    const xy = `x1="${mx(c.x - a.x)}" y1="${mz(c.z - a.z)}" x2="${mx(c.x + a.x)}" y2="${mz(c.z + a.z)}"`;
    return `<line class="work" ${xy}/><line class="hit" data-i="${i}" ${xy}><title>${p.w.title}</title></line>`;
  }).join('') + '<g class="me"><path d="M0 0 L14 -7 A15.6 15.6 0 0 1 14 7 Z"/><circle r="3.4"/></g>';
  const me = map.querySelector('.me'); let mapAt = '';
  function updateMap() {
    const a = Math.atan2(look.z - pos.z, look.x - pos.x) * 180 / Math.PI;
    const t = `translate(${mx(pos.x).toFixed(1)} ${mz(pos.z).toFixed(1)}) rotate(${a.toFixed(0)})`;
    if (t !== mapAt) { me.setAttribute('transform', t); mapAt = t; }
  }
  map.addEventListener('click', e => {
    const i = e.target.dataset && e.target.dataset.i;
    if (i != null) { setMode('works'); idx = pieces.indexOf(pieces[+i]); show(); return; }
    const b = map.getBoundingClientRect(), pad = 3, k = (rw * ms + 12) / (b.width - 2 * pad);   // screen -> plan units
    const x = R.x0 + ((e.clientX - b.left - pad) * k - 6) / ms, z = R.z0 + ((e.clientY - b.top - pad) * k - 6) / ms;
    if (mode !== 'walk') { setMode('walk'); show(); }
    goFree(); walkTo = clampStand(new THREE.Vector3(x, EYE, z), pos.clone());
    aimFrom(pos, walkTo.clone().setY(EYE - 0.05)); dropHint();
  });

  const ray = new THREE.Raycaster(), centreRay = new THREE.Vector2(0, 0);
  function focus() {
    ray.setFromCamera(centreRay, camera);
    const hit = ray.intersectObjects(pieces.map(p => p.mesh))[0];
    const p = hit && hit.distance < 5 ? pieces.find(x => x.mesh === hit.object) : null;
    if (p === focused) return;
    focused = p; $('.sv-card').hidden = !p; $('.sv-info').innerHTML = p ? workInfo(p) : '';
    const b = $('.sv-open'); if (p && b) b.onclick = () => onOpenWork(p.w);
  }
  root.querySelectorAll('[data-mode]').forEach(b => b.onclick = () => { setMode(b.dataset.mode); idx = 0; show(); });
  $('.sv-next').onclick = () => { stopPlay(); idx++; show(); };
  $('.sv-prev').onclick = () => { stopPlay(); idx--; show(); };
  // play: from work to work by itself, a few seconds at each (longer at a large one), like an album playing;
  // any touch on the room, or the joystick, stops it
  let playing = null;
  function stopPlay() { if (playing) { clearTimeout(playing); playing = null; $('.sv-play').setAttribute('aria-pressed', 'false'); $('.sv-play').textContent = '▶'; } }
  function playNext() {
    const p = pieces[idx % pieces.length];
    playing = setTimeout(() => { idx++; show(); playNext(); }, reduce ? 9000 : 6500 + Math.min(4000, (p.size.w * p.size.h) / 4000));
  }
  $('.sv-play').onclick = () => {
    if (playing) return stopPlay();
    if (mode !== 'works') { setMode('works'); idx = 0; show(); }
    $('.sv-play').setAttribute('aria-pressed', 'true'); $('.sv-play').textContent = '❚❚'; playNext();
  };
  root.querySelectorAll('[data-mode]').forEach(b => b.addEventListener('click', stopPlay));
  $('.sv-photo').onclick = () => $('.sv-photo').classList.toggle('big');

  const hint = $('.sv-hint'); let hintGone = false;
  const dropHint = () => { if (!hintGone) { hintGone = true; hint.classList.add('gone'); } };
  setTimeout(dropHint, 7000);

  const canvas = renderer.domElement;
  // one finger looks around (and, with the phone's motion on, turns the view on top of it); two fingers
  // pinch to look closer, as with a photo
  const touches = new Map(); let pinch = null;
  const spread = () => { const [a, b] = [...touches.values()]; return Math.hypot(a.x - b.x, a.y - b.y); };
  canvas.addEventListener('pointerdown', e => {
    stopPlay();
    touches.set(e.pointerId, { x: e.clientX, y: e.clientY }); canvas.setPointerCapture(e.pointerId);
    if (touches.size === 2) { pinch = { d: spread(), fov: tFov }; drag = null; moved = 99; return; }
    drag = { x: e.clientX, y: e.clientY }; moved = 0;
  });
  canvas.addEventListener('pointermove', e => {
    if (touches.has(e.pointerId)) touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch && touches.size === 2) { tFov = Math.max(22, Math.min(75, pinch.fov * pinch.d / Math.max(20, spread()))); dropHint(); return; }
    if (!drag) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y; moved += Math.abs(dx) + Math.abs(dy); drag = { x: e.clientX, y: e.clientY };
    if (moved > 6) {
      goFree(); dropHint();
      if (gyro) gyroBase += dx * 0.005; else { yaw += dx * 0.005; pitch = Math.max(-0.7, Math.min(0.7, pitch + dy * 0.003)); }
    }
  });
  const lift = e => { touches.delete(e.pointerId); if (touches.size < 2) pinch = null; };
  canvas.addEventListener('pointercancel', e => { lift(e); drag = null; });
  canvas.addEventListener('pointerup', e => {
    lift(e);
    if (!drag) return; drag = null; if (moved > 6) return;
    const r = canvas.getBoundingClientRect();
    ray.setFromCamera({ x: (e.clientX - r.left) / r.width * 2 - 1, y: -(e.clientY - r.top) / r.height * 2 + 1 }, camera);
    const hit = ray.intersectObjects([...pieces.map(p => p.mesh), ...(floorMesh ? [floorMesh] : [])])[0];
    if (!hit) return;
    dropHint();
    if (hit.object === floorMesh) { setMode('walk'); show(); walkTo = clampStand(hit.point.clone().setY(EYE), pos); return; }
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
  pad.addEventListener('pointerdown', e => { stopPlay(); joyId = e.pointerId; pad.setPointerCapture(e.pointerId); goFree(); walkTo = null; dropHint(); joyMove(e); });
  pad.addEventListener('pointermove', e => { if (e.pointerId === joyId) joyMove(e); });
  const joyEnd = e => { if (e.pointerId !== joyId) return; joyId = null; joy.x = joy.y = 0; knob.style.transform = ''; };
  pad.addEventListener('pointerup', joyEnd); pad.addEventListener('pointercancel', joyEnd);

  const keys = new Set();
  const onKey = e => {
    const k = e.key.toLowerCase();
    if (k === 'escape') return close();
    if (mode !== 'walk' && (k === 'arrowright' || k === 'arrowleft')) { idx += k === 'arrowright' ? 1 : -1; show(); return; }
    if (['w', 'a', 's', 'd', 'q', 'e', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) {
      e.preventDefault(); keys.add(k); walkTo = null; dropHint();
      if (mode !== 'walk') { setMode('walk'); show(); }
    }
  };
  const onKeyUp = e => keys.delete(e.key.toLowerCase());
  document.addEventListener('keydown', onKey); document.addEventListener('keyup', onKeyUp);

  // look around by moving the phone (asks permission on iOS)
  let gyro = null, gyroBase = null;
  const onOrient = e => {
    if (e.alpha == null) return;
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(THREE.MathUtils.degToRad(e.beta), THREE.MathUtils.degToRad(e.alpha), -THREE.MathUtils.degToRad(e.gamma), 'YXZ'));
    q.multiply(new THREE.Quaternion(-Math.sqrt(0.5), 0, 0, Math.sqrt(0.5)));       // the screen looks out of the phone's back
    const sa = (screen.orientation && screen.orientation.angle) || 0;
    q.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), -THREE.MathUtils.degToRad(sa)));
    const d = new THREE.Vector3(0, 0, -1).applyQuaternion(q);
    const a = Math.atan2(-d.x, -d.z), b = Math.asin(Math.max(-1, Math.min(1, d.y)));
    if (gyroBase == null) gyroBase = yaw - a;
    goFree(); yaw = a + gyroBase; pitch = Math.max(-0.9, Math.min(0.9, b));
  };
  if ('DeviceOrientationEvent' in window && matchMedia('(pointer: coarse)').matches) {
    const b = $('.sv-gyro'); b.hidden = false;
    b.onclick = async () => {
      if (gyro) { removeEventListener('deviceorientation', onOrient); gyro = null; b.setAttribute('aria-pressed', 'false'); return; }
      try { if (DeviceOrientationEvent.requestPermission && await DeviceOrientationEvent.requestPermission() !== 'granted') return; } catch { return; }
      gyroBase = null; addEventListener('deviceorientation', onOrient); gyro = true; b.setAttribute('aria-pressed', 'true'); dropHint();
    };
  }
  // a VR headset, where the browser offers one
  if (navigator.xr && navigator.xr.isSessionSupported) {
    navigator.xr.isSessionSupported('immersive-vr').then(ok => {
      if (!ok) return;
      renderer.xr.enabled = true;
      const b = $('.sv-vr'); b.hidden = false;
      b.onclick = async () => {
        const session = await navigator.xr.requestSession('immersive-vr', { optionalFeatures: ['local-floor'] });
        renderer.xr.setReferenceSpaceType('local-floor'); await renderer.xr.setSession(session);
      };
    });
  }

  function resize() {
    dirty = true;
    const r = root.getBoundingClientRect(); renderer.setSize(r.width, r.height, false);
    camera.aspect = r.width / r.height; camera.updateProjectionMatrix();
  }
  const ro = new ResizeObserver(resize); ro.observe(root); resize();

  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fwd = new THREE.Vector3(), sideV = new THREE.Vector3();
  let last = performance.now(), running = true, nextFocus = 0, nextChoose = 0, lastFov = 0, nextAdapt = 0;
  const lastPos = new THREE.Vector3(1e9, 0, 0), lastLook = new THREE.Vector3(), frameTimes = [];
  const maxRatio = Math.min(devicePixelRatio, 2);
  THREE.DefaultLoadingManager.onLoad = () => { dirty = true; };      // a texture arrived: show it
  function frame(now) {
    if (!running) return;
    const dt = Math.min((now - last) / 1000, 0.05); last = now;
    if (free) {
      const turn = (keys.has('arrowleft') || keys.has('q') ? 1 : 0) - (keys.has('arrowright') || keys.has('e') ? 1 : 0);
      yaw += turn * 1.6 * dt;
      fwd.set(-Math.sin(yaw), 0, -Math.cos(yaw)); sideV.set(Math.cos(yaw), 0, -Math.sin(yaw));
      let f = -joy.y + (keys.has('w') || keys.has('arrowup') ? 1 : 0) - (keys.has('s') || keys.has('arrowdown') ? 1 : 0);
      let s = joy.x + (keys.has('d') ? 1 : 0) - (keys.has('a') ? 1 : 0);
      if (renderer.xr.isPresenting) {                                // headset thumbstick
        const src0 = renderer.xr.getSession().inputSources.find(i => i.gamepad && i.gamepad.axes.length >= 4);
        if (src0) { s += src0.gamepad.axes[2]; f -= src0.gamepad.axes[3]; }
      }
      if (Math.abs(f) > 0.05 || Math.abs(s) > 0.05) {
        if (mode !== 'walk') { setMode('walk'); show(); }
        const was = tPos.clone();
        tPos.addScaledVector(fwd, f * WALK * dt).addScaledVector(sideV, s * WALK * dt); tPos.y = EYE;
        tPos.copy(clampStand(tPos, was));
      } else if (walkTo) {
        const d = new THREE.Vector3().subVectors(walkTo, tPos), n = d.length();
        if (n < 0.02) walkTo = null; else tPos.addScaledVector(d, Math.min(1, WALK * 1.6 * dt / n));
      }
      tLook.set(tPos.x - Math.sin(yaw) * Math.cos(pitch), tPos.y + Math.sin(pitch), tPos.z - Math.cos(yaw) * Math.cos(pitch));
    }
    const k = reduce ? 1 : 1 - Math.pow(free ? 0.0005 : 0.02, dt);
    pos.lerp(tPos, k); look.lerp(tLook, k); up.lerp(tUp, k).normalize();
    camera.fov += (tFov - camera.fov) * k; camera.updateProjectionMatrix();
    if (renderer.xr.isPresenting) { rig.position.set(pos.x, 0, pos.z); rig.rotation.y = yaw; }
    else { camera.position.copy(pos); camera.up.copy(up); camera.lookAt(look); }
    updateMap();
    if (person) person.traverse(o => { if (o.userData.billboard) { o.lookAt(camera.position.x, o.getWorldPosition(new THREE.Vector3()).y, camera.position.z); } });
    // nothing moved and nothing new to show: the last frame still stands (a phone keeps its battery)
    const still = !renderer.xr.isPresenting && pos.distanceToSquared(lastPos) < 1e-10 && look.distanceToSquared(lastLook) < 1e-10 && Math.abs(camera.fov - lastFov) < 1e-4;
    lastPos.copy(pos); lastLook.copy(look); lastFov = camera.fov;
    if (still && !dirty) return;
    dirty = false;
    // a phone that can't keep up draws at a lower resolution rather than stutter
    frameTimes.push(dt); if (frameTimes.length > 40) frameTimes.shift();
    if (frameTimes.length === 40 && now > nextAdapt) {
      const avg = frameTimes.reduce((a, b) => a + b) / 40, pr = renderer.getPixelRatio();
      if (avg > 0.028 && pr > 1) { renderer.setPixelRatio(Math.max(1, pr - 0.25)); resize(); nextAdapt = now + 1500; frameTimes.length = 0; }
      else if (avg < 0.014 && pr < maxRatio) { renderer.setPixelRatio(Math.min(maxRatio, pr + 0.25)); resize(); nextAdapt = now + 4000; frameTimes.length = 0; }
    }
    if (mode === 'walk' && now > nextFocus) { focus(); nextFocus = now + 200; }
    if (ibrChoose && now > nextChoose) { ibrChoose(pos, new THREE.Vector3().subVectors(look, pos).normalize()); nextChoose = now + 700; }
    if (ibrNear) ibrNear(pos, new THREE.Vector3().subVectors(look, pos).normalize());
    // one image at a time: the nearest work in reach, or after a few seconds the nearest still light one
    if (!upgrading && pendingFull.length) {
      const idle = now - opened > 4000;
      const ok = pendingFull.filter(f => { const d = pos.distanceTo(f.centre); return d < f.urls[0][1] || (idle && f.urls[0][1] >= 5); });
      const f = ok.sort((a, b) => pos.distanceTo(a.centre) - pos.distanceTo(b.centre))[0];
      if (f) {
        upgrading = true;
        const [url] = f.urls.shift(); if (!f.urls.length) pendingFull.splice(pendingFull.indexOf(f), 1);
        loadTex(url).then(t => {
          upgrading = false;
          if (!t) return;
          t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter;
          const old = f.front.emissiveMap;
          f.front.emissiveMap = t; if (f.front.map) f.front.map = t; f.front.needsUpdate = true; dirty = true;
          for (const e of f.edges || []) e.material.uniforms.img.value = t;
          if (old && old !== t) old.dispose();
        });
      }
    }
    renderer.render(scene, camera);
  }
  renderer.setAnimationLoop(frame);

  function stop() {
    running = false; renderer.setAnimationLoop(null); ro.disconnect();
    document.removeEventListener('keydown', onKey); document.removeEventListener('keyup', onKeyUp);
    removeEventListener('deviceorientation', onOrient);
    renderer.dispose(); root.remove();
  }
  function close() { stop(); onClose(); }
  $('.sv-x').onclick = close;
  $('.sv-loading').hidden = true;
  setMode('walk'); show();
  // for the inspection stage: render the room from any point, exactly as a visitor's screen shows it, and
  // (ids) the same view with every surface in a flat colour saying what it is, to tell walls from works
  const ID = { work: '#ff0000', workbody: '#0000ff', shadow: '#ff8000', wall: '#00ff00', ceiling: '#008000', floor: '#ffff00', reveal: '#00ffff', beyond: '#808080' };
  const inspect = {
    pieces: pieces.map(p => ({ title: p.w.title, centre: p.centre.toArray(), facing: p.facing.toArray(), size: p.size, stand: p.stand.toArray(), image: p.h.image, core: p.h.core || null })),
    views, room: R, eye: EYE, start: { pos: pos.toArray(), look: look.toArray() },
    stand: p => clampStand(V(p)).toArray(),                 // where a visitor can actually stand
    // lens: a photo's own camera (view.project); leaveOut: { photo, cover } to check the room against it
    shot(at, to, fov = 60, upv = [0, 1, 0], ids = false, lens = null, leaveOut = null) {      // ids: false, true, or 'height'
      running = false; renderer.setAnimationLoop(null);
      camera.position.set(...at); camera.up.set(...upv); camera.lookAt(new THREE.Vector3(...to));
      camera.fov = fov; camera.updateProjectionMatrix();
      if (lens) {
        // exactly a photo's camera: where it stood, its axes and its lens (focal length and centre)
        const [r, dn, f] = lens.axes.map(V), a = camera.aspect, n = camera.near, F = camera.far;
        camera.position.set(...lens.eye); camera.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(r, dn.clone().negate(), f.clone().negate()));
        camera.projectionMatrix.set(2 * lens.f / a, 0, 1 - 2 * lens.centre[0], 0, 0, 2 * lens.f, 2 * lens.centre[1] - 1, 0, 0, 0, -(F + n) / (F - n), -2 * F * n / (F - n), 0, 0, -1, 0);
        camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
      }
      camera.updateMatrixWorld();
      if (ibrNear) ibrNear(camera.position.clone(), camera.getWorldDirection(new THREE.Vector3()));
      if (ibrLeaveOut) ibrLeaveOut(leaveOut && leaveOut.photo, !!leaveOut, leaveOut && leaveOut.cover);
      const bg = scene.background; scene.background = new THREE.Color('#ff00ff');   // a hole shows as magenta
      const swapped = [], walls = [];
      scene.traverse(o => { if (o.userData.kind === 'wall') walls.push(o); });
      if (ids) scene.traverse(o => {
        if (!o.isMesh && !o.isReflector) return;
        const k = o.userData.kind;
        if (k === 'mirror' || !k) { if (o.visible) { swapped.push([o, 'v']); o.visible = false; } return; }
        // height: grey by height above the floor, 1 cm a level up to 2.55 m, then from the ceiling down in red
        // each wall in its own shade of green, so a room's corner (two walls meeting) can be told apart
        const tint = k === 'wall' ? new THREE.Color(0, 1, (walls.indexOf(o) + 1) * 12 / 255) : null;
        const m = ids === 'height' ? new THREE.ShaderMaterial({
          side: THREE.DoubleSide,
          vertexShader: 'varying float vy; void main() { vec4 w = modelMatrix * vec4(position, 1.0); vy = w.y; gl_Position = projectionMatrix * viewMatrix * w; }',
          fragmentShader: `varying float vy; void main() { gl_FragColor = vec4(clamp(vy / 2.55, 0.0, 1.0), clamp((${R.height.toFixed(3)} - vy) / 2.55, 0.0, 1.0), 0.0, 1.0); }`,
        }) : new THREE.MeshBasicMaterial({ color: tint || ID[k], toneMapped: false, side: THREE.DoubleSide });
        if (o.material.alphaTest && ids !== 'height') {       // a cut-out work: its outline, in the flat colour
          m.map = o.material.map; m.alphaTest = o.material.alphaTest;
          m.onBeforeCompile = sh => { sh.fragmentShader = sh.fragmentShader.replace('#include <map_fragment>', 'diffuseColor.a *= texture2D( map, vMapUv ).a;'); };
        }
        swapped.push([o, o.material]); o.material = m;
      });
      renderer.render(scene, camera);
      const png = renderer.domElement.toDataURL('image/png');
      for (const [o, m] of swapped) { if (m === 'v') o.visible = true; else { o.material.dispose(); o.material = m; } }
      if (ibrLeaveOut) ibrLeaveOut(null, false, false);
      scene.background = bg;
      // where each work's corners fall on the screen (0..1 from the top left), for comparing it with its image
      const corners = pieces.map(p => {
        const h = p.h, X = V(h.axes[0]), Y = V(h.axes[1]), c = V(h.centre), wM = h.measured[0] / 200, hM = h.measured[1] / 200;
        return [[-1, 1], [1, 1], [1, -1], [-1, -1]].map(([a, b]) => {
          const q = c.clone().addScaledVector(X, a * wM).addScaledVector(Y, b * hM).project(camera);
          return [(q.x + 1) / 2, (1 - q.y) / 2, q.z];
        });
      });
      return { png, corners };
    },
  };
  return { close: stop, inspect };
}
