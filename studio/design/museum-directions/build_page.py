# Builds index.html (the Hebrew document that becomes museum-directions.pdf) from parts/part1-3.html (research chapters), ideas.py (the five ideas) and the renders in img/.
#   python studio/design/museum-directions/prep_imgs.py   then   python studio/design/museum-directions/build_page.py
import io, os, html, sys
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
from ideas import IDEAS
e = html.escape
def img(name, cap='', cls=''):
    p = os.path.join(HERE, 'img', name + '.jpg')
    return f'<figure class="{cls}"><img src="img/{name}.jpg" alt="">' + (f'<figcaption>{e(cap)}</figcaption>' if cap else '') + '</figure>' if os.path.exists(p) else ''
def part(n):
    p = os.path.join(HERE, 'parts', f'part{n}.html')
    return io.open(p, encoding='utf-8').read() if os.path.exists(p) else f'<h2>חלק {n}</h2><div class="note">הפרק עדיין לא נכתב.</div>'

def idea(d):
    k = d['k']
    hours = ''
    if k == '3': hours = '<div class="eye">' + ''.join(img(f'3-e1-h{h}', c) for h, c in [(9, 'בבוקר (9:00): הכתם נמוך ומערבי'), (15, 'אחר הצהריים (15:00)'), (22, 'בלילה (22:00): כוכבים בכיפה, פנסים על הפדסטלים')]) + '</div>'
    if k == '4': hours = '<div class="two">' + ''.join(img(f'4-e1-h{h}', c) for h, c in [(9, 'בוקר (9:00): נקודות אור ארוכות'), (16, 'אחר הצהריים (16:00): הנקודות זזו')]) + '</div>'
    rows = ''.join(f'<tr><th>{e(a)}</th><td>{e(b)}</td></tr>' for a, b in d['hold'])
    pros = ''.join(f'<li>{e(x)}</li>' for x in d['pros']); cons = ''.join(f'<li>{e(x)}</li>' for x in d['cons'])
    return f'''<section class="idea" id="i{k}">
<div class="head"><span class="letter">{k}</span><div><h2>{e(d['he'])} <span class="en">{e(d['en'])}</span></h2><p class="tag">{e(d['tag'])}</p></div></div>
<p class="src"><b>על מה זה נשען:</b> {e(d['src'])}</p>
<h3>הרעיון</h3><p>{e(d['idea'])}</p>
<div class="two">{img(k + '-plan', 'תוכנית (10 מ׳ לפי הסרגל). קו מקווקו: הרחבה עתידית')}{img(k + '-air', 'מבט מהאוויר: כך נראה הבניין מבחוץ, עם הגג')}</div>
<h3>המסלול של המבקר</h3><p>{e(d['route'])}</p>
<h3>אור וחתך</h3><p>{e(d['light'])}</p>
{img(k + '-section', 'חתך: איפה נכנס האור, ובאילו גבהים')}
<div class="eye">{img(k + '-e1', 'בגובה העיניים: מהכניסה')}{img(k + '-e2', 'בגובה העיניים: בתוך הרצף')}{img(k + '-e3', 'בגובה העיניים: מקום אחר')}</div>
{hours}
<h3>איך זה מחזיק את התוכנית שלך</h3><table class="prog">{rows}<tr><th>שמונת הסלוטים</th><td>{e(d['mapped'])}</td></tr></table>
<div class="two t"><div><h3>ריאליזם בטלפון: אילו טכניקות</h3><p>{e(d['real'])}</p></div><div><h3>נוחות בטלפון</h3><p>{e(d['phone'])}</p></div></div>
<h3>מה זה עולה אצלנו</h3><p>{e(d['effort'])}</p>
<div class="two pc"><div><h3>יתרונות</h3><ul>{pros}</ul></div><div><h3>חסרונות</h3><ul>{cons}</ul></div></div>
</section>'''

# ---- the comparison: the owner's tests (from OWNER-BRIEF) and our costs
TESTS = [
 ('', '1 ספירלה צומחת', '2 בית החדרים', '3 שעון האור', '4 תחת שמיים אחד', '5 מסגרת מחברת'),
 ('בניין אחד עם קירות וגג', 'כן', 'כן', 'כן', 'כן (גג אחד על הכול)', 'כן (קליפה שקופה)'),
 ('אולם מרכזי עם קוליסות ופדסטלים', 'כן', 'כן', 'כן, הכי חזק', 'כן (כיכר)', 'כן (תאים ריקים)'),
 ('לא סימטרי ולא "חדרים"', 'בינוני: ריבוע', 'כן', 'לא: רדיאלי', 'כן: עיירה', 'בינוני: רשת'),
 ('מרחב פתוח בין התערוכות', 'חלקי (האולם)', 'חלקי', 'האולם בלבד', 'הכי חזק', 'חזק'),
 ('תערוכות שמתחלפות לאורך זמן', 'טוב (זרוע)', 'טוב (חדר)', 'טוב (גלריה)', 'טוב (בית)', 'הכי טוב (קופסה בעגורן)'),
 ('היסטוריה שמתרחבת בהליכה', 'הכי טבעי', 'טוב (טלסקופ)', 'טוב (גלריה לתקופה)', 'טוב (רחוב בתים)', 'טוב (רכבת קופסאות)'),
 ('אור יום מחלונות ומגג, לפי שעה', 'סדק + חלונות', 'חדר לכל אור', 'שמש נעה: הכי חזק', 'כתמי אור נעים', 'קליפה שקופה'),
 ('נוחות וביצועים בטלפון', 'טובה (סטרימינג)', 'טובה (חדרים קטנים)', 'טובה', 'טובה (חיתוך)', 'טובה מאוד'),
 ('אופי ואווירה ("מיוחד")', 'גבוהה', 'גבוהה מאוד', 'הכי גבוהה', 'גבוהה', 'בינונית'),
 ('מאמץ ראשון (ימי עבודה, הערכה)', '4 עד 6 (שטוח) / 12 עד 18', '4 עד 6 + 6 (S)', '7 עד 10 (B)', '5 עד 7 (S) + אפייה', '5 עד 7 + 3 עד 4'),
 ('שינוי בצופה', 'גובה רצפה (בהמשך)', 'אין', 'אין (גיאומטריה עגולה)', 'אין', 'אין'),
]
def compare():
    head = '<tr>' + ''.join(f'<th>{e(c)}</th>' for c in TESTS[0]) + '</tr>'
    rows = ''.join('<tr>' + ''.join((f'<th>{e(c)}</th>' if i == 0 else f'<td>{e(c)}</td>') for i, c in enumerate(r)) + '</tr>' for r in TESTS[1:])
    return f'<table class="cmp"><thead>{head}</thead><tbody>{rows}</tbody></table>'

def overview():
    cards = ''.join(f'<a class="card" href="#i{d["k"]}">' + img(d['k'] + '-air') + f'<b>{d["k"]} · {e(d["he"])}</b><span>{e(d["tag"])}</span></a>' for d in IDEAS)
    return f'<div class="cards">{cards}</div>'

FIRST = [('A', 'הפאלאצו', 'טבעת חדרים סביב חצר-אולם', 'התגלגל לרעיון 4 (עיירה סביב כיכר) ולרעיון 2 (החדרים)'), ('B', 'הספינה והקפלות', 'אולם ארוך עם חדרים בצדדים וטרנספט', 'נשאר כהשראה לאולם מרכזי ולטרנספט הרנסנס; נדחה כי ישר מדי'), ('C', 'רשת הקמרונות', 'מודול קמרון חוזר עם סדק אור', 'הסדק נכנס לרעיון 1 (הספירלה) וחדרים גבוהים ברעיון 2'), ('D', 'הלוח והקופסאות', 'אולם זכוכית מעל גלריות כהות', 'נדחה לסוף: צריך מדרגות בצופה; הזכוכית והנוף נשארו כנושא'), ('E', 'הרמפה', 'מסלול עולה סביב חלל מרכזי', 'התגלגל לרעיון 1: שיפוע מתון (3.5%) ובלי מדרגות'), ('F', 'החדרים השקטים', 'בלוק לבנים עם חדרים שונים', 'התפתח לרעיון 2 עם לוחות סואן וטלסקופ')]
def first():
    cells = ''.join(f'<div class="card">' + img(k + '-air') + f'<b>{k} · {e(n)}</b><span>{e(t)}</span><span class="fate">{e(f)}</span></div>' for k, n, t, f in FIRST)
    return f'<div class="cards">{cells}</div>'

CSS = '''
:root{--ink:#22201c;--muted:#6d675d;--paper:#f6f2ea;--card:#fffdf8;--line:#d9d2c3;--accent:#8a4b2c}
*{box-sizing:border-box}
body{margin:0;background:var(--paper);color:var(--ink);font:16px/1.62 "Segoe UI","Arial Hebrew",Arial,sans-serif}
main{max-width:1080px;margin:0 auto;padding:34px 20px 80px}
h1{font:600 44px/1.12 Georgia,"Times New Roman",serif;margin:0 0 10px}
h2{font:600 28px/1.2 Georgia,serif;margin:0 0 6px}h2 .en{font-size:17px;color:var(--muted);font-weight:400;margin-inline-start:8px}
h3{font-size:17px;margin:20px 0 6px}h4{font-size:15.5px;margin:0 0 4px}
p{margin:0 0 11px;max-width:74ch}.lead{font-size:19px;color:var(--muted)}
.cover{padding:30px 0 10px;min-height:60vh}
.part{break-before:page;margin-top:40px}
.idea{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:24px;margin-top:30px;break-before:page}
.head{display:flex;gap:16px;align-items:center;margin-bottom:8px}
.letter{flex:none;width:54px;height:54px;border-radius:50%;background:var(--accent);color:#fff;font:600 28px/54px Georgia,serif;text-align:center}
.tag{color:var(--muted);margin:2px 0 0}.src{font-size:14px;color:var(--muted)}
figure{margin:0}figcaption{font-size:12.5px;color:var(--muted);margin-top:3px}
img{width:100%;display:block;border-radius:8px;border:1px solid var(--line)}
.two{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin:12px 0}
.eye{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:12px 0}
.idea>figure{margin:12px 0}
table{border-collapse:collapse;width:100%;font-size:14.5px}
th,td{text-align:right;vertical-align:top;padding:6px 8px;border-bottom:1px solid var(--line)}
.prog th{width:9em;color:var(--muted);font-weight:600;white-space:nowrap}
ul,ol{margin:0 0 10px;padding-inline-start:20px}li{margin-bottom:4px}
.pc h3{margin-top:4px}.t p{font-size:14.5px}
.cmp{font-size:12.5px}.cmp th{background:#efe9dc;font-weight:600}.cmp td:first-child,.cmp tbody th{font-weight:600}
.cards{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin:14px 0}
.card{display:block;background:var(--card);border:1px solid var(--line);border-radius:10px;padding:8px;text-decoration:none;color:var(--ink)}
.card img{border:0;margin-bottom:6px}.card b{display:block;font-size:14.5px}.card span{display:block;font-size:12.5px;color:var(--muted)}.card .fate{color:var(--accent);margin-top:3px}
.note{background:#fbf3e4;border:1px solid #ecd9b4;border-radius:10px;padding:12px 15px;margin:14px 0}
.box{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:16px 20px;margin:16px 0}
.rec{border:2px solid var(--accent);background:var(--card);border-radius:14px;padding:22px;margin-top:26px}
blockquote.q{margin:8px 0;padding:6px 14px;border-inline-start:3px solid var(--accent);background:#fbf7ee;color:#3b362f;font-size:14.5px}
.tl th{background:#efe9dc}.mcard{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:10px 14px;margin:10px 0;break-inside:avoid}
.uv{display:inline-block;background:#f3e3c4;color:#6a4a12;border-radius:4px;padding:0 5px;font-size:12px;white-space:nowrap}
.toc li{margin-bottom:2px}
code{direction:ltr;unicode-bidi:embed;font:13px Consolas,monospace;background:#efe9dc;padding:1px 5px;border-radius:4px}
@media screen and (max-width:760px){.two,.eye,.cards{grid-template-columns:1fr}}
@media print{body{background:#fff;font-size:12.4px}main{padding:0;max-width:none}.idea{padding:12px;margin-top:0;border:0}h1{font-size:34px}.cmp{font-size:9.4px}img{max-height:400px;object-fit:contain}.eye img{max-height:205px}.cards img{max-height:150px}.part{margin-top:0}}
@page{size:A4;margin:11mm}
'''

def main():
    ideas = '\n'.join(idea(d) for d in IDEAS)
    page = f'''<!doctype html>
<html lang="he" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>המוזיאון: מסע, מחקר וחמישה רעיונות</title><style>{CSS}</style></head><body><main>
<div class="cover">
<h1>המוזיאון של Open Studio</h1>
<p class="lead">מסע הרעיון, מחקר על מוזיאונים ועל אדריכלות דיגיטלית, והטכנולוגיה שלנו: ובסוף חמישה רעיונות לבניין אחד, עם תוכניות, חתכים ותמונות מכמה זוויות, השוואה והמלצה.</p>
<p>נכתב ב־16.11.2026, לאלעד אמסלם. הציורים והפסלים בתמונות הם מהאוסף של האפליקציה; הבניינים בתמונות הם <b>מודלי סקיצה בתלת-ממד</b> שנבנו כדי לבחור, ולא העיצוב הסופי. מידות הבניינים הן להמחשה.</p>
<div class="box"><h3 style="margin-top:0">מה במסמך</h3><ol class="toc">
<li><b>חלק א׳:</b> המסע של הרעיון: מה אמרת, מה נבנה, מה נדחה ולמה.</li>
<li><b>חלק ב׳:</b> איך מוזיאונים נבנים: איך אדריכלים חושבים, מוזיאונים מפורסמים, חוויית המבקר.</li>
<li><b>חלק ג׳:</b> אדריכלות דיגיטלית והטכנולוגיה שלנו: מה בניין וירטואלי יכול, איפה אנחנו היום, איך מעלים את הריאליזם בטלפון.</li>
<li><b>חלק ד׳:</b> חמישה רעיונות לבניין, השוואה והמלצה.</li>
<li><b>נספחים:</b> שש הסקיצות הראשונות, מה אומת ומה לא.</li></ol></div>
<div class="note"><b>איך לקרוא את הסימונים:</b> <span class="uv">לא מאומת</span> = משהו שלא נבדק מול מקור שנקרא במחקר. "הערכה" = שיפוט שלנו, לא מדידה. אף אחד מהמספרים של ביצועים בטלפון לא נמדד על אייפון אמיתי.</div>
</div>
<div class="part">{part(1)}</div>
<div class="part">{part(2)}</div>
<div class="part">{part(3)}</div>
<div class="part">
<h2>חלק ד׳: חמישה רעיונות לבניין אחד</h2>
<p>אחרי החלקים הקודמים, הכללים ברורים. הנה המבחנים שעולים מהמסע שלך, ובהם נשפוט: <b>בניין אחד עם גג וחלונות</b> (בלי בתים בפארק); <b>אולם מרכזי עם קוליסות ופדסטלים</b> של יצירות בודדות; <b>לא סימטרי ולא "חדרים"</b>; <b>מרחב פתוח בין התערוכות</b>; <b>בסיס חזק ותערוכות שמתחלפות</b>; <b>היסטוריה שמתרחבת</b> (רנסנס שגדל בהליכה, פסלים ודגמים); <b>אור יום משתנה לפי שעת המבקר</b>; <b>טלפון</b>: ניווט, מפה לחיצה, ביצועים.</p>
<p>שני מונחי עלות בפרקים הבאים: <b>מסלול S</b> = בונים עם הכלים שיש (<code>synth.js</code>: קירות ומלבנים בציור, רצפה אחת); <b>מסלול B</b> = בונים את הקליפה ב־Blender, אופים אור (lightmap) ומציגים כקובץ GLB: מראה אמיתי הרבה יותר (חלק ג׳). הימים הם הערכה, לא מדידה.</p>
<p>חמשת הרעיונות שונים זה מזה במהותם: <b>ספירלה</b> שגדלה בזמן; <b>בית</b> של חדרים עם אופי; <b>שעון</b> שהאור שלו הוא התוכנית; <b>עיירה</b> תחת גג אחד; <b>מסגרת</b> שמחברים אליה תערוכות. כולם מכילים אולם מרכזי, קוליסות, פדסטלים, פסלים והיסטוריה שמתרחבת. שש הסקיצות הראשונות (נספח א׳) שימשו חומר גלם.</p>
{overview()}
<div class="box"><h3 style="margin-top:0">ניווט: המפה הלחיצה ורשימת התערוכות</h3>
<p>בכל חמשת הרעיונות המפה שבפינה הימנית העליונה נפתחת לתוכנית גדולה של הבניין (בדיוק כמו התוכניות שבפרקים), ולצידה רשימת כל התערוכות והמדורים. לחיצה על שם, או על חדר בתוכנית, מקפיצה את המבקר לפני התערוכה ופניו אליה. בטלפון זו לא תוספת אלא חלק מהתכנון: ההליכה לוקחת זמן (בקשתך מ־16.11). הכנו כבר מבנה נתונים לכך (<code>spec.directory</code>, בקובץ <code>WIP-one-building-notes.md</code>). בקליפה אפויה (מסלול B) אפשר להחליף את התוכנית בחתך תלת־ממדי של הבניין ("בית בובות"), בלי עבודה נוספת מעבר לקליפה עצמה (הערכה, מחקר 04).</p></div>
</div>
{ideas}
<section class="part"><h2>השוואה</h2>{compare()}
<div class="note"><b>על הטבלה:</b> "ימי עבודה" הם הערכה (לפי מחקר 04: מסלול S, מסלול B וגובה רצפה) ולא מדידה. "לא סימטרי" הוא מבחן שלך מ־13.11 ו־15.11; רעיון 3 נכשל בו במבנה הרדיאלי, אבל אפשר לשבור אותו בגלריות באורכים ובזוויות שונים.</div></section>
<section class="rec"><h2>המלצה</h2>
<p><b>להתחיל ברעיון 4, "תחת שמיים אחד", ולהשאיל מהאחרים.</b> הוא עונה על הכי הרבה ממה שאמרת: בניין אחד עם גג וחלונות, כיכר מרכזית עם קוליסות ופדסטלים ופסל, מרחב פתוח אמיתי בין התערוכות (רחובות, כיכר, בריכה), לא סימטרי (עיירה), והיסטוריה בצורת רחוב של בתים שהולכים וגדלים. היתרון הגדול: <b>הבתים כבר בנויים</b> (אותם חדרים של ה־Desk), והמעבר מהאשכול הוא רק קליפה עליהם: זה הכי זול והכי בטוח. התבנית של אור הגג על הרצפה, ושעת היום שמזיזה אותה, הם המקום שבו המבנה יראה "אמיתי".</p>
<ol>
<li><b>השאלה שנשארת:</b> ש"בתים בתוך אולם" יקרא כבניין אחד ולא כמחסן עם בתים. התשובה: קליפת זכוכית עדינה, עמודים צפופים, גג בעל חומר בטון אמיתי, ופרטי כניסה בולטים. זה נבדק בתמונות הרנדר, אבל לא על אייפון.</li>
<li><b>מה להשאיל:</b> מרעיון 2 ("בית החדרים"): גבהי תקרה ואור שונים בין הבתים, "הטלסקופ" ברנסנס ולוחות סואן בבית אחד; מרעיון 3: כתם אור נע בכיכר (פתח אחד בגג) כ"שעון"; מרעיון 1: הרנסנס כרחוב שהולך וגדל לכיוון אחד, וגדילה בקצה.</li>
<li><b>שלבים:</b> (א) קליפה בלבד מעל האשכול הקיים, עם גג מחורר ושעה (5 עד 7 ימים, הערכה); (ב) אפיית אור לשלוש שעות; (ג) הבית הראשון בחומרים אמיתיים (מסלול B); (ד) מפה לחיצה ורשימה (התוכנית שמורה ב־WIP-one-building-notes.md); (ה) רחוב רנסנס נוסף.</li>
<li><b>המקום השני:</b> רעיון 2 ("בית החדרים"), אם רוצים אופי חזק ופחות "מבנה גדול". <b>הכי "וואו":</b> רעיון 3, אם מוכנים לבנות אולם עגול (מסלול B).</li></ol>
<div class="note"><b>ההחלטה שחסרה:</b> איזה רעיון, או איזה שילוב. אחרי הבחירה אפשר לצאת לעבודה הלילה, ובלי לפרסם דבר ב־Open Studio החי עד שתבחר.</div></section>
<section class="part"><h2>נספח א׳: שש הסקיצות הראשונות</h2><p>לפני חמשת הרעיונות נבנו שש סקיצות ראשונות, כחומר גלם. הנה מה שקרה לכל אחת.</p>{first()}
<h2 style="margin-top:26px">נספח ב׳: מה אומת ומה לא</h2>
<div class="note"><ul>
<li>הבניינים בתמונות הם מודלי סקיצה: המידות והחומרים להמחשה. האור בתמונות הוא תאורת שמש עם צל (לא אפיית מוזיאון).</li>
<li>עובדות על מוזיאונים אמיתיים הן מהמחקר שנכתב היום (<code>research/</code>), שבו כל טענה מסומנת כנבדקה או לא. מה שלא נבדק מסומן.</li>
<li>הערכות הימים הן שיפוט של המחקר ושלי, לא מדידה. ביצועי טלפון לא נמדדו על אייפון אמיתי באף גרסה.</li>
<li>רשיון דוד (CC BY-SA) טרם אושר על ידך. דגמי האדריכלות באגף הרנסנס שלנו הם פשוטים שבנינו, כי לא נמצא מודל חופשי.</li>
<li>קובץ המקור של המחקר, הדגמים והמסמך: <code>studio/design/museum-directions/</code>.</li></ul></div></section>
</main></body></html>'''
    io.open(os.path.join(HERE, 'index.html'), 'w', encoding='utf-8').write(page)
    print('index.html', len(page) // 1024, 'KB')
main()
