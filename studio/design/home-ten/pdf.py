"""The ten directions as a Hebrew PDF (A4): a cover, a page for each (way in and Home), three picks.

    python3 studio/design/home-ten/build.py && python3 studio/design/home-ten/pdf.py   # shots in print/ (see the report)
"""
import html
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.argv = ['x']
import build  # noqa: E402  (writes the screens too)
D = build.D
PICK = {'labels': 1, 'now': 2, 'constellation': 3}
ph = lambda src: f'<div class="fr"><img src="{src}" alt=""></div>'
cover = f'''<section class="page"><div class="brand"><svg viewBox="0 0 132 132"><rect x="8" y="8" width="116" height="116" rx="36" fill="#1F2A44"/><path d="M42 106 V62 a24 24 0 0 1 48 0 V106 Z" fill="#F5C9B8"/></svg>Open Studio</div>
<h1>עשרה כיוונים לכניסה ולעמוד הבית</h1>
<p class="lede">כל כיוון בנוי סביב רעיון אחד מעולם האמנות, עם אותו תוכן בדיוק: יום ראשון, 1 בנובמבר, חובב אמנות בתל אביב שעוקב אחרי שלושה אמנים. בכל אחד יש אמנים, תערוכות ויצירות שעוקבים אחריהם, מה נפתח לאחרונה ומה רץ עכשיו קרוב. אין בהם סטורי, הרשמה לאמנים, ערים, מפה או תמונות ענק.</p>
<div class="grid">{''.join(f'<div class="g"><img src="print/{d[0]}-home.jpg" alt=""><b>{i}. {html.escape(d[2])}</b></div>' for i, d in enumerate(D, 1))}</div>
<p class="foot">Open Studio · נובמבר 2026</p></section>'''
pages = ''.join(f'''<section class="page"><div class="top"><span class="n">{i}</span><div><h2>{html.escape(he)} <span>{html.escape(name)}</span></h2>{f'<b class="pick">בחירה {PICK[key]} שלי</b>' if key in PICK else ''}</div></div>
<p class="idea">{html.escape(idea)}</p><p class="meta"><span dir="ltr">{html.escape(sentence)}</span><br>השראה: {html.escape(insp)}</p>
<div class="row"><figure>{ph(f"print/{key}-welcome.jpg")}<figcaption>כניסה</figcaption></figure><figure>{ph(f"print/{key}-home.jpg")}<figcaption>עמוד הבית</figcaption></figure></div>
<p class="foot">Open Studio · עשרה כיוונים · {i + 1}</p></section>''' for i, (key, name, he, idea, sentence, insp, *_r) in enumerate(D, 1))
last = '''<section class="page"><h1>שלושה שהייתי לוקח הלאה</h1><ol class="v">
<li><b>תווית הקיר (4).</b> הכי נקי ואלגנטי, ומדבר בשפה של הגלריה עצמה. נקודת הצבע (מוצג, ימים אחרונים, חדש) עובדת בכל מקום באפליקציה, גם בעמוד האמן ובמפה.</li>
<li><b>היום (7).</b> הכי חי. קו ה-NOW והפסים של "כמה זמן נשאר" משדרים מיד שזה קורה עכשיו.</li>
<li><b>קבוצת כוכבים (2).</b> הכי חדשני. הקשרים בין אמן, תערוכה וחדר הם העיצוב עצמו: התקשורת היצירתית בין הדברים.</li></ol>
<p class="big">שילוב אפשרי: עמוד הבית בנוי כמו "היום", וכל פריט בו הוא "תווית קיר" עם נקודת הצבע שלה.</p>
<p class="note">סקיצות לבחירה, לא האפליקציה עצמה. התמונות והשמות מעולם הדמו; התערוכות הקרובות אמיתיות, מהקריאה היומית של המפה.</p>
<p class="foot">Open Studio · עשרה כיוונים · 12</p></section>'''
css = '''@page{size:A4;margin:0}*{box-sizing:border-box}body{margin:0;font-family:'Assistant',sans-serif;color:#1B1A17;font-size:11.5pt;line-height:1.5}
.page{width:210mm;height:297mm;padding:15mm;position:relative;overflow:hidden;page-break-after:always;background:#FBF8F2}
h1{font-family:'Frank Ruhl Libre',serif;font-weight:500;font-size:32pt;line-height:1.05;margin:6mm 0 4mm}
h2{font-family:'Frank Ruhl Libre',serif;font-weight:500;font-size:26pt;line-height:1.05;margin:0}h2 span{font-family:'Assistant';font-size:12pt;color:#6B655B;margin-right:3mm}
.brand{display:flex;align-items:center;gap:2.5mm;font:700 14pt 'Figtree',sans-serif;direction:ltr;justify-content:flex-end}.brand svg{width:8mm;height:8mm}
.lede{font-size:12pt;color:#3F3B35;max-width:175mm;margin:0}
.grid{display:grid;grid-template-columns:repeat(5,1fr);gap:4mm;margin-top:8mm}.g{display:grid;gap:1.5mm}.g img{width:100%;border-radius:2.5mm;border:1px solid #DDD7CC}.g b{font-size:9.5pt}
.top{display:flex;gap:5mm;align-items:flex-start}.n{font:500 34pt/1 'Frank Ruhl Libre',serif;color:#8F877A}.pick{display:block;color:#C2412D;font-size:10.5pt;margin-top:1mm}
.idea{font-size:12.5pt;margin:5mm 0 2mm}.meta{font-size:10pt;color:#6B655B;margin:0 0 6mm}
.row{display:flex;gap:10mm;justify-content:center}figure{margin:0;display:grid;gap:2mm;justify-items:center}figcaption{font-size:10pt;color:#6B655B}
.fr{background:#111;border-radius:7mm;padding:1.8mm;width:72mm}.fr img{display:block;width:100%;border-radius:5.4mm}
.v li{font-size:13pt;margin:4mm 0}.big{font-family:'Frank Ruhl Libre',serif;font-size:16pt;line-height:1.4;margin-top:8mm}.note{font-size:10pt;color:#6B655B;margin-top:10mm}
.foot{position:absolute;bottom:6mm;left:15mm;right:15mm;font-size:8.5pt;color:#8F877A;margin:0}'''
doc = f'''<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8"><title>Open Studio · עשרה כיוונים</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Frank+Ruhl+Libre:wght@500&family=Assistant:wght@400;600;700&family=Figtree:wght@700&display=swap"><style>{css}</style></head><body>{cover}{pages}{last}</body></html>'''
(HERE / 'ten-directions.html').write_text(doc, encoding='utf-8')
js = HERE / '_pdf.js'
js.write_text("""const {chromium}=require('playwright');(async()=>{const b=await chromium.launch();const p=await b.newPage();
await p.goto('file://'+process.argv[2],{waitUntil:'networkidle'});await p.evaluate(()=>document.fonts.ready);await p.waitForTimeout(600);
await p.pdf({path:process.argv[3],width:'210mm',height:'297mm',printBackground:true,margin:{top:0,bottom:0,left:0,right:0}});await b.close();})();""")
subprocess.run(['node', str(js), str(HERE / 'ten-directions.html'), str(HERE / 'open-studio-ten-directions.pdf')], check=True)
js.unlink()
print('wrote open-studio-ten-directions.pdf')
