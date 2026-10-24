<div dir="rtl">

# חללי תצוגה דיגיטליים: מי עושה את הכי ריאליסטי, ומה זה אומר ל־Studio

אוקטובר 2026. מחקר קצר לפני בניית המנגנון שמייצר חלל מכל תערוכה לבד.

## שלוש רמות של ריאליזם

| רמה | איך זה נעשה | מי עושה | איך זה נראה | מה זה דורש |
|---|---|---|---|---|
| **1. חדר מודל + תאורה מחושבת** | בונים חדר וירטואלי ותולים בו תמונות | Kunstmatrix, Artsteps, ArtPlacer, V21 | נקי אבל "דיגיטלי": אור אחיד, קירות חלקים, ציורים כמו מדבקות | רק תמונות העבודות |
| **2. סריקה של החלל האמיתי + עבודות באיכות גבוהה** | פוטוגרמטריה של הגלריה (צילומים רבים), ומעליה תמונות העבודות ברזולוציה גבוהה | Vortic (David Zwirner, Victoria Miro), Matterport | החלל האמיתי עם האור האמיתי שלו. העבודות חדות | צילומים רבים של החלל, או מצלמה ייעודית |
| **3. Gaussian Splatting** | מסרטון הליכה של 1–2 דקות בחלל לומדים "ענן" של מיליוני כתמי אור | Niantic (Scaniverse), Luma, Polycam, World Labs (Spark) | הכי קרוב לצילום: השתקפויות שזזות כשזזים, אור וצל אמיתיים לגמרי | סרטון וידאו של החלל. הפרטים הקטנים בציור פחות חדים מסריקה |

**מה מתאים לאמנות:** הכי טוב הוא שילוב. החלל ייבנה מהצילומים (רמה 2 או 3), והעבודות יגיעו מהצילומים האיכותיים שלך, בגודל המדויק, באור שנמדד מהצילומים. ככה עושה Vortic, הפלטפורמה שהגלריות הגדולות עבדו איתה. Matterport נחשבת טובה לתיעוד חלל אבל חלשה לתערוכות, כי נקודות המבט בה קבועות.

## מה אני יכול לעשות עכשיו, בחינם, עם מה שיש

לכל תערוכה שלך יש 6–7 צילומים, וזה מעט מדי ל־Gaussian Splatting, שצריך עשרות עד מאות. גם השיטות החדשות ל"מעט צילומים" (InstantSplat ודומות) דורשות כרטיס מסך חזק ושאין פערים גדולים בין הצילומים. לכן המנגנון בונה רמה 2 מהצילומים הקיימים:

1. **זיהוי עבודות:** מזהה כל עבודה בכל צילום אוטומטית, לפי השוואה לצילום האיכותי שלה.
2. **מדידה:** כל עבודה היא סרגל, כי המידה שלה ידועה. מכאן נמדדים המצלמות, המיקום התלת־ממדי של כל עבודה, הרצפה והקירות.
3. **אור אמיתי על הקירות:** מקרינים את הפיקסלים האמיתיים מהצילומים על הקירות, הרצפה והתקרה. התאורה, הצללים והטיח הם של המקום עצמו.
4. **העבודות:** מוצגות מהצילום האיכותי, באיכות מלאה, כאובייקט עם עובי וצדדים. האור שנופל עליהן נמדד מהאופן שבו הן נראות בצילומי ההצבה.
5. **השתקפויות ברצפה:** מחושבות בזמן אמת, כך שהן זזות נכון כשהולכים.

## לתערוכות הבאות, בחינם

- **סרטון הליכה:** סרטון איטי של 1–2 דקות בחלל (טלפון רגיל, בלי זום, לאורך הקירות) הוא החומר הכי עשיר שיש. מאפליקציות חינמיות כמו Scaniverse אפשר להפיק ממנו Gaussian Splat. בהמשך Studio יוכל להציג Splat כזה (Spark, קוד פתוח, three.js) ועליו את העבודות בגודל ובאיכות המלאים.
- **צילומים לפי הנחיות:** בכל צילום 2–3 עבודות ופינה של החדר. כל קיר בשני צילומים לפחות.

## קנייה חד־פעמית וזולה שמומלצת

**מד מרחק לייזר** (בערך 100–250 ₪, למשל Bosch GLM או דגם בסיסי של Xiaomi).

- **מה מודדים:** בכל תערוכה רק אורך, רוחב וגובה של החדר, וגובה של עבודה אחת מהרצפה.
- **מה זה נותן:** זה משפר את הדיוק של כל החלל מבערך ±15 ס"מ לבערך ±2 ס"מ. המנגנון כבר יודע לקבל את המספרים האלה ולהעדיף אותם על החישוב שלו.

**לא נחוץ עכשיו:**
- **מצלמת 360** (כ־2,000 ₪ ומעלה). היא משפרת חוויה בנקודות קבועות ולא הליכה.
- **מנויים** ל־Matterport או Vortic.

## מקורות

- [Gaussian Splatting guide 2026: tools, viewers, costs](https://www.utsubo.com/blog/gaussian-splatting-guide)
- [Spark: open-source splat renderer for three.js](https://radiancefields.com/platforms/spark) · [Spark 2.0, World Labs](https://www.worldlabs.ai/blog/spark-2.0)
- [Gaussian splatting in VR, SIGGRAPH 2026](https://vr.org/articles/gaussian-splatting-vr-siggraph-2026)
- [Scaniverse: free on-device splats, PLY/SPZ export](https://apps.apple.com/us/app/-/id1541433223) · [SPZ format](https://scaniverse.com/spz)
- [Vortic: photogrammetry of gallery spaces + high-res artworks](https://news.artnet.com/art-world/new-extended-reality-app-1812807) · [CEO interview](https://www.madeinbed.co.uk/interviews/anindya-sen-in-conversation-with-nick-walter-ceo-of-vortic) · [David Zwirner × Victoria Miro](https://davidzwirner.com/news/announcing-side-by-side-a-presentation-by-david-zwirner-and-victoria-miro)
- [Platform comparison (vendor view)](https://v21artspace.com/alternatives-to-kunstmatrix) · [Virtual gallery companies 2026](https://www.reality-atlas.com/blog/best-companies-virtual-art-galleries-vr-exhibitions)
- [InstantSplat: sparse-view splatting](https://arxiv.org/html/2403.20309v5)

</div>
