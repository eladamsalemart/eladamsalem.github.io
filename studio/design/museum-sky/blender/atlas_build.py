# puts the 12 rendered cells (foliage_atlas.py) into one 2048x1536 atlas: python atlas_build.py CELLDIR OUT.webp [preview.png]
import sys
from PIL import Image
names = ['palmA','palmB','banana1','monstera','fern2','heliconia','shrub','vines','palmA_below','banana9','fern4','palmB_below']
d, out = sys.argv[1], sys.argv[2]
A = Image.new('RGBA', (2048, 1536), (0, 0, 0, 0))
for i, n in enumerate(names):
    A.paste(Image.open(f'{d}/cell_{n}.png').convert('RGBA'), ((i % 4) * 512, (i // 4) * 512))
import numpy as np
a = np.array(A).astype(np.float32); al = a[..., 3] > 8
rgb = a[..., :3].copy(); have = al.copy()
for _ in range(10):        # bleed the leaf colour into the empty pixels, so a filtered edge never goes dark
    acc = np.zeros_like(rgb); cnt = np.zeros(have.shape, np.float32)
    for dy, dx in ((1,0),(-1,0),(0,1),(0,-1),(1,1),(-1,-1),(1,-1),(-1,1)):
        sh = np.roll(np.roll(rgb * have[..., None], dy, 0), dx, 1); hv = np.roll(np.roll(have, dy, 0), dx, 1)
        acc += sh; cnt += hv
    new = (~have) & (cnt > 0); rgb[new] = acc[new] / cnt[new][:, None]; have = have | new
a[..., :3] = rgb; A = Image.fromarray(a.astype(np.uint8), 'RGBA')
A.save(out, quality=86, method=6, exact=True)
if len(sys.argv) > 3:
    bg = Image.new('RGBA', A.size, (150, 185, 215, 255)); bg.alpha_composite(A); bg.convert('RGB').resize((1536, 1152)).save(sys.argv[3])
