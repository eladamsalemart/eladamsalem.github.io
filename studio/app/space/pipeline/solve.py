"""Measure the exhibition: every camera and every work's place in 3D, solved together.

Each work has a known size, so every point matched on it is a point at a known spot of a flat rectangle
of known dimensions. Bundle adjustment then finds, for all photos at once, each camera's position,
direction and focal length, and each work's position and orientation, so that every matched point lands
where it was seen. The result is in metres. Gravity is taken from the works themselves: paintings hang
upright, so the median of their 'up' directions is up."""
from collections import deque
import cv2
import numpy as np
from scipy.optimize import least_squares
from scipy.sparse import lil_matrix

PTS_PER_OBS = 48        # matched points used per (photo, work), plus the four corners


def work_points(size_m, uv):
    """Points on a work from normalised image coordinates (u right, v down), in the work's own frame
    (x right, y up, z out of the picture), metres, origin at its centre."""
    w, h = size_m
    return np.column_stack([(uv[:, 0] - 0.5) * w, (0.5 - uv[:, 1]) * h, np.zeros(len(uv))])


CORNERS_UV = np.array([[0, 0], [1, 0], [1, 1], [0, 1]], float)


def focal_from(H):
    h1, h2 = H[:, 0], H[:, 1]
    est = []
    den = h1[2] * h2[2]
    if abs(den) > 1e-12:
        f2 = -(h1[0] * h2[0] + h1[1] * h2[1]) / den
        if f2 > 0: est.append(np.sqrt(f2))
    den = h1[2] ** 2 - h2[2] ** 2
    if abs(den) > 1e-12:
        f2 = (h2[0] ** 2 + h2[1] ** 2 - h1[0] ** 2 - h1[1] ** 2) / den
        if f2 > 0: est.append(np.sqrt(f2))
    return est


def to_T(R, t):
    T = np.eye(4); T[:3, :3] = R; T[:3, 3] = t; return T


def observations(found, sizes):
    """Flatten matches into observations: (photo, work, 3D points in work frame, 2D pixels centred)."""
    obs = []
    for photo, hits in found.items():
        hh, ww = hits['_shape'][:2]
        c = np.array([ww / 2, hh / 2])
        for t, m in hits.items():
            if t == '_shape' or t not in sizes:
                continue
            k = len(m['src'])
            pick = np.linspace(0, k - 1, min(k, PTS_PER_OBS)).astype(int)
            uv = np.vstack([CORNERS_UV, m['src'][pick]])
            px = np.vstack([m['quad'], m['dst'][pick]]) - c
            wts = np.r_[np.full(4, 2.0), np.ones(len(pick))]
            obs.append({'photo': photo, 'work': t, 'X': work_points(sizes[t], uv), 'x': px, 'w': wts,
                        'H': m['H'], 'quad': m['quad'] - c, 'inliers': m['inliers']})
    return obs


def initial(obs, photos_shape):
    """Focal per photo from the homographies, a pose per observation (IPPE), then all cameras and works
    chained into one frame through shared works, starting from the most-seen work."""
    f0 = {}
    for p, shape in photos_shape.items():
        est = []
        for o in obs:
            if o['photo'] != p:
                continue
            Xc = o['X'][:4, :2]
            H, _ = cv2.findHomography(Xc, o['quad'])
            if H is not None:
                est += [e for e in focal_from(H) if 0.45 * max(shape) < e < 3.5 * max(shape)]
        f0[p] = float(np.median(est)) if est else 0.85 * max(shape)
    rel = {}
    for o in obs:
        K = np.array([[f0[o['photo']], 0, 0], [0, f0[o['photo']], 0], [0, 0, 1]])
        ok, rv, tv = cv2.solvePnP(o['X'], o['x'], K, None, flags=cv2.SOLVEPNP_IPPE)
        if ok:
            ok, rv, tv = cv2.solvePnP(o['X'], o['x'], K, None, rv, tv, True, flags=cv2.SOLVEPNP_ITERATIVE)
        R, _ = cv2.Rodrigues(rv)
        rel[(o['photo'], o['work'])] = to_T(R, tv.ravel())          # camera <- work
    # breadth-first over the photo-work graph
    count = {}
    for o in obs: count[o['work']] = count.get(o['work'], 0) + 1
    components, done_w, done_p = [], set(), set()
    for start in sorted(count, key=lambda t: -count[t]):
        if start in done_w:
            continue
        works, cams = {start: np.eye(4)}, {}
        q = deque([('w', start)])
        while q:
            kind, n = q.popleft()
            for (p, t), T in rel.items():
                if kind == 'w' and t == n and p not in cams:
                    cams[p] = works[t] @ np.linalg.inv(T)            # world <- camera
                    q.append(('p', p))
                elif kind == 'p' and p == n and t not in works:
                    works[t] = cams[p] @ T                           # world <- work
                    q.append(('w', t))
        done_w |= set(works); done_p |= set(cams)
        components.append({'works': works, 'cams': cams})
    return f0, components


def merge(comps, ties, obs, f0, photos=(), log=print):
    """Join pieces that share no work through tie points, growing the main piece one photo or piece at a time.

    The 3D points come from the main piece itself: a tie point two of its photos see is triangulated; one
    only a single photo sees lies (mostly) on a wall that photo's works hang on, so its ray met with that wall
    places it. Enough of them place a photo of another piece (PnP, outliers rejected), and with it that whole
    piece. Photos that see no work at all (a video's frames between works) are placed the same way, alone:
    they are the bridges from one piece to the next."""
    comps = sorted(comps, key=lambda c: -len(c['works']))
    main, rest = comps[0], comps[1:]
    seen = {}
    for o in obs:
        seen.setdefault(o['photo'], []).append(o['work'])
    placed = set(p for c in comps for p in c['cams'])
    rest += [{'works': {}, 'cams': {p: np.eye(4)}} for p in photos if p not in placed and any(p in t for t in ties)]
    zero = {p: np.zeros(2) for p in photos}

    def wall_hit(a, xy):
        Ta = main['cams'][a]; o = Ta[:3, 3]; d = Ta[:3, :3] @ np.r_[xy / f0[a], 1.0]
        hits = []
        for w in seen.get(a, []):
            if w in main['works']:
                n, p0 = main['works'][w][:3, 2], main['works'][w][:3, 3]
                den = n @ d
                if abs(den) > 1e-6 and (s := n @ (p0 - o) / den) > 0:
                    hits.append(s)
        return o + min(hits) * d if hits else None

    while rest:
        pts = {}
        for k, t in enumerate(ties):
            if sum(p in main['cams'] for p in t) >= 2:
                X = triangulate(t, main, f0, zero)
                if X is not None:
                    pts[k] = X
        cands = []
        for j, other in enumerate(rest):
            for b in other['cams']:
                X, x = [], []
                for k, t in enumerate(ties):
                    if b not in t:
                        continue
                    if k in pts:
                        X.append(pts[k]); x.append(t[b]); continue
                    for a in t:
                        if a in main['cams'] and (Xa := wall_hit(a, t[a])) is not None:
                            X.append(Xa); x.append(t[b]); break
                if len(X) >= 12:
                    cands.append((bool(other['works']), len(X), j, b, X, x))
        joined = False
        for has_works, n, j, b, X, x in sorted(cands, key=lambda c: (-c[0], -c[1])):
            K = np.array([[f0[b], 0, 0], [0, f0[b], 0], [0, 0, 1]])
            ok, rv, tv, inl = cv2.solvePnPRansac(np.array(X), np.array(x), K, None, reprojectionError=8.0, iterationsCount=3000, confidence=0.999)
            if not ok or inl is None or len(inl) < 10 or len(inl) < 0.3 * n:
                continue
            R, _ = cv2.Rodrigues(rv)
            M = np.linalg.inv(to_T(R, tv.ravel())) @ np.linalg.inv(rest[j]['cams'][b])     # the other piece's frame -> main's
            other = rest.pop(j)
            main['cams'].update({p: M @ T for p, T in other['cams'].items()})
            main['works'].update({t: M @ T for t, T in other['works'].items()})
            if has_works:
                log(f"  joined {len(other['works'])} more works through {b.split('/')[-1][:24]} ({len(inl)} tie points)")
            joined = True
            break
        if not joined:
            break
    bridges = [p for p in main['cams'] if p not in seen]
    if bridges:
        log(f"  {len(bridges)} photos that see no work placed by the walls alone")
    return [main] + [c for c in rest if c['works']]


# How strongly the solve leans on what galleries are like, in pixels of error per unit of departure
PRIOR = {                # one 'sigma' of departure costs about as much as 30 px of error
    'level': 30 / np.radians(1),     # a work's horizontal edge is level
    'square': 30 / np.radians(5),    # works face along the room's right-angled axes (a work may still hang at an angle)
    'upright': 30 / np.radians(3),   # works hang straight; a leaning canvas still leans if the photos say so
    'size': 30 / 0.015,              # recorded sizes are trusted to about 1.5 %
    'focal': 30 / 0.25,              # one photographer's lenses are similar (log focal, ~25 %)
    'focal_flat': 30 / 0.04,         # ...and a photo that sees one flat wall square on can't tell its own lens
                                     # from its distance (both only scale the wall): it is held to the others'
    'centre': 30 / 0.04,             # lens centre within ~4 % of the picture's centre
}


def triangulate(track, comp, f, pp):
    """A tie point's position from the two of its photos furthest apart, or None if it doesn't fit."""
    ps = [p for p in track if p in comp['cams']]
    best = None
    for i in range(len(ps)):
        for j in range(i + 1, len(ps)):
            d = np.linalg.norm(comp['cams'][ps[i]][:3, 3] - comp['cams'][ps[j]][:3, 3])
            if best is None or d > best[0]:
                best = (d, ps[i], ps[j])
    if best is None or best[0] < 0.05:
        return None
    P = []
    for p in best[1:]:
        T = np.linalg.inv(comp['cams'][p])
        P.append(np.array([[f[p], 0, pp[p][0]], [0, f[p], pp[p][1]], [0, 0, 1]]) @ T[:3])
    Xh = cv2.triangulatePoints(P[0], P[1], track[best[1]].reshape(2, 1), track[best[2]].reshape(2, 1)).ravel()
    if abs(Xh[3]) < 1e-9:
        return None
    X = Xh[:3] / Xh[3]
    for p in ps:
        T = np.linalg.inv(comp['cams'][p]); Pc = T[:3, :3] @ X + T[:3, 3]
        if Pc[2] < 0.2 or np.linalg.norm(f[p] * Pc[:2] / Pc[2] + pp[p] - track[p]) > 8:
            return None
    return X


def bundle_adjust(obs, f0, comp, photos_shape, gravity=False, f_mid=None, pp0={}, size_sigma={}, ties=(), f_tight=()):
    """Refine one connected group of cameras and works.

    First pass (gravity=False): the most-seen work stays fixed and sets the frame. Second pass
    (gravity=True, in a frame where y is up): one camera stays fixed instead, every work is free, and the
    gallery priors apply (level, square to the room, upright), and each work's width and height may differ
    slightly from the record, which is reported."""
    cams = sorted(comp['cams']); works = sorted(comp['works'])
    count = {t: sum(o['work'] == t for o in obs) for t in works}
    if gravity:
        fixed_cam = max(cams, key=lambda p: sum(o['photo'] == p for o in obs))
        free_c = [p for p in cams if p != fixed_cam]; free_w = works; anchor = None
    else:
        anchor = max(works, key=lambda t: count[t]); fixed_cam = None
        free_c = cams; free_w = [t for t in works if t != anchor]
    ci = {p: i for i, p in enumerate(free_c)}; wi = {t: i for i, t in enumerate(free_w)}
    fi = {p: i for i, p in enumerate(cams)}
    WP = 8 if gravity else 6                                         # + log width, log height scale
    nc, nw, nf = 6 * len(free_c), WP * len(free_w), 3 * len(cams)     # per camera: log focal, centre offset x, y
    # tie points (when pieces were joined through them): each a free point in 3D, seen from two photos or more
    tp, tX = [], []
    for track in ties:
        X = triangulate(track, comp, f0, {p: np.array(pp0.get(p, (0, 0))) * max(photos_shape[p]) for p in cams})
        if X is not None:
            tp.append({p: xy for p, xy in track.items() if p in fi}); tX.append(X)
    t_cam = np.array([fi[p] for t in tp for p in t], int); t_pt = np.array([k for k, t in enumerate(tp) for p in t], int)
    t_px = np.array([xy for t in tp for xy in t.values()]).reshape(-1, 2)
    nt = 3 * len(tp)
    x0 = np.zeros(nc + nw + nf + nt)
    if tp:
        x0[nc + nw + nf:] = np.array(tX).ravel()
    for p in free_c:
        T = np.linalg.inv(comp['cams'][p])
        x0[6 * ci[p]:6 * ci[p] + 3] = cv2.Rodrigues(T[:3, :3])[0].ravel(); x0[6 * ci[p] + 3:6 * ci[p] + 6] = T[:3, 3]
    for t in free_w:
        T = comp['works'][t]
        x0[nc + WP * wi[t]:nc + WP * wi[t] + 3] = cv2.Rodrigues(T[:3, :3])[0].ravel(); x0[nc + WP * wi[t] + 3:nc + WP * wi[t] + 6] = T[:3, 3]
    for p in cams:
        x0[nc + nw + 3 * fi[p]] = np.log(f0[p])
        if p in pp0: x0[nc + nw + 3 * fi[p] + 1:nc + nw + 3 * fi[p] + 3] = pp0[p]
    if fixed_cam:
        Tf = np.linalg.inv(comp['cams'][fixed_cam]); Rf, tf = Tf[:3, :3], Tf[:3, 3]
    mu = np.log(f_mid) if f_mid else None
    use = [o for o in obs if o['photo'] in fi and o['work'] in comp['works']]
    sizes = [2 * len(o['X']) for o in use]

    def unpack(x):
        C = {}
        for p in cams:
            k = nc + nw + 3 * fi[p]
            f = np.exp(x[k]); pp = x[k + 1:k + 3] * max(photos_shape[p])
            if p == fixed_cam: C[p] = (Rf, tf, f, pp)
            else: C[p] = (cv2.Rodrigues(x[6 * ci[p]:6 * ci[p] + 3])[0], x[6 * ci[p] + 3:6 * ci[p] + 6], f, pp)
        Wk = {} if not anchor else {anchor: (np.eye(3), np.zeros(3), np.ones(2))}
        for t in free_w:
            o = nc + WP * wi[t]
            Wk[t] = (cv2.Rodrigues(x[o:o + 3])[0], x[o + 3:o + 6], np.exp(x[o + 6:o + 8]) if gravity else np.ones(2))
        return C, Wk

    def tie_residuals(x, C):
        Xs = x[nc + nw + nf:].reshape(-1, 3)
        r = np.zeros((len(t_cam), 2))
        for p in cams:
            k = t_cam == fi[p]
            if k.any():
                R, t, f, pp = C[p]
                Pc = Xs[t_pt[k]] @ R.T + t
                r[k] = f * Pc[:, :2] / np.maximum(Pc[:, 2:3], 1e-3) + pp - t_px[k]
        return r

    def residuals(x):
        C, Wk = unpack(x)
        out = []
        for o in use:
            R, t, f, pp = C[o['photo']]; Rw, tw, sc = Wk[o['work']]
            X = o['X'] * np.r_[sc, 1.0]
            Pc = (R @ (Rw @ X.T + tw[:, None]) + t[:, None])
            z = np.maximum(Pc[2], 1e-3)
            out.append(((f * Pc[:2] / z).T + pp - o['x']).ravel() * np.repeat(np.sqrt(o['w']), 2))
        if tp:
            out.append(tie_residuals(x, C).ravel())
        pri = []
        if gravity:
            for t in free_w:
                Rw, _, sc = Wk[t]
                xa, za = Rw[:, 0], Rw[:, 2]
                pri.append(PRIOR['level'] * xa[1])
                h = np.array([za[0], za[2]]); a = np.arctan2(h[0], h[1]); d = (a + np.pi / 4) % (np.pi / 2) - np.pi / 4
                pri.append(PRIOR['square'] * np.sin(d) * (abs(d) < np.radians(25)) * (np.linalg.norm(h) > 0.3))
                pri.append(PRIOR['upright'] * za[1])
                pri += list(30 / size_sigma.get(t, 0.015) * np.log(sc))
        if mu is not None:
            pri += [(PRIOR['focal_flat'] if p in f_tight else PRIOR['focal']) * (x[nc + nw + 3 * fi[p]] - mu) for p in cams]
        # photos are often cropped, so the lens centre may sit off the picture's centre (by a few %)
        for p in cams:
            pri += list(PRIOR['centre'] * x[nc + nw + 3 * fi[p] + 1:nc + nw + 3 * fi[p] + 3])
        return np.concatenate(out + [np.array(pri)]) if pri else np.concatenate(out)

    npri = (5 * len(free_w) if gravity else 0) + (len(cams) if mu is not None else 0) + 2 * len(cams)
    nres = sum(sizes) + 2 * len(t_cam) + npri
    S = lil_matrix((nres, len(x0)), dtype=int)
    r = 0
    for o, n in zip(use, sizes):
        if o['photo'] in ci: S[r:r + n, 6 * ci[o['photo']]:6 * ci[o['photo']] + 6] = 1
        S[r:r + n, nc + nw + 3 * fi[o['photo']]:nc + nw + 3 * fi[o['photo']] + 3] = 1
        if o['work'] in wi: S[r:r + n, nc + WP * wi[o['work']]:nc + WP * wi[o['work']] + WP] = 1
        r += n
    for p_i, k in zip(t_cam, t_pt):
        p = cams[p_i]
        if p in ci: S[r:r + 2, 6 * ci[p]:6 * ci[p] + 6] = 1
        S[r:r + 2, nc + nw + 3 * p_i:nc + nw + 3 * p_i + 3] = 1
        S[r:r + 2, nc + nw + nf + 3 * k:nc + nw + nf + 3 * k + 3] = 1
        r += 2
    if gravity:
        for t in free_w:
            S[r:r + 5, nc + WP * wi[t]:nc + WP * wi[t] + WP] = 1; r += 5
    if mu is not None:
        for p in cams:
            S[r, nc + nw + 3 * fi[p]] = 1; r += 1
    for p in cams:
        S[r:r + 2, nc + nw + 3 * fi[p] + 1:nc + nw + 3 * fi[p] + 3] = 1; r += 2
    # the first pass guards against bad matches; the second (outliers already dropped) weighs the priors fully
    res = least_squares(residuals, x0, jac_sparsity=S, loss='linear' if gravity else 'huber', f_scale=3.0, x_scale='jac', max_nfev=500)
    C, Wk = unpack(res.x)
    per = residuals(res.x)[:sum(sizes)].reshape(-1, 2)
    rms = float(np.sqrt(np.mean(np.sum(per ** 2, axis=1))))
    cams_out = {p: {'R': C[p][0], 't': C[p][1], 'f': float(C[p][2]), 'pp': C[p][3], 'shape': photos_shape[p]} for p in cams}
    works_out = {t: {'R': Wk[t][0], 'c': Wk[t][1], 'scale': Wk[t][2]} for t in works}
    errs, r = {}, 0
    for o, n in zip(use, sizes):
        e = per[r // 2:(r + n) // 2]
        errs[(o['photo'], o['work'])] = float(np.sqrt(np.mean(np.sum(e ** 2, axis=1))))
        r += n
    # the tie points that fit, for the next pass (a mismatch that slipped through is dropped)
    kept = []
    if tp:
        te = np.linalg.norm(tie_residuals(res.x, C), axis=1)
        for k, t in enumerate(tp):
            good = {p: xy for (p, xy), e in zip(t.items(), te[t_pt == k]) if e < max(4.0, 2 * rms)}
            if len(good) >= 2:
                kept.append(good)
    return cams_out, works_out, rms, errs, kept


def gravity_frame(works, cams):
    """Rotate the solution so y is up (from the works' own up directions, robustly) and the main wall
    directions line up with x and z; returns the rotation applied."""
    ups = np.array([w['R'][:, 1] for w in works.values()])
    up = np.median(ups, axis=0); up /= np.linalg.norm(up)
    for _ in range(3):
        near = ups[np.degrees(np.arccos(np.clip(ups @ up, -1, 1))) < 6]
        if len(near):
            up = near.mean(axis=0); up /= np.linalg.norm(up)
    # the works' facing directions, flattened onto the floor, give the room's axes (walls meet at right angles)
    ns = np.array([w['R'][:, 2] for w in works.values()])
    ns = ns - np.outer(ns @ up, up)
    ang = np.arctan2(ns[:, 0], ns[:, 2])
    # circular mean of 4 x angle finds the right-angle grid
    a = np.arctan2(np.sin(4 * ang).sum(), np.cos(4 * ang).sum()) / 4
    y = up
    zt = np.array([np.sin(a), 0, np.cos(a)]); zt = zt - (zt @ y) * y; zt /= np.linalg.norm(zt)
    x = np.cross(y, zt)
    Rg = np.vstack([x, y, zt])                                        # new <- old
    return Rg


def apply_frame(Rg, works, cams, offset=np.zeros(3)):
    for w in works.values():
        w['R'] = Rg @ w['R']; w['c'] = Rg @ w['c'] - offset
    for c in cams.values():
        # camera <- world: x_cam = R x + t; with x_old = Rg^T (x_new + offset)
        c['t'] = c['t'] + c['R'] @ Rg.T @ offset
        c['R'] = c['R'] @ Rg.T
    return works, cams


def camera_centre(c):
    return -c['R'].T @ c['t']


def as_comp(cams, works):
    return {'cams': {p: np.linalg.inv(to_T(c['R'], c['t'])) for p, c in cams.items()},
            'works': {t: to_T(w['R'], w['c']) for t, w in works.items()}}


def flat_views(obs, cams, works, sizes):
    """Photos whose works all hang on one flat wall, seen nearly square on: for such a photo a longer lens
    from further back and a shorter one from closer give the same picture, so its focal length is unknown."""
    out = set()
    for p, c in cams.items():
        ts = {o['work'] for o in obs if o['photo'] == p and o['work'] in works}
        if not ts:
            continue
        # the wall: the plane of the largest work (a small one's facing is loose before the gallery priors),
        # with every work's centre on it
        big = max(ts, key=lambda t: np.prod(works[t].get('scale', np.ones(2))) * sizes.get(t, (1, 1))[0] * sizes.get(t, (1, 1))[1])
        n = works[big]['R'][:, 2]
        offs = np.array([(works[t]['c'] - works[big]['c']) @ n for t in ts])
        if np.abs(offs).max() > 0.2:
            continue
        fwd = c['R'][2]                                            # the camera's axis, in the room
        if abs(fwd @ n) > np.cos(np.radians(25)):
            out.add(p)
    return out


def solve(found, exhibition, log=print, tie_fn=None):
    sizes = {w['title']: (w['size_cm'][0] / 100, w['size_cm'][1] / 100) for w in exhibition['works'] if w['size_cm']}
    shapes = {p: hits['_shape'][:2] for p, hits in found.items()}
    obs = observations(found, sizes)
    # a work whose image doesn't fit its recorded size: the record is trusted less (to ~10 %)
    size_sigma = {w['title']: (0.10 if (w['size_misfit'] or 0) > 0.04 else 0.015) for w in exhibition['works']}
    f0, comps = initial(obs, shapes)
    # typical focal length of this photographer, from photos that see works on more than one wall
    f_mid = float(np.median(list(f0.values())))
    ties = []
    if tie_fn and len([c for c in comps if c['cams']]) > 1:            # pieces that share no work: join them by the walls
        ties = tie_fn()
        comps = merge([c for c in comps if c['cams']], ties, obs, f0, list(shapes), log)
    groups = []
    for comp in comps:
        if not comp['cams']:
            continue
        mine = [t for t in ties if sum(p in comp['cams'] for p in t) >= 2] if len(comp['works']) > 0 and ties else []
        cams, works, rms, errs, mine = bundle_adjust(obs, f0, comp, shapes, f_mid=f_mid, ties=mine)
        bad = [k for k, e in errs.items() if e > max(25.0, 4 * rms)]
        if bad:
            log(f"  dropping {len(bad)} doubtful matches: {bad}")
            obs = [o for o in obs if (o['photo'], o['work']) not in bad]
            cams = {p: c for p, c in cams.items() if any(o['photo'] == p for o in obs) or any(p in t for t in mine)}
            works = {t: w for t, w in works.items() if any(o['work'] == t for o in obs)}
            cams, works, rms, errs, mine = bundle_adjust(obs, f0, as_comp(cams, works), shapes, f_mid=f_mid, ties=mine)
        # into a frame with y up and the walls along x and z, then solved again with the gallery priors
        Rg = gravity_frame(works, cams)
        apply_frame(Rg, works, cams)
        fs = {p: c['f'] for p, c in cams.items()}
        pps = {p: c['pp'] / max(shapes[p]) for p, c in cams.items()}
        cams, works, rms, errs, _ = bundle_adjust(obs, fs, as_comp(cams, works), shapes, gravity=True, f_mid=f_mid, pp0=pps, size_sigma=size_sigma, ties=mine)
        flat = flat_views(obs, cams, works, sizes)
        if flat and len(flat) < len(cams):
            # once more, those photos' lens held to the typical one (from the photos that see the room in depth)
            log(f"  {len(flat)} photo(s) see one wall only, square on: their lens is held to the others'")
            f_deep = float(np.median([c['f'] for p, c in cams.items() if p not in flat]))
            fs = {p: (f_deep if p in flat else c['f']) for p, c in cams.items()}
            pps = {p: c['pp'] / max(shapes[p]) for p, c in cams.items()}
            cams, works, rms, errs, _ = bundle_adjust(obs, fs, as_comp(cams, works), shapes, gravity=True, f_mid=f_deep, pp0=pps, size_sigma=size_sigma, ties=mine, f_tight=flat)
        Rg = gravity_frame(works, cams)
        apply_frame(Rg, works, cams)
        groups.append({'cams': cams, 'works': works, 'rms_px': rms, 'errs': errs})
        log(f"  group: {len(cams)} photos, {len(works)} works, reprojection rms {rms:.1f} px")
    groups.sort(key=lambda g: (-len(g['works']), -len(g['cams'])))
    return groups, sizes
