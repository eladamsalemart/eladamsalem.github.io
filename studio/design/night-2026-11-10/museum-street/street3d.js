// Procedural "baked-look" renderer for the street concepts. Spec comes from window.SPEC (written by street_spec.py).
// Per-pixel point lights + a reflected-ceiling trick on glossy floors; no textures but the paintings. Runs in headless Chrome.
import * as THREE from 'three';
const S = window.SPEC, N = 16, K = 12;
const scene = new THREE.Scene();
const col = h => new THREE.Color(h);
const lerp = (a, b, t) => a + (b - a) * t, sstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const prof = (pts, x) => { if (x <= pts[0][0]) return pts[0][1]; for (let i = 1; i < pts.length; i++) if (x <= pts[i][0]) { const t = sstep(pts[i-1][0], pts[i][0], x); return lerp(pts[i-1][1], pts[i][1], t); } return pts[pts.length-1][1]; };
const Wd = x => prof(S.width, x), Hd = x => prof(S.height, x);

// ---------- shader
const VS = `varying vec3 vW; varying vec3 vN; void main(){ vec4 w = modelMatrix*vec4(position,1.0); vW=w.xyz; vN=normalize(mat3(modelMatrix)*normal); gl_Position=projectionMatrix*viewMatrix*w; }`;
const FS = `
#define N ${N}
#define K ${K}
varying vec3 vW; varying vec3 vN;
uniform vec3 uLP[N]; uniform vec3 uLC[N]; uniform float uLR[N]; uniform int uLn;
uniform float uSX[K]; uniform vec3 uSC[K]; uniform int uSn; uniform float uSoft;
uniform float uRX[K]; uniform vec3 uRC[K]; uniform int uRn; uniform float uRH;
uniform vec3 uAmb; uniform float uDiff, uEmis, uShin, uSpec, uRefl, uFogD; uniform vec3 uFog; uniform int uPat; uniform float uPatS; uniform vec3 uPatC;
uniform vec3 uCam; uniform float uGlow;
float h21(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
vec3 stopsA(float x){
  vec3 c = uSC[0];
  for(int i=1;i<K;i++){ if(i>=uSn) break; float t = smoothstep(uSX[i]-uSoft, uSX[i]+uSoft, x); c = mix(c, uSC[i], t); }
  return c;
}
vec3 stopsR(float x){
  vec3 c = uRC[0];
  for(int i=1;i<K;i++){ if(i>=uRn) break; float t = smoothstep(uRX[i]-1.5, uRX[i]+1.5, x); c = mix(c, uRC[i], t); }
  return c;
}
void main(){
  vec3 V = normalize(uCam - vW); vec3 n = normalize(vN); if(dot(n,V)<0.0) n=-n;
  vec3 alb = stopsA(vW.x);
  if(uPat==1){ vec2 q=floor(vW.xz*uPatS*9.0); float r=h21(q); float r2=h21(q+7.3); if(r>0.80) alb = mix(alb, uPatC, 0.75); else if(r2>0.88) alb = mix(alb, alb*0.45, 0.8); alb*= 0.93+0.07*h21(q*1.7); }
  if(uPat==2){ float s = step(0.5, fract(vW.x*uPatS)); alb *= 0.9+0.12*s; float g = step(0.97, fract(vW.x*uPatS)); alb = mix(alb, uPatC, g*0.6); }
  if(uPat==3){ vec2 q=floor(vW.xz*uPatS); float k=mod(q.x+q.y,2.0); alb = mix(alb, uPatC, k*0.85); }
  if(uPat==4){ vec2 q=floor(vW.xz*uPatS*4.0); float r=h21(q); alb *= 0.92+0.08*r; float s=step(0.96, fract(vW.x*uPatS)); alb = mix(alb, alb*0.5, s); }
  vec3 lit = uAmb; vec3 spec = vec3(0.0);
  for(int i=0;i<N;i++){ if(i>=uLn) break; vec3 d = uLP[i]-vW; float dist=length(d); vec3 L=d/dist; float f = 1.0/(1.0+pow(dist/uLR[i],2.0)); float lam = max(0.0,(dot(n,L)+0.45)/1.45);
    lit += uLC[i]*f*lam; vec3 H=normalize(L+V); spec += uLC[i]*f*pow(max(dot(n,H),0.0), uShin); }
  vec3 c = alb*lit*uDiff + alb*uEmis + spec*uSpec;
  if(uRefl>0.0){ vec3 r = reflect(-V, n); if(r.y>0.02){ float t=(uRH-vW.y)/r.y; float hx = vW.x + r.x*t; vec3 rc = stopsR(hx); float fr = 0.12+0.88*pow(1.0-max(dot(n,V),0.0),3.0); c += rc*uRefl*fr*(1.0/(1.0+t*0.02)); } }
  float dist = length(uCam-vW); float fg = 1.0-exp(-dist*uFogD); c = mix(c, uFog, fg*0.9);
  c = c*uGlow; c = c/(c+vec3(0.9))*1.55; c = pow(c, vec3(1.0/2.2));
  gl_FragColor = vec4(c,1.0);
}`;
const lightsU = { uLP: { value: Array.from({length: N}, () => new THREE.Vector3()) }, uLC: { value: Array.from({length: N}, () => new THREE.Vector3()) }, uLR: { value: new Array(N).fill(5) }, uLn: { value: 0 } };
S.lights.slice(0, N).forEach((l, i) => { lightsU.uLP.value[i].set(l.x, l.y, l.z); const c = col(l.col); lightsU.uLC.value[i].set(c.r * l.I, c.g * l.I, c.b * l.I); lightsU.uLR.value[i] = l.R; });
lightsU.uLn.value = Math.min(N, S.lights.length);
const fogC = col(S.fog.c), ambC = col(S.amb);
const camV = new THREE.Vector3(S.cam.x, S.cam.y, S.cam.z);
function stopsArr(stops) { const xs = new Array(K).fill(1e6), cs = Array.from({length: K}, () => new THREE.Vector3()); stops.slice(0, K).forEach(([x, h], i) => { xs[i] = x; const c = col(h); cs[i].set(c.r, c.g, c.b); }); return [xs, cs, Math.min(K, stops.length)]; }
const matCache = {};
function mat(spec) {
  const key = JSON.stringify(spec); if (matCache[key]) return matCache[key];
  const [sx, sc, sn] = stopsArr(spec.stops); const [rx, rc, rn] = stopsArr(spec.rstops || [[0, '#000000']]);
  const pc = col(spec.patC || '#ffffff');
  const m = new THREE.ShaderMaterial({ vertexShader: VS, fragmentShader: FS, side: THREE.DoubleSide, uniforms: Object.assign({
    uSX: { value: sx }, uSC: { value: sc }, uSn: { value: sn }, uSoft: { value: spec.soft ?? 0.4 }, uRX: { value: rx }, uRC: { value: rc }, uRn: { value: rn }, uRH: { value: spec.rh ?? S.height[0][1] },
    uAmb: { value: new THREE.Vector3(ambC.r, ambC.g, ambC.b).multiplyScalar(S.ambI) }, uDiff: { value: spec.diff ?? 1 }, uEmis: { value: spec.emis ?? 0 }, uShin: { value: spec.shin ?? 20 }, uSpec: { value: spec.spec ?? 0 }, uRefl: { value: spec.refl ?? 0 },
    uFogD: { value: S.fog.d }, uFog: { value: new THREE.Vector3(fogC.r, fogC.g, fogC.b) }, uPat: { value: spec.pat ?? 0 }, uPatS: { value: spec.patS ?? 1 }, uPatC: { value: new THREE.Vector3(pc.r, pc.g, pc.b) }, uCam: { value: camV }, uGlow: { value: S.glow ?? 1 } }, lightsU) });
  return matCache[key] = m;
}
// ---------- geometry collector
const buckets = new Map();
function quad(m, a, b, c, d) { // any winding (the shader turns the normal toward the viewer)
  const key = JSON.stringify(m); if (!buckets.has(key)) buckets.set(key, { m, p: [], n: [] });
  const B = buckets.get(key); const e1 = new THREE.Vector3().subVectors(b, a), e2 = new THREE.Vector3().subVectors(d, a); const nn = e1.cross(e2).normalize();
  for (const v of [a, b, c, a, c, d]) { B.p.push(v.x, v.y, v.z); B.n.push(nn.x, nn.y, nn.z); }
}
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const DX = 0.12;
function wallV(m, x0, x1, zf, y0f, y1f) { for (let x = x0; x < x1 - 1e-6; x += DX) { const xb = Math.min(x1, x + DX), xm = (x + xb) / 2; const ya = y0f(xm), yb = y1f(xm); if (yb - ya < 1e-3) continue; quad(m, V3(x, ya, zf(x)), V3(xb, ya, zf(xb)), V3(xb, yb, zf(xb)), V3(x, yb, zf(x))); } }
function slab(m, x0, x1, zA, zB, yf) { for (let x = x0; x < x1 - 1e-6; x += DX * 2) { const xb = Math.min(x1, x + DX * 2); quad(m, V3(x, yf(x), zA(x)), V3(xb, yf(xb), zA(xb)), V3(xb, yf(xb), zB(xb)), V3(x, yf(x), zB(x))); } }
const archTop = (r, xc) => x => { const hw = r.w / 2, u = (x - xc) / hw; if (Math.abs(u) >= 1) return r.h - (r.arch ? r.rise : 0); return r.arch ? (r.h - r.rise) + r.rise * Math.sqrt(1 - u * u) : r.h; };
const M = S.mat;
const Lx = S.L;
for (const side of [-1, 1]) {
  const zf = x => side * Wd(x) / 2;
  const wm = (side < 0 ? M.wallL : M.wallR) || M.wall;
  const rs = S.rooms.filter(r => r.side === side).sort((a, b) => a.x - b.x);
  let cur = 0;
  for (const r of rs) { wallV(wm, cur, r.x - r.w / 2, zf, () => 0, Hd); wallV(wm, r.x - r.w / 2, r.x + r.w / 2, zf, archTop(r, r.x), Hd); cur = r.x + r.w / 2; }
  wallV(wm, cur, Lx, zf, () => 0, Hd);
}
slab(M.floor, 0, Lx, x => -Wd(x) / 2, x => Wd(x) / 2, () => 0);
slab(M.ceil, 0, Lx, x => -Wd(x) / 2, x => Wd(x) / 2, Hd);
{ const w = Wd(Lx), h = Hd(Lx); quad(M.endwall || M.wall, V3(Lx, 0, -w / 2), V3(Lx, 0, w / 2), V3(Lx, h, w / 2), V3(Lx, h, -w / 2)); }
const arts = [];
for (const r of S.rooms) {
  const sd = r.side, z0 = sd * Wd(r.x) / 2, cd = r.cd || 0, ch = r.h, xa = r.x - r.w / 2, xb = r.x + r.w / 2;
  const zc = z0 + sd * cd; const cm = r.cm || M.room;
  if (cd > 0) {
    quad(r.cmWall || cm, V3(xa, 0, z0), V3(xa, 0, zc), V3(xa, ch, zc), V3(xa, ch, z0)); quad(r.cmWall || cm, V3(xb, 0, z0), V3(xb, 0, zc), V3(xb, ch, zc), V3(xb, ch, z0));
    quad(r.cmFloor || cm, V3(xa, 0, z0), V3(xb, 0, z0), V3(xb, 0, zc), V3(xa, 0, zc)); quad(r.cmCeil || cm, V3(xa, ch, z0), V3(xb, ch, z0), V3(xb, ch, zc), V3(xa, ch, zc));
  }
  const ir = { x: r.x, w: r.iw || r.w, h: r.ih || r.h, arch: r.arch, rise: r.irise ?? r.rise };
  if (cd > 0) { const w2 = r.cmWall || cm; wallV(w2, xa, xb, () => zc, archTop(ir, r.x), () => ch); wallV(w2, xa, ir.x - ir.w / 2, () => zc, () => 0, () => ch); wallV(w2, ir.x + ir.w / 2, xb, () => zc, () => 0, () => ch); }
  const rd = r.rd || 9, rw = r.rw || 9, rh = r.rh || 4.6, zr = zc + sd * rd, rx0 = r.x - rw / 2, rx1 = r.x + rw / 2;
  const rm = M.rwall, rf = M.rfloor, rc = M.rceil;
  quad(rm, V3(rx0, 0, zc), V3(rx0, 0, zr), V3(rx0, rh, zr), V3(rx0, rh, zc)); quad(rm, V3(rx1, 0, zc), V3(rx1, 0, zr), V3(rx1, rh, zr), V3(rx1, rh, zc));
  quad(rm, V3(rx0, 0, zr), V3(rx1, 0, zr), V3(rx1, rh, zr), V3(rx0, rh, zr)); quad(rf, V3(rx0, 0, zc), V3(rx1, 0, zc), V3(rx1, 0, zr), V3(rx0, 0, zr)); quad(rc, V3(rx0, rh, zc), V3(rx1, rh, zc), V3(rx1, rh, zr), V3(rx0, rh, zr));
  if (cd > 0) { quad(rm, V3(rx0, 0, zc + sd * 0.002), V3(xa, 0, zc + sd * 0.002), V3(xa, rh, zc + sd * 0.002), V3(rx0, rh, zc + sd * 0.002)); quad(rm, V3(xb, 0, zc + sd * 0.002), V3(rx1, 0, zc + sd * 0.002), V3(rx1, rh, zc + sd * 0.002), V3(xb, rh, zc + sd * 0.002)); }
  arts.push({ x: r.x, y: 1.75, z: zr - sd * 0.03, w: Math.min(5, rw * 0.5), h: 2.2, seed: r.seed, rot: sd > 0 ? Math.PI : 0 });
}
function frame(fr) {
  const w = Wd(fr.x), h = Hd(fr.x), hw = fr.hw, hh = fr.hh, rise = fr.rise ?? hw, x0 = fr.x, t = fr.t, m = fr.m, ms = fr.ms || fr.m;
  const outer = new THREE.Shape(); outer.moveTo(-w / 2, 0); outer.lineTo(w / 2, 0); outer.lineTo(w / 2, h); outer.lineTo(-w / 2, h); outer.closePath();
  const hole = new THREE.Path(); hole.moveTo(-hw, 0); hole.lineTo(-hw, hh - rise); hole.absellipse(0, hh - rise, hw, rise, Math.PI, 0, true); hole.lineTo(hw, 0); hole.closePath();
  outer.holes.push(hole);
  const geo = new THREE.ShapeGeometry(outer, 24), pos = geo.getAttribute('position'), idx = geo.index;
  const key = JSON.stringify(m); if (!buckets.has(key)) buckets.set(key, { m, p: [], n: [] }); const B = buckets.get(key);
  for (const xx of [x0, x0 + t]) for (let k = 0; k < idx.count; k++) { const i = idx.getX(k); B.p.push(xx, pos.getY(i), pos.getX(i)); B.n.push(1, 0, 0); }
  const pts = hole.getPoints(40);
  for (let i = 0; i < pts.length - 1; i++) { const a = pts[i], b = pts[i + 1]; if (Math.abs(a.y) < 1e-6 && Math.abs(b.y) < 1e-6) continue; quad(ms, V3(x0, a.y, a.x), V3(x0 + t, a.y, a.x), V3(x0 + t, b.y, b.x), V3(x0, b.y, b.x)); }
}
(S.frames || []).forEach(frame);
(S.art || []).forEach(a => { const z = a.side * (Wd(a.x) / 2 - 0.03); arts.push({ x: a.x, y: a.y ?? 1.7, z, w: a.w, h: a.h, seed: a.seed, rot: a.side > 0 ? Math.PI : 0 }); });
(S.panels || []).forEach(p => { const y = Hd(p.x) - 0.02; quad(p.m, V3(p.x - p.l / 2, y, p.z - p.w / 2), V3(p.x + p.l / 2, y, p.z - p.w / 2), V3(p.x + p.l / 2, y, p.z + p.w / 2), V3(p.x - p.l / 2, y, p.z + p.w / 2)); });
for (const B of buckets.values()) { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(B.p, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(B.n, 3)); const mesh = new THREE.Mesh(g, mat(B.m)); mesh.frustumCulled = false; scene.add(mesh); }
// ---------- paintings
function rng(s) { let t = s * 9301 + 49297; return () => (t = (t * 9301 + 49297) % 233280) / 233280; }
const PALS = [['#E8412C', '#F2A900', '#1F2A44', '#F3E9D2'], ['#1F5FBF', '#F3E9D2', '#D6479A', '#0E1A2E'], ['#0F9D8A', '#F2C14E', '#2B2B2B', '#F7F1E1'], ['#7B4BC4', '#FF8A5B', '#F3E9D2', '#222222'], ['#C8553D', '#F1E3C8', '#28536B', '#E8B04B'], ['#8CC63F', '#1D3557', '#F1FAEE', '#E63946']];
function artTex(seed) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 384; const g = c.getContext('2d'), R = rng(seed + 3), P = PALS[seed % PALS.length];
  g.fillStyle = P[3]; g.fillRect(0, 0, 512, 384);
  const kind = seed % 3;
  for (let i = 0; i < 7; i++) { g.fillStyle = P[Math.floor(R() * 3)]; g.globalAlpha = 0.55 + R() * 0.45; if (kind === 0) g.fillRect(R() * 400, R() * 300, 60 + R() * 200, 40 + R() * 160); else if (kind === 1) { g.beginPath(); g.ellipse(R() * 512, R() * 384, 30 + R() * 130, 30 + R() * 110, R() * 3, 0, 7); g.fill(); } else { g.save(); g.translate(R() * 512, R() * 384); g.rotate(R() * 3); g.fillRect(-250, 0, 500, 12 + R() * 70); g.restore(); } }
  g.globalAlpha = 1; return new THREE.CanvasTexture(c);
}
for (const a of arts) {
  const fr = new THREE.Mesh(new THREE.PlaneGeometry(a.w + 0.12, a.h + 0.12), new THREE.MeshBasicMaterial({ color: 0x15130f, side: THREE.DoubleSide }));
  const t = artTex(a.seed || 0); t.colorSpace = THREE.SRGBColorSpace;
  const p = new THREE.Mesh(new THREE.PlaneGeometry(a.w, a.h), new THREE.MeshBasicMaterial({ map: t, color: 0xdddddd, side: THREE.DoubleSide }));
  const g = new THREE.Group(); g.add(fr); p.position.z = 0.004; g.add(p); g.position.set(a.x, a.y, a.z); g.rotation.y = a.rot || 0;
  scene.add(g);
}
// ---------- people (for scale)
const pm = c => new THREE.ShaderMaterial({ vertexShader: VS, fragmentShader: FS, side: THREE.DoubleSide, uniforms: Object.assign({}, mat({ stops: [[0, c]], diff: 0.9, emis: 0.18 }).uniforms) });
for (const p of S.people || []) {
  const g = new THREE.Group(); const m1 = pm(p.c), m2 = pm('#2a2420'), m3 = pm(p.skin || '#c99b7a');
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.19, 0.62, 6, 12), m1); body.position.y = 1.18; body.scale.z = 0.7; g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.11, 16, 12), m3); head.position.y = 1.7; g.add(head);
  for (const dz of [-0.09, 0.09]) { const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.06, 0.82, 8), m2); leg.position.set(0, 0.41, dz); g.add(leg); }
  g.scale.setScalar(p.s || 1); g.position.set(p.x, 0, p.z); g.rotation.y = p.ry || 0; scene.add(g);
}
// ---------- render
const W = S.px[0], H = S.px[1];
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true }); renderer.setSize(W, H); renderer.setPixelRatio(1); document.body.appendChild(renderer.domElement);
renderer.setClearColor(fogC);
const cam = new THREE.PerspectiveCamera(S.cam.fov, W / H, 0.1, 200); cam.position.copy(camV); cam.lookAt(S.cam.tx, S.cam.ty, S.cam.tz);
renderer.render(scene, cam); document.title = 'done';
