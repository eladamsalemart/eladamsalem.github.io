"""Geometry helpers for paper-cut light-box templates.

Units: millimetres, y axis points DOWN (SVG convention).
Black = paper that stays.  White = cut away (light shines through).
"""
import math
import numpy as np
from shapely.geometry import Polygon, Point, LineString, MultiPolygon, box
from shapely.ops import unary_union
from shapely import affinity

W, H = 155.0, 235.0          # width x height of one design (portrait)
FR = 8.0                      # black frame width
INNER = box(FR, FR, W - FR, H - FR)
FRAME = box(0, 0, W, H).difference(INNER)


# ---------------------------------------------------------------- curves
def _hermite(P, corner, closed, res):
    n = len(P)
    P = [np.array(p, float) for p in P]

    def tan(j):
        if closed:
            j %= n
        if corner[j]:
            return np.zeros(2)
        if closed:
            return (P[(j + 1) % n] - P[(j - 1) % n]) * 0.5
        if j == 0:
            return (P[1] - P[0])
        if j == n - 1:
            return (P[-1] - P[-2])
        return (P[j + 1] - P[j - 1]) * 0.5

    out = []
    segs = n if closed else n - 1
    for i in range(segs):
        p0, p1 = P[i], P[(i + 1) % n]
        m0, m1 = tan(i), tan((i + 1) if not closed else (i + 1) % n)
        for t in np.linspace(0, 1, res, endpoint=False):
            t2, t3 = t * t, t * t * t
            h00 = 2 * t3 - 3 * t2 + 1
            h10 = t3 - 2 * t2 + t
            h01 = -2 * t3 + 3 * t2
            h11 = t3 - t2
            out.append(h00 * p0 + h10 * m0 + h01 * p1 + h11 * m1)
    if not closed:
        out.append(P[-1])
    return np.array(out)


def curve(pts, res=10, closed=False):
    P = [(p[0], p[1]) for p in pts]
    corner = [len(p) > 2 for p in pts]
    return _hermite(P, corner, closed, res)


def shape(pts, res=10):
    """Closed smooth outline. A point given as (x, y, 'c') is a sharp corner."""
    arr = curve(pts, res=res, closed=True)
    g = Polygon(arr).buffer(0)
    return g


def poly(pts):
    return Polygon(pts).buffer(0)


def stroke(pts, w0, w1=None, res=10, cap=True, minw=1.1):
    """Tapered smooth stroke through pts, width from w0 to w1."""
    if w1 is None:
        w1 = w0
    w1 = max(w1, minw)
    w0 = max(w0, minw)
    c = curve(pts, res=res) if len(pts) > 2 else np.array([pts[0][:2], pts[1][:2]], float)
    if len(c) < 2:
        return Polygon()
    d = np.diff(c, axis=0)
    seg = np.hypot(d[:, 0], d[:, 1])
    keep = np.concatenate([[True], seg > 1e-6])
    c = c[keep]
    d = np.diff(c, axis=0)
    seg = np.hypot(d[:, 0], d[:, 1])
    L = np.concatenate([[0], np.cumsum(seg)])
    tot = L[-1] if L[-1] > 0 else 1
    w = w0 + (w1 - w0) * (L / tot)
    # normals
    tans = np.zeros_like(c)
    tans[1:-1] = c[2:] - c[:-2]
    tans[0] = c[1] - c[0]
    tans[-1] = c[-1] - c[-2]
    nrm = np.stack([-tans[:, 1], tans[:, 0]], 1)
    nrm /= np.maximum(np.hypot(nrm[:, 0], nrm[:, 1]), 1e-9)[:, None]
    left = c + nrm * (w / 2)[:, None]
    right = c - nrm * (w / 2)[:, None]
    g = Polygon(np.vstack([left, right[::-1]])).buffer(0)
    if cap:
        g = unary_union([g, Point(c[0]).buffer(w0 / 2, 12), Point(c[-1]).buffer(w1 / 2, 8)])
    return g


def line(p0, p1, w):
    return LineString([p0, p1]).buffer(w / 2, cap_style=2)


def circle(x, y, r, res=48):
    return Point(x, y).buffer(r, res)


def ellipse(x, y, rx, ry, rot=0):
    g = affinity.scale(Point(0, 0).buffer(1, 64), rx, ry)
    g = affinity.rotate(g, rot, origin=(0, 0))
    return affinity.translate(g, x, y)


def place(g, x, y, s=1.0, flip=False, rot=0.0, sy=None):
    """Scale local-unit geometry (origin at 0,0) and move it."""
    sy = s if sy is None else sy
    g = affinity.scale(g, -s if flip else s, sy, origin=(0, 0))
    if rot:
        g = affinity.rotate(g, rot, origin=(0, 0))
    return affinity.translate(g, x, y)


def U(*gs):
    flat = []
    for g in gs:
        if isinstance(g, (list, tuple)):
            flat.extend(g)
        else:
            flat.append(g)
    flat = [g for g in flat if g is not None and not g.is_empty]
    return unary_union(flat)


# ---------------------------------------------------------------- nature
def star(x, y, r, points=4, inner=0.38, rot=0):
    pts = []
    for i in range(points * 2):
        a = math.pi * i / points + math.radians(rot) - math.pi / 2
        rr = r if i % 2 == 0 else r * inner
        pts.append((x + rr * math.cos(a), y + rr * math.sin(a)))
    return Polygon(pts)


def stars(rng, region, n, rmin=1.8, rmax=3.2, avoid=None, mind=9):
    out, pos = [], []
    minx, miny, maxx, maxy = region.bounds
    tries = 0
    while len(out) < n and tries < 4000:
        tries += 1
        x, y = rng.uniform(minx, maxx), rng.uniform(miny, maxy)
        r = rng.uniform(rmin, rmax)
        if not region.contains(Point(x, y).buffer(r + 2.5)):
            continue
        if avoid is not None and avoid.distance(Point(x, y)) < r + 3:
            continue
        if any(math.hypot(x - a, y - b) < mind for a, b in pos):
            continue
        pos.append((x, y))
        if rng.random() < 0.45:
            out.append(circle(x, y, r * 0.55, 16))
        else:
            out.append(star(x, y, r, 4, 0.4, rng.uniform(0, 45)))
    return U(out)


def tree(x, y, ang, length, width, depth, rng, spread=28, decay=0.72, wdecay=0.66,
         kids=(2, 3), bend=10, minw=1.3, tips=None):
    """Recursive deciduous tree (angle in degrees, 0 = up)."""
    parts = []

    def rec(x, y, ang, L, w, d):
        a = math.radians(ang)
        b = math.radians(ang + rng.uniform(-bend, bend))
        mx, my = x + math.sin(b) * L * 0.5, y - math.cos(b) * L * 0.5
        ex, ey = x + math.sin(a) * L, y - math.cos(a) * L
        w_end = max(w * wdecay, minw)
        parts.append(stroke([(x, y), (mx, my), (ex, ey)], w, w_end, res=6))
        if d == 0:
            if tips is not None:
                tips.append((ex, ey, ang))
            return
        k = rng.integers(kids[0], kids[1] + 1)
        for i in range(k):
            off = (i - (k - 1) / 2) * spread * 2 / max(k - 1, 1) + rng.uniform(-8, 8)
            rec(ex, ey, ang + off, L * decay * rng.uniform(0.85, 1.1), w_end, d - 1)

    rec(x, y, ang, length, width, depth)
    return U(parts)


def pine(cx, base, h, w, rng, trunk=4, tiers=None, jag=0.22):
    """Jagged fir/pine silhouette standing on y=base."""
    top = base - h
    n = tiers or max(7, int(h / 7))
    R, L = [], []
    for k in range(1, n + 1):
        f = k / n
        y = top + (h * 0.88) * f
        hw = w / 2 * (0.12 + 0.88 * f ** 0.95)
        dr = h * 0.035
        for side, lst in ((1, R), (-1, L)):
            j = 1 + rng.uniform(-jag, jag)
            lst.append((cx + side * hw * j, y + dr))
            lst.append((cx + side * hw * (0.45 + rng.uniform(0, 0.12)), y - dr * 0.4))
    pts = [(cx, top)] + R + [(cx + trunk / 2, base - h * 0.07), (cx + trunk / 2, base + 2),
                             (cx - trunk / 2, base + 2), (cx - trunk / 2, base - h * 0.07)] + L[::-1]
    return Polygon(pts).buffer(0.35).buffer(-0.35)


def pine_soft(cx, base, h, w, rng, trunk=3.5):
    """Rounder spruce made of drooping jagged layers."""
    parts = [line((cx, base + 2), (cx, base - h), trunk)]
    n = max(6, int(h / 8))
    for k in range(n):
        f = (k + 1) / n
        y = base - h + h * 0.9 * f
        hw = w / 2 * (0.15 + 0.85 * f)
        pts = [(cx, y - h * 0.11)]
        teeth = 4
        for s in (1, -1):
            seq = []
            for t in range(teeth):
                tt = (t + 1) / teeth
                seq.append((cx + s * hw * tt, y - h * 0.11 * (1 - tt) + h * 0.03 * tt + rng.uniform(-0.6, 0.6)))
                if t < teeth - 1:
                    seq.append((cx + s * hw * (tt + 0.05), y + h * 0.015 - h * 0.05 * (1 - tt)))
            if s == 1:
                pts += seq + [(cx + hw * 0.5, y + h * 0.03), (cx, y + h * 0.02)]
            else:
                pts += [(cx - hw * 0.5, y + h * 0.03)] + seq[::-1]
        parts.append(Polygon(pts).buffer(0))
    return U(parts)


def grass(rng, x0, x1, y, hmin, hmax, n, w=2.0, lean=6):
    parts = []
    for i in range(n):
        x = x0 + (x1 - x0) * (i + rng.uniform(0, 1)) / n
        h = rng.uniform(hmin, hmax)
        dx = rng.uniform(-lean, lean)
        parts.append(stroke([(x, y + 2), (x + dx * 0.3, y - h * 0.5), (x + dx, y - h)],
                            w * rng.uniform(0.9, 1.3), 1.1, res=6))
    return U(parts)


def ridge(rng, x0, x1, y0, amp, bottom=H, n=60, rough=0.35, peaks=None, seed_shift=0):
    xs = np.linspace(x0, x1, n)
    ys = np.full(n, y0, float)
    for oct_, a in ((1, 1), (2, 0.5), (4, 0.25), (9, 0.12)):
        ph = rng.uniform(0, 6.3)
        ys -= amp * a * np.sin(xs / (x1 - x0) * math.pi * oct_ + ph)
    ys += rng.uniform(-amp * rough * 0.15, amp * rough * 0.15, n)
    if peaks:
        for px, py, pw in peaks:
            ys = np.minimum(ys, py + np.abs(xs - px) * pw + rng.uniform(-1, 1, n))
    pts = list(zip(xs, ys)) + [(x1, bottom), (x0, bottom)]
    return Polygon(pts).buffer(0)


def wave_strip(rng, x0, x1, y, th, amp=2.0, wl=30, ph=None, n=80, var=0.5):
    """Wavy horizontal strip (paper) of thickness ~th."""
    ph = rng.uniform(0, 6.3) if ph is None else ph
    xs = np.linspace(x0, x1, n)
    yc = y + amp * np.sin(xs / wl * 2 * math.pi + ph) + amp * 0.4 * np.sin(xs / (wl * 0.45) + ph * 1.7)
    t = th * (1 + var * np.sin(xs / (wl * 1.3) + ph * 2.3))
    t = np.maximum(t, 1.4)
    top = np.stack([xs, yc - t / 2], 1)
    bot = np.stack([xs, yc + t / 2], 1)
    return Polygon(np.vstack([top, bot[::-1]])).buffer(0)


def leaf(x, y, L, wd, ang):
    g = shape([(0, 0, 'c'), (wd * 0.5, -L * 0.35), (wd * 0.35, -L * 0.75), (0, -L, 'c'),
               (-wd * 0.35, -L * 0.75), (-wd * 0.5, -L * 0.35)], res=8)
    return place(g, x, y, rot=ang)


def flyer(x, y, s, rot=0):
    """Small flying bird 'v' (use as a white cut-out)."""
    g = shape([(-6, -1.5), (-3, -2.6), (0, 0.4, 'c'), (3, -2.6), (6, -1.5), (6.6, -0.4, 'c'),
               (3, -1.0), (0, 2.2, 'c'), (-3, -1.0), (-6.6, -0.4, 'c')], res=8)
    return place(g, x, y, s, rot=rot)


# ---------------------------------------------------------------- finishing
def finish(black):
    """Clip to frame, union, remove crumbs. Returns (geom, report)."""
    g = U(FRAME, black.intersection(INNER))
    g = g.buffer(0.15, join_style=1).buffer(-0.15, join_style=1)
    polys = list(g.geoms) if isinstance(g, MultiPolygon) else [g]
    polys.sort(key=lambda p: -p.area)
    main = polys[0]
    islands = polys[1:]
    holes = [r for r in main.interiors if Polygon(r).area >= 2.5]
    removed_holes = len(main.interiors) - len(holes)
    main = Polygon(main.exterior, holes)
    thin = main.difference(main.buffer(-0.6).buffer(0.6))
    rep = dict(islands=[(round(p.area, 1), tuple(round(v) for v in p.centroid.coords[0])) for p in islands],
               small_holes=removed_holes, holes=len(holes), thin_area=round(thin.area, 1),
               black_ratio=round(main.area / (W * H), 2))
    return main, rep


def svg_path(g, dx=0, dy=0):
    polys = list(g.geoms) if isinstance(g, MultiPolygon) else [g]
    out = []
    for p in polys:
        for ring in [p.exterior] + list(p.interiors):
            cs = np.array(ring.coords)
            out.append("M" + " L".join(f"{x + dx:.2f},{y + dy:.2f}" for x, y in cs) + "Z")
    return " ".join(out)
