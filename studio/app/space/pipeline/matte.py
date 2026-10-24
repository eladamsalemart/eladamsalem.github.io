"""A work's image without the backdrop it was photographed against.

Some works are photographed with a margin of wall or paper around them (a shaped canvas, a piece with parts
standing out beyond its edge). Shown as a plain rectangle, that margin would hang on the wall as a pale panel
around the work. The margin is the even, untextured colour that runs in from the image's edge; whatever is
painted, however pale, has texture, so it stays."""
import cv2
import numpy as np

RING = 0.012          # the image's outer ring, as a share of its long edge
EVEN_RING = 0.55      # share of the ring that must be even backdrop before anything is cut
DE = 9.0              # how far (Lab) from the backdrop's colour a pixel may be and still be backdrop
SIDE = 0.4            # share of a side's ring that must be backdrop for that side to count
FLAT = 2.2            # the most texture (Lab gradient) backdrop may carry


def matte(img):
    """(alpha, box): alpha is 255 on the work and 0 on the backdrop, at the image's size; box is the work's
    bounding box (x0, y0, x1, y1). (None, None) when the image is the work edge to edge."""
    h0, w0 = img.shape[:2]
    s = min(1.0, 900 / max(h0, w0))
    small = cv2.resize(img, None, fx=s, fy=s, interpolation=cv2.INTER_AREA) if s < 1 else img.copy()
    h, w = small.shape[:2]
    lab = cv2.cvtColor(cv2.GaussianBlur(small, (0, 0), 1.2), cv2.COLOR_BGR2LAB).astype(np.float32)
    lab[..., 0] *= 100 / 255; lab[..., 1:] -= 128
    gx = cv2.Sobel(lab, cv2.CV_32F, 1, 0, ksize=3) / 8; gy = cv2.Sobel(lab, cv2.CV_32F, 0, 1, ksize=3) / 8
    grad = np.sqrt((gx ** 2 + gy ** 2).sum(-1))
    grad = cv2.GaussianBlur(grad, (0, 0), 1.5)

    r = max(2, int(RING * max(h, w)))
    ring = np.zeros((h, w), bool); ring[:r] = ring[-r:] = True; ring[:, :r] = ring[:, -r:] = True
    # a backdrop may shade from one side to the other: compare each pixel with the ring colour nearest it
    flat = grad < FLAT
    if (flat & ring).mean() / ring.mean() < EVEN_RING:
        return None, None
    ring_lab = lab[ring & flat]
    base = np.median(ring_lab, 0)
    near = np.linalg.norm(lab - base, axis=-1) < DE * 2.2
    # spread from the ring through flat pixels whose colour stays close to their neighbours'
    cand = (flat & near).astype(np.uint8)
    n, lbl = cv2.connectedComponents(cand, connectivity=4)
    touch = np.unique(lbl[ring & (cand > 0)])
    back = np.isin(lbl, touch[touch > 0])
    # each region's colour must be one even backdrop, not a pale passage of the painting reaching the edge
    keep = np.zeros_like(back)
    for k in touch[touch > 0]:
        m = lbl == k
        if m.sum() < 0.002 * h * w:
            continue
        spread = np.percentile(np.linalg.norm(lab[m] - np.median(lab[m], 0), axis=-1), 90)
        if spread < DE:
            keep |= m
    back = keep
    if back.mean() < 0.01:
        return None, None
    # a backdrop surrounds the work: it runs along every side, and along most of three at least. A pale corner or a white
    # passage along one edge is the painting itself (or its bare canvas), and stays
    sides = [back[:r].mean(), back[-r:].mean(), back[:, :r].mean(), back[:, -r:].mean()]
    if sum(f >= SIDE for f in sides) < 3 or min(sides) < 0.15:
        return None, None
    back = cv2.morphologyEx(back.astype(np.uint8), cv2.MORPH_OPEN, np.ones((3, 3), np.uint8)) > 0
    work = ~back
    # the work is one piece: keep its largest part, and fill any hole inside it
    n, lbl, st, _ = cv2.connectedComponentsWithStats(work.astype(np.uint8), connectivity=8)
    if n <= 1:
        return None, None
    big = 1 + int(np.argmax(st[1:, cv2.CC_STAT_AREA]))
    work = lbl == big
    ff = np.zeros((h + 2, w + 2), np.uint8)
    inv = (~work).astype(np.uint8)
    cv2.floodFill(inv, ff, (0, 0), 2)
    work = work | (inv == 1)
    if work.mean() > 0.985:
        return None, None
    alpha = cv2.resize(work.astype(np.uint8) * 255, (w0, h0), interpolation=cv2.INTER_LINEAR)
    alpha = cv2.GaussianBlur(alpha, (0, 0), max(0.6, 0.6 / s))
    alpha = np.where(alpha > 127, 255, 0).astype(np.uint8)
    alpha = cv2.GaussianBlur(alpha, (0, 0), 0.7)                 # a soft, not jagged, edge
    ys, xs = np.nonzero(alpha > 127)
    return alpha, (int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1)


def core(alpha, box, full=0.985):
    """The rectangle of the work that is solid canvas edge to edge (rows and columns at least `full` work):
    a shaped piece's body, without what stands out of it. Returned as fractions of the box."""
    x0, y0, x1, y1 = box
    a = alpha[y0:y1, x0:x1] > 127
    rows = np.nonzero(a.mean(1) >= full * a.mean(1).max())[0]
    cols = np.nonzero(a[rows.min():rows.max() + 1].mean(0) >= full)[0]
    H, W = a.shape
    if not len(rows) or not len(cols):
        return [0, 0, 1, 1]
    return [cols.min() / W, rows.min() / H, (cols.max() + 1) / W, (rows.max() + 1) / H]
