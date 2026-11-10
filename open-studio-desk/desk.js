// Open Studio Desk: the owner's control room for a computer and an iPad on its side. It talks to the same Supabase project
// as the phone app (data.js) and borrows the phone app's rooms and 3D viewer (APP). Hebrew, right to left, for its owner;
// the exhibitions' own text stays English, as in the app.
//
// Sections: אמנים, חובבי אמנות, תערוכות (the approved ones: artists', galleries and institutions', the app's own), מוזיאון (the articles: every one is a 3D room),
// אישורים (the queue of decisions), מערכת, שיחות (talking with users).

import { api, APP, guest, abs } from './data.js';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const day = t => new Date(t).toLocaleDateString('he-IL', { day: 'numeric', month: 'short', year: 'numeric' });
const ago = t => { const d = Math.floor((Date.now() - new Date(t)) / 864e5); return d <= 0 ? 'היום' : d === 1 ? 'אתמול' : d < 30 ? `לפני ${d} ימים` : day(t); };
const who = r => [r.first_name, r.last_name].filter(Boolean).join(' ') || '—';
const roleName = r => r === 'artist' ? 'אמן/ית' : r === 'lover' ? 'חובב/ת אמנות' : 'עוד לא בחר/ה';
const root = $('#desk');
const shellTop = () => guest ? '<div class="demo">מצב הדגמה: אמנים ויצירות לדוגמה, שום דבר לא נשמר ולא נשלח.</div>' : '';
const setKeys = fn => { KEYS && document.removeEventListener('keydown', KEYS); KEYS = fn; if (fn) document.addEventListener('keydown', fn); };
const mctx = () => ({ root, page: (...a) => { const k = KEYS; page(...a); if (k) setKeys(k); }, toast, fail, keys: setKeys, synth, viewerCss, shellTop });
const PREV = (() => { try { return +localStorage.getItem('desk-seen') || 0; } catch { return 0; } })();   // when the owner was here last: what is new since
try { localStorage.setItem('desk-seen', Date.now()); } catch {}
const synth = (() => { let p; return () => p || (p = import(APP + 'space/synth.js')); })();

// the phone app draws its 3D viewer and hang editor with its own styles (in its index.html): take only those rules (.sv*, .he*), and let the room use the whole window
let VCSS = null;
function viewerCss() {
  return VCSS || (VCSS = fetch(APP + 'index.html').then(r => r.text()).then(t => {
    const d = document.implementation.createHTMLDocument(''), st = d.createElement('style');
    st.textContent = [...t.matchAll(/<style>([\s\S]*?)<\/style>/g)].map(m => m[1]).join(' '); d.head.append(st);
    const mine = r => r.selectorText && r.selectorText.split(',').some(x => /^\s*\.(sv|he)(?=[-\s.:\[>]|$)/.test(x));
    const out = [];
    for (const r of st.sheet.cssRules) { if (r.type === 1 && mine(r)) out.push(r.cssText); else if (r.type === 4) { const k = [...r.cssRules].filter(mine).map(x => x.cssText).join(''); if (k) out.push(`@media ${r.conditionText}{${k}}`); } }
    const el = document.createElement('style'); el.textContent = out.join(' ') + ' .sv{left:0!important;transform:none!important;width:100%!important}'; document.head.append(el);
  }).catch(e => console.warn('viewer styles', e)));
}
const NAV = [['artists', 'אמנים'], ['lovers', 'חובבי אמנות'], ['exhibitions', 'תערוכות'], ['museum', 'מוזיאון'], ['approvals', 'אישורים'], ['system', 'מערכת'], ['talk', 'שיחות']];
const TITLES = { approvals: 'אישורים', artists: 'אמנים', lovers: 'חובבי אמנות', exhibitions: 'תערוכות', museum: 'מוזיאון', system: 'מערכת', talk: 'שיחות' };
let me = null, QN = 0, KEYS = null;

// --- small helpers ------------------------------------------------------------------------------------------------------
let TT;
function toast(msg, undo) {
  const t = $('#toast'); clearTimeout(TT);
  t.innerHTML = `<span>${esc(msg)}</span>${undo ? '<button type="button">בטל</button>' : ''}`; t.hidden = false;
  if (undo) t.querySelector('button').onclick = async () => { t.hidden = true; try { await undo(); } catch (e) { fail(e); } };
  TT = setTimeout(() => { t.hidden = true; }, undo ? 9000 : 3500);
}
const fail = e => toast(`לא הצליח: ${e && e.message || e}`);
const badge = n => { QN = n; $$('[data-q]').forEach(b => { b.textContent = n || ''; }); };

// --- entry --------------------------------------------------------------------------------------------------------------
async function boot() {
  try { await api.returnFromLink(); } catch (e) { console.warn(e); }
  let s = null; try { s = await api.session(); } catch (e) { console.warn(e); }
  if (!s) return gate();
  let ok = false; try { ok = await api.isAdmin(); } catch (e) { console.warn(e); }
  if (!ok) return gate(s.email);
  me = s; window.addEventListener('hashchange', route); route();
}

function gate(notAdmin) {
  let email = '';
  const draw = step => {
    root.innerHTML = `<div class="gate"><form id="gf" novalidate><h1>Open Studio Desk</h1>
      ${notAdmin ? `<p class="status no">החשבון ${esc(notAdmin)} אינו מנהל של Open Studio.</p>` : ''}
      ${step === 'mail' ? `<label class="field">המייל של חדר הבקרה<input name="email" type="email" dir="ltr" autocomplete="email" required value="${esc(email)}"></label>
        <button class="btn p" type="submit">שלח לי קוד</button>
        <p class="muted small">נשלח קוד בן 6 ספרות למייל. אם אתה כבר מחובר לאפליקציה בטלפון באותו דפדפן, הכניסה תיעשה לבד.</p>`
      : `<label class="field">הקוד שהגיע ל־${esc(email)}<input name="code" inputmode="numeric" autocomplete="one-time-code" dir="ltr" maxlength="8" required></label>
        <button class="btn p" type="submit">כניסה</button><button class="btn q" type="button" id="back">מייל אחר</button>`}
      <p class="err" role="alert"></p></form></div>`;
    const f = $('#gf'), err = $('.err', f);
    const b = $('#back'); if (b) b.onclick = () => draw('mail');
    f.onsubmit = async e => {
      e.preventDefault(); err.textContent = ''; const btn = $('.p', f); btn.disabled = true;
      try {
        if (step === 'mail') { email = f.email.value.trim(); await api.sendCode(email); draw('code'); }
        else { await api.verify(email, f.code.value.trim()); location.reload(); }
      } catch (x) { err.textContent = x.message || 'זה לא עבד.'; btn.disabled = false; }
    };
  };
  draw('mail');
}

function shell(tab, title, sub, body) {
  return `${guest ? '<div class="demo">מצב הדגמה: אמנים ויצירות לדוגמה, שום דבר לא נשמר ולא נשלח.</div>' : ''}
  <div class="shell"><aside class="rail"><div class="brand">Open Studio<small>Desk · חדר בקרה</small></div>
    <nav aria-label="ראשי">${NAV.map(([k, t]) => `<a class="nv" href="#/${k}" ${k === tab ? 'aria-current="page"' : ''}><span>${t}</span>${k === 'approvals' ? `<i class="badge" data-q>${QN || ''}</i>` : k === 'system' ? '<i class="dot" data-h hidden></i>' : ''}</a>`).join('')}</nav>
    <div class="who"><span dir="ltr">${esc(me.email)}</span><a href="${APP}" target="_blank" rel="noopener">האפליקציה בטלפון ↗</a><button type="button" id="out">יציאה</button></div></aside>
    <main><div class="top"><div><h1>${esc(title)}</h1>${sub ? `<p>${sub}</p>` : ''}</div></div>${body}</main></div>`;
}
function page(tab, title, sub, body) {
  KEYS && document.removeEventListener('keydown', KEYS); KEYS = null;
  root.innerHTML = shell(tab, title, sub, body);
  $('#out').onclick = async () => { await api.signOut(); location.reload(); };
  api.health().then(h => $$('[data-h]').forEach(d => { d.hidden = !(h.issues && h.issues.length); })).catch(() => {});
}

async function route() {
  const [tab = 'approvals', id] = location.hash.replace(/^#\//, '').split('/');
  window.scrollTo(0, 0);
  try {
    if (tab === 'artists') await artistsView(id);
    else if (tab === 'lovers' || tab === 'people') await peopleView();
    else if (tab === 'museum') { const m = await import('./museum.js'); if (id === 'ex') { const x = await import('./exedit.js'); KEYS && document.removeEventListener('keydown', KEYS); KEYS = null; root.innerHTML = ''; await x.editor(mctx(), location.hash.split('/')[3]); } else await m.home(mctx()); }
    else if (tab === 'system') await systemView();
    else if (tab === 'exhibitions') await exhibitionsView();
    else if (tab === 'talk') await talkView(id);
    else await queueView();
  } catch (e) { console.error(e); page(tab, TITLES[tab] || 'אישורים', '', `<p class="status no">משהו לא נטען: ${esc(e.message || e)}</p>`); }
}

// --- the queue: everything that waits for a decision -----------------------------------------------------------------------
const heading = n => n === 0 ? 'הכל מטופל' : n === 1 ? 'דבר אחד מחכה לך' : `${n} דברים מחכים לך`;
async function queueView() {
  const q = await api.queue(), allShows = await api.shows(), names = new Map((await api.artists()).map(a => [a.id, a.name]));
  q.shows = allShows.filter(s => s.kind === 'artist' && s.status !== 'published' && (s.works || []).length);        // an artist's exhibition that waits to go up
  const n = q.waiting.length + q.groups.length + q.tours.length + q.shows.length; badge(n);
  const showCard = s => `<article class="card" tabindex="0" data-kind="show" data-id="${esc(s.id)}" data-name="${esc(s.title)}">
    <div class="hd"><div><div class="kind">תערוכה של אמן/ית מחכה לפרסום</div><h2 dir="auto">${esc(s.title)}</h2></div><span class="chip">${esc(names.get(s.owner_id) || '')}</span></div>
    <p class="meta">${(s.works || []).length} עבודות · ${ago(s.created_at)}</p>
    <div class="th">${(s.works || []).slice(0, 8).map(w => `<img src="${esc(abs(w.thumb || w.image))}" alt="" loading="lazy">`).join('')}</div>
    <div class="acts"><button class="btn p" data-act="pub-show">אשר פרסום</button><a class="btn q" target="_blank" rel="noopener" href="${APP}#/preview/${esc(s.owner_id)}">צפה ↗</a></div></article>`;
  const artist = a => `<article class="card" tabindex="0" data-kind="artist" data-id="${esc(a.id)}" data-name="${esc(a.name)}" data-note="${esc(a.note || '')}">
    <div class="hd"><div><div class="kind">אמן/ית מחכה לאישור</div><h2>${esc(a.name)}</h2></div><span class="chip">נשלח ${ago(a.sent_at || a.created_at)}</span></div>
    <p class="meta"><bdi>${esc([a.discipline, a.city, a.country].filter(Boolean).join(' · '))}</bdi> · ${a.works.length} עבודות${a.instagram ? ` · <a dir="ltr" target="_blank" rel="noopener" href="https://instagram.com/${esc(a.instagram.replace(/^@/, ''))}">${esc(a.instagram)}</a>` : ''}${a.link ? ` · <a target="_blank" rel="noopener" href="${esc(a.link)}">אתר</a>` : ''}</p>
    ${a.works.length ? `<div class="th">${a.works.slice(0, 8).map(w => `<img src="${esc(w.thumb || w.image)}" alt="" loading="lazy">`).join('')}</div>` : ''}
    ${a.statement ? `<p class="stmt" dir="auto">${esc(a.statement)}</p>` : ''}
    <div class="field" data-ask hidden><label class="field">מה לשנות? האמן/ית רואה את זה בסטודיו (עדיף באנגלית)<input name="note" dir="auto" placeholder="e.g. Add sizes to your works, then we'll put you live"></label><div class="acts"><button class="btn p" data-act="send-ask">שלח לאמן/ית</button><button class="btn q" data-act="cancel-ask">ביטול</button></div></div>
    <div class="acts" data-main><button class="btn p" data-act="approve">אשר</button><button class="btn" data-act="ask">בקש שינויים</button><a class="btn q" target="_blank" rel="noopener" href="${APP}#/preview/${esc(a.id)}">צפה בעמוד ↗</a></div></article>`;
  const works = g => { const miss = g.works.filter(w => !(w.width && w.height)).length;
    return `<article class="card" tabindex="0" data-kind="works" data-name="${esc(g.name)}">
    <div class="hd"><div><div class="kind">עבודות חדשות לבדיקה</div><h2>${esc(g.name)}</h2></div><span class="chip ok">באוויר</span></div>
    <p class="meta">${g.works.length} עבודות · הקש על תמונה כדי להסתיר אותה${miss ? ` · ${miss} בלי מידות` : ''}</p>
    <div class="th">${g.works.map(w => `<button type="button" class="tile" data-w="${esc(w.id)}" data-act="flag" aria-pressed="false" aria-label="${esc(w.title)}" title="${esc([w.title, w.year, w.medium].filter(Boolean).join(' · '))}"><img src="${esc(w.thumb || w.image)}" alt=""></button>`).join('')}</div>
    <div class="acts"><button class="btn p" data-act="ok-works">הכל נראה טוב</button></div></article>`; };
  const tour = t => `<article class="card" tabindex="0"><div class="hd"><div><div class="kind">בקשת סיור תלת־ממדי</div><h2>${esc(t.title)}</h2></div><span class="chip">${t.building ? 'בבנייה' : 'ביקש סיור'}</span></div>
    <p class="meta"><bdi>${esc(t.name)}</bdi> · ${t.photos} צילומי הצבה · ${t.extra} קבצים · ${t.video ? 'יש סרטון · ' : ''}${ago(t.at)}</p>
    <div class="acts"><a class="btn p" target="_blank" rel="noopener" href="${APP}#/preview/${esc(t.uid)}">פתח את התערוכה ↗</a></div></article>`;
  page('approvals', heading(n), n ? '' : 'כל מה שנשלח אליך טופל.', `<div class="q" id="q">${[...q.waiting.map(artist), ...q.shows.map(showCard), ...q.groups.map(works), ...q.tours.map(tour)].join('')}</div>
    <div class="empty" id="empty" ${n ? 'hidden' : ''}><b>אין מה לעשות</b><div class="acts"><a class="btn" href="#/artists">לכל האמנים</a><a class="btn" href="#/exhibitions">לתערוכות</a></div></div>
    <div class="keys" ${n ? '' : 'hidden'}><span><kbd>J</kbd> <kbd>K</kbd> מעבר בין פריטים</span><span><kbd>A</kbd> אשר</span><span><kbd>C</kbd> בקש שינויים</span></div>`);
  const qEl = $('#q');
  const recount = () => { const k = $$('#q > .card').length; $('.top h1').textContent = heading(k); badge(k); $('#empty').hidden = k > 0; const ks = $('.keys'); if (ks) ks.hidden = !k; };
  const leave = (card, msg, undo) => { card.classList.add('out'); setTimeout(() => { card.remove(); recount(); }, 170);
    toast(msg, undo && (async () => { await undo(); await queueView(); })); };
  qEl.onclick = async e => {
    const b = e.target.closest('[data-act]'); if (!b) return; const card = b.closest('.card'), act = b.dataset.act;
    try {
      if (act === 'flag') { const on = b.getAttribute('aria-pressed') !== 'true'; b.setAttribute('aria-pressed', on); b.classList.toggle('x', on);
        const all = $$('.tile', card).length, bad = $$('.tile.x', card).length;
        $('[data-act=ok-works]', card).textContent = !bad ? 'הכל נראה טוב' : bad === all ? 'הסתר את כולן' : `אשר ${all - bad}, הסתר ${bad}`; }
      else if (act === 'ask') { $('[data-ask]', card).hidden = false; $('[data-main]', card).hidden = true; $('input', card).focus(); }
      else if (act === 'cancel-ask') { $('[data-ask]', card).hidden = true; $('[data-main]', card).hidden = false; }
      else if (act === 'pub-show') { const id = card.dataset.id; b.disabled = true; await api.setShowStatus(id, 'published'); leave(card, `פורסמה: ${card.dataset.name}`, () => api.setShowStatus(id, 'draft')); }
      else if (act === 'approve' || act === 'send-ask') {
        const id = card.dataset.id; b.disabled = true;
        if (act === 'approve') { const ids = await api.approveArtist(id); leave(card, `אושר/ה: ${card.dataset.name}`, () => api.undoApprove(id, ids, card.dataset.note)); }
        else { await api.setArtist(id, 'changes', $('input', card).value.trim()); leave(card, `נשלחה בקשה לשינויים: ${card.dataset.name}`, () => api.undoApprove(id, [], card.dataset.note)); }
      } else if (act === 'ok-works') {
        const tiles = $$('.tile', card), okIds = tiles.filter(t => !t.classList.contains('x')).map(t => t.dataset.w), hid = tiles.filter(t => t.classList.contains('x')).map(t => t.dataset.w);
        b.disabled = true; await api.reviewWorks(okIds, hid);
        leave(card, `${card.dataset.name}: ${okIds.length ? `${okIds.length} אושרו` : ''}${okIds.length && hid.length ? ', ' : ''}${hid.length ? `${hid.length} הוסתרו` : ''}`, () => api.undoReview([...okIds, ...hid]));
      }
    } catch (x) { b.disabled = false; fail(x); }
  };
  KEYS = e => {
    if (/INPUT|TEXTAREA/.test(document.activeElement.tagName) || e.metaKey || e.ctrlKey) return;
    const cards = $$('#q > .card'); if (!cards.length) return; let i = cards.findIndex(c => c.classList.contains('key'));
    const k = e.key.toLowerCase();
    if (k === 'j' || k === 'k') { cards[i]?.classList.remove('key'); i = k === 'j' ? Math.min(cards.length - 1, i + 1) : Math.max(0, i - 1); cards[i].classList.add('key'); cards[i].scrollIntoView({ block: 'center', behavior: 'smooth' }); }
    else if (i >= 0 && k === 'a') (cards[i].querySelector('[data-act=approve],[data-act=ok-works],[data-act=pub-show]') || {}).click?.();
    else if (i >= 0 && k === 'c') (cards[i].querySelector('[data-act=ask]') || {}).click?.();
  };
  document.addEventListener('keydown', KEYS);
}

// --- artists: find them, follow the new ones, decide -----------------------------------------------------------------------------
const STATUS = { pending: 'נשלח לבדיקה', changes: 'מחכה לתיקונים', draft: 'בעבודה, לא נשלח', approved: 'באוויר', hidden: 'מוסתר' };
const flagOf = s => s === 'approved' ? 'ok' : s === 'hidden' ? 'no' : s === 'pending' ? 'warn' : '';
async function artistsView(sel) {
  const rows = await api.artists();
  const order = { pending: 0, changes: 1, draft: 2, approved: 3, hidden: 4 };
  rows.sort((a, b) => order[a.status] - order[b.status] || new Date(b.created_at) - new Date(a.created_at));
  const isNew = a => (PREV > 0 && new Date(a.created_at).getTime() > PREV) || Date.now() - new Date(a.created_at) < 14 * 864e5;
  const newN = rows.filter(isNew).length;
  const cnt = f => rows.filter(a => f === 'all' ? true : f === 'new' ? isNew(a) : a.status === f).length;
  const chips = [['all', 'הכל'], ['new', 'חדשים (שבועיים)'], ['pending', 'מחכים'], ['approved', 'באוויר'], ['changes', 'מחכים לאמן'], ['hidden', 'מוסתרים']].filter(([k]) => k === 'all' || cnt(k));
  page('artists', 'אמנים', `${rows.length} אמנים · ${newN} חדשים בשבועיים האחרונים`, `<div class="md"><div>
    <input class="search" type="search" id="find" placeholder="חיפוש אמן/ית" aria-label="חיפוש אמן/ית" dir="auto" style="margin-bottom:12px">
    <div class="chips" id="chips" style="padding-bottom:12px">${chips.map(([k, t], i) => `<button type="button" data-f="${k}" aria-pressed="${i === 0}">${t} · ${cnt(k)}</button>`).join('')}</div>
    <div class="list" id="rows">${rows.map(a => { const p = a.works[0]; return `<a class="row" href="#/artists/${esc(a.id)}" data-id="${esc(a.id)}" data-s="${a.status}" data-new="${isNew(a)}" data-n="${esc(a.name.toLowerCase())}" ${a.id === sel ? 'aria-current="true"' : ''}>
      ${p ? `<img src="${esc(p.thumb || p.image)}" alt="" loading="lazy">` : '<span class="ph"></span>'}<span><b>${esc(a.name)}</b><span class="meta"><bdi>${esc([a.discipline, a.city].filter(Boolean).join(' · '))}</bdi> · ${a.works.length}</span></span>
      <span class="chip ${flagOf(a.status)}">${isNew(a) && a.status === 'approved' ? 'חדש/ה' : STATUS[a.status] || a.status}</span></a>`; }).join('')}</div></div>
    <div id="detail">${sel ? '' : '<p class="muted">בחר אמן/ית מהרשימה: עבודות, משפט, והחלטה במקום.</p>'}</div></div>`);
  let f = 'all', q = '';
  const apply = () => $$('#rows .row').forEach(r => { r.hidden = !((f === 'all' || (f === 'new' ? r.dataset.new === 'true' : r.dataset.s === f)) && r.dataset.n.includes(q)); });
  $('#find').oninput = e => { q = e.target.value.trim().toLowerCase(); apply(); };
  $('#chips').onclick = e => { const b = e.target.closest('button'); if (!b) return; f = b.dataset.f; $$('#chips button').forEach(x => x.setAttribute('aria-pressed', x === b)); apply(); };
  const show = id => {
    $$('#rows .row').forEach(r => r.toggleAttribute('aria-current', r.dataset.id === id));
    const a = rows.find(x => x.id === id), box = $('#detail'); if (!a) { box.innerHTML = ''; return; }
    box.innerHTML = `<div class="detail"><div class="hd" style="display:flex;justify-content:space-between;gap:12px;align-items:start"><div><h2>${esc(a.name)}</h2><p class="meta"><bdi>${esc([a.discipline, a.city, a.country].filter(Boolean).join(' · '))}</bdi></p></div><span class="chip ${flagOf(a.status)}">${STATUS[a.status] || a.status}</span></div>
      <p class="meta">הצטרף/ה ${day(a.created_at)}${a.sent_at ? ` · נשלח לבדיקה ${day(a.sent_at)}` : ''}${a.instagram ? ` · <a dir="ltr" target="_blank" rel="noopener" href="https://instagram.com/${esc(a.instagram.replace(/^@/, ''))}">${esc(a.instagram)}</a>` : ''}${a.link ? ` · <a target="_blank" rel="noopener" href="${esc(a.link)}">אתר</a>` : ''}</p>
      ${a.statement ? `<p dir="auto">${esc(a.statement)}</p>` : ''}
      ${a.works.length ? `<div class="wk">${a.works.slice(0, 24).map(w => `<figure><img src="${esc(w.thumb || w.image)}" alt=""><span dir="auto">${esc(w.title)}${w.hidden ? ' (מוסתרת)' : ''}</span></figure>`).join('')}</div>` : '<p class="muted">עוד אין עבודות.</p>'}
      ${a.status !== 'approved' && a.status !== 'hidden' ? `<label class="field">הערה לאמן/ית, או מה לשנות (עדיף באנגלית)<input id="dnote" dir="auto" value="${esc(a.note || '')}" placeholder="e.g. Add sizes to your works, then we'll put you live"></label>` : ''}
      <div class="acts"><a class="btn" target="_blank" rel="noopener" href="${APP}#/preview/${esc(a.id)}">צפה בעמוד ↗</a>
        ${a.status !== 'approved' ? `<button class="btn p" data-s="approved">${a.status === 'hidden' ? 'החזר לאוויר' : 'אשר'}</button>` : ''}
        ${a.status !== 'changes' && a.status !== 'approved' && a.status !== 'hidden' ? '<button class="btn" data-s="changes">בקש שינויים</button>' : ''}
        ${a.status !== 'hidden' ? '<button class="btn q" data-s="hidden">הסתר</button>' : ''}</div></div>`;
    box.onclick = async e => {
      const b = e.target.closest('[data-s]'); if (!b) return; const prev = a.status, prevNote = a.note; b.disabled = true;
      try {
        let ids = [];
        if (b.dataset.s === 'approved') ids = await api.approveArtist(a.id); else await api.setArtist(a.id, b.dataset.s, ($('#dnote') || {}).value);
        toast(`${a.name}: ${STATUS[b.dataset.s]}`, async () => { if (prev === 'pending') await api.undoApprove(a.id, ids, prevNote); else await api.setArtist(a.id, prev, prevNote); await artistsView(a.id); });
        await artistsView(a.id);
      } catch (x) { b.disabled = false; fail(x); }
    };
  };
  if (sel) show(sel);
  $('#rows').addEventListener('click', e => { const r = e.target.closest('.row'); if (r) { e.preventDefault(); history.replaceState(null, '', '#/artists/' + r.dataset.id); show(r.dataset.id); } });
}

// --- people -------------------------------------------------------------------------------------------------------------------
async function peopleView() {
  const rows = (await api.people()).filter(r => r.role !== 'artist');   // artists have their own place
  const count = f => Object.entries(rows.reduce((o, r) => { const k = f(r) || '—'; o[k] = (o[k] || 0) + 1; return o; }, {})).sort((a, b) => b[1] - a[1]);
  const week = rows.filter(r => Date.now() - new Date(r.created_at) < 7 * 864e5).length, today = rows.filter(r => Date.now() - new Date(r.created_at) < 864e5).length;
  const kv = (t, l) => `<div class="card"><h2 style="font-size:1.1rem">${t}</h2><div>${l.map(([k, v]) => `<div class="kv"><span>${esc(k)}</span><b>${v}</b></div>`).join('')}</div></div>`;
  page('lovers', 'חובבי אמנות', 'מי הצטרף ומאיפה', `<div class="sum"><div><b>${today}</b><span>היום</span></div><div><b>${week}</b><span>השבוע</span></div><div><b>${rows.length}</b><span>בסך הכל</span></div></div>
    <div class="cols">${kv('נרשמו בתור', count(r => roleName(r.role)))}${kv('נכנסו עם', count(r => r.provider === 'google' ? 'Google' : 'מייל'))}${kv('מאיפה', count(r => r.country).slice(0, 6))}</div>
    <section class="sec" style="margin-top:28px"><h2>האחרונים</h2><div class="tbl">${rows.slice(0, 40).map(r => `<div><b>${esc(who(r))}</b><span>${r.role ? roleName(r.role) : '—'}</span><span>${esc(r.country || '')}</span><span class="muted">${ago(r.created_at)}</span></div>`).join('')}</div></section>`);
}

// --- system: health and requests ----------------------------------------------------------------------------------------------
async function systemView() {
  page('system', 'מערכת', 'איך האפליקציה מרגישה, ומה ביקשת', `<div class="two"><div><section class="sec"><h2>תקינות</h2><div id="hl"><p class="muted">בודק…</p></div></section></div>
    <div><section class="sec"><h2>בקשת שינוי</h2><form id="rq" class="sec" style="margin:0"><label class="field">כתוב מה לשנות או להוסיף, בכל שפה. זה הופך למשימה לסשן הלילי.<textarea name="body" dir="auto" rows="4" required minlength="3"></textarea></label><div class="acts"><button class="btn p" type="submit">שלח</button></div></form><div id="rl"></div></section></div></div>`);
  const hl = $('#hl'), rl = $('#rl');
  api.health().then(({ issues, runs }) => {
    const latest = new Map(); for (const r of runs || []) if (!latest.has(r.name) && !/pages build/.test(r.name)) latest.set(r.name, r);
    const mark = r => r.status !== 'completed' ? ['', 'רץ'] : r.conclusion === 'success' ? ['ok', 'תקין'] : ['no', r.conclusion === 'failure' ? 'נכשל' : r.conclusion];
    const all = [...latest.values()], bad = all.filter(r => mark(r)[0] === 'no');
    const row = r => `<a class="run" href="${esc(r.html_url)}" target="_blank" rel="noopener"><span><b>${esc(r.name)}</b> <span class="muted small">${ago(r.created_at)}</span></span><span class="chip ${mark(r)[0]}">${esc(mark(r)[1])}</span></a>`;
    hl.innerHTML = `${issues && issues.length ? `<p class="status no">משהו שבור: <a target="_blank" rel="noopener" dir="ltr" href="${esc(issues[0].html_url)}">${esc(issues[0].title)}</a>. הסשן הלילי מטפל בזה.</p>` : issues ? `<p class="status">הכל תקין${all.length ? `: ${all.length - bad.length} מתוך ${all.length} הבדיקות עוברות` : ''}.</p>` : '<p class="muted">GitHub לא ענה כרגע.</p>'}
      ${bad.length ? bad.map(row).join('') : ''}${all.length ? `<details><summary style="min-height:44px;display:flex;align-items:center;cursor:pointer;font-weight:500">כל הריצות האחרונות (${all.length})</summary>${all.map(row).join('')}</details>` : ''}`;
  });
  const reqs = () => api.requests().then(rows => { rl.innerHTML = rows.length ? `<details><summary style="min-height:44px;display:flex;align-items:center;cursor:pointer;font-weight:500">הבקשות שלי (${rows.length})</summary>${rows.map(r => `<div class="run"><span dir="auto">${esc(r.body.slice(0, 200))}<br><span class="muted small">${ago(r.created_at)} · ${r.status === 'open' ? 'מחכה' : r.status === 'filed' ? 'בטיפול' : 'בוצע'}</span></span></div>`).join('')}</details>` : ''; }).catch(() => {});
  reqs();
  $('#rq').onsubmit = async e => { e.preventDefault(); const f = e.target; try { await api.addRequest(f.body.value.trim()); f.reset(); toast('הבקשה נשלחה'); reqs(); } catch (x) { fail(x); } };
}

// --- exhibitions: the approved ones, by artists, by galleries and institutions (the art map), and the app's own --------------------------
let ARTMAP = null;
const artMap = () => ARTMAP || (ARTMAP = Promise.all(['exhibitions', 'places'].map(f => fetch(APP + `data/art/${f}.json`).then(r => r.json()))).then(([e, p]) => ({ shows: e.shows || [], places: new Map((p.places || []).map(x => [x.id, x])), updated: e.updated })));
const PKIND = { museum: 'מוזיאונים', commercial: 'גלריות', public: 'מוסדות ציבוריים' };
let XF = { src: 'all', kind: 'all', old: false, q: '' };                   // the filters stay while you move between sections
async function exhibitionsView() {
  const [rows, artists, am] = await Promise.all([api.shows(), api.artists(), artMap().catch(() => ({ shows: [], places: new Map() }))]);
  const names = new Map(artists.map(a => [a.id, a.name]));
  const today = new Date().toISOString().slice(0, 10);
  const own = rows.filter(r => r.kind === 'curated' && r.status === 'published');
  const byArtist = rows.filter(r => r.kind === 'artist' && r.status === 'published');
  const places = am.shows.filter(s => s.place && am.places.has(s.place) && (XF.old || !s.end || s.end >= today));
  const nPlaces = new Set(places.map(s => s.place)).size;
  const seg = [['all', 'הכל'], ['app', `של האפליקציה · ${own.length}`], ['artists', `של האמנים · ${byArtist.length}`], ['places', `גלריות ומוסדות · ${places.length}`]];
  const dates = s => [s.start, s.end].filter(Boolean).map(d => new Date(d).toLocaleDateString('he-IL', { day: 'numeric', month: 'short' })).join(' – ');
  const cover = r => { const w = (r.works || [])[0]; return w ? abs(w.thumb || w.image) : ''; };
  const appBlock = () => `<section class="sec" data-s="app"><h2>של האפליקציה <span class="muted small">תערוכות שאוצרות כאן, כתבות מהמוזיאון</span></h2>${own.length ? `<div class="issue">${own.map(r => `<a class="art" href="#/museum/${esc(r.id)}"><div class="cov" style="background-image:url('${esc(cover(r))}')"></div><div class="bd"><h3 dir="auto">${esc(r.title)}</h3><span class="meta">${(r.works || []).length} עבודות</span></div></a>`).join('')}</div>` : '<p class="muted">עוד אין תערוכה מפורסמת של האפליקציה. כתבות נוצרות במוזיאון.</p>'}</section>`;
  const artistBlock = () => {
    const g = new Map(); for (const r of byArtist) { const k = names.get(r.owner_id) || '—'; (g.get(k) || g.set(k, []).get(k)).push(r); }
    return `<section class="sec" data-s="artists"><h2>של האמנים <span class="muted small">תערוכות וירטואליות של אמנים מאושרים</span></h2>${g.size ? [...g].sort((a, b) => a[0].localeCompare(b[0], 'he')).map(([n, l]) => `<div class="grp"><h3>${esc(n)} <span class="muted small">${l.length}</span></h3>${l.map(r => `<div class="run"><span><b dir="auto">${esc(r.title)}</b> <span class="muted small">${(r.works || []).length} עבודות</span></span><span class="acts"><a class="btn q" target="_blank" rel="noopener" href="${APP}#/preview/${esc(r.owner_id)}">צפה ↗</a><button class="btn q" data-un="${esc(r.id)}">הורד מהאפליקציה</button></span></div>`).join('')}</div>`).join('') : '<p class="muted">עוד אין תערוכות מאושרות של אמנים.</p>'}</section>`;
  };
  const placeBlock = () => {
    const l = places.filter(s => (XF.kind === 'all' || am.places.get(s.place).kind === XF.kind) && (!XF.q || ((am.places.get(s.place).name_he || '') + am.places.get(s.place).name + s.title + (s.artists || []).join(' ')).toLowerCase().includes(XF.q)));
    const g = new Map(); for (const s of l) (g.get(s.place) || g.set(s.place, []).get(s.place)).push(s);
    const head = `<div class="acts" style="margin-bottom:12px"><input class="search" id="xq" type="search" placeholder="חיפוש גלריה, מוסד או תערוכה" aria-label="חיפוש" dir="auto" value="${esc(XF.q)}" style="max-width:380px"><div class="chips" style="padding:0">${[['all', 'כל המקומות'], ...Object.entries(PKIND)].map(([k, t]) => `<button type="button" data-k="${k}" aria-pressed="${XF.kind === k}">${t}</button>`).join('')}<button type="button" id="xo" aria-pressed="${XF.old}">כולל שהסתיימו</button></div></div>`;
    return `<section class="sec" data-s="places"><h2>גלריות ומוסדות <span class="muted small">${l.length} תערוכות ב־${g.size} מקומות (מפת האמנות, מתעדכנת כל יום)</span></h2>${head}${g.size ? [...g].sort((a, b) => (am.places.get(a[0]).name_he || am.places.get(a[0]).name).localeCompare(am.places.get(b[0]).name_he || am.places.get(b[0]).name, 'he')).map(([id, ss]) => { const p = am.places.get(id); return `<div class="grp"><h3>${esc(p.name_he || p.name)} <span class="muted small">${esc(PKIND[p.kind] || '')}${p.city ? ' · ' + esc(p.city) : ''} · ${ss.length}</span></h3>${ss.sort((a, b) => (a.start || '').localeCompare(b.start || '')).map(s => `<a class="run" ${s.url ? `href="${esc(s.url)}" target="_blank" rel="noopener"` : ''}><span><b dir="auto">${esc(s.title)}</b>${(s.artists || []).length ? ` <span class="muted small" dir="auto">${esc(s.artists.join(', '))}</span>` : ''}</span><span class="muted small">${esc(dates(s))}</span></a>`).join('')}</div>`; }).join('') : '<p class="muted">לא נמצאו תערוכות לפי הסינון.</p>'}</section>`;
  };
  const draw = () => {
    const box = $('#xbody');
    box.innerHTML = (XF.src === 'all' || XF.src === 'app' ? appBlock() : '') + (XF.src === 'all' || XF.src === 'artists' ? artistBlock() : '') + (XF.src === 'all' || XF.src === 'places' ? placeBlock() : '');
    const xq = $('#xq'); if (xq) { xq.oninput = e => { XF.q = e.target.value.trim().toLowerCase(); const pos = e.target.selectionStart; draw(); const n = $('#xq'); n.focus(); n.setSelectionRange(pos, pos); }; }
    $$('[data-k]', box).forEach(b => b.onclick = () => { XF.kind = b.dataset.k; draw(); });
    const xo = $('#xo'); if (xo) xo.onclick = () => { XF.old = !XF.old; exhibitionsView(); };
    $$('[data-un]', box).forEach(b => b.onclick = async () => { try { await api.setShowStatus(b.dataset.un, 'draft'); toast('הורדה מהאפליקציה', async () => { await api.setShowStatus(b.dataset.un, 'published'); exhibitionsView(); }); exhibitionsView(); } catch (x) { fail(x); } });
  };
  page('exhibitions', 'תערוכות', `רק מה שמאושר ופועל · ${own.length + byArtist.length} באפליקציה, ${places.length} בגלריות ובמוסדות (${nPlaces} מקומות)`, `<div class="chips" id="xseg" role="group" aria-label="סינון לפי מקור">${seg.map(([k, t]) => `<button type="button" data-src="${k}" aria-pressed="${XF.src === k}">${t}</button>`).join('')}</div><div id="xbody"></div>`);
  $('#xseg').onclick = e => { const b = e.target.closest('[data-src]'); if (!b) return; XF.src = b.dataset.src; $$('#xseg button').forEach(x => x.setAttribute('aria-pressed', x === b)); draw(); };
  draw();
}

// --- conversations: talking with users, like customer service ------------------------------------------------------------------------
const CST = { open: ['warn', 'מחכה לתשובה'], answered: ['ok', 'נענתה'], closed: ['', 'סגורה'] };
async function talkView(sel) {
  const rows = await api.conversations();
  const list = rows.map(c => `<a class="row th2" href="#/talk/${esc(c.id)}" data-id="${esc(c.id)}" ${c.id === sel ? 'aria-current="true"' : ''}><span class="av">${esc((c.name || '?').slice(0, 1))}</span><span><b dir="auto">${esc(c.name || 'משתמש/ת')}</b><span class="meta" dir="auto" style="display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(c.subject || c.last || '')}</span></span><span class="chip ${CST[c.status] ? CST[c.status][0] : ''}">${CST[c.status] ? CST[c.status][1] : c.status}</span></a>`).join('');
  page('talk', 'שיחות', rows.length ? `${rows.filter(c => c.status === 'open').length} מחכות לתשובה מתוך ${rows.length}` : 'כאן מדברים עם המשתמשים, כמו שירות לקוחות', `<div class="md"><div><div class="list" id="rows">${list || '<div class="note"><b>אין עדיין שיחות</b><p class="muted">כשמשתמש/ת יכתבו מהאפליקציה, כל שיחה תופיע כאן עם הודעות ומקום להשיב.</p></div>'}</div></div>
    <div id="detail">${sel ? '' : `<div class="detail"><h2>בחר/י שיחה</h2><p class="muted">רשימת השיחות בצד, השיחה עצמה כאן.</p><p class="soon"><b>בקרוב:</b> כתיבה מהאפליקציה בטלפון (משתמש/ת רואים רק את השיחות שלהם), התראה במייל על תשובה, תבניות תשובה. התשובות כאן נשמרות במסד הנתונים; לא נשלח שום מייל אמיתי.</p></div>`}</div></div>`);
  const show = async id => {
    $$('#rows .row').forEach(r => r.toggleAttribute('aria-current', r.dataset.id === id));
    const c = rows.find(x => x.id === id), box = $('#detail'); if (!c) { box.innerHTML = ''; return; }
    const draw = async () => {
      const ms = await api.messages(id);
      box.innerHTML = `<div class="detail"><div class="hd" style="display:flex;justify-content:space-between;gap:12px;align-items:start"><div><h2 dir="auto">${esc(c.subject || 'ללא נושא')}</h2><p class="meta">${esc(c.name || '')} · ${c.role ? roleName(c.role) : ''} · נפתחה ${ago(c.created_at)}</p></div><span class="chip ${CST[c.status] ? CST[c.status][0] : ''}">${CST[c.status] ? CST[c.status][1] : c.status}</span></div>
        <div class="thread">${ms.map(m => `<div class="msg ${m.from_admin ? 'me' : ''}"><p dir="auto">${esc(m.body)}</p><span class="muted small">${m.from_admin ? 'אתה' : esc(c.name || 'משתמש/ת')} · ${ago(m.created_at)}</span></div>`).join('') || '<p class="muted">אין הודעות.</p>'}</div>
        <form id="rp" class="sec" style="margin:0"><label class="field">תשובה<textarea name="body" dir="auto" rows="3" required ${c.status === 'closed' ? 'disabled' : ''} placeholder="${c.status === 'closed' ? 'השיחה סגורה' : ''}"></textarea></label>
          <div class="acts"><button class="btn p" type="submit" ${c.status === 'closed' ? 'disabled' : ''}>שמור תשובה</button><button class="btn" type="button" id="cl">${c.status === 'closed' ? 'פתח מחדש' : 'סגור שיחה'}</button></div>
          <p class="soon"><b>בקרוב:</b> התשובה תגיע למשתמש/ת באפליקציה ובמייל. בינתיים היא נשמרת בשיחה בלבד.</p></form></div>`;
      $('#rp').onsubmit = async e => { e.preventDefault(); const f = e.target; try { await api.reply(id, f.body.value.trim()); c.status = 'answered'; toast('התשובה נשמרה'); await draw(); $$('#rows .row').forEach(r => { if (r.dataset.id === id) { const ch = $('.chip', r); ch.className = 'chip ok'; ch.textContent = CST.answered[1]; } }); } catch (x) { fail(x); } };
      $('#cl').onclick = async () => { try { const s = c.status === 'closed' ? 'open' : 'closed'; await api.setConversation(id, s); c.status = s; await draw(); } catch (x) { fail(x); } };
    };
    await draw();
  };
  if (sel) await show(sel);
  $('#rows').addEventListener('click', e => { const r = e.target.closest('.row'); if (r) { e.preventDefault(); history.replaceState(null, '', '#/talk/' + r.dataset.id); show(r.dataset.id); } });
}

boot();
