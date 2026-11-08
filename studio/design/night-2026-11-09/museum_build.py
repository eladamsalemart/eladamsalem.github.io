"""Builds museum-proposal.html and museum-proposal.pdf (Hebrew, RTL) with Chrome headless.
    python studio/design/night-2026-11-09/museum_build.py
Room renders are read from studio/design/virtual-spaces/renders (found by walking up, or MUSEUM_RENDERS)."""
import os, subprocess, pathlib
HERE = pathlib.Path(__file__).resolve().parent
RDIR = pathlib.Path(os.environ.get('MUSEUM_RENDERS') or (HERE.parent / 'virtual-spaces' / 'renders'))
R = RDIR.as_uri() + '/'
def img(n): return f'{R}{n}.jpg'

CSS = '''
@page { size: A4; margin: 0; }
:root { --ink:#1B1A17; --muted:#5E594F; --line:#CFC7B6; --paper:#F6F1E7; --accent:#2F6B4F; --warm:#B5532F; --soft:#EAE2D0; }
* { box-sizing: border-box; }
html,body { margin:0; }
body { font: 10pt/1.55 Heebo, Arial, sans-serif; color: var(--ink); background:#fff; }
.pg { width:210mm; height:296mm; padding:15mm 16mm 14mm; page-break-after: always; position:relative; overflow:hidden; background:var(--paper); }
.pg:last-child { page-break-after: auto; }
.foot { position:absolute; bottom:6mm; left:16mm; right:16mm; display:flex; justify-content:space-between; font-size:8pt; color:var(--muted); }
h1 { font: 700 34pt/1.05 'Frank Ruhl Libre', serif; margin:0 0 4mm; }
h2 { font: 700 20pt/1.15 'Frank Ruhl Libre', serif; margin:0 0 3mm; }
h3 { font: 700 11.5pt/1.3 Heebo; margin:4mm 0 1mm; color:var(--accent); }
p { margin:0 0 2.5mm; }
.kick { font: 500 9pt Heebo; letter-spacing:.08em; color:var(--warm); margin-bottom:2mm; }
.lede { font-size:12.5pt; color:var(--muted); line-height:1.5; }
.cols { display:grid; grid-template-columns: 1fr 1fr; gap:6mm; }
.cols3 { display:grid; grid-template-columns: 1fr 1fr 1fr; gap:4mm; }
.card { background:#fff; border:1px solid var(--line); border-radius:3mm; padding:4mm; }
.card.acc { background:var(--accent); color:#fff; border-color:var(--accent); }
.card h3 { margin-top:0; }
.card.acc h3 { color:#F0D9A8; }
figure { margin:0; } figure img { width:100%; display:block; border-radius:2mm; }
figcaption { font-size:8pt; color:var(--muted); margin-top:1mm; }
ul { margin:0 0 2.5mm; padding-inline-start:5mm; } li { margin-bottom:1mm; }
table { width:100%; border-collapse:collapse; font-size:9pt; background:#fff; }
td,th { border:1px solid var(--line); padding:1.8mm 2.2mm; text-align:start; vertical-align:top; }
th { background:var(--soft); font-weight:700; }
.pro { color:var(--accent); font-weight:700; } .con { color:var(--warm); font-weight:700; }
.note { border-inline-start:1.2mm solid var(--warm); padding:1mm 3mm; background:#fff; margin:3mm 0; font-size:9.5pt; }
svg text { font-family: Heebo, Arial, sans-serif; }
.mock { background:#fff; border:1px solid #bbb; border-radius:3mm; overflow:hidden; box-shadow:0 1mm 3mm rgba(0,0,0,.12); }
.bar { background:#e6e0d2; height:6mm; display:flex; align-items:center; gap:1.2mm; padding:0 3mm; } .bar i { width:2.2mm; height:2.2mm; border-radius:50%; background:#b8b0a0; }
.phase { display:grid; grid-template-columns: 22mm 1fr; gap:4mm; margin-bottom:3.5mm; }
.phase .n { background:var(--accent); color:#fff; border-radius:3mm; padding:3mm 1mm; text-align:center; font: 700 18pt 'Frank Ruhl Libre'; line-height:1.1; }
.phase .n small { display:block; font: 400 8pt Heebo; margin-top:1mm; }
'''

def foot(n): return f'<div class="foot"><span>Open Studio · המוזיאון · הצעת מחקר</span><span>{n}</span></div>'
def fig(n, cap): return f'<figure><img src="{img(n)}"><figcaption>{cap}</figcaption></figure>'

pages = []

# 1 cover
pages.append(f'''<section class="pg" style="background:var(--ink);color:#F6F1E7;display:flex;flex-direction:column;justify-content:space-between">
<div><div class="kick" style="color:#E8B77A">OPEN STUDIO · הצעת מחקר · 9.11.2026</div>
<h1 style="font-size:46pt;margin-top:14mm">המוזיאון</h1>
<p class="lede" style="color:#D8D0BE;max-width:130mm">פלטפורמה שבה אלעד, כאוצר וכעורך של האפליקציה, מרכיב תערוכות מעבודות האמנים, ברשותם, כמו גיליון של מגזין, ומבקרים עוברים בו מחדר לחדר כמו במוזיאון.</p></div>
<div style="display:grid;grid-template-columns:2fr 1fr;gap:4mm"><img src="{img('skylit-hall-large')}" style="width:100%;height:100%;object-fit:cover;border-radius:2mm"><div style="display:grid;gap:4mm"><img src="{img('black-box')}" style="width:100%;border-radius:2mm"><img src="{img('japanese')}" style="width:100%;border-radius:2mm"></div></div>
<div style="font-size:9pt;color:#B9B09C">חלל, מסלול, עריכה, הרשאה, מכשירים, ושלושה כיווני תכנון עם המלצה. מחקר והצעה בלבד: לא שונה קוד באפליקציה.</div></section>''')

# 2 summary
pages.append(f'''<section class="pg"><div class="kick">בקצרה</div><h2>מה אני חושב</h2>
<p class="lede">הרעיון חזק ובר־ביצוע, כי רוב החלקים כבר קיימים. מה שחסר הוא לא עוד חדר תלת־ממדי אלא שלוש שכבות: <b>מבנה</b> (איך עוברים בין חללים), <b>עריכה</b> (כלי נוח לאוצר), ו<b>הרשאה</b> (בקשה, הסכמה וביטול).</p>
<div class="cols3" style="margin:5mm 0">
<div class="card"><h3>המלצה 1: מגזין עם בניין</h3><p>המבנה הוא גיליון (עונה, שער, תוכן עניינים), וכל כתבה בגיליון היא חדר שאפשר להיכנס אליו. לא עיר תלת־ממדית שלמה ללכת בה.</p></div>
<div class="card"><h3>המלצה 2: אוצר בדסקטופ או באייפד</h3><p>מסכים עם אלעד, בתוספת: בטלפון נשארות פעולות קצרות בלבד (לאשר, לתקן טקסט, לפרסם, להוריד).</p></div>
<div class="card"><h3>המלצה 3: הסכמה לפני עבודה</h3><p>עבודה נכנסת לתערוכה רק אחרי שהאמן אישר אותה, והאישור נבדק בכל טעינה, כך שביטול מוריד אותה מיד.</p></div></div>
<h3>הדבר היחיד שהייתי משנה בהגדרה</h3>
<p>"כמו מוזיאון עם חללים שהולכים בהם" מתאר שני דברים שונים: <b>תחושה</b> (שקט, קצב, חלל) ו<b>הליכה חופשית בתלת־ממד</b>. את התחושה אפשר לתת בכל מכשיר. הליכה חופשית בכל המבנה היא היקרה ביותר, והמחקר (Artsteps, Google Arts, Matterport) מראה שגם הם מוסיפים מפה ומסלול מודרך, כי בטלפון הליכה חופשית מבלבלת. לכן ההצעה: <b>הליכה חופשית בתוך חדר, ובין חדרים דלת ומפה.</b></p>
<div class="note">מה שהמחקר מצא: פלטפורמות שנסגרו (Mozilla Hubs נסגר ב־2024) לקחו איתן את התערוכות של כולם. לכן כל תערוכה נשמרת אצלנו כנתונים פשוטים (עבודות, טקסטים, קול), ולא תלויה בשירות חיצוני.</div>
<div class="cols"><figure><img src="{img('white-cube-large')}"><figcaption>קובייה לבנה, מהחדרים הקיימים</figcaption></figure><figure><img src="{img('salon')}"><figcaption>סלון היסטורי, מהחדרים הקיימים</figcaption></figure></div>
{foot(2)}</section>''')

# 3 existing
rows = [('עשרת החללים (Blender)','30 רינדורים (קטן/בינוני/גדול) ב־renders, ושישה משטחים מצולמים לכל חלל חד־חדרי ב־data/rooms','"חדרי התצוגה". מוכנים לשמש בסיס לכל כתבה'),
('On View','לשונית באולפן האמן (#/studio/onview), שדה virtual_shows.on_view, בלוק בראש עמוד האמן','התבנית: אמן בוחר חלל, עבודות ומילים. אותו מבנה עם אוצר'),
('virtual_shows מסוג curated','עורך בחדר הבקרה (admin.js): חלל, צבע, עבודות לפי סדר הליכה, דברי אוצר, פרסום/טיוטה','כבר "תערוכת מגזין" ראשונה. חסרים: הרשאה, גיליון, מפה'),
('הצופה ההליכה','synth.js / space.js: חדר בדפדפן, תלייה לפי מידות, נקודות אור','מספיק לחדר אחד. אין בו מעבר בין חדרים'),
('חדר הבקרה בעברית','admin.js, RTL, לשוניות אמנים/אנשים/תערוכות אוצרות','הבית של כלי העריכה החדש'),
('Home: Walk in now','שורת תערוכות שזזות לאט (החלטת הבעלים, 3.11)','הלובי: "הגיליון הנוכחי" בבית')]
tr = ''.join(f'<tr><td><b>{a}</b></td><td>{b}</td><td>{c}</td></tr>' for a,b,c in rows)
pages.append(f'''<section class="pg"><div class="kick">מה כבר קיים</div><h2>לא מתחילים מאפס</h2>
<table><tr><th style="width:30mm">רכיב</th><th>מה יש היום</th><th style="width:48mm">איך בונים עליו</th></tr>{tr}</table>
<h3>מה יש בעורך הנוכחי, ומה חסר</h3>
<div class="cols"><div class="card"><b class="pro">יש</b><ul><li>בחירת חלל וצבע קירות</li><li>עבודות ממספר אמנים, בסדר הליכה</li><li>שם, אוצר, דברי אוצר, טיוטה/פרסום</li><li>"להיכנס לחלל" לבדיקה</li></ul></div>
<div class="card"><b class="con">חסר</b><ul><li>הרשאת אמן לכל עבודה</li><li>כמה חדרים ומעבר ביניהם</li><li>גיליון, שער, תוכן עניינים</li><li>טקסט קיר לכל עבודה, וקול</li><li>סידור עבודות על הקיר בגרירה</li><li>מסך רחב: היום זה טופס בעמודה אחת עם חצים למעלה/למטה</li></ul></div></div>
<p style="margin-top:3mm">נקודה חשובה: העבודות ב־virtual_shows נשמרות כ"צילום מצב" (snapshot). בשביל ביטול הרשאה, כל טעינה של תערוכה צריכה לבדוק מול טבלת ההרשאות ולא להסתמך על הצילום.</p>
<div class="cols3">{fig('apartment-small','בית אספן')}{fig('concrete','בטון חשוף')}{fig('glass-pavilion','ביתן זכוכית')}</div>
{foot(3)}</section>''')

# 4 kinds of spaces
spaces = [('לובי','הכניסה: שער הגיליון, מפה, מה פתוח עכשיו','salon'),
('אולמות תצוגה','תערוכה אחת בחדר אחד. עשרת החללים הקיימים','white-cube'),
('מסדרון / מפתן','מעבר קצר בין חדרים: טקסט, שם הגיליון, שקט','concrete-small'),
('חדר קריאה','דברי העורך, ראיון עם האמן, קרדיטים','apartment'),
('חדר סטודיו','אמן שמראה תהליך, עבודה בעשייה','studio'),
('בית האספן','"איך זה ייראה אצלי": מכירה','apartment-large'),
('קולנוע','וידאו, הקרנה, קול','black-box'),
('גן','הפסקה: ביתן זכוכית או חדר יפני, בלי עבודות','japanese')]
cells = ''.join(f'<div class="card" style="padding:2.5mm"><img src="{img(s[2])}" style="width:100%;height:27mm;object-fit:cover;border-radius:2mm"><h3 style="margin:2mm 0 .5mm">{s[0]}</h3><div style="font-size:8.5pt;color:var(--muted)">{s[1]}</div></div>' for s in spaces)
pages.append(f'''<section class="pg"><div class="kick">שאלה 1</div><h2>סוגי החללים</h2>
<p>במוזיאון אמיתי יש שני סוגי חלל: חדרים שמראים אמנות וחדרים שעוזרים לעבור ולהבין. כדאי לתת לשניהם מקום: בלי הראשונים המוזיאון ריק, ובלי השניים אין תחושת "הליכה".</p>
<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:3mm">{cells}</div>
<h3>מה אפשר להשיג מעשרת החללים הקיימים</h3>
<table><tr><th>סוג חלל</th><th>מתוך הקיימים</th><th>מה חדש</th></tr>
<tr><td>אולם תצוגה</td><td>כולם, 3 גדלים</td><td>כלום: זה On View</td></tr>
<tr><td>קולנוע</td><td>קופסה שחורה</td><td>נגן וידאו על קיר (עבודה מסוג וידאו)</td></tr>
<tr><td>גן</td><td>ביתן זכוכית, חדר יפני</td><td>נקודת עצירה בלי עבודות, רק טקסט/קול</td></tr>
<tr><td>לובי, מסדרון, חדר קריאה</td><td>בטון, סלון ובית האספן כרקע</td><td>"חדר טקסט": בלי מסגרות, כתב גדול על הקיר</td></tr></table>
<div class="note">הצעה: לא לבנות חללים חדשים ב־Blender בשלב ראשון. הלובי והמסדרון יכולים להיות <b>מסכי עיצוב</b> (Studio Paper ויד העיפרון) ולא חדרים, כך שהחוויה אחידה עם שאר האפליקציה, והחדרים התלת־ממדיים נשארים נדירים, כמו התערוכה עצמה.</div>
{foot(4)}</section>''')

# 5 map diagram
svg_map = '''<svg viewBox="0 0 700 360" width="100%"><rect width="700" height="360" fill="#fff"/>
<g fill="#EAE2D0" stroke="#1B1A17" stroke-width="2">
<rect x="270" y="250" width="160" height="70"/><rect x="40" y="130" width="130" height="90"/><rect x="40" y="30" width="130" height="80"/><rect x="530" y="130" width="130" height="90"/><rect x="530" y="30" width="130" height="80"/><rect x="285" y="30" width="130" height="80" fill="#2F6B4F"/>
<rect x="215" y="150" width="270" height="50" fill="#fff"/></g>
<g font-size="14" text-anchor="middle" fill="#1B1A17"><text x="350" y="290" font-weight="700">לובי · שער הגיליון</text><text x="350" y="308" font-size="11">אתה כאן</text>
<text x="105" y="170">אגף א׳</text><text x="105" y="190" font-size="11">תערוכה 1</text><text x="105" y="65">אגף א׳</text><text x="105" y="85" font-size="11">תערוכה 2</text>
<text x="595" y="170">אגף ב׳</text><text x="595" y="190" font-size="11">תערוכה 3</text><text x="595" y="65">אגף ב׳</text><text x="595" y="85" font-size="11">תערוכה 4</text>
<text x="350" y="62" fill="#fff" font-weight="700">חדר הגן</text><text x="350" y="82" fill="#fff" font-size="11">הפסקה</text>
<text x="350" y="180" font-size="12">מסדרון: דברי העורך</text></g>
<g stroke="#B5532F" stroke-width="3" fill="none" stroke-dasharray="6 5"><path d="M350 250 V200"/><path d="M215 175 H170"/><path d="M485 175 H530"/><path d="M105 130 V110"/><path d="M595 130 V110"/><path d="M350 150 V110"/></g>
<circle cx="350" cy="270" r="7" fill="#B5532F"/></svg>'''
svg_issue = '''<svg viewBox="0 0 700 150" width="100%"><g font-size="13" text-anchor="middle">
<rect x="10" y="20" width="95" height="110" rx="6" fill="#1B1A17"/><text x="57" y="70" fill="#F6F1E7" font-weight="700">שער</text><text x="57" y="90" fill="#F6F1E7" font-size="10">תערוכת השער</text>
<rect x="125" y="20" width="95" height="110" rx="6" fill="#fff" stroke="#1B1A17"/><text x="172" y="70">תוכן</text><text x="172" y="90" font-size="10">מפה של הגיליון</text>
<rect x="240" y="20" width="95" height="110" rx="6" fill="#fff" stroke="#1B1A17"/><text x="287" y="70">דברי העורך</text><text x="287" y="90" font-size="10">מסדרון/קריאה</text>
<rect x="355" y="20" width="95" height="110" rx="6" fill="#2F6B4F"/><text x="402" y="70" fill="#fff" font-weight="700">תערוכות</text><text x="402" y="90" fill="#fff" font-size="10">3 עד 5 חדרים</text>
<rect x="470" y="20" width="95" height="110" rx="6" fill="#fff" stroke="#1B1A17"/><text x="517" y="70">הפסקה</text><text x="517" y="90" font-size="10">גן / קולנוע</text>
<rect x="585" y="20" width="105" height="110" rx="6" fill="#fff" stroke="#1B1A17"/><text x="637" y="70">קרדיטים</text><text x="637" y="90" font-size="10">אמנים ותודות</text></g>
<path d="M105 75 H125 M220 75 H240 M335 75 H355 M450 75 H470 M565 75 H585" stroke="#B5532F" stroke-width="2"/></svg>'''
pages.append(f'''<section class="pg"><div class="kick">שאלה 2</div><h2>איך מבקר נע: מפה, אגפים, לובי</h2>
<p>במוזיאון טוב המבקר מבין תוך שנייה איפה הוא, מה יש בצדדים, ומה הצעד הבא. מהמחקר על הכוונה במוזיאונים עולים ארבעה עקרונות שמתאימים לנו:</p>
<ul><li><b>לובי אחד</b> שמסביר ומציע: "הגיליון הזה", "המסלול הקצר" (כ־10 עד 15 עבודות), "הכל".</li><li><b>נקודות החלטה מעטות</b>: בכל חדר עד שלוש דלתות, אחת מהן ברורה כ"הבא".</li><li><b>מסלול קצר ומסלול ארוך</b> עם הפסקה בגן, נגד עייפות מוזיאון.</li><li><b>"אתה כאן"</b> על המפה, ותמיד דרך חזרה ללובי.</li></ul>
<div class="mock" style="margin:3mm 0"><div class="bar"><i></i><i></i><i></i></div>{svg_map}</div>
<figcaption style="text-align:center">איור: מפת המוזיאון. אגפים משני צדי מסדרון מרכזי, הגן בקצה, הלובי בכניסה. הקווים המקווקווים הם דלתות.</figcaption>
<h3>איך זה נראה בפועל</h3>
<p><b>בטלפון:</b> מפת אגפים מצוירת ביד (כמו הבית, Daylight by hand), הקשה על חדר פותחת אותו, ובתוך החדר מסתובבים באצבע. <b>במסך גדול:</b> אותה מפה בצד, והחדר במרכז. אין "הליכה במסדרונות": המסדרון הוא מסך קצר עם דברי העורך, שנכנסים אליו ויוצאים ממנו בהקשה.</p>
{foot(5)}</section>''')

# 6 issue structure
pages.append(f'''<section class="pg"><div class="kick">שאלה 2, המשך</div><h2>גיליון ועונה: המבנה של מגזין</h2>
<p>The Gentlewoman ו־Apartamento (חצי־שנתונים) בנויים בשלושה חלקים: פתיחה קצרה, גוף ארוך וסיום חזותי, והעורך מחליט על הסדר כעל "זרימה" ולא רק רשימה. ב־Artsy "חדרי צפייה" של גלריות עומדים כל אחד בפני עצמו ויש להם שער. אפשר לקחת את שניהם.</p>
<div class="mock" style="padding:3mm;margin:3mm 0">{svg_issue}</div>
<div class="cols"><div class="card"><h3>עונה</h3><p>לדוגמה "חורף 2026". עונה היא עטיפה לארכיון: מי שנכנס רואה את העונה הנוכחית ויכול לחזור לקודמות. קצב מוצע: גיליון כל 2 עד 3 חודשים בהתחלה, 3 עד 5 תערוכות בכל אחד.</p></div>
<div class="card"><h3>שער</h3><p>עבודה אחת של אמן אחד, עם שורה אחת. השער הוא גם התמונה בבית (Walk in now), כך שהמוזיאון נכנס לאפליקציה בלי כפתור חדש.</p></div></div>
<div class="cols" style="margin-top:4mm"><div class="card"><h3>תוכן עניינים</h3><p>הלובי עצמו: כל כתבה בגיליון היא דלת עם שם התערוכה, האמנים ומספר העבודות. אפשר לקרוא אותו כרשימה או כמפה.</p></div>
<div class="card"><h3>ארכיון</h3><p>גיליון שהסתיים נשאר, ננעל לשינויים ונשמר כפי שפורסם, כמו גיליון מודפס. עבודה שהאמן ביטל נעלמת, והמקום מסומן "הוסרה לבקשת האמן".</p></div></div>
<div class="note">תפקיד העורך: לבחור סדר, לכתוב מבוא קצר לכל גיליון, ולקבוע קצב. זה מה שהופך "אוסף תערוכות" ל"מגזין".</div>
<div class="cols">{fig('skylit-hall','שער אפשרי: אולם עם אור עליון')}{fig('loft','כתבה: לופט תעשייתי')}</div>
{foot(6)}</section>''')

# 7 concepts
pages.append(f'''<section class="pg"><div class="kick">שלושה כיוונים</div><h2>החלופות, עם יתרונות וחסרונות</h2>
<div class="cols3">
<div class="card"><h3>א׳. הגיליון</h3><p>לובי מצויר בסגנון האפליקציה, תוכן עניינים של דלתות. כל דלת פותחת חדר תלת־ממדי אחד (On View בהרחבה). אין מעבר בין חדרים.</p><p><span class="pro">יתרונות:</span> זול, מהיר, מתאים לכל מכשיר, ברור כמגזין.</p><p><span class="con">חסרונות:</span> פחות "מוזיאון", פחות הפתעה בין חדרים.</p></div>
<div class="card acc"><h3>ב׳. הגיליון עם בניין (מומלץ)</h3><p>כמו א׳, ובנוסף מפת בניין מצוירת ביד עם אגפים, מסדרונות כמסכי טקסט ודלתות. מעבר בין חדרים במצלמה שעוברת דרך הדלת.</p><p><b>יתרונות:</b> תחושת מוזיאון בלי עלות תלת־ממד של בניין שלם, ומתפתח לכיוון ג׳.</p><p><b>חסרונות:</b> דורש עיצוב מפה ומעברים, ושמירה על מספר חדרים קטן.</p></div>
<div class="card"><h3>ג׳. מוזיאון להליכה</h3><p>בניין תלת־ממדי אחד, מחובר, עם מסדרונות שהולכים בהם באצבע או בעכבר.</p><p><span class="pro">יתרונות:</span> חוויה מרשימה, דומה ל־Artsteps ו־Google Arts.</p><p><span class="con">חסרונות:</span> כבד לטלפון, כל תערוכה דורשת בנייה גיאומטרית, קשה לתחזק. הפלטפורמות המסחריות מוסיפות מפה ומסלול מודרך בדיוק בגלל זה.</p></div></div>
<h3>השוואה</h3>
<table><tr><th></th><th>א׳ גיליון</th><th>ב׳ גיליון + בניין</th><th>ג׳ הליכה</th></tr>
<tr><td>זמן עד גרסה ראשונה</td><td>2 עד 3 שבועות</td><td>5 עד 7 שבועות</td><td>3 חודשים ויותר</td></tr>
<tr><td>עלות תחזוקה לגיליון</td><td>נמוכה</td><td>נמוכה עד בינונית</td><td>גבוהה</td></tr>
<tr><td>עובד בטלפון חלש</td><td>כן</td><td>כן</td><td>לא תמיד</td></tr>
<tr><td>תחושת מוזיאון</td><td>בינונית</td><td>גבוהה</td><td>הכי גבוהה</td></tr>
<tr><td>תחושת מגזין</td><td>גבוהה</td><td>גבוהה</td><td>נמוכה</td></tr>
<tr><td>אפשר לייצא ולשמר</td><td>כן, נתונים</td><td>כן, נתונים</td><td>כבד</td></tr></table>
<div class="note">ההערכות הן שלי, לפי מה שבנוי היום (חדר אחד לכל תערוכה), בקירוב ולא לפי מדידה.</div>
{foot(7)}</section>''')

# 8 editor mockup
def thumb(n, x, y, w, h, t): return f'<div style="position:absolute;left:{x}%;top:{y}%;width:{w}%;height:{h}%;background:url({img(n)}) center/cover;border:1px solid #333;"><span style="position:absolute;bottom:0;right:0;background:#fff;font-size:6pt;padding:0 1mm">{t}</span></div>'
works = ''.join(f'<div style="display:flex;gap:2mm;align-items:center;padding:1mm;border-bottom:1px solid #ddd;font-size:7pt"><div style="width:7mm;height:7mm;background:{c}"></div><div style="flex:1">{t}<br><span style="color:#888">{a}</span></div><span style="font-size:6pt;color:{sc}">{s}</span></div>' for c,t,a,s,sc in [('#c9b79a','Untitled 4','נועה','אושר','#2F6B4F'),('#8aa39a','Garden','יעל','ממתין','#B5532F'),('#b57a63','Vessel','דן','אושר','#2F6B4F'),('#7d8aa6','Study','נועה','לא נשלח','#888')])
pages.append(f'''<section class="pg"><div class="kick">שאלה 3</div><h2>איך האוצר בונה תערוכה</h2>
<p>הכלי צריך לתמוך בארבע פעולות, בסדר הזה: <b>לבחור</b> עבודות, <b>לסדר</b> אותן על קירות החדרים, <b>לכתוב</b> טקסטים, <b>לצרף</b> קול. להלן המסך המוצע, לדסקטופ ולאייפד ברוחב. השמות באיור הם דוגמה.</p>
<div class="mock" style="margin:3mm 0"><div class="bar"><i></i><i></i><i></i><span style="font-size:7pt;margin-inline-start:4mm">חדר הבקרה · תערוכה: Green Hour · גיליון חורף 2026</span></div>
<div style="display:grid;grid-template-columns:34mm 1fr 40mm;height:98mm;font-size:7pt">
<div style="border-inline-end:1px solid #ddd;overflow:hidden"><div style="padding:1.5mm;background:#EAE2D0;font-weight:700">עבודות של אמנים</div>{works}<div style="padding:1.5mm;color:#888">סינון: אמן, אושר</div></div>
<div style="position:relative;background:#e9e4d8"><div style="position:absolute;inset:3mm;background:url({img('white-cube')}) center/cover;opacity:.55"></div>
<div style="position:absolute;inset:3mm">{thumb('salon',8,22,24,34,'Untitled 4')}{thumb('loft',38,18,30,40,'Vessel')}{thumb('studio',74,26,18,30,'Garden')}</div>
<div style="position:absolute;bottom:3mm;right:3mm;left:3mm;background:#fff;padding:1mm 2mm;display:flex;gap:2mm;align-items:center;border:1px solid #bbb"><b>חדר 1 מתוך 3</b><span style="background:#2F6B4F;color:#fff;padding:0 2mm">קיר צפוני</span><span>קיר מזרחי</span><span>קיר דרומי</span><span style="margin-inline-start:auto">מבט מלמעלה | מבפנים</span></div></div>
<div style="border-inline-start:1px solid #ddd;padding:2mm"><b>Vessel</b> · דן<br>קרמיקה, 31×22 ס"מ<hr><div style="color:#888">טקסט קיר</div><div style="border:1px solid #ccc;height:14mm;padding:1mm">דן, 2024. חימר, זיגוג אפר עץ.</div><div style="margin-top:2mm;color:#888">קול</div><div style="border:1px solid #ccc;padding:1mm;background:#f6f1e7">הקלטה: 0:48 (חדר 1)</div><div style="margin-top:2mm;color:#888">הרשאה</div><div style="color:#2F6B4F">אושרה ב־3.11, עד 3.11.2027</div></div></div></div>
<figcaption style="text-align:center">איור: מסך העריכה. ימין: ספריית עבודות (עם מצב הרשאה לכל עבודה). אמצע: הקיר, גוררים עבודות. שמאל: פרטי העבודה, טקסט, קול, הרשאה.</figcaption>
<h3>פעולות הליבה</h3>
<div class="cols"><ul><li><b>בחירה:</b> חיפוש וסינון הספרייה לפי אמן, חומר, צבע ומצב הרשאה. עבודה שלא אושרה נראית מעומעמת ואי אפשר להניח אותה.</li><li><b>סידור:</b> גרירה על קיר, הצמדה לקו עיניים (148 ס"מ כבר קיים), מרווחים אחידים, ו"תלה אוטומטית" שהאוצר מתקן אחר כך.</li></ul>
<ul><li><b>טקסטים:</b> כותרת, תיאור של שורה, ודברי אוצר לחדר.</li><li><b>שמירה ופרסום:</b> טיוטה, תצוגה מקדימה כמבקר בטלפון, ופרסום רק כשכל העבודות מאושרות.</li></ul></div>
{foot(8)}</section>''')

# 9 wall text and audio
pages.append(f'''<section class="pg"><div class="kick">שאלה 3, המשך</div><h2>טקסטי קיר וקול</h2>
<div class="cols"><div><h3>טקסט קיר (שלוש שכבות)</h3><ul><li><b>תווית:</b> שם, אמן, שנה, חומר, מידות. נמשכת אוטומטית מנתוני העבודה.</li><li><b>שורה:</b> עד 140 תווים שהאוצר כותב, ליד העבודה.</li><li><b>מאמר קצר:</b> נפתח בהקשה, 100 עד 250 מילים, אפשר גם מהאמן.</li></ul>
<p>כלל מהמחקר (Artsteps): הטקסט שייך לעבודה או לעצירה במסלול, לא למקום על הקיר. כך אפשר לשנות פריסה בלי לאבד אותו.</p></div>
<div><h3>קול</h3><ul><li><b>הקלטה לעצירה:</b> האוצר או האמן מקליטים בדפדפן ומצמידים לעבודה או לחדר.</li><li><b>אווירה לחדר:</b> צליל רקע שקט, כבוי כברירת מחדל. הטלפון לא מנגן קול בלי הקשה.</li><li><b>נגישות:</b> כל קול מלווה בתמלול כתוב.</li></ul></div></div>
<h3>איך זה נראה למבקר</h3>
<div class="cols">
<div class="mock"><div class="bar"><i></i><i></i><i></i></div><div style="position:relative;height:84mm;background:url({img('salon')}) center/cover">
<div style="position:absolute;bottom:3mm;right:3mm;left:3mm;background:rgba(255,255,255,.94);padding:2mm;font-size:8pt;border-radius:2mm"><b>Vessel</b> · דן<br>קרמיקה, 2024<br><span style="color:#B5532F">&#9654; להאזין (0:48)</span></div></div></div>
<div class="card"><h3>עיצוב</h3><ul><li>התווית קטנה ושקטה, כמו על קיר אמיתי.</li><li>הקול בכפתור אחד, בלי נגן מסורבל.</li><li>במסך צר התווית בתחתית, במסך רחב ליד העבודה.</li></ul><h3>מי כותב?</h3><p>האוצר כותב את הטקסט הראשי; האמן יכול להוסיף שורה משלו מהאולפן ("מה שאני רוצה לומר"). זה נותן לאמן תחושת שותפות ולא רק בקשה.</p></div></div>
<div class="note">שפה: האפליקציה באנגלית וחדר הבקרה בעברית. טקסטי התערוכה נכתבים באנגלית (כמו "דברי האוצר באנגלית" היום), ושדה עברי אופציונלי יתווסף כשתהיה תמיכה בעברית באפליקציה.</div>
{foot(9)}</section>''')

# 10 permission flow
svg_flow = '''<svg viewBox="0 0 700 160" width="100%"><g font-size="12" text-anchor="middle">
<rect x="5" y="30" width="120" height="70" rx="8" fill="#1B1A17"/><text x="65" y="60" fill="#fff" font-weight="700">האוצר בוחר</text><text x="65" y="80" fill="#fff" font-size="10">עבודה לתערוכה</text>
<rect x="150" y="30" width="120" height="70" rx="8" fill="#fff" stroke="#1B1A17"/><text x="210" y="60" font-weight="700">בקשה</text><text x="210" y="80" font-size="10">נשלחת לאולפן האמן</text>
<rect x="295" y="30" width="120" height="70" rx="8" fill="#fff" stroke="#1B1A17"/><text x="355" y="60" font-weight="700">התראה</text><text x="355" y="80" font-size="10">פעמון באפליקציה + מייל</text>
<rect x="440" y="30" width="120" height="70" rx="8" fill="#2F6B4F"/><text x="500" y="60" fill="#fff" font-weight="700">האמן מחליט</text><text x="500" y="80" fill="#fff" font-size="10">מאשר / דוחה / שואל</text>
<rect x="585" y="30" width="110" height="70" rx="8" fill="#fff" stroke="#B5532F" stroke-width="2"/><text x="640" y="60" font-weight="700">העבודה בתערוכה</text><text x="640" y="80" font-size="10">ניתנת לביטול תמיד</text></g>
<path d="M125 65 H150 M270 65 H295 M415 65 H440 M560 65 H585" stroke="#B5532F" stroke-width="2"/>
<path d="M640 100 C640 145 210 145 210 105" stroke="#B5532F" stroke-width="1.5" fill="none" stroke-dasharray="4 4"/><text x="425" y="152" font-size="10" fill="#B5532F" text-anchor="middle">ביטול: העבודה יורדת מיד ומסומנת "הוסרה"</text></svg>'''
pages.append(f'''<section class="pg"><div class="kick">שאלה 4</div><h2>הרשאה: איך מבקשים ואיך נותנים</h2>
<p>עיקרון: <b>הסכמה לפי עבודה ולפי תערוכה</b>, בשפה פשוטה, עם יציאה קלה. לפי הנוהג בתערוכות מקוונות, תנאי הרשאה טיפוסיים הם רישיון להצגה מקוונת, בלי בלעדיות ובלי תמלוגים, ניתן לביטול, לפעמים עם תאריך סיום. ביטול חל בדרך כלל מכאן והלאה: מה שכבר הופץ נשאר. לכן אצלנו לא מפיצים בלי הסכמה נפרדת.</p>
<div class="mock" style="padding:3mm;margin:3mm 0">{svg_flow}</div>
<div class="cols"><div class="mock"><div class="bar"><i></i><i></i><i></i><span style="font-size:7pt">אולפן האמן · בקשה חדשה</span></div><div style="padding:3mm;font-size:8.5pt;line-height:1.5">
<div style="display:flex;gap:3mm"><div style="width:22mm;height:22mm;flex:none;background:url({img('studio')}) center/cover;border-radius:2mm"></div><div><b>אלעד אמסלם מבקש להציג את Vessel</b><br>בתערוכה "Green Hour", גיליון חורף 2026<br><span style="color:#888">חדר 1, באפליקציה בלבד</span></div></div>
<hr style="border:0;border-top:1px solid #ddd"><b>מה מותר</b>: הצגה באפליקציה ובשער הגיליון<br><b>קרדיט</b>: דן כהן, Vessel, 2024<br><b>עד</b>: 3.11.2027 (אפשר לשנות)<br><b>מכירה</b>: יצירת קשר דרך האפליקציה
<div style="display:flex;gap:2mm;margin-top:3mm"><span style="background:#2F6B4F;color:#fff;padding:1mm 4mm;border-radius:8mm">מאשר</span><span style="border:1px solid #888;padding:1mm 3mm;border-radius:8mm">לא עכשיו</span><span style="border:1px solid #888;padding:1mm 3mm;border-radius:8mm">שאלה לאוצר</span></div></div></div>
<div><h3>למה "בקשה באולפן"</h3><ul><li>האמן כבר נמצא שם (עמוד האולפן וייבוא העבודות).</li><li>הקשר נשמר באפליקציה: מי ביקש, מתי, מה הוסכם.</li><li>מייל רק מזכיר; ההחלטה נעשית באפליקציה.</li></ul>
<h3>מה האמן רואה</h3><ul><li>תמונה, שם התערוכה, החלל, מי האוצר.</li><li>רשימת בקשות פתוחות ומאושרות, וכפתור "בטל" ליד כל אחת.</li></ul></div></div>
{foot(10)}</section>''')

# 11 terms
pages.append(f'''<section class="pg"><div class="kick">שאלה 4, המשך</div><h2>תנאים, קרדיט, ביטול, התראות</h2>
<div class="cols"><div class="card"><h3>תנאים (נוסח קצר, לבדיקת עורך דין)</h3><ul><li>רישיון להצגת העבודה ב־Open Studio, ללא בלעדיות, ללא תשלום.</li><li>בלי שינוי בעבודה: בלי חיתוך ובלי פילטר.</li><li>בלי שימוש בשיווק, ברשתות או בדפוס, אלא בהסכמה נפרדת.</li><li>תוקף: שנה כברירת מחדל, ניתן להארכה.</li><li>זכויות היוצר נשארות של האמן.</li></ul><p style="font-size:8.5pt;color:var(--muted)">זה תיאור של מנגנון ולא ייעוץ משפטי. לפני פתיחה לאמנים אמיתיים כדאי ייעוץ קצר לניסוח.</p></div>
<div class="card"><h3>קרדיט</h3><ul><li>שם האמן, שם העבודה, שנה, חומר, מידות, קישור לעמוד האמן.</li><li>מוצג תמיד ליד העבודה, גם במסך צר.</li><li>האמן בוחר איך שמו נכתב.</li></ul><h3>ביטול</h3><ul><li>כפתור "בטל" ליד כל הרשאה, בלי נימוקים.</li><li>העבודה יורדת מהתערוכה, מהארכיון ומהשער אם היא שם.</li><li>במקומה: "הוסרה לבקשת האמן", כך שהחדר לא נשבר.</li><li>האוצר מקבל התראה ויכול להחליף.</li></ul></div></div>
<h3>התראות</h3>
<table><tr><th>למי</th><th>מתי</th><th>איך</th></tr>
<tr><td>אמן</td><td>בקשה חדשה; תזכורת אחרי 7 ימים; התערוכה עומדת לעלות; התערוכה פורסמה</td><td>פעמון בתוך האפליקציה + מייל</td></tr>
<tr><td>אוצר</td><td>אושר / נדחה / שאלה / בוטל</td><td>סיכום בחדר הבקרה, מייל יומי אחד</td></tr>
<tr><td>אמן, בעת ביטול</td><td>אישור שהעבודה ירדה</td><td>פעמון</td></tr></table>
<h3>מודל נתונים מוצע (תוספת בלבד, מיגרציה)</h3>
<table dir="ltr" style="text-align:left;font-family:Consolas,monospace;font-size:8pt"><tr><th>table</th><th>main fields</th></tr>
<tr><td>exhibition_grants</td><td>id, show_id, work_id, artist_id, status (requested|granted|declined|revoked), terms_version, credit_line, expires_at, requested_at, decided_at</td></tr>
<tr><td>notifications</td><td>id, user_id, kind, ref_id, read_at, created_at</td></tr>
<tr><td>issues</td><td>id, season, number, title, cover_show_id, intro, status, published_at</td></tr>
<tr><td>virtual_shows (+)</td><td>issue_id, position, rooms jsonb, audio jsonb</td></tr></table>
<div class="note">כלל RLS: מבקר רואה עבודה בתערוכה רק אם קיימת הרשאה פעילה (granted ולא פגה). כך ביטול לא תלוי בצילום המצב ב־virtual_shows.works.</div>
{foot(11)}</section>''')

# 12 devices
pages.append(f'''<section class="pg"><div class="kick">שאלה 5</div><h2>מכשירים: דעתי</h2>
<p class="lede">אלעד צודק: האוצרות צריכה מסך גדול או אייפד. יש לי הסתייגות אחת ותוספת אחת.</p>
<table><tr><th>מכשיר</th><th>אוצר</th><th>מבקר</th><th>אמן</th></tr>
<tr><td><b>דסקטופ</b></td><td class="pro">עורך מלא: ספרייה, קירות, טקסט, הרשאות</td><td>מפה וחדר זה לצד זה</td><td>ניהול מלא</td></tr>
<tr><td><b>אייפד (לרוחב)</b></td><td class="pro">אותו עורך, במגע: גרירה באצבע או בעיפרון</td><td>חוויה מלאה</td><td>ניהול מלא</td></tr>
<tr><td><b>טלפון</b></td><td>פעולות קצרות בלבד: לאשר בקשה, לתקן טקסט, לפרסם או להוריד, תצוגה מקדימה</td><td class="pro">החוויה הראשית: ככה רוב המבקרים יגיעו</td><td>לאשר או לדחות בקשה</td></tr></table>
<h3>ההסתייגות</h3>
<p>עריכה בגרירה על קירות דורשת מסך. אפילו טופס מסודר, כמו היום, קשה בטלפון. לכן אני מסכים: <b>העורך המלא בדסקטופ ובאייפד בלבד</b>, ובטלפון הוא נפתח כמצב צפייה ופעולות קצרות. כך לא מבזבזים זמן על ממשק עריכה לטלפון שאף אחד לא ישתמש בו.</p>
<h3>התוספת</h3>
<p>המבקר עדיין בא קודם כול מהטלפון, כמו בכל האפליקציה. המשמעות: <b>מה שמגיע למבקר נבנה עם הטלפון כיעד</b>, והעורך הוא רק הדרך להגיע לשם. התצוגה המקדימה בעורך תהיה "כמו בטלפון" כברירת מחדל.</p>
<div style="display:grid;grid-template-columns:2fr 1fr;gap:5mm;align-items:end;margin-top:3mm">
<div class="mock"><div class="bar"><i></i><i></i><i></i><span style="font-size:7pt">עורך (מסך 1280 ומעלה)</span></div><div style="height:46mm;background:url({img('loft-large')}) center/cover"></div></div>
<div class="mock" style="border-radius:5mm"><div style="height:62mm;background:url({img('loft-small')}) center/cover"></div><div style="text-align:center;font-size:7pt;padding:1mm">המבקר בטלפון</div></div></div>
<div class="note">בדיקת מציאות: חדר הבקרה בנוי היום כעמודה צרה לטלפון. נדרשת פריסה רחבה נפרדת (שלושה פאנלים) ולא התאמה של הקיים. הערכה גסה שלי: זה בערך שליש מעבודת העורך.</div>
{foot(12)}</section>''')

# 13 MVP & phases
pages.append(f'''<section class="pg"><div class="kick">המלצה</div><h2>MVP ושלבים</h2>
<p>ה־MVP הוא <b>גיליון אחד, ארבע תערוכות, כל אחת בחדר אחד, עם הסכמות אמיתיות</b>. אם זה עובד, ממשיכים. אם לא, לא הפסדנו בנייה גדולה.</p>
<div class="phase"><div class="n">1<small>2 עד 3 שבועות</small></div><div class="card"><h3>הרשאה (בסיס האמון)</h3><ul><li>טבלאות exhibition_grants ו־notifications, בקשת הרשאה באולפן האמן, אישור, דחייה וביטול.</li><li>הכלל כבר בעורך הקיים (curated): אי אפשר לפרסם עבודה בלי אישור.</li><li>תווית וטקסט קיר בחדר הקיים.</li></ul></div></div>
<div class="phase"><div class="n">2<small>3 עד 4 שבועות</small></div><div class="card"><h3>הגיליון והלובי</h3><ul><li>issues, שער, תוכן עניינים בסגנון Studio Paper, "הגיליון הנוכחי" בבית.</li><li>כל תערוכה בחדר אחד (On View).</li><li>עורך רחב: ספרייה + קיר + פרטים, וגרירה.</li></ul></div></div>
<div class="phase"><div class="n">3<small>3 שבועות</small></div><div class="card"><h3>בניין: מפה ודלתות</h3><ul><li>מפה מצוירת, אגפים, מעבר בין חדרים במצלמה דרך הדלת.</li><li>מסלול קצר וארוך, גן, מסדרון עם דברי העורך.</li><li>קול לעצירה, ותמלול.</li></ul></div></div>
<div class="phase"><div class="n">4<small>פתוח</small></div><div class="card"><h3>הליכה חופשית (אם כדאי)</h3><ul><li>רק לתערוכות מרכזיות; GLB עם מפות אור (כבר ברשימת העתיד).</li><li>עונות, ארכיון, תערוכות אורח עם אוצרים אחרים.</li></ul></div></div>
<div class="note">טווחי הזמן הם הערכה כללית לפי הקיים, לא מדידה. שלב 1 הוא המדויק ביותר; שלב 4 אי אפשר להעריך עכשיו.</div>
{foot(13)}</section>''')

# 14 questions & references
pages.append(f'''<section class="pg"><div class="kick">סיום</div><h2>החלטות שאני צריך מאלעד</h2>
<ol><li><b>כיוון:</b> ב׳ (גיליון עם בניין) כהמלצה, או א׳ לשלב ראשון זריז?</li><li><b>קצב:</b> גיליון כל כמה זמן, ומי ארבעת האמנים הראשונים שיסכימו?</li><li><b>תנאים:</b> האם שנה היא תקופת ברירת המחדל? מי מנסח את הנוסח הסופי (מומלץ עורך דין)?</li><li><b>מכירה:</b> האם הצגה בתערוכה כוללת גם "ליצור קשר לרכישה", או רק הצגה?</li><li><b>קול:</b> האם אלעד רוצה להקליט את קולו כעורך?</li><li><b>שם:</b> "המוזיאון" או שם אחר, ובאנגלית?</li></ol>
<h3>מקורות המחקר (תת־סוכנים, מסקנות בלבד)</h3>
<ul style="font-size:9pt"><li>Google Arts & Culture: מוזיאונים ב־Street View, מפת קומה וקפיצה בין חדרים, סיורים מודרכים של שותפים.</li><li>Artsteps: בונה חדרים מבוסס רשת, נקודות מדריך עם טקסט וקול, אפליקציית נייד.</li><li>Kunstmatrix: חדרי תצוגה תלת־ממדיים ו־viewing rooms; תנאי זכויות לא נמצאו.</li><li>Matterport: מפת קומה ודגם בית בובות, תגיות לקישורים, סיור מודרך.</li><li>Mozilla Hubs נסגר ב־2024: סיבה לשמור תערוכות כנתונים.</li><li>The Gentlewoman, Apartamento: חצי־שנתונים מובנים בשלושה חלקים; Artsy: חדרי צפייה של גלריות. לא נמצאו מדיניות הסכמה ציבוריות.</li><li>Wayfinding: סוגי תכנון (שרשרת, enfilade, לולאה, ליבה ולווינים), גוגנהיים כספירלה רציפה, מסלול קצר וארוך נגד עייפות.</li><li>רישיונות לתערוכה מקוונת: רישיון לא בלעדי, ניתן לביטול, לעיתים עם תאריך סיום; ביטול חל מכאן והלאה.</li></ul>
<div class="note">הסקירה חלקית: לא נמצאו מקורות על MoMA, Hyperallergic ו־Ssense, ולא על תנאי הזכויות של Artsteps ו־Kunstmatrix. אין כאן ציטוטים, רק מסקנות.</div>
<div class="cols"><figure><img src="{img('japanese-large')}"><figcaption>חדר יפני, גדול</figcaption></figure><figure><img src="{img('glass-pavilion-large')}"><figcaption>ביתן זכוכית, גדול</figcaption></figure></div>
{foot(14)}</section>''')

HTML = f'''<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8"><title>המוזיאון · הצעת מחקר</title>
<link href="https://fonts.googleapis.com/css2?family=Frank+Ruhl+Libre:wght@400;500;700&family=Heebo:wght@400;500;700&display=swap" rel="stylesheet">
<style>{CSS}</style></head><body>{"".join(pages)}</body></html>'''
(HERE / 'museum-proposal.html').write_text(HTML, encoding='utf-8')
out = HERE / 'museum-proposal.pdf'
chrome = next(p for p in (r'C:\Program Files\Google\Chrome\Application\chrome.exe', r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe') if os.path.exists(p))
subprocess.run([chrome, '--headless=new', '--disable-gpu', '--no-pdf-header-footer', '--run-all-compositor-stages-before-draw', '--virtual-time-budget=15000', f'--print-to-pdf={out}', (HERE / 'museum-proposal.html').as_uri()], check=True, timeout=170)
print(out, out.stat().st_size // 1024, 'KB')
