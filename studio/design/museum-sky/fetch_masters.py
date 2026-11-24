"""Larger public-domain scans for the museum's Renaissance wing (Wikimedia Commons), so the paintings can be sharp up close.

    python studio/design/museum-sky/fetch_masters.py            (writes studio/app/data/museum/renaissance/works/<slug>-xl.jpg, 2400 px on the long side)

The wing's pictures are 1200 px (`<slug>.jpg`) and 480 px (`<slug>-s.jpg`): at 4 m on a phone that is 0.8 picture pixel for each screen pixel.
Each work's `credits.json` entry names its Commons file (`original_url`); the size asked for is a Commons thumbnail of that file. Files already
there are skipped. Licence and credit stay in credits.json (public domain: the artists died long ago, a faithful 2D reproduction)."""
import io, json, re, sys, time, urllib.request, urllib.error
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[3] / 'studio/app/data/museum/renaissance'
EDGE = 2400
UA = 'OpenStudioMuseumBuild/1.0 (asset fetch for a public-domain art museum viewer)'


def get(url, tries=4):
    for k in range(tries):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': UA}), timeout=90) as r:
                return r.read()
        except urllib.error.HTTPError as e:
            if e.code in (429, 503) and k < tries - 1:
                time.sleep(30 * (k + 1)); continue
            raise
        except Exception:
            if k == tries - 1:
                raise
            time.sleep(4)


def sized(original, width):
    """A Commons thumbnail URL of the given width for an `upload.wikimedia.org/wikipedia/commons/a/ab/File.jpg` URL."""
    u = original.split('?')[0]
    m = re.match(r'(https://upload\.wikimedia\.org/wikipedia/commons)/(\w/\w\w)/(.+)$', u)
    if not m:
        return u
    base, h, name = m.groups()
    return f'{base}/thumb/{h}/{name}/{width}px-{name}'


def main():
    credits = json.load(open(ROOT / 'credits.json', encoding='utf-8'))
    out = ROOT / 'works'
    done = bad = 0
    for c in credits:
        dst = out / f"{c['slug']}-xl.jpg"
        if dst.exists():
            continue
        url = c.get('original_url') or c.get('image_url')
        if not url:
            continue
        data = None
        for u in (sized(url, 1920),):      # (Commons serves only its standard thumbnail widths, and limits the originals)
            try:
                data = get(u); break
            except Exception as e:
                print('  retry with the original:', c['slug'], str(e)[:60])
        if not data:
            bad += 1; print('FAILED', c['slug']); continue
        im = Image.open(io.BytesIO(data)).convert('RGB')
        if max(im.size) > EDGE:
            im.thumbnail((EDGE, EDGE), Image.LANCZOS)
        im.save(dst, 'JPEG', quality=86, optimize=True, progressive=True)
        done += 1
        print(f"{c['slug']}: {im.size[0]}x{im.size[1]} {dst.stat().st_size // 1024} KB")
        time.sleep(6)
    print(f'{done} written, {bad} failed')


if __name__ == '__main__':
    main()
