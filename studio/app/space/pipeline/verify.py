"""The space checks itself before it may be published.

Two kinds of check, all of which must pass; one failure and the space is not offered as a walk:

1. The inputs and the measurement: every work of the exhibition found and placed, every work's image
   sharp enough and its recorded size matching both its image and what the photos measured, all four
   walls pinned by works, the cameras solved tightly, the walls well seen.

2. The space against the photos: the finished space is rendered from each photo's own camera, and the
   render must look like the photo. Each work, drawn from its own image, must match how it appears in
   the photo, and the wall just around it must match too (a misplaced or mis-sized work, an unframed
   canvas wider than its image, a smear or a hole all show up here)."""
import cv2
import numpy as np
from .works import ROOT, APP, load_image
from .room import project, centre, K_of

RULES = {
    'works_placed': 1.0,        # share of the exhibition's works found in the photos and placed
    'image_edge_px': 1600,      # a work's image, long edge
    'size_vs_image': 0.08,      # recorded size against the image's proportions
    'size_vs_photos': 0.12,     # recorded size against what the photos measured
    'walls_measured': 4,        # walls pinned by works hung on them
    'rms_px': 3.0,              # cameras and works solved to within (mean reprojection error)
    'walls_seen': 0.75,         # share of wall surface the photos saw well
    'work_match': 0.55,         # a work as rendered against the photo (correlation of detail)
    'ring_diff': 14.0,          # the wall around a work, rendered against the photo (Lab units)
    'wall_diff': 12.0,          # the walls as rendered against the photos (Lab units, median)
}


def _sample(img, x, y):
    """img at float pixel coordinates x, y (1-D arrays of any length)."""
    n = len(x); cols = 1024; rows = (n + cols - 1) // cols
    mx = np.zeros(rows * cols, np.float32); my = np.zeros(rows * cols, np.float32)
    mx[:n] = x; my[:n] = y
    out = cv2.remap(img, mx.reshape(rows, cols), my.reshape(rows, cols), cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)
    return out.reshape(rows * cols, -1)[:n]


def _tex(path, cache={}):
    if path not in cache:
        cache[path] = cv2.imread(str(APP / path)) if not path.startswith('/') else load_image(path, 2000)
    return cache[path]


def render(spec, cam, width=640):
    """The space seen from a camera, by casting a ray through each pixel: colour, and what each pixel shows
    ('floor', a surface, or a work's index)."""
    h0, w0 = cam['shape']
    s = width / w0
    W, H = width, int(round(h0 * s))
    ys, xs = np.mgrid[0:H, 0:W]
    px = np.column_stack([(xs.ravel() + 0.5) / s, (ys.ravel() + 0.5) / s])
    Kinv = np.linalg.inv(K_of(cam))
    d = (cam['R'].T @ (Kinv @ np.column_stack([px, np.ones(len(px))]).T)).T
    C = centre(cam) - np.array([0, spec['_fy'], 0])
    depth = np.full(len(d), np.inf)
    col = np.zeros((len(d), 3), np.float32)
    what = np.full(len(d), -1)                                    # -1 nothing, -2 floor, 0.. surfaces, 1000+ works

    def hit(O, U, V, N, su, sv, centred=False):
        den = d @ N
        # seen from behind, a surface is not there (a photographer against a wall may solve a little behind it)
        front = den < 0
        with np.errstate(divide='ignore', invalid='ignore'):
            t = ((O - C) @ N) / den
        P = C + d * t[:, None]
        a = (P - O) @ U; b = (P - O) @ V
        if centred:
            ok = (t > 0.05) & (np.abs(a) <= su / 2) & (np.abs(b) <= sv / 2)
        else:
            ok = (t > 0.05) & (a >= 0) & (a <= su) & (b >= 0) & (b <= sv)
        return ok & front & (t < depth), t, a, b

    for k, sf in enumerate(spec['surfaces']):
        O, U, V, N = (np.array(sf[x], float) for x in ('origin', 'u', 'v', 'normal'))
        su, sv = sf['size']
        ok, t, a, b = hit(O, U, V, N, su, sv)
        for o in sf.get('openings', []):                         # nothing of the wall where it is cut away
            ok &= ~((a > o['from']) & (a < o['to']) & (b > sv - o['height']))
        if not ok.any():
            continue
        depth[ok] = t[ok]
        if sf['kind'] == 'floor':
            what[ok] = -2
            continue
        img = _tex(sf['texture'])
        col[ok] = _sample(img, a[ok] / su * img.shape[1], b[ok] / sv * img.shape[0])
        what[ok] = k
    for j, w in enumerate(spec['works']):
        X, Y, Z = (np.array(v, float) for v in w['axes'])
        c = np.array(w['centre'], float)
        su, sv = w['measured'][0] / 100, w['measured'][1] / 100
        ok, t, a, b = hit(c, X, -Y, Z, su, sv, centred=True)
        if not ok.any():
            continue
        depth[ok] = t[ok]
        img = load_image(w['image'], 1400).astype(np.float32)
        # the image at the size it appears, so its detail is averaged as a camera would, not aliased
        ppm = cam['f'] * s / float(np.median(t[ok]))
        tw = max(8, int(su * ppm * 1.2))
        if tw < img.shape[1]:
            img = cv2.resize(img, (tw, max(8, int(tw * img.shape[0] / img.shape[1]))), interpolation=cv2.INTER_AREA)
        u = (a[ok] / su + 0.5) * img.shape[1]; v = (b[ok] / sv + 0.5) * img.shape[0]
        px_col = _sample(img, u, v)
        if w.get('light'):
            L = cv2.imread(str(APP / w['light'])).astype(np.float32) / 255 * w.get('lightScale', 1)
            lu = (a[ok] / su + 0.5) * L.shape[1]; lv = (b[ok] / sv + 0.5) * L.shape[0]
            lin = _sample(L, lu, lv)
            px_col = px_col * lin ** (1 / 2.2)
        col[ok] = px_col
        what[ok] = 1000 + j
    return col.reshape(H, W, 3).clip(0, 255).astype(np.uint8), what.reshape(H, W), s


def check(spec, ex, found, g, sizes, box_how, wall_seen, log=print):
    """Every rule, with its value and whether it passed; and the overall verdict."""
    res = []
    listed = [w for w in ex['works'] if w['listed']]
    placed = {w['work'] for w in spec['works']}
    share = sum(w['title'] in placed for w in listed) / max(1, len(listed))
    res.append(('works_placed', share, share >= RULES['works_placed'], f"{sum(w['title'] in placed for w in listed)} מתוך {len(listed)} עבודות נמצאו ומוקמו"))
    small = [w['title'] for w in listed if max(w['pixels']) < RULES['image_edge_px']]
    res.append(('image_edge_px', len(small), not small, 'כל התמונות חדות מספיק' if not small else 'תמונה קטנה מדי: ' + ', '.join(small)))
    bad_img = [w['title'] for w in listed if w['size_cm'] is None or (w['size_misfit'] or 0) > RULES['size_vs_image']]
    res.append(('size_vs_image', len(bad_img), not bad_img, 'המידות מתאימות לתמונות' if not bad_img else 'מידה חסרה או לא מתאימה לתמונה: ' + ', '.join(bad_img)))
    bad_ph = [w['work'] for w in spec['works'] if max(abs(w['measured'][0] / w['size'][0] - 1), abs(w['measured'][1] / w['size'][1] - 1)) > RULES['size_vs_photos']]
    res.append(('size_vs_photos', len(bad_ph), not bad_ph, 'המידות מתאימות למה שנמדד בצילומים' if not bad_ph else 'נמדד אחרת בצילומים: ' + ', '.join(bad_ph)))
    mw = sum(v.startswith('נמדד') for v in box_how.values())
    res.append(('walls_measured', mw, mw >= RULES['walls_measured'], f'{mw} מתוך 4 קירות נמדדו לפי עבודות'))
    res.append(('rms_px', g['rms_px'], g['rms_px'] <= RULES['rms_px'], f"סטייה ממוצעת {g['rms_px']:.1f} פיקסלים"))
    res.append(('walls_seen', wall_seen, wall_seen >= RULES['walls_seen'], f'{wall_seen:.0%} מהקירות נראו היטב בצילומים'))

    # the space against the photos
    work_scores, ring_scores, wall_scores = {}, {}, []
    for p, cam in g['cams'].items():
        r, what, s = render(spec, cam)
        photo = cv2.resize(load_image(p, 2000), (r.shape[1], r.shape[0]), interpolation=cv2.INTER_AREA)
        lab_r = cv2.cvtColor(r, cv2.COLOR_BGR2LAB).astype(np.float32); lab_p = cv2.cvtColor(photo, cv2.COLOR_BGR2LAB).astype(np.float32)
        walls = (what >= 0) & (what < 1000)
        walls = cv2.erode(walls.astype(np.uint8), np.ones((5, 5), np.uint8)) > 0
        if walls.sum() > 500:
            wall_scores.append(float(np.median(np.abs(lab_r - lab_p)[walls].mean(-1))))
        for j, w in enumerate(spec['works']):
            m = what == 1000 + j
            if m.sum() < 2500:                                   # too small in this view to judge its detail
                continue
            inner = cv2.erode(m.astype(np.uint8), np.ones((5, 5), np.uint8)) > 0
            a = cv2.cvtColor(r, cv2.COLOR_BGR2GRAY).astype(np.float32); b = cv2.cvtColor(photo, cv2.COLOR_BGR2GRAY).astype(np.float32)
            band = lambda x: cv2.GaussianBlur(x, (0, 0), 1.2) - cv2.GaussianBlur(x, (0, 0), 8)   # detail, not light
            a, b = band(a), band(b)
            av = a[inner] - a[inner].mean()
            # allowing for a shift of up to ~1 cm at this size (the render is small; a pixel is a few mm)
            ncc = -1.0
            for dy in range(-4, 5, 2):
                for dx in range(-4, 5, 2):
                    bv = np.roll(np.roll(b, dy, 0), dx, 1)[inner]; bv = bv - bv.mean()
                    ncc = max(ncc, float((av * bv).sum() / (np.sqrt((av ** 2).sum() * (bv ** 2).sum()) + 1e-6)))
            work_scores.setdefault(w['work'], []).append(ncc)
            ring = (cv2.dilate(m.astype(np.uint8), np.ones((9, 9), np.uint8)) > 0) & ~(cv2.dilate(m.astype(np.uint8), np.ones((3, 3), np.uint8)) > 0) & walls
            if ring.sum() > 50:
                ring_scores.setdefault(w['work'], []).append(float(np.median(np.abs(lab_r - lab_p)[ring].mean(-1))))
    wm = {t: max(v) for t, v in work_scores.items()}               # the best view of each work decides
    rg = {t: min(v) for t, v in ring_scores.items()}
    bad_w = [t for t, v in wm.items() if v < RULES['work_match']]
    res.append(('work_match', min(wm.values()) if wm else 0, bool(wm) and not bad_w,
                'כל העבודות, כפי שהן מוצגות, תואמות לצילומים' if wm and not bad_w else 'לא תואמת לצילום: ' + ', '.join(bad_w)))
    bad_r = [t for t, v in rg.items() if v > RULES['ring_diff']]
    res.append(('ring_diff', max(rg.values()) if rg else 0, not bad_r,
                'הקיר סביב כל עבודה תואם לצילומים' if not bad_r else 'הקיר סביב העבודה לא תואם לצילום: ' + ', '.join(bad_r)))
    wd = float(np.median(wall_scores)) if wall_scores else 99
    res.append(('wall_diff', wd, wd <= RULES['wall_diff'], f'הקירות תואמים לצילומים (הפרש {wd:.1f})'))
    log('    work match per work: ' + ', '.join(f'{t} {v:.2f}' for t, v in sorted(wm.items(), key=lambda x: x[1])))
    for name, val, ok, why in res:
        log(f"    {'✓' if ok else '✗'} {name}: {val if isinstance(val, int) else round(float(val), 3)}")
    return all(ok for _, _, ok, _ in res), res, {'work_match': wm, 'ring_diff': rg}
