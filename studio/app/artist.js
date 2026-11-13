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
  if (ex.tour === 'requested') return ['ok', 'Tour requested'];
  if (ex.tour === 'more') return ['no', 'Needs more material'];
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
  const extra = ex.tourFiles || [], photos = ex.photos.length + extra.filter(f => f.kind === 'photo').length, video = ex.video || extra.some(f => f.kind === 'video');
  items.push(inShow.length ? ['ok', `${inShow.length} works in the show.`] : ['no', 'Add the works that were in the show.']);
  if (noSize.length) items.push(['no', `${noSize.length} ${noSize.length === 1 ? 'work needs its' : 'works need their'} size: ${noSize.map(w => w.title).join(', ')}.`]);
  if (small.length) items.push(['no', `${small.length} ${small.length === 1 ? 'image is' : 'images are'} too small: ${small.map(w => w.title).join(', ')}.`]);
  items.push(photos >= 10 ? ['ok', `${photos} installation photos.`]
    : photos >= 6 ? ['warn', `${photos} installation photos: enough to try. 10 or more, every wall in two of them, makes it reliable.`]
    : ['no', `${photos} installation photos: at least 6 are needed (10 or more is better), wide, with 2–3 works and a corner of the room in each.`]);
  if (video) items.push(['ok', 'A walk-through video: the tour can be built from it.']);
  else items.push(['warn', 'Optional, and the surest way: a slow walk-through video of a minute or two, filming every wall.']);
  const sp = ex.space || {};
  items.push(sp.ceiling || sp.centre || sp.depth ? ['ok', 'Room details added: they make the tour more exact.'] : ['warn', 'Optional: the room details below (ceiling height, canvas depth...) make the tour more exact.']);
  const blocking = items.filter(([l]) => l === 'no').length;
  return { items, blocking, ready: !blocking };
}

// --- screens --------------------------------------------------------------------------------------------
// (a studio page without a page to go back to leads out to the app itself, its Home)
const head = (title, back) => `<div class="st-head"><a class="back" href="${back || '#/'}">← ${back ? 'Back' : 'Open Studio'}</a><span class="tag">Open Studio for Artists</span></div><h1 class="st-h1">${esc(title)}</h1>`;
const nav = cur => `<nav class="st-nav" aria-label="Studio">${[['', 'Your page'], ['onview', 'Make an exhibition'], ['exhibitions', 'Past exhibitions'], ['import', 'Bring work in']].map(([k, t]) => `<a href="#/studio${k ? '/' + k : ''}" ${cur === k ? 'aria-current="page"' : ''}>${t}</a>`).join('')}</nav>`;

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

// works in groups, as an artist's site shows them: the newest year first, objects apart
function byYear(list) {
  const objects = list.filter(w => w.kind === 'object'), wall = list.filter(w => w.kind !== 'object');
  const years = [...new Set(wall.map(w => String(w.year || '').slice(0, 4) || 'Undated'))].sort((a, b) => (b === 'Undated') - (a === 'Undated') || +b - +a);
  return [...years.map(y => [y, wall.filter(w => (String(w.year || '').slice(0, 4) || 'Undated') === y)]), ...(objects.length ? [['Objects', objects]] : [])];
}
const detail = w => [w.medium, w.width && w.height ? `${w.height} × ${w.width}${w.depth ? ` × ${w.depth}` : ''} cm` : '', w.kind === 'object' ? w.year : ''].filter(Boolean).join(' · ');

function exhibitions() {
  return `<div class="wrap gut st">${head('Exhibitions')}${nav('exhibitions')}
    <div class="btns" style="padding-block:6px 18px"><a class="btn f" href="#/studio/exhibitions/new">Add an exhibition</a><a class="btn g" href="#/studio/virtual/new">Design a virtual exhibition</a></div>
    ${(S.virtual || []).length ? `<section class="sec" style="padding-top:0"><div class="sec-h"><h2>Virtual</h2><span class="more">rooms that exist only here</span></div><div class="list">${S.virtual.map(v => `<a class="row" href="${v.onview ? '#/studio/onview' : `#/studio/virtual/${v.id}`}"><img src="${esc(thumbOf(v.works[0]))}" alt=""><div class="t"><div><b>${esc(v.title || 'Untitled')}</b></div><div class="m">${esc(roomName(v.room))} · ${v.works.length} works</div></div><span class="st-flag ok">${v.onview ? 'On view' : 'Virtual'}</span></a>`).join('')}</div></section>` : ''}
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
let ROOMS = {}, PAINTS = {}, ACTIVE = [];
const roomName = r => (ROOMS[r] || {}).name || 'A virtual room';
const workOf = id => S.works.find(w => w.id === id);
const thumbOf = id => { const w = workOf(id); return w ? srcOf(w.thumb || w.image) : ''; };
const srcOf = p => (model && model.media && model.media[p]) || p;
const plan = (r, on) => {
  const k = 64 / Math.max(r.w, r.d), W = r.w * k, D = r.d * k, d = r.door * k;
  return `<svg viewBox="-3 -3 ${W + 6} ${D + 6}" width="${W + 6}" height="${D + 6}" aria-hidden="true"><path d="M${W} ${D / 2 + d / 2}V${D}H0V0H${W}V${D / 2 - d / 2}" fill="${on ? 'var(--card)' : 'none'}" stroke="currentColor" stroke-width="1.5"/></svg>`;
};
// On View: the artist's exhibition now, in one of the ten spaces, at the top of their page
const kindsOf = keep => { const k = {}; for (const [slug, r] of Object.entries(ROOMS)) if (r.baked && !r.cells && (!r.archived || r.kind === keep)) (k[r.kind] = k[r.kind] || []).push([slug, r]);
  const at = x => (ACTIVE.indexOf(x) + 1) || 99; return Object.fromEntries(Object.entries(k).sort(([a], [b]) => at(a) - at(b))); };   // (archived kinds are not offered, ACTIVE_KINDS in synth.js; the one a show already uses stays)
const SIZE_ORDER = ['small', 'medium', 'large'];
const firstOf = list => (list.find(([, r]) => r.variant === 'medium') || list.slice().sort(([, a], [, b]) => SIZE_ORDER.indexOf(a.variant) - SIZE_ORDER.indexOf(b.variant))[0])[0];
function onView() {
  const kinds = kindsOf();
  if (!Object.keys(kinds).length) return `<div class="wrap gut st">${head('Make an exhibition')}${nav('onview')}<p class="m">The spaces are being prepared. Come back in a little while.</p></div>`;
  return onViewPage((S.virtual || []).find(v => v.onview));
}
// --- choosing the space: one large picture of the room that is chosen, the kinds under it as small pictures, its sizes as
// one row. Every tap answers at once, in place: nothing is redrawn, and the room is walked only when the artist asks to.
const dims = t => (String(t).match(/\d[\d.,]*(?:\s*×\s*\d[\d.,]*)+\s*m/) || [t])[0];   // ('Hall under a skylight, 15 × 10 m' → '15 × 10 m')
const baseOf = slug => String(slug || '').replace(/-[23]r$/, '');
const bakedRoom = slug => (ROOMS[slug] && ROOMS[slug].baked ? slug : '');
function ovSizes(room) {
  const base = baseOf(room), r = ROOMS[base], list = (kindsOf(r.kind)[r.kind] || []).slice().sort(([, a], [, b]) => SIZE_ORDER.indexOf(a.variant) - SIZE_ORDER.indexOf(b.variant));
  const rows = [1, 2, 3].map(n => [n, n === 1 ? base : `${base}-${n}r`]).filter(([, sl]) => ROOMS[sl]);
  return `<div class="ov-seg" role="group" aria-label="Size">${list.map(([slug, x]) => `<button type="button" data-size="${esc(slug)}" aria-pressed="${base === slug}"><b>${esc(x.sizeName)}</b><span>${esc(dims(x.size))}</span></button>`).join('')}</div>
    ${rows.length > 1 ? `<div class="ov-row"><span id="ovRowsL">Rooms in a row</span><div class="ov-seg ov-n" role="group" aria-labelledby="ovRowsL">${rows.map(([n, sl]) => `<button type="button" data-rooms="${esc(sl)}" aria-pressed="${room === sl}" aria-label="${n} ${n === 1 ? 'room' : 'rooms in a row'}"><b>${n}</b></button>`).join('')}</div></div>` : ''}`;
}
function spacePicker(v) {
  const cur = bakedRoom(v.room), kinds = kindsOf(cur ? ROOMS[cur].kind : ''), kind = cur ? ROOMS[cur].kind : Object.keys(kinds)[0], room = cur || firstOf(kinds[kind]), r = ROOMS[baseOf(room)];
  return `<section class="ov-space" aria-label="The space">
    <figure class="ov-hero"><img id="ovCover" src="${esc(r.cover)}" alt="The empty ${esc(r.name)}" width="1600" height="1000" decoding="async" fetchpriority="high">
      <button type="button" class="ov-walk" data-preview>Walk it empty</button></figure>
    <p class="ov-cap"><b id="ovName">${esc(r.name)}</b><span id="ovBlurb">${esc(r.blurb)}</span></p>
    <div class="ov-kinds" role="radiogroup" aria-label="Kind of space" style="--n:${Object.keys(kinds).length}">${Object.entries(kinds).map(([k, list]) => { const x = ROOMS[firstOf(list)];
      return `<label class="ov-kind"><input type="radio" name="kind" value="${esc(k)}" ${kind === k ? 'checked' : ''}><img src="${esc(x.cover)}" alt="" width="160" height="100" decoding="async"><b>${esc(x.name)}</b></label>`; }).join('')}</div>
    <div id="ovSizes">${ovSizes(room)}</div>
    <input type="hidden" name="room" value="${esc(room)}">
  </section>`;
}
// what hangs now: the works as a strip (a tap walks in to rehang), or what to do when nothing hangs yet
function ovHung(v) {
  const ws = (v.works || []).map(workOf).filter(Boolean);
  if (!S.works.length) return `<p class="ov-none">You have no works on your page yet. <a href="#/studio">Add a few first</a>, then hang them here.</p>`;
  if (!ws.length) return `<p class="ov-none">Nothing is placed yet. Open the plan, tap Add, and drag each work to a wall. Then walk in and see it.</p>`;
  const more = S.works.some(w => !(v.works || []).includes(w.id));
  return `<div class="ov-works"><p class="ov-wh"><b>${ws.length} ${ws.length === 1 ? 'work' : 'works'} in this exhibition</b><button type="button" class="ov-link" data-hang>Rearrange</button></p>
    <ul class="ov-tiles">${ws.map(w => `<li><img src="${esc(srcOf(w.thumb || w.image))}" alt="${esc(w.title || 'Untitled')}" loading="lazy" decoding="async"><button type="button" class="ov-rm" data-unhang="${esc(w.id)}" aria-label="Take ${esc(w.title || 'this work')} out of the exhibition">×</button></li>`).join('')}${more ? '<li><button type="button" class="ov-add" data-hang="add" aria-label="Add works"><b aria-hidden="true">+</b>Add</button></li>' : ''}</ul></div>
    <p class="m small" id="vxFit" aria-live="polite"></p>`;
}
// one thing to do next, always under the thumb
function ovBar(v, title) {
  const hung = (v.works || []).map(workOf).filter(Boolean).length, pub = v.status === 'published';
  const hang = (cls, t) => `<button class="btn ${cls}" type="button" id="vxHang">${t}</button>`, walk = (cls, t) => `<button class="btn ${cls}" type="button" id="vxWalk">${t}</button>`;
  if (!S.works.length) return `<a class="btn f" href="#/studio">Add works to your page first</a>${hang('g', 'Walk in')}`;
  if (!hung) return hang('f', 'Place the works on the plan');
  if (S.cloud && !pub) return `${walk('g', 'Walk it')}<button class="btn f" type="button" id="vxPub">Put it on my page</button>`;
  return `${hang('g', 'Rehang')}${walk('f', 'Walk as a visitor')}`;
}
function onViewPage(v0) {
  const v = v0 || { id: '', title: '', room: '', works: [], text: '', centre: 150 }, pub = v.status === 'published';
  return `<div class="wrap gut st ov">${head('Make an exhibition')}${nav('onview')}
    <p class="ov-lede">The exhibition you are showing now. It opens your page${S.cloud ? ', and goes out in Open Studio’s feed' : ''}.</p>
    ${ovSteps(v)}
    ${!v0 && ovGone ? '<p class="ov-undo" role="status">The exhibition was deleted.<button type="button" class="ov-link" id="vxUndo">Undo</button></p>' : ''}
    <form class="st-form st-vx" id="vxForm" data-id="${esc(v.id)}" data-onview="1" novalidate>
      ${spacePicker(v)}
      <label class="ov-title">Title<input name="title" value="${esc(v.title)}" placeholder="Name this exhibition" autocomplete="off" enterkeyhint="done"></label>
      <section id="ovHung" aria-label="The works">${ovHung(v)}</section>
      <label><span>In your words <span class="ov-opt">(optional)</span></span><textarea name="text" rows="3" placeholder="What this exhibition is, as you would say it at the door.">${esc(v.text)}</textarea></label>
      <input type="hidden" name="centre" value="${+v.centre || 150}">
      <p class="m small ov-state" id="ovState">${S.cloud ? (pub ? (S.status === 'approved' ? 'On view: it opens your page, and it is in Shows.' : 'Published: it shows once your page is approved.') : 'A draft: only you see it.') : 'A pretend studio: the exhibition stays on this phone.'}
        ${S.cloud && pub ? '<button type="button" class="ov-link" id="vxPub">Take it down</button>' : ''}${v.id ? '<button type="button" class="ov-link" id="vxDel">Delete</button>' : ''}</p>
    </form>
    <div class="ov-bar"><span class="ov-saved" id="ovSaved" role="status"></span><div class="ov-acts" id="ovActs">${ovBar(v)}</div></div>
  </div>`;
}
// On View in four steps, always on screen: where you are, what comes next, one tap to it
const OV_STEPS = [['space', 'Space', '.ov-space'], ['title', 'Name', '[name=title]'], ['hang', 'Place works', '#ovHung'], ['pub', 'Publish', '#ovState']];
function ovDone(v, title) {
  return { space: !!(ROOMS[v.room] && ROOMS[v.room].baked), title: !!String(title ?? v.title ?? '').trim(), hang: (v.works || []).length > 0, pub: v.status === 'published' };
}
function ovSteps(v, title) {
  const d = ovDone(v, title), steps = OV_STEPS.filter(x => x[0] !== 'pub' || S.cloud), now = steps.findIndex(x => !d[x[0]]);
  return `<nav class="ov-steps" id="ovSteps" aria-label="Your progress"><ol>${steps.map(([k, name, to], i) => `<li class="${d[k] ? 'done' : i === now ? 'now' : ''}"><button type="button" data-to="${esc(to)}" ${i === now ? 'aria-current="step"' : ''}><span class="n" aria-hidden="true">${d[k] ? '✓' : i + 1}</span>${name}<span class="vh">${d[k] ? ', done' : i === now ? ', next' : ''}</span></button></li>`).join('')}</ol></nav>`;
}
function designer(id, onview = false) {
  const isNew = id === 'new';
  const v = isNew ? { id: '', title: '', room: onview ? '' : 'white-cube', paint: '', centre: 150, works: [], text: '' } : (S.virtual || []).find(x => x.id === id);
  if (!v) return `<div class="wrap gut st">${head('Not found', '#/studio/exhibitions')}</div>`;
  const R = ROOMS[v.room] || ROOMS['white-cube'];
  const paint = v.paint || R.paint;
  const rest = S.works.filter(w => !v.works.includes(w.id));
  const drawn = Object.entries(ROOMS).filter(([, r]) => !r.baked);
  return `<div class="wrap gut st">${onview ? head('Make an exhibition') + nav('onview') + ovSteps(v) : head(isNew ? 'A virtual exhibition' : v.title || 'Untitled', '#/studio/exhibitions')}
    ${onview ? `<div class="m ov-why"><p><b>What it is.</b> The exhibition of the art that matters to you right now. Pick a space, hang a few works in it, and walk it yourself before anyone else does.</p>
      <p><b>Why it matters.</b> It goes out in Open Studio’s feed, and it shows first on your artist page: people who find you walk into your work before anything else.</p></div>`
      : '<p class="m">Choose a room, the colour of its walls and the works, in the order a visitor will walk past them. The room is built around them, every work at its real size.</p>'}
    <form class="st-form st-vx" id="vxForm" data-id="${esc(v.id)}" ${onview ? 'data-onview="1"' : ''}>
      ${onview ? spacePicker(v) : ''}
      <label>Title<input name="title" required value="${esc(v.title)}" placeholder="The exhibition's title"></label>
      ${onview ? '' : `<fieldset><legend>The room</legend><div class="vx-rooms">${drawn.map(([k, r]) => `<label class="vx-room"><input type="radio" name="room" value="${k}" ${v.room === k ? 'checked' : ''}>${plan(r, v.room === k)}<b>${esc(r.name)}</b><span class="m small">${esc(r.size)} · ${esc(r.blurb)}</span></label>`).join('')}</div></fieldset>`}
      ${R.baked || onview ? '' : `<fieldset><legend>The walls</legend><div class="vx-paints">${Object.entries(PAINTS).map(([k, [n, c]]) => `<label class="vx-paint" title="${n}"><input type="radio" name="paint" value="${k}" ${paint === k ? 'checked' : ''}><i style="background:${c}"></i><span>${n}</span></label>`).join('')}</div></fieldset>`}
      <fieldset><legend>Works, in walking order</legend>
        ${v.works.length ? `<ol class="vx-order">${v.works.map((wid, i) => { const w = workOf(wid); if (!w) return ''; return `<li><img src="${esc(thumbOf(wid))}" alt=""><div class="t"><b>${esc(w.title)}</b><span class="m small">${esc([w.year, w.width && w.height ? `${w.height} × ${w.width} cm` : ''].filter(Boolean).join(' · '))}</span></div>
          <button type="button" data-up="${i}" aria-label="Move ${esc(w.title)} earlier" ${i ? '' : 'disabled'}>↑</button><button type="button" data-down="${i}" aria-label="Move ${esc(w.title)} later" ${i < v.works.length - 1 ? '' : 'disabled'}>↓</button><button type="button" data-out="${i}" aria-label="Take ${esc(w.title)} out">×</button></li>`; }).join('')}</ol>` : '<p class="m">No works yet: add them below.</p>'}
        <p class="m small" id="vxFit" aria-live="polite"></p>
        ${onview ? `<p class="m small">${v.works.length ? 'Move, add and take out works in the space itself: stand where you want a work and drag it onto the wall. Plinths hold sculptures and objects.' : 'You add the works inside the space: walk in, tap Add, and drag each one onto a wall. Plinths hold sculptures and objects.'}</p>` : rest.length ? `<details class="vx-add" ${v.works.length && !addOpen ? '' : 'open'}><summary>Add works (${rest.length})</summary><div class="st-pick">${rest.map(w => `<label><input type="checkbox" data-add="${esc(w.id)}"><img src="${esc(srcOf(w.thumb || w.image))}" alt=""><span>${esc(w.title)}</span></label>`).join('')}</div></details>` : ''}
      </fieldset>
      ${onview ? `<input type="hidden" name="centre" value="${+v.centre || 150}">` : `<label>Hung at, centre (cm)<input name="centre" type="range" min="135" max="160" step="1" value="${+v.centre || 150}"><span class="m small" id="vxCentre">${+v.centre || 150} cm from the floor to the middle of each work</span></label>`}
      <label>${onview ? 'In your words: what this exhibition is' : 'About the exhibition'}<textarea name="text" rows="4">${esc(v.text)}</textarea></label>
      <div class="btns">${onview ? `<button class="btn f" type="button" id="vxHang" ${ROOMS[v.room] && v.title ? '' : 'disabled'}>${v.works.length ? 'Place and hang the works' : 'Place the works on the plan'}</button><button class="btn g" type="button" id="vxWalk" ${v.works.length && ROOMS[v.room] ? '' : 'disabled'}>Walk as a visitor</button>` : `<button class="btn f" type="button" id="vxWalk" ${v.works.length && ROOMS[v.room] ? '' : 'disabled'}>Walk in</button>`}<button class="btn g" type="submit">Save</button>${isNew ? '' : '<button class="btn g" type="button" id="vxDel">Delete</button>'}</div>
      ${S.cloud ? (v.id ? `<div class="btns"><button class="btn ${v.status === 'published' ? 'g' : 'f'}" type="button" id="vxPub">${v.status === 'published' ? 'Take it down' : onview ? 'Put it on my page' : 'Publish'}</button></div>
        <p class="m small">${v.status === 'published' ? (S.status === 'approved' ? (onview ? 'On view: at the top of your page, and in Shows.' : 'Published: on your page and in Shows.') : 'Published: it shows on your page and in Shows once your page is approved.') : 'A draft: only you see it.'}</p>` : '')
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
  if (!ROOMS[v.room]) { el.textContent = 'Choose a space above, and the works are hung in it.'; return; }
  const { left } = hang({ room: v.room, centre: v.centre }, sized);
  const guessed = sized.filter(x => x.guessed).length;
  el.textContent = (left.length ? `${ws.length - left.length} of ${ws.length} works fit on the walls of the ${roomName(v.room)}: choose a larger room, or fewer works.` : `All ${ws.length} works fit on the walls, with room to breathe.`)
    + (guessed ? ` ${guessed} without a size: hung at about 90 cm; add their sizes in Works.` : '');
  el.classList.toggle('warn', !!left.length);
}
// the empty space, walked before it is chosen: "Choose this space" keeps it
async function previewSpace(slug, onChoose) {
  const [{ buildRoom }, { openSpace }] = await Promise.all([synth(), import('./space/space.js')]);
  const made = await buildRoom({ title: ROOMS[slug].name, room: slug, works: [] }, u => u);
  const view = await openSpace({ spec: made.spec, works: [], src: u => u, onClose: () => made.revoke(), choose: { label: 'Choose this space', onChoose } });
  window.__spaceView = view;
}
// (the same rule as isObject in space/synth.js: sculptures stand on plinths)
const SCULPT = /sculpt|object|ceramic|installation/i, CLAY = /ceramic|clay|porcelain|bronze|sculpt|marble|plaster|terracotta|stoneware/i, FLAT = /oil|acrylic|canvas|paint|gouache|tempera|watercolou?r|pastel|print|drawing|ink|photograph|collage|etching|lithograph/i;
const shapeWork = w => ({ id: w.id, kind: SCULPT.test(w.category || '') || (+w.depth > 0 && !FLAT.test(w.medium || '')) || (!w.category && !FLAT.test(w.medium || '') && CLAY.test(w.medium || '')) ? 'object' : w.kind, title: w.title, image: srcOf(w.image), width: w.width, height: w.height, pairs: w.width && w.height ? [[+w.height, +w.width]] : [],
  year: w.year, medium: w.medium, artist: { name: S.artist.name } });
// the hang editor: inside the walkable room the artist adds, removes and places the works and plinths
async function hangIn(v, done, add) {
  const [{ openHangEditor }, { openSpace }] = await Promise.all([import('./space/hang-editor.js'), import('./space/space.js')]);
  await openHangEditor({
    design: { title: v.title || 'Untitled', room: v.room, paint: v.paint, centre: v.centre || 150 },
    library: S.works.map(w => ({ ...shapeWork(w), thumb: srcOf(w.thumb || w.image) })), state: { ids: v.works, placements: v.placements, plinths: v.plinths },
    src: u => u, shape: w => w, openSpace, add,
    onSave: s => { v.works = s.ids; v.placements = s.placements; v.plinths = s.plinths; save(); },
    onExit: done,
  });
}
// (the artist walking their own exhibition as a visitor: one button there goes to the plan, to move works, walls and plinths)
async function walkIn(v, edit) {
  const [{ buildRoom }, { openSpace }] = await Promise.all([synth(), import('./space/space.js')]);
  const works = v.works.map(workOf).filter(Boolean).map(shapeWork);
  const made = await buildRoom({ title: v.title || 'Untitled', room: v.room, paint: v.paint, centre: v.centre, works, placements: v.placements, plinths: v.plinths }, u => u);
  const view = await openSpace({ spec: made.spec, works, src: u => u, onClose: () => made.revoke(), ...(edit ? { choose: { label: 'Rearrange on the plan', onChoose: edit } } : {}) });
  window.__spaceView = view;
}

// --- a real artist's first visit: their page, in a minute ---------------------------------------------------------------
function setup(u) {
  return `<div class="wrap gut st">${head('Your studio')}
    <p class="m">Who you are, then your work, and you have a page of your own: you build it right on the page. Open Studio looks at every new page before it goes live.</p>
    <form class="st-form" id="setup">
      <label>Your name, as an artist, in English letters (the app is in English)<input name="name" required value="${esc(/^[\x00-\u024f\s'.-]+$/.test(u.name || '') ? u.name : '')}" autocomplete="name" placeholder="e.g. Maya Cohen"></label>
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
    <p class="m">From wherever your work already is. You choose what comes in, and fix titles and sizes after, on your page. <a href="#/studio">Skip, go to my page</a>.</p>
    <div class="im-ways">
      <div class="st-card im-way"><h2>Photos from this phone</h2><p class="m small">The fastest way: take or choose photos of your works, as many as you like, straight on, the whole work in the picture. Then add titles and sizes in one sheet.</p>
        <label class="btn f"><input type="file" accept="image/*" multiple id="imFiles" hidden>Choose photos</label></div>
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
    </div>
    <section class="sec" id="imFound" aria-live="polite">${foundList()}</section>
    <p class="m small"><a href="#/studio">Skip for now: go to my page</a></p>
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
    app.querySelectorAll('#imZip').forEach(i => i.onchange = () => say());
    const pf = app.querySelector('#imFiles'); if (pf) pf.onchange = () => { window.__pendingFiles = [...pf.files]; pf.value = ''; go('#/studio'); };
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
  // photos from the phone go straight to the studio's own add sheet (titles, sizes, one tap), not through the list below
  if (files) files.onchange = () => { window.__pendingFiles = [...files.files]; files.value = ''; go('#/studio'); };
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
        <a class="btn f" href="#/studio">See them on your page</a> Works without a size are left out of the 3D room: add their sizes (tap a work on your page) and they hang at their real size.`);
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
  if (ab.name && !/^[\x00-\u024f\s'.-]+$/.test(a.name || '')) { a.name = ab.name; said.push('your name as your website writes it'); }
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
  if (!ex) return `<div class="wrap gut st">${head('Not found', '#/studio')}</div>`;
  const r = readiness(ex, S.works), sp = ex.space || {};
  const status = ex.real ? ex.real : null;
  const extra = ex.tourFiles || [], hasVideo = ex.video || extra.some(f => f.kind === 'video');
  // (always worth a try: with any photo or a video the tour is attempted, and the checks say what would make it better)
  const canAsk = !status && ex.tour !== 'live' && ex.tour !== 'requested' && ex.tour !== 'building' && (ex.photos.length || extra.length || hasVideo);
  return `<div class="wrap gut st">${head(isNew ? 'Add an exhibition' : ex.title, '#/studio')}
    <div class="st-step"><span class="n">1</span><div><h2>The exhibition</h2><p class="m small">What visitors see on your page: the details, a few words, the photos of the show and the works that were in it.</p></div></div>
    <form class="st-form" id="exForm" data-id="${esc(ex.id)}">
      <label>Title<input name="title" required value="${esc(ex.title)}"></label>
      <div class="st-row"><label>Venue<input name="venue" value="${esc(ex.venue)}"></label><label>City<input name="city" value="${esc(ex.city)}"></label></div>
      <div class="st-row"><label>Dates<input name="dates" placeholder="12 Mar – 30 Apr 2026" value="${esc(ex.dates)}"></label><label>Curator<input name="curator" value="${esc(ex.curator)}"></label></div>
      <label>About the exhibition<textarea name="text" rows="5">${esc(ex.text)}</textarea></label>
      <fieldset><legend>Works in the show</legend>
        <div class="st-pick">${S.works.map(w => `<label><input type="checkbox" name="works" value="${w.id}" ${ex.works.includes(w.id) ? 'checked' : ''}><img src="${esc(w.thumb || w.image)}" alt=""><span>${esc(w.title)}</span></label>`).join('')}</div></fieldset>
      <fieldset><legend>Photos of the show (these appear on the exhibition page)</legend>
        <div class="st-photos">${ex.photos.map((p, i) => `<figure><img src="${esc(p.src)}" alt="Installation photo ${i + 1}"><button type="button" data-delphoto="${i}" aria-label="Remove">×</button></figure>`).join('')}
          <label class="st-add"><input type="file" accept="image/*" multiple name="photos" hidden>+ Add photos</label></div>
        <p class="m small">Wide views, each with 2–3 works and a corner of the room, so that every wall is in at least two photos. Natural light, no people in front of the works.</p></fieldset>
      <div class="btns"><button class="btn f" type="submit">${isNew ? 'Save the exhibition' : 'Save'}</button>${isNew ? '' : '<button class="btn g" type="button" id="delEx">Delete</button>'}</div>
    </form>
    ${isNew ? '<p class="m st-after">After you save, “A walk-through tour” opens here, at the bottom: you can ask for a 3D tour of this show.</p>' : `<div class="st-step"><span class="n">2</span><div><h2>A walk-through tour <span class="m">(optional)</span></h2>
      <p class="m">Visitors walk through your show in 3D, every work at its real size and place. Open Studio builds it for you, and checks it view by view before it goes up. To make a good tour:</p>
      <ol class="st-how"><li><b>Upload as many photos and videos of the space and the show as you can.</b> Every wall, from several angles, wide views with the corners of the room. A slow walk-through video helps most.</li>
        <li><b>The details of the works must be very exact.</b> Width, height and depth in centimetres, the year and the medium. A work with a wrong size hangs wrong in the tour.</li></ol>
      <p class="m"><b>The photos and videos you add below only help build the tour. They do not appear on the exhibition page.</b></p></div></div>
    <section class="st-card st-tour">
      <div class="sec-h"><h3>Where it stands</h3><span class="st-flag ${tourFlag(ex)[0]}">${tourFlag(ex)[1]}</span></div>
      ${ex.tour === 'live' && ex.space && ex.space.slug ? `<p class="m">This exhibition has a walkable tour.</p><div class="btns"><a class="btn f" href="#/exhibition/${esc(ex.space.slug)}/space">Walk through the tour</a></div>`
        : ex.tour === 'requested' || ex.tour === 'building' ? `<p class="m">Asked for on ${esc(new Date(ex.tourRequested || Date.now()).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' }))}. Open Studio is building it: it shows here when it's ready, usually within a few days, or with what to add if the photos aren't enough.</p>`
        : status ? `<p class="m">${esc(status.summary)}</p>${checks(status.items)}`
        : `<p class="m">${r.ready ? 'Everything a tour needs is here.' : 'You can ask for a tour now: it is always tried. These would make it surer:'}</p>${checks(r.items)}`}
      ${ex.tour === 'more' && ex.tourNote ? `<p class="st-status no">${esc(ex.tourNote)}</p>` : ''}
      <h3>Photos and videos for the tour</h3>
      <p class="m small">Kept apart from the exhibition's own photos, and <b>never shown on your page</b>. Photos: wide, 2–3 works and a corner of the room in each. Video: phone sideways, walk slowly down the middle and back, filming every wall (up to 50 MB).</p>
      <div class="st-files">${extra.map((f, i) => `<div class="st-file"><span>${f.kind === 'video' ? '▶' : '▣'} ${esc(f.name)}</span><button type="button" data-deltour="${i}" aria-label="Remove ${esc(f.name)}">×</button></div>`).join('') || '<p class="m small">Nothing yet.</p>'}</div>
      <div class="btns"><label class="btn g"><input type="file" accept="image/*,video/*" multiple id="tourFiles" hidden>+ Add photos or a video</label></div>
      <p class="m small" id="tourMsg" role="status"></p>
      <details class="st-room"><summary>The room, if you know it (makes the tour exact)</summary>
      <form class="st-form" id="roomForm">
        <div class="st-row"><label>Ceiling height (m)<input name="ceiling" inputmode="decimal" placeholder="3.40" value="${esc(sp.ceiling || '')}"></label>
          <label>Works hung at, centre (cm)<input name="centre" inputmode="decimal" placeholder="150" value="${esc(sp.centre || '')}"></label></div>
        <div class="st-row"><label>Canvas depth (cm)<input name="depth" inputmode="decimal" placeholder="3.5" value="${esc(sp.depth || '')}"></label>
          <label>Floor<select name="floor">${['', 'Polished stone', 'Concrete', 'Wood', 'Carpet', 'Other'].map(f => `<option ${sp.floor === f ? 'selected' : ''}>${f}</option>`).join('')}</select></label></div>
        <div class="st-row"><label>Light<select name="light">${['', 'Spotlights', 'Daylight', 'Both'].map(f => `<option ${sp.light === f ? 'selected' : ''}>${f}</option>`).join('')}</select></label>
          <label>Walls<select name="walls">${['', 'White', 'Coloured', 'Mixed'].map(f => `<option ${sp.walls === f ? 'selected' : ''}>${f}</option>`).join('')}</select></label></div>
        <label>Room size, if measured (m)<input name="room" placeholder="12.4 × 6.1" value="${esc(sp.room || '')}"></label>
        <p class="m small">A laser measure gives the room's size in seconds; one measured height (the centre of one work above the floor) fixes the whole room's scale.</p>
        <div class="btns"><button class="btn g" type="submit">Save the room</button></div></form></details>
      ${canAsk ? '<div class="btns st-ask"><button class="btn f" type="button" id="buildTour">Ask for a tour</button></div>' : ''}
      ${!canAsk && (ex.tour || 'none') === 'none' && !ex.photos.length && !extra.length ? '<p class="m small">Add installation photos (in step 1, or here for the tour only), and “Ask for a tour” appears here.</p>' : ''}
      ${ex.tour === 'more' ? '<div class="btns st-ask"><button class="btn f" type="button" id="buildTour">Try again with what’s here now</button></div>' : ''}
      ${ex.tour === 'live' && ex.real ? share(ex) : ''}
    </section>`}
  </div>`;
}

// a CV as the site keeps it: lines in groups (Education, Solo Exhibitions...), each with its year
const cvList = cv => {
  const groups = [...new Set(cv.map(l => l.group || ''))];
  return groups.map(g => `<section class="cv-g">${g ? `<h3>${esc(g)}</h3>` : ''}<dl>${cv.filter(l => (l.group || '') === g).map(l => `<div><dt>${esc(l.year)}</dt><dd>${esc(l.title)}${l.venue ? `<span>${esc(l.venue)}</span>` : ''}</dd></div>`).join('')}</dl></section>`).join('');
};

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
// On View's own wiring: every choice is kept as it is made (no Save button), and nothing redraws the page
// Deleting never asks "are you sure?": it happens, and for a few seconds one tap brings it back (NN/g, Apple: undo over confirmation).
function undoToast(text, undo) {
  document.querySelectorAll('.st-toast').forEach(x => x.remove());
  const e = document.createElement('div'); e.className = 'st-toast'; e.setAttribute('role', 'status');
  const m = document.createElement('span'); m.textContent = text; const b = document.createElement('button'); b.type = 'button'; b.textContent = 'Undo';
  b.onclick = () => { e.remove(); undo(); }; e.append(m, b); document.body.append(e); setTimeout(() => e.remove(), 7000);
}
// Hebrew and English in the same studio: every field takes its direction from what is typed in it.
if (typeof document !== 'undefined') document.addEventListener('focusin', e => {
  const t = e.target; if (!location.hash.startsWith('#/studio') || !t || !t.matches) return;
  if (t.matches('textarea, input[type=text], input:not([type]), input[type=search], [contenteditable=""], [contenteditable=true]') && !t.getAttribute('dir')) t.setAttribute('dir', 'auto');
});
let ovGone = null;                                                   // (the exhibition just deleted, for Undo)
function wireOnView(app, go, vx) {
  const $ = s => app.querySelector(s), blank = { works: [], status: '' };
  let v = vx.dataset.id ? S.virtual.find(x => x.id === vx.dataset.id) : null, timer = 0, sayT = 0, coverN = 0, working = false;
  const say = t => { const el = $('#ovSaved'); if (!el) return; el.textContent = t; el.classList.add('on'); clearTimeout(sayT); sayT = setTimeout(() => el.classList.remove('on'), 1800); };
  const keep = quiet => {
    const f = new FormData(vx), data = { title: f.get('title').trim(), room: f.get('room'), paint: '', centre: +f.get('centre') || 150, text: f.get('text'), onview: true };
    (S.virtual || []).forEach(x => { if (x !== v) x.onview = false; });
    if (!v) { v = { id: uid(), works: [], ...data }; (S.virtual = S.virtual || []).unshift(v); vx.dataset.id = v.id; }
    else Object.assign(v, data);
    ovGone = null; save(); if (!quiet) say('Saved'); return v;
  };
  const now = () => ({ ...(v || blank), room: vx.elements.room.value, title: vx.elements.title.value });
  const steps = () => { $('#ovSteps').outerHTML = ovSteps(now()); $('#ovSteps').querySelectorAll('[data-to]').forEach(b => b.onclick = () => {
    const t = app.querySelector(b.dataset.to); if (!t) return;
    t.scrollIntoView({ block: 'center', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }); if (t.matches('input')) setTimeout(() => t.focus({ preventScroll: true }), 350);
  }); };
  const busy = (b, t, fn) => async () => { if (working) return; const was = b.textContent; working = true; b.disabled = true; b.textContent = t; try { await fn(); } catch (e) { console.error(e); say('That did not open. Try again.'); } finally { working = false; b.disabled = false; b.textContent = was; } };
  const hang = add => hangIn(keep(true), () => go('#/studio/onview', true), add === true);
  const acts = () => {
    const a = $('#ovActs'), html = ovBar(now());
    if (working || a.dataset.h === html) return;   // (never swap a button under the finger that is tapping it)
    a.dataset.h = html; a.innerHTML = html;
    const h = a.querySelector('#vxHang'), w = a.querySelector('#vxWalk'), p = a.querySelector('#vxPub');
    if (h) h.onclick = busy(h, 'Building the room…', hang);
    if (w) w.onclick = busy(w, 'Building the room…', () => walkIn(keep(true), () => hang()));
    if (p) p.onclick = publish;
  };
  function publish() {
    const k = keep(true), t = vx.elements.title;
    if (k.status !== 'published' && !k.title) { t.scrollIntoView({ block: 'center' }); t.focus({ preventScroll: true }); t.setAttribute('aria-invalid', 'true'); return say('Give it a title first'); }
    k.status = k.status === 'published' ? 'draft' : 'published'; save(); go('#/studio/onview', true);
  }
  const pubLink = $('#ovState #vxPub'); if (pubLink) pubLink.onclick = publish;
  // the room that is chosen: its picture, its name, its sizes; in place
  const setRoom = slug => {
    if (!ROOMS[slug]) return;
    const r = ROOMS[baseOf(slug)], img = $('#ovCover'), n = ++coverN;
    vx.elements.room.value = slug; $('#ovName').textContent = r.name; $('#ovBlurb').textContent = r.blurb; $('#ovSizes').innerHTML = ovSizes(slug);
    if (!img.src.endsWith(r.cover)) { const im = new Image(); im.src = r.cover; img.classList.add('sw');
      const put = () => { if (n !== coverN) return; img.src = r.cover; img.alt = `The empty ${r.name}`; img.classList.remove('sw'); };
      (im.decode ? im.decode() : Promise.reject()).then(put, put); }
    keep(); steps(); if (v.works.length) fitNote(app, v);
  };
  vx.querySelectorAll('input[name=kind]').forEach(i => i.onchange = () => {
    const list = kindsOf()[i.value] || [], cur = ROOMS[baseOf(vx.elements.room.value)], same = cur && list.find(([, x]) => x.variant === cur.variant);
    setRoom(same ? same[0] : firstOf(list));
  });
  vx.addEventListener('click', e => {
    const s = e.target.closest('[data-size]'), r = e.target.closest('[data-rooms]'), p = e.target.closest('[data-preview]'), h = e.target.closest('[data-hang]'), u = e.target.closest('[data-unhang]');
    if (s) { const many = (vx.elements.room.value.match(/-[23]r$/) || [''])[0]; setRoom(ROOMS[s.dataset.size + many] ? s.dataset.size + many : s.dataset.size); }
    else if (r) setRoom(r.dataset.rooms);
    else if (p) busy(p, 'Opening…', () => previewSpace(vx.elements.room.value, () => keep()))();
    else if (u && v) {      // a work taken out of the exhibition, here on the page (it stays on the artist's page; Add brings it back)
      const id = u.dataset.unhang; v.works = (v.works || []).filter(x => x !== id); if (v.placements) delete v.placements[id];
      v.plinths = (v.plinths || []).filter(q => q.work !== id); save(); say('Taken out');
      $('#ovHung').innerHTML = ovHung(v); steps(); acts(); if (v.works.length) fitNote(app, v);
    }
    else if (h) busy(h, h.dataset.hang === 'add' ? '…' : 'Opening…', () => hang(h.dataset.hang === 'add'))();
  });
  vx.addEventListener('input', e => { if (e.target.name === 'title') { e.target.removeAttribute('aria-invalid'); steps(); } clearTimeout(timer); timer = setTimeout(() => { keep(); acts(); }, 600); });
  vx.addEventListener('change', e => { if (e.target.name === 'title' || e.target.name === 'text') { clearTimeout(timer); keep(); acts(); } });
  vx.onsubmit = e => { e.preventDefault(); if (document.activeElement) document.activeElement.blur(); };
  const del = $('#vxDel');
  if (del) del.onclick = () => { clearTimeout(timer); ovGone = v; S.virtual = S.virtual.filter(x => x !== v); save(); go('#/studio/onview', true); };
  const undo = $('#vxUndo');
  if (undo) undo.onclick = () => { if (ovGone) { (S.virtual = S.virtual || []).forEach(x => { x.onview = false; }); ovGone.onview = true; S.virtual.unshift(ovGone); ovGone = null; save(); } go('#/studio/onview', true); };
  steps(); acts(); if (v) fitNote(app, v);
  // the other sizes' pictures arrive while the artist looks at the first, so a tap shows them at once
  const warm = () => Object.values(kindsOf()).flat().forEach(([, x]) => { if (x.cover) new Image().src = x.cover; });
  (window.requestIdleCallback || (f => setTimeout(f, 700)))(warm);
}
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
  app.querySelectorAll('[data-review]').forEach(b => b.onclick = async () => {
    b.disabled = true;
    try { const d = await cloud.setStatus(b.dataset.review); S.status = d.status; S.note = d.note || ''; go(location.hash, true); }
    catch (e) { b.disabled = false; alert(e.message); }
  });
  const su = $('#setup');
  if (su) su.onsubmit = async e => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(su)), b = su.querySelector('button[type=submit]');
    b.disabled = true; b.textContent = 'Making your page…';
    if (previewing()) {
      S = { preview: true, cloud: false, status: 'draft', note: '', artist: { name: f.name, discipline: f.discipline || '', city: f.city || '', photo: '', statement: '', bio: '', link: f.link || '', instagram: f.instagram || '', cover: '' }, works: [], exhibitions: [], virtual: [] };
      return go('#/studio/import');
    }
    try { S = await cloud.create(f); go('#/studio/import'); }
    catch (err) { b.disabled = false; b.textContent = 'Make my page'; su.querySelector('.err').textContent = err.message; }
  };
  wireImport(app, go);
  const pub = $('#vxPub');
  if (pub) pub.onclick = () => { const v = S.virtual.find(x => x.id === $('#vxForm').dataset.id); if (!v) return; v.status = v.status === 'published' ? 'draft' : 'published'; save(); go(v.onview ? '#/studio/onview' : `#/studio/virtual/${v.id}`, true); };

  const vx = $('#vxForm');
  if (vx && vx.dataset.onview) wireOnView(app, go, vx);
  else if (vx) {
    const id = vx.dataset.id, onview = !!vx.dataset.onview;
    let v = id ? S.virtual.find(x => x.id === id) : null;
    const keep = () => {
      const f = new FormData(vx);
      const data = { title: f.get('title').trim(), room: f.get('room'), paint: f.get('paint'), centre: +f.get('centre'), text: f.get('text') };
      if (onview) {    // a new space: its middle size first; one exhibition on view at a time
        const kind = f.get('kind'), list = kind ? kindsOf()[kind] : null;
        if (list && !(ROOMS[data.room] && ROOMS[data.room].kind === kind)) data.room = firstOf(list);
        data.paint = ''; data.onview = true;
        (S.virtual || []).forEach(x => { if (x !== v) x.onview = false; });
      }
      if (!v) { v = { id: uid(), works: [], ...data }; (S.virtual = S.virtual || []).unshift(v); vx.dataset.id = v.id; if (!onview) history.replaceState(null, '', `#/studio/virtual/${v.id}`); }
      else Object.assign(v, data);
      save(); return v;
    };
    // (a change redraws the screen where the artist is, not at its top)
    const redo = () => { if (restoreY == null) restoreY = scrollY; const k = keep(); go(onview ? '#/studio/onview' : `#/studio/virtual/${k.id}`, true); };
    vx.querySelectorAll('input[name=kind]').forEach(i => i.onchange = () => redo());
    vx.querySelectorAll('[data-preview]').forEach(b => b.onclick = async () => {
      const slug = b.dataset.preview, t = b.innerHTML; b.disabled = true; b.querySelector('b').textContent = 'Opening…';
      try { await previewSpace(slug, () => { vx.elements.room.value = slug; redo(); }); } finally { b.disabled = false; b.innerHTML = t; }
    });
    vx.querySelectorAll('input[name=room], input[name=paint]').forEach(i => i.onchange = () => {
      if (i.name === 'room') { const p = vx.querySelector('input[name=paint]:checked'); if (p && p.value === (ROOMS[(v || {}).room] || ROOMS['white-cube']).paint) p.checked = false; }
      redo();
    });
    const c = vx.querySelector('input[name=centre]');
    if (c.type === 'range') {
      c.oninput = () => { $('#vxCentre').textContent = `${c.value} cm from the floor to the middle of each work`; };
      c.onchange = () => { keep(); fitNote(app, v); };
    }
    vx.querySelectorAll('[data-add]').forEach(b => b.onchange = () => { addOpen = true; restoreY = scrollY; keep().works.push(b.dataset.add); redo(); });
    const ad = vx.querySelector('.vx-add'); if (ad) ad.ontoggle = () => { addOpen = ad.open; };
    vx.querySelectorAll('[data-up],[data-down],[data-out]').forEach(b => b.onclick = () => {
      const w = keep().works, i = +(b.dataset.up ?? b.dataset.down ?? b.dataset.out);
      if (b.dataset.out != null) w.splice(i, 1); else { const j = b.dataset.up != null ? i - 1 : i + 1; [w[i], w[j]] = [w[j], w[i]]; }
      redo();
    });
    vx.onsubmit = e => { e.preventDefault(); keep(); go(onview ? '#/studio/onview' : '#/studio/exhibitions'); };
    const walk = $('#vxWalk');
    if (walk) walk.onclick = async () => { walk.disabled = true; walk.textContent = 'Building the room…'; try { await walkIn(keep(), () => hangIn(keep(), () => go('#/studio/onview', true))); } finally { walk.disabled = false; walk.textContent = 'Walk in'; } };
    const hang = $('#vxHang');
    if (hang) hang.onclick = async () => { hang.disabled = true; hang.textContent = 'Building the room…'; try { await hangIn(keep(), () => go('#/studio/onview', true)); } finally { hang.disabled = false; } };
    const del = $('#vxDel');
    if (del) del.onclick = () => { const was = S.virtual.slice(); S.virtual = S.virtual.filter(x => x.id !== id); save(); go('#/studio/exhibitions'); undoToast('Virtual exhibition deleted', () => { S.virtual = was; save(); go('#/studio/virtual/' + id); }); };
    if (v) fitNote(app, v);
    const stepsEl = $('#ovSteps');
    if (stepsEl) {   // the steps follow what is typed and chosen, and the Hang button wakes when the room and the title are there
      const wireSteps = () => $('#ovSteps').querySelectorAll('[data-to]').forEach(b => b.onclick = () => {
        const t = document.querySelector(b.dataset.to) || document.querySelector('#vxForm .btn'); if (!t) return;
        t.scrollIntoView({ block: 'center', behavior: 'smooth' }); if (t.matches('input')) setTimeout(() => t.focus({ preventScroll: true }), 350);
      });
      const live = () => {
        const f = new FormData(vx), t = String(f.get('title') || ''), room = f.get('room') || (v && v.room) || '';
        $('#ovSteps').outerHTML = ovSteps({ ...(v || { works: [], status: '' }), room }, t); wireSteps();
        if (hang) hang.disabled = !(ROOMS[room] && t.trim());
      };
      wireSteps(); vx.addEventListener('input', live);
    }
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
    xf.querySelectorAll('[data-delphoto]').forEach(b => b.onclick = () => { photos.splice(+b.dataset.delphoto, 1); store(false); go(location.hash, true); });
    function store(leave = true) {
      const f = new FormData(xf);
      const data = { title: f.get('title').trim() || 'Untitled exhibition', venue: f.get('venue'), city: f.get('city'), dates: f.get('dates'), curator: f.get('curator'), text: f.get('text'),
        works: f.getAll('works'), photos, video, year: (f.get('dates').match(/\d{4}/) || [String(new Date().getFullYear())])[0] };
      let target = ex;
      if (!target) { target = { id: uid(), tour: 'none', ...data }; S.exhibitions.unshift(target); xf.dataset.id = target.id; if (!leave) history.replaceState(null, '', `#/studio/exhibition/${target.id}`); }
      else Object.assign(target, data);
      save();
      if (leave) go(`#/studio/exhibition/${target.id}`);
    }
    xf.onsubmit = e => { e.preventDefault(); store(true); };
    const del = $('#delEx');
    if (del) del.onclick = () => { const was = S.exhibitions.slice(); S.exhibitions = S.exhibitions.filter(x => x.id !== id); save(); go('#/studio'); undoToast('Exhibition deleted', () => { S.exhibitions = was; save(); go('#/studio/exhibition/' + id); }); };
  }
  app.querySelectorAll('[data-copy]').forEach(b => b.onclick = async () => {
    const input = b.previousElementSibling;
    try { await navigator.clipboard.writeText(input.value); } catch { input.select(); document.execCommand('copy'); }
    const t = b.textContent; b.textContent = 'Copied'; setTimeout(() => { b.textContent = t; }, 1600);
  });
  const thisEx = () => S.exhibitions.find(x => location.hash.endsWith('/' + x.id));
  const rf = $('#roomForm');
  if (rf) rf.onsubmit = e => {
    e.preventDefault(); const ex = thisEx(), f = new FormData(rf);
    ex.space = { ...(ex.space || {}), ceiling: f.get('ceiling'), centre: f.get('centre'), depth: f.get('depth'), floor: f.get('floor'), light: f.get('light'), walls: f.get('walls'), room: f.get('room') };
    save(); go(location.hash, true);
  };
  const tf = $('#tourFiles');
  if (tf) tf.onchange = async () => {
    const ex = thisEx(), msg = $('#tourMsg'); ex.tourFiles = ex.tourFiles || [];
    for (const [i, file] of [...tf.files].entries()) {
      msg.textContent = `Uploading ${i + 1} of ${tf.files.length}: ${file.name}…`;
      try { ex.tourFiles.push(S.cloud ? await cloud.uploadTourFile(ex.id, file) : { path: '', name: file.name, kind: /^video\//.test(file.type) ? 'video' : 'photo' }); }
      catch (e) { msg.textContent = e.message; return; }
    }
    await save(); go(location.hash, true);
  };
  app.querySelectorAll('[data-deltour]').forEach(b => b.onclick = async () => {
    const ex = thisEx(), f = ex.tourFiles[+b.dataset.deltour]; if (!f) return;
    if (S.cloud && f.path) await cloud.removeTourFile(f.path).catch(() => {});
    ex.tourFiles.splice(+b.dataset.deltour, 1); save(); go(location.hash, true);
  });
  const bt = $('#buildTour');
  if (bt) bt.onclick = () => { const ex = thisEx(); if (ex) { ex.tour = 'requested'; ex.tourRequested = new Date().toISOString(); ex.tourNote = ''; save(); go(location.hash, true); } };


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

export async function studio(hash, app, go, M, tools) {
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
  // your page is your studio: the old Works, Profile and Preview screens are the page itself, in edit or view mode
  const onPage = S && tools && (!m || m === 'works' || m === 'works/new' || m === 'exhibitions/new' || m === 'profile' || m === 'preview' || m.startsWith('work/'));
  if (onPage) {
    const act = !m ? '' : m === 'works/new' ? 'work-new' : m === 'exhibitions/new' ? 'ex-new' : m.startsWith('work/') ? `work:${m.slice(5)}` : m;
    if (m === 'preview') { try { sessionStorage.setItem('os-studio-mode', 'view'); } catch {} }
    if (m) history.replaceState(null, '', '#/studio');
    const page = await import('./studio-page.js');
    cloud = cloud || (S.cloud ? await import('./studio-cloud.js') : null);
    app.scrollTop = 0;
    page.mount({ app, S, tools, M, go, save, act: act === 'preview' ? '' : act,
      h: { esc, uid, asDataURL, checkImage, verdict, checks }, cloud: async () => cloud || (cloud = await import('./studio-cloud.js')),
      signOut: () => { const b = document.createElement('button'); b.id = 'signOut'; app.append(b); wire(app, go); b.click(); } });
    return;
  }
  if (!S) html = signIn();
  else if (m === 'exhibitions/new') html = exhibitionPage('new');
  else if (m.startsWith('exhibition/')) html = exhibitionPage(m.slice(11));
  else if (m.startsWith('virtual/') || m === 'exhibitions' || m === 'onview') {
    { const m = await synth(); ({ ROOMS, PAINTS } = m); ACTIVE = m.ACTIVE_KINDS || []; }
    html = m === 'exhibitions' ? exhibitions() : m === 'onview' ? onView() : designer(m.slice(8));
  }
  else if (m === 'import') html = importer();
  else { go('#/studio'); return; }
  app.innerHTML = html;
  wire(app, go);
  if (restoreY != null) { const y = restoreY; restoreY = null; requestAnimationFrame(() => scrollTo({ top: y, behavior: 'instant' })); }
}
