// Open Studio's control room (#/admin): for the people who run it (public.admins; the database checks it on every
// read and write, this screen only follows). An overview first (what waits for you, how many joined, trying the app as
// someone new), then artists waiting to be approved, the people who joined, the exhibitions Open Studio curates (like
// playlists, by hand, across artists), asking for a change in the app, and how the app is. In Hebrew, right to left:
// only its owners see it, and they asked for it so.
import { client } from './auth.js';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const REPO = 'eladamsalemart/eladamsalem.github.io';
const TABS = [['', 'סיכום'], ['artists', 'אמנים'], ['people', 'אנשים'], ['curated', 'תערוכות אוצרות'], ['requests', 'בקשת שינוי'], ['health', 'תקינות']];
let M = null, SYN = null, cur = null;            // the app's content; the room drawing; the curated show being edited
const synth = () => SYN || (SYN = import('./space/synth.js'));
const day = t => new Date(t).toLocaleDateString('he-IL', { day: 'numeric', month: 'short', year: 'numeric' });

const shell = (tab, body) => `<div class="wrap gut st adm" dir="rtl" lang="he">
  <div class="st-head"><a class="back" href="#/">→ לאפליקציה</a><span class="tag">חדר בקרה</span></div>
  <h1 class="st-h1">${esc((TABS.find(t => t[0] === tab) || TABS[0])[1])}</h1>
  <nav class="st-nav" aria-label="חדר בקרה">${TABS.map(([k, t]) => `<a href="#/admin${k ? '/' + k : ''}" ${k === tab ? 'aria-current="page"' : ''}>${t}</a>`).join('')}</nav>
  ${body}</div>`;

export async function admin(hash, app, go, model) {
  M = model;
  const c = await client();
  const { data: { session } } = await c.auth.getSession();
  const { data: ok } = session ? await c.rpc('is_admin') : { data: false };
  if (!ok) { app.innerHTML = shell('', `<p class="m">המסך הזה למנהלי Open Studio בלבד. ${session ? '' : '<a href="#/welcome">צריך להתחבר</a> קודם.'}</p>`); return; }
  const m = hash.replace(/^#\/admin\/?/, '');
  const tab = m.split('/')[0];
  app.innerHTML = shell(tab, '<p class="m">טוען…</p>');
  const body = tab === 'artists' ? await artists(c) : tab === 'people' ? await people(c) : tab === 'curated' ? await curated(c, m.split('/')[1]) : tab === 'requests' ? await requests(c) : tab === 'health' ? await health() : await overview(c);
  app.innerHTML = shell(tab, body);
  wire(app, c, go);
}

// --- overview: what waits for you, and the numbers ------------------------------------------------------------------
const USERS = 'https://hlpzqeosdavfuzjgpwhy.supabase.co/functions/v1/admin-users';
async function overview(c) {
  const since = d => new Date(Date.now() - d * 864e5).toISOString();
  const [{ data: people = [] }, { data: waiting = [] }, { data: fresh = [] }, { count: liveArtists }, { count: allWorks }, { data: shows = [] }] = await Promise.all([
    c.from('profiles').select('first_name, last_name, role, country, created_at').order('created_at', { ascending: false }).limit(1000),
    c.from('artists').select('id, name, discipline, city, created_at').eq('status', 'pending').order('created_at'),
    c.from('works').select('id, title, year, medium, width, height, thumb, image, created_at, artist_id, artists(name, status)').is('reviewed_at', null).order('created_at', { ascending: false }).limit(60),
    c.from('artists').select('id', { count: 'exact', head: true }).eq('status', 'approved'),
    c.from('works').select('id', { count: 'exact', head: true }),
    c.from('virtual_shows').select('id').eq('status', 'published'),
  ]);
  const today = people.filter(p => p.created_at >= since(1)).length, week = people.filter(p => p.created_at >= since(7)).length;
  const stat = (n, t, href) => `<a class="adm-stat" href="${href}"><b>${n}</b><span>${t}</span></a>`;
  return `<div class="adm-stats">
      ${stat(waiting.length, 'אמנים מחכים לאישור', '#/admin/artists')}${stat(fresh.length, 'עבודות חדשות לבדיקה', '#/admin')}
      ${stat(today, 'הצטרפו היום', '#/admin/people')}${stat(week, 'הצטרפו השבוע', '#/admin/people')}
      ${stat(people.length, 'משתמשים בסך הכל', '#/admin/people')}${stat(liveArtists ?? 0, 'אמנים באוויר', '#/admin/artists')}
      ${stat(allWorks ?? 0, 'עבודות', '#/admin/artists')}${stat(shows.length, 'תערוכות מפורסמות', '#/admin/curated')}</div>
    <section class="sec"><div class="sec-h"><h2>אמנים מחכים לאישור</h2><a class="more" href="#/admin/artists">כל האמנים ←</a></div>
      ${waiting.length ? `<div class="list">${waiting.map(a => `<a class="row noimg" href="#/admin/artists"><div class="t"><div><b>${esc(a.name)}</b></div><div class="m">${esc([a.discipline, a.city].filter(Boolean).join(' · '))} · מאז ${day(a.created_at)}</div></div><span class="st-flag">מחכה</span></a>`).join('')}</div>` : '<p class="m">אין אף אחד שמחכה.</p>'}</section>
    <section class="sec"><div class="sec-h"><h2>עבודות חדשות לבדיקה</h2><span class="more">${fresh.length}</span></div>
      <p class="m small">עבודה עולה לאפליקציה מיד כשהאמן מוסיף אותה (אם האמן כבר מאושר). מספיק להסתכל פעם אחת: "נראה טוב" מוריד אותה מהרשימה; "הסתר" מוריד אותה מהאפליקציה, והאמן עדיין רואה אותה בסטודיו שלו.</p>
      ${fresh.length ? `<div class="adm-works">${fresh.map(w => `<article class="st-card adm-work" data-work="${w.id}"><img src="${esc(w.thumb || w.image)}" alt="" loading="lazy">
        <div class="t"><b>${esc(w.title)}</b><span class="m small">${esc(w.artists ? w.artists.name : '')}${w.artists && w.artists.status !== 'approved' ? ' (עוד לא מאושר)' : ''} · ${esc([w.year, w.medium, w.width && w.height ? `${w.height} × ${w.width} ס"מ` : 'בלי מידות'].filter(Boolean).join(' · '))}</span></div>
        <div class="btns"><button type="button" class="btn f" data-review="ok">נראה טוב</button><button type="button" class="btn g" data-review="hide">הסתר</button></div></article>`).join('')}</div>` : '<p class="m">אין שום דבר חדש.</p>'}</section>
    <section class="sec"><div class="sec-h"><h2>הצטרפו לאחרונה</h2><a class="more" href="#/admin/people">כולם ←</a></div>
      ${people.length ? `<div class="adm-table">${people.slice(0, 8).map(r => `<div><b>${esc([r.first_name, r.last_name].filter(Boolean).join(' ') || '—')}</b><span>${r.role === 'artist' ? 'אמן/ית' : r.role === 'lover' ? 'חובב/ת אמנות' : '—'}</span><span>${esc(r.country || '')}</span><span>${day(r.created_at)}</span></div>`).join('')}</div>` : '<p class="m">עוד אין אף אחד.</p>'}</section>
    <section class="sec"><div class="sec-h"><h2>לנסות את האפליקציה כמשתמש חדש</h2></div>
      <div class="st-card"><p class="m">סיור בכל מסכי ההרשמה, כמו שמשתמש חדש רואה אותם. בלי מייל ובלי קוד אמיתי: כל קוד מתקבל, ושום דבר לא נשמר. החשבון שלך נשאר מחובר מתחת, ובפס למעלה יש יציאה.</p>
        <div class="btns"><button type="button" class="btn f" data-preview="visitor">סיור כמבקר חדש</button><button type="button" class="btn f" data-preview="artist">סיור כאמן חדש</button></div></div>
      <details class="st-card adm-real"><summary>בדיקה אמיתית, עם חשבון בדיקה (מייל וקוד אמיתיים)</summary><p class="m">הרשמה אמיתית כאדם חדש, מההתחלה, בלי לגעת בחשבון שלך:</p>
        <ol class="m small adm-steps"><li>פותחים חלון גלישה פרטית (בספארי באייפון: לשוניות ואז פרטי; בכרום: חלון אנונימי חדש) בכתובת <b dir="ltr">eladamsalem.com/open-studio</b>.</li>
          <li>בוחרים "Continue with email" ומדביקים את הכתובת הזאת: <code id="admAlias" dir="ltr"></code> <button type="button" class="btn g" id="admCopy">העתק</button></li>
          <li>הקוד מגיע ל־<b dir="ltr">ooopenstudio@gmail.com</b>. ממשיכים כמו כל אחד: פרטים, ואז "I make art" או "I love art".</li></ol>
        <p class="m small">כל כתובת עם "+" היא חשבון חדש עם אותה תיבת מייל. החשבונות מופיעים כאן; כשמסיימים מוחקים אותם, עם כל מה שיצרו.</p>
        <div id="admTests"><p class="m small">טוען את חשבונות הבדיקה…</p></div></details></section>`;
}

// --- artists: approve, hide, a note to the artist ------------------------------------------------------------------
async function artists(c) {
  const [{ data: rows = [] }, { data: works = [] }] = await Promise.all([c.from('artists').select('*').order('created_at', { ascending: false }), c.from('works').select('artist_id, thumb, image')]);
  const order = { pending: 0, approved: 1, hidden: 2 };
  rows.sort((a, b) => order[a.status] - order[b.status]);
  if (!rows.length) return '<p class="m">אף אמן עוד לא יצר עמוד. כשמישהו יצור, הוא יחכה לך כאן.</p>';
  const n = rows.filter(r => r.status === 'pending').length;
  return `<p class="m">${n ? `<b>${n}</b> מחכים לך.` : 'אין אף אחד שמחכה.'} עמוד מאושר מופיע באפליקציה מיד; עמוד מוסתר לא מופיע, והאמן רואה את ההערה שלך.</p>
  <div class="adm-list">${rows.map(a => { const ws = works.filter(w => w.artist_id === a.id); return `<article class="st-card adm-artist" data-id="${a.id}">
    <div class="sec-h"><h2>${esc(a.name)}</h2><span class="st-flag ${a.status === 'approved' ? 'ok' : a.status === 'hidden' ? 'no' : ''}">${a.status === 'pending' ? 'מחכה' : a.status === 'approved' ? 'באוויר' : 'מוסתר'}</span></div>
    <p class="m small">${esc([a.discipline, a.city, a.country].filter(Boolean).join(' · '))} · ${ws.length} עבודות · הצטרף/ה ${day(a.created_at)}${a.instagram ? ` · <a href="https://instagram.com/${esc(a.instagram.replace(/^@/, ''))}" target="_blank" rel="noopener">${esc(a.instagram)}</a>` : ''}${a.link ? ` · <a href="${esc(a.link)}" target="_blank" rel="noopener">אתר</a>` : ''}</p>
    ${a.statement ? `<p>${esc(a.statement)}</p>` : ''}
    ${ws.length ? `<div class="adm-thumbs">${ws.slice(0, 12).map(w => `<img src="${esc(w.thumb || w.image)}" alt="" loading="lazy">`).join('')}</div>` : '<p class="m small">עוד אין עבודות.</p>'}
    <label class="adm-note">הערה לאמן (באנגלית, הוא רואה אותה בסטודיו שלו)<input name="note" dir="auto" value="${esc(a.note || '')}" placeholder="e.g. Add sizes to your works, then we'll put you live"></label>
    <div class="btns">${a.status !== 'approved' ? '<button class="btn f" data-status="approved">אשר</button>' : ''}${a.status !== 'hidden' ? '<button class="btn g" data-status="hidden">הסתר</button>' : ''}${a.status === 'approved' ? `<a class="btn g" href="#/artist/${esc(a.slug)}">העמוד שלו</a>` : ''}</div>
  </article>`; }).join('')}</div>`;
}

// --- people: who joined -----------------------------------------------------------------------------------------------
async function people(c) {
  const { data: rows = [] } = await c.from('profiles').select('first_name, last_name, role, country, provider, created_at').order('created_at', { ascending: false }).limit(500);
  const count = f => Object.entries(rows.reduce((o, r) => { const k = f(r) || '—'; o[k] = (o[k] || 0) + 1; return o; }, {})).sort((a, b) => b[1] - a[1]);
  const week = rows.filter(r => Date.now() - new Date(r.created_at) < 7 * 864e5).length;
  const stat = (t, list) => `<div class="st-card"><h3 class="adm-h3">${t}</h3>${list.map(([k, v]) => `<div class="adm-kv"><span>${esc(k)}</span><b>${v}</b></div>`).join('')}</div>`;
  return `<div class="st-stats"><div><b>${rows.length}</b><span>משתמשים</span></div><div><b>${week}</b><span>השבוע</span></div><div><b>${rows.filter(r => r.role === 'artist').length}</b><span>אמנים</span></div></div>
    <div class="adm-cols">${stat('נרשמו בתור', count(r => r.role === 'artist' ? 'אמן/ית' : r.role === 'lover' ? 'חובב/ת אמנות' : 'עוד לא בחרו'))}${stat('נכנסו עם', count(r => r.provider === 'google' ? 'Google' : 'מייל'))}${stat('מאיפה', count(r => r.country).slice(0, 8))}</div>
    <section class="sec"><div class="sec-h"><h2>האחרונים</h2></div><div class="adm-table">${rows.slice(0, 60).map(r => `<div><b>${esc([r.first_name, r.last_name].filter(Boolean).join(' ') || '—')}</b><span>${r.role === 'artist' ? 'אמן/ית' : r.role === 'lover' ? 'חובב/ת אמנות' : '—'}</span><span>${esc(r.country || '')}</span><span>${day(r.created_at)}</span></div>`).join('')}</div></section>`;
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

// --- asking for a change: becomes a GitHub issue, which the nightly session takes up --------------------------------
async function requests(c) {
  const { data: rows = [] } = await c.from('change_requests').select('*').order('created_at', { ascending: false }).limit(30);
  return `<p class="m">כתוב מה לשנות או להוסיף, בכל שפה. זה הופך למשימה לסשן הלילי, שעושה אותה, בודק בטלפון ומעדכן אותך. כל מה שנוגע לעיצוב, להתחברות או לנתונים מחכה לאישור שלך.</p>
    <form class="st-form" id="rqForm"><label>מה לשנות<textarea name="body" dir="auto" rows="5" required minlength="3"></textarea></label><div class="btns"><button class="btn f" type="submit">שלח</button></div></form>
    <section class="sec"><div class="list">${rows.map(r => `<div class="row noimg"><div class="t"><div>${esc(r.body.slice(0, 160))}</div><div class="m">${day(r.created_at)} · ${r.status === 'open' ? 'מחכה' : r.status === 'filed' ? `בטיפול${r.issue ? ` (<a href="https://github.com/${REPO}/issues/${r.issue}" target="_blank" rel="noopener">#${r.issue}</a>)` : ''}` : 'בוצע'}</div></div></div>`).join('')}</div></section>`;
}

// --- how the app is: the checks, the last runs, the nightly log -------------------------------------------------------
async function health() {
  const gh = p => fetch(`https://api.github.com/repos/${REPO}/${p}`, { headers: { Accept: 'application/vnd.github+json' } }).then(r => r.ok ? r.json() : null).catch(() => null);
  const [issues, runs] = await Promise.all([gh('issues?labels=app-health&state=open'), gh('actions/runs?per_page=40')]);
  const latest = new Map();
  for (const r of (runs && runs.workflow_runs) || []) if (!latest.has(r.name) && !/pages build/.test(r.name)) latest.set(r.name, r);
  const mark = r => r.status !== 'completed' ? ['', 'רץ'] : r.conclusion === 'success' ? ['ok', 'תקין'] : ['no', r.conclusion === 'failure' ? 'נכשל' : r.conclusion];
  return `${issues && issues.length ? `<p class="st-status no">משהו שבור: <a href="${esc(issues[0].html_url)}" target="_blank" rel="noopener" dir="ltr">${esc(issues[0].title)}</a>. הסשן הלילי מטפל בזה.</p>` : issues ? '<p class="st-status ok">הכל תקין: כל הבדיקות עוברות.</p>' : '<p class="m">GitHub לא ענה כרגע.</p>'}
    <div class="list">${[...latest.values()].map(r => `<a class="row noimg" href="${esc(r.html_url)}" target="_blank" rel="noopener"><div class="t"><div><b>${esc(r.name)}</b></div><div class="m">${day(r.created_at)}</div></div><span class="st-flag ${mark(r)[0]}">${esc(mark(r)[1])}</span></a>`).join('')}</div>
    <p class="m small"><a href="https://github.com/${REPO}/blob/studio/studio/app/health/log.md" target="_blank" rel="noopener">מה הסשן הלילי עשה, לילה אחרי לילה</a></p>`;
}

function wire(app, c, go) {
  const $ = s => app.querySelector(s);
  app.querySelectorAll('[data-preview]').forEach(b => b.onclick = async () => {
    const { startPreview } = await import('./auth.js');
    startPreview(b.dataset.preview); go('#/welcome');
  });
  app.querySelectorAll('[data-review]').forEach(b => b.onclick = async () => {
    const card = b.closest('[data-work]'); card.querySelectorAll('button').forEach(x => x.disabled = true);
    const { error } = await c.from('works').update({ reviewed_at: new Date().toISOString(), hidden: b.dataset.review === 'hide' }).eq('id', card.dataset.work);
    if (error) { alert(error.message); card.querySelectorAll('button').forEach(x => x.disabled = false); return; }
    card.remove();
  });
  const alias = $('#admAlias');
  if (alias) {
    const t = new Date(), p = n => String(n).padStart(2, '0');
    alias.textContent = `ooopenstudio+t${p(t.getMonth() + 1)}${p(t.getDate())}${p(t.getHours())}${p(t.getMinutes())}@gmail.com`;
    $('#admCopy').onclick = () => navigator.clipboard.writeText(alias.textContent).then(() => { $('#admCopy').textContent = 'הועתק'; });
    const call = async body => {
      const { data: { session } } = await c.auth.getSession();
      const r = await fetch(USERS, { method: 'POST', headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const d = await r.json().catch(() => ({ error: 'אין תשובה.' }));
      if (!r.ok || d.error) throw new Error(d.error || 'זה לא עבד.');
      return d;
    };
    const list = async () => {
      const box = $('#admTests'); if (!box) return;
      try {
        const { accounts } = await call({ action: 'list' });
        box.innerHTML = accounts.length ? `<div class="list">${accounts.map(a => `<div class="row noimg"><div class="t"><div><b dir="ltr">${esc(a.email)}</b></div><div class="m">${esc(a.name || 'עוד בלי שם')} · ${a.role === 'artist' ? `אמן/ית${a.artist ? ` (${a.artist === 'pending' ? 'מחכה' : a.artist === 'approved' ? 'מאושר' : 'מוסתר'})` : ''}` : a.role === 'lover' ? 'חובב/ת אמנות' : 'עוד לא בחר/ה'} · ${day(a.created_at)}</div></div><button type="button" class="btn g" data-del-user="${a.id}">מחק</button></div>`).join('')}</div>` : '<p class="m small">אין כרגע חשבונות בדיקה.</p>';
        box.querySelectorAll('[data-del-user]').forEach(b => b.onclick = async () => {
          if (!confirm('למחוק את חשבון הבדיקה ואת כל מה שהוא יצר?')) return;
          b.disabled = true;
          try { await call({ action: 'delete', id: b.dataset.delUser }); list(); } catch (e) { alert(e.message); b.disabled = false; }
        });
      } catch (e) { box.innerHTML = `<p class="m small">${esc(e.message)}</p>`; }
    };
    list();
  }
  app.querySelectorAll('.adm-artist [data-status]').forEach(b => b.onclick = async () => {
    const card = b.closest('.adm-artist'); b.disabled = true;
    const { error } = await c.from('artists').update({ status: b.dataset.status, note: card.querySelector('[name=note]').value || null }).eq('id', card.dataset.id);
    if (error) { alert(error.message); b.disabled = false; return; }
    go(location.hash, true);
  });
  app.querySelectorAll('[data-unpublish]').forEach(b => b.onclick = async () => { await c.from('virtual_shows').update({ status: 'draft' }).eq('id', b.dataset.unpublish); go(location.hash, true); });
  const rq = $('#rqForm');
  if (rq) rq.onsubmit = async e => { e.preventDefault(); const body = new FormData(rq).get('body').trim(); const { error } = await c.from('change_requests').insert({ body }); if (error) alert(error.message); else go(location.hash, true); };
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
