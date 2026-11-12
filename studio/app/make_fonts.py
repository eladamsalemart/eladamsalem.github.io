"""Keeps the app's fonts in vendor/fonts (the files and one fonts.css), from the Google Fonts address below.
Run from studio/app:  python make_fonts.py .   (only when a family is added or changed)"""
import re, sys, urllib.request, hashlib
from pathlib import Path
app = Path(sys.argv[1]); out = app / 'vendor' / 'fonts'; out.mkdir(parents=True, exist_ok=True)
href = 'https://fonts.googleapis.com/css2?family=Figtree:wght@700&family=Waiting+for+the+Sunrise&family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;1,9..144,400;1,9..144,500&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans+Hebrew:wght@600&display=swap'
UA = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36'}
get = lambda u: urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=60).read()
css = get(href).decode('utf-8')
blocks = re.findall(r'/\* ([\w-]+) \*/\s*(@font-face \{.*?\})', css, re.S)
keep, total, names = [], 0, {}
for subset, b in blocks:
    fam = re.search(r"font-family: '([^']+)'", b).group(1)
    u = re.search(r'url\((https://[^)]+\.woff2)\)', b).group(1)
    if u not in names:
        data = get(u); n = f"{fam.lower().replace(' ', '-')}-{subset}-{hashlib.md5(u.encode()).hexdigest()[:6]}.woff2"
        (out / n).write_bytes(data); names[u] = n; total += len(data)
    keep.append(re.sub(r'\s+', ' ', b.replace(u, names[u])).replace('; }', '}').replace(': ', ':').replace('; ', ';').replace(' {', '{'))
(out / 'fonts.css').write_text('\n'.join(keep) + '\n', encoding='utf-8', newline='\n')
print(len(blocks), 'blocks,', len(keep), 'kept,', len(names), 'files,', total // 1024, 'KB; css', sum(map(len, keep)))
print(sorted({s for s, _ in blocks}))
