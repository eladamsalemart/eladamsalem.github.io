"""The three Home directions as a Hebrew PDF (A4): a cover, a page for each, the recommendation.

    python3 studio/design/home-concepts/build.py   # the screens (then their shots go to print/, see the report)
    python3 studio/design/home-concepts/pdf.py     # writes home-directions.html and open-studio-home-directions.pdf
"""
import subprocess
from pathlib import Path

HERE = Path(__file__).resolve().parent

DIRS = [
    {'key': 'wall', 'name': 'הקיר', 'en': 'The wall', 'c': '#7E9A68',
     'idea': 'עמוד הבית הוא קיר בתערוכה. העבודות החדשות של האמנים שאתה עוקב אחריהם תלויות עליו יחד, בגדלים האמיתיים שלהן זו ליד זו. זה הדבר שרק Open Studio עושה.',
     'live': 'צבע הקיר נלקח מהעבודה האחרונה שהסתכלת עליה, אז הוא שונה בכל ביקור.',
     'how': ['"איפה היית": תוויות מוזיאון קטנות, כמו ליד עבודה, ולא ריבועים של ספוטיפיי',
             'התערוכות שלך: פתחים בצורת קשת, כמו הלוגו, עם מה שקורה בהן עכשיו',
             'האמנים שלך: עם מה שחדש אצלם',
             'סביבך: קשתות בצבע של סוג המקום, עם עד מתי'],
     'weigh': ['הכי מקורי, והכי קרוב לחזון של האפליקציה', 'החלק העליון נשען על עבודות. אם אין חדשות, צריך משהו אחר לתלות'],
     'caps': ['הקיר, בצבע של העבודה האחרונה', 'תוויות "איפה היית" ופתחי התערוכות', 'האמנים שלך ומה פתוח סביבך']},
    {'key': 'catalogue', 'name': 'הקטלוג', 'en': 'The catalogue', 'c': '#C8432B',
     'idea': 'כל בוקר יוצא גיליון שנערך רק בשבילך, כמו קטלוג של תערוכה: עבודה אחת גדולה על השער, משפט שמספר מה קורה, ומתחת אינדקס אישי.',
     'live': 'השער והמשפט שמתחתיו משתנים כל יום לפי מה שקורה אצל מי שאתה עוקב אחריו, למשל: Lia Morén opens Low Tide tonight.',
     'how': ['"Continue": סימנייה, ישר למקום שבו עצרת', 'התערוכות שלך עם מספר גדול: Tonight, 3 days left, Tue',
             'שמות האמנים גדולים, כל אחד עם הצבע שלו', 'העבודות ששמרת על מדף, בגדלים יחסיים', 'סביבך: רשימה עם עד מתי'],
     'weigh': ['הכי נקי ואלגנטי, והכי ברור לקריאה', 'פחות צבעוני משני האחרים; הצבע בא מהתמונות'],
     'caps': ['השער של היום', 'התערוכות שלך השבוע', 'האמנים, העבודות ששמרת, וסביבך']},
    {'key': 'field', 'name': 'שדה הצבע', 'en': 'The colour field', 'c': '#5A3F9A',
     'idea': 'כל אמן, תערוכה או עבודה הופכים לשדה צבע שטוח, בצבע שנלקח מהעבודה שלהם, עם פרוסה מהתמונה בצד. העמוד נקרא כמו ציור של שדות צבע.',
     'live': '"השבוע שלך בצבע": פס לכל יום, בצבע של מה שהסתכלת עליו הכי הרבה באותו יום. אישי לגמרי.',
     'how': ['"Pick up where you left off": שלושה שדות, הראשון גדול', 'התערוכות והאמנים שלך, כל אחד בצבע שלו, עם מה שקורה עכשיו',
             'סביבך: שדות בצבע של סוג המקום, עם נקודה חיה'],
     'weigh': ['הכי צבעוני ונועז', 'הכי רחוק מ"אפליקציה רגילה"; צריך לשמור שיישאר רגוע ולא רועש'],
     'caps': ['השבוע שלך בצבע', 'התערוכות שלך', 'האמנים שלך וסביבך']},
]


def phone(src, cap=''):
    return f'<figure class="ph"><div class="fr"><img src="{src}" alt=""></div>{f"<figcaption>{cap}</figcaption>" if cap else ""}</figure>'


def cover():
    asked = ''.join(f'<li>{x}</li>' for x in ['אמנים, תערוכות ויצירות שעוקבים אחריהם', 'מה ראיתי לאחרונה', 'מה רץ עכשיו סביבי'])
    not_asked = ''.join(f'<li>{x}</li>' for x in ['סטורי', 'הרשמה לאמנים', 'ערים', 'מפה'])
    phones = ''.join(f'<div class="cv">{phone(f"print/{d["key"]}-0.jpg")}<b style="--c:{d["c"]}">{d["name"]}</b><span>{d["en"]}</span></div>' for d in DIRS)
    return f'''<section class="page cover">
  <div class="brand"><svg viewBox="0 0 132 132"><rect x="8" y="8" width="116" height="116" rx="36" fill="#1F2A44"/><path d="M42 106 V62 a24 24 0 0 1 48 0 V106 Z" fill="#F5C9B8"/></svg>Open Studio</div>
  <h1>שלושה כיוונים לעמוד הבית</h1>
  <p class="lede">כל אחד בנוי מהתוכן האמיתי של האפליקציה, כמו שייראה ביום ראשון, 1 בנובמבר: Low Tide נפתחת הערב, Ink, Breath נסגרת ביום רביעי, והתערוכות סביבך הן תערוכות אמיתיות מהמפה של תל אביב.</p>
  <div class="ask"><div><h3>יש בכל אחד</h3><ul class="yes">{asked}</ul></div><div><h3>אין באף אחד</h3><ul class="no">{not_asked}</ul></div></div>
  <div class="cvs">{phones}</div>
  <p class="foot">Open Studio · נובמבר 2026</p></section>'''


def one(i, d):
    how = ''.join(f'<li>{x}</li>' for x in d['how'])
    weigh = ''.join(f'<li>{x}</li>' for x in d['weigh'])
    phones = ''.join(phone(f'print/{d["key"]}-{k}.jpg', d['caps'][k]) for k in range(3))
    return f'''<section class="page" style="--c:{d['c']}">
  <div class="top"><span class="sw"></span><span class="num">כיוון {['ראשון', 'שני', 'שלישי'][i]} מתוך שלושה</span></div>
  <h2>{d['name']} <span>{d['en']}</span></h2>
  <p class="idea">{d['idea']}</p>
  <div class="live"><b>הדבר החי</b>{d['live']}</div>
  <div class="row">{phones}</div>
  <div class="cols"><div><h3>איך הוא עונה על מה שביקשת</h3><ul>{how}</ul></div><div><h3>מה לשקול</h3><ul>{weigh}</ul></div></div>
  <p class="foot">Open Studio · שלושה כיוונים לעמוד הבית · {i + 2}</p></section>'''


def verdict():
    return '''<section class="page last">
  <h2>ההמלצה: הקיר</h2>
  <p class="big">הוא היחיד שלא יכול להיות של אפליקציה אחרת. העבודות בגודל אמיתי, הפתחים בצורת הלוגו והקיר שמשנה צבע הם בדיוק מה ש-Open Studio מבטיחה: לראות אמנות כמו בחלל אמיתי.</p>
  <h3>ולקחת משני האחרים</h3>
  <ul><li>מ<b>שדה הצבע</b>: את "השבוע שלך בצבע", פס יומי בצבע של מה שראית</li><li>מ<b>הקטלוג</b>: את המספרים הגדולים, Tonight ו-3 days left, ואת הסימנייה Continue</li></ul>
  <h3>מה קורה אחרי שתבחר</h3>
  <ol><li>אבנה את הכיוון באפליקציה, עם הנתונים האמיתיים שלך: מה אתה עוקב אחריו ומה ראית</li><li>אבדוק אותו בטלפון, בהיר וכהה, ואראה לך צילומי מסך</li><li>אעלה אותו ל-Figma כרכיבים שאפשר לערוך</li></ol>
  <p class="note">אלה סקיצות לבחירה, לא האפליקציה עצמה. התמונות והשמות מעולם הדמו של האפליקציה; התערוכות סביבך אמיתיות, מהקריאה היומית של המפה.</p>
  <p class="foot">Open Studio · שלושה כיוונים לעמוד הבית · 5</p></section>'''


CSS = '''@page{size:A4;margin:0}
*{box-sizing:border-box}
body{margin:0;font-family:'Assistant',sans-serif;color:#1B1A17;font-size:11.5pt;line-height:1.5;background:#fff}
.page{width:210mm;height:297mm;padding:15mm 15mm 12mm;position:relative;overflow:hidden;page-break-after:always;background:#FBF8F2}
h1{font-family:'Frank Ruhl Libre',serif;font-weight:500;font-size:36pt;line-height:1.05;margin:6mm 0 4mm}
h2{font-family:'Frank Ruhl Libre',serif;font-weight:500;font-size:30pt;line-height:1.05;margin:2mm 0 3mm}
h2 span{font-family:'Assistant',sans-serif;font-size:13pt;font-weight:600;color:#6B655B;margin-right:3mm}
h3{font-size:12pt;margin:0 0 1.5mm}
ul,ol{margin:0;padding-right:5mm}li{margin:.8mm 0}
.brand{display:flex;align-items:center;gap:2.5mm;font:700 15pt 'Figtree',sans-serif;direction:ltr;justify-content:flex-end}
.brand svg{width:9mm;height:9mm}
.lede{font-size:13pt;max-width:165mm;color:#3F3B35;margin:0}
.ask{display:flex;gap:14mm;margin:7mm 0 0}
.ask ul{list-style:none;padding:0}.ask li{margin:1mm 0}
.yes li:before{content:"✓";color:#2F6B4F;font-weight:700;margin-left:2mm}
.no li{color:#8A8378;text-decoration:line-through}
.cvs{display:flex;gap:8mm;justify-content:center;margin-top:10mm}
.cv{display:grid;justify-items:center;gap:1mm}
.cv b{font-family:'Frank Ruhl Libre',serif;font-weight:500;font-size:17pt;margin-top:2mm}
.cv b:before{content:"";display:inline-block;width:3.5mm;height:3.5mm;border-radius:50%;background:var(--c);margin-left:2mm;vertical-align:1mm}
.cv span{font-size:10pt;color:#6B655B}
.ph{margin:0;display:grid;gap:2mm;justify-items:center}
.fr{background:#111;border-radius:7mm;padding:1.8mm;width:52mm}
.cover .fr{width:50mm}
.fr img{display:block;width:100%;border-radius:5.4mm}
figcaption{font-size:9.5pt;color:#5E594F;text-align:center;max-width:52mm}
.top{display:flex;align-items:center;gap:3mm}
.sw{width:12mm;height:2.5mm;border-radius:2mm;background:var(--c)}
.num{font-size:10pt;color:#6B655B}
.idea{font-size:12.5pt;margin:0 0 3mm;max-width:175mm}
.live{background:color-mix(in srgb,var(--c) 14%,#fff);border-radius:3mm;padding:3mm 4mm;font-size:11.5pt;max-width:180mm}
.live b{display:block;font-size:9.5pt;color:#5E594F}
.row{display:flex;gap:6mm;justify-content:center;margin:6mm 0 5mm}
.cols{display:grid;grid-template-columns:1.3fr 1fr;gap:8mm;font-size:11pt}
.last .big{font-family:'Frank Ruhl Libre',serif;font-size:17pt;line-height:1.4;margin:0 0 8mm;max-width:175mm}
.last h3{font-size:13pt;margin:6mm 0 2mm}
.last li{font-size:12pt;margin:1.5mm 0}
.note{margin-top:10mm;font-size:10pt;color:#6B655B;max-width:170mm}
.foot{position:absolute;bottom:6mm;left:15mm;right:15mm;font-size:8.5pt;color:#8F877A;margin:0}
'''

html = f'''<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8"><title>Open Studio · שלושה כיוונים לעמוד הבית</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Frank+Ruhl+Libre:wght@500;700&family=Assistant:wght@400;600;700&family=Figtree:wght@700&display=swap">
<style>{CSS}</style></head><body>{cover()}{''.join(one(i, d) for i, d in enumerate(DIRS))}{verdict()}</body></html>'''
(HERE / 'home-directions.html').write_text(html, encoding='utf-8')
js = HERE / '_pdf.js'
js.write_text("""const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch(); const p=await b.newPage();
await p.goto('file://'+process.argv[2],{waitUntil:'networkidle'}); await p.evaluate(()=>document.fonts.ready); await p.waitForTimeout(600);
await p.pdf({path:process.argv[3],width:'210mm',height:'297mm',printBackground:true,margin:{top:0,bottom:0,left:0,right:0}}); await b.close();})();""")
subprocess.run(['node', str(js), str(HERE / 'home-directions.html'), str(HERE / 'open-studio-home-directions.pdf')], check=True)
js.unlink()
print('wrote', HERE / 'open-studio-home-directions.pdf')
