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
.ed-seg button{min-height:44px;min-width:84px;border:0;border-radius:10px;background:none;font:700 16px var(--sans);color:var(--muted);cursor:pointer}
.ed-seg button[aria-pressed=true]{background:var(--ink);color:var(--wall)}
.ed-chip{font:700 13px var(--mono);letter-spacing:.06em;text-transform:uppercase;padding:6px 10px;border-radius:99px;background:var(--card);color:var(--muted);white-space:nowrap}
.ed-chip.ok{background:color-mix(in srgb,#2f7d4f 16%,transparent);color:#2f7d4f}.ed-chip.no{background:color-mix(in srgb,var(--dot) 14%,transparent);color:var(--dot)}
.ed .hero:not(:has(img)){min-height:300px;background:var(--card)}
.ed .hero>img{cursor:pointer}
.ed-cover{position:absolute;top:14px;right:14px;z-index:3;min-height:48px;padding:0 18px;border:2px solid var(--ink);border-radius:14px;background:#fff;color:var(--ink);font:700 16px var(--sans);display:flex;align-items:center;gap:8px;cursor:pointer;box-shadow:0 2px 12px rgba(0,0,0,.25)}
.ed .hero:not(:has(img)) .ed-cover{top:50%;right:50%;transform:translate(50%,-50%);min-height:56px;font-size:18px}
.ed-crop{position:relative;width:100%;aspect-ratio:3/4;max-height:46vh;overflow:hidden;background:var(--card);touch-action:none;cursor:grab;border:2px solid var(--edge)}
.ed-crop img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;pointer-events:none;user-select:none}
.ed-crop i{position:absolute;left:8px;bottom:8px;background:#fff;color:var(--ink);font:600 15px var(--sans);font-style:normal;padding:6px 10px;border-radius:8px}
.ed-pen{display:inline-block;margin-left:8px;font-size:15px;opacity:.7;vertical-align:middle}
.ed [contenteditable]{outline:0;border-radius:6px;cursor:text;min-height:1.2em;white-space:pre-wrap}
.ed .statement[contenteditable]{box-shadow:0 0 0 1.5px var(--line);padding:14px 12px;margin:22px -12px 0;max-width:none}
.ed [contenteditable]:focus{box-shadow:0 0 0 2px var(--ink)}
.ed [contenteditable]:empty::before{content:attr(data-ph);color:var(--muted);font-family:var(--sans);font-size:16px}
.ed-card{background:var(--paper);border:1px solid var(--line);border-radius:16px;padding:16px;display:grid;gap:10px;margin-top:18px}
.ed-card h2{font-family:var(--serif);font-size:24px;line-height:1.1;font-weight:500}
.ed-card p{margin:0;font-size:16px;color:var(--muted)}
.ed-card.live{background:color-mix(in srgb,#2f7d4f 12%,var(--paper))}
.ed-todo{display:grid;gap:2px;list-style:none;margin:0;padding:0}
.ed-todo button{display:grid;grid-template-columns:28px 1fr 16px;gap:10px;align-items:center;width:100%;min-height:48px;padding:6px 0;border:0;border-bottom:1px solid var(--line);background:none;text-align:left;font:inherit;font-size:16px;color:var(--ink);cursor:pointer}
.ed-todo li:last-child button{border-bottom:0}
.ed-todo .c{width:24px;height:24px;border-radius:50%;border:1.5px solid var(--muted);display:grid;place-items:center;font-size:13px;color:#fff}
.ed-todo .done .c{background:#2f7d4f;border-color:#2f7d4f}.ed-todo .done button{color:var(--muted)}
.ed-actions{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
.ed-sec-add{display:flex;align-items:center;justify-content:center;gap:6px;width:100%;min-height:52px;margin:0 0 6px;border:2px dashed var(--edge);border-radius:12px;background:none;font:700 16px var(--sans);color:var(--ink);cursor:pointer}
.ed-step{display:grid;grid-template-columns:34px 1fr;gap:10px;align-items:center;font:700 18px var(--sans);margin-top:6px}.ed-step span{width:34px;height:34px;border-radius:50%;background:var(--ink);color:var(--wall);display:grid;place-items:center;font-size:17px}
.ed-two{display:grid;gap:10px;margin-top:6px}
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
.sh-opt b{font-size:18px}.sh-opt span{grid-column:1;font-size:16px;color:var(--muted)}.sh-opt::after{content:"\\2192";grid-row:1/3;grid-column:2}
.sh-cv{display:grid;gap:8px;padding:10px 0;border-bottom:1px solid var(--line)}
.sh-cv .st-row{gap:8px}
.sh-cv button{justify-self:end;min-height:36px;border:0;background:none;color:var(--dot);font:600 13px var(--sans);cursor:pointer}
.sh .err{color:var(--dot)}
.ed-toast{font-size:16px!important;position:fixed;left:50%;bottom:calc(84px + env(safe-area-inset-bottom));transform:translateX(-50%);z-index:120;background:var(--ink);color:var(--wall);padding:10px 16px;border-radius:12px;font-size:14px;max-width:86vw}
body.sh-open{overflow:hidden}
.ed #works{scroll-margin-top:64px}
.ed button.more,.ed-foot .more{min-height:44px;padding-inline:10px;display:inline-flex;align-items:center;cursor:pointer}
.sh-cv button{min-height:44px!important;padding-inline:12px!important;font-size:15px!important}
.wk-hint{margin:0 0 6px;font-size:15px;color:var(--muted)}.wk-hint a{color:var(--ink);font-weight:600;display:inline-flex;align-items:center;min-height:44px;padding:0 6px}
.wk-g{margin-top:18px}.wk-g h3{font:500 26px/1.1 var(--serif);letter-spacing:0;text-transform:none;color:var(--ink);margin:0;padding:6px 0 8px;border-bottom:1px solid var(--ink)}
.wk{display:grid;grid-template-columns:96px 1fr 44px;gap:14px;align-items:center;min-height:98px;padding:12px 0;border-bottom:1px solid var(--line);cursor:pointer;position:relative;background:var(--wall);-webkit-tap-highlight-color:transparent}
.wk:active{background:var(--card)}.wk:focus-visible{outline:2px solid var(--ink);outline-offset:-2px}
.wk-im{position:relative;width:96px;height:74px;box-sizing:border-box;padding:6px;background:var(--card);border-radius:3px;overflow:hidden;display:grid;place-items:center;box-shadow:inset 0 0 0 1px rgba(27,26,23,.08)}
.wk-im img{max-width:100%;max-height:100%;width:auto;height:auto;object-fit:contain;display:block;box-shadow:0 1px 4px rgba(27,26,23,.28)}
.wk-spin{position:absolute;inset:0;background:rgba(251,250,246,.62)}.wk-spin::after{content:"";position:absolute;inset:26px;border:3px solid var(--line);border-top-color:var(--ink);border-radius:50%;animation:wk-r .8s linear infinite}
@keyframes wk-r{to{transform:rotate(1turn)}}
.wk-t{display:grid;gap:3px;min-width:0}.wk-t b{font:500 19px/1.2 var(--serif);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.wk-t>span{font-size:15px;color:var(--muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.wk-t em{font-style:normal;font-size:14px;font-weight:600;color:#7A4300}.wk-t em.up{color:var(--muted)}
.wk-grip{width:44px;height:56px;border:0;background:none;color:var(--muted);touch-action:none;cursor:grab;font-size:22px;letter-spacing:-2px;padding:0}.wk-grip::before{content:"\\2807\\2807"}
.wk-grip:focus-visible{outline:2px solid var(--ink);border-radius:8px}
.wk.drag{background:var(--card);box-shadow:0 6px 24px rgba(0,0,0,.2);z-index:5}
.wk-empty{display:grid;gap:12px;justify-items:start;padding:8px 0 4px}.wk-empty b{font:500 22px var(--serif)}.wk-empty p{margin:0;font-size:16px;color:var(--muted)}
.sh-f{display:flex;gap:10px;padding:10px 20px calc(12px + env(safe-area-inset-bottom));border-top:1px solid var(--line);background:var(--wall)}
.sh-f .btn{flex:1;justify-content:center;min-height:52px;font-size:16px}.sh-f .btn.danger{flex:0 0 auto;color:#B3261E;border-color:#B3261E;padding-inline:20px}
.sh-b .btn.wide{width:100%}
.ad-list{display:grid;gap:12px}.ad-card{display:grid;grid-template-columns:84px 1fr 44px;gap:12px;align-items:start;padding-bottom:12px;border-bottom:1px solid var(--line)}
.ad-card.one{grid-template-columns:1fr;border-bottom:0}.ad-card.one .ad-im{height:min(36vh,280px)}
.ad-im{position:relative;height:84px;box-sizing:border-box;padding:6px;background:var(--card);border-radius:3px;overflow:hidden;display:grid;place-items:center;box-shadow:inset 0 0 0 1px rgba(27,26,23,.08)}.ad-im img{max-width:100%;max-height:100%;width:auto;height:auto;object-fit:contain;display:block;box-shadow:0 1px 4px rgba(27,26,23,.28)}
.ad-wait{font-style:normal;font-size:14px;color:var(--muted);padding:4px;text-align:center}
.ad-f{display:grid;gap:8px;min-width:0}.ad-sz{display:grid;grid-template-columns:1fr auto 1fr auto;gap:8px;align-items:center;color:var(--muted)}
.ad-same,.ad-rm{background:none;border:0;color:var(--ink);font:600 15px var(--sans);cursor:pointer;min-height:44px;text-align:left;padding:0;text-decoration:underline}
.ad-rm{font-size:26px;text-decoration:none;width:44px;text-align:center;color:var(--muted)}
.ad-err{margin:0;color:#B3261E;font-size:15px}
.ad-all{display:grid;gap:12px;padding-top:6px}.ad-h{margin:0;font:700 13px var(--mono);letter-spacing:.08em;text-transform:uppercase;color:var(--muted)}
.st-row.yr{grid-template-columns:110px 1fr}
.kd{border:0!important;padding:0!important}.kd legend{padding:0 0 6px!important}
.kd-row{display:flex;gap:8px;overflow-x:auto;padding-bottom:4px;margin-inline:-20px;padding-inline:20px;scrollbar-width:none}.kd-row::-webkit-scrollbar{display:none}
.kd-c{position:relative;flex:none}.kd-c input{position:absolute;opacity:0;inset:0;width:100%;height:100%;margin:0}
.kd-c span{display:inline-flex;align-items:center;min-height:44px;padding:0 16px;border-radius:99px;border:1.5px solid var(--edge);font:600 16px var(--sans);color:var(--ink);background:var(--paper)}
.kd-c input:checked+span{background:var(--ink);color:var(--wall);border-color:var(--ink)}.kd-c input:focus-visible+span{outline:3px solid var(--dot);outline-offset:2px}
.wk-prev{display:grid;grid-template-columns:132px auto;gap:14px;align-items:center;justify-items:start}.wk-pv{width:132px;height:132px;box-sizing:border-box;padding:6px;background:var(--card);border-radius:3px;overflow:hidden;display:grid;place-items:center;box-shadow:inset 0 0 0 1px rgba(27,26,23,.08)}.wk-pv img{max-width:100%;max-height:100%;width:auto;height:auto;object-fit:contain;display:block;box-shadow:0 1px 4px rgba(27,26,23,.28)}
.ed-toast{display:flex;gap:14px;align-items:center}.ed-toast button{min-height:44px;padding:0 6px;background:none;border:0;color:var(--wall);font:700 16px var(--sans);text-decoration:underline;cursor:pointer}
`;
const hook = () => { if (!document.getElementById('edCss')) { const s = document.createElement('style'); s.id = 'edCss'; s.textContent = CSS; document.head.append(s); } };

export function mount(c) {
  const { app, S, tools, h, save, go, act } = c;
  const { esc, uid, asDataURL, checkImage, verdict, checks } = h;
  hook();
  let a = null;                                           // the page's artist as the app builds it

  const toast = (t, undo) => {
    document.querySelectorAll('.ed-toast').forEach(x => x.remove());
    const e = document.createElement('div'); e.className = 'ed-toast'; e.setAttribute('role', 'status'); const m = document.createElement('span'); m.textContent = t; e.append(m);
    if (undo) { const b = document.createElement('button'); b.type = 'button'; b.textContent = 'Undo'; b.onclick = () => { e.remove(); undo(); }; e.append(b); }
    document.body.append(e); setTimeout(() => e.remove(), undo ? 8000 : 3200);
  };
  // a photo on its way to the account: the row says so, and says when it is there (or that it failed)
  const onUp = ev => { if (ev.detail && ev.detail.state !== 'uploading') drawWorks(); };
  window.removeEventListener('studio-upload', window.__edUp); window.__edUp = onUp; window.addEventListener('studio-upload', onUp);
  window.removeEventListener('studio-save-failed', window.__edRow); window.__edRow = () => drawWorks(); window.addEventListener('studio-save-failed', window.__edRow);
  window.onbeforeunload = () => S.works.some(pending) ? 'Photos are still uploading.' : undefined;
  const onFail = ev => toast(`Couldn’t save: ${ev.detail}`);
  window.removeEventListener('studio-save-failed', window.__edFail); window.__edFail = onFail; window.addEventListener('studio-save-failed', onFail);

  // --- the state of the page, in one chip ------------------------------------------------------------------
  const STATE = { approved: ['Live', 'ok'], pending: ['In review', ''], changes: ['Changes asked', 'no'], hidden: ['Hidden', 'no'], draft: ['Draft', ''] };
  const state = () => STATE[S.status] || STATE.draft;
  const things = () => [
    ['cover', 'Add your cover photo', !!(S.artist.hero || S.artist.photo)],
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
    app.innerHTML = bar() + tools.artistPage(a) + (mode() === 'edit' ? '<button type="button" class="ed-fab" id="edAdd"><b>+</b> Add works</button>' : '');
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
    // the cover: the first image people see. Tap it (or the button) to replace it or move what shows
    const cb = document.createElement('button'); cb.type = 'button'; cb.className = 'ed-cover'; cb.dataset.ed = 'cover';
    cb.innerHTML = hero.querySelector('img') ? '✎ Change cover photo' : '+ Add a cover photo'; hero.append(cb);
    const hi = hero.querySelector('img'); if (hi) hi.dataset.ed = 'cover';
    const ov = hero.querySelector('.ov .wrap'); ov.setAttribute('role', 'button'); ov.tabIndex = 0; ov.dataset.ed = 'profile';
    ov.querySelector('h1').insertAdjacentHTML('beforeend', '<span class="ed-pen" aria-hidden="true">✎</span>');
    // the follow row isn't for your own page
    const top = wrap.querySelector('.btns'); if (top) top.remove();
    // the statement, written in place
    const st = wrap.querySelector('.statement');
    st.contentEditable = 'plaintext-only'; if (st.contentEditable !== 'plaintext-only') st.contentEditable = 'true';
    st.dataset.ph = 'Tap here and write a few sentences, in your own voice: what you make and why.';
    st.textContent = S.artist.statement || '';
    st.setAttribute('role', 'textbox'); st.setAttribute('aria-multiline', 'true'); st.setAttribute('aria-label', 'Your statement: a few sentences about your work');
    st.onblur = () => { const v = st.innerText.trim(); st.textContent = v; if (v !== (S.artist.statement || '')) { S.artist.statement = v; commit(); refreshCard(); } };
    st.insertAdjacentHTML('beforebegin', '<div id="edCard"></div>'); wrap.querySelector('#edCard').innerHTML = card(); wireCard();
    // the works: a list of their own (every work, by year; tap to edit, grip to reorder)
    let sec = wrap.querySelector('#works');
    if (!sec) { wrap.querySelector('.statement').closest('.wrap').insertAdjacentHTML('beforeend', '<section class="sec" id="works"></section>'); sec = wrap.querySelector('#works'); }
    sec.innerHTML = worksInner(); wireGrips(sec);
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
    bio.setAttribute('role', 'textbox'); bio.setAttribute('aria-multiline', 'true'); bio.setAttribute('aria-label', 'Your story, for the About page');
    bio.onblur = () => { const v = bio.innerText.trim(); if (v !== (S.artist.bio || '')) { S.artist.bio = v; commit(); } };
    wrap.querySelector('#edSo').onclick = () => c.signOut();
    app.querySelector('#edAdd').onclick = () => pickPhotos();
    // taps
    app.onclick = onTap;
    app.onkeydown = e => { const r = e.target.classList && e.target.classList.contains('wk') ? e.target : null; if (r && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); workSheet(r.dataset.id); } };
  }
  const cvHtml = cv => [...new Set(cv.map(l => l.group || ''))].map(g => `<section class="cv-g">${g ? `<h3>${esc(g)}</h3>` : ''}<dl>${cv.filter(l => (l.group || '') === g).map(l => `<div><dt>${esc(l.year)}</dt><dd>${esc(l.title)}${l.venue ? `<span>${esc(l.venue)}</span>` : ''}</dd></div>`).join('')}</dl></section>`).join('');

  function wireCard() {
    app.querySelectorAll('[data-todo]').forEach(b => b.onclick = () => {
      const k = b.dataset.todo;
      if (k === 'cover') coverSheet();
      else if (k === 'statement') { const s = app.querySelector('.statement'); s.scrollIntoView({ block: 'center', behavior: 'smooth' }); setTimeout(() => s.focus(), 350); }
      else pickPhotos();
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
    if (ed) { e.preventDefault(); ({ cover: coverSheet, profile: profileSheet, 'work-new': () => pickPhotos(), 'ex-new': () => go('#/studio/exhibition/new'), cv: cvSheet })[ed.dataset.ed](); return; }
    const wk = t.closest('.wk');
    if (wk) { if (!t.closest('.wk-grip')) workSheet(wk.dataset.id); return; }
    if (t.closest('[data-pick]')) { e.preventDefault(); pickPhotos(); return; }
    if (cv) { e.preventDefault(); const x = tools_ex(cv.dataset.slug); if (x) go('#/studio/exhibition/' + x.id); return; }
    if (t.closest('.hero ~ .wrap a[href^="#/work/"],.hero ~ .wrap a[href^="#/exhibition/"],.ov-now a')) e.preventDefault();
  }
  const tools_work = slug => { const w = c.M.works.find(x => x.slug === slug); return w && S.works.find(x => x.id === w.id); };
  const tools_ex = slug => { const x = c.M.exhibitions.find(y => y.slug === slug); return x && S.exhibitions.find(y => y.id === x.id); };

  // the cover: the page's first image. Replace it, and drag it to choose what shows (a focal point, never a crop of the file)
  function coverSheet() {
    const hi = app.querySelector('.hero img');
    let cur = hi ? (hi.currentSrc || hi.src) : '', pos = S.artist.heroPos || '50% 50%', changed = false;
    sheet('Cover photo', `<p class="m">This is the first picture people see on your page.${cur ? ' Drag it to choose what shows.' : ''}</p>
      <div class="ed-crop" id="crop">${cur ? `<img src="${esc(cur)}" alt="Your cover photo" style="object-position:${esc(pos)}"><i>Drag to move</i>` : '<i>No cover photo yet</i>'}</div>
      <input type="file" accept="image/*" hidden id="coverFile">
      <div class="ed-two"><button type="button" class="btn f" data-pick>${cur ? 'Replace photo' : 'Choose a photo'}</button><button type="button" class="btn g" data-done>Done</button></div>`, (b, close) => {
      const box = b.querySelector('#crop'), f = b.querySelector('#coverFile');
      const xy = () => pos.split(' ').map(v => parseFloat(v));
      box.onpointerdown = ev => {
        const im = box.querySelector('img'); if (!im || !im.naturalWidth) return;
        const r = box.getBoundingClientRect(), k = Math.max(r.width / im.naturalWidth, r.height / im.naturalHeight);
        const ox = im.naturalWidth * k - r.width, oy = im.naturalHeight * k - r.height, [x0, y0] = xy(), sx = ev.clientX, sy = ev.clientY;
        box.setPointerCapture(ev.pointerId);
        const mv = m => {
          const nx = ox > 1 ? Math.min(100, Math.max(0, x0 - (m.clientX - sx) / ox * 100)) : x0, ny = oy > 1 ? Math.min(100, Math.max(0, y0 - (m.clientY - sy) / oy * 100)) : y0;
          pos = `${nx.toFixed(1)}% ${ny.toFixed(1)}%`; im.style.objectPosition = pos; changed = true;
        };
        const up = () => { box.removeEventListener('pointermove', mv); box.removeEventListener('pointerup', up); box.removeEventListener('pointercancel', up); };
        box.addEventListener('pointermove', mv); box.addEventListener('pointerup', up); box.addEventListener('pointercancel', up);
      };
      b.querySelector('[data-pick]').onclick = () => f.click();
      f.onchange = async () => {
        if (!f.files[0]) return;
        const [big, small] = await Promise.all([asDataURL(f.files[0], 1600), asDataURL(f.files[0], 400)]);
        S.artist.hero = big; S.artist.photo = small; S.artist.heroPos = ''; pos = '50% 50%'; cur = big; changed = false;
        box.innerHTML = `<img src="${esc(big)}" alt="Your cover photo"><i>Drag to move</i>`; b.querySelector('[data-pick]').textContent = 'Replace photo';
        commit(); refreshCard();
      };
      b.querySelector('[data-done]').onclick = () => { if (changed) { S.artist.heroPos = pos; commit(); } close(); draw(); };
    });
  }

  // --- the works, as a list of their own: every work, by year, a tap to edit, a grip to reorder -------------------
  const pending = w => S.cloud && /^blob:/.test(w.image || '');
  const yearKey = w => String(w.year || '').slice(0, 4) || 'Undated';
  const worksInner = () => {
    const n = S.works.length;
    const head = `<div class="sec-h"><h2>Works</h2><span class="more">${n}</span></div>`;
    if (!n) return `${head}<div class="wk-empty"><b>No works yet</b><p>Pick photos from your phone: one or many. Add titles after, or never.</p>
      <button type="button" class="btn f" data-pick>Add photos</button><a class="btn g" href="#/studio/import">From a website, Instagram or Drive</a></div>`;
    const wall = S.works.filter(w => w.kind !== 'object'), objs = S.works.filter(w => w.kind === 'object');
    const years = [...new Set(wall.map(yearKey))].sort((a, b) => (a === 'Undated') - (b === 'Undated') || +b - +a);
    const groups = [...years.map(y => [y, wall.filter(w => yearKey(w) === y)]), ...(objs.length ? [['Objects', objs]] : [])];
    const row = w => {
      const up = pending(w), size = w.width && w.height ? `${w.height} × ${w.width}${w.depth ? ` × ${w.depth}` : ''} cm` : '';
      const meta = [w.medium, size].filter(Boolean).join(' · ');
      return `<div class="wk${up ? ' up' : ''}" data-id="${esc(w.id)}" role="button" tabindex="0" aria-label="Edit ${esc(w.title || 'Untitled')}"><span class="wk-im"><img src="${esc(w.thumb || w.image)}" alt="" loading="lazy" decoding="async">${up ? '<i class="wk-spin" title="Uploading"></i>' : ''}</span>
        <span class="wk-t"><b>${esc(w.title || 'Untitled')}</b><span>${esc(meta || 'No details yet')}</span>${up ? '<em class="up">Uploading…</em>' : !size && w.kind !== 'object' ? '<em>Add its size</em>' : ''}</span>
        <button type="button" class="wk-grip" aria-label="Move ${esc(w.title || 'Untitled')}: drag, or use the up and down arrow keys"></button></div>`;
    };
    return `${head}<p class="wk-hint">Tap a work to edit. Drag the dots to reorder within a year. <a href="#/studio/import">Import from a website</a></p>
      ${groups.map(([g, l]) => `<div class="wk-g"><h3>${esc(g)}</h3><div class="wk-list" data-g="${esc(g)}">${l.map(row).join('')}</div></div>`).join('')}`;
  };
  function drawWorks() {
    const sec = app.querySelector('#works'); if (!sec) return;
    sec.innerHTML = worksInner(); wireGrips(sec);
  }
  // the works of one list take, in the new order, the places they held in the artist's order
  function commitOrder(list) {
    const ids = [...list.querySelectorAll('.wk')].map(x => x.dataset.id);
    const slots = S.works.map((w, i) => ids.includes(w.id) ? i : -1).filter(i => i >= 0), byId = new Map(S.works.map(w => [w.id, w]));
    slots.forEach((at, n) => { S.works[at] = byId.get(ids[n]); });
    commit();
  }
  function wireGrips(sec) {
    sec.querySelectorAll('.wk-list').forEach(list => list.querySelectorAll('.wk').forEach(r => {
      const g = r.querySelector('.wk-grip');
      g.onpointerdown = ev => {
        ev.preventDefault(); g.setPointerCapture(ev.pointerId); r.classList.add('drag');
        const move = m => {
          const rows = [...list.querySelectorAll('.wk')];
          const over = rows.find(o => o !== r && m.clientY > o.getBoundingClientRect().top && m.clientY < o.getBoundingClientRect().bottom);
          if (over) { const after = rows.indexOf(over) > rows.indexOf(r); list.insertBefore(r, after ? over.nextSibling : over); }
          if (m.clientY > innerHeight - 90) scrollBy(0, 14); else if (m.clientY < 110) scrollBy(0, -14);
        };
        const up = () => { g.removeEventListener('pointermove', move); g.removeEventListener('pointerup', up); g.removeEventListener('pointercancel', up); r.classList.remove('drag'); commitOrder(list); };
        g.addEventListener('pointermove', move); g.addEventListener('pointerup', up); g.addEventListener('pointercancel', up);
      };
      g.onkeydown = e => {
        if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
        e.preventDefault();
        if (e.key === 'ArrowUp' && r.previousElementSibling) list.insertBefore(r, r.previousElementSibling);
        else if (e.key === 'ArrowDown' && r.nextElementSibling) list.insertBefore(r.nextElementSibling, r);
        else return;
        g.focus(); commitOrder(list);
      };
    }));
  }

  // --- details a work is given at once: remembered from the last one, so the next is a tap ---------------------
  const KINDS = ['Painting', 'Sculpture', 'Drawing', 'Print', 'Photography', 'Installation', 'Other'];
  const DEF = 'os-work-defaults';
  const defaults = () => { try { return JSON.parse(localStorage.getItem(DEF) || '{}') || {}; } catch { return {}; } };
  const remember = w => { try { localStorage.setItem(DEF, JSON.stringify({ kind: w.category || '', year: w.year || '', medium: w.medium || '', width: w.width || '', height: w.height || '' })); } catch {} };
  const kindChips = cur => `<fieldset class="kd"><legend>Kind</legend><div class="kd-row">${KINDS.map(k => `<label class="kd-c"><input type="radio" name="kind" value="${k}" ${cur === k ? 'checked' : ''}><span>${k}</span></label>`).join('')}</div></fieldset>`;
  const mediumList = () => `<datalist id="mediums">${[...new Set(['Oil on canvas', 'Acrylic on canvas', 'Oil on paper', 'Watercolour on paper', 'Ink on paper', 'Charcoal on paper', 'Ceramic', 'Bronze', 'Mixed media', ...S.works.map(w => w.medium).filter(Boolean)])].map(m => `<option value="${esc(m)}">`).join('')}</datalist>`;

  // a photo is decoded once and made twice (the page's size and a small one): in an account they wait as object URLs
  // until the upload, in the pretend studio they are small data URLs the browser keeps
  async function prepare(file, mode) {
    let src, W, H, done = () => {};
    try { if (self.createImageBitmap) { const b = await createImageBitmap(file, { imageOrientation: 'from-image' }); src = b; W = b.width; H = b.height; done = () => b.close && b.close(); } } catch {}
    if (!src) {
      const url = URL.createObjectURL(file);
      src = await new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => no(new Error('not an image')); i.src = url; });
      W = src.naturalWidth; H = src.naturalHeight; done = () => URL.revokeObjectURL(url);
    }
    try {
      const make = (long, q) => { const k = Math.min(1, long / Math.max(W, H)), c = document.createElement('canvas'); c.width = Math.max(1, Math.round(W * k)); c.height = Math.max(1, Math.round(H * k)); c.getContext('2d').drawImage(src, 0, 0, c.width, c.height); return new Promise(ok => c.toBlob(ok, 'image/jpeg', q)); };
      const keep = b => mode === 'blob' ? URL.createObjectURL(b) : new Promise(ok => { const r = new FileReader(); r.onload = () => ok(r.result); r.readAsDataURL(b); });
      const full = await make(mode === 'blob' ? 2000 : 1100, mode === 'blob' ? 0.86 : 0.8), small = await make(640, 0.8);
      if (!full || !small) throw new Error('not an image');
      return { image: await keep(full), thumb: await keep(small), W, H };
    } finally { done(); }
  }

  // --- sheets ---------------------------------------------------------------------------------------------------
  function sheet(title, html, wireIt, foot) {
    const el = document.createElement('div'); el.className = 'sh-back';
    el.innerHTML = `<div class="sh" role="dialog" aria-modal="true" aria-label="${esc(title)}"><div class="sh-h"><b>${esc(title)}</b><button type="button" class="sh-x" aria-label="Close">×</button></div><div class="sh-b">${html}</div>${foot ? `<div class="sh-f">${foot}</div>` : ''}</div>`;
    document.body.append(el); document.body.classList.add('sh-open');
    const opener = document.activeElement;
    const close = () => { el.remove(); document.body.classList.remove('sh-open'); document.removeEventListener('keydown', key); if (opener && opener.focus && document.contains(opener)) try { opener.focus({ preventScroll: true }); } catch {} };
    const key = e => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', key);
    el.onclick = e => { if (e.target === el) close(); };
    el.querySelector('.sh-x').onclick = close;
    wireIt(el.querySelector('.sh-b'), close);
    return close;
  }
  // --- bringing photos in: the phone's own picker (camera, library, files), many at once, one sheet for all of them ---
  const pickerFor = (many, onFiles) => {
    let el = document.getElementById('edPick');
    if (!el) { el = document.createElement('input'); el.type = 'file'; el.id = 'edPick'; el.hidden = true; el.tabIndex = -1; document.body.append(el); }
    return () => {
      el.multiple = !!many; el.accept = 'image/*'; el.value = '';
      el.onchange = () => { const fs = [...el.files]; el.value = ''; if (fs.length) onFiles(fs); };
      el.click();
    };
  };
  const pickPhotos = pickerFor(true, files => addWorks(files));
  const nameOf = n => { const s = String(n || '').replace(/\.[a-z0-9]+$/i, '').replace(/[-_]+/g, ' ').trim(); return /^(img|dsc|pxl|image|photo|screenshot|whatsapp|\d)/i.test(s) && /\d{3,}/.test(s) ? '' : s; };

  function addWorks(files) {
    files = files.filter(f => /^image\//.test(f.type) || /\.(jpe?g|png|webp|heic|heif|avif|gif)$/i.test(f.name || ''));
    if (!files.length) return toast('Choose photos of your work (JPEG, PNG or HEIC).');
    if (files.length > 40) { toast('Forty at a time: the rest after.'); files = files.slice(0, 40); }
    const d = defaults(), mode = S.cloud ? 'blob' : 'data', one = files.length === 1;
    const items = files.map(f => ({ id: uid(), file: f, title: nameOf(f.name), width: '', height: '', p: null, err: false, gone: false }));
    const last = d.width && d.height ? `${d.width} × ${d.height}` : '';
    const card = (it, i) => `<div class="ad-card${one ? ' one' : ''}" data-i="${i}"><span class="ad-im"><img alt="" hidden><i class="ad-wait">Preparing…</i></span>
      <div class="ad-f"><input name="t" aria-label="Title of photo ${i + 1}" placeholder="Title (optional)" value="${esc(it.title)}" autocomplete="off" enterkeyhint="done">
        <div class="ad-sz"><input name="w" inputmode="decimal" aria-label="Width in centimetres" placeholder="W"><span aria-hidden="true">×</span><input name="h" inputmode="decimal" aria-label="Height in centimetres" placeholder="H"><span aria-hidden="true">cm</span></div>
        ${last ? `<button type="button" class="ad-same" data-same>Same size as the last: ${esc(last)}</button>` : ''}<p class="ad-err small" role="alert" hidden></p></div>
      ${one ? '' : '<button type="button" class="ad-rm" aria-label="Leave this photo out">×</button>'}</div>`;
    const word = n => n === 1 ? 'work' : 'works';
    sheet(one ? 'Add a work' : `Add ${files.length} works`, `<form class="st-form" id="adForm" novalidate><div class="ad-list">${items.map(card).join('')}</div>
      <div class="ad-all"><p class="ad-h">${one ? 'About the work' : 'The same for all of them'}</p>${kindChips(d.kind)}
      <div class="st-row yr"><label>Year<input name="year" inputmode="numeric" maxlength="4" value="${esc(d.year || new Date().getFullYear())}" autocomplete="off"></label><label>Medium<input name="medium" list="mediums" placeholder="e.g. Oil on canvas" value="${esc(d.medium || '')}" autocomplete="off"></label></div>${mediumList()}</div></form>`, (b, close) => {
      const f = b.querySelector('#adForm'), cards = [...f.querySelectorAll('.ad-card')], go = b.closest('.sh').querySelector('#adGo');
      const label = () => { const n = items.filter(x => !x.gone).length; go.textContent = n ? `Add ${n === 1 ? 'this' : n} ${word(n)} to my page` : 'Nothing to add'; go.disabled = !n; };
      label();
      // each photo is brought to a size the page needs, one at a time, so the sheet stays quick under the thumb
      let chain = Promise.resolve();
      items.forEach((it, i) => {
        it.ready = chain = chain.then(() => prepare(it.file, mode)).then(p => {
          it.p = p; const c = cards[i], im = c.querySelector('img'); im.src = p.thumb; im.hidden = false; c.querySelector('.ad-wait').hidden = true;
        }, () => {
          it.err = true; const c = cards[i]; c.querySelector('.ad-wait').hidden = true; const e = c.querySelector('.ad-err'); e.hidden = false; e.textContent = 'This file couldn’t be read as a photo.';
        });
      });
      cards.forEach((c, i) => {
        const it = items[i];
        c.querySelector('[name=t]').oninput = e => { it.title = e.target.value; };
        c.querySelector('[name=w]').oninput = e => { it.width = e.target.value; };
        c.querySelector('[name=h]').oninput = e => { it.height = e.target.value; };
        const same = c.querySelector('[data-same]'); if (same) same.onclick = () => { c.querySelector('[name=w]').value = it.width = d.width; c.querySelector('[name=h]').value = it.height = d.height; same.hidden = true; };
        const rm = c.querySelector('.ad-rm'); if (rm) rm.onclick = () => { it.gone = true; c.remove(); label(); if (!items.some(x => !x.gone)) close(); };
      });
      f.onsubmit = async e => {
        e.preventDefault(); go.disabled = true; go.textContent = 'Preparing…';
        await Promise.all(items.map(x => x.ready));
        const ok = items.filter(x => !x.gone && x.p && !x.err);
        if (!ok.length) { go.disabled = false; label(); return; }
        const dd = new FormData(f), shared = { year: String(dd.get('year') || '').trim(), medium: String(dd.get('medium') || '').trim(), category: dd.get('kind') || '' };
        const made = ok.map(x => ({ id: uid(), title: x.title.trim() || 'Untitled', ...shared, width: +x.width || '', height: +x.height || '', depth: '', framed: 'no', image: x.p.image, thumb: x.p.thumb, check: null }));
        S.works.unshift(...made);
        const lastSized = made.slice().reverse().find(m => m.width && m.height);
        remember({ ...shared, width: lastSized ? lastSized.width : d.width, height: lastSized ? lastSized.height : d.height });
        commit(); close(); drawWorks(); refreshCard();
        const sec = app.querySelector('#works'); if (sec) sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
        const ids = made.map(m => m.id);
        toast(`${made.length} ${word(made.length)} added`, () => { S.works = S.works.filter(x => !ids.includes(x.id)); commit(); drawWorks(); refreshCard(); });
        // the checks of sharpness, light and proportions run after, when the thumb is free
        ok.forEach((x, i) => setTimeout(() => checkImage(x.file).then(m => { made[i].check = { W: m.W, H: m.H, long: m.long, mean: m.mean, clipped: m.clipped, sharp: m.sharp, backdrop: m.backdrop }; }, () => {}), 800 + i * 400));
      };
      go.onclick = () => f.requestSubmit();
      setTimeout(() => { const t = cards[0] && cards[0].querySelector('[name=t]'); if (t && !t.value) t.focus({ preventScroll: true }); }, 350);
    }, `<button type="submit" class="btn f wide" id="adGo">Add to my page</button>`);
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

  // edit one work, in a sheet: the photo on top, then what a visitor reads, then its size; delete is undoable
  function workSheet(id) {
    const old = id ? S.works.find(x => x.id === id) : null;
    if (!old) return;
    const w = old;
    let pending = null;
    sheet('Edit work', `<form class="st-form" id="wkForm" novalidate>
      <div class="wk-prev"><span class="wk-pv"><img src="${esc(w.thumb || w.image || '')}" alt="Photo of ${esc(w.title)}"></span><button type="button" class="btn g" data-pick>Change photo</button></div>
      <div class="chk" aria-live="polite"></div>
      <label>Title<input name="title" value="${esc(w.title)}" autocomplete="off" enterkeyhint="next"></label>
      ${kindChips(w.category)}
      <div class="st-row yr"><label>Year<input name="year" inputmode="numeric" maxlength="4" value="${esc(w.year)}" autocomplete="off"></label><label>Medium<input name="medium" list="mediums" placeholder="e.g. Oil on canvas" value="${esc(w.medium)}" autocomplete="off"></label></div>${mediumList()}
      <fieldset><legend>Size, in centimetres</legend><div class="st-row three"><label>Width<input name="width" inputmode="decimal" value="${esc(w.width)}"></label><label>Height<input name="height" inputmode="decimal" value="${esc(w.height)}"></label><label>Depth<input name="depth" inputmode="decimal" placeholder="Optional" value="${esc(w.depth)}"></label></div></fieldset>
      <p class="err m small" role="alert"></p></form>`, (b, close) => {
      const f = b.querySelector('#wkForm'), img = f.querySelector('.wk-pv img'), chk = f.querySelector('.chk');
      let meta = w.check;
      const refresh = () => { const v = verdict(meta, { width: +f.width.value, height: +f.height.value }).filter(([l, t]) => l !== 'ok' && t !== 'No image yet.'); chk.innerHTML = v.length ? checks(v) : ''; };
      refresh(); f.width.oninput = f.height.oninput = refresh;
      const pick = pickerFor(false, async files => {
        const file = files[0]; if (!file) return;
        chk.innerHTML = '<p class="m small">Preparing the photo…</p>';
        try {
          const p = await prepare(file, S.cloud ? 'blob' : 'data'); pending = p; img.src = p.thumb;
          const m = await checkImage(file); meta = { W: m.W, H: m.H, long: m.long, mean: m.mean, clipped: m.clipped, sharp: m.sharp, backdrop: m.backdrop }; pending.check = meta;
        } catch { chk.innerHTML = checks([['no', 'This file couldn’t be read as an image.']]); return; }
        refresh();
      });
      f.querySelector('[data-pick]').onclick = pick;
      f.onsubmit = e => {
        e.preventDefault();
        const dd = new FormData(f), n = { title: dd.get('title').trim() || 'Untitled', year: String(dd.get('year') || '').trim(), medium: dd.get('medium').trim(), category: dd.get('kind') || '',
          width: +dd.get('width') || '', height: +dd.get('height') || '', depth: +dd.get('depth') || '' };
        if (pending) Object.assign(n, { image: pending.image, thumb: pending.thumb, check: pending.check });
        Object.assign(old, n); remember(old); commit(); close(); drawWorks(); refreshCard();
      };
      b.closest('.sh').querySelector('[data-save]').onclick = () => f.requestSubmit();
      b.closest('.sh').querySelector('[data-del]').onclick = () => { close(); removeWork(old); };
    }, `<button type="button" class="btn f" data-save>Save</button><button type="button" class="btn g danger" data-del>Delete</button>`);
  }
  // delete at once, with the way back: the photo stays where it is kept, so Undo is the work as it was
  function removeWork(wk) {
    const at = S.works.indexOf(wk); if (at < 0) return;
    const ex = (S.exhibitions || []).map(x => [x, (x.works || []).slice()]), vs = (S.virtual || []).map(v => [v, v.works.slice()]);
    S.works.splice(at, 1);
    (S.exhibitions || []).forEach(x => { x.works = (x.works || []).filter(i => i !== wk.id); }); (S.virtual || []).forEach(v => { v.works = v.works.filter(i => i !== wk.id); });
    commit(); drawWorks(); refreshCard();
    toast(`“${wk.title || 'Untitled'}” deleted`, () => {
      S.works.splice(Math.min(at, S.works.length), 0, wk); ex.forEach(([x, l]) => { x.works = l; }); vs.forEach(([v, l]) => { v.works = l; });
      commit(); drawWorks(); refreshCard();
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
  if (window.__pendingFiles) { const fs = window.__pendingFiles; window.__pendingFiles = null; setTimeout(() => addWorks(fs), 250); }
  if (act) ({ cover: coverSheet, portrait: coverSheet, profile: profileSheet, 'work-new': () => pickPhotos(), 'ex-new': () => go('#/studio/exhibition/new'), 'works': () => app.querySelector('#works') && app.querySelector('#works').scrollIntoView() }[act.split(':')[0]] || (() => {}))();
  if (act && act.startsWith('work:')) workSheet(act.slice(5));
}
