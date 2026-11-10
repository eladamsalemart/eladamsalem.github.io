import math
import numpy as np
from shapely.geometry import Polygon, Point, box
from lib import *
from shapely import affinity
import animals as A


def R(seed):
    return np.random.default_rng(seed)


def y_at(pts, x):
    c = curve(pts, res=30)
    order = np.argsort(c[:, 0])
    return float(np.interp(x, c[order, 0], c[order, 1]))


def attach(g, target, overlap=1.2):
    """Move g so it touches target (so nothing floats)."""
    from shapely.ops import nearest_points
    if g.intersects(target):
        return g
    p, q = nearest_points(g, target)
    dx, dy = q.x - p.x, q.y - p.y
    d = math.hypot(dx, dy)
    k = (d + overlap) / d
    return affinity.translate(g, dx * k, dy * k)


def sun_corner(cx, cy, r0, a0, a1, n, rin=None):
    rays = [stroke([(cx + (r0 - 3) * math.cos(a), cy + (r0 - 3) * math.sin(a)),
                    (cx + (r0 + 13) * math.cos(a), cy + (r0 + 13) * math.sin(a))], 3.2, 1.4)
            for a in np.linspace(a0, a1, n)]
    disc = circle(cx, cy, r0 - 2)
    ring_gap = circle(cx, cy, r0 + 0.5).difference(circle(cx, cy, r0 - 2))
    return U(disc, rays)


def mushroom(x, y, h, r, spots=True, rng=None):
    stem = shape([(x - r * 0.22, y + 1), (x - r * 0.18, y - h * 0.5), (x - r * 0.25, y - h),
                  (x + r * 0.25, y - h), (x + r * 0.18, y - h * 0.5), (x + r * 0.22, y + 1)])
    cap = shape([(x - r, y - h + r * 0.05, 'c'), (x - r * 0.8, y - h - r * 0.55), (x, y - h - r * 0.8),
                 (x + r * 0.8, y - h - r * 0.55), (x + r, y - h + r * 0.05, 'c'), (x, y - h - r * 0.08)])
    g = U(stem, cap)
    if spots:
        for (dx, dy, rr) in ((-0.5, -0.35, 0.13), (0.05, -0.55, 0.15), (0.55, -0.3, 0.12), (-0.15, -0.2, 0.09)):
            g = g.difference(circle(x + dx * r, y - h + dy * r, max(rr * r, 1.3), 16))
    return g


def cattail(x, y, h, lean=0, w=2.0):
    top = (x + lean, y - h)
    st = stroke([(x, y), (x + lean * 0.4, y - h * 0.5), top], w, 1.6)
    head = ellipse(top[0] - lean * 0.08, top[1] + 10, 2.6, 8, math.degrees(math.atan2(lean, h)) * 0.5)
    tip = stroke([top, (top[0] + lean * 0.04, top[1] - 7)], 1.4, 1.2)
    return U(st, head, tip)


def reed(x, y, h, bend, w=2.2):
    return stroke([(x, y), (x + bend * 0.3, y - h * 0.5), (x + bend, y - h)], w, 1.2)


def cloud_hole(x, y, s):
    return U(ellipse(x, y, 14 * s, 6 * s), circle(x - 5 * s, y - 4 * s, 6 * s), circle(x + 4 * s, y - 6 * s, 7.5 * s))


# ===================================================================== 1
def wolf_moon():
    r = R(1)
    moon = circle(82, 92, 54, 96)
    rock = shape([(4, 240, 'c'), (4, 146), (16, 142), (30, 150), (60, 154), (96, 156), (108, 166),
                  (126, 178), (150, 182), (152, 240, 'c')])
    sky = INNER.difference(moon)
    st = stars(r, box(8, 8, 147, 150), 16, avoid=moon.buffer(4))
    black = sky.difference(st)
    wolf = place(A.wolf_howl(), 76, 156, 1.0)
    pines = U(pine(130, 196, 120, 38, r), pine(146, 190, 92, 30, r), pine(114, 196, 74, 26, r))
    gr = grass(r, 10, 110, 154, 4, 11, 30)
    black = U(black, rock, wolf, pines, gr)
    return black


# ===================================================================== 2
def owl_branch():
    r = R(2)
    bpts = [(156, 116), (120, 122), (82, 132), (44, 130), (20, 120)]
    branch = stroke(bpts, 11, 3.2)
    twigs = U(stroke([(118, 122), (130, 104), (134, 90)], 3.2, 1.4),
              stroke([(46, 130), (34, 146), (30, 158)], 3, 1.4),
              stroke([(60, 132), (54, 112), (58, 98)], 3, 1.4))
    leaves = []
    for (x, y, a, L) in ((134, 90, 10, 15), (128, 102, -50, 13), (132, 98, 60, 13), (30, 158, 190, 14),
                         (34, 148, 120, 13), (58, 98, 0, 13), (54, 110, -60, 12), (20, 120, -70, 14),
                         (26, 122, 210, 13), (100, 126, 160, 14), (110, 124, 200, 13), (142, 118, 170, 15)):
        leaves.append(leaf(x, y, L, L * 0.45, a))
    stems = U(branch, twigs)
    leaves = [attach(l, stems) for l in leaves]
    owl = place(A.owl(), 84, 128, 1.25)
    # top left hanging branch
    b2 = stroke([(4, 30), (30, 34), (56, 30), (72, 38)], 6, 2)
    lv2 = [leaf(x, y, 13, 6, a) for (x, y, a) in ((30, 34, 160), (44, 33, 200), (58, 31, 150), (70, 38, 190), (20, 32, 190))]
    # crescent moon cut from a corner cloud is avoided: simple crescent hanging from the branch
    moon = circle(118, 42, 15).difference(circle(124, 37, 13))
    moon_hang = stroke([(118, 24), (113, 30)], 1.4, 1.4)
    hook = stroke([(118, 8), (118, 24)], 1.4, 1.4)
    ground = ridge(r, 8, 147, 214, 3, n=40)
    ferns = []
    for (x, h, bend) in ((14, 42, 14), (24, 30, -8), (132, 40, -14), (142, 30, 8), (120, 24, 10)):
        ferns.append(stroke([(x, 216), (x + bend * 0.4, 216 - h * 0.6), (x + bend, 216 - h)], 2.6, 1.2))
        for k in range(1, 7):
            t = k / 7
            px = x + bend * t ** 1.4
            py = 216 - h * t
            ferns.append(leaf(px, py, 9 * (1 - t * 0.6), 3.2, 60 + bend))
            ferns.append(leaf(px, py, 9 * (1 - t * 0.6), 3.2, -60 + bend))
    gr = grass(r, 30, 125, 214, 4, 14, 26)
    return U(branch, twigs, leaves, owl, b2, lv2, moon, moon_hang, hook, ground, ferns, gr)


# ===================================================================== 3
def lighthouse():
    r = R(3)
    black = INNER
    # tower as light (white) with black stripes
    tower = poly([(96, 168), (100, 76), (114, 76), (118, 168)])
    stripes = U([box(80, y, 130, y + 8) for y in (90, 112, 134, 156)])
    door = box(103, 156, 111, 170)
    gallery = box(94, 70, 120, 76).difference(U([box(x, 70, x + 1.6, 76) for x in (97, 101.5, 106, 110.5, 115)]))
    lantern = box(100, 54, 114, 68).difference(box(106.2, 54, 107.8, 68))
    roof = poly([(98, 52), (107, 42), (116, 52)])
    light = U(tower.difference(stripes).difference(door), gallery, lantern, roof)
    beams = U(poly([(100, 58), (0, 22), (0, 82), (100, 63)]), poly([(114, 58), (160, 44), (160, 70), (114, 63)]))
    black = black.difference(light).difference(beams)
    st = stars(r, box(8, 8, 147, 140), 14, avoid=U(beams, light).buffer(3))
    black = black.difference(st)
    # gulls
    for (x, y, s, a) in ((36, 104, 1.0, -8), (52, 118, 0.8, 6), (26, 124, 0.7, -4)):
        black = black.difference(flyer(x, y, s, a))
    # sea: wavy slits
    sea_y = 176
    black = black.difference(box(8, sea_y - 8, 92, sea_y - 6.5).buffer(0))  # thin horizon glow
    for k, y in enumerate(np.arange(sea_y + 2, 226, 7.5)):
        x0 = 10 + (k % 2) * 8 + r.uniform(0, 6)
        while x0 < 140:
            L = r.uniform(14, 34)
            seg = wave_strip(r, x0, min(x0 + L, 145), y, 1.8, amp=1.3, wl=16, var=0.2)
            black = black.difference(seg)
            x0 += L + r.uniform(5, 10)
    rocks = shape([(78, 240, 'c'), (80, 196), (88, 182), (96, 170), (118, 168), (130, 172), (140, 180),
                   (150, 186), (152, 240, 'c')])
    # rocks must stay black; cut a few crack lines for texture
    rocks = rocks.difference(stroke([(98, 186), (104, 198), (100, 214)], 1.5, 1.3))
    rocks = rocks.difference(stroke([(126, 184), (132, 196)], 1.5, 1.3))
    return U(black, rocks)


# ===================================================================== 4
def sailboat_night():
    r = R(4)
    black = INNER
    moon = circle(42, 46, 17).difference(circle(51, 40, 15))
    black = black.difference(moon)
    st = stars(r, box(8, 8, 147, 120), 18, avoid=circle(42, 46, 20))
    black = black.difference(st)
    # boat (light through sails)
    main = poly([(92, 66), (92, 136), (128, 136)])
    main = shape([(91, 64, 'c'), (100, 96), (116, 122), (130, 136, 'c'), (91, 136, 'c')])
    jib = shape([(87, 74, 'c'), (84, 104), (76, 128), (68, 136, 'c'), (87, 136, 'c')])
    hull = shape([(62, 142, 'c'), (136, 142, 'c'), (126, 152), (76, 152)])
    flag = poly([(90, 56), (90, 62), (100, 59)])
    boat = U(main, jib, hull, flag)
    black = black.difference(boat)
    # sea
    horizon = 150
    black = black.difference(box(8, horizon - 1.2, 60, horizon + 0.6)).difference(box(140, horizon - 1.2, 147, horizon + 0.6))
    for k, y in enumerate(np.arange(horizon + 10, 226, 6.5)):
        x0 = 10 + r.uniform(0, 10)
        while x0 < 142:
            L = r.uniform(10, 30)
            near = abs((x0 + L / 2) - 42) < 18 or (abs((x0 + L / 2) - 98) < 24 and y < 190)
            th = 2.4 if near else 1.5
            black = black.difference(wave_strip(r, x0, min(x0 + L, 145), y, th, amp=1.0, wl=14, var=0.2))
            x0 += L + r.uniform(4, 9)
    # reflection of the sails
    return black


# ===================================================================== 5
def fox_forest():
    r = R(5)
    trees = U(pine_soft(10, 206, 160, 40, r), pine_soft(146, 206, 170, 44, r),
              pine(30, 204, 70, 22, r), pine(126, 204, 62, 20, r))
    ground = ridge(r, 8, 147, 204, 2.5, n=40)
    fox = place(A.fox_sit(), 72, 206, 1.05)
    shrooms = U(mushroom(108, 206, 12, 7, rng=r), mushroom(118, 206, 8, 5, rng=r), mushroom(30, 206, 9, 5.5, rng=r))
    gr = grass(r, 10, 145, 204, 4, 13, 40)
    # birds on a branch from the left tree
    br = stroke([(14, 80), (36, 74), (56, 76)], 3.4, 1.6)
    birds = attach(place(A.bird_perch(), 44, 73, 0.8, flip=True), br)
    moon = circle(96, 46, 14).difference(circle(102, 42, 12.5))
    moon_c = stroke([(88, 8), (88, 36)], 1.3, 1.3)
    return U(trees, ground, fox, shrooms, gr, br, birds, moon, moon_c)


# ===================================================================== 6
def heron_reeds():
    r = R(6)
    parts = []
    for k, y in enumerate(np.arange(186, 226, 7)):
        parts.append(wave_strip(r, 0, 155, y, 3.0 - k * 0.1, amp=1.2, wl=26))
    heron = place(A.heron(), 74, 189, 1.18)
    reeds = []
    for (x, h, lean) in ((14, 150, 8), (22, 120, -6), (30, 96, 10), (128, 160, -10), (136, 128, 6), (122, 104, -4)):
        reeds.append(cattail(x, 196, h, lean))
    for (x, h, b) in ((10, 90, 18), (18, 70, -14), (36, 60, 16), (140, 96, -20), (132, 72, 14), (118, 60, -12)):
        reeds.append(reed(x, 196, h, b))
    dfly = place(A.dragonfly(), 128 - 10, 36 + 4, 0.7, rot=-70)
    pad = ellipse(104, 192, 12, 2.6).difference(poly([(104, 192), (114, 188), (116, 191)]))
    lotus = shape([(98, 190, 'c'), (99, 184), (101, 180, 'c'), (103, 184), (104, 178, 'c'), (106, 184),
                   (108, 180, 'c'), (110, 184), (110, 190, 'c')])
    return U(parts, heron, reeds, dfly, pad, lotus)


# ===================================================================== 7
def swing_tree():
    r = R(7)
    tips = []
    trunk = shape([(18, 214), (30, 206), (34, 170), (34, 120), (40, 92), (52, 76), (44, 72), (30, 90),
                   (24, 112), (20, 140), (14, 180), (8, 206)])
    bpts = [(38, 96), (70, 72), (110, 62), (150, 58)]
    big = stroke(bpts, 9, 4)
    up = tree(46, 80, 8, 30, 6, 4, r, spread=30, tips=tips)
    up2 = tree(28, 100, -30, 26, 5, 3, r, spread=28, tips=tips)
    sub = []
    for (x, a) in ((80, 10), (100, -20), (122, 20), (140, -10)):
        y = y_at(bpts, x)
        sub.append(tree(x, y, a, 16, 3.2, 2, r, spread=30, tips=tips))
    lvs = [leaf(x, y, r.uniform(8, 12), 4.6, a + r.uniform(-50, 50)) for (x, y, a) in tips]
    for (x, y, a) in tips[::2]:
        lvs.append(leaf(x, y, 9, 4, a + 70))
    rope_x = 104
    yb = y_at(bpts, rope_x)
    rope = line((rope_x, yb), (rope_x, 152), 1.8)
    rope2 = line((rope_x - 13, y_at(bpts, rope_x - 13)), (rope_x - 13, 152), 1.8)
    girl = place(A.girl_swing(), rope_x - 6, 152, 1.55)
    ground = ridge(r, 8, 147, 212, 3, n=40)
    gr = grass(r, 10, 145, 211, 4, 12, 44)
    flowers = []
    for x in (70, 84, 128, 140):
        flowers.append(stroke([(x, 212), (x + 1, 198)], 1.5, 1.3))
        flowers.append(U([ellipse(x + 1 + 3 * math.cos(a), 196 + 3 * math.sin(a), 2.2, 1.3, math.degrees(a))
                          for a in np.linspace(0, 2 * math.pi, 6, endpoint=False)]))
    return U(trunk, big, up, up2, sub, lvs, rope, rope2, girl, ground, gr, flowers)


# ===================================================================== 8
def balloons():
    r = R(8)
    black = INNER

    def balloon(cx, cy, rad):
        top = circle(cx, cy, rad)
        low = poly([(cx - rad * 0.92, cy + rad * 0.35), (cx + rad * 0.92, cy + rad * 0.35),
                    (cx + rad * 0.28, cy + rad * 1.45), (cx - rad * 0.28, cy + rad * 1.45)])
        b = shape([(cx, cy - rad), (cx + rad * 0.75, cy - rad * 0.7), (cx + rad, cy), (cx + rad * 0.7, cy + rad * 0.8),
                   (cx + rad * 0.28, cy + rad * 1.4, 'c'), (cx - rad * 0.28, cy + rad * 1.4, 'c'),
                   (cx - rad * 0.7, cy + rad * 0.8), (cx - rad, cy), (cx - rad * 0.75, cy - rad * 0.7)], res=12)
        gores = []
        for f in (-0.55, 0, 0.55):
            pts = [(cx + f * rad * 0.2, cy - rad * 1.1), (cx + f * rad * 0.95, cy - rad * 0.2),
                   (cx + f * rad * 0.8, cy + rad * 0.7), (cx + f * rad * 0.2, cy + rad * 1.5)]
            gores.append(stroke(pts, max(rad * 0.09, 1.6), max(rad * 0.07, 1.4)))
        band = box(cx - rad * 1.2, cy + rad * 0.55, cx + rad * 1.2, cy + rad * 0.55 + max(rad * 0.08, 1.6))
        hole = b.difference(U(gores, band))
        basket = box(cx - rad * 0.22, cy + rad * 1.75, cx + rad * 0.22, cy + rad * 2.05)
        return U(hole, basket)

    holes = U(balloon(54, 62, 26), balloon(118, 52, 15), balloon(110, 128, 11), balloon(28, 132, 8))
    clouds = U(cloud_hole(108, 92, 0.9), cloud_hole(34, 24, 0.7), cloud_hole(66, 140, 0.8))
    black = black.difference(holes).difference(clouds)
    black = black.difference(stars(r, box(8, 8, 147, 150), 8, avoid=U(holes, clouds).buffer(3)))
    # hills: thin cut lines + glow band
    glow = ridge(r, 0, 155, 168, 6, bottom=240).difference(ridge(r, 0, 155, 178, 7, bottom=240))
    black = black.difference(glow)
    for k, y in enumerate((192, 206, 218)):
        line_ = ridge(r, 0, 155, y, 3.5, bottom=240)
        black = black.difference(line_.difference(line_.buffer(-1.6)).intersection(box(0, 0, 155, y + 10)))
    for x, y in ((40, 199), (52, 199), (100, 212), (124, 196)):
        black = black.difference(pine(x, y, 10, 6, r, trunk=1.4))
    return black


# ===================================================================== 9
def cat_roof():
    r = R(9)
    moon = circle(80, 88, 56, 96)
    black = INNER.difference(moon)
    black = black.difference(stars(r, box(8, 8, 147, 150), 18, avoid=moon.buffer(3)))
    roof = poly([(20, 240), (20, 176), (80, 146), (140, 176), (140, 240)])
    cat = place(A.cat_sit_back(), 82, 148, 1.15)
    chimney = U(box(112, 140, 122, 175), box(110, 136, 124, 141))
    smoke = U(stroke([(117, 136), (113, 124), (121, 114), (115, 100)], 3.0, 1.6))
    house2 = poly([(-2, 240), (-2, 158), (24, 140), (50, 160), (50, 240)])
    house3 = poly([(110, 240), (110, 166), (134, 150), (160, 166), (160, 240)])
    antenna = U(line((36, 150), (36, 120), 1.6), line((28, 126), (44, 126), 1.6), line((30, 132), (42, 132), 1.6))
    black = U(black, roof, cat, chimney, smoke, house2, house3, antenna)
    # lit windows
    wins = []
    for (x, y, w, h) in ((50, 196, 12, 14), (98, 196, 12, 14), (72, 182, 16, 10), (12, 176, 8, 10), (28, 176, 8, 10),
                         (14, 200, 8, 10), (128, 184, 9, 11), (128, 206, 9, 11), (74, 206, 12, 18)):
        wb = box(x, y, x + w, y + h)
        if w >= 12:
            wb = wb.difference(box(x + w / 2 - 0.8, y, x + w / 2 + 0.8, y + h)).difference(box(x, y + h / 2 - 0.8, x + w, y + h / 2 + 0.8))
        wins.append(wb)
    # outline cuts so the roofs read against the sky
    for p in ((20, 176, 80, 149.5, 140, 176), ):
        pass
    black = black.difference(U(wins))
    roofline = stroke([(22, 178), (80, 150.5), (138, 178)], 1.4, 1.4, cap=False)
    black = black.difference(roofline.difference(cat.buffer(0.5)).difference(chimney.buffer(0.6)))
    return black


# ===================================================================== 10
def sea_turtle():
    r = R(10)
    top = ridge(r, 0, 155, 34, 3, bottom=-10)
    top = Polygon([(x, y) for x, y in np.array(top.exterior.coords)]).buffer(0)
    surf = box(0, 0, 155, 40).intersection(ridge(r, 0, 155, 34, 3, bottom=-10))
    bubbles = U([circle(x, y, rr) for (x, y, rr) in ((70, 20, 2.6), (78, 14, 1.8), (64, 28, 1.8), (120, 22, 2.2), (26, 18, 2))])
    surf = surf.difference(bubbles)
    # rays from surface: white wedges are just the gaps; add black rays strips
    rays = U([poly([(x, 30), (x + 4, 30), (x + 22, 120), (x + 20, 120)]) for x in (20, 52, 92, 124)])
    rays = rays.intersection(box(8, 8, 147, 100))
    sea_bed = ridge(r, 8, 147, 206, 4, n=40)
    kelp = []
    for (x, h, ph) in ((16, 150, 0), (26, 110, 2), (132, 140, 1), (142, 100, 3)):
        pts = [(x + 6 * math.sin(t * 3 + ph), 210 - h * t) for t in np.linspace(0, 1, 9)]
        kelp.append(stroke(pts, 3.6, 1.6))
        for k, (px, py) in enumerate(pts[1:-1]):
            s = 1 if k % 2 else -1
            kelp.append(leaf(px, py, 13, 4.6, s * 55 + r.uniform(-10, 10)))
    corals = U(tree(56, 210, -10, 16, 5, 3, r, spread=26, decay=0.8, bend=14),
               tree(100, 210, 12, 14, 4.6, 3, r, spread=30, decay=0.8, bend=14))
    corals = corals.buffer(1.0)
    turtle = place(A.turtle(), 78, 104, 1.3, rot=-10)
    # connect turtle front flipper with kelp via a fish school
    fishes = U(place(A.fish(), 122, 66, 0.9, flip=True), place(A.fish(), 134, 80, 0.75, flip=True),
               place(A.fish(), 30, 150, 0.8), place(A.fish(), 36, 64, 0.7))
    kl = U(kelp)
    fishes = U([attach(f, kl) for f in fishes.geoms])
    turtle = attach(turtle, U(kl, fishes))
    shells = U(circle(76, 206, 3.5), circle(124, 206, 3))
    return U(surf, sea_bed, kelp, corals, turtle, fishes, shells)


# ===================================================================== 11
def canoe_lake():
    r = R(11)
    mts = ridge(r, 8, 147, 100, 11, bottom=134, peaks=[(48, 56, 1.3), (106, 68, 1.1)])
    snow = U(poly([(48, 56), (36, 72), (42, 70), (46, 76), (52, 70), (58, 74), (62, 70)]),
             poly([(106, 68), (96, 80), (102, 78), (106, 84), (110, 78), (116, 80)]))
    mts = mts.difference(snow.intersection(mts.buffer(-2)))
    for x in np.arange(40, 120, 6.5):
        mts = mts.difference(pine(x + r.uniform(-1.5, 1.5), 133, r.uniform(9, 14), 5.5, r, trunk=1.3).intersection(mts.buffer(-1.4)))
    lake = [wave_strip(r, 0, 155, y, 2.0 + k * 0.25, amp=0.8, wl=30) for k, y in enumerate(np.arange(194, 228, 6))]
    canoe = place(A.paddler(), 80, 192, 0.9)
    pines = U([pine(x, b_, h, w, r) for (x, b_, h, w) in ((12, 186, 150, 32), (30, 186, 104, 24), (144, 186, 158, 32),
                                                          (126, 186, 108, 26), (112, 186, 64, 18), (44, 186, 58, 16))])
    shore = U(shape([(-4, 200), (-4, 182), (24, 184), (40, 190), (30, 196)]),
              shape([(159, 200), (159, 182), (130, 184), (118, 190), (126, 196)]))
    birds = U(flyer(70, 26, 1.0, 5), flyer(84, 18, 0.8, -6))
    return U(mts, lake, canoe, pines, shore)


# ===================================================================== 12
def bear_mountains():
    r = R(12)
    far = ridge(r, 8, 147, 100, 14, bottom=134, peaks=[(40, 46, 1.4), (110, 60, 1.2)])
    snow = U(poly([(40, 46), (28, 62), (34, 60), (38, 66), (44, 60), (50, 64), (56, 59)]),
             poly([(110, 60), (100, 74), (106, 72), (110, 78), (114, 72), (120, 74)]))
    far = far.difference(snow.intersection(far.buffer(-2)))
    # far trees line at the foot of the mountains (white tree cut-outs)
    for x in np.arange(14, 146, 7):
        far = far.difference(pine(x + r.uniform(-2, 2), 132, r.uniform(10, 16), 6, r, trunk=1.4).intersection(far.buffer(-1.5)))
    sun = circle(76, 40, 12)
    sun_ring = circle(76, 40, 17).difference(circle(76, 40, 15.4))
    sky = INNER.difference(box(8, 8, 147, 30))  # placeholder unused
    ground = ridge(r, 8, 147, 200, 2, n=40)
    bear = place(A.bear_walk(), 78, 200, 0.95)
    trees = U(pine(16, 200, 110, 34, r), pine(140, 200, 118, 34, r), pine(124, 200, 70, 22, r))
    gr = U(grass(r, 10, 40, 200, 4, 10, 12), grass(r, 118, 145, 200, 4, 10, 10), grass(r, 40, 118, 200, 2, 5, 20))
    birds = []
    rays = U([stroke([(76 + 20 * math.cos(a), 40 + 20 * math.sin(a)), (76 + 27 * math.cos(a), 40 + 27 * math.sin(a))], 2, 1.4)
              for a in np.linspace(math.pi, 2 * math.pi, 7)])
    top_band = box(0, 0, 155, 9)
    rays_c = U([stroke([(76 + 12 * math.cos(a), 40 + 12 * math.sin(a)), (76 + 17 * math.cos(a), 40 + 17 * math.sin(a))], 1.6, 1.6)
                for a in np.linspace(-math.pi / 2, -math.pi / 2, 1)])
    sunshape = U(sun, rays_c, stroke([(76, 8), (76, 28)], 1.6, 1.6))
    return U(far, ground, bear, trees, gr).difference(U(flyer(70, 26, 1.0, 4), flyer(84, 20, 0.8, -4)))


# ===================================================================== 13
def hummingbird_flowers():
    r = R(13)
    ground = ridge(r, 8, 147, 214, 2, n=30)
    parts = [ground]
    stem = [(138, 216), (134, 150), (122, 88), (100, 52), (72, 40), (46, 44)]
    parts.append(stroke(stem, 4, 2))
    c = curve(stem, res=20)

    def bell(x, y, s=1.0):
        ped = stroke([(0, 0), (1, 6), (0, 12)], 1.4, 1.4)
        sep = shape([(0, 11, 'c'), (-8, 18), (-13, 24, 'c'), (-5, 21), (-3, 24), (0, 22), (3, 24), (5, 21), (13, 24, 'c'), (8, 18)], res=8)
        cup = shape([(-4, 20), (4, 20), (5, 30), (3, 32), (0, 30), (-3, 32), (-5, 30)], res=8)
        stam = U(stroke([(-1, 30), (-2, 38)], 1.2, 1.2), stroke([(1, 30), (2, 40)], 1.2, 1.2), circle(-2, 38.5, 1.2), circle(2, 40.5, 1.2))
        return place(U(ped, sep, cup, stam), x, y, s)
    bells = []
    i_b = int(np.argmin(np.abs(c[:, 0] - 92) + (c[:, 1] > 100) * 999))
    for i, s_ in ((i_b + 18, 0.9), (i_b, 1.1), (i_b - 20, 0.9), (i_b + 34, 0.85)):
        x, y = c[i]
        bells.append(bell(x, y, s_))
    parts += bells
    for i, a in ((50, -40), (70, 200), (30, 30), (92, 160)):
        x, y = c[i]
        parts.append(leaf(x, y, 16, 6, a))
    # hummingbird: beak tip into the mouth of the largest bell
    i_b = int(np.argmin(np.abs(c[:, 0] - 92) + (c[:, 1] > 100) * 999))
    bx, by = c[i_b]
    tip = (bx + 0, by + 32 * 1.1)
    hb = place(A.hummingbird(), 0, 0, 0.95, flip=True)
    hb = affinity.rotate(hb, -18, origin=(0, 0))
    hb = affinity.translate(hb, tip[0] - 1, tip[1] + 3)
    parts.append(hb)

    def daisy(x, y, rr, n=10):
        petals = U([ellipse(x + rr * 0.6 * math.cos(a), y + rr * 0.6 * math.sin(a), rr * 0.55, rr * 0.2, math.degrees(a))
                    for a in np.linspace(0, 2 * math.pi, n, endpoint=False)])
        return U(petals, circle(x, y, rr * 0.3)).difference(circle(x, y, rr * 0.16, 16))
    for (x, y, h, rr) in ((24, 216, 60, 10), (42, 216, 40, 8), (70, 216, 28, 8), (104, 216, 46, 9)):
        parts.append(stroke([(x, y), (x + 3, y - h * 0.5), (x, y - h)], 2.2, 1.6))
        parts.append(daisy(x, y - h - rr * 0.2, rr))
        parts.append(leaf(x + 1, y - h * 0.35, 12, 4.5, 50))
    parts.append(grass(r, 10, 145, 214, 5, 16, 40))
    return U(parts)


# ===================================================================== 14
def dandelion():
    r = R(14)
    black = INNER
    holes = []
    cx, cy, R0 = 64, 92, 32
    holes.append(stroke([(cx, cy + 6), (cx + 4, 140), (cx - 6, 190), (cx - 2, 240)], 2.4, 3.0))
    holes.append(circle(cx, cy, 6.5))
    n = 18
    for k in range(n):
        a = 2 * math.pi * k / n + 0.1
        x1, y1 = cx + 6 * math.cos(a), cy + 6 * math.sin(a)
        x2, y2 = cx + R0 * math.cos(a), cy + R0 * math.sin(a)
        holes.append(line((x1, y1), (x2, y2), 1.3))
        # umbrella fan
        for d in (-22, 0, 22):
            b = a + math.radians(d)
            holes.append(line((x2, y2), (x2 + 6 * math.cos(b), y2 + 6 * math.sin(b)), 1.1))
    # flying seeds
    def seed(x, y, s, rot):
        g = U(line((0, 0), (0, 10), 1.2), ellipse(0, 11.5, 0.9, 2.0))
        for d in (-40, -20, 0, 20, 40):
            b = math.radians(d - 90)
            g = U(g, line((0, 0), (5 * math.cos(b), 5 * math.sin(b)), 1.0))
        return place(g, x, y, s, rot=rot)
    for (x, y, s, rot) in ((106, 64, 1.3, 30), (122, 40, 1.2, 50), (130, 86, 1.0, 20), (100, 28, 1.0, 60), (136, 120, 0.9, 10),
                           (114, 104, 1.1, 40), (28, 34, 1.0, -20)):
        holes.append(seed(x, y, s, rot))
    # grass blades as cut-outs
    for (x, h, b) in ((14, 50, 8), (22, 36, -4), (36, 44, 10), (90, 40, -8), (102, 56, 6), (118, 34, -6), (132, 48, 10), (142, 30, -4)):
        holes.append(stroke([(x, 230), (x + b * 0.3, 230 - h * 0.6), (x + b, 230 - h)], 4, 1.2))
    # a second smaller closed dandelion bud + leaf
    holes.append(stroke([(112, 230), (114, 196), (110, 168)], 2.0, 2.0))
    holes.append(ellipse(110, 164, 3.4, 6))
    holes.append(leaf(70, 228, 34, 9, -40))
    holes.append(leaf(60, 228, 28, 8, 30))
    return black.difference(U(holes))


# ===================================================================== 15
def city_birds():
    r = R(15)
    blds = []
    x = 8
    heights = [86, 120, 70, 140, 96, 112, 64, 130]
    widths = [16, 18, 14, 20, 16, 18, 14, 22]
    wins = []
    for h, w in zip(heights, widths):
        top = 226 - h
        b = box(x, top, x + w, 230)
        blds.append(b)
        for yy in np.arange(top + 6, 222, 8):
            for xx in np.arange(x + 3, x + w - 4, 5):
                if r.random() < 0.55:
                    wins.append(box(xx, yy, xx + 2.6, yy + 4))
        x += w
    blds.append(U(box(64, 74, 66, 88), poly([(58, 88), (72, 88), (65, 80)])))  # spire on tallest
    water = U(box(30, 96, 44, 106), line((32, 106), (32, 108), 1.4), line((42, 106), (42, 108), 1.4), poly([(29, 96), (45, 96), (37, 90)]))
    city = U(blds, water).difference(U(wins))
    wire_pts = [(4, 46), (60, 62), (100, 64), (151, 54)]
    wire = stroke(wire_pts, 2.0, 2.0)
    wire2 = stroke([(4, 58), (60, 74), (100, 76), (151, 66)], 1.6, 1.6)
    pole = U(box(98, 40, 102, 100), box(90, 52, 110, 55))
    birds = []
    for (bx, s, flip) in ((22, 0.7, False), (46, 0.75, True), (70, 0.7, False), (120, 0.75, True), (138, 0.6, False)):
        birds.append(place(A.bird_perch(), bx, y_at(wire_pts, bx) - 1.6, s, flip=flip))
    moon = circle(46, 24, 9).difference(circle(50, 21, 8))
    moon = U(moon)
    flyers = []
    return U(city, wire, wire2, pole, birds, line((40, 6), (40, 19), 1.3), moon)


# ===================================================================== 16
def windmill():
    r = R(16)
    hill = shape([(-4, 240, 'c'), (-4, 182), (40, 168), (84, 160), (126, 168), (160, 186), (160, 240, 'c')])
    body = poly([(72, 164), (76, 92), (94, 92), (98, 164)])
    cap = shape([(72, 94, 'c'), (85, 78), (98, 94, 'c')])
    door = shape([(80, 164, 'c'), (80, 152), (85, 147), (90, 152), (90, 164, 'c')])
    win = box(82, 112, 88, 120)
    mill = U(body, cap).difference(U(door, win))
    hx, hy = 85, 88
    blades = [circle(hx, hy, 4)]
    for k in range(4):
        a = math.radians(25 + 90 * k)
        ux, uy = math.cos(a), math.sin(a)
        vx, vy = -uy, ux
        blades.append(line((hx, hy), (hx + ux * 56, hy + uy * 56), 2.6))
        # lattice sail on one side of the arm
        p = lambda t, s: (hx + ux * t + vx * s, hy + uy * t + vy * s)
        sail = poly([p(12, 0), p(54, 0), p(54, 11), p(12, 11)])
        holes = []
        for t0 in np.arange(13.5, 52, 8):
            for s0 in (1.6, 6.4):
                holes.append(poly([p(t0, s0), p(t0 + 6.2, s0), p(t0 + 6.2, s0 + 3.2), p(t0, s0 + 3.2)]))
        blades.append(sail.difference(U(holes)))
    tulips = []
    for x in np.arange(14, 146, 9):
        if 66 < x < 104:
            continue
        base = 174 + abs(x - 84) * 0.18
        h = r.uniform(14, 24)
        tulips.append(stroke([(x, base + 6), (x + r.uniform(-2, 2), base - h)], 1.6, 1.4))
        ty = base - h
        tulips.append(shape([(x - 3.4, ty - 6, 'c'), (x - 1.4, ty - 3), (x, ty - 6, 'c'), (x + 1.4, ty - 3), (x + 3.4, ty - 6, 'c'),
                             (x + 3, ty), (x, ty + 1.5), (x - 3, ty)]))
        tulips.append(leaf(x, base + 4, 9, 3.4, 30 if r.random() < 0.5 else -30))
    fence = U([box(x, 196, x + 2, 212) for x in np.arange(14, 70, 9)] + [box(10, 200, 70, 202), box(10, 206, 70, 208)])
    birds = []
    return U(hill, mill, blades, tulips).difference(U([box(x - 0.2, 0, x + 0.2, 0) for x in []]))


# ===================================================================== 17
def rabbits_moon():
    r = R(17)
    moon = circle(76, 112, 58, 96)
    black = INNER.difference(moon)
    black = black.difference(stars(r, box(8, 8, 147, 190), 18, avoid=moon.buffer(3)))
    hill = shape([(-4, 240, 'c'), (-4, 168), (40, 156), (80, 152), (120, 158), (160, 170), (160, 240, 'c')])
    rab1 = place(A.rabbit_sit(), 58, 152, 1.2)
    rab2 = place(A.rabbit_sit(), 100, 153, 0.95, flip=True)
    gr = U(grass(r, 8, 40, 158, 5, 16, 16), grass(r, 118, 147, 160, 5, 16, 12), grass(r, 40, 118, 155, 2, 5, 24))
    flowers = []
    for (x, h) in ((24, 34), (34, 24), (128, 30), (140, 40), (84, 18)):
        y = 160
        flowers.append(stroke([(x, y), (x - 2, y - h * 0.5), (x, y - h)], 1.6, 1.3))
        flowers.append(U([circle(x + 2.6 * math.cos(a), y - h + 2.6 * math.sin(a), 1.9) for a in np.linspace(0, 6.28, 5, endpoint=False)]))
    # butterflies on grass tips
    bf = U(ellipse(-4, -3, 4, 2.8, 30), ellipse(4, -3, 4, 2.8, -30), ellipse(-3, 2.6, 2.8, 2, -30), ellipse(3, 2.6, 2.8, 2, 30), line((0, -4), (0, 4), 1.4))
    stalk = stroke([(134, 162), (132, 130), (128, 110)], 1.6, 1.3)
    return U(black, hill, rab1, rab2, gr, flowers, stalk, place(bf, 128, 106, 1.2, rot=-20))


# ===================================================================== 18
def frog_pond():
    r = R(18)
    water = [wave_strip(r, 0, 155, y, 2.4, amp=1.0, wl=24) for y in np.arange(170, 228, 6.5)]
    pads = U(ellipse(64, 172, 26, 5.2).difference(poly([(64, 172), (86, 166), (88, 171)])),
             ellipse(118, 186, 16, 3.8).difference(poly([(118, 186), (104, 181), (102, 185)])),
             ellipse(28, 194, 14, 3.4))
    frog = place(A.frog(), 62, 168, 1.6)
    lotus = shape([(110, 184, 'c'), (110, 176), (113, 170, 'c'), (115, 177), (118, 166, 'c'), (121, 177), (123, 170, 'c'),
                   (126, 176), (126, 184, 'c')])
    cats = U(cattail(16, 176, 140, 6), cattail(26, 176, 112, -6), cattail(136, 176, 150, -8), cattail(144, 176, 118, 4),
             reed(10, 176, 90, 16), reed(34, 176, 70, -12), reed(128, 176, 96, -18), reed(146, 176, 70, 10))
    df1 = place(A.dragonfly(), 26 - 6 - 3, 176 - 112 - 6, 0.85, rot=-90)
    df1 = place(A.dragonfly(), 0, 0, 0.85, rot=80)
    df1 = affinity.translate(df1, 20 - 6 + 3, 176 - 112 - 9)
    df2 = place(A.dragonfly(), 0, 0, 0.75, rot=-70)
    df2 = affinity.translate(df2, 136 - 8 - 4, 176 - 150 + 22)
    df1 = attach(df1, cats)
    df2 = attach(df2, cats)
    return U(water, pads, frog, lotus, cats, df1, df2)


# ===================================================================== 19
def kite_hill():
    r = R(19)
    hill = shape([(-4, 240, 'c'), (-4, 196), (30, 180), (56, 172), (80, 176), (120, 194), (160, 206), (160, 240, 'c')])
    child = place(A.child_kite(), 56, 174, 1.3)
    hand = (56 + 13 * 1.3, 174 - 44 * 1.3)
    kx, ky = 116, 46
    kite = poly([(kx, ky - 20), (kx + 14, ky), (kx, ky + 22), (kx - 14, ky)])
    kite = kite.difference(U(poly([(kx - 2, ky - 15), (kx - 2, ky - 3), (kx - 9.5, ky - 2)]),
                             poly([(kx + 2, ky - 15), (kx + 2, ky - 3), (kx + 9.5, ky - 2)]),
                             poly([(kx - 2, ky + 3), (kx - 2, ky + 16), (kx - 9.5, ky + 3)]),
                             poly([(kx + 2, ky + 3), (kx + 2, ky + 16), (kx + 9.5, ky + 3)])))
    string = stroke([hand, (90, 100), (110, 66), (kx, ky + 20)], 1.3, 1.3)
    tail_pts = [(kx, ky + 22), (110, 82), (122, 104), (114, 126), (124, 146)]
    tail = stroke(tail_pts, 1.4, 1.4)
    bows = []
    c = curve(tail_pts, res=20)
    for i in range(10, len(c) - 4, 16):
        x, y = c[i]
        bows.append(U(poly([(x, y), (x - 5, y - 3), (x - 5, y + 3)]), poly([(x, y), (x + 5, y - 3), (x + 5, y + 3)])))
    tree_ = tree(132, 200, -6, 26, 7, 4, r, spread=26)
    tips = []
    tree_ = tree(134, 202, -4, 28, 7, 4, r, spread=26, tips=tips)
    lvs = [leaf(x, y, 9, 4.2, a + r.uniform(-40, 40)) for x, y, a in tips]
    gr = grass(r, 8, 147, 196, 4, 12, 50)
    sun = U(circle(147, 8, 18), [stroke([(147 + 22 * math.cos(a), 8 + 22 * math.sin(a)), (147 + 32 * math.cos(a), 8 + 32 * math.sin(a))], 2.6, 1.4)
                                 for a in np.linspace(math.pi * 0.55, math.pi * 0.95, 4)])
    # second kite tail ribbons connect to frame? keep sun top-right left free of kite
    sun = place(sun, -122, 0)  # move sun to top-left corner
    sun = sun_corner(8, 8, 22, 0.12, math.pi / 2 - 0.12, 5)
    return U(hill, child, kite, string, tail, bows, tree_, lvs, gr, sun)


# ===================================================================== 20
def elephant_sunset():
    r = R(20)
    cx, cy, rr = 76, 136, 58
    sun = circle(cx, cy, rr, 96)
    black = INNER.difference(sun)
    for (x, y, s_, a) in ((24, 30, 1.0, -6), (38, 22, 0.8, 4), (132, 34, 0.8, 8), (120, 26, 0.6, -3)):
        black = black.difference(flyer(x, y, s_, a))
    for a in np.linspace(math.pi * 1.08, math.pi * 1.92, 8):
        p0 = (cx + (rr + 6) * math.cos(a), cy + (rr + 6) * math.sin(a))
        p1 = (cx + (rr + 17) * math.cos(a), cy + (rr + 17) * math.sin(a))
        black = black.difference(stroke([p0, p1], 2.4, 1.4))
    ground = ridge(r, 8, 147, 191, 1.2, n=40)
    ele = place(A.elephant(), 58, 193, 0.78)
    baby = place(A.elephant(), 95, 193, 0.42)
    trunk = U(stroke([(122, 194), (120, 160), (112, 130), (100, 108)], 5, 2.4),
              stroke([(120, 160), (128, 132), (132, 106)], 4, 2), stroke([(114, 134), (118, 112)], 2.4, 1.6))
    def layer(x0, x1, y, th):
        xs = np.linspace(x0, x1, 30)
        top = [(x, y - th * (0.6 + 0.4 * math.sin((x - x0) / (x1 - x0) * math.pi)) + r.uniform(-0.6, 0.6)) for x in xs]
        bot = [(x, y + r.uniform(0, 2.2)) for x in xs[::-1]]
        return Polygon(top + bot).buffer(0.6).buffer(-0.6)
    canopy = U(layer(78, 146, 110, 7), layer(88, 138, 101, 5))
    gr = U(grass(r, 8, 24, 191, 3, 9, 8), grass(r, 108, 147, 191, 3, 9, 16))
    return U(black, ground, ele, baby, trunk, canopy, gr)


# ===================================================================== 21
def camping():
    r = R(21)
    black = INNER
    mts = ridge(r, 0, 155, 120, 16, bottom=176, peaks=[(46, 74, 1.2), (112, 88, 1.0)])
    black = black.difference(mts)  # mountains are lit (white)
    # moon & stars in the black sky
    moon = circle(120, 34, 13).difference(circle(126, 29, 11.5))
    black = black.difference(moon)
    black = black.difference(stars(r, box(8, 8, 147, 110), 22, avoid=U(mts, moon).buffer(3)))
    # mountain ridge details: black rocks lines inside lit mountains
    ridges = U(stroke([(46, 74), (50, 96), (44, 116), (52, 140)], 2.0, 1.4), stroke([(112, 88), (106, 106), (114, 126)], 2.0, 1.4))
    ground = ridge(r, 0, 155, 172, 2, n=40)
    pines = U([pine(x, 176, h, w, r) for (x, h, w) in ((14, 100, 28), (28, 70, 20), (40, 50, 16), (128, 60, 18), (140, 92, 26))])
    black = U(black, ridges, ground, pines)
    tent = poly([(70, 206), (92, 168), (114, 206)])
    flap = poly([(92, 172), (99, 206), (92, 206)])
    black = black.difference(tent.difference(flap).difference(line((92, 168), (92, 206), 1.6)))
    fire = U(shape([(48, 208, 'c'), (44, 200), (46, 192), (50, 184, 'c'), (52, 194), (56, 188, 'c'), (58, 198), (56, 208, 'c')]))
    logs = U(line((40, 212), (64, 206), 3), line((40, 206), (64, 212), 3))
    black = black.difference(fire)
    black = black.difference(U([circle(x, y, 1.2) for (x, y) in ((52, 178), (46, 172), (55, 168))]))
    return black


# ===================================================================== 22
def mushrooms_snail():
    r = R(22)
    branch = stroke([(4, 22), (40, 28), (80, 24), (120, 30), (151, 24)], 6, 5)
    hang = []
    for x in np.arange(14, 146, 10):
        y0 = 26
        L = r.uniform(10, 40)
        pts = [(x, y0), (x + r.uniform(-3, 3), y0 + L * 0.5), (x + r.uniform(-4, 4), y0 + L)]
        hang.append(stroke(pts, 1.6, 1.3))
        c = curve(pts, res=8)
        for i in range(3, len(c), 4):
            hang.append(leaf(c[i][0], c[i][1], 7, 3, 150 if i % 8 else 210))
    ground = ridge(r, 8, 147, 206, 3, n=40)
    sh = U(mushroom(52, 208, 46, 26), mushroom(94, 208, 28, 16), mushroom(118, 208, 18, 11), mushroom(26, 208, 16, 9))
    snail = place(A.snail(), 54, 208 - 46 - 26 * 0.78, 0.9)
    ferns = []
    for (x, h, bend) in ((136, 70, -18), (144, 50, 10), (12, 50, 14), (76, 30, 8)):
        ferns.append(stroke([(x, 208), (x + bend * 0.4, 208 - h * 0.6), (x + bend, 208 - h)], 2.4, 1.2))
        for k in range(1, 9):
            t = k / 9
            px = x + bend * t ** 1.4
            py = 208 - h * t
            ferns.append(leaf(px, py, 10 * (1 - t * 0.6), 3.4, 62 + bend))
            ferns.append(leaf(px, py, 10 * (1 - t * 0.6), 3.4, -62 + bend))
    gr = grass(r, 10, 145, 206, 4, 12, 40)
    return U(branch, hang, ground, sh, snail, ferns, gr)


# ===================================================================== 23
def dolphins():
    r = R(23)
    sea = []
    for k, y in enumerate(np.arange(150, 228, 7)):
        sea.append(wave_strip(r, 0, 155, y, 2.0 + k * 0.25, amp=2.0, wl=22))
    d1 = place(A.dolphin(), 40, 152, 1.15)
    d2 = place(A.dolphin(), 0, 0, 0.95)
    d2 = affinity.rotate(d2, 25, origin=(0, 0))
    d2 = affinity.translate(d2, 88, 166)
    splash = U([stroke([(40 + dx, 152), (40 + dx * 1.6, 146 - abs(dx) * 0.3)], 1.6, 1.2) for dx in (-6, -3, 3, 6)])
    sun = sun_corner(147, 8, 24, math.pi / 2 + 0.12, math.pi - 0.12, 6)
    island = shape([(4, 152, 'c'), (4, 140), (14, 136), (28, 140), (36, 148, 'c')])
    palm = stroke([(18, 140), (20, 120), (26, 100)], 3, 2)
    fronds = U([stroke([(26, 100), (26 + 10 * math.cos(a), 100 + 6 * math.sin(a)), (26 + 18 * math.cos(a), 100 + 14 * math.sin(a) + 4)], 3.4, 1.2)
                for a in np.linspace(math.pi * 1.05, math.pi * 1.95, 6)])
    gulls = []
    clouds = []
    return U(sea, d1, d2, splash, sun, island, palm, fronds)


# ===================================================================== 24
def tree_of_life():
    r = R(24)
    tips = []
    trunk = shape([(52, 196), (64, 186), (68, 150), (66, 118), (88, 118), (86, 150), (90, 186), (104, 196)])
    t1 = tree(70, 124, -28, 34, 9, 5, r, spread=26, decay=0.74, tips=tips)
    t2 = tree(84, 124, 28, 34, 9, 5, r, spread=26, decay=0.74, tips=tips)
    t3 = tree(77, 122, 0, 30, 8, 5, r, spread=24, decay=0.74, tips=tips)
    lvs = [leaf(x, y, r.uniform(6, 9), 3.6, a + r.uniform(-60, 60)) for (x, y, a) in tips]
    roots = U([stroke([(78, 192), (78 + dx * 0.5, 204), (78 + dx, 214 + abs(dx) * 0.05)], 6 - abs(dx) * 0.04, 1.6)
               for dx in (-60, -36, -16, 0, 16, 36, 60)])
    ground = box(0, 212, 160, 240)
    soil = []
    for (x, y) in ((20, 220), (40, 224), (100, 222), (130, 219), (70, 226)):
        soil.append(ellipse(x, y, 4, 1.6))
    birds = U(place(A.bird_perch(), 0, 0, 0.6), )
    g = U(trunk, t1, t2, t3, lvs, roots, ground).difference(U(soil))
    # heart hollow in trunk
    heart = shape([(77, 162, 'c'), (70, 154), (70, 148), (74, 145), (77, 148, 'c'), (80, 145), (84, 148), (84, 154)])
    g = g.difference(heart)
    return g


DESIGNS = [
    ("wolf-moon", "זאב מיילל לירח", wolf_moon),
    ("owl-branch", "ינשוף על ענף", owl_branch),
    ("lighthouse", "מגדלור בלילה", lighthouse),
    ("sailboat", "סירת מפרש וירח", sailboat_night),
    ("fox-forest", "שועל ביער", fox_forest),
    ("heron", "אנפה בין הקנים", heron_reeds),
    ("swing", "נדנדה על העץ", swing_tree),
    ("balloons", "כדורים פורחים", balloons),
    ("cat-roof", "חתול על הגג", cat_roof),
    ("sea-turtle", "צב ים", sea_turtle),
    ("canoe", "קאנו באגם", canoe_lake),
    ("bear", "דוב בהרים", bear_mountains),
    ("hummingbird", "יונק הדבש", hummingbird_flowers),
    ("dandelion", "שן הארי", dandelion),
    ("city-birds", "ציפורים על החוט", city_birds),
    ("windmill", "טחנת רוח", windmill),
    ("rabbits", "ארנבים בלילה", rabbits_moon),
    ("frog-pond", "צפרדע בבריכה", frog_pond),
    ("kite", "עפיפון על הגבעה", kite_hill),
    ("elephants", "פילים בשקיעה", elephant_sunset),
    ("camping", "מחנה בהרים", camping),
    ("mushrooms", "פטריות וחילזון", mushrooms_snail),
    ("dolphins", "דולפינים", dolphins),
    ("tree-of-life", "עץ החיים", tree_of_life),
]
