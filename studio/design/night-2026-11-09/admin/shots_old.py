"""'Before' screenshots: the old control room (old/admin.js, from commit 62da56e) on the same fake data.  python shots_old.py"""
import pathlib
from PIL import Image
from render_mocks import shot
HERE = pathlib.Path(__file__).resolve().parent
BASE = 'http://localhost:8093/studio/design/night-2026-11-09/admin/harness-old.html'
for name, h, ph in [('overview', '#/admin', 1700), ('artists', '#/admin/artists', 1700)]:
    w = HERE / f'_o-{name}.html'
    w.write_text(f'<body style="margin:0;background:#fff"><iframe src="{BASE}{h}" width="390" height="{ph}" style="border:0;display:block"></iframe></body>', encoding='utf-8')
    out = HERE / 'shots' / f'old-{name}-phone.png'
    shot(w.as_uri(), out, 700, ph + 20)
    Image.open(out).crop((0, 0, 780, ph * 2)).save(out)
    w.unlink()
    shot(f'{BASE}{h}', HERE / 'shots' / f'old-{name}-desk.png', 1280, 800)
    print(name)
