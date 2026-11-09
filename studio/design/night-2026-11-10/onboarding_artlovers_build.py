"""Builds onboarding-artlovers.pdf (Hebrew, 16:9): python studio/design/night-2026-11-10/onboarding_artlovers_build.py
Needs the shots from slides_shots_all.py (app)."""
from slides_lib import *

W = work; P = person
TAG = '<span class="brandtag">Open Studio · קליטת חובבי אמנות</span>'
S = []
def add(inner, cls='', foot=TAG): S.append(slide(inner, cls, len(S) + 1, foot))

FACES = [('Berthe Morisot', P('berthe-morisot'), True), ('Claude Monet', P('claude-monet'), True), ('Hilma af Klint', P('hilma-af-klint'), False),
         ('Hokusai', P('katsushika-hokusai'), False), ('Käthe Kollwitz', P('kathe-kollwitz'), True), ('Mary Cassatt', P('mary-cassatt'), False)]
ROWS = [('Orchards in Bloom', 'Harbour Gallery · opening tonight 20:00', W('the-starry-night')), ('Women at Home', 'Courtyard Hall · 2 min walk', W('the-cradle')), ('Hours of Light', 'Monet · open until 19:00', W('impression-sunrise'))]

def three(d):
    a = look(d, 1, 'pic', 'Welcome, Dana', 'Find art<br>you would<br>walk toward', 'Shows near you, artists you will love, and rooms that exist only here.', W('impression-sunrise'), cta='Let’s start',
             stars=[(60, 10, 120, W('impression-sunrise')), (200, 80, 84, P('claude-monet')), (30, 150, 90, W('dance')), (150, 190, 110, P('berthe-morisot'))])
    b = look(d, 2, 'faces', 'Your taste', 'Pick a few<br>artists', 'Tap the ones you like. We will find who is near them, in style and in place.', faces=FACES, step=1, cta='3 picked · Next')
    c = look(d, 3, 'rows', 'Near you', 'On now,<br>around Tel Aviv', 'Open today, near where you are. Walk into the 3D rooms from anywhere.', items=ROWS, step=2, cta='Take me in')
    return [a, b, c]

# 1 cover
add(f'''<div style="display:grid;grid-template-columns:1fr 360px;gap:30px;height:100%;align-items:center">
<div><div class="kick">OPEN STUDIO · קליטת חובבי אמנות · 10.11.2026</div><h1 style="font-size:92px">אמנות שכדאי<br>ללכת אליה</h1><p class="lede" style="max-width:560px">איך קולטים מי שבדיוק נרשם כ"אוהב אמנות": בוחרים כמה אמנים, והאפליקציה מראה מה קורה לידו, מי דומה, ואילו חדרים אפשר להיכנס אליהם רק כאן.</p><p class="small" style="opacity:.85">ארבעה כיווני עיצוב, תסריט מלא, ואיך זה נבנה ומתחבר. הצעה בלבד: לא שונה קוד באפליקציה.</p></div>
<div style="position:relative;height:600px"><div style="position:absolute;left:10px;top:20px;width:230px;height:230px;border-radius:50%;overflow:hidden;box-shadow:0 0 0 8px rgba(255,255,255,.35)"><img src="{W('impression-sunrise')}" style="width:100%;height:100%;object-fit:cover"></div>
<div style="position:absolute;left:210px;top:210px;width:130px;height:130px;border-radius:50%;overflow:hidden;box-shadow:0 0 0 6px rgba(255,255,255,.35)"><img src="{P('hilma-af-klint')}" style="width:100%;height:100%;object-fit:cover"></div>
<div style="position:absolute;left:40px;top:300px;width:190px;height:190px;border-radius:50%;overflow:hidden;box-shadow:0 0 0 6px rgba(255,255,255,.35)"><img src="{W('dance')}" style="width:100%;height:100%;object-fit:cover"></div></div></div>''', 'terra-s', '')

# 2 summary
add(f'''<div class="kick">בקצרה</div><h2>המסע של חובב אמנות: מ"אני אוהב" אל "יש לי מקום לעמוד בו"</h2>
<p class="lede">חובב אמנות לא צריך ללמוד כלום. הוא צריך תוך דקה לראות שהאפליקציה מכירה אותו: אמנים שבחר, תערוכה פתוחה ליד הבית, וחדר אחד שאפשר להיכנס אליו עכשיו.</p>
<div class="g4" style="margin-top:20px"><div class="card c-terra"><h3>1. בוחרים אמנים</h3><p class="small">כמה פנים להקיש עליהן. זה כל ה"טעם" שצריך להתחיל איתו.</p></div>
<div class="card c-lav"><h3>2. המפה והסביבה</h3><p class="small">תערוכות פתוחות עכשיו, לפי מיקום, על מפה ובלוח ימים.</p></div>
<div class="card c-sun"><h3>3. הרשת</h3><p class="small">אמנים ותערוכות דומים בסגנון ובטעם, כולל מרחוק. עוקבים, ולא מפספסים.</p></div>
<div class="card c-mint"><h3>4. חדרים רק כאן</h3><p class="small">תערוכות וירטואליות חדשות שקיימות רק באפליקציה: נכנסים ומסתובבים.</p></div></div>
<div class="note"><b>ההמלצה שלי:</b> כיוון ג׳ (שמיים של יום) לחובבי אמנות, כי זה בדיוק העולם של הבית (הכוכבים והעיפרון), ואדמה כצבע התפקיד (כמו הכפתור "I love art" שכבר קיים). כך הסיור הוא "מבוא לבית".</div>
<p class="small muted" style="margin-top:10px"><span class="pill have">קיים</span> כבר באפליקציה <span class="pill soon">חלקי</span> יש בסיס <span class="pill new">מוצע</span> חדש בהצעה. מסמנים כל טענה, ולא מבטיחים מה שאין.</p>''', '')

# 3 flow
add(f'''<div class="kick">איפה זה נכנס</div><h2>המסלול היום, והמקום של הסיור</h2>
<div class="flow" style="margin:26px 0"><div class="b">הרשמה<br><code>#/welcome</code></div><div class="ar">←</div><div class="b">פרטים<br><code>#/welcome/details</code></div><div class="ar">←</div><div class="b">"מי אתה כאן?"<br><span class="en">I love art</span></div><div class="ar">←</div><div class="b new"><b>חדש: סיור + בחירת אמנים</b><br>4 מסכים · <code>#/welcome/lover</code></div><div class="ar">←</div><div class="b">הבית<br><code>#/</code> (לא משתנה)</div></div>
<div class="g2"><div class="card"><h3>מה קיים היום</h3><ul class="l small"><li>אחרי "I love art" נכנסים ישר לבית (<code>#/</code>), בלי הסבר ובלי בחירה.</li><li>עוקבים אחרי אמנים בכפתור "Follow" בעמוד האמן; העוקבים נשמרים במכשיר (<code>os-following</code>) ומופיעים בבית כ"האמנים שלך".</li></ul></div>
<div class="card c-lav"><h3>מה ההצעה משנה</h3><ul class="l small"><li>מסך אחד חדש בין בחירת התפקיד לבית: סיור של ארבעה מסכים, שהשני בהם הוא בחירת אמנים.</li><li>הבחירה משתמשת בדיוק במה שכבר קיים: כל פרצוף מוסיף ל־<code>os-following</code>. הבית מקבל אמנים שכבר "שלך" בלי שנגענו בו.</li></ul></div></div>
<p class="small muted" style="margin-top:12px">מקור: <code>auth.js</code> שורה 392 (<code>go(r === 'artist' ? '#/welcome/artist' : '#/')</code>), <code>app.js</code> (<code>FOLLOW_KEY</code>). הבית נעול לפי הבעלים.</p>''')

# 4-7 directions
DIR = [
 ('a', 'כיוון א׳: נייר ועיפרון', 'Studio Paper בלי הפתעות: נייר, תמונות מוצמדות, ויד העיפרון רק על מה שחי עכשיו.',
  'רגוע ומובן מאליו, שייך לכל שאר האפליקציה.', 'פחות רגש וקצת "עוד מסך הגדרות". חובב אמנות צריך להתאהב מהר.'),
 ('b', 'כיוון ב׳: קשתות וצבע', 'בלוקים של צבע מלא עם קשת ענקית, כמו כפתורי התפקיד שכבר קיימים.',
  'חזק, צבעוני ומזוהה. שייך לשפה שכבר קיימת בכניסה.', 'לשני התפקידים אותו מראה: חובב אמנות ואמן לא נבדלים. אפשר להבדיל בצבע בלבד.'),
 ('c', 'כיוון ג׳: שמיים של יום', 'שמיים פסטל כמו בבית, אמנים ועבודות ככוכבים עגולים עם קו עיפרון דק.',
  'הכי קרוב לבית, וכל ההתחלה היא כבר "מבוא" אליו. יפה ורך, מתאים לגילוי.', 'צריך לשמור על ניגוד טקסט (כאן הכל על כרטיסים לבנים). הבית נשאר המקום היחיד שבו השמיים חיים.'),
 ('d', 'כיוון ד׳: קיר גלריה', 'העבודה בגדול על קיר צבוע ושלט מוזיאון לבן.',
  'מכבד את היצירה, עם תחושה של ביקור.', 'פחות "משחקי": בחירת אמנים בפרצופים לא מתאימה לו, והקיר היין כהה מדי.')]
for d, name, idea, pro, con in DIR:
    ph = ''.join(drawn(x, 205) for x in three(d))
    add(f'''<div class="row" style="gap:44px;height:100%;align-items:center"><div style="width:380px;flex:none"><div class="kick">כיוון עיצוב</div><h2>{name}</h2><p>{idea}</p><p class="small"><span class="pro">יתרון:</span> {pro}</p><p class="small"><span class="con">חיסרון:</span> {con}</p><p class="small muted">שלושה מסכים: ברכה, בחירת אמנים, "ליד הבית". הטקסט בתוך המסכים באנגלית כי האפליקציה באנגלית.</p></div><div style="display:flex;gap:22px;align-items:center">{ph}</div></div>''')

# 8 recommendation
rec = [look('c', 1, 'pic', 'Welcome, Dana', 'Find art<br>you would<br>walk toward', 'Shows near you, artists you will love, and rooms that exist only here.', W('impression-sunrise'), cta='Let’s start',
            stars=[(60, 10, 120, W('impression-sunrise')), (200, 80, 84, P('claude-monet')), (30, 150, 90, W('dance')), (150, 190, 110, P('berthe-morisot'))]),
       look('c', 2, 'faces', 'Your taste', 'Pick a few<br>artists', 'Tap the ones you like.', faces=FACES, step=1, cta='3 picked · Next'),
       look('c', 3, 'rows', 'Near you', 'On now,<br>around Tel Aviv', 'Open today, near where you are.', items=ROWS, step=2, cta='Take me in')]
add(f'''<div class="row" style="gap:50px;align-items:center;height:100%"><div style="width:420px;flex:none"><div class="kick">ההמלצה</div><h2>שמיים לחובבי אמנות, קשתות לאמנים</h2><p>כך לכל תפקיד יש זהות: אמנים בכחול כהה וקשתות (הם בונים), חובבי אמנות בשמיים ובאדמה (הם מגלים). שניהם מתחילים בעמוד "I make art / I love art" שכבר קיים באותם צבעים.</p><p class="small">הסיור לא משכפל את הבית: הוא <i>מבוא אליו</i>, ונגמר בכך שהאמנים שבחרת הם הכוכבים הראשונים שם.</p></div>
<div style="display:flex;gap:22px;align-items:center">{"".join(drawn(x, 215) for x in rec)}</div></div>''', 'lav-s')

# 9 series
sc = [('Welcome, Dana', 'Find art you would walk toward', 'ברכה: מה אפשר כאן, במשפט אחד.', W('impression-sunrise'), 1),
      ('Your taste', 'Pick a few artists', 'מקישים על פרצופים. מינימום שלושה, אפשר לדלג.', P('berthe-morisot'), 2),
      ('Near you', 'On now, around you', 'מפה ותערוכות פתוחות עכשיו, לפי המיקום.', W('hay-harvest-at-eragny'), 3),
      ('Like this', 'Artists and shows like your taste', 'דומים בסגנון, כולל מרחוק, ולא רק בעיר שלך.', W('dance'), 1),
      ('Follow', 'Keep the ones you love', 'עוקבים אחרי אמנים (ובהמשך גם תערוכות): הם בבית שלך.', P('claude-monet'), 2),
      ('Only here', 'Rooms you can walk into', 'תערוכות חדשות שקיימות רק באפליקציה, בתלת־ממד.', W('the-cradle'), 3)]
ph = ''
for i, (k, t, cap, img, c) in enumerate(sc):
    ph += drawn(look('c', c, 'pic', k, t, '', img, step=min(i // 2, 2), cta='Next' if i < 5 else 'Step inside',
                     stars=[(70, 20, 150, img), (190, 120, 90, W('irises')), (40, 190, 80, P('mary-cassatt'))]).replace('<p></p>', ''), 146, f'{i+1}. {cap}')
add(f'''<div class="kick">התסריט</div><h2>שישה מסכים, בפחות משלוש דקות</h2><p class="small" style="margin-bottom:6px">מסך 2 הוא הפעולה היחידה שדורשת הקשות; כל השאר נקראים וממשיכים. "דלג" תמיד מופיע, וכל מסך אפשר לחזור אליו מהחשבון.</p><div style="display:flex;gap:14px;justify-content:space-between;margin-top:10px">{ph}</div>''')

# 10 pick artists
add(f'''<div class="row" style="gap:46px;height:100%;align-items:center"><div style="flex:1"><div class="kick">מסך 2 · בחירת אמנים</div><h2>הכי קצר שאפשר: לבחור פרצופים</h2>
<div class="step"><div class="n">1</div><div><h3>שישה עד תשעה אמנים, מגוון בכוונה</h3><p class="small">מהקיימים: ציירים, פסלים, אמני הדפס, וגם אמנים של Open Studio עצמה. כך הבחירה מלמדת על סגנון, לא על שם.</p></div></div>
<div class="step"><div class="n">2</div><div><h3>כל הקשה היא "עוקב"</h3><p class="small">אותו מנגנון של הכפתור "Follow" בעמוד האמן, כך שאין מצב חדש לתחזק. <span class="pill soon">חלקי</span> היום העוקבים נשמרים במכשיר בלבד.</p></div></div>
<div class="step"><div class="n">3</div><div><h3>אפשר לדלג, ואפשר פחות משלושה</h3><p class="small">הכפתור משתנה: "Skip" אם בחרת אפס, "3 picked · Next" כשבחרת.</p></div></div>
<div class="note small">נקודה פתוחה: אם הבחירה תשפיע על "מי דומה" (מסך 4), צריך שהאמנים יסומנו בסגנון ותקופה. היום יש בכרטיס האמן תחום ועיר בלבד.</div></div>
{shot('artists', 210, 'רשימת האמנים באפליקציה, עם "Following"')}{drawn(three('c')[1], 210, 'המסך המוצע (מוקאפ)')}</div>''', 'peach-s')

# 11 map and shows
add(f'''<div class="row" style="gap:40px;height:100%;align-items:center"><div style="flex:1"><div class="kick">מסך 3 · המפה והתערוכות לפי מקום</div><h2>מה פתוח ליד הבית, עכשיו</h2>
<div class="step"><div class="n">1</div><div><h3>מפה של מקומות האמנות <span class="pill have">קיים</span></h3><p class="small">מפת אטלס בתלת־ממד: מוזיאונים, גלריות ומקומות ציבוריים, ומה מוצג בכל אחד היום. כרגע תל אביב כברירת מחדל ואפשר לעבור עיר.</p></div></div>
<div class="step"><div class="n">2</div><div><h3>לוח ימים וסינון <span class="pill have">קיים</span></h3><p class="small">בלשונית Shows: היום ושישה ימים קדימה, ו"הכל / בחדר / אונליין".</p></div></div>
<div class="step"><div class="n">3</div><div><h3>"קרוב אליי" בדיוק <span class="pill soon">חלקי</span></h3><p class="small">הסיור שואל פעם אחת את העיר ורק בהסכמה את המיקום. ההסכמה היא רגע עצמאי, לא חלק מההרשמה.</p></div></div></div>
<div style="display:flex;gap:18px">{shot('map', 190, 'המפה, בעיר')}{shot('shows', 190, 'Shows: מה הערב')}{shot('home', 190, 'הבית: "On now near you" בהמשך')}</div></div>''', 'mint-s')

# 12 worldwide by style
add(f'''<div class="kick">מסך 4 · רשת של טעם</div><h2>אמנים ותערוכות ברחבי העולם, לפי סגנון וטעם</h2>
<div class="g3" style="margin-top:14px">
<div class="card"><h3>מה קיים <span class="pill have">קיים</span></h3><p class="small">בבית, כשמתרחקים (צביטה או הקשה כפולה): אמנים וחדרים תלת־ממדיים שעוד לא פגשת, ותערוכות פתוחות עכשיו ליד המקום שלך, מקריאת מפת האמנות היומית.</p></div>
<div class="card c-sun"><h3>מה חסר <span class="pill soon">חלקי</span></h3><p class="small">מפת האמנות היום היא בעיקר ישראל. תערוכות בעולם יש בתכנון נפרד (<span class="en">global-map</span>), עם מקורות רחבים יותר. עד אז, "בעולם" פירושו אמנים שבאפליקציה, לא תערוכות בכל עיר.</p></div>
<div class="card c-lav"><h3>איך "טעם" נגזר <span class="pill new">מוצע</span></h3><p class="small">מהאמנים שנבחרו: תחום ("Painting"), תקופה, ואולי מילות מפתח. מסדרים לפיהם את מה שמופיע מרחוק בבית ואת שורת "Meet someone new".</p></div></div>
<div class="note"><b>חשוב להבהיר למשתמש:</b> במסך עצמו לא נכתב "תערוכות בכל העולם" עד שיש מקור אמיתי; נכתב "אמנים כמו אלה שבחרת". כך המסך נשאר נכון ביום הראשון, ומתרחב כשהנתונים מתרחבים.</div>
<div class="row" style="margin-top:6px;gap:20px;align-items:center"><div style="display:flex;gap:16px;flex:none">{"".join(f'<div style="width:96px"><img src="{u}" style="width:96px;height:96px;border-radius:50%;object-fit:cover;display:block"><div class="small" style="text-align:center">{n}</div></div>' for n, u, _ in FACES[:5])}</div><p class="small muted" style="flex:1">דוגמה: מי שבחר אימפרסיוניסטים ורואה גם את חילמה אף קלינט וקולביץ: "אנשים שאהבו את אלה אהבו גם". הניסוח באפליקציה יהיה "like these", לא "recommended".</p></div>''', '')

# 13 follow
add(f'''<div class="row" style="gap:44px;height:100%;align-items:center"><div style="flex:1"><div class="kick">מסך 5 · לעקוב ולא לפספס</div><h2>אמנים, ובהמשך גם תערוכות</h2>
<div class="step"><div class="n">1</div><div><h3>עוקבים אחרי אמן <span class="pill have">קיים</span></h3><p class="small">כפתור "Follow" בעמוד האמן. האמנים שלך מופיעים בבית ובשורת התערוכות שלהם.</p></div></div>
<div class="step"><div class="n">2</div><div><h3>עוקבים אחרי תערוכה <span class="pill new">מוצע</span></h3><p class="small">"Remind me": תערוכה שנפתחת ביום חמישי שלך בדרך הביתה. דורש התראות, ולכן שלב ב׳: קודם סימון בלבד (מופיעה בבית בימי הפתיחה).</p></div></div>
<div class="step"><div class="n">3</div><div><h3>מי שעוקב מקבל "הערב אצל האמנים שלך" <span class="pill soon">חלקי</span></h3><p class="small">התוכן יש (Shows, "Opening tonight"); ההתראה עצמה לא.</p></div></div></div>
<div style="display:flex;gap:18px">{shot('artist', 200, 'עמוד אמן: Follow, ו־About & CV')}{shot('artists', 200, 'רשימה: "Following" ליד כל שם')}</div></div>''', 'sun-s')

# 14 only here
rooms = ['white-cube', 'skylit-hall', 'loft', 'salon', 'japanese', 'black-box']
rm = ''.join(f'<div><img src="{render(r)}" style="width:100%;height:80px;object-fit:cover;border-radius:12px;display:block"></div>' for r in rooms)
add(f'''<div class="row" style="gap:44px;height:100%;align-items:center"><div style="flex:1"><div class="kick">מסך 6 · רק כאן</div><h2>תערוכות וירטואליות חדשות, שאין בשום מקום אחר</h2>
<p>אלה לא סיורים בתערוכות שהיו: אלה תערוכות שנוצרו בשביל האפליקציה, בחדרים מצוירים סביב העבודות (White Cube, Long Hall, The Vault ועוד), על ידי אמנים (On View) ועל ידי אוצרים (בחדר הבקרה). <span class="pill have">קיים</span></p>
<div class="g3" style="margin:12px 0">{rm}</div>
<p class="small">איך חובב אמנות פוגש אותם: שורת "Walk in now" בבית, "In a room" ב־Shows, וראש עמוד האמן. הסיור עצמו נגמר בלחיצה אחת: <span class="en">Step inside</span> על חדר חי.</p>
<div class="note small">כדי לא להבטיח יותר מדי: "רק כאן" נכון לתערוכות האלה (וירטואליות מקוריות). תערוכות של גלריות אמיתיות מופיעות עם הכתובת שלהן ועם סיור, אם נבנה.</div></div>
<div style="display:flex;gap:16px">{shot('exhibition', 190, 'תערוכה: Opening tonight')}<div style="width:200px"><img src="{DEMO}../spaces/green-hour/preview.jpg" style="width:100%;border-radius:18px;display:block"><div class="cap">חדר חי: The Green Hour</div></div></div></div>''', 'lav-s')

# 15 how it works
add(f'''<div class="kick">איך זה יעבוד</div><h2>מתי זה מופיע, איפה זה נשמר, איך מדלגים וחוזרים</h2>
<table style="font-size:16px"><tr><th style="width:150px">נושא</th><th>ההצעה</th><th style="width:210px">מקור / אילוץ</th></tr>
<tr><td><b>הרגע</b></td><td>מיד אחרי בחירת <span class="en">I love art</span>, בנתיב חדש <code>#/welcome/lover</code> (דומה ל־<code>#/welcome/artist</code>). אחריו: <code>#/</code>.</td><td><code>auth.js</code> שורה 392; הבית לא משתנה</td></tr>
<tr><td><b>דילוג</b></td><td>"Skip" בכל מסך; דילוג שולח לבית, בלי לשמור בחירות. אין חסימה.</td><td>הבית נפתח גם בלי אמנים נבחרים</td></tr>
<tr><td><b>חזרה</b></td><td>"Take the tour again" ב־<code>#/account</code> וגם <code>#/welcome/lover</code> ישירות. מי שבחר כבר רואה את הבחירות מסומנות.</td><td>אותו מסך, בלי מצב</td></tr>
<tr><td><b>איפה נשמר</b></td><td>הבחירות: <code>os-following</code> (קיים, במכשיר). "הסיור נראה": <code>os-tour-lover</code>. סנכרון לחשבון (טבלת עוקבים ב־Supabase, עם RLS לפי המשתמש) הוא שלב ב׳, והחלטה שלך.</td><td>לא נעשה הלילה</td></tr>
<tr><td><b>מיקום</b></td><td>שאלה בהקשה על "Near you" בלבד, עם ברירת מחדל לעיר שנבחרה. אין בקשה אוטומטית.</td><td><code>PLACE_KEY</code> (<code>os-place</code>)</td></tr>
<tr><td><b>נגישות</b></td><td>טקסט על כרטיסים לבנים, גודל גדול, מטרות מגע של 44 פיקסלים, ולכל פרצוף שם כתוב.</td><td>כלל הלילה</td></tr></table>''', '')

# 16 first steps
add(f'''<div class="row" style="gap:50px;height:100%;align-items:center"><div style="flex:1"><div class="kick">הצעדים הראשונים</div><h2>לא רשימת משימות על הבית</h2>
<p>הבית נעול (החלטת הבעלים), ולכן אין שם כרטיס "צעדים ראשונים". במקום זה, הצעדים הם <b>המסכים עצמם</b>, ובחשבון (<code>#/account</code>) נשארת שורה שקטה:</p>
<table><tr><th>צעד</th><th>איך מחושב</th></tr><tr><td>עקבתי אחרי שלושה אמנים</td><td>גודל <code>os-following</code></td></tr><tr><td>ראיתי מה פתוח הערב</td><td>נפתחה לשונית Shows</td></tr><tr><td>נכנסתי לחדר</td><td>נפתח חדר תלת־ממדי (<code>os-recent</code>)</td></tr><tr><td>בחרתי עיר</td><td><code>os-place</code> קיים</td></tr></table>
<p class="small" style="margin-top:10px">כל הארבעה מחושבים ממה שכבר נשמר במכשיר, כלומר בלי שום אחסון חדש. ברגע שהארבעה מסומנים השורה נעלמת.</p></div>
{drawn(look('c', 3, 'list', 'Getting started', '2 of 4 done', 'Take them in your own time.', items=[('Follow three artists', '', True), ('See what’s on tonight', '', True), ('Step into a room', 'Orchards in Bloom is open', False), ('Choose your city', 'Tel Aviv for now', False)], step=2, cta='Step into a room'), 240)}</div>''', 'peach-s')

# 17 decisions
add(f'''<div class="kick">מה צריך ממך</div><h2>חמש החלטות, ואז בונים</h2>
<div class="g3" style="margin-top:8px"><div class="card"><h3>1. כיוון</h3><p class="small">ההמלצה: ג׳ (שמיים) לחובבי אמנות. חלופה: ב׳ אחיד לשני התפקידים.</p></div>
<div class="card"><h3>2. מי הפרצופים</h3><p class="small">תשעה אמנים להתחלה. מי? המלצה: תערובת של דמו ושלושה אמנים של Open Studio שאושרו.</p></div>
<div class="card"><h3>3. סנכרון עוקבים</h3><p class="small">מכשיר בלבד, או חשבון (טבלה חדשה)? זה משפיע על "מכשיר חדש, אותו בית".</p></div>
<div class="card"><h3>4. "בעולם"</h3><p class="small">האם הטקסט נשאר צנוע ("אמנים כמו אלה") עד שמפת העולם מוכנה?</p></div>
<div class="card"><h3>5. תערוכות: מעקב</h3><p class="small">האם נבנה "Remind me" כבר עכשיו או רק אחרי שיש משתמשים אמיתיים?</p></div>
<div class="card c-sun"><h3>לא נעשה הלילה</h3><p class="small">שום שינוי באפליקציה או בנתונים. הצילומים אמיתיים (דמו), המסכים המצוירים הם מוקאפ.</p></div></div>''', '')

write_pdf('onboarding-artlovers', 'Open Studio · קליטת חובבי אמנות', S)
