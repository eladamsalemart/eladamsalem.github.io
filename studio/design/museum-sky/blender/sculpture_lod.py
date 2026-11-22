# Distance levels for the museum's sculptures (ROADMAP 17): the 100k-face GLBs are decimated to 12k and 40k faces, with smooth normals.
#   blender -b --python studio/design/museum-sky/blender/sculpture_lod.py -- MODELS_DIR
import bpy, sys, glob, os
d = sys.argv[sys.argv.index('--') + 1]
for src in sorted(glob.glob(os.path.join(d, '*-100k.glb'))):
    for faces in (12000, 40000):
        bpy.ops.wm.read_factory_settings(use_empty=True)
        bpy.ops.import_scene.gltf(filepath=src)
        for o in [o for o in bpy.context.scene.objects if o.type == 'MESH']:
            bpy.context.view_layer.objects.active = o; o.select_set(True)
            bpy.ops.object.shade_smooth()
            bm = o.modifiers.new('dec', 'DECIMATE'); bm.ratio = min(1.0, faces / max(1, len(o.data.polygons))); bm.use_collapse_triangulate = True
            bpy.ops.object.modifier_apply(modifier='dec')
            print(os.path.basename(src), faces, '->', len(o.data.polygons))
        out = src.replace('-100k.glb', f'-{faces // 1000}k.glb')
        bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', export_normals=True, export_apply=True, export_yup=True)
