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
export const realShows = () => getj(APP + 'data/spaces/index.json', {}).then(idx => Promise.all(REAL.map(async slug => { const j = await getj(APP + `data/spaces/${slug}.json`, null); return j ? { slug, title: j.title || slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()), cover: idx[slug] ? abs(`data/spaces/${slug}/preview.jpg`) : '', n: (j.works || []).length || 0, kind: 'real', original: { tour: APP + `data/spaces/${slug}.json`, base: APP }, works: (j.works || []).filter(w => w.imageSmall || w.image).map(w => ({ id: slugify(w.work || 'work'), title: w.work || '', image: abs(w.imageSmall || w.image), thumb: abs(w.imageSmall || w.image), width: w.size ? w.size[1] : null, height: w.size ? w.size[0] : null, artist: { name: '' } })) } : null; }))).then(l => l.filter(Boolean));
const vw = x => (x.works || []).filter(y => y && (y.thumb || y.image)).map(y => ({ ...y, id: y.id, title: y.title || '', image: abs(y.image || y.thumb), thumb: abs(y.thumb || y.image), artist: { name: y.artist || '' } }));
export const virtShows = rows => (rows || []).filter(x => x.status === 'published').map(x => { const w = (x.works || []).find(y => y && (y.thumb || y.image)); return { slug: 'show-' + String(x.id).slice(0, 8), title: x.title || 'Untitled', cover: w ? abs(w.thumb || w.image) : '', n: (x.works || []).length, kind: 'virt', works: vw(x), original: x.room ? { design: { title: x.title || 'Untitled', room: x.room, paint: x.paint, centre: x.centre, plinths: x.plinths || [], text: Array.isArray(x.text) ? x.text.join(' ') : (x.text || ''), placements: Object.fromEntries((x.works || []).filter(w => w && w.id && w.wall).map(w => [w.id, { wall: w.wall, a: w.a, y: w.y }])), works: vw(x) }, base: APP } : undefined }; });
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
export async function walkStreet(rooms, focus, viewerCss, synth, more = {}) {
  const [SY, { openSpace }] = await Promise.all([synth(), import(APP + 'space/space.js'), viewerCss()]);
  const made = await (SY.buildSky || SY.buildStreet)(rooms, u => u, w => w.thumb || w.image, { ...more, ...(focus >= 0 ? { focus } : {}) });      // (the preview is the museum as visitors get it: one building, eight houses)
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
  let PLAN = await api.plan().catch(() => null), selSp = null, placing = null, selIt = null, bigBoard = false;      // selIt: a coulisse ('st:<id>') or a pedestal ('ob:<n>') chosen on the plan; bigBoard: the plan fills the screen
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
  const nameOf = sp => sp.name ? sp.name : sp.type === 'section' ? (secOf(sp) ? secOf(sp).title : 'אגף היסטוריה') : sp.tour ? `חלל מקורי: ${sp.tour}` : `ביתן ${sp.slot}`;
  const baseOf = () => JSON.parse(JSON.stringify(SYm.planOf(null)));
  const writePlan = async next => { await api.savePlan(next); PLAN = next; };
  const saveSpaces = async (label, edit, keep) => {                              // edit(spaces) -> the new list; the plan keeps its own history (buttons and Ctrl+Z when the plan is in use)
    const P = planNow(), prev = PLAN, next = { ...JSON.parse(JSON.stringify(P)), spaces: edit(JSON.parse(JSON.stringify(P.spaces))) };
    try { await writePlan(next); pHist.push(prev || baseOf()); pFut.length = 0; if (pHist.length > 40) pHist.shift(); if (!keep) selSp = null; draw(true); toast(label, () => planStep(pHist, pFut)); } catch (e) { fail(e); } };
  const planStep = async (from, to) => {                                         // undo (from = pHist) or redo (from = pFut)
    const prev = from.pop(); if (!prev) return toast('אין מה לבטל בתוכנית');
    try { to.push(PLAN || baseOf()); await writePlan(prev); selSp = null; selIt = null; draw(true); toast(from === pHist ? 'בוטל שינוי בתוכנית' : 'שוחזר שינוי בתוכנית'); } catch (e) { from.push(prev); to.pop(); fail(e); } };
  const turnOf = sp => sp.type === 'house' ? { ...sp, dir: ((sp.dir || 0) + 90) % 360 } : { ...sp, dir: [-sp.dir[1], sp.dir[0]] };
  // ---- the hall's own furniture, drawn and arranged on the plan: coulisses (freestanding walls: x, z, length, angle, height; the works of an exhibition on their faces) and pedestals ([x, z, size, exhibition])
  const PED = { s: 0.3, m: 0.4, l: 0.6 }, PEDN = { s: 'קטן', m: 'בינוני', l: 'גדול' };
  const snap = v => Math.round(v * 4) / 4;
  const itemOf = (P, id) => { if (!id) return null; if (id.startsWith('st:')) { const q = P.stands.find(x => x.id === id.slice(3)); return q ? { kind: 'st', q } : null; } const k = +id.slice(3), q = P.objects[k]; return q ? { kind: 'ob', k, q } : null; };
  const itemFoot = (kind, q) => { if (kind === 'ob') { const h = Math.max(0.5, (PED[q[2]] || 0.4) / 2 + 0.3); return rectPts(q[0] - h, q[1] - h, q[0] + h, q[1] + h); }
    const a = rad(q.rot), c = [Math.cos(a), Math.sin(a)], n = [-c[1], c[0]], h = q.len / 2, w = 0.6;
    return [[q.x - c[0] * h - n[0] * w, q.z - c[1] * h - n[1] * w], [q.x + c[0] * h - n[0] * w, q.z + c[1] * h - n[1] * w], [q.x + c[0] * h + n[0] * w, q.z + c[1] * h + n[1] * w], [q.x - c[0] * h + n[0] * w, q.z - c[1] * h + n[1] * w]]; };
  const itemWhy = (P, kind, q) => {                                              // null when the place is free (hall edge, pavilions, pool, piers, the way in and the arrival point stay clear)
    const F = itemFoot(kind, q), { w, d } = P.hall;
    if (F.some(([x, z]) => x < 0.3 || z < 0.3 || x > w - 0.3 || z > d - 0.3)) return 'חורג מהבניין';
    for (const o of P.spaces) if (sat(F, footOf(o, 0.2))) return 'על ' + nameOf(o);
    if (P.pool && sat(F, rectPts(P.pool[0] - 0.5, P.pool[1] - 0.5, P.pool[2] + 0.5, P.pool[3] + 0.5))) return 'על הבריכה';
    for (const [x, z] of P.piers) if (sat(F, rectPts(x - 1, z - 1, x + 1, z + 1))) return 'על עמוד';
    if (sat(F, rectPts(P.entrance.at[0] - 1.5, d - 8, P.entrance.at[1] + 1.5, d))) return 'חוסם את הכניסה';
    if (sat(F, rectPts(P.start.pos[0] - 1.5, P.start.pos[1] - 1.5, P.start.pos[0] + 1.5, P.start.pos[1] + 1.5))) return 'על נקודת ההגעה';
    return null; };
  const savePlan = async (label, mut, keep) => {                                 // mut(copy of the plan) changes stands / objects; own history, like the spaces
    const P = planNow(), prev = PLAN, next = JSON.parse(JSON.stringify(P)); mut(next);
    try { await writePlan(next); pHist.push(prev || baseOf()); pFut.length = 0; if (pHist.length > 40) pHist.shift(); if (!keep) selIt = null; draw(true); toast(label, () => planStep(pHist, pFut)); } catch (e) { fail(e); } };
  const freeSpot = (P, kind, mk) => { const cx = P.hall.w / 2, cz = P.hall.d / 2;
    for (let r = 0; r < 40; r += 2) for (let a = 0; a < 360; a += 30) { const q = mk(snap(cx + Math.cos(rad(a)) * r), snap(cz + Math.sin(rad(a)) * r)); if (!itemWhy(P, kind, q) && (kind !== 'st' || (!itemWhy(P, kind, { ...q, len: 7 }) && !itemWhy(P, kind, { ...q, len: 7, rot: 90 })))) return q; } return mk(snap(cx), snap(cz)); };      // (a coulisse needs room to be made longer and turned)
  const showsInUse = () => { const P = planNow(), out = [], seen = new Set(), add = (v, t) => { if (v && !seen.has(v)) { seen.add(v); out.push([v, t || v]); } };
    for (const r of SL.values()) { if (r.exhibition_id) add(r.exhibition_id, (exOf(r.exhibition_id) || {}).title); else if (r.app_slug) add(r.app_slug, (appOf(r.app_slug) || {}).title); }
    for (const sp of P.spaces) if (sp.tour) add(sp.tour, (appOf(sp.tour) || {}).title); return out; };
  const showSel = (id, cur, none) => `<select id="${id}"><option value="">לפי הסדר (אוטומטי)</option>${none ? `<option value="none"${cur === 'none' ? ' selected' : ''}>${none}</option>` : ''}${showsInUse().map(([v, t]) => `<option value="${esc(v)}"${cur === v ? ' selected' : ''}>${esc(t)}</option>`).join('')}</select>`;
  const extraSlots = () => { const P = planNow(); return P ? P.spaces.filter(sp => sp.type === 'house' && !sp.tour && sp.slot > 8).map(sp => sp.slot) : []; };
  const inPlan = x => { const P = planNow(); return !!P && P.spaces.some(s => s.type === 'section' && s.section === x.id); };
  // ==== the page: the building's plan on top (draw and arrange the spaces), the curator's wall below (what hangs where, the themed wings, the exhibitions to hang) ====
  const housesOfPlan = () => { const P = planNow(); return P ? P.spaces.filter(sp => sp.type === 'house') : []; };
  const spOfSlot = k => housesOfPlan().find(sp => sp.slot === k && !sp.tour);
  const isTour = sp => sp && sp.type === 'house' && sp.tour;
  const DIRN = d => ({ 0: 'מזרח', 90: 'דרום', 180: 'מערב', 270: 'צפון' })[((Math.round((d || 0) / 90) * 90) % 360 + 360) % 360];
  const svgPlan = () => {
    const P = planNow(); if (!P) return '';
    const W = P.hall.w, D = P.hall.d;
    const grid = []; for (let x = 8; x < W; x += 8) grid.push(`<line x1="${x}" y1="0" x2="${x}" y2="${D}"/>`); for (let z = 8; z < D; z += 8) grid.push(`<line x1="0" y1="${z}" x2="${W}" y2="${z}"/>`);
    const shapes = P.spaces.map(sp => { const F = footOf(sp), pts = F.map(q => q.map(v => v.toFixed(1)).join(',')).join(' '), cx = F.reduce((t, q) => t + q[0], 0) / 4, cz = F.reduce((t, q) => t + q[1], 0) / 4, on = sp.id === selSp;
      const r = sp.type === 'house' && !sp.tour ? SL.get(sp.slot) : null, full = r && (r.exhibition_id || r.app_slug), c = r ? colourOf(r) : null;
      const cls = sp.type === 'section' ? 'b-s' : sp.tour ? 'b-r' : full ? 'b-h' : 'b-h b-e';
      const label = sp.type === 'section' ? (sp.name || (secOf(sp) || {}).title || 'אגף') : sp.name || (sp.tour ? (appOf(sp.tour) || { title: sp.tour }).title : String(sp.slot));
      const rot = sp.type === 'section' && Math.abs(sp.dir[1]) > Math.abs(sp.dir[0]) ? ` transform="rotate(-90 ${cx.toFixed(1)} ${cz.toFixed(1)})"` : '';
      return `<g class="b-g${on ? ' on' : ''}" data-id="${esc(sp.id)}" tabindex="0" role="button" aria-label="${esc(nameOf(sp))}" aria-pressed="${on}"><polygon points="${pts}" class="${cls}"/>${c && full ? `<polygon points="${F.slice(0, 2).map(q => q.map(v => v.toFixed(1)).join(',')).join(' ')}" class="b-door" style="stroke:${esc(c)}"/>` : ''}<text x="${cx.toFixed(1)}" y="${(cz + 1).toFixed(1)}" class="${sp.type === 'section' ? 'b-t' : sp.tour ? 'b-tr' : 'b-n'}"${rot}>${esc(label)}</text></g>`; }).join('');
    const pool = P.pool ? `<rect x="${P.pool[0]}" y="${P.pool[1]}" width="${P.pool[2] - P.pool[0]}" height="${P.pool[3] - P.pool[1]}" rx="1" class="b-p"/>` : '';
    const piers = P.piers.map(([x, z]) => `<rect x="${x - 0.7}" y="${z - 0.7}" width="1.4" height="1.4" class="b-pier"/>`).join('');
    const items = P.stands.map(q => { const on = selIt === 'st:' + q.id, nm = q.show && q.show !== 'none' ? (showsInUse().find(x => x[0] === q.show) || [0, ''])[1] : '';
        return `<g class="b-it b-st${on ? ' on' : ''}" data-it="st:${esc(q.id)}" transform="translate(${q.x} ${q.z}) rotate(${q.rot})" tabindex="0" role="button" aria-label="קולישה, אורך ${q.len} מ׳"><rect x="${-q.len / 2 - 0.3}" y="-1.1" width="${q.len + 0.6}" height="2.2" class="b-hit"/><rect x="${-q.len / 2}" y="-0.25" width="${q.len}" height="0.5" class="b-stb"/>${on ? `<circle cx="${q.len / 2}" cy="0" r="0.5" class="b-knob" data-knob="1"/>` : ''}${nm ? `<text x="0" y="-0.7" class="b-itt" transform="rotate(${-q.rot})">${esc(nm.slice(0, 16))}</text>` : ''}</g>`; }).join('')
      + P.objects.map((q, k) => { const w = Math.max(0.8, PED[q[2]] || 0.4) , on = selIt === 'ob:' + k;
        return `<g class="b-it b-pd${on ? ' on' : ''}" data-it="ob:${k}" transform="translate(${q[0]} ${q[1]})" tabindex="0" role="button" aria-label="פדסטל ${PEDN[q[2]] || 'בינוני'}"><rect x="-1" y="-1" width="2" height="2" class="b-hit"/><rect x="${-w / 2}" y="${-w / 2}" width="${w}" height="${w}" class="b-pdb"/>${q[3] === 'none' ? '' : '<circle r="0.18" class="b-pdd"/>'}</g>`; }).join('');
    const ent = `<rect x="${P.entrance.at[0]}" y="${D - 0.6}" width="${P.entrance.at[1] - P.entrance.at[0]}" height="1.2" class="b-ent"/><text x="${(P.entrance.at[0] + P.entrance.at[1]) / 2}" y="${D - 1.6}" class="b-et">כניסה</text>`;
    return `<svg viewBox="-2 -2 ${W + 4} ${D + 4}" class="mp-svg${placing ? ' placing' : ''}" id="mp-svg" role="group" aria-label="תוכנית הבניין: ${P.spaces.length} מרחבים" dir="ltr"><rect x="0" y="0" width="${W}" height="${D}" class="b-hall"/><g class="b-grid">${grid.join('')}</g>${pool}${piers}${ent}${shapes}${items}<g id="mp-ghost"></g></svg>`;
  };
  const studio = () => {
    const P = planNow(); if (!P) return '';
    const nH = P.spaces.filter(s => s.type === 'house').length, nW = P.spaces.filter(s => s.type === 'section').length, sp = P.spaces.find(s => s.id === selSp), it = itemOf(P, selIt);
    return `<section class="mx-studio${bigBoard ? ' full' : ''}" aria-label="תוכנית הבניין">
      <div class="mx-bar"><div class="mx-t"><h2>תוכנית הבניין</h2><span>${P.hall.w} × ${P.hall.d} מ׳ · ${nH} ביתנים · ${nW} אגפי נושא · ${P.stands.length} קוליסות · ${P.objects.length} פדסטלים</span></div><span class="grow"></span>
        <div class="mx-tools" role="toolbar" aria-label="כלי התוכנית"><button type="button" class="tb" id="mp-add">＋ ביתן</button><button type="button" class="tb" id="it-addst" title="קיר חופשי באמצע האולם, עם יצירות על שני צדדיו">＋ קולישה</button><button type="button" class="tb" id="it-addpd" title="בסיס לפסל או לעבודה בודדת">＋ פדסטל</button><button type="button" class="tb" id="mp-addw" ${SECS.some(x => !inPlan(x)) ? '' : 'disabled'}>＋ אגף נושא</button><i class="sep"></i>
          <button type="button" class="tb ic" id="mp-undo" title="בטל שינוי בתוכנית (Ctrl+Z)" aria-label="בטל" ${pHist.length ? '' : 'disabled'}>↶</button><button type="button" class="tb ic" id="mp-redo" title="שחזר (Ctrl+Shift+Z)" aria-label="שחזר" ${pFut.length ? '' : 'disabled'}>↷</button><i class="sep"></i>
          <button type="button" class="tb" id="mp-full" aria-pressed="${bigBoard}" title="פתח את הלוח על כל המסך">${bigBoard ? '✕ סגור מסך מלא' : '⛶ לוח גדול'}</button><button type="button" class="tb ic" id="mu-help" title="קיצורי מקשים (?)" aria-label="קיצורי מקשים">?</button><button type="button" class="btn p" id="walk-all">היכנס למוזיאון ↗</button></div></div>
      ${placing ? `<div class="mp-place" role="status"><b>${esc(placing.label)}</b><span>לחץ על התוכנית היכן תהיה הדלת${placing.move ? '' : ` (החדר נמשך לכיוון ${esc(placing.dirName)})`}.</span><span id="mp-why" class="muted"></span><span class="grow"></span><button type="button" class="btn" id="mp-cancel">ביטול <kbd>Esc</kbd></button></div>` : ''}
      <div class="mx-grid"><div class="mx-canvas" id="mx-canvas">
          <div class="mx-legend" aria-hidden="true"><span><i class="lg-h"></i>ביתן</span><span><i class="lg-e"></i>ביתן ריק</span><span><i class="lg-r"></i>חלל מקורי</span><span><i class="lg-s"></i>אגף נושא</span><span><i class="lg-k"></i>קולישה</span><span><i class="lg-d"></i>פדסטל</span></div>
          ${svgPlan()}
          ${it && !placing ? `<div class="mx-float" id="mx-float" role="toolbar" aria-label="פעולות על ${it.kind === 'st' ? 'הקולישה' : 'הפדסטל'}"><b>${it.kind === 'st' ? 'קולישה' : 'פדסטל ' + (PEDN[it.q[2]] || 'בינוני')}</b>${it.kind === 'st' ? '<button type="button" id="it-r15">סובב 15°</button>' : '<button type="button" id="it-sz">גודל</button>'}<button type="button" id="it-dup">שכפל</button><button type="button" class="d" id="it-del">הסר</button></div>` : ''}
          ${sp && !placing && !it ? `<div class="mx-float" id="mx-float" role="toolbar" aria-label="פעולות על ${esc(nameOf(sp))}"><b>${esc(nameOf(sp))}</b><button type="button" id="mp-move">הזז</button><button type="button" id="mp-rot">סובב 90°</button><button type="button" id="mp-ren">שם</button>${sp.type === 'section' || isTour(sp) ? '<button type="button" id="mp-walk">היכנס ↗</button>' : ''}<button type="button" class="d" id="mp-del">הסר</button></div>` : ''}
          <p class="mx-hint">${placing ? '' : sp ? 'Esc מבטל את הבחירה' : 'לחץ על ביתן, אגף, קולישה או פדסטל כדי לבחור · גרור קולישה או פדסטל כדי להזיז · גרור תערוכה מהמגש אל ביתן'}</p>
        </div>
        <aside class="ip" id="ip" aria-label="פרטי המרחב">${panel()}</aside></div>
      <dialog id="mp-dlg" class="dlg"><form method="dialog" id="mp-f"><h2>ביתן חדש</h2>
        <label class="field">סוג<select id="mp-type"><option value="house">ביתן לתערוכה (מספר חדר חדש)</option><option value="tour">תערוכה של אמן עם החלל המקורי שלה</option>${SECS.filter(x => !inPlan(x)).map(x => `<option value="sec:${esc(x.id)}">אגף נושא: ${esc(x.title)}</option>`).join('')}</select></label>
        <label class="field" id="mp-slugw" hidden>שם התערוכה בקישור (למשל ritual)<input id="mp-slug" type="text" dir="ltr" placeholder="ritual"></label>
        <label class="field">הביתן נמשך לכיוון (הדלת פונה אל הכיכר)<select id="mp-dir"><option value="0">מזרח (ימינה)</option><option value="90">דרום (למטה)</option><option value="180">מערב (שמאלה)</option><option value="270">צפון (למעלה)</option></select></label>
        <p class="muted small" id="mp-err" style="color:#a03020"></p>
        <div class="dlg-b"><button class="btn" value="x">ביטול</button><button class="btn p" id="mp-go" value="go">המשך: בחירת מקום</button></div></form></dialog></section>`;
  };
  // the side panel follows the selection: a pavilion's exhibition, an original space, or a themed wing
  const panel = () => {
    const sp = planNow() && planNow().spaces.find(s => s.id === selSp), it = planNow() && itemOf(planNow(), selIt);
    if (it) return itemPanel(it);
    if (sp && sp.type === 'section') { const sec = secOf(sp) || {}, bays = (sec.bays || []).length, works = (sec.bays || []).reduce((t, b) => t + (b.works || []).length, 0);
      return `<div class="ip-h"><div><span class="kind wing">אגף נושא · ${esc(sec.years || '')}</span><h2 dir="auto">${esc(nameOf(sp))}</h2></div><span class="chip ok">בבניין</span></div>
        <p class="muted">${bays} מפרצים · ${works} עבודות. התוכן נבנה על ידי סוכן האוצר; כאן מחליטים אם האגף בבניין, איפה ולאיזה כיוון.</p>
        <div class="ip-acts"><button type="button" class="btn p wide" id="pn-walk">היכנס לאגף ↗</button><button type="button" class="btn wide" id="pn-move">הזז בתוכנית</button><button type="button" class="btn wide" id="pn-rot">סובב 90°</button><button type="button" class="btn q d wide" id="pn-del">הוצא מהבניין</button></div>`; }
    if (isTour(sp)) { const a = appOf(sp.tour) || { title: sp.tour };
      return `<div class="ip-h"><div><span class="kind">חלל מקורי · ביתן ${sp.slot}</span><h2 dir="auto">${esc(nameOf(sp))}</h2></div><span class="chip ok">בבניין</span></div>
        ${a.cover ? `<div class="pn-im" style="background-image:url('${esc(a.cover)}')"></div>` : ''}<p class="muted">${esc(a.title)}: המבקר נכנס דרך הקשת אל החלל שבו התערוכה הוצגה באמת.</p>
        <div class="ip-acts"><button type="button" class="btn p wide" id="pn-walkall">צפה במוזיאון ↗</button><button type="button" class="btn wide" id="pn-move">הזז בתוכנית</button><button type="button" class="btn wide" id="pn-rot">סובב 90°</button><button type="button" class="btn q d wide" id="pn-del">הוצא מהבניין</button></div>`; }
    return inspector();
  };
  const itemPanel = it => { const q = it.q, num = (id, lab, v, min, max, st) => `<label class="field">${lab}<input type="number" id="${id}" value="${v}" min="${min}" max="${max}" step="${st}" dir="ltr"></label>`;
    if (it.kind === 'st') return `<div class="ip-h"><div><span class="kind">קולישה</span><h2>קיר חופשי</h2></div></div>
        <p class="muted">קיר שעומד באולם, ולמבקר מותר להקיף אותו. על שני צדדיו תלויות יצירות.</p>
        <div class="two-f">${num('it-x', 'מיקום לרוחב (מ׳)', q.x, 0, 220, 0.25)}${num('it-z', 'מיקום לעומק (מ׳)', q.z, 0, 220, 0.25)}</div>
        <div class="two-f">${num('it-len', 'אורך (מ׳)', q.len, 1, 12, 0.25)}${num('it-h', 'גובה (מ׳)', q.h, 2, 6, 0.1)}</div>
        ${num('it-rot', 'זווית (מעלות)', q.rot, -180, 180, 5)}
        <label class="field">מה תלוי עליו${showSel('it-show', q.show, 'ריקה, בלי יצירות')}</label>
        <div class="ip-acts"><button type="button" class="btn wide" id="it-r15">סובב 15°</button><button type="button" class="btn wide" id="it-r90">סובב 90°</button><button type="button" class="btn wide" id="it-dup">שכפל</button><button type="button" class="btn q d wide" id="it-del">הסר מהאולם</button></div>`;
    return `<div class="ip-h"><div><span class="kind">פדסטל</span><h2>בסיס ליצירה בודדת</h2></div></div>
      <p class="muted">עליו עומד חפץ או פסל מתערוכה. בחר איזו תערוכה, או השאר לפי הסדר.</p>
      <div class="two-f">${num('it-x', 'מיקום לרוחב (מ׳)', q[0], 0, 220, 0.25)}${num('it-z', 'מיקום לעומק (מ׳)', q[1], 0, 220, 0.25)}</div>
      <label class="field">גודל<select id="it-size">${Object.keys(PED).map(k => `<option value="${k}"${(q[2] || 'm') === k ? ' selected' : ''}>${PEDN[k]} (${Math.round(PED[k] * 100)} ס״מ)</option>`).join('')}</select></label>
      <label class="field">מה עומד עליו${showSel('it-show', q[3], 'ריק, בלי יצירה')}</label>
      <div class="ip-acts"><button type="button" class="btn wide" id="it-dup">שכפל</button><button type="button" class="btn q d wide" id="it-del">הסר מהאולם</button></div>`; };
  const wingCard = x => { const on = inPlan(x), sp = on && planNow().spaces.find(s => s.type === 'section' && s.section === x.id), bays = (x.bays || []).length;
    return `<div class="wc${on ? ' on' : ''}${sp && sp.id === selSp ? ' sel' : ''}" data-sec="${esc(x.id)}"><div class="wc-k">אגף נושא${x.years ? ' · ' + esc(x.years) : ''}</div><b dir="auto">${esc(x.title)}</b>
      <div class="wc-bays" aria-hidden="true">${Array.from({ length: Math.max(1, bays) }, () => '<i></i>').join('')}</div>
      <div class="wc-row"><label class="wc-sw"><button type="button" class="sw" role="switch" aria-checked="${on}" data-wing="${esc(x.id)}" aria-label="${esc(x.title)} בבניין"><i></i></button><span>${on ? 'בבניין' : 'לא בבניין'}</span></label><span class="grow"></span>
        ${on ? `<button type="button" class="btn sm" data-sw="${esc(x.id)}">היכנס ↗</button><button type="button" class="btn sm" data-sp="${esc(x.id)}">בתוכנית</button>` : ''}</div></div>`; };
  const tourCard = sp => { const a = appOf(sp.tour) || { title: sp.tour };
    return `<div class="rt${sp.id === selSp ? ' sel' : ''}" data-tour="${esc(sp.id)}" tabindex="0" role="button" aria-label="חלל מקורי: ${esc(a.title)}"><div class="rm-im" style="${a.cover ? `background-image:url('${esc(a.cover)}')` : ''}"><span class="rm-n">↗</span><span class="rm-st live">חלל מקורי</span></div><div class="rm-tx"><b dir="auto">${esc(a.title)}</b><span>ביתן ${sp.slot} · קשת אל החלל</span></div></div>`; };
  const TF = [['all', 'הכל'], ['mine', 'שלי'], ['real', 'אמיתיות'], ['virt', 'של אמנים'], ['demo', 'דמו']];
  let trayF = sessionStorage.getItem('mu-tray') || 'all';
  const trayCards = () => {
    const xc = a => `<div class="tc app" draggable="true" data-drag="app:${esc(a.slug)}" title="גרור אל ביתן"><div class="tc-im" style="${a.cover ? `background-image:url('${esc(a.cover)}')` : ''}"><span class="tc-k ${a.kind}">${a.kind === 'real' ? 'אמיתית' : 'של אמן'}</span></div><b dir="auto">${esc(a.title)}</b><span>${a.n ? a.n + ' עבודות' : ''}</span></div>`;
    const dc = a => `<div class="tc app" draggable="true" data-drag="app:${esc(a.slug)}" title="תערוכת דמו (בדויה): אפשר לשבץ, לא לערוך כאן"><div class="tc-im" style="${a.cover ? `background-image:url('${esc(a.cover)}')` : ''}"><span class="tc-k demo">דמו</span></div><b dir="auto">${esc(a.title)}</b><span>${a.n} עבודות</span></div>`;
    const L = { mine: EX.map(exCard), real: real.map(xc), virt: virt.map(xc), demo: apps.map(dc) };
    const out = trayF === 'all' ? [...L.mine, ...L.real, ...L.virt, ...L.demo] : L[trayF] || [];
    return out.join('') || '<p class="muted">אין כאן תערוכות.</p>';
  };
  const wall = () => {
    const live = [...SL.values()].filter(s => s.live).length, P = planNow(), slots = [...new Set([1, 2, 3, 4, 5, 6, 7, 8, ...extraSlots()])], empty = slots.filter(k => { const r = SL.get(k); return !r || !(r.exhibition_id || r.app_slug); }).length;
    const tours = P ? P.spaces.filter(isTour) : [], nW = P ? P.spaces.filter(s => s.type === 'section').length : 0;
    return `<section class="mx-wall" aria-label="קיר האוצר">
      <div class="wall-h"><div><h2>קיר האוצר</h2><p>מה תלוי בכל ביתן, אילו אגפים בבניין, ומה אפשר לתלות.</p></div><div class="wall-stats"><div><b>${live}</b><span>מוצגות</span></div><div><b>${empty}</b><span>ביתנים ריקים</span></div><div><b>${nW}</b><span>אגפי נושא</span></div></div></div>
      <div class="wall-s"><h3>ביתנים <small>גרור ביתן על ביתן כדי להחליף · גרור תערוכה מהמגש אל ביתן</small></h3>
        <div class="wall-g">${slots.map(room).join('')}${tours.map(tourCard).join('')}</div></div>
      <div class="wall-s"><h3>אגפי נושא <small>אגפי המוזיאון עצמו (היסטוריה: רנסנס, בארוק…), נבנים על ידי סוכן האוצר · מתג מכניס או מוציא מהבניין</small></h3>
        <div class="wing-g">${SECS.map(wingCard).join('') || '<p class="muted">עוד אין אגפי נושא.</p>'}</div></div>
      <section class="tray"><div class="tray-h"><h3>מגש התערוכות</h3><div class="chips" role="tablist" aria-label="סינון">${TF.map(([k, t]) => `<button type="button" class="chip-f" role="tab" aria-selected="${trayF === k}" data-tf="${k}">${t}</button>`).join('')}</div><span class="grow"></span><a class="btn p" href="#/museum/ex/new">תערוכה חדשה <kbd>N</kbd></a></div>
        <div class="tray-g" id="tray-g">${trayCards()}</div></section></section>`;
  };
  // a themed wing in or out of the building: in at its own place when it is free, else the owner picks a place on the plan
  const wingIn = id => { const sec = SECS.find(x => x.id === id), B = SYm.planOf(null).spaces.find(x => x.section === id), d0 = sec && sec.door ? { door: [sec.door.x, sec.door.z], dir: sec.door.o } : null;
    const sp = { id, type: 'section', section: id, door: (B || d0 || { door: [14, 47] }).door, dir: (B || d0 || { dir: [0, -1] }).dir }, P = planNow();
    if (!whyNot(sp, P)) return saveSpaces(`${sec ? sec.title : id} נכנס לבניין`, L => [...L, sp]);
    placing = { sp, label: `${sec ? sec.title : id}: המקום המקורי תפוס`, dirName: '' }; selSp = null; draw(true); $('#mx-canvas').scrollIntoView({ block: 'start', behavior: 'smooth' }); };
  const wingOut = id => { const sp = planNow().spaces.find(s => s.type === 'section' && s.section === id); if (!sp) return; if (selSp === sp.id) selSp = null; saveSpaces(`${nameOf(sp)} יצא מהבניין`, L => L.filter(s => s.id !== sp.id)); };
  const pickSp = id => { selIt = null; selSp = selSp === id ? null : id; const sp = selSp && planNow().spaces.find(s => s.id === selSp); if (sp && sp.type === 'house' && !sp.tour) sel = sp.slot; draw(true); };
  function placeFloat() {                                                        // the floating tools sit just above the selected space
    const f = $('#mx-float'), g = selIt ? $('.b-it.on') : selSp && $(`.b-g[data-id="${CSS.escape(selSp)}"]`), cv = $('#mx-canvas'); if (!f || !g || !cv) return;
    const b = g.getBoundingClientRect(), c = cv.getBoundingClientRect(), fw = f.offsetWidth, fh = f.offsetHeight;
    let x = b.left + b.width / 2 - c.left - fw / 2, y = b.top - c.top - fh - 10; if (y < 8) y = b.bottom - c.top + 10;
    f.style.left = Math.max(8, Math.min(c.width - fw - 8, x)) + 'px'; f.style.top = y + 'px'; }
  function wireBase() {
    const svg = $('#mp-svg'); if (!svg) return;
    const pt = e => { const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(svg.getScreenCTM().inverse()); return [Math.round(p.x), Math.round(p.y)]; };
    $$('.b-g').forEach(g => { g.onclick = ev => { if (placing) return; ev.stopPropagation(); pickSp(g.dataset.id); }; g.onkeydown = ev => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); pickSp(g.dataset.id); } }; });
    svg.addEventListener('click', () => { if (!placing && (selSp || selIt)) { selSp = null; selIt = null; draw(true); } });
    placeFloat();
    // the hall's coulisses and pedestals: pick, drag (snaps to a quarter metre), turn by the knob, edit by number
    const cur2 = () => itemOf(planNow(), selIt);
    const svgPt = e => { const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(svg.getScreenCTM().inverse()); return [p.x, p.y]; };
    const mkOf = (it, x, z) => it.kind === 'st' ? { ...it.q, x, z } : [x, z, ...it.q.slice(2)];
    $$('.b-it').forEach(g => {
      const id = g.dataset.it;
      g.onkeydown = ev => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); ev.stopPropagation(); selIt = selIt === id ? null : id; selSp = null; draw(true); } };
      g.onclick = ev => ev.stopPropagation();
      g.onpointerdown = ev => { if (placing || ev.button) return; ev.stopPropagation(); ev.preventDefault();
        const it = itemOf(planNow(), id); if (!it) return; const knob = ev.target.dataset && ev.target.dataset.knob, p0 = svgPt(ev), a0 = it.kind === 'st' ? [it.q.x, it.q.z] : [it.q[0], it.q[1]]; let moved = false, now = a0, rot = it.kind === 'st' ? it.q.rot : 0;
        g.setPointerCapture(ev.pointerId);
        g.onpointermove = e => { const p = svgPt(e);
          if (knob && it.kind === 'st') { let r = Math.atan2(p[1] - a0[1], p[0] - a0[0]) * 180 / Math.PI; r = e.shiftKey ? r : Math.round(r / 5) * 5; rot = r; moved = true; g.setAttribute('transform', `translate(${a0[0]} ${a0[1]}) rotate(${rot})`); return; }
          const dx = p[0] - p0[0], dz = p[1] - p0[1]; if (!moved && Math.hypot(dx, dz) < 0.3) return; moved = true; now = [snap(a0[0] + dx), snap(a0[1] + dz)];
          g.setAttribute('transform', `translate(${now[0]} ${now[1]})${it.kind === 'st' ? ` rotate(${it.q.rot})` : ''}`); };
        g.onpointerup = e => { g.onpointermove = g.onpointerup = null; try { g.releasePointerCapture(e.pointerId); } catch {}
          if (!moved) { selIt = selIt === id ? null : id; selSp = null; draw(true); return; }
          const P = planNow(), nq = knob && it.kind === 'st' ? { ...it.q, rot: Math.round(rot) } : mkOf(it, ...now), why = itemWhy(P, it.kind, nq);
          if (why) { toast('אי אפשר כאן: ' + why); draw(true); return; }
          selIt = id; savePlan(it.kind === 'st' ? 'הקולישה הוזזה' : 'הפדסטל הוזז', N => { if (it.kind === 'st') N.stands = N.stands.map(x => x.id === it.q.id ? nq : x); else N.objects[it.k] = nq; }, true); }; };
    });
    const edit = (label, f) => { const it = cur2(); if (!it) return Promise.resolve(); const nq = f(it); const why = itemWhy(planNow(), it.kind, nq); if (why) { toast('אי אפשר: ' + why); draw(true); return Promise.resolve(); }
      return savePlan(label, N => { if (it.kind === 'st') N.stands = N.stands.map(x => x.id === it.q.id ? nq : x); else N.objects[it.k] = nq; }, true); };
    const nv = (id, d) => { const e = $(id), v = e ? parseFloat(e.value) : NaN; return isFinite(v) ? v : d; };
    const bind = (id, f) => { const e = $(id); if (e) e.onchange = () => f(e.value); };
    bind('#it-x', v => edit('הוזז', it => it.kind === 'st' ? { ...it.q, x: snap(nv('#it-x', it.q.x)) } : [snap(nv('#it-x', it.q[0])), it.q[1], ...it.q.slice(2)]));
    bind('#it-z', v => edit('הוזז', it => it.kind === 'st' ? { ...it.q, z: snap(nv('#it-z', it.q.z)) } : [it.q[0], snap(nv('#it-z', it.q[1])), ...it.q.slice(2)]));
    bind('#it-len', v => edit('האורך עודכן', it => ({ ...it.q, len: Math.min(12, Math.max(1, nv('#it-len', it.q.len))) })));
    bind('#it-h', v => edit('הגובה עודכן', it => ({ ...it.q, h: Math.min(6, Math.max(2, nv('#it-h', it.q.h))) })));
    bind('#it-rot', v => edit('הזווית עודכנה', it => ({ ...it.q, rot: Math.round(Math.min(180, Math.max(-180, nv('#it-rot', it.q.rot)))) })));
    bind('#it-size', v => edit('הגודל עודכן', it => [it.q[0], it.q[1], v, ...(it.q[3] ? [it.q[3]] : [])]));
    bind('#it-show', v => edit('התוכן עודכן', it => { if (it.kind === 'st') { const y = { ...it.q }; if (v) y.show = v; else delete y.show; return y; } return v ? [it.q[0], it.q[1], it.q[2] || 'm', v] : [it.q[0], it.q[1], it.q[2] || 'm']; }));
    const turn = d => edit('הקולישה סובבה', it => ({ ...it.q, rot: ((Math.round(it.q.rot + d) + 540) % 360) - 180 }));
    const onI = (id, f) => $$(`[id="${id.slice(1)}"]`).forEach(e => { e.onclick = ev => { ev.stopPropagation(); f(); }; });      // (the floating tools and the side panel carry the same buttons)
    onI('#it-r15', () => turn(15)); onI('#it-r90', () => turn(90));
    onI('#it-sz', () => edit('הגודל עודכן', it => { const ks = Object.keys(PED), n = ks[(ks.indexOf(it.q[2] || 'm') + 1) % ks.length]; return [it.q[0], it.q[1], n, ...(it.q[3] ? [it.q[3]] : [])]; }));
    onI('#it-del', () => { const it = cur2(); if (!it) return; selIt = null; savePlan(it.kind === 'st' ? 'הקולישה הוסרה' : 'הפדסטל הוסר', N => { if (it.kind === 'st') N.stands = N.stands.filter(x => x.id !== it.q.id); else N.objects.splice(it.k, 1); }); });
    onI('#it-dup', () => { const it = cur2(); if (!it) return; const P = planNow(), mk = (x, z) => it.kind === 'st' ? { ...it.q, id: 'st-' + Date.now().toString(36), x, z } : [x, z, ...it.q.slice(2)];
      const at = it.kind === 'st' ? [it.q.x, it.q.z] : [it.q[0], it.q[1]]; let q = null;
      for (const [dx, dz] of [[2, 0], [-2, 0], [0, 2], [0, -2], [3, 3], [-3, -3], [4, 0], [0, 4]]) { const t = mk(snap(at[0] + dx), snap(at[1] + dz)); if (!itemWhy(P, it.kind, t)) { q = t; break; } }
      if (!q) return toast('אין מקום פנוי ליד'); const n = it.kind === 'st' ? 'st:' + q.id : 'ob:' + P.objects.length;
      selIt = n; savePlan('שוכפל', N => { if (it.kind === 'st') N.stands.push(q); else N.objects.push(q); }, true); });
    const addItem = kind => { const P = planNow(); if ((kind === 'st' ? P.stands : P.objects).length >= 24) return toast('אפשר עד 24');
      const q = freeSpot(P, kind, (x, z) => kind === 'st' ? { id: 'st-' + Date.now().toString(36), x, z, len: 4, rot: 0, h: 3.2 } : [x, z, 'm']);
      selSp = null; selIt = kind === 'st' ? 'st:' + q.id : 'ob:' + P.objects.length; savePlan(kind === 'st' ? 'קולישה נוספה' : 'פדסטל נוסף', N => { if (kind === 'st') N.stands.push(q); else N.objects.push(q); }, true); };
    const on0 = (id, f) => { const e = $(id); if (e) e.onclick = f; };
    on0('#it-addst', () => addItem('st')); on0('#it-addpd', () => addItem('ob'));
    on0('#mp-full', () => { bigBoard = !bigBoard; document.body.classList.toggle('mx-big', bigBoard); draw(true); });
    const cur = () => planNow().spaces.find(s => s.id === selSp);
    const del = () => { const sp = cur(); if (!sp) return; selSp = null; saveSpaces(`${nameOf(sp)} הוצא מהבניין`, L => L.filter(s => s.id !== sp.id)); };
    const move = () => { const sp = cur(); if (sp) { placing = { sp, label: `הזזת ${nameOf(sp)}`, dirName: '', move: true }; draw(true); } };
    const rot = () => { const P = planNow(), sp = cur(); if (!sp) return; const t = turnOf(sp), why = whyNot(t, P); if (why) return toast('אי אפשר לסובב: ' + why); saveSpaces(`${nameOf(sp)} סובב`, L => L.map(x => x.id === sp.id ? t : x), true); };
    const ren = () => { const sp = cur(); if (!sp) return; const v = prompt('שם המרחב (ריק = השם הרגיל)', sp.name || ''); if (v === null) return; saveSpaces('השם עודכן', L => L.map(x => { if (x.id !== sp.id) return x; const y = { ...x }; if (v.trim()) y.name = v.trim().slice(0, 40); else delete y.name; return y; }), true); };
    const on = (id, f) => { const e = $(id); if (e) e.onclick = f; };
    on('#mp-del', del); on('#pn-del', del); on('#mp-move', move); on('#pn-move', move); on('#mp-rot', rot); on('#pn-rot', rot); on('#mp-ren', ren);
    on('#mp-walk', () => { const sp = cur(); if (sp && sp.type === 'section') walkWing(sp); else walk(true); }); on('#pn-walk', () => walkWing(cur())); on('#pn-walkall', () => walk(true));
    on('#mp-undo', () => planStep(pHist, pFut)); on('#mp-redo', () => planStep(pFut, pHist));
    const dlg = $('#mp-dlg'), type = $('#mp-type'), slugw = $('#mp-slugw');
    on('#mp-add', () => { $('#mp-err').textContent = ''; type.value = 'house'; slugw.hidden = true; dlg.showModal(); });
    on('#mp-addw', () => { const x = SECS.find(y => !inPlan(y)); if (x) wingIn(x.id); });
    type.onchange = () => { slugw.hidden = type.value !== 'tour'; };
    $('#mp-go').onclick = async ev => { ev.preventDefault(); const P = planNow(), err = $('#mp-err'), dir = +$('#mp-dir').value;
      const used = new Set(P.spaces.map(s => s.slot).filter(Boolean)); let sp, label;
      if (type.value === 'tour') { const slug = $('#mp-slug').value.trim().toLowerCase(); if (!/^[a-z0-9-]{2,60}$/.test(slug)) { err.textContent = 'כתוב את שם התערוכה באנגלית, כמו ritual'; return; }
        if (P.spaces.some(s => s.tour === slug)) { err.textContent = 'התערוכה הזאת כבר בבניין'; return; }
        const ok = await fetch(APP + `data/spaces/${slug}.json`).then(r => r.ok).catch(() => false); if (!ok) { err.textContent = 'לתערוכה הזאת אין עדיין חלל באפליקציה (data/spaces/' + slug + '.json)'; return; }
        let n = 50; while (used.has(n)) n++; sp = { id: slug, type: 'house', slot: n, tour: slug, dir }; label = `חלל מקורי: ${slug}`; }
      else if (type.value.startsWith('sec:')) { dlg.close(); return wingIn(type.value.slice(4)); }
      else { let n = 9; while (used.has(n)) n++; if (n > 48) { err.textContent = 'אין עוד מקום למספרי חדרים'; return; } sp = { id: 'house-' + n, type: 'house', slot: n, dir }; label = `ביתן ${n}`; }
      placing = { sp, label, dirName: DIRN(dir) }; dlg.close(); selSp = null; draw(true); };
    on('#mp-cancel', () => { placing = null; draw(true); });
    if (placing) {
      const ghostOf = e => { const sp = { ...placing.sp, door: pt(e) }; return { sp, why: whyNot(sp, planNow()) }; };
      svg.onpointermove = e => { const { sp, why } = ghostOf(e); $('#mp-ghost').innerHTML = `<polygon points="${footOf(sp).map(q => q.join(',')).join(' ')}" class="${why ? 'b-bad' : 'b-ok'}"/>`; $('#mp-why').textContent = why ? 'לא כאן: ' + why : (placing.move ? `אפשר: הדלת מ־(${placing.sp.door[0]}, ${placing.sp.door[1]}) אל (${sp.door[0]}, ${sp.door[1]})` : 'אפשר'); };
      svg.onclick = e => { e.stopPropagation(); const { sp, why } = ghostOf(e); if (why) { toast('אי אפשר כאן: ' + why); return; } const mv = placing.move; placing = null; if (mv) saveSpaces(`${nameOf(sp)} הוזז`, L => L.map(x => x.id === sp.id ? sp : x), true); else saveSpaces(`${nameOf(sp)} נוסף לבניין`, L => [...L, sp]); };
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
    return `<div class="rm ${r && (r.exhibition_id || r.app_slug) ? '' : 'empty'} s-${st.k}" data-k="${k}" tabindex="0" role="button" aria-pressed="${k === sel && (!selSp || (spOfSlot(k) || {}).id === selSp)}" draggable="true" aria-label="ביתן ${k}: ${esc(title(r) || 'ריק')}" style="--door:${c || '#cfc8b8'}">
      <span class="rm-n">${k}</span>${st.k !== 'empty' ? `<span class="rm-st ${st.k}">${esc(st.t)}</span>` : ''}
      ${r && (r.exhibition_id || r.app_slug) ? `<div class="rm-im" style="${img ? `background-image:url('${esc(img)}')` : ''}"></div><div class="rm-tx"><b dir="auto">${esc(title(r))}</b>${r.from_date || r.to_date ? `<span>${dshort(r.from_date) || '…'} – ${dshort(r.to_date) || '…'}</span>` : ''}${dirtyOf(r) ? '<em>יש שינויים שלא פורסמו</em>' : ''}</div>`
        : '<div class="rm-em"><b>+</b><span>ביתן ריק</span><span class="small">גרור לכאן תערוכה</span></div>'}
      <i class="rm-door"></i></div>`;
  };
  const exCard = e => { const w = (e.works || []).find(x => x.thumb || x.image), at = [...SL.values()].filter(s => s.exhibition_id === e.id).map(s => s.slot);
    return `<a class="tc" href="#/museum/ex/${e.id}" draggable="true" data-drag="ex:${e.id}"><div class="tc-im" style="${w ? `background-image:url('${esc(abs(w.thumb || w.image))}')` : ''}"></div><b dir="auto">${esc(e.title)}</b>
      <span>${(e.works || []).filter(x => x.kind !== 'object').length} עבודות${(e.plinths || []).length ? ` · ${(e.plinths || []).length} פסלים` : ''}${at.length ? ` · חדר ${at.join(', ')}` : ''}</span></a>`; };
  const appCard = a => `<div class="tc app" draggable="true" data-drag="app:${esc(a.slug)}" title="תערוכה מובנית באפליקציה: אפשר לשבץ אותה, לא לערוך כאן"><div class="tc-im" style="${a.cover ? `background-image:url('${esc(a.cover)}')` : ''}"></div><b dir="auto">${esc(a.title)}</b><span>מובנית · ${a.n} עבודות</span></div>`;

  function inspector() {
    const r = SL.get(sel), st = stateOf(r), has = r && (r.exhibition_id || r.app_slug), c = colourOf(r), isApp = r && r.app_slug, dirty = dirtyOf(r);
    return `<div class="ip-h"><div><span class="kind">ביתן ${sel}${spOfSlot(sel) ? ' · פונה ' + DIRN((spOfSlot(sel).dir + 180) % 360) : ''}</span><h2 dir="auto">${esc(title(r) || 'ביתן ריק')}</h2></div>${st.k !== 'empty' ? `<span class="chip ${st.k === 'live' ? 'ok' : st.k === 'draft' ? '' : 'warn'}">${esc(st.t)}</span>` : ''}</div>
    <label class="field">התערוכה בביתן<select id="ip-ex"><option value="">— ריק —</option>
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
    <div class="ip-acts">${isApp ? '<p class="muted small">' + (extras.some(x => x.slug === r.app_slug) ? 'תערוכה אמיתית של האפליקציה: המבקר נכנס אליה דרך הקשת שבחדר, אל החלל שלה. העבודות נערכות מחוץ לשולחן.' : 'תערוכת דמו (בדויה): אפשר לשבץ, לתזמן ולצבוע, אבל העבודות נערכות מחוץ לשולחן.') + '</p>' : '<a class="btn p wide" href="#/museum/ex/' + r.exhibition_id + '">ערוך את התערוכה <kbd>Enter</kbd></a>'}<button type="button" class="btn wide" id="ip-walk">צפה בביתן <kbd>W</kbd></button>
      <button type="button" class="btn q d wide" id="ip-clear">פנה את הביתן <kbd>Del</kbd></button></div>` : '<p class="muted">בחר תערוכה כאן, או גרור אותה מהמגש שבקיר האוצר אל הביתן.</p>'}`;
  }
  function draw(keepIns) {
    sessionStorage.setItem('mu-sel', sel);
    const live = [...SL.values()].filter(s => s.live).length;
    page('museum', 'המוזיאון', `תחת שמיים אחד · ${live} מוצגות למבקרים`, `
    ${live ? '' : `<div class="soon" style="margin-bottom:16px">כרגע המוזיאון רץ אוטומטית על התערוכות המובנות. ברגע שביתן אחד מוצג כאן, המוזיאון מציג רק את מה שהגדרת. <button type="button" class="btn" id="adopt" style="margin-inline-start:10px;min-height:38px">התחל מהמצב הנוכחי</button></div>`}
    <div class="mx">${studio()}${wall()}</div>`);
    $('main').classList.add('wide'); wire(); [...SL.values()].forEach(auto);
  }
  function select(k) { sel = k; const sp = spOfSlot(k); selSp = sp ? sp.id : null; draw(true); auto(SL.get(k)); }
  const secsFor = async list => Promise.all(list.map(async sec => { const credits = {}; for (const c of await getj(APP + sec.folder + '/credits.json', [])) credits[c.slug] = { ...c, image: APP + `${sec.folder}/works/${c.slug}.jpg`, thumb: APP + `${sec.folder}/works/${c.slug}-s.jpg` };
    return { ...JSON.parse(JSON.stringify(sec), (k, v) => typeof v === 'string' && /^data[/]museum[/]/.test(v) ? APP + v : v), credits }; }));
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
      else if (a && a.works.length) room = { slug: a.slug, title: a.title, works: a.works, original: a.original, colour: colourOf(r) || await SY.suggestColour(a.works.slice(0, 4).map(w => w.thumb), u => u, SY.slugHue(a.slug)) };
      if (!room) continue; room.slot = k; if (k === sel) focus = rooms.length; rooms.push(room); }
    const P = planNow();
    if (all && P) for (const sp of P.spaces) { if (sp.type !== 'house' || !sp.tour || rooms.some(r => r.slot === sp.slot)) continue;
      const a = appOf(sp.tour); if (!a || !a.works.length) continue;
      rooms.push({ slug: a.slug, slot: sp.slot, title: a.title, works: a.works, original: a.original, colour: await SY.suggestColour(a.works.slice(0, 4).map(w => w.thumb), u => u, SY.slugHue(a.slug)) }); }
    if (!rooms.length) return toast(all ? 'אין עדיין תערוכות בחדרים' : 'בחדר הזה אין תערוכה לצפות בה');
    toast(all ? 'בונה את המוזיאון…' : 'בונה את הבית…'); try { await walkStreet(rooms, all ? -1 : (SY.skyLayout ? Math.max(0, SY.skyLayout(PLAN).findIndex(d => d.no === sel)) : focus), ctx.viewerCss, ctx.synth, { plan: PLAN, sections: all && P ? await secsFor(SECS.filter(x => P.spaces.some(q => q.type === 'section' && q.section === x.id))) : [] }); } catch (e) { fail(e); }
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
      e.onkeydown = ev => { if (ev.key === 'Enter' && ev.target === e) { ev.stopPropagation(); select(+e.dataset.k); } };
      e.ondragstart = ev => { ev.dataTransfer.setData('text/plain', 'room:' + e.dataset.k); ev.dataTransfer.effectAllowed = 'move'; };
      e.ondragover = ev => { ev.preventDefault(); e.classList.add('over'); }; e.ondragleave = () => e.classList.remove('over');
      e.ondrop = ev => { ev.preventDefault(); e.classList.remove('over'); const [t, id] = ev.dataTransfer.getData('text/plain').split(/:(.*)/s), k = +e.dataset.k; sel = k;
        if (t === 'room') swap(+id, k); else if (t === 'ex' || t === 'app') place(k, `${t}:${id}`); };
    });
    $$('.rt').forEach(e => { e.onclick = () => pickSp(e.dataset.tour); e.onkeydown = ev => { if (ev.key === 'Enter') pickSp(e.dataset.tour); }; });
    const dragWire = e => { e.ondragstart = ev => { ev.dataTransfer.setData('text/plain', e.dataset.drag); ev.dataTransfer.effectAllowed = 'copy'; }; };
    $$('[data-drag]').forEach(dragWire);
    $$('[data-wing]').forEach(b => { b.onclick = () => b.getAttribute('aria-checked') === 'true' ? wingOut(b.dataset.wing) : wingIn(b.dataset.wing); });
    $$('[data-sw]').forEach(b => { b.onclick = () => walkWing(planNow().spaces.find(s => s.type === 'section' && s.section === b.dataset.sw)); });
    $$('[data-sp]').forEach(b => { b.onclick = () => { const sp = planNow().spaces.find(s => s.type === 'section' && s.section === b.dataset.sp); if (!sp) return; selSp = sp.id; draw(true); $('#mx-canvas').scrollIntoView({ block: 'start', behavior: 'smooth' }); }; });
    $$('[data-tf]').forEach(b => { b.onclick = () => { trayF = b.dataset.tf; sessionStorage.setItem('mu-tray', trayF); $$('[data-tf]').forEach(x => x.setAttribute('aria-selected', x === b)); $('#tray-g').innerHTML = trayCards(); $$('#tray-g [data-drag]').forEach(dragWire); }; });
    const ad = $('#adopt'); if (ad) ad.onclick = async () => {                      // start from what the museum shows now: the app's rooms, as they are
      const L = apps.slice(0, SLOTS); try { await commit('המצב הנוכחי', L.map((a, i) => [i + 1, { ...blank, app_slug: a.slug, live: true }])); draw(); toast('המצב הנוכחי הועתק לביתנים', () => restore(undo, redo)); } catch (e) { fail(e); } };
    $('#walk-all').onclick = () => walk(true); $('#mu-help').onclick = help;
  }
  const help = () => helpDlg('קיצורי מקשים · המוזיאון', [['← → ↑ ↓', 'מעבר בין חדרים'], ['1 – 8', 'בחירת חדר'], ['Enter', 'עריכת התערוכה שבחדר'], ['P', 'הצג או הסתר למבקרים'], ['W', 'צפייה בחדר בתלת־ממד'], ['Shift + W', 'צפייה ברחוב כולו'], ['Del', 'פינוי החדר'], ['Ctrl + Z', 'ביטול'], ['Ctrl + Shift + Z', 'שחזור'], ['N', 'תערוכה חדשה']]);
  keys(e => {
    const el = e.target; if (el && el.closest && el.closest('input,textarea,select,dialog') || e.metaKey && e.key !== 'z') return;
    if (e.key === 'Escape' && placing) { placing = null; return draw(true); }
    if (e.key === 'Escape' && selIt) { selIt = null; return draw(true); }
    if (e.key === 'Escape' && selSp) { selSp = null; return draw(true); }
    if (e.key === 'Escape' && bigBoard) { bigBoard = false; document.body.classList.remove('mx-big'); return draw(true); }
    if ((e.key === 'Delete' || e.key === 'Backspace') && selIt) { e.preventDefault(); const d = $('#it-del'); return d && d.click(); }
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
  selSp = (spOfSlot(sel) || {}).id || null;
  draw();
}
