"""Builds backgrounds.pdf (Hebrew, 16:9): python studio/design/night-2026-11-10/backgrounds_build.py
Needs the shots from slides_shots_all.py (app, pal): the real app screens with each scheme's CSS variables put on <body>."""
from slides_lib import *
from slides_shots_all import P

TAG = '<span class="brandtag">Open Studio · רקעים</span>'
S = []
def add(inner, cls='', foot=TAG): S.append(slide(inner, cls, len(S) + 1, foot))

def lum(h):
    h = h.lstrip('#'); c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    c = [x / 12.92 if x <= .03928 else ((x + .055) / 1.055) ** 2.4 for x in c]
    return .2126 * c[0] + .7152 * c[1] + .0722 * c[2]
def cr(a, b):
    x, y = sorted((lum(a), lum(b)), reverse=True); return (x + .05) / (y + .05)
NOW = {'--wall': '#EFE9DD', '--ink': '#1B1A17', '--muted': '#5E594F', 'dot': '#2F6B4F'}

def four(k, w=168):
    caps = {'artist': 'עמוד אמן', 'exhibition': 'תערוכה', 'map': 'מפה', 'studio': 'אולפן'}
    return ''.join(shot(f'bg_{k}_{n}', w, caps[n]) for n in ('artist', 'exhibition', 'map', 'studio'))

# 1 cover
add(f'''<div style="display:grid;grid-template-columns:1fr 420px;gap:30px;height:100%;align-items:center"><div><div class="kick">OPEN STUDIO · רקעים · 10.11.2026</div><h1 style="font-size:92px">האם השחור<br>מחמיא לה?</h1><p class="lede" style="max-width:560px">שש סכמות צבע לרקע האפליקציה, שני רעיונות לטקסטורה, כל אחד על המסכים האמיתיים (עמוד אמן, תערוכה, מפה, אולפן), עם יתרון וחיסרון והמלצה.</p><p class="small" style="opacity:.85">הכל בתוך עולם האפליקציה: Studio Paper, יד העיפרון והאטלס. הצעה בלבד: לא שונה קוד.</p></div>
<div style="display:flex;gap:14px;align-items:center;justify-content:center">{shot('bg_now_exhibition', 190)}{shot('bg_paper_exhibition', 190)}</div></div>''', 'dark-s', '')

# 2 today
add(f'''<div class="row" style="gap:36px;height:100%;align-items:center"><div style="width:400px;flex:none"><div class="kick">איפה אנחנו</div><h2>השחור לא בכל מקום: הוא ב"ערב"</h2>
<p class="small">בפועל, היום יש <b>ארבעה רקעים</b> שמתחלפים תוך כדי מעבר בין לשוניות:</p>
<ul class="l small"><li><b>נייר</b> (<code>#EFE9DD</code>): רוב האפליקציה, ועמוד האמן.</li><li><b>שמיים פסטל</b>: הבית, והכניסה.</li><li><b>אטלס</b> (<code>#F3EEE5</code>): המפה.</li><li><b>שחור "ערב"</b> (<code>#0E0E10</code>): לשונית Shows ותערוכה פתוחה עכשיו. ובנוסף: מצב כהה של הטלפון (<code>#171613</code>).</li></ul>
<div class="note small"><b>העמדה שלי:</b> השחור נכון לרגע אחד, פתיחת תערוכה בערב. הבעיה היא שהוא מופיע כשעוברים ללשונית, והמעבר מנייר לשחור הוא קפיצה.</div></div>
<div style="display:flex;gap:16px">{shot('home', 168, 'בית: שמיים')}{shot('artists', 168, 'אמנים: נייר')}{shot('shows', 168, 'Shows: שחור')}{shot('map', 168, 'מפה: אטלס')}</div></div>''', '')

# 3 principles
add(f'''<div class="kick">עקרונות</div><h2>מה רקע טוב צריך לעשות לאמנות</h2>
<div class="g3" style="margin-top:14px"><div class="card c-sun"><h3>1. לא להתחרות בעבודה</h3><p class="small">רקע ניטרלי וחם, ללא צבע חזק, כדי שציור לא ייראה אחרת ממה שהוא.</p></div>
<div class="card c-mint"><h3>2. משפחה אחת</h3><p class="small">אותם גוונים בכל המסכים. כשיש "ערב", הוא גרסה כהה של אותה משפחה, לא עולם אחר.</p></div>
<div class="card c-lav"><h3>3. קריא לכולם</h3><p class="small">ניגוד AA לפחות (4.5 לטקסט רגיל). נבדק למטה בכל סכמה.</p></div>
<div class="card c-peach"><h3>4. מעבר רך</h3><p class="small">מעבר בין לשוניות לא צריך להרגיש כמו הדלקת אור באולם חשוך.</p></div>
<div class="card c-terra"><h3>5. לא לגעת בבית</h3><p class="small">הבית נעול לפי הבעלים. ההצעות כאן לא משנות אותו.</p></div>
<div class="card c-navy"><h3>6. היד והאטלס</h3><p class="small">עיפרון רק על מה שחי עכשיו; מפה בצבעי אטלס. הרקע תומך בהם ולא מתחרה.</p></div></div>
<p class="small muted" style="margin-top:12px">איך נעשו הצילומים: האפליקציה האמיתית בטלפון (390x844), עם משתני הצבע של כל סכמה מוחלפים אחרי הציור. דברים שמקודדים בקשיחות בתוך המסכים (למשל כרטיס הגיבור של Shows) נשארו כפי שהם, ולכן הם מראים בדיוק מה ישתנה ומה לא.</p>''')

# 4 overview swatches
ORDER = [('now', 'היום', '#EFE9DD · ערב #0E0E10'), ('paper', 'נייר חם', '#F6F1E7'), ('pastel', 'שמיים פסטל', '#E9E4F4'), ('grey', 'אפור חם', '#DAD6CE'), ('sage', 'מרווה', '#DCE3D5'), ('cocoa', 'קקאו', '#2B2622'), ('dusk', 'דמדומים', '#202B3B')]
def swatch(k, name, hexs):
    pal = P.get(k)
    w = pal['--wall'] if pal else '#EFE9DD'; p = pal['--paper'] if pal else '#F6F1E7'; ink = pal['--ink'] if pal else '#1B1A17'; dot = pal['--dot'] if pal else '#2F6B4F'
    return f'<div class="card" style="padding:12px"><div class="swatch" style="background:{w};position:relative"><div style="position:absolute;inset:14px 40% 14px 14px;background:{p};border-radius:8px"></div><div style="position:absolute;right:14px;top:14px;width:22px;height:22px;border-radius:50%;background:{dot}"></div><div style="position:absolute;right:14px;bottom:14px;font:700 17px Heebo;color:{ink}">Aa</div></div><h3 style="margin-top:8px;font-size:20px">{name}</h3><div class="small muted en">{hexs}</div><div class="small en" style="font-weight:700">ink {cr(ink, w):.1f}:1</div></div>'
add(f'''<div class="kick">שש סכמות, ועוד אחת של היום</div><h2>הרקע, הכרטיס, הדיו והנקודה הירוקה</h2><div class="g4" style="grid-template-columns:repeat(7,1fr);gap:14px;margin-top:16px">{"".join(swatch(*o) for o in ORDER)}</div>
<p class="small" style="margin-top:8px">כל סכמה משנה את אותם ארבעה משתנים שכבר באפליקציה (<code>--wall</code> רקע, <code>--paper</code> כרטיס, <code>--ink</code> דיו, <code>--dot</code> הנקודה), כך שמעבר לאחת מהן הוא החלפת ערכים ולא עיצוב מחדש.</p>''', '')

# 5-10: one per scheme
INFO = {
 'paper': ('נייר חם', 'הרקע הוא הגוון של כרטיסי האפליקציה: נייר קרם, כמעט לבן. מה שהיה "כרטיס" הופך לקיר.', 'הכי קרוב לעולם הקיים. ציורים נראים טבעיים, וטקסט ארוך נעים לקריאה.', 'פחות דרמה: ציורים כהים מאבדים טיפה, ושאר המסכים הופכים דומים מדי.'),
 'pastel': ('שמיים פסטל', 'סגול־לבנדר רך, מהשמיים של הבית. כשם שבבית הוא חי, כאן הוא רק רקע.', 'מחבר לבית ולכניסה, שמח ומזמין.', 'צבע שנכנס לתוך הציורים (סגול על כחול של ואן גוך). לטקסט ארוך הוא עייף. מתאים לקליטה ולרגעים קצרים, לא לכל האפליקציה.'),
 'grey': ('אפור חם', 'אפור של קיר גלריה, לא קר. ניטרלי לגמרי.', 'ציורים בולטים, ולא "מתערבב" עם הכרטיסים. נקי.', 'משרדי ועמום, בלי חום האפליקציה, ויש פחות הבדל בין רקע לכרטיס.'),
 'sage': ('מרווה', 'ירוק־אפור בהיר, שמתיישב עם הירוק של האפליקציה.', 'רך ומיוחד, "קיר מוזיאון"; הנקודה הירוקה מתחברת אליו.', 'חזק לטעם מסוים: פחות ניטרלי מציורים אדומים/חמים, ופחות אוניברסלי.'),
 'cocoa': ('קקאו כהה', 'חום־קפה עמוק במקום שחור: אותו ערב, אבל חם, בנוי על הנייר.', 'שומר את הדרמה של "ערב" בלי השחור, וחם יותר לעין. מתיישב עם משפחת הנייר.', 'עדיין כהה, ולכן רק לרגע הזה. צריך לוודא ניגוד לטקסטים הקטנים בתוך הכרטיסים.'),
 'dusk': ('כחול דמדומים', 'כחול־לילה בינוני, מרגיש כמו "ערב" טהור.', 'הכי "ערב" ובולט, והצהוב של הכפתור מקבל קונטרסט יפה.', 'קר מול הנייר החם, ומתנגש עם הכחול הכהה של האמנים (#1F2A44). מייצר שני "כחולים".'),
 'paper_grain': ('נייר + גרגר', 'אותו נייר חם עם גרגר נייר עדין מאוד (רעש בחוזק 5%).', 'נותן תחושה של חומר: נייר ולא מסך. כמעט לא מורגש עד שמחליפים.', 'מפריע לטקסט קטן אם חזק מדי, ומוסיף מעט משקל לדף. לא על תמונות.'),
 'paper_grid': ('נייר + משבצות', 'רשת דקה של מחברת שרטוט, 24 פיקסלים.', 'מתאים בדיוק לאולפן ולעורך On View: זה "שולחן עבודה", רמז לתכנון חלל.', 'לא לכל המסכים: ברשימות וטקסט הרשת מסיחה. מתאים רק למקומות עריכה.')}
for k in ('paper', 'pastel', 'grey', 'sage', 'cocoa', 'dusk', 'paper_grain', 'paper_grid'):
    nm, idea, pro, con = INFO[k]; pal = P[k]
    c1, c2 = cr(pal['--ink'], pal['--wall']), cr(pal['--muted'], pal['--wall'])
    add(f'''<div class="row" style="gap:34px;height:100%;align-items:center"><div style="width:310px;flex:none"><div class="kick">סכמה {len([1 for x in S]) - 3}</div><h2>{nm}</h2><div class="swatch" style="background:{pal['--wall']};margin-bottom:12px"></div><p class="small">{idea}</p><p class="small"><span class="pro">יתרון:</span> {pro}</p><p class="small"><span class="con">חיסרון:</span> {con}</p><p class="small muted en">ink {c1:.1f}:1 · muted {c2:.1f}:1</p></div><div style="display:flex;gap:12px;flex:1;justify-content:space-between">{four(k, 163)}</div></div>''')

# 12 textures
tex = [('גרגר נייר', '<code>body::before</code> עם רעש SVG בחוזק נמוך. סטטי, לא זז.', 'background-image:url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'160\' height=\'160\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'.8\' numOctaves=\'2\'/%3E%3CfeColorMatrix values=\'0 0 0 0 .45 0 0 0 0 .38 0 0 0 0 .28 0 0 0 .22 0\'/%3E%3C/filter%3E%3Crect width=\'160\' height=\'160\' filter=\'url(%23n)\'/%3E%3C/svg%3E");background-color:#F6F1E7'),
       ('נייר שרטוט', 'רשת של 24 פיקסלים בשני קווים דקים. רק באולפן.', 'background-color:#F6F1E7;background-image:linear-gradient(rgba(60,50,30,.12) 1px,transparent 1px),linear-gradient(90deg,rgba(60,50,30,.12) 1px,transparent 1px);background-size:20px 20px'),
       ('נייר דק (טרייסינג)', 'שכבה מעט שקופה לבנה מעל תמונה, כמו הנייר של העיפרון בבית.', 'background:linear-gradient(135deg,#EDE7D8,#FBF8F1 55%,#E6DECC)'),
       ('טיח', 'שיפוע עדין מאוד בין שני גוונים של קיר. נראה "אור מהחלון".', 'background:radial-gradient(120% 80% at 20% 0%,#FBF7EE,#E8E0D0)')]
tx = ''.join(f'<div class="card" style="padding:10px"><div style="height:70px;border-radius:12px;border:1px solid rgba(0,0,0,.15);{c}"></div><h3 style="margin-top:8px;font-size:21px">{n}</h3><p class="small muted" style="margin:0">{d}</p></div>' for n, d, c in tex)
add(f'''<div class="kick">טקסטורה</div><h2>רעיונות לחומר, בלי להכביד</h2><div class="g4">{tx}</div>
<div class="row" style="gap:30px;margin-top:20px;align-items:center"><div style="flex:1"><p class="small"><b>כלל אצבע:</b> הטקסטורה היא על הרקע בלבד, לעולם לא על תמונות ולא מתחת לטקסט קטן; כבויה בגודל קטן (<span class="en">prefers-reduced-data</span>); ובלי הנפשה.</p><p class="small"><b class="pro">מומלץ לבדוק:</b> גרגר, באולפן ובדף האמן. <b class="con">לא מומלץ:</b> טיח בבית ובמפה (המפה ממילא היא טקסטורה).</p></div>{shot('bg_paper_grain_studio', 128, 'אולפן עם גרגר')}{shot('bg_paper_grid_studio', 128, 'אולפן עם משבצות')}</div>''', '')

# 13 hybrid
add(f'''<div class="row" style="gap:36px;height:100%;align-items:center"><div style="width:400px;flex:none"><div class="kick">רעיון</div><h2>יום לקריאה, ערב לצעידה</h2><p>הרעיון המרכזי: כל האפליקציה בנייר החם, ורק שני רגעים מקבלים "ערב": לשונית Shows ותערוכה שפתוחה עכשיו, אבל בקקאו במקום בשחור.</p><p class="small">כך המעבר ללשונית הוא עדין (חום על קרם), והרגע של "ערב" נשאר, כי צבע חם כהה מחמיא לתמונות לא פחות משחור ומעייף פחות.</p><div class="note small">מצב כהה של הטלפון: אותה משפחה (קקאו) במקום <code>#171613</code>.</div></div>
<div style="display:flex;gap:14px">{shot('bg_paper_artist', 168, 'עמוד אמן: נייר')}{shot('bg_cocoa_shows', 168, 'Shows: קקאו')}{shot('bg_cocoa_exhibition', 168, 'תערוכה פתוחה: קקאו')}{shot('bg_paper_studio', 168, 'אולפן: נייר')}</div></div>''', 'peach-s')

# 14 recommendation
add(f'''<div class="kick">ההמלצה</div><h2>נייר, קקאו לערב, גרגר עדין</h2>
<div class="g3" style="margin-top:12px"><div class="card c-sun"><h3>1. בסיס: נייר חם</h3><p class="small"><code>--wall:#F6F1E7</code> (היום <code>#EFE9DD</code>), עם כרטיסים בלבן־קרם. מעט בהיר יותר, בלי להשתנות באופיו.</p></div>
<div class="card c-navy"><h3>2. ערב: קקאו במקום שחור</h3><p class="small"><code>#2B2622</code> ל־Shows ולתערוכה פתוחה, ול־theme-color. מצב כהה של הטלפון באותה משפחה.</p></div>
<div class="card c-mint"><h3>3. אולפן: נייר שרטוט</h3><p class="small">משבצת עדינה רק מאחורי עורך On View (שולחן עבודה). בעמוד האמן ובשאר המקומות: גרגר נייר בלבד, אופציונלי.</p></div>
<div class="card c-lav"><h3>4. פסטל: רק בכניסה</h3><p class="small">שמיים פסטל לכניסה ולסיור הקליטה (ארגון עם הבית), לא לשאר.</p></div>
<div class="card c-peach"><h3>5. אטלס: כמו שהוא</h3><p class="small">מפה בצבעי אטלס ו־<code>#F3EEE5</code>. לא נוגעים.</p></div>
<div class="card c-terra"><h3>6. בית: לא נוגעים</h3><p class="small">הוא נעול לפי הבעלים.</p></div></div>
<div class="note"><b>למה לא סכמות אחרות:</b> אפור נראה משרדי, מרווה דורשת עוד החלטות צבע, דמדומים יוצר "כחול שני" מול הכחול של האמנים, ופסטל לכל האפליקציה מתחרה בציורים.</div>''', '')

# 15 implementation
add(f'''<div class="kick">איך מיישמים</div><h2>החלפת ערכים, לא עיצוב מחדש</h2>
<table style="font-size:17px"><tr><th style="width:230px">מה</th><th>איפה</th><th style="width:200px">גודל</th></tr>
<tr><td>רקע וכרטיס של נייר</td><td><code>:root{{--wall,--paper,--card}}</code> ב־<code>index.html</code> (שורה 27)</td><td>שני ערכים</td></tr>
<tr><td>"ערב" בקקאו</td><td><code>body[data-look="night"]</code> (שורה 525) והערכים הקשיחים של <code>.nx-*</code> (למשל גרדיאנט הכרטיס)</td><td>בלוק אחד, ובדיקה</td></tr>
<tr><td>מצב כהה של הטלפון</td><td><code>:root{{...}}</code> תחת <code>prefers-color-scheme</code> (שורות 34 ו־35)</td><td>שני בלוקים</td></tr>
<tr><td>צבע שורת הדפדפן</td><td><code>theme-color</code> ב־<code>app.js</code> (שורה 1058): <code>#0E0E10</code> ל"ערב"</td><td>שורה אחת</td></tr>
<tr><td>גרגר ומשבצות</td><td>כלל CSS אחד על <code>body::before</code>, ו־<code>body[data-look]</code> לאולפן</td><td>פחות מ־10 שורות</td></tr>
<tr><td>בדיקה</td><td>health.cjs (iPhone), מצב כהה, ניגוד AA, ושעת ה"ערב" בתערוכה</td><td>כמו כל שינוי</td></tr></table>
<p class="small" style="margin-top:10px">שום דבר מזה לא נעשה הלילה. כל הצילומים כאן נוצרו בהחלפת משתנים בדפדפן בלבד, כך שהם מייצגים נכון את התוצאה, אבל לא הוכחה: צריך לבדוק בפועל בטלפון.</p>''', '')

# 16 decisions
add(f'''<div class="kick">מה צריך ממך</div><h2>שלוש החלטות</h2>
<div class="g3" style="margin-top:12px"><div class="card"><h3>1. אפשר להזיז את השחור?</h3><p class="small">מקקאו שחור־חום, או להשאיר שחור אמיתי רק במצב כהה של הטלפון.</p></div>
<div class="card"><h3>2. טקסטורה</h3><p class="small">גרגר בכל האפליקציה, רק באולפן, או בלי. ההמלצה: גרגר עדין ורק על נייר, משבצת רק בעורך On View.</p></div>
<div class="card"><h3>3. פסטל</h3><p class="small">האם הכניסה והסיור (לאמנים ולחובבי אמנות) מקבלים שמיים פסטל, כמו בבית?</p></div></div>
<div class="note">אחרי שתבחר, הבנייה היא יום עבודה כולל בדיקות בטלפון, כי רוב הערכים כבר מרוכזים במשתנים.</div>''', 'sun-s')

write_pdf('backgrounds', 'Open Studio · רקעים', S)
