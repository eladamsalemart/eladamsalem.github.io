"""Shared pieces of the four control-room mockups (Studio Paper tokens, real data shapes, demo images)."""
W = '../../../app/data/demo/works/'


def img(n): return f'{W}{n}-s.jpg'


ARTISTS = [  # artists rows: name, discipline, city, statement, status, works
    dict(name='Maya Lieberman', disc='Painter', city='Tel Aviv', status='pending', since='לפני יומיים',
         st='Oil on linen, rooms seen through windows: what stays in a house after the people leave.',
         works=['the-blue-room', 'the-open-window', 'bedroom-in-arles', 'the-cup-of-tea', 'in-a-park', 'woman-in-the-garden']),
    dict(name='Yosef Haim', disc='Printmaker', city='Haifa', status='pending', since='לפני 5 ימים',
         st='Woodblock prints of the port, in the evening, by hand.',
         works=['the-great-wave-off-kanagawa', 'sundai-edo', 'steep-street-in-moonlight', 'the-port-at-lorient']),
    dict(name='Liat Ben-Ami', disc='Painter', city='Jerusalem', status='approved', since='לפני שבוע', st='',
         works=['irises', 'sunflowers', 'wheatfield-with-crows']),
    dict(name='Omer Katz', disc='Painter', city='Berlin', status='changes', since='לפני שבועיים', st='',
         works=['the-potato-eaters', 'old-peasant-woman']),
]
NEWWORKS = dict(artist='Liat Ben-Ami', n=6, items=['irises', 'sunflowers', 'wheatfield-with-crows', 'the-starry-night', 'joy-of-life', 'the-bathers'], nosize=[3])
TOUR = dict(title='Rooms Left Behind', artist='Maya Lieberman', meta='4 צילומי הצבה · 2 קבצים לסיור · יש סרטון · לפני 3 ימים')
PEOPLE = [('Dana Shapira', 'חובב/ת אמנות', 'Israel', 'היום'), ('Tom Weiss', 'אמן/ית', 'USA', 'היום'),
          ('Noa Levi', 'חובב/ת אמנות', 'Israel', 'אתמול'), ('Ben Carter', 'חובב/ת אמנות', 'UK', 'לפני יומיים')]
BASE = '''
@import url("https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500&family=Heebo:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap");
:root{--wall:#EFE9DD;--paper:#F6F1E7;--ink:#1B1A17;--muted:#5E594F;--line:#CFC7B6;--card:#E6DFD0;--dot:#2F6B4F;--warn:#9A5B1E;
 --serif:"Fraunces",serif;--sans:"Heebo",sans-serif;--mono:"IBM Plex Mono",monospace}
*{box-sizing:border-box}body{margin:0;background:var(--wall);color:var(--ink);font:400 15px/1.45 var(--sans);direction:rtl}
a{color:inherit;text-decoration:none}h1,h2,h3,p{margin:0;font-weight:400}
.m{color:var(--muted);font-size:13px}.mono{font:500 11px var(--mono);letter-spacing:.1em;text-transform:uppercase;color:var(--muted)}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;border-radius:14px;padding:0 16px;min-height:44px;font:600 14px var(--sans);border:1.5px solid var(--ink);background:transparent;color:var(--ink)}
.btn.f{background:var(--dot);border-color:var(--dot);color:#F6F1E7}.btn.g{border-color:var(--line);font-weight:500}.btn.t{border:0;color:var(--muted);font-weight:500}
.th{display:grid;gap:4px}.th img{width:100%;aspect-ratio:1;object-fit:cover;border-radius:6px;display:block}
.flag{display:inline-block;font:500 10.5px var(--mono);letter-spacing:.06em;text-transform:uppercase;padding:3px 8px;border-radius:99px;background:color-mix(in srgb,var(--warn) 14%,transparent);color:var(--warn)}
.flag.ok{background:color-mix(in srgb,var(--dot) 14%,transparent);color:var(--dot)}
.card{background:var(--paper);border:1px solid var(--line);border-radius:16px;padding:14px;display:grid;gap:10px}
.badge{background:var(--dot);color:#F6F1E7;border-radius:99px;font:600 11px var(--sans);min-width:18px;height:18px;display:inline-grid;place-items:center;padding:0 5px}
.serif{font-family:var(--serif)}
'''


def page(title, css, body):
    return (f'<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
            f'<title>{title}</title><style>{BASE}{css}</style></head><body>{body}</body></html>')


def thumbs(names, cols=4):
    return f'<div class="th" style="grid-template-columns:repeat({cols},1fr)">' + ''.join(f'<img src="{img(n)}" alt="">' for n in names) + '</div>'
