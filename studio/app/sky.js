// Home's sky (app.js, home): a map of DOM stars and drawn ties, made for a phone and a thumb.
// One finger moves it sideways (up and down scrolls the page), two fingers zoom, a tap turns to a star and asks the page
// for its card. Every star keeps a face (or a work's picture) at a size you can read, and its name beneath, as long as the
// name fits without lying on another; the labels that don't fit wait until you come closer. It draws only while something
// moves (a touch, its glide, a zoom, a turn to a star); at rest the sky costs nothing.

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rnd = s => { let x = Math.sin(s * 999.7) * 43758.5453; return x - Math.floor(x); };
const hash = str => [...str].reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 7);

export function sky(el, o) {
  const stars = o.stars.map(s => ({ x: 0, y: 0, z: 0, ...s }));
  const by = Object.fromEntries(stars.map(s => [s.id, s]));
  const ties = [], partners = new Map();
  const link = ([a, b, how]) => {
    if (!by[a] || !by[b]) return;
    ties.push({ a: by[a], b: by[b], how, bow: (rnd(hash(a + b)) - 0.5) * 2 });
    for (const [x, y] of [[a, b], [b, a]]) { if (!partners.has(x)) partners.set(x, new Set()); partners.get(x).add(y); }
  };
  o.ties.forEach(link);

  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const F = o.F || 560, D0 = o.D || 560, lim = { Dmin: 230, Dmax: 2400, ...o.limits };
  const cam = { D: D0, tx: 0, ty: 0 }, goal = { D: D0, tx: 0, ty: 0 };
  if (o.intro && !calm) cam.D *= o.intro;
  const born = performance.now();
  let last = born, raf = 0, running = false, W = 0, H = 0, DPR = 1, vx = 0, vy = 0, drag = false, focus = null, focusNear = new Set(), ext = { x: 400, y: 500 };

  el.classList.add('sky');
  el.innerHTML = `<canvas class="sky-g" aria-hidden="true"></canvas><div class="sky-stars"></div>`;
  const cv = el.querySelector('canvas'), ctx = cv.getContext('2d'), box = el.querySelector('.sky-stars');
  const ink = o.inks || { tie: '#565B95', maybe: '#8F93C2' };

  const drawStar = s => {
    const d = document.createElement('button'); d.type = 'button';
    d.className = `star k-${s.kind} r${s.ring}${s.img ? ' has-img' : ''}${s.real ? ' real' : ''}`;
    d.innerHTML = o.node(s); d.dataset.id = s.id;
    d.setAttribute('aria-label', [s.name, s.kindName, s.sub, s.note].filter(Boolean).join(', '));
    d.style.setProperty('--d', (s.d || 46) + 'px');
    box.append(d); s.el = d; s.lab = null;
  };
  stars.forEach(drawStar);
  const measure = () => {                       // how far the stars reach, for the edges of the pan and the widest view
    ext = { x: Math.max(200, ...stars.map(s => Math.abs(s.x))), y: Math.max(260, ...stars.map(s => Math.abs(s.y))) };
  };
  measure();
  const kPlane = D => F / D * (W / 390);        // pixels per unit on the plane the stars lie near
  const widest = () => clamp(F * (W / 390) / Math.min((W / 2 - 34) / ext.x, (H * 0.42) / ext.y), D0 * 1.2, lim.Dmax);
  const bound = () => { goal.tx = clamp(goal.tx, -ext.x * 0.95, ext.x * 0.95); goal.ty = clamp(goal.ty, -ext.y * 0.95, ext.y * 0.95); };

  const size = () => { W = el.clientWidth; H = el.clientHeight; DPR = Math.min(devicePixelRatio || 1, 2); cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR); wake(); };
  new ResizeObserver(size).observe(el);

  function project(p) {
    const depth = cam.D + p.z, k = F / Math.max(depth, 1) * (W / 390);
    return { x: W / 2 + (p.x - cam.tx) * k, y: H * (o.cy || 0.5) + (p.y - cam.ty) * k, k, depth, behind: depth < 40 };
  }

  const hit = (a, b) => a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0;
  let order = [];
  function frame(now) {
    const dt = Math.min(64, now - last) / 16.67; last = now;
    if (!drag && (Math.abs(vx) > 0.02 || Math.abs(vy) > 0.02)) {                 // the glide after a flick
      goal.tx += vx * dt; goal.ty += vy * dt; bound(); cam.tx = goal.tx; cam.ty = goal.ty;
      vx *= 0.93 ** dt; vy *= 0.93 ** dt;
    } else if (!drag) { vx = vy = 0; }
    const e = (o.ease ?? 0.14) * dt, ee = Math.min(1, e);
    cam.D += (goal.D - cam.D) * ee;
    if (!(!drag && (vx || vy))) { cam.tx += (goal.tx - cam.tx) * Math.min(1, ee * 1.1); cam.ty += (goal.ty - cam.ty) * Math.min(1, ee * 1.1); }

    const k0 = F / D0 * (W / 390), fogTop = o.fog ?? 1700, top = o.top ?? 64, bottom = o.bottom ?? 70;
    for (const s of stars) {
      const q = project(s); s.q = q;
      const fog = clamp(1 - (q.depth - cam.D) / fogTop, 0, 1);
      s.op = q.behind ? 0 : o.minOp + (1 - o.minOp) * fog;
      s.sc = clamp(q.k / k0, o.minScale ?? 0.5, o.maxScale ?? 2.3);
    }
    // names: the nearest and most yours first; a name stays only if its words fit clear of every name and face placed before it
    order = stars.slice().sort((a, b) => ((a === focus ? 0 : focusNear.has(a) ? 1 : 2 + a.ring) - (b === focus ? 0 : focusNear.has(b) ? 1 : 2 + b.ring)) || a.q.depth - b.q.depth);
    const placed = [];
    for (const s of order) {
      const q = s.q, r = (s.d || 46) / 2 * s.sc, onScreen = q.x > -30 && q.x < W + 30 && q.y > top - 10 && q.y < H - bottom + 20 && s.op > 0.3;
      const lw = Math.min(s.lw || 120, 160), lx0 = q.x - lw / 2, ly0 = q.y + r + 3;
      const lab = { x0: lx0, x1: lx0 + lw, y0: ly0, y1: ly0 + 34 };
      const inside = lab.x0 >= 3 && lab.x1 <= W - 3;
      let show = onScreen && (s === focus || (inside && !placed.some(p => hit(p, lab))));
      if (show) placed.push(lab);
      placed.push({ x0: q.x - r, x1: q.x + r, y0: q.y - r, y1: q.y + r });
      if (s.lab !== show) { s.lab = show; s.el.classList.toggle('named', show); }
    }
    for (const s of stars) {
      const q = s.q, sc = s.sc;
      s.el.style.transform = `translate3d(${q.x.toFixed(1)}px,${q.y.toFixed(1)}px,0) scale(${sc.toFixed(3)})`;
      s.el.style.setProperty('--inv', (1 / sc).toFixed(3));
      s.el.style.opacity = s.op.toFixed(3);
      s.el.style.zIndex = String(10000 - Math.round(q.depth));
      const dim = !!focus && s !== focus && !focusNear.has(s);
      if (s.dim !== dim) { s.dim = dim; s.el.classList.toggle('dim', dim); }
      s.el.style.pointerEvents = s.op > 0.25 ? '' : 'none';
    }
    const grow = calm ? 1 : clamp((now - born - 300) / 1800, 0, 1);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0); ctx.clearRect(0, 0, W, H);
    if (o.extra) o.extra(ctx, project, cam);
    ctx.lineCap = 'round';
    for (const t of ties) {
      const a = t.a.q, b = t.b.q;
      if (a.behind || b.behind) continue;
      if ((a.x < -60 && b.x < -60) || (a.x > W + 60 && b.x > W + 60) || (a.y < -60 && b.y < -60) || (a.y > H + 60 && b.y > H + 60)) continue;
      const lit = !focus || t.a === focus || t.b === focus;
      if (t.how === 'maybe' && !(focus && lit) && Math.hypot(b.x - a.x, b.y - a.y) > 230) continue;     // the far, faint ties only when short, or when they are the chosen star's
      const alpha = Math.min(t.a.op, t.b.op) ** 1.5 * (t.how === 'maybe' ? 0.8 : 1) * (lit ? 1 : 0.22);
      if (alpha < 0.02) continue;
      const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2, dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1;
      const bow = t.bow * len * (o.bow ?? 0.1), cx = mx - dy / len * bow, cy = my + dx / len * bow;
      const w = clamp(Math.min(a.k, b.k) * (o.ink ?? 1.4), 0.7, 2.4), maybe = t.how === 'maybe';
      ctx.strokeStyle = maybe ? ink.maybe : ink.tie;
      ctx.setLineDash(maybe ? [1.5, 4.5] : grow < 1 ? [len * 1.1 * grow, len * 2] : []);
      for (const [off, wk, ak] of [[0, 1, .9], [0.7, .55, .35]]) {            // the line, and the pencil's second pass beside it
        const ox = -dy / len * off, oy = dx / len * off;
        ctx.globalAlpha = alpha * ak; ctx.lineWidth = w * wk;
        ctx.beginPath(); ctx.moveTo(a.x + ox, a.y + oy); ctx.quadraticCurveTo(cx + ox * 1.6, cy + oy * 1.6, b.x + ox, b.y + oy); ctx.stroke();
      }
    }
    ctx.globalAlpha = 1; ctx.setLineDash([]);
    // only while something moves: a touch, its glide, a zoom, a turn to a star, the opening; then the sky rests
    const still = !drag && !pts.size && !vx && !vy && Math.abs(goal.D - cam.D) < 0.4 && Math.abs(goal.tx - cam.tx) < 0.25 && Math.abs(goal.ty - cam.ty) < 0.25 && grow >= 1;
    if (still) { cam.D = goal.D; cam.tx = goal.tx; cam.ty = goal.ty; }
    raf = running && !still ? requestAnimationFrame(frame) : 0;
    if (still && o.onRest) o.onRest(cam);
  }
  function wake() { if (running && !raf) { last = performance.now(); raf = requestAnimationFrame(frame); } }

  // --- gestures: one finger moves, two zoom ---
  let raf0 = 0; void raf0;
  const pts = new Map(); let start = null, pinch0 = 0, Dp = D0, mid0 = null, moved = 0, lastTap = 0;
  el.style.touchAction = 'pan-y';                 // a vertical swipe scrolls the page; a clearly sideways drag moves the sky; two fingers zoom
  const zoomAt = (f, sx, sy) => {                 // keep the point under (sx, sy) still while the zoom changes
    const D1 = clamp(goal.D * f, lim.Dmin, widest()), k1 = kPlane(goal.D), k2 = kPlane(D1);
    const r = el.getBoundingClientRect(), px = sx - r.left - W / 2, py = sy - r.top - H * (o.cy || 0.5);
    goal.tx += px / k1 - px / k2; goal.ty += py / k1 - py / k2; goal.D = D1; bound(); wake();
  };
  el.addEventListener('pointerdown', e => {
    wake(); o.onTouch && o.onTouch();
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pts.size === 1) { start = { x: e.clientX, y: e.clientY, t: performance.now(), id: e.target.closest('.star')?.dataset.id }; moved = 0; drag = true; vx = vy = 0; }
    if (pts.size === 2) { const [p, q] = [...pts.values()]; pinch0 = Math.hypot(p.x - q.x, p.y - q.y); Dp = goal.D; mid0 = { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2, tx: goal.tx, ty: goal.ty }; }
    try { el.setPointerCapture(e.pointerId); } catch {}
  });
  el.addEventListener('pointermove', e => {
    const p = pts.get(e.pointerId); if (!p) return; wake();
    const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY; moved += Math.abs(dx) + Math.abs(dy);
    if (pts.size === 2) {
      const [a, b] = [...pts.values()], d = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinch0) goal.D = clamp(Dp * pinch0 / d, lim.Dmin, widest());
      if (mid0) { const k = kPlane(goal.D), mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2; goal.tx = mid0.tx - (mx - mid0.x) / k; goal.ty = mid0.ty - (my - mid0.y) / k; bound(); }
      cam.D += (goal.D - cam.D) * 0.5;
      return;
    }
    if (moved < 6) return;                       // a tap is not a drag
    const k = kPlane(cam.D);
    goal.tx -= dx / k; goal.ty -= dy / k; bound(); cam.tx = goal.tx; cam.ty = goal.ty;
    vx = vx * 0.5 - dx / k * 0.5; vy = vy * 0.5 - dy / k * 0.5;
  });
  const end = e => {
    if (!pts.has(e.pointerId)) return;
    pts.delete(e.pointerId);
    if (pts.size === 0) {
      drag = false;
      const tap = start && moved < 10 && performance.now() - start.t < 450;
      if (tap && start.id) choose(by[start.id]);
      else if (tap) {
        const now = performance.now();
        if (now - lastTap < 380) { zoomAt(goal.D > D0 * 0.8 ? 0.6 : 1 / 0.6, e.clientX, e.clientY); lastTap = 0; }
        else { lastTap = now; if (focus) setTimeout(() => { if (lastTap && performance.now() - lastTap > 340) clear(true); }, 360); }
      }
      start = null; wake();
    }
    if (pts.size < 2) { pinch0 = 0; mid0 = null; }
  };
  for (const g of ['gesturestart', 'gesturechange']) el.addEventListener(g, e => e.preventDefault());   // Safari's own pinch would zoom the page
  el.addEventListener('pointerup', end);
  el.addEventListener('pointercancel', e => { pts.delete(e.pointerId); if (!pts.size) { drag = false; start = null; wake(); } });
  el.addEventListener('wheel', e => { if (!e.ctrlKey) return; e.preventDefault(); o.onTouch && o.onTouch(); zoomAt(Math.exp(e.deltaY * 0.01), e.clientX, e.clientY); }, { passive: false });   // a trackpad pinch zooms; a plain wheel scrolls the page
  el.addEventListener('keydown', e => { const s = e.target.closest?.('.star'); if (s && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); choose(by[s.dataset.id]); } });

  function choose(s, o2 = {}) {
    if (!s || s.kind === 'you') { clear(true); return; }
    const D1 = Math.min(goal.D, o.focusD ?? 420), k1 = F / (D1 + s.z) * (W / 390);
    goal.D = Math.max(D1, lim.Dmin); goal.tx = s.x; goal.ty = s.y + ((o.cy || 0.5) - (o.pickY ?? 0.34)) * H / k1; bound(); vx = vy = 0;
    focus = s; focusNear = partners.get(s.id) ? new Set([...partners.get(s.id)].map(i => by[i])) : new Set();
    for (const x of stars) x.el.classList.toggle('on', x === s);
    if (!o2.quiet) o.onChoose && o.onChoose(s); wake();
  }
  function clear(call) {
    focus = null; focusNear = new Set(); for (const x of stars) x.el.classList.remove('on');
    if (call && o.onChoose) o.onChoose(null); wake();
  }

  const io = new IntersectionObserver(([en]) => { running = en.isIntersecting && !document.hidden; if (running) wake(); });
  io.observe(el);
  document.addEventListener('visibilitychange', () => { running = !document.hidden && el.isConnected; if (running) wake(); });
  size();

  return {
    stars, by, cam, goal,
    // more stars (each with its x, y, z) and ties, after the sky is up
    add(more, moreTies = []) {
      for (const s of more) { if (by[s.id]) continue; const x = { x: 0, y: 0, z: 0, ...s }; by[x.id] = x; stars.push(x); drawStar(x); }
      moreTies.forEach(link); measure(); wake();
    },
    zoom(f) { goal.D = clamp(goal.D * f, lim.Dmin, widest()); wake(); },
    home() { clear(true); goal.D = D0; goal.tx = goal.ty = 0; vx = vy = 0; wake(); },
    // the sky's neighbours of a star: what it is tied to, then whoever shares its city or craft
    neighbors(s) {
      const near = [...(partners.get(s.id) || [])].map(i => by[i]);
      const kin = stars.filter(x => x !== s && !near.includes(x) && x.tags && s.tags && x.tags.some(t => s.tags.includes(t)));
      return [...near, ...kin];
    },
    choose, clear, get focus() { return focus; }, wide() { return widest(); },
  };
}

export { rnd };
