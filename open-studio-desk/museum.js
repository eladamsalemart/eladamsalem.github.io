// (the Desk is published with every .js and .css file in this folder: see the Open Studio app workflow)
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

let APPSH = null;                                                          // the exhibitions the app brings with it (read-only here), with their works: the Desk shows the street as visitors walk it
const slugify = s => String(s).toLowerCase().normalize('NFKD').replace(/[^\w\s-]/g, '').trim().replace(/[\s_]+/g, '-') || 'untitled';      // (as the app names a work)
const getj = (u, d) => fetch(u).then(r => r.ok ? r.json() : d).catch(() => d);
// the app's real exhibitions that have a 3D space of their own (data/spaces/<slug>.json), by the slug the app gives them
const REAL = ['ritual', 'nature-of-man', 'bfa-graduate-exhibition'];
export const realShows = () => getj(APP + 'data/spaces/index.json', {}).then(idx => Promise.all(REAL.map(async slug => { const j = await getj(APP + `data/spaces/${slug}.json`, null); return j ? { slug, title: j.title || slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()), cover: idx[slug] ? abs(`data/spaces/${slug}/preview.jpg`) : '', n: (j.works || []).length || 0, kind: 'real', works: [] } : null; }))).then(l => l.filter(Boolean));
export const virtShows = rows => (rows || []).filter(x => x.status === 'published').map(x => { const w = (x.works || []).find(y => y && (y.thumb || y.image)); return { slug: 'show-' + String(x.id).slice(0, 8), title: x.title || 'Untitled', cover: w ? abs(w.thumb || w.image) : '', n: (x.works || []).length, kind: 'virt', works: [] }; });
export const appShows = () => APPSH || (APPSH = Promise.all([getj(APP + 'data/virtual.json', {}), getj(APP + 'data/demo/world.json', {}), getj('/content/works.json', [])]).then(([v, w, site]) => {
  const cols = v.streetColours || {}, W = new Map(), A = new Map((w.artists || []).map(a => [a.slug, a.name]));
  for (const x of site || []) { const k = slugify(`${x.title}-${x.year}`); if (!W.has(k)) W.set(k, { id: k, title: (x.title || 'Untitled').trim(), year: String(x.year || ''), medium: x.tech || '', image: x.image, thumb: x.image, artist: { name: 'Elad Amsalem' } }); }
  for (const x of w.works || []) W.set(x.slug, { id: x.slug, title: x.title, year: x.year, medium: x.medium, image: abs(x.image), thumb: abs(x.image), pairs: x.size ? [[x.size[1], x.size[0]]] : [], artist: { name: A.get(x.artist) || '' } });
  const mk = (x, cover) => ({ slug: x.slug, title: x.title, n: (x.works || []).length, cover, colour: cols[x.slug] || null, works: (x.works || []).map(s => W.get(s)).filter(Boolean) });
  return [...(v.shows || []).map(x => mk(x, x.cover ? abs(x.cover) : '')), ...(w.shows || []).filter(x => x.kind === 'online' && (x.works || []).length >= 3).map(x => mk(x, (x.images || [])[0] ? abs(x.images[0]) : ''))];
}).catch(() => []));

// one small dialog for the keyboard: the shortcuts live here, not in a row under the work
export function helpDlg(title, rows) {
  let d = $('#helpd'); if (!d) { d = document.createElement('dialog'); d.id = 'helpd'; d.className = 'dlg help'; document.body.append(d); }
  d.innerHTML = `<form method="dialog"><h2>${esc(title)}</h2><dl class="kl">${rows.map(([k, t]) => `<div><dt dir="ltr">${k.split(' ').map(x => x === '+' || x === '/' ? `<i>${x}</i>` : `<kbd>${esc(x)}</kbd>`).join('')}</dt><dd>${esc(t)}</dd></div>`).join('')}</dl><div class="dlg-b"><span class="grow"></span><button class="btn p">סגור <kbd>Esc</kbd></button></div></form>`;
  if (!d.open) d.showModal();
}

// --- the street as the viewer builds it (a preview at the Desk's full resolution) --------------------------------------------
export function roomOf(E, colour) {
  const objects = {}; for (const w of E.works) if (w.kind === 'object') objects[w.id] = { id: w.id, title: w.title, image: abs(w.image), w: +w.width || 30, h: +w.height || 40 };
  return { slug: E.id || 'draft', title: E.title || 'Untitled', curator: E.curator, text: E.text, plinths: E.plinths || [], objects, labels: true, colour: colour || '#8a8a8a',
    works: E.works.filter(w => w.s != null && w.kind !== 'object' && w.image).map(w => ({ ...w, image: abs(w.image), thumb: abs(w.thumb || w.image), artist: { name: w.artist || '' } })) };
}
export async function walkStreet(rooms, focus, viewerCss, synth) {
  const [SY, { openSpace }] = await Promise.all([synth(), import(APP + 'space/space.js'), viewerCss()]);
  const made = await (SY.buildSky || SY.buildStreet)(rooms, u => u, w => w.thumb || w.image, focus >= 0 ? { focus } : {});      // (the preview is the museum as visitors get it: one building, eight houses)
  if (made.spec.outdoors && /^data[/]/.test(made.spec.outdoors.treeline || '')) made.spec.outdoors.treeline = APP + made.spec.outdoors.treeline;
  const works = rooms.flatMap(r => r.works);
  window.__spaceView = await openSpace({ spec: made.spec, works, src: u => u, onClose: () => { window.__spaceView = null; } });
}

// === the home of the museum: the street, its eight rooms, the exhibitions ===================================================
export async function home(ctx) {
  const { page, toast, fail, $: _$, keys } = ctx;
  let [EX, rows, apps, real, virt] = await Promise.all([api.exhibitions(), api.slots(), appShows(), realShows().catch(() => []), api.shows().then(virtShows).catch(() => [])]);
  const extras = [...real, ...virt];
  if (guest) for (const r of rows) { const e = r.exhibition_id && EX.find(x => x.id === r.exhibition_id); if (e && r.content) r.content = snapshot(e); }      // (the demo's copies are made the way a publish makes them)
  const SL = new Map(rows.map(s => [s.slot, s]));
  let sel = +sessionStorage.getItem('mu-sel') || (rows[0] ? rows[0].slot : 1);
  const undo = [], redo = [], AUTO = {};
  const exOf = id => EX.find(x => x.id === id), appOf = slug => apps.find(x => x.slug === slug) || extras.find(x => x.slug === slug);
  const title = r => r ? (r.exhibition_id ? (exOf(r.exhibition_id) || { title: '—' }).title : appOf(r.app_slug) ? appOf(r.app_slug).title : r.app_slug) : '';
  const cover = r => { if (!r) return ''; const e = r.exhibition_id && exOf(r.exhibition_id), w = e && (e.works || []).find(x => x.thumb || x.image);
    return w ? abs(w.thumb || w.image) : r.app_slug && appOf(r.app_slug) ? appOf(r.app_slug).cover : ''; };
  const colourOf = r => r ? (r.colour || (r.app_slug && (appOf(r.app_slug) || {}).colour) || (r.exhibition_id && AUTO[r.exhibition_id]) || null) : null;
  const hasLive = rows => [...SL.values()].some(s => s.live);
  const SYm = await ctx.synth().catch(() => null);
  // ---- the building's plan (stage 2): spaces are added, removed and placed here; the description is written to the table museum_plan and the app builds whatever is valid ----
  let PLAN = await api.plan().catch(() => null), selSp = null, placing = null;
  const SECS = await getj(APP + 'data/museum/sections.json', {}).then(j => (j.sections || []).filter(x => !x.hidden)).catch(() => []);       // the museum's own themed sections (History: Renaissance, ...), built by the curator agent
  const pHist = [], pFut = [];                                                    // the plan's own undo / redo (descriptions)
  const secOf = sp => sp && sp.type === 'section' ? SECS.find(x => x.id === sp.section) : null;
  const planNow = () => SYm && SYm.planOf ? SYm.planOf(PLAN) : null;
  const rad = d => d * Math.PI / 180;
  // a space's footprint on the floor: four corners (house: 8 x 6 m and its porch; history wing: a long chain of bays), a little larger than the walls so the neighbour's walls never touch
  const footOf = (sp, pad = 0) => { const door = sp.door, o = sp.type === 'house' ? [Math.cos(rad(sp.dir)), Math.sin(rad(sp.dir))] : sp.dir, R = [-o[1], o[0]];
    const [l0, l1, d0, d1] = sp.type === 'house' ? [-4.1, 4.1, -0.3, 7.9] : [-5, 11, 0, 41], c = (a, b) => [door[0] + R[0] * a + o[0] * b, door[1] + R[1] * a + o[1] * b];
    return [c(l0 - pad, d0 - pad), c(l1 + pad, d0 - pad), c(l1 + pad, d1 + pad), c(l0 - pad, d1 + pad)]; };
  const sat = (A, B) => { for (const P of [A, B]) for (let i = 0; i < 4; i++) { const p = P[i], q = P[(i + 1) % 4], nx = q[1] - p[1], nz = p[0] - q[0], pr = Q => Q.map(v => v[0] * nx + v[1] * nz), a = pr(A), b = pr(B);
      if (Math.max(...a) < Math.min(...b) || Math.max(...b) < Math.min(...a)) return false; } return true; };
  const rectPts = (x0, z0, x1, z1) => [[x0, z0], [x1, z0], [x1, z1], [x0, z1]];
  const whyNot = (sp, P) => {                                                    // null when the place is good, else what is in the way (Hebrew)
    const F = footOf(sp, 0.4), { w, d } = P.hall;
    if (F.some(([x, z]) => x < 0.6 || z < 0.6 || x > w - 0.6 || z > d - 0.6)) return 'חורג מהבניין';
    for (const o of P.spaces) if (o.id !== sp.id && sat(F, footOf(o))) return 'נוגע במרחב אחר';
    if (P.pool && sat(F, rectPts(P.pool[0] - 1, P.pool[1] - 1, P.pool[2] + 1, P.pool[3] + 1))) return 'על הבריכה';
    for (const [x, z] of P.piers) if (sat(F, rectPts(x - 1.5, z - 1.5, x + 1.5, z + 1.5))) return 'על עמוד';
    for (const s of P.stands) { const a = rad(s.rot), c = [Math.cos(a), Math.sin(a)], n = [-c[1], c[0]], h = s.len / 2;
      if (sat(F, [[s.x - c[0] * h - n[0] * 0.8, s.z - c[1] * h - n[1] * 0.8], [s.x + c[0] * h - n[0] * 0.8, s.z + c[1] * h - n[1] * 0.8], [s.x + c[0] * h + n[0] * 0.8, s.z + c[1] * h + n[1] * 0.8], [s.x - c[0] * h + n[0] * 0.8, s.z - c[1] * h + n[1] * 0.8]])) return 'על קולישה'; }
    if (sat(F, rectPts(P.entrance.at[0] - 2, d - 9, P.entrance.at[1] + 2, d))) return 'חוסם את הכניסה';
    if (sat(F, rectPts(P.start.pos[0] - 3, P.start.pos[1] - 3, P.start.pos[0] + 3, P.start.pos[1] + 3))) return 'על נקודת ההגעה';
    return null; };
  const nameOf = sp => sp.name ? sp.name : sp.type === 'section' ? (secOf(sp) ? secOf(sp).title : 'אגף היסטוריה') : sp.tour ? `חלל מקורי: ${sp.tour}` : sp.slot > 8 ? `בית נוסף ${sp.slot}` : `בית ${sp.slot}`;
  const baseOf = () => JSON.parse(JSON.stringify(SYm.planOf(null)));
  const writePlan = async next => { await api.savePlan(next); PLAN = next; };
  const saveSpaces = async (label, edit, keep) => {                              // edit(spaces) -> the new list; the plan keeps its own history (buttons and Ctrl+Z when the plan is in use)
    const P = planNow(), prev = PLAN, next = { ...JSON.parse(JSON.stringify(P)), spaces: edit(JSON.parse(JSON.stringify(P.spaces))) };
    try { await writePlan(next); pHist.push(prev || baseOf()); pFut.length = 0; if (pHist.length > 40) pHist.shift(); if (!keep) selSp = null; draw(true); toast(label, () => planStep(pHist, pFut)); } catch (e) { fail(e); } };
  const planStep = async (from, to) => {                                         // undo (from = pHist) or redo (from = pFut)
    const prev = from.pop(); if (!prev) return toast('אין מה לבטל בתוכנית');
    try { to.push(PLAN || baseOf()); await writePlan(prev); selSp = null; draw(true); toast(from === pHist ? 'בוטל שינוי בתוכנית' : 'שוחזר שינוי בתוכנית'); } catch (e) { from.push(prev); to.pop(); fail(e); } };
  const turnOf = sp => sp.type === 'house' ? { ...sp, dir: ((sp.dir || 0) + 90) % 360 } : { ...sp, dir: [-sp.dir[1], sp.dir[0]] };
  const extraSlots = () => { const P = planNow(); return P ? P.spaces.filter(sp => sp.type === 'house' && !sp.tour && sp.slot > 8).map(sp => sp.slot) : []; };
  const inPlan = x => { const P = planNow(); return !!P && P.spaces.some(s => s.type === 'section' && s.section === x.id); };
  const baseBlock = () => {
    const P = planNow(); if (!P) return '';
    const W = P.hall.w, D = P.hall.d;
    const shapes = P.spaces.map(sp => { const F = footOf(sp), pts = F.map(q => q.map(v => v.toFixed(1)).join(',')).join(' '), cx = F.reduce((t, q) => t + q[0], 0) / 4, cz = F.reduce((t, q) => t + q[1], 0) / 4, on = sp.id === selSp;
      return `<g class="b-g${on ? ' on' : ''}" data-id="${esc(sp.id)}" tabindex="0" role="button" aria-label="${esc(nameOf(sp))}" aria-pressed="${on}"><polygon points="${pts}" class="${sp.type === 'house' ? (sp.tour ? 'b-r' : 'b-h') : 'b-s'}"/><text x="${cx.toFixed(1)}" y="${(cz + 1.1).toFixed(1)}" class="${sp.type === 'house' ? 'b-n' : 'b-t'}">${esc(sp.type === 'section' ? (sp.name || (secOf(sp) || {}).title || 'אגף היסטוריה') : sp.name ? sp.name : sp.tour ? 'חלל מקורי' : sp.slot)}</text></g>`; }).join('');
    const pool = P.pool ? `<rect x="${P.pool[0]}" y="${P.pool[1]}" width="${P.pool[2] - P.pool[0]}" height="${P.pool[3] - P.pool[1]}" class="b-p"/>` : '';
    const piers = P.piers.map(([x, z]) => `<rect x="${x - 0.7}" y="${z - 0.7}" width="1.4" height="1.4" class="b-pier"/>`).join('');
    const sel = P.spaces.find(s => s.id === selSp);
    return `<section class="mp-base"><div class="tray-h"><h2>תוכנית הבניין</h2><span class="muted small">בניין אחד: ${W} × ${D} מ׳, גג אחד, זכוכית מסביב. ${P.spaces.length} מרחבים. לחיצה על מרחב בוחרת אותו.</span></div>
      ${placing ? `<div class="mp-place" role="status"><b>${esc(placing.label)}</b> · לחץ על התוכנית היכן תהיה הדלת (החדר נמשך לכיוון ${esc(placing.dirName)}). <span id="mp-why" class="muted"></span> <button type="button" class="btn" id="mp-cancel">ביטול <kbd>Esc</kbd></button></div>` : ''}
      <svg viewBox="-2 -2 ${W + 4} ${D + 4}" class="mp-svg${placing ? ' placing' : ''}" id="mp-svg" role="img" aria-label="תוכנית הבניין" dir="ltr"><rect x="0" y="0" width="${W}" height="${D}" class="b-hall"/>${pool}${piers}${shapes}<g id="mp-ghost"></g></svg>
      <div class="mp-acts"><button type="button" class="btn p" id="mp-add">הוסף מרחב</button>
      <button type="button" class="btn" id="mp-move" ${sel ? '' : 'disabled'}>הזז</button><button type="button" class="btn" id="mp-rot" ${sel ? '' : 'disabled'}>סובב 90°</button><button type="button" class="btn" id="mp-ren" ${sel ? '' : 'disabled'}>שנה שם</button>
      ${sel && sel.type === 'section' ? '<button type="button" class="btn" id="mp-walk">היכנס לאגף (תלת־ממד)</button>' : ''}
      <button type="button" class="btn" id="mp-undo" ${pHist.length ? '' : 'disabled'}>בטל</button><button type="button" class="btn" id="mp-redo" ${pFut.length ? '' : 'disabled'}>שחזר</button>
      <button type="button" class="btn" id="mp-del" ${sel ? '' : 'disabled'}>${sel ? 'הסר: ' + esc(nameOf(sel)) : 'הסר מרחב'}</button>
      <span class="muted small">${sel ? (sel.type === 'house' && !sel.tour && sel.slot <= 8 ? 'התערוכה שבבית נשארת בחדר שלה כאן, אבל המבקרים לא יראו אותה עד שהבית יוחזר.' : 'ההסרה רק מוחקת את המרחב מהבניין. אפשר לבטל מיד, ואפשר להוסיף שוב.') : 'בחר מרחב בתוכנית כדי להסיר אותו, או הוסף חדש.'}</span></div></section>
      <dialog id="mp-dlg" class="dlg"><form method="dialog" id="mp-f"><h2>הוספת מרחב</h2>
        <label class="field">סוג<select id="mp-type"><option value="house">ביתן לתערוכה (תערוכה מהשולחן, עם מספר חדר חדש)</option>${SECS.filter(x => !planNow() || !planNow().spaces.some(s => s.section === x.id)).map(x => `<option value="sec:${esc(x.id)}">אגף נושא: ${esc(x.title)} (שחזור)</option>`).join('')}<option value="tour">תערוכה של אמן עם החלל המקורי שלה (קשת אל הסיור)</option></select></label>
        <label class="field" id="mp-slugw" hidden>שם התערוכה בקישור (למשל ritual)<input id="mp-slug" type="text" dir="ltr" placeholder="ritual"></label>
        <label class="field">החדר נמשך לכיוון (הדלת פונה אל הכיכר)<select id="mp-dir"><option value="0">מזרח (ימינה בתוכנית)</option><option value="90">דרום (למטה)</option><option value="180">מערב (שמאלה)</option><option value="270">צפון (למעלה)</option></select></label>
        <p class="muted small" id="mp-err" style="color:#a03020"></p>
        <div class="dlg-b"><button class="btn" value="x">ביטול</button><button class="btn p" id="mp-go" value="go">המשך: בחירת מקום</button></div></form></dialog>`;
  };
  function wireBase() {
    const svg = $('#mp-svg'); if (!svg) return;
    const pt = e => { const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(svg.getScreenCTM().inverse()); return [Math.round(p.x), Math.round(p.y)]; };
    $$('.b-g').forEach(g => { const pick = () => { selSp = selSp === g.dataset.id ? null : g.dataset.id; draw(true); }; g.onclick = ev => { if (placing) return; ev.stopPropagation(); pick(); }; g.onkeydown = ev => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); pick(); } }; });
    const del = $('#mp-del'); if (del) del.onclick = () => { const sp = planNow().spaces.find(s => s.id === selSp); if (!sp) return; selSp = null; saveSpaces(`${nameOf(sp)} הוסר מהבניין`, L => L.filter(s => s.id !== sp.id)); };
    const dlg = $('#mp-dlg'), type = $('#mp-type'), slugw = $('#mp-slugw');
    $('#mp-add').onclick = () => { $('#mp-err').textContent = ''; slugw.hidden = type.value !== 'tour'; dlg.showModal(); };
    const mv = $('#mp-move'); if (mv) mv.onclick = () => { const sp = planNow().spaces.find(x => x.id === selSp); if (sp) { placing = { sp, label: `הזזת ${nameOf(sp)}`, dirName: 'כמו שהוא', move: true }; draw(true); } };
    const rt = $('#mp-rot'); if (rt) rt.onclick = () => { const P = planNow(), sp = P.spaces.find(x => x.id === selSp); if (!sp) return; const t = turnOf(sp), why = whyNot(t, P); if (why) return toast('אי אפשר לסובב: ' + why); saveSpaces(`${nameOf(sp)} סובב`, L => L.map(x => x.id === sp.id ? t : x), true); };
    const rn = $('#mp-ren'); if (rn) rn.onclick = () => { const sp = planNow().spaces.find(x => x.id === selSp); if (!sp) return; const v = prompt('שם המרחב (ריק = השם הרגיל)', sp.name || ''); if (v === null) return; saveSpaces('שם המרחב עודכן', L => L.map(x => { if (x.id !== sp.id) return x; const y = { ...x }; if (v.trim()) y.name = v.trim().slice(0, 40); else delete y.name; return y; }), true); };
    const un = $('#mp-undo'), re = $('#mp-redo'); if (un) un.onclick = () => planStep(pHist, pFut); if (re) re.onclick = () => planStep(pFut, pHist);
    const wk = $('#mp-walk'); if (wk) wk.onclick = () => walkWing(planNow().spaces.find(x => x.id === selSp));
    type.onchange = () => { slugw.hidden = type.value !== 'tour'; };
    $('#mp-go').onclick = async ev => { ev.preventDefault(); const P = planNow(), err = $('#mp-err'), dir = +$('#mp-dir').value, dirName = { 0: 'מזרח', 90: 'דרום', 180: 'מערב', 270: 'צפון' }[dir];
      const used = new Set(P.spaces.map(s => s.slot).filter(Boolean)); let sp, label;
      if (type.value === 'tour') { const slug = $('#mp-slug').value.trim().toLowerCase(); if (!/^[a-z0-9-]{2,60}$/.test(slug)) { err.textContent = 'כתוב את שם התערוכה באנגלית, כמו ritual'; return; }
        if (P.spaces.some(s => s.tour === slug)) { err.textContent = 'התערוכה הזאת כבר בבניין'; return; }
        const ok = await fetch(APP + `data/spaces/${slug}.json`).then(r => r.ok).catch(() => false); if (!ok) { err.textContent = 'לתערוכה הזאת אין עדיין חלל מצולם באפליקציה (data/spaces/' + slug + '.json)'; return; }
        let n = 50; while (used.has(n)) n++; sp = { id: slug, type: 'house', slot: n, tour: slug, dir }; label = `חלל מקורי: ${slug}`; }
      else if (type.value.startsWith('sec:')) { const id = type.value.slice(4), sec = SECS.find(x => x.id === id), B = SYm.planOf(null).spaces.find(x => x.section === id);
        const d0 = sec && sec.door ? { door: [sec.door.x, sec.door.z], dir: sec.door.o } : null; sp = { id, type: 'section', section: id, door: (B || d0 || { door: [14, 47] }).door, dir: (B || d0 || { dir: [0, -1] }).dir }; label = `אגף ${sec ? sec.title : id}`; }
      else { let n = 9; while (used.has(n)) n++; if (n > 48) { err.textContent = 'אין עוד מקום למספרי חדרים'; return; } sp = { id: 'house-' + n, type: 'house', slot: n, dir }; label = `בית ${n}`; }
      placing = { sp, label, dirName: sp.type === 'section' ? 'הכיוון המקורי' : dirName }; dlg.close(); selSp = null; draw(true); };
    const cancel = $('#mp-cancel'); if (cancel) cancel.onclick = () => { placing = null; draw(true); };
    if (placing) {
      const ghostOf = e => { const sp = { ...placing.sp, door: pt(e) }; return { sp, why: whyNot(sp, planNow()) }; };
      svg.onpointermove = e => { const { sp, why } = ghostOf(e); $('#mp-ghost').innerHTML = `<polygon points="${footOf(sp).map(q => q.join(',')).join(' ')}" class="${why ? 'b-bad' : 'b-ok'}"/>`; $('#mp-why').textContent = why || (placing.move ? `אפשר: הדלת מ־(${placing.sp.door[0]}, ${placing.sp.door[1]}) אל (${sp.door[0]}, ${sp.door[1]})` : 'אפשר'); };
      svg.onclick = e => { const { sp, why } = ghostOf(e); if (why) { toast('אי אפשר כאן: ' + why); return; } const mv = placing.move; placing = null; if (mv) saveSpaces(`${nameOf(sp)} הוזז`, L => L.map(x => x.id === sp.id ? sp : x), true); else saveSpaces(`${nameOf(sp)} נוסף לבניין`, L => [...L, sp]); };
    }
  }

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
    return `<div class="ip-h"><div><span class="kind">חדר ${sel} · ${sel > 8 ? 'בית נוסף' : sel <= 4 ? 'צד צפון' : sel <= 6 ? 'צד מזרח' : 'צד דרום'}</span><h2 dir="auto">${esc(title(r) || 'חדר ריק')}</h2></div>${st.k !== 'empty' ? `<span class="chip ${st.k === 'live' ? 'ok' : st.k === 'draft' ? '' : 'warn'}">${esc(st.t)}</span>` : ''}</div>
    <label class="field">התערוכה בחדר<select id="ip-ex"><option value="">— ריק —</option>
      <optgroup label="התערוכות שלי">${EX.map(e => `<option value="ex:${e.id}" ${r && r.exhibition_id === e.id ? 'selected' : ''}>${esc(e.title)}</option>`).join('')}</optgroup>
      ${real.length ? `<optgroup label="תערוכות אמיתיות">${real.map(a => `<option value="app:${esc(a.slug)}" ${r && r.app_slug === a.slug ? 'selected' : ''}>${esc(a.title)}</option>`).join('')}</optgroup>` : ''}
      ${virt.length ? `<optgroup label="תערוכות וירטואליות של אמנים">${virt.map(a => `<option value="app:${esc(a.slug)}" ${r && r.app_slug === a.slug ? 'selected' : ''}>${esc(a.title)}</option>`).join('')}</optgroup>` : ''}
      <optgroup label="דמו (בדויות, לא מוצגות ב״תערוכות״)">${apps.map(a => `<option value="app:${esc(a.slug)}" ${r && r.app_slug === a.slug ? 'selected' : ''}>${esc(a.title)}</option>`).join('')}</optgroup></select></label>
    ${has ? `<div class="ip-sw"><div><b>מוצגת למבקרים</b><span class="muted small">${r.live ? (r.published_at ? 'פורסמה ' + new Date(r.published_at).toLocaleDateString('he-IL') : 'מוצגת') : 'עדיין לא. המבקרים לא רואים אותה'}</span></div>
      <button type="button" class="sw" id="ip-live" role="switch" aria-checked="${!!r.live}" aria-label="מוצגת למבקרים"><i></i></button></div>
    ${dirty ? '<button type="button" class="btn p wide" id="ip-update">עדכן את מה שהמבקרים רואים</button><p class="muted small" style="margin:-4px 0 0">הטיוטה השתנתה מאז הפרסום האחרון.</p>' : ''}
    <div class="two-f"><label class="field">מתאריך<input type="date" id="ip-from" value="${r.from_date || ''}"></label><label class="field">עד תאריך<input type="date" id="ip-to" value="${r.to_date || ''}"></label></div>
    <p class="muted small" style="margin:-6px 0 0">בלי תאריכים: פתוחה תמיד כשהיא מוצגת.</p>
    <div class="field">צבע הסף בכניסה<div class="sw-row"><button type="button" class="stl-b sug" id="ip-auto" data-c="" style="background:${r.colour ? '#fff' : c || '#cfc8b8'}" title="אוטומטי, לפי העבודות" aria-label="צבע אוטומטי"></button>${PRESETS.map(p => `<button type="button" class="stl-b ${r.colour === p ? 'on' : ''}" data-c="${p}" style="background:${p}" aria-label="${p}"></button>`).join('')}<label class="stl-c" title="צבע אחר"><input type="color" id="ip-col" value="${r.colour || c || '#808080'}"></label></div>
      <span class="muted small">${r.colour ? 'נבחר ידנית' : 'אוטומטי, מהצבעים של העבודות'}</span></div>
    <div class="ip-acts">${isApp ? '<p class="muted small">' + (extras.some(x => x.slug === r.app_slug) ? 'תערוכה אמיתית של האפליקציה: המבקר נכנס אליה דרך הקשת שבחדר, אל החלל שלה. העבודות נערכות מחוץ לשולחן.' : 'תערוכת דמו (בדויה): אפשר לשבץ, לתזמן ולצבוע, אבל העבודות נערכות מחוץ לשולחן.') + '</p>' : '<a class="btn p wide" href="#/museum/ex/' + r.exhibition_id + '">ערוך את התערוכה <kbd>Enter</kbd></a>'}<button type="button" class="btn wide" id="ip-walk">צפה בחדר <kbd>W</kbd></button>
      <button type="button" class="btn q d wide" id="ip-clear">פנה את החדר <kbd>Del</kbd></button></div>` : '<p class="muted">גרור תערוכה מהמגש אל החדר, או בחר אותה כאן.</p>'}`;
  }
  function draw(keepIns) {
    sessionStorage.setItem('mu-sel', sel);
    const live = [...SL.values()].filter(s => s.live).length;
    page('museum', 'המוזיאון', `הבניין קבוע: שמונה בתים סביב הכיכר. כאן מחליטים איזו תערוכה תלויה בכל בית, מתי, ובאיזה צבע · ${live} מוצגות`, `
    ${live ? '' : `<div class="soon" style="margin-bottom:16px">כרגע המוזיאון רץ אוטומטית על התערוכות המובנות. ברגע שחדר אחד מוצג כאן, המוזיאון מציג רק את החדרים שהגדרת. <button type="button" class="btn" id="adopt" style="margin-inline-start:10px;min-height:38px">התחל מהרחוב הנוכחי</button></div>`}
    <div class="mu"><div class="mu-main"><div class="mp" dir="ltr"><span class="mp-ent">כניסה ←</span><button type="button" class="ib mp-help" id="mu-help" title="קיצורי מקשים (?)" aria-label="קיצורי מקשים">?</button>
      <div class="mp-row">${[1, 3, 5, 7].map(room).join('')}</div><div class="mp-st" aria-hidden="true"><span>הכיכר</span></div><div class="mp-row">${[2, 4, 6, 8].map(room).join('')}</div>${extraSlots().length ? `<div class="mp-more"><span class="muted small">בתים נוספים</span><div class="mp-row">${extraSlots().map(room).join('')}</div></div>` : ''}</div>
      ${baseBlock()}<section class="tray"><div class="tray-h"><h2>תערוכות ביתנים</h2><span class="muted small">התערוכות שלי, תערוכות אמיתיות ותערוכות אמנים, בביתנים הממוספרים · גרור אל חדר · לחיצה פותחת לעריכה</span><span class="grow"></span><button class="btn" id="walk-all">צפה ברחוב כולו</button><a class="btn p" href="#/museum/ex/new">תערוכה חדשה <kbd>N</kbd></a></div>
        <div class="tray-g">${EX.map(exCard).join('')}${EX.length ? '' : '<p class="muted">עוד אין תערוכות. התחל בתערוכה חדשה.</p>'}</div>
        ${extras.length ? `<details class="tray-a"><summary>תערוכות אמיתיות ווירטואליות של אמנים (${extras.length})</summary><div class="tray-g">${extras.map(a => `<div class="tc app" draggable="true" data-drag="app:${esc(a.slug)}" title="${a.kind === 'real' ? 'תערוכה אמיתית עם חלל משלה' : 'תערוכה וירטואלית של אמן'}: גרור אל חדר"><div class="tc-im" style="${a.cover ? `background-image:url('${esc(a.cover)}')` : ''}"></div><b dir="auto">${esc(a.title)}</b><span>${a.kind === 'real' ? 'אמיתית' : 'וירטואלית'}${a.n ? ' · ' + a.n + ' עבודות' : ''}</span></div>`).join('')}</div></details>` : ''}
        ${apps.length ? `<details class="tray-a"><summary>תערוכות דמו (בדויות) (${apps.length})</summary><div class="tray-g">${apps.map(appCard).join('')}</div></details>` : ''}</section>
      <section class="tray tray-themed"><div class="tray-h"><h2>תערוכות נושא של האפליקציה</h2><span class="muted small">אגפי המוזיאון עצמו (היסטוריה: רנסנס, בארוק…), נבנים על ידי סוכן האוצר · כחול מקווקו בתוכנית</span><span class="grow"></span><button class="btn p" id="th-add" ${SECS.some(x => !inPlan(x)) ? '' : 'disabled'}>הוסף אגף נושא</button></div>
        <div class="tray-g">${SECS.map(x => `<div class="tc th" data-sec="${esc(x.id)}"><div class="tc-im" style="background:#e8eef5"></div><b dir="auto">${esc(x.title)}</b><span>${esc(x.years || '')} · ${inPlan(x) ? 'בבניין' : 'לא בבניין'}</span><span class="th-b">${inPlan(x) ? '<button type="button" class="btn" data-sw="' + esc(x.id) + '">היכנס</button><button type="button" class="btn" data-sp="' + esc(x.id) + '">בחר בתוכנית</button>' : '<button type="button" class="btn p" data-sr="' + esc(x.id) + '">החזר לבניין</button>'}</span></div>`).join('') || '<p class="muted">אין אגפי נושא עדיין.</p>'}</div></section></div>
      <aside class="ip" id="ip" aria-label="פרטי החדר">${inspector()}</aside></div>`);
    $('main').classList.add('wide'); wire(); [...SL.values()].forEach(auto);
  }
  function select(k) { sel = k; sessionStorage.setItem('mu-sel', k); $$('.rm').forEach(e => e.setAttribute('aria-pressed', +e.dataset.k === k)); $('#ip').innerHTML = inspector(); wireIp(); auto(SL.get(k)); }
  async function walkWing(sp) {
    if (!sp) return; const SY = await ctx.synth(), sec = secOf(sp); if (!sec) return toast('אין נתונים לאגף הזה');
    toast('בונה את האגף…');
    try {
      const credits = {}; for (const c of await getj(APP + sec.folder + '/credits.json', [])) credits[c.slug] = { ...c, image: APP + `${sec.folder}/works/${c.slug}.jpg`, thumb: APP + `${sec.folder}/works/${c.slug}-s.jpg` };
      const [, { openSpace }] = await Promise.all([0, import(APP + 'space/space.js'), ctx.viewerCss()]);
      const made = await SY.buildSky([], u => u, w => w.thumb || w.image, { plan: PLAN, sections: [{ ...JSON.parse(JSON.stringify(sec), (k, v) => typeof v === 'string' && /^data\/museum\//.test(v) ? APP + v : v), credits }] }), [dx, dz] = sp.dir;
      if (made.spec.outdoors && /^data\//.test(made.spec.outdoors.treeline || '')) made.spec.outdoors.treeline = APP + made.spec.outdoors.treeline;
      made.spec.start = { pos: [sp.door[0] + dx * 3, sp.door[1] + dz * 3], look: [sp.door[0] + dx * 14, sp.door[1] + dz * 14] };
      window.__spaceView = await openSpace({ spec: made.spec, works: [], src: u => u, onClose: () => { window.__spaceView = null; } });
    } catch (e) { fail(e); }
  }
  async function walk(all) {                                                  // one room, or the whole street as it is set here (rooms not shown yet too: this is the owner's preview)
    const rooms = []; let focus = 0; const SY = await ctx.synth();
    for (let k = 1; k <= 64; k++) { const r = SL.get(k); if (!r || !(all || k === sel)) continue;
      const e = r.exhibition_id && exOf(r.exhibition_id), a = r.app_slug && appOf(r.app_slug); let room = null;
      if (e) { if (!r.colour && !AUTO[e.id]) await auto(r); room = roomOf({ ...e, id: e.id }, colourOf(r) || '#8a8a8a'); }
      else if (a && a.works.length) room = { slug: a.slug, title: a.title, works: a.works, colour: colourOf(r) || await SY.suggestColour(a.works.slice(0, 4).map(w => w.thumb), u => u, SY.slugHue(a.slug)) };
      if (!room) continue; if (k === sel) focus = rooms.length; rooms.push(room); }
    if (!rooms.length) return toast(all ? 'אין עדיין תערוכות בחדרים' : 'בחדר הזה אין תערוכה לצפות בה');
    toast(all ? 'בונה את המוזיאון…' : 'בונה את הבית…'); try { await walkStreet(rooms, all ? -1 : focus, ctx.viewerCss, ctx.synth); } catch (e) { fail(e); }
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
    wireIp(); wireBase();
    $$('.rm').forEach(e => {
      e.onclick = () => select(+e.dataset.k); e.ondblclick = () => { const r = SL.get(+e.dataset.k); if (r && r.exhibition_id) location.hash = '#/museum/ex/' + r.exhibition_id; };
      e.ondragstart = ev => { ev.dataTransfer.setData('text/plain', 'room:' + e.dataset.k); ev.dataTransfer.effectAllowed = 'move'; };
      e.ondragover = ev => { ev.preventDefault(); e.classList.add('over'); }; e.ondragleave = () => e.classList.remove('over');
      e.ondrop = ev => { ev.preventDefault(); e.classList.remove('over'); const [t, id] = ev.dataTransfer.getData('text/plain').split(/:(.*)/s), k = +e.dataset.k; sel = k;
        if (t === 'room') swap(+id, k); else if (t === 'ex' || t === 'app') place(k, `${t}:${id}`); };
    });
    $$('[data-drag]').forEach(e => { e.ondragstart = ev => { ev.dataTransfer.setData('text/plain', e.dataset.drag); ev.dataTransfer.effectAllowed = 'copy'; }; });
    $$('[data-sw]').forEach(b => { b.onclick = () => walkWing(planNow().spaces.find(s => s.section === b.dataset.sw)); });
    $$('[data-sp]').forEach(b => { b.onclick = () => { selSp = planNow().spaces.find(s => s.section === b.dataset.sp).id; draw(true); $('#mp-svg').scrollIntoView({ block: 'center' }); }; });
    $$('[data-sr],#th-add').forEach(b => { b.onclick = () => { const id = b.dataset.sr || (SECS.find(x => !inPlan(x)) || {}).id; if (!id) return; $('#mp-type').value = 'sec:' + id; $('#mp-go').click(); $('#mp-svg').scrollIntoView({ block: 'center' }); }; });
    const ad = $('#adopt'); if (ad) ad.onclick = async () => {                      // start from what the street shows now: the app's six rooms, as they are
      const L = apps.slice(0, SLOTS); try { await commit('הרחוב הנוכחי', L.map((a, i) => [i + 1, { ...blank, app_slug: a.slug, live: true }])); draw(); toast('הרחוב הנוכחי הועתק לחדרים', () => restore(undo, redo)); } catch (e) { fail(e); } };
    $('#walk-all').onclick = () => walk(true); $('#mu-help').onclick = help;
  }
  const help = () => helpDlg('קיצורי מקשים · המוזיאון', [['← → ↑ ↓', 'מעבר בין חדרים'], ['1 – 8', 'בחירת חדר'], ['Enter', 'עריכת התערוכה שבחדר'], ['P', 'הצג או הסתר למבקרים'], ['W', 'צפייה בחדר בתלת־ממד'], ['Shift + W', 'צפייה ברחוב כולו'], ['Del', 'פינוי החדר'], ['Ctrl + Z', 'ביטול'], ['Ctrl + Shift + Z', 'שחזור'], ['N', 'תערוכה חדשה']]);
  keys(e => {
    const el = e.target; if (el && el.closest && el.closest('input,textarea,select,dialog') || e.metaKey && e.key !== 'z') return;
    if (e.key === 'Escape' && placing) { placing = null; return draw(true); }
    if (e.key === '?') return help();
    const k = e.key, z = (e.ctrlKey || e.metaKey) && k.toLowerCase() === 'z';
    if (z) { e.preventDefault(); const a = e.shiftKey ? redo : undo; return !a.length && (pHist.length || pFut.length) ? (e.shiftKey ? planStep(pFut, pHist) : planStep(pHist, pFut)) : e.shiftKey ? restore(redo, undo) : restore(undo, redo); }
    if (e.ctrlKey || e.altKey) return;
    if (/^[1-8]$/.test(k)) return select(+k);
    const col = Math.floor((sel - 1) / 2), north = isNorth(sel), go = { ArrowRight: [col + 1, north], ArrowLeft: [col - 1, north], ArrowUp: [col, true], ArrowDown: [col, false] }[k];
    if (go) { e.preventDefault(); const n = go[0] * 2 + (go[1] ? 1 : 2); if (n >= 1 && n <= SLOTS) select(n); return; }
    const r = SL.get(sel);
    if (k === 'Enter' && r && r.exhibition_id) location.hash = '#/museum/ex/' + r.exhibition_id;
    else if ((k === 'p' || k === 'P') && r && (r.exhibition_id || r.app_slug)) $('#ip-live') && $('#ip-live').click();
    else if (k === 'W' && e.shiftKey) walk(true);
    else if (k === 'w' || k === 'W') walk(false);
    else if ((k === 'Delete' || k === 'Backspace') && r) act(`חדר ${sel} פונה`, [[sel, null]]);
    else if (k === 'n' || k === 'N') location.hash = '#/museum/ex/new';
  });
  draw();
}
