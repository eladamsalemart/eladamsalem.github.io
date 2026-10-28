"""Checks the app before it is published: what a visitor's phone fetches from other services must really arrive.

The map once showed only "API KEY REQUIRED" watermarks: the tile service still answered 200 with a valid
picture, just not a map. So a tile from the middle of Tel Aviv is fetched from the URL app.js uses and
looked at: a city tile has hundreds of colours and streets everywhere; a watermark or blank has neither.

Run: python3 studio/app/check_app.py [path/to/app.js]     (exits 1 and says why when a check fails)
"""
import io
import re
import sys
import urllib.request
from pathlib import Path

from PIL import Image, ImageFilter

APP = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).with_name('app.js')
UA = 'OpenStudio-check/1 (+https://eladamsalem.com/open-studio/)'
TILE = (15, 19550, 13299)          # z, x, y: central Tel Aviv (Rothschild / Allenby)


def fail(msg):
    print('FAIL', msg)
    sys.exit(1)


def map_tiles():
    m = re.search(r'const TILES = \(z, x, y\) => `([^`]+)`', APP.read_text(encoding='utf-8'))
    if not m:
        fail('map: no TILES url in app.js')
    z, x, y = TILE
    url = m.group(1).replace('${z}', str(z)).replace('${x}', str(x)).replace('${y}', str(y))
    try:
        with urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': UA}), timeout=20) as r:
            data = r.read()
    except Exception as e:
        fail(f'map: {url} did not arrive ({e})')
    im = Image.open(io.BytesIO(data)).convert('RGB')
    colours = len(im.getcolors(1 << 16) or [])
    edges = im.convert('L').filter(ImageFilter.FIND_EDGES).histogram()
    detail = sum(edges[41:]) / (im.width * im.height)
    if colours < 100 or detail < 0.15:
        fail(f'map: {url} is not a map of the city ({colours} colours, {detail:.0%} detail; a watermark or a blank tile?)')
    print(f'ok   map: {url} ({colours} colours, {detail:.0%} detail)')


if __name__ == '__main__':
    map_tiles()
