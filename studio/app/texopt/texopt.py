"""Phone-friendly copies of every image the 3D viewer loads (works, tour walls and floors, light maps).

For each image it writes, beside a mirror of the original's path under an `opt/` folder (the original is never
changed or deleted):
  <name>.<edge>.ktx2   GPU-compressed copies with mipmaps (Basis UASTC for works and light maps, ETC1S for walls
                       and floors where it measures as good as UASTC would, else UASTC): a work's copy held from afar
                       (768 px; up close the viewer loads the original), a surface at the size a phone holds it
                       (2048 px a wall, 1536 a floor; a tour's own walls also at full size, up to 4096)
  <name>.768.webp      the small copy for a browser that can't read KTX2 (the full fallback is the original)
  <name>.relief.ktx2   a work's varnish relief (the normal map the viewer used to draw from the picture: a
                       compressed texture can't be read back in the browser)
and a manifest entry, keyed by the original's path, that the viewer reads (`data/tex.json`, or for artists'
uploads `works/opt/manifest.json` in the storage bucket).

Every copy is decoded back (as the phone's GPU will see it) and compared with the picture it was made from:
PSNR, mean colour difference (CIE76 dE) and the mean shift per channel. A copy that fails is not listed, so the
viewer keeps the original. Nothing visible is lost: that is measured, not assumed.

    python3 studio/app/texopt/texopt.py site APP_DIR OUT_DIR [--media MEDIA_DIR] [--cache DIR] [--jobs N] [--budget S]
    python3 studio/app/texopt/texopt.py one SRC KIND OUT_DIR       (a single image: work | wall | floor | light)
    python3 studio/app/texopt/texopt.py bucket [--all] [--jobs N]  (artists' uploads in Supabase storage)
"""
import hashlib, json, os, shutil, subprocess, sys, tempfile, time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import numpy as np
from PIL import Image, ImageOps

Image.MAX_IMAGE_PIXELS = 200_000_000
VERSION = 7                         # bump when the encoding changes: every cached copy is made again
SMALL, SURF_MAX = 768, 4096
PHONE_CAP = {'wall': 2048, 'floor': 1536}      # what a phone holds of a room's photograph (space.js fit)
KTX = shutil.which('ktx') or 'ktx'
KIND_VERSION = {}      # (a kind whose encoding didn't change keeps its cached copies)
# what a copy must reach against the picture it was made from (decoded as the GPU will see it)
GATE = {
# psnr: the detail; de: the colour (mean CIE76 dE once both are softened over 5 px, so grain and paint texture don't count as
# colour); bias: the largest mean shift of a channel, in levels (a tint). The 640 px WebP thumbnails the viewer showed before
# measure psnr 33.6-35.5, de 1.3 (median) against their source: every copy here must be better than that.
    'work':  dict(psnr=38.0, de=0.8, bias=0.5),
    'light': dict(psnr=40.0, de=1.0, bias=0.5),
    # a room's photograph: ETC1S first (an eighth of the memory, ~a JPEG's download), UASTC when it falls short. Below 2.3 a colour
    # difference can't be seen (CIE76 JND); room photos are seen afar and at a slant
    'wall':  dict(psnr=34.0, de=2.0, bias=1.0),
    'floor': dict(psnr=34.0, de=2.0, bias=1.0),
}


# --- colour measures ------------------------------------------------------------------------------------------
def _lab(a):
    c = a[..., :3].astype(np.float64) / 255.0
    c = np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)
    M = np.array([[0.4124, 0.3576, 0.1805], [0.2126, 0.7152, 0.0722], [0.0193, 0.1192, 0.9505]])
    xyz = c @ M.T / np.array([0.95047, 1.0, 1.08883])
    f = np.where(xyz > 0.008856, np.cbrt(xyz), 7.787 * xyz + 16 / 116)
    return np.stack([116 * f[..., 1] - 16, 500 * (f[..., 0] - f[..., 1]), 200 * (f[..., 1] - f[..., 2])], -1)


def compare(ref, got, linear=False):
    """PSNR (dB); mean colour difference of the two softened over 5 px (CIE76 dE; for a light map: mean abs difference in
    levels); the largest mean shift of a channel (levels)."""
    from PIL import ImageFilter
    a, b = np.asarray(ref, np.float64)[..., :3], np.asarray(got, np.float64)[..., :3]
    mse = ((a - b) ** 2).mean()
    psnr = 99.0 if mse == 0 else 10 * np.log10(255 ** 2 / mse)
    soft = lambda im: np.asarray(im.convert('RGB').filter(ImageFilter.BoxBlur(2)), np.float64)
    sa, sb = soft(ref), soft(got)
    de = float(np.abs(sa - sb).mean()) if linear else float(np.linalg.norm(_lab(sa) - _lab(sb), axis=-1).mean())
    bias = float(np.abs((b - a).reshape(-1, 3).mean(0)).max())
    return round(float(psnr), 2), round(de, 3), round(bias, 3)


# --- encoding -------------------------------------------------------------------------------------------------
def run(*a):
    r = subprocess.run([str(x) for x in a], capture_output=True, text=True)
    if r.returncode:
        raise RuntimeError(f'{a[0]} {a[1]}: {r.stderr.strip()[:300]}')


def relief(im):
    """The varnish relief the viewer drew in the browser (space.js reliefFrom): 512 px, luminance slopes, k = 2.2."""
    w = min(512, im.width); h = round(w * im.height / im.width)
    p = np.asarray(im.convert('RGB').resize((w, h), Image.BILINEAR), np.float64)
    L = (p[..., 0] * 0.3 + p[..., 1] * 0.59 + p[..., 2] * 0.11) / 255
    k = 2.2
    dx = (np.concatenate([L[:, 1:], L[:, -1:]], 1) - np.concatenate([L[:, :1], L[:, :-1]], 1)) * k
    dy = (np.concatenate([L[1:], L[-1:]], 0) - np.concatenate([L[:1], L[:-1]], 0)) * k
    n = np.sqrt(dx * dx + dy * dy + 1)
    o = np.stack([-dx / n * 0.5 + 0.5, dy / n * 0.5 + 0.5, 1 / n * 0.5 + 0.5], -1) * 255
    return Image.fromarray(np.clip(o + 0.5, 0, 255).astype(np.uint8), 'RGB')


def encode(im, out, codec, srgb, tmp, rdo=False):
    """One KTX2 file with all its mipmaps. The picture is stored bottom row first: three uploads a compressed texture
    as it is (it can't flip it), and a plane's v runs upwards."""
    src = Path(tmp) / (out.name + '.png')
    ImageOps.flip(im).save(src)
    fmt = ('R8G8B8A8' if im.mode == 'RGBA' else 'R8G8B8') + ('_SRGB' if srgb else '_UNORM')
    args = [KTX, 'create', '--format', fmt, '--generate-mipmap', '--encode', codec, '--assign-tf', 'srgb' if srgb else 'linear']
    if codec == 'uastc':
        # works: RDO at lambda 1 makes the files ~22% smaller for psnr 45.7 -> 42.3 dB (still inside the gate), ~3x slower
        args += (['--uastc-quality', 1, '--uastc-rdo', '--uastc-rdo-l', 1] if rdo else ['--uastc-quality', 2]) + ['--zstd', 19]
    else:
        args += ['--clevel', 4, '--qlevel', 255]
    if not srgb:
        args += ['--mipmap-filter', 'box']
    run(*args, '--threads', 2, src, out)
    src.unlink()


def decode(ktx2, tmp):
    """The top level as the phone's GPU gets it (UASTC -> ASTC is exact; ETC1S -> ETC1 decoded the same way)."""
    t = Path(tmp) / (ktx2.name + '.rgba.ktx2'); png = Path(tmp) / (ktx2.name + '.png')
    run(KTX, 'transcode', '--target', 'rgba8', ktx2, t)
    run(KTX, 'extract', '--level', 0, t, png)
    im = ImageOps.flip(Image.open(png).convert('RGB')); im.load()
    t.unlink(); png.unlink()
    return im


def sized(im, edge, four=True):
    """At most `edge` px on the long side; for a GPU copy, both sides a multiple of 4 (block-compressed formats are made of 4x4
    blocks: WebGL refuses any other size, and the surface drew black, 24.11). That moves a side by 2 px at most, under 0.25% of any
    picture over 800 px; a work's size on the wall comes from its measured cm, not from its picture."""
    k = min(1.0, edge / max(im.size))
    w, h = max(1, round(im.width * k)), max(1, round(im.height * k))
    if four:
        w, h = max(4, round(w / 4) * 4), max(4, round(h / 4) * 4)
    return im if (w, h) == im.size else im.resize((w, h), Image.LANCZOS)


def make(src, kind, out_dir, stem):
    """All copies of one image. Returns its manifest entry (paths relative to out_dir), or an entry with `fail`."""
    out_dir = Path(out_dir); out_dir.mkdir(parents=True, exist_ok=True)
    im = ImageOps.exif_transpose(Image.open(src))
    alpha = im.mode in ('RGBA', 'LA', 'PA') or (im.mode == 'P' and 'transparency' in im.info)
    im = im.convert('RGBA' if alpha else 'RGB')
    srgb = kind != 'light'
    W, H = im.size
    entry = {'w': W, 'h': H, 'kind': kind, 'v': [], 'q': {}}
    top = max(W, H)
    if kind == 'work':
        # only the copy held from afar: up close the viewer loads the original (a 2048 px UASTC copy is ~7x a JPEG to download
        # on a phone's data, and at most two works are held full at once, so it saved little memory; the lead, 24.11)
        edges = {SMALL if top > SMALL * 1.2 else top}
    elif kind in PHONE_CAP:
        edges = {min(SURF_MAX, top)} | ({PHONE_CAP[kind]} if top > PHONE_CAP[kind] * 1.05 else set())
    else:
        edges = {min(SURF_MAX, top)}
    edges = sorted(edges)
    with tempfile.TemporaryDirectory() as tmp:
        for e in edges:
            pic = sized(im, e)
            codecs = ['basis-lz', 'uastc'] if kind in ('wall', 'floor') else ['uastc']
            for codec in codecs:
                f = out_dir / f'{stem}.{e}.ktx2'
                encode(pic, f, codec, srgb, tmp, rdo=kind == 'work')
                q = compare(pic, decode(f, tmp), linear=not srgb)
                g = GATE[kind]
                ok = q[0] >= g['psnr'] and q[1] <= g['de'] and q[2] <= g['bias']
                if ok or codec == codecs[-1]:
                    break
            entry['q'][str(e)] = {'codec': 'etc1s' if codec == 'basis-lz' else 'uastc', 'psnr': q[0], 'de': q[1], 'bias': q[2], 'kb': round(f.stat().st_size / 1024), 'ok': ok}
            if not ok:
                f.unlink(); entry['fail'] = f'{e}px {codec}: psnr {q[0]} dE {q[1]} shift {q[2]}'
                continue
            entry['v'].append([e, f.name, pic.width, pic.height])
        if SMALL in edges and any(v[0] == SMALL for v in entry['v']):
            fb = out_dir / f'{stem}.{SMALL}.webp'
            sized(im, SMALL, four=False).save(fb, 'WEBP', quality=86, method=6)
            entry['fb'] = fb.name
        if kind == 'work':
            r = out_dir / f'{stem}.relief.ktx2'
            encode(sized(relief(im), 512), r, 'basis-lz', False, tmp)      # (ETC1S: 45-90 KB, not 170-320; at the relief's strength of 0.2 its error doesn't show on screen: tests/tex_memory.cjs)
            entry['r'] = r.name
    return entry


# --- the site's images (the app's own data and the site's /media/works) -----------------------------------------
def kind_of(rel, spec_kinds):
    if rel in spec_kinds:
        return spec_kinds[rel]
    n = rel.lower()
    if '/works/' in n or n.startswith('media/'):
        return 'work'
    if 'light' in n:
        return 'light'
    if 'floor' in n or 'ceiling' in n:
        return 'floor'
    return 'wall'


def site_images(app, media):
    """Every image a 3D room loads from the site: the tours' surfaces, light maps and works (read from their specs),
    the rooms' and the museum's pictures, and the site's works (/media/works)."""
    app = Path(app); found = {}
    for spec in sorted((app / 'data' / 'spaces').glob('*.json')):
        if spec.name.count('.') > 1 or spec.name == 'index.json':
            continue
        try:
            s = json.loads(spec.read_text(encoding='utf-8'))
        except Exception:
            continue
        for x in s.get('surfaces', []) or []:
            if isinstance(x.get('texture'), str):
                found[x['texture'].lstrip('/')] = 'floor' if x.get('kind') in ('floor', 'ceiling') else 'wall'
        for w in s.get('works', []) or []:
            for key in ('image', 'imageFull'):          # (the viewer asks for a work by its image: its 768 px copy replaces the small one)
                if isinstance(w.get(key), str):
                    found[w[key].lstrip('/')] = 'work'
        if isinstance(s.get('plaster'), str):
            found[s['plaster'].lstrip('/')] = 'wall'
    for sub in ('rooms', 'museum'):
        for f in sorted((app / 'data' / sub).rglob('*')):
            if {'outside', 'drafts'} & set(f.relative_to(app / 'data' / sub).parts[:1]):
                continue                                   # (drafts: working files, not loaded by a room)                                   # (the garden's leaf atlases are cut on a canvas in the browser: they stay as they are)
            if f.suffix.lower() in ('.jpg', '.jpeg', '.png', '.webp') and f.is_file():
                rel = f.relative_to(app).as_posix()
                found.setdefault(rel, kind_of(rel, {}))
    out = []
    # (the measured light maps stay as they are: 48-512 px, under 1 MB together, and as KTX2 a painting under one came out ~4%
    # darker on screen, 24.11, cause not found; tests/tex_memory.cjs compares the colour on screen)
    for rel, k in sorted(found.items()):
        if rel.startswith('media/'):
            f = Path(media) / rel[len('media/'):] if media else None
        else:
            f = app / rel
        if f and f.is_file() and f.suffix.lower() in ('.jpg', '.jpeg', '.png', '.webp'):
            out.append((rel, k, f))
    if media and (Path(media) / 'works').is_dir():
        for f in sorted((Path(media) / 'works').iterdir()):
            rel = f'media/works/{f.name}'
            if f.suffix.lower() in ('.jpg', '.jpeg', '.png', '.webp') and rel not in found:
                out.append((rel, 'work', f))
    return out


def digest(f, kind):
    h = hashlib.sha1(f.read_bytes()); h.update(f'{kind}:{KIND_VERSION.get(kind, VERSION)}'.encode()); return h.hexdigest()[:20]


def site(app, out, media=None, cache=None, jobs=os.cpu_count() or 2, budget=None):
    """Copies for every site image into OUT/opt/<path>.*, and OUT/data/tex.json. A cache (by content) makes a re-run cheap;
    with a time budget, what isn't reached in time is simply left out of the manifest (the viewer uses the original)."""
    out = Path(out); cache = Path(cache) if cache else out / '.texopt-cache'; cache.mkdir(parents=True, exist_ok=True)
    items = site_images(app, media); t0 = time.time(); manifest = {}; fails = []; made = 0

    keys = {rel: digest(f, kind) for rel, kind, f in items}
    first = {}
    for rel, kind, f in items:
        first.setdefault(keys[rel], (kind, f))      # (the same picture under two names is made once)

    def build(key):
        cdir = cache / key
        if (cdir / 'entry.json').exists():
            return key, False
        if budget and time.time() - t0 > budget:
            return key, None
        kind, f = first[key]
        tmp = cache / (key + '.part'); shutil.rmtree(tmp, ignore_errors=True)
        try:
            e = make(f, kind, tmp, 'x')
        except Exception as x:                           # (one picture that can't be made never holds back the others)
            print(f'texopt: {f}: {x}'); shutil.rmtree(tmp, ignore_errors=True); return key, None
        (tmp / 'entry.json').write_text(json.dumps(e))
        for k in range(6):                               # (Windows: a scanner may hold new files for a moment)
            try:
                shutil.rmtree(cdir, ignore_errors=True); tmp.rename(cdir); break
            except PermissionError:
                time.sleep(1 + k)
        else:
            shutil.copytree(tmp, cdir, dirs_exist_ok=True); shutil.rmtree(tmp, ignore_errors=True)
        return key, True

    with ThreadPoolExecutor(jobs) as ex:
        built = dict(ex.map(build, sorted(first)))
    made = sum(1 for v in built.values() if v)

    (out / 'opt' / 'h').mkdir(parents=True, exist_ok=True)
    copied, lock = set(), __import__('threading').Lock()

    def one(item):
        """The manifest entry of one picture. Its copies are kept once per content (opt/h/<hash>.*): the same picture under two
        names is published once. A room's surface outside the tours keeps only the size a phone holds (a computer loads the
        original, as before): the larger copies would only add to the site."""
        rel, kind, f = item
        key = keys[rel]; cdir = cache / key
        if not (cdir / 'entry.json').exists():
            return rel, None, False
        e = json.loads((cdir / 'entry.json').read_text())
        if kind in PHONE_CAP and not rel.startswith('data/spaces/'):
            e['v'] = [v for v in e['v'] if v[0] <= PHONE_CAP[kind]] or e['v'][:1]
        base = f'opt/h/{key}'
        files = [(cdir / v[1], f'{base}.{v[0]}.ktx2') for v in e['v']] + [(cdir / e[k], base + suf) for k, suf in (('fb', f'.{SMALL}.webp'), ('r', '.relief.ktx2')) if k in e]
        for src_, dst in files:
            with lock:
                if dst in copied:
                    continue
                copied.add(dst)
            shutil.copyfile(src_, out / dst)
        for v in e['v']:
            v[1] = f'{base}.{v[0]}.ktx2'
        for k, suf in (('fb', f'.{SMALL}.webp'), ('r', '.relief.ktx2')):
            if k in e:
                e[k] = base + suf
        return rel, e, False

    with ThreadPoolExecutor(jobs) as ex:
        for rel, e, _ in ex.map(one, items):
            if e is None:
                continue
            if e.get('fail'):
                fails.append(f'{rel}: {e["fail"]}')
            if e['v']:
                manifest[rel] = {k: e[k] for k in ('w', 'h', 'v', 'fb', 'r', 'kind') if k in e}
    (out / 'data').mkdir(parents=True, exist_ok=True)
    try:                                         # (the viewer asks for the artists' manifest only once it exists: a missing one is an error on the page)
        import urllib.request
        bucket_on = urllib.request.urlopen(f'{SB}/storage/v1/object/public/{BUCKET}/{MANIFEST}', timeout=30).status == 200
    except Exception:
        bucket_on = False
    (out / 'data' / 'tex.json').write_text(json.dumps({'v': VERSION, 'bucket': bucket_on, 'tex': manifest}, separators=(',', ':')))
    report = out / 'data' / 'tex.report.json'
    report.write_text(json.dumps({'images': len(items), 'listed': len(manifest), 'made_now': made, 'fails': fails,
                                  'seconds': round(time.time() - t0)}, indent=1))
    print(f'texopt: {len(manifest)}/{len(items)} images with phone copies ({made} made now, {len(fails)} copies held back by the quality check) in {time.time() - t0:.0f} s')
    return manifest, fails


# --- artists' uploads (Supabase storage, bucket `works`) ---------------------------------------------------------
SB = os.environ.get('SUPABASE_URL', 'https://hlpzqeosdavfuzjgpwhy.supabase.co')
BUCKET, MANIFEST = 'works', 'opt/manifest.json'


def _sb(method, path, body=None, ctype='application/json', extra=None):
    import urllib.request
    key = os.environ['SUPABASE_SECRET_KEY']
    data = body if isinstance(body, (bytes, type(None))) else json.dumps(body).encode()
    rq = urllib.request.Request(f'{SB}/storage/v1/{path}', data=data, method=method,
                                headers={'apikey': key, 'Authorization': f'Bearer {key}', 'Content-Type': ctype, **(extra or {})})
    with urllib.request.urlopen(rq, timeout=120) as r:
        return r.read()


def _list(prefix=''):
    out, off = [], 0
    while True:
        page = json.loads(_sb('POST', f'object/list/{BUCKET}', {'prefix': prefix, 'limit': 1000, 'offset': off, 'sortBy': {'column': 'name', 'order': 'asc'}}))
        for o in page:
            name = f'{prefix}{o["name"]}'
            if o.get('id') is None:                      # a folder
                if o['name'] != 'opt':
                    out += _list(name + '/')
            else:
                out.append((name, (o.get('metadata') or {}).get('size', 0), o.get('updated_at') or ''))
        if len(page) < 1000:
            return out
        off += 1000


def _put(path, data, ctype, cache='31536000'):
    _sb('POST', f'object/{BUCKET}/{path}', data, ctype, {'x-upsert': 'true', 'cache-control': f'max-age={cache}'})


def bucket(all_=False, jobs=2):
    import urllib.request
    try:
        man = json.loads(urllib.request.urlopen(f'{SB}/storage/v1/object/public/{BUCKET}/{MANIFEST}?t={time.time():.0f}', timeout=60).read())
    except Exception:
        man = {'v': VERSION, 'tex': {}}
    tex = man.get('tex', {}) if man.get('v') == VERSION else {}
    objs = [(n, s, u) for n, s, u in _list() if n.lower().rsplit('.', 1)[-1] in ('jpg', 'jpeg', 'png', 'webp') and '/opt/' not in f'/{n}']
    todo = [(n, s, u) for n, s, u in objs if all_ or n not in tex or tex[n].get('src') != f'{s}:{u}']
    print(f'bucket: {len(objs)} images, {len(todo)} to make')
    fails = []

    def one(o):
        try:
            return make_one(o)
        except Exception as x:
            print(f'bucket: {o[0]}: {x}'); return o[0], {'v': [], 'fail': str(x)[:200]}

    def make_one(o):
        n, s, u = o
        with tempfile.TemporaryDirectory() as tmp:
            f = Path(tmp) / Path(n).name
            f.write_bytes(urllib.request.urlopen(f'{SB}/storage/v1/object/public/{BUCKET}/{n}', timeout=120).read())
            e = make(f, 'work', Path(tmp) / 'o', 'x')
            d, stem = n.rsplit('/', 1) if '/' in n else ('', n)
            base = f'{d}/opt/{stem}' if d else f'opt/{stem}'
            for v in e['v']:
                _put(f'{base}.{v[0]}.ktx2', (Path(tmp) / 'o' / v[1]).read_bytes(), 'image/ktx2'); v[1] = f'{base}.{v[0]}.ktx2'
            for k, suf, ct in (('fb', f'.{SMALL}.webp', 'image/webp'), ('r', '.relief.ktx2', 'image/ktx2')):
                if k in e:
                    _put(base + suf, (Path(tmp) / 'o' / e[k]).read_bytes(), ct); e[k] = base + suf
        e['src'] = f'{s}:{u}'
        return n, e

    with ThreadPoolExecutor(jobs) as ex:
        for n, e in ex.map(one, todo):
            if e.get('fail'):
                fails.append(f'{n}: {e["fail"]}')
            if e['v']:
                tex[n] = {k: e[k] for k in ('w', 'h', 'v', 'fb', 'r', 'kind', 'src') if k in e}
    live = {n for n, _, _ in objs}
    tex = {n: e for n, e in tex.items() if n in live}         # (an upload that was removed leaves the manifest; its copies stay)
    _put(MANIFEST, json.dumps({'v': VERSION, 'tex': tex}, separators=(',', ':')).encode(), 'application/json', '60')
    print(f'bucket: {len(tex)} images listed, {len(fails)} copies held back by the quality check')
    for x in fails:
        print('  ', x)


if __name__ == '__main__':
    a = sys.argv[1:]
    opt = lambda k, d=None: a[a.index(k) + 1] if k in a else d
    if a[0] == 'one':
        print(json.dumps(make(a[1], a[2], a[3], Path(a[1]).stem), indent=1))
    elif a[0] == 'site':
        site(a[1], a[2], opt('--media'), opt('--cache'), int(opt('--jobs', os.cpu_count() or 2)), float(opt('--budget')) if opt('--budget') else None)
    elif a[0] == 'bucket':
        bucket('--all' in a, int(opt('--jobs', 2)))
