// The gate's detail lines in Hebrew, for the Desk (the owner's, in Hebrew). Deterministic: phrase by phrase, in order; numbers,
// units, wall names and work titles stay as they are. Every phrase import.cjs writes is here; one it doesn't know stays English.
const R = [
  // tour_live
  [/^the tour passed its own build and inspection$/, 'הסיור עבר את הבנייה והבדיקה שלו'],
  [/^the tour has not passed its own checks \(state "([^"]+)"\): /, 'הסיור עוד לא עבר את הבדיקות שלו (מצב "$1"): '],
  [/(\d+) of (\d+) works were found in the installation photos/g, '$1 מתוך $2 עבודות נמצאו בצילומי ההצבה'],
  [/Size missing, or not matching the work's image: /g, 'מידה חסרה או לא תואמת לתמונה: '],
  [/The photos show a different size than recorded: /g, 'בצילומים נמדדה מידה אחרת מהרשומה: '],
  [/Only (\d+) of the room's 4 walls could be measured/g, 'רק $1 מתוך 4 הקירות נמדדו'],
  [/The photos don't fit together precisely enough yet/g, 'הצילומים עוד לא מתחברים זה לזה בדיוק מספיק'],
  [/Only (\d+)% of the walls are in the photos/g, 'רק $1% מהקירות נראים בצילומים'],
  [/The rebuilt room doesn't match the photos closely enough yet/g, 'החדר שנבנה עוד לא תואם לצילומים מספיק'],
  // real_openings
  [/^(\d+) real opening\(s\) on ([\w-]+): /, '$1 פתחים אמיתיים בקיר $2: '],
  [/\barch ([\d.]+) x ([\d.]+) m/g, 'קשת $1 × $2 מ\''], [/\bdoorway ([\d.]+) x ([\d.]+) m/g, 'דלת $1 × $2 מ\''],
  [/^the tour has no measured walkable opening \(arch or doorway\); the importer will not invent one \(the pavilion code would cut a ([\d.]+) m door into ([\w-]+)\)$/,
    'בסיור לא נמדד שום פתח שאפשר לעבור בו (קשת או דלת); המייבא לא ממציא פתח (אחרת הביתן היה חותך דלת של $1 מ\' בקיר $2)'],
  [/^walkable openings on (.+) would not lead into the museum \(only the door wall's do\)$/, 'פתחים בקירות $1 לא היו מובילים למוזיאון (רק פתחי קיר הכניסה מובילים)'],
  // free_place
  [/^door at \[([^\]]+)\] facing (\d+)°, every opening linked \(walk from the start (.+)\), no space cut off$/, 'הכניסה ב־[$1], פונה $2°; כל פתח מחובר לשבילים (הליכה מנקודת ההגעה: $3); אף מרחב אחר לא נחסם'],
  [/^no free place in the museum fits the room \((\d+) positions tried\)$/, 'אין במוזיאון מקום פנוי שהחדר נכנס בו ($1 מקומות נבדקו)'],
  // jambs
  [/^(\d+) opening\(s\): full ([\d.]+) m jambs and head, same shape, nothing across the way$/, '$1 פתחים: משקופים וראש בעובי קיר מלא ($2 מ\'), באותה צורה, ושום דבר לא חוסם את המעבר'],
  [/^the only way in is invented \(no real opening\): /, 'הכניסה היחידה מומצאת (אין פתח אמיתי): '],
  [/built, but not real/, 'נבנתה, אבל לא אמיתית'],
  [/the skin has (\d+) openings, the room's door wall (\d+)/g, 'בקיר החיצוני $1 פתחים, ובקיר הכניסה של החדר $2'],
  [/no skin opening lines up with the (arch|doorway) \(([^)]+)\)/g, (m, k, d) => `אין פתח בקיר החיצוני שמתיישר עם ה${k === 'arch' ? 'קשת' : 'דלת'} (${d.replace(' m off', ' מ\' סטייה').replace('none', 'אין')})`],
  [/the skin opening is ([\d.]+) m wide, the room's ([\d.]+)/g, 'הפתח בקיר החיצוני ברוחב $1 מ\', בחדר $2'],
  [/the skin opening is ([\d.]+) m high, the room's ([\d.]+)/g, 'הפתח בקיר החיצוני בגובה $1 מ\', בחדר $2'],
  [/the jambs are ([\d.]+) m deep, the wall ([\d.]+) m/g, 'עומק המשקופים $1 מ\', עובי הקיר $2 מ\''],
  [/a(?:n)? (arch|doorway) became a(?:n)? (arch|doorway) in the skin/g, (m, a, b) => `${a === 'arch' ? 'קשת' : 'דלת'} הפכה ל${b === 'arch' ? 'קשת' : 'דלת'} בקיר החיצוני`],
  [/a wall crosses the way through the (arch|doorway) at \[([^\]]+)\]/g, (m, k, p) => `קיר חוסם את המעבר דרך ה${k === 'arch' ? 'קשת' : 'דלת'} ב־[${p}]`],
  [/the door side of the skin has no opening/g, 'בקיר החיצוני בצד הכניסה אין פתח'],
  // text_flush
  [/^the wall text is flush on the door wall, in a solid run, clear of the openings$/, 'טקסט הקיר צמוד לקיר הכניסה, על קטע קיר שלם, רחוק מהפתחים'],
  [/^the wall text: /, 'טקסט הקיר: '], [/no text plate on the door wall/g, 'אין לוח טקסט על קיר הכניסה'],
  [/it stands ([\d.]+) cm off the wall/g, 'הוא עומד $1 ס"מ מהקיר'], [/it does not face the way the wall faces/g, 'הוא לא פונה לאותו כיוון כמו הקיר'],
  [/it runs past the wall's end \(([^)]+)\)/g, 'הוא חורג מקצה הקיר ($1)'], [/it overlaps an opening \(([^)]+)\)/g, 'הוא עולה על פתח ($1)'], [/its height is odd \(([^)]+)\)/g, 'הגובה שלו משונה ($1)'],
  // works
  [/^(\d+) works at their measured size and place$/, '$1 עבודות בגודל ובמקום שנמדדו'], [/^not carried over at their size: /, 'לא הועברו בגודל שלהן: '],
  // phone_memory
  [/^(\d+) MB at the start view, (\d+) MB inside the pavilion \(budget (\d+)\); the museum without this draft: (\d+|null) MB, so the pavilion adds (-?\d+|\?) MB at the start$/,
    '$1 MB בנקודת ההגעה, $2 MB בתוך הביתן (תקציב $3); המוזיאון בלי הטיוטה: $4 MB, כלומר הביתן מוסיף $5 MB'],
  // floor_mirror
  [/^the tour's floor is glossy \(reflect ([\d.]+)\): /, 'הרצפה בסיור מבריקה (החזר $1): '], [/^the tour's floor is nearly matte \(reflect ([\d.]+)\): /, 'הרצפה בסיור כמעט מטה (החזר $1): '],
  [/the museum floor takes the mirror's tint as it should \(gain ([\d.]+), mirror ([\w-]+)\)/, 'רצפת הביתן מקבלת את צבע המראה כמו שצריך (עלייה $1, מראה $2)'],
  [/the mirror's tint gain is ([\d.-]+), too weak: the reflection does not reach the floor/, 'עליית הצבע במראה $1, חלשה מדי: ההשתקפות לא מגיעה לרצפה'],
  [/the mirror's tint gain is ([\d.-]+), shinier than the tour/, 'עליית הצבע במראה $1: מבריק יותר מהסיור'], [/the mirror's tint gain is ([\d.-]+), nothing reaches the floor/, 'עליית הצבע במראה $1: שום דבר לא מגיע לרצפה'],
  [/^no floor mirror is on inside the pavilion \(([^)]+)\)$/, 'אין מראת רצפה פעילה בתוך הביתן ($1)'],
  // px_per_m
  [/^at or above the tour: /, 'כמו בסיור או יותר: '], [/^below the tour: /, 'פחות מבסיור: '], [/floor tile/g, 'אריח הרצפה'],
  [/ \((\d+)\/(\d+) measured on the GPU, the rest from the built pictures\)/, ' ($1 מתוך $2 נמדדו בכרטיס הגרפי, השאר מהתמונות שנבנו)'],
  [/, light maps carried$/, ', מפות האור הועברו'], [/; light maps lost on (.+)$/, '; מפות אור אבדו ב־$1'],
  // side_by_side
  [/^3 views saved; every work seen in the tour is seen in the museum, no holes$/, '3 מבטים נשמרו; כל עבודה שנראית בסיור נראית גם במוזיאון, בלי חורים'],
  [/^the three views could not be made \((.*)\)$/, 'לא ניתן היה לצלם את שלושת המבטים ($1)'],
  [/([\w-]+): ([\d.]+)% holes/g, '$1: $2% חורים'], [/ missing /g, ' חסרות: '],
];
module.exports = function he(why) { let s = String(why || ''); for (const [a, b] of R) s = s.replace(a, b); return s; };
