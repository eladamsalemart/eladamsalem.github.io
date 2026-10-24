"""Bake studio/app into a preview that opens anywhere.

The live app reads /content/*.json and /media/ directly. The preview carries the same content, with images
resized. Run from the repo root:
    python3 studio/app/build.py              # one self-contained page, studio/app/preview.html
    python3 studio/app/build.py --out DIR    # a page plus image files (DIR/index.html, DIR/m/...), for large previews"""
import base64, hashlib, io, json, re, sys
from pathlib import Path
from PIL import Image

EDGE = 900        # long edge of preview images
QUALITY = 74
SPACE_EDGE = 1600  # long edge of works shown in a 3D space


OUT = None          # with --out, images are written as files next to the page instead of inlined


def emit(data, mime, name):
    if OUT is None:
        return f'data:{mime};base64,' + base64.b64encode(data).decode()
    f = 'm/' + hashlib.sha1(data).hexdigest()[:14] + ('.png' if mime == 'image/png' else '.jpg')
    (OUT / f).parent.mkdir(parents=True, exist_ok=True)
    (OUT / f).write_bytes(data)
    return f


def data_uri(path, edge=EDGE, quality=QUALITY):
    im = Image.open('.' + path).convert('RGB')
    im.thumbnail((edge, edge))
    buf = io.BytesIO()
    im.save(buf, 'JPEG', quality=quality, optimize=True)
    return emit(buf.getvalue(), 'image/jpeg', path)


if __name__ == '__main__':
    if '--out' in sys.argv:
        OUT = Path(sys.argv[sys.argv.index('--out') + 1]); OUT.mkdir(parents=True, exist_ok=True)
    data = {n: json.load(open(f'content/{n}.json', encoding='utf-8')) for n in ['settings', 'works', 'exhibitions', 'objects', 'cv']}
    data['studio'] = json.load(open('studio/app/data/studio.json', encoding='utf-8'))
    index = json.load(open('studio/app/data/spaces/index.json', encoding='utf-8'))
    data['spaces'] = {k: json.load(open(f"studio/app/data/spaces/{k}.json", encoding='utf-8')) for k in index}
    paths = {data['settings']['hero_image'], data['settings']['about_portrait']}
    paths |= {w['image'] for w in data['works']}
    for group in ('exhibitions', 'objects'):
        for item in data[group]:
            paths |= set(item.get('images', []))
    for sp in data['spaces'].values():
        paths |= {v['photo'] for v in sp.get('views', [])}
    data['media'] = {p: data_uri(p) for p in sorted(paths) if p}
    # in the 3D spaces the works are seen close up, so they keep more of their resolution
    for sp in data['spaces'].values():
        for w in sp.get('works', []):
            data['media'][w['image']] = data_uri(w['image'], SPACE_EDGE if OUT is None else 4096, 74 if OUT is None else 90)
        files = [s.get(k) for s in sp.get('surfaces', []) for k in ('texture', 'light')] + [w.get('light') for w in sp.get('works', [])]
        for f in filter(None, files):
            mime = 'image/png' if f.endswith('.png') else 'image/jpeg'
            data['media'][f] = emit(open('studio/app/' + f, 'rb').read(), mime, f)

    page = open('studio/app/index.html', encoding='utf-8').read()
    head = re.search(r'<!-- app:head -->(.*?)<!-- app:head-end -->', page, re.S).group(1)
    body = re.search(r'<!-- app:body -->(.*?)<!-- app:body-end -->', page, re.S).group(1)
    space = open('studio/app/space/space.js', encoding='utf-8').read().replace('export async function openSpace', 'async function openSpace')
    script = space + '\nwindow.__openSpace = openSpace;\n' + open('studio/app/app.js', encoding='utf-8').read()
    out = ('<meta charset="utf-8">\n' + head + body
           + '<script>window.STUDIO_DATA=' + json.dumps(data, ensure_ascii=False).replace('</', '<\\/') + ';</script>\n'
           + '<script type="module">\n' + script + '\n</script>\n')
    dest = OUT / 'index.html' if OUT else Path('studio/app/preview.html')
    dest.write_text(out, encoding='utf-8')
    print(len(data['media']), 'images,', len(out) // 1024, 'KB page', f'-> {dest}')
