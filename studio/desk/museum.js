// The museum, on the Desk: the street is fixed (eight rooms, four on each side of one long walk); here the owner decides which
// exhibition hangs in which room, whether visitors see it, between which dates, and the colour of its threshold.
// The exhibitions themselves are made in exedit.js. Data: museum_exhibitions (drafts, admin only) and museum_slots (what is
// live: a slot carries a copy of its exhibition, so editing a draft never changes what visitors see until it is published).
import { api, APP, guest, abs } from './data.js';

export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const SLOTS = 8, isNorth = k => k % 2 === 1;                           // room 1 is on the north side, 2 on the south, ...
export const PRESETS = ['#e3351c', '#e3981c', '#e3ca1c', '#6cc424', '#1ce3ca', '#1c67e3', '#7a2be3', '#e31c9a'];
export const todayIL = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jerusalem' });
const dshort = d => d ? new Date(d + 'T12:00').toLocaleDateString('he-IL', { day: 'numeric', month: 'short' }) : '';
const FIELDS = ['exhibition_id', 'app_slug', 'live', 'from_date', 'to_date', 'colour', 'content', 'published_at'];

// what visitors get of an exhibition: only what the street needs (the walls, the plinths, the words)
export function snapshot(E) {
  const wall = E.works.filter(w => w.s != null && w.kind !== 'object' && w.image);
  const objects = {};
  for (const w of E.works) if (w.kind === 'object') objects[w.id] = { id: w.id, title: w.title, image: abs(w.image), w: +w.width || 30, h: +w.height || 40 };
  const keep = w => ({ id: w.id, title: w.title, artist: w.artist || '', year: w.year || '', medium: w.medium || '', image: abs(w.image), thumb: abs(w.thumb || w.image), width: +w.width || null, height: +w.height || null, s: +(+w.s).toFixed(3), y: +(+w.y).toFixed(3), note: w.note || '' });
  return { title: E.title || 'Untitled', curator: E.curator || '', text: E.text || '', works: wall.map(keep), plinths: (E.plinths || []).map(p => ({ id: p.id, x: p.x, z: p.z, size: p.size, work: p.work })), objects };
}
// the state of a slot, for its chip
export function stateOf(row) {
  if (!row || (!row.exhibition_id && !row.app_slug)) return { k: 'empty', t: 'ריק' };
  if (!row.live) return { k: 'draft', t: 'לא מוצג' };
  const t = todayIL();
  if (row.from_date && row.from_date > t) return { k: 'soon', t: `מתוזמן · ${dshort(row.from_date)}` };
  if (row.to_date && row.to_date < t) return { k: 'over', t: 'הסתיים' };
  return { k: 'live', t: row.to_date ? `מוצג · עד ${dshort(row.to_date)}` : 'מוצג' };
}

let APPSH = null;                                                          // the exhibitions the app brings with it (read-only here)
export const appShows = () => APPSH || (APPSH = Promise.all([fetch(APP + 'data/virtual.json').then(r => r.json()), fetch(APP + 'data/demo/world.json').then(r => r.json()).catch(() => ({ shows: [] }))]).then(([v, w]) => {
  const cols = v.streetColours || {};
  return [...(v.shows || []).map(x => ({ slug: x.slug, title: x.title, n: (x.works || []).length, cover: x.cover ? abs(x.cover) : '' })),
    ...(w.shows || []).filter(x => x.kind === 'online' && (x.works || []).length >= 3).map(x => ({ slug: x.slug, title: x.title, n: x.works.length, cover: '' }))].map(x => ({ ...x, colour: cols[x.slug] || null }));
}).catch(() => []));

// --- the street as the viewer builds it (a preview at the Desk's full resolution) --------------------------------------------
export function roomOf(E, colour) {
  const objects = {}; for (const w of E.works) if (w.kind === 'object') objects[w.id] = { id: w.id, title: w.title, image: abs(w.image), w: +w.width || 30, h: +w.height || 40 };
  return { slug: E.id || 'draft', title: E.title || 'Untitled', curator: E.curator, text: E.text, plinths: E.plinths || [], objects, labels: true, colour: colour || '#8a8a8a',
    works: E.works.filter(w => w.s != null && w.kind !== 'object' && w.image).map(w => ({ ...w, image: abs(w.image), thumb: abs(w.thumb || w.image), artist: { name: w.artist || '' } })) };
}
export async function walkStreet(rooms, focus, viewerCss, synth) {
  const [{ buildStreet }, { openSpace }] = await Promise.all([synth(), import(APP + 'space/space.js'), viewerCss()]);
  const made = await buildStreet(rooms, u => u, w => w.thumb || w.image, { focus });
  const works = rooms.flatMap(r => r.works);
  window.__spaceView = await openSpace({ spec: made.spec, works, src: u => u, onClose: () => { window.__spaceView = null; } });
}

// === the home of the museum: the street, its eight rooms, the exhibitions ===================================================
export async function home(ctx) {
  const { page, toast, fail, $: _$, keys } = ctx;
  let [EX, rows, apps] = await Promise.all([api.exhibitions(), api.slots(), appShows()]);
  const SL = new Map(rows.map(s => [s.slot, s]));
  let sel = +sessionStorage.getItem('mu-sel') || (rows[0] ? rows[0].slot : 1);
  const undo = [], redo = [], AUTO = {};
  const exOf = id => EX.find(x => x.id === id), appOf = slug => apps.find(x => x.slug === slug);
  const title = r => r ? (r.exhibition_id ? (exOf(r.exhibition_id) || { title: '—' }).title : appOf(r.app_slug) ? appOf(r.app_slug).title : r.app_slug) : '';
  const cover = r => { if (!r) return ''; const e = r.exhibition_id && exOf(r.exhibition_id), w = e && (e.works || []).find(x => x.thumb || x.image);
    return w ? abs(w.thumb || w.image) : r.app_slug && appOf(r.app_slug) ? appOf(r.app_slug).cover : ''; };
  const colourOf = r => r ? (r.colour || (r.app_slug && (appOf(r.app_slug) || {}).colour) || (r.exhibition_id && AUTO[r.exhibition_id]) || null) : null;
  const hasLive = rows => [...SL.values()].some(s => s.live);

  async function auto(r) {                                                     // the colour the street would suggest for an exhibition, from its works
    const e = r && r.exhibition_id && exOf(r.exhibition_id); if (!e || AUTO[e.id] || r.colour) return;
    const w = (e.works || []).filter(x => x.thumb || x.image).slice(0, 4); if (!w.length) return;
    try { const { suggestColour, slugHue } = await ctx.synth(); AUTO[e.id] = await suggestColour(w.map(x => abs(x.thumb || x.image)), u => u, slugHue(e.id)); paintDoors(); } catch {}
  }
  function paintDoors() { $$('.rm').forEach(el => { const c = colourOf(SL.get(+el.dataset.k)); el.style.setProperty('--door', c || '#cfc8b8'); }); const s = $('#ip-auto'); if (s) { const c = colourOf(SL.get(sel)); if (c && !SL.get(sel).colour) s.style.background = c; } }

  async function commit(label, changes) {                                       // changes: [[slot, patch | null (clear)]]; remembered for undo
    const prev = changes.map(([k]) => [k, SL.get(k) ? { ...SL.get(k) } : null]);
    for (const [k, p] of changes) {
      if (p === null) { await api.clearSlot(k); SL.delete(k); }
      else { const base = SL.get(k) || { slot: k, exhibition_id: null, app_slug: null, live: false, from_date: null, to_date: null, colour: null, content: null, published_at: null };
        const row = await api.saveSlot(k, p); SL.set(k, { ...base, ...p, ...row }); }
    }
    undo.push({ label, prev }); redo.length = 0; if (undo.length > 40) undo.shift();
  }
  async function restore(from, to) {
    const e = from.pop(); if (!e) return toast('אין מה לבטל');
    const cur = e.prev.map(([k]) => [k, SL.get(k) ? { ...SL.get(k) } : null]);
    for (const [k, r] of e.prev) { if (!r) { await api.clearSlot(k); SL.delete(k); } else { const p = {}; FIELDS.forEach(f => { p[f] = r[f] ?? null; }); p.live = !!r.live; await api.saveSlot(k, p); SL.set(k, r); } }
    to.push({ label: e.label, prev: cur }); draw(); toast(from === undo ? `בוטל: ${e.label}` : `שוחזר: ${e.label}`);
  }
  const act = async (label, changes) => { try { await commit(label, changes); draw(); toast(label, () => restore(undo, redo)); } catch (e) { fail(e); } };
  const blank = { exhibition_id: null, app_slug: null, live: false, from_date: null, to_date: null, colour: null, content: null, published_at: null };
  const place = (k, what) => {                                                  // an exhibition (ex:<id>) or one of the app's (app:<slug>) into room k; it is not shown until published
    const [kind, id] = what.split(/:(.*)/s); const old = SL.get(k);
    return act(`${kind === 'ex' ? exOf(id).title : appOf(id).title} בחדר ${k}`, [[k, { ...blank, from_date: old ? old.from_date : null, to_date: old ? old.to_date : null, colour: old ? old.colour : null, exhibition_id: kind === 'ex' ? id : null, app_slug: kind === 'app' ? id : null }]]);
  };
  const swap = (a, b) => { const A = SL.get(a), B = SL.get(b); if (a === b || (!A && !B)) return;
    const take = r => { const p = {}; FIELDS.forEach(f => { p[f] = r ? r[f] ?? null : null; }); if (r) p.live = !!r.live; return p; };
    return act(`חדר ${a} ⇄ חדר ${b}`, [[a, B ? take(B) : null], [b, A ? take(A) : null]]); };
  const publish = k => { const r = SL.get(k); if (!r) return; let patch = { live: true };
    if (r.exhibition_id) { const e = exOf(r.exhibition_id); patch = { live: true, content: snapshot(e), published_at: new Date().toISOString() }; }
    return act(`${title(r)} מוצגת למבקרים`, [[k, patch]]); };
  const dirtyOf = r => r && r.live && r.exhibition_id && exOf(r.exhibition_id) && JSON.stringify(snapshot(exOf(r.exhibition_id))) !== JSON.stringify(r.content);

  // ---- drawing ---------------------------------------------------------------------------------------------------------
  const room = k => {
    const r = SL.get(k), st = stateOf(r), img = cover(r), c = colourOf(r);
    return `<div class="rm ${r && (r.exhibition_id || r.app_slug) ? '' : 'empty'} s-${st.k}" data-k="${k}" tabindex="0" role="button" aria-pressed="${k === sel}" draggable="true" aria-label="חדר ${k}: ${esc(title(r) || 'ריק')}" style="--door:${c || '#cfc8b8'}">
      <span class="rm-n">${k}</span>${st.k !== 'empty' ? `<span class="rm-st ${st.k}">${esc(st.t)}</span>` : ''}
      ${r && (r.exhibition_id || r.app_slug) ? `<div class="rm-im" style="${img ? `background-image:url('${esc(img)}')` : ''}"></div><div class="rm-tx"><b dir="auto">${esc(title(r))}</b>${r.from_date || r.to_date ? `<span>${dshort(r.from_date) || '…'} – ${dshort(r.to_date) || '…'}</span>` : ''}${dirtyOf(r) ? '<em>יש שינויים שלא פורסמו</em>' : ''}</div>`
        : '<div class="rm-em"><b>+</b><span>גרור לכאן תערוכה</span></div>'}
      <i class="rm-door"></i></div>`;
  };
  const exCard = e => { const w = (e.works || []).find(x => x.thumb || x.image), at = [...SL.values()].filter(s => s.exhibition_id === e.id).map(s => s.slot);
    return `<a class="tc" href="#/museum/ex/${e.id}" draggable="true" data-drag="ex:${e.id}"><div class="tc-im" style="${w ? `background-image:url('${esc(abs(w.thumb || w.image))}')` : ''}"></div><b dir="auto">${esc(e.title)}</b>
      <span>${(e.works || []).filter(x => x.kind !== 'object').length} עבודות${(e.plinths || []).length ? ` · ${(e.plinths || []).length} פסלים` : ''}${at.length ? ` · חדר ${at.join(', ')}` : ''}</span></a>`; };
  const appCard = a => `<div class="tc app" draggable="true" data-drag="app:${esc(a.slug)}" title="תערוכה מובנית באפליקציה: אפשר לשבץ אותה, לא לערוך כאן"><div class="tc-im" style="${a.cover ? `background-image:url('${esc(a.cover)}')` : ''}"></div><b dir="auto">${esc(a.title)}</b><span>מובנית · ${a.n} עבודות</span></div>`;

  function inspector() {
    const r = SL.get(sel), st = stateOf(r), has = r && (r.exhibition_id || r.app_slug), c = colourOf(r), isApp = r && r.app_slug, dirty = dirtyOf(r);
    return `<div class="ip-h"><div><span class="kind">חדר ${sel} · ${isNorth(sel) ? 'צד צפון' : 'צד דרום'}</span><h2 dir="auto">${esc(title(r) || 'חדר ריק')}</h2></div>${st.k !== 'empty' ? `<span class="chip ${st.k === 'live' ? 'ok' : st.k === 'draft' ? '' : 'warn'}">${esc(st.t)}</span>` : ''}</div>
    <label class="field">התערוכה בחדר<select id="ip-ex"><option value="">— ריק —</option>
      <optgroup label="התערוכות שלי">${EX.map(e => `<option value="ex:${e.id}" ${r && r.exhibition_id === e.id ? 'selected' : ''}>${esc(e.title)}</option>`).join('')}</optgroup>
      <optgroup label="מובנות באפליקציה">${apps.map(a => `<option value="app:${esc(a.slug)}" ${r && r.app_slug === a.slug ? 'selected' : ''}>${esc(a.title)}</option>`).join('')}</optgroup></select></label>
    ${has ? `<div class="ip-sw"><div><b>מוצגת למבקרים</b><span class="muted small">${r.live ? (r.published_at ? 'פורסמה ' + new Date(r.published_at).toLocaleDateString('he-IL') : 'מוצגת') : 'עדיין לא. המבקרים לא רואים אותה'}</span></div>
      <button type="button" class="sw" id="ip-live" role="switch" aria-checked="${!!r.live}" aria-label="מוצגת למבקרים"><i></i></button></div>
    ${dirty ? '<button type="button" class="btn p wide" id="ip-update">עדכן את מה שהמבקרים רואים</button><p class="muted small" style="margin:-4px 0 0">הטיוטה השתנתה מאז הפרסום האחרון.</p>' : ''}
    <div class="two-f"><label class="field">מתאריך<input type="date" id="ip-from" value="${r.from_date || ''}"></label><label class="field">עד תאריך<input type="date" id="ip-to" value="${r.to_date || ''}"></label></div>
    <p class="muted small" style="margin:-6px 0 0">בלי תאריכים: פתוחה תמיד כשהיא מוצגת.</p>
    <div class="field">צבע הסף בכניסה<div class="sw-row"><button type="button" class="stl-b sug" id="ip-auto" data-c="" style="background:${r.colour ? '#fff' : c || '#cfc8b8'}" title="אוטומטי, לפי העבודות" aria-label="צבע אוטומטי"></button>${PRESETS.map(p => `<button type="button" class="stl-b ${r.colour === p ? 'on' : ''}" data-c="${p}" style="background:${p}" aria-label="${p}"></button>`).join('')}<label class="stl-c" title="צבע אחר"><input type="color" id="ip-col" value="${r.colour || c || '#808080'}"></label></div>
      <span class="muted small">${r.colour ? 'נבחר ידנית' : 'אוטומטי, מהצבעים של העבודות'}</span></div>
    <div class="ip-acts">${isApp ? '<p class="muted small">תערוכה מובנית באפליקציה: אפשר לשבץ, לתזמן ולצבוע, אבל העבודות נערכות מחוץ לשולחן.</p>' : '<a class="btn p wide" href="#/museum/ex/' + r.exhibition_id + '">ערוך את התערוכה <kbd>Enter</kbd></a><button type="button" class="btn wide" id="ip-walk">צפה בחדר <kbd>W</kbd></button>'}
      <button type="button" class="btn q d wide" id="ip-clear">פנה את החדר <kbd>Del</kbd></button></div>` : '<p class="muted">גרור תערוכה מהמגש אל החדר, או בחר אותה כאן.</p>'}`;
  }
  function draw(keepIns) {
    sessionStorage.setItem('mu-sel', sel);
    const live = [...SL.values()].filter(s => s.live).length;
    page('museum', 'המוזיאון', `הרחוב קבוע, שמונה חדרים. כאן מחליטים איזו תערוכה תלויה בכל חדר, מתי, ובאיזה צבע · ${live} מוצגות`, `
    ${live ? '' : `<div class="soon" style="margin-bottom:16px">כרגע הרחוב רץ אוטומטית על התערוכות המובנות. ברגע שחדר אחד מוצג כאן, הרחוב מציג רק את החדרים שהגדרת. <button type="button" class="btn" id="adopt" style="margin-inline-start:10px;min-height:38px">התחל מהרחוב הנוכחי</button></div>`}
    <div class="mu"><div class="mu-main"><div class="mp" dir="ltr"><span class="mp-ent">כניסה ←</span>
      <div class="mp-row">${[1, 3, 5, 7].map(room).join('')}</div><div class="mp-st" aria-hidden="true"><span>הרחוב</span></div><div class="mp-row">${[2, 4, 6, 8].map(room).join('')}</div></div>
      <section class="tray"><div class="tray-h"><h2>התערוכות שלי</h2><span class="muted small">גרור אל חדר · לחיצה פותחת לעריכה</span><span class="grow"></span><button class="btn" id="walk-all">צפה ברחוב כולו</button><a class="btn p" href="#/museum/ex/new">תערוכה חדשה <kbd>N</kbd></a></div>
        <div class="tray-g">${EX.map(exCard).join('')}${EX.length ? '' : '<p class="muted">עוד אין תערוכות. התחל בתערוכה חדשה.</p>'}</div>
        ${apps.length ? `<details class="tray-a"><summary>תערוכות מובנות באפליקציה (${apps.length})</summary><div class="tray-g">${apps.map(appCard).join('')}</div></details>` : ''}</section></div>
      <aside class="ip" id="ip" aria-label="פרטי החדר">${inspector()}</aside></div>
    <div class="keys"><span><kbd>←</kbd><kbd>→</kbd><kbd>↑</kbd><kbd>↓</kbd> בין חדרים</span><span><kbd>Enter</kbd> עריכה</span><span><kbd>P</kbd> הצג/הסתר</span><span><kbd>W</kbd> צפייה</span><span><kbd>Del</kbd> פינוי</span><span><kbd>Ctrl Z</kbd> ביטול</span><span><kbd>N</kbd> תערוכה חדשה</span></div>`);
    $('main').classList.add('wide'); wire(); [...SL.values()].forEach(auto);
  }
  function select(k) { sel = k; sessionStorage.setItem('mu-sel', k); $$('.rm').forEach(e => e.setAttribute('aria-pressed', +e.dataset.k === k)); $('#ip').innerHTML = inspector(); wireIp(); auto(SL.get(k)); }
  async function walk(all) {
    const rooms = []; let focus = 0;
    for (let k = 1; k <= SLOTS; k++) { const r = SL.get(k); if (!r || !r.exhibition_id || !(all || k === sel)) continue; const e = exOf(r.exhibition_id); if (!e) continue;
      if (k === sel) focus = rooms.length; rooms.push(roomOf({ ...e, id: e.id }, colourOf(r) || '#8a8a8a')); }
    if (!rooms.length) return toast('אין כאן תערוכה שלי לצפות בה');
    toast('בונה את הרחוב…'); try { await walkStreet(rooms, focus, ctx.viewerCss, ctx.synth); } catch (e) { fail(e); }
  }
  function wireIp() {
    const r = SL.get(sel), on = (id, ev, f) => { const e = $(id); if (e) e[ev] = f; };
    on('#ip-ex', 'onchange', e => { const v = e.target.value; if (!v) { if (r) act(`חדר ${sel} פונה`, [[sel, null]]); } else place(sel, v); });
    on('#ip-live', 'onclick', () => { if (r.live) act(`${title(r)} הוסתרה`, [[sel, { live: false }]]); else publish(sel); });
    on('#ip-update', 'onclick', () => publish(sel));
    on('#ip-from', 'onchange', e => act('תאריך התחלה', [[sel, { from_date: e.target.value || null }]]));
    on('#ip-to', 'onchange', e => act('תאריך סיום', [[sel, { to_date: e.target.value || null }]]));
    $$('.sw-row .stl-b').forEach(b => { b.onclick = () => act('צבע הסף', [[sel, { colour: b.dataset.c || null }]]); });
    on('#ip-col', 'onchange', e => act('צבע הסף', [[sel, { colour: e.target.value.toLowerCase() }]]));
    on('#ip-walk', 'onclick', () => walk(false)); on('#ip-clear', 'onclick', () => act(`חדר ${sel} פונה`, [[sel, null]]));
  }
  function wire() {
    wireIp();
    $$('.rm').forEach(e => {
      e.onclick = () => select(+e.dataset.k); e.ondblclick = () => { const r = SL.get(+e.dataset.k); if (r && r.exhibition_id) location.hash = '#/museum/ex/' + r.exhibition_id; };
      e.ondragstart = ev => { ev.dataTransfer.setData('text/plain', 'room:' + e.dataset.k); ev.dataTransfer.effectAllowed = 'move'; };
      e.ondragover = ev => { ev.preventDefault(); e.classList.add('over'); }; e.ondragleave = () => e.classList.remove('over');
      e.ondrop = ev => { ev.preventDefault(); e.classList.remove('over'); const [t, id] = ev.dataTransfer.getData('text/plain').split(/:(.*)/s), k = +e.dataset.k; sel = k;
        if (t === 'room') swap(+id, k); else if (t === 'ex' || t === 'app') place(k, `${t}:${id}`); };
    });
    $$('[data-drag]').forEach(e => { e.ondragstart = ev => { ev.dataTransfer.setData('text/plain', e.dataset.drag); ev.dataTransfer.effectAllowed = 'copy'; }; });
    const ad = $('#adopt'); if (ad) ad.onclick = async () => {                      // start from what the street shows now: the app's six rooms, as they are
      const L = apps.slice(0, SLOTS); try { await commit('הרחוב הנוכחי', L.map((a, i) => [i + 1, { ...blank, app_slug: a.slug, live: true }])); draw(); toast('הרחוב הנוכחי הועתק לחדרים', () => restore(undo, redo)); } catch (e) { fail(e); } };
    $('#walk-all').onclick = () => walk(true);
  }
  keys(e => {
    if (e.target.closest('input,textarea,select') || e.metaKey && e.key !== 'z') return;
    const k = e.key, z = (e.ctrlKey || e.metaKey) && k.toLowerCase() === 'z';
    if (z) { e.preventDefault(); return e.shiftKey ? restore(redo, undo) : restore(undo, redo); }
    if (e.ctrlKey || e.altKey) return;
    if (/^[1-8]$/.test(k)) return select(+k);
    const col = Math.floor((sel - 1) / 2), north = isNorth(sel), go = { ArrowRight: [col + 1, north], ArrowLeft: [col - 1, north], ArrowUp: [col, true], ArrowDown: [col, false] }[k];
    if (go) { e.preventDefault(); const n = go[0] * 2 + (go[1] ? 1 : 2); if (n >= 1 && n <= SLOTS) select(n); return; }
    const r = SL.get(sel);
    if (k === 'Enter' && r && r.exhibition_id) location.hash = '#/museum/ex/' + r.exhibition_id;
    else if ((k === 'p' || k === 'P') && r && (r.exhibition_id || r.app_slug)) $('#ip-live') && $('#ip-live').click();
    else if ((k === 'w' || k === 'W') && r && r.exhibition_id) walk(false);
    else if ((k === 'Delete' || k === 'Backspace') && r) act(`חדר ${sel} פונה`, [[sel, null]]);
    else if (k === 'n' || k === 'N') location.hash = '#/museum/ex/new';
  });
  draw();
}
