"""Draws the plans and sections of the five directions as SVG (from geom.py's data). Functions return SVG strings;
`python svg_build.py` also writes them to svg/."""
import json, math, os
from geom import KIND, HERE
INK, MUTED, WARM, ACC = '#1B1A17', '#5E594F', '#B5532F', '#2F6B4F'
SKY = '#F6D675'

def load(k): return json.load(open(os.path.join(HERE, 'data', k + '.json'), encoding='utf-8'))

def numbered(d, zsel=None):
    """spaces that get a number on the plan (public halls, the app's rooms, artists' rooms, not tunnels or stairs)."""
    out = []
    for s in d['spaces']:
        if s['kind'] in ('tunnel', 'stair'): continue
        if zsel is not None and abs(s['z'] - zsel) > .01: continue
        out.append(s)
    return out

def plan(d, zsel=None, width=560, labels=True, ghost_future=True, flow=True, only_big=False):
    S = [s for s in d['spaces'] if zsel is None or abs(s['z'] - zsel) < .01]
    pts = [p for s in d['spaces'] for p in s['poly']] + [p for f in d['future'] for p in f] + [p for t in d['trees'] for p in ([t[0] - t[2], t[1] - t[2]], [t[0] + t[2], t[1] + t[2]])]
    x0, x1 = min(p[0] for p in pts) - 4, max(p[0] for p in pts) + 4; y0, y1 = min(p[1] for p in pts) - 4, max(p[1] for p in pts) + 4
    sc = width / (x1 - x0); h = (y1 - y0) * sc
    X = lambda x: (x - x0) * sc; Y = lambda y: (y1 - y) * sc
    P = lambda poly: ' '.join(f'{X(p[0]):.1f},{Y(p[1]):.1f}' for p in poly)
    o = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {h:.0f}" width="100%" style="background:#FBF8F1;border:1px solid #CFC7B6;border-radius:6px">']
    if d['water']: o.append(f'<polygon points="{P(d["water"])}" fill="#B9D0D8"/>')
    for p in d['paths']: o.append(f'<polyline points="{P(p["pts"])}" fill="none" stroke="#E2D9C3" stroke-width="{p["w"]*sc:.1f}" stroke-linecap="round" stroke-linejoin="round"/>')
    for t in d['trees']: o.append(f'<circle cx="{X(t[0]):.1f}" cy="{Y(t[1]):.1f}" r="{t[2]*sc:.1f}" fill="#A9BF98" opacity=".75"/>')
    if ghost_future:
        for f in d['future']: o.append(f'<polygon points="{P(f)}" fill="none" stroke="{MUTED}" stroke-width="1.1" stroke-dasharray="4 3" opacity=".8"/>')
    # floors then walls
    for s in S:
        fl, wl, _ = KIND[s['kind']]
        fill = fl if s['kind'] not in ('black-box',) else '#444'
        if s['role'] == 'app': o.append(f'<polygon points="{P(s["poly"])}" fill="{fill}"/><polygon points="{P(s["poly"])}" fill="{WARM}" opacity=".22"/>')
        else: o.append(f'<polygon points="{P(s["poly"])}" fill="{fill}"/>')
    for s in S:
        if not s['walls']: o.append(f'<polygon points="{P(s["poly"])}" fill="none" stroke="{MUTED}" stroke-width="1" stroke-dasharray="2 2"/>'); continue
        o.append(f'<polygon points="{P(s["poly"])}" fill="none" stroke="{INK}" stroke-width="{max(1.6, .32*sc):.1f}" stroke-linejoin="miter"/>')
    for dr in d['doors']:
        if zsel is not None and abs(dr['z'] - zsel) > .01: continue
        # find the edge the door sits on to orient the gap
        best = None
        for s in S:
            P_ = s['poly']
            for i in range(len(P_)):
                a, b = P_[i], P_[(i + 1) % len(P_)]; L = math.hypot(b[0] - a[0], b[1] - a[1])
                t = ((dr['x'] - a[0]) * (b[0] - a[0]) + (dr['y'] - a[1]) * (b[1] - a[1])) / L
                px, py = a[0] + (b[0] - a[0]) * t / L, a[1] + (b[1] - a[1]) * t / L
                dd = math.hypot(px - dr['x'], py - dr['y'])
                if dd < .4 and (best is None or dd < best[0]): best = (dd, (b[0] - a[0]) / L, (b[1] - a[1]) / L)
        if best:
            ux, uy = best[1], best[2]; w = dr['w'] / 2
            o.append(f'<line x1="{X(dr["x"]-ux*w):.1f}" y1="{Y(dr["y"]-uy*w):.1f}" x2="{X(dr["x"]+ux*w):.1f}" y2="{Y(dr["y"]+uy*w):.1f}" stroke="#FBF8F1" stroke-width="{max(2.6, .4*sc):.1f}"/>')
    if flow and d.get('flow') and zsel is None:
        f = d['flow']; o.append(f'<polyline points="{P(f)}" fill="none" stroke="{ACC}" stroke-width="2.2" stroke-dasharray="1 5" stroke-linecap="round"/>')
        a, b = f[-2], f[-1]; ang = math.degrees(math.atan2(-(b[1] - a[1]), b[0] - a[0]))
        o.append(f'<polygon points="0,-5 10,0 0,5" fill="{ACC}" transform="translate({X(b[0]):.1f},{Y(b[1]):.1f}) rotate({ang:.0f})"/>')
    if labels:
        n = 0
        for s in numbered(d, zsel):
            n += 1
            if only_big and s['role'] == 'artist': continue
            cx = sum(p[0] for p in s['poly']) / len(s['poly']); cy = sum(p[1] for p in s['poly']) / len(s['poly'])
            col = WARM if s['role'] == 'app' else (ACC if s['role'] == 'public' else INK)
            r_ = 9.5 if width >= 450 else 11; fs_ = 11.5 if width >= 450 else 13.5
            o.append(f'<circle cx="{X(cx):.1f}" cy="{Y(cy):.1f}" r="{r_}" fill="#fff" stroke="{col}" stroke-width="1.5"/><text x="{X(cx):.1f}" y="{Y(cy)+fs_*.36:.1f}" font-size="{fs_}" text-anchor="middle" fill="{col}" font-weight="700">{n}</text>')
    # north arrow + scale bar (10 m)
    o.append(f'<g transform="translate(18,22)"><polygon points="0,-12 5,4 0,1 -5,4" fill="{INK}"/><text x="0" y="16" font-size="9" text-anchor="middle" fill="{INK}">N</text></g>')
    bar = 10 * sc if x1 - x0 < 140 else 20 * sc; lab = '10 מ׳' if x1 - x0 < 140 else '20 מ׳'
    o.append(f'<g transform="translate({width-bar-14:.0f},{h-14:.0f})"><rect width="{bar:.0f}" height="4" fill="{INK}"/><text x="{bar/2:.0f}" y="-3" font-size="9" text-anchor="middle" fill="{INK}">{lab}</text></g>')
    o.append('</svg>'); return ''.join(o)

def legend(d, zsel=None):
    rows = []
    for i, s in enumerate(numbered(d, zsel), 1):
        rows.append((i, s['name'], KIND[s['kind']][2], s['role']))
    return rows

# ------------------------------------------------------------------ sections
class Sec:
    def __init__(s, x0, x1, z0, z1, width=560):
        s.x0, s.x1, s.z0, s.z1 = x0, x1, z0, z1; s.sc = width / (x1 - x0); s.w = width; s.h = (z1 - z0) * s.sc; s.o = []
    def X(s, x): return (x - s.x0) * s.sc
    def Z(s, z): return (s.z1 - z) * s.sc
    def box(s, a, b, za, zb, fill='#fff', stroke=INK, sw=1.4, op=1):
        s.o.append(f'<rect x="{s.X(a):.1f}" y="{s.Z(zb):.1f}" width="{(b-a)*s.sc:.1f}" height="{(zb-za)*s.sc:.1f}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}" opacity="{op}"/>')
    def text(s, x, z, t, size=9.5, col=INK, anchor='middle', weight=500): s.o.append(f'<text x="{s.X(x):.1f}" y="{s.Z(z):.1f}" font-size="{size}" text-anchor="{anchor}" fill="{col}" font-weight="{weight}">{t}</text>')
    def line(s, x0, z0, x1, z1, col=INK, sw=1.4, dash=None): s.o.append(f'<line x1="{s.X(x0):.1f}" y1="{s.Z(z0):.1f}" x2="{s.X(x1):.1f}" y2="{s.Z(z1):.1f}" stroke="{col}" stroke-width="{sw}"' + (f' stroke-dasharray="{dash}"' if dash else '') + '/>')
    def poly(s, pts, fill, op=1, stroke='none'): s.o.append(f'<polygon points="{" ".join(f"{s.X(a):.1f},{s.Z(b):.1f}" for a, b in pts)}" fill="{fill}" opacity="{op}" stroke="{stroke}"/>')
    def ray(s, x, z, dx, dz): s.line(x, z, x + dx, z + dz, col='#D9A31E', sw=1.6, dash='5 3')
    def person(s, x, z=0):
        s.o.append(f'<circle cx="{s.X(x):.1f}" cy="{s.Z(z+1.68):.1f}" r="{.13*s.sc:.1f}" fill="{INK}"/><line x1="{s.X(x):.1f}" y1="{s.Z(z+1.55):.1f}" x2="{s.X(x):.1f}" y2="{s.Z(z+.8):.1f}" stroke="{INK}" stroke-width="{.22*s.sc:.1f}"/><line x1="{s.X(x):.1f}" y1="{s.Z(z+.8):.1f}" x2="{s.X(x):.1f}" y2="{s.Z(z):.1f}" stroke="{INK}" stroke-width="{.25*s.sc:.1f}"/>')
    def svg(s): return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {s.w} {s.h:.0f}" width="100%" style="background:#FBF8F1;border:1px solid #CFC7B6;border-radius:6px">' + ''.join(s.o) + '</svg>'
def kf(k): return KIND[k][0]

def section_A():
    s = Sec(-8, 26, -1.2, 11.5, 560); s.box(-8, 26, -1.2, 0, '#E4DFD2', 'none', 0)
    s.box(-6, 0, 0, 4.2, kf('concrete')); s.text(-3, 2, 'חדר אמן', 8.5)
    s.box(0, 8, 0, 9, '#F6F3EC'); s.text(4, 5.2, 'הרחוב', 10, weight=700)
    s.box(8, 18, 0, 7, kf('loft')); s.text(13, 3.2, 'האולם הגדול', 10, WARM, weight=700)
    s.box(3.2, 4.8, 9, 9.3, '#fff', INK, 1.4); s.box(12.2, 13.8, 7, 7.3, '#fff', INK, 1.4)
    s.poly([(3.2, 9.3), (4.8, 9.3), (7.5, 0), (0.5, 0)], SKY, .28); s.poly([(12.2, 7.3), (13.8, 7.3), (17, 0.5), (9, 0.5)], SKY, .28)
    s.ray(4, 9.6, 0, -2); s.person(2.2); s.person(15, 0)
    s.text(-7.5, 10.5, 'חתך רוחב: דרך הרחוב', 9, MUTED, 'start'); s.text(13, 8.2, 'סקיילייט', 8.5, MUTED)
    return s.svg()

def section_B():
    s = Sec(-22, 22, -0.8, 21, 560)
    s.box(-22, 22, -0.8, 0, '#E4DFD2', 'none', 0)
    for sgn in (-1, 1):
        a, b = (8, 20) if sgn > 0 else (-20, -8)
        for z, h, col, nm in ((0, 6, 'loft', 'אולם האפליקציה'), (6.4, 4, 'japanese', 'חדר נמוך'), (10.8, 7.2, 'white-cube', 'חדר גבוה')):
            s.box(a, b, z, z + h, kf(col));
            if sgn > 0: s.text((a + b) / 2, z + h / 2 - .2, nm, 8.5)
    s.box(-8, 8, 0, 0.01, 'none', INK, 0.8)
    s.poly([(-8, 19), (8, 19), (3, 0), (-3, 0)], SKY, .22)
    for i in range(8): s.ray(-6 + i * 1.7, 19.3, 0, -3)
    s.line(-8, 19, 8, 19, INK, 1.4, '3 3'); s.text(0, 20.2, 'אוקולוס', 8.5, MUTED)
    s.poly([(-7, 0), (-5, 0), (7, 17), (5, 17)], '#D8D2C4', .9, INK)
    s.text(0, 9.5, 'חלל מרכזי ומדרגה', 10, WARM, weight=700); s.person(-2); s.person(3, 0)
    s.text(-21.5, 20, 'חתך: חלל בגובה ארבע קומות', 9, MUTED, 'start')
    return s.svg()

def section_C():
    s = Sec(-18, 62, -1.2, 11.5, 560)
    s.box(-18, 62, -1.2, 0, '#DDE3CF', 'none', 0)
    s.box(-9, 9, 0, 4.5, kf('glass-pavilion'), INK, 1.4, .9); s.text(0, 2, 'שער', 9)
    s.poly([(21, 0), (35, 0), (33, -.9), (23, -.9)], '#B9D0D8', 1); s.text(28, -.7, 'בריכה', 7.5, '#35505A')
    for x, w, h, k, nm in ((40, 9, 4, 'white-cube', ''), (52, 12, 6, 'skylit-hall', 'ביתן מרכזי'), (-14, 6, 3.6, 'japanese', '')):
        s.box(x, x + w, 0, h, kf(k)); s.text(x + w / 2, h / 2, nm, 8.5, WARM)
    for x, r in ((12, 3), (16, 2.2), (-1.5, 2.5), (37, 2.8), (50, 2.2)):
        s.o.append(f'<circle cx="{s.X(x):.1f}" cy="{s.Z(r*1.6):.1f}" r="{r*s.sc:.1f}" fill="#A9BF98" opacity=".8"/><line x1="{s.X(x):.1f}" y1="{s.Z(0):.1f}" x2="{s.X(x):.1f}" y2="{s.Z(r*1.4):.1f}" stroke="#6B5A48" stroke-width="2"/>')
    s.person(10, 0); s.person(24, 0)
    s.text(-17.5, 10.5, 'חתך: ביתנים ושביל בגן', 9, MUTED, 'start')
    return s.svg()

def section_D():
    # unrolled along the path: x is the distance walked, z the depth below the surface
    s = Sec(-2, 118, -11.5, 7, 560)
    s.box(-2, 118, -11.5, 0, '#CFC6B1', 'none', 0)
    for i in range(0, 80): s.line(-2 + i * 1.6, -11.5, -2 + i * 1.6 - 5, 0, '#BDB39B', .5)
    def room(x0, x1, zf, h, col, label, lc=INK):
        s.box(x0, x1, zf, zf + h, col); s.text((x0 + x1) / 2, zf + h / 2 - .3, label, 8.2, lc, weight=700)
    s.box(0, 8, 0, 4, kf('concrete')); s.text(4, 1.6, 'שער', 8.5)
    s.poly([(8, 0), (8, 3), (24, -2), (24, -5)], '#3A3836', 1); s.text(14, -1.8, 'מדרגות', 7.5, '#fff')
    room(24, 32, -5, 5, '#222', 'חדר השקט', '#fff')
    s.box(32, 44, -5, -2, '#3A3836'); s.text(38, -3.7, 'מעבר', 7.5, '#fff')
    room(44, 52, -5, 9, kf('concrete'), 'באר אור'); s.poly([(46, 4), (50, 4), (51, -5), (45, -5)], SKY, .35); s.line(46, 4, 50, 4, INK, 2.5)
    s.poly([(52, -5), (52, -2), (60, -5), (60, -8)], '#3A3836', 1)
    room(60, 82, -8, 8, kf('concrete'), 'האולם הגדול', WARM); s.poly([(68, -0.3), (74, -0.3), (73, -8), (69, -8)], SKY, .3)
    s.box(66, 76, -0.4, 0, '#fff', INK, 1.4)
    s.box(82, 98, -8, -5, '#3A3836'); s.text(90, -6.7, 'מעבר', 7.5, '#fff')
    s.box(98, 114, -8, 0, '#C9D6C0'); s.text(106, -3.5, 'חצר האור', 8.5, '#2F4D3A', weight=700); s.poly([(98, 0), (114, 0), (112, -8), (100, -8)], SKY, .22)
    s.line(98, 0, 98, -8, INK, 1.6); s.line(114, 0, 114, -8, INK, 1.6); s.ray(104, 6.4, 0, -3); s.ray(108, 6.4, 0, -3)
    for x in (13, 36, 46, 70, 100): s.person(x, {13: -3, 36: -5, 46: -5, 70: -8, 100: -8}[x])
    s.line(-2, 0, 118, 0, INK, 1.8); s.text(115, 1.2, 'פני הקרקע', 8, MUTED, 'end')
    s.text(-1.5, 6.2, 'חתך מקופל לאורך המסלול (אורך שהולכים), עד 8 מ׳ מתחת לקרקע', 8.5, MUTED, 'start')
    return s.svg()

def section_E():
    s = Sec(-24, 24, -0.8, 19.5, 560)
    s.box(-24, 24, -0.8, 0, '#E4DFD2', 'none', 0)
    for z in (0, 4.2, 8.4):
        for a, b in ((16, 21), (-21, -16)):
            s.box(a, b, z, z + 3.8, kf(['white-cube', 'salon', 'concrete', 'japanese', 'studio'][int(z / 4.2) + (1 if a > 0 else 0)]))
        s.line(-16, z, -14, z, INK, 2.6); s.line(14, z, 16, z, INK, 2.6)
    s.box(-24, 24, 12.6, 13, '#EEE', 'none', 0, 0)
    s.box(-8, 8, 0, 6, kf('white-cube')); s.text(0, 2.8, 'הבמה: תערוכה נשלפת', 9.5, WARM, weight=700)
    s.poly([(-16, 17), (16, 17), (8, 6.2), (-8, 6.2)], SKY, .22)
    for i in range(9): s.ray(-14 + i * 3.5, 17.4, 0, -2.5)
    s.line(-21, 12.6, 21, 12.6, INK, 1.2); s.line(-16, 17, 16, 17, INK, 1.4, '3 3'); s.text(0, 18.2, 'גג זכוכית', 8.5, MUTED)
    s.person(-12, 0); s.person(11, 0)
    s.text(-23.5, 18.8, 'חתך: מחסן פתוח, שלוש קומות תאים', 9, MUTED, 'start')
    return s.svg()

SECTIONS = dict(A=section_A, B=section_B, C=section_C, D=section_D, E=section_E)

if __name__ == '__main__':
    os.makedirs(os.path.join(HERE, 'svg'), exist_ok=True)
    for k in 'ABCDE':
        d = load(k)
        open(os.path.join(HERE, 'svg', f'{k}-plan.svg'), 'w', encoding='utf-8').write(plan(d))
        open(os.path.join(HERE, 'svg', f'{k}-section.svg'), 'w', encoding='utf-8').write(SECTIONS[k]())
    print('svg ok')
