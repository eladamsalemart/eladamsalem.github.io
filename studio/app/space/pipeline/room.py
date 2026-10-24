"""The room around the works: floor, walls, ceiling, found from the photos once the cameras are known.

Floor: the floor's height is the one at which the photos agree. Seen from two cameras, the same patch of
floor only lines up when it is projected onto the right plane, so heights are tried and the one where
the photos match best wins (terrazzo, tiles and concrete stains all give it texture).

Walls: in every photo the floor is the region that grows up from the bottom of the frame. Its top edge,
projected onto the floor, marks where a wall (or an opening) stands. Each camera also sees the floor
between itself and that edge, so the floor that is certainly open is known; the room is the smallest
right-angled outline that holds it. Works that hang flat against a wall pin that wall exactly.
"""
import cv2
import numpy as np
from .works import load_image

CELL = 0.05               # floor grid, metres


def K_of(c):
    h, w = c['shape']
    pp = c.get('pp', (0, 0))
    return np.array([[c['f'], 0, w / 2 + pp[0]], [0, c['f'], h / 2 + pp[1]], [0, 0, 1]])


def project(c, X):
    """World points (n,3) to pixels (n,2) and depth."""
    Pc = c['R'] @ X.T + c['t'][:, None]
    z = Pc[2]
    uv = (K_of(c) @ Pc)[:2] / np.where(np.abs(z) < 1e-6, 1e-6, z)
    return uv.T, z


def centre(c):
    return -c['R'].T @ c['t']


def ray(c, px):
    """World-space directions through pixels (n,2)."""
    Kinv = np.linalg.inv(K_of(c))
    d = (Kinv @ np.column_stack([px, np.ones(len(px))]).T)
    d = c['R'].T @ d
    return (d / np.linalg.norm(d, axis=0)).T


def work_masks(cams, works, sizes, matched=None, grow=0.06, unsure=0.15):
    """Per photo, a mask of where works are (slightly enlarged), so they don't count as floor or wall.
    A work that should be in a photo but wasn't recognised there is masked with a wide margin (unsure),
    since where it falls in that photo is only predicted."""
    out = {}
    for p, c in cams.items():
        h, w = c['shape']
        m = np.zeros((h, w), np.uint8)
        for t, wk in works.items():
            sw, sh = sizes[t]
            g = grow if (matched is None or t in matched.get(p, ())) else unsure
            X = np.array([[-sw / 2 - g, sh / 2 + g, 0], [sw / 2 + g, sh / 2 + g, 0],
                          [sw / 2 + g, -sh / 2 - g, 0], [-sw / 2 - g, -sh / 2 - g, 0]])
            # a work seen from behind its own plane, or reaching behind the camera, can't hide anything here
            if wk['R'][:, 2] @ (centre(c) - wk['c']) <= 0.05:
                continue
            Xw = (wk['R'] @ X.T).T + wk['c']
            uv, z = project(c, Xw)
            if (z > 0.3).all():
                cv2.fillConvexPoly(m, np.clip(uv, -4 * w, 5 * w).astype(np.int32), 1)
        out[p] = m
    return out


def floor_patch(img, c, y, xs, zs):
    """The photo projected onto the floor plane at height y, over the grid xs x zs (top-down)."""
    X, Z = np.meshgrid(xs, zs)
    P = np.column_stack([X.ravel(), np.full(X.size, y), Z.ravel()])
    uv, z = project(c, P)
    h, w = img.shape[:2]
    ok = (z > 0.1) & (uv[:, 0] >= 0) & (uv[:, 0] < w - 1) & (uv[:, 1] >= h * 0.45) & (uv[:, 1] < h - 1)
    mapx = uv[:, 0].reshape(X.shape).astype(np.float32); mapy = uv[:, 1].reshape(X.shape).astype(np.float32)
    patch = cv2.remap(img, mapx, mapy, cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT)
    return patch, ok.reshape(X.shape)


def ncc(a, b, m):
    if m.sum() < 400:
        return None
    a = a[m].astype(float); b = b[m].astype(float)
    a -= a.mean(); b -= b.mean()
    d = np.sqrt((a * a).sum() * (b * b).sum())
    return float((a * b).sum() / d) if d > 0 else None


def floor_agreement(cams, gray, ys, step):
    """For each candidate height, how well the photos agree on the floor's texture."""
    allc = np.array([centre(c) for c in cams.values()])
    xs = np.arange(allc[:, 0].min() - 4, allc[:, 0].max() + 4, step)
    zs = np.arange(allc[:, 2].min() - 4, allc[:, 2].max() + 4, step)
    ps = list(cams)
    out = []
    for y in ys:
        patches = {}
        for p in ps:
            img, ok = floor_patch(gray[p][0], cams[p], y, xs, zs)
            msk, _ = floor_patch(gray[p][1], cams[p], y, xs, zs)
            patches[p] = (img, ok & (msk > 0.5))
        tot = n = 0.0
        for i in range(len(ps)):
            for j in range(i + 1, len(ps)):
                m = patches[ps[i]][1] & patches[ps[j]][1]
                sc = ncc(patches[ps[i]][0], patches[ps[j]][0], m)
                if sc is not None:
                    tot += sc * np.sqrt(m.sum()); n += np.sqrt(m.sum())
        out.append(tot / n if n else np.nan)
    return np.array(out)


def find_floor(cams, images, masks, log=print):
    """Height of the floor (world y) where the photos' views of it agree best, coarse then fine.
    Returns (height, confidence) or (None, 0) if no two photos see the same floor."""
    ys0 = np.array([centre(c)[1] for c in cams.values()])
    gray = {}
    for p in cams:
        g = cv2.cvtColor(images[p], cv2.COLOR_BGR2GRAY).astype(np.float32)
        g = g - cv2.GaussianBlur(g, (0, 0), 6)                      # texture only, not the light
        gray[p] = (g, (masks[p] == 0).astype(np.float32))
    # a photographer holds the camera 0.95 to 2 m above the floor; searching only there also keeps a
    # repeating floor (tiles, checks) from matching itself one pattern off
    med = np.median(ys0)
    coarse = np.arange(med - 2.0, med - 0.95, 0.04)
    sc = floor_agreement(cams, gray, coarse, 0.025)
    if np.all(np.isnan(sc)):
        return None, 0.0
    y0 = coarse[int(np.nanargmax(sc))]
    fine = np.arange(y0 - 0.06, y0 + 0.061, 0.01)
    sf = floor_agreement(cams, gray, fine, 0.01)
    k = int(np.nanargmax(sf))
    conf = float(np.nanmax(sc) - np.nanmedian(sc))
    log(f"  floor: photos agree best at y = {fine[k]:.2f} (agreement {sf[k]:.3f}, typical {np.nanmedian(sc):.3f})")
    return float(fine[k]), conf


CANVAS = 0.035            # a canvas stands this far off its wall


def wall_candidates(works, sizes):
    """Walls implied by works hung flat on them: (axis 0=x or 2=z, side +1/-1 = way the wall faces, offset, works).
    A leaning work marks its wall by its top edge. Works facing off the room's axes don't make a wall."""
    cands = []
    for t, w in works.items():
        n = w['R'][:, 2]
        h = np.array([n[0], 0, n[2]]); hn = np.linalg.norm(h)
        if hn < 0.9:
            continue
        h /= hn
        axis = 0 if abs(h[0]) > abs(h[2]) else 2
        if abs(h[axis]) < 0.96:
            continue
        side = 1 if h[axis] > 0 else -1
        lean = np.degrees(np.arcsin(np.clip(-n[1], -1, 1)))
        if abs(lean) > 3:                      # leaning: its top edge touches the wall
            top = w['c'] + w['R'][:, 1] * sizes[t][1] / 2
            off = top[axis] - side * 0.02
        else:
            off = w['c'][axis] - side * CANVAS
        cands.append((axis, side, off, t))
    walls = []
    for axis, side, off, t in sorted(cands, key=lambda c: (c[0], c[1], c[2])):
        for wl in walls:
            if wl['axis'] == axis and wl['side'] == side and abs(np.median(wl['offs']) - off) < 0.25:
                wl['offs'].append(off); wl['works'].append(t); break
        else:
            walls.append({'axis': axis, 'side': side, 'offs': [off], 'works': [t]})
    for wl in walls:
        wl['offset'] = float(np.median(wl['offs']))
    return walls


def ceiling_from_walls(textures, texel, top_height):
    """Height where the walls meet the ceiling: the strongest level edge high on the walls, voted across
    walls. textures: list of (rectified wall image whose top row is at top_height, valid mask)."""
    votes, reach = {}, []
    for img, valid in textures:
        rows_seen = np.where(valid.mean(1) >= 0.5)[0]
        if len(rows_seen):
            reach.append(top_height - rows_seen.min() * texel)
        g = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY).astype(np.float32)
        gy = np.abs(cv2.Sobel(cv2.GaussianBlur(g, (0, 0), 1.5), cv2.CV_32F, 0, 1, ksize=3))
        # only where the photos fully cover the neighbourhood: the edge of what a photo saw is not a ceiling
        v = cv2.erode(valid.astype(np.uint8), np.ones((13, 13), np.uint8)) > 0
        rows = int(2.2 / texel)                                    # look in the top 2.2 m of the texture
        prof = np.array([gy[r][v[r]].mean() if v[r].mean() > 0.25 else 0 for r in range(min(rows, len(g)))])
        if not prof.any():
            continue
        for r in np.argsort(-prof)[:3]:
            hgt = round((top_height - (r + 0.5) * texel) / 0.05) * 0.05
            if hgt > 2.4:
                votes[hgt] = votes.get(hgt, 0) + prof[r]
    if not votes:
        return None
    # an edge above what most walls were seen up to is something else (a fixture, the edge of a photo)
    if reach:
        cap = float(np.percentile(reach, 25)) + 0.05
        votes = {h: v for h, v in votes.items() if h <= cap} or votes
    # neighbouring heights (5 cm apart) are the same edge
    hs = sorted(votes)
    merged = {h: votes[h] + sum(votes[k] for k in hs if 0 < abs(k - h) <= 0.051) for h in hs}
    votes = merged
    best = max(votes.values())
    # the walls' top is the highest level edge that is nearly as strong as the strongest
    return float(max(h for h, s in votes.items() if s > 0.5 * best))


def openings_in_wall(img, valid, floor_lab, texel, top_height, ceiling):
    """Openings in a wall: columns where the floor carries on above the wall's foot (seen through the
    wall plane), at least 0.6 m wide. Each gets a top: an arch if its edge rises to the middle."""
    lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB).astype(np.float32)
    mu, sd = floor_lab
    # floor seen through an opening is often in shade, so: the floor's hue, and clearly darker than the wall
    wall_L = np.median(lab[..., 0][valid]) if valid.any() else 200
    hue = np.sqrt((((lab[..., 1:] - mu[1:]) / np.maximum(sd[1:], 4)) ** 2).sum(-1)) < 3
    floorish = hue & (lab[..., 0] < wall_L - 30) & valid
    H = img.shape[0]
    r_floor = int(round(top_height / texel))                       # texture row at floor level
    band = slice(max(0, r_floor - int(0.45 / texel)), max(1, r_floor - int(0.16 / texel)))
    seen = valid[band].mean(0)
    frac = floorish[band].mean(0) / np.maximum(valid[band].mean(0), 1e-6)
    # the wall's foot: a wall meets the floor (or its skirting) along a sharp level edge; an opening has none
    g0 = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY).astype(np.float32)
    gy0 = np.abs(cv2.Sobel(cv2.GaussianBlur(g0, (0, 0), 1.2), cv2.CV_32F, 0, 1, ksize=3))
    foot = gy0[max(0, r_floor - int(0.2 / texel)):r_floor - 1].max(0)
    footv = valid[max(0, r_floor - int(0.2 / texel)):r_floor - 1].mean(0) > 0.8
    weak = footv & (cv2.blur(foot[None], (31, 1))[0] < 0.3 * np.median(foot[footv])) if footv.any() else np.zeros_like(footv)
    floor_cols = (frac > 0.45) & (seen > 0.5)
    col = floor_cols | weak
    col = cv2.morphologyEx(col.astype(np.uint8)[None], cv2.MORPH_CLOSE, np.ones((1, int(0.25 / texel)), np.uint8))[0] > 0
    runs, out, start = [], [], None
    for i, c in enumerate(list(col) + [False]):
        if c and start is None: start = i
        if not c and start is not None: runs.append((start, i)); start = None
    g = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY).astype(np.float32)
    gy = np.abs(cv2.Sobel(cv2.GaussianBlur(g, (0, 0), 2), cv2.CV_32F, 0, 1, ksize=3))
    for a, b in runs:
        # a missing foot alone may be a stain or a shadow: an opening must also show the floor through it
        if (b - a) * texel < 0.6 or floor_cols[a:b].sum() * texel < 0.3:
            continue
        # per column, the lowest strong level edge between 1.9 m and just under the ceiling: the opening's top
        tops = []
        r_hi = int(round((top_height - (ceiling - 0.1)) / texel)); r_lo = int(round((top_height - 1.9) / texel))
        for c in range(a, b):
            prof = gy[r_hi:r_lo, c] * valid[r_hi:r_lo, c]
            if prof.max() > 12:
                strong = np.where(prof > 0.5 * prof.max())[0]
                tops.append(top_height - (r_hi + strong.max()) * texel)
            else:
                tops.append(np.nan)
        tops = np.array(tops)
        width = (b - a) * texel
        mid = np.nanmedian(tops[len(tops) // 3: 2 * len(tops) // 3]) if np.isfinite(tops).any() else 2.6
        sides = np.nanmedian(np.r_[tops[:len(tops) // 6], tops[-len(tops) // 6:]]) if np.isfinite(tops).any() else mid
        arch = bool(np.isfinite(mid) and np.isfinite(sides) and mid - sides > 0.25 * width)
        height = float(np.clip(mid if np.isfinite(mid) else 2.6, 1.9, ceiling - 0.05))
        out.append({'from': a * texel, 'to': b * texel, 'height': round(height, 2), 'arch': arch})
    return out
