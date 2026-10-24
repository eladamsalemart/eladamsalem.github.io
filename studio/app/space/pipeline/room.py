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
DEPTH = 0.035             # a canvas's thickness (stretcher depth) when not recorded


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
            # the whole object, not just its face: front and back corners, so a canvas's sides seen at an
            # angle are masked too (else they get painted onto the wall beside it)
            sc = wk.get('scale', np.ones(2))
            hw, hh = sw * sc[0] / 2 + g, sh * sc[1] / 2 + g
            # and its shadow: under a spot a canvas casts a shadow a few cm below and beside it, which the
            # viewer draws itself (the photo's would be a second one)
            X = np.array([[x, y, z] for z in (0.01, -(DEPTH + 0.03)) for x in (-hw - 0.05, hw + 0.05) for y in (-hh - 0.09, hh + 0.02)])
            # a work seen from behind its own plane, or reaching behind the camera, can't hide anything here
            if wk['R'][:, 2] @ (centre(c) - wk['c']) <= 0.05:
                continue
            Xw = (wk['R'] @ X.T).T + wk['c']
            uv, z = project(c, Xw)
            if (z > 0.3).all():
                hull = cv2.convexHull(np.clip(uv, -4 * w, 5 * w).astype(np.float32)).astype(np.int32)
                cv2.fillConvexPoly(m, hull, 1)
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


HANG = 1.45               # a work's centre above the floor, as galleries hang (eye level)


def level_edges(cams, images, masks, works, sizes, hs):
    """For each height in hs (world y): how clearly the photos show a level edge running along the walls at
    that height, 0..1 (the median over the photos that see a wall there, averaged over the walls). A line
    where a wall meets the floor or the ceiling is the same line in every photo; a reflection in a polished
    floor, or the ceiling's fittings seen through the wall's plane, falls in a different place in each, and
    fades in the median."""
    walls = wall_candidates(works, sizes)
    grads = {}
    for p in cams:
        g = cv2.GaussianBlur(cv2.cvtColor(images[p], cv2.COLOR_BGR2GRAY).astype(np.float32), (0, 0), 1.5)
        grads[p] = (cv2.Sobel(g, cv2.CV_32F, 1, 0, ksize=3), cv2.Sobel(g, cv2.CV_32F, 0, 1, ksize=3))
    total, n_walls = np.zeros(len(hs)), 0
    for wl in walls:
        ax, side, off = wl['axis'], wl['side'], wl['offset']; other = 2 - ax
        xs = [works[t]['c'][other] for t in wl['works']]
        us = np.linspace(min(xs) - 2.5, max(xs) + 2.5, 300)
        nrm = np.zeros(3); nrm[ax] = side
        prof = np.full(len(hs), np.nan)
        for i, y in enumerate(hs):
            P = np.zeros((len(us), 3)); P[:, other] = us; P[:, ax] = off; P[:, 1] = y
            sc = []
            for p, cam in cams.items():
                if (centre(cam) - P[0]) @ nrm < 0.2:              # this photo is behind the wall
                    continue
                uv, z = project(cam, P); H, W = images[p].shape[:2]
                ok = (z > 0.3) & (uv[:, 0] > 2) & (uv[:, 1] > 2) & (uv[:, 0] < W - 3) & (uv[:, 1] < H - 3)
                q = uv[ok]
                if len(q) < 40:
                    continue
                q = q[masks[p][q[:, 1].astype(int), q[:, 0].astype(int)] == 0]
                if len(q) < 40:
                    continue
                d = np.gradient(q, axis=0); d /= np.linalg.norm(d, axis=1, keepdims=True) + 1e-9
                gx = cv2.remap(grads[p][0], q[:, :1].astype(np.float32), q[:, 1:].astype(np.float32), cv2.INTER_LINEAR)[:, 0]
                gy = cv2.remap(grads[p][1], q[:, :1].astype(np.float32), q[:, 1:].astype(np.float32), cv2.INTER_LINEAR)[:, 0]
                sc.append(np.median(np.abs(-gx * d[:, 1] + gy * d[:, 0])))   # across the line, not along it
            if len(sc) >= 2:
                prof[i] = np.median(sc)
        if np.isfinite(prof).sum() > len(hs) // 3:
            total += np.nan_to_num(prof / np.nanmax(prof)); n_walls += 1
    return (total / n_walls if n_walls else total), n_walls


def _peaks(total, k=0.35):
    return [i for i in range(1, len(total) - 1) if total[i] >= total[i - 1] and total[i] >= total[i + 1]
            and total[i] >= k * total.max() and total[i] > 0]


def floor_from_walls(cams, images, masks, works, sizes, log=print):
    """Height of the floor (world y): the lowest level edge along the walls (the wall's foot, or a skirting
    board's bottom edge), searched where the works' hanging height puts the floor. (height, how sure) or
    (None, 0)."""
    if not works:
        return None, 0.0
    cy = np.median([w['c'][1] for w in works.values()])
    hs = np.arange(cy - HANG - 0.35, cy - HANG + 0.351, 0.01)
    total, n = level_edges(cams, images, masks, works, sizes, hs)
    pk = _peaks(total) if n else []
    if not pk:
        return None, 0.0
    i = min(pk, key=lambda k: hs[k])                             # the lowest: below it is the floor
    log(f"  floor: where the walls meet it, y = {hs[i]:.2f} ({len(pk)} level edges along {n} walls; works hang {cy - hs[i]:.2f} m up)")
    return float(hs[i]), float(total[i] / (np.median(total) + 1e-6))


def ceiling_from_edges(cams, images, masks, works, sizes, fy, log=print):
    """Height of the ceiling above the floor: the lowest of the level edges along the walls that the photos
    agree on most (where the walls end, at a flat ceiling or at the beams round a coffered one; a ceiling's fittings and
    coffers, seen through the walls' plane, fall in a different place in each photo). None if unclear."""
    top = max(w['c'][1] for w in works.values()) - fy + 0.3
    hs = np.arange(max(2.4, top), 6.0, 0.01) + fy
    total, n = level_edges(cams, images, masks, works, sizes, hs)
    total = np.convolve(total, np.ones(5) / 5, mode='same')     # one edge, a few cm thick
    pk = _peaks(total, 0.4) if n else []
    if not pk:
        return None
    # the lowest of the strongest: a coffered or beamed ceiling has strong edges above where the walls end, as
    # strong as the walls' own top (a few cm of difference in the measurement can swap which is strongest)
    strong = [k for k in pk if total[k] >= 0.85 * max(total[j] for j in pk)]
    i = min(strong, key=lambda k: hs[k])
    log(f"  ceiling: where the walls meet it, {hs[i] - fy:.2f} m ({len(pk)} level edges along {n} walls)")
    return float(hs[i] - fy)


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


def wall_spots(img, texel, ceiling, openings, works):
    """Marks on a wall's open face, as a mask: anything that stands out from the plaster round it, by
    lightness or by colour (the same test the inspection makes), away from the skirting, the ceiling's edge,
    openings and the works themselves. Slow changes of light don't count."""
    H, W = img.shape[:2]
    L = cv2.cvtColor(img, cv2.COLOR_BGR2LAB).astype(np.float32)
    L[..., 0] *= 100 / 255; L[..., 1:] -= 128
    C = np.sqrt(L[..., 1] ** 2 + L[..., 2] ** 2)
    open_face = np.zeros((H, W), bool)
    open_face[int(0.35 / texel):H - int(0.3 / texel)] = True
    for o in openings:
        open_face[:, max(0, int((o['from'] - 0.15) / texel)):int((o['to'] + 0.15) / texel)] = False
    for x0, y0, x1, y1 in works:
        open_face[max(0, y0):max(0, y1), max(0, x0):max(0, x1)] = False
    k = 0.06 / texel                                              # 'round it': about 6 cm
    wf = open_face.astype(np.float32)
    local = lambda x: cv2.GaussianBlur(x * wf, (0, 0), k) / (cv2.GaussianBlur(wf, (0, 0), k) + 1e-6)
    dL = L[..., 0] - local(L[..., 0]); dC = C - local(C)
    spot = open_face & ((np.abs(dL) > 5) | (dC > 4))
    spot = cv2.morphologyEx(spot.astype(np.uint8), cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
    n, cc, st, _ = cv2.connectedComponentsWithStats(spot)
    keep = np.zeros((H, W), bool)
    for i in range(1, n):
        if st[i, cv2.CC_STAT_AREA] * texel * texel >= 4e-4:       # 2 x 2 cm or more
            keep |= cc == i
    return cv2.dilate(keep.astype(np.uint8), np.ones((int(0.04 / texel) | 1,) * 2, np.uint8)) > 0


def foot_runs(img, valid, texel, top_height, log=None):
    """Stretches of a wall's texture that are not on the wall's plane, from where its foot shows.

    Along a real wall the foot (the top of its skirting board, or where it meets the floor) is one level
    line. Where the photos show something behind the plane through it (the side wall of a passage, seen
    through its mouth) that line climbs away; where something stands in front (a pier), it drops. Returns
    [(from, to, 'behind' | 'front')] in metres along the wall."""
    H, W = img.shape[:2]
    g = cv2.GaussianBlur(cv2.cvtColor(img, cv2.COLOR_BGR2GRAY).astype(np.float32), (0, 0), 1.5)
    gy = np.abs(cv2.Sobel(g, cv2.CV_32F, 0, 1, ksize=3))
    lo = max(0, int((top_height - 0.9) / texel)); hi = H - 2
    band = cv2.blur(gy[lo:hi] * valid[lo:hi], (max(1, int(0.05 / texel)), 1))
    rows = lo + band.argmax(0); strength = band.max(0)
    good = (valid[lo:hi].mean(0) > 0.6) & (strength > 0.3 * np.median(strength[strength > 0]) if (strength > 0).any() else False)
    if good.sum() < W * 0.3:
        return []
    usual = np.median(rows[good])
    dev = (usual - rows.astype(float)) * texel                   # + : the foot shows higher (behind)
    k = max(1, int(0.1 / texel))
    dev = np.array([np.median(dev[max(0, c - k):c + k + 1][good[max(0, c - k):c + k + 1]]) if good[max(0, c - k):c + k + 1].any() else np.nan for c in range(W)])
    # off the plane: where the foot line runs steadily up or down (a surface at an angle to the wall, seen
    # through it or standing out of it), or sits well away from the usual line
    sm = max(1, int(0.2 / texel))
    filled = np.where(np.isfinite(dev), dev, 0.0)
    slope = np.gradient(cv2.blur(filled[None], (sm, 1))[0], texel)
    off = np.isfinite(dev) & ((np.abs(slope) > 0.04) | (np.abs(dev) > 0.12))
    off = cv2.morphologyEx(off.astype(np.uint8)[None], cv2.MORPH_CLOSE, np.ones((1, max(1, int(0.15 / texel))), np.uint8))[0] > 0
    out, start = [], None
    for c, v in enumerate(list(off) + [False]):
        if v and start is None: start = c
        if not v and start is not None:
            if (c - start) * texel >= 0.5:
                d = dev[start:c][np.isfinite(dev[start:c])]
                far = d[np.argmax(np.abs(d))]
                out.append((start * texel, c * texel, 'behind' if far > 0 else 'front'))
            start = None
    if log and out:
        log('    off the wall\'s plane: ' + ', '.join(f'{x:.2f}-{y:.2f} m ({k})' for x, y, k in out))
    return out


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
    # where the wall's foot climbs away (a passage seen through its mouth), the mouth is known exactly:
    # those come first, and the floor's evidence only adds openings elsewhere
    # only those: the floor seen through the wall's plane alone is too easily a shadow, a reflection, or a
    # dark band of skirting, and an opening cut in the wrong place is the worst thing a space can show
    behind = [(int(round(a / texel)), int(round(b / texel))) for a, b, k in foot_runs(img, valid, texel, top_height) if k == 'behind']
    runs = behind
    g = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY).astype(np.float32)
    gy = np.abs(cv2.Sobel(cv2.GaussianBlur(g, (0, 0), 2), cv2.CV_32F, 0, 1, ksize=3))
    gx = np.abs(cv2.Sobel(cv2.GaussianBlur(g, (0, 0), 2), cv2.CV_32F, 1, 0, ksize=3))
    wall_gx = np.median(gx[valid]) if valid.any() else 1.0

    def jamb(c, h):
        """The column near c where the photos show the opening's side: a clear upright edge over most of its
        height (or None). An opening is cut only on its real edges, never where its edge is only guessed."""
        rows = slice(int(round((top_height - h + 0.2) / texel)), int(round((top_height - 0.3) / texel)))
        best = None
        for cc in range(max(1, c - int(0.15 / texel)), min(img.shape[1] - 1, c + int(0.15 / texel))):
            colm = gx[rows, cc - 1:cc + 2].max(1)
            ok = valid[rows, cc]
            if ok.mean() < 0.6:
                continue
            frac = (colm[ok] > max(6.0, 4 * wall_gx)).mean()
            if frac > 0.6 and (best is None or frac > best[1]):
                best = (cc, frac)
        return best[0] if best else None

    for a, b in runs:
        # a missing foot alone may be a stain or a shadow: an opening must also show the floor through it
        # (across most of its width: a pier standing out of the wall also loses the wall's foot, but only
        # shows the floor at its sides)
        known = (a, b) in behind
        if (b - a) * texel < 0.6 or (not known and (floor_cols[a:b].sum() * texel < 0.3 or floor_cols[a:b].mean() < 0.5)):
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
        if known:
            ja, jb = a, b
        else:
            ja, jb = jamb(a, height), jamb(b, height)
            if ja is None or jb is None or (jb - ja) * texel < 0.6:
                continue
        out.append({'from': round(ja * texel, 3), 'to': round(jb * texel, 3), 'height': round(height, 2), 'arch': arch})
    return out


def wall_profile(img, seen):
    """A seen wall's colour from floor to ceiling (row by row), with its plaster grain: the template for a
    wall no photo saw."""
    rows = []
    for r in range(img.shape[0]):
        m = seen[r]
        rows.append(np.median(img[r][m], axis=0) if m.sum() > 20 else None)
    known = [i for i, v in enumerate(rows) if v is not None]
    if len(known) < img.shape[0] * 0.3:
        return None
    prof = np.array([rows[i] if rows[i] is not None else rows[min(known, key=lambda k: abs(k - i))] for i in range(len(rows))], np.float32)
    prof = cv2.GaussianBlur(prof[:, None, :], (1, 0), sigmaX=0.1, sigmaY=8)[:, 0, :]
    return np.clip(prof, 0, 255).astype(np.uint8)
