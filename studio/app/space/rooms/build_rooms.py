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
    o = dict(type='white-cube', variant='', out=os.path.join(ROOT, 'studio', 'design', 'virtual-spaces', 'renders'), samples=192, size='1600x1000', blend=False)
    i = 0
    while i < len(a):
        k = a[i].lstrip('-')
        if k == 'blend': o['blend'] = True; i += 1; continue
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
    s.cycles.max_bounces = 8; s.cycles.diffuse_bounces = 5; s.cycles.glossy_bounces = 3; s.cycles.transmission_bounces = 6
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


def image_node(nt, path, colour=True, scale=1.0, box=True):
    tex = nt.nodes.new('ShaderNodeTexImage'); tex.image = bpy.data.images.load(path, check_existing=True)
    if not colour: tex.image.colorspace_settings.name = 'Non-Color'
    if box: tex.projection = 'BOX'; tex.projection_blend = 0.25
    tc = nt.nodes.new('ShaderNodeTexCoord'); mp = nt.nodes.new('ShaderNodeMapping')
    mp.inputs['Scale'].default_value = (1 / scale, 1 / scale, 1 / scale)
    nt.links.new(tc.outputs['Object'], mp.inputs[0]); nt.links.new(mp.outputs[0], tex.inputs[0])
    return tex


MATS = {}


def mat(name, base=(0.8, 0.8, 0.8), rough=0.6, tex=None, scale=1.0, tint=None, tint_mix=0.0, metal=0.0, bump=1.0, rough_mul=1.0, spec=0.5, coat=0.0):
    """A Principled material; with a Poly Haven texture laid on in world scale (scale = metres per tile)."""
    if name in MATS: return MATS[name]
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
    MATS[name] = m
    return m


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
    g.inputs['Transmission Weight'].default_value = 1.0; g.inputs['Roughness'].default_value = 0.0; g.inputs['IOR'].default_value = 1.5
    g.inputs['Base Color'].default_value = (*tint, 1)
    tr = nt.nodes.new('ShaderNodeBsdfTransparent'); tr.inputs[0].default_value = (*tint, 1)
    lp = nt.nodes.new('ShaderNodeLightPath'); mix = nt.nodes.new('ShaderNodeMixShader')
    nt.links.new(lp.outputs['Is Shadow Ray'], mix.inputs[0]); nt.links.new(g.outputs[0], mix.inputs[1]); nt.links.new(tr.outputs[0], mix.inputs[2])
    nt.links.new(mix.outputs[0], out.inputs[0])
    MATS[name] = m
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
        if light:
            H = w['size'][1] / 100
            z = max(z, H / 2 + 0.35)
            off = (ceiling - EYE) * 0.577 + (0.3 if H > 1.2 else 0)
            pos = c + n * off; pos.z = ceiling - 0.12
            dist = (Vector((c.x, c.y, z)) - pos).length
            paper = 'paper' in w['medium'].lower() or w['artist'] in ('victor-hugo', 'katsushika-hokusai')
            need = max(W, H) * 1.7
            b = beam or min(60, max(14, math.degrees(2 * math.atan(need / 2 / dist))))
            spot(f'spot.{w["slug"]}', tuple(pos), (c.x, c.y, z), 50 if paper else lux, b, spot_kelvin, blend=0.8)
            track_head(pos, Vector((c.x, c.y, z)))
        placed.append((w, c))
        x += W + space
    return placed


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
    """The washers' even light on a gallery's walls (and the bounce off its ceiling), as one soft emitter."""
    area(f'ambient', ((r.x0 + r.x1) / 2, (r.y0 + r.y1) / 2, r.h - 0.06), (r.x1 - r.x0 - 0.4, r.y1 - r.y0 - 0.4), lux, kelvin)


def camera(pos, look, lens=20, shift=(0, 0)):
    cam = bpy.data.cameras.new('cam'); cam.lens = lens; cam.sensor_width = 36; cam.shift_x, cam.shift_y = shift
    ob = bpy.data.objects.new('cam', cam); bpy.context.collection.objects.link(ob)
    ob.location = pos; ob.rotation_euler = (Vector(look) - Vector(pos)).to_track_quat('-Z', 'Y').to_euler()
    bpy.context.scene.camera = ob
    return ob


# --- the ten kinds of room ------------------------------------------------------------------------------------------
# Each builder returns the camera's place; materials, light and works are its own.

def white_cube(v):
    plaster = mat('white-plaster', (0.83, 0.83, 0.81), 0.9, tex='painted_plaster_wall', scale=2.5, tint=(0.84, 0.835, 0.82), tint_mix=0.08, bump=0.25)
    floor = mat('polished-concrete', rough=0.35, tex='smooth_concrete_floor', scale=3.0, tint=(0.46, 0.46, 0.45), tint_mix=0.35, rough_mul=0.55, bump=0.2, coat=0.15)
    ceil = mat('ceiling-white', (0.8, 0.8, 0.79), 0.95)
    world()
    if v == 'small':           # a project room, 6 x 5 x 3.2
        r = Room(0, 0, 6, 5, 3.2, floor, plaster, ceil, doors=[('e', 1.2, 1.4, 2.4)])
        track(0.3, 5 - 1.0, 5.7, 5 - 1.0, 3.2); track(1.05, 0.3, 1.05, 4.7, 3.2)
        fill(r, works_of('henri-matisse')[1:] + works_of('vincent-van-gogh', n=3), walls='nws', ceiling=3.2)
        ambient(r, 120)
        return camera((5.6, 0.5, EYE), (1.2, 3.6, 1.45), lens=18)
    if v == 'large':           # a hall 15 x 10 x 5.5 with a north skylight strip
        r = Room(0, 0, 15, 10, 5.5, floor, plaster, ceil, doors=[('e', 2.0, 2.2, 3.0)], ceiling_open=(1.5, 7.2, 13.5, 8.4))
        mesh('diffuser', [(1.5, 7.2, 5.4), (13.5, 7.2, 5.4), (13.5, 8.4, 5.4), (1.5, 8.4, 5.4)], [(0, 1, 2, 3)], emission('skylight', 2.2, 6500))
        area('skylight', (7.5, 7.8, 5.38), (12, 1.2), 160, 6500)
        track(1, 2.6, 14, 2.6, 5.5)
        ambient(r, 80)
        fill(r, works_of('hilma-af-klint', n=3) + works_of('henri-matisse', n=3), walls='nw', ceiling=5.5, lux=180)
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
    return camera((1.2, 3.5, EYE), (26.5, 3.6, 1.5), lens=22)


def loft(v):
    brick = mat('painted-brick', tex='whitewashed_brick', scale=2.2, tint=(0.86, 0.85, 0.82), tint_mix=0.25, bump=0.6)
    floor = mat('worn-concrete', tex='worn_concrete_floor', scale=4.0, tint=(0.5, 0.5, 0.48), tint_mix=0.35, rough_mul=0.8, bump=0.2)
    steel = mat('steel', (0.08, 0.085, 0.09), 0.45, metal=0.8)
    ceil = mat('roof-white', (0.75, 0.75, 0.74), 0.9, tex='wood_planks', scale=3.0, tint=(0.8, 0.8, 0.78), tint_mix=0.15)
    world(sky={'kelvin': 6800}, strength=14.0)
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
    return camera((W - 1.2, 1.0, EYE), (W * 0.25, D * 0.7, 2.6), lens=17)


def skylit_hall(v):
    plaster = mat('lime-plaster', tex='white_plaster_rough_01', scale=2.0, tint=(0.82, 0.8, 0.76), tint_mix=0.15, bump=0.3)
    oak = mat('oak-floor', tex='oak_wood_planks', scale=2.4, rough_mul=0.75, bump=0.4, coat=0.1)
    vault = mat('vault', (0.82, 0.8, 0.77), 0.9, tex='white_plaster_rough_02', scale=3.0, tint=(0.84, 0.82, 0.78), tint_mix=0.1)
    world()
    if v == 'small':           # a skylit square, 10 x 10 x 5.5, a laylight ceiling
        r = Room(0, 0, 10, 10, 5.5, oak, plaster, vault, doors=[('e', 5, 2.2, 3.2)], ceiling_open=(2, 2, 8, 8))
        mesh('laylight', [(2, 2, 5.45), (8, 2, 5.45), (8, 8, 5.45), (2, 8, 5.45)], [(0, 1, 2, 3)], emission('laylight', 1.6, 6000))
        for i in range(1, 6):
            box('laylight.bar', 2 + i, 2, 5.42, 2 + i + 0.04, 8, 5.45, mat('bar', (0.7, 0.7, 0.68), 0.6))
        area('daylight', (5, 5, 5.4), (6, 6), 260, 6000)
        fill(r, works_of('vincent-van-gogh', n=6), walls='nsw', ceiling=5.5, lux=120)
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
    return camera((L - 1.0, D / 2 + 0.6, EYE), (2, D / 2 - 0.5, 2.2), lens=18)


def salon(v):
    red = mat('salon-red', tex='painted_plaster_wall', scale=2.0, tint=(0.24, 0.035, 0.045), tint_mix=0.15, bump=0.2)
    green = mat('salon-green', tex='painted_plaster_wall', scale=2.0, tint=(0.09, 0.17, 0.12), tint_mix=0.15, bump=0.2)
    parquet = mat('parquet', tex='herringbone_parquet', scale=1.6, rough_mul=0.7, coat=0.25, bump=0.3)
    ceil = mat('ceiling-cream', (0.82, 0.79, 0.72), 0.9)
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
        area('lantern.light', (cx, cy, r.h - 0.05), (lw, ld), 120, 5600)

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


def concrete(v):
    conc = mat('formwork-concrete', tex='concrete_wall_008', scale=2.4, tint=(0.56, 0.56, 0.54), tint_mix=0.45, rough_mul=1.0, bump=0.7)
    floor = mat('concrete-floor', tex='concrete_floor_02', scale=3.0, tint=(0.42, 0.42, 0.41), tint_mix=0.4, rough_mul=0.6, coat=0.1, bump=0.3)
    world()
    if v == 'large':           # a tall volume 8 x 8 x 6 with a slot window high in the wall
        world(sky={'kelvin': 6500}, strength=4.0)
        r = Room(0, 0, 8, 8, 6, floor, conc, conc, doors=[('e', 1.6, 1.4, 2.6)], windows=[('n', 4, 6.6, 4.9, 5.4)])
        mesh('slot.glass', [(0.7, 8.02, 4.9), (7.3, 8.02, 4.9), (7.3, 8.02, 5.4), (0.7, 8.02, 5.4)], [(0, 1, 2, 3)], glass())
        area('slot.sky', (4, 8.5, 5.15), (6.6, 0.5), 2600, 6500, rot=(math.radians(-90), 0, 0), spread=120)
        ambient(r, 35, 6000)
        fill(r, big('claude-monet', 3), walls='swn', ceiling=6, lux=140, beam=30)
        return camera((7.2, 0.7, EYE), (1.5, 6.5, 2.6), lens=17)
    if v == 'small':           # a square room 8 x 8 x 4.25 under a glass daylight ceiling (Bregenz)
        r = Room(0, 0, 8, 8, 4.25, floor, conc, conc, doors=[('e', 1.6, 1.4, 2.6)], ceiling_open=(0.3, 0.3, 7.7, 7.7))
        mesh('light-ceiling', [(0.3, 0.3, 4.24), (7.7, 0.3, 4.24), (7.7, 7.7, 4.24), (0.3, 7.7, 4.24)], [(0, 1, 2, 3)], emission('daylight-ceiling', 1.25, 6300))
        for i in range(1, 8): box('ceiling.joint', i - 0.01, 0.3, 4.22, i + 0.01, 7.7, 4.24, mat('joint', (0.4, 0.4, 0.4), 0.6))
        area('daylight', (4, 4, 4.2), (7.4, 7.4), 230, 6300)
        fill(r, big('claude-monet', 4), walls='nsw', ceiling=4.25, light=False)
        return camera((7.3, 0.7, EYE), (1.0, 6.0, 1.8), lens=18)
    rooms = [Room(0, 0, 9, 8, 4.5, floor, conc, conc, doors=[('e', 4, 1.0, 3.6)]), Room(9.25, 0, 18.25, 8, 4.5, floor, conc, conc, doors=[('w', 4, 1.0, 3.6)], skip='w')]
    for r in rooms:
        mesh('light-ceiling', [(r.x0 + 0.4, 0.4, 4.49), (r.x1 - 0.4, 0.4, 4.49), (r.x1 - 0.4, 7.6, 4.49), (r.x0 + 0.4, 7.6, 4.49)], [(0, 1, 2, 3)], emission('daylight-ceiling', 1.1, 6300))
        area('daylight', ((r.x0 + r.x1) / 2, 4, 4.45), (8.2, 7.2), 190, 6300)
    fill(rooms[0], big('claude-monet', 3), walls='nsw', ceiling=4.5, light=False)
    fill(rooms[1], works_of('hilma-af-klint', n=2), walls='ne', ceiling=4.5, light=False)
    return camera((0.8, 1.0, EYE), (16, 4.6, 1.9), lens=20)


def studio(v):
    brick = mat('limewash-brick', tex='whitewashed_brick', scale=2.0, tint=(0.88, 0.87, 0.84), tint_mix=0.3, bump=0.7)
    boards = mat('painted-boards', tex='old_wooden_floor_02' if True else '', scale=2.0, tint=(0.62, 0.6, 0.56), tint_mix=0.55, rough_mul=1.0, bump=0.5)
    ceil = mat('studio-ceiling', (0.82, 0.82, 0.8), 0.9)
    wood = mat('table-wood', tex='rough_pine_door', scale=1.2, bump=0.4)
    world(sky={'kelvin': 7000}, strength=0.9 if v != 'large' else 12.0)
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
        area('north-sky', (W / 2, D + 1.2, (0.9 + H - 0.2) / 2), (W * 0.7, H - 1.1), 420, 7000, rot=(math.radians(-90), 0, 0), spread=110)
    # a trestle table, works leaning on the wall, a stool
    tw = 2.2
    box('table.top', 0.8, 1.0, 0.86, 0.8 + tw, 1.9, 0.9, wood, bevel=0.005)
    for tx in (0.95, 0.8 + tw - 0.25):
        box('trestle', tx, 1.05, 0, tx + 0.05, 1.85, 0.86, wood)
    leaning = works_of('paula-moderson-becker') or works_of('paula-modersohn-becker')
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
    herring = mat('herringbone-oak', tex='herringbone_parquet', scale=1.4, rough_mul=0.7, coat=0.2, bump=0.3)
    ceil = mat('apt-ceiling', (0.84, 0.83, 0.8), 0.9)
    skirt = mat('skirting', (0.85, 0.84, 0.8), 0.5)
    linen = mat('sofa-linen', tex='rough_linen', scale=0.4, tint=(0.55, 0.5, 0.42), tint_mix=0.3)
    rug = mat('rug', tex='rough_linen', scale=0.6, tint=(0.62, 0.55, 0.45), tint_mix=0.5)
    world(hdri=hdri('lebombo'), strength=1.6, rot=60)
    W, D, H = {'small': (5, 4.5, 2.8), 'large': (9, 6, 3.2)}.get(v, (7, 5, 3.0))
    r = Room(0, 0, W, D, H, herring, walls, ceil, doors=[('e', 1.0, 0.9, 2.2)], windows=[('n', W * 0.62, 1.6, 0.6, H - 0.35)],
             base=(0.12, skirt), shadow_gap=False)
    mesh('window.glass', [(W * 0.62 - 0.8, D + 0.02, 0.6), (W * 0.62 + 0.8, D + 0.02, 0.6), (W * 0.62 + 0.8, D + 0.02, H - 0.35), (W * 0.62 - 0.8, D + 0.02, H - 0.35)], [(0, 1, 2, 3)], glass())
    box('window.frame', W * 0.62 - 0.03, D, 0.6, W * 0.62 + 0.03, D + 0.07, H - 0.35, skirt)
    area('window.day', (W * 0.62, D + 0.6, (0.6 + H - 0.35) / 2), (1.6, H - 0.95), 1100, 6000, rot=(math.radians(-90), 0, 0), spread=120)
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
    black = mat('black-wall', (0.025, 0.025, 0.027), 0.95, tex='painted_plaster_wall', scale=2.0, tint=(0.03, 0.03, 0.032), tint_mix=0.05, bump=0.15)
    floor = mat('dark-floor', tex='smooth_concrete_floor', scale=3.0, tint=(0.08, 0.08, 0.085), tint_mix=0.2, rough_mul=0.5, coat=0.2)
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
    if v == '':                # three projection walls: a work as projected light
        for (p, a, n, w) in (((W / 2, D - 0.01, 2.3), (-1, 0, 0), (0, -1, 0), WORKS['the-great-wave-off-kanagawa']), ((0.01, D / 2, 2.3), (0, -1, 0), (1, 0, 0), WORKS['the-starry-night'])):
            ww, hh = (6.0, 6.0 * w['size'][1] / w['size'][0])
            pm = bpy.data.materials.new('projection.' + w['slug']); pm.use_nodes = True; nt = pm.node_tree; nt.nodes.clear()
            o = nt.nodes.new('ShaderNodeOutputMaterial'); e = nt.nodes.new('ShaderNodeEmission'); t = nt.nodes.new('ShaderNodeTexImage')
            t.image = bpy.data.images.load(os.path.join(APP, w['image']), check_existing=True); nt.links.new(t.outputs[0], e.inputs[0]); e.inputs[1].default_value = 1.4
            nt.links.new(e.outputs[0], o.inputs[0])
            q = quad('projection', p, a, ww, hh, pm, uv=True)
        return camera((W - 1.0, 1.0, EYE), (2.5, D - 2.0, 2.2), lens=17)
    fill(r, works_of('vincent-van-gogh', n=4), walls='nsw', ceiling=H, lux=170)
    return camera((W - 0.7, 0.8, EYE), (1.0, D - 1.5, 1.5), lens=17)


def glass_pavilion(v):
    granite = mat('granite', tex='granite_tile', scale=1.6, rough_mul=0.6, coat=0.15, bump=0.3)
    white = mat('pavilion-wall', (0.84, 0.84, 0.82), 0.9, tex='painted_plaster_wall', scale=2.5, tint=(0.85, 0.85, 0.83), tint_mix=0.06, bump=0.2)
    steel = mat('black-steel', (0.02, 0.02, 0.022), 0.4, metal=0.85)
    ceil = mat('pavilion-ceiling', (0.72, 0.72, 0.7), 0.85)
    world(hdri=hdri('garden'), strength=2.4, rot=120)
    W, D, H = {'small': (10, 8, 4), 'large': (24, 16, 5)}.get(v, (14, 9, 4.5))
    box('floor', -2, -2, -0.2, W + 2, D + 2, 0, granite)
    box('roof', -2, -2, H, W + 2, D + 2, H + 0.6, ceil)
    sides = 'nesw' if v == 'large' else ('n' if v == 'small' else 'n')
    # glass walls with black steel mullions every 2 m; solid white walls where there is no glass
    for wall, (p0, p1) in {'s': ((0, 0), (W, 0)), 'n': ((W, D), (0, D)), 'w': ((0, D), (0, 0)), 'e': ((W, 0), (W, D))}.items():
        if wall in sides:
            mesh('glass.' + wall, [(p0[0], p0[1], 0), (p1[0], p1[1], 0), (p1[0], p1[1], H), (p0[0], p0[1], H)], [(0, 1, 2, 3)], glass())
            L = math.dist(p0, p1); n = int(L // 2)
            for k in range(n + 1):
                t = k / n; x, y = p0[0] + (p1[0] - p0[0]) * t, p0[1] + (p1[1] - p0[1]) * t
                box('mullion', x - 0.04, y - 0.04, 0, x + 0.04, y + 0.04, H, steel)
        else:
            if wall in 'sn': box('wall.' + wall, min(p0[0], p1[0]), p0[1] - (0.25 if wall == 's' else 0), 0, max(p0[0], p1[0]), p0[1] + (0.25 if wall == 'n' else 0), H, white)
            else: box('wall.' + wall, p0[0] - (0.25 if wall == 'w' else 0), min(p0[1], p1[1]), 0, p0[0] + (0.25 if wall == 'e' else 0), max(p0[1], p1[1]), H, white)
    # freestanding white walls inside, set back from the glass, with the works on them
    area('sky-bounce', (W / 2, D / 2, H - 0.05), (W - 1, D - 1), 140, 6000)
    stands = [(W * 0.3, D * 0.45), (W * 0.65, D * 0.55)] if v != 'small' else [(W * 0.45, D * 0.4)]
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
    world(hdri=hdri('japanese-garden'), strength=0.8, rot=30)
    W, D, H = {'small': (3.6, 3.6, 2.5), 'large': (12, 4.5, 3.0)}.get(v, (9, 6, 3.2))
    r = Room(0, 0, W, D, H, tatami, plaster, cedar, doors=[('e', D / 2, 0.9, 1.9)], windows=[('n', W / 2, W - 0.4, 0.0, H - 0.4)], shadow_gap=False)
    # shoji along the garden side: paper in a fine lattice
    sx0, sx1 = 0.2, W - 0.2
    mesh('shoji.paper', [(sx0, D + 0.01, 0.0), (sx1, D + 0.01, 0.0), (sx1, D + 0.01, H - 0.4), (sx0, D + 0.01, H - 0.4)], [(0, 1, 2, 3)], paper_screen())
    k = int((sx1 - sx0) / 0.3)
    for i in range(k + 1):
        x = sx0 + i * (sx1 - sx0) / k; box('kumiko', x - 0.008, D - 0.01, 0, x + 0.008, D + 0.005, H - 0.4, hinoki)
    for z in [0.35 * j for j in range(1, int((H - 0.4) / 0.35) + 1)]:
        box('kumiko', sx0, D - 0.01, z - 0.008, sx1, D + 0.005, z + 0.008, hinoki)
    box('kamoi', 0, D - 0.06, H - 0.45, W, D, H - 0.38, hinoki)
    area('garden.light', (W / 2, D + 1.0, (H - 0.4) / 2), (W - 0.4, H - 0.6), 300, 6200, rot=(math.radians(-90), 0, 0), spread=150)
    # a tokonoma on the west wall: a raised floor, a hanging scroll (a print), a vase
    box('tokonoma.floor', 0, D * 0.25, 0, 0.75, D * 0.75, 0.12, cedar, bevel=0.004)
    box('tokonoma.post', 0.7, D * 0.75 - 0.06, 0, 0.78, D * 0.75 + 0.02, H, mat('toko-post', tex='japanese_cedar_bark', scale=0.8, bump=0.8))
    ws = works_of('katsushika-hokusai')
    hang_wall(ws[:1], (0.002, D * 0.72, 0), (0.002, D * 0.28, 0), (1, 0, 0), z=1.4, ceiling=H, lux=50, spot_kelvin=2800, frame=mat('frame-black', (0.03, 0.03, 0.03), 0.4))
    cylinder('vase', (0.38, D * 0.32), 0.1, 0.12, 0.42, mat('ceramic', (0.32, 0.24, 0.18), 0.25, coat=0.6))
    if v != 'small':
        hang_wall(ws[1:4], (W - 0.4, 0.002, 0), (1.2, 0.002, 0), (0, 1, 0), z=1.35, ceiling=H, lux=50, spot_kelvin=2800, frame=mat('frame-black', (0.03, 0.03, 0.03), 0.4))
    return camera((W - 0.5, 0.5, 1.2 if v == 'small' else EYE), (0.4, D * 0.6, 1.2), lens=16)


HDRIS = {'garden': 'symmetrical_garden_02', 'lebombo': 'lebombo', 'japanese-garden': 'chinese_garden'}


def hdri(key, res='2k'):
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


def main():
    o = args()
    os.makedirs(o['out'], exist_ok=True)
    build, name, variants = TYPES[o['type']]
    todo = [o['variant']] if o['variant'] != '' or '--variant' in sys.argv else list(variants)
    if o['variant'] == 'all': todo = list(variants)
    for v in todo:
        MATS.clear(); NORMAL.clear()
        s = reset(o)
        build(v)
        s.view_settings.exposure = EXPOSURE.get((o['type'], v), EXPOSURE.get(o['type'], 0.0))
        slug = f'{o["type"]}{"-" + v if v else ""}'
        s.render.filepath = os.path.join(o['out'], slug + '.jpg')
        print(f'rendering {slug}: {name}, {variants[v]}', flush=True)
        bpy.ops.render.render(write_still=True)
        if o['blend']: bpy.ops.wm.save_as_mainfile(filepath=os.path.join(o['out'], slug + '.blend'))
        meta = os.path.join(o['out'], 'rooms.json')
        all_ = json.load(open(meta)) if os.path.exists(meta) else {}
        all_[slug] = {'type': o['type'], 'name': name, 'variant': v or 'medium', 'label': variants[v], 'image': slug + '.jpg'}
        json.dump(all_, open(meta, 'w'), indent=1)


EXPOSURE = {'studio': -0.4}

if __name__ == '__main__':
    main()
