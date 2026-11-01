"""Three directions for Open Studio's Home, as phone screens with the app's own content (Sunday 1 November).

    python3 studio/design/home-concepts/build.py      # writes wall.html, catalogue.html, field.html here

What each has, as asked: the artists, shows and works you follow; what you opened last; what's on now
around you. What none has: stories, artist signup, cities, a map.
"""
import colorsys
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
APP = HERE.parent.parent / 'app'
W = json.loads((APP / 'data' / 'demo' / 'world.json').read_text())
A = '../../app/'
M = '../../../media/works/'

# the colour each picture is mostly (measured from the images; see the report)
COL = {'work:low-tide': '#6b9bb5', 'work:orchard-at-noon': '#b6a64c', 'work:breath-i': '#3d4a5c', 'work:slow-colour-i': '#d06f3c',
       'work:together': '#5f8f4f', 'work:indigo-map': '#3b4f8f', 'work:late-pink': '#d98fa0', 'work:signal-01': '#5a3f9a',
       'show:low-tide-haifa': '#5f93b0', 'show:ink-breath': '#2f3a48', 'show:slow-colour': '#c86a3a', 'show:signal-noise': '#4a3a8c',
       'artist:lia-moren': '#b45a6a', 'artist:maya-haddad': '#30343c', 'artist:elad-amsalem': '#7a8f4a', 'ritual': '#8a6a3c'}
try:
    COL.update(json.loads(Path('/tmp/claude-0/colors.json').read_text()))
except Exception:
    pass
works = {w['slug']: w for w in W['works']}
artists = {a['slug']: a for a in W['artists']}


def wimg(slug):
    return A + works[slug]['image']


def vivid(hexc, smin=0.42, lo=0.34, hi=0.6):
    """A colour measured from a picture, kept in its hue but given body: a field of it should read as colour."""
    r, g, b = (int(hexc[i:i + 2], 16) / 255 for i in (1, 3, 5))
    h, l, s = colorsys.rgb_to_hls(r, g, b)
    if s < 0.08:                                         # a grey or a white stays what it is
        return hexc
    r, g, b = colorsys.hls_to_rgb(h, min(hi, max(lo, l)), max(s, smin))
    return '#%02x%02x%02x' % (round(r * 255), round(g * 255), round(b * 255))


def ink_on(hexc):
    r, g, b = (int(hexc[i:i + 2], 16) / 255 for i in (1, 3, 5))
    lum = 0.2126 * r ** 2.2 + 0.7152 * g ** 2.2 + 0.0722 * b ** 2.2
    return '#1B1A17' if lum > 0.32 else '#FFFFFF'


def tint(hexc, k):
    """The colour mixed toward paper (k of the colour)."""
    r, g, b = (int(hexc[i:i + 2], 16) for i in (1, 3, 5))
    p = (246, 241, 231)
    return '#%02x%02x%02x' % tuple(round(c * k + q * (1 - k)) for c, q in zip((r, g, b), p))


def deep(hexc, l=0.32, s=None):
    r, g, b = (int(hexc[i:i + 2], 16) / 255 for i in (1, 3, 5))
    h, _, ss = colorsys.rgb_to_hls(r, g, b)
    r, g, b = colorsys.hls_to_rgb(h, l, min(1, (s if s is not None else ss) ))
    return '#%02x%02x%02x' % (round(r * 255), round(g * 255), round(b * 255))


# --- the same people, shows and works in all three ------------------------------------------------------------------
TOGETHER = {'title': 'Together', 'artist': 'Elad Amsalem', 'year': '2026', 'medium': 'Oil on canvas', 'size': [90, 70], 'image': M + 'img-1196-edit-1791725179214.jpg', 'c': COL.get('work:together', '#5f8f4f')}
FOLLOW_ARTISTS = [
    {'name': 'Lia Morén', 'what': 'Painting · Haifa', 'news': 'Opens Low Tide tonight', 'img': A + artists['lia-moren']['portrait'], 'c': COL['artist:lia-moren']},
    {'name': 'Maya Haddad', 'what': 'Works on paper · Jerusalem', 'news': 'Talk on Tuesday, 18:00', 'img': A + artists['maya-haddad']['portrait'], 'c': '#2B3440'},
    {'name': 'Elad Amsalem', 'what': 'Painting · Hof HaCarmel', 'news': '2 new works', 'img': M + 'img-0502-1780925650921.jpg', 'c': COL['artist:elad-amsalem']},
]
FOLLOW_SHOWS = [
    {'title': 'Low Tide', 'by': 'Lia Morén', 'where': 'Harbour Gallery, Haifa', 'when': 'Opening tonight · 20:00', 'big': 'Tonight', 'live': True, 'img': A + 'data/demo/shows/low-tide-haifa-1.jpg', 'c': COL['work:low-tide']},
    {'title': 'Ink, Breath', 'by': 'Maya Haddad', 'where': 'Musrara Lane Gallery, Jerusalem', 'when': 'Closes Wednesday', 'big': '3', 'unit': 'days left', 'live': True, 'img': A + 'data/demo/shows/ink-breath-1.jpg', 'c': '#2B3440'},
    {'title': 'Slow Colour', 'by': 'Daniel Ostrovsky', 'where': 'Studio 5, Tel Aviv', 'when': 'Opens Tuesday · 19:00', 'big': 'Tue', 'live': False, 'img': A + 'data/demo/shows/slow-colour-1.jpg', 'c': COL.get('work:slow-colour-i', '#d06f3c')},
]
SAVED = [dict(TOGETHER), *[{'title': works[s]['title'], 'artist': artists[works[s]['artist']]['name'], 'year': works[s]['year'], 'medium': works[s]['medium'],
                            'size': works[s]['size'], 'image': wimg(s), 'c': COL.get('work:' + s, '#888888')} for s in ('low-tide', 'breath-i', 'orchard-at-noon', 'late-pink', 'indigo-map')]]
RECENT = [
    {'title': 'Signal / Noise', 'kind': 'Exhibition, online', 'ago': '2 min ago', 'act': 'Back to the fourth work', 'img': A + 'data/demo/works/signal-01.jpg', 'c': COL.get('work:signal-01', '#5a3f9a')},
    {'title': 'Together', 'kind': 'Work · Elad Amsalem', 'ago': '1 hour ago', 'act': 'Look again', 'img': TOGETHER['image'], 'c': TOGETHER['c']},
    {'title': 'Ritual', 'kind': 'A room in 3D', 'ago': 'Yesterday', 'act': 'Walk back in', 'img': M + 'jah-005-1780915457989.jpg', 'c': COL.get('ritual', '#8a6a3c')},
]
# real, from the art map's daily read, around Tel Aviv
NEAR = [
    {'title': 'שנת אפס', 'place': 'Tel Aviv Museum of Art', 'far': '9 min walk', 'when': 'Closes Saturday', 'c': '#2F4FD0'},
    {'title': 'אנדי, מת׳יו ורותי', 'place': 'CCA Tel Aviv', 'far': '1.9 km', 'when': 'Until 13 Dec', 'c': '#E2553B'},
    {'title': 'Chronicles', 'place': 'Braverman Gallery', 'far': '3 km', 'when': 'Closes Thursday', 'c': '#E9A23B'},
    {'title': 'Six new shows', 'place': "Tel Aviv Artists' House", 'far': '2.2 km', 'when': 'Open from Thursday', 'c': '#E2553B'},
]
WEEK = [('Mon', COL.get('work:indigo-map', '#3b4f8f'), 'Indigo Map'), ('Tue', COL.get('work:late-pink', '#d98fa0'), 'Late Pink'), ('Wed', COL.get('show:ink-breath', '#2f3a48'), 'Ink, Breath'),
        ('Thu', COL.get('work:orchard-at-noon', '#b6a64c'), 'Orchard at Noon'), ('Fri', COL.get('work:low-tide', '#6b9bb5'), 'Low Tide'), ('Sat', COL.get('ritual', '#8a6a3c'), 'Ritual'), ('Sun', TOGETHER['c'], 'Together')]

LOGO = '<svg class="mark" viewBox="0 0 132 132" aria-hidden="true"><rect x="8" y="8" width="116" height="116" rx="36" fill="#1F2A44"/><path d="M42 106 V62 a24 24 0 0 1 48 0 V106 Z" fill="#F5C9B8"/></svg>'
TABS = [('Home', '<path d="M3 10.5 12 3l9 7.5V21h-6v-6H9v6H3z"/>'), ('Artists', '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7"/>'),
        ('Shows', '<rect x="3" y="4" width="18" height="14" rx="1"/><path d="M8 21h8M12 18v3"/><path d="m9 8 6 3-6 3z"/>'),
        ('Map', '<path d="M9 4 3 6.5v13.5l6-2.5 6 2.5 6-2.5V4l-6 2.5z"/><path d="M9 4v13.5M15 6.5V20"/>'), ('Search', '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>')]


def page(title, css, body, ground, ink='#1B1A17'):
    tabs = ''.join(f'<a{" class=on" if n == "Home" else ""}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">{p}</svg>{n}</a>' for n, p in TABS)
    return f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>{title}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Figtree:wght@700&family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,400;0,9..144,500;1,9..144,400&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Sans+Hebrew:wght@400;500;600&display=swap" rel="stylesheet">
<style>
*{{box-sizing:border-box;margin:0;padding:0}}
:root{{--ground:{ground};--ink:{ink};--serif:"Fraunces",Georgia,serif;--sans:"IBM Plex Sans","IBM Plex Sans Hebrew",system-ui,sans-serif}}
html,body{{background:var(--ground);color:var(--ink);font:16px/1.45 var(--sans);-webkit-font-smoothing:antialiased}}
body{{max-width:430px;margin:0 auto;padding-bottom:86px}}
img{{display:block;width:100%;height:100%;object-fit:cover}}
a{{color:inherit;text-decoration:none}}
.top{{display:flex;justify-content:space-between;align-items:center;padding:18px 16px 0}}
.brand{{display:flex;align-items:center;gap:9px;font:700 22px/1 "Figtree",var(--sans);letter-spacing:-.01em}}
.brand .mark{{width:28px;height:28px}}
[dir=rtl],.he{{font-family:"IBM Plex Sans Hebrew",var(--sans)}}
.tabs{{position:fixed;bottom:0;left:50%;transform:translateX(-50%);width:min(100%,430px);display:grid;grid-template-columns:repeat(5,1fr);background:var(--ground);padding:8px 0 22px;z-index:5}}
.tabs a{{display:grid;justify-items:center;gap:3px;font-size:11px;color:color-mix(in srgb,var(--ink) 62%,transparent)}}
.tabs a.on{{color:var(--ink);font-weight:600}}.tabs svg{{width:24px;height:24px}}
{css}
</style></head><body>{body}<nav class="tabs">{tabs}</nav></body></html>'''


# --- 1. The wall ---------------------------------------------------------------------------------------------------
def wall():
    c = TOGETHER['c']
    ground = tint(vivid(c), 0.3)
    # the salon hang: what's new from the artists you follow, at their real sizes against each other (one scale for all)
    hang = [TOGETHER, SAVED[1], SAVED[2], SAVED[4], {'title': 'Sunflower', 'artist': 'Elad Amsalem', 'year': '2026', 'size': [65, 60], 'image': M + 'img-0965-1782983816627.jpg'}, SAVED[3]]
    scale = 1.05
    rows = [[hang[3], hang[0], hang[2]], [hang[4], hang[1], hang[5]]]
    def piece(w):
        wd, ht = w['size'][0] * scale, w['size'][1] * scale
        return f'<figure style="width:{wd:.0f}px;height:{ht:.0f}px"><img src="{w["image"]}" alt="{w["title"]}, {w["artist"]}"></figure>'
    salon = ''.join(f'<div class="row">{"".join(piece(w) for w in r)}</div>' for r in rows)
    labels = ''.join(f'''<a class="label"><b>{r["title"]}</b><span>{r["kind"]}</span><span class="ago">{r["ago"]}</span><em>{r["act"]}</em></a>''' for r in RECENT)
    doors = ''.join(f'''<a class="door"><span class="arch"><img src="{s["img"]}" alt=""></span><b>{s["title"]}</b><span>{s["by"]}</span>
      <span class="st{" live" if s["live"] else ""}">{"<i></i>" if s["live"] else ""}{s["when"]}</span></a>''' for s in FOLLOW_SHOWS)
    near = ''.join(f'''<a class="near"><span class="arch-o" style="--k:{n["c"]}"></span><span><b dir="auto">{n["title"]}</b><span>{n["place"]} · {n["far"]}</span></span><span class="st live"><i></i>{n["when"]}</span></a>''' for n in NEAR)
    people = ''.join(f'<a class="who"><span class="face"><img src="{a["img"]}" alt=""></span><b>{a["name"]}</b><span>{a["news"]}</span></a>' for a in FOLLOW_ARTISTS)
    css = f'''
h1{{font:400 40px/1 var(--serif);letter-spacing:-.02em;padding:22px 16px 4px}}
.sub{{padding:0 16px;font-size:15px;color:color-mix(in srgb,var(--ink) 72%,transparent)}}
.salon{{padding:30px 0 10px;display:grid;gap:18px;justify-items:center}}
.salon .row{{display:flex;gap:16px;align-items:center}}
.salon figure{{background:#ddd;box-shadow:0 1px 1px rgba(0,0,0,.18),0 10px 18px -12px rgba(0,0,0,.45)}}
.cap{{margin:14px 16px 0;padding:12px 14px;background:#FFFDF8;display:grid;gap:2px;width:fit-content;max-width:300px;font-size:13px;line-height:1.35}}
.cap b{{font-weight:600}}.cap span{{color:#5E594F}}
h2{{font:400 26px/1.1 var(--serif);letter-spacing:-.01em;padding:40px 16px 14px}}
.labels{{display:flex;gap:10px;overflow-x:auto;padding:0 16px;scrollbar-width:none}}
.label{{flex:0 0 150px;background:#FFFDF8;padding:12px 12px 14px;display:grid;gap:2px;font-size:13px;line-height:1.35;color:#1B1A17}}
.label b{{font:400 19px/1.15 var(--serif)}}.label span{{color:#5E594F}}.label .ago{{font-size:12px}}
.label em{{font-style:normal;font-weight:600;color:{deep(c, .3, .55)};margin-top:8px}}
.doors{{display:flex;gap:14px;overflow-x:auto;padding:0 16px;scrollbar-width:none}}
.door{{flex:0 0 168px;display:grid;gap:3px;font-size:14px}}
.arch{{height:210px;border-radius:84px 84px 0 0;overflow:hidden;margin-bottom:8px;background:#ccc}}
.door b{{font:400 21px/1.1 var(--serif)}}.door span{{color:color-mix(in srgb,var(--ink) 70%,transparent)}}
.st{{display:flex;align-items:center;gap:7px;font-weight:600;font-size:13px}}
.door .st{{color:var(--ink)}}
.st i{{width:7px;height:7px;border-radius:50%;background:#2F6B4F;box-shadow:0 0 0 3px color-mix(in srgb,#2F6B4F 22%,transparent)}}
.people{{display:flex;gap:18px;padding:0 16px;overflow-x:auto}}
.who{{flex:0 0 104px;display:grid;justify-items:start;gap:2px;font-size:13px}}
.face{{width:72px;height:72px;border-radius:50%;overflow:hidden;margin-bottom:8px}}
.who b{{font-weight:600}}.who span{{color:color-mix(in srgb,var(--ink) 70%,transparent);line-height:1.3}}
.nears{{display:grid;gap:4px;padding:0 16px}}
.near{{display:grid;grid-template-columns:30px minmax(0,1fr);gap:4px 12px;align-items:center;padding:10px 0}}
.near>span:nth-child(2){{display:grid;gap:1px}}.near b{{font-weight:600;font-size:16px;text-align:left}}.near span span{{font-size:13px;color:color-mix(in srgb,var(--ink) 70%,transparent)}}
.near .st{{grid-column:2}}
.arch-o{{width:26px;height:34px;border-radius:13px 13px 0 0;background:var(--k);grid-row:span 2}}
'''
    body = f'''<header class="top"><span class="brand">{LOGO}Open Studio</span></header>
<h1>Your wall</h1><p class="sub">New from the artists you follow, hung at their real sizes.</p>
<section class="salon" aria-label="New works">{salon}</section>
<p class="cap"><b>Elad Amsalem, Together, 2026</b><span>Oil on canvas, 90 × 70 cm. New this week. The wall takes its colour from it: it's the last work you looked at.</span></p>
<h2>Where you were</h2><div class="labels">{labels}</div>
<h2>Your shows</h2><div class="doors">{doors}</div>
<h2>Your artists</h2><div class="people">{people}</div>
<h2>Open now around you</h2><div class="nears">{near}</div>'''
    return page('Home: the wall', css, body, ground)


# --- 2. The catalogue ----------------------------------------------------------------------------------------------
def catalogue():
    accent = '#C8432B'
    rec = RECENT[0]
    shows = ''.join(f'''<a class="srow"><span class="fig{" live" if s["live"] else ""}{" word" if not s["big"].isdigit() else ""}">{s["big"]}{f'<small>{s["unit"]}</small>' if s.get("unit") else ""}</span>
      <span class="txt"><b>{s["title"]}</b><span>{s["by"]} · {s["where"]}</span><span class="when">{s["when"]}</span></span><span class="thumb"><img src="{s["img"]}" alt=""></span></a>''' for s in FOLLOW_SHOWS)
    names = ''.join(f'''<a class="name"><span class="sw" style="background:{a["c"]}"></span><span><b>{a["name"]}</b><span>{a["news"]}</span></span></a>''' for a in FOLLOW_ARTISTS)
    shelf = ''.join(f'''<a class="w"><span class="f" style="height:{w["size"][1] * 0.95:.0f}px;width:{w["size"][0] * 0.95:.0f}px"><img src="{w["image"]}" alt=""></span><b>{w["title"]}</b><span>{w["artist"]}</span></a>''' for w in SAVED[:5])
    later = ''.join(f'<a class="more"><span class="t"><img src="{r["img"]}" alt=""></span><span><b>{r["title"]}</b><span>{r["kind"]} · {r["ago"]}</span></span></a>' for r in RECENT[1:])
    near = ''.join(f'''<a class="nrow"><span class="k" style="background:{n["c"]}"></span><span><b dir="auto">{n["title"]}</b><span>{n["place"]} · {n["far"]}</span></span><span class="when">{n["when"]}</span></a>''' for n in NEAR)
    css = f'''
.date{{font-size:14px;color:#5E594F}}
h1{{font:300 46px/.98 var(--serif);letter-spacing:-.03em;padding:26px 16px 0}}
.std{{padding:10px 16px 0;font-size:15px;color:#5E594F}}
.cover{{margin-top:22px;height:430px}}
.lede{{font:400 21px/1.32 var(--serif);padding:16px 16px 0;letter-spacing:-.005em}}
.go{{display:inline-flex;margin:16px 16px 0;padding:12px 18px;background:{accent};color:#fff;font-weight:600;font-size:15px;border-radius:999px}}
.mark2{{display:grid;grid-template-columns:8px 64px minmax(0,1fr);gap:0 14px;align-items:center;margin:38px 16px 0;background:#F1EBDF}}
.mark2:before{{content:"";align-self:stretch;background:{accent}}}
.mark2 .t{{height:64px}}.mark2 b{{font:400 20px/1.15 var(--serif);display:block}}.mark2 span span{{font-size:13px;color:#5E594F}}
.mores{{display:grid;gap:10px;padding:12px 16px 0}}
.more{{display:grid;grid-template-columns:40px minmax(0,1fr);gap:12px;align-items:center;font-size:14px}}
.more .t{{height:40px}}.more b{{font-weight:600;display:block}}.more span span{{color:#5E594F;font-size:13px}}
h2{{font:400 30px/1.05 var(--serif);letter-spacing:-.02em;padding:52px 16px 16px}}
.srow{{display:grid;grid-template-columns:96px minmax(0,1fr) 64px;gap:14px;align-items:center;padding:12px 16px}}
.srow:nth-child(odd){{background:#F1EBDF}}
.fig{{font:300 44px/.9 var(--serif);letter-spacing:-.03em;display:grid}}.fig.word{{font-size:30px}}
.fig small{{font:500 12px/1.2 var(--sans);letter-spacing:0;margin-top:4px}}
.fig.live{{color:{accent}}}
.txt{{display:grid;gap:1px;font-size:13px}}.txt b{{font:400 21px/1.1 var(--serif)}}.txt span{{color:#5E594F}}.txt .when{{color:#1B1A17;font-weight:600}}
.thumb{{height:64px}}
.names{{display:grid;padding:0 16px}}
.name{{display:grid;grid-template-columns:20px minmax(0,1fr);gap:14px;align-items:baseline;padding:8px 0}}
.sw{{width:20px;height:20px;border-radius:50%}}
.name b{{font:400 34px/1.05 var(--serif);letter-spacing:-.02em;display:block}}.name span span{{font-size:14px;color:#5E594F}}
.shelf{{display:flex;gap:18px;align-items:flex-end;overflow-x:auto;padding:0 16px 4px;scrollbar-width:none}}
.w{{flex:none;display:grid;gap:2px;font-size:12px}}.w .f{{display:block;margin-bottom:8px}}.w b{{font-weight:600;font-size:13px}}.w span{{color:#5E594F}}
.nrow{{display:grid;grid-template-columns:10px minmax(0,1fr) auto;gap:14px;align-items:center;padding:12px 16px}}
.nrow:nth-child(odd){{background:#F1EBDF}}
.nrow .k{{width:10px;height:10px;border-radius:50%}}.nrow b{{font-weight:600;display:block;text-align:left}}.nrow span span{{font-size:13px;color:#5E594F}}
.nrow .when{{font-size:13px;font-weight:600;text-align:right}}
.colophon{{padding:44px 16px 20px;font:400 15px/1.4 var(--serif);font-style:italic;color:#5E594F}}
'''
    body = f'''<header class="top"><span class="brand">{LOGO}Open Studio</span><span class="date">Sunday, 1 November</span></header>
<h1>Sunday, for you</h1><p class="std">Edited this morning from the artists, shows and works you follow.</p>
<div class="cover"><img src="{FOLLOW_SHOWS[0]["img"]}" alt="Low Tide, Harbour Gallery"></div>
<p class="lede">Lia Morén opens Low Tide tonight at Harbour Gallery in Haifa: five paintings of the hour the sea goes out. Doors at 20:00.</p>
<a class="go">See the show</a>
<a class="mark2"><span class="t"><img src="{rec["img"]}" alt=""></span><span><b>Continue Signal / Noise</b><span>You stopped at the fourth work · {rec["ago"]}</span></span></a>
<div class="mores">{later}</div>
<h2>Your shows this week</h2>{shows}
<h2>Your artists</h2><div class="names">{names}</div>
<h2>Works you kept</h2><div class="shelf">{shelf}</div>
<h2>On now, a walk from here</h2>{near}
<p class="colophon">Tomorrow's page is made from what you look at today.</p>'''
    return page('Home: the catalogue', css, body, '#FBF8F2')


# --- 3. The colour field -------------------------------------------------------------------------------------------
def field():
    stripes = ''.join(f'''<a class="day{" today" if i == 6 else ""}" style="--c:{vivid(c)}" title="{t}"><span class="bar"></span><span class="d">{d}</span></a>''' for i, (d, c, t) in enumerate(WEEK))
    def block(c, title, line, status, img, h=168, live=False, he=False):
        c = vivid(c)
        fg = ink_on(c)
        return f'''<a class="fld" style="--c:{c};--fg:{fg};height:{h}px"><span class="tx"><b{' dir="auto"' if he else ''}>{title}</b><span>{line}</span>
          {f'<span class="st">{"<i></i>" if live else ""}{status}</span>' if status else ''}</span>{f'<span class="pic"><img src="{img}" alt=""></span>' if img else ''}</a>'''
    r = RECENT
    blocks = [
        ('Pick up where you left off', [block(r[0]['c'], r[0]['title'], f'{r[0]["kind"]} · {r[0]["ago"]}', r[0]['act'], r[0]['img'], 150),
                                        block(r[1]['c'], r[1]['title'], f'{r[1]["kind"]} · {r[1]["ago"]}', r[1]['act'], r[1]['img'], 112),
                                        block(r[2]['c'], r[2]['title'], f'{r[2]["kind"]} · {r[2]["ago"]}', r[2]['act'], r[2]['img'], 112)]),
        ('Your shows', [block(s['c'], s['title'], f'{s["by"]} · {s["where"]}', s['when'], s['img'], 190 if i == 0 else 150, s['live']) for i, s in enumerate(FOLLOW_SHOWS)]),
        ('Your artists', [block(a['c'], a['name'], a['what'], a['news'], a['img'], 144) for a in FOLLOW_ARTISTS]),
        ('Open now around you', [block(n['c'], n['title'], f'{n["place"]} · {n["far"]}', n['when'], None, 108, True, True) for n in NEAR]),
    ]
    secs = ''.join(f'<section><h2>{h}</h2><div class="stack">{"".join(b)}</div></section>' for h, b in blocks)
    css = '''
h1{font:400 34px/1.02 var(--serif);letter-spacing:-.02em;padding:24px 16px 6px}
.lede{padding:0 16px;font-size:15px;color:#5E594F}
.week{display:grid;grid-template-columns:repeat(7,1fr);gap:6px;padding:18px 16px 0;align-items:end}
.day{display:grid;gap:6px;justify-items:center;font-size:12px;color:#5E594F}
.bar{width:100%;height:96px;background:var(--c);border-radius:4px}
.day.today .bar{height:132px}.day.today .d{color:#1B1A17;font-weight:600}
.pal{padding:12px 16px 0;font-size:13px;color:#5E594F}
.pal b{color:#1B1A17;font-weight:600}
h2{font:400 24px/1.1 var(--serif);letter-spacing:-.01em;padding:42px 16px 12px}
.stack{display:grid;gap:4px}
.fld{display:grid;grid-template-columns:minmax(0,1fr) 38%;background:var(--c);color:var(--fg);overflow:hidden}
.fld .tx{display:grid;align-content:space-between;padding:16px;gap:4px}
.fld b{font:400 28px/1.02 var(--serif);letter-spacing:-.015em;text-align:left}
.fld span span{font-size:13px;opacity:.86}
.fld .st{display:flex;align-items:center;gap:7px;font-size:13px;font-weight:600;opacity:1}
.fld .st i{width:7px;height:7px;border-radius:50%;background:var(--fg)}
.fld .pic{height:100%}
.fld:not(:has(.pic)){grid-template-columns:1fr}
'''
    body = f'''<header class="top"><span class="brand">{LOGO}Open Studio</span></header>
<h1>Your week in colour</h1><p class="lede">A stripe a day, in the colour of what you looked at longest.</p>
<div class="week">{stripes}</div>
<p class="pal">Today: <b>Together</b>, by Elad Amsalem</p>
{secs}'''
    return page('Home: the colour field', css, body, '#F6F1E7')


for name, fn in (('wall', wall), ('catalogue', catalogue), ('field', field)):
    (HERE / f'{name}.html').write_text(fn(), encoding='utf-8')
    print('wrote', name)
