"""Refined paper-cut primitives: veined leaves, leafy twigs, detailed trees, meadows, fur."""
import math
import numpy as np
from shapely.geometry import Polygon, Point, LineString, box, MultiPolygon
from shapely.ops import unary_union, nearest_points
from shapely import affinity
from lib import W, H, INNER, shape, stroke, circle, ellipse, place, U, poly, line, curve


def attach(g, target, overlap=1.0):
    if g.is_empty or g.intersects(target):
        return g
    p, q = nearest_points(g, target)
    dx, dy = q.x - p.x, q.y - p.y
    d = math.hypot(dx, dy) or 1
    k = (d + overlap) / d
    return affinity.translate(g, dx * k, dy * k)


# ------------------------------------------------------------------ leaves
def leaf2(L, Wd, kind="oval", veins=True, stalk=0.0):
    """Leaf with base at (0,0) pointing up (-y)."""
    n = 36
    ts = np.linspace(0, 1, n)
    if kind == "willow":
        prof = np.sin(np.pi * ts ** 0.9) ** 1.2
    elif kind == "round":
        prof = np.sin(np.pi * ts ** 0.75) ** 0.7
    else:
        prof = np.sin(np.pi * ts ** 0.8) ** 0.85
    w = Wd / 2 * prof
    if kind == "serrated":
        saw = ((ts * 9) % 1)
        w = w * (0.86 + 0.18 * saw)
    if kind == "oak":
        w = w * (0.55 + 0.45 * np.abs(np.sin(ts * np.pi * 4.5)))
    right = [(w[i], -L * ts[i]) for i in range(n)]
    left = [(-w[i], -L * ts[i]) for i in range(n)][::-1]
    g = Polygon(right + left).buffer(0.25).buffer(-0.25)
    if stalk > 0:
        g = U(g, stroke([(0, 0), (0, stalk)], 1.3, 1.2))
    if veins and Wd >= 5.5 and L >= 11:
        cut = [stroke([(0, -L * 0.12), (0, -L * 0.8)], 0.9, 0.8, minw=0.8)]
        k = 3 if L < 20 else 4
        for i in range(k):
            t = 0.25 + 0.5 * i / max(k - 1, 1)
            y = -L * t
            ww = Wd / 2 * np.sin(np.pi * t ** 0.8) ** 0.85 * (0.36 if kind == "oak" else (0.48 if kind == "serrated" else 0.62))
            for s in (1, -1):
                cut.append(stroke([(0, y), (s * ww, y - ww * 0.9)], 0.8, 0.8, minw=0.8))
        g = g.difference(U(cut))
    return g


def place_leaf(g, x, y, ang, s=1.0):
    return place(g, x, y, s, rot=ang)


def leafy_twig(pts, rng, kind="oval", size=10, spacing=6.0, width=2.0, end_leaf=True, droop=0, veins=True, alt=55):
    c = curve(pts, res=12)
    parts = [stroke(pts, width, max(1.2, width * 0.55))]
    d = np.hypot(*np.diff(c, axis=0).T)
    s = np.concatenate([[0], np.cumsum(d)])
    tot = s[-1]
    k = 0
    pos = spacing * 0.8
    while pos < tot - 2:
        i = int(np.searchsorted(s, pos))
        i = min(max(i, 1), len(c) - 2)
        x, y = c[i]
        dx, dy = c[i + 1] - c[i - 1]
        ang = math.degrees(math.atan2(dx, -dy))
        side = 1 if k % 2 else -1
        f = 0.65 + 0.35 * (pos / tot)
        L = size * f * rng.uniform(0.85, 1.1)
        lg = leaf2(L, L * (0.42 if kind != "willow" else 0.22), kind, veins)
        parts.append(place_leaf(lg, x, y, ang + side * alt + droop * side + rng.uniform(-8, 8)))
        pos += spacing * rng.uniform(0.85, 1.15)
        k += 1
    if end_leaf:
        x, y = c[-1]
        dx, dy = c[-1] - c[-3]
        ang = math.degrees(math.atan2(dx, -dy))
        L = size * 1.05
        parts.append(place_leaf(leaf2(L, L * 0.42 if kind != "willow" else L * 0.22, kind, veins), x, y, ang))
    return U(parts)


# ------------------------------------------------------------------ trees
def grow(x, y, ang, L, w, depth, rng, spread=24, decay=0.76, wdecay=0.7, bend=10, kids=(2, 3), tips=None,
         minw=1.3, segs=None, gravity=0.0):
    parts = [] if segs is None else segs

    def rec(x, y, ang, L, w, d):
        a = math.radians(ang)
        b = math.radians(ang + rng.uniform(-bend, bend))
        mx, my = x + math.sin(b) * L * 0.5, y - math.cos(b) * L * 0.5
        ex, ey = x + math.sin(a) * L, y - math.cos(a) * L + gravity * L
        we = max(w * wdecay, minw)
        parts.append(stroke([(x, y), (mx, my), (ex, ey)], w, we, res=6))
        if d == 0:
            if tips is not None:
                tips.append((ex, ey, ang))
            return
        k = int(rng.integers(kids[0], kids[1] + 1))
        for i in range(k):
            off = (i - (k - 1) / 2) * spread * 2 / max(k - 1, 1) + rng.uniform(-8, 8)
            rec(ex, ey, ang + off, L * decay * rng.uniform(0.82, 1.1), we, d - 1)
    rec(x, y, ang, L, w, depth)
    return parts


def trunk_shape(x, base, h, w0, w1, lean=0, roots=True, rng=None, bark=True):
    pts_c = [(x, base + 2), (x + lean * 0.3, base - h * 0.5), (x + lean, base - h)]
    t = stroke(pts_c, w0, w1)
    parts = [t]
    if roots:
        for s in (-1, 1):
            parts.append(stroke([(x + s * w0 * 0.2, base - w0 * 0.8), (x + s * w0 * 0.75, base - 1), (x + s * w0 * 1.3, base + 3)], w0 * 0.45, 1.6))
    g = U(parts)
    if bark and rng is not None:
        cuts = []
        for _ in range(int(h / 9)):
            yy = base - rng.uniform(4, h * 0.9)
            tt = (base - yy) / h
            cx = x + lean * tt ** 1.5
            ww = (w0 + (w1 - w0) * tt) * 0.5
            dx = rng.uniform(-ww * 0.4, ww * 0.4)
            ln = rng.uniform(4, 9)
            cuts.append(stroke([(cx + dx, yy), (cx + dx + rng.uniform(-1, 1), yy - ln)], 0.9, 0.8, minw=0.8))
        g = g.difference(U(cuts).intersection(g.buffer(-1.3)))
    return g


def leafy_tree(x, base, h, rng, w=None, lean=0, spread=26, depth=4, leaf="oval", leaf_size=7, density=1.0,
               crown_start=0.38):
    w = w or h * 0.075
    tips = []
    th = h * crown_start
    tr = trunk_shape(x, base, th + 4, w, w * 0.7, lean=lean * 0.3, rng=rng)
    segs = grow(x + lean * 0.3, base - th, lean, h * 0.2, w * 0.7, depth, rng, spread=spread, tips=tips)
    parts = [tr] + segs
    for (tx, ty, a) in tips:
        n = int(rng.integers(2, 4) * density)
        for j in range(max(n, 1)):
            aa = a + rng.uniform(-50, 50)
            Lt = rng.uniform(7, 12)
            ex, ey = tx + math.sin(math.radians(aa)) * Lt, ty - math.cos(math.radians(aa)) * Lt
            parts.append(leafy_twig([(tx, ty), ((tx + ex) / 2 + rng.uniform(-1, 1), (ty + ey) / 2), (ex, ey)], rng, leaf,
                                    leaf_size, spacing=leaf_size * 0.6, width=1.5, veins=leaf_size >= 11))
    return U(parts)


def bare_tree2(x, base, h, rng, w=None, lean=0, spread=22, depth=6):
    w = w or h * 0.07
    th = h * 0.3
    tr = trunk_shape(x, base, th + 3, w, w * 0.75, lean=lean * 0.3, rng=rng)
    segs = grow(x + lean * 0.3, base - th, lean, h * 0.18, w * 0.75, depth, rng, spread=spread, decay=0.8, wdecay=0.72)
    return U([tr] + segs)


def spruce2(cx, base, h, w, rng, droop=0.32, density=2.4):
    top = base - h
    parts = [stroke([(cx, base + 3), (cx, top)], max(2.2, w * 0.08), 1.2)]
    n = int(h / density)
    for i in range(1, n):
        t = i / n
        y = top + h * 0.95 * t + rng.uniform(-0.5, 0.5)
        L = w / 2 * (0.05 + 0.95 * t ** 0.85) * rng.uniform(0.75, 1.1)
        if L < 1.6:
            continue
        for s in (-1, 1):
            Ls = L * rng.uniform(0.82, 1.0)
            end = (cx + s * Ls, y + Ls * droop * rng.uniform(0.6, 1.2))
            mid = (cx + s * Ls * 0.55, y + Ls * droop * 0.15)
            parts.append(stroke([(cx, y), mid, end], max(1.3, 2.2 - t * 0.5), 1.1, res=5))
            m = max(1, int(Ls / 2.6))
            for k in range(1, m + 1):
                u = k / (m + 0.4)
                bx = cx + s * Ls * u * 0.98
                by = y + Ls * droop * (0.15 * u + 0.85 * u * u) * 0.95
                ln = rng.uniform(2.0, 3.8) * (0.7 + 0.5 * t)
                parts.append(stroke([(bx, by), (bx + s * ln * 0.35, by + ln)], 1.3, 1.0, res=3, minw=1.0))
                parts.append(stroke([(bx, by), (bx + s * ln * 0.7, by - ln * 0.5)], 1.2, 1.0, res=3, minw=1.0))
    return U(parts)


def fir2(cx, base, h, w, rng, jag=0.28):
    top = base - h
    n = max(7, int(h / 4.0))
    R, Lf = [], []
    for k in range(1, n + 1):
        f = k / n
        y = top + h * 0.92 * f
        hw = w / 2 * (0.08 + 0.92 * f ** 0.9)
        dr = h * 0.022
        for side, lst in ((1, R), (-1, Lf)):
            j = 1 + rng.uniform(-jag, jag)
            lst.append((cx + side * hw * j, y + dr))
            lst.append((cx + side * hw * (0.55 + rng.uniform(-0.1, 0.1)), y - dr * 0.4))
    tw = max(1.6, w * 0.07)
    pts = [(cx, top - h * 0.02)] + R + [(cx + tw / 2, base - h * 0.05), (cx + tw / 2, base + 3),
                                        (cx - tw / 2, base + 3), (cx - tw / 2, base - h * 0.05)] + Lf[::-1]
    return Polygon(pts).buffer(0.25).buffer(-0.25)


# ------------------------------------------------------------------ ground plants
def blade(x, y, h, lean, w=2.2):
    return stroke([(x, y + 3), (x + lean * 0.25, y - h * 0.5), (x + lean, y - h)], w, 1.0, res=8, minw=1.0)


def meadow(rng, x0, x1, y, hmin, hmax, density=1.6, flowers=0, seeds=0, lean=8, w=2.0):
    parts = []
    n = int((x1 - x0) * density)
    for i in range(n):
        x = x0 + (x1 - x0) * rng.random()
        parts.append(blade(x, y, rng.uniform(hmin, hmax), rng.uniform(-lean, lean), w * rng.uniform(0.85, 1.25)))
    for i in range(flowers):
        x = x0 + (x1 - x0) * rng.random()
        h = rng.uniform(hmax * 0.8, hmax * 1.5)
        b = rng.uniform(-6, 6)
        parts.append(stroke([(x, y + 3), (x + b * 0.3, y - h * 0.5), (x + b, y - h)], 1.4, 1.2))
        parts.append(daisy(x + b, y - h - 2.6, rng.uniform(2.6, 3.6)))
    for i in range(seeds):
        x = x0 + (x1 - x0) * rng.random()
        h = rng.uniform(hmax * 0.9, hmax * 1.6)
        b = rng.uniform(-10, 10)
        pts = [(x, y + 3), (x + b * 0.3, y - h * 0.5), (x + b, y - h)]
        parts.append(stroke(pts, 1.4, 1.1))
        c = curve(pts, res=10)
        for j in range(len(c) - 8, len(c) - 1, 2):
            px, py = c[j]
            dx, dy = c[j + 1] - c[j - 1]
            a = math.degrees(math.atan2(dx, -dy))
            for s in (1, -1):
                parts.append(place_leaf(leaf2(3.6, 1.6, "oval", False), px, py, a + s * 30))
    return U(parts)


def daisy(x, y, r, n=9):
    petals = U([place(ellipse(0, -r * 0.62, r * 0.2, r * 0.48), x, y, rot=360 * k / n) for k in range(n)])
    return U(petals, circle(x, y, r * 0.32, 16)).difference(circle(x, y, r * 0.15, 12)) if r > 3 else U(petals, circle(x, y, r * 0.32, 16))


def fern2(x, y, h, bend, rng, leaflet=11):
    pts = [(x, y + 3), (x + bend * 0.3, y - h * 0.55), (x + bend, y - h)]
    parts = [stroke(pts, 2.4, 1.1)]
    c = curve(pts, res=24)
    n = len(c)
    for i in range(3, n - 1, 2):
        t = i / n
        px, py = c[i]
        dx, dy = c[i + 1] - c[i - 1]
        ang = math.degrees(math.atan2(dx, -dy))
        ln = leaflet * (1 - t * 0.8) * rng.uniform(0.92, 1.08)
        if ln < 2.4:
            continue
        for s in (1, -1):
            pin = leaf2(ln, max(ln * 0.3, 1.6), "serrated", False)
            parts.append(place_leaf(pin, px, py, ang + s * 62))
    return U(parts)


def reed2(rng, x, y, h, bend, cat=False):
    pts = [(x, y + 3), (x + bend * 0.3, y - h * 0.55), (x + bend, y - h)]
    g = [stroke(pts, 2.4, 1.1)]
    if cat:
        c = curve(pts, res=10)
        i = int(len(c) * 0.8)
        x1, y1 = c[i]
        dx, dy = c[i + 1] - c[i - 1]
        a = math.degrees(math.atan2(dx, -dy))
        g.append(place(ellipse(0, 0, 2.6, 8.5), x1, y1, rot=a))
    return U(g)


def reed_leaf(x, y, h, bend, w=3.2):
    return stroke([(x - w * 0.3, y + 3), (x + bend * 0.25, y - h * 0.55), (x + bend, y - h)], w, 1.0, minw=1.0)


# ------------------------------------------------------------------ fauna helpers
def furry(g, region, size=2.2, spacing=2.6, rng=None):
    """Add small outward fur tufts along the outline where it lies inside `region`."""
    ext = g.exterior if g.geom_type == "Polygon" else max(g.geoms, key=lambda p: p.area).exterior
    L = ext.length
    tufts = []
    d = 0
    while d < L:
        p = ext.interpolate(d)
        if region.contains(p):
            p2 = ext.interpolate(min(d + 0.8, L))
            p0 = ext.interpolate(max(d - 0.8, 0))
            tx, ty = p2.x - p0.x, p2.y - p0.y
            n = math.hypot(tx, ty) or 1
            nx, ny = ty / n, -tx / n
            if not g.contains(Point(p.x + nx * 0.6, p.y + ny * 0.6)):
                pass
            else:
                nx, ny = -nx, -ny
            s = size * (rng.uniform(0.7, 1.2) if rng is not None else 1)
            tip = (p.x + nx * s - tx / n * s * 0.6, p.y + ny * s - ty / n * s * 0.6)
            tufts.append(Polygon([(p.x - tx / n * 1.2, p.y - ty / n * 1.2), tip, (p.x + tx / n * 1.2, p.y + ty / n * 1.2)]))
        d += spacing
    return U(g, U(tufts))


def swallow(x, y, s=1.0, rot=0):
    g = shape([(0, 0, 'c'), (3, -1.5), (6, -1.4), (8, 0.5, 'c'), (6, 1.2), (14, 4), (24, 10, 'c'), (13, 7),
               (5, 4), (4, 8), (-1, 22, 'c'), (-2, 9), (-4, 5), (-9, 9, 'c'), (-7, 4), (-14, 6, 'c'), (-8, 2),
               (-3, 2)], res=8)
    return place(g, x, y, s, rot=rot)


def gull_fly(x, y, s=1.0, rot=0):
    g = shape([(-24, -4, 'c'), (-16, -6), (-8, -3), (-2, 0), (2, -1), (6, -1.5), (9, -0.5, 'c'), (6, 0.8), (3, 1.4),
               (8, -3), (16, -6), (24, -5, 'c'), (16, -2), (8, 2), (2, 4), (-4, 4), (-8, 2), (-16, -2)], res=8)
    return place(g, x, y, s, rot=rot)


def spruce3(cx, base, h, w, rng, tier=None, trunk=None):
    """Classic paper-cut fir: drooping serrated tiers with light gaps between them."""
    top = base - h
    tw = trunk or max(2.2, w * 0.08)
    parts = [stroke([(cx, base + 3), (cx, top + h * 0.05)], tw, 1.4)]
    th = tier or max(6.0, h / 13)
    y = top + th * 0.6
    k = 0
    while y < base - th * 0.4:
        t = (y - top) / h
        hw = w / 2 * (0.12 + 0.88 * t ** 0.9) * rng.uniform(0.9, 1.06)
        pts = [(cx, y - th * 0.75)]
        for s in (1, -1):
            seq = [(cx + s * hw * 0.45, y - th * 0.2), (cx + s * hw * 0.85, y + th * 0.25), (cx + s * hw, y + th * 0.62)]
            m = max(3, int(hw / 2.6))
            for j in range(1, m + 1):
                f = j / m
                xx = cx + s * hw * (1 - f * 0.82)
                yy = y + th * (0.62 - 0.38 * f) + (th * 0.22 if j % 2 else 0)
                seq.append((xx, yy))
            seq.append((cx + s * hw * 0.12, y + th * 0.2))
            if s == 1:
                pts += seq
            else:
                pts += seq[::-1]
        # reorder: right side then left side reversed
        R_ = pts[1:1 + len(seq)]
        L_ = pts[1 + len(seq):]
        poly_ = Polygon([pts[0]] + R_ + [(cx, y + th * 0.2)] + L_).buffer(0.2).buffer(-0.2)
        parts.append(poly_)
        y += th * rng.uniform(0.78, 0.92)
        k += 1
    parts.append(Polygon([(cx - 1.2, top + th * 0.4), (cx, top - 2), (cx + 1.2, top + th * 0.4)]))
    return U(parts)
