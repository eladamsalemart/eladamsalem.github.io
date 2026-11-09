"""Open Studio Museum: the five architectural directions as plain geometry (metres, z up).
One source of truth: blender_build.py extrudes it into clay models, svg_build.py draws plans and sections from it.
    python geom.py     -> writes data/<dir>.json"""
import json, math, os, random
HERE = os.path.dirname(os.path.abspath(__file__))

# the ten room kinds of build_rooms.py + connective spaces: floor tint, wall tint
KIND = {
 'white-cube': ('#ECE9E2', '#F4F2EC', 'קובייה לבנה'), 'loft': ('#B7AE9F', '#E6E1D6', 'לופט תעשייתי'),
 'skylit-hall': ('#D8CBB1', '#EFE8D8', 'אולם עם סקיילייט'), 'salon': ('#8A5446', '#7A2F2B', 'סלון'),
 'concrete': ('#8F8F8B', '#A5A5A0', 'בטון חשוף'), 'studio': ('#D6C7A5', '#EFE9DC', 'סטודיו אור צפוני'),
 'apartment': ('#C4A98C', '#E9DFD0', 'דירת אספן'), 'black-box': ('#1E1E1E', '#141414', 'קופסה שחורה'),
 'glass-pavilion': ('#A9C9C4', '#DCEBE8', 'ביתן זכוכית'), 'japanese': ('#B9A27A', '#E4D8BE', 'חדר יפני'),
 'public': ('#F1EDE3', '#F6F3EC', 'חלל ציבורי'), 'tunnel': ('#3A3836', '#4A4743', 'מעבר'),
 'court': ('#C9D6C0', '#D9D5CA', 'חצר'), 'stair': ('#D8D2C4', '#E8E3D8', 'מדרגות'),
}

def rect(x, y, w, d): return [[x, y], [x + w, y], [x + w, y + d], [x, y + d]]
def rrect(cx, cy, w, d, deg):
    a = math.radians(deg); c, s = math.cos(a), math.sin(a)
    return [[cx + px * c - py * s, cy + px * s + py * c] for px, py in ((-w/2, -d/2), (w/2, -d/2), (w/2, d/2), (-w/2, d/2))]
def ngon(cx, cy, r, n, a0=0): return [[cx + r * math.cos(a0 + 2*math.pi*i/n), cy + r * math.sin(a0 + 2*math.pi*i/n)] for i in range(n)]
def sector(cx, cy, r0, r1, a0, a1, st=4):
    A = [math.radians(a0 + (a1 - a0) * i / st) for i in range(st + 1)]
    return [[cx + r1*math.cos(a), cy + r1*math.sin(a)] for a in A] + [[cx + r0*math.cos(a), cy + r0*math.sin(a)] for a in reversed(A)]

class D:
    def __init__(s, key, title): s.d = dict(key=key, title=title, spaces=[], doors=[], paths=[], trees=[], water=[], extras=[], slabs=[], future=[])
    def sp(s, name, kind, poly, h, z=0, roof='solid', role='artist', art=False, walls=True, light='spots'):
        sid = f's{len(s.d["spaces"])}'
        s.d['spaces'].append(dict(id=sid, name=name, kind=kind, poly=poly, h=h, z=z, roof=roof, role=role, art=art, walls=walls, light=light)); return sid
    def door(s, x, y, w=1.8, z=0, h=2.7): s.d['doors'].append(dict(x=x, y=y, w=w, z=z, h=h))
    def room_cam(s, name, lens=16, up=0.0):
        """Second interior view: stand just inside the named room's door and look at its far side."""
        sp = next(x for x in s.d['spaces'] if x['name'] == name)
        P = sp['poly']; cx = sum(p[0] for p in P) / len(P); cy = sum(p[1] for p in P) / len(P)
        def edge_d(dr):
            best = 9
            for i in range(len(P)):
                a, b = P[i], P[(i + 1) % len(P)]; L = math.hypot(b[0] - a[0], b[1] - a[1])
                t = ((dr['x'] - a[0]) * (b[0] - a[0]) + (dr['y'] - a[1]) * (b[1] - a[1])) / L
                best = min(best, math.hypot(a[0] + (b[0] - a[0]) * t / L - dr['x'], a[1] + (b[1] - a[1]) * t / L - dr['y']) if -.3 <= t <= L + .3 else 9)
            return best
        dr = min((d for d in s.d['doors'] if abs(d['z'] - sp['z']) < .01), key=edge_d)
        vx, vy = cx - dr['x'], cy - dr['y']; L = math.hypot(vx, vy); vx, vy = vx / L, vy / L
        ppl = [[cx + vy * 1.2, cy - vx * 1.2, sp['z']], [cx - vy * .6 + vx * 1.5, cy + vx * .6 + vy * 1.5, sp['z']]]
        s.d['cams']['ints'].append(dict(name=name, loc=[dr['x'] + vx * 1.1, dr['y'] + vy * 1.1, sp['z'] + 1.65 + up], tgt=[cx + vx * L * .6, cy + vy * L * .6, sp['z'] + 1.7], lens=lens, people=ppl))
    def out(s):
        os.makedirs(os.path.join(HERE, 'data'), exist_ok=True)
        json.dump(s.d, open(os.path.join(HERE, 'data', s.d['key'] + '.json'), 'w', encoding='utf-8'), ensure_ascii=False)
        return s.d

# ---------------------------------------------------------------- A. the street
def street():
    g = D('A', 'הרחוב')
    g.sp('הרחוב', 'public', rect(0, 0, 96, 8), 9, roof='slot', role='public', light='sky')
    g.sp('שער זכוכית', 'glass-pavilion', rect(-14, -4, 14, 16), 4.5, roof='solid', role='public')
    g.door(0, 4, 4); g.door(-14, 4, 3.5)
    g.sp('האולם הגדול (מהאפליקציה)', 'loft', rect(4, 8, 40, 10), 7, roof='slot', role='app', art=True, light='sky')
    for x in (12, 24, 36): g.door(x, 8, 3.2, h=4)
    g.sp('גלריה מתחלפת', 'white-cube', rect(48, 8, 15, 10), 5.5, roof='slot', role='app', art=True, light='sky'); g.door(55.5, 8, 3.2, h=4)
    g.sp('חדר העונה', 'skylit-hall', rect(66, 8, 10, 10), 6, roof='slot', role='app', art=True, light='sky'); g.door(71, 8, 2.8, h=4)
    g.sp('וידאו', 'black-box', rect(78, 8, 14, 10), 5, roof='solid', role='artist', art=True, light='dark'); g.door(85, 8, 2.4)
    kinds = ['white-cube', 'salon', 'concrete', 'japanese', 'studio', 'apartment', 'white-cube', 'salon', 'concrete']
    for i, k in enumerate(kinds):
        x = 4 + 9 * i
        g.sp(f'אמן {i+1}', k, rect(x, -6, 8, 6), 4.2, roof='solid', role='artist', art=True); g.door(x + 4, 0, 1.8)
    g.d['future'] = [rect(4 + 9 * i, -6, 8, 6) for i in (9, 10)] + [rect(96, 0, 24, 8)] + [rect(94, 8, 22, 10)]
    g.d['cams'] = dict(axon=dict(az=38, el=36), ints=[dict(name='הרחוב', loc=[3, 4, 1.65], tgt=[70, 4.5, 3.2], lens=17, people=[[12,3.5,0],[14.5,5,0],[30,2.2,0],[31.2,2.8,0],[44,5.5,0]])])
    g.d['flow'] = [[-14, 4], [0, 4], [90, 4]]
    g.room_cam('האולם הגדול (מהאפליקציה)', 18)
    return g.out()

# ---------------------------------------------------------------- B. the void
def void():
    g = D('B', 'החלל'); R0, R1 = 8, 20
    g.sp('החלל המרכזי', 'public', ngon(0, 0, R0, 32), 19, z=0, roof='none', role='public', walls=False, light='sky')
    lv = [(0, 6, list(range(8)), -90 + 22.5), (6.4, 4, [0, 1, 3, 4, 5, 6, 7], -90 + 22.5), (10.8, 7.2, [1, 2, 4, 5, 6, 7], -90 + 22.5)]
    kinds = [['public', 'loft', 'skylit-hall', 'white-cube', 'salon', 'glass-pavilion', 'concrete', 'white-cube'],
             ['japanese', 'salon', None, 'studio', 'apartment', 'black-box', 'white-cube', 'concrete'],
             [None, 'white-cube', 'salon', None, 'japanese', 'studio', 'black-box', 'skylit-hall']]
    for L, (z, h, idx, a0) in enumerate(lv):
        for i in idx:
            k = kinds[L][i]
            if k is None: continue
            a_s = a0 + 45 * i; poly = sector(0, 0, R0, R1, a_s, a_s + 45, 4)
            role = 'public' if k == 'public' else ('app' if (L == 0 and i in (1, 2, 3)) else 'artist')
            g.sp(('הלובי והכניסה' if k == 'public' else f'קומה {L+1} · {i+1}'), k, poly, h, z=z, roof='solid', role=role, art=(k != 'public'))
            am = math.radians(a_s + 22.5); g.door(R0 * math.cos(am), R0 * math.sin(am), 4.2, z=z, h=min(h - .6, 3.6))
            if L == 0 and k == 'public': g.door(R1 * math.cos(am), R1 * math.sin(am), 4, z=z, h=3.6)
    g.d['extras'].append(dict(type='helix', cx=0, cy=0, r=7.2, z0=0, z1=16.8, turns=1.6, w=1.6))
    g.d['cams'] = dict(axon=dict(az=30, el=40), ints=[dict(name='החלל', loc=[0, -4.5, 1.65], tgt=[1.5, 5, 9.5], lens=14, people=[[-3,0.5,0],[4,2,0],[1,-1.5,0]])])
    g.room_cam('קומה 1 · 2', 17)
    return g.out()

# ---------------------------------------------------------------- C. garden of pavilions
def garden():
    g = D('C', 'הגן והביתנים'); rnd = random.Random(7)
    g.sp('שער זכוכית', 'glass-pavilion', rect(-9, 0, 18, 11), 4.5, roof='solid', role='public'); g.door(0, 11, 4); g.door(0, 0, 3.5)
    cx, cy, ax, ay = 0, 44, 36, 24
    g.d['water'] = [[cx + 14 * math.cos(t), cy + 9 * math.sin(t)] for t in [i * math.pi / 8 for i in range(16)]]
    path = [[cx + ax * math.cos(t), cy + ay * math.sin(t)] for t in [math.radians(-90 + 15 * i) for i in range(25)]]
    g.d['paths'] = [dict(pts=[[0, 11], [0, 20], path[0]], w=3), dict(pts=path, w=2.6)]
    plan = [('japanese', 6, 6), ('white-cube', 9, 7), ('concrete', 8, 8), ('salon', 8, 6), ('studio', 8, 6), ('skylit-hall', 12, 8), ('glass-pavilion', 10, 8),
            ('black-box', 8, 6), ('apartment', 7, 5), ('white-cube', 9, 7), ('loft', 14, 8), ('japanese', 6, 6)]
    ang0 = [-70, -40, -12, 15, 40, 65, 90, 115, 140, 165, 200, 230]
    for i, ((k, w, d), a) in enumerate(zip(plan, ang0)):
        ar = math.radians(a)
        px, py = cx + (ax + 7 + d / 2) * math.cos(ar), cy + (ay + 7 + d / 2) * math.sin(ar)
        rot = math.degrees(math.atan2(cy - py, cx - px)) + 90
        poly = rrect(px, py, w, d, rot - 180)
        role = 'app' if k in ('skylit-hall', 'loft') else 'artist'
        g.sp(('הביתן המרכזי' if k == 'loft' else f'ביתן {i+1}'), k, poly, 4.0 if k not in ('skylit-hall', 'loft') else 6, roof='solid', role=role, art=True)
        m1 = [(poly[2][0] + poly[3][0]) / 2, (poly[2][1] + poly[3][1]) / 2]; m2 = [(poly[0][0] + poly[1][0]) / 2, (poly[0][1] + poly[1][1]) / 2]
        near = min((m1, m2), key=lambda m: (m[0] - cx) ** 2 + (m[1] - cy) ** 2)
        g.door(near[0], near[1], 1.8)
        pa = [cx + ax * math.cos(ar), cy + ay * math.sin(ar)]
        g.d['paths'].append(dict(pts=[pa, near], w=1.6))
    g.d['future'] = [rrect(cx + (ax + 24) * math.cos(math.radians(a)), cy + (ay + 24) * math.sin(math.radians(a)), 8, 6, a + 90) for a in (-50, 0, 50, 100, 150, 195)]
    for _ in range(90):
        a = rnd.uniform(0, 6.283); r = rnd.uniform(0.55, 1.5)
        x, y = cx + (ax + 14) * r * math.cos(a), cy + (ay + 14) * r * math.sin(a)
        if (x / (ax + 4)) ** 2 + ((y - cy) / (ay + 4)) ** 2 > 0.45 and (x ** 2 + (y - 8) ** 2) > 140:
            g.d['trees'].append([x, y, rnd.uniform(2.2, 4.2)])
    g.d['cams'] = dict(axon=dict(az=210, el=38), ints=[dict(name='מהשביל', loc=[2, 15, 1.7], tgt=[0, 62, 4.5], lens=22, people=[[0,26,0],[3.5,24,0],[-4,33,0]])])
    g.room_cam('ביתן 2', 16)
    return g.out()

# ---------------------------------------------------------------- D. the descent
def descent():
    g = D('D', 'הירידה')
    g.sp('שער', 'concrete', rect(0, 0, 8, 6), 4, z=0, roof='solid', role='public'); g.door(4, 0, 2.4, z=0); g.door(4, 6, 3, z=0)
    g.sp('מדרגות', 'tunnel', rect(2.8, -16, 2.4, 16), 3, z=-5, roof='solid', role='public', light='dark')
    g.sp('חדר השקט', 'black-box', rect(0, -22, 8, 6), 5, z=-5, roof='solid', role='artist', art=True, light='dark'); g.door(4, -16, 2, z=-5)
    g.sp('מעבר', 'tunnel', rect(8, -20.5, 12, 2.5), 3, z=-5, roof='solid', role='public', light='dark'); g.door(8, -19.25, 2.2, z=-5); g.door(20, -19.25, 2.2, z=-5)
    g.sp('באר האור', 'concrete', rect(20, -24, 8, 8), 9, z=-5, roof='slot', role='app', art=True, light='sky'); g.door(24, -24, 2.2, z=-5)
    g.sp('מדרגות', 'tunnel', rect(22.8, -32, 2.4, 8), 3, z=-8, roof='solid', role='public', light='dark'); g.door(24, -32, 2.2, z=-8)
    g.sp('האולם הגדול (מהאפליקציה)', 'concrete', rect(12, -42, 22, 10), 8, z=-8, roof='slot', role='app', art=True, light='sky')
    g.sp('מעבר', 'tunnel', rect(34, -40.5, 16, 2.5), 3, z=-8, roof='solid', role='public', light='dark'); g.door(34, -39.25, 2.4, z=-8); g.door(50, -39.25, 2.4, z=-8)
    g.sp('חצר האור', 'court', rect(50, -48, 16, 18), 5, z=-8, roof='none', role='public', walls=False, light='sky')
    cells = [(rect(50, -30, 8, 6), 'white-cube', (54, -30)), (rect(58, -30, 8, 6), 'studio', (62, -30)),
             (rect(50, -54, 8, 6), 'apartment', (54, -48)), (rect(58, -54, 8, 6), 'salon', (62, -48)),
             (rect(66, -48, 6, 6), 'japanese', (66, -45)), (rect(66, -42, 6, 6), 'black-box', (66, -39)), (rect(66, -36, 6, 6), 'concrete', (66, -33)),
             (rect(44, -48, 6, 7), 'white-cube', (50, -44.5)), (rect(44, -37.5, 6, 7.5), 'studio', (50, -33.7))]
    for i, (poly, k, dp) in enumerate(cells):
        g.sp(f'תא {i+1}', k, poly, 5, z=-8, roof='solid', role='artist', art=True); g.door(dp[0], dp[1], 1.8, z=-8)
    g.d['future'] = [rect(50, -84, 16, 18), rect(72, -48, 8, 18)]
    g.d['cams'] = dict(axon=dict(az=35, el=42), ints=[dict(name='האולם התחתון', loc=[12.6, -37.5, -6.4], tgt=[33, -37, -5.3], lens=18, people=[[20,-37.5,-8],[22,-39.2,-8],[30,-36,-8]])])
    g.d['flow'] = [[4, 3], [4, -16], [4, -19], [24, -19.25], [24, -37], [40, -39.25], [58, -39]]
    g.d['cams']['ints'].append(dict(name='חצר האור', loc=[50.6, -39.25, -6.3], tgt=[66, -38.5, -5.6], lens=17, people=[[56, -41, -8], [58, -37.5, -8]]))
    return g.out()

# ---------------------------------------------------------------- E. the open depot
def depot():
    g = D('E', 'המחסן הפתוח')
    g.sp('הבמה (תערוכה נשלפת)', 'white-cube', rect(-8, -8, 16, 16), 6, roof='none', role='app', art=True, light='sky')
    for dx, dy in ((0, -8), (0, 8), (-8, 0), (8, 0)): g.door(dx, dy, 3.2, h=4)
    g.sp('חלל המחסן', 'public', rect(-16, -16, 32, 32), 17, roof='none', role='public', walls=False, light='sky')
    kinds = ['white-cube', 'salon', 'concrete', 'japanese', 'studio', 'apartment', 'black-box', 'skylit-hall', 'glass-pavilion', 'loft']
    n = 0
    for L, z in enumerate((0, 4.2, 8.4)):
        for side in range(4):
            for j in range(6):
                t = -15 + 5 * j
                if side == 0: poly, dr = rect(t, 16, 5, 5), (t + 2.5, 16)
                elif side == 1: poly, dr = rect(t, -21, 5, 5), (t + 2.5, -16)
                elif side == 2: poly, dr = rect(16, t, 5, 5), (16, t + 2.5)
                else: poly, dr = rect(-21, t, 5, 5), (-16, t + 2.5)
                k = kinds[(n * 3 + L) % 10]; n += 1
                g.sp(f'תא {n}', k, poly, 3.8, z=z, roof='solid', role='artist', art=(L == 0 and j in (1, 4))); g.door(dr[0], dr[1], 1.6, z=z, h=3)
    for s in (-18.5, 18.5):
        for t in (-18.5, 18.5): g.sp('מדרגות', 'stair', rect(s - 2.5, t - 2.5, 5, 5), 12.6, roof='solid', role='public')
    for z in (4.2, 8.4):
        g.d['slabs'].append(dict(poly=rect(-16, 14, 32, 2), z=z - .2)); g.d['slabs'].append(dict(poly=rect(-16, -16, 32, 2), z=z - .2))
        g.d['slabs'].append(dict(poly=rect(14, -14, 2, 28), z=z - .2)); g.d['slabs'].append(dict(poly=rect(-16, -14, 2, 28), z=z - .2))
    g.d['future'] = [rect(-26, -26, 52, 52)]
    g.d['cams'] = dict(axon=dict(az=32, el=38), ints=[dict(name='המחסן', loc=[-13, -13.5, 1.65], tgt=[7, 10, 8.5], lens=15, people=[[-3,-6,0],[2,0,0],[5,5,0],[-6,8,0]])])
    g.room_cam('תא 2', 15)
    return g.out()

ALL = (street, void, garden, descent, depot)


def graph(d):
    """The museum as a graph (what the app would store): spaces are nodes, doors are portals between the spaces they touch."""
    def near(s, x, y):
        P = s['poly']
        for i in range(len(P)):
            a, b = P[i], P[(i + 1) % len(P)]; L = math.hypot(b[0] - a[0], b[1] - a[1])
            t = ((x - a[0]) * (b[0] - a[0]) + (y - a[1]) * (b[1] - a[1])) / L
            if -.3 <= t <= L + .3 and math.hypot(a[0] + (b[0] - a[0]) * t / L - x, a[1] + (b[1] - a[1]) * t / L - y) < .45: return True
        return False
    nodes = [dict(id=s['id'], kind=s['kind'], role=s['role'], name=s['name'], x=round(sum(p[0] for p in s['poly']) / len(s['poly']), 1),
                  y=round(sum(p[1] for p in s['poly']) / len(s['poly']), 1), z=s['z']) for s in d['spaces']]
    portals = []
    for dr in d['doors']:
        ids = [s['id'] for s in d['spaces'] if abs(s['z'] - dr['z']) < .01 and near(s, dr['x'], dr['y'])]
        if len(ids) >= 2: portals.append(dict(a=ids[0], b=ids[1], kind='door', width=dr['w']))
        elif len(ids) == 1: portals.append(dict(a=ids[0], b='outside', kind='door', width=dr['w']))
    return dict(direction=d['key'], nodes=nodes, portals=portals)


if __name__ == '__main__':
    for f in ALL:
        d = f(); g = graph(d); print(d['key'], len(d['spaces']), 'spaces', len(d['doors']), 'doors ->', len(g['portals']), 'portals')
        json.dump(g, open(os.path.join(HERE, 'data', d['key'] + '-graph.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
