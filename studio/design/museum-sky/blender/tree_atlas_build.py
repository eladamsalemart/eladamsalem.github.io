# assembles the four Cycles tree renders (tree_render.py) into data/rooms/outside/trees.webp: 1024 x 1024, four 512 cells (colour bled under the transparent pixels)
#   python tree_atlas_build.py RENDERDIR [out.webp]
import sys, numpy as np
from PIL import Image, ImageFilter
src = sys.argv[1]; out = sys.argv[2] if len(sys.argv) > 2 else '../../app/data/rooms/outside/trees.webp'
atlas = np.zeros((1024, 1024, 4), np.float32)
for i in range(4):
    im = Image.open(f'{src}/tree_{i}.png').convert('RGBA'); a = np.asarray(im, np.float32); al = a[..., 3] / 255.0
    P = np.stack([np.asarray(Image.fromarray(np.clip(a[..., c] * al, 0, 255).astype(np.uint8)).resize((512, 512), Image.LANCZOS), np.float32) for c in range(3)], -1)
    A = np.asarray(Image.fromarray(a[..., 3].astype(np.uint8)).resize((512, 512), Image.LANCZOS), np.float32) / 255.0
    x, y = (i % 2) * 512, (i // 2) * 512
    atlas[y:y + 512, x:x + 512, :3] = P / np.maximum(A[..., None], 1e-3); atlas[y:y + 512, x:x + 512, 3] = A * 255
rgb, a = atlas[..., :3], atlas[..., 3] / 255.0; filled = rgb.copy()
for rad in (2, 6, 16, 40):
    pa = np.stack([np.asarray(Image.fromarray(np.clip(rgb[..., c] * a, 0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(rad)), np.float32) for c in range(3)], -1)
    pw = np.asarray(Image.fromarray((a * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(rad)), np.float32) / 255.0
    filled = np.where(((a < 0.05) & (pw > 0.01))[..., None], pa / np.maximum(pw[..., None], 1e-3), filled)
final = np.concatenate([np.where((atlas[..., 3:4] < 12), filled, rgb), atlas[..., 3:4]], -1).clip(0, 255).astype(np.uint8)
Image.fromarray(final, 'RGBA').save(out, 'WEBP', quality=90, method=6, exact=True)
bg = Image.new('RGBA', (1024, 1024), (190, 212, 230, 255)); bg.alpha_composite(Image.fromarray(final, 'RGBA')); bg.convert('RGB').save(src + '/preview.png'); print('saved', out)
