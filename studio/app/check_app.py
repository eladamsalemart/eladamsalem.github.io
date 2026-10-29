"""Checks the app before it is published: what a visitor's phone fetches from other services must really arrive,
and the art map's own data must hold together.

The map once showed only "API KEY REQUIRED" watermarks: the tile service still answered 200 with a valid picture,
just not a map. So the map's tiles are fetched from the address artmap.js uses and looked into: a vector tile over
central Tel Aviv must carry buildings and streets, and the fonts must cover Hebrew. The art places must be in
Israel, of a known kind, each once; the shows must belong to places on the map.

Run: python3 studio/app/check_app.py [path/to/studio/app]     (exits 1 and says why when a check fails)
"""
import gzip
import json
import re
import sys
import urllib.parse
import urllib.request
from pathlib import Path

APP = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).resolve().parent
UA = 'OpenStudio-check/1 (+https://eladamsalem.com/open-studio/)'
TILE = (14, 9774, 6649)          # z, x, y: central Tel Aviv
KINDS = {'museum', 'public', 'artist-run', 'academy', 'commercial', 'centre'}
failed = []


def fail(msg):
    print('FAIL', msg)
    failed.append(msg)


def ok(msg):
    print('ok  ', msg)


def get(url):
    with urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': UA}), timeout=30) as r:
        data = r.read()
    return gzip.decompress(data) if data[:2] == b'\x1f\x8b' else data


def const(src, name):
    m = re.search(r"const " + name + r" = '([^']+)'", src)
    return m.group(1) if m else None


def map_tiles():
    src = (APP / 'artmap.js').read_text(encoding='utf-8')
    tiles, glyphs = const(src, 'TILES'), const(src, 'GLYPHS')
    if not tiles or not glyphs:
        return fail('map: no TILES or GLYPHS address in artmap.js')
    try:
        tj = json.loads(get(tiles))
        url = tj['tiles'][0].replace('{z}', str(TILE[0])).replace('{x}', str(TILE[1])).replace('{y}', str(TILE[2]))
        tile = get(url)
    except Exception as e:
        return fail(f'map: the tiles did not arrive from {tiles} ({e})')
    layers = [l for l in (b'building', b'transportation', b'water') if l in tile]
    if len(tile) < 5000 or len(layers) < 3:
        return fail(f'map: {url} is not a map of the city ({len(tile)} bytes, layers {layers}; a placeholder or an empty tile?)')
    ok(f'map: {url} ({len(tile) // 1024} KB, with buildings, streets and water)')
    for rng, what in (('0-255', 'Latin'), ('1280-1535', 'Hebrew')):
        try:
            g = get(glyphs.replace('{fontstack}', urllib.parse.quote('Noto Sans Regular')).replace('{range}', rng))
        except Exception as e:
            fail(f'map: {what} letters did not arrive ({e})')
            continue
        if len(g) < 1000:
            fail(f'map: {what} letters came back empty')
        else:
            ok(f'map: {what} letters ({len(g) // 1024} KB)')


def vendor():
    for f in ('maplibre-gl.js', 'maplibre-gl.css', 'mapbox-gl-rtl-text.js'):
        p = APP / 'vendor' / 'maplibre' / f
        if not p.exists() or p.stat().st_size < 10000:
            fail(f'map: vendor/maplibre/{f} is missing')
    ok('map: the map library is in place')


def art_data():
    pf = APP / 'data' / 'art' / 'places.json'
    if not pf.exists():
        return fail('art map: data/art/places.json is missing')
    places = json.loads(pf.read_text())['places']
    ids = [p['id'] for p in places]
    bad = [p['id'] for p in places if not (29.4 < p['at'][0] < 33.4 and 34.2 < p['at'][1] < 35.95)]
    kinds = [p['id'] for p in places if p['kind'] not in KINDS]
    rings = [p['id'] for p in places if p.get('building') and len(p['building']['ring']) < 3]
    if len(places) < 40:
        fail(f'art map: only {len(places)} places')
    if len(set(ids)) != len(ids):
        fail('art map: a place is listed twice')
    if bad or kinds or rings:
        fail(f'art map: places outside Israel {bad[:5]}, of no known kind {kinds[:5]}, with a broken building {rings[:5]}')
    ef = APP / 'data' / 'art' / 'exhibitions.json'
    if ef.exists():
        shows = json.loads(ef.read_text())['shows']
        lost = [s['place'] for s in shows if s['place'] not in set(ids)]
        if lost:
            fail(f'art map: shows at places not on the map: {sorted(set(lost))[:5]}')
        else:
            ok(f'art map: {len(shows)} shows, each at a place on the map')
    if not failed:
        ok(f'art map: {len(places)} places, {sum(bool(p.get("building")) for p in places)} with their building')


if __name__ == '__main__':
    map_tiles()
    vendor()
    art_data()
    sys.exit(1 if failed else 0)
