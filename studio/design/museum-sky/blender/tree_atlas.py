"""Canopy trees for the museum's far garden (ROADMAP 19): four broadleaf trees painted leaf-cluster by leaf-cluster (lit from the upper left, dark in the
hollows, sky showing through), with real limbs and a buttressed, barked trunk. tropics.js stands them in rings 45-150 m out as crossed alpha cards, hazed layer by layer.
  python studio/design/museum-sky/blender/tree_atlas.py [out.webp]       -> 1024 x 1024, four 512 cells:  0 rain tree (wide umbrella), 1 round broadleaf,
                                                                          2 dense dark tree, 3 flowering tree (flamboyant red)
"""
import sys, math
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

OUT = sys.argv[1] if len(sys.argv) > 1 else '../../app/data/rooms/outside/trees.webp'
SS = 3
C = 512 * SS


def clump(d, cx, cy, r, rot, col, rs):
    """a small cluster of leaves: a ragged blob of overlapping ellipses, each leaf a little lighter or darker than the cluster"""
    for _ in range(5):
        a = rot + rs.uniform(-1.2, 1.2); L = r * rs.uniform(0.55, 1.0); W = L * rs.uniform(0.32, 0.5)
        ox = cx + math.cos(a) * r * 0.35 * rs.uniform(0, 1); oy = cy + math.sin(a) * r * 0.35 * rs.uniform(0, 1)
        k = rs.uniform(0.82, 1.18); c = tuple(int(max(0, min(255, v * k))) for v in col)
        pts = []
        for t in np.linspace(0, 2 * math.pi, 9)[:-1]:
            x = math.cos(t) * L; y = math.sin(t) * W
            pts.append((ox + x * math.cos(a) - y * math.sin(a), oy + x * math.sin(a) + y * math.cos(a)))
        d.polygon(pts, fill=c + (255,))


def tree(seed, kind):
    rs = np.random.RandomState(seed)
    im = Image.new('RGBA', (C, C), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    cx = C / 2
    if kind == 0:   cw, ch, cy0, nl, trunk_h = 0.48, 0.34, 0.52, 8, 0.50      # umbrella
    elif kind == 1: cw, ch, cy0, nl, trunk_h = 0.34, 0.44, 0.48, 10, 0.38      # round
    elif kind == 2: cw, ch, cy0, nl, trunk_h = 0.28, 0.52, 0.54, 12, 0.24     # dense, tall oval
    else:           cw, ch, cy0, nl, trunk_h = 0.45, 0.34, 0.50, 9, 0.46      # flowering umbrella
    top = C * (cy0 - ch / 2); bot = C * (cy0 + ch / 2); ground = C * 0.985
    # lobes of the crown (bigger and darker behind, smaller and lighter in front)
    lobes = []
    for i in range(nl):
        ang = rs.uniform(0, 2 * math.pi); rr = rs.uniform(0.15, 0.85)
        lx = cx + math.cos(ang) * rr * cw * C * 0.78; ly = C * cy0 + math.sin(ang) * rr * ch * C * 0.55 - rs.uniform(0, 0.05) * C
        lr = C * rs.uniform(0.11, 0.17) * (cw / 0.4) ** 0.5; lobes.append((rs.uniform(0, 1), lx, ly, lr))
    lobes.sort()
    # trunk: tapered, with buttresses at the foot; limbs go up into the crown
    tcol = (96, 80, 62)
    for y in np.arange(bot - C * 0.05, ground, 2 * SS):
        t = (y - (bot - C * 0.05)) / (ground - (bot - C * 0.05)); w = C * (0.012 + 0.012 * t + 0.05 * max(0, t - 0.8) ** 1.5 * 5)
        v = rs.uniform(0.8, 1.1); d.rectangle([cx - w + rs.uniform(-1, 1) * SS, y, cx + w, y + 2 * SS], fill=tuple(int(c * v) for c in tcol) + (255,))
    for _ in range(40):   # bark streaks
        x = cx + rs.uniform(-C * 0.012, C * 0.012); y0 = rs.uniform(bot, ground - 20); d.line([(x, y0), (x + rs.uniform(-2, 2), y0 + rs.uniform(10, 40) * SS)], fill=(60, 48, 38, 255), width=SS)
    for k in range(5):
        a = math.radians(rs.uniform(-70, 70) - 90); L = C * rs.uniform(0.12, 0.22); x0, y0 = cx, bot + C * 0.03
        d.line([(x0, y0), (x0 + math.cos(a) * L, y0 + math.sin(a) * L)], fill=tcol + (255,), width=int(C * 0.012))
    # leaves
    base_dark, base_mid, base_light = np.array((12, 38, 16)), np.array((38, 88, 32)), np.array((104, 146, 54))
    flower = kind == 3
    for depth, lx, ly, lr in lobes:
        n = int(260 * (lr / (C * 0.14)) ** 2) + 120
        for _ in range(n):
            a = rs.uniform(0, 2 * math.pi); rr = lr * math.sqrt(rs.uniform(0, 1)); x = lx + math.cos(a) * rr * 1.25; y = ly + math.sin(a) * rr * 0.9
            nx, ny = (x - lx) / (lr * 1.25), (y - ly) / (lr * 0.9)
            lit = max(0.0, -0.55 * nx - 0.85 * ny) * 0.9 + 0.12 * rs.uniform()          # lit from the upper left
            lit = min(1.0, lit + 0.25 * (1 - depth) * 0.3)
            col = base_dark + (base_mid - base_dark) * min(1, lit * 1.6) if lit < 0.6 else base_mid + (base_light - base_mid) * min(1, (lit - 0.6) * 2.2)
            col = col * rs.uniform(0.85, 1.15)
            if kind == 3 and rs.uniform() < 0.45 and ny < 0.4: col = np.array((rs.uniform(190, 235), rs.uniform(50, 90), rs.uniform(30, 55))) * (0.7 + 0.5 * lit)      # flamboyant flowers
            if kind == 1 and rs.uniform() < 0.05: col = np.array((rs.uniform(150, 190), rs.uniform(150, 175), rs.uniform(60, 90)))                                     # new yellow-green leaves
            clump(d, x, y, C * rs.uniform(0.010, 0.020), rs.uniform(0, 6.28), tuple(int(v) for v in col), rs)
    # sky holes: cut a few small gaps through the crown (alpha), so the far trees breathe
    a = np.asarray(im, np.float32)
    alpha = a[..., 3] / 255.0
    n = Image.fromarray((np.random.RandomState(seed + 5).rand(C // 14, C // 14) * 255).astype(np.uint8)).resize((C, C), Image.BICUBIC)
    n = np.asarray(n.filter(ImageFilter.GaussianBlur(2 * SS)), np.float32) / 255.0
    hole = (n > 0.74) & (np.arange(C)[:, None] < bot) & (np.arange(C)[:, None] > top + C * 0.03)
    alpha = np.where(hole & (alpha > 0), 0, alpha)
    rgb = a[..., :3]
    # a soft shading from the top of the crown to its foot (the foot of the crown is in its own shade)
    yy = (np.arange(C)[:, None] - top) / max(1.0, bot - top); sh = np.clip(1.08 - 0.5 * np.clip(yy, 0, 1) ** 1.5, 0.55, 1.1)
    rgb = np.where(np.arange(C)[:, None, None] < bot, rgb * sh[..., None], rgb)
    # downsample with premultiplied colour
    out_a = Image.fromarray((alpha * 255).astype(np.uint8)).resize((512, 512), Image.LANCZOS)
    P = np.stack([np.asarray(Image.fromarray(np.clip(rgb[..., i] * alpha, 0, 255).astype(np.uint8)).resize((512, 512), Image.LANCZOS), np.float32) for i in range(3)], -1)
    A = np.asarray(out_a, np.float32) / 255.0
    return P / np.maximum(A[..., None], 1e-3), A * 255


atlas = np.zeros((1024, 1024, 4), np.float32)
for i, (seed, kind) in enumerate([(11, 0), (23, 1), (37, 2), (51, 3)]):
    rgb, a = tree(seed, kind); x, y = (i % 2) * 512, (i // 2) * 512
    atlas[y:y + 512, x:x + 512, :3] = rgb; atlas[y:y + 512, x:x + 512, 3] = a
# colour bleed under transparent pixels
rgb, a = atlas[..., :3], atlas[..., 3] / 255.0; filled = rgb.copy()
for rad in (2, 6, 16, 40):
    pa = np.stack([np.asarray(Image.fromarray(np.clip(rgb[..., i] * a, 0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(rad)), np.float32) for i in range(3)], -1)
    pw = np.asarray(Image.fromarray((a * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(rad)), np.float32) / 255.0
    filled = np.where(((a < 0.05) & (pw > 0.01))[..., None], pa / np.maximum(pw[..., None], 1e-3), filled)
final = np.concatenate([np.where((atlas[..., 3:4] < 12), filled, rgb), atlas[..., 3:4]], -1).clip(0, 255).astype(np.uint8)
Image.fromarray(final, 'RGBA').save(OUT, 'WEBP', quality=88, method=6, exact=True)
bg = Image.new('RGBA', (1024, 1024), (190, 212, 230, 255)); bg.alpha_composite(Image.fromarray(final, 'RGBA')); bg.convert('RGB').save(OUT.replace('.webp', '_preview.png'))
print('saved', OUT)
