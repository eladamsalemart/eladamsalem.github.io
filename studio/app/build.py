"""Bake studio/app into one self-contained preview page (studio/app/preview.html).

The live app reads /content/*.json and /media/ directly. The preview carries the same content inline,
with images resized, so it can be opened anywhere. Run from the repo root: python3 studio/app/build.py"""
import base64, io, json, re
from PIL import Image

EDGE = 900        # long edge of preview images
QUALITY = 74


def data_uri(path):
    im = Image.open('.' + path).convert('RGB')
    im.thumbnail((EDGE, EDGE))
    buf = io.BytesIO()
    im.save(buf, 'JPEG', quality=QUALITY, optimize=True)
    return 'data:image/jpeg;base64,' + base64.b64encode(buf.getvalue()).decode()


if __name__ == '__main__':
    data = {n: json.load(open(f'content/{n}.json', encoding='utf-8')) for n in ['settings', 'works', 'exhibitions', 'objects', 'cv']}
    data['studio'] = json.load(open('studio/app/data/studio.json', encoding='utf-8'))
    data['spaces'] = {e['space']: json.load(open(f"studio/app/data/spaces/{e['space']}.json", encoding='utf-8'))
                      for e in data['studio']['exhibitions'].values() if e.get('space')}
    paths = {data['settings']['hero_image'], data['settings']['about_portrait']}
    paths |= {w['image'] for w in data['works']}
    for group in ('exhibitions', 'objects'):
        for item in data[group]:
            paths |= set(item.get('images', []))
    for sp in data['spaces'].values():
        paths |= {v['photo'] for v in sp.get('views', [])}
    data['media'] = {p: data_uri(p) for p in sorted(paths) if p}
    for sp in data['spaces'].values():
        for key in ('floor', 'baseboard'):
            f = sp['room'][key]
            data['media'][f] = 'data:image/jpeg;base64,' + base64.b64encode(open('studio/app/' + f, 'rb').read()).decode()

    page = open('studio/app/index.html', encoding='utf-8').read()
    head = re.search(r'<!-- app:head -->(.*?)<!-- app:head-end -->', page, re.S).group(1)
    body = re.search(r'<!-- app:body -->(.*?)<!-- app:body-end -->', page, re.S).group(1)
    space = open('studio/app/space/reconstruct.js', encoding='utf-8').read().replace('export async function openSpace', 'async function openSpace')
    script = space + '\nwindow.__openSpace = openSpace;\n' + open('studio/app/app.js', encoding='utf-8').read()
    out = (head + body
           + '<script>window.STUDIO_DATA=' + json.dumps(data, ensure_ascii=False).replace('</', '<\\/') + ';</script>\n'
           + '<script type="module">\n' + script + '\n</script>\n')
    open('studio/app/preview.html', 'w', encoding='utf-8').write(out)
    print(len(data['media']), 'images,', len(out) // 1024, 'KB')
