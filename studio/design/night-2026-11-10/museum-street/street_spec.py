"""Specs of the five in-between-space concepts (one source for the 3D views and the SVG plans) and the view renderer.
    python street_spec.py [1 2 3 4 5 6]      -> renders/c<N>.jpg (+ c<N>b.jpg second view) through headless Chrome (three.js from a CDN)
Units: metres. x along the street (entry x=0), z across (+z = walker's right), y up. Eye height 1.6 like the app (space.js EYE)."""
import json, os, sys, pathlib, subprocess, math
HERE = pathlib.Path(__file__).resolve().parent
REN = HERE / 'renders'
L = 60
PAL = ['#E8412C', '#F2A900', '#1F5FBF', '#0F9D8A', '#D6479A', '#7B4BC4', '#8CC63F', '#FF7A3D']
WARM, COOL = '#FFF1D6', '#E9F2FF'

def room_mats():
    return dict(rwall=dict(stops=[[0, '#F4EEE2']], diff=.3, emis=.66), rfloor=dict(stops=[[0, '#B88A5C']], diff=.4, emis=.38, pat=4, patS=1.3),
                rceil=dict(stops=[[0, '#FFF6E5']], emis=.95, diff=0))

def base(width, height, **kw):
    s = dict(L=L, width=width, height=height, px=[1400, 800], amb='#FFF3E2', ambI=.32, fog=dict(c='#E9E0D0', d=.006), glow=0.52,
             cam=dict(x=1.2, y=1.6, z=.7, fov=66, tx=L, ty=1.75, tz=-.2), rooms=[], lights=[], mat={}, art=[], people=[], frames=[], panels=[])
    s['mat'].update(room_mats()); s.update(kw); return s

def street_lights(xs, y, col='#FFF1D6', I=1.0, R=9):
    return [dict(x=x, y=y, z=0, col=col, I=I, R=R) for x in xs]

ROOMS_X = [(-1, 10), (1, 17), (-1, 26), (1, 33), (-1, 42), (1, 49), (-1, 57)]   # the exhibition doors, staggered left/right

def ppl(*items): return [dict(x=x, z=z, c=c, ry=ry, s=s) for x, z, c, ry, s in items]

# ------------------------------------------------------------------ 1. colour-field thresholds
def c1():
    W, H = 8, 6
    s = base([[0, W]], [[0, H]], ambI=.16)
    s['mat'].update(wall=dict(stops=[[0, '#EFE8DA']], diff=.95, emis=.12), floor=dict(stops=[[0, '#C9C0B0']], diff=.9, emis=.05, spec=.5, shin=40, refl=.22, rh=H, rstops=[[0, '#FFF4E0']]),
                    ceil=dict(stops=[[0, '#FBF4E6']], emis=.7, diff=0), pan=dict(stops=[[0, '#FFFFFF']], emis=2.4, diff=0))
    s['panels'] = [dict(x=x, z=0, l=3.2, w=1.2, m=s['mat']['pan']) for x in range(6, L, 8)]
    s['lights'] = street_lights([6, 20, 34, 48], H - .3, I=.9, R=7)
    for i, (sd, x) in enumerate(ROOMS_X[:6]):
        c = PAL[[0, 2, 1, 4, 3, 5][i]]
        cm = dict(stops=[[0, c]], diff=.9, emis=.5, spec=.25, shin=30)
        cf = dict(stops=[[0, c]], diff=.7, emis=.5, spec=.5, shin=30, refl=.5, rh=3.8, rstops=[[0, c]])
        s['rooms'].append(dict(x=x, side=sd, w=4.6, h=3.8, cd=3.4, iw=3.0, ih=3.3, cm=cm, cmFloor=cf, cmCeil=dict(stops=[[0, c]], emis=1.0, diff=0), seed=i, col=c))
        s['lights'].append(dict(x=x, y=3.2, z=sd * (W / 2 + .3), col=c, I=2.4, R=6))
    s['art'] = [dict(x=13.5, side=-1, w=2.6, h=1.8, seed=3), dict(x=21.5, side=1, w=3.2, h=2.1, seed=5), dict(x=30, side=-1, w=2.4, h=3.0, seed=1), dict(x=37.5, side=1, w=2.8, h=1.9, seed=2), dict(x=46, side=-1, w=3.4, h=2.2, seed=4)]
    s['people'] = ppl((9, 1.8, '#2D4A6B', .5, 1), (13, -2, '#8A2F2F', 2.8, 1), (20, 0.4, '#E9E0D0', 1.6, .96), (29, -1.5, '#244C3A', 3.4, 1))
    s['cam'].update(x=1.0, z=1.0, tz=-.4)
    return s

# ------------------------------------------------------------------ 2. spectrum street
SPEC = ['#E8412C', '#FF7A3D', '#F2A900', '#C9D43A', '#4FB86A', '#0F9D8A', '#1F5FBF', '#7B4BC4', '#D6479A']
def c2():
    W, H = 8, 6
    st = [[i * (L / (len(SPEC) - 1)), c] for i, c in enumerate(SPEC)]
    s = base([[0, W]], [[0, H]], ambI=.2)
    s['mat'].update(wall=dict(stops=st, soft=5.5, diff=.9, emis=.52), floor=dict(stops=[[0, '#2A2630']], diff=.5, emis=.02, spec=.7, shin=60, refl=.9, rh=H, rstops=[[x, c] for x, c in st]),
                    ceil=dict(stops=st, soft=5.5, emis=1.5, diff=0), endwall=dict(stops=[[0, SPEC[-1]]], emis=1.3))
    s['lights'] = [dict(x=x, y=H - .4, z=0, col=SPEC[min(8, round(x / L * 8))], I=1.5, R=10) for x in (8, 18, 28, 38, 48, 58)]
    for i, (sd, x) in enumerate(ROOMS_X):
        s['rooms'].append(dict(x=x, side=sd, w=3.6, h=3.8, cd=0, seed=i, arch=False, col=SPEC[min(8, round(x / L * 8))]))
    s['art'] = [dict(x=13.5, side=-1, w=2.2, h=1.6, seed=3), dict(x=21.5, side=1, w=3.0, h=2.0, seed=5), dict(x=30, side=-1, w=2.4, h=3.0, seed=1), dict(x=37.5, side=1, w=2.8, h=1.9, seed=2), dict(x=46, side=-1, w=3.0, h=2.0, seed=4)]
    s['people'] = ppl((9, 1.8, '#EDE6D8', .5, 1), (14, -2, '#EDE6D8', 2.8, 1), (23, 0.6, '#222222', 1.6, .96), (32, -1.5, '#EDE6D8', 3.4, 1))
    s['glow'] = 1.05; s['fog'] = dict(c='#2A2630', d=.0025)
    return s

# ------------------------------------------------------------------ 3. the breathing axis (narrow/wide)
W3 = [[0, 5], [8, 5], [12, 3.2], [20, 3.2], [24, 12], [38, 12], [42, 3.2], [50, 3.2], [54, 11], [60, 11]]
H3 = [[0, 4.6], [8, 4.6], [12, 3.0], [20, 3.0], [24, 8], [38, 8], [42, 3.0], [50, 3.0], [54, 7.5], [60, 7.5]]
def c3():
    s = base(W3, H3, ambI=.28, glow=.62)
    narrow = [[0, '#B5532F'], [11, '#B5532F'], [13, '#B5532F'], [22, '#F1E7D6'], [40, '#B5532F'], [44, '#B5532F'], [52, '#F1E7D6']]
    # colour: warm terracotta in the passes, pale in the plazas (blended over 2.5 m)
    ws = [[0, '#C9622F'], [10.5, '#F1E7D6'], [21.5, '#F1E7D6'], [21.6, '#F1E7D6']]
    stops = [[0, '#C9622F'], [10.5, '#C9622F'], [14, '#C9622F'], [21, '#C9622F'], [26, '#F1E7D6'], [37, '#F1E7D6'], [41, '#D6479A'], [49.5, '#D6479A'], [54, '#F1E7D6']]
    s['mat'].update(wall=dict(stops=stops, soft=1.6, diff=.9, emis=.2), floor=dict(stops=[[0, '#6E3B2A'], [22, '#D8D0C0'], [40, '#6B2A4A'], [52, '#D8D0C0']], soft=1.5, diff=.9, emis=.05, spec=.4, shin=40, refl=.3, rh=8, rstops=[[0, '#E9A25A'], [22, '#FFF4E0'], [40, '#FF7FB5'], [52, '#FFF4E0']]),
                    ceil=dict(stops=[[0, '#F2B26B'], [22, '#FFF8EA'], [40, '#FF7FB5'], [52, '#FFF8EA']], soft=1.5, emis=1.1, diff=0), pan=dict(stops=[[0, '#FFFFFF']], emis=2.2, diff=0))
    s['lights'] = [dict(x=5, y=4, z=0, col='#FFC688', I=1.2, R=8), dict(x=16, y=2.6, z=0, col='#FFAE6B', I=1.5, R=6), dict(x=31, y=7.4, z=0, col='#FFF1D6', I=1.5, R=14),
                   dict(x=46, y=2.6, z=0, col='#FF7FB5', I=1.6, R=6), dict(x=57, y=7, z=0, col='#FFF1D6', I=1.4, R=12), dict(x=27, y=3, z=-5, col='#FFF1D6', I=.6, R=8)]
    # rooms open off the plazas (x 24..38 and 54..60)
    c = PAL
    def rm(sd, x, k, col):
        return dict(x=x, side=sd, w=4.2, h=4.0, cd=2.2, iw=3.2, ih=3.6, rw=6, seed=k, cm=dict(stops=[[0, col]], diff=.8, emis=.7), cmFloor=dict(stops=[[0, col]], diff=.7, emis=.4, spec=.4, shin=30, refl=.4, rh=4, rstops=[[0, col]]), cmCeil=dict(stops=[[0, col]], emis=1.1, diff=0), col=col, arch=True, rise=1.5, irise=1.4)
    s['rooms'] = [rm(-1, 28.5, 0, c[1]), rm(1, 29.5, 1, c[3]), rm(-1, 35, 2, c[4]), rm(1, 36, 3, c[2])]
    for r in s['rooms']: s['lights'].append(dict(x=r['x'], y=3.3, z=r['side'] * (6 + 1.1), col=r['col'], I=1.7, R=4.5))
    s['lights'] = s['lights'][:16]
    s['art'] = [dict(x=2.5, side=-1, w=1.6, h=2.2, seed=3, y=1.8), dict(x=15.5, side=1, w=1.0, h=1.4, seed=1), dict(x=31.5, side=-1, w=1.8, h=1.3, seed=5, y=1.9), dict(x=32.5, side=1, w=2.0, h=1.4, seed=2), dict(x=40, side=-1, w=2.2, h=2.6, seed=4, y=1.9)]
    s['panels'] = [dict(x=x, z=z, l=4, w=1.0, m=s['mat']['pan']) for x in (28, 32, 36) for z in (-3.5, 3.5)]
    s['people'] = ppl((6, 1.2, '#2D4A6B', .4, 1), (17, -.5, '#E9E0D0', 3.3, 1), (27, 2, '#8A2F2F', 1.6, 1), (30, -2.5, '#244C3A', 3.4, 1), (34, 3, '#E9E0D0', 2.0, .98))
    s['cam'].update(x=1.0, z=.4, tz=0)
    s['fog'] = dict(c='#E9D5BC', d=.006); s['amb'] = '#FFE9CC'
    return s

# ------------------------------------------------------------------ 4. arches
ARCH = ['#E8412C', '#F2A900', '#0F9D8A', '#1F5FBF', '#D6479A', '#7B4BC4', '#FF7A3D']
def c4():
    W, H = 8, 6.4
    s = base([[0, W]], [[0, H]], ambI=.36)
    s['mat'].update(wall=dict(stops=[[0, '#F2E9DA']], diff=.95, emis=.14), floor=dict(stops=[[0, '#D9CFBE']], diff=.9, emis=.05, spec=.5, shin=40, refl=.4, rh=H, rstops=[[0, '#FFF4E0']]),
                    ceil=dict(stops=[[0, '#FBF4E6']], emis=1.0, diff=0), pan=dict(stops=[[0, '#FFFFFF']], emis=2.2, diff=0))
    xs = [8, 16, 24, 32, 40, 48, 56]
    for i, x in enumerate(xs):
        c = ARCH[i]
        s['frames'].append(dict(x=x, t=.9, hw=2.2, hh=4.4, rise=2.2, m=dict(stops=[[0, c]], diff=.8, emis=.5), ms=dict(stops=[[0, c]], diff=.7, emis=.78)))
        s['lights'].append(dict(x=x + 4, y=H - .5, z=0, col=c, I=1.6, R=6.5))
    s['lights'] += street_lights([3, 20, 44], H - .3, I=.7, R=9)
    for i, (sd, x) in enumerate(ROOMS_X[:6]):
        c = ARCH[(i + 3) % 7]
        s['rooms'].append(dict(x=x + 4 * (1 if i % 2 else 0) - 1 * (0 if i % 2 else 0), side=sd, w=3.4, h=4.0, cd=1.2, iw=3.0, ih=3.7, arch=True, rise=1.7, irise=1.5, seed=i, col=c,
                               cm=dict(stops=[[0, c]], diff=.8, emis=.62), cmFloor=dict(stops=[[0, c]], diff=.7, emis=.35), cmCeil=dict(stops=[[0, c]], emis=.9, diff=0)))
    s['rooms'][:] = [dict(r, x=x) for r, x in zip(s['rooms'], [12, 20, 28, 36, 44, 52])]
    s['panels'] = [dict(x=x, z=0, l=3, w=1.0, m=s['mat']['pan']) for x in (4, 12, 20, 28, 36, 44, 52)]
    s['art'] = [dict(x=18, side=-1, w=2.2, h=1.6, seed=3, y=1.9), dict(x=26, side=1, w=2.6, h=1.8, seed=5, y=1.9), dict(x=34, side=-1, w=2.2, h=3.0, seed=1, y=2.2), dict(x=42, side=1, w=2.4, h=1.7, seed=2, y=1.9)]
    s['people'] = ppl((6, 1.6, '#2D4A6B', .5, 1), (13.5, -1.4, '#8A2F2F', 2.8, 1), (21, 0.4, '#E9E0D0', 1.6, .96), (30, -1.2, '#244C3A', 3.4, 1))
    s['cam'].update(x=1.0, z=.4, y=1.6, tz=0, ty=2.0, fov=62)
    return s

# ------------------------------------------------------------------ 5. luminous ceilings + floors per zone
ZONE_C = ['#FF5FA2', '#FFB02E', '#3FD0C9', '#6C7CFF']
def c5():
    W, H = 8, 5.4
    zx = [0, 15, 30, 45]
    s = base([[0, W]], [[0, H]], ambI=.16)
    cst = [[x, c] for x, c in zip(zx, ZONE_C)]
    floors = ['#C8B8A6', '#2E7D5B', '#8A8F98', '#B03A48']
    s['mat'].update(wall=dict(stops=[[0, '#F2ECE0']], diff=1.0, emis=.04), floor=dict(stops=[[x, c] for x, c in zip(zx, floors)], soft=.15, diff=.95, emis=.1, spec=.35, shin=30, refl=.35, rh=H, rstops=[[x, c] for x, c in zip(zx, ZONE_C)], pat=1, patS=.35, patC='#FFFFFF'),
                    ceil=dict(stops=cst, soft=.5, emis=1.6, diff=0), endwall=dict(stops=[[0, '#F2ECE0']], emis=.6))
    s['lights'] = []
    for i, c in enumerate(ZONE_C):
        for dx in (3, 7.5, 12):
            s['lights'].append(dict(x=zx[i] + dx, y=H - .4, z=0, col=c, I=1.35, R=6.5))
    s['lights'] = s['lights'][:16]
    for i, (sd, x) in enumerate(ROOMS_X[:6]):
        s['rooms'].append(dict(x=x, side=sd, w=3.6, h=3.8, cd=0, seed=i))
    s['art'] = [dict(x=13.5, side=-1, w=2.2, h=1.6, seed=3), dict(x=21.5, side=1, w=3.0, h=2.0, seed=5), dict(x=30, side=-1, w=2.4, h=3.0, seed=1), dict(x=37.5, side=1, w=2.8, h=1.9, seed=2), dict(x=46, side=-1, w=3.0, h=2.0, seed=4)]
    s['people'] = ppl((8, 1.8, '#2D4A6B', .5, 1), (13, -2, '#8A2F2F', 2.8, 1), (21, 0.4, '#E9E0D0', 1.6, .96), (33, -1.5, '#244C3A', 3.4, 1))
    s['fog'] = dict(c='#A59DB8', d=.005); s['glow'] = 1.0; s['amb'] = '#F4E8FF'
    return s

# ------------------------------------------------------------------ 6. the recommended composition (spectrum backbone + colour-field thresholds)
def c6():
    s = c1()
    W, H = 8, 6
    st = [[i * (L / (len(SPEC) - 1)), c] for i, c in enumerate(SPEC)]
    s['mat']['wall'] = dict(stops=[[0, '#F0E9DC']], diff=.95, emis=.1)
    s['mat']['floor'] = dict(stops=[[0, '#6E6A6C']], diff=.8, emis=.04, spec=.6, shin=50, refl=.8, rh=H, rstops=[[x, c] for x, c in st])
    s['mat']['ceil'] = dict(stops=[[x, c] for x, c in st], soft=6, emis=1.35, diff=0)
    s['panels'] = []
    s['fog'] = dict(c='#3A2F3A', d=.004); s['ambI'] = .2
    cols = [SPEC[min(8, round(r['x'] / L * 8))] for r in s['rooms']]
    # thresholds complementary to the street colour at their station, so they pop
    comp = {'#E8412C': '#0F9D8A', '#FF7A3D': '#1F5FBF', '#F2A900': '#7B4BC4', '#C9D43A': '#D6479A', '#4FB86A': '#D6479A', '#0F9D8A': '#E8412C', '#1F5FBF': '#F2A900', '#7B4BC4': '#F2A900', '#D6479A': '#C9D43A'}
    for r, c in zip(s['rooms'], cols):
        c2_ = comp[c]
        r['cm'] = dict(stops=[[0, c2_]], diff=.7, emis=.9, spec=.25, shin=30); r['cmFloor'] = dict(stops=[[0, c2_]], diff=.7, emis=.55, spec=.5, shin=30, refl=.5, rh=3.8, rstops=[[0, c2_]]); r['cmCeil'] = dict(stops=[[0, c2_]], emis=1.3, diff=0)
    s['lights'] = [dict(x=x, y=H - .4, z=0, col=SPEC[min(8, round(x / L * 8))], I=1.5, R=9) for x in (6, 20, 34, 48)]
    for r in s['rooms']:
        s['lights'].append(dict(x=r['x'], y=3.4, z=r['side'] * (W / 2 + 1.7), col=r['cm']['stops'][0][1], I=2.6, R=4.8))
    return s

CONCEPTS = {1: c1, 2: c2, 3: c3, 4: c4, 5: c5, 6: c6}
def second_view(n, s):
    s = json.loads(json.dumps(s))
    if n in (3,): s['cam'].update(x=17.5, z=-.2, y=1.6, tx=L, ty=2.6, tz=.5, fov=72)   # standing in the narrow, looking into the plaza
    else: s['cam'].update(x=34, z=-1.5, y=1.6, tx=0.5, ty=1.9, tz=.5, fov=64)           # turning back: the street from the middle, toward the entry
    cx = s['cam']['x']; fwd = s['cam']['tx'] > cx
    s['people'] = [q for q in s['people'] if not ((cx - 1 < q['x'] < cx + 6) if fwd else (cx - 6 < q['x'] < cx + 1))]
    return s

CHROME = next(p for p in (r'C:\Program Files\Google\Chrome\Application\chrome.exe', r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe') if os.path.exists(p))
def render(name, spec):
    html = ('<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;background:#000}canvas{display:block}</style>'
            '<script type="importmap">{"imports":{"three":"https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js"}}</script>'
            f'<script>window.SPEC={json.dumps(spec)}</script></head><body><script type="module">{(HERE / "street3d.js").read_text(encoding="utf-8")}</script></body></html>')
    f = HERE / 'renders' / f'_{name}.html'; f.write_text(html, encoding='utf-8')
    png = REN / f'{name}.png'
    w, h = spec['px']
    subprocess.run([CHROME, '--headless=new', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', f'--window-size={w},{h}', '--hide-scrollbars', '--virtual-time-budget=25000', f'--screenshot={png}', f.as_uri()], capture_output=True, timeout=170)
    from PIL import Image, ImageFilter, ImageChops
    im = Image.open(png).convert('RGB')
    # bloom: blur the bright parts and add them back, plus a soft vignette and fine grain
    bright = im.point(lambda v: max(0, v - 190) * 3)
    bloom = bright.filter(ImageFilter.GaussianBlur(26)).point(lambda v: min(255, int(v * 1.1)))
    im = ImageChops.add(im, bloom.point(lambda v: int(v * .4)))
    vig = Image.radial_gradient('L').resize(im.size).point(lambda v: 255 - int(v * .22))
    im = ImageChops.multiply(im, Image.merge('RGB', (vig, vig, vig)))
    im.save(REN / f'{name}.jpg', quality=86); png.unlink(); f.unlink()
    return REN / f'{name}.jpg'

if __name__ == '__main__':
    which = [int(a) for a in sys.argv[1:]] or list(CONCEPTS)
    for n in which:
        s = CONCEPTS[n]()
        print(render(f'c{n}', s))
        if n != 6: print(render(f'c{n}b', second_view(n, s)))
