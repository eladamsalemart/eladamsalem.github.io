"""Builds summary.pdf: a two-page Hebrew summary of the night of 9.11.2026 (Chrome headless)."""
import os, subprocess
from pathlib import Path
HERE = Path(__file__).parent

rows = [
  ('חללים', 'בטון אמיתי יותר (גוון לכל לוח, חיבורים, חורי קשירה). מאחורי החלונות עולם תלת-ממדי: דשא, עצים, חומה, בתים וערפל. הרינדור בשרת הצליח והחללים באפליקציה.', 'עץ בסטודיו מסתיר מדי; דשא בביתן הזכוכית עוד שטוח'),
  ('On View', 'הסבר קצר למה זה חשוב. אפשר להיכנס לכל גודל חלל לפני שבוחרים. עורך תלייה בתוך החלל: גרירה, יישור, ריווח, ביטול, פודיומים לפסלים.', 'כמה חדרים מחוברים: עוד לא נבנה'),
  ('הסטודיו של האמן', 'העמוד של האמן הוא הסטודיו, ונערך במקום. 4 כפתורים במקום 16, ורשימת "3 דברים לפני שהעמוד עולה".', 'לבדוק על אייפון אמיתי'),
  ('לוח הבקרה', 'תור החלטות אחד, 4 לשוניות, אישור בנגיעה. 4 כיווני עיצוב ב-PDF.', 'לבחור כיוון; לאשר אמן אמיתי אחד'),
  ('דף הבית', 'לכל כוכב תמונה ושם, זום, Wander, כרטיס בהקשה, מדף "Meet someone new".', 'לבדוק על אייפון אמיתי'),
  ('אמנים', '26 אמנים חדשים (13 נשים, 13 גברים). סך הכול 36 אמנים, 26 תערוכות, 6 היסטוריות.', '—'),
  ('מוזיאון', 'הצעה של 14 עמודים. המלצה: מגזין שכל כתבה בו היא חדר. האוצר במחשב או באייפד, המבקר בטלפון.', 'לבחור כיוון'),
]
tr = ''.join(f'<tr><th>{a}</th><td>{b}</td><td class="o">{c}</td></tr>' for a, b, c in rows)
html = f'''<!doctype html><html lang="he" dir="rtl"><meta charset="utf-8"><style>
@page {{ size: A4; margin: 16mm 15mm }}
body {{ font-family: Arial, "Segoe UI", sans-serif; color:#1d1c1a; font-size:11.5pt; line-height:1.45 }}
h1 {{ font-size:22pt; margin:0 }} .sub {{ color:#6b665e; margin:2px 0 14px }}
.ok {{ background:#eef4ea; border-right:4px solid #5b8a4a; padding:8px 12px; margin-bottom:14px }}
table {{ width:100%; border-collapse:collapse }} th,td {{ text-align:right; vertical-align:top; padding:7px 6px; border-bottom:1px solid #ddd8cf }}
th {{ width:19%; font-size:12pt }} td.o {{ width:27%; color:#9a4f1c; font-size:10.5pt }}
h2 {{ font-size:14pt; margin:18px 0 6px }} ol {{ margin:0; padding-right:20px }} li {{ margin:3px 0 }}
.pg {{ page-break-before:always }} img {{ display:block; max-width:100% }}
.shots {{ display:flex; gap:10px; justify-content:center; margin-top:10px }} .shots img {{ height:300px; border:1px solid #ddd8cf }}
.cap {{ color:#6b665e; font-size:9.5pt; text-align:center; margin-top:4px }}
</style><body>
<h1>Open Studio · סיכום הלילה</h1><div class="sub">9.11.2026 · שבע משימות</div>
<div class="ok"><b>השורה התחתונה:</b> כל המשימות נעשו ועלו לאפליקציה החיה, חוץ מחללים של כמה חדרים מחוברים. שום דבר עוד לא נבדק על טלפון אמיתי.</div>
<table><tr><th>מה</th><td><b>מה נעשה</b></td><td class="o"><b>פתוח</b></td></tr>{tr}</table>
<h2>מה צריך ממך</h2><ol>
<li>לפתוח באייפון את דף הבית, את עורך התלייה ואת עריכת העמוד.</li>
<li>לאשר אמן אמיתי אחד בלוח הבקרה החדש.</li>
<li>לבחור כיוון ללוח הבקרה (admin-options.pdf) ולמוזיאון (museum-proposal.pdf).</li>
<li>לענות על 4 שאלות קצרות בסוף studio.md, ולהחליט אם לבנות חללים של כמה חדרים.</li></ol>
<div class="pg"></div><h2>החללים: לפני ואחרי</h2><img src="rooms.jpg">
<div class="shots"><img src="home/1-rest.jpg"><img src="studio/after-edit.jpg"></div>
<div class="cap">משמאל לימין: דף הבית החדש · הסטודיו של האמן במצב עריכה</div>
</body></html>'''
(HERE / 'summary.html').write_text(html, encoding='utf-8')
chrome = next(p for p in (r'C:\Program Files\Google\Chrome\Application\chrome.exe', r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe') if os.path.exists(p))
out = HERE / 'summary.pdf'
subprocess.run([chrome, '--headless=new', '--disable-gpu', '--no-pdf-header-footer', '--virtual-time-budget=8000', f'--print-to-pdf={out}', (HERE / 'summary.html').as_uri()], check=True, timeout=120)
print('ok', out.stat().st_size)
