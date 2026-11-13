// Open Studio prototype. Home → artist → exhibition (an album of works) → work, plus Search and Places.
// Content comes from the site's own /content/*.json plus studio/app/data/studio.json (Studio-only data),
// or from window.STUDIO_DATA in a baked preview.

const app = document.getElementById('app');

async function loadData() {
  if (window.STUDIO_DATA) return window.STUDIO_DATA;
  const get = url => fetch(url).then(r => r.json());
  // (the small files are all asked for at once: they used to be fetched one after the other, six round trips in a row)
  const later = Promise.all([get('data/thumbs.json').catch(() => ({})), get('data/demo/world.json').catch(() => null), get('data/virtual.json').catch(() => null)]);
  const indexP = get('data/spaces/index.json').catch(() => ({}));
  const names = ['settings', 'works', 'exhibitions', 'objects', 'cv'];
  const [settings, works, exhibitions, objects, cv, studio] = await Promise.all([...names.map(n => get(`/content/${n}.json`)), get('data/studio.json')]);
  // every exhibition the space pipeline has built a 3D space for (data/spaces/index.json lists them)
  const index = await indexP;
  // the inspection stage opens a space that is built but not yet published (?inspect=<slug>)
  const inspecting = new URLSearchParams(location.search).get('inspect');
  if (inspecting) index[inspecting] = {};
  const spaces = Object.fromEntries(await Promise.all(Object.keys(index).map(async k => [k, await get(`data/spaces/${k}.json`)])));
  // small versions of the site's images (written when the app is published), for grids and lists on a phone
  // the demo world: fictional artists, galleries and shows, to see the app full (data/demo/world.json)
  // virtual exhibitions: designed here, in rooms that exist only here (data/virtual.json, space/synth.js)
  const [thumbs, world, virtual] = await later;
  // the artists Open Studio has approved, their works and the exhibitions they published (Supabase): never waited
  // on. The app opens with what this phone had last time; the fresh list follows, and redraws only if it changed.
  let community = null;
  try { community = JSON.parse(localStorage.getItem('os-community') || 'null'); } catch {}
  return { settings, works, exhibitions, objects, cv, studio, spaces, thumbs, world, virtual, community };
}
function freshCommunity(d) {
  communityData().then(c => {
    const was = JSON.stringify(d.community || { artists: [], works: [], shows: [] }), now = JSON.stringify(c);
    try { localStorage.setItem('os-community', now); } catch {}
    if (now === was) return;
    M = buildModel({ ...d, community: c });
    // (the page being read isn't pulled from under the reader: only a list that can show the new ones is redrawn)
    if (/^#?\/?$|^#\/(artists|shows|search)$|^#\/(artist|exhibition)\//.test(location.hash || '#/') && !openSpaceView) render();
  }).catch(e => console.warn('community', e));
}
const DB = 'https://hlpzqeosdavfuzjgpwhy.supabase.co/rest/v1/', DB_KEY = 'sb_publishable_VKboaeE8UE3iwVKhyr4FSA_faDO17fu';
async function communityData() {
  const signal = AbortSignal.timeout ? AbortSignal.timeout(4000) : undefined;
  const q = path => fetch(DB + path, { headers: { apikey: DB_KEY }, signal }).then(r => r.ok ? r.json() : []);
  const [artists, works, shows] = await Promise.all([
    q('artists?select=id,slug,name,discipline,city,country,statement,bio,photo,hero,hero_pos,link,instagram,cv,exhibitions&status=eq.approved'),
    q('works?select=id,artist_id,title,year,medium,width,height,depth,image,thumb,position,kind,category&order=position'),
    q('virtual_shows?select=id,kind,slug,title,room,paint,centre,text,curator,works,starts,ends,owner_id,created_at,on_view&status=eq.published'),
  ]);
  return { artists, works, shows };
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
  const m = { s, artist, artists: [artist], works, exhibitions, objects, cities, cv: d.cv, media: d.media || {}, thumbs: { ...(d.thumbs || {}) }, mids: {}, spaces: d.spaces || {},
    live: [], listings: [], places: {} };
  if (d.world) addWorld(m, d.world, uniq, seen);
  if (d.community) addCommunity(m, d.community, uniq, seen);
  if (d.virtual) { addVirtual(m, d.virtual, uniq); m.virtualColours = d.virtual.streetColours || {}; }
  if (d.community) addVirtual(m, { shows: d.community.shows.map(showOf(m)) }, uniq);
  // the inspection opens a space by its own name: an artist's tour (built from what they gave in the app) has no
  // exhibition of the site's to hang on, so it gets a bare one here, only while being inspected
  const insp = new URLSearchParams(location.search).get('inspect');
  if (insp && m.spaces[insp] && !m.exhibitions.some(e => e.space === m.spaces[insp]))
    m.exhibitions.push({ slug: insp, title: m.spaces[insp].title || insp, year: '', venue: '', dates: '', text: [], images: [], city: '', country: '', confirmed: true,
      artist: m.artist, artists: [m.artist], works: [], maybe: [], space: m.spaces[insp], kind: 'gallery', ...span('', ''), events: [] });
  return m;
}

// artists on Open Studio (approved), with their works
function addCommunity(m, c, uniq, seen) {
  const A = new Map();
  for (const a of c.artists) {
    const slug = uniq(a.slug); seen.add(slug);
    const x = { slug, name: a.name, discipline: a.discipline || '', city: a.city || '', country: a.country || '', statement: a.statement || '', bio: a.bio || '',
      portrait: a.photo || '', label: [a.discipline, a.city].filter(Boolean).join(' · '), link: a.link || '', instagram: a.instagram || '', community: true, uid: a.id,
      cv: a.cv || [], hero: a.hero || '', heroPos: a.hero_pos || '' };
    A.set(a.id, x); m.artists.push(x);
    // their past exhibitions, as shows of the past (with their installation photos)
    for (const e of a.exhibitions || []) {
      const lines = String(e.text || '').split(/\n+/).map(t => t.trim()).filter(Boolean);
      m.exhibitions.push({ id: e.id, slug: uniq(slugify(`${e.title}-${slug}`)), title: e.title, year: e.year || '', venue: e.venue || '', dates: e.dates || '', text: lines,
        images: (e.photos || []).map(p => p.src || p).filter(Boolean), city: e.city || '', country: '', confirmed: true, artist: x, artists: [x], works: [], maybe: [],
        space: (e.tour === 'live' && e.space && m.spaces[e.space.slug]) || null, workIds: e.works || [], kind: 'gallery', ...span(e.dates || '', e.year), events: [], community: true });
    }
  }
  m.exhibitions.sort((p, q) => (+q.year || 0) - (+p.year || 0));
  for (const w of c.works) {
    const a = A.get(w.artist_id); if (!a) continue;
    const pairs = w.width && w.height ? [[+w.height, +w.width]] : [];
    m.works.push({ i: m.works.length, slug: uniq(slugify(`${w.title}-${a.slug}`)), id: w.id, title: w.title, year: w.year || '', medium: w.medium || '', pairs, kind: w.kind || 'work', category: w.category || '',
      size: pairs.length ? `${pairs[0][0]} × ${pairs[0][1]} cm` : '', image: w.image, artist: a, community: true });
    if (w.thumb) m.thumbs[w.image] = w.thumb;
  }
  // their exhibitions' works, now that the works are known
  for (const e of m.exhibitions) if (e.community && e.workIds) e.works = e.workIds.map(id => m.works.find(w => w.id === id)).filter(Boolean);
  m.works.sort((a, b) => (+b.year || 0) - (+a.year || 0) || a.i - b.i);
}
// a show from the database, in the shape of data/virtual.json (its works by id, or by the app's slug for the site's)
const showOf = m => v => {
  const made = v.created_at || new Date().toISOString();
  const owner = m.artists.find(a => a.uid === v.owner_id);
  const keys = (v.works || []).map(w => (m.works.find(x => (w.id && x.id === w.id) || (w.slug && x.slug === w.slug)) || {}).slug).filter(Boolean);
  const artists = [...new Set(keys.map(k => m.works.find(x => x.slug === k).artist.slug))];
  return { slug: v.slug || `show-${v.id.slice(0, 8)}`, kind: v.kind, title: v.title, artists: v.kind === 'artist' && owner ? [owner.slug] : artists, curator: v.curator || '',
    room: v.room, paint: v.paint, centre: v.centre, onview: !!v.on_view, start: v.starts || made.slice(0, 10), end: v.ends || `${+made.slice(0, 4) + 1}${made.slice(4, 10)}`,
    text: v.text ? v.text.split(/\n\s*\n/) : [], works: keys,
    // where the artist hung each work (wall, a, y) and stood the plinths: the room hangs the rest itself
    placements: Object.fromEntries((v.works || []).filter(w => w.id && w.wall).map(w => [w.id, { wall: w.wall, a: w.a, y: w.y }])), plinths: v.plinths || [] };
};

// a virtual exhibition is an online show whose room is drawn here (space/synth.js) around the works it hangs
const ROOM_NAMES = { 'white-cube': 'White Cube', 'long-hall': 'Long Hall', vault: 'The Vault' };
// the ten spaces built in Blender (data/rooms/<slug>/, named <kind>[-small|-large])
const SPACE_KINDS = { 'white-cube': 'White cube', loft: 'Industrial loft', 'skylit-hall': 'Skylit museum hall', salon: 'Salon', concrete: 'Raw concrete',
  studio: 'Artist studio', apartment: "Collector's home", 'black-box': 'Black box', 'glass-pavilion': 'Glass pavilion', japanese: 'Japanese room' };
const roomTitle = r => ROOM_NAMES[r] || SPACE_KINDS[String(r).replace(/(-[23]r)?$/, '').replace(/-(small|large)$/, '')] || 'A virtual room';
const bakedRoom = r => !ROOM_NAMES[r] && SPACE_KINDS[String(r).replace(/(-[23]r)?$/, '').replace(/-(small|large)$/, '')] ? r : null;
function addVirtual(m, v, uniq) {
  for (const x of v.shows || []) {
    const works = x.works.map(s => m.works.find(w => w.slug === s)).filter(Boolean);
    const artists = x.artists.map(s => m.artists.find(a => a.slug === s)).filter(Boolean);
    if (!works.length || !artists.length) continue;
    const start = new Date(`${x.start}T00:00`), end = new Date(`${x.end}T23:59`);
    const fmt = t => t.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    const room = roomTitle(x.room);
    m.exhibitions.push({
      slug: uniq(x.slug), title: x.title, year: String(start.getFullYear()), venue: `Open Studio · ${room}`, address: '',
      dates: `${fmt(start)} — ${fmt(end)}, ${end.getFullYear()}`, text: x.text || [], images: x.cover ? [x.cover] : [works[0].image], city: '', country: '',
      confirmed: true, artist: artists[0], artists, works, maybe: [], kind: 'online', start, end, hours: '', curator: x.curator || '',
      events: [], virtual: x,
      space: { source: `${room}, a virtual room`, virtual: { title: x.title, room: x.room, paint: x.paint, centre: x.centre, placements: x.placements, plinths: x.plinths } },
    });
  }
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
const inDays = (n, time) => { const t = today(); t.setDate(t.getDate() + n); if (time) { const [h, mi] = time.split(':'); t.setHours(+h, +mi); } return t; };

// the demo world joins the real content: its artists, works, shows (dates as days from today), the studio
// clips on artists' pages, and the galleries listed on the map that aren't on Open Studio
function addWorld(m, w, uniq, seen) {
  const A = new Map();
  for (const a of w.artists) {
    seen.add(a.slug);
    const x = { ...a, label: [a.discipline, a.city].filter(Boolean).join(' · '), country: a.country || 'Israel', demo: true };
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
      dates: `${fmt(start)} — ${fmt(end)}, ${end.getFullYear()}`, text: [v.text], images: v.images || [], city: v.city, country: v.country || (v.city ? 'Israel' : ''),
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
  Object.assign(m.mids, w.mids || {});
  for (const e of m.exhibitions) if (e.city && !m.cities.some(c => c.name === e.city)) m.cities.push({ name: e.city, slug: slugify(e.city), country: e.country });
}

// a CV as the site keeps it: lines in groups (Education, Solo Exhibitions...), each with its year
const cvOf = cv => {
  const groups = [...new Set(cv.map(l => l.group || ''))];
  return groups.map(g => `<section class="cv-g">${g ? `<h3>${esc(g)}</h3>` : ''}<dl>${cv.filter(l => (l.group || '') === g).map(l => `<div><dt>${esc(l.year)}</dt><dd>${esc(l.title)}${l.venue ? `<span>${esc(l.venue)}</span>` : ''}</dd></div>`).join('')}</dl></section>`).join('');
};

// where a show stands today
const status = e => { const now = Date.now(); return now < e.start ? 'soon' : now > e.end ? 'past' : 'on'; };
const isOn = e => status(e) === 'on';
const nextEvent = e => e.events.filter(v => +v.at > Date.now() - 3 * 3600000).sort((a, b) => a.at - b.at)[0];
// (an artist on Open Studio keeps their own order; the site's artists go newest first)
const worksOf = a => { const l = M.works.filter(w => w.artist === a && w.kind !== 'object'); return a.community ? l.sort((x, y) => (+y.year || 0) - (+x.year || 0) || x.i - y.i) : l; };   // newest year first; inside a year, the artist's own order
const objectsOf = a => M.works.filter(w => w.artist === a && w.kind === 'object');
// an artist's shows, their own first (a group show after)
const showsOf = a => M.exhibitions.filter(e => (e.artists || [e.artist]).includes(a)).sort((x, y) => (y.artist === a) - (x.artist === a));
const byOf = e => (e.artists || [e.artist]).map(a => a.name).join(' × ');
const dayName = t => { const d = Math.round((new Date(t).setHours(0, 0, 0, 0) - today()) / DAY); return d === 0 ? 'Tonight' : d === 1 ? 'Tomorrow' : t.toLocaleDateString('en-GB', { weekday: 'short' }); };
const hm = t => t.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
const evWhen = ev => { const d = dayName(ev.at); return `${ev.what} ${d === 'Tonight' || d === 'Tomorrow' ? d.toLowerCase() : d} · ${hm(ev.at)}`; };
const dm = t => t.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
// what is happening now (a show open, an opening tonight, the last days, a note from the studio) is written by hand, as
// on Home; everything else stays in type
const lh = t => `<span class="lh">${esc(t)}</span>`;
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
  return [M.artist.slug, 'vincent-van-gogh', 'berthe-morisot'];
}
function setFollow(slug, on) {
  const f = new Set(following()); if (on) f.add(slug); else f.delete(slug);
  try { localStorage.setItem(FOLLOW_KEY, JSON.stringify([...f])); } catch {}
}

// what this phone opened last (artists, exhibitions, their 3D spaces, works, places on the art map), newest first:
// the nearest stars of Home's sky
const RECENT_KEY = 'os-recent';
function recent() { try { const r = JSON.parse(localStorage.getItem(RECENT_KEY)); if (Array.isArray(r)) return r; } catch {} return []; }
function remember(item) {
  const r = [item, ...recent().filter(x => !(x.k === item.k && x.id === item.id))].slice(0, 16);
  try { localStorage.setItem(RECENT_KEY, JSON.stringify(r)); } catch {}
}
function rememberHash(hash) {
  let framed = false; try { framed = window.top !== window.self; } catch { framed = true; }
  if (framed) return;                          // (Home shows a room in a frame: that isn't a visit)
  const m = hash.match(/^#\/(artist|exhibition|work|place)\/([^/]+)(\/space)?$/);
  if (m) remember({ k: m[3] ? 'space' : m[1], id: decodeURIComponent(m[2]), t: Date.now() });
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
  const t = M.thumbs[p], mid = M.mids[p], set = t ? ` srcset="${esc(t)} 640w, ${mid ? `${esc(mid)} 1200w, ` : ''}${esc(src(p))} 2000w" sizes="${sizes}"` : '';
  return `<img src="${esc(src(p))}"${set} alt="${esc(alt)}" loading="lazy" ${attrs}>`;
};
const metaLine = w => [w.year, w.medium, w.size].filter(Boolean).join(' · ');
const exOf = w => M.exhibitions.find(e => e.works.includes(w));
const place = e => [e.city, e.dates || e.year].filter(Boolean).join(' · ');

function workRow(w) {
  return `<a class="row" href="#/work/${w.slug}">${im(w.image, '')}<div class="t"><div><b>${esc(w.title)}</b></div><div class="m">${esc(metaLine(w))}</div></div><span></span></a>`;
}
const cover = (e, badge) => `<a href="#/exhibition/${e.slug}"><span class="cv-im">${im(e.images[0], '')}${badge || e.kind === 'online' ? `<i class="badge">${esc(badge || 'Online')}</i>` : ''}</span><div><b>${esc(e.title)}</b><div class="m">${status(e) !== 'past' ? lh(when(e)) : esc(e.space ? when(e) : [e.year, e.city].filter(Boolean).join(' · '))}</div><div class="m">${esc(byOf(e))}</div></div></a>`;
const workCover = w => `<a href="#/work/${w.slug}"><div class="im">${im(w.image, w.title)}</div><div><b>${esc(w.title)}</b><div class="m">${esc(w.artist.name)} · ${esc(w.year)}</div></div></a>`;
// fresh: something new from the studio in the last two days (a ring round the picture)
const person = (a, fresh) => `<a class="person${fresh ? ' fresh' : ''}" href="#/artist/${a.slug}">${im(a.portrait, a.name)}<div><b>${esc(a.name)}</b><div class="m">${esc(a.discipline)}</div></div></a>`;

// --- views -----------------------------------------------------------------
// Home: your sky. The stars nearest are what this phone opened last, drawn as the trail you took; your artists
// and their shows sit just outside; deeper in the sky, the artists and rooms you haven't met and the shows on
// now near you (the art map's daily read), there when you pinch out or tap twice. Under the sky, a room you can
// walk into from Home, your artists, their shows, and what's on near you. Drawn in pencil on a daylight sky.
// The sky itself is sky.js; its places here are fixed slots, so the near ones never sit on each other.
const SLOTS = [
  [[-30, -175, -40], [125, -75, 20], [100, 120, -30], [-55, 190, 10], [-130, -5, 40]],
  [[-150, -245, 110], [170, -215, 120], [172, 55, 110], [-160, 170, 120], [80, -285, 160], [-178, -100, 140]],
  [[-250, 80, 420], [215, -20, 420], [-180, -330, 520], [230, 310, 500], [-520, 260, 520], [380, 330, 420], [560, -300, 640],
    [-480, -380, 560], [260, -600, 520], [120, 640, 560], [-260, 600, 600], [-360, -700, 700], [420, -760, 740], [-560, 520, 760]],
];
const pic = p => p ? (M.thumbs[p] || src(p)) : '';
// what's new with an artist, in a few words: the next thing on, else what's on, else the studio's last clip
function newsOf(a) {
  const on = showsOf(a).filter(e => status(e) !== 'past').sort((x, y) => x.start - y.start);
  for (const e of on) { const ev = nextEvent(e); if (ev) return `${evWhen(ev)}`; }
  if (on[0]) return `${on[0].title}: ${when(on[0]).toLowerCase()}`;
  const clip = M.live.filter(p => p.artist === a).sort((x, y) => y.at - x.at)[0];
  return clip ? clip.text : '';
}
const noteOf = e => e.kind === 'online' && isOn(e) ? 'online now' : when(e);
// a title as the art map read it, without what the place's site wrote round it ("title | dates | prize")
const cleanTitle = t => String(t || '').split(/\s+\|\s+/)[0].trim();
// the far sky: each artist you haven't met is the centre of a small cluster (their show, a work of theirs beside them),
// the clusters laid out on a spiral, so what is near on the map is also kin
const clusterAt = i => { const th = i * 2.39996 + 0.6, r = 250 + 150 * Math.sqrt(i); return [Math.cos(th) * r * 0.95, Math.sin(th) * r * 1.3, 20 + seeded(i + 3) * 110]; };
const KIND_NAME = { artist: 'Artist', show: 'Show', tour: 'In 3D', place: 'Place', work: 'Work' };
const SIZE = { artist: [66, 54, 50], show: [62, 52, 48], tour: [62, 52, 48], work: [58, 50, 46], place: [44, 40, 34] };
function skyOf() {
  const stars = [], ties = [], by = new Map(), slot = [0, 0, 0];
  const put = (id, s) => {
    if (by.has(id)) return by.get(id);
    const r = s.ring; let at = s.at;
    if (!at) { at = r === 2 ? clusterAt(slot[2]) : SLOTS[r][slot[r]]; if (!at) return null; slot[r]++; }
    const sz = SIZE[s.kind] || SIZE.show;
    const x = { id, ...s, kindName: KIND_NAME[s.kind], d: s.real ? 30 : sz[r], lw: Math.min(150, 28 + Math.max(String(s.name).length * 7.4, String(s.sub || '').length * 5.6)), x: at[0], y: at[1], z: at[2] };
    by.set(id, x); stars.push(x); return x;
  };
  const off = (a, dx, dy) => a ? [a.x + dx, a.y + dy, a.z + 10] : null;
  const artist = (a, ring, note) => put('a:' + a.slug, { kind: 'artist', ring, name: a.name, sub: [a.discipline, a.city].filter(Boolean).join(' · '), note, img: pic(a.portrait), href: `#/artist/${a.slug}`, go: 'Open', slug: a.slug, tags: [a.city, a.discipline].filter(Boolean) });
  const show = (e, ring, note, at) => put('e:' + e.slug, { kind: 'show', ring, at, name: e.title, sub: [byOf(e), e.kind === 'online' ? 'Online' : (e.venue || '').split(' — ')[0]].filter(Boolean).join(' · '), note, img: pic(e.images[0]), href: `#/exhibition/${e.slug}`, go: 'Open', e, tags: [e.city].filter(Boolean) });
  const room = (e, ring, note, at) => put('t:' + e.slug, { kind: 'tour', ring, at, name: e.title, sub: `${byOf(e)} · in 3D`, note, img: pic(e.images[0]), href: `#/exhibition/${e.slug}/space`, go: 'Walk in', e, tags: [e.city].filter(Boolean) });
  const piece = (w, ring, note, at) => put('w:' + w.slug, { kind: 'work', ring, at, name: w.title, sub: [w.artist.name, w.year].filter(Boolean).join(', '), note, img: pic(w.image), href: `#/work/${w.slug}`, go: 'Open', w, tags: [w.artist.city].filter(Boolean) });
  // where you were, newest first
  const near = [], seen = new Set();
  for (const r of recent()) {
    if (near.length === 5) break;
    const key = r.k + ':' + r.id; if (seen.has(key)) continue; seen.add(key);
    let s = null; const t = ago(r.t);
    if (r.k === 'artist') { const a = M.artists.find(x => x.slug === r.id); if (a) s = artist(a, 0, newsOf(a) || `you visited ${t}`); }
    else if (r.k === 'exhibition') { const e = M.exhibitions.find(x => x.slug === r.id); if (e) s = show(e, 0, status(e) !== 'past' ? noteOf(e) : `you were here ${t}`); }
    else if (r.k === 'space') { const e = M.exhibitions.find(x => x.slug === r.id); if (e && e.space) s = room(e, 0, `you walked it ${t}`); }
    else if (r.k === 'work') { const w = M.works.find(x => x.slug === r.id); if (w) s = piece(w, 0, `you looked at it ${t}`); }
    else if (r.k === 'artplace') s = put('p:' + r.id, { kind: 'place', ring: 0, name: r.name || 'Art space', sub: 'On the art map', note: `you looked it up ${t}`, href: `#/map/place/${encodeURIComponent(r.id)}`, go: 'On the map' });
    if (s) { s.ago = t; near.push(s); }
  }
  for (let i = 1; i < near.length; i++) ties.push([near[i - 1].id, near[i].id, 'used']);
  // your artists, and what they have on (on a first visit, they are the nearest stars)
  const mine = following().map(s => M.artists.find(a => a.slug === s)).filter(Boolean);
  const ring = near.length ? 1 : 0;
  for (const a of mine) {
    artist(a, ring, newsOf(a));
    const e = showsOf(a).filter(x => status(x) !== 'past').sort((x, y) => x.start - y.start)[0];
    if (e) show(e, ring, noteOf(e));
  }
  // further out: who and what you haven't met yet
  for (const a of M.artists) if (!following().includes(a.slug)) {
    const c = artist(a, 2, newsOf(a)); if (!c) continue;
    const e = showsOf(a).filter(x => status(x) !== 'past')[0] || showsOf(a)[0]; if (e) show(e, 2, noteOf(e), off(c, 105, 70));
    const w = worksOf(a).find(x => x.image); if (w) piece(w, 2, '', off(c, -105, 80));
  }
  for (const e of M.exhibitions) if (e.space) room(e, 2, 'walk it in 3D');
  // the ties: an artist to their shows, rooms and works
  for (const s of stars) {
    const ofA = s.e ? (s.e.artists || [s.e.artist]) : s.w ? [s.w.artist] : [];
    for (const a of ofA) if (a && by.has('a:' + a.slug)) ties.push(['a:' + a.slug, s.id, by.get('a:' + a.slug).ring === 2 || s.ring === 2 ? 'maybe' : 'tie']);
  }
  return { stars, ties, slot };
}

// A sideways row of exhibitions, one component for Home ("Walk in now") and the artist page (Exhibitions): each an
// arch in pencil; where a room exists, its short film turns on the card while it is on screen (data/spaces/<slug>/
// preview.*, else the picture of the show), and "Step inside" walks in; the whole card opens the exhibition.
function walkRow(list, label) {
  const card = e => {
    const on = isOn(e), room = e.virtual && bakedRoom(e.virtual.room);
    const alt = e.images[0] ? src(e.images[0]) : room ? `data/rooms/${room}/view.jpg` : '';
    const sk = e.space ? (Object.keys(M.spaces || {}).find(k => M.spaces[k] === e.space) || e.slug) : '';   // (the room's folder: a second show with the same title has slug …-2, the room does not)
    const first = e.space ? `data/spaces/${sk}/preview.jpg` : '';
    const pill = e.space ? `<span class="livepill"><i></i>${on ? 'Live now' : 'In 3D'}</span>` : on ? `<span class="livepill"><i></i>On now</span>` : '';
    return `<li><div class="wc${e.space ? ' has-room' : ''}" data-slug="${esc(e.slug)}" data-space="${esc(sk)}">
      <div class="wc-arch">${first ? `<img class="wc-poster" src="${esc(first)}" data-alt="${esc(alt)}" alt="" loading="lazy" onerror="if(this.dataset.alt){this.src=this.dataset.alt;this.dataset.alt='';this.closest('.wc').classList.add('nofilm')}">` : alt ? `<img class="wc-poster" src="${esc(alt)}" alt="" loading="lazy">` : ''}
        ${pill}
        <div class="wc-cap"><a class="wc-t" href="#/exhibition/${esc(e.slug)}"><b${heb(e.title)}>${esc(e.title)}</b></a><span>${esc([byOf(e), e.city].filter(Boolean).join(' · '))}</span></div>
      </div>
      ${e.space ? `<a class="step" href="#/exhibition/${esc(e.slug)}/space">Step inside</a>` : ''}</div></li>`;
  };
  return `<ul class="walk" role="list" aria-label="${esc(label || 'Exhibitions')}">${list.map(card).join('')}</ul>`;
}
// the pencil arch round each card, and the films: made when a card is mostly on screen, played only while it is
function wireWalk(root) {
  const cards = [...root.querySelectorAll('.wc')]; if (!cards.length) return;
  const draw = () => cards.forEach(c => sketchArch(c.querySelector('.wc-arch'), c));
  draw(); requestAnimationFrame(draw);
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const io = new IntersectionObserver(es => {
    for (const en of es) {
      const c = en.target; if (!c.isConnected) { io.unobserve(c); continue; }
      let v = c.querySelector('video');
      if (!en.isIntersecting) { if (v) v.pause(); continue; }
      if (!c.classList.contains('has-room') || c.classList.contains('nofilm')) continue;
      if (!v) {
        const s = esc(c.dataset.space || c.dataset.slug), a = c.querySelector('.wc-arch');
        a.insertAdjacentHTML('afterbegin', `<video class="wc-film" muted loop playsinline preload="auto" poster="data/spaces/${s}/preview.jpg" aria-hidden="true"><source src="data/spaces/${s}/preview.hevc.mp4" type='video/mp4; codecs="hvc1"'><source src="data/spaces/${s}/preview.webm" type='video/webm; codecs="vp9"'><source src="data/spaces/${s}/preview.mp4" type="video/mp4"></video>`);
        v = a.firstElementChild;
        v.addEventListener('playing', () => c.classList.add('ready'), { once: true });
        [...v.querySelectorAll('source')].pop().addEventListener('error', () => v.remove());   // no film: the picture stays
      }
      v.play().catch(() => {});
    }
  }, { threshold: .6 });
  cards.forEach(c => io.observe(c));
}

function home() {
  const me = signedIn();
  // what you can walk into now: the running shows with a room (tours, artists' On View, the demo's virtual shows); else the rooms there are
  const rooms = M.exhibitions.filter(e => e.space), seenRoom = s => recent().some(r => r.k === 'space' && r.id === s.slug);
  const running = rooms.filter(isOn).sort((a, b) => seenRoom(b) - seenRoom(a));
  const walk = running.length >= 4 ? running.slice(0, 8) : [...running, ...rooms.filter(e => !running.includes(e)).sort((a, b) => seenRoom(b) - seenRoom(a))].slice(0, 5);
  const mine = following().map(s => M.artists.find(a => a.slug === s)).filter(Boolean);
  const theirs = [...new Set(mine.flatMap(a => showsOf(a).filter(e => status(e) !== 'past')))].sort((a, b) => a.start - b.start).slice(0, 6);
  const d0 = new Date(), day = `${d0.toLocaleDateString('en-GB', { weekday: 'short' })} ${d0.getDate()} ${d0.toLocaleDateString('en-GB', { month: 'short' })}`;
  return `<div class="hs">
    <section class="hs-hero" aria-label="Your art world">
      <div class="hs-top"><span class="brand-h">${LOGO}</span><span class="hs-day">${esc(day)}</span>${me ? `<a class="me" href="#/account" aria-label="Your account">${esc((me.name || me.email || '?')[0].toUpperCase())}</a>` : ''}</div>
      <h1 class="vh">Open Studio</h1>
      <div id="hsSky" class="skybox"></div>
      <div class="sky-ui"><span class="hint">tap a face · pinch to zoom · drag sideways</span></div>
      <div class="pick" hidden aria-live="polite"></div>
      <button type="button" class="sky-down"><span class="hand">your artists, shows and what’s near</span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 10l6 6 6-6"/></svg></button>
    </section>
    ${walk.length ? `<section class="hs-sec hs-walk" aria-labelledby="hsLive">
      <div class="hs-h"><h2 id="hsLive">Walk in now</h2><span class="hand side">you can walk in from here</span></div>
      ${walkRow(walk, 'Exhibitions you can walk into')}</section>` : ''}
    <section class="hs-sec hs-mu" id="hsMuseum" aria-labelledby="hsMuH" hidden></section>
    <section class="hs-sec hs-new" id="hsNew" aria-labelledby="hsNewH" hidden></section>
    ${mine.length ? `<section class="hs-sec" aria-labelledby="hsArtists">
      <div class="hs-h"><h2 id="hsArtists">Your artists</h2><a class="hs-more" href="#/artists">All</a></div>
      <ul class="ppl">${mine.map((a, i) => `<li style="--c:var(--hs-${['artist', 'show', 'place', 'tour'][i % 4]})"><a href="#/artist/${a.slug}">${im(a.portrait, '', 'width="64" height="64"', '64px')}<b>${esc(a.name)}</b><span class="what">${esc([a.discipline, a.city].filter(Boolean).join(' · '))}</span>${newsOf(a) ? `<span class="hand now">${esc(newsOf(a))}</span>` : ''}</a></li>`).join('')}</ul>
    </section>` : ''}
    ${theirs.length ? `<section class="hs-sec" aria-labelledby="hsTheirs">
      <div class="hs-h"><h2 id="hsTheirs">Their shows, on now</h2></div>
      <ul class="shows">${theirs.map(e => `<li><a href="#/exhibition/${e.slug}">${im(e.images[0], '', '', '72vw')}<span class="when hand">${esc(when(e))}</span><b>${esc(e.title)}</b><span>${esc(byOf(e))}</span><span class="m">${esc([e.kind === 'online' ? 'Online' : (e.venue || '').split(' — ')[0], e.city].filter(Boolean).join(', '))}</span></a></li>`).join('')}</ul>
    </section>` : ''}
    <section class="hs-sec" id="hsNear" aria-labelledby="hsNearH" hidden></section>
    <p class="hs-end hand">that’s your sky for today</p>
  </div>`;
}

// the art map's places and shows, read once and kept (Home's far stars and "near you" use them)
let artData = null;
const loadArt = () => artData || (artData = Promise.all(['places', 'exhibitions'].map(n => fetch(`data/art/${n}.json`).then(r => r.ok ? r.json() : null).catch(() => null)))
  .then(([pl, ex]) => ({ places: new Map((pl && pl.places || []).map(p => [p.id, p])), shows: ex && ex.shows || [] })));
const km = (a, b) => { const r = Math.PI / 180, x = (b[1] - a[1]) * r * Math.cos((a[0] + b[0]) / 2 * r), y = (b[0] - a[0]) * r; return Math.hypot(x, y) * 6371; };
const far = d => d < 1.6 ? `${Math.max(1, Math.round(d * 1.3 / 4.8 * 60))} min walk` : `${d.toFixed(1)} km`;
// shows on today at the places nearest you, one a place
async function nearShows(n) {
  const { places, shows } = await loadArt(), here = myPlace(), t = new Date().toISOString().slice(0, 10), pick = new Map();
  for (const s of shows) {
    const p = places.get(s.place); if (!p || !p.at || (s.start && s.start > t) || (s.end && s.end < t)) continue;
    const d = km(here.at, p.at); if (d > 25) continue;
    if (!pick.has(p.id) || (s.end || '9') < (pick.get(p.id).s.end || '9')) pick.set(p.id, { s, p, d });
  }
  return [...pick.values()].sort((a, b) => a.d - b.d).slice(0, n);
}
const untilOf = s => { if (!s.end) return 'On now'; const left = Math.ceil((new Date(s.end + 'T23:59') - Date.now()) / DAY); return left <= 7 ? `${left} ${left === 1 ? 'day' : 'days'} left` : `Until ${dm(new Date(s.end + 'T12:00'))}`; };

// the pencil and the water, defined once: a little roughness on every drawn line, a soft bleed on every wash
const HS_DEFS = `<svg width="0" height="0" style="position:absolute" aria-hidden="true" id="hsDefs">
  <filter id="hsPencil"><feTurbulence type="fractalNoise" baseFrequency="1.2" numOctaves="1" seed="3" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="1.2"/></filter>
  <filter id="hsWash" x="-30%" y="-30%" width="160%" height="160%"><feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="8" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="16"/></filter></svg>`;
const SKIES = [[5, '#F9D9C9,#F4DCE6 38%,#DCDDF4 70%,#CFE2F2'], [11, '#CFE6F5,#DDE3F7 40%,#EEE0F1 75%,#F8E6DF'], [16, '#F8D3C6,#F2C9D8 40%,#D9CDEF 72%,#C9D4F0'], [20, '#D3CCEE,#C7CFEE 45%,#D9D2F0 75%,#EBDDF0']];
const seeded = i => { const x = Math.sin(i * 999.7) * 43758.5453; return x - Math.floor(x); };
// a pencil circle, gone round a little more than once, never quite closed
const pencilRing = i => { const a = seeded(i) * 6; let d = ''; for (let k = 0; k <= 30; k++) { const t = a + k / 26 * Math.PI * 2, rr = 50 + Math.sin(k * 0.9 + i) * 1.6 + k * .05; d += `${k ? 'L' : 'M'}${(50 + Math.cos(t) * rr).toFixed(1)} ${(50 + Math.sin(t) * rr).toFixed(1)}`; } return `<svg class="ring" viewBox="0 0 100 100" aria-hidden="true"><path d="${d}"/></svg>`; };
const heb = s => /[֐-׿]/.test(s) ? ' dir="rtl"' : '';
const skyStar = s => `<span class="wash"></span><span class="sp"${s.img ? ` style="background-image:url('${esc(s.img)}')"` : ''}${s.img ? '' : ` data-l="${esc([...String(s.name)][0] || '')}"`}>${s.kind === 'tour' ? '<i class="b3">3D</i>' : ''}</span>${s.ring === 0 ? pencilRing([...s.id].reduce((h, c) => h + c.charCodeAt(0), 0)) : ''}<span class="lab"><b${heb(s.name)}>${esc(s.name)}</b><small>${esc([s.kindName, s.sub].filter(Boolean).join(' · '))}</small></span>`;
const KIND = { artist: 'Artist', show: 'Show', tour: 'In 3D', place: 'Place', work: 'Work' };
const MOTES = Array.from({ length: 70 }, (_, i) => ({ x: (seeded(i + 1) - .5) * 1900, y: (seeded(i + 51) - .5) * 2300, z: (seeded(i + 101) - .5) * 1900, r: 0.6 + seeded(i + 151) * 1.6 }));

let homeSky = null;
async function mountHome(root) {
  if (!document.getElementById('hsDefs')) document.body.insertAdjacentHTML('afterbegin', HS_DEFS);
  const H = new Date().getHours(), sk = [...SKIES].reverse().find(([h]) => H >= h) || SKIES[3];
  root.style.setProperty('--hs-sky', `linear-gradient(180deg,${sk[1]} 100%)`);
  const hero = root.querySelector('.hs-hero'), pick = root.querySelector('.pick'), box = root.querySelector('#hsSky');
  const { stars, ties, slot } = skyOf();
  fillNew(root.querySelector('#hsNew'));
  fillMuseum(root.querySelector('#hsMuseum'));
  root.querySelector('.sky-down').onclick = () => (root.querySelector('#hsNew:not([hidden])') || root.querySelector('.hs-sec')).scrollIntoView({ behavior: 'smooth', block: 'start' });
  const { sky } = await import('./sky.js');
  if (!box.isConnected) return;
  const seen = new Set();                                         // what Wander has shown, so it keeps finding new ones
  const S = homeSky = sky(box, {
    stars, ties, node: skyStar, D: 560, F: 560, cy: 0.5, pickY: 0.3, focusD: 400, intro: 1.8, ease: .1,
    limits: { Dmin: 240, Dmax: 2600 }, minOp: .8, minScale: .55, maxScale: 2.2, fog: 2200, bow: 0.1, ink: .8, top: 60, bottom: 100,
    inks: { tie: '#565B95', maybe: '#8F93C2' },
    extra(ctx, project) {                                       // pale motes far out, so the sky has depth
      ctx.fillStyle = '#fff';
      for (const m of MOTES) { const q = project(m); if (q.behind) continue;
        ctx.globalAlpha = Math.min(.9, .25 + q.k * .6); ctx.beginPath(); ctx.arc(q.x, q.y, Math.min(3, m.r * q.k), 0, 6.283); ctx.fill(); }
      ctx.globalAlpha = 1;
    },
    onTouch() { hero.classList.add('used'); },
    onChoose(s) { card(s); },
  });
  // the card of whoever you tapped: a face, a name, and what you can do (Follow an artist, Open, go on to what is related)
  function card(s) {
    hero.classList.toggle('picking', !!s);
    if (!s) { pick.hidden = true; return; }
    seen.add(s.id);
    const fol = s.slug && following().includes(s.slug);
    pick.innerHTML = `<div class="pk-row">${s.img ? `<img src="${esc(s.img)}" alt="">` : `<i class="pk-dot k-${s.kind}"></i>`}<div class="pk-t"><span class="pk-k">${KIND[s.kind]}${s.ago ? ` · ${esc(s.ago)}` : ''}</span><b${heb(s.name)}>${esc(s.name)}</b><span${heb(s.sub || '')}>${esc(s.sub || '')}</span>${s.note ? `<span class="hand">${esc(s.note)}</span>` : ''}</div><button type="button" class="x" aria-label="Close">×</button></div>
      <div class="pk-do">${s.slug ? `<button type="button" class="fo${fol ? ' on' : ''}" aria-pressed="${!!fol}">${fol ? 'Following' : 'Follow'}</button>` : ''}${s.href ? `<a class="go" href="${esc(s.href)}">${esc(s.go || 'Open')}</a>` : ''}<button type="button" class="nx">Related</button></div>`;
    pick.hidden = false;
    pick.querySelector('.x').onclick = () => S.clear(true);
    pick.querySelector('.nx').onclick = () => step();
    const fb = pick.querySelector('.fo');
    if (fb) fb.onclick = () => { const on = fb.getAttribute('aria-pressed') !== 'true'; setFollow(s.slug, on); fb.setAttribute('aria-pressed', on); fb.classList.toggle('on', on); fb.textContent = on ? 'Following' : 'Follow'; };
  }
  // the next star to go to: something tied or kin to this one that you haven't seen, else anything you haven't
  function step() {
    const f = S.focus, pool = f ? S.neighbors(f).filter(x => !seen.has(x.id)) : [];
    let next = pool.length ? pool[Math.floor(Math.random() * Math.min(pool.length, 3))] : null;
    if (!next) { const rest = S.stars.filter(x => !seen.has(x.id) && x.kind !== 'place' && x.op > 0); if (!rest.length) seen.clear(); const all = rest.length ? rest : S.stars; next = all[Math.floor(Math.random() * all.length)]; }
    if (next) S.choose(next);
  }
  // the far sky: shows on now at the places nearest you, from the art map
  nearShows(8).then(list => {
    if (!box.isConnected) return;
    const more = [], tie = [];
    list.forEach(({ s, p, d }) => {
      const at = clusterAt(slot[2]++);
      const id = 'r:' + s.id; more.push({ id, kind: 'show', ring: 2, real: true, kindName: 'On now', name: cleanTitle(s.title), sub: `${p.name} · ${far(d)}`, note: untilOf(s), href: `#/map/place/${encodeURIComponent(p.id)}`, go: 'On the map', d: 30, lw: 150, tags: ['near'], x: at[0], y: at[1], z: at[2] });
    });
    for (let i = 1; i < more.length; i++) if (seeded(i * 7) > .45) tie.push([more[i - 1].id, more[i].id, 'maybe']);
    S.add(more, tie);
  });
  wireWalk(root);
  fillNear(root.querySelector('#hsNear'));
}

// === the museum on Home ====================================================================================================
// What the owner publishes on the Desk (museum_slots: live, inside its dates) is asked for afresh every time Home or the museum
// opens, past every cache, so a publish shows on the next opening. The last answer is kept on the phone: Home draws it at once
// and corrects it when the fresh one arrives, and a phone with no signal still gets the museum as it was last published.
const MUSEUM_KEY = 'os-museum';
const museumKept = () => { try { const k = JSON.parse(localStorage.getItem(MUSEUM_KEY)); if (k && Array.isArray(k.slots)) return k.slots; } catch {} return null; };
async function liveSlots() {
  try {
    const r = await fetch(DB + 'museum_slots?select=slot,app_slug,colour,content,published_at&live=eq.true&order=slot',
      { headers: { apikey: DB_KEY }, cache: 'no-store', signal: AbortSignal.timeout ? AbortSignal.timeout(6000) : undefined });
    if (!r.ok) throw new Error(r.status);
    const slots = await r.json();
    try { localStorage.setItem(MUSEUM_KEY, JSON.stringify({ at: Date.now(), slots })); } catch {}
    return slots;
  } catch { return museumKept() || []; }
}
// a slot as a room: the Desk's own exhibition (its copy), or one of the app's shows by its slug; a slot with neither is skipped
function museumRooms(slots) {
  const shows = streetShows();
  return slots.map(s => {
    const c = s.content, e = s.app_slug && shows.find(x => x.slug === s.app_slug);
    if (!c && !e) return null;
    const ws = c ? (c.works || []) : e.works, slug = e ? e.slug : 'slot-' + s.slot, w = ws.find(x => x.thumb || x.image);
    return { slug, slot: s, show: e, content: c, title: c ? c.title : e.title, works: ws, colour: s.colour || (M.virtualColours || {})[slug] || '',
      img: w ? (w.thumb || M.thumbs[w.image] || src(w.image)) : e && e.images[0] ? pic(e.images[0]) : '' };
  }).filter(Boolean);
}
const MU_CSS = `<style id="hsMuCss">
.hs-mu .mu-in{position:relative;display:block;text-decoration:none;color:inherit}
.hs-mu .mu-doors{display:flex;align-items:flex-end;gap:10px}
.hs-mu .mu-door{flex:1 1 0;min-width:0;display:grid;gap:6px}
.hs-mu .mu-door img,.hs-mu .mu-door i{display:block;width:100%;aspect-ratio:3/4;object-fit:cover;background:var(--card);border-radius:999px 999px 10px 12px / 999px 999px 12px 10px;box-shadow:0 0 0 1px color-mix(in srgb,var(--hs-pencil) 30%,transparent)}
.hs-mu .mu-door:nth-child(2):not(:last-child) img,.hs-mu .mu-door:nth-child(2):not(:last-child) i{aspect-ratio:3/4.6}
.hs-mu .mu-doors.one .mu-door img,.hs-mu .mu-doors.one .mu-door i{aspect-ratio:4/3.4;border-radius:160px 160px 14px 18px / 150px 150px 18px 14px}
.hs-mu .mu-door u{display:block;height:4px;border-radius:2px;background:var(--c,var(--hs-pencil));opacity:.85}
.hs-mu .mu-t{display:grid;gap:3px;margin-top:14px;padding-right:108px;min-height:44px;align-content:center}
.hs-mu .mu-t b{font:500 21px/1.15 var(--serif)}
.hs-mu .mu-t b[dir=rtl]{font:600 18px/1.25 'IBM Plex Sans Hebrew',var(--sans)}
.hs-mu .mu-t span{font-size:14px;color:var(--muted)}
.hs-mu .mu-go{position:absolute;right:0;bottom:0;min-height:44px;display:inline-flex;align-items:center;padding:0 18px;border-radius:999px;background:#fff;color:var(--hs-ink);font:600 15px var(--sans);box-shadow:0 8px 20px -12px var(--hs-shade)}
.hs-mu .mu-in:active{opacity:.8}
</style>`;
const NUM = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight'];
function drawMuseum(box, slots) {
  const rooms = museumRooms(slots || []), n = rooms.length;
  if (!n) { box.hidden = true; box.innerHTML = ''; return; }
  const sig = JSON.stringify(rooms.map(r => [r.slug, r.title, r.img, r.colour]));
  if (box.dataset.sig === sig) return;                              // (nothing changed: leave the pictures alone)
  box.dataset.sig = sig;
  if (!document.getElementById('hsMuCss')) document.head.insertAdjacentHTML('beforeend', MU_CSS);
  const doors = rooms.filter(r => r.img).slice(0, 3), names = rooms.map(r => r.title);
  const list = n <= 2 ? names.join(' and ') : `${names.slice(0, 2).join(', ')} and ${n - 2} more`;
  box.innerHTML = `<div class="hs-h"><h2 id="hsMuH">The Museum</h2><span class="hand side">${n === 1 ? 'one exhibition on now' : `${NUM[n].toLowerCase()} exhibitions on now`}</span></div>
    <a class="mu-in" href="#/museum" aria-label="Walk into the museum: ${n} ${n === 1 ? 'exhibition' : 'exhibitions'} on now">
      ${doors.length ? `<span class="mu-doors${doors.length === 1 ? ' one' : ''}">${doors.map(r => `<span class="mu-door"${r.colour ? ` style="--c:${esc(r.colour)}"` : ''}><img src="${esc(r.img)}" alt="" loading="lazy"><u></u></span>`).join('')}</span>` : ''}
      <span class="mu-t"><b${heb(names[0])}>${esc(n === 1 ? names[0] : `${NUM[n]} exhibitions, one walk`)}</b><span${heb(list)}>${esc(n === 1 ? (rooms[0].content && rooms[0].content.curator ? 'Curated by ' + rooms[0].content.curator : `${rooms[0].works.length} works`) : list)}</span></span>
      <span class="mu-go">Walk in</span></a>`;
  box.hidden = false;
}
async function fillMuseum(box) {
  if (!box) return;
  const kept = museumKept(); if (kept) drawMuseum(box, kept);
  const slots = await liveSlots();
  if (box.isConnected) drawMuseum(box, slots);
}
// the app left open in the background and come back to (an installed app is rarely closed): Home asks again
document.addEventListener('visibilitychange', () => { const box = document.getElementById('hsMuseum'); if (!document.hidden && box) fillMuseum(box); });

// a calm shelf under the sky: who and what you haven't met, to scroll through without moving the sky
function fillNew(box) {
  if (!box) return;
  const fol = following(), items = [];
  const mine = new Set(fol);
  for (const a of M.artists) {
    if (mine.has(a.slug)) continue;
    const w = worksOf(a).find(x => x.image), e = showsOf(a).find(x => status(x) !== 'past') || showsOf(a)[0];
    items.push({ k: 'Artist', n: a.name, s: [a.discipline, a.city].filter(Boolean).join(' · '), img: a.portrait || (w && w.image), href: `#/artist/${a.slug}`, round: 1 });
    if (e && e.images[0]) items.push({ k: 'Show', n: e.title, s: byOf(e), img: e.images[0], href: `#/exhibition/${e.slug}` });
    if (w) items.push({ k: 'Work', n: w.title, s: [a.name, w.year].filter(Boolean).join(', '), img: w.image, href: `#/work/${w.slug}` });
  }
  const list = items.filter(i => i.img).slice(0, 18);
  if (!list.length) return;
  box.innerHTML = `<div class="hs-h"><h2 id="hsNewH">Meet someone new</h2><a class="hs-more" href="#/artists">All</a></div>
    <ul class="meet">${list.map(i => `<li><a href="${esc(i.href)}">${im(i.img, '', i.round ? 'class="rd"' : '', '40vw')}<span class="mk">${i.k}</span><b${heb(i.n)}>${esc(i.n)}</b><span class="ms"${heb(i.s || '')}>${esc(i.s || '')}</span></a></li>`).join('')}</ul>`;
  box.hidden = false;
}

// the room you can walk into, on Home: a short film of it turning (shown from the start as its own first frame, the
// poster: never faded in over the show's photo, which made a ghost of the one in the other) (made from the room itself, space/preview.cjs), played
// only while it is on screen; "Step inside" opens the real room. (A live room in a frame here made Home slow on a phone.)
// the arch drawn round the room, in pencil, twice, not quite on its line
function sketchArch(tour, wrap = tour.parentElement) {
  const w = tour.clientWidth, h = tour.clientHeight, r = w / 2; if (!w) return;
  const path = (dx, dy, s) => `M${4 + dx} ${h - 2 + dy}L${3 + dx} ${r + dy}A${r - 3 + s} ${r - 3 + s} 0 0 1 ${w - 3 + dx} ${r - 2 + dy}L${w - 4 + dx} ${h - 6 + dy}`;
  const old = wrap.querySelector('.sketch-arch'); if (old) old.remove();
  tour.insertAdjacentHTML('afterend', `<svg class="sketch-arch" viewBox="-9 -9 ${w + 16} ${h + 15}" aria-hidden="true"><path d="${path(-8, -9, 9)}"/><path d="${path(4, -3, 3)}" opacity=".5"/></svg>`);
}

// what's on near you: the nearest places with a show on today, drawn as a small pencil map round where you are
async function fillNear(box) {
  if (!box) return;
  const list = await nearShows(4), here = myPlace();
  if (!list.length || !box.isConnected) return;
  const W = 340, H = 250, maxd = Math.max(...list.map(x => x.d), .4);
  // a sketch, not a survey: each place in its true direction from you, spread so no two sit on each other, nearer ones nearer
  const cosLat = Math.cos(here.at[0] * Math.PI / 180);
  const P = list.map(({ p, d }) => ({ p, k: .42 + .58 * Math.sqrt(d / maxd), th: Math.atan2(-(p.at[0] - here.at[0]), (p.at[1] - here.at[1]) * cosLat) }));
  P.sort((a, b) => a.th - b.th);
  P.forEach((x, i) => { x.th = P[0].th + i * Math.PI * 2 / P.length + .35; });   // their order round you kept, evenly spread
  const rx = W / 2 - 112, ry = H / 2 - 36;
  const pins = P.map(({ p, k, th }, i) => { const x = W / 2 + Math.cos(th) * k * rx, y = H / 2 + Math.sin(th) * k * ry, right = Math.cos(th) >= 0;
    return `<g class="pin" style="--c:var(--hs-${['show', 'artist', 'tour', 'place'][i % 4]})"><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="9" class="pw"/><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4.5"/><text x="${(x + (right ? 12 : -12)).toFixed(1)}" y="${(y + 4).toFixed(1)}" text-anchor="${right ? 'start' : 'end'}"${heb(p.name)}>${esc(p.name.length > 19 ? p.name.slice(0, 17).trim() + '…' : p.name)}</text></g>`; }).join('');
  box.innerHTML = `<div class="hs-h"><h2 id="hsNearH">On now, near you</h2><span class="hand side">${esc(here.name && here.name !== 'Tel Aviv' ? 'around ' + here.name : 'in Tel Aviv')}</span></div>
    <a class="hs-map" href="#/map" aria-label="Open the art map"><svg viewBox="0 0 ${W} ${H}" aria-hidden="true">
      <circle cx="${W / 2}" cy="${H / 2}" r="${(H / 2 - 30)}" class="o1"/><circle cx="${W / 2}" cy="${H / 2}" r="${(H / 2 - 64)}" class="o2"/>
      <circle cx="${W / 2}" cy="${H / 2}" r="5" class="here"/><text x="${W / 2}" y="${H / 2 + 22}" text-anchor="middle" class="here-t">you</text>${pins}</svg><span>Open the map</span></a>
    <ul class="hs-list">${list.map(({ s, p, d }) => `<li><a href="#/map/place/${encodeURIComponent(p.id)}"><b dir="auto">${esc(cleanTitle(s.title))}</b><span dir="auto">${esc(p.name)}</span><span class="m">${esc(untilOf(s))} · ${esc(far(d))}</span></a></li>`).join('')}</ul>`;
  box.hidden = false;
}

function cityCard(c) {
  const shows = M.exhibitions.filter(e => e.city === c.name).length;
  const artists = M.artists.filter(a => a.city === c.name).length;
  const bits = [shows && `${shows} ${shows === 1 ? 'exhibition' : 'exhibitions'}`, artists && `${artists} ${artists === 1 ? 'artist' : 'artists'}`].filter(Boolean);
  return `<a class="place" href="#/place/${c.slug}"><b>${esc(c.name)}</b><span class="m">${esc(bits.join(' · ') || c.country)}</span></a>`;
}

// the works after the first five: by kind (when there is more than one), then by year, newest first, each year in the artist's own order
const KINDS = [['Painting', /oil|acrylic|canvas|paint|gouache|tempera|watercolou?r|pastel/i], ['Sculpture', /ceramic|clay|bronze|sculpt|stone|marble|plaster|wood|steel|resin/i], ['Drawing', /pencil|charcoal|ink|drawing|graphite|marker/i],
  ['Print', /print|etching|lithograph|screen|woodcut|linocut/i], ['Photography', /photo/i], ['Installation', /install/i]];
const kindOf = w => w.category || (KINDS.find(([, re]) => re.test(w.medium || '')) || [''])[0];
function worksMore(list) {
  const kinds = [...new Set(list.map(kindOf))].sort((a, b) => !a - !b || a.localeCompare(b)), byYear = l => {
    const ys = [...new Set(l.map(w => w.year || ''))].sort((a, b) => (+b || 0) - (+a || 0));
    return ys.map(y => `<div class="wk-y"><h4>${esc(y || 'Undated')}</h4><div class="list">${l.filter(w => (w.year || '') === y).map(workRow).join('')}</div></div>`).join('');
  };
  const body = kinds.length > 1 ? kinds.map(k => `<div class="wk-k"><h3>${esc(k || 'Other')}</h3>${byYear(list.filter(w => kindOf(w) === k))}</div>`).join('') : byYear(list);
  return `<details class="wk-more"><summary>${list.length} more ${list.length === 1 ? 'work' : 'works'}</summary>${body}</details>`;
}
function artistPage(slug) {
  const a = M.artists.find(x => x.slug === slug);
  if (!a) return notFound();
  const shows = showsOf(a), works = worksOf(a), live = shows.find(e => status(e) !== 'past'), last = shows[0];
  const posts = M.live.filter(p => p.artist === a).sort((x, y) => y.at - x.at);
  const followed = following().includes(a.slug), own = a === M.artist;
  const hero = a.hero || (last && last.images[0]) || (works[0] && works[0].image);
  const now = shows.find(e => e.virtual && e.virtual.onview && e.space);
  return `
  ${now ? onViewBlock(now) : ''}
  <section class="hero" ${own && a.community ? 'data-hero' : ''}>${im(hero, last ? `Installation view, ${last.title}` : a.name, `loading="eager"${a.heroPos ? ` style="object-position:${esc(a.heroPos)}"` : ''}`, '100vw')}
    <div class="ov gut"><div class="wrap"><h1>${esc(a.name)}</h1><div class="k">${esc(a.label)}</div></div></div></section>
  <div class="wrap gut">
    <div class="btns" style="padding-block:18px 0"><button type="button" class="btn ${followed ? 'g' : 'f'}" data-follow="${esc(a.slug)}" aria-pressed="${followed}">${followed ? 'Following' : 'Follow'}</button>${own ? '<a class="btn g" href="#/about">About & CV</a>' : a.bio || a.portrait || (a.cv && a.cv.length) ? `<a class="btn g" href="#/artist/${esc(a.slug)}/about">About & CV</a>` : ''}</div>
    <p class="statement">${esc(curly(a.statement))}</p>
    ${a.demo ? '<p class="note" style="margin-top:14px">A real artist from art history, shown to see Open Studio full: the works are in the public domain (images from Wikimedia Commons). Most of the galleries and shows they appear in here are made up; the exhibitions of history (the Impressionists in 1874, the Armory Show) are real.</p>' : ''}
    ${posts.length ? `<section class="sec" style="margin-top:28px"><div class="sec-h"><h2>Live from the studio</h2><span class="more">${posts.length} new</span></div>
      <div class="studio-log">${posts.map((p, i) => `<button type="button" class="log" data-log="${esc(a.slug)}:${i}">
        ${p.kind === 'video' ? `<video src="${esc(p.video)}" poster="${esc(p.poster)}" muted playsinline loop preload="none" aria-hidden="true"></video>` : im(p.frames[0], '', '', '40vw')}
        <span class="lk">${p.kind === 'video' ? '▶ Video' : 'Story'} · ${esc(ago(p.at))}</span>
        <span class="lt lh">${esc(p.text)}</span>
        ${p.work ? `<span class="lw">${im(p.work.image, '', '', '10vw')}${esc(p.work.title)}</span>` : ''}</button>`).join('')}</div></section>` : ''}
    ${live ? `<section class="sec"><h2 class="live-h"><span class="dot" aria-hidden="true"></span>${lh(when(live))}</h2>
      <a class="onview" href="#/exhibition/${live.slug}">${im(live.images[0], '')}<div><h3>${esc(live.title)}</h3>
      <div class="m">${esc(live.kind === 'online' ? 'Online exhibition' : [live.venue, live.city].filter(Boolean).join(' · '))}</div></div></a></section>` : ''}
    <section class="sec" id="works"><div class="sec-h"><h2>Recent works</h2><span class="more">${works.length}</span></div>
      <div class="list">${works.slice(0, 5).map(workRow).join('')}</div>
      ${works.length > 5 ? worksMore(works.slice(5)) : ''}</section>
    ${shows.length ? `<section class="sec"><div class="sec-h"><h2>Exhibitions</h2><span class="more">${shows.length}</span></div>
      <div class="walkbox">${walkRow([...shows].sort((x, y) => (status(y) !== 'past') - (status(x) !== 'past') || y.end - x.end), `${a.name}: exhibitions`)}</div></section>` : ''}
    ${own && M.objects.length ? `<section class="sec"><div class="sec-h"><h2>Objects</h2></div>
      <div class="covers">${M.objects.map(o => `<a href="#/object/${o.slug}">${im(o.images[0], '')}<div><b>${esc(o.title)}</b><div class="m">${esc(o.meta)}</div></div></a>`).join('')}</div></section>` : ''}
    ${!own && objectsOf(a).length ? `<section class="sec"><div class="sec-h"><h2>Objects</h2></div>
      <div class="covers">${objectsOf(a).map(o => `<a href="#/work/${o.slug}">${im(o.image, '')}<div><b>${esc(o.title)}</b><div class="m">${esc([o.medium, o.year].filter(Boolean).join(' · '))}</div></div></a>`).join('')}</div></section>` : ''}
  </div>`;
}
// On View: the artist's exhibition now, on the wall of the space it hangs in; one tap and you walk in
function onViewBlock(e) {
  const r = e.virtual.room, wall = bakedRoom(r) ? `data/rooms/${r}/wall-z0.jpg` : '', w = e.works[0];
  return `<section class="ov-now" aria-label="On view now">
    <a class="ov-wall" href="#/exhibition/${e.slug}/space" ${wall ? `style="background-image:url('${wall}')"` : ''}>${w ? im(w.image, w.title, 'loading="eager"', '60vw') : ''}</a>
    <div class="wrap gut"><div class="k"><span class="dot" aria-hidden="true"></span>&nbsp; On view · ${esc(roomTitle(r))}</div><h2>${esc(e.title)}</h2>
      ${e.text && e.text[0] ? `<p class="m">${esc(e.text[0])}</p>` : ''}
      <div class="btns"><a class="btn f" href="#/exhibition/${e.slug}/space">Walk in</a><a class="btn g" href="#/exhibition/${e.slug}">About the exhibition</a></div></div>
  </section>`;
}
const ago = t => { const h = Math.round((Date.now() - t) / 3600000); return h < 1 ? 'just now' : h < 24 ? `${h}h ago` : `${Math.round(h / 24)}d ago`; };

function archive(year, a = M.artist) {
  const mine = worksOf(a), base = a === M.artist ? '#/works' : `#/artist/${a.slug}/works`;
  const years = [...new Set(mine.map(w => w.year))];
  const list = year ? mine.filter(w => w.year === year) : mine;
  return `<div class="wrap gut">
    <div class="ex-head"><h1>Works</h1><div class="k">${esc(a.name)} · Archive</div><div class="m">${list.length} ${list.length === 1 ? 'work' : 'works'}${year ? ` from ${esc(year)}` : ''}</div></div>
    <div class="chips" style="padding-block:18px 28px"><a class="chip" href="${base}" ${!year ? 'aria-current="page"' : ''}>All</a>${years.map(y => `<a class="chip" href="${base}/${y}" ${y === year ? 'aria-current="page"' : ''}>${esc(y)}</a>`).join('')}</div>
    <div class="grid">${list.map(w => `<a href="#/work/${w.slug}"><div class="im">${im(w.image, w.title)}</div><div class="c"><b>${esc(w.title)}</b><div class="m">${esc(metaLine(w))}</div></div></a>`).join('')}</div>
  </div>`;
}

// an exhibition by its own name, or by its tour's (an artist's tour is named a-<artist>-<title>, its show otherwise)
const exhibitionOf = slug => M.exhibitions.find(x => x.slug === slug) || (M.spaces && M.spaces[slug] && M.exhibitions.find(x => x.space === M.spaces[slug]));

function exhibition(slug) {
  const e = exhibitionOf(slug);
  if (!e) return notFound();
  if (e.space) window.shareLink('s', e.slug, `/exhibition/${e.slug}`);
  return `<div class="wrap gut">
    <div class="album">
      ${im(e.images[0], `Installation view of ${e.title}`, 'class="cover" loading="eager"', '100vw')}
      <h1>${esc(e.title)}</h1>
      <div class="k">${status(e) === 'past' ? 'Exhibition' : `<span class="dot"></span>&nbsp; ${lh(when(e))}`} · ${e.virtual ? (e.virtual.kind === 'curated' ? 'Curated' : 'Virtual') : e.kind === 'online' ? 'Online' : esc(e.city || e.year)}</div>
      <div class="bys">${(e.artists || [e.artist]).map(a => `<a class="by" href="#/artist/${a.slug}">${im(a.portrait, '')}${esc(a.name)}</a>`).join('')}</div>
      <div class="m">${esc([e.dates, e.virtual ? e.venue : e.kind === 'online' ? 'An online exhibition' : e.venue].filter(Boolean).join(' · '))}${e.curator ? ` · Curated by ${esc(e.curator)}` : ''}</div>
      ${status(e) !== 'past' && (e.address || e.hours) ? `<div class="visit">${e.address ? `<a href="#/map/${e.slug}"><b>${esc(e.venue)}</b><span>${esc(e.address)}</span></a>` : ''}${e.hours ? `<span>${esc(e.hours)}</span>` : ''}</div>` : ''}
      ${e.events.filter(v => +v.at > Date.now() - 3 * 3600000).map(v => `<div class="event"><b>${esc(dayName(v.at))}</b><span>${lh(`${v.what} · ${hm(v.at)}`)} · ${esc(v.at.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }))}</span></div>`).join('')}
      ${e.space ? `<div class="btns"><a class="btn f" href="#/exhibition/${e.slug}/space">Enter the space</a><button type="button" class="btn g" data-share-show="${e.slug}">Share</button></div><p class="m">${e.virtual ? `${esc(e.space.source)}: a room that exists only here, ${e.virtual.kind === 'curated' ? 'hung by the curator' : 'hung by the artist'}, every work at its real size.` : `${esc(e.space.source)}: a walkable 3D space in the room's own light, with every work at its measured size and place.`}</p>` : ''}
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
      <div class="label"><h1>${esc(w.title)}</h1><span>${esc(w.artist.name)}, ${esc(w.year)}</span><span>${esc(w.medium)}</span>${w.size ? `<span class="s">${esc(w.size)}</span>` : ''}</div>
      <div class="btns"><button type="button" class="btn f" data-zoom="${esc(src(w.image))}">Zoom</button>${w.pairs.length ? '<button type="button" class="btn g" id="scaleBtn" aria-expanded="false">At scale</button>' : ''}</div>
      <div class="scale" id="scale" hidden></div>
      ${ex ? `<a class="onview" href="#/exhibition/${ex.slug}">${im(ex.images[0], '')}<div><h3>${esc(ex.title)}</h3><div class="m">From the exhibition · ${esc(place(ex))}</div></div></a>` : ''}
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
    <div class="ex-head"><h1>${esc(o.title)}</h1><div class="k">Object · ${esc(M.artist.name)}</div><div class="m">${esc(o.meta)}</div></div>
    <section class="sec" style="border-top:0"><div class="prose">${o.text.map(p => `<p>${esc(p)}</p>`).join('')}</div></section>
    <div class="views">${o.images.map((p, i) => `<button type="button" data-zoom="${esc(src(p))}" aria-label="View ${i + 1}">${im(p, `${o.title}, view ${i + 1}`)}</button>`).join('')}</div>
  </div>`;
}

function about() {
  const { s, cv } = M;
  const groups = [...new Set(cv.map(c => c.group))];
  return `<div class="wrap gut"><div class="about">
    <div style="display:grid;gap:10px">${im(s.about_portrait, s.about_caption || 'Portrait')}<div class="k">${esc(s.about_caption)}</div></div>
    <div class="ex-head" style="padding:0"><h1>${esc(M.artist.name)}</h1><div class="k">About</div></div>
    <div class="prose">${(s.about_text || '').split(/\n\s*\n/).map(p => `<p>${esc(p)}</p>`).join('')}<p style="color:var(--muted)">${esc(s.about_credit)}</p></div>
    <div class="cv">${groups.map(g => `<div><h3>${esc(g)}</h3><dl>${cv.filter(c => c.group === g).map(c => `<dt>${esc(c.year)}</dt><dd>${esc(c.title)}${c.venue ? `<br><span>${esc(c.venue)}</span>` : ''}</dd>`).join('')}</dl></div>`).join('')}</div>
    <div class="contact"><div class="k">Contact</div><span class="addr">${esc(s.email)}</span><a href="${esc(s.instagram)}" target="_blank" rel="noopener">Instagram</a></div>
  </div></div>`;
}

function aboutOf(slug) {
  const a = M.artists.find(x => x.slug === slug);
  if (!a) return notFound();
  if (a === M.artist) return about();
  const cv = a.cv || [], groups = [...new Set(cv.map(c => c.group))];
  return `<div class="wrap gut"><div class="about">
    ${a.portrait ? `<div style="display:grid;gap:10px">${im(a.portrait, a.name)}<div class="k">${esc([a.name, a.city].filter(Boolean).join(' · '))}</div></div>` : ''}
    <div class="ex-head" style="padding:0"><h1>${esc(a.name)}</h1><div class="k">About</div></div>
    <div class="prose">${(a.bio || '').split(/\n\s*\n|\n/).filter(Boolean).map(p => `<p>${esc(p)}</p>`).join('')}</div>
    ${cv.length ? `<div class="cv">${groups.map(g => `<div><h3>${esc(g)}</h3><dl>${cv.filter(c => c.group === g).map(c => `<dt>${esc(c.year)}</dt><dd>${esc(c.title)}${c.venue ? `<br><span>${esc(c.venue)}</span>` : ''}</dd>`).join('')}</dl></div>`).join('')}</div>` : ''}
    ${a.instagram || a.link ? `<div class="contact"><div class="k">Contact</div>${a.link ? `<a href="${esc(a.link)}" target="_blank" rel="noopener">Website</a>` : ''}${a.instagram ? `<a href="https://instagram.com/${esc(a.instagram.replace(/^@/, ''))}" target="_blank" rel="noopener">Instagram</a>` : ''}</div>` : ''}
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
    <div class="ex-head"><h1>${esc(c.name)}</h1><div class="k">Place · ${esc(c.country)}</div></div>
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
        ${on ? `<div class="on">${esc(on.title)} · ${lh(when(on))}</div>` : ''}</span><span aria-hidden="true">→</span></a>`;
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
    <b>${esc(e.title)}</b><span>${esc(byOf(e))}</span><span class="nx-when">${status(e) !== 'past' ? lh(when(e)) : esc(when(e))}${e.city ? ` · ${esc(e.city)}` : ''}</span></a>`;
  return `<div class="wrap gut nx">
    <div class="nx-h"><h1>Shows</h1><div class="seg" role="group" aria-label="Which shows">${[['all', 'All'], ['rooms', 'In a room'], ['online', 'Online']].map(([k, t]) => `<button type="button" data-kind="${k}" aria-pressed="${showsKind === k}">${t}</button>`).join('')}</div></div>
    ${hero ? `<a class="nx-hero" href="#/exhibition/${hero.slug}">${im(hero.images[0], `${hero.title}`, 'loading="eager"', '100vw')}
      <span class="nx-live"><i></i>${lh(tonight && tonight.show === hero ? `${tonight.what} ${dayName(tonight.at) === 'Tonight' ? 'tonight' : dayName(tonight.at).toLowerCase()} · ${hm(tonight.at)}` : when(hero))}</span>
      <span class="nx-ov"><b>${esc(hero.title)}</b><span class="k">${esc(byOf(hero))}${hero.venue && hero.kind !== 'online' ? ` · ${esc(hero.venue)}` : ''}</span>
      <span class="m">${hero.works.length} works · ${esc(hero.kind === 'online' ? 'online' : hero.city)}</span>
      <span class="nx-cta">${hero.kind === 'online' || hero.space ? 'Walk in now' : 'See the show'}</span></span></a>` : ''}
    <section class="nx-sec"><div class="nx-sh"><h2>This week</h2></div>
      <div class="nx-days" role="group" aria-label="Day">${days.map((d, i) => `<button type="button" data-day="${i}" aria-pressed="${i === showsDay}"><span>${i === 0 ? 'Today' : d.toLocaleDateString('en-GB', { weekday: 'short' })}</span><b>${d.getDate()}</b>${evs.some(v => Math.floor((new Date(v.at).setHours(0, 0, 0, 0) - today()) / DAY) === i) ? '<i></i>' : ''}</button>`).join('')}</div>
      <div class="nx-evs">${dayEvs.length ? dayEvs.map(v => v.show
        ? `<a class="nx-ev" href="#/exhibition/${v.show.slug}">${im(v.show.images[0], '', '', '25vw')}<span><span class="nx-when">${lh(hm(v.at))} · ${esc(v.show.kind === 'online' ? 'Online' : v.show.city)}</span><b>${esc(v.show.title)}</b><span class="m">${esc(byOf(v.show))} · ${esc(v.what)}</span></span></a>`
        : `<a class="nx-ev info" href="#/map">${'<span class="ph" aria-hidden="true"></span>'}<span><span class="nx-when">${esc(hm(v.at))} · ${esc(v.listing.city)}</span><b>${esc(v.listing.show)}</b><span class="m">${esc(v.listing.name)} · ${esc(v.what)} · Not on Open Studio</span></span></a>`).join('')
        : '<p class="m">Nothing that day yet.</p>'}</div></section>
    ${rooms.length ? `<section class="nx-sec"><div class="nx-sh"><h2>On view now</h2><a class="more" href="#/map">On the map</a></div><div class="nx-grid">${rooms.map(card).join('')}</div></section>` : ''}
    ${closing.length ? `<section class="nx-sec"><div class="nx-sh"><h2>Last chance</h2></div><div class="nx-grid">${closing.map(card).join('')}</div></section>` : ''}
    ${online.length ? `<section class="nx-sec"><div class="nx-sh"><h2>Online now</h2></div><p class="m nx-sub">Digital exhibitions: no room, open all the time.</p><div class="nx-grid">${online.map(card).join('')}</div></section>` : ''}
    ${streetShows().length >= 2 ? `<a class="nx-street" href="#/museum"><b>The Museum Street</b><span>One long walk, ${streetShows().length} exhibitions off it. Each door has the colour of its show.</span><i aria-hidden="true">Walk in →</i></a>` : ''}
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
    remember: p => remember({ k: 'artplace', id: p.id, name: p.name, c: p.c, t: Date.now() }),
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
  [/^#\/artist\/([^/]+)\/about$/, m => aboutOf(m[1]), 'artists'],
  [/^#\/artist\/([^/]+)\/works\/?$/, m => { const a = M.artists.find(x => x.slug === m[1]); return a ? archive(null, a) : notFound(); }],
  [/^#\/artist\/([^/]+)\/works\/([^/]+)$/, m => { const a = M.artists.find(x => x.slug === m[1]); return a ? archive(decodeURIComponent(m[2]), a) : notFound(); }],
  [/^#\/works\/?$/, () => archive()],
  [/^#\/works\/([^/]+)$/, m => archive(decodeURIComponent(m[1]))],
  [/^#\/work\/([^/]+)$/, m => work(m[1])],
  [/^#\/exhibition\/([^/]+)$/, m => exhibition(m[1])],
  [/^#\/exhibition\/([^/]+)\/space$/, m => exhibition(m[1])],
  [/^#\/museum$/, () => '<div class="wrap gut loading"><p>Opening the museum…</p></div>', 'shows'],
  [/^#\/object\/([^/]+)$/, m => object(m[1])],
  [/^#\/about$/, () => about()],
];

// who is signed in on this phone (auth.js keeps it; read here at once, without loading the sign-in code)
function signedIn() {
  try { const pv = JSON.parse(sessionStorage.getItem('os-preview')); if (pv) return pv.user && pv.user.id ? pv.user : null; } catch {}
  try { const u = JSON.parse(localStorage.getItem('os-user')); return u && u.id ? u : null; } catch { return null; }
}
// the control room's preview (auth.js): a bar on every screen while it lasts, in Hebrew (only the owners use it)
function previewBar() {
  let on = null; try { on = JSON.parse(sessionStorage.getItem('os-preview')); } catch {}
  let bar = document.getElementById('pvBar');
  if (!on) { if (bar) bar.remove(); document.body.classList.remove('previewing'); return; }
  if (!bar) {
    bar = document.createElement('div'); bar.id = 'pvBar'; bar.className = 'pv-bar'; bar.dir = 'rtl'; bar.lang = 'he';
    bar.innerHTML = `<span>תצוגה מקדימה, ${on.as === 'artist' ? 'כאמן חדש' : 'כמבקר חדש'}: שום דבר לא נשלח ולא נשמר</span><button type="button">יציאה</button>`;
    bar.querySelector('button').onclick = () => { try { sessionStorage.removeItem('os-preview'); sessionStorage.removeItem('os-pending'); } catch {} location.hash = '#/admin'; };
    document.body.append(bar);
  }
  document.body.classList.add('previewing');
}

// --- a page before it's live: its artist, or the people who run Open Studio, see it exactly as visitors will -----------
// #/preview/me (the artist's own) or #/preview/<id> (an admin): the page is read with the viewer's own sign-in (the
// database lets an artist read their own and an admin any), joined to the app's content, and shown with a bar
const REVIEW = 'os-review';
const reviewing = () => { try { return JSON.parse(sessionStorage.getItem(REVIEW)); } catch { return null; } };
async function loadReview(id) {
  const { client } = await import('./auth.js'); const c = await client();
  const { data: { session } } = await c.auth.getSession();
  if (!session) return null;
  const uid = id === 'me' ? session.user.id : id;
  const [{ data: a }, { data: works }, { data: admin }] = await Promise.all([c.from('artists').select('*').eq('id', uid).maybeSingle(),
    c.from('works').select('*').eq('artist_id', uid).order('position'), c.rpc('is_admin')]);
  if (!a) return null;
  // (a page shown before: taken out, so the fresh one replaces it)
  M.artists = M.artists.filter(x => x.uid !== uid); M.works = M.works.filter(w => !(w.artist && w.artist.uid === uid));
  M.exhibitions = M.exhibitions.filter(e => !(e.artist && e.artist.uid === uid));
  const seen = new Set([...M.artists.map(x => x.slug), ...M.works.map(w => w.slug), ...M.exhibitions.map(e => e.slug)]);
  const uniq = base => { let s = base, i = 2; while (seen.has(s)) s = `${base}-${i++}`; seen.add(s); return s; };
  addCommunity(M, { artists: [a], works: works || [], shows: [] }, uniq, seen);
  const x = M.artists.find(y => y.uid === uid);
  const r = { uid, slug: x.slug, name: a.name, status: a.status, note: a.note || '', own: uid === session.user.id, admin: admin === true };
  try { sessionStorage.setItem(REVIEW, JSON.stringify(r)); } catch {}
  return r;
}
function reviewBar() {
  const r = reviewing(); let bar = document.getElementById('rvBar');
  if (!r) { if (bar) bar.remove(); document.body.classList.remove('reviewing'); return; }
  if (!bar) { bar = document.createElement('div'); bar.id = 'rvBar'; document.body.append(bar); }
  const close = '<button type="button" data-rv="close">×</button>';
  if (r.admin && !r.own) {
    bar.className = 'rv-bar'; bar.dir = 'rtl'; bar.lang = 'he';
    bar.innerHTML = `<span>בדיקת העמוד של <b>${esc(r.name)}</b>, כמו שמבקרים יראו אותו</span><span class="rv-b"><a href="#/admin">לאשר או לבקש שינויים</a>${close}</span>`;
  } else {
    bar.className = 'rv-bar'; bar.dir = 'ltr'; bar.lang = 'en';
    const what = r.status === 'approved' ? 'Your page, live' : r.status === 'pending' ? 'Your page, as visitors will see it. Sent for review.' : 'Your page, as visitors will see it once approved.';
    bar.innerHTML = `<span>${what}</span><span class="rv-b"><a href="#/studio">Edit in your studio</a>${close}</span>`;
  }
  bar.querySelector('[data-rv=close]').onclick = () => { try { sessionStorage.removeItem(REVIEW); } catch {} location.hash = r.admin && !r.own ? '#/admin' : '#/studio'; };
  document.body.classList.add('reviewing');
}

// the artist's own page while they edit it (artist.js): their studio joined to the app's content as a visitor will see it
function ownPage(S) {
  const uid = S.uid || 'local-artist', a = S.artist;
  M.artists = M.artists.filter(x => x.uid !== uid); M.works = M.works.filter(w => !(w.artist && w.artist.uid === uid));
  M.exhibitions = M.exhibitions.filter(e => !(e.artist && e.artist.uid === uid));
  const seen = new Set([...M.artists.map(x => x.slug), ...M.works.map(w => w.slug), ...M.exhibitions.map(e => e.slug)]);
  const uniq = base => { let s = base, i = 2; while (seen.has(s)) s = `${base}-${i++}`; seen.add(s); return s; };
  const row = { id: uid, slug: S.slug || slugify(a.name) || 'artist', name: a.name, discipline: a.discipline, city: a.city, photo: a.photo, hero: a.hero, hero_pos: a.heroPos, statement: a.statement, bio: a.bio, link: a.link,
    instagram: a.instagram, cv: a.cv || [], exhibitions: (S.exhibitions || []).map(e => ({ ...e, photos: (e.photos || []).length ? e.photos : e.cover ? [{ src: e.cover }] : [] })) };
  addCommunity(M, { artists: [row], works: S.works.map(w => ({ ...w, artist_id: uid })), shows: [] }, uniq, seen);
  return M.artists.find(x => x.uid === uid);
}
const STUDIO_TOOLS = { ownPage, artistPage: a => artistPage(a.slug), about: a => aboutOf(a.slug), wire: () => wire(), im, curly: s => curly(s) };

let prevHash = null, lastHash = null;
function render() {
  const hash = location.hash || '#/';
  const rv = hash.match(/^#\/preview\/([^/]+)$/);
  if (rv && rv[1] === 'me') { location.replace('#/studio'); return; }       // (an artist's own page is their studio)
  if (rv) {
    app.innerHTML = '<div class="wrap gut loading"><p>Opening the page…</p></div>';
    loadReview(rv[1]).then(r => r ? location.replace(`#/artist/${r.slug}`) : (app.innerHTML = '<div class="wrap gut"><p class="m">This page can’t be opened here. Sign in first.</p></div>'));
    return;
  }
  // a page in review, after a reload: read again before it's shown
  const r0 = reviewing();
  if (r0 && !M.artists.some(x => x.uid === r0.uid)) { loadReview(r0.own ? 'me' : r0.uid).then(() => render()); return; }
  reviewBar();
  previewBar();
  if (hash !== lastHash) { prevHash = lastHash; lastHash = hash; }
  document.querySelectorAll('.log-view').forEach(v => v.remove());       // (a studio log open over the page closes with it)
  // the way in: signing up or in, and who you are here (auth.js), full screen, without the bar and tabs
  if (hash.startsWith('#/welcome') || hash.startsWith('#/account')) {
    if (openSpaceView) { openSpaceView.close(); openSpaceView = null; }
    if (artMap) { artMap.remove(); artMap = null; }
    document.querySelector('.bar').hidden = true; document.querySelector('.tabs').hidden = true; document.body.classList.remove('has-tabs');
    document.body.dataset.look = 'welcome';
    const go = (h, same) => { if (same || h === location.hash) render(); else location.hash = h; };
    import('./auth.js').then(m => m.screen(hash, app, go)).then(() => window.scrollTo(0, 0))
      .catch(e => { console.error(e); app.innerHTML = '<div class="wrap gut loading"><p>Signing in couldn\u2019t load. Check the connection and try again.</p></div>'; });
    return;
  }
  // the app is for people with an account; a link someone shared (a show, an artist, a work, a place) opens for anyone,
  // and so do the inspection and the checks (?inspect, ?guest)
  const shared = /^#\/(exhibition|artist|work|map\/place|place|object|studio)\b/.test(hash) || /[?&](inspect|guest)(=|&|$)/.test(location.search);
  if (!shared) {
    const me = signedIn();
    if (!me) { location.replace('#/welcome'); return; }
    if (me.details === false) { location.replace('#/welcome/details'); return; }
    if (!me.role) { location.replace('#/welcome/role'); return; }
    // (an artist sees the same app as everyone; their studio is a tap away, from their account)
  }
  // where people edit (the studio, the control room): always the light, high-contrast look, whatever the phone's setting
  document.documentElement.classList.toggle('lite', hash.startsWith('#/admin') || hash.startsWith('#/studio'));
  // the control room, for the people who run Open Studio (admin.js; the database decides who may)
  if (hash.startsWith('#/admin')) {
    if (openSpaceView) { openSpaceView.close(); openSpaceView = null; }
    document.querySelector('.bar').hidden = true; document.querySelector('.tabs').hidden = true; document.body.classList.remove('has-tabs');
    delete document.body.dataset.look;
    const go = (h, same) => { if (same || h === location.hash) render(); else location.hash = h; };
    import('./admin.js').then(m => m.admin(hash, app, go, M)).catch(e => { console.error(e); app.innerHTML = '<div class="wrap gut loading"><p>The control room couldn’t load.</p></div>'; });
    return;
  }
  // the artist's side: its own screens, without the visitors' bar and tabs
  if (hash.startsWith('#/studio')) {
    if (openSpaceView) { openSpaceView.close(); openSpaceView = null; }
    document.querySelector('.bar').hidden = true; document.querySelector('.tabs').hidden = true; document.body.classList.remove('has-tabs');
    const go = (h, same) => { if (same || h === location.hash) render(); else location.hash = h; };
    (window.__studio || import('./artist.js').then(m => m.studio)).then(f => { window.__studio = Promise.resolve(f); f(hash, app, go, M, STUDIO_TOOLS); window.scrollTo(0, 0); });
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
  rememberHash(hash);
  // each page its own title (the tab, history and a shared link say where it goes)
  const h = app.querySelector('h1, h2'), name = h && h.textContent.replace(/\s+/g, ' ').trim();
  document.title = name && tab !== 'home' ? `${name} · Open Studio` : 'Open Studio';
  window.scrollTo(0, 0);
  wire();
  const sm = hash.match(/^#\/exhibition\/([^/]+)\/space$/);
  if (sm) enterSpace(sm[1]);
  else if (hash === '#/museum') enterStreet();
}

// the 3D room opens over the exhibition page; leaving it returns to the page
let openSpaceView = null;
async function enterSpace(slug) {
  const e = exhibitionOf(slug);
  if (!e || !e.space) return;
  const openSpace = window.__openSpace || (await import('./space/space.js')).openSpace;
  // a virtual room is drawn here, around the show's works, before it opens
  let spec = e.space, made = null;
  if (e.space.virtual) { made = await (await import('./space/synth.js')).buildRoom({ ...e.space.virtual, works: e.works }, src); spec = made.spec; }
  openSpaceView = await openSpace({
    spec, works: e.space.virtual ? e.works : M.works, src,
    // leaving the space goes back to where it was entered from, without leaving the space in the history
    onClose: () => {
      openSpaceView = null;
      if (made) made.revoke();
      const page = `#/exhibition/${slug}`;
      if (prevHash === page || prevHash === '#/') history.back(); else location.replace(page);
    },
    onOpenWork: w => { location.hash = `#/work/${w.slug}`; },
  });
  window.__spaceView = openSpaceView;
}

// the museum street (space/synth.js buildStreet): one long walk indoors, a room off it for each virtual or online show, each with a
// threshold in the colour its works suggest (data/virtual.json streetColours, else sampled here) unless the curator chose another (museum_colours)
const streetShows = () => M.exhibitions.filter(e => (e.virtual || e.kind === 'online') && (e.works || []).length >= 3).slice(0, 8);     // (the same rule as synth.streetShows)
async function enterStreet() {
  const synth = await import('./space/synth.js');
  const openSpace = window.__openSpace || (await import('./space/space.js')).openSpace;
  const shows = synth.streetShows(M), thumb = w => w.thumb || M.thumbs[w.image] || w.image;
  const set = (M.virtualColours || {}), over = {};
  const get = t => fetch(DB + t, { headers: { apikey: DB_KEY }, cache: 'no-store', signal: AbortSignal.timeout ? AbortSignal.timeout(3000) : undefined }).then(r => r.ok ? r.json() : []);
  const slots = await liveSlots();                                 // the Desk's slots, asked for afresh (the database lets through only live ones inside their dates)
  try { for (const r of await get('museum_colours?select=slug,colour')) over[r.slug] = r.colour; } catch {}
  let rooms;
  if (slots.length) {
    rooms = (await Promise.all(slots.map(async s => {
      const c = s.content, e = s.app_slug && shows.find(x => x.slug === s.app_slug);
      if (!c && !e) return null;
      const ws = c ? (c.works || []) : e.works, slug = e ? e.slug : 'slot-' + s.slot;
      return { slug, title: c ? c.title : e.title, works: ws, text: c && c.text, curator: c && c.curator, plinths: c && c.plinths, objects: c && c.objects, labels: !!c,
        colour: s.colour || over[slug] || set[slug] || await synth.suggestColour(ws.map(thumb), src, synth.slugHue(slug)) };
    }))).filter(Boolean);
  }
  if (!rooms || !rooms.length) rooms = await Promise.all(shows.map(async e => ({
    slug: e.slug, title: e.title, works: e.works,
    colour: over[e.slug] || set[e.slug] || await synth.suggestColour(e.works.map(thumb), src, synth.slugHue(e.slug)),
  })));
  const made = await synth.buildStreet(rooms, src, thumb);
  if (location.hash !== '#/museum') return;                       // (left while it was being built)
  openSpaceView = await openSpace({
    spec: made.spec, works: M.works, src,
    onClose: () => { openSpaceView = null; if (prevHash === '#/shows' || prevHash === '#/') history.back(); else location.replace('#/shows'); },
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
  const hs = app.querySelector('.hs');
  if (hs) mountHome(hs).catch(e => console.error('home:', e));
  app.querySelectorAll('.walkbox').forEach(wireWalk);     // the artist page's Exhibitions (the same row as Home's Walk in now)
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

// A link that arrives with its picture: the share page of a show ('s') or an artist ('by') when one was published for it
// (share_pages.py, at every publish), else the app's own address. Asked for once and kept, so a tap on Share has it at hand.
const LINKS = new Map();
window.shareLink = (dir, slug, hash) => {
  // (which share pages exist is read once from share.json, written with them at every publish: asking for a page that isn't there
  //  would be a failed request on the phone for every show without one)
  const base = location.origin + location.pathname.replace(/[^/]*$/, '');
  if (!LINKS.has('list')) LINKS.set('list', fetch(`${base}share.json`, { signal: AbortSignal.timeout ? AbortSignal.timeout(2500) : undefined }).then(r => r.ok ? r.json() : {}).catch(() => { LINKS.delete('list'); return {}; }));
  return LINKS.get('list').then(l => (l[dir] || []).includes(slug) ? `${base}${dir}/${slug}/` : `${base}#${hash}`);
};
document.addEventListener('click', async ev => {
  const t = ev.target.closest('[data-share-show]'); if (!t) return;
  const e = exhibitionOf(t.dataset.shareShow); if (!e) return;
  const url = await window.shareLink('s', e.slug, `/exhibition/${e.slug}`);
  try { if (navigator.share) { await navigator.share({ title: e.title, text: `${e.title} on Open Studio`, url }); return; } } catch (x) { if (x && x.name === 'AbortError') return; }
  try { await navigator.clipboard.writeText(url); t.textContent = 'Link copied'; setTimeout(() => { t.textContent = 'Share'; }, 2000); } catch { prompt('Copy the link', url); }
});

const returning = /[?&](code|token_hash|error_description)=/.test(location.search) ? import('./auth.js').then(m => m.finishReturn()).catch(() => {}) : Promise.resolve();
Promise.all([loadData(), returning]).then(([d]) => { M = buildModel(d); render(); window.addEventListener('hashchange', render); freshCommunity(d); })
  .then(() => {
    if (!signedIn() || /[?&](inspect|guest)(=|&|$)/.test(location.search)) return;
    import('./auth.js').then(m => m.refresh()).then(next => {
      if (next && next !== '#/' && !location.hash.startsWith('#/welcome') && !/^#\/(exhibition|artist|work|map\/place|place|object|studio)\b/.test(location.hash)) location.replace(next);
    }).catch(() => {});
  })
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
    if (document.querySelector('.wl')) { setTimeout(show, 4000); return; }      // (not over the sign-in buttons: wait until the welcome screen is gone)
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
