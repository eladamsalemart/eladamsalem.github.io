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
    <figure class="sv-photo" hidden><img alt=""><figcaption>Original photo</figcaption></figure>
    <span class="sv-dot" aria-hidden="true"></span>
    <div class="sv-joy" role="application" aria-label="Walk: drag the knob to move"><i></i></div>
    <div class="sv-hint">Drag to look around<br>Joystick to walk · Tap the floor to go there</div>
    <div class="sv-card" hidden><div class="sv-info"></div>
      <div class="sv-nav"><button type="button" class="sv-prev" aria-label="Previous">←</button><span class="sv-count"></span><button type="button" class="sv-next" aria-label="Next">→</button></div></div>
    <div class="sv-loading">Building the room…</div>`;
  document.body.append(root);
  const $ = s => root.querySelector(s);
  if (matchMedia('(pointer: fine)').matches) $('.sv-hint').innerHTML = 'Drag to look around<br>W A S D or arrows to walk · Click the floor to go there';

  let dirty = true;                                               // something changed: draw the next frame
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
  function planeMesh(s, material, holes = []) {
    const [su, sv] = s.size;
    const shape = new THREE.Shape([new THREE.Vector2(0, 0), new THREE.Vector2(su, 0), new THREE.Vector2(su, sv), new THREE.Vector2(0, sv)]);
    for (const o of holes) shape.holes.push(openingPath(o, new THREE.Path()));
    const g = new THREE.ShapeGeometry(shape, 24);
    const pos = g.attributes.position, uv = g.attributes.uv;
    const O = V(s.origin), U = V(s.u), Vd = V(s.v);
    for (let i = 0; i < pos.count; i++) {
      const a = pos.getX(i), b = pos.getY(i);                  // b: up from the texture's bottom edge
      uv.setXY(i, a / su, b / sv);
      const p = O.clone().addScaledVector(U, a).addScaledVector(Vd, sv - b);
      pos.setXYZ(i, p.x, p.y, p.z);
    }
    g.setAttribute('uv1', uv.clone());
    g.computeVertexNormals();
    return new THREE.Mesh(g, material);
  }
  function openingPath(o, path) {
    const r = o.arch ? Math.min((o.to - o.from) / 2, o.height - 0.5) : 0;
    path.moveTo(o.from, 0); path.lineTo(o.to, 0); path.lineTo(o.to, o.height - r);
    if (o.arch) path.absarc((o.from + o.to) / 2, o.height - r, (o.to - o.from) / 2, 0, Math.PI, false); else path.lineTo(o.from, o.height);
    path.lineTo(o.from, 0); return path;
  }

  const floorS = surfaces.find(s => s.kind === 'floor');
  const plasterTex = await loadTex(spec.plaster);
  surfaces.forEach((s, i) => {
    if (s.kind === 'reveal') { const r = planeMesh(s, new THREE.MeshBasicMaterial({ map: texs[i], toneMapped: false, side: THREE.DoubleSide })); r.userData.kind = 'reveal'; scene.add(r); return; }
    if (s.kind === 'wall' || s.kind === 'ceiling') {
      const m = planeMesh(s, new THREE.MeshBasicMaterial({ map: texs[i], color: texs[i] ? 0xffffff : wallColor, toneMapped: false, side: THREE.DoubleSide }), s.openings || []);
      m.userData.kind = s.kind; scene.add(m);
      for (const o of s.openings || []) addOpening(s, o);
    }
  });

  // through an opening: the wall's thickness, and a plain room beyond with the same floor
  function addOpening(s, o) {
    const depth = o.depth || 0.3;
    const U = V(s.u), N = V(s.normal), O = V(s.origin);
    const bottom = O.clone().addScaledVector(V(s.v), s.size[1]);  // the wall's foot at u = 0
    if (!surfaces.some(x => x.kind === 'reveal')) {          // older spaces: a plain modelled thickness
      const geo = new THREE.ExtrudeGeometry(openingPath(o, new THREE.Shape()), { depth, bevelEnabled: false, curveSegments: 24 });
      const basis = new THREE.Matrix4().makeBasis(U, new THREE.Vector3(0, 1, 0), N.clone().negate());
      const rev = new THREE.Mesh(geo, [new THREE.MeshBasicMaterial({ visible: false }), new THREE.MeshStandardMaterial({ color: '#d9d7d2', roughness: 1, side: THREE.DoubleSide })]);
      rev.applyMatrix4(basis); rev.position.copy(bottom); rev.userData.kind = 'reveal'; scene.add(rev);
    }
    const w = o.to - o.from + 2.4, d = 3.2;
    const mid = bottom.clone().addScaledVector(U, (o.from + o.to) / 2).addScaledVector(N, -(depth + d / 2));
    // the room beyond: its walls in the gallery's own plaster and fall of light (a little dimmer, as rooms
    // next door are), its ceiling plain, so the opening leads somewhere rather than into a grey box
    const bx = Math.abs(U.x) * w + Math.abs(N.x) * d, bz = Math.abs(U.z) * w + Math.abs(N.z) * d;
    const wallsOf = len => {
      if (!plasterTex) return new THREE.MeshBasicMaterial({ color: '#cfccc6', toneMapped: false, side: THREE.BackSide });
      const t = plasterTex.clone(); t.wrapS = THREE.RepeatWrapping; t.repeat.set(len / 2, 1); t.needsUpdate = true;
      return new THREE.MeshBasicMaterial({ map: t, color: 0xdedede, toneMapped: false, side: THREE.BackSide });
    };
    const plain = new THREE.MeshBasicMaterial({ color: '#d6d4cf', toneMapped: false, side: THREE.BackSide });
    const box = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), [wallsOf(bz), wallsOf(bz), plain, plain, wallsOf(bx), wallsOf(bx)]);
    box.scale.set(bx, R.height, bz);
    box.position.copy(mid).setY(R.height / 2); box.userData.kind = 'beyond'; scene.add(box);
    if (floorS) {
      // the floor runs on from the wall's face, through the opening, into the room beyond
      const fm = bottom.clone().addScaledVector(U, (o.from + o.to) / 2).addScaledVector(N, -(depth + d) / 2);
      const fw = Math.abs(U.x) * w + Math.abs(N.x) * (depth + d), fl = Math.abs(U.z) * w + Math.abs(N.z) * (depth + d);
      const f = new THREE.Mesh(new THREE.PlaneGeometry(fw, fl), floorMaterial(fw, fl, false));
      f.rotation.x = -Math.PI / 2; f.position.copy(fm).setY(0.002); f.userData.kind = 'floor'; scene.add(f);
    }
  }

  // the floor: its own texture at full detail, the light measured on it, and live reflections
  function floorMaterial(w, l, withLight = true) {
    const i = surfaces.indexOf(floorS);
    const tile = texs[i] ? texs[i].clone() : null;
    if (tile) { tile.wrapS = tile.wrapT = THREE.RepeatWrapping; tile.repeat.set(w / (floorS.tile || 1), l / (floorS.tile || 1)); tile.needsUpdate = true; }
    const c = floorS.color || [140, 120, 100];
    const m = new THREE.MeshBasicMaterial({ map: tile, color: tile ? 0xffffff : new THREE.Color(`rgb(${c.join(',')})`), toneMapped: false });
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

  const pieces = [], pendingFull = [];
  await Promise.all((spec.works || []).map(async (h, order) => {
    const w = works.find(x => x.title.toLowerCase() === h.work.toLowerCase()) || { title: h.work, image: h.image, artist: { name: '' }, year: '', medium: '' };
    const [tex, light] = await Promise.all([loadTex(h.image), loadTex(h.light, false)]);
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
    if (h.imageFull) pendingFull.push({ h, front, centre: V(h.centre), reach: Math.max(1.6, 1.2 * Math.max(wM, hM)) });
    const side = sideMat('#d5cab6');
    const back = sideMat('#4a4640');
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
      const body = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, dM), [side, side, side, side, sideMat('#ece9e2'), back]);
      body.position.set(bx, by, 0);
      face.userData.kind = 'work'; body.userData.kind = 'workbody';
      g.add(face, body); box = face;
    } else {
      box = new THREE.Mesh(new THREE.BoxGeometry(wM, hM, dM), [side, side, side, side, front, back]);
      box.userData.kind = 'work'; g.add(box);
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
    mode = m; root.classList.toggle('walk', m === 'walk');
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
  $('.sv-next').onclick = () => { idx++; show(); };
  $('.sv-prev').onclick = () => { idx--; show(); };
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
  pad.addEventListener('pointerdown', e => { joyId = e.pointerId; pad.setPointerCapture(e.pointerId); goFree(); walkTo = null; dropHint(); joyMove(e); });
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
  let last = performance.now(), running = true, nextFocus = 0, lastFov = 0, nextAdapt = 0;
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
    for (let i = pendingFull.length - 1; i >= 0; i--) {
      const f = pendingFull[i];
      if (pos.distanceTo(f.centre) < f.reach) {
        pendingFull.splice(i, 1);
        loadTex(f.h.imageFull).then(t => {
          if (!t) return;
          t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter;
          f.front.emissiveMap = t; if (f.front.map) f.front.map = t; f.front.needsUpdate = true; dirty = true;
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
    shot(at, to, fov = 60, upv = [0, 1, 0], ids = false) {      // ids: false, true, or 'height'
      running = false; renderer.setAnimationLoop(null);
      camera.position.set(...at); camera.up.set(...upv); camera.lookAt(new THREE.Vector3(...to));
      camera.fov = fov; camera.updateProjectionMatrix(); camera.updateMatrixWorld();
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
