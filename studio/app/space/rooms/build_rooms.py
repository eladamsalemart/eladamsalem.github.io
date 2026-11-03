"""Open Studio's virtual rooms, built and rendered in Blender (Cycles): ten kinds of exhibition space, each in a few
variants (small, large, several rooms), lit as real galleries are lit, with real works on their walls at their real size.

    blender -b --factory-startup -P studio/app/space/rooms/build_rooms.py -- --type white-cube [--variant small]
            [--out studio/design/virtual-spaces/renders] [--samples 192] [--size 1600x1000] [--blend]

The rooms follow studio/design/virtual-spaces/research.md: dimensions from real galleries, CC0 materials from Poly Haven
(downloaded once into a cache), light by the numbers museums use: 3000 K accent spots aimed by the 30-degree rule,
about 200 lux on a painting and 50 on works on paper, washers at a third of the room height, daylight from skylights,
lanterns and windows at 6500 K. The renders are what the room should look like; the same scene is what will later be
baked into light maps for the app's viewer (space.js), so the room on a phone can match them.

Units: metres, z up, floor at 0. Light: 1 lux is LUX watts per square metre (so ~200 lux on a white wall reads as a
bright white at exposure 0 with AgX).
"""
import bpy, bmesh, json, math, os, sys, urllib.request
from mathutils import Vector

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..', '..'))
APP = os.path.join(ROOT, 'studio', 'app')
CACHE = os.environ.get('ROOMS_CACHE', os.path.join(ROOT, '.cache', 'polyhaven'))
UA = {'User-Agent': 'OpenStudio/1.0 (ooopenstudio@gmail.com)'}
LUX = 0.015
EYE = 1.6


# --- arguments ----------------------------------------------------------------------------------------------------
def args():
    a = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    o = dict(type='white-cube', variant='', out=os.path.join(ROOT, 'studio', 'design', 'virtual-spaces', 'renders'), samples=192, size='1600x1000', blend=False, surfaces=False)
    i = 0
    while i < len(a):
        k = a[i].lstrip('-')
        if k in ('blend', 'surfaces'): o[k] = True; i += 1; continue
        o[k] = a[i + 1]; i += 2
    o['samples'] = int(o['samples']); o['w'], o['h'] = map(int, o['size'].split('x'))
    return o


# --- the scene ----------------------------------------------------------------------------------------------------
def reset(o):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    s = bpy.context.scene
    s.render.engine = 'CYCLES'
    s.cycles.device = 'CPU'
    s.cycles.samples = o['samples']
    s.cycles.use_adaptive_sampling = True
    s.cycles.adaptive_threshold = 0.02
    s.cycles.use_denoising = True
    s.cycles.denoiser = 'OPENIMAGEDENOISE'
    s.cycles.denoising_input_passes = 'RGB_ALBEDO_NORMAL'
    try: s.cycles.denoising_prefilter = 'ACCURATE'
    except Exception: pass
    s.cycles.adaptive_threshold = 0.012
    s.cycles.max_bounces = 10; s.cycles.diffuse_bounces = 6; s.cycles.glossy_bounces = 3; s.cycles.transmission_bounces = 6
    s.cycles.caustics_reflective = False; s.cycles.caustics_refractive = False
    s.cycles.sample_clamp_indirect = 8.0
    s.render.resolution_x, s.render.resolution_y = o['w'], o['h']
    s.render.image_settings.file_format = 'JPEG'; s.render.image_settings.quality = 92
    s.view_settings.view_transform = 'AgX'
    try: s.view_settings.look = 'AgX - Medium High Contrast'
    except TypeError: pass
    s.world = bpy.data.worlds.new('world')
    return s


def world(strength=0.0, hdri=None, rot=0.0, sky=None):
    """The outside: black (a closed room), a Nishita sky (skylights), or a photographed place (windows, a garden)."""
    w = bpy.context.scene.world; w.use_nodes = True
    nt = w.node_tree; nt.nodes.clear()
    out = nt.nodes.new('ShaderNodeOutputWorld'); bg = nt.nodes.new('ShaderNodeBackground')
    bg.inputs['Strength'].default_value = strength
    nt.links.new(bg.outputs[0], out.inputs[0])
    if hdri:
        tex = nt.nodes.new('ShaderNodeTexEnvironment'); tex.image = bpy.data.images.load(hdri)
        mp = nt.nodes.new('ShaderNodeMapping'); tc = nt.nodes.new('ShaderNodeTexCoord')
        mp.inputs['Rotation'].default_value[2] = math.radians(rot)
        nt.links.new(tc.outputs['Generated'], mp.inputs[0]); nt.links.new(mp.outputs[0], tex.inputs[0]); nt.links.new(tex.outputs[0], bg.inputs[0])
    elif sky:
        bg.inputs['Color'].default_value = (*blackbody(sky.get('kelvin', 6500)), 1)
    else:
        bg.inputs['Color'].default_value = (0, 0, 0, 1)


# --- Poly Haven materials (CC0) -------------------------------------------------------------------------------------
def polyhaven(asset, res='2k'):
    """Diffuse, roughness and normal maps of a Poly Haven texture, downloaded once."""
    d = os.path.join(CACHE, asset); os.makedirs(d, exist_ok=True)
    have = {k: os.path.join(d, f'{k}.jpg') for k in ('diff', 'rough', 'nor')}
    if all(os.path.exists(p) for p in have.values()): return have
    files = json.loads(urllib.request.urlopen(urllib.request.Request(f'https://api.polyhaven.com/files/{asset}', headers=UA), timeout=60).read())
    pick = {'diff': 'Diffuse', 'rough': 'Rough', 'nor': 'nor_gl'}
    for k, key in pick.items():
        node = files.get(key) or (files.get('arm') if k == 'rough' else None)
        if not node: continue
        sizes = node.get(res) or node.get('1k') or next(iter(node.values()))
        url = (sizes.get('jpg') or sizes.get('png'))['url']
        open(have[k], 'wb').write(urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=120).read())
    return have


def ambientcg(asset, res='2K'):
    """An ambientCG (CC0) material's maps, downloaded once: {'Color', 'Roughness', 'NormalGL', ...} -> path."""
    import zipfile, io
    d = os.path.join(CACHE, 'acg', asset); os.makedirs(d, exist_ok=True)
    got = {f.split('_')[-1].split('.')[0]: os.path.join(d, f) for f in os.listdir(d)}
    if got: return got
    raw = urllib.request.urlopen(urllib.request.Request(f'https://ambientcg.com/get?file={asset}_{res}-JPG.zip', headers=UA), timeout=300).read()
    with zipfile.ZipFile(io.BytesIO(raw)) as z:
        for n in z.namelist():
            if n.lower().endswith('.jpg'):
                open(os.path.join(d, os.path.basename(n)), 'wb').write(z.read(n))
    return {f.split('_')[-1].split('.')[0]: os.path.join(d, f) for f in os.listdir(d)}


def smudge(m, asset='SurfaceImperfections003', scale=1.6, amount=0.6):
    """Smudges, wipes and scuffs on a surface's sheen (a floor that is walked on, a glass that is touched)."""
    try: t = ambientcg(asset)
    except Exception as e:
        print('no imperfections:', asset, e); return
    path = t.get('Roughness') or t.get('Color')
    if not path: return
    nt = m.node_tree; b = next(n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED')
    img = image_node(nt, path, False, scale)
    rng = nt.nodes.new('ShaderNodeMapRange'); rng.inputs['To Min'].default_value = 1 - amount * 0.5; rng.inputs['To Max'].default_value = 1 + amount
    bw = nt.nodes.new('ShaderNodeRGBToBW'); nt.links.new(img.outputs['Color'], bw.inputs[0]); nt.links.new(bw.outputs[0], rng.inputs['Value'])
    mul = nt.nodes.new('ShaderNodeMath'); mul.operation = 'MULTIPLY'; mul.use_clamp = True
    l = b.inputs['Roughness'].links
    if l: nt.links.new(l[0].from_socket, mul.inputs[0])
    else: mul.inputs[0].default_value = b.inputs['Roughness'].default_value
    nt.links.new(rng.outputs[0], mul.inputs[1]); nt.links.new(mul.outputs[0], b.inputs['Roughness'])


def image_node(nt, path, colour=True, scale=1.0, box=True):
    tex = nt.nodes.new('ShaderNodeTexImage'); tex.image = bpy.data.images.load(path, check_existing=True)
    if not colour: tex.image.colorspace_settings.name = 'Non-Color'
    if box: tex.projection = 'BOX'; tex.projection_blend = 0.25
    tc = nt.nodes.new('ShaderNodeTexCoord'); mp = nt.nodes.new('ShaderNodeMapping')
    mp.inputs['Scale'].default_value = (1 / scale, 1 / scale, 1 / scale)
    nt.links.new(tc.outputs['Object'], mp.inputs[0]); nt.links.new(mp.outputs[0], tex.inputs[0])
    return tex


MATS = {}


def mat(name, base=(0.8, 0.8, 0.8), rough=0.6, tex=None, scale=1.0, tint=None, tint_mix=0.0, metal=0.0, bump=1.0, rough_mul=1.0, spec=0.5, coat=0.0, wear=None, smudges=None, streaks=False, runs=False):
    """A Principled material; with a Poly Haven texture laid on in world scale (scale = metres per tile)."""
    if name in MATS: return MATS[name]
    if wear is None: wear = 0.4 if metal > 0.5 else 1.0      # every surface is used, metal a little less visibly
    m = bpy.data.materials.new(name); m.use_nodes = True
    nt = m.node_tree; b = nt.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*base, 1); b.inputs['Roughness'].default_value = rough; b.inputs['Metallic'].default_value = metal
    b.inputs['Specular IOR Level'].default_value = spec
    if coat: b.inputs['Coat Weight'].default_value = coat; b.inputs['Coat Roughness'].default_value = 0.08
    if tex:
        t = polyhaven(tex)
        d = image_node(nt, t['diff'], True, scale)
        col = d.outputs['Color']
        if tint is not None:
            # a painted or limewashed surface: the texture's grain under a chosen colour (keeps its light and dark)
            bw = nt.nodes.new('ShaderNodeRGBToBW'); nt.links.new(col, bw.inputs[0])
            mix = nt.nodes.new('ShaderNodeMix'); mix.data_type = 'RGBA'; mix.blend_type = 'MULTIPLY'
            mix.inputs[0].default_value = 1.0
            ramp = nt.nodes.new('ShaderNodeMapRange'); ramp.inputs['From Min'].default_value = 0.0; ramp.inputs['From Max'].default_value = 0.6
            ramp.inputs['To Min'].default_value = 1 - tint_mix; ramp.inputs['To Max'].default_value = 1.0
            nt.links.new(bw.outputs[0], ramp.inputs['Value'])
            comb = nt.nodes.new('ShaderNodeCombineColor'); [nt.links.new(ramp.outputs[0], comb.inputs[i]) for i in range(3)]
            mix.inputs[6].default_value = (*tint, 1); nt.links.new(comb.outputs[0], mix.inputs[7])
            col = mix.outputs[2]
        nt.links.new(col, b.inputs['Base Color'])
        if os.path.exists(t['rough']):
            r = image_node(nt, t['rough'], False, scale)
            mr = nt.nodes.new('ShaderNodeMath'); mr.operation = 'MULTIPLY'; mr.inputs[1].default_value = rough_mul
            nt.links.new(r.outputs['Color'], mr.inputs[0]); nt.links.new(mr.outputs[0], b.inputs['Roughness'])
        if os.path.exists(t['nor']):
            n = image_node(nt, t['nor'], False, scale)
            nm = nt.nodes.new('ShaderNodeNormalMap'); nm.inputs['Strength'].default_value = bump
            nt.links.new(n.outputs['Color'], nm.inputs['Color']); nt.links.new(nm.outputs[0], b.inputs['Normal'])
    if wear: weather(m, wear, streaks, runs)
    if smudges: smudge(m, *([smudges] if isinstance(smudges, str) else smudges))
    MATS[name] = m
    return m


def weather(m, k=1.0, streaks=False, runs=False):
    """The marks of a used room on a material: colour that drifts over metres (paint coats, sun, cleaning), sheen that
    varies over centimetres (touch, wax, scuffs), and a little grime where surfaces meet (corners, under a sill)."""
    nt = m.node_tree; b = next(n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED')
    tc = nt.nodes.new('ShaderNodeTexCoord')
    def noise(scale, detail, rough=0.55):
        n = nt.nodes.new('ShaderNodeTexNoise'); n.noise_dimensions = '3D'
        n.inputs['Scale'].default_value = scale; n.inputs['Detail'].default_value = detail; n.inputs['Roughness'].default_value = rough
        nt.links.new(tc.outputs['Object'], n.inputs['Vector']); return n
    # colour: a few percent over a couple of metres, and grime of up to 18% in the corners
    big = noise(0.35, 4.0); rng = nt.nodes.new('ShaderNodeMapRange')
    rng.inputs['To Min'].default_value = 1 - 0.05 * k; rng.inputs['To Max'].default_value = 1 + 0.03 * k
    nt.links.new(big.outputs['Fac'], rng.inputs['Value'])
    ao = nt.nodes.new('ShaderNodeAmbientOcclusion'); ao.inputs['Distance'].default_value = 0.35; ao.samples = 8
    dirt = nt.nodes.new('ShaderNodeMapRange'); dirt.inputs['To Min'].default_value = 1 - 0.18 * k; dirt.inputs['To Max'].default_value = 1.0
    nt.links.new(ao.outputs['AO'], dirt.inputs['Value'])
    mul = nt.nodes.new('ShaderNodeMath'); mul.operation = 'MULTIPLY'
    nt.links.new(rng.outputs[0], mul.inputs[0]); nt.links.new(dirt.outputs[0], mul.inputs[1])
    mix = nt.nodes.new('ShaderNodeMix'); mix.data_type = 'RGBA'; mix.blend_type = 'MULTIPLY'; mix.inputs[0].default_value = 1.0
    l = b.inputs['Base Color'].links
    if l: nt.links.new(l[0].from_socket, mix.inputs[6])
    else: mix.inputs[6].default_value = b.inputs['Base Color'].default_value[:]
    src = mul
    if runs:      # water runs down a wall: vertical streaks, a few percent darker, a metre or two long
        rm = nt.nodes.new('ShaderNodeMapping'); rm.inputs['Scale'].default_value = (4.0, 4.0, 0.35)
        nt.links.new(tc.outputs['Object'], rm.inputs['Vector'])
        rn = nt.nodes.new('ShaderNodeTexNoise'); rn.inputs['Scale'].default_value = 1.5; rn.inputs['Detail'].default_value = 6.0
        nt.links.new(rm.outputs[0], rn.inputs['Vector'])
        rr2 = nt.nodes.new('ShaderNodeMapRange'); rr2.inputs['From Min'].default_value = 0.35; rr2.inputs['From Max'].default_value = 0.65
        rr2.inputs['To Min'].default_value = 0.93; rr2.inputs['To Max'].default_value = 1.02
        nt.links.new(rn.outputs['Fac'], rr2.inputs['Value'])
        src = nt.nodes.new('ShaderNodeMath'); src.operation = 'MULTIPLY'
        nt.links.new(mul.outputs[0], src.inputs[0]); nt.links.new(rr2.outputs[0], src.inputs[1])
    comb = nt.nodes.new('ShaderNodeCombineColor'); [nt.links.new(src.outputs[0], comb.inputs[i]) for i in range(3)]
    nt.links.new(comb.outputs[0], mix.inputs[7]); nt.links.new(mix.outputs[2], b.inputs['Base Color'])
    # sheen: roughness +-0.1 over a few centimetres to half a metre
    fine = noise(6.0, 8.0, 0.65); rr = nt.nodes.new('ShaderNodeMapRange')
    rr.inputs['To Min'].default_value = -0.1 * k; rr.inputs['To Max'].default_value = 0.1 * k
    nt.links.new(fine.outputs['Fac'], rr.inputs['Value'])
    add = nt.nodes.new('ShaderNodeMath'); add.operation = 'ADD'; add.use_clamp = True
    l = b.inputs['Roughness'].links
    if l: nt.links.new(l[0].from_socket, add.inputs[0])
    else: add.inputs[0].default_value = b.inputs['Roughness'].default_value
    nt.links.new(rr.outputs[0], add.inputs[1]); nt.links.new(add.outputs[0], b.inputs['Roughness'])
    if streaks:   # a floor that is mopped and walked: long wipes and blotches in the sheen, a few percent of reflection
        mp = nt.nodes.new('ShaderNodeMapping'); mp.inputs['Scale'].default_value = (1.0, 7.0, 1.0)
        nt.links.new(tc.outputs['Object'], mp.inputs['Vector'])
        st = nt.nodes.new('ShaderNodeTexNoise'); st.inputs['Scale'].default_value = 1.6; st.inputs['Detail'].default_value = 5.0
        nt.links.new(mp.outputs[0], st.inputs['Vector'])
        sr = nt.nodes.new('ShaderNodeMapRange'); sr.inputs['To Min'].default_value = -0.16; sr.inputs['To Max'].default_value = 0.14
        nt.links.new(st.outputs['Fac'], sr.inputs['Value'])
        a2 = nt.nodes.new('ShaderNodeMath'); a2.operation = 'ADD'; a2.use_clamp = True
        nt.links.new(add.outputs[0], a2.inputs[0]); nt.links.new(sr.outputs[0], a2.inputs[1]); nt.links.new(a2.outputs[0], b.inputs['Roughness'])
    # paint and plaster are never flat: a few tenths of a millimetre of orange peel in the normal
    mb = nt.nodes.new('ShaderNodeTexNoise'); mb.inputs['Scale'].default_value = 260.0; mb.inputs['Detail'].default_value = 3.0
    nt.links.new(tc.outputs['Object'], mb.inputs['Vector'])
    bp = nt.nodes.new('ShaderNodeBump'); bp.inputs['Strength'].default_value = 0.05 * k; bp.inputs['Distance'].default_value = 0.002
    nt.links.new(mb.outputs['Fac'], bp.inputs['Height'])
    ln = b.inputs['Normal'].links
    if ln: nt.links.new(ln[0].from_socket, bp.inputs['Normal'])
    nt.links.new(bp.outputs[0], b.inputs['Normal'])


def emission(name, strength, kelvin=6500, visible_only=False):
    m = bpy.data.materials.new(name); m.use_nodes = True
    nt = m.node_tree; nt.nodes.clear()
    out = nt.nodes.new('ShaderNodeOutputMaterial'); em = nt.nodes.new('ShaderNodeEmission'); bb = nt.nodes.new('ShaderNodeBlackbody')
    bb.inputs[0].default_value = kelvin; nt.links.new(bb.outputs[0], em.inputs[0]); em.inputs[1].default_value = strength
    nt.links.new(em.outputs[0], out.inputs[0])
    return m


def glass(name='glass', tint=(0.92, 0.96, 0.95)):
    """Window glass: refracts for the eye, lets light straight through for shadows (no dark caustic noise)."""
    if name in MATS: return MATS[name]
    m = bpy.data.materials.new(name); m.use_nodes = True
    nt = m.node_tree; nt.nodes.clear()
    out = nt.nodes.new('ShaderNodeOutputMaterial'); g = nt.nodes.new('ShaderNodeBsdfPrincipled')
    g.inputs['Transmission Weight'].default_value = 1.0; g.inputs['Roughness'].default_value = 0.012; g.inputs['IOR'].default_value = 1.5
    g.inputs['Base Color'].default_value = (*tint, 1)
    tr = nt.nodes.new('ShaderNodeBsdfTransparent'); tr.inputs[0].default_value = (*tint, 1)
    lp = nt.nodes.new('ShaderNodeLightPath'); mix = nt.nodes.new('ShaderNodeMixShader')
    nt.links.new(lp.outputs['Is Shadow Ray'], mix.inputs[0]); nt.links.new(g.outputs[0], mix.inputs[1]); nt.links.new(tr.outputs[0], mix.inputs[2])
    nt.links.new(mix.outputs[0], out.inputs[0])
    MATS[name] = m
    smudge(m, 'SurfaceImperfections004', 1.1, 5.0)    # fingerprints and rain-dried dust: the glass catches light unevenly
    return m


def paper_screen(name='shoji'):
    """Shoji paper: light comes through softly (translucent), shadows half pass."""
    if name in MATS: return MATS[name]
    m = bpy.data.materials.new(name); m.use_nodes = True
    nt = m.node_tree; nt.nodes.clear()
    out = nt.nodes.new('ShaderNodeOutputMaterial')
    tl = nt.nodes.new('ShaderNodeBsdfTranslucent'); tl.inputs[0].default_value = (0.95, 0.92, 0.85, 1)
    df = nt.nodes.new('ShaderNodeBsdfDiffuse'); df.inputs[0].default_value = (0.9, 0.88, 0.82, 1)
    tr = nt.nodes.new('ShaderNodeBsdfTransparent')
    m1 = nt.nodes.new('ShaderNodeMixShader'); m1.inputs[0].default_value = 0.55
    nt.links.new(df.outputs[0], m1.inputs[1]); nt.links.new(tl.outputs[0], m1.inputs[2])
    lp = nt.nodes.new('ShaderNodeLightPath'); m2 = nt.nodes.new('ShaderNodeMixShader')
    mul = nt.nodes.new('ShaderNodeMath'); mul.operation = 'MULTIPLY'; mul.inputs[1].default_value = 0.45
    nt.links.new(lp.outputs['Is Shadow Ray'], mul.inputs[0]); nt.links.new(mul.outputs[0], m2.inputs[0])
    nt.links.new(m1.outputs[0], m2.inputs[1]); nt.links.new(tr.outputs[0], m2.inputs[2])
    nt.links.new(m2.outputs[0], out.inputs[0])
    MATS[name] = m
    return m


# --- geometry -------------------------------------------------------------------------------------------------------
def box(name, x0, y0, z0, x1, y1, z1, material, bevel=0.0):
    """An axis-aligned box in world coordinates (its object coordinates are world coordinates: textures keep scale)."""
    me = bpy.data.meshes.new(name); bm = bmesh.new()
    v = [bm.verts.new((x, y, z)) for x in (x0, x1) for y in (y0, y1) for z in (z0, z1)]
    for f in ((0, 1, 3, 2), (4, 6, 7, 5), (0, 4, 5, 1), (2, 3, 7, 6), (0, 2, 6, 4), (1, 5, 7, 3)):
        bm.faces.new([v[i] for i in f])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(me); bm.free()
    ob = bpy.data.objects.new(name, me); bpy.context.collection.objects.link(ob)
    if material: ob.data.materials.append(material)
    if bevel:
        mod = ob.modifiers.new('bevel', 'BEVEL'); mod.width = bevel; mod.segments = 2; mod.limit_method = 'ANGLE'
    return ob


def mesh(name, verts, faces, material, smooth=False):
    me = bpy.data.meshes.new(name); me.from_pydata(verts, [], faces); me.update()
    if smooth:
        for p in me.polygons: p.use_smooth = True
    ob = bpy.data.objects.new(name, me); bpy.context.collection.objects.link(ob)
    if material: ob.data.materials.append(material)
    return ob


def cylinder(name, c, r, z0, z1, material, n=48):
    verts, faces = [], []
    for i in range(n):
        a = 2 * math.pi * i / n; verts += [(c[0] + r * math.cos(a), c[1] + r * math.sin(a), z0), (c[0] + r * math.cos(a), c[1] + r * math.sin(a), z1)]
    for i in range(n):
        j = (i + 1) % n; faces.append((2 * i, 2 * j, 2 * j + 1, 2 * i + 1))
    faces.append(tuple(2 * i for i in reversed(range(n)))); faces.append(tuple(2 * i + 1 for i in range(n)))
    return mesh(name, verts, faces, material, smooth=True)


def wall_along(name, axis, fixed, a0, a1, z0, z1, side, t, material, holes=()):
    """A wall's slab along x (axis 'x', at y = fixed) or y, from a0 to a1, with door/window holes (a0, a1, z0, z1),
    thickness t on the outer side (side = -1 or +1, away from the room)."""
    cuts = sorted(holes)
    spans = []  # pieces of solid wall: full-height spans between holes, and the parts above and below each hole
    a = a0
    for h0, h1, hz0, hz1 in cuts:
        if h0 > a: spans.append((a, h0, z0, z1))
        if hz0 > z0: spans.append((h0, h1, z0, hz0))
        if hz1 < z1: spans.append((h0, h1, hz1, z1))
        a = h1
    if a < a1: spans.append((a, a1, z0, z1))
    obs = []
    f0, f1 = (fixed, fixed + side * t) if side > 0 else (fixed + side * t, fixed)
    for i, (s0, s1, q0, q1) in enumerate(spans):
        if axis == 'x': obs.append(box(f'{name}.{i}', s0, f0, q0, s1, f1, q1, material))
        else: obs.append(box(f'{name}.{i}', f0, s0, q0, f1, s1, q1, material))
    return obs


# --- light ----------------------------------------------------------------------------------------------------------
def spot(name, pos, target, lux_at_target, beam_deg, kelvin=3000, blend=0.35, radius=0.03):
    """A track spot aimed at a point; its power set so the point receives about lux_at_target (cosine included)."""
    d = Vector(target) - Vector(pos); dist = d.length
    # the wall faces the light at some angle: the irradiance falls with its cosine (the 30-degree rule gives 0.5)
    li = bpy.data.lights.new(name, 'SPOT')
    li.spot_size = math.radians(beam_deg); li.spot_blend = blend; li.shadow_soft_size = radius
    li.color = blackbody(kelvin)
    cosi = max(0.2, abs(d.normalized().dot(Vector(NORMAL.get('n', (0, 1, 0))))))
    li.energy = 4 * math.pi * lux_at_target * LUX * dist * dist / cosi
    ob = bpy.data.objects.new(name, li); bpy.context.collection.objects.link(ob)
    ob.location = pos
    ob.rotation_euler = (-d).to_track_quat('Z', 'Y').to_euler()
    return ob


NORMAL = {}


def area(name, pos, size, power_lux_on_floor, kelvin=6500, rot=(0, 0, 0), spread=180):
    """A rectangular emitter (a laylight, a skylight's diffuser, a wall washer's lens), facing down unless rotated."""
    li = bpy.data.lights.new(name, 'AREA'); li.shape = 'RECTANGLE'; li.size, li.size_y = size
    li.color = blackbody(kelvin); li.spread = math.radians(spread)
    li.energy = power_lux_on_floor * LUX * size[0] * size[1] * 1.5
    ob = bpy.data.objects.new(name, li); bpy.context.collection.objects.link(ob)
    ob.location = pos; ob.rotation_euler = rot
    return ob


def portal(pos, size, rot=(0, 0, 0)):
    """A light portal over a window: tells Cycles where the outside light comes in (much less noise, true light)."""
    li = bpy.data.lights.new('portal', 'AREA'); li.shape = 'RECTANGLE'; li.size, li.size_y = size
    li.cycles.is_portal = True
    ob = bpy.data.objects.new('portal', li); bpy.context.collection.objects.link(ob)
    ob.location = pos; ob.rotation_euler = rot
    return ob


def blackbody(k):
    """sRGB-linear colour of a blackbody at k kelvin (normalised to its brightest channel)."""
    t = k / 100
    r = 255 if t <= 66 else 329.698727446 * ((t - 60) ** -0.1332047592)
    g = 99.4708025861 * math.log(t) - 161.1195681661 if t <= 66 else 288.1221695283 * ((t - 60) ** -0.0755148492)
    b = 255 if t >= 66 else (0 if t <= 19 else 138.5177312231 * math.log(t - 10) - 305.0447927307)
    c = [max(0, min(255, x)) / 255 for x in (r, g, b)]
    lin = [x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c]
    m = max(lin); return tuple(x / m for x in lin)


# --- the works ------------------------------------------------------------------------------------------------------
WORLD = json.load(open(os.path.join(APP, 'data', 'demo', 'world.json'), encoding='utf-8'))
WORKS = {w['slug']: w for w in WORLD['works']}


def big(artist, n):
    """An artist's largest works first (a big room wants them)."""
    return sorted(works_of(artist), key=lambda w: -w['size'][0] * w['size'][1])[:n]


def works_of(*artists, n=None):
    out = [w for a in artists for w in WORLD['works'] if w['artist'] == a]
    return out[:n] if n else out


def canvas_material(w):
    key = 'work:' + w['slug']
    if key in MATS: return MATS[key]
    m = bpy.data.materials.new(key); m.use_nodes = True
    nt = m.node_tree; b = nt.nodes['Principled BSDF']
    tex = nt.nodes.new('ShaderNodeTexImage'); tex.image = bpy.data.images.load(os.path.join(APP, w['image']), check_existing=True)
    tex.extension = 'CLIP'
    nt.links.new(tex.outputs['Color'], b.inputs['Base Color'])
    paper = 'paper' in w['medium'].lower() or 'print' in w['medium'].lower() or w['artist'] in ('victor-hugo', 'katsushika-hokusai')
    b.inputs['Roughness'].default_value = 0.85 if paper else 0.42          # a varnished canvas has a soft sheen
    b.inputs['Specular IOR Level'].default_value = 0.3 if paper else 0.5
    MATS[key] = m
    return m


TRIM = {'black-wall': None, 'formwork-concrete': None, 'earth-plaster': None, 'salon-red': (0.8, 0.77, 0.7), 'salon-green': (0.8, 0.77, 0.7)}
SURF = {'on': False}     # building the room's surfaces for the app: empty walls, no works, no works' spots
SHELLS = []               # the rooms built (a variant made of one room can go to the app)


def hang(w, centre, along, normal, z=1.55, frame=None):
    """One work on a wall: its picture, the depth of its stretcher (or a frame and a mat for works on paper)."""
    W, H = w['size'][0] / 100, w['size'][1] / 100
    a, n = Vector(along).normalized(), Vector(normal).normalized()
    z = max(z, H / 2 + 0.35)
    c = Vector(centre) + Vector((0, 0, z))
    paper = 'paper' in w['medium'].lower() or 'print' in w['medium'].lower() or w['artist'] in ('victor-hugo', 'katsushika-hokusai')
    depth = 0.012 if paper else 0.035
    if paper:
        # a frame: oak or black, a white mat as wide as a third of the short side (at least 6 cm)
        mt = max(0.06, min(W, H) * 0.33); fw = 0.025
        FW, FH = W + 2 * mt + 2 * fw, H + 2 * mt + 2 * fw
        quad(f'{w["slug"]}.mat', c + n * 0.022, a, FW - 2 * fw, FH - 2 * fw, mat('mat-board', (0.86, 0.85, 0.82), 0.9))
        frame_box(f'{w["slug"]}.frame', c, a, n, FW, FH, fw, 0.03, frame or mat('frame-oak', (0.42, 0.3, 0.2), 0.5, tex='oak_veneer_01', scale=0.6))
        quad(f'{w["slug"]}', c + n * 0.024, a, W, H, canvas_material(w), uv=True, facing=n)
        return FW, FH
    # a stretched canvas: the picture on the front, its paint carried round the sides
    quad(f'{w["slug"]}', c + n * depth, a, W, H, canvas_material(w), uv=True, facing=n)
    side = mat('canvas-side', (0.78, 0.74, 0.66), 0.8)
    sides_box(f'{w["slug"]}.sides', c, a, n, W, H, depth, side)
    return W, H


def quad(name, centre, along, W, H, material, uv=False, facing=None):
    a = Vector(along).normalized(); up = Vector((0, 0, 1))
    c = Vector(centre)
    vs = [c - a * W / 2 - up * H / 2, c + a * W / 2 - up * H / 2, c + a * W / 2 + up * H / 2, c - a * W / 2 + up * H / 2]
    face, uvs = (0, 1, 2, 3), ((0, 0), (1, 0), (1, 1), (0, 1))
    if facing is not None and a.cross(up).dot(Vector(facing)) < 0:   # face the room: the normal away from the wall
        face, uvs = (0, 3, 2, 1), ((0, 0), (0, 1), (1, 1), (1, 0))
    ob = mesh(name, [tuple(v) for v in vs], [face], material)
    if uv:
        layer = ob.data.uv_layers.new(name='UVMap')
        for li, uvv in enumerate(uvs): layer.data[li].uv = uvv
    return ob


def sides_box(name, c, a, n, W, H, d, material):
    up = Vector((0, 0, 1)); c = Vector(c)
    p = lambda sa, su, sn: tuple(c + a * sa * W / 2 + up * su * H / 2 + n * sn)
    verts = [p(-1, -1, 0), p(1, -1, 0), p(1, 1, 0), p(-1, 1, 0), p(-1, -1, d), p(1, -1, d), p(1, 1, d), p(-1, 1, d)]
    faces = [(0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)]
    return mesh(name, verts, faces, material)


def frame_box(name, c, a, n, FW, FH, fw, d, material):
    up = Vector((0, 0, 1)); c = Vector(c)
    obs = []
    for i, (oa, ou, sw, sh) in enumerate(((0, (FH - fw) / 2, FW, fw), (0, -(FH - fw) / 2, FW, fw), ((FW - fw) / 2, 0, fw, FH - 2 * fw - 0.002), (-(FW - fw) / 2, 0, fw, FH - 2 * fw - 0.002))):
        cc = c + a * oa + up * ou
        verts = []
        for sa in (-1, 1):
            for su in (-1, 1):
                for sn in (0, 1):
                    verts.append(tuple(cc + a * sa * sw / 2 + up * su * sh / 2 + n * sn * d))
        faces = [(0, 2, 6, 4), (1, 5, 7, 3), (0, 1, 3, 2), (4, 6, 7, 5), (0, 4, 5, 1), (2, 3, 7, 6)]
        obs.append(mesh(f'{name}.{i}', verts, faces, material))
    return obs


def hang_wall(works, p0, p1, normal, z=1.55, gap=None, ceiling=3.6, spot_kelvin=3000, lux=200, light=True, frame=None, beam=None):
    """Works along a wall from p0 to p1 (on the wall's face), evenly spaced, each with its own spot."""
    if SURF['on']: return []
    p0, p1 = Vector(p0), Vector(p1); L = (p1 - p0).length; a = (p1 - p0).normalized(); n = Vector(normal)
    NORMAL['n'] = tuple(n)
    gap = gap if gap is not None else min(0.9, L * 0.12)
    widths = []
    for w in works:
        paper = 'paper' in w['medium'].lower() or 'print' in w['medium'].lower() or w['artist'] in ('victor-hugo', 'katsushika-hokusai')
        W = w['size'][0] / 100
        widths.append(W + (2 * max(0.06, min(W, w['size'][1] / 100) * 0.33) + 0.05 if paper else 0))
    while works and sum(widths) + gap * (len(works) + 1) > L:
        works, widths = works[:-1], widths[:-1]
    if not works: return []
    space = (L - sum(widths)) / (len(works) + 1)
    x = space; placed = []
    for w, W in zip(works, widths):
        c = p0 + a * (x + W / 2)
        hang(w, c, a, n, z, frame)
        label(c + a * (W / 2 + 0.25), n)
        if light:
            H = w['size'][1] / 100
            z = max(z, H / 2 + 0.35)
            off = (ceiling - EYE) * 0.577 + (0.3 if H > 1.2 else 0)
            pos = c + n * off; pos.z = ceiling - 0.12
            dist = (Vector((c.x, c.y, z)) - pos).length
            paper = 'paper' in w['medium'].lower() or w['artist'] in ('victor-hugo', 'katsushika-hokusai')
            need = max(W, H) * 2.3
            b = beam or min(60, max(14, math.degrees(2 * math.atan(need / 2 / dist))))
            spot(f'spot.{w["slug"]}', tuple(pos), (c.x, c.y, z), 50 if paper else lux, b, spot_kelvin, blend=1.0, radius=0.05)
            track_head(pos, Vector((c.x, c.y, z)))
        placed.append((w, c))
        x += W + space
    return placed


def label(c, n):
    """A wall label: a small white card standing off the wall, its few lines of grey type."""
    c = Vector(c); n = Vector(n); a = n.cross(Vector((0, 0, 1))).normalized()
    p = Vector((c.x, c.y, 1.4)) + n * 0.002
    box('label', *_span(p, a, n, 0.11, 0.075, 0.003), mat('label-card', (0.86, 0.86, 0.84), 0.7, wear=0.3))
    ink = mat('label-ink', (0.1, 0.1, 0.1), 0.8, wear=0)
    for i, (w, dz) in enumerate(((0.07, 0.022), (0.08, 0.008), (0.05, -0.006), (0.06, -0.02))):
        q = p + n * 0.0035 + Vector((0, 0, dz))
        quad('label.line', q, a, w - 0.016, 0.006 if i == 0 else 0.004, ink, facing=n)


def _span(p, a, n, W, H, d):
    """Bounds of an axis-aligned box W wide along a, H tall, d deep along n, centred at p (walls are axis aligned)."""
    pts = [p + a * sa * W / 2 + Vector((0, 0, su * H / 2)) + n * sn * d for sa in (-1, 1) for su in (-1, 1) for sn in (0, 1)]
    return (min(q.x for q in pts), min(q.y for q in pts), min(q.z for q in pts), max(q.x for q in pts), max(q.y for q in pts), max(q.z for q in pts))


def fittings(r, outlets=True, sprinklers=True, exit_sign=True, vent=True, dark=False):
    """What every real room has and a rendered one forgets: sockets low on the walls, sprinkler heads and a smoke
    detector in the ceiling, a ventilation slot, a lit exit sign over the door. Small, but the eye looks for them."""
    white = mat('fitting-white', (0.8, 0.8, 0.78), 0.45, wear=0.3)
    chrome = mat('sprinkler', (0.7, 0.7, 0.7), 0.25, metal=1.0)
    if outlets:
        for wall in 'sn':
            for p0, p1, n in r.wall_runs(wall, margin=0.4):
                L = math.dist(p0, p1)
                if L < 3: continue
                a = (Vector((*p1, 0)) - Vector((*p0, 0))).normalized()
                for t in ((0.12, 0.88) if L > 8 else (0.88,)):
                    q = Vector(at_wall(p0, n, 0.0)) + a * (L * t) + Vector((0, 0, 0.3))
                    box('socket', *_span(q, a, Vector(n), 0.085, 0.085, 0.008), white, bevel=0.002)
    if sprinklers:
        nx, ny = max(1, int((r.x1 - r.x0) // 3.6)), max(1, int((r.y1 - r.y0) // 3.6))
        for i in range(nx):
            for j in range(ny):
                x = r.x0 + (i + 0.5) * (r.x1 - r.x0) / nx; y = r.y0 + (j + 0.5) * (r.y1 - r.y0) / ny
                cylinder('sprinkler', (x, y), 0.028, r.h - 0.012, r.h, chrome, n=16)
                cylinder('sprinkler.head', (x, y), 0.008, r.h - 0.05, r.h - 0.012, chrome, n=8)
        cylinder('smoke-detector', (r.x0 + (r.x1 - r.x0) * 0.3, r.y0 + (r.y1 - r.y0) * 0.6), 0.06, r.h - 0.04, r.h, white, n=24)
    if vent:
        y = r.y0 + 0.002
        box('vent', r.x0 + (r.x1 - r.x0) * 0.2, y - 0.004, r.h - 0.32, r.x0 + (r.x1 - r.x0) * 0.2 + 1.2, y + 0.004, r.h - 0.22, mat('vent-slot', (0.035, 0.035, 0.035), 0.6, wear=0))
    if exit_sign:
        for wall, c, wd, ht in list(r.doors)[:1]:
            x, y, n = {'e': (r.x1, c, (-1, 0, 0)), 'w': (r.x0, c, (1, 0, 0)), 's': (c, r.y0, (0, 1, 0)), 'n': (c, r.y1, (0, -1, 0))}[wall]
            nn = Vector(n); a = nn.cross(Vector((0, 0, 1))).normalized()
            q = Vector((x, y, min(r.h - 0.2, ht + 0.25))) + nn * 0.002
            box('exit', *_span(q, a, nn, 0.36, 0.15, 0.04), mat('exit-body', (0.85, 0.85, 0.83), 0.4, wear=0.2))
            quad('exit.face', q + nn * 0.042, a, 0.32, 0.11, exit_green(dark), facing=nn)


def exit_green(dark):
    if 'exit-green' in MATS: return MATS['exit-green']
    m = bpy.data.materials.new('exit-green'); m.use_nodes = True
    nt = m.node_tree; nt.nodes.clear()
    out = nt.nodes.new('ShaderNodeOutputMaterial'); em = nt.nodes.new('ShaderNodeEmission')
    em.inputs[0].default_value = (0.04, 0.75, 0.22, 1); em.inputs[1].default_value = 5.0 if dark else 2.5
    nt.links.new(em.outputs[0], out.inputs[0]); MATS['exit-green'] = m
    return m


def bench(cx, cy, length=1.8, along='x'):
    """A gallery bench: a slab of oak on a black steel frame."""
    oak = mat('bench-oak', tex='oak_veneer_01', scale=0.8, rough_mul=0.8, coat=0.2)
    steel = mat('bench-steel', (0.03, 0.03, 0.03), 0.35, metal=0.8)
    L, Wd = (length, 0.45) if along == 'x' else (0.45, length)
    box('bench.top', cx - L / 2, cy - Wd / 2, 0.40, cx + L / 2, cy + Wd / 2, 0.45, oak, bevel=0.004)
    for sx in (-1, 1):
        ox, oy = (sx * (L / 2 - 0.15), 0) if along == 'x' else (0, sx * (Wd / 2 - 0.15))
        bx, by = (0.03, Wd / 2 - 0.03) if along == 'x' else (L / 2 - 0.03, 0.03)
        box('bench.leg', cx + ox - bx, cy + oy - by, 0, cx + ox + bx, cy + oy + by, 0.40, steel)


def track_head(pos, target):
    """A visible spot fixture: a small black cylinder on the track, pointing at its work."""
    d = (target - pos).normalized()
    body = cylinder('fixture', (0, 0), 0.035, 0, 0.13, mat('fixture', (0.03, 0.03, 0.03), 0.35, metal=0.3))
    body.rotation_euler = (-d).to_track_quat('Z', 'Y').to_euler()     # its length runs back from the lamp, away from the work
    body.location = pos - d * 0.015


def track(x0, y0, x1, y1, z):
    box('track', min(x0, x1) - 0.015, min(y0, y1) - 0.015, z - 0.035, max(x0, x1) + 0.015, max(y0, y1) + 0.015, z, mat('fixture', (0.03, 0.03, 0.03), 0.35, metal=0.3))


# --- rooms ----------------------------------------------------------------------------------------------------------
class Room:
    """A rectangular room at (x0..x1, y0..y1), height h, with doors to its neighbours: a shell of floor, walls and
    ceiling, built from the materials given. Doors are (wall, centre, width, height); wall is 'w','e','s','n'."""

    def __init__(self, x0, y0, x1, y1, h, floor, walls, ceiling, doors=(), windows=(), t=0.25, base=None, shadow_gap=True,
                 ceiling_open=None, skip=''):
        self.x0, self.y0, self.x1, self.y1, self.h = x0, y0, x1, y1, h
        box('floor', x0 - t, y0 - t, -0.2, x1 + t, y1 + t, 0, floor)
        if ceiling is not None:
            if ceiling_open:   # a ceiling with an opening (a skylight, a laylight): built around it
                ox0, oy0, ox1, oy1 = ceiling_open
                for (a0, b0, a1, b1) in ((x0 - t, y0 - t, x1 + t, oy0), (x0 - t, oy1, x1 + t, y1 + t), (x0 - t, oy0, ox0, oy1), (ox1, oy0, x1 + t, oy1)):
                    if a1 > a0 and b1 > b0: box('ceiling', a0, b0, h, a1, b1, h + 0.3, ceiling)
            else:
                box('ceiling', x0 - t, y0 - t, h, x1 + t, y1 + t, h + 0.3, ceiling)
        holes = {k: [] for k in 'wesn'}
        for wall, c, wd, ht in doors: holes[wall].append((c - wd / 2, c + wd / 2, 0, ht))
        for wall, c, wd, z0, z1 in windows: holes[wall].append((c - wd / 2, c + wd / 2, z0, z1))
        if 's' not in skip: wall_along('wall.s', 'x', y0, x0 - t, x1 + t, 0, h, -1, t, walls, holes['s'])
        if 'n' not in skip: wall_along('wall.n', 'x', y1, x0 - t, x1 + t, 0, h, +1, t, walls, holes['n'])
        if 'w' not in skip: wall_along('wall.w', 'y', x0, y0, y1, 0, h, -1, t, walls, holes['w'])
        if 'e' not in skip: wall_along('wall.e', 'y', x1, y0, y1, 0, h, +1, t, walls, holes['e'])
        self.doors, self.windows = doors, windows
        wn = getattr(walls, 'name', '')
        tc = TRIM.get(wn, (0.86, 0.85, 0.82))
        if tc and not SURF.get('bare'):
            trim = mat('trim-' + wn, tc, 0.38, wear=0.5)
            def P(wall, a, d, z): return {'s': (a, y0 + d), 'n': (a, y1 - d), 'w': (x0 + d, a), 'e': (x1 - d, a)}[wall] + (z,)
            def B(wall, a0, a1, d0, d1, z0, z1, m, bv=0.002):
                p, q = P(wall, a0, d0, z0), P(wall, a1, d1, z1)
                box('trim', min(p[0], q[0]), min(p[1], q[1]), z0, max(p[0], q[0]), max(p[1], q[1]), z1, m, bevel=bv)
            for wall, c, wd, ht in doors:      # architrave: two jambs and a head, 7 cm wide, proud of the wall; a thin threshold strip
                B(wall, c - wd / 2 - 0.07, c - wd / 2, 0, 0.014, 0, ht + 0.07, trim)
                B(wall, c + wd / 2, c + wd / 2 + 0.07, 0, 0.014, 0, ht + 0.07, trim)
                B(wall, c - wd / 2, c + wd / 2, 0, 0.014, ht, ht + 0.07, trim)
                B(wall, c - wd / 2, c + wd / 2, -t, 0.004, 0, 0.008, mat('threshold', (0.55, 0.53, 0.5), 0.3, metal=0.0, wear=0.8), 0.001)
            for wall, c, wd, z0, z1 in [w for w in windows if w[3] > 0.2]:  # a window board: a sill that runs through the reveal and projects into the room
                B(wall, c - wd / 2 - 0.05, c + wd / 2 + 0.05, -t * 0.5, 0.05, z0 - 0.028, z0, trim, 0.003)
                fr = trim if tc else mat('window-steel', (0.04, 0.04, 0.045), 0.4, metal=0.7, wear=0.3)
                if wn == 'black-wall': continue
                fw = 0.045                      # a casement frame in the reveal, around the glass: head, jambs, sill rail
                B(wall, c - wd / 2, c - wd / 2 + fw, -0.055, -0.005, z0, z1, fr, 0.002); B(wall, c + wd / 2 - fw, c + wd / 2, -0.055, -0.005, z0, z1, fr, 0.002)
                B(wall, c - wd / 2, c + wd / 2, -0.055, -0.005, z1 - fw, z1, fr, 0.002); B(wall, c - wd / 2, c + wd / 2, -0.055, -0.005, z0, z0 + fw * 1.4, fr, 0.002)
        SHELLS.append(self)
        if shadow_gap:   # the recessed shadow gap at the foot of a gallery wall
            g = mat('shadow-gap', (0.02, 0.02, 0.02), 0.9)
            for (a0, b0, a1, b1) in ((x0, y0, x1, y0 + 0.012), (x0, y1 - 0.012, x1, y1), (x0, y0, x0 + 0.012, y1), (x1 - 0.012, y0, x1, y1)):
                box('gap', a0, b0, 0, a1, b1, 0.012, g)
        if base:          # a skirting board
            bh, bm = base
            for (a0, b0, a1, b1) in ((x0, y0, x1, y0 + 0.018), (x0, y1 - 0.018, x1, y1), (x0, y0, x0 + 0.018, y1), (x1 - 0.018, y0, x1, y1)):
                box('skirting', a0, b0, 0, a1, b1, bh, bm, bevel=0.003)

    def wall_runs(self, wall, margin=0.6):
        """The stretches of a wall's face free of doors and windows, as (p0, p1, normal) at the wall face."""
        x0, y0, x1, y1 = self.x0, self.y0, self.x1, self.y1
        geo = {'s': ((x0, y0), (x1, y0), (0, 1, 0)), 'n': ((x1, y1), (x0, y1), (0, -1, 0)), 'w': ((x0, y1), (x0, y0), (1, 0, 0)), 'e': ((x1, y0), (x1, y1), (-1, 0, 0))}
        (ax, ay), (bx, by), n = geo[wall]
        a0, a1 = (ax, bx) if wall in 'sn' else (ay, by)
        cuts = [(c - wd / 2, c + wd / 2) for wl, c, wd, *_ in list(self.doors) + list(self.windows) if wl == wall]
        lo, hi = sorted((a0, a1)); segs = []; cur = lo + margin
        for c0, c1 in sorted(cuts):
            if c0 - margin > cur: segs.append((cur, c0 - margin))
            cur = max(cur, c1 + margin)
        if hi - margin > cur: segs.append((cur, hi - margin))
        out = []
        for s0, s1 in segs:
            if s1 - s0 < 1.0: continue
            if wall == 's': out.append(((s0, y0), (s1, y0), n))
            elif wall == 'n': out.append(((s1, y1), (s0, y1), n))
            elif wall == 'w': out.append(((x0, s1), (x0, s0), n))
            else: out.append(((x1, s0), (x1, s1), n))
        return out


def at_wall(p, n, d=0.002):
    return (p[0] + n[0] * d, p[1] + n[1] * d, 0)


def fill(room, works, walls='sne w', **kw):
    """Hang works along a room's walls in order, as many as fit, each wall's run its share."""
    left = list(works); placed = []
    for wall in walls.replace(' ', ''):
        for p0, p1, n in room.wall_runs(wall):
            if not left: return placed
            L = math.dist(p0, p1)
            take, used = [], 0.9
            for w in left:
                W = w['size'][0] / 100 + 0.9
                if used + W > L: continue
                take.append(w); used += W
            if not take: continue
            left = [w for w in left if w not in take]
            placed += hang_wall(take, at_wall(p0, n), at_wall(p1, n), n, ceiling=kw.get('ceiling', room.h), **{k: v for k, v in kw.items() if k != 'ceiling'})
    return placed


def ambient(r, lux=110, kelvin=4000):
    """Wall washers, as a gallery has them: a line of light near the ceiling along each wall, aimed down at it, so a
    wall is brightest under the ceiling and fades a little toward the floor, and the room is lit by what the walls
    give back (not by one flat light over everything, which reads as a render)."""
    from mathutils import Matrix
    for wall in 'snwe':
        for p0, p1, n in r.wall_runs(wall, margin=0.3) or []:
            a = (Vector((*p1, 0)) - Vector((*p0, 0))); L = a.length; a.normalize(); nv = Vector(n)
            if L < 0.8: continue
            d = (-nv * 0.55 + Vector((0, 0, -0.85))).normalized()          # toward the wall and down
            z = -d; y = z.cross(a).normalized(); x = y.cross(z)
            m = Matrix((x, y, z)).transposed().to_4x4()
            mid = (Vector((*p0, 0)) + Vector((*p1, 0))) / 2 + nv * 0.8; mid.z = r.h - 0.08
            li = bpy.data.lights.new('washer', 'AREA'); li.shape = 'RECTANGLE'; li.size, li.size_y = L - 0.2, 0.12
            li.color = blackbody(kelvin); li.spread = math.radians(110)
            li.energy = lux * LUX * L * r.h * 2.2
            ob = bpy.data.objects.new('washer', li); bpy.context.collection.objects.link(ob)
            ob.matrix_world = Matrix.Translation(mid) @ m


def camera(pos, look, lens=20, shift=(0, 0)):
    """An architecture photographer's camera: level, so verticals stay vertical, framed up or down by shifting the
    lens (two-point perspective); never wider than 20 mm, whose stretched corners give a render away."""
    lens = max(lens + 3, 20)
    d = Vector(look) - Vector(pos); flat = Vector((d.x, d.y, 0))
    pitch = math.atan2(d.z, flat.length)
    cam = bpy.data.cameras.new('cam'); cam.lens = lens; cam.sensor_width = 36; cam.sensor_fit = 'HORIZONTAL'
    s = bpy.context.scene; aspect = s.render.resolution_y / s.render.resolution_x
    cam.shift_x = shift[0]
    cam.shift_y = max(-0.3 * aspect, min(0.3 * aspect, lens * math.tan(pitch) / 36 + shift[1]))
    ob = bpy.data.objects.new('cam', cam); bpy.context.collection.objects.link(ob)
    ob.location = pos; ob.rotation_euler = (math.pi / 2, 0, math.atan2(flat.y, flat.x) - math.pi / 2)
    s.camera = ob
    lens_look(s)
    return ob


def lens_look(s):
    """What a real lens adds: light falling off toward the corners, a faint bloom round bright things, a trace of
    chromatic fringe at the edges. Kept small: seen, not noticed."""
    try:
        s.use_nodes = True; nt = s.node_tree; nt.nodes.clear()
    except Exception as e:
        print('no compositor:', e); return
    try:
        rl = nt.nodes.new('CompositorNodeRLayers'); comp = nt.nodes.new('CompositorNodeComposite')
        glare = nt.nodes.new('CompositorNodeGlare')
        for k, v in (('glare_type', 'FOG_GLOW'), ('quality', 'HIGH'), ('mix', -0.92), ('threshold', 1.5), ('size', 8)):
            try: setattr(glare, k, v)
            except Exception: pass
        for k, v in (('Strength', 0.06), ('Threshold', 1.5)):
            try: glare.inputs[k].default_value = v
            except Exception: pass
        lens = nt.nodes.new('CompositorNodeLensdist')
        try: lens.inputs['Dispersion'].default_value = 0.005
        except Exception: pass
        mask = nt.nodes.new('CompositorNodeEllipseMask')
        for k, v in (('width', 1.3), ('height', 1.3)):
            try: setattr(mask, k, v)
            except Exception: pass
        blur = nt.nodes.new('CompositorNodeBlur')
        for k, v in (('filter_type', 'GAUSS'), ('use_relative', True), ('factor_x', 30), ('factor_y', 30), ('size_x', 400), ('size_y', 400)):
            try: setattr(blur, k, v)
            except Exception: pass
        rng = nt.nodes.new('CompositorNodeMapRange')
        rng.inputs[3].default_value = 0.8; rng.inputs[4].default_value = 1.0
        mul = nt.nodes.new('CompositorNodeMixRGB'); mul.blend_type = 'MULTIPLY'; mul.inputs[0].default_value = 1.0
        L = nt.links
        L.new(rl.outputs['Image'], glare.inputs[0]); L.new(glare.outputs[0], lens.inputs[0])
        L.new(mask.outputs[0], blur.inputs[0]); L.new(blur.outputs[0], rng.inputs[0])
        L.new(lens.outputs[0], mul.inputs[1]); L.new(rng.outputs[0], mul.inputs[2])
        L.new(mul.outputs[0], comp.inputs[0])
    except Exception as e:      # a compositor that changed: the plain render rather than none
        print('lens look skipped:', e); nt.nodes.clear()
        rl = nt.nodes.new('CompositorNodeRLayers'); comp = nt.nodes.new('CompositorNodeComposite'); nt.links.new(rl.outputs['Image'], comp.inputs[0])


# --- the ten kinds of room ------------------------------------------------------------------------------------------
# Each builder returns the camera's place; materials, light and works are its own.

def white_cube(v):
    plaster = mat('white-plaster', (0.83, 0.83, 0.81), 0.9, tex='plastered_wall_04', scale=2.5, tint=(0.84, 0.835, 0.82), tint_mix=0.08, bump=0.25)
    floor = mat('polished-concrete', rough=0.35, tex='smooth_concrete_floor', scale=3.0, tint=(0.46, 0.46, 0.45), tint_mix=0.35, rough_mul=0.55, bump=0.2, coat=0.15, smudges=('SurfaceImperfections003', 2.2, 0.8), streaks=True)
    ceil = mat('ceiling-white', (0.8, 0.8, 0.79), 0.95, tex='plastered_wall_04', scale=2.5, tint=(0.8, 0.8, 0.79), tint_mix=0.06, bump=0.2)
    world()
    if v == 'small':           # a project room, 6 x 5 x 3.2
        r = Room(0, 0, 6, 5, 3.2, floor, plaster, ceil, doors=[('e', 1.2, 1.4, 2.4)])
        track(0.3, 5 - 1.0, 5.7, 5 - 1.0, 3.2); track(1.05, 0.3, 1.05, 4.7, 3.2)
        fill(r, works_of('henri-matisse')[1:] + works_of('vincent-van-gogh', n=3), walls='nws', ceiling=3.2)
        ambient(r, 120); fittings(r)
        return camera((5.6, 0.5, EYE), (1.2, 3.6, 1.45), lens=18)
    if v == 'large':           # a hall 15 x 10 x 5.5 with a north skylight strip
        r = Room(0, 0, 15, 10, 5.5, floor, plaster, ceil, doors=[('e', 2.0, 2.2, 3.0)], ceiling_open=(1.5, 7.2, 13.5, 8.4))
        mesh('diffuser', [(1.5, 7.2, 5.4), (13.5, 7.2, 5.4), (13.5, 8.4, 5.4), (1.5, 8.4, 5.4)], [(0, 1, 2, 3)], emission('skylight', 2.2, 6500))
        area('skylight', (7.5, 7.8, 5.38), (12, 1.2), 160, 6500)
        track(1, 2.6, 14, 2.6, 5.5)
        ambient(r, 80)
        fill(r, works_of('hilma-af-klint', n=3) + works_of('henri-matisse', n=3), walls='nw', ceiling=5.5, lux=180)
        fittings(r); bench(7.5, 4.6, 2.4)
        return camera((14.2, 0.6, EYE), (3.0, 7.0, 2.0), lens=17)
    # three rooms in a row, 9 x 7 x 4 each, doorways 2 m on one axis
    rooms = []
    for i in range(3):
        doors = []
        if i > 0: doors.append(('w', 3.5, 2.0, 2.8))
        if i < 2: doors.append(('e', 3.5, 2.0, 2.8))
        x = 9.25 * i; rooms.append(Room(x, 0, x + 9, 7, 4.0, floor, plaster, ceil, doors=doors, skip='w' if i else ''))
        track(x + 0.4, 7 - 1.4, x + 8.6, 7 - 1.4, 4.0); track(x + 0.4, 1.4, x + 8.6, 1.4, 4.0)
    for r in rooms: ambient(r, 110)
    fill(rooms[0], works_of('henri-matisse', n=3), walls='ns', ceiling=4.0)
    fill(rooms[1], works_of('vincent-van-gogh', n=4), walls='ns', ceiling=4.0)
    fill(rooms[2], works_of('claude-monet', n=4), walls='nse', ceiling=4.0)
    for r in rooms: fittings(r, exit_sign=r is rooms[0])
    bench(9.25 + 4.5, 3.5, 1.8)
    return camera((1.2, 3.5, EYE), (26.5, 3.6, 1.5), lens=22)


def loft(v):
    brick = mat('painted-brick', tex='painted_brick', scale=2.2, tint=(0.86, 0.85, 0.82), tint_mix=0.25, bump=0.6, runs=True)
    floor = mat('worn-concrete', tex='concrete_floor_worn_001', scale=4.0, tint=(0.5, 0.5, 0.48), tint_mix=0.3, rough_mul=0.7, bump=0.3, smudges=('SurfaceImperfections004', 3.0, 0.7), streaks=True)
    steel = mat('steel', (0.08, 0.085, 0.09), 0.45, metal=0.8)
    ceil = mat('roof-white', (0.75, 0.75, 0.74), 0.9, tex='wood_planks', scale=3.0, tint=(0.8, 0.8, 0.78), tint_mix=0.15)
    world(hdri=hdri('overcast'), strength=1.0)
    W, D, H = {'small': (20, 12, 6), 'large': (40, 10, 7)}.get(v, (24, 12, 6))
    r = Room(0, 0, W, D, H + 1.6, floor, brick, None, doors=[('e', D / 2, 3.0, 3.6)], shadow_gap=False)
    # a sawtooth roof: north-facing glass in each tooth, steel trusses below
    tooth = 4.0
    for i in range(int(W // tooth)):
        x = i * tooth
        mesh('roof.slope', [(x, -0.3, H + 1.6), (x + tooth * 0.8, -0.3, H), (x + tooth * 0.8, D + 0.3, H), (x, D + 0.3, H + 1.6)], [(0, 1, 2, 3)], ceil)
        mesh('roof.glass', [(x + tooth * 0.8, -0.3, H), (x + tooth, -0.3, H + 1.6), (x + tooth, D + 0.3, H + 1.6), (x + tooth * 0.8, D + 0.3, H)], [(0, 1, 2, 3)], glass())
        box('truss', x + tooth - 0.06, -0.2, H - 0.35, x + tooth + 0.06, D + 0.2, H - 0.2, steel)
    box('roof.top', -0.3, -0.3, H + 1.6, W + 0.3, D + 0.3, H + 1.8, ceil)
    if v in ('small', ''):
        for cx in range(4, W, 8):
            for cy in (D / 2 - 2.5, D / 2 + 2.5):
                cylinder('column', (cx, cy), 0.18, 0, H, mat('cast-iron', (0.12, 0.12, 0.12), 0.5, metal=0.6))
    if v == '':                # two bays parted by a freestanding wall
        box('partition', W / 2 - 0.15, 2.5, 0, W / 2 + 0.15, D - 2.5, 4.2, brick)
    area('north-light', (W / 2, D / 2, H - 0.3), (W - 1, D - 1), 90, 6500)
    fill(r, works_of('hilma-af-klint') + works_of('henri-matisse', n=2), walls='ns', ceiling=H, lux=170, beam=40)
    fittings(r, sprinklers=False, vent=False); bench(W * 0.62, D / 2, 2.2)
    return camera((W - 1.2, 1.0, EYE), (W * 0.25, D * 0.7, 2.6), lens=17)


def skylit_hall(v):
    plaster = mat('lime-plaster', tex='white_plaster_rough_01', scale=2.0, tint=(0.82, 0.8, 0.76), tint_mix=0.15, bump=0.3)
    oak = mat('oak-floor', tex='oak_wood_planks', scale=2.4, rough_mul=0.75, bump=0.4, coat=0.1, smudges=('SurfaceImperfections003', 2.0, 0.6), streaks=True)
    vault = mat('vault', (0.82, 0.8, 0.77), 0.9, tex='white_plaster_rough_02', scale=3.0, tint=(0.84, 0.82, 0.78), tint_mix=0.1)
    world()
    if v == 'small':           # a skylit square, 10 x 10 x 5.5, a laylight ceiling
        r = Room(0, 0, 10, 10, 5.5, oak, plaster, vault, doors=[('e', 5, 2.2, 3.2)], ceiling_open=(2, 2, 8, 8))
        mesh('laylight', [(2, 2, 5.45), (8, 2, 5.45), (8, 8, 5.45), (2, 8, 5.45)], [(0, 1, 2, 3)], emission('laylight', 1.6, 6000))
        for i in range(1, 6):
            box('laylight.bar', 2 + i, 2, 5.42, 2 + i + 0.04, 8, 5.45, mat('bar', (0.7, 0.7, 0.68), 0.6))
        area('daylight', (5, 5, 5.4), (6, 6), 260, 6000)
        fill(r, works_of('vincent-van-gogh', n=6), walls='nsw', ceiling=5.5, lux=120)
        fittings(r, sprinklers=False, vent=False); bench(5, 5, 2.0)
        return camera((9.3, 1.0, EYE), (2.0, 7.5, 2.0), lens=18)
    n = 3 if v == 'large' else 1
    L, D, Hs = (24, 7, 4.6) if n == 3 else (20, 8, 4.8)
    r = Room(0, 0, L, D, Hs, oak, plaster, None, doors=[('e', D / 2, 2.2, 3.2)])
    # barrel vaults along the length (Kimbell): a cycloid-like curve, a slot of skylight at the crown, a reflector under it
    for k in range(n):
        y0 = k * D / n; y1 = (k + 1) * D / n; R = (y1 - y0) / 2; cy = (y0 + y1) / 2
        seg = 24; verts, faces = [], []
        for i in range(seg + 1):
            a = math.pi * i / seg
            y = cy - R * math.cos(a); z = Hs + R * 0.8 * math.sin(a)
            if abs(y - cy) < 0.35: y = cy + (0.35 if y > cy else -0.35)
            verts += [(0, y, z), (L, y, z)]
        for i in range(seg):
            if abs(verts[2 * i][1] - cy) <= 0.35 and abs(verts[2 * i + 2][1] - cy) <= 0.35: continue
            faces.append((2 * i, 2 * i + 1, 2 * i + 3, 2 * i + 2))
        mesh('vault', verts, faces, vault, smooth=True)
        for xe in (0, L):   # the end walls under the vault (lunettes)
            arc = [(xe, cy - R * math.cos(math.pi * i / seg), Hs + R * 0.8 * math.sin(math.pi * i / seg)) for i in range(seg + 1)]
            mesh('lunette', arc, [tuple(range(seg + 1))], plaster)
        top = Hs + R * 0.8
        mesh('slot', [(0, cy - 0.35, top + 0.05), (L, cy - 0.35, top + 0.05), (L, cy + 0.35, top + 0.05), (0, cy + 0.35, top + 0.05)], [(0, 1, 2, 3)], emission('slot', 6.0, 6200))
        box('reflector', 0.3, cy - 0.9, top - 0.75, L - 0.3, cy + 0.9, top - 0.72, mat('perforated-aluminium', (0.75, 0.76, 0.78), 0.35, metal=0.9))
        area(f'vault.light.{k}', (L / 2, cy, top - 0.8), (L - 1, 1.8), 210, 6200, spread=150)
    fill(r, works_of('vincent-van-gogh') + works_of('claude-monet', n=3), walls='ns', ceiling=Hs, lux=110)
    fittings(r, sprinklers=False, vent=False)
    for bx in (L * 0.3, L * 0.7): bench(bx, D / 2, 2.0)
    return camera((L - 1.0, D / 2 + 0.6, EYE), (2, D / 2 - 0.5, 2.2), lens=18)


def salon(v):
    red = mat('salon-red', tex='painted_plaster_wall', scale=2.0, tint=(0.24, 0.035, 0.045), tint_mix=0.15, bump=0.2)
    green = mat('salon-green', tex='painted_plaster_wall', scale=2.0, tint=(0.09, 0.17, 0.12), tint_mix=0.15, bump=0.2)
    parquet = mat('parquet', tex='herringbone_parquet', scale=3.4, rough_mul=0.7, coat=0.25, bump=0.3, smudges=('SurfaceImperfections003', 2.0, 0.7), streaks=True)
    ceil = mat('ceiling-cream', (0.82, 0.79, 0.72), 0.9, tex='plastered_wall_04', scale=2.5, tint=(0.82, 0.79, 0.72), tint_mix=0.06, bump=0.2)
    panel = mat('wainscot', (0.78, 0.75, 0.68), 0.55, bump=0.2)
    gilt = mat('gilt-frame', (0.62, 0.47, 0.22), 0.3, metal=1.0)
    world()

    def dress(r):
        # wainscot to 0.95 m, a dado rail, a cornice under the ceiling, a picture rail
        x0, y0, x1, y1, h = r.x0, r.y0, r.x1, r.y1, r.h
        for (a0, b0, a1, b1) in ((x0, y0, x1, y0 + 0.03), (x0, y1 - 0.03, x1, y1), (x0, y0, x0 + 0.03, y1), (x1 - 0.03, y0, x1, y1)):
            box('wainscot', a0, b0, 0, a1, b1, 0.95, panel, bevel=0.004)
            box('dado', a0, b0, 0.95, a1 + (0.02 if a1 - a0 < 0.1 else 0), b1 + (0.02 if b1 - b0 < 0.1 else 0), 1.0, panel, bevel=0.006)
            box('cornice', a0, b0, h - 0.28, a1, b1, h, ceil, bevel=0.02)
        for wl, c, wd, ht in r.doors:   # cut the wainscot at the doors: a door case instead
            pass

    def lantern(r):
        cx, cy = (r.x0 + r.x1) / 2, (r.y0 + r.y1) / 2; lw, ld = (r.x1 - r.x0) * 0.45, (r.y1 - r.y0) * 0.45
        mesh('lantern', [(cx - lw / 2, cy - ld / 2, r.h - 0.01), (cx + lw / 2, cy - ld / 2, r.h - 0.01), (cx + lw / 2, cy + ld / 2, r.h - 0.01), (cx - lw / 2, cy + ld / 2, r.h - 0.01)], [(0, 1, 2, 3)], emission('lantern', 1.3, 5600))
        area('lantern.light', (cx, cy, r.h - 0.05), (lw, ld), 280, 5600)

    if v == 'small':
        r = Room(0, 0, 6, 5, 4.2, parquet, red, ceil, doors=[('e', 2.5, 1.3, 2.5)], shadow_gap=False)
        dress(r); lantern(r)
        salon_hang(r, works_of('berthe-morisot') + works_of('mary-cassatt'), gilt)
        return camera((5.5, 0.4, EYE), (0.8, 3.8, 2.0), lens=17)
    if v == 'large':           # a long gallery 16 x 5.5 x 5 with lanterns
        r = Room(0, 0, 16, 5.5, 5, parquet, green, ceil, doors=[('e', 2.75, 1.6, 2.8)], shadow_gap=False)
        dress(r)
        for i in range(3):
            sub = Room.__new__(Room); sub.x0, sub.y0, sub.x1, sub.y1, sub.h = i * 16 / 3, 0, (i + 1) * 16 / 3, 5.5, 5; lantern(sub)
        salon_hang(r, works_of('berthe-morisot') + works_of('mary-cassatt') + works_of('suzanne-valadon'), gilt)
        return camera((15.4, 0.6, EYE), (1, 4.2, 2.2), lens=17)
    rooms = []
    for i, wall in enumerate((red, green, red)):
        doors = [('w', 3.0, 1.4, 2.6)] if i else []
        if i < 2: doors.append(('e', 3.0, 1.4, 2.6))
        r = Room(7.25 * i, 0, 7.25 * i + 7, 6, 4.5, parquet, wall, ceil, doors=doors, shadow_gap=False, skip='w' if i else '')
        dress(r); lantern(r); rooms.append(r)
    salon_hang(rooms[0], works_of('mary-cassatt'), gilt, walls='ns')
    salon_hang(rooms[1], works_of('berthe-morisot'), gilt, walls='ns')
    salon_hang(rooms[2], works_of('suzanne-valadon'), gilt, walls='nse')
    return camera((0.8, 3.0, EYE), (20.5, 3.0, 1.7), lens=22)


def salon_hang(r, works, frame, walls='nsw'):
    """A salon hang: works in gilt frames, two rows where they fit, each with a warm picture light."""
    if SURF['on']: return
    left = list(works)
    for wall in walls:
        for p0, p1, n in r.wall_runs(wall, margin=0.4):
            if not left: return
            L = math.dist(p0, p1)
            for row_z in (1.45, 2.65):
                take, used = [], 0.4
                for w in left:
                    W = w['size'][0] / 100 * 0.9 + 0.5
                    if used + W > L: break
                    take.append(w); used += W
                if not take: continue
                left = left[len(take):]
                p0v, p1v = Vector(at_wall(p0, n, 0.002)), Vector(at_wall(p1, n, 0.002)); a = (p1v - p0v).normalized()
                space = (L - sum(w['size'][0] / 100 * 0.9 + 0.12 for w in take)) / (len(take) + 1); x = space
                for w in take:
                    Wm = w['size'][0] / 100 * 0.9 + 0.12; c = p0v + a * (x + Wm / 2)
                    ww = dict(w, size=[w['size'][0] * 0.9, w['size'][1] * 0.9])
                    gilt_frame(ww, c, a, Vector(n), row_z, frame)
                    pos = c + Vector(n) * 0.9; pos.z = min(r.h - 0.35, row_z + 1.9)
                    NORMAL['n'] = tuple(n)
                    spot(f'picture.{w["slug"]}', tuple(pos), (c.x, c.y, row_z), 120, 45, 3000, blend=0.6)
                    x += Wm + space


def gilt_frame(w, c, a, n, z, material):
    W, H = w['size'][0] / 100, w['size'][1] / 100
    cc = Vector((c.x, c.y, z))
    quad(w['slug'], cc + n * 0.045, a, W, H, canvas_material(w), uv=True, facing=n)
    frame_box(w['slug'] + '.frame', cc, a, n, W + 0.14, H + 0.14, 0.075, 0.05, material)


def formwork(r, walls='nswe', panel=(1.8, 0.9)):
    """The marks the formwork leaves on cast concrete: the panels' joints (a fine raised line), and six tie holes
    per panel, 25 mm across, a few millimetres deep and a little darker; each panel a shade different from the next."""
    joint = mat('form-joint', (0.33, 0.33, 0.32), 0.85, wear=0.5)
    hole = mat('tie-hole', (0.12, 0.12, 0.115), 0.7, wear=0)
    rim = mat('tie-rim', (0.42, 0.42, 0.4), 0.6, wear=0)
    pw, ph = panel
    for wall in walls:
        for p0, p1, n in r.wall_runs(wall, margin=0.0) or []:
            a = Vector((*p1, 0)) - Vector((*p0, 0)); L = a.length; a.normalize(); nv = Vector(n)
            base = Vector(at_wall(p0, n, 0.0))
            cols, rows = int(L / pw) + 1, int(r.h / ph) + 1
            for i in range(1, cols):                     # vertical joints
                q = base + a * (i * pw) + Vector((0, 0, r.h / 2)) + nv * 0.0008
                box('joint', *_span(q, a, nv, 0.004, r.h, 0.0015), joint)
            for j in range(1, rows):                     # horizontal joints
                q = base + a * (L / 2) + Vector((0, 0, j * ph)) + nv * 0.0008
                box('joint', *_span(q, a, nv, L, 0.004, 0.0015), joint)
            for i in range(cols):
                for j in range(rows):
                    for hx in (0.3, 0.9, 1.5):
                        for hz in (0.225, 0.675):
                            x, z = i * pw + hx * pw / 1.8, j * ph + hz * ph / 0.9
                            if x > L - 0.05 or z > r.h - 0.05: continue
                            c = base + a * x + Vector((0, 0, z))
                            disc(c + nv * 0.001, nv, 0.0185, rim); disc(c + nv * 0.0015, nv, 0.0125, hole)


def disc(c, n, rad, material, k=16):
    a = Vector(n).cross(Vector((0, 0, 1))).normalized(); up = Vector((0, 0, 1))
    vs = [tuple(Vector(c) + (a * math.cos(2 * math.pi * i / k) + up * math.sin(2 * math.pi * i / k)) * rad) for i in range(k)]
    face = tuple(range(k)) if a.cross(up).dot(Vector(n)) > 0 else tuple(reversed(range(k)))
    return mesh('disc', vs, [face], material)


def concrete(v):
    conc = mat('formwork-concrete', tex='concrete_wall_004', scale=2.4, tint=(0.6, 0.6, 0.58), tint_mix=0.4, rough_mul=1.0, bump=0.5, runs=True)
    floor = mat('concrete-floor', tex='concrete_floor_02', scale=3.0, tint=(0.42, 0.42, 0.41), tint_mix=0.4, rough_mul=0.6, coat=0.1, bump=0.3, streaks=True)
    world()
    if v == 'large':           # a tall volume 8 x 8 x 6 with a slot window high in the wall
        world(hdri=hdri('overcast'), strength=WIN_STRENGTH)
        r = Room(0, 0, 8, 8, 6, floor, conc, conc, doors=[('e', 1.6, 1.4, 2.6)], windows=[('n', 4, 6.6, 4.9, 5.4)])
        mesh('slot.glass', [(0.7, 8.02, 4.9), (7.3, 8.02, 4.9), (7.3, 8.02, 5.4), (0.7, 8.02, 5.4)], [(0, 1, 2, 3)], glass())
        area('slot.sky', (4, 8.5, 5.15), (6.6, 0.5), 1200, 6500, rot=(math.radians(-90), 0, 0), spread=120)
        portal((4, 8.05, 5.15), (6.6, 0.5), rot=(math.radians(-90), 0, 0))
        ambient(r, 35, 6000)
        fill(r, big('claude-monet', 3), walls='swn', ceiling=6, lux=140, beam=30)
        formwork(r)
        return camera((7.2, 0.7, EYE), (1.5, 6.5, 2.6), lens=17)
    if v == 'small':           # a square room 8 x 8 x 4.25 under a glass daylight ceiling (Bregenz)
        r = Room(0, 0, 8, 8, 4.25, floor, conc, conc, doors=[('e', 1.6, 1.4, 2.6)], ceiling_open=(0.3, 0.3, 7.7, 7.7))
        mesh('light-ceiling', [(0.3, 0.3, 4.24), (7.7, 0.3, 4.24), (7.7, 7.7, 4.24), (0.3, 7.7, 4.24)], [(0, 1, 2, 3)], emission('daylight-ceiling', 1.25, 6300))
        for i in range(1, 8): box('ceiling.joint', i - 0.01, 0.3, 4.22, i + 0.01, 7.7, 4.24, mat('joint', (0.4, 0.4, 0.4), 0.6))
        area('daylight', (4, 4, 4.2), (7.4, 7.4), 230, 6300)
        fill(r, big('claude-monet', 4), walls='nsw', ceiling=4.25, light=False)
        formwork(r)
        return camera((7.3, 0.7, EYE), (1.0, 6.0, 1.8), lens=18)
    rooms = [Room(0, 0, 9, 8, 4.5, floor, conc, conc, doors=[('e', 4, 1.0, 3.6)]), Room(9.25, 0, 18.25, 8, 4.5, floor, conc, conc, doors=[('w', 4, 1.0, 3.6)], skip='w')]
    for r in rooms:
        mesh('light-ceiling', [(r.x0 + 0.4, 0.4, 4.49), (r.x1 - 0.4, 0.4, 4.49), (r.x1 - 0.4, 7.6, 4.49), (r.x0 + 0.4, 7.6, 4.49)], [(0, 1, 2, 3)], emission('daylight-ceiling', 1.1, 6300))
        area('daylight', ((r.x0 + r.x1) / 2, 4, 4.45), (8.2, 7.2), 190, 6300)
    fill(rooms[0], big('claude-monet', 3), walls='nsw', ceiling=4.5, light=False)
    fill(rooms[1], works_of('hilma-af-klint', n=2), walls='ne', ceiling=4.5, light=False)
    for r in rooms: formwork(r)
    return camera((0.8, 1.0, EYE), (16, 4.6, 1.9), lens=20)


def studio(v):
    brick = mat('limewash-brick', tex='whitewashed_brick', scale=2.0, tint=(0.88, 0.87, 0.84), tint_mix=0.3, bump=0.7, runs=True)
    boards = mat('painted-boards', tex='old_wooden_floor_03', scale=2.4, tint=(0.62, 0.6, 0.56), tint_mix=0.35, rough_mul=1.0, bump=0.5, smudges=('SurfaceImperfections004', 2.0, 0.5), streaks=True)
    ceil = mat('studio-ceiling', (0.82, 0.82, 0.8), 0.9, tex='plastered_wall_04', scale=2.5, tint=(0.82, 0.82, 0.8), tint_mix=0.06, bump=0.2)
    wood = mat('table-wood', tex='rough_pine_door', scale=1.2, bump=0.4)
    world(hdri=hdri('overcast' if v == 'large' else 'city'), strength=WIN_STRENGTH, rot=STREET_ROT)
    if v == 'large':
        r = Room(0, 0, 10, 7, 6.3, boards, brick, None, doors=[('e', 1.5, 1.4, 2.5)], shadow_gap=False)
        for i in range(5):   # sawtooth: north glass
            x = i * 2.0
            mesh('roof.slope', [(x, -0.2, 6.3), (x + 1.6, -0.2, 5.0), (x + 1.6, 7.2, 5.0), (x, 7.2, 6.3)], [(0, 1, 2, 3)], ceil)
            mesh('roof.glass', [(x + 1.6, -0.2, 5.0), (x + 2.0, -0.2, 6.3), (x + 2.0, 7.2, 6.3), (x + 1.6, 7.2, 5.0)], [(0, 1, 2, 3)], glass())
        box('roof.top', -0.2, -0.2, 6.3, 10.2, 7.2, 6.5, ceil)
        area('sawtooth-light', (5, 3.5, 4.9), (9.4, 6.4), 110, 6800)
        H = 5
    else:
        W, D, H = (5, 4, 3.2) if v == 'small' else (8, 6, 3.6)
        r = Room(0, 0, W, D, H, boards, brick, ceil, doors=[('e', 1.0, 0.9, 2.2)], windows=[('n', W / 2, W * 0.7, 0.9, H - 0.2)], shadow_gap=False)
        mesh('window.glass', [(W * 0.15, D + 0.02, 0.9), (W * 0.85, D + 0.02, 0.9), (W * 0.85, D + 0.02, H - 0.2), (W * 0.15, D + 0.02, H - 0.2)], [(0, 1, 2, 3)], glass())
        for k in range(1, 4):
            box('mullion', W * 0.15 + k * W * 0.7 / 4 - 0.025, D, 0.9, W * 0.15 + k * W * 0.7 / 4 + 0.025, D + 0.06, H - 0.2, mat('window-frame', (0.85, 0.85, 0.83), 0.5))
        box('transom', W * 0.15, D, 2.2, W * 0.85, D + 0.06, 2.25, mat('window-frame', (0.85, 0.85, 0.83), 0.5))
        portal((W / 2, D + 0.05, (0.9 + H - 0.2) / 2), (W * 0.7, H - 1.1), rot=(math.radians(-90), 0, 0))
    # a trestle table, works leaning on the wall, a stool
    tw = 2.2
    box('table.top', 0.8, 1.0, 0.86, 0.8 + tw, 1.9, 0.9, wood, bevel=0.005)
    for tx in (0.95, 0.8 + tw - 0.25):
        box('trestle', tx, 1.05, 0, tx + 0.05, 1.85, 0.86, wood)
    leaning = [] if SURF['on'] else (works_of('paula-moderson-becker') or works_of('paula-modersohn-becker'))
    x = (r.x1 - 0.5)
    for i, w in enumerate(leaning[:2]):
        W, Hh = w['size'][0] / 100, w['size'][1] / 100
        c = Vector((r.x1 - 0.03 - 0.12, 2.0 + i * 1.2, Hh / 2 + 0.01))
        ob = quad(w['slug'] + '.leaning', (0, 0, 0), (0, -1, 0), W, Hh, canvas_material(w), uv=True)
        ob.location = c; ob.rotation_euler = (0, math.radians(-8), 0)
    fill(r, works_of('paula-modersohn-becker')[2:] + works_of('suzanne-valadon', n=3), walls='swn', ceiling=H, light=False)
    return camera((r.x1 - 0.6, 0.6, EYE), (0.9, r.y1 - 0.8, 1.7), lens=18)


def apartment(v):
    walls = mat('warm-white', tex='painted_plaster_wall', scale=2.0, tint=(0.8, 0.77, 0.71), tint_mix=0.1, bump=0.2)
    herring = mat('herringbone-oak', tex='herringbone_parquet', scale=3.4, rough_mul=0.7, coat=0.2, bump=0.3, smudges=('SurfaceImperfections003', 2.0, 0.7), streaks=True)
    ceil = mat('apt-ceiling', (0.84, 0.83, 0.8), 0.9, tex='plastered_wall_04', scale=2.5, tint=(0.84, 0.83, 0.8), tint_mix=0.06, bump=0.2)
    skirt = mat('skirting', (0.85, 0.84, 0.8), 0.5)
    linen = mat('sofa-linen', tex='rough_linen', scale=0.4, tint=(0.55, 0.5, 0.42), tint_mix=0.3)
    rug = mat('rug', tex='rough_linen', scale=0.6, tint=(0.62, 0.55, 0.45), tint_mix=0.5)
    world(hdri=hdri('city'), strength=WIN_STRENGTH, rot=STREET_ROT + 25)
    W, D, H = {'small': (5, 4.5, 2.8), 'large': (9, 6, 3.2)}.get(v, (7, 5, 3.0))
    r = Room(0, 0, W, D, H, herring, walls, ceil, doors=[('e', 1.0, 0.9, 2.2)], windows=[('n', W * 0.62, 1.6, 0.6, H - 0.35)],
             base=(0.12, skirt), shadow_gap=False)
    mesh('window.glass', [(W * 0.62 - 0.8, D + 0.02, 0.6), (W * 0.62 + 0.8, D + 0.02, 0.6), (W * 0.62 + 0.8, D + 0.02, H - 0.35), (W * 0.62 - 0.8, D + 0.02, H - 0.35)], [(0, 1, 2, 3)], glass())
    box('window.frame', W * 0.62 - 0.03, D, 0.6, W * 0.62 + 0.03, D + 0.07, H - 0.35, skirt)
    portal((W * 0.62, D + 0.05, (0.6 + H - 0.35) / 2), (1.6, H - 0.95), rot=(math.radians(-90), 0, 0))
    # a picture rail, a sofa, a rug, a low table, a floor lamp
    for (a0, b0, a1, b1) in ((0, 0, W, 0.02), (0, D - 0.02, W, D), (0, 0, 0.02, D), (W - 0.02, 0, W, D)):
        box('picture-rail', a0, b0, H - 0.4, a1, b1, H - 0.37, skirt)
    sx, sy = 0.15, D * 0.25
    box('sofa.base', sx, sy, 0.12, sx + 0.95, sy + 2.2, 0.45, linen, bevel=0.05)
    box('sofa.back', sx, sy, 0.45, sx + 0.25, sy + 2.2, 0.85, linen, bevel=0.06)
    for k in range(2): box('cushion', sx + 0.25, sy + 0.05 + k * 1.05, 0.45, sx + 0.9, sy + 1.05 + k * 1.05, 0.6, linen, bevel=0.06)
    box('rug', 1.2, D * 0.2, 0, W * 0.7, D * 0.8, 0.012, rug)
    box('table', 1.6, D * 0.42, 0, 2.5, D * 0.58, 0.4, mat('walnut', tex='walnut_veneer', scale=0.8, coat=0.3), bevel=0.01)
    cylinder('lamp.pole', (0.5, D * 0.12), 0.012, 0, 1.55, mat('brass', (0.6, 0.45, 0.2), 0.3, metal=1.0))
    cylinder('lamp.shade', (0.5, D * 0.12), 0.2, 1.4, 1.7, emission('shade', 3.0, 2700))
    li = bpy.data.lights.new('lamp', 'POINT'); li.energy = 25; li.color = blackbody(2700); li.shadow_soft_size = 0.15
    lo = bpy.data.objects.new('lamp', li); bpy.context.collection.objects.link(lo); lo.location = (0.5, D * 0.12, 1.55)
    hang_wall(works_of('henri-matisse', n=1)[:1] + works_of('suzanne-valadon')[1:2], at_wall((0, D * 0.9), (1, 0, 0)), at_wall((0, D * 0.1), (1, 0, 0)), (1, 0, 0), z=1.55, ceiling=H, lux=150, spot_kelvin=3000)
    fill(r, works_of('suzanne-valadon')[2:4] + works_of('henri-matisse')[4:6], walls='s', ceiling=H, lux=150, spot_kelvin=3000)
    return camera((W - 0.5, 0.5, EYE), (0.8, D * 0.62, 1.4), lens=17)


def black_box(v):
    black = mat('black-wall', (0.05, 0.05, 0.052), 0.9, tex='painted_plaster_wall', scale=2.0, tint=(0.055, 0.055, 0.058), tint_mix=0.12, bump=0.3)
    floor = mat('dark-floor', tex='smooth_concrete_floor', scale=3.0, tint=(0.1, 0.1, 0.105), tint_mix=0.3, rough_mul=0.5, coat=0.2, smudges=('SurfaceImperfections004', 2.5, 1.0), streaks=True)
    world()
    if v == 'large':           # a round room, 12 m across (the Tanks)
        R, H = 6, 5
        box('floor', -R - 0.5, -R - 0.5, -0.2, R + 0.5, R + 0.5, 0, floor)
        verts, faces, n = [], [], 96
        for i in range(n):
            a = 2 * math.pi * i / n; verts += [(R * math.cos(a), R * math.sin(a), 0), (R * math.cos(a), R * math.sin(a), H)]
        for i in range(n):
            j = (i + 1) % n
            if 0 <= i < 6: continue   # the way in
            faces.append((2 * i, 2 * j, 2 * j + 1, 2 * i + 1))
        mesh('round.wall', verts, faces, black, smooth=True)
        box('ceiling', -R - 0.5, -R - 0.5, H, R + 0.5, R + 0.5, H + 0.2, black)
        ws = works_of('hilma-af-klint', n=4)
        for k, w in enumerate(ws):
            a = math.radians(55 + k * 52); c = Vector((R * math.cos(a), R * math.sin(a), 0)); n = -c.normalized(); n.z = 0
            along = Vector((-math.sin(a), math.cos(a), 0)); c = c + n * 0.01
            hang(w, c, along, n, 1.9)
            pos = c + n * 1.8; pos.z = H - 0.1; NORMAL['n'] = tuple(n)
            spot('spot', tuple(pos), (c.x, c.y, 1.9), 150, 48, 3000, blend=0.35)
        return camera((0.0, -5.3, EYE), (0.3, 4.0, 1.5), lens=17)
    W, D, H = (14, 10, 5) if v == '' else (8, 6, 3.5)
    r = Room(0, 0, W, D, H, floor, black, black, doors=[('e', D / 2, 1.2, 2.4)], shadow_gap=False)
    pipe = mat('grid-pipe', (0.04, 0.04, 0.04), 0.5, metal=0.6)
    for gx in [x * 1.5 for x in range(1, int(W / 1.5))]:
        box('grid', gx - 0.024, 0, H - 0.65, gx + 0.024, D, H - 0.6, pipe)
    for gy in [y * 1.5 for y in range(1, int(D / 1.5))]:
        box('grid', 0, gy - 0.024, H - 0.7, W, gy + 0.024, H - 0.65, pipe)
    for hx in (W * 0.25, W * 0.75):      # house lights, low: you can see your way, not the walls
        area('house', (hx, D / 2, H - 0.75), (0.3, 0.3), 6, 3000)
    if v == '':                # three projection walls: a work as projected light
        for (p, a, n, w) in () if SURF['on'] else (((W / 2, D - 0.01, 2.3), (-1, 0, 0), (0, -1, 0), WORKS['the-great-wave-off-kanagawa']), ((0.01, D / 2, 2.3), (0, -1, 0), (1, 0, 0), WORKS['the-starry-night'])):
            ww, hh = (6.0, 6.0 * w['size'][1] / w['size'][0])
            pm = bpy.data.materials.new('projection.' + w['slug']); pm.use_nodes = True; nt = pm.node_tree; nt.nodes.clear()
            o = nt.nodes.new('ShaderNodeOutputMaterial'); e = nt.nodes.new('ShaderNodeEmission'); t = nt.nodes.new('ShaderNodeTexImage')
            t.image = bpy.data.images.load(os.path.join(APP, w['image']), check_existing=True); nt.links.new(t.outputs[0], e.inputs[0]); e.inputs[1].default_value = 1.4
            nt.links.new(e.outputs[0], o.inputs[0])
            q = quad('projection', p, a, ww, hh, pm, uv=True)
        return camera((W - 1.0, 1.0, EYE), (2.5, D - 2.0, 2.2), lens=17)
    fill(r, works_of('vincent-van-gogh', n=4), walls='nsw', ceiling=H, lux=170)
    fittings(r, outlets=False, vent=False, dark=True)
    return camera((W - 0.7, 0.8, EYE), (1.0, D - 1.5, 1.5), lens=17)


def glass_pavilion(v):
    granite = mat('terrazzo', tex='terrazzo_tiles', scale=2.0, rough_mul=0.6, coat=0.2, bump=0.2, smudges=('SurfaceImperfections003', 2.5, 0.6), streaks=True)
    white = mat('pavilion-wall', (0.84, 0.84, 0.82), 0.9, tex='painted_plaster_wall', scale=2.5, tint=(0.85, 0.85, 0.83), tint_mix=0.06, bump=0.2)
    steel = mat('black-steel', (0.02, 0.02, 0.022), 0.4, metal=0.85)
    ceil = mat('pavilion-ceiling', (0.72, 0.72, 0.7), 0.85, tex='plastered_wall_04', scale=2.5, tint=(0.72, 0.72, 0.7), tint_mix=0.06, bump=0.2)
    world(hdri=hdri('garden'), strength=GARDEN_STRENGTH, rot=GARDEN_ROT)
    W, D, H = {'small': (10, 8, 4), 'large': (24, 16, 5)}.get(v, (14, 9, 4.5))
    box('floor', -2, -2, -0.2, W + 2, D + 2, 0, granite)
    box('roof', -2, -2, H, W + 2, D + 2, H + 0.6, ceil)
    sides = 'nesw' if v == 'large' else ('n' if v == 'small' else 'n')
    # glass walls with black steel mullions every 2 m; solid white walls where there is no glass
    for wall, (p0, p1) in {'s': ((0, 0), (W, 0)), 'n': ((W, D), (0, D)), 'w': ((0, D), (0, 0)), 'e': ((W, 0), (W, D))}.items():
        if wall in sides:
            mesh('glass.' + wall, [(p0[0], p0[1], 0), (p1[0], p1[1], 0), (p1[0], p1[1], H), (p0[0], p0[1], H)], [(0, 1, 2, 3)], glass())
            mid = ((p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2, H / 2); L = math.dist(p0, p1)
            facing = {'n': (math.radians(-90), 0, 0), 's': (math.radians(90), 0, 0), 'e': (0, math.radians(-90), 0), 'w': (0, math.radians(90), 0)}[wall]
            portal(mid, (L, H) if wall in 'ns' else (H, L), rot=facing)
            L = math.dist(p0, p1); n = int(L // 2)
            for k in range(n + 1):
                t = k / n; x, y = p0[0] + (p1[0] - p0[0]) * t, p0[1] + (p1[1] - p0[1]) * t
                box('mullion', x - 0.04, y - 0.04, 0, x + 0.04, y + 0.04, H, steel)
        else:
            if wall in 'sn': box('wall.' + wall, min(p0[0], p1[0]), p0[1] - (0.25 if wall == 's' else 0), 0, max(p0[0], p1[0]), p0[1] + (0.25 if wall == 'n' else 0), H, white)
            else: box('wall.' + wall, p0[0] - (0.25 if wall == 'w' else 0), min(p0[1], p1[1]), 0, p0[0] + (0.25 if wall == 'e' else 0), max(p0[1], p1[1]), H, white)
    # freestanding white walls inside, set back from the glass, with the works on them
    area('sky-bounce', (W / 2, D / 2, H - 0.05), (W - 1, D - 1), 140, 6000)
    stands = [] if SURF['on'] else ([(W * 0.3, D * 0.45), (W * 0.65, D * 0.55)] if v != 'small' else [(W * 0.45, D * 0.4)])
    shell = _fake_room(0, 0, W, D, H); shell.glass = sides; SHELLS.append(shell)
    for i, (sx, sy) in enumerate(stands):
        box('stand', sx - 2.0, sy - 0.12, 0, sx + 2.0, sy + 0.12, 3.2, white)
        ws = works_of('claude-monet')[i * 2:(i + 1) * 2] or works_of('claude-monet', n=1)
        hang_wall(ws[:1], (sx - 2.0, sy - 0.122, 0), (sx + 2.0, sy - 0.122, 0), (0, -1, 0), ceiling=H, lux=220)
    if 'w' not in sides:
        fill(Room.__new__(Room) if False else _fake_room(0, 0, W, D, H), works_of('claude-monet')[4:6], walls='w', ceiling=H, light=False)
    return camera((W - 1.2, 0.9, EYE), (W * 0.3, D - 0.5, 1.8), lens=17)


def _fake_room(x0, y0, x1, y1, h):
    r = Room.__new__(Room); r.x0, r.y0, r.x1, r.y1, r.h, r.doors, r.windows = x0, y0, x1, y1, h, [], []
    return r


def japanese(v):
    hinoki = mat('hinoki', tex='hinoki_planks', scale=1.2, rough_mul=0.9, bump=0.3)
    plaster = mat('earth-plaster', tex='clay_plaster', scale=1.6, tint=(0.72, 0.65, 0.52), tint_mix=0.35, bump=0.4)
    tatami = mat('tatami', tex='tatami_mat', scale=0.9, bump=0.5)
    cedar = mat('cedar', tex='japanese_cedar_planks', scale=1.0, bump=0.3)
    world(hdri=hdri('japanese-garden'), strength=GARDEN_STRENGTH * 0.8, rot=JP_ROT)
    W, D, H = {'small': (3.6, 3.6, 2.5), 'large': (12, 4.5, 3.0)}.get(v, (9, 6, 3.2))
    r = Room(0, 0, W, D, H, tatami, plaster, cedar, doors=[('e', D / 2, 0.9, 1.9)], windows=[('n', W / 2, W - 0.4, 0.0, H - 0.4)], shadow_gap=False)
    heri = mat('heri', (0.02, 0.025, 0.02), 0.85, wear=0.2)    # the black cloth edging that outlines every tatami mat
    for k in range(1, int(W / 0.9) + 1):
        for m in range(int(D / 1.8) + 1):
            y0_, y1_ = m * 1.8, min(D, (m + 1) * 1.8)
            if y1_ - y0_ > 0.05: box('heri', k * 0.9 - 0.007 if k * 0.9 < W else W - 0.014, y0_, 0, k * 0.9 + 0.007 if k * 0.9 < W else W, y1_, 0.003, heri)
    for m in range(1, int(D / 1.8) + 1):
        if m * 1.8 < D: box('heri', 0, m * 1.8 - 0.007, 0, W, m * 1.8 + 0.007, 0.003, heri)
    # shoji along the garden side: paper in a fine lattice
    sx0, sx1 = 0.2, W - 0.2
    o0, o1 = W / 2 - min(0.9, W * 0.22), W / 2 + min(0.9, W * 0.22)       # the panels slid aside: the garden
    for a0, a1 in ((sx0, o0), (o1, sx1)):
        mesh('shoji.paper', [(a0, D + 0.01, 0.0), (a1, D + 0.01, 0.0), (a1, D + 0.01, H - 0.4), (a0, D + 0.01, H - 0.4)], [(0, 1, 2, 3)], paper_screen())
        k = max(1, int((a1 - a0) / 0.3))
        for i in range(k + 1):
            x = a0 + i * (a1 - a0) / k; box('kumiko', x - 0.008, D - 0.01, 0, x + 0.008, D + 0.005, H - 0.4, hinoki)
        for z in [0.35 * j for j in range(1, int((H - 0.4) / 0.35) + 1)]:
            box('kumiko', a0, D - 0.01, z - 0.008, a1, D + 0.005, z + 0.008, hinoki)
        box('shoji.frame', a0, D - 0.015, 0, a0 + 0.03, D + 0.01, H - 0.4, hinoki); box('shoji.frame', a1 - 0.03, D - 0.015, 0, a1, D + 0.01, H - 0.4, hinoki)
    box('engawa', -0.3, D + 0.02, -0.06, W + 0.3, D + 1.3, -0.02, mat('engawa', tex='hinoki_planks', scale=1.2, tint=(0.36, 0.27, 0.18), tint_mix=0.5, rough_mul=0.8, bump=0.3))
    box('ground', -30, D + 1.3, -0.6, W + 30, D + 40, -0.55, mat('garden-ground', tex='forest_ground_04', scale=3.0, bump=0.6))
    portal((W / 2, D + 0.05, (H - 0.4) / 2), (o1 - o0, H - 0.4), rot=(math.radians(-90), 0, 0))
    box('kamoi', 0, D - 0.06, H - 0.45, W, D, H - 0.38, hinoki)
    area('garden.light', (W / 2, D + 1.0, (H - 0.4) / 2), (W - 0.4, H - 0.6), 120, 6200, rot=(math.radians(-90), 0, 0), spread=150)
    # a tokonoma on the west wall: a raised floor, a hanging scroll (a print), a vase
    box('tokonoma.floor', 0, D * 0.25, 0, 0.75, D * 0.75, 0.12, cedar, bevel=0.004)
    box('tokonoma.post', 0.7, D * 0.75 - 0.06, 0, 0.78, D * 0.75 + 0.02, H, mat('toko-post', tex='japanese_cedar_bark', scale=0.8, bump=0.8))
    ws = works_of('katsushika-hokusai')
    hang_wall(ws[:1], (0.002, D * 0.72, 0), (0.002, D * 0.28, 0), (1, 0, 0), z=1.4, ceiling=H, lux=50, spot_kelvin=2800, frame=mat('frame-black', (0.03, 0.03, 0.03), 0.4))
    cylinder('vase', (0.38, D * 0.32), 0.1, 0.12, 0.42, mat('ceramic', (0.32, 0.24, 0.18), 0.25, coat=0.6))
    if v != 'small':
        hang_wall(ws[1:4], (W - 0.4, 0.002, 0), (1.2, 0.002, 0), (0, 1, 0), z=1.35, ceiling=H, lux=50, spot_kelvin=2800, frame=mat('frame-black', (0.03, 0.03, 0.03), 0.4))
    return camera((W - 0.5, 0.5, 1.2 if v == 'small' else EYE), (0.4, D * 0.6, 1.2), lens=16)


HDRIS = {'garden': 'killesberg_park', 'lebombo': 'lebombo', 'japanese-garden': 'ninomaru_teien',
         'street': 'urban_street_02', 'city': 'urban_street_03', 'overcast': 'kloofendal_overcast_puresky'}


def hdri(key, res=None):
    res = res or os.environ.get('ROOMS_HDRI', '8k')
    asset = HDRIS[key]; d = os.path.join(CACHE, 'hdri'); os.makedirs(d, exist_ok=True)
    p = os.path.join(d, f'{asset}_{res}.hdr')
    if not os.path.exists(p):
        files = json.loads(urllib.request.urlopen(urllib.request.Request(f'https://api.polyhaven.com/files/{asset}', headers=UA), timeout=60).read())
        url = files['hdri'][res]['hdr']['url']
        open(p, 'wb').write(urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=300).read())
    return p


TYPES = {
    'white-cube': (white_cube, 'White cube', {'small': 'Project room, 6 × 5 m', 'large': 'Hall under a skylight, 15 × 10 m', '': 'Three rooms in a row, 9 × 7 m each'}),
    'loft': (loft, 'Industrial loft', {'small': 'Loft with columns, 20 × 12 m', 'large': 'Long nave, 40 × 10 m', '': 'Two bays and a free wall, 24 × 12 m'}),
    'skylit-hall': (skylit_hall, 'Skylit museum hall', {'small': 'Skylit square, 10 × 10 m', 'large': 'Three vaults, 24 × 7 m', '': 'Vaulted hall, 20 × 8 m'}),
    'salon': (salon, 'Salon', {'small': 'One salon, 6 × 5 m', 'large': 'Long gallery with lanterns, 16 × 5.5 m', '': 'Three rooms en enfilade, 7 × 6 m each'}),
    'concrete': (concrete, 'Raw concrete', {'small': 'Under a daylight ceiling, 8 × 8 m', 'large': 'Tall volume with a slot window, 8 × 8 × 6 m', '': 'Two rooms through a slit, 9 × 8 m each'}),
    'studio': (studio, 'Artist studio, north light', {'small': 'Small studio, 5 × 4 m', 'large': 'Sawtooth studio, 10 × 7 m', '': 'Studio with a tall window, 8 × 6 m'}),
    'apartment': (apartment, "Collector's home", {'small': 'Studio flat, 5 × 4.5 m', 'large': 'Large living room, 9 × 6 m', '': 'Living room, 7 × 5 m'}),
    'black-box': (black_box, 'Black box', {'small': 'Dark cell, 8 × 6 m', 'large': 'Round room, 12 m across', '': 'Projection hall, 14 × 10 m'}),
    'glass-pavilion': (glass_pavilion, 'Glass pavilion', {'small': 'Pavilion with a glass wall, 10 × 8 m', 'large': 'Glass hall, 24 × 16 m', '': 'Gallery with a glass end, 14 × 9 m'}),
    'japanese': (japanese, 'Japanese room', {'small': 'Tea room, 3.6 × 3.6 m', 'large': 'Long engawa room, 12 × 4.5 m', '': 'Gallery with a tokonoma, 9 × 6 m'}),
}


def surfaces(slug, o, label):
    """The empty room's six surfaces, each photographed square on with the room's own light, for the app's viewer
    (space.js), which builds the room from them and hangs an artist's works on its walls. Coordinates as the app's:
    x from the west wall, z from the north wall, walls in its walking order (wall-x1, the east wall, has the door)."""
    if len(SHELLS) != 1: print(f'{slug}: not one room, no surfaces'); return
    r = SHELLS[0]; s = bpy.context.scene
    W, D, H = r.x1 - r.x0, r.y1 - r.y0, r.h
    loose = ('table', 'trestle', 'sofa', 'cushion', 'rug', 'lamp', 'bench', 'stand', 'tokonoma', 'vase', 'partition', 'column', 'label')
    for ob in bpy.data.objects:      # the lights' lenses and the furniture are not part of a surface's picture (their shadows are)
        if ob.type == 'LIGHT' or ob.name.split('.')[0] in loose: ob.visible_camera = False
    try: s.use_nodes = False            # no lens: a surface is not a photograph's frame
    except Exception: pass
    out = os.path.join(o['out'], 'surfaces', slug); os.makedirs(out, exist_ok=True)
    ppm = int(o.get('ppm', 110))
    s.cycles.samples = int(o.get('surface_samples', 128))
    cam = bpy.data.cameras.new('surface'); cam.type = 'ORTHO'
    ob = bpy.data.objects.new('surface', cam); bpy.context.collection.objects.link(ob); s.camera = ob
    def shoot(name, pos, rot, w, h, clip, dist=None):
        # a wall: a perspective camera framing exactly the wall (parallel to it, so the wall keeps its scale) shows
        # through a window what a visitor in the room would see; the floor and the ceiling: straight down and up
        k = min(1.0, 4096 / max(w * ppm, h * ppm))
        s.render.resolution_x, s.render.resolution_y = max(16, round(w * ppm * k)), max(16, round(h * ppm * k))
        cam.sensor_fit = 'HORIZONTAL' if w >= h else 'VERTICAL'
        if dist:
            cam.type = 'PERSP'; cam.sensor_width = 36; cam.lens = 36 * dist / max(w, h)
        else:
            cam.type = 'ORTHO'; cam.ortho_scale = max(w, h)
        cam.clip_start, cam.clip_end = clip
        ob.location = pos; ob.rotation_euler = rot
        s.render.filepath = os.path.join(out, name + '.jpg')
        print(f'  {name}: {s.render.resolution_x}x{s.render.resolution_y}', flush=True)
        bpy.ops.render.render(write_still=True)
    cx, cy = (r.x0 + r.x1) / 2, (r.y0 + r.y1) / 2
    # walls, from the far side of the room, seeing only the last 30 cm before the wall
    shoot('wall-z0', (cx, r.y0 + 0.05, H / 2), (math.pi / 2, 0, 0), W, H, (D - 0.17, D + 0.5), D - 0.05)                  # north
    shoot('wall-x0', (r.x1 - 0.05, cy, H / 2), (math.pi / 2, 0, math.pi / 2), D, H, (W - 0.17, W + 0.5), W - 0.05)       # west
    shoot('wall-z1', (cx, r.y1 - 0.05, H / 2), (math.pi / 2, 0, math.pi), W, H, (D - 0.17, D + 0.5), D - 0.05)           # south
    shoot('wall-x1', (r.x0 + 0.05, cy, H / 2), (math.pi / 2, 0, -math.pi / 2), D, H, (W - 0.17, W + 0.5), W - 0.05)      # east
    shoot('floor', (cx, cy, H - 0.02), (0, 0, 0), W, D, (H - 0.04, H + 0.2))
    shoot('ceiling', (cx, cy, 0.02), (math.pi, 0, 0), W, D, (H - 0.4, 60))
    # what the app needs besides: the size, the door, and where no work can hang (windows, glass, doors)
    def a_of(wall, c):
        return {'n': c - r.x0, 'w': c - r.y0, 's': r.x1 - c, 'e': r.y1 - c}[wall]
    name = {'n': 'wall-z0', 'w': 'wall-x0', 's': 'wall-z1', 'e': 'wall-x1'}
    blocks, door = {v: [] for v in name.values()}, None
    for wall, c, wd, ht in getattr(r, 'doors', []) or []:
        a = a_of(wall, c); blocks[name[wall]].append([round(a - wd / 2, 3), round(a + wd / 2, 3)])
        if wall == 'e' and door is None: door = {'from': round(a - wd / 2, 3), 'to': round(a + wd / 2, 3), 'height': ht}
    for wall, c, wd, z0, z1 in getattr(r, 'windows', []) or []:
        a = a_of(wall, c); blocks[name[wall]].append([round(a - wd / 2, 3), round(a + wd / 2, 3)])
    for wall in getattr(r, 'glass', ''):
        blocks[name[wall]].append([0, round(W if wall in 'ns' else D, 3)])
    meta = {'slug': slug, 'type': o['type'], 'label': label, 'w': round(W, 3), 'd': round(D, 3), 'h': round(H, 3),
            'door': door, 'blocks': {k: v for k, v in blocks.items() if v}, 'light': LIGHTING.get(o['type'], 'spots'),
            'floorReflect': REFLECT.get(o['type'], [0.04, 0.18]), 'ppm': ppm}
    json.dump(meta, open(os.path.join(out, 'room.json'), 'w'), indent=1)


# how a room is lit, for the light the app adds round each work; how much its floor reflects (near, low angle)
LIGHTING = {'white-cube': 'spots', 'loft': 'spots', 'salon': 'narrow', 'black-box': 'narrow', 'apartment': 'spots',
            'skylit-hall': 'daylight', 'concrete': 'daylight', 'studio': 'daylight', 'glass-pavilion': 'daylight', 'japanese': 'daylight'}
REFLECT = {'white-cube': [0.06, 0.26], 'black-box': [0.08, 0.34], 'glass-pavilion': [0.06, 0.28], 'concrete': [0.04, 0.18],
           'loft': [0.03, 0.14], 'skylit-hall': [0.03, 0.14], 'salon': [0.03, 0.14], 'apartment': [0.03, 0.14],
           'studio': [0.0, 0.0], 'japanese': [0.0, 0.0]}


def main():
    o = args()
    os.makedirs(o['out'], exist_ok=True)
    build, name, variants = TYPES[o['type']]
    todo = [o['variant']] if o['variant'] != '' or '--variant' in sys.argv else list(variants)
    if o['variant'] == 'all': todo = list(variants)
    SURF['on'] = o['surfaces']
    for v in todo:
        MATS.clear(); NORMAL.clear(); SHELLS.clear()
        s = reset(o)
        build(v)
        s.view_settings.exposure = EXPOSURE.get((o['type'], v), EXPOSURE.get(o['type'], 0.0))
        try:
            s.view_settings.use_white_balance = True
            s.view_settings.white_balance_temperature = BALANCE.get(o['type'], 4300)
        except Exception as e: print('no white balance:', e)
        slug = f'{o["type"]}{"-" + v if v else ""}'
        if o['surfaces']:
            surfaces(slug, o, variants[v]); continue
        s.render.filepath = os.path.join(o['out'], slug + '.jpg')
        print(f'rendering {slug}: {name}, {variants[v]}', flush=True)
        bpy.ops.render.render(write_still=True)
        if o['blend']: bpy.ops.wm.save_as_mainfile(filepath=os.path.join(o['out'], slug + '.blend'))
        meta = os.path.join(o['out'], 'rooms.json')
        all_ = json.load(open(meta)) if os.path.exists(meta) else {}
        all_[slug] = {'type': o['type'], 'name': name, 'variant': v or 'medium', 'label': variants[v], 'image': slug + '.jpg'}
        json.dump(all_, open(meta, 'w'), indent=1)


EXPOSURE = {'studio': 0.0}
JP_ROT = float(os.environ.get('JP_ROT', '0'))
GARDEN_STRENGTH = float(os.environ.get('GARDEN_STRENGTH', '3'))
GARDEN_ROT = float(os.environ.get('GARDEN_ROT', '200'))
STREET_ROT = float(os.environ.get('STREET_ROT', '90'))
WIN_STRENGTH = float(os.environ.get('WIN_STRENGTH', '4'))
# the white point a photographer would set: warm museum light (3000 K spots) a little warm, daylight rooms neutral
BALANCE = {'white-cube': 3800, 'salon': 4300, 'black-box': 3900, 'apartment': 5200, 'loft': 6800, 'skylit-hall': 4800,
           'concrete': 6800, 'studio': 7000, 'glass-pavilion': 6300, 'japanese': 6000}

if __name__ == '__main__':
    main()
