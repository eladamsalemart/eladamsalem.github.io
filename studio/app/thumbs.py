"""Small versions of the site's images, for the app's grids and lists on a phone.

    python3 studio/app/thumbs.py MEDIA_DIR APP_DIR

Writes APP_DIR/thumbs/<name>.webp (640 px on the long side) for every image in MEDIA_DIR/works, and
APP_DIR/data/thumbs.json mapping each site path ('/media/works/x.jpg') to its small version. The app lets
the browser choose: the small one where an image shows small, the full one where it fills the screen."""
import json, sys
from pathlib import Path
from PIL import Image, ImageOps

EDGE = 640
QUALITY = 80


def main(media, app):
    media, app = Path(media), Path(app)
    (app / 'thumbs').mkdir(parents=True, exist_ok=True)
    out = {}
    for f in sorted((media / 'works').iterdir()):
        if f.suffix.lower() not in ('.jpg', '.jpeg', '.png', '.webp'):
            continue
        try:
            im = ImageOps.exif_transpose(Image.open(f))
        except Exception:
            continue
        if max(im.size) <= EDGE * 1.3:                  # small already: the original serves
            continue
        im.thumbnail((EDGE, EDGE), Image.LANCZOS)
        im = im.convert('RGBA' if im.mode in ('RGBA', 'LA', 'P') else 'RGB')
        name = f'thumbs/{f.stem}.webp'
        im.save(app / name, 'WEBP', quality=QUALITY, method=6)
        out[f'/media/works/{f.name}'] = name
    (app / 'data').mkdir(parents=True, exist_ok=True)
    json.dump(out, open(app / 'data' / 'thumbs.json', 'w'), indent=0)
    print(f'{len(out)} small images')


if __name__ == '__main__':
    main(*sys.argv[1:3])
