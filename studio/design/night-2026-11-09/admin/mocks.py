"""The four control-room directions as real HTML (Hebrew, RTL, the app's data shapes). Each page is responsive:
390 px wide is the phone, 1280 px the desktop."""
from mock_common import *

A0, A1 = ARTISTS[0], ARTISTS[1]
NAV = lambda items, cur: ''.join(f'<a class="{"on" if i == cur else ""}"><span>{t}</span>{f"<i class=badge>{b}</i>" if b else ""}</a>' for i, (t, b) in enumerate(items))
NAVITEMS = [('תור', 3), ('קהילה', 0), ('תערוכות', 0), ('מערכת', 0)]

# ---------------------------------------------------------------- A: the queue
def opt_a():
    css = '''
.app{min-height:100vh;display:grid}
.top{display:flex;justify-content:space-between;align-items:center;padding:6px 16px;min-height:44px}.top a{color:var(--muted);font-size:14px}
main{padding:0 16px 96px}h1{font:400 30px/1.1 var(--serif);padding:6px 0 4px}
.sub{color:var(--muted);font-size:14px;padding-bottom:14px}
.q{display:grid;gap:12px}
.item .hd{display:flex;justify-content:space-between;gap:8px;align-items:start}.item h2{font:500 22px/1.15 var(--serif)}
.item .sm{font-size:14px;color:var(--ink);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;direction:ltr;text-align:left}
.acts{display:flex;gap:8px;align-items:center}.acts .btn.f{flex:1}
.tn{position:relative}.tn.x img{opacity:.28;filter:grayscale(1)}.tn.x::after{content:"הוסתר";position:absolute;inset:auto 0 6px;text-align:center;font:600 11px var(--sans)}
.tn .q2{position:absolute;top:4px;inset-inline-start:4px;background:var(--warn);color:#fff;border-radius:99px;width:18px;height:18px;font:700 11px/18px var(--sans);text-align:center}
.nav{position:fixed;inset:auto 0 0;background:color-mix(in srgb,var(--wall) 92%,transparent);backdrop-filter:blur(10px);border-top:1px solid var(--line);display:grid;grid-template-columns:repeat(4,1fr);padding-bottom:env(safe-area-inset-bottom,10px)}
.nav a{display:flex;gap:5px;align-items:center;justify-content:center;min-height:56px;font-size:13px;color:var(--muted);font-weight:500}.nav a.on{color:var(--ink);font-weight:700;box-shadow:inset 0 -2px 0 var(--dot)}
.side{display:none}.keys{display:none}
@media(min-width:900px){
 .app{grid-template-columns:220px 1fr}
 .side{display:grid;align-content:start;gap:4px;padding:28px 18px;border-inline-end:1px solid var(--line);background:var(--paper);min-height:100vh;position:sticky;top:0;height:100vh}
 .side b{font:500 24px var(--serif);padding-bottom:18px;display:block}.side a{display:flex;justify-content:space-between;align-items:center;padding:0 12px;min-height:44px;border-radius:12px;font-weight:500}.side a.on{background:var(--ink);color:var(--wall)}.side a.on .badge{background:var(--wall);color:var(--ink)}
 .nav,.top{display:none}main{padding:28px 36px;max-width:1100px}.q{grid-template-columns:1fr 1fr;align-items:start}.keys{display:flex;gap:14px;padding-top:18px;color:var(--muted);font-size:13px}
 .keys kbd{font:500 11px var(--mono);border:1px solid var(--line);border-radius:6px;padding:2px 6px;background:var(--paper)}h1{font-size:40px}
 .wide{grid-column:1/-1}}'''
    art = lambda a: f'''<article class="card item"><div class="hd"><div><h2>{a['name']}</h2><p class="m">{a['disc']} · {a['city']} · נשלח {a['since']}</p></div><span class="flag">מחכה</span></div>
      {thumbs(a['works'][:4], 4)}<p class="sm">{a['st']}</p>
      <div class="acts"><button class="btn f">אשר</button><button class="btn g">בקש שינויים</button><a class="btn t">צפה בעמוד</a></div></article>'''
    nw = NEWWORKS
    tiles = ''.join(f'<div class="tn {"x" if i == 5 else ""}"><img src="{img(n)}" alt="">{"<span class=q2>?</span>" if i in nw["nosize"] else ""}</div>' for i, n in enumerate(nw['items']))
    works = f'''<article class="card item"><div class="hd"><div><h2>{nw['artist']}</h2><p class="m">6 עבודות חדשות · הקש על עבודה כדי להסתיר</p></div><span class="flag ok">באוויר</span></div>
      <div class="th" style="grid-template-columns:repeat(3,1fr)">{tiles}</div><p class="m">ל־1 מהעבודות חסרות מידות</p>
      <div class="acts"><button class="btn f">הכל נראה טוב (5)</button></div></article>'''
    tour = f'''<article class="card item"><div class="hd"><div><h2>{TOUR['title']}</h2><p class="m">{TOUR['artist']} ביקש/ה סיור תלת־ממדי</p></div><span class="flag">ביקש סיור</span></div>
      <p class="m">{TOUR['meta']}</p><div class="acts"><a class="btn f" style="flex:1">פתח את התערוכה</a></div></article>'''
    body = f'''<div class="app"><aside class="side"><b>חדר בקרה</b>{NAV(NAVITEMS, 0)}<a style="margin-top:auto;color:var(--muted)">← לאפליקציה</a></aside>
<div><div class="top"><a>→ לאפליקציה</a><span class="mono">חדר בקרה</span></div><main>
<h1>3 דברים מחכים לך</h1><p class="sub">השבוע הצטרפו 12 · 8 אמנים באוויר · 143 עבודות</p>
<div class="q">{art(A0)}{art(A1)}{works}{tour}</div>
<div class="keys"><span><kbd>J</kbd> <kbd>K</kbd> מעבר בין פריטים</span><span><kbd>A</kbd> אשר</span><span><kbd>C</kbd> בקש שינויים</span><span><kbd>P</kbd> צפה בעמוד</span></div>
</main></div></div><nav class="nav">{NAV(NAVITEMS, 0)}</nav>'''
    return page('A: תור', css, body)

# ---------------------------------------------------------------- B: cards dashboard
def opt_b():
    css = '''
.top{display:flex;justify-content:space-between;align-items:center;padding:6px 16px;min-height:44px}.top a{color:var(--muted);font-size:14px}
main{padding:0 16px 40px;max-width:1100px;margin:auto}h1{font:400 34px/1.1 var(--serif);padding:6px 0 14px}
.g{display:grid;gap:10px}.big{font:400 46px/1 var(--serif)}.c{gap:6px;align-content:start}.c h2{font:600 14px var(--sans);color:var(--muted)}
.row{display:flex;justify-content:space-between;align-items:end}.spark{display:flex;gap:3px;align-items:end;height:38px}.spark i{width:9px;background:var(--dot);opacity:.55;border-radius:2px}
.hot{border-color:var(--dot);background:color-mix(in srgb,var(--dot) 7%,var(--paper))}.cta{color:var(--dot);font-weight:700;font-size:14px;min-height:30px;display:flex;align-items:center}
.ok{color:var(--dot);font-weight:600}
@media(min-width:900px){.g{grid-template-columns:repeat(3,1fr)}main{padding:30px 36px}h1{font-size:42px}.w2{grid-column:span 2}}'''
    spark = lambda hs: '<div class="spark">' + ''.join(f'<i style="height:{h}%"></i>' for h in hs) + '</div>'
    body = f'''<div class="top"><a>→ לאפליקציה</a><span class="mono">חדר בקרה</span></div><main><h1>בוקר טוב</h1><div class="g">
<a class="card c hot"><h2>אמנים מחכים לאישור</h2><div class="row"><span class="big">2</span><span class="m">Maya, Yosef</span></div><span class="cta">לבדיקה ←</span></a>
<a class="card c hot"><h2>עבודות חדשות לבדיקה</h2><div class="row"><span class="big">14</span><span class="m">מ־3 אמנים</span></div><span class="cta">לבדיקה ←</span></a>
<a class="card c"><h2>בקשות סיור תלת־ממדי</h2><div class="row"><span class="big">1</span><span class="m">Rooms Left Behind</span></div><span class="cta">לפרטים ←</span></a>
<a class="card c"><h2>הצטרפו השבוע</h2><div class="row"><span class="big">12</span>{spark([30,45,40,70,55,90,100])}</div><span class="m">5 היום · 143 בסך הכל</span></a>
<a class="card c"><h2>תערוכות אוצרות</h2><div class="row"><span class="big">2</span><span class="m">מפורסמות · טיוטה אחת</span></div><span class="cta">לעריכה ←</span></a>
<a class="card c"><h2>תקינות</h2><p class="ok">הכל תקין</p><p class="m">כל 7 הבדיקות עברו בלילה</p></a>
<a class="card c w2"><h2>עוד</h2><div style="display:flex;gap:8px;flex-wrap:wrap"><span class="btn g">בקשת שינוי</span><span class="btn g">חשבונות בדיקה</span><span class="btn g">סיור כמבקר חדש</span><span class="btn g">סיור כאמן חדש</span></div></a>
</div></main>'''
    return page('B: כרטיסים', css, body)

# ---------------------------------------------------------------- C: split view
def opt_c():
    css = '''
.app{min-height:100vh;display:grid}
.top{display:flex;justify-content:space-between;align-items:center;padding:6px 16px;min-height:44px}.top a{color:var(--muted);font-size:14px}
.list{padding:0 16px 80px}.list h1{font:400 28px var(--serif);padding:6px 0 10px}
.r{display:grid;grid-template-columns:48px 1fr auto;gap:12px;align-items:center;padding:10px 8px;border-bottom:1px solid var(--line);min-height:64px;border-radius:10px}
.r img{width:48px;height:48px;object-fit:cover;border-radius:8px}.r b{font-weight:600}.r.sel{background:var(--card)}
.grp{font:500 11px var(--mono);letter-spacing:.1em;text-transform:uppercase;color:var(--muted);padding:14px 8px 4px}
.det,.side{display:none}
.nav{position:fixed;inset:auto 0 0;background:var(--wall);border-top:1px solid var(--line);display:grid;grid-template-columns:repeat(4,1fr)}
.nav a{display:flex;gap:5px;align-items:center;justify-content:center;min-height:56px;font-size:13px;color:var(--muted)}.nav a.on{color:var(--ink);font-weight:700;box-shadow:inset 0 -2px 0 var(--dot)}
@media(min-width:900px){
 .app{grid-template-columns:200px 360px 1fr;height:100vh;overflow:hidden}.nav,.top{display:none}
 .side{display:grid;align-content:start;gap:4px;padding:26px 14px;background:var(--paper);border-inline-end:1px solid var(--line)}.side b{font:500 22px var(--serif);padding-bottom:16px;display:block}
 .side a{display:flex;justify-content:space-between;align-items:center;padding:0 12px;min-height:44px;border-radius:12px;font-weight:500}.side a.on{background:var(--ink);color:var(--wall)}.side a.on .badge{background:var(--wall);color:var(--ink)}
 .list{overflow:auto;border-inline-end:1px solid var(--line);padding:22px 12px}
 .det{display:grid;align-content:start;gap:16px;padding:30px 40px;overflow:auto}.det h2{font:500 36px/1.1 var(--serif)}
 .big{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.big img{width:100%;aspect-ratio:1;object-fit:cover;border-radius:10px}
 .bar{display:flex;gap:8px;position:sticky;bottom:0;background:var(--wall);padding:12px 0}.note{border:1px solid var(--line);border-radius:12px;padding:10px;background:var(--paper);font:15px var(--sans);width:100%;min-height:44px;color:var(--muted);direction:ltr;text-align:left}}'''
    row = lambda a, sel=False: f'<div class="r {"sel" if sel else ""}"><img src="{img(a["works"][0])}" alt=""><div><b>{a["name"]}</b><p class="m">{a["disc"]} · {a["city"]}</p></div><span class="flag">מחכה</span></div>'
    body = f'''<div class="app"><aside class="side"><b>חדר בקרה</b>{NAV(NAVITEMS, 0)}</aside>
<section class="list"><div class="top" style="padding:0"><a>→ לאפליקציה</a></div><h1>תור</h1>
<div class="grp">אמנים · 2</div>{row(A0, True)}{row(A1)}
<div class="grp">עבודות חדשות · 14</div><div class="r"><img src="{img('irises')}" alt=""><div><b>Liat Ben-Ami</b><p class="m">6 עבודות</p></div><span class="m">חדש</span></div><div class="r"><img src="{img('the-magpie')}" alt=""><div><b>Omer Katz</b><p class="m">8 עבודות</p></div><span class="m">חדש</span></div>
<div class="grp">סיורים · 1</div><div class="r"><img src="{img('the-blue-room')}" alt=""><div><b>Rooms Left Behind</b><p class="m">Maya Lieberman</p></div><span class="flag">סיור</span></div></section>
<section class="det"><div><p class="mono">אמן/ית מחכה · נשלח לפני יומיים</p><h2>{A0['name']}</h2><p class="m">{A0['disc']} · {A0['city']}</p></div>
<p dir="ltr" style="text-align:left;max-width:60ch">{A0['st']}</p><div class="big">{''.join(f'<img src="{img(n)}" alt="">' for n in A0['works'])}</div>
<div class="note">הערה לאמן (אופציונלי)…</div><div class="bar"><button class="btn f">אשר</button><button class="btn g">בקש שינויים</button><button class="btn g">צפה בעמוד המלא</button><button class="btn t">הסתר</button></div></section></div>
<nav class="nav">{NAV(NAVITEMS, 0)}</nav>'''
    return page('C: רשימה ופירוט', css, body)

# ---------------------------------------------------------------- D: command bar / one at a time
def opt_d():
    css = '''
.top{display:flex;justify-content:space-between;align-items:center;padding:6px 16px;min-height:44px}.top a{color:var(--muted);font-size:14px}
main{padding:0 16px 120px;max-width:760px;margin:auto}
.cmd{display:flex;align-items:center;gap:10px;border:1.5px solid var(--ink);border-radius:14px;padding:0 14px;min-height:48px;background:var(--paper);color:var(--muted)}.cmd kbd{margin-inline-start:auto;font:500 11px var(--mono);border:1px solid var(--line);border-radius:6px;padding:2px 6px}
.prog{display:flex;gap:4px;padding:14px 0}.prog i{flex:1;height:4px;border-radius:2px;background:var(--line)}.prog i.d{background:var(--dot)}.prog i.n{background:var(--ink)}
.f1 h2{font:500 30px/1.1 var(--serif)}.f1{gap:12px}.big{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}.big img{width:100%;aspect-ratio:1;object-fit:cover;border-radius:8px}
.dock{position:fixed;inset:auto 0 0;padding:12px 16px calc(14px + env(safe-area-inset-bottom,0px));background:linear-gradient(transparent,var(--wall) 30%);display:grid;grid-template-columns:1fr 1fr 44px;gap:8px}
.dock .btn{min-height:52px}.menu{display:none}
.res{margin-top:10px;border:1px solid var(--line);border-radius:14px;background:var(--paper);overflow:hidden}.res div{display:flex;justify-content:space-between;padding:0 14px;min-height:44px;align-items:center;border-bottom:1px solid var(--line)}.res div:last-child{border:0}.res .on{background:var(--card)}
kbd{font:500 11px var(--mono);border:1px solid var(--line);border-radius:6px;padding:2px 6px;background:var(--wall)}
.cmdv{display:none}
@media(min-width:900px){.dock{position:static;background:none;padding:14px 0;grid-template-columns:auto auto auto 1fr;justify-content:start}.dock .btn{min-height:44px}.cmdv{display:block}.big{grid-template-columns:repeat(6,1fr)}main{padding-top:26px}}'''
    body = f'''<div class="top"><a>→ לאפליקציה</a><span class="mono">חדר בקרה</span></div><main>
<div class="cmd"><span>חיפוש או פקודה, למשל "אשר Maya"</span><kbd>⌘K</kbd></div>
<div class="cmdv"><div class="res"><div class="on"><span>אשר: Maya Lieberman</span><kbd>↵</kbd></div><div><span>עבור אל: אמנים</span><kbd>G A</kbd></div><div><span>עבור אל: תקינות</span><kbd>G H</kbd></div><div><span>תערוכת אוצרות חדשה</span><kbd>N</kbd></div></div></div>
<div class="prog"><i class="d"></i><i class="n"></i><i></i></div><p class="mono">2 מתוך 3 · אמנים מחכים</p>
<article class="card f1" style="margin-top:8px"><div><span class="flag">מחכה</span><h2>{A1['name']}</h2><p class="m">{A1['disc']} · {A1['city']} · נשלח {A1['since']}</p></div>
<p dir="ltr" style="text-align:left">{A1['st']}</p><div class="big">{''.join(f'<img src="{img(n)}" alt="">' for n in A1['works'][:6])}</div></article>
<div class="dock"><button class="btn f">אשר <kbd style="color:#222">A</kbd></button><button class="btn g">שינויים <kbd>C</kbd></button><button class="btn g" aria-label="עוד">⋯</button></div></main>'''
    return page('D: שורת פקודות', css, body)


ALL = {'a': opt_a, 'b': opt_b, 'c': opt_c, 'd': opt_d}
