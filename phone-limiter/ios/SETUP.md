# הרכבה והרצה — שלב 1

הקוד כאן הוא מקור בלבד. פרויקט Xcode נבנה על מק, ולכן השלבים הבאים נעשים שם.
כל השלב הזה לוקח בערך 20 דקות בפעם הראשונה.

## דרישות מקדימות

- **מק עם Xcode 15 ומעלה.** אין דרך לבנות ל-iOS בלי זה.
- **אייפון אמיתי עם iOS 16 ומעלה.** ה-Screen Time API **לא עובד בסימולטור** — הוא תמיד יחזיר שגיאת הרשאה. חייבים מכשיר פיזי.
- **חשבון Apple Developer.** עם חשבון חינמי הבילד פג אחרי 7 ימים וצריך לחבר את הטלפון למק ולהתקין מחדש. עם חשבון בתשלום (99$ לשנה) זה שנה. יש גם דיווחים שיכולת Family Controls לא תמיד זמינה בחשבון חינמי — אם היא לא מופיעה ברשימת ה-Capabilities, זו הסיבה.

## 1. יצירת הפרויקט

ב-Xcode: `File > New > Project > iOS > App`

| שדה | ערך |
|---|---|
| Product Name | `Limiter` |
| Organization Identifier | `com.eladamsalem` |
| Interface | SwiftUI |
| Language | Swift |

אחר כך ב-`General` של ה-target: `Minimum Deployments` → **iOS 16.0**.

## 2. הוספת ה-Extension

`File > New > Target > iOS > Device Activity Monitor Extension`

- Product Name: `Monitor`
- כשנשאלים אם להפעיל את הסכמה — **Activate**.

חשוב שזה ייעשה דרך התבנית של Xcode ולא ידנית, כי היא מייצרת את קובץ ה-`Info.plist` עם מזהה נקודת ההרחבה הנכון. זה לא משהו שכדאי לכתוב ביד.

## 3. הרשאות — על שני ה-targets

צריך לעשות את זה **גם ל-`Limiter` וגם ל-`Monitor`**. אם שוכחים את ה-extension, החסימה תעבוד ידנית אבל מצב שינה לא יידלק לבד.

בכל target, לשונית `Signing & Capabilities` → `+ Capability`:

1. **Family Controls** — מוסיף את `com.apple.developer.family-controls`.
2. **App Groups** — ליצור קבוצה בשם:
   ```
   group.com.eladamsalem.limiter
   ```
   השם חייב להיות זהה בשני ה-targets, ולהתאים ל-`AppGroup.identifier` בקוד. אם תשנה אותו, שנה גם ב-`Shared/AppGroup.swift`.

בנוסף, ב-`Signing`: לבחור את ה-Team שלך ולוודא ש-`Automatically manage signing` מסומן.

## 4. הכנסת הקוד

לגרור את התיקיות לתוך הפרויקט ב-Xcode, עם `Copy items if needed` מסומן.

**`Shared/`** — כאן נמצאת הנקודה היחידה שקל לפספס. בחלון הגרירה, תחת `Add to targets`, לסמן **גם `Limiter` וגם `Monitor`**. ארבעת הקבצים האלה משותפים לשניהם:

- `AppGroup.swift`
- `Mode.swift`
- `ModeStorage.swift`
- `ShieldController.swift`
- `ScheduleManager.swift`

אם תסמן רק את האפליקציה, ה-extension לא יתקמפל.

**`Limiter/`** — לסמן רק את target `Limiter`:

- `LimiterApp.swift`
- `ContentView.swift`
- `ModeEditorView.swift`
- `DurationSheet.swift`
- `AuthorizationManager.swift`
- `ModeStore.swift`

Xcode יצר קבצים בשם `LimiterApp.swift` ו-`ContentView.swift` כשיצרת את הפרויקט — למחוק אותם לפני הגרירה (`Move to Trash`), אחרת יהיה שם כפול ושתי הצהרות `@main`.

**`Monitor/`** — להחליף את התוכן של `DeviceActivityMonitorExtension.swift` שהתבנית יצרה בתוכן של הקובץ שלנו. לא למחוק את הקובץ עצמו, רק להדביק לתוכו — כך ה-plist ממשיך להצביע על המחלקה הנכונה.

## 5. הרצה

לחבר את האייפון, לבחור אותו כיעד, `Cmd+R`.

בפעם הראשונה:
- באייפון: `Settings > General > VPN & Device Management` → לאשר את המפתח.
- באפליקציה: ללחוץ "אשר" במסך ההרשאה. תופיע בקשת מערכת של Screen Time — לאשר.
- אם המכשיר משויך ל-Family Sharing כילד, האישור יידרש מההורה. במכשיר עצמאי זה מאשר את עצמו.

## 6. בדיקה שזה באמת עובד

1. לפתוח את מצב "שיעור", ללחוץ עליו כדי לערוך.
2. "בחר אפליקציות לחסימה" → לבחור אינסטגרם וווטסאפ. שים לב שהרשימה מציגה אייקונים ושמות, אבל האפליקציה שלך לא מקבלת אותם — היא מקבלת טוקנים אטומים. זו החלטת פרטיות של אפל ולכן אי אפשר לשמור מראש רשימה של "האפליקציות שלי" בקוד.
3. לשמור, ללחוץ "הפעל", לבחור 15 דקות.
4. לצאת ולנסות לפתוח אינסטגרם — אמור להופיע מסך חסימה אפור.
5. "סיים עכשיו" מחזיר את הגישה מיד.

לבדיקת מצב שינה בלי לחכות ללילה: לשנות את הלו״ז לחלון שמתחיל בעוד שתי דקות ונמשך 15, לשמור, לסגור את האפליקציה ולחכות. אם החסימה נדלקה לבד — ה-extension עובד.

## מה עוד לא נמצא כאן

שלב 1 הוא מצבים בלבד. עדיין לא נבנו:

- תפריט הכוונות לכל אפליקציה (פוסט / סטורי / רק לגלול) — דורש הרחבות `ShieldConfiguration` ו-`ShieldAction`, ואוטומציות Shortcuts.
- זמין / לא זמין להתראות — דורש `SetFocusFilterIntent` וחיבור למצבי ריכוז.
- סטטיסטיקה וחיכוך מתגבר.

## תקלות נפוצות

| תסמין | סיבה |
|---|---|
| `AuthorizationCenter` מחזיר שגיאה תמיד | רץ בסימולטור. חייב מכשיר פיזי. |
| החסימה עובדת ידנית אבל לא בלו״ז | חסרה יכולת Family Controls או App Group על target ה-`Monitor`. |
| `Cannot find 'ModeStorage' in scope` בבנייה של ה-extension | קבצי `Shared/` לא סומנו ל-target `Monitor`. |
| שינוי במצב פעיל לא משפיע | הקוד מחיל מחדש בשמירה. אם לא — לוודא ש-`AppGroup.identifier` זהה למה שמוגדר ב-Capabilities. |
| האפליקציה מפסיקה לעבוד אחרי שבוע | חשבון מפתח חינמי. הבילד פג. |
