# Canopy trees for the museum's far garden, built as real 3D trees (trunk, limbs, twigs and thousands of single leaves) and lit and rendered by Cycles
# (sun + sky, soft shadows inside the crown, light shining through the leaves) into transparent 512 px cells. tree_atlas_build.py assembles them into trees.webp.
#   blender -b --python studio/design/museum-sky/blender/tree_render.py -- OUTDIR [samples] [only-cell] [res]
# cells: 0 rain tree (wide umbrella), 1 round broadleaf, 2 dense dark tree, 3 flame tree (red flowers)
import bpy, math, sys, random, colorsys
from mathutils import Vector, Matrix

args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUT = args[0] if args else '/tmp/trees'
SAMPLES = int(args[1]) if len(args) > 1 else 40
ONLY = int(args[2]) if len(args) > 2 else -1
RES = int(args[3]) if len(args) > 3 else 512
Z = Vector((0, 0, 1))
V, F, CL, TV, TF, TC = [], [], [], [], [], []       # leaves: verts, faces, colours; wood: verts, faces, colours


def lin(c): return tuple(v ** 2.2 for v in c)
def hsv(h, s, v): return lin(colorsys.hsv_to_rgb(h % 1, max(0, min(1, s)), max(0, min(1, v))))


def tube(p0, p1, r0, r1, col, sides=6, rng=None):
    d = (p1 - p0); L = d.length
    if L < 1e-5: return
    d = d / L; a = d.cross(Z) if abs(d.z) < 0.95 else d.cross(Vector((1, 0, 0))); a.normalize(); b = d.cross(a)
    n = len(TV)
    for k, (p, r) in enumerate(((p0, r0), (p1, r1))):
        for s in range(sides):
            t = s / sides * math.tau; TV.append(p + (a * math.cos(t) + b * math.sin(t)) * r); TC.append(col)
    for s in range(sides):
        s2 = (s + 1) % sides; TF.append((n + s, n + s2, n + sides + s2, n + sides + s))


def leaf(pos, d, size, col, rng, aspect=0.55):
    d = d.normalized(); side = d.cross(Z) if abs(d.z) < 0.9 else d.cross(Vector((1, 0, 0))); side.normalize()
    side = Matrix.Rotation(rng.uniform(0, math.tau), 3, d) @ side; nrm = d.cross(side)
    L = size; W = size * aspect; n = len(V)
    prof = [(0, 0, 0), (0.5, 0.22, 0.10), (0.5, 0.62, 0.12), (0, 1.0, 0.0), (-0.5, 0.62, 0.12), (-0.5, 0.22, 0.10)]
    for sx, ty, f in prof: V.append(pos + side * sx * W + d * ty * L + nrm * f * W * 0.4); CL.append(col)
    F.append((n, n + 1, n + 2, n + 3, n + 4, n + 5))


def grow(p, d, length, rad, level, T, rng):
    steps = 3 if level < 2 else 2; cur = p.copy(); dir_ = d.copy(); pts = [cur.copy()]
    for i in range(steps):
        jit = Vector((rng.uniform(-1, 1), rng.uniform(-1, 1), rng.uniform(-0.4, 0.5))) * T['wob']
        dir_ = (dir_ + jit + Vector((0, 0, T['up'] * 0.1)) * (1 if level > 0 else 0)).normalized()
        nxt = cur + dir_ * length / steps; r0 = rad * (1 - i / steps * 0.5); r1 = rad * (1 - (i + 1) / steps * 0.5)
        tube(cur, nxt, r0, r1, T['wood'], 6 if level < 2 else 4); cur = nxt; pts.append(cur.copy())
    if level < T['levels']:
        nk = T['kids'][level]
        for k in range(nk):
            q = pts[rng.randint(1, len(pts) - 1)] if rng.random() < 0.8 else pts[-1]
            yaw = rng.uniform(0, math.tau); out = Vector((math.cos(yaw), math.sin(yaw), 0))
            el = math.radians(rng.uniform(*T['elev'][level])); nd = (out * math.cos(el) + Z * math.sin(el)).normalized()
            grow(q, nd, length * T['shrink'] * rng.uniform(0.8, 1.15), rad * 0.55, level + 1, T, rng)
    else:
        cluster(cur, dir_, T, rng)
    return


def cluster(tip, d, T, rng):
    R = T['cr']
    for i in range(T['nleaf']):
        off = Vector((rng.gauss(0, 1), rng.gauss(0, 1), rng.gauss(0, 0.7))) * R
        ld = (Vector((rng.uniform(-1, 1), rng.uniform(-1, 1), rng.uniform(-0.3, 1))) + d * 0.5).normalized()
        if T.get('flower') and rng.random() < T['flower']:
            col = lin((rng.uniform(0.70, 0.95), rng.uniform(0.10, 0.40), rng.uniform(0.04, 0.14))); leaf(tip + off, ld, T['lsize'] * 0.8, col, rng, 0.9)
        else:
            young = rng.random() < T['young']; h = (0.17 + rng.uniform(-0.02, 0.03)) if young else (T['hue'] + rng.uniform(-0.03, 0.03))
            col = hsv(h, rng.uniform(0.6, 0.85), (rng.uniform(0.42, 0.62) if young else rng.uniform(*T['val']))); leaf(tip + off, ld, T['lsize'] * rng.uniform(0.8, 1.25), col, rng)


def build_tree(idx):
    rng = random.Random(100 + idx * 7); V.clear(); F.clear(); CL.clear(); TV.clear(); TF.clear(); TC.clear()
    base = dict(wood=lin((0.28, 0.20, 0.14)), wob=0.35, up=0.5, shrink=0.62, young=0.07, hue=0.27, val=(0.16, 0.30), flower=0)
    if idx == 0:    T = dict(base, trunk=9.0, trad=0.55, levels=2, kids=[7, 4], elev=[(18, 38), (5, 40)], blen=8.5, cr=1.55, nleaf=700, lsize=0.40, up=0.0, shrink=0.55)
    elif idx == 1:  T = dict(base, trunk=6.5, trad=0.45, levels=2, kids=[8, 5], elev=[(45, 70), (25, 60)], blen=7.0, cr=1.55, nleaf=700, lsize=0.46, up=0.7, hue=0.25, val=(0.20, 0.36))
    elif idx == 2:  T = dict(base, trunk=4.0, trad=0.40, levels=2, kids=[10, 5], elev=[(55, 78), (35, 70)], blen=7.5, cr=1.45, nleaf=760, lsize=0.46, up=1.0, hue=0.30, val=(0.10, 0.22), shrink=0.5)
    else:           T = dict(base, trunk=8.0, trad=0.50, levels=2, kids=[7, 4], elev=[(20, 42), (8, 40)], blen=8.0, cr=1.5, nleaf=700, lsize=0.36, up=0.0, shrink=0.55, flower=0.32, hue=0.26)
    T['wood'] = lin((0.27, 0.19, 0.13)) if idx != 3 else lin((0.20, 0.16, 0.12))
    # trunk (slightly crooked, with flared foot), then limbs from its top
    cur = Vector((0, 0, 0)); top = T['trunk']; seg = 5
    for i in range(seg):
        nxt = Vector((rng.uniform(-0.25, 0.25) * (i > 0), rng.uniform(-0.25, 0.25) * (i > 0), top * (i + 1) / seg)); nxt.x += cur.x * 0.5; nxt.y += cur.y * 0.5
        r0 = T['trad'] * (1.6 if i == 0 else 1 - 0.28 * i / seg); r1 = T['trad'] * (1 - 0.28 * (i + 1) / seg); tube(cur, nxt, r0, r1, T['wood'], 8); cur = nxt
    for k in range(T['kids'][0] + 2):
        yaw = k / (T['kids'][0] + 2) * math.tau + rng.uniform(-0.3, 0.3); out = Vector((math.cos(yaw), math.sin(yaw), 0)); el = math.radians(rng.uniform(*T['elev'][0]))
        grow(cur + Vector((0, 0, -rng.uniform(0, 0.8))), (out * math.cos(el) + Z * math.sin(el)).normalized(), T['blen'] * rng.uniform(0.75, 1.15), T['trad'] * 0.6, 1, T, rng)
    return T


def render(idx):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene; sc.render.engine = 'CYCLES'; sc.cycles.samples = SAMPLES; sc.cycles.use_denoising = True; sc.cycles.device = 'CPU'
    sc.render.film_transparent = True; sc.render.resolution_x = sc.render.resolution_y = RES
    sc.view_settings.view_transform = 'Standard'; sc.view_settings.exposure = -0.2
    sc.render.image_settings.file_format = 'PNG'; sc.render.image_settings.color_mode = 'RGBA'
    w = bpy.data.worlds.new('w'); w.use_nodes = True; sc.world = w; nt = w.node_tree
    bg = nt.nodes['Background']; sk = nt.nodes.new('ShaderNodeTexSky'); sk.sky_type = 'NISHITA' if hasattr(sk, 'sky_type') else 'NISHITA'
    try:
        sk.sun_elevation = math.radians(52); sk.sun_rotation = math.radians(30); sk.sun_disc = False; nt.links.new(sk.outputs[0], bg.inputs['Color']); bg.inputs['Strength'].default_value = 0.9
    except Exception:
        bg.inputs['Color'].default_value = (0.55, 0.72, 0.95, 1); bg.inputs['Strength'].default_value = 1.0
    sun = bpy.data.lights.new('sun', 'SUN'); sun.energy = 4.2; sun.angle = math.radians(4)
    so = bpy.data.objects.new('sun', sun); so.rotation_euler = (math.radians(52), 0, math.radians(-35)); sc.collection.objects.link(so)
    T = build_tree(idx)
    # materials: leaves (vertex colour, a little translucent), wood (vertex colour + bark bump)
    def mat(name, bark):
        m = bpy.data.materials.new(name); m.use_nodes = True; n = m.node_tree; b = n.nodes['Principled BSDF']; vc = n.nodes.new('ShaderNodeVertexColor'); vc.layer_name = 'col'
        n.links.new(vc.outputs['Color'], b.inputs['Base Color']); b.inputs['Roughness'].default_value = 0.8 if bark else 0.45
        if bark:
            nz = n.nodes.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = 40; nz.inputs['Detail'].default_value = 8; bm = n.nodes.new('ShaderNodeBump'); bm.inputs['Strength'].default_value = 0.8
            n.links.new(nz.outputs['Fac'], bm.inputs['Height']); n.links.new(bm.outputs['Normal'], b.inputs['Normal'])
        else:
            tr = n.nodes.new('ShaderNodeBsdfTranslucent'); n.links.new(vc.outputs['Color'], tr.inputs['Color']); mx = n.nodes.new('ShaderNodeMixShader'); mx.inputs['Fac'].default_value = 0.35
            n.links.new(b.outputs['BSDF'], mx.inputs[1]); n.links.new(tr.outputs['BSDF'], mx.inputs[2]); out = n.nodes['Material Output']; n.links.new(mx.outputs['Shader'], out.inputs['Surface'])
        return m
    def obj(name, verts, faces, cols, m):
        me = bpy.data.meshes.new(name); me.from_pydata([tuple(v) for v in verts], [], faces); me.update(); ca = me.color_attributes.new('col', 'FLOAT_COLOR', 'POINT')
        for i, c in enumerate(cols): ca.data[i].color = (*c, 1)
        ob = bpy.data.objects.new(name, me); ob.data.materials.append(m); sc.collection.objects.link(ob)
        for p in me.polygons: p.use_smooth = (name == 'wood')
    obj('wood', TV, TF, TC, mat('wood', True)); obj('leaves', V, F, CL, mat('leaf', False))
    cam = bpy.data.cameras.new('c'); cam.type = 'ORTHO'; cam.ortho_scale = 34; cam.clip_end = 500
    co = bpy.data.objects.new('c', cam); sc.collection.objects.link(co); sc.camera = co
    co.location = Vector((0, -60, 16.5)); co.rotation_euler = (math.radians(90), 0, 0)
    sc.render.filepath = f'{OUT}/tree_{idx}.png'; bpy.ops.render.render(write_still=True)
    print('tree', idx, len(F), 'leaves', len(TF), 'wood faces')


for i in range(4):
    if ONLY >= 0 and i != ONLY: continue
    render(i)
