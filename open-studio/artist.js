// Open Studio for Artists: the artist's side of the app. Sign in, a profile (photo, statement, bio), works
// (added with an instant check of the image and the details), exhibitions (with what a walkable tour still
// needs, in plain words, and the room's details the artist can add), and a preview as visitors see it.
//
// A prototype: what an artist enters is kept in this browser (localStorage). It starts from a fictional demo
// artist, so every screen has something on it; "Elad Amsalem" shows the real exhibitions' tour status, as the
// space pipeline measured it (data/spaces/<slug>.status.json).

const KEY = 'os-artist-v1';
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
// (the same kind of id the database uses, so a thing keeps its id when an artist's account saves it)
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2, 9));

let S = null;                        // the signed-in artist's studio, or null
let demo = null;                     // the demo artist, as shipped
let model = null;                    // the visitors' app's own content (the real artist)

function load() {
  try { S = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { S = null; }
  return S;
}
function save() {
  if (S && S.preview) return;                                 // the control room's preview: nothing is kept
  if (S && S.cloud) return cloud.save(S);                    // a real artist's account: kept in the database
  try { localStorage.setItem(KEY, JSON.stringify(S)); } catch { /* private window: kept for this visit */ }
}
// a real artist's account (signed in, here as an artist): the studio is kept in Open Studio's database
let cloud = null;
const me = () => {
  try { const pv = JSON.parse(sessionStorage.getItem('os-preview')); if (pv) return pv.user && pv.user.id ? pv.user : null; } catch {}
  try { const u = JSON.parse(localStorage.getItem('os-user')); return u && u.id ? u : null; } catch { return null; }
};
const previewing = () => { try { return !!sessionStorage.getItem('os-preview'); } catch { return false; } };

async function demoArtist() {
  if (!demo) demo = await fetch('data/demo/artist.json').then(r => r.json());
  return JSON.parse(JSON.stringify(demo));
}

// --- the instant check of a work's image and details ---------------------------------------------------
// Everything a walkable tour and a good page need from one image, measured in the browser as it is chosen.
async function checkImage(file) {
  const url = URL.createObjectURL(file);
  const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
  const W = img.naturalWidth, H = img.naturalHeight, long = Math.max(W, H);
  const s = Math.min(1, 900 / long), w = Math.round(W * s), h = Math.round(H * s);
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(img, 0, 0, w, h);
  const d = x.getImageData(0, 0, w, h).data;
  const L = new Float32Array(w * h);
  let sum = 0, clipped = 0;
  for (let i = 0; i < w * h; i++) {
    const r = d[4 * i], g = d[4 * i + 1], b = d[4 * i + 2];
    L[i] = 0.299 * r + 0.587 * g + 0.114 * b; sum += L[i];
    if (r > 250 && g > 250 && b > 250) clipped++;
  }
  const mean = sum / (w * h);
  // sharpness: how much fine detail (a Laplacian), against how much the picture varies at all
  let lap = 0, n = 0;
  for (let y = 1; y < h - 1; y++) for (let xx = 1; xx < w - 1; xx++) {
    const i = y * w + xx, v = 4 * L[i] - L[i - 1] - L[i + 1] - L[i - w] - L[i + w];
    lap += v * v; n++;
  }
  let vari = 0; for (let i = 0; i < w * h; i++) vari += (L[i] - mean) ** 2;
  const sharp = Math.sqrt(lap / n) / Math.max(4, Math.sqrt(vari / (w * h)));
  // a backdrop round the work: an even margin along the image's edges
  const ring = Math.max(2, Math.round(0.012 * Math.max(w, h)));
  const edgeVals = [];
  for (let y = 0; y < h; y++) for (let xx = 0; xx < w; xx++) if (y < ring || y >= h - ring || xx < ring || xx >= w - ring) edgeVals.push(L[y * w + xx]);
  edgeVals.sort((a, b) => a - b);
  const spread = edgeVals[Math.floor(edgeVals.length * 0.9)] - edgeVals[Math.floor(edgeVals.length * 0.1)];
  URL.revokeObjectURL(url);
  return { W, H, long, mean, clipped: clipped / (w * h), sharp, backdrop: spread < 14, thumb: c.toDataURL('image/jpeg', 0.85) };
}

// the checks, as a visitor-friendly list: [level, text] with level 'ok' | 'warn' | 'no'
function verdict(m, size) {
  const out = [];
  if (m) {
    out.push(m.long >= 6000 ? ['ok', `${m.W} × ${m.H} px: full detail, even up close in the tour.`]
      : m.long >= 3000 ? ['ok', `${m.W} × ${m.H} px: good. 6000 px on the long side shows the brushwork up close.`]
      : m.long >= 2000 ? ['warn', `${m.W} × ${m.H} px: enough for the tour, soft up close. 6000 px is the standard.`]
      : ['no', `${m.W} × ${m.H} px: too small for the tour (at least 2000 px on the long side).`]);
    out.push(m.sharp > 0.35 ? ['ok', 'Sharp.'] : m.sharp > 0.2 ? ['warn', 'A little soft: a tripod or more light helps.'] : ['no', 'Blurred: please photograph it again, steadier.']);
    if (m.mean < 55) out.push(['warn', 'Dark: more even light would show the colours better.']);
    else if (m.mean > 225) out.push(['warn', 'Very bright: the lightest colours may be lost.']);
    if (m.clipped > 0.02) out.push(['warn', 'Glare on the surface: light it from the sides, at an angle.']);
    out.push(m.backdrop ? ['ok', 'Wall or paper round the work: we cut the work out of it, so the edges can stay.'] : ['ok', 'Cropped to the work.']);
  } else out.push(['no', 'No image yet.']);
  if (size && size.width > 0 && size.height > 0) {
    if (m && !m.backdrop) {
      const a = (m.W / m.H) / (size.width / size.height);
      out.push(Math.abs(a - 1) < 0.04 ? ['ok', `${size.width} × ${size.height} cm matches the image's proportions.`]
        : ['warn', `${size.width} × ${size.height} cm doesn't match the image (${Math.round(Math.abs(a - 1) * 100)}% off): check the size, or width and height swapped.`]);
    }
  } else out.push(['no', 'Size missing (width and height in cm).']);
  return out;
}
const tourReady = v => !v.some(([l]) => l === 'no');
// an exhibition's tour, in one word: its real status where the pipeline has measured it, else from what's entered
function tourFlag(ex) {
  if (ex.tour === 'live') return ['ok', 'Tour live'];
  if (ex.real) return ex.real.state === 'building' ? ['ok', 'Being built'] : ['no', 'Not yet'];
  if (ex.tour === 'building') return ['ok', 'Being built'];
  const r = readiness(ex, S.works);
  return r.ready ? ['ok', 'Ready to build'] : ['no', `${r.blocking} to go`];
}
const checks = v => `<ul class="st-checks">${v.map(([l, t]) => `<li class="${l}"><span aria-hidden="true">${l === 'ok' ? '✓' : l === 'warn' ? '!' : '✕'}</span>${esc(t)}</li>`).join('')}</ul>`;

// --- what a walkable tour still needs, in plain words -------------------------------------------------------
function readiness(ex, works) {
  const inShow = works.filter(w => ex.works.includes(w.id));
  const items = [];
  const noSize = inShow.filter(w => !(w.width > 0 && w.height > 0));
  const small = inShow.filter(w => w.check && w.check.long < 2000);
  const photos = ex.photos.length;
  items.push(inShow.length ? ['ok', `${inShow.length} works in the show.`] : ['no', 'Add the works that were in the show.']);
  if (noSize.length) items.push(['no', `${noSize.length} ${noSize.length === 1 ? 'work needs its' : 'works need their'} size: ${noSize.map(w => w.title).join(', ')}.`]);
  if (small.length) items.push(['no', `${small.length} ${small.length === 1 ? 'image is' : 'images are'} too small: ${small.map(w => w.title).join(', ')}.`]);
  items.push(photos >= 10 ? ['ok', `${photos} installation photos.`]
    : photos >= 6 ? ['warn', `${photos} installation photos: enough to try. 10 or more, every wall in two of them, makes it reliable.`]
    : ['no', `${photos} installation photos: at least 6 are needed (10 or more is better), wide, with 2–3 works and a corner of the room in each.`]);
  if (ex.video) items.push(['ok', 'A walk-through video: the tour can be built from it.']);
  else items.push(['warn', 'Optional, and the surest way: a slow walk-through video of a minute or two, filming every wall.']);
  const sp = ex.space || {};
  items.push(sp.ceiling || sp.centre || sp.depth ? ['ok', 'Room details added: they make the tour more exact.'] : ['warn', 'Optional: the room details below (ceiling height, canvas depth...) make the tour more exact.']);
  const blocking = items.filter(([l]) => l === 'no').length;
  return { items, blocking, ready: !blocking };
}

// --- screens --------------------------------------------------------------------------------------------
// (a studio page without a page to go back to leads out to the app itself, its Home)
const head = (title, back) => `<div class="st-head"><a class="back" href="${back || '#/'}">← ${back ? 'Back' : 'Open Studio'}</a><span class="tag">Open Studio for Artists</span></div><h1 class="st-h1">${esc(title)}</h1>`;
const nav = cur => `<nav class="st-nav" aria-label="Studio">${[['', 'Home'], ['works', 'Works'], ['import', 'Bring work in'], ['exhibitions', 'Exhibitions'], ['profile', 'Profile']].map(([k, t]) => `<a href="#/studio${k ? '/' + k : ''}" ${cur === k ? 'aria-current="page"' : ''}>${t}</a>`).join('')}</nav>`;

function signIn() {
  return `<div class="wrap gut st">
    <div class="st-head"><a class="back" href="#/">← Open Studio</a><span class="tag">For Artists</span></div>
    <div class="st-hero"><h1 class="st-h1">Your studio,<br>open to everyone.</h1>
      <p class="m">Your works at their real size, your exhibitions as albums, and the shows themselves as rooms anyone can walk through, built from your installation photos.</p></div>
    <div class="btns"><a class="btn f" href="#/welcome">Sign in or join as an artist</a></div>
    <p class="m small">With Google or your email (a code, no password). Then choose “I make art”.</p>
    <div class="st-or"><span>or look around first</span></div>
    <button class="btn g" type="button" id="demoIn">Open the demo studio</button>
    <p class="m small">Berthe Morisot's, with her real works, to show how it all works.</p>
    ${model ? `<button class="btn g" type="button" id="realIn">Open ${esc(model.artist.name)}'s studio</button>
    <p class="m small">The real works and exhibitions, with each tour's real status.</p>` : ''}
  </div>`;
}

function home() {
  const ready = S.works.filter(w => w.check && tourReady(verdict(w.check, w))).length;
  const profile = [S.artist.photo, S.artist.statement, S.artist.bio, S.artist.city].filter(Boolean).length;
  const todo = [];
  if (profile < 4) todo.push([`Finish your profile (${profile} of 4)`, '#/studio/profile']);
  const fix = S.works.filter(w => !(w.check && tourReady(verdict(w.check, w))));
  if (fix.length) todo.push([`${fix.length} ${fix.length === 1 ? 'work needs' : 'works need'} attention`, '#/studio/works']);
  for (const ex of S.exhibitions) {
    if (ex.tour === 'live') continue;
    const n = ex.real ? ex.real.items.filter(([l]) => l === 'no').length : readiness(ex, S.works).blocking;
    if (n) todo.push([`${ex.title}: ${n} ${n === 1 ? 'thing' : 'things'} before a tour`, `#/studio/exhibition/${ex.id}`]);
  }
  const status = !S.cloud ? '' : S.status === 'approved' ? `<p class="st-status ok">Your page is live: <a href="#/artist/${esc(S.slug)}">see it as visitors do</a>.</p>`
    : S.status === 'hidden' ? `<p class="st-status no">Your page is not shown at the moment.${S.note ? ' ' + esc(S.note) : ''}</p>`
    : `<p class="st-status">Open Studio is looking at your page: it goes live once approved. Everything you add meanwhile will be there.${S.note ? ' ' + esc(S.note) : ''}</p>`;
  return `<div class="wrap gut st">${head(`Hello, ${S.artist.name.split(' ')[0]}`)}${nav('')}${status}
    <div class="st-stats">
      <div><b>${S.works.length}</b><span>works</span></div>
      <div><b>${S.exhibitions.length}</b><span>exhibitions</span></div>
      <div><b>${S.exhibitions.filter(e => e.tour === 'live').length}</b><span>walkable tours</span></div>
    </div>
    <section class="sec"><div class="sec-h"><h2>To do</h2></div>
      ${todo.length ? `<div class="list">${todo.map(([t, h]) => `<a class="st-todo" href="${h}">${esc(t)}<span aria-hidden="true">→</span></a>`).join('')}</div>` : '<p class="m">Nothing: everything is in order.</p>'}
    </section>
    <section class="sec"><div class="sec-h"><h2>Quick add</h2></div>
      <div class="btns">${S.cloud ? '<a class="btn f" href="#/studio/import">Bring your work in</a><a class="btn g" href="#/studio/works/new">Add a work</a>' : '<a class="btn f" href="#/studio/works/new">Add a work</a><a class="btn g" href="#/studio/exhibitions/new">Add an exhibition</a>'}<a class="btn g" href="#/studio/virtual/new">Design a virtual exhibition</a><a class="btn g" href="#/studio/preview">See your page</a></div>
      <p class="m small">${ready} of ${S.works.length} works are ready for a walkable tour.</p>
    </section>
    <section class="sec"><button type="button" class="more" id="signOut">Sign out</button></section>
  </div>`;
}

// works in groups, as an artist's site shows them: the newest year first, objects apart
function byYear(list) {
  const objects = list.filter(w => w.kind === 'object'), wall = list.filter(w => w.kind !== 'object');
  const years = [...new Set(wall.map(w => String(w.year || '').slice(0, 4) || 'Undated'))].sort((a, b) => (b === 'Undated') - (a === 'Undated') || +b - +a);
  return [...years.map(y => [y, wall.filter(w => (String(w.year || '').slice(0, 4) || 'Undated') === y)]), ...(objects.length ? [['Objects', objects]] : [])];
}
const detail = w => [w.medium, w.width && w.height ? `${w.height} × ${w.width}${w.depth ? ` × ${w.depth}` : ''} cm` : '', w.kind === 'object' ? w.year : ''].filter(Boolean).join(' · ');

function works() {
  return `<div class="wrap gut st">${head('Works')}${nav('works')}
    <div class="btns" style="padding-block:6px 18px"><a class="btn f" href="#/studio/works/new">Add a work</a></div>
    <p class="m small">${S.works.length} works. Sizes are height × width.</p>
    ${byYear(S.works).map(([y, ws]) => `<section class="sec st-year"><div class="sec-h"><h2>${esc(y)}</h2><span class="more">${ws.length}</span></div>
    <div class="grid">${ws.map(w => {
      const v = w.check ? verdict(w.check, w) : verdict(null, w), ok = tourReady(v);
      return `<a href="#/studio/work/${w.id}"><div class="im"><img src="${esc(w.thumb || w.image)}" alt="" loading="lazy"></div>
        <div class="c"><b>${esc(w.title)}</b><div class="m">${esc(detail(w))}</div>
        <div class="st-flag ${ok ? 'ok' : 'no'}">${ok ? 'Ready' : 'Needs attention'}</div></div></a>`;
    }).join('')}</div></section>`).join('')}
  </div>`;
}

function workForm(id) {
  const w = id ? S.works.find(x => x.id === id) : { id: '', title: '', year: String(new Date().getFullYear()), medium: '', width: '', height: '', depth: '', framed: 'no', image: '', check: null };
  if (!w) return `<div class="wrap gut st">${head('Not found', '#/studio/works')}</div>`;
  const v = verdict(w.check, w);
  return `<div class="wrap gut st">${head(id ? w.title : 'Add a work', '#/studio/works')}
    <form class="st-form" id="workForm" data-id="${esc(w.id)}">
      <label class="st-drop"><input type="file" accept="image/jpeg,image/png,image/heic,image/webp" name="file" hidden>
        <img id="wPreview" src="${esc(w.thumb || w.image || '')}" alt="" ${w.thumb || w.image ? '' : 'hidden'}>
        <span id="wDropText" ${w.thumb || w.image ? 'hidden' : ''}>Choose the work's photo<br><small>Straight on, the whole work, in even light. 6000 px on the long side is best.</small></span></label>
      <div id="wChecks">${checks(v)}</div>
      <label>Title<input name="title" required value="${esc(w.title)}"></label>
      <div class="st-row"><label>Year<input name="year" inputmode="numeric" value="${esc(w.year)}"></label>
        <label>Medium<input name="medium" placeholder="Oil on canvas" value="${esc(w.medium)}"></label></div>
      <fieldset><legend>Size, in cm</legend><div class="st-row three">
        <label>Width<input name="width" inputmode="decimal" value="${esc(w.width)}"></label>
        <label>Height<input name="height" inputmode="decimal" value="${esc(w.height)}"></label>
        <label>Depth<input name="depth" inputmode="decimal" placeholder="3.5" value="${esc(w.depth)}"></label></div>
        <p class="m small">Depth is how far the work stands off the wall (a canvas's stretcher, a frame): the tour shows its sides.</p></fieldset>
      <label>Frame<select name="framed">${[['no', 'No frame'], ['thin', 'Thin frame'], ['float', 'Floating frame'], ['box', 'Box frame']].map(([k, t]) => `<option value="${k}" ${w.framed === k ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
      <div class="btns"><button class="btn f" type="submit">Save</button>${id ? '<button class="btn g" type="button" id="delWork">Delete</button>' : ''}</div>
    </form>
  </div>`;
}

function exhibitions() {
  return `<div class="wrap gut st">${head('Exhibitions')}${nav('exhibitions')}
    <div class="btns" style="padding-block:6px 18px">${S.cloud ? '' : '<a class="btn f" href="#/studio/exhibitions/new">Add an exhibition</a>'}<a class="btn ${S.cloud ? 'f' : 'g'}" href="#/studio/virtual/new">Design a virtual exhibition</a></div>
    ${(S.virtual || []).length ? `<section class="sec" style="padding-top:0"><div class="sec-h"><h2>Virtual</h2><span class="more">rooms that exist only here</span></div><div class="list">${S.virtual.map(v => `<a class="row" href="#/studio/virtual/${v.id}"><img src="${esc(thumbOf(v.works[0]))}" alt=""><div class="t"><div><b>${esc(v.title || 'Untitled')}</b></div><div class="m">${esc(roomName(v.room))} · ${v.works.length} works</div></div><span class="st-flag ok">Virtual</span></a>`).join('')}</div></section>` : ''}
    <div class="list">${S.exhibitions.map(ex => {
      return `<a class="row" href="#/studio/exhibition/${ex.id}"><img src="${esc(ex.cover || (ex.photos[0] || {}).src || '')}" alt=""><div class="t"><div><b>${esc(ex.title)}</b></div><div class="m">${esc([ex.venue, ex.year].filter(Boolean).join(' · '))}</div></div>
        <span class="st-flag ${tourFlag(ex)[0]}">${tourFlag(ex)[1]}</span></a>`;
    }).join('')}</div>
  </div>`;
}

// --- a virtual exhibition: a room that exists only here, designed around the works ------------------------
// The artist chooses one of Open Studio's rooms, the walls' colour, the works and their walking order, and the
// height they hang at; the room is drawn around them (space/synth.js) and opens in the same viewer as a real tour.
let SYN = null, addOpen = false, restoreY = null;                    // (the works to add stay open while the artist adds several)
const synth = () => SYN || (SYN = import('./space/synth.js'));
let ROOMS = {}, PAINTS = {};
const roomName = r => (ROOMS[r] || {}).name || 'A virtual room';
const workOf = id => S.works.find(w => w.id === id);
const thumbOf = id => { const w = workOf(id); return w ? srcOf(w.thumb || w.image) : ''; };
const srcOf = p => (model && model.media && model.media[p]) || p;
const plan = (r, on) => {
  const k = 64 / Math.max(r.w, r.d), W = r.w * k, D = r.d * k, d = r.door * k;
  return `<svg viewBox="-3 -3 ${W + 6} ${D + 6}" width="${W + 6}" height="${D + 6}" aria-hidden="true"><path d="M${W} ${D / 2 + d / 2}V${D}H0V0H${W}V${D / 2 - d / 2}" fill="${on ? 'var(--card)' : 'none'}" stroke="currentColor" stroke-width="1.5"/></svg>`;
};
function designer(id) {
  const isNew = id === 'new';
  const v = isNew ? { id: '', title: '', room: 'white-cube', paint: '', centre: 150, works: [], text: '' } : (S.virtual || []).find(x => x.id === id);
  if (!v) return `<div class="wrap gut st">${head('Not found', '#/studio/exhibitions')}</div>`;
  const paint = v.paint || ROOMS[v.room].paint;
  const rest = S.works.filter(w => !v.works.includes(w.id));
  return `<div class="wrap gut st">${head(isNew ? 'A virtual exhibition' : v.title || 'Untitled', '#/studio/exhibitions')}
    <p class="m">Choose a room, the colour of its walls and the works, in the order a visitor will walk past them. The room is built around them, every work at its real size.</p>
    <form class="st-form st-vx" id="vxForm" data-id="${esc(v.id)}">
      <label>Title<input name="title" required value="${esc(v.title)}" placeholder="The exhibition's title"></label>
      <fieldset><legend>The room</legend><div class="vx-rooms">${Object.entries(ROOMS).map(([k, r]) => `<label class="vx-room"><input type="radio" name="room" value="${k}" ${v.room === k ? 'checked' : ''}>${plan(r, v.room === k)}<b>${esc(r.name)}</b><span class="m small">${esc(r.size)} · ${esc(r.blurb)}</span></label>`).join('')}</div></fieldset>
      <fieldset><legend>The walls</legend><div class="vx-paints">${Object.entries(PAINTS).map(([k, [n, c]]) => `<label class="vx-paint" title="${n}"><input type="radio" name="paint" value="${k}" ${paint === k ? 'checked' : ''}><i style="background:${c}"></i><span>${n}</span></label>`).join('')}</div></fieldset>
      <fieldset><legend>Works, in walking order</legend>
        ${v.works.length ? `<ol class="vx-order">${v.works.map((wid, i) => { const w = workOf(wid); if (!w) return ''; return `<li><img src="${esc(thumbOf(wid))}" alt=""><div class="t"><b>${esc(w.title)}</b><span class="m small">${esc([w.year, w.width && w.height ? `${w.height} × ${w.width} cm` : ''].filter(Boolean).join(' · '))}</span></div>
          <button type="button" data-up="${i}" aria-label="Move ${esc(w.title)} earlier" ${i ? '' : 'disabled'}>↑</button><button type="button" data-down="${i}" aria-label="Move ${esc(w.title)} later" ${i < v.works.length - 1 ? '' : 'disabled'}>↓</button><button type="button" data-out="${i}" aria-label="Take ${esc(w.title)} out">×</button></li>`; }).join('')}</ol>` : '<p class="m">No works yet: add them below.</p>'}
        <p class="m small" id="vxFit" aria-live="polite"></p>
        ${rest.length ? `<details class="vx-add" ${v.works.length && !addOpen ? '' : 'open'}><summary>Add works (${rest.length})</summary><div class="st-pick">${rest.map(w => `<label><input type="checkbox" data-add="${esc(w.id)}"><img src="${esc(srcOf(w.thumb || w.image))}" alt=""><span>${esc(w.title)}</span></label>`).join('')}</div></details>` : ''}
      </fieldset>
      <label>Hung at, centre (cm)<input name="centre" type="range" min="135" max="160" step="1" value="${+v.centre || 150}"><span class="m small" id="vxCentre">${+v.centre || 150} cm from the floor to the middle of each work</span></label>
      <label>About the exhibition<textarea name="text" rows="4">${esc(v.text)}</textarea></label>
      <div class="btns"><button class="btn f" type="button" id="vxWalk" ${v.works.length ? '' : 'disabled'}>Walk in</button><button class="btn g" type="submit">Save</button>${isNew ? '' : '<button class="btn g" type="button" id="vxDel">Delete</button>'}</div>
      ${S.cloud ? (v.id ? `<div class="btns"><button class="btn ${v.status === 'published' ? 'g' : 'f'}" type="button" id="vxPub">${v.status === 'published' ? 'Take it down' : 'Publish'}</button></div>
        <p class="m small">${v.status === 'published' ? (S.status === 'approved' ? 'Published: on your page and in Shows.' : 'Published: it shows on your page and in Shows once your page is approved.') : 'A draft: only you see it.'}</p>` : '')
        : '<p class="m small">In this demo the design stays on this phone. With an artist’s account, Publish puts it on your page and in Shows.</p>'}
    </form>
  </div>`;
}
async function fitNote(app, v) {
  const el = app.querySelector('#vxFit');
  if (!el || !v.works.length) return;
  const { sizeOf, hang } = await synth();
  const ws = v.works.map(workOf).filter(Boolean);
  const sized = await Promise.all(ws.map(async w => ({ work: w, ...(await sizeOf(w, srcOf)) })));
  if (!app.contains(el)) return;
  const { left } = hang({ room: v.room, centre: v.centre }, sized);
  const guessed = sized.filter(x => x.guessed).length;
  el.textContent = (left.length ? `${ws.length - left.length} of ${ws.length} works fit on the walls of the ${roomName(v.room)}: choose a larger room, or fewer works.` : `All ${ws.length} works fit on the walls, with room to breathe.`)
    + (guessed ? ` ${guessed} without a size: hung at about 90 cm; add their sizes in Works.` : '');
  el.classList.toggle('warn', !!left.length);
}
async function walkIn(v) {
  const [{ buildRoom }, { openSpace }] = await Promise.all([synth(), import('./space/space.js')]);
  const works = v.works.map(workOf).filter(Boolean).map(w => ({ title: w.title, image: srcOf(w.image), width: w.width, height: w.height, pairs: w.width && w.height ? [[+w.height, +w.width]] : [],
    year: w.year, medium: w.medium, artist: { name: S.artist.name } }));
  const made = await buildRoom({ title: v.title || 'Untitled', room: v.room, paint: v.paint, centre: v.centre, works }, u => u);
  const view = await openSpace({ spec: made.spec, works, src: u => u, onClose: () => made.revoke() });
  window.__spaceView = view;
}

// --- a real artist's first visit: their page, in a minute ---------------------------------------------------------------
function setup(u) {
  return `<div class="wrap gut st">${head('Your studio')}
    <p class="m">Two steps to a page of your own: who you are, then your work, brought in from where it already is (your website, Instagram, a Drive folder or your phone). Open Studio looks at every new page before it goes live.</p>
    <form class="st-form" id="setup">
      <label>Your name, as an artist<input name="name" required value="${esc(u.name || '')}" autocomplete="name"></label>
      <div class="st-row"><label>You make<input name="discipline" placeholder="Painting"></label><label>City<input name="city" placeholder="Tel Aviv"></label></div>
      <div class="st-row"><label>Instagram<input name="instagram" placeholder="@yourname" autocapitalize="off"></label><label>Website<input name="link" type="url" placeholder="https://" inputmode="url"></label></div>
      <p class="err m small" role="alert"></p>
      <div class="btns"><button class="btn f" type="submit">Make my page</button></div>
    </form>
  </div>`;
}

// --- bringing work in: from a website, Instagram, a Drive folder, or the phone --------------------------------------
let found = [];                         // what was found, waiting for the artist to choose
let extra = null;                       // and the rest of an artist's website: about, CV, exhibitions (Open Studio sites say it plainly)
function importer() {
  if (!S.cloud && !S.preview) return `<div class="wrap gut st">${head('Bring work in')}${nav('import')}<p class="m">In the demo studio nothing is brought in. <a href="#/welcome">Join as an artist</a> to bring your own work from your website, Instagram, a Drive folder or your phone.</p></div>`;
  const site = S.artist.link || '';
  return `<div class="wrap gut st">${head('Bring work in')}${nav('import')}
    <p class="m">From wherever your work already is. You choose what comes in, and fix titles and sizes after, in Works.</p>
    <div class="im-ways">
      <form class="st-card im-way" data-kind="site"><h2>Your website</h2><p class="m small">We look at the page and its gallery pages for your images and their titles.</p>
        <label class="vh" for="imSite">Website address</label><input id="imSite" name="url" inputmode="url" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="yourname.com" value="${esc(site)}" required>
        <button class="btn f" type="submit">Find my work</button></form>
      <div class="st-card im-way" id="imIg"><h2>Instagram</h2><p class="m small" id="imIgSay">Connect your Instagram (a professional account, linked to a Facebook Page) and choose posts from it.</p>
        <div class="btns"><button class="btn f" type="button" id="imIgGo">Connect Instagram</button><button class="btn g" type="button" id="imIgOff" hidden>Disconnect</button></div>
        <details class="im-zip"><summary class="small">Or use Instagram’s download file</summary><p class="m small">In the Instagram app, <b>Settings → Accounts Centre → Your information and permissions → Download your information</b>, choose <b>Some of your information → Posts</b>, format <b>JSON</b>. Instagram emails you a file (.zip); choose it here.</p>
        <label class="btn g"><input type="file" accept=".zip,application/zip" id="imZip" hidden>Choose the Instagram file</label></details></div>
      <div class="st-card im-way"><h2>Google Drive</h2><p class="m small">Choose images of your work from your Drive. Open Studio sees only the ones you choose.</p>
        <div class="btns"><button class="btn f" type="button" id="imDriveGo">Choose from Google Drive</button></div>
        <details class="im-zip"><summary class="small">Or paste a shared folder link</summary>
        <form class="im-way" data-kind="drive"><p class="m small">A folder of images, shared as <b>Anyone with the link</b>.</p>
        <label class="vh" for="imDrive">Drive folder link</label><input id="imDrive" name="url" inputmode="url" placeholder="https://drive.google.com/drive/folders/…" required>
        <button class="btn g" type="submit">Find my work</button></form></details></div>
      <div class="st-card im-way"><h2>From your phone or computer</h2><p class="m small">Photos or image files of your works, straight on, the whole work in the picture.</p>
        <label class="btn g"><input type="file" accept="image/*" multiple id="imFiles" hidden>Choose images</label></div>
    </div>
    <section class="sec" id="imFound" aria-live="polite">${foundList()}</section>
  </div>`;
}
function foundList(msg = '') {
  if (!found.length) return msg ? `<p class="m">${msg}</p>` : '';
  const n = found.filter(x => x.on).length;
  const ex = extra ? [extra.about && (extra.about.statement || extra.about.bio) ? 'your statement, the about text and your portrait' : '', extra.cv.length ? `your CV (${extra.cv.length} lines)` : '',
    extra.exhibitions.length ? `${extra.exhibitions.length} exhibitions with their photos and works${extra.exhibitions.some(e => e.tour) ? ' (and their walkable tours)' : ''}` : '',
    (extra.objects || []).length ? `${extra.objects.length} ${extra.objects.length === 1 ? 'object' : 'objects'}` : ''].filter(Boolean) : [];
  return `${ex.length ? `<div class="st-card im-extra"><h3>Also on your website</h3><label class="im-check"><input type="checkbox" id="imExtra" ${extra.on ? 'checked' : ''}> Bring in ${ex.join(', ')}</label></div>` : ''}
    <div class="sec-h"><h2>Found ${found.length}</h2><button type="button" class="more" id="imAll">${n === found.length ? 'Choose none' : 'Choose all'}</button></div>${msg ? `<p class="m small">${msg}</p>` : ''}
    <div class="im-grid">${found.map((x, i) => `<div class="im-item${x.on ? ' on' : ''}"><label>${x.had ? '<span class="im-had">In your studio</span>' : ''}<input type="checkbox" data-i="${i}" ${x.on ? 'checked' : ''}><img src="${esc(x.preview || x.thumb || x.image)}" alt="" loading="lazy" referrerpolicy="no-referrer"></label>
      <input class="im-t" data-t="${i}" value="${esc(x.title || '')}" placeholder="Title" aria-label="Title"></div>`).join('')}</div>
    <div class="btns im-go"><button class="btn f" type="button" id="imAdd" ${n ? '' : 'disabled'}>Bring in ${n} ${n === 1 ? 'work' : 'works'}</button></div>`;
}
function wireImport(app, go) {
  const box = app.querySelector('#imFound'); if (!box) return;
  // what was found (or why not) is drawn under the four ways in: on a phone that is screens below the button
  // pressed, so an answer brings it into view
  const show = (msg, look) => { box.innerHTML = foundList(msg); wireFound(); if (look) box.scrollIntoView({ behavior: 'smooth', block: 'start' }); };
  const tell = msg => show(msg, true);
  const take = (items, from) => {
    if (from !== 'site') extra = null;
    found = items.map(x => { const had = S.works.some(w => same(w.title, x.title) && (!x.year || !w.year || String(w.year) === String(x.year))); return { ...x, on: !had, had, from }; });
    const fresh = found.filter(x => !x.had).length;
    tell(!items.length ? 'Nothing found there.' : !fresh ? 'Everything here is already in your studio. Bring in the rest of your website below, or choose works to bring in again.' : '');
  };
  if (S.preview) {   // the control room's preview: the page as a new artist sees it, nothing fetched or kept
    const say = e => { if (e) e.preventDefault(); tell('<span dir="rtl" lang="he">בתצוגה מקדימה לא מייבאים בפועל: כך נראה הדף לאמן חדש.</span>'); };
    app.querySelectorAll('form.im-way').forEach(f => f.onsubmit = say);
    app.querySelectorAll('#imIgGo, #imIgOff, #imDriveGo').forEach(b => b.onclick = () => say());
    app.querySelectorAll('#imZip, #imFiles').forEach(i => i.onchange = () => say());
    return;
  }
  app.querySelectorAll('form.im-way').forEach(f => f.onsubmit = async e => {
    e.preventDefault();
    const b = f.querySelector('button'); b.disabled = true; b.textContent = 'Looking…'; show('');
    try {
      const d = await cloud.find(f.dataset.kind, f.url.value.trim());
      extra = d.about || (d.cv && d.cv.length) || (d.exhibitions && d.exhibitions.length) || (d.objects && d.objects.length)
        ? { about: d.about || null, cv: d.cv || [], exhibitions: d.exhibitions || [], objects: d.objects || [], on: true } : null;
      take(d.items, f.dataset.kind);
    }
    catch (err) { tell(esc(err.message)); }
    b.disabled = false; b.textContent = 'Find my work';
  });
  const zip = app.querySelector('#imZip');
  if (zip) zip.onchange = async () => { if (!zip.files[0]) return; tell('Opening the Instagram file…'); try { take(await cloud.fromInstagramZip(zip.files[0]), 'instagram'); } catch (err) { tell('That file couldn’t be read: choose the .zip Instagram sent (JSON format).'); } };
  wireInstagram(app, tell, take);
  const drive = app.querySelector('#imDriveGo');
  if (drive) {
    cloud.prepareDrive().catch(() => {});
    drive.onclick = async () => {
      drive.disabled = true;
      try {
        const items = await cloud.fromDrive((i, n) => { drive.textContent = `Bringing ${i} of ${n} from Drive…`; });
        if (items.length) take(items, 'drive');
      } catch (e) { tell(esc(e.message)); }
      drive.disabled = false; drive.textContent = 'Choose from Google Drive';
    };
  }
  const files = app.querySelector('#imFiles');
  if (files) files.onchange = () => take([...files.files].map(f => ({ title: f.name.replace(/\.[a-z0-9]+$/i, '').replace(/[-_]+/g, ' '), blob: f, preview: URL.createObjectURL(f), source: 'phone' })), 'phone');
  function wireFound() {
    box.querySelectorAll('[data-i]').forEach(c => c.onchange = () => { found[+c.dataset.i].on = c.checked; c.closest('.im-item').classList.toggle('on', c.checked); const n = found.filter(x => x.on).length; const a = box.querySelector('#imAdd'); a.disabled = !n; a.textContent = `Bring in ${n} ${n === 1 ? 'work' : 'works'}`; });
    box.querySelectorAll('[data-t]').forEach(t => t.oninput = () => { found[+t.dataset.t].title = t.value; });
    const ex = box.querySelector('#imExtra'); if (ex) ex.onchange = () => { extra.on = ex.checked; };
    const all = box.querySelector('#imAll'); if (all) all.onclick = () => { const on = found.some(x => !x.on); found.forEach(x => x.on = on); show(); };
    const add = box.querySelector('#imAdd');
    if (add) add.onclick = async () => {
      const pick = found.filter(x => x.on); let done = 0, failed = 0; const added = [];
      add.disabled = true;
      for (const x of pick) {
        add.textContent = `Bringing in ${done + 1} of ${pick.length}…`;
        try {
          const blob = x.blob || await cloud.fetchImage(x.image);
          const up = await cloud.upload(blob);
          const { width, height } = sized(x.size, up.w, up.h);
          const work = { id: crypto.randomUUID(), title: (x.title || 'Untitled').trim(), year: x.year || '', medium: x.medium || '', width, height, depth: '', kind: 'work',
            image: up.image, thumb: up.thumb, source: x.from || x.source || '', framed: 'no', check: { W: up.w, H: up.h, long: Math.max(up.w, up.h), mean: 120, clipped: 0, sharp: 0.5, backdrop: false } };
          S.works.push(work); added.push(work);
          done++;
        } catch (e) { console.warn(e); failed++; }
      }
      let objects = 0;
      if (extra && extra.on) for (const o of extra.objects || []) {
        if (S.works.some(w => w.kind === 'object' && same(w.title, o.title))) continue;
        add.textContent = `Bringing in ${o.title}…`;
        try {
          const up = await cloud.upload(await cloud.fetchImage(o.image)), { width, height } = sized(o.size, up.w, up.h);
          S.works.push({ id: crypto.randomUUID(), title: o.title, year: o.year || '', medium: o.medium || '', width, height, depth: +o.depth || '', kind: 'object',
            image: up.image, thumb: up.thumb, source: 'site', framed: 'no', check: { W: up.w, H: up.h, long: Math.max(up.w, up.h), mean: 120, clipped: 0, sharp: 0.5, backdrop: false } });
          objects++;
        } catch (e) { console.warn(e); }
      }
      const more = extra && extra.on ? bringRest(extra) : [];
      if (objects) more.push(`${objects} ${objects === 1 ? 'object' : 'objects'}`);
      // a first exhibition in 3D, of what just came in (the works that have a size), to walk into and change
      const hangable = added.filter(w => +w.width && +w.height).slice(0, 12);
      let tour = null;
      if (hangable.length >= 2) {
        tour = { id: crypto.randomUUID(), title: `${S.artist.name || 'My'}: works`, room: hangable.some(w => +w.width > 200 || +w.height > 200) ? 'long-hall' : 'white-cube',
          paint: '', centre: 150, text: '', works: hangable.map(w => w.id), status: 'draft', slug: '' };
        S.virtual.push(tour);
      }
      await save();
      found = []; extra = null;
      show(`${done} ${done === 1 ? 'work' : 'works'} brought in${failed ? `; ${failed} couldn’t be fetched` : ''}${more.length ? `, and ${more.join(', ')}` : ''}.
        ${tour ? `<a class="btn f" href="#/studio/virtual/${tour.id}">Walk into your exhibition in 3D</a>` : ''}
        <a href="#/studio/works">See them in Works</a>${more.length ? ' · <a href="#/studio/exhibitions">Your exhibitions</a> · <a href="#/studio/profile">Your profile</a>' : ''}. Works without a size are left out of the 3D room: add their sizes in Works and they hang at their real size.`);
    };
  }
  wireFound();
}

// Instagram, connected through Facebook: Connect (then Facebook sends the artist back here with ?ig=…), Show my posts
const IG_BACK = { ok: '', cancelled: 'Instagram wasn’t connected.', noaccount: 'No Instagram account came with that sign-in: Instagram has to be a professional account, linked to a Facebook Page, and chosen when Facebook asks.', error: 'Instagram couldn’t be connected. Try again in a moment.' };
function wireInstagram(app, show, take) {
  const go = app.querySelector('#imIgGo'), off = app.querySelector('#imIgOff'), say = app.querySelector('#imIgSay'); if (!go) return;
  const back = new URLSearchParams(location.search).get('ig');
  if (back != null) history.replaceState(null, '', location.pathname + location.hash);
  let on = false;
  const posts = async () => {
    go.disabled = true; go.textContent = 'Looking…'; show('Bringing your posts from Instagram…');
    try { const d = await cloud.instagram('media'); take(d.items, 'instagram'); }
    catch (e) { if (e.reconnect) set(false); show(esc(e.message)); }
    go.disabled = false; go.textContent = on ? 'Show my posts' : 'Connect Instagram';
  };
  const set = (c, user) => {
    on = c; off.hidden = !c; go.textContent = c ? 'Show my posts' : 'Connect Instagram';
    say.textContent = c ? `Connected${user ? ` as @${user}` : ''}. Choose which posts come in.` : 'Connect your Instagram (a professional account, linked to a Facebook Page) and choose posts from it.';
  };
  go.onclick = async () => {
    if (on) return posts();
    go.disabled = true; go.textContent = 'Opening Facebook…';
    try { location.href = (await cloud.instagram('start')).url; }
    catch (e) { show(esc(e.message)); go.disabled = false; go.textContent = 'Connect Instagram'; }
  };
  off.onclick = async () => { off.disabled = true; try { await cloud.instagram('disconnect'); set(false); show('Instagram is disconnected.'); } catch (e) { show(esc(e.message)); } off.disabled = false; };
  cloud.instagram('status').then(d => { set(d.connected, d.username); if (back === 'ok' && d.connected) posts(); }).catch(() => {});
  if (back && back !== 'ok') show(IG_BACK[back] || IG_BACK.error);
}

// a size as a site writes it ("90x70", "70 × 90 cm"): which number is the height isn't said the same way everywhere, so
// the picture decides: the larger number goes to its longer side
function sized(text, w, h) {
  const [a, b] = (String(text || '').match(/\d+(?:\.\d+)?/g) || []).map(Number);
  if (!a || !b) return { width: '', height: '' };
  const big = Math.max(a, b), small = Math.min(a, b);
  return h > w ? { width: small, height: big } : w > h ? { width: big, height: small } : { width: a, height: b };
}
const same = (a, b) => String(a || '').trim().toLowerCase().replace(/^["“]|["”]$/g, '') === String(b || '').trim().toLowerCase().replace(/^["“]|["”]$/g, '');

// the rest of a website, into the studio: what the artist hasn't written yet is filled in; the CV is the site's;
// exhibitions not already here are added, with their installation photos (from which a walkable tour can be built)
function bringRest(x) {
  const a = S.artist, ab = x.about || {}, said = [];
  const fill = (k, v) => { if (v && !a[k]) { a[k] = v; return true; } return false; };
  if ([fill('statement', (ab.statement || '').replace(/^["“]|["”]$/g, '')), fill('bio', ab.bio), fill('photo', ab.photo), fill('discipline', ab.discipline), fill('city', ab.city), fill('instagram', ab.instagram)].some(Boolean)) said.push('your profile');
  if (x.cv.length) { a.cv = x.cv; said.push(`your CV (${x.cv.length} lines)`); }
  let n = 0;
  const ids = titles => (titles || []).map(t => (S.works.find(w => same(w.title, t)) || {}).id).filter(Boolean);
  for (const e of x.exhibitions) {
    const had = S.exhibitions.find(y => same(y.title, e.title));
    if (had) {    // completed from the site where the studio has nothing yet
      if (!had.works.length) had.works = ids(e.works);
      if (!had.city) had.city = e.city || '';
      if (e.tour && had.tour !== 'live') { had.tour = 'live'; had.space = { ...(had.space || {}), slug: e.tour }; }
      continue;
    }
    S.exhibitions.push({ id: crypto.randomUUID(), title: e.title, venue: e.venue, city: e.city || '', year: e.year, dates: e.dates, curator: '', text: e.text, works: ids(e.works),
      photos: e.photos.map(src => ({ src })), video: '', space: e.tour ? { slug: e.tour } : {}, tour: e.tour ? 'live' : 'none', cover: e.photos[0] || '' });
    n++;
  }
  if (n) said.push(`${n} ${n === 1 ? 'exhibition' : 'exhibitions'}`);
  return said;
}

// a live tour, to share anywhere: a link, and a frame for the artist's own website
const tourLink = ex => new URL(`#/exhibition/${ex.id}/space`, location.href.split('#')[0]).href;
const embed = ex => `<iframe src="${tourLink(ex)}" title="${ex.title}, a walkable tour" width="100%" height="560" style="border:0;border-radius:12px" allow="fullscreen; gyroscope; accelerometer" loading="lazy"></iframe>`;
function share(ex) {
  return `<div class="st-share"><h3>Share the tour</h3>
    <div class="st-copy"><input readonly value="${esc(tourLink(ex))}" aria-label="Link to the tour"><button class="btn g" type="button" data-copy="link">Copy link</button></div>
    <div class="st-copy"><input readonly value="${esc(embed(ex))}" aria-label="Code to show the tour on your website"><button class="btn g" type="button" data-copy="embed">Copy code</button></div>
    <p class="m small">Paste the code into your website, and visitors can walk through the show right there.</p></div>`;
}

function exhibitionPage(id) {
  const isNew = id === 'new';
  const ex = isNew ? { id: '', title: '', venue: '', city: '', year: String(new Date().getFullYear()), dates: '', curator: '', text: '', works: [], photos: [], video: '', space: {}, tour: 'none' }
    : S.exhibitions.find(x => x.id === id);
  if (!ex) return `<div class="wrap gut st">${head('Not found', '#/studio/exhibitions')}</div>`;
  const r = readiness(ex, S.works), sp = ex.space || {};
  const status = ex.real ? ex.real : null;
  return `<div class="wrap gut st">${head(isNew ? 'Add an exhibition' : ex.title, '#/studio/exhibitions')}
    ${isNew ? '' : `<section class="st-card">
      <div class="sec-h"><h2>Walkable tour</h2><span class="st-flag ${tourFlag(ex)[0]}">${tourFlag(ex)[1]}</span></div>
      ${status ? `<p class="m">${esc(status.summary)}</p>${checks(status.items)}`
        : `<p class="m">A tour is built from your installation photos and the works, then checked view by view before it goes up. This is what it still needs:</p>${checks(r.items)}`}
      ${!status && r.ready && ex.tour !== 'live' ? '<button class="btn f" type="button" id="buildTour">Build the tour</button>' : ''}
      ${ex.tour === 'building' ? '<p class="m small">Building: you\'ll get an email when it\'s ready, or what to add if it doesn\'t pass its checks.</p>' : ''}
      ${ex.tour === 'live' && ex.space && ex.space.slug ? `<p class="m">This exhibition has a walkable tour, built from its installation photos.</p><div class="btns"><a class="btn f" href="#/exhibition/${esc(ex.space.slug)}/space">Walk through the tour</a></div>` : ''}
      ${ex.tour === 'live' && ex.real ? share(ex) : ''}
    </section>`}
    <form class="st-form" id="exForm" data-id="${esc(ex.id)}">
      <label>Title<input name="title" required value="${esc(ex.title)}"></label>
      <div class="st-row"><label>Venue<input name="venue" value="${esc(ex.venue)}"></label><label>City<input name="city" value="${esc(ex.city)}"></label></div>
      <div class="st-row"><label>Dates<input name="dates" placeholder="12 Mar – 30 Apr 2026" value="${esc(ex.dates)}"></label><label>Curator<input name="curator" value="${esc(ex.curator)}"></label></div>
      <label>About the exhibition<textarea name="text" rows="5">${esc(ex.text)}</textarea></label>
      <fieldset><legend>Works in the show</legend>
        <div class="st-pick">${S.works.map(w => `<label><input type="checkbox" name="works" value="${w.id}" ${ex.works.includes(w.id) ? 'checked' : ''}><img src="${esc(w.thumb || w.image)}" alt=""><span>${esc(w.title)}</span></label>`).join('')}</div></fieldset>
      <fieldset><legend>Installation photos</legend>
        <div class="st-photos">${ex.photos.map((p, i) => `<figure><img src="${esc(p.src)}" alt="Installation photo ${i + 1}"><button type="button" data-delphoto="${i}" aria-label="Remove">×</button></figure>`).join('')}
          <label class="st-add"><input type="file" accept="image/*" multiple name="photos" hidden>+ Add photos</label></div>
        <p class="m small">Wide views, each with 2–3 works and a corner of the room, so that every wall is in at least two photos. Natural light, no people in front of the works.</p></fieldset>
      <fieldset><legend>Walk-through video (optional)</legend>
        <label class="st-add wide"><input type="file" accept="video/*" name="video" hidden>${ex.video ? '✓ ' + esc(ex.video) : '+ Add a video'}</label>
        <p class="m small">The surest way to a tour. Hold the phone sideways, walk slowly down the middle of the room and back, filming every wall, a minute or two. Turn slowly at the ends, with a little of the floor and ceiling in view.</p></fieldset>
      <fieldset><legend>The room (optional, makes the tour exact)</legend>
        <div class="st-row"><label>Ceiling height (m)<input name="ceiling" inputmode="decimal" placeholder="3.40" value="${esc(sp.ceiling || '')}"></label>
          <label>Works hung at, centre (cm)<input name="centre" inputmode="decimal" placeholder="150" value="${esc(sp.centre || '')}"></label></div>
        <div class="st-row"><label>Canvas depth (cm)<input name="depth" inputmode="decimal" placeholder="3.5" value="${esc(sp.depth || '')}"></label>
          <label>Floor<select name="floor">${['', 'Polished stone', 'Concrete', 'Wood', 'Carpet', 'Other'].map(f => `<option ${sp.floor === f ? 'selected' : ''}>${f}</option>`).join('')}</select></label></div>
        <div class="st-row"><label>Light<select name="light">${['', 'Spotlights', 'Daylight', 'Both'].map(f => `<option ${sp.light === f ? 'selected' : ''}>${f}</option>`).join('')}</select></label>
          <label>Walls<select name="walls">${['', 'White', 'Coloured', 'Mixed'].map(f => `<option ${sp.walls === f ? 'selected' : ''}>${f}</option>`).join('')}</select></label></div>
        <label>Room size, if measured (m)<input name="room" placeholder="12.4 × 6.1" value="${esc(sp.room || '')}"></label>
        <p class="m small">A laser measure gives the room's size in seconds; one measured height (the centre of one work above the floor) fixes the whole room's scale.</p></fieldset>
      <div class="btns"><button class="btn f" type="submit">Save</button>${isNew ? '' : '<button class="btn g" type="button" id="delEx">Delete</button>'}</div>
    </form>
  </div>`;
}

// a CV as the site keeps it: lines in groups (Education, Solo Exhibitions...), each with its year
const cvList = cv => {
  const groups = [...new Set(cv.map(l => l.group || ''))];
  return groups.map(g => `<section class="cv-g">${g ? `<h3>${esc(g)}</h3>` : ''}<dl>${cv.filter(l => (l.group || '') === g).map(l => `<div><dt>${esc(l.year)}</dt><dd>${esc(l.title)}${l.venue ? `<span>${esc(l.venue)}</span>` : ''}</dd></div>`).join('')}</dl></section>`).join('');
};

function profile() {
  const a = S.artist;
  return `<div class="wrap gut st">${head('Profile')}${nav('profile')}
    <form class="st-form" id="profForm">
      <label class="st-avatar"><input type="file" accept="image/*" name="photo" hidden><img src="${esc(a.photo || '')}" alt="" ${a.photo ? '' : 'hidden'}><span ${a.photo ? 'hidden' : ''}>+ Photo</span></label>
      <label>Name<input name="name" required value="${esc(a.name)}"></label>
      <div class="st-row"><label>Discipline<input name="discipline" placeholder="Painter" value="${esc(a.discipline)}"></label><label>City<input name="city" value="${esc(a.city)}"></label></div>
      <label>Artist statement<textarea name="statement" rows="4" placeholder="A few sentences, in your own voice: what you make and why.">${esc(a.statement)}</textarea></label>
      <label>Bio<textarea name="bio" rows="5" placeholder="Studies, shows, residencies...">${esc(a.bio)}</textarea></label>
      <label>Website or Instagram<input name="link" value="${esc(a.link)}"></label>
      <div class="btns"><button class="btn f" type="submit">Save</button><a class="btn g" href="#/studio/preview">See your page</a></div>
    </form>
    ${(a.cv || []).length ? `<section class="sec"><div class="sec-h"><h2>CV</h2><span class="more">from your website</span></div><div class="cv">${cvList(a.cv)}</div>
      <p class="m small">Bring your website in again to update it.</p></section>` : ''}
  </div>`;
}

function preview() {
  const a = S.artist;
  return `<div class="st-preview-bar gut"><span class="tag">Preview: your page, as visitors see it</span><a class="more" href="#/studio">Back to studio</a></div>
  <section class="hero">${a.cover || (S.works[0] && S.works[0].image) ? `<img src="${esc(a.cover || S.works[0].image)}" alt="">` : ''}<div class="ov gut"><div class="wrap"><h1>${esc(a.name)}</h1><div class="k">${esc([a.discipline, a.city].filter(Boolean).join(' · '))}</div></div></div></section>
  <div class="wrap gut">
    ${a.statement ? `<p class="statement">“${esc(a.statement)}”</p>` : ''}
    ${byYear(S.works).map(([y, ws]) => `<section class="sec"><div class="sec-h"><h2>${esc(y)}</h2><span class="more">${ws.length}</span></div>
      <div class="grid">${ws.map(w => `<div><div class="im"><img src="${esc(w.thumb || w.image)}" alt="${esc(w.title)}"></div><div class="c"><b>${esc(w.title)}</b><div class="m">${esc(detail(w))}</div></div></div>`).join('')}</div></section>`).join('')}
    ${S.exhibitions.length ? `<section class="sec"><div class="sec-h"><h2>Exhibitions</h2></div><div class="covers">${S.exhibitions.map(ex => `<div><img src="${esc(ex.cover || (ex.photos[0] || {}).src || '')}" alt=""><div><b>${esc(ex.title)}</b><div class="m">${esc([ex.venue, ex.year].filter(Boolean).join(' · '))}</div></div></div>`).join('')}</div></section>` : ''}
    ${a.bio || a.photo ? `<section class="sec st-about"><div class="sec-h"><h2>About</h2></div>${a.photo ? `<img class="st-portrait" src="${esc(a.photo)}" alt="${esc(a.name)}">` : ''}${a.bio ? `<div class="prose">${a.bio.split(/\n+/).map(p => `<p>${esc(p)}</p>`).join('')}</div>` : ''}</section>` : ''}
    ${(a.cv || []).length ? `<section class="sec"><div class="sec-h"><h2>CV</h2></div><div class="cv">${cvList(a.cv)}</div></section>` : ''}
  </div>`;
}

// --- reading files ----------------------------------------------------------------------------------------
const asDataURL = (file, edge = 1600) => new Promise((res, rej) => {
  const url = URL.createObjectURL(file), i = new Image();
  i.onload = () => {
    const s = Math.min(1, edge / Math.max(i.naturalWidth, i.naturalHeight)), c = document.createElement('canvas');
    c.width = Math.round(i.naturalWidth * s); c.height = Math.round(i.naturalHeight * s);
    c.getContext('2d').drawImage(i, 0, 0, c.width, c.height); URL.revokeObjectURL(url); res(c.toDataURL('image/jpeg', 0.85));
  };
  i.onerror = rej; i.src = url;
});

// --- wiring -----------------------------------------------------------------------------------------------
function wire(app, go) {
  const $ = s => app.querySelector(s);
  const si = $('#signin');
  if (si) si.onsubmit = e => {
    e.preventDefault();
    si.innerHTML = `<p class="st-sent">Check your email: we sent a sign-in link to <b>${esc(new FormData(si).get('email'))}</b>.</p><p class="m small">(In this prototype nothing is sent: open the demo studio to look around.)</p>`;
  };
  const di = $('#demoIn');
  if (di) di.onclick = async () => { S = await demoArtist(); save(); go('#/studio'); };
  const ri = $('#realIn');
  if (ri) ri.onclick = async () => { S = await realArtist(model); save(); go('#/studio'); };
  const so = $('#signOut');
  if (so) so.onclick = async () => {
    if (S && S.cloud) { const { client } = await import('./auth.js'); await (await client()).auth.signOut(); S = null; go('#/welcome'); return; }
    try { localStorage.removeItem(KEY); } catch {} S = null; go('#/studio');
  };
  // a new artist's page
  const su = $('#setup');
  if (su) su.onsubmit = async e => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(su)), b = su.querySelector('button[type=submit]');
    b.disabled = true; b.textContent = 'Making your page…';
    if (previewing()) {
      S = { preview: true, cloud: false, status: 'pending', note: '', artist: { name: f.name, discipline: f.discipline || '', city: f.city || '', photo: '', statement: '', bio: '', link: f.link || '', instagram: f.instagram || '', cover: '' }, works: [], exhibitions: [], virtual: [] };
      return go('#/studio/import');
    }
    try { S = await cloud.create(f); go('#/studio/import'); }
    catch (err) { b.disabled = false; b.textContent = 'Make my page'; su.querySelector('.err').textContent = err.message; }
  };
  wireImport(app, go);
  const pub = $('#vxPub');
  if (pub) pub.onclick = () => { const v = S.virtual.find(x => x.id === $('#vxForm').dataset.id); if (!v) return; v.status = v.status === 'published' ? 'draft' : 'published'; save(); go(`#/studio/virtual/${v.id}`, true); };

  const wf = $('#workForm');
  if (wf) {
    let pending = null;
    const file = wf.querySelector('input[type=file]');
    const sizeNow = () => ({ width: +wf.width.value, height: +wf.height.value });
    const refresh = () => { const w = wf.dataset.id && S.works.find(x => x.id === wf.dataset.id); $('#wChecks').innerHTML = checks(verdict(pending ? pending.check : w ? w.check : null, sizeNow())); };
    file.onchange = async () => {
      if (!file.files[0]) return;
      $('#wChecks').innerHTML = '<p class="m small">Checking the image…</p>';
      try {
        const m = await checkImage(file.files[0]);
        pending = { check: { W: m.W, H: m.H, long: m.long, mean: m.mean, clipped: m.clipped, sharp: m.sharp, backdrop: m.backdrop }, thumb: await asDataURL(file.files[0]) };
        $('#wPreview').src = pending.thumb; $('#wPreview').hidden = false; $('#wDropText').hidden = true;
      } catch { $('#wChecks').innerHTML = checks([['no', "This file couldn't be read as an image."]]); return; }
      refresh();
    };
    wf.width.oninput = wf.height.oninput = refresh;
    wf.onsubmit = e => {
      e.preventDefault();
      const f = new FormData(wf), id = wf.dataset.id || uid();
      const old = S.works.find(x => x.id === id) || {};
      const w = { ...old, id, title: f.get('title').trim(), year: f.get('year'), medium: f.get('medium'), width: +f.get('width') || '', height: +f.get('height') || '', depth: +f.get('depth') || '', framed: f.get('framed'), ...(pending || {}) };
      if (!old.id) S.works.unshift(w); else Object.assign(old, w);
      save(); go('#/studio/works');
    };
    const del = $('#delWork');
    if (del) del.onclick = () => { if (!confirm('Delete this work?')) return; S.works = S.works.filter(x => x.id !== wf.dataset.id); S.exhibitions.forEach(ex => ex.works = ex.works.filter(i => i !== wf.dataset.id)); save(); go('#/studio/works'); };
  }

  const vx = $('#vxForm');
  if (vx) {
    const id = vx.dataset.id;
    let v = id ? S.virtual.find(x => x.id === id) : null;
    const keep = () => {
      const f = new FormData(vx);
      const data = { title: f.get('title').trim(), room: f.get('room'), paint: f.get('paint'), centre: +f.get('centre'), text: f.get('text') };
      if (!v) { v = { id: uid(), works: [], ...data }; (S.virtual = S.virtual || []).unshift(v); vx.dataset.id = v.id; history.replaceState(null, '', `#/studio/virtual/${v.id}`); }
      else Object.assign(v, data);
      save(); return v;
    };
    // (a change redraws the screen where the artist is, not at its top)
    const redo = () => { if (restoreY == null) restoreY = scrollY; go(`#/studio/virtual/${keep().id}`, true); };
    vx.querySelectorAll('input[name=room], input[name=paint]').forEach(i => i.onchange = () => {
      if (i.name === 'room') { const p = vx.querySelector('input[name=paint]:checked'); if (p && p.value === ROOMS[(v || {}).room || 'white-cube'].paint) p.checked = false; }
      redo();
    });
    const c = vx.querySelector('input[name=centre]');
    c.oninput = () => { $('#vxCentre').textContent = `${c.value} cm from the floor to the middle of each work`; };
    c.onchange = () => { keep(); fitNote(app, v); };
    vx.querySelectorAll('[data-add]').forEach(b => b.onchange = () => { addOpen = true; restoreY = scrollY; keep().works.push(b.dataset.add); redo(); });
    const ad = vx.querySelector('.vx-add'); if (ad) ad.ontoggle = () => { addOpen = ad.open; };
    vx.querySelectorAll('[data-up],[data-down],[data-out]').forEach(b => b.onclick = () => {
      const w = keep().works, i = +(b.dataset.up ?? b.dataset.down ?? b.dataset.out);
      if (b.dataset.out != null) w.splice(i, 1); else { const j = b.dataset.up != null ? i - 1 : i + 1; [w[i], w[j]] = [w[j], w[i]]; }
      redo();
    });
    vx.onsubmit = e => { e.preventDefault(); keep(); go('#/studio/exhibitions'); };
    const walk = $('#vxWalk');
    if (walk) walk.onclick = async () => { walk.disabled = true; walk.textContent = 'Building the room…'; try { await walkIn(keep()); } finally { walk.disabled = false; walk.textContent = 'Walk in'; } };
    const del = $('#vxDel');
    if (del) del.onclick = () => { if (!confirm('Delete this virtual exhibition?')) return; S.virtual = S.virtual.filter(x => x.id !== id); save(); go('#/studio/exhibitions'); };
    if (v) fitNote(app, v);
  }
  const xf = $('#exForm');
  if (xf) {
    const id = xf.dataset.id, ex = id ? S.exhibitions.find(x => x.id === id) : null;
    const photos = ex ? ex.photos.slice() : [];
    let video = ex ? ex.video : '';
    xf.querySelector('input[name=photos]').onchange = async e => {
      for (const f of e.target.files) photos.push({ src: await asDataURL(f, 1400), name: f.name });
      store(false); go(location.hash, true);
    };
    xf.querySelector('input[name=video]').onchange = e => { const f = e.target.files[0]; if (f) { video = f.name; store(false); go(location.hash, true); } };
    xf.querySelectorAll('[data-delphoto]').forEach(b => b.onclick = () => { photos.splice(+b.dataset.delphoto, 1); store(false); go(location.hash, true); });
    function store(leave = true) {
      const f = new FormData(xf);
      const data = { title: f.get('title').trim() || 'Untitled exhibition', venue: f.get('venue'), city: f.get('city'), dates: f.get('dates'), curator: f.get('curator'), text: f.get('text'),
        works: f.getAll('works'), photos, video, year: (f.get('dates').match(/\d{4}/) || [String(new Date().getFullYear())])[0],
        space: { ceiling: f.get('ceiling'), centre: f.get('centre'), depth: f.get('depth'), floor: f.get('floor'), light: f.get('light'), walls: f.get('walls'), room: f.get('room') } };
      let target = ex;
      if (!target) { target = { id: uid(), tour: 'none', ...data }; S.exhibitions.unshift(target); xf.dataset.id = target.id; if (!leave) history.replaceState(null, '', `#/studio/exhibition/${target.id}`); }
      else Object.assign(target, data);
      save();
      if (leave) go(`#/studio/exhibition/${target.id}`);
    }
    xf.onsubmit = e => { e.preventDefault(); store(true); };
    const del = $('#delEx');
    if (del) del.onclick = () => { if (!confirm('Delete this exhibition?')) return; S.exhibitions = S.exhibitions.filter(x => x.id !== id); save(); go('#/studio/exhibitions'); };
  }
  app.querySelectorAll('[data-copy]').forEach(b => b.onclick = async () => {
    const input = b.previousElementSibling;
    try { await navigator.clipboard.writeText(input.value); } catch { input.select(); document.execCommand('copy'); }
    const t = b.textContent; b.textContent = 'Copied'; setTimeout(() => { b.textContent = t; }, 1600);
  });
  const bt = $('#buildTour');
  if (bt) bt.onclick = () => { const ex = S.exhibitions.find(x => location.hash.endsWith(x.id)); if (ex) { ex.tour = 'building'; save(); go(location.hash, true); } };

  const pf = $('#profForm');
  if (pf) {
    pf.querySelector('input[name=photo]').onchange = async e => { const f = e.target.files[0]; if (!f) return; S.artist.photo = await asDataURL(f, 800); save(); go(location.hash, true); };
    pf.onsubmit = e => {
      e.preventDefault();
      const f = new FormData(pf);
      Object.assign(S.artist, { name: f.get('name').trim(), discipline: f.get('discipline'), city: f.get('city'), statement: f.get('statement').trim(), bio: f.get('bio').trim(), link: f.get('link') });
      save(); go('#/studio');
    };
  }
}

// the artist's side answers every #/studio route
// the real artist's studio, from the app's own content and each exhibition's tour status
async function realArtist(M) {
  const a = M.artist;
  const works = M.works.filter(w => w.artist === a).map(w => {
    const [width, height] = w.pairs && w.pairs[0] ? w.pairs[0] : ['', ''];
    return { id: w.slug, title: w.title, year: w.year, medium: w.medium, width, height, depth: '', framed: 'no', image: w.image,
      check: { W: 2000, H: 2000, long: 2000, mean: 120, clipped: 0, sharp: 0.5, backdrop: false } };
  });
  const exhibitions = await Promise.all(M.exhibitions.filter(e => !e.virtual && (e.artists || [e.artist]).includes(a)).map(async e => {
    const st = await fetch(`data/spaces/${e.slug}.status.json`).then(r => r.ok ? r.json() : null).catch(() => null);
    return { id: e.slug, title: e.title, venue: (e.venue || '').split(' — ')[0], city: e.city || '', year: e.year, dates: e.dates || '', curator: '', text: (e.text || []).join('\n\n'),
      works: e.works.map(w => w.slug), photos: (e.images || []).map(src => ({ src })), video: '', space: {}, cover: (e.images || [])[0],
      tour: e.space ? 'live' : st && st.state === 'building' ? 'building' : 'none', real: st };
  }));
  // the virtual exhibitions already designed for this artist (data/virtual.json)
  const virtual = M.exhibitions.filter(e => e.virtual && e.virtual.kind === 'artist' && e.artist === a).map(e => ({ id: e.slug, title: e.title,
    room: e.virtual.room, paint: e.virtual.paint, centre: e.virtual.centre, works: e.works.map(w => w.slug).filter(s => works.some(w => w.id === s)), text: e.text.join('\n\n') }));
  return { artist: { name: a.name, discipline: a.discipline || 'Painter', city: a.city, photo: a.portrait, statement: a.statement, bio: '', link: '', cover: a.hero }, works, exhibitions, virtual };
}

export async function studio(hash, app, go, M) {
  model = M || null;
  // signed in as an artist: the studio is the account's own, in the database
  const u = me();
  if (previewing() && u && u.role === 'artist') {           // the preview's new artist: a page made here, kept nowhere
    if (!(S && S.preview)) { app.innerHTML = setup(u); wire(app, go); return; }
  } else if (S && S.preview) S = null;
  if (!previewing() && u && u.role === 'artist' && !(S && S.cloud && S.uid === u.id)) {
    cloud = cloud || await import('./studio-cloud.js');
    app.innerHTML = '<div class="wrap gut st"><p class="m">Opening your studio…</p></div>';
    try { S = await cloud.load(); if (S) S.uid = u.id; } catch (e) { console.error(e); S = null; }
    if (!S) { app.innerHTML = setup(u); wire(app, go); return; }
  } else if (!(u && u.role === 'artist')) load();
  const m = hash.replace(/^#\/studio\/?/, '');
  let html;
  if (!S) html = signIn();
  else if (!m) html = home();
  else if (m === 'works') html = works();
  else if (m === 'works/new') html = workForm(null);
  else if (m.startsWith('work/')) html = workForm(m.slice(5));
  else if (m === 'exhibitions/new') html = exhibitionPage('new');
  else if (m.startsWith('exhibition/')) html = exhibitionPage(m.slice(11));
  else if (m.startsWith('virtual/') || m === 'exhibitions') {
    ({ ROOMS, PAINTS } = await synth());
    html = m === 'exhibitions' ? exhibitions() : designer(m.slice(8));
  }
  else if (m === 'import') html = importer();
  else if (m === 'profile') html = profile();
  else if (m === 'preview') html = preview();
  else html = home();
  app.innerHTML = html;
  wire(app, go);
  if (restoreY != null) { const y = restoreY; restoreY = null; requestAnimationFrame(() => scrollTo({ top: y, behavior: 'instant' })); }
}
