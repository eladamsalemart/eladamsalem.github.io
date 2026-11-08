// The hang editor: inside the walkable room, the artist adds and takes out works, drags each one along the wall (it
// snaps to a common line, to its neighbours and to the wall's middle), lines them up, spaces them evenly, stands plinths
// on the floor with objects on them, and undoes. Every change is saved as it is made (onSave) and is what the show
// is hung from: placements per work { wall, a, y } (a: metres along the wall, y: height of the work's middle) and
// plinths { id, x, z, size: 's' | 'm' | 'l', work }.
// Works with touch and mouse: one finger drags a work or a plinth, a drag on the empty wall looks around, two fingers
// pinch to zoom (all the viewer's own).
import { buildRoom, sizeOf, PLINTHS } from './synth.js';

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
  let view = null, made = null, pose = null, ctl = null, outerSel = null;
  const byId = id => library.find(w => w.id === id);
  const sig = o => o.ids.join() + '|' + o.plinths.map(p => p.id + p.work + p.size).join();
  const save = () => onSave(clone(st));
  const push = pre => { undo.push(pre); if (undo.length > 40) undo.shift(); };

  async function build() {
    const m = await buildRoom({ ...design, works: st.ids.map(byId).filter(Boolean).map(shape), placements: st.placements, plinths: st.plinths, editing: true }, src);
    for (const [id, p] of Object.entries(m.placements)) if (!st.placements[id]) st.placements[id] = p;   // hung as the room would: now the artist's to move
    st.plinths = m.plinths;
    return m;
  }
  // (re)open the room on the current state, standing where the artist stood
  async function open() {
    const next = await build();
    const was = view, keepPose = ctl && ctl.api ? ctl.api.pose() : null;
    if (was) { was.close(); made.revoke(); }
    made = next; pose = keepPose;
    ctl = controller();
    view = await openSpace({ spec: made.spec, works: [], src: u => u, onClose: () => { made.revoke(); onExit(); }, editor: ctl, exitLabel: 'Done' });
    window.__spaceView = view; window.__he = ctl;
  }

  function controller() {
    let api = null, sel = outerSel, drag = null, tap = null, ui = null, pop = '', noteT = 0, outline = null, guides = null;
    const sizes = {}; made.spec.works.forEach(h => { sizes[h.id] = [h.measured[0] / 100, h.measured[1] / 100]; });
    const blocks = made.spec.blocks || {};
    const H = made.spec.room.height, W = made.spec.room.x1, D = made.spec.room.z1;
    const wallOf = name => api.surfaces.find(s => s.kind === 'wall' && s.name === name);
    const pieceOf = id => api.pieces.find(p => p.h.id === id);
    const plinthOf = id => api.plinths.find(q => q.id === id);
    const stPlinth = id => st.plinths.find(p => p.id === id);
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
        if (a < -0.01 || a > wl.size[0] + 0.01 || p.y < 0 || p.y > H) continue;
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
      const hit = api.ray.intersectObjects(objs, false)[0]; if (!hit) return null;
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
      y = Math.max(h / 2 + 0.1, Math.min(H - h / 2 - 0.1, y));
      for (const [b0, b1] of blocks[wl.name] || []) {      // not over a window, glass or the door
        if (a + w / 2 > b0 && a - w / 2 < b1) { a = (a < (b0 + b1) / 2) ? b0 - w / 2 : b1 + w / 2; ga = null; }
      }
      a = Math.max(w / 2, Math.min(len - w / 2, a));
      return { a, y, ga, gy };
    }
    function freeSpot(wl, a, w) {
      const iv = [...onWall(wl.name).map(o => [st.placements[o].a - sizes[o][0] / 2 - GAP, st.placements[o].a + sizes[o][0] / 2 + GAP]), ...(blocks[wl.name] || [])];
      for (let k = 0; k < 80; k++) for (const s of k ? [1, -1] : [1]) {
        const x = a + s * k * 0.2;
        if (x - w / 2 < 0.05 || x + w / 2 > wl.size[0] - 0.05) continue;
        if (!iv.some(([i0, i1]) => x + w / 2 > i0 && x - w / 2 < i1)) return x;
      }
      return Math.max(w / 2, Math.min(wl.size[0] - w / 2, a));
    }
    function constrainPlinth(x, z, id) {
      const q = stPlinth(id), [pw, pd] = PLINTHS[q.size];
      x = Math.round(x * 20) / 20; z = Math.round(z * 20) / 20;
      let bx = SNAP, bz = SNAP, sx = x, sz = z;
      for (const o of st.plinths) if (o.id !== id) { if (Math.abs(o.x - x) < bx) { bx = Math.abs(o.x - x); sx = o.x; } if (Math.abs(o.z - z) < bz) { bz = Math.abs(o.z - z); sz = o.z; } }
      if (Math.abs(W / 2 - x) < SNAP) sx = W / 2; if (Math.abs(D / 2 - z) < SNAP) sz = D / 2;
      return { x: Math.max(pw / 200 + 0.4, Math.min(W - pw / 200 - 0.4, sx)), z: Math.max(pd / 200 + 0.4, Math.min(D - pd / 200 - 0.4, sz)) };
    }

    // --- drawing the selection and the guides ------------------------------------------------------------------------
    function mark() {
      if (outline) { outline.parent && outline.parent.remove(outline); outline.geometry.dispose(); outline = null; }
      if (!sel) return;
      const T = api.THREE; let g, parent, y = 0;
      if (sel.k === 'work') { const p = pieceOf(sel.id); if (!p) return; const [w, h] = sizes[sel.id]; g = new T.BoxGeometry(w + 0.05, h + 0.05, 0.07); parent = p.g; }
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
    function select(s) { sel = s; if (s && api.root.querySelector('.sv-hint')) api.root.querySelector('.sv-hint').style.opacity = 0; mark(); refresh(); }

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
          if (tap && tap.id === e.pointerId && Math.abs(e.clientX - tap.x) + Math.abs(e.clientY - tap.y) < 8 && sel) select(null);
          tap = null; return false;
        }
        if (e.pointerId !== drag.pid) return true;
        if (drag.moved >= 5) { push(drag.pre); save(); }
        guide(null); drag = null; return true;
      }
      return false;
    }

    // --- the tools --------------------------------------------------------------------------------------------------------
    const centreAhead = () => { const f = api.camera.getWorldDirection(new api.THREE.Vector3()); return { f, p: api.camera.position }; };
    function note(t) { clearTimeout(noteT); pop = ''; ui.pop.hidden = false; ui.pop.innerHTML = `<p class="he-note">${esc(t)}</p>`; noteT = setTimeout(() => { if (!pop) ui.pop.hidden = true; }, 2600); }
    async function addWork(id) {
      const w = byId(id); if (!w) return;
      const pre = clone(st);
      if (w.kind === 'object') {
        let q = sel && sel.k === 'plinth' ? stPlinth(sel.id) : null; if (q && q.work) q = null;
        if (q) q.work = id;
        else { const { f, p } = centreAhead(); st.plinths.push({ id: 'p-' + id, x: p.x + f.x * 2.2, z: p.z + f.z * 2.2, size: 'm', work: id }); }
        st.ids.push(id);
      } else {
        const sz = await sizeOf(shape(w), src), ww = sz.w / 100;
        api.ray.setFromCamera({ x: 0, y: 0 }, api.camera);
        const hw = wallRay() || { wall: api.surfaces.find(s => s.kind === 'wall'), a: 2 };
        const a = freeSpot(hw.wall, hw.a, ww);
        st.ids.push(id); st.placements[id] = { wall: hw.wall.name, a: +a.toFixed(3), y: design.centre / 100 };
      }
      push(pre); save(); sel = { k: w.kind === 'object' ? 'plinth' : 'work', id: w.kind === 'object' ? 'p-' + id : id }; pop = ''; outerSel = sel; await open();
    }
    async function removeSel() {
      if (!sel) return; const pre = clone(st);
      if (sel.k === 'work') { st.ids = st.ids.filter(i => i !== sel.id); delete st.placements[sel.id]; }
      else { const q = stPlinth(sel.id); if (q && q.work) st.ids = st.ids.filter(i => i !== q.work); st.plinths = st.plinths.filter(p => p.id !== sel.id); }
      push(pre); save(); sel = null; pop = ''; outerSel = sel; await open();
    }
    async function sizePlinth(k) {
      const pre = clone(st);
      if (sel && sel.k === 'plinth') stPlinth(sel.id).size = k;
      else { const { f, p } = centreAhead(), id = 'p-' + Math.random().toString(36).slice(2, 8); st.plinths.push({ id, x: p.x + f.x * 2.2, z: p.z + f.z * 2.2, size: k, work: null }); sel = { k: 'plinth', id }; }
      push(pre); save(); pop = ''; outerSel = sel; await open();
    }
    function lineUp(mode) {
      if (!sel || sel.k !== 'work') return;
      const pre = clone(st), ref = st.placements[sel.id], [, rh] = sizes[sel.id], wl = wallOf(ref.wall);
      const line = mode === 'c' ? ref.y : mode === 't' ? ref.y + rh / 2 : ref.y - rh / 2;
      for (const id of [sel.id, ...onWall(ref.wall, sel.id)]) {
        const h = sizes[id][1], y = mode === 'c' ? line : mode === 't' ? line - h / 2 : line + h / 2;
        putWork(id, wl, st.placements[id].a, Math.max(h / 2 + 0.1, Math.min(H - h / 2 - 0.1, y)));
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
      for (const p of st.plinths) if (plinthOf(p.id)) api.movePlinth(plinthOf(p.id), p.x, p.z);
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
      if (pop === 'plinth') return `<p class="he-h">${sel && sel.k === 'plinth' ? 'Change the plinth’s size' : 'Stand a plinth on the floor'}</p><div class="he-row">${Object.entries(PLINTHS).map(([k, [w, d, h]]) => `<button type="button" data-plinth="${k}"><b>${PNAME[k]}</b><span>${w} × ${d} cm, ${h} high</span></button>`).join('')}</div>`;
      if (pop === 'line') return `<p class="he-h">Put every work on this wall on the same line as the selected one</p><div class="he-row">${[['c', 'Centre line'], ['t', 'Top line'], ['b', 'Bottom line']].map(([k, n]) => `<button type="button" data-line="${k}"><b>${n}</b></button>`).join('')}</div>`;
      return '';
    }
    function refresh() {
      if (!ui) return;
      const work = sel && sel.k === 'work';
      ui.bar.querySelector('[data-a=line]').disabled = !work; ui.bar.querySelector('[data-a=even]').disabled = !work; ui.bar.querySelector('[data-a=undo]').disabled = !undo.length;
      ui.bar.querySelectorAll('[data-a=add],[data-a=plinth],[data-a=line]').forEach(b => b.setAttribute('aria-pressed', String(pop === b.dataset.a)));
      if (pop) { ui.pop.hidden = false; ui.pop.innerHTML = popHtml(); } else if (!noteT || ui.pop.querySelector('.he-note') == null) ui.pop.hidden = true;
      if (!sel) { ui.sel.hidden = true; return; }
      ui.sel.hidden = false;
      if (work) {
        const w = byId(sel.id), p = st.placements[sel.id], [sw, sh] = sizes[sel.id];
        ui.sel.querySelector('.he-t').innerHTML = `<b>${esc(w ? w.title : '')}</b><span>${cm(sw)} × ${cm(sh)} cm</span><span>${cm(p.a - sw / 2)} cm from the left · ${cm(p.y)} cm high</span>`;
      } else {
        const q = stPlinth(sel.id), o = q && q.work ? byId(q.work) : null;
        ui.sel.querySelector('.he-t').innerHTML = q ? `<b>${PNAME[q.size]} plinth</b><span>${PLINTHS[q.size].join(' × ')} cm</span><span>${o ? esc(o.title) : 'Empty: add an object to it'}</span>` : '';
      }
    }
    function attach(a) {
      api = a;
      const box = document.createElement('div'); box.className = 'he';
      box.innerHTML = `<div class="he-bar" role="toolbar" aria-label="Hang the works">
          <button type="button" data-a="add"><b>Add</b><span>work</span></button><button type="button" data-a="plinth"><b>Plinth</b><span>floor</span></button>
          <button type="button" data-a="line"><b>Line up</b><span>wall</span></button><button type="button" data-a="even"><b>Space</b><span>evenly</span></button><button type="button" data-a="undo"><b>Undo</b><span>last</span></button></div>
        <div class="he-pop" hidden></div>
        <div class="he-sel" hidden><div class="he-t"></div><button type="button" class="he-rm">Remove</button></div>`;
      api.root.append(box);
      ui = { bar: box.querySelector('.he-bar'), pop: box.querySelector('.he-pop'), sel: box.querySelector('.he-sel') };
      const toggle = k => { pop = pop === k ? '' : k; clearTimeout(noteT); noteT = 0; refresh(); };
      ui.bar.onclick = e => {
        const b = e.target.closest('button'); if (!b || b.disabled) return;
        const k = b.dataset.a;
        if (k === 'add' || k === 'plinth' || k === 'line') toggle(k); else if (k === 'even') even(); else if (k === 'undo') doUndo();
      };
      ui.pop.onclick = e => {
        const b = e.target.closest('button'); if (!b) return;
        if (b.dataset.add) addWork(b.dataset.add); else if (b.dataset.plinth) sizePlinth(b.dataset.plinth); else if (b.dataset.line) lineUp(b.dataset.line);
      };
      ui.sel.querySelector('.he-rm').onclick = removeSel;
      if (pose) api.setPose(pose.at, pose.to);
      if (sel) mark();
      refresh();
    }
    const ctlObj = { pointer, attach, get api() { return api; }, setSel(s) { sel = s; } };
    return ctlObj;
  }

  // the first time: a work or a plinth just added stays selected after the room is rebuilt
  await open();
  return { close: () => view && view.close() };
}
