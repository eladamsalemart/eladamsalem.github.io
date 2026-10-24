"""Build the 3D space of an exhibition from its photos and works, start to finish.

    python3 -m studio.app.space.pipeline                 # every exhibition that has photos
    python3 -m studio.app.space.pipeline ritual          # one

Writes studio/app/data/spaces/<slug>.json, its textures in studio/app/data/spaces/<slug>/, and a report
(<slug>.report.md) of what was found, what was measured, and what is uncertain. Overrides measured by hand
(a laser meter, say) go in studio/app/data/spaces/<slug>.overrides.json and win over the photos, e.g.
    {"height": 3.82, "work_centre_height": {"Gathering": 1.40}, "walls": {"x1": 6.10}}"""
import json, hashlib, pickle, time, sys
from datetime import date
import cv2
import numpy as np
from .works import load_exhibition, load_image, APP, slugify
from .match import find_works
from .solve import solve
from . import room, bake

OUT = APP / 'data' / 'spaces'
CACHE = APP / 'space' / '.cache'


def cached(key, fn):
    CACHE.mkdir(parents=True, exist_ok=True)
    f = CACHE / (hashlib.sha1(key.encode()).hexdigest()[:16] + '.pkl')
    if f.exists():
        return pickle.load(open(f, 'rb'))
    v = fn(); pickle.dump(v, open(f, 'wb')); return v


def file_key(paths):
    from .works import ROOT
    return '|'.join(f"{p}:{(ROOT / p.lstrip('/')).stat().st_size}" for p in paths)


def write_jpg(path, img, q=88):
    path.parent.mkdir(parents=True, exist_ok=True)
    cv2.imwrite(str(path), img, [cv2.IMWRITE_JPEG_QUALITY, q, cv2.IMWRITE_JPEG_PROGRESSIVE, 1])


def box_from_walls(walls, works, cams, log):
    """The room's rectangle: each side from the wall with most works facing in from it; a side with no
    such wall is set past the furthest camera or work on that side, and marked as estimated."""
    pts = np.array([w['c'] for w in works.values()] + [room.centre(c) for c in cams.values()])
    box, how = {}, {}
    for axis in (0, 2):
        for side in (1, -1):                                       # side +1: wall faces +axis, so it is the low end
            cands = [w for w in walls if w['axis'] == axis and w['side'] == side]
            if cands:
                best = max(cands, key=lambda w: len(w['works']))
                box[(axis, side)] = best['offset']; how[(axis, side)] = 'נמדד לפי ' + ', '.join(best['works'])
            else:
                box[(axis, side)] = (pts[:, axis].min() - 1.0) if side == 1 else (pts[:, axis].max() + 1.0)
                how[(axis, side)] = 'משוער (אין עליו עבודה מזוהה)'
    return box, how


def wall_surfaces(box, height, fy=0.0, texel=bake.TEXEL):
    x0, x1, z0, z1 = box[(0, 1)], box[(0, -1)], box[(2, 1)], box[(2, -1)]
    top = fy + height
    return [
        bake.Surface('wall-x0', [x0, top, z1], [0, 0, -1], [0, -1, 0], z1 - z0, height, [1, 0, 0], texel),
        bake.Surface('wall-x1', [x1, top, z0], [0, 0, 1], [0, -1, 0], z1 - z0, height, [-1, 0, 0], texel),
        bake.Surface('wall-z0', [x0, top, z0], [1, 0, 0], [0, -1, 0], x1 - x0, height, [0, 0, 1], texel),
        bake.Surface('wall-z1', [x1, top, z1], [-1, 0, 0], [0, -1, 0], x1 - x0, height, [0, 0, -1], texel),
    ]


REVEAL = 0.35          # depth of an opening (the wall's thickness) when the photos can't tell


def reveal_surfaces(wall, o, ceiling, name):
    """The two sides and the top of an opening cut in a wall, as surfaces facing into the opening."""
    top = wall.o + wall.v * (ceiling - o['height'])              # the wall at the opening's top height, u = 0
    out_dir = -wall.n                                            # into the wall's thickness
    down = np.array([0, -1.0, 0])
    h = o['height']
    return [
        bake.Surface(f'{name}-a', top + wall.u * o['from'], out_dir, down, REVEAL, h, wall.u),
        bake.Surface(f'{name}-b', top + wall.u * o['to'] + out_dir * REVEAL, -out_dir, down, REVEAL, h, -wall.u),
        bake.Surface(f'{name}-top', top + wall.u * o['from'], wall.u, out_dir, o['to'] - o['from'], REVEAL, down),
    ]


def floor_light(s, images, cams, masks, gains):
    """The light on the floor (pools under spots, darker corners), from the views that look steeply down.
    A polished floor mirrors the walls when seen at a low angle, so those views are left out; what remains
    is blurred to light only (the texture comes from the detail tile). Returns a grey map around 1.0 and
    the floor's average colour, or (None, colour) when too little of the floor was seen steeply."""
    X = s.grid()
    acc = np.zeros((s.H, s.W, 3)); wsum = np.zeros((s.H, s.W)); low, high = [], []
    for p, cam in cams.items():
        col, wgt, res, view = bake.sample(images[p], cam, X, masks[p])
        steep = np.clip((view * s.n).sum(-1), 0, 1)              # sine of the viewing angle above the floor
        q = wgt * (steep > 0.22) * steep ** 4
        acc += col * gains[p] * q[..., None]; wsum += q
        lum = (col * gains[p]).mean(-1)
        low += list(lum[(wgt > 0.5) & (steep < 0.16)]); high += list(lum[(wgt > 0.5) & (steep > 0.28)])
    seen = wsum > 0
    # how glossy: a polished floor is much brighter seen low (it mirrors the white walls) than seen steeply
    gloss = (np.median(low) / max(np.median(high), 1)) if len(low) > 500 and len(high) > 500 else 1.0
    s.gloss = float(gloss)
    if seen.mean() < 0.05:
        return None, None, seen
    col = acc / np.maximum(wsum, 1e-9)[..., None]
    mean = np.median(col[seen], axis=0)
    lum = col.mean(-1) / mean.mean()
    small = cv2.resize(np.where(seen, lum, 0).astype(np.float32), None, fx=0.1, fy=0.1, interpolation=cv2.INTER_AREA)
    wsm = cv2.resize(seen.astype(np.float32), (small.shape[1], small.shape[0]), interpolation=cv2.INTER_AREA)
    k = (0, 0)
    num = cv2.GaussianBlur(small, k, 3); den = cv2.GaussianBlur(wsm, k, 3)
    light = np.where(den > 0.02, num / np.maximum(den, 1e-6), 1.0)
    # far from anything seen, fade to neutral
    light = 1 + (light - 1) * np.clip(den / 0.3, 0, 1)
    return np.clip(light, 0.5, 1.6), mean, seen


def floor_detail(images, cams, masks, gains, fy, size=1.0, mpp=0.003):
    """A seamless tile of the floor's own texture at full detail (stone grain, terrazzo chips, concrete),
    cut from the photo that sees the floor closest, flattened so it carries texture but not light."""
    best = None
    for p, cam in cams.items():
        c = room.centre(cam)
        fwd = cam['R'].T @ np.array([0, 0, 1.0]); fwd[1] = 0; fwd /= np.linalg.norm(fwd)
        for d in (2.0, 2.6, 3.2, 3.8, 4.5, 5.2):
            mid = c + fwd * d; mid[1] = fy
            right = np.cross(fwd, [0, 1, 0])
            s = bake.Surface('tile', mid - right * size / 2 - fwd * size / 2, right, fwd, size, size, [0, 1, 0], texel=mpp)
            col, wgt, res, view = bake.sample(images[p], cam, s.grid(), masks[p])
            col = col * gains[p]
            if (wgt > 0.9).mean() < 0.98:
                continue
            score = np.median(res * np.clip((view * s.n).sum(-1), 0, 1))   # detail along both directions
            if best is None or score > best[0]:
                best = (score, col)
    if best is None:
        return None
    t = best[1]
    mean = t.reshape(-1, 3).mean(0)
    t = t / (cv2.GaussianBlur(t, (0, 0), 30) + 1) * mean      # texture of the floor at its average colour, without light
    n = t.shape[0]
    # seamless: cross-fade the tile with itself shifted by half
    sh = np.roll(np.roll(t, n // 2, 0), n // 2, 1)
    yy, xx = np.mgrid[0:n, 0:n] / (n - 1)
    w = (np.minimum(xx, 1 - xx) * 2) * (np.minimum(yy, 1 - yy) * 2)
    w = np.clip(w * 3, 0, 1)[..., None]
    return np.clip(t * w + sh * (1 - w), 0, 255).astype(np.uint8)


def look_of(cam, fy):
    c = room.centre(cam); fwd = cam['R'].T @ np.array([0, 0, 1.0]); up = -(cam['R'].T @ np.array([0, 1.0, 0]))
    h, w = cam['shape']
    return {'pos': [round(float(v), 3) for v in c - [0, fy, 0]], 'look': [round(float(v), 3) for v in c + fwd * 4 - [0, fy, 0]],
            'up': [round(float(v), 4) for v in up], 'fov': round(float(np.degrees(2 * np.arctan(h / 2 / cam['f']))), 2),
            'aspect': round(w / h, 4)}


def build(slug, log=print):
    t0 = time.time()
    ex = load_exhibition(slug)
    overrides = {}
    of = OUT / f'{slug}.overrides.json'
    if of.exists():
        overrides = json.load(open(of))
    log(f"{ex['title']}: {len(ex['photos'])} photos, {len(ex['works'])} works")
    found = cached('match2:' + file_key(ex['photos'] + [w['image'] for w in ex['works']]), lambda: find_works(ex, log))
    groups, sizes = solve(found, ex, log)
    if not groups:
        log('  no work was found in the photos: no space'); return None
    g = groups[0]
    cams, works = g['cams'], g['works']
    images = {p: load_image(p, 2000) for p in cams}
    matched = {p: [t for t in hits if t != '_shape'] for p, hits in found.items()}
    masks = room.work_masks(cams, works, sizes, matched, grow=0.02)
    fy, fconf = room.find_floor(cams, images, masks, log)
    floor_how = 'נמדדה: הגובה שבו הצילומים מסכימים על הרצפה'
    if fy is None:
        fy = float(np.median([room.centre(c)[1] for c in cams.values()]) - 1.45); floor_how = 'משוערת לפי גובה מצלמה רגיל'
    # measured by hand: the height of a work's centre above the floor fixes the floor exactly
    known = {t: h for t, h in overrides.get('work_centre_height', {}).items() if t in works}
    if known:
        fy = float(np.mean([works[t]['c'][1] - h for t, h in known.items()])); floor_how = 'ממדידה ידנית של גובה ' + ', '.join(known); fconf = 1.0
    walls = room.wall_candidates(works, sizes)
    box, box_how = box_from_walls(walls, works, cams, log)
    # tall wall textures first, to find where the walls meet the ceiling
    tall = wall_surfaces(box, 5.0, fy)
    gains = bake.exposure_gains(tall, images, cams, masks)
    tex = []
    for s in tall:
        col, cov, dis, n = bake.bake(s, images, cams, masks, gains)
        tex.append((col, cov > 0))
    ceiling = overrides.get('height') or room.ceiling_from_walls(tex, bake.TEXEL, 5.0)
    ceiling_how = 'נמדדה: הקו שבו הקירות פוגשים את התקרה' if ceiling and 'height' not in overrides else ('ממדידה ידנית' if ceiling else 'משוערת')
    ceiling = ceiling or 3.5
    x0, x1, z0, z1 = box[(0, 1)], box[(0, -1)], box[(2, 1)], box[(2, -1)]
    for k, v in overrides.get('walls', {}).items():               # e.g. {"x1": 6.1}
        kk = {'x0': (0, 1), 'x1': (0, -1), 'z0': (2, 1), 'z1': (2, -1)}[k]; box[kk] = v; box_how[kk] = 'ממדידה ידנית'
    x0, x1, z0, z1 = box[(0, 1)], box[(0, -1)], box[(2, 1)], box[(2, -1)]
    log(f"  room {x1 - x0:.2f} x {z1 - z0:.2f} m, ceiling {ceiling:.2f} m")

    d = OUT / slug
    rel = f'data/spaces/{slug}'
    surfaces = []
    floor_s = bake.Surface('floor', [x0, fy, z0], [1, 0, 0], [0, 0, 1], x1 - x0, z1 - z0, [0, 1, 0])
    flight, fmean, fseen = floor_light(floor_s, images, cams, masks, gains)
    tile = floor_detail(images, cams, masks, gains, fy)
    ref = tile if tile is not None else np.full((8, 8, 3), fmean if fmean is not None else 128, np.uint8)
    lab = cv2.cvtColor(ref.astype(np.uint8), cv2.COLOR_BGR2LAB).reshape(-1, 3).astype(np.float32)
    floor_lab = (np.median(lab, 0), np.median(np.abs(lab - np.median(lab, 0)), 0) * 1.48)
    measured = {'wall-x0': (0, 1), 'wall-x1': (0, -1), 'wall-z0': (2, 1), 'wall-z1': (2, -1)}
    walls_baked = [(s, *bake.bake(s, images, cams, masks, gains)[:2]) for s in wall_surfaces(box, ceiling, fy, texel=0.005)]
    wall_seen = float(np.mean([c.mean() for _, _, c in walls_baked]))
    # a wall no photo saw (or barely) is completed from the walls that were seen: the same plaster, the
    # same fall of light from floor to ceiling, so it reads as the same room rather than a hole
    ref = max(walls_baked, key=lambda b: b[2].mean())
    profile = room.wall_profile(ref[1], ref[2] > 0)
    for s, col, cov in walls_baked:
        if cov.mean() < 0.15 and profile is not None:
            synth = np.repeat(profile[:, None, :], col.shape[1], axis=1).astype(np.float32)
            synth += cv2.GaussianBlur(np.random.default_rng(1).normal(0, 2.0, synth.shape[:2]).astype(np.float32), (0, 0), 0.7)[..., None]
            col[cov == 0] = np.clip(synth, 0, 255).astype(np.uint8)[cov == 0]; cov[:] = 1
    for s, col, cov in walls_baked:
        # openings only in walls whose place was measured (a guessed wall has nothing to cut into)
        # and only where the wall was well photographed: a poorly seen corner is no evidence of a doorway
        ops = room.openings_in_wall(col, cov > 0, floor_lab, s.texel, ceiling, ceiling) \
            if box_how[measured[s.name]].startswith('נמדד') and cov.mean() > 0.7 else []
        col = bake.fill_holes(col, cov)
        write_jpg(d / f'{s.name}.jpg', col)
        surfaces.append(surface_json(s, fy, f'{rel}/{s.name}.jpg', 'wall', cov, ops))
        # the inside of each opening (the wall's thickness) is baked from the photos too, like the walls
        for k, o in enumerate(ops):
            o['depth'] = REVEAL
            for r in reveal_surfaces(s, o, ceiling, f'{s.name}-o{k}'):
                rc, rcov, _, _ = bake.bake(r, images, cams, masks, gains)
                rc = bake.fill_holes(rc, rcov)
                write_jpg(d / f'{r.name}.jpg', rc)
                surfaces.append(surface_json(r, fy, f'{rel}/{r.name}.jpg', 'reveal', rcov, []))
        if ops:
            log(f"  {s.name}: openings " + ', '.join(f"{o['from']:.2f}-{o['to']:.2f} m{' (arch)' if o['arch'] else ''}" for o in ops))
    if flight is not None:
        write_jpg(d / 'floor-light.jpg', np.clip((flight ** 2.2) / 4 * 255, 0, 255).astype(np.uint8), 92)
    surfaces.append(surface_json(floor_s, fy, f'{rel}/floor-detail.jpg' if tile is not None else None, 'floor', fseen, []))
    surfaces[-1].update({'light': f'{rel}/floor-light.jpg' if flight is not None else None, 'lightScale': 4,
                         'tile': 1.0, 'color': [int(v) for v in (fmean[::-1] if fmean is not None else (140, 120, 100))]})
    ceil_s = bake.Surface('ceiling', [x0, fy + ceiling, z1], [1, 0, 0], [0, 0, -1], x1 - x0, z1 - z0, [0, -1, 0], texel=0.02)
    ccol, ccov, _, _ = bake.bake(ceil_s, images, cams, masks, gains)
    ccol = bake.fill_holes(ccol, ccov)
    write_jpg(d / 'ceiling.jpg', ccol)
    surfaces.append(surface_json(ceil_s, fy, f'{rel}/ceiling.jpg', 'ceiling', ccov, []))
    if tile is not None:
        write_jpg(d / 'floor-detail.jpg', tile, 90)

    # a work that hangs flat on a wall is set exactly flat on it, just off its surface (the photos put it there
    # to within a few millimetres; exactly is better than nearly, since a sliver of tilt would cut into the wall)
    for wl in walls:
        if box.get((wl['axis'], wl['side'])) != wl['offset']:
            continue
        n = np.zeros(3); n[wl['axis']] = wl['side']
        for t in wl['works']:
            wk = works[t]
            lean = np.degrees(np.arcsin(np.clip(-wk['R'][1, 2], -1, 1)))
            if abs(lean) > 3:
                continue
            x = np.cross([0, 1, 0], n); x /= np.linalg.norm(x)
            if x @ wk['R'][:, 0] < 0: x = -x
            wk['R'] = np.column_stack([x, [0, 1, 0], np.cross(x, [0, 1, 0])])
            if wk['R'][:, 2] @ n < 0: wk['R'][:, 2] *= -1; wk['R'][:, 0] *= -1
            wk['c'] = wk['c'].copy(); wk['c'][wl['axis']] = wl['offset'] + wl['side'] * (0.035 + 0.004)

    # works: where, how big (as measured), and the light that fell on them
    by_title = {w['title']: w for w in ex['works']}
    out_works = []
    for t, wk in works.items():
        info = by_title[t]
        sw, sh = sizes[t]
        sc = wk.get('scale', np.ones(2))
        light = bake.work_light({**info, **wk}, (sw * sc[0], sh * sc[1]), images, cams, gains)
        lp = None
        if light is not None:
            lp = f'{rel}/light/{slugify(t)}.png'
            (d / 'light').mkdir(parents=True, exist_ok=True)
            # stored linear (the viewer multiplies light in linear space), 1.0 = the reference image's own brightness
            cv2.imwrite(str(d / 'light' / f'{slugify(t)}.png'), np.clip((light ** 2.2) / 5 * 255, 0, 255).astype(np.uint8))
        R = wk['R']
        out_works.append({'work': t, 'image': info['image'], 'size': [round(sw * 100, 1), round(sh * 100, 1)],
                          'measured': [round(sw * sc[0] * 100, 1), round(sh * sc[1] * 100, 1)],
                          'centre': [round(float(v), 4) for v in wk['c'] - [0, fy, 0]],
                          'axes': [[round(float(v), 5) for v in R[:, k]] for k in range(3)],
                          'depth': 0.035, 'light': lp, 'lightScale': 5})
    views = []
    for p, cam in sorted(cams.items()):
        v = look_of(cam, fy); v['photo'] = p
        v['pos'][0] = float(np.clip(v['pos'][0], x0 + 0.08, x1 - 0.08)); v['pos'][2] = float(np.clip(v['pos'][2], z0 + 0.08, z1 - 0.08))
        views.append(v)
    spec = {
        'version': 2, 'title': ex['title'], 'generated': str(date.today()),
        'source': f"Built from {len(cams)} installation photos",
        'room': {'x0': round(x0, 3), 'x1': round(x1, 3), 'z0': round(z0, 3), 'z1': round(z1, 3), 'height': round(ceiling, 3)},
        'surfaces': surfaces, 'works': out_works, 'views': views,
        'floorReflect': [round(float(np.clip((floor_s.gloss - 1) * 0.2, 0.02, 0.1)), 3), round(float(np.clip((floor_s.gloss - 1) * 0.9, 0.05, 0.45)), 3)],
        'floorGloss': round(floor_s.gloss, 3),
    }
    # how much to trust this space: too little and it is not offered as a walk (the report says what's missing)
    measured_walls = sum(v.startswith('נמדד') for v in box_how.values())
    if len(works) < 4 or measured_walls < 2:
        quality = 'insufficient'
    elif measured_walls < 4 or wall_seen < 0.7 or g['rms_px'] > 4:
        quality = 'partial'
    else:
        quality = 'good'
    spec['quality'] = quality
    if quality == 'partial':
        spec['source'] = f"Partly reconstructed from {len(cams)} installation photos"
    log(f"  quality: {quality} ({len(works)} works placed, {measured_walls} walls measured, walls seen {wall_seen:.0%})")
    json.dump(spec, open(OUT / f'{slug}.json', 'w'), indent=1, ensure_ascii=False)
    write_report(slug, ex, found, groups, g, sizes, works, spec, box_how, floor_how, ceiling_how, fconf, time.time() - t0)
    log(f"  done in {time.time() - t0:.0f} s")
    return spec


def surface_json(s, fy, tex, kind, cover, openings):
    return {'name': s.name, 'kind': kind, 'texture': tex,
            'origin': [round(float(v), 4) for v in s.o - [0, fy, 0]], 'u': [float(v) for v in s.u], 'v': [float(v) for v in s.v],
            'size': [round(s.su, 4), round(s.sv, 4)], 'normal': [float(v) for v in s.n],
            'seen': round(float(cover.mean()), 3), 'openings': openings}


def write_report(slug, ex, found, groups, g, sizes, works, spec, box_how, floor_how, ceiling_how, fconf, secs):
    """A short report in Hebrew for the artist: what was found, measured, and what to check."""
    L = ['<div dir="rtl">', '', f"# דוח חלל: {ex['title']}", '',
         f"נבנה אוטומטית ב־{spec['generated']} מתוך {len(ex['photos'])} צילומים ו־{len(ex['works'])} עבודות ({secs:.0f} שניות).", '',
         '## מה נמצא', '', '| צילום | עבודות שזוהו |', '|---|---|']
    for p, hits in found.items():
        names = [t for t in hits if t != '_shape']
        L.append(f"| `{p.split('/')[-1]}` | {', '.join(names) if names else '—'} |")
    r = spec['room']
    q = spec.get('quality')
    L += ['', '## איכות', '',
          {'good': 'החלל שלם ונמדד היטב, ומוצג באפליקציה.',
           'partial': 'החלל מוצג באפליקציה כ"שחזור חלקי": חלק מהקירות או מהעבודות לא נמדדו מהצילומים.',
           'insufficient': 'אין מספיק מידע בצילומים כדי לבנות חלל אמין, ולכן הוא לא מוצג כסיור. התערוכה עצמה מוצגת עם הצילומים שלה.'}.get(q, ''),
          '', 'מה ישפר: צילומים רחבים שבכל אחד 2–3 עבודות ופינת חדר, כך שכל קיר מופיע בשני צילומים לפחות; או סרטון הליכה איטי של דקה–שתיים; ומד לייזר לאורך, רוחב וגובה החדר.' if q != 'good' else '']
    L += ['', '## מידות', '',
          f"- **החדר:** {r['x1'] - r['x0']:.2f} × {r['z1'] - r['z0']:.2f} מ', גובה {r['height']:.2f} מ'.",
          f"- **רצפה:** {floor_how}" + (' (ודאות נמוכה: כדאי למדוד גובה של עבודה אחת מהרצפה)' if fconf < 0.08 else '') + '.',
          f"- **תקרה:** {ceiling_how}.",
          f"- **דיוק המדידה:** סטייה ממוצעת של {g['rms_px']:.1f} פיקסלים בין המודל לצילומים.", '',
          '| קיר | איך נקבע |', '|---|---|']
    names = {(0, 1): 'x0', (0, -1): 'x1', (2, 1): 'z0', (2, -1): 'z1'}
    for k, v in box_how.items():
        L.append(f"| {names.get(k, k)} | {v} |")
    L += ['', '## עבודות', '', '| עבודה | מידה רשומה (ס"מ) | נמדד בצילומים (ס"מ) | גובה המרכז מהרצפה | הערה |', '|---|---|---|---|---|']
    for w in spec['works']:
        a, b = w['size'], w['measured']
        diff = max(abs(b[0] / a[0] - 1), abs(b[1] / a[1] - 1))
        note = 'לבדוק את המידה או את התמונה' if diff > 0.04 else ''
        L.append(f"| {w['work']} | {a[0]:.0f} × {a[1]:.0f} | {b[0]:.0f} × {b[1]:.0f} | {w['centre'][1]:.2f} מ' | {note} |")
    placed = set(works)
    lost = [w for w in ex['works'] if w['listed'] and w['title'] not in placed]
    other = [t for gg in groups[1:] for t in gg['works']]
    seen_any = {t for hits in found.values() for t in hits if t != '_shape'}
    if lost:
        L += ['', '## לא מוקמו', '']
        for w in lost:
            t = w['title']
            if not w['size_cm']:
                why = 'אין מידה שאפשר לקרוא ברשומה' + (' (זוהתה בצילומים)' if t in seen_any else '')
            elif t in other:
                why = 'נמצאה רק בצילומים שלא מתחברים לשאר'
            else:
                why = 'לא זוהתה באף צילום'
            L.append(f"- {t}: {why}")
    mis = [w for w in ex['works'] if w['listed'] and (w['size_misfit'] or 0) > 0.04]
    if mis or ex['missing']:
        L += ['', '## נתונים לבדיקה', '']
        for w in mis:
            L.append(f"- {w['title']}: הפרופורציה של התמונה לא מתאימה למידה הרשומה ({w['size_misfit'] * 100:.0f}%).")
        for t in ex['missing']:
            L.append(f"- {t}: אין רשומה או תמונה באתר.")
    L += ['', '</div>', '']
    open(OUT / f'{slug}.report.md', 'w', encoding='utf-8').write('\n'.join(L))


def main(argv):
    cv2.setRNGSeed(0); np.random.seed(0)                          # same inputs, same space (no needless rebuild commits)
    studio = json.load(open(APP / 'data' / 'studio.json', encoding='utf-8'))
    slugs = argv or [slugify(t) for t in studio['exhibitions']]
    for s in slugs:
        try:
            build(s)
        except Exception as e:                                    # one exhibition failing must not stop the rest
            import traceback; traceback.print_exc()
            print(f'{s}: failed: {e}')
    # the app finds the built spaces through this index
    index = {}
    for f in sorted(OUT.glob('*.json')):
        if f.name.endswith(('.overrides.json',)) or f.name == 'index.json':
            continue
        spec = json.load(open(f, encoding='utf-8'))
        if spec.get('version') == 2 and spec.get('quality') != 'insufficient':
            index[f.stem] = {'title': spec['title'], 'generated': spec['generated'], 'works': len(spec['works'])}
    json.dump(index, open(OUT / 'index.json', 'w'), indent=1, ensure_ascii=False)


if __name__ == '__main__':
    main(sys.argv[1:])
