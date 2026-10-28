"""Open Studio against six platforms: real screens side by side. Builds compare.html here; the PDF is printed
from it (see the end). Run from this folder: python3 build_pdf.py"""
import html

def fig(src, cap, os=False, h=118, w=None):
    style = f'height:{h}mm' + (f';width:{w}mm;object-fit:cover;object-position:top' if w else '')
    return f'<figure class="{"os" if os else ""}"><img src="{src}" style="{style}"><figcaption>{cap}</figcaption></figure>'

def page(kicker, title, shots, cols, note=''):
    c = ''.join(f'<div class="col"><h3>{t}</h3>{b}</div>' for t, b in cols)
    return f'''<section class="page"><div class="head"><div class="k">{kicker}</div><h2>{title}</h2></div>
<div class="shots">{''.join(shots)}</div><div class="cols3">{c}</div>{f'<p class="note">{note}</p>' if note else ''}</section>'''

OS = 'open-studio/'
P = []

# --- cover --------------------------------------------------------------------------------------------
P.append(f'''<section class="page cover"><div class="logo"><svg viewBox="0 0 132 132" width="40" height="40"><rect x="8" y="8" width="116" height="116" rx="36" fill="#1F2A44"/><path d="M42 106 V62 a24 24 0 0 1 48 0 V106 Z" fill="#F5C9B8"/></svg><span>Open Studio</span></div>
<h1>Open Studio מול שש הפלטפורמות<br>איך זה נראה, איך זה מרגיש</h1>
<p class="lead">השוואה מסך מול מסך: Kunstmatrix, Artsteps, Arte, MyGallery3D, ArtRabbit ו‑CUR8, ולצידן Spotify כמודל לחוויה שאנחנו רוצים. כל התמונות הן צילומי מסך אמיתיים מהאתרים ומהאפליקציות (אוקטובר 2026), בגודל מסך של אייפון.</p>
<div class="cover-shots">{fig(OS+'01-home.jpg','Open Studio · בית',True,100)}{fig('spotify/web/artist.jpg','Spotify · עמוד אמן',h=100)}{fig('kunstmatrix/web/tour.jpg','Kunstmatrix · סיור',h=100)}{fig('artsteps/web/tour.jpg','Artsteps · סיור',h=100)}{fig('mygallery3d/web/tour.jpg','MyGallery3D · סיור',h=100)}{fig('artrabbit/appstore/01.jpg','ArtRabbit · מפה',h=100)}</div>
<p class="src">התוכן של Open Studio בצילומים כולל אמני הדגמה בדויים (ליה מורן, נועה בן‑ארי ועוד), כדי לראות את האפליקציה מלאה. Ritual והעבודות של אלעד אמיתיים.</p></section>''')

# --- vision -------------------------------------------------------------------------------------------
P.append('''<section class="page"><div class="head"><div class="k">החזון</div><h2>מה אנחנו בונים, במשפט אחד</h2></div>
<p class="big">אנשים עוקבים אחרי אמנים כמו בספוטיפיי: אחרי העבודות שלהם, התערוכות שלהם והחיים בסטודיו, ואמנות פלסטית יוצאת מהגלריות ומעולם מביני העניין אל הטלפון של כולם.</p>
<div class="cols2"><div><h3>מה המשתמש רואה כשהוא פותח את האפליקציה</h3><ul>
<li>קודם כל את האמנים שהוא עוקב אחריהם: התערוכות שלהם, העבודות החדשות שלהם.</li>
<li>אחר כך תוכן שאולי מתאים לו: אמנים ותערוכות שעוד לא הכיר.</li>
<li>הכול נקי, שקט ומוכר, כמו ספוטיפיי. האמנות במרכז, לא הממשק.</li></ul>
<h3>מה האמן מקבל</h3><ul>
<li>סיור וירטואלי בתערוכה אמיתית שלו, שנבנה מצילומי ההצבה, כך שגם מי שלא הגיע יכול להסתובב בה.</li>
<li>בהמשך: חללים דיגיטליים ווירטואליים שלא קיימים במציאות, תערוכות חדשות, חיבורים בין אמנים ותערוכות קונספט.</li>
<li>מקום לשתף את הלייב של היצירה (וידאו, תהליך, סטורי) בעמוד שלו, כחלק מהעבודה ולא כפיד.</li></ul></div>
<div><h3>חמש השאלות שבדקנו בכל פלטפורמה</h3><ol>
<li><b>מסך ראשון:</b> מה רואים כשנכנסים? אמנות, או שיווק?</li>
<li><b>עמוד אמן ומעקב:</b> אפשר לעקוב אחרי אמן ולראות מה חדש אצלו?</li>
<li><b>עמוד תערוכה:</b> מה אפשר לעשות עם תערוכה (לשמור, לבוא, לשתף)?</li>
<li><b>הסיור:</b> איך נראה ומרגיש החלל הווירטואלי? האם זו התערוכה האמיתית?</li>
<li><b>מה קורה עכשיו ולידי:</b> פתיחות, מפה, תערוכות לפי מיקום.</li></ol>
<div class="box g"><b>בקצרה:</b> אף אחת מהשש לא עושה את שני הדברים יחד. הכלים לסיורים (Kunstmatrix, Artsteps, Arte, MyGallery3D) בונים חללים גנריים מתבניות, ואין בהם מעקב אחרי אמנים כמו בספוטיפיי. ArtRabbit עוזרת למצוא תערוכות אמיתיות, אבל אין בה סיור. CUR8 היא היום בכלל פלטפורמת כרטיסים ואירועים. Open Studio מחברת: מעקב אחרי אמנים + התערוכה האמיתית כחלל שאפשר להיכנס אליו.</div></div></div></section>''')

# --- who is who ---------------------------------------------------------------------------------------
Y, N, M = '<span class="y">✓</span>', '<span class="n">—</span>', '<span class="m">חלקי</span>'
rows = [
    ('Kunstmatrix', 'בניית תערוכות תלת‑ממד בחדרים מתבניות, קטלוג Art.Spaces, סיור מודרך', 'גלריות, אמנים, מוסדות חינוך', N, N, N, 'אתר'),
    ('Artsteps', 'בניית חללי תלת‑ממד בחינם + קהילה (לייקים, צפיות, תגובות)', 'יוצרים, מורים, סטודנטים', M, N, N, 'אתר + אפליקציה'),
    ('Arte', 'בניית גלריה תלת‑ממדית באייפון/אייפד, קריינות קולית, AR', 'אמנים, אוצרים', N, N, N, 'אפליקציה'),
    ('MyGallery3D', 'בינה מלאכותית בונה גלריה מקישור לחנות או לתיק עבודות; קנייה מתוך החלל', 'אמנים שמוכרים אונליין', N, N, N, 'אתר'),
    ('ArtRabbit', 'רשימות של תערוכות אמיתיות בעולם, מפה, שמירה, "ראיתי", מעקב אחרי אמנים וגלריות', 'קהל אמנות, עולם הגלריות', Y, N, Y, 'אתר + אפליקציה'),
    ('CUR8', 'היום: מכירת כרטיסים וארגון אירועים וחוויות ("Make your moment")', 'מפיקי אירועים', N, N, N, 'אתר'),
    ('Spotify', 'המודל לחוויה: בית אישי, מעקב אחרי אמנים, עמוד אמן נקי', 'כולם', Y, '—', '—', 'אפליקציה'),
]
tbl = ''.join(f'<tr><td>{a}</td><td class="t">{b}</td><td class="t">{c}</td><td>{d}</td><td>{e}</td><td>{f}</td><td>{g}</td></tr>' for a, b, c, d, e, f, g in rows)
tbl += f'<tr class="os"><td>Open Studio</td><td class="t">מעקב אחרי אמנים כמו בספוטיפיי + סיור בתערוכה האמיתית, שנבנה מצילומי ההצבה + מפה ופתיחות</td><td class="t">כל מי שאוהב אמנות, ואמנים</td><td>{Y}</td><td>{Y}</td><td>{Y}</td><td>אפליקציה לטלפון</td></tr>'
P.append(f'''<section class="page"><div class="head"><div class="k">מפת השוק</div><h2>מי הם בכלל</h2></div>
<table><tr><th>פלטפורמה</th><th>מה זה</th><th>למי</th><th>מעקב אחרי אמנים</th><th>סיור בתערוכה אמיתית</th><th>מה קורה עכשיו / מפה</th><th>איפה</th></tr>{tbl}</table>
<div class="cols2" style="margin-top:6mm"><div class="box"><b>תיקון לגבי CUR8:</b> בהשוואה הקודמת היא הוצגה כפלטפורמת אמנות. היום האתר שלה מציג מכירת כרטיסים וארגון אירועים ("Buy tickets", "Resend tickets"), ומקורות אחרים מתארים אותה ככלי לאספני אמנות דיגיטלית. בכל מקרה, היא לא מתחרה ישירה.</div>
<div class="box g"><b>המשבצת הריקה:</b> אין אף פלטפורמה עם ✓ גם במעקב אחרי אמנים וגם בסיור בתערוכה אמיתית. זה המקום של Open Studio.</div></div></section>''')

# --- 1. first screen ----------------------------------------------------------------------------------
P.append(page('1 · המסך הראשון', 'מה רואים כשנכנסים', [
    fig('kunstmatrix/web/home.jpg', 'Kunstmatrix'), fig('artsteps/web/explore-first-impression.jpg', 'Artsteps'),
    fig('mygallery3d/web/home.jpg', 'MyGallery3D'), fig('artrabbit/web/home.jpg', 'ArtRabbit'), fig('cur8/web/home.jpg', 'CUR8'),
    fig(OS + '01-home.jpg', 'Open Studio', True)], [
    ('איך זה נראה', '<p>ארבע מתוך השש פותחות בדף שיווק לאמנים: "Register now", "Build free", "Let\'s create epic experiences". ב‑Artsteps הטלפון נפתח עם חלון עוגיות ופרסומת ל‑Metasteps מעל הכול. ArtRabbit היחידה שפונה לקהל, אבל זיהתה מיקום אוטומטי והציגה תערוכות ב‑Wichita Falls.</p>'),
    ('איך זה מרגיש', '<p>כמו להיכנס לחנות כלים, לא לגלריה. המבקר צריך להבין לבד איפה האמנות. אצלנו המסך הראשון הוא כבר אמנות: התערוכה שמוצגת עכשיו בתמונה מלאה, ומיד אחריה האמנים.</p>'),
    ('מה לוקחים', '<ul><li>לא לפתוח בשום חלון קופץ.</li><li>המיקום של ArtRabbit ("ליד" + בחירת עיר) הוא רעיון טוב, אבל רק במפה ובאישור המשתמש. כך זה כבר אצלנו.</li><li>ההרשמה לאמנים נשארת למטה ("For artists"), לא בראש הדף.</li></ul>')]))

# --- 2. home like spotify -----------------------------------------------------------------------------
P.append(page('2 · הבית', 'הבית כמו בספוטיפיי', [
    fig('spotify/appstore/00.jpg', 'Spotify · בית'), fig('spotify/appstore/06.jpg', 'Spotify · חיפוש'),
    fig('artrabbit/appstore/00.jpg', 'ArtRabbit · אפליקציה'), fig('artsteps/appstore/00.jpg', 'Artsteps · Latest', h=60, w=None),
    fig(OS + '01-home.jpg', 'Open Studio · בית', True), fig(OS + '02-artists.jpg', 'Open Studio · אמנים', True)], [
    ('איך זה נראה', '<p>בספוטיפיי: שורת סינון (All, Music, Podcasts), רשת של 8 דברים אחרונים לגישה מהירה, ושורות גלילה הצידה ("Jump back in", "Made for you"). אין טקסט מיותר, רק תמונות ושמות. ב‑Artsteps הבית הוא רשימת "Latest" עם לייקים וצפיות, כמו פיד.</p>'),
    ('איך זה מרגיש', '<p>ספוטיפיי מרגישה אישית: "זה שלי", הדברים שאני חוזר אליהם. אצלנו הבית כבר בנוי משורות גלילה ונקי, ולשונית Artists מציגה קודם את מי שאתה עוקב אחריו ומה רץ אצלו עכשיו.</p>'),
    ('מה לוקחים', '<ul><li><b>רשת גישה מהירה</b> בראש הבית: האמנים והתערוכות שחזרת אליהם לאחרונה.</li><li><b>שורת "בשבילך"</b> עם שם אישי, למשל "אמנים כמו ליה מורן".</li><li><b>חיפוש לפי עולמות</b> (ציור, טקסטיל, דיגיטלי, תערוכות פתוחות) כמו "Explore your genres".</li></ul>')]))

# --- 3. artist page -----------------------------------------------------------------------------------
P.append(page('3 · עמוד אמן', 'עמוד אמן ומעקב', [
    fig('spotify/web/artist.jpg', 'Spotify · Queen'), fig('artrabbit/web/artist.jpg', 'ArtRabbit · Tacita Dean'),
    fig('artsteps/web/profile.jpg', 'Artsteps · פרופיל'),
    fig(OS + '11-artist-top.jpg', 'Open Studio · ליה מורן', True), fig(OS + '12-artist-works.jpg', 'Open Studio · עבודות', True), fig(OS + '03-artist.jpg', 'Open Studio · מהסטודיו', True)], [
    ('איך זה נראה', '<p>ב‑Spotify: תמונה גדולה, שם, מספר מאזינים, כפתור Follow, ו‑"Popular" עם חמישה שירים ואחריהם "Popular releases" בגלילה הצידה. ב‑ArtRabbit: עיגול צבע במקום תמונה, Follow עם 11 עוקבים ורשימת תערוכות. ב‑Artsteps: שם, עוקבים ותערוכות של המשתמש.</p>'),
    ('איך זה מרגיש', '<p>בספוטיפיי מבינים מהר מי האמן ומה הכי שווה לשמוע ממנו. העמוד שלנו בנוי עכשיו באותו היגיון:</p><table class="map"><tr><td>Follow</td><td>Follow</td></tr><tr><td>Popular · 5</td><td>Latest works · 5 + Show more</td></tr><tr><td>Popular releases</td><td>Exhibitions בגלילה</td></tr><tr><td>On tour</td><td>On view now</td></tr><tr><td>Clips</td><td>Live from the studio</td></tr></table>'),
    ('מה לוקחים', '<ul><li><b>"Fans also like":</b> שורת "אמנים קרובים" בסוף עמוד האמן. חסרה אצלנו.</li><li><b>מספר עוקבים</b> ליד השם, כשיהיו משתמשים אמיתיים.</li><li><b>כפתור "נגן" גדול:</b> אצלנו זה "היכנס לתערוכה" כשיש סיור.</li></ul>')]))

# --- 4. live from the studio --------------------------------------------------------------------------
P.append(page('4 · הלייב של היצירה', 'מהסטודיו: וידאו וסטורי, רק בעמוד האמן', [
    fig(OS + '03-artist.jpg', 'Open Studio · Live from the studio', True), fig(OS + '04-studio-log.jpg', 'Open Studio · יומן הסטודיו', True),
    fig('artsteps/appstore/01.jpg', 'Artsteps · סיור מודרך באפליקציה', h=60), fig('arte/appstore/01.jpg', 'Arte · קריינות קולית')], [
    ('איך זה נראה אצלנו', '<p>שורה של סרטונים וסטוריז אנכיים בעמוד האמן. כל אחד קשור ליצירה: "השכבה האחרונה של Low Tide" עם כרטיס היצירה בתחתית. נפתח במסך מלא, אחד אחרי השני.</p>'),
    ('במה זה שונה', '<p>באינסטגרם הסטורי נעלם בפיד ומנותק מהעבודה. ב‑Spotify ה‑Clips קצרים ומחוברים לשיר. אצלנו כל סרטון מוביל ליצירה עצמה, והכול נשאר בעמוד האמן כיומן של העבודה. אצל המתחרים אין דבר כזה: Arte מציעה קריינות קולית בתוך הסיור, ו‑Artsteps מציעה סיור מודרך שמתנגן לבד בתוך החלל.</p>'),
    ('מה לוקחים', '<ul><li><b>קול של האמן</b> (מ‑Arte): הקלטה קצרה לכל עבודה, שאפשר לשמוע גם בתוך הסיור.</li><li><b>"תהליך"</b> בעמוד היצירה: ציר זמן קצר מהסקיצה ועד התלייה.</li></ul>')]))

# --- 5. exhibition page -------------------------------------------------------------------------------
P.append(page('5 · עמוד תערוכה', 'מה אפשר לעשות עם תערוכה', [
    fig('artrabbit/web/event.jpg', 'ArtRabbit · Kiki Smith'), fig('kunstmatrix/web/exhibition.jpg', 'Kunstmatrix · Seeing Silence'),
    fig('artrabbit/web/event-desktop.jpg', 'ArtRabbit · מחשב', h=60),
    fig(OS + '06-show.jpg', 'Open Studio · Low Tide (ערב פתיחה)', True), fig(OS + '14-ritual.jpg', 'Open Studio · Ritual', True), fig(OS + '07-album.jpg', 'Open Studio · העבודות כאלבום', True)], [
    ('איך זה נראה', '<p>ArtRabbit: תמונה, תאריכים, "Opening: 30 Oct 18:00" ורשימת פעולות: Save Event, I\'ve seen this, Add to my calendar, Share. Kunstmatrix: כרטיס עם שני כפתורים, "Enter exhibition" ו‑"Start guided tour".</p>'),
    ('איך זה מרגיש', '<p>ArtRabbit שימושית מאוד, אבל מרגישה כמו לוח מודעות. Kunstmatrix מרגישה כמו כניסה למשחק. אצלנו תערוכה היא אלבום: עטיפה, אמן, ורשימת עבודות ממוספרת כמו שירים. תערוכה שרצה עכשיו מקבלת את עיצוב ערב הפתיחה, עם כתובת, שעות ואירועים.</p>'),
    ('מה לוקחים', '<ul><li><b>שמירה</b> ו‑<b>הוספה ליומן</b> של פתיחה (מ‑ArtRabbit).</li><li><b>"הייתי שם":</b> מסמן ביקור, וזה בסיס להמלצות.</li><li><b>"סיור מודרך"</b> (מ‑Kunstmatrix): אצלנו קיים ככפתור Play במצב Works. שווה להבליט אותו בעמוד התערוכה.</li></ul>')]))

# --- 6. the tour --------------------------------------------------------------------------------------
P.append(page('6 · הסיור', 'הסיור הווירטואלי: תבנית מול התערוכה האמיתית', [
    fig('kunstmatrix/web/tour.jpg', 'Kunstmatrix'), fig('artsteps/web/tour.jpg', 'Artsteps'), fig('mygallery3d/web/tour.jpg', 'MyGallery3D'),
    fig('arte/appstore/02.jpg', 'Arte'), fig(OS + '10-tour.jpg', 'Open Studio · Ritual', True)], [
    ('איך זה נראה', '<p>אצל כולם החלל הוא תבנית: קופסה לבנה ריקה (Kunstmatrix), אולם בטון וקירות לבנים (Artsteps), לופט עם אור שמש מצויר (MyGallery3D). התמונות "מודבקות" על הקירות. אצלנו החדר נבנה מצילומי ההצבה של Ritual: הרצפה המבריקה, הקשתות, האור, וכל עבודה במידה ובמקום האמיתי שלה.</p>'),
    ('איך זה מרגיש', '<p>בתבנית מרגישים בתוך משחק מחשב, ואין רגע של "הייתי בתערוכה". המסכים עמוסים בהדרכה: חלון "How to?" (Kunstmatrix), כפתור צעדים ודחיפה להוריד אפליקציה (Artsteps), חלון "How to walk" (MyGallery3D). אצלנו: ג\'ויסטיק, מפה קטנה בפינה, ושלושה מצבים (Walk, Works, Photos).</p>'),
    ('מה לוקחים', '<ul><li><b>הסבר קצר בכניסה הראשונה</b> (MyGallery3D עושה את זה נקי): שלוש שורות ו‑"Got it".</li><li><b>מצב Immersive:</b> מזיזים את הטלפון כמו חלון. אצלנו זה כפתור הג\'ירו.</li><li><b>לא</b> לוקחים: תבניות. ההבדל שלנו הוא שהחדר אמיתי. בהמשך, לחללים דיגיטליים שלא קיימים במציאות, כן נצטרך חדרים מעוצבים.</li></ul>')],
    note='בגרסת המחשב (בתיקייה compare): ב‑Kunstmatrix ו‑Artsteps החלל תופס חלק מהמסך ומסביבו תפריטים ופרסומות.'))

# --- 7. what's on, map --------------------------------------------------------------------------------
P.append(page('7 · מה קורה עכשיו ולידי', 'פתיחות, מפה ותערוכות לפי מיקום', [
    fig('artrabbit/appstore/01.jpg', 'ArtRabbit · מפה'), fig('artrabbit/appstore/02.jpg', 'ArtRabbit · שמירה ותכנון'),
    fig('artrabbit/appstore/03.jpg', 'ArtRabbit · מעקב אחרי גלריות'), fig('artrabbit/appstore/04.jpg', 'ArtRabbit · מסלול'),
    fig(OS + '05-shows.jpg', 'Open Studio · Shows', True), fig(OS + '09-map.jpg', 'Open Studio · Map', True)], [
    ('איך זה נראה', '<p>ArtRabbit היא היחידה מהשש שעושה את זה: מפת חום של תערוכות שמתפרקת לסיכות, "פתוח עכשיו / ליד / מאוחר יותר", שמירה, ניווט עם Google/Apple Maps, ומעקב אחרי גלריות עם התראות. אצלנו: Shows בעיצוב ערב פתיחה (הערב, השבוע, אונליין, סיורים) ו‑Map בעיצוב "על הקירות".</p>'),
    ('איך זה מרגיש', '<p>ArtRabbit מרגישה כמו מדריך עירוני עמוס פרטים. Shows אצלנו מרגיש כמו הזמנה לאירוע: "Opening tonight · 20:00". ובמפה, מי שלא יכול להגיע מקבל "Walk Ritual from home, in 3D". את זה אין לאף אחד.</p>'),
    ('מה לוקחים', '<ul><li><b>ניווט:</b> כפתור "איך מגיעים" שפותח את אפליקציית המפות.</li><li><b>מסלול אמנות</b> (Saturday art walk): כמה תערוכות קרובות במסלול אחד.</li><li><b>התראה</b> כשאמן או גלריה שעוקבים אחריהם פותחים תערוכה.</li></ul>')]))

# --- 8. for artists -----------------------------------------------------------------------------------
P.append(page('8 · בשביל האמן', 'הכלים לאמן: לבנות תערוכה', [
    fig('arte/appstore/00.jpg', 'Arte · תערוכה בדקות'), fig('arte/appstore/03.jpg', 'Arte · תיק עבודות'), fig('arte/appstore/04.jpg', 'Arte · תצוגה פרטית'),
    fig('mygallery3d/web/home.jpg', 'MyGallery3D · Build free'), fig('kunstmatrix/web/home.jpg', 'Kunstmatrix'), fig(OS + '13-for-artists.jpg', 'Open Studio · For artists', True)], [
    ('איך זה נראה', '<p>Arte: בונים באייפון או באייפד, עם קריינות, מידות אמיתיות ו"תצוגה פרטית" לאספנים. MyGallery3D: מדביקים קישור לחנות, והבינה המלאכותית בונה גלריה. Kunstmatrix: מערכת מקצועית עם מחסן עבודות וטקסטים לקיר. אצלנו: "Your studio, open to everyone", עם כניסה במייל בלי סיסמה ואמן הדגמה להסתכל.</p>'),
    ('איך זה מרגיש', '<p>אצל כולם האמן "בונה" חלל, עובד עם קירות ומיקומים. אצלנו האמן מעלה צילומי הצבה של תערוכה שכבר הייתה, והחדר נבנה לבד. פחות עבודה, ותוצאה אמיתית יותר.</p>'),
    ('מה לוקחים', '<ul><li><b>תצוגה פרטית בקישור</b> (Arte): לשלוח תערוכה לאספן לפני שהיא ציבורית.</li><li><b>ייבוא מקישור</b> (MyGallery3D): להביא עבודות מאתר או מאינסטגרם של האמן.</li><li><b>קטלוג עבודות</b> (Kunstmatrix): כל עבודה יודעת באילו תערוכות הייתה. אצלנו זה כבר קיים בעמוד היצירה.</li></ul>')]))

# --- summary ------------------------------------------------------------------------------------------
P.append('''<section class="page"><div class="head"><div class="k">סיכום</div><h2>מה ייחודי לנו, ומה כדאי לאמץ</h2></div>
<div class="cols2"><div><h3>שלושה דברים שרק Open Studio עושה</h3><ol class="big-ol">
<li><b>התערוכה האמיתית כחדר.</b> הסיור נבנה מצילומי ההצבה: אותו חדר, אותו אור, כל עבודה במקומה. אצל כל השאר זו תבנית.</li>
<li><b>אמנים כמו בספוטיפיי.</b> עוקבים, ורואים קודם את מה שחדש אצלם: עבודות, תערוכות, והלייב מהסטודיו.</li>
<li><b>מהפתיחה של הערב ועד מה שנגמר.</b> Shows ומפה לתערוכות שרצות, וסיור תלת‑ממד למי שלא הספיק.</li></ol>
<div class="box">השקט הוא חלק מהחוויה: בלי חלונות קופצים, בלי פרסומות, בלי מילים מיותרות. זה ההבדל הכי מורגש מול המתחרים בטלפון.</div></div>
<div><h3>מה כדאי לאמץ, לפי סדר עדיפות</h3><table class="todo"><tr><th>#</th><th>מה</th><th>מאיפה</th></tr>
<tr><td>1</td><td>שמירת תערוכה + הוספה ליומן + "הייתי שם"</td><td>ArtRabbit</td></tr>
<tr><td>2</td><td>התראה כשאמן שעוקבים אחריו פותח תערוכה</td><td>ArtRabbit, Spotify</td></tr>
<tr><td>3</td><td>"אמנים קרובים" בסוף עמוד האמן</td><td>Spotify</td></tr>
<tr><td>4</td><td>רשת גישה מהירה בראש הבית</td><td>Spotify</td></tr>
<tr><td>5</td><td>הסבר קצר בכניסה הראשונה לסיור</td><td>MyGallery3D</td></tr>
<tr><td>6</td><td>קול של האמן לכל עבודה</td><td>Arte</td></tr>
<tr><td>7</td><td>"איך מגיעים" ומסלול אמנות במפה</td><td>ArtRabbit</td></tr>
<tr><td>8</td><td>תצוגה פרטית בקישור לאספנים</td><td>Arte</td></tr></table></div></div>
<p class="src">מקורות: צילומי מסך מהאתרים (kunstmatrix.com, artsteps.com, artrabbit.com, cur8.com, mygallery3d.com, open.spotify.com) ומדפי האפליקציות ב‑App Store (Artsteps, ArtRabbit, Arte, Spotify), 28 באוקטובר 2026. סקירות: Common Sense Education, Better Posters, Luminous Landscape, פורום three.js. כל הצילומים שמורים בתיקייה studio/design/compare.</p></section>''')

CSS = '''@page{size:297mm 210mm;margin:0}
*{box-sizing:border-box}
body{margin:0;font-family:'Assistant',sans-serif;color:#1B1A17;font-size:9.6pt;line-height:1.45;background:#fff}
.page{width:297mm;height:210mm;padding:11mm 13mm 9mm;position:relative;overflow:hidden;page-break-after:always;background:#fff}
.cover{background:#EFE9DD}
h1{font-family:'Frank Ruhl Libre',serif;font-weight:500;font-size:32pt;line-height:1.08;margin:8mm 0 4mm}
h2{font-family:'Frank Ruhl Libre',serif;font-weight:500;font-size:21pt;margin:0;line-height:1.1}
h3{font-size:10.5pt;margin:0 0 1.2mm}
p{margin:1mm 0}ul,ol{margin:1mm 0;padding-right:4.5mm}li{margin:.6mm 0}
.k{font-family:'IBM Plex Mono',monospace;font-size:7.5pt;letter-spacing:.12em;color:#5E594F;margin-bottom:1mm}
.head{display:flex;flex-direction:column;border-bottom:1.5px solid #1B1A17;padding-bottom:2.5mm;margin-bottom:4mm}
.logo{display:flex;align-items:center;gap:2.5mm;direction:ltr;justify-content:flex-end}.logo span{font-family:'Figtree',sans-serif;font-weight:700;font-size:17pt}
.lead{font-size:12pt;max-width:200mm}
.big{font-family:'Frank Ruhl Libre',serif;font-size:16pt;line-height:1.35;margin:0 0 5mm}
.shots{display:flex;gap:3.5mm;justify-content:center;align-items:flex-start;min-height:96mm}
.shots figure,.cover-shots figure{flex:1 1 0;min-width:0;max-width:62mm}
.shots img,.cover-shots img{width:100%;height:auto !important;max-height:116mm;object-fit:cover;object-position:top}
.shots figure,.cover-shots figure{margin:0;text-align:center}
.shots img,.cover-shots img{border:1px solid #CFC7B6;border-radius:2mm;display:block}
figure.os img{outline:2.2px solid #2F6B4F;outline-offset:1px}
figcaption{font-size:7.6pt;color:#5E594F;margin-top:1.2mm;font-weight:600}
figure.os figcaption{color:#2F6B4F}
.cover-shots{display:flex;gap:4mm;margin:6mm 0 4mm;height:104mm}
.cover-shots img{max-height:96mm}
.cols3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:6mm;margin-top:5mm;border-top:1px solid #CFC7B6;padding-top:3mm}
.cols2{display:grid;grid-template-columns:1fr 1fr;gap:9mm}
.col p,.col li{font-size:8.9pt}
.box{background:#EFE9DD;padding:3mm 4mm;margin-top:3mm}.box.g{background:#E3EDE7}
.note{position:absolute;bottom:4mm;right:13mm;font-size:7.5pt;color:#5E594F}
.src{font-size:7.4pt;color:#5E594F;margin-top:4mm}
table{width:100%;border-collapse:collapse;font-size:8.6pt}
th,td{border-bottom:1px solid #CFC7B6;padding:1.7mm 1.4mm;text-align:center;vertical-align:middle}
th{font-weight:700;border-bottom:1.5px solid #1B1A17}
td:first-child{font-weight:700;text-align:right;direction:ltr}
td.t{text-align:right;font-size:8.2pt}
.y{color:#2F6B4F;font-weight:700;font-size:11pt}.n{color:#A3503F}.m{color:#8F7340;font-weight:600}
tr.os td{background:#E3EDE7}
table.map{margin-top:1.5mm;font-size:8pt}table.map td{padding:.8mm 1mm;text-align:right;direction:ltr;font-weight:400}
table.map td:first-child{color:#5E594F}
table.todo td:nth-child(2){text-align:right}table.todo td:first-child{text-align:center}table.todo td:last-child{direction:ltr;color:#5E594F}
.big-ol li{margin:2mm 0;font-size:10.5pt}'''

doc = f'''<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8"><title>Open Studio · מול שש הפלטפורמות</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Frank+Ruhl+Libre:wght@500;700&family=Assistant:wght@400;600;700&family=Figtree:wght@700&family=IBM+Plex+Mono:wght@500&display=swap">
<style>{CSS}</style></head><body>{''.join(P)}</body></html>'''
open('compare.html', 'w', encoding='utf-8').write(doc)
print(len(P), 'pages')
