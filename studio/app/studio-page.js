// Your page is your studio. The artist's own public page (app.js's artistPage, untouched in look) with an edit mode on
// top: tap the portrait to change it, tap the statement or the About text to write in place, tap a work or an
// exhibition to change it in a light sheet, drag a work by its grip to reorder, and a short checklist says what the
// page still needs before it can go live. "View" shows the page exactly as a visitor sees it.
//
// It edits artist.js's studio object (S) and saves through artist.js (the account's database, or the demo's browser).

const MODE = 'os-studio-mode';
const mode = () => { try { return sessionStorage.getItem(MODE) === 'view' ? 'view' : 'edit'; } catch { return 'edit'; } };
const setMode = m => { try { sessionStorage.setItem(MODE, m); } catch {} };

const CSS = `
.ed-bar{position:sticky;top:0;z-index:30;display:grid;grid-template-columns:44px 1fr auto;align-items:center;gap:8px;min-height:52px;padding:calc(env(safe-area-inset-top) + 4px) 12px 4px;background:color-mix(in srgb,var(--wall) 92%,transparent);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);border-bottom:1px solid var(--line)}
body.previewing .ed-bar{top:34px}
.ed-bar .ed-back{width:44px;height:44px;display:grid;place-items:center;text-decoration:none;font-size:22px;margin-left:-8px}
.ed-seg{justify-self:center;display:flex;background:var(--card);border-radius:12px;padding:3px}
.ed-seg button{min-height:38px;min-width:76px;border:0;border-radius:10px;background:none;font:600 14px var(--sans);color:var(--muted);cursor:pointer}
.ed-seg button[aria-pressed=true]{background:var(--ink);color:var(--wall)}
.ed-chip{font:600 11px var(--mono);letter-spacing:.06em;text-transform:uppercase;padding:6px 10px;border-radius:99px;background:var(--card);color:var(--muted);white-space:nowrap}
.ed-chip.ok{background:color-mix(in srgb,#2f7d4f 16%,transparent);color:#2f7d4f}.ed-chip.no{background:color-mix(in srgb,var(--dot) 14%,transparent);color:var(--dot)}
.ed .hero:not(:has(img)){min-height:260px;background:var(--ink)}
.ed .hero .ov .wrap{cursor:pointer}
.ed-av{position:absolute;top:14px;right:16px;width:72px;height:90px;border:2px solid #fff;overflow:hidden;padding:0;background:var(--ink);color:#fff;cursor:pointer;display:grid;place-items:center;font:600 11px var(--sans);text-align:center;box-shadow:0 2px 12px rgba(0,0,0,.35)}
.ed-av img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.ed-av i{position:absolute;left:0;right:0;bottom:0;background:rgba(0,0,0,.55);font-style:normal;padding:3px 0 4px;font-size:10px}
.ed-pen{display:inline-block;margin-left:8px;font-size:15px;opacity:.7;vertical-align:middle}
.ed [contenteditable]{outline:0;border-radius:6px;cursor:text;min-height:1.2em;white-space:pre-wrap}
.ed .statement[contenteditable]{box-shadow:0 0 0 1.5px var(--line);padding:14px 12px;margin:22px -12px 0;max-width:none}
.ed [contenteditable]:focus{box-shadow:0 0 0 2px var(--ink)}
.ed [contenteditable]:empty::before{content:attr(data-ph);color:var(--muted);font-family:var(--sans);font-size:16px}
.ed-card{background:var(--paper);border:1px solid var(--line);border-radius:16px;padding:16px;display:grid;gap:10px;margin-top:18px}
.ed-card h2{font-family:var(--serif);font-size:24px;line-height:1.1;font-weight:500}
.ed-card p{margin:0;font-size:15px;color:var(--muted)}
.ed-card.live{background:color-mix(in srgb,#2f7d4f 12%,var(--paper))}
.ed-todo{display:grid;gap:2px;list-style:none;margin:0;padding:0}
.ed-todo button{display:grid;grid-template-columns:28px 1fr 16px;gap:10px;align-items:center;width:100%;min-height:48px;padding:6px 0;border:0;border-bottom:1px solid var(--line);background:none;text-align:left;font:inherit;font-size:16px;color:var(--ink);cursor:pointer}
.ed-todo li:last-child button{border-bottom:0}
.ed-todo .c{width:24px;height:24px;border-radius:50%;border:1.5px solid var(--muted);display:grid;place-items:center;font-size:13px;color:#fff}
.ed-todo .done .c{background:#2f7d4f;border-color:#2f7d4f}.ed-todo .done button{color:var(--muted);text-decoration:line-through}
.ed-actions{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
.ed-sec-add{display:flex;align-items:center;justify-content:center;gap:6px;width:100%;min-height:52px;margin:0 0 6px;border:1.5px dashed var(--line);border-radius:12px;background:none;font:600 15px var(--sans);color:var(--ink);cursor:pointer}
.ed .list .row{position:relative;cursor:pointer}
.ed .list .row>span:last-child{display:grid;place-items:center;width:44px;height:44px;margin:-8px -8px -8px 0;color:var(--muted);touch-action:none;cursor:grab;font-size:20px;letter-spacing:-2px}
.ed .list .row>span:last-child::before{content:"\\2807\\2807"}
.ed .list .row.drag{background:var(--card);box-shadow:0 6px 24px rgba(0,0,0,.2);z-index:5;position:relative}
.ed .covers a{cursor:pointer}
.ed-fab{position:fixed;right:16px;bottom:calc(16px + env(safe-area-inset-bottom));z-index:40;min-height:52px;padding:0 22px 0 18px;border:0;border-radius:99px;background:var(--ink);color:var(--wall);font:600 16px var(--sans);display:flex;align-items:center;gap:8px;box-shadow:0 6px 24px rgba(0,0,0,.28);cursor:pointer}
.ed-fab b{font-size:22px;line-height:1;font-weight:400}
.ed-foot{padding:28px 0 96px;display:flex;gap:16px;flex-wrap:wrap}
.ed-room{display:grid;gap:4px;text-decoration:none;color:inherit}.ed-room b{font-size:17px}.ed-room span{font-size:14px;color:var(--muted)}
.sh-back{position:fixed;inset:0;z-index:100;background:rgba(20,18,14,.42);display:flex;align-items:flex-end;justify-content:center}
.sh{width:min(100%,560px);max-height:88vh;max-height:88dvh;background:var(--wall);border-radius:0;border-top:1px solid var(--line);display:flex;flex-direction:column;animation:sh-up .22s ease-out}
@keyframes sh-up{from{transform:translateY(40px);opacity:0}}
@media(prefers-reduced-motion:reduce){.sh{animation:none}}
.sh-h{display:flex;justify-content:space-between;align-items:center;padding:6px 8px 4px 20px;min-height:56px}
.sh-h b{font-family:var(--serif);font-size:24px;font-weight:500}
.sh-x{width:44px;height:44px;border:0;background:none;font-size:28px;cursor:pointer;color:var(--ink)}
.sh-b{overflow:auto;padding:0 20px calc(22px + env(safe-area-inset-bottom));-webkit-overflow-scrolling:touch}
.sh-b .st-form{padding-block:4px 6px}
.sh-b .st-drop{min-height:150px}.sh-b .st-drop img{max-height:200px}
.sh-opt{display:grid;grid-template-columns:1fr 20px;gap:2px 8px;align-items:center;width:100%;min-height:64px;padding:10px 2px;border:0;border-bottom:1px solid var(--line);background:none;text-align:left;font:inherit;color:var(--ink);cursor:pointer;text-decoration:none}
.sh-opt b{font-size:17px}.sh-opt span{grid-column:1;font-size:14px;color:var(--muted)}.sh-opt::after{content:"\\2192";grid-row:1/3;grid-column:2}
.sh-cv{display:grid;gap:8px;padding:10px 0;border-bottom:1px solid var(--line)}
.sh-cv .st-row{gap:8px}
.sh-cv button{justify-self:end;min-height:36px;border:0;background:none;color:var(--dot);font:600 13px var(--sans);cursor:pointer}
.sh .err{color:var(--dot)}
.ed-toast{position:fixed;left:50%;bottom:calc(84px + env(safe-area-inset-bottom));transform:translateX(-50%);z-index:120;background:var(--ink);color:var(--wall);padding:10px 16px;border-radius:12px;font-size:14px;max-width:86vw}
body.sh-open{overflow:hidden}
`;
const hook = () => { if (!document.getElementById('edCss')) { const s = document.createElement('style'); s.id = 'edCss'; s.textContent = CSS; document.head.append(s); } };

export function mount(c) {
  const { app, S, tools, h, save, go, act } = c;
  const { esc, uid, asDataURL, checkImage, verdict, checks } = h;
  hook();
  let a = null;                                           // the page's artist as the app builds it

  const toast = t => { const e = document.createElement('div'); e.className = 'ed-toast'; e.textContent = t; document.body.append(e); setTimeout(() => e.remove(), 3200); };
  const onFail = ev => toast(`Couldn’t save: ${ev.detail}`);
  window.removeEventListener('studio-save-failed', window.__edFail); window.__edFail = onFail; window.addEventListener('studio-save-failed', onFail);

  // --- the state of the page, in one chip ------------------------------------------------------------------
  const STATE = { approved: ['Live', 'ok'], pending: ['In review', ''], changes: ['Changes asked', 'no'], hidden: ['Hidden', 'no'], draft: ['Draft', ''] };
  const state = () => STATE[S.status] || STATE.draft;
  const things = () => [
    ['portrait', 'Add your portrait', !!S.artist.photo],
    ['statement', 'Write a few lines about your work', (S.artist.statement || '').trim().length >= 20],
    ['works', 'Add at least 3 works', S.works.length >= 3],
  ];
  const ready = () => things().every(t => t[2]);

  const card = () => {
    const t = things(), left = t.filter(x => !x[2]).length;
    if (S.status === 'approved') return `<div class="ed-card live"><h2>Your page is live</h2><p>Visitors see this page. Every change you make here shows to them at once.</p></div>`;
    if (S.status === 'pending') return `<div class="ed-card"><h2>In review</h2><p>Open Studio is looking at your page and will write here if anything should change. You can go on editing.</p><div class="ed-actions"><button class="btn g" data-st="draft">Take it back</button></div></div>`;
    if (S.status === 'hidden') return `<div class="ed-card"><h2>Your page isn’t shown at the moment</h2><p>${esc(S.note || '')}</p></div>`;
    const head = S.status === 'changes' ? `<h2>Open Studio asks for a few changes</h2><p>${esc(S.note || '')}</p>` : left ? `<h2>${left === 3 ? '3 things' : left === 1 ? '1 thing' : `${left} things`} before your page can go live</h2>` : '<h2>Your page is ready</h2><p>Open Studio looks at every new page before it goes live.</p>';
    return `<div class="ed-card">${head}<ul class="ed-todo">${t.map(([k, label, ok]) => `<li class="${ok ? 'done' : ''}"><button type="button" data-todo="${k}"><span class="c">${ok ? '✓' : ''}</span><span>${esc(label)}</span><span aria-hidden="true">${ok ? '' : '→'}</span></button></li>`).join('')}</ul>
      ${ready() ? `<div class="ed-actions"><button class="btn f" data-st="pending">${S.status === 'changes' ? 'Send again' : 'Send for review'}</button></div>` : ''}
      ${S.cloud ? '' : '<p class="small">This is a pretend studio: nothing is sent.</p>'}</div>`;
  };

  const roomsCard = () => {
    const v = (S.virtual || []).find(x => x.onview), n = (S.virtual || []).length;
    return `<div class="ed-card"><a class="ed-room" href="#/studio/onview"><b>${v ? `On View: ${esc(v.title || 'Untitled')}` : 'On View'}</b><span>${v ? (v.status === 'published' ? 'Shown first on your page.' : 'Not published yet.') : 'Hang what matters to you now in a 3D room. It shows first on your page.'}</span></a>
      <a class="ed-room" href="#/studio/exhibitions"><b>Exhibitions and 3D tours</b><span>${S.exhibitions.length} ${S.exhibitions.length === 1 ? 'exhibition' : 'exhibitions'}${n ? ` · ${n} virtual` : ''}. Walkable tours, photos, rooms.</span></a></div>`;
  };

  // --- drawing -------------------------------------------------------------------------------------------------
  const bar = () => `<div class="ed-bar"><a class="ed-back" href="#/" aria-label="Back to Open Studio">←</a>
    <div class="ed-seg" role="group" aria-label="Mode"><button type="button" data-mode="edit" aria-pressed="${mode() === 'edit'}">Edit</button><button type="button" data-mode="view" aria-pressed="${mode() === 'view'}">View</button></div>
    <span class="ed-chip ${state()[1]}" id="edChip">${state()[0]}</span></div>`;
  const chip = (t, cls) => { const e = app.querySelector('#edChip'); if (e) { e.textContent = t || state()[0]; e.className = 'ed-chip ' + (t ? '' : state()[1]); } };

  function draw() {
    const y = scrollY;
    a = tools.ownPage(S);
    app.innerHTML = bar() + tools.artistPage(a) + (mode() === 'edit' ? '<button type="button" class="ed-fab" id="edAdd"><b>+</b> Add</button>' : '');
    tools.wire();
    app.querySelector('.ed-bar').querySelectorAll('[data-mode]').forEach(b => b.onclick = () => { setMode(b.dataset.mode); draw(); scrollTo(0, 0); });
    if (mode() === 'edit') decorate(); else app.classList.remove('ed');
    scrollTo(0, y);
  }
  const commit = () => { chip('Saving…'); Promise.resolve(save()).then(() => chip(), () => chip()); };
  const refreshCard = () => { const c0 = app.querySelector('#edCard'); if (c0) { c0.innerHTML = card(); wireCard(); } };

  function decorate() {
    app.classList.add('ed');
    const hero = app.querySelector('.hero'), wrap = app.querySelector('.hero ~ .wrap');
    // the portrait: a round button on the hero; tap it for a new one
    const av = document.createElement('button'); av.type = 'button'; av.className = 'ed-av'; av.dataset.ed = 'portrait'; av.setAttribute('aria-label', 'Change your portrait');
    av.innerHTML = S.artist.photo ? `<img src="${esc(S.artist.photo)}" alt=""><i>Portrait</i>` : 'Add your<br>portrait';
    hero.append(av);
    const ov = hero.querySelector('.ov .wrap'); ov.setAttribute('role', 'button'); ov.tabIndex = 0; ov.dataset.ed = 'profile';
    ov.querySelector('h1').insertAdjacentHTML('beforeend', '<span class="ed-pen" aria-hidden="true">✎</span>');
    // the follow row isn't for your own page
    const top = wrap.querySelector('.btns'); if (top) top.remove();
    // the statement, written in place
    const st = wrap.querySelector('.statement');
    st.contentEditable = 'plaintext-only'; if (st.contentEditable !== 'plaintext-only') st.contentEditable = 'true';
    st.dataset.ph = 'Tap here and write a few sentences, in your own voice: what you make and why.';
    st.textContent = S.artist.statement || '';
    st.onblur = () => { const v = st.innerText.trim(); st.textContent = v; if (v !== (S.artist.statement || '')) { S.artist.statement = v; commit(); refreshCard(); } };
    st.insertAdjacentHTML('beforebegin', '<div id="edCard"></div>'); wrap.querySelector('#edCard').innerHTML = card(); wireCard();
    // the works: all of them, each a tap away from its sheet, each with a grip to drag
    const list = wrap.querySelector('[data-more-list]'), sec = list && list.closest('.sec');
    if (sec) {
      sec.querySelector('.sec-h .more').outerHTML = `<span class="more">${S.works.length}</span>`;
      const mb = sec.querySelector('[data-more]'); if (mb) mb.remove();
      list.insertAdjacentHTML('beforebegin', '<button type="button" class="ed-sec-add" data-ed="work-new">+ Add a work</button>');
      list.querySelectorAll('a.row').forEach(r => { r.hidden = false; r.dataset.slug = r.getAttribute('href').slice(7); });
      if (!S.works.length) list.insertAdjacentHTML('afterend', '<p class="m">No works yet. Bring them in from your website, Instagram or Drive, or add one by hand.</p>');
      wireGrips(list);
    }
    // the exhibitions
    let covers = wrap.querySelector('.covers');
    if (!covers) { (sec || wrap).insertAdjacentHTML(sec ? 'afterend' : 'beforeend', '<section class="sec"><div class="sec-h"><h2>Exhibitions</h2><span class="more">0</span></div><div class="covers"></div></section>'); covers = wrap.querySelector('.covers'); }
    covers.closest('.sec').insertAdjacentHTML('beforeend', '<button type="button" class="ed-sec-add" data-ed="ex-new" style="margin-top:14px">+ Add an exhibition</button>');
    covers.querySelectorAll('a').forEach(x => { x.dataset.slug = x.getAttribute('href').slice(13); });
    // the About page: the bio and the CV
    wrap.insertAdjacentHTML('beforeend', `<section class="sec"><div class="sec-h"><h2>About</h2><span class="more">on your About page</span></div>
      <div class="prose"><p id="edBio" contenteditable="plaintext-only" data-ph="Studies, shows, residencies: your story, as you would tell it."></p></div></section>
      <section class="sec"><div class="sec-h"><h2>CV</h2><button type="button" class="more" data-ed="cv">${(S.artist.cv || []).length ? 'Edit' : 'Add'}</button></div>
      ${(S.artist.cv || []).length ? `<div class="cv">${cvHtml(S.artist.cv)}</div>` : '<p class="m">Education, exhibitions, awards. Add the lines you would put on a CV.</p>'}</section>
      ${roomsCard()}
      <div class="ed-foot"><button type="button" class="more" id="edSo">Sign out</button></div>`);
    const bio = wrap.querySelector('#edBio'); bio.textContent = S.artist.bio || '';
    bio.onblur = () => { const v = bio.innerText.trim(); if (v !== (S.artist.bio || '')) { S.artist.bio = v; commit(); } };
    wrap.querySelector('#edSo').onclick = () => c.signOut();
    app.querySelector('#edAdd').onclick = addSheet;
    // taps
    app.onclick = onTap;
  }
  const cvHtml = cv => [...new Set(cv.map(l => l.group || ''))].map(g => `<section class="cv-g">${g ? `<h3>${esc(g)}</h3>` : ''}<dl>${cv.filter(l => (l.group || '') === g).map(l => `<div><dt>${esc(l.year)}</dt><dd>${esc(l.title)}${l.venue ? `<span>${esc(l.venue)}</span>` : ''}</dd></div>`).join('')}</dl></section>`).join('');

  function wireCard() {
    app.querySelectorAll('[data-todo]').forEach(b => b.onclick = () => {
      const k = b.dataset.todo;
      if (k === 'portrait') pickPortrait();
      else if (k === 'statement') { const s = app.querySelector('.statement'); s.scrollIntoView({ block: 'center', behavior: 'smooth' }); setTimeout(() => s.focus(), 350); }
      else addSheet(true);
    });
    app.querySelectorAll('[data-st]').forEach(b => b.onclick = async () => {
      b.disabled = true;
      try {
        if (S.cloud) { const d = await (await c.cloud()).setStatus(b.dataset.st); S.status = d.status; S.note = d.note || ''; } else S.status = b.dataset.st;
        draw(); toast(b.dataset.st === 'pending' ? 'Sent. We’ll write here if anything should change.' : 'Back in your drafts.');
      } catch (e) { b.disabled = false; toast(e.message); }
    });
  }

  // --- taps on the page ------------------------------------------------------------------------------------------
  function onTap(e) {
    const t = e.target;
    if (t.closest('[contenteditable]')) return;
    const ed = t.closest('[data-ed]'), row = t.closest('a.row[data-slug]'), cv = t.closest('.covers a[data-slug]');
    if (t.closest('.row > span:last-child')) { e.preventDefault(); return; }
    if (ed) { e.preventDefault(); ({ portrait: pickPortrait, profile: profileSheet, 'work-new': () => workSheet(null), 'ex-new': () => exSheet(null), cv: cvSheet })[ed.dataset.ed](); return; }
    if (row) { e.preventDefault(); const w = a && tools_work(row.dataset.slug); if (w) workSheet(w.id); return; }
    if (cv) { e.preventDefault(); const x = tools_ex(cv.dataset.slug); if (x) exSheet(x.id); return; }
    if (t.closest('.hero ~ .wrap a[href^="#/work/"],.hero ~ .wrap a[href^="#/exhibition/"],.ov-now a')) e.preventDefault();
  }
  const tools_work = slug => { const w = c.M.works.find(x => x.slug === slug); return w && S.works.find(x => x.id === w.id); };
  const tools_ex = slug => { const x = c.M.exhibitions.find(y => y.slug === slug); return x && S.exhibitions.find(y => y.id === x.id); };

  function pickPortrait() {
    const f = document.createElement('input'); f.type = 'file'; f.accept = 'image/*';
    f.onchange = async () => { if (!f.files[0]) return; S.artist.photo = await asDataURL(f.files[0], 800); commit(); draw(); };
    f.click();
  }

  // --- reordering: drag a work by its grip -----------------------------------------------------------------------
  function wireGrips(list) {
    list.querySelectorAll('a.row').forEach(r => {
      const g = r.lastElementChild;
      g.onpointerdown = ev => {
        ev.preventDefault(); g.setPointerCapture(ev.pointerId); r.classList.add('drag');
        const move = m => {
          const rows = [...list.querySelectorAll('a.row')];
          const over = rows.find(o => o !== r && m.clientY > o.getBoundingClientRect().top && m.clientY < o.getBoundingClientRect().bottom);
          if (over) { const after = rows.indexOf(over) > rows.indexOf(r); list.insertBefore(r, after ? over.nextSibling : over); }
          const box = list.getBoundingClientRect(); if (m.clientY > innerHeight - 70) scrollBy(0, 12); else if (m.clientY < 110) scrollBy(0, -12);
        };
        const up = () => {
          g.removeEventListener('pointermove', move); g.removeEventListener('pointerup', up); g.removeEventListener('pointercancel', up); r.classList.remove('drag');
          const order = [...list.querySelectorAll('a.row')].map(x => (tools_work(x.dataset.slug) || {}).id);
          const at = new Map(order.map((id, i) => [id, i]));
          S.works.sort((p, q) => (at.has(p.id) ? at.get(p.id) : 1e9) - (at.has(q.id) ? at.get(q.id) : 1e9));
          commit();
        };
        g.addEventListener('pointermove', move); g.addEventListener('pointerup', up); g.addEventListener('pointercancel', up);
      };
    });
  }

  // --- sheets ---------------------------------------------------------------------------------------------------
  function sheet(title, html, wireIt) {
    const el = document.createElement('div'); el.className = 'sh-back';
    el.innerHTML = `<div class="sh" role="dialog" aria-modal="true" aria-label="${esc(title)}"><div class="sh-h"><b>${esc(title)}</b><button type="button" class="sh-x" aria-label="Close">×</button></div><div class="sh-b">${html}</div></div>`;
    document.body.append(el); document.body.classList.add('sh-open');
    const close = () => { el.remove(); document.body.classList.remove('sh-open'); document.removeEventListener('keydown', key); };
    const key = e => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', key);
    el.onclick = e => { if (e.target === el) close(); };
    el.querySelector('.sh-x').onclick = close;
    wireIt(el.querySelector('.sh-b'), close);
    return close;
  }

  function addSheet(forWorks) {
    const opt = (k, t, d) => `<button type="button" class="sh-opt" data-k="${k}"><b>${t}</b><span>${d}</span></button>`;
    sheet(forWorks === true ? 'Add your works' : 'Add to your page', `${opt('import', 'Bring work in', 'From your website, Instagram, Google Drive or your phone: many at once.')}
      ${opt('work', 'Add one work', 'A photo, a title and its size.')}
      ${opt('ex', 'Add an exhibition', 'A show you were in, with its text, dates and photos.')}
      ${opt('rooms', '3D rooms and tours', 'On View, virtual exhibitions, walkable tours of your shows.')}`, (b, close) => {
      b.querySelectorAll('.sh-opt').forEach(o => o.onclick = () => {
        const k = o.dataset.k; close();
        if (k === 'import') go('#/studio/import'); else if (k === 'work') workSheet(null); else if (k === 'ex') exSheet(null); else go('#/studio/exhibitions');
      });
    });
  }

  function profileSheet() {
    const p = S.artist;
    sheet('About you', `<form class="st-form"><label>Name<input name="name" required value="${esc(p.name)}"></label>
      <div class="st-row"><label>You make<input name="discipline" placeholder="Painter" value="${esc(p.discipline)}"></label><label>City<input name="city" value="${esc(p.city)}"></label></div>
      <div class="st-row"><label>Instagram<input name="instagram" autocapitalize="off" placeholder="@yourname" value="${esc(p.instagram)}"></label><label>Website<input name="link" type="url" inputmode="url" placeholder="https://" value="${esc(p.link)}"></label></div>
      <div class="btns"><button class="btn f" type="submit">Done</button></div></form>`, (b, close) => {
      const f = b.querySelector('form');
      f.onsubmit = e => { e.preventDefault(); const d = new FormData(f); Object.assign(S.artist, { name: d.get('name').trim() || p.name, discipline: d.get('discipline').trim(), city: d.get('city').trim(), instagram: d.get('instagram').trim(), link: d.get('link').trim() }); commit(); close(); draw(); };
    });
  }

  function workSheet(id) {
    const old = id ? S.works.find(x => x.id === id) : null;
    const w = old || { title: '', year: String(new Date().getFullYear()), medium: '', width: '', height: '', depth: '', framed: 'no', image: '', check: null };
    sheet(old ? 'Work' : 'Add a work', `<form class="st-form">
      <label class="st-drop"><input type="file" accept="image/jpeg,image/png,image/heic,image/webp" name="file" hidden>
        <img src="${esc(w.thumb || w.image || '')}" alt="" ${w.thumb || w.image ? '' : 'hidden'}><span ${w.thumb || w.image ? 'hidden' : ''}>Choose the work’s photo<br><small>Straight on, the whole work, in even light.</small></span></label>
      <div class="chk">${old ? checks(verdict(w.check, w)) : ''}</div>
      <label>Title<input name="title" required value="${esc(w.title)}"></label>
      <div class="st-row"><label>Year<input name="year" inputmode="numeric" value="${esc(w.year)}"></label><label>Medium<input name="medium" placeholder="Oil on canvas" value="${esc(w.medium)}"></label></div>
      <fieldset><legend>Size, in cm</legend><div class="st-row three"><label>Width<input name="width" inputmode="decimal" value="${esc(w.width)}"></label><label>Height<input name="height" inputmode="decimal" value="${esc(w.height)}"></label><label>Depth<input name="depth" inputmode="decimal" placeholder="3.5" value="${esc(w.depth)}"></label></div></fieldset>
      <p class="err m small" role="alert"></p>
      <div class="btns"><button class="btn f" type="submit">${old ? 'Save' : 'Add to my page'}</button>${old ? '<button class="btn g" type="button" data-del>Delete</button>' : ''}</div></form>`, (b, close) => {
      const f = b.querySelector('form'), img = f.querySelector('.st-drop img'), hint = f.querySelector('.st-drop span'), chk = f.querySelector('.chk');
      let pending = null;
      const size = () => ({ width: +f.width.value, height: +f.height.value });
      const refresh = () => { if (pending || old) chk.innerHTML = checks(verdict(pending ? pending.check : w.check, size())); };
      f.file.onchange = async () => {
        if (!f.file.files[0]) return; chk.innerHTML = '<p class="m small">Checking the image…</p>';
        try {
          const m = await checkImage(f.file.files[0]);
          const d = await asDataURL(f.file.files[0]);
          pending = { check: { W: m.W, H: m.H, long: m.long, mean: m.mean, clipped: m.clipped, sharp: m.sharp, backdrop: m.backdrop }, thumb: d, image: d };
          img.src = d; img.hidden = false; hint.hidden = true;
          if (!f.title.value) f.title.value = String(f.file.files[0].name || '').replace(/\.[a-z0-9]+$/i, '').replace(/[-_]+/g, ' ').trim();
        } catch { chk.innerHTML = checks([['no', 'This file couldn’t be read as an image.']]); return; }
        refresh();
      };
      f.width.oninput = f.height.oninput = refresh;
      f.onsubmit = e => {
        e.preventDefault();
        if (!old && !pending) { f.querySelector('.err').textContent = 'Choose the work’s photo first.'; return; }
        const d = new FormData(f), n = { ...w, id: old ? old.id : uid(), title: d.get('title').trim(), year: d.get('year'), medium: d.get('medium'), width: +d.get('width') || '', height: +d.get('height') || '', depth: +d.get('depth') || '', ...(pending || {}) };
        if (old) Object.assign(old, n); else S.works.unshift(n);
        commit(); close(); draw();
      };
      const del = f.querySelector('[data-del]');
      if (del) del.onclick = () => {
        if (!confirm('Delete this work?')) return;
        S.works = S.works.filter(x => x.id !== old.id); S.exhibitions.forEach(x => { x.works = (x.works || []).filter(i => i !== old.id); });
        (S.virtual || []).forEach(v => { v.works = v.works.filter(i => i !== old.id); }); commit(); close(); draw();
      };
    });
  }

  function exSheet(id) {
    const old = id ? S.exhibitions.find(x => x.id === id) : null;
    const x = old || { title: '', venue: '', city: '', dates: '', text: '' };
    sheet(old ? 'Exhibition' : 'Add an exhibition', `<form class="st-form">
      <label>Title<input name="title" required value="${esc(x.title)}"></label>
      <div class="st-row"><label>Venue<input name="venue" value="${esc(x.venue)}"></label><label>City<input name="city" value="${esc(x.city)}"></label></div>
      <label>Dates<input name="dates" placeholder="21 Feb — 30 May, 2026" value="${esc(x.dates)}"></label>
      <label>About the exhibition<textarea name="text" rows="4">${esc(x.text)}</textarea></label>
      <div class="btns"><button class="btn f" type="submit">${old ? 'Save' : 'Add to my page'}</button>${old ? '<button class="btn g" type="button" data-del>Delete</button>' : ''}</div>
      ${old ? `<a class="sh-opt" href="#/studio/exhibition/${esc(old.id)}"><b>Photos, works and walkable tour</b><span>Installation photos, which works were in it, and a 3D tour of the show.</span></a>` : '<p class="m small">After adding it you can give it installation photos, say which works were in it, and ask for a walkable tour.</p>'}</form>`, (b, close) => {
      const f = b.querySelector('form');
      f.onsubmit = e => {
        e.preventDefault();
        const d = new FormData(f), dates = d.get('dates'), data = { title: d.get('title').trim() || 'Untitled exhibition', venue: d.get('venue'), city: d.get('city'), dates, text: d.get('text'), year: (dates.match(/\d{4}/) || [x.year || String(new Date().getFullYear())])[0] };
        if (old) Object.assign(old, data); else S.exhibitions.unshift({ id: uid(), tour: 'none', works: [], photos: [], video: '', ...data });
        commit(); close(); draw();
      };
      const del = f.querySelector('[data-del]');
      if (del) del.onclick = () => { if (!confirm('Delete this exhibition?')) return; S.exhibitions = S.exhibitions.filter(y => y.id !== old.id); commit(); close(); draw(); };
      f.querySelectorAll('a.sh-opt').forEach(l => l.onclick = () => close());
    });
  }

  function cvSheet() {
    const rows = (S.artist.cv || []).map(l => ({ ...l }));
    const line = (l, i) => `<div class="sh-cv" data-i="${i}"><div class="st-row" style="grid-template-columns:90px 1fr"><input name="year" inputmode="numeric" placeholder="Year" aria-label="Year" value="${esc(l.year)}"><input name="title" placeholder="What" aria-label="What" value="${esc(l.title)}"></div>
      <div class="st-row"><input name="venue" placeholder="Where" aria-label="Where" value="${esc(l.venue)}"><input name="group" placeholder="Section: Education, Solo exhibitions…" aria-label="Section" list="cvGroups" value="${esc(l.group)}"></div><button type="button" data-rm>Remove</button></div>`;
    sheet('Your CV', `<form class="st-form"><datalist id="cvGroups">${['Education', 'Solo exhibitions', 'Group exhibitions', 'Awards', 'Residencies'].map(g => `<option value="${g}">`).join('')}</datalist><div id="cvRows"></div>
      <button type="button" class="ed-sec-add" data-add>+ Add a line</button><div class="btns"><button class="btn f" type="submit">Done</button></div></form>`, (b, close) => {
      const box = b.querySelector('#cvRows');
      const read = () => [...box.querySelectorAll('.sh-cv')].map(r => ({ year: r.querySelector('[name=year]').value.trim(), title: r.querySelector('[name=title]').value.trim(), venue: r.querySelector('[name=venue]').value.trim(), group: r.querySelector('[name=group]').value.trim() }));
      const draw2 = list => { box.innerHTML = list.map(line).join(''); box.querySelectorAll('[data-rm]').forEach(x => x.onclick = () => { const cur = read(); cur.splice(+x.closest('.sh-cv').dataset.i, 1); draw2(cur); }); };
      draw2(rows.length ? rows : [{}]);
      b.querySelector('[data-add]').onclick = () => { const cur = read(); const last = cur[cur.length - 1]; cur.push({ group: last ? last.group : '' }); draw2(cur); box.lastElementChild.querySelector('[name=year]').focus(); };
      b.querySelector('form').onsubmit = e => { e.preventDefault(); S.artist.cv = read().filter(l => l.title || l.year); commit(); close(); draw(); };
    });
  }

  draw();
  if (act) ({ portrait: pickPortrait, profile: profileSheet, 'work-new': () => workSheet(null), 'ex-new': () => exSheet(null), 'works': () => app.querySelector('.ed-sec-add') && app.querySelector('.ed-sec-add').scrollIntoView() }[act.split(':')[0]] || (() => {}))();
  if (act && act.startsWith('work:')) workSheet(act.slice(5));
}
