"""Front-stencil light-box designs (style of the reference templates).
Each function returns [back layers..., FRONT]; black = paper that stays."""
import math
import numpy as np
from shapely.geometry import Polygon, Point, box
from shapely import affinity
from lib import W, H, INNER, shape, stroke, circle, ellipse, place, U, poly, line, curve, wave_strip, stars
from nature import foliage_clump, mountain, hills, snowcaps, cloud_bank, water_lines, cypress, facade, round_dome, onion_dome, tower, crenel, skyscraper, arch_bridge, boat, olive
from art import *
import fauna as F


def R(s):
    return np.random.default_rng(s)


def cloud_layer(rng, rows):
    """Back layer: soft cloud bands attached to the frame sides."""
    parts = []
    for (y, side, length, h) in rows:
        x0, x1 = (-5, length) if side == "l" else (W - length, W + 5)
        parts.append(cloud_bank(rng, x0, x1, y, h))
    return U(parts)


def rim_point(cx, cy, r, deg, inset=2.0):
    a = math.radians(deg)
    return cx + (r - inset) * math.cos(a), cy + (r - inset) * math.sin(a)


def ground_lace(rng, y0, y1, x0=10, x1=145, n=26, flowers=4):
    """White cut-outs (grass blades / flowers) inside a solid ground band."""
    holes = []
    used = []
    for i in range(n):
        x = x0 + (x1 - x0) * rng.random()
        h = rng.uniform((y1 - y0) * 0.35, (y1 - y0) * 0.8)
        b = rng.uniform(-3, 3)
        if any(abs(x - q) < 5 for q in used):
            continue
        used.append(x)
        holes.append(stroke([(x, y1), (x + b * 0.3, y1 - h * 0.5), (x + b, y1 - h)], rng.uniform(2.2, 3.0), 1.1, minw=1.1))
    for i in range(flowers):
        x = x0 + (x1 - x0) * rng.random()
        if any(abs(x - q) < 6 for q in used):
            continue
        used.append(x)
        h = rng.uniform((y1 - y0) * 0.5, (y1 - y0) * 0.85)
        holes.append(stroke([(x, y1), (x + 1, y1 - h)], 1.4, 1.3))
        holes.append(daisy(x + 1, y1 - h - 2.2, 3.0))
    return U(holes).intersection(box(x0 - 4, y0, x1 + 4, y1 - 1.5))


def sky_sheet(rng, holes, slits=None):
    g = INNER.difference(U(holes))
    if slits:
        g = g.difference(slits)
    return g


def slits(rng, rows, avoid=None):
    cuts = []
    for (y, x0, x1) in rows:
        cuts.append(wave_strip(rng, x0, x1, y, 1.6, amp=0.7, wl=36, var=0.3))
    g = U(cuts)
    return g.difference(avoid.buffer(3)) if avoid is not None else g


# =========================================================================== 1
def stag_moon():
    r = R(201)
    moon = circle(70, 70, 24, 96)
    back = sky_sheet(r, [moon, stars(r, box(10, 10, 145, 120), 14, avoid=moon.buffer(5), rmin=1.6, rmax=2.6)],
                     slits(r, [(40, 60, 120), (100, 100, 150), (112, 14, 60)], avoid=moon))
    mid = mountain(r, [(16, 140), (40, 104), (58, 128), (84, 100), (106, 126), (128, 108), (146, 124)], rough=0.2)
    mid = mid.difference(snowcaps(mid, r, [(40, 104), (84, 100), (128, 108)], depth=10))
    mid = U(mid, U([fir2(x, 160, r.uniform(9, 18), 6, r) for x in np.arange(6, 152, 4.2)]), box(-5, 158, W + 5, 240))
    hill = shape([(-5, 240, 'c'), (-5, 200), (30, 194), (64, 190), (100, 192), (130, 188), (160, 194), (160, 240, 'c')])
    hill = hill.difference(ground_lace(r, 200, 226, n=30, flowers=5))
    stag = place(F.stag(), 72, 193, 0.66)
    doe = place(F.doe(), 122, 191, 0.52, flip=True)
    sp = U(spruce3(24, 204, 200, 44, r))
    bt = bare_tree2(150, 200, 196, r, w=8, lean=-4, spread=18, depth=6)
    top = leafy_twig([(160, 30), (130, 36), (106, 32), (90, 40)], r, "oval", 11, spacing=6.5, width=4.5)
    top2 = leafy_twig([(118, 34), (112, 50), (116, 62)], r, "oval", 9, spacing=6, width=2.2)
    mead = meadow(r, 4, 152, 194, 4, 12, density=1.3, flowers=7, seeds=8)
    birds = U(attach(swallow(98, 54, 0.8, 15), U(top, top2)))
    front = U(hill, stag, doe, sp, bt, top, top2, mead, birds)
    return [back, mid, front]


def sky_sun(r, x, y, rad, n_stars=0, rows=(), birds=(), halo=False):
    sun = circle(x, y, rad, 96)
    holes = [sun]
    if n_stars:
        holes.append(stars(r, box(10, 10, 145, 130), n_stars, avoid=sun.buffer(5), rmin=1.6, rmax=2.6))
    for (bx, by, bs, ba) in birds:
        from nature import flyer
        holes.append(flyer(bx, by, bs, ba))
    if halo:
        ring = circle(x, y, rad + 6).difference(circle(x, y, rad + 4.4))
        gaps = U([place(box(-1.5, 0, 1.5, rad + 10), x, y, rot=a) for a in (20, 110, 200, 290)])
        holes.append(ring.difference(gaps))
    bh = U([__import__('nature').flyer(bx, by, bs, ba) for (bx, by, bs, ba) in birds]) if birds else None
    av = circle(x, y, rad + (8 if halo else 0))
    if bh is not None and not bh.is_empty:
        av = U(av, bh.buffer(3))
    sl = slits(r, rows, avoid=av) if rows else None
    return sky_sheet(r, holes, sl)


def oak_branch(r, pts, leaf_size=13, acorns=True, kind="oak"):
    parts = [stroke(pts, 9, 3.4)]
    c = curve(pts, res=20)
    tips = []
    for i in range(8, len(c) - 4, 14):
        x, y = c[i]
        dx, dy = c[i + 1] - c[i - 1]
        a = math.degrees(math.atan2(dx, -dy))
        side = 1 if (i // 14) % 2 else -1
        a2 = a + side * r.uniform(40, 70)
        L = r.uniform(14, 22)
        ex, ey = x + math.sin(math.radians(a2)) * L, y - math.cos(math.radians(a2)) * L
        tw = leafy_twig([(x, y), ((x + ex) / 2, (y + ey) / 2 + 2), (ex, ey)], r, kind, leaf_size, spacing=leaf_size * 0.55, width=2.4)
        parts.append(tw)
        if acorns and r.random() < 0.5:
            mx, my = (x + ex) / 2, (y + ey) / 2 + 2
            ac = U(stroke([(mx, my), (mx - 1, my + 5)], 1.4, 1.3), ellipse(mx - 1, my + 6.4, 3.2, 1.8), ellipse(mx - 1, my + 9.2, 2.5, 3.3))
            parts.append(ac)
    return U(parts)


# =========================================================================== 2
def owl_branch():
    r = R(202)
    back = sky_sun(r, 76, 84, 36, n_stars=12)
    mid = U([bare_tree2(x, 214, h, r, w=w, spread=22, depth=5) for (x, h, w) in ((18, 150, 6), (60, 110, 4), (104, 130, 5), (140, 160, 6))],
            hills(r, 200, 4))
    br = oak_branch(r, [(162, 126), (128, 132), (96, 140), (62, 138), (36, 130), (20, 120)], leaf_size=14)
    owl = place(F.owl_perched(), 84, 132, 1.15)
    ivy = U([leafy_twig([(x, 4), (x + r.uniform(-3, 3), 4 + L * 0.5), (x + r.uniform(-5, 5), 4 + L)], r, "round", 8, spacing=6, width=1.8)
             for (x, L) in ((18, 44), (30, 26), (44, 60), (122, 36), (136, 54))])
    gnd = shape([(-5, 240, 'c'), (-5, 208), (40, 204), (90, 206), (130, 202), (160, 206), (160, 240, 'c')]).difference(ground_lace(r, 212, 226, n=22, flowers=4))
    fr = U(fern2(14, 208, 54, 16, r), fern2(30, 208, 36, -6, r), fern2(142, 206, 58, -16, r), fern2(126, 206, 38, 6, r))
    front = U(br, owl, ivy, gnd, fr, meadow(r, 40, 120, 206, 3, 9, density=0.9, flowers=3))
    return [back, mid, front]


# =========================================================================== 3
def fox_forest():
    r = R(203)
    back = sky_sun(r, 80, 96, 26, rows=[(60, 20, 70), (74, 100, 146), (128, 14, 60)])
    mid = U([fir2(x, 196, h, h * 0.36, r) for (x, h) in zip(np.arange(4, 156, 9), r.uniform(40, 90, 18))], box(-5, 190, W + 5, 240))
    t1 = leafy_tree(16, 210, 200, r, w=12, lean=14, spread=24, depth=4, leaf="oval", leaf_size=8)
    t2 = leafy_tree(140, 210, 190, r, w=11, lean=-14, spread=24, depth=4, leaf="oval", leaf_size=8)
    gnd = shape([(-5, 240, 'c'), (-5, 206), (40, 200), (80, 202), (120, 198), (160, 204), (160, 240, 'c')]).difference(ground_lace(r, 210, 226, n=22, flowers=3))
    fox = place(F.fox(), 82, 202, 0.95)
    shrooms = []
    for (x, h, rr) in ((40, 14, 8), (52, 9, 5), (118, 12, 7)):
        stem = shape([(x - rr * 0.22, 204), (x - rr * 0.18, 204 - h * 0.6), (x - rr * 0.25, 204 - h), (x + rr * 0.25, 204 - h), (x + rr * 0.18, 204 - h * 0.6), (x + rr * 0.22, 204)])
        cap = shape([(x - rr, 204 - h + 1, 'c'), (x - rr * 0.8, 204 - h - rr * 0.55), (x, 204 - h - rr * 0.8), (x + rr * 0.8, 204 - h - rr * 0.55), (x + rr, 204 - h + 1, 'c'), (x, 204 - h - 0.5)])
        g = U(stem, cap)
        for (dx, dy) in ((-0.45, -0.35), (0.1, -0.55), (0.5, -0.25)):
            g = g.difference(circle(x + dx * rr, 204 - h + dy * rr, max(rr * 0.12, 1.2), 12))
        shrooms.append(g)
    fr = U(fern2(26, 204, 40, 12, r), fern2(132, 204, 44, -12, r))
    front = U(t1, t2, gnd, fox, shrooms, fr, meadow(r, 10, 145, 202, 3, 9, density=1.0, seeds=4))
    return [back, mid, front]


# =========================================================================== 4
def heron_reeds():
    r = R(204)
    back = sky_sun(r, 92, 116, 26, rows=[(70, 14, 70), (84, 100, 146), (58, 80, 130)], halo=True)
    mid = U(U([foliage_clump(x, 142 - r.uniform(0, 10), r.uniform(6, 11), r, holes=False) for x in np.arange(0, 160, 10)]),
            box(-5, 142, W + 5, 150), water_lines(r, -5, W + 5, 158, 240, gap=6, th0=1.2, th1=2.0))
    heron = place(F.heron(), 66, 204, 1.1)
    water = water_lines(r, -5, W + 5, 203, 232, gap=6.5, th0=2.6, th1=4.2, amp=0.7)
    reeds = []
    for (x0, x1, n) in ((4, 36, 9), (118, 152, 9)):
        for i in range(n):
            x = x0 + (x1 - x0) * (i + r.random()) / n
            h = r.uniform(70, 190)
            b = r.uniform(-14, 14)
            reeds.append(reed2(r, x, 228, h, b, cat=r.random() < 0.45))
            if r.random() < 0.6:
                reeds.append(reed_leaf(x + 2, 228, h * 0.6, -b * 1.2))
    pad = ellipse(104, 206, 14, 3).difference(poly([(104, 206), (116, 201), (118, 205)]))
    lotus = shape([(97, 204, 'c'), (98, 198), (100, 194, 'c'), (102, 198), (104, 191, 'c'), (106, 198), (108, 194, 'c'), (110, 198), (111, 204, 'c')])
    dfly = attach(place(__import__('animals').dragonfly(), 0, 0, 0.8, rot=-80), U(reeds))
    front = U(heron, water, reeds, pad, lotus, dfly)
    return [back, mid, front]


# =========================================================================== 5
def wolf_cliff():
    r = R(205)
    back = sky_sun(r, 100, 62, 30, n_stars=16)
    m = mountain(r, [(10, 140), (36, 104), (56, 130), (84, 108), (110, 132), (136, 100), (150, 120)], rough=0.2)
    mid = m.difference(snowcaps(m, r, [(36, 104), (84, 108), (136, 100)], depth=14))
    cliff = mountain(r, [(-5, 128), (20, 126), (46, 132), (62, 146), (74, 170), (84, 196), (100, 206), (160, 210)], rough=0.06)
    cliff = cliff.difference(U([stroke([(10 + k * 9, 150 + k * 6), (24 + k * 9, 160 + k * 8)], 1.2, 1.1) for k in range(5)]))
    wolf = attach(place(F.wolf_howl(), 40, 129, 0.62), cliff)
    sp = U(spruce3(132, 214, 180, 44, r), spruce3(112, 214, 96, 26, r))
    gr = meadow(r, 4, 70, 128, 3, 9, density=0.8)
    gnd = U(box(-5, 210, W + 5, 240).difference(ground_lace(r, 212, 226, n=18, flowers=2)))
    front = U(cliff, wolf, sp, gr, gnd)
    return [back, mid, front]


# =========================================================================== 6
def ibex_cliff():
    r = R(206)
    back = sky_sun(r, 104, 70, 24, birds=((40, 44, 1.0, -6), (54, 36, 0.8, 4), (64, 50, 0.7, -2)), rows=[(110, 14, 60), (96, 120, 150)])
    mid = mountain(r, [(10, 134), (24, 112), (56, 110), (64, 130), (88, 132), (98, 116), (132, 114), (142, 126)], rough=0.06)
    mid = mid.difference(U([wave_strip(r, -5, W + 5, y, 1.4, amp=0.6, wl=30) for y in (146, 160)]).intersection(mid.buffer(-2)))
    ledge = mountain(r, [(-5, 136), (30, 134), (58, 140), (72, 156), (80, 184), (92, 214), (110, 222), (160, 226)], rough=0.05)
    strata = U([stroke([(x, y), (x + r.uniform(8, 16), y + r.uniform(-2, 3))], 1.2, 1.0) for (x, y) in
                ((10, 160), (30, 166), (50, 176), (16, 184), (40, 194), (62, 200), (24, 206), (48, 214))]).intersection(ledge.buffer(-2.5))
    ledge = ledge.difference(strata)
    ib = attach(place(F.ibex(), 38, 136, 0.86), ledge)
    ib2 = attach(place(F.ibex(), 66, 150, 0.55, flip=True), ledge)
    tips = []
    ac = grow(132, 226, -6, 40, 6, 4, r, spread=34, decay=0.78, tips=tips)
    canopy = U([ellipse(x, y - 1, 11, 3.2) for (x, y, a) in tips])
    canopy = canopy.difference(U([ellipse(x + 3, y, 2.4, 1.0) for (x, y, a) in tips[::2]]))
    bush = U([meadow(r, x - 8, x + 8, 226, 8, 22, density=1.2) for x in (100, 148)])
    front = U(ledge, ib, ib2, ac, canopy, bush, box(-5, 224, W + 5, 240))
    return [back, mid, front]


# =========================================================================== 7
def blossom_birds():
    r = R(207)
    back = sky_sun(r, 98, 92, 26, rows=[(54, 14, 70), (140, 100, 146)])
    mt = mountain(r, [(14, 200), (54, 136), (72, 112), (82, 112), (100, 136), (146, 196)], rough=0.03)
    cap = poly([(72, 112), (82, 112), (92, 126), (87, 123), (83, 130), (78, 122), (73, 129), (68, 122), (62, 126)])
    mid = U(mt.difference(cap.intersection(mt.buffer(-1.5))), hills(r, 196, 4))

    def blossom(x, y, rr):
        p = U([circle(x + rr * 0.55 * math.cos(a), y + rr * 0.55 * math.sin(a), rr * 0.45, 16) for a in np.linspace(0, 6.28, 5, endpoint=False)])
        return p.difference(circle(x, y, rr * 0.2, 12))
    br_pts = [(-4, 30), (30, 40), (62, 36), (92, 50), (116, 48)]
    br = U(stroke(br_pts, 7, 2.4), stroke([(30, 40), (42, 62), (40, 76)], 3, 1.4), stroke([(62, 37), (74, 22), (88, 16)], 2.6, 1.4),
           stroke([(160, 150), (132, 160), (110, 158), (96, 168)], 6, 2.2), stroke([(132, 160), (126, 176), (130, 188)], 2.6, 1.4))
    fl = []
    for pts in (br_pts, [(160, 150), (132, 160), (110, 158), (96, 168)]):
        c = curve(pts, res=20)
        for i in range(5, len(c) - 1, 7):
            x, y = c[i]
            fl.append(attach(blossom(x + r.uniform(-3, 3), y + r.uniform(2, 6), r.uniform(3.2, 4.6)), br))
            if r.random() < 0.5:
                fl.append(attach(place_leaf(leaf2(8, 3.6, "serrated", False), x, y, r.uniform(120, 240)), br))
    for (x, y) in ((40, 76), (88, 16), (116, 48), (96, 168), (130, 188)):
        fl.append(attach(blossom(x, y + 3, 4.2), br))
    birds = U(attach(place(F.songbird(), 50, 38, 0.95), br), attach(place(F.songbird(), 74, 42, 0.85, flip=True), br),
              attach(place(F.songbird(), 124, 156, 0.9, flip=True), br))
    gnd = shape([(-5, 240, 'c'), (-5, 214), (50, 208), (100, 212), (160, 206), (160, 240, 'c')]).difference(ground_lace(r, 216, 228, n=18, flowers=3))
    front = U(br, fl, birds, gnd, meadow(r, 6, 150, 210, 3, 10, density=1.0, flowers=4))
    return [back, mid, front]


# =========================================================================== 8
def bear_river():
    r = R(208)
    back = sky_sun(r, 112, 52, 16, rows=[(36, 14, 80), (72, 20, 70), (84, 100, 146)])
    m = mountain(r, [(14, 104), (38, 66), (58, 94), (78, 74), (100, 102), (124, 70), (142, 96)], rough=0.22)
    mid = U(m.difference(snowcaps(m, r, [(38, 66), (78, 74), (124, 70)], depth=12)),
            U([fir2(x, 152, r.uniform(8, 18), 6, r) for x in np.arange(4, 154, 4.2)]), box(-5, 150, W + 5, 160),
            water_lines(r, -5, W + 5, 166, 240, gap=6, th0=1.2, th1=2.0))
    rock = shape([(36, 240, 'c'), (40, 212), (56, 200), (84, 198), (106, 204), (118, 218), (122, 240, 'c')])
    rock = rock.difference(U([stroke([(54, 214), (70, 210), (86, 214)], 1.2, 1.1), stroke([(90, 222), (104, 220)], 1.2, 1.1)]))
    bear = attach(place(F.bear(), 80, 200, 0.92), rock)
    water = water_lines(r, -5, W + 5, 206, 232, gap=6.5, th0=2.4, th1=3.6, amp=0.8)
    sp = U(spruce3(16, 228, 200, 40, r), spruce3(142, 228, 190, 40, r))
    front = U(rock, bear, water, sp)
    return [back, mid, front]


# =========================================================================== 9
def hares_meadow():
    r = R(209)
    back = sky_sun(r, 80, 86, 34, n_stars=14)
    mid = U(hills(r, 168, 7, waves=1.4), U([leafy_tree(x, 170 - 7 * math.sin(x / 25), h, r, w=2.6, depth=3, leaf_size=4, spread=30)
                                            for (x, h) in ((20, 40), (128, 36)) ]))
    gnd = shape([(-5, 240, 'c'), (-5, 200), (60, 194), (120, 196), (160, 192), (160, 240, 'c')]).difference(ground_lace(r, 206, 226, n=24, flowers=5))
    h1 = attach(place(F.hare(), 64, 197, 1.15), gnd)
    h2 = attach(place(F.hare(), 104, 196, 0.95, flip=True), gnd)
    mead = U(meadow(r, 4, 40, 198, 10, 46, density=1.6, flowers=5, seeds=6), meadow(r, 118, 152, 196, 10, 50, density=1.6, flowers=5, seeds=6),
             meadow(r, 40, 118, 196, 3, 10, density=1.0, flowers=2))
    front = U(gnd, h1, h2, mead)
    return [back, mid, front]


# =========================================================================== 10
def swans_willow():
    r = R(210)
    back = sky_sun(r, 104, 70, 22, n_stars=12)
    mid = U(U([foliage_clump(x, 150 - r.uniform(0, 12), r.uniform(7, 12), r, holes=False) for x in np.arange(-4, 160, 11)]),
            box(-5, 150, W + 5, 158), water_lines(r, -5, W + 5, 164, 240, gap=6, th0=1.2, th1=2.0))
    trunk = trunk_shape(18, 210, 150, 13, 7, lean=8, rng=r)
    arcs = [[(26, 62), (44, 40), (70, 34), (96, 44)], [(24, 70), (14, 52), (2, 46)], [(26, 64), (40, 30), (60, 18)]]
    limbs = U([stroke(p, 5, 1.8) for p in arcs])
    strands = []
    for p in arcs:
        c = curve(p, res=16)
        for i in range(3, len(c), 5):
            x, y = c[i]
            L = r.uniform(40, 110)
            pts = [(x, y), (x + 2, y + L * 0.5), (x + r.uniform(-1, 4), y + L)]
            strands.append(leafy_twig(pts, r, "willow", 7, spacing=5.5, width=1.3, veins=False, alt=22, droop=10))
    swans = U(place(F.swan(), 76, 208, 1.2), place(F.swan(), 110, 208, 1.2, flip=True))
    water = water_lines(r, -5, W + 5, 212, 234, gap=6.5, th0=2.6, th1=4.0, amp=0.7)
    stem = box(-5, 207.5, W + 5, 209)
    rd = U([reed2(r, x, 230, r.uniform(60, 140), r.uniform(-10, 8), cat=r.random() < 0.5) for x in np.arange(124, 154, 4.5)])
    front = U(trunk, limbs, strands, swans, water, stem, rd)
    return [back, mid, front]


# =========================================================================== 11
def waterfall():
    r = R(211)
    back = sky_sun(r, 46, 46, 16, rows=[(30, 70, 140), (62, 90, 146), (80, 14, 60)])
    wall = mountain(r, [(10, 74), (40, 62), (66, 72), (90, 68), (118, 60), (146, 76)], rough=0.1)
    fall = box(66, 66, 88, 178)
    streaks = U([stroke([(x, 60), (x + r.uniform(-1, 1), 120), (x, 182)], 1.5, 1.5) for x in (71, 77, 83)])
    cracks = U([stroke([(x, y), (x + r.uniform(6, 12), y + r.uniform(4, 10))], 1.2, 1.0) for (x, y) in
                ((20, 100), (40, 120), (26, 140), (104, 96), (124, 116), (110, 140), (130, 150))]).intersection(wall.buffer(-2))
    mid = U(wall.difference(fall).difference(cracks), streaks, water_lines(r, -5, W + 5, 186, 240, gap=6, th0=1.2, th1=2.0))
    sp = U(spruce3(18, 206, 170, 40, r), spruce3(138, 206, 180, 42, r), spruce3(40, 200, 90, 24, r))
    rocks = U(shape([(-5, 240, 'c'), (-5, 200), (16, 196), (38, 204), (52, 222), (56, 240, 'c')]),
              shape([(160, 240, 'c'), (160, 196), (140, 198), (118, 208), (108, 226), (104, 240, 'c')]))
    rocks = rocks.difference(U([stroke([(12, 214), (28, 212)], 1.2, 1.1), stroke([(126, 220), (144, 216)], 1.2, 1.1)]))
    water = water_lines(r, -5, W + 5, 214, 234, gap=6, th0=2.4, th1=3.6)
    fr = U(fern2(20, 200, 40, 14, r), fern2(146, 198, 44, -14, r), fern2(116, 210, 30, 8, r))
    br = stroke([(160, 26), (130, 34), (104, 30), (86, 38)], 5, 2)
    lv = U([leafy_twig(p, r, "oval", 8, spacing=5, width=1.6) for p in ([(130, 34), (124, 48), (128, 58)], [(104, 31), (100, 44)], [(86, 38), (78, 48)])])
    birds = U(attach(place(F.songbird(), 118, 32, 0.8), br), attach(place(F.songbird(), 98, 30, 0.75, flip=True), br))
    front = U(sp, rocks, water, fr, br, lv, birds)
    return [back, mid, front]


# =========================================================================== 12
def hummingbird_fuchsia():
    r = R(212)
    back = sky_sun(r, 96, 96, 24, rows=[(56, 14, 70), (140, 90, 146)])
    mid = U([leafy_tree(x, 236, h, r, w=4, depth=3, leaf_size=6, spread=30) for (x, h) in ((24, 120), (128, 140), (80, 90))])
    stem = [(18, 236), (14, 150), (30, 80), (62, 46), (100, 40), (130, 52)]
    vine = stroke(stem, 4.4, 2.2)
    c = curve(stem, res=20)

    def bell(x, y, s=1.0):
        ped = stroke([(0, 0), (1, 6), (0, 12)], 1.4, 1.4)
        sep = shape([(0, 11, 'c'), (-8, 18), (-13, 24, 'c'), (-5, 21), (-3, 24), (0, 22), (3, 24), (5, 21), (13, 24, 'c'), (8, 18)], res=8)
        cup = shape([(-4, 20), (4, 20), (5, 30), (3, 32), (0, 30), (-3, 32), (-5, 30)], res=8)
        stam = U(stroke([(-1, 29), (-2, 38.5)], 1.3, 1.3), stroke([(1, 29), (2, 40.5)], 1.3, 1.3), circle(-2, 38.5, 1.3), circle(2, 40.5, 1.3))
        return place(U(ped, sep, cup, stam), x, y, s)
    bells, leaves = [], []
    idx = [i for i in range(30, len(c) - 2, 12)]
    for k, i in enumerate(idx):
        x, y = c[i]
        if y < 70:
            bells.append(bell(x, y, r.uniform(0.85, 1.1)))
        dx, dy = c[i + 1] - c[i - 1]
        a = math.degrees(math.atan2(dx, -dy))
        leaves.append(place_leaf(leaf2(16, 7, "serrated", True, stalk=0), x, y, a + (60 if k % 2 else -60)))
    bx, by = c[idx[3]] if len(idx) > 3 else c[-10]
    hb = place(F.hummingbird(), bx + 1, by + 36, 1.05, rot=-14)
    hb = attach(hb, U(bells))
    daisies = []
    for (x, h, rr) in ((50, 54, 9), (72, 38, 7), (100, 60, 10), (124, 42, 8), (140, 30, 6)):
        daisies.append(stroke([(x, 230), (x + 3, 230 - h * 0.5), (x, 230 - h)], 2.0, 1.5))
        daisies.append(daisy(x, 230 - h - rr * 0.2, rr))
        daisies.append(place_leaf(leaf2(13, 5, "oval", True), x + 1, 230 - h * 0.35, 50))
    gnd = box(-5, 226, W + 5, 240)
    front = U(vine, bells, leaves, hb, daisies, gnd, meadow(r, 30, 150, 226, 4, 14, density=1.2))
    return [back, mid, front]


# =========================================================================== 13
def winter_birches():
    r = R(213)
    back = sky_sun(r, 46, 108, 18, rows=[(60, 70, 146), (80, 14, 60), (40, 30, 100)])
    mid = U(U([fir2(x, 168, r.uniform(10, 26), 8, r) for x in np.arange(2, 156, 5)]), box(-5, 166, W + 5, 172))
    birches = []
    for (x, lean, w) in ((14, 6, 7), (34, -4, 5), (120, 4, 5.5), (140, -6, 7.5)):
        tr = stroke([(x, 236), (x + lean * 0.5, 120), (x + lean, -2)], w, w * 0.7)
        marks = U([box(x + lean * (1 - y / 236) - w, y, x + lean * (1 - y / 236) - w * 0.15, y + 1.5) for y in np.arange(16, 216, r.uniform(8, 12))])
        tr = tr.difference(marks.intersection(tr.buffer(-0.6)))
        birches.append(tr)
        for k in range(3):
            y0 = r.uniform(30, 110)
            sgn = 1 if x < 80 else -1
            birches += grow(x + lean * (1 - y0 / 236), y0, sgn * r.uniform(40, 70), 16, 2.4, 3, r, spread=22)
    snow = shape([(-5, 240, 'c'), (-5, 206), (40, 200), (80, 204), (120, 198), (160, 204), (160, 240, 'c')]).difference(ground_lace(r, 210, 228, n=14, flowers=0))
    st = attach(place(F.stag(), 74, 203, 0.58), snow)
    de = attach(place(F.doe(), 106, 203, 0.48), snow)
    front = U(birches, snow, st, de, meadow(r, 40, 120, 202, 2, 6, density=0.5))
    return [back, mid, front]


# =========================================================================== 14
def alpine_lake():
    r = R(214)
    back = sky_sun(r, 52, 54, 15, rows=[(36, 80, 146), (76, 14, 60), (88, 96, 146)])
    m = mountain(r, [(10, 108), (30, 76), (48, 98), (72, 62), (96, 96), (114, 70), (134, 92), (146, 82)], rough=0.22)
    m = m.difference(snowcaps(m, r, [(30, 76), (72, 62), (114, 70)], depth=14))
    mid = U(m.intersection(box(-5, 0, W + 5, 150)), U([fir2(x, 152, r.uniform(8, 18), 6, r) for x in np.arange(2, 156, 4.3)]),
            box(-5, 150, W + 5, 156), water_lines(r, -5, W + 5, 164, 240, gap=6.5, th0=1.0, th1=2.2))
    canoe = place(__import__('animals').paddler(), 84, 192, 1.0)
    water = water_lines(r, -5, W + 5, 196, 232, gap=6.5, th0=2.2, th1=3.6)
    sp = U(spruce3(16, 220, 200, 42, r), spruce3(36, 214, 110, 28, r), spruce3(144, 220, 180, 40, r))
    rock = shape([(-5, 240, 'c'), (-5, 206), (20, 202), (44, 210), (56, 226), (60, 240, 'c')])
    front = U(canoe, water, sp, rock, fern2(48, 214, 28, 8, r))
    return [back, mid, front]


# =========================================================================== 15
def old_city():
    r = R(215)
    back = sky_sun(r, 104, 58, 18, rows=[(40, 14, 70), (84, 60, 120)], birds=((40, 48, 1.0, 5), (52, 40, 0.8, -4)))
    far = hills(r, 136, 8, waves=1.3)
    farb = U([box(x, 132 - 8 * math.sin(x / 40) - h, x + r.uniform(4, 8), 146) for x, h in zip(np.arange(14, 140, 9), r.uniform(2, 7, 20))])
    far_l = U(far, farb.intersection(INNER))
    parts = []
    for (x0, x1, top, roof) in ((44, 58, 150, "flat"), (58, 70, 140, "dome"), (98, 112, 146, "flat"), (112, 126, 136, "dome")):
        parts.append(facade(x0, x1, top, 188, r, roof=roof, arch=True, door=False))
    parts.append(round_dome(84, 132, 15, drum=6))
    parts.append(box(70, 132, 98, 188))
    parts.append(tower(124, 104, 188, 8, spire=False))
    parts.append(U(box(120, 96, 128, 106), circle(124, 96, 4)))
    city = U(parts).difference(U([U(box(x, 150, x + 4, 162), circle(x + 2, 150, 2)) for x in (74, 82, 90)]))
    city = U(city, box(-5, 186, W + 5, 240), U([facade(x, x + 13, r.uniform(152, 166), 188, r, roof=r.choice(["flat", "dome"]), arch=True, door=False) for x in (4, 18, 30, 128, 141)]))
    wall = crenel(-5, W + 5, 180, 240, merlon=4)
    gate = U(box(74, 198, 94, 240), circle(84, 198, 10, 32))
    wall = wall.difference(gate).difference(U([box(x, 188, x + 1.6, 194) for x in (24, 44, 116, 136)]))
    wall = wall.difference(U([box(x, 204 + (6 if (k % 2) else 0), x + 9, 205.2 + (6 if (k % 2) else 0)) for k, x in enumerate(np.arange(0, 70, 10))]))
    ol = olive(22, 236, 150, r)
    cy = U(cypress(136, 236, 130, 15, r), cypress(148, 236, 100, 12, r))
    front = U(wall, ol, cy)
    return [back, far_l, city, front]


# =========================================================================== 16
def rooftops_cat():
    r = R(216)
    moon = circle(110, 46, 18, 96)
    back = sky_sheet(r, [moon, stars(r, box(10, 10, 145, 110), 16, avoid=moon.buffer(5), rmin=1.6, rmax=2.6)])
    far = [box(-5, 140, W + 5, 240), tower(30, 76, 140, 10, spire=True), onion_dome(64, 118, 9), box(54, 118, 74, 140), round_dome(126, 122, 12)]
    for x in np.arange(-2, 156, 12):
        far.append(facade(x, x + 11, r.uniform(116, 132), 140, r, roof="steep", win=False, door=False))
    mid = U(far)
    roof = poly([(-5, 240), (-5, 196), (44, 168), (112, 168), (160, 192), (160, 240)])
    tiles = U([stroke([(x, 176), (x - 6, 236)], 1.2, 1.2) for x in np.arange(30, 130, 9)]).intersection(roof.buffer(-2.5))
    roof = roof.difference(tiles)
    chim = U(box(118, 140, 128, 180), box(116, 136, 130, 141))
    cat = attach(place(F.cat_sit(), 74, 168, 1.05), roof)
    ant = U(line((36, 172), (36, 128), 1.6), line((26, 136), (46, 136), 1.6), line((29, 144), (43, 144), 1.6), line((31, 152), (41, 152), 1.6))
    win = shape([(84, 220, 'c'), (84, 204), (92, 196), (100, 204), (100, 220, 'c')]).difference(box(91.3, 196, 92.7, 220))
    birds = U(attach(place(F.songbird(), 102, 168, 0.6), roof), attach(place(F.songbird(), 54, 168, 0.55, flip=True), roof))
    plant = U([leafy_twig([(6, 236), (10, 210), (6, 190)], r, "oval", 8, spacing=5, width=2.0)])
    front = U(roof.difference(win), chim, cat, ant, birds, plant)
    return [back, mid, front]


# =========================================================================== 17
def skyline_bridge():
    r = R(217)
    moon = circle(122, 40, 12, 64)
    back = sky_sheet(r, [moon.difference(circle(126, 36, 11)), stars(r, box(10, 10, 145, 80), 12, avoid=circle(122, 40, 16), rmin=1.6, rmax=2.6)])
    far = []
    x = -2
    for (w, top, st) in ((12, 120, 0), (9, 104, 3), (14, 112, 1), (10, 128, 0), (8, 92, 3), (16, 108, 1), (11, 122, 2),
                         (9, 98, 0), (14, 116, 1), (10, 86, 3), (12, 110, 2), (10, 124, 0), (14, 100, 1)):
        far.append(skyscraper(x, x + w, top, 240, r, style=st))
        x += w + 0.5
    mid = U(U(far), water_lines(r, -5, W + 5, 186, 240, gap=6, th0=1.0, th1=2.0), box(-5, 176, W + 5, 182))
    deck = box(-5, 190, W + 5, 196)
    tw = U(box(40, 88, 46, 240), box(108, 88, 114, 240), box(40, 104, 46, 107), box(108, 104, 114, 107), box(38, 84, 48, 89), box(106, 84, 116, 89))
    tw = tw.difference(U([U(box(41.5, y, 44.5, y + 10), circle(43, y, 1.5)) for y in (112, 130, 150, 170)] + [U(box(109.5, y, 112.5, y + 10), circle(111, y, 1.5)) for y in (112, 130, 150, 170)]))
    cpts = [[(-4, 168), (20, 128), (43, 88)], [(43, 88), (77, 160), (111, 88)], [(111, 88), (134, 128), (159, 168)]]
    cable = U([stroke(p, 1.8, 1.8) for p in cpts])
    hangers = []
    for p in cpts:
        cc = curve(p, 40)
        o = np.argsort(cc[:, 0])
        for xx in np.arange(min(p[0][0], p[-1][0]) + 5, max(p[0][0], p[-1][0]) - 3, 6):
            yc = float(np.interp(xx, cc[o, 0], cc[o, 1]))
            if yc < 189 and not (39 < xx < 47 or 107 < xx < 115):
                hangers.append(line((xx, yc), (xx, 190.5), 1.3))
    water = water_lines(r, -5, W + 5, 204, 222, gap=6, th0=2.0, th1=3.0)
    emb = U(box(-5, 222, W + 5, 240))
    tree = leafy_tree(150, 224, 86, r, w=5, depth=4, leaf_size=5.5, spread=26, lean=-4)
    front = U(deck, tw, cable, hangers, water, emb, tree)
    return [back, mid, front]


# =========================================================================== 18
def harbor():
    r = R(218)
    back = sky_sun(r, 36, 60, 15, rows=[(40, 70, 146), (86, 14, 80)], birds=((96, 40, 1.0, 5), (108, 32, 0.8, -4)))
    hill = hills(r, 118, 14, waves=1.0)
    houses = []
    for row, (y0, n) in enumerate(((128, 10), (116, 8), (104, 6))):
        for x in np.linspace(40 + row * 10, 150, n):
            hy = y0 + r.uniform(-3, 3)
            houses.append(facade(x, x + r.uniform(6, 9), hy, hy + 14, r, roof=r.choice(["gable", "flat"]), win=False, door=False))
    houses.append(tower(96, 72, 122, 6, spire=True))
    boats = U(boat(30, 166, 26, r, sail=True), boat(66, 164, 20, r), boat(108, 168, 30, r, sail=True))
    mid = U(hill, U(houses), box(-5, 144, W + 5, 150), water_lines(r, -5, W + 5, 158, 240, gap=6, th0=1.0, th1=2.0), boats)
    pier = U(box(84, 196, 160, 202), U([box(x, 196, x + 4, 240) for x in (88, 108, 128, 148)]))
    rope = stroke([(90, 190), (100, 198), (110, 190)], 1.4, 1.4)
    posts = U([box(x, 184, x + 4, 198) for x in (88, 108)])
    gl = attach(place(F.gull(), 110, 184, 0.8), posts)
    bow = shape([(-5, 240, 'c'), (-5, 192), (30, 194), (56, 200), (66, 210), (54, 222), (20, 228)])
    bow = bow.difference(U([circle(x, 208, 2.2) for x in (14, 30)]))
    mast = U(line((16, 196), (16, 120), 2.2), stroke([(16, 122), (54, 200)], 1.3, 1.3), stroke([(16, 140), (-4, 170)], 1.3, 1.3))
    water = water_lines(r, -5, W + 5, 214, 234, gap=7, th0=3.0, th1=3.6)
    front = U(pier, rope, posts, gl, bow, mast, water)
    return [back, mid, front]


# =========================================================================== 19
def village():
    r = R(219)
    back = sky_sun(r, 108, 60, 18, rows=[(40, 14, 70), (90, 20, 80)])
    hl = hills(r, 136, 8, waves=1.5)
    hill = shape([(-5, 240, 'c'), (-5, 182), (30, 164), (60, 150), (96, 148), (124, 156), (160, 172), (160, 240, 'c')])
    houses = []
    for (x0, x1, top, base) in ((30, 44, 150, 170), (44, 60, 138, 160), (60, 74, 132, 152), (74, 92, 136, 154), (92, 106, 140, 156),
                                (106, 120, 146, 162), (120, 134, 154, 170), (50, 66, 160, 180), (82, 98, 156, 176), (110, 126, 166, 182)):
        f = box(x0, top, x1, base + 3).difference(U(box(x0 + 3, top + 4, x0 + 6, top + 9), box(x1 - 6, top + 4, x1 - 3, top + 9)))
        houses.append(f)
    bell = U(box(64, 100, 72, 134), circle(68, 100, 4), line((68, 96), (68, 90), 1.3)).difference(U(box(66.4, 106, 69.6, 112), circle(68, 106, 1.6)))
    mid = U(hl, hill, U(houses), bell, round_dome(84, 136, 9, drum=3), U([cypress(x, b, h, 6, r) for (x, b, h) in ((26, 170, 30), (138, 172, 34), (100, 158, 24))]))
    ol = olive(24, 236, 130, r)
    wall = box(-5, 212, W + 5, 240)
    stones = U([ellipse(x + (6 if (int(y) // 7) % 2 else 0), y, 5, 2.2) for y in (218, 225, 232) for x in np.arange(4, 156, 12)])
    wall = wall.difference(stones.intersection(wall.buffer(-1.5)))
    agave = U([place_leaf(leaf2(L, L * 0.22, "willow", False), 128, 213, a) for (L, a) in ((26, -40), (30, -18), (32, 4), (28, 24), (22, 46))])
    cy = cypress(146, 214, 110, 14, r)
    front = U(ol, wall, agave, cy)
    return [back, mid, front]


# =========================================================================== 20
def stone_bridge():
    r = R(220)
    moon = circle(110, 44, 14, 64)
    back = sky_sheet(r, [moon, stars(r, box(10, 10, 145, 90), 12, avoid=moon.buffer(5), rmin=1.6, rmax=2.6)])
    far = [box(-5, 128, W + 5, 240), tower(66, 62, 130, 10, spire=True), tower(86, 62, 130, 10, spire=True), facade(60, 92, 96, 130, r, roof="steep", door=False)]
    for x in np.arange(-2, 156, 10):
        if 56 < x < 94:
            continue
        far.append(facade(x, x + 9.5, r.uniform(108, 122), 130, r, roof="steep", win=False, door=False))
    left = U([facade(x0, x1, top, 186, r, roof="steep", chimney=True, door=False) for (x0, x1, top) in ((-4, 16, 108), (16, 34, 120), (34, 48, 132))])
    right = U([facade(x0, x1, top, 186, r, roof="steep", chimney=True, door=False) for (x0, x1, top) in ((108, 124, 130), (124, 140, 116), (140, 160, 104))])
    mid = U(U(far).difference(box(-5, 150, W + 5, 240)).union(box(-5, 140, W + 5, 150)), left, right, box(-5, 184, W + 5, 190),
            water_lines(r, -5, W + 5, 196, 240, gap=6, th0=1.0, th1=2.0))
    br = arch_bridge(-5, W + 5, 156, 214, n=3, pier=9, th=7)
    lamps = U([U(line((x, 154), (x, 134), 1.6), ellipse(x, 132, 2.2, 3)) for x in (30, 78, 126)])
    water = water_lines(r, -5, W + 5, 216, 234, gap=6, th0=2.6, th1=3.4)
    arcs = [[(-4, 16), (20, 22), (44, 20)]]
    willow = [stroke(arcs[0], 5, 2.4)]
    c = curve(arcs[0], res=14)
    for i in range(1, len(c), 3):
        x, y = c[i]
        L = r.uniform(40, 100)
        willow.append(leafy_twig([(x, y), (x + 2, y + L * 0.5), (x + r.uniform(-1, 4), y + L)], r, "willow", 7, spacing=5.5, width=1.3, veins=False, alt=22, droop=10))
    front = U(br, lamps, water, willow)
    return [back, mid, front]


SCENES = [
    ("stag-moon", "אייל לאור הירח", stag_moon),
    ("owl-branch", "ינשוף על ענף אלון", owl_branch),
    ("fox-forest", "שועל ביער", fox_forest),
    ("heron-reeds", "אנפה בין הקנים", heron_reeds),
    ("wolf-cliff", "זאב על הצוק", wolf_cliff),
    ("ibex-cliff", "יעלים בצוקי המדבר", ibex_cliff),
    ("blossom-birds", "ציפורים על ענף פורח", blossom_birds),
    ("bear-river", "דוב בנהר", bear_river),
    ("hares-meadow", "ארנבות באחו", hares_meadow),
    ("swans-willow", "ברבורים תחת הערבה", swans_willow),
    ("waterfall", "מפל ביער", waterfall),
    ("hummingbird", "יונק הדבש והפוקסיה", hummingbird_fuchsia),
    ("winter-birches", "יער ליבנים בחורף", winter_birches),
    ("alpine-lake", "אגם בין ההרים", alpine_lake),
    ("old-city", "העיר העתיקה", old_city),
    ("rooftops-cat", "חתול על גגות העיר", rooftops_cat),
    ("skyline-bridge", "קו רקיע וגשר תלוי", skyline_bridge),
    ("harbor", "עיר נמל", harbor),
    ("village", "כפר ים תיכוני", village),
    ("stone-bridge", "גשר אבן בעיר העתיקה", stone_bridge),
]
