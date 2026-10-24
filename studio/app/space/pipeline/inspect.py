"""Stage 2: the finished space is inspected in the app's own viewer before it may be published.

Stage 1 (build) measures the room and checks the measurement against the photos. This stage looks at the
result the way a visitor will: studio/app/space/inspect/render.cjs opens the space in the app on a phone-sized
screen and photographs it from every photo's camera, from where the walk starts, from a grid of places across
the room looking every way, and every work square on, up close and from each side. Each shot also comes as a
map of what every pixel shows (wall, floor, work...). Then every shot is checked for what a visitor would
notice; one failure and the space is not published:

- the space opens without errors, and every file it needs loads;
- nowhere does the room show a hole (the viewer's background is magenta during inspection);
- every work, square on, is the work: as sharp as its own image, in its own colours (no colour cast, no smear),
  whole (nothing in front of it, not sunk into the wall); up close it keeps its detail;
- the walls carry no trace of a work (a ghost of a painting baked into the wall) and no dark blotch;
- walls and floor have no smear (texture dragged into streaks);
- works hang where works can hang: on a wall (not in it, not floating), not over each other, between floor
  and ceiling.

    python -m studio.app.space.pipeline.inspect [slug ...]
"""
import json, shutil, socket, subprocess, sys, tempfile, threading, time
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import cv2
import numpy as np
from .works import ROOT, APP, resolve

OUT = APP / 'data' / 'spaces'
RENDER = APP / 'space' / 'inspect' / 'render.cjs'

RULES = {
    'holes': 0.0005,          # share of a shot that may show the background (none, but for edge pixels)
    'work_whole': 0.97,       # share of a work, square on, that must show the work itself
    'work_sharp': 0.82,       # a work square on against its own image: correlation of detail
    'work_near': 0.72,        # the same, up close
    'work_colour': 6.0,       # the most a part of a work may drift in colour from its image (Lab a/b units)
    'ghost': 0.0004,          # share of a shot that may be colour on a white wall where no work is
    'blotch': 0.0004,         # share of a shot that may be a dark blotch on a wall
    'smear': 0.03,            # share of the walls in a shot that may be streaked (every smear found while
                              # tuning, a pier painted flat, an opening's seam, a streaked floor, was 0.04-0.25)
    'gap': 0.08,
    'floor_bands': 0.25,      # bands across the floor's tile, against its grain              # a work's back may stand off its wall this much (m) at most
}

LABELS = {'work': (255, 0, 0), 'workbody': (0, 0, 255), 'wall': (0, 255, 0), 'ceiling': (0, 128, 0),
          'floor': (255, 255, 0), 'reveal': (0, 255, 255), 'beyond': (128, 128, 128), 'hole': (255, 0, 255),
          'shadow': (255, 128, 0)}     # the soft shadow the viewer draws round a work
NAMES = list(LABELS)


# --- rendering ------------------------------------------------------------------------------------------
class _Quiet(SimpleHTTPRequestHandler):
    def log_message(self, *a):
        pass


def serve(root):
    s = socket.socket(); s.bind(('127.0.0.1', 0)); port = s.getsockname()[1]; s.close()
    httpd = ThreadingHTTPServer(('127.0.0.1', port), partial(_Quiet, directory=str(root)))
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    return httpd, f'http://127.0.0.1:{port}/studio/app/'


def render(slug, out):
    httpd, url = serve(ROOT)
    try:
        subprocess.run(['node', str(RENDER), url, slug, str(out)], check=True, timeout=3600)
    finally:
        httpd.shutdown()
    return json.load(open(Path(out) / 'shots.json'))


# --- reading a shot -------------------------------------------------------------------------------------
def labels(ids):
    """Each pixel's label index (NAMES), -1 where colours blend at an edge. Walls come in shades of green
    (blue 12, 24, ... per wall): all are 'wall' here, and where two shades meet is a corner (corners())."""
    pal = np.array(list(LABELS.values()), np.float32)
    rgb = ids[..., ::-1].astype(np.float32)
    d = np.linalg.norm(rgb[..., None, :] - pal[None, None], axis=-1)
    k = d.argmin(-1)
    k[d.min(-1) > 30] = -1
    wall = (rgb[..., 0] < 30) & (rgb[..., 1] > 225)
    k[wall] = NAMES.index('wall')
    return k


def corners(ids, px=8):
    """Where two walls meet on screen (a room's corner, meant to be there)."""
    b = ids[..., 0].astype(np.int16)
    wall = (ids[..., 2] < 30) & (ids[..., 1] > 225)
    q = np.where(wall, (b + 6) // 12, -1).astype(np.int16)
    big = cv2.dilate(q.astype(np.float32), np.ones((3, 3), np.uint8)); small = cv2.erode(q.astype(np.float32), np.ones((3, 3), np.uint8))
    edge = wall & (big != small)
    return cv2.dilate(edge.astype(np.uint8), np.ones((2 * px + 1, 2 * px + 1), np.uint8)) > 0


def lab(img):
    L = cv2.cvtColor(img, cv2.COLOR_BGR2LAB).astype(np.float32)
    L[..., 0] *= 100 / 255; L[..., 1:] -= 128
    return L


def inner(mask, px):
    return cv2.erode(mask.astype(np.uint8), np.ones((2 * px + 1, 2 * px + 1), np.uint8)) > 0


# --- the checks -----------------------------------------------------------------------------------------
def work_fidelity(img, lbl, corners, w, near=False):
    """A work's own image against how it shows on screen: (whole, detail correlation, worst colour drift)."""
    H, W = img.shape[:2]
    src = cv2.imread(str(resolve(w['image'])), cv2.IMREAD_UNCHANGED)
    alpha = src[..., 3] if src.shape[2] == 4 else None
    src = src[..., :3]
    q = np.float32([[c[0] * W, c[1] * H] for c in corners])
    side = np.linalg.norm(q[1] - q[0])
    # compare at the size the work has on screen (finer detail than that the screen cannot show)
    tw = int(np.clip(side, 64, 1400)); th = int(tw * src.shape[0] / src.shape[1])
    rect = np.float32([[0, 0], [tw, 0], [tw, th], [0, th]])
    M = cv2.getPerspectiveTransform(q, rect)
    seen = cv2.warpPerspective(img, M, (tw, th), flags=cv2.INTER_AREA)
    seen_lbl = cv2.warpPerspective(lbl.astype(np.float32), M, (tw, th), flags=cv2.INTER_NEAREST)
    on = cv2.warpPerspective(np.ones((H, W), np.uint8), M, (tw, th), flags=cv2.INTER_NEAREST) > 0
    ref = cv2.resize(src, (tw, th), interpolation=cv2.INTER_AREA)
    m = np.ones((th, tw), bool) if alpha is None else cv2.resize(alpha, (tw, th)) > 200
    m = inner(m, 3) & on
    if m.sum() < 500:
        return None
    whole = float((seen_lbl[m] == NAMES.index('work')).mean())
    a = cv2.cvtColor(seen, cv2.COLOR_BGR2GRAY).astype(np.float32); b = cv2.cvtColor(ref, cv2.COLOR_BGR2GRAY).astype(np.float32)
    band = lambda x: cv2.GaussianBlur(x, (0, 0), 0.8) - cv2.GaussianBlur(x, (0, 0), 5)
    a, b = band(a), band(b)
    best = -1.0
    for dy in (-2, -1, 0, 1, 2):
        for dx in (-2, -1, 0, 1, 2):
            bb = np.roll(np.roll(b, dy, 0), dx, 1)[m]; aa = a[m]
            aa = aa - aa.mean(); bb = bb - bb.mean()
            best = max(best, float((aa * bb).sum() / (np.sqrt((aa ** 2).sum() * (bb ** 2).sum()) + 1e-6)))
    # colour: the light may brighten or dim a part of the work, never tint it
    la, lb = lab(cv2.GaussianBlur(seen, (0, 0), 3)), lab(cv2.GaussianBlur(ref, (0, 0), 3))
    drift = 0.0
    n = 4
    for i in range(n):
        for j in range(n):
            cell = np.zeros_like(m); cell[i * th // n:(i + 1) * th // n, j * tw // n:(j + 1) * tw // n] = True
            cm = cell & m
            if cm.sum() < 200:
                continue
            # chroma scales with brightness under a dimmer light: compare it relative to lightness
            ka = (la[cm, 0].mean() + 5) / (lb[cm, 0].mean() + 5)
            d = np.abs(la[cm, 1:].mean(0) - lb[cm, 1:].mean(0) * ka)
            drift = max(drift, float(d.max()))
    return whole, best, drift


def plain_wall(lbl, hgt):
    """A wall's open face: not its foot (a skirting board) nor its top (where the ceiling's edge shades it)."""
    up = hgt[..., 2].astype(np.float32) / 255 * 2.55; down = hgt[..., 1].astype(np.float32) / 255 * 2.55
    wall = (lbl == NAMES.index('wall')) & (up > 0.3) & (down > 0.4)
    # nor the few pixels round a work, its shadow or an opening (their edges are meant to be there)
    near = cv2.dilate((~np.isin(lbl, [NAMES.index('wall'), NAMES.index('ceiling'), NAMES.index('floor')])).astype(np.uint8),
                      np.ones((13, 13), np.uint8)) > 0
    out = inner(wall, 4) & ~near
    out[:6] = out[-6:] = False; out[:, :6] = out[:, -6:] = False      # nor the frame's own edge
    return out


def wall_trouble(img, walls, wall_c):
    """Shares of the shot that are: something on a plain wall that should not be there (a work's ghost or
    edge left in the wall, a stain: anything that stands out from the wall around it, by colour or by
    lightness), and a dark blotch. The fall of light across a wall is smooth and does not count."""
    if walls.sum() < 2000:
        return 0.0, 0.0
    L = lab(img)
    C = np.sqrt(L[..., 1] ** 2 + L[..., 2] ** 2)
    # compare each pixel with the wall around it (walls only, so works and corners don't bleed in)
    wf = walls.astype(np.float32)
    local = lambda x: cv2.GaussianBlur(x * wf, (0, 0), 12) / (cv2.GaussianBlur(wf, (0, 0), 12) + 1e-6)
    dL = L[..., 0] - local(L[..., 0]); dC = C - local(C)
    # (a spot's pool of light round a work is brighter than the wall beside it, and meant to be: only a
    # much brighter patch counts, while anything darker or coloured does)
    odd = walls & ((dL < -7) | (dL > 15) | (dC > 6) | (C > wall_c + 14))
    dark = walls & (dL < -12)
    out = []
    for m in (odd, dark):
        m = cv2.morphologyEx(m.astype(np.uint8), cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
        n, cc, st, _ = cv2.connectedComponentsWithStats(m)
        big = st[1:, cv2.CC_STAT_AREA][st[1:, cv2.CC_STAT_AREA] >= 40] if n > 1 else []
        out.append(float(np.sum(big)) / m.size)
    return out[0], out[1]


def smear(img, walls, lbl):
    """Share of the walls and floor in a shot whose texture is dragged into streaks: strong texture all in
    one direction over an area (a single straight edge is too thin to count)."""
    # walls only: on screen the floor carries the room's reflection, whose edges are meant to be there (the
    # floor's own texture is checked as a tile, floor_tile below)
    m = walls
    if m.sum() < 4000:
        return 0.0
    g = cv2.GaussianBlur(cv2.cvtColor(img, cv2.COLOR_BGR2GRAY).astype(np.float32), (0, 0), 1.0)
    gx = cv2.Sobel(g, cv2.CV_32F, 1, 0); gy = cv2.Sobel(g, cv2.CV_32F, 0, 1)
    J = [cv2.GaussianBlur(x, (0, 0), 5) for x in (gx * gx, gy * gy, gx * gy)]
    tr = J[0] + J[1]; det = np.sqrt((J[0] - J[1]) ** 2 + 4 * J[2] ** 2)
    coh = det / (tr + 1e-6)
    streak = (coh > 0.8) & (tr > 400) & m
    streak = cv2.morphologyEx(streak.astype(np.uint8), cv2.MORPH_OPEN, np.ones((9, 9), np.uint8)) > 0
    return float(streak.sum() / m.sum())


def floor_tile(spec):
    """The floor's texture tile must be grain, not streaks (it repeats across the whole floor)."""
    f = next((x for x in spec['surfaces'] if x['kind'] == 'floor'), None)
    if not f or not f.get('texture'):
        return 0.0
    t = cv2.imread(str(APP / f['texture']))
    g = cv2.cvtColor(t, cv2.COLOR_BGR2GRAY).astype(np.float32)
    # bands across the tile: how much the rows' or the columns' averages vary, against the grain itself
    rows = cv2.GaussianBlur(g, (0, 0), 2).mean(1); cols = cv2.GaussianBlur(g, (0, 0), 2).mean(0)
    grain = g.std() + 1e-6
    return float(max(rows.std(), cols.std()) / grain)


def geometry(spec):
    """Where the works hang, from the space itself: [(rule, ok, why)]."""
    out = []
    R = spec['room']
    walls = [s for s in spec['surfaces'] if s['kind'] == 'wall']
    bad_gap, bad_bounds, overlap = [], [], []
    rects = []
    for w in spec['works']:
        c = np.array(w['centre']); X, Y, Z = (np.array(a) for a in w['axes'])
        hw, hh = w['measured'][0] / 200, w['measured'][1] / 200
        back = c - Z * w.get('depth', 0.035)
        gaps = []
        for s in walls:
            n = np.array(s['normal']); o = np.array(s['origin'])
            if abs(n @ Z) < 0.95:
                continue
            gaps.append(float((back - o) @ n))
        g = min(gaps, key=abs) if gaps else None
        if g is None or g < -0.01 or g > RULES['gap']:
            bad_gap.append(w['work'])
        cy = c[1]; top = cy + abs(Y[1]) * hh; bot = cy - abs(Y[1]) * hh
        if bot < 0.02 or top > R['height'] - 0.03:
            bad_bounds.append(w['work'])
        rects.append((w['work'], c, X, Y, Z, hw, hh))
    for i in range(len(rects)):
        for j in range(i + 1, len(rects)):
            a, b = rects[i], rects[j]
            if abs(a[4] @ b[4]) < 0.95 or abs((b[1] - a[1]) @ a[4]) > 0.15:
                continue
            d = b[1] - a[1]
            ox = a[5] + b[5] - abs(d @ a[2]); oy = a[6] + b[6] - abs(d @ a[3])
            if ox > 0.01 and oy > 0.01:
                overlap.append(f'{a[0]} / {b[0]}')
    out.append(('on_wall', not bad_gap, 'כל עבודה תלויה על קיר (לא בתוכו ולא באוויר)' if not bad_gap else 'לא תלויה נכון על הקיר: ' + ', '.join(bad_gap)))
    out.append(('in_room', not bad_bounds, 'כל העבודות בין הרצפה לתקרה' if not bad_bounds else 'יוצאת מהרצפה או מהתקרה: ' + ', '.join(bad_bounds)))
    out.append(('no_overlap', not overlap, 'אין עבודות זו על זו' if not overlap else 'עבודות חופפות: ' + ', '.join(overlap)))
    return out


def inspect(slug, keep=None, log=print):
    spec_path = OUT / f'{slug}.json'
    spec = json.load(open(spec_path, encoding='utf-8'))
    if spec.get('quality') not in ('candidate', 'published'):
        log(f'{slug}: not a candidate (stage 1 did not pass), nothing to inspect'); return spec
    t0 = time.time()
    tmp = Path(keep or tempfile.mkdtemp(prefix=f'inspect-{slug}-'))
    log(f'{slug}: inspecting in the viewer...')
    data = render(slug, tmp)
    shots = data['shots']
    res = []          # (rule, ok, why)
    errs = [e for e in data['errors'] if 'favicon' not in e]
    res.append(('opens', not errs, 'נפתח בלי שגיאות וכל הקבצים נטענים' if not errs else 'שגיאות: ' + '; '.join(errs[:3])))
    for rule, ok, why in geometry(spec):
        res.append((rule, ok, why))

    holes, ghosts, blotches, smears = {}, {}, {}, {}
    work_scores = {}
    # the walls' own colour (gallery walls are white or one colour): measured on all walk shots
    imgs = {}
    for s in shots:
        img = cv2.imread(str(tmp / f"{s['name']}.png")); ids = cv2.imread(str(tmp / f"{s['name']}.ids.png"))
        lbl = labels(ids)
        imgs[s['name']] = (img, lbl, plain_wall(lbl, cv2.imread(str(tmp / f"{s['name']}.height.png"))) & ~corners(ids))
    wc = []
    for s in shots:
        if s['kind'] in ('walk', 'view'):
            img, lbl, m = imgs[s['name']]
            if m.sum() > 2000:
                L = lab(img); wc.append(np.median(np.sqrt(L[m, 1] ** 2 + L[m, 2] ** 2)))
    wall_c = float(np.median(wc)) if wc else 5.0
    for s in shots:
        img, lbl, walls = imgs[s['name']]
        hole = (lbl == NAMES.index('hole')) & (img[..., 1] < 40) & (img[..., 0] > 200) & (img[..., 2] > 200)
        holes[s['name']] = float(inner(hole, 0).mean())
        if s['kind'] in ('walk', 'view', 'oblique'):
            ghosts[s['name']], blotches[s['name']] = wall_trouble(img, walls, wall_c)
            smears[s['name']] = smear(img, walls, lbl)
        if s['kind'] in ('work', 'near') and s.get('corners'):
            # the viewer orders works along the room: find this one in the space by its image
            img_path = data['info']['pieces'][s['work']]['image']
            w = next(x for x in spec['works'] if x['image'] == img_path)
            c = s['corners'][s['work']]
            if all(0 <= p[0] <= 1 and 0 <= p[1] <= 1 for p in c) or s['kind'] == 'near':
                f = work_fidelity(img, lbl, c, w, near=s['kind'] == 'near')
                if f:
                    work_scores.setdefault(w['work'], {})[s['kind']] = f

    def worst(d):
        k = max(d, key=d.get) if d else None
        return k, (d[k] if k else 0.0)
    k, v = worst(holes)
    res.append(('holes', v <= RULES['holes'], 'אין חורים בחלל מאף נקודת מבט' if v <= RULES['holes'] else f'חור בחלל ({k})'))
    bad_whole = [t for t, d in work_scores.items() if 'work' in d and d['work'][0] < RULES['work_whole']]
    bad_sharp = [t for t, d in work_scores.items() if 'work' in d and d['work'][1] < RULES['work_sharp']]
    bad_near = [t for t, d in work_scores.items() if 'near' in d and d['near'][1] < RULES['work_near']]
    bad_col = [t for t, d in work_scores.items() if 'work' in d and d['work'][2] > RULES['work_colour']]
    missing = [w['work'] for w in spec['works'] if 'work' not in work_scores.get(w['work'], {})]
    res.append(('work_whole', not bad_whole and not missing, 'כל עבודה מוצגת שלמה' if not bad_whole and not missing else 'לא מוצגת שלמה: ' + ', '.join(bad_whole + missing)))
    res.append(('work_sharp', not bad_sharp, 'כל עבודה חדה כמו התמונה שלה' if not bad_sharp else 'לא חדה או מרוחה: ' + ', '.join(bad_sharp)))
    res.append(('work_near', not bad_near, 'גם מקרוב העבודות שומרות על הפרטים' if not bad_near else 'מטושטשת מקרוב: ' + ', '.join(bad_near)))
    res.append(('work_colour', not bad_col, 'כל עבודה בצבעים שלה, בלי גוון זר' if not bad_col else 'גוון זר בעבודה: ' + ', '.join(bad_col)))
    k, v = worst(ghosts)
    res.append(('ghost', v <= RULES['ghost'], 'הקירות נקיים: אין שאריות של עבודות או כתמים' if v <= RULES['ghost'] else f'משהו על הקיר שלא אמור להיות שם ({k})'))
    k, v = worst(blotches)
    res.append(('blotch', v <= RULES['blotch'], 'אין כתמים כהים על הקירות' if v <= RULES['blotch'] else f'כתם כהה על קיר ({k})'))
    k, v = worst(smears)
    res.append(('smear', v <= RULES['smear'], 'אין מריחות בקירות' if v <= RULES['smear'] else f'מריחה בקיר ({k})'))

    ft = floor_tile(spec)
    res.append(('floor', ft <= RULES['floor_bands'], 'מרקם הרצפה אחיד, בלי פסים' if ft <= RULES['floor_bands'] else 'פסים במרקם הרצפה'))
    passed = all(ok for _, ok, _ in res)
    log('    work (whole, sharp, colour drift): ' + ', '.join(f"{t} {d['work'][0]:.2f}/{d['work'][1]:.2f}/{d['work'][2]:.1f}" for t, d in work_scores.items() if 'work' in d))
    log('    up close: ' + ', '.join(f"{t} {d['near'][1]:.2f}" for t, d in work_scores.items() if 'near' in d))
    log(f'    worst: holes {worst(holes)}, ghost {worst(ghosts)}, blotch {worst(blotches)}, smear {worst(smears)}')
    for rule, ok, why in res:
        log(f"    {'✓' if ok else '✗'} {rule}: {why}")
    spec['inspection'] = [{'rule': r, 'passed': bool(ok), 'why': why} for r, ok, why in res]
    spec['quality'] = 'published' if passed else 'withheld'
    json.dump(spec, open(spec_path, 'w'), indent=1, ensure_ascii=False)
    sheet(tmp, shots, OUT / slug / 'inspection.jpg')
    report(slug, res, len(shots), time.time() - t0)
    log(f"  {'published' if passed else 'withheld'} after inspection: {sum(ok for _, ok, _ in res)} of {len(res)} ({time.time() - t0:.0f} s, {len(shots)} shots)")
    if not keep:
        shutil.rmtree(tmp, ignore_errors=True)
    return spec


def sheet(tmp, shots, dest, w=150):
    """A contact sheet of what the inspection saw, kept with the space."""
    pick = [s for s in shots if s['kind'] in ('view', 'work')] + [s for s in shots if s['name'].startswith('start')][:1]
    ims = []
    for s in pick:
        im = cv2.imread(str(Path(tmp) / f"{s['name']}.png"))
        ims.append(cv2.resize(im, (w, int(w * im.shape[0] / im.shape[1])), interpolation=cv2.INTER_AREA))
    if not ims:
        return
    cols = 8
    rows = [np.hstack(ims[i:i + cols] + [np.full_like(ims[0], 255)] * (cols - len(ims[i:i + cols]))) for i in range(0, len(ims), cols)]
    dest.parent.mkdir(parents=True, exist_ok=True)
    cv2.imwrite(str(dest), np.vstack(rows), [cv2.IMWRITE_JPEG_QUALITY, 80])


NAMES_HE = {'opens': 'נפתח בלי שגיאות', 'on_wall': 'עבודות על הקיר', 'in_room': 'עבודות בתוך החדר', 'no_overlap': 'בלי חפיפות',
            'holes': 'בלי חורים', 'work_whole': 'עבודות שלמות', 'work_sharp': 'עבודות חדות', 'work_near': 'חדות מקרוב',
            'work_colour': 'צבעים נכונים', 'ghost': 'קירות נקיים', 'blotch': 'בלי כתמים', 'smear': 'בלי מריחות',
            'floor': 'רצפה בלי פסים'}


def report(slug, res, n, secs):
    p = OUT / f'{slug}.report.md'
    text = p.read_text(encoding='utf-8') if p.exists() else '<div dir="rtl">\n\n</div>\n'
    start = text.find('## שלב 2')
    if start >= 0:
        end = text.find('\n## ', start + 5)
        text = text[:start] + (text[end + 1:] if end >= 0 else '')
    ok = all(o for _, o, _ in res)
    L = ['## שלב 2: בדיקה יסודית בתוך הסיור', '',
         f"הסיור נפתח באפליקציה עצמה, על מסך בגודל טלפון, וצולם מ־{n} נקודות מבט: מכל צילום, מנקודת ההתחלה, מרשת של מקומות לאורך החדר לכל הכיוונים, וכל עבודה מלפנים, מקרוב ומהצדדים ({secs:.0f} שניות).", '',
         '**עבר: הסיור מתפרסם.**' if ok else '**לא עבר: הסיור לא מתפרסם.**', '',
         '| | בדיקה | תוצאה |', '|---|---|---|']
    L += [f"| {'✓' if o else '✗'} | {NAMES_HE.get(r, r)} | {why} |" for r, o, why in res]
    L += ['', f'![מה הבדיקה ראתה]({slug}/inspection.jpg)', '', '']
    i = text.find('## מידות')
    text = text[:i] + '\n'.join(L) + text[i:] if i >= 0 else text.replace('</div>', '\n'.join(L) + '\n</div>')
    p.write_text(text, encoding='utf-8')


def main(argv):
    keep = None
    if '--keep' in argv:
        i = argv.index('--keep'); keep = argv[i + 1]; argv = argv[:i] + argv[i + 2:]
    slugs = argv or [f.stem for f in sorted(OUT.glob('*.json')) if f.name != 'index.json' and not f.name.endswith('.overrides.json')]
    for s in slugs:
        try:
            inspect(s, keep and f'{keep}/{s}')
        except Exception as e:
            import traceback; traceback.print_exc()
            print(f'{s}: inspection failed: {e}')
            p = OUT / f'{s}.json'
            if p.exists():                                         # never published without a finished inspection
                spec = json.load(open(p, encoding='utf-8'))
                spec['quality'] = 'withheld'; spec['inspection'] = [{'rule': 'inspection', 'passed': False, 'why': str(e)}]
                json.dump(spec, open(p, 'w'), indent=1, ensure_ascii=False)
    from .build import write_index
    write_index()


if __name__ == '__main__':
    main(sys.argv[1:])
