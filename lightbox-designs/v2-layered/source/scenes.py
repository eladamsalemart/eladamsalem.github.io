"""20 layered light-box scenes. Each scene returns a list of layer geometries,
BACK (closest to the light) first, FRONT last. Black = paper that stays."""
import math
import numpy as np
from shapely.geometry import Polygon, Point, box
from shapely import affinity
from shapely.ops import nearest_points
from lib import W, H, INNER, shape, stroke, circle, ellipse, place, U, poly, line, curve, wave_strip, stars
from nature import *
import fauna as F


def R(s):
    return np.random.default_rng(s)


def attach(g, target, overlap=1.2):
    if g.intersects(target):
        return g
    p, q = nearest_points(g, target)
    dx, dy = q.x - p.x, q.y - p.y
    d = math.hypot(dx, dy)
    k = (d + overlap) / d
    return affinity.translate(g, dx * k, dy * k)


def crescent(x, y, r, dx=0.35, dy=-0.3):
    return circle(x, y, r).difference(circle(x + r * dx, y + r * dy, r * 0.92))


def cloud_slits(rng, rows, avoid=None, x0=10, x1=145):
    """Thin horizontal cuts in the sky sheet that read as light clouds."""
    cuts = []
    for (y, n) in rows:
        x = x0 + rng.uniform(0, 20)
        for _ in range(n):
            L = rng.uniform(22, 48)
            g = wave_strip(rng, x, min(x + L, x1), y + rng.uniform(-3, 3), 1.7, amp=0.8, wl=40, var=0.3)
            cuts.append(g)
            x += L + rng.uniform(10, 30)
            if x > x1 - 15:
                break
    g = U(cuts)
    if avoid is not None:
        g = g.difference(avoid.buffer(3))
    return g


def sky(holes):
    return INNER.difference(U(holes))


def tree_line(rng, x0, x1, base, hmin, hmax, step=5.0, band=6.0, kind="fir"):
    parts = [box(-5, base - 1, W + 5, base + band)]
    x = x0
    while x < x1:
        h = rng.uniform(hmin, hmax)
        if kind == "fir":
            parts.append(fir(x, base + 1, h, h * rng.uniform(0.32, 0.42), rng))
        else:
            parts.append(foliage_clump(x, base - h * 0.55, h * 0.45, rng, holes=False))
            parts.append(line((x, base - h * 0.3), (x, base + 1), 1.6))
        x += step * rng.uniform(0.7, 1.3)
    return U(parts)


# =========================================================================== 1
def stag_lake():
    r = R(101)
    sun = circle(84, 96, 20, 64)
    L1 = sky([sun, cloud_slits(r, [(52, 3), (64, 2), (40, 2)], avoid=sun)])
    keys = [(20, 92), (40, 66), (56, 92), (78, 56), (96, 88), (118, 62), (138, 90)]
    m = mountain(r, keys, bottom=150, rough=0.18)
    m = m.difference(snowcaps(m, r, [(40, 66), (78, 56), (118, 62)], depth=12))
    L2 = m
    shore = U(hills(r, 136, 4, bottom=151), tree_line(r, -2, 157, 134, 8, 22, step=4.2))
    water = water_lines(r, -5, W + 5, 158, 228, gap=6.5, th0=1.4, th1=3.0)
    L3 = U(shore, water)
    bank = shape([(70, 240, 'c'), (78, 214), (96, 204), (122, 200), (150, 198), (160, 240, 'c')])
    stag_ = place(F.stag(), 112, 203, 0.62)
    doe_ = place(F.doe(), 138, 201, 0.55, flip=True)
    sp = spruce(16, 232, 205, 48, r)
    left = U(shape([(-4, 240, 'c'), (-4, 204), (20, 206), (44, 216), (60, 240, 'c')]))
    gr = U(grass_band(r, 76, 150, 203, 3, 10, 0.9), grass_band(r, 4, 56, 210, 3, 12, 0.8))
    rd = reeds(r, 46, 72, 224, 18, 40, 6)
    L4 = U(bank, stag_, doe_, sp, left, gr, rd)
    return [L1, L2, L3, L4]


# =========================================================================== 2
def moose_lake():
    r = R(102)
    moon = crescent(104, 46, 15)
    L1 = sky([moon, stars(r, box(8, 8, 147, 90), 16, avoid=circle(104, 46, 20))])
    far = U(hills(r, 104, 8, bottom=126), tree_line(r, -2, 157, 106, 6, 14, step=3.4))
    L2 = far.intersection(box(-5, 0, W + 5, 126))
    sides = U([fir(x, 150, h, h * 0.36, r) for (x, h) in ((10, 120), (24, 96), (36, 70), (48, 44), (148, 126), (134, 100), (122, 72), (112, 46))])
    banks = U(shape([(-5, 158), (-5, 146), (40, 146), (60, 152), (30, 156)]), shape([(160, 158), (160, 146), (110, 146), (96, 152), (126, 156)]))
    water = water_lines(r, -5, W + 5, 164, 228, gap=6.5, th0=1.2, th1=2.6)
    L3 = U(sides, banks, water)
    mz = place(F.moose(), 78, 204, 1.05)
    wl = water_lines(r, -5, W + 5, 203, 230, gap=6.5, th0=2.4, th1=4.0, amp=0.6)
    corner = U(reeds(r, 6, 34, 228, 40, 92, 9, 0.5), reeds(r, 132, 152, 228, 34, 84, 5, 0.5))
    L4 = U(mz, wl, corner)
    return [L1, L2, L3, L4]


# =========================================================================== 3
def ibex_desert():
    r = R(103)
    sun = circle(52, 64, 22, 64)
    holes = [sun] + [flyer(x, y, s, a) for (x, y, s, a) in ((100, 40, 1.0, 6), (112, 48, 0.8, -4), (122, 36, 0.7, 2))]
    L1 = sky(holes)
    mesa = mountain(r, [(10, 118), (24, 98), (52, 97), (60, 116), (80, 120), (92, 102), (128, 100), (138, 112)],
                    bottom=170, rough=0.08)
    L2 = mesa
    cliff = mountain(r, [(70, 170), (96, 120), (104, 90), (126, 76), (147, 74)], bottom=240, rough=0.12, x0=40)
    strata = U([wave_strip(r, 92, 160, y, 1.5, amp=0.8, wl=20) for y in (104, 122, 140, 158, 176)]).intersection(cliff.buffer(-2.5))
    low = hills(r, 186, 4, bottom=240)
    L3 = U(cliff.difference(strata), low)
    ledge = mountain(r, [(-5, 120), (24, 118), (48, 124), (60, 140), (68, 168), (76, 200), (90, 240)], bottom=240,
                     rough=0.06, x1=90)
    ib = place(F.ibex(), 32, 121, 0.62)
    ib2 = place(F.ibex(), 58, 144, 0.42, flip=True)
    bush = U(grass_tuft(r, 96, 222, 18, 9, 9), grass_tuft(r, 136, 220, 22, 9, 10))
    acacia_tips = []
    ac = branches(124, 228, -10, 30, 4.4, 4, r, spread=34, decay=0.8, tips=acacia_tips)
    canopy = U([ellipse(x, y, 9, 2.6) for (x, y, a, L) in acacia_tips])
    front = U(box(-5, 222, W + 5, 240), ledge)
    L4 = U(front, ib, ib2, bush, ac, canopy)
    return [L1, L2, L3, L4]


# =========================================================================== 4
def owl_night():
    r = R(104)
    moon = circle(90, 76, 30, 72)
    L1 = sky([moon, stars(r, box(8, 8, 147, 120), 16, avoid=moon.buffer(4))])
    far = U(tree_line(r, -2, 157, 176, 18, 44, step=6), box(-5, 176, W + 5, 240))
    bt = U([bare_tree(x, 178, h, r, depth=5, spread=22) for (x, h) in ((34, 84), (136, 80))])
    L2 = U(far, bt)
    t1 = bare_tree(14, 232, 200, r, depth=6, spread=20, lean=8, w=10)
    t2 = bare_tree(146, 232, 190, r, depth=6, spread=20, lean=-10, w=9)
    gnd = hills(r, 200, 3)
    L3 = U(t1, t2, gnd)
    bpts = [(160, 118), (126, 122), (96, 130), (66, 128), (40, 120)]
    br = U(stroke(bpts, 11, 3.6), stroke([(120, 123), (130, 104), (138, 92)], 3.4, 1.6),
           stroke([(70, 128), (60, 146), (54, 156)], 3.0, 1.5))
    owl = place(F.owl_perched(), 90, 121, 0.95)
    leaves = []
    for (x, y, a) in ((138, 92, 10), (132, 100, -40), (134, 98, 60), (54, 156, 170), (58, 148, 130), (42, 120, -70), (48, 122, 200),
                      (106, 128, 160), (118, 124, 200)):
        leaves.append(attach(maple_leaf(x, y, 12, a), br))
    ground = hills(r, 214, 2)
    fr = U(fern(14, 216, 46, 16, r), fern(26, 216, 34, -8, r), fern(140, 216, 44, -16, r), fern(128, 216, 30, 8, r))
    L4 = U(br, owl, leaves, ground, fr, grass_band(r, 30, 125, 214, 3, 10, 0.6))
    return [L1, L2, L3, L4]


# =========================================================================== 5
def wolves_ridge():
    r = R(105)
    moon = circle(66, 70, 30, 72)
    L1 = sky([moon, stars(r, box(8, 8, 147, 130), 18, avoid=moon.buffer(4))])
    keys = [(12, 130), (34, 96), (52, 126), (84, 104), (104, 128), (128, 88), (146, 118)]
    m = mountain(r, keys, bottom=200, rough=0.2)
    m = m.difference(snowcaps(m, r, [(34, 96), (84, 104), (128, 88)], depth=16))
    L2 = m
    ridge_ = mountain(r, [(-5, 196), (40, 188), (66, 174), (88, 160), (100, 156), (116, 164), (160, 176)], bottom=240, rough=0.06)
    w1 = attach(place(F.wolf_howl(), 98, 157, 0.52), ridge_)
    w2 = attach(place(F.wolf_stand(), 60, 177, 0.55), ridge_)
    L3 = U(ridge_, w1, w2)
    s1 = spruce(14, 232, 170, 46, r)
    s2 = spruce(144, 232, 190, 46, r)
    gnd = hills(r, 214, 2)
    L4 = U(s1, s2, gnd, grass_band(r, 20, 135, 213, 3, 9, 0.8))
    return [L1, L2, L3, L4]


# =========================================================================== 6
def heron_marsh():
    r = R(106)
    sun = circle(98, 118, 22, 64)
    halo = U([circle(98, 118, rr + 1.6).difference(circle(98, 118, rr)).difference(box(0, 132, 160, 240)) for rr in (27, 33)])
    L1 = sky([sun, halo, cloud_slits(r, [(70, 3), (60, 2)], avoid=circle(98, 118, 36))])
    far = tree_line(r, -2, 157, 140, 10, 26, step=7, kind="oak")
    L2 = U(far, box(-5, 140, W + 5, 150))
    mid = U(water_lines(r, -5, W + 5, 156, 228, gap=6, th0=1.3, th1=2.6),
            reeds(r, -2, 30, 166, 24, 50, 9, 0.3), reeds(r, 124, 157, 166, 24, 46, 8, 0.3))
    L3 = mid
    hr = place(F.heron(), 64, 202, 0.95)
    wl = water_lines(r, -5, W + 5, 201, 230, gap=7, th0=2.6, th1=4.2, amp=0.7)
    fg = U(reeds(r, 4, 34, 230, 70, 150, 10, 0.5), reeds(r, 118, 152, 230, 60, 140, 9, 0.5))
    lv = U([leaf(x, 232, L, L * 0.28, a) for (x, L, a) in ((16, 56, -18), (24, 44, 14), (134, 50, 20), (142, 40, -10))])
    L4 = U(hr, wl, fg, lv)
    return [L1, L2, L3, L4]


# =========================================================================== 7
def fox_autumn():
    r = R(107)
    glow = circle(80, 70, 32, 64)
    L1 = sky([glow, cloud_slits(r, [(116, 2), (30, 2)], avoid=glow)])
    trunks = []
    for x in (20, 44, 58, 104, 126, 140):
        x = x + r.uniform(-3, 3)
        w = r.uniform(3, 7)
        trunks.append(stroke([(x, -2), (x + r.uniform(-3, 3), 110), (x + r.uniform(-3, 3), 237)], w * 0.8, w))
    L2 = U(trunks, box(-5, 176, W + 5, 240))
    o1 = oak(22, 206, 190, r, crown=0.9, clump=9, depth=5, lean=10)
    o2 = oak(136, 206, 180, r, crown=0.9, clump=9, depth=5, lean=-10)
    L3 = U(o1, o2, hills(r, 202, 3))
    log = U(shape([(10, 196), (30, 190), (100, 188), (132, 192), (136, 200), (100, 202), (30, 204), (12, 204)]),
            stroke([(36, 192), (30, 182), (24, 176)], 2.6, 1.4))
    log = log.difference(U([stroke([(x, 194), (x + 18, 195)], 1.0, 1.0) for x in (44, 70, 96)]))
    log = log.difference(ellipse(128, 196, 2.4, 3.4))
    fx = place(F.fox(), 72, 190, 0.78)
    gnd = U(hills(r, 212, 2), box(-5, 200, 20, 240), box(130, 200, W + 5, 240))
    ferns = U(fern(10, 214, 48, 18, r), fern(22, 214, 34, -6, r), fern(146, 214, 52, -20, r), fern(134, 214, 36, 6, r))
    hang = stroke([(-4, 18), (30, 24), (62, 20), (84, 30)], 6, 2.4)
    lv = [attach(maple_leaf(x, y, s, a), hang) for (x, y, s, a) in
          ((20, 24, 13, 190), (34, 26, 15, 160), (48, 22, 12, 210), (62, 22, 14, 170), (76, 28, 12, 200), (84, 32, 13, 150))]
    L4 = U(log, fx, gnd, ferns, hang, lv, grass_band(r, 20, 130, 210, 3, 9, 0.7))
    return [L1, L2, L3, L4]


# =========================================================================== 8
def bear_river():
    r = R(108)
    sun = circle(112, 50, 14, 48)
    L1 = sky([sun, cloud_slits(r, [(36, 2), (70, 3)], avoid=sun)])
    keys = [(14, 104), (38, 64), (58, 92), (76, 72), (100, 100), (124, 70), (142, 96)]
    m = mountain(r, keys, bottom=150, rough=0.22)
    m = m.difference(snowcaps(m, r, [(38, 64), (76, 72), (124, 70)], depth=12))
    L2 = U(m, tree_line(r, -2, 157, 150, 6, 12, step=3.2))
    lft = curve([(70, 150), (60, 172), (78, 196), (40, 240)], res=12)
    rgt = curve([(84, 150), (84, 172), (110, 196), (128, 240)], res=12)
    river = Polygon(list(map(tuple, lft)) + list(map(tuple, rgt[::-1]))).buffer(0)
    banks = U([fir(x, b, h, h * 0.36, r) for (x, b, h) in ((12, 176, 70), (26, 172, 56), (40, 166, 40), (52, 160, 26),
                                                          (144, 176, 76), (130, 170, 58), (116, 164, 40), (104, 160, 26))])
    land = U(box(-5, 152, W + 5, 240)).difference(river)
    wl = water_lines(r, -5, W + 5, 160, 230, gap=7, th0=1.3, th1=2.6).intersection(river)
    L3 = U(banks, land, wl)
    rock = shape([(40, 240, 'c'), (44, 214), (58, 204), (84, 202), (104, 208), (114, 222), (118, 240, 'c')])
    br = place(F.bear(), 80, 204, 0.72)
    wl2 = water_lines(r, -5, W + 5, 218, 232, gap=6, th0=2.6, th1=3.4)
    tl = stroke([(-4, 30), (24, 40), (46, 56)], 5, 2)
    needles = []
    c = curve([(-4, 30), (24, 40), (46, 56)], res=20)
    for i in range(2, len(c), 2):
        x, y = c[i]
        for s in (-1, 1):
            needles.append(stroke([(x, y), (x + 3 * s + 2, y + 8 + r.uniform(0, 4))], 1.5, 1.1, res=3))
    L4 = U(rock, br, wl2, tl, needles, grass_band(r, 50, 110, 204, 3, 8, 0.5))
    return [L1, L2, L3, L4]


# =========================================================================== 9
def waterfall():
    r = R(109)
    sun = circle(46, 44, 14, 48)
    L1 = sky([sun, cloud_slits(r, [(30, 2), (58, 3)], avoid=sun)])
    wall = mountain(r, [(10, 72), (40, 60), (66, 70), (90, 66), (118, 58), (146, 74)], bottom=240, rough=0.1)
    fall = box(68, 64, 86, 168)
    streaks = U([stroke([(x, 60), (x + r.uniform(-1, 1), 120), (x, 172)], 1.4, 1.4) for x in (72, 77, 82)])
    L2 = U(wall.difference(fall), streaks)
    sides = U([spruce(x, b, h, h * 0.34, r, density=3.2) for (x, b, h) in ((16, 200, 150), (36, 196, 96), (140, 200, 156), (122, 196, 100))])
    pool = U(water_lines(r, -5, W + 5, 178, 228, gap=6, th0=1.4, th1=2.6), box(-5, 172, 52, 182), box(104, 172, W + 5, 182))
    L3 = U(sides, pool)
    rocks = U(shape([(-4, 240, 'c'), (-4, 196), (16, 192), (36, 202), (50, 222), (54, 240, 'c')]),
              shape([(159, 240, 'c'), (159, 190), (140, 192), (118, 204), (108, 224), (104, 240, 'c')]))
    fr = U(fern(10, 196, 40, 14, r), fern(146, 194, 46, -14, r), fern(30, 200, 30, 10, r))
    br = stroke([(160, 26), (130, 34), (104, 32), (88, 40)], 5, 2)
    birds = U(attach(place(F.songbird(), 122, 32, 0.75), br), attach(place(F.songbird(), 104, 30, 0.7, flip=True), br))
    lv = [attach(leaf(x, y, 9, 4, a), br) for (x, y, a) in ((140, 34, 190), (132, 36, 160), (112, 34, 200), (96, 38, 170), (90, 42, 210))]
    L4 = U(rocks, fr, br, birds, lv)
    return [L1, L2, L3, L4]


# =========================================================================== 10
def winter_birches():
    r = R(110)
    sun = circle(42, 108, 16, 48)
    L1 = sky([sun, cloud_slits(r, [(60, 3), (80, 2)], avoid=sun)])
    L2 = tree_line(r, -2, 157, 150, 8, 24, step=4.0, band=4)
    birches = []
    for (x, lean, w) in ((20, 4, 5.5), (40, -3, 4.2), (104, 3, 4.6), (122, -4, 6), (140, 2, 4)):
        tr = stroke([(x, 236), (x + lean * 0.5, 120), (x + lean, -2)], w, w * 0.7)
        marks = U([box(x + lean * (1 - y / 236) - w, y, x + lean * (1 - y / 236) - w * 0.1, y + 1.4)
                   for y in np.arange(20, 220, r.uniform(9, 14))])
        tr = tr.difference(marks.intersection(tr.buffer(-0.4)))
        birches.append(tr)
        for k in range(3):
            y0 = r.uniform(30, 120)
            s = 1 if r.random() < 0.5 else -1
            birches.append(branches(x + lean * (1 - y0 / 236), y0, s * r.uniform(40, 70), 14, 2.2, 2, r, spread=20))
    L3 = U(birches, box(-5, 206, W + 5, 240))
    snow = hills(r, 210, 3)
    st = place(F.stag(), 74, 210, 0.58)
    de = place(F.doe(), 104, 211, 0.48)
    twig = branches(-2, 20, 110, 30, 4, 4, r, spread=24)
    L4 = U(snow, st, de, twig, grass_band(r, 10, 60, 210, 2, 6, 0.5))
    return [L1, L2, L3, L4]


# =========================================================================== 11
def lone_oak():
    r = R(111)
    sun = circle(60, 128, 30, 72)
    L1 = sky([sun, cloud_slits(r, [(60, 3), (78, 2), (46, 2)], avoid=sun)])
    L2 = hills(r, 140, 8, waves=1.6)
    h3 = hills(r, 170, 7, waves=2.4)
    hedges = U([foliage_clump(x, 168 - 7 * math.sin(x / 30) - 2, r.uniform(3, 5), r, holes=False) for x in np.arange(10, 150, 9)])
    hedges = U([attach(hg, h3) for hg in (hedges.geoms if hasattr(hedges, 'geoms') else [hedges])])
    L3 = U(h3, hedges.intersection(INNER))
    knoll = shape([(-4, 240, 'c'), (-4, 210), (40, 204), (80, 196), (112, 186), (140, 182), (160, 184), (160, 240, 'c')])
    tree_ = oak(116, 188, 150, r, crown=1.15, clump=6.5, depth=6)
    d1 = place(F.doe(), 56, 202, 0.5)
    L4 = U(knoll, tree_, d1, grass_band(r, 6, 150, 200, 4, 12, 0.9))
    return [L1, L2, L3, L4]


# =========================================================================== 12
def rocky_coast():
    r = R(112)
    sun = circle(108, 96, 18, 48)
    holes = [sun, cloud_slits(r, [(60, 2), (40, 2)], avoid=sun)] + [flyer(x, y, s, a) for (x, y, s, a) in ((40, 56, 1.0, -5), (54, 48, 0.8, 4))]
    L1 = sky(holes)
    head = mountain(r, [(70, 118), (100, 104), (130, 88), (160, 80)], bottom=240, rough=0.08, x0=60)
    sea_far = U(box(-5, 118, W + 5, 121), water_lines(r, -5, W + 5, 126, 240, gap=5, th0=0.0, th1=1.6))
    L2 = U(head, sea_far)
    stack = mountain(r, [(100, 186), (106, 172), (114, 164), (124, 170), (134, 160), (146, 168)], bottom=240, rough=0.1, x0=96, x1=160)
    stack = stack.difference(U([stroke([(94, y), (106, y + 2)], 1.2, 1.2) for y in (146, 168, 190)]))
    backing = shape([(-4, 240, 'c'), (-4, 140), (24, 140), (46, 152), (62, 174), (74, 204), (78, 240, 'c')])
    L3 = U(water_lines(r, -5, W + 5, 150, 230, gap=6, th0=1.6, th1=3.0), stack, backing)
    cliff = shape([(-4, 240, 'c'), (-4, 150), (20, 148), (40, 158), (56, 176), (66, 200), (70, 240, 'c')])
    cliff = cliff.difference(U([stroke([(14, y), (34, y + 6), (50, y + 18)], 1.3, 1.2) for y in (170, 192)]))
    g1 = attach(place(F.gull(), 30, 151, 0.7), cliff)
    g2 = attach(place(F.gull(), 46, 160, 0.6, flip=True), cliff)
    gr = grass_tuft(r, 12, 150, 14, 9, 8)
    waves = water_lines(r, -5, W + 5, 214, 232, gap=6, th0=3, th1=4, amp=1.4, wl=16)
    L4 = U(cliff, g1, g2, gr, waves)
    return [L1, L2, L3, L4]


# =========================================================================== 13
def alpine_layers():
    r = R(113)
    sun = circle(52, 52, 15, 48)
    L1 = sky([sun, cloud_slits(r, [(34, 2), (76, 3)], avoid=sun)])
    k2 = [(10, 92), (30, 64), (46, 84), (70, 52), (94, 86), (112, 60), (132, 80), (146, 70)]
    m2 = mountain(r, k2, rough=0.22)
    m2 = m2.difference(snowcaps(m2, r, [(30, 64), (70, 52), (112, 60)], depth=14))
    k3 = [(14, 128), (40, 104), (68, 124), (96, 98), (128, 122), (146, 110)]
    m3 = mountain(r, k3, rough=0.2)
    m4 = U(hills(r, 160, 8, waves=1.4), tree_line(r, -2, 157, 158, 6, 16, step=3.6, band=10).intersection(box(-5, 0, W + 5, 240)))
    s1 = U(spruce(18, 234, 150, 44, r), spruce(40, 236, 90, 30, r), spruce(140, 234, 170, 46, r))
    rocks = U(shape([(-4, 240, 'c'), (-4, 206), (30, 200), (66, 210), (100, 206), (130, 212), (160, 204), (160, 240, 'c')]))
    L5 = U(s1, rocks, grass_band(r, 50, 130, 208, 3, 9, 0.6))
    return [L1, m2, m3, m4, L5]


# =========================================================================== 14
def blossom_mountain():
    r = R(114)
    sun = circle(104, 78, 22, 64)
    L1 = sky([sun, cloud_slits(r, [(46, 2), (110, 2)], avoid=sun)])
    mt = mountain(r, [(20, 170), (56, 110), (74, 84), (84, 84), (102, 110), (140, 168)], bottom=240, rough=0.03)
    cap = poly([(74, 84), (84, 84), (94, 100), (89, 97), (85, 104), (80, 96), (75, 103), (70, 96), (64, 100)])
    L2 = mt.difference(cap.intersection(mt.buffer(-1.5)))
    mist = U(hills(r, 180, 4, waves=1.2))
    pagoda = []
    px, base = 116, 182
    for k in range(4):
        y = base - k * 11
        wdt = 22 - k * 4
        pagoda.append(box(px - wdt * 0.32, y - 9, px + wdt * 0.32, y))
        pagoda.append(shape([(px - wdt / 2 - 3, y - 8, 'c'), (px - wdt / 2, y - 10), (px, y - 12), (px + wdt / 2, y - 10), (px + wdt / 2 + 3, y - 8, 'c')]))
    pagoda.append(line((px, base - 44), (px, base - 52), 1.4))
    pine_on_rock = U([fir(x, 184, h, h * 0.34, r) for (x, h) in ((14, 64), (26, 46), (36, 30), (46, 20))])
    pads = shape([(-4, 200), (-4, 180), (20, 176), (44, 182), (54, 190)])
    L3 = U(mist, attach(U(pagoda), mist, 2.0), pine_on_rock, pads)
    bpts = [(-4, 22), (30, 30), (64, 26), (92, 40), (112, 38)]
    br = U(stroke(bpts, 6, 2.2), stroke([(30, 30), (40, 50), (38, 62)], 2.6, 1.4), stroke([(64, 27), (76, 14), (88, 10)], 2.4, 1.3))

    def blossom(x, y, rr):
        p = U([circle(x + rr * 0.55 * math.cos(a), y + rr * 0.55 * math.sin(a), rr * 0.45, 16) for a in np.linspace(0, 6.28, 5, endpoint=False)])
        return p.difference(circle(x, y, rr * 0.22, 12))
    c = curve(bpts, res=20)
    fl = []
    for i in range(6, len(c) - 2, 9):
        x, y = c[i]
        fl.append(blossom(x + r.uniform(-3, 3), y + r.uniform(3, 6), r.uniform(3.4, 4.6)))
    for (x, y) in ((38, 62), (88, 10), (112, 38), (40, 50)):
        fl.append(blossom(x, y + 2, 4))
    fl = [attach(f, br) for f in fl]
    birds = U(attach(place(F.songbird(), 56, 26, 0.85), br), attach(place(F.songbird(), 78, 32, 0.75, flip=True), br))
    gnd = U(box(-5, 224, W + 5, 240), grass_band(r, 60, 150, 224, 3, 10, 0.6))
    L4 = U(br, fl, birds, gnd)
    return [L1, L2, L3, L4]


# =========================================================================== 15
def old_city():
    r = R(115)
    sun = circle(40, 56, 16, 48)
    holes = [sun, cloud_slits(r, [(36, 2), (80, 2)], avoid=sun)] + [flyer(x, y, s, a) for (x, y, s, a) in ((96, 44, 1.0, 5), (108, 36, 0.8, -4), (120, 48, 0.7, 2))]
    L1 = sky(holes)
    far = hills(r, 130, 8, waves=1.3)
    farb = U([box(x, 128 - 8 * math.sin(x / 40) - h, x + r.uniform(4, 8), 140) for x, h in
              zip(np.arange(14, 140, 9), r.uniform(2, 7, 20))])
    olives = U([foliage_clump(x, 126 - 6 * math.sin(x / 40), r.uniform(2.6, 3.6), r, holes=False) for x in np.arange(18, 140, 13)])
    L2 = U(far, farb.intersection(INNER), olives.intersection(INNER))
    parts = []
    xs = [(10, 32, 150, "flat"), (30, 46, 142, "dome"), (46, 60, 156, "flat"), (86, 104, 150, "flat"), (104, 120, 140, "dome"), (120, 140, 154, "flat")]
    for (x0, x1, top, roof) in xs:
        parts.append(facade(x0, x1, top, 190, r, roof=roof, arch=True, door=False))
    parts.append(round_dome(74, 132, 16, drum=6))
    parts.append(box(56, 132, 92, 190))
    parts.append(tower(132, 108, 190, 8, spire=False))
    parts.append(U(box(128, 100, 136, 110), circle(132, 100, 4)))
    parts.append(tower(20, 118, 190, 7, spire=True))
    city = U(parts)
    city = city.difference(U([U(box(x, 150, x + 4, 162), circle(x + 2, 150, 2)) for x in (62, 70, 78, 86)]))
    wall = crenel(-5, W + 5, 178, 240, merlon=4)
    gate = U(box(66, 196, 84, 240), circle(75, 196, 9, 32))
    wall = wall.difference(gate).difference(U([box(x, 186, x + 1.6, 192) for x in (20, 40, 110, 130)]))
    L3 = U(city, wall)
    cy = U(cypress(14, 230, 110, 14, r), cypress(28, 230, 80, 11, r), cypress(144, 230, 120, 15, r))
    ol = olive(118, 230, 90, r)
    gnd = U(box(-5, 222, W + 5, 240), grass_band(r, 30, 100, 222, 3, 9, 0.6))
    L4 = U(cy, ol, gnd)
    return [L1, L2, L3, L4]


# =========================================================================== 16
def skyline_bridge():
    r = R(116)
    moon = crescent(120, 40, 12)
    L1 = sky([moon, stars(r, box(8, 8, 147, 80), 12, avoid=circle(120, 40, 16))])
    far = []
    x = -2
    for (w, top, st) in ((12, 120, 0), (9, 104, 3), (14, 112, 1), (10, 128, 0), (8, 92, 3), (16, 108, 1), (11, 122, 2),
                         (9, 98, 0), (14, 116, 1), (10, 86, 3), (12, 110, 2), (10, 124, 0), (14, 100, 1)):
        far.append(skyscraper(x, x + w, top, 240, r, style=st).union(box(x, top, x + w, 240)))
        x += w + 0.5
    L2 = U(far)
    mid = []
    x = -4
    while x < W:
        w = r.uniform(9, 16)
        top = r.uniform(132, 158)
        mid.append(facade(x, x + w, top, 178, r, roof=r.choice(["flat", "step", "flat"]), door=False))
        x += w + 0.4
    water = water_lines(r, -5, W + 5, 184, 230, gap=6, th0=1.2, th1=2.4)
    L3 = U(mid, box(-5, 176, W + 5, 181), water)
    deck = box(-5, 190, W + 5, 196)
    tw = U(box(40, 88, 46, 240), box(108, 88, 114, 240), box(40, 104, 46, 107).union(box(108, 104, 114, 107)),
           box(38, 84, 48, 89), box(106, 84, 116, 89))
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
    emb = U(box(-5, 214, W + 5, 240), box(-5, 208, W + 5, 210))
    rail = U([box(x, 208, x + 1.4, 216) for x in np.arange(0, 156, 6)])
    lamps = U([U(line((x, 214), (x, 178), 1.8), stroke([(x, 180), (x + 4, 176), (x + 7, 178)], 1.4, 1.4), ellipse(x + 7, 180, 2.4, 1.8)) for x in (70, 132)])
    trees = U(oak(12, 216, 110, r, crown=0.8, clump=8, depth=4))
    L4 = U(deck, tw, cable, hangers, emb, rail, lamps, trees)
    return [L1, L2, L3, L4]


# =========================================================================== 17
def rooftops_night():
    r = R(117)
    moon = crescent(114, 42, 16)
    L1 = sky([moon, stars(r, box(8, 8, 147, 100), 16, avoid=circle(114, 42, 20))])
    far = [box(-5, 140, W + 5, 240)]
    far.append(tower(40, 70, 140, 10, spire=True))
    far.append(onion_dome(74, 116, 9))
    far.append(box(64, 116, 84, 140))
    far.append(round_dome(100, 118, 12))
    for x in np.arange(-2, 156, 12):
        far.append(facade(x, x + 11, r.uniform(116, 132), 140, r, roof="steep", win=False, door=False))
    L2 = U(far)
    mid = []
    x = -4
    while x < W:
        w = r.uniform(18, 28)
        mid.append(facade(x, x + w, r.uniform(140, 160), 240, r, roof=r.choice(["gable", "steep", "flat"]), chimney=True, door=False))
        x += w
    L3 = U(mid)
    roof = poly([(-5, 240), (-5, 200), (40, 176), (120, 176), (160, 200), (160, 240)])
    roof = roof.difference(U([stroke([(x, 186), (x - 30 * 0.15, 238)], 1.2, 1.2) for x in np.arange(30, 130, 10)]).intersection(roof.buffer(-2)))
    chim = U(box(96, 150, 106, 178), box(94, 146, 108, 151))
    ant = U(line((60, 177), (60, 136), 1.6), line((50, 144), (70, 144), 1.6), line((53, 152), (67, 152), 1.6), line((55, 160), (65, 160), 1.6))
    win = shape([(30, 214, 'c'), (30, 200), (38, 192), (46, 200), (46, 214, 'c')]).difference(box(37.3, 192, 38.7, 214))
    birds = U(place(F.songbird(), 78, 177, 0.6), place(F.songbird(), 86, 177, 0.55, flip=True), place(F.songbird(), 116, 177, 0.6))
    L4 = U(roof.difference(win), chim, ant, birds)
    return [L1, L2, L3, L4]


# =========================================================================== 18
def harbor():
    r = R(118)
    sun = circle(34, 60, 15, 48)
    L1 = sky([sun, cloud_slits(r, [(38, 2), (84, 2)], avoid=sun)])
    hill = hills(r, 118, 14, waves=1.0)
    houses = []
    for row, (y0, n) in enumerate(((126, 10), (114, 8), (102, 6))):
        xs = np.linspace(40 + row * 10, 150, n)
        for x in xs:
            hy = y0 + r.uniform(-3, 3)
            houses.append(facade(x, x + r.uniform(6, 9), hy, hy + 14, r, roof=r.choice(["gable", "flat"]), win=False, door=False))
    houses.append(tower(96, 70, 120, 6, spire=True))
    L2 = U(hill, houses).intersection(box(-5, 0, W + 5, 240))
    quay = box(-5, 146, W + 5, 152)
    water = water_lines(r, -5, W + 5, 160, 230, gap=6, th0=1.4, th1=2.6)
    boats = U(boat(30, 168, 26, r, sail=True), boat(66, 166, 20, r), boat(104, 170, 30, r, sail=True))
    L3 = U(quay, water, boats, U([facade(x, x + 12, 132, 150, r, roof="gable", door=False) for x in (-2, 10, 128, 140)]))
    pier = U(box(84, 196, 160, 202), U([box(x, 196, x + 4, 240) for x in (88, 108, 128, 148)]))
    rope = stroke([(90, 190), (100, 198), (110, 190)], 1.4, 1.4)
    posts = U([box(x, 186, x + 4, 198) for x in (88, 108)])
    gl = place(F.gull(), 110, 186, 0.75)
    bow = shape([(-4, 240, 'c'), (-4, 196), (30, 198), (54, 204), (62, 212), (50, 222), (20, 228)])
    mast = U(line((16, 200), (16, 150), 2.2), stroke([(16, 152), (50, 204)], 1.3, 1.3))
    wl = water_lines(r, -5, W + 5, 214, 232, gap=7, th0=3.0, th1=3.6)
    L4 = U(pier, rope, posts, gl, bow, mast, wl)
    return [L1, L2, L3, L4]


# =========================================================================== 19
def med_village():
    r = R(119)
    sun = circle(108, 62, 18, 48)
    L1 = sky([sun, cloud_slits(r, [(40, 2), (88, 2)], avoid=sun)])
    hl = hills(r, 120, 10, waves=1.5)
    L2 = U(hl, U([attach(cypress(x, 118 - 10 * math.sin(x / 30), r.uniform(10, 16), 3.6, r), hl) for x in np.arange(12, 146, 17)]))
    hill = shape([(-4, 240, 'c'), (-4, 180), (30, 160), (60, 146), (96, 144), (124, 152), (160, 170), (160, 240, 'c')])
    houses = []
    for (x0, x1, top, base) in ((30, 44, 146, 166), (44, 60, 134, 156), (60, 74, 128, 148), (74, 92, 132, 150), (92, 106, 136, 152),
                                (106, 120, 142, 158), (120, 134, 150, 166), (50, 66, 156, 176), (82, 98, 152, 172), (110, 126, 162, 178)):
        f = box(x0, top, x1, base + 3)
        f = f.difference(U(box(x0 + 3, top + 4, x0 + 6, top + 9), box(x1 - 6, top + 4, x1 - 3, top + 9)))
        houses.append(f)
    houses.append(U(box(64, 98, 72, 130), circle(68, 98, 4), line((68, 94), (68, 88), 1.3)))
    houses[-1] = houses[-1].difference(U(box(66.4, 104, 69.6, 110), circle(68, 104, 1.6)))
    houses.append(round_dome(84, 132, 9, drum=3))
    cyp = U([cypress(x, b, h, 6, r) for (x, b, h) in ((26, 166, 30), (138, 168, 34), (100, 154, 24)) ])
    L3 = U(hill, houses, cyp)
    ol = olive(30, 232, 120, r)
    wall = box(-5, 212, W + 5, 240)
    stones = U([ellipse(x + (6 if (int(y) // 7) % 2 else 0), y, 5, 2.2) for y in (218, 225, 232) for x in np.arange(4, 156, 12)])
    wall = wall.difference(stones.intersection(wall.buffer(-1.5)))
    agave = U([leaf(126, 213, L, L * 0.22, a) for (L, a) in ((26, -40), (30, -18), (32, 4), (28, 24), (22, 46))])
    L4 = U(ol, wall, agave)
    return [L1, L2, L3, L4]


# =========================================================================== 20
def stone_bridge():
    r = R(120)
    moon = circle(110, 44, 13, 48)
    L1 = sky([moon, stars(r, box(8, 8, 147, 90), 12, avoid=moon.buffer(4))])
    far = [box(-5, 128, W + 5, 240)]
    far.append(tower(66, 62, 130, 10, spire=True))
    far.append(tower(86, 62, 130, 10, spire=True))
    far.append(facade(60, 92, 96, 130, r, roof="steep", door=False))
    for x in np.arange(-2, 156, 10):
        if 56 < x < 94:
            continue
        far.append(facade(x, x + 9.5, r.uniform(108, 122), 130, r, roof="steep", win=False, door=False))
    L2 = U(far)
    left = U([facade(x0, x1, top, 186, r, roof="steep", chimney=True, door=False) for (x0, x1, top) in ((-4, 16, 108), (16, 34, 120), (34, 48, 132))])
    right = U([facade(x0, x1, top, 186, r, roof="steep", chimney=True, door=False) for (x0, x1, top) in ((108, 124, 130), (124, 140, 116), (140, 160, 104))])
    water = water_lines(r, -5, W + 5, 194, 230, gap=6, th0=1.4, th1=2.6)
    L3 = U(left, right, box(-5, 184, W + 5, 190), water)
    br = arch_bridge(-5, W + 5, 150, 214, n=3, pier=9, th=7)
    lamps = U([U(line((x, 148), (x, 128), 1.6), ellipse(x, 126, 2.2, 3)) for x in (30, 78, 126)])
    wl = water_lines(r, -5, W + 5, 216, 232, gap=6, th0=2.6, th1=3.4)
    willow = []
    top = stroke([(-4, 14), (20, 22), (44, 20)], 5, 2.4)
    willow.append(top)
    for k, x in enumerate(np.arange(0, 46, 4.5)):
        y0 = 18 + abs(x - 20) * 0.1
        L = r.uniform(40, 90)
        pts = [(x, y0), (x + 2, y0 + L * 0.5), (x + r.uniform(-2, 5), y0 + L)]
        willow.append(stroke(pts, 1.6, 1.2))
        c = curve(pts, res=6)
        for i in range(2, len(c), 2):
            willow.append(leaf(c[i][0], c[i][1], 6, 2, 180 + (25 if i % 4 else -25)))
    L4 = U(br, lamps, wl, willow)
    return [L1, L2, L3, L4]


SCENES = [
    ("stag-lake", "אייל ואיילה באגם ההרים", stag_lake),
    ("moose-lake", "אייל באגם בלילה", moose_lake),
    ("ibex-desert", "יעלים בצוקי המדבר", ibex_desert),
    ("owl-night", "ינשוף ביער הלילה", owl_night),
    ("wolves-ridge", "זאבים על הרכס", wolves_ridge),
    ("heron-marsh", "אנפה בביצה בשקיעה", heron_marsh),
    ("fox-autumn", "שועל ביער הסתווי", fox_autumn),
    ("bear-river", "דוב בנהר ההרים", bear_river),
    ("waterfall", "מפל בין הצוקים", waterfall),
    ("winter-birches", "יער ליבנים בחורף", winter_birches),
    ("lone-oak", "אלון בודד על הגבעה", lone_oak),
    ("rocky-coast", "חוף סלעי ושחפים", rocky_coast),
    ("alpine", "רכסי האלפים", alpine_layers),
    ("blossom", "ענף פורח והר", blossom_mountain),
    ("old-city", "העיר העתיקה", old_city),
    ("skyline", "קו רקיע וגשר תלוי", skyline_bridge),
    ("rooftops", "גגות העיר בלילה", rooftops_night),
    ("harbor", "עיר נמל", harbor),
    ("village", "כפר ים תיכוני", med_village),
    ("stone-bridge", "גשר אבן בעיר העתיקה", stone_bridge),
]
