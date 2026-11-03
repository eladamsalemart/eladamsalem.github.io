"""Walkable tours for exhibitions artists give in the app: what they asked for in their studio ("Ask for a tour"),
built and inspected by the same pipeline as Open Studio's own tours, and the answer written back to them.

    SUPABASE_SECRET_KEY=... python -m studio.app.space.artist_tours [--max 2] [--only <exhibition id>]

Every exhibition with installation photos (or a video) is tried, asked for or not: a chance of a tour is never
missed. First the ones artists asked for ('requested'), then those never tried yet (no 'tourTried'), as many as a
run allows. For each (artists.exhibitions[], in Supabase):
  1. it is marked 'building', so the artist sees that it's under way;
  2. its installation photos, the photos and video given only for the tour (the private bucket tour-material), and
     the images of its works with their sizes are downloaded to space/.artist/<slug>/ (never committed);
  3. the pipeline builds the space and inspects it in the app's viewer, as a phone opens it (pipeline/build.py,
     pipeline/inspect.py), exactly as for Open Studio's own tours: no check is loosened for an artist;
  4. if it passed, the exhibition's tour is 'live' with its space (space.slug), and the space is published with the
     others (data/spaces/index.json); if not, the tour is 'more' and tourNote says, in plain words, what to add.
The space's name is a-<the artist's id, 8 characters>-<the exhibition's title>, so it is the artist's own."""
import json, os, re, subprocess, sys, urllib.parse, urllib.request
from datetime import datetime, timezone
from pathlib import Path

APP = Path(__file__).resolve().parents[1]
ROOT = APP.parents[1]
DB = os.environ.get('SUPABASE_URL', 'https://hlpzqeosdavfuzjgpwhy.supabase.co')
KEY = os.environ.get('SUPABASE_SECRET_KEY', '')
HEAD = {'apikey': KEY, 'Authorization': f'Bearer {KEY}'}
WORK = APP / 'space' / '.artist'
SPACES = APP / 'data' / 'spaces'


def call(path, method='GET', body=None, raw=False):
    req = urllib.request.Request(f'{DB}{path}', method=method, data=json.dumps(body).encode() if body is not None else None,
                                 headers={**HEAD, 'Content-Type': 'application/json', 'Prefer': 'return=representation'})
    with urllib.request.urlopen(req, timeout=120) as r:
        data = r.read()
    return data if raw else (json.loads(data) if data else None)


def slugify(t):
    return re.sub(r'[^a-z0-9]+', '-', t.lower()).strip('-')[:40] or 'exhibition'


def set_tour(artist_id, ex_id, **fields):
    """Change one exhibition inside the artist's list, reading the list fresh (the artist may be editing meanwhile)."""
    a = call(f'/rest/v1/artists?id=eq.{artist_id}&select=exhibitions')[0]
    exs = a['exhibitions'] or []
    for e in exs:
        if e.get('id') == ex_id:
            e.update(fields)
    call(f'/rest/v1/artists?id=eq.{artist_id}', 'PATCH', {'exhibitions': exs})


def download(url, dest, private=False):
    dest.parent.mkdir(parents=True, exist_ok=True)
    if private:   # tour-material/<path>: read with the secret key
        url = f'{DB}/storage/v1/object/tour-material/{urllib.parse.quote(url)}'
    req = urllib.request.Request(url, headers=HEAD if private else {'User-Agent': 'OpenStudio/1.0'})
    with urllib.request.urlopen(req, timeout=300) as r:
        dest.write_bytes(r.read())
    return str(dest.relative_to(APP)).replace('\\', '/')


def gather(artist, ex, slug, log=print):
    """Everything the pipeline needs, on disk, and exhibition.json pointing at it (paths inside the app)."""
    d = WORK / slug
    if d.exists():
        import shutil; shutil.rmtree(d)
    photos, video = [], None
    for i, p in enumerate(ex.get('photos') or []):
        src = p.get('src') if isinstance(p, dict) else p
        if src and src.startswith('http'):
            photos.append(download(src, d / 'photos' / f'p{i:02d}{Path(urllib.parse.urlparse(src).path).suffix or ".jpg"}'))
    for i, f in enumerate(ex.get('tourFiles') or []):
        if not f.get('path'): continue
        ext = Path(f['path']).suffix or ('.mp4' if f.get('kind') == 'video' else '.jpg')
        local = download(f['path'], d / ('video' if f.get('kind') == 'video' else 'photos') / f't{i:02d}{ext}', private=True)
        if f.get('kind') == 'video' and not video: video = local
        elif f.get('kind') != 'video': photos.append(local)
    ids = [w for w in ex.get('works') or [] if re.fullmatch(r'[0-9a-f-]{36}', str(w))]
    works = []
    if ids:
        rows = call(f"/rest/v1/works?id=in.({','.join(ids)})&select=id,title,image,width,height")
        for w in sorted(rows, key=lambda r: ids.index(r['id'])):
            if not w.get('image'): continue
            img = download(w['image'], d / 'works' / f"{w['id']}{Path(urllib.parse.urlparse(w['image']).path).suffix or '.jpg'}")
            works.append({'title': w['title'], 'image': img, 'size': f"{w['height']}x{w['width']}" if w.get('width') and w.get('height') else ''})
    spec = {'title': ex.get('title') or 'Exhibition', 'artist': artist['name'], 'photos': photos, 'video': video, 'works': works}
    (d / 'exhibition.json').write_text(json.dumps(spec, indent=1, ensure_ascii=False), encoding='utf-8')
    log(f'{slug}: {len(photos)} photos{", a video" if video else ""}, {len(works)} works')
    return spec


def note_of(slug):
    """What to tell the artist, from the pipeline's own plain-words status (data/spaces/<slug>.status.json)."""
    st = SPACES / f'{slug}.status.json'
    if not st.exists():
        return 'The tour couldn’t be built from what’s here yet. More installation photos (every wall in at least two), or a walk-through video, would help.'
    s = json.load(open(st, encoding='utf-8'))
    items = list(dict.fromkeys(t for level, t in s.get('items', []) if level in ('no', 'warn')))   # each thing once
    return ' '.join([s.get('summary', '')] + [f'• {t}' for t in items]).strip()


def main(argv):
    if not KEY:
        sys.exit('SUPABASE_SECRET_KEY is needed')
    most = int(argv[argv.index('--max') + 1]) if '--max' in argv else 2
    only = argv[argv.index('--only') + 1] if '--only' in argv else None
    artists = call('/rest/v1/artists?select=id,name,exhibitions')
    has = lambda e: bool(e.get('photos')) or any(f.get('kind') == 'video' for f in e.get('tourFiles') or [])
    every = [(a, e) for a in artists for e in (a['exhibitions'] or [])]
    if only:
        todo = [(a, e) for a, e in every if e.get('id') == only]
    else:   # asked for first; then never tried (a tour may well come of what's there)
        todo = [(a, e) for a, e in every if e.get('tour') == 'requested'] +                [(a, e) for a, e in every if e.get('tour') in (None, '', 'none') and not e.get('tourTried') and has(e)]
        todo = todo[:most]
    if not todo:
        print('no tour asked for'); return
    done = []
    for a, ex in todo:
        slug = f"a-{a['id'][:8]}-{slugify(ex.get('title', ''))}"
        asked = ex.get('tour') == 'requested' or bool(only)
        print(f"== {a['name']}: {ex.get('title')} -> {slug} ({'asked for' if asked else 'tried unasked'})", flush=True)
        set_tour(a['id'], ex['id'], tour='building', tourNote='', tourTried=datetime.now(timezone.utc).isoformat())
        try:
            spec = gather(a, ex, slug)
            if not spec['photos'] and not spec['video']:
                set_tour(a['id'], ex['id'], tour='more', tourNote='A tour is built from installation photos or a walk-through video: add some, and it will be tried again.')
                continue
            subprocess.run([sys.executable, '-m', 'studio.app.space.pipeline', slug], cwd=ROOT, check=False, timeout=5400)
            built = SPACES / f'{slug}.json'
            spec_out = json.load(open(built, encoding='utf-8')) if built.exists() else {}
            if spec_out.get('quality') == 'published':
                set_tour(a['id'], ex['id'], tour='live', space={**(ex.get('space') or {}), 'slug': slug}, tourNote='',
                         tourBuilt=datetime.now(timezone.utc).isoformat())
                print(f'{slug}: live'); done.append(slug)
            else:
                lead = '' if asked else 'We tried to build a walkable tour from your installation photos. '
                set_tour(a['id'], ex['id'], tour='more', tourNote=lead + note_of(slug))
                print(f'{slug}: not yet: {note_of(slug)}')
        except Exception as e:
            import traceback; traceback.print_exc()
            set_tour(a['id'], ex['id'], tour='requested' if asked else 'none', tourNote='', tourTried=None)   # put back: tried again next time
            print(f'{slug}: failed ({e}); asked again next time')
    print('published:', ', '.join(done) or 'none')


if __name__ == '__main__':
    main(sys.argv[1:])
