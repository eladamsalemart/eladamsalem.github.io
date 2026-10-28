"""Israel's art places, for the map: which places count, where they are, and the building each one is in.

Run monthly on the server ("Art map: places"), and by hand:
    python3 studio/app/artmap/places.py [--pbf file.osm.pbf]

What counts as an art place is decided in two layers, so the map is not every museum and shop with "art" in it:
  1. seeds.tsv, a curated list from the art world: art museums, the public galleries the Ministry of Culture
     supports (2022 list, via the Artists' Union), artist-run and commercial galleries, art school galleries,
     art centres. A seed is shown only once it is found on the ground (OpenStreetMap, else Nominatim).
  2. OpenStreetMap places tagged as galleries, art museums or art centres inside Israel's boundary that are not
     seeds. They are classified, and kept only when their tags or names say art (a history museum, a framing
     shop or a community centre is left out); they are shown as "listed", below the curated ones.
Every place gets the building it stands in (its outline and height, from OpenStreetMap), for the 3D map.

Month to month: a place that is new is marked new; a place no longer found is kept one more month as
"unconfirmed", then dropped; a seed marked closed is dropped. The changes go to places.changes.md.
"""
import argparse
import datetime as dt
import json
import math
import re
import sys
import time
import unicodedata
import urllib.parse
import urllib.request
from pathlib import Path

HERE = Path(__file__).resolve().parent
APP = HERE.parent
OUT = APP / 'data' / 'art' / 'places.json'
CHANGES = APP / 'data' / 'art' / 'places.changes.md'
PBF_URL = 'https://download.geofabrik.de/asia/israel-and-palestine-latest.osm.pbf'
UA = 'OpenStudio-artmap/1.0 (+https://eladamsalem.com/open-studio/)'
KINDS = ['museum', 'public', 'artist-run', 'academy', 'commercial', 'centre']

# --- names --------------------------------------------------------------------------------------------------
GENERIC = ['גלריה לאמנות', 'גלריה לאומנות', 'גלריית', 'גלריה', 'מוזיאון', 'מוזאון', 'לאמנות', 'לאומנות', 'עכשווית',
           'gallery', 'galerie', 'museum', 'of art', 'art', 'contemporary', 'the ', 'center', 'centre', 'for', 'מרכז']


def norm(s):
    """A name reduced to what tells places apart: no quotes, dashes, niqqud or generic words."""
    s = unicodedata.normalize('NFKC', s or '').lower()
    s = re.sub(r'[֑-ׇ]', '', s)                     # niqqud
    s = re.sub(r'["\'״׳`’‘\-–—,.()/:|]', ' ', s)
    for w in GENERIC:
        s = re.sub(r'(^|\s)' + re.escape(w.strip()) + r'(?=\s|$)', ' ', s)
    return re.sub(r'\s+', ' ', s).strip()


def names_of(tags):
    return [tags[k] for k in ('name', 'name:he', 'name:en', 'alt_name', 'old_name', 'official_name', 'short_name') if tags.get(k)]


# --- geometry -----------------------------------------------------------------------------------------------
def km(a, b):
    la1, lo1, la2, lo2 = map(math.radians, (a[0], a[1], b[0], b[1]))
    h = math.sin((la2 - la1) / 2) ** 2 + math.cos(la1) * math.cos(la2) * math.sin((lo2 - lo1) / 2) ** 2
    return 12742 * math.asin(math.sqrt(h))


def in_ring(lon, lat, ring):
    c = False
    for (x1, y1), (x2, y2) in zip(ring, ring[1:] + ring[:1]):
        if (y1 > lat) != (y2 > lat) and lon < (x2 - x1) * (lat - y1) / (y2 - y1) + x1:
            c = not c
    return c


ISRAEL = json.loads((HERE / 'israel.geojson').read_text())['coordinates']


def in_israel(lat, lon):
    return in_ring(lon, lat, ISRAEL[0]) and not any(in_ring(lon, lat, h) for h in ISRAEL[1:])


def centroid(pts):
    return (sum(p[1] for p in pts) / len(pts), sum(p[0] for p in pts) / len(pts))


def area_m2(ring):
    lat0 = math.radians(ring[0][1])
    xy = [(lo * 111320 * math.cos(lat0), la * 110540) for lo, la in ring]
    return abs(sum(x1 * y2 - x2 * y1 for (x1, y1), (x2, y2) in zip(xy, xy[1:] + xy[:1]))) / 2


# --- the art filter ------------------------------------------------------------------------------------------
ART_WORDS = re.compile(r'אמנות|אומנות|אמנים|אומנים|גלרי|art\b|arts\b|gallery|galerie|קרמיקה|ceramic|הדפס|print|צילום|photograph|sculpt|פיסול|ציור|painting|design|עיצוב|dada', re.I)
NOT_ART = re.compile(r'מסגר|framing|frame|יודאיקה|judaica|souvenir|מזכרות|מתנ"?ס|community|תיאטרון|theat|music|מוזיקה|קונסרבטור|ספרייה|library|'
                     r'school of|בית ספר יסודי|kindergarten|גן ילדים|church|כנסי|synagogue|כנס|מורשת|heritage|history|היסטורי|מלחמ|war|military|צבא|'
                     r'science|מדע|nature|טבע|archae|ארכיאולוג|toy|צעצוע|wax|שעווה|car|רכב|train|רכבת|holocaust|שואה|bible|תנ"?ך', re.I)


def classify(tags):
    """kind and a reason for an OpenStreetMap place that is not a seed; None when it is not an art space."""
    nm = ' '.join(names_of(tags))
    if NOT_ART.search(nm) and not re.search(r'לאמנות|art museum|of art', nm, re.I):
        return None, 'name says not art'
    t, m = tags.get('tourism'), tags.get('museum', '')
    if t == 'museum':
        if m in ('art', 'arts', 'contemporary_art', 'modern_art', 'design') or re.search(r'לאמנות|לאומנות|art|אמנות', nm, re.I):
            return 'museum', 'art museum'
        return None, f'museum ({m or "untyped"}), not art'
    if t == 'gallery' or tags.get('amenity') == 'gallery':
        if tags.get('shop'):
            return None, 'a shop'
        return ('academy' if re.search(r'מדרשה|בצלאל|שנקר|מנשר|אוניברסיט|מכללה|academy|college|universit', nm, re.I) else 'public'), 'gallery'
    if tags.get('amenity') == 'arts_centre':
        if ART_WORDS.search(nm):
            return 'centre', 'art centre'
        return None, 'arts centre without art in its name'
    if tags.get('craft') in ('painter', 'sculptor', 'artist') or tags.get('shop') == 'art':
        return None, 'studio or art shop (shown only if curated)'
    return None, 'other'


# --- reading OpenStreetMap ------------------------------------------------------------------------------------
def read_osm(pbf, seeds):
    """Pass 1: candidate places and any named feature matching a seed. Pass 2: the buildings around them."""
    import osmium

    seed_keys = {}
    for s in seeds:
        for n in [s['he'], s['en'], *s['aliases']]:
            k = norm(n)
            if len(k) >= 2:
                seed_keys.setdefault(k, []).append(s['id'])

    cands = []

    def take(obj, at, kind):
        tags = {t.k: t.v for t in obj.tags}
        if not names_of(tags):
            return
        tagged = (tags.get('tourism') in ('gallery', 'museum') or tags.get('amenity') in ('arts_centre', 'gallery')
                  or tags.get('shop') == 'art' or tags.get('craft') in ('artist', 'painter', 'sculptor'))
        if any(k in tags for k in ('highway', 'railway', 'waterway', 'boundary', 'place', 'landuse', 'natural', 'route', 'public_transport', 'power')):
            return
        named = any(norm(n) in seed_keys for n in names_of(tags)) and any(
            k in tags for k in ('building', 'amenity', 'tourism', 'office', 'club', 'shop', 'craft', 'leisure', 'historic'))
        if (tagged or named) and in_israel(*at):
            cands.append({'osm': f'{kind}/{obj.id}', 'at': at, 'tags': tags, 'tagged': tagged})

    fp = osmium.FileProcessor(str(pbf)).with_locations()
    for o in fp:
        if o.is_node():
            if len(o.tags) and o.location.valid():
                take(o, (o.location.lat, o.location.lon), 'node')
        elif o.is_way():
            if len(o.tags) and ('name' in o.tags) and len(o.nodes) > 2:
                pts = [(n.lon, n.lat) for n in o.nodes if n.location.valid()]
                if pts:
                    take(o, centroid(pts), 'way')
    print(f'osm: {len(cands)} candidates', file=sys.stderr)
    return cands


def read_buildings(pbf, points):
    """Building outlines within ~60 m of the given points: [{ring:[[lon,lat]...], h, levels, osm}]."""
    import osmium
    cell = lambda la, lo: (round(la * 500), round(lo * 500))           # ~200 m cells
    want = set()
    for la, lo in points:
        c = cell(la, lo)
        want.update((c[0] + i, c[1] + j) for i in (-1, 0, 1) for j in (-1, 0, 1))
    out = []
    fp = osmium.FileProcessor(str(pbf), osmium.osm.NODE | osmium.osm.WAY).with_locations()
    for o in fp:
        if o.is_way() and 'building' in o.tags and len(o.nodes) > 3:
            first = o.nodes[0]
            if not first.location.valid() or cell(first.location.lat, first.location.lon) not in want:
                continue
            ring = [[round(n.lon, 7), round(n.lat, 7)] for n in o.nodes if n.location.valid()]
            if len(ring) < 4:
                continue
            tags = {t.k: t.v for t in o.tags}
            out.append({'ring': ring[:-1] if ring[0] == ring[-1] else ring, 'osm': f'way/{o.id}',
                        'h': num(tags.get('height')), 'levels': num(tags.get('building:levels')),
                        'min': num(tags.get('min_height')), 'kind': tags.get('building')})
    print(f'osm: {len(out)} buildings near the places', file=sys.stderr)
    return out


def num(v):
    try:
        return float(re.sub(r'[^0-9.]', '', v or '')) or None
    except ValueError:
        return None


def building_for(at, buildings):
    lat, lon = at
    inside = [b for b in buildings if in_ring(lon, lat, b['ring'])]
    if inside:                                       # the smallest building that contains the point
        return min(inside, key=lambda b: area_m2(b['ring']))
    near = sorted(((km(at, centroid(b['ring'])), b) for b in buildings), key=lambda x: x[0])
    if near and near[0][0] < 0.025 and area_m2(near[0][1]['ring']) < 6000:
        return near[0][1]
    return None


def height_of(b):
    if not b:
        return None
    if b['h']:
        return round(min(b['h'], 80), 1)
    if b['levels']:
        return round(min(b['levels'], 25) * 3.4, 1)
    return None


# --- Nominatim, for curated places OpenStreetMap does not tag ------------------------------------------------
_last = [0.0]


def nominatim(q):
    wait = 1.1 - (time.time() - _last[0])
    if wait > 0:
        time.sleep(wait)
    _last[0] = time.time()
    u = 'https://nominatim.openstreetmap.org/search?' + urllib.parse.urlencode(
        {'q': q, 'format': 'jsonv2', 'countrycodes': 'il', 'limit': 3, 'extratags': 1, 'accept-language': 'he,en'})
    try:
        with urllib.request.urlopen(urllib.request.Request(u, headers={'User-Agent': UA}), timeout=30) as r:
            return json.load(r)
    except Exception as e:
        print('nominatim:', q, e, file=sys.stderr)
        return []


CITY_AT = {}


def city_at(city):
    if not city:
        return None
    if city not in CITY_AT:
        r = nominatim(f'{city}, Israel')
        CITY_AT[city] = (float(r[0]['lat']), float(r[0]['lon'])) if r else None
    return CITY_AT[city]


# --- the run -------------------------------------------------------------------------------------------------
def load_seeds():
    seeds = []
    for line in (HERE / 'seeds.tsv').read_text(encoding='utf-8').splitlines():
        if not line.strip() or line.startswith('#'):
            continue
        kind, he, en, city, aliases, src = (line.split('\t') + [''] * 6)[:6]
        status = 'closed' if src.endswith(':closed') else 'open'
        seeds.append({'id': slug(en or he), 'kind': kind, 'he': he, 'en': en, 'city': city,
                      'aliases': [a for a in aliases.split(';') if a], 'src': src.split(':')[0], 'status': status})
    return seeds


def slug(s):
    s = unicodedata.normalize('NFKD', s).encode('ascii', 'ignore').decode().lower()
    return re.sub(r'[^a-z0-9]+', '-', s).strip('-')


def match_seed(seed, cands):
    keys = {norm(n) for n in [seed['he'], seed['en'], *seed['aliases']] if len(norm(n)) >= 2}
    hits = [c for c in cands if any(norm(n) in keys for n in names_of(c['tags']))]
    if not hits:
        return None
    ref = city_at(seed['city'])
    if ref:
        hits = [c for c in hits if km(c['at'], ref) < 25] or []
    if not hits:
        return None
    return sorted(hits, key=lambda c: (not c['tagged'], km(c['at'], ref) if ref else 0))[0]


def find_seed_nominatim(seed):
    ref = city_at(seed['city'])
    for q in [f"{seed['he']}, {seed['city']}" if seed['city'] else seed['he'], f"{seed['en']}, {seed['city']}, Israel"]:
        for r in nominatim(q):
            at = (float(r['lat']), float(r['lon']))
            if ref and km(at, ref) > 25:
                continue
            if r.get('category') in ('tourism', 'amenity', 'building', 'shop', 'office', 'leisure', 'craft'):
                return {'osm': f"{r['osm_type']}/{r['osm_id']}", 'at': at, 'tags': {'name': r.get('name', '')}, 'tagged': False}
    return None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--pbf', help='an Israel OpenStreetMap extract (downloaded from Geofabrik when missing)')
    ap.add_argument('--no-nominatim', action='store_true')
    a = ap.parse_args()
    pbf = Path(a.pbf or '/tmp/israel-and-palestine-latest.osm.pbf')
    if not pbf.exists():
        print('downloading', PBF_URL, file=sys.stderr)
        urllib.request.urlretrieve(PBF_URL, pbf)

    seeds = load_seeds()
    cands = read_osm(pbf, seeds)
    today = dt.date.today().isoformat()
    places, log, used = [], [], set()

    for s in seeds:
        if s['status'] == 'closed':
            log.append(f"- closed (curated): {s['en']}")
            continue
        c = match_seed(s, cands) or (None if a.no_nominatim else find_seed_nominatim(s))
        if not c:
            log.append(f"- not found on the map: {s['en']} ({s['city']})")
            continue
        used.add(c['osm'])
        places.append({'id': s['id'], 'name': s['en'], 'name_he': s['he'], 'kind': s['kind'], 'tier': 'curated',
                       'city': s['city'] or c['tags'].get('addr:city', ''), 'at': [round(c['at'][0], 6), round(c['at'][1], 6)],
                       'osm': c['osm'], 'website': c['tags'].get('website') or c['tags'].get('contact:website', ''),
                       'address': ' '.join(x for x in [c['tags'].get('addr:street', ''), c['tags'].get('addr:housenumber', '')] if x),
                       'sources': [s['src'], 'osm']})

    left_out = {}
    for c in cands:
        if c['osm'] in used or not c['tagged']:
            continue
        kind, why = classify(c['tags'])
        if not kind:
            left_out[why] = left_out.get(why, 0) + 1
            continue
        t = c['tags']
        if any(km(c['at'], p['at']) < 0.04 and norm(t.get('name', '')) == norm(p['name_he'] or p['name']) for p in places):
            continue
        places.append({'id': slug(t.get('name:en') or t.get('name')) or c['osm'].replace('/', '-'), 'name': t.get('name:en') or t.get('name'),
                       'name_he': t.get('name:he') or (t.get('name') if re.search(r'[֐-׿]', t.get('name', '')) else ''),
                       'kind': kind, 'tier': 'listed', 'city': t.get('addr:city', ''), 'at': [round(c['at'][0], 6), round(c['at'][1], 6)],
                       'osm': c['osm'], 'website': t.get('website') or t.get('contact:website', ''),
                       'address': ' '.join(x for x in [t.get('addr:street', ''), t.get('addr:housenumber', '')] if x), 'sources': ['osm']})

    # ids unique
    seen = {}
    for p in places:
        if p['id'] in seen:
            seen[p['id']] += 1
            p['id'] = f"{p['id']}-{seen[p['id']]}"
        else:
            seen[p['id']] = 1

    buildings = read_buildings(pbf, [tuple(p['at']) for p in places])
    for p in places:
        b = building_for(tuple(p['at']), buildings)
        p['building'] = {'ring': b['ring'], 'h': height_of(b), 'osm': b['osm']} if b else None

    # month to month
    prev = {p['id']: p for p in json.loads(OUT.read_text())['places']} if OUT.exists() else {}
    now = {p['id'] for p in places}
    for p in places:
        old = prev.get(p['id'])
        p['first_seen'] = old['first_seen'] if old else today
        p['status'] = 'open'
    for pid, old in prev.items():
        if pid not in now:
            if old.get('status') == 'unconfirmed':
                log.append(f"- dropped (not found two months running): {old['name']}")
            else:
                old['status'] = 'unconfirmed'
                places.append(old)
                log.append(f"- unconfirmed (not found this month): {old['name']}")
    new = [p['name'] for p in places if p['id'] not in prev]

    places.sort(key=lambda p: (KINDS.index(p['kind']), p['tier'] != 'curated', p['name']))
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps({'updated': today, 'source': 'OpenStreetMap contributors (ODbL); curated list (seeds.tsv)',
                               'places': places}, ensure_ascii=False, separators=(',', ':')))
    by = {k: sum(p['kind'] == k for p in places) for k in KINDS}
    CHANGES.write_text(f"# Art places, {today}\n\n{len(places)} places: " + ', '.join(f'{k} {v}' for k, v in by.items())
                       + f"; curated {sum(p['tier'] == 'curated' for p in places)}, with a building {sum(bool(p.get('building')) for p in places)}\n\n"
                       + ('## New\n' + '\n'.join(f'- {n}' for n in new) + '\n\n' if new and prev else '')
                       + '## Notes\n' + '\n'.join(log) + '\n\n## Left out of OpenStreetMap candidates\n'
                       + '\n'.join(f'- {k}: {v}' for k, v in sorted(left_out.items(), key=lambda x: -x[1])) + '\n', encoding='utf-8')
    print(CHANGES.read_text(encoding='utf-8')[:3000])


if __name__ == '__main__':
    main()
