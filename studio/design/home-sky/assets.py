"""Images for the Home prototypes: a square thumbnail for each star, a wider one for the sections, and a pastel tint from each work."""
import json
from pathlib import Path
from PIL import Image, ImageOps, ImageStat

HERE = Path(__file__).resolve().parent
APP = HERE.parent.parent / 'app'
MEDIA = HERE.parent.parent.parent / 'media' / 'works'
OUT = HERE / 'img'
SRC = {
    'signal': APP / 'data/demo/works/signal-01.jpg', 'noise-garden': APP / 'data/demo/works/noise-garden.jpg',
    'lia': APP / 'data/demo/people/lia-moren.jpg', 'maya': APP / 'data/demo/people/maya-haddad.jpg',
    'tomer': APP / 'data/demo/people/tomer-lev.jpg', 'noa': APP / 'data/demo/people/noa-ben-ari.jpg',
    'daniel': APP / 'data/demo/people/daniel-ostrovsky.jpg', 'elad': MEDIA / 'img-0502-1780925650921.jpg',
    'ritual': MEDIA / 'jah-005-1780915457989.jpg', 'together': MEDIA / 'img-1196-edit-1791725179214.jpg',
    'sunflower': MEDIA / 'img-0965-1782983816627.jpg',
    'low-tide': APP / 'data/demo/works/low-tide.jpg', 'harbour': APP / 'data/demo/shows/low-tide-haifa-1.jpg',
    'breath': APP / 'data/demo/works/breath-i.jpg', 'ink-breath-room': APP / 'data/demo/shows/ink-breath-1.jpg',
    'patchwork': APP / 'data/demo/works/patchwork-weather.jpg', 'slow-colour': APP / 'data/demo/works/slow-colour-i.jpg',
    'orchard': APP / 'data/demo/works/orchard-at-noon.jpg', 'one-line': APP / 'data/demo/works/one-line.jpg',
}
tints = {}
for k, p in SRC.items():
    im = ImageOps.exif_transpose(Image.open(p)).convert('RGB')
    sq = ImageOps.fit(im, (240, 240), Image.LANCZOS)
    sq.save(OUT / f'{k}.jpg', quality=82, optimize=True)
    w = im.copy(); w.thumbnail((900, 900), Image.LANCZOS); w.save(OUT / f'{k}-m.jpg', quality=80, optimize=True)
    r, g, b = ImageStat.Stat(sq.resize((24, 24))).mean
    mix = lambda c: round(c * 0.38 + 255 * 0.62)                 # the work's colour, lifted to a pastel
    tints[k] = '#%02X%02X%02X' % (mix(r), mix(g), mix(b))
(HERE / 'tints.json').write_text(json.dumps(tints, indent=1))
print(len(tints), 'images;', sum(f.stat().st_size for f in OUT.iterdir()) // 1024, 'KB')
