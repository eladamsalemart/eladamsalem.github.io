"""Clay models of the museum directions (Cycles, CPU). Reads data/<key>.json written by geom.py.
    blender -b --factory-startup -P blender_build.py -- --dir A --shot axon|int [--samples 48] [--size 1400x900]
axon: roofless axonometric (orthographic) showing plan and walls; int: eye-level view with roofs and light."""
import bpy, bmesh, json, math, os, sys, random
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
a = sys.argv[sys.argv.index('--') + 1:]
O = dict(dir='A', shot='axon', samples=48, size='1400x900')
for i in range(0, len(a), 2): O[a[i].lstrip('-')] = a[i + 1]
W, H = map(int, O['size'].split('x')); O['samples'] = int(O['samples'])
G = json.load(open(os.path.join(HERE, 'data', O['dir'] + '.json'), encoding='utf-8'))
INT = O['shot'] == 'int'
KIND = {'white-cube': ('#ECE9E2', '#F4F2EC'), 'loft': ('#B7AE9F', '#E6E1D6'), 'skylit-hall': ('#D8CBB1', '#EFE8D8'), 'salon': ('#8A5446', '#9A3F38'),
        'concrete': ('#8F8F8B', '#A5A5A0'), 'studio': ('#D6C7A5', '#EFE9DC'), 'apartment': ('#C4A98C', '#E9DFD0'), 'black-box': ('#1E1E1E', '#181818'),
        'glass-pavilion': ('#A9C9C4', '#DCEBE8'), 'japanese': ('#B9A27A', '#E4D8BE'), 'public': ('#F1EDE3', '#F6F3EC'), 'tunnel': ('#3A3836', '#55524D'),
        'court': ('#C9D6C0', '#D9D5CA'), 'stair': ('#D8D2C4', '#E8E3D8')}
ROLE_TINT = {'app': '#B5532F', 'artist': None, 'public': None}


def hexc(h, k=1.0):
    h = h.lstrip('#'); c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    c = [(x / 12.92 if x <= .04045 else ((x + .055) / 1.055) ** 2.4) * k for x in c]; return (*c, 1)

MATS = {}
def mat(name, col, rough=.85, emit=None):
    if name in MATS: return MATS[name]
    m = bpy.data.materials.new(name); m.use_nodes = True; b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = col; b.inputs['Roughness'].default_value = rough
    if emit:
        b.inputs['Emission Color'].default_value = col; b.inputs['Emission Strength'].default_value = emit
    em = float(os.environ.get('EM', 0.07 if INT else 0.13))
    if em and name not in ('water',): b.inputs['Emission Color'].default_value = col; b.inputs['Emission Strength'].default_value = em
    MATS[name] = m; return m

def obj_from(name, verts, faces, m):
    me = bpy.data.meshes.new(name); me.from_pydata(verts, [], faces); me.update()
    o = bpy.data.objects.new(name, me); bpy.context.collection.objects.link(o); me.materials.append(m); return o

def prism(name, poly, z0, z1, m):
    if sum(poly[i][0]*poly[(i+1)%len(poly)][1]-poly[(i+1)%len(poly)][0]*poly[i][1] for i in range(len(poly)))<0: poly = list(reversed(poly))
    n = len(poly); v = [(p[0], p[1], z0) for p in poly] + [(p[0], p[1], z1) for p in poly]
    f = [list(reversed(range(n))), list(range(n, 2 * n))] + [[i, (i + 1) % n, n + (i + 1) % n, n + i] for i in range(n)]
    return obj_from(name, v, f, m)

SEEN = set()
def box(name, a_, b_, t, z0, z1, m):
    if name in ('w', 'l'):
        k = (name, tuple(sorted([(round(a_[0], 1), round(a_[1], 1)), (round(b_[0], 1), round(b_[1], 1))])), round(z0, 1))
        if k in SEEN: return None
        SEEN.add(k)
    dx, dy = b_[0] - a_[0], b_[1] - a_[1]; L = math.hypot(dx, dy)
    if L < 1e-3: return None
    nx, ny = -dy / L * t / 2, dx / L * t / 2
    poly = [[a_[0] + nx, a_[1] + ny], [b_[0] + nx, b_[1] + ny], [b_[0] - nx, b_[1] - ny], [a_[0] - nx, a_[1] - ny]]
    return prism(name, poly, z0, z1, m)

def doors_on(p, q, z):
    L = math.hypot(q[0] - p[0], q[1] - p[1]); gaps = []
    for d in G['doors']:
        if abs(d['z'] - z) > .01: continue
        t = ((d['x'] - p[0]) * (q[0] - p[0]) + (d['y'] - p[1]) * (q[1] - p[1])) / L
        px, py = p[0] + (q[0] - p[0]) * t / L, p[1] + (q[1] - p[1]) * t / L
        if math.hypot(px - d['x'], py - d['y']) < .35 and -d['w'] / 2 < t < L + d['w'] / 2:
            gaps.append((max(0, t - d['w'] / 2), min(L, t + d['w'] / 2), d['h']))
    return sorted(gaps), L

def walls(sp, wm):
    P = sp['poly']; n = len(P); z0, z1 = sp['z'], sp['z'] + sp['h']
    for i in range(n):
        p, q = P[i], P[(i + 1) % n]; gaps, L = doors_on(p, q, sp['z'])
        ux, uy = (q[0] - p[0]) / L, (q[1] - p[1]) / L; at = lambda t: [p[0] + ux * t, p[1] + uy * t]
        cur = 0
        for g0, g1, h in gaps:
            if g0 > cur + .01: box('w', at(cur), at(g0), .3, z0, z1, wm)
            box('l', at(g0), at(g1), .3, z0 + h, z1, wm); cur = max(cur, g1)
        if cur < L - .01: box('w', at(cur), at(L), .3, z0, z1, wm)

def frames(sp, rnd):
    P = sp['poly']; n = len(P); cols = ['#C8553D', '#2F4B6E', '#E1B04A', '#3F6B57', '#1B1B1B', '#D9CDB5', '#8A5E9A', '#4C8DA3']
    for i in range(n):
        p, q = P[i], P[(i + 1) % n]; gaps, L = doors_on(p, q, sp['z'])
        if L < 4: continue
        ux, uy = (q[0] - p[0]) / L, (q[1] - p[1]) / L; cx, cy = sum(x[0] for x in P) / n, sum(x[1] for x in P) / n
        nx, ny = -uy, ux
        if (cx - p[0]) * nx + (cy - p[1]) * ny < 0: nx, ny = -nx, -ny   # toward the room's centre
        t = 1.5
        while t < L - 1.5:
            w = rnd.choice([1.0, 1.4, 0.8, 1.8, 2.4]); h = rnd.choice([1.2, 1.6, 1.0, 1.4])
            if any(g0 - .8 < t + w / 2 and t - w / 2 < g1 + .8 for g0, g1, _ in gaps) or t + w / 2 > L - 1: t += 1.2; continue
            ox, oy = p[0] + ux * t + nx * .17, p[1] + uy * t + ny * .17
            a_ = [ox - ux * w / 2, oy - uy * w / 2]; b_ = [ox + ux * w / 2, oy + uy * w / 2]
            zc = sp['z'] + (1.55 if sp['kind'] != 'salon' else 1.8) + rnd.uniform(-.1, .2)
            m = mat('art' + str(rnd.randrange(len(cols))), hexc(rnd.choice(cols)), .5)
            box('art', a_, b_, .06, zc - h / 2, zc + h / 2, m); t += w + rnd.choice([1.4, 2.2, 3])

def roof(sp, m):
    P = sp['poly']; z1 = sp['z'] + sp['h']
    if sp['roof'] == 'solid': prism('roof', P, z1, z1 + .3, m)
    elif sp['roof'] == 'slot':
        xs = [p[0] for p in P]; ys = [p[1] for p in P]; x0, x1, y0, y1 = min(xs), max(xs), min(ys), max(ys)
        if x1 - x0 >= y1 - y0:
            c = (y0 + y1) / 2; w = min(2.2, (y1 - y0) / 4)
            prism('roof', [[x0, y0], [x1, y0], [x1, c - w], [x0, c - w]], z1, z1 + .3, m); prism('roof', [[x0, c + w], [x1, c + w], [x1, y1], [x0, y1]], z1, z1 + .3, m)
        else:
            c = (x0 + x1) / 2; w = min(2.2, (x1 - x0) / 4)
            prism('roof', [[x0, y0], [c - w, y0], [c - w, y1], [x0, y1]], z1, z1 + .3, m); prism('roof', [[c + w, y0], [x1, y0], [x1, y1], [c + w, y1]], z1, z1 + .3, m)


# ------------------------------------------------------------------ scene
bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene; sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'; sc.cycles.samples = O['samples']
sc.cycles.use_denoising = not os.environ.get('NODN'); sc.cycles.denoiser = 'OPENIMAGEDENOISE'; sc.render.resolution_x, sc.render.resolution_y = W, H
sc.view_settings.view_transform = 'AgX'; sc.view_settings.look = 'AgX - Medium High Contrast' if False else 'None'
sc.cycles.max_bounces = 5; sc.cycles.use_adaptive_sampling = True; sc.cycles.adaptive_threshold = 0.03
rnd = random.Random(3)
zmin = min(s['z'] for s in G['spaces'])
white = mat('white', hexc('#F2EFE8'), .9); roofm = mat('roofm', hexc('#EEEAE0'), .9)
xs = [p[0] for s in G['spaces'] for p in s['poly']]; ys = [p[1] for s in G['spaces'] for p in s['poly']]
bx0, bx1, by0, by1 = min(xs) - 30, max(xs) + 30, min(ys) - 30, max(ys) + 30
ground_m = mat('ground', hexc('#E4E0D4' if not INT else '#CFCBBE'), 1)
if G['key'] != 'D' or INT is False:
    prism('ground', [[bx0, by0], [bx1, by0], [bx1, by1], [bx0, by1]], zmin - .6, zmin - .05, ground_m) if G['key'] != 'D' else None
if G['key'] == 'D':   # underground: a pale earth floor far below, no cover
    prism('ground', [[bx0, by0], [bx1, by0], [bx1, by1], [bx0, by1]], -9.6, -8.3, ground_m)
for s in G['spaces']:
    fl, wl = KIND[s['kind']]
    fm = mat('f' + s['kind'], hexc(fl), .55 if s['kind'] != 'concrete' else .8)
    prism('floor', s['poly'], s['z'] - .25, s['z'], fm)
    if s['role'] == 'app' and not INT:
        prism('mark', s['poly'], s['z'], s['z'] + .02, mat('mark', hexc('#C4673F'), .6))
    if s['walls']:
        walls(s, mat('w' + s['kind'], hexc(wl), .9))
        if INT or s['kind'] in ('tunnel',): roof(s, roofm if s['kind'] != 'black-box' else mat('wblack-box', hexc('#181818')))
        if s['kind'] == 'tunnel' and not INT: pass
    elif INT and s['roof'] == 'solid': roof(s, roofm)
    if INT and s['art'] and s['walls']: frames(s, rnd)
for sl in G['slabs']: prism('slab', sl['poly'], sl['z'], sl['z'] + .25, white)
for e in G['extras']:
    if e['type'] == 'helix':
        n = 90; hm = mat('stair', hexc('#E7E1D3'), .7)
        for i in range(n):
            t0, t1 = i / n, (i + 1) / n; ang = lambda t: 2 * math.pi * e['turns'] * t - math.pi / 2
            za = e['z0'] + (e['z1'] - e['z0']) * t0
            pa = [e['cx'] + (e['r'] - e['w']) * math.cos(ang(t0)), e['cy'] + (e['r'] - e['w']) * math.sin(ang(t0))]
            pb = [e['cx'] + e['r'] * math.cos(ang(t0)), e['cy'] + e['r'] * math.sin(ang(t0))]
            pc = [e['cx'] + e['r'] * math.cos(ang(t1)), e['cy'] + e['r'] * math.sin(ang(t1))]
            pd = [e['cx'] + (e['r'] - e['w']) * math.cos(ang(t1)), e['cy'] + (e['r'] - e['w']) * math.sin(ang(t1))]
            prism('step', [pa, pb, pc, pd], za, za + .28, hm)
# garden: paths, water, trees
pm = mat('path', hexc('#CFC6B0'), 1)
for p in G['paths']:
    for a_, b_ in zip(p['pts'][:-1], p['pts'][1:]): box('p', a_, b_, p['w'], zmin + .0, zmin + .04, pm)
if G['water']: prism('water', G['water'], zmin - .04, zmin + .06, mat('water', hexc('#7FA3B0'), .05))
for x, y, r in G['trees']:
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2, radius=r, location=(x, y, zmin + r * 2.0)); o = bpy.context.object; o.scale.z = 1.2
    o.data.materials.append(mat('tree', hexc('#7E9B6A'), 1)); bpy.ops.object.shade_smooth()
    box('trunk', [x, y], [x, y + .01], .4, zmin, zmin + r * 1.5, mat('trunk', hexc('#6B5A48')))

# world + light
wd = bpy.data.worlds.new('w'); sc.world = wd; wd.use_nodes = True; bg = wd.node_tree.nodes['Background']
bg.inputs['Color'].default_value = hexc('#EDEBE6' if not INT else '#BFD3E6'); bg.inputs['Strength'].default_value = float(os.environ.get('WS', 1.1 if not INT else 1.3)); print('WORLD', bg.inputs['Color'].default_value[:], sc.world)
sun = bpy.data.lights.new('sun', 'SUN'); sun.energy = 5.0 if not INT else 4.5; sun.angle = math.radians(4)
so = bpy.data.objects.new('sun', sun); bpy.context.collection.objects.link(so); so.rotation_euler = (math.radians(48), math.radians(8), math.radians(float(os.environ.get('SUNZ', -35))))
if INT:   # soft ceiling lights in rooms that are lit by lamps and have roofs (the sky does the rest)
    for s in G['spaces']:
        if s['roof'] == 'solid' and s['walls'] and s['light'] != 'dark':
            xs_ = [p[0] for p in s['poly']]; ys_ = [p[1] for p in s['poly']]
            L = bpy.data.lights.new('l', 'AREA'); L.shape = 'RECTANGLE'; L.size = max(xs_) - min(xs_) - 1; L.size_y = max(ys_) - min(ys_) - 1
            L.energy = 40 * (L.size * L.size_y) ** .5 * (0.6 if s['kind'] == 'salon' else 1); L.color = (1, .93, .82)
            lo = bpy.data.objects.new('l', L); bpy.context.collection.objects.link(lo); lo.location = ((min(xs_) + max(xs_)) / 2, (min(ys_) + max(ys_)) / 2, s['z'] + s['h'] - .05); lo.rotation_euler = (math.pi, 0, 0)
        elif s['light'] == 'dark' and s['walls']:
            xs_ = [p[0] for p in s['poly']]; ys_ = [p[1] for p in s['poly']]
            L = bpy.data.lights.new('l', 'SPOT'); L.energy = 900; L.spot_size = math.radians(40); L.color = (1, .9, .75)
            lo = bpy.data.objects.new('l', L); bpy.context.collection.objects.link(lo); lo.location = ((min(xs_) + max(xs_)) / 2, (min(ys_) + max(ys_)) / 2, s['z'] + s['h'] - .1)

# camera
cam = bpy.data.cameras.new('c'); cam.clip_end = 3000; cam.clip_start = 0.1; co = bpy.data.objects.new('c', cam); bpy.context.collection.objects.link(co); sc.camera = co
if INT:
    c = G['cams']['ints'][0]; co.location = Vector(c['loc']); cam.lens = c['lens']; cam.sensor_width = 36
    d = Vector(c['tgt']) - co.location; co.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
else:
    c = G['cams']['axon']; cam.type = 'ORTHO'
    cx, cy = (min(xs) + max(xs)) / 2, (min(ys) + max(ys)) / 2; zc = zmin + 3
    az, el = math.radians(c['az']), math.radians(c['el']); dist = 400
    co.location = Vector((cx + dist * math.sin(az) * math.cos(el) * -1, cy - dist * math.cos(az) * math.cos(el), zc + dist * math.sin(el)))
    d = Vector((cx, cy, zc)) - co.location; co.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
    span = max(max(xs) - min(xs), max(ys) - min(ys)) + 30
    cam.ortho_scale = span * 1.18 * max(1, (W / H) / 1.55 if False else 1)
    # fit: project bbox corners to the camera frame
    inv = co.matrix_world.inverted() if False else None
    bpy.context.view_layer.update(); inv = co.matrix_world.inverted()
    zmax = max(sp['z'] + sp['h'] for sp in G['spaces'])
    pts = [inv @ Vector((x_, y_, z_)) for x_ in (min(xs), max(xs)) for y_ in (min(ys), max(ys)) for z_ in (zmin, zmax)]
    mx = (max(p.x for p in pts) - min(p.x for p in pts)) * 1.08 + 4; my = (max(p.y for p in pts) - min(p.y for p in pts)) * 1.08 + 4
    ox = (max(p.x for p in pts) + min(p.x for p in pts)) / 2; oy = (max(p.y for p in pts) + min(p.y for p in pts)) / 2
    co.location = co.location + co.matrix_world.to_3x3() @ Vector((ox, oy, 0)); bpy.context.view_layer.update()
    cam.ortho_scale = max(mx, my * W / H)
    sc.render.film_transparent = False
if os.environ.get('RAY'):
    from bpy_extras.object_utils import world_to_camera_view
    bpy.context.view_layer.update(); dg = bpy.context.evaluated_depsgraph_get()
    px, py = map(float, os.environ['RAY'].split(','))
    # ortho ray: origin offset in camera plane
    fx = (px / W - .5) * cam.ortho_scale; fy = (.5 - py / H) * cam.ortho_scale * H / W
    mw = co.matrix_world; org = mw @ Vector((fx, fy, 0)); dr = (mw.to_3x3() @ Vector((0, 0, -1))).normalized()
    hit, loc, nor, idx, ob, _ = bpy.context.scene.ray_cast(dg, org, dr)
    print('RAYHIT', ob.data.materials[0].node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value[:], [ (m.name) for m in ob.data.materials], len(ob.data.polygons), [round(v.co.z,2) for v in ob.data.vertices][:8], hit, ob.name if ob else None, ob.data.materials[0].name if ob else None, loc, nor)
out = os.path.join(HERE, 'renders', f"{O['dir']}-{O['shot']}.png")
sc.render.filepath = out; sc.render.image_settings.file_format = 'PNG'
bpy.ops.render.render(write_still=True); print('done', out)
