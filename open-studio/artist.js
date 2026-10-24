// Open Studio for Artists: the artist's side of the app. Sign in, a profile (photo, statement, bio), works
// (added with an instant check of the image and the details), exhibitions (with what a walkable tour still
// needs, in plain words, and the room's details the artist can add), and a preview as visitors see it.
//
// A prototype: what an artist enters is kept in this browser (localStorage). It starts from a fictional demo
// artist, so every screen has something on it; "Elad Amsalem" shows the real exhibitions' tour status, as the
// space pipeline measured it (data/spaces/<slug>.status.json).

const KEY = 'os-artist-v1';
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const uid = () => Math.random().toString(36).slice(2, 9);

let S = null;                        // the signed-in artist's studio, or null
let demo = null;                     // the demo artist, as shipped
let model = null;                    // the visitors' app's own content (the real artist)

function load() {
  try { S = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { S = null; }
  return S;
}
function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch { /* private window: kept for this visit */ } }

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
const head = (title, back) => `<div class="st-head">${back ? `<a class="back" href="${back}">← Back</a>` : '<span></span>'}<span class="tag">Open Studio for Artists</span></div><h1 class="st-h1">${esc(title)}</h1>`;
const nav = cur => `<nav class="st-nav" aria-label="Studio">${[['', 'Home'], ['works', 'Works'], ['exhibitions', 'Exhibitions'], ['profile', 'Profile']].map(([k, t]) => `<a href="#/studio${k ? '/' + k : ''}" ${cur === k ? 'aria-current="page"' : ''}>${t}</a>`).join('')}</nav>`;

function signIn() {
  return `<div class="wrap gut st">
    <div class="st-head"><a class="back" href="#/">← Open Studio</a><span class="tag">For Artists</span></div>
    <div class="st-hero"><h1 class="st-h1">Your studio,<br>open to everyone.</h1>
      <p class="m">Your works at their real size, your exhibitions as albums, and the shows themselves as rooms anyone can walk through, built from your installation photos.</p></div>
    <form class="st-form" id="signin">
      <label>Email<input type="email" name="email" required autocomplete="email" placeholder="you@studio.com"></label>
      <button class="btn f" type="submit">Send me a sign-in link</button>
      <p class="m small">No password: we email a link that signs you in.</p>
    </form>
    <div class="st-or"><span>or look around first</span></div>
    <button class="btn g" type="button" id="demoIn">Open the demo studio</button>
    <p class="m small">A made-up artist with made-up works, to show how it all works.</p>
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
  return `<div class="wrap gut st">${head(`Hello, ${S.artist.name.split(' ')[0]}`)}${nav('')}
    <div class="st-stats">
      <div><b>${S.works.length}</b><span>works</span></div>
      <div><b>${S.exhibitions.length}</b><span>exhibitions</span></div>
      <div><b>${S.exhibitions.filter(e => e.tour === 'live').length}</b><span>walkable tours</span></div>
    </div>
    <section class="sec"><div class="sec-h"><h2>To do</h2></div>
      ${todo.length ? `<div class="list">${todo.map(([t, h]) => `<a class="st-todo" href="${h}">${esc(t)}<span aria-hidden="true">→</span></a>`).join('')}</div>` : '<p class="m">Nothing: everything is in order.</p>'}
    </section>
    <section class="sec"><div class="sec-h"><h2>Quick add</h2></div>
      <div class="btns"><a class="btn f" href="#/studio/works/new">Add a work</a><a class="btn g" href="#/studio/exhibitions/new">Add an exhibition</a><a class="btn g" href="#/studio/preview">See your page</a></div>
      <p class="m small">${ready} of ${S.works.length} works are ready for a walkable tour.</p>
    </section>
    <section class="sec"><button type="button" class="more" id="signOut">Sign out</button></section>
  </div>`;
}

function works() {
  return `<div class="wrap gut st">${head('Works')}${nav('works')}
    <div class="btns" style="padding-block:6px 18px"><a class="btn f" href="#/studio/works/new">Add a work</a></div>
    <div class="grid">${S.works.map(w => {
      const v = w.check ? verdict(w.check, w) : verdict(null, w), ok = tourReady(v);
      return `<a href="#/studio/work/${w.id}"><div class="im"><img src="${esc(w.thumb || w.image)}" alt="" loading="lazy"></div>
        <div class="c"><b>${esc(w.title)}</b><div class="m">${esc([w.year, w.width && w.height ? `${w.width} × ${w.height} cm` : ''].filter(Boolean).join(' · '))}</div>
        <div class="st-flag ${ok ? 'ok' : 'no'}">${ok ? 'Ready' : 'Needs attention'}</div></div></a>`;
    }).join('')}</div>
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
    <div class="btns" style="padding-block:6px 18px"><a class="btn f" href="#/studio/exhibitions/new">Add an exhibition</a></div>
    <div class="list">${S.exhibitions.map(ex => {
      return `<a class="row" href="#/studio/exhibition/${ex.id}"><img src="${esc(ex.cover || (ex.photos[0] || {}).src || '')}" alt=""><div class="t"><div><b>${esc(ex.title)}</b></div><div class="m">${esc([ex.venue, ex.year].filter(Boolean).join(' · '))}</div></div>
        <span class="st-flag ${tourFlag(ex)[0]}">${tourFlag(ex)[1]}</span></a>`;
    }).join('')}</div>
  </div>`;
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
        <p class="m small">Walk slowly round the room once, filming every wall, a minute or two. The surest way to a tour.</p></fieldset>
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
  </div>`;
}

function preview() {
  const a = S.artist;
  return `<div class="st-preview-bar gut"><span class="tag">Preview: your page, as visitors see it</span><a class="more" href="#/studio">Back to studio</a></div>
  <section class="hero">${a.cover || (S.works[0] && S.works[0].image) ? `<img src="${esc(a.cover || S.works[0].image)}" alt="">` : ''}<div class="ov gut"><div class="wrap"><div class="k">${esc([a.discipline, a.city].filter(Boolean).join(' · '))}</div><h1>${esc(a.name)}</h1></div></div></section>
  <div class="wrap gut">
    ${a.statement ? `<p class="statement">“${esc(a.statement)}”</p>` : ''}
    <section class="sec"><div class="sec-h"><h2>Works</h2></div>
      <div class="grid">${S.works.map(w => `<div><div class="im"><img src="${esc(w.thumb || w.image)}" alt="${esc(w.title)}"></div><div class="c"><b>${esc(w.title)}</b><div class="m">${esc([w.medium, w.width && w.height ? `${w.width} × ${w.height} cm` : '', w.year].filter(Boolean).join(' · '))}</div></div></div>`).join('')}</div></section>
    ${S.exhibitions.length ? `<section class="sec"><div class="sec-h"><h2>Exhibitions</h2></div><div class="covers">${S.exhibitions.map(ex => `<div><img src="${esc(ex.cover || (ex.photos[0] || {}).src || '')}" alt=""><div><b>${esc(ex.title)}</b><div class="m">${esc([ex.venue, ex.year].filter(Boolean).join(' · '))}</div></div></div>`).join('')}</div></section>` : ''}
    ${a.bio ? `<section class="sec"><div class="sec-h"><h2>About</h2></div><div class="prose"><p>${esc(a.bio)}</p></div></section>` : ''}
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
  if (so) so.onclick = () => { try { localStorage.removeItem(KEY); } catch {} S = null; go('#/studio'); };

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
  const works = M.works.map(w => {
    const [width, height] = w.pairs && w.pairs[0] ? w.pairs[0] : ['', ''];
    return { id: w.slug, title: w.title, year: w.year, medium: w.medium, width, height, depth: '', framed: 'no', image: w.image,
      check: { W: 2000, H: 2000, long: 2000, mean: 120, clipped: 0, sharp: 0.5, backdrop: false } };
  });
  const exhibitions = await Promise.all(M.exhibitions.map(async e => {
    const st = await fetch(`data/spaces/${e.slug}.status.json`).then(r => r.ok ? r.json() : null).catch(() => null);
    return { id: e.slug, title: e.title, venue: (e.venue || '').split(' — ')[0], city: e.city || '', year: e.year, dates: e.dates || '', curator: '', text: (e.text || []).join('\n\n'),
      works: e.works.map(w => w.slug), photos: (e.images || []).map(src => ({ src })), video: '', space: {}, cover: (e.images || [])[0],
      tour: e.space ? 'live' : st && st.state === 'building' ? 'building' : 'none', real: st };
  }));
  return { artist: { name: a.name, discipline: a.discipline || 'Painter', city: a.city, photo: a.portrait, statement: a.statement, bio: '', link: '', cover: a.hero }, works, exhibitions };
}

export async function studio(hash, app, go, M) {
  model = M || null;
  load();
  const m = hash.replace(/^#\/studio\/?/, '');
  let html;
  if (!S) html = signIn();
  else if (!m) html = home();
  else if (m === 'works') html = works();
  else if (m === 'works/new') html = workForm(null);
  else if (m.startsWith('work/')) html = workForm(m.slice(5));
  else if (m === 'exhibitions') html = exhibitions();
  else if (m === 'exhibitions/new') html = exhibitionPage('new');
  else if (m.startsWith('exhibition/')) html = exhibitionPage(m.slice(11));
  else if (m === 'profile') html = profile();
  else if (m === 'preview') html = preview();
  else html = home();
  app.innerHTML = html;
  wire(app, go);
}
