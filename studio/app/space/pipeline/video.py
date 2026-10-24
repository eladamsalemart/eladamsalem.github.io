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
EDGE = 2000               # frames are kept at most this large, like photos


def sharpness(gray):
    return float(cv2.Laplacian(gray, cv2.CV_32F).var())


def frames(video, log=print):
    """Paths (relative to the app) of the frames picked from a video, extracting them once."""
    src = resolve(video)
    key = hashlib.sha1(f'{video}:{src.stat().st_size}'.encode()).hexdigest()[:12]
    out = FRAMES / key
    done = sorted(out.glob('f*.jpg'))
    if done:
        return [str(p.relative_to(APP)) for p in done]
    cap = cv2.VideoCapture(str(src))
    fps = cap.get(cv2.CAP_PROP_FPS) or 30
    step = max(1, int(round(fps / 4)))                  # look at 4 frames a second
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
    # in each stretch of about half a second keep the sharpest (the camera's shake blurs the rest)
    best = []
    for k in range(0, len(cands), 2):
        best.append(max(cands[k:k + 2], key=lambda c: c[1]))
    sharp_floor = np.percentile([c[1] for c in best], 30)
    best = [c for c in best if c[1] >= sharp_floor]
    # never two of nearly the same view, yet each still overlapping the last, so the frames chain round the room
    # (photos are joined through what they share): a new frame once about a third of the view has moved on
    orb = cv2.ORB_create(800)
    picked, last = [], None
    for idx, s, g in best:
        kp, des = orb.detectAndCompute(g, None)
        if last is None or des is None or last[1] is None:
            picked.append(idx); last = (kp, des); continue
        m = cv2.BFMatcher(cv2.NORM_HAMMING, crossCheck=True).match(last[1], des)
        if len(m) < 0.6 * min(len(last[0]), len(kp)):
            picked.append(idx); last = (kp, des)
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
