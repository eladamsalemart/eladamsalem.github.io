"""The demo world: a few fictional artists, their works, shows and studio clips, to see the app full.

None of it is real: the artists, galleries and shows are made up, and the works are generated here (each
artist in a style of their own), with short clips of a work being painted. Run from the repo root:
    python3 studio/app/make_demo.py
writes studio/app/data/demo/world.json and the images and clips under studio/app/data/demo/. Dates in
world.json are days from today (the app turns them into dates), so the demo's shows stay on now."""
import json, math, subprocess, tempfile
from pathlib import Path
import cv2
import numpy as np

OUT = Path('studio/app/data/demo')
EDGE = 1600                     # long edge of a work's image
rng = np.random.default_rng(7)


def hexc(h):
    h = h.lstrip('#'); return np.array([int(h[i:i + 2], 16) for i in (4, 2, 0)], np.float32)   # BGR


def grain(img, k=6.0):
    return np.clip(img + rng.normal(0, k, img.shape[:2])[..., None], 0, 255)


# --- styles: each returns (final image, list of masks in painting order) ------------------------------
def textile(w, h, pal):
    """Noa: patches of cloth, stitched: weave in each, a running stitch along the seams."""
    img = np.zeros((h, w, 3), np.float32) + hexc(pal[0]); steps = []
    rows, cols = rng.integers(4, 7), rng.integers(3, 6)
    ys = np.sort(np.r_[0, rng.uniform(0.1, 0.9, rows - 1), 1]) * h; xs = np.sort(np.r_[0, rng.uniform(0.1, 0.9, cols - 1), 1]) * w
    yy, xx = np.mgrid[0:h, 0:w]
    for i in range(rows):
        for j in range(cols):
            x0, x1, y0, y1 = xs[j] + 6, xs[j + 1] - 6, ys[i] + 6, ys[i + 1] - 6
            c = hexc(pal[rng.integers(1, len(pal))]); ang = rng.choice([0, 1]); f = rng.uniform(0.18, 0.5)
            m = ((xx >= x0) & (xx < x1) & (yy >= y0) & (yy < y1))
            weave = 1 + 0.08 * np.sin((xx if ang else yy) * f) + 0.05 * np.sin((yy if ang else xx) * f * 0.5)
            patch = c[None, None] * weave[..., None]
            if rng.random() < 0.35:                                      # a printed stripe
                patch = np.where((((xx + yy * ang) // rng.integers(14, 40)) % 2 == 0)[..., None], patch, patch * 0.82 + 30)
            img = np.where(m[..., None], patch, img)
            st = np.zeros((h, w), np.uint8)
            for k in range(int(x0), int(x1) - 10, 22):                   # the running stitch round it
                cv2.line(st, (k, int(y0) + 5), (k + 10, int(y0) + 5), 255, 3); cv2.line(st, (k, int(y1) - 5), (k + 10, int(y1) - 5), 255, 3)
            img = np.where(st[..., None] > 0, hexc(pal[-1]), img)
            steps.append(m | (st > 0))
    return grain(img, 5), steps


def colourfield(w, h, pal):
    """Daniel: two or three soft fields of colour on a ground, brushed sideways."""
    grounds = [pal[0], '#3A2E2A', '#E7D9C4', '#6E2F2B', '#1F3340']
    img = np.zeros((h, w, 3), np.float32) + hexc(grounds[rng.integers(len(grounds))]); steps = [np.ones((h, w), bool)]
    n = rng.integers(1, 4); cols = rng.permutation(len(pal) - 1)[:n] + 1
    edges = np.r_[0.06, np.sort(rng.uniform(0.25, 0.75, n - 1)), 0.94]; mx = rng.uniform(0.05, 0.12)
    for i in range(n):
        gap = 0.025
        y0, y1 = int((edges[i] + (gap if i else 0)) * h), int((edges[i + 1] - (gap if i < n - 1 else 0)) * h)
        m = np.zeros((h, w), np.float32); m[y0:y1, int(mx * w):int((1 - mx) * w)] = 1
        noise = cv2.GaussianBlur(rng.normal(0, 1, (h, w)).astype(np.float32), (0, 0), 18) * 30
        m = cv2.GaussianBlur(m, (0, 0), 14 + rng.uniform(0, 12)) + noise / 255
        m = np.clip((m - 0.3) * 2.2, 0, 1)
        streak = cv2.GaussianBlur(rng.normal(0, 1, (h, w)).astype(np.float32), (0, 0), sigmaX=40, sigmaY=1.2) * 22
        c = hexc(pal[cols[i]])
        img = img * (1 - m[..., None]) + (c + streak[..., None]) * m[..., None]
        steps.append(m > 0.05)
    return grain(img, 4), steps


def ink(w, h, pal):
    """Maya: one to three brush gestures in ink on paper, a little splatter, a red seal."""
    paper = hexc(pal[0]) + cv2.GaussianBlur(rng.normal(0, 1, (h, w)).astype(np.float32), (0, 0), 2)[..., None] * 6
    alpha = np.zeros((h, w), np.float32); steps = []
    for g in range(rng.integers(1, 4)):
        kind = rng.choice(['circle', 'wave', 'line'])
        t = np.linspace(0, 1, 700)
        if kind == 'circle':
            r = rng.uniform(0.25, 0.36) * min(w, h); cx, cy = w * rng.uniform(0.4, 0.6), h * rng.uniform(0.4, 0.6)
            a0 = rng.uniform(0, 6.28); a = a0 + t * rng.uniform(5.2, 6.1)
            pts = np.c_[cx + r * np.cos(a), cy + r * np.sin(a)]
        elif kind == 'wave':
            pts = np.c_[w * (0.1 + 0.8 * t), h * (rng.uniform(0.3, 0.7) + 0.12 * np.sin(t * rng.uniform(4, 9) + rng.uniform(0, 6)))]
        else:
            pts = np.c_[w * rng.uniform(0.2, 0.8) + w * 0.05 * np.sin(t * 3), h * (0.1 + 0.8 * t)]
        width = (rng.uniform(0.025, 0.05) * min(w, h)) * (1 - 0.75 * t) ** 0.6
        m = np.zeros((h, w), np.float32)
        for k in range(len(pts) - 1):
            dry = 1.0 if rng.random() > t[k] * 0.5 else 0.45
            cv2.line(m, tuple(pts[k].astype(int)), tuple(pts[k + 1].astype(int)), dry, max(1, int(width[k])), cv2.LINE_AA)
            if k % 70 == 69:
                steps.append(m > 0.05)
        alpha = np.maximum(alpha, m)
        steps.append(alpha > 0.05)
    for _ in range(rng.integers(20, 60)):                               # splatter
        cv2.circle(alpha, (int(rng.uniform(0, w)), int(rng.uniform(0, h))), int(rng.uniform(1, 6)), 0.9, -1, cv2.LINE_AA)
    alpha = cv2.GaussianBlur(alpha, (0, 0), 1.3)
    img = paper * (1 - alpha[..., None]) + hexc(pal[1]) * alpha[..., None]
    s = int(0.05 * min(w, h)); x, y = int(w * 0.86), int(h * 0.86)       # the seal
    img[y:y + s, x:x + s] = hexc(pal[2]) * 0.9 + paper[y:y + s, x:x + s] * 0.1
    steps.append(np.ones((h, w), bool))
    return grain(img, 3), steps


def flowfield(w, h, pal):
    """Tomer: lines that follow a field, glowing on a dark ground."""
    pals = [pal, ['#0B1A1E', '#123B3F', '#F2C14E', '#F78154', '#4D9078'], ['#160F0F', '#3B1C32', '#FF6B6B', '#FFD93D', '#6BCB77'],
            ['#EDE7DC', '#D6CFC2', '#1D3557', '#E63946', '#457B9D'], ['#08090D', '#0D1B2A', '#E0E1DD', '#778DA9', '#415A77']]
    pal = pals[rng.integers(len(pals))]
    yy = np.linspace(0, 1, h)[:, None]
    img = (hexc(pal[0]) * (1 - yy) + hexc(pal[1]) * yy)[..., None].transpose(0, 2, 1) * np.ones((1, w, 1))
    img = img.astype(np.float32).copy(); steps = []
    seed = rng.uniform(0, 100, 4)
    fx, fy = rng.uniform(1.5, 7), rng.uniform(1.5, 7)
    ang = lambda x, y: math.sin(x * fx / w + seed[0]) * 2.2 + math.cos(y * fy / h + seed[1]) * 2.0 + math.sin((x + y) * 1.3 / w + seed[2])
    layer = np.zeros((h, w, 3), np.float32)
    for i in range(900):
        x, y = rng.uniform(0, w), rng.uniform(0, h); c = hexc(pal[2 + i % (len(pal) - 2)]) * rng.uniform(0.5, 1)
        for _ in range(rng.integers(30, 90)):
            a = ang(x, y); nx, ny = x + 6 * math.cos(a), y + 6 * math.sin(a)
            cv2.line(layer, (int(x), int(y)), (int(nx), int(ny)), c.tolist(), 1, cv2.LINE_AA); x, y = nx, ny
            if not (0 <= x < w and 0 <= y < h):
                break
        if i % 60 == 59:
            steps.append(layer.max(-1) > 0)
    glow = cv2.GaussianBlur(layer, (0, 0), 6)
    if pal[0].startswith('#E'):                                         # a light ground: the lines are ink
        img = np.clip(img - layer.max(-1, keepdims=True) * 0.9 + layer * 0.6, 0, 255)
    else:
        img = np.clip(img + layer * 0.8 + glow * 0.9, 0, 255)
    steps.append(np.ones((h, w), bool))
    return img, steps


def reveal(final, n=14):
    """For a work already made (Lia's): brushed in, patch by patch."""
    h, w = final.shape[:2]; steps = []; m = np.zeros((h, w), np.uint8)
    for k in range(n):
        for _ in range(40):
            x, y = int(rng.uniform(0, w)), int(rng.uniform(0, h)); L = rng.uniform(0.1, 0.3) * w; a = rng.uniform(0, 3.14)
            cv2.line(m, (x, y), (int(x + L * math.cos(a)), int(y + L * math.sin(a))), 255, int(rng.uniform(0.02, 0.06) * w))
        steps.append(m > 0)
    steps.append(np.ones((h, w), bool))
    return steps


# --- clips: the work being made, then the finished work ---------------------------------------------
def clip(final, steps, ground, dest, seconds=7, size=(540, 960)):
    """A vertical clip: the canvas filling the frame, painted step by step (each step brushed in), then a
    slow look at the finished work."""
    W, H = size; fh, fw = final.shape[:2]
    k = max(W / fw, H / fh) * 1.04
    fit = lambda im, z=1.0: cv2.warpAffine(im, np.float32([[k * z, 0, (W - fw * k * z) / 2], [0, k * z, (H - fh * k * z) / 2]]), (W, H), borderMode=cv2.BORDER_REFLECT)
    fps = 24; n_paint = int(fps * seconds * 0.7); n_hold = int(fps * seconds) - n_paint
    canvas = np.zeros_like(final) + ground
    tmp = Path(tempfile.mkdtemp()); f = 0
    cum, acc = [], np.zeros(final.shape[:2], bool)               # what's painted after each step
    for m in steps:
        acc = acc | m; cum.append(cv2.GaussianBlur(acc.astype(np.float32), (0, 0), 3))
    for i in range(n_paint):
        x = i / n_paint * len(cum); s = int(x); frac = x - s        # step s is being brushed in
        before = cum[s - 1] if s else np.zeros_like(cum[0])
        done = before + (cum[s] - before) * frac
        frame = canvas * (1 - done[..., None]) + final * done[..., None]
        cv2.imwrite(str(tmp / f'{f:04d}.png'), fit(frame.astype(np.uint8))); f += 1
    for i in range(n_hold):
        cv2.imwrite(str(tmp / f'{f:04d}.png'), fit(final.astype(np.uint8), 1 + 0.06 * i / n_hold)); f += 1
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-framerate', str(fps), '-i', str(tmp / '%04d.png'), '-c:v', 'libx264', '-pix_fmt', 'yuv420p',
                    '-crf', '30', '-preset', 'slow', '-movflags', '+faststart', str(dest)], check=True)
    cv2.imwrite(str(dest.with_suffix('.jpg')), fit(final.astype(np.uint8)), [cv2.IMWRITE_JPEG_QUALITY, 80])   # its poster


# --- an installation view: the works hung on a gallery's walls ----------------------------------------
def install(works, dest, seed=0, wall=(236, 234, 230), floor=(150, 160, 172)):
    r = np.random.default_rng(seed); W, H = 1600, 1200
    img = np.zeros((H, W, 3), np.float32)
    # back wall, side wall to the right, floor, ceiling: a room seen from a corner
    back = np.array([[0, 80], [1150, 160], [1150, 860], [0, 1000]], np.float32)
    side = np.array([[1150, 160], [W, 0], [W, H], [1150, 860]], np.float32)
    flo = np.array([[0, 1000], [1150, 860], [W, H], [0, H]], np.float32)
    ceil = np.array([[0, 0], [W, 0], [1150, 160], [0, 80]], np.float32)
    for poly, c in ((back, wall), (side, tuple(x * 0.9 for x in wall)), (flo, floor), (ceil, tuple(x * 0.97 for x in wall))):
        cv2.fillPoly(img, [poly.astype(np.int32)], c)
    yy = np.linspace(0, 1, H)[:, None]; img *= (0.94 + 0.08 * yy)[..., None]
    # works on the back wall, at eye level, with a shadow
    slots = np.linspace(0.08, 0.9, len(works) + 1)
    for i, wk in enumerate(works):
        im = cv2.imread(str(wk)); ih, iw = im.shape[:2]
        u0, u1 = slots[i] + 0.04, slots[i + 1] - 0.04; wpx = (u1 - u0); hpx = wpx * ih / iw * 1150 / 760
        hpx = min(hpx, 0.5); wpx = hpx * iw / ih * 760 / 1150; uc = (u0 + u1) / 2; u0, u1 = uc - wpx / 2, uc + wpx / 2
        vc = 0.46; v0, v1 = vc - hpx / 2, vc + hpx / 2
        P = lambda u, v: [u * 1150, (80 + u * 80) * (1 - v) + (1000 - u * 140) * v]
        quad = np.float32([P(u0, v0), P(u1, v0), P(u1, v1), P(u0, v1)])
        sh = np.zeros((H, W), np.float32); cv2.fillPoly(sh, [(quad + [10, 14]).astype(np.int32)], 1); sh = cv2.GaussianBlur(sh, (0, 0), 9)
        img *= (1 - 0.35 * sh[..., None])
        M = cv2.getPerspectiveTransform(np.float32([[0, 0], [iw, 0], [iw, ih], [0, ih]]), quad)
        warped = cv2.warpPerspective(im, M, (W, H)).astype(np.float32)
        mask = cv2.warpPerspective(np.ones((ih, iw), np.float32), M, (W, H))[..., None]
        img = img * (1 - mask) + warped * mask
    img = grain(img, 3)
    cv2.imwrite(str(dest), img.astype(np.uint8), [cv2.IMWRITE_JPEG_QUALITY, 82])


# --- the world ------------------------------------------------------------------------------------------
ARTISTS = [
    dict(slug='lia-moren', name='Lia Morén', discipline='Painting', city='Haifa', style=None, palette=['#B9A68E'],
         statement='I paint the hour when a place stops being a view and becomes a feeling: tide lines, orchards, the light left in a room.'),
    dict(slug='noa-ben-ari', name='Noa Ben-Ari', discipline='Textile & collage', city='Jaffa', style='textile',
         palette=['#E9DFCC', '#B5523B', '#2E4A7D', '#D9A441', '#7C8B5A', '#EDE3D0', '#3B2A20'],
         statement='Cloth remembers hands. I cut up what my family wore and sew it into maps of the places we left.',
         works=[('Market Day', 120, 90), ('Indigo Map', 100, 140), ('Grandmother\'s Kitchen', 90, 90), ('Patchwork Weather', 160, 120), ('Saturday Quilt', 140, 140), ('Red Thread', 70, 100)],
         medium='Hand-stitched textile collage'),
    dict(slug='daniel-ostrovsky', name='Daniel Ostrovsky', discipline='Painting', city='Tel Aviv', style='colourfield',
         palette=['#D8CFC0', '#C2643C', '#38506B', '#D9B24C', '#5D7C5A', '#C98A93', '#2B2B33'],
         statement='Colour slowly, and it starts to breathe. Each painting is twenty thin layers and a lot of waiting.',
         works=[('Slow Colour I', 120, 160), ('Slow Colour II', 120, 160), ('Ochre Hour', 100, 130), ('Blue Room', 150, 180), ('Between Two Greens', 90, 120), ('Late Pink', 80, 100)],
         medium='Acrylic on canvas'),
    dict(slug='maya-haddad', name='Maya Haddad', discipline='Works on paper', city='Jerusalem', style='ink',
         palette=['#F1EBDD', '#16151A', '#B1352B'],
         statement='One breath, one stroke. I draw the city\'s stone and wind with a brush that holds a single dip of ink.',
         works=[('Breath I', 70, 100), ('Breath II', 70, 100), ('Stone Wind', 100, 70), ('Circle for the Old City', 90, 90), ('Rain on Musrara', 70, 100), ('One Line', 50, 140)],
         medium='Sumi ink on paper'),
    dict(slug='tomer-lev', name='Tomer Lev', discipline='Digital art', city='Tel Aviv', style='flowfield',
         palette=['#0E1020', '#1C1236', '#33E1D2', '#E9408C', '#F2A541', '#7A6CF0'],
         statement='I write the rules and let the work grow. Every piece is a field of forces made visible, different every time it runs.',
         works=[('Signal 01', 120, 67.5), ('Signal 02', 120, 67.5), ('Noise Garden', 100, 100), ('Night Traffic', 160, 90), ('Carrier Wave', 120, 67.5), ('Static Bloom', 100, 100)],
         medium='Generative digital work, edition of 5'),
]
LIA_WORKS = [('low-tide', 'Low Tide', 100, 80, 'Oil on canvas'), ('orchard-at-noon', 'Orchard at Noon', 120, 150, 'Oil on canvas'),
             ('two-rooms', 'Two Rooms', 90, 90, 'Acrylic on canvas'), ('late-garden', 'Late Garden', 140, 110, 'Oil on linen'),
             ('night-window', 'Night Window', 60, 80, 'Oil on panel'), ('salt', 'Salt', 50, 50, 'Gouache on paper'),
             ('dusk-study-i', 'Dusk Study I', 40, 30, 'Oil on canvas'), ('dusk-study-ii', 'Dusk Study II', 40, 30, 'Oil on canvas')]
STYLES = dict(textile=textile, colourfield=colourfield, ink=ink, flowfield=flowfield)
slug = lambda s: ''.join(c if c.isalnum() else '-' for c in s.lower().replace("'", '')).strip('-').replace('--', '-')


def main():
    (OUT / 'works').mkdir(parents=True, exist_ok=True); (OUT / 'live').mkdir(exist_ok=True); (OUT / 'shows').mkdir(exist_ok=True); (OUT / 'people').mkdir(exist_ok=True)
    works, made = [], {}
    for a in ARTISTS:
        if a['style'] is None:                                           # Lia: her works were made before
            for i, (s, t, wcm, hcm, med) in enumerate(LIA_WORKS):
                works.append(dict(slug=s, artist=a['slug'], title=t, year=str(2025 - i // 3), medium=med, size=[wcm, hcm], image=f'data/demo/works/{s}.jpg'))
            continue
        for i, (t, wcm, hcm) in enumerate(a['works']):
            s = slug(t); w = EDGE if wcm >= hcm else int(EDGE * wcm / hcm); h = EDGE if hcm >= wcm else int(EDGE * hcm / wcm)
            img, steps = STYLES[a['style']](w, h, a['palette'])
            cv2.imwrite(str(OUT / 'works' / f'{s}.jpg'), img.astype(np.uint8), [cv2.IMWRITE_JPEG_QUALITY, 84])
            made[s] = (img, steps, hexc(a['palette'][0]))
            works.append(dict(slug=s, artist=a['slug'], title=t, year=str(2026 - i // 2), medium=a['medium'], size=[wcm, hcm], image=f'data/demo/works/{s}.jpg'))
    W = {w['slug']: w for w in works}
    # each artist's picture: a square from one of their works (no faces: they are made up)
    for a, src in zip(ARTISTS, ['late-garden', 'market-day', 'ochre-hour', 'circle-for-the-old-city', 'static-bloom']):
        im = cv2.imread(str(OUT / 'works' / f'{src}.jpg')); h, w = im.shape[:2]; s = min(h, w)
        cv2.imwrite(str(OUT / 'people' / f"{a['slug']}.jpg"), cv2.resize(im[(h - s) // 2:(h + s) // 2, (w - s) // 2:(w + s) // 2], (480, 480), interpolation=cv2.INTER_AREA), [cv2.IMWRITE_JPEG_QUALITY, 82])
    p = lambda s: OUT / 'works' / f'{s}.jpg'

    # shows: day offsets from today; kind 'gallery' (a real room) or 'online' (digital only)
    shows = [
        dict(slug='low-tide-haifa', title='Low Tide', artists=['lia-moren'], kind='gallery', venue='Harbour Gallery', address='Ha-Atsmaut Rd 41, Haifa', city='Haifa', at=[32.8193, 34.9990],
             start=0, end=45, hours='Tue–Sat 11:00–19:00', events=[dict(day=0, time='20:00', what='Opening')],
             works=['low-tide', 'salt', 'night-window', 'dusk-study-i', 'dusk-study-ii'],
             text='New paintings of the bay at low tide: the hour when the water steps back and the harbour shows its floor.'),
        dict(slug='patchwork-weather', title='Patchwork Weather', artists=['noa-ben-ari'], kind='gallery', venue='Rope Street Gallery', address='Rope St 7, Jaffa', city='Jaffa', at=[32.0527, 34.7563],
             start=-12, end=6, hours='Mon–Fri 10:00–18:00, Sat 11:00–14:00', events=[dict(day=5, time='19:00', what='Closing night')],
             works=['patchwork-weather', 'market-day', 'indigo-map', 'red-thread'],
             text='Six large textiles sewn from clothes of three generations, hung like weather maps of a family.'),
        dict(slug='slow-colour', title='Slow Colour', artists=['daniel-ostrovsky'], kind='gallery', venue='Studio 5', address='Levontin St 5, Tel Aviv', city='Tel Aviv', at=[32.0628, 34.7740],
             start=2, end=50, hours='Wed–Sat 12:00–20:00', events=[dict(day=2, time='19:00', what='Opening')],
             works=['slow-colour-i', 'slow-colour-ii', 'ochre-hour', 'blue-room'],
             text='Colour fields built from twenty thin layers each. Stand close, and they move.'),
        dict(slug='ink-breath', title='Ink, Breath', artists=['maya-haddad'], kind='gallery', venue='Musrara Lane Gallery', address='Ha-Neviim St 60, Jerusalem', city='Jerusalem', at=[31.7838, 35.2265],
             start=-26, end=3, hours='Sun–Thu 10:00–18:00, Fri 10:00–13:00', events=[dict(day=2, time='18:00', what='Artist talk')],
             works=['breath-i', 'breath-ii', 'stone-wind', 'circle-for-the-old-city', 'rain-on-musrara'],
             text='Ink drawings made in one breath each, on paper from a mill in the Old City.'),
        dict(slug='two-rooms-one-light', title='Two Rooms, One Light', artists=['lia-moren', 'daniel-ostrovsky'], kind='gallery', venue='Courtyard Hall', address='Rothschild Blvd 70, Tel Aviv', city='Tel Aviv', at=[32.0663, 34.7748],
             start=6, end=40, hours='Tue–Sat 11:00–19:00', events=[dict(day=6, time='19:30', what='Opening')],
             works=['two-rooms', 'late-garden', 'between-two-greens', 'late-pink'],
             text='Two painters who never met, paired by the light in their rooms: Lia Morén\'s harbour and Daniel Ostrovsky\'s colour fields.',
             curator='Open Studio'),
        dict(slug='signal-noise', title='Signal / Noise', artists=['tomer-lev'], kind='online', venue='Online', city='', at=None,
             start=-4, end=60, hours='Open all the time', events=[dict(day=1, time='21:00', what='Live render')],
             works=['signal-01', 'signal-02', 'night-traffic', 'carrier-wave', 'static-bloom'],
             text='A digital exhibition: works that grow from a field of forces, different each time they run. Only online.'),
        dict(slug='afterimage', title='Afterimage', artists=['lia-moren', 'noa-ben-ari', 'maya-haddad', 'tomer-lev'], kind='online', venue='Online', city='', at=None,
             start=-2, end=30, hours='Open all the time', events=[],
             works=['orchard-at-noon', 'saturday-quilt', 'one-line', 'noise-garden'],
             text='A concept exhibition: four artists, four ways a place stays with you after you leave it. Curated on Open Studio.',
             curator='Open Studio'),
        dict(slug='threads', title='Threads', artists=['noa-ben-ari'], kind='gallery', venue='Salt Room', address='Yefet St 30, Jaffa', city='Jaffa', at=[32.0500, 34.7537],
             start=-420, end=-380, hours='', events=[], works=['grandmothers-kitchen', 'saturday-quilt'], text='Noa Ben-Ari\'s first solo show.'),
        dict(slug='shoreline', title='Shoreline', artists=['lia-moren'], kind='gallery', venue='Harbour Gallery', address='Ha-Atsmaut Rd 41, Haifa', city='Haifa', at=[32.8193, 34.9990],
             start=-560, end=-515, hours='', events=[], works=['low-tide', 'orchard-at-noon', 'two-rooms', 'late-garden'], text='Paintings of the coast at low tide, made over one winter.'),
    ]
    for i, s in enumerate(shows):                                       # installation views of the gallery shows
        if s['kind'] == 'gallery':
            imgs = []
            for k in range(2):
                ws = s['works'][k * 2:k * 2 + 2] or s['works'][:2]
                install([p(x) for x in ws], OUT / 'shows' / f"{s['slug']}-{k + 1}.jpg", seed=i * 10 + k,
                        floor=[(118, 140, 168), (150, 156, 160), (96, 118, 146)][i % 3])
                imgs.append(f"data/demo/shows/{s['slug']}-{k + 1}.jpg")
            s['images'] = imgs
        else:                                                           # an online show: its first work is its cover
            s['images'] = [W[s['works'][0]]['image']]

    # live from the studio (only on an artist's page): clips of a work being made, and stories (a few frames)
    live = []
    for a, wk, hours, title in [('lia-moren', 'low-tide', 3, 'The last layer of Low Tide, before it goes to the harbour'),
                                ('noa-ben-ari', 'red-thread', 20, 'Sewing Red Thread, the whole afternoon in seven seconds'),
                                ('daniel-ostrovsky', 'slow-colour-i', 30, 'Layer by layer: how Slow Colour I was built'),
                                ('maya-haddad', 'one-line', 6, 'One Line, in one breath'),
                                ('tomer-lev', 'static-bloom', 50, 'Static Bloom, rendering live')]:
        if wk in made:
            img, steps, ground = made[wk]
        else:
            img = cv2.imread(str(p(wk))).astype(np.float32); steps = reveal(img); ground = np.float32([205, 214, 222])
        clip(img, steps, ground, OUT / 'live' / f'{wk}.mp4')
        live.append(dict(artist=a, work=wk, kind='video', video=f'data/demo/live/{wk}.mp4', poster=f'data/demo/live/{wk}.jpg', ago=hours, text=title))
    for a, frames, hours, title in [('lia-moren', ['data/demo/shows/low-tide-haifa-1.jpg', 'data/demo/works/salt.jpg', 'data/demo/shows/low-tide-haifa-2.jpg'], 9, 'Hanging Low Tide at the Harbour Gallery'),
                                    ('noa-ben-ari', ['data/demo/works/market-day.jpg', 'data/demo/works/indigo-map.jpg'], 52, 'Cloth from the Jaffa market, before it\'s cut'),
                                    ('maya-haddad', ['data/demo/works/rain-on-musrara.jpg', 'data/demo/shows/ink-breath-1.jpg'], 28, 'Rain all morning: a new drawing'),
                                    ('daniel-ostrovsky', ['data/demo/works/blue-room.jpg', 'data/demo/works/ochre-hour.jpg'], 70, 'Two finished, drying side by side')]:
        live.append(dict(artist=a, kind='story', frames=frames, ago=hours, text=title,
                         work=next((w['slug'] for w in works if w['image'] in frames), None)))

    # galleries not on Open Studio: what's on, by the gallery's own listing (info only)
    listings = [
        dict(name='Courtyard 31', city='Tel Aviv', address='Nahalat Binyamin St 31, Tel Aviv', at=[32.0668, 34.7716], show='Small Hours', what='Group show of drawings', start=-10, end=14, hours='Tue–Sat 11:00–19:00'),
        dict(name='Kiosk 9', city='Tel Aviv', address='Florentin St 9, Tel Aviv', at=[32.0567, 34.7690], show='Night Garden', what='Opening night', start=1, end=30, hours='Thu–Sat 18:00–23:00', events=[dict(day=1, time='20:00', what='Opening')]),
        dict(name='Paper Mill Rooms', city='Jerusalem', address='Emek Refaim St 12, Jerusalem', at=[31.7676, 35.2196], show='Prints from the North', what='Printmaking', start=-20, end=20, hours='Sun–Thu 10:00–18:00'),
        dict(name='North Light Space', city='Haifa', address='Masada St 18, Haifa', at=[32.8086, 34.9925], show='Coastline', what='Photography', start=-5, end=9, hours='Wed–Sat 12:00–19:00'),
        dict(name='Old Bakery Gallery', city='Be\'er Sheva', address='Smilansky St 20, Be\'er Sheva', at=[31.2427, 34.7955], show='Desert Notes', what='Group show', start=-15, end=25, hours='Sun–Thu 10:00–17:00'),
        dict(name='Salt Room', city='Jaffa', address='Yefet St 30, Jaffa', at=[32.0500, 34.7537], show='Open Studios Weekend', what='Twelve studios open their doors', start=3, end=4, hours='Fri–Sat 10:00–17:00', events=[dict(day=3, time='10:00', what='Open studios')]),
    ]
    artists = [{k: a[k] for k in ('slug', 'name', 'discipline', 'city', 'statement')} | dict(portrait=f"data/demo/people/{a['slug']}.jpg") for a in ARTISTS]
    world = dict(_note='Demo content: fictional artists, galleries and shows, with generated works, to see the app full. Dates are days from today.',
                 artists=artists, works=works, shows=shows, live=live, listings=listings,
                 places={'Tel Aviv': [32.0809, 34.7806], 'Jaffa': [32.0540, 34.7520], 'Jerusalem': [31.7780, 35.2250], 'Haifa': [32.8156, 34.9892], 'Be\'er Sheva': [31.2520, 34.7915]},
                 venues={'Ritual': dict(venue="Jerusalem Artists' House", address='Shmuel HaNagid St 12, Jerusalem', at=[31.7808, 35.2172])})
    # small versions, for grids and lists (the app takes them wherever an image shows small)
    thumbs = {}
    for f in sorted((OUT / 'works').glob('*.jpg')) + sorted((OUT / 'shows').glob('*.jpg')):
        if f.stem.endswith('-s'):
            continue
        im = cv2.imread(str(f)); h, w = im.shape[:2]; k = 640 / max(h, w)
        t = f.with_name(f.stem + '-s.jpg')
        cv2.imwrite(str(t), cv2.resize(im, (int(w * k), int(h * k)), interpolation=cv2.INTER_AREA), [cv2.IMWRITE_JPEG_QUALITY, 80])
        thumbs[f'data/demo/{f.parent.name}/{f.name}'] = f'data/demo/{t.parent.name}/{t.name}'
    world['thumbs'] = thumbs
    (OUT / 'world.json').write_text(json.dumps(world, ensure_ascii=False, indent=1), encoding='utf-8')
    print(len(artists), 'artists,', len(works), 'works,', len(shows), 'shows,', len(live), 'live posts,', len(listings), 'listings')


if __name__ == '__main__':
    main()
