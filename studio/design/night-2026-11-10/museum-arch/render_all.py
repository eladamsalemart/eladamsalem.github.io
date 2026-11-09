"""Renders every direction (axonometric + one interior) with Blender, one after the other. Run in the background:
    python render_all.py [A B ...] [--samples 64]"""
import subprocess, sys, os, time
B = os.environ.get('BLENDER', r'C:\Users\elada\blender\blender-4.5.15-windows-x64\blender.exe')
HERE = os.path.dirname(os.path.abspath(__file__))
keys = [a for a in sys.argv[1:] if len(a) == 1] or list('ABCDE')
samples = sys.argv[sys.argv.index('--samples') + 1] if '--samples' in sys.argv else '64'
for k in keys:
    for shot, size in (('axon', '1500x960'), ('int', '1300x860')):
        t = time.time()
        r = subprocess.run([B, '-b', '--factory-startup', '-P', os.path.join(HERE, 'blender_build.py'), '--', '--dir', k, '--shot', shot, '--samples', samples, '--size', size], capture_output=True, text=True)
        print(k, shot, round(time.time() - t), 's', 'ok' if 'done' in r.stdout else r.stdout[-300:] + r.stderr[-300:], flush=True)
