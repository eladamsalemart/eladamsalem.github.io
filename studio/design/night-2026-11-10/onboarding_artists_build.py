"""Builds onboarding-artists.pdf (Hebrew, 16:9): python studio/design/night-2026-11-10/onboarding_artists_build.py
Needs the shots from slides_shots_all.py (app, studio). The drawn screens use the demo artists' public-domain works."""
from slides_lib import *

W = work; P = person
TAG = '<span class="brandtag">Open Studio · קליטת אמנים</span>'
S = []
def add(inner, cls='', foot=TAG): S.append(slide(inner, cls, len(S) + 1, foot))

# ---- the three screens of each look (artists) -------------------------------------------------------------
def three(d):
    c = lambda i: i
    stars1 = [(70, 10, 120, P('berthe-morisot')), (200, 70, 84, W('irises')), (30, 150, 90, W('the-starry-night')), (150, 190, 110, P('vincent-van-gogh'))]
    a = look(d, 1, 'pic', 'Welcome, Dana', 'Your studio<br>is open', 'Your works at their real size, and your shows as rooms anyone can walk through.', W('the-starry-night'), stars=stars1, cta='Show me')
    b = look(d, 2, 'pic', 'Your page', 'Face, words,<br>works', 'Tap anything on your page and write right there. No forms.', W('irises'), step=1,
             stars=[(60, 20, 110, P('mary-cassatt')), (190, 20, 90, W('sunflowers')), (40, 150, 100, W('dance')), (160, 170, 100, W('the-cradle'))])
    cc = look(d, 3, 'list', 'First steps', 'Three things,<br>then we look', 'Open Studio looks at every new page before it goes live.',
              items=[('Add your portrait', '', True), ('Write a few lines about your work', '', True), ('Add at least 3 works', '1 of 3 so far', False)], step=2, cta='Open my studio')
    return [a, b, cc]

# 1 cover
add(f'''<div style="display:grid;grid-template-columns:1fr 330px;gap:40px;height:100%;align-items:end">
<div style="align-self:center"><div class="kick">OPEN STUDIO · קליטת אמנים · 10.11.2026</div>
<h1 style="font-size:96px">הסטודיו שלך<br>פתוח</h1>
<p class="lede" style="max-width:560px">איך קולטים אמן שבדיוק נרשם: מסכי פתיחה שמחים, צעדים ראשונים, ומשם אל ההבטחה של האפליקציה: תערוכות שאפשר להיכנס אליהן.</p>
<p class="small" style="opacity:.8">ארבעה כיווני עיצוב, תסריט מלא, ואיך זה נבנה ומתחבר לאפליקציה. הצעה בלבד: לא שונה קוד באפליקציה.</p></div>
<div style="height:640px;display:flex;align-items:flex-end;gap:14px"><div style="width:230px;height:520px;border-radius:999px 999px 0 0;overflow:hidden;background:var(--peach)"><img src="{W('the-starry-night')}" style="width:100%;height:100%;object-fit:cover"></div><div style="display:grid;gap:14px"><div style="width:96px;height:96px;border-radius:50%;overflow:hidden"><img src="{P('berthe-morisot')}" style="width:100%;height:100%;object-fit:cover"></div><div style="width:96px;height:96px;border-radius:50%;overflow:hidden"><img src="{P('hilma-af-klint')}" style="width:100%;height:100%;object-fit:cover"></div><div style="width:96px;height:140px;border-radius:999px 999px 0 0;background:var(--sun)"></div></div></div></div>''', 'dark-s', '')

# 2 summary
add(f'''<div class="kick">בקצרה</div><h2>מה אמן צריך להרגיש ב־10 הדקות הראשונות</h2>
<p class="lede">לא "למדתי את האפליקציה", אלא "העמוד שלי כבר נראה כמו אמן אמיתי". לכן ההצעה היא סיור קצר של חמישה מסכים, ואחריו רשימת צעדים חיה בתוך האולפן.</p>
<div class="g4" style="margin-top:22px">
<div class="card c-navy"><h3>1. הפנים והמילים</h3><p class="small">תמונת דיוקן, כמה שורות על העבודה, ו־CV. כותבים ישר על העמוד, בלי טפסים.</p></div>
<div class="card c-terra"><h3>2. העבודות</h3><p class="small">מביאים מאתר, מדרייב, מאינסטגרם או מהטלפון. שלוש עבודות והעמוד מוכן לבדיקה.</p></div>
<div class="card c-sun"><h3>3. תערוכות עבר</h3><p class="small">מוסיפים תערוכה שהייתה, עם תמונות מהחלל, ואנחנו הופכים אותה לסיור תלת־ממדי.</p></div>
<div class="card c-mint"><h3>4. On View</h3><p class="small">תערוכה וירטואלית חדשה מהעבודות הקיימות שלך, בחלל שאתה בוחר, באוצרות שלך.</p></div></div>
<div class="note"><b>ההמלצה שלי:</b> כיוון ב׳ (קשתות וצבע) למסכי הברכה, כי הוא כבר חי בבחירת התפקיד (כחול כהה ואדמה); כיוון א׳ (נייר ועיפרון) לרשימת הצעדים בתוך האולפן. כיוון ג׳ (שמיים) נשמר לחובבי האמנות.</div>''', '')

# 3 flow
add(f'''<div class="kick">איפה זה נכנס</div><h2>המסלול היום, והמקום של הסיור</h2>
<div class="flow" style="margin:26px 0"><div class="b">הרשמה<br><code>#/welcome</code></div><div class="ar">←</div><div class="b">פרטים<br><code>#/welcome/details</code></div><div class="ar">←</div><div class="b">"מי אתה כאן?"<br><span class="en">I make art</span></div><div class="ar">←</div><div class="b new"><b>חדש: סיור פתיחה</b><br>5 מסכים · <code>#/welcome/artist</code></div><div class="ar">←</div><div class="b">האולפן<br><code>#/studio</code> + רשימת צעדים</div></div>
<div class="g2"><div class="card"><h3>מה קיים היום</h3><ul class="l small"><li>אחרי בחירת "I make art" האמן מגיע למסך אחד: <span class="en">Your studio is open</span>, עם כפתורים "Open your studio", "Look around first".</li><li>באולפן יש כבר כרטיס עם שלושה צעדים (דיוקן, כמה שורות, שלוש עבודות) ו"שליחה לבדיקה".</li></ul></div>
<div class="card c-sun"><h3>מה ההצעה משנה</h3><ul class="l small"><li>המסך האחד הופך לסיור של חמישה מסכים, באותו נתיב ובאותה נקודת זמן. אין מסלול חדש.</li><li>הכרטיס באולפן גדל מ־3 צעדים ל־6 (הוספה: תערוכה ראשונה, סיור תלת־ממדי, On View), ונשאר חי: מחושב מהנתונים.</li></ul></div></div>
<p class="small muted" style="margin-top:12px">מקור: <code>auth.js</code> (הפונקציות role ו־artistSoon), <code>studio-page.js</code> (הפונקציה things).</p>''')

# 4-7 directions
DIR = [
 ('a', 'כיוון א׳: נייר ועיפרון', 'Studio Paper כמו שהיא: נייר חם, תמונה מוצמדת כמו בגלריה, ויד העיפרון רק על מה שחי עכשיו ("Welcome, Dana").',
  'שקט, מזוהה מיד עם האפליקציה, קל לתחזוקה. מצוין לרשימת הצעדים.', 'פחות "שמח" ופחות צבעוני: כמעט לא נבדל ממסכי האפליקציה, אז לא מרגיש כמו רגע מיוחד.'),
 ('b', 'כיוון ב׳: קשתות וצבע', 'בלוקים של צבע מלא (כחול כהה, אדמה, חמה) וקשת ענקית עם עבודה בתוכה, כמו מסך "I make art" שכבר באפליקציה.',
  'הכי שמח וברור, ממשיך צורה וצבעים שכבר קיימים, וכל מסך זוכר מרחוק.', 'צבע מלא על שלושה מסכים ברצף יכול להיות חזק; צריך לבדוק ניגוד (הכל כאן AA ומעלה).'),
 ('c', 'כיוון ג׳: שמיים של יום', 'שמיים פסטל כמו בבית, עבודות ואמנים כמו כוכבים עגולים, קו עיפרון דק מחבר ביניהם.',
  'מחבר לבית, יפה ורך, מרגיש "אני חלק מרשת".', 'הבית הוא מסך נעול (הבעלים אישר אותו): הדמיון הזה חזק ויכול להיראות כשכפול. מתאים יותר לחובבי אמנות.'),
 ('d', 'כיוון ד׳: קיר גלריה', 'העבודה בגדול על קיר צבוע (מרווה, חימר, יין), עם שלט מוזיאון לבן מתחתיה.',
  'מכבד את האמנות: העבודה היא הגיבורה. תחושה של "תערוכה".', 'פחות שמח, והקיר הכהה קרוב ל"שחור" שהבעלים מהסס לגביו. תלוי מאוד בתמונות שיש.')]
for d, name, idea, pro, con in DIR:
    ph = ''.join(drawn(x, 205) for x in three(d))
    add(f'''<div class="row" style="gap:44px;height:100%;align-items:center"><div style="width:400px;flex:none"><div class="kick">כיוון עיצוב</div><h2>{name}</h2><p>{idea}</p><p class="small"><span class="pro">יתרון:</span> {pro}</p><p class="small"><span class="con">חיסרון:</span> {con}</p><p class="small muted">שלושה מסכים: ברכה, "העמוד שלך", צעדים ראשונים. טקסט המסכים באנגלית כי האפליקציה באנגלית.</p></div><div style="display:flex;gap:22px;align-items:center">{ph}</div></div>''')

# 8 recommendation: mixed
rec = [look('b', 1, 'pic', 'Welcome, Dana', 'Your studio<br>is open', 'Your works at their real size, and your shows as rooms anyone can walk through.', W('the-starry-night'), cta='Show me'),
       look('b', 2, 'pic', 'Your page', 'Face, words,<br>works', 'Tap anything on your page and write right there. No forms.', W('irises'), step=1),
       look('b', 3, 'pic', 'Your shows', 'Your past shows,<br>walkable', 'Add a show you had, with photos of the space. We turn it into a 3D tour.', W('hay-harvest-at-eragny'), step=2, cta='Next'),
       look('a', 3, 'list', 'First steps', 'Three things,<br>then we look', 'Open Studio looks at every new page before it goes live.', items=[('Add your portrait', '', True), ('Write a few lines about your work', '', True), ('Add at least 3 works', '1 of 3 so far', False)], step=2, cta='Open my studio')]
add(f'''<div class="row" style="gap:40px;align-items:center;height:100%"><div style="width:360px;flex:none"><div class="kick">ההמלצה</div><h2>קשתות לברכה, נייר לעבודה</h2><p>מסכי הברכה (שלושת הראשונים) בכיוון ב׳, כי זה הרגע השמח והצבעוני. ברגע שהאמן נכנס לאולפן הוא מקבל את כיוון א׳: נייר, ברור, בלי להסיח.</p><p class="small">כך שני התפקידים מקבלים זהות משלהם בלי להשבית את האפליקציה: אמנים בכחול כהה, חובבי אמנות באדמה ובשמיים.</p></div>
<div style="display:flex;gap:18px;align-items:center">{"".join(drawn(x, 160) for x in rec)}</div></div>''', 'peach-s')

# 9 the full series
sc = [('Welcome, Dana', 'Your studio is open', 'ברכה: מה זה האולפן במשפט, ו"דלג" תמיד נראה.', W('the-starry-night'), 1),
      ('Your page', 'Face, words, works', 'דיוקן, כמה שורות, CV ועבודות: כותבים ישר על העמוד.', W('irises'), 2),
      ('Bring your work in', 'From wherever it lives', 'אתר, דרייב, אינסטגרם (קובץ הייצוא) או הטלפון: עבודות בכמה הקשות.', W('sunflowers'), 3),
      ('Your shows', 'Past shows, walkable', 'תערוכה שהייתה, עם תמונות החלל, הופכת לסיור תלת־ממדי.', W('hay-harvest-at-eragny'), 1),
      ('On View', 'Curate your own', 'תערוכה וירטואלית מהעבודות שלך, בחלל שבחרת, שמופיעה ראשונה בעמוד.', W('dance'), 2),
      ('First steps', 'Your checklist', 'מה נשאר לעשות, ואיפה הוא תמיד מחכה: בראש האולפן.', W('the-cradle'), 3)]
ph = ''
for i, (k, t, cap, img, c) in enumerate(sc):
    ph += drawn(look('b', c, 'pic', k, t.replace(', ', ',<br>', 1) if len(t) > 18 else t, '', img, step=min(i // 2, 2), cta='Next' if i < 5 else 'Open my studio').replace('<p></p>', ''), 146, f'{i+1}. {cap}')
add(f'''<div class="kick">התסריט</div><h2>שישה מסכים, בשלוש דקות</h2><p class="small" style="margin-bottom:6px">מסכים 1 עד 5 הם הסיור; המסך השישי הוא הרשימה, שגם נשארת באולפן. בכל מסך: "דלג" למעלה, "הבא" למטה, ונקודות התקדמות.</p><div style="display:flex;gap:14px;justify-content:space-between;margin-top:10px">{ph}</div>''')

# 10 page: portrait, hero, words, CV (real app)
add(f'''<div class="row" style="gap:46px;height:100%;align-items:center"><div style="width:440px;flex:none"><div class="kick">מסך 2 · העמוד שלך</div><h2>דיוקן, תמונת פתיחה, מילים ו־CV</h2>
<div class="step"><div class="n">1</div><div><h3>דיוקן <span class="pill have">קיים</span></h3><p class="small">כפתור עגול על ראש העמוד: מקישים ומחליפים.</p></div></div>
<div class="step"><div class="n">2</div><div><h3>תמונת פתיחה (hero) <span class="pill new">מוצע</span></h3><p class="small">היום העמוד נפתח בעבודה או תמונה מהחומרים שהועלו. מוצע: "בחר/י את תמונת הפתיחה" ברגע ההעלאה הראשונה.</p></div></div>
<div class="step"><div class="n">3</div><div><h3>כמה שורות על העבודה, וסיפור (Bio) <span class="pill have">קיים</span></h3><p class="small">מקישים על הטקסט וכותבים במקום (עריכה חיה).</p></div></div>
<div class="step"><div class="n">4</div><div><h3>CV <span class="pill have">קיים</span></h3><p class="small">שורות בקבוצות (השכלה, תערוכות, פרסים), או נמשכות אוטומטית מהאתר כשמייבאים.</p></div></div></div>
<div style="display:flex;gap:22px;align-items:center">{shot('studio', 168, 'האולפן: עריכה על העמוד עצמו')}{shot('studio_scroll', 168, 'למטה: About, CV, On View')}{shot('artist_about', 168, 'כך זה נראה למבקרים')}</div></div>''', '')

# 11 add works
add(f'''<div class="kick">מסך 3 · להביא עבודות</div><h2>ארבע דרכים להביא את מה שכבר יש</h2>
<p class="lede">אף אחד לא מתחיל מדף ריק: רוב האמנים כבר יש להם אתר, דרייב ואינסטגרם. המסך הזה אומר "בחר מאיפה", וממשיך.</p>
<div class="g4" style="margin-top:20px">
<div class="card c-navy"><h3>אתר</h3><p class="small">קישור לאתר (Open Studio, WordPress, Squarespace, Shopify, Wix): העבודות, ולפעמים גם הטקסטים וה־CV, נמשכים.</p></div>
<div class="card c-terra"><h3>תיקיית דרייב</h3><p class="small">תיקייה משותפת: כל התמונות נכנסות כעבודות, ואפשר לתת להן שם אחר כך.</p></div>
<div class="card c-sun"><h3>אינסטגרם</h3><p class="small">קובץ הייצוא (zip) נקרא בדפדפן עצמו, בלי חיבור לחשבון. חיבור ישיר יחכה לאפליקציית Meta.</p></div>
<div class="card c-mint"><h3>הטלפון</h3><p class="small">תמונות מהגלריה, עם בדיקה מיידית של איכות התמונה.</p></div></div>
<div class="g2" style="margin-top:20px"><div class="card"><h3>בדיקת איכות, בשפה פשוטה</h3><p class="small">כל תמונה נמדדת בדפדפן: 6000 פיקסלים בצלע הארוכה הם התקן (פירוט מלא גם מקרוב); 2000 מספיקים לסיור אבל מרוכך מקרוב; פחות מזה, "קטנה מדי לסיור".</p></div>
<div class="card"><h3>מה הסיור אומר</h3><p class="small">"כאן מביאים. מסתכלים על התוצאה. אפשר להמשיך ולהוסיף אחר כך מכל מקום." אין חובה להשלים הכל: שלוש עבודות מספיקות כדי לשלוח לבדיקה.</p></div></div>
''', 'mint-s')

# 12 past shows -> 3D tours
add(f'''<div class="row" style="gap:46px;height:100%;align-items:center"><div style="flex:1"><div class="kick">מסך 4 · תערוכות עבר</div><h2>תערוכה שהייתה, כסיור שאפשר להיכנס אליו</h2>
<div class="step"><div class="n">1</div><div><h3>מוסיפים תערוכה</h3><p class="small">שם, מקום, שנה, ותמונות מהחלל עצמו (או סרטון הליכה).</p></div></div>
<div class="step"><div class="n">2</div><div><h3>הכרטיס אומר מה חסר</h3><p class="small">בשפה פשוטה: "תמונה נוספת מהקיר הצפוני", "מידות החדר (אופציונלי)".</p></div></div>
<div class="step"><div class="n">3</div><div><h3>מבקשים סיור</h3><p class="small">הסטטוס עובר: <span class="pill">Tour requested</span><span class="pill">Being built</span><span class="pill have">Tour live</span> או <span class="pill new">Needs more material</span>.</p></div></div>
<div class="step"><div class="n">4</div><div><h3>הבנייה והבדיקה בצד שלנו</h3><p class="small">השרת בונה את הסיור ובודק אותו בטלפון לפני שהוא עולה: האמן לא נוגע בשום דבר טכני.</p></div></div></div>
<div style="display:flex;gap:20px;align-items:center">{shot('studio_exh', 215, 'התערוכות והסיורים, עם סטטוס לכל אחת')}<div style="width:250px"><img src="{DEMO}../spaces/green-hour/preview.jpg" style="width:100%;border-radius:18px;display:block"><div class="cap">סיור תלת־ממדי קיים (The Green Hour)</div><div class="note small">כמה זמן לוקחת בנייה? <b>לא נמדד</b>: המסך צריך להגיד "נעדכן אותך", לא מספר.</div></div></div></div>''', 'sun-s')

# 13 On View
rooms = ['white-cube', 'skylit-hall', 'loft', 'salon', 'japanese', 'black-box']
names = ['קובייה לבנה', 'אולם עם אור עליון', 'לופט', 'סלון', 'חדר יפני', 'קופסה שחורה']
rm = ''.join(f'<div><img src="{render(r)}" style="width:100%;height:76px;object-fit:cover;border-radius:12px;display:block"><div class="small" style="text-align:center">{n}</div></div>' for r, n in zip(rooms, names))
add(f'''<div class="row" style="gap:44px;height:100%;align-items:center"><div style="flex:1"><div class="kick">מסך 5 · On View</div><h2>אוצרים תערוכה חדשה מהעבודות שכבר יש</h2>
<p>לא צריך תערוכה אמיתית. בוחרים חלל, תולים כמה עבודות, כותבים במילים שלך מה זה, ו"מציגים בעמוד": התערוכה הווירטואלית עולה בראש העמוד שלך וב־Shows.</p>
<div class="step"><div class="n">1</div><div><h3>חלל</h3><p class="small">בוחרים מתוך הטווח: בית אספן, קופסה שחורה, בטון חשוף, ביתן זכוכית ועוד.</p></div></div>
<div class="step"><div class="n">2</div><div><h3>תלייה, בתוך החלל</h3><p class="small">נכנסים, מקישים Add וגוררים כל עבודה לקיר. כן, לתלות כמו במוזיאון.</p></div></div>
<div class="step"><div class="n">3</div><div><h3>כותרת ומילים, ופרסום</h3><p class="small">"Walk as a visitor" לבדיקה, ואז "Put it on my page".</p></div></div>
<div class="g3" style="margin-top:6px">{rm}</div></div>{shot('studio_onview', 220, 'On View באולפן: שלב 1, בחירת חלל')}</div>''', '')

# 14 how it works technically
add(f'''<div class="kick">איך זה יעבוד</div><h2>מתי זה מופיע, איפה זה נשמר, איך מדלגים וחוזרים</h2>
<table style="font-size:16px"><tr><th style="width:150px">נושא</th><th>ההצעה</th><th style="width:210px">מקור / אילוץ</th></tr>
<tr><td><b>הרגע</b></td><td>מיד אחרי בחירת <span class="en">I make art</span>, בנתיב <code>#/welcome/artist</code> שכבר קיים (היום מסך <code>artistSoon</code>). שום נתיב חדש.</td><td><code>auth.js</code> שורה 392: <code>go('#/welcome/artist')</code></td></tr>
<tr><td><b>דילוג</b></td><td>"Skip" בכל מסך ו"Look around first" נשארים; דילוג מסמן "הסיור נראה", והרשימה באולפן ממשיכה לחכות.</td><td>לא חוסם שום פעולה</td></tr>
<tr><td><b>חזרה</b></td><td>הקישור "Take the tour again" בחשבון (<code>#/account</code>) וכתובת ישירה; אותו סיור, בלי שום מצב.</td><td>החשבון כבר מכיל "Your studio"</td></tr>
<tr><td><b>איפה נשמר</b></td><td>שלב א׳: <code>localStorage</code> במפתח <code>os-tour-artist</code> ("נראה"). שלב ב׳ (אם רוצים לחצות מכשירים): עמודה חדשה ב־<code>profiles</code>, כמיגרציה תוספתית. הרשימה עצמה <b>לא נשמרת</b>: מחושבת בכל פעם מנתוני האמן.</td><td>לא נעשה הלילה. עמודה חדשה = החלטה</td></tr>
<tr><td><b>רשימת צעדים</b></td><td>בראש <code>#/studio</code>, אותו כרטיס שקיים; מתרחבת מ־3 ל־6 צעדים, ובעמוד חי מתכווצת לשורה אחת: "הבא: תערוכה ראשונה".</td><td><code>things()</code> ב־<code>studio-page.js</code></td></tr>
<tr><td><b>נגישות</b></td><td>רקע בהיר, טקסט גדול בניגוד AA ומעלה, מטרות של 44 פיקסלים, וכל מסך נקרא גם בלי להבין את האנימציה.</td><td>כלל הלילה</td></tr></table>
''', '')

# 15 checklist
add(f'''<div class="row" style="gap:50px;height:100%;align-items:center"><div style="flex:1"><div class="kick">הצעדים הראשונים</div><h2>שלושה שקיימים, שלושה חדשים</h2>
<table><tr><th>צעד</th><th>איך מחושב</th><th></th></tr>
<tr><td>דיוקן</td><td>יש תמונת פרופיל</td><td><span class="pill have">קיים</span></td></tr>
<tr><td>כמה שורות על העבודה</td><td>לפחות 20 תווים</td><td><span class="pill have">קיים</span></td></tr>
<tr><td>שלוש עבודות</td><td>3 עבודות או יותר</td><td><span class="pill have">קיים</span></td></tr>
<tr><td>תערוכה ראשונה (אחרי הדיוקן)</td><td>יש לפחות תערוכה אחת</td><td><span class="pill new">חדש</span></td></tr>
<tr><td>בקשת סיור תלת־ממדי</td><td>סטטוס תערוכה אינו "none"</td><td><span class="pill new">חדש</span></td></tr>
<tr><td>On View</td><td>יש תערוכה וירטואלית מפורסמת</td><td><span class="pill new">חדש</span></td></tr></table>
<p class="small" style="margin-top:12px">שלושת הראשונים הם שער הפרסום (שליחה לבדיקה). שלושת החדשים הם "בונוס": לא חוסמים כלום.</p></div>
{drawn(look('a', 3, 'list', 'Your first steps', '3 of 6 done', 'The last three are the fun ones.', items=[('Add your portrait', '', True), ('A few lines about your work', '', True), ('Add at least 3 works', '', True), ('Add a past show', 'with photos of the space', False), ('Ask for a 3D tour', '', False), ('Open your On View', '', False)], step=2, cta='Next: a past show'), 240)}</div>''', 'peach-s')

# 16 decisions
add(f'''<div class="kick">מה צריך ממך</div><h2>ארבע החלטות, ואז בונים</h2>
<div class="g2" style="margin-top:12px"><div class="card"><h3>1. כיוון</h3><p class="small">ההמלצה: ב׳ לברכה ו־א׳ לרשימה. אפשר גם ב׳ בלבד, או לשלב את ד׳ (קיר גלריה) אם יש תמונות חזקות.</p></div>
<div class="card"><h3>2. תמונת פתיחה (hero)</h3><p class="small">האם לתת לאמן לבחור אותה בעצמו כבר בסיור? כרגע זה נגזר מהחומרים, וזה שינוי קטן בעמוד האמן.</p></div>
<div class="card"><h3>3. איפה נשמר "ראיתי"</h3><p class="small">דפדפן בלבד (פשוט) או גם בחשבון (עמודה חדשה, עובד בין מכשירים).</p></div>
<div class="card"><h3>4. כתיבת הטקסטים</h3><p class="small">הטקסטים כאן הם טיוטה באנגלית באווירה של האפליקציה. כדאי שתעבור עליהם בקול שלך לפני בנייה.</p></div></div>
<div class="note"><b>מה לא נעשה הלילה:</b> שום שינוי באפליקציה. כל הצילומים הם מהאפליקציה האמיתית (דמו), והמסכים המצוירים הם מוקאפ.</div>''', 'sun-s')

write_pdf('onboarding-artists', 'Open Studio · קליטת אמנים', S)
