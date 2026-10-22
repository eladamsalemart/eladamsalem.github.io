"""Build studio/teaser/index.html: the teaser film with the gallery's works and the app screens embedded.
Run from the repo root: python3 studio/teaser/build.py"""
import base64, io, json, sys
from PIL import Image

sys.path.insert(0, 'studio/proposal')
from build import load_works

HUNG = {'Celebration', 'Gathering', 'Ritual', 'Woman', 'Together', 'Sunflower', 'Adam, Adam and a Lamp',
        'Human nature', 'Woman and a gun', 'Flowers 1', 'Flowers 2', 'Flowers 3', 'Nature'}
SCREENS = ['profile', 'exhibition', 'work', 'scale', 'space', 'city']


def screen(name):
    im = Image.open(f'studio/proposal/screens/s-{name}.png').convert('RGB')
    buf = io.BytesIO()
    im.save(buf, 'JPEG', quality=86, optimize=True)
    return 'data:image/jpeg;base64,' + base64.b64encode(buf.getvalue()).decode()


if __name__ == '__main__':
    works = load_works(HUNG)
    screens = {n: screen(n) for n in SCREENS}
    src = open('studio/teaser/teaser.src.html', encoding='utf-8').read()
    html = (src.replace('/*WORKS*/', 'const WORKS=' + json.dumps(works) + ';')
               .replace('/*SCREENS*/', 'const SCREENS=' + json.dumps(screens) + ';')
               .replace('/*SPACE*/', open('studio/proposal/space.js', encoding='utf-8').read()))
    open('studio/teaser/index.html', 'w', encoding='utf-8').write(html)
    print(len(works), 'works,', len(html) // 1024, 'KB')
