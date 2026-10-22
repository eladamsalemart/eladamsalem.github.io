"""Build studio/proposal/index.html from proposal.src.html.

Embeds Elad's works (resized) with dimensions resolved against the photo's aspect ratio, so the 3D space
hangs every work at its real size and flags sizes that don't match the photo. Run from the repo root:
python3 studio/proposal/build.py"""
import base64, io, json, re
from PIL import Image

TEX_EDGE = 1200          # long edge of the texture embedded in the prototype (production: 4096 px KTX2)
TOLERANCE = 0.06         # max aspect-ratio difference between stated size and photo

def resolve(work, aspect):
    """Return (h_cm, w_cm, verified, note) from the size fields, testing both h×w and w×h."""
    text = (work.get('description') or '') + ' ' + (work.get('size') or '')
    cands = [(float(a), float(b)) for a, b in re.findall(r'(\d+(?:\.\d+)?)\s*[x×X]\s*(\d+(?:\.\d+)?)', text)]
    best = None
    for a, b in cands:
        for h, w in ((a, b), (b, a)):
            err = abs((w / h) / aspect - 1)
            if best is None or err < best[0]:
                best = (err, h, w)
    if best is None:
        return None, None, False, 'no size recorded'
    err, h, w = best
    note = '' if len(set(cands)) == 1 else f'{len(set(cands))} different sizes recorded'
    if err > TOLERANCE:
        # keep the stated long side, take proportions from the photo
        long_side = max(h, w)
        h, w = (long_side, long_side * aspect) if aspect < 1 else (long_side / aspect, long_side)
        return round(h), round(w), False, f'stated size differs from photo by {err:.0%}'
    return h, w, True, note

PICK = {'Gathering', 'Celebration', 'Ritual', 'Woman', 'Together', 'Human nature', 'Adam, Adam and a Lamp',
        'Sunflower', 'Flowers 1', 'Flowers 2', 'Flowers 3', 'Woman and a gun', 'Nature', 'Harmony', 'Nature of man',
        'In nature', 'Arising', 'Menora', 'Yehudiya', 'Main space', 'Room', 'Here', 'Adam and Eve', 'Flower'}


def load_works(titles=PICK):
    """Elad's works, resized and with sizes resolved, as dicts ready for the page's WORKS array."""
    works = json.load(open('content/works.json'))
    out = []
    for i, x in enumerate(works):
        im = Image.open('.' + x['image']).convert('RGB')
        aspect = im.width / im.height
        h, w, ok, note = resolve(x, aspect)
        im.thumbnail((TEX_EDGE, TEX_EDGE))
        buf = io.BytesIO()
        im.save(buf, 'JPEG', quality=78, optimize=True)
        edge = im.resize((1, 1), Image.LANCZOS).getpixel((0, 0))
        medium = ((x.get('description') or 'Oil on canvas').split('\n')[0]).strip().capitalize().replace('  ', ' ')
        out.append(dict(id=i, t=x['title'].strip(), y=x['year'], m=medium, h=h, w=w, ok=ok, note=note,
                        sold=(x.get('available') is False), edge='#%02x%02x%02x' % edge,
                        src='data:image/jpeg;base64,' + base64.b64encode(buf.getvalue()).decode()))
    return [o for o in out if o['t'] in titles]


if __name__ == '__main__':
    out = load_works()
    src = open('studio/proposal/proposal.src.html', encoding='utf-8').read()
    space = open('studio/proposal/space.js', encoding='utf-8').read()
    html = src.replace('/*WORKS*/', 'const WORKS=' + json.dumps(out) + ';').replace('/*SPACE*/', space)
    open('studio/proposal/index.html', 'w', encoding='utf-8').write(html)
    print(len(out), 'works,', len(html) // 1024, 'KB')
    for o in out:
        print(f"  {o['t']:24} {o['h']}x{o['w']} {'ok' if o['ok'] else 'UNVERIFIED'} {o['note']}")
