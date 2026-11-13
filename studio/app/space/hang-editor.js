// The hang editor: inside the walkable room, the artist adds and takes out works, drags each one along the wall (it
// snaps to a common line, to its neighbours and to the wall's middle), lines them up, spaces them evenly, stands plinths
// on the floor with objects on them, and undoes. Every change is saved as it is made (onSave) and is what the show
// is hung from: placements per work { wall, a, y } (a: metres along the wall, y: height of the work's middle) and
// plinths { id, x, z, size: 's' | 'm' | 'l', work }.
// Works with touch and mouse: one finger drags a work or a plinth, a drag on the empty wall looks around, two fingers
// pinch to zoom (all the viewer's own).
import { buildRoom, sizeOf, PLINTHS, PLINTH_LIMITS, plinthDims, STAND, isStand } from './synth.js';

const clone = o => JSON.parse(JSON.stringify(o));
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const cm = m => Math.round(m * 100);
const PNAME = { s: 'Small', m: 'Medium', l: 'Large' };
const SNAP = 0.06, GAP = 0.15;

// design: { title, room, paint, centre }; library: every work the artist has (id, title, image, thumb, width, height, kind);
// state: { ids, placements, plinths }; shape(work): the work as buildRoom wants it
export async function openHangEditor({ design, library, state, src, shape, openSpace, onSave, onExit }) {
  const st = { ids: (state.ids || []).slice(), placements: clone(state.placements || {}), plinths: clone(state.plinths || []) };
  const undo = [];
  let view = null, made = null, pose = null, ctl = null, outerSel = null, outerPlan = true, outerPop = st.ids.length || !library.length ? '' : 'add';   // an empty room opens on the artist's works: the first tap hangs one
  const byId = id => library.find(w => w.id === id);
  const sig = o => o.ids.join() + '|' + o.plinths.map(p => p.id + p.work + p.size + (p.colour || '') + (p.dims || '') + (p.kind || '') + (p.len || '') + (p.rot || '') + (isStand(p) ? p.x + ',' + p.z : '')).join();
  const save = () => onSave(clone(st));
  const push = pre => { undo.push(pre); if (undo.length > 40) undo.shift(); };

  async function build() {
    const was = sig(st);
    const m = await buildRoom({ ...design, works: st.ids.map(byId).filter(Boolean).map(shape), placements: st.placements, plinths: st.plinths, editing: true }, src);
    for (const [id, p] of Object.entries(m.placements)) if (!st.placements[id]) st.placements[id] = p;   // hung as the room would: now the artist's to move
    if (sig(st) === was) st.plinths = m.plinths;      // (a change made while the room was being drawn stays: the next drawing takes it)
    return m;
  }
  // (re)open the room on the current state, standing where the artist stood
  let opening = false, again = false;
  async function open() {
    if (opening) { again = true; return; }             // one drawing at a time; a change made meanwhile is drawn right after
    opening = true;
    try { await open1(); } finally { opening = false; }
    if (again) { again = false; outerSel = ctl && ctl.sel ? ctl.sel() : outerSel; await open(); }
  }
  async function open1() {
    const next = await build();
    const was = view, keepPose = ctl && ctl.api ? ctl.api.pose() : null;
    if (was) { was.close(); made.revoke(); }
    made = next; pose = keepPose;
    ctl = controller();
    view = await openSpace({ spec: made.spec, works: [], src: u => u, onClose: () => { made.revoke(); onExit(); }, editor: ctl, exitLabel: 'Done' });
    window.__spaceView = view; window.__he = ctl;
  }

  function controller() {
    let api = null, sel = outerSel, drag = null, tap = null, ui = null, pop = outerPop, noteT = 0, outline = null, guides = null, plan = false, pdrag = null;
    const builtStands = Object.fromEntries(st.plinths.filter(isStand).map(q => [q.id, { x: q.x, z: q.z, rot: q.rot, len: q.len }]));
    outerPop = '';
    const sizes = {}; made.spec.works.forEach(h => { sizes[h.id] = [h.measured[0] / 100, h.measured[1] / 100]; });
    const blocks = made.spec.blocks || {};
    const H = made.spec.room.height, W = made.spec.room.x1, D = made.spec.room.z1;
    const wallOf = name => api.surfaces.find(s => s.kind === 'wall' && s.name === name);
    const pieceOf = id => api.pieces.find(p => p.h.id === id);
    const plinthOf = id => api.plinths.find(q => q.id === id);
    const stPlinth = id => st.plinths.find(p => p.id === id);
    const stStands = () => st.plinths.filter(isStand);
    const V = a => new api.THREE.Vector3(...a);

    // --- where a screen point lands on the walls and the floor ---------------------------------------------------
    const rayAt = e => {
      const r = api.canvas.getBoundingClientRect();
      api.ray.setFromCamera({ x: (e.clientX - r.left) / r.width * 2 - 1, y: -(e.clientY - r.top) / r.height * 2 + 1 }, api.camera);
    };
    const wallRay = () => {
      const ro = api.ray.ray.origin, rd = api.ray.ray.direction; let best = null;
      for (const wl of api.surfaces.filter(s => s.kind === 'wall')) {
        const N = V(wl.normal), O = V(wl.origin), U = V(wl.u), den = rd.dot(N);
        if (den > -1e-4) continue;
        const t = O.clone().sub(ro).dot(N) / den; if (t < 0) continue;
        const p = ro.clone().addScaledVector(rd, t), a = p.clone().sub(O).dot(U);
        if (a < -0.01 || a > wl.size[0] + 0.01 || p.y < 0 || p.y > wl.size[1]) continue;
        if (!best || t < best.t) best = { wall: wl, a, y: p.y, t };
      }
      return best;
    };
    const floorRay = () => {
      const ro = api.ray.ray.origin, rd = api.ray.ray.direction; if (rd.y > -1e-4) return null;
      const t = -ro.y / rd.y; return { x: ro.x + rd.x * t, z: ro.z + rd.z * t };
    };
    const pick = e => {
      rayAt(e);
      const objs = [...api.pieces.map(p => p.mesh), ...api.plinths.flatMap(q => [q.box, ...(q.face ? q.face.children : [])])];
      const hit = api.ray.intersectObjects(objs, false)[0];
      if (!hit) {      // a finger is wider than a small work seen from across the room: the nearest work within a finger's reach
        const w = wallRay(); if (!w) return null;
        const m = Math.max(0.12, w.t * 0.035); let best = null;
        for (const id of onWall(w.wall.name)) {
          const q = st.placements[id], [sw, sh] = sizes[id], d = Math.hypot(Math.max(0, Math.abs(w.a - q.a) - sw / 2), Math.max(0, Math.abs(w.y - q.y) - sh / 2));
          if (d < m && (!best || d < best.d)) best = { d, id };
        }
        return best ? { k: 'work', id: best.id } : null;
      }
      const pl = hit.object.userData.plinth;
      if (pl) return { k: 'plinth', id: pl };
      const p = api.pieces.find(x => x.mesh === hit.object); return p ? { k: 'work', id: p.h.id } : null;
    };

    // --- snapping --------------------------------------------------------------------------------------------------
    const onWall = (name, but) => st.ids.filter(id => id !== but && st.placements[id] && st.placements[id].wall === name && sizes[id]);
    function constrain(wl, a, y, id) {
      const [w, h] = sizes[id], len = wl.size[0];
      const others = onWall(wl.name, id).map(o => ({ a: st.placements[o].a, y: st.placements[o].y, w: sizes[o][0], h: sizes[o][1] }));
      let gy = null, ga = null, best = SNAP;
      const tryY = (mine, target) => { const d = Math.abs(mine - target); if (d < best) { best = d; y += target - mine; gy = target; } };
      tryY(y, design.centre / 100);
      for (const o of others) { tryY(y, o.y); tryY(y + h / 2, o.y + o.h / 2); tryY(y - h / 2, o.y - o.h / 2); }
      best = SNAP;
      const tryA = (mine, target, line) => { const d = Math.abs(mine - target); if (d < best) { best = d; a += target - mine; ga = line == null ? target : line; } };
      tryA(a, len / 2);
      for (const o of others) {
        tryA(a, o.a); tryA(a - w / 2, o.a - o.w / 2); tryA(a + w / 2, o.a + o.w / 2);
        tryA(a - w / 2, o.a + o.w / 2 + GAP, o.a + o.w / 2); tryA(a + w / 2, o.a - o.w / 2 - GAP, o.a - o.w / 2);
      }
      a = Math.max(w / 2, Math.min(len - w / 2, a));
      y = Math.max(h / 2 + 0.1, Math.min(wl.size[1] - h / 2 - 0.1, y));
      for (const [b0, b1] of blocks[wl.name] || []) {      // not over a window, glass or the door
        if (a + w / 2 > b0 && a - w / 2 < b1) { a = (a < (b0 + b1) / 2) ? b0 - w / 2 : b1 + w / 2; ga = null; }
      }
      a = Math.max(w / 2, Math.min(len - w / 2, a));
      return { a, y, ga, gy };
    }
    function freeSpot(wl, a, w, strict) {
      const iv = [...onWall(wl.name).map(o => [st.placements[o].a - sizes[o][0] / 2 - GAP, st.placements[o].a + sizes[o][0] / 2 + GAP]), ...(blocks[wl.name] || [])];
      for (let k = 0; k < 80; k++) for (const s of k ? [1, -1] : [1]) {
        const x = a + s * k * 0.2;
        if (x - w / 2 < 0.05 || x + w / 2 > wl.size[0] - 0.05) continue;
        if (!iv.some(([i0, i1]) => x + w / 2 > i0 && x - w / 2 < i1)) return x;
      }
      return strict ? null : Math.max(w / 2, Math.min(wl.size[0] - w / 2, a));
    }
    function constrainPlinth(x, z, id) {
      const q = stPlinth(id), [pw, pd] = plinthDims(q);
      x = Math.round(x * 20) / 20; z = Math.round(z * 20) / 20;
      let bx = SNAP, bz = SNAP, sx = x, sz = z;
      for (const o of st.plinths) if (o.id !== id && !o.kind) { if (Math.abs(o.x - x) < bx) { bx = Math.abs(o.x - x); sx = o.x; } if (Math.abs(o.z - z) < bz) { bz = Math.abs(o.z - z); sz = o.z; } }
      if (Math.abs(W / 2 - x) < SNAP) sx = W / 2; if (Math.abs(D / 2 - z) < SNAP) sz = D / 2;
      return { x: Math.max(pw / 200 + 0.4, Math.min(W - pw / 200 - 0.4, sx)), z: Math.max(pd / 200 + 0.4, Math.min(D - pd / 200 - 0.4, sz)) };
    }

    // --- drawing the selection and the guides ------------------------------------------------------------------------
    function mark() {
      if (outline) { outline.parent && outline.parent.remove(outline); outline.geometry.dispose(); outline = null; }
      if (!sel) return;
      const T = api.THREE; let g, parent, y = 0;
      if (sel.k === 'work') { const p = pieceOf(sel.id); if (!p) return; const [w, h] = sizes[sel.id]; g = new T.BoxGeometry(w + 0.05, h + 0.05, 0.07); parent = p.g; }
      else if (sel.k === 'stand') { const b = (api.stands || []).find(x => x.id === sel.id); if (!b) return; g = new T.BoxGeometry(b.spec.len + 0.04, b.spec.h + 0.04, b.spec.t + 0.04); parent = b.group; y = b.spec.h / 2; }
      else { const q = plinthOf(sel.id); if (!q) return; const [w, d, h] = q.spec.size.map(v => v / 100); g = new T.BoxGeometry(w + 0.03, h + 0.03, d + 0.03); parent = q.group; y = h / 2; }
      outline = new T.LineSegments(new T.EdgesGeometry(g), new T.LineBasicMaterial({ color: 0xe0533a, depthTest: false, transparent: true }));
      outline.renderOrder = 999; outline.position.y = y; parent.add(outline); g.dispose(); api.dirty();
    }
    function guide(wl, ga, gy) {
      const T = api.THREE;
      if (!guides) { guides = [0, 1].map(() => { const l = new T.Line(new T.BufferGeometry().setFromPoints([new T.Vector3(), new T.Vector3()]), new T.LineBasicMaterial({ color: 0xe0533a, depthTest: false, transparent: true, opacity: 0.8 })); l.renderOrder = 998; l.frustumCulled = false; api.scene.add(l); return l; }); }
      const [v, h] = guides;
      v.visible = !!wl && ga != null; h.visible = !!wl && gy != null;
      if (!wl) { api.dirty(); return; }
      const O = V(wl.origin), U = V(wl.u), N = V(wl.normal).multiplyScalar(0.012);
      if (v.visible) v.geometry.setFromPoints([O.clone().addScaledVector(U, ga).add(N).setY(0), O.clone().addScaledVector(U, ga).add(N).setY(H)]);
      if (h.visible) h.geometry.setFromPoints([O.clone().add(N).setY(gy), O.clone().addScaledVector(U, wl.size[0]).add(N).setY(gy)]);
      api.dirty();
    }

    // --- moving ---------------------------------------------------------------------------------------------------------
    function putWork(id, wl, a, y) { api.movePiece(pieceOf(id), wl, a, y); st.placements[id] = { wall: wl.name, a: +a.toFixed(3), y: +y.toFixed(3) }; }
    function putPlinth(id, x, z) { const q = stPlinth(id); q.x = +x.toFixed(3); q.z = +z.toFixed(3); api.movePlinth(plinthOf(id), x, z); }
    function select(s) { sel = s; if (s && s.k === 'stand' && !plan) pop = 'stand'; else if (pop === 'stand' || pop === 'plinth') pop = ''; if (s && api.root.querySelector('.sv-hint')) api.root.querySelector('.sv-hint').style.opacity = 0; mark(); refresh(); }

    function pointer(type, e) {
      if (type === 'down') {
        if (drag) return true;                                // a second finger: the viewer's own pinch must not start under a drag
        const hit = pick(e);
        if (!hit) { tap = { id: e.pointerId, x: e.clientX, y: e.clientY }; return false; }
        select(hit);
        const pre = clone(st); rayAt(e);
        if (hit.k === 'work') { const w = wallRay(), pl = st.placements[hit.id]; drag = { ...hit, pid: e.pointerId, pre, moved: 0, x: e.clientX, y: e.clientY, off: w && w.wall.name === pl.wall ? [w.a - pl.a, w.y - pl.y] : [0, 0], wall: pl.wall }; }
        else { const f = floorRay(), q = stPlinth(hit.id); drag = { ...hit, pid: e.pointerId, pre, moved: 0, x: e.clientX, y: e.clientY, off: f ? [f.x - q.x, f.z - q.z] : [0, 0] }; }
        return true;
      }
      if (type === 'move') {
        if (!drag) return false;
        if (e.pointerId !== drag.pid) return true;
        drag.moved += Math.abs(e.clientX - drag.x) + Math.abs(e.clientY - drag.y); drag.x = e.clientX; drag.y = e.clientY;
        if (drag.moved < 5) return true;
        rayAt(e);
        if (drag.k === 'work') {
          const w = wallRay(); if (!w) return true;
          const same = w.wall.name === drag.wall, r = constrain(w.wall, w.a - (same ? drag.off[0] : 0), w.y - (same ? drag.off[1] : 0), drag.id);
          putWork(drag.id, w.wall, r.a, r.y); guide(w.wall, r.ga, r.gy);
        } else {
          const f = floorRay(); if (!f) return true;
          const r = constrainPlinth(f.x - drag.off[0], f.z - drag.off[1], drag.id); putPlinth(drag.id, r.x, r.z);
        }
        refresh(); return true;
      }
      if (type === 'up') {
        if (!drag) {
          if (tap && tap.id === e.pointerId && Math.abs(e.clientX - tap.x) + Math.abs(e.clientY - tap.y) < 8) {
            rayAt(e); const w = wallRay(), sid = w && w.wall.stand;        // a tap on a standing wall chooses it; on anything else lets go
            if (sid && !(sel && sel.k === 'stand' && sel.id === sid)) select({ k: 'stand', id: sid }); else if (sel) select(null);
          }
          tap = null; return false;
        }
        if (e.pointerId !== drag.pid) return true;
        if (drag.moved >= 5) { push(drag.pre); save(); }
        guide(null); drag = null; return true;
      }
      return false;
    }

    // --- the tools --------------------------------------------------------------------------------------------------------
    // where a new thing goes: a few steps ahead of the artist, or, on the plan, the middle of the room
    const centreAhead = () => plan ? { f: new api.THREE.Vector3(0, 0, 1e-6), p: new api.THREE.Vector3(W / 2, 0, D / 2) } : { f: api.camera.getWorldDirection(new api.THREE.Vector3()), p: api.camera.position };
    function note(t) { clearTimeout(noteT); pop = ''; ui.pop.hidden = false; ui.pop.innerHTML = `<p class="he-note">${esc(t)}</p>`; noteT = setTimeout(() => { if (!pop) ui.pop.hidden = true; }, 2600); }
    async function addWork(id) {
      const w = byId(id); if (!w) return;
      const pre = clone(st); let turn = null, near = null;
      if (w.kind === 'object') {
        let q = sel && sel.k === 'plinth' ? stPlinth(sel.id) : null; if (q && q.work) q = null;
        if (q) q.work = id;
        else { const { f, p } = centreAhead(); st.plinths.push({ id: 'p-' + id, x: p.x + f.x * 2.2, z: p.z + f.z * 2.2, size: 'm', work: id }); }
        st.ids.push(id);
      } else {
        const sz = await sizeOf(shape(w), src), ww = sz.w / 100;
        api.ray.setFromCamera({ x: 0, y: 0 }, api.camera);
        let hw = wallRay() || { wall: api.surfaces.find(s => s.kind === 'wall'), a: 2 };
        if (plan) {      // on the plan: the longest wall of the room that has room, then the standing walls
          const walls = api.surfaces.filter(s => s.kind === 'wall').sort((p, q) => (p.stand ? 1 : 0) - (q.stand ? 1 : 0) || q.size[0] - p.size[0]);
          const wl = walls.find(s => freeSpot(s, s.size[0] / 2, ww, true) != null) || walls[0];
          hw = { wall: wl, a: wl.size[0] / 2 };
        }
        let a = freeSpot(hw.wall, hw.a, ww, true);
        if (a == null && !plan) {      // the wall looked at has no room (it is glass, or full): the nearest wall facing the artist that has
          const cam = api.camera.position, mid = s => V(s.origin).addScaledVector(V(s.u), s.size[0] / 2);
          const others = api.surfaces.filter(s => s.kind === 'wall' && s !== hw.wall && V(s.normal).dot(cam.clone().sub(mid(s))) > 0).sort((p, q) => mid(p).distanceTo(cam) - mid(q).distanceTo(cam));
          for (const s of others) { const x = freeSpot(s, s.size[0] / 2, ww, true); if (x != null) { hw.wall = s; a = x; turn = mid(s).addScaledVector(V(s.u), x - s.size[0] / 2).setY(design.centre / 100).toArray(); break; } }
        }
        if (a == null) a = freeSpot(hw.wall, hw.a, ww);
        // hung far from where the artist stands (a large room on a phone: the work would be a speck): stand in front of it
        const spot = V(hw.wall.origin).addScaledVector(V(hw.wall.u), a).setY(design.centre / 100);
        if (!plan && spot.distanceTo(api.camera.position) > 5.5) { near = spot.clone().addScaledVector(V(hw.wall.normal), Math.max(2.8, ww * 1.4 + 1.4)).setY(api.EYE).toArray(); turn = spot.toArray(); }
        st.ids.push(id); st.placements[id] = { wall: hw.wall.name, a: +a.toFixed(3), y: design.centre / 100 };
      }
      push(pre); save(); sel = { k: w.kind === 'object' ? 'plinth' : 'work', id: w.kind === 'object' ? 'p-' + id : id }; pop = ''; outerSel = sel; await open();
      // hung somewhere else than where the artist looked, or far away: turn to it, and walk up to it
      if (turn && ctl && ctl.api) ctl.api.setPose(near ? ctl.api.clamp(V(near)).toArray() : ctl.api.pose().at, turn);
    }
    async function removeSel() {
      if (!sel) return; const pre = clone(st);
      if (sel.k === 'work') { st.ids = st.ids.filter(i => i !== sel.id); delete st.placements[sel.id]; }
      else if (sel.k === 'stand') {      // its works go back to the room's walls; the last one taken away stays away
        st.plinths = st.plinths.filter(p => p.id !== sel.id);
        for (const id of st.ids) if (st.placements[id] && st.placements[id].wall.startsWith(sel.id + '-')) delete st.placements[id];
        if (!stStands().length && !st.plinths.some(p => p.kind === 'no-stands')) st.plinths.push({ id: 'no-stands', kind: 'no-stands' });
      }
      else { const q = stPlinth(sel.id); if (q && q.work) st.ids = st.ids.filter(i => i !== q.work); st.plinths = st.plinths.filter(p => p.id !== sel.id); }
      push(pre); save(); sel = null; pop = ''; outerSel = sel; await open();
    }
    async function sizePlinth(k) {
      const pre = clone(st);
      if (sel && sel.k === 'plinth') { const q = stPlinth(sel.id); q.size = k; delete q.dims; }
      else { const { f, p } = centreAhead(), id = 'p-' + Math.random().toString(36).slice(2, 8); st.plinths.push({ id, x: p.x + f.x * 2.2, z: p.z + f.z * 2.2, size: k, work: null }); sel = { k: 'plinth', id }; }
      push(pre); save(); pop = ''; outerSel = sel; await open();
    }
    // a change to a plinth's measures or to a standing wall: the room is drawn again a moment after the last tap
    let later = 0, laterPre = null;
    function soon(pre) {
      if (!laterPre) laterPre = pre;
      clearTimeout(later); refresh();
      later = setTimeout(async () => { push(laterPre); laterPre = null; save(); outerSel = sel; outerPop = pop; await open(); }, 700);
    }
    function dimPlinth(i, by) {
      const q = sel && sel.k === 'plinth' && stPlinth(sel.id); if (!q) return;
      const pre = clone(st), d = plinthDims(q).slice(), lim = [PLINTH_LIMITS.w, PLINTH_LIMITS.d, PLINTH_LIMITS.h][i];
      d[i] = Math.max(lim[0], Math.min(lim[1], d[i] + by)); q.dims = d;
      const b = plinthOf(q.id);                              // at once: the box takes the new measures (the object on it follows when the room is drawn again)
      if (b) { const o = b.spec.size; b.box.scale.set(d[0] / o[0], d[2] / o[2], d[1] / o[1]); b.box.position.y = d[2] / 200; if (b.face) b.face.position.y += (d[2] - (b.shownH || o[2])) / 100; b.shownH = d[2]; api.dirty(); }
      soon(pre);
    }
    async function colourPlinth(k) {
      const q = sel && sel.k === 'plinth' && stPlinth(sel.id); if (!q) return;
      const pre = clone(st); if (k) q.colour = k; else delete q.colour;
      push(pre); save(); outerSel = sel; outerPop = pop; await open();
    }
    function addStand() {
      const pre = clone(st), { f, p } = centreAhead(), id = 'stand-' + Math.random().toString(36).slice(2, 8);
      // across the way the artist is looking, a few steps ahead
      const rot = Math.abs(f.x) > Math.abs(f.z) ? 90 : 0;
      st.plinths = st.plinths.filter(q => q.kind !== 'no-stands');
      st.plinths.push({ id, kind: 'stand', x: +(p.x + f.x * 4).toFixed(2), z: +(p.z + f.z * 4).toFixed(2), len: 3, rot });
      sel = { k: 'stand', id }; pop = 'stand'; soon(pre);
    }
    function editStand(what, by) {
      const q = sel && sel.k === 'stand' && stPlinth(sel.id); if (!q) return;
      const pre = clone(st);
      if (what === 'len') q.len = +Math.max(STAND.len[0], Math.min(STAND.len[1], q.len + by * STAND.step)).toFixed(2);
      else if (what === 'rot') q.rot = (((q.rot + by * STAND.turn) % 180) + 180) % 180;
      else if (what === 'side' || what === 'away') {     // as the artist sees it: to the right, or further away, along the room's nearer axis
        const { f } = centreAhead(), alongX = Math.abs(f.x) > Math.abs(f.z), fwd = alongX ? [Math.sign(f.x), 0] : [0, Math.sign(f.z)], right = [-fwd[1], fwd[0]];
        const d = what === 'away' ? fwd : right;
        q.x = +Math.max(0.6, Math.min(W - 0.6, q.x + d[0] * by * 0.25)).toFixed(2); q.z = +Math.max(0.6, Math.min(D - 0.6, q.z + d[1] * by * 0.25)).toFixed(2);
      }
      else if (what === 'here') { const { f, p } = centreAhead(); q.x = +(p.x + f.x * 4).toFixed(2); q.z = +(p.z + f.z * 4).toFixed(2); }
      // at once, roughly: the wall's body moves and turns (its faces and works follow when the room is drawn again)
      const b = (api.stands || []).find(x => x.id === q.id);
      if (b) {
        b.group.position.set(q.x, 0, q.z); b.group.rotation.y = -q.rot * Math.PI / 180; b.body.scale.x = q.len / b.spec.len;
        api.scene.traverse(o => { if (o.userData.kind === 'wall' && o.userData.stand === q.id) o.visible = false; });
        for (const p of api.pieces) { const pl = st.placements[p.h.id]; if (pl && pl.wall.startsWith(q.id + '-')) p.g.visible = false; }
        mark(); api.dirty();
      }
      soon(pre); drawPlan();
    }
    function lineUp(mode) {
      if (!sel || sel.k !== 'work') return;
      const pre = clone(st), ref = st.placements[sel.id], [, rh] = sizes[sel.id], wl = wallOf(ref.wall);
      const line = mode === 'c' ? ref.y : mode === 't' ? ref.y + rh / 2 : ref.y - rh / 2;
      for (const id of [sel.id, ...onWall(ref.wall, sel.id)]) {
        const h = sizes[id][1], y = mode === 'c' ? line : mode === 't' ? line - h / 2 : line + h / 2;
        putWork(id, wl, st.placements[id].a, Math.max(h / 2 + 0.1, Math.min(wl.size[1] - h / 2 - 0.1, y)));
      }
      push(pre); save(); pop = ''; ui.pop.hidden = true; refresh();
    }
    function even() {
      if (!sel || sel.k !== 'work') return;
      const wname = st.placements[sel.id].wall, wl = wallOf(wname), ids = [sel.id, ...onWall(wname, sel.id)].sort((p, q) => st.placements[p].a - st.placements[q].a);
      if (ids.length < 3) return note('Spacing needs three or more works on the same wall.');
      const left = st.placements[ids[0]].a - sizes[ids[0]][0] / 2, last = ids[ids.length - 1], right = st.placements[last].a + sizes[last][0] / 2;
      const total = ids.reduce((t, id) => t + sizes[id][0], 0), gap = (right - left - total) / (ids.length - 1);
      if (gap < 0.03) return note('The works are too close together to space evenly: take one off this wall first.');
      const pre = clone(st); let x = left;
      for (const id of ids) { putWork(id, wl, x + sizes[id][0] / 2, st.placements[id].y); x += sizes[id][0] + gap; }
      push(pre); save(); refresh(); note(`Spaced evenly, ${cm(gap)} cm between works.`);
    }
    async function doUndo() {
      const pre = undo.pop(); if (!pre) return note('Nothing to undo.');
      const same = sig(pre) === sig(st); Object.assign(st, pre); save();
      if (!same) { sel = null; outerSel = null; await open(); return; }
      for (const id of st.ids) { const p = st.placements[id]; if (p && pieceOf(id)) api.movePiece(pieceOf(id), wallOf(p.wall), p.a, p.y); }
      for (const p of st.plinths) if (!p.kind && plinthOf(p.id)) api.movePlinth(plinthOf(p.id), p.x, p.z);
      refresh();
    }


    // --- the plan: the room from above, drawn in lines, for placing things roughly before walking in ------------------------
    // Works are dragged to any wall (the room's or a standing wall's side), standing walls and plinths across the floor.
    // The same state as the room's: what is placed here is where it hangs when the artist walks in.
    let pv = null;                                            // the plan's view: scale, origin, turned or not
    const standStale = id => { const q = stPlinth(id), b = builtStands[id]; return !q || !b || q.rot !== b.rot || q.len !== b.len; };
    const standShift = id => { const q = stPlinth(id), b = builtStands[id]; return q && b ? [q.x - b.x, q.z - b.z] : [0, 0]; };
    const wallXZ = wl => {                                    // a wall's line on the floor: where it starts, its direction, its inward normal
      const [dx, dz] = wl.stand ? standShift(wl.stand) : [0, 0];
      return { ox: wl.origin[0] + dx, oz: wl.origin[2] + dz, ux: wl.u[0], uz: wl.u[2], nx: wl.normal[0], nz: wl.normal[2], len: wl.size[0] };
    };
    function planView() {
      const r = ui.svg.getBoundingClientRect(), pad = 34;
      const walls = api.surfaces.filter(s => s.kind === 'wall' && !s.stand);
      let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9;
      for (const wl of walls) for (const t of [0, wl.size[0]]) { const x = wl.origin[0] + wl.u[0] * t, z = wl.origin[2] + wl.u[2] * t; x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); }
      const rw = x1 - x0, rd = z1 - z0, turn = (r.height > r.width) !== (rd > rw);      // the long side of the room along the long side of the screen
      const pw = turn ? rd : rw, ph = turn ? rw : rd, k = Math.min((r.width - 2 * pad) / pw, (r.height - 2 * pad) / ph);
      const ox = (r.width - pw * k) / 2, oy = (r.height - ph * k) / 2;
      pv = { k, w: r.width, h: r.height, left: r.left, top: r.top, x0, x1, z0, z1, turn,
        to: (x, z) => turn ? [ox + (z1 - z) * k, oy + (x - x0) * k] : [ox + (x - x0) * k, oy + (z - z0) * k],
        from: (sx, sy) => turn ? [x0 + (sy - oy) / k, z1 - (sx - ox) / k] : [x0 + (sx - ox) / k, z0 + (sy - oy) / k],
        dir: (dx, dz) => turn ? [-dz, dx] : [dx, dz] };
      return pv;
    }
    function drawPlan() {
      if (!plan || !ui || !api) return;
      const v = planView(); if (v.w < 10) return;
      const f = n => n.toFixed(1), L = (a, b, cls, extra = '') => `<line class="${cls}" x1="${f(a[0])}" y1="${f(a[1])}" x2="${f(b[0])}" y2="${f(b[1])}" ${extra}/>`;
      let out = '', top = '';
      for (const wl of api.surfaces.filter(s => s.kind === 'wall' && !s.stand)) {
        const g = wallXZ(wl), at = t => v.to(g.ox + g.ux * t, g.oz + g.uz * t);
        out += L(at(0), at(g.len), 'hp-wall');
        for (const [b0, b1] of blocks[wl.name] || []) out += L(at(Math.max(0, b0)), at(Math.min(g.len, b1)), 'hp-open-in');      // glass, a window, the way in
      }
      for (const q of stStands()) {
        const r = q.rot * Math.PI / 180, hx = Math.cos(r) * q.len / 2, hz = Math.sin(r) * q.len / 2, a = v.to(q.x - hx, q.z - hz), b = v.to(q.x + hx, q.z + hz), on = sel && sel.k === 'stand' && sel.id === q.id;
        out += L(a, b, 'hp-stand' + (on ? ' on' : ''), `style="stroke-width:${f(Math.max(5, STAND.t * v.k))}px"`) + L(a, b, 'hp-hit', `data-k="stand" data-id="${esc(q.id)}"`);
      }
      for (const q of st.plinths) if (!q.kind) {
        const [pw, pd] = plinthDims(q), c = v.to(q.x, q.z), [sw, sd] = v.dir(pw / 100 * v.k, pd / 100 * v.k).map(Math.abs), on = sel && sel.k === 'plinth' && sel.id === q.id, o = q.work && byId(q.work);
        const w = Math.max(12, sw), d = Math.max(12, sd);
        out += `<rect class="hp-plinth${on ? ' on' : ''}" x="${f(c[0] - w / 2)}" y="${f(c[1] - d / 2)}" width="${f(w)}" height="${f(d)}"/>` + (o ? `<image href="${thumb(o)}" x="${f(c[0] - 13)}" y="${f(c[1] - 13)}" width="26" height="26" preserveAspectRatio="xMidYMid slice" clip-path="inset(0 round 13px)"/>` : '')
          + `<circle class="hp-hit" cx="${f(c[0])}" cy="${f(c[1])}" r="22" data-k="plinth" data-id="${esc(q.id)}"/>`;
      }
      for (const id of st.ids) {
        const pl = st.placements[id], wl = pl && wallOf(pl.wall), w = byId(id); if (!wl || !sizes[id] || !w || (wl.stand && standStale(wl.stand))) continue;
        const g = wallXZ(wl), sw = sizes[id][0], cx = g.ox + g.ux * pl.a, cz = g.oz + g.uz * pl.a, on = sel && sel.k === 'work' && sel.id === id;
        const a = v.to(cx - g.ux * sw / 2 + g.nx * 0.04, cz - g.uz * sw / 2 + g.nz * 0.04), b = v.to(cx + g.ux * sw / 2 + g.nx * 0.04, cz + g.uz * sw / 2 + g.nz * 0.04);
        const c = v.to(cx, cz), n = v.dir(g.nx, g.nz), T = 30, t = [c[0] + n[0] * (T / 2 + 9), c[1] + n[1] * (T / 2 + 9)];
        const one = L(a, b, 'hp-work' + (on ? ' on' : '')) + `<image href="${thumb(w)}" x="${f(t[0] - T / 2)}" y="${f(t[1] - T / 2)}" width="${T}" height="${T}" preserveAspectRatio="xMidYMid slice"/><rect class="hp-thumb${on ? ' on' : ''}" x="${f(t[0] - T / 2)}" y="${f(t[1] - T / 2)}" width="${T}" height="${T}"/>`
          + `<circle class="hp-hit" cx="${f(t[0])}" cy="${f(t[1])}" r="21" data-k="work" data-id="${esc(id)}"><title>${esc(w.title)}</title></circle>`;
        if (on) top += one; else out += one;
      }
      // the room's measures, as on an architect's plan
      const m = n => (Math.round(n * 10) / 10) + ' m', c0 = v.to(v.x0, v.z0), c1 = v.to(v.x1, v.z1), lx = Math.min(c0[0], c1[0]), rx = Math.max(c0[0], c1[0]), ty = Math.min(c0[1], c1[1]), by = Math.max(c0[1], c1[1]);
      out += `<text class="hp-dim" x="${f((lx + rx) / 2)}" y="${f(ty - 12)}" text-anchor="middle">${m(v.turn ? v.z1 - v.z0 : v.x1 - v.x0)}</text><text class="hp-dim" transform="translate(${f(lx - 12)} ${f((ty + by) / 2)}) rotate(-90)" text-anchor="middle">${m(v.turn ? v.x1 - v.x0 : v.z1 - v.z0)}</text>`;
      ui.svg.setAttribute('viewBox', `0 0 ${f(v.w)} ${f(v.h)}`); ui.svg.innerHTML = out + top;
    }
    function nearestWall(x, z) {
      let best = null;
      for (const wl of api.surfaces.filter(s => s.kind === 'wall' && !(s.stand && standStale(s.stand)))) {
        const g = wallXZ(wl), rx = x - g.ox, rz = z - g.oz, along = Math.max(0, Math.min(g.len, rx * g.ux + rz * g.uz));
        const side = rx * g.nx + rz * g.nz, d = Math.hypot(rx - g.ux * along, rz - g.uz * along) + (side < -0.02 ? 0.6 : 0);      // (the side of the wall the finger is on)
        if (!best || d < best.d) best = { wl, a: along, d };
      }
      return best;
    }
    function planPointer(e) {
      if (!plan || !pv) return;
      if (e.type === 'pointerdown') {
        if (pdrag) return;
        const t = e.target.closest('[data-k]');
        if (pop) { pop = ''; clearTimeout(noteT); noteT = 0; }
        if (!t) { select(null); return; }
        const hit = { k: t.dataset.k, id: t.dataset.id }; select(hit);
        const [x, z] = pv.from(e.clientX - pv.left, e.clientY - pv.top), q = hit.k === 'work' ? null : stPlinth(hit.id);
        pdrag = { ...hit, pid: e.pointerId, pre: clone(st), moved: 0, sx: e.clientX, sy: e.clientY, off: q ? [x - q.x, z - q.z] : [0, 0] };
        try { ui.svg.setPointerCapture(e.pointerId); } catch {}
        e.preventDefault(); return;
      }
      if (!pdrag || e.pointerId !== pdrag.pid) return;
      if (e.type === 'pointermove') {
        pdrag.moved = Math.max(pdrag.moved, Math.abs(e.clientX - pdrag.sx) + Math.abs(e.clientY - pdrag.sy));
        if (pdrag.moved < 6) return;
        const [x, z] = pv.from(e.clientX - pv.left, e.clientY - pv.top);
        if (pdrag.k === 'work') {
          const n = nearestWall(x, z); if (!n) return;
          const was = st.placements[pdrag.id], r = constrain(n.wl, n.a, was && was.wall === n.wl.name ? was.y : design.centre / 100, pdrag.id);
          putWork(pdrag.id, n.wl, r.a, r.y);
        } else if (pdrag.k === 'plinth') {
          const r = constrainPlinth(x - pdrag.off[0], z - pdrag.off[1], pdrag.id); putPlinth(pdrag.id, r.x, r.z);
        } else {
          const q = stPlinth(pdrag.id), snap = n => Math.round(n * 20) / 20;
          q.x = Math.max(0.6, Math.min(W - 0.6, snap(x - pdrag.off[0]))); q.z = Math.max(0.6, Math.min(D - 0.6, snap(z - pdrag.off[1])));
        }
        refresh(); return;
      }
      const d = pdrag; pdrag = null;
      if (d.moved >= 6) { if (d.k === 'stand') soon(d.pre); else { push(d.pre); save(); refresh(); } }
    }
    function setPlan(on) {
      plan = on; outerPlan = on; if (!on) pop = ''; ui.hp.hidden = !on; api.root.classList.toggle('planning', on);
      ui.bar.querySelector('[data-a=line]').hidden = on; ui.bar.querySelector('[data-a=even]').hidden = on;
      if (!on && sel) {                                       // walking in: stand in front of what was chosen on the plan
        if (sel.k === 'work' && st.placements[sel.id] && wallOf(st.placements[sel.id].wall) && sizes[sel.id]) {
          const pl = st.placements[sel.id], wl = wallOf(pl.wall), to = V(wl.origin).addScaledVector(V(wl.u), pl.a).setY(pl.y);
          const at = to.clone().addScaledVector(V(wl.normal), Math.max(2.8, sizes[sel.id][0] * 1.4 + 1.4)).setY(api.EYE);
          api.setPose(api.clamp(at).toArray(), to.toArray());
        }
        if (sel.k === 'stand') { sel = null; mark(); }
      }
      refresh();
    }

    // --- the panel ---------------------------------------------------------------------------------------------------------
    const thumb = w => esc(src(w.thumb || w.image));
    function popHtml() {
      if (pop === 'add') {
        const rest = library.filter(w => !st.ids.includes(w.id));
        return rest.length ? `<p class="he-h">Add to the show${sel && sel.k === 'plinth' && !stPlinth(sel.id).work ? ': objects go on the selected plinth' : ''}</p><div class="he-grid">${rest.map(w => `<button type="button" data-add="${esc(w.id)}"><img src="${thumb(w)}" alt=""><span>${esc(w.title)}</span>${w.kind === 'object' ? '<i>object</i>' : ''}</button>`).join('')}</div>`
          : '<p class="he-note">Every work you have is already in the show. Bring more in under Works.</p>';
      }
      const step = (label, val, key, less = '−', more = '+') => `<div class="he-step"><span>${label}</span><button type="button" data-st="${key}:-1" aria-label="${label}: less">${less}</button><b>${val}</b><button type="button" data-st="${key}:1" aria-label="${label}: more">${more}</button></div>`;
      if (pop === 'stand') {
        const q = sel && sel.k === 'stand' && stPlinth(sel.id);
        if (!q) return `<p class="he-h">A wall that stands in the room: paintings hang on both sides</p><div class="he-row he-row1"><button type="button" data-st="add:1"><b>Stand a wall here</b><span>3 m wide, in front of you</span></button></div>`;
        return `<div class="he-steps">${step('Width', q.len.toFixed(2) + ' m', 'len')}${step('Angle', Math.round(q.rot) + '°', 'rot')}${step('Move sideways', '25 cm', 'side', '←', '→')}${step('Move away', '25 cm', 'away', '↓', '↑')}</div>
          <div class="he-acts"><button type="button" data-st="here:1">Bring it here</button><button type="button" data-st="add:1">Another wall</button><button type="button" class="he-del" data-st="rm:1">Remove</button></div>`;
      }
      if (pop === 'plinth' && sel && sel.k === 'plinth' && stPlinth(sel.id)) {
        const d = plinthDims(stPlinth(sel.id));
        return `<div class="he-steps">${step('Width', d[0] + ' cm', 'pw')}${step('Length', d[1] + ' cm', 'pd')}${step('Height', d[2] + ' cm', 'ph')}<div class="he-step he-pre"><span>Made sizes</span>${Object.keys(PLINTHS).map(k => `<button type="button" data-plinth="${k}" aria-label="${PNAME[k]}: ${PLINTHS[k].join(' × ')} cm">${k.toUpperCase()}</button>`).join('')}</div></div>
          <div class="he-cols"><span>Colour</span>${[['', 'White', '#e9e6df'], ['grey', 'Grey', '#9b9b98'], ['black', 'Black', '#232325'], ['wood', 'Wood', '#b08a5e']].map(([k, n, c]) => `<button type="button" data-col="${k}" aria-label="${n}" aria-pressed="${(stPlinth(sel.id).colour || '') === k}" style="background:${c}"></button>`).join('')}</div>`;
      }
      if (pop === 'plinth') return `<p class="he-h">${sel && sel.k === 'plinth' ? 'Change the plinth’s size' : 'Stand a plinth on the floor'}</p><div class="he-row">${Object.entries(PLINTHS).map(([k, [w, d, h]]) => `<button type="button" data-plinth="${k}"><b>${PNAME[k]}</b><span>${w} × ${d} cm, ${h} high</span></button>`).join('')}</div>`;
      if (pop === 'line') return `<p class="he-h">Put every work on this wall on the same line as the selected one</p><div class="he-row">${[['c', 'Centre line'], ['t', 'Top line'], ['b', 'Bottom line']].map(([k, n]) => `<button type="button" data-line="${k}"><b>${n}</b></button>`).join('')}</div>`;
      return '';
    }
    function refresh() {
      if (!ui) return;
      const work = sel && sel.k === 'work';
      ui.bar.querySelector('[data-a=line]').disabled = !work; ui.bar.querySelector('[data-a=even]').disabled = !work; ui.bar.querySelector('[data-a=undo]').disabled = !undo.length;
      ui.bar.querySelectorAll('[data-a=add],[data-a=plinth],[data-a=stand],[data-a=line]').forEach(b => b.setAttribute('aria-pressed', String(pop === b.dataset.a)));
      if (pop) { ui.pop.hidden = false; ui.pop.innerHTML = popHtml(); } else if (!noteT || ui.pop.querySelector('.he-note') == null) ui.pop.hidden = true;
      drawPlan(); ui.std.hidden = !(plan && sel && sel.k === 'stand'); ui.more.hidden = !(sel && sel.k === 'plinth');
      if (!sel || (sel.k === 'stand' && !plan)) { ui.sel.hidden = true; return; }      // (in the room a standing wall's panel has its own Remove)
      ui.sel.hidden = false;
      if (work) {
        const w = byId(sel.id), p = st.placements[sel.id], [sw, sh] = sizes[sel.id];
        ui.sel.querySelector('.he-t').innerHTML = `<b>${esc(w ? w.title : '')}</b><span>${cm(sw)} × ${cm(sh)} cm</span><span>${cm(p.a - sw / 2)} cm from the left · ${cm(p.y)} cm high</span>`;
      } else {
        const q = stPlinth(sel.id), o = q && q.work ? byId(q.work) : null;
        if (sel.k === 'stand') { ui.sel.querySelector('.he-t').innerHTML = q ? `<b>Standing wall</b><span>${q.len.toFixed(2)} m wide · ${Math.round(q.rot)}°</span><span>Paintings hang on both sides</span>` : ''; return; }
        ui.sel.querySelector('.he-t').innerHTML = q ? `<b>${q.dims ? 'Plinth' : PNAME[q.size] + ' plinth'}</b><span>${plinthDims(q).join(' × ')} cm</span><span>${o ? esc(o.title) : 'Empty: add an object to it'}</span>` : '';
      }
    }
    function attach(a) {
      api = a;
      if (!st.ids.length && library.length && api.root.querySelector('.sv-hint')) api.root.querySelector('.sv-hint').innerHTML = 'Tap a work above to hang it<br>Then drag it where you want it';
      const box = document.createElement('div'); box.className = 'he';
      box.innerHTML = `<div class="he-bar" role="toolbar" aria-label="Hang the works">
          <button type="button" data-a="add"><b>Add</b><span>work</span></button><button type="button" data-a="plinth"><b>Plinth</b><span>floor</span></button><button type="button" data-a="stand"><b>Wall</b><span>standing</span></button>
          <button type="button" data-a="line"><b>Line up</b><span>wall</span></button><button type="button" data-a="even"><b>Space</b><span>evenly</span></button><button type="button" data-a="undo"><b>Undo</b><span>last</span></button></div>
        <div class="hp" hidden><p class="hp-h">Place things roughly here: drag a work to a wall, drag the standing walls and plinths. Then walk in and hang by eye.</p><svg class="hp-svg" aria-label="Plan of the room"></svg><button type="button" class="hp-go">Walk in</button></div>
        <button type="button" class="hp-open">Plan</button>
        <div class="he-pop" hidden></div>
        <div class="he-sel" hidden><div class="he-t"></div><div class="he-std" hidden><button type="button" data-st="len:-1" aria-label="Narrower">−</button><button type="button" data-st="len:1" aria-label="Wider">+</button><button type="button" data-st="rot:6">Turn</button></div><button type="button" class="he-more" hidden>Size, colour</button><button type="button" class="he-rm">Remove</button></div>`;
      api.root.append(box);
      ui = { bar: box.querySelector('.he-bar'), pop: box.querySelector('.he-pop'), sel: box.querySelector('.he-sel'), hp: box.querySelector('.hp'), svg: box.querySelector('.hp-svg'), std: box.querySelector('.he-std'), more: box.querySelector('.he-more') };
      ui.more.onclick = () => { pop = pop === 'plinth' ? '' : 'plinth'; refresh(); };
      ui.std.onclick = e => { const b = e.target.closest('button'); if (b) { const [k, v] = b.dataset.st.split(':'); editStand(k, +v); } };
      box.querySelector('.hp-go').onclick = () => setPlan(false);
      box.querySelector('.hp-open').onclick = () => setPlan(true);
      const map = api.root.querySelector('.sv-map');      // the small plan by the door opens the large one
      if (map) map.addEventListener('click', e => { e.stopImmediatePropagation(); setPlan(true); }, true);
      for (const t of ['pointerdown', 'pointermove', 'pointerup', 'pointercancel']) ui.svg.addEventListener(t, planPointer);
      addEventListener('resize', drawPlan);
      const toggle = k => { pop = pop === k ? '' : k; clearTimeout(noteT); noteT = 0; refresh(); };
      ui.bar.onclick = e => {
        const b = e.target.closest('button'); if (!b || b.disabled) return;
        const k = b.dataset.a;
        if (k === 'add' || k === 'plinth' || k === 'stand' || k === 'line') toggle(k); else if (k === 'even') even(); else if (k === 'undo') doUndo();
      };
      ui.pop.onclick = e => {
        const b = e.target.closest('button'); if (!b) return;
        if (b.dataset.st) {
          const [k, v] = b.dataset.st.split(':'), by = +v;
          if (k === 'add') addStand(); else if (k === 'rm') removeSel(); else if (k === 'pw') dimPlinth(0, by * 5); else if (k === 'pd') dimPlinth(1, by * 5); else if (k === 'ph') dimPlinth(2, by * 5); else editStand(k, by);
        } else if (b.dataset.col != null) colourPlinth(b.dataset.col); else if (b.dataset.add) addWork(b.dataset.add); else if (b.dataset.plinth) sizePlinth(b.dataset.plinth); else if (b.dataset.line) lineUp(b.dataset.line);
      };
      ui.sel.querySelector('.he-rm').onclick = removeSel;
      if (pose) api.setPose(pose.at, pose.to);
      if (sel) mark();
      if (outerPlan) setPlan(true); else refresh();
    }
    const ctlObj = { pointer, attach, get api() { return api; }, setSel(s) { sel = s; }, sel: () => sel };
    return ctlObj;
  }

  // the first time: a work or a plinth just added stays selected after the room is rebuilt
  await open();
  return { close: () => view && view.close() };
}
