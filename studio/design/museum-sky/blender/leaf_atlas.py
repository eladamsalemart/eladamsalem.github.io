"""Leaf atlas for the museum's tropical garden, close-up quality (ROADMAP 19): single, species-accurate leaves with real venation, drawn once
into data/rooms/outside/leaves.webp (2048 x 2048). tropics.js hangs them, instanced and bent, on the plants nearest the glass and sways them in the wind.
  python studio/design/museum-sky/blender/leaf_atlas.py [out.webp]
Rects (x, y, w, h, in px; y down; leaves grow from the left edge or the bottom edge, tip to the right / up) are mirrored in tropics.js (LEAVES):
  monstera 0,0,1024,1024 | elephant ear 1024,0,512,512 | philodendron 1536,0,512,512 | banana A 1024,512,1024,384 | banana B 1024,896,1024,384
  palm frond A 0,1024,1024,512 | fern frond 0,1536,1024,512 | palm frond B 1024,1280,1024,512 | heliconia 1024,1792,1024,256
"""
import sys, math
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

OUT = sys.argv[1] if len(sys.argv) > 1 else '../../app/data/rooms/outside/leaves.webp'
rs = np.random.RandomState(7)
SS = 2                                    # supersampling for the antialiased edge


def smooth_noise(h, w, scale, seed):
    r = np.random.RandomState(seed); n = r.rand(max(2, h // scale + 2), max(2, w // scale + 2)).astype(np.float32)
    im = Image.fromarray((n * 255).astype(np.uint8)).resize((w, h), Image.BICUBIC)
    return np.asarray(im, np.float32) / 255.0


def mixc(a, b, t):
    t = np.clip(t, 0, 1)[..., None]
    return np.array(a, np.float32) * (1 - t) + np.array(b, np.float32) * t


def finish(rgb, alpha, w, h):
    """downsample the supersampled leaf to w x h; colour is premultiplied while averaging so the edge keeps the leaf's green."""
    a = Image.fromarray((np.clip(alpha, 0, 1) * 255).astype(np.uint8)); p = rgb * np.clip(alpha, 0, 1)[..., None]
    P = np.stack([np.asarray(Image.fromarray(np.clip(p[..., i], 0, 255).astype(np.uint8)).resize((w, h), Image.LANCZOS), np.float32) for i in range(3)], -1)
    A = np.asarray(a.resize((w, h), Image.LANCZOS), np.float32) / 255.0
    rgbo = P / np.maximum(A[..., None], 1e-3)
    return rgbo, A


def leaf_shading(X, Y, rgb, light=0.0):
    return rgb


# ---------------------------------------------------------------------------------------------------- monstera deliciosa (fenestrated, glossy)
def monstera(W=1024, H=1024):
    w, h = W * SS, H * SS
    px, py = np.meshgrid((np.arange(w) + 0.5) / w, (np.arange(h) + 0.5) / h)
    x = (px - 0.5) * 2.9; y = (py - 0.5) * 2.9 - 0.1; X = px - 0.5; T = 1.0 - py          # heart outline (x, y); X across, T up the leaf (0 bottom .. 1 tip)
    inside0 = ((x * x + y * y - 1) ** 3 - x * x * y ** 3) <= 0
    u = np.abs(X); wid = np.maximum((inside0 * u).max(axis=1, keepdims=True), 1e-3) * np.ones_like(u)                  # half-width of the leaf in this row
    rel = u / wid
    m = 0.80 - 0.30 * np.clip(T, 0, 1)                                                                                      # slope of the lateral veins (flatter near the tip)
    q = (T - u * m - 0.06) / 0.108; fq = q - np.floor(q); dv = np.minimum(fq, 1 - fq) * 0.108
    jit = smooth_noise(h, w, 16 * SS, 3) * 0.22; between = np.sin(np.pi * fq)
    holes = (between > 0.62 + jit) & (rel > 0.20 + jit * 0.4) & (rel < 0.50) & (T > 0.12) & (T < 0.9)
    slits = (between > 0.30 + jit) & (rel >= 0.46 + jit * 0.3) & (T > 0.06) & (T < 0.93)
    alpha = (inside0 & ~holes & ~slits).astype(np.float32)
    n1 = smooth_noise(h, w, 40 * SS, 5); n2 = smooth_noise(h, w, 9 * SS, 6)
    base = mixc((18, 62, 22), (44, 102, 36), 0.35 * n1 + 0.5 * np.clip(1 - rel, 0, 1) + 0.25 * n2)
    vein = np.exp(-(dv / 0.0045) ** 2) * np.clip(1.5 - rel, 0, 1)
    mid = np.exp(-(u / (0.008 + 0.012 * (1 - np.clip(T, 0, 1)))) ** 2) * (T > 0.12)
    rgb = mixc(base, (126, 168, 78), 0.55 * vein + 0.85 * mid)
    sheen = np.exp(-((u - 0.06) / 0.045) ** 2) * 0.22 + np.exp(-((u - 0.19) / 0.07) ** 2) * 0.10
    rgb = rgb * (1 + sheen[..., None]) * (0.92 + 0.16 * n2[..., None])
    edge = np.clip((1.0 - rel) / 0.06, 0, 1); rgb = rgb * (0.80 + 0.20 * edge[..., None])
    return finish(rgb, alpha, W, H)


# ---------------------------------------------------------------------------------------------------- heart leaves: elephant ear (peltate) and philodendron
def heart_leaf(W, H, col0, col1, aspect=1.0, peltate=True, seed=1):
    w, h = W * SS, H * SS
    px, py = np.meshgrid((np.arange(w) + 0.5) / w, (np.arange(h) + 0.5) / h)
    x = (px - 0.5) * 3.0; y = (py - 0.5) * 3.0 / aspect - 0.1                                       # heart curve units
    f = (x * x + y * y - 1) ** 3 - x * x * y ** 3
    inside = f <= 0
    # a drawn-out tip
    tip = 1.0 + 0.0 * x
    r = np.hypot(x, y - 0.2); ang = np.arctan2(x, y - 0.2)
    ax = (px - 0.5); ay = 1 - py
    n1 = smooth_noise(h, w, 30 * SS, seed); n2 = smooth_noise(h, w, 8 * SS, seed + 1)
    a0 = np.arctan2(ax, ay - (0.30 if peltate else 0.15))                                                                    # veins radiate from the attachment
    nv = 11; rv = a0 * nv / (2 * np.pi) * 2.0; fv = rv - np.floor(rv); dv = np.minimum(fv, 1 - fv)
    rad = np.hypot(ax, ay - (0.30 if peltate else 0.15))
    vein = np.exp(-(dv * rad * 6.0 / 0.012) ** 2 * 0.0006) * 0 + np.exp(-((dv * rad * 1.6) / 0.006) ** 2) * np.clip(1.2 - rad * 1.5, 0, 1)
    mid = np.exp(-(np.abs(ax) / 0.008) ** 2) * (ay > (0.30 if peltate else 0.15) - 0.35)
    rgb = mixc(col0, col1, 0.5 * n1 + 0.3 * n2 + 0.25 * np.clip(1 - rad * 1.6, 0, 1))
    rgb = mixc(rgb, (150, 190, 130), 0.5 * vein + 0.7 * mid)
    rgb = rgb * (0.9 + 0.2 * n2[..., None])
    edge = np.clip(-f * 4.0, 0, 1); rgb = rgb * (0.82 + 0.18 * edge[..., None])
    return finish(rgb, inside.astype(np.float32), W, H)


# ---------------------------------------------------------------------------------------------------- banana / heliconia: long paddle with parallel veins and tears
def paddle_leaf(W, H, seed, tears=True, base_col=(76, 132, 36), tip_col=(98, 148, 44), narrow=1.0, nveins=210):
    r = np.random.RandomState(seed); w, h = W * SS, H * SS
    px, py = np.meshgrid((np.arange(w) + 0.5) / w, (np.arange(h) + 0.5) / h); t = px; y = (py - 0.5)                          # along the leaf (0 base .. 1 tip), across (-0.5..0.5)
    hw = 0.47 * narrow * np.minimum(1, (t / 0.05) ** 0.55) * (1 - t ** 3.0) ** 0.62 * (0.88 + 0.12 * np.cos(t * 7))
    inside = (np.abs(y) < hw) & (t > 0.002) & (t < 0.985)
    ya = np.abs(y) / np.maximum(hw, 1e-3); lat = (t - np.abs(y) * 0.30 * (H / W) * 3.2) * nveins; fl = lat - np.floor(lat)                  # lateral veins lean toward the tip
    alpha = inside.astype(np.float32)
    if tears:
        nt = 34; k0 = r.rand(nt) * 0.9 + 0.05
        for k in k0:
            depth = r.uniform(0.35, 0.98); side = r.choice([-1, 1, 0]); wd = r.uniform(0.004, 0.011)
            tl = (t - np.abs(y) * 0.30 * (H / W) * 3.2 - k) / wd; cut = (np.abs(tl) < 1) & (ya > 1 - depth)
            if side != 0: cut &= (np.sign(y) == side)
            alpha = np.where(cut, 0, alpha)
    n1 = smooth_noise(h, w, 60 * SS, seed + 3); n2 = smooth_noise(h, w, 10 * SS, seed + 4)
    base = mixc(base_col, tip_col, 0.5 * n1 + 0.4 * t)
    vein = np.exp(-((np.minimum(fl, 1 - fl)) / 0.10) ** 2) * 0.35 * (ya < 1)
    mid = np.exp(-(np.abs(y) / (0.024 * (1 - 0.8 * t) + 0.003)) ** 2)
    rgb = mixc(base, (176, 188, 96), 0.65 * mid + vein * 0.5)
    rgb = rgb * (0.88 + 0.22 * n2[..., None]) * (0.78 + 0.22 * np.clip(1.2 - ya, 0, 1)[..., None])
    # brown, dry margins where the tears are
    dist_to_a = np.asarray(Image.fromarray((alpha * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(5 * SS)), np.float32) / 255.0
    dry = np.clip((0.82 - dist_to_a) * 1.4, 0, 1) * (alpha > 0.5)
    rgb = mixc(rgb, (128, 112, 52), dry * 0.55)
    return finish(rgb, alpha, W, H)


# ---------------------------------------------------------------------------------------------------- palm frond (pinnate; leaflets hang like a coconut/areca)
def palm_frond(W, H, seed, nlf=44, lmax=0.43, droop=0.55, sag=0.10, col=(24, 78, 26), width=0.015):
    r = np.random.RandomState(seed); w, h = W * SS, H * SS
    im = Image.new('RGBA', (w, h), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    def rach(t): return (0.02 + 0.97 * t) * w, (0.5 + sag * (t ** 2) - 0.06 * t) * h
    prev = rach(0)
    for i in range(1, 80):
        c = rach(i / 79); d.line([prev, c], fill=(160, 170, 90, 255), width=max(2, int(0.010 * h * (1 - i / 79) + 2 * SS))); prev = c
    for i in range(nlf):
        t = 0.10 + 0.88 * i / (nlf - 1); cx, cy = rach(t); tx, ty = rach(min(1, t + 0.01)); ang = math.atan2(ty - cy, tx - cx)
        ll = lmax * h * (math.sin(math.pi * (0.12 + 0.88 * t)) ** 0.8) * (0.55 + 0.45 * (1 - 0.5 * t)) * r.uniform(0.9, 1.08)
        for side in (-1, 1):
            a = ang + side * math.radians(54 + r.uniform(-7, 7)); tone = r.uniform(0.0, 1.0)
            c0 = np.array(col, np.float32) * (0.82 + 0.5 * tone); c1 = np.array((86, 136, 52), np.float32) * (0.75 + 0.4 * tone)
            n = 10; pts_l, pts_r, mid = [], [], []
            for k in range(n + 1):
                s = k / n; L = ll * s; bend = droop * s * s * ll * 0.55
                # leaflet runs out from the rachis along a, then curves toward the leaf's lower side (the leaflets hang)
                lx = cx + math.cos(a) * L; ly = cy + math.sin(a) * L + bend * 0.8
                wd = width * h * (1 - s) ** 0.8 * (0.35 + 0.65 * min(1, s * 6)) * r.uniform(0.9, 1.1)
                nx, ny = -math.sin(a), math.cos(a)
                pts_l.append((lx + nx * wd, ly + ny * wd)); pts_r.append((lx - nx * wd, ly - ny * wd)); mid.append((lx, ly))
            poly = pts_l + pts_r[::-1]
            d.polygon(poly, fill=tuple(int(v) for v in c0) + (255,))
            half = pts_l[:n // 2 + 2] + pts_r[:n // 2 + 2][::-1]; d.polygon(half, fill=tuple(int(v) for v in (c0 * 0.6 + c1 * 0.4)) + (255,))
            d.line(mid, fill=tuple(int(v) for v in c1) + (255,), width=max(1, int(1.2 * SS)))
    arr = np.asarray(im, np.float32)
    nz = smooth_noise(h, w, 12 * SS, seed + 1)[..., None]
    return finish(arr[..., :3] * (0.9 + 0.2 * nz), arr[..., 3] / 255.0, W, H)


# ---------------------------------------------------------------------------------------------------- fern frond (bipinnate: pinnae with many small pinnules)
def fern_frond(W, H, seed):
    r = np.random.RandomState(seed); w, h = W * SS, H * SS
    im = Image.new('RGBA', (w, h), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    def rach(t): return (0.02 + 0.97 * t) * w, (0.5 + 0.12 * t * t - 0.05 * t) * h
    prev = rach(0)
    for i in range(1, 60):
        c = rach(i / 59); d.line([prev, c], fill=(90, 120, 54, 255), width=max(2, int(5 * SS * (1 - i / 59) + 2))); prev = c
    npn = 26
    for i in range(npn):
        t = 0.12 + 0.86 * i / (npn - 1); cx, cy = rach(t); tx, ty = rach(min(1, t + 0.01)); ang = math.atan2(ty - cy, tx - cx)
        pl = 0.46 * h * (math.sin(math.pi * (0.1 + 0.9 * t)) ** 0.7) * (1.0 - 0.35 * t) * r.uniform(0.92, 1.06)
        for side in (-1, 1):
            a = ang + side * math.radians(76 + r.uniform(-5, 5)); ex, ey = cx + math.cos(a) * pl, cy + math.sin(a) * pl + pl * 0.10
            d.line([(cx, cy), (ex, ey)], fill=(82, 114, 50, 255), width=max(1, int(1.6 * SS)))
            npl = 13
            for k in range(1, npl + 1):
                s = k / (npl + 1); lx = cx + (ex - cx) * s; ly = cy + (ey - cy) * s; sl = pl * (math.sin(math.pi * (0.1 + 0.85 * s)) ** 0.7) * 0.20
                for sd in (-1, 1):
                    pa = a + sd * math.radians(64) + 0.0; tone = r.uniform(0, 1); cc = (int(26 + 40 * tone), int(88 + 52 * tone), int(24 + 26 * tone), 255)
                    px2, py2 = lx + math.cos(pa) * sl, ly + math.sin(pa) * sl; nx, ny = -math.sin(pa), math.cos(pa); bw = sl * 0.16
                    d.polygon([(lx + nx * bw, ly + ny * bw), ((lx + px2) / 2 + nx * bw * 1.3, (ly + py2) / 2 + ny * bw * 1.3), (px2, py2), ((lx + px2) / 2 - nx * bw * 1.3, (ly + py2) / 2 - ny * bw * 1.3), (lx - nx * bw, ly - ny * bw)], fill=cc)
    arr = np.asarray(im, np.float32); nz = smooth_noise(h, w, 14 * SS, seed + 1)[..., None]
    return finish(arr[..., :3] * (0.9 + 0.2 * nz), arr[..., 3] / 255.0, W, H)


# ---------------------------------------------------------------------------------------------------- put together
ATLAS = np.zeros((2048, 2048, 4), np.float32)
def put(x, y, res):
    rgb, a = res; h, w = a.shape; ATLAS[y:y + h, x:x + w, :3] = rgb; ATLAS[y:y + h, x:x + w, 3] = a * 255

put(0, 0, monstera(1024, 1024))
put(1024, 0, heart_leaf(512, 512, (24, 84, 56), (52, 128, 74), 1.0, True, 2))
put(1536, 0, heart_leaf(512, 512, (22, 78, 30), (66, 130, 50), 1.12, False, 4))
put(1024, 512, paddle_leaf(1024, 384, 11, True))
put(1024, 896, paddle_leaf(1024, 384, 23, True, (68, 124, 32), (92, 142, 40)))
put(0, 1024, palm_frond(1024, 512, 5))
put(0, 1536, fern_frond(1024, 512, 6))
put(1024, 1280, palm_frond(1024, 512, 8, nlf=36, lmax=0.36, droop=0.2, sag=0.06, col=(30, 88, 30), width=0.02))
put(1024, 1792, paddle_leaf(1024, 256, 31, False, (70, 130, 40), (90, 148, 46), narrow=0.8, nveins=160))

# colour bleed: transparent pixels take the colour of the nearest leaf (so the mip levels and the filtering do not show dark or pale fringes)
rgb, a = ATLAS[..., :3].copy(), ATLAS[..., 3] / 255.0
filled = rgb.copy(); wsum = a.copy()
for rad in (2, 6, 16, 40):
    pa = np.stack([np.asarray(Image.fromarray(np.clip(rgb[..., i] * a, 0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(rad)), np.float32) for i in range(3)], -1)
    pw = np.asarray(Image.fromarray((a * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(rad)), np.float32) / 255.0
    est = pa / np.maximum(pw[..., None], 1e-3); need = (a < 0.05) & (pw > 0.01); filled = np.where(need[..., None], est, filled)
    a2 = np.where(need, 0.06, a); a = np.maximum(a, a2 * 0)                                                              # keep the true alpha, fill only the colour
final = np.concatenate([np.clip(np.where((ATLAS[..., 3:4] < 12), filled, rgb), 0, 255), ATLAS[..., 3:4]], -1).astype(np.uint8)
Image.fromarray(final, 'RGBA').save(OUT, 'WEBP', quality=90, method=6, exact=True)
Image.fromarray(final, 'RGBA').resize((1024, 1024), Image.LANCZOS).save(OUT.replace('.webp', '_preview.png'))
print('saved', OUT)
