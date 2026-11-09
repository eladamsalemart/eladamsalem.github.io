"""Realistic hero renders (Poly Haven textures + HDRI, real works from the demo data): python render_hero.py F:1,2,3,4 A:1 B:1 ... [--samples 80]"""
import subprocess, sys, os, time
B = os.environ.get('BLENDER', r'C:\Users\elada\blender\blender-4.5.15-windows-x64\blender.exe')
HERE = os.path.dirname(os.path.abspath(__file__))
samples = sys.argv[sys.argv.index('--samples') + 1] if '--samples' in sys.argv else '80'
for a in sys.argv[1:]:
    if ':' not in a: continue
    k, idx = a.split(':')
    for i in idx.split(','):
        t = time.time(); env = dict(os.environ, REAL='1')
        if k == 'D': env['HDRI'] = 'kloofendal_overcast_puresky_2k.hdr'
        r = subprocess.run([B, '-b', '--factory-startup', '-P', os.path.join(HERE, 'blender_build.py'), '--', '--dir', k, '--shot', f'hero{i}', '--samples', samples, '--size', '1600x1040'], capture_output=True, text=True, env=env)
        print(k, i, round(time.time() - t), 's', 'ok' if 'done' in r.stdout else r.stdout[-300:] + r.stderr[-300:], flush=True)
