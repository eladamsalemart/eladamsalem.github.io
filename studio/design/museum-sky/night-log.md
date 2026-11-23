# יומן משמרת הלילה של המוזיאון

(הסיכום של הלילה האחרון נכתב בראש הקובץ, עד 6 שורות, בעברית. מתחתיו שורה לכל פריט: תאריך, מה, commit, מה נבדק.)

**יום 23.11 (עבודת יום, חלק 2):** פריט 16: לקירות החוץ של בתי הדסק יש עכשיו קליפת טיח סיד משלהם (כמו בביתנים המקוריים), צד הגלריה נשאר צבוע (synth.js, d62bd97). נבדק: museum_live 12/12, בלי שגיאות. לא נבדק מקרוב בצילום, אייפון, אתר חי. הנוף הטרופי עבר לסשן museum-outside, אני לא נוגע בו.

**יום 23.11 (עבודת יום, ביקשת):** הנוף הטרופי (פריט 19) קיבל תבליט קרקע (גבעות ושקעים, אור שמש נמוך אפוי), בריכה עם גדות, נופרים ובוץ, והצמחים עומדים על הקרקע (commit 1114af9, tropics.js). נבדק: צילום טלפון 390x844, בלי שגיאות, זיכרון 608 (ללא שינוי), משולשים 6.4K→19.5K. לא נבדק: אייפון אמיתי, האתר החי. פתוח: עלים קרובים נראים גסים (כרטיסי אטלס; דורש רינדור אטלס חדש בבלנדר), רוח, מים משקפים.

**לילה 23.11 (משמרת 9, 05:23) — סיכום הלילה:** הלילה בוצעו: טקסט לכל ביתן וכנף (פריט 21, נסגר), רצפת טרצו עם שבבים בגודל אמיתי (59e32ff), ועכשיו טיח סיד על הקירות החיצוניים של הביתנים המקוריים (Ritual והתערוכה הווירטואלית) במקום לוח צבוע חלק (603941b). נבדק: museum_live 12/12, צילום טלפון 390x844 בסקייל 2 ובסקייל 1, 14:00. אולי הגרעין מעט חזק מקרוב בסקייל 2: אם כן, תגיד "יותר עדין".
לא נבדק: אייפון אמיתי, האתר החי. הערה: עם התוכנית הכפויה של סקריפט הצילום (n4shot) הזיכרון מוערך 609 גם בלי השינוי (מעל 460); לבדוק בלילה הבא אם זה מה-merge של היום או מהסקריפט.
פתוח: קירות חוץ של בתי הדסק (צריכים פני חוץ נפרדים), אבן המרפסת בחוץ, רצפות הבתים. תקציב: שבועי 39%→43%, הלילה נעצר. דרוש מאלעד: כלום.

**לילה 23.11 (משמרת 8, 03:23):** פריט 16 חלקי: רצפת הטרצו של האולם קיבלה אריח שבבים עדין בגודל האמיתי (0.8 מ'), כך שמקרוב היא נראית כאבן ולא כמריחה (commit 59e32ff). נבדק: museum_live 12/12, צילום טלפון 390x844 בסקייל 2 ובסקייל 1, 14:00; draw calls 28-30, זיכרון 381. לא נבדק: 21:00 (התאורה לא השתנתה), אייפון אמיתי, האתר החי. פתוח: טיח הקירות החיצוניים של הבתים, אבן המרפסת בחוץ, רצפות הבתים. דרוש מאלעד: כלום.

**לילה 23.11 (משמרת 7, 01:24):** פריט 21 (טקסט לכל תערוכה) נסגר: כל 7 לוחות הטקסט החיים (Ritual, My Open Studio, הכניסה לאגף הרנסנס וארבעת חדריו) נלחצו כטלפון 390x844 והקורא נפתח עם הכותרת הנכונה; תמונה נבדקה: קריא. נוספה בדיקה קבועה `studio/app/tests/museum_plates.cjs`. museum_live 12/12. לא נבדק: תערוכת דמו שהוצבה מהדסק (מכוסה בקוד: כותרת/אמן כשאין טקסט), אייפון אמיתי, האתר החי. הערה: בטקסט של Ritual כתוב "exhivition" (שגיאת כתיב בתוכן שלך, לא נגעתי). דרוש מאלעד: כלום.

**לילה 23.11 (משמרת 6, 00:23):** (1) זיכרון עם שני הביתנים המקוריים החיים (Ritual והתערוכה הווירטואלית): בטלפון 378-381 (מתחת ל-460), במחשב בסקייל 1 כ-500 (חד יותר בכוונה, לבקשתך). הנקודה הפתוחה נסגרה. (2) פריט 21: לאגף הרנסנס נוסף לוח טקסט בחוץ, מימין לדלת (כותרת, שנים, החדרים), ולוח הטקסט של כל חדר באגף נפתח עכשיו לקריאה בלחיצה. נבדק: museum_live 12/12, צילום טלפון 390x844 בסקייל 2 ובסקייל 1, draw calls 35. לא נבדק: הלחיצה עצמה על הלוח, אייפון אמיתי, האתר החי. פתוח: חפיפות לחדרים גדולים, לוחות לתערוכות הדמו. דרוש מאלעד: כלום.

**22.11 (בקשת אלעד, ישירות):** Ritual נכנסים אליו דרך הקשת האמיתית שלו (לא דרך חור שנעשה בקיר), הקירות חדים כמו במקור (במחשב 2048 פיקסל, בטלפון 1024) והרצפה נפרשת כמו במקור במקום אריח אחד מתוח. הטקסט תמיד מחוץ לביתן, מימין לכניסה. בלוח התוכנית בדסק: ＋ קולישה, ＋ פדסטל, גרירה, זווית, אורך, גובה, גודל, איזו תערוכה תלויה או עומדת, שכפול, הסרה, ביטול, וכפתור "לוח גדול" למסך מלא (עד 24 מכל סוג). בדיקות: desk/tests/board.cjs 15/15. לא נבדק: iPhone, האתר החי.

**לילה 22.11 (משמרת 4, ידנית):** נעשה (commit 2d3afa0 + מיזוג 264468f): תערוכה שתוכננה קודם (וירטואלית של אמן או אמיתית כמו Ritual) נבנית במקומה בתוך ביתן טיח אמיתי (קליפה, דלת בעומק, טקסט לצד הדלת); צעד דרך הדלת = בתוך החלל המקורי, בלי פוסטר, בלי תווית ובלי לחיצה. ה-Desk מעביר `original` ולא תולה מחדש. לכל בית יש לוחית טקסט (כותרת/אמן/תאריכים כשאין טקסט). נבדק: museum_live 12/12, Desk plan.cjs עובר, תמונות טלפון 390x844 (סקייל 1 ו-2) של Ritual ושל תערוכה וירטואלית. לא נבדק/פתוח: flow.cjs נכשל רק בבדיקת "שגיאות קונסול" (ERR_CONNECTION_REFUSED מהשרת המקומי, לא אומת אם היה קיים קודם); זיכרון ~583 (מעל 460) עם שני ביתנים מקוריים; חפיפות מיקום לחדרים גדולים (long-hall 18 מ') לא נבדקו; לוחיות טקסט בגושים/אגפים (פריט 21 חלקי); תפאורה טרופית (פריט 19) לא התחילה. דרוש מאלעד: כלום.

**לילה 22.11 (משמרת 3, 04:xx):** פריט 15 חלקי: נוספו כיסויי ראש-קיר (0.3 מ') לקירות המחיצה (space.js). museum_live 12/12. לא נבדק: מראה בטלפון/סקייל 1, זיכרון ו-draw calls, אתר חי. פתוח: פינות, פריטים 16-18. דרוש מאלעד: כלום.

**לילה 22.11 (משמרת 2):** פריט 15 חלקי: לפתחים וחלונות ללא מסגרת במוזיאון נוספו משקופים, מדרגה עליונה ואדן בעומק 25 ס"מ (space.js addOpening, synth.js). museum_live 12/12. לא נבדק: מראה בטלפון/סקייל 1, זיכרון ו-draw calls, אתר חי. פתוח: כיפות קיר, פינות, פריטים 16-18. דרוש מאלעד: כלום.

**בוקר טוב. סיכום הלילה (21.11):** פריט 14 (מהירות הליכה במוזיאון) בוצע: ג'ויסטיק עם עקומה (דחיפה מלאה ~4.9 מ'/ש'), ריצה עם Shift, והליכה-בלחיצה מהירה פי ~2. חדרי הסיור לא השתנו. חציית האולם (96 מ') ~20 שניות.
נבדק: museum_live 12/12 (נדרש NODE_PATH לפלייוורייט הגלובלי). לא נבדק: מראה בטלפון, התנגשות בקירות בפועל (מתבסס על clampStand הקיים), אייפון אמיתי.
פתוח: פריטים 15-18 (קירות, טקסטורות, פסלים). דרוש מאלעד: כלום.


- 21.11: נקבעה שיטת עבודה לילית (NIGHT.md) והמשימה `museum-night-shift`. עוד לא רצה.
- 21.11: ROADMAP 14 walking speed (space.js: run curve, Shift, faster tap-walk, museum only). museum_live 12/12.
- 22.11: ROADMAP 15 part: reveals for bare openings (0.25 m). museum_live 12/12; no visual check yet.
- 22.11: ROADMAP 15 part: wall-top caps on partitions. museum_live 12/12; no visual check yet.
- 22.11 night (outside session): ROADMAP 19 tropical outside: instanced palm/banana/monstera/fern/heliconia/shrub/vine cards from a Blender-made atlas (tropics.webp), wet-stone terrace, painted lawn+beds, haze (studio/app/space/tropics.js). Phone 390x844 DPR 2 and 1, 14:00 and 21:00 viewed; museum_live 12/12; start view calls<=53, memory 341. Not checked: real iPhone, glass whitening band at the lawn.
- 22.11 night (outside session): ROADMAP 17 part: Renaissance sculptures in distance levels (12k/40k via blender/sculpture_lod.py, 100k near, phones keep 12k+40k), marble shaded per vertex, grain texture and cap/skirt on plinths (props.js). Viewed on a phone 390x844 DPR 2; museum_live 12/12. Not checked: real iPhone, maquette geometry detail, DPR 1.
- 22.11 23:24 (n5): exited without work: another session was editing synth.js/desk live (changes 23:19-23:22, commits 23:18). Budget at start: weekly 39%, 5h 47%. The next hourly run will continue.
- 23.11 00:23 (n6): memory with 2 live originals: phone 378, DPR1 497. ROADMAP 21 part: wing entrance text plate + bay plates as reader hotspots (synth.js). museum_live 12/12; phone DPR 2+1 viewed.
- 23.11 01:24 (n7): ROADMAP 21 closed: all 7 live text plates open the reader when tapped as a phone (new tests/museum_plates.cjs, inspect.hot()). museum_live 12/12; phone shot viewed. Budget at start: weekly 40%, 5h 57%.
- 23.11 03:23 (n8): ROADMAP 16 part: terrazzo chip detail tile on the hall floor (59e32ff). museum_live 12/12; phone DPR 2+1 viewed; calls 30, memory 381. Budget at start: weekly 40%, 5h 1%.
- 23.11 05:23 (n9): ROADMAP 16 part: lime plaster detail on original pavilions' outer skin (603941b). museum_live 12/12; phone DPR 2+1 viewed; calls 144, memory 609 with n4shot's forced plan, same without the change. Budget: weekly 42->43%, 5h 16%.
- 23.11 06:23 (n10): exited without work: the night was already stopped by the budget gate (weekly 39% at the start -> 43% now, the next item would pass +5). Morning note above stands.
- [ROADMAP 19 המשך] עלים אמיתיים מקרוב: אטלס עלים חדש (מונסטרה עם חורים וחריצים, בננה קרועה, כפות דקל, שרך, עלי לב) עם עורקים; הצמחים הקרובים לזכוכית בנויים מעלים בודדים כפופים ומתנדנדים ברוח; הבריכה משקפת את השמיים של השעה (פרנל, אדוות, קו עצים). 33-35 קריאות ציור, זיכרון 412 (תקרה 460).
- 23.11 07:23 (n11): exited without work: budget gate (weekly 39% at the night start -> 45% now, over +5). Morning note above stands.
- 23.11 18:30 (n12, manual, Elad: night until 07:00, no quota gate): coulisses are plastered boards (a56b941); the Ritual jamb artefact was fixed by the main museum session (c9719b0). Tropics belongs to museum-outside.
- [ROADMAP 19 המשך 2] שוליים נטועים מיד אחרי המרפסת (אין עוד דשא חשוף ליד הזכוכית); בטלפון אטלס הכרטיסים הרחוקים בחצי רזולוציה כדי להישאר מתחת לתקרת הזיכרון (455 מול 460, אחרי המיזוג של שאר המשמרת). קריאות ציור 105-183.
- 23.11 19:40 (n12): ROADMAP 16: house floors (concrete/pale plaster) carry the real material grain (e5014d0, not seen in a shot: no Desk house in the local test plan); ROADMAP 18 audit at 14h: the app floor reads brighter and lower-contrast than the path-traced reference (sun pools wash out), base floor colour is already tuned to the reference, so look at the viewer exposure/reflection next. Phone budget now above the gate at the start view: 192 calls, 121K triangles, memory 683 (tropics terrain; museum-outside was told). n4shot.cjs: HOUR=14 sets the museum's hour.
- 23.11 20:30 (n12): MEMORY MEASURE: a local run has no work thumbnails (they live in open-studio/data/thumbs.json + open-studio/thumbs), so every work loads at 2000 px and the estimate reads 683; with THUMBS=1 (n4shot routes the live thumbnails) it is 499 (calls 243, 67K triangles). Biggest left: the tropics leaf atlas 21 MB, ~8 works held at 2000 px (the phone's 2 full-at-once upgrades and neighbours), pavilion walls 9-16 MB each. New tools: `inspect.textures(n)` in space.js (the biggest pictures by mesh) and n4shot TEXLIST=<n> THUMBS=1 HOUR=<h>. Budget still 499 > 460: next is holding far works at their thumbnail.
