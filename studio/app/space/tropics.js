// The tropical garden round the museum (ROADMAP 19): a wet stone terrace, a lawn and planted beds painted once, and then palms, bananas,
// monstera, ferns, heliconia, shrubs and hanging vines as INSTANCED cards cut from one atlas (blender/foliage_atlas.py renders it, with
// procedural leaves, into data/rooms/outside/tropics.webp: 4 x 3 cells of 512 px). Palm trunks are one instanced low-poly cylinder.
// A phone pays one draw call per kind (about 14 in all) and a few hundred small alpha-tested quads: no leaf geometry, no sorting.
// Everything is flat-lit by the atlas's own baked light and tinted by the visitor's hour; a distance haze (the sky's horizon colour) lifts
// the far plants into the humid air.
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rng = seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const hash = (x, y) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };
const vnoise = (x, y) => { const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
  return hash(ix, iy) * (1 - u) * (1 - v) + hash(ix + 1, iy) * u * (1 - v) + hash(ix, iy + 1) * (1 - u) * v + hash(ix + 1, iy + 1) * u * v; };
const fbm = (x, y) => vnoise(x, y) * 0.6 + vnoise(x * 2.3 + 7, y * 2.3 - 3) * 0.3 + vnoise(x * 5.1 - 11, y * 5.1 + 5) * 0.1;

export async function addTropics({ THREE, scene, o, env, hazeRGB, loadTex, mark, phone }) {
  const [CX, CZ] = o.centre, [HX, HZ] = o.hall, ent = o.entrance || [43, 53];
  const tint = new THREE.Color(...env.tint.map(v => Math.pow(v, 1.05)));
  const haze = new THREE.Vector3(...hazeRGB.map(v => v / 255));
  // distance from the hall's footprint (0 on the glass, positive outside)
  const dist = (x, z) => { const dx = Math.max(-x, x - HX, 0), dz = Math.max(-z, z - HZ, 0); return Math.hypot(dx, dz); };
  const canvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };

  // --- the wind: slow gusts travelling over the garden, a quicker flutter per plant; a vertex moves by aBend (metres, grows toward the tip), up/down and a little sideways
  const uT = { value: 0 };
  const WIND = `
#ifdef USE_INSTANCING
  vec3 ip = vec3(instanceMatrix[3][0], instanceMatrix[3][1], instanceMatrix[3][2]);
#else
  vec3 ip = vec3(0.0);
#endif
  float gust = sin(uTime * 0.5 + ip.x * 0.05 + ip.z * 0.035) * 0.5 + 0.5, ph = ip.x * 0.31 + ip.z * 0.23;
  float fl = sin(uTime * 1.7 + ph) * 0.7 + sin(uTime * 3.3 + ph * 1.9 + position.x * 3.0) * 0.3;
  transformed.y += fl * aBend * (0.3 + 0.7 * gust);
  transformed.z += sin(uTime * 2.1 + ph * 1.3) * aBend * 0.5 * (0.3 + 0.7 * gust);
`;
  // --- the haze: every outdoor material mixes toward the sky's horizon colour with distance (and is lifted a little low down)
  const hazy = (mat, opts = {}) => {
    mat.onBeforeCompile = sh => {
      sh.uniforms.uHaze = { value: haze }; sh.uniforms.uNear = { value: opts.near || 28 }; sh.uniforms.uFar = { value: opts.far || 190 };
      if (opts.detail) sh.uniforms.uDetail = { value: opts.detail };
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying float vDist;\nvarying vec2 vW;')
        .replace('#include <project_vertex>', '#include <project_vertex>\nvDist = length(mvPosition.xyz);\n#ifdef USE_INSTANCING\n vW = (modelMatrix * instanceMatrix * vec4(transformed, 1.0)).xz;\n#else\n vW = (modelMatrix * vec4(transformed, 1.0)).xz;\n#endif');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vDist;\nvarying vec2 vW;\nuniform vec3 uHaze; uniform float uNear; uniform float uFar;' + (opts.detail ? '\nuniform sampler2D uDetail;' : ''))
        .replace('#include <map_fragment>', '#include <map_fragment>' + (opts.detail ? '\n{ float k = clamp(1.0 - vDist / 60.0, 0.0, 1.0); vec3 dd = texture2D(uDetail, vW / 2.4).rgb * 0.5 + texture2D(uDetail, vW / 0.7).rgb * 0.5; diffuseColor.rgb *= mix(vec3(1.0), dd * 1.9, 0.12 + 0.88 * k); }' : ''))
        .replace('#include <dithering_fragment>', 'float hz = smoothstep(uNear, uFar, vDist) * 0.88;\ngl_FragColor.rgb = mix(gl_FragColor.rgb, uHaze, hz);\n#include <dithering_fragment>');
    };
    mat.customProgramCacheKey = () => 'haze' + (opts.detail ? 'd' : '') + (opts.wind ? 'w' : '');
    return mat;
  };

  // --- the land: gentle mounds and hollows that grow with the distance from the glass (flat on the terrace and along the path), and a pond
  // east of the hall in a bowl whose banks rise above the water. H is sampled from one coarse grid (bilinear) by the ground, the plants and the light.
  const SPAN = 300, GN = 256, GS = SPAN / GN, POND = { x: HX + 27, z: 27, rx: 13, rz: 8.5 };
  const pondQ = (px, pz) => Math.hypot((px - POND.x) / POND.rx, (pz - POND.z) / POND.rz);
  const heightRaw = (px, pz) => {
    const d = dist(px, pz), q = pondQ(px, pz), pw = Math.abs(px - (ent[0] + ent[1]) / 2), flat = pz > HZ ? clamp((pw - 5) / 9, 0, 1) : 1;
    const m = clamp((fbm(px / 23 + 3, pz / 23 - 8) - 0.40) * 2.2, 0, 1), amp = clamp((d - 7) / 34, 0, 1) * 5.2;
    const bank = q < 1.3 ? -0.7 + 1.1 * clamp((q - 0.7) / 0.6, 0, 1) : 0.4 * clamp(1 - (q - 1.3) / 1.2, 0, 1);
    return m * amp * flat * clamp((q - 1.3) / 1.6, 0, 1) + bank;
  };
  const HG = new Float32Array((GN + 1) * (GN + 1));
  for (let j = 0; j <= GN; j++) for (let i = 0; i <= GN; i++) HG[j * (GN + 1) + i] = heightRaw(CX - SPAN / 2 + i * GS, CZ - SPAN / 2 + j * GS);
  const Hs = (px, pz) => {
    const u = clamp((px - (CX - SPAN / 2)) / GS, 0, GN - 0.001), v = clamp((pz - (CZ - SPAN / 2)) / GS, 0, GN - 0.001), i = Math.floor(u), j = Math.floor(v), fu = u - i, fv = v - j, W = GN + 1;
    return HG[j * W + i] * (1 - fu) * (1 - fv) + HG[j * W + i + 1] * fu * (1 - fv) + HG[(j + 1) * W + i] * (1 - fu) * fv + HG[(j + 1) * W + i + 1] * fu * fv;
  };

  // --- the ground: a macro painting (lawn, planted beds, the path from the entrance) under a fine grass detail that is mixed in near the eye
  const MP = 1024, g = canvas(MP, MP), x = g.getContext('2d');
  {
    const id = x.createImageData(MP, MP), d = id.data, w2c = (i, j) => [CX - SPAN / 2 + (i + 0.5) / MP * SPAN, CZ - SPAN / 2 + (j + 0.5) / MP * SPAN];
    for (let j = 0; j < MP; j++) for (let i = 0; i < MP; i++) {
      const [wx, wz] = w2c(i, j), dd = dist(wx, wz), n = fbm(wx / 18, wz / 18), n2 = fbm(wx / 5 + 40, wz / 5), bed = clamp((fbm(wx / 9 + 90, wz / 9) - 0.46) * 9, 0, 1) * clamp((60 - dd) / 40, 0, 1) * clamp(dd - 3, 0, 1);
      // lush, slightly yellow-green lawn with big soft patches; beds of dark humus where the planting is thickest
      let r = 48 + n * 30 + n2 * 12, gg = 92 + n * 40 + n2 * 16, b = 30 + n * 14;
      r = r * (1 - bed) + (46 + n2 * 14) * bed; gg = gg * (1 - bed) + (50 + n2 * 14) * bed; b = b * (1 - bed) + (34 + n2 * 8) * bed;
      // the path from the way in: pale stone fading into the lawn, 8 m wide
      const pw = Math.abs(wx - (ent[0] + ent[1]) / 2), pk = wz > HZ ? clamp(1 - (pw - 3.6) / 1.4, 0, 1) * clamp(1 - (wz - HZ - 70) / 30, 0, 1) : 0;
      r = r * (1 - pk) + (150 + n2 * 20) * pk; gg = gg * (1 - pk) + (146 + n2 * 20) * pk; b = b * (1 - pk) + (132 + n2 * 20) * pk;
      // wet mud round the pond, then the light of a low sun on the mounds (a slope facing it is lighter, the lee side darker)
      const mq = pondQ(wx, wz), mud = clamp((1.6 - mq) / 0.5, 0, 1) * (0.6 + n2 * 0.4); r = r * (1 - mud) + (62 + n2 * 22) * mud; gg = gg * (1 - mud) + (52 + n2 * 18) * mud; b = b * (1 - mud) + (36 + n2 * 10) * mud;
      const sl = clamp((Hs(wx - 1.6, wz - 1.6) - Hs(wx + 1.6, wz + 1.6)) * 0.2, -0.4, 0.4) + 1; r *= sl; gg *= sl; b *= sl;
      const k = (j * MP + i) * 4; d[k] = r; d[k + 1] = gg; d[k + 2] = b; d[k + 3] = 255;
    }
    x.putImageData(id, 0, 0);
  }
  const macro = new THREE.CanvasTexture(g); macro.colorSpace = THREE.SRGBColorSpace; macro.anisotropy = 4;
  const det = canvas(256, 256), dx = det.getContext('2d'); {
    dx.fillStyle = '#808080'; dx.fillRect(0, 0, 256, 256); const r = rng(5);
    for (let i = 0; i < 9000; i++) { const px = r() * 256, py = r() * 256, l = 2 + r() * 7, a = (r() - 0.5) * 0.9, v = 90 + r() * 110; dx.strokeStyle = `rgba(${v},${v + 10},${v - 30},0.5)`; dx.lineWidth = 0.6 + r() * 0.8; dx.beginPath(); dx.moveTo(px, py); dx.lineTo(px + Math.sin(a) * l, py - Math.cos(a) * l); dx.stroke(); if (px < 8) { dx.beginPath(); dx.moveTo(px + 256, py); dx.lineTo(px + 256 + Math.sin(a) * l, py - Math.cos(a) * l); dx.stroke(); } }
    for (let i = 0; i < 60; i++) { const px = r() * 256, py = r() * 256, rr = 6 + r() * 14; const gr = dx.createRadialGradient(px, py, 0, px, py, rr); gr.addColorStop(0, 'rgba(50,50,40,0.18)'); gr.addColorStop(1, 'rgba(50,50,40,0)'); dx.fillStyle = gr; dx.fillRect(px - rr, py - rr, 2 * rr, 2 * rr); }
  }
  const detail = new THREE.CanvasTexture(det); detail.wrapS = detail.wrapT = THREE.RepeatWrapping; detail.colorSpace = THREE.SRGBColorSpace; detail.anisotropy = 4;
  const gg0 = new THREE.PlaneGeometry(SPAN, SPAN, phone ? 80 : 112, phone ? 80 : 112); gg0.rotateX(-Math.PI / 2);
  { const pa = gg0.attributes.position; for (let i = 0; i < pa.count; i++) pa.setY(i, Hs(CX + pa.getX(i), CZ + pa.getZ(i))); pa.needsUpdate = true; }
  const ground = new THREE.Mesh(gg0, hazy(new THREE.MeshBasicMaterial({ map: macro, color: tint, toneMapped: false }), { detail }));
  ground.position.set(CX, -0.02, CZ); ground.renderOrder = -6; ground.userData.kind = 'outside'; scene.add(ground);
  // the pond: real reflection of the hour's sky (the sky picture itself, looked up along the mirrored view ray through small moving ripples, mirror-like at a grazing angle and
  // dark and clear when looked down into), the far tree line and the banks darkening the rim, lily pads and flowers on top, rings where something touched the water
  {
    const c = canvas(512, 512), y = c.getContext('2d'), r = rng(31);
    for (let i = 0; i < 46; i++) { const a = r() * 6.28, rr = Math.sqrt(r()) * 215, px = 256 + Math.cos(a) * rr, py = 256 + Math.sin(a) * rr, s = 9 + r() * 15, rot = r() * 6.28;
      y.fillStyle = `rgb(${50 + r() * 24},${96 + r() * 30},${46 + r() * 16})`; y.beginPath(); y.moveTo(px, py); y.arc(px, py, s, rot, rot + 5.5); y.closePath(); y.fill();
      y.strokeStyle = 'rgba(20,40,20,0.5)'; y.lineWidth = 1; y.stroke(); if (r() < 0.2) { y.fillStyle = r() < 0.6 ? '#f1c7d6' : '#fff3e6'; y.beginPath(); y.arc(px + s * 0.2, py - s * 0.1, 2.6, 0, 6.3); y.fill(); } }
    const wt = new THREE.CanvasTexture(c); wt.colorSpace = THREE.SRGBColorSpace; wt.anisotropy = 4;
    const lin = (r, g, b) => new THREE.Color(r / 255, g / 255, b / 255).convertSRGBToLinear();
    const sky = scene.background && scene.background.isTexture ? scene.background : null;
    const mat = new THREE.ShaderMaterial({
      uniforms: { uSky: { value: sky }, uPads: { value: wt }, uTime: uT, uHaze: { value: haze }, uTint: { value: tint.clone().convertSRGBToLinear() }, uDeep: { value: lin(16, 36, 32).multiply(tint) }, uFoliage: { value: lin(30, 52, 34).multiply(tint) } },
      vertexShader: 'varying vec2 vUv; varying vec3 vWp; varying float vDist;\nvoid main() { vUv = uv; vec4 wp = modelMatrix * vec4(position, 1.0); vWp = wp.xyz; vec4 mv = viewMatrix * wp; vDist = length(mv.xyz); gl_Position = projectionMatrix * mv; }',
      fragmentShader: `uniform sampler2D uSky; uniform sampler2D uPads; uniform float uTime; uniform vec3 uHaze; uniform vec3 uTint; uniform vec3 uDeep; uniform vec3 uFoliage;
varying vec2 vUv; varying vec3 vWp; varying float vDist;
void main() {
  vec3 V = normalize(vWp - cameraPosition); vec2 p = vWp.xz; float t = uTime;
  float dx = cos(p.x * 1.7 + p.y * 0.9 + t * 1.3) * 0.35 + cos(p.x * 3.9 - p.y * 2.3 + t * 2.1) * 0.18 + cos(p.x * 0.6 + p.y * 1.4 - t * 0.7) * 0.5 + cos(p.x * 9.0 + p.y * 7.0 + t * 3.0) * 0.06;
  float dz = cos(p.y * 1.5 - p.x * 0.8 + t * 1.1) * 0.35 + cos(p.y * 4.3 + p.x * 1.9 - t * 1.9) * 0.18 + cos(p.x * 1.1 - p.y * 0.5 + t * 0.6) * 0.5 + cos(p.x * 8.0 - p.y * 8.5 - t * 2.6) * 0.06;
  vec3 n = normalize(vec3(dx * 0.03, 1.0, dz * 0.03));
  vec3 R = reflect(V, n); R.y = abs(R.y);
  float cv = clamp(dot(-V, n), 0.0, 1.0), F = 0.03 + 0.97 * pow(1.0 - cv, 5.0);
  vec3 sk = texture2D(uSky, vec2(atan(R.z, R.x) / 6.2831853 + 0.5, asin(clamp(R.y, -1.0, 1.0)) / 3.14159265 + 0.5)).rgb;
  sk = mix(sk, uFoliage * (0.8 + 0.4 * sin(atan(R.z, R.x) * 23.0)), smoothstep(0.26, 0.04, R.y) * 0.72);      // the far tree line lying in the water
  float rr = length(vUv - 0.5) * 2.0; sk = mix(sk, uFoliage * 0.7, smoothstep(0.66, 1.0, rr) * 0.7);            // the banks
  vec3 col = mix(uDeep, sk, clamp(F * 0.95 + 0.10, 0.0, 1.0));
  vec4 pad = texture2D(uPads, vUv); col = mix(col, pad.rgb * uTint, pad.a);
  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
  gl_FragColor.rgb = mix(gl_FragColor.rgb, uHaze, smoothstep(28.0, 190.0, vDist) * 0.88);
}`,
    });
    const wm = new THREE.Mesh(new THREE.CircleGeometry(1, 56), mat);
    wm.rotation.x = -Math.PI / 2; wm.scale.set(POND.rx * 1.12, POND.rz * 1.12, 1); wm.position.set(POND.x, 0, POND.z); wm.renderOrder = -5; wm.userData.kind = 'outside'; scene.add(wm);
  }

  // --- the terrace: wet stone slabs all round the glass, 4.2 m wide (dark and glossy, with the sky lying in the shallow puddles), a lip of darker stone at its edge
  {
    const T = 4.2, c = canvas(512, 512), y = c.getContext('2d'), r = rng(9);
    y.fillStyle = '#6f7370'; y.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 700; i++) { const v = 90 + r() * 60; y.fillStyle = `rgba(${v},${v + 2},${v - 4},${0.1 + r() * 0.2})`; y.fillRect(r() * 512, r() * 512, 2 + r() * 14, 2 + r() * 14); }
    for (let sx = 0; sx < 2; sx++) for (let sy = 0; sy < 2; sy++) {          // four slabs per tile (1.2 m each), each a little different in tone, with a sheen where it is wet
      const px = sx * 256, py = sy * 256, tone = (r() - 0.5) * 22; y.fillStyle = `rgba(${tone > 0 ? '255,255,255' : '0,0,0'},${Math.abs(tone) / 255})`; y.fillRect(px, py, 256, 256);
      const gr = y.createLinearGradient(px, py, px + 256, py + 256); gr.addColorStop(0, 'rgba(190,210,220,0.0)'); gr.addColorStop(0.5, `rgba(190,212,224,${0.08 + r() * 0.16})`); gr.addColorStop(1, 'rgba(190,210,220,0)'); y.fillStyle = gr; y.fillRect(px, py, 256, 256);
      if (r() < 0.6) { const qx = px + 40 + r() * 170, qy = py + 40 + r() * 170, rr = 30 + r() * 60, pg = y.createRadialGradient(qx, qy, 0, qx, qy, rr); pg.addColorStop(0, 'rgba(176,200,214,0.55)'); pg.addColorStop(0.7, 'rgba(150,176,192,0.3)'); pg.addColorStop(1, 'rgba(150,176,192,0)'); y.fillStyle = pg; y.save(); y.translate(qx, qy); y.scale(1.6, 1); y.translate(-qx, -qy); y.fillRect(qx - rr, qy - rr, 2 * rr, 2 * rr); y.restore(); }
    }
    y.strokeStyle = 'rgba(30,34,32,0.8)'; y.lineWidth = 3; for (const k of [0, 256]) { y.beginPath(); y.moveTo(k, 0); y.lineTo(k, 512); y.stroke(); y.beginPath(); y.moveTo(0, k); y.lineTo(512, k); y.stroke(); }
    for (let i = 0; i < 260; i++) { y.fillStyle = `rgba(60,86,40,${0.1 + r() * 0.2})`; const px = r() < 0.5 ? (r() < 0.5 ? 0 : 256) + (r() - 0.5) * 8 : r() * 512, py = px % 256 < 6 || px % 256 > 250 ? r() * 512 : (r() < 0.5 ? 0 : 256); y.fillRect(px, py, 1 + r() * 3, 1 + r() * 3); }   // moss in the joints
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
    const P = [], U = [], I = []; const q = (x0, z0, x1, z1) => { const n = P.length / 3; P.push(x0, 0, z0, x1, 0, z0, x1, 0, z1, x0, 0, z1); U.push(x0 / 2.4, z0 / 2.4, x1 / 2.4, z0 / 2.4, x1 / 2.4, z1 / 2.4, x0 / 2.4, z1 / 2.4); I.push(n, n + 2, n + 1, n, n + 3, n + 2); };
    q(-T, -T, HX + T, 0); q(-T, HZ, HX + T, HZ + T); q(-T, 0, 0, HZ); q(HX, 0, HX + T, HZ);
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2)); geo.setIndex(I);
    const terr = new THREE.Mesh(geo, hazy(new THREE.MeshBasicMaterial({ map: t, color: tint, toneMapped: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 })));
    terr.position.y = -0.01; terr.userData.kind = 'outside'; scene.add(terr);
    // the curb: a darker strip of stone along the terrace's outer edge
    const cm = new THREE.MeshBasicMaterial({ color: new THREE.Color(0x3a3d3b).multiply(tint), toneMapped: false });
    for (const [x0, z0, x1, z1] of [[-T, -T, HX + T, -T + 0.25], [-T, HZ + T - 0.25, HX + T, HZ + T], [-T, -T, -T + 0.25, HZ + T], [HX + T - 0.25, -T, HX + T, HZ + T]]) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, 0.08, z1 - z0), cm); m.position.set((x0 + x1) / 2, 0.02, (z0 + z1) / 2); m.userData.kind = 'outside'; scene.add(m);
    }
  }

  // --- the plants: instanced cards cut from the atlas
  const atlas = await loadTex(o.tropics); if (!atlas) { mark(); return; }
  atlas.anisotropy = phone ? 2 : 4; atlas.generateMipmaps = true; atlas.minFilter = THREE.LinearMipmapLinearFilter; atlas.needsUpdate = true;
  const KINDS = {     // cell, size S (m) and the cell's centre height zc, vertical planes, the instances' [count]
    palmA: { cell: 0, S: 8.6, zc: 0.9, planes: 2 }, palmB: { cell: 1, S: 8.6, zc: 0.9, planes: 2 }, palmAb: { cell: 8, S: 8.8, flat: true }, palmBb: { cell: 11, S: 8.8, flat: true },
    banana: { cell: 2, S: 7.4, zc: 2.3, planes: 3 }, banana2: { cell: 9, S: 7.4, zc: 2.3, planes: 3 }, monstera: { cell: 3, S: 4.8, zc: 1.5, planes: 3 }, fern: { cell: 4, S: 3.4, zc: 0.95, planes: 3 },
    fern2: { cell: 10, S: 4.2, zc: 1.1, planes: 3 }, heli: { cell: 5, S: 4.2, zc: 1.7, planes: 2 }, shrub: { cell: 6, S: 3.2, zc: 1.1, planes: 3 }, vine: { cell: 7, S: 4.4, zc: 2.0, planes: 1 },
  };
  const cardGeo = k => {
    const K = KINDS[k], u0 = (K.cell % 4) / 4 + 0.002, u1 = (K.cell % 4 + 1) / 4 - 0.002, v1 = 1 - Math.floor(K.cell / 4) / 3 - 0.002, v0 = v1 - 1 / 3 + 0.004, h = K.S / 2, P = [], U = [], I = [], B = [];
    const add = (rot, flat) => { const n = P.length / 3; for (const [qx, qy, u, v] of [[-h, -h, u0, v0], [h, -h, u1, v0], [h, h, u1, v1], [-h, h, u0, v1]]) {
        if (flat) P.push(qx * Math.cos(rot) - qy * Math.sin(rot), 0, qx * Math.sin(rot) + qy * Math.cos(rot)); else P.push(qx * Math.cos(rot), qy + K.zc, qx * Math.sin(rot)); U.push(u, v); B.push(K.flat ? 0 : Math.pow((qy + h) / (2 * h), 1.6) * K.S * 0.03); }
      I.push(n, n + 1, n + 2, n, n + 2, n + 3); };
    if (K.flat) add(0, true); else for (let i = 0; i < K.planes; i++) add(i * Math.PI / K.planes, false);
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2)); geo.setAttribute('aBend', new THREE.Float32BufferAttribute(B, 1)); geo.setIndex(I); return geo;
  };
  const leafMat = hazy(new THREE.MeshBasicMaterial({ map: atlas, alphaTest: 0.42, side: THREE.DoubleSide, color: tint, toneMapped: false }), { wind: true });
  // --- single leaves for the plants nearest the glass: one real leaf (blender/leaf_atlas.py: veins, holes, tears, leaflets) bent along a curve and instanced; they sway in the wind
  const lat = await loadTex(o.tropics.replace('tropics.webp', 'leaves.webp'));
  const LEAVES = {    // atlas rect [x, y, w, h] in px (2048 square), dir: 'h' leaf grows to the right, 'v' upward; blade L x Wd (m), petiole P, angles (rad) of the petiole a0 and the blade's start a1 (it droops by `droop` more),
    // fold: sign + edges up (a trough), sign - edges down (hanging leaflets); nl segments; sway: metres at the tip; tex: a pale opaque texel for the petiole
    monstera: { r: [0, 0, 1024, 1024], dir: 'v', L: 1.1, Wd: 1.05, P: 0.9, a0: 1.2, a1: 0.35, droop: 0.7, fold: 0.1, nl: 7, sway: 0.10, tex: [1524, 704] },
    elephant: { r: [1024, 0, 512, 512], dir: 'v', L: 0.95, Wd: 0.95, P: 1.1, a0: 1.25, a1: 0.25, droop: 0.8, fold: 0.08, nl: 5, sway: 0.12, tex: [1524, 704] },
    banana: { r: [1024, 512, 1024, 384], dir: 'h', L: 2.6, Wd: 0.95, P: 1.0, a0: 1.25, a1: 0.5, droop: 1.0, fold: 0.12, nl: 9, sway: 0.22, tex: [1524, 704] },
    banana2: { r: [1024, 896, 1024, 384], dir: 'h', L: 2.4, Wd: 0.9, P: 1.1, a0: 1.3, a1: 0.45, droop: 1.1, fold: 0.12, nl: 9, sway: 0.22, tex: [1524, 704] },
    palmA: { r: [0, 1024, 1024, 512], dir: 'h', L: 3.4, Wd: 1.7, P: 0, a0: 0.5, a1: 0.5, droop: 1.3, fold: -0.22, nl: 9, sway: 0.30 },
    palmB: { r: [1024, 1280, 1024, 512], dir: 'h', L: 2.9, Wd: 1.45, P: 0, a0: 0.8, a1: 0.8, droop: 1.0, fold: -0.16, nl: 9, sway: 0.26 },
    fern: { r: [0, 1536, 1024, 512], dir: 'h', L: 1.7, Wd: 0.85, P: 0, a0: 0.9, a1: 0.9, droop: 1.4, fold: 0.12, nl: 7, sway: 0.10 },
  };
  const leafGeo = k => {
    const K = LEAVES[k], [rx, ry, rw, rh] = K.r, A = 2048, P = [], U = [], I = [], B = [];
    const uv = (t, sN) => K.dir === 'h' ? [(rx + 0.6 + t * (rw - 1.2)) / A, 1 - (ry + 0.6 + (1 - (sN + 1) / 2) * (rh - 1.2)) / A] : [(rx + 0.6 + (sN + 1) / 2 * (rw - 1.2)) / A, 1 - (ry + 0.6 + (1 - t) * (rh - 1.2)) / A];
    const total = K.P + K.L, ring = (px, py, hw, fold, uvf, bend) => { for (const sN of [-1, 0, 1]) { const f = uvf(sN); P.push(px, py + fold * Math.abs(sN) * hw, sN * hw); U.push(f[0], f[1]); B.push(bend); } };
    const NP = K.P > 0 ? 4 : 0, ds = [], ang = [];
    for (let i = 0; i < NP; i++) { const f = (i + 1) / NP; ds.push(K.P / NP); ang.push(K.a0 + (K.a1 - K.a0) * Math.pow(Math.max(0, (f - 0.4) / 0.6), 1.5)); }
    for (let i = 0; i < K.nl; i++) { ds.push(K.L / K.nl); ang.push(K.a1 - K.droop * (i + 1) / K.nl); }
    const tx = K.tex ? [(K.tex[0] + 0.5) / A, 1 - (K.tex[1] + 0.5) / A] : null;
    let x = 0, y = 0, sAcc = 0; const rings = [[0, 0, 0]];
    ds.forEach((d, i) => { x += Math.cos(ang[i]) * d; y += Math.sin(ang[i]) * d; sAcc += d; rings.push([x, y, sAcc]); });
    rings.forEach(([px, py, sa], i) => { const bl = sa - K.P, bend = K.sway * Math.pow(sa / total, 2);
      if (NP && i <= NP) ring(px, py, 0.03, 0, () => tx, bend); else ring(px, py, K.Wd / 2, K.fold, sN => uv(Math.min(1, Math.max(0, bl / K.L)), sN), bend); });
    for (let i = 0; i < rings.length - 1; i++) for (const j of [0, 1]) { const a = i * 3 + j, b = a + 3; I.push(a, a + 1, b, a + 1, b + 1, b); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2)); geo.setAttribute('aBend', new THREE.Float32BufferAttribute(B, 1)); geo.setIndex(I); return geo;
  };
  const leafLists = {}; for (const k in LEAVES) leafLists[k] = [];
  const NEAR = phone ? 18 : 30;                          // plants closer than this to the glass are built from single leaves
  const clump = (kind, px, py, pz, sc) => {              // a plant from single leaves, round a centre
    const n = { monstera: 5, elephant: 4, banana: 6, fern: 7 }[kind] + Math.floor(r() * 3), ya = r() * 6.28;
    for (let i = 0; i < n; i++) { const k = kind === 'monstera' ? (r() < 0.25 ? 'elephant' : 'monstera') : kind === 'banana' ? (r() < 0.5 ? 'banana' : 'banana2') : kind, yaw = ya + i / n * 6.28 + (r() - 0.5) * 0.7, s2 = sc * (0.8 + r() * 0.5), g = 0.85 + r() * 0.3;
      leafLists[k].push([px + (r() - 0.5) * 0.3 * sc, py, pz + (r() - 0.5) * 0.3 * sc, s2, yaw, g, g * (0.95 + r() * 0.1), g * 0.9, (r() - 0.5) * 0.35, (r() - 0.5) * 0.5]); }
  };
  const lists = {}; for (const k in KINDS) lists[k] = [];
  const barkL = [];                                     // palm trunks: x, z, height, radius, lean x, lean z
  // placement: clumps by noise; nothing on the terrace or the entrance path; ferns, monstera, ginger and shrubs close to the glass, bananas and palms further out
  const r = rng(2024), clearPath = (px, pz) => pz > HZ && Math.abs(px - (ent[0] + ent[1]) / 2) < 5.6 && pz < HZ + 70;
  const pick = (d0, d1) => { for (let t = 0; t < 60; t++) { const px = -d1 + r() * (HX + 2 * d1), pz = -d1 + r() * (HZ + 2 * d1), d = dist(px, pz); if (d >= d0 && d <= d1) return [px, pz, d]; } return null; };
  const LEAF_OF = { fern: 'fern', fern2: 'fern', monstera: 'monstera', banana: 'banana', banana2: 'banana' };
  const scatter = (kinds, n, d0, d1, dens, opt = {}) => {
    let placed = 0, tries = 0;
    while (placed < n && tries++ < n * 40) {
      const pp = pick(d0, d1); if (!pp) continue; const [px, pz] = pp; if (clearPath(px, pz) || pondQ(px, pz) < 1.35) continue;
      const nz = fbm(px / 11 + opt.seed, pz / 11); if (nz < dens) continue;
      const k = kinds[Math.floor(r() * kinds.length)], sc = (opt.s0 || 0.8) + r() * ((opt.s1 || 1.3) - (opt.s0 || 0.8));
      if (lat && pp[2] < NEAR && LEAF_OF[k]) { clump(LEAF_OF[k], px, Hs(px, pz) - 0.05, pz, sc * (k === 'banana' || k === 'banana2' ? 0.8 : 0.9)); placed++; continue; }
      lists[k].push([px, Hs(px, pz) - 0.05, pz, sc, r() * Math.PI * 2, 0.85 + r() * 0.3, 0.9 + r() * 0.2, 0.8 + r() * 0.25]); placed++;
    }
  };
  const pc = phone ? 0.75 : 1;
  scatter(['fern', 'fern2'], Math.round(170 * pc), 3.2, 26, 0.30, { seed: 1, s0: 1.0, s1: 1.9 });
  scatter(['monstera'], Math.round(110 * pc), 3.4, 30, 0.32, { seed: 2, s0: 1.0, s1: 1.8 });
  scatter(['heli'], Math.round(50 * pc), 3.6, 40, 0.36, { seed: 3, s0: 1.0, s1: 1.8 });
  scatter(['shrub'], Math.round(130 * pc), 3.2, 55, 0.36, { seed: 4, s0: 1.2, s1: 2.4 });
  scatter(['banana', 'banana2'], Math.round(55 * pc), 6, 70, 0.45, { seed: 5, s0: 1.0, s1: 1.7 });
  scatter(['fern', 'monstera', 'shrub'], Math.round(150 * pc), 30, 100, 0.36, { seed: 6, s0: 1.6, s1: 3.0 });
  scatter(['banana', 'banana2', 'heli'], Math.round(60 * pc), 30, 100, 0.4, { seed: 7, s0: 1.3, s1: 2.2 });
  { for (let n = 0, t = 0; n < Math.round(70 * pc) && t < 900; t++) { const a = r() * 6.28, q = 1.22 + r() * 0.9, px = POND.x + Math.cos(a) * POND.rx * q, pz = POND.z + Math.sin(a) * POND.rz * q; if (clearPath(px, pz) || dist(px, pz) < 3.4) continue;
      const k = ['fern', 'fern2', 'heli', 'monstera', 'shrub'][Math.floor(r() * 5)]; lists[k].push([px, Hs(px, pz) - 0.05, pz, 0.9 + r() * 1.0, r() * 6.28, 0.85 + r() * 0.3, 0.9 + r() * 0.2, 0.8 + r() * 0.25]); n++; } }
  // palms: trunk + crown (two crossed side cards and one flat card seen from below) + sometimes a curtain of vines
  const palms = []; { let placed = 0, tries = 0; const N = Math.round(62 * pc);
    while (placed < N && tries++ < N * 60) {
      const near = placed < N * 0.45, pp = pick(near ? 7 : 40, near ? 50 : 112); if (!pp) continue; const [px, pz] = pp; if (clearPath(px, pz) || pondQ(px, pz) < 1.5) continue;
      if (fbm(px / 13 + 20, pz / 13) < 0.4) continue; if (palms.some(q => Math.hypot(q[0] - px, q[1] - pz) < (near ? 5 : 8))) continue;
      const h = (near ? 6 + r() * 8 : 12 + r() * 10), rad = 0.2 + h * 0.012, lx = (r() - 0.5) * 0.14, lz = (r() - 0.5) * 0.14; palms.push([px, pz, h, rad, lx, lz]); placed++;
    } }
  for (const [px, pz, h, rad, lx, lz] of palms) {
    barkL.push([px, pz, h, rad, lx, lz]);
    const gy = Hs(px, pz), tx = px + lx * h, tz = pz + lz * h, sc = clamp(h / 10, 0.7, 1.5), yaw = r() * 6.28, A = r() < 0.5, col = [0.88 + r() * 0.2, 0.92 + r() * 0.16, 0.8 + r() * 0.2];
    if (lat && dist(px, pz) < NEAR * 1.1) { const nf = 13 + Math.floor(r() * 4); for (let i = 0; i < nf; i++) leafLists[r() < 0.5 ? 'palmA' : 'palmB'].push([tx, h + gy - 0.1, tz, sc * (0.8 + r() * 0.5), yaw + i / nf * 6.28 + (r() - 0.5) * 0.4, col[0], col[1], col[2], (r() - 0.5) * 0.9 + 0.1, (r() - 0.5) * 0.3]); }
    else { lists[A ? 'palmA' : 'palmB'].push([tx, h + gy, tz, sc, yaw, ...col]); lists[A ? 'palmAb' : 'palmBb'].push([tx, h + gy - 0.4, tz, sc, yaw, ...col]); }
    if (r() < 0.55) lists.vine.push([tx + (r() - 0.5) * 2.4, h + gy - 4.0 * 1.3 - 0.3, tz + (r() - 0.5) * 2.4, 1.3, r() * 6.28, 0.9, 0.95, 0.85]);
  }
  // a dark soft patch of earth under every plant (the plants stand IN the ground, not on it)
  { const gx = g.getContext('2d'); gx.globalCompositeOperation = 'source-over'; for (const k in KINDS) { if (KINDS[k].flat || k === 'vine') continue; for (const rw of lists[k]) { const px = (rw[0] - (CX - SPAN / 2)) / SPAN * MP, py = (rw[2] - (CZ - SPAN / 2)) / SPAN * MP, rad = Math.max(1.5, KINDS[k].S * rw[3] * 0.3 / SPAN * MP);
        const gr = gx.createRadialGradient(px, py, 0, px, py, rad); gr.addColorStop(0, 'rgba(18,28,10,0.55)'); gr.addColorStop(1, 'rgba(18,28,10,0)'); gx.fillStyle = gr; gx.fillRect(px - rad, py - rad, 2 * rad, 2 * rad); } }
    for (const [px0, pz0, , rad0] of barkL) { const px = (px0 - (CX - SPAN / 2)) / SPAN * MP, py = (pz0 - (CZ - SPAN / 2)) / SPAN * MP, rad = 4 / SPAN * MP, gr = gx.createRadialGradient(px, py, 0, px, py, rad); gr.addColorStop(0, 'rgba(18,28,10,0.5)'); gr.addColorStop(1, 'rgba(18,28,10,0)'); gx.fillStyle = gr; gx.fillRect(px - rad, py - rad, 2 * rad, 2 * rad); void rad0; }
    macro.needsUpdate = true; }
  // build the meshes
  const dummy = new THREE.Object3D(), col = new THREE.Color();
  const instanced = (geo, mat, rows, place) => { const im = new THREE.InstancedMesh(geo, mat, rows.length); rows.forEach((rw, i) => { place(dummy, rw); dummy.updateMatrix(); im.setMatrixAt(i, dummy.matrix); col.setRGB(rw[5] ?? 1, rw[6] ?? 1, rw[7] ?? 1); im.setColorAt(i, col); }); im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true; im.frustumCulled = false; im.userData.kind = 'outside'; scene.add(im); return im; };
  if (lat) {
    lat.anisotropy = phone ? 4 : 8; lat.generateMipmaps = true; lat.minFilter = THREE.LinearMipmapLinearFilter; lat.needsUpdate = true;
    const lm = hazy(new THREE.MeshBasicMaterial({ map: lat, alphaTest: 0.4, side: THREE.DoubleSide, color: tint, toneMapped: false }), { wind: true });
    for (const k in LEAVES) { const rows = leafLists[k]; if (!rows.length) continue;
      const im = instanced(leafGeo(k), lm, rows, (dm, rw) => { dm.position.set(rw[0], rw[1], rw[2]); dm.rotation.order = 'YZX'; dm.rotation.set(rw[9], rw[4], rw[8]); dm.scale.setScalar(rw[3]); }); im.userData.leaves = rows.length; }
  }
  for (const k in KINDS) { const rows = lists[k]; if (!rows.length) continue; instanced(cardGeo(k), leafMat, rows, (dm, rw) => { dm.position.set(rw[0], rw[1], rw[2]); dm.rotation.set(0, rw[4], 0); dm.scale.setScalar(rw[3]); }); }
  // trunks: tapered, ringed bark; one instanced mesh
  {
    const c = canvas(128, 512), y = c.getContext('2d'), rr = rng(3); y.fillStyle = '#7d6c58'; y.fillRect(0, 0, 128, 512);
    for (let i = 0; i < 70; i++) { const py = i * 7.3, v = 70 + rr() * 50; y.fillStyle = `rgba(${v},${v - 12},${v - 28},0.55)`; y.fillRect(0, py, 128, 2 + rr() * 2); y.fillStyle = 'rgba(255,240,210,0.12)'; y.fillRect(0, py + 3, 128, 1.5); }
    for (let i = 0; i < 420; i++) { const v = 60 + rr() * 90; y.fillStyle = `rgba(${v},${v - 10},${v - 24},0.25)`; y.fillRect(rr() * 128, rr() * 512, 1 + rr() * 3, 3 + rr() * 22); }
    for (let i = 0; i < 90; i++) { y.fillStyle = `rgba(70,96,50,${0.1 + rr() * 0.2})`; y.fillRect(rr() * 128, rr() * 512, 2 + rr() * 6, 2 + rr() * 8); }
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
    const geo = new THREE.CylinderGeometry(0.62, 1, 1, 8, 1, true); geo.translate(0, 0.5, 0);
    const mat = hazy(new THREE.MeshBasicMaterial({ map: t, color: tint, toneMapped: false }));
    instanced(geo, mat, barkL.map(b => [b[0], b[1], b[2], b[3], b[4], 1, 1, 1, b[5]]), (dm, b) => { dm.position.set(b[0], Hs(b[0], b[1]) - 0.15, b[1]); dm.rotation.set(b[8], 0, -b[4]); dm.scale.set(b[3], b[2], b[3]); });
  }
  { const tg = new THREE.BufferGeometry(); tg.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(9), 3)); const tick = new THREE.Mesh(tg, new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false })); tick.frustumCulled = false; tick.onBeforeRender = () => { uT.value = performance.now() / 1000; }; scene.add(tick); }   // the wind's clock
  mark();
}
