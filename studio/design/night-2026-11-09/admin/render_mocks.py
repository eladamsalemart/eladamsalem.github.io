"""Writes mock-<x>.html for the four directions and screenshots each as a phone (390x844) and a desktop (1280x800).
    python render_mocks.py"""
import os, pathlib, subprocess
from mocks import ALL

HERE = pathlib.Path(__file__).resolve().parent
CHROME = next(p for p in (r'C:\Program Files\Google\Chrome\Application\chrome.exe', r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe') if os.path.exists(p))
(HERE / 'shots').mkdir(exist_ok=True)


def shot(url, out, w, h):
    subprocess.run([CHROME, '--headless=new', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=2', f'--window-size={w},{h}',
                    '--virtual-time-budget=9000', f'--screenshot={out}', url], check=True, timeout=120, capture_output=True)


if __name__ == '__main__':
    for k, f in ALL.items():
        p = HERE / f'mock-{k}.html'
        p.write_text(f(), encoding='utf-8')
        w = HERE / f'_wrap-{k}.html'
        w.write_text(f'<body style="margin:0;background:#fff"><iframe src="mock-{k}.html" width="390" height="844" style="border:0;display:block"></iframe></body>', encoding='utf-8')
        out = HERE / 'shots' / f'{k}-phone.png'
        shot(w.as_uri(), out, 700, 900)
        from PIL import Image
        Image.open(out).crop((0, 0, 780, 1688)).save(out)
        w.unlink()
        shot(p.as_uri(), HERE / 'shots' / f'{k}-desk.png', 1280, 800)
        print(k, 'ok')
