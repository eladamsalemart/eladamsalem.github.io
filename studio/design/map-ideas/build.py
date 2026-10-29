"""The art map report: what was asked, how it was built, the filter, the daily and monthly updates, and design
ideas for the map and for the buildings in it. Numbers are read from the data the map uses, at build time.

    python3 studio/design/map-ideas/build.py      (then print map-ideas.html to PDF; shots/ holds the renders)
"""
import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / 'reports'))
from common import doc, bars, g, LOGO  # noqa: E402

APP = HERE.parents[1] / 'app'
D = 'מפת האמנות'
places = json.loads((APP / 'data/art/places.json').read_text())['places']
ex = json.loads((APP / 'data/art/exhibitions.json').read_text()) if (APP / 'data/art/exhibitions.json').exists() else {'shows': [], 'events': []}
health = json.loads((APP / 'data/art/exhibitions.health.json').read_text())['sources'] if (APP / 'data/art/exhibitions.health.json').exists() else []
changes = (APP / 'data/art/places.changes.md').read_text(encoding='utf-8')
seeds = [l for l in (APP / 'artmap/seeds.tsv').read_text(encoding='utf-8').splitlines() if l and not l.startswith('#')]

KH = {'museum': 'מוזיאונים לאמנות', 'public': 'גלריות ציבוריות', 'commercial': 'גלריות', 'artist-run': 'מרחבים של אמנים',
      'academy': 'גלריות של בתי ספר לאמנות', 'centre': 'מרכזי אמנות'}
COL = {'museum': '#2F4FD0', 'public': '#E2553B', 'commercial': '#E9A23B', 'artist-run': '#1C9C86', 'academy': '#7B52D6', 'centre': '#D8578F'}
n = len(places)
cur = sum(p['tier'] == 'curated' for p in places)
blt = sum(bool(p.get('building')) for p in places)
by = {k: sum(p['kind'] == k for p in places) for k in KH}
src_wd = sum('wikidata' in p['sources'] for p in places)
src_osm = sum('osm' in p['sources'] for p in places)
ok_src = [h for h in health if h.get('status') == 'ok']
shows_n, events_n = len(ex['shows']), len(ex['events'])
places_with = len({s['place'] for s in ex['shows']})
not_found = changes.count('not found on the map')
by_addr = sum('address' in p['sources'] for p in places)
approx = sum(bool(p.get('approx')) for p in places)
left = {}
for line in changes.split('## Left out')[1].splitlines()[1:] if '## Left out' in changes else []:
    if line.startswith('- ') and ':' in line:
        k, v = line[2:].rsplit(':', 1)
        left[k.strip()] = int(v)
S = 'shots/'


def img(f, w='100%', cap=''):
    return f'<figure style="margin:0"><img src="{S}{f}.png" style="width:{w};display:block;border:1px solid #CFC7B6;border-radius:2mm">{f"<figcaption class=src>{cap}</figcaption>" if cap else ""}</figure>'


def phone(f, cap=''):
    return img(f, '100%', cap)


P = []
P.append(('', '', f'''<section class="page paper cover"><div class="logo">{LOGO}<span>Open Studio</span></div>
<div class="k" style="margin-top:22mm">מסמך עבודה · לילה אחד · 28–29.10.2026</div>
<h1>מפת האמנות<br>של ישראל</h1>
<p class="big" style="max-width:155mm">מה ביקשת, איך יצאתי לדרך, מה נבנה הלילה ועובד באפליקציה, איך נקבע מה נחשב "מרחב אמנות", איך המפה מתעדכנת כל חודש והתערוכות כל יום, ורעיונות לעיצוב הסקשן ולעיצוב המבנים בתוך המפה.</p>
<div style="margin-top:14mm;display:grid;grid-template-columns:1fr 1fr 1fr;gap:4mm">{''.join(f'<div class="card"><div class="num" style="color:{c}">{v}</div><span class="sm">{t}</span></div>' for v, t, c in [(n, 'מרחבי אמנות על המפה', '#2F4FD0'), (blt, 'עם הבניין שלהם בתלת‑ממד', '#E2553B'), (shows_n, 'תערוכות שנקראו היום מאתרי המקומות', '#1C9C86')])}</div>
<p class="src" style="position:absolute;bottom:16mm;right:15mm;left:15mm">נכתב על ידי Claude. כל המספרים במסמך נקראים מהנתונים שהמפה עצמה משתמשת בהם (data/art), ברגע בניית המסמך.</p></section>''', 'raw'))

P.append(('מה ביקשת', 'הבקשה, ומה נבנה מולה', f'''
<table class="tight"><tr><th>ביקשת</th><th>מה נבנה</th><th>מצב</th></tr>
<tr><td>עיצוב נקי, אלגנטי, צבעוני ואמנותי לסקשן המפה, בלי הכותרת והכיתוב הקודמים</td><td>מפה תלת‑ממדית על כל המסך בגווני נייר, צבע לכל סוג מקום, "כתמי צבע" סביב מקומות עם תערוכה, וגיליון רך מתחת עם שם העיר בגופן סריף, מספרים ורשימה</td><td class="y">באפליקציה</td></tr>
<tr><td>חיבור המפה לכל מרחבי התרבות באמנות בישראל, עם סינון מדויק ולא "סתם מוזיאונים"</td><td>{n} מקומות משלושה מקורות (רשימה מאוצרת מעולם האמנות, Wikidata, OpenStreetMap), עם כללי סינון כתובים; {sum(left.values()) if left else 'מאות'} מועמדים נפסלו, כל אחד עם הסיבה</td><td class="y">באפליקציה</td></tr>
<tr><td>כל מבנה בתלת‑ממד, "מגניב ומיוחד"</td><td>הבניין האמיתי של כל מקום מ‑OpenStreetMap ({blt} מתוך {n}), מורם בצבע הסוג שלו מעל עיר חיוורת ונמוכה; כמה גלריות באותו בניין נערמות כקומות צבעוניות</td><td class="y">באפליקציה</td></tr>
<tr><td>עדכון המקומות פעם בחודש (חדשים, נסגרים)</td><td>עבודה אוטומטית בשרת ב‑1 לכל חודש; מקום חדש מסומן, מקום שנעלם מסומן "לא מאומת" חודש אחד ואז יורד; דוח שינויים</td><td class="y">רץ</td></tr>
<tr><td>עדכון יומי של התערוכות</td><td>עבודה אוטומטית כל בוקר שקוראת את אתרי המקומות עצמם, ופתיחות ושיחי גלריה מלוח אירועים ציבורי; דוח בריאות לכל מקור</td><td class="y">רץ</td></tr>
<tr><td>לראות במפה מה מוצג</td><td>בכל מקום: "On now", "Coming up", "Talks and openings", עם תאריכים וקישור למקור</td><td class="y">באפליקציה</td></tr>
<tr><td>בעתיד: לעקוב אחרי גלריות ומוסדות</td><td>כפתור Follow בכל מקום, ו"Places you follow" בראש הרשימה (נשמר בטלפון; יעבור לחשבון כשיהיה)</td><td class="m">גרסה ראשונה</td></tr>
<tr><td>בעתיד: לראות אילו אמנים באפליקציה מציגים, ואם אתה עוקב אחריהם</td><td>התאמה בין שמות האמנים בתערוכות לאמני Open Studio; "you follow" בולט. ייכנס לפעולה מלאה כשלאמנים יהיה גם שם בעברית בפרופיל</td><td class="m">תשתית מוכנה</td></tr>
<tr><td>PDF עם רעיונות עיצוב ומה נעשה</td><td>המסמך הזה</td><td class="y">כאן</td></tr></table>''', ''))

P.append(('הסקשן החדש', 'מה רואים עכשיו באפליקציה', f'''
<div class="cols3">{phone('app-map', 'פתיחה: רובע האמנות הקרוב, בזווית תלת‑ממד')}{phone('app-card', 'מקום נבחר: טבעת בצבעו, וכרטיס עם מה שמוצג')}{phone('app-list', 'הגיליון: עיר, מספרים, סוגים, "On now"')}</div>
<div class="cols" style="margin-top:4mm"><div>
<h3>מה השתנה בעיצוב</h3>
<ul class="sm"><li><b>בלי הכותרת הגדולה.</b> במקום "On the walls now, near Tel Aviv" יש שם עיר שקט בסריף, ושורת מספרים: כמה מרחבים, כמה תערוכות, מתי עודכן.</li>
<li><b>המפה היא היצירה.</b> נייר חם, ים בטורקיז רך, פארקים במרווה. העיר עצמה בתבליט חיוור ונמוך (40% מגובהה), ומקומות האמנות עולים ממנה בצבע.</li>
<li><b>שישה צבעים, שש משפחות.</b> כחול אולטרמרין למוזיאונים, ורמיליון לגלריות ציבוריות, אוקר לגלריות, ירוק‑ויררידיאן למרחבי אמנים, סגול לבתי ספר, ורוד למרכזי אמנות.</li>
<li><b>כתמי צבע</b> סביב כל מקום, חזקים יותר כשיש בו תערוכה עכשיו: מבט אחד על העיר מראה איפה האמנות חיה השבוע.</li></ul></div>
<div><h3>איך משתמשים</h3>
<ul class="sm"><li>המפה נפתחת מעל רובע האמנות הצפוף ביותר שקרוב אליך.</li><li>נגיעה בבניין: המצלמה מסתובבת אליו לאט, טבעת בצבעו על הקרקע, והגיליון הופך לכרטיס המקום.</li>
<li>שבבי הסוגים מסננים גם את המפה וגם את הרשימה. נגיעה ראשונה בוחרת סוג אחד.</li><li>כפתור 2D/3D, ובחירת עיר או "Near me".</li>
<li>קישור ישיר לכל מקום (‎#/map/place/…) לשיתוף בוואטסאפ.</li></ul></div></div>''', ''))

funnel = [('מועמדים מ‑OpenStreetMap שנבדקו', sum(left.values()) + src_osm if left else src_osm), ('נפסלו: לא אמנות או לא מאוצרים', sum(left.values()) if left else 0),
          ('על המפה: ברשימה המאוצרת', cur), ('על המפה: מוזיאון לאמנות או גלריה ב‑Wikidata', n - cur)]
P.append(('הסינון', 'מה נחשב "מרחב אמנות", ומה לא', f'''
<p class="lead">ב‑OpenStreetMap "גלריה" היא גם מסגרייה, חנות לעיצוב הבית או סטודיו לצילומי פספורט, ו"מרכז אמנויות" הוא לרוב היכל תרבות. לכן הכלל הוא: <b>קודם עולם האמנות, אחר כך המפה.</b></p>
<div class="cols"><div>
<h3>שלוש שכבות</h3>
<ol class="sm"><li><b>רשימה מאוצרת ({len(seeds)} מקומות).</b> מוזיאונים לאמנות; 61 הגלריות הציבוריות שמשרד התרבות תומך בהן (הרשימה של איגוד האמנים, 2022) {g('v')}; גלריות מסחריות ושיתופיות; גלריות של בתי ספר לאמנות; מרכזי אמנות. מקום מהרשימה מוצג רק כשנמצא בשטח, עם כתובת וקואורדינטות.</li>
<li><b>Wikidata.</b> "מוזיאון לאמנות" או "גלריה לאמנות" בישראל, עם קואורדינטות, שלא נסגר. ({src_wd} מקומות נשענים עליו.)</li>
<li><b>OpenStreetMap.</b> רק מוזיאונים שמסומנים כמוזיאון לאמנות או ששמם אומר אמנות. גלריות ומרכזים מ‑OSM נכנסים רק אם הם ברשימה המאוצרת.</li></ol>
<h3>מה נפסל, ולמה</h3>
<table class="tight xs"><tr><th>סיבה</th><th class="c">כמה</th></tr>{''.join(f'<tr><td>{k}</td><td class="c">{v}</td></tr>' for k, v in sorted(left.items(), key=lambda x: -x[1])[:8])}</table></div>
<div><h3>מה על המפה</h3>
{bars([(KH[k], v) for k, v in by.items() if v], '', max(by.values()))}
<p class="src">{n} מקומות; {cur} מהרשימה המאוצרת, {n - cur} מ‑Wikidata ו‑OSM. {blt} עם בניין.</p>
<div class="box yel"><b>מה עוד חסר:</b> {not_found} מקומות מהרשימה המאוצרת לא נמצאו עדיין בשטח (אין להם סימון ב‑OSM או ב‑Wikidata). הם רשומים בדוח השינויים. ל‑{by_addr} מקומות כאלה מצאתי הלילה כתובת במקורות פתוחים (Time Out, דפי סיור, אתרי המקומות) והם כבר במפה; {approx} מהם במיקום משוער (קיבוץ או רחוב בלי מספר בית), והכרטיס שלהם אומר זאת. לשאר: להוסיף כתובת ברשימה, או שהגלריה תירשם בעצמה באפליקציה.</div>
<div class="box"><b>הגדרות שנבחרו בכוונה:</b> אמנות חזותית בלבד; מוזיאונים היסטוריים, מדע, צבא ומורשת בחוץ; גם מוזיאון לאמנות יהודית בפנים, כי הוא מוזיאון לאמנות.</div></div></div>''', ''))

P.append(('העדכונים', 'המקומות כל חודש, התערוכות כל בוקר', f'''
<div class="cols"><div>
<h3>מקומות: "Art map: places", ב‑1 לכל חודש</h3>
<ol class="sm"><li>מוריד את מפת ישראל העדכנית של OpenStreetMap (Geofabrik) ושואל את Wikidata.</li>
<li>מוצא כל מקום מהרשימה המאוצרת, ואם אין, שואל את Nominatim לפי השם והעיר, ואם גם זה לא, לפי הכתובת שנחקרה עבורו.</li>
<li>מסנן את שאר המועמדים לפי הכללים, ומאתר לכל מקום את הבניין שבו הוא עומד: קווי המתאר והגובה.</li>
<li>משווה לחודש הקודם. <b>מקום חדש</b> מסומן כחדש. <b>מקום שלא נמצא</b> נשאר חודש אחד כ"לא מאומת", ובחודש שאחריו יורד. מקום שסומן "סגור" ברשימה יורד מיד (למשל אלפרד, 2026).</li>
<li>כותב דוח שינויים (places.changes.md) ושומר בענף studio; האפליקציה מתפרסמת מחדש.</li></ol>
<h3>תערוכות: "Art map: exhibitions", כל בוקר ב‑05:23</h3>
<ol class="sm"><li>קורא את העמוד שבו כל מקום מפרסם מה מוצג אצלו (sources.tsv).</li>
<li>קורא אחד שמתאים לרוב האתרים: כותרת ואחריה טווח תאריכים, או "ננעלת בתאריך", או "פתיחה || נעילה". קורסים, הרצאות, סדנאות והקרנות נשארים בחוץ; פתיחות ושיחי גלריה נשמרים כאירועים.</li>
<li>פתיחות ושיחי גלריה גם מלוח האירועים הציבורי "מה קורה", רק במקומות שעל המפה.</li>
<li>תערוכה שנקראה פעם לא נעלמת כשאתר נופל ליום: היא נשארת עד תאריך הסיום.</li></ol></div>
<div><h3>מה נקרא הבוקר</h3>
<table class="tight xs"><tr><th>מקור</th><th class="c">תערוכות</th><th class="c">אירועים</th><th>מצב</th></tr>{''.join(f'<tr><td>{h["source"]}</td><td class="c">{h.get("shows", "")}</td><td class="c">{h.get("events", "")}</td><td>{h.get("status", "")}</td></tr>' for h in health)}</table>
<p class="src">{shows_n} תערוכות ב‑{places_with} מקומות, {events_n} אירועים. {len(ok_src)} מתוך {len(health)} מקורות נקראו.</p>
<div class="box"><b>נימוס ברשת:</b> robots.txt נשמר, בקשה אחת לאתר כל כמה שניות, זהות גלויה, ונשמרות רק עובדות: שם, אמנים, תאריכים וקישור חזרה. בלי טקסטים ובלי תמונות.</div>
<div class="box yel"><b>ערב רב:</b> מדריך התערוכות שלהם הוא המקור הטוב ביותר, אבל קובץ ה‑robots שלהם חוסם במפורש בוטים של בינה מלאכותית, כולל ClaudeBot. לכן לא קראנו ממנו אוטומטית. ההמלצה: לפנות אליהם לשותפות (הזנה משותפת), כמו שהדוח העסקי הציע.</div></div></div>''', ''))

P.append(('רעיונות לסקשן', 'חמש דרכים לצייר את מפת האמנות', f'''
<div class="cols3">{img('idea-atlas', cap='<b>1. אטלס (נבחר):</b> נייר, תבליט חיוור, אמנות בצבע. רגוע ביום, מתאים לכל העיר.')}{img('idea-night', cap='<b>2. ערב פתיחה:</b> מפה כהה, המקומות כפנסים; מתאים ללשונית Shows ולערבים.')}{img('idea-wash', cap='<b>3. צבעי מים:</b> בלי בניינים, רק כתמי צבע על נייר; כמו מפה מצוירת ביד.')}</div>
<div class="cols" style="margin-top:3mm">{img('idea-model', cap='<b>4. דגם אדריכלי:</b> העיר כדגם לבן מגבס, אור מהצד, האמנות כאבני צבע. פוסטר.')}{img('idea-cards', cap='<b>5. כרטיסים על המפה:</b> מפה מלאה וכרטיסים שגוללים הצידה; כמו מפות של אפליקציות טיולים.')}</div>
<p class="sm" style="margin-top:3mm"><b>המלצה:</b> אטלס כברירת מחדל (נקי, קריא, מכבד את האמנות), ו"ערב פתיחה" אוטומטית אחרי 18:00 בימים שיש בהם פתיחות. צבעי מים מתאים לשיתוף ולתמונת "השנה שלך באמנות".</p>''', ''))

P.append(('רעיונות למבנים', 'איך בניין יכול לספר מה קורה בתוכו', f'''
<div class="cols3">{img('b-kind', cap='<b>צבע לפי סוג</b> (באפליקציה): כל משפחה בצבע משלה.')}{img('b-floors', cap='<b>קומות</b> (באפליקציה): כמה גלריות באותו בניין נערמות כקומות צבעוניות.')}{img('b-activity', cap='<b>גובה לפי פעילות:</b> כל תערוכה מוסיפה קומה; מבט אחד מראה איפה קורה הכי הרבה.')}</div>
<div class="cols3" style="margin-top:3mm">{img('b-lantern', cap='<b>פנס:</b> בלילה, מקום פתוח זוהר; פתיחה הערב פועמת.')}{img('b-ghost', cap='<b>רוח:</b> מקום שסגור זמנית (מוזיאון הרצליה בשיפוץ) נשאר במקומו, שקוף ואפור.')}{img('b-artwork', cap='<b>עטוף ביצירה:</b> הבניין לובש את היצירה מהתערוכה שבתוכו.')}</div>
<p class="sm" style="margin-top:3mm">עוד רעיונות שלא צוירו: <b>גגות בצבעי התערוכה</b> (פלטת הצבעים של היצירות מחולצת אוטומטית); <b>טבעות פתיחה</b> שמתרחבות סביב מקום שיש בו פתיחה הערב; <b>דגמים מיוחדים</b> לבניינים אייקוניים (המשולשים של מוזיאון תל אביב, הביתנים של מוזיאון ישראל); <b>שביל</b> שמחבר את המקומות של סיור גלריות ערב.</p>''', ''))

P.append(('איכות', 'איך בדקתי את עצמי', f'''
<div class="cols"><div>
<h3>בדיקות שרצות לפני כל פרסום</h3>
<ul class="chk sm"><li>המפה: אריח וקטורי מעל מרכז תל אביב חייב להגיע ולהכיל בניינים, רחובות ומים; האותיות בעברית ובלטינית חייבות להגיע.</li>
<li>הנתונים: לפחות 40 מקומות, כולם בישראל, מסוג מוכר, כל אחד פעם אחת, וכל תערוכה שייכת למקום שעל המפה.</li>
<li>הוכחה: החזרתי בכוונה כתובת מפה שגויה, והבדיקה עצרה את הפרסום.</li></ul>
<h3>מה בדקתי בעין</h3>
<ul class="sm"><li>הכול בגודל אייפון (390×844), בלי להחליף שום שירות חיצוני בתחליף: אריחים, גופנים ונתונים אמיתיים.</li>
<li>מקום נבחר, רשימה, סינון, מעבר עיר, 2D/3D, קישור ישיר למקום.</li>
<li>שמות בעברית: תוסף RTL של המפה, ושמות תערוכות בעברית בתוך טקסט באנגלית.</li></ul></div>
<div><h3>מה תיקנתי בדרך</h3>
<ul class="sm"><li>המפה יצאה ריקה: הסגנון של ספריית המפה דרס את גובה המיכל. תוקן.</li>
<li>תוסף העברית לא נטען (כתובת יחסית בתוך Worker, וגרסה לא תואמת). תוקן.</li>
<li>"בית האמנים" התאים לבית אמנים אחר במרחק 20 ק"מ. כינויים כלליים הוסרו, והתאמה נעשית רק בתוך העיר.</li>
<li>OSM הכניס מסגרייה וחנות לעיצוב הבית כ"גלריות". הכלל שונה: גלריה מ‑OSM רק אם היא מאוצרת.</li>
<li>הרצה בשרת נתקעה על Nominatim. נוספו זמן המתנה קצר ועצירה אחרי שלוש תקלות.</li></ul>
<div class="box yel"><b>מה לא בדקתי:</b> Safari על אייפון אמיתי (הבדיקה ב‑Chromium שמדמה אייפון). כדאי לפתוח את המפה בטלפון שלך ולספר לי איך זה מרגיש.</div></div></div>''', ''))

P.append(('מה הלאה', 'הצעדים הבאים, ומה מחכה להחלטה שלך', f'''
<table class="tight"><tr><th>צעד</th><th>למה</th></tr>
<tr><td>להשלים כתובות ל‑{not_found} המקומות המאוצרים שלא נמצאו</td><td>רוב הגלריות המסחריות בתל אביב לא מסומנות ב‑OSM; עם כתובת הן ייכנסו בהרצה הבאה</td></tr>
<tr><td>להוסיף קוראים לאתרים שעוד לא נקראים (מוזיאון תל אביב, CCA, גוטמן, אשדוד…)</td><td>חלקם בונים את העמוד ב‑JavaScript; צריך קורא לכל אחד, או API</td></tr>
<tr><td>שותפות עם ערב רב</td><td>הזנה מסודרת של כל הפתיחות, ברשות</td></tr>
<tr><td>הגלריה מעדכנת בעצמה</td><td>בשלב ההרשמה (הדוח המוצרי): גלריה מוסיפה תערוכה בשתי דקות, והיא על המפה</td></tr>
<tr><td>שם בעברית לכל אמן בפרופיל</td><td>כדי ש"אמנים שאתה עוקב אחריהם מציגים כאן" יעבוד גם בתערוכות מאתרים בעברית</td></tr>
<tr><td>Follow לחשבון</td><td>היום נשמר בטלפון; עם חשבונות יעבור בין מכשירים ויאפשר התראה על פתיחה</td></tr>
<tr><td>ספק אריחים עם מפתח לפני השקה ציבורית</td><td>OpenFreeMap חינמי ובלי מגבלה מוצהרת, אבל כדאי חלופה מוכנה</td></tr></table>
<h3>החלטות שלך</h3>
<ol><li>איזה עיצוב לסקשן: להשאיר אטלס, או לשלב "ערב פתיחה" בערבים?</li><li>אילו רעיונות למבנים לפתח: גובה לפי פעילות? עטוף ביצירה?</li><li>האם להציג גם מקומות שרק ב‑Wikidata (גלריות שאולי נסגרו), או רק מאוצרים?</li></ol>''', ''))

open(HERE / 'map-ideas.html', 'w', encoding='utf-8').write(doc('Open Studio · מפת האמנות', P, D, date='29.10.2026'))
print(len(P), 'pages')
