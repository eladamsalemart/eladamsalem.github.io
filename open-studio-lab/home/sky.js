// A small 3D sky of DOM stars and drawn ties, for a phone.
// Drag sideways to turn it (up and down scrolls the page); pinch to come closer or step back, where the stars you
// haven't met yet come into view; tap a star to turn to it. "Wander" takes the whole screen and frees every gesture.

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rnd = s => { let x = Math.sin(s * 999.7) * 43758.5453; return x - Math.floor(x); };
const hash = str => [...str].reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 7);

export function sky(el, o) {
  const stars = o.stars.map(s => ({ ...s, x: 0, y: 0, z: 0 }));
  const by = Object.fromEntries(stars.map(s => [s.id, s]));
  o.layout(stars, by);
  const ties = o.ties.filter(([a, b]) => by[a] && by[b]).map(([a, b, how]) => ({ a: by[a], b: by[b], how, bow: (rnd(hash(a + b)) - 0.5) * 2 }));

  const cam = { yaw: 0, pitch: 0, D: 520, tx: 0, ty: 0, tz: 0, ...o.cam };
  const lim = { Dmin: 220, Dmax: 1500, pitch: 0.75, yaw: Infinity, ...o.limits };
  const goal = { yaw: cam.yaw, pitch: cam.pitch, D: cam.D, tx: 0, ty: 0, tz: 0 };
  const F = o.F || 520;
  let swayT = 0, vyaw = 0, vpitch = 0, last = performance.now(), idleSince = 0, drawn = 0, born = performance.now();
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;

  el.classList.add('sky');
  el.innerHTML = `<svg class="sky-g" aria-hidden="true"><g class="sky-extra"></g><g class="sky-ties"></g></svg><div class="sky-stars"></div>`;
  const svg = el.querySelector('svg'), gx = el.querySelector('.sky-extra'), gt = el.querySelector('.sky-ties'), box = el.querySelector('.sky-stars');
  const NS = 'http://www.w3.org/2000/svg';
  for (const t of ties) { t.p = document.createElementNS(NS, 'path'); t.p.setAttribute('class', `tie ${t.how}`); t.p.setAttribute('pathLength', '1'); gt.append(t.p); }
  for (const s of stars) {
    const d = document.createElement('button'); d.type = 'button';
    d.className = `star k-${s.kind} r${s.ring}${s.img ? ' has-img' : ''}${s.real ? ' real' : ''}`;
    d.innerHTML = o.node(s); d.dataset.id = s.id;
    d.setAttribute('aria-label', [s.name, s.sub, s.note].filter(Boolean).join(', '));
    box.append(d); s.el = d;
  }

  let W = 0, H = 0;
  const size = () => { W = el.clientWidth; H = el.clientHeight; svg.setAttribute('viewBox', `0 0 ${W} ${H}`); };
  new ResizeObserver(size).observe(el); size();

  function project(p, c = cam) {
    const cy = Math.cos(c.yaw), sy = Math.sin(c.yaw), cp = Math.cos(c.pitch), sp = Math.sin(c.pitch);
    const X = p.x - c.tx, Y = p.y - c.ty, Z = p.z - c.tz;
    const x1 = X * cy + Z * sy, z1 = -X * sy + Z * cy;
    const y2 = Y * cp - z1 * sp, z2 = Y * sp + z1 * cp;
    const depth = c.D + z2, k = F / Math.max(depth, 1);
    return { x: W / 2 + x1 * k * (W / 390), y: H * (o.cy || 0.5) + y2 * k * (W / 390), k: k * (W / 390), depth, behind: depth < 40 };
  }

  function frame(now) {
    const dt = Math.min(64, now - last) / 16.67; last = now;
    if (!drag) {
      cam.yaw += vyaw * dt; cam.pitch += vpitch * dt; vyaw *= 0.94 ** dt; vpitch *= 0.92 ** dt;
      if (track) { cam.yaw += (goal.yaw - cam.yaw) * 0.08 * dt; cam.pitch += (goal.pitch - cam.pitch) * 0.08 * dt; }
      else if (!calm && now - idleSince > 2600 && Math.abs(vyaw) < 0.0004) {
        if (lim.yaw === Infinity) cam.yaw += (o.drift ?? 0.0007) * dt;
        else { swayT += dt / 60; cam.yaw += (Math.sin(swayT * 0.35) * lim.yaw * 0.45 - cam.yaw) * 0.01 * dt; }
      }
    }
    cam.D += (goal.D - cam.D) * 0.12 * dt;
    for (const k of ['tx', 'ty', 'tz']) cam[k] += (goal[k] - cam[k]) * 0.07 * dt;
    if (lim.yaw !== Infinity && !drag) { const over = cam.yaw - clamp(cam.yaw, -lim.yaw, lim.yaw); if (over) { cam.yaw -= over * 0.12 * dt; vyaw *= 0.6; } }
    if (lim.yaw !== Infinity && drag) cam.yaw = clamp(cam.yaw, -lim.yaw * 1.25, lim.yaw * 1.25);
    cam.pitch = clamp(cam.pitch, lim.pitchMin ?? -lim.pitch, lim.pitchMax ?? lim.pitch);
    el.classList.toggle('far-view', cam.D > (o.cam?.D ?? 520) * 1.22);
    if (o.tick) o.tick(now / 1000, stars, by);

    const near = cam.D, k0 = F / (o.cam?.D ?? 520) * (W / 390);                // how far out we are: the far stars come in as we step back
    for (const s of stars) {
      const q = project(s); s.q = q;
      const fog = clamp(1 - (q.depth - near + (o.fogStart ?? 120)) / (o.fogRange ?? 900), 0, 1);
      const out = s.ring === 2 ? clamp((cam.D - (o.farFrom ?? 380)) / 260, 0.18, 1) : 1;
      s.op = q.behind ? 0 : Math.max(o.minOp ?? 0.08, fog) * out;
      const sc = clamp(q.k / k0 * (o.scale ?? 1), 0.16, o.maxScale ?? 1.3);
      s.el.style.transform = `translate3d(${q.x.toFixed(1)}px,${q.y.toFixed(1)}px,0) scale(${sc.toFixed(3)})`;
      s.el.style.setProperty('--inv', (1 / sc).toFixed(3));
      s.el.style.opacity = s.op.toFixed(3);
      s.el.style.zIndex = String(10000 - Math.round(q.depth));
      s.el.classList.toggle('small', sc < (o.labelAt ?? 0.62));
      s.el.classList.toggle('big', sc > (o.bigAt ?? 0.95));
      s.el.classList.toggle('east', q.x > W * 0.62);
      s.el.classList.toggle('dim', !!focus && focus.id && s !== focus && !focusNear.has(s));
      s.el.style.pointerEvents = s.op > 0.25 ? '' : 'none';
    }
    const grow = calm ? 1 : clamp((now - born - 300) / 1800, 0, 1);
    for (const t of ties) {
      const a = t.a.q, b = t.b.q;
      if (a.behind || b.behind) { t.p.style.opacity = 0; continue; }
      const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2, dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1;
      const bow = t.bow * len * (o.bow ?? 0.12);
      t.p.setAttribute('d', `M${a.x.toFixed(1)} ${a.y.toFixed(1)} Q${(mx - dy / len * bow).toFixed(1)} ${(my + dx / len * bow).toFixed(1)} ${b.x.toFixed(1)} ${b.y.toFixed(1)}`);
      const lit = !focus || !focus.id || t.a === focus || t.b === focus;
      t.p.style.opacity = (Math.min(t.a.op, t.b.op) ** 2 * (t.how === 'maybe' ? 0.75 : 1) * (lit ? 1 : 0.25)).toFixed(3);
      t.p.style.strokeWidth = clamp(Math.min(a.k, b.k) * (o.ink ?? 1.4), 0.5, 2.6).toFixed(2);
      if (t.how !== 'maybe') t.p.style.strokeDashoffset = (1 - grow).toFixed(3);
    }
    if (o.extra) o.extra(gx, project, cam, now / 1000, { W, H });
    raf = running ? requestAnimationFrame(frame) : 0;
  }

  // --- gestures ---
  let drag = false, track = false, focus = null, focusNear = new Set(), raf = 0, running = false;
  const pts = new Map(); let start = null, pinch0 = 0, D0 = cam.D, moved = 0;
  const full = () => el.classList.contains('full');
  el.style.touchAction = 'pan-y';
  el.addEventListener('pointerdown', e => {
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pts.size === 1) { start = { x: e.clientX, y: e.clientY, t: performance.now(), id: e.target.closest('.star')?.dataset.id }; moved = 0; drag = true; vyaw = vpitch = 0; track = false; }
    if (pts.size === 2) { const [p, q] = [...pts.values()]; pinch0 = Math.hypot(p.x - q.x, p.y - q.y); D0 = goal.D; }
    try { el.setPointerCapture(e.pointerId); } catch {}
  });
  el.addEventListener('pointermove', e => {
    const p = pts.get(e.pointerId); if (!p) return;
    const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY; moved += Math.abs(dx) + Math.abs(dy);
    if (pts.size === 2) { const [a, b] = [...pts.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y); if (pinch0) goal.D = clamp(D0 * pinch0 / d, lim.Dmin, lim.Dmax); return; }
    const turn = (o.turn ?? 0.0062);
    cam.yaw += dx * turn; vyaw = dx * turn * 0.9;
    if (full() || o.pitchAlways) { cam.pitch -= dy * turn * 0.8; vpitch = -dy * turn * 0.7; }
    idleSince = performance.now();
  });
  const end = e => {
    pts.delete(e.pointerId);
    if (pts.size === 0) {
      drag = false; idleSince = performance.now();
      if (start && moved < 10 && performance.now() - start.t < 450 && start.id) choose(by[start.id]);
      start = null;
    }
    if (pts.size < 2) pinch0 = 0;
  };
  for (const g of ['gesturestart', 'gesturechange']) el.addEventListener(g, e => e.preventDefault());   // Safari's own pinch would zoom the page
  el.addEventListener('pointerup', end); el.addEventListener('pointercancel', e => { pts.delete(e.pointerId); if (!pts.size) { drag = false; start = null; } });
  el.addEventListener('wheel', e => { if (!full() && !e.ctrlKey) return; e.preventDefault(); goal.D = clamp(goal.D * (1 + e.deltaY * 0.0016), lim.Dmin, lim.Dmax); }, { passive: false });
  el.addEventListener('keydown', e => { const s = e.target.closest?.('.star'); if (s && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); choose(by[s.dataset.id]); } });

  function choose(s) {
    if (!s || s.kind === 'you') { o.onChoose && o.onChoose(null); return; }
    if (lim.yaw === Infinity) { const t = Math.atan2(s.x, -s.z); goal.yaw = cam.yaw + ((t - cam.yaw + Math.PI * 3) % (Math.PI * 2) - Math.PI); goal.pitch = o.keepPitch ? cam.pitch : clamp(Math.atan2(s.y, 520) * 0.6, -lim.pitch, lim.pitch); }
    else { goal.yaw = cam.yaw; goal.pitch = cam.pitch; const D1 = Math.min(goal.D, (o.cam?.D ?? 520) * 0.92), k1 = F / (D1 + s.z) * (W / 390); goal.tx = s.x * 0.75; goal.tz = 0; goal.ty = s.y + ((o.cy || 0.5) - (o.pickY ?? 0.34)) * H / k1; goal.D = D1; }
    focus = s; track = true; vyaw = 0; focusNear = new Set(ties.filter(t => t.a === s || t.b === s).map(t => t.a === s ? t.b : t.a));
    for (const x of stars) x.el.classList.toggle('on', x === s);
    o.onChoose && o.onChoose(s);
  }

  const io = new IntersectionObserver(([en]) => { const vis = en.isIntersecting; if (vis && !running) { running = true; last = performance.now(); raf = requestAnimationFrame(frame); } else if (!vis) running = false; });
  io.observe(el);
  document.addEventListener('visibilitychange', () => { if (document.hidden) running = false; else if (!running) { running = true; last = performance.now(); raf = requestAnimationFrame(frame); } });

  return {
    stars, by, cam, goal,
    zoom(f) { goal.D = clamp(goal.D * f, lim.Dmin, lim.Dmax); },
    reset() { goal.D = o.cam?.D ?? 520; goal.yaw = cam.yaw; goal.pitch = o.cam?.pitch ?? 0; focus = null; track = true; setTimeout(() => { track = false; }, 900); for (const x of stars) x.el.classList.remove('on'); },
    clear() { focus = null; track = false; goal.tx = goal.ty = goal.tz = 0; goal.D = o.cam?.D ?? 520; for (const x of stars) x.el.classList.remove('on'); },
    wander(on) { el.classList.toggle('full', on); el.style.touchAction = on ? 'none' : 'pan-y'; document.documentElement.classList.toggle('lock', on); goal.tx = goal.ty = goal.tz = 0; if (on) goal.D = Math.max(goal.D, (o.cam?.D ?? 520) * 1.35); else { goal.D = o.cam?.D ?? 520; goal.pitch = o.cam?.pitch ?? 0; } },
  };
}

// a seeded scatter on a sphere shell, flattened to suit a tall phone screen
export function shell(list, r0, r1, seed = 1, squash = [1, 1.25, 1]) {
  const n = list.length, ga = Math.PI * (3 - Math.sqrt(5));
  list.forEach((s, i) => {
    const y = 1 - (i + 0.5) / n * 2, rad = Math.sqrt(1 - y * y), th = ga * i + seed;
    const r = r0 + (r1 - r0) * rnd(seed * 17 + i);
    s.x = Math.cos(th) * rad * r * squash[0]; s.y = y * r * squash[1]; s.z = Math.sin(th) * rad * r * squash[2];
  });
}
export { rnd };
