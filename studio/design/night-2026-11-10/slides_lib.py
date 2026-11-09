"""Shared pieces of the three Hebrew slide PDFs of the night of 10.11.2026 (16:9, RTL, Chrome headless -> PDF).
Used by onboarding_artists_build.py, onboarding_artlovers_build.py, backgrounds_build.py."""
import os, subprocess, pathlib
HERE = pathlib.Path(__file__).resolve().parent
APP = HERE.parent.parent / 'app'
SHOTS = (HERE / 'slides-shots').as_uri() + '/'
DEMO = (APP / 'data' / 'demo').as_uri() + '/'
RENDERS = (HERE.parent / 'virtual-spaces' / 'renders').as_uri() + '/'
def work(n): return f'{DEMO}works/{n}.jpg'
def person(n): return f'{DEMO}people/{n}.jpg'
def shot_url(n): return f'{SHOTS}{n}.jpg'
def render(n): return f'{RENDERS}{n}.jpg'

CSS = r'''
@page { size: 1280px 720px; margin: 0; }
:root { --navy:#1F2A44; --terra:#C4432E; --peach:#F5C9B8; --sun:#F2B94B; --paper:#F6F1E7; --ink:#1B1A17; --mint:#CFE9DA; --lav:#D9D0F2; --muted:#5E594F; --line:#D9D0BD; }
* { box-sizing:border-box; } html,body { margin:0; }
body { font:400 22px/1.5 Heebo, Arial, sans-serif; color:var(--ink); background:#fff; }
.s { width:1280px; height:720px; position:relative; overflow:hidden; page-break-after:always; background:var(--paper); padding:56px 72px; }
.s:last-child { page-break-after:auto; }
.s h1 { font:700 74px/1.04 'Frank Ruhl Libre',serif; margin:0 0 18px; }
.s h2 { font:700 46px/1.1 'Frank Ruhl Libre',serif; margin:0 0 14px; }
.s h3 { font:700 24px/1.25 Heebo; margin:0 0 6px; }
.s p { margin:0 0 12px; } .lede { font-size:26px; line-height:1.45; }
.kick { font:700 17px Heebo; letter-spacing:.06em; color:var(--terra); margin-bottom:10px; }
.num { position:absolute; bottom:22px; inset-inline-start:40px; font:500 15px Heebo; opacity:.55; }
.brandtag { position:absolute; bottom:22px; inset-inline-end:40px; font:500 15px Heebo; opacity:.55; direction:ltr; }
.row { display:flex; gap:28px; align-items:flex-start; } .col { flex:1; min-width:0; }
.g2 { display:grid; grid-template-columns:1fr 1fr; gap:28px; } .g3 { display:grid; grid-template-columns:repeat(3,1fr); gap:24px; } .g4 { display:grid; grid-template-columns:repeat(4,1fr); gap:20px; }
.card { background:#fff; border-radius:22px; padding:22px 26px; border:1px solid var(--line); }
.card.c-navy { background:var(--navy); color:#F6F1E7; border:0; } .card.c-terra { background:var(--terra); color:#fff; border:0; }
.card.c-sun { background:var(--sun); border:0; } .card.c-peach { background:var(--peach); border:0; } .card.c-mint { background:var(--mint); border:0; } .card.c-lav { background:var(--lav); border:0; }
.card h3 { margin-top:0; } .small { font-size:19px; line-height:1.45; } .muted { color:var(--muted); }
ul.l { margin:0 0 10px; padding-inline-start:26px; } ul.l li { margin-bottom:6px; }
.pill { display:inline-block; padding:3px 14px; border-radius:99px; font:700 15px Heebo; background:var(--navy); color:#fff; margin-inline-end:8px; }
.pill.new { background:var(--terra); } .pill.have { background:#2F6B4F; } .pill.soon { background:#8A6B1E; }
.pro { color:#2F6B4F; font-weight:700; } .con { color:var(--terra); font-weight:700; }
.note { border-inline-start:6px solid var(--terra); background:#fff; padding:10px 18px; border-radius:6px 14px 14px 6px; font-size:18px; margin-top:14px; }
.en { direction:ltr; unicode-bidi:isolate; display:inline-block; }
table { width:100%; border-collapse:collapse; font-size:18px; background:#fff; border-radius:12px; overflow:hidden; }
td,th { padding:9px 14px; border-bottom:1px solid var(--line); text-align:start; vertical-align:top; } th { background:#EAE2D0; }
code { font:500 .82em ui-monospace, Consolas, monospace; direction:ltr; unicode-bidi:isolate; background:rgba(0,0,0,.06); padding:1px 6px; border-radius:5px; }
/* a phone showing something real, or a drawn screen */
.phone { background:#111; border-radius:34px; padding:7px; display:inline-block; box-shadow:0 14px 34px rgba(30,25,15,.28); flex:none; }
.phone .in { border-radius:28px; overflow:hidden; background:#fff; position:relative; }
.phone img.shot { width:100%; height:100%; object-fit:cover; display:block; }
.phone .scr { transform-origin:0 0; width:390px; height:844px; position:absolute; top:0; left:0; direction:ltr; text-align:left; }
.cap { font:500 16px Heebo; text-align:center; margin-top:10px; color:inherit; opacity:.85; max-width:100%; }
.dark-s { background:var(--navy); color:#F6F1E7; } .terra-s { background:var(--terra); color:#fff; } .sun-s { background:var(--sun); } .peach-s { background:var(--peach); } .mint-s { background:var(--mint); } .lav-s { background:linear-gradient(135deg,#D9D0F2,#F9DCCB 60%,#D5EEDF); }
.dark-s .kick, .terra-s .kick { color:var(--sun); } .terra-s .kick { color:#FFE3C2; }
.step { display:flex; gap:14px; align-items:flex-start; margin-bottom:14px; }
.step .n { flex:none; width:42px; height:42px; border-radius:50%; background:var(--navy); color:#fff; display:grid; place-items:center; font:700 20px Heebo; }
.flow { display:flex; align-items:stretch; gap:10px; } .flow .b { flex:1; background:#fff; border:2px solid var(--navy); border-radius:16px; padding:12px 14px; font-size:17px; line-height:1.35; text-align:center; }
.flow .b.new { background:var(--sun); border-color:var(--ink); } .flow .ar { align-self:center; font-size:30px; color:var(--terra); }
.swatch { height:70px; border-radius:14px; border:1px solid rgba(0,0,0,.18); }
.hand { font-family:'Waiting for the Sunrise', 'Segoe Script', cursive; }
/* ===== drawn onboarding screens: one structure, four looks (390x844, English: the app is English) ===== */
.m { font-family:'IBM Plex Sans', Arial, sans-serif; width:390px; height:844px; position:relative; overflow:hidden; display:flex; flex-direction:column; padding:54px 26px 30px; color:#1B1A17; }
.m .top { display:flex; align-items:center; gap:8px; font:600 15px 'IBM Plex Sans'; } .m .top .lg { width:22px; height:26px; border-radius:11px 11px 3px 3px; background:var(--navy); } .m .skip { margin-inline-start:auto; font-weight:500; opacity:.7; }
.m .art { flex:1; display:grid; place-items:center; min-height:0; margin:14px 0; position:relative; }
.m h1, .m h2 { font:600 38px/1.05 'Fraunces', Georgia, serif; margin:0 0 10px; letter-spacing:-.01em; } .m .k { font:600 12px 'IBM Plex Sans'; letter-spacing:.12em; text-transform:uppercase; margin-bottom:8px; }
.m p { font-size:16px; line-height:1.45; margin:0 0 14px; } .m .foot { display:flex; align-items:center; justify-content:space-between; }
.m .dots { display:flex; gap:7px; } .m .dots i { width:8px; height:8px; border-radius:50%; background:currentColor; opacity:.28; } .m .dots i.on { opacity:1; width:22px; border-radius:8px; }
.m button { font:600 16px 'IBM Plex Sans'; border:0; border-radius:99px; padding:13px 26px; min-height:46px; }
.m ul.ck { list-style:none; margin:0 0 14px; padding:0; display:grid; gap:9px; } .m ul.ck li { display:flex; align-items:center; gap:12px; padding:12px 14px; border-radius:14px; font-size:15px; font-weight:500; } .m ul.ck .c { width:24px; height:24px; border-radius:50%; border:2px solid currentColor; flex:none; display:grid; place-items:center; font-size:14px; } .m ul.ck li.d .c { background:currentColor; } .m ul.ck li.d .c b { color:#fff; font-weight:700; } .m ul.ck img { width:44px; height:44px; border-radius:10px; object-fit:cover; flex:none; } .m ul.ck small { display:block; font-weight:400; opacity:.75; font-size:12px; }
.m .faces { display:grid; grid-template-columns:repeat(3,1fr); gap:14px 10px; width:100%; } .m .faces div { text-align:center; font-size:12px; font-weight:500; } .m .faces img { width:78px; height:78px; border-radius:50%; object-fit:cover; display:block; margin:0 auto 5px; } .m .faces .sel img { outline:4px solid var(--terra); outline-offset:2px; }
/* A: paper and pencil */
.d-a { background:#F6F1E7; } .d-a .k { color:var(--terra); font-family:'Waiting for the Sunrise',cursive; font-size:22px; letter-spacing:0; text-transform:none; font-weight:400; }
.d-a .art img.pic { width:84%; max-height:100%; object-fit:cover; box-shadow:0 8px 20px rgba(60,40,10,.25); transform:rotate(-1.6deg); border:10px solid #fff; } .d-a .art svg.pen { position:absolute; inset:0; width:100%; height:100%; }
.d-a button { background:var(--navy); color:#fff; } .d-a ul.ck li { background:#fff; border:1px solid #D9D0BD; }
/* B: arches and colour blocks */
.d-b.c1 { background:var(--navy); color:#F6F1E7; } .d-b.c2 { background:var(--terra); color:#fff; } .d-b.c3 { background:var(--sun); } .d-b .k { opacity:.8; }
.d-b .art .arch { width:72%; height:100%; border-radius:999px 999px 0 0; overflow:hidden; background:var(--peach); } .d-b .art .arch img { width:100%; height:100%; object-fit:cover; }
.d-b button { background:var(--peach); color:var(--ink); } .d-b.c3 button { background:var(--navy); color:#fff; } .d-b ul.ck li { background:rgba(255,255,255,.55); }
.d-b.c1 .faces .sel img, .d-b.c2 .faces .sel img { outline-color:var(--sun); }
/* C: daylight, the sky of Home */
.d-c { background:linear-gradient(165deg,#D9D0F2 0%,#F9DCCB 55%,#D5EEDF 100%); } .d-c h1, .d-c h2 { font-weight:500; } .d-c .art .st { position:absolute; border-radius:50%; overflow:hidden; box-shadow:0 0 0 5px rgba(255,255,255,.6),0 0 30px rgba(255,255,255,.9); } .d-c .art .st img { width:100%; height:100%; object-fit:cover; display:block; } .d-c .art svg { position:absolute; inset:0; width:100%; height:100%; }
.d-c button { background:#fff; color:var(--ink); box-shadow:0 4px 14px rgba(80,60,120,.18); } .d-c ul.ck li { background:rgba(255,255,255,.62); } .d-c .k { color:#5B49A6; } .d-c .faces .sel img { outline-color:#6A55B8; }
/* D: gallery wall */
.d-d.c1 { background:#DCE3D5; } .d-d.c2 { background:#D8B8A2; } .d-d.c3 { background:#6E2A2F; color:#F6F1E7; }
.d-d .art { align-items:start; } .d-d .art img.pic { max-width:100%; max-height:100%; box-shadow:0 10px 24px rgba(0,0,0,.28); border:6px solid #fff; outline:1px solid rgba(0,0,0,.1); }
.d-d button { background:#1B1A17; color:#fff; } .d-d.c3 button { background:#F6F1E7; color:#1B1A17; } .d-d .tx { background:rgba(255,255,255,.88); color:#1B1A17; padding:14px 16px 4px; border-radius:4px; margin-bottom:14px; } .d-d ul.ck li { background:#fff; }
'''

def slide(inner, cls='', n=None, foot=''):
    num = f'<span class="num">{n}</span>' if n else ''
    return f'<section class="s {cls}">{inner}{num}{foot}</section>'

def phone(inner, w=200, h=None, raw=False):
    """a phone w px wide showing drawn HTML (390x844) or, with raw, anything already sized."""
    h = h or round(w * 844 / 390)
    z = w / 390
    body = inner if raw else f'<div class="scr" style="transform:scale({z})">{inner}</div>'
    return f'<div class="phone"><div class="in" style="width:{w}px;height:{h}px">{body}</div></div>'

def shot(name, w=200, cap=''):
    h = round(w * 844 / 390)
    c = f'<div class="cap">{cap}</div>' if cap else ''
    return f'<div style="text-align:center;flex:none;width:{w+14}px"><div class="phone"><div class="in" style="width:{w}px;height:{h}px"><img class="shot" src="{shot_url(name)}"></div></div>{c}</div>'

def drawn(inner, w=200, cap=''):
    c = f'<div class="cap">{cap}</div>' if cap else ''
    return f'<div style="text-align:center;flex:none;width:{w+14}px">{phone(inner, w)}{c}</div>'

def write_pdf(name, title, slides, extra_css=''):
    html = f'''<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8"><title>{title}</title>
<link href="https://fonts.googleapis.com/css2?family=Frank+Ruhl+Libre:wght@400;700;900&family=Heebo:wght@400;500;700&family=Fraunces:opsz,wght@9..144,400;9..144,600&family=IBM+Plex+Sans:wght@400;500;600&family=Waiting+for+the+Sunrise&display=swap" rel="stylesheet">
<style>{CSS}{extra_css}</style></head><body>{"".join(slides)}</body></html>'''
    (HERE / f'{name}.html').write_text(html, encoding='utf-8')
    out = HERE / f'{name}.pdf'
    chrome = next(p for p in (r'C:\Program Files\Google\Chrome\Application\chrome.exe', r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe') if os.path.exists(p))
    subprocess.run([chrome, '--headless=new', '--disable-gpu', '--no-pdf-header-footer', '--allow-file-access-from-files', '--run-all-compositor-stages-before-draw', '--virtual-time-budget=20000', f'--print-to-pdf={out}', (HERE / f'{name}.html').as_uri()], check=True, timeout=170)
    print(out, out.stat().st_size // 1024, 'KB')

# ---------------------------------------------------------------- four looks of the same three onboarding screens
PEN = '<svg class="pen" viewBox="0 0 300 300" fill="none" stroke="#C4432E" stroke-width="3" stroke-linecap="round"><path d="M22 262c60-9 150-12 250-2"/><path d="M30 252c70-6 130-8 232-2" opacity=".5"/><ellipse cx="150" cy="140" rx="132" ry="118" transform="rotate(-6 150 140)" opacity=".0"/></svg>'

def _top(): return '<div class="top"><span class="lg"></span>Open Studio<span class="skip">Skip</span></div>'
def _dots(i): return '<div class="dots">' + ''.join(f'<i class="{"on" if j == i else ""}"></i>' for j in range(3)) + '</div>'

def look(d, c, kind, k, title, text, img=None, items=None, faces=None, cta='Next', step=0, stars=None):
    """d: a|b|c|d (the look), c: 1|2|3 (colour block), kind: pic|list|faces"""
    if kind == 'pic':
        if d == 'b': art = f'<div class="arch"><img src="{img}"></div>'
        elif d == 'c':
            art = '<svg viewBox="0 0 300 300"><path d="M70 90 L190 60 L230 190 L110 230 Z" fill="none" stroke="#6A55B8" stroke-width="1.6" stroke-dasharray="3 5" opacity=".8"/></svg>' + ''.join(f'<div class="st" style="left:{x}px;top:{y}px;width:{s}px;height:{s}px"><img src="{u}"></div>' for x, y, s, u in stars)
        elif d == 'a': art = f'<img class="pic" src="{img}">{PEN}'
        else: art = f'<img class="pic" src="{img}">'
        body = f'<div class="art">{art}</div><div class="tx"><div class="k">{k}</div><h1>{title}</h1><p>{text}</p></div>'
    elif kind == 'list':
        li = ''.join(f'<li class="{"d" if dn else ""}"><span class="c">{"<b>✓</b>" if dn else ""}</span><span>{t}{f"<small>{s}</small>" if s else ""}</span></li>' for t, s, dn in items)
        body = f'<div style="flex:1"></div><div class="tx"><div class="k">{k}</div><h2>{title}</h2><p>{text}</p></div><ul class="ck">{li}</ul>'
    elif kind == 'rows':
        li = ''.join(f'<li><img src="{u}"><span>{t}<small>{s}</small></span></li>' for t, s, u in items)
        body = f'<div style="flex:1"></div><div class="tx"><div class="k">{k}</div><h2>{title}</h2><p>{text}</p></div><ul class="ck">{li}</ul>'
    else:
        fc = ''.join(f'<div class="{"sel" if sel else ""}"><img src="{u}">{n}</div>' for n, u, sel in faces)
        body = f'<div class="art"><div class="faces">{fc}</div></div><div class="tx"><div class="k">{k}</div><h2>{title}</h2><p>{text}</p></div>'
    return f'<div class="m d-{d} c{c}">{_top()}{body}<div class="foot">{_dots(step)}<button>{cta}</button></div></div>'
