// Open Studio's control room (#/admin): for the people who run it (public.admins; the database checks it on every
// read and write, this screen only follows). In Hebrew, right to left: only its owners see it, and they asked for it so.
//
// Four places, not six tabs (the owner: "messy and cumbersome"):
//   תור (the queue)     everything that waits for a decision, in one list, one tap each: an artist to approve, the
//                       new works of an artist to look over, a request for a 3D tour. Decisions happen in place and
//                       can be undone; nothing reloads.
//   קהילה              the artists (search, filter, hide, approve again) and the people who joined.
//   תערוכות            the exhibitions Open Studio curates, by hand, across artists.
//   מערכת              how the app is (checks, last runs), asking for a change, trying the app as someone new,
//                       test accounts.
// Desktop: a side rail and a wider page (the app's phone column is lifted while this screen is open); phone: a bottom bar.
// Keys on the queue (desktop): J/K move, A approves, C asks for changes, P previews.
import { client } from './auth.js';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const REPO = 'eladamsalemart/eladamsalem.github.io';
const USERS = 'https://hlpzqeosdavfuzjgpwhy.supabase.co/functions/v1/admin-users';
const NAV = [['', 'תור'], ['artists', 'קהילה'], ['curated', 'תערוכות'], ['system', 'מערכת']];
const TITLES = { '': 'תור', artists: 'קהילה', curated: 'תערוכות אוצרות', system: 'מערכת' };
const TAB_OF = { '': '', artists: 'artists', people: 'artists', curated: 'curated', system: 'system', requests: 'system', health: 'system' };
let M = null, SYN = null, cur = null;            // the app's content; the room drawing; the curated show being edited
let APP = null, GO = null, KEYS = null, QC = null, HC = null, QT = '';   // the page; navigation; key handler; queue and health caches; queue title
const synth = () => SYN || (SYN = import('./space/synth.js'));
const day = t => new Date(t).toLocaleDateString('he-IL', { day: 'numeric', month: 'short', year: 'numeric' });
const ago = t => { const d = Math.floor((Date.now() - new Date(t)) / 864e5); return d <= 0 ? 'היום' : d === 1 ? 'אתמול' : d < 30 ? `לפני ${d} ימים` : day(t); };
const who = r => [r.first_name, r.last_name].filter(Boolean).join(' ') || '—';
const roleName = r => r === 'artist' ? 'אמן/ית' : r === 'lover' ? 'חובב/ת אמנות' : 'עוד לא בחר/ה';
const $$ = (root, s) => [...root.querySelectorAll(s)];

// --- the page: one place for the look (injected once; the app's tokens: Studio Paper) ---------------------------------
const CSS = `
html:has(.adm){background:var(--wall)}body:has(.adm){max-width:none;box-shadow:none}
.adm.st{display:grid;min-height:100vh;grid-template-columns:minmax(0,1fr);padding:0}
.adm .ax-side{display:none}
.ax-main{padding:env(safe-area-inset-top,0px) max(16px,env(safe-area-inset-right,0px)) 110px max(16px,env(safe-area-inset-left,0px));min-width:0}
.ax-top{display:flex;justify-content:space-between;align-items:center;min-height:44px}
.ax-h1{font:400 32px/1.1 var(--serif);padding:6px 0 4px}.ax-sub{color:var(--muted);font-size:14px;padding-bottom:14px;min-height:1.5em}
.ax-tabs{position:fixed;inset:auto 0 0;z-index:6;display:grid;grid-template-columns:repeat(4,1fr);background:color-mix(in srgb,var(--wall) 92%,transparent);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);border-top:1px solid var(--line);padding-bottom:env(safe-area-inset-bottom,0px)}
.ax-tabs a,.ax-side a.ax-l{display:flex;align-items:center;justify-content:center;gap:6px;min-height:56px;font-size:13px;font-weight:500;color:var(--muted);text-decoration:none}
.ax-tabs a[aria-current]{color:var(--ink);font-weight:700;box-shadow:inset 0 -2px 0 var(--dot)}
.ax-badge{background:var(--dot);color:var(--wall);border-radius:99px;font:600 11px/18px var(--sans);min-width:18px;height:18px;text-align:center;padding:0 5px;font-style:normal}.ax-badge:empty{display:none}
.ax-dot{width:8px;height:8px;border-radius:50%;background:#b3421f}
.ax-q{display:grid;gap:12px;align-items:start}
.ax-card{background:var(--paper);border:1px solid var(--line);border-radius:16px;padding:14px;display:grid;gap:12px;min-width:0;transition:opacity .16s,transform .16s}
.ax-card.out{opacity:0;transform:scale(.98)}.ax-card:focus-visible,.ax-card.key{outline:2px solid var(--dot);outline-offset:2px}
.ax-hd{display:flex;justify-content:space-between;align-items:start;gap:10px}.ax-hd h2{font:500 22px/1.15 var(--serif);overflow-wrap:anywhere}
.ax-kind{font:500 11px var(--mono);letter-spacing:.08em;text-transform:uppercase;color:var(--muted)}
.ax-meta{font-size:13px;color:var(--muted)}.ax-meta a{text-decoration:underline}
.ax-st{display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;font-size:15px}
.ax-th{display:grid;grid-template-columns:repeat(auto-fill,minmax(76px,1fr));gap:4px}
.ax-th img{width:100%;aspect-ratio:1;object-fit:cover;border-radius:6px;background:var(--card)}
.ax-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(88px,1fr));gap:6px}
.ax-t{position:relative;padding:0;border:0;background:none;cursor:pointer;border-radius:8px;min-height:44px}
.ax-t img{width:100%;aspect-ratio:1;object-fit:cover;border-radius:8px;background:var(--card)}
.ax-t.x img{opacity:.25;filter:grayscale(1)}.ax-t.x::after{content:"יוסתר";position:absolute;inset:auto 0 8px;text-align:center;font:600 12px var(--sans);color:var(--ink)}
.ax-t i{position:absolute;top:4px;inset-inline-start:4px;background:#9A5B1E;color:#fff;border-radius:99px;width:18px;height:18px;font:700 11px/18px var(--sans);text-align:center;font-style:normal}
.ax-acts{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.ax-acts .btn{flex:none}.ax-acts .btn.f{flex:1 1 120px}
.btn.ax-t3{border-color:transparent;color:var(--muted);font-weight:500;padding-inline:10px}
.ax-ask{display:grid;gap:8px}.ax-ask input,.ax-search{font:inherit;font-size:16px;padding:10px 12px;min-height:44px;border:1px solid var(--line);border-radius:12px;background:var(--wall);color:var(--ink);width:100%}
.ax-ask label{display:grid;gap:6px;font-size:13px;color:var(--muted)}
.ax-empty{padding:34px 0;display:grid;gap:10px;justify-items:start}.ax-empty b{font:400 28px var(--serif)}
.ax-keys{display:none}
.ax-toast{position:fixed;z-index:20;inset-inline:12px;bottom:calc(68px + env(safe-area-inset-bottom,0px));background:var(--ink);color:var(--wall);border-radius:14px;padding:6px 8px 6px 16px;display:flex;justify-content:space-between;align-items:center;gap:12px;min-height:48px;font-size:14px;box-shadow:0 6px 24px #0004}
.ax-toast button{min-height:44px;min-width:56px;border:0;background:transparent;color:var(--wall);font:700 14px var(--sans);text-decoration:underline;cursor:pointer}
.ax-seg{display:flex;gap:6px;padding-bottom:12px}.ax-seg a,.ax-chips button{font:500 14px var(--sans);min-height:44px;padding:0 14px;border-radius:99px;background:var(--card);border:0;color:var(--ink);text-decoration:none;display:inline-flex;align-items:center;cursor:pointer;white-space:nowrap}
.ax-seg a[aria-current],.ax-chips button[aria-pressed=true]{background:var(--ink);color:var(--wall)}
.ax-chips{display:flex;gap:6px;overflow-x:auto;padding:10px 0 12px}
.ax-row{border-bottom:1px solid var(--line)}.ax-row>button{all:unset;box-sizing:border-box;display:grid;grid-template-columns:48px minmax(0,1fr) auto;gap:12px;align-items:center;min-height:64px;padding:8px 2px;width:100%;cursor:pointer}
.ax-row>button:focus-visible{outline:2px solid var(--dot);outline-offset:2px}
.ax-row img,.ax-row .ph{width:48px;height:48px;border-radius:8px;object-fit:cover;background:var(--card)}
.ax-row b{font-weight:600;display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ax-det{padding:4px 2px 16px;display:grid;gap:12px}
.ax-sec{display:grid;gap:12px;padding-block:6px 26px;align-content:start}.ax-sec h2{font:400 24px var(--serif)}
.ax-two{display:grid;gap:8px}
.ax-health{display:grid;gap:8px}.ax-health .st-status{margin:0}
.ax-sum{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.ax-sum div{background:var(--paper);border:1px solid var(--line);border-radius:14px;padding:12px;display:grid}.ax-sum b{font:400 30px/1 var(--serif)}.ax-sum span{font-size:12px;color:var(--muted)}
.ax-cols{display:grid;gap:10px}.ax-narrow{max-width:760px}
.adm details>summary{min-height:44px;display:flex;align-items:center;cursor:pointer;font-weight:600}
@media(min-width:900px){
 .adm.st{grid-template-columns:220px minmax(0,1fr)}
 .adm .ax-side{display:grid;align-content:start;gap:4px;padding:26px 16px;background:var(--paper);border-inline-end:1px solid var(--line);position:sticky;top:0;height:100vh}
 .ax-side b{font:500 24px var(--serif);padding:0 12px 16px}
 .ax-side a.ax-l{justify-content:space-between;min-height:44px;padding:0 12px;border-radius:12px;color:var(--ink)}
 .ax-side a.ax-l[aria-current]{background:var(--ink);color:var(--wall)}.ax-side a.ax-l[aria-current] .ax-badge{background:var(--wall);color:var(--ink)}
 .ax-side .ax-out{margin-top:auto;color:var(--muted);font-size:14px;text-decoration:none;min-height:44px;display:flex;align-items:center;padding:0 12px}
 .ax-tabs,.ax-top{display:none}.ax-main{padding:26px 40px 60px;max-width:1180px}.ax-h1{font-size:40px}
 .ax-q{grid-template-columns:repeat(2,minmax(0,1fr))}
 .ax-keys{display:flex;gap:16px;padding-top:20px;color:var(--muted);font-size:13px;flex-wrap:wrap}.ax-keys kbd{font:500 11px var(--mono);border:1px solid var(--line);border-radius:6px;padding:2px 6px;background:var(--paper)}
 .ax-toast{inset-inline:auto 40px;bottom:28px;min-width:320px}
 .ax-two{grid-template-columns:repeat(2,minmax(0,1fr));gap:36px}.ax-cols{grid-template-columns:repeat(3,1fr)}
 .ax-list{max-width:900px}}
@media(prefers-reduced-motion:reduce){.ax-card{transition:none}}`;

const nav = (tab, cls) => NAV.map(([k, t]) => `<a ${cls ? `class="${cls}"` : ''} href="#/admin${k ? '/' + k : ''}" ${k === tab ? 'aria-current="page"' : ''}><span>${t}</span>${k === '' ? '<i class="ax-badge" data-q></i>' : k === 'system' ? '<i class="ax-dot" data-h hidden></i>' : ''}</a>`).join('');
const shell = (tab, title, body) => `<div class="adm st" dir="rtl" lang="he">
  <aside class="ax-side"><b>חדר בקרה</b>${nav(tab, 'ax-l')}<a class="ax-out" href="#/">← לאפליקציה</a></aside>
  <div class="ax-main"><div class="ax-top"><a class="back" href="#/">→ לאפליקציה</a><span class="tag">חדר בקרה</span></div>
    <h1 class="ax-h1" id="axH1">${esc(title)}</h1>${body}</div>
  <nav class="ax-tabs" aria-label="חדר בקרה">${nav(tab)}</nav></div>`;

// --- entry ------------------------------------------------------------------------------------------------------------
export async function admin(hash, app, go, model) {
  M = model; APP = app; GO = go;
  if (!document.getElementById('ax-css')) { const s = document.createElement('style'); s.id = 'ax-css'; s.textContent = CSS; document.head.appendChild(s); }
  await draw(hash);
}
async function draw(hash, keepScroll) {
  const app = APP, y = keepScroll ? window.scrollY : 0;
  const t = document.getElementById('axToast'); if (t && !keepScroll) t.hidden = true;
  const c = await client();
  const { data: { session } } = await c.auth.getSession();
  const { data: ok } = session ? await c.rpc('is_admin') : { data: false };
  if (!ok) { app.innerHTML = shell('', 'חדר בקרה', `<p class="m">המסך הזה למנהלי Open Studio בלבד. ${session ? '' : '<a href="#/welcome">צריך להתחבר</a> קודם.'}</p>`); return; }
  const m = hash.replace(/^#\/admin\/?/, ''), part = m.split('/')[0];
  const tab = part in TAB_OF ? part : '', nt = TAB_OF[tab];
  if (!keepScroll) app.innerHTML = shell(nt, TITLES[nt], '<p class="m">טוען…</p>');
  let body;
  if (tab === 'artists') body = await artists(c);
  else if (tab === 'people') body = await people(c);
  else if (tab === 'curated') body = `<div class="ax-narrow">${await curated(c, m.split('/')[1])}</div>`;
  else if (nt === 'system') body = system();
  else body = await queue(c);
  if (!document.querySelector('.adm')) return;         // went elsewhere while loading
  app.innerHTML = shell(nt, tab === '' ? QT : TITLES[nt], body);
  window.scrollTo(0, y);
  wire(app, c, tab === '' ? 'queue' : nt === 'system' ? 'system' : tab);
  queueCount(c).then(q => badge(q.n));
  healthState().then(h => $$(app, '[data-h]').forEach(d => { d.hidden = !(h.issues && h.issues.length); }));
}
const badge = n => $$(document, '[data-q]').forEach(b => { b.textContent = n || ''; });
const again = () => { QC = null; return draw(location.hash, true); };

// --- what waits for you: one list ------------------------------------------------------------------------------------
async function queueData(c) {
  const [{ data: waiting = [] }, { data: fresh = [] }, { data: withShows = [] }] = await Promise.all([
    c.from('artists').select('id, name, discipline, city, country, statement, note, instagram, link, created_at, sent_at').eq('status', 'pending').order('created_at'),
    c.from('works').select('id, title, year, medium, width, height, thumb, image, created_at, artist_id, artists(name, status)').is('reviewed_at', null).order('created_at', { ascending: false }).limit(300),
    c.from('artists').select('id, name, exhibitions')]);
  const ids = waiting.map(a => a.id);
  const { data: aw = [] } = ids.length ? await c.from('works').select('artist_id, thumb, image').in('artist_id', ids).limit(400) : { data: [] };
  const groups = [];
  for (const w of fresh) { if (!(w.artists && w.artists.status === 'approved')) continue;   // a page not yet approved is looked over as a whole, with the artist
    let g = groups.find(x => x.id === w.artist_id); if (!g) groups.push(g = { id: w.artist_id, name: w.artists ? w.artists.name : '', works: [] }); g.works.push(w); }
  const tours = withShows.flatMap(a => (a.exhibitions || []).filter(e => e.tour === 'requested' || e.tour === 'building').map(e => ({ uid: a.id, name: a.name, title: e.title, building: e.tour === 'building',
    photos: (e.photos || []).length, extra: (e.tourFiles || []).length, video: !!(e.video || (e.tourFiles || []).some(f => f.kind === 'video')), at: e.tourRequested || Date.now() })));
  return { waiting, aw, groups, tours, n: waiting.length + groups.length + tours.length };
}
const queueCount = c => (QC && Date.now() - QC.t < 15000 ? QC.p : (QC = { t: Date.now(), p: queueData(c) }).p);
const heading = n => n === 0 ? 'הכל מטופל' : n === 1 ? 'דבר אחד מחכה לך' : `${n} דברים מחכים לך`;

async function queue(c) {
  QC = null;
  const q = await queueCount(c);
  QT = heading(q.n);
  const artist = a => { const ws = q.aw.filter(w => w.artist_id === a.id);
    return `<article class="ax-card" tabindex="0" data-kind="artist" data-id="${a.id}" data-name="${esc(a.name)}" data-note="${esc(a.note || '')}">
    <div class="ax-hd"><div><div class="ax-kind">אמן/ית מחכה לאישור</div><h2>${esc(a.name)}</h2></div><span class="st-flag">נשלח ${ago(a.sent_at || a.created_at)}</span></div>
    <p class="ax-meta"><bdi>${esc([a.discipline, a.city, a.country].filter(Boolean).join(' · '))}</bdi> · ${ws.length} עבודות${a.instagram ? ` · <a href="https://instagram.com/${esc(a.instagram.replace(/^@/, ''))}" target="_blank" rel="noopener" dir="ltr">${esc(a.instagram)}</a>` : ''}${a.link ? ` · <a href="${esc(a.link)}" target="_blank" rel="noopener">אתר</a>` : ''}</p>
    ${ws.length ? `<div class="ax-th">${ws.slice(0, 8).map(w => `<img src="${esc(w.thumb || w.image)}" alt="" loading="lazy">`).join('')}</div>` : ''}
    ${a.statement ? `<p class="ax-st" dir="auto">${esc(a.statement)}</p>` : ''}
    <div class="ax-ask" data-ask hidden><label>מה לשנות? האמן/ית רואה את זה בסטודיו (עדיף באנגלית)<input name="note" dir="auto" placeholder="e.g. Add sizes to your works, then we'll put you live"></label>
      <div class="ax-acts"><button type="button" class="btn f" data-act="send-ask">שלח לאמן/ית</button><button type="button" class="btn g" data-act="cancel-ask">ביטול</button></div></div>
    <div class="ax-acts" data-main><button type="button" class="btn f" data-act="approve">אשר</button><button type="button" class="btn g" data-act="ask">בקש שינויים</button><a class="btn ax-t3" href="#/preview/${a.id}" data-act="preview">צפה בעמוד ←</a></div></article>`; };
  const works = g => { const miss = g.works.filter(w => !(w.width && w.height)).length;
    return `<article class="ax-card" tabindex="0" data-kind="works" data-name="${esc(g.name)}">
    <div class="ax-hd"><div><div class="ax-kind">עבודות חדשות לבדיקה</div><h2>${esc(g.name)}</h2></div><span class="st-flag ok">באוויר</span></div>
    <p class="ax-meta">${g.works.length} עבודות · הקש כדי להסתיר${miss ? ` · ${miss} בלי מידות (?)` : ''}</p>
    <div class="ax-grid">${g.works.map(w => `<button type="button" class="ax-t" data-w="${w.id}" data-act="flag" aria-pressed="false" aria-label="${esc(w.title)}" title="${esc([w.title, w.year, w.medium].filter(Boolean).join(' · '))}"><img src="${esc(w.thumb || w.image)}" alt="" loading="lazy">${w.width && w.height ? '' : '<i>?</i>'}</button>`).join('')}</div>
    <div class="ax-acts"><button type="button" class="btn f" data-act="ok-works">הכל נראה טוב</button></div></article>`; };
  const tour = t => `<article class="ax-card" tabindex="0" data-kind="tour"><div class="ax-hd"><div><div class="ax-kind">בקשת סיור תלת־ממדי</div><h2>${esc(t.title)}</h2></div><span class="st-flag">${t.building ? 'בבנייה' : 'ביקש סיור'}</span></div>
    <p class="ax-meta"><bdi>${esc(t.name)}</bdi> · ${t.photos} צילומי הצבה · ${t.extra} קבצים לסיור${t.video ? ' · יש סרטון' : ''} · ${ago(t.at)}</p>
    <div class="ax-acts"><a class="btn f" href="#/preview/${t.uid}" data-act="preview">פתח את התערוכה</a></div></article>`;
  const cards = [...q.waiting.map(artist), ...q.groups.map(works), ...q.tours.map(tour)].join('');
  return `<p class="ax-sub" id="axSum"> </p><div class="ax-q" id="axQ">${cards}</div>
    <div class="ax-empty" id="axEmpty" ${q.n ? 'hidden' : ''}><b>אין מה לעשות</b><p class="m">כל מה שנשלח אליך טופל.</p><div class="ax-acts"><a class="btn g" href="#/admin/artists">לכל האמנים</a><a class="btn g" href="#/admin/curated">לתערוכות</a></div></div>
    <div class="ax-keys" aria-hidden="true" ${q.n ? '' : 'hidden'}><span><kbd>J</kbd> <kbd>K</kbd> מעבר בין פריטים</span><span><kbd>A</kbd> אשר</span><span><kbd>C</kbd> בקש שינויים</span><span><kbd>P</kbd> צפה בעמוד</span></div>`;
}
function recount(app) {
  const n = app.querySelectorAll('#axQ > .ax-card').length;
  const h = app.querySelector('#axH1'); if (h) h.textContent = heading(n);
  badge(n); const e = app.querySelector('#axEmpty'); if (e) e.hidden = n > 0;
  const k = app.querySelector('.ax-keys'); if (k) k.hidden = n === 0;
}
async function summary(c, app) {
  const [{ data: ps = [] }, { count: live }, { count: allWorks }] = await Promise.all([
    c.from('profiles').select('created_at').order('created_at', { ascending: false }).limit(1000),
    c.from('artists').select('id', { count: 'exact', head: true }).eq('status', 'approved'),
    c.from('works').select('id', { count: 'exact', head: true })]);
  const el = app.querySelector('#axSum'); if (!el) return;
  const week = ps.filter(p => Date.now() - new Date(p.created_at) < 7 * 864e5).length;
  el.innerHTML = `<a href="#/admin/people">השבוע הצטרפו ${week}</a> · <a href="#/admin/artists">${live ?? 0} אמנים באוויר</a> · ${allWorks ?? 0} עבודות`;
}

// approving a page also settles its works (they were looked at with the page); a note goes with a change request
async function decide(c, id, status, note) {
  const { data: pend = [] } = status === 'approved' ? await c.from('works').select('id').eq('artist_id', id).is('reviewed_at', null) : { data: [] };
  const ids = pend.map(w => w.id);
  const { error } = await c.from('artists').update({ status, note: note || null }).eq('id', id);
  if (error) return { error };
  if (ids.length) await c.from('works').update({ reviewed_at: new Date().toISOString() }).in('id', ids);
  return { ids };
}

// --- community: artists (find, hide, approve again), people ---------------------------------------------------------------
const STATUS = { pending: 'נשלח לבדיקה', changes: 'מחכה לתיקונים', draft: 'בעבודה, לא נשלח', approved: 'באוויר', hidden: 'מוסתר' };
const seg = (view, na, np) => `<div class="ax-seg"><a href="#/admin/artists" ${view === 'artists' ? 'aria-current="page"' : ''}>אמנים · ${na}</a><a href="#/admin/people" ${view === 'people' ? 'aria-current="page"' : ''}>אנשים · ${np}</a></div>`;
async function artists(c) {
  const [{ data: rows = [] }, { data: works = [] }, { count: np }] = await Promise.all([c.from('artists').select('*').order('created_at', { ascending: false }),
    c.from('works').select('artist_id, thumb, image'), c.from('profiles').select('id', { count: 'exact', head: true })]);
  const order = { pending: 0, changes: 1, draft: 2, approved: 3, hidden: 4 };
  rows.sort((a, b) => order[a.status] - order[b.status]);
  if (!rows.length) return seg('artists', 0, np ?? 0) + '<p class="m">אף אמן עוד לא יצר עמוד. כשמישהו יצור ויישלח לבדיקה, הוא יחכה לך בתור.</p>';
  const cnt = s => rows.filter(r => s === 'all' || r.status === s).length;
  const chips = [['all', 'הכל'], ['pending', 'מחכים'], ['approved', 'באוויר'], ['changes', 'מחכים לאמן'], ['hidden', 'מוסתרים']].filter(([k]) => k === 'all' || cnt(k));
  return `${seg('artists', rows.length, np ?? 0)}<div class="ax-list"><input class="ax-search" type="search" id="axFind" placeholder="חיפוש אמן/ית" aria-label="חיפוש אמן/ית" dir="auto">
    <div class="ax-chips" role="group" aria-label="סינון">${chips.map(([k, t], i) => `<button type="button" data-f="${k}" aria-pressed="${i === 0}">${t} · ${cnt(k)}</button>`).join('')}</div>
    <div id="axRows">${rows.map(a => { const ws = works.filter(w => w.artist_id === a.id), p = ws[0] && (ws[0].thumb || ws[0].image); return `<div class="ax-row" data-s="${a.status}" data-n="${esc(a.name.toLowerCase())}" data-id="${a.id}">
      <button type="button" aria-expanded="false">${p ? `<img src="${esc(p)}" alt="" loading="lazy">` : '<span class="ph"></span>'}<span><b>${esc(a.name)}</b><span class="ax-meta"><bdi>${esc([a.discipline, a.city].filter(Boolean).join(' · '))}</bdi> · ${ws.length} עבודות</span></span><span class="st-flag ${a.status === 'approved' ? 'ok' : a.status === 'hidden' ? 'no' : ''}">${STATUS[a.status] || a.status}</span></button>
      <div class="ax-det" hidden>
        <p class="ax-meta">הצטרף/ה ${day(a.created_at)}${a.sent_at ? ` · נשלח לבדיקה ${day(a.sent_at)}` : ''}${a.instagram ? ` · <a href="https://instagram.com/${esc(a.instagram.replace(/^@/, ''))}" target="_blank" rel="noopener">${esc(a.instagram)}</a>` : ''}${a.link ? ` · <a href="${esc(a.link)}" target="_blank" rel="noopener">אתר</a>` : ''}</p>
        ${a.statement ? `<p dir="auto">${esc(a.statement)}</p>` : ''}
        ${ws.length ? `<div class="ax-th">${ws.slice(0, 12).map(w => `<img src="${esc(w.thumb || w.image)}" alt="" loading="lazy">`).join('')}</div>` : '<p class="ax-meta">עוד אין עבודות.</p>'}
        ${a.status !== 'approved' && a.status !== 'hidden' ? `<div class="ax-ask"><label>מה לשנות, או הערה לאמן/ית (עדיף באנגלית)<input name="note" dir="auto" value="${esc(a.note || '')}" placeholder="e.g. Add sizes to your works, then we'll put you live"></label></div>` : ''}
        <div class="ax-acts"><a class="btn g" href="#/preview/${a.id}">צפה בעמוד</a>${a.status !== 'approved' ? `<button type="button" class="btn f" data-status="approved">${a.status === 'hidden' ? 'החזר לאוויר' : 'אשר'}</button>` : ''}${a.status !== 'changes' && a.status !== 'approved' && a.status !== 'hidden' ? '<button type="button" class="btn g" data-status="changes">בקש שינויים</button>' : ''}${a.status !== 'hidden' ? '<button type="button" class="btn ax-t3" data-status="hidden">הסתר</button>' : ''}</div></div></div>`; }).join('')}</div></div>`;
}
async function people(c) {
  const [{ data: rows = [] }, { count: na }] = await Promise.all([c.from('profiles').select('first_name, last_name, role, country, provider, created_at').order('created_at', { ascending: false }).limit(500),
    c.from('artists').select('id', { count: 'exact', head: true })]);
  const count = f => Object.entries(rows.reduce((o, r) => { const k = f(r) || '—'; o[k] = (o[k] || 0) + 1; return o; }, {})).sort((a, b) => b[1] - a[1]);
  const week = rows.filter(r => Date.now() - new Date(r.created_at) < 7 * 864e5).length, today = rows.filter(r => Date.now() - new Date(r.created_at) < 864e5).length;
  const kv = (t, list) => `<div class="st-card" style="margin:0"><h3 class="adm-h3">${t}</h3>${list.map(([k, v]) => `<div class="adm-kv"><span>${esc(k)}</span><b>${v}</b></div>`).join('')}</div>`;
  return `${seg('people', na ?? 0, rows.length)}<div class="ax-sum"><div><b>${today}</b><span>היום</span></div><div><b>${week}</b><span>השבוע</span></div><div><b>${rows.length}</b><span>בסך הכל</span></div></div>
    <div class="ax-cols" style="margin-top:12px">${kv('נרשמו בתור', count(r => roleName(r.role)))}${kv('נכנסו עם', count(r => r.provider === 'google' ? 'Google' : 'מייל'))}${kv('מאיפה', count(r => r.country).slice(0, 6))}</div>
    <section class="ax-sec ax-list" style="padding-top:22px"><h2>האחרונים</h2><div class="adm-table">${rows.slice(0, 60).map(r => `<div><b>${esc(who(r))}</b><span>${r.role ? roleName(r.role) : '—'}</span><span>${esc(r.country || '')}</span><span>${ago(r.created_at)}</span></div>`).join('')}</div></section>`;
}

// --- curated exhibitions: chosen and ordered by hand, across artists --------------------------------------------------
const keyOf = w => w.community ? { id: w.id } : { slug: w.slug };
const findWork = k => M.works.find(w => (k.id && w.id === k.id) || (k.slug && w.slug === k.slug));
async function curated(c, id) {
  const { ROOMS, PAINTS } = await synth();
  if (!id) {
    const { data: rows = [] } = await c.from('virtual_shows').select('*').order('created_at', { ascending: false });
    const mine = rows.filter(r => r.kind === 'curated'), theirs = rows.filter(r => r.kind === 'artist' && r.status === 'published');
    return `<p class="m">תערוכות שאתה מרכיב מעבודות של כל האמנים, בסדר שאתה בוחר, באחד החללים של Open Studio. בלי אלגוריתם: אחרי פרסום הן מופיעות ב־Shows ובשמיים של עמוד הבית כמו כל תערוכה.</p>
      <div class="btns"><a class="btn f" href="#/admin/curated/new">תערוכת אוצרות חדשה</a></div>
      <div class="list">${mine.map(r => `<a class="row" href="#/admin/curated/${r.id}"><img src="${esc((findWork(r.works[0] || {}) || {}).image || '')}" alt=""><div class="t"><div><b>${esc(r.title)}</b></div><div class="m">${esc(ROOMS[r.room] ? ROOMS[r.room].name : r.room)} · ${r.works.length} עבודות</div></div><span class="st-flag ${r.status === 'published' ? 'ok' : ''}">${r.status === 'published' ? 'מפורסמת' : 'טיוטה'}</span></a>`).join('') || '<p class="m small">עוד אין. (The Green Hour, תערוכת הדוגמה, שמורה בנתונים של האפליקציה עצמה.)</p>'}</div>
      ${theirs.length ? `<section class="sec"><div class="sec-h"><h2>של האמנים עצמם</h2><span class="more">${theirs.length} מפורסמות</span></div><div class="list">${theirs.map(r => `<div class="row noimg"><div class="t"><div><b>${esc(r.title)}</b></div><div class="m">${r.works.length} עבודות</div></div><button class="btn g" data-unpublish="${r.id}">הורד</button></div>`).join('')}</div></section>` : ''}`;
  }
  if (!cur || cur.id !== id) {
    if (id === 'new') cur = { id: 'new', title: '', curator: 'Elad Amsalem', room: 'long-hall', paint: '', centre: 148, text: '', works: [], status: 'draft' };
    else { const { data } = await c.from('virtual_shows').select('*').eq('id', id).maybeSingle(); if (!data) return '<p class="m">לא נמצא.</p>'; cur = { ...data, text: data.text || '' }; }
  }
  const v = cur, paint = v.paint || ROOMS[v.room].paint, picked = v.works.map(findWork);
  const byArtist = [...new Set(M.works.map(w => w.artist))].map(a => [a, M.works.filter(w => w.artist === a && !picked.includes(w))]).filter(([, ws]) => ws.length);
  return `<form class="st-form st-vx" id="cuForm">
    <label>שם (באנגלית, כמו באפליקציה)<input name="title" dir="auto" required value="${esc(v.title)}"></label>
    <label>אוצר/ת<input name="curator" dir="auto" value="${esc(v.curator || '')}"></label>
    <fieldset><legend>החלל</legend><div class="vx-rooms">${Object.entries(ROOMS).map(([k, r]) => `<label class="vx-room"><input type="radio" name="room" value="${k}" ${v.room === k ? 'checked' : ''}><b>${esc(r.name)}</b><span class="m small">${esc(r.size)} · ${esc(r.blurb)}</span></label>`).join('')}</div></fieldset>
    <fieldset><legend>צבע הקירות</legend><div class="vx-paints">${Object.entries(PAINTS).map(([k, [n, col]]) => `<label class="vx-paint"><input type="radio" name="paint" value="${k}" ${paint === k ? 'checked' : ''}><i style="background:${col}"></i><span>${n}</span></label>`).join('')}</div></fieldset>
    <fieldset><legend>העבודות, בסדר ההליכה</legend>
      ${picked.length ? `<ol class="vx-order">${picked.map((w, i) => w ? `<li><img src="${esc(w.image)}" alt=""><div class="t"><b>${esc(w.title)}</b><span class="m small">${esc(w.artist.name)}</span></div>
        <button type="button" data-up="${i}" aria-label="מוקדם יותר" ${i ? '' : 'disabled'}>↑</button><button type="button" data-down="${i}" aria-label="מאוחר יותר" ${i < picked.length - 1 ? '' : 'disabled'}>↓</button><button type="button" data-out="${i}" aria-label="הוצא">×</button></li>` : '').join('')}</ol>` : '<p class="m">בוחרים עבודות למטה, מכל אמן.</p>'}
      ${byArtist.map(([a, ws]) => `<details class="vx-add"><summary>${esc(a.name)} (${ws.length})</summary><div class="st-pick">${ws.map(w => `<label><input type="checkbox" data-add="${esc(w.slug)}"><img src="${esc(w.image)}" alt="" loading="lazy"><span>${esc(w.title)}</span></label>`).join('')}</div></details>`).join('')}
    </fieldset>
    <label>דברי האוצר (באנגלית, כמו באפליקציה)<textarea name="text" dir="auto" rows="5">${esc(v.text)}</textarea></label>
    <div class="btns"><button class="btn f" type="button" id="cuWalk" ${picked.length ? '' : 'disabled'}>להיכנס לחלל</button><button class="btn g" type="submit">שמור</button>
      <button class="btn g" type="button" id="cuPub">${v.status === 'published' ? 'הורד מהאפליקציה' : 'פרסם'}</button>${v.id !== 'new' ? '<button class="btn g" type="button" id="cuDel">מחק</button>' : ''}</div>
    <p class="m small">${v.status === 'published' ? 'מפורסמת: ב־Shows ובעמוד הבית.' : 'טיוטה: רק חדר הבקרה רואה אותה.'}</p>
  </form>`;
}

// --- the system: how the app is, asking for a change, trying it as someone new ----------------------------------------
const gh = p => fetch(`https://api.github.com/repos/${REPO}/${p}`, { headers: { Accept: 'application/vnd.github+json' } }).then(r => r.ok ? r.json() : null).catch(() => null);
const healthState = () => (HC && Date.now() - HC.t < 6e5 ? HC.p : (HC = { t: Date.now(), p: Promise.all([gh('issues?labels=app-health&state=open'), gh('actions/runs?per_page=40')]).then(([issues, runs]) => ({ issues, runs })) }).p);
function system() {
  return `<div class="ax-two"><div>
    <section class="ax-sec"><h2>תקינות</h2><div class="ax-health" id="axHealth"><p class="m">בודק…</p></div></section>
    <section class="ax-sec"><h2>בקשת שינוי</h2>
      <form class="st-form" id="rqForm" style="padding:0"><label>כתוב מה לשנות או להוסיף, בכל שפה. זה הופך למשימה לסשן הלילי, והדברים שנוגעים לעיצוב, להתחברות או לנתונים מחכים לאישור שלך.<textarea name="body" dir="auto" rows="3" required minlength="3"></textarea></label><div class="btns"><button class="btn f" type="submit">שלח</button></div></form>
      <div id="axReqs"></div></section></div>
    <div><section class="ax-sec"><h2>לנסות את האפליקציה כמשתמש חדש</h2>
      <p class="m">סיור בכל מסכי ההרשמה כמו שמשתמש חדש רואה אותם. בלי מייל ובלי קוד אמיתי, ושום דבר לא נשמר. החשבון שלך נשאר מחובר מתחת, ובפס למעלה יש יציאה.</p>
      <div class="ax-acts"><button type="button" class="btn f" data-preview="visitor">סיור כמבקר חדש</button><button type="button" class="btn g" data-preview="artist">סיור כאמן חדש</button></div>
      <details class="st-card adm-real" id="axReal"><summary>בדיקה אמיתית, עם חשבון בדיקה</summary><p class="m">הרשמה אמיתית כאדם חדש, מההתחלה, בלי לגעת בחשבון שלך (מייל וקוד אמיתיים):</p>
        <ol class="m small adm-steps"><li>פותחים חלון גלישה פרטית (באייפון: לשוניות ואז פרטי; בכרום: חלון אנונימי) בכתובת <b dir="ltr">eladamsalem.com/open-studio</b>.</li>
          <li>בוחרים "Continue with email" ומדביקים: <code id="admAlias" dir="ltr"></code> <button type="button" class="btn g" id="admCopy">העתק</button></li>
          <li>הקוד מגיע ל־<b dir="ltr">ooopenstudio@gmail.com</b>. ממשיכים כמו כל אחד: פרטים, ואז "I make art" או "I love art".</li></ol>
        <p class="m small">כל כתובת עם "+" היא חשבון חדש עם אותה תיבת מייל. כשמסיימים מוחקים אותם כאן, עם כל מה שיצרו.</p>
        <div id="admTests"><p class="m small">טוען את חשבונות הבדיקה…</p></div></details></section></div></div>`;
}
async function fillSystem(app, c) {
  const { issues, runs } = await healthState();
  const latest = new Map();
  for (const r of (runs && runs.workflow_runs) || []) if (!latest.has(r.name) && !/pages build/.test(r.name)) latest.set(r.name, r);
  const mark = r => r.status !== 'completed' ? ['', 'רץ'] : r.conclusion === 'success' ? ['ok', 'תקין'] : ['no', r.conclusion === 'failure' ? 'נכשל' : r.conclusion];
  const all = [...latest.values()], bad = all.filter(r => mark(r)[0] === 'no'), row = r => `<a class="row noimg" href="${esc(r.html_url)}" target="_blank" rel="noopener"><div class="t"><div><b>${esc(r.name)}</b></div><div class="m">${ago(r.created_at)}</div></div><span class="st-flag ${mark(r)[0]}">${esc(mark(r)[1])}</span></a>`;
  const box = app.querySelector('#axHealth'); if (!box) return;
  box.innerHTML = `${issues && issues.length ? `<p class="st-status no">משהו שבור: <a href="${esc(issues[0].html_url)}" target="_blank" rel="noopener" dir="ltr">${esc(issues[0].title)}</a>. הסשן הלילי מטפל בזה.</p>` : issues ? `<p class="st-status ok">הכל תקין${all.length ? `: ${all.length - bad.length} מתוך ${all.length} הבדיקות עוברות` : ''}.</p>` : '<p class="m">GitHub לא ענה כרגע.</p>'}
    ${bad.length ? `<div class="list">${bad.map(row).join('')}</div>` : ''}
    ${all.length ? `<details><summary>כל הריצות האחרונות (${all.length})</summary><div class="list">${all.map(row).join('')}</div></details>` : ''}
    <p class="m small"><a href="https://github.com/${REPO}/blob/studio/studio/app/health/log.md" target="_blank" rel="noopener">מה הסשן הלילי עשה, לילה אחרי לילה</a></p>`;
  const { data: rows = [] } = await c.from('change_requests').select('*').order('created_at', { ascending: false }).limit(30);
  const rq = app.querySelector('#axReqs'); if (!rq) return;
  const st = r => r.status === 'open' ? 'מחכה' : r.status === 'filed' ? `בטיפול${r.issue ? ` (<a href="https://github.com/${REPO}/issues/${r.issue}" target="_blank" rel="noopener">#${r.issue}</a>)` : ''}` : 'בוצע';
  const one = r => `<div class="row noimg"><div class="t"><div>${esc(r.body.slice(0, 160))}</div><div class="m">${ago(r.created_at)} · ${st(r)}</div></div></div>`;
  const openN = rows.filter(r => r.status !== 'done').length;
  rq.innerHTML = rows.length ? `<details><summary>הבקשות שלי (${rows.length}${openN ? `, ${openN} פתוחות` : ''})</summary><div class="list">${rows.map(one).join('')}</div></details>` : '';
}

async function callUsers(c, body) {
  const { data: { session } } = await c.auth.getSession();
  const r = await fetch(USERS, { method: 'POST', headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const d = await r.json().catch(() => ({ error: 'אין תשובה.' }));
  if (!r.ok || d.error) throw new Error(d.error || 'זה לא עבד.');
  return d;
}

// --- one small message at the bottom; the last decision can be undone -------------------------------------------------------
let TT;
function toast(msg, undo) {
  let t = document.getElementById('axToast');
  if (!t) { t = document.createElement('div'); t.id = 'axToast'; t.className = 'ax-toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
  t.innerHTML = `<span>${esc(msg)}</span>${undo ? '<button type="button">בטל</button>' : ''}`; t.hidden = false;
  if (undo) t.querySelector('button').onclick = async () => { t.hidden = true; await undo(); };
  clearTimeout(TT); TT = setTimeout(() => { t.hidden = true; }, undo ? 9000 : 5000);
}
const fail = e => toast(`לא הצליח: ${e.message || e}`);

function wire(app, c, tab) {
  const $ = s => app.querySelector(s), go = GO;
  app.querySelectorAll('[data-preview]').forEach(b => b.onclick = async () => {
    const { startPreview } = await import('./auth.js');
    startPreview(b.dataset.preview); go('#/welcome');
  });
  if (KEYS) { document.removeEventListener('keydown', KEYS); KEYS = null; }
  if (tab === 'queue') {
    summary(c, app);
    // a card leaves the list at once; the toast can bring the decision back
    const leave = (card, msg, undo) => { card.classList.add('out'); setTimeout(() => { card.remove(); recount(app); }, 170); QC = null; toast(msg, async () => { try { await undo(); } catch (e) { return fail(e); } again(); }); };
    const q = $('#axQ');
    q.addEventListener('click', async e => {
      const b = e.target.closest('[data-act]'); if (!b) return;
      const card = b.closest('.ax-card'), act = b.dataset.act;
      if (act === 'preview') return;
      if (act === 'flag') {
        const on = !b.classList.contains('x'); b.classList.toggle('x', on); b.setAttribute('aria-pressed', on);
        const bad = card.querySelectorAll('.ax-t.x').length, all = card.querySelectorAll('.ax-t').length;
        card.querySelector('[data-act=ok-works]').textContent = !bad ? 'הכל נראה טוב' : bad === all ? 'הסתר את כולן' : `אשר ${all - bad}, הסתר ${bad}`; return;
      }
      if (act === 'ask') { card.querySelector('[data-main]').hidden = true; const box = card.querySelector('[data-ask]'); box.hidden = false; box.querySelector('input').focus(); return; }
      if (act === 'cancel-ask') { card.querySelector('[data-ask]').hidden = true; card.querySelector('[data-main]').hidden = false; return; }
      b.disabled = true;
      if (card.dataset.kind === 'artist') {
        const note = card.querySelector('[name=note]').value.trim(), status = act === 'approve' ? 'approved' : 'changes';
        if (status === 'changes' && !note) { b.disabled = false; card.querySelector('[name=note]').focus(); return; }
        const { error, ids } = await decide(c, card.dataset.id, status, status === 'approved' ? '' : note);
        if (error) { b.disabled = false; return fail(error); }
        leave(card, `${status === 'approved' ? 'אושר/ה' : 'נשלחה בקשה לשינויים'}: ${card.dataset.name}`, async () => { const { error: er } = await c.from('artists').update({ status: 'pending', note: card.dataset.note || null }).eq('id', card.dataset.id); if (er) throw er; if (ids.length) await c.from('works').update({ reviewed_at: null }).in('id', ids); });
      } else if (act === 'ok-works') {
        const ids = $$(card, '.ax-t').map(t => t.dataset.w), hid = $$(card, '.ax-t.x').map(t => t.dataset.w), okk = ids.filter(i => !hid.includes(i)), now = new Date().toISOString();
        const jobs = [okk.length && c.from('works').update({ reviewed_at: now, hidden: false }).in('id', okk), hid.length && c.from('works').update({ reviewed_at: now, hidden: true }).in('id', hid)].filter(Boolean);
        const res = await Promise.all(jobs), er = res.find(r => r.error);
        if (er) { b.disabled = false; return fail(er.error); }
        leave(card, `${card.dataset.name}: ${okk.length ? `${okk.length} אושרו` : ''}${okk.length && hid.length ? ', ' : ''}${hid.length ? `${hid.length} הוסתרו` : ''}`, async () => { const { error: e2 } = await c.from('works').update({ reviewed_at: null, hidden: false }).in('id', ids); if (e2) throw e2; });
      }
    });
    q.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.matches('[name=note]')) { e.preventDefault(); e.target.closest('.ax-card').querySelector('[data-act=send-ask]').click(); } });
    KEYS = e => {
      if (!document.querySelector('#axQ')) { document.removeEventListener('keydown', KEYS); return; }
      if (e.metaKey || e.ctrlKey || e.altKey || /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
      const cards = $$(app, '#axQ > .ax-card'), i = cards.findIndex(x => x.classList.contains('key')), k = e.key.toLowerCase();
      const pick = j => { cards.forEach(x => x.classList.remove('key')); const x = cards[Math.max(0, Math.min(cards.length - 1, j))]; if (x) { x.classList.add('key'); x.scrollIntoView({ block: 'nearest' }); } };
      const on = cards[i], hit = s => (on && on.querySelector(s)) || { click() {} };
      if (k === 'j') pick(i + 1); else if (k === 'k') pick(i < 0 ? 0 : i - 1);
      else if (k === 'a') hit('[data-act=approve],[data-act=ok-works]').click();
      else if (k === 'c') hit('[data-act=ask]').click();
      else if (k === 'p') hit('[data-act=preview]').click();
      else return;
      e.preventDefault();
    };
    document.addEventListener('keydown', KEYS);
  }
  if (tab === 'artists') {
    const rows = $$(app, '.ax-row'), find = $('#axFind');
    if (find) {
      let f = 'all';
      const filter = () => rows.forEach(r => { r.hidden = !((f === 'all' || r.dataset.s === f) && (!find.value.trim() || r.dataset.n.includes(find.value.trim().toLowerCase()))); });
      find.oninput = filter;
      $$(app, '[data-f]').forEach(b => b.onclick = () => { f = b.dataset.f; $$(app, '[data-f]').forEach(x => x.setAttribute('aria-pressed', x === b)); filter(); });
      rows.forEach(r => r.querySelector(':scope > button').onclick = ev => { const d = r.querySelector('.ax-det'); d.hidden = !d.hidden; ev.currentTarget.setAttribute('aria-expanded', !d.hidden); });
      $$(app, '.ax-row [data-status]').forEach(b => b.onclick = async () => {
        const row = b.closest('.ax-row'), n = row.querySelector('[name=note]'), note = n ? n.value.trim() : '';
        if (b.dataset.status === 'changes' && !note) { n.focus(); n.placeholder = 'What should change? (the artist sees it in their studio)'; return; }
        b.disabled = true;
        const { error } = await decide(c, row.dataset.id, b.dataset.status, note);
        if (error) { b.disabled = false; return fail(error); }
        toast(`${row.querySelector('b').textContent}: ${{ approved: 'באוויר', hidden: 'הוסתר/ה', changes: 'נשלחה בקשה לשינויים' }[b.dataset.status]}`); again();
      });
    }
  }
  if (tab === 'system') {
    fillSystem(app, c);
    const rq = $('#rqForm');
    rq.onsubmit = async e => { e.preventDefault(); const body = new FormData(rq).get('body').trim(); const { error } = await c.from('change_requests').insert({ body }); if (error) return fail(error); rq.reset(); toast('הבקשה נשלחה'); fillSystem(app, c); };
    const real = $('#axReal'), alias = $('#admAlias');
    const t = new Date(), p = n => String(n).padStart(2, '0');
    alias.textContent = `ooopenstudio+t${p(t.getMonth() + 1)}${p(t.getDate())}${p(t.getHours())}${p(t.getMinutes())}@gmail.com`;
    $('#admCopy').onclick = () => navigator.clipboard.writeText(alias.textContent).then(() => { $('#admCopy').textContent = 'הועתק'; });
    const list = async () => {
      const box = $('#admTests'); if (!box) return;
      try {
        const { accounts } = await callUsers(c, { action: 'list' });
        box.innerHTML = accounts.length ? `<div class="list">${accounts.map(a => `<div class="row noimg"><div class="t"><div><b dir="ltr">${esc(a.email)}</b></div><div class="m">${esc(a.name || 'עוד בלי שם')} · ${a.role === 'artist' ? `אמן/ית${a.artist ? ` (${a.artist === 'pending' ? 'מחכה' : a.artist === 'approved' ? 'מאושר' : 'מוסתר'})` : ''}` : roleName(a.role)} · ${day(a.created_at)}</div></div><button type="button" class="btn g" data-del-user="${a.id}">מחק</button></div>`).join('')}</div>` : '<p class="m small">אין כרגע חשבונות בדיקה.</p>';
        box.querySelectorAll('[data-del-user]').forEach(b => b.onclick = async () => {
          if (!confirm('למחוק את חשבון הבדיקה ואת כל מה שהוא יצר?')) return;
          b.disabled = true;
          try { await callUsers(c, { action: 'delete', id: b.dataset.delUser }); list(); } catch (e) { fail(e); b.disabled = false; }
        });
      } catch (e) { box.innerHTML = `<p class="m small">${esc(e.message)}</p>`; }
    };
    let loaded = false; real.ontoggle = () => { if (real.open && !loaded) { loaded = true; list(); } };
  }
  app.querySelectorAll('[data-unpublish]').forEach(b => b.onclick = async () => { await c.from('virtual_shows').update({ status: 'draft' }).eq('id', b.dataset.unpublish); go(location.hash, true); });
  const cu = $('#cuForm');
  if (!cu) return;
  const keep = () => { const f = new FormData(cu); Object.assign(cur, { title: f.get('title').trim(), curator: f.get('curator').trim(), room: f.get('room'), paint: f.get('paint'), text: f.get('text') }); };
  const redo = () => { keep(); go(location.hash, true); };
  cu.querySelectorAll('input[name=room], input[name=paint]').forEach(i => i.onchange = redo);
  cu.querySelectorAll('[data-add]').forEach(b => b.onchange = () => { cur.works.push(keyOf(M.works.find(w => w.slug === b.dataset.add))); redo(); });
  cu.querySelectorAll('[data-up],[data-down],[data-out]').forEach(b => b.onclick = () => {
    const w = cur.works, i = +(b.dataset.up ?? b.dataset.down ?? b.dataset.out);
    if (b.dataset.out != null) w.splice(i, 1); else { const j = b.dataset.up != null ? i - 1 : i + 1; [w[i], w[j]] = [w[j], w[i]]; }
    redo();
  });
  const store = async status => {
    keep();
    const works = cur.works.map(k => { const w = findWork(k); return w ? { ...k, title: w.title, image: w.image, width: w.pairs && w.pairs[0] ? w.pairs[0][1] : null, height: w.pairs && w.pairs[0] ? w.pairs[0][0] : null, artist: w.artist.name } : null; }).filter(Boolean);
    const row = { kind: 'curated', title: cur.title || 'Untitled', curator: cur.curator || null, room: cur.room, paint: cur.paint || null, centre: cur.centre || 148, text: cur.text || null, works, status: status || cur.status };
    const q = cur.id === 'new' ? c.from('virtual_shows').insert(row).select().single() : c.from('virtual_shows').update(row).eq('id', cur.id).select().single();
    const { data, error } = await q;
    if (error) { alert(error.message); return; }
    cur = { ...data, text: data.text || '' };
    go(`#/admin/curated/${data.id}`, true);
  };
  cu.onsubmit = e => { e.preventDefault(); store(); };
  $('#cuPub').onclick = () => store(cur.status === 'published' ? 'draft' : 'published');
  const del = $('#cuDel'); if (del) del.onclick = async () => { if (!confirm('למחוק את התערוכה?')) return; await c.from('virtual_shows').delete().eq('id', cur.id); cur = null; go('#/admin/curated'); };
  $('#cuWalk').onclick = async () => {
    keep();
    const [{ buildRoom }, { openSpace }] = await Promise.all([synth(), import('./space/space.js')]);
    const works = cur.works.map(findWork).filter(Boolean);
    const made = await buildRoom({ title: cur.title || 'Untitled', room: cur.room, paint: cur.paint, centre: cur.centre, works }, u => (M.media && M.media[u]) || u);
    window.__spaceView = await openSpace({ spec: made.spec, works, src: u => (M.media && M.media[u]) || u, onClose: () => made.revoke() });
  };
}
