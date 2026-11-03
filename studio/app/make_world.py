"""The demo world: real artists from art history, whose works are in the public domain, to see the app full.

The artists and their works are real (Wikidata for the facts: title, year, medium, size in cm, collection; Wikimedia
Commons for the images, all public domain). The galleries and shows they appear in are made up. Run from the repo root:
    python studio/app/make_world.py
writes studio/app/data/demo/world.json and the images under studio/app/data/demo/. Dates in world.json are days from
today (the app turns them into dates), so the demo's shows stay on now. The choice of works is kept in world.json;
add --fresh to choose again from Wikidata (the best-known works first)."""
import json, re, shutil, sys, time, urllib.parse, urllib.request
from pathlib import Path

OUT = Path('studio/app/data/demo')
UA = {'User-Agent': 'OpenStudio/1.0 (https://eladamsalem.com/open-studio/; ooopenstudio@gmail.com)'}
EDGE, THUMB = 1600, 480                     # long edge of a work's image, and of its small copy
PER = 6                                     # works per artist

ARTISTS = [  # Wikidata id, and how the app introduces them (in our words)
    ('Q5582', 'vincent-van-gogh', 'Vincent van Gogh', 'Painting', 'Arles', 'France',
     'Painted fields, orchards and night skies in thick, fast strokes, most of them in his last three years, in the south of France.'),
    ('Q5589', 'henri-matisse', 'Henri Matisse', 'Painting', 'Nice', 'France',
     'Made colour do the work of drawing: flat, bright fields that hold a room, a window, a body.'),
    ('Q535', 'victor-hugo', 'Victor Hugo', 'Works on paper', 'Guernsey', 'United Kingdom',
     'The novelist drew in private all his life: storms, castles and dark seas in ink, coffee and soot.'),
    ('Q296', 'claude-monet', 'Claude Monet', 'Painting', 'Giverny', 'France',
     'Painted the same subject at every hour to catch the light as it changed: haystacks, cathedrals, the water lilies of his own pond.'),
    ('Q5586', 'katsushika-hokusai', 'Katsushika Hokusai', 'Prints & painting', 'Edo', 'Japan',
     'Made thousands of prints and paintings over seventy years, among them the wave and the thirty-six views of Mount Fuji.'),
    ('Q105320', 'berthe-morisot', 'Berthe Morisot', 'Painting', 'Paris', 'France',
     'A founder of Impressionism: quick, airy paintings of women, gardens and rooms, close to the people in them.'),
    ('Q173223', 'mary-cassatt', 'Mary Cassatt', 'Painting & prints', 'Paris', 'France',
     'An American in Paris, she painted and printed the everyday life of women and children with an unsentimental eye.'),
    ('Q436267', 'hilma-af-klint', 'Hilma af Klint', 'Painting', 'Stockholm', 'Sweden',
     'Painted abstraction years before it had a name: vast, coded canvases she asked to keep hidden until long after her death.'),
    ('Q156889', 'suzanne-valadon', 'Suzanne Valadon', 'Painting', 'Montmartre', 'France',
     'A painters\' model who became a painter: frank nudes, portraits and still lifes in strong outline and colour.'),
    ('Q234370', 'paula-modersohn-becker', 'Paula Modersohn-Becker', 'Painting', 'Worpswede', 'Germany',
     'Painted women, children and herself with a plainness and weight that were new; the first woman to paint herself nude.'),
]
# titles Wikidata has only in the museum's own language (Nationalmuseum, Stockholm, keeps Hugo's drawings in Swedish)
TITLES = {'Q110750910': 'Medieval Castle', 'Q110763679': 'A Magistrate', 'Q110782790': 'Steep Street in Moonlight',
          'Q110782795': 'Gust of Wind', 'Q110782792': 'Landscape with a Group of Trees', 'Q110782799': 'Imaginary Figure'}
UNITS = {'Q174728': 1, 'Q174789': 0.1, 'Q11573': 100, 'Q218593': 2.54}       # cm, mm, m, inch → cm

# the shows: made-up galleries (the ones the demo has always had), now showing the real artists
SHOWS = [
    dict(slug='orchards-in-bloom', title='Orchards in Bloom', artists=['vincent-van-gogh'], kind='gallery', venue='Harbour Gallery',
         address='Ha-Atsmaut Rd 41, Haifa', city='Haifa', at=[32.8193, 34.999], start=0, end=45, hours='Tue–Sat 11:00–19:00',
         events=[dict(day=0, time='20:00', what='Opening')], text='Van Gogh in the south: the fields, the night and the faces of Arles, in paintings from his last years.'),
    dict(slug='open-window', title='The Open Window', artists=['henri-matisse'], kind='gallery', venue='Rope Street Gallery',
         address='Rope St 7, Jaffa', city='Jaffa', at=[32.0527, 34.7563], start=-12, end=6, hours='Mon–Fri 10:00–18:00, Sat 11:00–14:00',
         events=[dict(day=5, time='19:00', what='Closing night')], text='Matisse and the room: windows, interiors and the people in them, in colour that holds the wall.'),
    dict(slug='hours-of-light', title='Hours of Light', artists=['claude-monet'], kind='gallery', venue='Studio 5',
         address='Levontin St 5, Tel Aviv', city='Tel Aviv', at=[32.0628, 34.774], start=2, end=50, hours='Wed–Sat 12:00–20:00',
         events=[dict(day=2, time='19:00', what='Opening')], text='Monet at every hour: the same places painted again and again as the light moves over them.'),
    dict(slug='ink-and-storm', title='Ink and Storm', artists=['victor-hugo', 'katsushika-hokusai'], kind='gallery', venue='Musrara Lane Gallery',
         address='Ha-Neviim St 60, Jerusalem', city='Jerusalem', at=[31.7838, 35.2265], start=-26, end=3, hours='Sun–Thu 10:00–18:00, Fri 10:00–13:00',
         events=[dict(day=2, time='18:00', what='Talk')], text='Two masters of the wave and the dark sky: Victor Hugo\'s private drawings beside Hokusai\'s prints.'),
    dict(slug='women-at-home', title='Women at Home', artists=['berthe-morisot', 'mary-cassatt'], kind='gallery', venue='Courtyard Hall',
         address='Rothschild Blvd 70, Tel Aviv', city='Tel Aviv', at=[32.0663, 34.7748], start=6, end=40, hours='Tue–Sat 11:00–19:00',
         events=[dict(day=6, time='19:30', what='Opening')], text='Two Impressionists, friends in Paris, paint the life of women from inside the rooms they lived in.'),
    dict(slug='paintings-for-the-future', title='Paintings for the Future', artists=['hilma-af-klint'], kind='online', venue='Online',
         city='', at=None, start=-4, end=60, hours='Open all the time', events=[dict(day=1, time='21:00', what='Online talk')],
         text='Hilma af Klint\'s abstract paintings, made for a public she believed would come long after her. Only online.'),
    dict(slug='seen-from-within', title='Seen from Within', artists=['suzanne-valadon', 'paula-modersohn-becker', 'berthe-morisot', 'mary-cassatt'],
         kind='online', venue='Online', city='', at=None, start=-2, end=30, hours='Open all the time', events=[], curator='Open Studio',
         text='A concept exhibition: four women painters who looked at bodies, children and themselves without the usual flattery. Curated on Open Studio.'),
    dict(slug='a-model-paints', title='A Model Paints', artists=['suzanne-valadon'], kind='gallery', venue='Salt Room',
         address='Yefet St 30, Jaffa', city='Jaffa', at=[32.05, 34.7537], start=-420, end=-380, hours='', events=[],
         text='Suzanne Valadon, who sat for Renoir and Toulouse-Lautrec, and painted her own way.'),
    dict(slug='worpswede', title='Worpswede', artists=['paula-modersohn-becker'], kind='gallery', venue='Harbour Gallery',
         address='Ha-Atsmaut Rd 41, Haifa', city='Haifa', at=[32.8193, 34.999], start=-560, end=-515, hours='', events=[],
         text='Paintings from the artists\' village on the moor, where Paula Modersohn-Becker found her plain, heavy forms.'),
]


def get(url, tries=4):
    for i in range(tries):
        try:
            return urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=90).read()
        except Exception as e:
            if i == tries - 1: raise
            time.sleep(3 * (i + 1))


def sparql(q):
    return json.loads(get('https://query.wikidata.org/sparql?format=json&query=' + urllib.parse.quote(q)))['results']['bindings']


def candidates(qid):
    """An artist's works that have an image and a measured size, best known first."""
    rows = sparql(f"""SELECT ?w ?wLabel ?img ?h ?hu ?x ?xu ?inc ?matLabel ?col ?colLabel ?links WHERE {{
      ?w wdt:P170 wd:{qid}; wdt:P18 ?img; wikibase:sitelinks ?links; rdfs:label ?wLabel;
         p:P2048/psv:P2048 [ wikibase:quantityAmount ?h; wikibase:quantityUnit ?hu ];
         p:P2049/psv:P2049 [ wikibase:quantityAmount ?x; wikibase:quantityUnit ?xu ].
      FILTER(lang(?wLabel) = "en")
      OPTIONAL {{ ?w wdt:P571 ?inc }}
      OPTIONAL {{ ?w wdt:P186 ?mat. ?mat rdfs:label ?matLabel FILTER(lang(?matLabel) = "en") }}
      OPTIONAL {{ ?w wdt:P195 ?col. OPTIONAL {{ ?col rdfs:label ?colLabel FILTER(lang(?colLabel) = "en") }} }}
    }} ORDER BY DESC(?links) LIMIT 400""")
    seen, out = set(), []
    for r in rows:
        wid = r['w']['value'].rsplit('/', 1)[-1]
        if wid in seen: continue
        hu, xu = r['hu']['value'].rsplit('/', 1)[-1], r['xu']['value'].rsplit('/', 1)[-1]
        if hu not in UNITS or xu not in UNITS: continue
        title = TITLES.get(wid) or r['wLabel']['value'].replace('_', ' ').replace('Selfportrait', 'Self-portrait').strip()
        # a series or a group of paintings is not one work
        if title == wid or re.search(r'^untitled|\bseries\b|\bpaintings\b|\bversions?\b', title, re.I): continue
        h, w = float(r['h']['value']) * UNITS[hu], float(r['x']['value']) * UNITS[xu]
        if not (8 <= h <= 600 and 8 <= w <= 600): continue
        seen.add(wid)
        mats = sorted({x['matLabel']['value'].lower() for x in rows if x['w']['value'] == r['w']['value'] and 'matLabel' in x})
        col = r.get('col', {}).get('value', '').rsplit('/', 1)[-1]
        out.append(dict(wikidata=wid, title=title, h=round(h, 1), w=round(w, 1),
                        year=(r.get('inc', {}).get('value', '') or '')[:4].lstrip('+'),
                        medium=medium(mats, qid), collection='Private collection' if col == 'Q768717' else r.get('colLabel', {}).get('value', ''),
                        file=urllib.parse.unquote(r['img']['value'].rsplit('/', 1)[-1])))
    return out


def medium(m, qid):
    """Wikidata's materials, as a label says them: 'Oil on canvas', 'Pastel on paper'."""
    m = set(m)
    if qid == 'Q5586' and ('paper' in m or 'prussian blue' in m or 'wood' in m): return 'Woodblock print'
    paint = next((p for p in ('oil paint', 'tempera', 'pastel', 'watercolor paint', 'ink', 'gouache', 'graphite', 'charcoal') if p in m), '')
    names = {'oil paint': 'Oil', 'watercolor paint': 'Watercolour'}
    support = next((s for s in ('canvas', 'paper', 'cardboard', 'panel', 'wood', 'oak panel') if s in m), '')
    if paint == 'oil paint' and 'tempera' in m: return f'Oil and tempera on {support or "canvas"}'
    if paint: return f'{names.get(paint, paint.capitalize())} on {"panel" if support in ("wood", "oak panel") else support}' if support else names.get(paint, paint.capitalize())
    if 'tempera' in m: return f'Tempera on {support}' if support else 'Tempera'
    return f'On {support}' if support else ''


def big_enough(file, edge=1400):
    """The image Commons has is large enough to show a work well."""
    d = json.loads(get('https://commons.wikimedia.org/w/api.php?format=json&action=query&prop=imageinfo&iiprop=size&titles=' + urllib.parse.quote('File:' + file)))
    info = next(iter(d['query']['pages'].values())).get('imageinfo', [{}])[0]
    return max(info.get('width', 0), info.get('height', 0)) >= edge


def slugify(s):
    import re, unicodedata
    s = unicodedata.normalize('NFKD', s).encode('ascii', 'ignore').decode().lower()
    return re.sub(r'[^a-z0-9]+', '-', s).strip('-')[:48] or 'work'


def image(file, w_cm, h_cm, dest, edge):
    """A Commons file at a given long edge (Commons scales it), kept as a JPEG."""
    width = edge if w_cm >= h_cm else max(64, round(edge * w_cm / h_cm))
    data = get(f'https://commons.wikimedia.org/wiki/Special:FilePath/{urllib.parse.quote(file)}?width={width}')
    dest.write_bytes(data)


def portrait(qid, slug):
    rows = sparql(f'SELECT ?img WHERE {{ wd:{qid} wdt:P18 ?img }} LIMIT 1')
    if not rows: return ''
    file = urllib.parse.unquote(rows[0]['img']['value'].rsplit('/', 1)[-1])
    (OUT / 'people').mkdir(parents=True, exist_ok=True)
    (OUT / 'people' / f'{slug}.jpg').write_bytes(get(f'https://commons.wikimedia.org/wiki/Special:FilePath/{urllib.parse.quote(file)}?width=600'))
    return f'data/demo/people/{slug}.jpg', file


def main():
    old = OUT / 'world.json'
    prev = json.loads(old.read_text(encoding='utf-8')) if old.exists() and '--fresh' not in sys.argv else {}
    kept = {w['wikidata']: w for w in prev.get('works', []) if w.get('wikidata')}
    if '--fresh' in sys.argv: shutil.rmtree(OUT / 'works', ignore_errors=True)
    (OUT / 'works').mkdir(parents=True, exist_ok=True)
    artists, works, thumbs, used = [], [], {}, set()
    for qid, slug, name, discipline, city, country, about in ARTISTS:
        p = portrait(qid, slug)
        artists.append(dict(slug=slug, name=name, discipline=discipline, city=city, country=country, statement=about,
                            portrait=p[0] if p else '', wikidata=qid, portrait_source=f'https://commons.wikimedia.org/wiki/File:{p[1]}' if p else ''))
        mine = [w for w in kept.values() if w['artist'] == slug] or None
        if not mine:
            mine = []
            for c in candidates(qid):
                if not big_enough(c['file'], 1400 if qid != 'Q535' else 900): continue     # (Hugo's drawings are small)
                ws = slugify(c['title'])
                if ws in used: ws = f'{ws}-{c["year"] or c["wikidata"].lower()}'
                if ws in used: continue
                mine.append(dict(slug=ws, artist=slug, title=c['title'], year=c['year'], medium=c['medium'], size=[c['w'], c['h']],
                                 collection=c['collection'], wikidata=c['wikidata'], source=f'https://commons.wikimedia.org/wiki/File:{c["file"]}', file=c['file']))
                used.add(ws)
                if len(mine) == PER: break
        for w in mine:
            w['title'] = TITLES.get(w['wikidata'], w['title'])
            if slug == 'katsushika-hokusai' and not w['medium']: w['medium'] = 'Woodblock print'   # (the Fuji views are all prints)
            w['image'], small = f'data/demo/works/{w["slug"]}.jpg', f'data/demo/works/{w["slug"]}-s.jpg'
            if not (OUT / 'works' / f'{w["slug"]}.jpg').exists():
                image(w['file'], w['size'][0], w['size'][1], OUT / 'works' / f'{w["slug"]}.jpg', EDGE)
                image(w['file'], w['size'][0], w['size'][1], OUT / 'works' / f'{w["slug"]}-s.jpg', THUMB)
            thumbs[w['image']] = small
            works.append(w)
        print(f'{name}: {len(mine)} works', flush=True)
    by = {}
    for w in works: by.setdefault(w['artist'], []).append(w['slug'])
    shows = []
    for s in SHOWS:
        s = dict(s); n = 6 if len(s['artists']) == 1 else 2
        s['works'] = [x for a in s['artists'] for x in by.get(a, [])[:n]]
        s['images'] = [f'data/demo/works/{x}.jpg' for x in s['works'][:2]]
        shows.append(s)
    world = dict(_note='Demo content: real artists from art history, their works in the public domain (facts from Wikidata, images from '
                       'Wikimedia Commons); the galleries and shows are made up. Dates are days from today. Made by studio/app/make_world.py.',
                 artists=artists, works=works, shows=shows, live=[], listings=prev.get('listings', []), places=prev.get('places', {}),
                 venues=prev.get('venues', {}), thumbs=thumbs)
    old.write_text(json.dumps(world, ensure_ascii=False, indent=1), encoding='utf-8')
    print(f'{len(artists)} artists, {len(works)} works, {len(shows)} shows')


if __name__ == '__main__':
    main()
