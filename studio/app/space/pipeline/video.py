"""A walk-through video as installation photos: the sharp frames that, together, see every wall.

A slow walk round the room, a minute or two, filming every wall, is the surest way to a walkable space: far
more views than a handful of photos, overlapping all the way round. This picks frames from it (sharp ones,
never two of nearly the same view) and hands them to the pipeline exactly as photos are.

In studio.json an exhibition can name its video: "video": "/media/videos/ritual-walk.mp4".
"""
import hashlib
from pathlib import Path
import cv2
import numpy as np
from .works import APP, resolve

FRAMES = APP / 'space' / '.cache' / 'frames'
MAX_FRAMES = 60           # enough to see every wall from two sides, overlapping; more mostly adds time
KEEP = 0.5                # a new keyframe once the last one shares less than this much of the view
EDGE = 2000               # frames are kept at most this large, like photos


def sharpness(gray):
    return float(cv2.Laplacian(gray, cv2.CV_32F).var())


def frames(video, log=print):
    """Paths (relative to the app) of the frames picked from a video, extracting them once."""
    src = resolve(video)
    key = hashlib.sha1(f'{video}:{src.stat().st_size}:keyframes5'.encode()).hexdigest()[:12]
    out = FRAMES / key
    done = sorted(out.glob('f*.jpg'))
    if done:
        return [str(p.relative_to(APP)) for p in done]
    cap = cv2.VideoCapture(str(src))
    fps = cap.get(cv2.CAP_PROP_FPS) or 30
    step = max(1, int(round(fps / 8)))                  # look at 8 frames a second (turning, views change fast)
    cands, i = [], 0
    while True:
        ok = cap.grab()
        if not ok:
            break
        if i % step == 0:
            ok, f = cap.retrieve()
            if ok:
                s = min(1.0, 480 / max(f.shape[:2]))
                g = cv2.cvtColor(cv2.resize(f, None, fx=s, fy=s, interpolation=cv2.INTER_AREA), cv2.COLOR_BGR2GRAY)
                cands.append((i, sharpness(g), g))
        i += 1
    if not cands:
        raise ValueError(f'no frames in {video}')
    # in each quarter of a second keep the sharpest (the camera's shake blurs the rest), and drop a
    # frame only if it is much blurrier than those round it: a frame of bare wall has little texture, but it is
    # the bridge from one work to the next
    best = []
    for k in range(0, len(cands), 2):
        best.append(max(cands[k:k + 2], key=lambda c: c[1]))
    sh = np.array([c[1] for c in best])
    local = np.array([np.median(sh[max(0, k - 3):k + 4]) for k in range(len(sh))])
    best = [c for c, s, m in zip(best, sh, local) if s >= 0.5 * m]
    # keyframes: the next one is the last frame that still overlaps the one before by KEEP, so the
    # frames chain round the room (photos are joined through what they share)
    orb = cv2.ORB_create(800)
    bf = cv2.BFMatcher(cv2.NORM_HAMMING, crossCheck=True)
    feats = [orb.detectAndCompute(g, None) for _, _, g in best]

    def overlap(i, j):
        (ka, da), (kb, db) = feats[i], feats[j]
        if da is None or db is None or not len(ka) or not len(kb):
            return 0.0
        return len(bf.match(da, db)) / max(len(ka), len(kb))      # (a bare wall's few points don't overlap everything)
    keep, last = [0], 0
    for k in range(1, len(best)):
        if overlap(last, k) < KEEP:
            if k - 1 > last:                               # the frame before still overlapped: it is the next keyframe
                keep.append(k - 1); last = k - 1
            if overlap(last, k) < KEEP:                    # a jump the video doesn't bridge: start again from here
                keep.append(k); last = k
    picked = [best[k][0] for k in keep]
    if len(picked) > MAX_FRAMES:                         # evenly over the walk
        picked = [picked[int(j)] for j in np.linspace(0, len(picked) - 1, MAX_FRAMES)]
    out.mkdir(parents=True, exist_ok=True)
    paths = []
    for n, idx in enumerate(picked):
        cap.set(cv2.CAP_PROP_POS_FRAMES, idx)
        ok, f = cap.read()
        if not ok:
            continue
        s = min(1.0, EDGE / max(f.shape[:2]))
        if s < 1:
            f = cv2.resize(f, None, fx=s, fy=s, interpolation=cv2.INTER_AREA)
        p = out / f'f{n:03d}.jpg'
        cv2.imwrite(str(p), f, [cv2.IMWRITE_JPEG_QUALITY, 94])
        paths.append(str(p.relative_to(APP)))
    log(f'  video: {len(paths)} frames picked from {i} ({i / fps:.0f} s)')
    return paths
