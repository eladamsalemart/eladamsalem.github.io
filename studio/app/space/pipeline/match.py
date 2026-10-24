"""Find each work in each installation photo by matching it against the work's own image.

The work's image is the strongest clue there is: its features (SIFT) are matched to the photo, and a
homography from the work's image to the photo gives the work's four corners and many interior points,
far more precisely than segmenting by colour."""
import cv2
import numpy as np
from .works import load_image

WORK_EDGE = 1400        # work images are matched at this size
PHOTO_EDGE = 2000
MIN_INLIERS = 18

_sift = None


def sift():
    global _sift
    if _sift is None:
        _sift = cv2.SIFT_create(nfeatures=12000, contrastThreshold=0.02)
    return _sift


def root_sift(desc):
    desc = desc / (np.abs(desc).sum(axis=1, keepdims=True) + 1e-7)
    return np.sqrt(desc).astype(np.float32)


def features(img):
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    gray = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8)).apply(gray)
    kp, desc = sift().detectAndCompute(gray, None)
    if desc is None:
        return np.zeros((0, 2), np.float32), None
    return np.float32([k.pt for k in kp]), root_sift(desc)


def convex_ok(quad, shape):
    """A plausible picture of a flat rectangle: convex, not tiny, not absurdly skewed."""
    q = quad.reshape(4, 2)
    if not cv2.isContourConvex(q.astype(np.float32)):
        return False
    area = cv2.contourArea(q.astype(np.float32))
    if area < 0.0015 * shape[0] * shape[1]:
        return False
    sides = [np.linalg.norm(q[i] - q[(i + 1) % 4]) for i in range(4)]
    return min(sides) > 12 and max(sides) / min(sides) < 25


# A work on a side wall is seen at a steep angle, which plain SIFT does not survive. So each work is also
# matched as it would look turned away (narrowed, with its far edge shorter), and the matches are mapped
# back to the work's own image (the idea behind ASIFT).
VIEWS = [(1.0, 1.0)] + [(c, k) for c in (0.6, 0.35, 0.2) for k in (0.82, 1 / 0.82)]


def work_views(img):
    """Features of the work seen head-on and turned: [(points in the original image, descriptors)]."""
    h, w = img.shape[:2]
    out = []
    for c, k in VIEWS:
        if c == 1.0:
            out.append(features(img))
            continue
        # turned about its vertical axis: width shrinks to c, one edge shortens by k (perspective)
        lh, rh = (h, h * k) if k < 1 else (h / k, h)
        nw = max(8, int(w * c))
        dst = np.float32([[0, (h - lh) / 2], [nw, (h - rh) / 2], [nw, (h + rh) / 2], [0, (h + lh) / 2]])
        T = cv2.getPerspectiveTransform(np.float32([[0, 0], [w, 0], [w, h], [0, h]]), dst)
        view = cv2.warpPerspective(img, T, (nw, h), flags=cv2.INTER_AREA, borderMode=cv2.BORDER_REPLICATE)
        pts, desc = features(view)
        if desc is None or not len(pts):
            continue
        back = cv2.perspectiveTransform(pts.reshape(-1, 1, 2), np.linalg.inv(T)).reshape(-1, 2)
        out.append((back.astype(np.float32), desc))
    return out


def match_work(views, work_shape, photo_feat, photo_shape):
    """Homography work-image -> photo, with its inlier point pairs, or None."""
    pp, pd = photo_feat
    if pd is None or len(pd) < 8:
        return None
    flann = cv2.FlannBasedMatcher({'algorithm': 1, 'trees': 5}, {'checks': 64})
    src, dst = [], []
    for wp, wd in views:
        if wd is None or len(wd) < 8:
            continue
        pairs = flann.knnMatch(wd, pd, k=2)
        good = [m for m, n in (p for p in pairs if len(p) == 2) if m.distance < 0.8 * n.distance]
        src += [wp[m.queryIdx] for m in good]; dst += [pp[m.trainIdx] for m in good]
    if len(src) < MIN_INLIERS:
        return None
    src, dst = np.float32(src), np.float32(dst)
    H, mask = cv2.findHomography(src, dst, cv2.USAC_MAGSAC, 5.0, maxIters=10000, confidence=0.9999)
    if H is None:
        return None
    mask = mask.ravel().astype(bool)
    if mask.sum() < MIN_INLIERS:
        return None
    h, w = work_shape[:2]
    quad = cv2.perspectiveTransform(np.float32([[0, 0], [w, 0], [w, h], [0, h]]).reshape(-1, 1, 2), H).reshape(4, 2)
    if not convex_ok(quad, photo_shape):
        return None
    # refine on the inliers only (least squares), which is steadier than the RANSAC model
    H2, _ = cv2.findHomography(src[mask], dst[mask], 0)
    if H2 is not None:
        quad2 = cv2.perspectiveTransform(np.float32([[0, 0], [w, 0], [w, h], [0, h]]).reshape(-1, 1, 2), H2).reshape(4, 2)
        if convex_ok(quad2, photo_shape):
            H, quad = H2, quad2
    # how much of the work's surface is supported by matches (a match covering a corner only is weak)
    hull = cv2.convexHull(src[mask].astype(np.float32))
    coverage = cv2.contourArea(hull) / float(w * h)
    return {'H': H, 'quad': quad, 'inliers': int(mask.sum()), 'coverage': float(coverage),
            'src': src[mask] / [w, h], 'dst': dst[mask]}


def find_works(exhibition, log=print):
    """For every photo, which works appear and where: {photo: {title: match}}."""
    work_imgs = {w['title']: load_image(w['image'], WORK_EDGE) for w in exhibition['works']}
    work_feats = {t: work_views(img) for t, img in work_imgs.items()}
    found = {}
    for photo in exhibition['photos']:
        img = load_image(photo, PHOTO_EDGE)
        pf = features(img)
        hits = {}
        for t, wf in work_feats.items():
            m = match_work(wf, work_imgs[t].shape, pf, img.shape)
            if m and m['coverage'] > 0.08:
                hits[t] = m
        # two works can't occupy the same place: keep the better-supported one
        names = sorted(hits, key=lambda t: -hits[t]['inliers'])
        keep = []
        for t in names:
            q = hits[t]['quad'].astype(np.float32)
            if all(overlap(q, hits[k]['quad'].astype(np.float32)) < 0.3 for k in keep):
                keep.append(t)
        found[photo] = {t: hits[t] for t in keep}
        found[photo]['_shape'] = img.shape
        log(f"  {photo.split('/')[-1][:28]:28s} {len(keep)} works: " + ', '.join(f"{t} ({hits[t]['inliers']})" for t in keep))
    return found


def overlap(a, b):
    inter, _ = cv2.intersectConvexConvex(a, b)
    return inter / max(1.0, min(cv2.contourArea(a), cv2.contourArea(b)))
