// Open Studio prototype. Home → artist → exhibition (an album of works) → work, plus Search and Places.
// Content comes from the site's own /content/*.json plus studio/app/data/studio.json (Studio-only data),
// or from window.STUDIO_DATA in a baked preview.

const app = document.getElementById('app');

async function loadData() {
  if (window.STUDIO_DATA) return window.STUDIO_DATA;
  const get = url => fetch(url).then(r => r.json());
  const names = ['settings', 'works', 'exhibitions', 'objects', 'cv'];
  const [settings, works, exhibitions, objects, cv, studio] = await Promise.all([...names.map(n => get(`/content/${n}.json`)), get('data/studio.json')]);
  // every exhibition the space pipeline has built a 3D space for (data/spaces/index.json lists them)
  const index = await get('data/spaces/index.json').catch(() => ({}));
  // the inspection stage opens a space that is built but not yet published (?inspect=<slug>)
  const inspecting = new URLSearchParams(location.search).get('inspect');
  if (inspecting) index[inspecting] = {};
  const spaces = Object.fromEntries(await Promise.all(Object.keys(index).map(async k => [k, await get(`data/spaces/${k}.json`)])));
  return { settings, works, exhibitions, objects, cv, studio, spaces };
}

// --- model -----------------------------------------------------------------
const slugify = s => s.toLowerCase().normalize('NFKD').replace(/[^\w\s-]/g, '').trim().replace(/[\s_]+/g, '-') || 'untitled';
const cap = s => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
const curly = s => String(s || '').replace(/^"/, '“').replace(/"$/, '”');
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

// Every "a × b" pair recorded for a work: the description's line first (it came with the original records), then the size field.
function sizePairs(w) {
  const text = (w.description || '') + ' ' + (w.size || '');
  return [...text.matchAll(/(\d+(?:\.\d+)?)\s*[x×X]\s*(\d+(?:\.\d+)?)/g)].map(m => [+m[1], +m[2]]);
}

function buildModel(d) {
  const seen = new Set();
  const uniq = base => { let s = base, i = 2; while (seen.has(s)) s = `${base}-${i++}`; seen.add(s); return s; };
  const s = d.settings, studio = d.studio || { artists: [], exhibitions: {} };
  const meta = studio.artists[0] || {};
  const artist = {
    slug: meta.slug || 'elad-amsalem', name: (s.hero_title || 'Elad Amsalem').replace(/\n/g, ' '),
    label: s.hero_label, statement: s.hero_statement, hero: s.hero_image, portrait: s.about_portrait,
    discipline: meta.discipline || '', city: meta.city || '', country: meta.country || '',
  };
  seen.add(artist.slug);
  const works = d.works.map((w, i) => {
    const firstLine = (w.description || '').split('\n')[0].replace(/\s+/g, ' ').trim();
    const pairs = sizePairs(w);
    return {
      i, slug: uniq(slugify(`${w.title}-${w.year}`)), title: (w.title || 'Untitled').trim(), year: String(w.year || ''),
      medium: cap(firstLine) || w.tech || '', pairs, size: pairs.length ? `${pairs[0][0]} × ${pairs[0][1]} cm` : '',
      sold: w.available === false, image: w.image, artist,
    };
  });
  // newest first, keeping the editor's order inside a year
  works.sort((a, b) => (+b.year || 0) - (+a.year || 0) || a.i - b.i);
  const byTitle = new Map(works.map(w => [w.title.toLowerCase(), w]));
  const exhibitions = d.exhibitions.map(e => {
    const lines = (e.description || '').split('\n').map(x => x.trim());
    const hasDates = /\d{4}/.test(lines[0] || '') && lines[0].length < 40;
    const extra = studio.exhibitions[e.title.trim()] || {};
    return {
      slug: uniq(slugify(e.title)), title: e.title.trim(), year: e.year, venue: (e.venue || '').trim(),
      dates: hasDates ? lines[0] : '', text: (hasDates ? lines.slice(1) : lines).filter(Boolean), images: e.images || [],
      city: extra.city || '', country: extra.country || '', confirmed: !!extra.confirmed, artist,
      works: (extra.works || []).map(t => byTitle.get(t.toLowerCase().trim())).filter(Boolean),
      maybe: (extra.maybe || []).map(t => byTitle.get(t.toLowerCase().trim())).filter(Boolean),
      space: (d.spaces || {})[extra.space || slugify(e.title)] || null,
    };
  }).sort((a, b) => (+b.year || 0) - (+a.year || 0));
  const objects = d.objects.map(o => ({
    slug: uniq(slugify(o.title)), title: o.title.trim(), meta: o.meta || '', images: o.images || [],
    text: (o.description || '').split('\n').map(x => x.replace(/​/g, '').trim()).filter(Boolean),
  }));
  const cities = [];
  for (const e of exhibitions) if (e.city && !cities.some(c => c.name === e.city)) cities.push({ name: e.city, slug: slugify(e.city), country: e.country });
  if (artist.city && !cities.some(c => c.name === artist.city)) cities.push({ name: artist.city, slug: slugify(artist.city), country: artist.country });
  return { s, artist, artists: [artist], works, exhibitions, objects, cities, cv: d.cv, media: d.media || {} };
}

// --- helpers ---------------------------------------------------------------
let M;
const src = p => M.media[p] || p;
const im = (p, alt, attrs = '') => p ? `<img src="${esc(src(p))}" alt="${esc(alt)}" loading="lazy" ${attrs}>` : '';
const metaLine = w => [w.year, w.medium, w.size].filter(Boolean).join(' · ');
const soldDot = w => w.sold ? ' <span class="dot" title="Sold" aria-label="Sold"></span>' : '';
const exOf = w => M.exhibitions.find(e => e.works.includes(w));
const place = e => [e.city, e.dates || e.year].filter(Boolean).join(' · ');

function workRow(w) {
  return `<a class="row" href="#/work/${w.slug}">${im(w.image, '')}<div class="t"><div><b>${esc(w.title)}</b></div><div class="m">${esc(metaLine(w))}</div></div>${w.sold ? '<span class="dot" title="Sold" aria-label="Sold"></span>' : '<span></span>'}</a>`;
}
const cover = e => `<a href="#/exhibition/${e.slug}">${im(e.images[0], '')}<div><b>${esc(e.title)}</b><div class="m">${esc([e.year, e.artist.name].join(' · '))}</div></div></a>`;
const workCover = w => `<a href="#/work/${w.slug}"><div class="im">${im(w.image, w.title)}</div><div><b>${esc(w.title)}</b>${soldDot(w)}<div class="m">${esc(w.artist.name)} · ${esc(w.year)}</div></div></a>`;
const person = a => `<a class="person" href="#/artist/${a.slug}">${im(a.portrait, a.name)}<div><b>${esc(a.name)}</b><div class="m">${esc(a.discipline)}</div></div></a>`;

// --- views -----------------------------------------------------------------
function home() {
  const live = M.exhibitions[0];
  return `<div class="wrap gut">
    <div class="home-h"><h1>Open Studio</h1><span class="tag">Prototype</span></div>
    ${live ? `<section class="shelf"><div class="k"><span class="dot"></span>&nbsp; On view now</div>
      <a class="feature" href="#/exhibition/${live.slug}">${im(live.images[0], `Installation view of ${live.title}`, 'loading="eager"')}
        <div class="ov"><div class="k">${esc(live.artist.name)}</div><h2>${esc(live.title)}</h2><div class="m">${esc([live.venue.replace(/^Solo exhi\w+ at /i, '').split(' — ')[0], live.dates || live.year].filter(Boolean).join(' · '))}</div></div></a></section>` : ''}
    <section class="shelf"><h2>Artists</h2><div class="people">${M.artists.map(person).join('')}
      <span class="person" aria-label="More artists are coming"><span class="ring" aria-hidden="true">+</span><div class="m">More artists<br>coming soon</div></span></div></section>
    <section class="shelf"><h2>Exhibitions</h2><div class="covers">${M.exhibitions.map(cover).join('')}</div></section>
    <section class="shelf"><h2>Latest works</h2><div class="covers works">${M.works.slice(0, 10).map(workCover).join('')}</div></section>
    <section class="shelf"><h2>By location</h2><div class="places">${M.cities.map(cityCard).join('')}</div></section>
  </div>`;
}

function cityCard(c) {
  const shows = M.exhibitions.filter(e => e.city === c.name).length;
  const artists = M.artists.filter(a => a.city === c.name).length;
  const bits = [shows && `${shows} ${shows === 1 ? 'exhibition' : 'exhibitions'}`, artists && `${artists} ${artists === 1 ? 'artist' : 'artists'}`].filter(Boolean);
  return `<a class="place" href="#/place/${c.slug}"><b>${esc(c.name)}</b><span class="m">${esc(bits.join(' · ') || c.country)}</span></a>`;
}

function artistPage(slug) {
  const a = M.artists.find(x => x.slug === slug);
  if (!a) return notFound();
  const live = M.exhibitions[0];
  return `
  <section class="hero">${im(a.hero, `Installation view, ${live ? live.title : ''}`, 'loading="eager"')}
    <div class="ov gut"><div class="wrap"><div class="k">${esc(a.label)}</div><h1>${esc(a.name)}</h1></div></div></section>
  <div class="wrap gut">
    <p class="statement">${esc(curly(a.statement))}</p>
    <div class="btns" style="padding-block:18px 32px"><a class="btn g" href="#/about">About & CV</a></div>
    ${live ? `<section class="sec"><div class="k"><span class="dot"></span>&nbsp; On view now</div>
      <a class="onview" href="#/exhibition/${live.slug}">${im(live.images[0], '')}<div><h3>${esc(live.title)}</h3>
      <div class="m">${esc(place(live))}</div></div></a></section>` : ''}
    <section class="sec"><div class="sec-h"><h2>Works</h2>
      <div class="seg" role="group" aria-label="Show works"><button type="button" data-seg="latest" aria-pressed="true">Latest</button><button type="button" data-seg="by-exhibition" aria-pressed="false">By exhibition</button></div></div>
      <div data-pane="latest"><div class="list">${M.works.slice(0, 8).map(workRow).join('')}</div><a class="more" href="#/works" style="display:block;padding-top:14px">All ${M.works.length} works →</a></div>
      <div data-pane="by-exhibition" hidden><div class="covers">${M.exhibitions.map(cover).join('')}</div></div></section>
    ${M.objects.length ? `<section class="sec"><div class="sec-h"><h2>Objects</h2></div>
      <div class="covers">${M.objects.map(o => `<a href="#/object/${o.slug}">${im(o.images[0], '')}<div><b>${esc(o.title)}</b><div class="m">${esc(o.meta)}</div></div></a>`).join('')}</div></section>` : ''}
  </div>`;
}

function archive(year) {
  const years = [...new Set(M.works.map(w => w.year))];
  const list = year ? M.works.filter(w => w.year === year) : M.works;
  return `<div class="wrap gut">
    <div class="ex-head"><div class="k">${esc(M.artist.name)} · Archive</div><h1>Works</h1><div class="m">${list.length} ${list.length === 1 ? 'work' : 'works'}${year ? ` from ${esc(year)}` : ''}</div></div>
    <div class="chips" style="padding-block:18px 28px"><a class="chip" href="#/works" ${!year ? 'aria-current="page"' : ''}>All</a>${years.map(y => `<a class="chip" href="#/works/${y}" ${y === year ? 'aria-current="page"' : ''}>${esc(y)}</a>`).join('')}</div>
    <div class="grid">${list.map(w => `<a href="#/work/${w.slug}"><div class="im">${im(w.image, w.title)}</div><div class="c"><b>${esc(w.title)}</b>${soldDot(w)}<div class="m">${esc(metaLine(w))}</div></div></a>`).join('')}</div>
  </div>`;
}

function exhibition(slug) {
  const e = M.exhibitions.find(x => x.slug === slug);
  if (!e) return notFound();
  return `<div class="wrap gut">
    <div class="album">
      ${im(e.images[0], `Installation view of ${e.title}`, 'class="cover" loading="eager"')}
      <div class="k">Exhibition · ${esc(e.year)}${e.city ? ` · ${esc(e.city)}` : ''}</div>
      <h1>${esc(e.title)}</h1>
      <a class="by" href="#/artist/${e.artist.slug}">${im(e.artist.portrait, '')}${esc(e.artist.name)}</a>
      <div class="m">${esc([e.dates, e.venue].filter(Boolean).join(' · '))}</div>
      ${e.space ? `<div class="btns"><a class="btn f" href="#/exhibition/${e.slug}/space">Enter the space</a></div><p class="m">${esc(e.space.source)}: a walkable 3D space in the room's own light, with every work at its measured size and place.</p>` : ''}
    </div>
    ${e.works.length ? `<section class="sec"><div class="sec-h"><h2>Works</h2><span class="more">${e.works.length} works</span></div>
      ${e.confirmed ? '' : `<p class="note">${e.space ? 'Identified from the installation photos, in walking order. Waiting for the artist to confirm.' : 'Draft list, grouped by year. Waiting for the artist to confirm which works were in the show.'}</p>`}
      <div class="tracks">${e.works.map((w, i) => `<a class="track" href="#/work/${w.slug}"><span class="n">${i + 1}</span>${im(w.image, '')}<div class="t"><div><b>${esc(w.title)}</b></div><div class="m">${esc([w.medium, w.size].filter(Boolean).join(' · '))}</div></div>${w.sold ? '<span class="dot" title="Sold" aria-label="Sold"></span>' : '<span></span>'}</a>`).join('')}</div>
      ${e.maybe.length ? `<p class="note">Possibly also in the show, not visible in the photos: ${e.maybe.map(w => `<a href="#/work/${w.slug}">${esc(w.title)}</a>`).join(', ')}.</p>` : ''}</section>` : ''}
    <section class="sec"><div class="sec-h"><h2>About the exhibition</h2></div><div class="prose">${e.text.map(p => `<p>${esc(p)}</p>`).join('')}</div></section>
    ${e.images.length ? `<section class="sec"><div class="sec-h"><h2>Installation views</h2></div>
      <div class="views">${e.images.map((p, i) => `<button type="button" data-zoom="${esc(src(p))}" aria-label="Installation view ${i + 1}">${im(p, `Installation view ${i + 1} of ${e.title}`)}</button>`).join('')}</div></section>` : ''}
  </div>`;
}

function work(slug) {
  const w = M.works.find(x => x.slug === slug);
  if (!w) return notFound();
  const ex = exOf(w);
  const seq = ex ? ex.works : M.works, idx = seq.indexOf(w), prev = seq[idx - 1], next = seq[idx + 1];
  return `<div class="stage"><button type="button" data-zoom="${esc(src(w.image))}" aria-label="Zoom into ${esc(w.title)}">${im(w.image, w.title, 'loading="eager"')}</button></div>
  <div class="wrap gut">
    <div class="work">
      <div class="label"><b>${esc(w.title)}${soldDot(w)}</b><span>${esc(w.artist.name)}, ${esc(w.year)}</span><span>${esc(w.medium)}</span>${w.size ? `<span class="s">${esc(w.size)}</span>` : ''}${w.sold ? '<span class="s">Sold · private collection</span>' : ''}</div>
      <div class="btns"><button type="button" class="btn f" data-zoom="${esc(src(w.image))}">Zoom</button>${w.pairs.length ? '<button type="button" class="btn g" id="scaleBtn" aria-expanded="false">At scale</button>' : ''}</div>
      <div class="scale" id="scale" hidden></div>
      ${ex ? `<a class="onview" href="#/exhibition/${ex.slug}">${im(ex.images[0], '')}<div><div class="k">From the exhibition</div><h3>${esc(ex.title)}</h3><div class="m">${esc(place(ex))}</div></div></a>` : ''}
    </div>
    <nav class="pn" aria-label="More works">${prev ? `<a href="#/work/${prev.slug}">← ${esc(prev.title)}</a>` : '<span></span>'}${next ? `<a href="#/work/${next.slug}">${esc(next.title)} →</a>` : '<span></span>'}</nav>
  </div>`;
}

// "At scale": the work drawn from its recorded size beside a 175 cm figure, on a 145 cm centre line.
// The recorded pair is oriented to match the photo, since records mix height × width and width × height.
function drawScale(w, aspect) {
  let best = null;
  for (const [a, b] of w.pairs) for (const [h, wd] of [[a, b], [b, a]]) {
    const err = Math.abs((wd / h) / aspect - 1);
    if (!best || err < best.err) best = { h, w: wd, err };
  }
  const H = 260, floor = H - 8, k = 0.9, cx = 40;
  const top = floor - 145 * k - best.h * k / 2;
  const fx = cx + best.w * k + 60, fh = 175 * k, r = 10 * k;
  return `<svg viewBox="0 0 ${Math.max(fx + 60, 320)} ${H}" role="img" aria-label="${esc(w.title)}, ${best.h} by ${best.w} cm, beside a 175 cm figure">
    <line x1="0" x2="100%" y1="${floor}" y2="${floor}" stroke="currentColor" stroke-opacity=".5"/>
    <image href="${esc(src(w.image))}" x="${cx}" y="${top}" width="${best.w * k}" height="${best.h * k}" preserveAspectRatio="none"/>
    <g fill="currentColor" fill-opacity=".35"><circle cx="${fx}" cy="${floor - fh + r}" r="${r}"/><rect x="${fx - 15 * k}" y="${floor - fh + 2.2 * r}" width="${30 * k}" height="${fh - 2.2 * r}" rx="${13 * k}"/></g>
    <text x="${cx}" y="${top - 8}" font-family="IBM Plex Mono, monospace" font-size="11" fill="currentColor" fill-opacity=".7">${best.h} × ${best.w} cm${best.err > 0.06 ? ' · size to confirm' : ''}</text>
    <text x="${fx + 18}" y="${floor - 4}" font-family="IBM Plex Mono, monospace" font-size="11" fill="currentColor" fill-opacity=".7">175 cm</text>
  </svg>`;
}

function object(slug) {
  const o = M.objects.find(x => x.slug === slug);
  if (!o) return notFound();
  return `<div class="wrap gut">
    <div class="ex-head"><div class="k">Object · ${esc(M.artist.name)}</div><h1>${esc(o.title)}</h1><div class="m">${esc(o.meta)}</div></div>
    <section class="sec" style="border-top:0"><div class="prose">${o.text.map(p => `<p>${esc(p)}</p>`).join('')}</div></section>
    <div class="views">${o.images.map((p, i) => `<button type="button" data-zoom="${esc(src(p))}" aria-label="View ${i + 1}">${im(p, `${o.title}, view ${i + 1}`)}</button>`).join('')}</div>
  </div>`;
}

function about() {
  const { s, cv } = M;
  const groups = [...new Set(cv.map(c => c.group))];
  return `<div class="wrap gut"><div class="about">
    <div style="display:grid;gap:10px">${im(s.about_portrait, s.about_caption || 'Portrait')}<div class="k">${esc(s.about_caption)}</div></div>
    <div class="ex-head" style="padding:0"><div class="k">About</div><h1>${esc(M.artist.name)}</h1></div>
    <div class="prose">${(s.about_text || '').split(/\n\s*\n/).map(p => `<p>${esc(p)}</p>`).join('')}<p style="color:var(--muted)">${esc(s.about_credit)}</p></div>
    <div class="cv">${groups.map(g => `<div><h3>${esc(g)}</h3><dl>${cv.filter(c => c.group === g).map(c => `<dt>${esc(c.year)}</dt><dd>${esc(c.title)}${c.venue ? `<br><span>${esc(c.venue)}</span>` : ''}</dd>`).join('')}</dl></div>`).join('')}</div>
    <div class="contact"><div class="k">Contact</div><span class="addr">${esc(s.email)}</span><a href="${esc(s.instagram)}" target="_blank" rel="noopener">Instagram</a></div>
  </div></div>`;
}

function search(q = '') {
  return `<div class="wrap gut">
    <div class="home-h"><h1>Search</h1></div>
    <label for="q" class="k" style="display:block;margin-bottom:8px">Artists, exhibitions, works, places</label>
    <input id="q" class="search" type="search" placeholder="Try “Ritual”, “oil”, “Jerusalem”" value="${esc(q)}" autocomplete="off">
    <div id="results" class="results">${results(q)}</div>
  </div>`;
}

function results(q) {
  q = q.trim().toLowerCase();
  if (!q) return `<p class="m" style="color:var(--muted)">Search across everything on Studio.</p>`;
  const hit = (...xs) => xs.some(x => String(x || '').toLowerCase().includes(q));
  const artists = M.artists.filter(a => hit(a.name, a.city, a.discipline));
  const shows = M.exhibitions.filter(e => hit(e.title, e.venue, e.city, e.year));
  const works = M.works.filter(w => hit(w.title, w.medium, w.year));
  const places = M.cities.filter(c => hit(c.name, c.country));
  if (!artists.length && !shows.length && !works.length && !places.length) return `<p style="color:var(--muted)">Nothing matches “${esc(q)}”.</p>`;
  return [
    artists.length && `<section class="shelf" style="padding:0"><h2>Artists</h2><div class="people">${artists.map(person).join('')}</div></section>`,
    shows.length && `<section class="shelf" style="padding:0"><h2>Exhibitions</h2><div class="covers">${shows.map(cover).join('')}</div></section>`,
    works.length && `<section class="shelf" style="padding:0"><h2>Works</h2><div class="list">${works.slice(0, 20).map(workRow).join('')}</div></section>`,
    places.length && `<section class="shelf" style="padding:0"><h2>Places</h2><div class="places">${places.map(cityCard).join('')}</div></section>`,
  ].filter(Boolean).join('');
}

function places() {
  return `<div class="wrap gut">
    <div class="home-h"><h1>Places</h1></div>
    <p style="color:var(--muted);padding-bottom:18px">Where Studio artists live and show. Openings near you come later.</p>
    <div class="places">${M.cities.map(cityCard).join('')}</div>
  </div>`;
}

function placePage(slug) {
  const c = M.cities.find(x => x.slug === slug);
  if (!c) return notFound();
  const shows = M.exhibitions.filter(e => e.city === c.name), artists = M.artists.filter(a => a.city === c.name);
  return `<div class="wrap gut">
    <div class="ex-head"><div class="k">Place · ${esc(c.country)}</div><h1>${esc(c.name)}</h1></div>
    ${artists.length ? `<section class="shelf"><h2>Artists based here</h2><div class="people">${artists.map(person).join('')}</div></section>` : ''}
    ${shows.length ? `<section class="shelf"><h2>Exhibitions here</h2><div class="covers">${shows.map(cover).join('')}</div></section>` : ''}
  </div>`;
}

const notFound = () => `<div class="wrap gut loading"><p>This page doesn't exist. <a href="#/">Back to Home</a></p></div>`;

// --- router ----------------------------------------------------------------
const routes = [
  [/^#?\/?$/, () => home(), 'home'],
  [/^#\/search$/, () => search(), 'search'],
  [/^#\/places$/, () => places(), 'places'],
  [/^#\/place\/([^/]+)$/, m => placePage(m[1]), 'places'],
  [/^#\/artist\/([^/]+)$/, m => artistPage(m[1])],
  [/^#\/works\/?$/, () => archive()],
  [/^#\/works\/([^/]+)$/, m => archive(decodeURIComponent(m[1]))],
  [/^#\/work\/([^/]+)$/, m => work(m[1])],
  [/^#\/exhibition\/([^/]+)$/, m => exhibition(m[1])],
  [/^#\/exhibition\/([^/]+)\/space$/, m => exhibition(m[1])],
  [/^#\/object\/([^/]+)$/, m => object(m[1])],
  [/^#\/about$/, () => about()],
];

let prevHash = null, lastHash = null;
function render() {
  const hash = location.hash || '#/';
  if (hash !== lastHash) { prevHash = lastHash; lastHash = hash; }
  let html = notFound(), tab = null;
  for (const [re, view, t] of routes) { const m = hash.match(re); if (m) { html = view(m); tab = t || null; break; } }
  const top = tab === 'home' || tab === 'search' || hash === '#/places';
  document.querySelector('.bar').hidden = top;
  if (!top) document.querySelector('.bar .wrap').innerHTML = `<button type="button" class="back" id="backBtn" style="border:0;background:none;cursor:pointer;padding:0"><span aria-hidden="true">←</span> Back</button><a class="brand" href="#/">Open Studio</a>`;
  const tabs = document.querySelector('.tabs');
  tabs.hidden = false; document.body.classList.add('has-tabs');
  tabs.querySelectorAll('a').forEach(a => { if (a.dataset.tab === tab) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
  if (openSpaceView) { openSpaceView.close(); openSpaceView = null; }
  app.innerHTML = html;
  window.scrollTo(0, 0);
  wire();
  const sm = hash.match(/^#\/exhibition\/([^/]+)\/space$/);
  if (sm) enterSpace(sm[1]);
}

// the 3D room opens over the exhibition page; leaving it returns to the page
let openSpaceView = null;
async function enterSpace(slug) {
  const e = M.exhibitions.find(x => x.slug === slug);
  if (!e || !e.space) return;
  const openSpace = window.__openSpace || (await import('./space/space.js')).openSpace;
  openSpaceView = await openSpace({
    spec: e.space, works: M.works, src,
    // leaving the space goes back to where it was entered from, without leaving the space in the history
    onClose: () => {
      openSpaceView = null;
      const page = `#/exhibition/${slug}`;
      if (prevHash === page) history.back(); else location.replace(page);
    },
    onOpenWork: w => { location.hash = `#/work/${w.slug}`; },
  });
  window.__spaceView = openSpaceView;
}

function wire() {
  const back = document.getElementById('backBtn');
  if (back) back.onclick = () => { if (history.length > 1) history.back(); else location.hash = '#/'; };
  const q = document.getElementById('q');
  if (q) q.oninput = () => { document.getElementById('results').innerHTML = results(q.value); };
  document.querySelectorAll('[data-seg]').forEach(b => b.onclick = () => {
    document.querySelectorAll('[data-seg]').forEach(x => x.setAttribute('aria-pressed', x === b));
    document.querySelectorAll('[data-pane]').forEach(p => { p.hidden = p.dataset.pane !== b.dataset.seg; });
  });
  const scaleBtn = document.getElementById('scaleBtn');
  if (scaleBtn) scaleBtn.onclick = () => {
    const box = document.getElementById('scale'), w = M.works.find(x => location.hash.endsWith('/' + x.slug));
    const open = box.hidden;
    if (open && !box.innerHTML) {
      const probe = new Image();
      probe.onload = () => { box.innerHTML = drawScale(w, probe.naturalWidth / probe.naturalHeight); };
      probe.src = src(w.image);
    }
    box.hidden = !open; scaleBtn.setAttribute('aria-expanded', open);
  };
}

// zoom viewer: tap to switch between fit-to-screen and full size, Escape or × to close
function openZoom(url) {
  const z = document.createElement('div');
  z.className = 'zoom'; z.setAttribute('role', 'dialog'); z.setAttribute('aria-label', 'Zoomed image');
  z.innerHTML = `<img src="${esc(url)}" alt=""><button type="button" class="x" aria-label="Close">×</button>`;
  const close = () => { z.remove(); document.removeEventListener('keydown', onKey); };
  const onKey = e => { if (e.key === 'Escape') close(); };
  z.querySelector('.x').onclick = close;
  z.querySelector('img').onclick = () => z.classList.toggle('full');
  document.addEventListener('keydown', onKey);
  document.body.append(z); z.querySelector('.x').focus();
}
document.addEventListener('click', e => { const t = e.target.closest('[data-zoom]'); if (t) openZoom(t.dataset.zoom); });

loadData().then(d => { M = buildModel(d); render(); window.addEventListener('hashchange', render); })
  .catch(() => { app.innerHTML = `<div class="wrap gut loading"><p>The content couldn't be loaded. Refresh to try again.</p></div>`; });

// Installed on a phone (Add to Home Screen) the app works offline and picks up every update on the next open
if ('serviceWorker' in navigator && !window.STUDIO_DATA && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});

// On a phone, offer to put the app on the home screen: Android installs on a tap; iPhone needs Share → Add to Home Screen
(function offerInstall() {
  const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  let seen = false; try { seen = localStorage.getItem('os-install-dismissed') === '1'; } catch {}
  if (window.STUDIO_DATA || standalone || seen || !matchMedia('(pointer: coarse)').matches) return;
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent);
  let prompt = null;
  const show = () => {
    if (document.querySelector('.install')) return;
    const card = document.createElement('aside');
    card.className = 'install';
    card.innerHTML = `<img src="icons/icon-192.png" alt=""><div><b>Get Open Studio</b>${ios
      ? 'Tap <span aria-label="Share">Share</span>, then “Add to Home Screen”.'
      : 'Install the app on your phone.'}</div>${prompt ? '<button class="btn f" data-install>Install</button>' : ''}<button class="x" aria-label="Close">×</button>`;
    card.querySelector('.x').onclick = () => { card.remove(); try { localStorage.setItem('os-install-dismissed', '1'); } catch {} };
    const b = card.querySelector('[data-install]');
    if (b) b.onclick = async () => { prompt.prompt(); await prompt.userChoice.catch(() => {}); card.remove(); };
    document.body.appendChild(card);
  };
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); prompt = e; show(); });
  window.addEventListener('appinstalled', () => document.querySelector('.install')?.remove());
  if (ios) setTimeout(show, 2500);
})();
