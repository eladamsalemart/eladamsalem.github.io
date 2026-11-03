"""The day's summary for the owner, in Hebrew, as a PDF: what changed in Open Studio, and the ten kinds of virtual room
with their renders (renders/, from the "Studio rooms" workflow).

    python studio/design/virtual-spaces/make_summary.py [out.pdf]

Writes summary.html beside this file and prints it to PDF with Chrome (headless)."""
import json, os, subprocess, sys, pathlib

HERE = pathlib.Path(__file__).resolve().parent
R = HERE / 'renders'
rooms = json.loads((R / 'rooms.json').read_text(encoding='utf-8'))

KINDS = [
    ('white-cube', 'קובייה לבנה', 'David Zwirner וגלריות צ\'לסי', 'קירות טיח לבנים, רצפת בטון מוחלק אפור, מסילות ספוטים בשורה, וחלון אור בתקרה בגרסה הגדולה.',
     'כל סוג של עבודה: ציור, צילום, פיסול על פודסט. ניטרלי ובטוח.'),
    ('loft', 'לופט תעשייתי', 'Dia Beacon, Hamburger Bahnhof', 'גג משור עם זיגוג צפוני, קורות פלדה, עמודי ברזל, קירות לבנים מסוידות ורצפת בטון בשימוש.',
     'עבודות גדולות, סדרות, מיצב. מונומנטלי ושקט.'),
    ('skylit-hall', 'אולם מוזיאון עם אור עליון', 'Kimbell (Louis Kahn), Menil, Fondation Beyeler', 'קמרונות עם פס אור בשיא ומחזיר אור מתחתיו, או תקרת זכוכית מפזרת; טיח סיד ורצפת עץ אלון.',
     'ציור קלאסי ומודרני. רגוע ומכובד.'),
    ('salon', 'סלון היסטורי', 'Dulwich Picture Gallery, Isabella Stewart Gardner', 'קירות אדום עמוק או ירוק בקבוק, חיפוי עץ עד 95 ס"מ, כרכוב, פרקט אדרה, פנס תקרה ותאורת תמונה חמה.',
     'תליית סלון של הרבה עבודות קטנות ובינוניות, דיוקנאות, הדפסים.'),
    ('concrete', 'בטון חשוף', 'Tadao Ando (Chichu), Peter Zumthor (Kunsthaus Bregenz)', 'קירות בטון יצוק אפורים, תקרת אור יום מזכוכית, או חלון סדק גבוה בחלל של 6 מטר.',
     'ציור מינימלי, צילום גדול, עבודה אחת חזקה. רציני ומהורהר.'),
    ('studio', 'סטודיו אמן, אור צפוני', 'הסטודיו הקלאסי וגגות המשור של המפעלים', 'חלון צפוני גבוה או גג משור, לבנים מסוידות, רצפת קרשים צבועה, שולחן עבודה ועבודות נשענות על הקיר.',
     'אמן שמראה תהליך, ביקור סטודיו, עבודות בעבודה.'),
    ('apartment', 'בית אספן', 'בתי אספנים ומוזיאון Gardner', 'פרקט אדרה, קירות חמים, פסי תמונה ושיפולים, ספה, שטיח ומנורה, חלון עם אור יום.',
     'מכירה לאספנים ולמעצבי פנים: "איך זה ייראה אצלי".'),
    ('black-box', 'קופסה שחורה', 'Tate Modern Tanks', 'קירות שחורים, רצפה כהה מבריקה, אלומות צרות על כל עבודה, ואולם הקרנות.',
     'וידאו, הקרנה, עבודות רגישות לאור, צילום. ממוקד ודרמטי.'),
    ('glass-pavilion', 'ביתן זכוכית עם גן', 'Neue Nationalgalerie (Mies), Fondation Beyeler', 'קירות זכוכית עם מסגרות פלדה שחורות, רצפת גרניט, קירות לבנים עצמאיים וגן בחוץ.',
     'פיסול, עבודות גדולות, מיצב. פתוח ומודרני.'),
    ('japanese', 'חדר יפני, עץ ונייר', 'Nezu Museum (Kengo Kuma)', 'שוג\'י מנייר, טטאמי, תקרת ארז, טוקונומה עם הדפס ואגרטל, וגן מאחורי הנייר.',
     'קרמיקה, מגילות, דיו, הדפסים, אובייקטים. שקט ומדיטטיבי.'),
]
SIZES = [('small', 'קטן'), ('', 'בינוני'), ('large', 'גדול')]


def page_kinds():
    out = []
    for i, (k, name, refs, how, suits) in enumerate(KINDS, 1):
        figs = []
        for v, vh in SIZES:
            slug = k + ('-' + v if v else '')
            r = rooms.get(slug)
            if not r: continue
            figs.append(f'<figure><img src="renders/{slug}.jpg"><figcaption><b>{vh}</b> · <span dir="ltr">{r["label"]}</span></figcaption></figure>')
        out.append(f'''<section class="kind">
  <h2><span class="n">{i}</span>{name}</h2>
  <p class="meta"><b>השראה:</b> {refs}</p>
  <p>{how}</p>
  <p class="meta"><b>מתאים ל:</b> {suits}</p>
  <div class="hero">{figs[1] if len(figs) > 1 else figs[0]}</div>
  <div class="pair">{figs[0]}{figs[2] if len(figs) > 2 else ''}</div>
</section>''')
    return '\n'.join(out)


HTML = f'''<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8"><title>Open Studio · סיכום 3.11.2026</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Frank+Ruhl+Libre:wght@400;500;700&family=Heebo:wght@400;500;700&display=swap" rel="stylesheet">
<style>
@page {{ size: A4; margin: 16mm 15mm 16mm 15mm; }}
:root {{ --ink:#1B1A17; --muted:#5E594F; --line:#CFC7B6; --paper:#F6F1E7; --accent:#2F6B4F; }}
* {{ box-sizing: border-box; }}
body {{ margin:0; font: 10.5pt/1.55 Heebo, Arial, sans-serif; color: var(--ink); }}
h1 {{ font: 700 30pt/1.05 'Frank Ruhl Libre', serif; margin: 0 0 4mm; }}
h2 {{ font: 500 17pt/1.15 'Frank Ruhl Libre', serif; margin: 0 0 2mm; display:flex; align-items:baseline; gap:3mm; }}
h3 {{ font: 700 11.5pt/1.3 Heebo, sans-serif; margin: 5mm 0 1.5mm; }}
.n {{ font: 500 11pt Heebo; color:#fff; background: var(--accent); border-radius: 50%; width: 8mm; height: 8mm; display:inline-flex; align-items:center; justify-content:center; flex:none; }}
.cover {{ height: 255mm; display:flex; flex-direction:column; justify-content:space-between; page-break-after: always; }}
.cover .img {{ height: 150mm; background: url(renders/skylit-hall.jpg) center/cover; border-radius: 3mm; }}
.lede {{ font-size: 13pt; color: var(--muted); max-width: 150mm; }}
.box {{ background: var(--paper); border: 1px solid var(--line); border-radius: 3mm; padding: 4mm 5mm; margin: 3mm 0; }}
ul {{ margin: 1mm 0 2mm; padding-inline-start: 6mm; }} li {{ margin: 1mm 0; }}
.meta {{ color: var(--muted); margin: 1mm 0; }}
.kind {{ page-break-before: always; }}
figure {{ margin: 0; }} figure img {{ width: 100%; display:block; border-radius: 2mm; }}
figcaption {{ font-size: 9pt; color: var(--muted); margin-top: 1mm; }}
.hero {{ margin: 3mm 0 3mm; }}
.pair {{ display:grid; grid-template-columns: 1fr 1fr; gap: 4mm; }}
table {{ width:100%; border-collapse: collapse; font-size: 9.5pt; }} td, th {{ border-bottom: 1px solid var(--line); padding: 1.5mm 2mm; text-align: start; vertical-align: top; }}
th {{ color: var(--muted); font-weight: 500; }}
.ltr {{ direction: ltr; unicode-bidi: isolate; }}
.section {{ page-break-before: always; }}
</style></head><body>

<div class="cover">
  <div>
    <p class="meta">Open Studio · סיכום יום עבודה · 3 בנובמבר 2026</p>
    <h1>החללים הווירטואליים,<br>והאפליקציה היום</h1>
    <p class="lede">עשרה סוגי חללי תערוכה, כל אחד בשלוש גרסאות, מרונדרים באור פיזיקלי לפי המספרים של מוזיאונים, עם עבודות אמיתיות בגודלן האמיתי. ולצדם, כל מה שהשתנה היום באפליקציה.</p>
  </div>
  <div class="img"></div>
</div>

<section>
  <h2><span class="n">א</span>מה השתנה היום באפליקציה</h2>
  <div class="box"><ul>
    <li><b>אמנים אמיתיים.</b> במקום האמנים שהמצאנו: עשרה אמנים מתולדות האמנות שהיצירות שלהם ברשות הציבור, חמש אמניות וחמישה אמנים: ואן גוך, מאטיס, ויקטור הוגו, מונה, הוקוסאי, ברת מוריזו, מרי קסאט, הילמה אף קלינט, סוזן ולדון, פאולה מודרזון־בקר. לכל אחד 6 עבודות עם מידה אמיתית, שנה, טכניקה ומוזיאון. הגלריות והתערוכות שלהם נשארו לדוגמה, ועמוד האמן אומר זאת.</li>
    <li><b>חדר הבקרה בעברית.</b> נפתח מכפתור "Control room" בעמוד החשבון (העיגול עם האות הראשונה בעמוד הבית). בראשו "סיכום": אמנים שמחכים, עבודות חדשות לבדיקה (נראה טוב / הסתר), מי הצטרף היום ובשבוע, ומספרים.</li>
    <li><b>סיור כמשתמש חדש.</b> שני כפתורים בסיכום: "סיור כמבקר חדש" ו"סיור כאמן חדש". עוברים על כל מסכי ההרשמה בלי מייל אמיתי ובלי לשמור כלום; פס כחול למעלה עם "יציאה". מתחת: חשבונות בדיקה אמיתיים למי שרוצה לבדוק גם שליחת מייל.</li>
    <li><b>ייבוא אתר שלם.</b> מכתובת האתר מגיעים: העבודות (המידות לפי כיוון התמונה עצמה), ההצהרה, טקסט "אודות", הדיוקן, קורות החיים, התערוכות עם צילומי ההצבה והעבודות של כל תערוכה, הסיור התלת־ממדי איפה שיש (Ritual), והאובייקטים (הפרגוד והקיר הנע). ייבוא שני לא מכפיל. אחר כך נפתחת תערוכה תלת־ממדית מהעבודות.</li>
    <li><b>עמוד אמן אחד לכולם.</b> כל אמן מקבל את העיצוב של העמוד שלך: עבודות לפי שנים, תערוכות, "About &amp; CV" עם הדיוקן, אובייקטים.</li>
    <li><b>הלוך ושוב עד אישור.</b> האמן רואה את העמוד שלו בדיוק כמו שמבקרים יראו, עורך בסטודיו, ושולח לבדיקה. בחדר הבקרה: "צפה בעמוד", "אשר", או "בקש שינויים" עם הערה; האמן מתקן ושולח שוב.</li>
    <li><b>ייבוא מהדרייב ומהטלפון.</b> "Choose from Google Drive" פותח את הדרייב ובוחרים תמונות; אחרי חיפוש הדף יורד לבד לתוצאות; מכל עמוד בסטודיו יש "← Open Studio".</li>
    <li><b>Google.</b> חלון ההתחברות עם Google אומר עכשיו "to continue to Open Studio".</li>
    <li><b>תיקון.</b> תמונות מסך הפתיחה הצביעו על העבודות המומצאות שנמחקו; עכשיו העבודות האמיתיות.</li>
  </ul></div>
  <h3>מה עוד פתוח</h3>
  <div class="box"><ul>
    <li><b>אינסטגרם:</b> הכפתור, השרת וההגדרות ב־Meta בנויים, אבל פייסבוק מחזיר בלי חשבון אינסטגרם. בפעם הבאה: צילומי מסך של חלונות פייסבוק והיומן שהשרת רושם עכשיו.</li>
    <li><b>החללים באפליקציה:</b> הרינדורים שכאן הם המטרה. השלב הבא הוא להכניס חדר אחד לאפליקציה בשיטה שהמחקר ממליץ עליה, ולהשוות באייפון.</li>
    <li><b>סיור תלת־ממדי מתערוכה מיובאת:</b> Ritual מקבלת את הסיור שכבר קיים. בניית סיור חדש מצילומי הצבה של אמן חדש היא תהליך בשרת שעוד לא מחובר לייבוא.</li>
  </ul></div>
</section>

<section class="section">
  <h2><span class="n">ב</span>איך בנינו את החללים</h2>
  <p>כרגע החדרים באפליקציה מצוירים בדפדפן, ולכן הם נראים פשוטים ודיגיטליים. המחקר (בקובץ <span class="ltr">research.md</span>) בדק את המתחרים ואת הטכניקות, והמסקנה: הרמה הגבוהה ביותר שרצה בטלפון היא חדר שנבנה ונאפה מראש במנוע רינדור פיזיקלי, ובדפדפן מוסיפים רק את האור של כל עבודה. כך עובד Shapespark, המתחרה הריאליסטי ביותר; אף אחד מהמתחרים לא מציע "תאורה מקצועית של גלריה" כמו שאנחנו בונים.</p>
  <h3>מה עשינו</h3>
  <ul>
    <li>כתבנו סקריפט שבונה ב־Blender את עשרת הסוגים, כל אחד בשלוש גרסאות: קטן, בינוני, גדול או כמה חדרים ברצף.</li>
    <li>חומרים אמיתיים (טקסטורות CC0 של Poly Haven): בטון, טיח, אלון, פרקט אדרה, לבנים, גרניט, טטאמי, ארז יפני.</li>
    <li>הרינדור ב־Cycles, מנוע מעקב קרני אור, על השרתים של GitHub.</li>
    <li>עבודות אמיתיות של האמנים החדשים, בגודלן האמיתי בס"מ, תלויות בגובה העין.</li>
  </ul>
  <h3>האור, לפי מספרים של מוזיאונים</h3>
  <table>
    <tr><th>מה</th><th>מספר</th><th>מקור</th></tr>
    <tr><td>אור על ציור שמן</td><td>כ־200 לוקס</td><td>מוזיאונים, הכלל של 50/200</td></tr>
    <tr><td>אור על נייר, הדפס, צילום</td><td>50 לוקס</td><td>שימור</td></tr>
    <tr><td>צבע האור של הספוטים</td><td>3000K, אחיד בכל החלל</td><td>המכון הקנדי לשימור</td></tr>
    <tr><td>כיוון הספוט</td><td>30° מהאנך, כלומר 60° לאופק</td><td>"כלל 30 המעלות"</td></tr>
    <tr><td>מרחק הספוט מהקיר</td><td>(גובה התקרה − 160 ס"מ) × 0.577</td><td>המכון הקנדי לשימור</td></tr>
    <tr><td>אור יום (חלון צפוני, תקרת אור)</td><td>6500K, דרך מפזר</td><td>Beyeler, Menil, Kimbell</td></tr>
    <tr><td>אור כללי על הקירות (וולוושרים)</td><td>100 עד 150 לוקס</td><td>ERCO ופרקטיקה</td></tr>
  </table>
  <h3>השלבים הבאים</h3>
  <ol>
    <li><b>אתה בוחר</b> אילו חללים לבנות ראשונים (המלצה: קובייה לבנה, אולם מוזיאון עם אור עליון, סלון, בטון).</li>
    <li><b>שלב 0:</b> חדר אחד נאפה מ־Blender למפות אור ונטען באפליקציה; משווים מול החדר הנוכחי באייפון. ההשוואה הזאת מכריעה.</li>
    <li>אור לכל עבודה בזמן אמת, כך שכל אמן ואוצר יכולים לתלות עבודות משלהם והאור נשאר נכון.</li>
    <li>שאר החדרים, הקשים (זכוכית, קופסה שחורה עם וידאו) בסוף.</li>
  </ol>
</section>

{page_kinds()}

</body></html>'''

(HERE / 'summary.html').write_text(HTML, encoding='utf-8')
out = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else HERE / 'open-studio-summary-2026-11-03.pdf'
chrome = next(p for p in (r'C:\Program Files\Google\Chrome\Application\chrome.exe', r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe', 'google-chrome', 'chromium') if os.path.exists(p) or not p.startswith('C:'))
subprocess.run([chrome, '--headless=new', '--disable-gpu', '--no-pdf-header-footer', '--run-all-compositor-stages-before-draw', '--virtual-time-budget=15000',
                f'--print-to-pdf={out}', (HERE / 'summary.html').as_uri()], check=True, timeout=180)
print(out, out.stat().st_size // 1024, 'KB')
