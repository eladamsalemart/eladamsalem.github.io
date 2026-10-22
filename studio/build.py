"""Build studio/index.html: embeds resized works from content/works.json into teaser.src.html.
Run from the repo root: python3 studio/build.py"""
import base64, io, json
from PIL import Image

PICK = ['Gathering', 'Celebration', 'Together', 'Sunflower', 'Harmony', 'Nature of man', 'In nature',
        'Human nature', 'Room', 'Adam and Eve', 'Main space', 'Menora', 'Yehudiya', 'Arising']

works = json.load(open('content/works.json'))
out = []
for title in PICK:
    w = next(x for x in works if x['title'].strip() == title)
    im = Image.open('.' + w['image']).convert('RGB')
    im.thumbnail((520, 520))
    buf = io.BytesIO()
    im.save(buf, 'JPEG', quality=72)
    desc = (w.get('description') or '').split('\n')
    out.append(dict(t=title, y=w['year'], m=desc[0] or 'oil on canvas', s=desc[1] if len(desc) > 1 else '',
                    w=im.width, h=im.height, src='data:image/jpeg;base64,' + base64.b64encode(buf.getvalue()).decode()))

src = open('studio/teaser.src.html', encoding='utf-8').read()
open('studio/index.html', 'w', encoding='utf-8').write(src.replace('/*WORKS*/', 'const WORKS=' + json.dumps(out) + ';'))
