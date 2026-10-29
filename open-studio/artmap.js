// The art map: Israel's art places in 3D, each in its own building and colour, and what's on in each today.
// Places: data/art/places.json (rebuilt monthly: a curated art-world list and OpenStreetMap, with each place's
// building). Shows: data/art/exhibitions.json (read daily from the places' own sites) and Open Studio's own.
// The base map is OpenFreeMap's vector tiles (OpenStreetMap data), drawn in the app's own paper palette.

export const KINDS = {
  museum: { label: 'Museums', one: 'Art museum', c: '#2F4FD0' },
  public: { label: 'Public galleries', one: 'Public gallery', c: '#E2553B' },
  commercial: { label: 'Galleries', one: 'Gallery', c: '#E9A23B' },
  'artist-run': { label: 'Artist-run', one: 'Artist-run space', c: '#1C9C86' },
  academy: { label: 'Art schools', one: 'Art school gallery', c: '#7B52D6' },
  centre: { label: 'Art centres', one: 'Art centre', c: '#D8578F' },
};
const TILES = 'https://tiles.openfreemap.org/planet';
const GLYPHS = 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf';
// walking, cycling and driving directions: OSRM on OpenStreetMap's data, run by FOSSGIS (no key; fair use)
const ROUTER = 'https://routing.openstreetmap.de';
const MODES = { foot: { label: 'Walk', path: 'routed-foot' }, bike: { label: 'Cycle', path: 'routed-bike' }, car: { label: 'Drive', path: 'routed-car' } };
const FOLLOW_KEY = 'os-follow-places';
const DAY = 864e5;

let lib = null;
function loadLib() {
  if (window.maplibregl) return Promise.resolve(window.maplibregl);
  lib = lib || new Promise((ok, no) => {
    const css = document.createElement('link');
    css.rel = 'stylesheet'; css.href = 'vendor/maplibre/maplibre-gl.css';
    document.head.append(css);
    const s = document.createElement('script');
    s.src = 'vendor/maplibre/maplibre-gl.js';
    s.onload = () => {
      try { window.maplibregl.setRTLTextPlugin(new URL('vendor/maplibre/mapbox-gl-rtl-text.js', location.href).href, true).catch(() => {}); } catch {}
      ok(window.maplibregl);
    };
    s.onerror = no;
    document.head.append(s);
  });
  return lib;
}

let data = null;
async function loadData() {
  if (data) return data;
  const get = u => fetch(u, { cache: 'no-cache' }).then(r => r.ok ? r.json() : null).catch(() => null);
  const [p, x, h] = await Promise.all([get('data/art/places.json'), get('data/art/exhibitions.json'), get('data/art/exhibitions.health.json')]);
  data = { places: (p && p.places || []).filter(q => q.status !== 'closed'), updated: p && p.updated,
    shows: x && x.shows || [], events: x && x.events || [], showsUpdated: x && x.updated,
    read: new Map((h && h.sources || []).filter(r => r.place).map(r => [r.place, r.status || ''])) };
  return data;
}

// --- small helpers ---------------------------------------------------------------------------------------
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const isHe = s => /[֐-׿]/.test(s || '');
const km = (a, b) => {
  const r = Math.PI / 180, dl = (b[0] - a[0]) * r, dn = (b[1] - a[1]) * r;
  const h = Math.sin(dl / 2) ** 2 + Math.cos(a[0] * r) * Math.cos(b[0] * r) * Math.sin(dn / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
};
const away = d => d < 1.2 ? `${Math.max(1, Math.round(d * 12.5))} min walk` : `${d < 10 ? d.toFixed(1) : Math.round(d)} km`;
const day = s => s ? new Date(s + 'T12:00:00') : null;
const metres = m => m < 950 ? `${Math.max(10, Math.round(m / 10) * 10)} m` : `${(m / 1000).toFixed(m < 9500 ? 1 : 0)} km`;
const mins = sec => sec < 3600 ? `${Math.max(1, Math.round(sec / 60))} min` : `${Math.floor(sec / 3600)} h ${Math.round(sec % 3600 / 60)} min`;
const clock = t => new Date(t).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
// metres east and north of a point, near enough for a city's distances
const flat = (o, q) => [(q[1] - o[1]) * 111320 * Math.cos(o[0] * Math.PI / 180), (q[0] - o[0]) * 110540];
const bearingOf = (a, b) => { const [x, y] = flat(a, b); return (Math.atan2(x, y) * 180 / Math.PI + 360) % 360; };
// [lat, lon] points in Google's encoded polyline format (precision 5), as OSRM reads them
function polyline(pts) {
  let out = '', pl = 0, pn = 0;
  for (const [lat, lon] of pts) {
    const a = Math.round(lat * 1e5), b = Math.round(lon * 1e5);
    for (let d of [a - pl, b - pn]) {
      d = d < 0 ? ~(d << 1) : d << 1;
      while (d >= 0x20) { out += String.fromCharCode((0x20 | (d & 0x1f)) + 63); d >>= 5; }
      out += String.fromCharCode(d + 63);
    }
    pl = a; pn = b;
  }
  return out;
}
// a circle on the ground as a polygon (the accuracy of a phone's fix)
function disc([lat, lon], r, n = 48) {
  const ring = [];
  for (let i = 0; i <= n; i++) {
    const a = i / n * Math.PI * 2;
    ring.push([lon + r * Math.sin(a) / (111320 * Math.cos(lat * Math.PI / 180)), lat + r * Math.cos(a) / 110540]);
  }
  return { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [ring] } };
}
// an OSRM step, said in words
const TURN = { left: 'Turn left', right: 'Turn right', 'slight left': 'Bear left', 'slight right': 'Bear right', 'sharp left': 'Turn sharp left',
  'sharp right': 'Turn sharp right', straight: 'Continue straight', uturn: 'Make a U-turn' };
const COMPASS = ['north', 'northeast', 'east', 'southeast', 'south', 'southwest', 'west', 'northwest'];
function say(st, dest) {
  const m = st.maneuver, on = st.name ? ` onto <bdi>${esc(st.name)}</bdi>` : '';
  if (m.type === 'depart') return `Head ${COMPASS[Math.round(m.bearing_after / 45) % 8]}${st.name ? ` on <bdi>${esc(st.name)}</bdi>` : ''}`;
  if (m.type === 'arrive') return `Arrive at <bdi>${esc(dest)}</bdi>`;
  if (m.type === 'roundabout' || m.type === 'rotary') return `At the roundabout, take exit ${m.exit || 1}${on}`;
  if (m.type === 'continue' || m.type === 'new name') return m.modifier && m.modifier !== 'straight' ? `${TURN[m.modifier] || 'Continue'}${on}` : `Continue${on}`;
  return `${TURN[m.modifier] || 'Continue'}${on}`;
}
const TURN_DEG = { uturn: 180, 'sharp right': 135, right: 90, 'slight right': 45, straight: 0, 'slight left': -45, left: -90, 'sharp left': -135 };
const arrow = st => {
  const m = st.maneuver;
  if (m.type === 'arrive') return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 22s-7-6.2-7-12a7 7 0 0 1 14 0c0 5.8-7 12-7 12z" fill="currentColor"/><circle cx="12" cy="10" r="2.6" fill="var(--nav)"/></svg>';
  const deg = m.type === 'depart' ? 0 : TURN_DEG[m.modifier] ?? 0;
  return `<svg viewBox="0 0 24 24" aria-hidden="true" style="transform:rotate(${deg}deg)"><path d="M12 3 5 11h4.5v10h5V11H19z" fill="currentColor"/></svg>`;
};
const dm = d => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
// the artists you follow in the app (app.js keeps them under os-following, by slug)
function followedArtists(M) {
  let slugs = [];
  try { slugs = JSON.parse(localStorage.getItem('os-following')) || []; } catch {}
  return new Set((M.artists || []).filter(a => slugs.includes(a.slug)).flatMap(a => [a.name, a.name_he].filter(Boolean)));
}
// Open Studio's artists showing at a place: [{name, followed}]
function appArtists(p, M) {
  const mine = new Map((M.artists || []).filter(a => !a.demo).flatMap(a => [a.name, a.name_he].filter(Boolean).map(n => [n.trim(), a])));
  const fol = followedArtists(M), out = new Map();
  for (const s of p.on.concat(p.next)) for (const n of s.artists) {
    const a = mine.get(n.trim());
    if (a) out.set(a.slug, { name: a.name, slug: a.slug, followed: fol.has(a.name) });
  }
  return [...out.values()];
}
function following() { try { return new Set(JSON.parse(localStorage.getItem(FOLLOW_KEY)) || []); } catch { return new Set(); } }
function setFollowing(set) { try { localStorage.setItem(FOLLOW_KEY, JSON.stringify([...set])); } catch {} }

// an isometric block in the place's colour: the building, as a glyph
const glyph = c => `<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M20 4 35 12.5v15L20 36 5 27.5v-15z" fill="${c}"/><path d="M20 4 35 12.5 20 21 5 12.5z" fill="#fff" fill-opacity=".38"/><path d="M20 21v15L5 27.5v-15z" fill="#000" fill-opacity=".12"/></svg>`;

// a small octagon where a place has no building outline on the map
function octagon([lat, lon], r = 9) {
  const out = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
    out.push([lon + (r * Math.cos(a)) / (111320 * Math.cos(lat * Math.PI / 180)), lat + (r * Math.sin(a)) / 110540]);
  }
  return out;
}
// the art building drawn a touch larger than the city's own, so its walls cover the plain one
function grow(ring, k = 1.03) {
  const cx = ring.reduce((s, p) => s + p[0], 0) / ring.length, cy = ring.reduce((s, p) => s + p[1], 0) / ring.length;
  return ring.map(([x, y]) => [cx + (x - cx) * k, cy + (y - cy) * k]);
}

// --- the base map, in paper ------------------------------------------------------------------------------
const NAME = ['coalesce', ['get', 'name:en'], ['get', 'name_en'], ['get', 'name:latin'], ['get', 'name']];
function style() {
  const road = (id, classes, color, w, minzoom = 5, extra = {}) => ({
    id, type: 'line', source: 'omt', 'source-layer': 'transportation', minzoom,
    filter: ['all', ['in', ['get', 'class'], ['literal', classes]], ['!=', ['get', 'brunnel'], 'tunnel']],
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: { 'line-color': color, 'line-width': ['interpolate', ['exponential', 1.6], ['zoom'], 10, w[0], 14, w[1], 18, w[2]], ...extra },
  });
  return {
    version: 8, glyphs: GLYPHS,
    sources: { omt: { type: 'vector', url: TILES, attribution: '<a href="https://openfreemap.org" target="_blank" rel="noopener">OpenFreeMap</a> © <a href="https://www.openmaptiles.org/" target="_blank" rel="noopener">OpenMapTiles</a> Data from <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>' } },
    layers: [
      { id: 'paper', type: 'background', paint: { 'background-color': '#F3EEE5' } },
      { id: 'park', type: 'fill', source: 'omt', 'source-layer': 'park', paint: { 'fill-color': '#DCE5C9', 'fill-opacity': 0.9 } },
      { id: 'green', type: 'fill', source: 'omt', 'source-layer': 'landcover', filter: ['in', ['get', 'class'], ['literal', ['grass', 'wood', 'farmland']]], paint: { 'fill-color': '#E3E8D3', 'fill-opacity': 0.6 } },
      { id: 'sand', type: 'fill', source: 'omt', 'source-layer': 'landcover', filter: ['==', ['get', 'class'], 'sand'], paint: { 'fill-color': '#EFE3C8' } },
      { id: 'water', type: 'fill', source: 'omt', 'source-layer': 'water', paint: { 'fill-color': '#BFDCDD' } },
      { id: 'waterway', type: 'line', source: 'omt', 'source-layer': 'waterway', paint: { 'line-color': '#BFDCDD', 'line-width': 1.2 } },
      road('road-minor', ['minor', 'service', 'track'], '#FFFDF8', [0.4, 2.2, 14], 12),
      road('road-path', ['path'], '#F8F3EA', [0.2, 0.8, 3], 14, { 'line-dasharray': [2, 1.5] }),
      road('road-major-case', ['primary', 'secondary', 'tertiary', 'trunk', 'motorway'], '#E4DACB', [1.4, 5, 26], 8),
      road('road-major', ['primary', 'secondary', 'tertiary', 'trunk', 'motorway'], '#FFFFFF', [0.8, 3.4, 22], 8),
      { id: 'rail', type: 'line', source: 'omt', 'source-layer': 'transportation', minzoom: 11, filter: ['==', ['get', 'class'], 'rail'], paint: { 'line-color': '#D6CDBE', 'line-width': 1.2, 'line-dasharray': [3, 2] } },
      { id: 'bld-flat', type: 'fill', source: 'omt', 'source-layer': 'building', minzoom: 13, maxzoom: 14.6, paint: { 'fill-color': '#E8E1D5', 'fill-opacity': ['interpolate', ['linear'], ['zoom'], 13, 0, 14, 1] } },
      { id: 'bld-3d', type: 'fill-extrusion', source: 'omt', 'source-layer': 'building', minzoom: 14.4,
        // the city in low, pale relief (at 40% of its height), so the art places rise out of it in colour
        paint: { 'fill-extrusion-color': '#EFE9DF', 'fill-extrusion-height': ['*', ['coalesce', ['get', 'render_height'], 6], 0.4],
          'fill-extrusion-base': ['*', ['coalesce', ['get', 'render_min_height'], 0], 0.4], 'fill-extrusion-opacity': 0.62 } },
      { id: 'label-water', type: 'symbol', source: 'omt', 'source-layer': 'water_name', layout: { 'text-field': NAME, 'text-font': ['Noto Sans Italic'], 'text-size': 12, 'text-letter-spacing': 0.2 }, paint: { 'text-color': '#6E9DA1' } },
      { id: 'label-road', type: 'symbol', source: 'omt', 'source-layer': 'transportation_name', minzoom: 15.2,
        layout: { 'symbol-placement': 'line', 'text-field': NAME, 'text-font': ['Noto Sans Regular'], 'text-size': 10.5 },
        paint: { 'text-color': '#9C9285', 'text-halo-color': '#FFFDF8', 'text-halo-width': 1.4 } },
      { id: 'label-place', type: 'symbol', source: 'omt', 'source-layer': 'place', filter: ['in', ['get', 'class'], ['literal', ['city', 'town', 'suburb', 'neighbourhood', 'quarter']]],
        layout: { 'text-field': NAME, 'text-font': ['Noto Sans Regular'], 'text-transform': 'uppercase', 'text-letter-spacing': 0.14,
          'text-size': ['match', ['get', 'class'], 'city', 13, 'town', 12, 10.5] },
        paint: { 'text-color': '#7B7266', 'text-halo-color': '#F3EEE5', 'text-halo-width': 1.6 } },
    ],
  };
}

// --- the shows, joined to the places ---------------------------------------------------------------------
function joinShows(places, d, M) {
  const byId = new Map(places.map(p => [p.id, p]));
  for (const p of places) { p.shows = []; p.events = []; }
  const now = Date.now();
  for (const s of d.shows) {
    const p = byId.get(s.place);
    if (!p) continue;
    const start = day(s.start), end = day(s.end);
    if (end && +end + DAY < now) continue;
    p.shows.push({ title: s.title, artists: s.artists || [], start, end, url: s.url, source: s.source });
  }
  for (const e of d.events) { const p = byId.get(e.place); if (p) p.events.push({ ...e, at: day(e.date) }); }
  // Open Studio's own shows (the real ones; the demo world's made-up galleries stay off this map)
  for (const e of (M.exhibitions || []).filter(x => !x.demo && x.at && x.end && +x.end > now)) {
    let p = places.reduce((best, q) => { const k = km(q.at, e.at); return k < 0.15 && (!best || k < best.k) ? { q, k } : best; }, null);
    p = p ? p.q : null;
    if (!p) {
      p = { id: `os-${e.slug}`, name: e.venue || e.title, name_he: '', kind: 'public', tier: 'curated', city: e.city || '', at: e.at, building: null, shows: [], events: [] };
      places.push(p); byId.set(p.id, p);
    }
    p.shows.push({ title: e.title, artists: (e.artists || [e.artist]).filter(Boolean).map(a => a.name), start: e.start, end: e.end, href: `#/exhibition/${e.slug}`, os: true, space: !!e.space });
  }
  for (const p of places) {
    p.on = p.shows.filter(s => (!s.start || +s.start <= now) && (!s.end || +s.end + DAY > now));
    p.next = p.shows.filter(s => s.start && +s.start > now).sort((a, b) => a.start - b.start);
    p.soonEvents = p.events.filter(e => e.at && +e.at + DAY > now && +e.at - now < 21 * DAY).sort((a, b) => a.at - b.at);
  }
}

function geo(places, kinds) {
  const shown = places.filter(p => kinds.has(p.kind));
  // places in the same building stack up in it, a floor of colour each, as in Kiryat HaMelacha's gallery houses
  const groups = new Map();
  for (const p of shown) {
    const k = p.building ? p.building.osm : p.id;
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(p);
  }
  const poly = [];
  for (const g of groups.values()) {
    const b = g[0].building, ring = b ? grow(b.ring) : octagon(g[0].at);
    const total = Math.max((b && b.h || 0) * 0.8, g.some(p => p.kind === 'museum') ? 24 : 16, g.length * 7);
    g.sort((x, y) => (y.on.length > 0) - (x.on.length > 0) || x.name.localeCompare(y.name));
    g.forEach((p, i) => poly.push({
      type: 'Feature', id: p.id,
      properties: { id: p.id, kind: p.kind, c: KINDS[p.kind].c, on: p.on.length > 0, tier: p.tier,
        base: total * i / g.length, h: total * (i + 1) / g.length - (i < g.length - 1 ? 0.6 : 0) },
      geometry: { type: 'Polygon', coordinates: [[...ring, ring[0]]] },
    }));
  }
  const pts = shown.map(p => ({
    type: 'Feature', id: p.id,
    properties: { id: p.id, kind: p.kind, c: KINDS[p.kind].c, on: p.on.length > 0, tier: p.tier,
      label: p.name && !isHe(p.name) ? p.name : (p.name_he || p.name) },
    geometry: { type: 'Point', coordinates: [p.at[1], p.at[0]] },
  }));
  return [{ type: 'FeatureCollection', features: poly }, { type: 'FeatureCollection', features: pts }];
}

// --- the page ----------------------------------------------------------------------------------------------
export async function mountArtMap(root, ctx) {
  const { M, here, focus, setHere } = ctx;
  const d = await loadData();
  const places = d.places.map(p => ({ ...p }));
  joinShows(places, d, M);
  const kinds = new Set(Object.keys(KINDS));
  const follow = following();
  let me = here(), sel = focus ? places.find(p => p.id === focus) || null : null;
  let live = null, watch = null, tracking = false, compass = null, area = '', lastPaintAt = null;
  let trip = null;                                     // directions: {dest, mode, route, coords, cum, steps, done, nav, off}
  if (!sel && focus && focus.startsWith('os-')) sel = places.find(p => p.shows.some(s => s.href === `#/exhibition/${focus.slice(3)}`)) || null;

  const sheet = root.querySelector('.am-sheet'), mapEl = root.querySelector('.am-map');
  const cities = Object.entries(places.reduce((m, p) => { if (p.city) (m[p.city] = m[p.city] || []).push(p.at); return m; }, {}))
    .filter(([, v]) => v.length >= 3).map(([n, v]) => ({ name: n, at: [v.reduce((s, a) => s + a[0], 0) / v.length, v.reduce((s, a) => s + a[1], 0) / v.length], n: v.length }))
    .sort((a, b) => b.n - a.n);
  const sel$ = root.querySelector('#amCity');
  sel$.innerHTML = ['Near me', ...cities.map(c => c.name)].map(n => `<option ${n === me.name ? 'selected' : ''}>${esc(n)}</option>`).join('')
    + (cities.some(c => c.name === me.name) || me.name === 'Near me' ? '' : `<option selected>${esc(me.name)}</option>`);

  // the densest cluster of art places within reach: where the map opens
  const district = at => {
    const close = places.filter(p => km(at, p.at) < 6);
    if (!close.length) return at;
    const best = close.map(p => ({ p, n: close.filter(q => km(p.at, q.at) < 0.6).length + (p.on.length ? 0.5 : 0) }))
      .sort((a, b) => b.n - a.n || km(at, a.p.at) - km(at, b.p.at))[0].p;
    const group = close.filter(q => km(best.at, q.at) < 0.6);
    return [group.reduce((s, q) => s + q.at[0], 0) / group.length, group.reduce((s, q) => s + q.at[1], 0) / group.length];
  };
  const near = () => places.map(p => ({ p, d: km(me.at, p.at) })).filter(x => kinds.has(x.p.kind)).sort((a, b) => a.d - b.d);

  function row({ p, d: dist }) {
    const c = KINDS[p.kind].c, s = p.on[0];
    const what = s ? `<span class="am-on"><bdi>${esc(s.title)}</bdi>${p.on.length > 1 ? ` <i>and ${p.on.length - 1} more</i>` : ''}</span>`
      : p.soonEvents[0] ? `<span class="am-on soft"><bdi>${esc(p.soonEvents[0].title)}</bdi></span>` : '';
    const yours = appArtists(p, M).filter(a => a.followed);
    return `<button type="button" class="am-row${p.tier === 'listed' ? ' listed' : ''}" data-place="${esc(p.id)}" style="--c:${c}">
      <span class="am-glyph">${glyph(c)}</span>
      <span class="am-rt"><b dir="auto">${esc(p.name)}</b><span class="am-m">${esc(KINDS[p.kind].one)}${p.city ? ` · ${esc(p.city)}` : ''} · ${esc(away(dist))}${follow.has(p.id) ? ' · <span class="am-f">Following</span>' : ''}</span>${what}${yours.length ? `<span class="am-yours-row">${esc(yours.map(a => a.name).join(', '))} · you follow</span>` : ''}</span></button>`;
  }

  function list() {
    const all = near(), inReach = all.filter(x => x.d < 40);
    const onNow = inReach.filter(x => x.p.on.length), quiet = inReach.filter(x => !x.p.on.length);
    const followed = all.filter(x => follow.has(x.p.id));
    const evs = inReach.flatMap(x => x.p.soonEvents.map(e => ({ e, x }))).sort((a, b) => a.e.at - b.e.at).slice(0, 6);
    const count = k => places.filter(p => p.kind === k).length;
    const nOn = places.filter(p => p.on.length).reduce((s, p) => s + p.on.length, 0);
    return `<header class="am-head">
        <p class="k">${live ? '<i class="am-livedot"></i>Live · where you are' : 'The art map · Israel'}</p>
        <h1 class="am-title" dir="auto">${esc(live ? area || 'Around you' : me.name === 'Near me' ? 'Around you' : me.name)}</h1>
        <p class="am-sum"><b>${places.length}</b> art spaces <span>·</span> <b>${nOn}</b> shows on${d.showsUpdated ? ` <span>·</span> updated ${esc(dm(day(d.showsUpdated)))}` : ''}</p>
      </header>
      <div class="am-kinds" role="group" aria-label="Kinds of places">${Object.entries(KINDS).map(([k, v]) => `<button type="button" data-kind="${k}" aria-pressed="${kinds.has(k)}" style="--c:${v.c}"><i></i>${esc(v.label)} <span>${count(k)}</span></button>`).join('')}</div>
      <div class="am-live">${live ? around() : ''}</div>
      ${followed.length ? `<section class="am-sec"><h2>Places you follow</h2>${followed.map(row).join('')}</section>` : ''}
      <section class="am-sec"><h2>${live ? 'On now, further out' : `On now${me.name === 'Near me' ? ' near you' : ''}`}</h2>${onNow.filter(x => !live || x.d >= WALK).length ? onNow.filter(x => !live || x.d >= WALK).slice(0, 12).map(row).join('') : '<p class="am-empty">Nothing listed yet for these places. We read their own sites every morning.</p>'}</section>
      ${evs.length ? `<section class="am-sec"><h2>Openings and talks</h2>${evs.map(({ e, x }) => `<button type="button" class="am-ev" data-place="${esc(x.p.id)}" style="--c:${KINDS[x.p.kind].c}"><span class="am-date"><b>${e.at.getDate()}</b>${esc(e.at.toLocaleDateString('en-GB', { month: 'short' }))}</span><span class="am-rt"><b dir="auto">${esc(e.title)}</b><span class="am-m">${esc(x.p.name)}${e.time ? ` · ${esc(e.time)}` : ''}</span></span></button>`).join('')}</section>` : ''}
      <section class="am-sec"><h2>More art spaces</h2><div data-more-list>${quiet.map((x, i) => i < 8 ? row(x) : row(x).replace('<button', '<button hidden')).join('')}</div>${quiet.length > 8 ? '<button type="button" class="am-more" data-more>Show more</button>' : ''}</section>
      <p class="am-credit">Places: Open Studio's art-world list and <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>, checked monthly. What's on: read each morning from the places' own websites. Map: OpenFreeMap, OpenMapTiles, OpenStreetMap.</p>`;
  }

  // where you are, live: the place you're standing in, and every show on within a walk, nearest first
  const WALK = 1.6;
  function around() {
    const all = near(), here = all[0] && all[0].d < 0.06 ? all[0] : null;
    const shows = all.filter(x => x.d < WALK && x !== here).flatMap(x => x.p.on.map(s => ({ s, x })));
    const tonight = all.filter(x => x.d < WALK).flatMap(x => x.p.soonEvents.filter(e => e.at && e.at.toDateString() === new Date().toDateString()).map(e => ({ e, x })));
    const spaces = all.filter(x => x.d < WALK).length;
    const showRow = ({ s, x }) => `<button type="button" class="am-row am-show" data-place="${esc(x.p.id)}" style="--c:${KINDS[x.p.kind].c}">
      <span class="am-glyph">${glyph(KINDS[x.p.kind].c)}</span>
      <span class="am-rt"><b dir="auto">${esc(s.title)}</b>${s.artists.length ? `<span class="am-art" dir="auto">${esc(s.artists.join(', '))}</span>` : ''}<span class="am-m"><bdi>${esc(x.p.name)}</bdi> · ${esc(away(x.d))}${s.end ? ` · until ${esc(dm(s.end))}` : ''}</span></span></button>`;
    return `${here ? `<section class="am-here" style="--c:${KINDS[here.p.kind].c}"><p class="am-k2">You're at</p><h2 dir="auto">${esc(here.p.name)}</h2>
        ${here.p.on.length ? `<ul class="am-shows">${here.p.on.map(s => `<li><b dir="auto">${esc(s.title)}</b>${s.artists.length ? `<span dir="auto">${esc(s.artists.join(', '))}</span>` : ''}${s.end ? `<span class="am-m">Until ${esc(dm(s.end))}</span>` : ''}</li>`).join('')}</ul>` : '<p class="am-empty">Nothing listed here today.</p>'}
        <button type="button" class="am-more" data-place="${esc(here.p.id)}">About this place</button></section>` : ''}
      <section class="am-sec"><h2>${here ? 'Also on around you' : 'On around you now'}</h2>${shows.length ? shows.slice(0, 14).map(showRow).join('')
        : `<p class="am-empty">${spaces ? `${spaces} art space${spaces > 1 ? 's' : ''} within a walk, with nothing listed on today.` : 'No art spaces within a walk of here. The nearest are below.'}</p>`}</section>
      ${tonight.length ? `<section class="am-sec"><h2>Tonight, near you</h2>${tonight.map(({ e, x }) => `<button type="button" class="am-ev" data-place="${esc(x.p.id)}" style="--c:${KINDS[x.p.kind].c}"><span class="am-date"><b>${esc(e.time || '·')}</b></span><span class="am-rt"><b dir="auto">${esc(e.title)}</b><span class="am-m"><bdi>${esc(x.p.name)}</bdi> · ${esc(away(x.d))}</span></span></button>`).join('')}</section>` : ''}`;
  }

  // why a place shows nothing: said plainly, from this morning's read of its site
  function whyEmpty(p) {
    const st = d.read.get(p.id) || '', when = d.showsUpdated ? dm(day(d.showsUpdated)) : 'today';
    if (!p.website && !st) return 'No website for this place on the map yet, so there\u2019s nothing to read what\u2019s on from.';
    if (st.startsWith('unreachable')) return `Their site didn\u2019t answer when we read it (${esc(when)}). We try again every morning.`;
    if (st === 'robots.txt says no') return 'Their site asks not to be read automatically, so what\u2019s on is on their site itself.';
    return `Their site lists no exhibition with dates for now (read ${esc(when)}).`;
  }

  function card(p) {
    const c = KINDS[p.kind].c, dist = km(me.at, p.at);
    const show = s => `<li><b dir="auto">${s.href ? `<a href="${esc(s.href)}">${esc(s.title)}</a>` : esc(s.title)}</b>${s.artists.length ? `<span dir="auto">${esc(s.artists.join(', '))}</span>` : ''}<span class="am-m">${s.start && +s.start > Date.now() ? `From ${esc(dm(s.start))}` : ''}${s.end ? `${s.start && +s.start > Date.now() ? ' · ' : ''}Until ${esc(dm(s.end))}` : ''}${s.os ? ' · On Open Studio' : ''}${s.space ? ' · <b>Walk it in 3D</b>' : ''}</span></li>`;
    const theirs = appArtists(p, M).sort((a, b) => b.followed - a.followed);
    return `<article class="am-card" style="--c:${c}">
      <div class="am-card-top"><span class="am-kind"><i></i>${esc(KINDS[p.kind].one)}${p.tier === 'listed' ? ' · listed on OpenStreetMap' : ''}</span><button type="button" class="am-x" aria-label="Close">×</button></div>
      <h2 dir="auto">${esc(p.name)}</h2>${p.name_he && p.name_he !== p.name ? `<p class="am-he" dir="rtl">${esc(p.name_he)}</p>` : ''}
      <p class="am-m">${[p.address, p.city].filter(Boolean).map(x => `<bdi>${esc(x)}</bdi>`).join(', ')}${p.address || p.city ? ' · ' : ''}${esc(away(dist))}${p.approx ? ' · approximate location' : ''}</p>
      <div class="am-actions"><button type="button" class="am-follow" aria-pressed="${follow.has(p.id)}">${follow.has(p.id) ? 'Following' : 'Follow'}</button>
        ${p.website ? `<a href="${esc(p.website)}" target="_blank" rel="noopener">Website ↗</a>` : ''}
        <button type="button" class="am-go">Directions</button></div>
      ${theirs.length ? `<p class="am-yours">${theirs.map(a => `<a href="#/artist/${esc(a.slug)}">${esc(a.name)}</a>${a.followed ? ' <b>· you follow</b>' : ''}`).join(', ')}: on Open Studio, showing here</p>` : ''}
      ${p.on.length ? `<h3>On now</h3><ul class="am-shows">${p.on.map(show).join('')}</ul>` : ''}
      ${p.next.length ? `<h3>Coming up</h3><ul class="am-shows">${p.next.map(show).join('')}</ul>` : ''}
      ${p.soonEvents.length ? `<h3>Talks and openings</h3><ul class="am-shows">${p.soonEvents.map(e => `<li><b dir="auto">${esc(e.title)}</b><span class="am-m">${esc(dm(e.at))}${e.time ? ` · ${esc(e.time)}` : ''}</span></li>`).join('')}</ul>` : ''}
      ${!p.shows.length && !p.soonEvents.length ? `<p class="am-empty">${whyEmpty(p)}</p>` : ''}
      ${p.shows.some(s => s.url) ? `<p class="am-src">From the place's own site, read ${esc(d.showsUpdated ? dm(day(d.showsUpdated)) : 'today')}.</p>` : ''}
    </article>`;
  }

  function tripPanel() {
    const t = trip, p = t.dest, c = KINDS[p.kind].c;
    const modes = `<div class="am-modes" role="group" aria-label="How to get there">${Object.entries(MODES).map(([k, v]) => `<button type="button" data-mode="${k}" aria-pressed="${t.mode === k}">${v.label}</button>`).join('')}</div>`;
    if (t.error) return `<article class="am-card am-trip" style="--c:${c}"><div class="am-card-top"><span class="am-kind"><i></i>Directions</span><button type="button" class="am-x" data-end aria-label="Close">×</button></div>
      <h2 dir="auto">${esc(p.name)}</h2>${modes}<p class="am-empty">${esc(t.error)}</p></article>`;
    if (!t.route) return `<article class="am-card am-trip" style="--c:${c}"><div class="am-card-top"><span class="am-kind"><i></i>Directions</span><button type="button" class="am-x" data-end aria-label="Close">×</button></div>
      <h2 dir="auto">${esc(p.name)}</h2>${modes}<p class="am-empty">Finding the way…</p></article>`;
    const left = t.nav ? t.left : t.route.distance, secs = t.route.duration * (left / Math.max(1, t.route.distance));
    const on = p.on.length ? `<h3>On at ${esc(p.name)}</h3><ul class="am-shows">${p.on.map(s => `<li><b dir="auto">${esc(s.title)}</b>${s.artists.length ? `<span dir="auto">${esc(s.artists.join(', '))}</span>` : ''}${s.end ? `<span class="am-m">Until ${esc(dm(s.end))}</span>` : ''}</li>`).join('')}</ul>` : '';
    if (t.done) return `<article class="am-card am-trip" style="--c:${c}"><p class="am-k2">You've arrived</p><h2 dir="auto">${esc(p.name)}</h2>${on || '<p class="am-empty">Nothing listed here today.</p>'}
      <div class="am-actions"><button type="button" class="am-follow" data-end>Done</button></div></article>`;
    return `<article class="am-card am-trip" style="--c:${c}">
      <div class="am-card-top"><span class="am-kind"><i></i>${t.nav ? 'On the way to' : 'Directions to'}</span><button type="button" class="am-x" data-end aria-label="End">×</button></div>
      <h2 dir="auto">${esc(p.name)}</h2>
      <p class="am-eta"><b>${esc(mins(secs))}</b> <span>${esc(metres(left))} · arrive ${esc(clock(Date.now() + secs * 1000))}</span></p>
      ${t.nav ? '' : modes}
      <div class="am-actions">${t.nav ? '<button type="button" class="am-follow" data-end>End</button><button type="button" data-recentre>Re-centre</button>' : '<button type="button" class="am-follow" data-start>Start</button>'}</div>
      ${t.nav ? '' : `<details class="am-steps"><summary>${t.steps.length} steps</summary><ol>${t.steps.map(st => `<li><i>${arrow(st)}</i><span>${say(st, p.name)}<small>${st.distance ? esc(metres(st.distance)) : ''}</small></span></li>`).join('')}</ol></details>`}
      ${on}
      <p class="am-src">Directions from OpenStreetMap (OSRM, FOSSGIS). Check the way as you go.</p></article>`;
  }

  function paint() {
    sheet.innerHTML = trip ? tripPanel() : sel ? card(sel) : list();
    wireSheet();
  }

  // --- the map ---
  let map = null;
  try {
    const gl = await loadLib();
    if (!gl.supported || gl.supported({ failIfMajorPerformanceCaveat: false }) !== false) {
      const start = sel ? sel.at : district(me.at);
      map = new gl.Map({ container: mapEl, style: style(), center: [start[1], start[0]], zoom: sel ? 16.4 : 15.1,
        pitch: 58, bearing: -24, maxPitch: 72, attributionControl: false, dragRotate: true, pitchWithRotate: true });
      map.addControl(new gl.AttributionControl({ compact: true }), 'bottom-left');
      map.touchZoomRotate.enableRotation();
      map.on('error', e => console.warn('art map:', e.error && (e.error.message || e.error.status), e.sourceId || ''));
      root.__map = map;
      window.__artTrip = () => trip;                  // for the phone test that walks a route
    }
  } catch (e) { console.warn('art map: no 3D map', e); }
  if (!map) mapEl.innerHTML = '<p class="am-nomap">The 3D map needs WebGL, which this browser has turned off. The places are all listed below.</p>';

  const refresh = () => {
    if (!map || !map.getSource('art')) return;
    const [a, b] = geo(places, kinds);
    map.getSource('art').setData(a); map.getSource('artpt').setData(b);
    if (sel) map.setFeatureState({ source: 'art', id: sel.id }, { sel: true });
  };

  if (map) map.on('load', () => {
    const [a, b] = geo(places, kinds);
    map.addSource('art', { type: 'geojson', data: a, promoteId: 'id' });
    map.addSource('artpt', { type: 'geojson', data: b, promoteId: 'id' });
    map.addLayer({ id: 'art-wash', type: 'circle', source: 'artpt', paint: {
      'circle-color': ['get', 'c'], 'circle-blur': 1, 'circle-pitch-alignment': 'map',
      'circle-radius': ['interpolate', ['exponential', 1.7], ['zoom'], 8, 10, 12, 34, 15, 150, 18, 520],
      'circle-opacity': ['case', ['get', 'on'], 0.2, 0.09] } }, 'label-water');
    map.addLayer({ id: 'art-glow', type: 'circle', source: 'artpt', paint: {
      'circle-color': ['get', 'c'], 'circle-blur': 0.9, 'circle-pitch-alignment': 'map',
      'circle-radius': ['interpolate', ['exponential', 1.7], ['zoom'], 8, 4, 12, 12, 15, 52, 18, 190],
      'circle-opacity': ['case', ['get', 'on'], 0.42, 0.18] } }, 'label-water');
    map.addLayer({ id: 'art-dot', type: 'circle', source: 'artpt', maxzoom: 14.6, paint: {
      'circle-color': ['get', 'c'], 'circle-radius': ['interpolate', ['linear'], ['zoom'], 7, 2.5, 12, 4.5, 14.5, 6],
      'circle-stroke-color': '#FFFFFF', 'circle-stroke-width': ['interpolate', ['linear'], ['zoom'], 7, 0.6, 13, 1.6],
      'circle-opacity': ['case', ['==', ['get', 'tier'], 'listed'], 0.7, 1], 'circle-stroke-opacity': ['case', ['==', ['get', 'tier'], 'listed'], 0.7, 1] } });
    map.addLayer({ id: 'art-3d', type: 'fill-extrusion', source: 'art', minzoom: 13.2, paint: {
      'fill-extrusion-color': ['get', 'c'],
      'fill-extrusion-height': ['get', 'h'],
      'fill-extrusion-base': ['get', 'base'], 'fill-extrusion-opacity': ['interpolate', ['linear'], ['zoom'], 13.2, 0, 14, 0.97], 'fill-extrusion-vertical-gradient': true } });
    // the chosen place: a ring on the ground in its colour
    map.addLayer({ id: 'art-ring', type: 'circle', source: 'artpt', filter: ['==', ['get', 'id'], ''], paint: {
      'circle-pitch-alignment': 'map', 'circle-color': 'rgba(0,0,0,0)', 'circle-stroke-color': ['get', 'c'], 'circle-stroke-width': 3,
      'circle-radius': ['interpolate', ['exponential', 2], ['zoom'], 13, 8, 16, 38, 18, 150] } });
    map.addLayer({ id: 'art-label', type: 'symbol', source: 'artpt', minzoom: 14.2, layout: {
      'text-field': ['get', 'label'], 'text-font': ['Noto Sans Bold'], 'text-size': 12, 'text-anchor': 'top', 'text-offset': [0, 0.9],
      'text-max-width': 9, 'symbol-sort-key': ['case', ['get', 'on'], 0, 1], 'text-optional': true },
      paint: { 'text-color': '#1B1A17', 'text-halo-color': 'rgba(255,253,248,.95)', 'text-halo-width': 1.8 } });
    // you, and the way to a place
    map.addSource('route', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
    map.addLayer({ id: 'route-case', type: 'line', source: 'route', layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': '#FFFFFF', 'line-width': ['interpolate', ['linear'], ['zoom'], 12, 6, 18, 16] } }, 'art-wash');
    map.addLayer({ id: 'route-line', type: 'line', source: 'route', layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': '#1E6FFF', 'line-width': ['interpolate', ['linear'], ['zoom'], 12, 3.5, 18, 10] } }, 'art-wash');
    map.addSource('me-acc', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
    map.addLayer({ id: 'me-acc', type: 'fill', source: 'me-acc', paint: { 'fill-color': '#1E6FFF', 'fill-opacity': 0.12 } }, 'art-wash');
    map.addLayer({ id: 'me-acc-edge', type: 'line', source: 'me-acc', paint: { 'line-color': '#1E6FFF', 'line-opacity': 0.35, 'line-width': 1 } }, 'art-wash');
    if (live) drawMe();
    if (trip && trip.route) drawRoute();
    if (sel) { map.setFeatureState({ source: 'art', id: sel.id }, { sel: true }); map.setFilter('art-ring', ['==', ['get', 'id'], sel.id]); }
    const attrib = root.querySelector('.maplibregl-ctrl-attrib');
    if (attrib) attrib.classList.remove('maplibregl-compact-show');
    const hit = e => (map.queryRenderedFeatures(e.point, { layers: ['art-3d', 'art-dot', 'art-label'] })[0] || {}).properties;
    map.on('click', e => { const f = hit(e); if (f) choose(f.id); });
    map.on('dragstart', () => setTracking(false));
    ['art-3d', 'art-dot'].forEach(l => {
      map.on('mouseenter', l, () => { map.getCanvas().style.cursor = 'pointer'; });
      map.on('mouseleave', l, () => { map.getCanvas().style.cursor = ''; });
    });
    if (sel) orbit();
  });

  function orbit() {                                   // a slow turn round the chosen building
    if (!map || !sel) return;
    map.easeTo({ center: [sel.at[1], sel.at[0]], zoom: Math.max(map.getZoom(), 16.4), pitch: 62, bearing: map.getBearing() - 40, duration: 2600 });
  }

  function choose(id) {
    if (trip && trip.nav) return;
    if (trip) endTrip(false);
    if (map && sel) map.setFeatureState({ source: 'art', id: sel.id }, { sel: false });
    sel = id ? places.find(p => p.id === id) || null : null;
    if (map && map.getLayer('art-ring')) map.setFilter('art-ring', ['==', ['get', 'id'], sel ? sel.id : '']);
    if (map && sel) { map.setFeatureState({ source: 'art', id: sel.id }, { sel: true }); orbit(); }
    history.replaceState(null, '', sel ? `#/map/place/${encodeURIComponent(sel.id)}` : '#/map');
    paint();
    if (sel) root.querySelector('.am-sheet').scrollIntoView({ block: 'start', behavior: 'smooth' });
  }

  function wireSheet() {
    sheet.querySelectorAll('[data-place]').forEach(b => b.onclick = () => { choose(b.dataset.place); window.scrollTo({ top: 0, behavior: 'smooth' }); });
    sheet.querySelectorAll('[data-kind]').forEach(b => b.onclick = () => {
      const k = b.dataset.kind;
      if (kinds.size === Object.keys(KINDS).length) { kinds.clear(); kinds.add(k); }         // the first tap picks one kind
      else if (kinds.has(k)) { kinds.delete(k); if (!kinds.size) Object.keys(KINDS).forEach(x => kinds.add(x)); }
      else kinds.add(k);
      refresh(); paint();
    });
    const x = sheet.querySelector('.am-x');
    if (x) x.onclick = () => { choose(null); if (map) map.easeTo({ zoom: 14.2, pitch: 52, duration: 1200 }); };
    const f = sheet.querySelector('.am-follow');
    if (f) f.onclick = () => {
      if (follow.has(sel.id)) follow.delete(sel.id); else follow.add(sel.id);
      setFollowing(follow); paint();
    };
    const go = sheet.querySelector('.am-go');
    if (go) go.onclick = () => plan(sel, km(live ? live.at : me.at, sel.at) < 2.5 ? 'foot' : 'car');
    sheet.querySelectorAll('[data-mode]').forEach(b => b.onclick = () => plan(trip.dest, b.dataset.mode));
    sheet.querySelectorAll('[data-end]').forEach(b => b.onclick = () => endTrip(true));
    const st = sheet.querySelector('[data-start]');
    if (st) st.onclick = startNav;
    const rc = sheet.querySelector('[data-recentre]');
    if (rc) rc.onclick = () => { setTracking(true); follow$(true); };
    const more = sheet.querySelector('[data-more]');
    if (more) more.onclick = () => {
      const rest = [...sheet.querySelectorAll('[data-more-list] > [hidden]')];
      rest.slice(0, 8).forEach(r => { r.hidden = false; });
      if (rest.length <= 8) more.remove();
    };
  }

  // --- where you are, live --------------------------------------------------------------------------------
  const locate$ = root.querySelector('#amLocate'), nav$ = root.querySelector('.am-nav'), am = root.querySelector('.am') || root;
  let meMarker = null;
  function drawMe() {
    if (!map || !live) return;
    if (!meMarker && window.maplibregl) {
      const el = document.createElement('div');
      el.className = 'am-me';
      el.innerHTML = '<i class="am-me-cone"></i><i class="am-me-pulse"></i><i class="am-me-dot"></i>';
      meMarker = new window.maplibregl.Marker({ element: el, rotationAlignment: 'map', pitchAlignment: 'map' }).setLngLat([live.at[1], live.at[0]]).addTo(map);
    }
    if (meMarker) {
      meMarker.setLngLat([live.at[1], live.at[0]]);
      const hd = heading();
      meMarker.getElement().classList.toggle('dir', hd != null);
      if (hd != null) meMarker.setRotation(hd);
    }
    const src = map.getSource('me-acc');
    if (src) src.setData(live.acc > 12 ? disc(live.at, Math.min(live.acc, 2000)) : { type: 'FeatureCollection', features: [] });
  }
  // which way you face: the compass when the phone has one, else the way you're moving
  const heading = () => compass != null ? compass : live && live.heading != null && live.speed > 0.6 ? live.heading : null;
  function setTracking(on) {
    tracking = on;
    if (locate$) locate$.dataset.state = !live && !watch ? 'off' : on ? 'on' : 'idle';
  }
  function follow$(fly) {
    if (!map || !live || !tracking) return;
    if (trip && trip.nav) return navCamera();
    const o = { center: [live.at[1], live.at[0]], duration: fly ? 1400 : 800 };
    if (fly) Object.assign(o, { zoom: Math.max(map.getZoom(), 16.2), pitch: 55 });
    fly ? map.flyTo(o) : map.easeTo(o);
  }
  // the neighbourhood you're in, from the map's own place names
  function areaName() {
    if (!map || !live) return '';
    try {
      const fs = map.querySourceFeatures('omt', { sourceLayer: 'place' })
        .filter(f => ['neighbourhood', 'quarter', 'suburb', 'town', 'city', 'village'].includes(f.properties.class));
      let best = null;
      for (const f of fs) {
        const [lon, lat] = f.geometry.coordinates, d = km(live.at, [lat, lon]) * ({ neighbourhood: 1, quarter: 1, suburb: 1.6, village: 2, town: 3, city: 4 }[f.properties.class] || 4);
        if (!best || d < best.d) best = { d, f };
      }
      const pr = best && best.f.properties;
      // "The New North - South part": the neighbourhood, without the part of it
      return pr ? (pr['name:en'] || pr.name_en || pr['name:latin'] || pr.name || '').split(/\s+[-–]\s+/)[0] : '';
    } catch { return ''; }
  }
  function onFix(g) {
    if (!root.isConnected) return stopLocate();
    const first = !live;
    live = { at: [g.coords.latitude, g.coords.longitude], acc: g.coords.accuracy || 50, heading: g.coords.heading, speed: g.coords.speed || 0, t: g.timestamp };
    me = { name: 'Near me', at: live.at };
    if (first) { setHere(me); setTracking(true); if (sel$) sel$.value = 'Near me'; }
    drawMe();
    if (trip && trip.nav) return progress();
    if (tracking) follow$(first);
    // the list below the map follows you: redrawn when you've moved a little (and on the first fix)
    if (!trip && !sel && (first || !lastPaintAt || km(lastPaintAt, live.at) > 0.025)) {
      lastPaintAt = live.at;
      const name = areaName();
      if (first || name !== area) { area = name; paint(); } else { const box = sheet.querySelector('.am-live'); if (box) { box.innerHTML = around(); wireSheet(); } }
      if (first && map) map.once('idle', () => { const n = areaName(); if (n && n !== area && !trip && !sel) { area = n; paint(); } });
    }
  }
  function onFixError(e) {
    if (!live) {
      setTracking(false); watch = null; if (locate$) locate$.dataset.state = 'off';
      toast(e && e.code === 1 ? 'Location is off for this site. Allow it in your browser’s settings to see what’s on around you.' : 'Couldn’t find where you are just now.');
    }
  }
  function onCompass(e) {
    const h = e.webkitCompassHeading != null ? e.webkitCompassHeading : e.absolute && e.alpha != null ? 360 - e.alpha : null;
    if (h == null) return;
    compass = h; if (live) drawMe();
  }
  function startLocate() {
    if (!navigator.geolocation) return toast('This browser can’t tell where you are.');
    if (watch == null) {
      if (locate$) locate$.dataset.state = 'wait';
      watch = navigator.geolocation.watchPosition(onFix, onFixError, { enableHighAccuracy: true, maximumAge: 4000, timeout: 20000 });
      // the compass (iPhone asks first, and only from a tap)
      try {
        const D = window.DeviceOrientationEvent;
        if (D && typeof D.requestPermission === 'function') D.requestPermission().then(r => { if (r === 'granted') addEventListener('deviceorientation', onCompass); }).catch(() => {});
        else if (D) addEventListener('deviceorientationabsolute', onCompass);
      } catch {}
    } else { setTracking(true); follow$(true); }
  }
  function stopLocate() {
    if (watch != null) navigator.geolocation.clearWatch(watch);
    watch = null;
    removeEventListener('deviceorientation', onCompass); removeEventListener('deviceorientationabsolute', onCompass);
    releaseWake();
  }
  if (locate$) locate$.onclick = startLocate;
  if (map) map.on('remove', stopLocate);
  // a phone that already allowed this site its location shows you at once
  try { navigator.permissions && navigator.permissions.query({ name: 'geolocation' }).then(r => { if (r.state === 'granted' && !focus) startLocate(); }).catch(() => {}); } catch {}

  function toast(msg) {
    let t = root.querySelector('.am-toast');
    if (!t) { t = document.createElement('p'); t.className = 'am-toast'; t.setAttribute('role', 'status'); root.querySelector('.am-stage').append(t); }
    t.textContent = msg; t.hidden = false;
    clearTimeout(t._h); t._h = setTimeout(() => { t.hidden = true; }, 5200);
  }

  // --- the way there, inside the app -----------------------------------------------------------------------
  async function plan(dest, mode) {
    if (!dest) return;
    if (!live) {                                         // directions start from where you are
      startLocate();
      trip = { dest, mode, route: null, error: '' };
      paint(); window.scrollTo({ top: 0, behavior: 'smooth' });
      const t0 = Date.now();
      await new Promise(ok => { const h = setInterval(() => { if (live || Date.now() - t0 > 20000 || watch == null) { clearInterval(h); ok(); } }, 250); });
      if (!trip || trip.dest !== dest) return;
      if (!live) { trip.error = 'Directions start from where you are: allow this site your location, then try again.'; return paint(); }
    }
    trip = { dest, mode, route: null, error: '' };
    if (map && sel) map.setFeatureState({ source: 'art', id: sel.id }, { sel: false });
    paint();
    const r = await route(live.at, dest.at, mode);
    if (!trip || trip.dest !== dest || trip.mode !== mode) return;
    if (!r) { trip.error = 'Couldn’t find a way there just now. Try again in a moment.'; return paint(); }
    Object.assign(trip, r, { left: r.route.distance });
    drawRoute(); fitRoute(); paint();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  async function route(from, to, mode) {
    // the two points as an encoded polyline (no ';' in the address, which some networks' filters refuse)
    const u = `${ROUTER}/${MODES[mode].path}/route/v1/driving/polyline(${encodeURIComponent(polyline([from, to]))})?overview=full&geometries=geojson&steps=true`;
    try {
      const j = await fetch(u).then(r => r.ok ? r.json() : null);
      const rt = j && j.code === 'Ok' && j.routes[0];
      if (!rt) return null;
      const coords = rt.geometry.coordinates.map(([x, y]) => [y, x]);   // [lat, lon]
      const cum = [0];
      for (let i = 1; i < coords.length; i++) cum.push(cum[i - 1] + km(coords[i - 1], coords[i]) * 1000);
      // where along the line each step starts
      const steps = rt.legs[0].steps;
      let k = 0;
      for (const st of steps) {
        const at = [st.maneuver.location[1], st.maneuver.location[0]];
        let best = k;
        for (let i = k; i < coords.length; i++) if (km(coords[i], at) < km(coords[best], at)) best = i; else if (km(coords[i], at) > 0.3 && i > best + 3) break;
        st.at = cum[best]; k = best;
      }
      return { route: rt, coords, cum, steps, total: cum[cum.length - 1] };
    } catch { return null; }
  }
  function drawRoute() {
    if (!map || !map.getSource('route') || !trip || !trip.route) return;
    const walk = trip.mode !== 'car';
    map.setPaintProperty('route-line', 'line-dasharray', walk ? [0.01, 2] : [1, 0]);
    map.setLayoutProperty('route-line', 'line-cap', 'round');
    map.setPaintProperty('route-case', 'line-opacity', walk ? 0 : 1);
    map.getSource('route').setData({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: trip.coords.map(([a, b]) => [b, a]) } });
  }
  function fitRoute() {
    if (!map || !trip || !trip.coords) return;
    const xs = trip.coords.map(c => c[1]), ys = trip.coords.map(c => c[0]);
    map.fitBounds([[Math.min(...xs), Math.min(...ys)], [Math.max(...xs), Math.max(...ys)]], { padding: { top: 90, bottom: 60, left: 50, right: 50 }, pitch: 40, bearing: 0, duration: 1200, maxZoom: 17 });
  }
  let wake = null;
  const releaseWake = () => { try { wake && wake.release(); } catch {} wake = null; };
  function startNav() {
    if (!trip || !trip.route) return;
    trip.nav = true; trip.off = 0; trip.pos = 0;
    am.classList.add('navigating');
    try { navigator.wakeLock && navigator.wakeLock.request('screen').then(w => { wake = w; }).catch(() => {}); } catch {}
    setTracking(true);
    if (map) setTimeout(() => map.resize(), 350);
    progress(); paint();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  // where you are along the way: the nearest point of the line, never far behind the last one
  function progress() {
    const t = trip;
    if (!t || !t.nav || !live) return;
    let best = { d: Infinity, along: t.pos };
    for (let i = 1; i < t.coords.length; i++) {
      if (t.cum[i] < t.pos - 60) continue;
      const a = t.coords[i - 1], b = t.coords[i], [bx, by] = flat(a, b), [px, py] = flat(a, live.at);
      const L = bx * bx + by * by, u = L ? Math.max(0, Math.min(1, (px * bx + py * by) / L)) : 0;
      const d = Math.hypot(px - u * bx, py - u * by);
      if (d < best.d) best = { d, along: t.cum[i - 1] + u * Math.sqrt(L), i };
      if (t.cum[i - 1] > t.pos + 400 && best.d < 25) break;
    }
    t.pos = Math.max(t.pos, best.along);
    t.left = Math.max(0, t.total - t.pos);
    const dest = km(live.at, t.dest.at) * 1000;
    if (dest < 30 || t.left < 15) return arrive();
    // off the way twice running: find a new one from here
    t.off = best.d > Math.max(35, Math.min(live.acc, 80)) ? t.off + 1 : 0;
    if (t.off >= 2 && !t.rerouting && Date.now() - (t.rerouted || 0) > 8000) {
      t.rerouting = true; t.rerouted = Date.now();
      route(live.at, t.dest.at, t.mode).then(r => {
        if (trip !== t) return;
        t.rerouting = false;
        if (r) { Object.assign(t, r, { pos: 0, off: 0, left: r.route.distance }); drawRoute(); progress(); }
      });
    }
    t.dir = bearingOf(t.coords[Math.max(0, (best.i || 1) - 1)], t.coords[Math.min(t.coords.length - 1, (best.i || 1) + 1)]);
    banner(); navCamera();
    const eta = sheet.querySelector('.am-eta');
    if (eta) { const secs = t.route.duration * (t.left / Math.max(1, t.route.distance)); eta.innerHTML = `<b>${esc(mins(secs))}</b> <span>${esc(metres(t.left))} · arrive ${esc(clock(Date.now() + secs * 1000))}</span>`; }
  }
  function banner() {
    const t = trip;
    if (!nav$) return;
    const next = t.steps.find(st => st.at > t.pos + 5) || t.steps[t.steps.length - 1];
    nav$.hidden = false;
    nav$.innerHTML = `<i>${arrow(next)}</i><span><b>${esc(metres(Math.max(0, next.at - t.pos)))}</b>${say(next, t.dest.name)}</span>`;
  }
  function navCamera() {
    if (!map || !live || !tracking) return;
    const hd = trip.dir != null ? trip.dir : heading() || map.getBearing();
    map.easeTo({ center: [live.at[1], live.at[0]], bearing: hd, pitch: 60, zoom: trip.mode === 'car' ? 16.6 : 17.6, duration: 900,
      padding: { top: Math.round(mapEl.clientHeight * 0.38), bottom: 0, left: 0, right: 0 } });
  }
  function arrive() {
    trip.done = true; trip.nav = false;
    am.classList.remove('navigating'); releaseWake();
    if (nav$) nav$.hidden = true;
    if (map) { map.setPadding({ top: 0, bottom: 0, left: 0, right: 0 }); map.easeTo({ center: [trip.dest.at[1], trip.dest.at[0]], zoom: 17.2, pitch: 62, duration: 1400 }); setTimeout(() => map.resize(), 350); }
    paint();
  }
  function endTrip(back) {
    const dest = trip && trip.dest;
    trip = null;
    am.classList.remove('navigating'); releaseWake();
    if (nav$) nav$.hidden = true;
    if (map) {
      map.setPadding({ top: 0, bottom: 0, left: 0, right: 0 });
      if (map.getSource('route')) map.getSource('route').setData({ type: 'FeatureCollection', features: [] });
      setTimeout(() => map.resize(), 350);
    }
    if (back && dest) { sel = null; choose(dest.id); } else if (back) paint();
  }

  sel$.onchange = () => {
    const go = p => { me = p; setHere(p); choose(null); const c = district(p.at); if (map) map.flyTo({ center: [c[1], c[0]], zoom: 15.1, pitch: 58, duration: 1800 }); };
    if (sel$.value !== 'Near me') { stopLocate(); live = null; setTracking(false); if (meMarker) { meMarker.remove(); meMarker = null; }
      if (map && map.getSource('me-acc')) map.getSource('me-acc').setData({ type: 'FeatureCollection', features: [] });
      return go({ name: sel$.value, at: cities.find(c => c.name === sel$.value).at }); }
    startLocate();
  };
  const tilt = root.querySelector('#amTilt');
  tilt.onclick = () => {
    if (!map) return;
    const flat = map.getPitch() > 10;
    map.easeTo({ pitch: flat ? 0 : 55, bearing: flat ? 0 : -17, duration: 900 });
    tilt.textContent = flat ? '3D' : '2D';
  };
  paint();
}
