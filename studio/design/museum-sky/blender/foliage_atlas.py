# Tropical foliage atlas for the museum's outside (ROADMAP 19): procedural leaves (no downloaded assets), lit and rendered by Cycles
# into transparent 512 px cells, then put together by atlas_build.py into studio/app/data/rooms/outside/tropics.webp (4 x 3 cells).
#   blender -b --python studio/design/museum-sky/blender/foliage_atlas.py -- OUTDIR [samples] [only-cell]
# cells: 0 palm A (arching), 1 palm B (upright), 2 banana, 3 monstera + elephant ears, 4 fern, 5 heliconia/ginger, 6 shrub, 7 hanging vines,
#        8 palm A seen from below, 9 banana 2, 10 fern 2 (broad), 11 palm B seen from below
import bpy, bmesh, math, sys, random
from mathutils import Vector, Matrix

args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUT = args[0] if args else '/tmp/atlas'
SAMPLES = int(args[1]) if len(args) > 1 else 48
ONLY = int(args[2]) if len(args) > 2 else -1
Z = Vector((0, 0, 1))
V, F, C = [], [], []          # vertices, faces, colours (per vertex)

def hsv(h, s, v):
    import colorsys
    r, g, b = colorsys.hsv_to_rgb(h % 1, max(0, min(1, s)), max(0, min(1, v)))
    return (r ** 2.2, g ** 2.2, b ** 2.2)   # to linear

def quad(a, b, c, d, ca, cb, cc, cd):
    n = len(V); V.extend([a, b, c, d]); F.append((n, n + 1, n + 2, n + 3)); C.extend([ca, cb, cc, cd])

def lerpc(a, b, t): return tuple(a[i] + (b[i] - a[i]) * t for i in range(3))

def leaf(p0, d0, wd, L, W, curve=0.0, axis=None, col=(0.1, 0.3, 0.05), rib=None, seg=8, prof='ovate', fold=0.22, cuts=0, cutdepth=0.8, rng=None):
    """a leaf blade from p0 along d0, W wide (along wd), bending by `curve` radians per unit length about `axis` (default: down)."""
    d = Vector(d0).normalized(); w = (Vector(wd) - d * Vector(wd).dot(d)).normalized(); p = Vector(p0)
    if axis is None:
        axis = d.cross(-Z)
        if axis.length < 1e-4: axis = w
    axis = Vector(axis).normalized()
    rib = rib or lerpc(col, (0.5, 0.6, 0.2), 0.55)
    rows, ds = [], L / seg
    cutph = rng.random() * 6 if rng else 0
    for i in range(seg + 1):
        t = i / seg
        if prof == 'ovate': pw = math.sin(math.pi * min(1, t ** 0.75 * 1.0)) ** 0.9
        elif prof == 'lance': pw = math.sin(math.pi * t ** 0.85) ** 0.8
        elif prof == 'paddle': pw = min(1, math.sin(math.pi * 0.5 * min(1, t * 1.6)) ** 0.5) * (1 - 0.12 * t) * (1 if t < 0.97 else 0.4)
        elif prof == 'blade': pw = (1 - t) ** 0.7 * min(1, t * 6 + 0.25)
        else: pw = 1
        if cuts and 0.12 < t < 0.95: pw *= 1 - cutdepth * max(0, math.cos(t * cuts * math.pi * 2 + cutph)) ** 6
        hw = W * 0.5 * max(pw, 0.0)
        n = d.cross(w).normalized()
        base = lerpc(col, (col[0] * 0.55, col[1] * 0.55, col[2] * 0.55), 1 - t * 0.6)
        rows.append((p - w * hw + n * fold * hw, p.copy(), p + w * hw + n * fold * hw, base))
        p = p + d * ds
        R = Matrix.Rotation(curve * ds, 3, axis); d = (R @ d).normalized(); w = (R @ w).normalized()
    for a, b in zip(rows, rows[1:]):
        quad(a[0], a[1], b[1], b[0], a[3], rib, rib, b[3])
        quad(a[1], a[2], b[2], b[1], rib, a[3], b[3], rib)

def frond(p0, yaw, pitch, L, curve, nst=26, lmax=1.1, lw=0.09, la=55, col=(0.08, 0.3, 0.05), droop=0.5, mode='palm', rng=None, up_bias=0.0):
    out = Vector((math.cos(yaw), math.sin(yaw), 0)); d = out * math.cos(pitch) + Z * math.sin(pitch)
    w = Z.cross(out); axis = d.cross(-Z)
    if axis.length < 1e-4: axis = w
    axis = axis.normalized(); p = Vector(p0); ds = L / nst; rib = (0.45, 0.5, 0.2)
    pts = []
    for i in range(nst + 1):
        pts.append((p.copy(), d.copy(), w.copy()))
        p = p + d * ds; R = Matrix.Rotation(curve * ds, 3, axis); d = (R @ d).normalized(); w = (R @ w).normalized()
    # the rachis: a thin strip
    for a, b in zip(pts, pts[1:]):
        h = 0.03
        quad(a[0] - a[2] * h, a[0] + a[2] * h, b[0] + b[2] * h, b[0] - b[2] * h, rib, rib, rib, rib)
    for i, (p, d, w) in enumerate(pts):
        t = i / nst
        if t < 0.12: continue
        if mode == 'palm': ll = lmax * (math.sin(math.pi * (0.18 + 0.82 * t)) ** 0.8) * (0.55 + 0.45 * (1 - t * 0.5))
        else: ll = lmax * (1 - t) ** 0.65 * 0.9 + 0.05
        for side in (-1, 1):
            ang = math.radians(la + (rng.random() - 0.5) * 12)
            ld = (w * side * math.cos(ang) + d * math.sin(ang)).normalized()
            if mode == 'palm': ld = (ld + Vector((0, 0, -droop))).normalized()   # leaflets hang
            else: ld = (ld + Vector((0, 0, 0.05))).normalized()
            c = hsv(0.27 + (rng.random() - 0.5) * 0.03, 0.8, 0.30 + rng.random() * 0.17) if col is None else lerpc(col, (col[0] * 1.5, col[1] * 1.45, col[2] * 1.2), rng.random())
            leaf(p, ld, d, ll, lw * (ll if mode == 'palm' else 1) * (1 if mode == 'palm' else 1) if mode == 'palm' else lw * (0.5 + ll), 0.5 if mode == 'palm' else 0.25, None, c, rib=lerpc(c, (0.6, 0.65, 0.25), 0.4), seg=3, prof='lance', fold=0.1)

def new_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'; sc.cycles.samples = SAMPLES; sc.cycles.use_denoising = True
    sc.render.film_transparent = True; sc.render.resolution_x = sc.render.resolution_y = 512
    sc.view_settings.view_transform = 'Standard'; sc.view_settings.exposure = -0.6
    sc.render.image_settings.file_format = 'PNG'; sc.render.image_settings.color_mode = 'RGBA'
    w = bpy.data.worlds.new('w'); w.use_nodes = True; sc.world = w
    bg = w.node_tree.nodes['Background']; bg.inputs['Color'].default_value = (0.62, 0.78, 0.95, 1); bg.inputs['Strength'].default_value = 1.1
    sun = bpy.data.lights.new('sun', 'SUN'); sun.energy = 3.4; sun.angle = math.radians(6)
    so = bpy.data.objects.new('sun', sun); so.rotation_euler = (math.radians(52), 0, math.radians(-28)); sc.collection.objects.link(so)
    m = bpy.data.materials.new('leaf'); m.use_nodes = True; nt = m.node_tree; bsdf = nt.nodes['Principled BSDF']
    at = nt.nodes.new('ShaderNodeVertexColor'); at.layer_name = 'col'; nt.links.new(at.outputs['Color'], bsdf.inputs['Base Color'])
    nt.links.new(at.outputs['Color'], bsdf.inputs['Emission Color']); bsdf.inputs['Emission Strength'].default_value = 0.10     # (cheap translucency: leaves glow when the light comes through)
    bsdf.inputs['Roughness'].default_value = 0.42
    return sc, m

def finish(sc, m, name, S, zc, pitch=0.0, cam_dist=40):
    me = bpy.data.meshes.new(name); me.from_pydata(V, [], F); me.update()
    ca = me.color_attributes.new('col', 'FLOAT_COLOR', 'POINT')
    for i, c in enumerate(C): ca.data[i].color = (*c, 1)
    ob = bpy.data.objects.new(name, me); ob.data.materials.append(m); sc.collection.objects.link(ob)
    for p in me.polygons: p.use_smooth = False
    cam = bpy.data.cameras.new('c'); cam.type = 'ORTHO'; cam.ortho_scale = S; cam.clip_end = 400
    co = bpy.data.objects.new('c', cam); sc.collection.objects.link(co); sc.camera = co
    # looks along +Y (from the front), pitched up by `pitch` (negative: down)
    dirv = Vector((0, math.cos(pitch), math.sin(pitch)))
    co.location = Vector((0, 0, zc)) - dirv * cam_dist
    co.rotation_euler = (math.radians(90) + pitch, 0, 0)
    sc.render.filepath = f'{OUT}/cell_{name}.png'
    bpy.ops.render.render(write_still=True)

def cell_palm(kind, below=False):
    sc, m = new_scene(); rng = random.Random(11 if kind == 'A' else 23)
    n = 15 if kind == 'A' else 12
    for i in range(n):
        yaw = i / n * math.tau + rng.random() * 0.25
        if kind == 'A': pitch = math.radians(rng.choice([62, 48, 34, 18, 55, 40])); L = 3.9 + rng.random() * 0.8; curve = 0.28 + rng.random() * 0.14; lmax = 1.15
        else: pitch = math.radians(rng.choice([70, 58, 46, 32, 62, 78])); L = 3.3 + rng.random() * 0.7; curve = 0.35 + rng.random() * 0.15; lmax = 0.95
        frond((0, 0, 0), yaw, pitch, L, curve, nst=24, lmax=lmax, lw=0.075, la=58, col=(0.06, 0.23, 0.04) if kind == 'A' else (0.08, 0.27, 0.05), rng=rng)
    # a few crownshaft bits / coconuts
    if kind == 'A':
        for j in range(3): quad(Vector((0.1 * j - 0.15, -0.1, -0.25)), Vector((0.1 * j - 0.05, -0.1, -0.25)), Vector((0.1 * j - 0.05, -0.1, -0.4)), Vector((0.1 * j - 0.15, -0.1, -0.4)), (0.35, 0.28, 0.05), (0.35, 0.28, 0.05), (0.2, 0.15, 0.03), (0.2, 0.15, 0.03))
    if below:
        for i in range(len(V)): V[i] = Vector((V[i].x, V[i].y, V[i].z))
        finish(sc, m, f'palm{kind}_below', 8.8, 0.0, pitch=math.radians(-70) * -1 if False else math.radians(80))
    else:
        finish(sc, m, f'palm{kind}', 8.6, 0.9, pitch=math.radians(10))

def cell_banana(seed):
    sc, m = new_scene(); rng = random.Random(seed)
    n = 8
    for i in range(n):
        yaw = i / n * math.tau + rng.random() * 0.5; pitch = math.radians(rng.uniform(48, 80)); L = rng.uniform(3.0, 3.8)
        out = Vector((math.cos(yaw), math.sin(yaw), 0)); d0 = out * math.cos(pitch) + Z * math.sin(pitch)
        g = rng.random(); col = hsv(0.24 + g * 0.04, 0.78, 0.33 + rng.random() * 0.1)
        leaf((out.x * 0.12, out.y * 0.12, 1.0), d0, Z.cross(out), L, 1.2, curve=rng.uniform(0.22, 0.45), col=col, rib=(0.55, 0.62, 0.28), seg=16, prof='paddle', fold=0.3, cuts=rng.randint(9, 14), cutdepth=0.5, rng=rng)
    # pseudostem
    for k in range(10):
        a0, a1 = k / 10 * math.tau, (k + 1) / 10 * math.tau; r0, r1 = 0.2, 0.15
        quad(Vector((math.cos(a0) * r0, math.sin(a0) * r0, 0)), Vector((math.cos(a1) * r0, math.sin(a1) * r0, 0)), Vector((math.cos(a1) * r1, math.sin(a1) * r1, 1.1)), Vector((math.cos(a0) * r1, math.sin(a0) * r1, 1.1)), (0.3, 0.38, 0.12), (0.3, 0.38, 0.12), (0.4, 0.48, 0.17), (0.4, 0.48, 0.17))
    finish(sc, m, 'banana%d' % seed, 7.4, 2.3, pitch=0.0)

def cell_monstera():
    sc, m = new_scene(); rng = random.Random(5)
    for i in range(9):
        yaw = i / 9 * math.tau + rng.random() * 0.5; out = Vector((math.cos(yaw), math.sin(yaw), 0)); off = rng.uniform(0.15, 0.5)
        stalkL = rng.uniform(0.9, 1.7); pit = math.radians(rng.uniform(40, 70)); d0 = out * math.cos(pit) + Z * math.sin(pit)
        col = hsv(0.29, 0.8, 0.26 + rng.random() * 0.08)
        leaf(out * 0.1, d0, Z.cross(out), stalkL, 0.045, curve=0.25, col=(0.2, 0.33, 0.1), seg=4, prof='none', fold=0)   # petiole
        tip = out * 0.1 + d0 * stalkL * 0.88 + Vector((0, 0, -0.1)); ld = (out * 0.9 + Z * (-0.25 + (0.3 if i % 2 else 0))).normalized()
        if i % 3 == 2: leaf(tip, ld, Z.cross(out), 1.5, 1.35, curve=0.25, col=col, seg=12, prof='ovate', fold=0.2)                      # elephant ear
        else: leaf(tip, ld, Z.cross(out), 1.75, 1.5, curve=0.3, col=col, seg=26, prof='ovate', fold=0.18, cuts=4, cutdepth=0.92, rng=rng)    # monstera
    finish(sc, m, 'monstera', 4.8, 1.5)

def cell_fern(seed, big):
    sc, m = new_scene(); rng = random.Random(seed)
    n = 20 if not big else 14
    for i in range(n):
        yaw = i / n * math.tau + rng.random() * 0.4; pitch = math.radians(rng.uniform(40, 80) if not big else rng.uniform(30, 70))
        frond((0, 0, 0.05), yaw, pitch, rng.uniform(1.1, 1.6) * (1.2 if big else 1), 0.7 if big else 0.9, nst=22, lmax=0.42 if not big else 0.55, lw=0.14, la=78, col=(0.1, 0.34, 0.06), mode='fern', rng=rng)
    finish(sc, m, 'fern%d' % seed, 3.4 if not big else 4.2, 0.95 if not big else 1.1)

def cell_heliconia():
    sc, m = new_scene(); rng = random.Random(8)
    for i in range(11):
        yaw = i / 11 * math.tau + rng.random() * 0.6; out = Vector((math.cos(yaw), math.sin(yaw), 0)); pit = math.radians(rng.uniform(62, 86))
        d0 = out * math.cos(pit) + Z * math.sin(pit); col = hsv(0.26 + rng.random() * 0.03, 0.8, 0.32 + rng.random() * 0.1)
        leaf((out.x * 0.1, out.y * 0.1, 0.05), d0, Z.cross(out), rng.uniform(1.8, 2.6), 0.38, curve=rng.uniform(0.2, 0.45), col=col, rib=(0.6, 0.7, 0.3), seg=12, prof='lance', fold=0.25)
    for k, yaw in enumerate((0.7, 2.4, 4.4)):     # torch-ginger / heliconia bracts
        out = Vector((math.cos(yaw), math.sin(yaw), 0)); h = 1.4 + k * 0.25
        for j in range(5):
            d0 = (out * 0.8 + Z * 0.6).normalized() if j % 2 else (out * 0.2 + Z * 0.9 + Vector((-out.y, out.x, 0)) * 0.3).normalized()
            leaf(out * 0.15 + Vector((0, 0, h + j * 0.12)), d0, Z.cross(out), 0.42, 0.17, curve=0.2, col=(0.65, 0.05, 0.03) if k != 1 else (0.9, 0.35, 0.05), rib=(0.9, 0.55, 0.1), seg=4, prof='lance', fold=0.35)
        leaf(out * 0.1, Z + out * 0.05, Z.cross(out), h + 0.1, 0.03, col=(0.25, 0.35, 0.1), seg=4, prof='none', fold=0)
    finish(sc, m, 'heliconia', 4.2, 1.7)

def cell_shrub():
    sc, m = new_scene(); rng = random.Random(14)
    for i in range(330):
        u = rng.random(); th = rng.random() * math.tau; ph = math.acos(1 - rng.random())     # in a dome
        r = 1.0 * (0.35 + 0.65 * rng.random() ** 0.5); pos = Vector((math.sin(ph) * math.cos(th) * r * 1.2, math.sin(ph) * math.sin(th) * r * 1.2, math.cos(ph) * r * 1.05 + 0.15))
        if pos.z < 0.1: pos.z = 0.1 + rng.random() * 0.1
        dirv = (pos - Vector((0, 0, 0.1))).normalized() + Vector((rng.uniform(-0.4, 0.4), rng.uniform(-0.4, 0.4), rng.uniform(-0.3, 0.3)))
        col = hsv(0.27 + rng.random() * 0.04, 0.8, 0.16 + rng.random() * 0.1)
        leaf(pos - dirv.normalized() * 0.1, dirv, Z.cross(dirv) if abs(dirv.normalized().z) < 0.95 else Vector((1, 0, 0)), 0.5, 0.26, curve=0.5, col=col, seg=4, prof='ovate', fold=0.3)
    finish(sc, m, 'shrub', 3.2, 1.1)

def cell_vines():
    sc, m = new_scene(); rng = random.Random(31)
    for k in range(7):
        x = -1.5 + k * 0.5 + rng.uniform(-0.15, 0.15); top = 4.0 + rng.uniform(-0.1, 0.1); ln = rng.uniform(2.4, 3.8)
        leaf((x, 0, top), (0, 0, -1), (1, 0, 0), ln, 0.03, col=(0.18, 0.3, 0.08), seg=6, prof='none', fold=0, curve=0)
        z = top - 0.15
        while z > top - ln:
            for sd in (-1, 1):
                d0 = Vector((sd * 0.8, rng.uniform(-0.2, 0.2), -0.5)).normalized(); col = hsv(0.27 + rng.random() * 0.04, 0.78, 0.30 + rng.random() * 0.12)
                leaf((x, 0, z), d0, (0, 1, 0), rng.uniform(0.45, 0.65), 0.42, curve=0.3, col=col, seg=4, prof='ovate', fold=0.25)
                z -= rng.uniform(0.07, 0.14)
    finish(sc, m, 'vines', 4.4, 2.0)

CELLS = [('palmA', lambda: cell_palm('A')), ('palmB', lambda: cell_palm('B')), ('banana1', lambda: cell_banana(1)), ('monstera', cell_monstera), ('fern1', lambda: cell_fern(2, False)),
         ('heliconia', cell_heliconia), ('shrub', cell_shrub), ('vines', cell_vines), ('palmA_below', lambda: cell_palm('A', True)), ('banana2', lambda: cell_banana(9)),
         ('fern2', lambda: cell_fern(4, True)), ('palmB_below', lambda: cell_palm('B', True))]
for i, (nm, fn) in enumerate(CELLS):
    if ONLY >= 0 and i != ONLY: continue
    V.clear(); F.clear(); C.clear(); fn(); print('cell', i, nm, len(F), 'quads')
