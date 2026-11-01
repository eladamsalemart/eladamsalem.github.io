"""Ten directions for Open Studio's way in and Home, each as two phone screens with the same content (data.py).

    python3 studio/design/home-ten/build.py     # writes <key>-welcome.html and <key>-home.html here
"""
from pathlib import Path
from data import ARTISTS, SHOWS, WORKS, RECENT, NEAR, TABS, LOGO, ARCH

HERE = Path(__file__).resolve().parent


def page(title, fonts, css, body, tabs=True):
    tb = ''.join(f'<a{" class=on" if n == "Home" else ""}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">{p}</svg><span>{n}</span></a>' for n, p in TABS)
    return f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>{title}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?{fonts}&family=Figtree:wght@700&family=IBM+Plex+Sans+Hebrew:wght@400;500;600&display=swap" rel="stylesheet">
<style>*{{box-sizing:border-box;margin:0;padding:0}}html,body{{-webkit-font-smoothing:antialiased}}body{{max-width:430px;margin:0 auto;min-height:100vh;padding-bottom:84px;overflow-x:hidden}}
img{{display:block;object-fit:cover}}a{{color:inherit;text-decoration:none}}[dir=rtl]{{font-family:"IBM Plex Sans Hebrew",sans-serif}}
.brand{{display:inline-flex;align-items:center;gap:8px;font:700 17px/1 "Figtree",sans-serif;letter-spacing:-.01em}}.brand .mark{{width:24px;height:24px}}
.tabs{{position:fixed;bottom:0;left:50%;transform:translateX(-50%);width:min(100%,430px);display:grid;grid-template-columns:repeat(5,1fr);padding:9px 0 24px;z-index:9}}
.tabs a{{display:grid;justify-items:center;gap:3px;font-size:10.5px}}.tabs svg{{width:23px;height:23px}}
{css}</style></head><body>{body}{'<nav class="tabs">' + tb + '</nav>' if tabs else ''}</body></html>'''


def btns(cls=''):
    return f'''<div class="ways {cls}"><a class="w-email">Continue with email</a><a class="w-g">Google</a><a class="w-a">Apple</a><a class="w-f">Facebook</a></div>'''


D = []   # (key, name, he name, he idea, sentence, inspiration, welcome, home)


# 1 ---------------------------------------------------------------------------------------------------------------
def index():
    f = 'family=Instrument+Serif:ital@0;1&family=Instrument+Sans:wght@400;500;600'
    css = '''body{background:#FAFAF7;color:#141414;font:15px/1.45 "Instrument Sans",sans-serif}
.top{display:flex;justify-content:space-between;align-items:center;padding:18px 18px 0}.top time{font-size:13px;color:#77746D}
h1{font:400 44px/.98 "Instrument Serif",serif;letter-spacing:-.02em;padding:26px 18px 4px}
.sub{padding:0 18px;color:#77746D;font-size:14px}
.ix{padding:22px 18px 0}
.ix h2{font:400 15px "Instrument Sans";color:#77746D;padding:16px 0 6px;border-bottom:1px solid #E4E2DC}
.ix a{display:grid;grid-template-columns:28px minmax(0,1fr) auto;gap:12px;align-items:baseline;padding:11px 0;border-bottom:1px solid #EFEDE8}
.ix img{width:28px;height:28px;align-self:center}
.ix b{font:400 24px/1.05 "Instrument Serif",serif}.ix b sup{font:500 10px "Instrument Sans";color:#C2412D;margin-left:3px;vertical-align:12px}
.ix .m{display:block;font-size:12.5px;color:#77746D;margin-top:2px}
.ix .r{font-size:12.5px;color:#141414;text-align:right;white-space:nowrap}.ix .r.live{color:#C2412D}
.ix .x{font-style:italic;color:#77746D}
.tabs{background:#FAFAF7;color:#9A978F}.tabs a.on{color:#141414}
.wl{min-height:100vh;display:flex;flex-direction:column;padding:18px}
.wl h1{padding:0;margin-top:auto;font-size:58px}.wl p{font-size:16px;color:#55524C;margin:14px 0 28px;max-width:30ch}
.wl .list{border-top:1px solid #141414;margin-bottom:26px}.wl .list span{display:flex;justify-content:space-between;padding:9px 0;border-bottom:1px solid #E4E2DC;font-size:14px}
.wl .list i{font-style:normal;color:#77746D}
.ways{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px}.ways a{text-align:center;padding:13px 0;border:1px solid #141414;font-weight:500;font-size:14px}
.ways .w-email{grid-column:1/-1;background:#141414;color:#FAFAF7}'''
    sh = lambda s: f'<a><img src="{s["work"]}" alt=""><span><b>{s["title"]}{"<sup>LIVE</sup>" if s["live"] else ""}</b><span class="m">{s["by"]} · {s["where"]}</span></span><span class="r{" live" if s["live"] else ""}">{s["short"]}</span></a>'
    home = f'''<header class="top"><span class="brand">{LOGO}Open Studio</span><time>Sun 1 Nov</time></header>
<h1>Index, today</h1><p class="sub">Everything you follow, in one list. Small marks say what moved.</p>
<section class="ix"><h2>Continue</h2>{''.join(f'<a><img src="{r["img"]}" alt=""><span><b>{r["title"]}</b><span class="m">{r["kind"]}</span></span><span class="r">{r["ago"]}</span></a>' for r in RECENT)}
<h2>Shows you follow</h2>{''.join(sh(s) for s in SHOWS)}
<h2>Artists</h2>{''.join(f'<a><img src="{a["img"]}" alt=""><span><b>{a["name"]}</b><span class="m">{a["what"]}, {a["city"]} <span class="x">→ {a["news"]}</span></span></span><span class="r"></span></a>' for a in ARTISTS)}
<h2>Works you kept</h2>{''.join(f'<a><img src="{w["img"]}" alt=""><span><b>{w["title"]}</b><span class="m">{w["artist"]}, {w["year"]} · {w["size"][0]}×{w["size"][1]} cm</span></span><span class="r"></span></a>' for w in WORKS[:3])}
<h2>Open now, a walk away</h2>{''.join(f'<a><span style="width:28px;height:28px;background:{n["c"]};display:block;align-self:center"></span><span><b dir="auto" style="text-align:left;display:block">{n["title"]}</b><span class="m">{n["place"]} · {n["far"]}</span></span><span class="r live">{n["when"]}</span></a>' for n in NEAR)}</section>'''
    wel = f'''<div class="wl"><span class="brand">{LOGO}Open Studio</span><h1>An index of art, on view now.</h1>
<p>Artists, shows and works, in one quiet list that keeps itself up to date.</p>
<div class="list"><span>Shows open in Israel today <i>83</i></span><span>Openings this week <i>14</i></span><span>Artists on Open Studio <i>6</i></span></div>{btns()}</div>'''
    return f, css, wel, home
D.append(('index', 'The index', 'האינדקס', 'הכול כרשימה טיפוגרפית אחת, כמו אינדקס בסוף קטלוג: שם גדול, תמונה זעירה, וסימן קטן שאומר מה זז (LIVE, "3 days left"). אין תמונות גדולות בכלל, והקשרים כתובים כהפניות ("← Opens Low Tide tonight").',
          'The index at the back of a catalogue becomes the whole Home.', 'Are.na, ספרי אינדקס של מוזיאונים, הסגנון השוויצרי', *index()))


# 2 ---------------------------------------------------------------------------------------------------------------
def constellation():
    f = 'family=Fraunces:opsz,wght@9..144,300;9..144,400&family=IBM+Plex+Sans:wght@400;500;600'
    css = '''body{background:#101218;color:#ECE8DF;font:14px/1.45 "IBM Plex Sans",sans-serif}
.top{display:flex;justify-content:space-between;align-items:center;padding:18px}.top span.k{font-size:12px;color:#9A968C}
h1{font:300 34px/1.05 "Fraunces",serif;padding:4px 18px 0}
.sky{position:relative;height:420px;margin-top:6px}.sky svg.lines{position:absolute;inset:0;width:100%;height:100%}
.node{position:absolute;transform:translate(-50%,-50%);display:grid;justify-items:center;gap:5px;text-align:center;width:110px}
.node img{width:var(--s);height:var(--s);border-radius:50%;box-shadow:0 0 0 2px #101218,0 0 0 3px var(--c)}
.node b{font:400 15px/1.1 "Fraunces",serif}.node i{font-style:normal;font-size:11px;color:#9A968C}
.node.live img{box-shadow:0 0 0 2px #101218,0 0 0 3px #F2C14E,0 0 22px #F2C14E66}.node.live i{color:#F2C14E}
.legend{display:flex;gap:14px;padding:0 18px;font-size:11.5px;color:#9A968C}.legend span:before{content:"";display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:6px;background:var(--c)}
h2{font:300 22px "Fraunces",serif;padding:30px 18px 10px}
.row{display:grid;grid-template-columns:36px minmax(0,1fr) auto;gap:12px;align-items:center;padding:9px 18px}
.row img,.row .dot{width:36px;height:36px;border-radius:50%}.row b{font-weight:500;display:block;text-align:left}.row span span{font-size:12px;color:#9A968C}.row .t{font-size:12px;color:#F2C14E}
.tabs{background:#101218;color:#6F6C66}.tabs a.on{color:#ECE8DF}
.wl{min-height:100vh;display:flex;flex-direction:column;padding:18px;background:radial-gradient(circle at 50% 38%,#1B2030,#101218 70%)}
.wl .sky{height:360px}.wl h1{font-size:40px;padding:0;margin-top:auto}.wl p{color:#B5B0A5;margin:12px 0 26px;font-size:15px}
.ways{display:grid;gap:9px}.ways a{text-align:center;padding:14px 0;border-radius:999px;border:1px solid #3A3D48;font-weight:500}
.ways .w-email{background:#ECE8DF;color:#101218;border-color:#ECE8DF}.ways{grid-template-columns:1fr 1fr 1fr}.ways .w-email{grid-column:1/-1}'''
    nodes = [(50, 46, 64, ARTISTS[2], 'Elad Amsalem', 'two new works', False), (20, 22, 52, ARTISTS[0], 'Lia Morén', 'tonight', True),
             (80, 24, 48, ARTISTS[1], 'Maya Haddad', 'talk Tue', False)]
    extra = [(22, 70, 44, SHOWS[0]['img'], 'Low Tide', 'opens 20:00', True, SHOWS[0]['c']), (78, 68, 44, SHOWS[1]['img'], 'Ink, Breath', '3 days left', True, SHOWS[1]['c']),
             (50, 88, 40, RECENT[2]['img'], 'Ritual', 'you, yesterday', False, '#8A6A3C'), (88, 47, 34, WORKS[1]['img'], 'Low Tide', 'kept', False, '#5F93B0')]
    lines = '<svg class="lines" viewBox="0 0 100 100" preserveAspectRatio="none"><g stroke="#ECE8DF" stroke-opacity=".28" stroke-width=".25" fill="none">' + \
            '<path d="M20 22 22 70"/><path d="M80 24 78 68"/><path d="M50 46 50 88"/><path d="M50 46 20 22"/><path d="M50 46 80 24"/><path d="M20 22 88 47"/><path d="M22 70 50 88" stroke-dasharray="1 1"/></g></svg>'
    sky = lines + ''.join(f'<span class="node{" live" if l else ""}" style="left:{x}%;top:{y}%;--s:{s}px;--c:{a["c"]}"><img src="{a["img"]}" alt=""><b>{n}</b><i>{t}</i></span>' for x, y, s, a, n, t, l in nodes) + \
          ''.join(f'<span class="node{" live" if l else ""}" style="left:{x}%;top:{y}%;--s:{s}px;--c:{c}"><img src="{im}" alt=""><b>{n}</b><i>{t}</i></span>' for x, y, s, im, n, t, l, c in extra)
    home = f'''<header class="top"><span class="brand">{LOGO}Open Studio</span><span class="k">Sunday</span></header>
<h1>Your art world, tonight</h1><div class="sky">{sky}</div>
<div class="legend"><span style="--c:#F2C14E">on now</span><span style="--c:#ECE8DF">you follow</span><span style="--c:#8A6A3C">you visited</span></div>
<h2>Within a walk</h2>{''.join(f'<a class="row"><span class="dot" style="background:{n["c"]}"></span><span><b dir="auto">{n["title"]}</b><span>{n["place"]} · {n["far"]}</span></span><span class="t">{n["when"]}</span></a>' for n in NEAR)}
<h2>Pick up</h2>{''.join(f'<a class="row"><img src="{r["img"]}" alt=""><span><b>{r["title"]}</b><span>{r["kind"]}</span></span><span class="t" style="color:#9A968C">{r["ago"]}</span></a>' for r in RECENT)}'''
    wsky = lines + ''.join(f'<span class="node" style="left:{x}%;top:{y}%;--s:{s}px;--c:#ECE8DF"><img src="{im}" alt=""></span>' for x, y, s, im in
                           [(50, 46, 70, WORKS[0]['img']), (20, 22, 50, WORKS[1]['img']), (80, 24, 46, WORKS[2]['img']), (22, 70, 44, WORKS[3]['img']), (78, 68, 44, WORKS[4]['img']), (50, 88, 38, SHOWS[2]['work']), (88, 47, 30, RECENT[0]['img'])])
    wel = f'''<div class="wl"><span class="brand">{LOGO}Open Studio</span><div class="sky">{wsky}</div><h1>Every artist is connected to a show, a room, a city.</h1>
<p>Follow a few, and your own map of the art world draws itself.</p>{btns()}</div>'''
    return f, css, wel, home
D.append(('constellation', 'The constellation', 'קבוצת כוכבים', 'מי שאתה עוקב אחריו מופיע כנקודות מחוברות בקווים דקים: אמן לתערוכה, תערוכה לחדר שביקרת בו. מה שקורה עכשיו זוהר בצהוב. התקשורת בין הדברים היא העיצוב עצמו, והקשרים נראים במבט אחד.',
          'The ties between artists, shows and works become the picture.', 'Are.na (חיבורים), גרפי ידע, שמי לילה ב-Planetarium', *constellation()))


# 3 ---------------------------------------------------------------------------------------------------------------
def contact():
    f = 'family=Libre+Franklin:wght@400;500;600;800&family=Caveat:wght@600'
    css = '''body{background:#F1EFEA;color:#1A1A1A;font:14px/1.4 "Libre Franklin",sans-serif}
.top{display:flex;justify-content:space-between;align-items:center;padding:18px}.top span.k{font:600 18px "Caveat",cursive;color:#D2312A}
h1{font:800 30px/1 "Libre Franklin";letter-spacing:-.03em;padding:0 18px 4px;text-transform:none}
.sub{padding:0 18px 14px;color:#6B6862;font-size:13px}
.sheet{margin:0 12px;background:#161616;padding:14px 10px 10px;border-radius:3px}
.strip{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-bottom:12px}
.fr{position:relative}.fr img{width:100%;aspect-ratio:1;filter:saturate(.95)}
.fr small{display:block;color:#9C9890;font:500 9px "Libre Franklin";margin-top:3px;letter-spacing:.02em}
.fr.mark:after{content:"";position:absolute;inset:-5px -5px 12px -5px;border:2.5px solid #E5342B;border-radius:48% 52% 45% 55%/55% 45% 55% 45%;transform:rotate(-4deg)}
.fr .note{position:absolute;left:2px;bottom:16px;font:600 21px/1 "Caveat",cursive;color:#fff;background:#E5342B;padding:1px 7px 3px;border-radius:3px;white-space:nowrap;z-index:2;transform:rotate(-5deg)}
.cap{display:flex;justify-content:space-between;color:#C9C5BD;font-size:11px;padding:0 2px 10px}
h2{font:800 17px "Libre Franklin";letter-spacing:-.02em;padding:24px 18px 8px}
.near a{display:grid;grid-template-columns:1fr auto;padding:10px 18px;border-top:1px solid #DAD6CE}.near b{font-weight:600;display:block;text-align:left}.near span span{font-size:12px;color:#6B6862}
.near .t{font:600 17px "Caveat",cursive;color:#D2312A}
.tabs{background:#F1EFEA;color:#9C9890}.tabs a.on{color:#1A1A1A}
.wl{min-height:100vh;display:flex;flex-direction:column;padding:18px}.wl .sheet{margin:22px -6px 0}
.wl h1{padding:0;margin-top:auto;font-size:38px}.wl p{color:#55524C;margin:10px 0 24px}
.ways{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px}.ways a{text-align:center;padding:13px 0;background:#E4E1DA;font-weight:600}.ways .w-email{grid-column:1/-1;background:#1A1A1A;color:#F1EFEA}'''
    fr = lambda img, cap, mark='', note='': f'<span class="fr{" mark" if mark else ""}">{f"<span class=note>{note}</span>" if note else ""}<img src="{img}" alt=""><small>{cap}</small></span>'
    home = f'''<header class="top"><span class="brand">{LOGO}Open Studio</span><span class="k">Sun 1.11</span></header>
<h1>Today's sheet</h1><p class="sub">Everything you follow, small and in order. Circled: what changed.</p>
<div class="sheet"><div class="cap"><span>YOUR SHOWS</span><span>3</span></div><div class="strip">{fr(SHOWS[0]["img"], "LOW TIDE", 1, "tonight!")}{fr(SHOWS[1]["img"], "INK, BREATH", 1, "3 days")}{fr(SHOWS[2]["img"], "SLOW COLOUR")}{fr(SHOWS[0]["work"], "LOW TIDE / 2")}</div>
<div class="cap"><span>YOUR ARTISTS · WHAT'S NEW</span><span>5</span></div><div class="strip">{fr(ARTISTS[0]["img"], "LIA MORÉN")}{fr(WORKS[0]["img"], "ELAD · NEW", 1, "new")}{fr(WORKS[4]["img"], "ELAD · NEW", 1)}{fr(ARTISTS[1]["img"], "MAYA HADDAD")}</div>
<div class="cap"><span>WHERE YOU WERE</span><span>3</span></div><div class="strip">{fr(RECENT[0]["img"], "SIGNAL / NOISE")}{fr(RECENT[1]["img"], "TOGETHER")}{fr(RECENT[2]["img"], "RITUAL · 3D")}{fr(WORKS[2]["img"], "KEPT")}</div></div>
<h2>Open now, a walk away</h2><div class="near">{''.join(f'<a><span><b dir="auto">{n["title"]}</b><span>{n["place"]} · {n["far"]}</span></span><span class="t">{n["when"].lower()}</span></a>' for n in NEAR)}</div>'''
    wel = f'''<div class="wl"><span class="brand">{LOGO}Open Studio</span><div class="sheet"><div class="strip">{fr(WORKS[1]["img"], "LOW TIDE")}{fr(WORKS[0]["img"], "TOGETHER", 1, "this one")}{fr(WORKS[2]["img"], "BREATH I")}{fr(WORKS[3]["img"], "ORCHARD")}</div>
<div class="strip">{fr(SHOWS[2]["work"], "SLOW COLOUR")}{fr(RECENT[0]["img"], "SIGNAL 01")}{fr(WORKS[4]["img"], "SUNFLOWER")}{fr(SHOWS[0]["img"], "LOW TIDE, ROOM")}</div></div>
<h1>Art on view now, laid out like a contact sheet.</h1><p>Circle what you love. We'll mark what's new.</p>{btns()}</div>'''
    return f, css, wel, home
D.append(('contact', 'The contact sheet', 'גיליון הקונטקט', 'הכול בתמונות קטנות בפסים, כמו גיליון קונטקט של צלם. מה שהשתנה מסומן בעיגול אדום ובכתב יד ("tonight!", "new"), כאילו אוצר עבר עם עיפרון. התמונות קטנות, והעין של מישהו מכוונת אותך.',
          "A photographer's contact sheet becomes the day's overview.", 'גיליונות קונטקט של Magnum, ארכיונים, מחברות אוצרים', *contact()))


# 4 ---------------------------------------------------------------------------------------------------------------
def labels():
    f = 'family=Libre+Caslon+Text:ital,wght@0,400;0,700;1,400&family=Work+Sans:wght@400;500;600'
    css = '''body{background:#ECEAE4;color:#1D1C1A;font:14px/1.45 "Work Sans",sans-serif}
.top{display:flex;justify-content:space-between;align-items:center;padding:18px}.top span.k{font-size:12px;color:#77736A}
h1{font:400 32px/1.05 "Libre Caslon Text",serif;padding:8px 18px 18px}
.wall{display:grid;gap:12px;padding:0 18px}
.lab{background:#FFFFFF;padding:14px 16px 13px;display:grid;grid-template-columns:minmax(0,1fr) 44px;gap:4px 14px;box-shadow:0 1px 0 rgba(0,0,0,.06)}
.lab b{font:700 15px "Libre Caslon Text",serif}.lab i{font:italic 400 15px "Libre Caslon Text",serif}
.lab .d{grid-column:1;font-size:12.5px;color:#55524B;line-height:1.5}.lab img{grid-row:1/4;grid-column:2;width:44px;height:56px}
.lab .dot{grid-column:1;display:flex;align-items:center;gap:7px;font-size:12px;font-weight:600;margin-top:4px}
.lab .dot:before{content:"";width:9px;height:9px;border-radius:50%;background:var(--d,#1E7A52)}
.lab.small{grid-template-columns:1fr}.lab.small img{display:none}
h2{font:400 20px "Libre Caslon Text",serif;padding:26px 18px 10px}
.tabs{background:#ECEAE4;color:#8F8B82}.tabs a.on{color:#1D1C1A}
.wl{min-height:100vh;display:flex;flex-direction:column;justify-content:center;padding:18px;gap:18px}
.wl .lab{padding:24px 22px;grid-template-columns:1fr}.wl .lab b{font-size:24px}.wl .lab i{font-size:24px}.wl .lab .d{font-size:14px}
.ways{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px}.ways a{text-align:center;padding:13px 0;background:#FFF;font-weight:500}.ways .w-email{grid-column:1/-1;background:#1D1C1A;color:#ECEAE4}'''
    lab = lambda b, i, d, img='', dot='', dc='#1E7A52', cls='': f'<a class="lab {cls}"><span><b>{b}</b><br><i>{i}</i></span>{f"<img src={chr(34)}{img}{chr(34)} alt=>" if img else ""}<span class="d">{d}</span>{f"<span class=dot style=--d:{dc}>{dot}</span>" if dot else ""}</a>'
    home = f'''<header class="top"><span class="brand">{LOGO}Open Studio</span><span class="k">Sunday, 1 November</span></header>
<h1>Your wall labels, today</h1>
<div class="wall">{lab("Lia Morén (b. Haifa)", "Low Tide, 2026", "Harbour Gallery, Haifa<br>Opening tonight, 20:00", SHOWS[0]["work"], "On view from tonight")}
{lab("Maya Haddad (b. Jerusalem)", "Ink, Breath, 2026", "Musrara Lane Gallery<br>Artist talk Tuesday, 18:00", SHOWS[1]["work"], "Last 3 days", "#C2412D")}
{lab("Elad Amsalem (b. 1991)", "Together, 2026", "Oil on canvas, 90 × 70 cm<br>New this week · you looked at it an hour ago", WORKS[0]["img"], "New work", "#2F4FD0")}</div>
<h2>Where you left off</h2><div class="wall">{''.join(lab(r["title"], r["kind"], r["act"] + " · " + r["ago"], r["img"]) for r in RECENT[::2])}</div>
<h2>A walk from here</h2><div class="wall">{''.join(lab(n["place"], f'<span dir=rtl>{n["title"]}</span>', n["far"], "", n["when"], n["c"], "small") for n in NEAR[:2])}</div>'''
    wel = f'''<div class="wl"><span class="brand">{LOGO}Open Studio</span><a class="lab"><span><b>Open Studio, 2026</b><br><i>Art, on view now</i></span>
<span class="d">Shows, studios and works from Israel's artists and galleries, kept up to date every morning. Mixed media: you, a phone, and the real thing.</span><span class="dot">On view</span></a>{btns()}</div>'''
    return f, css, wel, home
D.append(('labels', 'The wall label', 'תווית הקיר', 'כל דבר הוא תווית מוזיאון: אמן, כותרת ושנה, טכניקה ומידות, ונקודה קטנה צבעונית (כמו מדבקת "נמכר" בגלריה) שאומרת מה מצבו. ירוק: מוצג. אדום: ימים אחרונים. כחול: חדש. השפה של הגלריה עצמה, מאוד נקייה ומאוד ברורה.',
          'The museum wall label becomes the unit of the whole app.', 'תוויות של MoMA ו-Tate, מדבקות הנקודה של גלריות', *labels()))


# 5 ---------------------------------------------------------------------------------------------------------------
def chapters():
    f = 'family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,600;12..96,800'
    css = '''body{background:#F4EFE6;color:#151515;font:14px/1.4 "Bricolage Grotesque",sans-serif}
.top{display:flex;justify-content:space-between;align-items:center;padding:18px}
.ch{padding:20px 18px 18px;background:var(--bg);color:var(--fg)}
.ch h2{font:800 30px/.95 "Bricolage Grotesque";letter-spacing:-.03em;margin-bottom:14px}
.ch a{display:grid;grid-template-columns:42px minmax(0,1fr) auto;gap:12px;align-items:center;padding:8px 0;border-top:1px solid color-mix(in srgb,var(--fg) 22%,transparent)}
.ch img,.ch .sq{width:42px;height:42px;border-radius:50%}.ch b{font-weight:600;font-size:16px;display:block;text-align:left}.ch span span{font-size:12.5px;opacity:.8}.ch .t{font-weight:600;font-size:13px}
h1{font:800 46px/.9 "Bricolage Grotesque";letter-spacing:-.04em;padding:6px 18px 20px}
.tabs{background:#151515;color:#8D8A83}.tabs a.on{color:#F4EFE6}
.wl{min-height:100vh;display:grid;grid-template-rows:auto 1fr auto}.bands{display:grid}.bands span{background:var(--c);display:flex;align-items:end;padding:0 18px 8px;font-weight:600;font-size:12.5px;color:var(--t)}
.wl .in{padding:18px}.wl h1{padding:20px 0 6px;font-size:52px}.wl p{margin-bottom:20px;font-size:15px}
.ways{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px}.ways a{text-align:center;padding:14px 0;border-radius:999px;background:#E6DED0;font-weight:600}.ways .w-email{grid-column:1/-1;background:#151515;color:#F4EFE6}'''
    row = lambda img, b, m, t, bg='': f'<a>{f"<img src={chr(34)}{img}{chr(34)} alt=>" if img else f"<span class=sq style=background:{bg}></span>"}<span><b dir="auto">{b}</b><span>{m}</span></span><span class="t">{t}</span></a>'
    home = f'''<header class="top"><span class="brand">{LOGO}Open Studio</span></header><h1>Sunday, in four colours</h1>
<section class="ch" style="--bg:#5F93B0;--fg:#08202C"><h2>Tonight</h2>{row(SHOWS[0]["work"], "Low Tide", "Lia Morén · Harbour Gallery", "20:00")}{row(SHOWS[1]["work"], "Ink, Breath", "Maya Haddad · last days", "Wed")}</section>
<section class="ch" style="--bg:#C86A3A;--fg:#2A0F02"><h2>Your artists</h2>{''.join(row(a["img"], a["name"], a["what"] + ", " + a["city"], a["news"]) for a in ARTISTS)}</section>
<section class="ch" style="--bg:#6E8B3D;--fg:#141F04"><h2>Pick up</h2>{''.join(row(r["img"], r["title"], r["kind"], r["ago"]) for r in RECENT)}</section>
<section class="ch" style="--bg:#2B3440;--fg:#EEF0F3"><h2>A walk away</h2>{''.join(row("", n["title"], n["place"] + " · " + n["far"], n["when"], n["c"]) for n in NEAR)}</section>'''
    bands = ''.join(f'<span style="--c:{c};--t:{"#08202C" if c in ("#5F93B0",) else "#fff"};height:{h}px">{t}</span>' for c, h, t in [('#5F93B0', 120, 'Low Tide, Lia Morén'), ('#C86A3A', 90, 'Slow Colour I, Daniel Ostrovsky'), ('#6E8B3D', 70, 'Together, Elad Amsalem'), ('#2B3440', 56, 'Breath I, Maya Haddad'), ('#B45A6A', 44, 'Late Garden, Lia Morén')])
    wel = f'''<div class="wl"><div class="bands">{bands}</div><div class="in"><span class="brand">{LOGO}Open Studio</span><h1>Art comes in colours.</h1><p>Each band is a work on view in Israel this week.</p>{btns()}</div></div>'''
    return f, css, wel, home
D.append(('chapters', 'Colour chapters', 'פרקי צבע', 'הבית מחולק לפרקים, כל פרק בצבע שטוח שנלקח מעבודה של מי שאתה עוקב אחריו: "Tonight" בכחול של Low Tide, "Your artists" בכתום של Slow Colour. התמונות קטנות ועגולות, והצבע עושה את העבודה. צבעוני מאוד, ונשאר מסודר.',
          "Each section takes its whole colour from a work you follow.", 'פוסטרים של Bauhaus, גלויות של קורייטה קנט, אפליקציות כמו Partiful', *chapters()))


# 6 ---------------------------------------------------------------------------------------------------------------
def margins():
    f = 'family=Cormorant+Garamond:ital,wght@0,400;0,500;1,400&family=Karla:wght@400;500;600&family=Caveat:wght@500'
    css = '''body{background:#FBF9F4;color:#22201C;font:14px/1.45 "Karla",sans-serif}
.top{display:flex;justify-content:space-between;align-items:center;padding:18px}
h1{font:400 38px/1 "Cormorant Garamond",serif;padding:4px 18px 0}h1 i{font-style:italic}
.page{position:relative;padding:8px 18px 0}
.it{display:grid;grid-template-columns:64px minmax(0,1fr);gap:14px;align-items:center;padding:16px 0;position:relative}
.it img{width:64px;height:80px}.it.round img{width:64px;height:64px;border-radius:50%}
.it b{font:500 22px/1.05 "Cormorant Garamond",serif;display:block}.it .m{font-size:12.5px;color:#6E6A61}
.it .hand{font:500 19px/1.05 "Caveat",cursive;color:#B5462F;display:block;margin-top:3px}
svg.ink{position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none;overflow:visible}
h2{font:italic 400 22px "Cormorant Garamond",serif;padding:22px 18px 0;color:#6E6A61}
.near a{display:flex;justify-content:space-between;gap:10px;padding:10px 18px}.near b{font-weight:600;display:block;text-align:left}.near span span{font-size:12px;color:#6E6A61}.near .t{font:500 18px "Caveat",cursive;color:#B5462F;white-space:nowrap}
.tabs{background:#FBF9F4;color:#A39E93}.tabs a.on{color:#22201C}
.wl{min-height:100vh;display:flex;flex-direction:column;padding:18px}.wl svg.big{width:100%;height:330px;margin-top:20px}
.wl h1{padding:0;margin-top:auto;font-size:44px}.wl p{color:#6E6A61;margin:10px 0 24px;font-size:15px}
.ways{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px}.ways a{text-align:center;padding:13px 0;border-bottom:1.5px solid #22201C;font-weight:600}.ways .w-email{grid-column:1/-1;background:#22201C;color:#FBF9F4;border:0;border-radius:2px}'''
    ink = '''<svg class="ink" viewBox="0 0 354 600" preserveAspectRatio="none"><g fill="none" stroke="#B5462F" stroke-width="1.3" stroke-linecap="round">
<path d="M40 104 C 20 150, 22 190, 44 214"/><path d="M38 208 l7 7 3 -9"/><path d="M300 60 C 340 110, 330 260, 300 330" stroke-dasharray="3 4"/></g></svg>'''
    it = lambda img, b, m, hand, cls='': f'<a class="it {cls}"><img src="{img}" alt=""><span><b>{b}</b><span class="m">{m}</span><span class="hand">{hand}</span></span></a>'
    home = f'''<header class="top"><span class="brand">{LOGO}Open Studio</span></header><h1>From the studios, <i>this week</i></h1>
<div class="page">{ink}{it(ARTISTS[0]["img"], "Lia Morén", "Painting, Haifa", "“my tide paintings go up tonight”", "round")}{it(SHOWS[0]["work"], "Low Tide", "Harbour Gallery · opens 20:00", "↑ this is the one")}
{it(ARTISTS[1]["img"], "Maya Haddad", "Works on paper, Jerusalem", "talking about Breath on Tuesday", "round")}{it(WORKS[0]["img"], "Together", "Elad Amsalem, 2026 · new", "you looked at it an hour ago")}</div>
<h2>where you were</h2>{''.join(f'<div class="page">{it(r["img"], r["title"], r["kind"] + " · " + r["ago"], r["act"].lower())}</div>' for r in RECENT[::2])}
<h2>a walk from here</h2><div class="near">{''.join(f'<a><span><b dir="auto">{n["title"]}</b><span>{n["place"]} · {n["far"]}</span></span><span class="t">{n["when"].lower()}</span></a>' for n in NEAR)}</div>'''
    big = '''<svg class="big" viewBox="0 0 354 330"><path d="M30 300 C 60 120, 120 40, 177 40 S 300 120, 324 300" fill="none" stroke="#22201C" stroke-width="2.2" stroke-linecap="round"/>
<path d="M120 300 V 180 a57 57 0 0 1 114 0 V 300" fill="none" stroke="#B5462F" stroke-width="1.6"/><text x="214" y="128" font-family="Caveat" font-size="20" fill="#B5462F">a door into</text><text x="214" y="150" font-family="Caveat" font-size="20" fill="#B5462F">a studio</text></svg>'''
    wel = f'''<div class="wl"><span class="brand">{LOGO}Open Studio</span>{big}<h1>Art, <i>in the artist's own hand.</i></h1><p>Shows, works and the notes behind them, from studios across Israel.</p>{btns()}</div>'''
    return f, css, wel, home
D.append(('margins', "The artist's hand", 'כתב היד של האמן', 'הצד האישי של היוצרים במרכז: ליד כל דבר משפט קצר בכתב יד, כאילו האמן או האוצר כתבו בשוליים ("my tide paintings go up tonight"). קווי דיו דקים מחברים בין אמן לתערוכה שלו. אלגנטי, ספרותי ואינטימי.',
          "The notes in a sketchbook's margins become the way things speak to each other.", 'מחברות סקיצות, ספרי אמן, Apple Journal', *margins()))


# 7 ---------------------------------------------------------------------------------------------------------------
def now():
    f = 'family=Manrope:wght@400;500;600;800&family=JetBrains+Mono:wght@500'
    css = '''body{background:#F5F4F0;color:#121212;font:14px/1.4 "Manrope",sans-serif}
.top{display:flex;justify-content:space-between;align-items:center;padding:18px}.top b{font:800 13px "Manrope"}
h1{font:800 40px/.95 "Manrope";letter-spacing:-.04em;padding:6px 18px 20px}
.day{position:relative;margin:0 18px;padding-left:70px}.day:before{content:"";position:absolute;left:62px;top:0;bottom:0;width:1.5px;background:#D7D4CC}
.ev{position:relative;padding:12px 0 12px 14px}.ev time{position:absolute;left:-70px;top:14px;font:500 11.5px/1.3 "JetBrains Mono",monospace;color:#8A867D;width:52px;text-align:right}
.ev:before{content:"";position:absolute;left:-12px;top:18px;width:9px;height:9px;border-radius:50%;background:#F5F4F0;border:2px solid #121212}
.ev b{font-weight:800;font-size:16px;display:block}.ev span{font-size:12.5px;color:#66625A}.ev img{width:46px;height:46px;float:right;margin-left:10px;border-radius:8px}
.ev.past{opacity:.55}.ev.live:before{background:#E8462E;border-color:#E8462E;box-shadow:0 0 0 5px #E8462E33}
.nowline{position:relative;margin:4px 0 4px -70px;display:flex;align-items:center;gap:8px;font:800 11px "Manrope";color:#E8462E;letter-spacing:.06em}
.nowline:after{content:"";flex:1;height:1.5px;background:#E8462E}
.runs{padding:24px 18px 0}.runs h2{font:800 18px "Manrope";margin-bottom:10px}
.run{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:4px 10px;padding:9px 0}.run b{font-weight:600;text-align:left}.run i{font-style:normal;font-size:12px;color:#66625A}
.bar{grid-column:1/-1;height:6px;background:#E3E0D8;border-radius:3px;overflow:hidden}.bar i{display:block;height:100%;background:var(--c);width:var(--p)}
.tabs{background:#F5F4F0;color:#9A968D}.tabs a.on{color:#121212}
.wl{min-height:100vh;display:flex;flex-direction:column;padding:18px}.clock{font:800 96px/1 "Manrope";letter-spacing:-.05em;margin-top:auto}
.wl h1{padding:0;font-size:34px;margin-top:8px}.wl p{color:#66625A;margin:10px 0 24px}
.ways{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px}.ways a{text-align:center;padding:14px 0;border-radius:12px;background:#E7E5DF;font-weight:600}.ways .w-email{grid-column:1/-1;background:#121212;color:#F5F4F0}'''
    ev = lambda t, b, s, cls='', img='': f'<div class="ev {cls}"><time>{t}</time>{f"<img src={chr(34)}{img}{chr(34)} alt=>" if img else ""}<b>{b}</b><span>{s}</span></div>'
    home = f'''<header class="top"><span class="brand">{LOGO}Open Studio</span><b>Sun 1 Nov · 17:40</b></header><h1>Your day in art</h1>
<div class="day">{ev("12:10", "Ritual", "You walked the room in 3D", "past", RECENT[2]["img"])}{ev("16:35", "Together, Elad Amsalem", "You looked at it · new this week", "past", WORKS[0]["img"])}
<div class="nowline">NOW</div>{ev("18:30", "שנת אפס closes Saturday", "Tel Aviv Museum of Art · 9 min walk · open till 21:00", "live")}
{ev("20:00", "Low Tide opens", "Lia Morén · Harbour Gallery, Haifa", "", SHOWS[0]["work"])}{ev("Tue 18:00", "Maya Haddad talks", "Ink, Breath · Musrara Lane Gallery", "", ARTISTS[1]["img"])}{ev("Tue 19:00", "Slow Colour opens", "Daniel Ostrovsky · Studio 5", "", SHOWS[2]["work"])}</div>
<section class="runs"><h2>How long they run</h2>{''.join(f'<div class="run" style="--c:{c};--p:{p}%"><b dir="auto">{t}</b><i>{w}</i><span class="bar"><i></i></span></div>' for t, w, c, p in [("Ink, Breath", "3 days left", SHOWS[1]["c"], 90), ("שנת אפס", "6 days left", "#2F4FD0", 80), ("Chronicles", "4 days left", "#E9A23B", 86), ("Low Tide", "starts tonight", SHOWS[0]["c"], 2)])}</section>'''
    wel = f'''<div class="wl"><span class="brand">{LOGO}Open Studio</span><div class="clock">20:00</div><h1>Low Tide opens in Haifa tonight.</h1><p>14 openings this week. Open Studio knows what's on today, and when.</p>{btns()}</div>'''
    return f, css, wel, home
D.append(('now', 'The day', 'היום', 'הבית הוא ציר זמן של היום שלך, עם קו "NOW" אדום. מעליו מה שראית (חלש), ומתחתיו מה שקורה הערב ומחר. בתחתית, פסים קטנים שמראים כמה זמן נשאר לכל תערוכה. הכי חי ושימושי, ומשדר "זה קורה עכשיו".',
          "The day's schedule, with a line for now, becomes Home.", "Tate (Dayfinding, פרס iF Gold), לוח הזמנים של Apple Calendar, לוחות רכבת", *now()))


# 8 ---------------------------------------------------------------------------------------------------------------
def details():
    f = 'family=Young+Serif&family=Figtree:wght@400;500;600'
    css = '''body{background:#F7F5F0;color:#1C1B19;font:14px/1.45 "Figtree",sans-serif}
.top{display:flex;justify-content:space-between;align-items:center;padding:18px}
h1{font:400 30px/1.08 "Young Serif",serif;padding:6px 18px 18px}
.dets{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;padding:0 18px}
.det{display:grid;gap:6px}.det span.z{display:block;aspect-ratio:1;border-radius:50%;background-size:520%;background-position:var(--x) var(--y);box-shadow:inset 0 0 0 1px #0001}
.det b{font-weight:600;font-size:13px}.det i{font-style:normal;font-size:11.5px;color:#6D695F;display:block;margin-top:-4px}
h2{font:400 20px "Young Serif",serif;padding:26px 18px 10px}
.row{display:grid;grid-template-columns:48px minmax(0,1fr) auto;gap:12px;align-items:center;padding:8px 18px}
.row span.z{width:48px;height:48px;border-radius:50%;background-size:600%;background-position:var(--x) var(--y)}
.row b{font-weight:600;display:block;text-align:left}.row span span{font-size:12px;color:#6D695F}.row .t{font-size:12px;font-weight:600}
.tabs{background:#F7F5F0;color:#A19D93}.tabs a.on{color:#1C1B19}
.wl{min-height:100vh;display:flex;flex-direction:column;padding:18px}.wl .big{width:100%;aspect-ratio:1;border-radius:50%;margin-top:30px;background-size:340%;background-position:38% 46%}
.wl h1{padding:22px 0 0;font-size:34px;margin-top:auto}.wl p{color:#6D695F;margin:10px 0 24px}
.ways{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px}.ways a{text-align:center;padding:14px 0;border-radius:999px;border:1px solid #1C1B19;font-weight:600}.ways .w-email{grid-column:1/-1;background:#1C1B19;color:#F7F5F0}'''
    z = lambda img, x, y: f'<span class="z" style="background-image:url({img});--x:{x}%;--y:{y}%"></span>'
    home = f'''<header class="top"><span class="brand">{LOGO}Open Studio</span></header><h1>Up close, from the artists you follow</h1>
<div class="dets"><a class="det">{z(SHOWS[0]["work"], 30, 40)}<b>Low Tide</b><i>opens tonight</i></a><a class="det">{z(WORKS[0]["img"], 55, 35)}<b>Together</b><i>new · Elad</i></a><a class="det">{z(SHOWS[1]["work"], 45, 55)}<b>Ink, Breath</b><i>3 days left</i></a>
<a class="det">{z(WORKS[3]["img"], 60, 30)}<b>Orchard</b><i>Lia Morén</i></a><a class="det">{z(WORKS[4]["img"], 50, 50)}<b>Sunflower</b><i>new · Elad</i></a><a class="det">{z(SHOWS[2]["work"], 40, 45)}<b>Slow Colour</b><i>opens Tue</i></a></div>
<h2>Pick up</h2>{''.join(f'<a class="row">{z(r["img"], 45, 45)}<span><b>{r["title"]}</b><span>{r["kind"]}</span></span><span class="t">{r["ago"]}</span></a>' for r in RECENT)}
<h2>Open a walk away</h2>{''.join(f'<a class="row"><span class="z" style="background:{n["c"]}"></span><span><b dir="auto">{n["title"]}</b><span>{n["place"]} · {n["far"]}</span></span><span class="t">{n["when"]}</span></a>' for n in NEAR)}'''
    wel = f'''<div class="wl"><span class="brand">{LOGO}Open Studio</span><span class="big" style="background-image:url({WORKS[0]["img"]})"></span><h1>Come closer.</h1><p>A detail of Together, by Elad Amsalem, oil on canvas. The whole work, its room and its artist are a tap away.</p>{btns()}</div>'''
    return f, css, wel, home
D.append(('details', 'Up close', 'מקרוב', 'במקום תמונה שלמה וגדולה, עיגול קטן של פרט מתוך העבודה: משיכת מכחול, טקסטורה, צבע. זה מסקרן, אינטימי ומרגיש כמו לעמוד קרוב לקנבס. התמונה המלאה מגיעה בלחיצה, וכך התמונות קטנות ומדברות זו עם זו בשפה אחת.',
          'A detail of the painting, not the painting, becomes the picture.', 'צילומי מקרו בקטלוגים, Google Arts & Culture (Gigapixel), Cosmos', *details()))


# 9 ---------------------------------------------------------------------------------------------------------------
def voices():
    f = 'family=Newsreader:ital,opsz,wght@0,6..72,400;1,6..72,400;1,6..72,500&family=Figtree:wght@400;500;600'
    css = '''body{background:#F3F0EA;color:#1B1A17;font:14px/1.45 "Figtree",sans-serif}
.top{display:flex;justify-content:space-between;align-items:center;padding:18px}
.q{padding:18px 18px 22px;border-bottom:1px solid #DDD8CE}
.q p{font:italic 400 25px/1.2 "Newsreader",serif;letter-spacing:-.01em}
.q .by{display:flex;align-items:center;gap:10px;margin-top:14px}.q .by img{width:34px;height:34px;border-radius:50%}
.q .by b{font-weight:600;display:block}.q .by span span{font-size:12px;color:#6E695F}
.q .then{margin-top:12px;display:grid;grid-template-columns:52px minmax(0,1fr);gap:12px;align-items:center;background:#FFFDF8;padding:8px;border-radius:12px}
.q .then img{width:52px;height:52px;border-radius:8px}.q .then b{font-weight:600}.q .then span span{display:block;font-size:12px;color:#B5462F;font-weight:600}
h2{font:italic 500 20px "Newsreader",serif;padding:22px 18px 6px}
.row{display:grid;grid-template-columns:minmax(0,1fr) auto;padding:9px 18px}.row b{font-weight:600;display:block;text-align:left}.row span span{font-size:12px;color:#6E695F}.row .t{font-size:12px;font-weight:600}
.tabs{background:#F3F0EA;color:#9C978D}.tabs a.on{color:#1B1A17}
.wl{min-height:100vh;display:flex;flex-direction:column;padding:18px}.wl .q{border:0;padding:0;margin-top:auto}.wl .q p{font-size:34px}
.wl .lede{color:#6E695F;margin:22px 0 22px}
.ways{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px}.ways a{text-align:center;padding:14px 0;border-radius:999px;background:#E5E0D6;font-weight:600}.ways .w-email{grid-column:1/-1;background:#1B1A17;color:#F3F0EA}'''
    q = lambda a, then_img, then_t, then_s: f'''<article class="q"><p>“{a["says"]}”</p><div class="by"><img src="{a["img"]}" alt=""><span><b>{a["name"]}</b><span>{a["what"]}, {a["city"]}</span></span></div>
<a class="then"><img src="{then_img}" alt=""><span><b>{then_t}</b><span>{then_s}</span></span></a></article>'''
    home = f'''<header class="top"><span class="brand">{LOGO}Open Studio</span></header>
{q(ARTISTS[0], SHOWS[0]["work"], "Low Tide, Harbour Gallery", "Opens tonight, 20:00")}{q(ARTISTS[2], WORKS[0]["img"], "Together, 2026", "New this week · you looked an hour ago")}
{q(ARTISTS[1], SHOWS[1]["work"], "Ink, Breath, Musrara Lane Gallery", "Last 3 days · talk Tuesday 18:00")}
<h2>Pick up</h2>{''.join(f'<a class="row"><span><b>{r["title"]}</b><span>{r["kind"]}</span></span><span class="t">{r["act"]}</span></a>' for r in RECENT)}
<h2>Open a walk away</h2>{''.join(f'<a class="row"><span><b dir="auto">{n["title"]}</b><span>{n["place"]} · {n["far"]}</span></span><span class="t">{n["when"]}</span></a>' for n in NEAR)}'''
    wel = f'''<div class="wl"><span class="brand">{LOGO}Open Studio</span><article class="q"><p>“I paint the hour when a place stops being a view and becomes a feeling.”</p><div class="by"><img src="{ARTISTS[0]["img"]}" alt=""><span><b>Lia Morén</b><span>Painter, Haifa · opens Low Tide tonight</span></span></div></article>
<p class="lede">Hear it from the artists. Then go and see it.</p>{btns()}</div>'''
    return f, css, wel, home
D.append(('voices', 'In their words', 'במילים שלהם', 'האמנים מדברים ראשונים: כל פריט נפתח במשפט של האמן עצמו, בכתב נטוי גדול, ורק אחריו תמונה קטנה ומה קורה ("Opens tonight"). הצד האישי של היוצרים הוא השער לכל דבר. הכי אנושי ופחות "פיד".',
          "The artists' own sentences become the headlines.", 'מגזינים כמו Apartamento ו-The Gentlewoman, ראיונות סטודיו', *voices()))


# 10 --------------------------------------------------------------------------------------------------------------
def plan():
    f = 'family=Familjen+Grotesk:wght@400;500;600;700'
    css = '''body{background:#F4F3EF;color:#151515;font:14px/1.4 "Familjen Grotesk",sans-serif}
.top{display:flex;justify-content:space-between;align-items:center;padding:18px}.top span.k{font-size:12px;color:#7A766E}
h1{font:700 30px/1 "Familjen Grotesk";letter-spacing:-.03em;padding:4px 18px 4px}.sub{padding:0 18px 14px;color:#7A766E;font-size:13px}
.fp{margin:0 18px;position:relative;height:400px;border:2.5px solid #151515;background:#FFFFFE}
.room{position:absolute;border:1.5px solid #151515;padding:8px;display:flex;flex-direction:column;justify-content:space-between;background:#FFFFFE}
.room b{font-weight:700;font-size:14px;line-height:1.1}.room span{font-size:11px;color:#6D695F}
.room .pics{display:flex;gap:5px}.room .pics img{width:44px;height:52px}
.room.live{background:#FFF4E6}.room.live b:after{content:" ●";color:#E1572F;font-size:10px;vertical-align:2px}
.door{position:absolute;background:#FFFFFE;height:3px;width:20px}.door.v{width:3px;height:20px}
.legend{display:flex;justify-content:space-between;padding:8px 18px 0;font-size:11.5px;color:#7A766E}
h2{font:700 17px "Familjen Grotesk";padding:24px 18px 8px}
.row{display:grid;grid-template-columns:minmax(0,1fr) auto;padding:9px 18px;border-top:1px solid #DDDAD2}.row b{font-weight:600;display:block;text-align:left}.row span span{font-size:12px;color:#6D695F}.row .t{font-size:12px;font-weight:700}
.tabs{background:#F4F3EF;color:#9A968D}.tabs a.on{color:#151515}
.wl{min-height:100vh;display:flex;flex-direction:column;padding:18px}.wl .fp{margin:22px 0 0;height:300px}.wl h1{padding:0;margin-top:auto;font-size:36px}.wl p{color:#6D695F;margin:10px 0 22px}
.ways{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px}.ways a{text-align:center;padding:14px 0;border:1.5px solid #151515;font-weight:600}.ways .w-email{grid-column:1/-1;background:#151515;color:#F4F3EF}'''
    room = lambda x, y, w, h, b, s, imgs=(), live=False: f'<a class="room{" live" if live else ""}" style="left:{x}%;top:{y}%;width:{w}%;height:{h}%"><span><b>{b}</b><br><span>{s}</span></span><span class="pics">{"".join(f"<img src={chr(34)}{i}{chr(34)} alt=>" for i in imgs)}</span></a>'
    fp = room(0, 0, 56, 38, 'Lia Morén', 'Low Tide opens tonight', (ARTISTS[0]['img'], SHOWS[0]['work'], WORKS[3]['img']), True) + \
         room(56, 0, 44, 38, 'Maya Haddad', 'Ink, Breath · 3 days', (ARTISTS[1]['img'], SHOWS[1]['work']), True) + \
         room(0, 38, 44, 34, 'Elad Amsalem', 'two new works', (WORKS[0]['img'], WORKS[4]['img'])) + \
         room(44, 38, 56, 34, 'Where you were', 'Signal / Noise · Ritual', (RECENT[0]['img'], RECENT[2]['img'])) + \
         room(0, 74, 100, 26, 'Entrance · open a walk away', 'שנת אפס, closes Sat · Chronicles, closes Thu · CCA', ()) + \
         '<span class="door" style="left:22%;top:calc(38% - 1px)"></span><span class="door" style="left:70%;top:calc(38% - 1px)"></span><span class="door v" style="left:calc(44% - 1px);top:50%"></span><span class="door" style="left:46%;top:calc(72% - 1px)"></span>'
    home = f'''<header class="top"><span class="brand">{LOGO}Open Studio</span><span class="k">Sunday</span></header><h1>Your museum</h1><p class="sub">One room for each artist you follow. Rooms with a dot have something on now.</p>
<div class="fp">{fp}</div><div class="legend"><span>● on now</span><span>tap a room to walk in</span></div>
<h2>In the entrance, a walk away</h2>{''.join(f'<a class="row"><span><b dir="auto">{n["title"]}</b><span>{n["place"]} · {n["far"]}</span></span><span class="t">{n["when"]}</span></a>' for n in NEAR)}'''
    wfp = room(0, 0, 50, 50, '', '', (WORKS[1]['img'], WORKS[3]['img'])) + room(50, 0, 50, 50, '', '', (WORKS[2]['img'],)) + room(0, 50, 35, 50, '', '', (WORKS[0]['img'],)) + room(35, 50, 65, 50, '', '', (SHOWS[2]['work'], WORKS[4]['img']))
    wel = f'''<div class="wl"><span class="brand">{LOGO}Open Studio</span><div class="fp">{wfp}</div><h1>Build your own museum.</h1><p>Follow an artist and a room opens for them: their shows, their works, their studio.</p>{btns()}</div>'''
    return f, css, wel, home
D.append(('plan', 'Your museum', 'המוזיאון שלך', 'הבית הוא תוכנית קומה של מוזיאון פרטי. לכל אמן שאתה עוקב אחריו יש חדר עם עבודות קטנות על הקיר, וחדר שקורה בו משהו מסומן בנקודה. "Where you were" הוא חדר, והכניסה היא מה שפתוח סביבך. מתחבר ישר לסיורים בתלת ממד.',
          "A museum floor plan becomes your Home: one room per artist you follow.", 'תוכניות קומה של מוזיאונים, Monument Valley, הסיורים בתלת ממד של האפליקציה', *plan()))


for key, name, he, idea, sentence, insp, fonts, css, wel, home in D:
    (HERE / f'{key}-welcome.html').write_text(page(f'{name}: welcome', fonts, css, wel, tabs=False), encoding='utf-8')
    (HERE / f'{key}-home.html').write_text(page(f'{name}: home', fonts, css, home), encoding='utf-8')
print(len(D), 'directions')
