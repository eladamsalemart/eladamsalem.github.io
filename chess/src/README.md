# מאמן השחמט — קוד מקור

בנייה: `node chess/src/build.js`
(קורא מקורות כאן, מטמיע גופנים, מעלה אוטומטית את גרסת ה-cache ב-`version.txt`,
וכותב `../index.html`, `../manifest.webmanifest`, `../sw.js`).

קבצים:
- `engine.js` — מנוע שחמט (מאומת perft), `ai.js` — יריב negamax.
- `content.js` — כל התוכן (פתיחות, תרגילים, מבנים, אסטרטגיה, סיומים, משחקים, מסלול).
- `app.js` — לוגיקת הממשק. `app.css` — עיצוב. `template.html` — שלד ה-HTML.
- האייקונים (`icon-*.png`) הם סטטיים בתיקיית `chess/`.

אימות תוכן שחמט לפני build: הרץ בדיקות `parseSAN`/`perft` ב-Node.
