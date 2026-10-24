"""Fill the parts of a surface no photo saw (or saw only at a grazing, smeared angle) from what is around
them, with LaMa, a large-mask inpainting network (Suvorov et al. 2022, Apache 2.0), as published in
OpenCV's model zoo. It runs on the CPU through OpenCV itself. The model (92 MB) is downloaded once into
the cache; without it, a plain inpaint is used instead."""
import urllib.request
import cv2
import numpy as np
from pathlib import Path

URL = 'https://media.githubusercontent.com/media/opencv/opencv_zoo/main/models/inpainting_lama/inpainting_lama_2025jan.onnx'
MODEL = Path(__file__).resolve().parents[1] / '.cache' / 'inpainting_lama_2025jan.onnx'
WIN = 512
_net = None


def net():
    global _net
    if _net is None:
        try:
            if not MODEL.exists() or MODEL.stat().st_size < 50_000_000:
                MODEL.parent.mkdir(parents=True, exist_ok=True)
                urllib.request.urlretrieve(URL, MODEL)
            _net = cv2.dnn.readNetFromONNX(str(MODEL))
        except Exception as e:                                    # no network, no model: fall back
            print(f'    (inpainting model unavailable: {e}; using a plain fill)')
            _net = False
    return _net


def lama(img, mask):
    """One 512 x 512 window: img BGR uint8, mask 1 where to fill."""
    n = net()
    blob = cv2.dnn.blobFromImage(img, 1 / 255.0, (WIN, WIN), (0, 0, 0), False, False)
    m = cv2.dnn.blobFromImage(mask.astype(np.float32), 1.0, (WIN, WIN), (0,), False, False)
    n.setInput(blob, 'image'); n.setInput((m > 0).astype(np.float32), 'mask')
    out = n.forward()[0].transpose(1, 2, 0)
    return np.clip(out, 0, 255).astype(np.uint8)


def fill(img, miss, work_scale=None):
    """img with the pixels in miss filled. The network sees the surface at a scale where a window holds
    enough context (about 2.5 m of wall); its result is used for the missing pixels only."""
    if not miss.any() or miss.all() or not net():
        return None
    H, W = miss.shape
    s = work_scale or min(1.0, 1100 / max(H, W))
    small = cv2.resize(img, (max(WIN, int(W * s)), max(WIN // 2, int(H * s))), interpolation=cv2.INTER_AREA)
    sm = cv2.resize(miss.astype(np.uint8), (small.shape[1], small.shape[0]), interpolation=cv2.INTER_NEAREST) > 0
    sm = cv2.dilate(sm.astype(np.uint8), np.ones((5, 5), np.uint8)) > 0
    h, w = sm.shape
    pad_h, pad_w = max(0, WIN - h), max(0, WIN - w)
    work = cv2.copyMakeBorder(small, 0, pad_h, 0, pad_w, cv2.BORDER_REFLECT)
    # the padding mirrors the surface, holes included: those mirrored holes are holes too, not dark areas
    todo = np.pad(sm, ((0, pad_h), (0, pad_w)), mode='symmetric')
    Hp, Wp = todo.shape
    step = WIN * 3 // 4
    ys = list(range(0, max(1, Hp - WIN + 1), step)) + [Hp - WIN]
    xs = list(range(0, max(1, Wp - WIN + 1), step)) + [Wp - WIN]
    # the windows with the most known context first, so later ones build on filled neighbours
    wins = sorted({(y, x) for y in ys for x in xs}, key=lambda yx: todo[yx[0]:yx[0] + WIN, yx[1]:yx[1] + WIN].mean())
    for y, x in wins:
        m = todo[y:y + WIN, x:x + WIN]
        if not m.any():
            continue
        out = lama(work[y:y + WIN, x:x + WIN], m)
        patch = work[y:y + WIN, x:x + WIN]
        patch[m] = out[m]
        todo[y:y + WIN, x:x + WIN] = False
        # keep the mirrored margin in step with what was just filled
        if pad_h: work[h:] = cv2.flip(work[2 * h - work.shape[0]:h], 0) if 2 * h >= work.shape[0] else work[h:]
        if pad_w: work[:, w:] = cv2.flip(work[:, 2 * w - work.shape[1]:w], 1) if 2 * w >= work.shape[1] else work[:, w:]
    filled = cv2.resize(work[:h, :w], (W, H), interpolation=cv2.INTER_CUBIC)
    return filled
