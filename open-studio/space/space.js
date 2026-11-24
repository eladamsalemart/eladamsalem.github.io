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

const inPoly = (P, x, z) => { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) if ((P[i][1] > z) !== (P[j][1] > z) && x < (P[j][0] - P[i][0]) * (z - P[i][1]) / (P[j][1] - P[i][1]) + P[i][0]) c = !c; return c; };
const EYE = 1.6, WALK = 1.9, MARGIN = 0.3;     // WALK: metres a second (was 1.3: too slow in a 24 m hall; a stroll through a gallery)

export async function openSpace({ spec, works, src, onClose, onOpenWork, choose, editor, exitLabel, onHotspot }) {
  const THREE = await import('three');
  const { Reflector } = await import('three/addons/objects/Reflector.js');
  const { addPlinths } = await import('./plinths.js');
  const R = spec.room;

  // --- overlay -------------------------------------------------------------
  const root = document.createElement('div');
  root.className = 'sv walk'; root.setAttribute('role', 'dialog'); root.setAttribute('aria-label', `${spec.title}, 3D space`);
  root.innerHTML = `
    <div class="sv-top"><button type="button" class="sv-x">← Exit</button>
      <div class="sv-t"><b>${spec.title}</b><span>${spec.source}</span></div>
      <button type="button" class="sv-person" aria-pressed="false" title="A person, for scale" aria-label="Show a person for scale"><svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><circle cx="12" cy="4.2" r="2.4"/><path d="M8.6 8.2h6.8l1.3 6.6-1.9.4-.9-4.2V22h-2.2v-7.6h-.4V22H9.1V11l-.9 4.2-1.9-.4z"/></svg></button>
      <button type="button" class="sv-gyro" hidden aria-pressed="false" title="Look around by moving the phone">◎</button>
      <button type="button" class="sv-wide" aria-pressed="false" title="Step back: see more of the room" aria-label="Wide view, like the 0.5 lens">0.5×</button>
      <button type="button" class="sv-vr" hidden>VR</button></div>
    <div class="sv-turn" hidden role="status"><svg viewBox="0 0 64 64" width="56" height="56" aria-hidden="true"><g class="ph"><rect x="22" y="8" width="20" height="48" rx="4" fill="none" stroke="currentColor" stroke-width="2.5"/><circle cx="32" cy="50" r="1.6" fill="currentColor"/></g><path d="M50 20a22 22 0 0 1 4 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M55.5 28.5 54 34l-5-2.6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg><b>Turn your phone sideways</b><span>The room fills the whole screen</span></div>
    <div class="sv-modes seg" role="group" aria-label="Move by"><button type="button" data-mode="walk" aria-pressed="true">Walk</button><button type="button" data-mode="works" aria-pressed="false">Works</button><button type="button" data-mode="photos" aria-pressed="false">Photos</button></div>
    <svg class="sv-map" role="img" aria-label="Floor plan: the room, its works and where you stand. Tap a work to go to it."></svg>
    <div class="sv-dir" hidden role="dialog" aria-label="The plan and every exhibition"></div>
    <div class="sv-read" hidden role="dialog" aria-label="Exhibition text"></div>
    <figure class="sv-photo" hidden><img alt=""><figcaption>Original photo</figcaption></figure>
    <span class="sv-dot" aria-hidden="true"></span>
    <div class="sv-joy" role="application" aria-label="Walk: drag the knob to move"><i></i></div>
    <div class="sv-hint">Drag to look around<br>Joystick to walk · Tap the floor to go there</div>
    <div class="sv-card" hidden><div class="sv-info"></div>
      <div class="sv-nav"><button type="button" class="sv-prev" aria-label="Previous">←</button><span class="sv-count"></span><button type="button" class="sv-play" aria-pressed="false" aria-label="Play: go from work to work">▶</button><button type="button" class="sv-next" aria-label="Next">→</button></div></div>
    ${choose ? `<div class="sv-choose"><button type="button" class="btn f">${choose.label}</button></div>` : ''}
    <div class="sv-loading">Building the room…</div>`;
  document.body.append(root);
  const $ = s => root.querySelector(s);
  if (!(spec.views || []).length) $('[data-mode="photos"]').hidden = true;     // (a virtual room has no photos)
  if (matchMedia('(pointer: fine)').matches) $('.sv-hint').innerHTML = 'Drag to look around<br>W A S D or arrows to walk · Click the floor to go there';

  let dirty = true;                                               // something changed: draw the next frame
  let ibrReady = () => true;                                   // (every photo in place: for the inspection)
  let ibrChoose = null, ibrNear = null, ibrLeaveOut = null;                           // with many photos (a video's frames): pick the nearest
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  root.prepend(renderer.domElement);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#d8d7d3');
  if (spec.sky) { const c = document.createElement('canvas'); c.width = 4; c.height = 256; const x = c.getContext('2d'), g = x.createLinearGradient(0, 0, 0, 256); g.addColorStop(0, spec.sky[0]); g.addColorStop(0.6, spec.sky[1]); g.addColorStop(1, spec.sky[1]); x.fillStyle = g; x.fillRect(0, 0, 4, 256); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; scene.background = t; }      // (an open-air museum: a sky behind the garden)
  // a tight depth range (far / near of a few hundred) keeps surfaces from flickering against each other
  const camera = new THREE.PerspectiveCamera(60, 1, 0.08, spec.far || 45);
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
  // a phone's memory for images is small: there a room's photographs are held at most 2048 px across (1536 for the floor and
  // the ceiling, seen at a slant), and a photograph used by several walls (rooms in a row) is held once
  const COARSE = matchMedia('(pointer: coarse)').matches, held = new Map();
  const fit = (t, max) => {
    const im = t && t.image, w = im && (im.naturalWidth || im.width), h = im && (im.naturalHeight || im.height);
    if (!COARSE || !w || Math.max(w, h) <= max) return t;
    const k = max / Math.max(w, h), c = document.createElement('canvas'); c.width = Math.round(w * k); c.height = Math.round(h * k);
    c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
    const n = new THREE.CanvasTexture(c); n.colorSpace = t.colorSpace; n.anisotropy = t.anisotropy; t.dispose(); return n;
  };
  const shrinkTo = (t, max) => {                  // (a picture held at `max` px across, on any device; the source texture is freed)
    const im = t.image, w = im.naturalWidth || im.width, h = im.naturalHeight || im.height;
    if (Math.max(w, h) <= max) return t;
    const k = max / Math.max(w, h), c = document.createElement('canvas'); c.width = Math.round(w * k); c.height = Math.round(h * k);
    c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
    const n = new THREE.CanvasTexture(c); n.colorSpace = t.colorSpace; n.anisotropy = t.anisotropy; t.dispose(); return n;
  };
  const surfTex = s => { if (!held.has(s.texture)) held.set(s.texture, loadTex(s.texture).then(t => fit(t, s.maxPx || (s.kind === 'wall' ? 2048 : 1536)))); return held.get(s.texture); };
  const texs = await Promise.all(surfaces.map(async s => {
    const t = await surfTex(s);
    if (!t || !s.repeat) return t;
    const c = t.clone(); c.wrapS = c.wrapT = THREE.RepeatWrapping; c.repeat.set(s.repeat[0], s.repeat[1]); c.needsUpdate = true; return c;     // (several rooms in a row: one photograph, again)
  }));
  const lights = await Promise.all(surfaces.map(s => loadTex(s.light, false)));
  let floorMesh = null;
  const wallColor = new THREE.Color('#f2f2ef');

  // --- baked rooms (built in Blender, data/rooms/<slug>): the surfaces are photographs of an empty room at a
  // few hundred pixels a metre, which a phone, held up close, magnifies three or four times. Two cheap helps in the
  // shader: the texture is read with a bicubic (Catmull-Rom) filter when magnified, so edges stay crisp instead of
  // melting, and a fine procedural grain (plaster, concrete, brick, boards) of the real surface's scale is laid over
  // it, fading out as it gets smaller than a pixel. Real tours (spec.baked absent) are untouched.
  const BK = spec.baked || null;
  const DETAIL = {                       // grain strength: [walls, floor, ceiling]
    'white-cube': [0.02, 0.028, 0.016], 'loft': [0.055, 0.06, 0.04], 'skylit-hall': [0.035, 0.03, 0.025], 'salon': [0.035, 0.03, 0.02],
    'concrete': [0.06, 0.055, 0.05], 'studio': [0.05, 0.04, 0.03], 'apartment': [0.025, 0.03, 0.02], 'black-box': [0.015, 0.02, 0.012],
    'glass-pavilion': [0.022, 0.03, 0.02], 'japanese': [0.05, 0.04, 0.03],
  };
  // the fine texture of the real material (data/rooms/detail/<name>.jpg, from Poly Haven's CC0 plaster, concrete and clay by
  // space/rooms/detail_tiles.py), a grey tile of `m` metres laid over the baked wall at its true scale: strength k
  const DETAIL_TILE = {
    'white-cube': ['painted', 2.0, 1.1], 'skylit-hall': ['rough', 2.0, 1.2], 'salon': ['painted', 2.0, 1.1], 'concrete': ['concrete', 2.0, 1.6],
    'apartment': ['painted', 2.0, 1.1], 'black-box': ['painted', 2.0, 0.8], 'glass-pavilion': ['painted', 2.0, 1.1], 'japanese': ['clay', 1.6, 2.0],
  };
  const det = BK && DETAIL_TILE[BK.kind] ? DETAIL_TILE[BK.kind] : null;
  const detU = { value: null }, detK = { value: 0 };
  if (det) {
    detU.value = new THREE.TextureLoader().load(new URL('../data/rooms/detail/' + det[0] + '.jpg', import.meta.url).href, t => { detK.value = det[2]; dirty = true; });
    detU.value.wrapS = detU.value.wrapT = THREE.RepeatWrapping; detU.value.colorSpace = THREE.NoColorSpace; detU.value.anisotropy = aniso;
  }
  const HQ_FRAG = `
    uniform vec2 hqTex; uniform vec2 hqSize; uniform float hqAmp; uniform vec2 hqMask[4];
    uniform sampler2D hqDetail; uniform float hqDetK; uniform float hqDetM; uniform float hqSoft;
    float hqH(vec2 p) { vec3 q = fract(vec3(p.xyx) * .1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }
    float hqN(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
      return mix(mix(hqH(i), hqH(i + vec2(1., 0.)), f.x), mix(hqH(i + vec2(0., 1.)), hqH(i + vec2(1., 1.)), f.x), f.y); }
    vec4 hqRead(sampler2D t, vec2 uv) {
      vec2 px = uv * hqTex, mag = fwidth(px);
      vec4 lin = texture2D(t, uv);
      vec2 tc = floor(px - 0.5) + 0.5, f = px - tc;
      vec2 w0 = f * (-0.5 + f * (1.0 - 0.5 * f)), w1 = 1.0 + f * f * (-2.5 + 1.5 * f), w2 = f * (0.5 + f * (2.0 - 1.5 * f)), w3 = f * f * (-0.5 + 0.5 * f);
      vec2 w12 = w1 + w2, t0 = (tc - 1.0) / hqTex, t3 = (tc + 2.0) / hqTex, t12 = (tc + w2 / w12) / hqTex;
      vec4 c = texture2D(t, vec2(t12.x, t0.y)) * (w12.x * w0.y) + texture2D(t, vec2(t0.x, t12.y)) * (w0.x * w12.y) + texture2D(t, t12) * (w12.x * w12.y)
             + texture2D(t, vec2(t3.x, t12.y)) * (w3.x * w12.y) + texture2D(t, vec2(t12.x, t3.y)) * (w12.x * w3.y);
      c /= (w12.x * w0.y + w0.x * w12.y + w12.x * w12.y + w3.x * w12.y + w12.x * w3.y);
      c = max(c, 0.0);
      return mix(lin, c, 1.0 - smoothstep(0.75, 1.0, max(mag.x, mag.y)));      // minified: the mipmaps already do it right
    }
    float hqGrain(vec2 uv) {
      vec2 p = uv * hqSize, fw = fwidth(p); float px = max(fw.x, fw.y) + 1e-6, g = 0.0;
      // four scales: 17 cm, 4.5 cm, 1.2 cm, 3.5 mm; each fades out as its cell shrinks to a pixel or two
      g += (hqN(p * 6.0) - 0.5) * 0.7 * (1.0 - smoothstep(0.15, 0.5, px * 6.0));
      g += (hqN(p * 22.0 + 7.3) - 0.5) * 0.9 * (1.0 - smoothstep(0.15, 0.5, px * 22.0));
      g += (hqN(p * 80.0 + 3.1) - 0.5) * 1.0 * (1.0 - smoothstep(0.15, 0.5, px * 80.0));
      g += (hqN(p * 290.0 + 9.7) - 0.5) * 1.0 * (1.0 - smoothstep(0.15, 0.5, px * 290.0));
      float m = 1.0;
      for (int i = 0; i < 4; i++) m *= 1.0 - (smoothstep(hqMask[i].x - 0.03, hqMask[i].x + 0.03, p.x) - smoothstep(hqMask[i].y - 0.03, hqMask[i].y + 0.03, p.x));
      float dt = 0.0;
      if (hqDetK > 0.0) dt = (texture2D(hqDetail, p / hqDetM).r - 0.5) * hqDetK;
      return (1.0 + hqAmp * g * 2.0 * m) * (1.0 + dt * m * hqSoft);
    }`;
  // kind: 0 walls, 1 floor, 2 ceiling; size: the surface (or its repeating tile) in metres; masks: stretches of a wall
  // along u that show something else (windows: the outside must not get plaster grain)
  // a surface may bring its own fine material (spec surface `detail: {texture, m, k}`: a grey tile of m metres, strength k),
  // e.g. the museum's terrazzo floor, whose painted picture is too coarse up close; one texture per picture, shared
  const ownDetail = new Map();
  const detailOf = d => {
    if (!d || !d.texture) return null;
    if (!ownDetail.has(d.texture)) { const t = new THREE.TextureLoader().load(d.texture, () => { dirty = true; }); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.NoColorSpace; t.anisotropy = aniso; ownDetail.set(d.texture, t); }
    return { tex: ownDetail.get(d.texture), m: d.m || 1, k: d.k || 1 };
  };
  function enhance(mat, tex, kind, size, masks = [], key = '', soft = 1, own = null) {      // soft: a freshly painted board (a standing wall) carries less of the old plaster's mottle
    if (!BK || !tex || !tex.image) return mat;
    const amp = 1.6 * soft * (DETAIL[BK.kind] || [0.03, 0.03, 0.02])[kind];
    const prev = mat.onBeforeCompile;
    const mk = [0, 1, 2, 3].map(i => masks[i] ? new THREE.Vector2(masks[i][0], masks[i][1]) : new THREE.Vector2(-9, -9));
    mat.onBeforeCompile = sh => {
      if (prev) prev(sh);
      sh.uniforms.hqTex = { value: new THREE.Vector2(tex.image.width, tex.image.height) };
      sh.uniforms.hqSize = { value: new THREE.Vector2(size[0] / (tex.repeat ? tex.repeat.x : 1), size[1] / (tex.repeat ? tex.repeat.y : 1)) };
      sh.uniforms.hqAmp = { value: amp };
      sh.uniforms.hqMask = { value: mk }; sh.uniforms.hqSoft = { value: soft };
      sh.uniforms.hqDetail = own ? { value: own.tex } : detU; sh.uniforms.hqDetM = { value: own ? own.m : det ? det[1] : 2 };
      sh.uniforms.hqDetK = own ? { value: own.k } : kind === 1 ? { value: 0 } : detK;                         // (walls and ceiling; the floor's boards are in its photograph)
      sh.fragmentShader = sh.fragmentShader.replace('void main() {', HQ_FRAG + '\nvoid main() {')
        .replace('#include <map_fragment>', '#ifdef USE_MAP\n vec4 sampledDiffuseColor = hqRead(map, vMapUv);\n diffuseColor *= sampledDiffuseColor;\n diffuseColor.rgb *= hqGrain(vMapUv);\n#endif');
    };
    mat.customProgramCacheKey = () => 'hq' + kind + key + (soft < 1 ? 's' : '');
    return mat;
  }

  // a flat surface with holes, as triangles in its own (along, up-from-bottom) coordinates
  // pad: how far the surface runs on past its sides and top (and 1 cm under the floor), hidden behind its
  // neighbours: two planes that just meet leave a hairline between them, at a room's corner, a wall's foot or top
  function planeMesh(s, material, holes = [], pad = 0) {
    const [su, sv] = s.size;
    const lo = -Math.min(pad, 0.01);                              // under the floor just enough to close the seam
    const shape = new THREE.Shape([new THREE.Vector2(-pad, lo), new THREE.Vector2(su + pad, lo), new THREE.Vector2(su + pad, sv + pad), new THREE.Vector2(-pad, sv + pad)]);
    for (const o of holes) shape.holes.push(openingPath(o, new THREE.Path(), o.sill || 0));
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
  // lo: where its foot is (an opening's inside starts under the floor, or its bottom lies on the floor as a band)
  function openingPath(o, path, lo = 0) {
    // an arch: half an ellipse as wide as the opening, rising as measured (a semicircle when not measured)
    const hw = (o.to - o.from) / 2, r = o.arch ? Math.min(o.rise || hw, o.height - 0.5) : 0;
    path.moveTo(o.from, lo); path.lineTo(o.to, lo); path.lineTo(o.to, o.height - r);
    if (o.arch) path.absellipse(o.from + hw, o.height - r, hw, r, 0, Math.PI, false); else path.lineTo(o.from, o.height);
    path.lineTo(o.from, lo); return path;
  }

  const floorS = surfaces.find(s => s.kind === 'floor');
  const plasterTex = await loadTex(spec.plaster);
  // the room's surfaces show the photos themselves, projected back from where each was taken (see below)
  const shots = (spec.views || []).filter(v => v.project), roomMats = [];
  const room = m => { if (shots.length) roomMats.push(m); return m; };
  // a wall that is glass from side to side and floor to ceiling: not a picture of the outside pasted on the wall (flat, and wrong
  // from everywhere but where it was taken), but glass to look through: the garden stands outside it (addOutside, below)
  const glassWalls = new Set(((BK && BK.plates) || []).filter(p => { const w = surfaces.find(x => x.name === p.wall); return w && p.from <= 0.02 && p.to >= w.size[0] - 0.02 && p.z0 <= 0.02 && p.z1 >= w.size[1] - 0.02; }).map(p => p.wall));
  // a polished floor that is not the room's `floor` surface (the museum's terrazzo lies on a lawn): the surface turns translucent over a mirror laid just under it. Built a few seconds after opening (software GL
  // and the first taps never wait for the second pass), drawn at 0.4 of the screen, redrawn every third frame while moving and not at all while still; the quality ladder below can switch it off.
  let hallMirrorCtl = null;
  function hallMirror(fm, s) {
    const [rNear, rLow] = spec.mirrorSurface.reflect || [0.15, 0.5], my = spec.mirrorSurface.y ?? 0.01, prev = fm.material.onBeforeCompile;
    const mU = { value: 0 }, alphaOn = v => { mU.value = v ? 1 : 0; fm.material.transparent = v; };       // (an opaque pass must write alpha 1: a smaller alpha would show through the canvas as white)
    fm.material.customProgramCacheKey = () => (prev ? 'hq-mirror' : 'mirror') + rNear + '_' + rLow;
    fm.material.onBeforeCompile = sh => {
      if (prev) prev(sh); sh.uniforms.mirrorOn = mU;
      sh.vertexShader = sh.vertexShader.replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWorldP = (modelMatrix * vec4(transformed, 1.0)).xyz;').replace('void main() {', 'varying vec3 vWorldP;\nvoid main() {');
      sh.fragmentShader = sh.fragmentShader.replace('void main() {', 'uniform float mirrorOn;\nvarying vec3 vWorldP;\nvoid main() {').replace('#include <dithering_fragment>',
        `float facing = clamp(normalize(cameraPosition - vWorldP).y, 0.0, 1.0);
         gl_FragColor.a = mix(1.0, 1.0 - mix(${rNear.toFixed(3)}, ${rLow.toFixed(3)}, pow(1.0 - facing, 3.0)), mirrorOn);
         #include <dithering_fragment>`);
    };
    setTimeout(() => {
      const res = Math.min(2048, Math.round(Math.max(innerWidth, innerHeight) * Math.min(devicePixelRatio, 2) * 0.4));
      const mirror = new Reflector(new THREE.PlaneGeometry(R.x1 - R.x0, R.z1 - R.z0), { textureWidth: res, textureHeight: res, color: 0xffffff, clipBias: 0.003 });
      mirror.material.fragmentShader = mirror.material.fragmentShader.replace('blendOverlay( base.rgb, color )', 'base.rgb * color');
      mirror.userData.kind = 'mirror'; mirror.rotation.x = -Math.PI / 2; mirror.position.set((R.x0 + R.x1) / 2, my, (R.z0 + R.z1) / 2); scene.add(mirror);
      const draw = mirror.onBeforeRender; let lastKey = '', frame = 0;
      mirror.onBeforeRender = (...a) => {
        const cam = a[2], key = cam.matrixWorld.elements.join(',') + cam.fov; if (key === lastKey && frame > 0) return; lastKey = key; if (++frame % 3 !== 1 && frame > 3) return;
        fm.visible = false; draw.apply(mirror, a); fm.visible = true; };
      alphaOn(true);
      hallMirrorCtl = { isOn: true, set(v) { this.isOn = v; mirror.visible = v; alphaOn(v); dirty = true; } };
      dirty = true;
    }, 3500);
  }
  const padList = [];
  // the floor of a room joined to a bigger space (an exhibition's original room inside the museum, spec.floorPads): its light as in the room's
  // own tour (the tile under the room's light map), and its reflection made only while the visitor is in it, faded in, then freed when they leave
  // (memory is spent where the visitor is, never where they aren't; the lead's review, 24.11)
  function padFloor(fm, s, i, pad) {
    if (lights[i]) { fm.material.lightMap = lights[i]; fm.material.lightMapIntensity = Math.PI * (s.lightScale || 1); fm.material.needsUpdate = true; }
    const [rNear, rLow] = pad.reflect || [0, 0]; if (!(rLow > 0.03)) return;
    const prev = fm.material.onBeforeCompile, mU = { value: 0 };
    fm.material.customProgramCacheKey = () => 'pad' + (prev ? 'hq' : '') + rNear + '_' + rLow;
    fm.material.onBeforeCompile = sh => {
      if (prev) prev(sh); sh.uniforms.mirrorOn = mU;
      sh.vertexShader = sh.vertexShader.replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWorldP = (modelMatrix * vec4(transformed, 1.0)).xyz;').replace('void main() {', 'varying vec3 vWorldP;\nvoid main() {');
      sh.fragmentShader = sh.fragmentShader.replace('void main() {', 'uniform float mirrorOn;\nvarying vec3 vWorldP;\nvoid main() {').replace('#include <dithering_fragment>',
        `float facing = clamp(normalize(cameraPosition - vWorldP).y, 0.0, 1.0);
         gl_FragColor.a = mix(1.0, 1.0 - mix(${rNear.toFixed(3)}, ${rLow.toFixed(3)}, pow(1.0 - facing, 3.0)), mirrorOn);
         #include <dithering_fragment>`);
    };
    const U = V(s.u), Vd = V(s.v), [su, sv] = s.size, O = V(s.origin), c = O.clone().addScaledVector(U, su / 2).addScaledVector(Vd, sv / 2);
    const within = m => { const d = pos.clone().sub(c); return Math.abs(d.dot(U)) - su / 2 < m && Math.abs(d.dot(Vd)) - sv / 2 < m; };
    let mirror = null;
    padList.push({ name: s.name, get on() { return !!mirror; }, fade: () => mU.value, tint(rgb) { if (mirror) { mirror.material.uniforms.color.value.setRGB(...rgb); dirty = true; } } });
    const make = () => {
      const res = Math.min(2048, Math.round(Math.max(innerWidth, innerHeight) * Math.min(devicePixelRatio, 2) * (COARSE ? 0.3 : 0.5)));      // (half the tour's on a phone)
      mirror = new Reflector(new THREE.PlaneGeometry(su, sv), { textureWidth: res, textureHeight: res, color: 0xffffff, clipBias: 0.003 });
      mirror.material.fragmentShader = mirror.material.fragmentShader.replace('blendOverlay( base.rgb, color )', 'base.rgb * color');
      const up = new THREE.Vector3(0, 1, 0), Y = Vd.clone(); if (new THREE.Vector3().crossVectors(U, Y).dot(up) < 0) Y.negate();
      mirror.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(U, Y, up)); mirror.position.set(c.x, O.y - 0.004, c.z);      /* (between the hall's floor, 0.02 m, and this one: under the hall floor it reflected only the hall floor's underside, 24.11) */      /* (a hand-set matrix with automatic updates off never reached matrixWorld: the mirror stood upright at the origin, 24.11) */ mirror.userData.kind = 'mirror';
      const draw = mirror.onBeforeRender; let lastKey = '', frame = 0;
      mirror.onBeforeRender = (...a) => { const cam = a[2], key = cam.matrixWorld.elements.join(',') + cam.fov; if (key === lastKey && frame > 0) return; lastKey = key; if (++frame % 3 !== 1 && frame > 3) return;
        fm.visible = false; draw.apply(mirror, a); fm.visible = true; };
      scene.add(mirror); fm.material.transparent = true; dirty = true;
    };
    const free = () => { scene.remove(mirror); mirror.getRenderTarget().dispose(); mirror.geometry.dispose(); mirror.material.dispose(); mirror = null; mU.value = 0; fm.material.transparent = false; dirty = true; };
    const tick = setInterval(() => {
      if (!root.isConnected) { clearInterval(tick); if (mirror) free(); return; }
      try { pos; } catch { return; }                 // (the visitor is placed a little later than the room is built)
      const inn = within(0.6);
      if (inn && !mirror) make();
      if (mirror) { const v = Math.max(0, Math.min(1, mU.value + (inn ? 0.2 : -0.2))); if (v !== mU.value) { mU.value = v; dirty = true; } if (!inn && v === 0 && !within(3)) free(); }
    }, 100);
  }
  const batches = {};                       // small translucent surfaces that share one picture (the houses' trim, the light shafts) are drawn as ONE mesh each: a phone pays per draw call
  surfaces.forEach((s, i) => {
    if (glassWalls.has(s.name)) return;
    if (s.kind === 'reveal') { const r = planeMesh(s, room(new THREE.MeshBasicMaterial({ map: texs[i], toneMapped: false, side: s.cull ? THREE.FrontSide : THREE.DoubleSide }))); r.userData.kind = 'reveal'; scene.add(r); return; }
    if (s.glass) { const gm = planeMesh(s, new THREE.MeshBasicMaterial({ map: texs[i], transparent: true, depthWrite: false, toneMapped: false, side: THREE.DoubleSide }), s.openings || [], 0); gm.renderOrder = 4; gm.userData.kind = 'glass'; if (s.batch) { (batches[s.batch] = batches[s.batch] || { mat: gm.material, geos: [] }).geos.push(gm.geometry); return; } scene.add(gm); return; }      // (a glass wall: its mullions and a faint sheen, you see through the rest)
    if (s.kind === 'wall' || s.kind === 'ceiling') {
      const masks = s.kind === 'wall' ? ((spec.blocks || {})[s.name] || []) : [];
      const m = planeMesh(s, enhance(room(new THREE.MeshBasicMaterial({ map: texs[i], color: texs[i] ? 0xffffff : wallColor, toneMapped: false, side: THREE.DoubleSide })), texs[i], s.kind === 'wall' ? 0 : 2, s.size, masks, '', s.stand ? 0.3 : 1, detailOf(s.detail)), s.openings || [], s.kind === 'wall' && !s.stand ? 0.03 : 0);
      m.userData.kind = s.kind; if (s.stand) m.userData.stand = s.stand; scene.add(m);
      if (spec.mirrorSurface && s.name === spec.mirrorSurface.name) hallMirror(m, s);
      { const pad = (spec.floorPads || []).find(q => q.name === s.name); if (pad) padFloor(m, s, i, pad); }
      for (const o of s.openings || []) addOpening(s, o);
      if (s.stand && s.capT && /-a$/.test(s.name)) {   // a coulisse is a board, not two sheets: a solid core a hair inside its two faces shows its top and both ends
        const Uc = V(s.u), Nc = V(s.normal), Oc = V(s.origin), t = s.capT, L = s.size[0], h = s.size[1];
        const core = new THREE.Mesh(new THREE.BoxGeometry(L, h, t - 0.006), room(new THREE.MeshBasicMaterial({ color: '#ebe9e4', toneMapped: false })));
        core.position.copy(Oc).addScaledVector(Nc, -t / 2).addScaledVector(Uc, L / 2); core.position.y = Oc.y - h / 2; core.rotation.y = Math.atan2(-Uc.z, Uc.x); core.userData.kind = 'reveal'; scene.add(core);
      }
      if (/^part-\d+a$/.test(s.name)) {            // wall-top cap of a partition: the 0.3 m between its two faces, so the top edge is a surface, not a gap
        const Uc = V(s.u), Nc = V(s.normal), Oc = V(s.origin), L = s.size[0], T = 0.3;
        const P = (u, d) => Oc.clone().addScaledVector(Uc, u).addScaledVector(Nc, -d);
        const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute([P(0, 0), P(L, 0), P(L, T), P(0, 0), P(L, T), P(0, T)].flatMap(q => [q.x, q.y + 0.002, q.z]), 3));
        const cap = new THREE.Mesh(g, room(new THREE.MeshBasicMaterial({ color: '#ebe9e4', toneMapped: false, side: THREE.DoubleSide }))); cap.userData.kind = 'reveal'; scene.add(cap);
      }
    }
  });
  if (Object.keys(batches).length) {
    const { mergeGeometries } = await import('three/addons/utils/BufferGeometryUtils.js');
    for (const b of Object.values(batches)) { const g = mergeGeometries(b.geos, false); if (!g) continue; const bm = new THREE.Mesh(g, b.mat); bm.renderOrder = 4; bm.userData.kind = 'glass'; scene.add(bm); b.geos.forEach(x => x.dispose()); }
  }

  // window plates: each window (or glass wall) of a baked room photographed again, alone, at several times the wall's
  // resolution (the outside is what a phone magnifies most); laid over the same place in the wall's picture
  for (const p of (BK && BK.plates) || []) {
    const s = surfaces.find(x => x.name === p.wall); if (!s || glassWalls.has(p.wall)) continue;
    loadTex(p.texture).then(t => {
      if (!t) return;
      t = fit(t, 2048);
      const U = V(s.u), N = V(s.normal), O = V(s.origin), mid = (p.from + p.to) / 2;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(p.to - p.from, p.z1 - p.z0),
        new THREE.MeshBasicMaterial({ map: t, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
      const c = O.clone().addScaledVector(U, mid).addScaledVector(N, 0.004).setY((p.z0 + p.z1) / 2);
      m.matrixAutoUpdate = false; m.matrix.makeBasis(U, new THREE.Vector3(0, 1, 0), N).setPosition(c);
      m.userData.kind = 'wall'; scene.add(m); dirty = true;
    });
  }

  // --- the outside of a glass wall --------------------------------------------------------------------------------------
  // A real garden, photographed all round (Poly Haven's killesberg_park, CC0), stands outside: the sky and the far trees on a
  // great dome, and the ground of the photograph laid flat at the floor's level out to them (the dome's lower half is brought
  // down onto the ground plane, as seen from the camera's height when it was taken). So the view turns as the visitor turns, the
  // paving outside runs on from the floor and slides past the window frames as they walk, and near things move more than far ones.
  // The glass itself: slim dark frames, a head and a sill, and a faint sheen.
  function addOutside() {
    if (!glassWalls.size) return;
    const walls = surfaces.filter(s => glassWalls.has(s.name));
    const cx = (R.x0 + R.x1) / 2, cz = (R.z0 + R.z1) / 2, RAD = Math.min(40, camera.far - 3), CAM = 1.6, GROUND = spec.outdoors ? -0.12 : -0.02;
    const RG = Math.max(8, Math.max(R.x1 - R.x0, R.z1 - R.z0) / 2 + 3.5);     // (how far the paving runs before the flower beds, from the room's middle)
    const UC = 0.55, V0 = 0.20, V1 = 0.96;                       // (the panorama's column that faces the first glass wall; the rows kept)
    const first = V(walls[0].normal).negate(), yaw = Math.atan2(first.x, -first.z);
    const onlyFront = walls.every(w => V(w.normal).negate().angleTo(first) < 0.01);
    const dir = base => 'data/rooms/outside/' + base;
    for (const [file, u0] of onlyFront ? [['garden-a.jpg', 0.30]] : [['garden-a.jpg', 0.30], ['garden-b.jpg', 0.80]]) {
      const NU = 72, NV = 56, pos = [], uv = [], idx = [];
      for (let j = 0; j <= NV; j++) for (let i = 0; i <= NU; i++) {
        const u = u0 + 0.5 * i / NU, v = V0 + (V1 - V0) * j / NV, lon = (u - UC) * 2 * Math.PI + yaw, lat = (0.5 - v) * Math.PI;
        const dx = Math.sin(lon) * Math.cos(lat), dy = Math.sin(lat), dz = -Math.cos(lon) * Math.cos(lat);
        // below the horizon: where that ray meets the ground, out to the planting (RG); from there the planting stands upright, and
        // what rises above the horizon leans back to the far dome (near shrubs, then trees, then sky: each further than the last)
        const cl = Math.max(0.2, Math.cos(lat)), k = Math.min(1, Math.max(0, lat / 0.6)), rh = RG + (RAD - RG) * k * k * (3 - 2 * k);
        const t = dy < 0 ? Math.min((CAM - GROUND) / -dy, RG / cl) : Math.min(rh / cl, RAD);
        pos.push(cx + dx * t, CAM + dy * t, cz + dz * t); uv.push(i / NU, 1 - j / NV);
      }
      for (let j = 0; j < NV; j++) for (let i = 0; i < NU; i++) { const a = j * (NU + 1) + i, b = a + 1, c = a + NU + 1, d = c + 1; idx.push(a, c, b, b, c, d); }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
      const mat = new THREE.MeshBasicMaterial({ color: 0xd9dcdc, toneMapped: false, side: THREE.DoubleSide });
      const m = new THREE.Mesh(g, mat); m.userData.kind = 'outside'; m.frustumCulled = false; scene.add(m);
      loadTex(dir(file)).then(t => { if (!t) return; t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy()); mat.map = t; mat.color.set(0xffffff); mat.needsUpdate = true; dirty = true; });
    }
    const frame = new THREE.MeshBasicMaterial({ color: 0x1c1c1d, toneMapped: false });
    const sheen = new THREE.MeshBasicMaterial({ color: 0xeaf1f2, transparent: true, opacity: 0.055, depthWrite: false, toneMapped: false, side: THREE.DoubleSide });
    // (stone: a speckled grey, drawn once)
    const sc = document.createElement('canvas'); sc.width = sc.height = 256; const sx = sc.getContext('2d');
    sx.fillStyle = '#8b8882'; sx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 5200; i++) { const g = 105 + Math.random() * 70 | 0; sx.fillStyle = `rgba(${g},${g - 2},${g - 6},${0.10 + Math.random() * 0.22})`; sx.fillRect(Math.random() * 256, Math.random() * 256, 1 + Math.random() * 2.2, 1 + Math.random() * 2.2); }
    sx.strokeStyle = 'rgba(40,38,36,.5)'; sx.lineWidth = 1.5; sx.strokeRect(0.5, 0.5, 255, 255);        // (the slabs' joints)
    const stone = new THREE.CanvasTexture(sc); stone.wrapS = stone.wrapT = THREE.RepeatWrapping; stone.colorSpace = THREE.SRGBColorSpace; stone.anisotropy = 8;
    const tex = (rx, ry) => { const t = stone.clone(); t.repeat.set(rx, ry); t.needsUpdate = true; return t; };
    let terrace, kerbM, kerbTop;
    for (const s of walls) {
      const U = V(s.u), N = V(s.normal), O = V(s.origin), [len, h] = s.size, n = Math.max(1, Math.round(len / 2));
      terrace = new THREE.MeshBasicMaterial({ map: tex((len + 6) / 0.9, 2.8 / 0.9), color: 0xb9b6ae, toneMapped: false });
      kerbM = new THREE.MeshBasicMaterial({ map: tex((len + 6) / 0.9, 0.45), color: 0x8d8a83, toneMapped: false }); kerbTop = new THREE.MeshBasicMaterial({ map: tex((len + 6) / 0.9, 0.33), color: 0xc4c1b9, toneMapped: false });
      const grp = new THREE.Group(); grp.matrixAutoUpdate = false; grp.matrix.makeBasis(U, new THREE.Vector3(0, 1, 0), N).setPosition(O.clone().setY(0)); grp.userData.kind = 'glass';
      const bar = (w, hh, x, y) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, hh, 0.09), frame); b.position.set(x, y, -0.03); grp.add(b); };
      for (let k = 0; k <= n; k++) bar(k === 0 || k === n ? 0.09 : 0.055, h, len * k / n, h / 2);
      bar(len, 0.12, len / 2, h - 0.06); bar(len, 0.05, len / 2, 0.025);
      // a stone terrace outside, as wide as the glass, and a low planter wall at its far edge: real things near the window (they
      // slide against the garden as the visitor walks), and they cover the strip where the photograph's ground is at its poorest
      const TD = 2.8, deck = new THREE.Mesh(new THREE.PlaneGeometry(len + 6, TD), terrace); deck.rotation.x = -Math.PI / 2; deck.position.set(len / 2, -0.012, -TD / 2 - 0.02); grp.add(deck);
      const kerb = new THREE.Mesh(new THREE.BoxGeometry(len + 6, 0.42, 0.3), [kerbM, kerbM, kerbTop, kerbM, kerbM, kerbM]); kerb.position.set(len / 2, 0.2, -TD - 0.15); grp.add(kerb);
      const pane = new THREE.Mesh(new THREE.PlaneGeometry(len, h), sheen); pane.position.set(len / 2, h / 2, -0.03); pane.renderOrder = 5; grp.add(pane);
      scene.add(grp);
    }
  }
  addOutside();
  if (spec.props) import('./props.js').then(m => m.addProps({ THREE, scene, spec, renderer, mark: () => { dirty = true; } })).catch(e => console.warn('props', e));      // (sculpture and maquettes on plinths)
  if (spec.outdoors) import('./outdoors.js').then(m => m.addOutdoors({ THREE, scene, spec, loadTex, renderer, mark: () => { dirty = true; } })).catch(e => console.warn('outdoors', e));      // (an open-air museum: the sky by the visitor's clock, real trees, street lamps)

  // through an opening: the wall's thickness, and a plain room beyond with the same floor
  function addOpening(s, o) {
    const depth = o.depth || 0.3;
    const U = V(s.u), N = V(s.normal), O = V(s.origin);
    const bottom = O.clone().addScaledVector(V(s.v), s.size[1]);  // the wall's foot at u = 0
    if (!o.bare && (o.arch || !surfaces.some(x => x.kind === 'reveal'))) {
      // an arch's curved inside (or, in older spaces, any opening's sides): modelled, in the room's plaster
      const geo = new THREE.ExtrudeGeometry(openingPath(o, new THREE.Shape(), -0.05), { depth, bevelEnabled: false, curveSegments: 48 });
      const basis = new THREE.Matrix4().makeBasis(U, new THREE.Vector3(0, 1, 0), N.clone().negate());
      let side;
      if (plasterTex) {
        const t = plasterTex.clone(); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1, 1); t.needsUpdate = true;
        side = room(new THREE.MeshBasicMaterial({ map: t, color: 0xe4e2de, toneMapped: false, side: THREE.DoubleSide }));
      } else side = room(new THREE.MeshBasicMaterial({ color: '#d9d7d2', toneMapped: false, side: THREE.DoubleSide }));
      const rev = new THREE.Mesh(geo, [new THREE.MeshBasicMaterial({ visible: false }), side]);
      rev.applyMatrix4(basis); rev.position.copy(bottom); rev.userData.kind = 'reveal'; scene.add(rev);
    }
    if (o.bare && o.through && depth >= 0.15) {   // a bare doorway/window in a thick wall: jambs, head and sill, so the wall has a real depth
      const y0 = o.sill || 0, y1 = o.height, P = (u, y, d) => bottom.clone().addScaledVector(U, u).addScaledVector(N, -d).setY(y);
      const quad = (A, B, C, D) => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute([A, B, C, A, C, D].flatMap(q => [q.x, q.y, q.z]), 3)); return g; };
      const mat = (c) => room(new THREE.MeshBasicMaterial({ color: c, toneMapped: false, side: THREE.DoubleSide }));
      const add = (g, c) => { const m = new THREE.Mesh(g, mat(c)); m.userData.kind = 'reveal'; scene.add(m); };
      add(quad(P(o.from, y0, 0), P(o.from, y1, 0), P(o.from, y1, depth), P(o.from, y0, depth)), '#cfcbc4');   // left jamb (a little in shade)
      add(quad(P(o.to, y0, 0), P(o.to, y1, 0), P(o.to, y1, depth), P(o.to, y0, depth)), '#e2dfd9');
      add(quad(P(o.from, y1, 0), P(o.to, y1, 0), P(o.to, y1, depth), P(o.from, y1, depth)), '#bdb9b2');         // head (darker, faces down)
      if (y0 > 0) add(quad(P(o.from, y0, 0), P(o.to, y0, 0), P(o.to, y0, depth), P(o.from, y0, depth)), '#f0eee9');   // sill
    }
    if (o.through) return;                    // (a doorway between two rooms: the other room is really there)
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
      // with the room's own light on it where it meets the room (the light at the room's edge, carried on), so
      // the floor doesn't change tone at the threshold
      const fg = new THREE.PlaneGeometry(fw, fl), fp = fg.attributes.position, uv1 = [];
      for (let i = 0; i < fp.count; i++) {
        const wx = fm.x + fp.getX(i), wz = fm.z - fp.getY(i);           // (the plane is turned flat below)
        uv1.push(Math.min(1, Math.max(0, (wx - R.x0) / (R.x1 - R.x0))), Math.min(1, Math.max(0, 1 - (wz - R.z0) / (R.z1 - R.z0))));
      }
      fg.setAttribute('uv1', new THREE.Float32BufferAttribute(uv1, 2));
      const f = new THREE.Mesh(fg, floorMaterial(fw, fl));
      f.rotation.x = -Math.PI / 2; f.position.copy(fm).setY(-0.001); f.userData.kind = 'floor'; scene.add(f);
    }
  }

  // the floor: its own texture at full detail, the light measured on it, and live reflections
  function floorMaterial(w, l, withLight = true) {
    const i = surfaces.indexOf(floorS);
    const tile = texs[i] ? texs[i].clone() : null;
    if (tile) { const [tx, tz] = floorS.tileXY || [floorS.tile || 1, floorS.tile || 1]; tile.wrapS = tile.wrapT = THREE.RepeatWrapping; tile.repeat.set(w / tx, l / tz); tile.needsUpdate = true; }
    const c = floorS.color || [140, 120, 100];
    const m = enhance(room(new THREE.MeshBasicMaterial({ map: tile, color: tile ? 0xffffff : new THREE.Color(`rgb(${c.join(',')})`), toneMapped: false })), tile, 1, floorS.tileXY || [floorS.tile || 1, floorS.tile || 1]);
    if (withLight && lights[i]) { m.lightMap = lights[i]; m.lightMapIntensity = Math.PI * (floorS.lightScale || 1); }
    return m;
  }
  let mirrorCtl = null;                                   // the floor's mirror, when there is one: the quality ladder switches it off before a phone has to stutter
  if (floorS) {
    const [rNear, rLow] = spec.floorReflect || [0, 0];
    floorMesh = planeMesh(floorS, floorMaterial(floorS.size[0], floorS.size[1]));
    floorMesh.userData.kind = 'floor'; scene.add(floorMesh);
    if (rLow > 0.03) {
      const hqPrev = floorMesh.material.onBeforeCompile;
      if (BK) floorMesh.material.customProgramCacheKey = () => 'hq1r' + rNear + '_' + rLow;     // (the values are in the shader's text)
      floorMesh.material.onBeforeCompile = sh => {
        if (hqPrev) hqPrev(sh);
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
      const addMirror = () => {
      floorMesh.material.transparent = true;
      const mirrorRes = Math.min(2048, Math.round(Math.max(innerWidth, innerHeight) * Math.min(devicePixelRatio, 2) * (spec.floorReflectEco ? 0.4 : 0.6)));
      const mirror = new Reflector(new THREE.PlaneGeometry(R.x1 - R.x0, R.z1 - R.z0), { textureWidth: mirrorRes, textureHeight: mirrorRes, color: 0xffffff, clipBias: 0.003 });
      mirror.material.fragmentShader = mirror.material.fragmentShader.replace('blendOverlay( base.rgb, color )', 'base.rgb * color');
      mirrorCtl = { isOn: true, set(v) { this.isOn = v; mirror.visible = v; floorMesh.material.transparent = v; dirty = true; } };
      mirror.userData.kind = 'mirror'; mirror.rotation.x = -Math.PI / 2; mirror.position.set((R.x0 + R.x1) / 2, -0.002, (R.z0 + R.z1) / 2); scene.add(mirror);
      const draw = mirror.onBeforeRender;
      // eco: a still camera keeps the last reflection, a moving one redraws it every third frame, at 0.4 of the screen (the reflection of a honed floor never shows the lag): a third of the cost on a phone
      let lastKey = '', frame = 0;
      mirror.onBeforeRender = (...a) => {
        if (spec.floorReflectEco) { const cam = a[2], key = cam.matrixWorld.elements.join(',') + cam.fov; if (key === lastKey && frame > 0) return; lastKey = key; if (++frame % 3 !== 1 && frame > 3) return; }
        floorMesh.visible = false; draw.apply(mirror, a); floorMesh.visible = true; };
      };
      if (spec.floorReflectEco) setTimeout(addMirror, 3500); else addMirror();   // (eco: after the first frames, so opening and the first taps never wait for the second pass)
    }
  }

  // --- where you may stand: inside the room, and into an opening to look through ---------
  let keepOut = [];
  const buildKeepOut = () => { keepOut = (spec.works || []).map(h => {
    const n = V(h.axes[2]).setY(0).normalize(), x = new THREE.Vector3(-n.z, 0, n.x);
    return { c: V(h.centre).setY(EYE), n, x, hw: h.measured[0] / 200, stop: 0.6 };
  }); };
  buildKeepOut();
  const plinthList = [];                              // (set below, once drawn: a visitor does not walk through one)
  const ops = surfaces.filter(s => s.kind === 'wall').flatMap(s => (s.openings || []).filter(o => !o.through).map(o => ({ s, o })));
  const parts = spec.partitions || [];                // walls inside the room, with a doorway: no walking through them elsewhere
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
    // walls of a museum street (spec.solids: [x0, z0, x1, z1] lines): not through, pushed back out of
    for (const [ax, az, bx, bz] of spec.solids || []) {
      const dx = bx - ax, dz = bz - az, t = Math.max(0, Math.min(1, ((p.x - ax) * dx + (p.z - az) * dz) / (dx * dx + dz * dz || 1)));
      const qx = ax + dx * t, qz = az + dz * t, ex = p.x - qx, ez = p.z - qz, d = Math.hypot(ex, ez), r = MARGIN + 0.05;
      if (d < r) { if (d < 1e-5) { p.x += r; } else { p.x = qx + ex / d * r; p.z = qz + ez / d * r; } }
    }
    for (const w of parts) {
      const h = w.t / 2 + 0.4, dx = p.x - w.x;
      if (Math.abs(dx) < h && !(p.z > w.door[0] + 0.3 && p.z < w.door[1] - 0.3)) {
        const side = from && Math.abs(from.x - w.x) >= h * 0.9 ? Math.sign(from.x - w.x) : (dx >= 0 ? 1 : -1);
        p.x = w.x + side * h;
      }
    }
    for (const q of plinthList) {
      const dx = p.x - q.group.position.x, dz = p.z - q.group.position.z, r = Math.hypot(q.spec.size[0], q.spec.size[1]) / 200 + 0.35, m = Math.hypot(dx, dz);
      if (m < r) { if (m < 1e-4) p.x += r; else { p.x += dx / m * (r - m); p.z += dz / m * (r - m); } }
    }
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
    const w = Math.min(512, img.width), h = Math.round(w * img.height / img.width);      // (the varnish relief is subtle: 512 px across is enough, and a 1024 px one cost 8 MB a work)
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

  // (the inspection's phone pass, ?phone=1: opened as a visitor's phone opens it, light images first)
  const inspecting = new URLSearchParams(location.search).has('inspect') && !new URLSearchParams(location.search).has('phone');
  const pieces = [], pendingFull = [], failed = [];
  const loadRetry = async urls => {
    for (const u of urls.filter(Boolean)) for (let k = 0; k < 3; k++) {
      const t = await loadTex(u); if (t) return t;
      await new Promise(r => setTimeout(r, 600 * (k + 1)));
    }
    return null;
  };
  const plainTex = () => { const t = new THREE.DataTexture(new Uint8Array([214, 207, 194, 255]), 1, 1); t.colorSpace = THREE.SRGBColorSpace; t.needsUpdate = true; return t; };
  // the phone's memory for images is small (a few hundred MB for the whole page, on an iPhone): what the room
  // keeps in it is held to a budget
  const PHONE = matchMedia('(pointer: coarse)').matches && !inspecting;   // (true in the phone pass too)
  const FULL_AT_ONCE = PHONE ? 2 : 4;
  const TIERS = [640, 1024, 1536, 2048], TIER_FAR = 16, TIER_MB = PHONE ? 110 : 320, LOADS = PHONE ? 2 : 3;      // (the pictures the works may hold: sizes, how far the eye is served, MB for the sharpened ones)
  let loading = 0, opened = performance.now(), nextFull = 0;
  function setFront(f, t) {
    f.front.emissiveMap = t; if (f.front.map) f.front.map = t; f.front.needsUpdate = true; dirty = true;
    for (const e of f.edges || []) e.material.uniforms.img.value = t;
  }
  await Promise.all((spec.works || []).map(async (h, order) => {
    const w = works.find(x => x.title.toLowerCase() === h.work.toLowerCase()) || { title: h.work, image: h.image, artist: { name: '' }, year: '', medium: '' };
    // a light image first, so the room opens quickly on a phone (the inspection sees the full one at once)
    const first = !inspecting && h.imageSmall ? h.imageSmall : h.image;
    // a work is never left out of the room: a failed download is tried again, then the other size, and
    // until one arrives the canvas shows a plain tone (and keeps trying in the background)
    const [got, light] = await Promise.all([loadRetry([first, first === h.image ? h.imageSmall : h.image]), loadTex(h.light, false)]);
    // memory is saved where the visitor isn't looking, never where they are: on a phone a work that came without a small copy (an artist's
    // upload, ~2000 px) is held at 768 px from afar, and its full image comes back as the visitor nears it (pendingFull), freed again as they leave (memory is saved where the visitor is not looking, never where they are)
    const big = PHONE && got && Math.max(got.image.naturalWidth || got.image.width || 0, got.image.naturalHeight || got.image.height || 0) > 1024;
    const tex = big ? fit(got, 768) : got || plainTex();
    if (!got) failed.push(h.work);
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
    if (got) { front.normalMap = reliefFrom(tex.image); front.normalScale.set(0.2, 0.2); }
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
    // (only for the few works nearest the visitor at a time: a phone has room for a handful of full images,
    // not for every work's; walking away, a work goes back to its light image)
    const full = !got ? first : h.imageFull || (first !== h.image || big ? h.image : null);
    const reach = h.imageFull ? Math.max(1.6, 1.2 * Math.max(wM, hM)) : Math.max(5, 3 * Math.max(wM, hM));
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
      if (full) pendingFull.push({ front, centre: V(h.centre), full, reach: got ? reach : 1e9, small: tex, edges: [], title: h.work, mid: h.imageFull && h.image !== h.imageFull && h.image !== first ? h.image : null, span: Math.max(wM, hM), cur: got ? Math.max(tex.image.width, tex.image.height) : 0, ar: got ? tex.image.height / tex.image.width : 1 });
    } else if (h.flat) {        // letters set on the wall (the wall text): a sheet with no body, the wall showing through where it has no ground
      tex.colorSpace = THREE.SRGBColorSpace;
      box = new THREE.Mesh(new THREE.PlaneGeometry(wM, hM), new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: 0.01, depthWrite: false, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -2 }));
      box.position.z = dM / 2; box.userData.kind = 'work'; g.add(box);
    } else {
      box = new THREE.Mesh(new THREE.BoxGeometry(wM, hM, dM), [none, none, none, none, front, back]);
      box.userData.kind = 'work';
      const edges = canvasEdges(wM, hM, dM, h.sides, tex);
      g.add(box, ...edges);
      if (full) pendingFull.push({ front, centre: V(h.centre), full, reach: got ? reach : 1e9, small: tex, edges, title: h.work, mid: h.imageFull && h.image !== h.imageFull && h.image !== first ? h.image : null, span: Math.max(wM, hM), cur: got ? Math.max(tex.image.width, tex.image.height) : 0, ar: got ? tex.image.height / tex.image.width : 1 });
    }
    const sh = new THREE.Mesh(new THREE.PlaneGeometry(bw + Math.min(0.08, 0.15 * Math.min(bw, bh)), bh + Math.min(0.1, 0.18 * Math.min(bw, bh))), new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, opacity: 0.07, depthWrite: false, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }));
    sh.position.set(bx + Math.min(0.012, 0.03 * bw), by - Math.min(0.03, 0.06 * bh), -dM / 2 - 0.002);   // just off the wall, never in it
    sh.userData.kind = 'shadow'; if (!h.flat) g.add(sh); scene.add(g); g.updateMatrixWorld(true);
    // a spot above and in front of the work: it only makes the sheen (the light itself is measured)
    const centre = V(h.centre);
    const spot = new THREE.SpotLight(0xffffff, 3.2, 0, 0.6, 1, 2);
    spot.position.copy(centre).addScaledVector(Z, 1.6).setY(Math.min(R.height - 0.15, centre.y + 2));
    spot.target.position.copy(centre); if (!spec.noSpots) scene.add(spot, spot.target);     // (a street of many rooms: no live lights)
    const facing = new THREE.Vector3(Z.x, 0, Z.z).normalize();
    const dist = Math.min(Math.max(1.5 * Math.max(wM, hM), 1.4), 5);
    const stand = clampStand(centre.clone().addScaledVector(facing, dist).setY(EYE), centre.clone().addScaledVector(facing, 0.5));
    pieces.push({ w, h, mesh: box, g, spot, centre, stand, facing, order, size: { w: h.measured[0], h: h.measured[1] } });
  }));
  // in the order the show was hung (a designed show: as its artist or curator set it), else along the room
  const plinths = addPlinths(THREE, scene, spec.plinths, loadTex, spec.plinthRoom || {});
  plinthList.push(...plinths);
  const standBodies = (await import('./plinths.js')).addStands(THREE, scene, spec.stands, spec.plinthRoom || {});   // the freestanding walls' bodies (their faces are surfaces)
  if (spec.furniture) {    // the Living room's sofa, rug, table and lamp (space/furniture.js); a visitor does not walk through them
    const { addFurniture } = await import('./plinths.js'); const f = addFurniture(THREE, scene, spec.furniture);
    for (const c of f.solid) plinthList.push({ group: { position: { x: c.x, z: c.z } }, spec: { size: [(c.r - 0.35) * 200, 0] } });
  }
  pieces.sort(spec.ordered ? (a, b) => a.order - b.order : (a, b) => (a.centre.x - b.centre.x) || (a.centre.z - b.centre.z));

  // --- the photos, projected back onto the room -------------------------------------------------------
  // Every surface of the room (walls, floor, ceiling, an arch's inside, the room beyond an opening) shows the
  // photos themselves: each spot takes its colour from the photos that saw it, most from the one taken from
  // closest to the visitor's line of sight. Standing where a photo was taken, the room is that photo, with its
  // light, its floor's grain and reflections, its fittings; between photos, it passes from one to the next.
  // A spot a photo couldn't see (behind a work, a pier, out of its frame) takes nothing from it: what each
  // photo saw is known by rendering the room from it once, as depth. Where no photo saw, the baked surface shows.
  const SLOTS = Math.min(6, shots.length), FAR = 50;
  if (SLOTS) {
    const slotW = PHONE ? 768 : 1024, slotH = Math.round(slotW / Math.max(...shots.map(v => v.aspect || 1.5))) , cols = Math.min(3, SLOTS), rows = Math.ceil(SLOTS / cols);
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
      // (on a phone at most 1280 px across: six photos at full size alone would fill its memory for images)
      const k = PHONE ? Math.min(1, 1280 / ph.naturalWidth) : 1;
      const c = document.createElement('canvas'); c.width = Math.round(ph.naturalWidth * k); c.height = Math.round(ph.naturalHeight * k);
      const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(ph, 0, 0, c.width, c.height);
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
      // and the photo itself (until it arrives, the slot stays off; and the photos come on together, once all
      // have arrived: some on and some not yet, the floor would show where one ends, a cut across it)
      U.ibrOn.value[slot] = 0;
      const url = p.image;
      (photoTex.has(url) ? Promise.resolve(photoTex.get(url)) : photoWithWorks(p).then(t => { if (t) photoTex.set(url, t); return t; }))
        .then(t => {
          if (!t || slots[slot] !== v || !ibrReady()) return;
          slots.forEach((w, i) => { if (w) { U.ibrPhoto.value[i] = photoTex.get(w.project.image); U.ibrOn.value[i] = 1; } });
          dirty = true;
        });
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
    ibrReady = () => slots.every(v => !v || photoTex.has(v.project.image));
    ibrChoose = shots.length > SLOTS ? choose : null;
    // the inspection checks the room against each photo with that photo left out: every surface then shows
    // the other photos only, wherever they saw it (cover: what they saw, in white), so where the room's shape
    // is wrong they disagree with the one left out
    ibrLeaveOut = (photo, force, cover) => {
      slots.forEach((v, i) => { U.ibrOn.value[i] = v && v.photo === photo ? 0 : (v && photoTex.has(v.project.image) ? 1 : 0); });
      U.ibrForce.value = force ? 1 : 0; U.ibrShowCover.value = cover ? 1 : 0;
    };
    // walls, ceiling, floor, openings: the photos themselves only near where one was taken (standing there,
    // the room is that photo; a step or two away it gives way to the surfaces baked from all of them, which
    // hold still as one walks). The floor too: polished, each photo shows other reflections on it, and laid
    // side by side they leave cuts across it where one gives way to the next.
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
          float toEdge = min(min(uv.x, 1.0 - uv.x), min(uv.y, 1.0 - uv.y));
          float edge = smoothstep(0.0, 0.15, toEdge);
          // towards its frame's edge a photo hands over to the others gradually: the photo taken nearest the
          // visitor weighs thousands of times the rest, and would end in a straight cut across the floor
          float hand = smoothstep(0.0, 0.25, toEdge); hand *= hand; hand *= hand;
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
            // how sharp the photo is here, against the screen: seen from much further than the visitor stands,
            // or at a glancing angle, its pixels are stretched into streaks; there it gives way, smoothly
            float sharp = facing * min(1.0, 1.6 * length(cameraPosition - P) / max(length(ibrEye[${i}] - P), 1e-3));
            vis *= smoothstep(0.12, 0.35, sharp);
            float w = vis * hand * max(facing, 0.05) / pow(ang + 0.05, 4.0);
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
        sh.fragmentShader = head + '#define NEAR(i) max(ibrNear[i], ibrForce)\n' + sh.fragmentShader.replace('void main() {', 'void main() {\nfloat ibrCover = 0.0;').replace('#include <opaque_fragment>', `
          {
            vec3 P = vIbrW, toV = normalize(cameraPosition - P), acc = vec3(0.0); float wsum = 0.0;
            vec3 nrm = normalize(cross(dFdx(P), dFdy(P)));
            ${Array.from({ length: SLOTS }, (_, i) => block(i)).join('')}
            if (wsum > 0.0) outgoingLight = mix(outgoingLight, acc / wsum, ibrCover);
            if (ibrShowCover > 0.5) outgoingLight = vec3(ibrCover);
          }
          #include <opaque_fragment>`);
      };
      m.customProgramCacheKey = () => 'ibr' + SLOTS + (prev ? prev.toString().length : 0);
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
  if (spec.start) pos.set(spec.start.pos[0], EYE, spec.start.pos[1]);
  clampStand(pos);
  const look = spec.start ? new THREE.Vector3(spec.start.look[0], EYE - 0.1, spec.start.look[1]) : longX ? new THREE.Vector3(cx - end * len, EYE - 0.1, cz) : new THREE.Vector3(cx, EYE - 0.1, cz - end * len);
  const tPos = pos.clone(), tLook = look.clone(), up = new THREE.Vector3(0, 1, 0), tUp = up.clone();
  const inSlow = p => (spec.slow || []).some(P => inPoly(P, p.x, p.z));          // inside an exhibition room or wing: walk at a stroll, in the hall run
  let tFov = 62, free = true, wide = false;
  const baseFov = () => camera.aspect > 1.3 ? 54 : wide ? 96 : 62;       // (sideways the screen itself is wide: a calmer lens)
  $('.sv-wide').onclick = () => { wide = !wide; $('.sv-wide').setAttribute('aria-pressed', String(wide)); $('.sv-wide').textContent = wide ? '1×' : '0.5×'; if (mode === 'walk') tFov = baseFov(); dirty = true; };
  // "Turn your phone sideways": the first thing on a phone held upright, for a few seconds or until a touch; gone once it is turned
  { const turn = $('.sv-turn'), port = matchMedia('(orientation: portrait) and (pointer: coarse)');
    const off = () => { turn.hidden = true; };
    root.__turn = () => { if (port.matches && !editor) { turn.hidden = false; setTimeout(off, 4500); turn.addEventListener('pointerdown', off); root.addEventListener('pointerdown', off, { once: true }); } };       // (shown once the room is built)
    port.addEventListener && port.addEventListener('change', off); }
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
    if (mode === 'walk') { goFree(); tFov = baseFov(); $('.sv-photo').hidden = true; tPos.y = EYE; focused = undefined; return; }
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
  map.innerHTML = `<rect class="room" x="6" y="6" width="${rw * ms}" height="${rd * ms}" rx="1.5"/>` + (spec.solids || []).map(([ax, az, bx, bz]) => `<line class="stand" x1="${mx(ax)}" y1="${mz(az)}" x2="${mx(bx)}" y2="${mz(bz)}"/>`).join('') + pieces.map((p, i) => {
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
  // --- the plan opens large, with the list of every exhibition and section (spec.directory: { title, kind, at: [x, z], look: [x, z] });
  //     a tap on an entry (in the list or on its pin) takes the visitor there, facing it. The museum is big and walking takes time.
  const dirEl = $('.sv-dir'), DIR = spec.directory || [];
  let dirOpen = false;
  if (DIR.length) {
    if (!document.getElementById('svDirCss')) document.head.insertAdjacentHTML('beforeend', `<style id="svDirCss">
.sv-map.tap{cursor:pointer;pointer-events:auto}.sv-map .tapt{font:600 9px system-ui,sans-serif;fill:#6d675d}
.sv-dir{position:absolute;inset:0;z-index:40;background:rgba(246,243,236,.985);overflow:auto;-webkit-overflow-scrolling:touch;padding:calc(10px + env(safe-area-inset-top,0px)) 14px calc(18px + env(safe-area-inset-bottom,0px));color:#22201c;font:15px/1.4 system-ui,-apple-system,sans-serif}
.sv-dir[hidden]{display:none}
.sv-dir-h{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:8px}.sv-dir-h b{font:600 22px Georgia,serif}
.sv-dir-x{min-width:44px;min-height:44px;border:0;border-radius:22px;background:#e9e3d6;font-size:24px;line-height:1;color:#22201c}
.sv-dir-p{background:#fffdf8;border:1px solid #d9d2c3;border-radius:10px;padding:6px}.sv-dir-p svg{display:block;width:100%;height:auto;max-height:40vh}
.sv-dir-p .room{fill:#f3f2ee;stroke:#141516;stroke-width:1.2}.sv-dir-p .work{stroke:#141516;stroke-width:2.4;stroke-linecap:round}.sv-dir-p .stand{stroke:#8d8a82;stroke-width:2}
.sv-dir-p .pin{cursor:pointer}.sv-dir-p .pin circle{fill:#8a4b2c;stroke:#fff;stroke-width:1.4}.sv-dir-p .pin text{fill:#fff;font:700 8px system-ui,sans-serif;text-anchor:middle}.sv-dir-p .pin.h circle{fill:#1c67e3}.sv-dir-p .pin.p circle{fill:#3a3d40}
.sv-dir-l{margin-top:12px}.sv-dir-l h4{margin:14px 0 6px;font:600 12px system-ui,sans-serif;letter-spacing:.08em;text-transform:uppercase;color:#6d675d}
.sv-dir-l button{display:flex;align-items:center;gap:10px;width:100%;min-height:48px;padding:8px 12px;margin-bottom:6px;border:1px solid #d9d2c3;border-radius:10px;background:#fffdf8;color:#22201c;text-align:left;font:inherit}
.sv-dir-l button i{flex:none;width:24px;height:24px;border-radius:12px;background:#8a4b2c;color:#fff;font:700 12px/24px system-ui,sans-serif;text-align:center;font-style:normal}.sv-dir-l button.h i{background:#1c67e3}.sv-dir-l button.p i{background:#3a3d40}
.sv-dir-l button b{font-weight:600}.sv-dir-l button span{margin-left:auto;font-size:12px;color:#6d675d}
</style>`);
    map.classList.add('tap'); map.setAttribute('role', 'button'); map.setAttribute('tabindex', '0'); map.setAttribute('aria-label', 'Floor plan. Tap it for the list of every exhibition.');
    map.insertAdjacentHTML('beforeend', `<text class="tapt" x="${rw * ms + 8}" y="${rd * ms + 9}" text-anchor="end">tap: all exhibitions</text>`);
    map.setAttribute('viewBox', `0 0 ${rw * ms + 12} ${rd * ms + 16}`);
    const KIND = { room: 'Exhibitions', history: 'History: a walk through time', place: 'Places' };
    const jump = en => {
      setMode('walk'); goFree(); walkTo = null;
      const at = new THREE.Vector3(en.at[0], EYE, en.at[1]); pos.copy(at); tPos.copy(at); aimFrom(pos, new THREE.Vector3(en.look[0], EYE - 0.05, en.look[1]));
      look.set(pos.x - Math.sin(yaw) * Math.cos(pitch), pos.y + Math.sin(pitch), pos.z - Math.cos(yaw) * Math.cos(pitch)); tLook.copy(look);       // (arrive already facing it: no swing from the old direction)
      show(); dropHint(); closeDir(); dirty = true;
    };
    const closeDir = () => { dirOpen = false; dirEl.hidden = true; };
    const openDir = () => {
      dirOpen = true;
      const big = map.cloneNode(true); big.removeAttribute('class'); big.removeAttribute('style'); big.removeAttribute('role'); big.removeAttribute('tabindex'); big.removeAttribute('aria-label'); big.querySelectorAll('.tapt,.hit').forEach(n => n.remove());
      const pins = DIR.map((en, k) => `<g class="pin ${en.kind === 'history' ? 'h' : en.kind === 'place' ? 'p' : ''}" data-k="${k}"><circle cx="${mx(en.at[0])}" cy="${mz(en.at[1])}" r="6.2"/><text x="${mx(en.at[0])}" y="${mz(en.at[1]) + 2.8}">${k + 1}</text></g>`).join('');
      big.insertAdjacentHTML('beforeend', pins);
      let list = '', last = '';
      DIR.forEach((en, k) => { const kind = en.kind || 'room'; if (kind !== last) { list += `<h4>${KIND[kind] || kind}</h4>`; last = kind; } list += `<button type="button" data-k="${k}" class="${kind === 'history' ? 'h' : kind === 'place' ? 'p' : ''}"><i>${k + 1}</i><b>${en.title}</b>${en.note ? `<span>${en.note}</span>` : ''}</button>`; });
      dirEl.innerHTML = `<div class="sv-dir-h"><b>The museum</b><button type="button" class="sv-dir-x" aria-label="Close the plan">×</button></div><div class="sv-dir-p"></div><div class="sv-dir-l">${list}</div>`;
      dirEl.querySelector('.sv-dir-p').append(big);
      dirEl.hidden = false; dirEl.scrollTop = 0;
    };
    dirEl.addEventListener('click', e => {
      if (e.target.closest('.sv-dir-x')) return closeDir();
      const t = e.target.closest('[data-k]'); if (t) jump(DIR[+t.dataset.k]);
    });
    addEventListener('keydown', e => { if (e.key === 'Escape' && dirOpen) closeDir(); });
    map.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openDir(); } });
    spec.__openDirectory = openDir;
  }
  map.addEventListener('click', e => {
    if (DIR.length) return spec.__openDirectory();
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
    if (editor && editor.pointer('down', e)) { canvas.setPointerCapture(e.pointerId); return; }
    stopPlay();
    touches.set(e.pointerId, { x: e.clientX, y: e.clientY }); canvas.setPointerCapture(e.pointerId);
    if (touches.size === 2) { pinch = { d: spread(), fov: tFov }; drag = null; moved = 99; return; }
    drag = { x: e.clientX, y: e.clientY }; moved = 0;
  });
  canvas.addEventListener('pointermove', e => {
    if (editor && editor.pointer('move', e)) return;
    if (touches.has(e.pointerId)) touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch && touches.size === 2) { tFov = Math.max(22, Math.min(100, pinch.fov * pinch.d / Math.max(20, spread()))); dropHint(); return; }
    if (!drag) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y; moved += Math.abs(dx) + Math.abs(dy); drag = { x: e.clientX, y: e.clientY };
    if (moved > 6) {
      goFree(); dropHint();
      if (gyro) gyroBase += dx * 0.005; else { yaw += dx * 0.005; pitch = Math.max(-0.7, Math.min(0.7, pitch + dy * 0.003)); }
    }
  });
  const lift = e => { touches.delete(e.pointerId); if (touches.size < 2) pinch = null; };
  canvas.addEventListener('pointercancel', e => { if (editor && editor.pointer('up', e)) return; lift(e); drag = null; });
  canvas.addEventListener('pointerup', e => {
    if (editor && editor.pointer('up', e)) return;
    lift(e);
    if (!drag) return; drag = null; if (moved > 6) return;
    if (editor) return;      // while hanging, a tap chooses things and never walks: a tap that missed a work used to walk the artist to the wall
    const r = canvas.getBoundingClientRect();
    ray.setFromCamera({ x: (e.clientX - r.left) / r.width * 2 - 1, y: -(e.clientY - r.top) / r.height * 2 + 1 }, camera);
    const hit = ray.intersectObjects([...pieces.map(p => p.mesh), ...(floorMesh ? [floorMesh] : []), ...HOT.map(h => h.mesh)])[0];
    if (!hit) return;
    dropHint();
    { const h = HOT.find(q => q.mesh === hit.object); if (h) { openHot(h.spec); return; } }
    if (hit.object === floorMesh) { setMode('walk'); show(); walkTo = clampStand(hit.point.clone().setY(EYE), pos); return; }
    setMode('works'); idx = pieces.findIndex(p => p.mesh === hit.object); show();
  });

  // hotspots: a plate of words on a wall (an exhibition's text, outside its room) is tapped like a work and read large (spec.hotspots: {title, text[], lang, kind, origin,u,v,size,normal})
  const HOT = [];
  const esc = t => String(t == null ? '' : t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  for (const h of spec.hotspots || []) {
    const m = planeMesh({ origin: h.origin, u: h.u, v: h.v, size: h.size }, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, visible: false }));
    HOT.push({ spec: h, mesh: m });
  }
  function openHot(h) {
    if (h.direct) { if (onHotspot) onHotspot({ ...h, go: true }); return; }
    if (onHotspot && onHotspot(h) === true) return;
    const el = $('.sv-read'); if (!el) return;
    const rtl = h.lang === 'he';
    el.innerHTML = `<div class="sv-read-h"><b>${esc(h.title)}</b><button class="sv-read-x" aria-label="Close">×</button></div>${h.sub ? `<p class="sv-read-s">${esc(h.sub)}</p>` : ''}<div class="sv-read-b" dir="${rtl ? 'rtl' : 'ltr'}">${(h.text || []).map(t => `<p>${esc(t)}</p>`).join('')}</div>${h.enter ? `<button class="sv-read-go">${esc(h.enter.label || 'Walk in')}</button>` : ''}`;
    el.hidden = false; el.scrollTop = 0;
    el.querySelector('.sv-read-x').onclick = () => { el.hidden = true; };
    const go = el.querySelector('.sv-read-go'); if (go) go.onclick = () => { el.hidden = true; if (onHotspot) onHotspot({ ...h, go: true }); };
  }
  if (HOT.length && !document.getElementById('svReadCss')) {
    const st = document.createElement('style'); st.id = 'svReadCss';
    st.textContent = `.sv-read{position:absolute;inset:0;z-index:45;background:rgba(246,243,236,.985);overflow:auto;-webkit-overflow-scrolling:touch;padding:calc(14px + env(safe-area-inset-top)) 22px calc(28px + env(safe-area-inset-bottom));color:#22201c}.sv-read[hidden]{display:none}
.sv-read-h{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;margin-bottom:6px}.sv-read-h b{font:600 26px/1.2 Georgia,serif}.sv-read-x{min-width:44px;min-height:44px;border:0;border-radius:22px;background:#e9e3d6;font-size:26px;line-height:1;color:#22201c;flex:none}
.sv-read-s{font:italic 15px Georgia,serif;color:#6d675c;margin:0 0 14px}.sv-read-b p{font:17px/1.62 Georgia,serif;margin:0 0 14px}.sv-read-b[dir=rtl]{text-align:right}
.sv-read-go{margin-top:8px;min-height:48px;padding:0 22px;border:0;border-radius:24px;background:#22201c;color:#f6f3ec;font:600 16px system-ui,sans-serif}`;
    document.head.appendChild(st);
  }

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
    if (k === 'shift') { keys.add('shift'); return; }
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
  { let was = camera.aspect > 1.3; new ResizeObserver(() => { const now = camera.aspect > 1.3; if (now !== was) { was = now; if (mode === 'walk') tFov = baseFov(); } }).observe(root); }      // (turned: the lens for that way up)

  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fwd = new THREE.Vector3(), sideV = new THREE.Vector3();
  let last = performance.now(), running = true, nextFocus = 0, nextChoose = 0, lastFov = 0, nextAdapt = 0;
  const lastPos = new THREE.Vector3(1e9, 0, 0), lastLook = new THREE.Vector3(), frameTimes = [];
  const maxRatio = Math.min(devicePixelRatio, 2);
  THREE.DefaultLoadingManager.onLoad = () => { dirty = true; };      // a texture arrived: show it
  function serveTiers(now) {
  // the sharpness of every work follows what the eye needs: from its real size, its distance and the screen's pixels, the picture it should
  // hold (640 / 1024 / 1536 / 2048 px across); a better one comes in (one download at a time) for the work the visitor looks at, a worse one
  // is kept where nobody looks, inside a budget of picture memory (the paintings are the museum's point: memory is spent on them, where the visitor is)
  if (pendingFull.length && now > nextFull) {
    nextFull = now + 300;
    const dir = new THREE.Vector3().subVectors(look, pos).normalize(), tanH = Math.tan(camera.fov * Math.PI / 360) * camera.aspect, pxW = renderer.domElement.width;
    let used = 0;
    for (const f of pendingFull) {
      const v = new THREE.Vector3().subVectors(f.centre, pos), d = Math.max(0.5, v.length()), seen = d < 3 || v.dot(dir) / d > 0.25;
      const need = f.span * pxW / (2 * d * tanH) * 1.15;
      f.d = d; f.want = !seen ? 0 : d > TIER_FAR ? 0 : TIERS.find(t => t >= need) || TIERS[TIERS.length - 1];
      used += f.cur * f.cur * (f.ar || 1) * 4 * 1.34 / 1048576;
    }
    // over the budget, or no longer looked at: the farthest sharp work goes back to its light image
    const back = pendingFull.filter(f => f.fullTex && f.reach < 1e8 && (f.want === 0 || f.want * 1.4 <= f.cur) && f.d > 2).sort((a, z) => z.d - a.d);
    for (const f of back.slice(0, used > TIER_MB ? 3 : 1)) if (used > TIER_MB || f.d > 6) { setFront(f, f.small); f.fullTex.dispose(); f.fullTex = null; f.cur = Math.max(f.small.image.width, f.small.image.height); }
    const f = loading < LOADS && pendingFull.filter(x => x.full && !x.tries && !x.busy && !x.top && x.want > x.cur * 1.05 && !(x.usedMid && x.want <= 1280) && (x.reach >= 1e8 || x.want > 0)).sort((a, z) => a.d - z.d)[0];
    if (f) {
      loading++; f.busy = true;
      const srcU = f.mid && !f.usedMid && f.want <= 1280 ? f.mid : f.full;      // (the 1200 px picture serves the middle tiers; the large scan only the sharpest)
      (f.reach >= 1e8 ? loadRetry([f.full]) : Promise.race([loadTex(srcU), new Promise(r => setTimeout(() => r(null), 9000))])).then(t => {      // (a sharper picture is optional: one try and a time limit, so a missing or slow file never holds the line)
        loading--; f.busy = false;
        if (!t) { f.tries = 1; return; }
        t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter;
        if (f.reach >= 1e8) { f.small = t; f.reach = 0; f.cur = Math.max(t.image.width, t.image.height); f.ar = t.image.height / t.image.width; setFront(f, t); return; }     // a work that had only its plain tone
        const nat = Math.max(t.image.naturalWidth || t.image.width, t.image.naturalHeight || t.image.height);
        if (srcU === f.mid) f.usedMid = true; else if (nat <= f.want * 1.05) f.top = true;      // (the largest picture there is: no further upgrade to try)
        const tex = shrinkTo(t, Math.max(f.want, 1024));
        if (f.fullTex) f.fullTex.dispose();
        f.fullTex = tex; f.cur = Math.max(tex.image.width, tex.image.height); setFront(f, tex); dirty = true;
      });
    }
  }
  }
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
        // the museum is big: a joystick pushed far (or Shift) runs; the tour rooms keep the stroll
        const mag = Math.min(1, Math.hypot(joy.x, joy.y)), run = spec.outdoors && !inSlow(tPos) ? 1 + 1.6 * mag * mag + (keys.has('shift') ? 1.2 : 0) : 1, sp = WALK * run;
        tPos.addScaledVector(fwd, f * sp * dt).addScaledVector(sideV, s * sp * dt); tPos.y = EYE;
        tPos.copy(clampStand(tPos, was));
      } else if (walkTo) {
        const d = new THREE.Vector3().subVectors(walkTo, tPos), n = d.length();
        if (n < 0.02) walkTo = null; else tPos.addScaledVector(d, Math.min(1, WALK * (spec.outdoors && !inSlow(tPos) ? 3.2 : 1.7) * dt / n));
      }
      tLook.set(tPos.x - Math.sin(yaw) * Math.cos(pitch), tPos.y + Math.sin(pitch), tPos.z - Math.cos(yaw) * Math.cos(pitch));
    }
    const k = reduce ? 1 : 1 - Math.pow(free ? 0.0005 : 0.02, dt);
    pos.lerp(tPos, k); look.lerp(tLook, k); up.lerp(tUp, k).normalize();
    camera.fov += (tFov - camera.fov) * k; camera.updateProjectionMatrix();
    if (renderer.xr.isPresenting) { rig.position.set(pos.x, 0, pos.z); rig.rotation.y = yaw; }
    else { camera.position.copy(pos); camera.up.copy(up); camera.lookAt(look); }
    updateMap();
    for (const q of plinths) if (q.face) { const f = q.face; f.rotation.y = Math.atan2(camera.position.x - q.group.position.x, camera.position.z - q.group.position.z); }
    if (person) person.traverse(o => { if (o.userData.billboard) { o.lookAt(camera.position.x, o.getWorldPosition(new THREE.Vector3()).y, camera.position.z); } });
    // nothing moved and nothing new to show: the last frame still stands (a phone keeps its battery)
    const still = !renderer.xr.isPresenting && pos.distanceToSquared(lastPos) < 1e-10 && look.distanceToSquared(lastLook) < 1e-10 && Math.abs(camera.fov - lastFov) < 1e-4;
    lastPos.copy(pos); lastLook.copy(look); lastFov = camera.fov;
    serveTiers(now);        // (before the still-frame return: a visitor standing in front of a work is exactly when its sharp picture must come in)
    if (still && !dirty) return;
    // the hang editor's plan covers the room: nothing to draw behind it (it is drawn again the moment the plan closes)
    if (root.classList.contains('planning')) { dirty = true; return; }
    dirty = false;
    // a phone that can't keep up draws at a lower resolution rather than stutter
    frameTimes.push(dt); if (frameTimes.length > 40) frameTimes.shift();
    if (frameTimes.length === 40 && now > nextAdapt) {
      const avg = frameTimes.reduce((a, b) => a + b) / 40, pr = renderer.getPixelRatio();
      if (avg > 0.028 && pr > 1) { renderer.setPixelRatio(Math.max(1, pr - 0.25)); resize(); nextAdapt = now + 1500; frameTimes.length = 0; }
      else if (avg > 0.028 && pr <= 1 && hallMirrorCtl && hallMirrorCtl.isOn) { hallMirrorCtl.set(false); nextAdapt = now + 4000; frameTimes.length = 0; }
      else if (avg > 0.028 && pr <= 1 && mirrorCtl && mirrorCtl.isOn) { mirrorCtl.set(false); nextAdapt = now + 4000; frameTimes.length = 0; }      // (already at the lowest resolution: the reflection goes next)
      else if (avg < 0.014 && pr < maxRatio) { renderer.setPixelRatio(Math.min(maxRatio, pr + 0.25)); resize(); nextAdapt = now + 4000; frameTimes.length = 0; }
      else if (avg < 0.012 && pr >= maxRatio && mirrorCtl && !mirrorCtl.isOn) { mirrorCtl.set(true); nextAdapt = now + 8000; frameTimes.length = 0; }
      else if (avg < 0.012 && pr >= maxRatio && hallMirrorCtl && !hallMirrorCtl.isOn) { hallMirrorCtl.set(true); nextAdapt = now + 8000; frameTimes.length = 0; }
    }
    if (mode === 'walk' && now > nextFocus) { focus(); nextFocus = now + 200; }
    if (ibrChoose && now > nextChoose) { ibrChoose(pos, new THREE.Vector3().subVectors(look, pos).normalize()); nextChoose = now + 700; }
    if (ibrNear) ibrNear(pos, new THREE.Vector3().subVectors(look, pos).normalize());
    if (!root.classList.contains('planning')) renderer.render(scene, camera);   // the plan covers the room: do not draw it (battery)
    globalThis.osVitals?.frame(renderer);      // real-phone data (app.js): the first frame drawn, and the canvas to watch for a lost context
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
  if (choose) $('.sv-choose button').onclick = () => { close(); choose.onChoose(); };
  if (!(spec.works || []).length) { $('[data-mode="works"]').hidden = true; }
  $('.sv-loading').hidden = true; if (root.__turn) root.__turn();
  setMode('walk'); show();
  if (exitLabel) $('.sv-x').textContent = exitLabel;
  if (editor) {
    $('.sv-modes').hidden = true; $('.sv-hint').innerHTML = 'Tap a work or a plinth, then drag it. Tap a standing wall to move it<br>Drag the wall behind to look around';
    // what the hang editor may do to the room: move a work to a place on a wall, a plinth on the floor
    const dM = 0.035 + 0.004;
    editor.attach({
      THREE, scene, camera, canvas, root, pieces, plinths, stands: standBodies, floor: floorMesh, EYE, surfaces, R, ray,
      dirty() { dirty = true; },
      pose() { return { at: pos.toArray(), to: look.toArray() }; },
      setPose(at, to) { setMode('walk'); goFree(); walkTo = null; pos.set(...at); tPos.set(...at); aimFrom(pos, V(to)); dirty = true; },
      clamp: p => clampStand(p),
      movePiece(p, wall, a, y) {
        const U = V(wall.u), N = V(wall.normal), O = V(wall.origin), h = p.h, dp = h.depth || 0.035;
        const c = O.clone().addScaledVector(U, a).addScaledVector(N, dp + 0.004).setY(y);
        p.g.matrix.makeBasis(U, new THREE.Vector3(0, 1, 0), N).setPosition(c.clone().addScaledVector(N, -dp / 2)); p.g.updateMatrixWorld(true);
        p.centre.copy(c); p.facing.set(N.x, 0, N.z).normalize();
        p.spot.position.copy(c).addScaledVector(N, 1.6).setY(Math.min(R.height - 0.15, y + 2)); p.spot.target.position.copy(c);
        h.centre = c.toArray(); h.axes = [U.toArray(), [0, 1, 0], N.toArray()];
        buildKeepOut(); dirty = true;
      },
      movePlinth(q, x, z) { q.group.position.set(x, 0, z); dirty = true; },
    });
  }
  // for the inspection stage: render the room from any point, exactly as a visitor's screen shows it, and
  // (ids) the same view with every surface in a flat colour saying what it is, to tell walls from works
  const ID = { work: '#ff0000', workbody: '#0000ff', shadow: '#ff8000', wall: '#00ff00', ceiling: '#008000', floor: '#ffff00', reveal: '#00ffff', beyond: '#808080' };
  const inspect = {
    pieces: pieces.map(p => ({ title: p.w.title, centre: p.centre.toArray(), facing: p.facing.toArray(), size: p.size, stand: p.stand.toArray(), image: p.h.image, core: p.h.core || null })),
    views, room: R, eye: EYE, start: { pos: pos.toArray(), look: look.toArray() },
    walkTo(at, to) { goFree(); pos.set(...at); look.set(...to); tPos.copy(pos); tLook.copy(look); dirty = true; },      // stand there, looking there, with the room running (the tiers follow)
    tiers: () => pendingFull.map(f => ({ title: f.title, cur: f.cur, want: f.want, d: +(f.d || 0).toFixed(1), full: f.full, tries: f.tries || 0 })),
    stand: p => clampStand(V(p)).toArray(),                 // where a visitor can actually stand
    failed,                                                  // works whose image never arrived
    ready: () => ibrReady(),                                 // the photos all in place on the room
    // each work as drawn now: its image's size (0: none), and whether it is in the scene and visible
    works() { return pieces.map(p => { const m = p.mesh.material, mats = [].concat(m), f = mats.find(x => x.emissiveMap) || mats[0]; const t = f && f.emissiveMap; let vis = true; for (let o = p.mesh; o; o = o.parent) vis = vis && o.visible; return { title: p.w.title, cm: [p.size.w, p.size.h], stand: p.stand.toArray(), at: p.centre.toArray(), image: t && t.image ? [t.image.width, t.image.height] : [0, 0], visible: vis, inScene: !!p.mesh.parent && !!p.mesh.parent.parent }; }); },
    // stand somewhere and look at something, as a visitor walking would (the room keeps running: for testing
    // what a phone does as one walks, unlike shot() below)
    hot: () => HOT.map(h => [h.spec.id, String(h.spec.title || '').slice(0, 40), h.spec.kind || '', (h.spec.text || []).length, (h.spec.origin || []).map(v => +(+v).toFixed(1)), h.spec.u, h.spec.v, h.spec.size, h.spec.normal]),
    meshes: () => { const o = []; scene.traverse(m => { if (m.isMesh) o.push([m.userData.kind || m.name || m.type, +m.position.y.toFixed(3), m.visible, m.renderOrder, !!(m.material && m.material.transparent), m.material && m.material.depthTest !== false]); }); return o; },
    setVisible: (kind, v) => { scene.traverse(m => { if (m.userData && m.userData.kind === kind) m.visible = !!v; }); dirty = true; },
    stats: () => ({ calls: renderer.info.render.calls, triangles: renderer.info.render.triangles, textures: renderer.info.memory.textures, geometries: renderer.info.memory.geometries, programs: (renderer.info.programs || []).length }),
    heavy: () => { const o = []; scene.traverse(m => { if (m.isMesh && m.geometry) { const g = m.geometry, n = (g.index ? g.index.count : g.attributes.position.count) / 3; if (n > 2000) o.push([m.userData.kind || m.name || m.type, Math.round(n), m.visible]); } }); return o.sort((a, b) => b[1] - a[1]).slice(0, 12); },
    pads: () => padList,
    eco: () => ({ pixelRatio: renderer.getPixelRatio(), mirror: hallMirrorCtl ? hallMirrorCtl.isOn : mirrorCtl ? mirrorCtl.isOn : null }), setMirror: v => { if (hallMirrorCtl) hallMirrorCtl.set(!!v); else if (mirrorCtl) mirrorCtl.set(!!v); },
    where() { return { pos: pos.toArray(), look: look.toArray(), fov: camera.fov }; },
    place(at, to) { setMode('walk'); goFree(); walkTo = null; pos.set(...at); tPos.set(...at); aimFrom(pos, V(to)); dirty = true; },
    // the images the room holds in the graphics memory, in MB (what a phone has to find room for)
    memory() {
      const seen = new Set(); let b = 0;
      const add = t => { if (!t || seen.has(t) || !t.image) return; seen.add(t); const w = t.image.width || 0, h = t.image.height || 0; b += w * h * 4 * (t.generateMipmaps === false ? 1 : 1.34); };
      scene.traverse(o => { const ms = o.material ? [].concat(o.material) : []; for (const m of ms) { for (const k of ['map', 'emissiveMap', 'normalMap', 'lightMap']) add(m[k]); if (m.uniforms) for (const u of Object.values(m.uniforms)) [].concat(u.value).forEach(v => v && v.isTexture && add(v)); } });
      renderer.info && scene.traverse(o => { if (o.isReflector && o.getRenderTarget) { const rt = o.getRenderTarget(); b += rt.width * rt.height * 4; } });
      return Math.round(b / 1048576);
    },
    textures(top = 25) {      // the texture memory by picture, biggest first: [mesh name, kind, w, h, MB] (what memory() adds up)
      const seen = new Set(), rows = [];
      scene.traverse(o => { const ms = o.material ? [].concat(o.material) : []; for (const m of ms) for (const k of ['map', 'emissiveMap', 'normalMap', 'lightMap']) { const t = m[k]; if (!t || seen.has(t) || !t.image) continue; seen.add(t);
        const w = t.image.width || 0, h = t.image.height || 0; rows.push([o.name || o.userData.name || o.userData.kind || '?', k, w, h, +(w * h * 4 * (t.generateMipmaps === false ? 1 : 1.34) / 1048576).toFixed(1)]); } });
      return rows.sort((a, b) => b[4] - a[4]).slice(0, top);
    },
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
      const bg = scene.background; if (!spec.outdoors) scene.background = new THREE.Color('#ff00ff');   // a hole shows as magenta (an open-air museum has its sky: no holes to find)
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
        // (a surface drawn in parts keeps its hidden parts hidden: an arch's ends are open, to see through it)
        const was = o.material;
        swapped.push([o, was, m]); o.material = Array.isArray(was) ? was.map(x => x.visible === false ? x : m) : m;
      });
      renderer.render(scene, camera);
      const png = renderer.domElement.toDataURL('image/png');
      for (const [o, was, m] of swapped) { if (was === 'v') o.visible = true; else { m.dispose(); o.material = was; } }
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
