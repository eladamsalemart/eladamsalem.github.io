"""Suggested threshold colour of each exhibition in the museum street, from its works' palette.

Writes `streetColours` into data/virtual.json (additive; the curator's overrides live in Supabase, table museum_colours).
Same method as suggestColour() in space/synth.js (which the app uses for shows that are not in this file):
24 hue bins of 15 degrees over 24x24 samples of the first five works, weighted by saturation squared and
mid-lightness, the best bin smoothed with its neighbours, drawn at saturation .78 / lightness .5.

    python studio/app/museum_colours.py
"""
import colorsys, json, re, unicodedata
from pathlib import Path
from PIL import Image

APP = Path(__file__).resolve().parent
ROOT = APP.parent.parent


def slugify(s):
    s = unicodedata.normalize('NFKD', s.lower())
    s = re.sub(r'[^\w\s-]', '', s).strip()
    return re.sub(r'[\s_]+', '-', s) or 'untitled'


def bins_of(path):
    b = [0.0] * 24
    im = Image.open(path).convert('RGB').resize((24, 24))
    for r, g, bl in im.get_flattened_data() if hasattr(im, 'get_flattened_data') else im.getdata():
        h, l, s = colorsys.rgb_to_hls(r / 255, g / 255, bl / 255)
        if s < 0.28 or l < 0.15 or l > 0.9:
            continue
        b[int(h * 360 // 15) % 24] += s * s * (1 - abs(l - 0.5))
    return b


def colour(paths, taken=()):
    bins = [0.0] * 24
    for p in paths[:5]:
        try:
            bins = [a + c for a, c in zip(bins, bins_of(p))]
        except Exception:
            pass
    sc = lambda i: bins[i] + 0.5 * (bins[(i + 23) % 24] + bins[(i + 1) % 24])
    top = max(sc(i) for i in range(24))
    if top < 0.02:
        return None
    # each show a hue of its own: the best hue this show really has that is 45, then 30, then 15 degrees from the ones taken
    best = None
    for gap in (3, 2, 1):
        ok = [i for i in range(24) if sc(i) >= 0.1 * top and all(min((i - t) % 24, (t - i) % 24) >= gap for t in taken)]
        if ok:
            best = max(ok, key=sc)
            break
    if best is None:                                # (nothing else in it: its own best, the next notch round)
        best = (max(range(24), key=sc) + 2) % 24
    r, g, b = colorsys.hls_to_rgb((best * 15 + 7.5) / 360, 0.47, 0.62)
    return '#%02x%02x%02x' % (round(r * 255), round(g * 255), round(b * 255)), best


def main():
    vp = APP / 'data' / 'virtual.json'
    v = json.loads(vp.read_text(encoding='utf-8'))
    site = json.loads((ROOT / 'content' / 'works.json').read_text(encoding='utf-8'))
    world = json.loads((APP / 'data' / 'demo' / 'world.json').read_text(encoding='utf-8'))
    by_slug = {slugify(f"{w['title']}-{w.get('year', '')}"): ROOT / w['image'].lstrip('/') for w in site}
    for w in world['works']:
        by_slug[w['slug']] = APP / w['image']
    out, taken = {}, []

    def add(slug, keys):
        c = colour([by_slug[k] for k in keys if k in by_slug], taken)
        if c:
            out[slug] = c[0]
            taken.append(c[1])

    for s in v['shows']:
        add(s['slug'], s['works'])
    for s in world['shows']:
        if s['kind'] == 'online' and len(s['works']) >= 3:
            add(s['slug'], s['works'])
    v['streetColours'] = out
    vp.write_text(json.dumps(v, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    print(out)


if __name__ == '__main__':
    main()
