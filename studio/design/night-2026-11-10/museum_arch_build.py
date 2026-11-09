"""Builds museum-architecture.html and museum-architecture.pdf (Hebrew, RTL) with Chrome headless.
    python studio/design/night-2026-11-10/museum_arch_build.py
Geometry: museum-arch/geom.py. Renders: museum-arch/blender_build.py (render_all.py). Plans/sections: museum-arch/svg_build.py.
Research: museum-arch/research.py, directions.py."""
import os, sys, subprocess, pathlib, html, json
HERE = pathlib.Path(__file__).resolve().parent
AR = HERE / 'museum-arch'
sys.path.insert(0, str(AR))
import geom, svg_build as sb, research as R
from directions import DIRS, CRIT
try:
    from PIL import Image
except ImportError: Image = None

for f in geom.ALL: f()
gC = geom.graph(sb.load('C'))
RDIR = AR / 'renders'

def jpg(name):
    """png render -> jpg next to it (smaller PDF); returns file URI or '' when the render does not exist yet."""
    p = RDIR / f'{name}.png'; j = RDIR / f'{name}.jpg'
    if p.exists() and Image and (not j.exists() or j.stat().st_mtime < p.stat().st_mtime):
        Image.open(p).convert('RGB').save(j, quality=88)
    return j.as_uri() if j.exists() else ''
def fig(name, cap='', cls=''):
    u = jpg(name)
    return f'<figure class="{cls}"><img src="{u}"><figcaption>{cap}</figcaption></figure>' if u else f'<figure><div class="ph">רינדור {name} עדיין בעבודה</div></figure>'

CSS = '''
@page { size: A4; margin: 0; }
:root { --ink:#1B1A17; --muted:#5E594F; --line:#CFC7B6; --paper:#F6F1E7; --accent:#2F6B4F; --warm:#B5532F; --soft:#EAE2D0; }
* { box-sizing: border-box; }
html,body { margin:0; }
body { font: 9.6pt/1.5 Heebo, Arial, sans-serif; color: var(--ink); background:#fff; }
.pg { width:210mm; height:296mm; padding:14mm 15mm 13mm; page-break-after: always; position:relative; overflow:hidden; background:var(--paper); }
.pg:last-child { page-break-after: auto; }
.foot { position:absolute; bottom:5.5mm; left:15mm; right:15mm; display:flex; justify-content:space-between; font-size:7.5pt; color:var(--muted); }
h1 { font: 700 38pt/1.05 'Frank Ruhl Libre', serif; margin:0 0 4mm; }
h2 { font: 700 21pt/1.15 'Frank Ruhl Libre', serif; margin:0 0 2mm; }
h3 { font: 700 10.5pt/1.3 Heebo; margin:3mm 0 1mm; color:var(--accent); }
p { margin:0 0 2mm; }
.kick { font: 500 8.5pt Heebo; letter-spacing:.08em; color:var(--warm); margin-bottom:1.5mm; }
.lede { font-size:11.5pt; color:var(--muted); line-height:1.45; }
.cols { display:grid; grid-template-columns: 1fr 1fr; gap:5mm; }
.cols3 { display:grid; grid-template-columns: 1fr 1fr 1fr; gap:3.5mm; }
.card { background:#fff; border:1px solid var(--line); border-radius:2.5mm; padding:3mm 3.5mm; }
.card h3 { margin-top:0; }
figure { margin:0; } figure img { width:100%; display:block; border-radius:1.5mm; }
figcaption { font-size:7.5pt; color:var(--muted); margin-top:1mm; }
.ph { background:#E7E0D0; color:var(--muted); padding:30mm 5mm; text-align:center; border-radius:2mm; }
ul { margin:0 0 2mm; padding-inline-start:4.5mm; } li { margin-bottom:.8mm; }
table { width:100%; border-collapse:collapse; font-size:8.3pt; background:#fff; }
td,th { border:1px solid var(--line); padding:1.3mm 1.8mm; text-align:start; vertical-align:top; }
th { background:var(--soft); font-weight:700; }
.pro { color:var(--accent); font-weight:700; } .con { color:var(--warm); font-weight:700; }
.note { border-inline-start:1.1mm solid var(--warm); padding:1mm 3mm; background:#fff; margin:2.5mm 0; font-size:9pt; }
svg text { font-family: Heebo, Arial, sans-serif; }
.tag { display:inline-block; font-size:7.5pt; padding:.3mm 2mm; border-radius:5mm; background:var(--soft); color:var(--muted); margin-inline-end:1mm; }
.leg { columns:2; column-gap:4mm; font-size:7.8pt; margin-top:1.5mm; } .leg div { break-inside:avoid; margin-bottom:.4mm; }
.n { display:inline-block; width:4mm; height:4mm; line-height:3.8mm; border-radius:50%; border:.3mm solid var(--ink); text-align:center; font-size:6.5pt; margin-inline-end:1.2mm; background:#fff; }
.n.app { border-color:var(--warm); color:var(--warm); } .n.public { border-color:var(--accent); color:var(--accent); }
.bar { display:inline-block; height:2.4mm; background:var(--accent); border-radius:1mm; vertical-align:middle; }
.phase { display:grid; grid-template-columns: 20mm 1fr; gap:3.5mm; margin-bottom:3mm; }
.phase .pn { background:var(--accent); color:#fff; border-radius:2.5mm; padding:2.5mm 1mm; text-align:center; font: 700 17pt 'Frank Ruhl Libre'; line-height:1.1; }
.phase .pn small { display:block; font: 400 7.5pt Heebo; margin-top:1mm; }
.m { font-size:8pt; } .m td { padding:1.1mm 1.6mm; }
'''
pages = []
page_no = [0]
def foot(t='הצעה אדריכלית'):
    page_no[0] += 1
    return f'<div class="foot"><span>Open Studio · המוזיאון · {t}</span><span>{page_no[0]}</span></div>'
def page(inner, dark=False):
    style = ' style="background:var(--ink);color:#F6F1E7"' if dark else ''
    pages.append(f'<section class="pg"{style}>{inner}{"" if dark else foot()}</section>')

LET = dict(A='א׳', B='ב׳', C='ג׳', D='ד׳', E='ה׳')

# ---------------------------------------------------------------- 1 cover
page(f'''<div class="kick" style="color:#E8B77A">OPEN STUDIO · מוזיאון וירטואלי · הצעה אדריכלית · 10.11.2026</div>
<h1 style="font-size:50pt;margin-top:12mm">המוזיאון של Open Studio</h1>
<p class="lede" style="color:#D8D0BE;max-width:150mm">מוזיאון שהולכים בו, עם חללים שונים לתערוכות שהאפליקציה יוצרת ולתערוכות של אמנים שמשתמשים בה. מחקר של {len(R.MUSEUMS)} מוזיאונים חדשים ומיוחדים, מה כשל במוזיאונים וירטואליים, וחמישה כיווני תכנון אדריכליים, עם המלצה.</p>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:3mm;margin-top:10mm">{''.join(f'<div style="position:relative">{fig(k+"-axon")}<div style="position:absolute;top:2mm;right:2mm;background:#1B1A17;color:#F6F1E7;padding:.5mm 2.5mm;border-radius:4mm;font-size:8pt">{LET[k]} · {DIRS[k]["name"]}</div></div>' for k in 'ABCD')}</div>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:3mm;margin-top:3mm"><div style="position:relative">{fig("E-axon")}<div style="position:absolute;top:2mm;right:2mm;background:#1B1A17;color:#F6F1E7;padding:.5mm 2.5mm;border-radius:4mm;font-size:8pt">ה׳ · {DIRS["E"]["name"]}</div></div><div style="align-self:end;color:#B9B09C;font-size:8.5pt">כל המבנים הם דגמי חימר בהדמיית Blender (Cycles) מתוך אותה גיאומטריה שממנה נשרטו התוכניות והחתכים. האמנות על הקירות היא פלטה צבעונית בלבד. אין בהצעה צילומי מוזיאונים מועתקים: המוזיאונים מתוארים במילים ובדיאגרמות.</div></div>''', dark=True)

# ---------------------------------------------------------------- 2 summary
page(f'''<div class="kick">בקצרה</div><h2>מה מצאתי ומה אני מציע</h2>
<p class="lede">הפרויקט הוא הכי מעניין כאשר מבינים שמוזיאון בטלפון הוא <b>גרף של חדרים</b> ולא בניין שהולכים בו ברצף. כל חדר הוא סצנה אחת שנטענת לבד (כמו חדרי הצופה היום), והמפתן בין חדרים הוא מקום שבו אפשר להסתיר טעינה, ליצור תחושת מעבר ולתת למבקר להתמצא. האדריכלות כאן היא האדריכלות של <b>מפתנים, חללים משותפים ורצף</b>.</p>
<div class="cols3" style="margin:3mm 0">
<div class="card"><h3>מה למדתי מ־{len(R.MUSEUMS)} המוזיאונים</h3><ul><li>כמעט לכל מוזיאון טוב יש חלל אחד שמתמצאים לפיו: אטריום, חצר, רוטונדה או רחוב.</li><li>הקצב של דחיסה ושחרור (מסדרון צר ואז אולם) הוא מה שגורם לחדר להרגיש כאירוע.</li><li>גובה תקרה ואור משתנים בין חדרים הם הדרך הזולה ביותר לתת אופי.</li></ul></div>
<div class="card"><h3>מה למדתי מהמוזיאונים הווירטואליים</h3><ul><li>עולמות הליכה חופשית נתקעים, מתרוקנים ונסגרים (Hubs נסגרה).</li><li>מה שעובד בטלפון: צמתי קפיצה, מפה, חדרים קטנים ותקריב חד.</li><li>הנתונים חייבים להיות שלנו, וההסכמה בכתב.</li></ul></div>
<div class="card"><h3>חמשת הכיוונים</h3><ul>{''.join(f'<li><b>{LET[k]} {DIRS[k]["name"]}:</b> {DIRS[k]["sub"]}</li>' for k in 'ABCDE')}</ul></div></div>
<div class="note"><b>ההמלצה:</b> להתחיל מ<b>ג׳ (הגן והביתנים)</b> כבסיס, כי הוא הכי קרוב למה שכבר קיים (כל חדר הוא חדר) והוא היחיד שגדל בלי תקרה ובלי תחרות על חלל. ב־<b>שער</b> שלו יעמוד האולם הגדול של האפליקציה, בהשראת <b>א׳ (הרחוב)</b>. אחר כך <b>ד׳ (הירידה)</b> כאגף מיוחד לתערוכות יחיד, ו<b>ה׳ (המחסן הפתוח)</b> כארכיון בשלב מאוחר. ב׳ (החלל) יפה, אבל מכריח אמנים להתחרות על פלחים.</div>
<div class="cols">{fig("C-axon","ג׳: הגן והביתנים (דגם חימר)")}{fig("D-axon","ד׳: הירידה (דגם חימר, ללא כיסוי)")}</div>
<p style="font-size:8.5pt;color:var(--muted);margin-top:2mm">אין כאן שינוי קוד באפליקציה. התוכניות, החתכים והדגמים נבנו מגיאומטריה אחת שניתן לעבור ממנה לפריסת מפה באפליקציה.</p>''')

# ---------------------------------------------------------------- research atlas
GROUPS = [('V', 'חלל אחד גדול ואנכי: אטריום, מדרגה, קומות'), ('S', 'רחוב ורצף ליניארי'), ('G', 'גן, ביתנים וקליפה'), ('D', 'מתחת לקרקע, דחיסה ושחרור'), ('E', 'מחסן גלוי וארכיון'), ('H', 'מרכז וכיוון, תוכן חוצה חדרים')]
def atlas_rows(g):
    rows = ''
    for m in R.MUSEUMS:
        if m[6] != g: continue
        rows += f'<tr><td><b>{html.escape(m[0])}</b><br><span style="color:var(--muted)">{m[1]} · {html.escape(m[2])} · {m[3]}</span></td><td>{m[4]}</td><td>{m[5]}</td></tr>'
    return rows
def atlas_page(groups, kick):
    inner = f'<div class="kick">{kick}</div><h2>אטלס המוזיאונים</h2>'
    for g, title in groups:
        r = atlas_rows(g)
        if r: inner += f'<h3>{title}</h3><table class="m"><tr><th style="width:34mm">מוזיאון</th><th>הרעיון המרחבי</th><th style="width:48mm">מה זה מלמד על הליכה בטלפון</th></tr>{r}</table>'
    page(inner)
atlas_page(GROUPS[0:1], 'מחקר 1: מוזיאונים שמארגנים סביב חלל אחד')
atlas_page(GROUPS[1:3], 'מחקר 2: רחוב, גן וקליפה')
atlas_page(GROUPS[3:5], 'מחקר 3: מתחת לקרקע וארכיון')
PATTERNS = [('עוגן אחד', 'כמעט בכל מוזיאון מוצלח יש חלל אחד שמתמצאים לפיו (אטריום, חצר, רוטונדה). אצלנו: מרכז מרונדר עם דלתות.'),
 ('דחיסה ושחרור', 'מעבר צר וחשוך לפני אולם גדול (Chichu, Feuerle, The Broad). אצלנו: המפתן הוא גם מסך הטעינה.'),
 ('גבהים מתחלפים', 'Munch, Kanazawa, Prada, Boros, Kolumba: נמוך, אחר כך גבוה. אצלנו: ארבעה גבהי תקרה מוגדרים לעשרת הסוגים.'),
 ('חדר שהוא משתנה', 'Fondation Cartier: במות שזזות. אצלנו: "במה" שמחליפה תערוכה.'),
 ('רגע בחוץ', 'Inhotim, Zayed, PAMM, Calder: גן ושביל בין חדרים. אצלנו: פנורמות מרונדרות.'),
 ('אחסון גלוי', 'Boijmans, Vitra: הארכיון הוא התערוכה. אצלנו: ה׳ (המחסן).')]
atlas_page(GROUPS[5:6], 'מחקר 4: מרכז, אור מתוכנת ותוכן חוצה חדרים')
pages[-1] = pages[-1].replace('</section>', '<h3 style="margin-top:6mm">שש תבניות שחוזרות בכל המחקר</h3><div class="cols">' + ''.join(f'<div class="card"><h3>{a}</h3><p style="margin:0;font-size:8.6pt">{b}</p></div>' for a, b in PATTERNS) + '</div></section>')

# ---------------------------------------------------------------- virtual precedents
vrows = ''.join(f'<tr><td><b>{a}</b><br><span style="color:var(--muted)">{b}</span></td><td>{c}</td><td class="pro" style="font-weight:400;color:var(--ink)">{d}</td><td>{e}</td></tr>' for a, b, c, d, e in R.VIRTUAL)
rules = ''.join(f'<div class="card"><h3>{i+1}. {a}</h3><p style="font-size:8.6pt;margin:0">{b}</p></div>' for i, (a, b) in enumerate(R.RULES))
page(f'''<div class="kick">מחקר 5: מוזיאונים וירטואליים קיימים</div><h2>מה עובד ומה נכשל</h2>
<table class="m"><tr><th style="width:34mm">מוזיאון</th><th style="width:40mm">איך מנווטים</th><th>מה עבד</th><th>מה נכשל</th></tr>{vrows}</table>
<p style="font-size:8pt;color:var(--muted);margin-top:1.5mm">לא נמצא מקור אמין על MCA Chicago ו־Whitney 2020 (הושמטו). "VMoMA" בהונגריה לא אומת. ה־Kremer Museum תוכנן על ידי Johan van Lierop. נתונים מהסקירות מסומנים כמשניים כשהמקור משני.</p>''')
page(f'''<div class="kick">מחקר 6: שמונה כללים</div><h2>כללי תכנון למוזיאון שמתחיל בטלפון</h2>
<p class="lede">הכללים נגזרים מהכישלונות וההצלחות שלמעלה, והם מגבילים את כל חמשת הכיוונים.</p>
<div class="cols">{rules}</div>
<div class="note"><b>המסקנה האדריכלית:</b> המבנה הוא <b>גרף</b>. צומת = חדר (סצנה אחת שנטענת בנפרד) או "מרכז" (רחוב, חלל, גן: תמונה מרונדרת עם נקודות חמות). קשת = מפתן (דלת, מדרגה, שביל). המפתנים הם גם מסכי הטעינה. כל כיוון שבהמשך הוא גרף אחר.</div>
<h3>אבני הבניין שכבר קיימות</h3>
<table class="m"><tr><th>עשרת סוגי החללים</th><th>איך משתמשים בהם במוזיאון</th></tr>
<tr><td>קובייה לבנה, סלון, בטון, סטודיו</td><td>חדרי אמנים רגילים: ניטרליים, חמים או גולמיים</td></tr>
<tr><td>לופט, אולם סקיילייט</td><td>אולמות גדולים של האפליקציה, ו"בתי" העונה</td></tr>
<tr><td>קופסה שחורה</td><td>וידאו וצליל; חדר השקט של ד׳</td></tr>
<tr><td>ביתן זכוכית</td><td>שער, לובי, בית קפה</td></tr>
<tr><td>חדר יפני, דירת אספן</td><td>חדרים קטנים ואינטימיים, ביתנים בגן</td></tr></table>''')

# ---------------------------------------------------------------- direction pages
def legend_html(d, zsel=None, limit=22):
    rows = sb.legend(d, zsel)[:limit]; out = ''
    for i, name, kind, role in rows: out += f'<div><span class="n {role}">{i}</span>{html.escape(name)} <span style="color:var(--muted)">({kind})</span></div>'
    rest = len(sb.legend(d, zsel)) - limit
    return f'<div class="leg">{out}</div>' + (f'<p style="font-size:7.5pt;color:var(--muted)">ועוד {rest} חדרים דומים.</p>' if rest > 0 else '')

KEYNOTE = '<p style="font-size:7.5pt;color:var(--muted)"><span class="n app">1</span> חלל של האפליקציה, <span class="n public">1</span> חלל ציבורי, <span class="n">1</span> חדר אמן. הקו הירוק המנוקד הוא המסלול.</p>'
def wide_plan(k, d, plan_html, leg):
    xs = [p[0] for s in d['spaces'] for p in s['poly']]; ys = [p[1] for s in d['spaces'] for p in s['poly']]
    if (max(xs) - min(xs)) / (max(ys) - min(ys)) > 2.2:
        return f'<h3>תוכנית</h3>{plan_html}<div style="margin-top:2mm">{leg}{KEYNOTE}</div>'
    return f'<div class="cols" style="grid-template-columns:1.25fr 1fr;align-items:start"><div><h3>תוכנית</h3>{plan_html}</div><div><h3>מקרא</h3>{leg}{KEYNOTE}</div></div>'

def dir_pages(k):
    d = sb.load(k); X = DIRS[k]; sec = sb.SECTIONS[k]()
    if k == 'B': plan_html = f'<div class="cols">{sb.plan(d, 0, 330, True)}{sb.plan(d, 10.8, 330, False, flow=False)}</div><p style="font-size:7.5pt;color:var(--muted);margin:1mm 0">קומה 1 (משמאל למעלה: כניסה ולובי) וקומה 3 (פלחים חסרים הם מרפסות גג).</p>'; leg = legend_html(d, 0)
    elif k == 'E': plan_html = sb.plan(d, 0, 500, True, only_big=True); leg = legend_html(d, 0, 6) + '<p style="font-size:7.5pt;color:var(--muted)">שאר התאים בלי מספר: 72 תאים בשלוש קומות. הקו המקווקו הוא הטבעת הבאה.</p>'
    else: plan_html = sb.plan(d, None, 520, True); leg = legend_html(d)
    page(f'''<div class="kick">כיוון {LET[k]}</div><h2>{X["name"]}: {X["sub"]}</h2>
<p><span class="tag">בהשראת</span> {X["inspired"]}</p>
{fig(k+"-axon", "אקסונומטריה של דגם החימר, בלי גג. הצבע הכתום מסמן את חללי האפליקציה, האחרים לאמנים.")}
<p style="margin-top:2.5mm">{X["concept"]}</p>
{wide_plan(k, d, plan_html, leg)}''')
    seq = ''.join(f'<tr><td>{i+1}</td><td><b>{a}</b></td><td>{b}. {c}</td></tr>' for i, (a, b, c) in enumerate(X['seq']))
    pros = ''.join(f'<li>{p}</li>' for p in X['pros']); cons = ''.join(f'<li>{p}</li>' for p in X['cons'])
    page(f'''<div class="kick">כיוון {LET[k]} · המשך</div><h2>{X["name"]}: חתך ורצף החללים</h2>
<h3 style="margin-top:0">חתך</h3>{sec}
<div class="cols" style="margin-top:3mm;grid-template-columns:1.1fr 1fr;align-items:start">{fig(k+"-int", "מבט בגובה העין (דגם חימר עם אור, לא רינדור סופי של חדר)")}<div><h3 style="margin-top:0">רצף החללים</h3><table class="m"><tr><th style="width:5mm">#</th><th style="width:22mm">חלל</th><th>סוג ואופי</th></tr>{seq}</table></div></div>''')
    page(f'''<div class="kick">כיוון {LET[k]} · פרטים</div><h2>{X["name"]}: אור, גדילה וחיבור לאפליקציה</h2>
<div class="cols"><div class="card"><h3>אור</h3><p style="margin:0">{X["light"]}</p><h3>חומרים</h3><p style="margin:0">{X["materials"]}</p><h3>איך גדל</h3><p style="margin:0">{X["growth"]}</p></div>
<div class="card"><h3>ניווט בטלפון</h3><p style="margin:0">{X["phone"]}</p><h3>חיבור לאפליקציה ולשולחן העבודה</h3><p style="margin:0">{X["app"]}</p><h3>קיבולת</h3><p style="margin:0">{X["cap"]}</p></div></div>
<div class="cols" style="margin-top:2.5mm"><div><b class="pro">חוזקות</b><ul>{pros}</ul></div><div><b class="con">סיכונים</b><ul>{cons}</ul></div></div>
{fig(k+"-int2", "מבט שני: " + html.escape(sb.load(k)['cams']['ints'][-1]['name']))}''')
for k in 'ABCDE': dir_pages(k)

# ---------------------------------------------------------------- comparison
def bars(v): return f'<span class="bar" style="width:{v*3.6}mm"></span> {v}'
head = ''.join(f'<th>{LET[k]} {DIRS[k]["name"]}</th>' for k in 'ABCDE')
rows = ''.join(f'<tr><td><b>{t}</b></td>' + ''.join(f'<td>{bars(DIRS[k]["scores"][key])}</td>' for k in 'ABCDE') + '</tr>' for key, t in CRIT)
tot = '<tr><td><b>סך הכול</b></td>' + ''.join(f'<td><b>{sum(DIRS[k]["scores"].values())}</b> מתוך 30</td>' for k in 'ABCDE') + '</tr>'
capr = '<tr><td><b>קיבולת בטבעת הראשונה</b></td>' + ''.join(f'<td>{DIRS[k]["cap"]}</td>' for k in 'ABCDE') + '</tr>'
mood = dict(A='קצב של רחוב: חזית לכל אמן', B='חלל אחד גדול ומגדל', C='טבע בין חדרים', D='חושך ואור, מסע', E='ארכיון ענק, חיפוש')
mr = '<tr><td><b>תחושה</b></td>' + ''.join(f'<td>{mood[k]}</td>' for k in 'ABCDE') + '</tr>'
page(f'''<div class="kick">השוואה</div><h2>חמשת הכיוונים זה מול זה</h2>
<table><tr><th style="width:30mm"></th>{head}</tr>{mr}{rows}{tot}{capr}</table>
<div class="note">הציונים הם <b>שיפוט שלי</b>, לא מדידה, וניתן לשנות אותם אם הקריטריונים אחרים. הרבה משתמשים (אמנים רבים) מעדיפים את ג׳ ו־ה׳ כי אין בהם תחרות על חלל. אם רוצים רגע בלתי נשכח אחד, ב׳ ו־ד׳.</div>
<h3>איך הם מתחברים לעשרת סוגי החללים</h3>
<table class="m"><tr><th></th><th>חללים של האפליקציה</th><th>חדרי אמנים</th></tr>
<tr><td><b>א׳</b></td><td>לופט, קובייה לבנה גדולה, אולם סקיילייט</td><td>קובייה, סלון, בטון, יפני, סטודיו, דירה, קופסה שחורה</td></tr>
<tr><td><b>ב׳</b></td><td>לופט, סקיילייט, קובייה (קומת קרקע)</td><td>יפני, סלון, סטודיו, דירה, קופסה שחורה</td></tr>
<tr><td><b>ג׳</b></td><td>סקיילייט, לופט בביתן המרכזי</td><td>כל עשרת הסוגים, ביתן לכל אחד</td></tr>
<tr><td><b>ד׳</b></td><td>בטון (באר האור, האולם הגדול)</td><td>קובייה, סטודיו, דירה, סלון, יפני, קופסה שחורה, בטון</td></tr>
<tr><td><b>ה׳</b></td><td>קובייה לבנה גדולה (הבמה)</td><td>כל התאים מקבלים את אחד מעשרת הסוגים</td></tr></table>
<div class="cols" style="margin-top:3mm">{fig("A-int","א׳: מבט לאורך הרחוב")}{fig("E-int","ה׳: מבט בתוך המחסן")}</div>''')

# ---------------------------------------------------------------- recommendation (campus diagram)
def campus():
    o = ['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 560 330" width="100%" style="background:#FBF8F1;border:1px solid #CFC7B6;border-radius:6px">']
    o.append('<ellipse cx="300" cy="170" rx="150" ry="95" fill="#E9F0E2" stroke="#A9BF98" stroke-width="2" stroke-dasharray="5 4"/><ellipse cx="300" cy="170" rx="46" ry="26" fill="#B9D0D8"/>')
    for i in range(10):
        import math
        a = math.radians(-80 + i * 36); x, y = 300 + 150 * math.cos(a), 170 + 95 * math.sin(a)
        o.append(f'<rect x="{x-12:.0f}" y="{y-9:.0f}" width="24" height="18" fill="#fff" stroke="#1B1A17" stroke-width="1.5"/>')
    o.append('<rect x="30" y="140" width="95" height="60" fill="#F4D9C9" stroke="#B5532F" stroke-width="2"/><text x="77" y="166" font-size="11" text-anchor="middle" font-weight="700" fill="#B5532F">שער + האולם</text><text x="77" y="181" font-size="9" text-anchor="middle" fill="#5E594F">הגדול (מא׳)</text>')
    o.append('<text x="300" y="173" font-size="10" text-anchor="middle" fill="#35505A">בריכה</text><text x="300" y="118" font-size="10" text-anchor="middle" fill="#2F6B4F" font-weight="700">ג׳: ביתן לכל אמן</text>')
    o.append('<rect x="430" y="255" width="110" height="55" fill="#4A4743" stroke="#1B1A17" stroke-width="2"/><text x="485" y="278" font-size="11" text-anchor="middle" fill="#fff" font-weight="700">ד׳: אגף הירידה</text><text x="485" y="294" font-size="9" text-anchor="middle" fill="#ddd">תערוכות יחיד, שלב 2</text>')
    o.append('<rect x="430" y="25" width="110" height="55" fill="#EFE8D8" stroke="#1B1A17" stroke-width="2" stroke-dasharray="6 3"/><text x="485" y="48" font-size="11" text-anchor="middle" font-weight="700">ה׳: המחסן</text><text x="485" y="64" font-size="9" text-anchor="middle" fill="#5E594F">ארכיון, שלב 3</text>')
    o.append('<path d="M125 170 H150" stroke="#2F6B4F" stroke-width="3"/><path d="M420 212 L458 255" stroke="#1B1A17" stroke-width="2" stroke-dasharray="3 3"/><path d="M420 135 L458 80" stroke="#1B1A17" stroke-width="2" stroke-dasharray="3 3"/></svg>')
    return ''.join(o)
page(f'''<div class="kick">המלצה</div><h2>גן עם שער, ואגפים שנוספים בשלבים</h2>
<p class="lede">לא לבחור כיוון אחד אלא לבנות <b>קמפוס</b>: בסיס אחד ויציב שאפשר להוסיף לו, בלי להתחייב מראש לעיצוב הסופי.</p>
{campus()}
<div class="cols" style="margin-top:3mm"><div class="card"><h3>למה גן</h3><ul><li>כל ביתן הוא חדר שכבר קיים: חצי מהעבודה כבר נעשתה.</li><li>אין תחרות בין אמנים: כל אחד מקבל ביתן, וביתן חדש לא מזיז אף אחד.</li><li>אין תקרה בגדילה, בניגוד לרחוב ולחלל.</li><li>גם חוץ וגם פנים: חומר צילום חזק לשיווק.</li><li>בדיוק כמו Inhotim ו־Louvre Abu Dhabi: חדרים כמבנים עצמאיים.</li></ul></div>
<div class="card"><h3>למה שער ואולם גדול</h3><ul><li>האפליקציה צריכה "בית" משלה, גדול ובולט, כמו בא׳: האולם הגדול הוא התערוכה שהאפליקציה יוצרת בעצמה.</li><li>השער הוא גם הלובי: מפה, ספר אורחים וקול.</li><li>בלי השער הגן מרגיש כרשימת חדרים.</li></ul></div></div>
<div class="note"><b>מה שלא ממליץ עליו:</b> לבנות את ב׳ (החלל) כבסיס. הוא מרשים, אבל קומה לעונה הופכת את התערוכות הישנות לארכיון אפל, ו־8 פלחים בקומה פירושו שאמנים מתחרים עליהם.</div>
<h3>הערה על ד׳ וה׳</h3><p>שני אלה לא מתחרים עם הגן: ד׳ הוא <b>אגף</b> לתערוכות יחיד, חוויה נבחרת ומזוהה (לא כל אמן יקבל תא בו). ה׳ הוא <b>אינדקס</b>: הארכיון של כל מה שנעשה, ונבנה כשיהיו מאות תערוכות.</p>''')

# ---------------------------------------------------------------- the visit on a phone (storyboard)
VS = HERE.parent / 'virtual-spaces' / 'renders'
def vs(n): return (VS / f'{n}.jpg').as_uri() if (VS / f'{n}.jpg').exists() else ''
def phone(inner, cap, step):
    return f'''<div><div style="width:44mm;height:94mm;border:1.3mm solid #1B1A17;border-radius:6mm;overflow:hidden;background:#fff;position:relative;margin:0 auto">{inner}</div>
<div style="text-align:center;font-size:8.2pt;margin-top:1.5mm"><b>{step}</b><br><span style="color:var(--muted)">{cap}</span></div></div>'''
dC = sb.load('C')
img_ = lambda u, pos='center': f'<div style="width:100%;height:100%;background:url({u}) {pos}/cover"></div>'
pill = lambda t, x='50%': f'<div style="position:absolute;bottom:3mm;left:50%;transform:translateX(-50%);background:#1B1A17;color:#fff;font-size:7pt;padding:1mm 3mm;border-radius:4mm;white-space:nowrap">{t}</div>'
page(f'''<div class="kick">מבקר בטלפון</div><h2>איך נראה ביקור בגן (כיוון ג׳)</h2>
<p class="lede">ארבעה מסכים, ודקה אחת. המוזיאון הוא <b>מפה</b> שמובילה ל<b>חדרים</b>, ובין לבין "מפתן" של שנייה או שתיים.</p>
<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:3mm;margin:4mm 0">
{phone('<div style="padding:3mm 2mm;font-size:7pt;text-align:center"><b>המוזיאון · עונת החורף</b></div><div style="padding:0 1.5mm">' + sb.plan(dC, None, 300, False, flow=False) + '</div><div style="padding:2mm;font-size:6.6pt;color:#5E594F;text-align:center">נוגעים בביתן. הכתום הוא האולם של האפליקציה.</div>', 'המפה היא תוכנית הגן', '1. מפה')}
{phone(img_(jpg('C-int')) + pill('ממשיכים לביתן 4'), 'פנורמה מרונדרת של השביל; שנייה אחת, נקודה חמה על הדלת', '2. שביל')}
{phone(img_(vs('japanese') or vs('white-cube'), '40% 50%') + pill('לוחצים על עבודה'), 'החדר הקיים בצופה, העבודות בגודלן', '3. חדר')}
{phone('<div style="height:62%;background:url(' + vs('white-cube') + ') center/cover"></div><div style="padding:2.5mm;font-size:7pt"><b>שם העבודה</b><br><span style="color:#5E594F">שמן על בד, 120×90 ס״מ<br>אלעד אמסלם</span></div>' + pill('חזרה לגן'), 'תקריב חד, מידות, טקסט', '4. עבודה')}</div>
<h3>מה קורה בין המסכים</h3>
<table class="m"><tr><th style="width:36mm">מעבר</th><th>מה המבקר רואה</th><th>מה האפליקציה עושה</th></tr>
<tr><td><b>מפה אל שביל</b></td><td>הקרנה קצרה של השביל, 1 עד 2 שניות</td><td>טוענת את החדר הבא ברקע (בלי עיכוב נראה)</td></tr>
<tr><td><b>שביל אל חדר</b></td><td>פתיחת דלת והחלפת האור</td><td>מחליפה לחדר הקיים בצופה (space.js)</td></tr>
<tr><td><b>חדר אל חדר</b></td><td>"חזרה לגן" או "לביתן הבא" (מצב מודרך)</td><td>טוענת את הבא; מפה תמיד במרחק נגיעה</td></tr></table>
<div class="note">המסכים כאן הם איור: המפה והפנורמה נבנו מהגיאומטריה והרינדור של הלילה, והחדר והתקריב הם החדרים שכבר קיימים באפליקציה. אין כאן ממשק שנבנה בקוד.</div>''')

# ---------------------------------------------------------------- next steps
page(f'''<div class="kick">המשך</div><h2>איך בונים את זה באפליקציה</h2>
<p class="lede">עיקרון: <b>לא לבנות את הבניין. לבנות את הגרף</b> שמתאר אותו, ולצייר ממנו גם את המפה וגם את העורך. כך אפשר להחליף כיוון אדריכלי בלי להתחיל מחדש.</p>
<h3>מודל נתונים (מסמך חדש, בתוספת למה שיש)</h3>
<table class="m"><tr><th style="width:36mm">טבלה</th><th>שדות</th><th style="width:60mm">הערה</th></tr>
<tr><td><b>museums</b></td><td>id, כיוון (garden / street / void / descent / depot), עונה, פורסם</td><td>מוזיאון אחד פעיל בכל זמן</td></tr>
<tr><td><b>museum_spaces</b></td><td>id, museum_id, סוג חלל (אחד מעשרה או hub), וריאנט, x, y, z, סיבוב, תפקיד (app / artist / public), show_id, סטטוס</td><td>המיקום הוא מה שמצוין בתוכניות כאן</td></tr>
<tr><td><b>museum_portals</b></td><td>from, to, סוג (דלת, מדרגה, שביל, מעלית), רוחב, "כהות" (דחיסה), משך מעבר</td><td>המפתן. מחליט איך נראה מעבר</td></tr></table>
<p style="margin:2mm 0 1mm;font-size:8.3pt">דוגמה אמיתית: הגן של ג׳ כגרף (נוצר מאותה גיאומטריה, {len(gC['nodes'])} צמתים ו־{len(gC['portals'])} מפתנים):</p>
<pre dir="ltr" style="font-size:6.8pt;line-height:1.35;background:#fff;border:1px solid var(--line);border-radius:2mm;padding:2mm;margin:0 0 2mm;white-space:pre-wrap">{html.escape(json.dumps(dict(nodes=gC['nodes'][:2], portals=gC['portals'][:2]), ensure_ascii=False))}</pre>
<h3>שלבים</h3>
<div class="phase"><div class="pn">1<small>2 עד 3 שבועות</small></div><div class="card"><b>גרף ומפה.</b><ul><li>טבלאות הגרף, ושרטוט המפה מאותו SVG כמו התוכניות כאן (ג׳ בלבד).</li><li>המבקר מקבל מפה וביתנים עם נגיעה: כל ביתן נפתח בצופה הקיים (space.js).</li><li>שער ואולם גדול כשני חדרים ראשונים.</li></ul></div></div>
<div class="phase"><div class="pn">2<small>3 שבועות</small></div><div class="card"><b>עורך מוזיאון בשולחן העבודה (Desk).</b><ul><li>עורך הגן: גוררים ביתן על המפה, בוחרים סוג חלל ותערוכה.</li><li>אותו עורך גם לתצוגת הרחוב והחלל כשהכיוון מתחלף.</li><li>הרשאות לפי עבודה (כפי שהוצע ב־9.11): אישור האמן מתבצע בכל טעינה.</li></ul></div></div>
<div class="phase"><div class="pn">3<small>3 שבועות</small></div><div class="card"><b>מרכזים מרונדרים (hubs).</b><ul><li>השביל, השער והאולם הגדול כפנורמות מרונדרות ב־Blender ב־GitHub Actions, בדיוק כמו חדרי הצופה: תמונה אחת עם נקודות חמות על הדלתות.</li><li>מפתן עם 1 עד 2 שניות "הליכה": אנימציה קצרה או תמונה שעוברת.</li></ul></div></div>
<div class="phase"><div class="pn">4<small>פתוח</small></div><div class="card"><b>אגפים.</b><ul><li>ד׳ (תערוכות יחיד חשוכות), ה׳ (אינדקס): כל אחד כגרף מקומי עם סוג hub משלו.</li><li>קול וטקסט קיר: כפי שהוצע.</li></ul></div></div>
<div class="note">אלה הערכות גסות לפי מה שקיים, לא מדידה. נבנה לפי אותו כלל של שאר הדברים: נבדק בטלפון (390 על 844) ובשרת לפני שמסמנים כגמור. הרינדור המלא של הדגמים כאן (דגמי חימר) הוא רק לבחירת כיוון, ולא החדרים הסופיים.</div>''')

# ---------------------------------------------------------------- decisions + sources
src = ''.join(f'<li>{html.escape(m[0])}: {m[7]}</li>' for m in R.MUSEUMS if m[7])
page(f'''<div class="kick">סיום</div><h2>החלטות שאני צריך מאלעד</h2>
<ol><li><b>כיוון:</b> האם לצאת מג׳ (גן ושער) כהמלצה, או שאחד הכיוונים האחרים מדבר אליך יותר (ב׳ ו־ד׳ הכי דרמטיים)?</li>
<li><b>האולם הגדול של האפליקציה:</b> מה תהיה התערוכה הראשונה שלו, ומי עורך אותה?</li>
<li><b>ארבעת האמנים הראשונים</b> שיקבלו ביתנים.</li>
<li><b>האם יש קול</b> (מוזיקה, קריינות) ומי מקליט.</li>
<li><b>שם</b> למוזיאון (כרגע "המוזיאון").</li></ol>
<h3>מקורות המחקר</h3><p style="font-size:8pt;color:var(--muted)">נבדקו בלילה 9 עד 10.11.2026 מול Dezeen, Wikipedia, אתרי האדריכלים והמוזיאונים. פרטים שלא אומתו הושמטו או לא נכללו. הטקסטים כאן שלנו, והתמונות הן דגמים שלנו.</p>
<ul style="font-size:7.8pt;columns:2;column-gap:5mm">{src}</ul>
<p style="font-size:8pt;color:var(--muted)">מוזיאונים וירטואליים: Google Arts &amp; Culture, Pocket Gallery, VOMA (מאמר GWU Museum Studies), Kremer Museum, Mozilla Hubs (UploadVR), Dazed (על Decentraland ו־Fortnite), Artsteps, Kunstmatrix, Spatial.io, Museum of Other Realities (Steam).</p>''')

HTML = f'''<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8"><title>המוזיאון · הצעה אדריכלית</title>
<link href="https://fonts.googleapis.com/css2?family=Frank+Ruhl+Libre:wght@400;500;700&family=Heebo:wght@400;500;700&display=swap" rel="stylesheet">
<style>{CSS}</style></head><body>{"".join(pages)}</body></html>'''
(HERE / 'museum-architecture.html').write_text(HTML, encoding='utf-8')
out = HERE / 'museum-architecture.pdf'
chrome = next(p for p in (r'C:\Program Files\Google\Chrome\Application\chrome.exe', r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe') if os.path.exists(p))
subprocess.run([chrome, '--headless=new', '--disable-gpu', '--no-pdf-header-footer', '--run-all-compositor-stages-before-draw', '--virtual-time-budget=20000', f'--print-to-pdf={out}', (HERE / 'museum-architecture.html').as_uri()], check=True, capture_output=True)
print(out, out.stat().st_size // 1024, 'KB', len(pages), 'pages')
