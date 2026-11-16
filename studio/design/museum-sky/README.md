# המוזיאון "תחת שמיים אחד": תיאור המבנה (מודולרי)

## סיכום בעברית

המוזיאון הוא **בניין אחד** (96 × 72 מ׳, גג אחד בגובה 14 מ׳, זכוכית מסביב). הוא **לא נבנה מרחוב קבוע** אלא **מתיאור**: רשימה של מרחבים והבסיס שלהם.
האפליקציה מקבלת את התיאור (מטבלה `museum_plan`, ואם אין שם שורה: מהתיאור הבסיסי שהיא נושאת בקוד, `SKY_PLAN` ב־`studio/app/space/synth.js`) ובונה ממנו את הבניין,
את התוכנית הלחיצה ואת רשימת התערוכות (`spec.directory`). כל תיאור תקין נבנה; מה שלא תקין נופל חזרה לבסיס, כך שהמוזיאון תמיד נפתח.

- **שלב 1 (עכשיו):** הבסיס. שמונת הבתים (חדרי ה־Desk, 8 × 6 מ׳) ואגף הרנסנס. ב־Desk ממלאים ומרוקנים את הבתים הקיימים; הבסיס מצויר שם מהתיאור.
- **שלב 2 (נבנה 16.11):** ב־Desk "הוסף מרחב / הסר מרחב" בתוכנית הבניין: בוחרים סוג (בית חדש, או תערוכה של אמן עם החלל המקורי: `tour`), כיוון, ולוחצים על התוכנית היכן הדלת (בדיקת חפיפה מול בתים, אגף, בריכה, עמודים, קולישות, כניסה). נכתב ל־`museum_plan`; ביטול מיידי. בתים נוספים (מספר 9 ומעלה) מופיעים בשורה נפרדת תחת החדרים.
- לכל מרחב אפשר `enabled: false` (כבוי = כאילו הוסר). חדר ב־`house` מופיע רק אם בסלוט שלו יש תערוכה.

## פורמט התיאור (גרסה 1)

```json
{
  "version": 1,
  "hall":     { "w": 96, "d": 72, "h": 14 },          // הבסיס: הבניין כולו (מטרים). הקירות הזכוכית והגג נגזרים ממנו
  "entrance": { "at": [43, 53] },                     // הכניסה: פתח בקיר הזכוכית הדרומי, מטרים לאורכו (מ־ עד)
  "start":    { "pos": [48, 66.5], "look": [48, 34] },// איפה המבקר נוחת ולאן הוא מסתכל (x, z)
  "pool":     [40, 30, 60, 38],                       // הבריכה בכיכר (x0, z0, x1, z1), או null
  "piers":    [[29, 26], [70, 24]],                   // עמודים [x, z] (קירות מוצקים: אי אפשר לעבור)
  "stands":   [{ "id": "pl-a", "x": 38, "z": 26.5, "len": 4, "rot": 12, "h": 3.2 }],   // קוליסות: קירות עומדים; עליהם היצירה הראשונה של כל תערוכה
  "objects":  [[56, 46]],                             // פדסטלים בכיכר לפסלים של תערוכות (עד שלושה)
  "spaces": [
    { "id": "house-1", "type": "house", "slot": 1, "door": [41, 21], "dir": 270 },
    { "id": "renaissance", "type": "section", "section": "renaissance", "door": [14, 47], "dir": [0, -1] }
  ]
}
```

סוגי מרחב (`spaces[].type`):

| סוג | שדות | מה זה |
|---|---|---|
| `house` | `slot` (1 עד 64), `door` [x, z], `dir` (מעלות: 0 מזרח, 90 דרום, 270 צפון) | חדר של תערוכה ב־Desk (8 × 6 מ׳ + סף 1.8 מ׳), הדלת ב־`door` והחדר נמשך ב־`dir`. התליה, הפדסטלים והמלל כמו ב־Desk. |
| `section` | `section` (מזהה מ־`data/museum/sections.json`), `door` [x, z], `dir` [ox, oz] (וקטור יחידה) | מדור היסטוריה (שרשרת מפרצים שמתרחבת: הרנסנס). מופיע רק אם התיאור שם אותו. |

כל מרחב יכול לקבל `"enabled": false`. מרחב נוסף בעתיד (למשל `court`, `hall`, אגף נוסף) נוסף כסוג חדש ב־`planOf`/`buildSky` מבלי לשנות את הקיימים.

## איפה זה בקוד

- `studio/app/space/synth.js`: `SKY_PLAN` (הבסיס), `planOf()` (בדיקת תקינות), `skyLayout()`, `buildSky()` (בונה את הבניין ואת `spec.directory`).
- `studio/app/app.js` (`enterStreet`): קורא `museum_plan?key=eq.main`, אחרת הבסיס; כל חדר מקבל את מספר הסלוט שלו.
- `studio/app/space/space.js`: משטחי זכוכית (`glass: true`), המפה הלחיצה והרשימה (`spec.directory`).
- `studio/desk/museum.js`: מצייר את הבסיס מהתיאור; כפתורי "הוסף/הסר מרחב" מסומנים כשלב 2 ולא פעילים.
- `studio/supabase/migrations/2026-11-16_museum_plan.sql`: הטבלה `museum_plan` (קריאה לכולם, כתיבה למנהל) והרחבת מספר הסלוטים עד 64.
- `studio/app/tests/museum_live.cjs`: בודק שהמוזיאון נבנה, שהמפה נפתחת ושהקפיצה עובדת.

## English

The museum is generated from a description (this format), not from a fixed street. The base plan is `SKY_PLAN` in `synth.js`; the Desk may store its own in `museum_plan` (key `main`);
invalid parts fall back to the base so the museum always opens. Stage 1 fills/empties the existing houses on the Desk; stage 2 (not built) adds/removes spaces there.
The plan, the exhibition list and the jump (`spec.directory`) are generated from the same description.
