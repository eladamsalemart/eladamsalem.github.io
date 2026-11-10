"""Builds summary.pdf: a two-page Hebrew summary of the night of 10.11.2026 (Chrome headless)."""
import os, subprocess
from pathlib import Path
HERE = Path(__file__).parent

rows = [
  ('דף הבית', 'גלילה למטה מעל הכוכבים מורידה בעמוד; זום רק בשתי אצבעות. בלי +/− ובלי Wander. מתחת לכוכבים Walk in now: שורת תערוכות שגוללים הצידה, ואחריה Meet someone new. מעכשיו המראה נעול.', 'לנסות גלילה באצבע באייפון; כרגע 3 תערוכות בשורה'),
  ('עמוד האמן', 'התערוכות מוצגות באותה שורת קשתות כמו בדף הבית. 5 עבודות אחרונות ואז "עוד"; השאר לפי סוג ובתוכו לפי שנים.', 'לאשר: סדר לפי סוג ושנה'),
  ('עריכת הסטודיו', 'בלי תמונת פרופיל: מחליפים את תמונת הפתיחה בנגיעה וגוררים למיקום. רקע בהיר, גופן גדול, כפתורים גדולים. כפתור אחד "+ Add work". בתחתית עריכת תערוכה: A walk-through tour עם הסבר; התמונות שם רק לסיור.', 'לא נבדק מול חשבון אמיתי'),
  ('החללים', 'האבחנה: הקירות והחלונות נשמרו ברזולוציה נמוכה מאוד והטלפון מגדיל אותם פי 4–9. עכשיו: פי 2–3 חדות, כל חלון מצולם בנפרד בחדות גבוהה, טקסטורה עדינה בקירות. הליכה מהירה יותר (1.9 מטר לשנייה). תוכנית לשבועות ב-rooms-plan.md.', 'הבנייה הסתיימה: כל החדרים חדים חוץ מבטון גדול (צריך הרצה נוספת). הכתם השחור ברצפה נעלם. בחירת 1/2/3 חדרים עלתה. עומק לחלון: עוד לא'),
  ('שקופיות פתיחה', 'שני קובצי PDF: לאמנים ולאוהבי אמנות. ארבעה כיווני עיצוב, תסריט של 6 מסכים, ואיך זה מתחבר לאפליקציה.', 'לבחור כיוון; לעבור על הטקסטים'),
  ('צבעי רקע', 'שש סכמות על מסכים אמיתיים. המלצה: נייר חם כבסיס, קקאו כהה רק לערב, גרגר נייר עדין.', 'לבחור'),
  ('לוח בקרה למחשב', 'אייקון Open Studio Desk בשולחן העבודה. 7 עמודות: אמנים, אוהבי אמנות, תערוכות (לפי אמנים / גלריות ומוסדות / של האפליקציה), מוזיאון, אישורים, מערכת, שיחות. הקישור במייל מחזיר ללוח.', 'לנסות עם הנתונים האמיתיים'),
  ('מוזיאון', 'מחקר על המוזיאונים החדשים בעולם והצעה אדריכלית של 30 עמודים עם כמה כיוונים למוזיאון שהולכים בו. המלצה: כיוון C.', 'לבחור כיוון, תערוכה ראשונה, 4 אמנים ושם'),
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
<h1>Open Studio · סיכום הלילה</h1><div class="sub">10.11.2026 · חמישה עוזרים</div>
<div class="ok"><b>השורה התחתונה:</b> הכול נבנה, נדחף ועלה לאפליקציה החיה, כולל החללים החדים (חוץ מבטון גדול). לוח הבקרה במחשב עם אייקון. שום דבר לא נבדק על אייפון אמיתי.</div>
<table><tr><th>מה</th><td><b>מה נעשה</b></td><td class="o"><b>פתוח</b></td></tr>{tr}</table>
<h2>מה צריך ממך</h2><ol>
<li>באייפון: לגלול למטה מעל הכוכבים, ולערוך את העמוד שלך כאמן (תמונת פתיחה, הוספת עבודה).</li>
<li>במחשב: לפתוח את open-studio-desk/?guest ולנסות כתבה חדשה עם שלוש עבודות.</li>
<li>לאשר שאוסיף את כתובת לוח הבקרה לרשימת ההתחברות (כדי שקישור המייל יחזיר אליו).</li>
<li>לבחור כיוון לשקופיות ולצבע הרקע, ולשלוח צילום ייחוס אחד לכל סוג חלל אם יש לך.</li></ol>
<div class="pg"></div><h2>תמונות מהלילה</h2>
<div class="shots"><img src="home/1-first-screen-peek.jpg"><img src="home/2-walk-in-now-row.jpg"><img src="studio/after-edit.jpg"></div>
<div class="cap">דף הבית: מה שמציץ מתחת לכוכבים · שורת Walk in now · עריכת הסטודיו בבהיר</div>
<img src="rooms/walls-floor-before-after.jpg" style="max-height:330px;margin:12px auto 0">
<div class="cap">החללים באפליקציה: לפני ואחרי</div>
</body></html>'''
(HERE / 'summary.html').write_text(html, encoding='utf-8')
chrome = next(p for p in (r'C:\Program Files\Google\Chrome\Application\chrome.exe', r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe') if os.path.exists(p))
out = HERE / 'summary.pdf'
subprocess.run([chrome, '--headless=new', '--disable-gpu', '--no-pdf-header-footer', '--virtual-time-budget=8000', f'--print-to-pdf={out}', (HERE / 'summary.html').as_uri()], check=True, timeout=120)
print('ok', out.stat().st_size)
