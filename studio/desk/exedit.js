// The exhibition editor of the Desk, made for a large screen, a mouse and a keyboard: the works of every artist on the left, the
// walls of one room of the street in the middle (the three walls a visitor sees at the door: left, back, right, drawn to scale),
// the room from above under them (plinths for sculptures), and the words and the selected work on the right.
// Everything is undoable, saved as it is made (a draft: visitors see nothing until it is published into a room).
import { api, APP, guest, abs } from './data.js';
import { esc, snapshot, roomOf, walkStreet, SLOTS, isNorth, stateOf, appShows } from './museum.js';

const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const RH = 3.8, LEN = 20, SEGS = [['קיר שמאל', 0, 6], ['קיר אחורי', 6, 14], ['קיר ימין', 14, 20]], GAPW = 0.15, EDGE = 0.25, EYE = 1.5, PAD = 36;
const segOf = s => s < 6 ? 0 : s < 14 ? 1 : 2;
const clone = o => JSON.parse(JSON.stringify(o));
const uid = () => Math.random().toString(36).slice(2, 8);
const RW = 8, RD = 6;                                                        // the room, in metres

let LIBP = null;                                                             // every approved artist's visible works, sculptures too
const fullLib = () => LIBP || (LIBP = api.artists().then(as => as.filter(a => a.status === 'approved').map(a => ({ id: a.id, name: a.name,
  works: a.works.filter(w => !w.hidden).map(w => ({ id: w.id, title: w.title, image: abs(w.image), thumb: abs(w.thumb || w.image), width: +w.width || null, height: +w.height || null, year: w.year, medium: w.medium, kind: w.kind === 'object' ? 'object' : 'work', artist: a.name })) })).filter(a => a.works.length)));

export async function editor(ctx, id) {
  const { root, toast, fail, keys, synth, viewerCss, shellTop } = ctx;
  const SY = await synth(), [lib, slotRows, apps] = await Promise.all([fullLib(), api.slots(), appShows()]);
  let E;
  if (id === 'new') E = { id: null, title: '', curator: 'Elad Amsalem', text: '', works: [], plinths: [] };
  else { const x = (await api.exhibitions()).find(q => q.id === id); if (!x) { root.innerHTML = `${shellTop()}<main style="padding:40px"><p>התערוכה לא נמצאה. <a href="#/museum">חזרה למוזיאון</a></p></main>`; return; }
    E = { id: x.id, title: x.title, curator: x.curator || '', text: x.text || '', works: clone(x.works || []), plinths: clone(x.plinths || []) }; }
  const by = new Map(lib.flatMap(a => a.works).map(w => [w.id, w]));
  let sel = new Set(), libSel = new Set(), view = 'all', tab = 'ex', dirty = false, saving = false, timer = null, savedAt = id === 'new' ? 0 : Date.now(), guides = [];
  const undo = [], redo = []; let lastKey = '', lastAt = 0;
  const snap = () => JSON.stringify({ title: E.title, curator: E.curator, text: E.text, works: E.works, plinths: E.plinths });
  const loadSnap = s => { const o = JSON.parse(s); Object.assign(E, o); };
  const pushUndo = key => { const n = Date.now(); if (key && key === lastKey && n - lastAt < 900) { lastAt = n; return; } undo.push(snap()); redo.length = 0; lastKey = key || ''; lastAt = n; if (undo.length > 120) undo.shift(); };

  // ---- geometry ---------------------------------------------------------------------------------------------------------
  const dims = w => { const [a, b] = SY.streetFit(+w.width || 60, +w.height || 80); return [a / 100, b / 100]; };      // metres, as the street will show it
  const walls = () => E.works.filter(w => w.s != null && w.kind !== 'object');
  const box = (w, s = w.s, y = w.y) => { const [wm, hm] = dims(w); return { l: s - wm / 2, r: s + wm / 2, b: y - hm / 2, t: y + hm / 2, wm, hm }; };
  const clampS = (w, s) => { const [wm] = dims(w), g = segOf(Math.min(Math.max(s, 0), LEN - 1e-6)), a = SEGS[g][1], z = SEGS[g][2]; return Math.min(Math.max(s, a + wm / 2 + EDGE), z - wm / 2 - EDGE); };
  const clampY = (w, y) => { const [, hm] = dims(w); return Math.min(Math.max(y, hm / 2 + 0.1), RH - hm / 2 - 0.1); };
  const hit = (a, b) => a.l < b.r + GAPW - 1e-6 && a.r > b.l - GAPW + 1e-6 && a.b < b.t - 1e-6 && a.t > b.b + 1e-6;
  const free = (w, s, y, skip) => { const b = box(w, s, y); return !walls().some(o => o.id !== w.id && !skip.has(o.id) && hit(b, box(o))); };
  const spot = (w, want, y, skip = new Set()) => { for (let d = 0; d <= LEN; d += 0.05) for (const g of d ? [1, -1] : [1]) { const s = clampS(w, want + g * d); if (s >= 0 && s <= LEN && free(w, s, y, skip)) return s; } return null; };
  const wallPoint = s => { s = Math.min(Math.max(s, 0), LEN); return s < 6 ? [0, s] : s < 14 ? [s - 6, RD] : [RW, RD - (s - 14)]; };            // a place on the walls -> the plan (x across, z from the front)
  const pl = p => SY.PLINTHS[p.size] || SY.PLINTHS.m;

  // ---- the page -----------------------------------------------------------------------------------------------------------
  const where = () => slotRows.filter(s => s.exhibition_id === E.id);
  const live = () => where().filter(s => s.live);
  const isDirtyLive = () => live().some(s => JSON.stringify(snapshot(E)) !== JSON.stringify(s.content));
  const chip = () => { const l = live(), w = where(); return l.length ? `<span class="chip ok">מוצגת · חדר ${l.map(s => s.slot).join(', ')}</span>${isDirtyLive() ? '<span class="chip warn">שינויים שלא פורסמו</span>' : ''}` : w.length ? `<span class="chip">בחדר ${w.map(s => s.slot).join(', ')} · לא מוצגת</span>` : '<span class="chip">טיוטה</span>'; };
  root.innerHTML = `${shellTop()}<div class="ws" id="ws">
    <header class="ws-top"><a class="btn q" href="#/museum">המוזיאון ←</a><input class="ws-title" id="f-title" dir="auto" placeholder="שם התערוכה" value="${esc(E.title)}" aria-label="שם התערוכה"><span id="chips"></span><span class="muted small" id="saved"></span><span class="grow"></span>
      <button class="ib" id="b-undo" title="ביטול (Ctrl+Z)" aria-label="ביטול">↶</button><button class="ib" id="b-redo" title="שחזור (Ctrl+Shift+Z)" aria-label="שחזור">↷</button>
      <button class="btn" id="b-walk">צפה בחדר <kbd>W</kbd></button><button class="btn p" id="b-pub">פרסם במוזיאון</button></header>
    <aside class="ws-lib" id="lib" aria-label="העבודות"></aside>
    <section class="ws-mid"><div class="ws-tools" id="tools"></div><div class="el" id="el"></div><div class="ws-low"><div id="plan" class="plan"></div><div class="ws-hint" id="hint"></div></div></section>
    <aside class="ws-ins" id="ins" aria-label="פרטים"></aside></div><dialog id="pubd" class="dlg"></dialog>`;

  // ---- state changes ------------------------------------------------------------------------------------------------------
  function touch() { dirty = true; paintSaved(); clearTimeout(timer); timer = setTimeout(save, 1100); chipsDraw(); }
  function mutate(fn, key) { pushUndo(key); fn(); touch(); }
  const paintSaved = () => { const s = $('#saved'); if (s) s.textContent = saving ? 'שומר…' : dirty ? 'משנה…' : savedAt ? 'נשמר' : ''; };
  const chipsDraw = () => { const c = $('#chips'); if (c) c.innerHTML = chip(); $('#b-undo').disabled = !undo.length; $('#b-redo').disabled = !redo.length; };
  async function save() {
    clearTimeout(timer); if (saving) { timer = setTimeout(save, 400); return; } if (!dirty && E.id) return;
    saving = true; paintSaved();
    const body = { title: E.title || 'Untitled', curator: E.curator || null, text: E.text || null, works: E.works, plinths: E.plinths };
    try { const r = await api.saveExhibition(body, E.id); const first = !E.id; E.id = r.id; dirty = false; savedAt = Date.now(); if (first) history.replaceState(null, '', '#/museum/ex/' + r.id); }
    catch (e) { fail(e); }
    saving = false; paintSaved(); chipsDraw();
  }
  const doUndo = (from, to) => { const s = from.pop(); if (!s) return; to.push(snap()); loadSnap(s); sel = new Set([...sel].filter(i => E.works.some(w => w.id === i) || E.plinths.some(p => p.id === i))); lastKey = ''; $('#f-title').value = E.title; touch(); drawAll(); };

  // ---- adding works --------------------------------------------------------------------------------------------------------
  async function addWorks(ids, at, y = EYE) {
    const items = ids.map(i => by.get(i)).filter(Boolean).filter(w => !E.works.some(x => x.id === w.id)); if (!items.length) return;
    const prep = [];
    for (const w of items) { const c = { ...w }; if (!c.width || !c.height) { const z = await SY.sizeOf({ ...c, pairs: [] }, u => u); c.width = Math.round(z.w); c.height = Math.round(z.h); c.guessed = true; } prep.push(c); }
    let miss = 0; const added = [];
    mutate(() => {
      let want = at ?? 0.5;
      prep.forEach((c, n) => {
        if (c.kind === 'object') { E.works.push(c); const k = E.plinths.length; E.plinths.push({ id: 'p' + uid(), x: Math.min(RW - 1, 1.6 + (k % 4) * 1.6), z: 2.4 + Math.floor(k / 4) * 1.4, size: 'm', work: c.id }); added.push(c.id); return; }
        const yy = clampY(c, y), s = spot(c, want, yy);
        if (s == null) { miss++; return; }
        c.s = +s.toFixed(3); c.y = +yy.toFixed(3); E.works.push(c); added.push(c.id); want = s + box(c).wm / 2 + 0.4;
      });
    });
    sel = new Set(added); libSel.clear(); if (miss) toast(`אין מקום על הקירות ל־${miss} עבודות`); drawAll();
  }
  const removeSel = () => { if (!sel.size) return; mutate(() => { E.works = E.works.filter(w => !sel.has(w.id)); E.plinths = E.plinths.filter(p => !sel.has(p.id) && E.works.some(w => w.id === p.work)); }); sel.clear(); drawAll(); };

  // ---- the library ---------------------------------------------------------------------------------------------------------
  function libDraw() {
    const q = ($('#lq') && $('#lq').value || '').trim().toLowerCase(), inE = new Set(E.works.map(w => w.id));
    $('#lib').innerHTML = `<div class="pane-h"><h2>העבודות</h2><span class="muted small">${lib.reduce((n, a) => n + a.works.length, 0)} מכל האמנים</span></div>
      <input class="search" id="lq" type="search" dir="auto" placeholder="חיפוש אמן/ית או עבודה" value="${esc(q)}" aria-label="חיפוש">
      <div class="lib-s" id="ls">${lib.map(a => { const ws = a.works.filter(w => !q || (a.name + ' ' + w.title).toLowerCase().includes(q)); if (!ws.length) return '';
        return `<details ${q || a.works.some(w => inE.has(w.id)) ? 'open' : ''}><summary><span dir="auto">${esc(a.name)}</span><span class="chip">${ws.length}</span></summary><div class="lg">${ws.map(w =>
          `<button type="button" class="lw ${inE.has(w.id) ? 'in' : ''} ${libSel.has(w.id) ? 'on' : ''} ${w.kind === 'object' ? 'obj' : ''}" draggable="${!inE.has(w.id)}" data-w="${esc(w.id)}" title="${esc(w.title)}${w.width ? ` · ${w.height}×${w.width}` : ''}"><img loading="lazy" src="${esc(w.thumb)}" alt="${esc(w.title)}">${w.kind === 'object' ? '<i>פסל</i>' : ''}</button>`).join('')}</div></details>`; }).join('')}</div>
      ${libSel.size ? `<div class="lib-add"><button class="btn p wide" id="l-add">הוסף ${libSel.size} לקיר <kbd>Enter</kbd></button></div>` : '<p class="muted small lib-tip">לחיצה בוחרת (אפשר כמה), גרירה אל הקיר מניחה, לחיצה כפולה מוסיפה.</p>'}`;
    const lq = $('#lq'); lq.oninput = () => { const v = lq.value, p = lq.selectionStart; libDraw(); const n = $('#lq'); n.focus(); n.setSelectionRange(p, p); };
    $$('.lw', $('#lib')).forEach(b => {
      const w = b.dataset.w;
      b.onclick = e => { if (b.classList.contains('in')) { sel = new Set([w]); tab = 'sel'; drawAll(); return; }
        if (e.shiftKey && libSel.size) { const all = $$('.lw:not(.in)', $('#lib')).map(x => x.dataset.w), a = all.indexOf([...libSel].pop()), c = all.indexOf(w); all.slice(Math.min(a, c), Math.max(a, c) + 1).forEach(x => libSel.add(x)); }
        else if (libSel.has(w)) libSel.delete(w); else libSel.add(w);
        const sc = $('#ls').scrollTop; libDraw(); $('#ls').scrollTop = sc; };
      b.ondblclick = () => { if (!b.classList.contains('in')) addWorks([w]); };
      b.ondragstart = e => { if (!libSel.has(w)) libSel = new Set([w]); e.dataTransfer.setData('text/plain', 'lib:' + [...libSel].join('|')); e.dataTransfer.effectAllowed = 'copy'; };
    });
    const a = $('#l-add'); if (a) a.onclick = () => addWorks([...libSel]);
  }

  // ---- the walls (the elevation) ---------------------------------------------------------------------------------------------
  const range = () => view === 'all' ? [0, LEN] : [SEGS[+view][1], SEGS[+view][2]];
  let P = 50;                                                                    // pixels per metre
  const X = s => PAD + (s - range()[0]) * P, Yp = y => (RH - y) * P;
  function elDraw() {
    const el = $('#el'), [v0, v1] = range(), W = el.clientWidth - 2 * PAD, H = el.clientHeight - 56;
    P = Math.max(20, Math.min(W / (v1 - v0), H / RH, 170)); const w = (v1 - v0) * P, h = RH * P;
    const ticks = []; for (let m = Math.ceil(v0); m <= v1; m++) ticks.push(`<i style="left:${X(m)}px" class="${m % 2 ? 's' : ''}">${m % 2 ? '' : m}</i>`);
    el.innerHTML = `<div class="el-in" style="width:${w + 2 * PAD}px;height:${h + 56}px;padding-top:34px">
      <div class="el-rule" style="width:${w + 2 * PAD}px">${ticks.join('')}</div>
      <div class="el-walls" id="ew" style="margin-inline-start:${PAD}px;width:${w}px;height:${h}px;position:relative">
        ${SEGS.map(([n, a, z], i) => (view === 'all' || +view === i) ? `<div class="seg" style="left:${(a - v0) * P}px;width:${(z - a) * P}px"><span class="seg-n">${n} · ${z - a} מ׳${i === 0 ? ' · מהכניסה פנימה' : ''}</span></div>` : '').join('')}
        <div class="eye" style="top:${Yp(EYE)}px"></div>
        ${walls().filter(o => o.s + dims(o)[0] / 2 > v0 && o.s - dims(o)[0] / 2 < v1).map(o => { const b = box(o), bad = walls().some(q => q.id !== o.id && hit(b, box(q)));
          return `<div class="ew ${sel.has(o.id) ? 'on' : ''} ${bad ? 'bad' : ''}" data-id="${esc(o.id)}" style="left:${(b.l - v0) * P}px;top:${Yp(b.t)}px;width:${b.wm * P}px;height:${b.hm * P}px;background-image:url('${esc(abs(o.thumb || o.image))}')"><span class="ew-c" dir="auto">${esc(o.title)}</span></div>`; }).join('')}
        <div class="guides" id="gd"></div><div class="mq" id="mq" hidden></div></div></div>`;
    el.scrollLeft = 0; wireEl();
  }
  const toM = e => { const r = $('#ew').getBoundingClientRect(), [v0, v1] = range(); return { s: Math.min(Math.max(v0 + (e.clientX - r.left) / P, v0), v1), y: RH - (e.clientY - r.top) / P }; };
  function drawGuides(list) { const g = $('#gd'); if (!g) return; const [v0] = range(); g.innerHTML = list.map(([k, v]) => k === 's' ? `<i class="gv" style="left:${(v - v0) * P}px"></i>` : `<i class="gh" style="top:${Yp(v)}px"></i>`).join(''); }
  function paintSel() { $$('.ew').forEach(e => e.classList.toggle('on', sel.has(e.dataset.id))); planDraw(); insDraw(); hintDraw(); }
  function wireEl() {
    const ew = $('#ew'); let drag = null;
    ew.onpointerdown = e => {
      if (e.button !== 0) return; const t = e.target.closest('.ew'), p = toM(e), multi = e.shiftKey || e.ctrlKey || e.metaKey;
      ew.setPointerCapture(e.pointerId);
      if (t) {
        const id = t.dataset.id; if (multi) { sel.has(id) ? sel.delete(id) : sel.add(id); } else if (!sel.has(id)) sel = new Set([id]);
        if (sel.size && tab !== 'sel') tab = 'sel'; paintSel();
        if (!sel.has(id)) return;
        drag = { id, p0: p, moved: false, base: new Map(walls().filter(o => sel.has(o.id)).map(o => [o.id, { s: o.s, y: o.y }])), before: snap() };
      } else { drag = { marquee: true, p0: p, x0: e.clientX, y0: e.clientY, multi, keep: new Set(multi ? sel : []), moved: false }; if (!multi) { sel = new Set(); } }
    };
    ew.onpointermove = e => {
      if (!drag) return; const p = toM(e);
      if (drag.marquee) {
        if (Math.abs(e.clientX - drag.x0) + Math.abs(e.clientY - drag.y0) < 4) return; drag.moved = true;
        const r = ew.getBoundingClientRect(), mq = $('#mq'); mq.hidden = false;
        Object.assign(mq.style, { left: Math.min(e.clientX, drag.x0) - r.left + 'px', top: Math.min(e.clientY, drag.y0) - r.top + 'px', width: Math.abs(e.clientX - drag.x0) + 'px', height: Math.abs(e.clientY - drag.y0) + 'px' });
        const a = { l: Math.min(p.s, drag.p0.s), r: Math.max(p.s, drag.p0.s), b: Math.min(p.y, drag.p0.y), t: Math.max(p.y, drag.p0.y) };
        sel = new Set([...drag.keep, ...walls().filter(o => { const b = box(o); return b.l < a.r && b.r > a.l && b.b < a.t && b.t > a.b; }).map(o => o.id)]);
        $$('.ew').forEach(x => x.classList.toggle('on', sel.has(x.dataset.id))); return;
      }
      let dx = p.s - drag.p0.s, dy = p.y - drag.p0.y;
      if (!drag.moved) { if (Math.abs(dx * P) + Math.abs(dy * P) < 4) return; drag.moved = true; }
      const prim = walls().find(o => o.id === drag.id), base = drag.base.get(drag.id), g = [];
      if (!e.altKey) {                                                           // snap the grabbed work to its neighbours, the eye line and the walls' middles
        const T = 8 / P, ws = prim, bx = box(ws, base.s + dx, base.y + dy), others = walls().filter(o => !sel.has(o.id)).map(o => box(o));
        const ts = [[3, 'c'], [10, 'c'], [17, 'c']].map(([v]) => [v, bx.l + bx.wm / 2]).concat(others.flatMap(o => [[o.r + GAPW, bx.l], [o.l - GAPW, bx.r], [o.l, bx.l], [o.r, bx.r], [(o.l + o.r) / 2, bx.l + bx.wm / 2]]));
        let best = null; for (const [t, mine] of ts) { const d = t - mine; if (Math.abs(d) < T && (!best || Math.abs(d) < Math.abs(best.d))) best = { d, t }; } if (best) { dx += best.d; g.push(['s', best.t]); }
        const ty = [[EYE, bx.b + bx.hm / 2]].concat(others.flatMap(o => [[(o.t + o.b) / 2, bx.b + bx.hm / 2], [o.t, bx.t], [o.b, bx.b]]));
        best = null; for (const [t, mine] of ty) { const d = t - mine; if (Math.abs(d) < T && (!best || Math.abs(d) < Math.abs(best.d))) best = { d, t }; } if (best) { dy += best.d; g.push(['y', best.t]); }
      }
      const [v0, v1] = range(); drawGuides(g);
      for (const [id, b0] of drag.base) { const o = E.works.find(q => q.id === id); o.s = +Math.min(Math.max(clampS(o, b0.s + dx), v0 + dims(o)[0] / 2 + 0.02), v1).toFixed(3); o.y = +clampY(o, b0.y + dy).toFixed(3);
        const b = box(o), el = $(`.ew[data-id="${CSS.escape(id)}"]`); if (el) { el.style.left = (b.l - v0) * P + 'px'; el.style.top = Yp(b.t) + 'px'; } }
      planDraw();
    };
    ew.onpointerup = e => {
      if (!drag) return; const d = drag; drag = null; drawGuides([]); const mq = $('#mq'); if (mq) mq.hidden = true;
      if (d.marquee) { paintSel(); return; }
      if (d.moved) { undo.push(d.before); redo.length = 0; lastKey = ''; touch(); elDraw(); }
      insDraw();
    };
    ew.ondragover = e => { if (!e.dataTransfer.types.includes('text/plain')) return; e.preventDefault(); const p = toM(e); drawGuides([['s', p.s], ['y', p.y]]); };
    ew.ondragleave = () => drawGuides([]);
    ew.ondrop = e => { e.preventDefault(); drawGuides([]); const t = e.dataTransfer.getData('text/plain'); if (!t.startsWith('lib:')) return; const p = toM(e); addWorks(t.slice(4).split('|'), p.s, p.y); };
  }

  // ---- the room from above ------------------------------------------------------------------------------------------------------
  function planDraw() {
    const Q = 34, M = 22, wpx = RW * Q, hpx = RD * Q, el = $('#plan'); if (!el) return;
    const px = x => M + x * Q, pz = z => M + (RD - z) * Q;
    const tick = o => { const b = box(o), [x0, z0] = wallPoint(o.s - b.wm / 2), [x1, z1] = wallPoint(o.s + b.wm / 2); return `<line data-w="${esc(o.id)}" class="pt ${sel.has(o.id) ? 'on' : ''}" x1="${px(x0)}" y1="${pz(z0)}" x2="${px(x1)}" y2="${pz(z1)}"/>`; };
    el.innerHTML = `<svg viewBox="0 0 ${wpx + 2 * M} ${hpx + 2 * M + 14}" width="${wpx + 2 * M}" height="${hpx + 2 * M + 14}" aria-label="החדר מלמעלה">
      <rect x="${M}" y="${M}" width="${wpx}" height="${hpx}" class="pf"/><path d="M${M} ${M + hpx} V${M} H${M + wpx} V${M + hpx}" class="pw"/>
      <path d="M${M} ${M + hpx} H${px(2.4)} M${px(5.6)} ${M + hpx} H${M + wpx}" class="pw"/><text x="${px(4)}" y="${M + hpx + 14}" text-anchor="middle" class="pl">כניסה</text>
      <text x="${M - 6}" y="${M + hpx / 2}" class="pl" text-anchor="end" transform="rotate(-90 ${M - 6} ${M + hpx / 2})">שמאל</text><text x="${px(4)}" y="${M - 7}" class="pl" text-anchor="middle">אחורי</text><text x="${M + wpx + 6}" y="${M + hpx / 2}" class="pl" transform="rotate(90 ${M + wpx + 6} ${M + hpx / 2})" text-anchor="middle">ימין</text>
      ${walls().map(tick).join('')}
      ${E.plinths.map(p => { const [w, d] = pl(p), ww = by.get(p.work) || E.works.find(q => q.id === p.work); return `<g class="pp ${sel.has(p.id) ? 'on' : ''}" data-p="${esc(p.id)}"><rect x="${px(p.x) - w / 200 * Q}" y="${pz(p.z) - d / 200 * Q}" width="${w / 100 * Q}" height="${d / 100 * Q}"/><text x="${px(p.x)}" y="${pz(p.z) + 4}" text-anchor="middle">${esc((ww ? ww.title : '').slice(0, 6))}</text></g>`; }).join('')}</svg>`;
    $$('.pt', el).forEach(l => { l.onclick = e => { const id = l.dataset.w; e.shiftKey ? (sel.has(id) ? sel.delete(id) : sel.add(id)) : sel = new Set([id]); tab = 'sel'; paintSel(); }; });
    $$('.pp', el).forEach(g => {
      g.onpointerdown = e => {
        e.preventDefault(); const id = g.dataset.p, p = E.plinths.find(q => q.id === id); sel = new Set([id]); tab = 'sel'; paintSel(); const before = snap(), r = $('svg', el).getBoundingClientRect(), s0 = { x: p.x, z: p.z, cx: e.clientX, cy: e.clientY }; let mv = false;
        const move = ev => { const dx = (ev.clientX - s0.cx) / Q, dz = -(ev.clientY - s0.cy) / Q; if (!mv && Math.abs(dx) + Math.abs(dz) < 0.05) return; mv = true;
          const [w, d] = pl(p); p.x = +Math.min(Math.max(Math.round((s0.x + dx) * 20) / 20, w / 200 + 0.3), RW - w / 200 - 0.3).toFixed(2); p.z = +Math.min(Math.max(Math.round((s0.z + dz) * 20) / 20, d / 200 + 0.3), RD - d / 200 - 0.3).toFixed(2); planDraw(); };
        const up = () => { removeEventListener('pointermove', move); removeEventListener('pointerup', up); if (mv) { undo.push(before); redo.length = 0; lastKey = ''; touch(); } insDraw(); };
        addEventListener('pointermove', move); addEventListener('pointerup', up);
      };
    });
  }

  // ---- the right-hand side: the exhibition, or what is selected -------------------------------------------------------------------
  const ids = () => [...sel];
  function insDraw() {
    const ws = walls().filter(o => sel.has(o.id)), pls = E.plinths.filter(p => sel.has(p.id)), n = sel.size, cm = v => Math.round(v * 100);
    const exTab = `<label class="field">אוצר/ת<input id="f-cur" dir="auto" value="${esc(E.curator)}"></label>
      <label class="field">טקסט האוצר<span class="muted small">מופיע על הקיר ליד הכניסה לחדר. פסקה חדשה אחרי שורה ריקה</span><textarea id="f-text" dir="auto" rows="9">${esc(E.text)}</textarea></label>
      <div class="ins-sum"><div><b>${walls().length}</b><span>עבודות על הקירות</span></div><div><b>${E.plinths.length}</b><span>פסלים</span></div></div>
      <p class="muted small">ליד כל עבודה מופיע שלט: שם, אמן/ית, שנה וחומר, וההערה שתכתוב לה.</p>
      <div class="ins-foot">${E.id ? '<button class="btn q" id="x-dup">שכפל תערוכה</button><button class="btn q d" id="x-del">מחק תערוכה</button>' : ''}</div>`;
    let selTab;
    if (!n) selTab = '<p class="muted">בחר עבודה על הקיר (לחיצה, Shift להוספה, או גרירה סביב כמה) כדי לשנות אותה.</p>';
    else if (n === 1 && ws.length) { const o = ws[0], g = SEGS[segOf(o.s)], rel = o.s - g[1];
      selTab = `<div class="sel1"><img src="${esc(abs(o.thumb || o.image))}" alt=""><div><b dir="auto">${esc(o.title)}</b><span dir="auto" class="muted">${esc(o.artist || '')}${o.year ? ', ' + esc(o.year) : ''}</span><span class="muted small">${o.height || '?'} × ${o.width || '?'} ס״מ${o.guessed ? ' (מוערך)' : ''}</span></div></div>
        <div class="two-f"><label class="field">לאורך הקיר (ס״מ)<input type="number" id="n-s" step="1" value="${cm(rel)}"></label><label class="field">גובה המרכז (ס״מ)<input type="number" id="n-y" step="1" value="${cm(o.y)}"></label></div>
        <p class="muted small" style="margin:-6px 0 0">${g[0]}, מהפינה הקרובה לכניסה. מקש חץ מזיז ס״מ, עם Shift עשרה.</p>
        <label class="field">הערה לשלט (אופציונלי)<textarea id="n-note" dir="auto" rows="3" placeholder="למשל: שמן על קנבס, אוסף פרטי">${esc(o.note || '')}</textarea></label>
        <button class="btn q" id="n-eye">יישר לגובה העין (150)</button><button class="btn q d" id="n-del">הסר מהתערוכה <kbd>Del</kbd></button>`; }
    else if (n === 1 && pls.length) { const p = pls[0], w = by.get(p.work) || E.works.find(q => q.id === p.work);
      selTab = `<div class="sel1">${w ? `<img src="${esc(abs(w.thumb || w.image))}" alt="">` : ''}<div><b dir="auto">${esc(w ? w.title : 'פסל')}</b><span class="muted" dir="auto">${esc(w ? w.artist || '' : '')}</span><span class="muted small">על במה בחדר</span></div></div>
        <div class="field">גודל הבמה<div class="seg-b" role="group">${[['s', 'קטנה 30×30'], ['m', 'בינונית 40×40'], ['l', 'גדולה 60×60']].map(([k, t]) => `<button type="button" data-ps="${k}" aria-pressed="${p.size === k}">${t}</button>`).join('')}</div></div>
        <p class="muted small">גרור את הבמה בתוכנית החדר. הפסל עומד עליה בגודלו האמיתי.</p><button class="btn q d" id="n-del">הסר מהתערוכה <kbd>Del</kbd></button>`; }
    else selTab = `<div class="sel1"><div><b>${n} נבחרו</b><span class="muted small">פעולות על הקבוצה</span></div></div>
        <div class="field">יישור<div class="seg-b" role="group"><button type="button" data-al="mid">קו אמצע</button><button type="button" data-al="top">ראש</button><button type="button" data-al="bot">תחתית</button><button type="button" data-al="eye">גובה עין</button></div></div>
        <div class="field">מרווחים<div class="seg-b" role="group"><button type="button" data-al="dist">פזר שווה</button><button type="button" data-al="tight">הצמד (15 ס״מ)</button></div></div><button class="btn q d" id="n-del">הסר מהתערוכה <kbd>Del</kbd></button>`;
    $('#ins').innerHTML = `<div class="tabs" role="tablist"><button role="tab" aria-selected="${tab === 'ex'}" data-t="ex">התערוכה</button><button role="tab" aria-selected="${tab === 'sel'}" data-t="sel">נבחר${n ? ` · ${n}` : ''}</button></div><div class="ins-b">${tab === 'ex' ? exTab : selTab}</div>`;
    $$('[data-t]', $('#ins')).forEach(b => b.onclick = () => { tab = b.dataset.t; insDraw(); });
    wireIns();
  }
  function wireIns() {
    const on = (id, ev, f) => { const e = $(id); if (e) e[ev] = f; };
    on('#f-cur', 'oninput', e => mutate(() => { E.curator = e.target.value; }, 'cur')); on('#f-text', 'oninput', e => mutate(() => { E.text = e.target.value; }, 'text'));
    on('#n-del', 'onclick', removeSel);
    const one = () => walls().find(o => sel.has(o.id));
    on('#n-s', 'onchange', e => { const o = one(), g = SEGS[segOf(o.s)]; mutate(() => { o.s = +clampS(o, g[1] + (+e.target.value) / 100).toFixed(3); }); drawAll(); });
    on('#n-y', 'onchange', e => { const o = one(); mutate(() => { o.y = +clampY(o, (+e.target.value) / 100).toFixed(3); }); drawAll(); });
    on('#n-eye', 'onclick', () => { const o = one(); mutate(() => { o.y = +clampY(o, EYE).toFixed(3); }); drawAll(); });
    on('#n-note', 'oninput', e => { const o = one(); mutate(() => { o.note = e.target.value; }, 'note'); });
    $$('[data-ps]').forEach(b => b.onclick = () => { const p = E.plinths.find(q => sel.has(q.id)); mutate(() => { p.size = b.dataset.ps; }); drawAll(); });
    $$('[data-al]').forEach(b => b.onclick = () => align(b.dataset.al));
    on('#x-dup', 'onclick', async () => { await save(); try { const r = await api.saveExhibition({ title: (E.title || 'Untitled') + ' (copy)', curator: E.curator, text: E.text, works: E.works, plinths: E.plinths }, null); location.hash = '#/museum/ex/' + r.id; toast('שוכפלה'); } catch (e) { fail(e); } });
    on('#x-del', 'onclick', async () => { if (!confirm('למחוק את התערוכה? אי אפשר לבטל. אם היא מוצגת בחדר, הגרסה שהמבקרים רואים נשארת עד שתפנה את החדר.')) return; try { dirty = false; await api.deleteExhibition(E.id); location.hash = '#/museum'; } catch (e) { fail(e); } });
  }
  function align(how) {
    const ws = walls().filter(o => sel.has(o.id)); if (ws.length < 2) return;
    if (how === 'dist' || how === 'tight') {
      const g = new Set(ws.map(o => segOf(o.s))); if (g.size > 1) return toast('אפשר לפזר רק עבודות על אותו קיר');
      const s = ws.slice().sort((a, b) => a.s - b.s), l = box(s[0]).l, r = box(s[s.length - 1]).r, sum = s.reduce((t, o) => t + box(o).wm, 0), gap = how === 'tight' ? GAPW : (r - l - sum) / (s.length - 1);
      if (gap < 0) return toast('אין מספיק מקום לפזר');
      mutate(() => { let x = l; for (const o of s) { const wm = box(o).wm; o.s = +clampS(o, x + wm / 2).toFixed(3); x += wm + gap; } });
    } else mutate(() => {
      const bs = ws.map(o => box(o)), mid = bs.reduce((t, b) => t + (b.t + b.b) / 2, 0) / bs.length, top = Math.max(...bs.map(b => b.t)), bot = Math.min(...bs.map(b => b.b));
      ws.forEach((o, i) => { const b = bs[i]; o.y = +clampY(o, how === 'mid' ? mid : how === 'top' ? top - b.hm / 2 : how === 'bot' ? bot + b.hm / 2 : EYE).toFixed(3); });
    });
    drawAll();
  }
  const hintDraw = () => { const h = $('#hint'); if (h) h.innerHTML = `<b>קיצורי מקשים</b><span><kbd>←</kbd><kbd>→</kbd><kbd>↑</kbd><kbd>↓</kbd> הזזה, <kbd>Shift</kbd> פי עשרה</span><span><kbd>Ctrl</kbd>+<kbd>A</kbd> הכל · <kbd>Del</kbd> הסרה · <kbd>Esc</kbd> ביטול בחירה</span><span><kbd>Tab</kbd> קיר אחר · <kbd>Alt</kbd> בלי הצמדה</span><span><kbd>W</kbd> צפייה · <kbd>Ctrl</kbd>+<kbd>Z</kbd> ביטול</span>`; };
  function toolsDraw() {
    $('#tools').innerHTML = `<div class="seg-b" role="group" aria-label="תצוגה">${[['all', 'כל הקירות'], ['0', 'שמאל'], ['1', 'אחורי'], ['2', 'ימין']].map(([k, t]) => `<button type="button" data-v="${k}" aria-pressed="${view === k}">${t}</button>`).join('')}</div>
      <span class="muted small">מסתכלים מהכניסה פנימה · קנה מידה אמיתי · הקו המקווקו הוא גובה העין (150)</span>`;
    $$('[data-v]').forEach(b => b.onclick = () => { view = b.dataset.v; toolsDraw(); elDraw(); });
  }
  function drawAll() { libDraw(); toolsDraw(); elDraw(); planDraw(); insDraw(); hintDraw(); chipsDraw(); }

  // ---- publishing: pick a room ---------------------------------------------------------------------------------------------------
  async function publishDlg() {
    await save(); if (!E.id) return toast('צריך לתת לתערוכה שם או להוסיף עבודה קודם');
    const rows = await api.slots(); slotRows.splice(0, slotRows.length, ...rows);
    const mine = rows.filter(s => s.exhibition_id === E.id); let pick = (mine[0] || {}).slot || (Array.from({ length: SLOTS }, (_, i) => i + 1).find(k => !rows.some(r => r.slot === k && (r.exhibition_id || r.app_slug))) || 1);
    const d = $('#pubd'), nm = r => r ? (r.exhibition_id ? (r.exhibition_id === E.id ? E.title : 'תערוכה אחרת') : (apps.find(a => a.slug === r.app_slug) || {}).title || r.app_slug) : '';
    const draw = () => { const r = rows.find(x => x.slot === pick) || {};
      d.innerHTML = `<form method="dialog"><h2>פרסם במוזיאון</h2><p class="muted small">בחר חדר. המבקרים יראו את התערוכה כמו שהיא עכשיו. שינויים אחר כך יופיעו רק כשתעדכן.</p>
        <div class="pick-r">${Array.from({ length: SLOTS }, (_, i) => i + 1).map(k => { const x = rows.find(q => q.slot === k), st = stateOf(x); return `<button type="button" data-k="${k}" aria-pressed="${k === pick}" class="${x && x.exhibition_id === E.id ? 'mine' : ''}"><b>${k}</b><span dir="auto">${esc(nm(x) || 'ריק')}</span><em>${st.k === 'empty' ? '' : esc(st.t)}</em></button>`; }).join('')}</div>
        ${(r.exhibition_id || r.app_slug) && r.exhibition_id !== E.id ? `<p class="soon">בחדר ${pick} תלויה "${esc(nm(r))}". היא תוחלף.</p>` : ''}
        <div class="two-f"><label class="field">מתאריך<input type="date" id="d-from" value="${r.exhibition_id === E.id ? r.from_date || '' : ''}"></label><label class="field">עד תאריך<input type="date" id="d-to" value="${r.exhibition_id === E.id ? r.to_date || '' : ''}"></label></div>
        <div class="dlg-b"><button type="button" class="btn q" id="d-x">סגור</button><span class="grow"></span>${r.exhibition_id === E.id && r.live ? '<button type="button" class="btn" id="d-off">הורד מהמוזיאון</button>' : ''}<button type="button" class="btn p" id="d-go">${r.exhibition_id === E.id && r.live ? 'עדכן' : 'פרסם'} בחדר ${pick}</button></div></form>`;
      $$('[data-k]', d).forEach(b => b.onclick = () => { pick = +b.dataset.k; draw(); }); $('#d-x').onclick = () => d.close();
      const off = $('#d-off'); if (off) off.onclick = async () => { try { await api.saveSlot(pick, { live: false }); r.live = false; toast('הורדה מהמוזיאון'); d.close(); const f = slotRows.find(s => s.slot === pick); if (f) f.live = false; chipsDraw(); } catch (e) { fail(e); } };
      $('#d-go').onclick = async () => { const keep = r.exhibition_id === E.id;
        const patch = { exhibition_id: E.id, app_slug: null, live: true, content: snapshot(E), published_at: new Date().toISOString(), from_date: $('#d-from').value || null, to_date: $('#d-to').value || null, colour: keep ? r.colour || null : null };
        try { const row = await api.saveSlot(pick, patch); const i = slotRows.findIndex(s => s.slot === pick); if (i >= 0) slotRows[i] = { ...slotRows[i], ...patch, ...row }; else slotRows.push({ slot: pick, ...patch, ...row }); d.close(); chipsDraw();
          toast(`פורסמה בחדר ${pick}. המבקרים יראו אותה ברחוב`); } catch (e) { fail(e); } };
    };
    draw(); d.showModal();
  }
  async function walk() {
    if (!walls().length && !E.plinths.length) return toast('אין עדיין עבודות על הקירות');
    toast('בונה את החדר בגודל מלא…'); const r = slotRows.find(s => s.exhibition_id === E.id);
    try { await walkStreet([roomOf(E, r && r.colour || '#8a8a8a')], 0, viewerCss, synth); } catch (e) { fail(e); }
  }

  // ---- wiring ------------------------------------------------------------------------------------------------------------------------
  $('#f-title').oninput = e => mutate(() => { E.title = e.target.value; }, 'title');
  $('#b-undo').onclick = () => doUndo(undo, redo); $('#b-redo').onclick = () => doUndo(redo, undo);
  $('#b-walk').onclick = walk; $('#b-pub').onclick = publishDlg;
  window.onbeforeunload = () => (dirty ? 'יש שינויים שנשמרים' : undefined);
  const leave = () => { if (dirty) save(); window.onbeforeunload = null; removeEventListener('hashchange', leave); };
  addEventListener('hashchange', leave);
  addEventListener('resize', () => { if ($('#el')) elDraw(); });
  keys(e => {
    if (e.target.closest('input,textarea,select,dialog')) { if (e.key === 'Escape' && e.target.closest('#lq')) e.target.blur(); return; }
    const k = e.key, c = e.ctrlKey || e.metaKey;
    if (c && k.toLowerCase() === 'z') { e.preventDefault(); return e.shiftKey ? doUndo(redo, undo) : doUndo(undo, redo); }
    if (c && k.toLowerCase() === 'y') { e.preventDefault(); return doUndo(redo, undo); }
    if (c && k.toLowerCase() === 'a') { e.preventDefault(); sel = new Set([...walls().map(o => o.id), ...E.plinths.map(p => p.id)]); tab = 'sel'; return paintSel(); }
    if (c && k.toLowerCase() === 's') { e.preventDefault(); return save(); }
    if (c) return;
    if (k === 'Escape') { if (sel.size || libSel.size) { sel.clear(); libSel.clear(); libDraw(); paintSel(); } return; }
    if (k === 'Delete' || k === 'Backspace') { e.preventDefault(); return removeSel(); }
    if (k === 'Enter' && libSel.size) return addWorks([...libSel]);
    if (k === 'w' || k === 'W') return walk();
    if (k === 'Tab') { e.preventDefault(); const o = ['all', '0', '1', '2']; view = o[(o.indexOf(view) + (e.shiftKey ? 3 : 1)) % 4]; toolsDraw(); return elDraw(); }
    const d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1] }[k];
    if (d && sel.size) { e.preventDefault(); const st = (e.shiftKey ? 10 : 1) / 100, ws = walls().filter(o => sel.has(o.id)), ps = E.plinths.filter(p => sel.has(p.id));
      mutate(() => { ws.forEach(o => { o.s = +clampS(o, o.s + d[0] * st).toFixed(3); o.y = +clampY(o, o.y + d[1] * st).toFixed(3); }); ps.forEach(p => { const [w, dd] = pl(p); p.x = +Math.min(Math.max(p.x + d[0] * st, w / 200 + 0.3), RW - w / 200 - 0.3).toFixed(2); p.z = +Math.min(Math.max(p.z + d[1] * st, dd / 200 + 0.3), RD - dd / 200 - 0.3).toFixed(2); }); }, 'nudge');
      elDraw(); planDraw(); insDraw(); }
  });
  drawAll(); paintSaved();
}
