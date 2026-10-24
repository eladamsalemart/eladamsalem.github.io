"""Measure the Ritual room from its installation photos, using the paintings as rulers.

Every painting has a known size, so its four corners in a photo give the camera's focal length and
its position relative to that painting. Two paintings seen in the same photo then give their exact
offset in 3D. All those offsets, from all photos, are solved together (linear least squares) for a
rectangular room: its width and length, and each painting's position along its wall and height.
Floor height comes from the top of the baseboard under each painting; ceiling and soffit from points
on the end wall. Run from the repo root: python3 studio/app/space/tools/measure.py"""
import json
import cv2
import numpy as np

PHOTO = 'media/works/jah-{}.jpg'
FILES = {'005': '005-1780915457989', '006': '006-1780915473909', '007': '007-1780915483464',
         '008': '008-1780915493251', '009': '009-1780915500705', '010': '010-1780915508773'}

# real size in cm, width x height (from the works' records, oriented to their photos)
SIZE = {'Gathering': (140, 170), 'Adam, Adam and a Lamp': (120, 70), 'Flowers 1': (30, 30), 'Flowers 2': (30, 30),
        'Flowers 3': (30, 30), 'Flowers trio': (98, 30.9), 'Woman': (90, 110), 'Ritual': (110, 130),
        'Human nature': (70, 90), 'Two': (100, 140), 'Woman and a gun': (120, 130)}
WALL = {'Gathering': 'A', 'Adam, Adam and a Lamp': 'L', 'Flowers 1': 'L', 'Flowers 2': 'L', 'Flowers 3': 'L',
        'Flowers trio': 'L', 'Woman': 'R', 'Ritual': 'R', 'Human nature': 'L', 'Two': 'R', 'Woman and a gun': 'B'}

# painting corners per photo (tl, tr, br, bl), from detect.py
SEEN = {
    '005': {'Adam, Adam and a Lamp': [[92, 456], [236, 488], [237, 691], [88, 728]],
            'Flowers trio': [[357, 544], [418, 554], [423, 615], [360, 611]],
            'Gathering': [[732, 481], [971, 481], [969, 784], [731, 781]],
            'Woman': [[1311, 485], [1370, 469], [1367, 775], [1312, 751]],
            'Ritual': [[1658, 298], [1922, 197], [1925, 990], [1654, 890]]},
    '006': {'Ritual': [[110, 370], [259, 412], [258, 759], [100, 817]],
            'Two': [[455, 468], [482, 472], [509, 705], [470, 719]],
            'Woman and a gun': [[776, 510], [931, 510], [930, 684], [777, 683]],
            'Human nature': [[1253, 483], [1288, 472], [1287, 679], [1253, 668]],
            'Adam, Adam and a Lamp': [[1580, 406], [1875, 325], [1897, 759], [1598, 722]]},
    '007': {'Gathering': [[82, 449], [372, 465], [372, 789], [82, 807]],
            'Woman': [[862, 488], [972, 473], [967, 757], [864, 745]],
            'Ritual': [[1504, 360], [1889, 292], [1889, 908], [1521, 861]]},
    # the three small Flowers are too small to measure alone; their outer corners make the trio
    '008': {'Adam, Adam and a Lamp': [[130, 330], [690, 332], [684, 671], [144, 695]],
            'Flowers trio': [[1438, 380], [1895, 382], [1889, 526], [1437, 524]]},
    '009': {'Ritual': [[110, 256], [514, 323], [512, 813], [100, 861]],
            'Two': [[1037, 424], [1100, 432], [1165, 753], [1061, 765]],
            'Woman and a gun': [[1640, 480], [1899, 469], [1899, 747], [1643, 736]]},
    '010': {'Two': [[109, 355], [182, 374], [252, 796], [138, 824]],
            'Woman and a gun': [[724, 478], [966, 478], [965, 749], [727, 748]],
            'Human nature': [[1690, 356], [1855, 301], [1882, 800], [1714, 775]]},
}

# painting frame -> room frame axes (x across the room, y up, z from wall A); columns = painting x, y, z(normal)
AXES = {'A': np.array([[1, 0, 0], [0, 1, 0], [0, 0, 1]]).T, 'B': np.array([[-1, 0, 0], [0, 1, 0], [0, 0, -1]]).T,
        'L': np.array([[0, 0, -1], [0, 1, 0], [1, 0, 0]]).T, 'R': np.array([[0, 0, 1], [0, 1, 0], [-1, 0, 0]]).T}
# picked by hand in photo 005: the top corners of wall A, and the soffit's underside where it meets wall A
END_WALL_TOP = [[495, 185], [1205, 195]]
SOFFIT_ON_A = [[690, 307], [1000, 305]]   # its two bottom corners (the light tracks run along its edges)
BASEBOARD_CM = 10.3   # measured in photo 008 against Adam, Adam and a Lamp (120 cm = 560 px)


PNP = {}   # per photo after main(): room-to-camera rotation, translation, intrinsics


def on_plane(pid, px, axis, value):
    """Where a pixel's ray meets a room plane (e.g. axis 0 = x, value -W/2 for wall L)."""
    R, t, K = PNP[pid]
    c = -R.T @ t; d = R.T @ np.linalg.inv(K) @ [px[0], px[1], 1]
    return c + d * (value - c[axis]) / d[axis]


def obj_points(name):
    w, h = SIZE[name]
    return np.array([[-w / 2, h / 2, 0], [w / 2, h / 2, 0], [w / 2, -h / 2, 0], [-w / 2, -h / 2, 0]], float)


def focal_from(H):
    """Focal length (px) implied by a plane-to-image homography with centred pixels and square pixels."""
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


def baseboard_top(img, quad):
    """Image points along the top of the baseboard below a painting (wall-to-baseboard edge)."""
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    q = np.array(quad, float)
    xs = np.linspace(q[3][0], q[2][0], 9)[1:-1]
    ybot = np.interp(xs, [q[3][0], q[2][0]], [q[3][1], q[2][1]])
    pts = []
    for x, y0 in zip(xs.astype(int), ybot.astype(int)):
        col = hsv[y0 + 15:, x]
        brown = (col[:, 0] > 4) & (col[:, 0] < 28) & (col[:, 1] > 45) & (col[:, 2] < 205)
        run = np.convolve(brown.astype(int), np.ones(6, int), 'valid')
        hit = np.argmax(run >= 6) if (run >= 6).any() else None
        if hit is not None: pts.append([x, y0 + 15 + hit])
    return np.array(pts, float)


def main():
    rows, rhs, report, cams, owner = [], [], {}, {}, []
    names = sorted({n for s in SEEN.values() for n in s})
    floor_obs = {n: [] for n in names}
    # unknowns: W, L, then per painting (u, y): u = along-wall position, y = centre height above the room origin
    idx = {n: 2 + 2 * k for k, n in enumerate(names)}
    nvar = 2 + 2 * len(names)

    def pos_terms(n):
        """Painting centre (x, y, z) in the room as linear terms over the unknowns (coef vectors + const)."""
        w = WALL[n]; c = np.zeros((3, nvar)); k = np.zeros(3)
        u, y = idx[n], idx[n] + 1
        c[1, y] = 1
        if w == 'A': c[0, u] = 1
        elif w == 'B': c[0, u] = -1; c[2, 1] = 1                       # z = L
        elif w == 'L': c[0, 0] = -0.5; c[2, u] = 1                     # x = -W/2
        elif w == 'R': c[0, 0] = 0.5; c[2, u] = 1                      # x = +W/2
        return c, k

    for pid, seen in SEEN.items():
        img = cv2.imread(PHOTO.format(FILES[pid]))
        hh, ww = img.shape[:2]; cx, cy = ww / 2, hh / 2
        fs = []
        for n, quad in seen.items():
            H, _ = cv2.findHomography(obj_points(n)[:, :2], np.array(quad, float) - [cx, cy])
            fs += focal_from(H)
        fs = [f for f in fs if 800 < f < 6000]
        f = float(np.median(fs)) if fs else 1800.0
        K = np.array([[f, 0, cx], [0, f, cy], [0, 0, 1]])
        poses = {}
        for n, quad in seen.items():
            ok, rv, tv = cv2.solvePnP(obj_points(n), np.array(quad, float), K, None, flags=cv2.SOLVEPNP_IPPE)
            R, _ = cv2.Rodrigues(rv); poses[n] = (R, tv.reshape(3))
            # floor: baseboard top mapped onto this painting's plane
            bt = baseboard_top(img, quad)
            if len(bt):
                Hp, _ = cv2.findHomography(obj_points(n)[:, :2], np.array(quad, float))
                plane = cv2.perspectiveTransform(bt.reshape(-1, 1, 2), np.linalg.inv(Hp)).reshape(-1, 2)
                floor_obs[n].append(float(np.median(plane[:, 1])) - BASEBOARD_CM)
        report[pid] = {'focal_px': round(f), 'focal_estimates': len(fs), 'size': [ww, hh]}
        cams[pid] = (f, poses, (cx, cy))
        # pairwise offsets, rotated into the room frame with each painting's known wall orientation
        ns = list(poses)
        for i in range(len(ns)):
            for j in range(i + 1, len(ns)):
                a, b = ns[i], ns[j]
                Ra, ta = poses[a]; Rb, tb = poses[b]
                d_cam = tb - ta
                # room-from-camera rotation, averaged from both paintings' orientations
                Mrc = AXES[WALL[a]] @ Ra.T + AXES[WALL[b]] @ Rb.T
                U, _, Vt = np.linalg.svd(Mrc); Rrc = U @ Vt
                d_room = Rrc @ d_cam / 100.0                           # metres
                ca, _ = pos_terms(a); cb, _ = pos_terms(b)
                wgt = 1.0 / max(1.0, np.linalg.norm(ta) / 600)         # nearer pairs are more reliable
                for k in range(3):
                    rows.append((cb[k] - ca[k]) * wgt); rhs.append(d_room[k] * wgt); owner.append(pid)
    # anchor: Gathering at the centre of wall A; heights from the floor observations
    for n in names:
        if floor_obs[n]:
            r = np.zeros(nvar); r[idx[n] + 1] = 1; rows.append(r * 3); rhs.append(-np.median(floor_obs[n]) / 100 * 3); owner.append('floor')
    r = np.zeros(nvar); r[idx['Gathering']] = 1; rows.append(r * 3); rhs.append(0); owner.append('anchor')
    A, b = np.array(rows), np.array(rhs)
    sol, *_ = np.linalg.lstsq(A, b, rcond=None)
    resid = A @ sol - b
    out = {'width': round(sol[0], 3), 'length': round(sol[1], 3), 'rms_m': round(float(np.sqrt(np.mean(resid ** 2))), 3), 'photos': report, 'works': {}}
    owner = np.array(owner)
    for pid in SEEN:
        report[pid]['rms_m'] = round(float(np.sqrt(np.mean(resid[owner == pid] ** 2))), 3)
    for n in names:
        out['works'][n] = {'wall': WALL[n], 'at': round(sol[idx[n]], 3), 'center': round(sol[idx[n] + 1], 3),
                           'floor_samples': len(floor_obs[n])}
    W, L = sol[0], sol[1]

    def centre(n):
        c, _ = pos_terms(n); return c @ sol

    def to_room(pid, n, R, t):
        """Room-from-camera rotation and camera position, from one painting's pose."""
        Rrc = AXES[WALL[n]] @ R.T
        return Rrc, centre(n) - Rrc @ t / 100.0

    # each photo's camera: one pose from all its paintings' corners at once (now that they have room positions),
    # with the focal length that best fits them. Gives the "Photos" views: position, direction, vertical fov.
    out['cameras'] = {}
    for pid, (f0, poses, (cx, cy)) in cams.items():
        P3 = np.vstack([centre(n) + (AXES[WALL[n]] @ obj_points(n).T).T / 100.0 for n in SEEN[pid]])
        P2 = np.vstack([np.array(SEEN[pid][n], float) for n in SEEN[pid]])
        best = None
        for f in np.linspace(f0 * 0.7, f0 * 1.4, 57):
            K = np.array([[f, 0, cx], [0, f, cy], [0, 0, 1]])
            ok, rv, tv = cv2.solvePnP(P3, P2, K, None, flags=cv2.SOLVEPNP_SQPNP)
            if not ok: continue
            err = np.sqrt(np.mean(np.sum((cv2.projectPoints(P3, rv, tv, K, None)[0].reshape(-1, 2) - P2) ** 2, axis=1)))
            if best is None or err < best[0]: best = (err, f, rv, tv)
        err, f, rv, tv = best
        R, _ = cv2.Rodrigues(rv)
        p = (-R.T @ tv).reshape(3); fwd = R.T @ [0, 0, 1]
        PNP[pid] = (R, tv.reshape(3), np.array([[f, 0, cx], [0, f, cy], [0, 0, 1]]))
        out['cameras'][pid] = {'pos': [round(float(v), 2) for v in p], 'look': [round(float(v), 2) for v in p + fwd * 4],
                               'fov': round(float(np.degrees(2 * np.arctan(cy / f))), 1), 'reproj_px': round(float(err), 1)}

    # ceiling and soffit, from points on wall A in photo 005 (mapped through Gathering's homography)
    q = np.array(SEEN['005']['Gathering'], float)
    Hg, _ = cv2.findHomography(obj_points('Gathering')[:, :2], q)
    def on_A(pts):
        return cv2.perspectiveTransform(np.array(pts, float).reshape(-1, 1, 2), np.linalg.inv(Hg)).reshape(-1, 2) / 100.0
    g = centre('Gathering')
    corners = on_A(END_WALL_TOP) + [g[0], g[1]]
    soffit = on_A(SOFFIT_ON_A) + [g[0], g[1]]
    out['ceiling'] = {'end_wall_top_corners_xy': corners.round(3).tolist(), 'height': round(float(corners[:, 1].mean()), 3),
                      'room_x_from_corners': round(float(corners[1, 0] - corners[0, 0]), 3),
                      'soffit_bottom': round(float(soffit[:, 1].mean()), 3),
                      'soffit_x': soffit[:, 0].round(3).tolist(), 'soffit_width': round(float(soffit[1, 0] - soffit[0, 0]), 3)}
    print(json.dumps(out, indent=1))
    return out


if __name__ == '__main__':
    main()
