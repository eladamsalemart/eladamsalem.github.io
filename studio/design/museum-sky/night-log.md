# יומן משמרת הלילה של המוזיאון

(הסיכום של הלילה האחרון נכתב בראש הקובץ, עד 6 שורות, בעברית. מתחתיו שורה לכל פריט: תאריך, מה, commit, מה נבדק.)

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
