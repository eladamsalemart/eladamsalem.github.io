"""The inputs: an exhibition's installation photos, and each work's image and real size."""
import json, re
from pathlib import Path
import cv2
import numpy as np
from .matte import matte, core

ROOT = Path(__file__).resolve().parents[4]          # the repository
APP = ROOT / 'studio' / 'app'


def size_pairs(w):
    """Every 'a x b' pair recorded for a work, the description's first (same rule as the app)."""
    text = (w.get('description') or '') + ' ' + (w.get('size') or '')
    return [(float(a), float(b)) for a, b in re.findall(r'(\d+(?:\.\d+)?)\s*[x×X]\s*(\d+(?:\.\d+)?)', text)]


def resolve(path):
    """A site path ('/media/...') or a path inside the app ('data/spaces/...')."""
    return ROOT / path.lstrip('/') if path.startswith('/') else APP / path


def load_image(path, edge=None):
    img = cv2.imread(str(resolve(path)), cv2.IMREAD_COLOR)
    if img is None:
        raise FileNotFoundError(path)
    if edge and max(img.shape[:2]) > edge:
        s = edge / max(img.shape[:2])
        img = cv2.resize(img, None, fx=s, fy=s, interpolation=cv2.INTER_AREA)
    return img


def oriented_size(pairs, aspect):
    """(width, height) in cm whose shape best fits the image's aspect (width / height), and the misfit."""
    best = None
    for a, b in pairs:
        for wd, h in ((a, b), (b, a)):
            err = abs((wd / h) / aspect - 1)
            if best is None or err < best[2]:
                best = (wd, h, err)
    return best


def load_exhibition(slug):
    """Exhibition record with its photos and works (image, size in cm, how well the size fits the image)."""
    studio = json.load(open(APP / 'data' / 'studio.json', encoding='utf-8'))
    shows = json.load(open(ROOT / 'content' / 'exhibitions.json', encoding='utf-8'))
    works = json.load(open(ROOT / 'content' / 'works.json', encoding='utf-8'))
    by_title = {w['title'].strip().lower(): w for w in works}
    ex = studio['exhibitions'][slug] if slug in studio['exhibitions'] else next(
        v for k, v in studio['exhibitions'].items() if re.sub(r'\W+', '-', k.lower()).strip('-') == slug)
    title = next(k for k, v in studio['exhibitions'].items() if v is ex)
    show = next(s for s in shows if s['title'] == title)
    out = {'title': title, 'slug': slug, 'photos': show.get('images', []), 'works': [], 'missing': []}
    for name in ex['works'] + (ex.get('maybe') or []):
        w = by_title.get(name.strip().lower())
        if not w or not w.get('image'):
            out['missing'].append(name)
            continue
        img = load_image(w['image'])
        image, cut = w['image'], None
        alpha, box = matte(img)
        if alpha is not None:
            # photographed against a backdrop: the work is what is inside it
            x0, y0, x1, y1 = box
            img = img[y0:y1, x0:x1]; a = alpha[y0:y1, x0:x1]
            rel = f'data/spaces/{slug}/works/{slugify(w["title"])}.png'
            (APP / rel).parent.mkdir(parents=True, exist_ok=True)
            cv2.imwrite(str(APP / rel), np.dstack([img, a]), [cv2.IMWRITE_PNG_COMPRESSION, 9])
            image, cut = rel, {'core': [round(float(v), 4) for v in core(alpha, box)], 'from': w['image']}
        h, wd = img.shape[:2]
        pairs = size_pairs(w)
        if cut:
            # the recorded size is the canvas's body; parts standing out of it come on top
            c0, c1, c2, c3 = cut['core']
            size = oriented_size(pairs, wd * (c2 - c0) / (h * (c3 - c1))) if pairs else None
            if size:
                size = (size[0] / (c2 - c0), size[1] / (c3 - c1), size[2])
        else:
            size = oriented_size(pairs, wd / h) if pairs else None
        out['works'].append({'title': w['title'], 'image': image, 'cutout': cut, 'listed': name in ex['works'],
                             'size_cm': size[:2] if size else None, 'size_misfit': size[2] if size else None,
                             'pixels': (wd, h)})
    return out


def slugify(title):
    return re.sub(r'[^a-z0-9]+', '-', title.lower()).strip('-')
