// Open Studio's control room (#/admin): for the people who run it (public.admins; the database checks it on every
// read and write, this screen only follows). An overview first (what waits for you, how many joined, trying the app as
// someone new), then artists waiting to be approved, the people who joined, the exhibitions Open Studio curates (like
// playlists, by hand, across artists), asking for a change in the app, and how the app is.
import { client } from './auth.js';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const REPO = 'eladamsalemart/eladamsalem.github.io';
const TABS = [['', 'Overview'], ['artists', 'Artists'], ['people', 'People'], ['curated', 'Curated'], ['requests', 'Ask for a change'], ['health', 'Health']];
let M = null, SYN = null, cur = null;            // the app's content; the room drawing; the curated show being edited
const synth = () => SYN || (SYN = import('./space/synth.js'));
const day = t => new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

const shell = (tab, body) => `<div class="wrap gut st adm">
  <div class="st-head"><a class="back" href="#/">← Open Studio</a><span class="tag">Control room</span></div>
  <h1 class="st-h1">${esc((TABS.find(t => t[0] === tab) || TABS[0])[1])}</h1>
  <nav class="st-nav" aria-label="Control room">${TABS.map(([k, t]) => `<a href="#/admin${k ? '/' + k : ''}" ${k === tab ? 'aria-current="page"' : ''}>${t}</a>`).join('')}</nav>
  ${body}</div>`;

export async function admin(hash, app, go, model) {
  M = model;
  const c = await client();
  const { data: { session } } = await c.auth.getSession();
  const { data: ok } = session ? await c.rpc('is_admin') : { data: false };
  if (!ok) { app.innerHTML = shell('', `<p class="m">This is for the people who run Open Studio. ${session ? '' : '<a href="#/welcome">Sign in</a> first.'}</p>`); return; }
  const m = hash.replace(/^#\/admin\/?/, '');
  const tab = m.split('/')[0];
  app.innerHTML = shell(tab, '<p class="m">Loading…</p>');
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
      ${stat(waiting.length, 'artists waiting', '#/admin/artists')}${stat(fresh.length, 'new works to look at', '#/admin')}
      ${stat(today, 'joined today', '#/admin/people')}${stat(week, 'joined this week', '#/admin/people')}
      ${stat(people.length, 'people in all', '#/admin/people')}${stat(liveArtists ?? 0, 'artists live', '#/admin/artists')}
      ${stat(allWorks ?? 0, 'works', '#/admin/artists')}${stat(shows.length, 'exhibitions published', '#/admin/curated')}</div>
    <section class="sec"><div class="sec-h"><h2>Artists waiting</h2><a class="more" href="#/admin/artists">All artists →</a></div>
      ${waiting.length ? `<div class="list">${waiting.map(a => `<a class="row noimg" href="#/admin/artists"><div class="t"><div><b>${esc(a.name)}</b></div><div class="m">${esc([a.discipline, a.city].filter(Boolean).join(' · '))} · since ${day(a.created_at)}</div></div><span class="st-flag">Waiting</span></a>`).join('')}</div>` : '<p class="m">Nobody waiting.</p>'}</section>
    <section class="sec"><div class="sec-h"><h2>New works to look at</h2><span class="more">${fresh.length}</span></div>
      <p class="m small">A work is in the app as soon as its artist adds it (once the artist is approved). Look once: “Looks good” clears it from here; “Hide” takes it out of the app, and its artist still sees it in their studio.</p>
      ${fresh.length ? `<div class="adm-works">${fresh.map(w => `<article class="st-card adm-work" data-work="${w.id}"><img src="${esc(w.thumb || w.image)}" alt="" loading="lazy">
        <div class="t"><b>${esc(w.title)}</b><span class="m small">${esc(w.artists ? w.artists.name : '')}${w.artists && w.artists.status !== 'approved' ? ' (not approved yet)' : ''} · ${esc([w.year, w.medium, w.width && w.height ? `${w.height} × ${w.width} cm` : 'no size'].filter(Boolean).join(' · '))}</span></div>
        <div class="btns"><button type="button" class="btn f" data-review="ok">Looks good</button><button type="button" class="btn g" data-review="hide">Hide</button></div></article>`).join('')}</div>` : '<p class="m">Nothing new.</p>'}</section>
    <section class="sec"><div class="sec-h"><h2>Joined lately</h2><a class="more" href="#/admin/people">Everyone →</a></div>
      ${people.length ? `<div class="adm-table">${people.slice(0, 8).map(r => `<div><b>${esc([r.first_name, r.last_name].filter(Boolean).join(' ') || '—')}</b><span>${r.role === 'artist' ? 'Artist' : r.role === 'lover' ? 'Art lover' : '—'}</span><span>${esc(r.country || '')}</span><span>${day(r.created_at)}</span></div>`).join('')}</div>` : '<p class="m">Nobody yet.</p>'}</section>
    <section class="sec"><div class="sec-h"><h2>Try the app as someone new</h2></div>
      <div class="st-card"><p class="m">Sign up as a new person, from the very start, without touching your own account:</p>
        <ol class="m small adm-steps"><li>Open a private window (iPhone Safari: Tabs, then Private; Chrome: New incognito window) at <b>eladamsalem.com/open-studio</b>.</li>
          <li>Continue with email, with this address: <code id="admAlias"></code> <button type="button" class="btn g" id="admCopy">Copy</button></li>
          <li>The code arrives at <b>ooopenstudio@gmail.com</b>. Go on as anyone would: your details, then “I make art” or “I love art”.</li></ol>
        <p class="m small">Every “+” address is a new account with the same inbox. They are listed here: delete them when you are done, with everything they made.</p>
        <div id="admTests"><p class="m small">Loading the test accounts…</p></div></div></section>`;
}

// --- artists: approve, hide, a note to the artist ------------------------------------------------------------------
async function artists(c) {
  const [{ data: rows = [] }, { data: works = [] }] = await Promise.all([c.from('artists').select('*').order('created_at', { ascending: false }), c.from('works').select('artist_id, thumb, image')]);
  const order = { pending: 0, approved: 1, hidden: 2 };
  rows.sort((a, b) => order[a.status] - order[b.status]);
  if (!rows.length) return '<p class="m">No artist has made a page yet. When one does, it waits here for you.</p>';
  const n = rows.filter(r => r.status === 'pending').length;
  return `<p class="m">${n ? `<b>${n}</b> waiting for you.` : 'Nobody waiting.'} An approved page shows in the app at once; a hidden one doesn't, and its artist sees your note.</p>
  <div class="adm-list">${rows.map(a => { const ws = works.filter(w => w.artist_id === a.id); return `<article class="st-card adm-artist" data-id="${a.id}">
    <div class="sec-h"><h2>${esc(a.name)}</h2><span class="st-flag ${a.status === 'approved' ? 'ok' : a.status === 'hidden' ? 'no' : ''}">${a.status === 'pending' ? 'Waiting' : a.status === 'approved' ? 'Live' : 'Hidden'}</span></div>
    <p class="m small">${esc([a.discipline, a.city, a.country].filter(Boolean).join(' · '))} · ${ws.length} works · joined ${day(a.created_at)}${a.instagram ? ` · <a href="https://instagram.com/${esc(a.instagram.replace(/^@/, ''))}" target="_blank" rel="noopener">${esc(a.instagram)}</a>` : ''}${a.link ? ` · <a href="${esc(a.link)}" target="_blank" rel="noopener">website</a>` : ''}</p>
    ${a.statement ? `<p>${esc(a.statement)}</p>` : ''}
    ${ws.length ? `<div class="adm-thumbs">${ws.slice(0, 12).map(w => `<img src="${esc(w.thumb || w.image)}" alt="" loading="lazy">`).join('')}</div>` : '<p class="m small">No works yet.</p>'}
    <label class="adm-note">A note to the artist (they see it in their studio)<input name="note" value="${esc(a.note || '')}" placeholder="e.g. Add sizes to your works, then we'll put you live"></label>
    <div class="btns">${a.status !== 'approved' ? '<button class="btn f" data-status="approved">Approve</button>' : ''}${a.status !== 'hidden' ? '<button class="btn g" data-status="hidden">Hide</button>' : ''}${a.status === 'approved' ? `<a class="btn g" href="#/artist/${esc(a.slug)}">Their page</a>` : ''}</div>
  </article>`; }).join('')}</div>`;
}

// --- people: who joined -----------------------------------------------------------------------------------------------
async function people(c) {
  const { data: rows = [] } = await c.from('profiles').select('first_name, last_name, role, country, provider, created_at').order('created_at', { ascending: false }).limit(500);
  const count = f => Object.entries(rows.reduce((o, r) => { const k = f(r) || '—'; o[k] = (o[k] || 0) + 1; return o; }, {})).sort((a, b) => b[1] - a[1]);
  const week = rows.filter(r => Date.now() - new Date(r.created_at) < 7 * 864e5).length;
  const stat = (t, list) => `<div class="st-card"><h3 class="adm-h3">${t}</h3>${list.map(([k, v]) => `<div class="adm-kv"><span>${esc(k)}</span><b>${v}</b></div>`).join('')}</div>`;
  return `<div class="st-stats"><div><b>${rows.length}</b><span>people</span></div><div><b>${week}</b><span>this week</span></div><div><b>${rows.filter(r => r.role === 'artist').length}</b><span>artists</span></div></div>
    <div class="adm-cols">${stat('Here as', count(r => r.role === 'artist' ? 'Artist' : r.role === 'lover' ? 'Art lover' : 'Not chosen yet'))}${stat('Signed in with', count(r => r.provider === 'google' ? 'Google' : 'Email'))}${stat('From', count(r => r.country).slice(0, 8))}</div>
    <section class="sec"><div class="sec-h"><h2>Latest</h2></div><div class="adm-table">${rows.slice(0, 60).map(r => `<div><b>${esc([r.first_name, r.last_name].filter(Boolean).join(' ') || '—')}</b><span>${r.role === 'artist' ? 'Artist' : r.role === 'lover' ? 'Art lover' : '—'}</span><span>${esc(r.country || '')}</span><span>${day(r.created_at)}</span></div>`).join('')}</div></section>`;
}

// --- curated exhibitions: chosen and ordered by hand, across artists --------------------------------------------------
const keyOf = w => w.community ? { id: w.id } : { slug: w.slug };
const findWork = k => M.works.find(w => (k.id && w.id === k.id) || (k.slug && w.slug === k.slug));
async function curated(c, id) {
  const { ROOMS, PAINTS } = await synth();
  if (!id) {
    const { data: rows = [] } = await c.from('virtual_shows').select('*').order('created_at', { ascending: false });
    const mine = rows.filter(r => r.kind === 'curated'), theirs = rows.filter(r => r.kind === 'artist' && r.status === 'published');
    return `<p class="m">Exhibitions you put together from any artists' works, in the order you choose, in one of Open Studio's rooms. No algorithm: published, they appear in Shows and on Home's sky like any show.</p>
      <div class="btns"><a class="btn f" href="#/admin/curated/new">New curated exhibition</a></div>
      <div class="list">${mine.map(r => `<a class="row" href="#/admin/curated/${r.id}"><img src="${esc((findWork(r.works[0] || {}) || {}).image || '')}" alt=""><div class="t"><div><b>${esc(r.title)}</b></div><div class="m">${esc(ROOMS[r.room] ? ROOMS[r.room].name : r.room)} · ${r.works.length} works</div></div><span class="st-flag ${r.status === 'published' ? 'ok' : ''}">${r.status === 'published' ? 'Published' : 'Draft'}</span></a>`).join('') || '<p class="m small">None yet. (The Green Hour, the demo, is in the app’s own data.)</p>'}</div>
      ${theirs.length ? `<section class="sec"><div class="sec-h"><h2>Artists' own</h2><span class="more">${theirs.length} published</span></div><div class="list">${theirs.map(r => `<div class="row noimg"><div class="t"><div><b>${esc(r.title)}</b></div><div class="m">${r.works.length} works</div></div><button class="btn g" data-unpublish="${r.id}">Take down</button></div>`).join('')}</div></section>` : ''}`;
  }
  if (!cur || cur.id !== id) {
    if (id === 'new') cur = { id: 'new', title: '', curator: 'Elad Amsalem', room: 'long-hall', paint: '', centre: 148, text: '', works: [], status: 'draft' };
    else { const { data } = await c.from('virtual_shows').select('*').eq('id', id).maybeSingle(); if (!data) return '<p class="m">Not found.</p>'; cur = { ...data, text: data.text || '' }; }
  }
  const v = cur, paint = v.paint || ROOMS[v.room].paint, picked = v.works.map(findWork);
  const byArtist = [...new Set(M.works.map(w => w.artist))].map(a => [a, M.works.filter(w => w.artist === a && !picked.includes(w))]).filter(([, ws]) => ws.length);
  return `<form class="st-form st-vx" id="cuForm">
    <label>Title<input name="title" required value="${esc(v.title)}"></label>
    <label>Curated by<input name="curator" value="${esc(v.curator || '')}"></label>
    <fieldset><legend>The room</legend><div class="vx-rooms">${Object.entries(ROOMS).map(([k, r]) => `<label class="vx-room"><input type="radio" name="room" value="${k}" ${v.room === k ? 'checked' : ''}><b>${esc(r.name)}</b><span class="m small">${esc(r.size)} · ${esc(r.blurb)}</span></label>`).join('')}</div></fieldset>
    <fieldset><legend>The walls</legend><div class="vx-paints">${Object.entries(PAINTS).map(([k, [n, col]]) => `<label class="vx-paint"><input type="radio" name="paint" value="${k}" ${paint === k ? 'checked' : ''}><i style="background:${col}"></i><span>${n}</span></label>`).join('')}</div></fieldset>
    <fieldset><legend>Works, in walking order</legend>
      ${picked.length ? `<ol class="vx-order">${picked.map((w, i) => w ? `<li><img src="${esc(w.image)}" alt=""><div class="t"><b>${esc(w.title)}</b><span class="m small">${esc(w.artist.name)}</span></div>
        <button type="button" data-up="${i}" aria-label="Earlier" ${i ? '' : 'disabled'}>↑</button><button type="button" data-down="${i}" aria-label="Later" ${i < picked.length - 1 ? '' : 'disabled'}>↓</button><button type="button" data-out="${i}" aria-label="Take out">×</button></li>` : '').join('')}</ol>` : '<p class="m">Choose works below, from any artist.</p>'}
      ${byArtist.map(([a, ws]) => `<details class="vx-add"><summary>${esc(a.name)} (${ws.length})</summary><div class="st-pick">${ws.map(w => `<label><input type="checkbox" data-add="${esc(w.slug)}"><img src="${esc(w.image)}" alt="" loading="lazy"><span>${esc(w.title)}</span></label>`).join('')}</div></details>`).join('')}
    </fieldset>
    <label>The curator's words<textarea name="text" rows="5">${esc(v.text)}</textarea></label>
    <div class="btns"><button class="btn f" type="button" id="cuWalk" ${picked.length ? '' : 'disabled'}>Walk in</button><button class="btn g" type="submit">Save</button>
      <button class="btn g" type="button" id="cuPub">${v.status === 'published' ? 'Take down' : 'Publish'}</button>${v.id !== 'new' ? '<button class="btn g" type="button" id="cuDel">Delete</button>' : ''}</div>
    <p class="m small">${v.status === 'published' ? 'Published: in Shows, and on Home.' : 'A draft: only the control room sees it.'}</p>
  </form>`;
}

// --- asking for a change: becomes a GitHub issue, which the nightly session takes up --------------------------------
async function requests(c) {
  const { data: rows = [] } = await c.from('change_requests').select('*').order('created_at', { ascending: false }).limit(30);
  return `<p class="m">Write what you'd like changed or added, in any language. It becomes a task for the nightly session, which does it, checks it on a phone, and tells you; anything about design, sign-in or data waits for your word.</p>
    <form class="st-form" id="rqForm"><label>What should change<textarea name="body" rows="5" required minlength="3"></textarea></label><div class="btns"><button class="btn f" type="submit">Send</button></div></form>
    <section class="sec"><div class="list">${rows.map(r => `<div class="row noimg"><div class="t"><div>${esc(r.body.slice(0, 160))}</div><div class="m">${day(r.created_at)} · ${r.status === 'open' ? 'Waiting' : r.status === 'filed' ? `Taken up${r.issue ? ` (<a href="https://github.com/${REPO}/issues/${r.issue}" target="_blank" rel="noopener">#${r.issue}</a>)` : ''}` : 'Done'}</div></div></div>`).join('')}</div></section>`;
}

// --- how the app is: the checks, the last runs, the nightly log -------------------------------------------------------
async function health() {
  const gh = p => fetch(`https://api.github.com/repos/${REPO}/${p}`, { headers: { Accept: 'application/vnd.github+json' } }).then(r => r.ok ? r.json() : null).catch(() => null);
  const [issues, runs] = await Promise.all([gh('issues?labels=app-health&state=open'), gh('actions/runs?per_page=40')]);
  const latest = new Map();
  for (const r of (runs && runs.workflow_runs) || []) if (!latest.has(r.name) && !/pages build/.test(r.name)) latest.set(r.name, r);
  const mark = r => r.status !== 'completed' ? ['', 'Running'] : r.conclusion === 'success' ? ['ok', 'Fine'] : ['no', r.conclusion === 'failure' ? 'Failed' : r.conclusion];
  return `${issues && issues.length ? `<p class="st-status no">Something is broken: <a href="${esc(issues[0].html_url)}" target="_blank" rel="noopener">${esc(issues[0].title)}</a>. The nightly session is on it.</p>` : issues ? '<p class="st-status ok">Nothing broken: every check passes.</p>' : '<p class="m">GitHub didn’t answer just now.</p>'}
    <div class="list">${[...latest.values()].map(r => `<a class="row noimg" href="${esc(r.html_url)}" target="_blank" rel="noopener"><div class="t"><div><b>${esc(r.name)}</b></div><div class="m">${day(r.created_at)}</div></div><span class="st-flag ${mark(r)[0]}">${esc(mark(r)[1])}</span></a>`).join('')}</div>
    <p class="m small"><a href="https://github.com/${REPO}/blob/studio/studio/app/health/log.md" target="_blank" rel="noopener">What the nightly session did, night by night</a></p>`;
}

function wire(app, c, go) {
  const $ = s => app.querySelector(s);
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
    $('#admCopy').onclick = () => navigator.clipboard.writeText(alias.textContent).then(() => { $('#admCopy').textContent = 'Copied'; });
    const call = async body => {
      const { data: { session } } = await c.auth.getSession();
      const r = await fetch(USERS, { method: 'POST', headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const d = await r.json().catch(() => ({ error: 'No answer.' }));
      if (!r.ok || d.error) throw new Error(d.error || 'That didn’t work.');
      return d;
    };
    const list = async () => {
      const box = $('#admTests'); if (!box) return;
      try {
        const { accounts } = await call({ action: 'list' });
        box.innerHTML = accounts.length ? `<div class="list">${accounts.map(a => `<div class="row noimg"><div class="t"><div><b>${esc(a.email)}</b></div><div class="m">${esc(a.name || 'no name yet')} · ${a.role === 'artist' ? `Artist${a.artist ? ` (${a.artist === 'pending' ? 'waiting' : a.artist})` : ''}` : a.role === 'lover' ? 'Art lover' : 'not chosen yet'} · ${day(a.created_at)}</div></div><button type="button" class="btn g" data-del-user="${a.id}">Delete</button></div>`).join('')}</div>` : '<p class="m small">No test accounts now.</p>';
        box.querySelectorAll('[data-del-user]').forEach(b => b.onclick = async () => {
          if (!confirm('Delete this test account and everything it made?')) return;
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
  const del = $('#cuDel'); if (del) del.onclick = async () => { if (!confirm('Delete this exhibition?')) return; await c.from('virtual_shows').delete().eq('id', cur.id); cur = null; go('#/admin/curated'); };
  $('#cuWalk').onclick = async () => {
    keep();
    const [{ buildRoom }, { openSpace }] = await Promise.all([synth(), import('./space/space.js')]);
    const works = cur.works.map(findWork).filter(Boolean);
    const made = await buildRoom({ title: cur.title || 'Untitled', room: cur.room, paint: cur.paint, centre: cur.centre, works }, u => (M.media && M.media[u]) || u);
    window.__spaceView = await openSpace({ spec: made.spec, works, src: u => (M.media && M.media[u]) || u, onClose: () => made.revoke() });
  };
}
