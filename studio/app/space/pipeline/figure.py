"""A real person, for scale in every walkable space: a photo of someone standing, cut out of its background.

    python -m studio.app.space.pipeline.figure photo.jpg     # writes studio/app/data/figure.png

The photo: the whole person standing straight, head to feet, against a plain wall, in even light. The viewer
shows them 175 cm tall, feet on the floor, beside the work in view (in place of its drawn figure)."""
import sys
import cv2
import numpy as np
from .works import APP


def cut_out(img):
    """The person as RGBA, cropped head to feet: GrabCut, started from the frame's middle as the person."""
    h, w = img.shape[:2]
    s = min(1.0, 1200 / max(h, w))
    small = cv2.resize(img, None, fx=s, fy=s, interpolation=cv2.INTER_AREA) if s < 1 else img.copy()
    sh, sw = small.shape[:2]
    mask = np.zeros((sh, sw), np.uint8)
    rect = (int(sw * 0.12), int(sh * 0.02), int(sw * 0.76), int(sh * 0.96))
    bg, fg = np.zeros((1, 65), np.float64), np.zeros((1, 65), np.float64)
    cv2.grabCut(small, mask, rect, bg, fg, 6, cv2.GC_INIT_WITH_RECT)
    person = np.isin(mask, (cv2.GC_FGD, cv2.GC_PR_FGD)).astype(np.uint8)
    # one person: the largest piece, holes filled
    n, lbl, st, _ = cv2.connectedComponentsWithStats(person, connectivity=8)
    if n <= 1:
        raise ValueError('no person found in the photo')
    person = (lbl == 1 + int(np.argmax(st[1:, cv2.CC_STAT_AREA]))).astype(np.uint8)
    inv = 1 - person
    ff = np.zeros((sh + 2, sw + 2), np.uint8); cv2.floodFill(inv, ff, (0, 0), 2)
    person = person | (inv == 1)
    alpha = cv2.resize(person * 255, (w, h), interpolation=cv2.INTER_LINEAR)
    alpha = cv2.GaussianBlur(alpha, (0, 0), 1.0)
    ys, xs = np.nonzero(alpha > 127)
    y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    return np.dstack([img, alpha])[y0:y1, x0:x1]


def main(argv):
    img = cv2.imread(argv[0], cv2.IMREAD_COLOR)
    if img is None:
        raise SystemExit(f"can't read {argv[0]}")
    out = cut_out(img)
    if out.shape[0] > 1600:
        out = cv2.resize(out, (int(out.shape[1] * 1600 / out.shape[0]), 1600), interpolation=cv2.INTER_AREA)
    cv2.imwrite(str(APP / 'data' / 'figure.png'), out)
    print(f'figure: {out.shape[1]} x {out.shape[0]} px -> studio/app/data/figure.png')


if __name__ == '__main__':
    main(sys.argv[1:])
