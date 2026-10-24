"""Find the paintings in an installation photo and return each one's four corners in pixels.

Paintings are found as large saturated or dark regions on the white wall; each region's outline is
reduced to the quadrilateral that best fits it. Usage: python3 detect.py photo.jpg out.png"""
import sys
import cv2
import numpy as np


def quads(path, min_area=2500):
    img = cv2.imread(path)
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    s, v = hsv[..., 1].astype(int), hsv[..., 2].astype(int)
    mask = ((s > 38) | (v < 150)).astype(np.uint8) * 255
    # drop the floor and baseboard: the warm band at the bottom of every wall
    h, w = mask.shape
    floorish = ((hsv[..., 0] > 5) & (hsv[..., 0] < 25) & (s > 40) & (s < 140) & (v > 60) & (v < 200)).astype(np.uint8)
    mask[floorish > 0] = 0
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, np.ones((9, 9), np.uint8))
    mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, np.ones((5, 5), np.uint8))
    n, lab, stats, _ = cv2.connectedComponentsWithStats(mask)
    out = []
    for i in range(1, n):
        x, y, bw, bh, area = stats[i]
        if area < min_area or bw > w * 0.6 or bh > h * 0.85 or bw < 25 or bh < 25:
            continue
        comp = (lab == i).astype(np.uint8)
        cnts, _ = cv2.findContours(comp, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
        hull = cv2.convexHull(max(cnts, key=cv2.contourArea)).reshape(-1, 2).astype(float)
        if cv2.contourArea(hull.astype(np.float32)) / (bw * bh) < 0.55:
            continue
        # corners: extreme points along the four diagonal directions
        tl = hull[np.argmin(hull[:, 0] + hull[:, 1])]; br = hull[np.argmax(hull[:, 0] + hull[:, 1])]
        tr = hull[np.argmax(hull[:, 0] - hull[:, 1])]; bl = hull[np.argmin(hull[:, 0] - hull[:, 1])]
        out.append({'box': [int(x), int(y), int(bw), int(bh)], 'quad': [tl.tolist(), tr.tolist(), br.tolist(), bl.tolist()]})
    out.sort(key=lambda q: q['box'][0])
    return img, out


if __name__ == '__main__':
    img, qs = quads(sys.argv[1])
    for k, q in enumerate(qs):
        pts = np.array(q['quad'], np.int32)
        cv2.polylines(img, [pts], True, (0, 0, 255), 4)
        cv2.putText(img, str(k), tuple(pts[0] + [8, 40]), cv2.FONT_HERSHEY_SIMPLEX, 1.6, (0, 0, 255), 4)
        print(k, [[round(a) for a in p] for p in q['quad']])
    cv2.imwrite(sys.argv[2], img)
