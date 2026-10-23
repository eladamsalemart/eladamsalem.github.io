// Studio prototype: one artist's home, built on the site's own content files.
// Data comes from /content/*.json on the live site, or from window.STUDIO_DATA in a baked preview.

const app = document.getElementById('app');

async function loadData() {
  if (window.STUDIO_DATA) return window.STUDIO_DATA;
  const get = name => fetch(`/content/${name}.json`).then(r => r.json());
  const [settings, works, exhibitions, objects, cv] = await Promise.all(['settings', 'works', 'exhibitions', 'objects', 'cv'].map(get));
  return { settings, works, exhibitions, objects, cv };
}

// --- model -----------------------------------------------------------------
const slugify = s => s.toLowerCase().normalize('NFKD').replace(/[^\w\s-]/g, '').trim().replace(/[\s_]+/g, '-') || 'untitled';
const cap = s => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
const curly = s => String(s || '').replace(/^"/, '\u201C').replace(/"$/, '\u201D');
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

// Every "a × b" pair recorded for a work: the description's line first (it came with the original records), then the size field.
function sizePairs(w) {
  const text = (w.description || '') + ' ' + (w.size || '');
  return [...text.matchAll(/(\d+(?:\.\d+)?)\s*[x×X]\s*(\d+(?:\.\d+)?)/g)].map(m => [+m[1], +m[2]]);
}

function buildModel(d) {
  const seen = new Set();
  const uniq = base => { let s = base, i = 2; while (seen.has(s)) s = `${base}-${i++}`; seen.add(s); return s; };
  const works = d.works.map((w, i) => {
    const firstLine = (w.description || '').split('\n')[0].replace(/\s+/g, ' ').trim();
    const pairs = sizePairs(w);
    return {
      i, slug: uniq(slugify(`${w.title}-${w.year}`)), title: (w.title || 'Untitled').trim(), year: String(w.year || ''),
      medium: cap(firstLine) || w.tech || '', pairs, size: pairs.length ? `${pairs[0][0]} × ${pairs[0][1]} cm` : '',
      sold: w.available === false, image: w.image,
    };
  });
  // newest first, keeping the editor's order inside a year
  works.sort((a, b) => (+b.year || 0) - (+a.year || 0) || a.i - b.i);
  const exhibitions = d.exhibitions.map(e => {
    const lines = (e.description || '').split('\n').map(s => s.trim());
    const hasDates = /\d{4}/.test(lines[0] || '') && lines[0].length < 40;
    return {
      slug: uniq(slugify(e.title)), title: e.title.trim(), year: e.year, venue: (e.venue || '').trim(),
      dates: hasDates ? lines[0] : '', text: (hasDates ? lines.slice(1) : lines).filter(Boolean), images: e.images || [],
    };
  }).sort((a, b) => (+b.year || 0) - (+a.year || 0));
  const objects = d.objects.map(o => ({
    slug: uniq(slugify(o.title)), title: o.title.trim(), meta: o.meta || '', images: o.images || [],
    text: (o.description || '').split('\n').map(s => s.replace(/​/g, '').trim()).filter(Boolean),
  }));
  return { s: d.settings, works, exhibitions, objects, cv: d.cv, media: d.media || {} };
}

// --- views -----------------------------------------------------------------
let M;
const src = p => M.media[p] || p;
const im = (p, alt, attrs = '') => `<img src="${esc(src(p))}" alt="${esc(alt)}" loading="lazy" ${attrs}>`;
const metaLine = w => [w.year, w.medium, w.size].filter(Boolean).join(' · ');

function workRow(w) {
  return `<a class="row" href="#/work/${w.slug}">${im(w.image, '')}<div class="t"><div><b>${esc(w.title)}</b></div><div class="m">${esc(metaLine(w))}</div></div>${w.sold ? '<span class="dot" title="Sold" aria-label="Sold"></span>' : '<span></span>'}</a>`;
}

function profile() {
  const { s, works, exhibitions, objects } = M;
  const name = (s.hero_title || 'Elad Amsalem').replace(/\n/g, ' ');
  const live = exhibitions[0];
  return `
  <section class="hero">${im(s.hero_image, 'Installation view of Ritual, Jerusalem Artists’ House', 'loading="eager"')}
    <div class="ov gut"><div class="wrap"><div class="k">${esc(s.hero_label)}</div><h1>${esc(name)}</h1></div></div></section>
  <div class="wrap gut">
    <p class="statement">${esc(curly(s.hero_statement))}</p>
    <div class="btns" style="padding-block:18px 32px"><a class="btn g" href="#/about">About & CV</a><a class="btn g" href="#/works">All works</a></div>
    ${live ? `<section class="sec"><div class="k"><span class="dot"></span>&nbsp; On view now</div>
      <a class="onview" href="#/exhibition/${live.slug}">${im(live.images[0], '')}<div><h3>${esc(live.title)}</h3>
      <div class="m">${esc([live.dates || live.year, live.venue].filter(Boolean).join(' · '))}</div></div></a></section>` : ''}
    <section class="sec"><div class="sec-h"><h2>Exhibitions</h2></div>
      <div class="rail">${exhibitions.map(e => `<a href="#/exhibition/${e.slug}">${im(e.images[0], '')}<div><b>${esc(e.title)}</b><div class="m">${esc(e.year)}</div></div></a>`).join('')}</div></section>
    <section class="sec"><div class="sec-h"><h2>Works</h2><a class="more" href="#/works">All ${works.length} works →</a></div>
      <div class="list">${works.slice(0, 8).map(workRow).join('')}</div></section>
    ${objects.length ? `<section class="sec"><div class="sec-h"><h2>Objects</h2></div>
      <div class="rail">${objects.map(o => `<a href="#/object/${o.slug}">${im(o.images[0], '')}<div><b>${esc(o.title)}</b><div class="m">${esc(o.meta)}</div></div></a>`).join('')}</div></section>` : ''}
  </div>`;
}

function archive(year) {
  const years = [...new Set(M.works.map(w => w.year))];
  const list = year ? M.works.filter(w => w.year === year) : M.works;
  return `<div class="wrap gut">
    <div class="ex-head"><div class="k">Archive</div><h1>Works</h1><div class="m">${list.length} ${list.length === 1 ? 'work' : 'works'}${year ? ` from ${esc(year)}` : ''}</div></div>
    <div class="chips" style="padding-block:18px 28px"><a class="chip" href="#/works" ${!year ? 'aria-current="page"' : ''}>All</a>${years.map(y => `<a class="chip" href="#/works/${y}" ${y === year ? 'aria-current="page"' : ''}>${esc(y)}</a>`).join('')}</div>
    <div class="grid">${list.map(w => `<a href="#/work/${w.slug}"><div class="im">${im(w.image, w.title)}</div><div class="c"><b>${esc(w.title)}</b>${w.sold ? ' <span class="dot" aria-label="Sold"></span>' : ''}<div class="m">${esc(metaLine(w))}</div></div></a>`).join('')}</div>
  </div>`;
}

function work(slug) {
  const idx = M.works.findIndex(w => w.slug === slug);
  if (idx < 0) return notFound();
  const w = M.works[idx], prev = M.works[idx - 1], next = M.works[idx + 1];
  return `<div class="stage"><button type="button" data-zoom="${esc(src(w.image))}" aria-label="Zoom into ${esc(w.title)}">${im(w.image, w.title, 'loading="eager"')}</button></div>
  <div class="wrap gut">
    <div class="work">
      <div class="label"><b>${esc(w.title)}${w.sold ? ' <span class="dot" title="Sold" aria-label="Sold"></span>' : ''}</b><span>Elad Amsalem, ${esc(w.year)}</span><span>${esc(w.medium)}</span>${w.size ? `<span class="s">${esc(w.size)}</span>` : ''}${w.sold ? '<span class="s">Sold · private collection</span>' : ''}</div>
      <div style="display:grid;gap:12px;align-content:start">
        <div class="btns"><button type="button" class="btn f" data-zoom="${esc(src(w.image))}">Zoom</button>${w.pairs.length ? '<button type="button" class="btn g" id="scaleBtn" aria-expanded="false">At scale</button>' : ''}</div>
        <div class="scale" id="scale" hidden></div>
      </div>
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

function exhibition(slug) {
  const e = M.exhibitions.find(x => x.slug === slug);
  if (!e) return notFound();
  return `<div class="ex-hero">${e.images[0] ? im(e.images[0], `Installation view of ${e.title}`, 'loading="eager"') : ''}</div>
  <div class="wrap gut">
    <div class="ex-head"><div class="k">Exhibition · ${esc(e.year)}</div><h1>${esc(e.title)}</h1><div class="m">${esc([e.dates, e.venue].filter(Boolean).join(' · '))}</div></div>
    <section class="sec" style="border-top:0"><div class="prose">${e.text.map(p => `<p>${esc(p)}</p>`).join('')}</div></section>
    ${e.images.length ? `<section class="sec"><div class="sec-h"><h2>Installation views</h2></div>
      <div class="views">${e.images.map((p, i) => `<button type="button" data-zoom="${esc(src(p))}" aria-label="Installation view ${i + 1}">${im(p, `Installation view ${i + 1} of ${e.title}`)}</button>`).join('')}</div></section>` : ''}
  </div>`;
}

function object(slug) {
  const o = M.objects.find(x => x.slug === slug);
  if (!o) return notFound();
  return `<div class="wrap gut">
    <div class="ex-head"><div class="k">Object</div><h1>${esc(o.title)}</h1><div class="m">${esc(o.meta)}</div></div>
    <section class="sec" style="border-top:0"><div class="prose">${o.text.map(p => `<p>${esc(p)}</p>`).join('')}</div></section>
    <div class="views">${o.images.map((p, i) => `<button type="button" data-zoom="${esc(src(p))}" aria-label="View ${i + 1}">${im(p, `${o.title}, view ${i + 1}`)}</button>`).join('')}</div>
  </div>`;
}

function about() {
  const { s, cv } = M;
  const groups = [...new Set(cv.map(c => c.group))];
  return `<div class="wrap gut"><div class="about">
    <div style="display:grid;gap:10px;align-content:start">${im(s.about_portrait, s.about_caption || 'Portrait')}<div class="k">${esc(s.about_caption)}</div></div>
    <div style="display:grid;gap:30px">
      <div class="ex-head" style="padding:0"><div class="k">About</div><h1>${esc((s.hero_title || '').replace(/\n/g, ' '))}</h1></div>
      <div class="prose">${(s.about_text || '').split(/\n\s*\n/).map(p => `<p>${esc(p)}</p>`).join('')}<p style="color:var(--muted)">${esc(s.about_credit)}</p></div>
      <div class="cv">${groups.map(g => `<div><h3>${esc(g)}</h3><dl>${cv.filter(c => c.group === g).map(c => `<dt>${esc(c.year)}</dt><dd>${esc(c.title)}${c.venue ? `<br><span>${esc(c.venue)}</span>` : ''}</dd>`).join('')}</dl></div>`).join('')}</div>
      <div class="contact"><div class="k">Contact</div><span class="addr">${esc(s.email)}</span><a href="${esc(s.instagram)}" target="_blank" rel="noopener">Instagram</a></div>
    </div>
  </div></div>`;
}

const notFound = () => `<div class="wrap gut loading"><p>This page doesn't exist. <a href="#/">Back to the profile</a></p></div>`;

// --- router ----------------------------------------------------------------
const routes = [
  [/^#?\/?$/, () => profile()],
  [/^#\/works\/?$/, () => archive()],
  [/^#\/works\/([^/]+)$/, m => archive(decodeURIComponent(m[1]))],
  [/^#\/work\/([^/]+)$/, m => work(m[1])],
  [/^#\/exhibition\/([^/]+)$/, m => exhibition(m[1])],
  [/^#\/object\/([^/]+)$/, m => object(m[1])],
  [/^#\/about$/, () => about()],
];

function render() {
  const hash = location.hash || '#/';
  let html = notFound();
  for (const [re, view] of routes) { const m = hash.match(re); if (m) { html = view(m); break; } }
  const home = /^#?\/?$/.test(hash);
  document.querySelector('.bar .wrap').innerHTML = home
    ? `<a class="brand" href="#/">Studio</a><span class="tag">Prototype</span>`
    : `<a class="back" href="#/"><span aria-hidden="true">←</span> Elad Amsalem</a><a class="brand" href="#/">Studio</a>`;
  app.innerHTML = html;
  window.scrollTo(0, 0);
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
