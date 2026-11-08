"""Screenshots of the built control room (studio/app/admin.js on the fake database in harness-static.html), phone and desktop.
Needs `python -m http.server 8093` at the repo root.   python shots_built.py"""
import pathlib, subprocess
from PIL import Image
from render_mocks import CHROME, shot
HERE = pathlib.Path(__file__).resolve().parent
BASE = 'http://localhost:8093/studio/design/night-2026-11-09/admin/harness-static.html'
SHOTS = [  # name, query, hash, desktop height
    ('queue', '', '#/admin', 900), ('artists', '?click=.ax-row:nth-child(2)>button', '#/admin/artists', 900), ('system', '?click=%23axReal', '#/admin/system', 900),
    ('queue-flag', '?click=%5Bdata-kind%3Dworks%5D%20.ax-t:nth-child(6)', '#/admin', 900), ('people', '', '#/admin/people', 900)]
(HERE / 'shots').mkdir(exist_ok=True)
for name, q, h, dh in SHOTS:
    url = f'{BASE}{q}{h}'
    w = HERE / f'_b-{name}.html'
    w.write_text(f'<body style="margin:0;background:#fff"><iframe src="{url}" width="390" height="844" style="border:0;display:block"></iframe></body>', encoding='utf-8')
    out = HERE / 'shots' / f'built-{name}-phone.png'
    shot(w.as_uri().replace('file:///', 'file:///'), out, 700, 900)
    Image.open(out).crop((0, 0, 780, 1688)).save(out)
    w.unlink()
    shot(url, HERE / 'shots' / f'built-{name}-desk.png', 1280, dh)
    print(name)
