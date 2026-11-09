// Open Studio Desk: the owner's control room for a computer and an iPad on its side. It talks to the same Supabase project
// as the phone app (data.js) and borrows the phone app's rooms and 3D viewer (APP). Hebrew, right to left, for its owner;
// the exhibitions' own text stays English, as in the app.
//
// Places: תור (decisions), אמנים (find, follow the new ones, approve), אנשים, תערוכות (the museum: every exhibition is an
// article, and every article is a 3D room), מערכת (health, requests).
import { api, APP, guest, abs } from './data.js';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const day = t => new Date(t).toLocaleDateString('he-IL', { day: 'numeric', month: 'short', year: 'numeric' });
const ago = t => { const d = Math.floor((Date.now() - new Date(t)) / 864e5); return d <= 0 ? 'היום' : d === 1 ? 'אתמול' : d < 30 ? `לפני ${d} ימים` : day(t); };
const who = r => [r.first_name, r.last_name].filter(Boolean).join(' ') || '—';
const roleName = r => r === 'artist' ? 'אמן/ית' : r === 'lover' ? 'חובב/ת אמנות' : 'עוד לא בחר/ה';
const root = $('#desk');
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
const NAV = [['queue', 'תור'], ['artists', 'אמנים'], ['people', 'אנשים'], ['shows', 'תערוכות'], ['system', 'מערכת']];
const TITLES = { queue: 'תור', artists: 'אמנים', people: 'אנשים', shows: 'תערוכות', system: 'מערכת' };
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
    <nav aria-label="ראשי">${NAV.map(([k, t]) => `<a class="nv" href="#/${k}" ${k === tab ? 'aria-current="page"' : ''}><span>${t}</span>${k === 'queue' ? `<i class="badge" data-q>${QN || ''}</i>` : k === 'system' ? '<i class="dot" data-h hidden></i>' : ''}</a>`).join('')}</nav>
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
  const [tab = 'queue', id] = location.hash.replace(/^#\//, '').split('/');
  window.scrollTo(0, 0);
  try {
    if (tab === 'artists') await artistsView(id);
    else if (tab === 'people') await peopleView();
    else if (tab === 'shows') await (id ? editor(id) : showsView());
    else if (tab === 'system') await systemView();
    else await queueView();
  } catch (e) { console.error(e); page(tab, TITLES[tab] || 'תור', '', `<p class="status no">משהו לא נטען: ${esc(e.message || e)}</p>`); }
}

// --- the queue: everything that waits for a decision -----------------------------------------------------------------------
const heading = n => n === 0 ? 'הכל מטופל' : n === 1 ? 'דבר אחד מחכה לך' : `${n} דברים מחכים לך`;
async function queueView() {
  const q = await api.queue(), n = q.waiting.length + q.groups.length + q.tours.length; badge(n);
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
  page('queue', heading(n), n ? '' : 'כל מה שנשלח אליך טופל.', `<div class="q" id="q">${[...q.waiting.map(artist), ...q.groups.map(works), ...q.tours.map(tour)].join('')}</div>
    <div class="empty" id="empty" ${n ? 'hidden' : ''}><b>אין מה לעשות</b><div class="acts"><a class="btn" href="#/artists">לכל האמנים</a><a class="btn" href="#/shows">לתערוכות</a></div></div>
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
    else if (i >= 0 && k === 'a') (cards[i].querySelector('[data-act=approve],[data-act=ok-works]') || {}).click?.();
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
  const isNew = a => new Date(a.created_at).getTime() > PREV || Date.now() - new Date(a.created_at) < 14 * 864e5;
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
    box.innerHTML = `<div class="detail"><div class="hd" style="display:flex;justify-content:space-between;gap:12px"><div><h2>${esc(a.name)}</h2><p class="meta"><bdi>${esc([a.discipline, a.city, a.country].filter(Boolean).join(' · '))}</bdi></p></div><span class="chip ${flagOf(a.status)}">${STATUS[a.status] || a.status}</span></div>
      <p class="meta">הצטרף/ה ${day(a.created_at)}${a.sent_at ? ` · נשלח לבדיקה ${day(a.sent_at)}` : ''}${a.instagram ? ` · <a dir="ltr" target="_blank" rel="noopener" href="https://instagram.com/${esc(a.instagram.replace(/^@/, ''))}">${esc(a.instagram)}</a>` : ''}${a.link ? ` · <a target="_blank" rel="noopener" href="${esc(a.link)}">אתר</a>` : ''}</p>
      ${a.statement ? `<p dir="auto">${esc(a.statement)}</p>` : ''}
      ${a.works.length ? `<div class="wk">${a.works.slice(0, 24).map(w => `<figure><img src="${esc(w.thumb || w.image)}" alt="" loading="lazy"><span dir="auto">${esc(w.title)}${w.hidden ? ' (מוסתרת)' : ''}</span></figure>`).join('')}</div>` : '<p class="muted">עוד אין עבודות.</p>'}
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
  const rows = await api.people();
  const count = f => Object.entries(rows.reduce((o, r) => { const k = f(r) || '—'; o[k] = (o[k] || 0) + 1; return o; }, {})).sort((a, b) => b[1] - a[1]);
  const week = rows.filter(r => Date.now() - new Date(r.created_at) < 7 * 864e5).length, today = rows.filter(r => Date.now() - new Date(r.created_at) < 864e5).length;
  const kv = (t, l) => `<div class="card"><h2 style="font-size:1.1rem">${t}</h2><div>${l.map(([k, v]) => `<div class="kv"><span>${esc(k)}</span><b>${v}</b></div>`).join('')}</div></div>`;
  page('people', 'אנשים', 'מי הצטרף ומאיפה', `<div class="sum"><div><b>${today}</b><span>היום</span></div><div><b>${week}</b><span>השבוע</span></div><div><b>${rows.length}</b><span>בסך הכל</span></div></div>
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

// --- the museum: a magazine whose every article is a room ------------------------------------------------------------------------
async function showsView() {
  const { ROOMS } = await synth();
  const rows = await api.shows();
  const mine = rows.filter(r => r.kind === 'curated'), theirs = rows.filter(r => r.kind === 'artist' && r.status === 'published');
  const pub = mine.filter(r => r.status === 'published').length;
  page('shows', 'תערוכות', `המוזיאון: כל תערוכה היא כתבה, וכל כתבה היא חדר תלת־ממדי · ${pub} מפורסמות, ${mine.length - pub} טיוטות`, `<div class="issue">
    ${mine.map((r, i) => { const w = (r.works || [])[0], R = ROOMS[r.room]; return `<a class="art" href="#/shows/${esc(r.id)}"><div class="cov" style="background-image:url('${esc(w ? abs(w.thumb || w.image) : (R && R.cover) || '')}')"><span class="no">${String(mine.length - i).padStart(2, '0')}</span></div>
      <div class="bd"><div style="display:flex;justify-content:space-between;gap:8px"><h3>${esc(r.title)}</h3><span class="chip ${r.status === 'published' ? 'ok' : ''}">${r.status === 'published' ? 'מפורסמת' : 'טיוטה'}</span></div>
      <span class="meta">${esc(R ? R.name : r.room)} · ${(r.works || []).length} עבודות</span></div></a>`; }).join('')}
    <a class="art new" href="#/shows/new"><b style="font:400 2.4rem var(--serif)">+</b><span>כתבה חדשה</span></a></div>
    ${theirs.length ? `<section class="sec" style="margin-top:34px"><h2>של האמנים עצמם</h2>${theirs.map(r => `<div class="run"><span><b>${esc(r.title)}</b> <span class="muted small">${(r.works || []).length} עבודות</span></span><button class="btn q" data-un="${esc(r.id)}">הורד מהאפליקציה</button></div>`).join('')}</section>` : ''}`);
  $$('[data-un]').forEach(b => b.onclick = async () => { try { await api.setShowStatus(b.dataset.un, 'draft'); toast('הורדה מהאפליקציה', async () => { await api.setShowStatus(b.dataset.un, 'published'); showsView(); }); showsView(); } catch (x) { fail(x); } });
}

let LIB = null;                                                       // every approved artist's visible works, for choosing
async function library() {
  if (LIB) return LIB;
  const artists = (await api.artists()).filter(a => a.status === 'approved');
  LIB = { artists: artists.map(a => ({ id: a.id, name: a.name, works: a.works.filter(w => !w.hidden && w.kind !== 'object').map(w => ({ id: w.id, title: w.title, image: abs(w.image), thumb: abs(w.thumb || w.image), width: w.width, height: w.height, depth: w.depth, year: w.year, medium: w.medium, kind: 'work', artist: a.name })) })).filter(a => a.works.length) };
  LIB.byId = new Map(LIB.artists.flatMap(a => a.works).map(w => [w.id, w]));
  return LIB;
}
const snap = w => ({ id: w.id, title: w.title, image: w.image, thumb: w.thumb, width: +w.width || null, height: +w.height || null, depth: +w.depth || null, year: w.year, medium: w.medium, kind: 'work', artist: w.artist });
const shape = w => ({ id: w.id, kind: w.kind || 'work', title: w.title, image: abs(w.image), width: w.width, height: w.height, pairs: w.width && w.height ? [[+w.height, +w.width]] : [], year: w.year, medium: w.medium, artist: { name: w.artist || '' } });

async function editor(id) {
  const [{ ROOMS, PAINTS }, lib] = await Promise.all([synth(), library()]);
  let row = null;
  if (id !== 'new') { row = await api.show(id); if (!row) return page('shows', 'תערוכות', '', '<p class="muted">הכתבה לא נמצאה. <a href="#/shows">לכל הכתבות</a></p>'); }
  const E = row ? { ...row, text: row.text || '', works: (row.works || []).map(w => ({ ...w })), plinths: row.plinths || [] }
    : { id: null, title: '', curator: 'Elad Amsalem', room: 'long-hall', paint: '', centre: 148, text: '', works: [], plinths: [], status: 'draft' };
  let dirty = false, saving = false, savedAt = row ? Date.now() : 0, timer;
  const picked = new Set(E.works.map(w => w.id).filter(Boolean));

  // room groups: the ten baked kinds (and the three drawn ones), each with its sizes
  const groups = {}; for (const [slug, r] of Object.entries(ROOMS)) (groups[r.kind || slug] ||= []).push([slug, r]);
  const groupOf = slug => Object.entries(groups).find(([, m]) => m.some(([s]) => s === slug));
  const roomBox = () => {
    const R = ROOMS[E.room] || {}, cur = groupOf(E.room);
    return `<div class="rooms">${Object.entries(groups).map(([k, m]) => { const first = m.find(([, r]) => r.cover) || m[0], isCur = cur && cur[0] === k;
      return `<button type="button" class="room" data-g="${esc(k)}" aria-pressed="${!!isCur}"><div class="im" style="${first[1].cover ? `background-image:url('${esc(first[1].cover)}')` : 'background:#2a2a2a'}"></div><div class="tx"><b>${esc(first[1].name)}</b><span class="muted">${m.length} גדלים</span></div></button>`; }).join('')}</div>
      ${cur ? `<div class="sizes" role="group" aria-label="גודל החלל">${cur[1].map(([s, r]) => `<button type="button" class="chip" data-r="${esc(s)}" aria-pressed="${s === E.room}" style="cursor:pointer;border:2px solid ${s === E.room ? 'var(--accent)' : 'transparent'}">${esc((r.sizeName ? r.sizeName + ' · ' : '') + r.size)}</button>`).join('')}</div><p class="muted small">${esc(R.blurb || '')}</p>` : ''}
      ${R.baked ? '' : `<div class="paints" role="group" aria-label="צבע הקירות">${Object.entries(PAINTS).map(([k, [n, c]]) => `<button type="button" data-p="${k}" aria-pressed="${(E.paint || R.paint) === k}"><i style="background:${c}"></i>${n}</button>`).join('')}</div>`}`;
  };
  const wallBox = () => {
    const list = E.works;
    return list.length ? `<div class="wall">${list.map((w, i) => `<figure><span class="n">${i + 1}</span><img src="${esc(abs(w.thumb || w.image))}" alt=""><figcaption><b dir="auto">${esc(w.title)}</b><span class="muted" dir="auto">${esc(w.artist || '')}</span></figcaption>
      <div class="ct"><button type="button" data-o="${i}:-1" aria-label="מוקדם יותר" ${i ? '' : 'disabled'}>→</button><button type="button" data-o="${i}:1" aria-label="מאוחר יותר" ${i < list.length - 1 ? '' : 'disabled'}>←</button><button type="button" data-x="${i}" aria-label="הוצא">×</button></div></figure>`).join('')}</div>
      <p class="fit" id="fit"></p>` : '<p class="muted">בוחרים עבודות בספרייה משמאל. הסדר כאן הוא סדר ההליכה בחדר.</p>';
  };
  const barBox = () => `<div class="l"><a class="btn q" href="#/shows">→ כל הכתבות</a><span class="chip ${E.status === 'published' ? 'ok' : ''}">${E.status === 'published' ? 'מפורסמת' : 'טיוטה'}</span><span class="muted small" id="saved">${saving ? 'שומר…' : dirty ? (E.id && E.status === 'draft' ? 'משנה…' : 'יש שינויים שלא נשמרו') : savedAt ? 'נשמר' : 'עוד לא נשמר'}</span></div>
    <div class="acts"><button class="btn" id="walk" ${E.works.length ? '' : 'disabled'}>להיכנס לחלל</button><button class="btn" id="hang" ${E.works.some(w => w.id) ? '' : 'disabled'}>לתלות בחלל</button>
      <button class="btn" id="save">${E.id ? 'שמור' : 'שמור טיוטה'}</button><button class="btn p" id="pub" ${E.id ? '' : 'disabled'}>${E.status === 'published' ? 'הורד מהאפליקציה' : 'פרסם'}</button>${E.id ? '<button class="btn q d" id="del">מחק</button>' : ''}</div>`;

  page('shows', E.title || 'כתבה חדשה', 'כתבה אחת, חדר אחד', `<div class="bar" id="bar">${barBox()}</div><div class="ed"><div>
    <section class="panel"><h2>הכתבה <span class="muted small">באנגלית, כמו באפליקציה</span></h2>
      <label class="field">כותרת<input class="title-in" name="title" dir="auto" value="${esc(E.title)}" placeholder="The title of the show"></label>
      <label class="field">אוצר/ת<input name="curator" dir="auto" value="${esc(E.curator || '')}"></label>
      <label class="field">הטקסט (פסקה חדשה אחרי שורה ריקה)<textarea name="text" dir="auto" rows="9">${esc(E.text)}</textarea></label></section>
    <section class="panel"><h2>החלל <span class="muted small">אחד מהחללים שצולמו</span></h2><div id="roomBox">${roomBox()}</div></section>
    <section class="panel"><h2>על הקיר <span class="muted small" id="cnt">${E.works.length} עבודות · סדר ההליכה</span></h2><div id="wallBox">${wallBox()}</div></section></div>
    <aside class="lib"><h2>הספרייה</h2><input class="search" type="search" id="lf" placeholder="חיפוש אמן/ית או עבודה" aria-label="חיפוש בספרייה" dir="auto">
      <div class="scroll" id="libBox">${lib.artists.map(a => `<details data-n="${esc((a.name + ' ' + a.works.map(w => w.title).join(' ')).toLowerCase())}"><summary><span>${esc(a.name)}</span><span class="chip">${a.works.length}</span></summary><div class="pick">${a.works.map(w => `<button type="button" data-add="${esc(w.id)}" aria-pressed="${picked.has(w.id)}" title="${esc(w.title)}"><img src="${esc(w.thumb)}" alt="${esc(w.title)}" loading="lazy"></button>`).join('')}</div></details>`).join('') || '<p class="muted">אין עדיין אמנים מאושרים עם עבודות.</p>'}</div></aside></div>`);

  const bar = $('#bar'), redraw = () => { if (!bar.isConnected) return; bar.innerHTML = barBox(); wireBar(); };
  const redrawWall = () => { $('#wallBox').innerHTML = wallBox(); $('#cnt').textContent = `${E.works.length} עבודות · סדר ההליכה`; redraw(); fit(); };
  const redrawRoom = () => { $('#roomBox').innerHTML = roomBox(); fit(); };
  const fit = async () => {                                            // do they all fit the walls of this room?
    const el = $('#fit'); if (!el || !E.works.length) return;
    try { const { sizeOf, hang } = await synth(); const ws = E.works.map(shape), sized = await Promise.all(ws.map(async w => ({ work: w, ...(await sizeOf(w, u => u)) })));
      if (!ROOMS[E.room] || !$('#fit')) return; const { left } = hang({ room: E.room, centre: E.centre }, sized), guessed = sized.filter(x => x.guessed).length;
      el.textContent = (left.length ? `${ws.length - left.length} מתוך ${ws.length} עבודות נכנסות לקירות החדר הזה: בחר חדר גדול יותר או פחות עבודות.` : `כל ${ws.length} העבודות נכנסות לקירות, עם מקום לנשום.`) + (guessed ? ` ${guessed} בלי מידות: נתלות בגובה משוער.` : '');
      el.classList.toggle('warn', !!left.length);
    } catch (x) { console.warn(x); }
  };
  const mark = () => { dirty = true; const s = $('#saved'); if (s) s.textContent = E.id && E.status === 'draft' ? 'משנה…' : 'יש שינויים שלא נשמרו'; clearTimeout(timer); if (E.id && E.status === 'draft') timer = setTimeout(() => store(), 1400); };
  const read = () => { E.title = $('[name=title]').value.trim(); E.curator = $('[name=curator]').value.trim(); E.text = $('[name=text]').value; };
  const store = async status => {
    clearTimeout(timer); read(); saving = true; redraw();
    const body = { kind: 'curated', title: E.title || 'Untitled', curator: E.curator || null, room: E.room, paint: E.paint || null, centre: E.centre || 148, text: E.text || null, works: E.works, plinths: E.plinths, status: status || E.status };
    try { const d = await api.saveShow(body, E.id); E.id = d.id; E.status = d.status; dirty = false; savedAt = Date.now();
      if (location.hash.endsWith('/new')) history.replaceState(null, '', '#/shows/' + d.id);
      const h = $('.top h1'); if (h) h.textContent = E.title || 'Untitled'; }
    catch (x) { fail(x); }
    saving = false; redraw();
  };
  const wireBar = () => {
    $('#save').onclick = () => store();
    $('#pub').onclick = async () => { const to = E.status === 'published' ? 'draft' : 'published'; await store(to); toast(to === 'published' ? 'פורסמה: היא עכשיו באפליקציה בטלפון' : 'הורדה מהאפליקציה'); };
    const d = $('#del'); if (d) d.onclick = async () => { if (!confirm('למחוק את הכתבה? אי אפשר לבטל.')) return; try { await api.deleteShow(E.id); location.hash = '#/shows'; } catch (x) { fail(x); } };
    $('#walk').onclick = async e => {
      e.currentTarget.disabled = true; e.currentTarget.textContent = 'בונה את החדר…'; setTimeout(redraw, 15000);
      read(); const [{ buildRoom }, { openSpace }] = await Promise.all([synth(), import(APP + 'space/space.js'), viewerCss()]);
      const works = E.works.map(shape), pl = Object.fromEntries(E.works.filter(w => w.id && w.wall).map(w => [w.id, { wall: w.wall, a: w.a, y: w.y }]));
      const made = await buildRoom({ title: E.title || 'Untitled', room: E.room, paint: E.paint, centre: E.centre, works, placements: pl, plinths: E.plinths }, u => u);
      window.__spaceView = await openSpace({ spec: made.spec, works, src: u => u, onClose: () => made.revoke() }); redraw();
    };
    $('#hang').onclick = async () => {
      read(); const [{ openHangEditor }, { openSpace }] = await Promise.all([import(APP + 'space/hang-editor.js'), import(APP + 'space/space.js'), viewerCss()]);
      const withId = E.works.filter(w => w.id), rest = E.works.filter(w => !w.id);
      await openHangEditor({ design: { title: E.title || 'Untitled', room: E.room, paint: E.paint, centre: E.centre || 148 },
        library: withId.map(w => ({ ...shape(w), thumb: abs(w.thumb || w.image) })), state: { ids: withId.map(w => w.id), placements: Object.fromEntries(withId.filter(w => w.wall).map(w => [w.id, { wall: w.wall, a: w.a, y: w.y }])), plinths: E.plinths },
        src: u => u, shape: w => w, openSpace,
        onSave: s => { const by = new Map(withId.map(w => [w.id, w])); E.works = [...s.ids.map(i => ({ ...by.get(i), ...(s.placements[i] || {}) })), ...rest]; E.plinths = s.plinths; mark(); },
        onExit: () => redrawWall() });
    };
  };
  wireBar();
  $$('[name=title],[name=curator],[name=text]').forEach(i => i.oninput = () => { if (i.name === 'title') { const h = $('.top h1'); if (h) h.textContent = i.value || 'כתבה חדשה'; } mark(); });
  $('#roomBox').onclick = e => {
    const g = e.target.closest('[data-g]'), r = e.target.closest('[data-r]'), p = e.target.closest('[data-p]');
    if (g) { const m = groups[g.dataset.g]; if (!groupOf(E.room) || groupOf(E.room)[0] !== g.dataset.g) { E.room = (m.find(([, x]) => x.variant === 'medium') || m[0])[0]; E.paint = ''; E.works.forEach(w => { delete w.wall; delete w.a; delete w.y; }); E.plinths = []; } }
    else if (r) { E.room = r.dataset.r; E.works.forEach(w => { delete w.wall; delete w.a; delete w.y; }); E.plinths = []; }
    else if (p) E.paint = p.dataset.p; else return;
    redrawRoom(); mark();
  };
  $('#wallBox').onclick = e => {
    const o = e.target.closest('[data-o]'), x = e.target.closest('[data-x]');
    if (o) { const [i, d] = o.dataset.o.split(':').map(Number); [E.works[i], E.works[i + d]] = [E.works[i + d], E.works[i]]; }
    else if (x) { const w = E.works.splice(+x.dataset.x, 1)[0]; picked.delete(w.id); const b = $(`[data-add="${CSS.escape(String(w.id))}"]`); if (b) b.setAttribute('aria-pressed', false); }
    else return;
    redrawWall(); mark();
  };
  $('#libBox').onclick = e => {
    const b = e.target.closest('[data-add]'); if (!b) return; const wid = b.dataset.add;
    if (picked.has(wid)) { picked.delete(wid); E.works = E.works.filter(w => w.id !== wid); b.setAttribute('aria-pressed', false); }
    else { picked.add(wid); E.works.push(snap(lib.byId.get(wid))); b.setAttribute('aria-pressed', true); }
    redrawWall(); mark();
  };
  $('#lf').oninput = e => { const q = e.target.value.trim().toLowerCase(); $$('#libBox details').forEach(d => { d.hidden = !d.dataset.n.includes(q); if (q) d.open = !d.hidden; }); };
  fit();
  window.onbeforeunload = null;
}

boot();
