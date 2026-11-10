"""Builds ../museum-street.html and ../museum-street.pdf (Hebrew, RTL, A4 landscape) with Chrome headless.
    python studio/design/night-2026-11-10/museum-street/street_spec.py      (renders the views, needs network for three.js)
    python studio/design/night-2026-11-10/museum-street/museum_street_build.py
Plans are drawn here from the same specs (street_spec.py) as the 3D views."""
import os, sys, subprocess, pathlib, json, math
HERE = pathlib.Path(__file__).resolve().parent
OUT = HERE.parent
sys.path.insert(0, str(HERE))
import street_spec as SS
L = SS.L

def prof(pts, x):
    if x <= pts[0][0]: return pts[0][1]
    for i in range(1, len(pts)):
        if x <= pts[i][0]:
            t = (x - pts[i-1][0]) / (pts[i][0] - pts[i-1][0]); t = t * t * (3 - 2 * t)
            return pts[i-1][1] + (pts[i][1] - pts[i-1][1]) * t
    return pts[-1][1]

def grad(stops, gid):
    """horizontal gradient for the plan: entry (x=0) is on the RIGHT (the page reads right to left)."""
    out = f'<linearGradient id="{gid}" x1="0" x2="1" y1="0" y2="0">'
    pts = []
    for i, (x, c) in enumerate(stops):
        if i: pts.append((x, stops[i-1][1]))   # hard-ish step approximated: previous colour just before
        pts.append((x, c))
    # smooth: use the stops as they are (the 3D renderer blends them too)
    for x, c in stops: out += f'<stop offset="{1 - min(1, x / L):.3f}" stop-color="{c}"/>'
    out = f'<linearGradient id="{gid}" x1="0" x2="1" y1="0" y2="0">' + ''.join(f'<stop offset="{1 - min(1, x / L):.3f}" stop-color="{c}"/>' for x, c in sorted(stops, key=lambda s: -s[0])) + '</linearGradient>'
    return out

_gid = [0]
def plan(s, mode, cam_x=None, label_rooms=True):
    _gid[0] += 1; G = f'g{_gid[0]}'
    sc = 11.0; M = 12
    W = L * sc + 2 * M; Hh = 38 * sc; cy = Hh / 2
    sx = lambda x: M + (L - x) * sc
    sz = lambda z: cy - z * sc          # walker faces left; right hand = up on the page
    o = [f'<svg viewBox="0 0 {W:.0f} {Hh:.0f}" xmlns="http://www.w3.org/2000/svg">', '<defs>']
    wm = s['mat']['wall']; fm = s['mat']['floor']; cm = s['mat']['ceil']
    if mode in ('spec',): o.append(grad(cm['stops'], G))
    if mode == 'zones': o.append(grad([[x, c] for x, c in zip((0, 15, 30, 45), ['#FF5FA2', '#FFB02E', '#3FD0C9', '#6C7CFF'])], G))
    if mode == 'terra': o.append(grad(s['mat']['floor']['stops'], G))
    o.append('</defs>')
    # rooms first (under street)
    for r in s['rooms']:
        sd = r['side']; z0 = sd * prof(s['width'], r['x']) / 2; cd = r.get('cd', 0); zc = z0 + sd * cd
        rd, rw = r.get('rd', 9), r.get('rw', 9); zr = zc + sd * rd
        c = r.get('col')
        o.append(f'<rect x="{sx(r["x"] + rw/2):.1f}" y="{min(sz(zc), sz(zr)):.1f}" width="{rw*sc:.1f}" height="{rd*sc:.1f}" fill="#FFF8EA" stroke="#2a2620" stroke-width="2"/>')
        o.append(f'<rect x="{sx(r["x"] + 1.8):.1f}" y="{min(sz(zc), sz(zr)) + (4 if sd > 0 else rd*sc-10):.1f}" width="{3.6*sc:.1f}" height="6" fill="#B9532F" opacity=".35"/>')
        if cd:
            o.append(f'<rect x="{sx(r["x"] + r["w"]/2):.1f}" y="{min(sz(z0), sz(zc)):.1f}" width="{r["w"]*sc:.1f}" height="{cd*sc:.1f}" fill="{c}" stroke="#2a2620" stroke-width="1.5"/>')
    # street
    pts_t = [(sx(x), sz(prof(s['width'], x) / 2)) for x in [i * .5 for i in range(int(L * 2) + 1)]]
    pts_b = [(sx(x), sz(-prof(s['width'], x) / 2)) for x in [i * .5 for i in range(int(L * 2), -1, -1)]]
    poly = ' '.join(f'{a:.1f},{b:.1f}' for a, b in pts_t + pts_b)
    fill = f'url(#{G})' if mode in ('spec', 'zones', 'terra') else '#E9E0CF'
    o.append(f'<polygon points="{poly}" fill="{fill}" stroke="#2a2620" stroke-width="2.5"/>')
    if mode == 'spec' or mode == 'zones': o.append(f'<polygon points="{poly}" fill="#fff" opacity=".22"/>')
    # openings drawn as gaps in the wall line
    for r in s['rooms']:
        sd = r['side']; zz = sz(sd * prof(s['width'], r['x']) / 2)
        o.append(f'<line x1="{sx(r["x"] - r["w"]/2):.1f}" x2="{sx(r["x"] + r["w"]/2):.1f}" y1="{zz:.1f}" y2="{zz:.1f}" stroke="#E9E0CF" stroke-width="4.5"/>')
    for f in s.get('frames', []):
        W_ = prof(s['width'], f['x']); y1, y2 = sz(W_ / 2), sz(-W_ / 2)
        col = f['m']['stops'][0][1]
        o.append(f'<rect x="{sx(f["x"] + f["t"]):.1f}" y="{y1:.1f}" width="{f["t"]*sc:.1f}" height="{y2 - y1:.1f}" fill="{col}"/>')
        o.append(f'<rect x="{sx(f["x"] + f["t"]):.1f}" y="{sz(f["hw"]):.1f}" width="{f["t"]*sc:.1f}" height="{2*f["hw"]*sc:.1f}" fill="#E9E0CF"/>')
    # colour spill discs for thresholds
    # entry + camera
    ex = sx(0)
    o.append(f'<text x="{ex + 6:.1f}" y="{cy - 16:.1f}" font-size="13" fill="#5E594F">כניסה</text>')
    if cam_x is not None:
        cx = sx(cam_x); o.append(f'<path d="M{cx:.1f},{cy:.1f} L{cx - 60:.1f},{cy - 30:.1f} L{cx - 60:.1f},{cy + 30:.1f} Z" fill="#B5532F" opacity=".18"/><circle cx="{cx:.1f}" cy="{cy:.1f}" r="5" fill="#B5532F"/>')
    # scale bar
    o.append(f'<line x1="{M + 5}" x2="{M + 5 + 10*sc}" y1="{Hh - 8}" y2="{Hh - 8}" stroke="#1B1A17" stroke-width="2"/><text x="{M + 5 + 10*sc + 6}" y="{Hh - 4}" font-size="12" fill="#1B1A17">10 מ׳</text>')
    o.append('</svg>')
    return ''.join(o)

CONC = {
 1: dict(title='שדות צבע', sub='כל מפתן הוא חדר קטן של צבע אחד, והוא מבשר את התערוכה הבאה', mode='plain', cam=1.0,
   refs='James Turrell (חללי אור וצבע, Ganzfeld), Luis Barragán (Casa Gilardi, Cuadra San Cristóbal: קירות צבע רוויים ומעברים צרים), Olafur Eliasson (Room for one colour: חדר שכולו אור צהוב)',
   idea='הרחוב עצמו נשאר בהיר וניטרלי, כך שהיצירות שעל קירותיו נראות כמו שהן. ליד כל תערוכה נכנסים קודם לתא צבע בעומק 3.4 מ׳: קירות, רצפה ותקרה בגוון אחד רווי, ורק מהקצה שלו הדלת הקטנה אל החדר הלבן. הצבע נשפך החוצה לרצפת הרחוב, ולכן הוא נראה מרחוק, עוד לפני שמגיעים.',
   how=['תא הצבע הוא הדחיסה, החדר הלבן אחריו הוא השחרור: שתי שניות בתוך צבע ואז אור לבן.','מרחוק רואים ברחוב רצף כתמי צבע: מי שמחפש תערוכה של "האדום" מזהה אותה.','הצבע הוא נתון אחד בכל תערוכה (גוון), כלומר קל לשייך אוטומטית.'],
   pro=['הכי ברור לניווט והכי נקי לאמנות.','זול: ארבעה משטחים וכתם אור לכל מפתן.'], con=['הרחוב הראשי עדיין "ישר": הצבע מגיע בנקודות, לא ברצף.','שש תערוכות סמוכות בגוונים שונים עלולות להיראות כמו קופסאות ממתקים אם לא בוחרים צבעים בקפידה.']),
 2: dict(title='הספקטרום', sub='הצבע משתנה בהדרגה לאורך הרחוב, אדום בכניסה עד סגול בקצה', mode='spec', cam=1.0,
   refs='Carlos Cruz-Diez (Chromosaturation: חדרי צבע טהורים), Olafur Eliasson (Your rainbow panorama, ARoS), Josef Albers (יחסי צבעים)',
   idea='הרחוב נצבע בגוון שמתחלף לאט, כמו קשת, על הקירות, התקרה והשתקפות הרצפה. מי שהלך חצי רחוב יודע איפה הוא בלי לחשוב: "אני בירוק". הדלתות לחדרים נשארות לבנות ונקיות, כך שהן בולטות מתוך הצבע.',
   how=['המיקום ברחוב הופך לצבע: אין צורך במפה כדי להבין כמה עמוק נכנסתי.','התקרה זוהרת כמו תקרת תאורה, בלי שמיים, והצבע משתקף ברצפה מבריקה.','אפשר לעבור ממעבר חד למעבר רך בלי לשנות את האדריכלות.'],
   pro=['הכי "צבעוני ומפתיע" במבט ראשון, והכי פשוט לבנייה (גרדיאנט).','מסביר את אורך הרחוב.'], con=['צובע גם את היצירות שתלויות ברחוב (צבע על הקיר משנה איך רואים צבע על הציור).','הצבע לא מבשר תערוכה מסוימת, רק מיקום.']),
 3: dict(title='הציר הנושם', sub='הרחוב מצטמצם למעבר צר ונמוך, ואז נפתח לככר גבוהה ומוארת', mode='terra', cam=1.0,
   refs='Peter Zumthor (Kolumba: דחיסה ושחרור), Tadao Ando (מעברים צרים שנפתחים לחלל), Alvar Aalto (קיר גלי, Baker House), Oscar Niemeyer (קווים עגולים)',
   idea='הציר נשאר ישר, אבל רוחבו וגובהו משתנים בקצב: מעבר צר (3.2 מ׳ רוחב, 3 מ׳ גובה) בצבע חם ועמוק, שמוביל לככר רחבה (12 מ׳ רוחב, 8 מ׳ גובה) שבה נפתחות הדלתות לתערוכות. המעברים הם ה"בין", הככרות הן ה"בתוך".',
   how=['דחיסה ושחרור: ההרגשה של "הגעתי" מגיעה מהגוף, לא מתווית.','אפשר לצבוע כל מעבר בצבע אחר (בדוגמה: טרקוטה וורוד).','הככר הגבוהה נותנת קנה מידה גדול ליצירות גדולות.'],
   pro=['הכי "אדריכלי": יוצר חוויה גם בלי צבע.','המעבר הצר הוא זמן שקט, בלי יצירות, כמו נשימה.'], con=['הכי יקר: קירות מתעקלים, תקרה משתנה ואפיית אור.','הצטמצמות מקשה על קבוצות גדולות ועל הליכה בטלפון (שני אנשים נראים חוסמים).']),
 4: dict(title='שערים וקשתות', sub='סדרת קשתות צבעוניות עמוקות לאורך הרחוב, והתערוכות נפתחות בקשתות משלהן', mode='plain', cam=1.0,
   refs='Louis Kahn (קשתות Kimbell, Exeter), Ricardo Bofill (La Muralla Roja ו־Walden 7: צבע וגיאומטריה), Carlo Scarpa (אפרכסות ושערים בקסטלווקיו), Ettore Sottsass (צבעוניות Memphis)',
   idea='כל שמונה מטרים קשת צבעונית עבה (0.9 מ׳) חוצה את הרחוב כולו, כל אחת בצבע אחר. מהכניסה רואים אותן כמנהרה של קשתות מתכווצות, צבעונית אבל סימטרית. בלי הצורך לעקל את הרחוב נוצרת תחושת תנועה, והאור הצבעוני בין הקשתות משנה את הגוון.',
   how=['הקשת היא גם סימן וגם סף: חוצים אותה ויודעים שעברנו אזור.','דלתות החדרים באותה שפת קשת, פנימה יותר קטנה.','נפח הקשת עובד מצוין במבט קדימה, וכבר בפריים אחד נראית מרחק ועומק.'],
   pro=['מבט קדימה מרשים במיוחד, וזול (גיאומטריה קטנה).','שפת צורה אחת חוזרת, קל לתחזק.'], con=['קשתות רבות מתחרות עם היצירות על הקירות.','צריך לחשוב על הגובה בטלפון: קשת מכסה חלק מהמסך.']),
 5: dict(title='תקרות אור ורצפות', sub='תקרות זוהרות בצבע, ורצפה שמשנה חומר וצבע בכל אזור', mode='zones', cam=1.0,
   refs='Dan Flavin (תאורת פלורסנט צבעונית: Chiesa Rossa, מילאנו), James Turrell (Skyspace ללא שמיים), Carlo Scarpa (טרצו), Hella Jongerius (צבע וחומר)',
   idea='הרחוב מחולק לארבעה אזורים של 15 מ׳. בכל אחד התקרה זוהרת בצבע אחר (ורוד, ענבר, טורקיז, כחול) והרצפה היא חומר אחר: טרצו, גומי ירוק, אבן אפורה, שטיח אדום. הקירות לבנים וקולטים את האור הצבעוני.',
   how=['התקרה הזוהרת היא אור יום בלי שמיים, כלומר אין מבט החוצה.','הרצפה משנה גם את הצליל של הצעדים ואת ההרגשה.','הקירות לבנים כדי לתת ליצירות מקום, אבל נצבעים באור.'],
   pro=['הכי חושי: צבע, חומר ואור יחד.','אזורים אחידים קלים להסביר למבקר ("אזור הוורוד").'], con=['הצבע בקירות מזייף את הצבע ביצירות.','הרצפה מוסתרת כשמסתכלים קדימה בטלפון.']),
}
SCORES = {  # wayfinding, phone cost, frames art, build cost (1 bad .. 5 good)
 1: (5, 5, 5, 5), 2: (4, 5, 2, 5), 3: (3, 4, 4, 2), 4: (4, 4, 3, 4), 5: (3, 3, 2, 3)}

CSS = '''
@page { size: 297mm 210mm; margin: 0; }
:root { --ink:#1B1A17; --muted:#5E594F; --line:#CFC7B6; --paper:#F6F1E7; --accent:#2F6B4F; --warm:#B5532F; --soft:#EAE2D0; }
* { box-sizing: border-box; }
html,body { margin:0; }
body { font: 10pt/1.5 Heebo, Arial, sans-serif; color: var(--ink); background:#fff; }
.pg { width:297mm; height:209.5mm; padding:12mm 14mm 11mm; page-break-after: always; position:relative; overflow:hidden; background:var(--paper); }
.pg:last-child { page-break-after: auto; }
.dark { background:#17141A; color:#F6F1E7; }
.foot { position:absolute; bottom:4.5mm; left:14mm; right:14mm; display:flex; justify-content:space-between; font-size:7.5pt; color:var(--muted); }
h1 { font: 700 40pt/1.05 'Frank Ruhl Libre', serif; margin:0 0 3mm; }
h2 { font: 700 23pt/1.1 'Frank Ruhl Libre', serif; margin:0 0 1.5mm; }
h3 { font: 700 10.5pt/1.3 Heebo; margin:2.5mm 0 1mm; color:var(--accent); }
p { margin:0 0 2mm; }
.kick { font: 500 8.5pt Heebo; letter-spacing:.06em; color:var(--warm); margin-bottom:1mm; }
.lede { font-size:12pt; color:var(--muted); line-height:1.45; }
.cols { display:grid; grid-template-columns: 1fr 1fr; gap:6mm; }
.cols3 { display:grid; grid-template-columns: 1fr 1fr 1fr; gap:4mm; }
.card { background:#fff; border:1px solid var(--line); border-radius:2.5mm; padding:3.5mm 4mm; }
.card h3 { margin-top:0; }
figure { margin:0; } figure img { width:100%; display:block; border-radius:1.5mm; }
figcaption { font-size:7.5pt; color:var(--muted); margin-top:.8mm; }
ul { margin:0 0 2mm; padding-inline-start:4.5mm; } li { margin-bottom:.8mm; }
table { width:100%; border-collapse:collapse; font-size:9pt; background:#fff; }
td,th { border:1px solid var(--line); padding:1.6mm 2.2mm; text-align:start; vertical-align:top; }
th { background:var(--soft); font-weight:700; }
.pro { color:var(--accent); font-weight:700; } .con { color:var(--warm); font-weight:700; }
.note { border-inline-start:1.1mm solid var(--warm); padding:1mm 3mm; background:#fff; margin:2.5mm 0; font-size:9.5pt; }
svg text { font-family: Heebo, Arial, sans-serif; }
.cgrid { display:grid; grid-template-columns: 88mm 1fr; gap:6mm; height:172mm; }
.cgrid .r { display:grid; grid-template-rows: auto auto; gap:3mm; align-content:start; }
.cgrid .r2 { display:grid; grid-template-columns: 1.15fr 1fr; gap:3mm; align-items:start; }
.planbox { background:#fff; border:1px solid var(--line); border-radius:1.5mm; padding:1.5mm; }
.pip { display:inline-block; width:4mm; height:4mm; border-radius:50%; vertical-align:middle; margin-inline-end:1mm; }
.dots span { display:inline-block; width:3.2mm; height:3.2mm; border-radius:50%; background:#ddd; margin-inline-end:.6mm; }
.dots span.on { background:var(--accent); }
.sw { display:inline-block; width:8mm; height:8mm; border-radius:1.5mm; margin-inline-end:1.2mm; border:1px solid rgba(0,0,0,.12); }
.sml { font-size:8.5pt; color:var(--muted); }
'''
pages = []; pn = [0]
def page(inner, dark=False):
    pn[0] += 1
    f = f'<div class="foot"><span>Open Studio · המוזיאון · הרחוב, פיתוח תכנון</span><span>{pn[0]}</span></div>'
    pages.append(f'<section class="pg{" dark" if dark else ""}">{inner}{f}</section>')
def img(name, cap='', style=''):
    return f'<figure><img src="{(SS.REN / (name + ".jpg")).as_uri()}" style="{style}"><figcaption>{cap}</figcaption></figure>'
def refs_html(r):
    import re as _re
    out = []
    for part in _re.split(r'(?<=\)), ', r):
        part = part.strip()
        if ' (' in part: nm, ds = part.rstrip(')').split(' (', 1); out.append(f'<div><b>{nm}</b>: {ds}</div>')
        else: out.append(f'<div><b>{part}</b></div>')
    return ''.join(out)
def dots(n): return '<span class="dots">' + ''.join(f'<span class="{"on" if i < n else ""}"></span>' for i in range(5)) + '</span>'

specs = {n: SS.CONCEPTS[n]() for n in range(1, 7)}

# ---------------------------------------------------------------- 1 cover
page(f'''<div style="display:grid;grid-template-columns:1fr 1.5fr;gap:9mm;height:180mm;align-items:center">
<div><div class="kick" style="color:#F2A900">החלטה 10.11 · פיתוח תכנון</div><h1>הרחוב, אבל בצבע</h1>
<p class="lede" style="color:#d8d0c3">המוזיאון הוא רחוב אחד ארוך, בקומה אחת, בתוך בניין סגור. החדרים נפתחים ממנו. את הישר והמשעמם אנחנו שוברים לא בהוספת חללים, אלא בחללי הביניים: המפתנים, המעברים והאור בין תערוכה לתערוכה.</p>
<p style="color:#bdb5a8;font-size:9.5pt">חמישה רעיונות, תוכנית ומבט בגובה העין לכל אחד, השוואה, המלצה ושלוש שאלות. המבטים הם הדמיה פרוצדורלית שלנו (לא החדרים הסופיים): הצבעים והפרופורציות אמיתיים, האמנות על הקירות היא כתמי צבע.</p></div>
{img('c6', 'הרכב מומלץ: תקרה שמשתנה כמו ספקטרום, קירות בהירים ליצירות, ומפתנים בצבע משלים')}</div>''', dark=True)

# ---------------------------------------------------------------- 2 decision
page(f'''<div class="kick">1 · ההחלטה</div><h2>הרחוב: קומה אחת, בפנים, בלי מדרגות</h2>
<div class="cols" style="margin-top:3mm"><div>
<div class="card"><h3>מה אלעד אמר</h3><p style="font-size:11pt">הכיוון שהכי התחבר אליו: <b>א׳, הרחוב</b>. ציר אחד ארוך והחדרים נפתחים ממנו. מתאים לשימוש: המבקר לא מסתבך במעלה ומורד במדרגות, ואין טבע דיגיטלי. בינתיים המבקר הולך במרחב סגור, רק אמנות ותערוכות, בלי חוץ. הכיוון נראה לו עדיין שטוח וישר מדי, ולכן: ללכת איתו, אבל לעצב משהו <b>צבעוני, מעניין ויצירתי יותר במעברים</b>, בעיקר בחללים שבין התערוכות עצמן.</p></div>
<h3>מה נשאר מכיוון א׳</h3>
<ul><li><b>ציר אחד</b> לאורך המוזיאון; הכניסה בקצה אחד, ולא מסתבכים.</li><li><b>קומה אחת</b>, בלי מדרגות ובלי מעליות: הליכה בטלפון בלי עלייה וירידה.</li><li><b>חדר נפתח מהציר</b>, חדר לתערוכה (אולמות האפליקציה מצד אחד, חדרי אמנים מצד שני, כמו בהצעה המקורית).</li><li><b>הגדילה</b>: מאריכים את הרחוב (9 מ׳ לזוג חדרים), ובהמשך נכופף ל־L.</li><li><b>חדר = סצנה</b> שנטענת לבד, כמו בגרף החדרים שהוצע.</li></ul>
<h3>מה משתנה</h3>
<ul><li>בלי שקע סקיילייט פתוח לשמיים: <b>אור מלאכותי בלבד</b>, תקרות זוהרות (הגרסה המקורית השתמשה בסקיילייט).</li><li>בלי חלונות, בלי חוץ, בלי גן.</li><li>המפתנים והמעברים הופכים לחלק מהחוויה, לא רק פתח בקיר.</li></ul></div>
<div><div class="card"><h3>המידות האמיתיות של האפליקציה</h3>
<table><tr><th>נתון</th><th>ערך</th><th>מקור</th></tr>
<tr><td>גובה עיניים</td><td>1.6 מ׳</td><td>space.js (EYE)</td></tr><tr><td>מהירות הליכה</td><td>1.9 מ׳ לשנייה</td><td>space.js (WALK)</td></tr>
<tr><td>רוחב הרחוב</td><td>8 מ׳ (בדוגמאות: 5 עד 12)</td><td>הצעה א׳</td></tr><tr><td>גובה תקרה ברחוב</td><td>6 מ׳ (3 עד 8 בציר הנושם)</td><td>הצעה א׳ (9 מ׳, הורד: אין סקיילייט)</td></tr>
<tr><td>דלת לחדר</td><td>3.2 עד 4.6 מ׳ רוחב, 3.8 מ׳ גובה</td><td>דלתות הצעה א׳ ושל space.js</td></tr><tr><td>אורך הדגימה</td><td>60 מ׳ (7 דלתות)</td><td>הצעה א׳: 96 מ׳</td></tr></table></div>
<div class="note"><b>המשמעות בזמן:</b> ברחוב של 60 מ׳, הליכה ישרה אורכת כ־32 שניות. מפתן של 8 מ׳ אורך 4 שניות. לכן חלל ביניים טוב הוא לא מקום שעוצרים בו אלא <b>רגע של 3 עד 6 שניות</b> שמשנה את ההרגשה בדרך אל החדר הבא.</div>
<svg viewBox="0 0 520 78" style="width:100%"><rect x="0" y="22" width="520" height="30" fill="#EAE2D0"/>
<g font-size="12" fill="#1B1A17"><rect x="4" y="12" width="104" height="50" fill="#fff" stroke="#2a2620"/><text x="56" y="42" text-anchor="middle">חדר</text><rect x="150" y="20" width="60" height="34" fill="#E8412C"/><text x="180" y="42" text-anchor="middle" fill="#fff">מפתן</text><text x="290" y="42" text-anchor="middle">רחוב</text><rect x="360" y="20" width="60" height="34" fill="#1F5FBF"/><text x="390" y="42" text-anchor="middle" fill="#fff">מפתן</text><rect x="420" y="12" width="96" height="50" fill="#fff" stroke="#2a2620"/><text x="468" y="42" text-anchor="middle">חדר</text></g>
<text x="180" y="74" font-size="10" text-anchor="middle" fill="#5E594F">4 שניות</text><text x="390" y="74" font-size="10" text-anchor="middle" fill="#5E594F">4 שניות</text></svg></div></div>''')

# ---------------------------------------------------------------- 3 brief
page(f'''<div class="kick">2 · החללים שבין</div><h2>מה צריך חלל ביניים טוב, ולמה לא סתם צבע</h2>
<p class="lede" style="margin-bottom:3mm">חמישה קריטריונים לבחירת הרעיון, מהחשוב: כך בחנתי כל אחד מהחמישה בעמודים הבאים.</p>
<div class="cols3">
<div class="card"><h3>1 · הוא מבשר</h3><p>עוד לפני שנכנסים לחדר, הגוף כבר יודע שמשהו משתנה: גוון, גובה, אור, חומר. זה מה שהופך דלת לאירוע (Barragán מנהל את העין כך, Zumthor מנהל את הגוף).</p></div>
<div class="card"><h3>2 · הוא קצר</h3><p>3 עד 6 שניות. בטלפון הבהוב או חסימה של עשר שניות מרגישים כמו תקלה. אין בו יצירות, הוא נשימה.</p></div>
<div class="card"><h3>3 · הוא לא מזייף את האמנות</h3><p>צבע על קיר הצד ליצירה משנה איך רואים אותה. לכן עדיף שהצבע יהיה בחלל שבין היצירות, לא בקיר שעליו תלויה יצירה.</p></div>
<div class="card"><h3>4 · הוא זול בטלפון</h3><p>האפליקציה מציירת חדרים מצילומים ממופים על משטחים. צבע שטוח, גרדיאנט וחומר בולט: כמעט חינם. טקסטורות חדשות, אור בזמן אמת וצללים: יקרים. אור וצבע נאפים מראש (vertex colour), כמו במבטים כאן.</p></div>
<div class="card"><h3>5 · הוא שומר על הפשטות</h3><p>הציר נשאר ישר וקריא. אנחנו לא בונים מבוך אלא מוסיפים ביטוי: הכול קורה במקומות חוזרים ומוגדרים, לא לאורך כל הרחוב.</p></div>
<div class="card" style="background:var(--soft)"><h3>המסקנה של המחקר</h3><p>הצבע הכי חזק כשהוא <b>מצומצם בזמן ובמקום</b> (Turrell, Barragán) או <b>ממוסגר ברצף ברור</b> (Cruz-Diez, Eliasson). מוזיאון שכולו צבעוני בלי מבנה מאבד את כוחו.</p></div></div>
<h3 style="margin-top:6mm">מקורות להשראה, בקצרה</h3>
<table><tr><th>שם</th><th>מה לוקחים</th></tr>
<tr><td>James Turrell</td><td>חדרים שכל מה שבהם הוא אור צבעוני אחד; הגוף נכנס לתוך צבע</td></tr>
<tr><td>Luis Barragán</td><td>מעברים צרים וקירות רוויים (ורוד, צהוב, אדום) שמובילים לחדר שקט</td></tr>
<tr><td>Olafur Eliasson</td><td>Your rainbow panorama: מעבר שבו מסתובבים בתוך קשת; Room for one colour</td></tr>
<tr><td>Carlos Cruz-Diez</td><td>Chromosaturation: חדרי צבע מוחלטים שמולם מרגישים את הצבע בעין</td></tr>
<tr><td>Dan Flavin</td><td>מסדרונות של אור פלורסנט צבעוני; אור הוא החומר</td></tr>
<tr><td>Peter Zumthor, Tadao Ando</td><td>דחיסה ושחרור: מעבר צר שנפתח לחלל</td></tr>
<tr><td>Louis Kahn, Ricardo Bofill</td><td>קשת עבה כיחידה אדריכלית חוזרת; צבע כגיאומטריה</td></tr></table>''')

# ---------------------------------------------------------------- 4..8 concepts
for n in range(1, 6):
    c = CONC[n]; s = specs[n]
    pl = plan(s, c['mode'], cam_x=c['cam'])
    sc4 = SCORES[n]
    page(f'''<div class="kick">3.{n} · רעיון {n} מתוך 5</div>
<div class="cgrid"><div><h2>{c["title"]}</h2><p class="lede" style="font-size:11pt;margin-bottom:2mm">{c["sub"]}</p>
<p style="font-size:9.5pt">{c["idea"]}</p>
<h3>איך זה עובד</h3><ul style="font-size:9.3pt">{"".join(f"<li>{x}</li>" for x in c["how"])}</ul>
<h3>השראה</h3><div class="sml">{refs_html(c["refs"])}</div>
<p style="font-size:9.3pt"><span class="pro">יתרונות:</span> {" ".join(c["pro"])}</p>
<p style="font-size:9.3pt"><span class="con">חסרונות:</span> {" ".join(c["con"])}</p>
<p class="sml">ניווט {dots(sc4[0])}   טלפון {dots(sc4[1])}   מסגור אמנות {dots(sc4[2])}   עלות {dots(sc4[3])}</p></div>
<div class="r">{img(f"c{n}", "מבט בגובה העין (1.6 מ׳) בכניסה לרחוב, מביטים קדימה")}
<div class="r2"><div class="planbox">{pl}<div class="sml" style="margin-top:.5mm">תוכנית (מלמעלה): הכניסה מימין, החדרים הלבנים והמפתנים הצבעוניים נפתחים משני צידי הציר.</div></div>{img(f"c{n}b", "מבט שני: " + ("עומדים במעבר הצר ורואים את הככר" if n == 3 else "הולכים לאורך הרחוב ומביטים לאחור, אל הכניסה"))}</div></div></div>''')

# ---------------------------------------------------------------- 9 recommendation
plr = plan(specs[6], 'spec', cam_x=1.0)
page(f'''<div class="kick">4 · המלצה</div><h2>הציר נושם בצבע דרך התקרה והרצפה, והמפתנים הם שדות צבע</h2>
<div class="cols" style="grid-template-columns:1fr 1.2fr;margin-top:3mm"><div>
<p>לא לבחור רעיון אחד אלא לשלוש שכבות, כל אחת עושה דבר אחד:</p>
<div class="card" style="margin-bottom:2.5mm"><h3>שכבה 1: מפתנים של צבע (רעיון 1)</h3><p style="margin:0">כל תערוכה מקבלת תא צבע לפני הדלת. הצבע משלים את גוון הרחוב באותה נקודה (בצבע משלים) כדי שיבלוט. זה גרעין הרעיון, והוא נשאר גם אם נוותר על כל השאר.</p></div>
<div class="card" style="margin-bottom:2.5mm"><h3>שכבה 2: ספקטרום בתקרה ובמשקף (רעיון 2)</h3><p style="margin:0">רק התקרה הזוהרת והשתקפות הרצפה משתנות לאורך הרחוב. הקירות נשארים בהירים וניטרליים, אז לא מזייפים את היצירות (החיסרון של רעיון 2).</p></div>
<div class="card" style="margin-bottom:2.5mm"><h3>שכבה 3 (אחר כך): פעם בארבע דלתות, נשימה (רעיון 3)</h3><p style="margin:0">מעבר נמוך וצר של 8 מטרים שמאט, ובסופו מרחב רחב. עולה כסף, ולכן שלב שני. הקשתות (רעיון 4) רק בפתח הפנימי של החדר: סימן קטן, כמעט בחינם.</p></div>
<p class="sml">רעיון 5 (רצפות לפי אזור) נשאר אופציה: הוא יתן ערך בעיקר בקבוצה גדולה של תערוכות, ולא ברצף הראשון.</p></div>
<div>{img("c6", "ההרכב: תקרת ספקטרום, קירות בהירים, מפתנים בצבע משלים")}<div class="planbox" style="margin-top:2.5mm;height:62mm">{plr.replace("<svg ", "<svg style=\"height:100%;width:100%\" ", 1)}</div></div></div>''')

# ---------------------------------------------------------------- 10 comparison
rows = ''.join(f'<tr><td><b>{n}. {CONC[n]["title"]}</b></td><td>{dots(SCORES[n][0])}<div class="sml">{w}</div></td><td>{dots(SCORES[n][1])}<div class="sml">{ph}</div></td><td>{dots(SCORES[n][2])}<div class="sml">{fr}</div></td><td>{dots(SCORES[n][3])}<div class="sml">{co}</div></td></tr>' for n, w, ph, fr, co in [
 (1, 'צבע מבשר כל תערוכה, ורואים אותו מרחוק', 'משטחים שטוחים וצבע נאפה מראש: כמעט חינם', 'הרחוב ניטרלי, החדר לבן: מסגור הכי נקי', 'שני ימי עבודה: תבנית מפתן אחת עם צבע'),
 (2, 'המיקום ברור (אני בירוק), אבל לא איזו תערוכה', 'גרדיאנט אחד: חינם', 'צובע את הקירות ליד היצירות: הכי בעייתי', 'יום עד יומיים'),
 (3, 'דחיסה ושחרור: חזק בגוף, חוזר על עצמו', 'הצבע זול, אבל קירות מתעקלים וגובה משתנה עולים', 'ככרות גבוהות מתאימות ליצירות גדולות', 'שבוע: גאומטריה חדשה ואפייה'),
 (4, 'רצף קשתות מסמן קדימה, צורה חוזרת', 'הרבה משולשים, אבל פשוטים; חיתוך המסך', 'קשתות מתחרות בקירות', '4 עד 6 ימים'),
 (5, 'אזורים: ברורים אבל לא לכל תערוכה', 'טקסטורת רצפה נראית רק בתחתית המסך', 'האור הצבעוני מצייר את הקירות', '4 עד 5 ימים: חומרים ותקרות')])
page(f'''<div class="kick">5 · השוואה</div><h2>חמישה רעיונות מול ארבעה מבחנים</h2>
<p class="sml">נקודות 1 עד 5, חמש הכי טוב (בעלות: חמש הכי זול). הציונים שלי, לא מדידה. הערכות העבודה גסות ומניחות שהמערכת של חדרים (space.js) כבר קיימת.</p>
<table style="margin-top:2mm"><tr><th style="width:24mm">רעיון</th><th>בהירות ניווט</th><th>איך הטלפון מציג בזול</th><th>איך זה ממסגר את האמנות</th><th>עלות בנייה</th></tr>{rows}
<tr style="background:var(--soft)"><td><b>הרכב מומלץ</b><div class="sml">1 + 2 (תקרה) + 4 (פתח)</div></td><td>{dots(5)}<div class="sml">מפתן מבשר, ספקטרום מציין מיקום</div></td><td>{dots(5)}<div class="sml">הכול נאפה לצבעי קודקוד ותקרה אחת</div></td><td>{dots(5)}<div class="sml">קירות בהירים, צבע רק במפתן ובתקרה</div></td><td>{dots(4)}<div class="sml">ארבעה עד חמישה ימים לכל ההרכב, כשהמפתן הראשון בשני ימים</div></td></tr></table>
<div class="note"><b>למה לא רעיון 3 קודם:</b> הוא הכי מרשים בתוכנית, אבל מצמצם בדיוק את מה שאלעד ביקש להימנע ממנו: להסתבך. מתאים כשלב שני, כשיש כבר שמונה תערוכות.</div>''')

# ---------------------------------------------------------------- 11 colour choice
sw = ''.join(f'<span class="sw" style="background:{c}"></span>' for c in SS.PAL)
page(f'''<div class="kick">6 · איך נבחר הצבע של כל מפתן</div><h2>אוטומטית מהתערוכה, ולאוצר זכות לשנות</h2>
<div class="cols" style="margin-top:3mm"><div>
<div class="card"><h3>ברירת מחדל אוטומטית</h3><ol style="margin:0;padding-inline-start:5mm;font-size:9.5pt"><li>דוגמים את התמונות של היצירות בתערוכה (מוקטנות), ומחשבים 5 צבעים דומיננטיים (k-means במרחב OKLCH).</li><li>בוחרים את <b>הגוון הרווי ביותר</b> שמופיע בלפחות שתי יצירות; אם התערוכה כמעט שחור־לבן: גוון חם נייטרלי.</li><li>מכריחים את הצבע לטווח "מפתן": בהירות 0.55 עד 0.70 וכרומה מינימלית 0.12, כדי שיזהר ולא ייצא בוצי.</li><li>בודקים שהגוון רחוק לפחות 25° מגווני שני המפתנים הסמוכים, ואם לא, הולכים לגוון הבא ברשימה.</li><li>שומרים אותו כשדה אחד בתערוכה (<code>accent</code>): גוון, בהירות, כרומה.</li></ol></div>
<div class="note">הרחוב עצמו (שכבת הספקטרום) לא תלוי בתערוכות: הוא פונקציה של המיקום, כך שהוא לא נשבר כשמוסיפים תערוכה.</div></div>
<div><div class="card"><h3>בשולחן העבודה: שדה אחד בעורך התערוכה</h3>
<div style="border:1px solid var(--line);border-radius:2mm;padding:3mm;background:#FBF8F1"><div class="sml" style="margin-bottom:1.5mm">צבע המפתן</div><div style="display:flex;align-items:center;gap:3mm;margin-bottom:2mm"><span class="sw" style="width:16mm;height:16mm;background:#0F9D8A"></span><div><div style="font-weight:700">הצעה: טורקיז</div><div class="sml">נלקח מ־4 מ־6 היצירות</div></div></div>
<div class="sml" style="margin-bottom:1mm">או בחירה ידנית:</div><div>{sw}</div><div class="sml" style="margin-top:1.5mm">לחיצה על גוון מחליפה את התצוגה המקדימה ומשמרת את הבחירה.</div></div>
<p style="margin-top:2.5mm;font-size:9.5pt">אין סליידרים: שמונה גוונים מוכנים מתוך הפלטה המאושרת של המוזיאון (כדי שהרחוב ישאר הרמוני) והצעה אחת אוטומטית. הבחירה נשמרת על התערוכה, כך שאוצר שמשנה אותה לא צריך לדעת שיש "אוטומטי".</p></div>
<p class="sml" style="margin-top:2mm">לא נוגעים בקוד האפליקציה בשלב זה: כל זה הצעה. השדה שנוסף הוא שדה אחד נוסף בטבלת התערוכות (<code>accent</code>), בלי עוד מסך.</p></div></div>''')

# ---------------------------------------------------------------- 12 questions
page(f'''<div class="kick">7 · שלוש שאלות לאלעד</div><h2>מה אני צריך כדי להמשיך</h2>
<div style="display:grid;gap:5mm;margin-top:5mm">
<div class="card"><h3 style="font-size:13pt">1 · האם מתאים ההרכב המומלץ?</h3><p style="font-size:11pt;margin:0">תקרת ספקטרום, קירות בהירים, ומפתן צבע לכל תערוכה (עם קשת קטנה בפתח הפנימי בשלב שני). או שאתה מעדיף רעיון בודד אחר, כמו הציר הנושם, אפילו שהוא יקר יותר?</p></div>
<div class="card"><h3 style="font-size:13pt">2 · כמה צבעוני, כמה שקט?</h3><p style="font-size:11pt;margin:0">האם הרחוב עצמו (הקירות) יכול להיות צבעוני, גם אם זה "צובע" את היצירות התלויות בו, או שהקירות נשארים בהירים והצבע רק בתקרה ובמפתנים? ההמלצה שלי: בהירים.</p></div>
<div class="card"><h3 style="font-size:13pt">3 · מי בוחר את הצבע?</h3><p style="font-size:11pt;margin:0">ההצעה האוטומטית מהיצירות, והאוצר או האמן מחליפים בלחיצה? או שאתה רוצה שאתה תבחר, כל תערוכה, בשלב הראשון (עשר תערוכות ראשונות)?</p></div></div>''')

import re
def lat(h):
    pat = re.compile(r"[A-Za-z][A-Za-z0-9éáóíñ'.\-]*(?: [A-Z][A-Za-z0-9éáóíñ'.\-]*)*")
    return re.sub(r'>([^<>]+)<', lambda m: '>' + pat.sub(lambda k: '<bdi>' + k.group(0) + '</bdi>', m.group(1)) + '<', h)
pages[:] = [lat(x) for x in pages]
HTML = f'''<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8"><title>הרחוב · פיתוח תכנון</title>
<link href="https://fonts.googleapis.com/css2?family=Frank+Ruhl+Libre:wght@400;500;700&family=Heebo:wght@400;500;700&display=swap" rel="stylesheet">
<style>{CSS}</style></head><body>{"".join(pages)}</body></html>'''
(OUT / 'museum-street.html').write_text(HTML, encoding='utf-8')
out = OUT / 'museum-street.pdf'
subprocess.run([SS.CHROME, '--headless=new', '--disable-gpu', '--no-pdf-header-footer', '--run-all-compositor-stages-before-draw', '--virtual-time-budget=20000', f'--print-to-pdf={out}', (OUT / 'museum-street.html').as_uri()], check=True, capture_output=True)
print(out, out.stat().st_size // 1024, 'KB', len(pages), 'pages')
