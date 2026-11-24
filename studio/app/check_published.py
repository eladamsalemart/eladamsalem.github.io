"""Every file the app loads is published: a script left out of the publish copy fails the publish, not a phone.

Follows the whole module graph from the published folder's own pages and scripts: static imports, dynamic
`import('./x.js')`, `new URL('./x.js', import.meta.url)`, `<script src>` in a page, the `src = 'vendor/...'` the app
sets by hand, and what the service worker keeps. Each reference is resolved from the file that makes it, so a
module loaded only from inside another (space/outdoors.js -> ./tropics.js, missing on the live site on 24.11 while
the old check, which read only the top-level files, passed) is found.

    python3 studio/app/check_published.py <published folder, e.g. open-studio>
"""
import re
import sys
from pathlib import Path

REL = r"""(\.{1,2}/[^'"`$\s]+)"""
PATTERNS = [
    re.compile(r"""\bimport\s*\(\s*['"]""" + REL + r"""['"]\s*\)"""),            # import('./x.js')
    re.compile(r"""\bfrom\s*['"]""" + REL + r"""['"]"""),                       # import { a } from './x.js'
    re.compile(r"""\bimport\s*['"]""" + REL + r"""['"]"""),                     # import './x.js'
    re.compile(r"""new\s+URL\(\s*['"]""" + REL + r"""\.m?js['"]\s*,\s*import\.meta\.url"""),
]
APP_SRC = re.compile(r"""src\s*=\s*['"]((?:vendor|space|icons)/[^'"]+)['"]|s\.src = '([^']+)'""")      # set by hand in the app
HTML_SRC = re.compile(r"""<script[^>]*\bsrc=["']([^"':]+)["']""")


def check(out: Path):
    missing, seen = [], set()
    todo = [p for p in out.iterdir() if p.suffix in ('.js', '.mjs', '.html')]
    while todo:
        f = todo.pop()
        if f in seen or not f.exists():
            continue
        seen.add(f)
        text = f.read_text(encoding='utf-8', errors='replace')
        refs = []
        if f.suffix == '.html':
            refs += [(r, out) for r in HTML_SRC.findall(text)]
        else:
            for p in PATTERNS:
                for r in p.findall(text):
                    refs.append((r if r.endswith(('.js', '.mjs')) or not p.pattern.startswith('new') else r + '.js', f.parent))
        if f.parent == out:                                  # (the app's own top-level files set some sources from the app's root)
            refs += [(next(x for x in m if x), out) for m in APP_SRC.findall(text)]
        for ref, base in refs:
            ref = ref.split('?')[0].split('#')[0]
            target = (base / ref).resolve()
            try:
                target.relative_to(out.resolve())
            except ValueError:
                continue                                     # (outside the app: the site's own files)
            if not target.exists():
                missing.append(f'{f.relative_to(out).as_posix()} loads {ref}')
            elif target.suffix in ('.js', '.mjs'):
                todo.append(target)
    sw = out / 'sw.js'
    if sw.exists():
        for ref in re.findall(r"'([\w./-]+\.js)'", sw.read_text(encoding='utf-8')):
            if not (out / ref).exists():
                missing.append(f'sw.js keeps {ref}')
    return sorted(set(missing)), len(seen)


if __name__ == '__main__':
    out = Path(sys.argv[1] if len(sys.argv) > 1 else 'open-studio').resolve()
    missing, n = check(out)
    print('\n'.join(missing) or f'every file the app loads is here ({n} pages and modules followed)')
    sys.exit(1 if missing else 0)
