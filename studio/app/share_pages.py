"""Share pages: a link to a show or to an artist's page that arrives with its picture and its name.

The app is one page whose addresses live after a "#", and the services that draw a link's preview (WhatsApp, iMessage,
Instagram, Facebook) never read that part: every link to the app looked the same. So for each show and each artist this
writes one tiny page, OUT/s/<slug>/index.html (a show) or OUT/by/<slug>/index.html (an artist), that carries the title, a
line of text and the picture, and sends whoever opens it straight on to the place in the app.

    python share_pages.py APPDIR OUT [--base https://eladamsalem.com/open-studio/]

The shows of data/virtual.json and the demo world are read from APPDIR; the artists' own published shows and the approved
artists come from the database, with the same public queries the app makes. If the database can't be reached, those are
left out this time and nothing fails: the app's share buttons use a share page only when it exists.
"""
import html, json, re, sys, urllib.request
from pathlib import Path

DB = 'https://hlpzqeosdavfuzjgpwhy.supabase.co/rest/v1/'
KEY_RE = re.compile(r"DB_KEY = '([^']+)'")
SLUG_OK = re.compile(r'^[\w-]{1,120}$')

PAGE = '''<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>{title}</title>
<meta property="og:type" content="website">
<meta property="og:site_name" content="Open Studio">
<meta property="og:title" content="{title}">
<meta property="og:description" content="{text}">
<meta property="og:url" content="{url}">
{image}<meta http-equiv="refresh" content="0; url={to}">
<script>location.replace({to_js})</script>
<style>body{{margin:0;min-height:100vh;display:grid;place-items:center;background:#EFE9DD;color:#1d1c1a;font:16px/1.4 -apple-system,"Segoe UI",sans-serif}}a{{color:inherit}}@media(prefers-color-scheme:dark){{body{{background:#171613;color:#eee9df}}}}</style>
</head><body><a href="{to}">{title}</a></body></html>
'''


def q(path, key):
    req = urllib.request.Request(DB + path, headers={'apikey': key})
    with urllib.request.urlopen(req, timeout=15) as r:
        return json.load(r)


def short(s, n=180):
    s = ' '.join(str(s or '').split())
    return s if len(s) <= n else s[:n - 1].rsplit(' ', 1)[0] + '…'


def main():
    app, out = Path(sys.argv[1]), Path(sys.argv[2])
    base = sys.argv[sys.argv.index('--base') + 1] if '--base' in sys.argv else 'https://eladamsalem.com/open-studio/'
    site = base.split('/open-studio/')[0]

    def absolute(src):
        if not src:
            return ''
        if re.match(r'^https?://', src):
            return src
        return site + src if src.startswith('/') else base + src

    def page(folder, slug, title, text, image, to):
        if not SLUG_OK.match(slug or ''):
            return 0
        img = absolute(image)
        tags = f'<meta property="og:image" content="{html.escape(img, True)}">\n<meta name="twitter:card" content="summary_large_image">\n' if img else '<meta name="twitter:card" content="summary">\n'
        d = out / folder / slug
        d.mkdir(parents=True, exist_ok=True)
        (d / 'index.html').write_text(PAGE.format(
            title=html.escape(title, True), text=html.escape(short(text), True), url=html.escape(f'{base}{folder}/{slug}/', True),
            image=tags, to=html.escape(to, True), to_js=json.dumps(to)), encoding='utf-8')
        return 1

    n = 0
    names = {'elad-amsalem': 'Elad Amsalem'}
    world = json.loads((app / 'data/demo/world.json').read_text(encoding='utf-8'))
    for a in world.get('artists', []):
        names[a['slug']] = a['name']

    def by(slugs):
        who = [names.get(s, '') for s in slugs or []]
        who = [w for w in who if w]
        return who[0] if len(who) == 1 else f'{len(who)} artists' if who else ''

    # the shows that live in the app's own files
    for s in json.loads((app / 'data/virtual.json').read_text(encoding='utf-8'))['shows']:
        text = (s.get('text') or [''])[0] or f"An exhibition on Open Studio{' · ' + by(s.get('artists')) if by(s.get('artists')) else ''}"
        n += page('s', s['slug'], f"{s['title']} · Open Studio", text, s.get('cover', ''), f"../../#/exhibition/{s['slug']}")
    for s in world.get('shows', []):
        text = s.get('text') or f"{by(s.get('artists'))} at {s.get('venue', '')}"
        n += page('s', s['slug'], f"{s['title']} · Open Studio", text, (s.get('images') or [''])[0], f"../../#/exhibition/{s['slug']}")
    for a in world.get('artists', []):
        n += page('by', a['slug'], f"{a['name']} · Open Studio", a.get('statement') or f"{a['name']} on Open Studio", a.get('portrait', ''), f"../../#/artist/{a['slug']}")

    # the artists who joined, and the shows they published
    try:
        key = KEY_RE.search((app / 'app.js').read_text(encoding='utf-8')).group(1)
        artists = q('artists?select=id,slug,name,discipline,city,statement,photo,hero&status=eq.approved', key)
        works = q('works?select=id,artist_id,image,thumb,position&order=position', key)
        shows = q('virtual_shows?select=id,slug,title,room,text,works,owner_id&status=eq.published', key)
    except Exception as e:                                  # (no network, or the database is asleep: the static pages still go out)
        print('share pages: the database was not reached, its shows and artists are left out:', e)
        artists, works, shows = [], [], []
    image_of = {w['id']: w.get('image') or w.get('thumb') for w in works}
    first_of = {}
    for w in works:
        first_of.setdefault(w['artist_id'], w.get('image') or w.get('thumb'))
    owner = {a['id']: a for a in artists}
    for a in artists:
        text = a.get('statement') or ' · '.join(x for x in (a.get('discipline'), a.get('city')) if x) or f"{a['name']} on Open Studio"
        n += page('by', a.get('slug') or '', f"{a['name']} · Open Studio", text, a.get('hero') or first_of.get(a['id']) or a.get('photo') or '', f"../../#/artist/{a.get('slug')}")
    for v in shows:
        slug = v.get('slug') or f"show-{v['id'][:8]}"
        hung = next((image_of[w['id']] for w in v.get('works') or [] if isinstance(w, dict) and image_of.get(w.get('id'))), '')
        room = f"data/rooms/{v.get('room')}/view.jpg" if v.get('room') and (app / 'data/rooms' / str(v.get('room')) / 'view.jpg').exists() else ''
        who = (owner.get(v.get('owner_id')) or {}).get('name', '')
        text = v.get('text') or f"An exhibition on Open Studio{', hung by ' + who if who else ''}"
        n += page('s', slug, f"{v.get('title') or 'Untitled'} · Open Studio", text, hung or room, f"../../#/exhibition/{slug}")
    print(f'share pages: {n} written ({len(shows)} published shows and {len(artists)} artists from the database)')


if __name__ == '__main__':
    main()
