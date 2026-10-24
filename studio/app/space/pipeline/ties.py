"""Tie points: the same spot of the room seen in two photos (a mark on the wall, a door's edge, a corner,
a work that wasn't recognised), found by matching the photos to each other.

The works alone join photos only where two photos share a work. A walk-through video, or a room
photographed one wall at a time, falls apart into pieces that way; the walls between the works join them."""
import cv2
import numpy as np
from .match import features, PHOTO_EDGE
from .works import load_image

PER_PAIR = 80           # tie points kept from one pair of photos, spread over the picture
MIN_PAIR = 25           # fewer agreeing points than this: the two photos don't share a view
NEAR = 3                # with many photos (a video's frames, in order), each is matched to the next few


def pair_matches(fa, fb):
    """Indices (ia, ib) of points that match both ways and agree with one camera geometry."""
    pa, da = fa; pb, db = fb
    if da is None or db is None or len(da) < MIN_PAIR or len(db) < MIN_PAIR:
        return None
    bf = cv2.BFMatcher(cv2.NORM_L2)
    ab = bf.knnMatch(da, db, k=2); ba = bf.match(db, da)
    back = {m.queryIdx: m.trainIdx for m in ba}
    good = [(m.queryIdx, m.trainIdx) for m, n in (x for x in ab if len(x) == 2)
            if m.distance < 0.8 * n.distance and back.get(m.trainIdx) == m.queryIdx]
    if len(good) < MIN_PAIR:
        return None
    ia, ib = np.array(good).T
    F, inl = cv2.findFundamentalMat(pa[ia], pb[ib], cv2.USAC_MAGSAC, 1.5, 0.999, 10000)
    if F is None or inl is None or inl.sum() < MIN_PAIR:
        return None
    keep = inl.ravel().astype(bool)
    ia, ib = ia[keep], ib[keep]
    # spread over the picture: at most one point per cell of an 8 x 8 grid, then the best PER_PAIR
    h = max(pa[:, 1].max(), 1); w = max(pa[:, 0].max(), 1)
    cell = (pa[ia, 1] * 8 // (h + 1)).astype(int) * 8 + (pa[ia, 0] * 8 // (w + 1)).astype(int)
    _, first = np.unique(cell, return_index=True)
    rest = np.setdiff1d(np.arange(len(ia)), first)
    order = np.r_[first, rest][:PER_PAIR]
    return ia[order], ib[order]


def find_ties(photos, log=print):
    """Tracks of tie points: [{photo: (x, y) pixels, centred on the picture}], each seen in two photos or more."""
    imgs = {p: load_image(p, PHOTO_EDGE) for p in photos}
    feats = {p: features(img) for p, img in imgs.items()}
    n = len(photos)
    pairs = [(i, j) for i in range(n) for j in range(i + 1, n) if n <= 12 or j - i <= NEAR]
    parent = {}

    def root(k):
        while parent.setdefault(k, k) != k:
            parent[k] = parent[parent[k]]; k = parent[k]
        return k
    linked = 0
    for i, j in pairs:
        m = pair_matches(feats[photos[i]], feats[photos[j]])
        if m is None:
            continue
        linked += 1
        for a, b in zip(*m):
            parent[root((i, int(a)))] = root((j, int(b)))
    tracks = {}
    for k in parent:
        tracks.setdefault(root(k), []).append(k)
    out = []
    for members in tracks.values():
        by = {}
        for i, a in members:
            by.setdefault(i, []).append(a)
        if len(by) < 2 or any(len(v) > 1 for v in by.values()):        # a track seen twice in one photo is a mismatch
            continue
        t = {}
        for i, (a,) in by.items():
            p = photos[i]; h, w = imgs[p].shape[:2]
            t[p] = feats[p][0][a] - np.array([w / 2, h / 2])
        out.append(t)
    log(f"  tie points: {len(out)} spots seen in two photos or more, {linked} of {len(pairs)} pairs of photos share a view")
    return out
