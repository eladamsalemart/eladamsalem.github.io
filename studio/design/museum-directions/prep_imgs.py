# Copies the renders (made by render.cjs into a scratch folder) into img/, resized for the document.
#   python studio/design/museum-directions/prep_imgs.py <folder with the renders> [<folder with the first six renders>]
import os, sys, glob
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__)); out = os.path.join(HERE, 'img'); os.makedirs(out, exist_ok=True)
def go(src, width_for):
    n = 0
    for f in glob.glob(os.path.join(src, '*.jpg')):
        name = os.path.basename(f); stem = name[:-4]; v = stem.split('-')[1] if '-' in stem else ''
        im = Image.open(f).convert('RGB'); w = width_for(v)
        if im.width > w: im = im.resize((w, round(im.height * w / im.width)), Image.LANCZOS)
        im.save(os.path.join(out, name), quality=82, optimize=True); n += 1
    return n
sizes = lambda v: 1100 if v in ('plan', 'plan2', 'air', 'section') else 800
print(go(sys.argv[1], sizes), 'images from', sys.argv[1])
if len(sys.argv) > 2:      # the first six studies: only their bird's-eye views
    for f in glob.glob(os.path.join(sys.argv[2], '*-air.jpg')):
        im = Image.open(f).convert('RGB'); im = im.resize((700, round(im.height * 700 / im.width)), Image.LANCZOS); im.save(os.path.join(out, os.path.basename(f)), quality=80)
    print('first studies done')
