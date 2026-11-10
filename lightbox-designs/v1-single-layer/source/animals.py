"""Animal / figure outlines in local units (about 100 units tall), y down.
Origin is roughly at the point where the figure touches the ground."""
from lib import shape, stroke, circle, ellipse, U, place, poly, line
from shapely.geometry import Polygon

C = 'c'


def wolf_howl():
    # sitting, facing left, head raised; origin = bottom centre
    g = shape([
        (-30, -98, C), (-22, -96), (-16, -92), (-17, -88, C),  # snout tip / upper jaw
        (-20, -86), (-24, -85, C),                            # open mouth corner
        (-26, -82), (-25, -78, C),                            # lower jaw
        (-24, -72), (-22, -62),                               # throat
        (-24, -46), (-22, -30),                               # chest
        (-19, -14), (-18, -2), (-21, 0, C), (-10, 0, C),      # front leg + paw
        (-10, -10), (-6, -18), (-2, -10), (2, -2),            # between legs
        (0, 0, C), (16, 0, C), (22, -6),                      # hind paw
        (26, -14), (30, -6), (40, -3), (52, -6), (58, -2, C),  # tail on ground
        (50, 1), (36, 2, C),
        (30, 4, C), (28, -2),
        (32, -22), (26, -42),                                 # haunch / back
        (14, -60), (2, -72),
        (-4, -84), (-6, -92), (-5, -104, C),                  # ear
        (-12, -97), (-16, -100, C), (-17, -97), (-22, -99)
    ], res=10)
    return g


def owl():
    # front facing owl, origin bottom centre (feet)
    body = shape([
        (-20, -60, C), (-14, -64), (-6, -60), (0, -58), (6, -60), (14, -64), (20, -60, C),  # tufts
        (21, -46), (24, -28), (22, -10), (14, 0), (6, 2), (0, 1), (-6, 2), (-14, 0),
        (-22, -10), (-24, -28), (-21, -46)
    ], res=10)
    feet = U(stroke([(-6, -2), (-6, 4)], 3, 2), stroke([(6, -2), (6, 4)], 3, 2))
    g = U(body, feet)
    # eyes: C-shaped rings leave pupil attached at the bottom
    for ex in (-9.5, 9.5):
        ring = circle(ex, -42, 8.2).difference(circle(ex, -42, 4.0))
        ring = ring.difference(poly([(ex - 1.3, -42), (ex + 1.3, -42), (ex + 1.3, -33), (ex - 1.3, -33)]))
        g = g.difference(ring)
    # facial disc arcs
    # wing edges (cut slits)
    for s in (1, -1):
        g = g.difference(stroke([(s * 17, -36), (s * 19, -22), (s * 15, -8)], 1.6, 1.3))
    # chest chevrons
    for (cx, cy) in ((-6, -24), (6, -24), (0, -17), (-8, -12), (8, -12), (0, -8)):
        g = g.difference(poly([(cx - 3, cy - 1.5), (cx, cy + 1.5), (cx + 3, cy - 1.5), (cx + 3, cy), (cx, cy + 3.3), (cx - 3, cy)]))
    beak = poly([(-2.2, -36), (2.2, -36), (0, -30)])
    return U(g, beak)


def fox_sit():
    # sitting fox facing left (head turned slightly), big tail curling round front; origin bottom centre
    g = shape([
        (-27, -70, C), (-18, -74), (-14, -78),               # snout to forehead
        (-13, -90, C), (-8, -82), (-5, -86, C), (-3, -78),   # two ears
        (2, -72), (6, -62), (16, -44), (22, -26),            # back
        (26, -10), (30, -4), (40, -12), (46, -26),           # tail up
        (52, -24, C), (52, -10), (44, 0), (28, 2),           # tail tip & curve
        (8, 1), (-10, 1, C), (-12, -3), (-8, -6),            # tail end at front + paws
        (-12, -8), (-12, -30),                               # front leg
        (-16, -48), (-20, -58), (-22, -63), (-27, -66, C)    # chest / jaw
    ], res=10)
    # white tail tip notch for detail
    g = g.difference(poly([(-10, -2), (-4, -3), (-5, 0.5)]))
    eye = poly([(-17, -72.5), (-13, -73.5), (-14, -71.2)])
    return g.difference(eye)


def heron():
    # standing heron facing left, origin at foot tip
    body = shape([
        (-38, -118, C), (-24, -114), (-17, -113),             # beak
        (-12, -116), (-6, -114), (-4, -108),                 # head
        (-8, -96), (-10, -86), (-4, -74),                    # neck S
        (6, -66), (20, -64), (34, -60), (46, -52, C),        # back -> tail
        (36, -50), (22, -46), (8, -46), (-2, -50),           # belly
        (-10, -56), (-15, -66), (-17, -78), (-14, -92),      # front of neck
        (-12, -104), (-16, -109), (-24, -111)
    ], res=10)
    legs = U(stroke([(8, -47), (6, -26), (2, 0)], 2.4, 1.8),
             stroke([(12, -47), (14, -30), (22, -22), (12, -16)], 2.2, 1.6),
             stroke([(2, 0), (-6, 1)], 1.6, 1.4), stroke([(2, 0), (8, 1)], 1.6, 1.4))
    plume = stroke([(-4, -112), (6, -114), (14, -111)], 1.6, 1.2)
    g = U(body, legs, plume)
    return g.difference(circle(-9, -111, 1.3, 12))


def cat_sit_back():
    # cat sitting, seen from behind, tail hanging down; origin bottom centre
    g = shape([
        (-13, -62, C), (-10, -52), (-12, -46),                 # left ear -> cheek
        (-18, -36), (-22, -18), (-20, -4), (-12, 0),
        (12, 0), (20, -4), (22, -18), (18, -36),
        (12, -46), (10, -52), (13, -62, C), (5, -56), (0, -55), (-5, -56)
    ], res=10)
    tail = stroke([(8, -2), (14, 6), (13, 16), (7, 22), (9, 28)], 4.5, 3.0)
    return U(g, tail)


def girl_swing():
    # girl sitting on swing seat, facing right, legs forward; origin = seat centre
    head = circle(0, -36, 6.5)
    pony = stroke([(-5, -39), (-11, -38), (-14, -33)], 4, 2)
    body = shape([(-4, -30), (4, -30), (6, -18), (7, -6), (12, 0), (-8, 0), (-6, -14)], res=8)
    arm = stroke([(2, -27), (4, -20), (3, -12)], 3, 2.5)
    legs = U(stroke([(6, -1), (16, 1), (22, 6)], 4.5, 3.2), stroke([(22, 6), (25, 7)], 3, 2.6))
    seat = poly([(-10, 0), (14, 0), (14, 3), (-10, 3)])
    neck = line((0, -31), (0, -28), 3)
    return U(head, pony, body, arm, legs, seat, neck)


def turtle():
    # sea turtle swimming right, origin centre
    shell = ellipse(0, 0, 24, 15, -8)
    head = shape([(20, -6), (30, -10), (36, -8), (36, -3), (30, 0), (22, 2)])
    fl_f = shape([(8, -8), (14, -22), (26, -36), (30, -36), (24, -22), (16, -8)])
    fl_f2 = shape([(8, 8), (16, 18), (24, 24), (20, 26), (8, 18)])
    fl_b = shape([(-18, -6), (-28, -14), (-34, -14), (-28, -6), (-20, 0)])
    fl_b2 = shape([(-18, 6), (-28, 14), (-32, 12), (-24, 4)])
    g = U(shell, head, fl_f, fl_f2, fl_b, fl_b2)
    # shell plates as cut-outs
    for (x, y, r) in ((-8, -3, 4.6), (2, -5, 4.6), (12, -3, 3.8), (-3, 6, 3.6), (8, 5, 3.4), (-14, 3, 3.2)):
        g = g.difference(_hexagon(x, y, r))
    g = g.difference(circle(31, -6, 1.2, 12))
    return g


def _hexagon(x, y, r):
    import math
    return Polygon([(x + r * math.cos(math.pi / 3 * k + 0.3), y + r * math.sin(math.pi / 3 * k + 0.3)) for k in range(6)])


def fish(eye=True):
    g = shape([(14, 0, C), (8, -6), (0, -7), (-8, -4), (-13, 0, C), (-20, -6, C), (-18, 0), (-20, 6, C),
               (-13, 1, C), (-8, 4), (0, 6), (8, 5)])
    if eye:
        g = g.difference(circle(8, -1.5, 1.4, 12))
    return g


def paddler():
    # person sitting in canoe, paddle; origin canoe bottom centre (canoe 70 long)
    canoe = shape([(-38, -9, C), (-30, -4), (-10, 0), (10, 0), (30, -4), (38, -9, C), (30, -7), (0, -6), (-30, -7)])
    torso = shape([(-4, -7), (-3, -22), (2, -24), (5, -20), (6, -8)])
    head = circle(1, -28, 4)
    paddle = U(stroke([(14, -30), (-6, 2)], 1.8, 1.8), ellipse(-8, 5, 2.4, 6, 32))
    arm = stroke([(2, -20), (6, -16), (8, -21)], 2.6, 2.2)
    return U(canoe, torso, head, paddle, arm)


def bear_walk():
    # walking bear facing right; origin bottom centre
    g = shape([
        (-40, -30), (-36, -44), (-24, -52), (-6, -56), (8, -54), (18, -48),   # back & hump
        (26, -44), (32, -42), (36, -46, C), (38, -42), (44, -38), (48, -34, C),  # ear, head, snout
        (46, -30), (38, -28), (32, -24), (30, -10), (34, -2), (34, 0, C), (22, 0, C),  # front leg
        (22, -12), (18, -20), (6, -20), (-6, -18), (-14, -18),
        (-16, -10), (-12, -2), (-12, 0, C), (-26, 0, C), (-28, -10),      # hind leg
        (-36, -16), (-42, -22)
    ], res=10)
    return g.difference(circle(38, -38, 1.2, 12))


def hummingbird():
    # hovering, facing left, beak to the left; origin at beak tip
    body = shape([
        (0, 0, C), (16, -3), (21, -6), (26, -5), (29, -2),          # beak -> head
        (34, 2), (40, 8), (48, 16), (56, 26, C), (50, 25), (52, 32, C),  # back -> tail
        (44, 24), (36, 18), (28, 12), (22, 4), (17, -1)
    ], res=10)
    wing = shape([(30, 2), (36, -12), (46, -26), (58, -34, C), (54, -22), (46, -8), (38, 4)], res=10)
    g = U(body, wing)
    return g.difference(circle(24, -3, 1.0, 12))


def bird_perch():
    # small songbird perched, facing left; origin feet
    g = shape([(-14, -15, C), (-9, -16), (-6, -19), (0, -20), (4, -17), (8, -12), (16, -6),
               (26, -2, C), (16, -3), (8, -1), (0, 0), (-6, -3), (-9, -8), (-9, -12)], res=10)
    legs = U(line((0, -1), (-1, 3), 1.4), line((3, -1), (3, 3), 1.4))
    return U(g, legs).difference(circle(-4, -15.5, 0.9, 10))


def rabbit_sit():
    # sitting rabbit facing left, origin bottom centre
    g = shape([
        (-20, -26, C), (-16, -30), (-12, -32),                  # nose -> head
        (-14, -44), (-14, -54, C), (-10, -46), (-8, -34),       # ear 1
        (-6, -46), (-2, -52, C), (-2, -42), (-4, -32),          # ear 2
        (2, -28), (10, -22), (16, -14), (20, -4),               # back
        (23, -8, C), (24, -2), (20, 1),                         # tail
        (6, 0), (-12, 0, C), (-12, -4), (-8, -6), (-10, -14),
        (-14, -20), (-19, -23)
    ], res=10)
    return g.difference(circle(-13, -27.5, 1.0, 10))


def frog():
    # sitting frog, facing left; origin bottom centre
    g = shape([
        (-20, -10), (-18, -15), (-14, -18), (-10, -22), (-6, -20), (2, -18),
        (12, -14), (18, -6), (20, 0), (8, 0), (4, -4), (2, 0),
        (-10, 0), (-12, -3), (-15, -4), (-14, -7), (-18, -8)
    ], res=10)
    g = g.difference(circle(-9, -18, 1.4, 12))
    return g


def dragonfly():
    # origin at tail tip, body up
    body = U(stroke([(0, 0), (0, -26)], 1.6, 2.4), circle(0, -29, 2.6))
    wings = U(ellipse(-9, -26, 9, 2.6, 10), ellipse(9, -26, 9, 2.6, -10),
              ellipse(-8, -21, 8, 2.3, -14), ellipse(8, -21, 8, 2.3, 14))
    g = U(body, wings)
    for s in (1, -1):
        g = g.difference(ellipse(s * 10.5, -26 + s * 0.4 * s, 5, 0.9, -s * 10))
        g = g.difference(ellipse(s * 9.5, -21, 4.4, 0.8, s * 14))
    return g


def child_kite():
    # child standing facing right, arm raised; origin between feet
    head = circle(2, -38, 5.2)
    body = shape([(-3, -32), (5, -32), (7, -18), (8, -14), (-4, -14), (-3, -22)])
    legs = U(stroke([(0, -15), (-3, -7), (-6, 0)], 3.4, 2.8), stroke([(4, -15), (6, -7), (9, 0)], 3.4, 2.8),
             line((-6, 0), (-2, 0), 2.4), line((9, 0), (13, 0), 2.4))
    arm = stroke([(4, -29), (9, -36), (13, -44)], 2.6, 2.2)
    arm2 = stroke([(0, -29), (-3, -22), (-2, -17)], 2.4, 2.0)
    hair = stroke([(-2, -41), (-6, -40), (-8, -36)], 2.6, 1.8)
    return U(head, body, legs, arm, arm2, hair, line((2, -33), (2, -31), 3))


def elephant():
    # walking elephant facing left; origin bottom centre
    g = shape([
        (-44, 0, C), (-46, -4), (-44, -12), (-40, -22), (-40, -34),        # trunk tip curling
        (-38, -46), (-30, -56), (-20, -58),                                # forehead
        (-10, -60), (6, -58), (22, -54), (34, -44), (40, -30),             # back
        (42, -26, C), (46, -18), (44, -14, C), (40, -22),                  # tail
        (38, -12), (38, 0, C), (26, 0, C), (26, -14), (20, -18),           # hind leg
        (10, -18), (8, -12), (10, 0, C), (0, 0, C), (-2, -16),             # 2nd hind
        (-10, -18), (-14, -12), (-12, 0, C), (-22, 0, C), (-24, -18),      # front leg
        (-30, -24), (-34, -22), (-34, -12), (-38, -4), (-40, 0, C)
    ], res=10)
    ear = shape([(-24, -50), (-10, -50), (-6, -36), (-12, -26), (-22, -28)], res=10)
    g = g.difference(stroke([(-12, -50), (-6, -42), (-8, -32), (-14, -27)], 1.6, 1.3))
    g = g.difference(circle(-31, -44, 1.3, 12))
    tusk = shape([(-34, -26), (-40, -28), (-44, -32, C), (-38, -24)])
    return g.difference(tusk.buffer(-0.2))


def snail():
    shell = circle(0, -12, 10)
    body = shape([(-16, 0, C), (-14, -4), (-10, -6), (10, -4), (18, -2), (22, 0, C)])
    g = U(shell, body, stroke([(16, -3), (18, -10), (20, -14)], 1.4, 1.2), stroke([(14, -3), (14, -11)], 1.4, 1.2))
    # spiral cut
    import numpy as np
    pts = [(0 + (1.5 + 0.9 * t) * np.cos(t), -12 + (1.5 + 0.9 * t) * np.sin(t)) for t in np.linspace(0, 8.5, 60)]
    return g.difference(stroke(pts, 1.4, 1.6, res=2))


def dolphin():
    # leaping dolphin, facing right/up; origin at tail
    g = shape([
        (0, 0, C), (6, -4), (10, -10), (16, -20), (26, -30), (38, -36), (48, -38),
        (56, -36), (64, -34, C), (58, -32), (52, -30), (44, -26), (36, -22),
        (30, -16), (26, -8), (22, -2), (18, 4), (14, 6, C), (10, 2), (6, 6, C), (4, 2)
    ], res=10)
    fin = shape([(32, -34), (34, -42), (30, -48, C), (38, -38)])
    fl = shape([(42, -27), (40, -20, C), (46, -26)])
    g = U(g, fin, fl)
    return g.difference(circle(53, -35, 1.0, 10))


def _deer_doe():
    g = shape([
        (-22, -54, C), (-16, -58), (-12, -62), (-14, -70, C), (-8, -64), (-6, -70, C), (-4, -62),
        (-2, -54), (2, -42), (6, -38), (22, -38), (30, -36), (32, -32, C), (30, -28),
        (28, -14), (30, 0, C), (26, 0, C), (24, -16), (20, -22), (16, -22), (18, 0, C), (14, 0, C),
        (12, -20), (4, -22), (2, -12), (2, 0, C), (-2, 0, C), (-2, -14), (-4, -24), (-6, 0, C),
        (-10, 0, C), (-8, -24), (-10, -36), (-12, -46), (-18, -50), (-22, -51)
    ], res=10)
    return g.difference(circle(-14, -56, 1.0, 10))


# ---- improved versions (override earlier drafts)
def wolf_howl():
    head = shape([
        (-27, -101, C), (-20, -97), (-14, -93), (-9, -94),
        (-6, -100), (-3, -107, C), (0, -98),
        (2, -98), (4, -104, C), (5, -94), (6, -86),
        (2, -78), (-6, -76), (-13, -82), (-19, -90), (-25, -97)
    ], res=10)
    body = shape([
        (-8, -84), (2, -86), (6, -76), (12, -62), (22, -46), (28, -28), (30, -12),
        (32, -6), (42, -6), (52, -8), (58, -6, C), (50, -1), (36, 1), (26, 1, C),
        (14, 0, C), (6, -2), (0, -8), (-6, -4), (-8, 0, C), (-19, 0, C), (-18, -3),
        (-15, -6), (-15, -30), (-16, -50), (-14, -66), (-12, -76)
    ], res=10)
    g = U(head, body)
    g = g.difference(poly([(-13, -92.5), (-9.5, -93.5), (-10.5, -91)]))      # eye
    g = g.difference(stroke([(-24, -98.5), (-17, -94), (-14, -91.5)], 1.2, 1.2))  # mouth line
    g = g.difference(stroke([(8, -14), (12, -24), (10, -34)], 1.4, 1.2))     # haunch line
    return g


def dolphin():
    body = U(stroke([(0, 0), (8, -12), (22, -26)], 3.2, 13),
             stroke([(22, -26), (38, -34), (54, -32)], 13, 6),
             stroke([(54, -32), (62, -28)], 6, 2.4))
    fluke = shape([(-2, 2), (-10, -2), (-14, 0, C), (-6, 4), (-10, 10, C), (-4, 8), (2, 4)])
    fin = shape([(26, -31), (28, -40), (24, -46, C), (36, -35)])
    pect = shape([(36, -28), (34, -20, C), (42, -27)])
    g = U(body, fluke, fin, pect)
    g = g.difference(circle(51, -33.5, 1.1, 10))
    return g.difference(stroke([(54, -29.5), (60, -27.5)], 1.0, 1.0))


def frog():
    g = shape([
        (-22, -9, C), (-19, -14), (-14, -17), (-13, -22), (-9, -24), (-5, -22), (-4, -18),
        (4, -17), (12, -13), (18, -6), (21, -2), (24, -1), (26, 0, C), (8, 0, C),
        (2, -2), (-6, -2), (-8, 0), (-14, 0, C), (-13, -2), (-12, -5), (-17, -6)
    ], res=10)
    g = g.difference(circle(-9, -20, 1.6, 12))
    g = g.difference(stroke([(6, -2.5), (12, -9), (16, -4)], 1.2, 1.2))
    return g


def girl_swing():
    head = circle(-1, -31, 5.2)
    pony = stroke([(-5, -33), (-10, -32), (-13, -27)], 3.6, 1.6)
    dress = shape([(-4, -24), (2, -24), (3, -14), (8, -8), (15, -4), (14, -1), (-4, 0), (-6, -10)], res=8)
    neck = line((-1, -27), (-1, -23), 2.6)
    arm = stroke([(0, -22), (4, -15), (5, -17)], 2.4, 2.2)
    legs = U(stroke([(12, -3), (17, 3), (21, 9)], 3.2, 2.6), stroke([(21, 9), (24, 9.5)], 2.6, 2.4))
    seat = poly([(-8, 0), (10, 0), (10, 3), (-8, 3)])
    return U(head, pony, dress, neck, arm, legs, seat)


def bear_walk():
    g = shape([
        (-42, -28), (-38, -40), (-26, -50), (-8, -55), (6, -56), (16, -50), (22, -46),
        (26, -47), (28, -51, C), (32, -46), (38, -44), (45, -40), (50, -37, C),
        (49, -33), (42, -31), (34, -28), (30, -22), (29, -8), (33, -2), (33, 0, C), (21, 0, C),
        (21, -10), (18, -20), (6, -22), (-10, -21), (-16, -18),
        (-14, -8), (-11, -2), (-11, 0, C), (-25, 0, C), (-27, -10), (-34, -14), (-41, -20)
    ], res=10)
    g = g.difference(circle(38, -40, 1.2, 12))
    return g.difference(stroke([(-22, -20), (-20, -30), (-24, -38)], 1.2, 1.2))


def bird_perch():
    g = shape([(-14, -15, C), (-9, -16), (-6, -19), (0, -20), (4, -17), (8, -12), (14, -9),
               (21, -9, C), (14, -5), (8, -1), (0, 0), (-6, -3), (-9, -8), (-9, -12)], res=10)
    legs = U(line((0, -1), (-1, 3), 1.4), line((3, -1), (3, 3), 1.4))
    g = U(g, legs).difference(circle(-4, -15.5, 0.9, 10))
    return g.difference(stroke([(-1, -12), (5, -10), (10, -8)], 1.0, 1.0))
