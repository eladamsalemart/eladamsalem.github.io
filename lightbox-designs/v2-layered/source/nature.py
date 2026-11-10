"""Naturalistic generators for layered light-box scenes (mm, y down)."""
import math
import numpy as np
from shapely.geometry import Polygon, Point, box, MultiPolygon
from shapely.ops import unary_union
from shapely import affinity
from lib import W, H, FR, INNER, FRAME, shape, stroke, circle, ellipse, place, U, poly, line, curve, star


# ------------------------------------------------------------ terrain
def _mpd(p0, p1, rough, rng, depth):
    pts = [p0, p1]
    amp = abs(p1[0] - p0[0]) * rough
    for _ in range(depth):
        new = [pts[0]]
        for a, b in zip(pts[:-1], pts[1:]):
            mx, my = (a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + rng.uniform(-amp, amp)
            new += [(mx, my), b]
        pts = new
        amp *= 0.55
    return pts


def mountain(rng, keys, bottom=H + 5, rough=0.22, depth=6, x0=-5, x1=W + 5):
    """keys: list of (x, y) ridge key points (peaks and saddles), left to right."""
    keys = [(x0, keys[0][1])] + list(keys) + [(x1, keys[-1][1])]
    line_ = []
    for a, b in zip(keys[:-1], keys[1:]):
        seg = _mpd(a, b, rough, rng, depth)
        line_ += seg[:-1]
    line_.append(keys[-1])
    pts = line_ + [(x1, bottom), (x0, bottom)]
    return Polygon(pts).buffer(0)


def hills(rng, y, amp, bottom=H + 5, waves=2.0, rough=0.05, x0=-5, x1=W + 5):
    xs = np.linspace(x0, x1, 120)
    ph = rng.uniform(0, 6.3)
    ys = y - amp * np.sin(xs / (x1 - x0) * math.pi * waves + ph) - amp * 0.3 * np.sin(xs / (x1 - x0) * math.pi * waves * 2.7 + ph * 2)
    ys += rng.uniform(-amp * rough, amp * rough, len(xs))
    return Polygon(list(zip(xs, ys)) + [(x1, bottom), (x0, bottom)]).buffer(0)


def snowcaps(mtn, rng, keys, depth=10, width=0.5):
    """White (cut) snow patches below the given peaks, kept inside the mountain."""
    holes = []
    for (px, py) in keys:
        pts = [(px, py + 1.5)]
        n = 7
        for i in range(n + 1):
            t = i / n
            x = px - depth * width * 1.6 + depth * width * 3.2 * t
            y = py + depth * (0.55 + 0.45 * rng.random()) * (1 - abs(t - 0.5) * 1.2) + 2
            pts.append((x, y))
        holes.append(Polygon(pts).buffer(0))
    return U(holes).intersection(mtn.buffer(-1.6))


# ------------------------------------------------------------ trees
def fir(cx, base, h, w, rng, jag=0.25, trunk=None):
    """Jagged fir outline (fast, good for tree-lines)."""
    top = base - h
    n = max(6, int(h / 5.5))
    R, L = [], []
    for k in range(1, n + 1):
        f = k / n
        y = top + h * 0.9 * f
        hw = w / 2 * (0.1 + 0.9 * f ** 0.9)
        dr = h * 0.03
        for side, lst in ((1, R), (-1, L)):
            j = 1 + rng.uniform(-jag, jag)
            lst.append((cx + side * hw * j, y + dr))
            lst.append((cx + side * hw * (0.5 + rng.uniform(-0.08, 0.12)), y - dr * 0.5))
    tw = trunk or max(1.4, w * 0.08)
    pts = [(cx, top - h * 0.02)] + R + [(cx + tw / 2, base - h * 0.06), (cx + tw / 2, base + 3),
                                        (cx - tw / 2, base + 3), (cx - tw / 2, base - h * 0.06)] + L[::-1]
    return Polygon(pts).buffer(0.3).buffer(-0.3)


def spruce(cx, base, h, w, rng, droop=0.35, density=2.6):
    """Detailed spruce made of drooping needle-branches (for foreground)."""
    top = base - h
    parts = [stroke([(cx, base + 3), (cx, top)], max(2.0, w * 0.07), 1.2)]
    n = int(h / density)
    for i in range(1, n):
        t = i / n
        y = top + h * 0.94 * t + rng.uniform(-0.6, 0.6)
        L = w / 2 * (0.06 + 0.94 * t ** 0.8) * rng.uniform(0.7, 1.12)
        if L < 2:
            continue
        for s in (-1, 1):
            if rng.random() < 0.12 and t > 0.2:
                continue
            Ls = L * rng.uniform(0.8, 1.0)
            end = (cx + s * Ls, y + Ls * droop * rng.uniform(0.7, 1.3))
            mid = (cx + s * Ls * 0.5, y + Ls * droop * 0.25)
            parts.append(stroke([(cx, y), mid, end], max(1.3, 2.4 - t * 0.6), 1.1, res=5))
            # needle tufts hanging under the branch
            m = max(1, int(Ls / 3.2))
            for k in range(1, m + 1):
                u = k / (m + 0.5)
                bx = cx + s * Ls * u
                by = y + Ls * droop * (0.25 * u + 0.75 * u * u) * 0.9
                ln = rng.uniform(1.8, 3.6) * (0.6 + 0.6 * t)
                parts.append(stroke([(bx, by), (bx + s * ln * 0.4, by + ln)], 1.4, 1.1, res=3))
    return U(parts)


def foliage_clump(x, y, r, rng, holes=True):
    """Scalloped leafy mass of radius ~r."""
    g = [circle(x, y, r * 0.75, 24)]
    n = max(6, int(r * 1.6))
    for i in range(n):
        a = 2 * math.pi * i / n + rng.uniform(-0.2, 0.2)
        rr = r * rng.uniform(0.7, 0.95)
        g.append(circle(x + rr * math.cos(a), y + rr * math.sin(a) * 0.85, r * rng.uniform(0.22, 0.34), 14))
    c = U(g)
    if holes and r > 6:
        for _ in range(int(r / 3)):
            a, d = rng.uniform(0, 6.28), rng.uniform(0.2, 0.6) * r
            hx, hy = x + d * math.cos(a), y + d * math.sin(a)
            c = c.difference(ellipse(hx, hy, rng.uniform(1.0, 1.8), rng.uniform(0.9, 1.4), rng.uniform(0, 180)))
    return c


def branches(x, y, ang, length, width, depth, rng, spread=26, decay=0.74, wdecay=0.68, kids=(2, 3),
             bend=12, minw=1.3, tips=None, gravity=0.0):
    parts = []

    def rec(x, y, ang, L, w, d):
        a = math.radians(ang)
        b = math.radians(ang + rng.uniform(-bend, bend))
        mx, my = x + math.sin(b) * L * 0.5, y - math.cos(b) * L * 0.5
        ex, ey = x + math.sin(a) * L, y - math.cos(a) * L + gravity * L * (1 - d / max(depth, 1))
        w_end = max(w * wdecay, minw)
        parts.append(stroke([(x, y), (mx, my), (ex, ey)], w, w_end, res=6))
        if d == 0:
            if tips is not None:
                tips.append((ex, ey, ang, L))
            return
        k = rng.integers(kids[0], kids[1] + 1)
        for i in range(k):
            off = (i - (k - 1) / 2) * spread * 2 / max(k - 1, 1) + rng.uniform(-9, 9)
            rec(ex, ey, ang + off, L * decay * rng.uniform(0.82, 1.1), w_end, d - 1)
    rec(x, y, ang, length, width, depth)
    return U(parts)


def oak(x, base, h, rng, crown=1.0, clump=7.0, depth=5, lean=0):
    tips = []
    trunk_h = h * 0.32
    tr = shape([(x - h * 0.06, base + 3), (x - h * 0.045, base - trunk_h * 0.4), (x - h * 0.03, base - trunk_h),
                (x + h * 0.03, base - trunk_h), (x + h * 0.045, base - trunk_h * 0.4), (x + h * 0.07, base + 3)])
    br = branches(x, base - trunk_h * 0.9, lean, h * 0.2, h * 0.06, depth, rng, spread=30 * crown,
                  decay=0.78, tips=tips)
    fol = [foliage_clump(tx, ty, clump * rng.uniform(0.8, 1.2), rng) for (tx, ty, a, L) in tips]
    return U(tr, br, fol)


def bare_tree(x, base, h, rng, depth=6, spread=24, lean=0, w=None):
    w = w or h * 0.07
    tr = stroke([(x, base + 3), (x + lean * 0.1, base - h * 0.3)], w * 1.3, w)
    br = branches(x + lean * 0.1, base - h * 0.28, lean, h * 0.2, w, depth, rng, spread=spread, decay=0.8, wdecay=0.7)
    return U(tr, br)


def cypress(cx, base, h, w, rng):
    pts = [(cx, base - h)]
    n = int(h / 3)
    for side in (1, -1):
        seq = []
        for i in range(1, n + 1):
            t = i / n
            prof = math.sin(math.pi * min(1, t * 1.05) ** 0.75) * (1 - 0.25 * t)
            hw = w / 2 * prof * rng.uniform(0.82, 1.08)
            seq.append((cx + side * hw, base - h + h * t * 0.96))
        pts += seq if side == 1 else seq[::-1]
        if side == 1:
            pts += [(cx + 1.2, base + 3), (cx - 1.2, base + 3)]
    return Polygon(pts).buffer(0.4).buffer(-0.4)


def palm(x, base, h, rng, lean=10, fronds=7):
    top = (x + lean, base - h)
    trunk = stroke([(x, base + 3), (x + lean * 0.2, base - h * 0.5), top], 4.5, 2.6)
    # trunk rings cut
    parts = [trunk]
    for k in range(fronds):
        a = math.pi * (1.05 + 0.9 * k / (fronds - 1)) + rng.uniform(-0.1, 0.1)
        L = rng.uniform(26, 36)
        p1 = (top[0] + L * 0.5 * math.cos(a), top[1] + L * 0.5 * math.sin(a) - 3)
        p2 = (top[0] + L * math.cos(a), top[1] + L * math.sin(a) + L * 0.35)
        parts.append(stroke([top, p1, p2], 2.4, 1.2))
        c = curve([top, p1, p2], res=10)
        for i in range(3, len(c) - 1, 2):
            px, py = c[i]
            dx, dy = c[i + 1] - c[i - 1]
            ang = math.degrees(math.atan2(dy, dx))
            ln = 7 * (1 - i / len(c) * 0.5)
            for s in (1, -1):
                b = math.radians(ang + s * 60 + 20)
                parts.append(stroke([(px, py), (px + ln * math.cos(b), py + ln * math.sin(b) + 2)], 1.6, 1.1, res=3))
    return U(parts)


def olive(x, base, h, rng):
    tw = h * 0.11
    th = h * 0.36
    trunk = shape([(x - tw * 0.9, base + 3), (x - tw * 0.55, base - th * 0.3), (x - tw * 0.75, base - th * 0.65),
                   (x - tw * 0.35, base - th), (x + tw * 0.45, base - th), (x + tw * 0.2, base - th * 0.6),
                   (x + tw * 0.6, base - th * 0.3), (x + tw * 1.0, base + 3)])
    trunk = trunk.difference(U(ellipse(x - tw * 0.1, base - th * 0.45, tw * 0.16, th * 0.14),
                               stroke([(x + tw * 0.2, base - th * 0.15), (x + tw * 0.05, base - th * 0.3)], 1.2, 1.2)))
    tips = []
    limbs = []
    for ang, L in ((-48, 0.26), (-12, 0.3), (22, 0.28), (55, 0.24)):
        limbs.append(branches(x, base - th + 2, ang, h * L * 0.55, tw * 0.45, 3, rng, spread=26, decay=0.8, tips=tips))
    fol = []
    for (tx, ty, a_, L_) in tips:
        fol.append(foliage_clump(tx, ty, h * rng.uniform(0.05, 0.075), rng))
        fol.append(ellipse(tx + rng.uniform(-4, 4), ty + 2, h * 0.08, h * 0.035, rng.uniform(-15, 15)))
    return U(trunk, limbs, fol)


# ------------------------------------------------------------ plants
def leaf(x, y, L, wd, ang):
    g = shape([(0, 0, 'c'), (wd * 0.5, -L * 0.35), (wd * 0.35, -L * 0.75), (0, -L, 'c'),
               (-wd * 0.35, -L * 0.75), (-wd * 0.5, -L * 0.35)], res=8)
    return place(g, x, y, rot=ang)


def maple_leaf(x, y, s, ang):
    pts = []
    lobes = [(0, 1.0), (40, 0.75), (75, 0.8), (110, 0.45), (140, 0.3)]
    prof = []
    for a, r in lobes:
        prof.append((a, r))
    out = []
    for side in (1, -1):
        seq = []
        for a, r in lobes:
            seq.append((side * a, r))
            seq.append((side * (a + 18), r * 0.42))
        out += seq if side == 1 else seq[::-1]
    # build polygon around (0 up)
    full = []
    angs = sorted(set([a for a, _ in out]))
    pts = []
    for a, r in sorted(out, key=lambda t: t[0]):
        rad = math.radians(a - 90)
        pts.append((r * math.cos(rad), r * math.sin(rad)))
    g = Polygon([(0, 0.15)] + pts).buffer(0)
    g = U(g, stroke([(0, 0), (0, 0.35)], 0.06, 0.06, minw=0.06))
    g = place(g, 0, 0, s)
    g = U(g, stroke([(0, 0), (0, s * 0.45)], 1.4, 1.2))
    return place(g, x, y, rot=ang)


def fern(x, y, h, bend, rng, leaflet=10, flip=False):
    pts = [(x, y), (x + bend * 0.35, y - h * 0.6), (x + bend, y - h)]
    parts = [stroke(pts, 2.6, 1.2)]
    c = curve(pts, res=20)
    n = len(c)
    for i in range(2, n - 1, 2):
        t = i / n
        px, py = c[i]
        dx, dy = c[min(i + 1, n - 1)] - c[i - 1]
        ang = math.degrees(math.atan2(dy, dx))
        ln = leaflet * (1 - t * 0.75) * rng.uniform(0.9, 1.1)
        for s in (1, -1):
            parts.append(leaf(px, py, ln, ln * 0.32, ang + 90 + s * 55))
    return U(parts)


def grass_tuft(rng, x, y, h, n=7, spread=10, w=2.0):
    parts = []
    for i in range(n):
        dx = rng.uniform(-spread, spread)
        hh = h * rng.uniform(0.5, 1.0)
        parts.append(stroke([(x + rng.uniform(-2, 2), y + 2), (x + dx * 0.3, y - hh * 0.55), (x + dx, y - hh)],
                            w * rng.uniform(0.9, 1.3), 1.1, res=6))
    return U(parts)


def grass_band(rng, x0, x1, y, hmin, hmax, density=1.4, w=2.0, lean=7):
    parts = []
    n = int((x1 - x0) * density)
    for i in range(n):
        x = x0 + (x1 - x0) * rng.random()
        h = rng.uniform(hmin, hmax)
        dx = rng.uniform(-lean, lean)
        parts.append(stroke([(x, y + 3), (x + dx * 0.25, y - h * 0.55), (x + dx, y - h)], w * rng.uniform(0.9, 1.3), 1.1, res=6))
    return U(parts)


def reeds(rng, x0, x1, y, hmin, hmax, n, cat_p=0.35):
    parts = []
    for i in range(n):
        x = x0 + (x1 - x0) * (i + rng.random()) / n
        h = rng.uniform(hmin, hmax)
        b = rng.uniform(-14, 14)
        top = (x + b, y - h)
        parts.append(stroke([(x, y + 3), (x + b * 0.3, y - h * 0.55), top], 2.2, 1.2))
        if rng.random() < cat_p:
            ang = math.degrees(math.atan2(b, h))
            parts.append(place(ellipse(0, 0, 2.4, 7.5), top[0] - b * 0.06, top[1] + 9, rot=ang * 0.6))
    return U(parts)


def water_lines(rng, x0, x1, y0, y1, gap=6.0, th0=1.6, th1=3.2, amp=0.9, wl=24):
    """Horizontal paper strips that read as water (they connect to the frame)."""
    from lib import wave_strip
    parts = []
    ys = np.arange(y0, y1, gap)
    for k, y in enumerate(ys):
        t = k / max(len(ys) - 1, 1)
        parts.append(wave_strip(rng, x0, x1, y, th0 + (th1 - th0) * t, amp=amp, wl=wl, var=0.45))
    return U(parts)


def cloud_bank(rng, x0, x1, y, h, side_attach=True):
    parts = [box(x0, y - h * 0.3, x1, y + h * 0.3)]
    x = x0
    while x < x1:
        r = rng.uniform(h * 0.4, h * 0.85)
        parts.append(circle(x, y - rng.uniform(0, h * 0.4), r, 32))
        x += r * rng.uniform(1.0, 1.5)
    return U(parts)


def stars_holes(rng, region, n, avoid=None, rmin=1.6, rmax=3.0, mind=8):
    from lib import stars
    return stars(rng, region, n, rmin, rmax, avoid=avoid, mind=mind)


def flyer(x, y, s, rot=0):
    g = shape([(-6, -1.5), (-3, -2.6), (0, 0.4, 'c'), (3, -2.6), (6, -1.5), (6.6, -0.4, 'c'),
               (3, -1.0), (0, 2.2, 'c'), (-3, -1.0), (-6.6, -0.4, 'c')], res=8)
    return place(g, x, y, s, rot=rot)


# ------------------------------------------------------------ architecture
def facade(x0, x1, top, base, rng, roof="gable", win=True, chimney=False, arch=False, floors=None, door=True):
    w = x1 - x0
    body = box(x0, top, x1, base + 3)
    parts = [body]
    if roof == "gable":
        parts.append(poly([(x0 - 1.5, top + 0.5), ((x0 + x1) / 2, top - w * 0.45), (x1 + 1.5, top + 0.5)]))
    elif roof == "steep":
        parts.append(poly([(x0 - 1, top + 0.5), ((x0 + x1) / 2, top - w * 0.8), (x1 + 1, top + 0.5)]))
    elif roof == "flat":
        parts.append(box(x0 - 1.2, top - 2, x1 + 1.2, top + 0.5))
    elif roof == "dome":
        parts.append(circle((x0 + x1) / 2, top, w * 0.42).intersection(box(x0, top - w, x1, top + 1)))
        parts.append(line(((x0 + x1) / 2, top - w * 0.42), ((x0 + x1) / 2, top - w * 0.42 - 5), 1.4))
    elif roof == "step":
        steps = 3
        for k in range(steps):
            parts.append(box(x0 + w * k / (2 * steps), top - (k + 1) * 3.2, x1 - w * k / (2 * steps), top + 0.5))
    if chimney:
        cx = x0 + w * rng.uniform(0.2, 0.75)
        parts.append(box(cx, top - w * 0.4, cx + 3, top))
    g = U(parts)
    holes = []
    if win:
        fl = floors or max(1, int((base - top - 6) / 9))
        cols = max(1, int(w / 7))
        ww = min(3.4, w / cols * 0.45)
        for i in range(fl):
            yy = top + 4 + i * ((base - top - 8) / fl)
            for j in range(cols):
                xx = x0 + (j + 0.5) * w / cols - ww / 2
                if rng.random() < 0.8:
                    wb = box(xx, yy, xx + ww, yy + 4.6)
                    if arch:
                        wb = U(box(xx, yy + ww / 2, xx + ww, yy + 4.6), circle(xx + ww / 2, yy + ww / 2, ww / 2, 16))
                    holes.append(wb)
    if door and w > 10:
        dx = (x0 + x1) / 2
        holes.append(U(box(dx - 2.2, base - 6.5, dx + 2.2, base + 0.01), circle(dx, base - 6.5, 2.2, 16)).intersection(box(0, 0, W, base - 0.6)))
    if holes:
        g = g.difference(U(holes))
    return g


def onion_dome(cx, y, r):
    g = shape([(cx - r, y, 'c'), (cx - r * 1.05, y - r * 0.6), (cx - r * 0.6, y - r * 1.3), (cx, y - r * 1.9, 'c'),
               (cx + r * 0.6, y - r * 1.3), (cx + r * 1.05, y - r * 0.6), (cx + r, y, 'c')])
    return U(g, line((cx, y - r * 1.8), (cx, y - r * 1.8 - 5), 1.4))


def round_dome(cx, y, r, drum=4):
    g = U(circle(cx, y - drum, r).intersection(box(cx - r, y - drum - r, cx + r, y - drum)),
          box(cx - r * 0.95, y - drum, cx + r * 0.95, y + 1))
    g = U(g, line((cx, y - drum - r), (cx, y - drum - r - 4), 1.4), circle(cx, y - drum - r - 4.5, 1.2))
    for k in range(-2, 3):
        g = g.difference(U(box(cx + k * r * 0.35 - 0.8, y - drum + 0.8, cx + k * r * 0.35 + 0.8, y - 0.8)))
    return g


def tower(cx, top, base, w, spire=True, rng=None):
    g = box(cx - w / 2, top, cx + w / 2, base + 3)
    if spire:
        g = U(g, poly([(cx - w / 2 - 1, top + 0.5), (cx, top - w * 2.4), (cx + w / 2 + 1, top + 0.5)]),
              line((cx, top - w * 2.4), (cx, top - w * 2.4 - 4), 1.3))
    for k in range(int((base - top) / 14)):
        yy = top + 5 + k * 14
        g = g.difference(U(box(cx - 1.2, yy + 1.2, cx + 1.2, yy + 6), circle(cx, yy + 1.2, 1.2, 12)))
    return g


def crenel(x0, x1, top, base, merlon=3.0):
    g = box(x0, top, x1, base + 3)
    x = x0
    k = 0
    while x < x1 - merlon:
        if k % 2:
            g = g.difference(box(x, top - 0.01, x + merlon, top + merlon * 0.9))
        x += merlon
        k += 1
    return g


def skyscraper(x0, x1, top, base, rng, style=0):
    w = x1 - x0
    g = box(x0, top, x1, base + 3)
    if style == 1:   # setbacks
        g = U(g, box(x0 + w * 0.15, top - 12, x1 - w * 0.15, top + 1), box(x0 + w * 0.32, top - 22, x1 - w * 0.32, top - 11),
              line(((x0 + x1) / 2, top - 22), ((x0 + x1) / 2, top - 36), 1.5))
    elif style == 2:  # slanted top
        g = U(g, poly([(x0, top + 0.5), (x0, top - w * 0.5), (x1, top + 0.5)]))
    elif style == 3:  # spire
        g = U(g, poly([(x0 + w * 0.2, top + 0.5), ((x0 + x1) / 2, top - w * 1.2), (x1 - w * 0.2, top + 0.5)]),
              line(((x0 + x1) / 2, top - w * 1.2), ((x0 + x1) / 2, top - w * 1.2 - 10), 1.3))
    # window slits
    holes = []
    cols = max(1, int(w / 4.2))
    for j in range(cols):
        xx = x0 + (j + 0.5) * w / cols - 0.8
        y = top + 4
        while y < base - 6:
            L = rng.uniform(8, 26)
            holes.append(box(xx, y, xx + 1.6, min(y + L, base - 4)))
            y += L + rng.uniform(2.4, 8)
    return g.difference(U(holes))


def arch_bridge(x0, x1, deck, water, n=4, pier=5.0, th=6.0):
    g = box(x0, deck, x1, water + 4)
    span = (x1 - x0 - pier * (n + 1)) / n
    holes = []
    for k in range(n):
        ax = x0 + pier * (k + 1) + span * k
        r = span / 2
        holes.append(U(box(ax, deck + th + r, ax + span, water + 4.1), circle(ax + r, deck + th + r, r, 48)))
    g = g.difference(U(holes))
    # parapet
    g = U(g, box(x0, deck - 3, x1, deck + 0.5))
    g = g.difference(U([box(x, deck - 2.2, x + 2.2, deck - 0.8) for x in np.arange(x0 + 2, x1 - 3, 4.4)]))
    return g


def boat(x, y, L, rng, mast=True, sail=False):
    hull = shape([(x - L / 2, y - L * 0.16, 'c'), (x - L * 0.38, y), (x + L * 0.38, y), (x + L / 2, y - L * 0.18, 'c'),
                  (x + L * 0.3, y - L * 0.13), (x - L * 0.3, y - L * 0.13)])
    parts = [hull]
    if mast:
        mh = L * 1.4
        parts.append(line((x, y - L * 0.13), (x, y - L * 0.13 - mh), 1.6))
        parts.append(stroke([(x, y - L * 0.13 - mh), (x + L * 0.48, y - L * 0.17)], 1.2, 1.2))
        parts.append(stroke([(x, y - L * 0.13 - mh), (x - L * 0.5, y - L * 0.15)], 1.2, 1.2))
        if sail:
            parts.append(poly([(x + 1, y - L * 0.13 - mh * 0.9), (x + 1, y - L * 0.25), (x + L * 0.42, y - L * 0.25)]))
    return U(parts)
