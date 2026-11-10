"""Detail tiles for the viewer (space.js): the fine texture of a real wall material (Poly Haven, CC0), as a tileable grey
picture around mid grey (the colour and light stay in the baked photograph; this is only the grain of the stuff:
plaster trowel marks, concrete pores, clay). One 1024 px tile covers `tile` metres (set in space.js DETAIL_TILE).
    python studio/app/space/rooms/detail_tiles.py        (writes studio/app/data/rooms/detail/<name>.jpg)"""
import io, json, os, urllib.request
import numpy as np
from PIL import Image, ImageFilter

UA = {'User-Agent': 'open-studio-rooms/1.0'}
OUT = os.path.join(os.path.dirname(__file__), '..', '..', 'data', 'rooms', 'detail')
# detail name: Poly Haven asset
ASSETS = {'plaster': 'plastered_wall_04', 'rough': 'white_plaster_rough_01', 'painted': 'painted_plaster_wall', 'clay': 'clay_plaster',
          'concrete': 'concrete_wall_008'}


def fetch(asset):
    files = json.loads(urllib.request.urlopen(urllib.request.Request(f'https://api.polyhaven.com/files/{asset}', headers=UA), timeout=60).read())
    d = files['Diffuse']['1k']['jpg']['url']
    return Image.open(io.BytesIO(urllib.request.urlopen(urllib.request.Request(d, headers=UA), timeout=120).read())).convert('L')


def tile(im, sigma=24, amount=1.0):
    im = im.resize((1024, 1024), Image.LANCZOS)
    a = np.asarray(im, np.float32)
    big = Image.fromarray(np.tile(a, (3, 3)).astype(np.uint8)).filter(ImageFilter.GaussianBlur(sigma))
    low = np.asarray(big, np.float32)[1024:2048, 1024:2048]            # the blur, seen across the tile's edges: seamless
    r = a / np.maximum(low, 8.0)                                        # local contrast only, light and colour removed
    r = (r - 1.0); r = r / max(float(r.std()), 1e-4) * 0.1 * amount        # every tile at the same strength (its std 0.1): the viewer sets how much
    return Image.fromarray(np.clip(128 + r * 128, 0, 255).astype(np.uint8))


if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    for name, asset in ASSETS.items():
        try:
            t = tile(fetch(asset)); t.save(os.path.join(OUT, name + '.jpg'), quality=88)
            a = np.asarray(t, np.float32); print(name, asset, round(float(a.std()), 1))
        except Exception as e: print(name, asset, 'failed', e)
