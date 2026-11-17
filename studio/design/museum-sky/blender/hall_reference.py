# A path-traced reference of the museum "Under One Sky", built from the same plan as the app (SKY_PLAN in studio/app/space/synth.js).
# Why: it shows what baked, physically lit surfaces look like next to what the app draws now (the target of ROADMAP item 9), and it is the
# seed of the Blender-authored shell (bake lightmaps from this scene, export a GLB the viewer loads).
#   blender -b --python studio/design/museum-sky/blender/hall_reference.py -- OUT.png [hour] [samples] [view]
#   views: start | square | ritual;  exposure: argument 5 (default -2.5; -5 gives the picture in ref-start-14h.png, 24 samples, ~50 s on this PC)
import bpy, bmesh, math, sys, numpy as np
from mathutils import Vector

args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUT = args[0] if args else '/tmp/hall.png'
HOUR = float(args[1]) if len(args) > 1 else 14.0
SAMPLES = int(args[2]) if len(args) > 2 else 48
VIEW = args[3] if len(args) > 3 else 'start'

HX, HZ, HH = 96.0, 72.0, 14.0
HOUSES = [(41, 21, 270, 4.4), (52, 18.5, 273, 4.0), (31, 19.5, 268, 4.6), (63, 20.5, 272, 5.4), (78, 26, 2, 4.2), (77.5, 44, -3, 4.8), (32, 53, 92, 4.0), (64, 54.5, 88, 6.0), (79, 60, 0, 4.4)]
COLS = [(0.55, 0.62, 0.3), (0.74, 0.27, 0.15), (0.15, 0.55, 0.38), (0.74, 0.15, 0.2), (0.18, 0.45, 0.75), (0.8, 0.55, 0.12), (0.45, 0.2, 0.6), (0.2, 0.2, 0.2), (0.74, 0.1, 0.17)]
PIERS = [(29, 26), (70, 24), (29, 48), (70, 48), (48, 26), (48, 48)]
POOL = (40, 30, 60, 38)
RW, RD, VD, MOUTH, DOOR_H = 8.0, 6.0, 1.8, 3.2, 3.3

bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
sc.render.engine = 'CYCLES'
sc.cycles.samples = SAMPLES
sc.cycles.use_denoising = True
try:
    sc.cycles.denoiser = 'OPENIMAGEDENOISE'
except Exception:
    pass
sc.cycles.max_bounces = 6
sc.view_settings.exposure = float(args[4]) if len(args) > 4 else -2.5     # (Nishita's sun is far brighter than a camera's exposure: pull it down)
sc.render.resolution_x, sc.render.resolution_y = 1080, 900
sc.render.image_settings.file_format = 'PNG'
sc.view_settings.view_transform = 'AgX' if 'AgX' in [i.identifier for i in sc.view_settings.bl_rna.properties['view_transform'].enum_items] else 'Standard'

def mat(name, color, rough=0.6, metal=0.0, emit=None):
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes.get('Principled BSDF')
    b.inputs['Base Color'].default_value = (*color, 1)
    b.inputs['Roughness'].default_value = rough
    b.inputs['Metallic'].default_value = metal
    if emit:
        b.inputs['Emission Color'].default_value = (*emit, 1); b.inputs['Emission Strength'].default_value = 2.0
    return m

def box(name, cx, cy, cz, sx, sy, sz, m, rot=0.0):
    bpy.ops.mesh.primitive_cube_add(size=1, location=(cx, cy, cz))
    o = bpy.context.active_object; o.name = name; o.scale = (sx, sy, sz); o.rotation_euler = (0, 0, rot); o.data.materials.append(m)
    return o

plaster = mat('plaster', (0.86, 0.85, 0.82), 0.85)
concrete = mat('concrete', (0.55, 0.54, 0.52), 0.9)
terrazzo = mat('terrazzo', (0.74, 0.72, 0.68), 0.25)
frame = mat('frame', (0.05, 0.055, 0.06), 0.4, 0.6)
lawn = mat('lawn', (0.28, 0.4, 0.15), 1.0)
oak = mat('oak', (0.55, 0.38, 0.2), 0.5)

# floor and lawn
box('floor', HX / 2, HZ / 2, -0.02, HX, HZ, 0.04, terrazzo)
box('lawn', HX / 2, HZ / 2, -0.15, 600, 600, 0.1, lawn)
# the pool
px0, pz0, px1, pz1 = POOL
water = mat('water', (0.35, 0.5, 0.55), 0.02, 0.0)
box('pool', (px0 + px1) / 2, (pz0 + pz1) / 2, -0.04, px1 - px0, pz1 - pz0, 0.05, water)

# the roof: a slab with round openings (an alpha mask from a numpy image: white = slab, black = open)
W, H = 1536, 1152
yy, xx = np.mgrid[0:H, 0:W]
mask = np.ones((H, W), dtype=np.float32)
for i in range(int(HX // 4)):
    for j in range(int(HZ // 4)):
        r = ((1.05 if (i + j) % 2 == 0 else 0.6) * 1.35) * (W / HX)
        cx, cz = (2 + i * 4) * W / HX, (2 + j * 4) * H / HZ
        mask[(xx - cx) ** 2 + (yy - cz) ** 2 < r * r] = 0.0
img = bpy.data.images.new('roofmask', W, H, alpha=False)
px = np.zeros((H, W, 4), dtype=np.float32); px[..., 0] = px[..., 1] = px[..., 2] = mask[::-1]; px[..., 3] = 1
img.pixels.foreach_set(px.ravel()); img.update(); img.pack(); img.colorspace_settings.name = 'Non-Color'
roof_m = bpy.data.materials.new('roof'); roof_m.use_nodes = True
nt = roof_m.node_tree; nt.nodes.clear()
tex = nt.nodes.new('ShaderNodeTexImage'); tex.image = img; tex.interpolation = 'Closest'
diff = nt.nodes.new('ShaderNodeBsdfDiffuse'); diff.inputs['Color'].default_value = (0.88, 0.87, 0.84, 1)
tr = nt.nodes.new('ShaderNodeBsdfTransparent'); mix = nt.nodes.new('ShaderNodeMixShader'); out = nt.nodes.new('ShaderNodeOutputMaterial')
nt.links.new(tex.outputs['Color'], mix.inputs['Fac']); nt.links.new(tr.outputs['BSDF'], mix.inputs[1]); nt.links.new(diff.outputs['BSDF'], mix.inputs[2]); nt.links.new(mix.outputs['Shader'], out.inputs['Surface'])
bpy.ops.mesh.primitive_plane_add(size=1, location=(HX / 2, HZ / 2, HH)); roof = bpy.context.active_object; roof.scale = (HX, HZ, 1); roof.data.materials.append(roof_m)
roof.name = 'roof'

# glass walls: only the frames (mullions every 1.9 m, two transoms): the glass itself adds little to a still reference
for k in range(0, int(HX / 1.9) + 1):
    for yv in (0, HZ):
        box('mull', k * 1.9, yv, HH / 2, 0.1, 0.1, HH, frame)
for k in range(0, int(HZ / 1.9) + 1):
    for xv in (0, HX):
        box('mull', xv, k * 1.9, HH / 2, 0.1, 0.1, HH, frame)
for zv in (4.2, 8.7, HH):
    box('tx', HX / 2, 0, zv, HX, 0.1, 0.1, frame); box('tx', HX / 2, HZ, zv, HX, 0.1, 0.1, frame); box('ty', 0, HZ / 2, zv, 0.1, HZ, 0.1, frame); box('ty', HX, HZ / 2, zv, 0.1, HZ, 0.1, frame)

# piers: board-formed concrete
for k, (x, z) in enumerate(PIERS):
    box(f'pier{k}', x, z, HH / 2, 1.4, 1.4, HH, concrete)

# the houses (8 x 6 m rooms with a porch of the show's colour), oriented on their door
for k, (dx, dz, deg, rh) in enumerate(HOUSES):
    d = math.radians(deg); o = Vector((math.cos(d), math.sin(d))); R = Vector((-o.y, o.x)); door = Vector((dx, dz))
    col = mat(f'door{k}', COLS[k % len(COLS)], 0.55)
    def P(a, b):
        p = door + R * a + o * b; return p.x, p.y
    def seg(a, b, la, lb, z0, z1, m):                      # a box centred at (a, b) in the house frame, la along the lateral, lb along the depth
        x, y = P(a, b); box('h', x, y, (z0 + z1) / 2, lb, la, z1 - z0, m, d)
    t = 0.25
    seg(-RW / 2 - t / 2, VD + RD / 2, t, RD + t, 0, rh, plaster)       # left wall
    seg(RW / 2 + t / 2, VD + RD / 2, t, RD + t, 0, rh, plaster)        # right wall
    seg(0, VD + RD + t / 2, RW + 2 * t, t, 0, rh, plaster)             # back wall
    seg(-(RW / 2 + MOUTH / 2) / 2 - 0.0, VD, RW / 2 - MOUTH / 2, t, 0, rh, plaster)   # front wall, left of the way in
    seg((RW / 2 + MOUTH / 2) / 2, VD, RW / 2 - MOUTH / 2, t, 0, rh, plaster)          # right of it
    seg(0, VD, MOUTH, t, DOOR_H, rh, plaster)                          # above the way in
    seg(-MOUTH / 2 - 0.1, VD / 2, 0.2, VD, 0, DOOR_H, col); seg(MOUTH / 2 + 0.1, VD / 2, 0.2, VD, 0, DOOR_H, col); seg(0, VD / 2, MOUTH + 0.4, VD, DOOR_H, DOOR_H + 0.2, col)   # the porch
    seg(0, VD + RD / 2, RW, RD, rh, rh + 0.15, plaster)                # ceiling
    seg(0, VD + RD / 2, RW, RD, 0.0, 0.03, oak if k % 3 == 0 else terrazzo)   # its floor

# benches round the pool
for (x, z, rot) in [((px0 + px1) / 2, pz1 + 2.2, 0), ((px0 + px1) / 2, pz0 - 2.2, 0), (px0 - 2.2, (pz0 + pz1) / 2, math.pi / 2), (px1 + 2.2, (pz0 + pz1) / 2, math.pi / 2)]:
    box('bench', x, z, 0.42, 2.2, 0.46, 0.06, oak, rot)
    for s in (-0.85, 0.85):
        c, sn = math.cos(rot), math.sin(rot)
        box('leg', x + c * s, z + sn * s, 0.2, 0.1, 0.4, 0.4, concrete, rot)

# the sky: Nishita, the sun from the hour (the same curve as the app's outdoors.js)
elev = 52 * math.sin(math.pi * (HOUR - 6.5) / 11) if 6.5 <= HOUR <= 17.5 else -10
az = math.pi / 2 + math.pi * (HOUR - 6.5) / 11
world = bpy.data.worlds.new('sky'); sc.world = world; world.use_nodes = True
wn = world.node_tree.nodes; wl = world.node_tree.links
sky = wn.new('ShaderNodeTexSky')
for t in ('MULTIPLE_SCATTERING', 'SINGLE_SCATTERING', 'NISHITA', 'HOSEK_WILKIE'):
    try:
        sky.sky_type = t; break
    except Exception:
        continue
sky.sun_elevation = math.radians(max(elev, 1.0)); sky.sun_rotation = az
try:
    sky.sun_size = math.radians(1.2)
except Exception:
    pass
bg = wn.get('Background'); wl.new(sky.outputs['Color'], bg.inputs['Color']); bg.inputs['Strength'].default_value = 1.0

# the camera
cam_d = bpy.data.cameras.new('cam'); cam_d.lens = 22
cam = bpy.data.objects.new('cam', cam_d); sc.collection.objects.link(cam); sc.camera = cam
VIEWS = {'start': ((48, 66.5, 1.6), (48, 34, 3.2)), 'square': ((44, 52, 1.6), (41, 22, 2.2)), 'ritual': ((70, 58, 1.6), (80, 60, 1.8))}
eye, look = VIEWS.get(VIEW, VIEWS['start'])
cam.location = eye
cam.rotation_euler = (Vector(look) - Vector(eye)).to_track_quat('-Z', 'Y').to_euler()
sc.render.filepath = OUT
bpy.ops.render.render(write_still=True)
print('RENDERED', OUT)
