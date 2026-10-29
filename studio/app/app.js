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
  // small versions of the site's images (written when the app is published), for grids and lists on a phone
  const thumbs = await get('data/thumbs.json').catch(() => ({}));
  // the demo world: fictional artists, galleries and shows, to see the app full (data/demo/world.json)
  const world = await get('data/demo/world.json').catch(() => null);
  return { settings, works, exhibitions, objects, cv, studio, spaces, thumbs, world };
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
      image: w.image, artist,
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
      artists: [artist], kind: 'gallery', ...span(hasDates ? lines[0] : '', e.year), events: [],
      ...((d.world && d.world.venues || {})[e.title.trim()] || {}),
    };
  }).sort((a, b) => (+b.year || 0) - (+a.year || 0));
  const objects = d.objects.map(o => ({
    slug: uniq(slugify(o.title)), title: o.title.trim(), meta: o.meta || '', images: o.images || [],
    text: (o.description || '').split('\n').map(x => x.replace(/​/g, '').trim()).filter(Boolean),
  }));
  const cities = [];
  for (const e of exhibitions) if (e.city && !cities.some(c => c.name === e.city)) cities.push({ name: e.city, slug: slugify(e.city), country: e.country });
  if (artist.city && !cities.some(c => c.name === artist.city)) cities.push({ name: artist.city, slug: slugify(artist.city), country: artist.country });
  const m = { s, artist, artists: [artist], works, exhibitions, objects, cities, cv: d.cv, media: d.media || {}, thumbs: { ...(d.thumbs || {}) },
    live: [], listings: [], places: {} };
  if (d.world) addWorld(m, d.world, uniq, seen);
  return m;
}

// a show's dates as days: "21 Feb — 30 May, 2026" (else the whole year it's from)
function span(dates, year) {
  const y = +(String(dates).match(/\d{4}/) || [year])[0] || new Date().getFullYear();
  const days = [...String(dates).matchAll(/(\d{1,2})\s+([A-Za-z]{3})/g)].map(m => new Date(`${m[1]} ${m[2]} ${y}`));
  if (days.length >= 2 && !isNaN(days[0]) && !isNaN(days[1])) return { start: days[0], end: new Date(+days[1] + 86399000) };
  return { start: new Date(y, 0, 1), end: new Date(y, 11, 31, 23, 59) };
}
const DAY = 86400000;
const today = () => { const t = new Date(); t.setHours(0, 0, 0, 0); return t; };
const inDays = (n, time) => { const t = new Date(+today() + n * DAY); if (time) { const [h, mi] = time.split(':'); t.setHours(+h, +mi); } return t; };

// the demo world joins the real content: its artists, works, shows (dates as days from today), the studio
// clips on artists' pages, and the galleries listed on the map that aren't on Open Studio
function addWorld(m, w, uniq, seen) {
  const A = new Map();
  for (const a of w.artists) {
    seen.add(a.slug);
    const x = { ...a, label: [a.discipline, a.city].filter(Boolean).join(' · '), country: 'Israel', demo: true };
    A.set(a.slug, x); m.artists.push(x);
  }
  const W = new Map();
  for (const v of w.works) {
    const [cw, ch] = v.size, x = { i: m.works.length, slug: uniq(v.slug), title: v.title, year: v.year, medium: v.medium, pairs: [[ch, cw]],
      size: `${ch} × ${cw} cm`, image: v.image, artist: A.get(v.artist), demo: true };
    W.set(v.slug, x); m.works.push(x);
  }
  m.works.sort((a, b) => (+b.year || 0) - (+a.year || 0) || a.i - b.i);
  for (const v of w.shows) {
    const start = inDays(v.start), end = new Date(+inDays(v.end) + DAY - 60000);
    const fmt = t => t.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    m.exhibitions.push({
      slug: uniq(v.slug), title: v.title, year: String(start.getFullYear()), venue: v.venue, address: v.address || '',
      dates: `${fmt(start)} — ${fmt(end)}, ${end.getFullYear()}`, text: [v.text], images: v.images || [], city: v.city, country: v.city ? 'Israel' : '',
      confirmed: true, artist: A.get(v.artists[0]), artists: v.artists.map(s => A.get(s)), works: v.works.map(s => W.get(s)).filter(Boolean), maybe: [],
      space: null, kind: v.kind, start, end, hours: v.hours, at: v.at, curator: v.curator || '', demo: true,
      events: (v.events || []).map(e => ({ at: inDays(e.day, e.time), what: e.what })),
    });
  }
  m.exhibitions.sort((a, b) => b.end - a.end);
  for (const e of m.exhibitions) for (const ev of e.events) ev.show = e;
  m.live = w.live.map(p => ({ ...p, artist: A.get(p.artist), work: W.get(p.work) || null, at: new Date(Date.now() - p.ago * 3600000) }));
  m.listings = w.listings.map(l => ({ ...l, start: inDays(l.start), end: new Date(+inDays(l.end) + DAY - 60000),
    events: (l.events || []).map(e => ({ at: inDays(e.day, e.time), what: e.what })) }));
  for (const l of m.listings) for (const ev of l.events) ev.listing = l;
  m.places = w.places || {};
  Object.assign(m.thumbs, w.thumbs || {});
  for (const e of m.exhibitions) if (e.city && !m.cities.some(c => c.name === e.city)) m.cities.push({ name: e.city, slug: slugify(e.city), country: e.country });
}

// where a show stands today
const status = e => { const now = Date.now(); return now < e.start ? 'soon' : now > e.end ? 'past' : 'on'; };
const isOn = e => status(e) === 'on';
const nextEvent = e => e.events.filter(v => +v.at > Date.now() - 3 * 3600000).sort((a, b) => a.at - b.at)[0];
const worksOf = a => M.works.filter(w => w.artist === a);
// an artist's shows, their own first (a group show after)
const showsOf = a => M.exhibitions.filter(e => (e.artists || [e.artist]).includes(a)).sort((x, y) => (y.artist === a) - (x.artist === a));
const byOf = e => (e.artists || [e.artist]).map(a => a.name).join(' × ');
const dayName = t => { const d = Math.round((new Date(t).setHours(0, 0, 0, 0) - today()) / DAY); return d === 0 ? 'Tonight' : d === 1 ? 'Tomorrow' : t.toLocaleDateString('en-GB', { weekday: 'short' }); };
const hm = t => t.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
const evWhen = ev => { const d = dayName(ev.at); return `${ev.what} ${d === 'Tonight' || d === 'Tomorrow' ? d.toLowerCase() : d} · ${hm(ev.at)}`; };
const dm = t => t.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
function when(e) {
  const st = status(e), left = Math.ceil((e.end - Date.now()) / DAY), ev = nextEvent(e);
  if (e.kind === 'online' && st === 'on') return left <= 7 ? `Online · closing in ${left} days` : 'Online now · open all the time';
  if (st === 'soon') return ev ? evWhen(ev) : `Opens ${dm(e.start)}`;
  if (st === 'on') return ev && +ev.at - Date.now() < 2 * DAY ? evWhen(ev) : left <= 7 ? `Closing in ${left} ${left === 1 ? 'day' : 'days'}` : `On until ${dm(e.end)}`;
  return e.space ? 'Closed · walk it in 3D' : `Closed ${e.end.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}`;
}

// following artists (kept on this phone); to start with, a few
const FOLLOW_KEY = 'os-following';
function following() {
  try { const f = JSON.parse(localStorage.getItem(FOLLOW_KEY)); if (Array.isArray(f)) return f; } catch {}
  return [M.artist.slug, 'lia-moren', 'maya-haddad'];
}
function setFollow(slug, on) {
  const f = new Set(following()); if (on) f.add(slug); else f.delete(slug);
  try { localStorage.setItem(FOLLOW_KEY, JSON.stringify([...f])); } catch {}
}

// --- helpers ---------------------------------------------------------------
let M;
const src = p => M.media[p] || p;
// the logo (Soft Round): a tile with an open, arched doorway, and the name
const LOGO = '<svg class="mark" viewBox="0 0 132 132" aria-hidden="true"><rect x="8" y="8" width="116" height="116" rx="36" fill="#1F2A44"/><path d="M42 106 V62 a24 24 0 0 1 48 0 V106 Z" fill="#F5C9B8"/></svg><span>Open Studio</span>';
// with a small version, the browser takes it wherever the image shows small, and the full one where it fills
// the screen (sizes: how wide it shows; most images here are covers and rows, a third of the screen or less)
const im = (p, alt, attrs = '', sizes = '33vw') => {
  if (!p) return '';
  const t = M.thumbs[p], set = t ? ` srcset="${esc(t)} 640w, ${esc(src(p))} 2000w" sizes="${sizes}"` : '';
  return `<img src="${esc(src(p))}"${set} alt="${esc(alt)}" loading="lazy" ${attrs}>`;
};
const metaLine = w => [w.year, w.medium, w.size].filter(Boolean).join(' · ');
const exOf = w => M.exhibitions.find(e => e.works.includes(w));
const place = e => [e.city, e.dates || e.year].filter(Boolean).join(' · ');

function workRow(w) {
  return `<a class="row" href="#/work/${w.slug}">${im(w.image, '')}<div class="t"><div><b>${esc(w.title)}</b></div><div class="m">${esc(metaLine(w))}</div></div><span></span></a>`;
}
const cover = (e, badge) => `<a href="#/exhibition/${e.slug}"><span class="cv-im">${im(e.images[0], '')}${badge || e.kind === 'online' ? `<i class="badge">${esc(badge || 'Online')}</i>` : ''}</span><div><b>${esc(e.title)}</b><div class="m">${esc(status(e) !== 'past' || e.space ? when(e) : [e.year, e.city].filter(Boolean).join(' · '))}</div><div class="m">${esc(byOf(e))}</div></div></a>`;
const workCover = w => `<a href="#/work/${w.slug}"><div class="im">${im(w.image, w.title)}</div><div><b>${esc(w.title)}</b><div class="m">${esc(w.artist.name)} · ${esc(w.year)}</div></div></a>`;
// fresh: something new from the studio in the last two days (a ring round the picture)
const person = (a, fresh) => `<a class="person${fresh ? ' fresh' : ''}" href="#/artist/${a.slug}">${im(a.portrait, a.name)}<div><b>${esc(a.name)}</b><div class="m">${esc(a.discipline)}</div></div></a>`;

// --- views -----------------------------------------------------------------
function home() {
  const live = M.exhibitions.find(e => isOn(e) && e.kind !== 'online') || M.exhibitions[0];
  return `<div class="wrap gut">
    <div class="home-h"><h1 class="brand-h">${LOGO}</h1><span class="tag">No. 01 · Prototype</span></div>
    ${live ? `<section class="shelf"><div class="k"><span class="dot"></span>&nbsp; On view now</div>
      <a class="feature" href="#/exhibition/${live.slug}">${im(live.images[0], `Installation view of ${live.title}`, 'loading="eager"', '100vw')}
        <div class="ov"><div class="k">${esc(live.artist.name)}</div><h2>${esc(live.title)}</h2><div class="m">${esc([live.venue.replace(/^Solo exhi\w+ at /i, '').split(' — ')[0], live.dates || live.year].filter(Boolean).join(' · '))}</div></div></a></section>` : ''}
    <section class="shelf"><h2>Artists</h2><div class="people">${M.artists.map(a => person(a)).join('')}
      <span class="person" aria-label="More artists are coming"><span class="ring" aria-hidden="true">+</span><div class="m">More artists<br>coming soon</div></span></div></section>
    <section class="shelf"><h2>Exhibitions</h2><div class="covers">${M.exhibitions.map(e => `<a href="#/exhibition/${e.slug}">${im(e.images[0], '')}<div><b>${esc(e.title)}</b><div class="m">${esc([e.year, e.artist.name].join(' · '))}</div></div></a>`).join('')}</div></section>
    <section class="shelf"><h2>Latest works</h2><div class="covers works">${M.works.slice(0, 10).map(workCover).join('')}</div></section>
    <section class="shelf"><h2>By location</h2><div class="places">${M.cities.map(cityCard).join('')}</div></section>
    <a class="for-artists" href="#/studio"><span class="k">For artists</span><b>Open your studio</b><span class="m">Your works at their real size, your shows as rooms anyone can walk through.</span><span aria-hidden="true">→</span></a>
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
  const shows = showsOf(a), works = worksOf(a), live = shows.find(e => status(e) !== 'past'), last = shows[0];
  const posts = M.live.filter(p => p.artist === a).sort((x, y) => y.at - x.at);
  const followed = following().includes(a.slug), own = a === M.artist;
  const hero = a.hero || (last && last.images[0]) || (works[0] && works[0].image);
  return `
  <section class="hero">${im(hero, last ? `Installation view, ${last.title}` : a.name, 'loading="eager"', '100vw')}
    <div class="ov gut"><div class="wrap"><div class="k">${esc(a.label)}</div><h1>${esc(a.name)}</h1></div></div></section>
  <div class="wrap gut">
    <div class="btns" style="padding-block:18px 0"><button type="button" class="btn ${followed ? 'g' : 'f'}" data-follow="${esc(a.slug)}" aria-pressed="${followed}">${followed ? 'Following' : 'Follow'}</button>${own ? '<a class="btn g" href="#/about">About & CV</a>' : ''}</div>
    <p class="statement">${esc(curly(a.statement))}</p>
    ${a.demo ? '<p class="note" style="margin-top:14px">A made-up artist, to show how Open Studio looks full. The works are generated.</p>' : ''}
    ${posts.length ? `<section class="sec" style="margin-top:28px"><div class="sec-h"><h2>Live from the studio</h2><span class="more">${posts.length} new</span></div>
      <div class="studio-log">${posts.map((p, i) => `<button type="button" class="log" data-log="${esc(a.slug)}:${i}">
        ${p.kind === 'video' ? `<video src="${esc(p.video)}" poster="${esc(p.poster)}" muted playsinline loop preload="none" aria-hidden="true"></video>` : im(p.frames[0], '', '', '40vw')}
        <span class="lk">${p.kind === 'video' ? '▶ Video' : 'Story'} · ${esc(ago(p.at))}</span>
        <span class="lt">${esc(p.text)}</span>
        ${p.work ? `<span class="lw">${im(p.work.image, '', '', '10vw')}${esc(p.work.title)}</span>` : ''}</button>`).join('')}</div></section>` : ''}
    ${live ? `<section class="sec"><div class="k"><span class="dot"></span>&nbsp; ${esc(when(live))}</div>
      <a class="onview" href="#/exhibition/${live.slug}">${im(live.images[0], '')}<div><h3>${esc(live.title)}</h3>
      <div class="m">${esc(live.kind === 'online' ? 'Online exhibition' : [live.venue, live.city].filter(Boolean).join(' · '))}</div></div></a></section>` : ''}
    <section class="sec"><div class="sec-h"><h2>Latest works</h2><a class="more" href="${own ? '#/works' : `#/artist/${a.slug}/works`}">All ${works.length} →</a></div>
      <div class="list" data-more-list>${works.map((w, k) => k < 5 ? workRow(w) : workRow(w).replace('<a class="row"', '<a class="row" hidden')).join('')}</div>
      ${works.length > 5 ? '<button type="button" class="btn g" data-more style="justify-self:start">Show more</button>' : ''}</section>
    ${shows.length ? `<section class="sec"><div class="sec-h"><h2>Exhibitions</h2><span class="more">${shows.length}</span></div>
      <div class="covers">${[...shows].sort((x, y) => y.end - x.end).map(e => cover(e)).join('')}</div></section>` : ''}
    ${own && M.objects.length ? `<section class="sec"><div class="sec-h"><h2>Objects</h2></div>
      <div class="covers">${M.objects.map(o => `<a href="#/object/${o.slug}">${im(o.images[0], '')}<div><b>${esc(o.title)}</b><div class="m">${esc(o.meta)}</div></div></a>`).join('')}</div></section>` : ''}
  </div>`;
}
const ago = t => { const h = Math.round((Date.now() - t) / 3600000); return h < 1 ? 'just now' : h < 24 ? `${h}h ago` : `${Math.round(h / 24)}d ago`; };

function archive(year, a = M.artist) {
  const mine = worksOf(a), base = a === M.artist ? '#/works' : `#/artist/${a.slug}/works`;
  const years = [...new Set(mine.map(w => w.year))];
  const list = year ? mine.filter(w => w.year === year) : mine;
  return `<div class="wrap gut">
    <div class="ex-head"><div class="k">${esc(a.name)} · Archive</div><h1>Works</h1><div class="m">${list.length} ${list.length === 1 ? 'work' : 'works'}${year ? ` from ${esc(year)}` : ''}</div></div>
    <div class="chips" style="padding-block:18px 28px"><a class="chip" href="${base}" ${!year ? 'aria-current="page"' : ''}>All</a>${years.map(y => `<a class="chip" href="${base}/${y}" ${y === year ? 'aria-current="page"' : ''}>${esc(y)}</a>`).join('')}</div>
    <div class="grid">${list.map(w => `<a href="#/work/${w.slug}"><div class="im">${im(w.image, w.title)}</div><div class="c"><b>${esc(w.title)}</b><div class="m">${esc(metaLine(w))}</div></div></a>`).join('')}</div>
  </div>`;
}

function exhibition(slug) {
  const e = M.exhibitions.find(x => x.slug === slug);
  if (!e) return notFound();
  return `<div class="wrap gut">
    <div class="album">
      ${im(e.images[0], `Installation view of ${e.title}`, 'class="cover" loading="eager"', '100vw')}
      <div class="k">${status(e) === 'past' ? 'Exhibition' : `<span class="dot"></span>&nbsp; ${esc(when(e))}`} · ${e.kind === 'online' ? 'Online' : esc(e.city || e.year)}</div>
      <h1>${esc(e.title)}</h1>
      <div class="bys">${(e.artists || [e.artist]).map(a => `<a class="by" href="#/artist/${a.slug}">${im(a.portrait, '')}${esc(a.name)}</a>`).join('')}</div>
      <div class="m">${esc([e.dates, e.kind === 'online' ? 'An online exhibition' : e.venue].filter(Boolean).join(' · '))}${e.curator ? ` · Curated by ${esc(e.curator)}` : ''}</div>
      ${status(e) !== 'past' && (e.address || e.hours) ? `<div class="visit">${e.address ? `<a href="#/map/${e.slug}"><b>${esc(e.venue)}</b><span>${esc(e.address)}</span></a>` : ''}${e.hours ? `<span>${esc(e.hours)}</span>` : ''}</div>` : ''}
      ${e.events.filter(v => +v.at > Date.now() - 3 * 3600000).map(v => `<div class="event"><b>${esc(dayName(v.at))}</b><span>${esc(v.what)} · ${esc(hm(v.at))} · ${esc(v.at.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }))}</span></div>`).join('')}
      ${e.space ? `<div class="btns"><a class="btn f" href="#/exhibition/${e.slug}/space">Enter the space</a></div><p class="m">${esc(e.space.source)}: a walkable 3D space in the room's own light, with every work at its measured size and place.</p>` : ''}
    </div>
    ${e.works.length ? `<section class="sec"><div class="sec-h"><h2>Works</h2><span class="more">${e.works.length} works</span></div>
      ${e.confirmed ? '' : `<p class="note">${e.space ? 'Identified from the installation photos, in walking order. Waiting for the artist to confirm.' : 'Draft list, grouped by year. Waiting for the artist to confirm which works were in the show.'}</p>`}
      <div class="tracks">${e.works.map((w, i) => `<a class="track" href="#/work/${w.slug}"><span class="n">${i + 1}</span>${im(w.image, '')}<div class="t"><div><b>${esc(w.title)}</b></div><div class="m">${esc([w.medium, w.size].filter(Boolean).join(' · '))}</div></div><span></span></a>`).join('')}</div>
      ${e.maybe.length ? `<p class="note">Possibly also in the show, not visible in the photos: ${e.maybe.map(w => `<a href="#/work/${w.slug}">${esc(w.title)}</a>`).join(', ')}.</p>` : ''}</section>` : ''}
    <section class="sec"><div class="sec-h"><h2>About the exhibition</h2></div><div class="prose">${e.text.map(p => `<p>${esc(p)}</p>`).join('')}</div></section>
    ${e.images.length ? `<section class="sec"><div class="sec-h"><h2>Installation views</h2></div>
      <div class="views">${e.images.map((p, i) => `<button type="button" data-zoom="${esc(src(p))}" aria-label="Installation view ${i + 1}">${im(p, `Installation view ${i + 1} of ${e.title}`, '', '60vw')}</button>`).join('')}</div></section>` : ''}
  </div>`;
}

function work(slug) {
  const w = M.works.find(x => x.slug === slug);
  if (!w) return notFound();
  const ex = exOf(w);
  const seq = ex ? ex.works : M.works, idx = seq.indexOf(w), prev = seq[idx - 1], next = seq[idx + 1];
  return `<div class="stage"><button type="button" data-zoom="${esc(src(w.image))}" aria-label="Zoom into ${esc(w.title)}">${im(w.image, w.title, 'loading="eager"', '100vw')}</button></div>
  <div class="wrap gut">
    <div class="work">
      <div class="label"><b>${esc(w.title)}</b><span>${esc(w.artist.name)}, ${esc(w.year)}</span><span>${esc(w.medium)}</span>${w.size ? `<span class="s">${esc(w.size)}</span>` : ''}</div>
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
    artists.length && `<section class="shelf" style="padding:0"><h2>Artists</h2><div class="people">${artists.map(a => person(a)).join('')}</div></section>`,
    shows.length && `<section class="shelf" style="padding:0"><h2>Exhibitions</h2><div class="covers">${shows.map(e => cover(e)).join('')}</div></section>`,
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
    ${artists.length ? `<section class="shelf"><h2>Artists based here</h2><div class="people">${artists.map(a => person(a)).join('')}</div></section>` : ''}
    ${shows.length ? `<section class="shelf"><h2>Exhibitions here</h2><div class="covers">${shows.map(e => cover(e)).join('')}</div></section>` : ''}
  </div>`;
}

// --- Artists: everyone on Open Studio, the ones you follow first ---------------------------------------
function artistsPage() {
  const fol = following(), list = [...M.artists].sort((a, b) => fol.includes(b.slug) - fol.includes(a.slug));
  return `<div class="wrap gut">
    <div class="home-h"><h1>Artists</h1></div>
    <div class="artists">${list.map(a => {
      const on = showsOf(a).find(e => status(e) !== 'past');
      return `<a class="artist-row" href="#/artist/${a.slug}">${im(a.portrait, a.name)}<span><b>${esc(a.name)}</b>
        <div class="m">${esc([a.discipline, a.city].filter(Boolean).join(' · '))}${fol.includes(a.slug) ? ' · Following' : ''}</div>
        ${on ? `<div class="on">${esc(on.title)} · ${esc(when(on))}</div>` : ''}</span><span aria-hidden="true">→</span></a>`;
    }).join('')}</div>
  </div>`;
}

// --- Shows: "Opening Night" — what's on now, in rooms and online; tonight first ---------------------------
let showsKind = 'all', showsDay = 0;
function showsPage() {
  const pick = e => showsKind === 'all' || (showsKind === 'online' ? e.kind === 'online' : e.kind !== 'online');
  const all = M.exhibitions.filter(pick);
  const on = all.filter(isOn), soon = all.filter(e => status(e) === 'soon').sort((a, b) => a.start - b.start);
  const evs = [...M.exhibitions.filter(pick).flatMap(e => e.events), ...(showsKind === 'online' ? [] : M.listings.flatMap(l => l.events))]
    .filter(v => +v.at > Date.now() - 3 * 3600000).sort((a, b) => a.at - b.at);
  const tonight = evs.find(v => v.show && dayName(v.at) === 'Tonight') || evs.find(v => v.show);
  const hero = tonight ? tonight.show : on[0];
  const days = Array.from({ length: 7 }, (_, i) => new Date(+today() + i * DAY));
  const dayEvs = evs.filter(v => Math.floor((new Date(v.at).setHours(0, 0, 0, 0) - today()) / DAY) === showsDay);
  const closing = on.filter(e => e.kind !== 'online' && e.end - Date.now() < 7 * DAY && e !== hero);
  const rooms = on.filter(e => e.kind !== 'online' && e !== hero && !closing.includes(e)), online = on.filter(e => e.kind === 'online' && e !== hero);
  const walk = M.exhibitions.filter(e => e.space && pick(e));
  const card = e => `<a class="nx-show" href="#/exhibition/${e.slug}">${im(e.images[0], '', '', '45vw')}${e.kind === 'online' ? '<i class="badge">Online</i>' : ''}
    <b>${esc(e.title)}</b><span>${esc(byOf(e))}</span><span class="nx-when">${esc(when(e))}${e.city ? ` · ${esc(e.city)}` : ''}</span></a>`;
  return `<div class="wrap gut nx">
    <div class="nx-h"><h1>Shows</h1><div class="seg" role="group" aria-label="Which shows">${[['all', 'All'], ['rooms', 'In a room'], ['online', 'Online']].map(([k, t]) => `<button type="button" data-kind="${k}" aria-pressed="${showsKind === k}">${t}</button>`).join('')}</div></div>
    ${hero ? `<a class="nx-hero" href="#/exhibition/${hero.slug}">${im(hero.images[0], `${hero.title}`, 'loading="eager"', '100vw')}
      <span class="nx-live"><i></i>${esc(tonight && tonight.show === hero ? `${tonight.what} ${dayName(tonight.at) === 'Tonight' ? 'tonight' : dayName(tonight.at).toLowerCase()} · ${hm(tonight.at)}` : when(hero))}</span>
      <span class="nx-ov"><span class="k">${esc(byOf(hero))}${hero.venue && hero.kind !== 'online' ? ` · ${esc(hero.venue)}` : ''}</span><b>${esc(hero.title)}</b>
      <span class="m">${hero.works.length} works · ${esc(hero.kind === 'online' ? 'online' : hero.city)}</span>
      <span class="nx-cta">${hero.kind === 'online' || hero.space ? 'Walk in now' : 'See the show'}</span></span></a>` : ''}
    <section class="nx-sec"><div class="nx-sh"><h2>This week</h2></div>
      <div class="nx-days" role="group" aria-label="Day">${days.map((d, i) => `<button type="button" data-day="${i}" aria-pressed="${i === showsDay}"><span>${i === 0 ? 'Today' : d.toLocaleDateString('en-GB', { weekday: 'short' })}</span><b>${d.getDate()}</b>${evs.some(v => Math.floor((new Date(v.at).setHours(0, 0, 0, 0) - today()) / DAY) === i) ? '<i></i>' : ''}</button>`).join('')}</div>
      <div class="nx-evs">${dayEvs.length ? dayEvs.map(v => v.show
        ? `<a class="nx-ev" href="#/exhibition/${v.show.slug}">${im(v.show.images[0], '', '', '25vw')}<span><span class="nx-when">${esc(hm(v.at))} · ${esc(v.show.kind === 'online' ? 'Online' : v.show.city)}</span><b>${esc(v.show.title)}</b><span class="m">${esc(byOf(v.show))} · ${esc(v.what)}</span></span></a>`
        : `<a class="nx-ev info" href="#/map">${'<span class="ph" aria-hidden="true"></span>'}<span><span class="nx-when">${esc(hm(v.at))} · ${esc(v.listing.city)}</span><b>${esc(v.listing.show)}</b><span class="m">${esc(v.listing.name)} · ${esc(v.what)} · Not on Open Studio</span></span></a>`).join('')
        : '<p class="m">Nothing that day yet.</p>'}</div></section>
    ${rooms.length ? `<section class="nx-sec"><div class="nx-sh"><h2>On view now</h2><a class="more" href="#/map">On the map</a></div><div class="nx-grid">${rooms.map(card).join('')}</div></section>` : ''}
    ${closing.length ? `<section class="nx-sec"><div class="nx-sh"><h2>Last chance</h2></div><div class="nx-grid">${closing.map(card).join('')}</div></section>` : ''}
    ${online.length ? `<section class="nx-sec"><div class="nx-sh"><h2>Online now</h2></div><p class="m nx-sub">Digital exhibitions: no room, open all the time.</p><div class="nx-grid">${online.map(card).join('')}</div></section>` : ''}
    ${walk.length ? `<section class="nx-sec"><div class="nx-sh"><h2>Walk-throughs</h2><span class="more">3D</span></div><p class="m nx-sub">Real shows, kept as rooms you can walk through after they close.</p><div class="nx-rail">${walk.map(e => `<a href="#/exhibition/${e.slug}/space">${im(e.images[0], '', '', '70vw')}<i class="badge">3D</i><b>${esc(e.title)}${e.city ? ` — ${esc(e.city)}` : ''}</b></a>`).join('')}</div></section>` : ''}
    ${soon.length ? `<section class="nx-sec"><div class="nx-sh"><h2>Coming up</h2></div><div class="nx-grid">${soon.map(card).join('')}</div></section>` : ''}
  </div>`;
}

// --- Map: Israel's art places in 3D, and what's on in each (artmap.js; loaded when the map opens) -------------
const PLACE_KEY = 'os-place';
function myPlace() {
  try { const p = JSON.parse(localStorage.getItem(PLACE_KEY)); if (p && p.at) return p; } catch {}
  return { name: 'Tel Aviv', at: M.places['Tel Aviv'] || [32.0809, 34.7806] };
}
let mapFocus = null;
function mapPage(focus) {
  // a place by its id, or an Open Studio show by its slug (its place is chosen once the map has loaded)
  const show = focus && M.exhibitions.find(e => e.slug === focus);
  mapFocus = show ? `os-${show.slug}` : focus || null;
  return `<div class="am">
    <div class="am-stage"><div class="am-map" role="application" aria-label="Map of Israel's art places, in 3D"></div>
      <div class="am-top"><a class="am-mark" href="#/" aria-label="Open Studio, home">${LOGO.split('<span>')[0]}</a>
        <label class="am-city"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 21s-7-6.2-7-12a7 7 0 0 1 14 0c0 5.8-7 12-7 12z"/><circle cx="12" cy="9" r="2.5"/></svg>
          <select id="amCity" aria-label="Where"><option>${esc(myPlace().name)}</option></select></label>
        <button type="button" class="am-tilt" id="amTilt" aria-label="3D or flat">2D</button></div>
      <div class="am-nav" role="status" aria-live="polite" hidden></div>
      <button type="button" class="am-locate" id="amLocate" data-state="off" aria-label="Show where I am"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 3 3 10.5l7.6 2.9L13.5 21z" fill="currentColor"/></svg></button></div>
    <div class="am-sheet"><p class="am-empty">Loading the art map…</p></div>
  </div>`;
}
let artMap = null;
function openArtMap(el) {
  import('./artmap.js').then(m => m.mountArtMap(el, {
    M, focus: mapFocus, here: myPlace,
    setHere: p => { try { localStorage.setItem(PLACE_KEY, JSON.stringify(p)); } catch {} },
  })).then(() => { artMap = el.__map || null; }).catch(e => {
    console.error(e);
    el.querySelector('.am-sheet').innerHTML = '<p class="am-empty">The map couldn\u2019t load. Check the connection and open it again.</p>';
  });
}

const notFound = () => `<div class="wrap gut loading"><p>This page doesn't exist. <a href="#/">Back to Home</a></p></div>`;

// --- router ----------------------------------------------------------------
const routes = [
  [/^#?\/?$/, () => home(), 'home'],
  [/^#\/search$/, () => search(), 'search'],
  [/^#\/artists$/, () => artistsPage(), 'artists'],
  [/^#\/shows$/, () => showsPage(), 'shows'],
  [/^#\/(map|places)$/, () => mapPage(), 'map'],
  [/^#\/map\/place\/([^/]+)$/, m => mapPage(decodeURIComponent(m[1])), 'map'],
  [/^#\/map\/([^/]+)$/, m => mapPage(m[1]), 'map'],
  [/^#\/place\/([^/]+)$/, m => placePage(m[1]), 'map'],
  [/^#\/artist\/([^/]+)$/, m => artistPage(m[1]), 'artists'],
  [/^#\/artist\/([^/]+)\/works\/?$/, m => { const a = M.artists.find(x => x.slug === m[1]); return a ? archive(null, a) : notFound(); }],
  [/^#\/artist\/([^/]+)\/works\/([^/]+)$/, m => { const a = M.artists.find(x => x.slug === m[1]); return a ? archive(decodeURIComponent(m[2]), a) : notFound(); }],
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
  document.querySelectorAll('.log-view').forEach(v => v.remove());       // (a studio log open over the page closes with it)
  // the artist's side: its own screens, without the visitors' bar and tabs
  if (hash.startsWith('#/studio')) {
    if (openSpaceView) { openSpaceView.close(); openSpaceView = null; }
    document.querySelector('.bar').hidden = true; document.querySelector('.tabs').hidden = true; document.body.classList.remove('has-tabs');
    const go = (h, same) => { if (same || h === location.hash) render(); else location.hash = h; };
    (window.__studio || import('./artist.js').then(m => m.studio)).then(f => { window.__studio = Promise.resolve(f); f(hash, app, go, M); window.scrollTo(0, 0); });
    return;
  }
  let html = notFound(), tab = null;
  for (const [re, view, t] of routes) { const m = hash.match(re); if (m) { html = view(m); tab = t || null; break; } }
  const top = tab === 'home' || tab === 'search' || tab === 'shows' || tab === 'map' || hash === '#/artists';
  // the shows on now have the look of an opening night; the map, of walls in daylight
  const ex = hash.match(/^#\/exhibition\/([^/]+)$/), exOn = ex && M.exhibitions.find(e => e.slug === ex[1]);
  const look = tab === 'shows' || (exOn && status(exOn) !== 'past') ? 'night' : tab === 'map' ? 'atlas' : '';
  if (look) document.body.dataset.look = look; else delete document.body.dataset.look;
  document.querySelectorAll('meta[name="theme-color"]').forEach(m => { m.content = look === 'night' ? '#0E0E10' : look === 'atlas' ? '#F3EEE5' : m.media.includes('dark') ? '#171613' : '#EFE9DD'; });
  document.querySelector('.bar').hidden = top;
  if (!top) document.querySelector('.bar .wrap').innerHTML = `<button type="button" class="back" id="backBtn" style="border:0;background:none;cursor:pointer;padding:0"><span aria-hidden="true">←</span> Back</button><a class="brand" href="#/" aria-label="Open Studio, home">${LOGO}</a>`;
  const tabs = document.querySelector('.tabs');
  tabs.hidden = false; document.body.classList.add('has-tabs');
  tabs.querySelectorAll('a').forEach(a => { if (a.dataset.tab === tab) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
  if (openSpaceView) { openSpaceView.close(); openSpaceView = null; }
  if (artMap) { artMap.remove(); artMap = null; }           // (a WebGL map gives its context back when left)
  app.innerHTML = html;
  // each page its own title (the tab, history and a shared link say where it goes)
  const h = app.querySelector('h1, h2'), name = h && h.textContent.replace(/\s+/g, ' ').trim();
  document.title = name && tab !== 'home' ? `${name} · Open Studio` : 'Open Studio';
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
  document.querySelectorAll('[data-follow]').forEach(b => b.onclick = () => {
    const on = b.getAttribute('aria-pressed') !== 'true'; setFollow(b.dataset.follow, on);
    b.setAttribute('aria-pressed', on); b.textContent = on ? 'Following' : 'Follow'; b.classList.toggle('f', !on); b.classList.toggle('g', on);
  });
  const rerender = () => { const y = scrollY; render(true); scrollTo(0, y); };
  document.querySelectorAll('[data-kind]').forEach(b => b.onclick = () => { showsKind = b.dataset.kind; rerender(); });
  document.querySelectorAll('[data-day]').forEach(b => b.onclick = () => { showsDay = +b.dataset.day; rerender(); });
  document.querySelectorAll('[data-log]').forEach(b => b.onclick = () => { const [s, i] = b.dataset.log.split(':'); openLog(s, +i); });
  const am = document.querySelector('.am');
  if (am) openArtMap(am);
  // a list that opens five more at a time
  document.querySelectorAll('[data-more]').forEach(b => b.onclick = () => {
    const rest = [...b.parentNode.querySelectorAll('[data-more-list] > [hidden]')];
    rest.slice(0, 5).forEach(x => { x.hidden = false; });
    if (rest.length <= 5) b.remove();
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

// the studio log: an artist's clips and stories, full screen, one after another; each belongs to a work
function openLog(slug, start) {
  const a = M.artists.find(x => x.slug === slug); if (!a) return;
  const posts = M.live.filter(p => p.artist === a).sort((x, y) => y.at - x.at);
  const z = document.createElement('div');
  z.className = 'log-view'; z.setAttribute('role', 'dialog'); z.setAttribute('aria-label', `From ${a.name}'s studio`);
  let i = start, f = 0, timer = null;
  const close = () => { clearTimeout(timer); z.remove(); document.removeEventListener('keydown', onKey); };
  const go = d => {
    const p = posts[i];
    if (p.kind === 'story' && f + d >= 0 && f + d < p.frames.length) { f += d; return show(); }
    i += d; f = 0;
    if (i < 0) { i = 0; return show(); }
    if (i >= posts.length) return close();
    show();
  };
  function show() {
    clearTimeout(timer);
    const p = posts[i];
    z.innerHTML = `<div class="lv-bars">${posts.map((_, k) => `<i class="${k < i ? 'done' : k === i ? 'now' : ''}"><b></b></i>`).join('')}</div>
      <div class="lv-top"><a href="#/artist/${a.slug}">${im(a.portrait, '')}<span><b>${esc(a.name)}</b><span>Studio log · ${esc(ago(p.at))}</span></span></a><button type="button" class="x" aria-label="Close">×</button></div>
      <div class="lv-media">${p.kind === 'video' ? `<video src="${esc(p.video)}" poster="${esc(p.poster)}" playsinline autoplay muted></video>` : `<img src="${esc(p.frames[f])}" alt="">`}</div>
      <button type="button" class="lv-prev" aria-label="Back"></button><button type="button" class="lv-next" aria-label="Next"></button>
      <div class="lv-foot"><p>${esc(p.text)}</p>${p.work ? `<a class="lv-work" href="#/work/${p.work.slug}">${im(p.work.image, '', '', '15vw')}<span><b>${esc(p.work.title)}</b><span>${esc([p.work.year, p.work.medium].filter(Boolean).join(' · '))}</span></span><span aria-hidden="true">→</span></a>` : ''}</div>`;
    const bar = z.querySelector('.lv-bars .now b'), v = z.querySelector('video');
    let started = false;
    const run = ms => { if (started) return; started = true; clearTimeout(timer); bar.style.transition = `width ${ms}ms linear`; requestAnimationFrame(() => { bar.style.width = '100%'; }); timer = setTimeout(() => go(1), ms); };
    // a clip runs its length (if it can't tell, seven seconds); a story's frame, four and a half
    if (v) { v.addEventListener('loadedmetadata', () => run((v.duration || 7) * 1000), { once: true }); v.play().catch(() => {}); timer = setTimeout(() => run(7000), 4000); }
    else run(4500);
    z.querySelector('.x').onclick = close;
    z.querySelector('.lv-prev').onclick = () => go(-1);
    z.querySelector('.lv-next').onclick = () => go(1);
    z.querySelectorAll('a').forEach(l => l.addEventListener('click', close));
  }
  const onKey = e => { if (e.key === 'Escape') close(); if (e.key === 'ArrowRight') go(1); if (e.key === 'ArrowLeft') go(-1); };
  document.addEventListener('keydown', onKey);
  document.body.append(z); show();
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
if ('serviceWorker' in navigator && !window.STUDIO_DATA && location.protocol === 'https:') {
  // a new version: look for it whenever the app comes back to the front (an installed app on a phone is
  // resumed, not reloaded), and once it has taken over, show it
  const had = !!navigator.serviceWorker.controller; let reloaded = false;
  navigator.serviceWorker.register('sw.js').then(reg => {
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') reg.update().catch(() => {}); });
  }).catch(() => {});
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (had && !reloaded) { reloaded = true; location.reload(); } });
}

// On a phone, offer to put the app on the home screen: Android installs on a tap; iPhone needs Share → Add to Home Screen
(function offerInstall() {
  const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  let seen = false; try { seen = localStorage.getItem('os-install-dismissed') === '1'; } catch {}
  let framed = true; try { framed = window.top !== window.self; } catch {}      // a tour shown on another website
  if (window.STUDIO_DATA || standalone || seen || framed || !matchMedia('(pointer: coarse)').matches) return;
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
